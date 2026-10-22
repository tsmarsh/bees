// The boundary between the fibber simulation and the JavaScript views: layout, determinism, conservation, events.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSim, Sim } from "../web/js/sim/sim.js";
import { E, F, B, C, BEE_BASE, BEE_STRIDE, STATE_SIZE, ROLE, STATUS, ENDED, TANK, HEALER, FORAGERS } from "../web/js/sim/layout.js";

const bytes = readFileSync(new URL("../web/sim.wasm", import.meta.url));
const exports = await loadSim(bytes);
const fresh = (opts) => new Sim(exports).init(opts);

test("the layout's roles and constants agree with the module", () => {
  const sim = fresh({ seed: 3, foragers: 2, humanRole: ROLE.healer });
  assert.equal(sim.bee(TANK, "role"), ROLE.tank);
  assert.equal(sim.bee(HEALER, "role"), ROLE.healer);
  assert.equal(sim.bee(HEALER, "human"), 1);
  for (const i of FORAGERS) assert.equal(sim.bee(i, "role"), ROLE.forager);
  assert.deepEqual(FORAGERS.map((i) => sim.bee(i, "active")), [1, 1, 0]);
  assert.equal(sim.konst("duration"), 150);
  assert.equal(sim.konst("salveMax"), sim.enc("salves"));
  assert.ok(sim.flower("corridor") > sim.konst("corridorFloor"));
});

test("the same seed and the same inputs give the same visit", () => {
  const run = () => {
    const sim = fresh({ seed: 42, foragers: 3, humanRole: ROLE.forager });
    for (let i = 0; i < 900; i++) {
      if (i % 20 === 0) sim.foragerCollect(2, 1);
      if (i % 170 === 0) sim.foragerSlip(2);
      sim.step(1 / 60);
    }
    return Array.from(sim.s);
  };
  assert.deepEqual(run(), run());
});

test("nectar is conserved: gathered = banked + spilled + carried, all visit long", () => {
  const sim = fresh({ seed: 9, foragers: 3, humanRole: ROLE.forager });
  for (let i = 0; i < 150 * 30 + 30 && !sim.enc("ended"); i++) {
    if (i % 15 === 0) sim.foragerCollect(2, 1);
    if (i % 400 === 0) sim.foragerSlip(2);
    if (i % 900 === 899) sim.foragerHome(2);
    sim.step(1 / 30);
    const carried = FORAGERS.reduce((a, f) => a + sim.bee(f, "cargo"), 0);
    assert.ok(Math.abs(sim.enc("gathered") - (sim.enc("bank") + sim.enc("spilled") + carried)) < 1e-9, `tick ${i}`);
  }
  assert.equal(sim.enc("ended"), ENDED.sunset);
  assert.ok(sim.enc("bank") > 0);
});

test("choosing to go home banks everything carried, partial runs count", () => {
  const sim = fresh({ seed: 5, foragers: 1, humanRole: ROLE.forager });
  sim.foragerCollect(2, 7);
  sim.groupHome();
  assert.equal(sim.enc("ended"), ENDED.choseHome);
  assert.equal(sim.enc("bank"), 7);
  assert.equal(sim.bee(2, "cargo"), 0);
  assert.equal(sim.bee(2, "status"), STATUS.finished);
});

test("a salve thrown spends one, and one that lands soothes", () => {
  const sim = fresh({ seed: 1, foragers: 1, humanRole: ROLE.healer });
  sim.foragerPuff(2); sim.foragerPuff(2);
  const before = sim.bee(2, "allergy");
  assert.equal(sim.salveThrow(), true);
  assert.equal(sim.enc("salves"), sim.konst("salveMax") - 1);
  sim.salveHit(2, 1);
  assert.ok(sim.bee(2, "allergy") < before);
  assert.ok(sim.bee(2, "soothed") > 0);
});

test("the slot table covers the whole array with no overlap", () => {
  const used = new Set([...Object.values(E), ...Object.values(F), ...Object.values(C)]);
  for (let i = 0; i < 5; i++) for (const o of Object.values(B)) used.add(BEE_BASE + i * BEE_STRIDE + o);
  assert.equal(used.size, STATE_SIZE);
});
