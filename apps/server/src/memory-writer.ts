import { nativeText } from '@open-legend/domain';
import { type DerivedMemoryAllowance } from './memory-derivatives.js';
import { accountObservationInputs } from './retention-record-metadata.js';
import { applySourceVersions, type SourceVersionPlan } from './source-version-retention.js';
import { hasLinguisticSpeech } from './speech-recall.js';
import {
  insertRows,
  sqlRecordBatches,
  sqlRowBatches,
  sqlSearchText,
  SqlWriteBatch,
} from './sql-rows.js';
import { enqueueLexicalSql } from './lexical-projection.js';
import {
  MEMORY_SOURCE_TABLES,
  memoryProjectionSql,
  memoryReconciliationSql,
  memoryVectorReuseQueueSql,
  memoryVectorReuseSql,
  RECALL_SOURCE_COLUMNS,
} from './memory-source-sql.js';
import { digest } from './content-digest.js';
import { personalAccountRevision } from './personal-accounts.js';
import type {
  Awareness,
  ExperienceEntry,
  ExperienceSummary,
  MemoryRecord,
} from '@open-legend/domain';
import {
  validEncounterExposure,
  validateEventEvidence,
  validateExperienceManifest,
  observationDependencies,
  ownedObservationSources,
  type RecognitionSupportSource,
  type ObservationContribution,
  validPersonalSourceRef,
  type PersonalSourceRef,
  type KnownPlaceCapsule,
  knownPlaceCapsule,
  retainedPlaceObservations,
  canonicalJson,
  personalFactAlias,
  type WorldState,
  type TemporalSupportCapsule,
  temporalKnownPlaceCapsules,
  selectedAttentionPolicy,
  validExperienceSummary,
} from '@open-legend/domain';
import type { RecordChanges, RowChange } from './world-records.js';
import { RECORD_ACTOR_PATHS } from './world-record-schema.js';
import type { SqlDatabase } from './sql-database.js';

export class MemoryPreparationError extends Error {
  override readonly name = 'MemoryPreparationError';
  constructor() {
    super(
      'Required memory context exceeds preparation capacity. Use paged history or consolidate the conversation before another full-context decision; no evidence was discarded.',
    );
  }
}

export const sourceTables = MEMORY_SOURCE_TABLES;

export type MemoryChanges = Map<string, Set<string> | null> & {
  /** Transaction-local canonical creations, never a reusable eligibility cache. */
  newSources?: Map<string, Map<string, SourceKind>>;
};

export type SourceKind = keyof typeof sourceTables;

interface PreparedSource {
  row: RowChange;
  actorId: string;
  id: string;
  sources: readonly PersonalSourceRef[];
  manifest: ExperienceSummary['manifest'] | undefined;
  values: unknown[];
  originals: ObservationContribution[];
  learning: RecognitionSupportSource[];
  places: KnownPlaceCapsule[];
}

export interface PreparedMemorySources {
  readonly worldId: string;
  readonly changes: RecordChanges;
  readonly groups: ReadonlyMap<SourceKind, readonly PreparedSource[]>;
  readonly allowance: DerivedMemoryAllowance;
  readonly versions?: SourceVersionPlan;
}

export function* sourceDerivationDependencies(
  worldId: string,
  kind: SourceKind,
  entry: PreparedSource,
): Generator<unknown[]> {
  const personal = function* (sources: readonly PersonalSourceRef[], supportKey: string) {
    for (const source of sources)
      yield [
        worldId,
        entry.actorId,
        kind,
        entry.id,
        source.kind,
        source.id,
        source.revision,
        digest(supportKey),
        -1,
        -1,
        '',
      ];
  };
  const native = function* (
    dependencies: ReturnType<typeof observationDependencies>,
    supportKey: string,
  ) {
    for (const dependency of dependencies) {
      if (dependency.source.observer.actorId !== entry.actorId)
        throw new Error('Remembered native support belongs to another observer.');
      for (const alias of dependency.aliases.length ? dependency.aliases : [''])
        yield [
          worldId,
          entry.actorId,
          kind,
          entry.id,
          dependency.source.family,
          dependency.source.id,
          JSON.stringify(dependency.source.revision),
          digest(supportKey),
          dependency.source.observer.physicalLife,
          dependency.ordinal ?? -1,
          alias,
        ];
    }
  };
  if (kind === 'summary') {
    const manifest = entry.manifest!;
    yield* personal(entry.sources, 'derivation');
    yield* personal(manifest.coverage, manifest.coverageKey);
    for (const group of manifest.speech) yield* personal(group.sources, group.supportKey);
    yield* native(observationDependencies(manifest.observations), manifest.coverageKey);
  } else if (kind === 'memory') {
    const memory = JSON.parse(entry.row.payload) as MemoryRecord;
    if (memory.manifest) {
      yield* personal(memory.manifest.coverage, memory.manifest.coverageKey);
      for (const group of memory.manifest.speech) yield* personal(group.sources, group.supportKey);
      yield* native(
        observationDependencies(memory.manifest.observations),
        memory.manifest.coverageKey,
      );
    }

    for (const dependency of memory.impression?.dependencies ?? []) {
      if ('kind' in dependency) yield* personal([dependency], 'impression-origin');
      else yield* native([dependency], 'impression-origin');
    }
  }
}

