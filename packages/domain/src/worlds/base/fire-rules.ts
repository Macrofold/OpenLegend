/** Authored fire work, spending and visible observation precision. */
export const BASE_FIRE_CARE = {
  light: { workSeconds: 150 },
  fuel: { workSeconds: 20, secondsPerUnit: 3600, maximumFuelSeconds: 172800 },
  extinguish: { workSeconds: 30 },
} as const;
export const BASE_LOW_FUEL_SECONDS = 3600;
