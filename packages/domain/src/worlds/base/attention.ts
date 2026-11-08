import { hasExternalAudience } from '../../event-audience.js';
import { baseEncounterParticipant } from './threat-responses.js';
import { entityGet } from '../../entity-collection.js';
import { hasCommitmentCompletion } from '../../commitments.js';
import type {
  AccountAfterRelease,
  AccountRecordingInput,
  AttentionPolicy,
  RecordingInput,
  RecordingReason,
} from '../../attention.js';
import type { ExperienceEntry } from '../../types.js';
import type { Entity, WorldState } from '../../types.js';
import { readAttribute } from '../../world-modules.js';
import { FOCUS } from './attributes.js';
import { ORDINARY_CONTEXT_SECONDS } from './senses.js';

/** One authored source for lasting account and routine-result vocabulary. Native
 * composition installs this same data with its exact content pin. */
export const BASE_ACCOUNT_RULES = {
  id: 'base:attention-accounts',
  version: 1,
  requiredEvents: [
    'speech',
    'inventory-inspected',
    'item-inspected',
    'learned',
    'taught',
    'recipe-learned',
  ] as readonly string[],
  ignoredEvents: ['encounter'] as readonly string[],
  optionalEvents: [
    'struck',
    'projectile-contact',
    'fire-out',
    'fire-lit',
    'fire-extinguished',
    'crafted',
    'construction-phase',
    'cover-lowered',
  ] as readonly string[],
  routineCommandType: 'move',
  routineRunningEvents: ['action-started', 'moved'] as readonly string[],
  routineCommitmentEvents: ['action-started', 'moved', 'action-stopped'] as readonly string[],
  routineArrivalEvent: 'moved',
  completedCode: 'completed',
  cancelledCode: 'cancelled',
  agreementEvents: ['cooperation', 'social-compact'] as readonly string[],
  resultEvents: { say: 'speech-result' } as Readonly<Record<string, string>>,
  priority: { deliberate: 2, consequence: 1, learning: 1, interpretation: 0 },
  fallbackPriority: 0,
} as const;
export function baseActivityResultEventType(commandType: string): string | undefined {
  return BASE_ACCOUNT_RULES.resultEvents[commandType];
}

/** The selected world's initial allowances, not measured population capacity.
 * docs/worlds/base/attention.md */
export const BASE_ATTENTION_POLICY: AttentionPolicy = {
  geometry: {
    intervalSeconds: ORDINARY_CONTEXT_SECONDS,
    visits: 128,
    extentMetres: 16,
    errorMetres: 0.125,
    maxViews: 16,
    maxBytes: 8 * 1024,
    featurePriority: { support: 0, 'solid-face': 1 },
  },
  semantic: { discovery: true },
  scene: {
    maxBytes: 12 * 1024,
    maxRows: 48,
    nodeVisits: 128,
    staticBytes: 3 * 1024,
    staticRows: 8,
    discoveryBytes: 2 * 1024,
    discoveryRows: 8,
    historyBytes: 8 * 1024,
    historyReceipts: 128,
    candidateVisits: 512,
    initialVisits: 384,
    queryVisits: 128,
    perAnchorVisits: 64,
    maximumQueries: 4,
    expansionBytes: 8 * 1024,
    expansionReceipts: 128,
  },
  id: 'wilderness:attention',
  version: 1,
  defaultCapacity: 10,
  maximumCapacity: 15,
  maximumScore: 10,
  ongoingShare: 0.5,
  stabilitySeconds: 120,
  switchMargin: 2,
  familiarityBonus: 3,
  displacementMetresPerPoint: 2,
  maximumMotionCue: 4,
  newDescriptionCue: 2,
  urgentCue: 8,
  relation: {
    intervalSeconds: ORDINARY_CONTEXT_SECONDS,
    candidates: 128,
    clearSeconds: 120,
    minimumDecrease: 0.25,
    body: { enter: 4, clear: 6 },
    drop: { enter: 20, clear: 25, minimumDrop: 1 },
  },
  retention: {
    maintenanceHeadroom: 0.25,
    requiredPressureStart: 0.875,
    speechMaintenanceHeadroom: 0.25,
    derivedLowWater: 0.8,
    recent: {
      maxAgeSeconds: 21_600,
      maxBytes: 8 * 1024 * 1024,
      maxChanges: 131_072,
    },
    optional: { maxBytes: 4 * 1024 * 1024, maxRecords: 2048 },
    required: { maxBytes: 4 * 1024 * 1024, maxRecords: 512 },
    speech: { maxBytes: 8 * 1024 * 1024, maxRecords: 512 },
    derivedMaxBytes: 1024 * 1024,
    impression: {
      maxBytes: 4096,
      maxClaims: 16,
      maxSpans: 8,
      weakenAfterSeconds: 604_800,
      expireAfterSeconds: 2_592_000,
      reinforceIntervalSeconds: 86_400,
    },
    aftermathSeconds: 86_400,
  },
};

export function baseAttentionCapacity(world: WorldState, observer: Entity): number {
  if (observer.actor?.attentionCapacity !== undefined) return observer.actor.attentionCapacity;
  const focus = world.moduleManifest.definitions.find((definition) => definition.id === FOCUS.id);
  const value = (focus ? readAttribute(world, observer, focus) : undefined) ?? 50;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)
    throw new Error('Installed Focus must be in 0–100.');
  return Math.round(5 + value / 10);
}

