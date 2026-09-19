/**
 * Lumina Bloom — Unified Input Manager
 * Supports:
 * 1. Automatic Server Hardware Bridge (/api/serial-stream) for Mac USB connection
 * 2. WebSerial API direct browser USB connection
 * 3. Web Audio Laptop Mic breath detection
 * 4. Manual keyboard/touch test controls
 */

class InputManager {
  constructor() {
    this.intensity = 0.0;          // Current normalized blow power (0.0 to 1.0)
    this.rawIntensity = 0.0;       // Target raw value before smoothing
    this.sensitivity = 1.2;        // Moderated sensitivity
    this.isBlowing = false;

    // Hardware Serial state
    this.serialPort = null;
    this.serialReader = null;
    this.isSerialConnected = false;
    this.boardType = 'NANO';       // 'NANO', 'ESP32', etc.
    this.triggerState = 0;         // 0 = LOW/OFF, 1 = HIGH/ON
    this.gpio32State = 0;          // Compatibility alias
    this.detectedPort = null;

    // Server-side Serial SSE bridge
    this.bridgeEventSource = null;
    this.bridgeConnected = false;
    this.lastPacketTime = 0;

    // Web Audio Mic state
    this.isMicActive = false;
    this.audioCtx = null;
    this.micStream = null;
    this.analyser = null;
    this.micDataArray = null;

    // Manual test state
    this.isManualBlowing = false;

    // Gesture wind state
    this.gestureIntensity = 0.0;

    // DOM References
    this.elIntensityBar = document.getElementById('intensity-bar');
    this.elIntensityText = document.getElementById('intensity-text');
    this.elBoardCard = document.getElementById('esp32-status-card');
    this.elBoardLabel = document.getElementById('board-label');
    this.elBoardStateText = document.getElementById('esp32-state-text');
    this.elBtnSerial = document.getElementById('btn-serial');
    this.elBtnSerialText = document.getElementById('btn-serial-text');
    this.elBtnMic = document.getElementById('btn-mic');
    this.elBtnMicText = document.getElementById('btn-mic-text');
    this.elInteractionHint = document.getElementById('interaction-hint');

    this.setupManualListeners();
    this.initAutoSerial();
    this.connectServerBridge();
  }

