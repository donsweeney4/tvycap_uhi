// constants.js

// Increment this for every release, also update the version field in app.json 
export const VERSION = "4.2.2";  

// The buildNumber (IOS) and versionCode (android) are required, independent and used by the app stores to determine if an update is available.

// The official values are managed externally, these values control what is printed on the MainScreen. 
// They should be incremented for every release except local development builds. The current values can be found in the app stores or in the respective configuration files for iOS and Android.

export const IOS_BUILD_NUMBER = "5";  // Increment this for every TestFlight or store (preview or production), get current value from appstoreconnect.apple.com
export const ANDROID_VERSION_CODE = "5"; // Increment this for every sideload (preview .APK) or Play Store release (production .AAB), get current value from play.google.com/console or expo.com or from the AndroidManifest.xml file in the android/app/src/main directory


export const LOCATION_TASK_NAME = "background-location-task";

export const SERVICE_UUID      =       "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
export const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"




