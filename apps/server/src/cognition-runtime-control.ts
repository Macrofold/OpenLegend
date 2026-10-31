import { randomUUID } from 'node:crypto';
import type { AiResult, GenerateRequest, JudgeRequest } from '@open-legend/ai';
import type { InnerWorld } from '@open-legend/domain';

export type JudgmentInput = Pick<JudgeRequest, 'state' | 'questions'>;
export type GenerationInput = Omit<
  GenerateRequest,
  'requestId' | 'signal' | 'deadlineMs' | 'onProgress' | 'actorScope' | 'macrofoldDeployment'
>;
export type CognitionStageInput =
  | { kind: 'judge'; request: JudgmentInput }
  | { kind: 'generate'; request: GenerationInput }
  | { kind: 'embedding'; request: { texts: string[] } }
  | { kind: 'reflection'; request: GenerationInput; files: InnerWorld['files'] };

/** The Lab's model label is inspection data, not a provider parameter or binding.
 * Reapply editable fields while retaining the native caller's trusted transport. */
export function applyGenerationInput(
  request: Omit<GenerateRequest, 'requestId' | 'signal'>,
  input: GenerationInput,
): Omit<GenerateRequest, 'requestId' | 'signal'> {
  const selected = { ...request, ...input, macrofoldDeployment: request.macrofoldDeployment };
  const target = request.macrofoldDeployment;
  if (target) {
    if (
      selected.model !== undefined &&
      selected.model !== `deployment:${target.modelBinding.deployment_id}`
    )
      throw new CognitionControlError('The prepared deployment model changed.');
    delete selected.model;
    delete selected.reasoningEffort;
  } else if (selected.model?.startsWith('deployment:')) {
    throw new CognitionControlError('Select the deployment in the installed model settings first.');
  }
  return selected;
}

export interface CognitionStageContext {
  id: string;
  rootId: string;
  actorId: string;
  purpose: string;
  generation: string;
  responseBoundBytes?: number;
  protectedModel?: string;
  modelPurpose?: string;
  wireBoundBytes?: number;
  signal?: AbortSignal;
  /** Native owners retain source/authority checks; the lab cannot grant execution. */
  current(): void | Promise<void>;
  /** Suspend only undispatched native decision timers during deliberate human wait. */
  holdTiming?(): () => void | Promise<void>;
}
export interface PreparedCognitionStage {
  handle: string;
  id: string;
  rootId: string;
  actorId: string;
  purpose: string;
  generation: string;
  responseBoundBytes?: number;
  protectedModel?: string;
  modelPurpose?: string;
  wireBoundBytes?: number;
  original: CognitionStageInput;
  submitted?: CognitionStageInput;
  status: 'prepared' | 'submitted' | 'consumed' | 'cancelled' | 'invalidated';
  preparedAt: number;
  heldAt?: number;
  holdMs: number;
}
export type CognitionRuntimeEvent =
  | {
      kind: 'wire';
      attemptId: string;
      partial?: boolean;
      exchanges?: Array<{
        path: string;
        method: string;
        startedAt: string;
        completedAt?: string;
        durationMs?: number;
        input: unknown;
        output?: unknown;
        httpStatus?: number;
        truncated?: boolean;
      }>;
    }
  | {
      kind: 'context';
      id: string;
      rootId: string;
      actorId: string;
      generation: string;
      diagnostics: unknown;
      input: unknown;
      selectionAvailable: boolean;
      selection: Array<{
        id: string;
        kind: string;
        text: string;
        at: number;
        selected: boolean;
        required: boolean;
        automatic: boolean;
        reason?: string;
        score?: number;
        sourceIds?: string[];
        sourceKeys?: string[];
      }>;
    }
  | { kind: 'prepared'; stage: PreparedCognitionStage }
  | { kind: 'dispatched'; stage: PreparedCognitionStage }
  | { kind: 'settled'; stage: PreparedCognitionStage; result: AiResult<unknown> }
  | { kind: 'reused'; stage: PreparedCognitionStage; value: unknown; sourceStageId: string }
  | { kind: 'cancelled'; stage: PreparedCognitionStage; reason: string }
  | { kind: 'failed'; stage: PreparedCognitionStage; reason: string; operationStarted: boolean }
  | {
      kind: 'job';
      jobId: string;
      actorId?: string;
      status: string;
      result?: unknown;
      primaryStageId?: string;
      originId?: string;
      publication?: unknown;
    }
  | { kind: 'control'; held: boolean };
