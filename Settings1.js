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
// Assuming these functions are correctly implemented and accessible from these paths
import { GetPairedSensorName, openDatabaseConnection, clearDatabase } from "./functions";
import { showToastAsync } from "./functionsHelper";

export default function SettingsScreen() {
  const [isPressed, setIsPressed] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  const [sensorPaired, setSensorPaired] = useState(false);
  const [dummyState, setDummyState] = useState(0); // Used for force update in clearDatabase, as per original code
  const [counter, setCounter] = useState(0); // Used for force update in clearDatabase, as per original code
  const [userEmail, setUserEmail] = useState("");   // ✅ new email field


  const navigation = useNavigation();

  /**
   * Loads saved settings (campaignName and campaignSensorNumber) from SecureStore
   * when the component mounts.
   */
  useEffect(() => {
      const loadSettings = async () => {
        try {
          const storedCampaignName = await SecureStore.getItemAsync("campaignName");
          const storedCampaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");
          const storedPairedSensorName = await SecureStore.getItemAsync("pairedSensorName");
          const storedEmail = await SecureStore.getItemAsync("userEmail");   // ✅ load email
  
          if (storedCampaignName) setCampaignName(storedCampaignName);
          if (storedCampaignSensorNumber) setCampaignSensorNumber(storedCampaignSensorNumber);
          if (storedPairedSensorName) setPairedSensorName(storedPairedSensorName);
          if (storedEmail) setUserEmail(storedEmail);   // ✅ load into state
        } catch (error) {
          console.error("❌ Error loading settings:", error);
        }
      };
  
      loadSettings();
    }, []);

  /**
   * Attempts to write a key-value pair to SecureStore with retry logic.
   * @param {string} key - The key to store.
   * @param {string} value - The value to store.
   * @param {number} retries - Number of retry attempts.
   * @returns {Promise<boolean>} True if saved successfully, false otherwise.
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
   * Saves the campaign settings to SecureStore and attempts to clear the database.
   * Provides user feedback via toast messages based on success/failure.
   */
  const saveSettings = async () => {
    try {
      Keyboard.dismiss(); // Dismiss the keyboard when save is initiated

      // Input validation
      if (!campaignName || !campaignSensorNumber) {
        showToastAsync("Missing Info \n Enter both campaign name and campaign sensor number.", 2000);
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



       if (userEmail?.trim()) {
        await SecureStore.setItemAsync("userEmail", userEmail.trim());
      } else {
        await SecureStore.deleteItemAsync("userEmail");  // ✅ remove if empty
      }



      // If SecureStore save failed for either item, show error toast and exit
      if (!savedCampaignName || !savedCampaignSensorNumber) {
        showToastAsync("❌ Failed to save settings to SecureStore.", 3000);
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
   * Uses `GetPairedSensorName` and provides toast feedback.
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
              // Allow onl y numeric input and limit to 3 characters
              setCampaignSensorNumber(text.replace(/[^0-9]/g, "").slice(0, 3))
            }
            placeholder="Your Campaign Member Number"
            keyboardType="numeric" // Numeric keyboard
            maxLength={3} // Ensure maximum 3 digits
          />

          

        {/* Optional email address */}
          <Text style={styles.label}>Set Optional CampaignEmail Address:</Text>
          <TextInput
            style={styles.input}
            value={userEmail}
            onChangeText={setUserEmail}
            placeholder="Campaign Email Address"
            keyboardType="email-address" // Email keyboard
          />
          <Text style={styles.label2}>Leave email blank to use share sheet instead </Text>



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
  label2: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "400", // Make labels slightly bolder
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