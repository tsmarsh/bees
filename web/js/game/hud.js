// The parts of a visit that are plain HTML around the canvas: the sun, the phase, the pot, the team, the toasts.
// DOM writes happen only when a shown value changes.
import { E, B, BEE_BASE, BEE_STRIDE, STATUS, ROLE, C } from "../sim/layout.js";
import { NAMES, ROLE_NAMES } from "./team.js";
import { PHASE_LABEL } from "./voice.js";

const $ = (id) => document.getElementById(id);
const bee = (s, i, f) => s[BEE_BASE + i * BEE_STRIDE + B[f]];

export class Hud {
  constructor() {
    this.team = $("team");
    this.toasts = $("toasts");
    this.cache = new Map();
    this.lastToast = new Map();
  }

  setup(state, you) {
    this.you = you;
    this.team.replaceChildren();
    this.mates = [];
    for (let i = 0; i < 5; i++) {
      if (!bee(state, i, "active")) continue;
      const role = bee(state, i, "role");
      const li = document.createElement("li");
      li.className = "mate" + (i === you ? " you" : "");
      const name = i === you ? "You" : NAMES[i];
      li.innerHTML = `<span class="mate-face ${ROLE_NAMES[role]}" aria-hidden="true"></span>
        <span class="mate-name">${name}</span>
        <span class="mate-meter" role="meter" aria-label="${name}'s sneeziness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></span>
        <span class="mate-state"></span>`;
      this.team.append(li);
      this.mates.push({ i, li, bar: li.querySelector(".mate-meter span"), meter: li.querySelector(".mate-meter"), state: li.querySelector(".mate-state"), role });
    }
    this.cache.clear();
  }

  set(key, value, apply) {
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    apply(value);
  }

  update(s) {
    const left = Math.max(0, s[C.duration] - s[E.t]);
    const m = Math.floor(left / 60);
    const sec = Math.floor(left % 60);
    this.set("time", `${m}:${String(sec).padStart(2, "0")}`, (v) => ($("time-left").textContent = `${v} left`));
    this.set("sun", Math.round((s[E.t] / s[C.duration]) * 200), (v) => {
      const k = v / 200;
      $("sun-dot").style.left = `${k * 100}%`;
      $("sun-dot").style.bottom = `${Math.sin(k * Math.PI) * 18}px`;
    });
    const warn = s[E.phaseLeft] < 4 && s[E.nextPhase] === 1 && s[E.phase] !== 1;
    const phaseText = warn ? `Bubbly in ${Math.ceil(s[E.phaseLeft])}…` : PHASE_LABEL[s[E.phase]];
    this.set("phase", phaseText, (v) => {
      const chip = $("phase-chip");
      chip.textContent = v;
      chip.className = "phase-chip" + (warn ? " warn" : s[E.phase] === 1 ? " bubbly" : s[E.phase] === 2 ? " sleepy" : "");
    });
    this.set("bank", Math.floor(s[E.bank]), (v) => ($("hud-bank").textContent = v));

    for (const mate of this.mates) {
      const a = Math.round(bee(s, mate.i, "allergy"));
      const status = bee(s, mate.i, "status");
      this.set(`a${mate.i}`, a, (v) => {
        mate.bar.style.width = `${v}%`;
        mate.bar.className = v >= 70 ? "high" : v >= 40 ? "mid" : "";
        mate.meter.setAttribute("aria-valuenow", v);
      });
      const friend = mate.i !== this.you && bee(s, mate.i, "human") === 1;
      this.set(`h${mate.i}`, friend, (v) => {
        mate.li.classList.toggle("friend", v);
        mate.li.querySelector(".mate-name").textContent = mate.i === this.you ? "You" : v ? `${NAMES[mate.i]} ★` : NAMES[mate.i];
      });
      let label = "";
      if (status === STATUS.resting) label = "resting on a leaf";
      else if (status === STATUS.homeTrip) label = "flying home";
      else if (mate.role === ROLE.forager) label = `${Math.floor(bee(s, mate.i, "cargo"))} nectar`;
      else if (mate.role === ROLE.tank) label = bee(s, mate.i, "soothed") > 0 ? "soothed" : "dancing";
      else label = `${Math.floor(s[E.salves])} salves`;
      this.set(`s${mate.i}`, label, (v) => {
        mate.state.textContent = v;
        mate.li.classList.toggle("resting", status === STATUS.resting);
        mate.li.classList.toggle("away", status === STATUS.homeTrip);
      });
    }
  }

  toast(t, key = t.text) {
    const now = performance.now();
    if (now - (this.lastToast.get(key) || 0) < 2500) return;
    this.lastToast.set(key, now);
    while (this.toasts.children.length >= 3) this.toasts.firstElementChild.remove();
    const p = document.createElement("p");
    p.className = `toast ${t.tone || ""}`;
    p.textContent = t.text;
    this.toasts.append(p);
    setTimeout(() => p.remove(), 3100);
  }

  clearToasts() { this.toasts.replaceChildren(); }
}
