// The encounter's state array, slot by slot. Mirrors sim/allerbees/abi.fib and model.fib; tests/sim.test.mjs holds them together.
export const STATE_SIZE = 110;

export const E = {
  t: 0, rng: 1, phase: 2, phaseLeft: 3, nextPhase: 4, ended: 5, bank: 6, spilled: 7, gathered: 8,
  salves: 9, salveClock: 10, window: 11, gear: 12, beats: 13, misses: 14, showstoppers: 15, clouds: 16,
};
export const F = { affection: 17, focus: 18, corridor: 19, pollen: 20, lean: 21, delight: 22, worried: 23 };
export const BEE_BASE = 24;
export const BEE_STRIDE = 16;
export const B = {
  role: 0, active: 1, human: 2, allergy: 3, soothed: 4, status: 5, timer: 6, cargo: 7, capacity: 8,
  distance: 9, combo: 10, soothes: 11, slips: 12, deliveries: 13, banked: 14, clock: 15,
};
export const C = { duration: 104, salveMax: 105, showstopperCombo: 106, cloudCost: 107, corridorFloor: 108, beatInterval: 109 };

export const ROLE = { tank: 0, healer: 1, forager: 2 };
export const STATUS = { working: 0, resting: 1, homeTrip: 2, finished: 3 };
export const PHASE = { calm: 0, bubbly: 1, sleepy: 2, finale: 3 };
export const ENDED = { no: 0, sunset: 1, choseHome: 2, unwell: 3 };
export const GEAR = { satchel: 1, shoes: 2, sling: 4 };
export const TANK_KIND = { tap: 0, hold: 1, swirl: 2, showstopper: 3 };

// Bee slots: 0 tank, 1 healer, 2..4 foragers. A human forager is always slot 2.
export const TANK = 0;
export const HEALER = 1;
export const FORAGERS = [2, 3, 4];
