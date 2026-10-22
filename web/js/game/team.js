// Who is in the party. Bee slots: 0 tank, 1 healer, 2..4 foragers; the human's forager is always slot 2.
import { ROLE } from "../sim/layout.js";

export const NAMES = ["Bumble", "Hazel", "Pip", "Clover", "Dot"];
export const ROLE_NAMES = { [ROLE.tank]: "tank", [ROLE.healer]: "healer", [ROLE.forager]: "forager" };

export function humanSlot(role) {
  if (role === ROLE.tank) return 0;
  if (role === ROLE.healer) return 1;
  return 2;
}

export function nameOf(slot, youSlot) { return slot === youSlot ? "You" : NAMES[slot]; }
