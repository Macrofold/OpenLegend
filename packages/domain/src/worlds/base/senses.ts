import type { SenseDefinition } from '../../perception.js';

export const PERCEPTION_RULES = { sightRadius: 28 } as const;
/** Mere scenery/animal reappearance belongs to current sight, not durable recollection.
 * Social sightings remain evidence without requiring thought; interests and actual changes
 * still drive attention. Richer salience remains EPR06, not a physical visibility rule.
 * docs/memory-architecture.md#encounters-sensory-detail-and-reminder-continuity */
export const SIGHTING_POLICY = {
  retainRoutineOnset: false,
  social: { importance: 3, urgency: 0, semanticTrigger: false },
  routine: { importance: 0, urgency: 0, semanticTrigger: false },
  changedBeing: { importance: 6, urgency: 2, semanticTrigger: true },
} as const;
export const DEFAULT_SENSES: SenseDefinition[] = [
  {
    id: 'wilderness:vision',
    version: 1,
    implementation: 'vision-geometry-v1',
    radius: 28,
  },
  { id: 'wilderness:hearing', version: 1, implementation: 'hearing-db-v1', hearingFloorDbSpl: 0 },
];
