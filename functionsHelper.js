
import React from "react";
import { Dimensions, View, Text, StyleSheet } from "react-native";
import Toast from "react-native-toast-message"; // Import the new library


const screenHeight = Dimensions.get("window").height; // Get screen height



// showToastAsync function

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

////////////////////////////////////////////
// Styles for the custom toast

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

////////////////////////////////////////////
// custom toast configuration
// This configuration should be passed to the <Toast /> component at the root of your app.

export const toastConfig = {
      /*
        You can create a custom toast type by defining a function 
        that returns a React component.
        This allows for complete control over the toast's appearance.
      */
  customToast: ({ text1, props }) => (
    <View style={[styles.toastContainer, props.containerStyle]}>
      <Text style={[styles.toastText, props.textStyle]}>{text1}</Text>
    </View>
  ),
          // Add other default types if you want to customize them globally
          // success: (props) => (
          //   <BaseToast
          //     {...props}
          //     style={{ borderLeftColor: 'pink' }}
          //     contentContainerStyle={{ paddingHorizontal: 15 }}
          //     text1Style={{
          //       fontSize: 15,
          //       fontWeight: '400'
          //     }}
          //   />
          // ),
          // error: (props) => (
          //   <ErrorToast
          //     {...props}
          //     text1Style={{
          //       fontSize: 17
          //     }}
          //     text2Style={{
          //       fontSize: 15
          //     }}
          //   />
          // )
};

//////////// OLD MATERIAL FOLLOWS /////////////////////////////////////////////////
///////////////////////////////////////////////////////////////

// integrate Toast component in your App.js/App.tsx
/*
// In your App.js or App.tsx (or the root component of your application)
import React from 'react';
import { View } from 'react-native';
import Toast from 'react-native-toast-message';
import { toastConfig } from './your-toast-file'; // Adjust path as needed

function App() {
  return (
    <View style={{ flex: 1 }}>
      // Your main application content goes here
      // For example: <MyStackNavigator /> or <MyTabs />

      // IMPORTANT: The Toast component must be placed at the root of your app
      // It should be the last component rendered to ensure it appears on top of everything.
      <Toast config={toastConfig} />
    </View>
  );
}

export default App;
*/

/////////////////////////////////////////////////////////////////

// old showToastAsync

/* import Toast from "react-native-root-toast";
import { Dimensions } from "react-native";

const screenHeight = Dimensions.get("window").height; // Get screen height

export const showToastAsync = (message, duration = 3000) => {
  return new Promise((resolve) => {
    Toast.show(message, {
      duration: duration, // Directly use the provided duration
      position: screenHeight * 0.15, // 15% from the top
      shadow: true,
      animation: true,
      hideOnPress: true,
      delay: 0,
      opacity: 1, // Ensures visibility
      containerStyle: {
        backgroundColor: "blue", // Set toast background color
        borderRadius: 10, // Optional: Round corners
        padding: 10,
      },
      textStyle: {
        color: "yellow",
        fontSize: 20,
      },
    });

    // ✅ Resolve the promise after the provided duration
    setTimeout(resolve, duration);
  });
}; */
/////////////////////////////////////////////////////////////////

