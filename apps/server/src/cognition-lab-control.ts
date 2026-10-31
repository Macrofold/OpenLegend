import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { entityGet, isSpeechVolume, occurrenceFor, type WorldEvent } from '@open-legend/domain';
import { EMBEDDING_LIMITS, InvalidData, type AiReceipt } from '@open-legend/ai';
import type {
  ApiResult,
  CognitionLabEvent,
  CognitionLabConfiguration,
  CognitionLabJson,
  CognitionLabPolicy,
  CognitionLabReceipt,
  CognitionLabRun,
  CognitionLabOperation,
  CognitionLabSettings,
  CognitionLabSettingsPatch,
  CognitionLabStage,
  CognitionLabState,
  CognitionLabStimulus,
} from '@open-legend/protocol';
import type { RequestScope } from './authority.js';
import { commandInputSchema } from './command-input-schema.js';
import {
  CognitionLabRecords,
  LabStorageError,
  labJson,
  type LabJson,
  type LabRecord,
  type LabRecordHeader,
} from './cognition-lab-records.js';
import type { CognitionLabSaves } from './cognition-lab-saves.js';
import {
  CognitionControlError,
  type CognitionRuntimeEvent,
  type CognitionStageInput,
  type PreparedCognitionStage,
} from './cognition-runtime-control.js';
import type { WorldRuntime } from './world-runtime.js';
import { humanRequestId } from './human-request-id.js';
import { digest } from './content-digest.js';
import {
  continuationSchema,
  continuationProof,
  type CognitionContinuationDescriptor,
  type ReconstitutedDecision,
} from './cognition-continuation.js';
import { labSavedDataSchema } from './cognition-lab-records.js';
import { assertHigherDecisionModelTransport } from './generation-config.js';

const question = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('choice'),
      instructions: z.string(),
      criteria: z.record(z.string(), z.string().nullable()),
    })
    .strict(),
  z
    .object({ type: z.literal('score'), instructions: z.string(), criteria: z.array(z.string()) })
    .strict(),
  z
    .object({
      type: z.literal('noul'),
      instructions: z.string(),
      criteria: z
        .object({ true: z.string().optional(), false: z.string().optional() })
        .strict()
        .optional(),
    })
    .strict(),
]);
const generation = z
  .object({
    task: z.string(),
    instructions: z.string(),
    context: z.unknown(),
    schema: z.record(z.string(), z.unknown()),
    schemaName: z.string().optional(),
    model: z.string().optional(),
    reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).optional(),
    execution: z.enum(['fast', 'complex', 'full']).optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    macrofoldOutputMode: z.enum(['json_schema', 'json_object', 'prompted_json']).optional(),
  })
  .strict();
const replacementSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('judge'),
      request: z.object({ state: z.unknown(), questions: z.record(z.string(), question) }).strict(),
    })
    .strict(),
  z.object({ kind: z.literal('generate'), request: generation }).strict(),
  z
    .object({
      kind: z.literal('embedding'),
      request: z.object({ texts: z.array(z.string()).min(1).max(EMBEDDING_LIMITS.texts) }).strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('reflection'),
      request: generation,
      files: z.array(z.object({ path: z.string(), text: z.string() }).strict()),
    })
    .strict(),
]);
export interface CognitionLabRunOptions {
  settings(): CognitionLabSettings;
  privacy?(actorId?: string): import('./cognition-lab-records.js').LabJson;
  enabledCustomInputCount(): number;
  changed(): void;
  validateAuthority?(scope: RequestScope): void | Promise<void>;
  scopeAfterRestore?(): RequestScope;
  supportedModels?(): Record<string, string[]>;
  resolveSettings?(patch: CognitionLabSettingsPatch): CognitionLabSettings;
}
interface Interval {
  id: string;
  rootId: string;
  generation: string;
  scope: RequestScope;
  policy: CognitionLabPolicy;
  sourceIds: Set<string>;
  focalJobs: Set<string>;
  submitted: boolean;
  expectedJobId?: string;
  completed?: boolean;
  step?: boolean;
  calls: number;
  startedSim: number;
  activeMs: number;
  activeStarted?: number;
  reservation: string;
  primaryStageId?: string;
  configuration: CognitionLabConfiguration;
  processingStartMs: number;
  captureMs: number;
  operatorHoldMs: number;
}
interface Capture {
  id: string;
  stage: CognitionLabStage;
  native: PreparedCognitionStage;
  reservation: string;
  artifacts: Array<{ kind: 'artifact' | 'record'; id: string }>;
  provenance: ReturnType<CognitionLabRunController['provenance']>;
  wireDone?: boolean;
  preparedReady?: boolean;
  terminal?: boolean;
  wireCapture?: 'captured' | 'partial' | 'unavailable';
}
interface RunDisclosure {
  privacy?: LabJson;
}

/** Experiment orchestration observes ordinary native owners; it never substitutes a
 * character scheduler, provider adapter, command executor or financial ledger.
 */
export class CognitionLabRunController {
  private run?: CognitionLabRun;
  // Mutable run views keep the original disclosure boundary through later names,
  // counters and comparison bindings; a rewrite never grants new source access.
  private readonly runDisclosures = new WeakMap<CognitionLabRun, RunDisclosure>();
  private stateValue: CognitionLabState = 'ready';
  private interval?: Interval;
  private readonly captures = new Map<string, Capture>();
  private captureTail: Promise<void> = Promise.resolve();
  private readonly contexts = new Map<
    string,
    { stageId: string; available: boolean; count: number }
  >();
  private readonly comparisons = new Map<
    string,
    {
      runId: string;
      reservation: string;
      scope: RequestScope;
      artifacts: CognitionLabStage['artifacts'];
      captureMs: number;
      partial: boolean;
      provenance: LabJson;
      abort: AbortController;
      settled: Promise<void>;
    }
  >();
  private readonly jobs = new Map<
    string,
    { rootId: string; sourceIds: string[]; actorId?: string }
  >();
  private readonly pending = new Set<Promise<unknown>>();
  private readonly heldWaiters = new Set<() => void>();
  private readonly submissions = new Map<string, Promise<CognitionLabReceipt>>();
  private timer?: ReturnType<typeof setTimeout>;
  private finishing?: Promise<void>;
  private lastSequence: number;
  private readonly unsubscribe: () => void;
  private readonly unsubscribeControl: () => void;
  private closed = false;
  private admissionEpoch = 0;
  private interruptionEpoch = 0;
  private readonly control;

