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
