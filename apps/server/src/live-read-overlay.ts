import { temporalPageReferences } from '@open-legend/domain';
import { createHash } from 'node:crypto';
import { RECORD_NODES, RECORD_PARENTS } from './world-record-schema.js';
import { mergeRowChange, type RecordChanges, type RowChange } from './world-records.js';
import {
  mergeSourceVersionChanges,
  sourceVersionKey,
  type SourceVersionPlan,
  type SourceVersionChange,
} from './source-version-retention.js';
import {
  historyAccountAtCapturedCut,
  type PreparedHistoryRead,
  type HistoryAccountCut,
} from './history-preparation.js';
import { historyEventRow, historyPerspectiveRow } from './history-append.js';
import { receivedCurrentOwnerTables } from './received-record-references.js';
import { receivedRowOwner } from './received-value-ownership.js';
import { LexicalPreparationError } from './lexical-projection.js';
import {
  MEMORY_SOURCE_ELIGIBILITY,
  MEMORY_SOURCE_TABLES,
  pendingRecallRows,
  MemoryPreparationError,
  SOURCE_DEPENDENCY_COLUMNS,
  PLACE_CAPSULE_COLUMNS,
  sourceDerivationDependencies,
  sourceIdentityDependencies,
  sourcePlaceRows,
  supportPlaceRows,
  type PreparedMemorySources,
} from './memory-repository.js';

/** Immutable accepted cuts owned by the existing pending writer. Readers retain
 * selected rows, not a second writable world or a new durable publication head. */
export interface LiveReadCut {
  through: number;
  changes: RecordChanges;
  history?: PreparedHistoryRead;
  getSources?: (actorId?: string) => PreparedMemorySources;
  versions?: SourceVersionPlan;
}
export interface LiveReadCuts {
  worldId: string;
  timeline: string;
  generation: string;
  storageGeneration: string;
  sequence: number;
  durableSequence: number;
  revision: number;
  inFlightThrough?: number;
  cuts: readonly LiveReadCut[];
  historyEligibility?: ReadonlyMap<string, HistoryAccountCut>;
}
export interface LiveReadActorScope {
  worldId: string;
  actorId: string;
}
export type LiveReadCutsProvider = (actor?: LiveReadActorScope) => LiveReadCuts | undefined;
/** Canonical metadata is merged with pending record changes by its semantic
 * consumer. Version replacements also belong to that captured publication. */
export interface MetadataBaseline {
  worldId: string;
  revision: number;
  versions?: SourceVersionPlan;
}
interface PendingTable {
  keys: readonly string[];
  rows: Map<string, Record<string, unknown>>;
  removed: Map<string, Record<string, unknown>>;
  removedScopes: Record<string, unknown>[];
}
const rowKey = (keys: readonly string[], row: Record<string, unknown>) =>
  JSON.stringify(keys.map((key) => row[key]));
const eventColumns = ['world_id', 'id', 'position', 'payload', 'response_id', 'data_references'];
const perspectiveColumns = [
  'world_id',
  'event_id',
  'actor_id',
  'payload',
  'position',
  'event_type',
  'source_id',
  'target_id',
  'speech_peer_id',
  'response_action',
  'temporal_life',
  'temporal_epoch',
  'temporal_ordinal',
];
const versionColumns = [
  'world_id',
  'actor_id',
  'source_kind',
  'source_id',
  'revision',
  'payload',
  'retired_revision',
  'retention_class',
  'logical_bytes',
];
const record = (columns: readonly string[], values: readonly unknown[]) =>
  Object.fromEntries(columns.map((column, index) => [column, values[index]]));
