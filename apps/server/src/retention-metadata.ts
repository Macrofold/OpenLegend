import type { PersonalSourceRef, WorldState } from '@open-legend/domain';
import { RECORD_NODES, RECORD_PARENTS } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { AccountRetentionMetadata } from './retention-record-metadata.js';
import type { RetainedSourceVersion, SourceVersionPlan } from './source-version-retention.js';

export const accountTables = ['mind_awareness', 'mind_memories', 'mind_summaries'] as const;
const indexedTables = [
  ...accountTables,
  'mind_temporal_chunks',
  'mind_temporal_segments',
  'mind_temporal_supports',
  'mind_perception_owners',
  'mind_perception_originals',
  'mind_perception_current',
  'mind_perception_motion_samples',
] as const;
const indexed = new Set<string>(indexedTables);
const accountColumns = [
  'actor_id',
  'source_id',
  'at',
  'event_id',
  'kind',
  'individual_ids',
  'logical_bytes',
  'retention_class',
  'retention_reason',
  'account_revision',
  'retention_metadata',
] as const;
const selectedColumns: Record<(typeof indexedTables)[number], readonly string[]> = {
  mind_awareness: accountColumns,
  mind_summaries: accountColumns,
  mind_memories: [...accountColumns, 'unresolved', 'expires_at', 'weaken_at'],
  mind_temporal_chunks: [
    'actor_id',
    'source_id',
    'physical_life',
    'receipt_epoch',
    'first_ordinal',
    'last_ordinal',
    'first_order',
    'first_at',
    'last_at',
    'logical_bytes',
    'receipt_count',
  ],
  mind_temporal_segments: [
    'actor_id',
    'source_refs',
    'value_refs',
    'occurrence_source_ids',
    'occurrence_individual_ids',
  ],
  mind_temporal_supports: ['actor_id', 'source_id', 'logical_bytes', 'required'],
  mind_perception_owners: ['actor_id', 'value_refs'],
  mind_perception_originals: ['actor_id', 'value_refs'],
  mind_perception_current: ['actor_id', 'value_refs'],
  mind_perception_motion_samples: ['actor_id', 'value_refs'],
};
type Table = (typeof indexedTables)[number];
export interface RetentionRow {
  table: Table;
  id: string;
  parent: string;
  position: number;
  actorId: string;
  columns: Readonly<Record<string, unknown>>;
  encodedBytes: number;
}
type Records = Map<string, RetentionRow>;
const identity = (table: string, id: string) => JSON.stringify([table, id]);
const versionKey = (value: Pick<RetainedSourceVersion, 'actorId' | 'kind' | 'id' | 'revision'>) =>
  JSON.stringify([value.actorId, value.kind, value.id, value.revision]);
const preparedMetadata = new WeakMap<RowChange, RetentionRow>();
function sameReferences(a: unknown, b: unknown): boolean {
  const left = (a ?? {}) as Record<string, number[]>,
    right = (b ?? {}) as Record<string, number[]>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (id) =>
        left[id]!.length === right[id]?.length &&
        left[id]!.every((ordinal, index) => ordinal === right[id]![index]),
    )
  );
}
type MembershipKind = 'account-alias' | 'recent-alias' | 'individual';
type Memberships = Map<MembershipKind, Map<string, number>>;
function rowMembership(row: RetentionRow): Array<[MembershipKind, Iterable<string>]> {
  if (row.table === 'mind_temporal_segments')
    return [
      ['recent-alias', row.columns['occurrence_source_ids'] as string[]],
      ['individual', row.columns['occurrence_individual_ids'] as string[]],
    ];
  if (!accountTables.includes(row.table as (typeof accountTables)[number])) return [];
  const aliases =
    row.columns['kind'] === 'impression'
      ? []
      : [
          String(row.columns['source_id']),
          ...(row.columns['event_id'] ? [String(row.columns['event_id'])] : []),
          ...(row.columns['retention_metadata'] as AccountRetentionMetadata).aliases,
        ];
  return [
    ['account-alias', new Set(aliases)],
    ['individual', row.columns['individual_ids'] as string[]],
  ];
}
function adjustMembership(target: Memberships, row: RetentionRow, delta: number): void {
  for (const [kind, ids] of rowMembership(row)) {
    let counts = target.get(kind);
    if (!counts) target.set(kind, (counts = new Map()));
    for (const id of ids) {
      const count = (counts.get(id) ?? 0) + delta;
      if (count) counts.set(id, count);
      else counts.delete(id);
    }
  }
}

