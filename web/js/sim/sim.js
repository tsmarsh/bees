// The encounter simulation: the fibber module, its state array, and one method per input event.
// Works in a browser (pass a URL) and in node (pass the bytes). The JavaScript owns the memory; the module owns the rules.
import { wasiImports } from "./wasi.js";
import { STATE_SIZE, E, F, B, C, BEE_BASE, BEE_STRIDE } from "./layout.js";

export async function loadSim(source) {
  let memory = null;
  const imports = wasiImports(() => memory);
  const bytes = typeof source === "string" || source instanceof URL ? await (await fetch(source)).arrayBuffer() : source;
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  memory = instance.exports.memory;
  if (instance.exports._initialize) instance.exports._initialize();
  const size = instance.exports.stateSize();
  if (size !== STATE_SIZE) throw new Error(`sim.wasm has ${size} state slots, layout.js expects ${STATE_SIZE}: rebuild with make wasm`);
  return instance.exports;
}

export class Sim {
  constructor(x) {
    this.x = x;
    this.ptr = x.malloc(STATE_SIZE * 8);
  }

  // Every call can grow wasm memory, which detaches old views: always read through a fresh one.
  get s() { return new Float64Array(this.x.memory.buffer, this.ptr, STATE_SIZE); }
  snapshot() { return Float64Array.from(this.s); }
  restore(state) { this.s.set(state); }

  init({ seed = 1, foragers = 3, humanRole = -1, gear = 0 } = {}) { this.x.init(this.ptr, seed, foragers, humanRole, gear); return this; }
  step(dt) { return this.x.step(this.ptr, dt); }
  tankMove(kind, quality) { this.x.tankMove(this.ptr, kind, quality); }
  foragerCollect(i, amount) { this.x.foragerCollect(this.ptr, i, amount); }
  foragerFly(i, dist) { this.x.foragerFly(this.ptr, i, dist); }
  foragerSlip(i) { this.x.foragerSlip(this.ptr, i); }
  foragerPuff(i) { this.x.foragerPuff(this.ptr, i); }
  foragerHome(i) { this.x.foragerHome(this.ptr, i); }
  salveThrow() { const before = this.get(E.salves); this.x.salveThrow(this.ptr); return this.get(E.salves) < before; }
  salveHit(i, potency) { this.x.salveHit(this.ptr, i, potency); }
  salveCloud() { const before = this.get(E.salves); this.x.salveCloud(this.ptr); return this.get(E.salves) < before; }
  groupHome() { this.x.groupHome(this.ptr); }

  get(slot) { return this.s[slot]; }
  bee(i, field) { return this.s[BEE_BASE + i * BEE_STRIDE + B[field]]; }
  flower(field) { return this.s[F[field]]; }
  enc(field) { return this.s[E[field]]; }
  konst(field) { return this.s[C[field]]; }
}
