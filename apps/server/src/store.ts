import { JOB_UPSERT_SQL, jobPayloadPrefix, jobSelection } from './job-storage.js';
import { diagnosticStorage, diagnosticSelectionPattern } from './diagnostic-storage.js';
import {
  resetPreparedSourceVersionAccounting,
  sourceVersionPreparationNeeded,
  type SourceVersionPlan,
} from './source-version-retention.js';
import {
  prepareAccountRetentionPlan,
  prepareSupportRetentionPlan,
  nextAccountRetentionAt,
  type AccountRetentionPlan,
} from './account-retention.js';
import { RetentionActorSelection, type RetentionWorkKind } from './retention-deadlines.js';
import { RECORD_NODES } from './world-record-schema.js';
import { selectActorLiveReadCuts, selectActorRecordChanges } from './actor-record-selection.js';
import type { LiveReadCuts, LiveReadCutsProvider, MetadataBaseline } from './live-read-overlay.js';
import { receivedCurrentOwnerTables } from './received-record-references.js';
import {
  retentionDueActors,
  recentRetentionDue,
  mergeRetirementPredecessors,
} from './temporal-storage.js';
import type { PreparedDiagnosticRecord } from './diagnostic-capture.js';
import {
  readDecisionState,
  undispatchedReceipt,
  endDecision,
  type DecisionState,
  type DecisionAttemptLink,
  type LinkedDecisionAttempt,
  type ExecutionClass,
} from './decision-state.js';
import type { ConstructionPermission, ConstructionPermissionChanges } from '@open-legend/domain';
import {
  usdToMicroUsd,
  microUsdToUsd,
  normalizeReceiptCost,
  sumSafeIntegers,
} from '@open-legend/ai';
import {
  AUTHORITY_TABLES,
  AuthorityRepository,
  type AuthorityFence,
  type AccountBinding,
  type RequestScope,
  type ControlRequest,
  type ExitAttempt,
  type BindingRequest,
} from './authority.js';
import { InviteRepository } from './invites.js';
import { MaintenanceRepository } from './maintenance.js';
import { ASSET_TABLES, AssetRepository } from './asset-repository.js';
import { assertAssetBinding, type AssetRevisionReference } from '@open-legend/assets';
import {
  compactHistory,
  recordSavedTemporalPages,
  acknowledgedTemporalOrder,
  releaseSavedTemporalHistory,
  inheritSavedTemporalTails,
  compactObjectHistory,
  compactAppraisalHistory,
  compactContributionHistory,
} from './history-residency.js';
import { MemoryRepository } from './memory-repository.js';
import type { DerivedMemoryAllowance } from './memory-derivatives.js';
import {
  materializeTemporalChanges,
  WorldRecords,
  mergeRecordChanges,
  retainedSourceTables,
  type RecordChanges,
} from './world-records.js';
import {
  RetentionMetadata,
  accountTables,
  accountWriteHasRetentionDependencies,
  retentionChangedActors,
  type RetentionMetadataView,
} from './retention-metadata.js';
import {
  assertAttemptReceiptContinuity,
  readAttemptBudget,
  retainKnownAttemptCost,
  uncertainAttemptMicroUsd,
  type AttemptBudgetSnapshot,
} from './attempt-budget.js';
import { WorldAgentStore } from './world-agent-store.js';
import { validateCurrentWorldState } from './upgrade-world.js';
import { CreationTargetRepository } from './creation-target.js';
import { GameSaves, type RestoreSave } from './game-saves.js';
import { timed, timedSync, countMetric, recordBackgroundFailure } from './performance.js';
import { HistoryRepository } from './history.js';
import { prepareHistory, captureHistoryProjection } from './history-preparation.js';
import type { CommitInputs } from './commit-inputs.js';
import { insertRows, SqlWriteBatch, sqlTextKey } from './sql-rows.js';
import { IntegrationValues } from './integration-values.js';
import {
  privacyLedgerKey,
  readPrivacyLedger,
  worldPrivacy,
  assertPrivacyContinuation,
} from './privacy-ledger.js';
import { ReceivedValueOwnership } from './received-value-ownership.js';
import { evidenceEncodedBytesSql } from './temporal-page-storage.js';
import { CommandReceipts, type GameplayReceipt } from './command-receipts.js';
import { VectorStore } from './vector-store.js';
import type { GameView, IntelligenceCall } from '@open-legend/protocol';
import { join } from 'node:path';
import {
  appendedEventCount as provenAppendCount,
  appendedRecordCount,
  updateWorld,
  freezeWorld,
  type WorldState,
} from '@open-legend/domain';
import type { AiReceipt } from '@open-legend/ai';
import type { AiJobView, PlayerProfile, PlayerPreferencePatch } from '@open-legend/protocol';

export const COGNITION_PENDING_EXECUTIONS_SQL =
  "SELECT a.id,l.execution_class FROM attempts a JOIN cognition_attempt_links l ON l.attempt_id=a.id WHERE a.status IN ('reserved','uncertain') AND l.dispatch_intent AND (a.receipt IS NULL OR (a.receipt::jsonb ->> 'completionUncertain')='true')";
// Keep the link lookup dependent on each unfinished attempt. Without the bounded
// lateral lookup, stale statistics can scan all completed links during recovery.
export const COGNITION_UNSENT_ATTEMPTS_SQL =
  "SELECT a.id,a.provider FROM attempts a JOIN LATERAL (SELECT 1 FROM cognition_attempt_links l WHERE l.attempt_id=a.id AND NOT l.dispatch_intent LIMIT 1) l ON true WHERE a.status='reserved' ORDER BY a.id LIMIT 50";

export interface DiagnosticAccess {
  accountId: string;
  actorIds: string[];
  allowUnscoped: boolean;
}
/** List presentation needs these outcome fields, never full prompts or exchanges. */
export type DiagnosticRootSummary = Omit<IntelligenceCall, 'input' | 'output' | 'exchanges'> & {
  input: { reason?: unknown; text?: unknown };
  output: {
    ok?: unknown;
    code?: unknown;
    message?: unknown;
    reason?: unknown;
    error?: unknown;
    receipt?: { requestId: string; estimatedCostUsd?: number };
  };
  exchanges: [];
};
function diagnosticPredicate(access: DiagnosticAccess): { sql: string; params: string[] } {
  const ids = access.actorIds;
  return {
    sql: `((selection #>> '{ownerAccountId}')=? OR ((selection #>> '{ownerAccountId}') IS NULL AND (${ids.length ? `(selection #>> '{actorId}') IN (${ids.map(() => '?').join(',')})` : '1=0'}${access.allowUnscoped ? " OR (selection #>> '{actorId}') IS NULL" : ''})))`,
    params: [sqlTextKey(access.accountId), ...ids.map(sqlTextKey)],
  };
}
function diagnosticRootSelection(filters: Record<string, string>, access?: DiagnosticAccess) {
  const clauses = ["(selection #>> '{parentId}') IS NULL"];
  const params: unknown[] = [];
  if (access) {
    const permitted = diagnosticPredicate(access);
    clauses.push(permitted.sql);
    params.push(...permitted.params);
  }
  const fields: Record<string, string> = { actor: 'actorName', route: 'route' };
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    if (key === 'search') {
      clauses.push('LOWER(payload) LIKE LOWER(?)');
      params.push(`%${value}%`);
    } else if (key === 'from' || key === 'to') {
      clauses.push(`started_at ${key === 'from' ? '>=' : '<='} ?`);
      params.push(value);
    } else if (key === 'stage') {
      clauses.push(
        "(selection #>> '{id}') IN (SELECT (selection #>> '{parentId}') FROM intelligence_calls WHERE LOWER((selection #>> '{kind}')) LIKE LOWER(?))",
      );
      params.push(diagnosticSelectionPattern(value));
    } else if (key === 'outcome') {
      // Panel labels cover both root status and finer dispositions such as cancelled.
      const term = `%${value.replace(/canceled/i, 'cancel')}%`;
      clauses.push(
        "(LOWER((selection ->> 'disposition')) LIKE LOWER(?) OR LOWER((selection ->> 'status')) LIKE LOWER(?))",
      );
      params.push(diagnosticSelectionPattern(value.replace(/canceled/i, 'cancel')), term);
    } else if (fields[key]) {
      clauses.push(`LOWER((selection ->> '${fields[key]}')) LIKE LOWER(?)`);
      params.push(diagnosticSelectionPattern(value));
    }
  }
  return { where: clauses.join(' AND '), params };
}
import { digest } from './content-digest.js';
import { randomUUID } from 'node:crypto';
export { digest } from './content-digest.js';
export const DATABASE_SCHEMA = '60';
// A checkpoint installs complete physical history; its pages cannot first pass
// ordinary append classification against the abandoned timeline.
const restoreDiffTables = new Set(
  [...RECORD_NODES.keys()].filter((table) => table !== 'mind_temporal_pages'),
);

export interface AttemptBudget {
  id: string;
  limitUsd: number;
}
export interface SqlDatabase {
  /** Transport grouping for explicitly independent writes; transaction semantics are unchanged. */
  readonly writeGroups: boolean;
  /** Synchronous health of the session owning the exclusive world-writer lock. */
  assertWriteAdmission(): void;
  /** Undefined adapters cannot prove whether shared committed reads are safe. */
  readonly transactionActive?: boolean;
  checkpointSource?: import('./checkpoint-worker-client.js').CheckpointSource;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  setLiveReadCuts?(provider: LiveReadCutsProvider): void;
  maintenanceTransaction?<T>(operation: () => Promise<T>): Promise<T>;
  readTransaction?<T>(operation: () => Promise<T>): Promise<T>;
  readForActor?<T>(worldId: string, actorId: string, operation: () => Promise<T>): Promise<T>;
  readAtCut?<T>(cut: LiveReadCuts, operation: () => Promise<T>): Promise<T>;
  /** Selected canonical metadata plus explicit pending merge, in the same
   * validated snapshot. Ordinary body/source readers keep the live overlay. */
  readMetadataBaseline?<T>(
    actorIds: readonly string[],
    operation: (baseline: MetadataBaseline) => Promise<T>,
  ): Promise<T>;
  afterCommit?(callback: () => void): void;
  afterRollback?(callback: () => void): void;
  exec(sql: string): Promise<void>;
  prepare(sql: string): {
    get(...params: any[]): Promise<Record<string, unknown> | undefined>;
    all(...params: any[]): Promise<Record<string, unknown>[]>;
    run(...params: any[]): Promise<unknown>;
  };
  close(): Promise<void>;
}

export interface SavedWorld {
  world: WorldState;
  /** Exact installed presentation content. Absent means bootstrap-only depiction. */
  presentationRelease?: AssetRevisionReference;
  presentationReleaseRevision?: number;
  speed: number;
  manuallyPaused: boolean;
  actorMilestones?: Record<string, Record<string, boolean>>;
}

/** Operational read providers retain actual native products, never a mutable
 * TypeScript world. They are installed only with the matching SQL authority. */
export interface NativeWorldProviders {
  readonly liveReadCuts: LiveReadCutsProvider;
  readonly retainedValues: (worldId: string) => Readonly<Record<string, unknown>>;
  readonly backgroundSearchAdmission: () => boolean;
}

/** Finite facts from a successfully validated native current-record install.
 * Publication cuts are independent of in-world occurrence sequences. */
export interface NativeCurrentWorldInstallation {
  readonly worldId: string;
  readonly generation: string;
  readonly revision: number;
  readonly acceptedCut: number;
  readonly historyEventCount: number;
  readonly memoryAllowance: Readonly<DerivedMemoryAllowance>;
}

export interface JobRecord extends AiJobView {
  /** Bounded trusted native-cue cut, resolved only with the accepted actor choice. */
  semanticCauses?: import('@open-legend/domain').SituationProposalBinding['semanticCauses'];
  decision?: DecisionState;
  authority?: RequestScope;
  responseReady?: boolean;
  diagnosticTrigger?: string;
  diagnosticTriggerType?: string;
  retryOf?: string;
  playerSpeechEventId?: string;
  triggerEvidenceId?: string;
  stimulusEvidenceIds?: string[];
  fingerprint: string;
  createdAt: number;
  request: {
    volume?: import('@open-legend/domain').SpeechVolume;
    text: string;
    action?: {
      /** Description-only player expression; never enter mechanical interpretation. */
      expression?: true;
      expressionLife?: number;
      mode: 'enqueue' | 'replace' | 'interrupt';
      targetId?: string;
      /** Original public current-body lease; loss/return cannot rebind a queued intention. */
      targetReference?: string;
      slots?: import('@open-legend/domain').IntentSlots;
      expectedPlan: number;
      targetEpisodes?: import('@open-legend/domain').ActionTargetEpisodes;
      timelineId: string;
    };
    npcId?: string;
    invention?: {
      mode?: 'workshop';
      episodeBudgetUsd?: number;
      candidate?: unknown;
      actorId: string;
      worldId: string;
      timelineId: string;
      conversationId?: string;
      authority: import('@open-legend/domain').InventionAuthority;
      rootId: string;
      depth: number;
      continuation?: import('@open-legend/protocol').InventionContinuation;
      previous?: {
        intent: string;
        feedback: string;
        candidate?: unknown;
      };
      base?: { recipeId: string; version: number; digest: string };
    };
  };
  invention?: {
    validation?: import('@open-legend/protocol').InventionValidationView;
    code: string;
    search?: import('@open-legend/protocol').InventionSearch;
    continuedBy?: string;
    candidateDigest?: string;
    candidate?: unknown;
    recipeId?: string;
  };
  result?: unknown;
  startedAt?: number;
  completedAt?: number;
  queueLatencyMs?: number;
  totalLatencyMs?: number;
}

