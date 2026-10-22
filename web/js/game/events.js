// What changed in the shared encounter since the last frame, as events every view can react to.
// The sim keeps counters (soothes, slips, deliveries, showstoppers...) rather than a log, so one comparison of
// two snapshots says what happened, whoever caused it: a person in this browser, an NPC, or someone far away.
import { E, F, B, BEE_BASE, BEE_STRIDE, STATUS, PHASE } from "../sim/layout.js";

const bee = (s, i, f) => s[BEE_BASE + i * BEE_STRIDE + B[f]];

export class EventDetector {
  constructor() {
    this.paths = "normal";
    this.warned = -1;
  }

  diff(prev, cur) {
    const out = [];
    if (!prev) return out;

    for (let i = 0; i < 5; i++) {
      if (!bee(cur, i, "active")) continue;
      const soothes = bee(cur, i, "soothes") - bee(prev, i, "soothes");
      if (soothes > 0) out.push({ kind: "soothed", slot: i, count: soothes });
      if (bee(cur, i, "slips") > bee(prev, i, "slips")) out.push({ kind: "slip", slot: i });
      if (bee(cur, i, "deliveries") > bee(prev, i, "deliveries")) {
        out.push({ kind: "delivery", slot: i, amount: bee(cur, i, "banked") - bee(prev, i, "banked") });
      }
      const was = bee(prev, i, "status");
      const now = bee(cur, i, "status");
      if (now === STATUS.resting && was !== STATUS.resting) out.push({ kind: "tap-out", slot: i });
      if (was === STATUS.resting && now === STATUS.working) out.push({ kind: "back", slot: i });
      if (was === STATUS.homeTrip && now === STATUS.working) out.push({ kind: "returned", slot: i });
      if (bee(cur, i, "allergy") >= 75 && bee(prev, i, "allergy") < 75 && now === STATUS.working) out.push({ kind: "sneezy", slot: i });
    }

    if (cur[E.showstoppers] > prev[E.showstoppers]) out.push({ kind: "showstopper" });
    if (cur[E.clouds] > prev[E.clouds]) out.push({ kind: "cloud" });
    if (cur[E.beats] > prev[E.beats]) out.push({ kind: "beat", quality: cur[F.delight] });
    if (cur[E.misses] > prev[E.misses]) out.push({ kind: "miss" });
    if (cur[E.salves] - prev[E.salves] >= 1.5) out.push({ kind: "honey-for-salves", amount: Math.round(cur[E.salves] - prev[E.salves]) });

    if (cur[E.phase] !== prev[E.phase]) out.push({ kind: "phase", phase: cur[E.phase] });
    if (cur[E.phaseLeft] < 4 && cur[E.nextPhase] === PHASE.bubbly && this.warned !== cur[E.nextPhase] * 1000 + Math.round(cur[E.t] + cur[E.phaseLeft])) {
      this.warned = cur[E.nextPhase] * 1000 + Math.round(cur[E.t] + cur[E.phaseLeft]);
      out.push({ kind: "phase-warning", phase: cur[E.nextPhase], seconds: cur[E.phaseLeft] });
    }
    if (cur[F.worried] && !prev[F.worried]) out.push({ kind: "worried" });

    // Path width, with hysteresis so a wobble around a threshold doesn't chatter.
    const c = cur[F.corridor];
    if (this.paths !== "wide" && c > 0.88) { this.paths = "wide"; out.push({ kind: "paths-wide" }); }
    else if (this.paths !== "narrow" && c < 0.62) { this.paths = "narrow"; out.push({ kind: "paths-narrow" }); }
    else if (this.paths !== "normal" && c >= 0.68 && c <= 0.82) { this.paths = "normal"; }

    if (cur[E.ended] && !prev[E.ended]) out.push({ kind: "ended", reason: cur[E.ended] });
    return out;
  }
}
