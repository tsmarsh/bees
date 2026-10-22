// Allerbees: the hive, a visit, and the celebration after it. One human role, NPC bees in the others, one shared
// encounter simulated by the fibber module in sim.wasm. Each role is a different game drawn from the same state.
import { loadSim, Sim } from "./sim/sim.js";
import { E, ROLE, ENDED, STATUS } from "./sim/layout.js";
import { EventDetector } from "./game/events.js";
import { toastFor } from "./game/voice.js";
import { Hud } from "./game/hud.js";
import { Audio, buzz } from "./game/audio.js";
import { NAMES, humanSlot, ROLE_NAMES } from "./game/team.js";
import { loadHive, saveHive, gearMask, buyGear, toggleGear, GEAR_ITEMS, flowerNote, improvementNote } from "./game/hive.js";
import { TankView } from "./views/tank.js";
import { ForagerView } from "./views/forager.js";
import { HealerView } from "./views/healer.js";
import { Celebration } from "./views/celebrate.js";

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
// ?fast=N runs the garden N times faster: for playtesting the end of a visit, not for playing.
const FAST = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get("fast")) || 1));
const VIEWS = { [ROLE.tank]: TankView, [ROLE.forager]: ForagerView, [ROLE.healer]: HealerView };

const app = {
  sim: null,
  hive: loadHive(),
  audio: new Audio(),
  hud: new Hud(),
  view: null,
  visit: null,
  celebration: null,
};

// ---------------------------------------------------------------- screens
function show(id, title, focusId) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  document.title = title;
  const f = $(focusId);
  if (f) f.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function showHive() {
  stopCelebration();
  renderHive();
  show("screen-hive", "Allerbees: the hive", "hive-title");
  if (location.hash) history.replaceState(null, "", location.pathname);
}

function renderHive() {
  const h = app.hive;
  $("pantry-total").textContent = h.pot;
  $("flower-note").textContent = flowerNote(h.visits);
  const form = $("visit-form");
  const roleInput = form.querySelector(`input[name=role][value="${h.role}"]`);
  if (roleInput) roleInput.checked = true;
  const fInput = form.querySelector(`input[name=foragers][value="${h.foragers}"]`);
  if (fInput) fInput.checked = true;
  const sound = $("sound-toggle");
  sound.setAttribute("aria-pressed", String(h.sound));
  sound.textContent = h.sound ? "Sound on" : "Sound off";

  const list = $("gear-list");
  list.replaceChildren();
  for (const g of GEAR_ITEMS) {
    const li = document.createElement("li");
    li.className = "gear";
    const owned = h.owned.includes(g.id);
    const on = h.equipped.includes(g.id);
    li.innerHTML = `<span class="gear-name">${g.name}</span><span class="gear-what">${g.what}</span>`;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "button tiny";
    if (!owned) {
      b.textContent = `Make it: ${g.cost}`;
      b.disabled = h.pot < g.cost;
      b.setAttribute("aria-label", `Make ${g.name} for ${g.cost} nectar`);
      b.addEventListener("click", () => {
        if (buyGear(h, g.id)) { saveHive(h); renderHive(); status(`${g.name} is ready, and you're wearing it.`); list.querySelector(`[data-gear="${g.id}"]`)?.focus(); }
      });
    } else {
      b.textContent = on ? "Wearing" : "Wear it";
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute("aria-label", `Wear ${g.name}`);
      b.addEventListener("click", () => { toggleGear(h, g.id); saveHive(h); renderHive(); list.querySelector(`[data-gear="${g.id}"]`)?.focus(); });
    }
    b.dataset.gear = g.id;
    li.append(b);
    list.append(li);
  }
}

function status(text) { $("loading-note").textContent = text; }

