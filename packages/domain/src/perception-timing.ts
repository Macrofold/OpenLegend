import { readOnlyDraftView } from './draft.js';
import { routineSensePolicy } from './perception.js';
import { capabilityBlocked } from './status-capabilities.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import type { Entity, WorldState } from './types.js';
import type { SemanticChange } from './dependencies.js';
import { MAX_CHANGE_SCOPES } from './dependencies.js';
import { entityGet } from './entity-collection.js';

export interface PendingSightScope {
  broad: boolean;
  detail: boolean;
  observer: boolean;
  revision: number;
  invalidatedAt?: number;
  invalidatedRevision?: number;
  before?: { x: number; y: number; z: number };
  after?: { x: number; y: number; z: number };
}
export interface SensoryContinuation {
  epochAt: number;
  revision: number;
  scopeCount: number;
  scopes: Record<string, PendingSightScope>;
  processed: Record<
    string,
    {
      broad?: { revision: number; at: number };
      detail?: { revision: number; at: number };
    }
  >;
  broadAt?: number;
  detailAt?: number;
  /** Unknown/global changes select one bounded conservative rebuild. */
  all?: boolean;
  invalidatedAt?: number;
  invalidatedRevision?: number;
}

/** Called once by the actual semantic writer. Recipient fan-out belongs to the
 * next due batch, never to each movement microstep. */
export function queueSightChange(world: WorldState, change: SemanticChange): void {
  const pending = world.sensory;
  if (
    !pending ||
    change.kind === 'knowledge' ||
    (change.kind === 'state' &&
      (change.outwardChange === false || ['needs', 'appraisal'].includes(change.field)))
  )
    return;
  if (change.kind === 'membership' && change.family !== 'spatial-candidates') return;
  pending.revision++;
  pending.broadAt ??= world.simTime;
  pending.detailAt ??= world.simTime;
  if (change.kind === 'geometry' || change.kind === 'membership') {
    pending.all = true;
    pending.invalidatedAt ??= world.simTime;
    pending.invalidatedRevision = pending.revision;
    pending.scopes = {};
    pending.scopeCount = 0;
    return;
  }
  if (pending.all) return;
  const id = change.entityId;
  let scope = pending.scopes[id];
  if (!scope) {
    if (pending.scopeCount >= MAX_CHANGE_SCOPES) {
      pending.all = true;
      pending.scopes = {};
      pending.scopeCount = 0;
      return;
    }
    scope = pending.scopes[id] = {
      broad: true,
      detail: true,
      observer: true,
      revision: pending.revision,
    };
    pending.scopeCount++;
    if (change.kind === 'spatial' && change.before)
      scope.before = { x: change.before.x, y: change.before.y, z: change.before.z };
  }
  scope.broad = scope.detail = true;
  scope.revision = pending.revision;
  if (change.kind === 'spatial' && change.after)
    scope.after = { x: change.after.x, y: change.after.y, z: change.after.z };
  if (change.kind === 'state' && change.field === 'participation') {
    scope.invalidatedAt ??= world.simTime;
    scope.invalidatedRevision = pending.revision;
  }
}

export function initializeSightContinuation(world: WorldState): void {
  world.sensory ??= {
    epochAt: world.simTime,
    scopes: {},
    revision: 0,
    scopeCount: 0,
    processed: {},
  };
}

function pendingSightAt(
  world: WorldState,
  policy: NonNullable<ReturnType<typeof routineSensePolicy>['sight']>,
  channel: 'broad' | 'detail',
): number | undefined {
  const pending = world.sensory;
  const at = channel === 'broad' ? pending?.broadAt : pending?.detailAt;
  const period = channel === 'broad' ? policy.seconds : policy.detailSeconds;
  if (!pending || at === undefined || !period) return;
  const processed = pending.processed[policy.key]?.[channel];
  if (processed && processed.revision >= pending.revision) return;
  return nextSampleAt(pending.epochAt, period, Math.max(at, processed?.at ?? pending.epochAt));
}

