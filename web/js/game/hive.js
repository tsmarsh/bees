// The hive's memory on this device: the communal pot, the gear hive mates have made, how often you've visited Sunny,
// and your own previous bests (kept private; only ever used to notice that you improved). Browser storage can be
// unavailable, so every read and write is guarded and the game works without it.
import { GEAR } from "../sim/layout.js";

const KEY = "allerbees.hive.v1";

const BLANK = { pot: 0, visits: 0, owned: [], equipped: [], bests: {}, sound: true, role: 2, foragers: 3 };

export const GEAR_ITEMS = [
  { id: "satchel", bit: GEAR.satchel, name: "A roomy satchel", what: "Foragers carry half as much again before heading home.", cost: 60 },
  { id: "shoes", bit: GEAR.shoes, name: "Tap-dancing shoes", what: "The tank's timing windows are a quarter wider.", cost: 60 },
  { id: "sling", bit: GEAR.sling, name: "Grandma Bee's sling", what: "The healer's salves refill faster.", cost: 60 },
];

export function loadHive() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...BLANK, ...JSON.parse(raw) };
  } catch { /* storage unavailable: start fresh */ }
  return structuredClone(BLANK);
}

export function saveHive(hive) {
  try { localStorage.setItem(KEY, JSON.stringify(hive)); } catch { /* fine: this visit still counts on screen */ }
}

export function gearMask(hive) {
  return GEAR_ITEMS.filter((g) => hive.equipped.includes(g.id)).reduce((m, g) => m | g.bit, 0);
}

export function buyGear(hive, id) {
  const item = GEAR_ITEMS.find((g) => g.id === id);
  if (!item || hive.owned.includes(id) || hive.pot < item.cost) return false;
  hive.pot -= item.cost;
  hive.owned.push(id);
  hive.equipped.push(id);
  return true;
}

export function toggleGear(hive, id) {
  if (!hive.owned.includes(id)) return;
  hive.equipped = hive.equipped.includes(id) ? hive.equipped.filter((g) => g !== id) : [...hive.equipped, id];
}

// What Sunny remembers about you, by how many times you've visited.
export function flowerNote(visits) {
  if (visits === 0) return "Sunny has never met you. She is very excited.";
  if (visits === 1) return "Sunny remembers you! She has been practising her best smile.";
  if (visits < 4) return `Visit ${visits + 1}. Sunny saved her sunniest petals for you.`;
  if (visits < 8) return `Visit ${visits + 1}. Sunny hums your hive's song when you're away.`;
  return `Visit ${visits + 1}. Sunny says you're practically family now.`;
}

// Truthful, private, gentle: compare this visit with your own best in the same role. Returns a sentence or "".
export function improvementNote(hive, role, stats) {
  const key = ["tank", "healer", "forager"][role];
  if (!key) return "";
  const best = hive.bests[key] || {};
  const notes = [];
  let next = { ...best };
  if (role === 2) {
    if (best.distance && stats.distance > best.distance) notes.push("You flew farther than last time!");
    if (best.delivered && stats.delivered > best.delivered) notes.push("You carried home more than ever before.");
    next.distance = Math.max(best.distance || 0, stats.distance);
    next.delivered = Math.max(best.delivered || 0, stats.delivered);
  } else if (role === 0) {
    if (best.streak && stats.streak > best.streak) notes.push(`Your longest dance streak yet: ${stats.streak} in a row!`);
    if (best.showstoppers !== undefined && stats.showstoppers > best.showstoppers) notes.push("More showstoppers than ever!");
    next.streak = Math.max(best.streak || 0, stats.streak);
    next.showstoppers = Math.max(best.showstoppers || 0, stats.showstoppers);
  } else if (role === 1) {
    if (best.landed && stats.landed > best.landed) notes.push("You landed more salves than ever before.");
    if (best.saves !== undefined && stats.saves > best.saves) notes.push("You helped more bees back on their wings than last time.");
    next.landed = Math.max(best.landed || 0, stats.landed);
    next.saves = Math.max(best.saves || 0, stats.saves);
  }
  hive.bests[key] = next;
  return notes.join(" ");
}
