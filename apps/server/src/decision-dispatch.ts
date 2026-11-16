import type { HttpPublication } from '@open-legend/network';
import { normalizeReceiptCost, type AiResult, type AiReceipt } from '@open-legend/ai';
import type { AppConfig } from './config.js';
import type { GameRepository, JobRecord } from './store.js';
import type { CognitionExecution } from './cognition-execution.js';
import type { MacrofoldBackend } from './macrofold.js';
import type { IntelligenceLog } from './intelligence-log.js';
import {
  decisionAllowance,
  type DecisionLedger,
  type CognitionLevel,
  type LedgerCategory,
} from './cognition-budget.js';
import { DECISION_MODEL, undispatchedReceipt } from './decision-state.js';
import type {
  DecisionAttemptEvidence,
  DecisionDependencyFailure,
  DecisionFailureStage,
  DecisionRefusalReporter,
  DecisionStopEvidence,
} from './decision-failure.js';

/** `outcome` keeps provider refusal, unavailability, invalid output, uncertain completion and
 * budget refusal distinct in job results and traces; the job status stays coarse. */
export class StopJob extends Error {
  constructor(
    readonly status: 'failed' | 'cancelled' | 'stale',
    message: string,
    readonly outcome?: string,
    readonly evidence?: DecisionStopEvidence,
  ) {
    super(message);
  }
}
export interface DecisionMeter {
  category: LedgerCategory;
  level?: CognitionLevel;
  model?: string;
  size: { instructions: number; context: number; schema: number };
}
export interface DispatchRun {
  job: JobRecord;
  urgent: boolean;
  preparedResponse?: boolean;
  ledger?: DecisionLedger;
  receipt?: AiReceipt;
  failure?: { outcome: string; reason: string };
  generatedBy?: string;
  cancelReason?: string;
  /** The Native director persists one bounded terminal record, not per-check logs. */
  trackTerminalEvidence?: true;
  failureStage?: DecisionFailureStage;
  attemptEvidence?: DecisionAttemptEvidence;
  validateJudgmentSource?: () => Promise<void>;
  /** Recheck the retained request's exact evidence. Only an owner that can
   * validate the already rendered input can recover a changed read fence. */
  revalidateJudgmentSource?: () => Promise<void>;
  discovery?: { actorId: string; reservation: string; spent: boolean };
}
/** Application owners provide actual source/authority and pause checks. This host
 * carries no world state and cannot authorize a request on its own. */
export interface DecisionDispatchHost<R extends DispatchRun> {
  readonly worldId: string;
  readonly config: AppConfig;
  readonly store: GameRepository;
  readonly paused: boolean;
  readonly execution: CognitionExecution;
  readonly macrofold: Pick<MacrofoldBackend, 'withSourceValidation'>;
  readonly log: IntelligenceLog;
  now(): number;
  current(run: R): string;
  durabilityTicket(): number;
  whenDurable(ticket: number): Promise<unknown>;
  privateReadFence(
    actorId: string,
    permitted: () => boolean,
    report?: DecisionRefusalReporter,
  ): () => boolean;
  awaitResume(run: R, responseReady?: boolean): Promise<void>;
  update(run: R, status: JobRecord['status'], message: string): Promise<void>;
  attemptBudget(run: R): Parameters<GameRepository['reserve']>[6];
  settleDiscovery(run: R, discovery: NonNullable<DispatchRun['discovery']>): Promise<boolean>;
  publication<T>(run: R, start: () => T): Promise<{ result: T }>;
}

/** Sole immediate paid-request boundary for Source and native execution: fixed-cut
 * durability, spending and dispatch intent precede transport; every receipt is
 * settled, and uncertain completion retains its actual execution lease. */
