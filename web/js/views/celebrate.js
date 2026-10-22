// After the visit: Sunny waving goodbye, the party lined up, the pot filling. Tap "High five!" and they high-five back.
import * as ink from "../draw/ink.js";

export class Celebration {
  constructor(canvas, { bank, foragers, you }) {
    this.canvas = canvas;
    this.bank = bank;
    this.you = you;
    this.slots = [0, 1, 2, 3, 4].filter((i) => i < 2 + foragers);
    this.t = 0;
    this.five = -10;
    this.particles = new ink.Particles();
    this.running = false;
  }

  start() {
    this.running = true;
    let last = performance.now();
    const tick = (now) => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.t += dt;
      this.particles.update(dt);
      this.draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => this.cheer(), 300);
  }

  stop() { this.running = false; }

  cheer() {
    const { w } = this.size || { w: 600 };
    this.particles.burst(w / 2, 20, 50, "confetti", { speed: 300, spread: Math.PI * 0.9, dir: Math.PI / 2, life: 2.2, gravity: 140 });
  }

  highFive() {
    this.five = this.t;
    const { w, h } = this.size || { w: 600, h: 300 };
    this.particles.burst(w / 2, h * 0.55, 24, "sparkle", { speed: 220, life: 1, gravity: 40 });
    this.particles.burst(w / 2, h * 0.5, 12, "heart", { speed: 160, life: 1.3, gravity: -30 });
  }

  draw() {
    const { ctx, w, h } = ink.fitCanvas(this.canvas);
    this.size = { w, h };
    ctx.clearRect(0, 0, w, h);
    const R = Math.min(h * 0.2, w * 0.14);
    // Sunny, waving with a leaf
    ink.sunflower(ctx, w * 0.78, h * 0.3, R, { t: this.t, delight: 0.9, lean: Math.sin(this.t * 2) * 0.15, stem: h, mood: "bubbly" });
    // the pot, filling
    const fill = Math.min(1, this.t / 1.5);
    const pw = Math.min(110, w * 0.22), ph = pw * 0.9;
    const px = Math.max(pw * 0.6 + 8, w * 0.2), py = h * 0.3;
    ink.inked(ctx, ink.CARD, 3, () => ctx.roundRect(px - pw / 2, py - ph / 2, pw, ph, [12, 12, pw * 0.3, pw * 0.3]));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px - pw / 2 + 2, py - ph / 2 + 2, pw - 4, ph - 4, [10, 10, pw * 0.3, pw * 0.3]);
    ctx.clip();
    ctx.fillStyle = ink.HONEY;
    ctx.fillRect(px - pw / 2, py + ph / 2 - ph * 0.85 * fill, pw, ph);
    ctx.restore();
    ink.label(ctx, String(Math.round(this.bank * fill)), px, py + 4, pw * 0.3);
    // the party in a row; the high five brings them together
    const n = this.slots.length;
    const span = Math.min(w * 0.86, n * 96);
    const mid = w * 0.5;
    const r = Math.min(26, w / 17);
    const since = this.t - this.five;
    const together = since < 0.9 ? Math.sin(Math.min(1, since / 0.25) * Math.PI / 2) * (since < 0.6 ? 1 : 1 - (since - 0.6) / 0.3) : 0;
    this.slots.forEach((slot, k) => {
      const base = mid - span / 2 + (span * (k + 0.5)) / n;
      const x = base + (mid - base) * together * 0.55;
      const y = h * 0.78 - Math.abs(Math.sin(this.t * 4 + k)) * 10;
      const role = slot === 0 ? 0 : slot === 1 ? 1 : 2;
      ink.bee(ctx, x, y, r, { role, t: this.t + k, facing: x < mid ? 1 : -1, wave: 0.6 + 0.4 * Math.sin(this.t * 6 + k), mouth: "grin", you: slot === this.you });
    });
    this.particles.draw(ctx);
  }
}
