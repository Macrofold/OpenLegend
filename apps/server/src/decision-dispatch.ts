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

/** `outcome` keeps provider refusal, unavailability, invalid output, uncertain completion and
 * budget refusal distinct in job results and traces; the job status stays coarse. */
export class StopJob extends Error {
  constructor(
    readonly status: 'failed' | 'cancelled' | 'stale',
    message: string,
    readonly outcome?: string,
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
  validateJudgmentSource?: () => Promise<void>;
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
  privateReadFence(actorId: string, permitted: () => boolean): () => boolean;
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
  if (
    sourceAccess !==
      host.store.memories?.sourceAccessRevision({
        worldId: host.worldId,
        actorId: sourceActorId,
      }) ||
    host.store.memories?.sourceEditPending({
      worldId: host.worldId,
      actorId: sourceActorId,
    })
  )
    throw new StopJob('failed', 'The character’s evidence changed before dispatch.', 'stale');
  const sourceCurrent = host.privateReadFence(
    sourceActorId,
    () => host.current(run) === sourceActorId,
  );
  // This selected strategy declares both dependent calls in advance. Its
  // original useful lifetime still fences every dispatch/commit via current();
  // a stage transition neither renews that clock nor funds a fallback.
  if (
    run.job.decision &&
    !run.preparedResponse &&
    (host.now() >= run.job.decision.fastPublishBy ||
      performance.now() >= run.job.decision.fastPublishByMonotonic)
  )
    throw new StopJob(
      'failed',
      'No new immediate inference was started after the one-second boundary.',
      'expired',
    );
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
    if (run.job.decision && !run.preparedResponse) {
      if (
        host.now() >= run.job.decision.fastPublishBy ||
        performance.now() >= run.job.decision.fastPublishByMonotonic
      )
        throw new StopJob('failed', 'The immediate dispatch deadline passed.', 'expired');
    }
    dispatchIntent = true;
    if (!(await host.store.markDecisionDispatch(id))) {
      throw new StopJob('failed', 'This model request already has dispatch intent.', 'uncertain');
    }
    let sourceFailure: unknown;
    const validate = async () => {
      try {
        host.current(run);
        await run.validateJudgmentSource?.();
        host.current(run);
        if (!sourceCurrent())
          throw new StopJob('stale', 'The character’s evidence changed before dispatch.');
        if (
          run.job.decision &&
          !run.preparedResponse &&
          (host.now() >= run.job.decision.fastPublishBy ||
            performance.now() >= run.job.decision.fastPublishByMonotonic)
        )
          throw new StopJob('failed', 'The immediate dispatch deadline passed.', 'expired');
      } catch (error) {
        sourceFailure = error;
        throw error;
      }
    };
    const publication: HttpPublication = async (start) => {
      try {
        await validate();
        return await host.publication(run, () => {
          host.current(run);
          if (!sourceCurrent())
            throw new StopJob('stale', 'The character’s evidence changed before dispatch.');
          if (
            run.job.decision &&
            !run.preparedResponse &&
            (host.now() >= run.job.decision.fastPublishBy ||
              performance.now() >= run.job.decision.fastPublishByMonotonic)
          )
            throw new StopJob('failed', 'The immediate dispatch deadline passed.', 'expired');
          return start();
        });
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
    await host.store.settle(id, result.receipt);
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
      );
    if (provider === 'openai') run.generatedBy = result.receipt.model;
    return result.value;
  } finally {
    if (reservedId && !dispatchIntent)
      await host.store.settle(reservedId, undispatchedReceipt(reservedId, provider, host.now()));
    if (dispatchIntent && !completed && reservedId) lease?.uncertain(reservedId);
    lease?.release();
  }
}
