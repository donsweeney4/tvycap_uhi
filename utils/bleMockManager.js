// utils/bleMockManager.js
import { SERVICE_UUID, CHARACTERISTIC_UUID } from "../constants";
// If needed, add: import { Buffer } from "buffer";

function b64(utf8) {
  if (typeof Buffer !== "undefined") return Buffer.from(utf8, "utf8").toString("base64");
  // eslint-disable-next-line no-undef
  return btoa(unescape(encodeURIComponent(utf8)));
}

class SimWave {
  constructor({ base = 24, amp = 3.5, periodMs = 5*60*1000, noise = 0.25, driftPerHour = 0.05 }) {
    this.base = base;
    this.amp = amp;
    this.periodMs = periodMs;
    this.noise = noise;
    this.driftPerMs = driftPerHour / (60*60*1000);
    this.t0 = Date.now() - Math.random()*periodMs;
  }
  sample(t) {
    const phase = 2*Math.PI*((t - this.t0) % this.periodMs)/this.periodMs;
    const drift = (t - this.t0)*this.driftPerMs;
    const n = (Math.random()-0.5)*2*this.noise;
    return this.base + this.amp*Math.sin(phase) + drift + n;
  }
}

class MockCharacteristic {
  // Your app calls: characteristic.read() → { value: base64("temp") }
  constructor(device) { this._device = device; }
  async read() {
    const now = Date.now();
    const tempC = this._device.tempWave.sample(now);
    const payload = tempC.toFixed(2); // NOTE: your current code treats decodedValue as temperature only
    return { value: b64(payload) };
  }
}

class MockDevice {
  constructor(name = "quest_100") {
    this.id = "SIM-" + name;
    this.name = name;
    this._connected = false;
    this.tempWave = new SimWave({});
    this._baseRssi = -55;
  }
  rssi() { return this._baseRssi + Math.round((Math.random()-0.5)*6); }

  async connect() { this._connected = true; return this; }
  async isConnected() { return this._connected; }
  async cancelConnection() { this._connected = false; }
  async discoverAllServicesAndCharacteristics() { /* no-op */ }

  async services() {
    // Shape compatible with your logging loop
    return [{ uuid: SERVICE_UUID }];
  }

  async characteristicsForService(uuid) {
    if (uuid !== SERVICE_UUID) return [];
    return [{ uuid: CHARACTERISTIC_UUID }];
  }

  async readCharacteristicForService(serviceUUID, charUUID) {
    if (serviceUUID !== SERVICE_UUID || charUUID !== CHARACTERISTIC_UUID) {
      throw new Error("Characteristic not found");
    }
    return new MockCharacteristic(this);
  }
}

export class MockBleManager {
  constructor() {
    this._device = new MockDevice("quest_100");
    this._scanTimer = null;
  }

  async state() {
    // Pretend Bluetooth is ready
    return "PoweredOn";
  }

  onStateChange(cb, emitCurrent = false) {
    // Return an object with .remove() like ble-plx does
    let removed = false;
    if (emitCurrent) setTimeout(() => { if (!removed) cb("PoweredOn"); }, 0);
    return { remove: () => { removed = true; } };
  }

  startDeviceScan(_uuids, _options, cb) {
    const emit = () => {
      cb(null, {
        id: this._device.id,
        name: this._device.name,
        rssi: this._device.rssi(),
        // The code later expects a *device object* with connect()/etc, so pass a bound proxy:
        connect: this._device.connect.bind(this._device),
        isConnected: this._device.isConnected.bind(this._device),
        cancelConnection: this._device.cancelConnection.bind(this._device),
        discoverAllServicesAndCharacteristics:
          this._device.discoverAllServicesAndCharacteristics.bind(this._device),
        services: this._device.services.bind(this._device),
        characteristicsForService: this._device.characteristicsForService.bind(this._device),
        readCharacteristicForService:
          this._device.readCharacteristicForService.bind(this._device),
      });
    };
    emit();
    this._scanTimer = setInterval(emit, 800); // repeat like a real scan
  }

  stopDeviceScan() {
    if (this._scanTimer) {
      clearInterval(this._scanTimer);
      this._scanTimer = null;
    }
  }
}