// ---------------------------------------------------------------- a visit
function startVisit(role, foragers) {
  if (!app.sim) return;
  stopCelebration();
  const h = app.hive;
  h.role = role;
  h.foragers = foragers;
  saveHive(h);
  const you = humanSlot(role);
  const seed = (Date.now() % 2147483000) + 1;
  app.sim.init({ seed, foragers, humanRole: role, gear: gearMask(h) });

  show("screen-visit", `Visiting Sunny as the ${ROLE_NAMES[role]}: Allerbees`, "visit-title");
  app.hud.setup(app.sim.s, you);
  app.hud.clearToasts();
  $("hud-role").replaceChildren();

  if (app.view) app.view.dispose();
  const View = VIEWS[role];
  app.view = new View({ canvas: $("canvas"), sim: app.sim, audio: app.audio, you, hudRoot: $("hud-role") });
  $("role-help").textContent = app.view.help;
  $("canvas").setAttribute("aria-label", app.view.label);
  $("canvas").tabIndex = 0;
  $("canvas").focus({ preventScroll: true });

  app.visit = { role, you, foragers, prev: app.sim.snapshot(), events: new EventDetector(), acc: 0, last: performance.now(), paused: false, ending: 0, done: false };
  app.audio.setEnabled(h.sound);
  app.audio.start();
  requestAnimationFrame(frame);
}

function frame(now) {
  const v = app.visit;
  if (!v || v.done) return;
  const dt = Math.min(0.1, (now - v.last) / 1000);
  v.last = now;
  if (!v.paused) {
    if (!v.ending) {
      v.acc += dt * FAST;
      let steps = 0;
      while (v.acc >= STEP && steps < 6 * FAST) {
        app.view.beforeStep?.(STEP);
        app.sim.step(STEP);
        v.acc -= STEP;
        steps++;
      }
      if (steps === 6 * FAST) v.acc = 0;
    }
    const cur = app.sim.snapshot();
    for (const ev of v.events.diff(v.prev, cur)) handleEvent(ev, v);
    v.prev = cur;
    app.audio.setIntensity(cur[E.phase] === 1 ? 0.9 : cur[E.phase] === 2 ? 0.25 : 0.55);
    app.hud.update(cur);
    app.view.update(dt, cur);
    if (v.ending) {
      v.ending -= dt;
      if (v.ending <= 0) { finishVisit(); return; }
    }
  }
  app.view.render();
  requestAnimationFrame(frame);
}

function handleEvent(ev, v) {
  app.view.onEvent(ev);
  const t = toastFor(ev, v.role, v.you);
  if (t) app.hud.toast(t);
  if (ev.slot === v.you) {
    if (ev.kind === "soothed") { app.audio.sfx("splat"); buzz(15); }
    if (ev.kind === "tap-out") { app.audio.sfx("sneeze"); buzz([40, 30, 80]); }
  }
  if (ev.kind === "showstopper") app.audio.sfx("fanfare");
  if (ev.kind === "cloud") app.audio.sfx("cloud");
  if (ev.kind === "ended") {
    v.ending = 1.6;
    app.hud.toast({ text: ev.reason === ENDED.choseHome ? "Heading home together…" : ev.reason === ENDED.unwell ? "Everyone's a bit sneezy. Time to head home and rest." : "The sun is setting. Time to fly home!", tone: "care" });
  }
}

function pause() {
  const v = app.visit;
  if (!v || v.paused || v.done) return;
  v.paused = true;
  app.audio.pause();
  $("pause-dialog").showModal();
}

function resume() {
  const v = app.visit;
  if ($("pause-dialog").open) $("pause-dialog").close();
  if (!v || !v.paused) return;
  v.paused = false;
  v.last = performance.now();
  app.audio.resume();
  $("canvas").focus({ preventScroll: true });
}

function headHome() {
  if ($("pause-dialog").open) $("pause-dialog").close();
  if (!app.visit) return;
  app.sim.groupHome();
  resume();
}