export function* sourceIdentityDependencies(
  worldId: string,
  kind: SourceKind,
  entry: PreparedSource,
  personalRevision: (
    source: Extract<RecognitionSupportSource, { kind: SourceKind }>,
  ) => string | undefined,
): Generator<unknown[]> {
  if (kind !== 'summary')
    for (const source of ownedObservationSources(entry.originals))
      yield [
        worldId,
        entry.actorId,
        kind,
        entry.id,
        source.family,
        source.id,
        JSON.stringify(source.revision),
        digest('native-origin'),
        source.observer.physicalLife,
        -1,
        entry.id,
      ];
  for (const source of entry.learning) {
    if ('kind' in source) {
      const revision = personalRevision(source);
      if (revision === undefined)
        throw new Error(
          'Exact learned-identity source is unavailable; original evidence retained.',
        );
      yield [
        worldId,
        entry.actorId,
        kind,
        entry.id,
        source.kind,
        source.id,
        revision,
        digest('recognition'),
        -1,
        -1,
        source.id,
      ];
    } else {
      if (source.observer.actorId !== entry.actorId)
        throw new Error('Foreign learned-identity source.');
      yield [
        worldId,
        entry.actorId,
        kind,
        entry.id,
        source.family,
        source.id,
        JSON.stringify(source.revision),
        digest('recognition'),
        source.observer.physicalLife,
        -1,
        '',
      ];
    }
  }
}

export function* sourcePlaceRows(
  worldId: string,
  kind: SourceKind,
  entry: PreparedSource,
): Generator<unknown[]> {
  for (const capsule of entry.places)
    yield [
      worldId,
      entry.actorId,
      entry.id,
      kind,
      personalAccountRevision(entry.row.payload),
      capsule.placeId,
      capsule.observedAt,
      capsule.observedOrder,
      capsule.sourceEventId ?? null,
      capsule.source.id,
      personalFactAlias(capsule.source.id, capsule.facetOrdinal),
      canonicalJson([capsule.source, capsule.facetOrdinal]),
      JSON.stringify(capsule),
      kind,
      null,
    ];
}

export function* supportPlaceRows(worldId: string, row: RowChange): Generator<unknown[]> {
  const support = JSON.parse(row.payload) as TemporalSupportCapsule;
  for (const capsule of temporalKnownPlaceCapsules(support.receipt.actorId, support))
    yield [
      worldId,
      support.receipt.actorId,
      support.receipt.id,
      'support',
      personalAccountRevision(row.payload),
      capsule.placeId,
      capsule.observedAt,
      capsule.observedOrder,
      capsule.sourceEventId ?? null,
      capsule.source.id,
      personalFactAlias(capsule.source.id, capsule.facetOrdinal),
      canonicalJson([capsule.source, capsule.facetOrdinal]),
      JSON.stringify(capsule),
      null,
      row.id,
    ];
}

export const conversationCompactionKey = (worldId: string, actorId: string) =>
  `conversation-compaction:${JSON.stringify([worldId, actorId])}`;

/** Compile actual encoded changed accounts once, before the shared writer or
 * its pending read overlay consumes them. Both runtime owners use this finite
 * projection; it performs no SQL and retains no world. */
export function prepareMemorySources(
  worldId: string,
  changes: RecordChanges,
  allowance: DerivedMemoryAllowance | undefined,
  versions?: SourceVersionPlan,
  actorId?: string,
): PreparedMemorySources {
  const groups = new Map<SourceKind, readonly PreparedSource[]>();
  for (const kind of Object.keys(sourceTables) as SourceKind[])
    groups.set(kind, [...sourceRows(worldId, kind, changes, actorId)]);
  if (!allowance || allowance.worldId !== worldId)
    throw new Error('Selected memory retention policy is unavailable.');
  return { worldId, changes, groups, allowance, versions };
}

