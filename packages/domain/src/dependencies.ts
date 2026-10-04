import { isDraft } from 'immer';
import { isSafeRecordId, hasRecordFields } from './records.js';
import { sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import type { DefinitionPin } from './world-modules.js';
import type { Position, WorldState } from './types.js';
import { maximumDomainWork } from './diagnostic-counters.js';

/** Finite native query families. A dependency is evidence of freshness, never authority. */
export type QueryFamily =
  | 'spatial-candidates'
  | 'direct-contents'
  | 'installed-capabilities'
  | 'actor-state'
  | 'actor-knowledge';
export type Dependency =
  | { kind: 'value'; ownerId: string; key: ValueKey; revision: number }
  | { kind: 'membership'; family: QueryFamily; scopeId: string; revision: number }
  | { kind: 'existence'; entityId: string; revision: number }
  | { kind: 'geometry'; revision: number }
  | { kind: 'definition'; pin: DefinitionPin }
  | { kind: 'authority'; scope: string }
  | { kind: 'deadline'; at: number };
const valueKeys = [
  'items',
  'status-policy',
  'claims',
  'mind',
  'memory',
  'awareness',
  'summaries',
  'inner-world',
  'cognition-policy',
  'appraisals',
] as const;
export type ValueKey = (typeof valueKeys)[number];
export type QueryResult<T> =
  | { status: 'complete'; values: readonly T[]; dependencies: readonly Dependency[] }
  | { status: 'budget-exhausted' | 'unavailable'; dependencies: readonly Dependency[] };
export type SemanticChange =
  | { kind: 'spatial'; entityId: string; before: Position | null; after: Position | null }
  | { kind: 'membership'; family: QueryFamily; scopeId: string }
  | {
      kind: 'state';
      entityId: string;
      field:
        | 'body'
        | 'behavior'
        | 'needs'
        | 'attribute'
        | 'resource'
        | 'contribution'
        | 'participation'
        | 'appraisal';
    }
  | { kind: 'geometry'; before: number; after: number }
  | { kind: 'knowledge'; actorId: string };
export interface ChangeSet {
  readonly changes: readonly SemanticChange[];
  /** An unclassified writer retains conservative collection dependencies. */
  readonly conservative: boolean;
}
const pending = new WeakMap<
  WorldState,
  { changes: Map<string, SemanticChange>; conservative: boolean; states: Map<StateField, number> }
>();
type StateField = Extract<SemanticChange, { kind: 'state' }>['field'];
/** Private-phase invalidation follows mutation owners, including silent status changes.
 * This rebuildable token is not a persisted revision or permission to reuse across commands. */
export function stateChangeRevision(world: WorldState, field: StateField): number {
  return pending.get(world)?.states.get(field) ?? 0;
}
const published = new WeakMap<WorldState, ChangeSet>();
export const MAX_CHANGE_SCOPES = 4096;
export interface SensoryChanges {
  phase: number;
  sources: ReadonlySet<string>;
  observers: ReadonlySet<string>;
  complete: boolean;
  rebuildReason?: 'unknown' | 'overflow';
}
type SensoryPending = { sources: Set<string>; observers: Set<string>; overflow: boolean };
const sensory = new WeakMap<WorldState, SensoryPending>();
let sensoryPhase = 0;
/** Independent of publication changes: each actual sensing phase acknowledges its own
 * writes, including multiple phases inside one unpublished advance. */
export function recordSensoryChange(world: WorldState, id: string, observer = false): void {
  let batch = sensory.get(world);
  if (!batch)
    sensory.set(world, (batch = { sources: new Set(), observers: new Set(), overflow: false }));
  if (batch.overflow) return;
  const ids = observer ? batch.observers : batch.sources;
  if (ids.has(id)) return;
  if (batch.sources.size + batch.observers.size === MAX_CHANGE_SCOPES) {
    batch.overflow = true;
    batch.sources.clear();
    batch.observers.clear();
    return;
  }
  ids.add(id);
  maximumDomainWork('sensoryScopesPeak', batch.sources.size + batch.observers.size);
}
/** The draft owner supplies complete write coverage, never an empty semantic list. */
export function nextSensoryPhase(
  world: WorldState,
  audit: {
    sources: ReadonlySet<string>;
    observers: ReadonlySet<string>;
    complete: boolean;
    overflow?: boolean;
  },
): SensoryChanges {
  maximumDomainWork(
    'sensoryScopesPeak',
    audit.overflow ? MAX_CHANGE_SCOPES : audit.sources.size + audit.observers.size,
  );
  for (const id of audit.sources) recordSensoryChange(world, id);
  for (const id of audit.observers) recordSensoryChange(world, id, true);
  const batch = sensory.get(world);
  sensory.delete(world);
  if (!Number.isSafeInteger(++sensoryPhase)) throw new Error('Sensory phase exhausted.');
  const reason =
    batch?.overflow || audit.overflow ? 'overflow' : !audit.complete ? 'unknown' : undefined;
  return {
    phase: sensoryPhase,
    sources: batch?.sources ?? new Set(),
    observers: batch?.observers ?? new Set(),
    complete: reason === undefined,
    ...(reason ? { rebuildReason: reason } : {}),
  };
}
/** Carry unobserved notices through successful command/native publication. Reading a
 * successor does not consume an ancestor's notices, so simultaneous forks stay independent. */
export function inheritSensoryChanges(world: WorldState, base: WorldState): void {
  const batch = sensory.get(base);
  if (batch)
    sensory.set(world, {
      sources: new Set(batch.sources),
      observers: new Set(batch.observers),
      overflow: batch.overflow,
    });
}
export function captureSensoryChanges(world: WorldState): (result: WorldState) => void {
  const batch = sensory.get(world);
  sensory.delete(world);
  return (result) => {
    if (batch) sensory.set(result, batch);
  };
}
/** Called at semantic mutation owners before old scope is discarded. Bounded coalescing
 * keeps earliest old/latest new extents; required effects/evidence are never coalesced here. */
export function recordSemanticChange(world: WorldState, change: SemanticChange): void {
  if (change.kind === 'spatial') recordSensoryChange(world, change.entityId, true);
  else if (change.kind === 'knowledge') recordSensoryChange(world, change.actorId, true);
  // Metadata outlives the draft; never retain a placement's revocable proxy.
  if (change.kind === 'spatial')
    change = {
      ...change,
      before: change.before ? { x: change.before.x, y: change.before.y, z: change.before.z } : null,
      after: change.after ? { x: change.after.x, y: change.after.y, z: change.after.z } : null,
    };
  let set = pending.get(world);
  if (!set)
    pending.set(world, (set = { changes: new Map(), conservative: false, states: new Map() }));
  if (change.kind === 'state')
    set.states.set(change.field, (set.states.get(change.field) ?? 0) + 1);
  const key =
    change.kind === 'spatial'
      ? `spatial:${change.entityId}`
      : change.kind === 'membership'
        ? `membership:${change.family}:${change.scopeId}`
        : change.kind === 'state'
          ? `state:${change.entityId}:${change.field}`
          : change.kind === 'knowledge'
            ? `knowledge:${change.actorId}`
            : 'geometry';
  if (!set.changes.has(key) && set.changes.size >= MAX_CHANGE_SCOPES) {
    set.conservative = true;
    return;
  }
  const prior = set.changes.get(key);
  set.changes.set(
    key,
    change.kind === 'spatial' && prior?.kind === 'spatial'
      ? { ...change, before: prior.before }
      : change.kind === 'geometry' && prior?.kind === 'geometry'
        ? { ...change, before: prior.before }
        : change,
  );
}
export function captureSemanticChanges(
  world: WorldState,
): (result: WorldState, changed: boolean) => void {
  const recorded = pending.get(world);
  pending.delete(world);
  const changes = [...(recorded?.changes.values() ?? [])];
  return (result, changed) =>
    published.set(result, { changes, conservative: changed || !!recorded?.conservative });
}
export function semanticChanges(world: WorldState): ChangeSet {
  return published.get(world) ?? { changes: [], conservative: true };
}

// Rebuildable tokens describe immutable snapshots only. Mutable builders/drafts never
// certify a cached result; startup/restore reconstructs subscriptions under a new scope.
const identities = new WeakMap<object, number>();
let nextIdentity = 0;
export function snapshotRevision(value: object | undefined): number {
  if (!value) return 0;
  let revision = !isDraft(value) && Object.isFrozen(value) ? identities.get(value) : undefined;
  if (revision === undefined) {
    if (nextIdentity >= Number.MAX_SAFE_INTEGER) throw new Error('Dependency revision exhausted.');
    revision = ++nextIdentity;
    if (!isDraft(value) && Object.isFrozen(value)) identities.set(value, revision);
  }
  return revision;
}
export function membershipDependency(
  world: WorldState,
  family: QueryFamily,
  scopeId = world.id,
): Extract<Dependency, { kind: 'membership' }> {
  let revision: number;
  switch (family) {
    case 'direct-contents':
      revision = world.entities[scopeId]?.inventoryRevision ?? 0;
      break;
    case 'installed-capabilities':
      revision = snapshotRevision(world.moduleManifest);
      break;
    case 'actor-state':
      revision = snapshotRevision(world.entities[scopeId]);
      break;
    case 'actor-knowledge':
      revision = world.knowledgeRevisions?.[scopeId] ?? 0;
      break;
    // This broad dependency remains until the cell provider proves all membership and
    // property changes. It includes empty queries and source motion within one cell.
    case 'spatial-candidates':
      revision = snapshotRevision(world.entities);
      break;
  }
  return { kind: 'membership', family, scopeId, revision };
}
export function existenceDependency(
  world: WorldState,
  entityId: string,
): Extract<Dependency, { kind: 'existence' }> {
  return { kind: 'existence', entityId, revision: snapshotRevision(world.entities[entityId]) };
}
export function valueDependency(
  world: WorldState,
  key: ValueKey,
  ownerId = world.id,
): Extract<Dependency, { kind: 'value' }> {
  const value =
    key === 'appraisals'
      ? world.appraisals?.[ownerId]
      : key === 'items'
        ? world.itemDefinitions
        : key === 'status-policy'
          ? world.statusEffectPolicy
          : key === 'claims'
            ? world.resourceReservations
            : key === 'mind'
              ? world.minds?.[ownerId]
              : key === 'memory'
                ? world.memories[ownerId]
                : key === 'awareness'
                  ? world.experience?.awareness[ownerId]
                  : key === 'summaries'
                    ? world.experience?.summaries[ownerId]
                    : key === 'inner-world'
                      ? world.innerWorlds?.[ownerId]
                      : world.cognitionPolicy;
  return { kind: 'value', key, ownerId, revision: snapshotRevision(value) };
}
/** Current private source set for the existing cognitive work owner. The scheduler's
 * band inputs still decide usefulness; these tokens fence installation across awaits. */
export function actorDependencies(
  world: WorldState,
  actorId: string,
  authorityScope: string,
): Dependency[] {
  return [
    existenceDependency(world, actorId),
    membershipDependency(world, 'actor-knowledge', actorId),
    membershipDependency(world, 'installed-capabilities'),
    membershipDependency(world, 'spatial-candidates'),
    { kind: 'geometry', revision: world.map.spatial.revision },
    { kind: 'authority', scope: authorityScope },
    ...valueKeys.map((key) => valueDependency(world, key, actorId)),
  ];
}
export function dependenciesCurrent(
  world: WorldState,
  dependencies: readonly Dependency[],
  authorityScope?: string,
): boolean {
  return dependencies.every((dependency) => {
    switch (dependency.kind) {
      case 'value':
        return (
          valueDependency(world, dependency.key, dependency.ownerId).revision ===
          dependency.revision
        );
      case 'membership':
        return (
          membershipDependency(world, dependency.family, dependency.scopeId).revision ===
          dependency.revision
        );
      case 'existence':
        return existenceDependency(world, dependency.entityId).revision === dependency.revision;
      case 'geometry':
        return world.map.spatial.revision === dependency.revision;
      case 'definition':
        return world.moduleManifest.pins
          .concat(world.moduleManifest.sensePins)
          .some((pin) => sameDefinitionPin(pin, dependency.pin));
      case 'authority':
        return authorityScope === dependency.scope;
      case 'deadline':
        return world.simTime < dependency.at;
    }
  });
}
export function validDependency(value: Dependency): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value.kind === 'authority')
    return (
      hasRecordFields(value, ['kind', 'scope']) &&
      typeof value.scope === 'string' &&
      value.scope.length > 0 &&
      value.scope.length <= 512
    );
  if (value.kind === 'definition')
    return hasRecordFields(value, ['kind', 'pin']) && isDefinitionPin(value.pin);
  if (value.kind === 'deadline')
    return hasRecordFields(value, ['kind', 'at']) && Number.isFinite(value.at) && value.at >= 0;
  if (!('revision' in value) || !Number.isSafeInteger(value.revision) || value.revision < 0)
    return false;
  if (value.kind === 'geometry') return hasRecordFields(value, ['kind', 'revision']);
  if (value.kind === 'existence')
    return (
      hasRecordFields(value, ['kind', 'entityId', 'revision']) && isSafeRecordId(value.entityId)
    );
  if (value.kind === 'value')
    return (
      hasRecordFields(value, ['kind', 'ownerId', 'key', 'revision']) &&
      isSafeRecordId(value.ownerId) &&
      valueKeys.includes(value.key)
    );
  return (
    value.kind === 'membership' &&
    hasRecordFields(value, ['kind', 'family', 'scopeId', 'revision']) &&
    isSafeRecordId(value.scopeId) &&
    [
      'spatial-candidates',
      'direct-contents',
      'installed-capabilities',
      'actor-state',
      'actor-knowledge',
    ].includes(value.family)
  );
}