function micro(usd: number): number {
  const amount = usdToMicroUsd(usd);
  if (amount === undefined) throw new Error('Invalid spending amount.');
  return amount;
}
function exposureTotal(value: unknown): bigint {
  const text = String(value);
  if (!/^\d+$/.test(text)) throw new Error('Invalid spending exposure.');
  return BigInt(text);
}

/** Record changes prepared for one exact baseline and expected revision. Preparation assigns
 * canonical list/map positions that history release then reuses, so it must precede release.
 * docs/projects/ordered-async-saves.md#ordering-rules */
export interface PreparedCommit {
  readonly baseline: SavedWorld | null;
  readonly revision: number;
  readonly state: SavedWorld;
  readonly changes: ReturnType<WorldRecords['prepare']>;
  readonly history: ReturnType<typeof prepareHistory>;
}

interface TableWrite {
  before: SavedWorld | null;
  state: SavedWorld;
  revision: number;
  inputs: CommitInputs;
}

/** The exact durable writer binding acquired by successful native adoption. */
export interface NativeWorldAdoption {
  readonly worldId: string;
  readonly generation: string;
  readonly revision: number;
  readonly acceptedCut: number;
}

/** Replaceable persistence boundary for committed world state. */
export interface WorldStore {
  /** Canonical changes have committed and their derived projections may refresh. */
  onProjection(listener: (changed?: boolean) => void): () => void;
  /** A successful nonnull load is current-format validated and has passed its
   * required history audit. Invalid storage throws before installation. */
  load(active?: boolean): Promise<{ revision: number; state: SavedWorld } | null>;
  commit(
    expectedRevision: number,
    state: SavedWorld,
    invalidatedMemoryIds?: Record<string, string[]>,
    appendEventCount?: number,
    historyProjection?: {
      before?: WorldState;
      after: WorldState;
      receipt?: GameplayReceipt;
      receipts?: readonly GameplayReceipt[];
      restore?: RestoreSave;
      authority?: AuthorityFence;
      authorityBindings?: readonly AccountBinding[];
      constructionSeeds?: readonly ConstructionPermission[];
      constructionChanges?: ConstructionPermissionChanges;
      constructionFences?: readonly { id: string; revision: number }[];
      campAssetFences?: readonly { id: string; revision: number }[];
      authorityOwners?: ReadonlyMap<string, string>;
      bindingChange?: { scope: RequestScope; request: BindingRequest; now: () => number };
      controlChange?: {
        scope: RequestScope;
        request: ControlRequest;
        now: () => number;
        unattended: boolean;
      };
      participationChange?: { actorId: string; attempt: ExitAttempt | null };
      prepared?: PreparedCommit;
      operationalChange?: () => Promise<void>;
    },
  ): Promise<number>;
  close(): Promise<void>;
}

export interface GameRepository extends WorldStore {
  /** Current health of the exclusively owned durable writer session. */
  assertWriteAdmission(): void;
  readonly ready: Promise<void>;
  setRetainedValueLookup?(provider: (worldId: string) => Readonly<Record<string, unknown>>): void;
  setLiveReadCuts?(provider: LiveReadCutsProvider): void;
  captureRetentionActors?(state: SavedWorld, kind: RetentionWorkKind): string[];
  prepareAccountRetention?(
    state: SavedWorld,
    pending: RecordChanges,
    cut?: LiveReadCuts,
    actorIds?: readonly string[],
  ): Promise<AccountRetentionPlan>;
  prepareSupportRetention?(
    state: SavedWorld,
    pending: RecordChanges,
    cut: LiveReadCuts | undefined,
    actorIds: readonly string[],
  ): Promise<AccountRetentionPlan>;
  eraseReceivedValues?(worldId: string, ids: readonly string[]): Promise<void>;
  prepareSourceEdit?(
    state: SavedWorld,
    before: SavedWorld,
  ): Promise<import('./temporal-storage.js').PreparedMemoryRetention>;
  prepareRetainedSourceClosure?(
    state: SavedWorld,
    complete?: boolean,
  ): Promise<import('./temporal-storage.js').PreparedMemoryRetention>;
  releaseHistory?(state: SavedWorld): SavedWorld;
  /** Same residency compaction as releaseHistory, without changing the durable baseline. */
  releasedHistory?(state: SavedWorld): SavedWorld;
  prepareCommit?(
    expectedRevision: number,
    state: SavedWorld,
    history: { before?: WorldState; after: WorldState },
    pending?: { changes: RecordChanges; history?: ReturnType<typeof prepareHistory> },
  ): PreparedCommit;
  adoptHistory?(original: SavedWorld, prepared: SavedWorld): void;
  hydrateHistory?(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld>;
  hydrateStatusEffectHistory?(state: SavedWorld): Promise<SavedWorld>;
  history?: HistoryRepository;
  saves?: GameSaves;
  commands?: CommandReceipts;
  authority?: AuthorityRepository;
  assets?: AssetRepository;
  vectors?: VectorStore;
  records?: WorldRecords;
  memories?: MemoryRepository;
  readonly persistence?: 'postgres';
  putIntelligenceCalls(calls: PreparedDiagnosticRecord[]): Promise<void>;
  intelligenceCalls(offset: number, access?: DiagnosticAccess): Promise<IntelligenceCall[]>;
  intelligenceCall(id: string): Promise<IntelligenceCall | undefined>;
  latestDiagnosticRootId(access?: DiagnosticAccess): Promise<string | undefined>;
  diagnosticRootSummaries(
    offset: number,
    filters: Record<string, string>,
    access?: DiagnosticAccess,
  ): Promise<DiagnosticRootSummary[]>;
  diagnosticStages(parentIds: string[], details?: boolean): Promise<IntelligenceCall[]>;
  getIntegration(key: string): Promise<unknown>;
  putIntegration(key: string, value: unknown): Promise<void>;
  getProfile(id: string): Promise<PlayerProfile>;
  setPreferences(id: string, preferences: PlayerPreferencePatch): Promise<PlayerProfile>;
  getJob(id: string): Promise<JobRecord | undefined>;
  getSpeechJob(eventId: string): Promise<JobRecord | undefined>;
  getSpeechJobs(eventIds: string[]): Promise<Map<string, JobRecord>>;
  putJob(job: JobRecord): Promise<void>;
  mutateDecision(
    id: string,
    change: (job: JobRecord) => Promise<JobRecord | undefined>,
  ): Promise<JobRecord | undefined>;
  consumeDecisionCursor(cursor: NonNullable<DecisionState['cursor']>): Promise<void>;
  activeDecision(
    worldId: string,
    timelineId: string,
    actorId: string,
    except: string,
  ): Promise<boolean>;
  decisionAttempts(rootJobId: string): Promise<LinkedDecisionAttempt[]>;
  occupiedDecisionSlots(): Promise<Pick<LinkedDecisionAttempt, 'attemptId' | 'executionClass'>[]>;
  onSettlement(listener: () => void): () => void;
  budgetAvailable(actorId: string, amountUsd: number, ceilingUsd: number): Promise<boolean>;
  markDecisionDispatch(attemptId: string): Promise<boolean>;
  claimInventionContinuation(job: JobRecord, parentId: string): Promise<boolean>;
  recentJobs(limit?: number): Promise<JobRecord[]>;
  inventionJobs(
    worldId: string,
    actorId: string,
    before?: { createdAt: number; id: string },
    selection?: { timelineId: string; limit?: number },
  ): Promise<JobRecord[]>;
  reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId?: string,
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
    decision?: DecisionAttemptLink,
  ): Promise<boolean>;
  attemptBudget(budgetId: string): Promise<AttemptBudgetSnapshot>;
  attemptReceipt(id: string): Promise<AiReceipt | undefined>;
  settle(id: string, receipt: AiReceipt): Promise<void>;
  recoverInterruptedWork(): Promise<void>;
  usage(ceilingUsd: number, actorId?: string): Promise<Pick<GameView['ai'], 'budget' | 'usage'>>;
}

/**
 * PostgreSQL game repository.
 * World snapshots and command receipts commit together. Paid attempts live outside the
 * simulated timeline, so reopening a save cannot repeat or erase provider usage.
 */
