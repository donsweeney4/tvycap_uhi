import { getPresignedS3Url } from './s3_util';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Alert, Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

import { showToastAsync } from './functionsHelper';
import { displayErrorToast, openDatabaseConnection } from './functions';
import { bleState } from "./utils/bleState";
import { inSimulation } from "./utils/ble";

// ---------------------------------------------------------
// 🔹 Shared Helper: Generate CSV string from database
// ---------------------------------------------------------
const generateCsvFromDatabase = async (db, jobcode) => {
  const appData = await db.getAllAsync("SELECT * FROM appData;");
  if (appData.length === 0) {
    return null; // caller should handle empty DB
  }

  const csvHeader =
    "rownumber,jobcode,Timestamp,Local Date,Local Time,Temperature (°C),Humidity (%),Latitude,Longitude,Altitude (m),Accuracy (m),Speed (MPH)\n";

  const csvBody = appData
    .map((row) => {
      const {
        rownumber,
        jobcode,
        timestamp,
        temperature,
        humidity,
        latitude,
        longitude,
        altitude,
        accuracy,
        speed
      } = row;

      const dateObj = new Date(timestamp ?? 0);
      const localDate = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString();
      const localTime = isNaN(dateObj.getTime())
        ? ''
        : dateObj.toLocaleTimeString([], {
            hourCycle: 'h23',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

      const safeTemp = ((temperature ?? 0) * 1e-2).toFixed(2);
      const safeHumidity = (humidity ?? 0).toFixed(1);
      const safeLat = ((latitude ?? 0) * 1e-7).toFixed(6);
      const safeLon = ((longitude ?? 0) * 1e-7).toFixed(6);
      const safeAlt = ((altitude ?? 0) * 1e-2).toFixed(2);
      const safeAcc = ((accuracy ?? 0) * 1e-2).toFixed(2);
      const safeSpeed = (((speed ?? 0) * 1e-2) * 2.23694).toFixed(2);

      return `${rownumber ?? ""},${jobcode ?? ""},${timestamp ?? ""},${localDate},${localTime},${safeTemp},${safeHumidity},${safeLat},${safeLon},${safeAlt},${safeAcc},${safeSpeed}`;
    })
    .join("\n");

  return csvHeader + csvBody;
};

// ---------------------------------------------------------
// Guarded Upload
// ---------------------------------------------------------
export const uploadDataIfAllowed = async (dbPath, jobcodeRef, deviceNameRef) => {
  if (await inSimulation()) {
    await showToastAsync("Simulation Mode: upload disabled (no data sent).", 2500);
    return;
  }
  return uploadDatabaseToS3(dbPath, jobcodeRef, deviceNameRef);
};

// ---------------------------------------------------------
// Upload Database to S3
// ---------------------------------------------------------
export const uploadDatabaseToS3 = async (dbFilePath, jobcodeRef, deviceNameRef) => {
  try {
    console.log(`Uploading .csv file to AWS. Current data Sampling is ${bleState.isSamplingRef.current}`);

    if (bleState.isSamplingRef.current) {
      await showToastAsync("Sampling in Progress. Stop sampling before uploading.", 2000);
      return;
    }

    const fileExists = await FileSystem.getInfoAsync(dbFilePath);
    if (!fileExists.exists) {
      console.warn("⚠️ Database file does not exist. Cannot upload.");
      await displayErrorToast("⚠️ Database file not found. No data to upload.", 5000);
      return;
    }

    let db;
    try {
      db = await openDatabaseConnection();
    } catch (dbError) {
      console.error("❌ Failed to get database connection for upload:", dbError);
      await showToastAsync("Error", "Failed to access database for upload. Try restarting the app.");
      bleState.dbRef.current = null;
      return;
    }

    if (!db) {
      console.error("❌ Database connection is unexpectedly null after open attempt.");
      await showToastAsync("Error", "Database connection is unavailable. Cannot upload.");
      return;
    }

    // Ensure jobcode and rownumber columns exist
    const checkColumnExists = async (database, columnName) => {
      const result = await database.getAllAsync(`PRAGMA table_info(appData);`);
      return result.some(row => row.name === columnName);
    };

    if (!(await checkColumnExists(db, "jobcode"))) {
      await db.execAsync(`ALTER TABLE appData ADD COLUMN jobcode TEXT;`);
    }
    await db.runAsync(`UPDATE appData SET jobcode = ?`, [jobcodeRef.current]);

    if (!(await checkColumnExists(db, "rownumber"))) {
      await db.execAsync(`ALTER TABLE appData ADD COLUMN rownumber INTEGER;`);
    }
    await db.runAsync(
      `UPDATE appData
       SET rownumber = rowid - (SELECT MIN(rowid) FROM appData) + 1;`
    );

    const csvContent = await generateCsvFromDatabase(db, jobcodeRef.current);
    if (!csvContent) {
      await showToastAsync("No Data", "There is no data in the database to upload.");
      return;
    }

    const shareablePath = FileSystem.cacheDirectory + `${jobcodeRef.current}.csv`;
    await FileSystem.writeAsStringAsync(shareablePath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

    const fileContent = await FileSystem.readAsStringAsync(shareablePath, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const filename = deviceNameRef.current;
    if (!filename) {
      console.error("❌ Device name not available for upload filename.");
      await showToastAsync("Error", "Device name missing. Cannot upload.");
      return;
    }

    const uploadFilename = `${filename}.csv`;
    console.log(`Requesting presigned URL to upload file ${uploadFilename} to S3`);

    const { uploadUrl, publicUrl } = await getPresignedS3Url(uploadFilename);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/csv' },
      body: fileContent,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    console.log("✅ Upload of .csv data to AWS successful:", uploadFilename);
    console.log("🌐 Public URL:", publicUrl);
    await showToastAsync("File uploaded to cloud storage", 5000);

    try {
      await FileSystem.deleteAsync(shareablePath, { idempotent: true });
      console.log("✅ Local CSV file deleted successfully.");
    } catch (deleteError) {
      console.error("❌ Error deleting local CSV file:", deleteError);
    }

  } catch (error) {
    console.error("❌ Error uploading .csv file to S3:", error);
    await displayErrorToast("❌ Failed to upload data: " + error.message, 8000);
  }
};

// ---------------------------------------------------------
// Export Database (share or email)
// ---------------------------------------------------------
export const exportDatabase = async (dbFilePath, jobcodeRef, deviceNameRef, emailAddress = null) => {
  try {
    console.log("📤 Exporting database as .csv for sharing...");

    const fileExists = await FileSystem.getInfoAsync(dbFilePath);
    if (!fileExists.exists) {
      await displayErrorToast("⚠️ Database file not found. No data to export.", 5000);
      return;
    }

    let db;
    try {
      db = await openDatabaseConnection();
    } catch (err) {
      console.error("❌ Failed to open database for export:", err);
      await showToastAsync("Error", "Could not open database for export.");
      return;
    }

    const csvContent = await generateCsvFromDatabase(db, jobcodeRef.current);
    if (!csvContent) {
      await showToastAsync("No Data", "There is no data in the database to export.");
      return;
    }

    const exportPath = FileSystem.cacheDirectory + `${jobcodeRef.current}.csv`;
    await FileSystem.writeAsStringAsync(exportPath, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

    if (emailAddress) {
      console.log(`📧 Sending CSV directly to email: ${emailAddress}`);
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [emailAddress],
          subject: `Exported Data - ${jobcodeRef.current}`,
          body: "Attached is the exported dataset.",
          attachments: [exportPath],
        });
        await showToastAsync("Data exported via email", 4000);
      } else {
        await displayErrorToast("❌ Mail service not available on this device.", 4000);
      }
    } else {
      console.log("📱 Opening native share dialog...");
      await Sharing.shareAsync(exportPath, {
        mimeType: "text/csv",
        dialogTitle: "Export Data",
      });
      await showToastAsync("Data export complete", 4000);
    }

  } catch (error) {
    console.error("❌ Error exporting database:", error);
    await displayErrorToast("❌ Failed to export data: " + error.message, 8000);
  }
};