export function baseAttributeAffectsObservation(observer: Entity, attributeId: string): boolean {
  return (
    !!observer.actor &&
    ((observer.actor.attentionCapacity === undefined && attributeId === FOCUS.id) ||
      observer.actor.individualRecognition?.attributeId === attributeId)
  );
}

/** Lasting admission is separate from current receipt and attended recent capture. */
export function baseRecordingReason(world: WorldState, input: RecordingInput): RecordingReason {
  if (input.source === 'confirmation') return 'none';
  if (
    (input.eventType && BASE_ACCOUNT_RULES.requiredEvents.includes(input.eventType)) ||
    input.hasExposure
  )
    return 'required';
  if (input.own && input.consequence) return 'required';
  if (input.eventType && world.cognitionPolicy.significantEventTypes.includes(input.eventType))
    return 'required';
  if (input.eventType && BASE_ACCOUNT_RULES.ignoredEvents.includes(input.eventType)) return 'none';
  // These are received outward outcomes, not the private action that caused them.
  if (input.eventType && BASE_ACCOUNT_RULES.optionalEvents.includes(input.eventType))
    return 'optional';
  if (input.source === 'summary' || (input.source === 'memory' && input.own)) return 'optional';
  return input.consequence ? 'optional' : 'none';
}

/** Exact own results remain admitted; routine travel alone need not become autobiography.
 * docs/projects/bookkeeping-simplification-runtime-design.md#14-routine-exact-results-need-not-become-lasting-impressions */
export function baseAccountAfterRelease(input: AccountRecordingInput): AccountAfterRelease {
  const activity = input.activity;
  if (
    !input.own ||
    !activity ||
    activity.commandType !== BASE_ACCOUNT_RULES.routineCommandType ||
    activity.bound ||
    activity.effects ||
    activity.outputs ||
    activity.spending
  )
    return 'impression';
  if (
    input.source === 'awareness' &&
    !!input.eventType &&
    BASE_ACCOUNT_RULES.routineRunningEvents.includes(input.eventType) &&
    activity.status === 'running'
  )
    return 'discard';
  if (
    input.source === 'memory' &&
    ((activity.status === 'completed' &&
      activity.outcome?.ok === true &&
      activity.outcome.code === BASE_ACCOUNT_RULES.completedCode) ||
      (activity.status === 'cancelled' &&
        activity.outcome?.ok === false &&
        activity.outcome.code === BASE_ACCOUNT_RULES.cancelledCode))
  )
    return 'discard';
  return 'impression';
}

/** Routine travel is classified only from facts already supplied by its owner.
 * Departures cannot predict the result of the later walk. */
export function baseRoutineMovement(
  world: WorldState,
  actorId: string,
  activity: import('../../attention.js').ActivityRecordingContext | undefined,
  phase: 'departure' | 'arrival' | 'result',
): boolean {
  if (
    !activity ||
    activity.commandType !== BASE_ACCOUNT_RULES.routineCommandType ||
    activity.bound ||
    activity.effects ||
    activity.outputs ||
    activity.spending
  )
    return false;
  const source = entityGet(world.entities, actorId);
  const actor = source?.actor;
  const encounters = actor?.encounters;
  if (
    (encounters &&
      encounters.life === (actor?.physicalLife ?? 0) &&
      ((source &&
        Object.keys(encounters.pairs).some((id) => baseEncounterParticipant(world, source, id))) ||
        Object.values(encounters.unknown).some((entry) => entry.until > world.simTime))) ||
    hasCommitmentCompletion(world, actorId, BASE_ACCOUNT_RULES.routineCommitmentEvents)
  )
    return false;
  // A known threat is not necessarily known reciprocally. Reuse the occurrence
  // receiver index only when this world's actual recording policy admits the
  // observer's ordinary moved account; default unconsumed prose does no query.
  // The performer's own routine result needs no additional retained account.
  if (
    phase === 'arrival' &&
    world.cognitionPolicy.significantEventTypes.includes(BASE_ACCOUNT_RULES.routineArrivalEvent)
  ) {
    if (
      source &&
      hasExternalAudience(
        world,
        source,
        (observer) =>
          observer.id !== actorId &&
          observer.actor?.encounters?.pairs[actorId]?.otherLife ===
            (source.actor?.physicalLife ?? 0) &&
          baseEncounterParticipant(world, observer, actorId),
      )
    )
      return false;
  }
  if (phase === 'departure') return activity.status === 'running';
  if (
    activity.status === 'completed' &&
    activity.outcome?.ok === true &&
    activity.outcome.code === BASE_ACCOUNT_RULES.completedCode
  )
    return true;
  return (
    phase === 'result' &&
    activity.status === 'cancelled' &&
    activity.outcome?.ok === false &&
    activity.outcome.code === BASE_ACCOUNT_RULES.cancelledCode
  );
}

/** Retention preference belongs to this world's memory policy. Lower ranks leave first. */
export function baseAccountRetentionSelection(entry: ExperienceEntry) {
  const reason =
    entry.source === 'memory'
      ? (entry.value.impression?.reason ?? entry.value.retention?.reason)
      : entry.value.retention?.reason;
  return {
    priority: reason ? BASE_ACCOUNT_RULES.priority[reason] : BASE_ACCOUNT_RULES.fallbackPriority,
    protected:
      entry.source === 'memory' &&
      (entry.value.obligation?.status === 'active' ||
        (entry.value.kind === 'commitment' && !entry.value.resolved)),
  };
}
