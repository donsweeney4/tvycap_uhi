import { getPresignedS3Url } from './s3_util'; 
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite'; // Needed for the type, but openDatabaseConnection should handle actual DB operations
import { Alert, Platform } from 'react-native';

import { openDatabaseConnection, displayErrorToast, showToastAsync } from './dbUtils';
import { bleState } from "./utils/bleState";
import { inSimulation } from "./utils/ble";
import * as SecureStore from 'expo-secure-store';

// The local declaration of openDatabaseConnection has been removed.
// It is now expected to be imported from './functions'.

// Guarded upload: skips when Simulation Mode is ON
export const uploadDataIfAllowed = async (dbPath, jobcodeRef, deviceNameRef, bucketName) => {
  if (await inSimulation()) {
    await showToastAsync("Simulation Mode: upload disabled (no data sent).", 2500);
    return;
  }
  return uploadDatabaseToS3(dbPath, jobcodeRef, deviceNameRef, bucketName);
};


export const uploadDatabaseToS3 = async (dbFilePath, jobcodeRef, deviceNameRef, bucketName) => {
  try {

    const bucketName = await SecureStore.getItemAsync("selectedLocationId");

    if (!bucketName) {
        console.error("❌ Location ID (bucket name) not found in SecureStore. Cannot upload.");
        await displayErrorToast("❌ Location not set. Go to Settings to select a location.", 8000);
        return; // Stop the upload
    }
    console.log(`[Upload] Using data bucket: ${bucketName}`);
    console.log(`Uploading .csv file to AWS. Current data Sampling is ${bleState.isSamplingRef.current}`);

    if (bleState.isSamplingRef.current) {
      
      // Use showToastAsync as this is a specific, non-critical user-action required message
      await showToastAsync("Sampling in Progress. Stop sampling before uploading.", 2000);
      return;
    }

    const fileExists = await FileSystem.getInfoAsync(dbFilePath);
    if (!fileExists.exists) {
      console.warn("⚠️ Database file does not exist. Cannot upload.");
      await displayErrorToast("⚠️ Database file not found. No data to upload.", 5000);
      return;
    }

    // --- CRITICAL CHANGE START: DATABASE CONNECTION ---
    // Ensure the bleState managed database connection is open and retrieve the instance.
    let db;
    try {
        // Use the imported openDatabaseConnection from './functions'
        db = await openDatabaseConnection(); 
    } catch (dbError) {
        console.error("❌ Failed to get database connection for upload:", dbError);
        await showToastAsync("Error", "Failed to access database for upload. Try restarting the app.");
        bleState.dbRef.current = null; // Invalidate the ref if there was an issue
        return;
    }

    // Ensure db is valid after attempting to open/get it
    if (!db) {
        console.error("❌ Database connection is unexpectedly null after open attempt.");
        await showToastAsync("Error", "Database connection is unavailable. Cannot upload.");
        return;
    }
   

    const checkColumnExists = async (database, columnName) => {
      const result = await database.getAllAsync(`PRAGMA table_info(appData);`);
      return result.some(row => row.name === columnName);
    };

    // Pass the actual db instance to checkColumnExists
    if (!(await checkColumnExists(db, "jobcode"))) {
      await db.execAsync(`ALTER TABLE appData ADD COLUMN jobcode TEXT;`);
      console.log("✅ Added 'jobcode' column.");
    }
    await db.runAsync(`UPDATE appData SET jobcode = ?`, [jobcodeRef.current]);

    if (!(await checkColumnExists(db, "rownumber"))) {
      await db.execAsync(`ALTER TABLE appData ADD COLUMN rownumber INTEGER;`);
      console.log("✅ Added 'rownumber' column.");
    }
    await db.runAsync(
      `UPDATE appData
       SET rownumber = rowid - (SELECT MIN(rowid) FROM appData) + 1;`
    );

    const appData = await db.getAllAsync("SELECT * FROM appData;");
    if (appData.length === 0) {
      await showToastAsync("No Data", "There is no data in the database to upload.");
      return;
    }

    const jobcode = jobcodeRef.current;
    console.log("The jobcode written into each row of the db is:", jobcode);

    const csvHeader = "rownumber,jobcode,Timestamp,Local Date,Local Time,Temperature (°C),Humidity (%),Latitude,Longitude,Altitude (m),Accuracy (m),Speed (MPH)\n";
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
        // Ensure toLocaleDateString and toLocaleTimeString handle potentially invalid dates
        const localDate = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString();
        const localTime = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString([], {
          hourCycle: 'h23',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        // Convert temperature, humidity, latitude, longitude, altitude, accuracy, and speed to safe formats
        const safeTemp = ((temperature ?? 0) * 1e-2).toFixed(2);
        const safeHumidity = (humidity ?? 0).toFixed(1);
        const safeLat = ((latitude ?? 0) * 1e-7).toFixed(6);
        const safeLon = ((longitude ?? 0) * 1e-7).toFixed(6);
        const safeAlt = ((altitude ?? 0) * 1e-2).toFixed(2);
        const safeAcc = ((accuracy ?? 0) * 1e-2).toFixed(2);
        const safeSpeed = (((speed ?? 0) * 1e-2) * 2.23694).toFixed(2); // Convert m/s * 100 to MPH

        return `${rownumber ?? ""},${jobcode ?? ""},${timestamp ?? ""},${localDate},${localTime},${safeTemp},${safeHumidity},${safeLat},${safeLon},${safeAlt},${safeAcc},${safeSpeed}`;
      })
      .join("\n");

    const csvContent = csvHeader + csvBody;
    const shareablePath = FileSystem.cacheDirectory + `${jobcode}.csv`;
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

   const { uploadUrl, publicUrl } = await getPresignedS3Url(uploadFilename, bucketName);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/csv',
      },
      body: fileContent,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    console.log("✅ Upload of .csv data to AWS successful:", uploadFilename);
    console.log("🌐 Public URL:", publicUrl);

    // --- Confirmation log before toast ---
    console.log("Attempting to show success toast for S3 upload.");
    await showToastAsync("File uploaded to cloud storage", 5000);
    // --- End confirmation log ---

    try {
      await FileSystem.deleteAsync(shareablePath, { idempotent: true });
      console.log("✅ Local CSV file deleted successfully.");
    } catch (deleteError) {
      console.error("❌ Error deleting local CSV file:", deleteError);
      // It's okay to continue here, as the upload was successful
    }

    // The database connection (bleState.dbRef.current) should be managed at a higher level
    // (e.g., app lifecycle or explicit disconnects in stopSampling).
    // Do NOT close the database here.
    // Removed: await db.closeAsync();

  } catch (error) {
    console.error("❌ Error uploading .csv file to S3:", error);
    await displayErrorToast("❌ Failed to upload data: " + error.message, 8000);    
  }
}
