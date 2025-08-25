// /utils/blePermissions.js
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestBluetoothPermissions() {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    const grantedScan = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      {
        title: 'Bluetooth Scan Permission',
        message: 'We need access to scan for BLE devices.',
        buttonPositive: 'OK',
      }
    );

    
    const grantedConnect = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      {
        title: 'Bluetooth Connect Permission',
        message: 'We need access to connect to BLE devices.',
        buttonPositive: 'OK',
      }
    );

    const grantedLocation = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'We need location access to scan for BLE.',
        buttonPositive: 'OK',
      }
    );

    return (
      grantedScan === PermissionsAndroid.RESULTS.GRANTED &&
      grantedConnect === PermissionsAndroid.RESULTS.GRANTED &&
      grantedLocation === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  return true;
}