const keyColumns: Record<string, readonly string[]> = {
  mind_temporal_pages: ['world_id', 'id'],
  received_value_uses: ['world_id', 'owner_kind', 'owner_id', 'value_id'],
  recall_sources: ['world_id', 'actor_id', 'id', 'source_kind'],
  recall_place_capsules: ['world_id', 'actor_id', 'owner_id', 'owner_kind', 'capsule_key'],
  mind_source_dependencies: SOURCE_DEPENDENCY_COLUMNS,
  mind_impression_spans: [
    'world_id',
    'actor_id',
    'owner_id',
    'physical_life',
    'receipt_epoch',
    'first_ordinal',
    'last_ordinal',
  ],
  history_events: ['world_id', 'id'],
  history_perspectives: ['world_id', 'event_id', 'actor_id'],
  mind_source_versions: ['world_id', 'actor_id', 'source_kind', 'source_id', 'revision'],
};
const referenceMatchers = new Map<string, RegExp>();
const references = (sql: string, table: string) => {
  let pattern = referenceMatchers.get(table);
  if (!pattern) referenceMatchers.set(table, (pattern = new RegExp(`\\b${table}\\b`)));
  return pattern.test(sql);
};
/** Operational authorization, spending and writer transactions never use this view. */
export function mayReadLiveTables(sql: string): boolean {
  return /\b(?:FROM|JOIN)\s+(?:mind_[a-z_]+|recall_sources|recall_place_capsules|history_events|history_perspectives|received_value_uses|world_settings|memory_lexical_progress)\b/i.test(
    sql,
  );
}
/** The SQL read owner also defines which canonical pending rows can be consumed.
 * Actor captures need no physical/configuration bodies from other subsystems. */
export function mayReadLiveRecordTable(table: string): boolean {
  return RECORD_NODES.has(table) && mayReadLiveTables(`SELECT * FROM ${table}`);
}
export function readsPersonalHistory(sql: string): boolean {
  return references(sql, 'history_perspectives');
}
export class LiveReadRevisionError extends MemoryPreparationError {}

/** Lazily project only tables consumed by this read and only its explicit actor.
 * A recall must not encode every observer's pending contacts. All data is derived
 * from the writer's immutable cuts and dies with this bounded read snapshot. */
export class LiveReadOverlay {
  private readonly tables = new Map<string, PendingTable>();
  private readonly prepared = new Set<string>();
  private readonly deletes = new Map<string, string[]>();
  private readonly cache = new Map<string, { sql: string; params: unknown[] }>();
  private readonly cuts: readonly LiveReadCut[];
  private actorValues?: ReadonlySet<string>;
  private readonly rebuildValueOwners = new Set<string>();
  readonly through: number;
  constructor(
    readonly cut: LiveReadCuts,
    private readonly revision: number,
    generation: string,
    worldId: string,
    private readonly actor?: { worldId: string; actorId: string },
  ) {
    if (
      worldId !== cut.worldId ||
      generation !== cut.storageGeneration ||
      revision < cut.revision ||
      revision > cut.revision + 1 ||
      (revision > cut.revision && cut.inFlightThrough === undefined)
    )
      throw new LiveReadRevisionError();
    const durable = revision === cut.revision ? cut.durableSequence : cut.inFlightThrough!;
    this.cuts = cut.cuts.filter((value) => value.through > durable);
    this.through = cut.sequence;
    if (actor && actor.worldId !== cut.worldId) throw new MemoryPreparationError();
  }
  metadataBaseline(actorIds: readonly string[]): MetadataBaseline {
    const selected = new Set(actorIds),
      changes = new Map<string, SourceVersionChange>();
    for (const cut of this.cuts)
      for (const incoming of cut.versions?.changes ?? []) {
        if (!selected.has(incoming.actorId)) continue;
        const value = {
          ...incoming,
          desired: incoming.desired && {
            category: incoming.desired.category,
            bytes: incoming.desired.bytes,
          },
        };
        const id = sourceVersionKey(value),
          prior = changes.get(id);
        changes.set(id, prior ? mergeSourceVersionChanges(prior, value) : value);
      }
    return {
      worldId: this.cut.worldId,
      revision: this.revision,
      ...(changes.size ? { versions: { changes: [...changes.values()] } } : {}),
    };
  }

