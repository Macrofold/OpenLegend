import { isImmutableData } from './records.js';
import { entityGet, entityValues, entityDraftAudit } from './entity-collection.js';
import { countDomainWork } from './diagnostic-counters.js';
import { recordSemanticChange } from './dependencies.js';
import { isDraft, original } from 'immer';
import { changedDraftEntityIds, readOnlyDraftView } from './draft.js';
import { objectIndexGet, objectIndexSet, type ObjectIndexNode } from './object-index.js';
import { chargeWork } from './work-budget.js';
import { activelyParticipates } from './participation-state.js';
import { mayAdvanceStatusEffects } from './status-effects.js';
import type { ActionType, Entity, WorldState } from './types.js';

// Root membership is rebuildable. Values are read from the current phase, so moving
// actors and occurrence-time audiences never reuse a stale entity or position copy.
const pendingNavigation = new WeakMap<WorldState['entities'], ReadonlySet<string>>();
const workingNavigation = new WeakMap<WorldState, Set<string>>();
const blockingNavigation = new WeakMap<WorldState['entities'], ReadonlySet<string>>();
const workingBlockingNavigation = new WeakMap<WorldState, Set<string>>();
function hasNavigation(entity: Entity | undefined): boolean {
  const actor = entity?.actor && readOnlyDraftView(entity.actor),
    action = actor?.action && readOnlyDraftView(actor.action),
    animal = entity?.animal && readOnlyDraftView(entity.animal);
  return !!(
    action?.assemblyExitPending ||
    action?.navigation ||
    animal?.episode?.proposal ||
    animal?.foraging?.proposal
  );
}
function navigationWait(entity: Entity | undefined): 'entity' | 'world' | undefined {
  const action = entity?.actor?.action,
    animal = entity?.animal,
    proposal = animal?.episode?.proposal ?? animal?.foraging?.proposal;
  if (action?.assemblyExitPending) return 'world';
  if (proposal && proposal.wait !== 'entity') return 'world';
  if (action?.navigation && action.navigation.request.wait !== 'entity') return 'world';
  return proposal || action?.navigation ? 'entity' : undefined;
}
/** Current request membership only. Admission still checks life, permissions, origin,
 * geometry and per-request waiting. No full population scan on each native boundary. */
