# Hardware Wiring & Setup Guide: Arduino Nano Dandelion Controller

This guide explains how to connect your microphone / sound sensor to the **Arduino Nano (ATmega328P)** on **Pin A0 (Analog)** and/or **Pin D2 (Digital Trigger)**, and bridge it directly to the **Lumina Bloom** interactive visualizer via WebSerial.

---

## 1. Hardware Required
1. **Arduino Nano** (ATmega328P, standard or CH340 / Old Bootloader clone)
2. **Microphone or Sound Sensor Module**, such as:
   - **LM393 Sound Sensor Module** (has digital `DO` pin and sensitivity potentiometer)
   - **KY-037 / KY-038 High-Sensitivity Sound Module** (has both `AO` and `DO` pins)
   - **MAX4466 / MAX9814 Electret Microphone Amplifier** (analog `OUT`)
3. **Jumper Wires** (Female-to-Male or Female-to-Female)
4. **Mini-USB or Type-C Cable** (data cable connecting Arduino Nano to computer)

---

## 2. Arduino Nano Wiring Schematic

```
+--------------------------+                 +------------------------+
|   Sound Sensor / Mic     |                 |     Arduino Nano       |
|                          |                 |                        |
|   VCC  ------------------+-----------------> 5V (or 3V3 for MAX4466)|
|                          |                 |                        |
|   GND  ------------------+-----------------> GND                    |
|                          |                 |                        |
|   AO (Analog Audio) -----+-----------------> Pin A0 (ADC 0-1023)    |
|      -- AND / OR --      |                 |                        |
|   DO (Digital Trigger) --+-----------------> Pin D2 (Digital Input) |
+--------------------------+                 +------------------------+
```

### Pin Mapping Table

| Microphone Pin | Arduino Nano Pin | Description |
|---|---|---|
| **VCC** | **5V** (or **3V3**) | Power supply (5V for LM393 / KY-037; 3.3V recommended for MAX4466 / MAX9814) |
| **GND** | **GND** | Ground reference |
| **AO / OUT (Analog)** | **Pin A0** | Reads real-time breath sound intensity & acoustic pressure (10-bit ADC: `0 - 1023`) |
| **DO / OUT (Digital)** | **Pin D2** (or A0) | Reads comparator trigger state (LOW = idle, HIGH = blow threshold exceeded) |

> [!TIP]
> **Tuning the Potentiometer**:
> If your sound sensor has a blue potentiometer trimmer with a small brass screw:
> 1. Power the Arduino Nano over USB.
> 2. With normal background room noise, turn the screw until the sensor's trigger LED just turns OFF.
> 3. Gently blow into the microphone cartridge — the sensor LED should illuminate brightly during the blow!

---

## 3. Uploading Firmware to Arduino Nano

1. Connect the Arduino Nano to your computer via USB.
2. Open the sketch: [arduino_nano_firmware/arduino_nano_dandelion.ino](file:///Users/adilkrishna/useless2/arduino_nano_firmware/arduino_nano_dandelion.ino) in the **Arduino IDE**.
3. Under **Tools > Board**, select **"Arduino AVR Boards" > "Arduino Nano"**.
4. Under **Tools > Processor**, select **"ATmega328P"** (if upload times out, switch to **"ATmega328P (Old Bootloader)"** — very common on CH340 clones).
5. Under **Tools > Port**, select your serial port (e.g. `/dev/cu.usbserial-xxx` on macOS, or `COM3`/`COM4` on Windows).
6. Click **Upload** (`Ctrl+U` or `Cmd+U`).
7. Once uploaded, the onboard pin 13 LED will flash twice to confirm startup.

---

## 4. Connecting to the Simulation via WebSerial

1. Open `http://localhost:8080` (or `index.html`) in **Google Chrome**, **Microsoft Edge**, or **Opera**.
2. Click the orange **"Connect Arduino"** button in the top bar.
3. In the browser prompt, select your Arduino Nano port (e.g. `USB-SERIAL CH340` or `FT232R USB UART`) and click **Connect**.
4. The status card will indicate:
   - Green badge: **"Connected (115200)"**
   - Live hardware status: **"Pin A0/D2: LOW (Idle)"**
5. Blow into your microphone:
   - Status updates instantly to **"Pin A0/D2: HIGH (Blowing)"**.
   - The on-screen **Wind Force** meter surges.
   - The 16 glowing dandelions dislodge their parachutes into the wind with realistic botanical physics and crystal chimes!

---

## 5. Backwards Compatibility: ESP32

If you ever wish to switch back to an **ESP32 WROOM-32**:
- Firmware is available at [esp32_firmware/esp32_dandelion.ino](file:///Users/adilkrishna/useless2/esp32_firmware/esp32_dandelion.ino).
- Microphone connects to **GPIO 32 (G32)**.
- The web app automatically detects the ESP32 packet and adapts the UI and 12-bit ADC (`0 - 4095`) scale seamlessly.
