import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";

import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";

import RNPickerSelect from "react-native-picker-select";



// Assuming these functions are correctly implemented and accessible from these paths
import { GetPairedSensorName, openDatabaseConnection, clearDatabase } from "./functions";
import { showToastAsync } from "./dbUtils";

export default function SettingsScreen() {
  const [isPressed, setIsPressed] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  // --- NEW ---
  const [locations, setLocations] = useState([]); // To store parsed CSV data
  const [selectedLocation, setSelectedLocation] = useState(null); // To store the selected location ID
  // --- END NEW ---
  const [sensorPaired, setSensorPaired] = useState(false);
  const [dummyState, setDummyState] = useState(0); // Used for force update in clearDatabase, as per original code
  const [counter, setCounter] = useState(0); // Used for force update in clearDatabase, as per original code

  const navigation = useNavigation();


  /*
   * Loads and parses the locations.json file from the S3 bucket.
   */
  const loadLocations = async () => {
    // --- THIS IS THE CORRECTED URL ---
    const locationsUrl = "https://uhi-locations.s3.us-west-2.amazonaws.com/locations.json";

    try {
      console.log("Attempting to fetch locations from:", locationsUrl);
      
      const response = await fetch(locationsUrl);
      
      if (!response.ok) {
        console.error(`Fetch failed with status: ${response.status}`);
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const parsedLocations = await response.json();
      
      // Here is the log you requested
      console.log("✅ Locations data received from S3:", parsedLocations); 
      
      setLocations(parsedLocations);
      console.log("✅ Locations state updated successfully.");
      
    } catch (error) {
      console.error("❌ Error in loadLocations function:", error);
      showToastAsync("Error loading locations list.", 2000);
    }
  };
  /**
   * Loads saved settings (campaignName, campaignSensorNumber, and selectedLocationId)
   * from SecureStore when the component mounts.
   */
// --- MODIFIED: loadSettings ---
  const loadSettings = async () => {
    try {
      // ... (SecureStore checks) ...

      // Retrieve items from SecureStore
      const storedCampaignName = await SecureStore.getItemAsync("campaignName");
      const storedCampaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");
      const storedLocationId = await SecureStore.getItemAsync("selectedLocationId"); // --- NEW ---

      // ... (setCampaignName, setCampaignSensorNumber) ...

      if (storedLocationId) { 
        // --- REMOVED parseInt ---
        setSelectedLocation(storedLocationId); // Now it's a string
      }
    } catch (error) {
      console.error("Error loading settings from SecureStore:", error);
      // Optionally, show a toast to the user about loading failure
      showToastAsync("Error loading saved settings.", 2000);
    }
  };

  // Effect hook to load settings AND locations when the component mounts
  // --- MODIFIED ---
  useEffect(() => {
    loadSettings();
    loadLocations(); // --- NEW ---
  }, []);

  /**
   * Attempts to write a key-value pair to SecureStore with retry logic.
   * (This function is unchanged but remains essential)
   */
  const writeWithRetry = async (key, value, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await SecureStore.setItemAsync(key, value);
        const verify = await SecureStore.getItemAsync(key);
        if (verify === value) {
          console.log(`✅ ${key} saved successfully on attempt ${attempt}`);
          return true;
        }
        console.warn(`⏳ Retry ${attempt} failed for ${key}. Verification mismatch.`);
      } catch (error) {
        console.warn(`⏳ Retry ${attempt} failed for ${key}. Error: ${error.message}`);
      }
      await new Promise((res) => setTimeout(res, 300)); // Short delay before retrying
    }
    console.error(`❌ Failed to save ${key} after ${retries} attempts.`);
    return false;
  };

  /**
   * Saves all campaign settings to SecureStore and attempts to clear the database.
   * Provides user feedback via toast messages based on success/failure.
   */
  // --- MODIFIED ---
  const saveSettings = async () => {
    try {
      Keyboard.dismiss(); // Dismiss the keyboard when save is initiated

      // Input validation
      // --- MODIFIED ---
      if (!selectedLocation || !campaignName || !campaignSensorNumber) {
        showToastAsync("Missing Info \n Select location, campaign name, and sensor number.", 2000);
        return;
      }

      if (campaignName.includes("_")) {
        showToastAsync("❌ Campaign name cannot contain underscores (_)", 3000);
        return;
      }

      const paddedSensor = campaignSensorNumber.padStart(3, "0");

      // Check SecureStore availability before proceeding
      if (!(await SecureStore.isAvailableAsync())) {
        showToastAsync("Error: SecureStore is not available on this device. Cannot save settings.", 3000);
        return;
      }

      // Attempt to save settings to SecureStore with retry logic
      const savedCampaignName = await writeWithRetry("campaignName", campaignName);
      const savedCampaignSensorNumber = await writeWithRetry("campaignSensorNumber", paddedSensor);
      // --- NEW ---
      const savedLocation = await writeWithRetry("selectedLocationId", String(selectedLocation)); // Save ID as string

      // If SecureStore save failed for ANY item, show error toast and exit
      // --- MODIFIED ---
      if (!savedCampaignName || !savedCampaignSensorNumber || !savedLocation) {
        showToastAsync("❌ Failed to save all settings to SecureStore.", 3000);
        return; // Important: Stop execution if SecureStore save failed
      }

      // --- SecureStore settings successfully saved. Now handle database clearing ---
      try {
          // Ensure the database connection is open and tables are created/verified
          const db = await openDatabaseConnection();
          console.log("✅ Database connection opened successfully for clearing.");  
          // Attempt to clear the database
          await clearDatabase(setDummyState, setCounter);
              
          console.log("Database cleared successfully after settings save.");
          // Inform user of full success (settings saved AND data cleared)
          showToastAsync("✅ Settings saved and old data cleared!", 2000);
      } catch (dbError) {
          // This block catches errors specifically from database operations
          console.error("❌ Error during database operation after settings save:", dbError);
          // Inform the user that settings were saved, but database clearing failed
          showToastAsync("✅ Settings saved, but failed to clear old data.", 4000);
      }

      // Always navigate back after the entire process (settings save and database clear attempt)
      // has completed, as appropriate toasts have already informed the user of the outcome.
      navigation.goBack();

    } catch (error) {
      // This catch block handles any unexpected errors that might occur during the overall save process,
      // e.g., issues with input processing or `showToastAsync` itself.
      console.error("❌ An unexpected error occurred during settings save:", error);
      showToastAsync("An unexpected error occurred while saving settings.", 3000);
    }
  };

  /**
   * Handles the pairing of a new temperature sensor.
   * (This function is unchanged)
   */
  const pairNewSensor = async () => {
    try {
      const success = await GetPairedSensorName(); // Assuming this function handles the actual pairing
      if (success) {
        setSensorPaired(true);
        showToastAsync("New sensor paired successfully!", 3000);
      } else {
        setSensorPaired(false);
        showToastAsync("Failed to pair with a new sensor.", 2000);
      }
    } catch (error) {
      console.error("❌ Error pairing new sensor:", error);
      setSensorPaired(false); // Reset status on error
      showToastAsync("An unexpected error occurred during sensor pairing.", 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      // Adjust behavior based on platform for keyboard avoidance
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Sensor Paired Status Display */}
      {sensorPaired && (
        <View style={styles.sensorStatus}>
          <Text style={styles.sensorStatusText}>✅ Sensor Paired!</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Pair New Sensor Button */}
          <TouchableOpacity
            style={[styles.saveButton, { marginBottom: 45 }, isPressed && styles.saveButtonPressed]}
            onPressIn={() => setIsPressed(true)} // Visual feedback on press
            onPressOut={() => setIsPressed(false)} // Visual feedback on release
            onPress={pairNewSensor} // Action to pair sensor
          >
            <Text style={[styles.saveButtonText, isPressed && styles.saveButtonTextPressed]}>
              Pair New Temperature Sensor
            </Text>
          </TouchableOpacity>

          {/* --- NEW: Select Location Dropdown --- */}
          <Text style={styles.label}>Select Campaign Location:</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => setSelectedLocation(value)}
              items={locations}
              style={pickerSelectStyles} // Use dedicated styles
              value={selectedLocation}
              placeholder={{ label: "Select a location...", value: null }}
              useNativeAndroidPickerStyle={false} // Allows custom styling on Android
            />
          </View>
          {/* --- END NEW --- */}


          {/* Campaign Name Input */}
          <Text style={styles.label}>Set New Campaign Name:</Text>
          <TextInput
            style={styles.input}
            value={campaignName}
            onChangeText={setCampaignName}
            placeholder="Campaign Name"
            returnKeyType="done"
            autoCapitalize="words" // Capitalize first letter of each word
          />

          {/* Sensor Number Input */}
          <Text style={styles.label}>Set New Integer Sensor Number:</Text>
          <TextInput
            style={styles.input}
            value={campaignSensorNumber}
            onChangeText={(text) =>
              // Allow only numeric input and limit to 3 characters
              setCampaignSensorNumber(text.replace(/[^0-9]/g, "").slice(0, 3))
            }
            placeholder="Your Campaign Member Number"
            keyboardType="numeric" // Numeric keyboard
            maxLength={3} // Ensure maximum 3 digits
          />

          {/* Save Settings Button */}
          <TouchableOpacity
            style={[styles.saveButton, isPressed && styles.saveButtonPressed]}
            onPressIn={() => setIsPressed(true)} // Visual feedback on press
            onPressOut={() => setIsPressed(false)} // Visual feedback on release
            onPress={saveSettings} // Action to save settings
          >
            <Text style={[styles.saveButtonText, isPressed && styles.saveButtonTextPressed]}>
              Save
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1, // Allows content to grow within the scroll view
    justifyContent: "center", // Center content vertically
    alignItems: "center", // Center content horizontally
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600", // Make labels slightly bolder
    color: "#333", // Darker color for better contrast
  },
  input: {
    width: "90%",
    maxWidth: 300, // Limit max width for larger screens
    padding: 12,
    borderWidth: 1,
    borderColor: "#a0a0a0", // Slightly darker border
    borderRadius: 8, // More rounded corners
    marginBottom: 25, // More space below inputs
    fontSize: 16,
    color: "#444",
    backgroundColor: "#f9f9f9", // Light background for input
  },
  // ---  Style for the picker container ---
  pickerContainer: {
  width: "90%",
  maxWidth: 300,
  borderWidth: 1,
  borderColor: "#a0a0a0",
  borderRadius: 8,
  marginBottom: 25,
  backgroundColor: "#f9f9f9",
  justifyContent: 'center', // Add this back
},
  saveButton: {
    backgroundColor: "#007AFF", // iOS blue
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#000", // Add shadow for depth
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6, // Android elevation
  },
  saveButtonPressed: {
    backgroundColor: "#FFFFFF", // White background when pressed
    borderWidth: 2, // Thicker border
    borderColor: "#007AFF", // Blue border when pressed
    shadowOpacity: 0.1, // Reduced shadow when pressed
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    color: "yellow", // Yellow text for default state
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButtonTextPressed: {
    color: "#007AFF", // Blue text when pressed
  },
  sensorStatus: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "#e0ffe0", // Light green background
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 10, // Ensure it's on top
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sensorStatusText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "green",
  },
});

// --- NEW: Dedicated styles for react-native-picker-select ---
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12, // ADD THIS BACK
    paddingHorizontal: 10, // ADD THIS BACK
    color: '#444',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingVertical: 12, // ADD THIS BACK
    paddingHorizontal: 10, // ADD THIS BACK
    color: '#444',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  placeholder: {
    color: '#9a9a9a', // Placeholder text color
  },
  iconContainer: { // Style for the dropdown arrow
    top: 12, 
    right: 15, // Change back to 15
  },
});