import { emit } from './events.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { readAttribute, type AttributeDefinition } from './world-modules.js';
import type { Entity, WorldEvent, WorldState } from './types.js';

/** Authored interpretation of an existing value; never another writable meter.
 * docs/projects/embodied-survival-tech-design.md#body-descriptions-and-transition-lifecycle */
export interface ConditionPolicy {
  bands: { below: number; inclusive?: boolean; text: string }[];
  clearText: string;
  recoveryMargin: number;
  criticalSeverity: number;
  reviewSeconds: number;
}
export interface ConditionEpisode {
  version: number;
  severity: number;
  notified: number;
  revision: number;
  pending: boolean;
  nextReviewAt?: number;
}
export function conditionSeverity(policy: ConditionPolicy, value: number): number {
  return policy.bands.filter((b) => (b.inclusive ? value <= b.below : value < b.below)).length;
}
export function conditionText(definition: AttributeDefinition, value: unknown): string | undefined {
  const policy = definition.condition;
  if (!policy || typeof value !== 'number') return;
  const severity = conditionSeverity(policy, value);
  return severity ? policy.bands[severity - 1]!.text : policy.clearText;
}

/** Whether an owner-private internal change can become conscious evidence now. While not,
 * condition notices stay pending and reservoir concerns write no record (their current state
 * still reaches context by projection); physical state is unaffected either way.
 * docs/events-perception-and-reactions.md#7-internal-triggers-and-native-survival */
export function canNoticeInternalChange(world: WorldState, entity: Entity): boolean {
  const actor = entity.actor;
  return (
    !!actor?.alive &&
    !actor.incapacitated &&
    actor.capabilities?.cognition !== false &&
    !capabilityBlocked(world, entity, 'actions')
  );
}
/** Called at each owning write/elapsed boundary. Only meaningful changes mutate episodes.
 * Awake consideration is private; sleeping bodies retain pending state without fake awareness. */
export function reconcileConditions(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  const actor = entity.actor;
  if (!actor || !hasMemory(entity) || !activelyParticipates(entity)) return;
  for (const definition of world.moduleManifest.definitions) {
    const policy = definition.condition;
    const value = policy && readAttribute(actor, definition);
    if (!policy || typeof value !== 'number') continue;
    const severity = conditionSeverity(policy, value);
    const prior = actor.conditions?.[definition.id];
    const changedPolicy = prior?.version !== definition.version;
    let notified = changedPolicy ? 0 : prior.notified;
    while (
      notified > severity &&
      value >= policy.bands[notified - 1]!.below + policy.recoveryMargin
    )
      notified--;
    const due = prior?.nextReviewAt !== undefined && world.simTime >= prior.nextReviewAt;
    const pending = severity > 0 && (changedPolicy || prior.pending || severity > notified || due);
    const canNotice = canNoticeInternalChange(world, entity);
    const notice = pending && canNotice;
    const critical = severity >= policy.criticalSeverity;
    const nextReviewAt = critical
      ? notice || changedPolicy || prior.nextReviewAt === undefined
        ? world.simTime + policy.reviewSeconds
        : prior.nextReviewAt
      : undefined;
    const nextNotified = notice ? severity : notified;
    if (
      prior &&
      !changedPolicy &&
      prior.severity === severity &&
      prior.notified === nextNotified &&
      prior.pending === (pending && !notice) &&
      prior.nextReviewAt === nextReviewAt
    )
      continue;
    const revision = (prior?.revision ?? 0) + 1;
    (actor.conditions ??= {})[definition.id] = {
      version: definition.version,
      severity,
      notified: nextNotified,
      revision,
      pending: pending && !notice,
      ...(nextReviewAt !== undefined ? { nextReviewAt } : {}),
    };
    if (prior && severity < prior.severity && canNotice)
      emit(
        world,
        events,
        'body-condition',
        conditionText(definition, value)!,
        entity,
        undefined,
        { attributeId: definition.id, severity, value, change: 'recovery', importance: 3 },
        'private',
      );
    if (notice)
      emit(
        world,
        events,
        'body-condition',
        conditionText(definition, value)!,
        entity,
        undefined,
        {
          attributeId: definition.id,
          definitionVersion: definition.version,
          conditionRevision: revision,
          severity,
          value,
          semanticTrigger: true,
          importance: 6,
          urgency: critical ? 7 : 4,
          change: changedPolicy ? 'initial' : due ? 'review' : 'worsening',
        },
        'private',
      );
  }
  for (const id of Object.keys(actor.conditions ?? {}))
    if (
      !world.moduleManifest.definitions.some(
        (d) => d.id === id && d.condition && typeof readAttribute(actor, d) === 'number',
      )
    )
      delete actor.conditions![id];
}

export function nextConditionReview(entity: Entity): number {
  if (!entity.actor?.alive || entity.actor.incapacitated) return Infinity;
  return Math.min(
    Infinity,
    ...Object.values(entity.actor.conditions ?? {}).flatMap((s) =>
      s.nextReviewAt === undefined || s.pending ? [] : [s.nextReviewAt],
    ),
  );
}

export function validateConditionPolicy(definition: AttributeDefinition): void {
  const policy = definition.condition;
  if (
    definition.meaning !== undefined &&
    (typeof definition.meaning !== 'string' || definition.meaning.length > 1600)
  )
    throw new Error('Invalid attribute meaning.');
  if (!policy) return;
  const schema = definition.schema;
  if (
    schema.kind !== 'number' ||
    !Array.isArray(policy.bands) ||
    !policy.bands.length ||
    !Number.isFinite(policy.recoveryMargin) ||
    policy.recoveryMargin < 0 ||
    !Number.isFinite(policy.reviewSeconds) ||
    policy.reviewSeconds <= 0 ||
    !Number.isSafeInteger(policy.criticalSeverity) ||
    policy.criticalSeverity < 1 ||
    policy.criticalSeverity > policy.bands.length ||
    typeof policy.clearText !== 'string' ||
    policy.clearText.length > 160
  )
    throw new Error('Invalid condition policy.');
  for (const [index, band] of policy.bands.entries())
    if (
      !Number.isFinite(band.below) ||
      band.below < schema.min ||
      band.below > schema.max ||
      (index > 0 && band.below >= policy.bands[index - 1]!.below) ||
      (band.inclusive !== undefined && typeof band.inclusive !== 'boolean') ||
      typeof band.text !== 'string' ||
      !band.text.trim() ||
      band.text.length > 160
    )
      throw new Error('Invalid condition band.');
}

export function validateConditionEpisodes(world: WorldState, entity: Entity): void {
  for (const [id, episode] of Object.entries(entity.actor?.conditions ?? {})) {
    const definition = world.moduleManifest.definitions.find((d) => d.id === id);
    if (
      !definition?.condition ||
      typeof readAttribute(entity.actor!, definition) !== 'number' ||
      episode.version !== definition.version ||
      !Number.isSafeInteger(episode.revision) ||
      episode.revision < 1 ||
      ![episode.severity, episode.notified].every(
        (n) => Number.isSafeInteger(n) && n >= 0 && n <= definition.condition!.bands.length,
      ) ||
      typeof episode.pending !== 'boolean' ||
      (episode.nextReviewAt !== undefined &&
        (!Number.isFinite(episode.nextReviewAt) || episode.nextReviewAt < 0))
    )
      throw new Error('Invalid condition episode.');
  }
}