export function pendingNavigationEntityIds(
  world: WorldState,
  worldOnly = false,
): ReadonlySet<string> {
  const working = worldOnly ? workingBlockingNavigation : workingNavigation,
    snapshots = worldOnly ? blockingNavigation : pendingNavigation;
  if (isDraft(world)) {
    let retained = working.get(world);
    if (!retained)
      working.set(
        world,
        (retained = new Set(pendingNavigationEntityIds(original(world)!, worldOnly))),
      );
    return retained;
  }
  const prior = isImmutableData(world.entities) ? snapshots.get(world.entities) : undefined;
  if (prior) return prior;
  const ids = new Set(
    worldRootEntities(world, true)
      .filter(
        (entity) => hasNavigation(entity) && (!worldOnly || navigationWait(entity) === 'world'),
      )
      .map((entity) => entity.id),
  );
  if (isImmutableData(world.entities)) snapshots.set(world.entities, ids);
  return ids;
}
export function navigationMembershipChanged(
  world: WorldState,
  id: string,
  wait: 'entity' | 'world' = 'world',
): void {
  if (!isDraft(world)) {
    pendingNavigation.delete(world.entities);
    blockingNavigation.delete(world.entities);
    return;
  }
  const ids = pendingNavigationEntityIds(world) as Set<string>;
  // A request may be prepared before its action/episode is attached; retirement is
  // filtered by the current query and publication, not by trusting this notice.
  ids.add(id);
  const blocking = pendingNavigationEntityIds(world, true) as Set<string>;
  if (wait === 'world') blocking.add(id);
}
const roots = new WeakMap<WorldState['entities'], readonly string[]>();
const rootViews = new WeakMap<WorldState['entities'], Entity[]>();
export interface NativeEntityGroups {
  actors: string[];
  ambient: string[];
  ambientMovers: string[];
  animals: string[];
  heatSources: string[];
  remains: string[];
  plannedActors: string[];
  territorial: string[];
  statuses: string[];
  projectileBodies: string[];
}
const nativeGroupNames = [
  'actors',
  'ambient',
  'ambientMovers',
  'animals',
  'heatSources',
  'remains',
  'plannedActors',
  'territorial',
  'statuses',
  'projectileBodies',
] as const;
interface NativeMembership {
  manifest: WorldState['moduleManifest'];
  policy: WorldState['statusEffectPolicy'];
  masks: ReadonlyMap<string, number>;
  groups: NativeEntityGroups;
}
const nativeMembership = new WeakMap<WorldState['entities'], NativeMembership>();
function nativeMask(world: WorldState, entity: Entity | undefined): number {
  if (!physicalRoot(entity)) return 0;
  const root = readOnlyDraftView(entity!);
  const active = activelyParticipates(root) && !!(root.actor || root.animal || root.heat);
  return (
    (active && root.actor ? 1 : 0) |
    (active ? 2 : 0) |
    (active && (root.animal || root.spatial.flight || root.spatial.fallVelocity !== undefined)
      ? 4
      : 0) |
    (active && root.animal ? 8 : 0) |
    (active && root.heat ? 16 : 0) |
    (root.remains && root.remains.phase !== 'removed' ? 32 : 0) |
    (active && root.actor?.agency.plan ? 64 : 0) |
    (active && root.threat ? 128 : 0) |
    (mayAdvanceStatusEffects(world, root) ? 256 : 0) |
    (activelyParticipates(root) && (root.actor || root.practiceTarget) ? 512 : 0)
  );
}
function membershipCurrent(world: WorldState, value: NativeMembership): boolean {
  return (
    value.manifest === readOnlyDraftView(world.moduleManifest) &&
    value.policy === readOnlyDraftView(world.statusEffectPolicy)
  );
}
/** Native phases iterate the required installed components, not all physical scenery.
 * Publication reuses membership after examining only actual changed entities. */
export function nativeEntityGroups(world: WorldState): NativeEntityGroups {
  const base = isDraft(world) ? original(world)! : world;
  const cached = isImmutableData(base.entities) ? nativeMembership.get(base.entities) : undefined;
  if (cached && membershipCurrent(world, cached)) {
    if (!isDraft(world)) return cached.groups;
    const changed = changedDraftEntityIds(world);
    if (
      changed &&
      !rootOrderChanged(world, base) &&
      [...changed].every(
        (id) =>
          nativeMask(world, entityGet(readOnlyDraftView(world.entities), id)) ===
          (cached.masks.get(id) ?? 0),
      )
    )
      return cached.groups;
  }
  const groups = Object.fromEntries(
    nativeGroupNames.map((name) => [name, []]),
  ) as unknown as NativeEntityGroups;
  const masks = new Map<string, number>();
  const entities = readOnlyDraftView(world.entities);
  for (const id of worldRootEntityIds(world)) {
    const mask = nativeMask(world, entityGet(entities, id));
    masks.set(id, mask);
    nativeGroupNames.forEach((name, index) => {
      if (mask & (1 << index)) groups[name].push(id);
    });
  }
  for (const name of nativeGroupNames)
    if (name !== 'remains' && name !== 'statuses' && name !== 'projectileBodies')
      groups[name].sort((a, b) => a.localeCompare(b));
  if (!isDraft(world) && isImmutableData(world.entities))
    nativeMembership.set(world.entities, {
      manifest: readOnlyDraftView(world.moduleManifest),
      policy: readOnlyDraftView(world.statusEffectPolicy),
      masks,
      groups,
    });
  return groups;
}
// A draft exclusively owns writes while its base stays unchanged. Mutable builders
// reuse membership only in that draft; exact child snapshots may carry IDs from
// an immutable entry through private nested commands.
// docs/save-and-load.md#continuation-and-identity
const workingBaseRoots = new WeakMap<
  WorldState,
  { ids: readonly string[]; fromFrozenBase: boolean }
