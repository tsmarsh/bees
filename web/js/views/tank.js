// The tank's game: perform for Sunny. Notes bloom around the stage in time with the band; tap as the ring closes,
// hold through the long ones, follow the slides. Every move lands on the shared encounter as affection, and the
// flower's attention is what keeps the foragers' paths wide. The honey band on each note is your timing window:
// it widens when the healer's salves land and narrows as pollen gets to you.
import * as ink from "../draw/ink.js";
import { E, F, STATUS, PHASE, TANK_KIND } from "../sim/layout.js";
import { buzz } from "../game/audio.js";

const APPROACH_BEATS = 1.7;
const LEAD_IN_BEATS = 4;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Phrases: a bar of moves. kind tap | hold | slide; at (beat in bar); len (beats) for holds and slides.
const PHRASES = {
  calm: [
    [{ kind: "tap", at: 0 }, { kind: "tap", at: 1 }, { kind: "tap", at: 2 }, { kind: "tap", at: 3 }],
    [{ kind: "tap", at: 0 }, { kind: "tap", at: 1 }, { kind: "hold", at: 2, len: 1.5 }],
    [{ kind: "slide", at: 0, len: 2 }, { kind: "tap", at: 2.5 }, { kind: "tap", at: 3 }],
    [{ kind: "tap", at: 0 }, { kind: "tap", at: 1.5 }, { kind: "tap", at: 2 }, { kind: "tap", at: 3 }],
  ],
  bubbly: [
    [{ kind: "tap", at: 0 }, { kind: "tap", at: 0.5 }, { kind: "tap", at: 1 }, { kind: "tap", at: 2 }, { kind: "tap", at: 2.5 }, { kind: "tap", at: 3 }],
    [{ kind: "slide", at: 0, len: 1.5 }, { kind: "tap", at: 2 }, { kind: "slide", at: 2.5, len: 1 }],
    [{ kind: "tap", at: 0 }, { kind: "tap", at: 0.5 }, { kind: "hold", at: 1, len: 1 }, { kind: "tap", at: 2.5 }, { kind: "tap", at: 3 }, { kind: "tap", at: 3.5 }],
  ],
  sleepy: [
    [{ kind: "hold", at: 0, len: 2.5 }, { kind: "tap", at: 3 }],
    [{ kind: "tap", at: 0 }, { kind: "hold", at: 1, len: 2.5 }],
  ],
  steady: [
    [{ kind: "hold", at: 0, len: 2.5, steady: true }, { kind: "tap", at: 3 }],
  ],
};