function metadata(table: Table, row: RowChange): RetentionRow {
  const prepared = preparedMetadata.get(row);
  if (prepared) return prepared;
  const names = Object.keys(RECORD_NODES.get(table)!.columns!);
  const columns = Object.fromEntries(
    selectedColumns[table].map((name) => [name, row.extra[names.indexOf(name)]]),
  );
  const storage =
    table === 'mind_temporal_chunks'
      ? (JSON.parse(row.payload) as { storage: { segmentBytes: number; metadataBytes: number } })
          .storage
      : undefined;
  const result: RetentionRow = {
    table,
    id: row.id,
    parent: row.parent,
    position: row.position,
    actorId: String(columns['actor_id']),
    columns,
    encodedBytes:
      Buffer.byteLength(row.payload) + (storage?.segmentBytes ?? 0) + (storage?.metadataBytes ?? 0),
  };
  preparedMetadata.set(row, result);
  return result;
}
function deletedBy(
  changes: { deletes: ReadonlyMap<string, readonly string[]> },
  table: string,
  id: string,
  parent: string,
): boolean {
  if (changes.deletes.get(table)?.includes(id)) return true;
  let ancestor = RECORD_PARENTS.get(table);
  while (ancestor) {
    if (
      changes.deletes
        .get(ancestor)
        ?.some((key) => parent === key || parent.startsWith(key.slice(0, -1) + ','))
    )
      return true;
    ancestor = RECORD_PARENTS.get(ancestor);
  }
  return false;
}

/** One scoped derived catalogue from canonical columns. Accepted and physical
 * rows share immutable metadata objects; only changed memberships are updated.
 * No payload, world, historical revision chain or writable gameplay state lives here. */
export class RetentionMetadata {
  private worldId?: string;
  private logical = new Map<Table, Records>();
  private physical = new Map<Table, Records>();
  private actors = new Map<Table, Map<string, Set<string>>>();
  private readonly membership = new Map<string, Memberships>();
  private parents = new Map<string, Set<string>>();
  private physicalParents = new Map<string, Set<string>>();
  private readonly physicalReferences = new Map<string, Map<number, number>>();
  private readonly pendingReferences = new Map<number, ReadonlyMap<string, ReadonlySet<number>>>();
  private readonly pendingBlocks = new Map<number, ReadonlySet<string>>();
  private readonly versions = new Map<string, Map<string, RetainedSourceVersion>>();
  private logicalRevision = 0;
  appliedRevision = 0;