function* sourceRows(
  worldId: string,
  kind: SourceKind,
  changes: RecordChanges,
  selectedActor?: string,
): Generator<PreparedSource> {
  for (const row of changes.writes.get(sourceTables[kind]) ?? []) {
    const path = JSON.parse(row.id) as string[];
    const actorId = kind === 'memory' ? path[2]! : path[3]!;
    if (selectedActor !== undefined && actorId !== selectedActor) continue;
    const value = JSON.parse(row.payload) as Record<string, unknown>;
    const id = value[kind === 'awareness' ? 'eventId' : 'id'];
    const exposure = value['exposure'] as Awareness['exposure'];
    const sources = kind === 'summary' ? value['sources'] : [];
    const manifest =
      kind === 'summary' || kind === 'memory'
        ? (value['manifest'] as ExperienceSummary['manifest'] | undefined)
        : undefined;
    if (manifest) validateExperienceManifest(manifest);
    if (
      typeof id !== 'string' ||
      id !== path.at(-1) ||
      !Array.isArray(sources) ||
      sources.some((source) => !validPersonalSourceRef(source)) ||
      (kind === 'summary' && !validExperienceSummary(value, actorId)) ||
      (exposure !== undefined && !validEncounterExposure(exposure))
    )
      throw new Error('Invalid memory source projection.');
    const evidence =
      kind === 'memory'
        ? (value as unknown as MemoryRecord).evidence
        : (value as unknown as Awareness);
    const { originals, learning } = accountObservationInputs({
      source: kind,
      value,
    } as unknown as ExperienceEntry);
    const places =
      kind === 'awareness'
        ? exposure?.kind === 'place'
          ? [
              knownPlaceCapsule(value as unknown as Awareness, {
                kind,
                id: String(id),
                revision: personalAccountRevision(row.payload),
              }),
            ]
          : []
        : retainedPlaceObservations(originals, {
            kind,
            id: String(id),
            revision: personalAccountRevision(row.payload),
          }).map((place) => place.capsule);
    if (places.some((capsule) => !capsule)) throw new MemoryPreparationError();
    const sourceText =
      kind === 'awareness'
        ? nativeText((value as unknown as Awareness).text)
        : (value[kind === 'memory' ? 'summary' : 'text'] ?? '');
    const values: unknown[] = [
      worldId,
      actorId,
      id,
      kind,
      row.id,
      personalAccountRevision(row.payload),
      value['eventId'] ?? null,
      value['kind'] ?? null,
      value['source'] ?? null,
      value['eventType'] ?? null,
      value[kind === 'summary' ? 'to' : 'at'],
      value['importance'],
      value['kind'] === 'commitment' && !value['resolved'] ? 1 : 0,
      0,
      value['sequence'] ?? 0,
      typeof sourceText === 'string' ? sqlSearchText(sourceText) : sourceText,
      kind === 'awareness' && hasLinguisticSpeech(value as unknown as Awareness) ? 1 : 0,
      Buffer.byteLength(row.payload),
      kind === 'awareness' ? value['retentionClass'] : 'memory',
    ];
    // These are the actual SQL fields: required times/ranks cannot become NULL,
    // sequence must fit BIGINT exactly, and supplied text must remain text.
    for (let index = 0; index < values.length; index++) {
      const part = values[index];
      if ((index >= 10 && index <= 14) || (index >= 16 && index <= 17)) {
        if (
          typeof part !== 'number' ||
          !Number.isFinite(part) ||
          (index >= 12 && !Number.isSafeInteger(part))
        )
          throw new Error('Invalid numeric memory source projection.');
      } else if (
        part === null
          ? index < 6 || index === RECALL_SOURCE_COLUMNS.length
          : typeof part !== 'string'
      )
        throw new Error('Invalid text memory source projection.');
    }
    if (kind === 'awareness') validateEventEvidence(value);
    yield {
      row,
      actorId,
      id,
      sources,
      manifest,
      values,
      originals,
      learning,
      places: places as KnownPlaceCapsule[],
    };
  }
}

/** Shared canonical SQL writes for live saves and a stopped prepared opening.
 * The caller owns the transaction. Only the live repository has caches, source
 * readers and a background index scheduler to notify.
 */
export class MemoryWriter<Database extends SqlDatabase = SqlDatabase> {
  protected derivedAllowance?: DerivedMemoryAllowance;

  constructor(protected readonly db: Database) {}

  protected allowanceChanged() {}
  protected vectorReuse(_worldId: string, _changed?: MemoryChanges) {}
  protected async trimDerived(_worldId: string, _actors: Iterable<string>): Promise<void> {}
  protected async admitLexical(_progress: Record<string, unknown> | undefined): Promise<void> {}

  applySourceVersionPlan(worldId: string, revision: number, plan: SourceVersionPlan) {
    return applySourceVersions(this.db, worldId, revision, plan);
  }

  configureWorld(world: WorldState): void {
    const policy = selectedAttentionPolicy(world);
    this.configureAllowance({
      worldId: world.id,
      policyId: policy.id,
      policyVersion: policy.version,
      maxBytes: policy.retention.derivedMaxBytes,
      hardBytes: Math.floor(
        policy.retention.derivedMaxBytes * (1 + policy.retention.maintenanceHeadroom),
      ),
      lowBytes: Math.floor(policy.retention.derivedMaxBytes * policy.retention.derivedLowWater),
    });
  }

  configureAllowance(allowance: DerivedMemoryAllowance): void {
    if (
      !allowance.worldId ||
      !allowance.policyId ||
      !Number.isSafeInteger(allowance.policyVersion) ||
      allowance.policyVersion < 1 ||
      !Number.isSafeInteger(allowance.maxBytes) ||
      allowance.maxBytes < 0 ||
      !Number.isSafeInteger(allowance.hardBytes) ||
      allowance.hardBytes < allowance.maxBytes ||
      !Number.isSafeInteger(allowance.lowBytes) ||
      allowance.lowBytes < 0 ||
      allowance.lowBytes > allowance.maxBytes
    )
      throw new Error('Invalid selected memory cache allowance.');
    if (JSON.stringify(this.derivedAllowance) !== JSON.stringify(allowance)) {
      this.derivedAllowance = { ...allowance };
      this.allowanceChanged();
    }
  }

