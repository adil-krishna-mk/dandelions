# Lumina Bloom — Interactive Arduino Nano Dandelion Garden

An exhibition-grade, hardware-linked interactive installation inspired by teamLab digital art exhibitions. The project recreates the authentic physical and visual sensation of blowing dandelion seeds into the wind using an **Arduino Nano** (or ESP32) microcontroller and a sound sensor / microphone.

---

## Features

- **Interactive Botanical Physics**:
  - Dandelions composed of multi-segment flexible stems and hundreds of physical pappus parachutes.
  - Multi-tiered anchor strength: subtle breath dislodges the outermost seeds; continuous lung force dislodges stubborn core seeds.
  - Curl noise turbulence & buoyancy: seeds swirl in realistic fluid updrafts and drift upward without bottom-screen wrapping.
  - Seamless blooming cycle: after seeds are blown free, delicate buds emerge from the ground, sprout, and unfurl into fresh glowing flowers.
- **Hardware Integration (Arduino Nano & ESP32)**:
  - Listens to microphone DC trigger and analog envelope on **Pin A0 (Analog ADC)** and **Pin D2 (Digital Trigger)**.
  - Connects directly to the browser via **WebSerial API** over standard USB at 115200 baud (no backend server required).
  - Emits real-time 50Hz JSON telemetry with 10-bit ADC normalization.
- **Procedural Ethereal Soundscape**:
  - Synthesized Web Audio ambient breeze, wind whoosh, harmonic pentatonic crystal chimes when seeds dislodge, and clear sound when a flower is completely swept clean.
- **Exhibition Display Mode**:
  - Designed for projection screens and monitors.
  - Auto-hiding HUD interface for pure immersion.
  - Color themes: *Art Exhibition* (gold, cyan, rose, and mint), *Bioluminescent*, *Ethereal Silver*, and *Sunset*.
- **Instant Browser Mic Fallback**:
  - Includes a built-in computer microphone option and spacebar trigger for testing without hardware.

---

## Quick Start

1. **Launch the Visualizer**:
   - Open [index.html](file:///Users/adilkrishna/useless2/index.html) or run a local web server (e.g., `http://localhost:8080`) in Google Chrome or Microsoft Edge.
2. **Connect Arduino Nano**:
   - Flash [arduino_nano_firmware/arduino_nano_dandelion.ino](file:///Users/adilkrishna/useless2/arduino_nano_firmware/arduino_nano_dandelion.ino) onto your Arduino Nano (ATmega328P).
   - Connect the microphone to **Pin A0** and/or **Pin D2** (see [WIRING.md](file:///Users/adilkrishna/useless2/WIRING.md)).
   - In the web app, click **"Connect Arduino"** and select your USB serial port.
3. **No Hardware Yet?**:
   - Click **"Laptop Mic"** in the top bar to test breath detection using your computer's microphone.
   - Or press **Spacebar** / click **"Simulate Blow"**.