  clear(): void {
    this.worldId = undefined;
    this.logical.clear();
    this.physical.clear();
    this.actors.clear();
    this.membership.clear();
    this.parents.clear();
    this.physicalParents.clear();
    this.physicalReferences.clear();
    this.pendingReferences.clear();
    this.pendingBlocks.clear();
    this.versions.clear();
    this.logicalRevision = 0;
    this.appliedRevision = 0;
  }
  assertWorld(worldId: string): void {
    if (this.worldId !== worldId)
      throw new Error('Complete personal retention metadata is unavailable for this world.');
  }
  async capture(
    db: SqlDatabase,
    worldId: string,
  ): Promise<{
    worldId: string;
    revision: number;
    rows: RetentionRow[];
    versions: RetainedSourceVersion[];
  }> {
    const head = await db
      .prepare('SELECT world_id,applied_revision FROM world_head WHERE id=1')
      .get();
    if (head?.['world_id'] !== worldId) throw new Error('Retention metadata world changed.');
    const rows: RetentionRow[] = [];
    for (const table of indexedTables) {
      const names = selectedColumns[table];
      const encoded =
        table === 'mind_temporal_chunks'
          ? "octet_length(payload)+COALESCE((payload::jsonb#>>'{storage,segmentBytes}')::bigint,0)+COALESCE((payload::jsonb#>>'{storage,metadataBytes}')::bigint,0)"
          : 'octet_length(payload)';
      for (const row of await db
        .prepare(
          `SELECT id,parent_id,position,${names.join(',')},${encoded} AS encoded_bytes FROM ${table} WHERE world_id=?`,
        )
        .all(worldId)) {
        const columns = Object.fromEntries(names.map((name) => [name, row[name]]));
        rows.push({
          table,
          id: String(row['id']),
          parent: String(row['parent_id']),
          position: Number(row['position']),
          actorId: String(row['actor_id']),
          columns,
          encodedBytes: Number(row['encoded_bytes']),
        });
      }
    }
    const versions = (
      await db
        .prepare(
          "SELECT actor_id,source_kind,source_id,revision,retention_class,logical_bytes FROM mind_source_versions WHERE world_id=? AND source_kind IN ('awareness','memory','summary') ORDER BY retired_revision,actor_id,source_kind,source_id,revision",
        )
        .all(worldId)
    ).map((row) => ({
      actorId: String(row['actor_id']),
      kind: String(row['source_kind']),
      id: String(row['source_id']),
      revision: String(row['revision']),
      category: row['retention_class'] as RetainedSourceVersion['category'],
      bytes: Number(row['logical_bytes']),
    }));
    return { worldId, revision: Number(head['applied_revision']), rows, versions };
  }
  initialize(snapshot: Awaited<ReturnType<RetentionMetadata['capture']>>): void {
    this.clear();
    this.worldId = snapshot.worldId;
    this.logicalRevision = this.appliedRevision = snapshot.revision;
    for (const row of snapshot.rows) {
      this.setLogical(row);
      this.setPhysical(row);
    }
    for (const version of snapshot.versions) this.setVersion(version);
  }
  initializeEmpty(worldId: string): void {
    this.clear();
    this.worldId = worldId;
  }
  /** A restore's copied arrays have no residency certificate. Their independent
   * saved counters must prove every world-owned source is present; a boolean
   * from a caller cannot turn a resident tail into a complete catalogue. Exact
   * archived bodies retain GameSaves' separately validated version ownership. */
  assertCandidateCoverage(world: WorldState): void {
    this.assertWorld(world.id);
    for (const [actorId, actor] of Object.entries(world.experience?.temporal?.actors ?? {})) {
      let bytes = 0,
        count = 0;
      for (const row of this.records('mind_temporal_chunks', actorId)) {
        bytes += Number(row.columns['logical_bytes']);
        count += Number(row.columns['receipt_count']);
      }
      if (bytes !== actor.bytes || count !== actor.count)
        throw new Error('Complete retention preparation cannot use a resident history tail.');
      const totals = {
        optional: { bytes: 0, count: 0 },
        required: { bytes: 0, count: 0 },
        speech: { bytes: 0, count: 0 },
      };
      for (const table of accountTables)
        for (const row of this.records(table, actorId)) {
          const category = row.columns['retention_class'];
          if (category === 'sensory') continue;
          const total = totals[category as keyof typeof totals];
          total.bytes += Number(row.columns['logical_bytes']);
          total.count++;
        }
      for (const row of this.records('mind_temporal_supports', actorId)) {
        const total = totals[Number(row.columns['required']) ? 'required' : 'optional'];
        total.bytes += Number(row.columns['logical_bytes']);
        total.count++;
      }
      const add = (category: 'optional' | 'required', value: unknown) => {
        totals[category].bytes += Buffer.byteLength(JSON.stringify(value));
        totals[category].count++;
      };
      for (const value of world.knowledge[actorId] ?? [])
        if (value.source !== 'authored') add('required', value);
      for (const value of Object.values(world.actorKnowledge?.[actorId] ?? {}))
        if (value.origin === 'actor-edit') add('optional', value);
      for (const value of Object.values(world.observerIdentities?.[actorId] ?? {}))
        if ('retained' in value && value.retained && !value.authored) add('optional', value);
      for (const category of ['optional', 'required', 'speech'] as const) {
        const total = totals[category],
          saved = actor.accounts?.[category],
          archives = actor.accounts?.archives?.[category];
        if (
          total.bytes + (archives?.bytes ?? 0) !== (saved?.bytes ?? 0) ||
          total.count + (archives?.count ?? 0) !== (saved?.count ?? 0)
        )
          throw new Error('Complete retention preparation has incomplete personal accounts.');
      }
    }
  }
  private setLogical(row: RetentionRow): void {
    let records = this.logical.get(row.table);
    if (!records) this.logical.set(row.table, (records = new Map()));
    const old = records.get(row.id);
    if (old) this.removeLogical(old);
    records.set(row.id, row);
    let actors = this.actors.get(row.table);
    if (!actors) this.actors.set(row.table, (actors = new Map()));
    let ids = actors.get(row.actorId);
    if (!ids) actors.set(row.actorId, (ids = new Set()));
    ids.add(row.id);
    let membership = this.membership.get(row.actorId);
    if (!membership) this.membership.set(row.actorId, (membership = new Map()));
    adjustMembership(membership, row, 1);
    if (row.table === 'mind_temporal_segments') {
      let ids = this.parents.get(row.parent);
      if (!ids) this.parents.set(row.parent, (ids = new Set()));
      ids.add(row.id);
    }
  }
  private removeLogical(row: RetentionRow): void {
    adjustMembership(this.membership.get(row.actorId)!, row, -1);
    this.logical.get(row.table)?.delete(row.id);
    const actors = this.actors.get(row.table);
    const ids = actors?.get(row.actorId);
    ids?.delete(row.id);
    if (!ids?.size) actors?.delete(row.actorId);
    if (row.table === 'mind_temporal_segments') {
      const siblings = this.parents.get(row.parent);
      siblings?.delete(row.id);
      if (!siblings?.size) this.parents.delete(row.parent);
    }
  }
  private references(row: RetentionRow, delta: number): void {
    if (!row.columns['value_refs']) return;
    for (const [block, ordinals] of Object.entries(
      row.columns['value_refs'] as Record<string, number[]>,
    )) {
      let counts = this.physicalReferences.get(block);
      if (!counts) this.physicalReferences.set(block, (counts = new Map()));
      for (const ordinal of ordinals) {
        const count = (counts.get(ordinal) ?? 0) + delta;
        if (count < 0) throw new Error('Physical received ownership underflow.');
        if (count) counts.set(ordinal, count);
        else counts.delete(ordinal);
      }
      if (!counts.size) this.physicalReferences.delete(block);
    }
  }
  private removePhysical(row: RetentionRow): void {
    this.references(row, -1);
    this.physical.get(row.table)?.delete(row.id);
    if (row.table === 'mind_temporal_segments') {
      const ids = this.physicalParents.get(row.parent);
      ids?.delete(row.id);
      if (!ids?.size) this.physicalParents.delete(row.parent);
    }
  }
  private setPhysical(row: RetentionRow): void {
    // Accounts and sparse support carry their own bodies. Only actual shared
    // references need a second (applied, rather than accepted) row membership.
    if (!row.columns['value_refs']) return;
    let records = this.physical.get(row.table);
    if (!records) this.physical.set(row.table, (records = new Map()));
    const old = records.get(row.id);
    if (
      old?.parent === row.parent &&
      sameReferences(old.columns['value_refs'], row.columns['value_refs'])
    ) {
      records.set(row.id, row);
      return;
    }
    if (old) this.removePhysical(old);
    records.set(row.id, row);
    this.references(row, 1);
    if (row.table === 'mind_temporal_segments') {
      let ids = this.physicalParents.get(row.parent);
      if (!ids) this.physicalParents.set(row.parent, (ids = new Set()));
      ids.add(row.id);
    }
  }
  private changed(changes: RecordChanges, physical: boolean): void {
    const tables = physical ? this.physical : this.logical;
    for (const [table, records] of tables) {
      const direct = new Set(changes.deletes.get(table) ?? []);
      if (table === 'mind_temporal_segments')
        for (const parent of changes.deletes.get('mind_temporal_chunks') ?? [])
          for (const id of (physical ? this.physicalParents : this.parents).get(parent) ?? [])
            direct.add(id);
      const ancestorDeletes = [...changes.deletes].some(
        ([ancestor, ids]) => ids.length && ancestor !== table && this.ancestor(table, ancestor),
      );
      const otherAncestorDeletes =
        table === 'mind_temporal_segments'
          ? [...changes.deletes].some(
              ([ancestor, ids]) =>
                ids.length &&
                ancestor !== 'mind_temporal_chunks' &&
                ancestor !== table &&
                this.ancestor(table, ancestor),
            )
          : ancestorDeletes;
      if (otherAncestorDeletes) {
        for (const row of [...records.values()])
          if (deletedBy(changes, table, row.id, row.parent)) {
            if (physical) this.removePhysical(row);
            else this.removeLogical(row);
          }
      } else
        for (const id of direct) {
          const row = records.get(id);
          if (!row) continue;
          if (physical) this.removePhysical(row);
          else this.removeLogical(row);
        }
    }
    for (const [table, rows] of changes.writes)
      if (indexed.has(table))
        for (const row of rows) {
          const value = metadata(table as Table, row);
          if (physical) this.setPhysical(value);
          else this.setLogical(value);
        }
  }
  private ancestor(table: string, ancestor: string): boolean {
    let parent = RECORD_PARENTS.get(table);
    while (parent) {
      if (parent === ancestor) return true;
      parent = RECORD_PARENTS.get(parent);
    }
    return false;
  }
  accepted(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    versions?: SourceVersionPlan,
  ): void {
    this.assertWorld(worldId);
    if (revision <= this.logicalRevision) return;
    const affected = new Set<string>();
    const oldSegments = new Set<RetentionRow>();
    for (const id of [
      ...(changes.deletes.get('mind_temporal_segments') ?? []),
      ...(changes.writes.get('mind_temporal_segments') ?? []).map((row) => row.id),
    ]) {
      const row = this.logical.get('mind_temporal_segments')?.get(id);
      if (row) oldSegments.add(row);
    }
    for (const id of changes.deletes.get('mind_temporal_chunks') ?? [])
      for (const row of this.segments(id)) oldSegments.add(row);
    if (
      [...changes.deletes].some(
        ([table, ids]) =>
          ids.length &&
          table !== 'mind_temporal_chunks' &&
          table !== 'mind_temporal_segments' &&
          this.ancestor('mind_temporal_segments', table),
      )
    )
      for (const row of this.logical.get('mind_temporal_segments')?.values() ?? [])
        if (deletedBy(changes, row.table, row.id, row.parent)) oldSegments.add(row);
    for (const row of oldSegments)
      for (const id of row.columns['source_refs'] as string[]) affected.add(id);
    for (const row of this.removedRows(changes.deletes))
      if (row.table !== 'mind_temporal_segments')
        for (const id of Object.keys((row.columns['value_refs'] as Record<string, number[]>) ?? {}))
          affected.add(id);
    for (const [table, rows] of changes.writes)
      if (indexed.has(table) && table !== 'mind_temporal_segments')
        for (const row of rows) {
          const old = this.get(table as Table, row.id),
            next = metadata(table as Table, row);
          if (sameReferences(old?.columns['value_refs'], next.columns['value_refs'])) continue;
          for (const value of [old, next])
            if (value)
              for (const id of Object.keys(
                (value.columns['value_refs'] as Record<string, number[]>) ?? {},
              ))
                affected.add(id);
        }
    for (const row of changes.writes.get('mind_perception_values') ?? [])
      affected.add((JSON.parse(row.id) as string[]).at(-1)!);
    for (const id of changes.deletes.get('mind_perception_values') ?? [])
      affected.add((JSON.parse(id) as string[]).at(-1)!);
    const refs = new Map<string, Set<number>>();
    for (const [table, rows] of changes.writes)
      if (indexed.has(table))
        for (const row of rows) {
          const value = metadata(table as Table, row);
          if (
            sameReferences(
              this.get(table as Table, row.id)?.columns['value_refs'],
              value.columns['value_refs'],
            )
          )
            continue;
          for (const [block, ordinals] of Object.entries(
            (value.columns['value_refs'] as Record<string, number[]>) ?? {},
          )) {
            affected.add(block);
            let ids = refs.get(block);
            if (!ids) refs.set(block, (ids = new Set()));
            for (const ordinal of ordinals) ids.add(ordinal);
          }
        }
    this.changed(changes, false);
    this.logicalRevision = revision;
    if (refs.size) this.pendingReferences.set(revision, refs);
    if (affected.size) this.pendingBlocks.set(revision, affected);
    if (versions) {
      for (const actorId of versions.actors) this.versions.delete(actorId);
      for (const value of versions.retained) {
        const { payload: _, ...compact } = value;
        this.setVersion(compact);
      }
    }
  }
  applied(
    worldId: string,
    revision: number,
    changes: RecordChanges,
    versions?: SourceVersionPlan,
  ): void {
    this.assertWorld(worldId);
    this.changed(changes, true);
    this.appliedRevision = Math.max(this.appliedRevision, revision);
    for (const at of this.pendingReferences.keys())
      if (at <= revision) this.pendingReferences.delete(at);
    for (const at of this.pendingBlocks.keys()) if (at <= revision) this.pendingBlocks.delete(at);
    // Recovery sees application before a live accepted world exists.
    if (revision > this.logicalRevision) this.accepted(worldId, revision, changes, versions);
    for (const at of this.pendingReferences.keys())
      if (at <= revision) this.pendingReferences.delete(at);
    for (const at of this.pendingBlocks.keys()) if (at <= revision) this.pendingBlocks.delete(at);
  }
  physicalOwned(worldId: string, block: string): ReadonlySet<number> {
    this.assertWorld(worldId);
    const result = new Set(this.physicalReferences.get(block)?.keys());
    for (const refs of this.pendingReferences.values())
      for (const ordinal of refs.get(block) ?? []) result.add(ordinal);
    return result;
  }
  ownershipPending(worldId: string, block: string): boolean {
    this.assertWorld(worldId);
    for (const blocks of this.pendingBlocks.values()) if (blocks.has(block)) return true;
    return false;
  }
  view(
    worldId: string,
    changes?: RecordChanges,
    removed?: ReadonlyMap<string, readonly string[]>,
  ): RetentionMetadataView {
    this.assertWorld(worldId);
    return new RetentionMetadataView(this, changes, removed);
  }
  *records(table: Table, actorId?: string): Iterable<RetentionRow> {
    const records = this.logical.get(table);
    if (actorId === undefined) yield* records?.values() ?? [];
    else for (const id of this.actors.get(table)?.get(actorId) ?? []) yield records!.get(id)!;
  }
  get(table: Table, id: string): RetentionRow | undefined {
    return this.logical.get(table)?.get(id);
  }
  membershipCount(actorId: string, kind: MembershipKind, id: string): number {
    return this.membership.get(actorId)?.get(kind)?.get(id) ?? 0;
  }
  removedRows(deletes: ReadonlyMap<string, readonly string[]>): Set<RetentionRow> {
    const result = new Set<RetentionRow>();
    for (const [table, ids] of deletes)
      if (indexed.has(table))
        for (const id of ids) {
          const row = this.get(table as Table, id);
          if (row) result.add(row);
        }
    for (const parent of deletes.get('mind_temporal_chunks') ?? [])
      for (const row of this.segments(parent)) result.add(row);
    for (const table of indexedTables)
      if (
        [...deletes].some(
          ([ancestor, ids]) =>
            ids.length &&
            ancestor !== table &&
            !(table === 'mind_temporal_segments' && ancestor === 'mind_temporal_chunks') &&
            this.ancestor(table, ancestor),
        )
      )
        for (const row of this.records(table))
          if (deletedBy({ deletes }, table, row.id, row.parent)) result.add(row);
    return result;
  }
  *segments(parent: string): Iterable<RetentionRow> {
    for (const id of this.parents.get(parent) ?? [])
      yield this.logical.get('mind_temporal_segments')!.get(id)!;
  }
  sourceVersions(actorId: string): RetainedSourceVersion[] {
    return [...(this.versions.get(actorId)?.values() ?? [])];
  }
  private setVersion(value: RetainedSourceVersion): void {
    let versions = this.versions.get(value.actorId);
    if (!versions) this.versions.set(value.actorId, (versions = new Map()));
    versions.set(versionKey(value), value);
  }
}

