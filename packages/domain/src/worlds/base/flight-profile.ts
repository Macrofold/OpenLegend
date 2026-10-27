/** Actual ground refuges on distinct sides of the clearing. Their support and
 * height are resolved by the shared initializer, never copied from the bird. */
export const BASE_BIRD_REFUGES = {
  west: { x: 12, z: 34.5, altitude: 4.5 },
  east: { x: 28, z: 20, altitude: 5.5 },
} as const;

export const BASE_BIRD_REFUGE_CLEARANCE = 1.5;
