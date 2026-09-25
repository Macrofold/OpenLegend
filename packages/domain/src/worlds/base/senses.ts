import type { SenseDefinition } from '../../perception.js';

export const PERCEPTION_RULES = { sightRadius: 28, hearingRadius: 10 } as const;
export const DEFAULT_SENSES: SenseDefinition[] = [
  {
    id: 'wilderness:vision',
    version: 1,
    implementation: 'vision-geometry-v1',
    radius: 28,
    acquisitionIntervalSeconds: 4,
  },
  { id: 'wilderness:hearing', version: 1, implementation: 'hearing-db-v1', hearingFloorDbSpl: 0 },
];
