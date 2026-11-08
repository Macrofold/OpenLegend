/** Coarse outward vocabulary shared by Source sensing and its native family.
 * Values describe received appearance; they never disclose private physiology. */
export const BASE_OBSERVATION_RULES = {
  id: 'wilderness:observation-rules',
  version: 1,
  outward: {
    incapacitated: 'incapacitated',
    alive: 'alive',
    dead: 'dead',
    burning: 'burning',
    unlit: 'unlit',
    materialPresent: 'material present',
    depleted: 'depleted',
    harvested: 'harvested',
    unharvested: 'unharvested',
  },
} as const;
