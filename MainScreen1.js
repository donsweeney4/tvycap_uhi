import React, { useEffect, useState, useRef } from "react";
import { useKeepAwake } from "expo-keep-awake";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Button } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { bleState } from "./utils/bleState";
import { handleStart, stopSampling, confirmAndClearDatabase } from "./functions";
import { uploadDatabaseToS3 } from "./functionsS3";
import { showToastAsync } from "./functionsHelper";
import { VERSION } from "./constants";
import { SimConfig } from "./utils/SimConfig"; // ← added for Simulation Mode persistence

export default function MainScreen1() {
  const [deviceName, setDeviceName] = useState(null);
  const [counter, setCounter] = useState(0);
  const [temperature, setTemperature] = useState(NaN);
  const [accuracy, setAccuracy] = useState(NaN);
  const [dummyState, setDummyState] = useState(0);
  const [iconType, setIconType] = useState(null);
  const [iconVisible, setIconVisible] = useState(false);

  // Hidden unlock for Simulation Mode
  const [tapCount, setTapCount] = useState(0);
  const [simUnlocked, setSimUnlocked] = useState(false);

  const navigation = useNavigation();
  const deviceNameRef = useRef(null);
  const jobcodeRef = useRef(null);
  const redirectedRef = useRef(false);

  const { width, height } = Dimensions.get("window");
  const logoWidth = width * 0.15;
  const logoHeight = height * 0.15;

  // On focus, load settings and also reflect persisted Simulation Mode state
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      console.log("MainScreen L1: Focus event triggered");
      try {
        const campaignName = await SecureStore.getItemAsync("campaignName");
        const campaignSensorNumber = await SecureStore.getItemAsync("campaignSensorNumber");
        const pairedSensorName = await SecureStore.getItemAsync("pairedSensorName");

        console.log("📦 Focused: retrieved settings:", {
          campaignName,
          campaignSensorNumber,
          pairedSensorName
        });

        if (
          campaignName?.trim() &&
          campaignSensorNumber?.trim() &&
          pairedSensorName?.trim()
        ) {
          const paddedSensorNumber = campaignSensorNumber.padStart(3, "0");
          const fullDeviceName = `${campaignName}_${paddedSensorNumber}`;
          setDeviceName(fullDeviceName);
          deviceNameRef.current = fullDeviceName;

          const currentDateTime = new Date()
            .toLocaleString("sv-SE", { timeZoneName: "short" })
            .replace(/[:\-.TZ]/g, "")
            .slice(0, 15);

          jobcodeRef.current = `${fullDeviceName}-${currentDateTime}`;
          console.log("✅ Updated device name and jobcode:", fullDeviceName, jobcodeRef.current);

          redirectedRef.current = false;
        } else {
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            console.warn("⚠️ Missing info. Redirecting to settings.");
            await showToastAsync("Missing campaign info. Redirecting to Settings...", 3000);
            navigation.navigate("Settings");
          }
        }
      } catch (error) {
        console.error("❌ Error loading settings:", error);
      }

      // reflect persisted Simulation Mode (if previously enabled)
      try {
        const enabled = await SimConfig.isEnabled();
        setSimUnlocked(!!enabled);
      } catch (e) {
        // ignore
      }
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    console.log("MainScreen L4: Setting dummyState for bleState");
    bleState.setDummyState = setDummyState;
    if (!bleState.lastWriteTimestampRef) bleState.lastWriteTimestampRef = { current: 0 };
    if (!bleState.lastErrorToastTimestampRef) bleState.lastErrorToastTimestampRef = { current: 0 };
    if (!bleState.dbRef) bleState.dbRef = { current: null };
  }, []);

  // Hidden unlock: tap Version text 7 times to enable Simulation Mode
  const onVersionTap = async () => {
    if (simUnlocked) return; // already unlocked
    const n = tapCount + 1;
    setTapCount(n);
    if (n >= 7) {
      setSimUnlocked(true);
      await SimConfig.setEnabled(true); // persist ON so BLE facade can switch to mock on next usage
      showToastAsync("✅ Simulation Mode enabled", 2000);
    }
  };

  useKeepAwake();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TriValley Youth</Text>
      <Text style={styles.header}>Climate Action Program</Text>
      <Text style={styles.title}>UHI Sensor</Text>

      {/* Tap 7× on Version to unlock Simulation Mode */}
      <Text style={styles.version} onPress={onVersionTap}>
        Version: {VERSION}
      </Text>

      {simUnlocked && (
        <Text style={{ fontSize: 14, color: "green", marginBottom: 6 }}>
          Simulation Mode Enabled
        </Text>
      )}

      <Text style={styles.status}>
        Sensor: {deviceName || "(no name)"}{"\n"}
        Temperature: {isNaN(temperature) ? "--" : `${(temperature * 9/5 + 32).toFixed(2)}°F`} {"\n"}
        GPS Accuracy: {isNaN(accuracy) ? "--" : `${accuracy}m`}
      </Text>

      <Text style={styles.temperature}>Counter: {counter}</Text>

      <Button
        title="Start"
        containerStyle={{ width: '35%', marginBottom: 12 }}
        buttonStyle={{ backgroundColor: 'blue', borderRadius: 10 }}
        titleStyle={{ color: 'yellow' }}
        onPress={() => {
          if (!deviceNameRef.current) {
            showToastAsync("❌ Device name missing. Check settings.", 3000);
            return;
          }
          handleStart(
            deviceNameRef.current,
            setCounter,
            setTemperature,
            setAccuracy,
            setIconType,
            setIconVisible
          );
        }}
      />

      <Button
        title="Stop"
        containerStyle={{ width: '35%', marginBottom: 12 }}
        buttonStyle={{ backgroundColor: 'blue', borderRadius: 10 }}
        titleStyle={{ color: 'yellow' }}
        onPress={() => {
          if (!bleState.deviceRef.current && !bleState.isSamplingRef.current) {
            showToastAsync("⚠️ Nothing to stop: Not connected or sampling.", 2000);
            return;
          }
          stopSampling();
          setIconVisible(false);
          setIconType(null);
        }}
      />

      <Button
        title="Upload Data"
        containerStyle={{ width: '35%', marginBottom: 12 }}
        buttonStyle={{ backgroundColor: 'blue', borderRadius: 10 }}
        titleStyle={{ color: 'yellow' }}
        onPress={() => {
          if (!deviceNameRef.current || !jobcodeRef.current) {
            showToastAsync("❌ Missing metadata. Cannot upload.", 3000);
            return;
          }
          const currentDbFilePath = `${FileSystem.documentDirectory}SQLite/appData.db`;
          uploadDatabaseToS3(currentDbFilePath, jobcodeRef, deviceNameRef);
        }}
      />

      <View style={{ marginBottom: 20 }}><Text> </Text></View>

      <Button
        title="Clear Data"
        containerStyle={{ width: '35%', marginBottom: 12 }}
        buttonStyle={{ backgroundColor: 'blue', borderRadius: 10 }}
        titleStyle={{ color: 'yellow' }}
        onPress={() => {
          confirmAndClearDatabase(setDummyState, setCounter);
          setIconVisible(false);
          setIconType(null);
        }}
      />

      <Image
        source={require("./assets/icon.png")}
        style={[styles.logo, { width: logoWidth, height: logoHeight }]}
        resizeMode="contain"
      />
      <Text style={styles.questname}>Quest Science Center{"\n"}Livermore, CA</Text>

      {iconVisible && (
        <View style={styles.iconContainer}>
          {iconType === 'red' && (
            <>
              <Text style={styles.errorText}>Temperature sensor not connected!</Text>
              <Text style={styles.errorText}>Push start to try to reconnect & resume!</Text>
              <Icon name="error" size={50} color="red" />
            </>
          )}
          {iconType === 'green' && (
            <>
              <Text style={styles.errorText}>Data sample saved!</Text>
              <Icon name="check-circle" size={50} color="green" />
            </>
          )}
        </View>
      )}
    </View>
  );
}