export class TankView {
  constructor({ canvas, sim, audio, hudRoot }) {
    this.canvas = canvas;
    this.sim = sim;
    this.audio = audio;
    this.slot = 0;
    this.label = "Tank game. Perform for Sunny in time with the music.";
    this.help = "Tap or click each circle as its ring closes. Hold the long ones, and follow the slides. Space, J, K, D and F also play notes.";
    this.rand = rng(sim.enc("rng") + 11);
    this.t = 0;
    this.notes = [];
    this.nextBar = 1;
    this.pos = { x: 0.5, y: 0.6 };
    this.particles = new ink.Particles();
    this.popups = [];
    this.bestCombo = 0;
    this.combo = 0;
    this.pressed = null;   // { x, y, key } while a finger, button or key is down
    this.dance = { kind: "idle", t: 0 };
    this.lean = 0;
    this.blink = 0;
    this.haze = [];
    this.resting = false;
    const box = canvas.getBoundingClientRect();
    this.w = box.width || 1;
    this.h = box.height || 1;
    this.auto = false;
    this.buildHud(hudRoot);

    this.onDown = (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      this.audio.ensure();
      this.press(e.offsetX, e.offsetY, false);
    };
    this.onMove = (e) => { if (this.pressed && !this.pressed.key) { this.pressed.x = e.offsetX; this.pressed.y = e.offsetY; } };
    this.onUp = (e) => { if (this.pressed && !this.pressed.key) this.release(); };
    this.onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest("button, dialog")) return;
      if ([" ", "j", "k", "d", "f", "J", "K", "D", "F", "Enter"].includes(e.key)) { e.preventDefault(); this.press(0, 0, true); }
    };
    this.onKeyUp = (e) => { if (this.pressed?.key && [" ", "j", "k", "d", "f", "J", "K", "D", "F", "Enter"].includes(e.key)) this.release(); };
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKeyUp);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  buildHud(root) {
    root.innerHTML = `
      <span class="meter-label">Sunny's delight <span class="meter" role="meter" aria-label="Sunny's delight" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><span></span></span></span>
      <span class="meter-label" id="tank-paths">Foragers' paths: wide</span>
      <span class="spacer"></span>
      <span class="meter-label" id="tank-combo">Streak 0</span>`;
    this.delightBar = root.querySelector(".meter span");
    this.delightMeter = root.querySelector(".meter");
    this.pathsLabel = root.querySelector("#tank-paths");
    this.comboLabel = root.querySelector("#tank-combo");
  }

  // ---------------------------------------------------------------- time and charting
  get beatLen() { return this.sim.konst("beatInterval"); }
  now() { return this.audio.now(); }
  beatNow() { return this.now() / this.beatLen; }
  window() { return this.sim.enc("window"); }

  chartBar(bar) {
    const phase = this.sim.enc("phase");
    const affection = this.sim.flower("affection");
    let set = phase === PHASE.bubbly ? PHRASES.bubbly : phase === PHASE.sleepy ? PHRASES.sleepy : PHRASES.calm;
    if (phase === PHASE.finale) set = this.rand() < 0.5 ? PHRASES.bubbly : PHRASES.calm;
    // the stabilising routine: when attention is slipping, offer a big forgiving hold to win her back
    if (affection < 32) set = PHRASES.steady;
    const phrase = set[Math.floor(this.rand() * set.length)];
    let n = 1;
    for (const m of phrase) {
      const step = m.kind === "tap" ? 0.2 : 0.26;
      const a = this.rand() * Math.PI * 2;
      this.pos = {
        x: clamp(this.pos.x + Math.cos(a) * step, 0.14, 0.86),
        y: clamp(this.pos.y + Math.sin(a) * step * 0.8, 0.5, 0.88),
      };
      const note = { kind: m.kind, beat: bar * 4 + m.at, len: m.len || 0, x: this.pos.x, y: this.pos.y, n: n++, steady: !!m.steady, state: "waiting", held: 0, follow: 0 };
      if (m.kind === "slide") {
        const b = this.rand() * Math.PI * 2;
        const ex = clamp(note.x + Math.cos(b) * 0.3, 0.14, 0.86);
        const ey = clamp(note.y + Math.sin(b) * 0.22, 0.5, 0.9);
        note.path = [{ x: note.x, y: note.y }, { x: (note.x + ex) / 2 + (this.rand() - 0.5) * 0.25, y: Math.min(note.y, ey) - 0.08 }, { x: ex, y: ey }];
        this.pos = { x: ex, y: ey };
      }
      this.notes.push(note);
    }
    // a streak long enough earns the showstopper: a golden star after the phrase
    if (this.combo + phrase.length >= this.sim.konst("showstopperCombo") && !this.notes.some((x) => x.kind === "star" && x.state === "waiting")) {
      this.notes.push({ kind: "star", beat: bar * 4 + 4 - 0.01, len: 0, x: 0.5, y: 0.7, n: "★", state: "waiting" });
    }
  }

  // ---------------------------------------------------------------- input
  hitRadius() { return Math.min(this.w, this.h) * 0.085; }
  notePos(note) { return { x: note.x * this.w, y: note.y * this.h }; }

  press(x, y, key) {
    if (this.resting || this.sim.enc("ended")) return;
    this.pressed = { x, y, key };
    const t = this.now();
    const win = this.window();
    const r = this.hitRadius();
    // the earliest note still waiting whose time is close and (for a finger) whose circle is under it
    const candidates = this.notes.filter((n) => n.state === "waiting" && Math.abs(t - n.beat * this.beatLen) <= win * (n.steady ? 1.6 : 1) * 1.25);
    candidates.sort((a, b) => a.beat - b.beat);
    const note = candidates.find((n) => key || dist(this.notePos(n), { x, y }) <= r * 1.6);
    if (!note) return;
    const err = Math.abs(t - note.beat * this.beatLen);
    const w = win * (note.steady ? 1.6 : 1);
    const quality = err <= w * 0.45 ? 1 : err <= w ? 0.6 : 0.3;
    if (note.kind === "tap" || note.kind === "star") {
      note.state = "hit";
      this.land(note, note.kind === "star" ? TANK_KIND.showstopper : TANK_KIND.tap, quality);
    } else {
      note.state = "active";
      note.startQ = quality;
      this.dance = { kind: note.kind === "hold" ? "hug" : "twirl", t: 0 };
      this.audio.sfx(quality >= 1 ? "perfect" : "good");
    }
  }

  release() {
    this.pressed = null;
    for (const n of this.notes) if (n.state === "active") this.finishLong(n, true);
  }

  finishLong(note, early) {
    const lenS = note.len * this.beatLen;
    const frac = note.kind === "hold" ? note.held / lenS : note.follow / lenS;
    const q = early && frac < 0.7 ? 0 : note.startQ * Math.min(1, 0.4 + frac * 0.6);
    note.state = q > 0 ? "hit" : "missed";
    if (q > 0) this.land(note, note.kind === "hold" ? TANK_KIND.hold : TANK_KIND.swirl, q);
    else this.miss(note);
  }

  land(note, kind, quality) {
    this.sim.tankMove(kind, quality);
    this.combo = kind === TANK_KIND.showstopper ? 0 : this.combo + 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const p = this.notePos(note);
    const word = kind === TANK_KIND.showstopper ? "SHOWSTOPPER!" : quality >= 1 ? "Perfect!" : quality >= 0.6 ? "Lovely!" : "Close!";
    this.popups.push({ x: p.x, y: p.y - 30, text: word, t: 0, colour: quality >= 1 ? ink.HONEY : "#fff6dc" });
    this.particles.burst(p.x, p.y, quality >= 1 ? 8 : 4, "sparkle", { speed: 120, life: 0.5, gravity: 0 });
    this.particles.burst(this.flowerX, this.flowerY, quality >= 1 ? 3 : 1, "heart", { speed: 90, life: 1.1, gravity: -40 });
    if (this.dance.kind === "idle" || kind === TANK_KIND.tap) this.dance = { kind: kind === TANK_KIND.showstopper ? "show" : "hop", t: 0 };
    this.audio.sfx(quality >= 1 ? "perfect" : "good");
    buzz(quality >= 1 ? 12 : 6);
  }

  miss(note) {
    this.sim.tankMove(TANK_KIND.tap, 0);
    this.combo = 0;
    const p = this.notePos(note);
    this.popups.push({ x: p.x, y: p.y - 24, text: "whoops", t: 0, colour: "#d8cdb8", small: true });
    this.audio.sfx("miss");
  }

  // ---------------------------------------------------------------- per frame
  update(dt, s) {
    this.t += dt;
    this.particles.update(dt);
    const status = this.sim.bee(this.slot, "status");
    const wasResting = this.resting;
    this.resting = status === STATUS.resting;
    if (this.resting && !wasResting) {
      for (const n of this.notes) if (n.state === "waiting" || n.state === "active") n.state = "faded";
      this.pressed = null;
    }
    const beat = this.beatNow();
    if (!this.resting && !s[E.ended]) {
      while (this.nextBar * 4 < beat + 6) {
        if (this.nextBar * 4 >= LEAD_IN_BEATS && this.nextBar * 4 > beat + APPROACH_BEATS) this.chartBar(this.nextBar);
        this.nextBar++;
      }
    } else {
      this.nextBar = Math.max(this.nextBar, Math.ceil((beat + 2) / 4));
    }

    if (this.auto) this.autoplay();
    const t = this.now();
    const win = this.window();
    for (const n of this.notes) {
      const at = n.beat * this.beatLen;
      if (n.state === "waiting" && t > at + win * (n.steady ? 1.6 : 1) * 1.25) {
        n.state = "missed";
        if (n.kind === "star") { this.popups.push({ x: n.x * this.w, y: n.y * this.h, text: "next time!", t: 0, colour: "#d8cdb8", small: true }); }
        else this.miss(n);
      }
      if (n.state === "active") {
        const held = !!this.pressed;
        if (n.kind === "hold" && held) n.held += dt;
        if (n.kind === "slide" && held) {
          const k = clamp((t - at) / (n.len * this.beatLen), 0, 1);
          const ball = bez(n.path, k);
          const ok = this.pressed.key || dist({ x: ball.x * this.w, y: ball.y * this.h }, this.pressed) < this.hitRadius() * 1.9;
          if (ok) n.follow += dt;
        }
        if (t >= at + n.len * this.beatLen) this.finishLong(n, false);
      }
    }
    this.notes = this.notes.filter((n) => (n.state === "waiting" || n.state === "active") || t - (n.beat + n.len) * this.beatLen < 0.6);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 0.8);
    this.dance.t += dt;
    if (this.dance.t > (this.dance.kind === "show" ? 1.6 : 0.5) && !this.notes.some((n) => n.state === "active")) this.dance = { kind: "idle", t: 0 };
    this.lean += (this.sim.flower("lean") - this.lean) * Math.min(1, dt * 3);
    this.blink = Math.max(0, this.blink - dt);
    if (Math.random() < dt * 0.25) this.blink = 0.12;
    this.updateHaze(dt);
    this.updateHud(s);
  }

  updateHaze(dt) {
    const allergy = this.sim.bee(this.slot, "allergy") / 100;
    const soothed = this.sim.bee(this.slot, "soothed") > 0;
    const want = soothed ? 0 : Math.max(0, Math.round((allergy - 0.4) * 8));
    if (this.haze.length < want && Math.random() < dt * 2) {
      this.haze.push({ x: Math.random() < 0.5 ? -0.1 : 1.1, y: 0.45 + Math.random() * 0.45, vx: 0, r: 0.06 + Math.random() * 0.05, a: 0 });
      this.haze.at(-1).vx = this.haze.at(-1).x < 0 ? 0.04 + Math.random() * 0.04 : -0.04 - Math.random() * 0.04;
    }
    for (const p of this.haze) { p.x += p.vx * dt; p.a = Math.min(1, p.a + dt * 1.5); if (soothed) p.fade = true; if (p.fade) p.a -= dt * 3; }
    this.haze = this.haze.filter((p) => p.x > -0.2 && p.x < 1.2 && p.a > -0.1);
  }

  updateHud(s) {
    const a = Math.round(s[F.affection]);
    const c = s[F.corridor];
    const paths = c > 0.85 ? "wide open" : c > 0.68 ? "comfortable" : "narrow";
    const key = `${a}/${paths}/${this.combo}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.delightBar.style.width = `${a}%`;
    this.delightMeter.setAttribute("aria-valuenow", a);
    this.pathsLabel.textContent = `Foragers' paths: ${paths}`;
    const need = this.sim.konst("showstopperCombo");
    this.comboLabel.textContent = this.combo >= need ? "Showstopper ready! ★" : `Streak ${this.combo}`;
  }

  onEvent(ev) {
    if (ev.kind === "soothed" && ev.slot === this.slot) {
      this.particles.burst(this.beeX || 100, this.beeY || 100, 12, "salve", { speed: 140, life: 0.6 });
      this.popups.push({ x: this.beeX, y: this.beeY - 50, text: "Easier timing!", t: 0, colour: "#bfe3dc" });
    }
    if (ev.kind === "showstopper") {
      this.particles.burst(this.w / 2, 0, 50, "confetti", { speed: 300, spread: Math.PI, dir: Math.PI / 2, life: 2, gravity: 140 });
      this.particles.burst(this.flowerX, this.flowerY, 14, "heart", { speed: 200, life: 1.5, gravity: -30 });
    }
  }

  // For tests and demos: a decent performer who plays every note a touch late and sometimes fluffs one.
  autopilot() { this.auto = true; }

  autoplay() {
    const t = this.now();
    const late = 0.03;
    for (const n of this.notes) {
      if (n.state === "waiting" && t >= n.beat * this.beatLen + late) {
        if (Math.random() < 0.08) { n.autoSkip = true; continue; }
        if (!n.autoSkip && !this.pressed) { this.press(0, 0, true); if (n.kind === "tap" || n.kind === "star") this.release(); }
      }
      if (n.state === "active" && t >= (n.beat + n.len) * this.beatLen - 0.02) this.release();
    }
  }

  stats() { return { streak: this.bestCombo, showstoppers: this.sim.enc("showstoppers") }; }

  // ---------------------------------------------------------------- drawing
  render() {
    const { ctx, w, h } = ink.fitCanvas(this.canvas);
    this.w = w; this.h = h;
    ink.paper(ctx, w, h, "#f5e3bd");
    // the stage: a curtain swag and boards
    this.drawStage(ctx, w, h);

    const R = Math.min(w * 0.2, h * 0.16);
    this.flowerX = w * 0.5;
    this.flowerY = h * 0.22;
    const delight = this.sim.flower("delight");
    const focus = this.sim.flower("focus");
    const worried = this.sim.flower("worried");
    const mood = worried ? "worried" : focus < 0.35 ? "curious" : this.sim.enc("phase") === PHASE.sleepy ? "sleepy" : this.sim.enc("phase") === PHASE.bubbly ? "bubbly" : "happy";
    ink.sunflower(ctx, this.flowerX, this.flowerY, R, {
      t: this.t, lean: this.lean * 0.9, delight, mood, stem: h, blink: this.blink > 0,
      look: focus < 0.35 ? { x: 1, y: 0.2 } : { x: -0.5, y: 0.8 }, hug: this.dance.kind === "hug" ? 0.6 : 0,
    });

    // you, dancing at her feet
    const bx = w * 0.3, by = h * 0.42;
    this.beeX = bx; this.beeY = by;
    const d = this.dance;
    let x = bx, y = by, squash = 0, wave = 0, facing = 1;
    if (d.kind === "hop") { y -= Math.sin(Math.min(1, d.t / 0.3) * Math.PI) * 18; squash = -0.08 * Math.sin(d.t * 20); wave = 1; }
    else if (d.kind === "hug") { x += 14; squash = 0.06 * Math.sin(this.t * 8); wave = 0.8; }
    else if (d.kind === "twirl") { facing = Math.sin(this.t * 14) > 0 ? 1 : -1; y -= 6; wave = 0.6; }
    else if (d.kind === "show") { y -= Math.abs(Math.sin(d.t * 8)) * 26; facing = Math.sin(d.t * 10) > 0 ? 1 : -1; wave = 1; }
    else { y += Math.sin(this.t * (Math.PI * 2) / (this.beatLen * 2)) * 4; squash = 0.04 * Math.sin(this.t * Math.PI * 2 / this.beatLen); }
    const r = Math.min(w, h) * 0.055;
    ink.bee(ctx, x, y, r, {
      role: 0, t: this.t, facing, squash, wave, sneezy: this.sim.bee(this.slot, "allergy") / 100,
      soothed: this.sim.bee(this.slot, "soothed") > 0, resting: this.resting, mouth: d.kind === "idle" ? "smile" : "grin", you: true, look: { x: 1, y: -0.6 },
    });

    this.drawNotes(ctx, w, h);
    for (const p of this.haze) ink.pollenPuff(ctx, p.x * w, p.y * h, p.r * Math.min(w, h), this.t, Math.max(0, p.a) * 0.85);
    this.particles.draw(ctx);
    for (const p of this.popups) ink.label(ctx, p.text, p.x, p.y - p.t * 40, p.small ? 15 : 22, p.colour);
    this.drawGauge(ctx, w, h);

    if (this.resting) {
      ctx.fillStyle = "rgba(243,231,207,0.7)";
      ctx.fillRect(0, 0, w, h);
      ink.label(ctx, `Catching your breath… ${Math.ceil(this.sim.bee(this.slot, "timer"))}`, w / 2, h * 0.6, Math.min(28, w / 16));
      ink.label(ctx, "Sunny will wait for you", w / 2, h * 0.68, Math.min(16, w / 26), "#fff6dc", "center", 600);
    } else if (this.beatNow() < LEAD_IN_BEATS + 1) {
      ink.label(ctx, "Get ready to perform!", w / 2, h * 0.62, Math.min(30, w / 14), ink.HONEY);
    }
    ink.finishPaper(ctx, w, h);
  }

  drawStage(ctx, w, h) {
    ctx.fillStyle = "#e7c88f";
    ctx.fillRect(0, h * 0.47, w, h * 0.53);
    ctx.strokeStyle = "rgba(34,28,22,0.25)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { const y = h * 0.47 + (h * 0.53 * i) / 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = ink.INK;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, h * 0.47); ctx.lineTo(w, h * 0.47); ctx.stroke();
    // curtain swags
    for (const side of [0, 1]) {
      ink.inked(ctx, ink.TOMATO, 3, () => {
        const x0 = side ? w : 0;
        const dir = side ? -1 : 1;
        ctx.moveTo(x0, 0);
        ctx.lineTo(x0 + dir * w * 0.2, 0);
        ctx.quadraticCurveTo(x0 + dir * w * 0.06, h * 0.12, x0 + dir * w * 0.05, h * 0.5);
        ctx.lineTo(x0, h * 0.5);
        ctx.closePath();
      });
    }
  }

  drawNotes(ctx, w, h) {
    const t = this.now();
    const r = this.hitRadius();
    const approach = APPROACH_BEATS * this.beatLen;
    const win = this.window();
    const ordered = [...this.notes].sort((a, b) => b.beat - a.beat);
    for (const n of ordered) {
      const at = n.beat * this.beatLen;
      const until = at - t;
      if (until > approach) continue;
      const p = this.notePos(n);
      const fade = n.state === "hit" || n.state === "missed" || n.state === "faded" ? Math.max(0, 1 - (t - at - (n.len || 0) * this.beatLen) / 0.4) : 1;
      if (fade <= 0) continue;
      ctx.save();
      ctx.globalAlpha = fade * Math.min(1, (approach - until) / 0.25);
      const colour = n.kind === "star" ? "#ffd84a" : n.kind === "hold" ? "#bfe3dc" : n.kind === "slide" ? "#f2c1d8" : "#fff6dc";

      if (n.kind === "slide") {
        ctx.lineCap = "round";
        ctx.strokeStyle = ink.INK;
        ctx.lineWidth = r * 1.15 + 6;
        this.strokeBez(ctx, n.path, w, h);
        ctx.strokeStyle = "#f8dbe8";
        ctx.lineWidth = r * 1.15;
        this.strokeBez(ctx, n.path, w, h);
        const end = n.path[2];
        ink.circle(ctx, end.x * w, end.y * h, r * 0.5, "#f8dbe8", 3);
      }

      // the honey band: the timing window, drawn where the closing ring will be within it
      const rStart = r * 2.7;
      const shrink = (rStart - r) / approach;
      const steady = n.steady ? 1.6 : 1;
      const band = Math.max(3, shrink * win * steady * 2);
      if (n.state === "waiting") {
        ctx.strokeStyle = "rgba(240,181,58,0.55)";
        ctx.lineWidth = band;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + band / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ink.circle(ctx, p.x, p.y, n.kind === "star" ? r * 1.2 : r, colour, 4);
      if (n.kind === "star") ink.sparkle(ctx, p.x, p.y, r * 0.8, "#fff1a8");
      else ink.label(ctx, n.kind === "hold" ? "hold" : String(n.n), p.x, p.y, n.kind === "hold" ? r * 0.5 : r * 0.8, ink.INK, "center", 800);
      if (n.kind === "hold" && n.state === "active") {
        const k = clamp((t - at) / (n.len * this.beatLen), 0, 1);
        ctx.strokeStyle = ink.TEAL;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 8, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
        ctx.stroke();
      }
      if (n.kind === "slide" && (n.state === "active" || until < 0)) {
        const k = clamp((t - at) / (n.len * this.beatLen), 0, 1);
        const b = bez(n.path, k);
        ink.circle(ctx, b.x * w, b.y * h, r * 0.62, ink.HONEY, 3);
      }
      // the closing ring
      if (n.state === "waiting" && until > -win) {
        const rr = r + Math.max(0, until) * shrink;
        ctx.strokeStyle = ink.INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  strokeBez(ctx, path, w, h) {
    ctx.beginPath();
    ctx.moveTo(path[0].x * w, path[0].y * h);
    ctx.quadraticCurveTo(path[1].x * w, path[1].y * h, path[2].x * w, path[2].y * h);
    ctx.stroke();
  }

  // Top corners: Sunny's hearts, and how wide the foragers' paths are right now, the thing your dancing gives them.
  drawGauge(ctx, w, h) {
    const a = this.sim.flower("affection") / 100;
    const hr = Math.min(11, w / 40);
    for (let i = 0; i < 5; i++) {
      const fill = clamp(a * 5 - i, 0, 1);
      ink.heart(ctx, 18 + hr + i * hr * 2.4, 22 + hr, hr, fill > 0.5 ? ink.TOMATO : fill > 0 ? "#f0a090" : "#efe2c8");
    }
    // a little window onto the foragers' world: their winding path, as wide as your dancing makes it
    const c = this.sim.flower("corridor");
    const gw = 96, gh = 58;
    const gx = w - 16 - gw, gy = 14;
    ink.inked(ctx, "#f6e6c0", 2.5, () => ctx.roundRect(gx, gy, gw, gh, 10));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(gx + 1, gy + 1, gw - 2, gh - 2, 9);
    ctx.clip();
    const zig = () => { ctx.beginPath(); ctx.moveTo(gx - 4, gy + gh - 6); ctx.lineTo(gx + gw * 0.3, gy + 10); ctx.lineTo(gx + gw * 0.62, gy + gh - 8); ctx.lineTo(gx + gw + 4, gy + 6); };
    ctx.lineJoin = "round";
    zig(); ctx.strokeStyle = ink.INK; ctx.lineWidth = 6 + 18 * c + 4; ctx.stroke();
    zig(); ctx.strokeStyle = "#fffaf0"; ctx.lineWidth = 6 + 18 * c; ctx.stroke();
    ctx.restore();
    ink.bee(ctx, gx + gw * 0.46 + Math.sin(this.t * 2) * 6, gy + gh * 0.5, 6, { role: 2, t: this.t });
    ink.label(ctx, "foragers' path", gx + gw / 2, gy + gh + 10, 11, "#fff6dc", "center", 700);
  }
}

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function bez(p, k) {
  const u = 1 - k;
  return { x: u * u * p[0].x + 2 * u * k * p[1].x + k * k * p[2].x, y: u * u * p[0].y + 2 * u * k * p[1].y + k * k * p[2].y };
}
