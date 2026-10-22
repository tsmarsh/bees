// A little swing combo made of oscillators: walking bass, brushed hats, piano stabs on two and four, and cartoon
// punctuation for what happens in the garden. Every sound has a visual twin; nothing needs to be heard to be played.
// The music clock is shared with the tank's rhythm game, so notes and beats land together.

const BPM = 104;
const BEAT = 60 / BPM;
const SWING = 2 / 3;
// ii-V-I-VI in C, a bar each: chord roots and tones (semitones above C3).
const BARS = [
  { root: 2, tones: [2, 5, 9, 12] },     // Dm7
  { root: 7, tones: [7, 11, 14, 17] },   // G7
  { root: 0, tones: [0, 4, 7, 11] },     // Cmaj7
  { root: 9, tones: [9, 13, 16, 19] },   // A7
];
const C3 = 130.81;
const hz = (semi) => C3 * Math.pow(2, semi / 12);

export class Audio {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.playing = false;
    this.t0 = 0;
    this.perf0 = performance.now() / 1000;
    this.intensity = 0.5;
  }

  get beat() { return BEAT; }

  ensure() {
    if (this.ctx || !this.enabled) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    this.music = this.ctx.createGain();
    this.music.gain.value = 0.5;
    this.music.connect(this.master);
    this.noise = this.makeNoise();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on && this.ctx) { this.ctx.close(); this.ctx = null; this.playing = false; }
  }

  // Seconds on the music clock: the audio clock when there is one (minus its output latency), else the page clock.
  now() {
    if (this.ctx && this.playing) {
      const lat = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
      return this.ctx.currentTime - this.t0 - lat;
    }
    return performance.now() / 1000 - this.perf0;
  }

  start() {
    this.ensure();
    this.perf0 = performance.now() / 1000;
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") this.ctx.resume();
    this.playing = true;
    this.t0 = this.ctx.currentTime + 0.05;
    this.nextBeat = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    clearInterval(this.timer);
    this.playing = false;
    this.perf0 = performance.now() / 1000;
  }

  // The music clock stops while paused, with or without sound, so no note is missed during a breather.
  pause() {
    this.pausedAt = performance.now() / 1000;
    if (this.ctx && this.ctx.state === "running") this.ctx.suspend();
    clearInterval(this.timer);
  }

  resume() {
    if (this.pausedAt) { this.perf0 += performance.now() / 1000 - this.pausedAt; this.pausedAt = 0; }
    if (this.ctx) { this.ctx.resume(); if (this.playing) this.timer = setInterval(() => this.schedule(), 25); }
  }

  schedule() {
    if (!this.ctx || !this.playing) return;
    const ahead = this.ctx.currentTime - this.t0 + 0.12;
    while (this.nextBeat * BEAT < ahead) {
      this.playBeat(this.nextBeat, this.t0 + this.nextBeat * BEAT);
      this.nextBeat++;
    }
  }

  playBeat(n, at) {
    const bar = BARS[Math.floor(n / 4) % BARS.length];
    const inBar = n % 4;
    // walking bass: root on one, then chord tones and a chromatic approach
    const next = BARS[(Math.floor(n / 4) + 1) % BARS.length];
    const walk = [bar.root, bar.tones[1], bar.tones[2], next.root + (inBar === 3 ? 1 : 0)];
    this.pluck(hz(walk[inBar] - 12), at, BEAT * 0.9, 0.42, "triangle", this.music);
    // brushes: every beat, plus the swung upbeat
    this.brush(at, 0.07 + (inBar % 2) * 0.05);
    this.brush(at + BEAT * SWING, 0.035 + this.intensity * 0.03);
    // piano stabs on two and four
    if (inBar === 1 || inBar === 3) {
      for (const t of bar.tones) this.pluck(hz(t + 12), at + (inBar === 3 && this.intensity > 0.7 ? BEAT * SWING : 0), 0.18, 0.07, "triangle", this.music);
    }
    // a clarinet-ish line when the flower is bubbly
    if (this.intensity > 0.75 && (n % 2 === 0)) {
      const t = bar.tones[(n / 2) % 4];
      this.pluck(hz(t + 24), at, BEAT * 0.8, 0.05, "square", this.music, 1800);
    }
  }

  setIntensity(k) { this.intensity = k; }

  makeNoise() {
    const len = this.ctx.sampleRate * 0.5;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  pluck(freq, at, dur, gain, type = "triangle", dest = this.master, cutoff = 4000) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
    o.connect(f).connect(g).connect(dest);
    o.start(at);
    o.stop(at + dur + 0.05);
  }

  brush(at, gain) {
    if (!this.ctx) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0005, at + 0.09);
    s.connect(f).connect(g).connect(this.music);
    s.start(at, Math.random() * 0.3, 0.12);
  }

  // ---- punctuation
  sfx(name, k = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case "perfect": this.pluck(1046, t, 0.12, 0.18, "sine"); this.pluck(1568, t + 0.04, 0.16, 0.12, "sine"); break;
      case "good": this.pluck(784, t, 0.12, 0.16, "sine"); break;
      case "miss": this.pluck(196, t, 0.14, 0.08, "sine"); break;
      case "collect": this.pluck(880 * Math.pow(2, Math.min(12, k) / 24), t, 0.1, 0.12, "sine"); break;
      case "rich": [0, 4, 7].forEach((s, i) => this.pluck(880 * Math.pow(2, s / 12), t + i * 0.04, 0.12, 0.12, "sine")); break;
      case "turn": this.pluck(330, t, 0.05, 0.05, "triangle"); break;
      case "launch": this.slide(220, 520, t, 0.18, 0.12); break;
      case "splat": this.squish(t); this.pluck(1318, t + 0.03, 0.25, 0.1, "sine"); break;
      case "splash": this.squish(t, 0.6); break;
      case "thud": this.pluck(110, t, 0.12, 0.12, "sine"); break;
      case "sneeze": this.sneeze(t); break;
      case "slip": this.slide(660, 180, t, 0.35, 0.12); break;
      case "home": [0, 4, 7, 12].forEach((s, i) => this.pluck(523 * Math.pow(2, s / 12), t + i * 0.07, 0.2, 0.1, "triangle")); break;
      case "fanfare": [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.pluck(392 * Math.pow(2, s / 12), t + i * 0.06, 0.3, 0.1, "square", this.master, 2500)); break;
      case "cloud": [12, 7, 4, 0].forEach((s, i) => this.pluck(523 * Math.pow(2, s / 12), t + i * 0.05, 0.4, 0.08, "sine")); break;
      case "highfive": this.squish(t, 0.4); [0, 7, 12].forEach((s, i) => this.pluck(659 * Math.pow(2, s / 12), t + 0.05 + i * 0.05, 0.3, 0.12, "triangle")); break;
      default: break;
    }
  }

  slide(from, to, at, dur, gain) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(from, at);
    o.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  squish(at, gain = 0.25) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(900, at);
    f.frequency.exponentialRampToValueAtTime(240, at + 0.15);
    f.Q.value = 3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
    s.connect(f).connect(g).connect(this.master);
    s.start(at, 0, 0.2);
  }

  sneeze(at) {
    // "ah... ah..." rising, then a filtered noise "CHOO"
    this.slide(300, 520, at, 0.25, 0.06);
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.setValueAtTime(2400, at + 0.28);
    f.frequency.exponentialRampToValueAtTime(500, at + 0.5);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.setValueAtTime(0.3, at + 0.28);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
    s.connect(f).connect(g).connect(this.master);
    s.start(at, 0, 0.6);
  }
}

export function buzz(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* no haptics here */ }
}
