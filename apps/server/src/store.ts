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
  compactObjectHistory,
  compactAppraisalHistory,
  compactContributionHistory,
} from './history-residency.js';
import { MemoryRepository, type PreparedMemorySources } from './memory-repository.js';
import { WorldRecords, retainedSourceTables } from './world-records.js';
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
import { profilingEnabled, timed, timedSync, countMetric } from './performance.js';
import { HistoryRepository } from './history.js';
import {
  prepareHistory,
  prepareJournalHistory,
  prepareHistoryAppend,
} from './history-preparation.js';
import { insertRows, SqlWriteBatch } from './sql-rows.js';
import { IntegrationValues } from './integration-values.js';
import { JournalDatabase } from './journal-database.js';
import { WorldJournal, type JournalApplication } from './world-journal.js';
import { encodeJournalTransition, reconstructJournalWorld } from './world-journal-data.js';
import {
  journalTableFamily,
  journalConstraints,
  prepareJournalConstraints,
} from './journal-admission.js';
import { JournalWorker, type ApplicationStatistics } from './journal-worker-client.js';
import {
  applyRecordSources,
  JournalTableWriter,
  type JournalRange,
  type JournalApplied,
  type JournalTables,
  type RetainedJournal,
} from './journal-application.js';
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
    sql: `((payload::jsonb #>> '{ownerAccountId}')=? OR ((payload::jsonb #>> '{ownerAccountId}') IS NULL AND (${ids.length ? `(payload::jsonb #>> '{actorId}') IN (${ids.map(() => '?').join(',')})` : '1=0'}${access.allowUnscoped ? " OR (payload::jsonb #>> '{actorId}') IS NULL" : ''})))`,
    params: [access.accountId, ...ids],
  };
}
function diagnosticRootSelection(filters: Record<string, string>, access?: DiagnosticAccess) {
  const clauses = ["(payload::jsonb #>> '{parentId}') IS NULL"];
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
        "id IN (SELECT (payload::jsonb #>> '{parentId}') FROM intelligence_calls WHERE LOWER((payload::jsonb #>> '{kind}')) LIKE LOWER(?))",
      );
      params.push(`%${value}%`);
    } else if (key === 'outcome') {
      // Panel labels cover both root status and finer dispositions such as cancelled.
      const term = `%${value.replace(/canceled/i, 'cancel')}%`;
      clauses.push(
        "(LOWER((payload::jsonb ->> 'disposition')) LIKE LOWER(?) OR LOWER((payload::jsonb ->> 'status')) LIKE LOWER(?))",
      );
      params.push(term, term);
    } else if (fields[key]) {
      clauses.push(`LOWER((payload::jsonb ->> '${fields[key]}')) LIKE LOWER(?)`);
      params.push(`%${value}%`);
    }
  }
  return { where: clauses.join(' AND '), params };
}
import { digest } from './content-digest.js';
import { randomUUID } from 'node:crypto';
export { digest } from './content-digest.js';
export const DATABASE_SCHEMA = '33';

export interface AttemptBudget {
  id: string;
  limitUsd: number;
}
export interface SqlDatabase {
  /** Transport grouping for explicitly independent writes; transaction semantics are unchanged. */
  readonly writeGroups: boolean;
  /** Undefined adapters cannot prove whether shared committed reads are safe. */
  readonly transactionActive?: boolean;
  /** Exact canonical revision currently being applied by the owned journal lane. */
  readonly projectionRevision?: number;
  materializationTransaction?<T>(
    revision: number,
    operation: (useRevision: (revision: number) => void) => Promise<T>,
  ): Promise<T>;
  shareApplicationLease?(onFailure: () => void): Promise<{ url: string; writeGroups: boolean }>;
  confirmApplicationLease?(): Promise<void>;
  applicationBarrier?<T>(operation: () => Promise<T>): Promise<T>;
  synchronizeProjection?(): Promise<void>;
  checkpointSource?: import('./checkpoint-worker-client.js').CheckpointSource;
  transaction<T>(operation: () => Promise<T>): Promise<T>;
  readTransaction?<T>(operation: () => Promise<T>): Promise<T>;
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
  milestones?: Record<string, boolean>;
  actorMilestones?: Record<string, Record<string, boolean>>;
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
  readonly history?: ReturnType<typeof prepareHistory>;
}

interface TableWrite {
  before: SavedWorld | null;
  state: SavedWorld;
  revision: number;
  changes: ReturnType<WorldRecords['prepare']>;
  historyBefore?: WorldState;
  historyAfter: WorldState;
  preparedHistory?: ReturnType<typeof prepareHistory>;
  preparedSources?: PreparedMemorySources;
  restore: boolean;
  deferred?: true;
}

interface CompactJournalWrite extends JournalTables {
  worldId: string;
  revision: number;
  restore: false;
  deferred: true;
  historyChanged: boolean;
}

