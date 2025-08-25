
// utils/ble.js
import { BleManager } from "react-native-ble-plx";
import { SimConfig } from "./SimConfig";
import { MockBleManager } from "./bleMockManager";

let _mgr = null;

export async function getBLEManager() {
  if (_mgr) return _mgr;
  const sim = await SimConfig.isEnabled();
  _mgr = sim ? new MockBleManager() : new BleManager();
  return _mgr;
}

export async function inSimulation() {
  try { return await SimConfig.isEnabled(); } catch { return false; }
}
