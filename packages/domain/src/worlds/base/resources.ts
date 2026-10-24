/** Shared authored gathering durations for the ordinary camp and created openings.
 * Fewer completions reduce repeated simulation/save work at a lower production rate.
 * Quantities and placements remain properties of each selected resource patch.
 * docs/worlds/base/time.md#everyday-work-durations
 * docs/worlds/base/playable-openings.md#fresh-construction
 */
export const BASE_GATHERING_POLICY = { bareHandQuantity: 2 } as const;
export const BASE_RESOURCE_GATHERING_SECONDS = {
  raw_fiber: 720,
  wood: 840,
  stone: 480,
  berries: 600,
} as const;