>();
const draftMembership = new WeakMap<WorldState, Set<string>>();
type TargetUsers = ObjectIndexNode<ObjectIndexNode<true>> | undefined;
const targetUsers = new WeakMap<WorldState['entities'], { tree: TargetUsers }>();
export const physicalRoot = (entity: Entity | undefined) =>
  !!entity &&
  !entity.retirement &&
  !entity.actor?.pendingDeath &&
  entity.remains?.phase !== 'removed' &&
  entity.placement?.mode === 'world';
function snapshotRoots(entities: WorldState['entities']): readonly string[] {
  let ids = isImmutableData(entities) ? roots.get(entities) : undefined;
  if (!ids) {
    ids = entityValues(entities)
      .filter(physicalRoot)
      .map((entity) => entity.id);
    if (isImmutableData(entities)) roots.set(entities, ids);
  }
  return ids;
}
function targetKey(entity: Entity | undefined): string | undefined {
  const action = entity?.actor?.action;
  return physicalRoot(entity) && action?.targetId ? `${action.type}:${action.targetId}` : undefined;
}
function updateTargetUsers(tree: TargetUsers, key: string, id: string, add: boolean): TargetUsers {
  const users = objectIndexSet(objectIndexGet(tree, key), id, add ? true : undefined);
  return objectIndexSet(tree, key, users);
}
/** Immutable snapshots use a rebuildable target/action index. Mutable builders and
 * in-progress drafts read current roots; a preview never creates an authoritative claim. */
export function hasOtherTargetUser(
  world: WorldState,
  actorId: string,
  type: ActionType,
  targetId: string,
): boolean {
  if (isDraft(world) || !Object.isFrozen(world.entities))
    return worldRootEntities(world, true).some((entity) => {
      chargeWork({ tests: 1 });
      return entity.id !== actorId && targetKey(entity) === `${type}:${targetId}`;
    });
  let index = targetUsers.get(world.entities);
  if (!index) {
    let tree: TargetUsers;
    for (const id of snapshotRoots(world.entities)) {
      chargeWork({ tests: 1 });
      const key = targetKey(entityGet(world.entities, id));
      if (key) tree = updateTargetUsers(tree, key, id, true);
    }
    index = { tree };
    targetUsers.set(world.entities, index);
  }
  const users = objectIndexGet(index.tree, `${type}:${targetId}`);
  return !!users && (users.key !== actorId || !!users.left || !!users.right);
}
/** Every admitted root creation/removal calls this in its existing semantic owner. */
export function rootMembershipChanged(world: WorldState, id: string): void {
  const before = isDraft(world) ? entityGet(original(world)!.entities, id) : undefined,
    after = entityGet(world.entities, id);
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: id,
    before: before?.placement?.mode === 'world' ? before.placement.position : null,
    after: after?.placement?.mode === 'world' ? after.placement.position : null,
  });
  if (!isDraft(world)) {
    roots.delete(world.entities);
    targetUsers.delete(world.entities);
    return;
  }
  let changed = draftMembership.get(world);
  if (!changed) draftMembership.set(world, (changed = new Set()));
  changed.add(id);
}
/** Cached root order is the saved entity order, not the order roots become active.
 * Reinserted identities and old contained objects can return earlier in that order.
 * docs/save-and-load.md#continuation-and-identity */
