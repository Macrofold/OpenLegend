import { BASE_OBSERVATION_RULES } from './observation-rules.js';
import type { Entity } from '../../types.js';
import type { ObservedBody } from '../../perception-evidence.js';
import type { SenseDefinition } from '../../perception.js';

export const PERCEPTION_RULES = { sightRadius: 28 } as const;
/** One aligned ordinary-sight policy keeps broad discovery, detailed sampling and
 * contextual feature work on compatible opportunities. Physical effects and
 * occurrence-time hearing retain their independent exact boundaries. */
export const ORDINARY_SIGHT_TIMING = { broadSeconds: 60, detailSeconds: 30 } as const;
/** Context and native relation checks retain their faster cadence; they do not
 * purchase fresh body sight. BK24 qualifies this independently from ordinary sight. */
export const ORDINARY_CONTEXT_SECONDS = 20;
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
export const SIGHTING_POLICY = BASE_OBSERVATION_RULES.sighting;
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
  const rules = BASE_OBSERVATION_RULES.outwardActivity;
  return action && rules.actions.some((type) => type === action.type)
    ? JSON.stringify([
        action.id,
        action.type,
        action.stage,
        action.strikePhase ?? rules.preparingPhase,
      ])
    : undefined;
}