const { width, height } = Dimensions.get("window");
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: height * 0.05,
  },
  header: {
    fontSize: 20,
    marginBottom: 4,
    color: 'rgb(53, 111, 130)',
    fontWeight: "bold"
  },
  title: {
    fontSize: 36,
    marginBottom: 7,
    color: "blue",
    fontWeight: "bold"
  },
  temperature: {
    fontSize: 36,
    marginTop: 20,
    marginBottom: 30,
    color: "yellow",
    fontWeight: "bold",
    borderColor: "blue",
    backgroundColor: "blue",
    borderWidth: 2,
    borderRadius: 12,
    padding: 10
  },
  status: {
    fontSize: 18,
    marginVertical: 3
  },
  version: {
    fontSize: 12,
    marginBottom: 15,
    color: "blue"
  },
  logo: {
    position: "absolute",
    bottom: 0,
    right: 0,
    marginRight: 5,
    marginBottom: -35,
  },
  questname: {
    position: "absolute",
    bottom: 0,
    left: 0,
    marginBottom: 0,
    marginLeft: 5,
    fontSize: 18,
    color: "blue"
  },
  iconContainer: {
    position: "absolute",
    bottom: 0,
    marginTop: 20,
    alignSelf: "center",
    marginBottom: 20,
    alignItems: "center",
  },
  // added to avoid undefined style reference
  errorText: {
    fontSize: 16,
    color: "black",
    marginBottom: 4,
    textAlign: "center",
  },
});
