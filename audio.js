/**
 * Lumina Bloom — Procedural Soundscape Engine
 * Generates organic ambient breeze, breath whoosh, and ethereal chimes
 * using Web Audio API synthesis (no external assets required).
 */

class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Master Gain
    this.masterGain = null;

    // Ambient Breeze Nodes
    this.ambientGain = null;
    this.ambientFilter = null;
    this.ambientNoise = null;

    // Breath Gust Nodes
    this.gustGain = null;
    this.gustFilter = null;

    // Chime Pentatonic Scale Frequencies (Ethereal Garden Scale: D Major Pentatonic / Lydian)
    this.chimeScale = [
      293.66, // D4
      329.63, // E4
      369.99, // F#4
      440.00, // A4
      493.88, // B4
      587.33, // D5
      659.25, // E5
      739.99, // F#5
      880.00, // A5
      987.77, // B5
      1174.66 // D6
    ];

    this.lastChimeTime = 0;
  }

  /**
   * Initializes Web Audio Context on first user interaction
   */
  init() {
    if (this.isInitialized) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbientBreeze();
      this.setupGustNoise();

      this.isInitialized = true;
      console.log('✨ Procedural Soundscape Initialized');
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Continuous procedural ambient wind / garden rustle
   */
  setupAmbientBreeze() {
    // Generate pink noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    this.ambientNoise = this.ctx.createBufferSource();
    this.ambientNoise.buffer = noiseBuffer;
    this.ambientNoise.loop = true;

    // Ambient resonant low-pass filter
    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'lowpass';
    this.ambientFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.ambientFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    // LFO to modulate filter frequency slowly (ambient breathing effect)
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime); // 0.18 Hz slow swell
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.ambientFilter.frequency);
    lfo.start();

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    this.ambientNoise.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    this.ambientNoise.start();
  }

  /**
   * Dynamic breath wind whoosh when blowing
   */
  setupGustNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }

    const gustSource = this.ctx.createBufferSource();
    gustSource.buffer = noiseBuffer;
    gustSource.loop = true;

    this.gustFilter = this.ctx.createBiquadFilter();
    this.gustFilter.type = 'bandpass';
    this.gustFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.gustFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.gustGain = this.ctx.createGain();
    this.gustGain.gain.setValueAtTime(0, this.ctx.currentTime);

    gustSource.connect(this.gustFilter);
    this.gustFilter.connect(this.gustGain);
    this.gustGain.connect(this.masterGain);

    gustSource.start();
  }

  /**
   * Updates wind sound in real-time based on blowing intensity (0.0 to 1.0)
   */
  updateWind(intensity) {
    if (!this.isInitialized || this.isMuted) return;

    const targetGain = Math.min(0.5, intensity * 0.5);
    const targetFreq = 300 + intensity * 900;

    const now = this.ctx.currentTime;
    this.gustGain.gain.setTargetAtTime(targetGain, now, 0.08);
    this.gustFilter.frequency.setTargetAtTime(targetFreq, now, 0.08);
  }

  /**
   * Plays a celestial crystal bell tone when seeds detach from the dandelion
   */
  playSeedReleaseChime(pitchMultiplier = 1.0) {
    if (!this.isInitialized || this.isMuted) return;

    const now = performance.now();
    // Throttle chimes so they don't overpower
    if (now - this.lastChimeTime < 45) return;
    this.lastChimeTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Random note from scale
    const baseFreq = this.chimeScale[Math.floor(Math.random() * this.chimeScale.length)];
    const finalFreq = baseFreq * pitchMultiplier;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(finalFreq, t);

    // Ethereal bell envelope (sharp attack, slow shimmer decay)
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.3);
  }

  /**
   * Triumphant harmonic arpeggio when a full dandelion head is cleared!
   */
  playFlowerClearedChime() {
    if (!this.isInitialized || this.isMuted) return;

    const notes = [587.33, 739.99, 880.00, 1174.66]; // D5, F#5, A5, D6 triumphant chord
    const baseTime = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const t = baseTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 1.7);
    });
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.1);
    }
    return this.isMuted;
  }
}

window.soundEngine = new SoundscapeEngine();
