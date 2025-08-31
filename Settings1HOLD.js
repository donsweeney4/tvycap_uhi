import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, TextInput, Button } from "react-native";
import * as SecureStore from "expo-secure-store";
import { showToastAsync } from "./functionsHelper";

export default function Settings1({ navigation }) {
  const [campaignName, setCampaignName] = useState("");
  const [campaignSensorNumber, setCampaignSensorNumber] = useState("");
  const [pairedSensorName, setPairedSensorName] = useState("");
  const [userEmail, setUserEmail] = useState("");   // ✅ new email field

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

  const saveSettings = async () => {
    try {
      await SecureStore.setItemAsync("campaignName", campaignName);
      await SecureStore.setItemAsync("campaignSensorNumber", campaignSensorNumber);
      await SecureStore.setItemAsync("pairedSensorName", pairedSensorName);

      if (userEmail?.trim()) {
        await SecureStore.setItemAsync("userEmail", userEmail.trim());
      } else {
        await SecureStore.deleteItemAsync("userEmail");  // ✅ remove if empty
      }

      showToastAsync("✅ Settings saved", 2000);
      navigation.goBack();
    } catch (error) {
      console.error("❌ Error saving settings:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <TextInput
        style={styles.input}
        placeholder="Campaign Name"
        value={campaignName}
        onChangeText={setCampaignName}
      />
      <TextInput
        style={styles.input}
        placeholder="Campaign Sensor Number"
        value={campaignSensorNumber}
        onChangeText={setCampaignSensorNumber}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Paired Sensor Name"
        value={pairedSensorName}
        onChangeText={setPairedSensorName}
      />

      {/* ✅ New Email input */}
      <TextInput
        style={styles.input}
        placeholder="Optional Email (for data export)"
        value={userEmail}
        onChangeText={setUserEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.note}>
        Leave blank to use share sheet instead of email.
      </Text>

      <Button title="Save" onPress={saveSettings} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#eef",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "blue",
  },
  input: {
    height: 50,
    borderColor: "blue",
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "white",
  },
  note: {
    fontSize: 14,
    color: "gray",
    marginBottom: 20,
    marginLeft: 5,
  },
});
