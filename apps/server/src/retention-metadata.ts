import {
  temporalSupportAliases,
  temporalValueIndividualId,
  type PersonalSourceRef,
  type WorldState,
} from '@open-legend/domain';
import { maximumTemporalPreparationRows } from './temporal-storage.js';
import { RECORD_NODES, RECORD_PARENTS, liveEvidenceRowSql } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { AccountRetentionMetadata } from './retention-record-metadata.js';
import type { RetainedSourceVersion } from './source-version-retention.js';

export const accountTables = ['mind_awareness', 'mind_memories', 'mind_summaries'] as const;
const indexedTables = [
  ...accountTables,
  'mind_temporal_chunks',
  'mind_temporal_segments',
  'mind_temporal_supports',
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
    'source_ids',
    'individual_ids',
  ],
  mind_temporal_supports: ['actor_id', 'source_id', 'logical_bytes', 'required'],
};
const related = new Set<string>(indexedTables);
for (const table of indexedTables) {
  let parent = RECORD_PARENTS.get(table);
  while (parent) {
    related.add(parent);
    parent = RECORD_PARENTS.get(parent);
  }
}
export function retentionChangedActors(changes: RecordChanges, world: WorldState): Set<string> {
  const actors = new Set<string>();
  const include = (table: string, id: string) => {
    if (!related.has(table)) return;
    const path = JSON.parse(id) as string[];
    const actor = path[1] === 'memories' ? path[2] : path[2] === 'temporal' ? path[4] : path[3];
    if (actor) actors.add(actor);
    else for (const id of Object.keys(world.experience?.temporal?.actors ?? {})) actors.add(id);
  };
  for (const [table, rows] of changes.writes)
    if (accountTables.includes(table as (typeof accountTables)[number]))
      for (const row of rows)
        if (accountWriteNeedsRetentionClosure(table as (typeof accountTables)[number], row))
          include(table, row.id);
  for (const [table, ids] of changes.deletes) for (const id of ids) include(table, id);
  return actors;
}

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
/** Native counters account ordinary appends. A prior account edit or actual
 * dependency is the shared boundary for capturing cold accounts and replacing
 * their exact version closure; an empty manifest does not change that closure. */
