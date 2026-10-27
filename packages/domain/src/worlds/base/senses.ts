import type { SenseDefinition } from '../../perception.js';

export const PERCEPTION_RULES = { sightRadius: 28 } as const;
export const DETECTION_SUPPORT_POLICY = {
  id: 'wilderness:detection-support',
  version: 1,
  threshold: 1,
  maximum: 1,
  fullStrengthSeconds: 0.25,
  decaySeconds: 0.5,
} as const;
/** Mere scenery/animal reappearance belongs to current sight, not durable recollection.
 * Social sightings remain evidence without requiring thought; interests and actual changes
 * still drive attention. Richer salience remains EPR06, not a physical visibility rule.
 * docs/memory-architecture.md#encounters-sensory-detail-and-reminder-continuity */
export const SIGHTING_POLICY = {
  retainRoutineOnset: false,
  social: { importance: 3, urgency: 0, semanticTrigger: false },
  /** Losing sight of someone is evidence at the same weight as seeing them arrive. */
  departure: { importance: 3, urgency: 0, semanticTrigger: false },
  routine: { importance: 0, urgency: 0, semanticTrigger: false },
  changedBeing: { importance: 6, urgency: 2, semanticTrigger: true },
  /** One arrival and one departure record per subject per window; later comings and goings
   * within it stay current visibility only (docs/limits/cognition.md#cg10). */
  recordWindowSeconds: 3600,
  /** A return this soon after actual sensory loss keeps encounter correlation.
   * Native live body/detail leases still end immediately, independent of story quotas. */
  episodeGraceSeconds: 0.5,
} as const;
/** Ongoing perceived conditions (EPR06). A fire or an incapacitated being stays salient while
 * in view; a body currently ranks earlier in optional attention only, because bodies are not
 * yet in visual exposure. The base world forces nothing into context and schedules no
 * periodic review: no mandatory paid thought.
 * docs/limits/cognition.md#cg11 */
export const STIMULUS_POLICY = {
  salience: { burning: 2, incapacitated: 3, dead: 3 },
  noveltySeconds: 60,
  limit: 8,
} as const;
export const DEFAULT_SENSES: SenseDefinition[] = [
  {
    id: 'wilderness:vision',
    version: 1,
    implementation: 'vision-geometry-v1',
    routineTiming: 'cadence',
    radius: 28,
    sampleSeconds: 3,
  },
  { id: 'wilderness:hearing', version: 1, implementation: 'hearing-db-v1', hearingFloorDbSpl: 0 },
];
