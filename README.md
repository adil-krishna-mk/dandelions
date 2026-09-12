# Lumina Bloom — Interactive Dandelion Garden Simulation

An exhibition-grade, fully **software-based** interactive digital art installation inspired by teamLab sensory exhibitions. **Lumina Bloom** recreates the authentic physical and visual sensation of blowing dandelion seeds into the wind using pure browser technologies — **zero hardware, microcontrollers, or external sensors required**.

---

## Highlights

- 🍃 **100% Pure Software**: Runs directly in any modern browser without microcontrollers, wiring, or physical sensor kits.
- 🎙️ **Acoustic Breath Detection**: Uses the browser's native **Web Audio API** and microphone input to detect real-time breath intensity, blowing force, and lung stamina.
- 💨 **Multi-Modal Software Controls**: Seamlessly interact via microphone breath, mouse velocity/swipes, touch gestures, or keyboard controls.
- 🌸 **Botanical Spring & Stem Physics**: Multi-segment flexible dandelion stems sway organically according to wind velocity and applied force.
- ✨ **Individual Seed Aerodynamics**: Hundreds of independently simulated pappus parachutes governed by multi-tiered anchor strength, fluid curl noise turbulence, and natural updrafts.
- 🔄 **Continuous Botanical Life Cycle**: Cleared stems rest and fade, followed by delicate new buds sprouting and unfurling into luminous blooming flowers.
- 🎵 **Procedural Web Audio Soundscape**: Pure synthesized audio—gentle ambient breeze, dynamic wind gusts, harmonic pentatonic crystal chimes, and completion chords with zero external audio files.
- 🏛️ **Exhibition Display Mode**: Auto-hiding glassmorphic HUD, customizable color themes (*Art Exhibition*, *Bioluminescent*, *Ethereal Silver*, *Sunset*), and one-click fullscreen projection mode.

---

## Interaction Methods

| Control Mode | How It Works |
| :--- | :--- |
| **Microphone (Breath)** | Click **"Laptop Mic"** to grant browser microphone access. Blow gently into your computer or headset mic to scatter outer seeds; blow with deeper lung force to dislodge stubborn core seeds. |
| **Cursor / Mouse Wind** | Move or sweep your mouse cursor through the dandelion heads. Fast gestures generate localized aerodynamic wind bursts that strip seeds in the sweep direction. |
| **Touch Gestures** | Tap and drag across touchscreens or mobile displays to create flowing wind trails. |
| **Keyboard / Simulation** | Press **Spacebar** or click **"Simulate Blow"** to generate instant wind gusts with realistic physics response. |

---

## Interactive Features & Physics Engine

### 1. Multi-Tiered Anchor Resistance
Each dandelion consists of concentric rings of seeds with varying grip levels:
- **Outer Perimeter**: Low threshold seeds that detach with faint breezes or soft exhalations.
- **Mid-Tier Rings**: Moderate anchor strength requiring sustained airflow.
- **Core Seeds**: Resilient anchors demanding genuine, focused lung pressure or strong gusts to completely sweep the stem clean.

### 2. Fluid Turbulence & Updrafts
- Released seeds experience buoyancy, air resistance, and randomized 2D curl noise turbulence.
- Seeds swirl upwards into the atmosphere without unnatural screen looping or clipping.

### 3. Garden Challenge & Regrowth Cycle
- A real-time tracker keeps count of fully cleared dandelions.
- When all seeds depart a flower, celebratory harmonic chords ring out.
- Empty stems gently rest and dissolve into the soil, prompting fresh buds to sprout and bloom into glowing dandelions.

### 4. Real-Time Sensitivity Calibration
- Built-in settings flyout allows fine-tuning:
  - **Blowing Sensitivity**: Tailor breath threshold to quiet or noisy room environments.
  - **Game Difficulty**: Adjust seed anchor strength from casual breeze to intense lung workout.
  - **Visual Themes**: Switch between high-contrast exhibition color palettes.

---

## Quick Start

### Method 1: Direct File Launch
Simply double-click or open [index.html](file:///Users/adilkrishna/useless2/index.html) in any modern browser (**Google Chrome**, **Microsoft Edge**, **Safari**, or **Firefox**).

### Method 2: Local Web Server (Recommended)
Running a local web server ensures optimal Web Audio API and microphone permissions:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Node.js / npx
npx serve .
```

Then navigate to:
```
http://localhost:8080
```

### Playing & Experiencing:
1. Click **"Laptop Mic"** in the top navigation bar and allow microphone permissions when prompted.
2. Blow gently towards your microphone to watch the seeds flutter and take flight.
3. Use the mouse to create swirling wind currents or press **Spacebar** to test gusts.
4. Click the **Fullscreen** icon to enter distraction-free exhibition mode.

---

## Technology Stack

- **Graphics & Rendering**: HTML5 Canvas with custom 60 FPS vector rendering and particle physics.
- **Audio Synthesis**: Native Web Audio API (Oscillators, Biquad Filters, Gain Envelopes, Reverb Simulation).
- **Input Processing**: Web Audio AnalyserNode FFT / RMS envelope detection for microphone breath analysis.
- **Styling**: Modern CSS3 Glassmorphism, custom typography (*Plus Jakarta Sans*, *Outfit*), and responsive auto-hiding HUD.
