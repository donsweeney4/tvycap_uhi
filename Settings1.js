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
 
import { Dropdown } from "react-native-element-dropdown";
 

// Assuming these functions are correctly implemented and accessible from these paths
import { GetPairedSensorName, clearDatabase } from "./functions"; // Removed openDatabaseConnection
import { showToastAsync, openDatabaseConnection } from "./dbUtils"; // Added openDatabaseConnection

export default function SettingsScreen() {
  const [isPressed, setIsPressed] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  const [locations, setLocations] = useState([]); 
  const [selectedLocation, setSelectedLocation] = useState(null); 
  const [sensorPaired, setSensorPaired] = useState(false);
  const [dummyState, setDummyState] = useState(0); 
  const [counter, setCounter] = useState(0); 

  const navigation = useNavigation();

  /*
   * Loads and parses the locations.json file from the S3 bucket.
   */
  const loadLocations = async () => {
    const locationsUrl = "https://uhi-locations.s3.us-west-2.amazonaws.com/locations.json";

    try {
      console.log("Attempting to fetch locations from:", locationsUrl);
      const response = await fetch(locationsUrl);
      
      if (!response.ok) {
        console.error(`Fetch failed with status: ${response.status}`);
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      
      const parsedLocations = await response.json();
      console.log("✅ Locations data received from S3:", parsedLocations); 
      setLocations(parsedLocations);
      console.log("✅ Locations state updated successfully.");
      
    } catch (error) {
      console.error("❌ Error in loadLocations function:", error);
      showToastAsync("Error loading locations list.", 2000);
    }
  };

  /**
   * Loads saved settings from SecureStore.
   */
  const loadSettings = async () => {
    try {
      const storedCampaignName = await SecureStore.getItemAsync("campaignName");
      const storedCampaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");
      const storedLocationId = await SecureStore.getItemAsync("selectedLocationId");

      if (storedCampaignName) setCampaignName(storedCampaignName);
      if (storedCampaignSensorNumber) setCampaignSensorNumber(storedCampaignSensorNumber);
      if (storedLocationId) { 
        setSelectedLocation(storedLocationId); // It's a string
      }
    } catch (error) {
      console.error("Error loading settings from SecureStore:", error);
      showToastAsync("Error loading saved settings.", 2000);
    }
  };

  // Effect hook to load settings AND locations
  useEffect(() => {
    loadSettings();
    loadLocations();
  }, []);

  /**
   * Attempts to write a key-value pair to SecureStore with retry logic.
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
      await new Promise((res) => setTimeout(res, 300)); 
    }
    console.error(`❌ Failed to save ${key} after ${retries} attempts.`);
    return false;
  };

  /**
   * Saves all campaign settings to SecureStore.
   */
  const saveSettings = async () => {
    try {
      Keyboard.dismiss(); 

      if (!selectedLocation || !campaignName || !campaignSensorNumber) {
        showToastAsync("Missing Info \n Select location, campaign name, and sensor number.", 2000);
        return;
      }

      if (campaignName.includes("_")) {
        showToastAsync("❌ Campaign name cannot contain underscores (_)", 3000);
        return;
      }

      const paddedSensor = campaignSensorNumber.padStart(3, "0");

      if (!(await SecureStore.isAvailableAsync())) {
        showToastAsync("Error: SecureStore is not available on this device. Cannot save settings.", 3000);
        return;
      }

      const savedCampaignName = await writeWithRetry("campaignName", campaignName);
      const savedCampaignSensorNumber = await writeWithRetry("campaignSensorNumber", paddedSensor);
      const savedLocation = await writeWithRetry("selectedLocationId", String(selectedLocation)); 

      if (!savedCampaignName || !savedCampaignSensorNumber || !savedLocation) {
        showToastAsync("❌ Failed to save all settings to SecureStore.", 3000);
        return; 
      }

      try {
          const db = await openDatabaseConnection();
          console.log("✅ Database connection opened successfully for clearing.");  
          await clearDatabase(setDummyState, setCounter);
          console.log("Database cleared successfully after settings save.");
          showToastAsync("✅ Settings saved and old data cleared!", 2000);
      } catch (dbError) {
          console.error("❌ Error during database operation after settings save:", dbError);
          showToastAsync("✅ Settings saved, but failed to clear old data.", 4000);
      }

      navigation.goBack();

    } catch (error) {
      console.error("❌ An unexpected error occurred during settings save:", error);
      showToastAsync("An unexpected error occurred while saving settings.", 3000);
    }
  };

  /**
   * Handles the pairing of a new temperature sensor.
   */
  const pairNewSensor = async () => {
    try {
      const success = await GetPairedSensorName(); 
      if (success) {
        setSensorPaired(true);
        showToastAsync("New sensor paired successfully!", 3000);
      } else {
        setSensorPaired(false);
        showToastAsync("Failed to pair with a new sensor.", 2000);
      }
    } catch (error) {
      console.error("❌ Error pairing new sensor:", error);
      setSensorPaired(false);
      showToastAsync("An unexpected error occurred during sensor pairing.", 2000);
    }
  };

  // --- BEGIN RETURN BLOCK (LINE 184) ---
  return (
    <KeyboardAvoidingView
      // iOS: 'padding' is generally reliable.
      // Android: 'height' is typically best for ScrollView, combined with extraScrollHeight.
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      // CRITICAL for Android: Pushes the scroll view up an extra amount to ensure 
      // the focused input is visible above the keyboard. Adjust 150 as needed.
      {...(Platform.OS === "android" && { extraScrollHeight: 150 })} 
    >
      {/* Sensor Paired Status Display */}
      {sensorPaired && (
        <View style={styles.sensorStatus}>
          <Text style={styles.sensorStatusText}>✅ Sensor Paired!</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          // Use the new style, which includes paddingBottom
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Pair New Sensor Button */}
          <TouchableOpacity
            style={[styles.saveButton, { marginBottom: 45 }, isPressed && styles.saveButtonPressed]}
            onPressIn={() => setIsPressed(true)} 
            onPressOut={() => setIsPressed(false)} 
            onPress={pairNewSensor} 
          >
            <Text style={[styles.saveButtonText, isPressed && styles.saveButtonTextPressed]}>
              Pair New Temperature Sensor
            </Text>
          </TouchableOpacity>

          {/* --- NEW: Select Location Dropdown --- */}
          <Text style={styles.label}>Set Campaign Location:</Text>
          
          {/* --- MODIFIED: Using react-native-element-dropdown --- */}
          <Dropdown
            style={styles.dropdown} // Use the new style
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            data={locations} // Pass the locations array
            search
            maxHeight={300}
            labelField="label" // Key for the text to display
            valueField="value" // Key for the value to save
            placeholder="Select a location..."
            searchPlaceholder="Search..."
            value={selectedLocation} // Controlled component
            onChange={item => {
              setSelectedLocation(item.value); // Update state on change
            }}
          />
          {/* --- END MODIFIED --- */}


          {/* Campaign Name Input */}
          <Text style={styles.label}>Set New Campaign Name:</Text>
          <TextInput
            style={styles.input}
            value={campaignName}
            onChangeText={setCampaignName}
            placeholder="Campaign Name"
            returnKeyType="done"
            autoCapitalize="words" 
          />

          {/* Sensor Number Input */}
          <Text style={styles.label}>Set New Integer Sensor Number:</Text>
          <TextInput
            style={styles.input}
            value={campaignSensorNumber}
            onChangeText={(text) =>
              setCampaignSensorNumber(text.replace(/[^0-9]/g, "").slice(0, 3))
            }
            placeholder="Your Campaign Member Number"
            keyboardType="numeric" 
            maxLength={3} 
          />

          {/* Save Settings Button */}
          <TouchableOpacity
            style={[styles.saveButton, isPressed && styles.saveButtonPressed]}
            onPressIn={() => setIsPressed(true)} 
            onPressOut={() => setIsPressed(false)} 
            onPress={saveSettings} 
          >
            <Text style={[styles.saveButtonText, isPressed && styles.saveButtonTextPressed]}>
              Save Settings
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
// --- END RETURN BLOCK ---


// --- BEGIN STYLESHEET (CORRECTED) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  // CORRECTED: Use this for contentContainerStyle
  scrollContent: {
    flexGrow: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingBottom: 50, // CRITICAL: Adds space at the bottom to ensure the last input can scroll up
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600", 
    color: "#333", 
  },
  input: {
    width: "90%",
    maxWidth: 300, 
    padding: 12,
    borderWidth: 1,
    borderColor: "#a0a0a0", 
    borderRadius: 8, 
    marginBottom: 25, 
    fontSize: 16,
    color: "#444",
    backgroundColor: "#f9f9f9", 
  },
  
  // --- Styles for react-native-element-dropdown ---
  dropdown: {
    width: "90%",
    maxWidth: 300,
    height: 50, // Explicit height
    paddingHorizontal: 10, // Horizontal padding
    borderWidth: 1,
    borderColor: "#a0a0a0",
    borderRadius: 8,
    marginBottom: 25,
    backgroundColor: "#f9f9f9",
  },
  placeholderStyle: {
    fontSize: 16,
    color: '#9a9a9a',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#444',
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
  // --- END Dropdown STYLES ---

  saveButton: {
    backgroundColor: "#007AFF", 
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6, 
  },
  saveButtonPressed: {
    backgroundColor: "#FFFFFF", 
    borderWidth: 2, 
    borderColor: "#007AFF", 
    shadowOpacity: 0.1, 
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    color: "yellow", 
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButtonTextPressed: {
    color: "#007AFF", 
  },
  sensorStatus: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "#e0ffe0", 
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 10,
    zIndex: 10, 
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