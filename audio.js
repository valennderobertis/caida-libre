/**
 * audio.js - Motor de Audio Sintetizado Arcade (Web Audio API)
 * Genera todos los efectos de sonido y atmósferas proceduralmente.
 */

class SoundFX {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.windNode = null;
    this.windGain = null;
    this.windFilter = null;
    this.isMuted = false;

    // Secuenciador de Música en Loop
    this.musicPlaying = false;
    this.musicStep = 0;
    this.musicTimer = null;

    // Sonido de Helicóptero Volando
    this.heliGain = null;
    this.heliNodes = [];
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
      this.startAmbientWind();
    } catch (e) {
      console.warn("AudioContext no pudo iniciarse aún:", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Generador de Ruido Rosa/Blanco para viento y explosiones
  createNoiseBuffer(seconds = 1) {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // Viento constante que cambia según la velocidad de caída
  startAmbientWind() {
    if (!this.ctx || this.windNode) return;
    const noiseBuffer = this.createNoiseBuffer(3);
    if (!noiseBuffer) return;

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = noiseBuffer;
    this.windNode.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.windNode.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windNode.start();
  }

  setWindIntensity(factor) {
    if (!this.windGain || !this.windFilter || !this.ctx) return;
    const f = Math.max(0, Math.min(factor, 1));
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.03 + f * 0.09, now, 0.1);
    this.windFilter.frequency.setTargetAtTime(300 + f * 900, now, 0.1);
  }

  // --- SONIDO DE HELICÓPTERO VOLANDO (CINEMÁTICA INICIAL) ---
  startHelicopterSound() {
    if (!this.ctx || this.isMuted) return;
    this.stopHelicopterSound();

    const now = this.ctx.currentTime;
    this.heliNodes = [];

    // Master Gain para el sonido del helicóptero con entrada suave
    this.heliGain = this.ctx.createGain();
    this.heliGain.gain.setValueAtTime(0.01, now);
    this.heliGain.gain.linearRampToValueAtTime(0.38, now + 0.25);
    this.heliGain.connect(this.ctx.destination);

    // 1. Motor / Turbina grave continua (82 Hz con armónicos)
    const engineOsc = this.ctx.createOscillator();
    const engineGain = this.ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(82, now);

    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.setValueAtTime(240, now);

    engineGain.gain.setValueAtTime(0.20, now);
    engineOsc.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(this.heliGain);
    engineOsc.start(now);
    this.heliNodes.push(engineOsc);

    // 2. Rotor Principal: Modulador LFO para el chopeo rítmico de aspas ("chop-chop-chop" a 9.5 Hz)
    const rotorLfo = this.ctx.createOscillator();
    rotorLfo.type = 'sawtooth';
    rotorLfo.frequency.setValueAtTime(9.5, now); // ~9.5 pasadas de aspa por segundo

    const rotorLfoGain = this.ctx.createGain();
    rotorLfoGain.gain.setValueAtTime(0.5, now);
    rotorLfo.connect(rotorLfoGain);

    // Ruido blanco/rosa de aire turbulento cortado por las aspas
    const noiseBuffer = this.createNoiseBuffer(2);
    if (noiseBuffer) {
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.Q.setValueAtTime(3.2, now);
      noiseFilter.frequency.setValueAtTime(450, now);

      const noiseChopGain = this.ctx.createGain();
      noiseChopGain.gain.setValueAtTime(0.5, now);

      rotorLfoGain.connect(noiseChopGain.gain);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseChopGain);
      noiseChopGain.connect(this.heliGain);
      noiseSrc.start(now);
      this.heliNodes.push(noiseSrc);
    }

    // 3. Golpe de presión acústica / "Thump" percusivo grave por cada aspa ("wup-wup-wup")
    const thumpOsc = this.ctx.createOscillator();
    thumpOsc.type = 'triangle';
    thumpOsc.frequency.setValueAtTime(55, now);

    const thumpFilter = this.ctx.createBiquadFilter();
    thumpFilter.type = 'lowpass';
    thumpFilter.frequency.setValueAtTime(130, now);

    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.55, now);

    rotorLfoGain.connect(thumpGain.gain);

    thumpOsc.connect(thumpFilter);
    thumpFilter.connect(thumpGain);
    thumpGain.connect(this.heliGain);

    thumpOsc.start(now);
    rotorLfo.start(now);
    this.heliNodes.push(thumpOsc);
    this.heliNodes.push(rotorLfo);
  }

  stopHelicopterSound(fadeOut = 0.5) {
    if (this.heliGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.heliGain.gain.linearRampToValueAtTime(0.001, now + fadeOut);
      } catch (e) {}
      const nodesToStop = this.heliNodes || [];
      setTimeout(() => {
        nodesToStop.forEach(n => {
          try { n.stop(); n.disconnect(); } catch (e) {}
        });
      }, fadeOut * 1000 + 120);
      this.heliGain = null;
      this.heliNodes = [];
    }
  }

  // Sirena de Alarma Militar (opcional / daños)
  playAlarm() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.linearRampToValueAtTime(1100, now + 0.25);
    osc.frequency.linearRampToValueAtTime(700, now + 0.5);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.45);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  // Sonido de Salto al vacío (Whoosh acelerado)
  playJump() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  // Recolección de Moneda (Chime arcade B5 -> E6)
  playCoin() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);
  }

  // Impacto / Colisión contra obstáculo
  playCrash() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Ruido de impacto
    const noiseBuffer = this.createNoiseBuffer(0.5);
    if (noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }

    // Tono grave bajo
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Explosión para helicópteros / restos en llamas
  playExplosion() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const noiseBuffer = this.createNoiseBuffer(0.7);
    if (noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.65);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.65);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now);
    }
  }

  // Jingle Triunfal de Nivel Superado (Arpegio arcade ascendente)
  playLevelClear() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Notas triunfales: C5, E5, G5, C6, E6
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      const noteTime = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(noteTime);
      osc.stop(noteTime + 0.36);
    });
  }

  // Efecto Glitch Digital de Bucle Temporal (Ruptura de realidad)
  playGlitchEffect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // 1. Ráfagas rápidas de frecuencias erráticas (Stutter digital / Bit-hop)
    const stutterFreqs = [1600, 320, 2200, 480, 1900, 250, 1300, 140, 2400, 180];
    stutterFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
      const t = now + 0.08 + i * 0.05;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.048);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    });

    // 2. Ruido blanco filtrado en barrido (Scanline static glitch)
    const noiseBuffer = this.createNoiseBuffer(0.7);
    if (noiseBuffer) {
      const src = this.ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(7, now + 0.08);
      filter.frequency.setValueAtTime(3200, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.85);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      src.start(now + 0.08);
      src.stop(now + 0.95);
    }

    // 3. Láser y barrido inverso de frecuencia (efecto retroceso temporal)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 1.0);
    osc.frequency.linearRampToValueAtTime(300, now + 1.4);

    gain.gain.setValueAtTime(0.001, now + 0.35);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    const sweepFilter = this.ctx.createBiquadFilter();
    sweepFilter.type = 'bandpass';
    sweepFilter.frequency.setValueAtTime(500, now + 0.35);
    sweepFilter.frequency.exponentialRampToValueAtTime(2600, now + 1.0);

    osc.connect(sweepFilter);
    sweepFilter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now + 0.35);
    osc.stop(now + 1.55);
  }

  // Distorsión Temporal / Bucle (Al tocar el lago)
  playTimeLoopWarp() {
    this.playLevelClear();
    this.playGlitchEffect();
  }

  // Apertura de Paracaídas (Nivel 10)
  playParachute() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Latigazo de tela / Pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);

    // Tono celestial de liberación
    setTimeout(() => {
      this.playVictoryChord();
    }, 250);
  }

  playVictoryChord() {
    if (!this.ctx) return;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major
    const now = this.ctx.currentTime;
    chords.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 1.3);
    });
  }

  // --- SISTEMA DE MÚSICA CHIPTUNE EN LOOP (16 NOTAS) ---
  startMusicLoop(customPattern = null) {
    if (!this.ctx || this.isMuted) return;
    this.stopMusicLoop();

    // Frecuencias en Hz (Pentatónica retro: C5, A4, G4, E4, D4, C4)
    const notes = [523.25, 440.00, 392.00, 329.63, 293.66, 261.63];

    // Cargar patrón personalizado desde localStorage si existe
    let patternGrid = null;
    let bpm = 140;
    if (customPattern) {
      patternGrid = customPattern.grid;
      bpm = customPattern.bpm || 140;
    } else {
      try {
        const saved = localStorage.getItem('caida_libre_custom_music');
        if (saved) {
          const parsed = JSON.parse(saved);
          patternGrid = parsed.grid;
          bpm = parsed.bpm || 140;
        }
      } catch (e) {}
    }

    // Patrón por defecto (16 notas extendido con bajo y desarrollo)
    if (!patternGrid) {
      patternGrid = [
        [false, false, false, false, false, false, false, true,  false, false, false, false, false, false, false, true],  // C5
        [false, false, false, true,  false, false, false, false, false, false, false, false, false, false, false, false], // A4
        [false, false, false, false, false, false, false, false, false, false, false, true,  false, false, false, false], // G4
        [false, false, false, false, false, false, false, false, false, false, false, false, false, true,  false, false], // E4
        [true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false, true,  false], // D4 (pulso rítmico)
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]  // C4
      ];
    }

    this.musicPlaying = true;
    this.musicStep = 0;
    const totalSteps = patternGrid[0] ? patternGrid[0].length : 16;
    const stepDuration = 60 / bpm / 2; // Pulsos de tiempo equilibrados

    const scheduleNextStep = () => {
      if (!this.musicPlaying || !this.ctx) return;
      const now = this.ctx.currentTime;

      // Reproducir notas activas en el paso actual
      for (let r = 0; r < patternGrid.length; r++) {
        if (patternGrid[r][this.musicStep]) {
          const freq = notes[r];
          const isBass = (r >= 4);

          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = isBass ? 'triangle' : 'square';
          osc.frequency.setValueAtTime(freq, now);

          const dur = isBass ? 0.20 : 0.14;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(isBass ? 0.07 : 0.045, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(isBass ? 700 : 2000, now);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + dur + 0.02);
        }
      }

      this.musicStep = (this.musicStep + 1) % totalSteps;
      this.musicTimer = setTimeout(scheduleNextStep, stepDuration * 1000);
    };

    scheduleNextStep();
  }

  stopMusicLoop() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

window.soundEngine = new SoundFX();