  isLocalHost() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]'
    );
  }

  addGestureWind(amount) {
    this.gestureIntensity = Math.min(1.0, Math.max(this.gestureIntensity, amount));
    this.hideHint();
  }

  /**
   * Spacebar and touch/mouse listeners
   */
  setupManualListeners() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat) {
        this.isManualBlowing = true;
        this.hideHint();
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isManualBlowing = false;
      }
    });

    const manualBtn = document.getElementById('btn-manual-blow');
    if (manualBtn) {
      manualBtn.addEventListener('mousedown', () => {
        this.isManualBlowing = true;
        this.hideHint();
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      });
      window.addEventListener('mouseup', () => {
        this.isManualBlowing = false;
      });
      manualBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.isManualBlowing = true;
        this.hideHint();
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      }, { passive: false });
      window.addEventListener('touchend', () => {
        this.isManualBlowing = false;
      });
    }
  }

  hideHint() {
    if (this.elInteractionHint && !this.elInteractionHint.classList.contains('fade-out')) {
      this.elInteractionHint.classList.add('fade-out');
    }
  }

  /**
   * =========================================================================
   * Automatic Server-Side Bridge via Server-Sent Events (/api/serial-stream)
   * Connects automatically when running on localhost:8080!
   * =========================================================================
   */
  connectServerBridge() {
    // Only attempt local python server bridge when running locally
    if (!this.isLocalHost()) {
      // In web hosting (Netlify, etc.), set up default web interactive indicator
      if (!this.serialPort) {
        this.updateSerialUI(false, 'Ready');
        if (this.elBoardLabel) {
          this.elBoardLabel.textContent = 'Web Sensor Mode';
        }
      }
      return;
    }

    try {
      this.bridgeEventSource = new EventSource('/api/serial-stream');

      this.bridgeEventSource.onopen = () => {
        // Connected to local SSE bridge
      };

      this.bridgeEventSource.onmessage = (event) => {
        if (!event.data) return;
        this.parseSerialLine(event.data.trim(), true);
      };

      this.bridgeEventSource.onerror = () => {
        if (this.bridgeEventSource) {
          this.bridgeEventSource.close();
          this.bridgeEventSource = null;
        }
        if (this.bridgeConnected && !this.serialPort) {
          this.bridgeConnected = false;
          this.isSerialConnected = false;
          this.updateSerialUI(false, 'Disconnected');
        }
      };
    } catch (e) {
      console.warn('Server bridge not available, using direct WebSerial fallback.', e);
    }
  }

  /**
   * =========================================================================
   * WebSerial API: Direct USB connection to Arduino Nano / ESP32
   * =========================================================================
   */
  async initAutoSerial() {
    if (!('serial' in navigator)) return;

    // Listen for USB device connection / disconnection
    navigator.serial.addEventListener('connect', async () => {
      console.log('USB device connected');
      this.autoConnectSerial();
    });

    navigator.serial.addEventListener('disconnect', () => {
      console.log('USB device disconnected');
      if (this.serialPort) {
        this.disconnectSerial();
      }
    });

    // Check previously authorized ports
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0 && !this.isSerialConnected) {
        await this.autoConnectSerial(ports[0]);
      }
    } catch (err) {
      // Non-critical
    }
  }

  async autoConnectSerial(port) {
    if (this.isSerialConnected && this.serialPort) return;
    try {
      // Pause python bridge so WebSerial gets exclusive hardware access (only if local)
      if (this.isLocalHost()) {
        await fetch('/api/release-serial').catch(() => {});
      }

      this.serialPort = port || (await navigator.serial.getPorts())[0];
      if (!this.serialPort) return;

      await this.serialPort.open({ baudRate: 115200 });
      this.isSerialConnected = true;
      this.updateSerialUI(true, 'Connected (WebSerial)');
      this.hideHint();
      this.readSerialStream();
    } catch (e) {
      console.warn('Auto-connect serial note:', e);
      // Resume python bridge if WebSerial couldn't claim it
      if (this.isLocalHost()) {
        await fetch('/api/resume-serial').catch(() => {});
      }
    }
  }

  async toggleWebSerial() {
    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    if (this.serialPort && this.isSerialConnected) {
      await this.disconnectSerial();
      if (this.isLocalHost()) {
        await fetch('/api/resume-serial').catch(() => {});
      }
      return;
    }

    if (!('serial' in navigator)) {
      alert('WebSerial is supported on desktop Google Chrome, Microsoft Edge, and Opera.\nFor mobile or wireless devices, swipe across the screen or use Breath Microphone to interact!');
      return;
    }

    try {
      // Tell backend server to release serial port so browser WebSerial has exclusive access
      if (this.isLocalHost()) {
        await fetch('/api/release-serial').catch(() => {});
      }

      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 115200 });

      this.isSerialConnected = true;
      this.updateSerialUI(true, 'Connected (115200)');
      this.hideHint();

      this.readSerialStream();
    } catch (err) {
      console.error('Serial connection error:', err);
      // Resume server bridge if browser connection wasn't established
      if (this.isLocalHost()) {
        await fetch('/api/resume-serial').catch(() => {});
      }
      if (!this.bridgeConnected) {
        this.updateSerialUI(false, this.isLocalHost() ? 'Failed to connect' : 'Ready');
      }
    }
  }

  async disconnectSerial() {
    try {
      if (this.serialReader) {
        await this.serialReader.cancel();
        this.serialReader = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
    } catch (e) {
      console.warn('Error during serial port close:', e);
    }
    this.isSerialConnected = false;
    this.triggerState = 0;
    this.gpio32State = 0;
    this.updateSerialUI(false, this.isLocalHost() ? 'Disconnected' : 'Ready');
  }

  updateSerialUI(connected, label) {
    if (this.elBtnSerialText) {
      this.elBtnSerialText.textContent = connected ? 'Disconnect' : 'Connect Arduino';
    }
    if (this.elBoardCard) {
      this.elBoardCard.classList.toggle('connected', connected);
    }
    if (this.elBoardStateText) {
      this.elBoardStateText.textContent = label;
    }
  }

  async readSerialStream() {
    let textDecoder;
    try {
      textDecoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(textDecoder.writable).catch(() => {});
      this.serialReader = textDecoder.readable.getReader();

      let buffer = '';
      while (true) {
        const { value, done } = await this.serialReader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete tail

        for (const line of lines) {
          this.parseSerialLine(line.trim(), false);
        }
      }
    } catch (err) {
      console.warn('Serial reader exited:', err);
    } finally {
      this.updateSerialUI(false, 'Disconnected');
    }
  }

  /**
   * Parses Arduino Nano & ESP32 Serial output.
   * Resilient to noise, leading semicolons, and missing fields.
   * Supports:
   * - JSON: {"blow":1,"power":850,"gpio4":1}, {"gpio32":1}, {"trigger":1}, etc.
   * - Key-Value: "BLOW:0.85,TRIG:1", "BLOW:1,G32:1"
   */
  parseSerialLine(line, isFromBridge = false) {
    if (!line) return;

    try {
      // Check for bridge status packets
      if (line.includes('_bridge_status')) {
        try {
          const statusData = JSON.parse(line);
          if (statusData._bridge_status === 'connected') {
            this.bridgeConnected = true;
            this.isSerialConnected = true;
            this.detectedPort = statusData.port ? statusData.port.split('/').pop() : 'USB';
            this.updateSerialUI(true, `Connected (${this.detectedPort})`);
            this.hideHint();
          } else if (statusData._bridge_status === 'searching') {
            if (!this.serialPort) {
              this.updateSerialUI(false, 'Searching hardware...');
            }
          }
          return;
        } catch (_) {}
      }

      // Extract JSON object if present anywhere in the string
      const jsonMatch = line.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        // If packets are flowing from bridge and WebSerial isn't connected, mark as connected
        if (isFromBridge && !this.serialPort) {
          if (!this.isSerialConnected) {
            this.isSerialConnected = true;
            this.bridgeConnected = true;
            const portName = this.detectedPort || 'USB Serial';
            this.updateSerialUI(true, `Connected (${portName})`);
            this.hideHint();
          }
          this.lastPacketTime = Date.now();
        }

        // Detect board / pin layout
        if (data.board) {
          this.boardType = data.board.toUpperCase();
          if (this.elBoardLabel) {
            this.elBoardLabel.textContent = this.boardType === 'NANO' ? 'Arduino Nano (A0 / D2)' : 'ESP32 Controller';
          }
        } else if (data.gpio4 !== undefined) {
          this.boardType = 'ESP32 (GPIO 4)';
          if (this.elBoardLabel) this.elBoardLabel.textContent = 'ESP32 (Pin 4)';
        } else if (data.gpio32 !== undefined) {
          this.boardType = 'ESP32 (GPIO 32)';
          if (this.elBoardLabel) this.elBoardLabel.textContent = 'ESP32 (GPIO 32)';
        }

        // Determine trigger state from any compatible pin / flag
        const rawTrigger = data.trigger ?? data.gpio4 ?? data.gpio32 ?? data.gpio ?? data.d2 ?? data.digital ?? data.pin;
        if (rawTrigger !== undefined) {
          this.triggerState = (rawTrigger == 1 || rawTrigger === true || rawTrigger === '1') ? 1 : 0;
          this.gpio32State = this.triggerState;
        }

        // Determine max range: 1023 for 10-bit Arduino, 4095 for 12-bit ESP32
        const maxRange = data.maxRange || (data.power !== undefined && data.power > 1023 ? 4095 : 1023);

        const isBlow = (data.blow == 1 || data.blow === true || data.blow === '1' || this.triggerState === 1);

        if (data.power !== undefined && data.power > 0) {
          this.rawIntensity = Math.min(1.0, (data.power / maxRange) * this.sensitivity);
          // If blow flag is also active, guarantee strong response
          if (isBlow && this.rawIntensity < 0.6) {
            this.rawIntensity = 0.85;
          }
        } else if (isBlow) {
          this.rawIntensity = 0.90 * this.sensitivity;
        } else {
          this.rawIntensity = 0.0;
        }

        if (this.triggerState === 1 && this.rawIntensity < 0.4) {
          this.rawIntensity = 0.85;
        }
      } else if (line.includes('BLOW:') || line.includes('G32:') || line.includes('TRIG:') || line.includes('PWR:')) {
        const parts = line.split(',');
        for (const part of parts) {
          const [k, v] = part.split(':');
          if (!k || !v) continue;
          const key = k.trim().toUpperCase();
          const val = v.trim();
          if (key === 'G32' || key === 'TRIG' || key === 'D2' || key === 'A0' || key === 'GPIO4') {
            this.triggerState = parseInt(val) || 0;
            this.gpio32State = this.triggerState;
          }
          if (key === 'BLOW') {
            const bVal = parseFloat(val) || 0;
            this.rawIntensity = bVal * this.sensitivity;
          }
          if (key === 'PWR') {
            const powerVal = parseInt(val) || 0;
            const maxRange = powerVal > 1023 ? 4095 : 1023;
            if (powerVal > 0) {
              this.rawIntensity = Math.min(1.0, (powerVal / maxRange) * this.sensitivity);
            }
          }
        }
        if (this.triggerState === 1 && this.rawIntensity < 0.4) {
          this.rawIntensity = 0.85;
        }
      }

      // Visual feedback on hardware trigger state
      if (this.elBoardCard) {
        this.elBoardCard.classList.toggle('active-trigger', this.triggerState === 1 || this.rawIntensity > 0.3);
        if (this.elBoardStateText) {
          const pinName = this.boardType.includes('4') ? 'GPIO 4' : (this.boardType.includes('32') ? 'GPIO 32' : 'Pin A0/D2');
          const statusDesc = (this.triggerState === 1 || this.rawIntensity > 0.3) ? `${pinName}: HIGH (Blowing)` : `${pinName}: LOW (Idle)`;
          this.elBoardStateText.textContent = statusDesc;
        }
      }
    } catch (e) {
      // Skip non-critical malformed lines
    }
  }

  /**
   * =========================================================================
   * Web Audio API: Laptop/USB Microphone breath detection fallback
   * =========================================================================
   */
  async toggleMicrophone() {
    if (window.soundEngine) {
      window.soundEngine.init();
      window.soundEngine.resume();
    }

    if (this.isMicActive) {
      this.stopMicrophone();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      const source = this.audioCtx.createMediaStreamSource(stream);

      // Bandpass filter to isolate breath noise (100Hz - 1000Hz) from background voice
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      filter.Q.setValueAtTime(0.8, this.audioCtx.currentTime);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.4;
      this.micDataArray = new Uint8Array(this.analyser.frequencyBinCount);

      source.connect(filter);
      filter.connect(this.analyser);

      this.isMicActive = true;
      if (this.elBtnMic) this.elBtnMic.classList.add('active');
      if (this.elBtnMicText) this.elBtnMicText.textContent = 'Mute Mic';
      this.hideHint();
    } catch (err) {
      console.error('Microphone access denied or failed:', err);
      alert('Microphone access was denied or not supported. You can still swipe on the screen or drag with mouse to blow seeds!');
    }
  }

  stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.isMicActive = false;
    if (this.elBtnMic) this.elBtnMic.classList.remove('active');
    if (this.elBtnMicText) this.elBtnMicText.textContent = 'Breath (Mic)';
  }

  sampleMicIntensity() {
    if (!this.isMicActive || !this.analyser) return 0;

    this.analyser.getByteFrequencyData(this.micDataArray);

    let sum = 0;
    const len = this.micDataArray.length;
    for (let i = 0; i < len; i++) {
      sum += this.micDataArray[i];
    }
    const avg = sum / len;

    const threshold = 16;
    if (avg < threshold) return 0;

    const normalized = (avg - threshold) / (65 - threshold);
    return Math.min(1.0, Math.max(0.0, normalized)) * this.sensitivity;
  }

  /**
   * Main per-frame update called by the dandelion simulation loop
   */
  update(deltaTime) {
    let target = 0.0;

    // 1. Hardware serial data (Arduino Nano / ESP32 via Bridge or WebSerial)
    if (this.isSerialConnected) {
      target = Math.max(target, this.rawIntensity);
      // Natural decay for serial readings between packets
      this.rawIntensity *= 0.92;
    }

    // 2. Microphone stream
    if (this.isMicActive) {
      const micPower = this.sampleMicIntensity();
      target = Math.max(target, micPower);
    }

    // 3. Manual keyboard/mouse test
    if (this.isManualBlowing) {
      target = Math.max(target, 0.95);
    }

    // 4. Touch & Mouse gesture wind
    if (this.gestureIntensity > 0.01) {
      target = Math.max(target, this.gestureIntensity);
      this.gestureIntensity *= 0.88;
    } else {
      this.gestureIntensity = 0;
    }

    // Smooth physics interpolation
    const attackSpeed = 0.55;
    const releaseSpeed = 0.12;
    const speed = target > this.intensity ? attackSpeed : releaseSpeed;

    this.intensity += (target - this.intensity) * speed;
    if (this.intensity < 0.005) this.intensity = 0;

    this.isBlowing = this.intensity > 0.04;

    // Update UI meter
    if (this.elIntensityBar) {
      const pct = Math.min(100, Math.round(this.intensity * 100));
      this.elIntensityBar.style.width = `${pct}%`;
      if (this.elIntensityText) {
        this.elIntensityText.textContent = `${pct}%`;
      }
    }

    // Update soundscape wind
    if (window.soundEngine) {
      window.soundEngine.updateWind(this.intensity);
    }

    return this.intensity;
  }

  getIntensity() {
    return this.intensity;
  }
}

window.inputManager = new InputManager();