export function accountWriteNeedsRetentionClosure(
  table: (typeof accountTables)[number],
  row: RowChange,
): boolean {
  return !row.create || accountWriteHasRetentionDependencies(table, row);
}
export function accountWriteHasRetentionDependencies(
  table: (typeof accountTables)[number],
  row: RowChange,
): boolean {
  const support = metadata(table, row).columns['retention_metadata'] as AccountRetentionMetadata;
  return support.versions.length > 0 || support.learning.length > 0;
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

/** One finite actor-scoped metadata snapshot for a retention operation. Discarded
 * after preparation; no complete cold-history mirror lives in the repository. */
export class RetentionMetadata {
  private worldId?: string;
  private logical = new Map<Table, Records>();
  private actors = new Map<Table, Map<string, Set<string>>>();
  private readonly membership = new Map<string, Memberships>();
  private parents = new Map<string, Set<string>>();
  private readonly versions = new Map<string, Map<string, RetainedSourceVersion>>();
  private membershipKeys?: { aliases: ReadonlySet<string>; individuals: ReadonlySet<string> };
  revision = 0;

  clear(): void {
    this.worldId = undefined;
    this.logical.clear();
    this.actors.clear();
    this.membership.clear();
    this.parents.clear();
    this.versions.clear();
    this.revision = 0;
    this.membershipKeys = undefined;
  }
  assertWorld(worldId: string): void {
    if (this.worldId !== worldId)
      throw new Error('Complete personal retention metadata is unavailable for this world.');
  }
  async capture(
    db: SqlDatabase,
    worldId: string,
    actorIds: readonly string[],
    selection: {
      recentActors: readonly string[];
      changes: RecordChanges;
      world: WorldState;
      previous?: WorldState;
    },
  ): Promise<{
    worldId: string;
    revision: number;
    rows: RetentionRow[];
    versions: RetainedSourceVersion[];
    recentMembership: Array<{ actorId: string; kind: MembershipKind; id: string; count: number }>;
    membershipKeys: { aliases: string[]; individuals: string[] };
  }> {
    const head = await db.prepare('SELECT world_id,revision FROM world_head WHERE id=1').get();
    if (head?.['world_id'] !== worldId) throw new Error('Retention metadata world changed.');
    const projection = (table: Table) => {
      const encoded =
        table === 'mind_temporal_chunks'
          ? "octet_length(t.payload)+COALESCE((t.payload::jsonb#>>'{storage,segmentBytes}')::bigint,0)+COALESCE((t.payload::jsonb#>>'{storage,metadataBytes}')::bigint,0)"
          : 'octet_length(t.payload)';
      return `SELECT '${table}' AS table_name,t.id,t.parent_id,t.position,t.actor_id,
        jsonb_build_object(${selectedColumns[table].flatMap((name) => [`'${name}'`, `t.${name}`]).join(',')}) AS columns,
        ${encoded} AS encoded_bytes`;
    };
    const rows = new Map<string, RetentionRow>();
    const add = (values: Record<string, unknown>[]) => {
      for (const row of values) {
        const value: RetentionRow = {
          table: String(row['table_name']) as Table,
          id: String(row['id']),
          parent: String(row['parent_id']),
          position: Number(row['position']),
          actorId: String(row['actor_id']),
          columns: row['columns'] as RetentionRow['columns'],
          encodedBytes: Number(row['encoded_bytes']),
        };
        rows.set(identity(value.table, value.id), value);
      }
    };
    const smallTables = [...accountTables, 'mind_temporal_supports'] as const;
    add(
      await db
        .prepare(
          smallTables
            .map(
              (table) => `${projection(table)} FROM ${table} t
      WHERE t.world_id=? AND t.actor_id=ANY(?::text[])`,
            )
            .join(' UNION ALL '),
        )
        .all(...smallTables.flatMap(() => [worldId, actorIds])),
    );

    // Only actual retirement asks for an ordered cold prefix. The extra row is
    // the existing retention loop's next-boundary sentinel, not another catalogue.
    const retired = selection.changes.deletes.get('mind_temporal_chunks') ?? [];
    const retirementParents = new Set(retired);
    let completeRecent = false;
    for (
      let parent = RECORD_PARENTS.get('mind_temporal_chunks');
      parent;
      parent = RECORD_PARENTS.get(parent)
    )
      if (selection.changes.deletes.get(parent)?.length) completeRecent = true;
    // Removing a whole history owner must subtract every affected membership;
    // ordinary row deletion and maintenance use only exact IDs/an oldest prefix.
    const recentActors = completeRecent ? actorIds : selection.recentActors;
    if (recentActors.length) {
      const oldest = await db
        .prepare(
          `${projection('mind_temporal_chunks')}
        FROM unnest(?::text[]) AS actors(actor_id) CROSS JOIN LATERAL (
          SELECT * FROM mind_temporal_chunks c WHERE c.world_id=? AND c.actor_id=actors.actor_id
          AND c.retired_revision IS NULL AND NOT(c.id=ANY(?::text[]))
          ORDER BY c.first_at,c.first_order,c.receipt_epoch,c.first_ordinal
          LIMIT ${completeRecent ? 'ALL' : maximumTemporalPreparationRows + 1}
        ) t`,
        )
        .all(recentActors, worldId, retired);
      add(oldest);
      for (const row of oldest) retirementParents.add(String(row['id']));
    }
    const changed = (table: Table) => [
      ...new Set([
        ...(selection.changes.deletes.get(table) ?? []),
        ...(selection.changes.writes.get(table) ?? [])
          .filter((row) => !row.create)
          .map((row) => row.id),
      ]),
    ];
    const headers = changed('mind_temporal_chunks');
    if (headers.length)
      add(
        await db
          .prepare(
            `${projection('mind_temporal_chunks')} FROM mind_temporal_chunks t
        WHERE t.world_id=? AND t.actor_id=ANY(?::text[]) AND t.id=ANY(?::text[]) AND ${liveEvidenceRowSql('mind_temporal_chunks')}`,
          )
          .all(worldId, actorIds, headers),
      );
    const segments = changed('mind_temporal_segments');
    if (retirementParents.size || segments.length)
      add(
        await db
          .prepare(
            `${projection('mind_temporal_segments')} FROM mind_temporal_segments t
        WHERE t.world_id=? AND t.actor_id=ANY(?::text[])
        AND (t.parent_id=ANY(?::text[]) OR t.id=ANY(?::text[])) AND ${liveEvidenceRowSql('mind_temporal_segments')}`,
          )
          .all(worldId, actorIds, [...retirementParents], segments),
      );

    const aliases = new Set<string>(),
      individuals = new Set<string>();
    const keys = (row: RetentionRow) => {
      for (const [kind, ids] of rowMembership(row))
        for (const id of ids) (kind === 'individual' ? individuals : aliases).add(id);
      if (row.table === 'mind_temporal_segments') {
        for (const id of row.columns['source_ids'] as string[]) aliases.add(id);
        for (const id of row.columns['individual_ids'] as string[]) individuals.add(id);
      }
    };
    for (const row of rows.values()) keys(row);
    for (const [table, writes] of selection.changes.writes)
      if (indexed.has(table)) for (const row of writes) keys(metadata(table as Table, row));
    for (const world of [selection.previous, selection.world]) {
      if (!world) continue;
      for (const actorId of actorIds) {
        for (const chunk of world.experience?.temporal?.actors[actorId]?.chunks ?? []) {
          for (const id of chunk.sourceIds) aliases.add(id);
          for (const id of chunk.individualIds) individuals.add(id);
        }
        for (const capsule of Object.values(
          world.experience?.temporal?.actors[actorId]?.supports ?? {},
        )) {
          for (const id of temporalSupportAliases(capsule, world)) aliases.add(id);
          if (capsule.receipt.subjectIdentity?.kind === 'individual')
            individuals.add(capsule.receipt.subjectIdentity.individualId);
          for (const value of capsule.values) {
            const id = temporalValueIndividualId(value);
            if (id) individuals.add(id);
          }
        }
      }
    }
    const membershipKeys = { aliases: [...aliases], individuals: [...individuals] };
    const requests = [
      { kind: 'recent-alias', column: 'occurrence_source_ids', keys: membershipKeys.aliases },
      { kind: 'individual', column: 'occurrence_individual_ids', keys: membershipKeys.individuals },
    ] as const;
    const recentMembership: Array<{
      actorId: string;
      kind: MembershipKind;
      id: string;
      count: number;
    }> = [];
    for (const { kind, column, keys } of requests) {
      if (!keys.length) continue;
      // Filter indexed actor/source membership before expanding arrays. Only the
      // identities being retired need a proof that some other cold batch survives.
      for (const row of await db
        .prepare(
          `SELECT t.actor_id,member.id,count(*)::bigint AS count
        FROM mind_temporal_segments t CROSS JOIN LATERAL unnest(t.${column}) AS member(id)
        WHERE t.world_id=? AND t.actor_id=ANY(?::text[]) AND t.${column} && ?::text[]
        AND member.id=ANY(?::text[]) AND ${liveEvidenceRowSql('mind_temporal_segments')}
        GROUP BY t.actor_id,member.id`,
        )
        .all(worldId, actorIds, keys, keys))
        recentMembership.push({
          actorId: String(row['actor_id']),
          kind,
          id: String(row['id']),
          count: Number(row['count']),
        });
    }
    const versions = (
      await db
        .prepare(
          "SELECT actor_id,source_kind,source_id,revision,retention_class,logical_bytes FROM mind_source_versions WHERE world_id=? AND actor_id=ANY(?::text[]) AND source_kind IN ('awareness','memory','summary') ORDER BY retired_revision,actor_id,source_kind,source_id,revision",
        )
        .all(worldId, actorIds)
    ).map((row) => ({
      actorId: String(row['actor_id']),
      kind: String(row['source_kind']),
      id: String(row['source_id']),
      revision: String(row['revision']),
      category: row['retention_class'] as RetainedSourceVersion['category'],
      bytes: Number(row['logical_bytes']),
    }));
    return {
      worldId,
      revision: Number(head['revision']),
      rows: [...rows.values()],
      versions,
      recentMembership,
      membershipKeys,
    };
  }
  initialize(snapshot: Awaited<ReturnType<RetentionMetadata['capture']>>): void {
    this.clear();
    this.worldId = snapshot.worldId;
    this.revision = snapshot.revision;
    for (const row of snapshot.rows) {
      this.setLogical(row);
    }
    // The sparse SQL counts include all surviving cold batches for just these
    // candidate identities; selected batch rows must not be counted twice.
    for (const row of snapshot.rows)
      if (row.table === 'mind_temporal_segments')
        adjustMembership(this.membership.get(row.actorId)!, row, -1);
    for (const value of snapshot.recentMembership) {
      let membership = this.membership.get(value.actorId);
      if (!membership) this.membership.set(value.actorId, (membership = new Map()));
      let counts = membership.get(value.kind);
      if (!counts) membership.set(value.kind, (counts = new Map()));
      counts.set(value.id, (counts.get(value.id) ?? 0) + value.count);
    }
    this.membershipKeys = {
      aliases: new Set(snapshot.membershipKeys.aliases),
      individuals: new Set(snapshot.membershipKeys.individuals),
    };
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

  private changed(changes: RecordChanges): void {
    const tables = this.logical;
    for (const [table, records] of tables) {
      const direct = new Set(changes.deletes.get(table) ?? []);
      if (table === 'mind_temporal_segments')
        for (const parent of changes.deletes.get('mind_temporal_chunks') ?? [])
          for (const id of this.parents.get(parent) ?? []) direct.add(id);
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
            this.removeLogical(row);
          }
      } else
        for (const id of direct) {
          const row = records.get(id);
          if (!row) continue;
          this.removeLogical(row);
        }
    }
    for (const [table, rows] of changes.writes)
      if (indexed.has(table))
        for (const row of rows) {
          const value = metadata(table as Table, row);
          this.setLogical(value);
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
  fromRecords(worldId: string, changes: RecordChanges): void {
    this.initializeEmpty(worldId);
    this.changed(changes);
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
    if (
      this.membershipKeys &&
      kind !== 'account-alias' &&
      !(kind === 'individual' ? this.membershipKeys.individuals : this.membershipKeys.aliases).has(
        id,
      )
    )
      throw new Error('Retirement requires an uncaptured cold membership proof.');
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
