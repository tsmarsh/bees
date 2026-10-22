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
import { PartyClient } from "./net/party.js";

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
// ?fast=N runs the garden N times faster: for playtesting the end of a visit, not for playing.
const FAST = Math.max(1, Math.min(20, Number(new URLSearchParams(location.search).get("fast")) || 1));
const VIEWS = { [ROLE.tank]: TankView, [ROLE.forager]: ForagerView, [ROLE.healer]: HealerView };

const app = {
  sim: null,          // the encounter of the visit in progress: the local Sim, or a party's RemoteSim
  localSim: null,
  party: null,        // a PartyClient while in a garden party
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
  if (!app.localSim) return;
  stopCelebration();
  const h = app.hive;
  h.role = role;
  h.foragers = foragers;
  saveHive(h);
  app.sim = app.localSim;
  const seed = (Date.now() % 2147483000) + 1;
  app.sim.init({ seed, foragers, humanRole: role, gear: gearMask(h) });
  beginVisit(role, humanSlot(role), foragers, false);
}

// A party's visit: the server runs the encounter; this browser plays the seat it was given.
function startPartyVisit(seat) {
  stopCelebration();
  app.sim = app.party.sim;
  const role = seat === 0 ? ROLE.tank : seat === 1 ? ROLE.healer : ROLE.forager;
  const foragers = [2, 3, 4].filter((i) => app.sim.bee(i, "active")).length;
  beginVisit(role, seat, foragers, true);
}

function beginVisit(role, you, foragers, party) {
  const h = app.hive;
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

  app.visit = { role, you, foragers, party, prev: app.sim.snapshot(), events: new EventDetector(), acc: 0, last: performance.now(), paused: false, ending: 0, done: false };
  $("head-home").hidden = party && !app.party.lobby?.host;
  $("leave-visit").hidden = !party;
  $("pause-text").textContent = party
    ? "The visit carries on with your friends while you take a breather. If you leave, an NPC bee takes over your role."
    : "The garden waits for you. Everyone's nectar is safe.";
  app.audio.setEnabled(h.sound);
  app.audio.start();
  requestAnimationFrame(frame);
}

