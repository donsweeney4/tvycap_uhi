import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
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
import { GetPairedSensorName, openDatabaseConnection, clearDatabase } from "./functions";
import { showToastAsync } from "./functionsHelper";

export default function SettingsScreen() {
  const [isPressed, setIsPressed] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  const [sensorPaired, setSensorPaired] = useState(false);
  const [dummyState, setDummyState] = useState(0);
  const [counter, setCounter] = useState(0);

  const navigation = useNavigation();

  const loadSettings = async () => {
    try {
      if (!(await SecureStore.isAvailableAsync())) {
        console.error("SecureStore is not available on this device.");
        return;
      }

      const campaignName = await SecureStore.getItemAsync("campaignName");
      const campaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");

      if (campaignName) setCampaignName(campaignName);
      if (campaignSensorNumber) setCampaignSensorNumber(campaignSensorNumber);
    } catch (error) {
      console.error("Error loading settings from SecureStore:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const writeWithRetry = async (key, value, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      await SecureStore.setItemAsync(key, value);
      const verify = await SecureStore.getItemAsync(key);
      if (verify === value) {
        console.log(`✅ ${key} saved successfully on attempt ${attempt}`);
        return true;
      }
      console.warn(`⏳ Retry ${attempt} failed for ${key}`);
      await new Promise((res) => setTimeout(res, 300));
    }
    console.error(`❌ Failed to save ${key} after ${retries} attempts`);
    return false;
  };

  const saveSettings = async () => {
    try {
      Keyboard.dismiss();

      if (!campaignName || !campaignSensorNumber) {
        showToastAsync("Missing Info \n Enter both campaign name and campaign sensor number.", 2000);
        return;
      }

      if (campaignName.includes("_")) {
        showToastAsync("❌ Campaign name cannot contain underscores (_)", 3000);
        return;
      }

      const paddedSensor = campaignSensorNumber.padStart(3, "0");

      if (!(await SecureStore.isAvailableAsync())) {
        Alert.alert("Error", "SecureStore is not available on this device.");
        return;
      }

      const saved1 = await writeWithRetry("campaignName", campaignName);
      const saved2 = await writeWithRetry("campaignSensorNumber", paddedSensor);

      if (!saved1 || !saved2) {
        showToastAsync("❌ Failed to save settings", 3000);
        return;
      }


// --- Settings are saved to SecureStore. Now handle database clearing ---

      try {
          // Ensure the database connection is open and tables are created/verified
          const db = await openDatabaseConnection(); // This will open if not open, and ensure table exists
          await clearDatabase(setDummyState, setCounter); // This function should handle clearing the database
          console.log("Database cleared successfully after settings save.");
          showToastAsync("✅ Settings saved and data cleared, if any!", 2000);

      } catch (dbError) {
          // This catch block specifically handles errors from openDatabaseConnection or clearDatabase
          console.error("❌ Error during database operation after settings save:", dbError);
          // Inform the user that settings were saved, but old data might remain or DB is messed up
          showToastAsync("✅ Settings saved, but failed to clear old data.", 4000);
          // Decide if you want to navigate back or stay.
          // If clearing is *absolutely critical* for a "fresh start" with new settings,
          // you might choose NOT to navigate back and force user attention to the error.
          // Otherwise, proceed.
      }

      // Always navigate back and show success for the overall setting save,
      // unless the database error is critical enough to halt the process.
      // If `showToastAsync("✅ Settings saved and old data cleared!", 2000);` is above,
      // you might not need this final toast here.
      // If the `dbError` catch block executes, the user gets a different toast.
      if (!dbError) { // Only navigate back if no database error, or if you decide it's okay to proceed
        navigation.goBack();
      }

    } catch (error) {
      // This catch block handles errors from SecureStore operations or initial validation
      console.error("❌ Error saving settings (SecureStore/initial validation):", error);
      showToastAsync("Failed to update settings.", 2000);
    }
  
  };

  const pairNewSensor = async () => {
    try {
      const success = await GetPairedSensorName();
      if (success) {
        setSensorPaired(true);
        showToastAsync("New sensor paired successfully", 3000);
      } else {
        setSensorPaired(false);
        showToastAsync("Failed to pair with a new sensor.", 2000);
      }
    } catch (error) {
      console.error("❌ Error pairing new sensor:", error);
      setSensorPaired(false);
      showToastAsync("An unexpected error occurred.", 2000);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {sensorPaired && (
        <View style={styles.sensorStatus}>
          <Text style={styles.sensorStatusText}>✅ Sensor Paired!</Text>
        </View>
      )}

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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

          <Text style={styles.label}>Set New Campaign Name:</Text>
          <TextInput
            style={styles.input}
            value={campaignName}
            onChangeText={setCampaignName}
            placeholder="Campaign Name"
            returnKeyType="done"
          />

          <Text style={styles.label}>Set New Integer Sensor Number:</Text>
          <TextInput
            style={styles.input}
            value={campaignSensorNumber}
            onChangeText={(text) =>
              setCampaignSensorNumber(text.replace(/[^0-9]/g, "").slice(0, 3))
            }
            placeholder="Your Campaign Member Number"
            keyboardType="numeric"
          />

          <TouchableOpacity
            style={[styles.saveButton, isPressed && styles.saveButtonPressed]}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            onPress={saveSettings}
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
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    width: "90%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  saveButtonPressed: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  saveButtonText: {
    color: "yellow",
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButtonTextPressed: {
    color: "black",
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
