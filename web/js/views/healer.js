// The healer's game: a honey sling at the edge of the garden. Pull back, let go, and lob soothing salves at bees who
// are getting sneezy. The tank dances at Sunny's feet; foragers loop around her on their flights, wobbling more when
// her attention wanders; resting bees lie on the leaf bed below. Sunny's leaves are springy and her petals bounce a
// salve back. A near miss still splashes a little relief.
import * as ink from "../draw/ink.js";
import { E, STATUS, FORAGERS, TANK, HEALER } from "../sim/layout.js";
import { buzz } from "../game/audio.js";
import { NAMES } from "../game/team.js";

const GRAVITY = 1.55;        // in screen heights a second squared
const MAX_BOUNCES = 3;

export class HealerView {
  constructor({ canvas, sim, audio, you, hudRoot }) {
    this.canvas = canvas;
    this.sim = sim;
    this.audio = audio;
    this.slot = you;
    this.label = "Healer game. Launch honey salves at sneezy bees.";
    this.help = "Drag back from anywhere and let go to launch a salve. With a keyboard: arrows aim, Space launches, C sends a honey cloud.";
    this.t = 0;
    this.particles = new ink.Particles();
    this.shots = [];
    this.drag = null;
    this.aim = { angle: -0.75, power: 0.65 };   // keyboard aim, radians from horizontal and 0..1
    this.keyAim = false;
    this.popups = [];
    this.landed = 0;
    this.saves = 0;
    this.cloud = null;
    const box = canvas.getBoundingClientRect();
    this.w = box.width || 1;
    this.h = box.height || 1;
    this.buildHud(hudRoot);

    this.onDown = (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      this.audio.ensure();
      this.keyAim = false;
      this.drag = { x0: e.offsetX, y0: e.offsetY, x: e.offsetX, y: e.offsetY };
    };
    this.onMove = (e) => { if (this.drag) { this.drag.x = e.offsetX; this.drag.y = e.offsetY; } };
    this.onUp = () => {
      if (!this.drag) return;
      const v = this.dragVelocity();
      this.drag = null;
      if (v) this.launch(v.vx, v.vy);
    };
    this.onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest("button, dialog")) return;
      const k = e.key;
      if (k === "ArrowUp") { this.aim.angle = Math.max(-1.45, this.aim.angle - 0.05); this.keyAim = true; e.preventDefault(); }
      else if (k === "ArrowDown") { this.aim.angle = Math.min(0.2, this.aim.angle + 0.05); this.keyAim = true; e.preventDefault(); }
      else if (k === "ArrowRight") { this.aim.power = Math.min(1, this.aim.power + 0.03); this.keyAim = true; e.preventDefault(); }
      else if (k === "ArrowLeft") { this.aim.power = Math.max(0.2, this.aim.power - 0.03); this.keyAim = true; e.preventDefault(); }
      else if ((k === " " || k === "Enter") && !e.repeat) { e.preventDefault(); this.keyAim = true; const v = this.aimVelocity(); this.launch(v.vx, v.vy); }
      else if ((k === "c" || k === "C") && !e.repeat) this.honeyCloud();
    };
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    this.onCancel = () => (this.drag = null);
    canvas.addEventListener("pointercancel", this.onCancel);
    window.addEventListener("keydown", this.onKey);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onCancel);
    window.removeEventListener("keydown", this.onKey);
  }

  buildHud(root) {
    root.innerHTML = `
      <span class="meter-label">Salves <span class="jars" id="jars" role="meter" aria-label="Salves ready" aria-valuemin="0" aria-valuemax="5" aria-valuenow="5"></span></span>
      <span class="spacer"></span>
      <button type="button" class="button" id="cloud-button">Honey cloud (3)</button>`;
    this.jars = root.querySelector("#jars");
    const max = this.sim.konst("salveMax");
    this.jarFills = [];
    for (let i = 0; i < max; i++) {
      const j = document.createElement("span");
      j.className = "jar";
      j.innerHTML = "<span></span>";
      this.jars.append(j);
      this.jarFills.push(j.firstChild);
    }
    this.cloudButton = root.querySelector("#cloud-button");
    this.cloudButton.addEventListener("click", () => { this.honeyCloud(); this.canvas.focus({ preventScroll: true }); });
  }

  // ---------------------------------------------------------------- geometry of the garden
  layout() {
    const w = this.w, h = this.h;
    const R = Math.min(w * 0.13, h * 0.13);
    return {
      ground: h * 0.9,
      sling: { x: Math.max(48, w * 0.12), y: h * 0.72 },
      flower: { x: w * 0.72, y: h * 0.3, R },
      leaves: [
        { x0: w * 0.72, y0: h * 0.62, x1: w * 0.72 - R * 2.0, y1: h * 0.52 },
        { x0: w * 0.72, y0: h * 0.75, x1: w * 0.72 + R * 1.9, y1: h * 0.66 },
      ],
      bed: { x: w * 0.36, y: h * 0.86 },
      hive: { x: w * 0.06, y: h * 0.12 },
      beeR: Math.max(13, Math.min(w, h) * 0.038),
    };
  }

  // Where each bee is in this game's playfield: the healer's own projection of the shared state.
  beePositions() {
    const L = this.layout();
    const out = [];
    const corridor = this.sim.flower("corridor");
    const wobble = (1 - corridor) * 1.8;
    for (let i = 0; i < 5; i++) {
      if (i === HEALER || !this.sim.bee(i, "active")) continue;
      const status = this.sim.bee(i, "status");
      let x, y;
      if (status === STATUS.resting) {
        const k = [TANK, ...FORAGERS].indexOf(i);
        x = L.bed.x - L.beeR * 3 + k * L.beeR * 2.2;
        y = L.bed.y - L.beeR * 0.9;
      } else if (i === TANK) {
        // dancing on the tip of Sunny's left leaf: her stage
        const beat = this.sim.konst("beatInterval");
        const lf = L.leaves[0];
        x = lf.x1 + (lf.x0 - lf.x1) * 0.25 + Math.sin(this.t * Math.PI / beat) * L.beeR * 0.8;
        y = lf.y1 + (lf.y0 - lf.y1) * 0.25 - L.beeR * 1.5 - Math.abs(Math.sin(this.t * Math.PI / beat)) * L.beeR * 1.2;
      } else {
        const d = this.sim.bee(i, "distance");
        const k = FORAGERS.indexOf(i);
        const theta = d / 140 + k * 2.1;
        const rx = L.flower.R * (1.9 + k * 0.5);
        const ry = L.flower.R * (1.25 + k * 0.25);
        x = L.flower.x + Math.cos(theta) * rx + Math.sin(this.t * 5.3 + k) * wobble * L.beeR;
        y = L.flower.y + Math.sin(theta) * ry + Math.cos(this.t * 4.1 + k * 2) * wobble * L.beeR;
        if (status === STATUS.homeTrip) {
          const away = 1 - Math.abs(this.sim.bee(i, "timer") / 1.5 - 1);
          x += (L.hive.x - x) * away;
          y += (L.hive.y - y) * away;
        }
      }
      // every target stays on screen, however narrow the phone
      x = Math.max(L.beeR * 1.9, Math.min(this.w - L.beeR * 1.9, x));
      y = Math.max(L.beeR * 1.9, Math.min(L.ground - L.beeR, y));
      out.push({ i, x, y, r: L.beeR, status });
    }
    return out;
  }

  // ---------------------------------------------------------------- launching
  dragVelocity() {
    const d = this.drag;
    const dx = d.x0 - d.x;
    const dy = d.y0 - d.y;
    const len = Math.hypot(dx, dy);
    if (len < 12) return null;
    const max = Math.min(this.w, this.h) * 0.24;
    const k = Math.min(1, len / max);
    return this.velocity(Math.atan2(dy, dx), k);
  }

  aimVelocity() { return this.velocity(this.aim.angle, this.aim.power); }

  velocity(angle, power) {
    const g = GRAVITY * this.h;
    const vmax = Math.sqrt(g * this.w * 1.05);
    const v = vmax * (0.25 + 0.75 * power);
    return { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v };
  }

  launch(vx, vy) {
    if (this.sim.enc("ended")) return;
    if (!this.sim.salveThrow()) {
      this.popups.push({ x: this.layout().sling.x, y: this.layout().sling.y - 60, text: "Refilling…", t: 0, small: true });
      this.audio.sfx("miss");
      return;
    }
    const L = this.layout();
    this.shots.push({ x: L.sling.x, y: L.sling.y - L.beeR, vx, vy, bounces: 0, closest: new Map(), age: 0, done: false });
    this.audio.sfx("launch");
    buzz(8);
  }

  honeyCloud() {
    if (!this.sim.salveCloud()) {
      this.popups.push({ x: this.w / 2, y: this.h * 0.2, text: "A cloud needs 3 salves", t: 0, small: true });
      return;
    }
    const L = this.layout();
    this.cloud = { t: 0, x: L.flower.x - L.flower.R, y: L.flower.y + L.flower.R };
    this.landed += 1;
    this.particles.burst(this.cloud.x, this.cloud.y, 30, "salve", { speed: 260, life: 1.2, gravity: 40 });
    this.particles.burst(this.cloud.x, this.cloud.y, 16, "sparkle", { speed: 200, life: 1.2, gravity: 0 });
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    this.t += dt;
    this.particles.update(dt);
    const L = this.layout();
    const bees = this.beePositions();
    const g = GRAVITY * this.h;
    for (const s of this.shots) {
      if (s.done) continue;
      const sub = 4;
      for (let k = 0; k < sub && !s.done; k++) {
        const h = dt / sub;
        s.age += h;
        s.vy += g * h;
        s.x += s.vx * h;
        s.y += s.vy * h;
        for (const b of bees) {
          const d = Math.hypot(b.x - s.x, b.y - s.y);
          s.closest.set(b.i, Math.min(s.closest.get(b.i) ?? Infinity, d));
          if (d < b.r + 8) { this.hit(s, b, 1); break; }
        }
        if (s.done) break;
        this.bounce(s, L);
        if (s.y > L.ground || s.x < -60 || s.x > this.w + 60 || s.age > 5) this.land(s, bees, L);
      }
    }
    this.shots = this.shots.filter((s) => !s.done);
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 1);
    if (this.cloud) { this.cloud.t += dt; if (this.cloud.t > 1.4) this.cloud = null; }
    this.updateHud();
  }

  bounce(s, L) {
    if (s.bounces >= MAX_BOUNCES) return;
    // Sunny's face and petals: a soft round bumper
    const f = L.flower;
    const dx = s.x - f.x, dy = s.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < f.R * 1.55 && d > 0) {
      const nx = dx / d, ny = dy / d;
      const dot = s.vx * nx + s.vy * ny;
      if (dot < 0) {
        s.vx = (s.vx - 2 * dot * nx) * 0.6;
        s.vy = (s.vy - 2 * dot * ny) * 0.6;
        s.x = f.x + nx * f.R * 1.56;
        s.y = f.y + ny * f.R * 1.56;
        s.bounces++;
        this.audio.sfx("thud");
        this.particles.burst(s.x, s.y, 3, "heart", { speed: 60, life: 0.8, gravity: -30 });
      }
    }
    // springy leaves: segments
    for (const lf of L.leaves) {
      const ex = lf.x1 - lf.x0, ey = lf.y1 - lf.y0;
      const len2 = ex * ex + ey * ey;
      const k = Math.max(0, Math.min(1, ((s.x - lf.x0) * ex + (s.y - lf.y0) * ey) / len2));
      const px = lf.x0 + ex * k, py = lf.y0 + ey * k;
      const dd = Math.hypot(s.x - px, s.y - py);
      if (dd < 9) {
        let nx = -ey, ny = ex;
        const nl = Math.hypot(nx, ny);
        nx /= nl; ny /= nl;
        if (nx * (s.x - px) + ny * (s.y - py) < 0) { nx = -nx; ny = -ny; }
        const dot = s.vx * nx + s.vy * ny;
        if (dot < 0) {
          s.vx = (s.vx - 2 * dot * nx) * 0.85;
          s.vy = (s.vy - 2 * dot * ny) * 0.85;
          s.x = px + nx * 10;
          s.y = py + ny * 10;
          s.bounces++;
          this.audio.sfx("turn");
        }
      }
    }
  }

  hit(s, b, potency) {
    s.done = true;
    const before = this.sim.bee(b.i, "allergy");
    const resting = this.sim.bee(b.i, "status") === STATUS.resting;
    this.sim.salveHit(b.i, potency);
    this.landed++;
    if (before >= 70 || resting) this.saves++;
    this.particles.burst(b.x, b.y, potency >= 1 ? 14 : 6, "salve", { speed: 150, life: 0.6 });
    this.particles.burst(b.x, b.y, potency >= 1 ? 6 : 2, "sparkle", { speed: 100, life: 0.8, gravity: 0 });
    const name = NAMES[b.i];
    const text = potency >= 1 ? (before >= 70 || resting ? `Saved ${name}!` : `Soothed ${name}!`) : `Splash on ${name}`;
    this.popups.push({ x: b.x, y: b.y - b.r * 2, text, t: 0, small: potency < 1 });
    this.audio.sfx(potency >= 1 ? "splat" : "splash");
    buzz(potency >= 1 ? 15 : 6);
  }

  // The salve came down without a direct hit: the closest bee it passed near gets a splash.
  land(s, bees, L) {
    s.done = true;
    let best = null;
    for (const b of bees) {
      const d = Math.min(s.closest.get(b.i) ?? Infinity, Math.hypot(b.x - s.x, b.y - Math.min(s.y, L.ground)));
      if (d < b.r * 3.2 && (!best || d < best.d)) best = { b, d };
    }
    if (best) this.hit(s, best.b, 0.4);
    else {
      this.particles.burst(s.x, Math.min(s.y, L.ground), 6, "salve", { speed: 90, life: 0.4 });
      this.audio.sfx("thud");
    }
  }

  updateHud() {
    const salves = this.sim.enc("salves");
    const regen = this.sim.enc("salveClock");
    const key = `${salves}/${Math.round(regen * 10)}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    const period = (this.sim.enc("gear") & 4) ? 1.3 : 1.7;
    this.jarFills.forEach((f, i) => {
      const fill = i < Math.floor(salves) ? 1 : i === Math.floor(salves) ? Math.min(1, regen / period) : 0;
      f.style.height = `${fill * 100}%`;
    });
    this.jars.setAttribute("aria-valuenow", Math.floor(salves));
    this.cloudButton.disabled = salves < this.sim.konst("cloudCost") || this.sim.enc("ended");
  }

  onEvent(ev) {
    if (ev.kind === "honey-for-salves") {
      const L = this.layout();
      this.particles.burst(L.sling.x, L.sling.y - 30, 10, "honey", { speed: 120, life: 0.9 });
      this.popups.push({ x: L.sling.x + 40, y: L.sling.y - 70, text: `+${ev.amount} honey!`, t: 0 });
    }
    if (ev.kind === "showstopper") this.particles.burst(this.w / 2, 0, 40, "confetti", { speed: 280, spread: Math.PI, dir: Math.PI / 2, life: 2, gravity: 140 });
  }

  cheer() { this.particles.burst(this.layout().sling.x + 30, this.layout().sling.y - 40, 8, "heart", { speed: 140, life: 1.3, gravity: -40 }); }

  stats() { return { landed: this.landed, saves: this.saves }; }

  // For tests and demos: aim at the neediest bee with a rough lead, now and then.
  autopilot() {
    if (this.shots.length || this.sim.enc("salves") < 1 || Math.random() > 0.08) return;
    const bees = this.beePositions().filter((b) => this.sim.bee(b.i, "allergy") > 25 || b.status === STATUS.resting);
    if (!bees.length) return;
    bees.sort((a, b) => this.sim.bee(b.i, "allergy") - this.sim.bee(a.i, "allergy"));
    const target = bees[0];
    const L = this.layout();
    const g = GRAVITY * this.h;
    // search angles for a lob that passes near the target
    let best = null;
    for (let a = -1.4; a < 0.1; a += 0.05) {
      for (let p = 0.2; p <= 1; p += 0.05) {
        const v = this.velocity(a, p);
        const tx = (target.x - L.sling.x) / v.vx;
        if (tx <= 0) continue;
        const y = L.sling.y - L.beeR + v.vy * tx + 0.5 * g * tx * tx;
        const err = Math.abs(y - target.y);
        if (!best || err < best.err) best = { err, v };
      }
    }
    if (best) this.launch(best.v.vx, best.v.vy);
  }

  // ---------------------------------------------------------------- drawing
  render() {
    const { ctx, w, h } = ink.fitCanvas(this.canvas);
    this.w = w; this.h = h;
    const L = this.layout();
    ink.paper(ctx, w, h, "#dfeee9");
    // sky to meadow
    ctx.fillStyle = "#cfe3a8";
    ctx.fillRect(0, L.ground, w, h - L.ground);
    ctx.strokeStyle = ink.INK;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, L.ground); ctx.lineTo(w, L.ground); ctx.stroke();
    this.drawHive(ctx, L);

    // Sunny and her springy leaves
    ink.sunflower(ctx, L.flower.x, L.flower.y, L.flower.R, {
      t: this.t, delight: this.sim.flower("delight"), lean: this.sim.flower("lean") * -0.4, stem: L.ground - L.flower.y, leaves: false,
      mood: this.sim.flower("worried") ? "worried" : this.sim.flower("focus") < 0.35 ? "curious" : "happy", look: { x: -0.8, y: 0.6 },
    });
    for (const lf of L.leaves) {
      const len = Math.hypot(lf.x1 - lf.x0, lf.y1 - lf.y0);
      ink.leaf(ctx, lf.x0, lf.y0, len, Math.atan2(lf.y1 - lf.y0, lf.x1 - lf.x0), 3);
    }
    // the leaf bed for resting bees
    ink.leaf(ctx, L.bed.x - L.beeR * 5, L.bed.y, L.beeR * 10, 0, 3);

    // bees
    for (const b of this.beePositions()) {
      const allergy = this.sim.bee(b.i, "allergy") / 100;
      const role = b.i === TANK ? 0 : 2;
      const facing = b.i === TANK ? 1 : (Math.cos(this.sim.bee(b.i, "distance") / 140) > 0 ? -1 : 1);
      // the sneeze ring: how much each bee needs you
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(34,28,22,0.15)";
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.85, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = allergy >= 0.7 ? ink.TOMATO : allergy >= 0.4 ? ink.HONEY_DEEP : ink.LEAF;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.85, -Math.PI / 2, -Math.PI / 2 + allergy * Math.PI * 2); ctx.stroke();
      ink.bee(ctx, b.x, b.y, b.r, {
        role, t: this.t + b.i, facing, sneezy: allergy, soothed: this.sim.bee(b.i, "soothed") > 0,
        resting: b.status === STATUS.resting, load: this.sim.bee(b.i, "cargo") / 30, alpha: b.status === STATUS.homeTrip ? 0.6 : 1,
      });
      ink.label(ctx, NAMES[b.i], b.x, b.y + b.r * 2.35, Math.max(11, b.r * 0.75), "#fff6dc", "center", 700);
      if (allergy >= 0.7 && b.status === STATUS.working) ink.label(ctx, "!", b.x + b.r * 1.6, b.y - b.r * 1.6, b.r * 1.1, ink.TOMATO);
    }

    this.drawSling(ctx, L);
    for (const s of this.shots) {
      ink.circle(ctx, s.x, s.y, 8, "#ffd56a", 2.5);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath(); ctx.arc(s.x - 2.5, s.y - 2.5, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    if (this.cloud) this.drawCloud(ctx, L);
    this.particles.draw(ctx);
    for (const p of this.popups) ink.label(ctx, p.text, p.x, p.y - p.t * 36, p.small ? 14 : 19, p.small ? "#fff6dc" : ink.HONEY);
    if (this.t < 4) ink.label(ctx, "Drag back and let go!", w / 2, h * 0.12, Math.min(26, w / 15), ink.HONEY);
    ink.finishPaper(ctx, w, h);
  }

  drawHive(ctx, L) {
    const { x, y } = L.hive;
    ctx.strokeStyle = ink.INK;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, y - 30); ctx.lineTo(x + 60, y - 40); ctx.stroke();
    ink.inked(ctx, ink.HONEY, 3, () => ctx.ellipse(x + 20, y + 4, 26, 32, 0, 0, Math.PI * 2));
    ctx.strokeStyle = "rgba(34,28,22,0.6)";
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + 20, y + 4 + i * 11, 24 - Math.abs(i) * 4, 3, 0, 0, Math.PI); ctx.stroke(); }
    ink.circle(ctx, x + 20, y + 16, 6, ink.INK, 0);
    const bank = Math.floor(this.sim.enc("bank"));
    if (bank > 0) ink.label(ctx, String(bank), x + 20, y + 52, 15, ink.HONEY);
  }

  drawSling(ctx, L) {
    const { x, y } = L.sling;
    const r = L.beeR;
    // the healer, ready
    ink.bee(ctx, x - r * 1.8, y + r * 0.9, r * 1.05, { role: 1, t: this.t, facing: 1, you: true, wave: this.drag ? 1 : 0.3, look: { x: 1, y: -0.8 } });
    // the honey-dipper sling
    ctx.lineCap = "round";
    ctx.strokeStyle = ink.INK;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(x, L.ground);
    ctx.lineTo(x, y + r * 0.6);
    ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x - r * 0.9, y - r * 0.9);
    ctx.moveTo(x, y + r * 0.6); ctx.lineTo(x + r * 0.9, y - r * 0.9);
    ctx.stroke();
    ctx.strokeStyle = "#a8683a";
    ctx.lineWidth = 5;
    ctx.stroke();
    // the pouch, pulled back while aiming
    let px = x, py = y - r * 0.6;
    let v = null;
    if (this.drag) {
      const max = Math.min(this.w, this.h) * 0.24;
      const dx = this.drag.x - this.drag.x0, dy = this.drag.y - this.drag.y0;
      const len = Math.hypot(dx, dy);
      const k = Math.min(1, max / Math.max(1, len)) * 0.5;
      px += dx * k; py += dy * k;
      v = this.dragVelocity();
    } else if (this.keyAim) {
      v = this.aimVelocity();
    }
    ctx.strokeStyle = "#7a3f1e";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.9); ctx.lineTo(px, py); ctx.lineTo(x + r * 0.9, y - r * 0.9); ctx.stroke();
    if (this.sim.enc("salves") >= 1) ink.circle(ctx, px, py, 8, "#ffd56a", 2.5);
    // a short dotted preview of the first moments of flight: the rest is your judgement
    if (v) {
      const g = GRAVITY * this.h;
      ctx.fillStyle = "rgba(34,28,22,0.55)";
      for (let i = 1; i <= 9; i++) {
        const tt = i * 0.045;
        const sx = x + v.vx * tt, sy = y - r + v.vy * tt + 0.5 * g * tt * tt;
        ctx.beginPath(); ctx.arc(sx, sy, 3.2 - i * 0.2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  drawCloud(ctx, L) {
    const k = this.cloud.t / 1.4;
    const r = Math.min(this.w, this.h) * (0.15 + 0.45 * k);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.6 * (1 - k));
    ctx.fillStyle = "#ffd56a";
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + k;
      ctx.beginPath();
      ctx.arc(this.cloud.x + Math.cos(a) * r * 0.6, this.cloud.y + Math.sin(a) * r * 0.4, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