function rootOrderChanged(world: WorldState, base: WorldState): boolean {
  const entities = readOnlyDraftView(world).entities;
  for (const id of entityDraftAudit(entities)?.removed ?? [])
    if (physicalRoot(entityGet(base.entities, id)) && physicalRoot(entityGet(entities, id)))
      return true;
  for (const id of draftMembership.get(world) ?? []) {
    const before = entityGet(base.entities, id);
    if (
      !physicalRoot(before) &&
      physicalRoot(entityGet(entities, id)) &&
      (before || /^\d+$/.test(id))
    )
      return true;
  }
  return false;
}
function enumerateRoots(world: WorldState, readOnly: boolean): Entity[] {
  const entities = readOnly ? readOnlyDraftView(world.entities) : world.entities;
  const result = entityValues(entities).filter(physicalRoot);
  countDomainWork('rootsVisited', result.length);
  return result;
}
function changedRootIds(
  base: WorldState['entities'],
  entities: WorldState['entities'],
  prior: readonly string[],
  changed: ReadonlySet<string>,
): readonly string[] | undefined {
  const removed = new Set<string>(),
    added: string[] = [];
  for (const id of changed) {
    const before = entityGet(base, id),
      was = physicalRoot(before),
      now = physicalRoot(entityGet(entities, id));
    if (was && !now) removed.add(id);
    else if (!was && now) {
      // Existing contained identities and numeric keys can enter earlier in the
      // saved order. Rebuild rather than append them in mutation order.
      if (before || /^\d+$/.test(id)) return;
      added.push(id);
    }
  }
  return removed.size || added.length
    ? [...prior.filter((id) => !removed.has(id)), ...added]
    : prior;
}
/** A nested draft starts from this exact parent snapshot. Carry only IDs, using
 * the collection's complete write audit rather than assuming membership hooks.
 * Unknown replacements/order changes retain the ordinary cold rebuild.
 */
export function inheritRootIndex(child: WorldState, parent: WorldState): void {
  if (!isDraft(parent)) return;
  const pending = workingNavigation.get(parent);
  if (pending) workingNavigation.set(child, new Set(pending));
  const blocking = workingBlockingNavigation.get(parent);
  if (blocking) workingBlockingNavigation.set(child, new Set(blocking));
  const changed = changedDraftEntityIds(parent);
  if (!changed) return;
  const base = original(parent)!;
  if (rootOrderChanged(parent, base)) return;
  const working = workingBaseRoots.get(parent);
  const prior = isImmutableData(base.entities)
    ? (working?.ids ?? snapshotRoots(base.entities))
    : working?.fromFrozenBase
      ? working.ids
      : undefined;
  if (!prior) return;
  const ids = changedRootIds(base.entities, readOnlyDraftView(parent).entities, prior, changed);
  if (ids) workingBaseRoots.set(child, { ids, fromFrozenBase: true });
}
/** `readOnly` returns a phase view that must never be written through: unchanged roots are
 * their immutable records and roots already drafted in this transition are live drafts. */
