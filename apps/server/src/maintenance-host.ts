import type { ExperienceEntry, MindFiles } from '@open-legend/domain';
import type { AiResult, GenerateRequest, JudgeRequest, JudgeValue } from '@open-legend/ai';
import type { ActorWork } from './actor-work.js';
import type { AppConfig } from './config.js';
import type { ExecutionLease } from './cognition-execution.js';
import type { ConsolidationBatch } from './memory-consolidation.js';
import type { GameRepository, JobRecord } from './store.js';
import type { WorldService } from './world-service.js';
import type { MacrofoldBackend } from './macrofold.js';
import type { boundSummarySchema } from './cognition-contracts.js';
import type { z } from 'zod';
import type { HttpPublication } from '@open-legend/network';

export interface MaintenanceActor {
  readonly actorId: string;
  readonly name: string;
  readonly alive: boolean;
  readonly available: boolean;
  readonly reflectionSafe: boolean;
  readonly bodyFence: string;
  readonly hasAction: boolean;
  readonly activePlan: boolean;
  readonly simTime: number;
  readonly lastReflectionAt: number;
  readonly dream?: {
    readonly episode: string;
    readonly elapsedSeconds: number;
    readonly afterSeconds: number;
  };
  readonly learningPending: boolean;
}
export interface MaintenanceAdmission {
  readonly actorId: string;
  readonly generation: string;
  readonly fence: string;
  readonly purpose: 'maintenance' | 'reflection';
  requiresBody: boolean;
  dreamEpisode?: string;
}
export interface MaintenanceInspection {
  /** Acknowledge against the real owner's current inputs and dependencies. */
  acknowledge(nextSimAt: number): Promise<boolean>;
  release(): void;
}
export type MaintenanceLearningBatch = Awaited<ReturnType<WorldService['prepareActivityLearning']>>;
export type MaintenanceReflectionValue = Extract<
  Awaited<ReturnType<MacrofoldBackend['reflect']>>,
  { outcome: 'value' }
>['value'];
export type MaintenanceInterpretation = NonNullable<
  z.infer<ReturnType<typeof boundSummarySchema>>['interpretation']
>;
export interface PreparedMaintenanceReflection {
  readonly context: Record<string, unknown>;
  readonly diagnostics: unknown;
  readonly schema: GenerateRequest['schema'];
  files(): Promise<MindFiles>;
  readonly publication?: HttpPublication;
  validate(): Promise<void>;
  publish(value: MaintenanceReflectionValue): Promise<{ ok: boolean; message: string }>;
  dispose(): void;
}
export interface PreparedMaintenanceConsolidation {
  readonly requests: readonly {
    readonly context: Record<string, unknown>;
    readonly handles: ReadonlyMap<string, ExperienceEntry>;
  }[];
  request(
    index: number,
    context: Record<string, unknown>,
    handles: ReadonlyMap<string, ExperienceEntry>,
  ): Promise<{
    context: Record<string, unknown>;
    schema: ReturnType<typeof boundSummarySchema>;
    interpreting: boolean;
    publication?: HttpPublication;
    /** Resolution stays with the actual source/binding owner. */
    interpretation(value: MaintenanceInterpretation): unknown;
  }>;
  publish(
    groups: readonly { sourceKeys: string[]; text: string }[],
    interpretation: unknown,
  ): Promise<{ ok: boolean; message: string }>;
  dispose(): void;
}

/** The asynchronous maintenance owner shares scheduling, provider accounting
 * and chronology. These finite reads/callbacks keep mutation and permission
 * validation with the Source or native authority; this is not a world facade. */
export interface MaintenanceHost {
  readonly worldId: string;
  readonly generation: string;
  readonly timelineId: string;
  readonly simTime: number;
  readonly paused: boolean;
  readonly reflectionEnabled: boolean;
  readonly memoryBacklog: unknown;
  readonly config: AppConfig;
  readonly store: GameRepository;
  subscribe(callback: () => void): () => void;
  notify(): void;
  publishRecall<T>(work: () => Promise<T>): Promise<T>;
  durabilityTicket(): number;
  isDurable(ticket: number): boolean;
  whenDurable(ticket?: number): Promise<unknown>;
  clearIntake(): void;
  refresh(work: ActorWork): Promise<void>;
  inspection(work: ActorWork, actorId: string): Promise<MaintenanceInspection>;
  actor(actorId: string): Promise<MaintenanceActor | undefined>;
  rawDeadlines(actorId: string): Promise<readonly number[]>;
  admission(
    actorId: string,
    generation: string,
    purpose: MaintenanceAdmission['purpose'],
    requiresBody: boolean,
  ): Promise<MaintenanceAdmission | undefined>;
  releaseAdmission(admission: MaintenanceAdmission): void;
  assertAdmission(admission: MaintenanceAdmission): Promise<void>;
  memoryMaintenanceStatus(actorId: string): Promise<{
    hasMemories: boolean;
    rawDue: boolean;
    pressure: boolean;
  }>;
  maintenanceBatch(
    actorId: string,
    mode: ConsolidationBatch['mode'],
    review?: {
      day: number;
      throughRevision?: number;
      after?: { at: number; sequence: number; id: string };
    },
  ): Promise<ConsolidationBatch | null>;
  prepareActivityLearning(actorId: string): Promise<MaintenanceLearningBatch>;
  acquiredActivitySignatures(actorId: string): Promise<ReadonlySet<string>>;
  publishActivityLearning(
    batch: MaintenanceLearningBatch,
    judgments: readonly ('retain' | 'decline' | 'uncertain')[],
    validateOnly: boolean,
    admission: MaintenanceAdmission | undefined,
    signal: AbortSignal,
  ): Promise<boolean>;
  withExecution<T>(
    actorId: string,
    id: string,
    lease: ExecutionLease,
    work: () => Promise<T>,
  ): Promise<T>;
  prepareReflection(input: {
    actorId: string;
    job: JobRecord;
    reason: string;
    signal: AbortSignal;
    budgetCeiling: number;
    admission: MaintenanceAdmission;
    judge(request: Omit<JudgeRequest, 'requestId' | 'signal'>): Promise<JudgeValue>;
    compact(
      request: Omit<GenerateRequest, 'requestId' | 'signal'>,
      operation: string,
    ): Promise<unknown>;
  }): Promise<PreparedMaintenanceReflection>;
  prepareConsolidation(input: {
    actorId: string;
    batch: ConsolidationBatch;
    job: JobRecord;
    admission: MaintenanceAdmission;
    signal: AbortSignal;
  }): Promise<PreparedMaintenanceConsolidation>;
  /** Actual provider start, after SQL reservation/dispatch writes and source checks. */
  dispatch<T>(
    actorId: string,
    admission: MaintenanceAdmission,
    validate: () => Promise<void>,
    beforeStart: () => void,
    start: (publication: HttpPublication) => Promise<AiResult<T>>,
    requestedPublication?: HttpPublication,
  ): Promise<AiResult<T>>;
}