/** A preparation owns only changed-row overlays, discarded on refusal/rollback. */
export class RetentionMetadataView {
  private readonly writes = new Map<Table, Map<string, RetentionRow>>();
  private readonly membershipDelta = new Map<string, Memberships>();
  constructor(
    private readonly owner: RetentionMetadata,
    private readonly changes?: RecordChanges,
    private readonly removed?: ReadonlyMap<string, readonly string[]>,
  ) {
    for (const [table, rows] of changes?.writes ?? [])
      if (indexed.has(table))
        this.writes.set(
          table as Table,
          new Map(rows.map((row) => [row.id, metadata(table as Table, row)])),
        );
    const touched = new Map<string, RetentionRow>();
    for (const removed of [changes?.deletes, this.removed])
      if (removed)
        for (const row of owner.removedRows(removed)) touched.set(identity(row.table, row.id), row);
    for (const [table, rows] of this.writes)
      for (const row of rows.values())
        touched.set(identity(table, row.id), owner.get(table, row.id) ?? row);
    for (const row of touched.values()) {
      const prior = owner.get(row.table, row.id),
        next = this.get(row.table, row.id);
      if (prior === next) continue;
      for (const [value, delta] of [
        [prior, -1],
        [next, 1],
      ] as const)
        if (value) {
          let membership = this.membershipDelta.get(value.actorId);
          if (!membership) this.membershipDelta.set(value.actorId, (membership = new Map()));
          adjustMembership(membership, value, delta);
        }
    }
  }
  private deleted(row: RetentionRow): boolean {
    return (
      !!(this.removed && deletedBy({ deletes: this.removed }, row.table, row.id, row.parent)) ||
      !!(this.changes && deletedBy(this.changes, row.table, row.id, row.parent))
    );
  }
  *rows(table: Table, actorId?: string): Iterable<RetentionRow> {
    const writes = this.writes.get(table);
    for (const row of this.owner.records(table, actorId))
      if (!writes?.has(row.id) && !this.deleted(row)) yield row;
    for (const row of writes?.values() ?? [])
      if (
        (actorId === undefined || row.actorId === actorId) &&
        !this.removed?.get(table)?.includes(row.id)
      )
        yield row;
  }
  get(table: Table, id: string): RetentionRow | undefined {
    const row = this.writes.get(table)?.get(id) ?? this.owner.get(table, id);
    return row && !this.deleted(row) ? row : undefined;
  }
  prior(table: Table, id: string): RetentionRow | undefined {
    return this.owner.get(table, id);
  }
  priorSegments(parent: string): Iterable<RetentionRow> {
    return this.owner.segments(parent);
  }
  excluding(removed: ReadonlyMap<string, readonly string[]>): RetentionMetadataView {
    const combined = new Map(this.removed);
    for (const [table, ids] of removed)
      combined.set(table, [...(combined.get(table) ?? []), ...ids]);
    return new RetentionMetadataView(this.owner, this.changes, combined);
  }
  *segments(parent: string): Iterable<RetentionRow> {
    const writes = this.writes.get('mind_temporal_segments');
    for (const row of this.owner.segments(parent))
      if (!writes?.has(row.id) && !this.deleted(row)) yield row;
    for (const row of writes?.values() ?? [])
      if (row.parent === parent && !this.deleted(row)) yield row;
  }
  sourceVersions(actorId: string): RetainedSourceVersion[] {
    return this.owner.sourceVersions(actorId);
  }
  private has(actorId: string, kind: MembershipKind, id: string): boolean {
    return (
      this.owner.membershipCount(actorId, kind, id) +
        (this.membershipDelta.get(actorId)?.get(kind)?.get(id) ?? 0) >
      0
    );
  }
  hasAlias(actorId: string, id: string, includeRecent: boolean): boolean {
    return (
      this.has(actorId, 'account-alias', id) ||
      (includeRecent && this.has(actorId, 'recent-alias', id))
    );
  }
  hasIndividual(actorId: string, id: string): boolean {
    return this.has(actorId, 'individual', id);
  }
  versionDependencies(
    actorId: string,
  ): Array<{ source: PersonalSourceRef; category: RetainedSourceVersion['category'] }> {
    const result: Array<{
      source: PersonalSourceRef;
      category: RetainedSourceVersion['category'];
    }> = [];
    const accounts = accountTables.flatMap((table) => [...this.rows(table, actorId)]);
    const sources = new Map(
      accounts.map((row) => [
        JSON.stringify([
          row.table === 'mind_awareness'
            ? 'awareness'
            : row.table === 'mind_summaries'
              ? 'summary'
              : 'memory',
          row.columns['source_id'],
        ]),
        row,
      ]),
    );
    const versions = new Map(
      this.sourceVersions(actorId).map((value) => [JSON.stringify([value.kind, value.id]), value]),
    );
    for (const row of accounts) {
      if (row.columns['kind'] === 'impression') continue;
      const meta = row.columns['retention_metadata'] as AccountRetentionMetadata;
      const category = row.columns['retention_class'] as RetainedSourceVersion['category'];
      for (const source of meta.versions) result.push({ source, category });
      for (const dependency of meta.learning) {
        const sourceKey = JSON.stringify([dependency.kind, dependency.id]);
        const current = sources.get(sourceKey);
        const revision = current?.columns['account_revision'] ?? versions.get(sourceKey)?.revision;
        if (!revision) throw new Error('Exact learned-identity source is unavailable.');
        result.push({ source: { ...dependency, revision: String(revision) }, category });
      }
    }
    return result;
  }
}