export class SqlGameRepository implements GameRepository {
  private readSourceClosure<T>(operation: () => Promise<T>): Promise<T> {
    const cut = this.liveReadCuts?.();
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    const read = () => snapshot(operation);
    return cut && this.db.readAtCut ? this.db.readAtCut(cut, read) : read();
  }
  /** Explicit corrections only prepare exact archived support; ordinary pool
   * eviction belongs to the due/pressure scheduler, not this privacy barrier. */
  async prepareSourceEdit(
    state: SavedWorld,
    before: SavedWorld,
  ): Promise<import('./temporal-storage.js').PreparedMemoryRetention> {
    return this.readSourceClosure(async () => {
      const changes = this.records.prepare(before, state, retainedSourceTables);
      const beforeChanges = this.records.prepare(
        this.acceptedState ?? undefined,
        before,
        retainedSourceTables,
      );
      const metadata = await this.retentionView(state, changes, false);
      const planned = await this.memories.prepareSourceVersionRetention(state, changes, {
        before: metadata.withChanges(beforeChanges),
      });
      return { state: planned.state, rows: new Map(), versions: planned.plan };
    });
  }
  async prepareRetainedSourceClosure(
    initial: SavedWorld,
    complete = false,
  ): Promise<import('./temporal-storage.js').PreparedMemoryRetention> {
    return this.readSourceClosure(async () => {
      let state = initial;
      const rows = new Map<string, string[]>(),
        positions = new Map<string, Map<string, number>>(),
        previous = new Map<string, Map<string, unknown>>();
      let preparedVersions: SourceVersionPlan | undefined;
      for (let round = 0; round < 4; round++) {
        if (preparedVersions) {
          const world = resetPreparedSourceVersionAccounting(state.world, preparedVersions);
          if (world !== state.world) state = { ...state, world };
        }
        if (!complete) this.records.stageRetirements(state, rows, positions, previous);
        // Retention joins only personal source changes. Preparing unrelated physical
        // and current-perception records again in each closure round repeats the save.
        const changes = complete
          ? this.records.captureMetadataRecords(state, retainedSourceTables)
          : this.records.prepare(this.acceptedState ?? undefined, state, retainedSourceTables);
        const metadata = await this.retentionView(state, changes, complete);
        const planned = await this.memories.prepareSourceVersionRetention(state, changes, {
          before: metadata.withChanges(),
          previous,
        });
        preparedVersions = planned.plan;
        const retained = await this.memories.prepareRetention(
          planned.state,
          complete,
          changes,
          metadata,
        );
        for (const [table, ids] of retained.rows)
          rows.set(table, [...new Set([...(rows.get(table) ?? []), ...ids])]);
        for (const [table, values] of retained.positions ?? []) {
          const target = positions.get(table) ?? new Map();
          for (const [id, value] of values) target.set(id, value);
          positions.set(table, target);
        }
        mergeRetirementPredecessors(previous, retained.previous);
        state = retained.state;
        if (!sourceVersionPreparationNeeded(planned.state.world, state.world)) {
          if (complete) this.records.stageRetirements(state, rows, positions, previous);
          return { state, rows, positions, previous, versions: planned.plan };
        }
      }
      throw new Error('Exact source closure cannot fit its complete retained account allowance.');
    });
  }
  private readonly projectionListeners = new Set<(changed?: boolean) => void>();
  onProjection(listener: (changed?: boolean) => void): () => void {
    this.projectionListeners.add(listener);
    return () => this.projectionListeners.delete(listener);
  }
  private readonly receivedOwnership: ReceivedValueOwnership;
  private readonly retentionActors = new RetentionActorSelection();
  private liveReadCuts?: LiveReadCutsProvider;
  private retainedValueLookup?: (worldId: string) => Readonly<Record<string, unknown>>;
  setRetainedValueLookup(provider: (worldId: string) => Readonly<Record<string, unknown>>): void {
    this.retainedValueLookup = provider;
  }
  private captureValueProtection(worldId: string): (id: string) => boolean {
    const native = this.retainedValueLookup?.(worldId) ?? {};
    const cuts = this.liveReadCuts?.();
    return (id) => {
      if (Object.hasOwn(native, id)) return true;
      if (cuts?.worldId === worldId)
        for (const cut of cuts.cuts)
          if (this.receivedOwnership.pendingReferences(cut.changes).has(id)) return true;
      return false;
    };
  }
  private cleanupTimer?: ReturnType<typeof setTimeout>;
  private cleanupTask?: Promise<void>;
  private cleanupWorld?: string;
  private closing = false;
  private scheduleValueCleanup(worldId: string, delay = 5000): void {
    this.cleanupWorld = worldId;
    if (this.closing || this.cleanupTimer || this.cleanupTask) return;
    this.cleanupTimer = setTimeout(() => {
      this.cleanupTimer = undefined;
      const selected = this.cleanupWorld ?? worldId;
      this.cleanupWorld = undefined;
      let more = false;
      this.cleanupTask = this.receivedOwnership
        .collect(selected, () => this.captureValueProtection(selected))
        .then((count) => {
          more = count > 0;
        })
        .catch((error) => {
          recordBackgroundFailure('world-commit', error);
        })
        .finally(() => {
          this.cleanupTask = undefined;
          const next = this.cleanupWorld ?? (more ? selected : undefined);
          this.cleanupWorld = undefined;
          // Yield after every bounded transaction; foreground saves use this same writer.
          if (next) this.scheduleValueCleanup(next, more ? 250 : 5000);
        });
    }, delay);
    this.cleanupTimer.unref();
  }
  setLiveReadCuts(provider: LiveReadCutsProvider): void {
    this.liveReadCuts = provider;
    this.db.setLiveReadCuts?.(provider);
  }
  /** Capture fair cohorts before asynchronous preparation so one finite source
   * watch covers exactly the actors whose maintenance will consume its proof. */
  captureRetentionActors(state: SavedWorld, kind: RetentionWorkKind): string[] {
    return this.retentionActors.select(state.world, kind);
  }
  async prepareAccountRetention(
    state: SavedWorld,
    pending: RecordChanges,
    cut?: LiveReadCuts,
    actorIds?: readonly string[],
  ): Promise<AccountRetentionPlan> {
    const dueAt = nextAccountRetentionAt(state.world);
    if (dueAt === null || dueAt > state.world.simTime)
      return { worldId: state.world.id, actors: [], rows: new Map() };
    const actors = actorIds ?? this.retentionActors.select(state.world, 'accounts'),
      selectedPending = selectActorRecordChanges(pending, actors);
    const metadata = new RetentionMetadata();
    const baseline = this.acceptedState;
    const operation = async () => {
      metadata.initialize(
        await metadata.capture(this.db, state.world.id, actors, {
          changes: selectedPending,
          world: state.world,
          previous: baseline?.world,
        }),
      );
      const beforeMetadata = metadata.view(state.world.id, selectedPending);
      return prepareAccountRetentionPlan(
        this.db,
        state,
        beforeMetadata,
        actors,
        selectedPending.deletes,
        async (prepared) => {
          this.records.stageRetirements(
            prepared.state,
            prepared.rows,
            prepared.positions,
            prepared.previous,
          );
          // The pending prefix is read context, not another mutation. Version
          // closure receives only this retirement's actual replacements/deletions.
          const changes = this.records.prepare(state, prepared.state, new Set(accountTables));
          if (!changes.writes.size && !changes.deletes.size)
            return { state: prepared.state, plan: { changes: [] } };
          return this.memories.prepareSourceVersionRetention(prepared.state, changes, {
            before: beforeMetadata,
            actorIds: actors,
            previous: prepared.previous,
          });
        },
      );
    };
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    // Candidate selection, reverse membership and source-version preparation must
    // share the captured durable head even when an ordinary save finishes meanwhile.
    const prepare = () => snapshot(operation);
    return cut && this.db.readAtCut
      ? this.db.readAtCut(
          selectActorLiveReadCuts(cut, actors, this.memories.captureSources.bind(this.memories)),
          prepare,
        )
      : prepare();
  }
  async eraseReceivedValues(worldId: string, ids: readonly string[]): Promise<void> {
    await this.receivedOwnership.erase(worldId, ids);
  }
  async prepareSupportRetention(
    state: SavedWorld,
    pending: RecordChanges,
    cut: LiveReadCuts | undefined,
    actorIds: readonly string[],
  ): Promise<AccountRetentionPlan> {
    return prepareSupportRetentionPlan(state, actorIds, async (requests) => {
      // Local/required/place ownership was checked before invoking this callback.
      // A support-only pass needs no due/pressure account catalogue or bodies.
      const selectedPending = selectActorRecordChanges(pending, actorIds);
      const operation = async () => {
        const metadata = new RetentionMetadata();
        const read = (baseline: MetadataBaseline) => {
          metadata.initializePartial(state.world, baseline);
          return metadata
            .view(state.world.id, selectedPending)
            .survivingMembershipBatch(this.db, state.world.id, requests, state.world);
        };
        if (this.db.readMetadataBaseline) return this.db.readMetadataBaseline(actorIds, read);
        const head = await this.db
          .prepare('SELECT world_id,revision FROM world_head WHERE id=1')
          .get();
        return read({ worldId: String(head?.['world_id']), revision: Number(head?.['revision']) });
      };
      const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
      const prepare = () => snapshot(operation);
      return cut && this.db.readAtCut
        ? this.db.readAtCut(
            selectActorLiveReadCuts(
              cut,
              actorIds,
              this.memories.captureSources.bind(this.memories),
            ),
            prepare,
          )
        : prepare();
    });
  }
  private async retentionView(
    state: SavedWorld,
    changes: RecordChanges,
    complete: boolean,
  ): Promise<RetentionMetadataView> {
    const metadata = new RetentionMetadata();
    if (complete) {
      metadata.fromRecords(
        state.world,
        this.records.captureMetadataRecords(state, retainedSourceTables),
      );
      metadata.assertCandidateCoverage(state.world);
      return metadata.view(state.world.id);
    }
    const accepted = this.acceptedState;
    const revision = this.acceptedRevision;
    const due = [...retentionDueActors(state.world)];
    const actors = new Set([...due, ...retentionChangedActors(changes, state.world)]);
    if (!accepted || !actors.size) {
      metadata.initializeEmpty(state.world);
      return metadata.view(state.world.id, changes);
    }
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    return snapshot(async () => {
      // Resolve only uncertain, dependency-free account IDs. A genuinely new
      // empty reflection needs no cold actor catalogue; an update still does.
      for (const table of accountTables) {
        const candidates = (changes.writes.get(table) ?? []).filter(
          (row) => !row.create && !accountWriteHasRetentionDependencies(table, row),
        );
        await this.records.proveRecordCreates(state.world.id, revision, table, candidates);
      }
      const selected = new Set([...due, ...retentionChangedActors(changes, state.world)]);
      if (!selected.size) metadata.initializeEmpty(state.world);
      else
        metadata.initialize(
          await metadata.capture(this.db, state.world.id, [...selected], {
            changes,
            world: state.world,
            previous: accepted.world,
          }),
        );
      return metadata.view(state.world.id, changes);
    });
  }
  private readonly settlementListeners = new Set<() => void>();
  onSettlement(listener: () => void): () => void {
    this.settlementListeners.add(listener);
    return () => this.settlementListeners.delete(listener);
  }
  private async exposure(actorId: string): Promise<bigint> {
    const date = new Date();
    const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    const row = await this.db
      .prepare(
        "SELECT COALESCE(SUM(spent + CASE WHEN status = 'reserved' THEN reserved ELSE 0 END), 0) AS total FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=? AND (s.actor_id=? OR s.actor_id IS NULL)",
      )
      .get(start, actorId);
    return exposureTotal(row?.['total'] ?? 0);
  }
  async budgetAvailable(actorId: string, amountUsd: number, ceilingUsd: number): Promise<boolean> {
    await this.ready;
    return (await this.exposure(actorId)) + BigInt(micro(amountUsd)) <= BigInt(micro(ceilingUsd));
  }
  readonly creationTargets: CreationTargetRepository;
  readonly commands: CommandReceipts;
  readonly authority: AuthorityRepository;
  readonly invites: InviteRepository;
  readonly maintenance: MaintenanceRepository;
  readonly db: SqlDatabase;
  readonly records: WorldRecords;
  readonly memories: MemoryRepository;
  private readonly integrationValues: IntegrationValues;
  private acceptedRevision = -1;
  private acceptedState: SavedWorld | null = null;
  private capturedOwner?: { worldId: string; generation: string; through: number };
  /** Set when a commit rolled back after replacing the baseline. The live world may have
   * released history since, so reloading a complete baseline and diffing against it could
   * delete evicted rows; only an explicit load (restart) may continue. */
  private baselineLost = false;
  private intelligenceWrites = 0;
  vectors?: VectorStore;
  get persistence() {
    return 'postgres' as const;
  }
  assertWriteAdmission(): void {
    if (this.closing) throw new Error('The database writer is unavailable for new gameplay.');
    this.db.assertWriteAdmission();
  }

  async intelligenceCall(id: string): Promise<IntelligenceCall | undefined> {
    await this.ready;

    const row = await this.db
      .prepare('SELECT payload FROM intelligence_calls WHERE id = ?')
      .get(id);
    return row ? (JSON.parse(String(row['payload'])) as IntelligenceCall) : undefined;
  }
  async putIntelligenceCalls(calls: PreparedDiagnosticRecord[]): Promise<void> {
    await this.ready;
    if (!calls.length) return;
    await insertRows(
      this.db,
      'intelligence_calls (id,started_at,payload,selection,summary,stage)',
      (function* () {
        for (const call of calls) {
          const projected = diagnosticStorage(call.value);
          yield [
            call.id,
            call.startedAt,
            call.json,
            projected.selection,
            projected.summary,
            projected.stage,
          ];
        }
      })(),
      'ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,selection=excluded.selection,summary=excluded.summary,stage=excluded.stage',
    );
    // Diagnostic retention is approximate between periodic pruning passes.
    const previous = this.intelligenceWrites;
    this.intelligenceWrites += calls.length;
    if (Math.floor(previous / 25) !== Math.floor(this.intelligenceWrites / 25))
      await this.db.exec(
        'DELETE FROM intelligence_calls WHERE id IN (SELECT id FROM intelligence_calls ORDER BY started_at DESC, id DESC LIMIT 1000000 OFFSET 1000)',
      );
  }
  async intelligenceCalls(offset: number, access?: DiagnosticAccess): Promise<IntelligenceCall[]> {
    await this.ready;
    const permitted = access ? diagnosticPredicate(access) : undefined;
    const roots = permitted
      ? `SELECT selection #>> '{id}' FROM intelligence_calls WHERE (selection #>> '{parentId}') IS NULL AND ${permitted.sql}`
      : '';
    const filter = permitted
      ? ` WHERE (selection #>> '{id}') IN (${roots}) OR (selection #>> '{parentId}') IN (${roots})`
      : '';
    const rows = await this.db
      .prepare(
        `SELECT payload FROM intelligence_calls${filter} ORDER BY started_at DESC,id DESC LIMIT 25 OFFSET ?`,
      )
      .all(...(permitted ? [...permitted.params, ...permitted.params] : []), offset);
    return rows.map((row) => JSON.parse(String(row['payload'])) as IntelligenceCall);
  }

  async latestDiagnosticRootId(access?: DiagnosticAccess): Promise<string | undefined> {
    await this.ready;
    const selection = diagnosticRootSelection({}, access);
    const row = await this.db
      .prepare(
        `SELECT id FROM intelligence_calls WHERE ${selection.where} ORDER BY started_at DESC,id DESC LIMIT 1`,
      )
      .get(...selection.params);
    return row ? String(row['id']) : undefined;
  }
  async diagnosticRootSummaries(
    offset: number,
    filters: Record<string, string>,
    access?: DiagnosticAccess,
  ): Promise<DiagnosticRootSummary[]> {
    await this.ready;
    const selection = diagnosticRootSelection(filters, access);
    const rows = await this.db
      .prepare(
        `SELECT summary FROM intelligence_calls WHERE ${selection.where} ORDER BY started_at DESC,id DESC LIMIT 26 OFFSET ?`,
      )
      .all(...selection.params, offset);
    return rows.map((row) => JSON.parse(String(row['summary'])) as DiagnosticRootSummary);
  }
  async diagnosticStages(parentIds: string[], details = false): Promise<IntelligenceCall[]> {
    await this.ready;

    if (!parentIds.length) return [];
    const field = details ? 'payload' : 'stage';
    const rows = await this.db
      .prepare(
        `SELECT ${field} FROM intelligence_calls WHERE (selection #>> '{parentId}') IN (${parentIds.map(() => '?').join(',')}) ORDER BY started_at,id LIMIT 1000`,
      )
      .all(...parentIds.map(sqlTextKey));
    return rows.map((row) => JSON.parse(String(row[field])) as IntelligenceCall);
  }

  readonly history: HistoryRepository;
  readonly saves: GameSaves;
  readonly assets: AssetRepository;
  constructor(
    dataDirectory: string,
    database: SqlDatabase,
    private readonly initialization: { preserveSaveStages?: boolean } = {},
  ) {
    this.db = database;
    this.integrationValues = new IntegrationValues(this.db);
    this.records = new WorldRecords(this.db);
    this.receivedOwnership = new ReceivedValueOwnership(this.db);
    this.memories = new MemoryRepository(this.db, (state, pending, complete) =>
      this.retentionView(
        state,
        pending ??
          (complete
            ? this.records.captureMetadataRecords(state, retainedSourceTables)
            : this.records.prepare(this.acceptedState ?? undefined, state, retainedSourceTables)),
        complete,
      ),
    );
    this.history = new HistoryRepository(this.db);
    this.history.setSourceAccess(
      (worldId, actorId) => !this.memories.sourceEditPending({ worldId, actorId }),
      (worldId, actorId) => this.memories.sourceAccessRevision({ worldId, actorId }),
      (worldId, actorId) =>
        this.liveReadCuts?.({ worldId, actorId })?.historyEligibility?.get(actorId),
    );
    this.saves = new GameSaves(this.db, join(dataDirectory, 'saves'), database.checkpointSource);
    // Authority and exact retry receipts share the direct transaction owner.
    this.commands = new CommandReceipts(database);
    this.authority = new AuthorityRepository(database);
    this.invites = new InviteRepository(this.db);
    this.maintenance = new MaintenanceRepository(this.db);
    this.assets = new AssetRepository(this.db);
    this.creationTargets = new CreationTargetRepository(this.db);
    this.ready = this.initialize();
  }

