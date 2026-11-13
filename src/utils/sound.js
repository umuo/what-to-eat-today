const MUTE_KEY = 'wte_sound_muted';

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  ensureCtx() {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted() {
    return this.muted;
  }

  setMuted(val) {
    this.muted = Boolean(val);
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  playTone(freq, duration = 0.06, type = 'triangle', volume = 0.14, delay = 0) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playTick(pitchFactor = 1) {
    this.playTone(620 * pitchFactor, 0.045, 'triangle', 0.12);
  }

  playLever() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.16);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playReelStop(step = 0) {
    const notes = [440, 554.37, 659.25];
    this.playTone(notes[step % notes.length], 0.12, 'sine', 0.16);
  }

  playDiceRoll() {
    [0, 0.07, 0.15, 0.24, 0.35].forEach((delay, idx) => {
      this.playTone(380 + idx * 45, 0.04, 'square', 0.07, delay);
    });
  }

  playKnobTurn() {
    [0, 0.09, 0.18, 0.27, 0.36].forEach((delay, idx) => {
      this.playTone(300 + idx * 35, 0.04, 'triangle', 0.1, delay);
    });
  }

  playCapsulePop() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  playWinFanfare() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, idx) => {
      this.playTone(freq, 0.28, 'triangle', 0.16, idx * 0.08);
    });
  }
}

export const soundEngine = new SoundEngine();
