import type { SenseDefinition } from '../../perception.js';
import { person, type Narration } from '../../narration.js';

/** Native sight wording stays world-authored; names bind to the received moment. */
export function sightingNarration(
  observerId: string,
  subjectId: string,
  detail?: string,
  departed = false,
): Narration {
  return {
    parts: [
      person(observerId),
      ' ',
      departed ? 'lost sight of ' : detail ? 'noticed ' : 'saw ',
      {
        entityId: subjectId,
        role: 'name',
        article: departed || detail ? 'definite' : 'indefinite',
      },
      !departed && detail ? `: ${detail}.` : '.',
    ],
  };
}

export const PERCEPTION_RULES = { sightRadius: 28 } as const;
/** One aligned ordinary-sight policy keeps broad discovery, detailed sampling and
 * contextual feature work on compatible opportunities. Physical effects and
 * occurrence-time hearing retain their independent exact boundaries. */
export const ORDINARY_SIGHT_TIMING = { broadSeconds: 20, detailSeconds: 10 } as const;
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
  /** The encounter wrapper has arrival weight; lasting admission remains separate. */
  departure: { importance: 3, urgency: 0, semanticTrigger: false },
  routine: { importance: 0, urgency: 0, semanticTrigger: false },
  changedBeing: { importance: 6, urgency: 2, semanticTrigger: true },
  /** Throttle narrative encounter wrappers, independently of actual current facts
   * and attended chronological capture (docs/limits/cognition.md#cg10). */
  recordWindowSeconds: 3600,
  /** A return this soon after actual sensory loss keeps encounter correlation.
   * Native live body/detail leases still end immediately, independent of story quotas. */
  episodeGraceSeconds: 0.5,
} as const;
/** Ongoing received-condition relevance (EPR06), separate from native detailed
 * attention. Visible fire, incapacity and death can favor optional context without
 * forcing paid thought. docs/limits/cognition.md#cg11 */
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
    sampleSeconds: ORDINARY_SIGHT_TIMING.broadSeconds,
    detailSampleSeconds: ORDINARY_SIGHT_TIMING.detailSeconds,
  },
  { id: 'wilderness:hearing', version: 1, implementation: 'hearing-db-v1', hearingFloorDbSpl: 0 },
];
