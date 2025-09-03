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
import { GetPairedSensorName, openDatabaseConnection, clearDatabase } from "./functions";
import { showToastAsync } from "./functionsHelper";

export default function SettingsScreen() {
  const [isPressed, setIsPressed] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [pairedSensorName, setPairedSensorName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  const [sensorPaired, setSensorPaired] = useState(false);
  const [dummyState, setDummyState] = useState(0);
  const [counter, setCounter] = useState(0);
  const [userEmail, setUserEmail] = useState("");   // ✅ optional email

  const navigation = useNavigation();

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedCampaignName = await SecureStore.getItemAsync("campaignName");
        const storedCampaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");
        const storedPairedSensorName = await SecureStore.getItemAsync("pairedSensorName");
        const storedEmail = await SecureStore.getItemAsync("userEmail");

        if (storedCampaignName) setCampaignName(storedCampaignName);
        if (storedCampaignSensorNumber) setCampaignSensorNumber(storedCampaignSensorNumber);
        if (storedPairedSensorName) setPairedSensorName(storedPairedSensorName);
        if (storedEmail) setUserEmail(storedEmail);
      } catch (error) {
        console.error("❌ Error loading settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Retry wrapper for SecureStore
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

  // Save campaign + email settings
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
        showToastAsync("Error: SecureStore is not available on this device.", 3000);
        return;
      }

      const savedCampaignName = await writeWithRetry("campaignName", campaignName);
      const savedCampaignSensorNumber = await writeWithRetry("campaignSensorNumber", paddedSensor);

      if (userEmail?.trim()) {
        await SecureStore.setItemAsync("userEmail", userEmail.trim());
      } else {
        await SecureStore.deleteItemAsync("userEmail");  // clear if blank
      }

      if (!savedCampaignName || !savedCampaignSensorNumber) {
        showToastAsync("❌ Failed to save settings to SecureStore.", 3000);
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
      console.error("❌ Unexpected error during save:", error);
      showToastAsync("An unexpected error occurred while saving settings.", 3000);
    }
  };

  // Pair sensor with timeout handling
  const pairNewSensor = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );
      const result = await Promise.race([GetPairedSensorName(), timeoutPromise]);

      if (result) {
        setSensorPaired(true);
        setPairedSensorName(result);
        showToastAsync("✅ New sensor paired successfully!", 3000);
      } else {
        setSensorPaired(false);
        showToastAsync("⚠️ Failed to pair with a new sensor.", 2000);
      }
    } catch (error) {
      console.error("❌ Error pairing new sensor:", error);
      setSensorPaired(false);

      if (error.message?.toLowerCase().includes("timeout")) {
        showToastAsync("❌ BLE sensor not found (connection timed out)", 3000);
      } else {
        showToastAsync("❌ An unexpected error occurred during sensor pairing.", 2000);
      }
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

          {/* Optional Email Address */}
          <Text style={styles.label}>Set Optional Campaign Email Address:</Text>
          <TextInput
            style={styles.input}
            value={userEmail}
            onChangeText={setUserEmail}
            placeholder="Campaign Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label2}>Leave email blank to use share sheet instead</Text>

          {/* Save Button */}
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
    fontWeight: "600",
    color: "#333",
  },
  label2: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "400",
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