/** One aligned deadline per installed rate. The world cannot pass it before
 * receiver preparation completes; a clean world has no sensory deadline. */
export function nextRoutineSightAt(world: WorldState, observer: Entity): number | undefined {
  const pending = world.sensory;
  const policy = routineSensePolicy(world, observer).sight;
  if (
    !pending ||
    policy?.mode !== 'cadence' ||
    !policy.seconds ||
    !routineObservationRelevant(world, observer) ||
    capabilityBlocked(world, observer, 'perception')
  )
    return;
  let at = pendingSightAt(world, policy, 'broad') ?? Infinity;
  if (
    policy.detailSeconds &&
    pending.detailAt !== undefined &&
    world.perceptionEvidence?.[observer.id]?.attention?.entries.length
  )
    at = Math.min(at, pendingSightAt(world, policy, 'detail') ?? Infinity);
  return Number.isFinite(at) ? at : undefined;
}

export function sightScopeDue(world: WorldState, observer: Entity): 'broad' | 'detail' | undefined {
  const pending = world.sensory,
    policy = routineSensePolicy(world, observer).sight;
  if (!pending || policy?.mode !== 'cadence' || !policy.seconds) return;
  if ((pendingSightAt(world, policy, 'broad') ?? Infinity) <= world.simTime) return 'broad';
  if (
    policy.detailSeconds &&
    pending.detailAt !== undefined &&
    (pendingSightAt(world, policy, 'detail') ?? Infinity) <= world.simTime &&
    world.perceptionEvidence?.[observer.id]?.attention?.entries.length
  )
    return 'detail';
}

export function completeSightWork(
  world: WorldState,
  completed: ReadonlyMap<string, 'broad' | 'detail'>,
  actors: readonly string[],
  revision: number,
): void {
  const pending = world.sensory;
  if (!pending || !completed.size) return;
  for (const [key, kind] of completed) {
    const progress = (pending.processed[key] ??= {});
    progress.detail = { revision, at: world.simTime };
    if (kind === 'broad') progress.broad = { revision, at: world.simTime };
  }
  let broad = true,
    detail = true;
  const active = new Set<string>();
  for (const id of actors) {
    const observer = entityGet(readOnlyDraftView(world.entities), id);
    if (
      !observer ||
      !routineObservationRelevant(world, observer) ||
      capabilityBlocked(world, observer, 'perception')
    )
      continue;
    const policy = routineSensePolicy(world, observer).sight;
    if (policy?.mode !== 'cadence') continue;
    active.add(policy.key);
    const progress = pending.processed[policy.key];
    broad &&= (progress?.broad?.revision ?? -1) >= pending.revision;
    if (policy.detailSeconds && world.perceptionEvidence?.[id]?.attention?.entries.length)
      detail &&= (progress?.detail?.revision ?? -1) >= pending.revision;
  }
  for (const key of Object.keys(readOnlyDraftView(pending.processed)))
    if (!active.has(key)) delete pending.processed[key];
  if (broad) delete pending.broadAt;
  if (detail) delete pending.detailAt;
  for (const [id, scope] of Object.entries(readOnlyDraftView(pending.scopes))) {
    if ((broad || !scope.broad) && (detail || !scope.detail)) {
      delete pending.scopes[id];
      pending.scopeCount--;
    } else {
      if (broad) pending.scopes[id]!.broad = false;
      if (detail) pending.scopes[id]!.detail = false;
    }
  }
  if (pending.broadAt === undefined && pending.detailAt === undefined) {
    delete pending.all;
    delete pending.invalidatedAt;
    delete pending.invalidatedRevision;
  }
}

