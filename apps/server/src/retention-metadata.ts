import {
  experienceMaintenancePressure,
  temporalPageMetadata,
  installTemporalChargeDirectories,
  selectedTemporalPolicy,
  receivedDirectoryContains,
  parseTemporalReceiptId,
  parsePersonalFactAlias,
  temporalReceiptId,
  receivedPositionEligible,
  receivedRecordAliases,
  receivedRecordIndividualIds,
  temporalPageReferences,
  temporalRecentAt,
  type TemporalPage,
  type ReceivedValueLookup,
  type ReceivedChargeDirectory,
  type WorldState,
} from '@open-legend/domain';
import {
  maximumTemporalPreparationRows,
  temporalPageRecordId,
  readTemporalPageRecord,
} from './temporal-storage.js';
import { RECORD_NODES, RECORD_PARENTS, liveEvidenceRowSql } from './world-record-schema.js';
import type { RecordChanges, RowChange } from './world-records.js';
import type { SqlDatabase } from './store.js';
import type { AccountRetentionMetadata } from './retention-record-metadata.js';
import { countMetric } from './performance.js';
import { receiptLookupBucket } from './temporal-page-storage.js';
import type { MetadataBaseline } from './live-read-overlay.js';
import { sqlRowBatches } from './sql-rows.js';