/** Replaceable persistence boundary for committed world state. */
export interface WorldStore {
  /** Deferred query tables have caught up after durable acknowledgement. */
  onProjection(listener: () => void): () => void;
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
  readonly ready: Promise<void>;
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
  async prepareRetainedSourceClosure(
    initial: SavedWorld,
    complete = false,
  ): Promise<import('./temporal-storage.js').PreparedMemoryRetention> {
    let state = initial;
    const rows = new Map<string, string[]>(),
      positions = new Map<string, Map<string, number>>(),
      previous = new Map<string, Map<string, unknown>>();
    for (let round = 0; round < 4; round++) {
      this.records.stageRetirements(state, rows, positions, previous);
      // Retention joins only personal source changes. Preparing unrelated physical
      // and current-perception records again in each closure round repeats the save.
      const changes = this.records.prepare(
        this.acceptedState ?? undefined,
        state,
        retainedSourceTables,
      );
      const planned = await this.memories.prepareSourceVersionRetention(state, changes);
      const retained = await this.memories.prepareRetention(
        planned.state,
        complete,
        changes,
        this.acceptedState?.world,
      );
      for (const [table, ids] of retained.rows)
        rows.set(table, [...new Set([...(rows.get(table) ?? []), ...ids])]);
      for (const [table, values] of retained.positions ?? []) {
        const target = positions.get(table) ?? new Map();
        for (const [id, value] of values) target.set(id, value);
        positions.set(table, target);
      }
      for (const [table, records] of retained.previous ?? []) {
        const target = previous.get(table) ?? new Map();
        for (const [id, value] of records) if (!target.has(id)) target.set(id, value);
        previous.set(table, target);
      }
      state = retained.state;
      if (state === planned.state)
        return { state, rows, positions, previous, versions: planned.plan };
    }
    throw new Error('Exact source closure cannot fit its complete retained account allowance.');
  }
  private readonly projectionListeners = new Set<() => void>();
  onProjection(listener: () => void): () => void {
    this.projectionListeners.add(listener);
    return () => this.projectionListeners.delete(listener);
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
  private readonly rawDb: SqlDatabase;
  private readonly journal: WorldJournal<CompactJournalWrite>;
  private journalActive = false;
  private applicationWorker?: JournalWorker;
  private applicationLeaseShared = false;
  private applicationFailure?: Error;
  private applicationMeasurements?: ApplicationStatistics;
  /** Server-local complete worker work; never a player projection. */
  get applicationStatistics(): Readonly<ApplicationStatistics> | undefined {
    return this.applicationMeasurements && { ...this.applicationMeasurements };
  }
  private recoveryState?: SavedWorld;
  private acceptedRevision = -1;
  private acceptedState: SavedWorld | null = null;
  /** Set when a commit rolled back after replacing the baseline. The live world may have
   * released history since, so reloading a complete baseline and diffing against it could
   * delete evicted rows; only an explicit load (restart) may continue. */
  private baselineLost = false;
  private intelligenceWrites = 0;
  vectors?: VectorStore;
  get persistence() {
    return 'postgres' as const;
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
      'intelligence_calls (id, started_at, payload)',
      calls.map((call) => [call.id, call.startedAt, call.json]),
      'ON CONFLICT(id) DO UPDATE SET payload = excluded.payload',
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
      ? `SELECT id FROM intelligence_calls WHERE (payload::jsonb #>> '{parentId}') IS NULL AND ${permitted.sql}`
      : '';
    const filter = permitted
      ? ` WHERE id IN (${roots}) OR (payload::jsonb #>> '{parentId}') IN (${roots})`
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
    // Select the bounded page before decoding each body once. Keep SELECT outermost
    // so the PostgreSQL adapter uses its reader rather than the gameplay writer.
    const rows = await this.db
      .prepare(
        `SELECT summary FROM (
          WITH selected AS MATERIALIZED (
            SELECT id,started_at,payload::jsonb AS body FROM intelligence_calls
            WHERE ${selection.where} ORDER BY started_at DESC,id DESC LIMIT 26 OFFSET ?
          )
          SELECT id,started_at,((body - 'input' - 'output' - 'exchanges') || jsonb_build_object(
            'input', jsonb_build_object('reason',body #> '{input,reason}','text',body #> '{input,text}'),
            'output', jsonb_build_object(
              'ok',body #> '{output,ok}','code',body #> '{output,code}',
              'message',body #> '{output,message}','reason',body #> '{output,reason}',
              'error',body #> '{output,error}','receipt',body #> '{output,receipt}'),
            'exchanges','[]'::jsonb))::text AS summary FROM selected
          ) roots ORDER BY started_at DESC,id DESC`,
      )
      .all(...selection.params, offset);
    return rows.map((row) => JSON.parse(String(row['summary'])) as DiagnosticRootSummary);
  }
  async diagnosticStages(parentIds: string[], details = false): Promise<IntelligenceCall[]> {
    await this.ready;

    if (!parentIds.length) return [];
    const fields = details
      ? 'payload'
      : `id,started_at,(payload::jsonb #>> '{parentId}') AS parent_id,(payload::jsonb #>> '{kind}') AS kind,(payload::jsonb #>> '{status}') AS status,(payload::jsonb #>> '{output,receipt}') AS receipt,(payload::jsonb #>> '{input,proposed,operations}') AS proposed_operations,(payload::jsonb #>> '{output,value,operations}') AS response_operations,CASE WHEN (payload::jsonb #>> '{kind}') = 'Action context' THEN (payload::jsonb #>> '{output}') END AS action_options,(payload::jsonb #>> '{output,reason}') AS reason,(payload::jsonb #>> '{output,error}') AS error,(payload::jsonb #>> '{output,message}') AS message`;
    const rows = await this.db
      .prepare(
        `SELECT ${fields} FROM intelligence_calls WHERE (payload::jsonb #>> '{parentId}') IN (${parentIds.map(() => '?').join(',')}) ORDER BY started_at,id LIMIT 1000`,
      )
      .all(...parentIds);
    return rows.map((row) =>
      details
        ? (JSON.parse(String(row['payload'])) as IntelligenceCall)
        : {
            id: String(row['id']),
            parentId: String(row['parent_id']),
            kind: String(row['kind']),
            startedAt: String(row['started_at']),
            status: String(row['status']) as IntelligenceCall['status'],
            input: row['proposed_operations']
              ? { proposed: { operations: JSON.parse(String(row['proposed_operations'])) } }
              : null,
            output: row['action_options']
              ? JSON.parse(String(row['action_options']))
              : {
                  ...(row['receipt'] ? { receipt: JSON.parse(String(row['receipt'])) } : {}),
                  ...(row['response_operations']
                    ? { value: { operations: JSON.parse(String(row['response_operations'])) } }
                    : {}),
                  reason: row['reason'],
                  error: row['error'],
                  message: row['message'],
                },
            exchanges: [],
          },
    );
  }

  readonly history: HistoryRepository;
  readonly saves: GameSaves;
  readonly assets: AssetRepository;
  constructor(
    dataDirectory: string,
    database: SqlDatabase,
    private readonly initialization: { preserveSaveStages?: boolean } = {},
  ) {
    this.rawDb = database;
    this.db = new JournalDatabase(
      database,
      () => this.journal.flush(),
      () => this.journalActive,
      new Set([
        'meta',
        'jobs',
        'attempts',
        'attempt_scopes',
        'attempt_budgets',
        'intelligence_calls',
        'player_profiles',
        'gameplay_receipts',
      ]),
      () => this.journal.writeAligned(),
      () => this.journal.canSkipFlush(),
    );
    this.integrationValues = new IntegrationValues(this.db);
    this.records = new WorldRecords(this.db);
    this.memories = new MemoryRepository(this.db);
    this.history = new HistoryRepository(this.db);
    this.saves = new GameSaves(this.db, join(dataDirectory, 'saves'), database.checkpointSource);
    // Revocation, authentication and retry recovery stay immediate even while query
    // tables trail the durable journal. Their existing transactional fences remain.
    this.commands = new CommandReceipts(database);
    this.authority = new AuthorityRepository(database);
    this.invites = new InviteRepository(this.db);
    this.maintenance = new MaintenanceRepository(this.db);
    this.assets = new AssetRepository(this.db);
    this.creationTargets = new CreationTargetRepository(this.db);
    this.journal = new WorldJournal(
      database,
      (entry, prepared) => this.applyJournal(entry, prepared),
      (range, entries) => this.applyOnlineJournal(range, entries),
    );
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
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS jobs_inventor ON jobs ((payload::jsonb #>> '{request,invention,worldId}'), (payload::jsonb #>> '{request,invention,actorId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_speech_event ON jobs ((payload::jsonb #>> '{playerSpeechEventId}')) WHERE (payload::jsonb #>> '{kind}') = 'chat';
      CREATE INDEX IF NOT EXISTS jobs_inventor_timeline ON jobs ((payload::jsonb #>> '{request,invention,worldId}'), (payload::jsonb #>> '{request,invention,actorId}'), (payload::jsonb #>> '{request,invention,timelineId}'), created_at, id);
      CREATE INDEX IF NOT EXISTS jobs_unfinished ON jobs(id) WHERE (payload::jsonb #>> '{status}') IN ('queued','judging','generating');
      CREATE UNIQUE INDEX IF NOT EXISTS decision_actor_active ON jobs
        ((payload::jsonb #>> '{decision,worldId}'), (payload::jsonb #>> '{decision,timelineId}'), (payload::jsonb #>> '{decision,actorId}'))
        WHERE (payload::jsonb #>> '{decision,higher,state}') IN ('queued','preparing','reserved','dispatched');
      CREATE INDEX IF NOT EXISTS decision_unfinished ON jobs(id)
        WHERE (payload::jsonb #>> '{decision,phase}') IN ('immediate','waiting-primary','higher');
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
      CREATE TABLE IF NOT EXISTS intelligence_calls (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS intelligence_calls_time ON intelligence_calls(started_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS intelligence_calls_parent_time ON intelligence_calls((payload::jsonb #>> '{parentId}'), started_at DESC, id DESC);
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
    if (this.rawDb.materializationTransaction) {
      await this.journal.initialize();
      await this.journal.flush();
      this.recoveryState = undefined;
      if (
        this.rawDb.shareApplicationLease &&
        this.rawDb.confirmApplicationLease &&
        this.rawDb.applicationBarrier
      ) {
        const source = await this.rawDb.shareApplicationLease(() => {
          void this.applicationWorker?.close().catch(() => undefined);
        });
        this.applicationLeaseShared = true;
        const worker = (this.applicationWorker = new JournalWorker(
          source,
          (error) => {
            this.applicationFailure ??= error;
          },
          { profiling: profilingEnabled() },
        ));
        this.applicationMeasurements = worker.statistics;
        try {
          await worker.ready;
          await this.rawDb.confirmApplicationLease();
          await worker.activate();
        } catch (error) {
          await worker.close();
          this.applicationWorker = undefined;
          throw error;
        }
      }
      this.journalActive = true;
    }
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
    return {
      ...state,
      world: compactContributionHistory(
        compactAppraisalHistory(compactObjectHistory(compactHistory(state.world))),
      ),
    };
  }
  /** Preparation half of a snapshot's commit, computed immediately inside the mutation queue
   * (no I/O); the transaction consumes it later, for example in a background save. */
  prepareCommit(
    expectedRevision: number,
    state: SavedWorld,
    history: { before?: WorldState; after: WorldState },
  ): PreparedCommit {
    if (this.acceptedRevision !== expectedRevision)
      throw new Error('Save conflict: the committed baseline changed before preparation.');
    this.memories.configureWorld(state.world);
    const baseline = this.acceptedState;
    return {
      baseline,
      revision: expectedRevision,
      state,
      changes: timedSync('persistence.prepareRecords', () =>
        this.records.prepare(baseline ?? undefined, state),
      ),
      history: this.prepareHistoryWrite(state, history.before ?? baseline?.world, history.after),
    };
  }
  // The world writer owns this immutable candidate. Do not eagerly encode a second full burst;
  // prepare lookup inputs here, then stream bounded rows within the atomic transaction.
  private prepareHistoryWrite(
    state: SavedWorld,
    historyBefore: WorldState | undefined,
    historyAfter: WorldState,
    restore = false,
  ) {
    return this.readyHistoryWorlds.has(state.world.id) &&
      !restore &&
      Object.isFrozen(historyAfter) &&
      (!historyBefore || Object.isFrozen(historyBefore))
      ? prepareHistory(
          historyBefore,
          historyAfter,
          historyBefore ? provenAppendCount(historyBefore.events, historyAfter.events) : undefined,
        )
      : undefined;
  }
  adoptHistory(original: SavedWorld, prepared: SavedWorld): void {
    if (original !== this.acceptedState || original.world.id !== prepared.world.id)
      throw new Error('Prepared history no longer matches the committed world.');
    this.acceptedState = prepared;
  }
  async hydrateHistory(
    state: SavedWorld,
    actorIds?: string[],
    sourceIds?: string[],
  ): Promise<SavedWorld> {
    if (state !== this.acceptedState) throw new Error('Flush before materializing history.');
    const full = await this.records.withHistory(state, actorIds, sourceIds);
    this.acceptedState = full;
    return full;
  }
  async hydrateStatusEffectHistory(state: SavedWorld): Promise<SavedWorld> {
    if (state !== this.acceptedState)
      throw new Error('Flush before materializing condition history.');
    const full = await this.records.withStatusEffectHistory(state);
    this.acceptedState = full;
    return full;
  }
  async load(active = false): Promise<{ revision: number; state: SavedWorld } | null> {
    await this.ready;
    const snapshot = this.db.readTransaction?.bind(this.db) ?? this.db.transaction.bind(this.db);
    const captured = await snapshot(async () => {
      const loaded = await this.records.load(active);
      if (!loaded) return null;
      return {
        canonical: loaded,
        historyCount: await (active
          ? this.history.retainedEventCount(loaded.state.world.id)
          : this.history.auditEventCount(loaded.state.world.id)),
      };
    });
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
      if (this.journalActive) this.journal.synchronized(state.world.id, canonical.revision);
      // A failed read, audit or validation cannot restore a lost incremental baseline.
      this.baselineLost = false;
      // Accepted canonical records are immutable predecessors. Physical evidence
      // page layouts must survive the next diff, including direct store callers.
      freezeWorld(state.world);
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
  async commit(
    expectedRevision: number,
    state: SavedWorld,
    invalidatedMemoryIds?: Record<string, string[]>,
    appendEventCount?: number,
    historyProjection?: {
      before?: WorldState;
      after: WorldState;
      receipt?: GameplayReceipt;
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
    await this.ready;
    if (this.applicationFailure) throw this.applicationFailure;
    if (this.acceptedRevision !== expectedRevision) {
      if (this.baselineLost)
        throw new Error(
          'The committed baseline is unknown after a failed save; restart to reload it.',
        );
      const persisted = await this.load();
      if ((persisted?.revision ?? 0) !== expectedRevision)
        throw new Error('Save conflict: another writer changed this world.');
    }
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
        historyProjection?.restore)
    )
      throw new Error('Prepared world changes no longer match the committed baseline.');
    appendEventCount = this.acceptedState
      ? provenAppendCount(this.acceptedState.world.events, state.world.events)
      : undefined;
    const changes =
      prepared?.changes ??
      timedSync('persistence.prepareRecords', () =>
        this.records.prepare(this.acceptedState ?? undefined, state),
      );
    let committedRevision = expectedRevision;
    const write: TableWrite = {
      before: this.acceptedState,
      state,
      revision: expectedRevision + 1,
      changes,
      historyBefore: historyProjection?.before,
      historyAfter: historyProjection?.after ?? state.world,
      restore: !!historyProjection?.restore,
    };
    const publish = () => {
      this.memories.acceptedSourceChanges(state.world.id, changes, write.restore);
      this.publishWorldTables(write);
      if (this.journalActive) this.journal.synchronized(state.world.id, committedRevision);
    };
    let publicationDeferred = false;
    const preparedHistory = prepared
      ? prepared.history
      : this.prepareHistoryWrite(
          state,
          historyProjection?.before ?? this.acceptedState?.world,
          historyProjection?.after ?? state.world,
          !!historyProjection?.restore,
        );
    write.preparedHistory = preparedHistory;
    if (this.canDeferWorldTables(write, historyProjection, invalidatedMemoryIds)) {
      const constraints = prepareJournalConstraints(state.world.id, changes);
      const encoded = constraints && encodeJournalTransition(changes, preparedHistory!);
      if (!constraints) countMetric('persistence.journalFallback.constraints');
      else if (!encoded) countMetric('persistence.journalFallback.bytes');
      if (constraints && encoded) {
        // Prepare only changed source fields through their actual writer. Full current
        // validation remains at load/recovery; it is not a per-command history scan.
        write.preparedSources = this.memories.prepareSources(state.world.id, changes, state.world);
        write.deferred = true;
        const compact: CompactJournalWrite = {
          worldId: state.world.id,
          revision: write.revision,
          restore: false,
          deferred: true,
          changes,
          sources: write.preparedSources,
          history: prepareHistoryAppend(preparedHistory!),
          historyChanged: !!preparedHistory!.changed.length || !!preparedHistory!.removed.length,
        };
        const appended = await timed('persistence.journalAppend', () =>
          this.journal.append(state.world.id, expectedRevision, encoded, compact, async () => {
            if (this.applicationFailure) throw this.applicationFailure;
            if (!(await journalConstraints(this.rawDb, constraints, await this.journal.pending())))
              return { kind: 'synchronous' };
            if (historyProjection?.authority)
              await this.authority.assertFence(historyProjection.authority);
            const receipt = historyProjection?.receipt
              ? this.commands.prepareSave(state.world.id, historyProjection.receipt, 'advanced')
              : undefined;
            return { kind: 'admitted', ...(receipt ? { receipt } : {}) };
          }),
        );
        if (appended.kind === 'appended') {
          countMetric('persistence.journalAccepted');
          this.acceptedRevision = appended.revision;
          this.acceptedState = state;
          this.memories.acceptedSourceChanges(state.world.id, changes);
          this.journal.schedule();
          return appended.revision;
        }
        countMetric('persistence.journalFallback.admission');
        delete write.deferred;
      }
    }
    const transaction = timed('persistence.transaction', () =>
      this.db.transaction(async () => {
        if (this.applicationFailure) throw this.applicationFailure;
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
        const ledgerKey = `forget-ledger:${state.world.id}`;
        const forgettingChanged =
          this.acceptedRevision !== expectedRevision ||
          this.acceptedState?.world.experience?.forgotten !== state.world.experience?.forgotten;
        const ledger = (
          forgettingChanged ? ((await this.getIntegration(ledgerKey)) ?? {}) : {}
        ) as Record<string, string[]>;
        for (const [actorId, ids] of Object.entries(ledger))
          if (ids.some((id) => !state.world.experience?.forgotten[actorId]?.includes(id)))
            throw new Error(
              'Restore would resurrect forgotten evidence; reapply the current forgetting ledger first.',
            );
        if (
          state.world.experience &&
          this.acceptedState?.world.experience?.forgotten !== state.world.experience.forgotten
        )
          await this.putIntegration(ledgerKey, state.world.experience.forgotten);
        const invalidations: Record<string, string[]> = structuredClone(invalidatedMemoryIds ?? {});
        for (const [actorId, records] of Object.entries(state.world.memories)) {
          const prior = this.acceptedState?.world.memories[actorId];
          if (!prior || appendedRecordCount(prior, records) !== undefined) continue;
          const current = new Map(records.map((m) => [m.id, m]));
          const ids = prior
            .filter(
              (m) =>
                !current.has(m.id) ||
                (current.get(m.id) !== m &&
                  JSON.stringify(current.get(m.id)) !== JSON.stringify(m)),
            )
            .map((m) => m.id);
          if (ids.length)
            invalidations[actorId] = [...new Set([...(invalidations[actorId] ?? []), ...ids])];
        }
        for (const [actorId, ids] of Object.entries(invalidations)) {
          await this.vectors?.invalidate(`vectors:${state.world.id}:${actorId}`, ids);
          await this.putIntegration(`vectors:${state.world.id}:${actorId}`, null);
        }
        await this.applyWorldTables(write);
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

  private canDeferWorldTables(
    write: TableWrite,
    projection: Parameters<WorldStore['commit']>[4],
    invalidated?: Record<string, string[]>,
  ): boolean {
    const { before, state, preparedHistory } = write;
    const eligible =
      this.journalActive &&
      !this.rawDb.transactionActive &&
      !!before &&
      before.world.id === state.world.id &&
      !this.records.needsHotPrune &&
      Object.isFrozen(before.world) &&
      Object.isFrozen(state.world) &&
      !!preparedHistory &&
      !!preparedHistory.previous &&
      preparedHistory.previous.storyPolicyRevision === preparedHistory.world.storyPolicyRevision &&
      preparedHistory.previous.authorship === preparedHistory.world.authorship &&
      this.readyHistoryWorlds.has(state.world.id) &&
      !projection?.restore &&
      !write.changes.expired?.size &&
      !projection?.bindingChange &&
      !projection?.controlChange &&
      !projection?.participationChange &&
      !projection?.operationalChange &&
      !projection?.constructionSeeds?.length &&
      !projection?.constructionChanges &&
      !projection?.constructionFences?.length &&
      !projection?.campAssetFences?.length &&
      !projection?.authorityBindings?.length &&
      !projection?.authorityOwners?.size &&
      !Object.values(invalidated ?? {}).some((ids) => ids.length);
    if (!eligible) {
      countMetric('persistence.journalFallback.boundary');
      return false;
    }
    this.records.bindAcceptedParents(write.changes, before);
    if (!journalTableFamily(before.world, state.world, write.changes, preparedHistory.changed)) {
      countMetric('persistence.journalFallback.family');
      return false;
    }
    if (!this.history.canDeferAppend(write.historyAfter, preparedHistory)) {
      countMetric('persistence.journalFallback.history');
      return false;
    }
    return true;
  }

  private publishWorldTables(
    write: TableWrite | CompactJournalWrite,
    remoteSources?: PreparedMemorySources,
  ): void {
    this.readyHistoryWorlds.add('worldId' in write ? write.worldId : write.state.world.id);
    this.records.needsHotPrune = false;
    const memoryRevision = this.memories.publicationRevision;
    this.history.committed();
    this.memories.committed(
      'worldId' in write ? write.worldId : write.state.world.id,
      write.changes,
      write.restore,
    );
    this.memories.lexicalCommitted(remoteSources);
    // The live world was already published at durable journal acknowledgement.
    // Its SQL-derived read tokens advance only here; quiet/paused clients need
    // this second notification rather than waiting for an unrelated world tick.
    if (
      write.deferred &&
      (memoryRevision !== this.memories.publicationRevision ||
        ('historyChanged' in write
          ? write.historyChanged
          : !!write.preparedHistory?.changed.length || !!write.preparedHistory?.removed.length))
    )
      for (const listener of this.projectionListeners) listener();
  }
  private async applyOnlineJournal(
    range: JournalRange,
    retained: ReadonlyMap<number, RetainedJournal<CompactJournalWrite>>,
  ): Promise<JournalApplied | undefined> {
    const worker = this.applicationWorker;
    if (!worker || retained.size !== range.through - range.first + 1) return;
    const entries: ReadonlyMap<number, RetainedJournal<JournalTables>> = retained;
    for (const [revision, entry] of retained)
      if (entry.preparation.revision !== revision || entry.preparation.worldId !== range.worldId)
        throw new Error('Journal application preparation has a different owner.');
    let result: JournalApplied;
    let recovered = false;
    try {
      result = await worker.apply(range, entries);
      if (result.bytes !== [...retained.values()].reduce((sum, entry) => sum + entry.bytes, 0))
        throw new Error('Journal worker completion has different byte debt.');
    } catch (error) {
      this.applicationFailure ??=
        error instanceof Error ? error : new Error('Journal worker failed.');
      await worker.close();
      this.applicationWorker = undefined;
      // JS exit alone does not prove an already-sent SQL COMMIT has settled.
      // Exclusive reacquisition also waits for the subordinate database session.
      result = await this.rawDb.applicationBarrier!(async () => {
        const head = await this.rawDb
          .prepare(
            'SELECT world_id,generation,revision,applied_revision FROM world_head WHERE id=1',
          )
          .get();
        if (
          !head ||
          head['world_id'] !== range.worldId ||
          head['generation'] !== range.generation ||
          Number(head['revision']) < range.through ||
          Number(head['applied_revision']) !== range.through
        )
          throw error;
        const rows = await this.rawDb
          .prepare(
            'SELECT revision FROM world_change_journal WHERE world_id=? AND generation=? AND revision BETWEEN ? AND ?',
          )
          .all(range.worldId, range.generation, range.first, range.through);
        if (rows.length) throw error;
        return {
          ...range,
          bytes: [...retained.values()].reduce((sum, entry) => sum + entry.bytes, 0),
        };
      });
      recovered = true;
      countMetric('persistence.worker.recoveredCompletion');
      console.error('Recovered committed journal application; off-thread application retired.');
    }
    // Same exact retained preparations, published ONCE and only after COMMIT (or
    // exclusive, durable-head proof). Future work uses the same local owner if
    // the supervised worker had to retire. An unapplied failure never retries.
    for (const entry of retained.values())
      this.publishWorldTables(entry.preparation, entry.preparation.sources);
    if (recovered) this.applicationFailure = undefined;
    return result;
  }

  private localJournalWriter?: JournalTableWriter;
  private async applyJournal(
    entry: JournalApplication,
    prepared?: CompactJournalWrite,
  ): Promise<void> {
    if (prepared) {
      if (prepared.revision !== entry.revision || prepared.worldId !== entry.worldId)
        throw new Error('Journal application preparation has a different owner.');
      this.localJournalWriter ??= new JournalTableWriter(this.db);
      await this.localJournalWriter.apply(entry, prepared);
      this.db.afterCommit?.(() => this.publishWorldTables(prepared, prepared.sources));
      return;
    }
    let write: TableWrite;
    {
      this.recoveryState ??= (await this.records.loadApplied())?.state;
      if (!this.recoveryState) throw new Error('Journal recovery has no applied world.');
      freezeWorld(this.recoveryState.world);
      const after = reconstructJournalWorld(this.records, this.recoveryState, entry.transition);
      freezeWorld(after.world);
      write = {
        before: this.recoveryState,
        state: after,
        revision: entry.revision,
        changes: entry.transition.changes,
        historyBefore: this.recoveryState.world,
        historyAfter: after.world,
        preparedHistory: prepareJournalHistory(
          this.recoveryState.world,
          after.world,
          entry.transition.history,
        ),
        restore: false,
        deferred: true,
      };
    }
    if (write.revision !== entry.revision || write.state.world.id !== entry.worldId)
      throw new Error('Journal application preparation has a different owner.');
    await this.applyWorldTables(write);
    const applied = write;
    this.db.afterCommit?.(() => {
      this.publishWorldTables(applied);
      if (!prepared) this.recoveryState = applied.state;
    });
  }

  private async applyWorldTables(write: TableWrite): Promise<void> {
    const {
      before,
      state,
      revision,
      changes,
      historyBefore,
      historyAfter,
      preparedHistory,
      restore,
    } = write;
    const historyKey = `history-schema:${state.world.id}`;
    const historyReady =
      this.readyHistoryWorlds.has(state.world.id) || (await this.integrationValues.get(historyKey));
    const sharedWrites = new SqlWriteBatch(this.db);
    await timed('history.project', () =>
      this.history.project(
        historyReady ? (historyBefore ?? before?.world) : undefined,
        historyAfter,
        historyReady
          ? provenAppendCount((historyBefore ?? before?.world)?.events ?? [], historyAfter.events)
          : undefined,
        !!restore,
        preparedHistory,
        sharedWrites,
        changes,
      ),
    );
    if (!historyReady) await this.integrationValues.put(historyKey, 1);
    if (!write.deferred) {
      const outcomes = new Map<
        string,
        { ok: boolean; message: string; code: string; recipeId?: string }
      >();
      for (const [id, receipt] of Object.entries(state.world.responseReceipts ?? {}))
        if (receipt !== before?.world.responseReceipts?.[id] && receipt.outcome)
          outcomes.set(id, receipt.outcome);
      for (const [id, receipt] of Object.entries(state.world.declarationReceipts))
        if (receipt !== before?.world.declarationReceipts[id])
          outcomes.set(id, {
            ok: true,
            code: 'admitted',
            message: 'Definition admitted.',
            recipeId: receipt.recipeId,
          });
      for (const [actorId, inner] of Object.entries(state.world.innerWorlds ?? {}))
        if (
          inner.publicationJobId &&
          inner.publicationJobId !== before?.world.innerWorlds?.[actorId]?.publicationJobId
        )
          outcomes.set(inner.publicationJobId, {
            ok: true,
            code: 'snapshot-published',
            message: 'Inner world published.',
          });
      for (const [id, result] of restore ? [] : outcomes) {
        const status = result.ok ? 'completed' : 'failed';
        // Merge only completion fields within the world transaction, preserving the
        // current diagnostic metadata without a separate read round trip. Decision roots
        // are settled by their exact operational owner in this same transaction.
        // Missing jobs stay absent; putJob still owns request/fingerprint admission.
        const written = await this.db
          .prepare(
            `UPDATE jobs SET payload=CASE
              WHEN payload::jsonb ->> 'status'='completed' AND ?<>'completed' THEN payload
              ELSE ((payload::jsonb || ?::jsonb) || CASE
                WHEN payload::jsonb ->> 'status'='completed' AND payload::jsonb -> 'completedAt' IS NOT NULL
                THEN jsonb_build_object('completedAt',payload::jsonb -> 'completedAt')
                ELSE '{}'::jsonb END || CASE
                WHEN ?::text IS NOT NULL AND jsonb_typeof(payload::jsonb -> 'invention')='object'
                THEN jsonb_build_object('invention',(payload::jsonb -> 'invention') ||
                  jsonb_build_object('code','admitted','recipeId',?::text))
                ELSE '{}'::jsonb END)::text END WHERE id=?
              AND (payload::jsonb -> 'decision' IS NULL OR payload::jsonb -> 'decision'='null'::jsonb)
              RETURNING fingerprint,payload::jsonb ->> 'fingerprint' AS body_fingerprint`,
          )
          .get(
            status,
            JSON.stringify({ status, message: result.message, result, completedAt: Date.now() }),
            result.recipeId || null,
            result.recipeId || null,
            id,
          );
        if (written) this.invalidateRead(this.recentJobReads, this.db);
        if (written && written['fingerprint'] !== written['body_fingerprint'])
          throw new Error('A request ID cannot be reused with different input.');
      }
    }
    await applyRecordSources(
      this.records,
      this.memories,
      state.world.id,
      revision,
      changes,
      sharedWrites,
      !restore,
      write.preparedSources,
      state,
    );
    if (restore || !before) await this.memories.reuseVectors(state.world.id);
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
      if (revisedSources.size) await this.memories.reuseVectors(state.world.id, revisedSources);
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
        `SELECT payload FROM jobs WHERE (payload::jsonb #>> '{playerSpeechEventId}') IN (${ids.map(() => '?').join(',')}) AND (payload::jsonb #>> '{kind}') = 'chat' ORDER BY created_at DESC, id DESC`,
      )
      .all(...ids);
    for (const row of rows) {
      const job = JSON.parse(String(row['payload'])) as JobRecord;
      if (job.playerSpeechEventId && !jobs.has(job.playerSpeechEventId))
        jobs.set(job.playerSpeechEventId, job);
    }
    return jobs;
  }

  async putJob(job: JobRecord): Promise<void> {
    await this.ready;
    const status = "jobs.payload::jsonb ->> 'status'";
    // Check identity and preserve completed work in the same statement that writes it;
    // a separate read costs a round trip and races concurrent completions.
    // This exact immediate operational upsert has no canonical-table dependency.
    // Keep any enclosing transaction, without the generic SQL classifier treating
    // ON CONFLICT's UPDATE SET clause as a table and draining unrelated history.
    const written = await this.rawDb
      .prepare(
        `INSERT INTO jobs VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=
          CASE WHEN ${status}='completed' AND ?<>'completed' THEN jobs.payload
          ELSE (excluded.payload::jsonb || CASE
            WHEN ${status}='completed' AND jobs.payload::jsonb -> 'completedAt' IS NOT NULL
            THEN jsonb_build_object('completedAt',jobs.payload::jsonb -> 'completedAt')
            ELSE '{}'::jsonb END)::text END
          WHERE jobs.fingerprint=excluded.fingerprint RETURNING fingerprint`,
      )
      .get(job.id, job.fingerprint, JSON.stringify(job), job.createdAt, job.status)
      .finally(() => this.invalidateRead(this.recentJobReads, this.rawDb));
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
        "SELECT id FROM jobs WHERE (payload::jsonb #>> '{decision,worldId}')=? AND (payload::jsonb #>> '{decision,timelineId}')=? AND (payload::jsonb #>> '{decision,actorId}')=? AND (payload::jsonb #>> '{decision,higher,state}') IN ('queued','preparing','reserved','dispatched') AND id<>? LIMIT 1",
      )
      .get(worldId, timelineId, actorId, except));
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
    const timeline = selection
      ? " AND (payload::jsonb #>> '{request,invention,timelineId}') = ?"
      : '';
    return (
      await this.db
        .prepare(
          `SELECT payload FROM jobs WHERE (payload::jsonb #>> '{request,invention,worldId}') = ? AND (payload::jsonb #>> '{request,invention,actorId}') = ?${timeline} AND (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT ?`,
        )
        .all(
          worldId,
          actorId,
          ...(selection ? [selection.timelineId] : []),
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
          "SELECT id FROM jobs WHERE (payload::jsonb #>> '{decision,phase}') IN ('immediate','waiting-primary','higher') ORDER BY id LIMIT 50",
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
          "SELECT payload FROM jobs WHERE (payload::jsonb #>> '{status}') IN ('queued','judging','generating') ORDER BY id LIMIT 50",
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
                "UPDATE jobs SET payload=? WHERE id=? AND (payload::jsonb ->> 'status') IN ('queued','judging','generating') RETURNING id",
              )
              .get(JSON.stringify(interrupted), job.id);
            if (!written) return;
            this.invalidateRead(this.recentJobReads, this.db);
            const diagnostic = await this.intelligenceCall(job.id);
            if (diagnostic?.status !== 'running') return;
            await this.db
              .prepare(
                "UPDATE intelligence_calls SET payload=? WHERE id=? AND (payload::jsonb ->> 'status')='running'",
              )
              .run(
                JSON.stringify({
                  ...diagnostic,
                  status: 'failed',
                  disposition: 'stale',
                  completedAt: new Date(completedAt).toISOString(),
                  output: { message: interrupted.message },
                }),
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
    this.settlementListeners.clear();
    await this.ready.catch(() => undefined);
    try {
      if (this.journalActive) await this.journal.flush();
    } finally {
      try {
        await this.saves.close();
      } finally {
        try {
          await this.applicationWorker?.close();
          // With a healthy original primary, do not release its last reservation
          // until every subordinate server session is known to have finished.
          if (this.applicationLeaseShared && this.rawDb.applicationBarrier)
            await this.rawDb.applicationBarrier(async () => undefined);
        } finally {
          try {
            await this.memories.closeLexical();
          } finally {
            await this.db.close();
          }
        }
      }
    }
  }
}