export function validateSensoryContinuation(world: WorldState): void {
  const pending = world.sensory;
  if (!pending) return;
  const time = (at: unknown) =>
    typeof at === 'number' && Number.isFinite(at) && at >= 0 && at <= world.simTime;
  const revision = (value: unknown) =>
    Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= pending.revision;
  if (
    !hasRecordFields(
      pending,
      ['epochAt', 'revision', 'scopeCount', 'scopes', 'processed'],
      ['broadAt', 'detailAt', 'all', 'invalidatedAt', 'invalidatedRevision'],
    ) ||
    !time(pending.epochAt) ||
    !Number.isSafeInteger(pending.revision) ||
    pending.revision < 0 ||
    !hasRecordFields(pending.scopes, [], Object.keys(pending.scopes)) ||
    !hasRecordFields(pending.processed, [], Object.keys(pending.processed)) ||
    pending.scopeCount !== Object.keys(pending.scopes).length ||
    pending.scopeCount > MAX_CHANGE_SCOPES ||
    (pending.all !== undefined && pending.all !== true) ||
    (pending.all && pending.scopeCount !== 0) ||
    [pending.broadAt, pending.detailAt, pending.invalidatedAt].some(
      (at) => at !== undefined && !time(at),
    ) ||
    (pending.invalidatedRevision !== undefined && !revision(pending.invalidatedRevision))
  )
    throw new Error('Invalid pending sensory continuation.');
  for (const [id, scope] of Object.entries(pending.scopes)) {
    if (
      !isSafeRecordId(id) ||
      !hasRecordFields(
        scope,
        ['broad', 'detail', 'observer', 'revision'],
        ['before', 'after', 'invalidatedAt', 'invalidatedRevision'],
      ) ||
      typeof scope.broad !== 'boolean' ||
      typeof scope.detail !== 'boolean' ||
      typeof scope.observer !== 'boolean' ||
      (!scope.broad && !scope.detail) ||
      !revision(scope.revision) ||
      (scope.invalidatedAt !== undefined && !time(scope.invalidatedAt)) ||
      (scope.invalidatedRevision !== undefined && !revision(scope.invalidatedRevision)) ||
      [scope.before, scope.after].some(
        (point) =>
          point !== undefined &&
          (!hasRecordFields(point, ['x', 'y', 'z']) ||
            ![point.x, point.y, point.z].every(Number.isFinite)),
      )
    )
      throw new Error('Invalid pending sensory scope.');
  }
  for (const [key, progress] of Object.entries(pending.processed)) {
    if (!isSafeRecordId(key) || !hasRecordFields(progress, [], ['broad', 'detail']))
      throw new Error('Invalid sensory policy progress.');
    for (const mark of [progress.broad, progress.detail])
      if (
        mark &&
        (!hasRecordFields(mark, ['revision', 'at']) || !revision(mark.revision) || !time(mark.at))
      )
        throw new Error('Invalid sensory policy progress.');
  }
}

interface SampleProgress {
  definitions: string;
  epochAt: number;
  nextAt: number;
  life: number;
  suspended: boolean;
}
export interface SensoryProgress {
  routineSight?: SampleProgress;
  incidentalContact?: SampleProgress;
  features?: Record<string, string>;
}
export interface RoutineObservation {
  sight: boolean;
  contact: boolean;
  sampledSight: boolean;
  sampledContact: boolean;
  detail?: boolean;
  immediate?: boolean;
}
const noRoutineObservation = Object.freeze({
  sight: false,
  contact: false,
  sampledSight: false,
  sampledContact: false,
});
/** Keep a recurring clock on its original grid. Repeated addition drifts away
 * from mathematically coincident native deadlines and buys extra whole phases.
 * docs/simulation-time.md#native-interval-contract */
function nextSampleAt(epochAt: number, seconds: number, now: number): number {
  const ordinal = Math.floor((now - epochAt) / seconds) + 1;
  const nextAt = epochAt + ordinal * seconds;
  // Division can round the quotient just below an exact reached occurrence.
  return nextAt > now ? nextAt : epochAt + (ordinal + 1) * seconds;
}
/** Scheduling and recording must select the same observers. A quiet native body
 * has no routine evidence consumer; its retired clock cannot keep time advancing
 * in tiny steps while the recording phase correctly skips it. */
