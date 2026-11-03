import { RECORD_ACTOR_PATHS, RECORD_NODES, RECORD_PARENTS } from './world-record-schema.js';
import { mayReadLiveRecordTable, type LiveReadCuts } from './live-read-overlay.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SourceVersionPlan } from './source-version-retention.js';
import type { PreparedMemorySources } from './memory-repository.js';
import type { PreparedHistoryRead } from './history-preparation.js';

const fields = new Map(
  [...RECORD_NODES].map(([table, node]) => {
    const columns = Object.keys(node.columns ?? {});
    return [
      table,
      {
        actor: columns.indexOf('actor_id'),
        references: columns.indexOf('value_refs'),
        source: columns.indexOf('source_id'),
      },
    ] as const;
  }),
);
const readableAncestors = new Set<string>();
for (const table of RECORD_NODES.keys())
  if (mayReadLiveRecordTable(table))
    for (let parent = RECORD_PARENTS.get(table); parent; parent = RECORD_PARENTS.get(parent))
      readableAncestors.add(parent);

interface ActorRows {
  writes: Map<string, RowChange[]>;
  deletes: Map<string, string[]>;
  expired: Map<string, string[]>;
  references: Set<string>;
  rows: number;
}
const actorRows = (): ActorRows => ({
  writes: new Map(),
  deletes: new Map(),
  expired: new Map(),
  references: new Set(),
  rows: 0,
});
function append<T>(groups: Map<string, T[]>, table: string, value: T): void {
  let rows = groups.get(table);
  if (!rows) groups.set(table, (rows = []));
  rows.push(value);
}
function actorFor(table: string, id: string, row?: RowChange): string | undefined {
  const column = fields.get(table)?.actor ?? -1;
  if (row && column >= 0 && row.extra[column] !== undefined) return String(row.extra[column]);
  const at = RECORD_ACTOR_PATHS.get(table);
  return at === undefined ? undefined : (JSON.parse(id) as string[])[at];
}
const valueId = (id: string, row?: RowChange): string =>
  String(
    row?.extra[fields.get('mind_perception_values')!.source] ?? (JSON.parse(id) as string[]).at(-1),
  );

interface SelectionIndex {
  global: ActorRows;
  actors: Map<string, ActorRows>;
  shared: {
    writes: Map<string, RowChange>;
    deletes: Map<string, string>;
    expired: Map<string, string>;
  };
}
// Only published cuts enter here. PendingWorldSave.append replaces its captured
// changes instead of mutating a previously returned cut.
// docs/projects/bookkeeping-simplification-runtime-design.md#63-reads-while-progress-is-unsaved
const selections = new WeakMap<RecordChanges, SelectionIndex>();
function indexChanges(changes: RecordChanges): SelectionIndex {
  const existing = selections.get(changes);
  if (existing) return existing;
  const index: SelectionIndex = {
    global: actorRows(),
    actors: new Map(),
    shared: { writes: new Map(), deletes: new Map(), expired: new Map() },
  };
  const group = (table: string, id: string, row?: RowChange) => {
    const actor = actorFor(table, id, row);
    if (actor === undefined) return index.global;
    let rows = index.actors.get(actor);
    if (!rows) index.actors.set(actor, (rows = actorRows()));
    return rows;
  };
  for (const [table, rows] of changes.writes) {
    // History has its audience-selected capture. Physical/configuration bodies
    // outside the SQL read owner's capability cannot contribute to this read.
    if (!mayReadLiveRecordTable(table)) continue;
    for (const row of rows) {
      if (table === 'mind_perception_values') {
        index.shared.writes.set(valueId(row.id, row), row);
        continue;
      }
      const selected = group(table, row.id, row);
      append(selected.writes, table, row);
      selected.rows++;
      const at = fields.get(table)?.references ?? -1;
      if (at >= 0)
        for (const id of (row.extra[at] as readonly string[] | undefined) ?? [])
          selected.references.add(id);
      for (const id of row.receivedValueAdditions ?? []) selected.references.add(id);
      for (const id of row.receivedValueRemovals ?? []) selected.references.add(id);
    }
  }
  for (const [kind, tables] of [
    ['deletes', changes.deletes],
    ['expired', changes.expired],
  ] as const)
    for (const [table, ids] of tables ?? []) {
      if (!mayReadLiveRecordTable(table) && !readableAncestors.has(table)) continue;
      for (const id of ids) {
        if (table === 'mind_perception_values') index.shared[kind].set(valueId(id), id);
        else append(group(table, id)[kind], table, id);
      }
    }
  selections.set(changes, index);
  return index;
}
function selectedGroups(index: SelectionIndex, actorIds: ReadonlySet<string>): ActorRows[] {
  const groups = [index.global];
  for (const actor of actorIds) {
    const group = index.actors.get(actor);
    if (group) groups.push(group);
  }
  return groups;
}

/** Index each immutable pending cut once, then visit only the selected actors and
 * referenced shared values. No record body is copied or decoded. Ancestor deletes
 * still fence descendants. Cross-cut references keep a value introduced before
 * the selected actor's receipt available while both cuts remain unsaved.
 * docs/projects/bookkeeping-simplification-runtime-design.md#63-reads-while-progress-is-unsaved */