  private table(name: string): PendingTable {
    let table = this.tables.get(name);
    if (!table)
      this.tables.set(
        name,
        (table = {
          keys: keyColumns[name] ?? ['world_id', 'id'],
          rows: new Map(),
          removed: new Map(),
          removedScopes: [],
        }),
      );
    return table;
  }
  private put(name: string, row: Record<string, unknown>): void {
    if (this.actor && row['actor_id'] !== undefined && row['actor_id'] !== this.actor.actorId)
      return;
    const table = this.table(name),
      key = rowKey(table.keys, row);
    table.rows.set(key, { ...table.rows.get(key), ...row });
    table.removed.delete(key);
  }
  private remove(name: string, row: Record<string, unknown>): void {
    if (this.actor && row['actor_id'] !== undefined && row['actor_id'] !== this.actor.actorId)
      return;
    const table = this.table(name),
      key = rowKey(table.keys, row);
    table.rows.delete(key);
    table.removed.set(key, row);
  }
  private removeScope(name: string, scope: Record<string, unknown>): void {
    if (this.actor && scope['actor_id'] !== undefined && scope['actor_id'] !== this.actor.actorId)
      return;
    const table = this.table(name);
    table.removedScopes.push(scope);
    for (const [key, row] of table.rows)
      if (Object.entries(scope).every(([field, value]) => row[field] === value))
        table.rows.delete(key);
  }
  private netDeletes(table: string): string[] {
    let cached = this.deletes.get(table);
    if (cached) return cached;
    const removed = new Set<string>();
    for (const cut of this.cuts) {
      for (const id of cut.changes.deletes.get(table) ?? []) removed.add(id);
      for (const row of cut.changes.writes.get(table) ?? []) removed.delete(row.id);
    }
    cached = [...removed];
    this.deletes.set(table, cached);
    return cached;
  }
  private pendingActorValues(): ReadonlySet<string> {
    if (this.actorValues) return this.actorValues;
    const values = new Set<string>();
    if (this.actor)
      for (const table of [...receivedCurrentOwnerTables, 'mind_temporal_pages']) {
        const fields = Object.keys(RECORD_NODES.get(table)!.columns ?? {}),
          actor = fields.indexOf('actor_id'),
          refs = fields.indexOf('value_refs');
        for (const cut of this.cuts)
          for (const row of cut.changes.writes.get(table) ?? []) {
            if (row.extra[actor] !== this.actor.actorId) continue;
            for (const id of row.receivedValueAdditions ?? (row.extra[refs] as string[]) ?? [])
              values.add(id);
          }
      }
    for (const cut of this.cuts)
      for (const intent of cut.changes.temporal?.values() ?? [])
        if (!this.actor || intent.after.actorId === this.actor.actorId)
          for (const id of temporalPageReferences(intent.after)) values.add(id);
    this.actorValues = values;
    return values;
  }
  private canonical(name: string): void {
    const fields = Object.keys(RECORD_NODES.get(name)!.columns ?? {}),
      actorColumn = fields.indexOf('actor_id');
    const rows = new Map<string, RowChange>();
    for (const cut of this.cuts) {
      for (const id of cut.changes.deletes.get(name) ?? []) rows.delete(id);
      for (const row of cut.changes.writes.get(name) ?? []) {
        if (
          this.actor &&
          actorColumn >= 0 &&
          row.extra[actorColumn] !== undefined &&
          row.extra[actorColumn] !== this.actor.actorId
        )
          continue;
        if (
          this.actor &&
          name === 'mind_perception_values' &&
          !this.pendingActorValues().has(String(row.extra[fields.indexOf('source_id')]))
        )
          continue;
        rows.set(row.id, mergeRowChange(rows.get(row.id), row, name));
      }
    }
    for (const row of rows.values()) {
      const value: Record<string, unknown> = {
        world_id: this.cut.worldId,
        id: row.id,
        revision: this.revision + 1,
      };
      if (!row.writeColumns)
        Object.assign(value, {
          parent_id: row.parent,
          slot: row.slot,
          position: row.position,
          payload: row.payload,
        });
      for (const [index, field] of fields.entries())
        if (!row.writeColumns || row.writeColumns.includes(field)) value[field] = row.extra[index];
      if (row.writeColumns?.includes('payload')) value['payload'] = row.payload;
      this.put(name, value);
    }
    for (const id of this.netDeletes(name)) this.remove(name, { world_id: this.cut.worldId, id });
  }
  private sources(name: string): void {
    for (const cut of this.cuts) {
      const sources = cut.getSources?.(this.actor?.actorId);
      if (sources) {
        if (name === 'recall_sources')
          for (const row of pendingRecallRows(sources, this.actor?.actorId)) this.put(name, row);
        else
          for (const [kind, entries] of sources.groups)
            for (const entry of entries) {
              if (this.actor && entry.actorId !== this.actor.actorId) continue;
              if (!entry.row.create)
                this.removeScope(
                  name,
                  name === 'mind_source_dependencies'
                    ? {
                        world_id: this.cut.worldId,
                        actor_id: entry.actorId,
                        derived_kind: kind,
                        derived_id: entry.id,
                      }
                    : {
                        world_id: this.cut.worldId,
                        actor_id: entry.actorId,
                        owner_kind: kind,
                        owner_id: entry.id,
                      },
                );
              if (name === 'mind_source_dependencies') {
                for (const row of sourceIdentityDependencies(
                  this.cut.worldId,
                  kind,
                  entry,
                  () => '',
                ))
                  this.put(name, record(SOURCE_DEPENDENCY_COLUMNS, row));
                for (const row of sourceDerivationDependencies(this.cut.worldId, kind, entry))
                  this.put(name, record(SOURCE_DEPENDENCY_COLUMNS, row));
              } else if (name === 'recall_place_capsules')
                for (const row of sourcePlaceRows(this.cut.worldId, kind, entry))
                  this.put(name, record(PLACE_CAPSULE_COLUMNS, row));
              else if (name === 'mind_impression_spans' && kind === 'memory') {
                const memory = JSON.parse(
                  entry.row.payload,
                ) as import('@open-legend/domain').MemoryRecord;
                for (const span of memory.impression?.provenance ?? [])
                  this.put(name, {
                    world_id: this.cut.worldId,
                    actor_id: entry.actorId,
                    owner_id: entry.id,
                    owner_kind: 'memory',
                    physical_life: span.physicalLife,
                    receipt_epoch: span.epoch,
                    first_ordinal: span.from,
                    last_ordinal: span.through,
                  });
              }
            }
      }
      if (name === 'recall_place_capsules')
        for (const row of cut.changes.writes.get('mind_temporal_supports') ?? []) {
          if (!row.create)
            this.removeScope(name, { world_id: this.cut.worldId, support_record_id: row.id });
          for (const value of supportPlaceRows(this.cut.worldId, row))
            this.put(name, record(PLACE_CAPSULE_COLUMNS, value));
        }
      for (const [kind, table] of Object.entries(MEMORY_SOURCE_TABLES))
        for (const id of cut.changes.deletes.get(table) ?? []) {
          const path = JSON.parse(id) as string[],
            actor = path[kind === 'memory' ? 2 : 3],
            source = path.at(-1);
          if (name === 'recall_sources')
            this.remove(name, {
              world_id: this.cut.worldId,
              actor_id: actor,
              id: source,
              source_kind: kind,
            });
          else
            this.removeScope(
              name,
              name === 'mind_source_dependencies'
                ? {
                    world_id: this.cut.worldId,
                    actor_id: actor,
                    derived_kind: kind,
                    derived_id: source,
                  }
                : {
                    world_id: this.cut.worldId,
                    actor_id: actor,
                    owner_kind: kind,
                    owner_id: source,
                  },
            );
        }
    }
  }
  private history(name: string): void {
    const changes: RecordChanges = { writes: new Map(), deletes: new Map(), rows: 0 };
    for (const table of [
      'mind_temporal_pages',
      'mind_awareness',
      'mind_awareness_owners',
      'mind_forgotten',
      'mind_corrections',
    ]) {
      const removed = this.netDeletes(table);
      if (removed.length) changes.deletes.set(table, removed);
    }
    for (const cut of this.cuts) {
      if (name === 'mind_source_versions' && cut.versions) {
        for (const change of cut.versions.changes) {
          if (this.actor && change.actorId !== this.actor.actorId) continue;
          const value: Record<string, unknown> = {
            world_id: this.cut.worldId,
            actor_id: change.actorId,
            source_kind: change.kind,
            source_id: change.id,
            revision: change.revision,
          };
          if (!change.desired) {
            this.remove(name, value);
            continue;
          }
          Object.assign(value, {
            retention_class: change.desired.category,
            logical_bytes: change.desired.bytes,
          });
          if (change.desired.payload !== undefined)
            Object.assign(value, {
              payload: change.desired.payload,
              retired_revision: this.revision + 1,
            });
          this.put(name, value);
        }
      }

      const input = cut.history;
      if (!input) continue;
      for (const id of input.removed) {
        if (name === 'history_events') this.remove(name, { world_id: this.cut.worldId, id });
        else if (name === 'history_perspectives')
          this.removeScope(name, { world_id: this.cut.worldId, event_id: id });
      }
      for (const event of input.changed) {
        if (this.actor && !event.audience.includes(this.actor.actorId)) continue;
        const encoded = JSON.stringify(event),
          eventRow = historyEventRow(this.cut.worldId, event, encoded);
        if (name === 'history_events') {
          this.put(name, record(eventColumns, eventRow));
          continue;
        }
        for (const actor of event.audience) {
          if (this.actor && actor !== this.actor.actorId) continue;
          const received = input.accounts.get(event.id)?.get(actor);
          const eligibility = this.cut.historyEligibility?.get(actor);
          const account = eligibility
            ? historyAccountAtCapturedCut(eligibility, changes, event.id, received)
            : received;
          if (!account || input.forgotten.get(actor)?.has(event.id)) continue;
          const prepared = historyPerspectiveRow(
            this.cut.worldId,
            event,
            actor,
            account.evidence,
            account.awareness,
            Number(eventRow[2]),
            createHash('sha256').update(encoded).digest('hex'),
            account.temporal,
          );
          if (name === 'history_perspectives')
            this.put(name, record(perspectiveColumns, prepared.row));
          else if (prepared.account.body !== undefined)
            this.put(
              name,
              record(versionColumns, [
                this.cut.worldId,
                actor,
                prepared.account.account.kind,
                event.id,
                prepared.account.account.revision,
                prepared.account.body,
                this.revision + 1,
                'external-story',
                Buffer.byteLength(prepared.account.body),
              ]),
            );
        }
      }
    }
  }
  private valueUses(): void {
    for (const cut of this.cuts)
      for (const table of [...receivedCurrentOwnerTables, 'mind_temporal_pages']) {
        for (const row of cut.changes.writes.get(table) ?? []) {
          if (row.receivedUsesChanged === false) continue;
          const owner = receivedRowOwner(table, row);
          if (this.actor && owner.actor !== this.actor.actorId) continue;
          this.removeScope('received_value_uses', {
            world_id: this.cut.worldId,
            owner_kind: table,
            owner_id: owner.id,
          });
          for (const id of owner.refs)
            this.put('received_value_uses', {
              world_id: this.cut.worldId,
              owner_kind: table,
              owner_id: owner.id,
              actor_id: owner.actor,
              value_id: id,
            });
        }
        for (const id of cut.changes.deletes.get(table) ?? [])
          this.removeScope('received_value_uses', {
            world_id: this.cut.worldId,
            owner_kind: table,
            owner_id: id,
          });
      }
  }
  private ensure(name: string): void {
    if (this.prepared.has(name)) return;
    this.prepared.add(name);
    if (name === 'received_value_uses') this.valueUses();
    else if (RECORD_NODES.has(name)) this.canonical(name);
    else if (
      [
        'recall_sources',
        'recall_place_capsules',
        'mind_source_dependencies',
        'mind_impression_spans',
      ].includes(name)
    )
      this.sources(name);
    else if (['history_events', 'history_perspectives', 'mind_source_versions'].includes(name))
      this.history(name);
  }
  private removedAncestors(name: string): string[] {
    const selected = new Set<string>();
    const visit = (table: string) => {
      for (let current: string | undefined = table; current; current = RECORD_PARENTS.get(current))
        selected.add(current);
    };
    if (name === 'recall_sources')
      for (const table of Object.values(MEMORY_SOURCE_TABLES)) visit(table);
    else if (RECORD_NODES.has(name)) visit(name);
    return [...selected].flatMap((table) => this.netDeletes(table));
  }
  rewrite(sql: string, params: unknown[]): { sql: string; params: unknown[] } {
    // Pending exact accounts are readable immediately, but their optional lexical
    // artifacts are not indexed until the shared scheduled writer has saved them.
    // Reject claimed completeness from this captured cut without parsing bodies,
    // forcing a save or preventing exact/browse reads.
    if (references(sql, 'memory_lexical_progress'))
      for (const table of Object.values(MEMORY_SOURCE_TABLES)) {
        const actorColumn = Object.keys(RECORD_NODES.get(table)!.columns ?? {}).indexOf('actor_id');
        if (
          this.cuts.some((cut) =>
            (cut.changes.writes.get(table) ?? []).some(
              (row) => !this.actor || row.extra[actorColumn] === this.actor.actorId,
            ),
          )
        )
          throw new LexicalPreparationError();
      }
    let prepared = this.cache.get(sql);
    if (!prepared) {
      const names = [...RECORD_NODES.keys(), ...Object.keys(keyColumns)];
      const needed = new Set(names.filter((name) => references(sql, name)));
      if (needed.has('recall_sources'))
        for (const name of ['mind_forgotten', 'mind_corrections', 'mind_source_dependencies'])
          needed.add(name);
      if (needed.has('mind_source_dependencies'))
        for (const name of [...Object.values(MEMORY_SOURCE_TABLES), 'mind_source_versions'])
          needed.add(name);
      for (const name of needed) this.ensure(name);
      const ctes: string[] = [],
        values: unknown[] = [];
      for (const name of needed) {
        const table = this.tables.get(name),
          ancestors = this.removedAncestors(name);
        const historyCuts =
          name === 'history_perspectives'
            ? [...(this.cut.historyEligibility?.values() ?? [])].map((cut) => ({
                actor_id: cut.actorId,
                at: cut.at,
                max_age_seconds: cut.maxAgeSeconds,
              }))
            : [];
        if (!table && !ancestors.length && !historyCuts.length) continue;
        const data = table ?? this.table(name);
        values.push(
          JSON.stringify([...data.rows.values()]),
          JSON.stringify([...data.removed.values()]),
        );
        const input = `__live_${name}_input`,
          removedRows = `__live_${name}_removed`,
          raw =
            name === 'recall_sources'
              ? '__live_recall_raw'
              : name === 'mind_source_dependencies'
                ? '__live_dependencies_raw'
                : name === 'history_perspectives' && historyCuts.length
                  ? '__live_history_raw'
                  : name;
        const match = data.keys
          .map((key) => `incoming.body->>'${key}'=base.${key}::text`)
          .join(' AND ');
        ctes.push(`${input} AS MATERIALIZED (SELECT body FROM jsonb_array_elements(?::jsonb) incoming(body)),
          ${removedRows} AS MATERIALIZED (SELECT body FROM jsonb_array_elements(?::jsonb) incoming(body))`);
        let exclusion = '';
        if (ancestors.length) {
          values.push(this.cut.worldId, ancestors);
          const id = name === 'recall_sources' ? 'record_id' : 'id';
          exclusion += ` AND NOT (base.world_id=? AND EXISTS (SELECT 1 FROM unnest(?::text[]) removed(id)
            WHERE base.${id}=removed.id OR starts_with(base.${id},left(removed.id,length(removed.id)-1)||',')))`;
        }
        if (data.removedScopes.length) {
          values.push(JSON.stringify(data.removedScopes));
          exclusion += ` AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(?::jsonb) removed(body)
            WHERE NOT EXISTS (SELECT 1 FROM jsonb_each_text(removed.body) field
              WHERE to_jsonb(base)->>field.key IS DISTINCT FROM field.value))`;
        }
        let additional = '';
        ctes.push(`${raw} AS NOT MATERIALIZED (
          SELECT base.* FROM open_legend.${name} base WHERE NOT EXISTS (SELECT 1 FROM ${input} incoming WHERE ${match})
            AND NOT EXISTS (SELECT 1 FROM ${removedRows} incoming WHERE ${match})${exclusion}
          UNION ALL SELECT (jsonb_populate_record(base,incoming.body)).* FROM ${input} incoming
            LEFT JOIN open_legend.${name} base ON ${match}${additional})`);
        if (name === 'history_perspectives' && historyCuts.length) {
          values.push(JSON.stringify(historyCuts));
          // Age eligibility is independent from physical page order. Exact
          // retired page access is checked by the account's logical source read.
          ctes.push(`history_perspectives AS NOT MATERIALIZED (
            SELECT base.* FROM __live_history_raw base WHERE NOT EXISTS (
              SELECT 1 FROM jsonb_to_recordset(?::jsonb) AS cut(actor_id TEXT,at DOUBLE PRECISION,
                max_age_seconds DOUBLE PRECISION)
              WHERE base.actor_id=cut.actor_id AND base.payload::jsonb#>>'{account,kind}'='temporal'
                AND NOT COALESCE((base.payload::jsonb#>>'{account,receivedAt}')::double precision+cut.max_age_seconds>cut.at,false)))`);
        }
        if (name === 'mind_source_dependencies') {
          const personal = Object.entries(MEMORY_SOURCE_TABLES)
            .map(
              ([kind, table]) =>
                `SELECT a.account_revision AS revision,0 AS priority,0 AS retired FROM ${table} a WHERE r.source_kind='${kind}' AND a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.source_id`,
            )
            .join(' UNION ALL ');
          const revision = `COALESCE((SELECT revision FROM (${personal} UNION ALL SELECT a.revision,1 AS priority,-a.retired_revision AS retired FROM mind_source_versions a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind=r.source_kind AND a.source_id=r.source_id) bound ORDER BY priority,retired LIMIT 1),'')`;
          ctes.push(
            `mind_source_dependencies AS NOT MATERIALIZED (SELECT ${SOURCE_DEPENDENCY_COLUMNS.map((column) => (column === 'source_revision' ? `CASE WHEN r.source_revision='' THEN ${revision} ELSE r.source_revision END AS source_revision` : `r.${column}`)).join(',')} FROM __live_dependencies_raw r)`,
          );
        }
        if (name === 'recall_sources') {
          const eligibility = MEMORY_SOURCE_ELIGIBILITY.replaceAll(
            'FROM recall_sources a',
            'FROM __live_recall_raw a',
          );
          ctes.push(`recall_sources AS NOT MATERIALIZED (SELECT
            r.world_id,r.actor_id,r.id,r.source_kind,r.record_id,r.revision,r.event_id,r.memory_kind,r.acquisition,r.event_type,
            r.at,r.importance,r.required,CASE WHEN ${eligibility} THEN 1::bigint ELSE 0::bigint END AS eligible,
            r.sequence,r.search_text,r.linguistic,r.payload_bytes,r.retention_class FROM __live_recall_raw r)`);
        }
      }
      if (!ctes.length) return { sql, params };
      if (
        values.reduce<number>(
          (bytes, value) =>
            bytes + Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value)),
          0,
        ) >
        512 * 1024
      )
        throw new MemoryPreparationError();
      prepared = {
        sql: /^\s*WITH\s+(?:RECURSIVE\s+)?/i.test(sql)
          ? sql.replace(/^\s*WITH\s+(?:RECURSIVE\s+)?/i, `WITH RECURSIVE ${ctes.join(',')}, `)
          : `WITH RECURSIVE ${ctes.join(',')} ${sql}`,
        params: values,
      };
      this.cache.set(sql, prepared);
    }
    return { sql: prepared.sql, params: [...prepared.params, ...params] };
  }
}