export function routineObservationRelevant(world: WorldState, observer: Entity): boolean {
  const current = readOnlyDraftView(observer),
    actor = current.actor && readOnlyDraftView(current.actor);
  if (!actor?.alive || !activelyParticipates(current)) return false;
  if (hasMemory(current) || (current.animal && readOnlyDraftView(current.animal).episode))
    return true;
  const table = readOnlyDraftView(world).perceptionEpisodes,
    episodes = table && readOnlyDraftView(table)[current.id];
  if (episodes) for (const _ in readOnlyDraftView(episodes)) return true;
  return false;
}
/** One timing owner for distinct senses: contact remains supported without vision.
 * Progress belongs to the complete transition, never the disposable native forecast.
 * Action admission, event-time hearing and consequential physics keep their owners. */
export function takeRoutineObservation(
  world: WorldState,
  observer: Entity,
  measurementDue = false,
): RoutineObservation {
  return routineObservation(world, observer, true, measurementDue);
}

/** Pending captured rates must be current before a physical sample. Reuse the
 * same timing decision without advancing a clock merely to prepare that read. */
export function routineObservationDue(
  world: WorldState,
  observer: Entity,
  measurementDue = false,
): boolean {
  const timing = routineObservation(world, readOnlyDraftView(observer), false, measurementDue);
  return timing.sight || timing.contact;
}

function routineObservation(
  world: WorldState,
  observer: Entity,
  commit: boolean,
  measurementDue = false,
): RoutineObservation {
  if (!routineObservationRelevant(world, observer)) {
    if (commit && observer.sensoryProgress) delete observer.sensoryProgress;
    return noRoutineObservation;
  }
  const policy = routineSensePolicy(world, observer),
    blocked = capabilityBlocked(world, observer, 'perception'),
    stored = observer.sensoryProgress && readOnlyDraftView(observer.sensoryProgress),
    next: SensoryProgress = { ...stored },
    life = observer.actor?.physicalLife ?? 0;
  let changed = false;
  const due = (
    channel: Exclude<keyof SensoryProgress, 'features'>,
    sample: boolean,
    seconds: number | undefined,
    definitions: string | undefined,
  ) => {
    const prior = next[channel] && readOnlyDraftView(next[channel]!);
    if (!sample || !seconds || !definitions) {
      if (prior) {
        delete next[channel];
        changed = true;
      }
      return !!definitions;
    }
    if (blocked) {
      if (prior && !prior.suspended) {
        next[channel] = { ...prior, suspended: true };
        changed = true;
      }
      return false;
    }
    const fresh =
      !prior || prior.definitions !== definitions || prior.life !== life || prior.suspended;
    if (!fresh && prior.nextAt > world.simTime) return false;
    const epochAt = fresh ? world.simTime : prior.epochAt;
    const nextAt = nextSampleAt(epochAt, seconds, world.simTime);
    next[channel] = { definitions, life, suspended: false, epochAt, nextAt };
    changed = true;
    return true;
  };
  const sampledSight = policy.sight?.mode === 'cadence',
    sampledContact = policy.contact?.mode === 'sampled';
  const selected = sightScopeDue(world, observer);
  let immediate =
    sampledSight &&
    (measurementDue ||
      !stored?.routineSight ||
      stored.routineSight.definitions !== policy.sight?.key ||
      stored.routineSight.life !== life ||
      stored.routineSight.suspended);
  let sight = sampledSight
      ? immediate || !!selected
      : due('routineSight', false, undefined, policy.sight?.key),
    contact = due(
      'incidentalContact',
      sampledContact,
      policy.contact?.seconds,
      policy.contact?.key,
    );
  if (sampledSight && sight && policy.sight) {
    const epochAt = world.sensory?.epochAt ?? world.simTime;
    next.routineSight = {
      definitions: policy.sight.key,
      life,
      suspended: blocked,
      epochAt,
      nextAt: nextSampleAt(epochAt, policy.sight.seconds!, world.simTime),
    };
    changed = true;
  }
  if (blocked && sampledSight) sight = false;
  if (blocked && sampledSight && next.routineSight && !next.routineSight.suspended) {
    next.routineSight = { ...next.routineSight, suspended: true };
    changed = true;
  }
  if (commit && changed) {
    if (next.routineSight || next.incidentalContact) observer.sensoryProgress = next;
    else delete observer.sensoryProgress;
  }
  if (
    !policy.sight &&
    (world.visiblePeople?.[observer.id]?.length || world.visibleObjects?.[observer.id]?.length)
  )
    sight = true;
  if (!policy.contact && Object.keys(observer.actor?.contacts ?? {}).length) contact = true;
  // Loss/revocation cleanup is immediate even between ordinary samples.
  if (
    blocked &&
    (world.visiblePeople?.[observer.id]?.length ||
      world.visibleObjects?.[observer.id]?.length ||
      Object.keys(observer.actor?.contacts ?? {}).length ||
      Object.keys(world.perceptionEpisodes?.[observer.id] ?? {}).length)
  )
    sight = contact = true;
  // Deliberate watching is a distinct promise from incidental awareness.
  if (Object.values(observer.actor?.encounters?.pairs ?? {}).some((pair) => !!pair.watch))
    sight = immediate = true;
  return {
    sight,
    contact,
    sampledSight,
    sampledContact,
    immediate,
    ...(!immediate && selected === 'detail' ? { detail: true } : {}),
  };
}

