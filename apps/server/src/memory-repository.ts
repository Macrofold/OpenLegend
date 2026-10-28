import {
  trimMemoryDerivatives,
  derivedMemoryUsage,
  type DerivedMemoryAllowance,
} from './memory-derivatives.js';
import { prepareAccountRetention } from './account-retention.js';
import { cleanupRetiredIndividuals, releaseUnusedTemporalSupports } from './retention-cleanup.js';
import {
  prepareSourceVersions,
  applySourceVersions,
  type SourceVersionPlan,
} from './source-version-retention.js';
import { hasLinguisticSpeech } from './speech-recall.js';
import { tableRows } from './record-pages.js';
import {
  readTemporalHistory,
  prepareTemporalRetention,
  type TemporalHistoryPage,
  type TemporalHistoryQuery,
  type PreparedMemoryRetention,
} from './temporal-storage.js';
import { insertRows, sqlRecordBatches, type SqlWriteBatch } from './sql-rows.js';
import { LexicalProjection } from './lexical-projection.js';
import type { ConsolidationBatch } from './memory-consolidation.js';
import { matchesSearch, scanMatches, searchWords } from './text-search.js';
// Preparation allowance, not a retained-history or searchable-corpus limit.
export const RETRIEVAL_ROWS = PERSONAL_EVIDENCE_PREPARATION.rows;
export const RETRIEVAL_BYTES = PERSONAL_EVIDENCE_PREPARATION.bytes;
export class MemoryPreparationError extends Error {
  override readonly name = 'MemoryPreparationError';
  constructor() {
    super(
      'Required memory context exceeds preparation capacity. Use paged history or consolidate the conversation before another full-context decision; no evidence was discarded.',
    );
  }
}
export const MAINTENANCE_SOURCES = 128;
export const MAINTENANCE_BYTES = 512 * 1024;
import { digest } from './content-digest.js';
import {
  personalAccountRevision,
  storyAccountSql,
  temporalStoryAwareness,
  storyTemporalReceipt,
  storyTemporalBytes,
} from './personal-accounts.js';
import type {
  Awareness,
  ExperienceEntry,
  ExperienceSummary,
  MemoryRecord,
} from '@open-legend/domain';
import {
  EXPERIENCE_LIMITS,
  PERSONAL_EVIDENCE_PREPARATION,
  validEncounterExposure,
  validateEventEvidence,
  awarenessMemory,
  summaryMemory,
  validateExperienceManifest,
  observationDependencies,
  observationLearningSources,
  ownedObservationSources,
  recognitionSupportSources,
  type RecognitionSupportSource,
  type ObservationContribution,
  validPersonalSourceRef,
  type PersonalSourceRef,
  prepareKnownPlaceEvidence,
  type KnownPlaceCapsule,
  knownPlaceCapsule,
  retainedPlaceObservations,
  canonicalJson,
  personalFactAlias,
  type EncounterExposure,
  type WorldState,
  type TemporalHistorySelection,
  type TemporalReceiptLocator,
  type TemporalSupportCapsule,
  splitTemporalValue,
  temporalKnownPlaceCapsules,
  selectedAttentionPolicy,
  validExperienceSummary,
  experienceReading,
} from '@open-legend/domain';
import { z } from 'zod';
import type { SqlDatabase, SavedWorld } from './store.js';
import type { RecordChanges, RowChange } from './world-records.js';

export const MEMORY_SOURCE_TABLES = {
  awareness: 'mind_awareness',
  memory: 'mind_memories',
  summary: 'mind_summaries',
} as const;
const sourceTables = MEMORY_SOURCE_TABLES;
export type MemoryChanges = Map<string, Set<string> | null> & {
  /** Transaction-local canonical creations, never a reusable eligibility cache. */
  newSources?: Map<string, Map<string, SourceKind>>;
};
type SourceKind = keyof typeof sourceTables;
const sourceKey = (kind: string, id: string) => JSON.stringify([kind, id]);
// Payload/text bodies must not leak into metadata selection before byte admission.
const sourceColumnNames = [
  'world_id',
  'actor_id',
  'id',
  'source_kind',
  'record_id',
  'revision',
  'event_id',
  'memory_kind',
  'acquisition',
  'event_type',
  'at',
  'importance',
  'required',
  'eligible',
  'sequence',
];
const sourceColumns = sourceColumnNames.map((name) => `r.${name}`).join(',');
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
// Bound parameters are parsed as full-text values, never as SQL or locale-dependent text.
const quotedLexeme = (word: string) => `'${word.replace(/['\\]/g, '\\$&')}'`;
const indexedWord = (word: string) => Buffer.byteLength(word) < 2047;
const lexicalQuery = (words: string[]) =>
  words
    .filter(indexedWord)
    .map((word) => `${quotedLexeme(word)}:*`)
    .join(' | ');
interface VectorEpoch {
  worldId: string;
  actorId: string;
  token: number;
  references: number;
}
interface CoverageEpochs {
  actorKey: string;
  modelKey: string;
  actor: VectorEpoch;
  model: VectorEpoch;
}
const actorScopeKey = (scope: MemoryScope) =>
  JSON.stringify([scope.worldId, scope.actorId, scope.generation]);
const modelScopeKey = (scope: MemoryScope, model: MemoryModel) =>
  JSON.stringify([scope.worldId, scope.actorId, scope.generation, model.model, model.dimensions]);
export const MEMORY_HISTORY_TABLES = ['mind_source_versions', 'mind_source_annotations'] as const;
// Paid derived artifacts follow operational backup, not gameplay rewind.
export const MEMORY_CACHE_TABLES = ['memory_vector_cache'] as const;
/** Request-owned body reuse; keys include actor, generation-independent source revision
 * and storage identity. Metadata eligibility is always read in the current SQL snapshot.
 * The bounded cache can evict bodies without narrowing retrieval or transcript coverage. */
export class MemoryReadCache {
  private values = new Map<string, { value: RetrievedMemory; bytes: number }>();
  private bytes = 0;
  private key(row: Record<string, unknown>): string {
    return JSON.stringify([
      row['world_id'],
      row['actor_id'],
      row['source_kind'],
      row['record_id'],
      row['revision'],
    ]);
  }
  get(row: Record<string, unknown>) {
    return this.values.get(this.key(row));
  }
  put(row: Record<string, unknown>, value: RetrievedMemory, bytes: number) {
    const key = this.key(row);
    if (this.values.has(key)) return;
    while (
      this.values.size &&
      (this.bytes + bytes > RETRIEVAL_BYTES || this.values.size >= RETRIEVAL_ROWS)
    ) {
      const oldest = this.values.keys().next().value!;
      this.bytes -= this.values.get(oldest)!.bytes;
      this.values.delete(oldest);
    }
    if (bytes <= RETRIEVAL_BYTES) {
      this.values.set(key, { value, bytes });
      this.bytes += bytes;
    }
  }
}

export interface CognitionPreparation {
  scope: MemoryScope;
  bodies: MemoryReadCache;
  conversation: Awaited<ReturnType<MemoryRepository['context']>>;
}

export interface MemoryScope {
  worldId: string;
  actorId: string;
  generation: string;
}
export interface ConversationSource {
  id: string;
  revision: string;
  sequence: number;
  correction: string;
  bodyBytes: number;
}
export const conversationCompactionKey = (worldId: string, actorId: string) =>
  `conversation-compaction:${JSON.stringify([worldId, actorId])}`;
export interface RetrievedMemory {
  /** Read proof for an event retained in recent chronology, not a recall_sources row. */
  receipt?: TemporalReceiptLocator;
  /** Authoritative source; memory is only its shared readable projection. */
  entry: ExperienceEntry;
  sourceKind: SourceKind;
  memory: MemoryRecord;
  awareness?: Awareness;
  revision: string;
  score?: number;
  bodyBytes: number;
  /** A current eligible summary that admitted this exact retained original. */
  through?: SummarySourceBinding;
}
export interface SummarySourceBinding {
  id: string;
  revision: string;
}
export function memorySourceProof(source: RetrievedMemory): CurrentMemorySource {
  return {
    id: source.memory.id,
    sourceKind: source.sourceKind,
    revision: source.revision,
    ...(source.through ? { through: source.through } : {}),
    ...(source.receipt ? { receipt: source.receipt } : {}),
  };
}

/** All selected source readers share current-format decoding. A missing manifest
 * never becomes a text-only summary on an editor/page or cold retrieval path. */
function decodeMemorySource(kind: SourceKind, payload: string, actorId: string): ExperienceEntry {
  const value: unknown = JSON.parse(payload);
  if (kind === 'awareness') {
    validateEventEvidence(value);
    if (
      (value as Awareness).exposure !== undefined &&
      !validEncounterExposure((value as Awareness).exposure)
    )
      throw new Error('Invalid stored encounter evidence. Existing data was not replaced.');
    if (value.actorId !== actorId)
      throw new Error('Stored experience owner disagrees with its partition.');
    return { source: kind, value: value as Awareness };
  }
  if (kind === 'summary') {
    if (!validExperienceSummary(value, actorId))
      throw new Error('Invalid stored summary attribution. Existing data was not replaced.');
    return { source: kind, value };
  }
  const memory = value as MemoryRecord;
  if (!memory || memory.actorId !== actorId)
    throw new Error('Stored memory owner disagrees with its partition.');
  if (memory.manifest) validateExperienceManifest(memory.manifest);
  return { source: kind, value: memory };
}
export interface CurrentMemorySource {
  receipt?: TemporalReceiptLocator;
  id: string;
  sourceKind: SourceKind;
  revision: string;
  through?: SummarySourceBinding;
}
export interface KnownPlaceSource {
  memory: MemoryRecord;
  revision: string;
  place: {
    exposure: Extract<EncounterExposure, { kind: 'place' }>;
    capsule: KnownPlaceCapsule;
  };
  correctionId?: string;
  correction?: string;
}
export interface MemoryVector {
  id: string;
  revision: string;
  vector: number[];
}
export interface MemoryModel {
  model: string;
  dimensions: number;
}

/** SQL owns permission scope, current source eligibility and top-N selection. Text
 * interpretation remains with domain/AI owners; this repository invents no semantics.
 */
export class MemoryRepository {
  private readonly versionPlans = new WeakMap<WorldState, SourceVersionPlan>();
  stageSourceVersions(world: WorldState, plan: SourceVersionPlan | undefined) {
    if (plan) this.versionPlans.set(world, plan);
  }
  applySourceVersionPlan(worldId: string, revision: number, plan: SourceVersionPlan) {
    return applySourceVersions(this.db, worldId, revision, plan);
  }
  prepareSourceVersionRetention(state: SavedWorld, changes: RecordChanges) {
    return this.snapshot(() => prepareSourceVersions(this.db, state, changes));
  }
  /** Establish the committed SQL source cut before a caller captures a read fence. */
  async synchronizeSources(): Promise<void> {
    await this.db.synchronizeProjection?.();
  }
  private derivedAllowance?: DerivedMemoryAllowance;
  private derivedPolicyDirty = false;
  configureWorld(world: WorldState): void {
    const policy = selectedAttentionPolicy(world);
    this.configureAllowance({
      worldId: world.id,
      policyId: policy.id,
      policyVersion: policy.version,
      maxBytes: policy.retention.derivedMaxBytes,
    });
  }
  configureAllowance(allowance: DerivedMemoryAllowance): void {
    if (
      !allowance.worldId ||
      !allowance.policyId ||
      !Number.isSafeInteger(allowance.policyVersion) ||
      allowance.policyVersion < 1 ||
      !Number.isSafeInteger(allowance.maxBytes) ||
      allowance.maxBytes < 0
    )
      throw new Error('Invalid selected memory cache allowance.');
    if (JSON.stringify(this.derivedAllowance) !== JSON.stringify(allowance)) {
      this.derivedAllowance = { ...allowance };
      this.derivedPolicyDirty = true;
      this.textSelection.clear();
    }
  }
  async enforceDerivedWorld(worldId: string): Promise<void> {
    if (
      !this.derivedAllowance ||
      this.derivedAllowance.worldId !== worldId ||
      !this.derivedPolicyDirty
    )
      return;
    await this.db.transaction(async () => {
      const actors = await this.db
        .prepare(
          `SELECT DISTINCT actor_id FROM (
        SELECT actor_id FROM recall_sources WHERE world_id=? UNION SELECT actor_id FROM memory_vector_cache WHERE world_id=?
        UNION SELECT actor_id FROM memory_vectors WHERE world_id=? UNION SELECT actor_id FROM memory_lexical_pending WHERE world_id=?
      ) owners`,
        )
        .all(worldId, worldId, worldId, worldId);
      await this.trimDerived(
        worldId,
        actors.map((row) => String(row['actor_id'])),
      );
    });
    this.derivedPolicyDirty = false;
  }
  async derivedUsage(scope: Pick<MemoryScope, 'worldId' | 'actorId'>): Promise<number> {
    return derivedMemoryUsage(this.db, scope.worldId, scope.actorId);
  }
  private async trimDerived(worldId: string, actors: Iterable<string>): Promise<void> {
    const allowance = this.derivedAllowance;
    if (!allowance || allowance.worldId !== worldId) return;
    for (const actorId of new Set(actors)) await trimMemoryDerivatives(this.db, allowance, actorId);
  }
  publicationRevision = 0;
  private coverageCache = new Map<
    string,
    {
      revision: number;
      reset: number;
      actorToken: number;
      modelToken: number;
      epochs: CoverageEpochs;
      value: { eligible: number; indexed: number; missing: number };
    }
  >();
  private resetEpoch = 0;
  private vectorToken = 0;
  private actorVectorEpochs = new Map<string, VectorEpoch>();
  private modelVectorEpochs = new Map<string, VectorEpoch>();
  private textSelection = new Map<
    string,
    { revision: number; reset: number; rows: Record<string, unknown>[] }
  >();
  private actorRevisions = new Map<string, number>();
  actorRevision(actorId: string): number {
    return this.actorRevisions.get(actorId) ?? 0;
  }
  private readonly lexical: LexicalProjection;
  constructor(private readonly db: SqlDatabase) {
    this.lexical = new LexicalProjection(db);
    this.lexical.setDerivedAdmission((worldId, actors) => this.trimDerived(worldId, actors));
  }
  setBackgroundSearchAdmission(allowed: () => boolean): void {
    this.lexical.setBackgroundAdmission(allowed);
  }
  lexicalCommitted(remoteSources?: PreparedMemorySources) {
    if (remoteSources && [...remoteSources.groups.values()].some((rows) => rows.length))
      this.lexical.sourcesCommitted();
    else this.lexical.committed();
  }
  closeLexical() {
    return this.lexical.close();
  }
  private retainCoverage(scope: MemoryScope, model: MemoryModel): CoverageEpochs {
    const actorKey = actorScopeKey(scope),
      modelKey = modelScopeKey(scope, model);
    const retain = (map: Map<string, VectorEpoch>, key: string) => {
      let epoch = map.get(key);
      if (!epoch) {
        epoch = {
          worldId: scope.worldId,
          actorId: scope.actorId,
          token: ++this.vectorToken,
          references: 0,
        };
        map.set(key, epoch);
      }
      epoch.references++;
      return epoch;
    };
    return {
      actorKey,
      modelKey,
      actor: retain(this.actorVectorEpochs, actorKey),
      model: retain(this.modelVectorEpochs, modelKey),
    };
  }
  private releaseCoverage(epochs: CoverageEpochs) {
    for (const [map, key, epoch] of [
      [this.actorVectorEpochs, epochs.actorKey, epochs.actor],
      [this.modelVectorEpochs, epochs.modelKey, epochs.model],
    ] as const)
      if (--epoch.references === 0 && map.get(key) === epoch) map.delete(key);
  }
  private evictCoverage(key: string) {
    const cached = this.coverageCache.get(key);
    if (cached) this.releaseCoverage(cached.epochs);
    this.coverageCache.delete(key);
  }
  private resetCaches() {
    this.resetEpoch++;
    for (const key of this.coverageCache.keys()) this.evictCoverage(key);
    this.textSelection.clear();
    this.actorVectorEpochs.clear();
    this.modelVectorEpochs.clear();
  }
  private vectorPublication(scope: MemoryScope, model: MemoryModel) {
    const epoch = this.modelVectorEpochs.get(modelScopeKey(scope, model));
    if (epoch) epoch.token = ++this.vectorToken;
  }
  private vectorReuse(worldId: string, changed?: MemoryChanges) {
    if (!changed) return this.resetCaches();
    for (const epoch of this.actorVectorEpochs.values())
      if (epoch.worldId === worldId && changed.has(epoch.actorId)) epoch.token = ++this.vectorToken;
  }
  committed(changes: RecordChanges, restored = false) {
    const actors = new Set<string>();
    let unknownScope = changes.deletes.has('data_world') || changes.deletes.has('world_settings');
    // Current reception and attention are not retained memory. Their own grants
    // fence live reads; retained awareness/temporal sources still invalidate here.
    const affectsMemory = (table: string) =>
      table.startsWith('mind_') &&
      !table.startsWith('mind_perception_') &&
      !/^mind_(exposure|visible_objects|visible_people|visible_places)(?:_owners)?$/.test(table);
    const mark = (id: string) => {
      const path = JSON.parse(id) as string[];
      if (path[1] === 'experience' && path[2] === 'temporal' && path[3] === 'sources') return;
      const actor = path[path[1] === 'experience' ? (path[2] === 'temporal' ? 4 : 3) : 2];
      if (actor) actors.add(actor);
      else unknownScope = true;
    };
    for (const [table, rows] of changes.writes)
      if (affectsMemory(table)) for (const row of rows) mark(row.id);
    for (const [table, ids] of changes.deletes)
      if (affectsMemory(table)) for (const id of ids) mark(id);
    if (
      restored ||
      unknownScope ||
      changes.writes.has('experience_state') ||
      changes.deletes.has('experience_state')
    )
      this.resetCaches();
    if (restored) {
      this.lexical.restored();
      this.actorRevisions.clear();
    }
    if (
      restored ||
      unknownScope ||
      actors.size ||
      changes.writes.has('experience_state') ||
      changes.deletes.has('experience_state')
    )
      this.publicationRevision++;
    // Other actors' memories cannot invalidate this actor's asynchronous inspection.
    for (const actor of actors) this.actorRevisions.set(actor, this.publicationRevision);
  }

