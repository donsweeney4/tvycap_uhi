// utils/ble.js
// Runtime switch between real BleManager and the mock, WITHOUT persistence.
// The sim flag lives in bleState so any screen can toggle it for the current session only.

import { BleManager } from "react-native-ble-plx";
import { bleState } from "./bleState";
import { MockBleManager } from "./bleMockManager";

// Initialize refs if your bleState doesn't already
if (!bleState.manager) bleState.manager = null;
if (!bleState.simEnabledRef) bleState.simEnabledRef = { current: false };

/**
 * Enable/disable Simulation Mode for THIS APP SESSION ONLY.
 * Call setSimulationEnabled(true) when the user unlocks sim (e.g., 7 taps on Version).
 * If the manager type doesn’t match the new mode, we drop it so the next getter recreates.
 */
export function setSimulationEnabled(enabled) {
  const wantsSim = !!enabled;
  const hasMgr = !!bleState.manager;
  const isMock = hasMgr && bleState.manager instanceof MockBleManager;

  bleState.simEnabledRef.current = wantsSim;

  // Force re-init on next getBLEManager() if type is wrong
  if ((wantsSim && !isMock) || (!wantsSim && isMock)) {
    try {
      // Best-effort cleanup; real/ mock both expose stopDeviceScan if scanning
      bleState.manager?.stopDeviceScan?.();
    } catch {}
    bleState.manager = null;
  }
}

/** Returns true if Simulation Mode is currently enabled (session-only). */
export async function inSimulation() {
  return !!bleState.simEnabledRef.current;
}

/**
 * Get the active BLE manager. Creates one if missing, choosing mock vs real
 * based on the current (session) sim flag.
 */
export async function getBLEManager() {
  if (bleState.manager) return bleState.manager;

  const sim = await inSimulation();
  bleState.manager = sim ? new MockBleManager() : new BleManager();
  return bleState.manager;
}

/**
 * Optional helper to hard-reset the manager. Next call to getBLEManager()
 * will recreate the correct type based on the current sim flag.
 */
export function resetBLEManager() {
  try {
    bleState.manager?.stopDeviceScan?.();
  } catch {}
  bleState.manager = null;
}