  /** Called before current rows change, inside their transaction. Retired/corrected
   * source versions preserve provenance for future consolidation policies.
   */
  async project(
    worldId: string,
    changes: RecordChanges,
    archive = true,
    sharedWrites?: SqlWriteBatch,
    versions?: SourceVersionPlan,
  ): Promise<MemoryChanges> {
    if (
      archive &&
      !versions &&
      ['mind_summaries', 'mind_memories'].some((table) =>
        (changes.writes.get(table) ?? []).some((row) => {
          const value = JSON.parse(row.payload) as {
            sources?: unknown[];
            manifest?: { coverage?: unknown[] };
          };
          return !!(value.sources?.length || value.manifest?.coverage?.length);
        }),
      )
    )
      throw new Error('Exact source closure must be prepared before retaining a derivation.');
    const cleanup = sharedWrites ?? new SqlWriteBatch(this.db);
    let queuedInvalidation = false;
    const invalidate = (table: string, sql: string, params: unknown[]) => {
      queuedInvalidation = true;
      return cleanup.add(table, sql, params);
    };
    const affected: MemoryChanges = new Map();
    affected.newSources = new Map();
    const erased = (changes.writes.get('mind_forgotten') ?? []).map((row) => ({
      actor_id: (JSON.parse(row.id) as string[])[3]!,
      source_id: JSON.parse(row.payload) as string,
    }));
    const erasedKeys = new Set(erased.map((row) => JSON.stringify([row.actor_id, row.source_id])));
    if (erased.length) {
      await cleanup.flush();
      const keys = JSON.stringify(erased);
      for (const table of [
        'mind_source_versions',
        'mind_source_annotations',
        'memory_index_queue',
        'memory_vector_cache',
        'memory_vectors',
      ])
        await invalidate(
          table,
          `DELETE FROM ${table} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
          WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id`,
          [keys, worldId],
        );
      await invalidate(
        'history_perspectives',
        `DELETE FROM history_perspectives t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
        WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.event_id=q.source_id`,
        [keys, worldId],
      );
    }
    const invalidateConversations = new Set<string>();
    const touch = (actor: string, id: string) => {
      if (affected.get(actor) === null) return;
      const ids = affected.get(actor) ?? new Set<string>();
      ids.add(id);
      affected.set(actor, ids);
    };
    for (const [kind, table] of Object.entries(sourceTables)) {
      const writes = changes.writes.get(table) ?? [];
      const replacementIds = new Set(writes.map((row) => row.id));
      const direct = changes.deletes.get(table) ?? [];
      const directIds = new Set(direct);
      const parents = new Set([
        'data_world',
        'world_settings',
        `${table}_owners`,
        ...(kind === 'memory' ? [] : ['experience_state']),
      ]);
      const ancestors = [...changes.deletes]
        .filter(([name]) => parents.has(name))
        .flatMap(([, ids]) => ids);
      const ids = new Set([...direct, ...writes.filter((row) => !row.create).map((row) => row.id)]);
      // Only deletion needs ancestor matching; ordinary appends inspect their own IDs.
      for (const ancestor of ancestors) {
        await cleanup.flush();
        // Deleting an actor-owned list has an exact structural parent. Root/world/
        // experience deletion intentionally affects every source in that world.
        const path = JSON.parse(ancestor) as string[];
        const actorOwner = path.length === (kind === 'memory' ? 3 : 4);
        const rows = await this.db
          .prepare(
            `SELECT id FROM ${table} WHERE world_id=?${actorOwner ? ' AND parent_id=?' : ''}`,
          )
          .all(worldId, ...(actorOwner ? [ancestor] : []));
        for (const row of rows) ids.add(String(row['id']));
      }
      const expired = new Set(changes.expired?.get(table) ?? []);
      const allIds = [...ids];
      for (let offset = 0; offset < allIds.length; offset += 800) {
        const batch = allIds.slice(offset, offset + 800);
        const placeholders = batch.map(() => '?').join(',');
        const old: Record<string, unknown>[] = [];
        const lookup: string[] = [];
        for (const id of batch) {
          // A prepared version set plus explicit semantic expiry proves this
          // native deletion's identity. Placement-only cold writes and unknown
          // edits still need the previous canonical metadata below.
          if (versions && directIds.has(id) && expired.has(id) && !replacementIds.has(id)) {
            const path = JSON.parse(id) as string[],
              actorId = path[RECORD_ACTOR_PATHS.get(table)!]!;
            old.push({ id, actor_id: actorId, source_id: path.at(-1)! });
            continue;
          }
          lookup.push(id);
        }
        if (lookup.length) {
          await cleanup.flush();
          const metadata = await this.db
            .prepare(
              `SELECT id,actor_id,source_id,retention_class,account_revision FROM ${table}
              WHERE world_id=? AND id IN (${lookup.map(() => '?').join(',')})`,
            )
            .all(worldId, ...lookup);
          old.push(...metadata);
        }
        for (const row of old)
          if (erasedKeys.has(JSON.stringify([row['actor_id'], row['source_id']])))
            expired.add(String(row['id']));
        for (const row of old) {
          touch(String(row['actor_id']), String(row['source_id']));
          if (kind === 'awareness') invalidateConversations.add(String(row['actor_id']));
        }
        if (archive && old.length) {
          const secured = new Set(
            (versions?.changes ?? [])
              .filter((change) => change.desired)
              .map((change) =>
                JSON.stringify([change.actorId, change.kind, change.id, change.revision]),
              ),
          );
          const candidates = old
            .filter(
              (row) =>
                !secured.has(
                  JSON.stringify([
                    row['actor_id'],
                    kind,
                    row['source_id'],
                    row['account_revision'],
                  ]),
                ),
            )
            .map((row) => ({
              actor_id: String(row['actor_id']),
              id: String(row['source_id']),
              revision: String(row['account_revision']),
            }));
          if (candidates.length) {
            await cleanup.flush();
            const required = await this.db
              .prepare(
                `SELECT 1 AS required
              FROM jsonb_to_recordset(?::jsonb)q(actor_id text,id text,revision text)
              JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=q.actor_id
                AND d.source_kind=? AND d.source_id=q.id AND d.source_revision=q.revision
              WHERE NOT EXISTS(SELECT 1 FROM mind_source_versions v WHERE v.world_id=d.world_id
                AND v.actor_id=q.actor_id AND v.source_kind=d.source_kind AND v.source_id=q.id AND v.revision=q.revision) LIMIT 1`,
              )
              .get(JSON.stringify(candidates), worldId, kind);
            if (required)
              throw new Error(
                'Exact source closure must be prepared before replacing retained evidence.',
              );
          }
        }

        const released = old.filter((row) => expired.has(String(row['id'])));
        const keys = JSON.stringify(
          released.map((row) => ({
            actor_id: String(row['actor_id']),
            source_id: String(row['source_id']),
          })),
        );
        if (released.length) {
          for (const dependent of [
            ...(versions ? [] : ['mind_source_versions']),
            'mind_source_annotations',
          ])
            await invalidate(
              dependent,
              `DELETE FROM ${dependent} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id AND (t.source_kind=? OR (?='awareness' AND t.source_kind='perspective'))`,
              [keys, worldId, kind, kind],
            );
          for (const dependent of ['memory_index_queue', 'memory_vectors', 'memory_vector_cache'])
            await invalidate(
              dependent,
              `DELETE FROM ${dependent} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id`,
              [keys, worldId],
            );
        }
        if (kind === 'awareness') {
          // Semantic expiry and an otherwise deleted sensory account revoke the
          // same personal grant. One exact-key deletion covers their union.
          const historyKeys = old.filter(
            (row) =>
              expired.has(String(row['id'])) ||
              (row['retention_class'] === 'sensory' && !replacementIds.has(String(row['id']))),
          );
          if (historyKeys.length)
            await invalidate(
              'history_perspectives',
              `DELETE FROM history_perspectives t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.event_id=q.source_id`,
              [
                JSON.stringify(
                  historyKeys.map((row) => ({
                    actor_id: String(row['actor_id']),
                    source_id: String(row['source_id']),
                  })),
                ),
                worldId,
              ],
            );
        }
        // Both explicit released identities and ordinary replacement records
        // lose their owned dependency edges. The fallback keeps unknown/cold
        // record edits exact even when no canonical row was found above.
        await invalidate(
          'mind_source_dependencies',
          `DELETE FROM mind_source_dependencies d WHERE d.world_id=? AND (
            ${
              released.length
                ? `d.derived_kind=? AND EXISTS (
              SELECT 1 FROM jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE d.actor_id=q.actor_id AND d.derived_id=q.source_id) OR`
                : ''
            }
            EXISTS (SELECT 1 FROM recall_sources r WHERE r.world_id=d.world_id
              AND r.actor_id=d.actor_id AND r.id=d.derived_id AND r.source_kind=d.derived_kind
              AND r.record_id IN (${placeholders})))`,
          [worldId, ...(released.length ? [kind, keys] : []), ...batch],
        );
        // The returning source deletion drives lexical admission. Its source
        // reads must observe the completed independent invalidations above.
        await cleanup.flush();
        const pending = await this.db
          .prepare(
            `WITH changed AS (DELETE FROM recall_sources WHERE world_id=? AND source_kind=? AND record_id IN (${placeholders})
              RETURNING world_id,actor_id,id,source_kind,revision) ${enqueueLexicalSql('changed', true)}`,
          )
          .get(worldId, kind, ...batch);
        await this.admitLexical(pending);
      }
    }
    for (const table of ['mind_forgotten', 'mind_corrections']) {
      for (const row of changes.writes.get(table) ?? []) {
        const path = JSON.parse(row.id) as string[];
        affected.set(path[3]!, null);
        invalidateConversations.add(path[3]!);
      }
      for (const id of changes.deletes.get(table) ?? []) {
        affected.set((JSON.parse(id) as string[])[3]!, null);
        invalidateConversations.add((JSON.parse(id) as string[])[3]!);
      }
      for (const id of changes.deletes.get(`${table}_owners`) ?? []) {
        affected.set((JSON.parse(id) as string[])[3]!, null);
        invalidateConversations.add((JSON.parse(id) as string[])[3]!);
      }
    }
    const allConversations = ['data_world', 'world_settings', 'experience_state'].some((table) =>
      changes.deletes.has(table),
    );
    // Settle this owner's invalidations before the caller applies the new exact
    // source-version plan. An untouched caller batch can still join later writes.
    if (queuedInvalidation || !sharedWrites || invalidateConversations.size || allConversations)
      await cleanup.flush();
    if (allConversations) await this.invalidateConversationCompactions(worldId);
    else if (invalidateConversations.size)
      await this.invalidateConversationCompactions(worldId, [...invalidateConversations]);
    if (changes.deletes.has('experience_state'))
      for (const row of await this.db
        .prepare('SELECT DISTINCT actor_id FROM recall_sources WHERE world_id=?')
        .all(worldId))
        affected.set(String(row['actor_id']), null);
    return affected;
  }

