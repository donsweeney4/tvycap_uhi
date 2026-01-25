import React from "react";
import { View, Text, StyleSheet } from "react-native";

// styles are still needed for toastConfig
const styles = StyleSheet.create({
  toastContainer: {
    // These base styles will be overridden by props.containerStyle when calling showToastAsync
    width: "90%", // Example width
    alignItems: "center",
    justifyContent: "center",
  },
  toastText: {
    // These base styles will be overridden by props.textStyle when calling showToastAsync
    textAlign: "center",
  },
});

/**
 * This configuration should be passed to the <Toast /> component 
 * at the root of your app (in App.js).
 */
export const toastConfig = {
  customToast: ({ text1, props }) => (
    <View style={[styles.toastContainer, props.containerStyle]}>
      <Text style={[styles.toastText, props.textStyle]}>{text1}</Text>
    </View>
  ),
};