function frame(now) {
  const v = app.visit;
  if (!v || v.done) return;
  const dt = Math.min(0.1, (now - v.last) / 1000);
  v.last = now;
  // a party's visit never pauses: the garden carries on, and the pause dialog is only a breather for you
  if (!v.paused || v.party) {
    if (v.party) {
      app.sim.step();
    } else if (!v.ending) {
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
  if (!v.party) app.audio.pause();
  $("pause-dialog").showModal();
}

function resume() {
  const v = app.visit;
  if ($("pause-dialog").open) $("pause-dialog").close();
  if (!v || !v.paused) return;
  v.paused = false;
  v.last = performance.now();
  if (!v.party) app.audio.resume();
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
  $("visit-again").textContent = v.party ? "Back to the party" : "Visit Sunny again";
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
  $("visit-again").addEventListener("click", () => {
    if (app.party) { if (app.party.lobby?.host) app.party.say({ t: "again" }); showLobby(); }
    else startVisit(app.hive.role, app.hive.foragers);
  });
  $("back-to-hive").addEventListener("click", () => { leaveParty(); showHive(); });
  $("leave-visit").addEventListener("click", () => { if ($("pause-dialog").open) $("pause-dialog").close(); endVisitView(); leaveParty(); showHive(); });
  $("cheer-button").addEventListener("click", cheer);
  $("party-create").addEventListener("click", createParty);
  $("party-join").addEventListener("submit", (e) => { e.preventDefault(); joinParty($("party-code").value.trim().toUpperCase()); });
  $("lobby-roles").addEventListener("change", (e) => app.party?.say({ t: "seat", role: e.target.value }));
  $("lobby-foragers").addEventListener("change", (e) => app.party?.say({ t: "settings", foragers: Number(e.target.value) }));
  $("lobby-start").addEventListener("click", () => app.party?.say({ t: "start" }));
  $("lobby-leave").addEventListener("click", () => { leaveParty(); showHive(); });
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
    app.localSim = new Sim(x);
    app.sim = app.localSim;
    start.disabled = false;
    status("");
    const code = new URLSearchParams(location.search).get("party");
    if (code) joinParty(code.toUpperCase());
  } catch (err) {
    console.error(err);
    status("The garden couldn't wake up: this browser needs WebAssembly. Please try a recent Safari, Chrome or Firefox.");
  }
}

// ---------------------------------------------------------------- garden parties
function partyNote(text) { $("party-note").textContent = text; }

async function createParty() {
  leaveParty();
  partyNote("Setting up the party…");
  const client = watchParty(new PartyClient());
  try {
    await client.create(app.hive.foragers, gearMask(app.hive));
    partyNote("");
  } catch {
    partyNote("Garden parties need the Allerbees server on this network: run make serve and open the address it prints.");
    app.party = null;
  }
}

async function joinParty(code) {
  if (!/^[A-Z]{4}$/.test(code)) { partyNote("A party code is four letters."); return; }
  leaveParty();
  partyNote("Finding the party…");
  const client = watchParty(new PartyClient());
  try {
    await client.join(code, gearMask(app.hive));
  } catch {
    partyNote("Garden parties need the Allerbees server on this network: run make serve and open the address it prints.");
    app.party = null;
  }
}

function watchParty(client) {
  app.party = client;
  client.addEventListener("lobby", (e) => onLobby(e.detail));
  client.addEventListener("state", () => maybeJoinVisit());
  client.addEventListener("cheer", (e) => { if (e.detail.seat !== app.visit?.you) receiveCheer(e.detail.seat); });
  client.addEventListener("error", (e) => { partyNote(e.detail.text); $("lobby-status").textContent = e.detail.text; });
  client.addEventListener("closed", () => {
    if (app.party !== client) return;
    app.party = null;
    if (app.visit && app.visit.party && !app.visit.done) { endVisitView(); showHive(); partyNote("The party's connection was lost. Your hive is safe; start or join again any time."); }
    else if (!$("screen-lobby").hidden) { showHive(); partyNote("The party's connection was lost."); }
  });
  return client;
}

function leaveParty() {
  if (!app.party) return;
  const p = app.party;
  app.party = null;
  p.leave();
}

function onLobby(lobby) {
  partyNote("");
  const inVisit = app.visit && app.visit.party && !app.visit.done;
  if (inVisit) return;
  if (!$("screen-celebrate").hidden && lobby.phase !== "visit") return;
  if (lobby.phase === "visit" && app.party.mySeat !== null) { maybeJoinVisit(); return; }
  if ($("screen-lobby").hidden) showLobby();
  else renderLobby();
}

function maybeJoinVisit() {
  const p = app.party;
  if (!p || !p.hasState || p.lobby?.phase !== "visit" || p.mySeat === null) return;
  if (app.visit && app.visit.party && !app.visit.done) return;
  startPartyVisit(p.mySeat);
}

function showLobby() {
  renderLobby();
  show("screen-lobby", `Garden party ${app.party?.code || ""}: Allerbees`, "lobby-title");
}

const SEAT_ROLE = (seat) => (seat === 0 ? "tank" : seat === 1 ? "healer" : "forager");

function renderLobby() {
  const p = app.party;
  if (!p || !p.lobby) return;
  const L = p.lobby;
  $("lobby-code").textContent = L.code;
  $("lobby-code-2").textContent = L.code;
  // localhost only works on this machine: offer the server's network address instead when we have one
  const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
  $("lobby-link").textContent = local && p.lan?.length ? p.lan[0] : location.host;
  const seats = $("seats");
  seats.replaceChildren();
  const taken = new Map(L.seats.filter((s) => s.seat !== null).map((s) => [s.seat, s.id]));
  for (let slot = 0; slot < 2 + L.foragers; slot++) {
    const li = document.createElement("li");
    const who = taken.get(slot);
    li.className = "seat" + (who ? " friend" : "") + (who === L.you ? " mine" : "");
    const role = SEAT_ROLE(slot);
    li.innerHTML = `<span><strong>${NAMES[slot]}</strong>, the ${role}</span><span class="seat-who">${who === L.you ? "you" : who ? "a friend" : "an NPC bee"}</span>`;
    seats.append(li);
  }
  const mine = p.mySeat;
  for (const input of document.querySelectorAll("input[name=lobby-role]")) {
    const role = input.value;
    input.checked = mine !== null && SEAT_ROLE(mine) === role;
    const free = role === "tank" ? !taken.has(0) : role === "healer" ? !taken.has(1) : [2, 3, 4].slice(0, L.foragers).some((s) => !taken.has(s));
    input.disabled = !free && !input.checked;
  }
  for (const input of document.querySelectorAll("input[name=lobby-foragers]")) {
    input.checked = Number(input.value) === L.foragers;
    input.disabled = !L.host || L.phase === "visit";
  }
  const humans = L.seats.length;
  let text;
  if (L.phase === "visit") text = mine === null ? "A visit is under way! Pick a free role to drop in." : "Joining the visit…";
  else if (mine === null) text = "Pick a role to play.";
  else if (L.host) text = humans > 1 ? `${humans} bees are here. Fly when you're ready!` : "Waiting for friends, or fly now with NPC bees.";
  else text = "Waiting for the host to start the visit…";
  $("lobby-status").textContent = text;
  $("lobby-start").hidden = !L.host || L.phase === "visit";
  $("lobby-start").disabled = mine === null;
}

function endVisitView() {
  const v = app.visit;
  if (!v || v.done) return;
  v.done = true;
  app.audio.stop();
  if (app.view) { app.view.dispose(); app.view = null; }
}

// ---------------------------------------------------------------- cheers: warm, wordless, for everyone
function cheer() {
  const v = app.visit;
  if (!v) return;
  app.view?.cheer?.();
  app.audio.sfx("highfive");
  if (v.party) app.party?.say({ t: "cheer", kind: "heart" });
  else {
    // the NPCs cheer back
    const mates = [0, 1, 2, 3, 4].filter((i) => i !== v.you && app.sim.bee(i, "active"));
    const who = mates[Math.floor(Math.random() * mates.length)];
    setTimeout(() => receiveCheer(who), 500 + Math.random() * 700);
  }
}

function receiveCheer(seat) {
  if (!app.visit || app.visit.done || seat === undefined) return;
  app.hud.toast({ text: `${NAMES[seat]} cheers you on! ♥`, tone: "joy" }, `cheer-${seat}`);
  app.view?.cheer?.();
}

// For tests and the curious: window.allerbees.
window.allerbees = { app, startVisit, STATUS };
window.__autoplay = () => app.view?.autopilot?.();
boot();