  readonly ready: Promise<void>;
  private async initialize() {
    await this.db.transaction(async () => {
      // Reject old layouts before any table/index initialization can modify them.
      // Runtime never converts or deletes incompatible data. An agent may prepare
      // replacement development state under AGENTS.md#development-save-policy.
      const existing = await this.db
        .prepare("SELECT to_regclass('open_legend.meta') AS relation")
        .get();
      if (existing?.['relation']) {
        const version = await this.db.prepare('SELECT value FROM meta WHERE key=?').get('schema');
        if (version?.['value'] !== DATABASE_SCHEMA)
          throw new Error(
            `Unsupported database schema: stored ${String(version?.['value'] ?? 'missing')}, required ${DATABASE_SCHEMA}. Existing data was not changed. Follow README.md's development database recovery guidance; do not edit the stored schema marker.`,
          );
      }
      // The asset CLI owns its catalog independently of a gameplay database marker.
      // Fresh gameplay may share that current catalog; every other unversioned table
      // still refuses before initialization. docs/asset-workflow.md#publish-an-exact-revision
      if (
        !existing?.['relation'] &&
        (await this.db
          .prepare(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='open_legend' AND NOT (table_name = ANY(?::text[])) LIMIT 1",
          )
          // Artwork and access have independent owners and can be installed
          // before a game's first initialization. Any unmarked game/storage
          // table still refuses startup; this never admits an older world.
          .get([...ASSET_TABLES, ...AUTHORITY_TABLES]))
      )
        throw new Error('Database schema marker is missing. Existing data was not changed.');
      const schema = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, selection JSONB NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_inventor ON jobs ((selection #>> '{request,invention,worldId}'), (selection #>> '{request,invention,actorId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_speech_event ON jobs ((selection #>> '{playerSpeechEventId}')) WHERE (selection #>> '{kind}') = 'chat';
      CREATE INDEX IF NOT EXISTS jobs_inventor_timeline ON jobs ((selection #>> '{request,invention,worldId}'), (selection #>> '{request,invention,actorId}'), (selection #>> '{request,invention,timelineId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_unfinished ON jobs(id) WHERE (selection #>> '{status}') IN ('queued','judging','generating');
      CREATE UNIQUE INDEX IF NOT EXISTS decision_actor_active ON jobs
        ((selection #>> '{decision,worldId}'), (selection #>> '{decision,timelineId}'), (selection #>> '{decision,actorId}'))
        WHERE (selection #>> '{decision,higher,state}') IN ('queued','preparing','reserved','dispatched');
      CREATE INDEX IF NOT EXISTS decision_unfinished ON jobs(id)
        WHERE (selection #>> '{decision,phase}') IN ('immediate','waiting-primary','higher');
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, status TEXT NOT NULL,
        reserved BIGINT NOT NULL CHECK (reserved >= 0), spent BIGINT NOT NULL DEFAULT 0 CHECK (spent >= 0),
        receipt TEXT, created_at BIGINT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cognition_attempt_links (
        attempt_id TEXT PRIMARY KEY REFERENCES attempts(id), root_job_id TEXT NOT NULL,
        category TEXT NOT NULL, level INTEGER, stage TEXT NOT NULL,
        execution_class TEXT NOT NULL CHECK(execution_class IN ('primary','background')),
        dispatch_intent BOOLEAN NOT NULL DEFAULT false
      );
      CREATE INDEX IF NOT EXISTS cognition_attempt_root ON cognition_attempt_links(root_job_id,attempt_id);
      CREATE INDEX IF NOT EXISTS attempts_unsettled ON attempts(id) WHERE status IN ('reserved','uncertain');
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at,id);
      CREATE TABLE IF NOT EXISTS attempt_scopes (attempt_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempt_budgets (attempt_id TEXT PRIMARY KEY, budget_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS attempt_budget_scope ON attempt_budgets(budget_id, attempt_id);
      CREATE INDEX IF NOT EXISTS attempt_actor ON attempt_scopes(actor_id,attempt_id);
      CREATE TABLE IF NOT EXISTS intelligence_calls (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, payload TEXT NOT NULL, selection JSONB NOT NULL, summary TEXT NOT NULL, stage TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS intelligence_calls_time ON intelligence_calls(started_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS intelligence_calls_parent_time ON intelligence_calls((selection #>> '{parentId}'), started_at DESC, id DESC);
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS player_profiles (
        id TEXT PRIMARY KEY, revision BIGINT NOT NULL,
        show_unavailable_actions BIGINT NOT NULL CHECK (show_unavailable_actions IN (0, 1)),
        pause_when_hidden BIGINT NOT NULL DEFAULT 1 CHECK (pause_when_hidden IN (0, 1))
      );
    `;
      await this.db.exec(schema);

      this.vectors = new VectorStore(this.db);
      await this.vectors.initialize();

      await this.records.initialize();
      await this.receivedOwnership.initialize();
      await this.memories.initialize();
      await new WorldAgentStore(this.db).initialize();
      await this.history.initialize();
      // An awaiting target must refuse retained files before ordinary startup cleanup.
      await this.saves.initialize(!this.initialization.preserveSaveStages);
      await this.commands.initialize();
      await this.authority.initialize();
      await this.assets.initialize();
      await this.invites.initialize();
      await this.maintenance.initialize();
      await this.creationTargets.initialize();
      await this.db
        .prepare('INSERT INTO meta VALUES (?, ?) ON CONFLICT(key) DO NOTHING')
        .run('schema', DATABASE_SCHEMA);
    });
    // Resume persisted cleanup hints without hydrating history or value bodies.
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    await snapshot(async () => {
      const head = await this.db.prepare('SELECT world_id FROM world_head WHERE id=1').get();
      if (head) {
        const worldId = String(head['world_id']);
        this.scheduleValueCleanup(worldId);
      }
    });
    // Resume derived search work only after initialization has released the writer.
    this.memories.lexicalCommitted();
  }

  releaseHistory(state: SavedWorld): SavedWorld {
    if (state !== this.acceptedState)
      throw new Error('Only committed history may leave the working set.');
    const released = this.releasedHistory(state);
    this.acceptedState = released;
    return released;
  }
  releasedHistory(state: SavedWorld): SavedWorld {
    const world = compactContributionHistory(
      compactAppraisalHistory(
        compactObjectHistory(
          compactHistory(releaseSavedTemporalHistory(state.world, this.acceptedState?.world)),
        ),
      ),
    );
    inheritSavedTemporalTails(this.acceptedState?.world, world);
    return { ...state, world };
  }
  /** Preparation half of a snapshot's commit, computed immediately inside the mutation queue
   * (no I/O); the transaction consumes it later, for example in a background save. */
  prepareCommit(
    expectedRevision: number,
    state: SavedWorld,
    history: { before?: WorldState; after: WorldState },
    pending?: { changes: RecordChanges; history?: ReturnType<typeof prepareHistory> },
  ): PreparedCommit {
    if (this.acceptedRevision !== expectedRevision)
      throw new Error('Save conflict: the committed baseline changed before preparation.');
    this.memories.configureWorld(state.world);
    const baseline = this.acceptedState;
    return {
      baseline,
      revision: expectedRevision,
      state,
      changes: timedSync(
        'persistence.prepareRecords',
        () => pending?.changes ?? this.records.prepare(baseline ?? undefined, state),
      ),
      history:
        pending?.history ??
        this.prepareHistoryWrite(
          history.before ?? baseline?.world,
          history.after,
          history.before ? 'selected' : 'resident',
        ),
    };
  }
  // The world writer owns this immutable candidate. Do not eagerly encode a second full burst;
  // prepare lookup inputs here, then stream bounded rows within the atomic transaction.
  private prepareHistoryWrite(
    historyBefore: WorldState | undefined,
    historyAfter: WorldState,
    scope: 'resident' | 'selected' | 'restore',
  ) {
    const appendCount = historyBefore
      ? provenAppendCount(historyBefore.events, historyAfter.events)
      : undefined;
    if (
      scope === 'resident' &&
      (historyBefore?.archivedEventCount ?? 0) > 0 &&
      appendCount === undefined
    )
      throw new Error('History edits require their explicit predecessor scope.');
    // The commit owner captures immutable history intent once. Residency release
    // can replace the durable predecessor before this intent reaches SQL.
    // docs/projects/bookkeeping-simplification-runtime-design.md#r1--apply-the-history-change-that-was-actually-admitted
    freezeWorld(historyAfter);
    if (historyBefore) freezeWorld(historyBefore);
    return prepareHistory(historyBefore, historyAfter, appendCount);
  }
  adoptHistory(original: SavedWorld, prepared: SavedWorld): void {
    if (original !== this.acceptedState || original.world.id !== prepared.world.id)
      throw new Error('Prepared history no longer matches the committed world.');
    // Hydration can add mutable branches. Seal the owned predecessor once so a
    // later deferred save can retain its immutable history intent; already frozen
    // branches stop traversal. docs/save-and-load.md#current-history-capture-boundary
    freezeWorld(prepared.world);
    inheritSavedTemporalTails(original.world, prepared.world);
    this.acceptedState = prepared;
  }
  async hydrateHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    if (state !== this.acceptedState) throw new Error('Flush before materializing history.');
    const full = await this.records.withHistory(state, actorIds, sourceIds);
    this.adoptHistory(state, full);
    return full;
  }
  async hydrateStatusEffectHistory(state: SavedWorld): Promise<SavedWorld> {
    if (state !== this.acceptedState)
      throw new Error('Flush before materializing condition history.');
    const full = await this.records.withStatusEffectHistory(state);
    this.adoptHistory(state, full);
    return full;
  }
  async load(active = false): Promise<{ revision: number; state: SavedWorld } | null> {
    if (this.capturedOwner)
      throw new Error(
        'A resident native world requires direct record capture, not a TypeScript world load.',
      );
    await this.ready;
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    const captured = await snapshot(async () => {
      const loaded = await this.records.load(active);
      if (!loaded) return null;
      await this.receivedOwnership.validate(
        loaded.state.world.id,
        active ? 'physical' : 'retained',
      );
      return {
        canonical: loaded,
        historyCount: await (active
          ? this.history.retainedEventCount(loaded.state.world.id)
          : this.history.auditEventCount(loaded.state.world.id)),
      };
    });
    if (this.capturedOwner)
      throw new Error('A native world acquired the writer while this source load was pending.');
    if (captured) {
      const { canonical, historyCount } = captured;
      const state = canonical.state;
      // These independently reconstructed values share one database cut. Heavy
      // synchronous validation needs no SQL and must not occupy its reader lane.
      assertAssetBinding(state.presentationRelease, state.presentationReleaseRevision);
      validateCurrentWorldState(state.world);
      this.memories.configureWorld(state.world);
      await this.memories.enforceDerivedWorld(state.world.id);
      if (historyCount !== (state.world.archivedEventCount ?? 0) + state.world.events.length)
        throw new Error(
          'Archived history coverage disagrees with the records; restore the complete database.',
        );
      // Accepted canonical records are immutable predecessors. Physical evidence
      // page layouts must survive the next diff, including direct store callers.
      freezeWorld(state.world);
      if (this.capturedOwner)
        throw new Error('A native world acquired the writer while this source load was pending.');
      // A failed read, audit or validation cannot restore a lost incremental baseline.
      this.baselineLost = false;
      // The validated SQL snapshot is already committed; publish its placement
      // cut just like a successful writer, never an arbitrary live wrapper.
      recordSavedTemporalPages(state.world, state.world, []);
      this.acceptedState = canonical.state;
      this.acceptedRevision = canonical.revision;
      return { revision: canonical.revision, state };
    }
    this.baselineLost = false;
    this.acceptedState = null;
    this.acceptedRevision = 0;
    return null;
  }

  private readonly readyHistoryWorlds = new Set<string>();
  /** Adopt a fresh native cold install without constructing a Source world.
   * The native handle stays private until this current SQL/head/ownership check
   * succeeds. A previously used or lost baseline requires its actual recovery,
   * never reinterpreting current rows as a replacement incremental predecessor. */
  async adoptNativeCurrentWorld(
    input: NativeCurrentWorldInstallation,
    providers: NativeWorldProviders,
  ): Promise<NativeWorldAdoption> {
    const installed = {
      worldId: input.worldId,
      generation: input.generation,
      revision: input.revision,
      acceptedCut: input.acceptedCut,
      historyEventCount: input.historyEventCount,
    };
    const allowance: DerivedMemoryAllowance = {
      worldId: input.memoryAllowance.worldId,
      policyId: input.memoryAllowance.policyId,
      policyVersion: input.memoryAllowance.policyVersion,
      maxBytes: input.memoryAllowance.maxBytes,
      hardBytes: input.memoryAllowance.hardBytes,
      lowBytes: input.memoryAllowance.lowBytes,
    };
    const capturedProviders: NativeWorldProviders = {
      liveReadCuts: providers.liveReadCuts,
      retainedValues: providers.retainedValues,
      backgroundSearchAdmission: providers.backgroundSearchAdmission,
    };
    await this.ready;
    this.assertWriteAdmission();
    const fresh = () =>
      !this.capturedOwner &&
      !this.acceptedState &&
      this.acceptedRevision === -1 &&
      !this.baselineLost;
    if (
      !fresh() ||
      !installed.worldId ||
      !installed.generation ||
      [installed.revision, installed.acceptedCut, installed.historyEventCount].some(
        (value) => !Number.isSafeInteger(value) || value < 0,
      ) ||
      allowance.worldId !== installed.worldId
    )
      throw new Error('Native cold installation no longer owns a fresh current-record writer.');
    await this.db.transaction(async () => {
      const head = await this.records.head();
      if (
        !head ||
        head.worldId !== installed.worldId ||
        head.revision !== installed.revision ||
        head.generation !== installed.generation
      )
        throw new Error('Native installation no longer matches the committed world head.');
      await this.receivedOwnership.validate(installed.worldId, 'retained');
      if (
        (await this.history.retainedEventCount(installed.worldId)) !== installed.historyEventCount
      )
        throw new Error('Native installation history coverage disagrees with current storage.');
    });
    this.memories.configureAllowance(allowance);
    await this.memories.enforceDerivedWorld(installed.worldId);
    // An awaited Source load or another installation cannot publish over this
    // handoff. Finish fallible maintenance first; no await separates the final
    // ownership check and publication of the native writer.
    this.assertWriteAdmission();
    if (!fresh())
      throw new Error(
        'Native cold installation lost its current-record writer during preparation.',
      );
    this.installNativeOwner(
      installed.worldId,
      installed.revision,
      installed.generation,
      installed.acceptedCut,
      capturedProviders,
    );
    return Object.freeze({
      worldId: installed.worldId,
      generation: installed.generation,
      revision: installed.revision,
      acceptedCut: installed.acceptedCut,
    });
  }

  /** Called only after the host installs the validated native authority. Failed
   * installation leaves the loaded predecessor and its writer baseline intact. */
  releaseLoadedWorld(
    worldId: string,
    revision: number,
    generation: string,
    acceptedCut: number,
    providers: NativeWorldProviders,
  ): void {
    this.assertWriteAdmission();
    if (
      this.capturedOwner ||
      this.baselineLost ||
      !Number.isSafeInteger(revision) ||
      revision < 0 ||
      this.acceptedRevision !== revision ||
      this.acceptedState?.world.id !== worldId ||
      !generation ||
      !Number.isSafeInteger(acceptedCut) ||
      acceptedCut < 0
    )
      throw new Error('Loaded world no longer matches the installed native authority.');
    // Native publication cuts and in-world occurrence sequences have separate
    // owners. A cold world can already contain many events before native cut 0.
    this.installNativeOwner(worldId, revision, generation, acceptedCut, providers);
  }
  private installNativeOwner(
    worldId: string,
    revision: number,
    generation: string,
    acceptedCut: number,
    providers: NativeWorldProviders,
  ): void {
    this.setLiveReadCuts(providers.liveReadCuts);
    this.setRetainedValueLookup(providers.retainedValues);
    this.memories.setBackgroundSearchAdmission(providers.backgroundSearchAdmission);
    this.capturedOwner = { worldId, generation, through: acceptedCut };
    this.acceptedState = null;
    this.acceptedRevision = revision;
  }

  /** Apply one complete immutable native save cut through the same ordered SQL
   * owner. The host owns admission, prepared pre-effect facts and save capacity. */
  async commitCaptured(
    expectedRevision: number,
    inputs: CommitInputs,
    cut: {
      generation: string;
      through: number;
      authority?: AuthorityFence;
      receipt?: GameplayReceipt;
      receipts?: readonly GameplayReceipt[];
      operationalChange?: () => Promise<void>;
    },
  ): Promise<{ revision: number; generation: string; through: number }> {
    await this.ready;
    this.assertWriteAdmission();
    const owner = this.capturedOwner;
    if (
      !owner ||
      owner.worldId !== inputs.worldId ||
      owner.generation !== cut.generation ||
      this.acceptedRevision !== expectedRevision ||
      this.baselineLost ||
      !Number.isSafeInteger(cut.through) ||
      cut.through < owner.through
    )
      throw new Error('Captured save no longer matches its installed world and durable prefix.');
    if (
      inputs.history.worldId !== inputs.worldId ||
      inputs.sources.worldId !== inputs.worldId ||
      inputs.sources.changes !== inputs.changes ||
      inputs.history.restore !== inputs.restore
    )
      throw new Error('Captured save products belong to different cuts.');
    if (inputs.restore)
      throw new Error('Native checkpoint installation requires its protected restore transition.');
    let publicationDeferred = false;
    const publish = () => this.publishCommitInputs(inputs);
    const revision = await timed('persistence.transaction', () =>
      this.db.transaction(async () => {
        if (cut.authority) await this.authority.assertFence(cut.authority);
        await cut.operationalChange?.();
        const revision = await this.records.advance(inputs.worldId, expectedRevision);
        if (cut.receipt) await this.commands.save(inputs.worldId, cut.receipt);
        if (cut.receipts?.length) await this.commands.saveBatch(inputs.worldId, cut.receipts);
        await this.applyCommitPrivacy(inputs);
        await this.applyCommitInputs(inputs, revision);
        this.db.afterRollback?.(() => {
          this.acceptedRevision = -1;
          this.baselineLost = true;
          this.readyHistoryWorlds.clear();
        });
        this.acceptedRevision = revision;
        this.capturedOwner = { ...owner, through: cut.through };
        if (this.db.afterCommit) {
          this.db.afterCommit(publish);
          publicationDeferred = true;
        }
        return revision;
      }),
    );
    if (!publicationDeferred) publish();
    return { revision, generation: cut.generation, through: cut.through };
  }

  async commit(
    expectedRevision: number,
    state: SavedWorld,
    invalidatedMemoryIds?: Record<string, string[]>,
    appendEventCount?: number,
    historyProjection?: {
      before?: WorldState;
      after: WorldState;
      receipt?: GameplayReceipt;
      receipts?: readonly GameplayReceipt[];
      restore?: RestoreSave;
      authority?: AuthorityFence;
      authorityBindings?: readonly AccountBinding[];
      constructionSeeds?: readonly ConstructionPermission[];
      constructionChanges?: ConstructionPermissionChanges;
      constructionFences?: readonly { id: string; revision: number }[];
      campAssetFences?: readonly { id: string; revision: number }[];
      authorityOwners?: ReadonlyMap<string, string>;
      bindingChange?: { scope: RequestScope; request: BindingRequest; now: () => number };
      controlChange?: {
        scope: RequestScope;
        request: ControlRequest;
        now: () => number;
        unattended: boolean;
      };
      participationChange?: { actorId: string; attempt: ExitAttempt | null };
      prepared?: PreparedCommit;
      /** Operational records that must commit with this world change (invite enrollment). */
      operationalChange?: () => Promise<void>;
    },
  ): Promise<number> {
    if (this.capturedOwner)
      throw new Error('Resident native state must be saved through its captured record cut.');
    await this.ready;
    if (this.acceptedRevision !== expectedRevision) {
      if (this.baselineLost)
        throw new Error(
          'The committed baseline is unknown after a failed save; restart to reload it.',
        );
      const persisted = await this.load();
      if ((persisted?.revision ?? 0) !== expectedRevision)
        throw new Error('Save conflict: another writer changed this world.');
    }
    const historyAfter = historyProjection?.after ?? state.world;
    if (
      historyAfter.id !== state.world.id ||
      (historyProjection?.before && historyProjection.before.id !== state.world.id)
    )
      throw new Error('History scope belongs to another world.');
    // A restore diffs against the complete stored world. If it fails before its rollback hook
    // runs (refused admission, a fence failure), the released baseline must come back: a later
    // commit diffing the released live world against the complete one would delete cold rows.
    const releasedBaseline = this.acceptedState;
    if (
      historyProjection?.restore &&
      releasedBaseline &&
      state.world.nextId < releasedBaseline.world.nextId
    )
      throw new Error('Restoration must preserve already allocated native identities.');
    const restoreBaseline = historyProjection?.restore
      ? ((await this.records.load())?.state ?? null)
      : undefined;
    if (restoreBaseline) freezeWorld(restoreBaseline.world);
    if (historyProjection?.restore) this.acceptedState = restoreBaseline ?? null;
    this.memories.configureWorld(state.world);
    const prepared = historyProjection?.prepared;
    // A prepared change set is valid only against the exact baseline it was diffed from.
    if (
      prepared &&
      (prepared.state !== state ||
        prepared.revision !== expectedRevision ||
        prepared.baseline !== this.acceptedState ||
        this.acceptedRevision !== expectedRevision ||
        prepared.history.world !== historyAfter ||
        !Object.isFrozen(historyAfter) ||
        (!!prepared.history.previous && !Object.isFrozen(prepared.history.previous)) ||
        historyProjection?.restore)
    )
      throw new Error('Prepared world changes no longer match the committed baseline.');
    const historyBefore = historyProjection?.before ?? this.acceptedState?.world;
    const preparedHistory =
      prepared?.history ??
      this.prepareHistoryWrite(
        historyBefore,
        historyAfter,
        historyProjection?.restore
          ? 'restore'
          : historyProjection?.before
            ? 'selected'
            : 'resident',
      );
    appendEventCount = this.acceptedState
      ? provenAppendCount(this.acceptedState.world.events, state.world.events)
      : undefined;
    const nativeChanges =
      prepared?.changes ??
      timedSync('persistence.prepareRecords', () =>
        this.records.prepare(
          this.acceptedState ?? undefined,
          state,
          historyProjection?.restore ? restoreDiffTables : undefined,
        ),
      );
    const sameWorldBaseline =
      !historyProjection?.restore && this.acceptedState?.world.id === state.world.id;
    const acknowledgedBefore = sameWorldBaseline
      ? acknowledgedTemporalOrder(this.acceptedState!.world)
      : undefined;
    if (sameWorldBaseline && acknowledgedBefore === undefined)
      throw new Error('The committed temporal allocation cut is unavailable.');
    const changes = materializeTemporalChanges(nativeChanges, state.world, acknowledgedBefore);
    if (historyProjection?.restore) {
      // Installation replaces recent history, including physically retained but
      // logically retired rows absent from the complete readable predecessor.
      // Reinsert the checkpoint's complete batches instead of diffing that gap.
      const tables = new Set(['mind_temporal_pages']);
      const replacement = materializeTemporalChanges(
        this.records.prepare(undefined, state, tables),
        state.world,
        undefined,
      );
      for (const table of tables) {
        changes.rows -= changes.writes.get(table)?.length ?? 0;
        const rows = replacement.writes.get(table) ?? [];
        changes.writes.set(table, rows);
        changes.rows += rows.length;
        changes.deletes.delete(table);
      }
      changes.savedTemporalPages = replacement.savedTemporalPages ?? [];
      changes.savedTemporalActors = replacement.savedTemporalActors ?? [];
    }
    let committedRevision = expectedRevision;
    const historyKey = `history-schema:${state.world.id}`;
    const historyReady =
      this.readyHistoryWorlds.has(state.world.id) ||
      !!(await this.integrationValues.get(historyKey));
    const inputs = this.captureCommitInputs(
      this.acceptedState,
      state,
      changes,
      preparedHistory,
      historyReady ? (historyProjection?.before ?? this.acceptedState?.world) : undefined,
      historyAfter,
      !!historyProjection?.restore,
      invalidatedMemoryIds,
    );
    const write: TableWrite = {
      before: this.acceptedState,
      state,
      revision: expectedRevision + 1,
      inputs,
    };
    const publish = () => this.publishWorldTables(write);
    let publicationDeferred = false;
    const transaction = timed('persistence.transaction', () =>
      this.db.transaction(async () => {
        for (const permission of historyProjection?.constructionSeeds ?? [])
          await this.authority.seedConstruction(permission);
        if (historyProjection?.constructionChanges) {
          const timelineKey = `world-timeline:${state.world.id}`;
          let timelineId = historyProjection.restore?.timeline;
          if (!timelineId) {
            timelineId = (await this.getIntegration(timelineKey)) as string | undefined;
            if (!timelineId) {
              timelineId = randomUUID();
              await this.putIntegration(timelineKey, timelineId);
            }
          }
          await this.authority.applyConstructionChanges(
            state.world,
            historyProjection.constructionChanges,
            historyProjection.constructionFences ?? [],
            timelineId,
          );
        } else if (historyProjection?.constructionFences?.length)
          await this.authority.assertConstruction(
            state.world.id,
            historyProjection.constructionFences,
          );
        if (historyProjection?.campAssetFences?.length)
          await this.authority.assertCampAssets(state.world.id, historyProjection.campAssetFences);
        for (const binding of historyProjection?.authorityBindings ?? [])
          await this.authority.provision(state.world.id, binding);
        for (const [actorId, accountId] of historyProjection?.authorityOwners ?? [])
          await this.authority.retainActorOwner(state.world.id, actorId, accountId);
        if (historyProjection?.authority)
          await this.authority.assertFence(historyProjection.authority);
        if (historyProjection?.bindingChange) {
          const { scope, request, now } = historyProjection.bindingChange;
          await this.authority.rebind(scope, request, now);
        }
        if (historyProjection?.controlChange) {
          const { scope, request, now, unattended } = historyProjection.controlChange;
          await this.authority.changeControl(scope, request, now, unattended);
        }
        if (historyProjection?.participationChange) {
          const { actorId, attempt } = historyProjection.participationChange;
          await this.authority.saveExit(state.world.id, actorId, attempt);
        }
        await historyProjection?.operationalChange?.();
        const revision = await this.records.advance(
          state.world.id,
          expectedRevision,
          !!historyProjection?.restore,
        );
        committedRevision = revision;
        write.revision = revision;
        if (historyProjection?.restore) {
          if (!this.acceptedState) throw new Error('No active world to replace.');
          this.integrationValues.clear();
          this.db.afterCommit?.(() => this.integrationValues.clear());
          this.db.afterRollback?.(() => this.integrationValues.clear());
          await this.saves.install(this.acceptedState, historyProjection.restore, state);
          await this.memories.invalidateConversationCompactions(state.world.id);
        }
        if (historyProjection?.receipt)
          await this.commands.save(state.world.id, historyProjection.receipt);
        if (historyProjection?.receipts?.length)
          await this.commands.saveBatch(state.world.id, historyProjection.receipts);
        await this.applyCommitPrivacy(inputs);
        await this.applyCommitInputs(inputs, revision);
        // Nested importer/restore transactions may still roll back after this call.
        // Keep their tentative baseline, but publish only after the outer COMMIT.
        this.db.afterRollback?.(() => {
          this.acceptedRevision = -1;
          this.acceptedState = null;
          this.baselineLost = true;
          this.readyHistoryWorlds.clear();
        });
        this.acceptedRevision = revision;
        this.acceptedState = state;
        if (this.db.afterCommit) {
          this.db.afterCommit(publish);
          publicationDeferred = true;
        }
        return revision;
      }),
    );
    let revision: number;
    try {
      revision = await transaction;
    } catch (error) {
      if (historyProjection?.restore && this.acceptedState === restoreBaseline)
        this.acceptedState = releasedBaseline;
      throw error;
    }
    if (!publicationDeferred) publish();
    return revision;
  }

  private captureCommitInputs(
    before: SavedWorld | null,
    state: SavedWorld,
    changes: RecordChanges,
    preparedHistory: ReturnType<typeof prepareHistory>,
    historyBefore: WorldState | undefined,
    historyAfter: WorldState,
    restore: boolean,
    invalidatedMemoryIds?: Record<string, string[]>,
  ): CommitInputs {
    const world = state.world;
    const outcomes = new Map<string, CommitInputs['outcomes'][number]['outcome']>();
    for (const [id, receipt] of Object.entries(world.responseReceipts ?? {}))
      if (receipt !== before?.world.responseReceipts?.[id] && receipt.outcome)
        outcomes.set(id, receipt.outcome);
    for (const [id, receipt] of Object.entries(world.declarationReceipts))
      if (receipt !== before?.world.declarationReceipts[id])
        outcomes.set(id, {
          ok: true,
          code: 'admitted',
          message: 'Definition admitted.',
          recipeId: receipt.recipeId,
        });
    for (const [actorId, inner] of Object.entries(world.innerWorlds ?? {}))
      if (
        inner.publicationJobId &&
        inner.publicationJobId !== before?.world.innerWorlds?.[actorId]?.publicationJobId
      )
        outcomes.set(inner.publicationJobId, {
          ok: true,
          code: 'snapshot-published',
          message: 'Inner world published.',
        });
    const invalidations: Record<string, string[]> = structuredClone(invalidatedMemoryIds ?? {});
    for (const [actorId, records] of Object.entries(world.memories)) {
      const prior = before?.world.memories[actorId];
      if (!prior || appendedRecordCount(prior, records) !== undefined) continue;
      const current = new Map(records.map((memory) => [memory.id, memory]));
      const ids = prior
        .filter(
          (memory) =>
            !current.has(memory.id) ||
            (current.get(memory.id) !== memory &&
              JSON.stringify(current.get(memory.id)) !== JSON.stringify(memory)),
        )
        .map((memory) => memory.id);
      if (ids.length)
        invalidations[actorId] = [...new Set([...(invalidations[actorId] ?? []), ...ids])];
    }
    const temporalFrontierAdvanced = changes.writes.get('mind_temporal_actors')?.some((row) => {
      const actorId = (JSON.parse(row.id) as string[])[4]!;
      const previous = before?.world.experience?.temporal?.actors[actorId]?.frontier;
      const next = world.experience?.temporal?.actors[actorId]?.frontier;
      return (
        !!next &&
        (next.expiredThroughTime !== previous?.expiredThroughTime ||
          next.pressureThrough?.address.batchOrder !==
            previous?.pressureThrough?.address.batchOrder ||
          next.pressureThrough?.address.entryIndex !==
            previous?.pressureThrough?.address.entryIndex ||
          next.pressureThrough?.address.memberIndex !==
            previous?.pressureThrough?.address.memberIndex)
      );
    });
    this.memories.configureWorld(world);
    return {
      worldId: world.id,
      initial: !before,
      restore,
      changes,
      history: captureHistoryProjection(
        historyBefore,
        historyAfter,
        preparedHistory,
        restore,
        changes,
      ),
      sources: this.memories.prepareSources(
        world.id,
        changes,
        this.memories.captureAllowance(world.id),
        this.memories.sourceVersionPlan(world),
      ),
      outcomes: [...outcomes].map(([id, outcome]) => ({ id, outcome })),
      privacy: worldPrivacy(world),
      privacyChanged:
        before?.world.experience?.forgotten !== world.experience?.forgotten ||
        before?.world.experience?.corrections !== world.experience?.corrections,
      invalidations,
      hotEventIds: this.records.needsHotPrune
        ? world.events.map((event) => JSON.stringify(['world', 'events', event.id]))
        : [],
      collectReceivedValues: !!(
        restore ||
        !before ||
        changes.writes.get('mind_perception_values')?.length ||
        changes.deletes.get('mind_temporal_pages')?.length ||
        temporalFrontierAdvanced ||
        receivedCurrentOwnerTables.some(
          (table) =>
            changes.deletes.get(table)?.length ||
            changes.writes
              .get(table)
              ?.some((row) => !row.create && row.receivedUsesChanged !== false),
        )
      ),
    };
  }

  private async applyCommitPrivacy(inputs: CommitInputs): Promise<void> {
    if (inputs.privacyChanged || inputs.restore) {
      const key = privacyLedgerKey(inputs.worldId);
      const ledger = readPrivacyLedger(await this.getIntegration(key));
      if (ledger) assertPrivacyContinuation(inputs.privacy, ledger);
      if (inputs.privacyChanged) await this.putIntegration(key, inputs.privacy);
    }
    for (const [actorId, ids] of Object.entries(inputs.invalidations)) {
      await this.vectors?.invalidate(`vectors:${inputs.worldId}:${actorId}`, [...ids]);
      await this.putIntegration(`vectors:${inputs.worldId}:${actorId}`, null);
    }
  }

  private publishWorldTables(write: TableWrite): void {
    const { inputs } = write;
    recordSavedTemporalPages(
      write.state.world,
      inputs.restore ? undefined : write.before?.world,
      inputs.changes.savedTemporalPages ?? [],
      inputs.changes.deletes.get('mind_temporal_pages') ?? [],
      inputs.changes.savedTemporalActors ?? [],
      inputs.changes.temporalEdits ?? [],
    );
    this.publishCommitInputs(inputs);
  }

  private publishCommitInputs(inputs: CommitInputs): void {
    const { worldId, changes, restore } = inputs;
    if (inputs.collectReceivedValues) this.scheduleValueCleanup(worldId);
    this.readyHistoryWorlds.add(worldId);
    this.records.needsHotPrune = false;
    const memoryRevision = this.memories.publicationRevision;
    this.history.committed(changes);
    this.memories.committed(worldId, changes, restore);
    this.memories.lexicalCommitted();
    for (const listener of this.projectionListeners)
      listener(memoryRevision !== this.memories.publicationRevision);
  }

  private async applyCommitInputs(inputs: CommitInputs, revision: number): Promise<void> {
    const { worldId, changes, restore } = inputs;
    const sharedWrites = new SqlWriteBatch(this.db);
    await timed('history.project', () =>
      this.history.project(inputs.history, sharedWrites, changes),
    );
    if (inputs.history.initial) await this.integrationValues.put(`history-schema:${worldId}`, 1);
    {
      for (const { id, outcome: result } of restore ? [] : inputs.outcomes) {
        const status = result.ok ? 'completed' : 'failed';
        // The body can contain exact UTF-16 prose that PostgreSQL JSON cannot
        // decode. Lock this selected job inside the existing world transaction;
        // the common upsert still protects its fingerprint/completed timestamp.
        // Missing jobs remain absent and decision roots retain their own owner.
        const row = await this.db
          .prepare('SELECT fingerprint,payload FROM jobs WHERE id=? FOR UPDATE')
          .get(id);
        if (!row) continue;
        const job = JSON.parse(String(row['payload'])) as JobRecord;
        if (job.id !== id || job.fingerprint !== row['fingerprint'])
          throw new Error('A request ID cannot be reused with different input.');
        if (job.decision !== undefined && job.decision !== null) continue;
        if (job.status !== 'completed' || status === 'completed') {
          await this.putJob({
            ...job,
            status,
            message: result.message,
            result,
            completedAt: Date.now(),
            ...(result.recipeId &&
            typeof job.invention === 'object' &&
            job.invention !== null &&
            !Array.isArray(job.invention)
              ? { invention: { ...job.invention, code: 'admitted', recipeId: result.recipeId } }
              : {}),
          });
        } else this.invalidateRead(this.recentJobReads, this.db);
      }
    }
    const sources = inputs.sources;
    this.memories.configureAllowance(sources.allowance);
    const affected = await this.memories.project(
      worldId,
      changes,
      !restore,
      sharedWrites,
      sources.versions,
    );
    if (sources.versions)
      await this.memories.applySourceVersionPlan(worldId, revision, sources.versions);
    await this.records.write(worldId, revision, changes, sharedWrites);
    await this.history.revokeTemporalAccounts(worldId, changes);
    await this.memories.writeSources(worldId, changes, affected, sources);
    if (this.records.needsHotPrune)
      await this.records.pruneActiveEvents(worldId, inputs.hotEventIds);
    await this.memories.reconcile(worldId, affected);
    await this.receivedOwnership.project(worldId, revision, changes, !!restore);
    if (restore || inputs.initial) await this.memories.reuseVectors(worldId);
    else {
      const revisedSources = new Map<string, Set<string>>();
      for (const table of ['mind_memories', 'mind_awareness', 'mind_summaries'])
        for (const row of changes.writes.get(table) ?? []) {
          if (row.create) continue;
          const path = JSON.parse(row.id) as string[],
            actor = path[table === 'mind_memories' ? 2 : 3]!;
          const ids = revisedSources.get(actor) ?? new Set<string>();
          const source = JSON.parse(row.payload) as Record<string, unknown>;
          ids.add(String(source[table === 'mind_awareness' ? 'eventId' : 'id']));
          revisedSources.set(actor, ids);
        }
      if (revisedSources.size) await this.memories.reuseVectors(worldId, revisedSources);
    }
  }

  /** UI preferences live outside world snapshots, so restoring a world cannot rewind them. */
  async getProfile(id: string): Promise<PlayerProfile> {
    await this.ready;

    const row = await this.db.prepare('SELECT * FROM player_profiles WHERE id = ?').get(id);
    const reveal = (await this.getIntegration(`world-reveal:${id}`)) as Partial<
      PlayerProfile['preferences']
    > | null;
    return {
      id,
      revision: row ? Number(row['revision']) : 0,
      preferences: {
        revealMode: reveal?.revealMode ?? 'nearby',
        revealRadius: reveal?.revealRadius ?? 6,
        revealStrength: reveal?.revealStrength ?? 0.7,
        showUnavailableActions: Number(row?.['show_unavailable_actions']) === 1,
        pauseWhenHidden: row ? Number(row['pause_when_hidden']) === 1 : true,
        narratorVoice: ((await this.getIntegration(`narrator-voice:${id}`)) ?? 'restrained') as
          | 'restrained'
          | 'lyrical'
          | 'wry',
      },
    };
  }

  async setPreferences(id: string, preferences: PlayerPreferencePatch): Promise<PlayerProfile> {
    await this.ready;
    return this.db.transaction(async () => {
      const unavailable =
        preferences.showUnavailableActions === undefined
          ? null
          : Number(preferences.showUnavailableActions);
      const pause =
        preferences.pauseWhenHidden === undefined ? null : Number(preferences.pauseWhenHidden);
      await this.db
        .prepare(
          `INSERT INTO player_profiles (id, revision, show_unavailable_actions, pause_when_hidden)
      VALUES (?, 1, COALESCE(?, 0), COALESCE(?, 1))
      ON CONFLICT(id) DO UPDATE SET revision=player_profiles.revision+1,
      show_unavailable_actions=COALESCE(?, player_profiles.show_unavailable_actions),
      pause_when_hidden=COALESCE(?, player_profiles.pause_when_hidden)`,
        )
        .run(id, unavailable, pause, unavailable, pause);
      if (
        preferences.revealMode !== undefined ||
        preferences.revealRadius !== undefined ||
        preferences.revealStrength !== undefined
      ) {
        const existing = ((await this.getIntegration(`world-reveal:${id}`)) ?? {}) as Record<
          string,
          unknown
        >;
        // Merge only this UI control's fields inside the profile transaction; world restores cannot rewind them.
        for (const key of ['revealMode', 'revealRadius', 'revealStrength'] as const)
          if (preferences[key] !== undefined) existing[key] = preferences[key];
        await this.putIntegration(`world-reveal:${id}`, existing);
      }
      if (preferences.narratorVoice)
        await this.putIntegration(`narrator-voice:${id}`, preferences.narratorVoice);
      return await this.getProfile(id);
    });
  }

  async getJob(id: string): Promise<JobRecord | undefined> {
    await this.ready;

    const row = await this.db.prepare('SELECT payload FROM jobs WHERE id = ?').get(id);
    if (!row) return undefined;
    const job = JSON.parse(String(row['payload'])) as JobRecord;
    if (job.decision) job.decision = readDecisionState(job.decision);
    return job;
  }

  async getSpeechJob(eventId: string): Promise<JobRecord | undefined> {
    return (await this.getSpeechJobs([eventId])).get(eventId);
  }

  async getSpeechJobs(eventIds: string[]): Promise<Map<string, JobRecord>> {
    await this.ready;
    const ids = [...new Set(eventIds)];
    const jobs = new Map<string, JobRecord>();
    if (!ids.length) return jobs;
    const rows = await this.db
      .prepare(
        `SELECT payload FROM jobs WHERE (selection #>> '{playerSpeechEventId}') IN (${ids.map(() => '?').join(',')}) AND (selection #>> '{kind}') = 'chat' ORDER BY created_at DESC,id DESC`,
      )
      .all(...ids.map(sqlTextKey));
    for (const row of rows) {
      const job = JSON.parse(String(row['payload'])) as JobRecord;
      if (job.playerSpeechEventId && !jobs.has(job.playerSpeechEventId))
        jobs.set(job.playerSpeechEventId, job);
    }
    return jobs;
  }

  async putJob(job: JobRecord): Promise<void> {
    await this.ready;
    const written = await this.db
      .prepare(JOB_UPSERT_SQL)
      .get(job.id, job.fingerprint, jobPayloadPrefix(job), jobSelection(job), job.createdAt)
      .finally(() => this.invalidateRead(this.recentJobReads, this.db));
    if (!written) throw new Error('A request ID cannot be reused with different input.');
  }

  /** One transaction owns root changes, child funding and cursor consumption. */
  async consumeDecisionCursor(cursor: NonNullable<DecisionState['cursor']>): Promise<void> {
    const previous = await this.getIntegration(cursor.key);
    const original = cursor.value;
    if (!original || typeof original !== 'object' || Array.isArray(original))
      throw new Error('Invalid decision cursor.');
    const current =
      previous && typeof previous === 'object' && !Array.isArray(previous) ? previous : {};
    const watermark = (value: object) =>
      'watermark' in value && typeof value.watermark === 'number' ? value.watermark : 0;
    // A late completion/restart may consume its original evidence, never rewind a newer cursor.
    const at = (value: object) => ('at' in value && typeof value.at === 'number' ? value.at : 0);
    const newer =
      watermark(current) > watermark(original) ||
      (watermark(current) === watermark(original) && at(current) > at(original))
        ? current
        : original;
    await this.putIntegration(cursor.key, {
      ...newer,
      watermark: Math.max(watermark(original), watermark(current)),
    });
  }

  async mutateDecision(
    id: string,
    change: (job: JobRecord) => Promise<JobRecord | undefined>,
  ): Promise<JobRecord | undefined> {
    await this.ready;
    return this.db.transaction(async () => {
      const row = await this.db.prepare('SELECT payload FROM jobs WHERE id=? FOR UPDATE').get(id);
      if (!row) return undefined;
      const current = JSON.parse(String(row['payload'])) as JobRecord;
      if (!current.decision) return undefined;
      current.decision = readDecisionState(current.decision);
      const next = await change(current);
      if (!next?.decision) return undefined;
      if (next.id !== current.id || next.fingerprint !== current.fingerprint)
        throw new Error('Decision identity cannot change.');
      next.decision = { ...next.decision, revision: current.decision.revision + 1 };
      await this.putJob(next);
      return next;
    });
  }

  async activeDecision(
    worldId: string,
    timelineId: string,
    actorId: string,
    except: string,
  ): Promise<boolean> {
    await this.ready;
    // Called inside the root transaction: serialize competing roots for this actor
    // before checking the unique active-child constraint.
    await this.db
      .prepare('SELECT pg_advisory_xact_lock(hashtextextended(?,0))')
      .get(JSON.stringify([worldId, timelineId, actorId]));
    return !!(await this.db
      .prepare(
        "SELECT id FROM jobs WHERE (selection #>> '{decision,worldId}')=? AND (selection #>> '{decision,timelineId}')=? AND (selection #>> '{decision,actorId}')=? AND (selection #>> '{decision,higher,state}') IN ('queued','preparing','reserved','dispatched') AND id<>? LIMIT 1",
      )
      .get(sqlTextKey(worldId), sqlTextKey(timelineId), sqlTextKey(actorId), except));
  }

  async decisionAttempts(rootJobId: string): Promise<LinkedDecisionAttempt[]> {
    await this.ready;
    const rows = await this.db
      .prepare(
        'SELECT l.*,a.provider,a.reserved,a.receipt FROM cognition_attempt_links l JOIN attempts a ON a.id=l.attempt_id WHERE l.root_job_id=? ORDER BY a.created_at,a.id',
      )
      .all(rootJobId);
    return rows.map((row) => ({
      attemptId: String(row['attempt_id']),
      dispatchIntent: row['dispatch_intent'] === true,
      rootJobId: String(row['root_job_id']),
      category: row['category'] as DecisionAttemptLink['category'],
      ...(row['level'] === null
        ? {}
        : { level: Number(row['level']) as DecisionAttemptLink['level'] }),
      stage: String(row['stage']),
      executionClass: row['execution_class'] as ExecutionClass,
      provider: row['provider'] as LinkedDecisionAttempt['provider'],
      reservedUsd: microUsdToUsd(String(row['reserved']))!,
      ...(row['receipt'] ? { receipt: JSON.parse(String(row['receipt'])) as AiReceipt } : {}),
    }));
  }

  async occupiedDecisionSlots(): Promise<
    Pick<LinkedDecisionAttempt, 'attemptId' | 'executionClass'>[]
  > {
    await this.ready;
    const rows = await this.db.prepare(COGNITION_PENDING_EXECUTIONS_SQL).all();
    return rows.map((row) => ({
      attemptId: String(row['id']),
      executionClass: row['execution_class'] as ExecutionClass,
    }));
  }

  async markDecisionDispatch(attemptId: string): Promise<boolean> {
    await this.ready;
    return !!(await this.db
      .prepare(
        'UPDATE cognition_attempt_links SET dispatch_intent=true WHERE attempt_id=? AND NOT dispatch_intent RETURNING attempt_id',
      )
      .get(attemptId));
  }

  async claimInventionContinuation(job: JobRecord, parentId: string): Promise<boolean> {
    await this.ready;
    // Claim and child are one durable write; a lost response cannot buy two follow-ups.
    // docs/architecture.md#shared-invention-workflow
    return this.db.transaction(async () => {
      const parent = await this.getJob(parentId);
      if (!parent?.invention || parent.invention.continuedBy) return false;
      parent.invention.continuedBy = job.id;
      await this.putJob(parent);
      await this.putJob(job);
      return true;
    });
  }

  async inventionJobs(
    worldId: string,
    actorId: string,
    before = { createdAt: Number.MAX_SAFE_INTEGER, id: '\uffff' },
    selection?: { timelineId: string; limit?: number },
  ): Promise<JobRecord[]> {
    await this.ready;
    const limit = selection?.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new Error('Invention history limit must be between 1 and 50.');
    // Filter before paging: abandoned timelines must not hide current actor feedback.
    // docs/architecture.md#bounded-invention-history-and-recovery
    const timeline = selection ? " AND (selection #>> '{request,invention,timelineId}') = ?" : '';
    return (
      await this.db
        .prepare(
          `SELECT payload FROM jobs WHERE (selection #>> '{request,invention,worldId}') = ? AND (selection #>> '{request,invention,actorId}') = ?${timeline} AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(
          sqlTextKey(worldId),
          sqlTextKey(actorId),
          ...(selection ? [sqlTextKey(selection.timelineId)] : []),
          before.createdAt,
          before.id,
          limit,
        )
    ).map((row) => JSON.parse(String(row['payload'])) as JobRecord);
  }

  private readonly recentJobReads = new Map<number, Promise<JobRecord[]>>();
  private canShareRead(): boolean {
    // A transaction must read its own snapshot, never newer committed cache data.
    return this.db.transactionActive === false && !!this.db.afterCommit && !!this.db.afterRollback;
  }
  private invalidateRead(cache: { clear(): void }, db: SqlDatabase): void {
    const invalidate = () => cache.clear();
    invalidate();
    // Fence reads prepared during an enclosing transaction as well as before it.
    db.afterCommit?.(invalidate);
    db.afterRollback?.(invalidate);
  }
  async recentJobs(limit = 12): Promise<JobRecord[]> {
    await this.ready;
    const shared = this.canShareRead();
    let pending = shared ? this.recentJobReads.get(limit) : undefined;
    if (!pending) {
      if (shared && this.recentJobReads.size >= 8)
        this.recentJobReads.delete(this.recentJobReads.keys().next().value!);
      pending = this.db
        .prepare('SELECT payload FROM jobs ORDER BY created_at DESC, id DESC LIMIT ?')
        .all(limit)
        .then((rows) => rows.map((row) => JSON.parse(String(row['payload'])) as JobRecord));
      if (shared) this.recentJobReads.set(limit, pending);
    }
    try {
      return structuredClone(await pending);
    } catch (error) {
      if (this.recentJobReads.get(limit) === pending) this.recentJobReads.delete(limit);
      throw error;
    }
  }

  async getIntegration(key: string): Promise<unknown> {
    await this.ready;
    return this.integrationValues.get(key);
  }
  async putIntegration(key: string, value: unknown): Promise<void> {
    await this.ready;

    await this.integrationValues.put(key, value);
  }

  async attemptBudget(budgetId: string): Promise<AttemptBudgetSnapshot> {
    await this.ready;
    return readAttemptBudget(this.db, budgetId);
  }

  async reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId = 'world-agent',
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
    decision?: DecisionAttemptLink,
  ): Promise<boolean> {
    await this.ready;
    const amount = micro(amountUsd);
    const ceiling = micro(ceilingUsd);

    if (
      !Number.isFinite(amountUsd) ||
      amountUsd <= 0 ||
      !Number.isFinite(ceilingUsd) ||
      ceilingUsd < 0 ||
      !actorId ||
      actorId.length > 160
    )
      throw new Error('Invalid spending reservation.');
    const accepted = await this.db.transaction(async () => {
      const existing = await this.db
        .prepare('SELECT provider,reserved FROM attempts WHERE id = ?')
        .get(id);
      // Resume the same allocation after a crash, never authorize another model dispatch.
      // docs/architecture.md#macrofold-worker-ownership
      if (
        existing &&
        reuse === 'compute-allocation' &&
        provider === 'macrofold' &&
        id.startsWith('macrofold-worker:') &&
        id.endsWith(':compute') &&
        existing['provider'] === provider &&
        Number(existing['reserved']) === micro(amountUsd)
      )
        return true;
      if (existing) throw new Error('Attempt already admitted; do not dispatch it again.');
      const actorExposure = await this.exposure(actorId);
      // This is an additional cap over the same attempt ledger, not another wallet.
      // docs/architecture.md#invention-workshop-tools
      if (budget) {
        if (
          !budget.id ||
          budget.id.length > 500 ||
          !Number.isFinite(budget.limitUsd) ||
          budget.limitUsd < 0
        )
          throw new Error('Invalid episode spending scope.');
        const exposure = await this.db
          .prepare(
            "SELECT COALESCE(SUM(a.spent + CASE WHEN a.status = 'reserved' THEN a.reserved ELSE 0 END), 0) AS total FROM attempt_budgets b JOIN attempts a ON a.id=b.attempt_id WHERE b.budget_id=?",
          )
          .get(budget.id);
        if (
          exposureTotal(exposure?.['total'] ?? 0) + BigInt(amount) >
          BigInt(micro(budget.limitUsd))
        )
          return false;
      }
      if (actorExposure + BigInt(amount) > BigInt(ceiling)) {
        return false;
      }
      await this.db
        .prepare(
          "INSERT INTO attempts (id,provider,status,reserved,created_at) VALUES (?,?,'reserved',?,?)",
        )
        .run(id, provider, amount, Date.now());
      await this.db.prepare('INSERT INTO attempt_scopes VALUES (?,?)').run(id, actorId);
      if (budget)
        await this.db.prepare('INSERT INTO attempt_budgets VALUES (?,?)').run(id, budget.id);
      if (decision)
        await this.db
          .prepare(
            'INSERT INTO cognition_attempt_links(attempt_id,root_job_id,category,level,stage,execution_class) VALUES (?,?,?,?,?,?)',
          )
          .run(
            id,
            decision.rootJobId,
            decision.category,
            decision.level ?? null,
            decision.stage,
            decision.executionClass,
          );
      return true;
    });
    if (accepted) this.invalidateRead(this.usageCache, this.db);
    return accepted;
  }

  async attemptReceipt(id: string): Promise<AiReceipt | undefined> {
    await this.ready;
    const row = await this.db.prepare('SELECT receipt FROM attempts WHERE id = ?').get(id);
    return row?.['receipt'] ? (JSON.parse(String(row['receipt'])) as AiReceipt) : undefined;
  }

  async settle(id: string, receipt: AiReceipt): Promise<void> {
    await this.ready;
    if (receipt.requestId !== id) throw new Error('Spending receipt identity mismatch.');
    receipt = normalizeReceiptCost(receipt);
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT status,reserved,spent,receipt FROM attempts WHERE id = ?')
        .get(id);
      if (!row) return;
      const prior = row['receipt'] ? (JSON.parse(String(row['receipt'])) as AiReceipt) : undefined;
      // Later accounting may omit optional metadata without changing the exact admitted Run.
      // Retain its already-established deployment revision and separate hosting attribution.
      if (
        prior?.macrofoldDeployment ||
        prior?.macrofoldCostAttribution ||
        prior?.macrofoldRequestedDeployment
      )
        receipt = {
          ...receipt,
          macrofoldDeployment: receipt.macrofoldDeployment ?? prior.macrofoldDeployment,
          macrofoldCostAttribution:
            receipt.macrofoldCostAttribution ?? prior.macrofoldCostAttribution,
          macrofoldRequestedDeployment:
            receipt.macrofoldRequestedDeployment ?? prior.macrofoldRequestedDeployment,
        };
      assertAttemptReceiptContinuity(prior, receipt);
      if (row['status'] === 'settled') {
        // A final priced receipt is immutable; an unpriced attempt may receive
        // definitive billing later without authorizing another dispatch.
        if (!prior?.dispatched || usdToMicroUsd(prior.estimatedCostUsd) !== undefined) return;
      }
      receipt = retainKnownAttemptCost(receipt, prior?.estimatedCostUsd);
      const reserve = Number(row['reserved']);
      const estimated = receipt.estimatedCostUsd;
      const uncertain =
        receipt.dispatched && (receipt.completionUncertain || estimated === undefined);
      // A later uncertain observation can increase the obligation without proving
      // completion. Missing/smaller evidence cannot restore spending headroom.
      const spent = !receipt.dispatched
        ? 0
        : uncertain
          ? uncertainAttemptMicroUsd(
              reserve,
              Number(row['spent']),
              prior?.estimatedCostUsd,
              estimated,
            )
          : micro(estimated!);
      const priorCharge = usdToMicroUsd(prior?.estimatedCostUsd) ?? -1;
      const observedCharge = usdToMicroUsd(estimated) ?? -1;
      // Repeated uncertain polling must not rewrite an unchanged obligation.
      // A higher known charge is worth retaining even while below the reserve.
      if (
        row['status'] === 'uncertain' &&
        receipt.completionUncertain &&
        prior?.providerRequestId === receipt.providerRequestId &&
        prior?.completionUncertain === receipt.completionUncertain &&
        prior?.macrofoldBillingMode === receipt.macrofoldBillingMode &&
        spent === Number(row['spent']) &&
        observedCharge <= priorCharge
      )
        return;
      await this.db
        .prepare(
          "UPDATE attempts SET status=?,spent=?,receipt=? WHERE id=? AND status IN ('reserved','uncertain','settled')",
        )
        .run(uncertain ? 'uncertain' : 'settled', spent, JSON.stringify(receipt), id);
      const notify = () => {
        for (const listener of this.settlementListeners) listener();
      };
      if (this.db.afterCommit) this.db.afterCommit(notify);
      else notify();
    });
    this.invalidateRead(this.usageCache, this.db);
  }

  /** A restart never resends an admitted call whose external outcome is unknown. */
  async recoverInterruptedWork(): Promise<void> {
    await this.ready;

    for (;;) {
      const rows = await this.db
        .prepare(
          "SELECT id FROM jobs WHERE (selection #>> '{decision,phase}') IN ('immediate','waiting-primary','higher') ORDER BY id LIMIT 50",
        )
        .all();
      if (!rows.length) break;
      for (const row of rows)
        await this.mutateDecision(String(row['id']), async (job) => {
          const state = job.decision!;
          if (
            state.cursor &&
            (await this.getIntegration(`world-timeline:${state.worldId}`)) === state.timelineId
          )
            await this.consumeDecisionCursor(state.cursor);
          return {
            ...job,
            status: 'stale',
            decision: endDecision(state, 'restart', Date.now()),
            message: 'Interrupted thinking ended after restart; no request or action was repeated.',
            completedAt: Date.now(),
          };
        });
    }
    // A committed absence of dispatch intent is positive proof under the single-submit protocol.
    // Persist that proof as a receipt too: otherwise private root-cost readers would
    // still report an unknown bill after the financial owner released the reservation.
    for (;;) {
      const unsent = await this.db.prepare(COGNITION_UNSENT_ATTEMPTS_SQL).all();
      if (!unsent.length) break;
      await this.db.transaction(async () => {
        for (const row of unsent)
          await this.settle(
            String(row['id']),
            undispatchedReceipt(
              String(row['id']),
              row['provider'] as AiReceipt['provider'],
              Date.now(),
            ),
          );
      });
    }
    await this.db.exec(
      "UPDATE attempts SET status='uncertain', spent=reserved WHERE status='reserved'",
    );
    this.invalidateRead(this.usageCache, this.db);
    // The partial index contains only unfinished work; retained history never enters memory.
    // docs/architecture.md#bounded-invention-history-and-recovery
    for (;;) {
      const rows = await this.db
        .prepare(
          "SELECT payload FROM jobs WHERE (selection #>> '{status}') IN ('queued','judging','generating') ORDER BY id LIMIT 50",
        )
        .all();
      if (!rows.length) break;
      for (const row of rows) {
        const job = JSON.parse(String(row['payload'])) as JobRecord;
        if (['queued', 'judging', 'generating'].includes(job.status)) {
          const uncertain =
            job.invention &&
            (await this.db
              .prepare(
                "SELECT id FROM attempts WHERE status='uncertain' AND (id IN (?, ?) OR substr(id, 1, ?) = ? OR substr(id, 1, ?) = ?) LIMIT 1",
              )
              .get(
                `${job.id}:route`,
                `${job.id}:generate`,
                `${job.id}:invention-search:`.length,
                `${job.id}:invention-search:`,
                `${job.id}:workshop:`.length,
                `${job.id}:workshop:`,
              ));
          const completedAt = Date.now();
          const interrupted: JobRecord = {
            ...job,
            status: 'stale',
            ...(job.invention
              ? { invention: { ...job.invention, code: uncertain ? 'uncertain' : 'interrupted' } }
              : {}),
            message: uncertain
              ? 'Interrupted with uncertain provider completion; spending remains reserved and no request was replayed.'
              : 'Interrupted by restart; no paid request or world effect was repeated.',
            completedAt,
            totalLatencyMs: Math.max(0, completedAt - job.createdAt),
          };
          await this.db.transaction(async () => {
            // A concurrent committed result wins; only the job actually interrupted here
            // may close its root, in the same durable transaction.
            const written = await this.db
              .prepare(
                "UPDATE jobs SET payload=?,selection=?::jsonb WHERE id=? AND (selection ->> 'status') IN ('queued','judging','generating') RETURNING id",
              )
              .get(JSON.stringify(interrupted), jobSelection(interrupted), job.id);
            if (!written) return;
            this.invalidateRead(this.recentJobReads, this.db);
            const diagnostic = await this.intelligenceCall(job.id);
            if (diagnostic?.status !== 'running') return;
            const ended: IntelligenceCall = {
              ...diagnostic,
              status: 'failed',
              disposition: 'stale',
              completedAt: new Date(completedAt).toISOString(),
              output: { message: interrupted.message },
            };
            const projected = diagnosticStorage(ended);
            await this.db
              .prepare(
                "UPDATE intelligence_calls SET payload=?,selection=?::jsonb,summary=?,stage=? WHERE id=? AND selection->>'status'='running'",
              )
              .run(
                JSON.stringify(ended),
                projected.selection,
                projected.summary,
                projected.stage,
                job.id,
              );
          });
        }
      }
    }
  }

  private readonly usageCache = new Map<string, ReturnType<SqlGameRepository['readUsage']>>();

  async usage(ceilingUsd: number, actorId?: string) {
    const period = new Date().toISOString().slice(0, 7);
    const key = JSON.stringify([period, ceilingUsd, actorId]);
    const shared = this.canShareRead();
    let cached = shared ? this.usageCache.get(key) : undefined;
    if (!cached) {
      // Display-only totals change with accounting writes, not movement or job progress.
      // Budget admission still queries the ledger: docs/performance.md#browser-and-provider-polling.
      cached = this.readUsage(ceilingUsd, actorId);
      if (shared) {
        if (this.usageCache.size >= 128)
          this.usageCache.delete(this.usageCache.keys().next().value!);
        this.usageCache.set(key, cached);
      }
    }
    try {
      return structuredClone(await cached);
    } catch (error) {
      if (this.usageCache.get(key) === cached) this.usageCache.delete(key);
      throw error;
    }
  }

  private async readUsage(ceilingUsd: number, actorId?: string) {
    await this.ready;

    const rows = await this.db
      .prepare(
        "SELECT a.provider,a.status,a.reserved,a.spent,a.receipt,COALESCE(s.actor_id,'legacy') AS actor_id FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=?" +
          (actorId ? ' AND s.actor_id=?' : ''),
      )
      .all(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
        ...(actorId ? [actorId] : []),
      );
    const accountAmounts: Record<string, { spent: number; reserved: number }> = {};
    let spent = 0,
      reserved = 0,
      jevCalls = 0,
      llmCalls = 0,
      inputTokens = 0,
      outputTokens = 0,
      lastLatencyMs = 0;
    for (const row of rows) {
      const account = (accountAmounts[String(row['actor_id'])] ??= { spent: 0, reserved: 0 });
      account.spent += Number(row['spent']);
      if (row['status'] === 'reserved') account.reserved += Number(row['reserved']);
      const nextSpent = sumSafeIntegers([spent, Number(row['spent'])]);
      const nextReserved = sumSafeIntegers([
        reserved,
        row['status'] === 'reserved' ? Number(row['reserved']) : 0,
      ]);
      if (nextSpent === undefined || nextReserved === undefined)
        throw new Error('Spending summary exceeds safe arithmetic.');
      spent = nextSpent;
      reserved = nextReserved;
      if (row['receipt']) {
        const receipt = JSON.parse(String(row['receipt'])) as AiReceipt;
        if (receipt.dispatched) {
          if (row['provider'] === 'jev') jevCalls++;
          else if (row['provider'] === 'openai') llmCalls++;
        }
        inputTokens += receipt.usage?.inputTokens ?? 0;
        outputTokens += receipt.usage?.outputTokens ?? 0;
        lastLatencyMs = receipt.latencyMs;
      }
    }
    const reportUsd = (amount: number): number => {
      const usd = microUsdToUsd(String(amount));
      if (usd === undefined) throw new Error('Spending summary exceeds safe arithmetic.');
      return usd;
    };
    const accounts = Object.fromEntries(
      Object.entries(accountAmounts).map(([id, amount]) => [
        id,
        {
          spentUsd: reportUsd(amount.spent),
          reservedUsd: reportUsd(amount.reserved),
        },
      ]),
    );
    return {
      budget: {
        limitUsd: ceilingUsd,
        period: new Date().toISOString().slice(0, 7),
        perAgent: true,
        accounts,
        spentUsd: reportUsd(spent),
        reservedUsd: reportUsd(reserved),
        estimated: true,
      },
      usage: { jevCalls, llmCalls, inputTokens, outputTokens, lastLatencyMs },
    };
  }

  async close(): Promise<void> {
    this.closing = true;
    this.projectionListeners.clear();
    this.settlementListeners.clear();
    await this.ready.catch(() => undefined);
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    await this.cleanupTask;
    try {
      await this.saves.close();
    } finally {
      try {
        await this.memories.closeLexical();
      } finally {
        await this.db.close();
      }
    }
  }
}