export type CognitionRuntimeObserver = (event: CognitionRuntimeEvent) => void | Promise<void>;

export class CognitionControlError extends Error {}

interface HeldStage {
  stage: PreparedCognitionStage;
  input: CognitionStageInput;
  finish(input?: CognitionStageInput, reason?: string): void;
}

/** Select model-facing fields explicitly: typed callers can carry request controls as
 * extra properties, and those must never become editable/retained model information. */
function modelInput(input: CognitionStageInput): CognitionStageInput {
  if (input.kind === 'judge')
    return {
      kind: input.kind,
      request: { state: input.request.state, questions: input.request.questions },
    };
  if (input.kind === 'embedding')
    return { kind: input.kind, request: { texts: input.request.texts } };
  const original = input.request;
  const request: GenerationInput = {
    task: original.task,
    instructions: original.instructions,
    context: original.context,
    schema: original.schema,
    ...(original.schemaName === undefined ? {} : { schemaName: original.schemaName }),
    ...(original.model === undefined ? {} : { model: original.model }),
    ...(original.reasoningEffort === undefined
      ? {}
      : { reasoningEffort: original.reasoningEffort }),
    ...(original.execution === undefined ? {} : { execution: original.execution }),
    ...(original.maxOutputTokens === undefined
      ? {}
      : { maxOutputTokens: original.maxOutputTokens }),
    ...(original.macrofoldOutputMode === undefined
      ? {}
      : { macrofoldOutputMode: original.macrofoldOutputMode }),
  };
  return input.kind === 'reflection'
    ? { kind: input.kind, request, files: input.files }
    : { kind: input.kind, request };
}

/** Lab-only operational gates. Ordinary worlds never construct this owner or copy inputs.
 * Native execution, authorization, spending and publication remain with their original owners.
 * docs/projects/cognition-lab-tech-design.md#61-hook-position
 */
export class CognitionRuntimeControl {
  private admission = false;
  private disposed = false;
  private epochValue = 0;
  private settings: { effort?: GenerationInput['reasoningEffort']; maxOutputTokens?: number } = {};
  private readonly stageChecks = new Map<
    string,
    { epoch: number; current(): void | Promise<void> }
  >();
  private breakpoint?: (stage: PreparedCognitionStage) => boolean;
  private readonly heldStages = new Map<string, HeldStage>();
  private readonly stages = new Map<string, PreparedCognitionStage>();
  private readonly stageRoots = new Map<string, { handle: string; rootId: string }>();
  private readonly dispatched = new Set<string>();
  private readonly nativeJobs = new Map<
    string,
    Set<{
      epoch: number;
      held: boolean;
      captureTiming?: () => (() => void | Promise<void>) | undefined;
    }>
  >();
  private readonly providerRoots = new Map<string, number>();
  private preparationStarted?: number;
  private preparationTotalMs = 0;
  private processingStarted?: number;
  private processingTotalMs = 0;
  private readonly settledWaiters = new Set<() => void>();
  private readonly listeners = new Set<() => void>();
  private observer?: CognitionRuntimeObserver;
  private authorityCheck?: () => void;
  private autonomousActors?: ReadonlySet<string>;
  private transform?: (
    stage: CognitionStageContext,
    input: CognitionStageInput,
  ) => CognitionStageInput;