export async function dispatchDecision<R extends DispatchRun, T>(
  host: DecisionDispatchHost<R>,
  run: R,
  provider: 'jev' | 'openai',
  suffix: string,
  dispatch: (requestId: string, publication: HttpPublication) => Promise<AiResult<T>>,
  meter?: DecisionMeter,
): Promise<T> {
  const track = run.trackTerminalEvidence;
  const callerStage = run.failureStage;
  if (track) {
    run.failureStage = 'durability';
    run.attemptEvidence = {
      stage: suffix,
      provider,
      transportStarted: false,
      responseArrived: false,
      providerReceiptSettled: false,
    };
  }
  const evidenceActor = host.current(run);
  const sourceAccess = host.store.memories?.sourceAccessRevision({
    worldId: host.worldId,
    actorId: evidenceActor,
  });
  const evidenceThrough = host.durabilityTicket();
  // Every actual request is already rendered when this boundary is entered.
  // Join its fixed save prefix before reserving/dispatching; never force a save
  // or retarget this wait as unrelated physical publications arrive.
  await host.whenDurable(evidenceThrough);
  const sourceActorId = host.current(run);
  const sourceAccessFailure = (): DecisionDependencyFailure | undefined => {
    const scope = { worldId: host.worldId, actorId: sourceActorId };
    if (sourceAccess !== host.store.memories?.sourceAccessRevision(scope))
      return { condition: 'source-access-revision', dependency: sourceActorId };
    if (host.store.memories?.sourceEditPending(scope))
      return { condition: 'source-edit-pending', dependency: sourceActorId };
  };
  const accessFailure = sourceAccessFailure();
  if (accessFailure)
    throw new StopJob('failed', 'The character’s evidence changed before dispatch.', 'stale', {
      ...accessFailure,
      category: 'invalidated',
      stage: 'durability',
    });
  let fenceFailure: DecisionDependencyFailure | undefined;
  const captureSourceFence = () =>
    host.privateReadFence(
      sourceActorId,
      () => host.current(run) === sourceActorId,
      track
        ? (failure) => {
            fenceFailure = failure;
          }
        : undefined,
    );
  let sourceCurrent = captureSourceFence();
  const revalidateSource = run.revalidateJudgmentSource;
  const nonReceptionRevision = revalidateSource
    ? host.store.memories?.actorNonReceptionRevision(sourceActorId)
    : undefined;
  const rejectFence = (
    stage: 'dispatch-source' | 'dispatch-publication',
    category: DecisionStopEvidence['category'],
    revalidation: NonNullable<DecisionStopEvidence['revalidation']>,
    failure = fenceFailure,
  ) =>
    new StopJob('stale', 'The character’s evidence changed before dispatch.', undefined, {
      condition: 'private-read-fence',
      ...failure,
      category,
      stage,
      revalidation,
    });
  const assertImmediateDeadline = (message = 'The immediate dispatch deadline passed.') => {
    const state = run.job.decision;
    if (!state || run.preparedResponse) return;
    const wall = host.now();
    const monotonic = performance.now();
    const deadline =
      wall >= state.fastPublishBy
        ? { condition: 'immediate-wall-deadline', expected: state.fastPublishBy, current: wall }
        : monotonic >= state.fastPublishByMonotonic
          ? {
              condition: 'immediate-monotonic-deadline',
              expected: state.fastPublishByMonotonic,
              current: monotonic,
            }
          : undefined;
    if (deadline)
      throw new StopJob('failed', message, 'expired', {
        ...deadline,
        category: 'refused',
        stage: run.failureStage ?? 'admission',
      });
  };
  let remainingRevalidations = 2;
  // This selected strategy declares both dependent calls in advance. Its
  // original useful lifetime still fences every dispatch/commit via current();
  // a stage transition neither renews that clock nor funds a fallback.
  if (track) run.failureStage = 'admission';
  assertImmediateDeadline('No new immediate inference was started after the one-second boundary.');
  const lease = await host.execution.primary(run.urgent);
  if (!lease)
    throw new StopJob('failed', 'The primary model execution slot is occupied.', 'capacity');
  let reservedId: string | undefined,
    dispatchIntent = false,
    completed = false;
  try {
    if (host.paused && run.job.request.invention?.mode !== 'workshop') await host.awaitResume(run);
    const actorId = host.current(run);
    const id = `${run.job.id}:${suffix}`;
    const config = host.config;
    // Conservative bounds use request UTF-8 bytes as an upper token proxy, plus output ceiling.
    // Exact provider invoices remain external; custom prices must match the selected model.
    const reserve = decisionAllowance(config, provider, meter?.model);
    // A decision's own level work stays within that level's per-decision limits.
    // docs/limits/cognition.md#cg08
    const category =
      meter?.category ?? (/classify|interpret/.test(suffix) ? 'grounding' : 'preparation');
    const admitted = run.ledger?.admit(category, meter?.level, reserve);
    if (admitted && !admitted.ok)
      throw new StopJob(
        'failed',
        `${admitted.reason} No further paid request was sent.`,
        'budget-exhausted',
      );
    const reserveAttempt = async () => {
      if (
        !(await host.store.reserve(
          id,
          provider,
          reserve,
          config.budgetUsd,
          actorId,
          undefined,
          host.attemptBudget(run),
          {
            rootJobId: run.job.id,
            category,
            ...(meter?.level ? { level: meter.level } : {}),
            stage: suffix,
            executionClass: lease.executionClass,
          },
        ))
      )
        throw new StopJob(
          'failed',
          'Your usage allowance is used up. Existing actions and learned recipes still work.',
          'budget-exhausted',
        );
    };
    if (run.job.decision && provider === 'openai' && meter?.model === DECISION_MODEL) {
      const direct = await host.store.mutateDecision(run.job.id, async (job) => {
        if (job.decision!.phase === 'closed' || job.decision!.higherEntitlement !== 'available')
          return undefined;
        await reserveAttempt();
        return { ...job, decision: { ...job.decision!, higherEntitlement: 'used-direct' } };
      });
      if (!direct)
        throw new StopJob(
          'failed',
          'The higher-model allowance was already used.',
          'budget-exhausted',
        );
      run.job = direct;
    } else await reserveAttempt();
    reservedId = id;
    run.ledger?.record({
      requestId: id,
      stage: suffix,
      category,
      ...(meter?.level ? { level: meter.level } : {}),
      provider,
      size: meter?.size ?? { instructions: 0, context: 0, schema: 0 },
      reservedUsd: reserve,
    });
    await host.update(
      run,
      provider === 'jev' ? 'judging' : 'generating',
      provider === 'jev'
        ? 'Jev is checking the bounded route.'
        : run.job.kind === 'invention'
          ? 'Generating a new material-and-mechanism definition.'
          : run.job.kind === 'action'
            ? 'Interpreting the requested action.'
            : 'Preparing a detailed decision. This may take about a minute.',
    );
    host.current(run);
    assertImmediateDeadline();
    if (track) run.failureStage = 'dispatch-intent';
    dispatchIntent = true;
    if (!(await host.store.markDecisionDispatch(id))) {
      throw new StopJob('failed', 'This model request already has dispatch intent.', 'uncertain', {
        condition: 'dispatch-intent-already-recorded',
        category: 'validity-unresolved',
        stage: 'dispatch-intent',
      });
    }
    let sourceFailure: unknown;
    const refreshFence = async (stage: 'dispatch-source' | 'dispatch-publication') => {
      do {
        if (!revalidateSource || nonReceptionRevision === undefined)
          throw rejectFence(stage, 'validity-unresolved', 'unavailable');
        if (!remainingRevalidations) throw rejectFence(stage, 'validity-unresolved', 'exhausted');
        const currentNonReception = host.store.memories?.actorNonReceptionRevision(sourceActorId);
        if (nonReceptionRevision !== currentNonReception)
          throw rejectFence(stage, 'invalidated', 'refused', {
            condition: 'non-reception-revision',
            dependency: sourceActorId,
            expected: nonReceptionRevision,
            current: currentNonReception,
          });
        const access = sourceAccessFailure();
        if (access) throw rejectFence(stage, 'invalidated', 'refused', access);
        // Bind each exact check before yielding. The same finite allowance covers
        // both preflight changes and an ordinary reception update crossing publication.
        remainingRevalidations--;
        const nextFence = captureSourceFence();
        try {
          await revalidateSource();
        } catch (error) {
          if (error instanceof StopJob && error.evidence)
            throw new StopJob(error.status, error.message, error.outcome, {
              ...error.evidence,
              stage,
              revalidation: 'refused',
            });
          throw error;
        }
        sourceCurrent = nextFence;
      } while (!sourceCurrent());
    };
    const validate = async () => {
      if (track) run.failureStage = 'dispatch-source';
      try {
        host.current(run);
        await run.validateJudgmentSource?.();
        host.current(run);
        if (!sourceCurrent()) await refreshFence('dispatch-source');
        assertImmediateDeadline();
      } catch (error) {
        sourceFailure = error;
        throw error;
      }
    };
    const publication: HttpPublication = async (start) => {
      try {
        await validate();
        if (track) run.failureStage = 'dispatch-publication';
        for (;;) {
          let crossed: StopJob | undefined;
          try {
            return await host.publication(run, () => {
              host.current(run);
              if (!sourceCurrent()) {
                const refusal = rejectFence(
                  'dispatch-publication',
                  'validity-unresolved',
                  'publication-crossed',
                );
                if (fenceFailure?.condition === 'actor-private-revision') crossed = refusal;
                throw refusal;
              }
              assertImmediateDeadline();
              sourceFailure = undefined;
              if (track) {
                run.failureStage = 'provider';
                if (run.attemptEvidence) {
                  // Only the actual network receipt can confirm that transport began.
                  run.attemptEvidence.transportStarted = 'unknown';
                  run.attemptEvidence.responseArrived = 'unknown';
                }
              }
              return start();
            });
          } catch (error) {
            if (!crossed || error !== crossed) throw error;
            // The first publication failed before start(). Its native disclosure
            // lease has ended. Refresh the same rendered request here, outside
            // that lease, then reacquire the actual final publication boundary.
            await refreshFence('dispatch-publication');
          }
        }
      } catch (error) {
        sourceFailure = error;
        throw error;
      }
    };
    const result = await host.macrofold.withSourceValidation(
      validate,
      async () => {
        if (run.discovery && !run.discovery.spent) {
          const discovery = run.discovery;
          if (!(await host.settleDiscovery(run, discovery)))
            throw new StopJob('stale', 'The attention opportunity is no longer available.');
          discovery.spent = true;
        }
        return dispatch(id, publication);
      },
      publication,
    );
    const accountingStartedAt = new Date().toISOString();
    result.receipt = normalizeReceiptCost(result.receipt);
    if (track) run.failureStage = 'provider-receipt';
    if (run.attemptEvidence) {
      const reachedPublication = run.attemptEvidence.transportStarted !== false;
      const received =
        result.outcome === 'value' ||
        (reachedPublication && result.receipt.httpStatus !== undefined);
      // Intermediary rejection can prove an HTTP response without proving
      // model invocation. An unrelated metadata response made before the
      // inference publication cannot witness that inference's transport.
      run.attemptEvidence.responseArrived = received;
      run.attemptEvidence.transportStarted =
        result.receipt.dispatched || received
          ? true
          : reachedPublication && result.receipt.completionUncertain
            ? 'unknown'
            : false;
    }
    await host.store.settle(id, result.receipt);
    if (run.attemptEvidence) run.attemptEvidence.providerReceiptSettled = true;
    completed = true;
    run.receipt = result.receipt;
    run.failure =
      result.outcome === 'value' ? undefined : { outcome: result.outcome, reason: result.reason };
    if (result.receipt.completionUncertain) lease?.uncertain(id);
    run.ledger?.settle(id, result.receipt, result.outcome);
    if (result.receipt.completionUncertain)
      throw new StopJob(
        'failed',
        'The original provider execution is still uncertain; no world effect or second request was allowed.',
        'uncertain',
        {
          condition: 'provider-completion-uncertain',
          category: 'provider-failed',
          stage: 'provider',
        },
      );
    await host.log.record(
      `${id}:accounting`,
      'Accounting',
      { provider, requestId: result.receipt.requestId },
      { settled: true, receipt: result.receipt },
      accountingStartedAt,
    );
    if (result.outcome !== 'value' && run.job.request.invention)
      run.job.invention = {
        ...run.job.invention,
        code: result.receipt.completionUncertain ? 'uncertain' : result.outcome,
      };
    if (result.outcome === 'value' && host.paused && run.job.request.invention?.mode !== 'workshop')
      await host.awaitResume(run, true);
    if (run.cancelReason) throw new StopJob('cancelled', run.cancelReason);
    // The transport cannot interpret a gameplay guard and reports a stopped
    // admission. Settle its exact undispatched receipt, then retain the owning
    // refusal (expiry, privacy or control), rather than mislabelling cancellation.
    if (sourceFailure && !result.receipt.dispatched && !result.receipt.completionUncertain)
      throw sourceFailure;
    // Surface actual provider failures even when an explicit request is paused.
    if (result.outcome === 'value' || !host.paused || run.job.kind === 'thought') host.current(run);
    if (result.outcome !== 'value')
      throw new StopJob(
        result.outcome === 'cancelled' ? 'cancelled' : 'failed',
        `${provider === 'jev' ? 'Jev' : 'Language model'} returned ${result.outcome}: ${result.reason}. No world effect or automatic retry followed.`,
        // An adapter may report a dispatched, unknown completion as failed; the receipt decides.
        result.outcome !== 'cancelled' && result.receipt.completionUncertain
          ? 'uncertain'
          : ((
              {
                deployment_capacity: 'capacity',
                deployment_budget_exhausted: 'budget-exhausted',
                unsupported_model_capability: 'unsupported',
                context_length_exceeded: 'context-exceeded',
                deployment_binding_stale: 'resource-unavailable',
                deployment_not_ready: 'resource-unavailable',
                deployment_unavailable: 'resource-unavailable',
              } as Record<string, string>
            )[result.receipt.providerErrorCode ?? ''] ?? result.outcome),
        {
          condition: result.outcome,
          category: result.outcome === 'cancelled' ? 'cancelled' : 'provider-failed',
          stage: 'provider',
        },
      );
    if (provider === 'openai') run.generatedBy = result.receipt.model;
    if (track) run.failureStage = callerStage;
    return result.value;
  } finally {
    if (reservedId && !dispatchIntent) {
      await host.store.settle(reservedId, undispatchedReceipt(reservedId, provider, host.now()));
      if (run.attemptEvidence) run.attemptEvidence.providerReceiptSettled = true;
    }
    if (dispatchIntent && !completed && reservedId) lease?.uncertain(reservedId);
    lease?.release();
  }
}
