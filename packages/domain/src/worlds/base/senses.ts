import type { Entity } from '../../types.js';
import type { ObservedBody } from '../../perception-evidence.js';
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
/** Routine presence belongs to current sight and attended chronology. Only a
 * meaningful received outward change produces a narrative notice. */
export const SIGHTING_POLICY = {
  routine: { importance: 0, urgency: 0, semanticTrigger: false },
  changedBeing: { importance: 6, urgency: 2, semanticTrigger: true },
  episodeGraceSeconds: 0.5,
} as const;
export function changedOutwardNotice(
  before: ObservedBody,
  after: ObservedBody,
): string | undefined {
  if (
    before.kind === after.kind &&
    before.appearance === after.appearance &&
    before.activity === after.activity &&
    before.outward.every((state, index) => state === after.outward[index]) &&
    (after.outward[0] || before.label?.name === after.label?.name)
  )
    return;
  return [after.outward[0] ? '' : after.label?.name, after.kind, after.appearance, ...after.outward]
    .filter(Boolean)
    .join(', ');
}
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

export function baseOutwardActivity(entity: Entity): string | undefined {
  const action = entity.actor?.action;
  return action && ['strike', 'hunt', 'aim', 'shoot-once'].includes(action.type)
    ? JSON.stringify([action.id, action.type, action.stage, action.strikePhase ?? 'preparing'])
    : undefined;
}
