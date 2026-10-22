// What the garden says out loud: one short, kind sentence for an event, phrased for the role you are playing,
// so each player can tell how their teammates changed their own game. Returns null when an event isn't worth a toast.
import { ROLE, PHASE, TANK, HEALER } from "../sim/layout.js";
import { nameOf } from "./team.js";

export function toastFor(ev, role, you) {
  const who = (slot) => nameOf(slot, you);
  const mine = (slot) => slot === you;
  switch (ev.kind) {
    case "soothed":
      // Only the bee who was soothed hears about it; the healer sees their own hits land in their game.
      if (mine(ev.slot)) return { text: `${who(HEALER)}'s salve landed on you. Ahh, better.`, tone: "care" };
      return null;
    case "delivery":
      if (mine(ev.slot)) return { text: `You took ${ev.amount} nectar home. It's safe in the pot!`, tone: "joy" };
      if (role === ROLE.healer && ev.amount >= 20) return null; // the honey toast covers it
      return { text: `${who(ev.slot)} took ${ev.amount} nectar home.`, tone: "joy" };
    case "honey-for-salves":
      if (role === ROLE.healer) return { text: `A big delivery! The hive sent you honey for ${ev.amount} more salves.`, tone: "joy" };
      return null;
    case "tap-out":
      if (mine(ev.slot)) return { text: "Too sneezy! Resting on a leaf for a moment. Your satchel is safe.", tone: "heads-up" };
      if (role === ROLE.healer) return { text: `${who(ev.slot)} is resting on a leaf. A salve will help them back sooner.`, tone: "heads-up" };
      if (ev.slot === TANK && role === ROLE.forager) return { text: "Bumble is resting. Sunny's attention is wandering, so fly carefully.", tone: "heads-up" };
      return { text: `${who(ev.slot)} is resting for a moment.`, tone: "heads-up" };
    case "back":
      if (mine(ev.slot)) return { text: "Back on your wings!", tone: "joy" };
      if (ev.slot === TANK && role === ROLE.forager) return { text: "Bumble's back and dancing!", tone: "joy" };
      return null;
    case "sneezy":
      if (role === ROLE.healer && !mine(ev.slot)) return { text: `${who(ev.slot)} is getting very sneezy!`, tone: "heads-up" };
      return null;
    case "showstopper":
      if (role === ROLE.tank) return { text: "SHOWSTOPPER! Sunny is swooning, and the foragers are soothed.", tone: "joy" };
      if (role === ROLE.forager) return { text: "Bumble's showstopper! Sunny is swooning: wide paths and a soothing breeze.", tone: "joy" };
      return { text: "Bumble's showstopper! Everyone breathes easier.", tone: "joy" };
    case "cloud":
      if (role === ROLE.healer) return null;
      return { text: `${who(HEALER)}'s honey cloud! Everyone is soothed.`, tone: "care" };
    case "paths-wide":
      if (role === ROLE.forager) return { text: `${who(TANK)} has Sunny delighted. Your path is wide open!`, tone: "joy" };
      if (role === ROLE.tank) return { text: "Sunny only has eyes for you. The foragers' paths are wide!", tone: "joy" };
      return { text: "Sunny is delighted with Bumble: the foragers are flying easy.", tone: "joy" };
    case "paths-narrow":
      if (role === ROLE.forager) return { text: "Sunny is getting curious about you. Paths are narrowing!", tone: "heads-up" };
      if (role === ROLE.tank) return { text: "Sunny's attention is wandering to the foragers. Win her back!", tone: "heads-up" };
      return { text: "Sunny is peeking at the foragers. They'll need you more.", tone: "heads-up" };
    case "phase-warning":
      return { text: "Sunny is getting bubbly! More pollen soon.", tone: "heads-up" };
    case "phase":
      if (ev.phase === PHASE.sleepy) return { text: "Sunny is getting sleepy. A breather for everyone.", tone: "care" };
      if (ev.phase === PHASE.finale) return { text: "The sun is getting low. One last big push!", tone: "joy" };
      if (ev.phase === PHASE.calm) return { text: "Sunny has calmed down.", tone: "care" };
      return null;
    case "worried":
      return { text: "Sunny noticed everyone is sneezy, and she's holding her breath for you.", tone: "care" };
    default:
      return null;
  }
}

export const PHASE_LABEL = {
  [PHASE.calm]: "Sunny is calm",
  [PHASE.bubbly]: "Sunny is bubbly!",
  [PHASE.sleepy]: "Sunny is sleepy",
  [PHASE.finale]: "Golden hour",
};