export function validateSensoryProgress(world: WorldState, entity: Entity): void {
  const progress = entity.sensoryProgress;
  if (progress === undefined) return;
  if (
    !entity.actor ||
    !hasRecordFields(progress, [], ['routineSight', 'incidentalContact', 'features']) ||
    (!progress.routineSight && !progress.incidentalContact)
  )
    throw new Error('Invalid sensory progress.');
  if (
    progress.features &&
    (!hasRecordFields(progress.features, [], Object.keys(progress.features)) ||
      Object.entries(progress.features).some(
        ([id, feature]) =>
          !isSafeRecordId(id) || typeof feature !== 'string' || feature.length > 2048,
      ))
  )
    throw new Error('Invalid personally observed feature baseline.');
  const policy = routineSensePolicy(world, entity);
  for (const [sample, channel] of [
    [progress.routineSight, policy.sight],
    [progress.incidentalContact, policy.contact],
  ] as const) {
    if (!sample) continue;
    if (
      !hasRecordFields(sample, ['definitions', 'epochAt', 'nextAt', 'life', 'suspended']) ||
      typeof sample.definitions !== 'string' ||
      !sample.definitions ||
      sample.definitions.length > 128 ||
      typeof sample.epochAt !== 'number' ||
      !Number.isFinite(sample.epochAt) ||
      sample.epochAt < 0 ||
      sample.epochAt > world.simTime ||
      typeof sample.nextAt !== 'number' ||
      !Number.isFinite(sample.nextAt) ||
      sample.nextAt <= sample.epochAt ||
      typeof sample.life !== 'number' ||
      !Number.isSafeInteger(sample.life) ||
      sample.life < 0 ||
      typeof sample.suspended !== 'boolean'
    )
      throw new Error('Invalid routine observation clock.');
    // A stale definition is allowed until the next observation resets its grid.
    // Under the same installed period, the cached deadline must belong to it.
    if (channel?.key === sample.definitions && channel.seconds) {
      const ordinal = Math.round((sample.nextAt - sample.epochAt) / channel.seconds);
      if (
        !Number.isSafeInteger(ordinal) ||
        ordinal < 1 ||
        sample.nextAt !== sample.epochAt + ordinal * channel.seconds ||
        sample.nextAt > nextSampleAt(sample.epochAt, channel.seconds, world.simTime)
      )
        throw new Error('Invalid routine observation sampling grid.');
    }
  }
}