interface RetentionSelection {
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
    'physical_life',
    'receipt_epoch',
    'first_batch_order',
    'first_entry',
    'first_member',
    'last_batch_order',
    'last_entry',
    'last_member',
    'first_at',
    'last_at',
    'entry_bytes',
    'charge_directory',
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
/** Parsing routes a candidate only; the actual entry/member below proves it. */
function directReceiptAlias(id: string): { sourceId: string; memberIndex?: number } | undefined {
  const fact = parsePersonalFactAlias(id),
    sourceId = fact?.observationId ?? id;
  return parseTemporalReceiptId(sourceId)
    ? { sourceId, ...(fact ? { memberIndex: fact.ordinal } : {}) }
    : undefined;
}
const preparedMetadata = new WeakMap<RowChange, RetentionRow>();

type MembershipKind = 'account-alias' | 'individual';
type Memberships = Map<MembershipKind, Map<string, number>>;
function accountOwnershipAliases(columns: RetentionRow['columns']): string[] {
  return columns['kind'] === 'impression'
    ? []
    : [
        String(columns['source_id']),
        ...(columns['event_id'] ? [String(columns['event_id'])] : []),
        ...(columns['retention_metadata'] as AccountRetentionMetadata).aliases,
      ];
}

/** Ownership aliases include copied originals and direct event links; they are
 * broader than source-version dependencies and must not request archival work. */
export function accountWriteSupportAliases(
  table: (typeof accountTables)[number],
  row: RowChange,
): string[] {
  return accountOwnershipAliases(metadata(table, row).columns);
}
function rowMembership(row: RetentionRow): Array<[MembershipKind, Iterable<string>]> {
  // Physical block membership is only a candidate index. An expired sibling's
  // aliases cannot prove personal retention for a still-live boundary block.
  if (row.table === 'mind_temporal_pages') return [];
  if (!accountTables.includes(row.table as (typeof accountTables)[number])) return [];
  return [
    ['account-alias', new Set(accountOwnershipAliases(row.columns))],
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
  world?: WorldState,
): RetentionRow {
  const id = temporalPageRecordId(page.actorId, page.id);
  const prepared = temporalPageMetadata(page, { world });
  return {
    table: 'mind_temporal_pages',
    id,
    parent: JSON.stringify(['world', 'experience', 'temporal', 'actors', page.actorId, 'pages']),
    position: page.order,
    actorId: page.actorId,
    encodedBytes: reservation,
    columns: {
      actor_id: page.actorId,
      physical_life: page.physicalLife,
      receipt_epoch: page.epoch,
      first_batch_order: prepared.firstBatchOrder,
      first_entry: prepared.firstEntry,
      first_member: prepared.firstMember,
      last_batch_order: prepared.lastBatchOrder,
      last_entry: prepared.lastEntry,
      last_member: prepared.lastMember,
      first_at: prepared.firstAt,
      last_at: prepared.lastAt,
      entry_bytes: prepared.entryBytes,
      charge_directory: JSON.stringify(prepared.chargeDirectory),
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

/** Native counters own append charges; only edits or actual exact dependencies
 * require the prior-account/source-version closure. */
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
  private world?: WorldState;
  private logical = new Map<Table, Records>();
  private actors = new Map<Table, Map<string, Set<string>>>();
  private readonly membership = new Map<string, Memberships>();
  private partial = false;
  private accountNextDue = new Map<string, number | null>();
  private accountMore = new Set<string>();
  revision = 0;

  clear(): void {
    this.worldId = undefined;
    this.world = undefined;
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
    this.world = selection.world;
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
      const encoded =
        table === 'mind_temporal_pages'
          ? 't.encoded_bytes'
          : accountTables.includes(table as (typeof accountTables)[number])
            ? 't.logical_bytes'
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
        if (value.table === 'mind_temporal_pages') countMetric('retention.segmentMetadataRows');
      }
    };
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
        (['optional', 'required', 'speech'] as const).some((key) =>
          experienceMaintenancePressure(selection.world, key, accounts[key], 'start'),
        )
      );
    });
    const accountNextDue = new Map<string, number | null>(),
      accountMore = new Set<string>();
    // Each table consumes the whole selected scope in one indexed query family.
    // Criteria keep their own lookahead; the native selector deduplicates them
    // before its single 64-account / 4 MiB allowance, rather than multiplying it.
    for (const table of accountTables) {
      const overridden = new Map<string, Set<string>>(),
        changed = new Map<string, Set<string>>();
      const mark = (target: Map<string, Set<string>>, actorId: string, id: string) => {
        let ids = target.get(actorId);
        if (!ids) target.set(actorId, (ids = new Set()));
        ids.add(id);
      };
      for (const row of selection.changes.writes.get(table) ?? []) {
        const actorId = metadata(table, row).actorId;
        mark(overridden, actorId, row.id);
        if (!row.create) mark(changed, actorId, row.id);
      }
      for (const id of selection.changes.deletes.get(table) ?? []) {
        const actorId = (JSON.parse(id) as string[])[table === 'mind_memories' ? 2 : 3]!;
        mark(overridden, actorId, id);
        mark(changed, actorId, id);
      }
      const requests = accountActors.map((actorId) => {
        const accounts = selection.world.experience?.temporal?.actors[actorId]?.accounts;
        return {
          actor_id: actorId,
          at: selection.world.simTime,
          due:
            !accounts || (accounts.nextDue !== null && accounts.nextDue <= selection.world.simTime),
          pressured: (['optional', 'required', 'speech'] as const).filter(
            (pool) =>
              !accounts ||
              experienceMaintenancePressure(
                selection.world,
                pool,
                accounts[pool],
                accounts.nextDue !== null && accounts.nextDue <= selection.world.simTime
                  ? 'stop'
                  : 'start',
              ),
          ),
          overridden: [...(overridden.get(actorId) ?? [])],
          changed: [...(changed.get(actorId) ?? [])],
        };
      });
      const worldBindings = [worldId, worldId, worldId, worldId];
      const requestRows = requests.map((request) => [
        request.actor_id,
        request.at,
        request.due,
        request.pressured,
        request.overridden,
        request.changed,
      ]);
      for (const batch of sqlRowBatches(requestRows, worldBindings)) {
        const selected = await db
          .prepare(
            `WITH requested(actor_id,at,due,pressured,overridden,changed) AS MATERIALIZED (
          VALUES ${batch.map(() => '(?::text,?::double precision,?::boolean,?::text[],?::text[],?::text[])').join(',')}
        ), scoped AS (
          ${projection(table)},'due'::text AS criterion FROM requested q CROSS JOIN LATERAL (
            SELECT t.* FROM ${table} t WHERE q.due AND t.world_id=? AND t.actor_id=q.actor_id
              AND t.retention_class<>'sensory' AND t.active_or_protected=0 AND t.next_due_at<=q.at
              AND NOT(t.id=ANY(q.overridden))
            ORDER BY t.policy_priority,t.at,t.source_id COLLATE "C" LIMIT 65
          ) t
          UNION ALL
          ${projection(table)},'pressure'::text AS criterion FROM requested q
          CROSS JOIN LATERAL unnest(q.pressured) pool(kind) CROSS JOIN LATERAL (
            SELECT t.* FROM ${table} t WHERE t.world_id=? AND t.actor_id=q.actor_id
              AND t.retention_class=pool.kind AND t.active_or_protected=0 AND NOT(t.id=ANY(q.overridden))
            ORDER BY t.policy_priority,t.at,t.source_id COLLATE "C" LIMIT 65
          ) t
          UNION ALL
          ${projection(table)},'changed'::text AS criterion FROM requested q JOIN ${table} t
            ON t.world_id=? AND t.actor_id=q.actor_id AND t.id=ANY(q.changed)
          UNION ALL
          SELECT '${table}',NULL::text,NULL::text,NULL::bigint,q.actor_id,
            jsonb_build_object('next_due_at',next.due),0::bigint,'deadline'::text
          FROM requested q CROSS JOIN LATERAL (
            SELECT MIN(t.next_due_at) AS due FROM ${table} t
            WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.retention_class<>'sensory'
              AND t.active_or_protected=0 AND t.next_due_at>q.at AND NOT(t.id=ANY(q.overridden))
          ) next
        ) SELECT * FROM scoped`,
          )
          .all(...batch.flat(), ...worldBindings);
        const dueCounts = new Map<string, number>();
        for (const row of selected) {
          const actorId = String(row['actor_id']);
          if (row['criterion'] === 'deadline') {
            const columns = row['columns'] as Record<string, unknown>,
              due = columns['next_due_at'];
            if (due !== null && due !== undefined)
              accountNextDue.set(
                actorId,
                Math.min(accountNextDue.get(actorId) ?? Infinity, Number(due)),
              );
          } else {
            add([row]);
            if (row['criterion'] === 'due') {
              const count = (dueCounts.get(actorId) ?? 0) + 1;
              dueCounts.set(actorId, count);
              if (count === 65) accountMore.add(actorId);
            }
          }
        }
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
    const world = this.world;
    this.clear();
    this.world = world;
    this.worldId = snapshot.worldId;
    this.revision = snapshot.revision;
    for (const row of snapshot.rows) {
      this.setLogical(row);
    }
    this.partial = true;
    this.accountNextDue = new Map(snapshot.accountNextDue);
    this.accountMore = new Set(snapshot.accountMore);
  }
  initializeEmpty(world: WorldState): void {
    this.clear();
    this.worldId = world.id;
    this.world = world;
  }
  /** Support cleanup needs a captured cold remainder, not a claim that every
   * account is resident. No account-candidate query is required to establish it. */
  initializePartial(world: WorldState, baseline: MetadataBaseline): void {
    if (baseline.worldId !== world.id)
      throw new Error('Personal retention metadata belongs to another world.');
    this.initializeIndexed(baseline);
    this.world = world;
  }
  /** An aliases-only reader has no resident account graph. All unoverridden
   * membership remains a real indexed SQL question at this exact baseline. */
  initializeIndexed(baseline: MetadataBaseline): void {
    this.clear();
    this.worldId = baseline.worldId;
    this.revision = baseline.revision;
    this.partial = true;
  }
  /** A restore's copied arrays have no residency certificate. Their independent
   * saved counters must prove every world-owned source is present; a boolean
   * from a caller cannot turn a resident tail into a complete catalogue. Exact
   * archived bodies retain GameSaves' separately validated version ownership. */
  assertCandidateCoverage(world: WorldState): void {
    this.assertWorld(world.id);
    this.world = world;
    for (const [actorId, actor] of Object.entries(world.experience?.temporal?.actors ?? {})) {
      const directories = [...this.records('mind_temporal_pages', actorId)].map((row) => {
        const directory = row.columns['charge_directory'];
        return (
          typeof directory === 'string' ? JSON.parse(directory) : directory
        ) as ReceivedChargeDirectory;
      });
      const reconstructed = { ...actor };
      installTemporalChargeDirectories(reconstructed, directories);
      if (reconstructed.bytes !== actor.bytes || reconstructed.count !== actor.count)
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
      if (!intent.deleted)
        this.setLogical(nativePageMetadata(intent.after, intent.reservedBytes, this.world));
  }
  private ancestor(table: string, ancestor: string): boolean {
    let parent = RECORD_PARENTS.get(table);
    while (parent) {
      if (parent === ancestor) return true;
      parent = RECORD_PARENTS.get(parent);
    }
    return false;
  }
  fromRecords(world: WorldState, changes: RecordChanges): void {
    this.initializeEmpty(world);
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
  capturedWorld(): WorldState | undefined {
    return this.world;
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
      if (intent.deleted) continue;
      let pages = this.writes.get('mind_temporal_pages');
      if (!pages) this.writes.set('mind_temporal_pages', (pages = new Map()));
      const row = nativePageMetadata(intent.after, intent.reservedBytes, owner.capturedWorld());
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
  private deleted(row: Pick<RetentionRow, 'table' | 'id' | 'parent'>): boolean {
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
  /** Reuse this captured catalogue with a different accepted/change prefix.
   * Before-state evidence is separate from the edits being prepared. */
  withChanges(changes?: RecordChanges): RetentionMetadataView {
    return new RetentionMetadataView(this.owner, changes);
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
  private hasAlias(actorId: string, id: string): boolean {
    return this.has(actorId, 'account-alias', id);
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
    nativeCut?: WorldState,
  ): Promise<Array<{ aliases: Set<string>; individuals: Set<string> }>> {
    const results = requests.map((request) => ({
      aliases: new Set(request.aliases.filter((id) => this.hasAlias(request.actorId, id))),
      individuals: new Set(
        request.individualIds.filter((id) => this.hasIndividual(request.actorId, id)),
      ),
    }));
    const world = nativeCut ?? this.owner.capturedWorld();
    if (world && world.id !== worldId)
      throw new Error('Personal retention native cut belongs to another world.');
    for (const [key, request] of requests.entries())
      if (
        request.includeRecent &&
        (request.aliases.some((id) => !results[key]!.aliases.has(id)) ||
          request.individualIds.some((id) => !results[key]!.individuals.has(id)))
      ) {
        if (!world) throw new Error('Recent membership requires its captured native cut.');
        const pages = new Map(
          (world.experience?.temporal?.actors[request.actorId]?.pages ?? []).map((page) => [
            page.id,
            page,
          ]),
        );
        for (const intent of [
          ...(this.changes?.temporalEdits ?? []),
          ...(this.changes?.temporal?.values() ?? []),
        ])
          if (intent.after.actorId === request.actorId) {
            if (intent.deleted) pages.delete(intent.after.id);
            else pages.set(intent.after.id, intent.after);
          }
        for (const page of pages.values()) {
          if (
            !this.deleted({
              table: 'mind_temporal_pages',
              id: temporalPageRecordId(page.actorId, page.id),
              parent: JSON.stringify([
                'world',
                'experience',
                'temporal',
                'actors',
                page.actorId,
                'pages',
              ]),
            })
          )
            this.accumulateRecentMembership(
              page,
              world,
              world.receivedValues?.sources ?? {},
              request,
              results[key]!,
            );
          if (
            request.aliases.every((id) => results[key]!.aliases.has(id)) &&
            request.individualIds.every((id) => results[key]!.individuals.has(id))
          )
            break;
        }
      }
    const inputs = requests.flatMap((request, key) => {
      const { actorId, includeRecent } = request,
        result = results[key]!;
      const aliases = [...new Set(request.aliases.filter((id) => !result.aliases.has(id)))];
      const recentAliases = includeRecent ? aliases : [];
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
      const recent =
        includeRecent &&
        (recentAliases.length > 0 || individuals.length > 0) &&
        cold('mind_temporal_pages');
      if (!awareness && !memories && !summaries && !recent) return [];
      return [
        {
          key,
          actor_id: actorId,
          aliases,
          recent_aliases: recentAliases,
          individuals,
          awareness,
          memories,
          summaries,
          recent,
          excluded_awareness: excluded('mind_awareness'),
          excluded_memories: excluded('mind_memories'),
          excluded_summaries: excluded('mind_summaries'),
          excluded_segments: recent ? excluded('mind_temporal_pages') : [],
          buckets: recent
            ? [
                ...new Set([
                  ...recentAliases.map((id) => receiptLookupBucket('sourceIds', id)),
                  ...individuals.map((id) => receiptLookupBucket('individualIds', id)),
                ]),
              ]
            : [],
          age_floor:
            recent && world
              ? Math.max(
                  world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds,
                  world.experience?.temporal?.actors[actorId]?.frontier?.expiredThroughTime ??
                    -Infinity,
                )
              : null,
          pressure_batch: recent
            ? (world?.experience?.temporal?.actors[actorId]?.frontier?.pressureThrough?.address
                .batchOrder ?? null)
            : null,
          pressure_entry: recent
            ? (world?.experience?.temporal?.actors[actorId]?.frontier?.pressureThrough?.address
                .entryIndex ?? null)
            : null,
          pressure_member: recent
            ? (world?.experience?.temporal?.actors[actorId]?.frontier?.pressureThrough?.address
                .memberIndex ?? null)
            : null,
        },
      ];
    });
    // Keep each statement finite, while preserving a single query snapshot for
    // each bounded actor-tagged group. The complete save checks its head once.
    for (let start = 0; start < inputs.length; ) {
      const batch: typeof inputs = [];
      const encodedInputs: string[] = [];
      let bytes = 2,
        keys = 0;
      while (start < inputs.length && batch.length < 32) {
        const input = inputs[start]!;
        const encodedInput = JSON.stringify(input);
        const size = Buffer.byteLength(encodedInput);
        const count = input.aliases.length + input.individuals.length;
        if (size + 2 > 4 * 1024 * 1024 || count > maximumTemporalPreparationRows)
          throw new Error('Personal retention membership exceeds bounded preparation.');
        if (
          batch.length &&
          (bytes + size + 1 > 4 * 1024 * 1024 || keys + count > maximumTemporalPreparationRows)
        )
          break;
        bytes += size + Number(batch.length > 0);
        keys += count;
        batch.push(input);
        encodedInputs.push(encodedInput);
        start++;
      }
      const encoded = `[${encodedInputs.join(',')}]`;
      countMetric('retention.survivalCandidates', keys);
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
          ARRAY(SELECT id FROM unnest(q.individuals) id WHERE id=ANY(t.individual_ids)) AS individuals,
          NULL::text AS page_id,0::bigint AS page_bytes
          FROM requested q JOIN ${table} t ON t.world_id=? AND t.actor_id=q.actor_id
          WHERE q.${suffix} AND NOT(t.id=ANY(q.excluded_${suffix})) AND
            (t.source_id=ANY(q.aliases) OR t.event_id=ANY(q.aliases) OR
              jsonb_exists_any(t.retention_metadata->'aliases',q.aliases) OR t.individual_ids && q.individuals)`;
      });
      const readMembership = () =>
        db
          .prepare(
            `WITH requested AS MATERIALIZED (
          SELECT * FROM jsonb_to_recordset(?::jsonb) q(key int,actor_id text,aliases text[],recent_aliases text[],individuals text[],
            awareness boolean,memories boolean,summaries boolean,recent boolean,
            excluded_awareness text[],excluded_memories text[],excluded_summaries text[],excluded_segments text[],buckets smallint[],
            age_floor double precision,pressure_batch bigint,pressure_entry bigint,pressure_member bigint)
        ), recent_pages AS MATERIALIZED (
          SELECT q.key,t.id,t.encoded_bytes
          FROM requested q JOIN mind_temporal_pages t ON t.world_id=? AND t.actor_id=q.actor_id
          WHERE q.recent AND t.lookup_buckets && q.buckets
            AND (t.source_ids && q.recent_aliases OR t.individual_ids && q.individuals)
            AND NOT(t.id=ANY(q.excluded_segments))
            AND t.last_at>q.age_floor AND (q.pressure_batch IS NULL OR
              (t.last_batch_order,t.last_entry,t.last_member)>(q.pressure_batch,q.pressure_entry,q.pressure_member))
            AND ${liveEvidenceRowSql('mind_temporal_pages')}
        ), proofs AS (
          ${accountQueries.join(' UNION ALL ')}
          UNION ALL SELECT key,ARRAY[]::text[],ARRAY[]::text[],id,encoded_bytes
          FROM recent_pages
        ) SELECT h.world_id,h.revision,p.key,p.aliases,p.individuals,p.page_id,p.page_bytes
          FROM world_head h LEFT JOIN proofs p ON true WHERE h.id=1`,
          )
          .all(encoded, worldId, ...accountTables.map(() => worldId));
      // This view already applied pending membership and excluded its replaced
      // cold rows. A no-recent query needs only headers: the ordinary live SQL
      // overlay would pack unrelated temporal bodies before q.recent filters
      // them out. Keep actual recent/page/value reads on the live path below.
      // docs/projects/bookkeeping-simplification-runtime-design.md#r2--ask-for-membership-without-preparing-history-bodies
      const rows =
        !batch.some((request) => request.recent) && db.readMetadataBaseline
          ? await db.readMetadataBaseline(
              [...new Set(batch.map((request) => request.actor_id))],
              (baseline) => {
                if (baseline.worldId !== worldId)
                  throw new Error('Personal retention membership belongs to another world.');
                if (baseline.revision !== this.baselineRevision)
                  throw new RetentionSnapshotChangedError(
                    'Personal retention membership snapshot changed.',
                  );
                return readMembership();
              },
            )
          : await readMembership();
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
      const pageSizes = new Map(
        rows
          .filter((row) => row['page_id'] !== null && row['page_id'] !== undefined)
          .map((row) => [String(row['page_id']), Number(row['page_bytes'])]),
      );
      if (pageSizes.size) {
        if (
          !world ||
          pageSizes.size > maximumTemporalPreparationRows ||
          [...pageSizes.values()].reduce((sum, bytes) => sum + bytes, 0) > 4 * 1024 * 1024
        )
          throw new Error('Recent membership exceeds bounded block preparation.');
        const pages = new Map<string, TemporalPage>();
        for (const row of await db
          .prepare('SELECT * FROM mind_temporal_pages WHERE world_id=? AND id=ANY(?::text[])')
          .all(worldId, [...pageSizes.keys()]))
          pages.set(String(row['id']), readTemporalPageRecord(row));
        if (pages.size !== pageSizes.size)
          throw new Error('Recent membership block is unavailable.');
        const sources: Record<string, ReceivedValueLookup[string]> = {};
        const references = [
          ...new Set([...pages.values()].flatMap((page) => [...temporalPageReferences(page)])),
        ];
        for (const id of references) {
          const value = world.receivedValues?.sources[id];
          if (value) sources[id] = value;
        }
        const missing = references.filter((id) => !sources[id]);
        if (missing.length) {
          const size = await db
            .prepare(
              'SELECT SUM(octet_length(payload)) AS bytes FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .get(worldId, missing);
          if (
            Number(size?.['bytes'] ?? 0) +
              [...pageSizes.values()].reduce((sum, bytes) => sum + bytes, 0) >
            4 * 1024 * 1024
          )
            throw new Error('Recent membership values exceed bounded preparation.');
          for (const row of await db
            .prepare(
              'SELECT source_id,payload FROM mind_perception_values WHERE world_id=? AND source_id=ANY(?::text[])',
            )
            .all(worldId, missing))
            sources[String(row['source_id'])] = JSON.parse(
              String(row['payload']),
            ) as ReceivedValueLookup[string];
          if (missing.some((id) => !sources[id]))
            throw new Error('Recent membership values are unavailable.');
        }
        for (const row of rows)
          if (row['page_id'] !== null && row['page_id'] !== undefined)
            this.accumulateRecentMembership(
              pages.get(String(row['page_id']))!,
              world,
              sources,
              requests[Number(row['key'])]!,
              results[Number(row['key'])]!,
            );
      }
    }
    return results;
  }
  private accumulateRecentMembership(
    page: TemporalPage,
    world: WorldState,
    sources: ReceivedValueLookup,
    request: { actorId: string; aliases: readonly string[]; individualIds: readonly string[] },
    result: { aliases: Set<string>; individuals: Set<string> },
  ): void {
    const actor = world.experience?.temporal?.actors[request.actorId];
    if (!actor || page.actorId !== request.actorId) return;
    const requestedAliases = request.aliases;
    for (const batch of page.batches)
      for (const entry of batch.entries) {
        const locator = {
          actorId: batch.actorId,
          physicalLife: batch.physicalLife,
          epoch: batch.epoch,
          batchOrder: batch.batchOrder,
          entryIndex: entry.entryIndex,
        };
        if (
          !temporalRecentAt(
            entry.receivedAt,
            world.simTime,
            selectedTemporalPolicy(world).recent.maxAgeSeconds,
          ) ||
          !receivedDirectoryContains(actor.recent, locator)
        )
          continue;
        const eligible = (memberIndex: number) =>
          receivedPositionEligible({ ...locator, memberIndex }, entry.receivedAt, actor.frontier) &&
          (entry.kind === 'occurrence' ||
            receivedDirectoryContains(actor.recent, locator, memberIndex));
        if (entry.kind === 'occurrence' && !eligible(0)) continue;
        const original = entry.receipt;
        const facets = original.facets.filter((facet) => eligible(facet.memberIndex));
        if (!facets.length && (original.facets.length || !eligible(0))) continue;
        const receipt =
          facets.length === original.facets.length ? original : { ...original, facets };
        const aliases = new Set(
          receivedRecordAliases(batch, { ...entry, receipt }, sources, world),
        );
        for (const alias of requestedAliases) {
          const direct = directReceiptAlias(alias);
          if (direct) {
            if (
              direct.sourceId === temporalReceiptId(locator) &&
              (direct.memberIndex === undefined ||
                facets.some((facet) => facet.memberIndex === direct.memberIndex))
            )
              result.aliases.add(alias);
          } else if (aliases.has(alias)) result.aliases.add(alias);
        }
        const individuals = new Set(receivedRecordIndividualIds(receipt, sources));
        for (const id of request.individualIds) if (individuals.has(id)) result.individuals.add(id);
      }
  }
}
