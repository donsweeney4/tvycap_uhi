import { Dimensions } from "react-native";
import Toast from "react-native-toast-message"; // For showToastAsync
import * as SQLite from "expo-sqlite"; // For openDatabaseConnection
import { bleState } from "./utils/bleState"; // For displayErrorToast & openDatabaseConnection

// ---
// Function 1:   showToastAsync
// ---
const screenHeight = Dimensions.get("window").height; // Get screen height

/**
 * Displays a custom toast message.
 */
export const showToastAsync = (message, duration = 3000) => {
  return new Promise((resolve) => {
    Toast.show({
      type: "customToast", // Use your custom type defined in toastConfig
      text1: message,
      // text2: 'This is some secondary text', // Optional: Add a second line of text

      // Position and offset
      position: "top", // 'top' or 'bottom'
      topOffset: screenHeight * 0.15, // 15% from the top

      // Duration of the toast
      visibilityTime: duration,

      // Props passed directly to the custom toast component
      props: {
        containerStyle: {
          backgroundColor: "blue", // Set toast background color
          borderRadius: 10, // Optional: Round corners
          padding: 10,
          // Shadow properties for iOS
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          // Elevation for Android
          elevation: 5,
          opacity: 1, // Ensures visibility
        },
        textStyle: {
          color: "yellow",
          fontSize: 20,
        },
      },

      // Callback when the toast is hidden
      onHide: () => {
        resolve(); // Resolve the promise when the toast is hidden
      },
    });
  });
};

// ---
// Function 2: displayErrorToast
// ---
const THROTTLE_ERROR_TOAST_INTERVAL_MS = 5000;

/**
 * Throttles error toasts to avoid spamming the user.
 */
export const displayErrorToast = async (message, duration = 3000) => {
  const now = Date.now();
  if (!bleState.lastErrorToastTimestampRef) {
      bleState.lastErrorToastTimestampRef = { current: 0 };
  }

  // Calls showToastAsync from this same file
  if (now - bleState.lastErrorToastTimestampRef.current > THROTTLE_ERROR_TOAST_INTERVAL_MS) {
    await showToastAsync(message, duration); 
    bleState.lastErrorToastTimestampRef.current = now;
  } else {
    console.log("🚫 Toast throttled: too soon to show another error toast.");
  }
};


// ---
// Function 3: openDatabaseConnection
// ---

/**
 * Opens and initializes the SQLite database connection.
 * Caches the connection in bleState.dbRef.current.
 */
export const openDatabaseConnection = async () => { 
  if (bleState.dbRef.current) {
    console.log("Database already open, returning existing instance.");
    return bleState.dbRef.current;
  }
  try {
    const database = await SQLite.openDatabaseAsync('appData.db');
    // Perform any necessary table creation/migrations here
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS appData (
        timestamp INTEGER PRIMARY KEY NOT NULL,
        temperature INTEGER NOT NULL,
        humidity INTEGER,
        latitude INTEGER NOT NULL,
        longitude INTEGER NOT NULL,
        altitude INTEGER,
        accuracy INTEGER,
        speed INTEGER
      );
    `);
    console.log("✅ Database opened and tables ensured.");
    bleState.dbRef.current = database; // Store the open database instance
    return database;
  } catch (error) {
    console.error("❌ Error opening database:", error);
    // Calls displayErrorToast from this same file
    await displayErrorToast("❌ Critical error: Could not open database! Restart app.", 10000); 
    throw error; // Re-throw to propagate the error
  }
};