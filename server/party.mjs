// Garden parties: one authoritative encounter per room, run by the same fibber module the browser uses.
// Each person takes a seat (a bee slot); NPCs keep every other seat warm, and take a seat back if its person
// leaves, mid-visit included. Clients send events; the room steps the sim and sends everyone its state.
// No free text crosses the wire: bees have names from the game, and cheers are a fixed set.
import { readFileSync } from "node:fs";
import { randomBytes, randomInt } from "node:crypto";
import { loadSim, Sim } from "../web/js/sim/sim.js";

const STEP = 1 / 60;
const SEND_EVERY = 3;                 // 20 states a second
const EMPTY_ROOM_SECONDS = 120;
const CODE_LETTERS = "BCDFGHJKLMNPQRSTVWXZ";   // no vowels, so no words
const CHEERS = ["heart", "highfive", "wow", "thanks"];

const exportsPromise = loadSim(readFileSync(new URL("../web/sim.wasm", import.meta.url)));

// Who may send which event, and how to check its arguments.
// `perSecond` caps how often an honest game could send each event (with room to spare), so a modified client can't
// flood Sunny with affection or the pot with nectar.
const EVENTS = {
  tankMove: { seat: (s) => s === 0, args: 2, perSecond: 8, check: (a) => Number.isInteger(a[0]) && a[0] >= 0 && a[0] <= 3 },
  foragerCollect: { seat: (s, a) => s >= 2 && a[0] === s, args: 2, perSecond: 12, check: (a) => a[1] > 0 && a[1] <= 3 },
  foragerFly: { seat: (s, a) => s >= 2 && a[0] === s, args: 2, perSecond: 15, check: (a) => a[1] >= 0 && a[1] <= 60 },
  foragerSlip: { seat: (s, a) => s >= 2 && a[0] === s, args: 1, perSecond: 4 },
  foragerPuff: { seat: (s, a) => s >= 2 && a[0] === s, args: 1, perSecond: 4 },
  foragerHome: { seat: (s, a) => s >= 2 && a[0] === s, args: 1, perSecond: 2 },
  salveThrow: { seat: (s) => s === 1, args: 0, perSecond: 6 },
  salveHit: { seat: (s) => s === 1, args: 2, perSecond: 6, check: (a) => a[0] >= 0 && a[0] <= 4 },
  salveCloud: { seat: (s) => s === 1, args: 0, perSecond: 2 },
};

class Room {
  constructor(code, sim) {
    this.code = code;
    this.sim = sim;
    this.players = new Map();        // socket -> { id, token, seat, gear }
    this.foragers = 3;
    this.phase = "lobby";            // lobby | visit | done
    this.host = null;
    this.emptySince = 0;
    this.ticks = 0;
  }

  get sockets() { return [...this.players.keys()]; }

  lobby() {
    return {
      t: "lobby", code: this.code, phase: this.phase, foragers: this.foragers,
      seats: [...this.players.values()].map((p) => ({ id: p.id, seat: p.seat })),
    };
  }

  broadcastLobby() {
    for (const [sock, p] of this.players) sock.send({ ...this.lobby(), you: p.id, host: sock === this.host });
  }

  freeSeat(role) {
    const taken = new Set([...this.players.values()].map((p) => p.seat));
    if (role === "tank") return taken.has(0) ? null : 0;
    if (role === "healer") return taken.has(1) ? null : 1;
    if (role === "forager") {
      for (let s = 2; s < 2 + this.foragers; s++) if (!taken.has(s)) return s;
    }
    return null;
  }

  takeSeat(sock, role) {
    const p = this.players.get(sock);
    if (role === "none") { this.leaveSeat(p); this.broadcastLobby(); return; }
    const seat = this.freeSeat(role);
    if (seat === null) { sock.send({ t: "error", text: "That role is taken. Pick another!" }); return; }
    this.leaveSeat(p);
    p.seat = seat;
    if (this.phase === "visit") this.sim.setHuman(seat, true);
    this.broadcastLobby();
  }

  leaveSeat(p) {
    if (p.seat !== null && this.phase === "visit") this.sim.setHuman(p.seat, false);
    p.seat = null;
  }