export function selectActorRecordChanges(
  changes: RecordChanges,
  actorIds?: readonly string[],
  referenceChanges: readonly RecordChanges[] = [changes],
): RecordChanges {
  if (actorIds === undefined) return changes;
  const actors = new Set(actorIds),
    index = indexChanges(changes),
    references = new Set<string>(),
    writes = new Map<string, RowChange[]>(),
    deletes = new Map<string, string[]>(),
    expired = new Map<string, string[]>();
  let rows = 0;
  for (const input of referenceChanges)
    for (const group of selectedGroups(indexChanges(input), actors))
      for (const id of group.references) references.add(id);
  for (const group of selectedGroups(index, actors)) {
    rows += group.rows;
    for (const [table, values] of group.writes)
      for (const value of values) append(writes, table, value);
    for (const [source, target] of [
      [group.deletes, deletes],
      [group.expired, expired],
    ] as const)
      for (const [table, ids] of source) for (const id of ids) append(target, table, id);
  }
  for (const id of references) {
    const row = index.shared.writes.get(id);
    if (row) {
      append(writes, 'mind_perception_values', row);
      rows++;
    }
  }
  // An unchanged durable owner may still refer to a globally erased value. Keep
  // all erasure identities even when no selected pending owner introduces it.
  for (const id of index.shared.deletes.values()) append(deletes, 'mind_perception_values', id);
  for (const id of index.shared.expired.values()) append(expired, 'mind_perception_values', id);
  return { writes, deletes, rows, ...(expired.size ? { expired } : {}) };
}

// The pending owner replaces the complete plan when an actor's version set changes.
const sourceVersions = new WeakMap<SourceVersionPlan, Map<string, SourceVersionPlan['retained']>>();
export function selectActorSourceVersions(
  plan: SourceVersionPlan | undefined,
  actorIds?: readonly string[],
): SourceVersionPlan | undefined {
  if (!plan || actorIds === undefined) return plan;
  let groups = sourceVersions.get(plan);
  if (!groups) {
    groups = new Map<string, SourceVersionPlan['retained']>(
      plan.actors.map((actor) => [actor, []]),
    );
    for (const row of plan.retained) groups.get(row.actorId)?.push(row);
    sourceVersions.set(plan, groups);
  }
  const available = groups,
    actors = [...new Set(actorIds)].filter((actor) => available.has(actor));
  return actors.length
    ? { actors, retained: actors.flatMap((actor) => available.get(actor)!) }
    : undefined;
}

type HistorySelection = Array<{ event: PreparedHistoryRead['changed'][number]; order: number }>;
const histories = new WeakMap<PreparedHistoryRead, Map<string, HistorySelection>>();
function selectedHistory(
  input: PreparedHistoryRead,
  actors: ReadonlySet<string>,
): PreparedHistoryRead {
  let byActor = histories.get(input);
  if (!byActor) {
    byActor = new Map();
    for (const [order, event] of input.changed.entries())
      for (const actor of event.audience) {
        let events = byActor.get(actor);
        if (!events) byActor.set(actor, (events = []));
        events.push({ event, order });
      }
    histories.set(input, byActor);
  }
  const selected = new Map<string, HistorySelection[number]>();
  for (const actor of actors)
    for (const entry of byActor.get(actor) ?? []) selected.set(entry.event.id, entry);
  const changed = [...selected.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.event);
  return {
    changed,
    removed: input.removed,
    accounts: new Map(
      changed.map((event) => [
        event.id,
        new Map(
          [...actors].flatMap((actor) => {
            const account = input.accounts.get(event.id)?.get(actor);
            return account ? [[actor, account] as const] : [];
          }),
        ),
      ]),
    ),
    forgotten: new Map(
      [...actors].flatMap((actor) => {
        const forgotten = input.forgotten.get(actor);
        return forgotten ? [[actor, forgotten] as const] : [];
      }),
    ),
  };
}

/** Rescope before returning a read, replacing source factories rather than
 * wrapping a closure that still retains every actor's pending body. */
export function selectActorLiveReadCuts(
  input: LiveReadCuts,
  actorIds: readonly string[],
  captureSources?: (
    worldId: string,
    changes: RecordChanges,
    versions?: SourceVersionPlan,
  ) => (actorId?: string) => PreparedMemorySources,
): LiveReadCuts {
  const actors = new Set(actorIds),
    referenceChanges = input.cuts.map((cut) => cut.changes);
  return {
    ...input,
    cuts: input.cuts.map((cut) => {
      const changes = selectActorRecordChanges(cut.changes, actorIds, referenceChanges),
        versions = selectActorSourceVersions(cut.versions, actorIds);
      return {
        through: cut.through,
        changes,
        ...(cut.history ? { history: selectedHistory(cut.history, actors) } : {}),
        ...(versions ? { versions } : {}),
        ...(captureSources ? { getSources: captureSources(input.worldId, changes, versions) } : {}),
      };
    }),
    ...(input.historyEligibility
      ? {
          historyEligibility: new Map(
            [...actors].flatMap((actor) => {
              const cut = input.historyEligibility!.get(actor);
              return cut ? [[actor, cut] as const] : [];
            }),
          ),
        }
      : {}),
  };
}
