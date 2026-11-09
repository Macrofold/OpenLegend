import {
  DerivedOwnerIndex,
  objectIndexGet,
  objectIndexSet,
  objectIndexEntries,
  type ObjectIndexNode,
  type WorldState,
} from '@open-legend/domain';

export const HOT_EVENT_RECENT_ROWS = 512;
const EVICTION_BATCH = 256;
type Counts = ObjectIndexNode<number> | undefined;
function dependencies<T>(references: (value: T) => Iterable<string>) {
  return new DerivedOwnerIndex<T, string[], Counts>(
    (value) => [...references(value)],
    () => undefined,
    (tree, _id, before, after) => {
      for (const [ids, delta] of [
        [before, -1],
        [after, 1],
      ] as const)
        for (const id of ids ?? []) {
          const count = (objectIndexGet(tree, id) ?? 0) + delta;
          tree = objectIndexSet(tree, id, count || undefined);
        }
      return tree;
    },
  );
}
type AwarenessRow = NonNullable<WorldState['experience']>['awareness'][string][number];
type MemoryRow = WorldState['memories'][string][number];
type KnowledgeRow = WorldState['knowledge'][string][number];
function* awarenessReferences(row: AwarenessRow) {
  yield row.eventId;
}
function* memoryReferences(row: MemoryRow) {
  if (row.eventId) yield row.eventId;
  if (row.obligation) {
    yield row.obligation.evidenceId;
    if (row.obligation.fulfilledBy) yield row.obligation.fulfilledBy;
  }
}
function* knowledgeReferences(row: KnowledgeRow) {
  yield row.evidenceId;
}
const awareness = dependencies<NonNullable<WorldState['experience']>['awareness'][string]>(
  function* (rows) {
    for (const row of rows) yield* awarenessReferences(row);
  },
);
const memories = dependencies<WorldState['memories'][string]>(function* (rows) {
  for (const row of rows) yield* memoryReferences(row);
});
const knowledge = dependencies<WorldState['knowledge'][string]>(function* (rows) {
  for (const row of rows) yield* knowledgeReferences(row);
});
/** The startup row selector uses the same dependencies before constructing an
 * authority. These are actual current account bodies, never a synthetic world. */
export function hotEventRecordDependencies(
  table: 'mind_awareness' | 'mind_memories' | 'mind_learned_capabilities',
  row: Record<string, unknown>,
): Iterable<string> {
  switch (table) {
    case 'mind_awareness':
      return awarenessReferences(row as unknown as AwarenessRow);
    case 'mind_memories':
      return memoryReferences(row as unknown as MemoryRow);
    case 'mind_learned_capabilities':
      return knowledgeReferences(row as unknown as KnowledgeRow);
  }
}
const empty = Object.freeze({});
type EventPinRoots = {
  memories: WorldState['memories'];
  awareness: NonNullable<WorldState['experience']>['awareness'];
};
function pins(world: WorldState, selected?: EventPinRoots) {
  return [
    awareness.read(selected?.awareness ?? world.experience?.awareness ?? empty),
    memories.read(selected?.memories ?? world.memories),
    knowledge.read(world.knowledge),
  ];
}
const checked = new WeakMap<WorldState['events'], Counts[]>();
/** Placement is never forgetting. Reference counts preserve independent owners. */
export function retainHotEvents(world: WorldState, selectPins?: () => EventPinRoots): WorldState {
  if (world.events.length <= HOT_EVENT_RECENT_ROWS + EVICTION_BATCH) return world;
  const counts = pins(world, selectPins?.()),
    prior = Object.isFrozen(world.events) ? checked.get(world.events) : undefined;
  if (prior && counts.every((tree, index) => tree === prior[index])) return world;
  const held = (id: string) => counts.some((tree) => objectIndexGet(tree, id) !== undefined);
  const tail = world.events.length - HOT_EVENT_RECENT_ROWS;
  let removable = 0;
  for (let i = 0; i < tail && removable < EVICTION_BATCH; i++)
    if (!held(world.events[i]!.id)) removable++;
  if (removable < EVICTION_BATCH) {
    if (Object.isFrozen(world.events)) checked.set(world.events, counts);
    return world;
  }
  const events = world.events.filter((event, index) => index >= tail || held(event.id));
  return {
    ...world,
    events,
    archivedEventCount: (world.archivedEventCount ?? 0) + world.events.length - events.length,
  };
}
/** Full enumeration only for consumers actually requesting every dependency. */
export function hotEventDependencies(world: WorldState): Set<string> {
  return new Set(pins(world).flatMap((tree) => [...objectIndexEntries(tree)].map(([id]) => id)));
}
