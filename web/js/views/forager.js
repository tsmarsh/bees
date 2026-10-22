// The forager's game: the line is your flight. You fly forward on a diagonal and tap to swap diagonals, threading
// a winding path through Sunny's petals. The path is as wide as the flower's attention on the tank allows; heavy
// satchels turn slowly; drift off the path and you sneeze, spill a little and start again from the last leaf.
import * as ink from "../draw/ink.js";
import { E, F, STATUS, PHASE, FORAGERS, TANK } from "../sim/layout.js";
import { buzz } from "../game/audio.js";
import { NAMES } from "../game/team.js";

const SPEED = 150;              // world units a second along the heading
const DIAG = Math.PI / 4;
const TURN_LIGHT = 11;          // radians a second with an empty satchel
const TURN_HEAVY = 4.2;         // ...and a full one
const BEE_R = 9;
const VIEW_W = 400;             // world units across a portrait phone
const GRACE = 0.14;             // seconds off the path before it counts
const HW_MIN = 18;
const HW_SPAN = 46;             // half-width = HW_MIN + HW_SPAN * corridor
const CHECKPOINT_EVERY = 650;
const X_LIMIT = 140;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export class ForagerView {
  constructor({ canvas, sim, audio, you, hudRoot }) {
    this.canvas = canvas;
    this.sim = sim;
    this.audio = audio;
    this.slot = you;
    this.label = "Forager game. Fly the winding path and collect nectar.";
    this.help = "Tap, click or press Space to swap direction. Left and Right arrows choose a direction. Press H to take your nectar home.";
    this.rand = rng(sim.enc("rng"));
    this.t = 0;
    this.particles = new ink.Particles();
    this.shake = 0;
    this.trail = [];
    this.route = [{ x: 0, y: 0 }];
    this.drops = [];
    this.puffs = [];
    this.checkpoints = [{ x: 0, y: 0, dir: 1, i: 0 }];
    this.checkpoint = this.checkpoints[0];
    this.nextCheckpointY = CHECKPOINT_EVERY;
    this.dir = 1;
    this.lastDir = 1;
    this.extendRoute(1200);
    this.bee = { x: 0, y: 0, heading: DIAG, target: 1 };
    this.camY = 0;
    this.mode = "ready";
    this.modeT = 1.4;
    this.off = 0;
    this.combo = 0;
    this.puffClock = 1.5;
    this.salveFx = [];
    this.flowerLook = 0;
    this.homeAsked = -10;
    this.fullWarned = false;
    this.flown = 0;

    this.buildHud(hudRoot);
    this.onPointer = (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      this.audio.ensure();
      this.tap();
    };
    this.onKey = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest("button, dialog")) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); this.tap(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); this.steer(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); this.steer(1); }
      else if (e.key === "h" || e.key === "H") { this.goHome(); }
    };
    canvas.addEventListener("pointerdown", this.onPointer);
    window.addEventListener("keydown", this.onKey);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("keydown", this.onKey);
  }

  buildHud(root) {
    root.innerHTML = `
      <span class="meter-label" id="satchel-label">Satchel <span class="meter" role="meter" aria-label="Satchel" aria-valuemin="0" aria-valuemax="30" aria-valuenow="0"><span></span></span> <span id="satchel-n">0/30</span></span>
      <span class="spacer"></span>
      <button type="button" class="button primary" id="home-button" disabled>Take nectar home</button>`;
    this.satchelBar = root.querySelector(".meter span");
    this.satchelMeter = root.querySelector(".meter");
    this.satchelN = root.querySelector("#satchel-n");
    this.homeButton = root.querySelector("#home-button");
    this.homeButton.addEventListener("click", () => { this.goHome(); this.canvas.focus({ preventScroll: true }); });
  }

  // ---------------------------------------------------------------- input
  tap() { this.steer(-this.bee.target); }

  steer(dir) {
    if (this.mode !== "flying" || dir === this.bee.target) return;
    this.bee.target = dir;
    this.audio.sfx("turn");
    buzz(6);
  }

  goHome() {
    if (this.sim.bee(this.slot, "status") !== STATUS.working || this.sim.bee(this.slot, "cargo") <= 0) return;
    this.sim.foragerHome(this.slot);
    this.audio.sfx("home");
    this.mode = "home";
    this.homeAsked = this.t;
    this.particles.burst(this.toScreenX(this.bee.x), this.toScreenY(this.bee.y), 14, "honey", { speed: 180, life: 0.9 });
  }

  // ---------------------------------------------------------------- the world
  phaseIsBubbly() { return this.sim.enc("phase") === PHASE.bubbly; }

  extendRoute(toY) {
    while (this.route.at(-1).y < toY) {
      const last = this.route.at(-1);
      const bubbly = this.phaseIsBubbly();
      let len = (bubbly ? 55 : 75) + this.rand() * (bubbly ? 110 : 150);
      const dir = this.dir;
      const limit = dir > 0 ? X_LIMIT - last.x : last.x + X_LIMIT;
      len = Math.max(40, Math.min(len, limit));
      const next = { x: last.x + dir * len, y: last.y + len };
      this.layDrops(last, next, dir);
      this.route.push(next);
      if (next.y >= this.nextCheckpointY) {
        this.checkpoints.push({ x: next.x, y: next.y, dir: -dir, i: this.route.length - 1 });
        this.nextCheckpointY = next.y + CHECKPOINT_EVERY;
      }
      this.dir = -dir;
    }
  }

  layDrops(a, b, dir) {
    const len = b.y - a.y;
    for (let d = 30; d < len - 10; d += 110) {
      if (this.rand() < 0.45) {
        for (let k = 0; k < 3; k++) {
          const dd = d + k * 20;
          if (dd > len) break;
          this.drops.push({ x: a.x + dir * dd, y: a.y + dd, rich: false, edge: 0 });
        }
      }
    }
    // a rich drop tucked toward the outside of the coming corner: worth three, but near the edge
    if (this.rand() < 0.35) this.drops.push({ x: b.x, y: b.y, rich: true, edge: dir * 0.62 });
  }

  // Distance from (x, y) to the route, checking the segments near that height.
  distanceToRoute(x, y) {
    let best = Infinity;
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1];
      const b = this.route[i];
      if (b.y < y - 120 || a.y > y + 120) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const k = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      const px = a.x + dx * k, py = a.y + dy * k;
      best = Math.min(best, Math.hypot(x - px, y - py));
    }
    return best;
  }

  // The point on the route at height y, and the direction of that segment.
  routeAt(y) {
    for (let i = 1; i < this.route.length; i++) {
      const a = this.route[i - 1];
      const b = this.route[i];
      if (y >= a.y && y <= b.y) {
        const k = (y - a.y) / (b.y - a.y);
        return { x: a.x + (b.x - a.x) * k, y, dir: Math.sign(b.x - a.x) || 1 };
      }
    }
    return { x: this.route.at(-1).x, y, dir: 1 };
  }

  halfWidth() { return HW_MIN + HW_SPAN * this.sim.flower("corridor"); }

  placeAt(y) {
    const p = this.routeAt(y + 0.01);
    this.bee.x = p.x;
    this.bee.y = p.y;
    this.bee.target = p.dir;
    this.bee.heading = p.dir * DIAG;
    this.trail = [];
  }

  // ---------------------------------------------------------------- per frame
  update(dt, s) {
    this.t += dt;
    this.particles.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3);
    const status = this.sim.bee(this.slot, "status");

    if (s[E.ended]) this.mode = "ended";
    else if (status === STATUS.resting && this.mode !== "resting") { this.mode = "resting"; }
    else if (status === STATUS.homeTrip) { this.mode = "home"; }
    else if ((this.mode === "resting" || this.mode === "home") && status === STATUS.working && !(this.mode === "home" && this.t - this.homeAsked < 0.6)) {
      this.placeAt(this.bee.y);
      this.mode = "ready";
      this.modeT = 1.0;
    }

    if (this.mode === "ready") {
      this.modeT -= dt;
      if (this.modeT <= 0) this.mode = "flying";
    } else if (this.mode === "slipped") {
      this.modeT -= dt;
      const c = this.checkpoint;
      this.bee.y += (c.y - this.bee.y) * Math.min(1, dt * 5);
      this.bee.x += (c.x - this.bee.x) * Math.min(1, dt * 5);
      if (this.modeT <= 0) {
        this.placeAt(c.y);
        this.mode = "ready";
        this.modeT = 0.9;
      }
    } else if (this.mode === "flying") {
      this.fly(dt);
    }

    // camera follows the bee's height
    this.camY += (this.bee.y - this.camY) * Math.min(1, dt * 8);
    this.extendRoute(this.bee.y + 1400);
    this.prune();
    this.updatePuffs(dt);
    this.updateFlower(dt);
    this.updateHud();
  }

  fly(dt) {
    const load = Math.min(1, this.sim.bee(this.slot, "cargo") / Math.max(1, this.sim.bee(this.slot, "capacity")));
    const rate = TURN_LIGHT + (TURN_HEAVY - TURN_LIGHT) * load;
    const want = this.bee.target * DIAG;
    const d = want - this.bee.heading;
    this.bee.heading += Math.sign(d) * Math.min(Math.abs(d), rate * dt);
    const dx = Math.sin(this.bee.heading) * SPEED * dt;
    const dy = Math.cos(this.bee.heading) * SPEED * dt;
    this.bee.x += dx;
    this.bee.y += dy;
    this.flown += Math.hypot(dx, dy);
    this.sim.foragerFly(this.slot, Math.hypot(dx, dy));
    this.trail.push({ x: this.bee.x, y: this.bee.y });
    if (this.trail.length > 160) this.trail.shift();

    // checkpoints are the leaves you pass
    for (const c of this.checkpoints) {
      if (c !== this.checkpoint && c.y > this.checkpoint.y && this.bee.y >= c.y) {
        this.checkpoint = c;
        this.particles.burst(this.toScreenX(c.x), this.toScreenY(c.y), 8, "sparkle", { speed: 90, life: 0.7, gravity: 0 });
      }
    }

    // nectar
    const capacityLeft = this.sim.bee(this.slot, "capacity") - this.sim.bee(this.slot, "cargo");
    const hw = this.halfWidth();
    for (const drop of this.drops) {
      if (drop.taken) continue;
      const x = drop.x + drop.edge * hw;
      if (Math.abs(drop.y - this.bee.y) > 20) continue;
      if (Math.hypot(x - this.bee.x, drop.y - this.bee.y) < BEE_R + 9) {
        if (capacityLeft < 1) {
          if (!this.fullWarned) { this.fullWarned = true; this.flash("Satchel full! Take it home?"); }
          continue;
        }
        drop.taken = true;
        const value = drop.rich ? 3 : 1;
        this.sim.foragerCollect(this.slot, value);
        this.combo++;
        this.audio.sfx(drop.rich ? "rich" : "collect", this.combo % 12);
        this.particles.burst(this.toScreenX(x), this.toScreenY(drop.y), drop.rich ? 10 : 4, drop.rich ? "sparkle" : "honey", { speed: 80, life: 0.5, size: 5 });
      }
    }
    if (capacityLeft >= 1) this.fullWarned = false;

    // the path
    const dist = this.distanceToRoute(this.bee.x, this.bee.y);
    if (dist > hw - BEE_R * 0.3) {
      this.off += dt;
      if (this.off > GRACE) this.slip();
    } else {
      this.off = 0;
    }
  }

  slip() {
    this.off = 0;
    this.combo = 0;
    const cargo = this.sim.bee(this.slot, "cargo");
    this.sim.foragerSlip(this.slot);
    const spilled = cargo - this.sim.bee(this.slot, "cargo");
    this.mode = "slipped";
    this.modeT = 0.9;
    this.shake = 1;
    this.audio.sfx("sneeze");
    buzz([30, 40, 60]);
    const sx = this.toScreenX(this.bee.x), sy = this.toScreenY(this.bee.y);
    this.particles.burst(sx, sy, 16, "pollen", { speed: 220, life: 0.8, gravity: 60 });
    if (spilled > 0) this.particles.burst(sx, sy, Math.min(10, spilled * 2), "honey", { speed: 160, life: 1.1 });
    this.flash(spilled > 0 ? `Achoo! Spilled ${spilled}. Back to the last leaf.` : "Achoo! Back to the last leaf.");
  }

  flash(text) { this.banner = { text, t: 1.8 }; }

  prune() {
    // keep the path back to the last leaf: a slip returns there, however far behind it is
    const low = Math.min(this.camY - 600, this.checkpoint.y - 60);
    while (this.route.length > 3 && this.route[1].y < low) this.route.shift();
    this.drops = this.drops.filter((d) => d.y > low && !(d.taken && d.y < this.bee.y - 40));
    this.checkpoints = this.checkpoints.filter((c) => c === this.checkpoint || c.y > low);
  }

  updatePuffs(dt) {
    const pollen = this.sim.flower("pollen");
    this.puffClock -= dt * (0.4 + pollen);
    if (this.puffClock <= 0 && this.mode !== "ended") {
      this.puffClock = 1.4 + this.rand() * 1.4;
      const side = this.rand() < 0.5 ? -1 : 1;
      const ahead = this.bee.y + 380 + this.rand() * 300;
      const center = this.routeAt(ahead).x;
      this.puffs.push({ x: center - side * (60 + this.rand() * 60), y: ahead, vx: side * (14 + this.rand() * 26), r: 13 + this.rand() * 11, hit: 0, phase: this.rand() * 6 });
    }
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      if (p.hit > 0) p.hit += dt;
      if (this.mode === "flying" && !p.hit && Math.hypot(p.x - this.bee.x, p.y - this.bee.y) < p.r * 0.8 + BEE_R) {
        p.hit = 0.001;
        this.sim.foragerPuff(this.slot);
        this.shake = 0.5;
        this.audio.sfx("sneeze");
        this.particles.burst(this.toScreenX(p.x), this.toScreenY(p.y), 14, "pollen", { speed: 120, life: 0.7, gravity: 30 });
      }
    }
    this.puffs = this.puffs.filter((p) => p.y > this.camY - 500 && p.hit < 0.5 && Math.abs(p.x) < 400);
  }

  updateFlower(dt) {
    const lean = this.sim.flower("lean");
    this.flowerLook += (lean - this.flowerLook) * Math.min(1, dt * 2);
  }

  onEvent(ev) {
    if (ev.kind === "soothed" && ev.slot === this.slot) {
      this.salveFx.push({ t: 0 });
    }
    if (ev.kind === "showstopper") {
      const w = this.lastW || 400;
      this.particles.burst(w / 2, 40, 40, "confetti", { speed: 260, spread: Math.PI, dir: Math.PI / 2, life: 1.8, gravity: 120 });
    }
    if (ev.kind === "paths-wide") this.particles.burst((this.lastW || 400) / 2, (this.lastH || 600) * 0.4, 10, "heart", { speed: 120, life: 1.2, gravity: -20 });
  }

  updateHud() {
    const cargo = Math.floor(this.sim.bee(this.slot, "cargo"));
    const cap = this.sim.bee(this.slot, "capacity");
    const key = `${cargo}/${cap}/${this.mode}`;
    if (key === this.hudKey) return;
    this.hudKey = key;
    this.satchelBar.style.width = `${(cargo / cap) * 100}%`;
    this.satchelMeter.setAttribute("aria-valuenow", cargo);
    this.satchelMeter.setAttribute("aria-valuemax", cap);
    this.satchelN.textContent = `${cargo}/${cap}`;
    const canGo = cargo > 0 && this.sim.bee(this.slot, "status") === STATUS.working && this.mode !== "ended";
    this.homeButton.disabled = !canGo;
    this.homeButton.textContent = this.mode === "home" ? "Flying home…" : cargo >= cap ? "Satchel full: take it home" : "Take nectar home";
  }

  // For tests and demos: steer toward where the path will be a moment from now.
  autopilot() {
    if (this.mode !== "flying") return;
    const ahead = this.routeAt(this.bee.y + 14);
    const want = ahead.x > this.bee.x + 2 ? 1 : ahead.x < this.bee.x - 2 ? -1 : this.bee.target;
    if (want !== this.bee.target) this.steer(want);
    if (this.sim.bee(this.slot, "cargo") >= this.sim.bee(this.slot, "capacity") - 1) this.goHome();
  }

  cheer() { this.particles.burst(this.w / 2, this.h * 0.4, 8, "heart", { speed: 140, life: 1.3, gravity: -40 }); }

  stats() {
    return { distance: Math.round(this.sim.bee(this.slot, "distance")), delivered: Math.round(this.sim.bee(this.slot, "banked")) };
  }

  // ---------------------------------------------------------------- drawing
  toScreenX(x) { return this.w / 2 + x * this.scale; }
  toScreenY(y) { return this.h * 0.72 - (y - this.camY) * this.scale; }

  render() {
    const { ctx, w, h } = ink.fitCanvas(this.canvas);
    this.w = w; this.h = h; this.lastW = w; this.lastH = h;
    this.scale = Math.min(w / VIEW_W, h / 520);
    const sx = (x) => this.toScreenX(x);
    const sy = (y) => this.toScreenY(y);
    const S = this.scale;

    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 10 * this.shake);
    ink.paper(ctx, w, h, "#f6e6c0");
    this.drawDecor(ctx, S);
    this.drawFlowerPeek(ctx, w, h, S);

    // the path: ink edge, then the soft paper of the safe corridor
    const hw = this.halfWidth();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    this.route.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
    ctx.strokeStyle = ink.INK;
    ctx.lineWidth = hw * 2 * S + 6;
    ctx.stroke();
    ctx.strokeStyle = "#fffaf0";
    ctx.lineWidth = hw * 2 * S;
    ctx.stroke();
    ctx.setLineDash([2, 12]);
    ctx.strokeStyle = "rgba(217,143,28,0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);

    // leaves: checkpoints
    for (const c of this.checkpoints) {
      const reached = c.y <= this.checkpoint.y;
      ink.leaf(ctx, sx(c.x) - hw * S * 0.9, sy(c.y), hw * S * 1.8, 0, 2.5);
      if (reached) ink.sparkle(ctx, sx(c.x), sy(c.y) - 6, 7, "#fff1a8");
    }

    // nectar
    for (const d of this.drops) {
      if (d.taken) continue;
      const y = sy(d.y);
      if (y < -30 || y > h + 30) continue;
      ink.nectarDrop(ctx, sx(d.x + d.edge * hw), y + Math.sin(this.t * 3 + d.y) * 1.5, (d.rich ? 7 : 5) * Math.max(0.8, S));
    }

    // pollen puffs
    for (const p of this.puffs) {
      const y = sy(p.y);
      if (y < -60 || y > h + 60) continue;
      ink.pollenPuff(ctx, sx(p.x), y, p.r * S * (1 + p.hit * 3), this.t + p.phase, p.hit ? 1 - p.hit * 2 : 0.92);
    }

    // the line you've flown
    if (this.trail.length > 1) {
      ctx.beginPath();
      this.trail.forEach((p, i) => (i ? ctx.lineTo(sx(p.x), sy(p.y)) : ctx.moveTo(sx(p.x), sy(p.y))));
      ctx.strokeStyle = ink.INK;
      ctx.lineWidth = 7 * S;
      ctx.stroke();
      ctx.strokeStyle = ink.HONEY;
      ctx.lineWidth = 4 * S;
      ctx.stroke();
    }

    this.drawCompanions(ctx, S);

    // you
    const status = this.mode;
    const allergy = this.sim.bee(this.slot, "allergy") / 100;
    const load = this.sim.bee(this.slot, "cargo") / Math.max(1, this.sim.bee(this.slot, "capacity"));
    if (status !== "home") {
      const blink = status === "ready" && Math.floor(this.t * 8) % 2 === 0;
      ink.bee(ctx, sx(this.bee.x), sy(this.bee.y), BEE_R * 1.5 * S, {
        role: 2, t: this.t, facing: this.bee.heading >= 0 ? 1 : -1, sneezy: allergy, load,
        soothed: this.sim.bee(this.slot, "soothed") > 0, resting: status === "resting",
        squash: status === "slipped" ? 0.25 * Math.sin(this.t * 30) : 0, alpha: blink ? 0.45 : 1, you: true,
      });
    }

    this.drawSalves(ctx, sx(this.bee.x), sy(this.bee.y), S);
    this.particles.draw(ctx);
    ctx.restore();

    // pollen haze grows with your sneeziness: a gentle cue, never a blindfold
    if (allergy > 0.45) {
      const k = (allergy - 0.45) / 0.55;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, "rgba(246,210,74,0)");
      g.addColorStop(1, `rgba(246,210,74,${0.45 * k})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    this.drawOverlay(ctx, w, h);
    ink.finishPaper(ctx, w, h);
  }

  drawDecor(ctx, S) {
    // giant petals and leaves either side of the flight, generated per band of height so they scroll with the world
    const band = 160;
    const first = Math.floor((this.camY - 500) / band);
    const last = Math.ceil((this.camY + 900) / band);
    for (let b = first; b <= last; b++) {
      const r = rng(b * 7919 + 13);
      for (const side of [-1, 1]) {
        const x = side * (175 + r() * 120);
        const y = b * band + r() * band;
        const kind = r();
        const sx = this.toScreenX(x), sy = this.toScreenY(y);
        if (kind < 0.55) ink.petalShape(ctx, sx, sy, (110 + r() * 80) * S, (34 + r() * 16) * S, side * (0.5 + r() * 0.9), r() < 0.5 ? ink.PETAL : ink.PETAL_DEEP, 2.5);
        else if (kind < 0.85) ink.leaf(ctx, sx, sy, (90 + r() * 60) * S, side < 0 ? -0.3 + r() * 0.6 : Math.PI - 0.3 + r() * 0.6, 2.5);
        else { ink.circle(ctx, sx, sy, (10 + r() * 10) * S, "#f7d980", 2); }
      }
    }
  }

  drawCompanions(ctx, S) {
    // the other foragers fly their own lines beside yours: a loose formation you glimpse at the edges
    const mine = this.sim.bee(this.slot, "distance");
    let k = 0;
    for (const i of FORAGERS) {
      if (i === this.slot || !this.sim.bee(i, "active")) continue;
      k++;
      const st = this.sim.bee(i, "status");
      if (st !== STATUS.working) continue;
      const rel = ((this.sim.bee(i, "distance") - mine) % 700 + 700) % 700 - 350;
      const y = this.bee.y + rel * 0.6;
      const side = k % 2 ? -1 : 1;
      const x = side * (X_LIMIT + 70 + Math.sin(this.t * 1.7 + i) * 26);
      const px = this.toScreenX(x), py = this.toScreenY(y);
      if (py < -30 || py > this.h + 30) continue;
      ink.bee(ctx, px, py, BEE_R * 1.1 * S, { role: 2, t: this.t + i, facing: Math.cos(this.t * 1.7 + i) > 0 ? 1 : -1, sneezy: this.sim.bee(i, "allergy") / 100, load: this.sim.bee(i, "cargo") / 30, alpha: 0.85 });
      ink.label(ctx, NAMES[i], px, py + BEE_R * 2.2 * S, 11, "#fff6dc", "center", 700);
    }
  }

  drawFlowerPeek(ctx, w, h, S) {
    // Sunny at the edge: turned toward Bumble when delighted, peeking in at you when she's curious
    const look = this.flowerLook;
    const R = Math.min(w, h) * 0.2;
    const x = w + R * (1.25 - look * 1.0);
    const y = h * 0.28;
    const resting = this.sim.bee(TANK, "status") === STATUS.resting;
    ink.sunflower(ctx, x, y, R, {
      t: this.t, lean: -0.4 - look * 0.4, delight: this.sim.flower("delight"),
      look: look > 0.45 ? { x: -1, y: 0.6 } : { x: 0.6, y: -0.4 },
      mood: look > 0.55 ? "curious" : this.sim.flower("worried") ? "worried" : "happy", noStem: true,
    });
    if (look < 0.35 && !resting && Math.floor(this.t * 2) % 3 === 0) ink.heart(ctx, x - R * 0.9, y - R * 1.0 - (this.t % 0.5) * 30, 7);
  }

  drawSalves(ctx, x, y, S) {
    // a honey salve from the healer: arcs in from the bottom left and splats on you
    for (const f of this.salveFx) f.t += 1 / 60;
    for (const f of this.salveFx) {
      const k = Math.min(1, f.t / 0.45);
      if (k < 1) {
        const sx = -20 + (x + 20) * k;
        const sy = this.h + 20 + (y - this.h - 20) * k - Math.sin(k * Math.PI) * 120;
        ink.circle(ctx, sx, sy, 7 * Math.max(1, S), "#ffd56a", 2);
      } else if (!f.splat) {
        f.splat = true;
        this.particles.burst(x, y, 12, "salve", { speed: 140, life: 0.6 });
        this.particles.burst(x, y, 6, "sparkle", { speed: 100, life: 0.8, gravity: 0 });
      }
    }
    this.salveFx = this.salveFx.filter((f) => f.t < 1.2);
  }

  drawOverlay(ctx, w, h) {
    if (this.banner) {
      this.banner.t -= 1 / 60;
      if (this.banner.t <= 0) this.banner = null;
      else ink.label(ctx, this.banner.text, w / 2, h * 0.18, Math.min(26, w / 18), "#fff6dc");
    }
    if (this.mode === "ready") ink.label(ctx, "Ready…", w / 2, h * 0.5, Math.min(40, w / 10), ink.HONEY);
    if (this.mode === "home") {
      ctx.fillStyle = "rgba(243,231,207,0.85)";
      ctx.fillRect(0, 0, w, h);
      const k = 1 - this.sim.bee(this.slot, "timer") / 3;
      ink.label(ctx, "Flying home with your nectar…", w / 2, h * 0.3, Math.min(28, w / 16));
      // the hive pot, and you flying to it
      const hx = w * 0.25, hy = h * 0.58;
      ink.inked(ctx, ink.HONEY, 3, () => ctx.roundRect(hx - 40, hy - 30, 80, 70, [10, 10, 24, 24]));
      ink.label(ctx, String(Math.floor(this.sim.enc("bank"))), hx, hy + 6, 22);
      ink.bee(ctx, w * (0.8 - 0.5 * Math.min(1, k * 1.3)), hy - 50 - Math.sin(k * Math.PI) * 40, 18, { role: 2, t: this.t, facing: -1, you: true });
    }
    if (this.mode === "resting") {
      ctx.fillStyle = "rgba(243,231,207,0.7)";
      ctx.fillRect(0, 0, w, h);
      const left = Math.ceil(this.sim.bee(this.slot, "timer"));
      ink.leaf(ctx, w / 2 - 70, h * 0.55 + 24, 140, 0, 3);
      ink.bee(ctx, w / 2, h * 0.55, 26, { role: 2, t: this.t, resting: true, soothed: this.sim.bee(this.slot, "soothed") > 0, you: true });
      ink.label(ctx, `Resting on a leaf… ${left}`, w / 2, h * 0.3, Math.min(28, w / 16));
      ink.label(ctx, "A salve from Hazel will help you back sooner", w / 2, h * 0.75, Math.min(16, w / 26), "#fff6dc", "center", 600);
    }
  }
}