  constructor(private readonly now = Date.now) {}
  get held(): boolean {
    return !this.admission;
  }
  get activeCalls(): number {
    return this.dispatched.size;
  }
  /** Separate measured preparation from entered provider work. The lab processing
   * boundary holds simulation across both; active-wall and provider deadlines continue. */
  get preparing(): boolean {
    return !this.held && [...this.nativeJobs.keys()].some((id) => !this.providerRoots.has(id));
  }
  get processing(): boolean {
    return !this.held && this.nativeJobs.size > 0;
  }
  get processingMs(): number {
    return (
      this.processingTotalMs +
      (this.processingStarted === undefined ? 0 : performance.now() - this.processingStarted)
    );
  }
  get preparationMs(): number {
    return (
      this.preparationTotalMs +
      (this.preparationStarted === undefined ? 0 : performance.now() - this.preparationStarted)
    );
  }
  get prepared(): readonly PreparedCognitionStage[] {
    return [...this.heldStages.values()].map(({ stage }) => stage);
  }
  setObserver(observer: CognitionRuntimeObserver): void {
    this.observer = observer;
  }
  setAuthorityCheck(check: (() => void) | undefined): void {
    this.authorityCheck = check;
  }
  get epoch(): number {
    return this.epochValue;
  }
  assertCurrent(epoch = this.epochValue): void {
    if (epoch !== this.epochValue || this.disposed)
      throw new CognitionControlError('This experiment execution was stopped.');
    this.authorityCheck?.();
  }
  /** An explicit Lab allowance is an experiment factor. Provider capability,
   * source validation, capture capacity and paid admission still bound dispatch. */
  setSettings(settings: {
    effort?: GenerationInput['reasoningEffort'];
    maxOutputTokens?: number;
  }): void {
    this.settings = { ...settings };
  }
  private effectiveInput(input: CognitionStageInput): CognitionStageInput {
    if (input.kind !== 'generate' && input.kind !== 'reflection') return input;
    const request = { ...input.request };
    if (this.settings.effort !== undefined) request.reasoningEffort = this.settings.effort;
    if (
      this.settings.maxOutputTokens !== undefined &&
      input.kind !== 'reflection' &&
      request.execution !== 'full'
    )
      request.maxOutputTokens = this.settings.maxOutputTokens;
    return { ...input, request };
  }
  setAutonomousActors(ids: readonly string[]): void {
    this.autonomousActors = new Set(ids);
  }
  allowsAutonomousActor(id: string): boolean {
    return !this.held && (!this.autonomousActors || this.autonomousActors.has(id));
  }
  setInputTransform(transform: typeof this.transform): void {
    this.transform = transform;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private changed(): void {
    if (this.processing && this.processingStarted === undefined)
      this.processingStarted = performance.now();
    else if (!this.processing && this.processingStarted !== undefined) {
      this.processingTotalMs += performance.now() - this.processingStarted;
      this.processingStarted = undefined;
    }
    if (this.preparing && this.preparationStarted === undefined)
      this.preparationStarted = performance.now();
    else if (!this.preparing && this.preparationStarted !== undefined) {
      this.preparationTotalMs += performance.now() - this.preparationStarted;
      this.preparationStarted = undefined;
    }
    for (const listener of this.listeners) listener();
    void this.emit({ kind: 'control', held: this.held }).catch(() => undefined);
  }
  async emit(event: CognitionRuntimeEvent): Promise<void> {
    if (!this.observer) return;
    const rootId =
      'rootId' in event
        ? event.rootId
        : 'stage' in event
          ? event.stage.rootId
          : event.kind === 'job'
            ? event.jobId
            : event.kind === 'wire'
              ? this.stageRoots.get(event.attemptId)?.rootId
              : undefined;
    // Optional recording must not spend a native choice's opportunity budget.
    // Native owners exclude only this awaited observer work, never provider time:
    // docs/performance/measurement.md#optional-measurement
    const resume: Array<() => void | Promise<void>> = [];
    try {
      if (rootId && !this.providerRoots.has(rootId))
        for (const job of this.nativeJobs.get(rootId) ?? []) {
          // Stopped work still records cancellation and paid settlement. Its old
          // decision budget cannot be renewed while that cleanup is captured.
          if (job.epoch !== this.epochValue) continue;
          const timing = job.captureTiming?.();
          if (timing) resume.push(timing);
        }
      await this.observer(event);
    } finally {
      await Promise.all(resume.map(async (timing) => timing()));
    }
  }
  resume(breakpoint?: (stage: PreparedCognitionStage) => boolean): void {
    if (this.disposed) throw new CognitionControlError('The cognition runtime is closed.');
    this.breakpoint = breakpoint;
    this.admission = true;
    this.changed();
  }
  hold(): void {
    this.admission = false;
    this.changed();
  }
  async settle(): Promise<void> {
    if (
      this.dispatched.size ||
      [...this.nativeJobs.values()].some((jobs) => [...jobs].some((job) => !job.held))
    )
      await new Promise<void>((resolve) => this.settledWaiters.add(resolve));
  }
  registerNative(
    rootId: string,
    captureTiming?: () => (() => void | Promise<void>) | undefined,
  ): () => void {
    const activity = { epoch: this.epochValue, held: false, captureTiming };
    let jobs = this.nativeJobs.get(rootId);
    if (!jobs) this.nativeJobs.set(rootId, (jobs = new Set()));
    jobs.add(activity);
    this.changed();
    return () => {
      jobs.delete(activity);
      if (!jobs.size) this.nativeJobs.delete(rootId);
      this.changed();
      this.signalSettled();
    };
  }
  private signalSettled(): void {
    if (
      this.dispatched.size ||
      [...this.nativeJobs.values()].some((jobs) => [...jobs].some((job) => !job.held))
    )
      return;
    for (const resolve of this.settledWaiters) resolve();
    this.settledWaiters.clear();
  }
  invalidate(reason = 'The scenario changed before this prepared call was submitted.'): void {
    this.epochValue++;
    for (const held of [...this.heldStages.values()]) {
      held.stage.status = 'invalidated';
      held.finish(undefined, reason);
    }
  }
  stop(reason = 'The experiment stopped.'): void {
    this.epochValue++;
    this.hold();
    for (const held of [...this.heldStages.values()]) held.finish(undefined, reason);
  }
  close(): void {
    this.disposed = true;
    this.stop('The cognition runtime closed.');
    this.listeners.clear();
    // The host may retain this registration to reconcile an uncertain receipt.
    // That financial fence must not pin historical requests or a disposed world.
    this.observer = undefined;
    this.transform = undefined;
    this.authorityCheck = undefined;
    this.breakpoint = undefined;
    this.stages.clear();
    this.stageRoots.clear();
    this.stageChecks.clear();
  }
  /** The server validates the replacement's concrete operation before calling this method. */
  submit(handle: string, replacement?: CognitionStageInput): PreparedCognitionStage {
    const held = this.heldStages.get(handle);
    if (!held) {
      const accepted = this.stages.get(handle);
      if (accepted?.status === 'submitted' || accepted?.status === 'consumed') return accepted;
      throw new CognitionControlError('This prepared call is no longer available.');
    }
    if (replacement && replacement.kind !== held.input.kind)
      throw new CognitionControlError('A replacement must keep the native operation kind.');
    if (
      replacement &&
      (replacement.kind === 'generate' || replacement.kind === 'reflection') &&
      (held.input.kind === 'generate' || held.input.kind === 'reflection')
    ) {
      replacement = { ...replacement, request: { ...held.input.request, ...replacement.request } };
      if (
        replacement.request.execution !== held.input.request.execution ||
        replacement.request.macrofoldOutputMode !== held.input.request.macrofoldOutputMode ||
        (held.stage.protectedModel && replacement.request.model !== held.stage.protectedModel)
      )
        throw new CognitionControlError(
          'Native execution and deployment bindings cannot be changed by editing model input.',
        );
    }
    this.admission = true;
    this.breakpoint = undefined;
    held.finish(replacement ?? held.input);
    this.changed();
    return held.stage;
  }
  async prepare<T extends CognitionStageInput>(
    context: CognitionStageContext,
    supplied: T,
  ): Promise<{ stage: PreparedCognitionStage; input: T }> {
    this.assertCurrent();
    if (this.disposed || context.signal?.aborted)
      throw new CognitionControlError('The cognition request was cancelled.');
    await context.current();
    const transformed = this.transform?.(context, supplied) ?? supplied;
    if (transformed.kind !== supplied.kind)
      throw new CognitionControlError('An experimental field cannot change the operation kind.');
    const input = structuredClone(this.effectiveInput(modelInput(transformed)));
    if (context.protectedModel && (input.kind === 'generate' || input.kind === 'reflection'))
      input.request.model = context.protectedModel;
    const stage: PreparedCognitionStage = {
      handle: randomUUID(),
      id: context.id,
      rootId: context.rootId,
      actorId: context.actorId,
      purpose: context.purpose,
      generation: context.generation,
      responseBoundBytes: context.responseBoundBytes,
      protectedModel: context.protectedModel,
      modelPurpose: context.modelPurpose,
      wireBoundBytes: context.wireBoundBytes,
      original: input,
      status: 'prepared',
      preparedAt: this.now(),
      holdMs: 0,
    };
    this.stages.set(stage.handle, stage);
    this.stageRoots.set(stage.id, { handle: stage.handle, rootId: stage.rootId });
    this.stageChecks.set(stage.handle, { epoch: this.epochValue, current: context.current });
    // Keep only live or recent handles; retained experiment evidence belongs to its store.
    while (this.stages.size > 256) {
      const removable = [...this.stages].find(([, value]) => value.status !== 'prepared');
      if (!removable) break;
      this.stages.delete(removable[0]);
      if (this.stageRoots.get(removable[1].id)?.handle === removable[0])
        this.stageRoots.delete(removable[1].id);
      this.stageChecks.delete(removable[0]);
    }
    try {
      const shouldHold = this.held || !!this.breakpoint?.(stage);
      if (shouldHold) this.hold();
      let selected = input;
      if (shouldHold) {
        stage.heldAt = this.now();
        for (const job of this.nativeJobs.get(context.rootId) ?? []) job.held = true;
        this.signalSettled();
        const resumeTiming = context.holdTiming?.();
        try {
          selected = await new Promise<CognitionStageInput>((resolve, reject) => {
            const cancelled = () => finish(undefined, 'The cognition request was cancelled.');
            const finish = (replacement?: CognitionStageInput, reason?: string) => {
              if (!this.heldStages.delete(stage.handle)) return;
              context.signal?.removeEventListener('abort', cancelled);
              stage.holdMs += this.now() - stage.heldAt!;
              if (replacement) {
                stage.status = 'submitted';
                stage.submitted = structuredClone(replacement);
                resolve(replacement);
              } else {
                if (stage.status !== 'invalidated') stage.status = 'cancelled';
                void this.emit({ kind: 'cancelled', stage, reason: reason! }).catch(
                  () => undefined,
                );
                reject(new CognitionControlError(reason));
              }
            };
            this.heldStages.set(stage.handle, { stage, input, finish });
            context.signal?.addEventListener('abort', cancelled, { once: true });
            if (context.signal?.aborted || this.disposed) cancelled();
            else
              void this.emit({ kind: 'prepared', stage }).catch((error: unknown) =>
                finish(undefined, error instanceof Error ? error.message : 'Capture failed.'),
              );
          });
        } finally {
          try {
            await resumeTiming?.();
          } finally {
            for (const job of this.nativeJobs.get(context.rootId) ?? []) job.held = false;
          }
        }
      } else {
        await this.emit({ kind: 'prepared', stage });
        stage.status = 'submitted';
        stage.submitted = input;
      }
      await context.current();
      if (context.signal?.aborted || this.disposed)
        throw new CognitionControlError('The cognition request was cancelled.');
      // Discriminant equality above and server-owned replacement validation preserve T.
      return { stage, input: selected as T };
    } catch (error) {
      await this.decline(
        stage,
        error instanceof Error ? error.message : 'The prepared request failed.',
      ).catch(() => undefined);
      throw error;
    }
  }
  async dispatch<T>(
    stage: PreparedCognitionStage,
    operation: () => Promise<AiResult<T>>,
  ): Promise<AiResult<T>> {
    this.assertCurrent();
    if (this.held || this.disposed)
      throw new CognitionControlError('The experiment is held; no model request was dispatched.');
    this.dispatched.add(stage.id);
    stage.status = 'consumed';
    let operationStarted = false;
    try {
      await this.emit({ kind: 'dispatched', stage });
      const check = this.stageChecks.get(stage.handle);
      this.assertCurrent(check?.epoch);
      await check?.current();
      if (this.held) throw new CognitionControlError('The experiment was held before dispatch.');
      operationStarted = true;
      this.providerRoots.set(stage.rootId, (this.providerRoots.get(stage.rootId) ?? 0) + 1);
      this.changed();
      let result: AiResult<T>;
      try {
        result = await operation();
      } finally {
        const remaining = this.providerRoots.get(stage.rootId)! - 1;
        if (remaining) this.providerRoots.set(stage.rootId, remaining);
        else this.providerRoots.delete(stage.rootId);
        this.changed();
      }
      // A retained-evidence failure cannot discard the actual receipt before its
      // native accounting owner sees it. The observer records partial capture/hold.
      try {
        await this.emit({ kind: 'settled', stage, result });
      } catch {
        this.hold();
      }
      return result;
    } catch (error) {
      await this.emit({
        kind: 'failed',
        stage,
        reason: error instanceof Error ? error.message : 'The native request failed.',
        operationStarted,
      }).catch(() => undefined);
      throw error;
    } finally {
      this.dispatched.delete(stage.id);
      this.signalSettled();
    }
  }
  async reuse(stage: PreparedCognitionStage, value: unknown, sourceStageId: string): Promise<void> {
    this.assertCurrent(this.stageChecks.get(stage.handle)?.epoch);
    await this.stageChecks.get(stage.handle)?.current();
    stage.status = 'consumed';
    await this.emit({ kind: 'reused', stage, value, sourceStageId });
  }
  async decline(stage: PreparedCognitionStage, reason: string): Promise<void> {
    if (
      stage.status === 'consumed' ||
      stage.status === 'cancelled' ||
      stage.status === 'invalidated'
    )
      return;
    stage.status = 'cancelled';
    await this.emit({ kind: 'cancelled', stage, reason });
  }
}
