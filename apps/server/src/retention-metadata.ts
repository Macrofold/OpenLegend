import {
  selectedTemporalPolicy,
  temporalChunkOperations,
  temporalOperationHeader,
  type PersonalSourceRef,
  type WorldState,
} from '@open-legend/domain';
import {
  compareTemporalRetentionHeaders,
  maximumTemporalPreparationRows,
  selectTemporalRetirement,
  temporalChunkRecordId,
  type TemporalRetentionHeader,
} from './temporal-storage.js';
import { RECORD_NODES, RECORD_PARENTS, liveEvidenceRowSql } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { AccountRetentionMetadata } from './retention-record-metadata.js';
import type { RetainedSourceVersion } from './source-version-retention.js';
import { countMetric } from './performance.js';

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
function parseRetentionRow(row: Record<string, unknown>): RetentionRow {
  return {
    table: String(row['table_name']) as Table,
    id: String(row['id']),
    parent: String(row['parent_id']),
    position: Number(row['position']),
    actorId: String(row['actor_id']),
    columns: row['columns'] as RetentionRow['columns'],
    encodedBytes: Number(row['encoded_bytes']),
  };
}
function retentionHeader(row: RetentionRow): TemporalRetentionHeader {
  const c = row.columns;
  return {
    id: row.id,
    position: row.position,
    encodedBytes: row.encodedBytes,
    sourceId: String(c['source_id']),
    at: Number(c['first_at']),
    through: Number(c['last_at']),
    bytes: Number(c['logical_bytes']),
    count: Number(c['receipt_count']),
    sources: [],
    order: Number(c['first_order']),
    epoch: String(c['receipt_epoch']),
    ordinal: Number(c['first_ordinal']),
  };
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
  return !!changes.deletes.get(table)?.includes(id) || deletedAncestor(changes, table, parent);
}
function deletedAncestor(
  changes: { deletes: ReadonlyMap<string, readonly string[]> },
  table: string,
  parent: string,
): boolean {
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
  private partial = false;
  private completeAccounts = new Set<string>();
  revision = 0;

  clear(): void {
    this.worldId = undefined;
    this.logical.clear();
    this.actors.clear();
    this.membership.clear();
    this.parents.clear();
    this.versions.clear();
    this.revision = 0;
    this.partial = false;
    this.completeAccounts.clear();
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
    completeAccounts: string[];
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
        const value = parseRetentionRow(row);
        rows.set(identity(value.table, value.id), value);
        if (value.table === 'mind_temporal_segments') countMetric('retention.segmentMetadataRows');
      }
    };
    const policy = selectedTemporalPolicy(selection.world);
    // Account/version closure is independent of recent sensory quota. Only actual
    // account maintenance or edits need its complete dependency metadata.
    const changedAccounts = new Set<string>();
    for (const table of accountTables)
      for (const row of selection.changes.writes.get(table) ?? [])
        if (accountWriteNeedsRetentionClosure(table, row))
          changedAccounts.add(metadata(table, row).actorId);
    for (const id of actorIds)
      for (const table of accountTables) {
        const parent = JSON.stringify(
          table === 'mind_memories'
            ? ['world', 'memories', id]
            : ['world', 'experience', table === 'mind_awareness' ? 'awareness' : 'summaries', id],
        );
        if (
          deletedAncestor(selection.changes, table, parent) ||
          (selection.changes.deletes.get(table) ?? []).some((key) =>
            key.startsWith(parent.slice(0, -1) + ','),
          )
        )
          changedAccounts.add(id);
      }
    const accountActors = actorIds.filter((id) => {
      const accounts = selection.world.experience?.temporal?.actors[id]?.accounts;
      return (
        changedAccounts.has(id) ||
        !accounts ||
        (accounts.nextDue !== null && accounts.nextDue <= selection.world.simTime) ||
        (['optional', 'required', 'speech'] as const).some(
          (key) =>
            accounts[key].bytes > policy[key].maxBytes ||
            accounts[key].count > policy[key].maxRecords,
        )
      );
    });
    if (accountActors.length)
      add(
        await db
          .prepare(
            accountTables
              .map(
                (table) => `${projection(table)} FROM ${table} t
        WHERE t.world_id=? AND t.actor_id=ANY(?::text[])`,
              )
              .join(' UNION ALL '),
          )
          .all(...accountTables.flatMap(() => [worldId, accountActors])),
      );

    const retired = selection.changes.deletes.get('mind_temporal_chunks') ?? [];
    const retirementParents = new Set(retired);
    const ownerDeleted = (actorId: string) =>
      deletedAncestor(
        selection.changes,
        'mind_temporal_chunks',
        JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'chunks']),
      );
    for (const actorId of actorIds) {
      const wholeOwner = ownerDeleted(actorId);
      const actor =
        selection.world.experience?.temporal?.actors[actorId] ??
        (wholeOwner ? selection.previous?.experience?.temporal?.actors[actorId] : undefined);
      if (!actor) continue;
      if (!wholeOwner && !selection.recentActors.includes(actorId)) continue;
      const overrides = new Map<string, TemporalRetentionHeader>();
      for (const row of wholeOwner
        ? []
        : (selection.changes.writes.get('mind_temporal_chunks') ?? [])) {
        const value = metadata('mind_temporal_chunks', row);
        if (
          value.actorId === actorId &&
          !deletedBy(selection.changes, value.table, value.id, value.parent)
        )
          overrides.set(value.id, retentionHeader(value));
      }
      for (const chunk of wholeOwner ? [] : actor.chunks) {
        const id = temporalChunkRecordId(actorId, chunk.id);
        const parent = JSON.stringify([
          'world',
          'experience',
          'temporal',
          'actors',
          actorId,
          'chunks',
        ]);
        if (deletedBy(selection.changes, 'mind_temporal_chunks', id, parent)) continue;
        overrides.set(id, {
          id,
          sourceId: chunk.id,
          at: chunk.fromAt,
          through: chunk.throughAt,
          bytes: chunk.bytes,
          count: chunk.count,
          sources: chunk.sourceRefs,
          order: temporalOperationHeader(chunk, temporalChunkOperations(chunk)[0]!).order,
          epoch: chunk.epoch,
          ordinal: chunk.fromOrdinal,
        });
      }
      let cursor: TemporalRetentionHeader | undefined;
      const cold = new Map<string, RetentionRow>();
      for (;;) {
        // A small keyset page is just an input. The semantic selector, not the
        // preparation ceiling, determines which parents need their segment arrays.
        const page = await db
          .prepare(
            `${projection('mind_temporal_chunks')}
          FROM mind_temporal_chunks t WHERE t.world_id=? AND t.actor_id=?
          AND t.retired_revision IS NULL AND NOT(t.id=ANY(?::text[]))
          ${cursor ? 'AND (t.first_at,t.first_order) > (?,?)' : ''}
          ORDER BY t.first_at,t.first_order FETCH FIRST 33 ROWS WITH TIES`,
          )
          .all(
            worldId,
            actorId,
            [...retired, ...overrides.keys()],
            ...(cursor ? [cursor.at, cursor.order] : []),
          );
        countMetric('retention.headersExamined', page.length);
        if (page.length > maximumTemporalPreparationRows + 1)
          throw new Error('Recent retirement header cohort exceeds bounded preparation.');
        const hasMore = page.length > 32;
        const edge = page[31];
        const edgeColumns = edge?.['columns'] as RetentionRow['columns'] | undefined;
        const included = !edgeColumns
          ? page
          : page.filter((row) => {
              const columns = row['columns'] as RetentionRow['columns'];
              return (
                Number(columns['first_at']) < Number(edgeColumns['first_at']) ||
                (Number(columns['first_at']) === Number(edgeColumns['first_at']) &&
                  Number(columns['first_order']) <= Number(edgeColumns['first_order']))
              );
            });
        for (const row of included) {
          const value = parseRetentionRow(row);
          cold.set(value.id, value);
        }
        const last = included.at(-1);
        cursor = last ? retentionHeader(parseRetentionRow(last)) : cursor;
        const ordered = [...[...cold.values()].map(retentionHeader), ...overrides.values()]
          .filter(
            (header) =>
              !hasMore ||
              (cursor &&
                (header.at < cursor.at ||
                  (header.at === cursor.at && header.order <= cursor.order))),
          )
          .sort(compareTemporalRetentionHeaders);
        if (wholeOwner) {
          for (const value of cold.values()) {
            rows.set(identity(value.table, value.id), value);
            retirementParents.add(value.id);
          }
          cold.clear();
          if (hasMore) continue;
          break;
        }
        const picked = selectTemporalRetirement(selection.world, actorId, ordered, !hasMore);
        if (picked.needsMore) continue;
        countMetric('retention.evictionHeaders', picked.retired.length);
        for (const header of picked.retired) {
          const value = cold.get(header.id);
          if (value) rows.set(identity(value.table, value.id), value);
          retirementParents.add(header.id);
        }
        if (picked.boundary) {
          const value = cold.get(picked.boundary.id);
          if (value) rows.set(identity(value.table, value.id), value);
          if (picked.partial) retirementParents.add(picked.boundary.id);
        }
        break;
      }
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

    const versions = (
      accountActors.length
        ? await db
            .prepare(
              "SELECT actor_id,source_kind,source_id,revision,retention_class,logical_bytes FROM mind_source_versions WHERE world_id=? AND actor_id=ANY(?::text[]) AND source_kind IN ('awareness','memory','summary') ORDER BY retired_revision,actor_id,source_kind,source_id,revision",
            )
            .all(worldId, accountActors)
        : []
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
      completeAccounts: accountActors,
    };
  }
  initialize(snapshot: Awaited<ReturnType<RetentionMetadata['capture']>>): void {
    this.clear();
    this.worldId = snapshot.worldId;
    this.revision = snapshot.revision;
    for (const row of snapshot.rows) {
      this.setLogical(row);
    }
    this.partial = true;
    this.completeAccounts = new Set(snapshot.completeAccounts);
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
    return this.membership.get(actorId)?.get(kind)?.get(id) ?? 0;
  }
  needsColdMembership(table: Table, actorId: string): boolean {
    return (
      this.partial && (table === 'mind_temporal_segments' || !this.completeAccounts.has(actorId))
    );
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
      if ((actorId === undefined || row.actorId === actorId) && !this.deleted(row)) yield row;
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
  private hasAlias(actorId: string, id: string, includeRecent: boolean): boolean {
    return (
      this.has(actorId, 'account-alias', id) ||
      (includeRecent && this.has(actorId, 'recent-alias', id))
    );
  }
  private hasIndividual(actorId: string, id: string): boolean {
    return this.has(actorId, 'individual', id);
  }
  /** Prove only actual removal candidates. Captured rows and pending writes are
   * evaluated here; SQL sees only the untouched cold remainder. Boolean proofs
   * therefore never need subtraction after a replacement or parent removal. */
  async survivingMembership(
    db: SqlDatabase,
    worldId: string,
    actorId: string,
    aliases: readonly string[],
    individualIds: readonly string[],
    includeRecent: boolean,
  ): Promise<{ aliases: Set<string>; individuals: Set<string> }> {
    const retained = new Set(aliases.filter((id) => this.hasAlias(actorId, id, includeRecent)));
    const individuals = new Set(individualIds.filter((id) => this.hasIndividual(actorId, id)));
    if (
      !aliases.some((id) => !retained.has(id)) &&
      !individualIds.some((id) => !individuals.has(id))
    )
      return { aliases: retained, individuals };
    const coldAccounts = accountTables.filter((table) =>
      this.owner.needsColdMembership(table, actorId),
    );
    const coldRecent =
      includeRecent && this.owner.needsColdMembership('mind_temporal_segments', actorId);
    if (!coldAccounts.length && !coldRecent) return { aliases: retained, individuals };
    const excluded = (table: Table) => [
      ...new Set([
        ...[...this.owner.records(table, actorId)].map((row) => row.id),
        ...[...(this.writes.get(table)?.values() ?? [])]
          .filter((row) => row.actorId === actorId)
          .map((row) => row.id),
        ...(this.changes?.deletes.get(table) ?? []),
        ...(this.removed?.get(table) ?? []),
      ]),
    ];
    const parent = (table: Table) =>
      JSON.stringify(
        table === 'mind_memories'
          ? ['world', 'memories', actorId]
          : [
              'world',
              'experience',
              table === 'mind_awareness'
                ? 'awareness'
                : table === 'mind_summaries'
                  ? 'summaries'
                  : 'temporal',
              ...(table === 'mind_temporal_segments' ? ['actors', actorId, 'chunks'] : [actorId]),
            ],
      );
    const scopeRemoved = (table: Table) =>
      [this.changes, this.removed && { deletes: this.removed }].some(
        (changes) => changes && deletedAncestor(changes, table, parent(table)),
      );
    const read = db.readTransaction?.bind(db) ?? db.transaction.bind(db);
    countMetric('retention.survivalCandidates', aliases.length + individualIds.length);
    await read(async () => {
      const head = await db.prepare('SELECT world_id,revision FROM world_head WHERE id=1').get();
      if (head?.['world_id'] !== worldId || Number(head['revision']) !== this.owner.revision)
        throw new Error('Personal retention membership snapshot changed.');
      for (const table of coldAccounts) {
        if (scopeRemoved(table)) continue;
        const pendingAliases = aliases.filter((id) => !retained.has(id));
        const pendingIndividuals = individualIds.filter((id) => !individuals.has(id));
        const wantedAliases = new Set(pendingAliases),
          wantedIndividuals = new Set(pendingIndividuals);
        if (!pendingAliases.length && !pendingIndividuals.length) break;
        // One actor-scoped pass returns matching metadata only. A recent quota
        // eviction does not hydrate every lasting account or source version.
        for (const row of await db
          .prepare(
            `SELECT t.source_id,t.event_id,t.kind,t.individual_ids,t.retention_metadata->'aliases' AS aliases
          FROM ${table} t WHERE t.world_id=? AND t.actor_id=? AND NOT(t.id=ANY(?::text[]))
          AND (t.source_id=ANY(?::text[]) OR t.event_id=ANY(?::text[])
            OR jsonb_exists_any(t.retention_metadata->'aliases',?::text[]) OR t.individual_ids && ?::text[])`,
          )
          .all(
            worldId,
            actorId,
            excluded(table),
            pendingAliases,
            pendingAliases,
            pendingAliases,
            pendingIndividuals,
          )) {
          if (row['kind'] !== 'impression') {
            const support = row['aliases'] as string[];
            for (const id of [
              String(row['source_id']),
              ...(row['event_id'] ? [String(row['event_id'])] : []),
              ...support,
            ])
              if (wantedAliases.has(id) && !retained.has(id)) {
                retained.add(id);
                countMetric('retention.coldSurvivalProofs');
              }
          }
          for (const id of row['individual_ids'] as string[])
            if (wantedIndividuals.has(id) && !individuals.has(id)) {
              individuals.add(id);
              countMetric('retention.coldSurvivalProofs');
            }
        }
      }
      if (coldRecent && !scopeRemoved('mind_temporal_segments')) {
        const removedParents = [
          ...new Set([
            ...(this.changes?.deletes.get('mind_temporal_chunks') ?? []),
            ...(this.removed?.get('mind_temporal_chunks') ?? []),
          ]),
        ];
        for (const [column, keys, target] of [
          ['occurrence_source_ids', aliases.filter((id) => !retained.has(id)), retained],
          [
            'occurrence_individual_ids',
            individualIds.filter((id) => !individuals.has(id)),
            individuals,
          ],
        ] as const) {
          if (!keys.length) continue;
          for (const row of await db
            .prepare(
              `SELECT candidate.id FROM unnest(?::text[]) candidate(id)
            WHERE EXISTS(SELECT 1 FROM mind_temporal_segments t WHERE t.world_id=? AND t.actor_id=?
              AND t.${column} @> ARRAY[candidate.id]::text[]
              AND NOT(t.id=ANY(?::text[])) AND NOT(t.parent_id=ANY(?::text[]))
              AND ${liveEvidenceRowSql('mind_temporal_segments')})`,
            )
            .all(keys, worldId, actorId, excluded('mind_temporal_segments'), removedParents)) {
            target.add(String(row['id']));
            countMetric('retention.coldSurvivalProofs');
          }
        }
      }
    });
    return { aliases: retained, individuals };
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
