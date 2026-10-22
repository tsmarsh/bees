// Garden parties: two people in one visit through the real server, its WebSocket layer and the fibber sim.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../server/app.mjs";
import { BEE_BASE, BEE_STRIDE, B, E } from "../web/js/sim/layout.js";

const server = await startServer({ port: 0, host: "127.0.0.1" });
const url = `ws://127.0.0.1:${server.address().port}/party`;
after(() => { server.closeAllConnections(); server.close(); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const human = (s, slot) => s[BEE_BASE + slot * BEE_STRIDE + B.human];

function client() {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    ws.msgs = [];
    ws.last = null;
    ws.onmessage = (e) => { if (typeof e.data === "string") ws.msgs.push(JSON.parse(e.data)); else ws.last = new Float64Array(e.data); };
    ws.say = (m) => ws.send(JSON.stringify(m));
    ws.lobby = () => ws.msgs.filter((m) => m.t === "lobby").at(-1);
    ws.onopen = () => resolve(ws);
  });
}

test("two friends share one authoritative visit, each in their own role", async () => {
  const host = await client();
  host.say({ t: "create", foragers: 2 });
  await wait(80);
  const { code, token } = host.msgs.find((m) => m.t === "welcome");
  assert.match(code, /^[A-Z]{4}$/);
  host.say({ t: "seat", role: "healer" });

  const friend = await client();
  friend.say({ t: "join", code });
  await wait(80);
  friend.say({ t: "seat", role: "tank" });
  friend.say({ t: "start" });
  await wait(80);
  assert.equal(friend.lobby().phase, "lobby", "only the host starts the visit");

  host.say({ t: "start" });
  await wait(300);
  for (let i = 0; i < 6; i++) friend.say({ t: "ev", name: "tankMove", args: [0, 1] });
  host.say({ t: "ev", name: "tankMove", args: [0, 1] });   // a healer can't dance
  friend.say({ t: "ev", name: "salveCloud", args: [] });   // a tank can't throw salves
  await wait(250);

  for (const ws of [host, friend]) {
    assert.ok(ws.last, "both receive the encounter's state");
    assert.equal(ws.last[E.beats], 6);
    assert.equal(ws.last[E.clouds], 0);
    assert.equal(human(ws.last, 0), 1);
    assert.equal(human(ws.last, 1), 1);
    assert.equal(human(ws.last, 2), 0, "an NPC flies the forager nobody took");
  }
  assert.ok(host.last[E.t] > 0.2);

  // the friend drops out: Bumble's NPC takes the dance back; they rejoin with their token and get it again
  const friendToken = friend.msgs.find((m) => m.t === "welcome").token;
  friend.close();
  await wait(150);
  assert.equal(human(host.last, 0), 0);
  const again = await client();
  again.say({ t: "join", code, token: friendToken });
  await wait(150);
  assert.equal(human(again.last, 0), 1);
  assert.ok(token);
  host.close();
  again.close();
});

test("a wrong code is answered kindly", async () => {
  const ws = await client();
  ws.say({ t: "join", code: "ZZZZ" });
  await wait(80);
  assert.equal(ws.msgs.at(-1).t, "error");
  ws.close();
});

test("a socket that keeps talking after its close frame can't bring the server down", async () => {
  const { connect } = await import("node:net");
  const host = await client();
  host.say({ t: "create", foragers: 1 });
  await wait(80);
  const { code } = host.msgs.find((m) => m.t === "welcome");
  const port = server.address().port;
  const raw = connect(port, "127.0.0.1");
  await new Promise((r) => raw.on("connect", r));
  raw.write(`GET /party HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  await wait(50);
  const frame = (op, text) => {
    const body = Buffer.from(text);
    const mask = Buffer.from([1, 2, 3, 4]);
    const masked = Buffer.from(body.map((b, i) => b ^ mask[i & 3]));
    return Buffer.concat([Buffer.from([0x80 | op, 0x80 | body.length]), mask, masked]);
  };
  raw.write(frame(1, JSON.stringify({ t: "join", code })));
  await wait(50);
  raw.write(frame(8, ""));
  await wait(30);
  raw.write(frame(1, JSON.stringify({ t: "seat", role: "tank" })));   // a later chunk, after the close
  await wait(100);
  raw.destroy();
  host.say({ t: "seat", role: "tank" });
  await wait(80);
  assert.equal(host.lobby().seats.find((s) => s.id === host.lobby().you).seat, 0, "the server is still answering");
  host.close();
});

test("lowering the forager count frees the seats that no longer exist", async () => {
  const host = await client();
  host.say({ t: "create", foragers: 3 });
  await wait(80);
  const { code } = host.msgs.find((m) => m.t === "welcome");
  host.say({ t: "seat", role: "tank" });
  const friends = [await client(), await client(), await client()];
  for (const f of friends) { f.say({ t: "join", code }); await wait(40); f.say({ t: "seat", role: "forager" }); await wait(40); }
  host.say({ t: "settings", foragers: 1 });
  await wait(80);
  const seats = host.lobby().seats.map((s) => s.seat).filter((s) => s !== null).sort();
  assert.deepEqual(seats, [0, 2]);
  host.close();
  for (const f of friends) f.close();
});

test("a healer's hit needs a throw, and a flood of moves is capped", async () => {
  const host = await client();
  host.say({ t: "create", foragers: 1 });
  await wait(80);
  const { code } = host.msgs.find((m) => m.t === "welcome");
  host.say({ t: "seat", role: "healer" });
  const tank = await client();
  tank.say({ t: "join", code });
  await wait(50);
  tank.say({ t: "seat", role: "tank" });
  await wait(50);
  host.say({ t: "start" });
  await wait(200);
  const soothes = () => host.last[BEE_BASE + 0 * BEE_STRIDE + B.soothes];
  host.say({ t: "ev", name: "salveHit", args: [0, 1] });
  await wait(120);
  assert.equal(soothes(), 0, "no throw, no hit");
  host.say({ t: "ev", name: "salveThrow", args: [] });
  host.say({ t: "ev", name: "salveHit", args: [0, 1] });
  host.say({ t: "ev", name: "salveHit", args: [0, 1] });
  await wait(120);
  assert.equal(soothes(), 1, "one throw, one hit");
  for (let i = 0; i < 50; i++) tank.say({ t: "ev", name: "tankMove", args: [0, 1] });
  await wait(150);
  assert.ok(host.last[E.beats] <= 8, `beats capped, got ${host.last[E.beats]}`);
  host.close();
  tank.close();
});