export function worldRootEntityIds(world: WorldState, rebuild = false): readonly string[] {
  if (rebuild) return enumerateRoots(world, true).map((entity) => entity.id);
  if (!isDraft(world)) return snapshotRoots(world.entities);
  const base = original(world)!;
  if (rootOrderChanged(world, base)) return enumerateRoots(world, true).map((entity) => entity.id);
  let working = workingBaseRoots.get(world);
  if (!working)
    workingBaseRoots.set(
      world,
      (working = {
        ids: snapshotRoots(base.entities),
        fromFrozenBase: isImmutableData(base.entities),
      }),
    );
  const audit = entityDraftAudit(world.entities);
  const changed = new Set([...(draftMembership.get(world) ?? []), ...(audit?.assigned ?? [])]);
  if (!changed?.size) return working.ids;
  return (
    changedRootIds(base.entities, readOnlyDraftView(world.entities), working.ids, changed) ??
    enumerateRoots(world, true).map((entity) => entity.id)
  );
}
/** Count membership without materializing every entity merely to count it. */
export function worldRootCount(world: WorldState): number {
  return worldRootEntityIds(world).length;
}
export function worldRootEntities(
  world: WorldState,
  readOnly: true,
  rebuild?: boolean,
): readonly Entity[];
export function worldRootEntities(world: WorldState, readOnly?: false, rebuild?: boolean): Entity[];
export function worldRootEntities(world: WorldState, readOnly = false, rebuild = false): Entity[] {
  const reusable = readOnly && !rebuild && !isDraft(world) && isImmutableData(world.entities);
  const held = reusable ? rootViews.get(world.entities) : undefined;
  if (held) return held;
  countDomainWork('rootScans');
  const entities = readOnly ? readOnlyDraftView(world.entities) : world.entities;
  const ids = worldRootEntityIds(world, rebuild);
  const result = ids.map((id) => entityGet(entities, id)!);
  countDomainWork('rootsVisited', result.length);
  // The read-only contract includes its container. Reuse only the exact immutable
  // entity collection; working/foreign builders and writable callers stay fresh.
  // docs/projects/attention-and-scenes-runtime-design.md#43-lists-cohorts-and-downstream-reuse
  if (reusable) {
    Object.freeze(result);
    rootViews.set(world.entities, result);
  }
  return result;
}
/** The draft's exact entity write set routes membership maintenance. No serialized
 * database paths or optional event logs infer a gameplay change. Unknown builders rebuild. */
export function captureRootIndex(
  draft: WorldState,
): (world: WorldState, ids: ReadonlySet<string>) => void {
  const base = original(draft)!;
  const priorNative = nativeMembership.get(base.entities);
  const priorNavigation = workingNavigation.get(draft) ?? pendingNavigation.get(base.entities);
  const priorBlocking =
    workingBlockingNavigation.get(draft) ?? blockingNavigation.get(base.entities);
  workingNavigation.delete(draft);
  workingBlockingNavigation.delete(draft);
  const reordered = rootOrderChanged(draft, base);
  draftMembership.delete(draft);
  const working = workingBaseRoots.get(draft);
  // Mutable builders get only a draft-local read, never a cache that becomes
  // eligible after arbitrary later edits followed by freezing.
  const prior = isImmutableData(base.entities)
    ? (working?.ids ?? roots.get(base.entities))
    : working?.fromFrozenBase
      ? working.ids
      : undefined;
  const priorTargets = isImmutableData(base.entities) ? targetUsers.get(base.entities) : undefined;
  return (world, changed) => {
    if (
      priorNative &&
      !reordered &&
      membershipCurrent(world, priorNative) &&
      [...changed].every(
        (id) =>
          nativeMask(world, entityGet(world.entities, id)) === (priorNative.masks.get(id) ?? 0),
      )
    )
      nativeMembership.set(world.entities, priorNative);
    if (priorBlocking) {
      const next = new Set(priorBlocking);
      for (const id of changed) {
        if (navigationWait(entityGet(world.entities, id)) === 'world') next.add(id);
        else next.delete(id);
      }
      blockingNavigation.set(world.entities, next);
    }
    if (priorNavigation) {
      const next = new Set(priorNavigation);
      for (const id of changed) {
        if (hasNavigation(entityGet(world.entities, id))) next.add(id);
        else next.delete(id);
      }
      pendingNavigation.set(world.entities, next);
    }
    if (priorTargets && world.entities !== base.entities) {
      let tree = priorTargets.tree;
      for (const id of changed) {
        const before = targetKey(entityGet(base.entities, id)),
          after = targetKey(entityGet(world.entities, id));
        if (before === after) continue;
        if (before) tree = updateTargetUsers(tree, before, id, false);
        if (after) tree = updateTargetUsers(tree, after, id, true);
      }
      targetUsers.set(world.entities, { tree });
    }
    if (!prior || world.entities === base.entities || reordered) return;
    const ids = changedRootIds(base.entities, world.entities, prior, changed);
    if (ids) roots.set(world.entities, ids);
  };
}
