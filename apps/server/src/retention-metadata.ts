import {
  selectedTemporalPolicy,
  temporalOpenReservationTotals,
  temporalPageLastReceivedAt,
  selectedObserverIdentityKnowledge,
  temporalPageOperations,
  temporalOperationHeader,
  type WorldState,
} from '@open-legend/domain';
import {
  maximumTemporalPreparationRows,
  selectTemporalRetirement,
  temporalPageRecordId,
  type TemporalRetentionHeader,
} from './temporal-storage.js';
import { RECORD_NODES, RECORD_PARENTS, liveEvidenceRowSql } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { AccountRetentionMetadata } from './retention-record-metadata.js';
import { countMetric } from './performance.js';
import { receiptLookupBucket } from './temporal-page-storage.js';
import type { MetadataBaseline } from './live-read-overlay.js';

interface RetentionSelection {
  recentActors: readonly string[];
  changes: RecordChanges;
  world: WorldState;
  previous?: WorldState;
}
interface RetentionSnapshot {
  worldId: string;
  revision: number;
  rows: RetentionRow[];
  accountNextDue: Array<[string, number | null]>;
  accountMore: string[];
}

export const accountTables = ['mind_awareness', 'mind_memories', 'mind_summaries'] as const;
const indexedTables = [...accountTables, 'mind_temporal_pages', 'mind_temporal_supports'] as const;
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
  'policy_priority',
  'active_or_protected',
  'next_due_at',
  'account_revision',
  'retention_metadata',
] as const;
const selectedColumns: Record<(typeof indexedTables)[number], readonly string[]> = {
  mind_awareness: accountColumns,
  mind_summaries: accountColumns,
  mind_memories: [...accountColumns, 'unresolved', 'expires_at', 'weaken_at'],
  mind_temporal_pages: [
    'actor_id',
    'source_id',
    'physical_life',
    'receipt_epoch',
    'first_ordinal',
    'last_ordinal',
    'first_order',
    'first_at',
    'last_at',
    'last_received_at',
    'logical_bytes',
    'receipt_count',
    'source_ids',
    'individual_ids',
    'value_refs',
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
const preparedMetadata = new WeakMap<RowChange, RetentionRow>();

type MembershipKind = 'account-alias' | 'recent-alias' | 'individual';
type Memberships = Map<MembershipKind, Map<string, number>>;
function rowMembership(row: RetentionRow): Array<[MembershipKind, Iterable<string>]> {
  if (row.table === 'mind_temporal_pages')
    return [
      ['recent-alias', row.columns['source_ids'] as string[]],
      ['individual', row.columns['individual_ids'] as string[]],
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
  const result: RetentionRow = {
    table,
    id: row.id,
    parent: row.parent,
    position: row.position,
    actorId: String(columns['actor_id']),
    columns,
    encodedBytes: Buffer.byteLength(row.payload),
  };
  preparedMetadata.set(row, result);
  return result;
}
function nativePageMetadata(
  page: import('@open-legend/domain').TemporalPage,
  reservation: number,
): RetentionRow {
  const id = temporalPageRecordId(page.actorId, page.id);
  return {
    table: 'mind_temporal_pages',
    id,
    parent: JSON.stringify(['world', 'experience', 'temporal', 'actors', page.actorId, 'pages']),
    position: page.order,
    actorId: page.actorId,
    encodedBytes: reservation,
    columns: {
      actor_id: page.actorId,
      source_id: page.id,
      physical_life: page.physicalLife,
      receipt_epoch: page.epoch,
      first_ordinal: page.fromOrdinal,
      last_ordinal: page.throughOrdinal,
      first_order:
        page.operations[0]?.kind === 'check'
          ? page.operations[0].order
          : page.operations[0]?.receipt.order,
      first_at: page.fromAt,
      last_at: page.throughAt,
      last_received_at: temporalPageLastReceivedAt(page),
      logical_bytes: page.bytes,
      receipt_count: page.count,
      source_ids: page.sourceIds,
      individual_ids: page.individualIds,
      value_refs: page.sourceRefs,
    },
  };
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
    through: Number(c['last_received_at']),
    bytes: Number(c['logical_bytes']),
    count: Number(c['receipt_count']),
    sources: [],
    order: Number(c['first_order']),
    epoch: String(c['receipt_epoch']),
    ordinal: Number(c['last_ordinal']),
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
  private partial = false;
  private accountNextDue = new Map<string, number | null>();
  private accountMore = new Set<string>();
  revision = 0;

  clear(): void {
    this.worldId = undefined;
    this.logical.clear();
    this.actors.clear();
    this.membership.clear();
    this.revision = 0;
    this.partial = false;
    this.accountNextDue.clear();
    this.accountMore.clear();
  }
  assertWorld(worldId: string): void {
    if (this.worldId !== worldId)
      throw new Error('Complete personal retention metadata is unavailable for this world.');
  }
  async capture(
    db: SqlDatabase,
    worldId: string,
    actorIds: readonly string[],
    selection: RetentionSelection,
  ): Promise<RetentionSnapshot> {
    return db.readMetadataBaseline
      ? db.readMetadataBaseline(actorIds, (baseline) =>
          this.captureBaseline(db, worldId, actorIds, selection, baseline),
        )
      : this.captureBaseline(db, worldId, actorIds, selection);
  }
  private async captureBaseline(
    db: SqlDatabase,
    worldId: string,
    actorIds: readonly string[],
    selection: RetentionSelection,
    baseline?: MetadataBaseline,
  ): Promise<RetentionSnapshot> {
    const head =
      baseline ??
      (await db
        .prepare('SELECT world_id,revision FROM world_head WHERE id=1')
        .get()
        .then((row) => ({
          worldId: String(row?.['world_id']),
          revision: Number(row?.['revision']),
        })));
    if (!head || head.worldId !== worldId) throw new Error('Retention metadata world changed.');
    const projection = (table: Table) => {
      const encoded = 'octet_length(t.payload)';
      return `SELECT '${table}' AS table_name,t.id,t.parent_id,t.position,t.actor_id,
        jsonb_build_object(${selectedColumns[table].flatMap((name) => [`'${name}'`, `t.${name}`]).join(',')}) AS columns,
        ${encoded} AS encoded_bytes`;
    };
    const rows = new Map<string, RetentionRow>();
    const add = (values: Record<string, unknown>[]) => {
      for (const row of values) {
        const value = parseRetentionRow(row);
        rows.set(identity(value.table, value.id), value);
        if (value.table === 'mind_temporal_pages') countMetric('retention.segmentMetadataRows');
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
    const accountNextDue = new Map<string, number | null>(),
      accountMore = new Set<string>();
    for (const actorId of accountActors) {
      const accounts = selection.world.experience?.temporal?.actors[actorId]?.accounts;
      const due =
        !accounts || (accounts.nextDue !== null && accounts.nextDue <= selection.world.simTime);
      const pressured = (['optional', 'required', 'speech'] as const).filter(
        (pool) =>
          !accounts ||
          accounts[pool].bytes > policy[pool].maxBytes ||
          accounts[pool].count > policy[pool].maxRecords,
      );
      for (const table of accountTables) {
        const overridden = new Set([
          ...(selection.changes.deletes.get(table) ?? []),
          ...(selection.changes.writes.get(table) ?? []).map((row) => row.id),
        ]);
        // Only exact old rows are needed by replacement/source-version planning.
        const changed = [
          ...new Set([
            ...(selection.changes.deletes.get(table) ?? []),
            ...(selection.changes.writes.get(table) ?? [])
              .filter((row) => !row.create)
              .map((row) => row.id),
          ]),
        ];
        if (changed.length)
          add(
            await db
              .prepare(
                `${projection(table)} FROM ${table} t
          WHERE t.world_id=? AND t.actor_id=? AND t.id=ANY(?::text[])`,
              )
              .all(worldId, actorId, changed),
          );
        const criteria = [
          ...(due ? [{ sql: 't.next_due_at<=?', params: [selection.world.simTime] }] : []),
          ...pressured.map((pool) => ({ sql: 't.retention_class=?', params: [pool] })),
        ];
        for (const criterion of criteria) {
          const page = await db
            .prepare(
              `${projection(table)} FROM ${table} t
            WHERE t.world_id=? AND t.actor_id=? AND t.retention_class<>'sensory'
            AND t.active_or_protected=0 AND NOT(t.id=ANY(?::text[])) AND ${criterion.sql}
            ORDER BY t.policy_priority,t.at,t.source_id COLLATE "C" LIMIT 65`,
            )
            .all(worldId, actorId, [...overridden], ...criterion.params);
          add(page);
          if (page.length === 65 && criterion.sql === 't.next_due_at<=?') accountMore.add(actorId);
        }
        const next = await db
          .prepare(
            `SELECT MIN(next_due_at) AS due FROM ${table}
          WHERE world_id=? AND actor_id=? AND retention_class<>'sensory' AND active_or_protected=0
          AND next_due_at>? AND NOT(id=ANY(?::text[]))`,
          )
          .get(worldId, actorId, selection.world.simTime, [...overridden]);
        if (next?.['due'] !== null && next?.['due'] !== undefined)
          accountNextDue.set(
            actorId,
            Math.min(accountNextDue.get(actorId) ?? Infinity, Number(next['due'])),
          );
      }
    }

    const retired = selection.changes.deletes.get('mind_temporal_pages') ?? [];
    const ownerDeleted = (actorId: string) =>
      deletedAncestor(
        selection.changes,
        'mind_temporal_pages',
        JSON.stringify(['world', 'experience', 'temporal', 'actors', actorId, 'pages']),
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
        : (selection.changes.writes.get('mind_temporal_pages') ?? [])) {
        const value = metadata('mind_temporal_pages', row);
        if (
          value.actorId === actorId &&
          !deletedBy(selection.changes, value.table, value.id, value.parent)
        )
          overrides.set(value.id, retentionHeader(value));
      }
      if (!wholeOwner)
        for (const intent of selection.changes.temporal?.values() ?? []) {
          if (intent.after.actorId !== actorId) continue;
          const value = nativePageMetadata(intent.after, intent.reservedBytes);
          if (!deletedBy(selection.changes, value.table, value.id, value.parent))
            overrides.set(value.id, retentionHeader(value));
        }
      for (const chunk of wholeOwner ? [] : actor.pages) {
        const id = temporalPageRecordId(actorId, chunk.id);
        const parent = JSON.stringify([
          'world',
          'experience',
          'temporal',
          'actors',
          actorId,
          'pages',
        ]);
        if (deletedBy(selection.changes, 'mind_temporal_pages', id, parent)) continue;
        overrides.set(id, {
          id,
          sourceId: chunk.id,
          at: chunk.fromAt,
          through: temporalPageLastReceivedAt(chunk),
          bytes: chunk.bytes,
          count: chunk.count,
          sources: chunk.sourceRefs,
          order: temporalOperationHeader(chunk, temporalPageOperations(chunk)[0]!).order,
          epoch: chunk.epoch,
          ordinal: chunk.throughOrdinal,
        });
      }
      let cursor: TemporalRetentionHeader | undefined;
      const cold = new Map<string, RetentionRow>();
      for (;;) {
        // A small keyset page is just an input. The semantic selector, not the
        // preparation ceiling, determines which parents need their segment arrays.
        const page = await db
          .prepare(
            `${projection('mind_temporal_pages')}
          FROM mind_temporal_pages t WHERE t.world_id=? AND t.actor_id=?
          AND t.retired_revision IS NULL AND NOT(t.id=ANY(?::text[]))
          ${cursor ? 'AND (t.last_received_at,t.last_ordinal,t.id) > (?,?,?)' : ''}
          ORDER BY t.last_received_at,t.last_ordinal,t.id LIMIT 33`,
          )
          .all(
            worldId,
            actorId,
            [...retired, ...overrides.keys()],
            ...(cursor ? [cursor.through, cursor.ordinal, cursor.id] : []),
          );
        countMetric('retention.headersExamined', page.length);
        if (page.length > maximumTemporalPreparationRows + 1)
          throw new Error('Recent retirement header cohort exceeds bounded preparation.');
        const hasMore = page.length > 32;
        const included = page.slice(0, 32);
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
                (header.through < cursor.through ||
                  (header.through === cursor.through &&
                    (header.ordinal < cursor.ordinal ||
                      (header.ordinal === cursor.ordinal && header.id <= cursor.id))))),
          )
          .sort(
            (a, b) =>
              a.through - b.through ||
              a.ordinal - b.ordinal ||
              (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
          );
        if (wholeOwner) {
          for (const value of cold.values()) {
            rows.set(identity(value.table, value.id), value);
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
        }
        if (picked.boundary) {
          const value = cold.get(picked.boundary.id);
          if (value) rows.set(identity(value.table, value.id), value);
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
    const headers = changed('mind_temporal_pages');
    if (headers.length)
      add(
        await db
          .prepare(
            `${projection('mind_temporal_pages')} FROM mind_temporal_pages t
        WHERE t.world_id=? AND t.actor_id=ANY(?::text[]) AND t.id=ANY(?::text[]) AND ${liveEvidenceRowSql('mind_temporal_pages')}`,
          )
          .all(worldId, actorIds, headers),
      );

    return {
      worldId,
      revision: head.revision,
      rows: [...rows.values()],
      accountNextDue: [...accountNextDue],
      accountMore: [...accountMore],
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
    this.accountNextDue = new Map(snapshot.accountNextDue);
    this.accountMore = new Set(snapshot.accountMore);
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
      const open = temporalOpenReservationTotals(world, actorId);
      let bytes = open.bytes,
        count = open.count;
      for (const row of this.records('mind_temporal_pages', actorId)) {
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
        if ('retained' in value && value.retained && !value.authored)
          add('optional', selectedObserverIdentityKnowledge(world, value));
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
  }
  private removeLogical(row: RetentionRow): void {
    adjustMembership(this.membership.get(row.actorId)!, row, -1);
    this.logical.get(row.table)?.delete(row.id);
    const actors = this.actors.get(row.table);
    const ids = actors?.get(row.actorId);
    ids?.delete(row.id);
    if (!ids?.size) actors?.delete(row.actorId);
  }

  private changed(changes: RecordChanges): void {
    for (const [table, records] of this.logical) {
      for (const row of [...records.values()])
        if (deletedBy(changes, table, row.id, row.parent)) this.removeLogical(row);
    }
    for (const [table, rows] of changes.writes)
      if (indexed.has(table))
        for (const row of rows) this.setLogical(metadata(table as Table, row));
    for (const intent of changes.temporal?.values() ?? [])
      this.setLogical(nativePageMetadata(intent.after, intent.reservedBytes));
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
    return this.partial;
  }
  removedRows(deletes: ReadonlyMap<string, readonly string[]>): Set<RetentionRow> {
    const result = new Set<RetentionRow>();
    for (const [table, ids] of deletes)
      if (indexed.has(table))
        for (const id of ids) {
          const row = this.get(table as Table, id);
          if (row) result.add(row);
        }
    for (const table of indexedTables)
      if (
        [...deletes].some(
          ([ancestor, ids]) => ids.length && ancestor !== table && this.ancestor(table, ancestor),
        )
      )
        for (const row of this.records(table))
          if (deletedBy({ deletes }, table, row.id, row.parent)) result.add(row);
    return result;
  }
  accountDeadline(actorId: string): number | null {
    return this.accountNextDue.get(actorId) ?? null;
  }
  moreAccountCandidates(actorId: string): boolean {
    return this.accountMore.has(actorId);
  }
}

/** The selected durable baseline became stale before a later preparation read.
 * No removal may consume that proof; ordinary maintenance can select a new cut. */
export class RetentionSnapshotChangedError extends Error {
  override name = 'RetentionSnapshotChangedError';
}

/** A preparation owns only changed-row overlays, discarded on refusal/rollback. */
export class RetentionMetadataView {
  private readonly baselineRevision: number;
  private readonly writes = new Map<Table, Map<string, RetentionRow>>();
  private readonly membershipDelta = new Map<string, Memberships>();
  constructor(
    private readonly owner: RetentionMetadata,
    private readonly changes?: RecordChanges,
    private readonly removed?: ReadonlyMap<string, readonly string[]>,
  ) {
    this.baselineRevision = owner.revision;
    for (const [table, rows] of changes?.writes ?? [])
      if (indexed.has(table))
        this.writes.set(
          table as Table,
          new Map(rows.map((row) => [row.id, metadata(table as Table, row)])),
        );
    for (const intent of changes?.temporal?.values() ?? []) {
      let pages = this.writes.get('mind_temporal_pages');
      if (!pages) this.writes.set('mind_temporal_pages', (pages = new Map()));
      const row = nativePageMetadata(intent.after, intent.reservedBytes);
      pages.set(row.id, row);
    }
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
  excluding(removed: ReadonlyMap<string, readonly string[]>): RetentionMetadataView {
    const combined = new Map(this.removed);
    for (const [table, ids] of removed)
      combined.set(table, [...(combined.get(table) ?? []), ...ids]);
    return new RetentionMetadataView(this.owner, this.changes, combined);
  }
  accountDeadline(actorId: string): number | null {
    return this.owner.accountDeadline(actorId);
  }
  moreAccountCandidates(actorId: string): boolean {
    return this.owner.moreAccountCandidates(actorId);
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
    return (
      await this.survivingMembershipBatch(db, worldId, [
        { actorId, aliases, individualIds, includeRecent },
      ])
    )[0]!;
  }

  /** Exceptional edits ask every actor/source question in one statement snapshot.
   * The head is returned even for zero matches; helper-owned transactions and
   * candidate-by-all-pages subplans are unnecessary. */
  async survivingMembershipBatch(
    db: SqlDatabase,
    worldId: string,
    requests: readonly {
      actorId: string;
      aliases: readonly string[];
      individualIds: readonly string[];
      includeRecent: boolean;
    }[],
  ): Promise<Array<{ aliases: Set<string>; individuals: Set<string> }>> {
    const results = requests.map((request) => ({
      aliases: new Set(
        request.aliases.filter((id) => this.hasAlias(request.actorId, id, request.includeRecent)),
      ),
      individuals: new Set(
        request.individualIds.filter((id) => this.hasIndividual(request.actorId, id)),
      ),
    }));
    const inputs = requests.flatMap((request, key) => {
      const { actorId, includeRecent } = request,
        result = results[key]!;
      const aliases = [...new Set(request.aliases.filter((id) => !result.aliases.has(id)))];
      const individuals = [
        ...new Set(request.individualIds.filter((id) => !result.individuals.has(id))),
      ];
      if (!aliases.length && !individuals.length) return [];
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
                ...(table === 'mind_temporal_pages' ? ['actors', actorId, 'pages'] : [actorId]),
              ],
        );
      const scopeRemoved = (table: Table) =>
        [this.changes, this.removed && { deletes: this.removed }].some(
          (changes) => changes && deletedAncestor(changes, table, parent(table)),
        );
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
      const cold = (table: Table) =>
        !scopeRemoved(table) && this.owner.needsColdMembership(table, actorId);
      const awareness = cold('mind_awareness'),
        memories = cold('mind_memories'),
        summaries = cold('mind_summaries');
      const recent = includeRecent && cold('mind_temporal_pages');
      if (!awareness && !memories && !summaries && !recent) return [];
      return [
        {
          key,
          actor_id: actorId,
          aliases,
          individuals,
          awareness,
          memories,
          summaries,
          recent,
          excluded_awareness: excluded('mind_awareness'),
          excluded_memories: excluded('mind_memories'),
          excluded_summaries: excluded('mind_summaries'),
          excluded_segments: excluded('mind_temporal_pages'),
          buckets: [
            ...new Set([
              ...aliases.map((id) => receiptLookupBucket('sourceIds', id)),
              ...individuals.map((id) => receiptLookupBucket('individualIds', id)),
            ]),
          ],
        },
      ];
    });
    // Keep each statement finite, while preserving a single query snapshot for
    // each bounded actor-tagged group. The complete save checks its head once.
    for (let start = 0; start < inputs.length; start += 32) {
      const batch = inputs.slice(start, start + 32);
      const encoded = JSON.stringify(batch);
      if (
        Buffer.byteLength(encoded) > 4 * 1024 * 1024 ||
        batch.reduce((sum, value) => sum + value.aliases.length + value.individuals.length, 0) >
          maximumTemporalPreparationRows
      )
        throw new Error('Personal retention membership exceeds bounded preparation.');
      countMetric(
        'retention.survivalCandidates',
        batch.reduce((sum, value) => sum + value.aliases.length + value.individuals.length, 0),
      );
      const accountQueries = accountTables.map((table) => {
        const suffix =
          table === 'mind_awareness'
            ? 'awareness'
            : table === 'mind_memories'
              ? 'memories'
              : 'summaries';
        return `SELECT q.key,
          ARRAY(SELECT id FROM unnest(q.aliases) id WHERE t.kind IS DISTINCT FROM 'impression' AND
            (id=t.source_id OR id=t.event_id OR jsonb_exists(t.retention_metadata->'aliases',id))) AS aliases,
          ARRAY(SELECT id FROM unnest(q.individuals) id WHERE id=ANY(t.individual_ids)) AS individuals
          FROM requested q JOIN ${table} t ON t.world_id=? AND t.actor_id=q.actor_id
          WHERE q.${suffix} AND NOT(t.id=ANY(q.excluded_${suffix})) AND
            (t.source_id=ANY(q.aliases) OR t.event_id=ANY(q.aliases) OR
              jsonb_exists_any(t.retention_metadata->'aliases',q.aliases) OR t.individual_ids && q.individuals)`;
      });
      const rows = await db
        .prepare(
          `WITH requested AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) q(key int,actor_id text,aliases text[],individuals text[],
            awareness boolean,memories boolean,summaries boolean,recent boolean,
            excluded_awareness text[],excluded_memories text[],excluded_summaries text[],excluded_segments text[],buckets smallint[])
        ), recent_pages AS MATERIALIZED (
          SELECT q.key,q.aliases,q.individuals,t.source_ids,t.individual_ids
          FROM requested q JOIN mind_temporal_pages t ON t.world_id=? AND t.actor_id=q.actor_id
          WHERE q.recent AND t.lookup_buckets && q.buckets
            AND (t.source_ids && q.aliases OR t.individual_ids && q.individuals)
            AND NOT(t.id=ANY(q.excluded_segments))
            AND ${liveEvidenceRowSql('mind_temporal_pages')}
        ), proofs AS (
          ${accountQueries.join(' UNION ALL ')}
          UNION ALL SELECT key,
            ARRAY(SELECT id FROM unnest(aliases) id WHERE id=ANY(source_ids)),
            ARRAY(SELECT id FROM unnest(individuals) id WHERE id=ANY(individual_ids))
          FROM recent_pages
        ) SELECT h.world_id,h.revision,p.key,p.aliases,p.individuals
          FROM world_head h LEFT JOIN proofs p ON true WHERE h.id=1`,
        )
        .all(encoded, worldId, ...accountTables.map(() => worldId));
      if (!rows.length || rows.some((row) => row['world_id'] !== worldId))
        throw new Error('Personal retention membership belongs to another world.');
      if (rows.some((row) => Number(row['revision']) !== this.baselineRevision))
        throw new RetentionSnapshotChangedError('Personal retention membership snapshot changed.');
      for (const row of rows) {
        if (row['key'] === null) continue;
        const result = results[Number(row['key'])]!;
        for (const id of (row['aliases'] as string[] | null) ?? []) {
          if (!result.aliases.has(id)) countMetric('retention.coldSurvivalProofs');
          result.aliases.add(id);
        }
        for (const id of (row['individuals'] as string[] | null) ?? []) {
          if (!result.individuals.has(id)) countMetric('retention.coldSurvivalProofs');
          result.individuals.add(id);
        }
      }
    }
    return results;
  }
}