function finishVisit() {
  const v = app.visit;
  v.done = true;
  app.audio.stop();
  const s = app.sim.snapshot();
  const bank = Math.floor(s[E.bank]);
  const h = app.hive;
  h.pot += bank;
  h.visits += 1;
  const stats = app.view.stats();
  const note = improvementNote(h, v.role, stats);
  saveHive(h);
  app.view.dispose();
  app.view = null;

  $("celebrate-bank").textContent = bank;
  $("flower-says").textContent = sunnySays(s, h.visits);
  $("private-note").textContent = note;
  const thanks = $("thanks");
  thanks.replaceChildren();
  for (const line of thankYous(s, v.you)) {
    const li = document.createElement("li");
    li.innerHTML = line;
    thanks.append(li);
  }
  $("celebrate-status").textContent = "";
  show("screen-celebrate", `${bank} nectar home: Allerbees`, "celebrate-title");
  app.celebration = new Celebration($("celebrate-canvas"), { bank, foragers: v.foragers, you: v.you, role: v.role });
  app.celebration.start();
}

function stopCelebration() {
  if (app.celebration) { app.celebration.stop(); app.celebration = null; }
}

function sunnySays(s, visits) {
  const lines = [
    "Sunny: “That was the best visit! Please come back soon!”",
    "Sunny: “I saved my sunniest petals for you. Come again tomorrow?”",
    "Sunny: “Oh, you're leaving already? Come back soon, little friends!”",
  ];
  if (s[E.ended] === ENDED.unwell) return "Sunny: “I'm so sorry about all the sneezing. Rest up, and please come back soon!”";
  return lines[visits % lines.length];
}

// Warm, specific and collective: what each bee did for the others. No ranks, no scores per bee.
function thankYous(s, you) {
  const out = [];
  const bee = (i, f) => app.sim.bee(i, f);
  const name = (i) => (i === you ? "You" : NAMES[i]);
  out.push(`<strong>${name(0)}</strong> kept Sunny ${s[E.showstoppers] > 0 ? "swooning with a showstopper" : "giggling and grinning"}, so the foragers had room to fly.`);
  out.push(`<strong>${name(1)}</strong> ${s[E.clouds] > 0 ? "sent honey clouds and salves" : "lobbed soothing salves"} to every sneezy bee.`);
  const fs = [2, 3, 4].filter((i) => bee(i, "active"));
  const fNames = fs.map(name);
  const joined = fNames.length > 1 ? `${fNames.slice(0, -1).join(", ")} and ${fNames.at(-1)}` : fNames[0];
  out.push(`<strong>${joined}</strong> flew the lines and carried every drop home.`);
  return out;
}

// ---------------------------------------------------------------- wiring
function wire() {
  $("visit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    startVisit(Number(data.get("role")), Number(data.get("foragers")));
  });
  $("sound-toggle").addEventListener("click", () => {
    app.hive.sound = !app.hive.sound;
    saveHive(app.hive);
    renderHive();
  });
  $("pause-button").addEventListener("click", pause);
  $("resume").addEventListener("click", resume);
  $("head-home").addEventListener("click", headHome);
  $("pause-dialog").addEventListener("cancel", (e) => { e.preventDefault(); resume(); });
  $("visit-again").addEventListener("click", () => startVisit(app.hive.role, app.hive.foragers));
  $("back-to-hive").addEventListener("click", showHive);
  $("high-five").addEventListener("click", () => {
    app.audio.ensure();
    if (app.audio.ctx?.state === "suspended") app.audio.ctx.resume();
    app.audio.sfx("highfive");
    buzz(30);
    app.celebration?.highFive();
    $("celebrate-status").textContent = "High five! Everyone high-fives you back.";
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && app.visit && !app.visit.done && !app.visit.paused) { e.preventDefault(); pause(); }
  });
}

async function boot() {
  wire();
  renderHive();
  show("screen-hive", "Allerbees: the hive", "hive-title");
  const start = $("start-visit");
  start.disabled = true;
  status("Waking the garden…");
  try {
    const x = await loadSim(new URL("../sim.wasm", import.meta.url));
    app.sim = new Sim(x);
    start.disabled = false;
    status("");
  } catch (err) {
    console.error(err);
    status("The garden couldn't wake up: this browser needs WebAssembly. Please try a recent Safari, Chrome or Firefox.");
  }
}

// For tests and the curious: window.allerbees.
window.allerbees = { app, startVisit, STATUS };
window.__autoplay = () => app.view?.autopilot?.();
boot();