  start() {
    const gear = [...this.players.values()].reduce((m, p) => m | (p.gear & 7), 0);
    this.sim.init({ seed: randomInt(1, 2 ** 31 - 2), foragers: this.foragers, humanRole: -1, gear });
    for (const p of this.players.values()) if (p.seat !== null) this.sim.setHuman(p.seat, true);
    this.phase = "visit";
    this.ticks = 0;
    this.last = performance.now();
    this.acc = 0;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000 / 60);
    this.broadcastLobby();
    this.sendState();
  }

  tick() {
    try { this.advance(); } catch (err) { console.error(`room ${this.code} stopped:`, err); clearInterval(this.timer); this.phase = "done"; }
  }

  advance() {
    const now = performance.now();
    this.acc += Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    while (this.acc >= STEP) {
      this.sim.step(STEP);
      this.acc -= STEP;
      this.ticks++;
      if (this.ticks % SEND_EVERY === 0) this.sendState();
    }
    if (this.sim.enc("ended")) {
      clearInterval(this.timer);
      this.sendState();
      this.phase = "done";
      this.broadcastLobby();
    }
  }

  sendState() {
    const s = this.sim.snapshot();
    for (const sock of this.sockets) sock.sendBinary(s);
  }

  event(sock, msg) {
    const p = this.players.get(sock);
    const rule = EVENTS[msg.name];
    if (this.phase !== "visit" || !rule || p.seat === null) return;
    const args = Array.isArray(msg.args) ? msg.args.slice(0, rule.args).map(Number) : [];
    if (args.length !== rule.args || !args.every(Number.isFinite)) return;
    if (!rule.seat(p.seat, args) || (rule.check && !rule.check(args))) return;
    const now = Date.now();
    if (!p.rate || now - p.rate.since > 1000) p.rate = { since: now, counts: {} };
    p.rate.counts[msg.name] = (p.rate.counts[msg.name] || 0) + 1;
    if (p.rate.counts[msg.name] > rule.perSecond) return;
    // a salve can only land if one was thrown: each throw the sim accepted allows one hit
    if (msg.name === "salveHit") {
      if (!p.throws) return;
      p.throws--;
    }
    if (msg.name === "salveThrow") {
      if (this.sim.salveThrow()) p.throws = Math.min(5, (p.throws || 0) + 1);
      return;
    }
    this.sim[msg.name](...args);
  }

  cheer(sock, kind) {
    const p = this.players.get(sock);
    if (!CHEERS.includes(kind) || p.seat === null) return;
    const now = Date.now();
    if (now - (p.lastCheer || 0) < 800) return;
    p.lastCheer = now;
    for (const s of this.sockets) s.send({ t: "cheer", seat: p.seat, kind });
  }

  remove(sock) {
    const p = this.players.get(sock);
    if (!p) return;
    this.leaveSeat(p);
    this.players.delete(sock);
    if (this.host === sock) this.host = this.sockets[0] || null;
    // nobody left in the garden: the visit stops rather than ticking on for no one
    if (!this.players.size) {
      this.emptySince = Date.now();
      clearInterval(this.timer);
      if (this.phase === "visit") this.phase = "done";
    }
    this.broadcastLobby();
  }

  close() { clearInterval(this.timer); }
}

export async function createParties({ lan = [] } = {}) {
  const x = await exportsPromise;
  const rooms = new Map();
  const departed = new Map();   // token -> { code, seat, at }: a seat held briefly for a reconnect

  const newCode = () => {
    for (;;) {
      const code = Array.from({ length: 4 }, () => CODE_LETTERS[randomInt(CODE_LETTERS.length)]).join("");
      if (!rooms.has(code)) return code;
    }
  };

  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (!room.players.size && now - room.emptySince > EMPTY_ROOM_SECONDS * 1000) { room.close(); rooms.delete(code); }
    }
    for (const [token, d] of departed) if (now - d.at > 60000) departed.delete(token);
  }, 10000).unref();

  function admit(sock, room, gear, token) {
    const p = { id: randomBytes(4).toString("hex"), token: token || randomBytes(12).toString("hex"), seat: null, gear: Number(gear) || 0 };
    room.players.set(sock, p);
    if (!room.host) room.host = sock;
    sock.room = room;
    sock.send({ t: "welcome", code: room.code, token: p.token, lan });
    // a returning player gets their seat back if nobody took it meanwhile
    const back = token && departed.get(token);
    if (back && back.code === room.code) {
      departed.delete(token);
      const taken = [...room.players.values()].some((q) => q.seat === back.seat);
      if (!taken && back.seat !== null) {
        p.seat = back.seat;
        if (room.phase === "visit") room.sim.setHuman(back.seat, true);
      }
    }
    room.broadcastLobby();
    if (room.phase !== "lobby") room.sendState();
  }

  function handle(sock, msg) {
    const room = sock.room;
    if (room && !room.players.has(sock)) return;   // a socket already removed from its room says nothing more
    if (!room) {
      if (msg.t === "create") {
        const r = new Room(newCode(), new Sim(x));
        r.foragers = Math.max(1, Math.min(3, Number(msg.foragers) || 3));
        rooms.set(r.code, r);
        admit(sock, r, msg.gear);
      } else if (msg.t === "join") {
        const r = rooms.get(String(msg.code || "").toUpperCase());
        if (!r) { sock.send({ t: "error", text: "No garden party with that code. Check the letters?" }); return; }
        if (r.players.size >= 8) { sock.send({ t: "error", text: "That party is full." }); return; }
        admit(sock, r, msg.gear, typeof msg.token === "string" ? msg.token : null);
      }
      return;
    }
    const isHost = room.host === sock;
    switch (msg.t) {
      case "seat": room.takeSeat(sock, String(msg.role)); break;
      case "settings":
        if (isHost && room.phase !== "visit") {
          room.foragers = Math.max(1, Math.min(3, Number(msg.foragers) || 3));
          // seats beyond the new count no longer exist
          for (const q of room.players.values()) if (q.seat !== null && q.seat >= 2 + room.foragers) q.seat = null;
          room.broadcastLobby();
        }
        break;
      case "start": if (isHost && room.phase !== "visit") room.start(); break;
      case "home": if (isHost && room.phase === "visit") room.sim.groupHome(); break;
      case "again": if (isHost && room.phase === "done") { room.phase = "lobby"; room.broadcastLobby(); } break;
      case "ev": room.event(sock, msg); break;
      case "cheer": room.cheer(sock, String(msg.kind)); break;
      default: break;
    }
  }

  return function onSocket(sock) {
    sock.on("message", (text) => {
      let msg;
      try { msg = JSON.parse(text); } catch { return; }
      if (!msg || typeof msg.t !== "string") return;
      try { handle(sock, msg); } catch (err) { console.error("party message failed:", err); }
    });
    sock.on("close", () => {
      const room = sock.room;
      if (!room) return;
      const p = room.players.get(sock);
      if (p) departed.set(p.token, { code: room.code, seat: p.seat, at: Date.now() });
      room.remove(sock);
    });
  };
}

