// App.js (Main entry point)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MainScreen from './MainScreen1';
import SettingsScreen from './Settings1'; // Import the Settings screen

import Toast from 'react-native-toast-message';
import { toastConfig } from './functionsHelper'; // Import the custom toast configuration


if (!__DEV__) {
  console.log = () => {};  // Disable all console logs in production
  console.warn = () => {}; // Disable warnings
  console.error = () => {}; // Disable errors (optional)
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Main" component={MainScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <Toast config={toastConfig} />
    </NavigationContainer>
    
  );
}




