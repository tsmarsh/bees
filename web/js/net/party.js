// Garden parties from the browser's side: the connection to the server's room, and a RemoteSim that looks to the
// views exactly like the local Sim. Events go up as messages; the authoritative state comes down twenty times a
// second and is smoothed between arrivals for the things that move continuously.
import { STATE_SIZE, E, F, B, C, BEE_BASE, BEE_STRIDE } from "../sim/layout.js";

const TOKEN_KEY = "allerbees.party";
const INTERP_MS = 50;

// Slots that change smoothly and may be blended between two states; everything else (counters, statuses) snaps.
const SMOOTH = [E.t, E.salveClock, E.window, F.affection, F.focus, F.corridor, F.pollen, F.lean, F.delight];
for (let i = 0; i < 5; i++) {
  for (const f of ["allergy", "soothed", "timer", "distance"]) SMOOTH.push(BEE_BASE + i * BEE_STRIDE + B[f]);
}

export class RemoteSim {
  constructor(client) {
    this.client = client;
    this.prev = new Float64Array(STATE_SIZE);
    this.cur = new Float64Array(STATE_SIZE);
    this.view = new Float64Array(STATE_SIZE);
    this.at = 0;
    this.flyPending = new Map();
  }

  // Salves spent here but not yet seen spent by the server. A state that shows fewer salves than the one before has
  // caught up with that many throws; anything older than half a second has surely been seen (or refused).
  receive(state) {
    const dropped = Math.max(0, Math.round(this.cur[E.salves] - state[E.salves]));
    this.pending = (this.pending || []).slice(Math.min(dropped, (this.pending || []).length));
    const now = performance.now();
    this.pending = this.pending.filter((at) => now - at < 500);
    this.prev = this.cur;
    this.cur = state;
    this.at = now;
  }

  get s() {
    const k = Math.min(1, (performance.now() - this.at) / INTERP_MS);
    this.view.set(this.cur);
    for (const i of SMOOTH) this.view[i] = this.prev[i] + (this.cur[i] - this.prev[i]) * k;
    this.view[E.salves] = Math.max(0, this.cur[E.salves] - (this.pending?.length || 0));
    return this.view;
  }

  snapshot() { return Float64Array.from(this.s); }
  init() { return this; }
  step() { this.flushFly(); return this.cur[E.ended]; }

  send(name, ...args) { this.client.say({ t: "ev", name, args }); }
  tankMove(kind, quality) { this.send("tankMove", kind, quality); }
  foragerCollect(i, amount) { this.send("foragerCollect", i, amount); }
  foragerFly(i, dist) { this.flyPending.set(i, (this.flyPending.get(i) || 0) + dist); }
  flushFly() {
    const now = performance.now();
    if (now - (this.flushedAt || 0) < 100) return;
    this.flushedAt = now;
    for (const [i, d] of this.flyPending) if (d > 0) this.send("foragerFly", i, Math.min(60, d));
    this.flyPending.clear();
  }
  foragerSlip(i) { this.send("foragerSlip", i); }
  foragerPuff(i) { this.send("foragerPuff", i); }
  foragerHome(i) { this.send("foragerHome", i); }
  // A throw is optimistic: if the last state had a salve, spend it here at once so a quick second throw can't
  // spend the same one; the next state from the server settles the count.
  salveThrow() {
    if (this.s[E.salves] < 1 || this.cur[E.ended]) return false;
    (this.pending ||= []).push(performance.now());
    this.send("salveThrow");
    return true;
  }
  salveHit(i, potency) { this.send("salveHit", i, potency); }
  salveCloud() {
    if (this.s[E.salves] < this.konst("cloudCost")) return false;
    for (let k = 0; k < this.konst("cloudCost"); k++) (this.pending ||= []).push(performance.now());
    this.send("salveCloud");
    return true;
  }
  groupHome() { this.client.say({ t: "home" }); }

  get(slot) { return this.s[slot]; }
  bee(i, field) { return this.s[BEE_BASE + i * BEE_STRIDE + B[field]]; }
  flower(field) { return this.s[F[field]]; }
  enc(field) { return this.s[E[field]]; }
  konst(field) { return this.cur[C[field]]; }
}

// The connection. Emits: "lobby" (room info), "state" (first state of a visit arrives), "cheer", "error", "closed".
export class PartyClient extends EventTarget {
  constructor() {
    super();
    this.sim = new RemoteSim(this);
    this.lobby = null;
    this.code = null;
    this.hasState = false;
  }

  static endpoint() {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/party`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      let ws;
      try { ws = new WebSocket(PartyClient.endpoint()); } catch (err) { reject(err); return; }
      ws.binaryType = "arraybuffer";
      const timer = setTimeout(() => { ws.close(); reject(new Error("timeout")); }, 4000);
      ws.onopen = () => { clearTimeout(timer); this.ws = ws; resolve(); };
      ws.onerror = () => { clearTimeout(timer); reject(new Error("no party server")); };
      ws.onclose = () => { this.ws = null; this.emit("closed"); };
      ws.onmessage = (e) => this.receive(e.data);
    });
  }

  say(msg) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(msg)); }

  receive(data) {
    if (typeof data !== "string") {
      this.sim.receive(new Float64Array(data));
      if (!this.hasState) { this.hasState = true; this.emit("state"); }
      return;
    }
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg.t === "welcome") {
      this.code = msg.code;
      this.lan = Array.isArray(msg.lan) ? msg.lan.filter((a) => typeof a === "string") : [];
      try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ code: msg.code, token: msg.token })); } catch { /* fine */ }
    } else if (msg.t === "lobby") {
      if (msg.phase === "lobby") this.hasState = false;
      this.lobby = msg;
      this.emit("lobby", msg);
    } else if (msg.t === "cheer") this.emit("cheer", msg);
    else if (msg.t === "error") this.emit("error", msg);
  }

  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  async create(foragers, gear) { await this.connect(); this.say({ t: "create", foragers, gear }); }

  async join(code, gear) {
    await this.connect();
    let token = null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
      if (saved && saved.code === code) token = saved.token;
    } catch { /* fine */ }
    this.say({ t: "join", code, gear, token });
  }

  get mySeat() {
    const me = this.lobby?.seats.find((s) => s.id === this.lobby.you);
    return me ? me.seat : null;
  }

  leave() { if (this.ws) this.ws.close(); }
}