  async initialize() {
    const existing = await this.db
      .prepare("SELECT to_regclass('open_legend.recall_sources') AS relation")
      .get();
    if (existing?.['relation']) {
      const columns = await this.db
        .prepare(
          `SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
            a.attgenerated AS generated,a.attnotnull AS required,
            pg_get_expr(d.adbin,d.adrelid) AS default_value
          FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
          WHERE a.attrelid=to_regclass('open_legend.recall_sources') AND NOT a.attisdropped
            AND a.attname IN ('search_text','search_vector','linguistic','payload_bytes','retention_class')`,
        )
        .all();
      // A shared storage marker can predate this derived-column contract. Reject
      // that layout before CREATE IF NOT EXISTS hides it; never convert development
      // databases or replace their indexes/rows (AGENTS.md#development-save-policy).
      if (
        columns.length !== 4 ||
        !columns.every(
          (column) =>
            column['generated'] === '' &&
            column['required'] === true &&
            ((column['name'] === 'search_text' &&
              column['type'] === 'text' &&
              column['default_value'] === "''::text") ||
              (column['name'] === 'retention_class' &&
                column['type'] === 'text' &&
                column['default_value'] == null) ||
              (['linguistic', 'payload_bytes'].includes(String(column['name'])) &&
                column['type'] === 'bigint' &&
                column['default_value'] == null)),
        )
      )
        throw new Error(
          'Unsupported memory search projection. Existing data was not converted or deleted.',
        );
    }
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS recall_sources (
        world_id TEXT NOT NULL REFERENCES world_head(world_id), actor_id TEXT NOT NULL,
        id TEXT NOT NULL, source_kind TEXT NOT NULL, record_id TEXT NOT NULL, revision TEXT NOT NULL,
        event_id TEXT, memory_kind TEXT, acquisition TEXT, event_type TEXT,
        at DOUBLE PRECISION NOT NULL, importance DOUBLE PRECISION NOT NULL, required BIGINT NOT NULL,eligible BIGINT NOT NULL DEFAULT 0, sequence BIGINT NOT NULL DEFAULT 0,
        search_text TEXT NOT NULL DEFAULT '', linguistic BIGINT NOT NULL,payload_bytes BIGINT NOT NULL,retention_class TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,id,source_kind));
      CREATE INDEX IF NOT EXISTS recall_dialogue_order ON recall_sources(world_id,actor_id,sequence DESC,id DESC)
        WHERE source_kind='awareness' AND eligible=1 AND linguistic=1;
      CREATE INDEX IF NOT EXISTS recall_actor_rank ON recall_sources(world_id,actor_id,eligible,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_source_validation ON recall_sources(world_id,actor_id,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_context_rank ON recall_sources(world_id,actor_id,eligible,required DESC,importance DESC,at DESC,id);
      CREATE INDEX IF NOT EXISTS recall_actor_recent ON recall_sources(world_id,actor_id,eligible,at DESC,id);
      CREATE TABLE IF NOT EXISTS recall_place_capsules (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,owner_id TEXT NOT NULL,owner_kind TEXT NOT NULL,owner_revision TEXT NOT NULL,
        place_id TEXT NOT NULL,observed_at DOUBLE PRECISION NOT NULL,observed_order BIGINT NOT NULL,
        source_event_id TEXT,native_source_id TEXT NOT NULL,fact_alias TEXT NOT NULL,capsule_key TEXT NOT NULL,capsule TEXT NOT NULL,account_owner_kind TEXT,support_record_id TEXT,
        PRIMARY KEY(world_id,actor_id,owner_id,owner_kind,capsule_key),
        FOREIGN KEY(world_id,actor_id,owner_id,account_owner_kind) REFERENCES recall_sources(world_id,actor_id,id,source_kind) ON DELETE CASCADE,
        FOREIGN KEY(world_id,support_record_id) REFERENCES mind_temporal_supports(world_id,id) ON DELETE CASCADE,
        CHECK ((owner_kind='support' AND account_owner_kind IS NULL AND support_record_id IS NOT NULL) OR (owner_kind<>'support' AND account_owner_kind=owner_kind AND support_record_id IS NULL)));
      CREATE TABLE IF NOT EXISTS mind_impression_spans (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,owner_id TEXT NOT NULL,owner_kind TEXT NOT NULL CHECK(owner_kind='memory'),
        physical_life BIGINT NOT NULL,receipt_epoch TEXT NOT NULL,first_ordinal BIGINT NOT NULL,last_ordinal BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,owner_id,physical_life,receipt_epoch,first_ordinal,last_ordinal),
        FOREIGN KEY(world_id,actor_id,owner_id,owner_kind) REFERENCES recall_sources(world_id,actor_id,id,source_kind) ON DELETE CASCADE);
      CREATE INDEX IF NOT EXISTS impression_receipt_range ON mind_impression_spans(world_id,actor_id,physical_life,receipt_epoch,first_ordinal,last_ordinal);
      CREATE INDEX IF NOT EXISTS recall_place_lookup ON recall_place_capsules(world_id,actor_id,place_id,observed_at DESC,observed_order DESC,owner_id DESC,owner_kind DESC);
      CREATE INDEX IF NOT EXISTS recall_commitments ON recall_sources(world_id,actor_id,at,id) WHERE source_kind='memory' AND memory_kind='commitment' AND eligible=1;
      CREATE INDEX IF NOT EXISTS recall_world_event ON recall_sources(world_id,event_id,actor_id);
      CREATE INDEX IF NOT EXISTS recall_actor_event ON recall_sources(world_id,actor_id,event_id);
      CREATE INDEX IF NOT EXISTS recall_required ON recall_sources(world_id,actor_id,required,eligible,id);
      CREATE INDEX IF NOT EXISTS recall_record ON recall_sources(world_id,source_kind,record_id);
      CREATE TABLE IF NOT EXISTS mind_source_dependencies (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,derived_kind TEXT NOT NULL,derived_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,support_key TEXT NOT NULL,source_life BIGINT NOT NULL,facet_ordinal BIGINT NOT NULL,alias_id TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,derived_kind,derived_id,source_kind,source_id,source_revision,support_key,source_life,facet_ordinal,alias_id));
      CREATE INDEX IF NOT EXISTS mind_dependency_world_source ON mind_source_dependencies(world_id,source_id,actor_id,derived_id);
      CREATE INDEX IF NOT EXISTS mind_dependency_reverse ON mind_source_dependencies(world_id,actor_id,source_id);
      CREATE INDEX IF NOT EXISTS mind_dependency_alias_reverse ON mind_source_dependencies(world_id,actor_id,alias_id);
      CREATE INDEX IF NOT EXISTS mind_dependency_world_alias ON mind_source_dependencies(world_id,alias_id,actor_id,derived_id);
      CREATE TABLE IF NOT EXISTS mind_source_versions (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
        revision TEXT NOT NULL,payload TEXT NOT NULL,retired_revision BIGINT NOT NULL,retention_class TEXT NOT NULL,logical_bytes BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_kind,source_id,revision));
      CREATE TABLE IF NOT EXISTS mind_source_annotations (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_kind TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,namespace TEXT NOT NULL,revision BIGINT NOT NULL,payload TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_kind,source_id,source_revision,namespace));
      CREATE TABLE IF NOT EXISTS memory_index_models (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,
        PRIMARY KEY(world_id,actor_id,model,dimensions));
      CREATE TABLE IF NOT EXISTS memory_index_queue (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,
        model TEXT NOT NULL,dimensions BIGINT NOT NULL,importance DOUBLE PRECISION NOT NULL,at DOUBLE PRECISION NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,model,dimensions));
      CREATE INDEX IF NOT EXISTS memory_index_due ON memory_index_queue(world_id,actor_id,model,dimensions,importance DESC,at DESC,source_id);
      CREATE TABLE IF NOT EXISTS memory_index_attempts (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,generation TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,request_id TEXT NOT NULL,
        state TEXT NOT NULL,PRIMARY KEY(world_id,actor_id,source_id,source_revision,model,dimensions));
      CREATE TABLE IF NOT EXISTS memory_vector_cache (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,source_id TEXT NOT NULL,source_revision TEXT NOT NULL,
        model TEXT NOT NULL,dimensions BIGINT NOT NULL,embedding TEXT NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,source_revision,model,dimensions));
    `);
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS recall_maintenance ON recall_sources(world_id,actor_id,eligible,at,sequence,id);
      CREATE INDEX IF NOT EXISTS recall_maintenance_routine ON recall_sources(world_id,actor_id,at,sequence,id)
        WHERE eligible=1 AND importance<${EXPERIENCE_LIMITS.protectedImportance} AND (source_kind='awareness' OR memory_kind='episode');
      CREATE INDEX IF NOT EXISTS recall_maintenance_speech ON recall_sources(world_id,actor_id,eligible,event_type,at DESC,sequence DESC,id DESC);
    `);
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_vectors (
        world_id TEXT NOT NULL,actor_id TEXT NOT NULL,generation TEXT NOT NULL,source_id TEXT NOT NULL,
        source_revision TEXT NOT NULL,model TEXT NOT NULL,dimensions BIGINT NOT NULL,embedding public.vector NOT NULL,
        PRIMARY KEY(world_id,actor_id,source_id,model,dimensions),
        CHECK(public.vector_dims(embedding)=dimensions));
      ALTER TABLE memory_vectors ALTER COLUMN embedding SET STORAGE PLAIN;
      CREATE INDEX IF NOT EXISTS memory_vector_scope ON memory_vectors(world_id,actor_id,generation,model,dimensions,source_id,source_revision);
    `);
    await this.lexical.initialize();
    await this.db
      .exec(`CREATE INDEX IF NOT EXISTS temporal_chunk_subjects ON mind_temporal_chunks USING GIN(subjects);
      CREATE INDEX IF NOT EXISTS temporal_chunk_sources ON mind_temporal_chunks USING GIN(source_refs);
      CREATE INDEX IF NOT EXISTS temporal_chunk_aliases ON mind_temporal_chunks USING GIN(source_ids);
      CREATE INDEX IF NOT EXISTS temporal_chunk_individuals ON mind_temporal_chunks USING GIN(individual_ids);`);
  }
  temporalHistory(
    scope: MemoryScope,
    query: TemporalHistoryQuery,
    world: WorldState,
  ): Promise<TemporalHistoryPage> {
    return this.snapshot(() => readTemporalHistory(this.db, scope, world, query));
  }
  prepareRetention(
    state: SavedWorld,
    complete = false,
    pending?: RecordChanges,
    previous?: WorldState,
  ): Promise<PreparedMemoryRetention> {
    return this.snapshot(async () => {
      const accounts = await prepareAccountRetention(this.db, state, complete, pending?.deletes);
      const recent = await prepareTemporalRetention(
        this.db,
        accounts.state,
        complete,
        pending,
        previous,
      );
      const rows = new Map(accounts.rows);
      for (const [table, ids] of recent.rows) rows.set(table, [...(rows.get(table) ?? []), ...ids]);
      let retained = recent.state;
      // A familiarity proof cannot make its own first encounter permanent. An actual
      // recent-history retirement is also the boundary for releasing unowned sparse proof.
      const retiredActors = new Set(
        (recent.rows.get('mind_temporal_chunks') ?? []).map(
          (id) => (JSON.parse(id) as string[])[4]!,
        ),
      );
      const removedAccounts = ['mind_awareness', 'mind_memories', 'mind_summaries'].flatMap(
        (table) => rows.get(table) ?? [],
      );
      for (const actorId of retiredActors) {
        const released = await releaseUnusedTemporalSupports(
          this.db,
          retained,
          actorId,
          complete,
          removedAccounts,
        );
        retained = released.state;
        if (released.ids.length)
          rows.set('mind_temporal_supports', [
            ...new Set([...(rows.get('mind_temporal_supports') ?? []), ...released.ids]),
          ]);
      }
      const cleaned = await cleanupRetiredIndividuals(this.db, state, retained, rows, complete);
      return { state: cleaned, rows, positions: accounts.positions };
    });
  }
  /** Revalidate the actual selected facts, not merely a surviving receipt address.
   * A small name/profile proof cannot keep a pending full historical read valid. */
  async temporalSelectionsCurrent(
    scope: MemoryScope,
    selections: readonly TemporalHistorySelection['entries'][number][],
  ): Promise<boolean> {
    if (!selections.length) return true;
    if (
      selections.length > RETRIEVAL_ROWS ||
      selections.some(
        ({ receipt, values }) =>
          receipt.actorId !== scope.actorId ||
          !receipt.facets.length ||
          receipt.facets.length !== values.length,
      )
    )
      return false;
    const selected = selections.map(({ receipt, values }) => {
      const { facets, sourceIds: _aliases, ...header } = receipt;
      // The public read contains full personal values. Reconstruct the exact
      // stored pairing before comparing it within the scoped SQL snapshot.
      const fragments = values.map(splitTemporalValue);
      return {
        actorId: receipt.actorId,
        physicalLife: receipt.physicalLife,
        epoch: receipt.epoch,
        ordinal: receipt.ordinal,
        header,
        facets: facets.map((facet, index) => ({
          ...facet,
          ...(fragments[index]!.reception ? { reception: fragments[index]!.reception } : {}),
        })),
        values: fragments.map(({ value }) => value),
      };
    });
    const payload = JSON.stringify(selected);
    if (Buffer.byteLength(payload) > RETRIEVAL_BYTES) return false;
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM jsonb_to_recordset(?::jsonb)
      q("actorId" text,"physicalLife" bigint,epoch text,ordinal bigint,header jsonb,facets jsonb,values jsonb)
      WHERE EXISTS(SELECT 1 FROM world_head WHERE world_id=? AND generation=?) AND (
        EXISTS(SELECT 1 FROM LATERAL (
          SELECT payload,last_ordinal,receipt_ordinals FROM mind_temporal_chunks c
          WHERE c.world_id=? AND c.actor_id=q."actorId" AND c.physical_life=q."physicalLife" AND c.receipt_epoch=q.epoch AND c.first_ordinal<=q.ordinal
          ORDER BY c.first_ordinal DESC LIMIT 1
        ) chunk CROSS JOIN LATERAL jsonb_array_elements(chunk.payload::jsonb->'receipts') r(receipt)
          WHERE chunk.last_ordinal>=q.ordinal AND chunk.receipt_ordinals @> ARRAY[q.ordinal]
          AND (r.receipt->>'ordinal')::bigint=q.ordinal
          AND (r.receipt-'facets'-'sourceIds')=q.header
          AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q.facets) WITH ORDINALITY f(value,position)
            WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r.receipt->'facets') owned(facet)
              JOIN mind_temporal_sources source ON source.world_id=? AND source.source_id=f.value->>'blockId'
              WHERE owned.facet=f.value AND source.payload::jsonb->'values'->(f.value->>'valueOrdinal')::int=q.values->(f.position::int-1))))
        OR EXISTS(SELECT 1 FROM mind_temporal_supports s
          WHERE s.world_id=? AND s.actor_id=q."actorId" AND s.physical_life=q."physicalLife" AND s.receipt_epoch=q.epoch AND s.receipt_ordinal=q.ordinal
          AND ((s.payload::jsonb->'receipt')-'facets'-'sourceIds')=q.header
          AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(q.facets) WITH ORDINALITY f(value,position)
            WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s.payload::jsonb->'receipt'->'facets') WITH ORDINALITY owned(facet,position)
              WHERE owned.facet=f.value AND s.payload::jsonb->'values'->(owned.position::int-1)=q.values->(f.position::int-1))))
      )`,
      )
      .get(payload, scope.worldId, scope.generation, scope.worldId, scope.worldId, scope.worldId);
    return Number(row?.['count'] ?? 0) === selections.length;
  }
  async temporalReceiptLocatorsCurrent(
    scope: MemoryScope,
    locators: readonly TemporalReceiptLocator[],
  ): Promise<boolean> {
    if (!locators.length) return true;
    if (
      locators.length > RETRIEVAL_ROWS ||
      locators.some((locator) => locator.actorId !== scope.actorId)
    )
      return false;
    const unique = [
      ...new Map(locators.map((locator) => [JSON.stringify(locator), locator])).values(),
    ];
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM jsonb_to_recordset(?::jsonb)
      q("actorId" text,"physicalLife" bigint,epoch text,ordinal bigint)
      WHERE EXISTS (SELECT 1 FROM world_head WHERE world_id=? AND generation=?) AND (
        EXISTS (SELECT 1 FROM LATERAL (
          SELECT last_ordinal,receipt_ordinals FROM mind_temporal_chunks c
          WHERE c.world_id=? AND c.actor_id=q."actorId" AND c.physical_life=q."physicalLife"
            AND c.receipt_epoch=q.epoch AND c.first_ordinal<=q.ordinal
          ORDER BY c.first_ordinal DESC LIMIT 1
        ) current WHERE current.last_ordinal>=q.ordinal AND current.receipt_ordinals @> ARRAY[q.ordinal])
        OR EXISTS (SELECT 1 FROM mind_temporal_supports s WHERE s.world_id=? AND s.actor_id=q."actorId"
          AND s.physical_life=q."physicalLife" AND s.receipt_epoch=q.epoch AND s.receipt_ordinal=q.ordinal))`,
      )
      .get(JSON.stringify(unique), scope.worldId, scope.generation, scope.worldId, scope.worldId);
    return Number(row?.['count'] ?? 0) === unique.length;
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
    const affected: MemoryChanges = new Map();
    affected.newSources = new Map();
    const erased = (changes.writes.get('mind_forgotten') ?? []).map((row) => ({
      actor_id: (JSON.parse(row.id) as string[])[3]!,
      source_id: JSON.parse(row.payload) as string,
    }));
    const erasedKeys = new Set(erased.map((row) => JSON.stringify([row.actor_id, row.source_id])));
    if (erased.length) {
      await sharedWrites?.flush();
      const keys = JSON.stringify(erased);
      for (const table of [
        'mind_source_versions',
        'mind_source_annotations',
        'memory_index_queue',
        'memory_vector_cache',
        'memory_vectors',
      ])
        await this.db
          .prepare(
            `DELETE FROM ${table} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
          WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id`,
          )
          .run(keys, worldId);
      await this.db
        .prepare(
          `DELETE FROM history_perspectives t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
        WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.event_id=q.source_id`,
        )
        .run(keys, worldId);
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
      const next = new Map(writes.map((row) => [row.id, row.payload]));
      const direct = changes.deletes.get(table) ?? [];
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
        await sharedWrites?.flush();
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
      if (allIds.length) await sharedWrites?.flush();
      for (let offset = 0; offset < allIds.length; offset += 800) {
        const batch = allIds.slice(offset, offset + 800);
        const placeholders = batch.map(() => '?').join(',');
        const old = await this.db
          .prepare(
            `SELECT id,actor_id,source_id,payload FROM ${table} WHERE world_id=? AND id IN (${placeholders})`,
          )
          .all(worldId, ...batch);
        for (const row of old)
          if (erasedKeys.has(JSON.stringify([row['actor_id'], row['source_id']])))
            expired.add(String(row['id']));
        const expiredSensory =
          kind === 'awareness'
            ? old
                .filter(
                  (row) =>
                    JSON.parse(String(row['payload']))['retentionClass'] === 'sensory' &&
                    !next.has(String(row['id'])),
                )
                .map((row) => row['id'])
            : [];
        if (expiredSensory.length)
          await this.db
            .prepare(
              `DELETE FROM history_perspectives p USING mind_awareness a
            WHERE a.world_id=? AND a.id IN (${expiredSensory.map(() => '?').join(',')})
              AND p.world_id=a.world_id AND p.actor_id=a.actor_id AND p.event_id=a.source_id`,
            )
            .run(worldId, ...expiredSensory);
        for (const row of old) {
          touch(String(row['actor_id']), String(row['source_id']));
          if (kind === 'awareness') invalidateConversations.add(String(row['actor_id']));
        }
        if (archive && !versions && old.length) {
          const candidates = old.map((row) => ({
            actor_id: String(row['actor_id']),
            id: String(row['source_id']),
            revision: personalAccountRevision(String(row['payload'])),
          }));
          const required = await this.db
            .prepare(
              `SELECT 1 AS required FROM jsonb_to_recordset(?::jsonb)q(actor_id text,id text,revision text) JOIN mind_source_dependencies d ON d.world_id=? AND d.actor_id=q.actor_id AND d.source_kind=? AND d.source_id=q.id AND d.source_revision=q.revision LIMIT 1`,
            )
            .get(JSON.stringify(candidates), worldId, kind);
          if (required)
            throw new Error(
              'Exact source closure must be prepared before replacing retained evidence.',
            );
        }
        const released = old.filter((row) => expired.has(String(row['id'])));
        if (released.length) {
          const keys = JSON.stringify(
            released.map((row) => ({
              actor_id: String(row['actor_id']),
              source_id: String(row['source_id']),
            })),
          );
          for (const dependent of [
            ...(versions ? [] : ['mind_source_versions']),
            'mind_source_annotations',
          ])
            await this.db
              .prepare(
                `DELETE FROM ${dependent} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id AND (t.source_kind=? OR (?='awareness' AND t.source_kind='perspective'))`,
              )
              .run(keys, worldId, kind, kind);
          for (const dependent of ['memory_index_queue', 'memory_vectors', 'memory_vector_cache'])
            await this.db
              .prepare(
                `DELETE FROM ${dependent} t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.source_id=q.source_id`,
              )
              .run(keys, worldId);
          await this.db
            .prepare(
              `DELETE FROM mind_source_dependencies t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
            WHERE t.world_id=? AND t.actor_id=q.actor_id AND
              t.derived_kind=? AND t.derived_id=q.source_id`,
            )
            .run(keys, worldId, kind);
          if (kind === 'awareness')
            await this.db
              .prepare(
                `DELETE FROM history_perspectives t USING jsonb_to_recordset(?::jsonb) q(actor_id text,source_id text)
              WHERE t.world_id=? AND t.actor_id=q.actor_id AND t.event_id=q.source_id`,
              )
              .run(keys, worldId);
        }
        {
          await this.db
            .prepare(
              `DELETE FROM mind_source_dependencies WHERE world_id=? AND EXISTS (SELECT 1 FROM recall_sources r WHERE r.world_id=mind_source_dependencies.world_id AND r.actor_id=mind_source_dependencies.actor_id AND r.id=mind_source_dependencies.derived_id AND r.source_kind=mind_source_dependencies.derived_kind AND r.record_id IN (${placeholders}))`,
            )
            .run(worldId, ...batch);
        }
        const pending = await this.db
          .prepare(
            `WITH changed AS (DELETE FROM recall_sources WHERE world_id=? AND source_kind=? AND record_id IN (${placeholders})
              RETURNING world_id,actor_id,id,source_kind,revision) ${this.lexical.enqueueSql('changed', true)}`,
          )
          .get(worldId, kind, ...batch);
        await this.lexical.admit(pending);
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
    if (invalidateConversations.size || changes.deletes.has('experience_state'))
      await sharedWrites?.flush();
    for (const actorId of invalidateConversations)
      await this.invalidateConversationCompactions(worldId, actorId);
    if (changes.deletes.has('experience_state'))
      for (const row of await this.db
        .prepare('SELECT DISTINCT actor_id FROM recall_sources WHERE world_id=?')
        .all(worldId))
        affected.set(String(row['actor_id']), null);
    return affected;
  }
  /** Prepare the exact changed source rows once. No world/history enumeration or SQL,
   * and no eligibility/index mutation before the transaction actually applies them.
   * docs/projects/performance-overhaul/journal-contract.md */
  prepareSources(
    worldId: string,
    changes: RecordChanges,
    world: WorldState,
  ): PreparedMemorySources {
    const groups = new Map<SourceKind, readonly PreparedSource[]>();
    for (const kind of Object.keys(sourceTables) as SourceKind[])
      groups.set(kind, [...this.sourceRows(worldId, kind, changes)]);
    if (!this.derivedAllowance || this.derivedAllowance.worldId !== worldId)
      throw new Error('Selected memory retention policy is unavailable.');
    return {
      worldId,
      changes,
      groups,
      allowance: this.derivedAllowance,
      versions: this.versionPlans.get(world),
    };
  }
  private *sourceRows(
    worldId: string,
    kind: SourceKind,
    changes: RecordChanges,
  ): Generator<PreparedSource> {
    for (const row of changes.writes.get(sourceTables[kind]) ?? []) {
      const path = JSON.parse(row.id) as string[];
      const actorId = kind === 'memory' ? path[2]! : path[3]!;
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
      const originals =
        kind === 'summary'
          ? manifest!.observations
          : [
              ...((value as unknown as Awareness).observation
                ? [(value as unknown as Awareness).observation!]
                : []),
              ...((value as unknown as Awareness).observations ?? []),
              ...(kind === 'memory' && evidence?.observation ? [evidence.observation] : []),
              ...(kind === 'memory' ? (evidence?.observations ?? []) : []),
              ...(kind === 'memory' ? (manifest?.observations ?? []) : []),
            ];
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
        value[kind === 'memory' ? 'summary' : 'text'] ?? '',
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
          part === null ? index < 6 || index === sourceColumnNames.length : typeof part !== 'string'
        )
          throw new Error('Invalid text memory source projection.');
      }
      if (kind === 'awareness') validateEventEvidence(value);
      const learning = [
        ...recognitionSupportSources(evidence?.recognition?.learningSupport ?? []),
        ...observationLearningSources(originals),
      ];
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
      ...sourceColumnNames,
      'search_text',
      'linguistic',
      'payload_bytes',
      'retention_class',
    ];
    const repository = this;
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      // Complete restores stream rows rather than allocating a second complete source set.
      const writes = () =>
        prepared?.groups.get(kind) ?? repository.sourceRows(worldId, kind, changes);
      if (kind === 'summary') {
        function* summaryLinks() {
          for (const entry of writes()) {
            const manifest = entry.manifest!;
            const manifestKey = digest(manifest.coverageKey);
            const personal = function* (sources: readonly PersonalSourceRef[], supportKey: string) {
              const indexedKey = digest(supportKey);
              for (const source of sources)
                yield [
                  worldId,
                  entry.actorId,
                  kind,
                  entry.id,
                  source.kind,
                  source.id,
                  source.revision,
                  indexedKey,
                  -1,
                  -1,
                  '',
                ];
            };
            yield* personal(entry.sources, 'derivation');
            yield* personal(manifest.coverage, manifest.coverageKey);
            for (const group of manifest.speech) yield* personal(group.sources, group.supportKey);
            for (const dependency of observationDependencies(manifest.observations)) {
              const source = dependency.source;
              if (source.observer.actorId !== entry.actorId)
                throw new Error('Remembered native support belongs to another observer.');
              for (const alias of dependency.aliases.length ? dependency.aliases : [''])
                yield [
                  worldId,
                  entry.actorId,
                  kind,
                  entry.id,
                  source.family,
                  source.id,
                  JSON.stringify(source.revision),
                  manifestKey,
                  source.observer.physicalLife,
                  dependency.ordinal ?? -1,
                  alias,
                ];
            }
          }
        }
        await insertRows(
          this.db,
          'mind_source_dependencies',
          summaryLinks(),
          'ON CONFLICT DO NOTHING',
        );
      }
      if (kind === 'memory') {
        const links: unknown[][] = [];
        for (const entry of writes()) {
          const memory = JSON.parse(entry.row.payload) as MemoryRecord;
          for (const dependency of memory.impression?.dependencies ?? []) {
            if ('kind' in dependency)
              links.push([
                worldId,
                entry.actorId,
                kind,
                entry.id,
                dependency.kind,
                dependency.id,
                dependency.revision,
                digest('impression-origin'),
                -1,
                -1,
                '',
              ]);
            else
              for (const alias of dependency.aliases.length ? dependency.aliases : [''])
                links.push([
                  worldId,
                  entry.actorId,
                  kind,
                  entry.id,
                  dependency.source.family,
                  dependency.source.id,
                  JSON.stringify(dependency.source.revision),
                  digest('impression-origin'),
                  dependency.source.observer.physicalLife,
                  dependency.ordinal ?? -1,
                  alias,
                ]);
          }
        }
        await insertRows(this.db, 'mind_source_dependencies', links, 'ON CONFLICT DO NOTHING');
      }
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
          for (const entry of batch) {
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
                const revision = revisions.get(
                  JSON.stringify([entry.actorId, source.kind, source.id]),
                );
                if (!revision)
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
        const projection = columns.map((name) =>
          name === 'eligible'
            ? `CASE WHEN ${this.sourceEligibility} THEN 1 ELSE 0 END`
            : `r.${name}`,
        );
        const pending = await this.db
          .prepare(
            `WITH changed AS (INSERT INTO recall_sources(${columns.join(',')})
            SELECT ${projection.join(',')} FROM jsonb_populate_recordset(NULL::recall_sources,?::jsonb) AS r
            RETURNING world_id,actor_id,id,source_kind,revision) ${this.lexical.enqueueSql('changed', false)}`,
          )
          .get(batch);
        await this.lexical.admit(pending);
      }
      // Exact original capsules under each source replace an unindexed JSON array.
      // Deleting/replacing its source cascades; eligibility/revision remain owned by
      // recall_sources and are checked in the same read snapshot. No second knowledge store.
      function* placeRows() {
        for (const entry of writes())
          for (const capsule of entry.places) {
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
              span.from,
              span.through,
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
      for (const row of supportWrites) {
        const support = JSON.parse(row.payload) as TemporalSupportCapsule;
        for (const capsule of temporalKnownPlaceCapsules(support.receipt.actorId, support))
          rows.push([
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
          ]);
      }
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
      const cte = `WITH changed(actor_id,id,fresh_kind) AS (VALUES ${pairs.map(() => '(?,?,?::text)').join(',')}),
        affected AS MATERIALIZED (SELECT actor_id,id FROM changed WHERE fresh_kind IS NULL
          UNION SELECT r.actor_id,r.id FROM changed c CROSS JOIN recall_sources r
            WHERE r.world_id=? AND r.actor_id=c.actor_id
            AND (r.event_id=c.id OR (c.fresh_kind IS NOT NULL AND r.id=c.id AND r.source_kind<>c.fresh_kind))
            AND NOT (c.fresh_kind IS NOT NULL AND r.id=c.id AND r.source_kind=c.fresh_kind)
          UNION SELECT s.actor_id,s.derived_id FROM changed c CROSS JOIN mind_source_dependencies s WHERE s.world_id=? AND s.actor_id=c.actor_id AND (s.source_id=c.id OR s.alias_id=c.id))`;
      const params = [...pairs.flat(), worldId, worldId, worldId, worldId];
      const target = '(r.actor_id,r.id) IN (SELECT actor_id,id FROM affected)';

      // New sources already have exact insertion-time eligibility in this transaction.
      // Only that family skips previous-version cleanup; linked episodes/summaries
      // and an ID shared with another family remain on the complete path.
      // One snapshot computes eligibility and the wanted queue for this affected set.
      // DML CTEs cannot read one another's table updates: all consumers use `desired`,
      // including removed sources. Queue delete/upsert sets are deliberately disjoint.
      // docs/architecture.md#performance-critical-path
      await this.db
        .prepare(
          `${cte}, desired AS MATERIALIZED (
          SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,r.importance,r.at,
            CASE WHEN ${this.sourceEligibility} THEN 1 ELSE 0 END AS next_eligible
          FROM recall_sources r WHERE r.world_id=? AND ${target}
          UNION ALL
          SELECT r.world_id,r.actor_id,r.id,r.source_kind,r.revision,r.importance,r.at,r.eligible AS next_eligible
          FROM changed c JOIN recall_sources r ON r.actor_id=c.actor_id AND r.id=c.id AND r.source_kind=c.fresh_kind
          WHERE r.world_id=? AND c.fresh_kind IS NOT NULL AND NOT EXISTS (SELECT 1 FROM affected a WHERE a.actor_id=c.actor_id AND a.id=c.id)
        ), updated AS (
          UPDATE recall_sources r SET eligible=d.next_eligible FROM desired d
          WHERE r.world_id=d.world_id AND r.actor_id=d.actor_id AND r.id=d.id AND r.source_kind=d.source_kind
          AND r.eligible<>d.next_eligible
        ), discarded_vectors AS (
          DELETE FROM memory_vectors v WHERE v.world_id=? AND (v.actor_id,v.source_id) IN (SELECT actor_id,id FROM affected)
          AND NOT EXISTS (SELECT 1 FROM desired d WHERE d.actor_id=v.actor_id AND d.id=v.source_id AND d.revision=v.source_revision AND d.next_eligible=1)
        ), wanted AS MATERIALIZED (
          SELECT r.world_id,r.actor_id,r.id AS source_id,r.revision AS source_revision,m.model,m.dimensions,r.importance,r.at
          FROM desired r JOIN memory_index_models m ON m.world_id=r.world_id AND m.actor_id=r.actor_id
          WHERE r.next_eligible=1
          AND NOT EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=r.world_id AND v.actor_id=r.actor_id AND v.source_id=r.id AND v.source_revision=r.revision AND v.model=m.model AND v.dimensions=m.dimensions)
          AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=m.model AND a.dimensions=m.dimensions)
        ), discarded_queue AS (
          DELETE FROM memory_index_queue q WHERE q.world_id=? AND (q.actor_id,q.source_id) IN (SELECT actor_id,id FROM affected)
          AND NOT EXISTS (SELECT 1 FROM wanted w WHERE w.actor_id=q.actor_id AND w.source_id=q.source_id AND w.model=q.model AND w.dimensions=q.dimensions)
        ) INSERT INTO memory_index_queue SELECT * FROM wanted
        ON CONFLICT (world_id,actor_id,source_id,model,dimensions) DO UPDATE
        SET source_revision=excluded.source_revision,importance=excluded.importance,at=excluded.at
        WHERE (memory_index_queue.source_revision,memory_index_queue.importance,memory_index_queue.at)
          IS DISTINCT FROM (excluded.source_revision,excluded.importance,excluded.at)`,
        )
        .run(...params, worldId, worldId);
    }
    await this.trimDerived(worldId, changes.keys());
  }

  /** Seek the next eligible place through the source-owned capsule index. Each place
   * retains its newest valid original, even when a newer account was revoked. Native
   * preparation allows one over-budget sentinel: exhaustion proves completeness;
   * the sentinel refuses preparation rather than publishing a truncated index. */
  private retainedPlaces(
    uncorrected = false,
    range?: { after?: string; placeId?: string; limit?: number },
  ) {
    const selection = (
      afterPrevious = false,
    ) => `SELECT p.world_id,p.actor_id,p.owner_id,p.owner_kind,p.owner_revision,
      p.observed_at,p.observed_order,p.support_record_id,p.place_id AS learned_place_id,p.capsule::jsonb AS capsule,${afterPrevious ? 'previous.place_step+1' : '1'} AS place_step
      FROM recall_place_capsules p CROSS JOIN LATERAL (
        SELECT r.revision,r.eligible FROM recall_sources r WHERE r.world_id=p.world_id AND r.actor_id=p.actor_id
          AND r.id=p.owner_id AND r.source_kind=p.owner_kind
        UNION ALL SELECT s.account_revision AS revision,1::bigint AS eligible FROM mind_temporal_supports s
          WHERE p.owner_kind='support' AND s.world_id=p.world_id AND s.id=p.support_record_id LIMIT 1
      ) admitted
      WHERE admitted.revision=p.owner_revision AND admitted.eligible=1
        AND p.world_id=? AND p.actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=?${range?.after ? ' AND p.place_id>?' : ''}${range?.placeId ? ' AND p.place_id=?' : ''}
        ${afterPrevious ? ' AND p.place_id>previous.learned_place_id AND previous.place_step<?' : ''}
        AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=p.world_id AND f.actor_id=p.actor_id
          AND f.source_id IN (p.source_event_id,p.native_source_id,p.fact_alias))
        ${
          uncorrected
            ? `AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=p.world_id AND c.actor_id=p.actor_id
          AND c.source_id IN (p.source_event_id,p.native_source_id,p.fact_alias))`
            : ''
        }`;
    const order =
      'p.place_id,p.observed_at DESC,p.observed_order DESC,p.owner_id DESC,p.owner_kind DESC';
    return `WITH RECURSIVE retained_places AS (
      (${selection()} ORDER BY ${order} LIMIT 1)
      UNION ALL SELECT following.* FROM retained_places previous CROSS JOIN LATERAL (
        ${selection(true)} ORDER BY ${order} LIMIT 1
      ) following
    )`;
  }
  private placeParams(
    scope: MemoryScope,
    range?: { after?: string; placeId?: string; limit?: number },
  ) {
    const params = [
      ...this.params(scope),
      ...(range?.after ? [range.after] : []),
      ...(range?.placeId ? [range.placeId] : []),
    ];
    return [...params, ...params, range?.limit ?? RETRIEVAL_ROWS + 1];
  }
  /** Native preparation is complete or explicitly refused. The source projection retains
   * only the observed place capsule, so this reads no autobiography or live place body.
   * This exceptional activation work is never performed by a hearing callback or cut. */
  async prepareKnownPlaceEvidence(scope: MemoryScope) {
    return this.snapshot(async () => {
      const head = await this.db.prepare('SELECT generation FROM world_head WHERE id=1').get();
      if (head?.['generation'] !== scope.generation) throw new MemoryPreparationError();
      const size = await this.db
        .prepare(
          `${this.retainedPlaces(true)} SELECT COUNT(*) AS count,COALESCE(SUM(octet_length(p.capsule::text)),0) AS bytes FROM retained_places p`,
        )
        .get(...this.placeParams(scope));
      if (
        Number(size?.['count'] ?? 0) > RETRIEVAL_ROWS ||
        Number(size?.['bytes'] ?? 0) > RETRIEVAL_BYTES
      )
        throw new MemoryPreparationError();
      const rows = await this.db
        .prepare(
          `${this.retainedPlaces(true)} SELECT p.owner_id AS id,p.owner_kind AS source_kind,p.owner_revision AS revision,p.capsule::text AS place_capsule FROM retained_places p ORDER BY p.learned_place_id`,
        )
        .all(...this.placeParams(scope));
      if (rows.length !== Number(size?.['count'] ?? 0)) throw new MemoryPreparationError();
      const capsules = rows.map((row) => {
        if (typeof row['place_capsule'] !== 'string') throw new MemoryPreparationError();
        const capsule = JSON.parse(row['place_capsule']) as KnownPlaceCapsule;
        if (
          row['source_kind'] !== 'support' &&
          (!capsule.personalSource ||
            capsule.personalSource.kind !== row['source_kind'] ||
            capsule.personalSource.id !== row['id'] ||
            capsule.personalSource.revision !== row['revision'])
        )
          throw new MemoryPreparationError();
        return capsule;
      });
      return prepareKnownPlaceEvidence(capsules);
    });
  }
  /** One current retained observation per place. Filter a bounded metadata window before
   * hydration; continuation reaches every known place regardless of total history. */
  async knownPlaces(
    scope: MemoryScope,
    options: { after?: string; terms?: string[]; placeId?: string; limit: number; scan: number },
  ) {
    type PlaceRow = Record<string, unknown> & {
      capsule: KnownPlaceCapsule;
      correction_id?: string;
      correction_source?: Record<string, unknown>;
    };
    // Keep table-estimate errors from multiplying whole-actor joins. Read the
    // bounded page, then batch its correction metadata in the same snapshot.
    // Selected correction metadata is reused for body hydration.
    // docs/limits/spatial.md#sp08--static-named-places-and-private-known-places
    const rowsAfter = async (after: string | undefined, count: number): Promise<PlaceRow[]> => {
      const range = { after, placeId: options.placeId, limit: count };
      const rows = await this.db
        .prepare(
          `${this.retainedPlaces(false, range)} SELECT ${sourceColumns},r.search_text,
            p.capsule::text AS selected_place_capsule,p.learned_place_id AS selected_place_id
          FROM retained_places p CROSS JOIN LATERAL (
            SELECT ${sourceColumns},${this.sourceTextSql()} AS search_text FROM recall_sources r WHERE r.world_id=p.world_id AND r.actor_id=p.actor_id
              AND r.id=p.owner_id AND r.source_kind=p.owner_kind
            UNION ALL SELECT s.world_id,s.actor_id,p.owner_id AS id,'support' AS source_kind,s.id AS record_id,s.account_revision AS revision,
              NULL::text AS event_id,'belief' AS memory_kind,'observed' AS acquisition,NULL::text AS event_type,
              p.observed_at AS at,0::double precision AS importance,0::bigint AS required,1::bigint AS eligible,0::bigint AS sequence,COALESCE((SELECT v->'exposure'->>'description' FROM jsonb_array_elements(s.payload::jsonb->'values') v WHERE v->>'kind'='encounter-exposure' AND v->'exposure'->>'id'=p.learned_place_id LIMIT 1),'') AS search_text
              FROM mind_temporal_supports s WHERE p.owner_kind='support' AND s.world_id=p.world_id AND s.id=p.support_record_id LIMIT 1
          ) r WHERE r.revision=p.owner_revision ORDER BY p.learned_place_id LIMIT ?`,
        )
        .all(...this.placeParams(scope, range), count);
      const places: PlaceRow[] = rows.map((row) => {
        if (typeof row['selected_place_capsule'] !== 'string') throw new MemoryPreparationError();
        const capsule = JSON.parse(row['selected_place_capsule']) as KnownPlaceCapsule;
        if (
          row['source_kind'] !== 'support' &&
          (!capsule.personalSource ||
            capsule.personalSource.kind !== row['source_kind'] ||
            capsule.personalSource.id !== row['id'] ||
            capsule.personalSource.revision !== row['revision'])
        )
          throw new MemoryPreparationError();
        return {
          ...row,
          place_id: row['selected_place_id'],
          place_label: capsule.label,
          capsule,
          search_text: `${capsule.label} ${row['search_text']}`,
        };
      });
      if (!places.length) return places;
      const corrections = await this.db
        .prepare(
          `SELECT source_id,correction_id FROM mind_corrections
        WHERE world_id=? AND actor_id=? AND source_id IN (${rows.map(() => '?').join(',')})`,
        )
        .all(scope.worldId, scope.actorId, ...places.map((row) => row.capsule.sourceEventId));
      if (!corrections.length) return places;
      const correctionIds = [...new Set(corrections.map((row) => String(row['correction_id'])))];
      const correctionSources = await this.db
        .prepare(
          `SELECT ${sourceColumns},r.search_text FROM recall_sources r
        WHERE ${this.eligible} AND r.source_kind='awareness' AND r.id IN (${correctionIds.map(() => '?').join(',')})`,
        )
        .all(...this.params(scope), ...correctionIds);
      const byId = new Map(correctionSources.map((row) => [String(row['id']), row])),
        bySource = new Map(
          corrections.map((row) => [String(row['source_id']), String(row['correction_id'])]),
        );
      return places.map((row) => {
        const id = bySource.get(row.capsule.sourceEventId!);
        if (!id) return row;
        const correction = byId.get(id);
        return {
          ...row,
          correction_id: id,
          correction_source: correction,
          search_text: `${row['place_label']} Corrected observation ${
            correction?.['search_text'] ??
            'This observation was corrected. Its original description is no longer established information.'
          }`,
        };
      });
    };
    return this.snapshot(async () => {
      const result = options.terms
        ? await scanMatches<PlaceRow>(
            (row, count) => rowsAfter(row ? String(row['place_id']) : options.after, count),
            (row) => matchesSearch(options.terms!, String(row['search_text'])),
            options.limit,
            options.scan,
          )
        : {
            matched: await rowsAfter(options.after, options.limit + 1),
            last: undefined,
            scanLimited: false,
          };
      const page = result.matched.slice(0, options.limit);
      const hydrated = await this.hydrate([
        ...new Map(
          page
            .filter((row) => row['source_kind'] !== 'support')
            .map((row) => [sourceKey(String(row['source_kind']), String(row['id'])), row]),
        ).values(),
      ]);
      const correctionRows = new Map<string, Record<string, unknown>>();
      for (const row of page) {
        if (row.correction_source)
          correctionRows.set(String(row.correction_source['id']), row.correction_source);
      }
      const correctionBodies = await this.hydrate([...correctionRows.values()]);
      const retainedBySource = new Map(
        hydrated.map((entry) => {
          const reference = {
            kind: entry.sourceKind,
            id: entry.memory.id,
            revision: entry.revision,
          };
          const original =
            entry.awareness?.exposure?.kind === 'place'
              ? knownPlaceCapsule(entry.awareness, reference)
              : undefined;
          const places =
            original && entry.awareness?.exposure?.kind === 'place'
              ? [{ exposure: entry.awareness.exposure, capsule: original }]
              : retainedPlaceObservations(
                  [
                    ...(entry.memory.manifest?.observations ?? []),
                    ...(entry.memory.observation ? [entry.memory.observation] : []),
                    ...(entry.memory.observations ?? []),
                    ...(entry.memory.evidence?.observation
                      ? [entry.memory.evidence.observation]
                      : []),
                    ...(entry.memory.evidence?.observations ?? []),
                  ],
                  reference,
                );
          return [
            sourceKey(entry.sourceKind, entry.memory.id),
            {
              entry,
              places: new Map(places.map((place) => [canonicalJson(place.capsule), place])),
            },
          ];
        }),
      );
      const supports = new Map<string, TemporalSupportCapsule>();
      const supportIds = page
        .filter((row) => row['source_kind'] === 'support')
        .map((row) => String(row['record_id']));
      if (supportIds.length)
        for (const row of await this.db
          .prepare(
            'SELECT source_id,payload FROM mind_temporal_supports WHERE world_id=? AND actor_id=? AND id=ANY(?::text[])',
          )
          .all(scope.worldId, scope.actorId, supportIds))
          supports.set(
            String(row['source_id']),
            JSON.parse(String(row['payload'])) as TemporalSupportCapsule,
          );
      const entries: KnownPlaceSource[] = page.map((row) => {
        if (row['source_kind'] === 'support') {
          const support = supports.get(String(row['id']));
          if (!support) throw new MemoryPreparationError();
          const capsule = temporalKnownPlaceCapsules(scope.actorId, support).find(
            (candidate) => canonicalJson(candidate) === canonicalJson(row.capsule),
          );
          const exposure = support.values.find(
            (value) =>
              value.kind === 'encounter-exposure' &&
              value.exposure.kind === 'place' &&
              value.exposure.id === capsule?.placeId,
          );
          if (
            !capsule ||
            exposure?.kind !== 'encounter-exposure' ||
            exposure.exposure.kind !== 'place'
          )
            throw new MemoryPreparationError();
          return {
            revision: String(row['revision']),
            memory: {
              id: support.receipt.id,
              actorId: scope.actorId,
              kind: 'belief',
              source: 'observed',
              summary: exposure.exposure.description,
              at: capsule.observedAt,
              entityIds: [],
              importance: 0,
            },
            place: { capsule, exposure: exposure.exposure },
            ...(row.correction_id
              ? {
                  correctionId: row.correction_id,
                  correction: correctionBodies.find((body) => body.memory.id === row.correction_id)
                    ?.memory.summary,
                }
              : {}),
          };
        }
        const retained = retainedBySource.get(
          sourceKey(String(row['source_kind']), String(row['id'])),
        );
        const place = retained?.places.get(canonicalJson(row.capsule));
        if (!retained || !place) throw new MemoryPreparationError();
        const { entry } = retained;
        const id = row.correction_id,
          correction = correctionBodies.find((body) => body.memory.id === id);
        return {
          ...entry,
          place,
          ...(id
            ? { correctionId: id, ...(correction ? { correction: correction.memory.summary } : {}) }
            : {}),
        };
      });
      const after =
        result.matched.length > options.limit
          ? String(page.at(-1)!['place_id'])
          : result.scanLimited && result.last
            ? String(result.last['place_id'])
            : undefined;
      return { entries, after, scanLimited: result.scanLimited };
    });
  }

  private async refreshQueue(worldId: string, actorId: string, ids: Set<string> | null) {
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
  private readonly registeredModels = new Map<string, string>();
  private snapshot<T>(operation: () => Promise<T>): Promise<T> {
    return this.db.readTransaction
      ? this.db.readTransaction(operation)
      : this.db.transaction(operation);
  }
  private eligible = `r.world_id=? AND r.actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=? AND r.eligible=1`;
  // Explicit causes may be finite sensory observations rather than retained
  // memories. Their current-format row and game-time expiry, never optional
  // retrieval/index admission, fence a pending decision's exact evidence.
  private pendingEvidence = `r.world_id=? AND r.actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=?
    AND (r.eligible=1 OR (r.source_kind='awareness' AND r.retention_class='sensory'
      AND EXISTS (SELECT 1 FROM mind_awareness a WHERE a.world_id=r.world_id AND a.id=r.record_id
        AND (a.payload::jsonb->>'expiresAt')::double precision >
          (SELECT (w.payload::jsonb->>'simTime')::double precision FROM world_settings w WHERE w.world_id=r.world_id))
      AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id AND f.actor_id=r.actor_id
        AND (f.source_id=r.id OR f.source_id=r.event_id))))`;
  private sourceEligibility = `r.retention_class='memory' AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=r.world_id AND f.actor_id=r.actor_id AND (f.source_id=r.id OR f.source_id=r.event_id))
    AND (r.source_kind<>'memory' OR ((r.memory_kind='impression' OR r.memory_kind='commitment' OR (r.memory_kind='episode' AND r.acquisition<>'inferred'))
      AND NOT (r.memory_kind='episode' AND r.event_id IS NOT NULL AND EXISTS (SELECT 1 FROM recall_sources a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind='awareness' AND a.id=r.event_id))))
    AND (r.source_kind<>'summary' OR NOT EXISTS (
      SELECT 1 FROM mind_source_dependencies s WHERE s.world_id=r.world_id AND s.actor_id=r.actor_id AND s.derived_kind=r.source_kind AND s.derived_id=r.id AND
      (EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=s.world_id AND f.actor_id=s.actor_id AND (f.source_id=s.source_id OR f.source_id=s.alias_id))
       OR EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=s.world_id AND c.actor_id=s.actor_id AND (c.source_id=s.source_id OR c.source_id=s.alias_id)))))`;
  private params(scope: MemoryScope) {
    return [scope.worldId, scope.actorId, scope.generation];
  }
  /** SQL counterpart of hasLinguisticSpeech: no-word cues remain recallable evidence,
   * but cannot crowd the automatic dialogue or protected verbatim pool. */
  private get linguisticSpeech(): string {
    return "a.payload::jsonb->'speech'->>'intelligibility' IN ('partial','clear') AND a.payload::jsonb->'speech'->>'perception'<>'seen'";
  }
  async context(
    scope: MemoryScope,
    requiredIds: string[],
    includeConversation: boolean,
    maxBytes = RETRIEVAL_BYTES,
  ) {
    return this.snapshot(async () => {
      // Reconsideration uses all perceived events, including physical danger. The
      // optional linguistic suffix is not the actor's complete observation frontier.
      const watermark = await this.db
        .prepare(
          'SELECT MAX(sequence) AS sequence FROM mind_awareness WHERE world_id=? AND actor_id=? AND (SELECT generation FROM world_head WHERE id=1)=?',
        )
        .get(...this.params(scope));
      const selected = includeConversation
        ? await this.conversationSources(scope, maxBytes)
        : { sources: [], more: false };
      const required = new Set(requiredIds);
      return {
        sequence: Number(watermark?.['sequence'] ?? 0),
        ...selected,
        conversationIds: selected.sources
          .map((source) => source.id)
          .filter((id) => !required.has(id)),
      };
    });
  }
  /** Actor/order metadata only. Stop at the first excluded complete source, keeping
   * a contiguous suffix and one continuation witness without a lifetime count/body scan. */
  async conversationSources(
    scope: MemoryScope,
    maxBytes = RETRIEVAL_BYTES,
  ): Promise<{ sources: ConversationSource[]; more: boolean }> {
    const sources: ConversationSource[] = [];
    let bytes = 0,
      before: { sequence: number; id: string } | undefined;
    for (;;) {
      const limit = Math.min(128, RETRIEVAL_ROWS + 1 - sources.length);
      const rows = await this.db
        .prepare(
          `SELECT r.id,r.revision,r.sequence,r.payload_bytes,
          (SELECT c.payload FROM mind_corrections c WHERE c.world_id=r.world_id AND c.actor_id=r.actor_id AND c.source_id=r.id) AS correction
        FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='awareness' AND r.linguistic=1
          ${before ? 'AND (r.sequence,r.id)<(?,?)' : ''}
        ORDER BY r.sequence DESC,r.id DESC LIMIT ?`,
        )
        .all(...this.params(scope), ...(before ? [before.sequence, before.id] : []), limit);
      for (const row of rows) {
        const size = Number(row['payload_bytes']);
        if (sources.length === RETRIEVAL_ROWS || bytes + size > Math.min(maxBytes, RETRIEVAL_BYTES))
          return { sources: sources.reverse(), more: true };
        bytes += size;
        sources.push({
          id: String(row['id']),
          revision: String(row['revision']),
          sequence: Number(row['sequence']),
          correction: String(row['correction'] ?? ''),
          bodyBytes: size,
        });
      }
      if (rows.length < limit) return { sources: sources.reverse(), more: false };
      const last = sources.at(-1)!;
      before = { sequence: last.sequence, id: last.id };
    }
  }
  /** Derived speech may keep exact retired observer originals. A changed current
   * record, correction, forgetting or generation never validates an older cache. */
  async currentCompactionSources(scope: MemoryScope, sources: PersonalSourceRef[]) {
    if (sources.length > RETRIEVAL_ROWS) return false;
    let matched = 0;
    for (let offset = 0; offset < sources.length; offset += 300) {
      const rows = await this.db
        .prepare(
          `SELECT q.id FROM jsonb_to_recordset(?::jsonb) AS q(kind TEXT,id TEXT,revision TEXT)
        LEFT JOIN recall_sources r ON r.world_id=? AND r.actor_id=? AND r.source_kind=q.kind AND r.id=q.id
        WHERE (SELECT generation FROM world_head WHERE id=1)=?
          AND (r.revision=q.revision OR (r.id IS NULL AND EXISTS (
            SELECT 1 FROM mind_source_versions v WHERE v.world_id=? AND v.actor_id=?
              AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision)))
          AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=? AND f.actor_id=? AND f.source_id=q.id)
          AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=? AND c.actor_id=? AND c.source_id=q.id)`,
        )
        .all(
          JSON.stringify(sources.slice(offset, offset + 300)),
          scope.worldId,
          scope.actorId,
          scope.generation,
          scope.worldId,
          scope.actorId,
          scope.worldId,
          scope.actorId,
          scope.worldId,
          scope.actorId,
        );
      matched += rows.length;
    }
    return matched === sources.length;
  }
  /** Publish against exact selected sources and coverage. Later unrelated speech
   * may append without invalidating this actor-owned derived artifact. */
  async publishConversationCompaction(
    scope: MemoryScope,
    sources: ConversationSource[],
    coverage: PersonalSourceRef[],
    expected: unknown,
    value: unknown,
    assertCurrent: () => void,
  ): Promise<void> {
    const key = conversationCompactionKey(scope.worldId, scope.actorId);
    await this.db.transaction(async () => {
      // Serialize with gameplay commits, including restore, with the PostgreSQL writer.
      const head = await this.db
        .prepare(
          'UPDATE world_head SET generation=generation WHERE id=1 AND world_id=? AND generation=? RETURNING generation',
        )
        .get(scope.worldId, scope.generation);
      if (!head) throw new Error('Conversation compaction generation changed.');
      assertCurrent();
      if (
        !(await this.current(
          scope,
          sources.map((source) => ({
            id: source.id,
            sourceKind: 'awareness' as const,
            revision: source.revision,
          })),
        ))
      )
        throw new Error('Conversation compaction sources changed.');
      if (!(await this.currentCompactionSources(scope, coverage)))
        throw new Error('Compacted speech coverage changed.');
      const stored = await this.db
        .prepare('SELECT value FROM meta WHERE key=?')
        .get(`integration:${key}`);
      if (stored?.['value'] !== (expected === undefined ? undefined : JSON.stringify(expected)))
        throw new Error('Conversation compaction was superseded.');
      await this.db
        .prepare(
          'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
        )
        .run(`integration:${key}`, JSON.stringify(value));
      // Abort or disclosure changes while waiting for SQL must roll this write back.
      assertCurrent();
    });
  }
  async invalidateConversationCompactions(worldId: string, actorId?: string): Promise<void> {
    const prefix = `integration:conversation-compaction:${JSON.stringify(actorId ? [worldId, actorId] : [worldId]).slice(0, -1)}${actorId ? ']' : ','}`;
    await this.db
      .prepare('DELETE FROM meta WHERE substr(key,1,?)=?')
      .run([...prefix].length, prefix);
  }
  async entry(scope: MemoryScope, key: string): Promise<ExperienceEntry | undefined> {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    if (!Object.hasOwn(sourceTables, kind)) return undefined;
    const table = sourceTables[kind as SourceKind];
    const row = await this.db
      .prepare(
        `SELECT payload FROM ${table} WHERE world_id=? AND actor_id=? AND source_id=?
      AND (SELECT generation FROM world_head WHERE id=1)=?`,
      )
      .get(scope.worldId, scope.actorId, key.slice(separator + 1), scope.generation);
    return row
      ? decodeMemorySource(kind as SourceKind, String(row['payload']), scope.actorId)
      : undefined;
  }
  async page(
    scope: MemoryScope,
    before?: string,
    selection?: { source: SourceKind; limit: number },
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    return this.snapshot(() => this.readPage(scope, before, selection));
  }
  private async readPage(
    scope: MemoryScope,
    before?: string,
    selection?: { source: SourceKind; limit: number },
  ): Promise<{ entries: ExperienceEntry[]; more: boolean } | undefined> {
    const limit = selection?.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error('Invalid memory page size.');
    const cursor = before ? await this.entry(scope, before) : undefined;
    if (before && (!cursor || (selection && cursor.source !== selection.source))) return undefined;
    const time = cursor
      ? cursor.source === 'summary'
        ? cursor.value.to
        : cursor.value.at
      : undefined;
    const params: unknown[] = [];
    const queries = Object.entries(sourceTables)
      .filter(([kind]) => !selection || kind === selection.source)
      .map(([kind, table], index) => {
        params.push(scope.worldId, scope.actorId, ...(cursor ? [time, time, time, before] : []));
        return `SELECT * FROM (SELECT '${kind}' AS source,'${kind}:' || source_id AS key,at,payload FROM ${table}
        WHERE world_id=? AND actor_id=?${cursor ? ` AND at<=? AND (at<? OR (at=? AND '${kind}:' || source_id>?))` : ''}
        ORDER BY at DESC,source_id LIMIT ${limit + 1}) AS family${index}`;
      });
    const rows = await this.db
      .prepare(
        `SELECT * FROM (${queries.join(' UNION ALL ')}) AS sources
      WHERE (SELECT generation FROM world_head WHERE id=1)=? ORDER BY at DESC,key LIMIT ${limit + 1}`,
      )
      .all(...params, scope.generation);
    return {
      entries: rows
        .slice(0, limit)
        .map((row) =>
          decodeMemorySource(row['source'] as SourceKind, String(row['payload']), scope.actorId),
        ),
      more: rows.length > limit,
    };
  }
  /** Optional policy-owned metadata. No classifier or importance/retention rule lives
   * here; callers supply a namespace, exact source version and expected annotation revision.
   */
  async annotate(
    scope: MemoryScope,
    source: { kind: SourceKind; id: string; revision: string },
    namespace: string,
    expectedRevision: number,
    value: unknown,
  ): Promise<number> {
    if (
      !/^[a-z][a-z0-9._-]{0,63}$/.test(namespace) ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    )
      throw new Error('Invalid annotation identity.');
    const payload = JSON.stringify(z.json().parse(value));
    return this.db.transaction(async () => {
      const row = await this.db
        .prepare(
          `INSERT INTO mind_source_annotations
      SELECT r.world_id,r.actor_id,r.source_kind,r.id,r.revision,?,1,? FROM recall_sources r
      WHERE r.world_id=? AND r.actor_id=? AND r.source_kind=? AND r.id=? AND r.revision=?
      AND (SELECT generation FROM world_head WHERE id=1)=?
      AND (?=0 OR EXISTS (SELECT 1 FROM mind_source_annotations a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id AND a.source_kind=r.source_kind AND a.source_id=r.id AND a.source_revision=r.revision AND a.namespace=?))
      ON CONFLICT(world_id,actor_id,source_kind,source_id,source_revision,namespace)
      DO UPDATE SET revision=mind_source_annotations.revision+1,payload=excluded.payload WHERE mind_source_annotations.revision=? RETURNING revision`,
        )
        .get(
          namespace,
          payload,
          scope.worldId,
          scope.actorId,
          source.kind,
          source.id,
          source.revision,
          scope.generation,
          expectedRevision,
          namespace,
          expectedRevision,
        );
      if (!row) throw new Error('Source or annotation changed; refresh before editing.');
      await this.trimDerived(scope.worldId, [scope.actorId]);
      return Number(row['revision']);
    });
  }
  async annotations(
    scope: MemoryScope,
    source: { kind: SourceKind; id: string; revision: string },
  ) {
    const rows = await this.db
      .prepare(
        `SELECT a.namespace,a.revision,a.payload FROM mind_source_annotations a
      JOIN recall_sources r ON r.world_id=a.world_id AND r.actor_id=a.actor_id AND r.source_kind=a.source_kind AND r.id=a.source_id AND r.revision=a.source_revision
      WHERE r.world_id=? AND r.actor_id=? AND r.source_kind=? AND r.id=? AND r.revision=? AND (SELECT generation FROM world_head WHERE id=1)=? ORDER BY a.namespace`,
      )
      .all(scope.worldId, scope.actorId, source.kind, source.id, source.revision, scope.generation);
    return rows.map((row) => ({
      namespace: String(row['namespace']),
      revision: Number(row['revision']),
      value: JSON.parse(String(row['payload'])) as unknown,
    }));
  }
  async commitments(scope: MemoryScope): Promise<RetrievedMemory[]> {
    return this.snapshot(async () =>
      this.hydrate(
        await this.db
          .prepare(
            `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.source_kind='memory' AND r.memory_kind='commitment' ORDER BY r.at,r.id LIMIT ${RETRIEVAL_ROWS + 1}`,
          )
          .all(...this.params(scope)),
      ),
    );
  }
  /** Resolved (kept or cancelled) eligible commitments, newest spoken first, for the owner's
   * promise list. Reads the partial commitment index; open obligations stay resident.
   * docs/projects/readable-promises-tech-design.md#3-algorithm-appsserversrccommitment-viewts */
  async resolvedCommitments(
    scope: MemoryScope,
    before: { at: number; id: string } | undefined,
    limit: number,
  ): Promise<{ entries: RetrievedMemory[]; next?: { at: number; id: string } }> {
    return this.snapshot(async () => {
      const rows = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible}
          AND r.source_kind='memory' AND r.memory_kind='commitment' AND r.required=0
          ${before ? 'AND (r.at,r.id)<(?,?)' : ''} ORDER BY r.at DESC,r.id DESC LIMIT ?`,
        )
        .all(...this.params(scope), ...(before ? [before.at, before.id] : []), limit + 1);
      const page = rows.slice(0, limit);
      const entries = (await this.hydrate(page)).sort(
        (a, b) => b.memory.at - a.memory.at || (a.memory.id < b.memory.id ? 1 : -1),
      );
      const last = page.at(-1);
      return rows.length > limit && last
        ? { entries, next: { at: Number(last['at']), id: String(last['id']) } }
        : { entries };
    });
  }
  private sourceTextSql(alias = 'r'): string {
    return `COALESCE(NULLIF(${alias}.search_text,''),CASE ${alias}.source_kind
      WHEN 'memory' THEN (SELECT m.payload::jsonb->>'summary' FROM mind_memories m WHERE m.world_id=${alias}.world_id AND m.actor_id=${alias}.actor_id AND m.id=${alias}.record_id)
      WHEN 'summary' THEN (SELECT m.payload::jsonb->>'text' FROM mind_summaries m WHERE m.world_id=${alias}.world_id AND m.actor_id=${alias}.actor_id AND m.id=${alias}.record_id)
      WHEN 'awareness' THEN (SELECT m.payload::jsonb->>'text' FROM mind_awareness m WHERE m.world_id=${alias}.world_id AND m.actor_id=${alias}.actor_id AND m.id=${alias}.record_id) END,'')`;
  }
  /** Read-only owner/inspector browse, newest first by (time, id, source kind). A search or
   * the private-thoughts filter examines at most `scan` eligible rows and matches only
   * `search_text`, the text the viewer is shown; `resume` then continues after the last row
   * examined. docs/limits/memory.md#mh08 */
  async browse(
    scope: MemoryScope,
    options: {
      before?: { at: number; id: string; kind: string };
      terms?: string[];
      thoughts?: boolean;
      limit: number;
      scan: number;
    },
  ): Promise<{
    entries: RetrievedMemory[];
    resume?: { at: number; id: string; kind: string };
    scanLimited: boolean;
  }> {
    type Row = Record<string, unknown>;
    const { terms, thoughts, limit } = options;
    const position = (row: Row) => ({
      at: Number(row['at']),
      id: String(row['id']),
      kind: String(row['source_kind']),
    });
    const rowsBefore = (
      before: { at: number; id: string; kind: string } | undefined,
      count: number,
    ) =>
      this.db
        .prepare(
          `SELECT ${sourceColumns}${terms ? ',' + this.sourceTextSql() + ' AS search_text' : ''} FROM recall_sources r
          WHERE ${this.eligible}${before ? ' AND (r.at,r.id,r.source_kind)<(?,?,?)' : ''}
          ORDER BY r.at DESC,r.id DESC,r.source_kind DESC LIMIT ?`,
        )
        .all(...this.params(scope), ...(before ? [before.at, before.id, before.kind] : []), count);
    return this.snapshot(async () => {
      // Plain browsing reads one page; filters scan a bounded window instead of walking an
      // unindexed condition through the whole history.
      const { matched, last, scanLimited } =
        terms || thoughts
          ? await scanMatches<Row>(
              (after, count) => rowsBefore(after ? position(after) : options.before, count),
              (row) =>
                (!thoughts ||
                  (row['source_kind'] === 'memory' && row['acquisition'] === 'self_thought')) &&
                (!terms || matchesSearch(terms, String(row['search_text'] ?? ''))),
              limit,
              options.scan,
            )
          : {
              matched: await rowsBefore(options.before, limit + 1),
              last: undefined,
              scanLimited: false,
            };
      const page = matched.slice(0, limit);
      const entries = (await this.hydrate(page)).sort(
        (a, b) =>
          b.memory.at - a.memory.at ||
          (a.memory.id < b.memory.id ? 1 : a.memory.id > b.memory.id ? -1 : 0) ||
          (a.sourceKind < b.sourceKind ? 1 : a.sourceKind > b.sourceKind ? -1 : 0),
      );
      if (matched.length > limit)
        return { entries, resume: position(page.at(-1)!), scanLimited: false };
      if (scanLimited && last) return { entries, resume: position(last), scanLimited: true };
      return { entries, scanLimited: false };
    });
  }
  /** Indexed scheduling facts only; a wakeup must not reconstruct an actor's past. */
  async maintenanceStatus(scope: Pick<MemoryScope, 'worldId' | 'actorId'>, simTime: number) {
    const cutoff = simTime - EXPERIENCE_LIMITS.rawHours * 3600;
    // One statement supplies one coherent snapshot and avoids five round trips per mind.
    const row = await this.db
      .prepare(
        `SELECT
      CASE WHEN EXISTS (SELECT 1 FROM recall_sources r WHERE r.world_id=? AND r.actor_id=? AND r.eligible=1) THEN 1 ELSE 0 END AS memories,
      CASE WHEN EXISTS (SELECT 1 FROM recall_sources WHERE world_id=? AND actor_id=? AND eligible=1 AND source_kind='awareness' AND importance<${EXPERIENCE_LIMITS.protectedImportance} AND at<=?)
        OR EXISTS (SELECT 1 FROM recall_sources WHERE world_id=? AND actor_id=? AND eligible=1 AND source_kind='memory' AND memory_kind='episode' AND importance<${EXPERIENCE_LIMITS.protectedImportance} AND at<=?) THEN 1 ELSE 0 END AS due,
      CASE WHEN EXISTS (SELECT 1 FROM recall_sources WHERE world_id=? AND actor_id=? AND eligible=1 AND source_kind='awareness' AND importance<${EXPERIENCE_LIMITS.protectedImportance} LIMIT 1 OFFSET ?)
        OR EXISTS (SELECT 1 FROM recall_sources WHERE world_id=? AND actor_id=? AND eligible=1 AND source_kind='memory' AND memory_kind='episode' AND importance<${EXPERIENCE_LIMITS.protectedImportance} LIMIT 1 OFFSET ?) THEN 1 ELSE 0 END AS pressure`,
      )
      .get(
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
        cutoff,
        scope.worldId,
        scope.actorId,
        cutoff,
        scope.worldId,
        scope.actorId,
        EXPERIENCE_LIMITS.consolidationPressure - 1,
        scope.worldId,
        scope.actorId,
        EXPERIENCE_LIMITS.consolidationPressure + 15,
      );
    return {
      hasMemories: Number(row?.['memories']) === 1,
      rawDue: Number(row?.['due']) === 1,
      pressure: Number(row?.['pressure']) === 1,
    };
  }
  /** A bounded chronological prefix, never a truncated claim about the whole backlog.
   * Daily cursors exclude summaries written by earlier partitions of this review.
   * docs/memory-architecture.md#6-hourly-consolidation-and-six-hour-raw-recall
   */
  async maintenanceBatch(
    scope: MemoryScope,
    simTime: number,
    mode: ConsolidationBatch['mode'],
    review?: {
      day: number;
      throughRevision?: number;
      after?: { at: number; sequence: number; id: string };
    },
  ): Promise<ConsolidationBatch | null> {
    return this.snapshot(async () => {
      const head = await this.db
        .prepare('SELECT revision,generation FROM world_head WHERE id=1')
        .get();
      if (head?.['generation'] !== scope.generation) return null;
      const throughRevision = review?.throughRevision ?? Number(head['revision']);
      const from = mode === 'daily' ? (review?.day ?? -1) * 86400 : -Number.MAX_VALUE;
      const to = mode === 'daily' ? from + 86400 : simTime - EXPERIENCE_LIMITS.rawHours * 3600;
      let after = review?.after ?? { at: -Number.MAX_VALUE, sequence: 0, id: '' };
      if (mode === 'hourly') {
        // Start at actual routine work, then retain protected incidents inside that
        // prefix as grouping barriers. Old protected originals cannot starve later work.
        const anchor = await this.db
          .prepare(
            `SELECT r.at,r.sequence,r.id FROM recall_sources r
          WHERE ${this.eligible} AND r.at<=? AND r.importance<${EXPERIENCE_LIMITS.protectedImportance}
          AND (r.source_kind='awareness' OR r.memory_kind='episode')
          AND r.id NOT IN (SELECT s.id FROM recall_sources s JOIN mind_awareness a ON a.world_id=s.world_id AND a.id=s.record_id
            WHERE s.world_id=? AND s.actor_id=? AND s.eligible=1 AND s.source_kind='awareness' AND s.event_type='speech'
            AND ${this.linguisticSpeech} ORDER BY s.at DESC,s.sequence DESC,s.id DESC LIMIT ${EXPERIENCE_LIMITS.conversationSpeech})
          ORDER BY r.at,r.sequence,r.id LIMIT 1`,
          )
          .get(...this.params(scope), to, scope.worldId, scope.actorId);
        if (!anchor) return null;
        after = {
          at: Number(anchor['at']),
          sequence: Number(anchor['sequence']),
          id: String(anchor['id']),
        };
      }
      const payloadBytes = 'octet_length(payload)';
      const rows = await this.db
        .prepare(
          `SELECT ${sourceColumns}, CASE r.source_kind ${Object.entries(sourceTables)
            .map(
              ([kind, table]) =>
                `WHEN '${kind}' THEN (SELECT ${payloadBytes} FROM ${table} t WHERE t.world_id=r.world_id AND t.id=r.record_id)`,
            )
            .join(' ')} END AS payload_bytes FROM recall_sources r
        WHERE ${this.eligible} AND NOT (r.source_kind='awareness' AND r.importance>=${EXPERIENCE_LIMITS.protectedImportance} AND EXISTS (SELECT 1 FROM recall_place_capsules p WHERE p.world_id=r.world_id AND p.actor_id=r.actor_id AND p.owner_id=r.id AND p.owner_kind=r.source_kind AND p.owner_revision=r.revision)) AND r.at>=? AND r.at${mode === 'daily' ? '<' : '<='}?
        AND (r.at,r.sequence,r.id) ${mode === 'hourly' ? '>=' : '>'} (?,?,?)
        AND (r.source_kind='awareness' OR r.memory_kind='episode'${mode === 'daily' ? " OR r.source_kind='summary'" : ''})
        AND r.id NOT IN (SELECT s.id FROM recall_sources s JOIN mind_awareness a ON a.world_id=s.world_id AND a.id=s.record_id WHERE s.world_id=? AND s.actor_id=? AND s.eligible=1 AND s.source_kind='awareness' AND s.event_type='speech' AND ${this.linguisticSpeech} ORDER BY s.at DESC,s.sequence DESC,s.id DESC LIMIT ${EXPERIENCE_LIMITS.conversationSpeech})
        ${
          mode === 'daily'
            ? `AND EXISTS (SELECT 1 FROM ${'mind_memories'} m WHERE r.source_kind='memory' AND m.world_id=r.world_id AND m.id=r.record_id AND m.revision<=?
          UNION ALL SELECT 1 FROM mind_awareness a WHERE r.source_kind='awareness' AND a.world_id=r.world_id AND a.id=r.record_id AND a.revision<=?
          UNION ALL SELECT 1 FROM mind_summaries s WHERE r.source_kind='summary' AND s.world_id=r.world_id AND s.id=r.record_id AND s.revision<=?)`
            : ''
        }
        ORDER BY r.at,r.sequence,r.id LIMIT ?`,
        )
        .all(
          ...this.params(scope),
          from,
          to,
          after.at,
          after.sequence,
          after.id,
          scope.worldId,
          scope.actorId,
          ...(mode === 'daily' ? [throughRevision, throughRevision, throughRevision] : []),
          MAINTENANCE_SOURCES + 1,
        );
      // Count encoded source bytes in SQL before any text crosses into JS. The
      // output allowance alone would still hydrate 129 potentially large bodies.
      const bounded: typeof rows = [];
      let sourceBytes = 0;
      for (const row of rows) {
        if (bounded.length === MAINTENANCE_SOURCES) break;
        const size = Number(row['payload_bytes']);
        if (!Number.isSafeInteger(size) || size <= 0)
          throw new Error('Maintenance source is missing; evidence retained.');
        if (sourceBytes + size > MAINTENANCE_BYTES) {
          if (!bounded.length)
            throw new Error(
              'One maintenance source exceeds the preparation allowance; evidence retained.',
            );
          break;
        }
        bounded.push(row);
        sourceBytes += size;
      }
      const hydrated = await this.hydrate(bounded);
      const byId = new Map(
        hydrated.map((entry) => [sourceKey(entry.sourceKind, entry.memory.id), entry]),
      );
      const ordered = bounded
        .map((row) => byId.get(sourceKey(String(row['source_kind']), String(row['id']))))
        .filter((entry): entry is RetrievedMemory => !!entry);
      const selected: RetrievedMemory[] = [];
      let bytes = 0;
      const first = ordered[0]?.memory;
      if (!first) return null;
      const end = Math.min(first.at + 21600, (Math.floor(first.at / 86400) + 1) * 86400);
      for (const entry of ordered) {
        if (
          mode === 'hourly' &&
          (entry.memory.at > end ||
            Math.floor(entry.memory.at / 86400) !== Math.floor(first.at / 86400))
        )
          break;
        const size = Buffer.byteLength(JSON.stringify(entry.entry));
        if (size > MAINTENANCE_BYTES)
          throw new Error(
            'One maintenance source exceeds the preparation allowance; evidence retained.',
          );
        if (selected.length === MAINTENANCE_SOURCES || bytes + size > MAINTENANCE_BYTES) break;
        bytes += size;
        selected.push(entry);
      }
      const sources = selected.map((entry) => entry.entry);
      const last = selected.at(-1)!.memory;
      return {
        mode,
        sources,
        prepared: selected.map((source) => ({
          entry: source.entry,
          ref: { kind: source.sourceKind, id: source.memory.id, revision: source.revision },
        })),
        protected: sources.filter(
          (s) => s.value.importance >= EXPERIENCE_LIMITS.protectedImportance,
        ),
        routine: sources.filter((s) => s.value.importance < EXPERIENCE_LIMITS.protectedImportance),
        selection: {
          scope,
          throughRevision,
          after: { at: last.at, sequence: last.sequence ?? 0, id: last.id },
          complete: rows.length === selected.length,
          revisions: selected.map((entry) => ({
            id: entry.memory.id,
            sourceKind: entry.sourceKind,
            revision: entry.revision,
          })),
        },
      };
    });
  }
  /** Database selection keeps cold sources available to legacy invention context and HUD. */
  async selectContext(
    scope: MemoryScope,
    query: string | null,
    limit: number,
  ): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 300)
      throw new Error('Invalid context limit.');
    // Read this before entering our snapshot: an explicit caller transaction can
    // contain tentative writes or an older view and must never populate shared reuse.
    const cacheable = this.db.transactionActive === false;
    const terms = query === null ? [] : [...new Set(searchWords(query))];
    const read = async () => {
      if (query === null)
        return this.hydrate(
          await this.db
            .prepare(
              `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} ORDER BY r.at DESC,r.id LIMIT ?`,
            )
            .all(...this.params(scope), limit),
        );
      const cacheKey = JSON.stringify([actorScopeKey(scope), terms, limit]);
      const cached = cacheable ? this.textSelection.get(cacheKey) : undefined;
      const revision = this.actorRevision(scope.actorId),
        reset = this.resetEpoch;
      // Bind cached metadata to this database snapshot before hydrating. Publication
      // can race entry into a read transaction; a JS revision check alone is insufficient.
      if (
        cached?.revision === revision &&
        cached.reset === reset &&
        (await this.current(
          scope,
          cached.rows.map((row) => ({
            id: String(row['id']),
            sourceKind: String(row['source_kind']) as SourceKind,
            revision: String(row['revision']),
          })),
        )) &&
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch
      )
        return this.hydrate(cached.rows);
      // Token-prefix search uses the database's inverted index. Substring matching
      // required reparsing every retained JSON body; docs/memory-architecture.md#retrieval-preparation-admission.
      let matched: Record<string, unknown>[] = [];
      const expression = lexicalQuery(terms);
      if (expression) {
        matched = await this.db
          .prepare(
            `SELECT ${sourceColumns},
            ts_rank(d.search_vector,?::tsquery) AS score
            FROM recall_sources r JOIN memory_lexical_documents d ON d.world_id=r.world_id
              AND d.actor_id=r.actor_id AND d.id=r.id AND d.source_kind=r.source_kind AND d.source_revision=r.revision
            WHERE ${this.eligible}
            AND d.search_vector @@ ?::tsquery
            ORDER BY score DESC,r.importance DESC,r.at DESC,r.id LIMIT ?`,
          )
          .all(expression, ...this.params(scope), expression, limit);
      }
      const fallback = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r
        WHERE ${this.eligible} ORDER BY r.required DESC,r.importance DESC,r.at DESC,r.id LIMIT ?`,
        )
        .all(...this.params(scope), limit);
      const matchIds = new Set(matched.map((row) => `${row['source_kind']}:${row['id']}`));
      const candidates = [
        ...matched,
        ...fallback.filter((row) => !matchIds.has(`${row['source_kind']}:${row['id']}`)),
      ];
      const rows = [
        ...new Map(
          [
            ...candidates.filter((row) => Number(row['required']) === 1),
            ...candidates.filter((row) => Number(row['required']) !== 1),
          ].map((row) => [`${row['source_kind']}:${row['id']}`, row]),
        ).values(),
      ].slice(0, limit);
      const result = await this.hydrate(rows);
      if (
        cacheable &&
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch
      ) {
        if (this.textSelection.size >= 64)
          this.textSelection.delete(this.textSelection.keys().next().value!);
        this.textSelection.set(cacheKey, { revision, reset, rows });
      }
      return result;
    };
    return lexicalQuery(terms) ? this.lexical.snapshot(scope, read) : this.snapshot(read);
  }
  private async hydrate(
    rows: Record<string, unknown>[],
    cache?: MemoryReadCache,
    reservedBytes = 0,
  ): Promise<RetrievedMemory[]> {
    if (rows.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    // Check serialized source bytes in SQL before bringing bodies into the host. One
    // read snapshot binds the check and hydration to the same versions.
    const reused = rows.flatMap((row) => {
      const cached = cache?.get(row);
      return cached ? [{ row, ...cached }] : [];
    });
    let bytes = reused.reduce((sum, entry) => sum + entry.bytes, reservedBytes);
    if (bytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
    const missing = rows.filter((row) => !cache?.get(row));
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      const selected = missing.filter((row) => row['source_kind'] === kind);
      for (let offset = 0; offset < selected.length; offset += 350) {
        const batch = selected.slice(offset, offset + 350);
        const size = await this.db
          .prepare(
            `SELECT SUM(octet_length(payload)) AS bytes
          FROM ${sourceTables[kind]} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .get(batch[0]!['world_id'], ...batch.map((row) => row['record_id']));
        bytes += Number(size?.['bytes'] ?? 0);
        if (bytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
      }
    }
    const result: RetrievedMemory[] = reused.map(({ row, value }) => ({
      ...value,
      ...(row['score'] !== undefined ? { score: Number(row['score']) } : {}),
    }));
    for (const kind of Object.keys(sourceTables) as SourceKind[]) {
      const selected = missing.filter((row) => row['source_kind'] === kind);
      for (let offset = 0; offset < selected.length; offset += 800) {
        const batch = selected.slice(offset, offset + 800);
        const values = await this.db
          .prepare(
            `SELECT id,payload FROM ${sourceTables[kind]} WHERE world_id=? AND id IN (${batch.map(() => '?').join(',')})`,
          )
          .all(batch[0]!['world_id'], ...batch.map((row) => row['record_id']));
        const byId = new Map(values.map((row) => [row['id'], String(row['payload'])]));
        for (const row of batch) {
          const payload = byId.get(row['record_id']);
          if (!payload || personalAccountRevision(payload) !== row['revision']) continue;
          const actorId = String(row['actor_id']);
          const entry = decodeMemorySource(kind, payload, actorId);
          const memory = experienceReading(entry, actorId);
          const awareness = entry.source === 'awareness' ? entry.value : undefined;
          const value: RetrievedMemory = {
            bodyBytes: Buffer.byteLength(payload),
            entry,
            sourceKind: kind,
            memory,
            awareness,
            revision: String(row['revision']),
          };
          cache?.put(row, value, Buffer.byteLength(payload));
          result.push({
            ...value,
            ...(row['score'] !== undefined ? { score: Number(row['score']) } : {}),
          });
        }
      }
    }
    // Reuse must not change the previous kind/selection order or duplicate grouping.
    const order = new Map(
      Object.keys(sourceTables)
        .flatMap((kind) =>
          rows
            .filter((row) => row['source_kind'] === kind)
            .map((row) => sourceKey(kind, String(row['id']))),
        )
        .map((id, index) => [id, index]),
    );
    return result.sort(
      (a, b) =>
        order.get(sourceKey(a.sourceKind, a.memory.id))! -
        order.get(sourceKey(b.sourceKind, b.memory.id))!,
    );
  }
  async count(scope: MemoryScope): Promise<number> {
    const row = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM recall_sources r WHERE ${this.eligible}`)
      .get(...this.params(scope));
    return Number(row?.['count'] ?? 0);
  }
  /** Exact retained observer originals, admitted by one current summary's native
   * coverage. Selection/bytes precede body reads; raw global events are never a substitute. */
  async originals(
    scope: MemoryScope,
    parent: SummarySourceBinding,
    references: PersonalSourceRef[],
    maxBytes = RETRIEVAL_BYTES,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(async () => {
      if (!(await this.current(scope, [{ ...parent, sourceKind: 'summary' }])))
        throw new Error('The remembered summary changed or is unavailable.');
      const key = (source: PersonalSourceRef) =>
        JSON.stringify([source.kind, source.id, source.revision]);
      const unique = [...new Map(references.map((source) => [key(source), source])).values()];
      if (unique.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
      // This index is derived atomically with the exact current summary. Reuse its
      // point references instead of loading the parent's lifetime coverage body again.
      let admitted = 0;
      for (let offset = 0; offset < unique.length; offset += 300)
        admitted += (
          await this.db
            .prepare(
              `SELECT DISTINCT q.kind,q.id,q.revision FROM jsonb_to_recordset(?::jsonb) AS q(kind TEXT,id TEXT,revision TEXT)
          JOIN mind_source_dependencies s ON s.world_id=? AND s.actor_id=? AND s.derived_id=? AND s.derived_kind='summary'
            AND s.source_kind=q.kind AND s.source_id=q.id AND s.source_revision=q.revision`,
            )
            .all(
              JSON.stringify(unique.slice(offset, offset + 300)),
              scope.worldId,
              scope.actorId,
              parent.id,
            )
        ).length;
      if (admitted !== unique.length)
        throw new Error('The requested original is outside the selected personal summary.');
      const headers = await this.originalRows(scope, unique, false);
      if (headers.length !== unique.length)
        throw new Error('An exact original observer source is unavailable.');
      const bytes = headers.reduce((sum, row) => sum + Number(row['bytes']), 0);
      if (!Number.isSafeInteger(bytes) || bytes > Math.min(maxBytes, RETRIEVAL_BYTES))
        throw new MemoryPreparationError();
      const rows = await this.originalRows(scope, unique, true);
      if (rows.length !== unique.length)
        throw new Error('An exact original changed during preparation.');
      const byKey = new Map(
        rows.map((row) => [
          key({
            kind: row['kind'] as SourceKind,
            id: String(row['id']),
            revision: String(row['revision']),
          }),
          row,
        ]),
      );
      return unique.map((reference) => {
        const row = byKey.get(key(reference));
        if (!row || personalAccountRevision(String(row['payload'])) !== reference.revision)
          throw new Error('Stored original source bytes disagree with their exact revision.');
        const entry = decodeMemorySource(reference.kind, String(row['payload']), scope.actorId);
        if ((entry.source === 'awareness' ? entry.value.eventId : entry.value.id) !== reference.id)
          throw new Error('Stored original identity disagrees with its exact source reference.');
        return {
          bodyBytes: Buffer.byteLength(String(row['payload'])),
          entry,
          sourceKind: reference.kind,
          revision: reference.revision,
          memory: experienceReading(entry, scope.actorId),
          ...(entry.source === 'awareness' ? { awareness: entry.value } : {}),
          through: { ...parent },
        };
      });
    });
  }
  /** Called only with source capabilities admitted above, or their retained private
   * freshness bindings. Parent changes are checked separately without rehydrating it. */
  /** Resolve only explicitly needed native IDs. Each missing kind gets a bounded
   * indexed window of current summary witnesses; exhaustion is not evidence of absence. */
  private async requiredOriginals(
    scope: MemoryScope,
    ids: string[],
    existing: RetrievedMemory[],
    kinds: readonly SourceKind[] = ['awareness', 'memory'],
  ): Promise<RetrievedMemory[]> {
    const present = new Set(
      existing.map((source) => sourceKey(source.sourceKind, source.memory.id)),
    );
    const wanted = [...new Set(ids)].flatMap((id) =>
      kinds.filter((kind) => !present.has(sourceKey(kind, id))).map((kind) => ({ kind, id })),
    );
    if (!wanted.length) return existing;
    if (wanted.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    const window = Math.floor(RETRIEVAL_ROWS / wanted.length);
    const rows = await this.db
      .prepare(
        `SELECT q.kind,q.id,s.source_revision,r.id AS parent_id,r.revision AS parent_revision,r.eligible
      FROM jsonb_to_recordset(?::jsonb) AS q(kind TEXT,id TEXT)
      JOIN LATERAL (SELECT DISTINCT derived_id,source_revision FROM mind_source_dependencies s
        WHERE s.world_id=? AND s.actor_id=? AND s.source_kind=q.kind AND s.source_id=q.id AND s.derived_kind='summary'
        ORDER BY derived_id,source_revision LIMIT ${window}) s ON true
      LEFT JOIN recall_sources r ON r.world_id=? AND r.actor_id=? AND r.source_kind='summary' AND r.id=s.derived_id
      WHERE (SELECT generation FROM world_head WHERE id=1)=?
        AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=? AND f.actor_id=? AND f.source_id=q.id)
        AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=? AND c.actor_id=? AND c.source_id=q.id)`,
      )
      .all(
        JSON.stringify(wanted),
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
        scope.generation,
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
      );
    const witnesses = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const key = sourceKey(String(row['kind']), String(row['id']));
      const group = witnesses.get(key) ?? [];
      group.push(row);
      witnesses.set(key, group);
    }
    const parents = new Map<
      string,
      { parent: SummarySourceBinding; references: PersonalSourceRef[] }
    >();
    for (const request of wanted) {
      const candidates = witnesses.get(sourceKey(request.kind, request.id)) ?? [];
      const chosen = candidates.find((row) => Number(row['eligible']) === 1);
      if (!chosen) {
        if (candidates.length === window) throw new MemoryPreparationError();
        continue;
      }
      const parent = {
        id: String(chosen['parent_id']),
        revision: String(chosen['parent_revision']),
      };
      const key = JSON.stringify(parent),
        group = parents.get(key) ?? { parent, references: [] };
      group.references.push({ ...request, revision: String(chosen['source_revision']) });
      parents.set(key, group);
    }
    const count = [...parents.values()].reduce((sum, group) => sum + group.references.length, 0);
    if (existing.length + count > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    let remainingBytes =
      RETRIEVAL_BYTES - existing.reduce((sum, source) => sum + source.bodyBytes, 0);
    const retained = [...existing];
    for (const group of parents.values()) {
      const originals = await this.originals(scope, group.parent, group.references, remainingBytes);
      remainingBytes -= originals.reduce((sum, source) => sum + source.bodyBytes, 0);
      retained.push(...originals);
    }
    return retained;
  }
  private async originalRows(scope: MemoryScope, references: PersonalSourceRef[], bodies: boolean) {
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; offset < references.length; offset += 300) {
      const batch = references.slice(offset, offset + 300);
      rows.push(
        ...(await this.db
          .prepare(
            `SELECT q.kind,q.id,q.revision,${bodies ? 'body.payload' : 'octet_length(body.payload) AS bytes'}
        FROM jsonb_to_recordset(?::jsonb) AS q(kind TEXT,id TEXT,revision TEXT)
        JOIN LATERAL (
          SELECT source.payload FROM recall_sources r JOIN LATERAL (
            ${Object.entries(sourceTables)
              .map(
                ([kind, table]) =>
                  `SELECT payload FROM ${table} t WHERE q.kind='${kind}' AND t.world_id=r.world_id AND t.id=r.record_id`,
              )
              .join(' UNION ALL ')}
          ) source ON true WHERE r.world_id=? AND r.actor_id=? AND r.source_kind=q.kind AND r.id=q.id AND r.revision=q.revision
          UNION ALL SELECT v.payload FROM mind_source_versions v WHERE v.world_id=? AND v.actor_id=? AND v.source_kind=q.kind AND v.source_id=q.id AND v.revision=q.revision
          LIMIT 1
        ) body ON true WHERE (SELECT generation FROM world_head WHERE id=1)=?
          AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=? AND f.actor_id=? AND f.source_id=q.id)
          AND NOT EXISTS (SELECT 1 FROM mind_corrections c WHERE c.world_id=? AND c.actor_id=? AND c.source_id=q.id)`,
          )
          .all(
            JSON.stringify(batch),
            scope.worldId,
            scope.actorId,
            scope.worldId,
            scope.actorId,
            scope.generation,
            scope.worldId,
            scope.actorId,
            scope.worldId,
            scope.actorId,
          )),
      );
    }
    return rows;
  }
  async current(scope: MemoryScope, sources: CurrentMemorySource[]): Promise<boolean> {
    const inherited = sources.filter((source) => source.through);
    const current: CurrentMemorySource[] = [
      ...sources.filter((source) => !source.through),
      ...inherited.map((source) => ({ ...source.through!, sourceKind: 'summary' as const })),
    ];
    const read = async () => {
      const receipts = sources.filter((source) => source.receipt);
      if (receipts.length) {
        if (
          !(await this.temporalReceiptLocatorsCurrent(
            scope,
            receipts.map((source) => source.receipt!),
          ))
        )
          return false;
        const selected = await this.evidence(
          scope,
          receipts.map((source) => source.id),
        );
        const byId = new Map(selected.map((entry) => [entry.memory.id, entry]));
        if (
          receipts.some((source) => {
            const now = byId.get(source.id);
            return (
              !now?.receipt ||
              now.revision !== source.revision ||
              JSON.stringify(now.receipt) !== JSON.stringify(source.receipt)
            );
          })
        )
          return false;
      }
      const canonical = current.filter((source) => !source.receipt);
      for (let offset = 0; offset < canonical.length; offset += 500) {
        const batch = canonical.slice(offset, offset + 500);
        const rows = await this.db
          .prepare(
            `SELECT r.id,r.source_kind,r.revision FROM recall_sources r WHERE ${this.pendingEvidence} AND (r.id,r.source_kind) IN (${batch.map(() => '(?,?)').join(',')})`,
          )
          .all(...this.params(scope), ...batch.flatMap((source) => [source.id, source.sourceKind]));
        const versions = new Map(
          rows.map((row) => [
            sourceKey(String(row['source_kind']), String(row['id'])),
            row['revision'],
          ]),
        );
        if (
          batch.some(
            (source) => versions.get(sourceKey(source.sourceKind, source.id)) !== source.revision,
          )
        )
          return false;
      }
      // These are server-retained capabilities from originals(), not client-selected
      // parent claims. Exact unchanged parents preserve the admitted coverage relation.
      if (inherited.length) {
        const references = [
          ...new Map(
            inherited.map((source) => [
              JSON.stringify([source.sourceKind, source.id, source.revision]),
              { kind: source.sourceKind, id: source.id, revision: source.revision },
            ]),
          ).values(),
        ];
        if ((await this.originalRows(scope, references, false)).length !== references.length)
          return false;
      }
      return true;
    };
    return inherited.length || current.length > 500 || sources.some((source) => source.receipt)
      ? this.snapshot(read)
      : read();
  }
  /** Selected source revisions, not social occupancy, own delayed preparation. */
  async validatePreparation(
    scope: MemoryScope,
    conversation: { sequence: number; sources: ConversationSource[] } | undefined,
    sources: CurrentMemorySource[],
  ): Promise<boolean> {
    const selected = new Map<string, CurrentMemorySource>();
    for (const source of [
      ...(conversation?.sources ?? []).map((source) => ({
        id: source.id,
        sourceKind: 'awareness' as const,
        revision: source.revision,
      })),
      ...sources,
    ]) {
      const key = sourceKey(source.sourceKind, source.id);
      if (selected.has(key) && selected.get(key)!.revision !== source.revision) return false;
      selected.set(key, source);
    }
    return this.current(scope, [...selected.values()]);
  }

  async coverage(scope: MemoryScope, model: MemoryModel) {
    // A cached committed count needs no BEGIN/COMMIT. Explicit transactions instead
    // use their own snapshot, which may predate the cache or include tentative writes.
    if (this.db.transactionActive !== false)
      return this.snapshot(() => this.readCoverage(scope, model));
    const key = modelScopeKey(scope, model);
    const revision = this.actorRevision(scope.actorId),
      reset = this.resetEpoch;
    const epochs = this.retainCoverage(scope, model);
    const actorToken = epochs.actor.token,
      modelToken = epochs.model.token;
    try {
      const cached = this.coverageCache.get(key);
      if (
        cached?.revision === revision &&
        cached.reset === reset &&
        cached.actorToken === actorToken &&
        cached.modelToken === modelToken
      )
        return { ...cached.value };
      const value = await this.snapshot(() => this.readCoverage(scope, model));
      if (
        revision === this.actorRevision(scope.actorId) &&
        reset === this.resetEpoch &&
        actorToken === epochs.actor.token &&
        modelToken === epochs.model.token
      ) {
        this.evictCoverage(key);
        if (this.coverageCache.size >= 512)
          this.evictCoverage(this.coverageCache.keys().next().value!);
        // Cache ownership keeps epochs alive; active readers retain their own
        // references, so eviction cannot reuse a token under an outstanding read.
        epochs.actor.references++;
        epochs.model.references++;
        this.coverageCache.set(key, { revision, reset, actorToken, modelToken, epochs, value });
      }
      return { ...value };
    } finally {
      this.releaseCoverage(epochs);
    }
  }
  private async readCoverage(scope: MemoryScope, model: MemoryModel) {
    const eligible = await this.count(scope);
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM memory_vectors
      WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=? AND (SELECT generation FROM world_head WHERE id=1)=?`,
      )
      .get(
        scope.worldId,
        scope.actorId,
        scope.generation,
        model.model,
        model.dimensions,
        scope.generation,
      );
    const indexed = Number(row?.['count'] ?? 0);
    return { eligible, indexed, missing: Math.max(0, eligible - indexed) };
  }
  /** Exact event-time evidence for pending work, including sources evicted from RAM. */
  async evidence(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(async () => {
      const unique = [...new Set(ids)];
      if (unique.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < unique.length; offset += 500) {
        const batch = unique.slice(offset, offset + 500);
        rows.push(
          ...(await this.db
            .prepare(
              `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.pendingEvidence} AND r.source_kind='awareness' AND r.id IN (${batch.map(() => '?').join(',')})`,
            )
            .all(...this.params(scope), ...batch)),
        );
      }
      const found = new Set(rows.map((row) => String(row['id']))),
        missing = unique.filter((id) => !found.has(id));
      const temporalRows: Record<string, unknown>[] = [];
      for (let offset = 0; offset < missing.length; offset += 500) {
        const batch = missing.slice(offset, offset + 500);
        temporalRows.push(
          ...(await this.db
            .prepare(
              `SELECT p.event_id,p.payload FROM history_perspectives p
          WHERE p.world_id=? AND p.actor_id=? AND p.temporal_chunk_id IS NOT NULL
            AND p.event_id=ANY(?::text[]) AND (SELECT generation FROM world_head WHERE world_id=?)=?
            AND NOT EXISTS (SELECT 1 FROM mind_forgotten f WHERE f.world_id=p.world_id AND f.actor_id=p.actor_id AND f.source_id=p.event_id)`,
            )
            .all(scope.worldId, scope.actorId, batch, scope.worldId, scope.generation)),
        );
      }
      const temporalBytes = temporalRows.reduce(
        (sum, row) => sum + (storyTemporalBytes(String(row['payload'])) ?? RETRIEVAL_BYTES + 1),
        0,
      );
      if (temporalBytes > RETRIEVAL_BYTES) throw new MemoryPreparationError();
      const result = await this.hydrate(rows, cache, temporalBytes);
      for (let offset = 0; offset < temporalRows.length; offset += 500) {
        const batch = temporalRows.slice(offset, offset + 500);
        const bodies = await this.db
          .prepare(
            `SELECT p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p
          WHERE p.world_id=? AND p.actor_id=? AND p.event_id=ANY(?::text[])`,
          )
          .all(
            scope.worldId,
            scope.actorId,
            batch.map((row) => String(row['event_id'])),
          );
        for (const row of bodies) {
          const payload = String(row['payload']),
            awareness = temporalStoryAwareness(payload, row['account_payload']),
            receipt = storyTemporalReceipt(payload);
          if (awareness && receipt)
            result.push({
              bodyBytes: Buffer.byteLength(JSON.stringify(awareness)),
              entry: { source: 'awareness', value: awareness },
              sourceKind: 'awareness',
              awareness,
              memory: awarenessMemory(awareness),
              revision: personalAccountRevision(JSON.stringify(awareness)),
              receipt,
            });
        }
      }
      return this.requiredOriginals(scope, unique, result, ['awareness']);
    });
  }
  /** Exact, bounded sources already selected into one appraisal/reflection context.
   * No required-history union or whole actor hydration is needed for this binding. */
  async appraisalSources(scope: MemoryScope, ids: string[]): Promise<RetrievedMemory[]> {
    const unique = [...new Set(ids)];
    if (unique.length > 48) throw new Error('Too many appraisal source bindings.');
    if (!unique.length) return [];
    return this.snapshot(async () => {
      const selected = await this.hydrate(
        await this.db
          .prepare(
            `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.pendingEvidence} AND (r.id IN (${unique.map(() => '?').join(',')}) OR r.event_id IN (${unique.map(() => '?').join(',')})) ORDER BY r.id`,
          )
          .all(...this.params(scope), ...unique, ...unique),
      );
      return this.requiredOriginals(scope, unique, selected);
    });
  }
  async required(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readRequired(scope, ids, cache));
  }
  private async readRequired(
    scope: MemoryScope,
    ids: string[],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    const unique = [...new Set(ids)];
    if (unique.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    const rows = await this.db
      .prepare(
        `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.required=1
      UNION SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND r.id IN
      (SELECT source_id FROM mind_corrections WHERE world_id=? AND actor_id=? UNION SELECT correction_id FROM mind_corrections WHERE world_id=? AND actor_id=?) LIMIT ${RETRIEVAL_ROWS + 1}`,
      )
      .all(
        ...this.params(scope),
        ...this.params(scope),
        scope.worldId,
        scope.actorId,
        scope.worldId,
        scope.actorId,
      );
    if (rows.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    const selected = new Map(rows.map((row) => [`${row['source_kind']}:${row['id']}`, row]));
    for (let offset = 0; offset < unique.length; offset += 350) {
      const batch = unique.slice(offset, offset + 350),
        params = batch.map(() => '?').join(',');
      const matches = await this.db
        .prepare(
          `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.pendingEvidence} AND (r.id IN (${params}) OR r.event_id IN (${params})) LIMIT ${RETRIEVAL_ROWS + 1}`,
        )
        .all(...this.params(scope), ...batch, ...batch);
      for (const row of matches) selected.set(`${row['source_kind']}:${row['id']}`, row);
      if (selected.size > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    }
    return this.requiredOriginals(scope, unique, await this.hydrate([...selected.values()], cache));
  }

  async select(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
    excludedIds: string[] = [],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    return this.snapshot(() => this.readSelection(scope, limit, semantic, excludedIds, cache));
  }
  private async readSelection(
    scope: MemoryScope,
    limit: number,
    semantic?: MemoryModel & { query: number[] },
    excludedIds: string[] = [],
    cache?: MemoryReadCache,
  ): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid memory selection size.');
    if (excludedIds.length > RETRIEVAL_ROWS) throw new MemoryPreparationError();
    // Apply before LIMIT and body hydration; grouping cannot reintroduce covered turns.
    const optional = `NOT (r.id = ANY(?::text[]) OR COALESCE(r.event_id,'') = ANY(?::text[]))`;
    const fallback = await this.db
      .prepare(
        `SELECT ${sourceColumns} FROM recall_sources r WHERE ${this.eligible} AND ${optional} ORDER BY r.importance DESC,r.at DESC,r.id LIMIT ?`,
      )
      .all(...this.params(scope), excludedIds, excludedIds, limit);
    if (!semantic) return this.hydrate(fallback, cache);
    this.validateVector(semantic, semantic.query);
    const rows = await this.db
      .prepare(
        `WITH matches AS MATERIALIZED (
          SELECT source_id,source_revision,1-(embedding OPERATOR(public.<=>) ?::public.vector) AS score
          FROM memory_vectors WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=?
            AND (SELECT generation FROM world_head WHERE id=1)=? AND source_id <> ALL(?::text[])
          ORDER BY embedding OPERATOR(public.<=>) ?::public.vector,source_id LIMIT ?)
        SELECT ${sourceColumns},m.score FROM matches m JOIN recall_sources r ON r.id=m.source_id AND r.revision=m.source_revision
        WHERE ${this.eligible} AND ${optional} ORDER BY m.score DESC,r.id`,
      )
      .all(
        JSON.stringify(semantic.query),
        scope.worldId,
        scope.actorId,
        scope.generation,
        semantic.model,
        semantic.dimensions,
        scope.generation,
        excludedIds,
        JSON.stringify(semantic.query),
        limit,
        ...this.params(scope),
        excludedIds,
        excludedIds,
      );
    const combined = [
      ...new Map([...rows, ...fallback].map((row) => [row['id'], row])).values(),
    ].slice(0, limit);
    // Map above must prefer the semantic row when its fallback copy is also present.
    const scores = new Map(rows.map((row) => [row['id'], row['score']]));
    for (const row of combined) if (scores.has(row['id'])) row['score'] = scores.get(row['id']);
    return this.hydrate(combined, cache);
  }
  async pending(scope: MemoryScope, model: MemoryModel, limit = 32): Promise<RetrievedMemory[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
      throw new Error('Invalid indexing batch size.');
    if (!this.derivedAllowance || this.derivedAllowance.worldId !== scope.worldId) return [];
    const registration = JSON.stringify([
      scope.worldId,
      scope.actorId,
      model.model,
      model.dimensions,
    ]);
    const actorRegistration = JSON.stringify([scope.worldId, scope.actorId]);
    if (this.registeredModels.get(actorRegistration) !== registration) {
      await this.db.transaction(async () => {
        await this.db
          .prepare(
            'DELETE FROM memory_index_queue WHERE world_id=? AND actor_id=? AND (model<>? OR dimensions<>?)',
          )
          .run(scope.worldId, scope.actorId, model.model, model.dimensions);
        await this.db
          .prepare(
            'DELETE FROM memory_index_models WHERE world_id=? AND actor_id=? AND (model<>? OR dimensions<>?)',
          )
          .run(scope.worldId, scope.actorId, model.model, model.dimensions);
        const added = await this.db
          .prepare(
            'INSERT INTO memory_index_models VALUES (?,?,?,?) ON CONFLICT DO NOTHING RETURNING model',
          )
          .get(scope.worldId, scope.actorId, model.model, model.dimensions);
        if (added) await this.refreshQueue(scope.worldId, scope.actorId, null);
        await this.trimDerived(scope.worldId, [scope.actorId]);
      });
      this.registeredModels.set(actorRegistration, registration);
      this.db.afterRollback?.(() => this.registeredModels.delete(actorRegistration));
    }
    const rows = await this.db
      .prepare(
        `WITH pending AS MATERIALIZED (SELECT * FROM memory_index_queue
      WHERE world_id=? AND actor_id=? AND model=? AND dimensions=? ORDER BY importance DESC,at DESC,source_id LIMIT ?)
      SELECT ${sourceColumns} FROM pending q JOIN recall_sources r
      ON r.world_id=q.world_id AND r.actor_id=q.actor_id AND r.id=q.source_id AND r.revision=q.source_revision
      WHERE r.eligible=1 AND (SELECT generation FROM world_head WHERE id=1)=?
      ORDER BY q.importance DESC,q.at DESC,q.source_id`,
      )
      .all(scope.worldId, scope.actorId, model.model, model.dimensions, limit, scope.generation);
    return this.hydrate(rows);
  }
  async markAttempt(
    scope: MemoryScope,
    model: MemoryModel,
    sources: RetrievedMemory[],
    requestId: string,
    reserve: () => Promise<boolean>,
  ): Promise<boolean> {
    if (!sources.length || sources.length > 1000) throw new Error('Invalid indexing claim size.');
    return this.db.transaction(async () => {
      const current = await this.db
        .prepare(
          `SELECT r.id,r.revision FROM recall_sources r
        WHERE ${this.eligible} AND r.id IN (${sources.map(() => '?').join(',')})
        AND NOT EXISTS (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=r.world_id AND a.actor_id=r.actor_id
          AND a.source_id=r.id AND a.source_revision=r.revision AND a.model=? AND a.dimensions=?)`,
        )
        .all(
          ...this.params(scope),
          ...sources.map((s) => s.memory.id),
          model.model,
          model.dimensions,
        );
      const revisions = new Map(current.map((row) => [row['id'], row['revision']]));
      if (sources.some((source) => revisions.get(source.memory.id) !== source.revision))
        return false;
      if (!(await reserve())) return false;
      await insertRows(
        this.db,
        'memory_index_attempts',
        sources.map((source) => [
          scope.worldId,
          scope.actorId,
          scope.generation,
          source.memory.id,
          source.revision,
          model.model,
          model.dimensions,
          requestId,
          'dispatched',
        ]),
      );
      await this.db
        .prepare(
          `DELETE FROM memory_index_queue AS q WHERE q.world_id=? AND q.actor_id=? AND EXISTS
        (SELECT 1 FROM memory_index_attempts a WHERE a.world_id=q.world_id AND a.actor_id=q.actor_id AND a.source_id=q.source_id AND a.source_revision=q.source_revision AND a.model=q.model AND a.dimensions=q.dimensions AND a.request_id=?)`,
        )
        .run(scope.worldId, scope.actorId, requestId);
      return true;
    });
  }
  async putVectors(scope: MemoryScope, model: MemoryModel, values: MemoryVector[]) {
    if (!this.derivedAllowance || this.derivedAllowance.worldId !== scope.worldId) return;
    return this.db.transaction(async () => {
      await this.publishVectors(scope, model, values);
      await this.trimDerived(scope.worldId, [scope.actorId]);
    });
  }
  private async publishVectors(scope: MemoryScope, model: MemoryModel, values: MemoryVector[]) {
    this.vectorPublication(scope, model);
    this.db.afterCommit?.(() => this.vectorPublication(scope, model));
    for (const value of values) this.validateVector(model, value.vector);
    await this.db
      .prepare(
        `INSERT INTO memory_vector_cache
      SELECT r.world_id,r.actor_id,r.id,r.revision,?,?,s.vector::text
      FROM jsonb_to_recordset(?::jsonb) AS s(id text,revision text,vector jsonb)
      JOIN recall_sources r ON r.id=s.id AND r.revision=s.revision WHERE ${this.eligible}
      ON CONFLICT DO NOTHING`,
      )
      .run(model.model, model.dimensions, JSON.stringify(values), ...this.params(scope));
    await this.db
      .prepare(
        `INSERT INTO memory_vectors
      SELECT r.world_id,r.actor_id,?,r.id,r.revision,?,?,s.vector::text::public.vector
      FROM jsonb_to_recordset(?::jsonb) AS s(id text,revision text,vector jsonb)
      JOIN recall_sources r ON r.id=s.id AND r.revision=s.revision WHERE ${this.eligible}
      ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding`,
      )
      .run(
        scope.generation,
        model.model,
        model.dimensions,
        JSON.stringify(values),
        ...this.params(scope),
      );
    await this.db
      .prepare(
        `DELETE FROM memory_index_queue q USING jsonb_to_recordset(?::jsonb) AS s(id text,revision text)
      WHERE q.world_id=? AND q.actor_id=? AND q.model=? AND q.dimensions=? AND q.source_id=s.id AND q.source_revision=s.revision
        AND (SELECT generation FROM world_head WHERE id=1)=?`,
      )
      .run(
        JSON.stringify(values.map(({ id, revision }) => ({ id, revision }))),
        scope.worldId,
        scope.actorId,
        model.model,
        model.dimensions,
        scope.generation,
      );
    await this.db
      .prepare(
        "UPDATE memory_index_attempts SET state='completed' WHERE world_id=? AND actor_id=? AND generation=? AND model=? AND dimensions=? AND EXISTS (SELECT 1 FROM memory_vectors v WHERE v.world_id=memory_index_attempts.world_id AND v.actor_id=memory_index_attempts.actor_id AND v.generation=memory_index_attempts.generation AND v.source_id=memory_index_attempts.source_id AND v.source_revision=memory_index_attempts.source_revision AND v.model=memory_index_attempts.model AND v.dimensions=memory_index_attempts.dimensions)",
      )
      .run(scope.worldId, scope.actorId, scope.generation, model.model, model.dimensions);
  }
  /** A restored identical source may reuse paid derived data. Publication still checks
   * the new generation, and dispatched/uncertain attempts stay outside gameplay rewind. */
  async reuseVectors(worldId: string, changed?: MemoryChanges) {
    this.vectorReuse(worldId, changed);
    this.db.afterCommit?.(() => this.vectorReuse(worldId, changed));
    const pairs = changed
      ? [...changed].flatMap(([actor, ids]) => [...(ids ?? [])].map((id) => [actor, id]))
      : [];
    for (let offset = 0; offset < Math.max(1, pairs.length); offset += 300) {
      const batch = pairs.slice(offset, offset + 300);
      if (changed && !batch.length) break;
      await this.db
        .prepare(
          `INSERT INTO memory_vectors
        SELECT c.world_id,c.actor_id,h.generation,c.source_id,c.source_revision,c.model,c.dimensions,c.embedding::public.vector
        FROM recall_sources r JOIN memory_vector_cache c ON c.world_id=r.world_id AND c.actor_id=r.actor_id AND c.source_id=r.id AND c.source_revision=r.revision
        JOIN world_head h ON h.world_id=r.world_id
        WHERE r.world_id=? AND r.eligible=1${changed ? ` AND (r.actor_id,r.id) IN (VALUES ${batch.map(() => '(?,?)').join(',')})` : ''}
        ON CONFLICT(world_id,actor_id,source_id,model,dimensions) DO UPDATE SET generation=excluded.generation,source_revision=excluded.source_revision,embedding=excluded.embedding
        WHERE (memory_vectors.generation,memory_vectors.source_revision) IS DISTINCT FROM (excluded.generation,excluded.source_revision)`,
        )
        .run(worldId, ...batch.flat());
    }
    await this.db
      .prepare(
        `DELETE FROM memory_index_queue q WHERE q.world_id=? AND EXISTS (SELECT 1 FROM memory_vectors v
      WHERE v.world_id=q.world_id AND v.actor_id=q.actor_id AND v.source_id=q.source_id AND v.source_revision=q.source_revision AND v.model=q.model AND v.dimensions=q.dimensions)`,
      )
      .run(worldId);
    if (changed) await this.trimDerived(worldId, changed.keys());
    else {
      const owners = await this.db
        .prepare('SELECT DISTINCT actor_id FROM memory_vectors WHERE world_id=?')
        .all(worldId);
      await this.trimDerived(
        worldId,
        owners.map((row) => String(row['actor_id'])),
      );
    }
  }
  private validateVector(model: MemoryModel, vector: number[]) {
    if (
      vector.length !== model.dimensions ||
      !vector.every(Number.isFinite) ||
      !vector.some((value) => value !== 0)
    )
      throw new Error('Embedding must be finite, nonzero and match configured dimensions.');
  }
}