  constructor(
    private readonly runtime: WorldRuntime,
    private readonly records: CognitionLabRecords,
    private readonly saves: CognitionLabSaves,
    private readonly options: CognitionLabRunOptions,
  ) {
    const control = runtime.service.cognitionControl;
    if (!control) throw new Error('A lab runtime requires its scoped cognition controller.');
    this.control = control;
    this.lastSequence = runtime.service.world.sequence;
    control.setObserver((event) => {
      if (event.kind === 'control') return;
      const interval = this.interval,
        run = this.run,
        captureStarted = performance.now(),
        release = runtime.clock.holdBoundary();
      return this.captureWrite(async () => {
        try {
          await this.observe(event, interval, run);
        } catch (error) {
          if (run) {
            run.completeness = 'partial';
            run.reason =
              error instanceof Error ? error.message : 'Experiment evidence could not be retained.';
          }
          this.control.hold();
          this.options.changed();
          if (
            event.kind === 'prepared' ||
            event.kind === 'wire' ||
            event.kind === 'settled' ||
            event.kind === 'failed' ||
            event.kind === 'cancelled' ||
            event.kind === 'reused'
          ) {
            const capture =
              event.kind === 'wire'
                ? [...this.captures.values()].find((item) => item.native.id === event.attemptId)
                : this.captures.get(event.stage.handle);
            try {
              if (capture) {
                capture.stage.completeness = 'partial';
                capture.stage.status = 'captureFailed';
                capture.stage.summary =
                  run?.reason ?? 'The native result could not be retained completely.';
                await this.writeCapture(capture).catch(() => undefined);
                await this.records.release(capture.reservation);
                this.captures.delete(capture.native.handle);
              }
            } finally {
              // Background preparation has no decision-job terminal event to wake
              // Held waiters. Cleanup failure must not prevent native settlement;
              // unreleased capture credit remains recorded for reconciliation.
              if (this.run === run && this.interval === interval)
                this.background(
                  this.finish(
                    run?.reason ?? 'Native work settled with incomplete experiment evidence.',
                    false,
                    true,
                  ),
                );
            }
          }
          if (
            event.kind === 'job' &&
            ['completed', 'failed', 'cancelled', 'stale'].includes(event.status) &&
            this.run === run &&
            this.interval === interval
          )
            this.background(
              this.finish(
                run?.reason ?? 'Native work settled with incomplete experiment evidence.',
              ),
            );
          else throw error;
        } finally {
          release?.();
          if (interval) interval.captureMs += performance.now() - captureStarted;
        }
      });
    });
    control.setAuthorityCheck(() => {
      if (this.interval) runtime.service.assertScope(this.interval.scope, 'create');
    });
    this.unsubscribeControl = control.subscribe(() => this.clockChanged());
    this.unsubscribe = runtime.service.subscribe(() => {
      const interval = this.interval;
      if (!interval || this.closed) return;
      if (runtime.service.generation !== interval.generation) {
        this.background(this.finish('The scenario was replaced.', true, true));
        return;
      }
      const events = runtime.service.world.events.filter(
        (event) => event.sequence > this.lastSequence,
      );
      this.lastSequence = runtime.service.world.sequence;
      if (events.length && !interval.completed) this.background(this.captureEvents(events));
      if (this.stateValue === 'running') {
        if (runtime.service.world.simTime - interval.startedSim >= interval.policy.durationSeconds)
          this.background(
            this.finish(
              this.noAdmissionReason(
                interval.policy.mode === 'forDuration'
                  ? 'The requested simulation duration elapsed.'
                  : 'Run limit reached: simulation time.',
              ),
            ),
          );
        const selected =
          interval.policy.mode === 'untilCondition' ? interval.policy.stopCondition : undefined;
        if (selected?.kind === 'actionOutcome' && interval.policy.focalActorId) {
          const occurrence = occurrenceFor(
            runtime.service.world,
            interval.policy.focalActorId,
            selected.id,
          );
          if (occurrence && occurrence.status !== 'running')
            this.background(
              this.finish(
                occurrence.outcome?.message ?? 'The selected action reached its native outcome.',
              ),
            );
        }
        if (
          selected?.kind === 'nextEvent' &&
          events.some((event) => !selected.id || event.type === selected.id)
        )
          this.background(this.finish('The selected committed native event boundary was crossed.'));
        if (interval.step && events.length)
          this.background(this.finish('The next committed native event boundary was crossed.'));
      }
    });
  }
  get current(): CognitionLabRun | undefined {
    return this.run;
  }
  get state(): CognitionLabState {
    return this.stateValue;
  }
  async responseRetry(scope: RequestScope): Promise<CognitionLabRun['responseRetry']> {
    if (!this.interval || this.stateValue === 'running' || this.stateValue === 'settling') return;
    const jobId = [...this.interval.focalJobs].at(-1);
    return jobId ? this.runtime.director.responseRetry(jobId, scope) : undefined;
  }
  private background<T>(work: Promise<T>): void {
    this.pending.add(work);
    void work
      .catch((error: unknown) => {
        if (this.run) {
          this.run.completeness = 'partial';
          this.run.reason =
            error instanceof Error ? error.message : 'Experiment evidence could not be saved.';
          this.control.hold();
          this.stateValue = this.run.state = 'held';
          this.options.changed();
          this.signalHeld();
        }
      })
      .finally(() => this.pending.delete(work));
  }
  private async authorize(scope: RequestScope): Promise<void> {
    this.runtime.service.assertScope(scope, 'create');
    await this.options.validateAuthority?.(scope);
    this.runtime.service.assertScope(scope, 'create');
  }
  private noAdmissionReason(reason: string): string {
    const interval = this.interval;
    if (
      !interval?.submitted ||
      !interval.sourceIds.size ||
      !interval.policy.focalActorId ||
      !interval.policy.autonomousActorIds.includes(interval.policy.focalActorId) ||
      interval.calls ||
      interval.focalJobs.size
    )
      return reason;
    const capacity = this.runtime.execution.primaryCapacityReason();
    return capacity ? `${reason} ${capacity} No model call was made during this interval.` : reason;
  }
  private clockChanged(): void {
    const interval = this.interval;
    if (!interval) return;
    const now = performance.now();
    if (this.control.held && interval.activeStarted !== undefined) {
      interval.activeMs += now - interval.activeStarted;
      interval.activeStarted = undefined;
    } else if (!this.control.held && interval.activeStarted === undefined)
      interval.activeStarted = now;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.control.held && this.stateValue === 'running') {
      this.timer = setTimeout(
        () => {
          this.background(
            this.finish(this.noAdmissionReason('Run limit reached: active wall time.')),
          );
        },
        Math.max(1, interval.policy.activeWallSeconds * 1000 - interval.activeMs),
      );
      this.timer.unref();
    }
  }
  private decisionStage(stage: PreparedCognitionStage): boolean {
    if (stage.original.kind === 'generate')
      return (
        stage.original.request.task === 'npc_response' || stage.purpose === 'decision-escalation'
      );
    return (
      stage.original.kind === 'judge' &&
      !/(attention|classify|interpret|relevance|parameters)/.test(stage.purpose)
    );
  }
  private stageBoundary(
    policy: CognitionLabPolicy,
  ): ((stage: PreparedCognitionStage) => boolean) | undefined {
    const condition = policy.stopCondition;
    return (policy.mode === 'oneResponse' || policy.mode === 'untilCondition') &&
      condition?.kind === 'nextStage'
      ? (stage) =>
          (!policy.focalActorId || stage.actorId === policy.focalActorId) &&
          (!condition.id || stage.purpose === condition.id)
      : undefined;
  }
  private validatePolicy(policy: CognitionLabPolicy): void {
    for (const number of [policy.durationSeconds, policy.maximumCalls, policy.activeWallSeconds])
      if (!Number.isFinite(number) || number <= 0)
        throw new Error('Run guards must be positive finite values.');
    if (!Number.isSafeInteger(policy.maximumCalls))
      throw new Error('The model call guard must be an integer.');
    if (
      policy.focalActorId &&
      !entityGet(this.runtime.service.world.entities, policy.focalActorId)?.actor
    )
      throw new Error('Choose an existing focal character.');
  }
  private async persistRun(
    reservationId?: string,
    final?: Pick<CognitionLabRun, 'state' | 'status'>,
  ): Promise<void> {
    if (!this.run) return;
    await this.persistRunView(this.run, reservationId, final);
    this.options.changed();
  }
  private async persistRunView(
    run: CognitionLabRun,
    reservationId?: string,
    final?: Pick<CognitionLabRun, 'state' | 'status'>,
  ): Promise<void> {
    // Serialize accounting reads with publication. Otherwise an in-flight native
    // capture can overwrite a later receipt refresh with older cost counters.
    await this.records.db.transaction(async () => {
      const costs = await this.records.costs(run.id);
      const usage = await this.records.runUsage(run.id);
      run.accounting = {
        knownCostUsd: costs.knownUsd,
        uncertainAttempts: costs.uncertainCount,
        capturedBytes: usage?.usedBytes ?? run.accounting.capturedBytes,
      };
      if (costs.unknownCount || costs.uncertainCount) run.completeness = 'partial';
      const view = final ? { ...run, ...final } : run;
      await this.records.putRecord(
        {
          id: run.id,
          kind: 'run',
          runId: run.id,
          createdAt: new Date(run.startedAt).toISOString(),
          name: run.name,
          status: view.state,
          summary: labJson({ ...view, ...(await this.disclosureForRun(run)) }),
          data: labJson(view),
        },
        { reservationId, references: [{ kind: 'record', id: run.originId }] },
      );
    });
  }
  private disclosureFrom(header: LabRecordHeader): RunDisclosure {
    const summary = header.summary;
    return summary &&
      typeof summary === 'object' &&
      !Array.isArray(summary) &&
      summary['privacy'] !== undefined
      ? { privacy: structuredClone(summary['privacy']) }
      : {};
  }
  private async disclosureForRun(run: CognitionLabRun): Promise<RunDisclosure> {
    let disclosure = this.runDisclosures.get(run);
    if (!disclosure) {
      const header = await this.records.getHeader(run.id, 'run');
      if (!header) throw new Error('The run has no captured disclosure boundary.');
      disclosure = this.disclosureFrom(header);
      this.runDisclosures.set(run, disclosure);
    }
    return disclosure;
  }
  private assertAdmission(admission: number): void {
    if (admission !== this.admissionEpoch || this.closed)
      throw new CognitionControlError('This interval was stopped before source admission.');
  }
  private async startInterval(
    policy: CognitionLabPolicy,
    scope: RequestScope,
    admission = this.admissionEpoch,
  ): Promise<Interval> {
    const current = () => {
      this.assertAdmission(admission);
    };
    await this.authorize(scope);
    current();
    this.validatePolicy(policy);
    if (this.closed) throw new Error('The lab is closed.');
    if (this.stateValue === 'running' || this.stateValue === 'settling')
      throw new Error('Hold the current run before submitting another interval.');
    if (
      !this.run ||
      this.run.state === 'ended' ||
      this.run.worldId !== this.runtime.service.world.id ||
      this.run.timeline !== this.runtime.service.timelineId
    ) {
      const origin = await this.saves.origin();
      try {
        current();
      } catch (error) {
        await this.saves.remove(origin.record.id);
        throw error;
      }
      await this.authorize(scope);
      current();
      const id = randomUUID();
      await this.records.configureRun(id, this.options.settings().runCaptureAllowanceBytes);
      current();
      this.run = {
        id,
        name: `Experiment ${new Date().toLocaleTimeString('en-US', { hour12: false })}`,
        state: 'held',
        status: 'Held',
        startedAt: Date.now(),
        originId: origin.record.id,
        worldId: this.runtime.service.world.id,
        timeline: this.runtime.service.timelineId,
        focalActorId: policy.focalActorId,
        policy: structuredClone(policy),
        counts: { intervals: 0, roots: 0, stages: 0, annotations: 0, calls: 0 },
        accounting: { knownCostUsd: 0, uncertainAttempts: 0, capturedBytes: 0 },
        completeness: 'complete',
        retained: false,
      };
      const privacy = this.options.privacy?.(policy.focalActorId);
      this.runDisclosures.set(
        this.run,
        privacy === undefined ? {} : { privacy: structuredClone(privacy) },
      );
    }
    const reservation = await this.records.reserve(32 * 1024, this.run.id);
    try {
      current();
    } catch (error) {
      await this.records.release(reservation);
      throw error;
    }
    const settings = structuredClone(this.options.settings());
    const configuration: CognitionLabConfiguration = {
      models: settings.models,
      effort: settings.effort,
      maxOutputTokens: settings.maxOutputTokens,
      customInputCount: this.options.enabledCustomInputCount(),
      heldValueCount: this.runtime.service.nativeValueHolds.length,
      requestOverride: false,
      policy: structuredClone(policy),
    };
    const interval: Interval = {
      id: randomUUID(),
      rootId: randomUUID(),
      generation: this.runtime.service.generation,
      scope,
      policy: structuredClone(policy),
      sourceIds: new Set(),
      focalJobs: new Set(),
      submitted: false,
      calls: 0,
      startedSim: this.runtime.service.world.simTime,
      activeMs: 0,
      reservation,
      configuration,
      processingStartMs: this.control.processingMs,
      captureMs: 0,
      operatorHoldMs: 0,
    };
    this.interval = interval;
    this.run.policy = interval.policy;
    this.run.configuration = configuration;
    this.run.focalActorId = policy.focalActorId;
    this.run.counts.intervals++;
    this.run.counts.roots++;
    this.run.latestRootId = interval.rootId;
    this.run.state = this.stateValue = 'running';
    this.run.status = 'Running';
    delete this.run.reason;
    delete this.run.prepared;
    const run = this.run;
    try {
      await this.captureWrite(async () => {
        await this.records.putRecord(
          {
            id: interval.id,
            kind: 'interval',
            runId: run.id,
            createdAt: new Date().toISOString(),
            name: `Interval ${run.counts.intervals}`,
            status: 'running',
            summary: labJson({
              policy,
              startedSim: interval.startedSim,
              configuration,
              ...(await this.disclosureForRun(run)),
            }),
            data: labJson({
              policy,
              settings,
              // The immutable origin and explicit interventions retain experiment
              // values. Copying the full snapshot here makes every interval grow
              // with unrelated/disabled fields and can exceed the metadata bound.
              configuration,
              generation: interval.generation,
            }),
          },
          { reservationId: reservation },
        );
        const root = this.rootStage(interval);
        await this.records.putRecord(
          {
            id: interval.rootId,
            kind: 'stage',
            runId: run.id,
            parentId: interval.id,
            createdAt: new Date().toISOString(),
            name: 'Experiment interval',
            status: 'running',
            summary: labJson({ ...root, ...this.provenance(root.actorId) }),
            data: labJson(root),
          },
          { reservationId: reservation },
        );
        await this.persistRun(reservation);
      });
      this.control.setAutonomousActors(policy.autonomousActorIds);
      this.lastSequence = this.runtime.service.world.sequence;
      current();
      return interval;
    } catch (error) {
      this.run.completeness = 'partial';
      await this.finish('Interval setup failed before source admission.', false, true).catch(
        () => undefined,
      );
      throw error;
    }
  }
  private rootStage(interval: Interval): CognitionLabStage {
    return {
      id: interval.rootId,
      runId: this.run!.id,
      actorId: interval.policy.focalActorId,
      purpose: 'interval',
      kind: 'root',
      status: this.stateValue,
      summary: 'Stimulus or explicit continuation and actual native outcomes for this interval.',
      recordedAt: Date.now(),
      gameTime: interval.startedSim,
      completeness: 'complete',
      sections: [
        { id: 'timeline', label: 'Processing', available: true },
        { id: 'inputs', label: 'Input', available: false, reason: 'Select an actual model call.' },
        { id: 'changes', label: 'Native outcomes', available: true },
      ],
      artifacts: [],
      configuration: interval.configuration,
      timing: {
        processingMs: this.control.processingMs - interval.processingStartMs,
        captureMs: interval.captureMs,
        operatorHoldMs: interval.operatorHoldMs,
      },
      ...(interval.primaryStageId ? { primaryStageId: interval.primaryStageId } : {}),
    };
  }
  submitStimulus(
    input: {
      commandId: string;
      stimulus: CognitionLabStimulus;
      policy: CognitionLabPolicy;
      stagePurpose?: string;
    },
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const previous = this.submissions.get(input.commandId);
    if (previous) return previous;
    const work = this.submit(input, scope);
    this.submissions.set(input.commandId, work);
    while (this.submissions.size > 128)
      this.submissions.delete(this.submissions.keys().next().value!);
    return work;
  }
  private async submit(
    input: {
      commandId: string;
      stimulus: CognitionLabStimulus;
      policy: CognitionLabPolicy;
      stagePurpose?: string;
    },
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const interval = await this.startInterval(input.policy, scope);
    this.runtime.clock.setBlocked(true);
    const focal = input.policy.focalActorId;
    interval.expectedJobId = humanRequestId(scope, input.commandId);
    this.control.resume(
      input.stagePurpose === undefined
        ? this.stageBoundary(input.policy)
        : (stage) =>
            stage.actorId === focal &&
            (input.stagePurpose === 'nextDecision'
              ? this.decisionStage(stage)
              : stage.purpose === input.stagePurpose || stage.original.kind === input.stagePurpose),
    );
    try {
      const stimulus = input.stimulus;
      let outcome: ApiResult & { sourceIds?: string[] };
      if (stimulus.kind === 'say') {
        if (!isSpeechVolume(stimulus.volume)) throw new Error('Choose an installed speech volume.');
        const controlled =
          stimulus.actorId === scope.actorId &&
          this.runtime.service.currentScope(scope, 'play', true);
        const target = stimulus.targetId
          ? entityGet(this.runtime.service.world.entities, stimulus.targetId)
          : undefined;
        if (controlled && target?.actor?.controller === 'npc') {
          outcome = await this.runtime.director.submitInteractive(
            'chat',
            input.commandId,
            stimulus.text,
            stimulus.targetId,
            undefined,
            undefined,
            undefined,
            scope,
            stimulus.volume,
          );
        } else {
          outcome = await this.runtime.service.operatorCommand(
            input.commandId,
            stimulus.actorId,
            commandInputSchema.parse({
              type: 'say',
              text: stimulus.text,
              volume: stimulus.volume,
              ...(stimulus.targetId ? { targetId: stimulus.targetId } : {}),
            }),
            scope,
          );
        }
      } else if (stimulus.kind === 'act') {
        outcome = stimulus.command
          ? await this.runtime.service.operatorCommand(
              input.commandId,
              stimulus.actorId,
              commandInputSchema.parse(stimulus.command),
              scope,
            )
          : stimulus.actorId === scope.actorId &&
              this.runtime.service.currentScope(scope, 'play', true)
            ? await this.runtime.director.submitAction(
                input.commandId,
                stimulus.text,
                'enqueue',
                undefined,
                scope,
              )
            : await this.runtime.director.submitOperatorAction(
                input.commandId,
                stimulus.actorId,
                stimulus.text,
                'enqueue',
                undefined,
                scope,
              );
      } else {
        // Supported native event intentions use their real command owner; arbitrary prose
        // remains a model-only field and never becomes a fabricated physical event.
        if (!stimulus.actorId)
          throw new Error('A native event intention requires its exact acting character.');
        outcome = await this.runtime.service.operatorCommand(
          input.commandId,
          stimulus.actorId,
          commandInputSchema.parse(stimulus.event),
          scope,
        );
      }
      const job = outcome.jobId
        ? await this.runtime.service.store.getJob(outcome.jobId)
        : undefined;
      // A native Act may admit no human-response job: perception later owns the
      // focal reaction with its own cause IDs. Follow that first native focal job
      // rather than waiting forever for a human job this stimulus never created.
      // docs/projects/cognition-lab-tech-design.md#82-run-policies-and-guards
      if (!job || job.request.npcId !== focal) delete interval.expectedJobId;
      for (const id of outcome.sourceIds ?? []) interval.sourceIds.add(id);
      if (job?.playerSpeechEventId) interval.sourceIds.add(job.playerSpeechEventId);
      if (outcome.ok && job && job.request.npcId === focal) interval.focalJobs.add(job.id);
      interval.submitted = true;
      const accepted = outcome.ok || interval.sourceIds.size > 0;
      const timelineId = randomUUID();
      await this.captureWrite(async () => {
        await this.records.putRecord(
          {
            id: timelineId,
            kind: 'timeline',
            runId: this.run!.id,
            parentId: interval.rootId,
            ...(stimulus.kind !== 'event' || stimulus.actorId ? { actorId: stimulus.actorId } : {}),
            ...(interval.sourceIds.size ? { sourceId: [...interval.sourceIds][0] } : {}),
            createdAt: new Date().toISOString(),
            name: stimulus.kind,
            status: accepted ? 'accepted' : 'refused',
            summary: labJson({
              id: timelineId,
              runId: this.run!.id,
              rootId: interval.rootId,
              actorId: stimulus.actorId,
              actorName: stimulus.actorId
                ? entityGet(this.runtime.service.world.entities, stimulus.actorId)?.name
                : undefined,
              targetId: stimulus.kind === 'say' ? stimulus.targetId : undefined,
              sourceId: [...interval.sourceIds][0],
              recordedAt: Date.now(),
              gameTime: this.runtime.service.world.simTime,
              text: outcome.message,
              kind: 'stimulus',
              status: accepted ? 'accepted' : 'refused',
              sourceAccepted: accepted,
              ...this.provenance(stimulus.actorId),
            }),
            data: labJson({ stimulus, outcome, sourceIds: [...interval.sourceIds] }),
          },
          { reservationId: interval.reservation },
        );
      });
      if (!accepted) await this.finish(outcome.message);
      else {
        this.runtime.clock.setBlocked(false);
        await this.runtime.director.considerThought();
        if (this.stateValue === 'running' && input.policy.mode === 'oneResponse') {
          if (
            job &&
            ['completed', 'failed', 'cancelled', 'stale'].includes(job.status) &&
            job.request.npcId === focal
          )
            this.background(this.finish(job.message));
          else if (!interval.focalJobs.size) {
            const perceived =
              !focal ||
              [...interval.sourceIds].some((id) =>
                this.runtime.service.world.experience?.awareness[focal]?.some(
                  (entry) => entry.eventId === id,
                ),
              );
            this.background(
              this.finish(
                perceived
                  ? this.noAdmissionReason('No new focal decision was admitted at this boundary.')
                  : 'The focal character did not perceive this stimulus.',
              ),
            );
          }
        }
      }
      return {
        ok: accepted,
        commandId: input.commandId,
        code: outcome.code,
        message: outcome.message,
        sourceAccepted: accepted,
        sourceId: [...interval.sourceIds][0],
        runId: this.run!.id,
      };
    } catch (error) {
      await this.finish(
        error instanceof Error ? error.message : 'The stimulus could not be admitted.',
      );
      throw error;
    } finally {
      this.runtime.clock.setBlocked(false);
    }
  }
  private async captureEvents(events: readonly WorldEvent[]): Promise<void> {
    const run = this.run,
      interval = this.interval;
    if (!run || !interval) return;
    for (const event of events) {
      const view: CognitionLabEvent = {
        id: randomUUID(),
        runId: run.id,
        rootId: interval.rootId,
        actorId: event.actorId,
        actorName: event.actorId
          ? entityGet(this.runtime.service.world.entities, event.actorId)?.name
          : undefined,
        targetId: event.targetId,
        gameTime: event.at,
        recordedAt: Date.now(),
        kind: event.type,
        status: 'committed',
        text: event.text,
        sourceId: event.id,
      };
      await this.records.putRecord({
        id: view.id,
        kind: 'timeline',
        runId: run.id,
        parentId: interval.rootId,
        actorId: event.actorId,
        sourceId: event.id,
        createdAt: new Date(view.recordedAt).toISOString(),
        name: event.type,
        status: 'committed',
        summary: labJson({ ...view, ...this.provenance(event.actorId), nativeEvent: true }),
        data: labJson({ ...view, native: event }),
      });
    }
    this.options.changed();
  }
  /** Recording and interval-credit release share one ordered owner. Native
   * settlement remains outside this lane, so a held observer can always finish. */
  private captureWrite<T>(write: () => Promise<T>): Promise<T> {
    const result = this.captureTail.then(write);
    this.captureTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  private async observe(
    event: CognitionRuntimeEvent,
    interval: Interval | undefined,
    run: CognitionLabRun | undefined,
  ): Promise<void> {
    const captureStarted = performance.now();
    if (event.kind === 'wire') {
      const comparison = this.comparisons.get(event.attemptId);
      if (comparison) {
        await this.authorize(comparison.scope);
        comparison.partial ||=
          !!event.partial || !!event.exchanges?.some((exchange) => exchange.truncated);
        if (event.exchanges?.length) {
          const artifact = await this.records.putArtifact(
            JSON.stringify(event.exchanges),
            'application/json',
            { runId: comparison.runId, reservationId: comparison.reservation },
          );
          comparison.artifacts.push({
            id: artifact.id,
            kind: 'wire',
            length: artifact.bytes,
            contentType: artifact.contentType,
          });
        }
        comparison.captureMs += performance.now() - captureStarted;
        return;
      }
    }
    if (!interval || !run || this.closed) return;
    if (event.kind === 'control') return;
    await this.authorize(interval.scope);
    if (event.kind === 'wire') {
      const capture = [...this.captures.values()].find(
        (item) => item.native.id === event.attemptId,
      );
      if (!capture) return;
      capture.wireDone = true;
      capture.wireCapture = event.exchanges?.length
        ? event.partial || event.exchanges.some((exchange) => exchange.truncated)
          ? 'partial'
          : 'captured'
        : 'unavailable';
      if (event.partial || capture.wireCapture === 'partial') {
        capture.stage.completeness = 'partial';
        run.completeness = 'partial';
      }
      if (event.exchanges?.length) {
        const artifact = await this.records.putArtifact(
          JSON.stringify(event.exchanges),
          'application/json',
          { runId: run.id, reservationId: capture.reservation },
        );
        capture.artifacts.push({ kind: 'artifact', id: artifact.id });
        capture.stage.artifacts.push({
          id: artifact.id,
          kind: 'wire',
          length: artifact.bytes,
          contentType: artifact.contentType,
        });
      }
      capture.stage.sections.push({
        id: 'wire',
        label: 'Provider exchange',
        available: !!event.exchanges?.length,
        reason:
          event.partial || capture.wireCapture === 'partial'
            ? 'The bounded native capture omitted part of this provider exchange.'
            : event.exchanges?.length
              ? undefined
              : 'The native adapter produced no captured HTTP exchanges.',
      });
      capture.stage.timing!.captureMs += performance.now() - captureStarted;
      await this.writeCapture(capture);
      if (capture.terminal) {
        await this.records.release(capture.reservation);
        this.captures.delete(capture.native.handle);
      }
      return;
    }
    if (event.kind === 'context') {
      if (event.generation !== interval.generation)
        throw new CognitionControlError('Context belongs to a replaced scenario.');
      const id = randomUUID(),
        encoded = JSON.stringify({
          diagnostics: event.diagnostics,
          input: event.input,
          selection: event.selection,
        });
      const reservation = await this.records.reserve(
        Buffer.byteLength(encoded) + 32 * 1024 + event.selection.length * 4096,
        run.id,
      );
      try {
        const artifact = await this.records.putArtifact(encoded, 'application/json', {
          runId: run.id,
          reservationId: reservation,
        });
        const selected = event.selection.filter((item) => item.selected).length;
        const stage: CognitionLabStage = {
          id,
          runId: run.id,
          rootId: interval.rootId,
          actorId: event.actorId,
          actorName: entityGet(this.runtime.service.world.entities, event.actorId)?.name,
          gameTime: this.runtime.service.world.simTime,
          purpose: 'Context and retrieval',
          kind: 'retrieval',
          status: 'completed',
          summary: event.selectionAvailable
            ? `${selected} included sources from ${event.selection.length} examined candidates.`
            : 'Native context preparation used its reported fallback; selection manifest unavailable.',
          recordedAt: Date.now(),
          completeness: event.selectionAvailable ? 'complete' : 'partial',
          sections: [
            { id: 'input', label: 'Inputs', available: true },
            {
              id: 'memories',
              label: 'Memories and context',
              available: event.selectionAvailable,
              count: event.selection.length,
              reason: event.selectionAvailable
                ? undefined
                : 'Native preparation reported a context fallback without a selection manifest.',
            },
            { id: 'timing', label: 'Timing', available: true },
          ],
          artifacts: [
            {
              id: artifact.id,
              kind: 'input',
              length: artifact.bytes,
              contentType: artifact.contentType,
            },
          ],
          configuration: { ...interval.configuration, model: undefined },
          timing: { captureMs: 0, operatorHoldMs: 0 },
        };
        await this.records.putRecord(
          {
            id,
            kind: 'stage',
            runId: run.id,
            parentId: interval.rootId,
            actorId: event.actorId,
            sourceId: event.id,
            createdAt: new Date(stage.recordedAt).toISOString(),
            name: stage.purpose,
            status: stage.status,
            summary: labJson({ ...stage, ...this.provenance(event.actorId) }),
            data: labJson({ ...stage, nativeJobId: event.rootId }),
          },
          { reservationId: reservation, references: [{ kind: 'artifact', id: artifact.id }] },
        );
        await this.records.putEvidence(
          id,
          event.selection.map((item, index) => ({
            id: item.id,
            stageId: id,
            kind: 'memories',
            label: `${item.selected ? 'Included' : 'Excluded'} ${item.kind}`,
            summary: labJson({ ...item, text: item.text.slice(0, 2000) }),
            source: labJson({
              artifactId: artifact.id,
              path: ['selection', index],
              excerpt: item.text.slice(0, 2000),
              complete: item.text.length <= 2000,
            }),
          })),
          reservation,
        );
        stage.timing!.captureMs = performance.now() - captureStarted;
        await this.records.putRecord(
          {
            id,
            kind: 'stage',
            runId: run.id,
            parentId: interval.rootId,
            actorId: event.actorId,
            sourceId: event.id,
            createdAt: new Date(stage.recordedAt).toISOString(),
            name: stage.purpose,
            status: stage.status,
            summary: labJson({ ...stage, ...this.provenance(event.actorId) }),
            data: labJson({ ...stage, nativeJobId: event.rootId }),
          },
          { reservationId: reservation, references: [{ kind: 'artifact', id: artifact.id }] },
        );
        run.counts.stages++;
        this.contexts.set(event.rootId, {
          stageId: id,
          available: event.selectionAvailable,
          count: event.selection.length,
        });
        await this.persistRun(interval.reservation);
      } finally {
        await this.records.release(reservation);
      }
      return;
    }
    if (event.kind === 'job') {
      const job = await this.runtime.service.store.getJob(event.jobId);
      if (!job) return;
      const sourceIds = [
        ...new Set(
          [
            job.playerSpeechEventId,
            job.triggerEvidenceId,
            ...(job.stimulusEvidenceIds ?? []),
          ].filter((id): id is string => !!id),
        ),
      ];
      const expected =
        interval.expectedJobId !== undefined &&
        (event.jobId === interval.expectedJobId || event.originId === interval.expectedJobId);
      if (expected) for (const id of sourceIds) interval.sourceIds.add(id);
      // Continue has no newly submitted stimulus. Its One response interval
      // follows the first native focal job, through the same captured source set.
      const continuedFocal =
        interval.policy.mode === 'oneResponse' &&
        !interval.expectedJobId &&
        job.request.npcId === interval.policy.focalActorId &&
        (!interval.focalJobs.size || interval.focalJobs.has(job.id));
      if (continuedFocal) for (const id of sourceIds) interval.sourceIds.add(id);
      const related =
        expected || continuedFocal || sourceIds.some((id) => interval.sourceIds.has(id));
      this.jobs.set(job.id, { rootId: interval.rootId, sourceIds, actorId: job.request.npcId });
      if (related && job.request.npcId === interval.policy.focalActorId)
        interval.focalJobs.add(job.id);
      if (event.primaryStageId) {
        const selected = await this.records.pageRecords('stage', {
          runId: run.id,
          sourceId: event.primaryStageId,
          limit: 1,
        });
        if (selected.items[0]) interval.primaryStageId = selected.items[0].id;
      }
      const timelineId = randomUUID();
      await this.records.putRecord({
        id: timelineId,
        kind: 'timeline',
        runId: run.id,
        parentId: interval.rootId,
        actorId: job.request.npcId,
        sourceId: job.id,
        createdAt: new Date().toISOString(),
        name: 'Native decision',
        status: event.status,
        summary: labJson({
          id: timelineId,
          runId: run.id,
          rootId: interval.rootId,
          actorId: job.request.npcId,
          actorName: job.request.npcId
            ? entityGet(this.runtime.service.world.entities, job.request.npcId)?.name
            : undefined,
          recordedAt: Date.now(),
          gameTime: this.runtime.service.world.simTime,
          sourceId: job.id,
          kind: 'decision',
          text: job.message,
          status: event.status,
          ...this.provenance(job.request.npcId),
        }),
        data: labJson({
          nativeJobId: job.id,
          sourceIds,
          actorId: job.request.npcId,
          status: event.status,
          result: event.result,
        }),
      });
      if (['completed', 'failed', 'cancelled', 'stale'].includes(event.status)) {
        const captured =
          event.publication && typeof event.publication === 'object'
            ? (event.publication as { components?: Record<string, unknown>; outcome?: unknown })
            : undefined;
        const publication = captured
          ? { components: captured.components, outcome: captured.outcome }
          : undefined;
        const rows = Object.entries(publication?.components ?? {}).map(([key, value]) => ({
          id: `${job.id}:${key}`,
          stageId: interval.rootId,
          kind: 'changes',
          label: key,
          summary: labJson(value),
          source: labJson({ nativeJobId: job.id, component: key, receipt: value }),
        }));
        const disposition =
          event.result && typeof event.result === 'object' && 'disposition' in event.result
            ? event.result.disposition
            : undefined;
        rows.push({
          id: `${job.id}:disposition`,
          stageId: interval.rootId,
          kind: 'changes',
          label: 'Native decision disposition',
          summary: labJson({
            status: event.status,
            message: job.message,
            disposition,
            publication: publication?.outcome,
          }),
          source: labJson({ nativeJobId: job.id, status: event.status, disposition, publication }),
        });
        await this.records.putEvidence(interval.rootId, rows, interval.reservation);
        if (interval.primaryStageId) {
          const primary = await this.records.getRecord(interval.primaryStageId, 'stage');
          if (primary) {
            const view = primary.data as unknown as CognitionLabStage;
            view.sectionSources = { ...view.sectionSources, changes: interval.rootId };
            const changes = view.sections.find((section) => section.id === 'changes');
            if (changes) {
              changes.available = true;
              changes.count = rows.length;
              delete changes.reason;
            }
            const references = [
              ...new Map(
                [
                  ...view.artifacts.map((artifact) => ({
                    kind: 'artifact' as const,
                    id: artifact.id,
                  })),
                  ...Object.values(view.sectionSources).map((id) => ({
                    kind: 'record' as const,
                    id,
                  })),
                ].map((item) => [`${item.kind}:${item.id}`, item]),
              ).values(),
            ];
            await this.records.putRecord(
              {
                ...primary,
                summary: labJson({ ...(primary.summary as object), ...view }),
                data: labJson(view),
              },
              { reservationId: interval.reservation, references },
            );
          }
        }
        this.contexts.delete(job.id);
        this.jobs.delete(job.id);
        if (
          related &&
          job.request.npcId === interval.policy.focalActorId &&
          interval.policy.mode === 'oneResponse' &&
          interval.submitted &&
          !interval.completed &&
          this.interval === interval &&
          this.run === run
        )
          this.background(this.finish(job.message));
        if (
          interval.submitted &&
          interval.policy.mode === 'untilCondition' &&
          interval.policy.stopCondition?.kind === 'nextDecision' &&
          job.request.npcId === interval.policy.stopCondition.id &&
          !interval.completed &&
          this.interval === interval &&
          this.run === run
        )
          this.background(this.finish(job.message));
      }
      return;
    }
    const native = event.stage;
    if (native.generation !== interval.generation)
      throw new CognitionControlError('The prepared stage belongs to a replaced scenario.');
    if (event.kind === 'prepared') {
      if (!Number.isSafeInteger(native.responseBoundBytes) || native.responseBoundBytes! <= 0)
        throw new Error('The native adapter did not supply a finite response capture bound.');
      const input = JSON.stringify(native.original);
      const reservation = await this.records.reserveCapture(
        Buffer.byteLength(input),
        native.responseBoundBytes! + (native.wireBoundBytes ?? 0),
        run.id,
      );
      try {
        const original = await this.records.putArtifact(input, 'application/json', {
          runId: run.id,
          reservationId: reservation,
        });
        const id = randomUUID();
        const context = this.contexts.get(native.rootId);
        const stage: CognitionLabStage = {
          id,
          runId: run.id,
          rootId: this.jobs.get(native.rootId)?.rootId ?? interval.rootId,
          actorId: native.actorId,
          actorName: entityGet(this.runtime.service.world.entities, native.actorId)?.name,
          gameTime: this.runtime.service.world.simTime,
          purpose: native.purpose,
          kind: native.original.kind,
          status: native.heldAt === undefined ? 'prepared' : 'held',
          summary: 'Exact application request prepared at the native dispatch boundary.',
          recordedAt: native.preparedAt,
          completeness: 'partial',
          rerunAvailable: native.original.kind === 'judge' || native.original.kind === 'generate',
          rerunReason:
            native.original.kind === 'reflection'
              ? 'A tool-bearing request needs a supported complete scenario rerun.'
              : undefined,
          sections: [
            { id: 'input', label: 'Inputs', available: true },
            { id: 'questions', label: 'Choices', available: native.original.kind === 'judge' },
            {
              id: 'memories',
              label: 'Memories',
              available: context?.available ?? false,
              count: context?.count,
              reason: context?.available
                ? undefined
                : 'This stage precedes a complete native context selection manifest.',
            },
            {
              id: 'changes',
              label: 'Changes',
              available: false,
              reason: 'A prepared model request has not published native effects.',
            },
            { id: 'timing', label: 'Timing/cost', available: true },
          ],
          artifacts: [
            {
              id: original.id,
              kind: 'request',
              length: original.bytes,
              contentType: original.contentType,
            },
            {
              id: original.id,
              kind: 'input',
              length: original.bytes,
              contentType: original.contentType,
            },
          ],
          configuration: this.callConfiguration(native, native.original),
          timing: { captureMs: 0, operatorHoldMs: native.holdMs },
          ...(context ? { sectionSources: { memories: context.stageId } } : {}),
        };
        const capture: Capture = {
          id,
          stage,
          native,
          reservation,
          artifacts: [
            { kind: 'artifact', id: original.id },
            ...(context ? [{ kind: 'record' as const, id: context.stageId }] : []),
          ],
          provenance: this.provenance(native.actorId),
        };
        this.captures.set(native.handle, capture);
        await this.writeCapture(capture);
        if (native.original.kind === 'judge') {
          const evidence = Object.entries(native.original.request.questions).map(
            ([key, value]) => ({
              id: key,
              stageId: id,
              kind: 'questions',
              label: key,
              summary: labJson(value),
            }),
          );
          await this.records.putEvidence(id, evidence, reservation);
        }
        capture.stage.timing!.captureMs += performance.now() - captureStarted;
        await this.writeCapture(capture);
        run.counts.stages++;
        if (native.heldAt !== undefined) {
          capture.preparedReady = true;
          this.refreshPrepared();
        }
        await this.persistRun(interval.reservation);
        return;
      } catch (error) {
        this.captures.delete(native.handle);
        await this.records.release(reservation);
        throw error;
      }
    }
    const capture = this.captures.get(native.handle);
    if (!capture) {
      if (event.kind === 'cancelled' || event.kind === 'failed') return;
      throw new Error('The admitted stage capture is unavailable.');
    }
    if (event.kind === 'dispatched') {
      if (interval.calls >= interval.policy.maximumCalls) {
        this.background(this.finish('Run limit reached: model calls.'));
        throw new CognitionControlError('The model call guard was reached before dispatch.');
      }
      interval.calls++;
      run.counts.calls++;
      capture.stage.status = 'dispatched';
      capture.stage.configuration = this.callConfiguration(
        native,
        native.submitted ?? native.original,
      );
      capture.stage.timing!.operatorHoldMs = native.holdMs;
      if (JSON.stringify(native.submitted) !== JSON.stringify(native.original)) {
        const submitted = JSON.stringify(native.submitted);
        await this.records.growReservation(capture.reservation, Buffer.byteLength(submitted));
        const artifact = await this.records.putArtifact(submitted, 'application/json', {
          runId: run.id,
          reservationId: capture.reservation,
        });
        capture.artifacts.push({ kind: 'artifact', id: artifact.id });
        capture.stage.artifacts = capture.stage.artifacts.filter((item) => item.kind !== 'input');
        capture.stage.artifacts.push({
          id: artifact.id,
          kind: 'input',
          length: artifact.bytes,
          contentType: artifact.contentType,
        });
      }
      capture.stage.timing!.captureMs += performance.now() - captureStarted;
      await this.writeCapture(capture);
      this.options.changed();
      return;
    }
    if (event.kind === 'reused') {
      const output = await this.records.putArtifact(
        JSON.stringify({
          kind: 'checkpointPrerequisite',
          value: event.value,
          sourceStageId: event.sourceStageId,
        }),
        'application/json',
        { runId: run.id, reservationId: capture.reservation },
      );
      capture.artifacts.push({ kind: 'artifact', id: output.id });
      capture.stage.artifacts.push({
        id: output.id,
        kind: 'output',
        length: output.bytes,
        contentType: output.contentType,
      });
      capture.stage.status = 'checkpointPrerequisite';
      capture.stage.completeness = 'complete';
      capture.stage.summary =
        'Reused a proven pure prerequisite from the saved boundary; no new inference or receipt.';
    } else if (event.kind === 'settled') {
      await this.recordReceipt(run.id, native.id, event.result.receipt, capture.reservation);
      const output = await this.records.putArtifact(
        JSON.stringify(event.result),
        'application/json',
        { runId: run.id, reservationId: capture.reservation },
      );
      capture.artifacts.push({ kind: 'artifact', id: output.id });
      capture.stage.artifacts.push({
        id: output.id,
        kind: 'output',
        length: output.bytes,
        contentType: output.contentType,
      });
      capture.stage.status = event.result.outcome;
      capture.stage.completeness = 'complete';
      capture.stage.summary =
        event.result.outcome === 'value'
          ? 'Provider output captured; native admission determines its effects.'
          : event.result.reason;
      capture.stage.timing!.providerMs = event.result.receipt.latencyMs;
    } else {
      capture.stage.status = event.kind === 'failed' ? 'failed' : native.status;
      capture.stage.summary = event.reason;
      // Native cancellation is emitted only before consumption/provider entry.
      // A complete request plus that known unsent disposition is complete evidence.
      capture.stage.completeness =
        event.kind === 'cancelled' || !event.operationStarted ? 'complete' : 'partial';
    }
    capture.stage.timing!.captureMs += performance.now() - captureStarted;
    capture.stage.timing!.operatorHoldMs = native.holdMs;
    interval.operatorHoldMs += native.holdMs;
    await this.writeCapture(capture);
    capture.terminal = true;
    if (
      !native.wireBoundBytes ||
      capture.wireDone ||
      event.kind === 'cancelled' ||
      event.kind === 'reused' ||
      (event.kind === 'failed' && !event.operationStarted)
    ) {
      await this.records.release(capture.reservation);
      this.captures.delete(native.handle);
    }
    if (run.prepared?.id === native.handle) delete run.prepared;
    this.refreshPrepared();
    await this.persistRun(interval.reservation);
  }
  private provenance(actorId?: string) {
    const world = this.runtime.service.world;
    return {
      worldId: this.run?.worldId ?? world.id,
      timeline: this.run?.timeline ?? this.runtime.service.timelineId,
      nativeOrder: world.nextId,
      ownerAccountId: actorId ? (world.authorship?.playerAccountIds[actorId] ?? null) : null,
      forgottenDigest: digest(actorId ? (world.experience?.forgotten[actorId] ?? []) : []),
      correctionDigest: digest(actorId ? (world.experience?.corrections?.[actorId] ?? {}) : {}),
      privacy: this.options.privacy?.(actorId),
    };
  }
  private callConfiguration(
    native: PreparedCognitionStage,
    input: CognitionStageInput,
  ): CognitionLabConfiguration {
    const generation =
      input.kind === 'generate' || input.kind === 'reflection' ? input.request : undefined;
    const context = input.kind === 'judge' ? input.request.state : generation?.context;
    const custom =
      context && typeof context === 'object' && 'experimentalContext' in context
        ? context.experimentalContext
        : undefined;
    return {
      model:
        generation?.model ??
        native.protectedModel ??
        (input.kind === 'embedding'
          ? this.runtime.service.config.embeddingModel
          : native.modelPurpose
            ? this.interval?.configuration.models?.[native.modelPurpose]
            : undefined),
      effort:
        generation?.reasoningEffort ??
        (generation && this.runtime.service.config.macrofoldKey
          ? generation.execution === 'full'
            ? 'xhigh'
            : 'low'
          : undefined),
      maxOutputTokens:
        generation?.execution === 'full' || input.kind === 'reflection'
          ? undefined
          : generation?.maxOutputTokens,
      customInputCount: Array.isArray(custom) ? custom.length : 0,
      heldValueCount: this.runtime.service.nativeValueHolds.filter(
        (hold) => hold.entityId === native.actorId,
      ).length,
      requestOverride: JSON.stringify(input) !== JSON.stringify(native.original),
      policy: this.interval?.configuration.policy,
    };
  }
  private async writeCapture(capture: Capture): Promise<void> {
    await this.records.putRecord(
      {
        id: capture.id,
        kind: 'stage',
        runId: capture.stage.runId,
        parentId: capture.stage.rootId,
        sourceId: capture.native.id,
        actorId: capture.native.actorId,
        createdAt: new Date(capture.stage.recordedAt).toISOString(),
        name: capture.stage.purpose,
        status: capture.stage.status,
        summary: labJson({ ...capture.stage, ...capture.provenance }),
        data: labJson({
          ...capture.stage,
          nativeAttemptId: capture.native.id,
          modelPurpose: capture.native.modelPurpose,
          protectedModel: capture.native.protectedModel,
          nativeJobId: capture.native.rootId,
          order: capture.native.preparedAt,
          holdMs: capture.native.holdMs,
          providerWireCapture: capture.wireCapture ?? 'unavailable',
        }),
      },
      { reservationId: capture.reservation, references: capture.artifacts },
    );
  }
  private async recordReceipt(
    runId: string,
    id: string,
    receipt: AiReceipt,
    reservation: string,
  ): Promise<void> {
    const cost = receipt.providerReportedCostUsd ?? receipt.estimatedCostUsd;
    await this.records.reconcileAttempt(
      runId,
      id,
      labJson(receipt),
      cost,
      receipt.completionUncertain,
      reservation,
    );
  }
  private signalHeld(): void {
    for (const resolve of this.heldWaiters) resolve();
    this.heldWaiters.clear();
  }
  /** Concurrent native roots share one inspected input. Derive that view from
   * pending native handles, rather than letting a late capture overwrite or
   * another input's Continue erase a still-unsubmitted request. */
  private refreshPrepared(): void {
    const run = this.run,
      interval = this.interval;
    if (
      !run ||
      !interval ||
      this.closed ||
      interval.generation !== this.runtime.service.generation ||
      run.worldId !== this.runtime.service.world.id ||
      run.timeline !== this.runtime.service.timelineId
    )
      return;
    const pending = this.control.prepared.filter(
      (native) => native.generation === interval.generation,
    );
    if (run.prepared && !pending.some((native) => native.handle === run.prepared!.id))
      delete run.prepared;
    if (!pending.length) return;
    if (!this.control.held) this.control.hold();
    // Native preparation order is stable even when retained captures finish in
    // another order. Never expose an input until its artifact is fully retained.
    const native = pending[0]!,
      capture = this.captures.get(native.handle);
    if (!capture?.preparedReady || capture.stage.runId !== run.id) return;
    run.prepared = {
      id: native.handle,
      stageId: capture.id,
      actorId: native.actorId,
      purpose: native.purpose,
      kind: native.original.kind === 'embedding' ? 'embed' : native.original.kind,
      editable: true,
      originalArtifactId: capture.stage.artifacts.find((artifact) => artifact.kind === 'request')!
        .id,
      status: 'held',
    };
    if (!this.finishing && !interval.completed) {
      this.stateValue = run.state = 'held';
      run.status = 'Held before stage';
      run.reason = 'Inspect the prepared input, then explicitly continue or stop.';
      this.signalHeld();
    }
  }
  async waitHeld(): Promise<void> {
    while (this.finishing || this.stateValue === 'running' || this.stateValue === 'settling') {
      if (this.finishing) await this.finishing;
      else await new Promise<void>((resolve) => this.heldWaiters.add(resolve));
    }
  }
  private finish(reason: string, ended = false, cancel = false): Promise<void> {
    if (this.finishing) return this.finishing;
    const work = this.finishNow(reason, ended, cancel);
    this.finishing = work;
    void work
      .finally(() => {
        if (this.finishing === work) this.finishing = undefined;
      })
      .catch(() => undefined);
    return work;
  }
  private async finishNow(reason: string, ended: boolean, cancel: boolean): Promise<void> {
    const run = this.run,
      interval = this.interval;
    if (!run || !interval) return;
    this.control.hold();
    this.stateValue = run.state = 'settling';
    run.status = 'Settling';
    run.reason = reason;
    const state = ended ? 'ended' : 'held';
    const status = ended ? 'Ended' : 'Held';
    let settlementError: unknown;
    try {
      let cancellationFailure: PromiseRejectedResult | undefined;
      if (cancel) {
        this.control.stop(reason);
        const cancellations = await Promise.allSettled(
          [...this.jobs.keys()].map((id) => this.runtime.director.cancel(id)),
        );
        cancellationFailure = cancellations.find((result) => result.status === 'rejected');
      }
      await this.runtime.director.settleDispatched();
      if (cancellationFailure) throw cancellationFailure.reason;
    } catch (error) {
      settlementError = error;
    }
    await this.captureWrite(async () => {
      try {
        if (settlementError) throw settlementError;
        if (this.interval !== interval) return;
        run.reason = reason;
        if (ended) run.endedAt = Date.now();
        if (interval.completed) {
          // The native interval and its capture are already settled. Its source may
          // since have been forgotten; ending the run needs no historical read or
          // repeated terminal capture, and preserves the original disclosure proof.
          await this.persistRun(undefined, { state, status });
          return;
        }
        interval.completed = true;
        run.timing = {
          processingMs: this.control.processingMs - interval.processingStartMs,
          captureMs: interval.captureMs,
          operatorHoldMs: interval.operatorHoldMs,
        };
        const root = this.rootStage(interval);
        root.summary = reason;
        root.resultText = reason;
        const oldRoot = await this.records.getRecord(interval.rootId, 'stage');
        if (oldRoot)
          await this.records.putRecord(
            {
              ...oldRoot,
              status: state,
              summary: labJson({ ...(oldRoot.summary as object), ...root, status: state }),
              data: labJson({ ...root, status: state }),
            },
            { reservationId: interval.reservation },
          );
        const oldInterval = await this.records.getRecord(interval.id, 'interval');
        if (oldInterval)
          await this.records.putRecord(
            {
              ...oldInterval,
              status: state,
              summary: labJson({
                ...(oldInterval.summary as object),
                reason,
                policy: interval.policy,
                calls: interval.calls,
                sourceIds: [...interval.sourceIds],
                activeMs: interval.activeMs,
                configuration: interval.configuration,
              }),
            },
            { reservationId: interval.reservation },
          );
        await this.persistRun(interval.reservation, { state, status });
      } catch (error) {
        run.completeness = 'partial';
        run.reason = `${reason} Terminal evidence could not be fully saved.`;
        throw error;
      } finally {
        if (this.interval === interval) {
          try {
            if (interval.reservation) {
              await this.records.release(interval.reservation);
              interval.reservation = '';
            }
          } finally {
            interval.completed = true;
            this.stateValue = run.state = state;
            run.status = status;
            this.options.changed();
            this.signalHeld();
          }
        }
      }
    });
  }
  private validateInput(
    original: CognitionStageInput,
    selected: CognitionStageInput,
    modelPurpose?: string,
  ): CognitionStageInput {
    if (selected.kind !== original.kind) throw new Error('Keep the native operation kind.');
    if (selected.kind === 'generate' || selected.kind === 'reflection') {
      if (original.kind !== 'generate' && original.kind !== 'reflection')
        throw new Error('Keep the native operation kind.');
      selected = { ...selected, request: { ...original.request, ...selected.request } };
      if (
        (original.kind === 'reflection' || original.request.execution === 'full') &&
        (selected.request.model !== original.request.model ||
          selected.request.maxOutputTokens !== original.request.maxOutputTokens)
      )
        throw new Error(
          'This native harness owns its model and monetary/time bounds; an output-token override is unavailable.',
        );
      if (modelPurpose === 'higherDecision' && original.request.model && selected.request.model)
        assertHigherDecisionModelTransport(original.request.model, selected.request.model);
      const supported = this.options.supportedModels?.();
      const configured = this.options.settings().models;
      // A model choice belongs to the native purpose/transport that prepared it.
      // An unrelated configured route cannot grant that stage another model.
      const allowed = new Set(
        modelPurpose ? (supported?.[modelPurpose] ?? [configured[modelPurpose]]) : [],
      );
      if (
        selected.request.model &&
        selected.request.model !== original.request.model &&
        !allowed.has(selected.request.model)
      )
        throw new Error('Choose a configured model for this stage.');
      if ((selected.request.maxOutputTokens ?? 8192) > (original.request.maxOutputTokens ?? 8192))
        throw new Error('The edited output allowance exceeds this native stage limit.');
      if (
        selected.request.execution !== original.request.execution ||
        selected.request.macrofoldOutputMode !== original.request.macrofoldOutputMode
      )
        throw new Error('Keep the prepared native execution and output-mode bindings.');
      if (
        selected.kind === 'reflection' &&
        original.kind === 'reflection' &&
        JSON.stringify(selected.files.map((file) => file.path)) !==
          JSON.stringify(original.files.map((file) => file.path))
      )
        throw new Error(
          'Reflection file bindings remain server-owned; edit contents without changing paths.',
        );
    } else if (selected.kind === 'embedding' && original.kind === 'embedding') {
      if (selected.request.texts.length !== original.request.texts.length)
        throw new Error('Keep the prepared embedding source bindings.');
      if (
        selected.request.texts.some(
          (text) => Buffer.byteLength(text) > EMBEDDING_LIMITS.textBytes,
        ) ||
        selected.request.texts.reduce((sum, text) => sum + Buffer.byteLength(text), 0) >
          EMBEDDING_LIMITS.batchBytes
      )
        throw new Error('The embedding input exceeds its native text allowance.');
    }
    if (Buffer.byteLength(JSON.stringify(selected)) > 500_000)
      throw new Error('The edited application input exceeds its native request allowance.');
    return selected;
  }
  async submitPrepared(
    commandId: string,
    handleId: string,
    replacement: CognitionLabJson | undefined,
    scope: RequestScope,
    step = false,
  ): Promise<CognitionLabReceipt> {
    const admission = this.admissionEpoch;
    await this.authorize(scope);
    this.assertAdmission(admission);
    const held = this.control.prepared.find((stage) => stage.handle === handleId);
    if (!held) {
      // Accepted duplicate consumption is idempotent; it never prepares a second call.
      this.control.submit(handleId);
      this.refreshPrepared();
      if (this.run?.prepared)
        await this.captureWrite(() => this.persistRun(this.interval?.reservation));
      return {
        ok: true,
        commandId,
        runId: this.run?.id,
        message: 'This input was already submitted.',
      };
    }
    const selected =
      replacement === undefined
        ? undefined
        : this.validateInput(
            held.original,
            replacementSchema.parse(replacement) as CognitionStageInput,
            held.modelPurpose,
          );
    if (this.interval?.completed) await this.startInterval(this.run!.policy, scope, admission);
    this.assertAdmission(admission);
    this.stateValue = this.run!.state = 'running';
    this.run!.status = 'Running';
    if (this.run!.prepared?.id === handleId) delete this.run!.prepared;
    this.control.submit(handleId, selected);
    // Release this request before arming the next native boundary. Both changes
    // are synchronous, so a fast adapter cannot slip through between them.
    this.control.resume(step ? () => true : this.stageBoundary(this.interval!.policy));
    this.refreshPrepared();
    if (this.run!.prepared)
      await this.captureWrite(() => this.persistRun(this.interval!.reservation));
    this.options.changed();
    return {
      ok: true,
      commandId,
      runId: this.run?.id,
      message: 'The prepared input was submitted once.',
    };
  }
  async controlRun(
    input: {
      commandId: string;
      runId?: string;
      action:
        | 'continue'
        | 'hold'
        | 'step'
        | 'run'
        | 'advanceTime'
        | 'advanceToOutcome'
        | 'pause'
        | 'resume'
        | 'cancelAttempt'
        | 'stop';
      durationSeconds?: number;
      attemptId?: string;
    },
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const admission = this.admissionEpoch;
    await this.authorize(scope);
    if (input.runId && input.runId !== this.run?.id)
      throw new Error('This control belongs to another run.');
    if (input.action === 'stop' || input.action === 'hold') {
      this.admissionEpoch++;
      this.interruptionEpoch++;
      this.control.hold();
      if (input.action === 'stop') this.control.stop();
      const settled = this.settleComparisons(input.action === 'stop');
      try {
        await this.finish(
          input.action === 'stop' ? 'Stopped by the operator.' : 'Held by the operator.',
          input.action === 'stop',
          input.action === 'stop',
        );
      } finally {
        await settled;
      }
    } else if (input.action === 'cancelAttempt') {
      const capture = [...this.captures.values()].find(
        (value) => value.id === input.attemptId || value.native.id === input.attemptId,
      );
      if (!capture) throw new Error('Choose an exact active attempt.');
      await this.runtime.director.cancel(capture.native.rootId);
    } else if (input.action === 'pause' || input.action === 'resume') {
      const result = await this.runtime.service.authorized(scope, 'create', false, () =>
        this.runtime.service.control({ paused: input.action === 'pause' }, scope),
      );
      if (!result.ok) throw new Error(result.message);
      if (input.action === 'pause') await this.finish('Native manual pause applied.');
    } else if (this.run?.prepared) {
      this.assertAdmission(admission);
      if (input.action === 'advanceTime' || input.action === 'advanceToOutcome')
        throw new Error('Continue or stop the prepared input before advancing simulation time.');
      const handle = this.run.prepared.id;
      if (input.action === 'run') {
        const policy = { ...this.run.policy, mode: 'continuous' as const };
        await this.finish('The prepared decision continues in a continuous interval.');
        await this.startInterval(policy, scope, admission);
      }
      return this.submitPrepared(
        input.commandId,
        handle,
        undefined,
        scope,
        input.action === 'step',
      );
    } else {
      // A completed interval keeps its captured policy as evidence. A new
      // explicit interval uses the operator's current settings; otherwise a
      // stopped passive setup could silently keep autonomy disabled forever.
      const policy = structuredClone(
        this.interval && !this.interval.completed
          ? this.interval.policy
          : this.options.settings().policy,
      );
      if (input.action === 'run') policy.mode = 'continuous';
      if (input.action === 'advanceTime') {
        policy.mode = 'forDuration';
        policy.durationSeconds = input.durationSeconds ?? 5;
      }
      if (input.action === 'advanceToOutcome') {
        const actorId = policy.focalActorId;
        const action = actorId
          ? entityGet(this.runtime.service.world.entities, actorId)?.actor?.action
          : undefined;
        if (!action)
          throw new Error('The focal character has no current native action to advance.');
        policy.mode = 'untilCondition';
        policy.stopCondition = { kind: 'actionOutcome', id: action.id };
      }
      const interval = await this.startInterval(policy, scope, admission);
      interval.step = input.action === 'step';
      interval.submitted = true;
      if (input.action === 'advanceTime') {
        try {
          await this.runtime.clock.withFiniteOffer(async () => {
            this.assertAdmission(admission);
            const interrupted = new AbortController();
            const unsubscribe = this.control.subscribe(() => {
              if (this.control.held) interrupted.abort(new Error('The runtime clock is held.'));
            });
            try {
              this.control.resume(this.stageBoundary(policy));
              await this.runtime.clock.advance(
                policy.durationSeconds,
                policy.autonomousActorIds.length > 0,
                {
                  signal: interrupted.signal,
                  // Resume and native tick publications can release preparation
                  // before it registers a processing hold. Settle only this
                  // runtime's owner before offering its unadvanced remainder.
                  settleProcessing: async () => {
                    await this.runtime.execution.idle(interrupted.signal);
                    await this.control.settle();
                    this.assertAdmission(admission);
                    interrupted.signal.throwIfAborted();
                    this.runtime.service.assertScope(scope, 'create');
                  },
                },
              );
              if (this.control.prepared.length) interrupted.signal.throwIfAborted();
            } finally {
              unsubscribe();
            }
            this.assertAdmission(admission);
            await this.finish('The requested simulation duration elapsed.');
          });
        } catch (error) {
          if (this.control.held) {
            // A selected prepared stage and explicit Hold/Stop already own their
            // settlement and reason. Do not complete that interval or clear its
            // still-live prepared handle as a generic clock failure.
            if (this.control.prepared.length) {
              await this.waitHeld();
              if (admission !== this.admissionEpoch || !this.run?.prepared || interval.completed)
                throw error;
              // Reaching the selected prepared boundary is an accepted control
              // result. Continue/Step still consumes this interval's one handle.
            } else {
              if (this.finishing) await this.finishing;
              throw error;
            }
          } else {
            if (admission === this.admissionEpoch)
              await this.finish(
                error instanceof Error ? error.message : 'The simulation-time offer stopped.',
              );
            throw error;
          }
        }
      } else {
        this.control.resume(input.action === 'step' ? () => true : this.stageBoundary(policy));
        await this.runtime.director.considerThought();
      }
    }
    return {
      ok: true,
      commandId: input.commandId,
      runId: this.run?.id,
      message: this.run?.reason ?? 'Run control applied.',
    };
  }
  private async readJsonArtifact(id: string): Promise<unknown> {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    do {
      const part = await this.records.readArtifactChunk(id, offset);
      chunks.push(part.bytes);
      if (part.nextOffset === undefined) break;
      offset = part.nextOffset;
    } while (true);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async requestMaintenance(
    commandId: string,
    actorId: string,
    policy: CognitionLabPolicy,
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const interval = await this.startInterval({ ...policy, focalActorId: actorId }, scope);
    interval.expectedJobId = humanRequestId(scope, commandId);
    this.runtime.clock.setBlocked(true);
    this.control.resume(this.stageBoundary(policy));
    try {
      const result = await this.runtime.director.requestMaintenance(commandId, actorId, scope);
      interval.submitted = true;
      if (!result.ok) await this.finish(result.message);
      return { ...result, commandId, runId: this.run!.id, sourceAccepted: false };
    } catch (error) {
      await this.finish(
        error instanceof Error ? error.message : 'Native maintenance could not be requested.',
      );
      throw error;
    } finally {
      this.runtime.clock.setBlocked(false);
    }
  }
  async continuationDescriptor(): Promise<
    | {
        stageId: string;
        descriptor: ReturnType<typeof labJson>;
        references: Array<{ kind: 'record' | 'artifact'; id: string }>;
      }
    | undefined
  > {
    const prepared = this.run?.prepared;
    const capture = prepared ? this.captures.get(prepared.id) : undefined;
    if (!capture || !this.interval || !this.run) return undefined;
    const job = await this.runtime.service.store.getJob(capture.native.rootId);
    if (
      !job ||
      job.kind !== 'chat' ||
      !job.playerSpeechEventId ||
      !job.request.npcId ||
      !/^attempt:0:(attention:\d+|route|action-attention|generate)$/.test(capture.native.purpose)
    )
      return undefined;
    const original = capture.stage.artifacts.find((item) => item.kind === 'request');
    if (!original) return undefined;
    const prerequisites: CognitionContinuationDescriptor['prerequisites'] = [];
    const references: Array<{ kind: 'record' | 'artifact'; id: string }> = [
      { kind: 'record', id: capture.id },
      { kind: 'artifact', id: original.id },
    ];
    let cursor: string | undefined;
    const preceding: LabRecord[] = [];
    do {
      const page = await this.records.pageRecords('stage', {
        runId: this.run.id,
        nativeJobId: job.id,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      for (const header of page.items) {
        if (header.id === capture.id || header.status !== 'value') continue;
        const record = await this.records.getRecord(header.id, 'stage');
        const data = record?.data as unknown as
          | (CognitionLabStage & { nativeJobId?: string })
          | undefined;
        if (record && data?.nativeJobId === job.id && data.recordedAt <= capture.stage.recordedAt)
          preceding.push(record);
      }
      cursor = page.nextCursor;
    } while (cursor);
    preceding.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    for (const record of preceding) {
      const stage = record.data as unknown as CognitionLabStage;
      if (
        stage.kind !== 'judge' ||
        !/^attempt:0:(attention:\d+|route|action-attention)$/.test(stage.purpose)
      )
        return undefined;
      const input = stage.artifacts.find((item) => item.kind === 'input'),
        output = stage.artifacts.find((item) => item.kind === 'output');
      if (!input || !output) return undefined;
      const result = (await this.readJsonArtifact(output.id)) as {
        outcome?: string;
        value?: unknown;
        receipt?: { completionUncertain?: boolean };
      };
      if (result.outcome !== 'value' || result.receipt?.completionUncertain) return undefined;
      prerequisites.push({
        purpose: stage.purpose,
        stageId: stage.id,
        inputArtifactId: input.id,
        outputArtifactId: output.id,
      });
      references.push(
        { kind: 'record', id: stage.id },
        { kind: 'artifact', id: input.id },
        { kind: 'artifact', id: output.id },
      );
    }
    const descriptor: CognitionContinuationDescriptor = {
      kind: 'chatDecision',
      worldId: this.runtime.service.world.id,
      actorId: job.request.npcId,
      request: {
        text: job.request.text,
        npcId: job.request.npcId,
        ...(job.request.volume ? { volume: job.request.volume } : {}),
      },
      sourceId: job.playerSpeechEventId,
      purpose: capture.native.purpose,
      proof: await continuationProof(
        this.runtime.service,
        job.request.npcId,
        job.playerSpeechEventId,
        this.interval.scope,
      ),
      stageId: capture.id,
      inputArtifactId: original.id,
      prerequisites,
    };
    return {
      stageId: capture.id,
      descriptor: labJson(continuationSchema.parse(descriptor)),
      references,
    };
  }
  async bindContinuationCheckpoint(savedId: string, stageId: string): Promise<void> {
    const record = await this.records.getRecord(stageId, 'stage');
    if (!record) throw new Error('The captured held stage is unavailable.');
    const stage = record.data as unknown as CognitionLabStage;
    stage.continuationCheckpointId = savedId;
    const capture = [...this.captures.values()].find((entry) => entry.id === stageId);
    if (capture) {
      capture.stage.continuationCheckpointId = savedId;
      await this.writeCapture(capture);
    } else
      await this.records.putRecord({
        ...record,
        summary: labJson({ ...(record.summary as object), ...stage }),
        data: labJson({ ...(record.data as object), ...stage }),
      });
  }
  private async writeComparisonStage(
    view: CognitionLabStage,
    attemptId: string,
    sourceStageId: string,
    reservation: string,
  ): Promise<void> {
    const references: Array<{ kind: 'artifact' | 'record'; id: string }> = [
      ...new Set(view.artifacts.map((artifact) => artifact.id)),
    ].map((id) => ({ kind: 'artifact', id }));
    references.push({ kind: 'record', id: sourceStageId });
    await this.records.putRecord(
      {
        id: view.id,
        kind: 'stage',
        runId: view.runId,
        actorId: view.actorId,
        sourceId: attemptId,
        name: 'Request comparison',
        status: view.status,
        createdAt: new Date(view.recordedAt).toISOString(),
        summary: labJson({
          ...view,
          ...(this.comparisons.get(attemptId)!.provenance as object),
        }),
        data: labJson(view),
      },
      { reservationId: reservation, references },
    );
  }
  async rerunRequest(
    operation: Extract<CognitionLabOperation, { kind: 'rerunRequest' }>,
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const admission = this.admissionEpoch;
    await this.authorize(scope);
    const record = await this.records.getRecord(operation.stageId, 'stage');
    if (!record || record.runId !== operation.runId)
      throw new Error('Choose a captured stage from this exact run.');
    const stage = record.data as unknown as CognitionLabStage;
    const artifact = stage.artifacts?.find((item) => item.kind === 'input');
    if (!artifact) throw new Error('The complete submitted application request was not captured.');
    const captured = replacementSchema.parse(
      await this.readJsonArtifact(artifact.id),
    ) as CognitionStageInput;
    const purpose = (record.data as { modelPurpose?: string } | null)?.modelPurpose;
    let selected = this.validateInput(
      captured,
      operation.request === undefined
        ? captured
        : (replacementSchema.parse(operation.request) as CognitionStageInput),
      purpose,
    );
    if (operation.settings) {
      if (
        operation.settings.policy ||
        operation.settings.storageAllowanceBytes ||
        operation.settings.runCaptureAllowanceBytes
      )
        throw new Error(
          'Request comparisons accept inference settings only. Use a scenario rerun for run policy or storage changes.',
        );
      const settings = this.options.resolveSettings?.(operation.settings) ?? {
        ...this.options.settings(),
        ...operation.settings,
        effort: operation.settings.effort ?? undefined,
        maxOutputTokens: operation.settings.maxOutputTokens ?? undefined,
      };
      if (selected.kind === 'generate') {
        const model = purpose ? settings.models[purpose] : undefined;
        if (operation.settings.models && !purpose)
          throw new Error(
            'This stage has no supported model-purpose setting; keep its original model.',
          );
        selected = this.validateInput(
          captured,
          {
            ...selected,
            request: {
              ...selected.request,
              ...(model ? { model } : {}),
              ...(settings.effort
                ? { reasoningEffort: settings.effort as 'none' | 'low' | 'medium' | 'high' }
                : {}),
              ...(settings.maxOutputTokens
                ? {
                    // Explicit comparison factors must be validated unchanged before spending.
                    // An inherited setting still respects the captured stage's allowance.
                    maxOutputTokens:
                      operation.settings.maxOutputTokens != null
                        ? settings.maxOutputTokens
                        : Math.min(
                            selected.request.maxOutputTokens ?? 8192,
                            settings.maxOutputTokens,
                          ),
                  }
                : {}),
            },
          },
          purpose,
        );
      } else if (
        operation.settings.effort ||
        operation.settings.maxOutputTokens ||
        operation.settings.models
      )
        throw new Error('This native judgment has no editable generation settings.');
    }
    if (selected.kind === 'reflection' || selected.kind === 'embedding')
      return {
        ok: false,
        commandId: operation.commandId,
        code: 'unavailable',
        message:
          selected.kind === 'reflection'
            ? 'This tool-bearing operation requires a supported complete scenario rerun.'
            : 'An embedding comparison has no native isolated replay owner.',
        nextActions: ['runComparison'],
      };
    const originalRun = await this.records.getRecord(operation.runId, 'run');
    if (!originalRun) throw new Error('The captured run is unavailable.');
    const origin = originalRun.data as unknown as CognitionLabRun;
    const runId = randomUUID(),
      stageId = randomUUID();
    await this.records.configureRun(runId, this.options.settings().runCaptureAllowanceBytes);
    const reservation = await this.records.reserveCapture(
      Buffer.byteLength(JSON.stringify(selected)),
      this.runtime.director.comparisonResponseBound() + 1_000_000,
      runId,
    );
    const comparison: CognitionLabRun = {
      id: runId,
      name: 'Request comparison',
      state: 'ended',
      status: 'Request comparison',
      startedAt: Date.now(),
      originId: origin.originId,
      worldId: origin.worldId,
      timeline: origin.timeline,
      focalActorId: stage.actorId,
      policy: structuredClone(origin.policy),
      retained: true,
      completeness: 'partial',
      counts: { intervals: 1, roots: 0, stages: 0, annotations: 0, calls: 0 },
      accounting: { knownCostUsd: 0, uncertainAttempts: 0, capturedBytes: 0 },
    };
    // A request replay still contains its original world's facts. The current
    // world's empty restriction set cannot replace the selected source proof.
    this.runDisclosures.set(comparison, this.disclosureFrom(record));
    const attemptId = `comparison:${humanRequestId(scope, operation.commandId)}`;
    let complete!: () => void;
    const capturedWire = {
      runId,
      reservation,
      scope,
      artifacts: [] as CognitionLabStage['artifacts'],
      captureMs: 0,
      partial: false,
      provenance: labJson(
        Object.fromEntries(
          ['worldId', 'ownerAccountId', 'forgottenDigest', 'correctionDigest', 'privacy']
            .filter((key) => (record.summary as Record<string, LabJson>)[key] !== undefined)
            .map((key) => [key, (record.summary as Record<string, LabJson>)[key]]),
        ),
      ),
      abort: new AbortController(),
      settled: new Promise<void>((resolve) => (complete = resolve)),
    };
    let comparisonStage: CognitionLabStage | undefined;
    this.comparisons.set(attemptId, capturedWire);
    try {
      await this.persistRunView(comparison, reservation);
      const inputStarted = performance.now();
      const inputArtifact = await this.records.putArtifact(
        JSON.stringify(selected),
        'application/json',
        { runId, reservationId: reservation },
      );
      capturedWire.captureMs += performance.now() - inputStarted;
      comparisonStage = {
        ...stage,
        id: stageId,
        runId,
        rootId: undefined,
        primaryStageId: undefined,
        prepared: undefined,
        continuationCheckpointId: undefined,
        status: 'prepared',
        summary:
          'The isolated request comparison is prepared; no scenario effects will be applied.',
        purpose: 'Request comparison',
        recordedAt: comparison.startedAt,
        completeness: 'partial',
        sections: stage.sections
          .filter((section) => section.id !== 'wire')
          .map((section) =>
            section.id === 'changes'
              ? {
                  ...section,
                  available: false,
                  count: undefined,
                  reason: 'Request comparisons do not apply scenario effects.',
                }
              : section,
          ),
        sectionSources: stage.sectionSources?.memories
          ? { memories: stage.sectionSources.memories }
          : undefined,
        artifacts: [
          {
            id: inputArtifact.id,
            kind: 'request',
            length: inputArtifact.bytes,
            contentType: inputArtifact.contentType,
          },
          {
            id: inputArtifact.id,
            kind: 'input',
            length: inputArtifact.bytes,
            contentType: inputArtifact.contentType,
          },
        ],
      };
      await this.writeComparisonStage(comparisonStage, attemptId, operation.stageId, reservation);
      comparison.latestRootId = stageId;
      comparison.counts.roots = comparison.counts.stages = 1;
      const check = async () => {
        if (admission !== this.admissionEpoch || this.closed)
          throw new CognitionControlError('The request comparison was stopped.');
        await this.authorize(scope);
        if (!(await this.records.getRecord(operation.stageId, 'stage')))
          throw new Error('The captured source is no longer available.');
        if (admission !== this.admissionEpoch || this.closed)
          throw new CognitionControlError('The request comparison was stopped.');
      };
      const result = await this.runtime.director.compareRequest(
        operation.commandId,
        stage.actorId ?? scope.actorId,
        selected,
        scope,
        check,
        capturedWire.abort.signal,
      );
      comparison.counts.calls = Number(result.receipt.dispatched);
      const outputStarted = performance.now();
      const output = await this.records.putArtifact(JSON.stringify(result), 'application/json', {
        runId,
        reservationId: reservation,
      });
      capturedWire.captureMs += performance.now() - outputStarted;
      await this.recordReceipt(runId, result.receipt.requestId, result.receipt, reservation);
      const costs = await this.records.costs(runId);
      comparison.accounting.knownCostUsd = costs.knownUsd;
      comparison.accounting.uncertainAttempts = costs.uncertainCount;
      comparison.completeness =
        costs.unknownCount || costs.uncertainCount || capturedWire.partial ? 'partial' : 'complete';
      comparison.endedAt = Date.now();
      comparison.reason =
        result.outcome === 'value'
          ? 'New validated output; no scenario effects were applied.'
          : result.reason;
      const context =
        selected.kind === 'generate' ? selected.request.context : selected.request.state;
      const custom =
        context && typeof context === 'object' && 'experimentalContext' in context
          ? context.experimentalContext
          : undefined;
      const configuration: CognitionLabConfiguration = {
        ...stage.configuration,
        models: undefined,
        policy: undefined,
        model: result.receipt.requestedModel,
        effort:
          selected.kind === 'generate'
            ? (selected.request.reasoningEffort ??
              (this.runtime.service.config.macrofoldKey ? 'low' : undefined))
            : undefined,
        maxOutputTokens:
          selected.kind === 'generate' ? selected.request.maxOutputTokens : undefined,
        customInputCount: Array.isArray(custom) ? custom.length : 0,
        requestOverride: JSON.stringify(selected) !== JSON.stringify(captured),
      };
      comparison.configuration = configuration;
      const view: CognitionLabStage = {
        ...comparisonStage,
        id: stageId,
        runId,
        rootId: undefined,
        status: result.outcome,
        summary: comparison.reason,
        purpose: 'Request comparison',
        configuration,
        timing: {
          captureMs: capturedWire.captureMs,
          operatorHoldMs: 0,
          providerMs: result.receipt.latencyMs,
        },
        artifacts: [
          {
            id: inputArtifact.id,
            kind: 'request',
            length: inputArtifact.bytes,
            contentType: inputArtifact.contentType,
          },
          {
            id: inputArtifact.id,
            kind: 'input',
            length: inputArtifact.bytes,
            contentType: inputArtifact.contentType,
          },
          { id: output.id, kind: 'output', length: output.bytes, contentType: output.contentType },
          ...capturedWire.artifacts,
        ],
        recordedAt: comparison.startedAt,
      };
      view.completeness = comparison.completeness;
      view.sections.push({
        id: 'wire',
        label: 'Provider exchange',
        available: capturedWire.artifacts.length > 0,
        reason: capturedWire.partial
          ? 'The bounded native capture omitted part of this provider exchange.'
          : capturedWire.artifacts.length
            ? undefined
            : 'The native adapter produced no captured HTTP exchanges.',
      });
      await this.writeComparisonStage(view, attemptId, operation.stageId, reservation);
      await this.persistRunView(comparison, reservation);
      this.options.changed();
      return { ok: true, commandId: operation.commandId, runId, message: comparison.reason };
    } catch (error) {
      // The comparison remains inspectable even if admission or post-dispatch
      // capture fails. Native attempt evidence determines known/unknown spending.
      for (const attempt of await this.runtime.service.store.decisionAttempts(attemptId)) {
        if (attempt.receipt)
          await this.recordReceipt(runId, attempt.attemptId, attempt.receipt, reservation);
        else
          await this.records.reconcileAttempt(
            runId,
            attempt.attemptId,
            labJson({
              nativeAttemptId: attempt.attemptId,
              reservedUsd: attempt.reservedUsd,
              completion: 'unconfirmed',
            }),
            undefined,
            true,
            reservation,
          );
      }
      comparison.completeness = 'partial';
      comparison.endedAt = Date.now();
      comparison.reason =
        error instanceof Error ? error.message : 'The request comparison could not be completed.';
      if (comparisonStage) {
        comparisonStage.status = 'failed';
        comparisonStage.summary = comparison.reason;
        comparisonStage.artifacts.push(...capturedWire.artifacts);
        await this.writeComparisonStage(comparisonStage, attemptId, operation.stageId, reservation);
      }
      await this.persistRunView(comparison, reservation);
      this.options.changed();
      return {
        ok: false,
        commandId: operation.commandId,
        runId,
        code: 'comparison-failed',
        message: comparison.reason,
      };
    } finally {
      try {
        await this.records.release(reservation);
      } finally {
        this.comparisons.delete(attemptId);
        complete();
      }
    }
  }
  async retryResponse(
    operation: Extract<CognitionLabOperation, { kind: 'retryResponse' }>,
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const admission = this.admissionEpoch;
    await this.authorize(scope);
    const original =
      (await this.runtime.service.store.getJob(operation.sourceId)) ??
      (await this.runtime.service.store.getSpeechJob(operation.sourceId));
    if (!original?.playerSpeechEventId || original.kind !== 'chat')
      throw new Error('Choose an exact native failed conversation response.');
    const interval = await this.startInterval(operation.policy, scope, admission);
    interval.expectedJobId = humanRequestId(scope, operation.commandId);
    interval.sourceIds.add(original.playerSpeechEventId);
    this.runtime.clock.setBlocked(true);
    this.control.resume();
    try {
      const outcome = await this.runtime.director.submit(
        'chat',
        operation.commandId,
        original.request.text,
        original.request.npcId,
        original.id,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        scope,
        original.request.volume ?? 'normal',
      );
      if (!outcome.ok) await this.finish(outcome.message);
      interval.submitted = true;
      return {
        ok: outcome.ok,
        commandId: operation.commandId,
        runId: this.run!.id,
        sourceAccepted: false,
        sourceId: original.playerSpeechEventId,
        message: outcome.message,
        code: outcome.code,
      };
    } catch (error) {
      await this.finish(error instanceof Error ? error.message : 'Response retry failed.');
      throw error;
    } finally {
      this.runtime.clock.setBlocked(false);
    }
  }
  async continueCheckpoint(
    operation: Extract<CognitionLabOperation, { kind: 'continueCheckpoint' }>,
    scope: RequestScope,
  ): Promise<CognitionLabReceipt> {
    const interruption = this.interruptionEpoch;
    await this.authorize(scope);
    const saved = await this.records.getRecord(operation.savedId, 'checkpoint');
    if (!saved) throw new Error('Select an actual saved continuation checkpoint.');
    const data = labSavedDataSchema.parse(saved.data);
    const descriptor = continuationSchema.parse(data.continuation);
    if (descriptor.stageId !== operation.stageId)
      throw new Error('This checkpoint was captured at another stage.');
    const input = replacementSchema.parse(
      await this.readJsonArtifact(descriptor.inputArtifactId),
    ) as CognitionStageInput;
    const prerequisites: ReconstitutedDecision['prerequisites'] = [];
    for (const prior of descriptor.prerequisites) {
      const request = replacementSchema.parse(
        await this.readJsonArtifact(prior.inputArtifactId),
      ) as CognitionStageInput;
      const result = (await this.readJsonArtifact(prior.outputArtifactId)) as {
        outcome?: string;
        value?: unknown;
        receipt?: { completionUncertain?: boolean };
      };
      if (
        request.kind !== 'judge' ||
        result.outcome !== 'value' ||
        result.receipt?.completionUncertain
      )
        throw new Error('A required pure checkpoint prerequisite is unavailable.');
      prerequisites.push({
        purpose: prior.purpose,
        input: request,
        value: result.value,
        stageId: prior.stageId,
      });
    }
    const restored = await this.saves.restore(operation.savedId, operation.commandId);
    if (interruption !== this.interruptionEpoch || this.closed)
      throw new CognitionControlError(
        'The checkpoint continuation was stopped during restoration.',
      );
    if (restored.baselineChanged)
      throw new Error(
        `The checkpoint baseline changed under current native protections: ${restored.reasons.join(' ')}`,
      );
    scope = this.options.scopeAfterRestore?.() ?? scope;
    await this.authorize(scope);
    if (
      (await continuationProof(
        this.runtime.service,
        descriptor.actorId,
        descriptor.sourceId,
        scope,
      )) !== descriptor.proof
    )
      throw new Error('The restored source/body/dependency bindings changed.');
    const interval = await this.startInterval(operation.policy, scope);
    interval.expectedJobId = humanRequestId(scope, operation.commandId);
    interval.sourceIds.add(descriptor.sourceId);
    this.runtime.clock.setBlocked(true);
    this.control.resume(this.stageBoundary(operation.policy));
    try {
      const result = await this.runtime.director.continueDecision(
        operation.commandId,
        { descriptor, input, prerequisites },
        scope,
      );
      interval.submitted = true;
      if (result.jobId) interval.focalJobs.add(result.jobId);
      if (!result.ok) await this.finish(result.message);
      return {
        ok: result.ok,
        commandId: operation.commandId,
        runId: this.run!.id,
        sourceAccepted: false,
        sourceId: descriptor.sourceId,
        message: result.message,
        code: result.code,
      };
    } catch (error) {
      await this.finish(
        error instanceof Error ? error.message : 'Checkpoint reconstruction failed.',
      );
      throw error;
    } finally {
      this.runtime.clock.setBlocked(false);
    }
  }

  async retain(runId: string, name?: string): Promise<void> {
    if (name !== undefined) z.string().trim().min(1).max(80).parse(name);
    if (this.run?.id === runId) {
      this.run.retained = true;
      if (name !== undefined) this.run.name = name.trim();
      await this.persistRun();
      return;
    }
    const record = await this.records.getRecord(runId, 'run');
    if (!record) throw new Error('The selected run is unavailable.');
    const run = record.data as unknown as CognitionLabRun;
    run.retained = true;
    if (name !== undefined) run.name = name.trim();
    await this.records.putRecord({
      ...record,
      name: run.name,
      summary: labJson({ ...(record.summary as object), ...run }),
      data: labJson(run),
    });
    this.options.changed();
  }
  async annotated(runId: string): Promise<void> {
    const current = this.run?.id === runId ? this.run : undefined;
    const record = current ? undefined : await this.records.getRecord(runId, 'run');
    if (!current && !record) throw new Error('The annotated run is unavailable.');
    const original = current ?? (record!.data as unknown as CognitionLabRun);
    const candidate = {
      ...original,
      counts: { ...original.counts, annotations: original.counts.annotations + 1 },
    };
    this.runDisclosures.set(
      candidate,
      record ? this.disclosureFrom(record) : await this.disclosureForRun(original),
    );
    await this.persistRunView(candidate);
    const publish = () => {
      // The note and its counter share the caller's transaction. A rejected
      // commit must not publish an annotation that was rolled back with it.
      if (current && this.run === current) {
        current.counts.annotations = candidate.counts.annotations;
        current.accounting = candidate.accounting;
        current.completeness = candidate.completeness;
      }
      this.options.changed();
    };
    if (this.records.db.afterCommit) this.records.db.afterCommit(publish);
    else publish();
  }
  async stage(id: string): Promise<CognitionLabStage | undefined> {
    const record = await this.records.getRecord(id, 'stage');
    return record?.data as unknown as CognitionLabStage | undefined;
  }
  async inspectReceipt(runId: string, stageId: string, scope: RequestScope) {
    await this.authorize(scope);
    const record = await this.records.getRecord(stageId, 'stage');
    const savedRun = await this.records.getRecord(runId, 'run');
    if (!record || record.runId !== runId || !savedRun || !record.sourceId)
      throw new LabStorageError('missing', 'This captured model stage is unavailable.');
    const run = savedRun.data as unknown as CognitionLabRun;
    const stage = record.data as { nativeJobId?: string };
    const attemptId = record.sourceId;
    const captured = await this.records.attempt(runId, attemptId);
    const job = await this.runtime.service.store.getJob(stage.nativeJobId ?? attemptId);
    const attempt = job
      ? (await this.runtime.service.store.decisionAttempts(job.id)).find(
          (candidate) => candidate.attemptId === attemptId,
        )
      : undefined;
    const receipt = attempt?.receipt;
    // Imported evidence cannot select a different provider Run or borrow another
    // world's local ledger. Only the original native job/attempt owns recovery.
    if (
      !captured ||
      typeof captured !== 'object' ||
      Array.isArray(captured) ||
      !job ||
      !receipt ||
      captured['requestId'] !== attemptId ||
      captured['providerRequestId'] !== receipt.providerRequestId ||
      (job.authority?.worldId ?? job.decision?.worldId) !== run.worldId ||
      (job.authority && job.authority.accountId !== scope.accountId) ||
      record.actorId !== (job.request.npcId ?? job.decision?.actorId)
    )
      throw new LabStorageError(
        'missing',
        'This stage has no matching locally owned model receipt to refresh.',
      );
    await this.authorize(scope);
    try {
      await this.runtime.director.macrofold.inspectAttempt(attemptId);
    } catch (error) {
      if (error instanceof InvalidData) throw new LabStorageError('invalid', error.message);
      throw error;
    }
    await this.authorize(scope);
    const { updated, current, refreshed } = await this.records.db.transaction(async () => {
      // Recheck existence/disclosure after the network wait. A removed run must
      // not be resurrected while its already-issued provider receipt settles.
      const retainedStage = await this.records.getRecord(stageId, 'stage');
      const retainedRun = await this.records.getRecord(runId, 'run');
      if (
        !retainedStage ||
        retainedStage.runId !== runId ||
        retainedStage.sourceId !== attemptId ||
        !retainedRun
      )
        throw new LabStorageError('missing', 'This captured model stage is unavailable.');
      this.runtime.service.assertScope(scope, 'create');
      // The ledger and captured accounting share this writer. A concurrent
      // inspection cannot publish an older receipt after a newer settlement.
      const refreshed = await this.runtime.service.store.attemptReceipt(attemptId);
      if (!refreshed) throw new Error('The native model receipt is unavailable.');
      await this.records.reconcileAttempt(
        runId,
        attemptId,
        labJson(refreshed),
        refreshed.providerReportedCostUsd ?? refreshed.estimatedCostUsd,
        refreshed.completionUncertain,
      );
      const current = this.run?.id === runId ? this.run : undefined;
      const candidate = structuredClone(
        current ?? (retainedRun.data as unknown as CognitionLabRun),
      );
      this.runDisclosures.set(candidate, this.disclosureFrom(retainedRun));
      await this.persistRunView(candidate);
      return { updated: candidate, current, refreshed };
    });
    if (current && this.run === current) {
      current.accounting = updated.accounting;
      if (updated.completeness === 'partial') current.completeness = 'partial';
    }
    this.options.changed();
    return {
      ok: true,
      run: updated,
      receipt: refreshed,
      message: refreshed.completionUncertain
        ? 'Provider completion is still unconfirmed. The original spending hold remains.'
        : refreshed.estimatedCostUsd === undefined
          ? 'Execution has finished. Its price is still unknown, so the spending hold remains.'
          : 'Execution and its reported cost are confirmed. The original receipt is updated.',
    };
  }
  async refreshAccounting(): Promise<void> {
    await this.captureWrite(() => this.persistRun(this.interval?.reservation || undefined));
  }
  async bindComparison(
    runId: string,
    metadata: NonNullable<CognitionLabRun['comparison']>,
  ): Promise<void> {
    if (this.run?.id === runId) {
      this.run.comparison = structuredClone(metadata);
      await this.captureWrite(() => this.persistRun(this.interval?.reservation || undefined));
      return;
    }
    const record = await this.records.getRecord(runId, 'run');
    if (!record) throw new Error('The comparison run is unavailable.');
    const run = record.data as unknown as CognitionLabRun;
    run.comparison = structuredClone(metadata);
    await this.persistRunView(run);
    this.options.changed();
  }
  async finalize(reason = 'The experiment ended.'): Promise<void> {
    this.admissionEpoch++;
    try {
      await this.finish(reason, true, true);
    } finally {
      await this.settleComparisons(true);
    }
  }
  private async settleComparisons(cancel = false): Promise<void> {
    const active = [...this.comparisons.values()];
    if (cancel) for (const comparison of active) comparison.abort.abort();
    await Promise.all(active.map((comparison) => comparison.settled));
  }
  async safeHold(reason: string): Promise<void> {
    this.admissionEpoch++;
    this.interruptionEpoch++;
    this.control.hold();
    try {
      await this.finish(reason);
    } finally {
      await this.settleComparisons();
    }
  }
  async reset(): Promise<void> {
    await this.finalize('A different scenario was selected.');
    this.run = undefined;
    this.interval = undefined;
    this.jobs.clear();
    this.contexts.clear();
    this.stateValue = 'ready';
    this.lastSequence = this.runtime.service.world.sequence;
    this.options.changed();
  }
  async close(): Promise<void> {
    this.interruptionEpoch++;
    try {
      await this.finalize('The lab closed.');
    } finally {
      this.closed = true;
      this.unsubscribe();
      this.unsubscribeControl();
      if (this.timer) clearTimeout(this.timer);
      this.control.stop();
      await Promise.allSettled([...this.pending]);
      this.control.setAuthorityCheck(undefined);
    }
  }
}