  /** Prepare the exact changed source rows once. No world/history enumeration or SQL,
   * and no eligibility/index mutation before the transaction actually applies them.
   * docs/projects/bookkeeping-simplification-tech-design.md#4-direct-transactional-saving */
  prepareSources(
    worldId: string,
    changes: RecordChanges,
    allowance: DerivedMemoryAllowance,
    versions?: SourceVersionPlan,
    actorId?: string,
  ): PreparedMemorySources {
    return prepareMemorySources(worldId, changes, allowance, versions, actorId);
  }

  captureAllowance(worldId: string): DerivedMemoryAllowance {
    const allowance = this.derivedAllowance;
    if (!allowance || allowance.worldId !== worldId)
      throw new Error('Selected memory retention policy is unavailable.');
    return allowance;
  }

  /** Insert only after current records have changed. All awareness must precede
   * episode eligibility; summary links must precede their summaries. Final
   * reconciliation still updates every dependent old source in this transaction. */
  async writeSources(
    worldId: string,
    changes: RecordChanges,
    affected: MemoryChanges,
    prepared?: PreparedMemorySources,
  ) {
    if (prepared && (prepared.worldId !== worldId || prepared.changes !== changes))
      throw new Error('Prepared memory sources do not match these exact world changes.');
    const columns = [
      ...RECALL_SOURCE_COLUMNS,
      'search_text',
      'linguistic',
      'payload_bytes',
      'retention_class',
    ];
    const repository = this;
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      // Complete restores stream rows rather than allocating a second complete source set.
      const writes = () => prepared?.groups.get(kind) ?? sourceRows(worldId, kind, changes);
      function* derivationLinks() {
        for (const entry of writes()) yield* sourceDerivationDependencies(worldId, kind, entry);
      }
      await insertRows(
        this.db,
        'mind_source_dependencies',
        derivationLinks(),
        'ON CONFLICT DO NOTHING',
      );
      // Immediate learned-identity edges use the same source dependency owner. A
      // bounded exact lookup binds personal aliases; native roots already own revisions.
      let dependencyBatch: PreparedSource[] = [];
      const flushDependencies = async () => {
        if (!dependencyBatch.length) return;
        const batch = dependencyBatch;
        dependencyBatch = [];
        const personal = batch.flatMap((entry) =>
          entry.learning
            .filter(
              (source): source is Extract<RecognitionSupportSource, { kind: SourceKind }> =>
                'kind' in source,
            )
            .map((source) => ({ actorId: entry.actorId, ...source })),
        );
        const revisions = new Map<string, string>();
        for (const sourceKind of Object.keys(sourceTables) as SourceKind[]) {
          const selected = personal.filter((source) => source.kind === sourceKind);
          if (!selected.length) continue;
          const requested = JSON.stringify(
            selected.map((source) => ({ actor_id: source.actorId, source_id: source.id })),
          );
          const rows = await repository.db
            .prepare(
              `SELECT selected.actor_id,selected.source_id,bound.payload FROM jsonb_to_recordset(?::jsonb) selected(actor_id text,source_id text)
            CROSS JOIN LATERAL (SELECT payload,0 AS priority,0 AS retired FROM ${sourceTables[sourceKind]} WHERE world_id=? AND actor_id=selected.actor_id AND source_id=selected.source_id
              UNION ALL SELECT payload,1 AS priority,-retired_revision AS retired FROM mind_source_versions WHERE world_id=? AND actor_id=selected.actor_id AND source_kind=? AND source_id=selected.source_id ORDER BY priority,retired LIMIT 1) bound`,
            )
            .all(requested, worldId, worldId, sourceKind);
          for (const row of rows)
            revisions.set(
              JSON.stringify([row['actor_id'], sourceKind, row['source_id']]),
              personalAccountRevision(String(row['payload'])),
            );
        }
        function* links() {
          for (const entry of batch)
            yield* sourceIdentityDependencies(worldId, kind, entry, (source) =>
              revisions.get(JSON.stringify([entry.actorId, source.kind, source.id])),
            );
        }
        await insertRows(
          repository.db,
          'mind_source_dependencies',
          links(),
          'ON CONFLICT DO NOTHING',
        );
      };
      for (const entry of writes()) {
        dependencyBatch.push(entry);
        if (dependencyBatch.length === 100) await flushDependencies();
      }
      await flushDependencies();
      function* incoming() {
        for (const { row, actorId, id, values } of writes()) {
          if (affected.get(actorId) !== null) {
            const ids = affected.get(actorId) ?? new Set<string>();
            if (row.create && !ids.has(id)) {
              const inserted = affected.newSources?.get(actorId) ?? new Map<string, SourceKind>();
              inserted.set(id, kind);
              affected.newSources?.set(actorId, inserted);
            } else affected.newSources?.get(actorId)?.delete(id);
            ids.add(id);
            affected.set(actorId, ids);
          }
          yield values;
        }
      }
      for (const batch of sqlRecordBatches(columns, incoming())) {
        const allowance = prepared?.allowance ?? this.derivedAllowance!;
        const pending = await this.db
          .prepare(memoryProjectionSql(String(allowance.hardBytes)))
          .get(batch);
        await this.admitLexical(pending);
      }
      // Exact original capsules under each source replace an unindexed JSON array.
      // Deleting/replacing its source cascades; eligibility/revision remain owned by
      // recall_sources and are checked in the same read snapshot. No second knowledge store.
      function* placeRows() {
        for (const entry of writes()) yield* sourcePlaceRows(worldId, kind, entry);
      }
      await insertRows(this.db, 'recall_place_capsules', placeRows());
      if (kind === 'memory') {
        const spans: unknown[][] = [];
        for (const entry of writes())
          for (const span of (JSON.parse(entry.row.payload) as MemoryRecord).impression
            ?.provenance ?? [])
            spans.push([
              worldId,
              entry.actorId,
              entry.id,
              'memory',
              span.physicalLife,
              span.epoch,
              span.from.batchOrder,
              span.from.entryIndex,
              span.through.batchOrder,
              span.through.entryIndex,
            ]);
        await insertRows(this.db, 'mind_impression_spans', spans, 'ON CONFLICT DO NOTHING');
      }
    }
    const supportWrites = changes.writes.get('mind_temporal_supports') ?? [];
    if (supportWrites.length) {
      const ids = supportWrites.map((row) => row.id);
      await this.db
        .prepare(
          'DELETE FROM recall_place_capsules WHERE world_id=? AND support_record_id=ANY(?::text[])',
        )
        .run(worldId, ids);
      const rows: unknown[][] = [];
      for (const row of supportWrites) rows.push(...supportPlaceRows(worldId, row));
      await insertRows(this.db, 'recall_place_capsules', rows);
    }
  }

  /** Current eligibility is a transactional index, never inferred from vector presence. */
  async reconcile(worldId: string, changes: MemoryChanges) {
    const small: [string, string, SourceKind | null][] = [];
    for (const [actorId, ids] of changes) {
      if (ids && ids.size <= 1000) {
        for (const id of ids)
          small.push([actorId, id, changes.newSources?.get(actorId)?.get(id) ?? null]);
        continue;
      }
      // Restore/extraction can replace a large actor history. Keep each SQL
      // statement bounded inside the one atomic transaction instead of timing out
      // a world-sized UPDATE; no intermediate eligibility becomes visible.
      let afterId: string | undefined;
      for (;;) {
        const page = await this.db
          .prepare(
            `SELECT id FROM recall_sources WHERE world_id=? AND actor_id=?${afterId === undefined ? '' : ' AND id>?'} ORDER BY id LIMIT 1000`,
          )
          .all(worldId, actorId, ...(afterId === undefined ? [] : [afterId]));
        if (!page.length) break;
        const firstId = String(page[0]!['id']),
          lastId = String(page.at(-1)!['id']);
        await this.db
          .prepare(
            `WITH
          forgotten AS MATERIALIZED (SELECT source_id FROM mind_forgotten WHERE world_id=? AND actor_id=?),
          corrected AS MATERIALIZED (SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=?),
          aware AS MATERIALIZED (SELECT id FROM recall_sources WHERE world_id=? AND actor_id=? AND source_kind='awareness'),
          invalid_summaries AS MATERIALIZED (SELECT derived_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=? AND derived_kind='summary' AND
            (source_id IN (SELECT source_id FROM forgotten) OR source_id IN (SELECT source_id FROM corrected)
             OR alias_id IN (SELECT source_id FROM forgotten) OR alias_id IN (SELECT source_id FROM corrected)))
          UPDATE recall_sources AS r SET eligible=CASE WHEN
            r.id NOT IN (SELECT source_id FROM forgotten) AND (r.event_id IS NULL OR r.event_id NOT IN (SELECT source_id FROM forgotten))
            AND (r.source_kind<>'memory' OR ((r.memory_kind='impression' OR r.memory_kind='commitment' OR (r.memory_kind='episode' AND r.acquisition<>'inferred'))
              AND (r.memory_kind<>'episode' OR r.event_id IS NULL OR r.event_id NOT IN (SELECT id FROM aware))))
            AND (r.source_kind<>'summary' OR r.id NOT IN (SELECT derived_id FROM invalid_summaries))
            THEN 1 ELSE 0 END WHERE r.world_id=? AND r.actor_id=? AND r.id>=? AND r.id<=?`,
          )
          .run(
            worldId,
            actorId,
            worldId,
            actorId,
            worldId,
            actorId,
            worldId,
            actorId,
            worldId,
            actorId,
            firstId,
            lastId,
          );
        afterId = lastId;
        if (page.length < 1000) break;
      }

      await this.db
        .prepare(
          `DELETE FROM memory_vectors AS v WHERE v.world_id=? AND v.actor_id=? AND NOT EXISTS
          (SELECT 1 FROM recall_sources r WHERE r.world_id=v.world_id AND r.actor_id=v.actor_id AND r.id=v.source_id AND r.revision=v.source_revision AND r.eligible=1)`,
        )
        .run(worldId, actorId);
      await this.refreshQueue(worldId, actorId, null);
    }
    // An action can create observations for hundreds of actors. Batch their indexed
    // dependencies together instead of paying one database round trip per witness.
    for (let offset = 0; offset < small.length; offset += 250) {
      const pairs = small.slice(offset, offset + 250);
      // New sources have insertion-time eligibility. Dependent old evidence
      // still follows the same complete closure and exact vector/queue plan.
      const query = memoryReconciliationSql(`VALUES ${pairs.map(() => '(?,?,?::text)').join(',')}`);
      await this.db
        .prepare(query)
        .run(...pairs.flat(), worldId, worldId, worldId, worldId, worldId, worldId);
    }
    await this.trimDerived(worldId, changes.keys());
  }

  protected async refreshQueue(worldId: string, actorId: string, ids: Set<string> | null) {
    const values = ids ? [...ids] : [];
    for (let offset = 0; offset < Math.max(1, values.length); offset += 250) {
      const batch = values.slice(offset, offset + 250),
        params = batch.map(() => '?').join(',');
      const target = ids
        ? ` IN (${batch.map(() => 'SELECT ?').join(' UNION ')}
        UNION SELECT id FROM recall_sources WHERE world_id=? AND actor_id=? AND event_id IN (${params})
        UNION SELECT derived_id FROM mind_source_dependencies WHERE world_id=? AND actor_id=? AND (source_id IN (${params}) OR alias_id IN (${params})))`
        : '';
      const args = ids
        ? [...batch, worldId, actorId, ...batch, worldId, actorId, ...batch, ...batch]
        : [];
      await this.db
        .prepare(
          `DELETE FROM memory_index_queue WHERE world_id=? AND actor_id=?${ids ? ` AND source_id${target}` : ''}`,
        )
        .run(worldId, actorId, ...args);
      await this.db
        .prepare(
          `INSERT INTO memory_index_queue
        SELECT r.world_id,r.actor_id,r.id,r.revision,m.model,m.dimensions,r.importance,r.at
        FROM recall_sources r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
        WHERE r.world_id=? AND r.actor_id=? AND r.eligible=1${ids ? ` AND r.id${target}` : ''}
        AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
        AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ON CONFLICT DO NOTHING`,
        )
        .run(worldId, actorId, ...args);
      if (!ids) break;
    }
  }

  async invalidateConversationCompactions(
    worldId: string,
    actorIds?: readonly string[],
  ): Promise<void> {
    if (actorIds !== undefined) {
      const keys = [...new Set(actorIds)].map(
        (actor) => `integration:${conversationCompactionKey(worldId, actor)}`,
      );
      for (const batch of sqlRowBatches(keys.map((key) => [key])))
        await this.db
          .prepare('DELETE FROM meta WHERE key=ANY(?::text[])')
          .run(batch.map(([key]) => key));
      return;
    }
    const prefix = `integration:conversation-compaction:${JSON.stringify([worldId]).slice(0, -1)},`;
    await this.db
      .prepare('DELETE FROM meta WHERE substr(key,1,?)=?')
      .run([...prefix].length, prefix);
  }

  /** A restored identical source may reuse paid derived data. Publication still checks
   * the new generation, and dispatched/uncertain attempts stay outside gameplay rewind. */
  async reuseVectors(worldId: string, changed?: MemoryChanges) {
    this.vectorReuse(worldId, changed);
    this.db.afterCommit?.(() => this.vectorReuse(worldId, changed));
    const pairs = changed
      ? [...changed].flatMap(([actor, ids]) =>
          ids === null
            ? [{ actor, id: null as string | null }]
            : [...ids]
                .filter((id) => !changed.newSources?.get(actor)?.has(id))
                .map((id) => ({ actor, id: id as string | null })),
        )
      : [];
    if (changed && !pairs.length) return;
    for (let offset = 0; offset < Math.max(1, pairs.length); offset += 300) {
      const batch = pairs.slice(offset, offset + 300);
      const selected = (alias: string) =>
        changed
          ? ` AND EXISTS (
        SELECT 1 FROM jsonb_to_recordset(?::jsonb) selected(actor text,id text)
        WHERE selected.actor=${alias}.actor_id AND (selected.id IS NULL OR selected.id=${alias}.${alias === 'q' ? 'source_id' : 'id'}))`
          : '';
      await this.db
        .prepare(
          memoryVectorReuseSql('?', String(this.derivedAllowance?.hardBytes ?? 0), selected('r')),
        )
        .run(worldId, ...(changed ? [JSON.stringify(batch)] : []));
      await this.db
        .prepare(memoryVectorReuseQueueSql('?', selected('q')))
        .run(worldId, ...(changed ? [JSON.stringify(batch)] : []));
    }
    if (changed) await this.trimDerived(worldId, changed.keys());
    else {
      const owners = await this.db
        .prepare('SELECT actor_id FROM memory_derived_usage WHERE world_id=?')
        .all(worldId);
      await this.trimDerived(
        worldId,
        owners.map((row) => String(row['actor_id'])),
      );
    }
  }
}
