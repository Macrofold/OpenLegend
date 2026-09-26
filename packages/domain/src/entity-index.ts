import { recordSemanticChange } from './dependencies.js';
import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';

// Root membership is rebuildable. Values are read from the current phase, so moving
// actors and occurrence-time audiences never reuse a stale entity or position copy.
const roots = new WeakMap<WorldState['entities'], readonly string[]>();
const draftMembership = new WeakMap<WorldState, Set<string>>();
const physicalRoot = (entity: Entity | undefined) =>
  !!entity && !entity.retirement && entity.placement?.mode === 'world';
function snapshotRoots(entities: WorldState['entities']): readonly string[] {
  let ids = Object.isFrozen(entities) ? roots.get(entities) : undefined;
  if (!ids) {
    ids = Object.values(entities)
      .filter(physicalRoot)
      .map((entity) => entity.id);
    if (Object.isFrozen(entities)) roots.set(entities, ids);
  }
  return ids;
}
/** Every admitted root creation/removal calls this in its existing semantic owner. */
export function rootMembershipChanged(world: WorldState, id: string): void {
  const before = isDraft(world) ? original(world)!.entities[id] : undefined,
    after = world.entities[id];
  recordSemanticChange(world, {
    kind: 'spatial',
    entityId: id,
    before: before?.placement?.mode === 'world' ? before.placement.position : null,
    after: after?.placement?.mode === 'world' ? after.placement.position : null,
  });
  if (!isDraft(world)) {
    roots.delete(world.entities);
    return;
  }
  let changed = draftMembership.get(world);
  if (!changed) draftMembership.set(world, (changed = new Set()));
  changed.add(id);
}
export function worldRootEntities(world: WorldState): Entity[] {
  if (!isDraft(world)) return snapshotRoots(world.entities).map((id) => world.entities[id]!);
  const base = original(world)!;
  const ids = snapshotRoots(base.entities),
    changed = draftMembership.get(world);
  const entities = world.entities;
  const result: Entity[] = [];
  // Membership hooks cover every native root insertion/removal. Unchanged roots do
  // not need repeated placement proxy walks for every emitted event in this phase;
  // values still come from the current draft, including replaced entity records.
  for (const id of ids) {
    const entity = entities[id];
    if (entity && (!changed?.has(id) || physicalRoot(entity))) result.push(entity);
  }
  if (changed)
    for (const id of changed)
      if (!physicalRoot(base.entities[id]) && physicalRoot(world.entities[id]))
        result.push(world.entities[id]!);
  return result;
}
/** The draft's exact entity write set routes membership maintenance. No serialized
 * database paths or optional event logs infer a gameplay change. Unknown builders rebuild. */
export function captureRootIndex(
  draft: WorldState,
): (world: WorldState, ids: ReadonlySet<string>) => void {
  const base = original(draft)!;
  draftMembership.delete(draft);
  const prior = Object.isFrozen(base.entities) ? roots.get(base.entities) : undefined;
  return (world, changed) => {
    if (!prior || world.entities === base.entities) return;
    const removed = new Set<string>(),
      added: string[] = [];
    for (const id of changed) {
      const was = physicalRoot(base.entities[id]),
        now = physicalRoot(world.entities[id]);
      if (was && !now) removed.add(id);
      else if (!was && now) added.push(id);
    }
    // Numeric property keys have special JS enumeration order; keep the conservative
    // rebuild for that supported but uncommon external-world identity shape.
    if (added.some((id) => /^\d+$/.test(id))) return;
    roots.set(
      world.entities,
      removed.size || added.length ? [...prior.filter((id) => !removed.has(id)), ...added] : prior,
    );
  };
}
