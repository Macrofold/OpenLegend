import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import {
  sharedAttemptId,
  EMBEDDING_LIMITS,
  executionCapability,
  defaultMacrofoldCatalogOutputMode,
  type MacrofoldDeploymentTarget,
  type AiReceipt,
  type AiResult,
  type SharedLane,
  type GenerateRequest,
  type JudgeRequest,
} from '@open-legend/ai';
import { AttemptRepository, ATTEMPT_SCHEMA } from './attempt-repository.js';
import { attemptMicroUsd, readAttemptBudget } from './attempt-budget.js';
import { digest } from './content-digest.js';
import type { SqlDatabase } from './store.js';

export class ExecutionRefusal extends Error {
  constructor(
    message: string,
    readonly status = 403,
  ) {
    super(message);
  }
}
function cancelledResult(receipt: AiReceipt): AiResult<never> {
  return { outcome: 'cancelled', reason: 'shared_execution_cancelled', receipt };
}
const identifier = z.string().min(1).max(160);
const grantSchema = z
  .object({
    jobId: identifier,
    limitUsd: z.number().positive().max(100),
    maxCalls: z.number().int().min(1).max(10000),
    lanes: z.array(identifier).min(1).max(32),
    cases: z
      .array(z.object({ id: identifier, sourceHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict())
      .min(1)
      .max(16),
  })
  .strict();
export const executionCampaignSchema = z
  .object({
    taskId: identifier,
    campaignId: identifier,
    deadlineMs: z.number().int().positive(),
    grants: z.array(grantSchema).min(1).max(4096),
  })
  .strict();
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
      criteria: z.object({ true: z.string().optional(), false: z.string().optional() }).optional(),
    })
    .strict(),
]);
const control = {
  requestId: z.string().min(1).max(4096),
  // Native deadlines retain fractional monotonic time. Only relative network
  // durations require whole milliseconds; rounding this value changes the request.
  deadlineMs: z.number().positive().optional(),
};
const judge = z
  .object({ ...control, state: z.unknown(), questions: z.record(z.string(), question) })
  .strict();
const generate = z
  .object({
    ...control,
    model: z.string().optional(),
    reasoningEffort: z.enum(['none', 'low', 'medium', 'high']).optional(),
    task: z.string(),
    instructions: z.string(),
    context: z.unknown(),
    schema: z.record(z.string(), z.unknown()),
    schemaName: z.string().optional(),
    maxOutputTokens: z.number().int().min(1).max(16384).optional(),
    actorScope: z.string().optional(),
    execution: z.enum(['fast', 'complex']).optional(),
    macrofoldOutputMode: z.enum(['json_schema', 'json_object', 'prompted_json']).optional(),
  })
  .strict();
const embed = z
  .object({ ...control, texts: z.array(z.string()).min(1).max(EMBEDDING_LIMITS.texts) })
  .strict();
export interface ExecutionLane extends SharedLane {
  /** Stable non-secret provider configuration, captured once when a grant is admitted. */
  binding?: string;
  target?: MacrofoldDeploymentTarget;
  reserveUsd: number;
  maxOutputTokens: number;
  concurrency: number;
  requestsPerMinute: number;
  observe?(receipt: AiReceipt): Promise<AiReceipt>;
  execute(
    request:
      | JudgeRequest
      | GenerateRequest
      | { requestId: string; texts: string[]; deadlineMs?: number },
    signal: AbortSignal,
    accepted: (providerRequestId: string) => Promise<void>,
  ): Promise<AiResult<unknown>>;
}
interface BoundLane extends SharedLane {
  fingerprint: string;
}
interface Grant {
  id: string;
  campaignId: string;
  taskId: string;
  jobId: string;
  limitUsd: number;
  maxCalls: number;
  lanes: BoundLane[];
  cases: { id: string; sourceHash: string }[];
  deadlineMs: number;
  closed?: boolean;
  run?: { runId: string; generation: number; deadlineMs: number };
}
const schema = `
CREATE TABLE IF NOT EXISTS execution_tasks(id TEXT PRIMARY KEY, ceiling BIGINT NOT NULL, committed BIGINT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS execution_campaigns(id TEXT PRIMARY KEY, task_id TEXT, fingerprint TEXT, payload TEXT, committed BIGINT NOT NULL, closed BOOLEAN NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS execution_grants(id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL, payload TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0, closed BOOLEAN NOT NULL DEFAULT false);
CREATE INDEX IF NOT EXISTS execution_grant_campaign ON execution_grants(campaign_id,id);
CREATE TABLE IF NOT EXISTS execution_calls(id TEXT PRIMARY KEY, grant_id TEXT NOT NULL, lane_id TEXT, fingerprint TEXT, metadata TEXT, result TEXT, inflight BOOLEAN NOT NULL DEFAULT true, cancelled BOOLEAN NOT NULL DEFAULT false, created_at BIGINT NOT NULL);
ALTER TABLE execution_calls ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE execution_calls ALTER COLUMN lane_id DROP NOT NULL, ALTER COLUMN fingerprint DROP NOT NULL, ALTER COLUMN metadata DROP NOT NULL;
CREATE INDEX IF NOT EXISTS execution_call_active ON execution_calls(id) WHERE inflight;
CREATE INDEX IF NOT EXISTS execution_call_grant ON execution_calls(grant_id,id);
CREATE INDEX IF NOT EXISTS execution_call_lane_active ON execution_calls(lane_id,id) WHERE inflight;
CREATE INDEX IF NOT EXISTS execution_call_lane_time ON execution_calls(lane_id,created_at);
`;
/** The paid service owns grants and original attempts; Labs only receive scoped clients/receipts. */
export class SharedExecution {
  readonly ready: Promise<void>;
  readonly attempts: AttemptRepository;
  private readonly active = new Map<string, AbortController>();
  private stopping = false;
  readonly lanes: ReadonlyMap<string, ExecutionLane>;
  private readonly bindings: ReadonlyMap<string, BoundLane>;
  constructor(
    private readonly db: SqlDatabase,
    private readonly adminToken: string,
    lanes: ExecutionLane[],
  ) {
    if (adminToken.length < 32)
      throw new Error('Execution control credential must have at least 32 characters.');
    // Resolve before advertising and fingerprinting. Client construction uses
    // this same catalog policy; deployment targets keep their existing default.
    lanes = lanes.map((lane) =>
      lane.provider === 'macrofold' && lane.kind === 'generate'
        ? {
            ...lane,
            outputMode:
              lane.outputMode ??
              (lane.target ? 'json_schema' : defaultMacrofoldCatalogOutputMode(lane.model)),
          }
        : lane,
    );
    this.lanes = new Map(lanes.map((l) => [l.id, Object.freeze({ ...l })]));
    this.bindings = new Map(
      lanes.map(({ execute: _execute, observe: _observe, ...definition }) => [
        definition.id,
        {
          id: definition.id,
          kind: definition.kind,
          model: definition.model,
          provider: definition.provider,
          ...(definition.kind === 'generate' && definition.provider === 'macrofold'
            ? { outputMode: definition.outputMode }
            : {}),
          fingerprint: digest(definition),
        },
      ]),
    );
    if (this.lanes.size !== lanes.length || !lanes.length)
      throw new Error('Unique execution lanes required.');
    for (const l of lanes)
      if (
        l.concurrency > 128 ||
        l.requestsPerMinute > 10000 ||
        !Number.isFinite(l.reserveUsd) ||
        l.reserveUsd <= 0 ||
        !Number.isSafeInteger(l.concurrency) ||
        l.concurrency < 1 ||
        !Number.isSafeInteger(l.requestsPerMinute) ||
        l.requestsPerMinute < 1
      )
        throw new Error('Invalid execution lane bounds.');
    this.ready = (async () => {
      // URL aliases cannot establish storage ownership. Refuse actual game storage before DDL.
      const game = await db.prepare("SELECT to_regclass('open_legend.meta') AS owner").get();
      if (game?.['owner'])
        throw new Error('Shared execution requires a dedicated financial database.');
      await db.exec(ATTEMPT_SCHEMA + schema);
    })();
    this.attempts = new AttemptRepository(db, () => this.ready);
  }
  configuration() {
    return {
      capacity: 128,
      lanes: [...this.lanes.values()].map(
        ({
          id,
          kind,
          model,
          provider,
          outputMode,
          reserveUsd,
          concurrency,
          requestsPerMinute,
        }) => ({
          id,
          kind,
          model,
          provider,
          ...(kind === 'generate' && provider === 'macrofold' ? { outputMode } : {}),
          reserveUsd,
          concurrency,
          requestsPerMinute,
        }),
      ),
    };
  }
  private token(kind: 'campaign' | 'grant', id: string) {
    return executionCapability(this.adminToken, kind, id);
  }
  authorize(token: string | undefined, scope?: { kind: 'campaign' | 'grant'; id: string }): void {
    const expected = scope ? this.token(scope.kind, scope.id) : this.adminToken;
    if (
      !token ||
      Buffer.byteLength(token) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expected))
    )
      throw new ExecutionRefusal('Execution authorization refused.');
  }
  async fund(taskId: string, limitUsd: number): Promise<void> {
    identifier.parse(taskId);
    const limit = attemptMicroUsd(limitUsd);
    if (limit < 1) throw new Error('Positive execution funding required.');
    await this.ready;
    await this.db.transaction(async () => {
      const old = await this.db
        .prepare('SELECT ceiling FROM execution_tasks WHERE id=?')
        .get(taskId);
      if (old) {
        if (Number(old['ceiling']) !== limit)
          throw new Error('Existing task funding cannot be reinterpreted.');
        return;
      }
      await this.db
        .prepare('INSERT INTO execution_tasks(id,ceiling) VALUES (?,?)')
        .run(taskId, limit);
    });
  }
  async admit(input: unknown) {
    const plan = executionCampaignSchema.parse(input),
      fingerprint = digest(plan);
    await this.ready;
    const grants = await this.db.transaction(async () => {
      const old = await this.db
        .prepare('SELECT fingerprint FROM execution_campaigns WHERE id=?')
        .get(plan.campaignId);
      if (old) {
        if (!old['fingerprint']) throw new ExecutionRefusal('Campaign closed before admission.');
        if (old['fingerprint'] !== fingerprint)
          throw new Error('Campaign was admitted differently.');
        const rows = await this.db
          .prepare('SELECT payload FROM execution_grants WHERE campaign_id=? ORDER BY id')
          .all(plan.campaignId);
        return rows.map((row) => JSON.parse(String(row['payload'])) as Grant);
      }
      if (plan.deadlineMs <= Date.now() || plan.deadlineMs > Date.now() + 28_800_000)
        throw new Error('Execution campaign deadline must fit eight hours.');
      const ids = new Set<string>();
      let total = 0;
      const grants: Grant[] = plan.grants.map((g) => {
        if (ids.has(g.jobId)) throw new Error('Duplicate paid job.');
        ids.add(g.jobId);
        const lanes = g.lanes.map((id) => {
          const binding = this.bindings.get(id);
          if (!binding) throw new Error('Unknown paid lane.');
          return binding;
        });
        if (new Set(g.lanes).size !== lanes.length) throw new Error('Duplicate paid lane.');
        if (
          attemptMicroUsd(g.limitUsd) <
          Math.min(...g.lanes.map((id) => attemptMicroUsd(this.lanes.get(id)!.reserveUsd)))
        )
          throw new ExecutionRefusal('Grant cannot cover one permitted request.', 402);
        if (new Set(g.cases.map((c) => c.id)).size !== g.cases.length)
          throw new Error('Duplicate paid case.');
        total += attemptMicroUsd(g.limitUsd);
        if (!Number.isSafeInteger(total)) throw new Error('Unsafe funding amount.');
        return {
          ...g,
          lanes,
          id: digest([plan.campaignId, g.jobId]),
          campaignId: plan.campaignId,
          taskId: plan.taskId,
          deadlineMs: plan.deadlineMs,
        };
      });
      const task = await this.db
        .prepare('SELECT ceiling,committed FROM execution_tasks WHERE id=? FOR UPDATE')
        .get(plan.taskId);
      if (!task || Number(task['committed']) + total > Number(task['ceiling']))
        throw new Error('Shared paid funding exhausted.');
      await this.db
        .prepare('UPDATE execution_tasks SET committed=committed+? WHERE id=?')
        .run(total, plan.taskId);
      await this.db
        .prepare('INSERT INTO execution_campaigns VALUES (?,?,?,?,?,false)')
        .run(plan.campaignId, plan.taskId, fingerprint, JSON.stringify(plan), total);
      for (const grant of grants)
        await this.db
          .prepare('INSERT INTO execution_grants(id,campaign_id,payload) VALUES (?,?,?)')
          .run(grant.id, plan.campaignId, JSON.stringify(grant));
      return grants;
    });
    return {
      campaignId: plan.campaignId,
      token: this.token('campaign', plan.campaignId),
      grants: grants.map((g) => ({
        id: g.id,
        jobId: g.jobId,
        campaignId: g.campaignId,
        deadlineMs: g.deadlineMs,
        token: this.token('grant', g.id),
        lanes: g.lanes.map(({ id, kind, model, provider, outputMode }) => ({
          id,
          kind,
          model,
          provider,
          ...(outputMode ? { outputMode } : {}),
        })),
      })),
    };
  }
  private async grant(id: string): Promise<Grant> {
    await this.ready;
    const row = await this.db
      .prepare('SELECT payload,closed FROM execution_grants WHERE id=?')
      .get(id);
    if (!row) throw new ExecutionRefusal('Unknown execution grant.', 404);
    return { ...(JSON.parse(String(row['payload'])) as Grant), closed: row['closed'] === true };
  }
  async startGrant(id: string, input: unknown) {
    const binding = z
      .object({
        runId: identifier,
        generation: z.number().int().nonnegative(),
        deadlineMs: z.number().int().positive(),
      })
      .strict()
      .parse(input);
    await this.db.transaction(async () => {
      const grant = await this.grant(id);
      if (grant.run) {
        if (digest(grant.run) !== digest(binding))
          throw new ExecutionRefusal('Grant belongs to another run.', 409);
        return;
      }
      if (grant.closed || binding.deadlineMs <= Date.now() || binding.deadlineMs > grant.deadlineMs)
        throw new ExecutionRefusal('Invalid job execution window.');
      grant.run = binding;
      grant.deadlineMs = binding.deadlineMs;
      await this.db
        .prepare('UPDATE execution_grants SET payload=? WHERE id=?')
        .run(JSON.stringify(grant), id);
    });
    return this.inspect(id);
  }
  async inspect(id: string) {
    const g = await this.grant(id);
    return { grant: g, budget: await this.attempts.attemptBudget(id) };
  }
  /** Current inference/delivery permission; never proof that provider execution stopped. */
  private async executionBlocked(
    id: string,
    attemptId: string,
    deadlineMs: number,
  ): Promise<boolean> {
    if (this.stopping || deadlineMs <= Date.now()) return true;
    const current = await this.db
      .prepare(
        'SELECT c.cancelled,g.closed FROM execution_calls c JOIN execution_grants g ON g.id=c.grant_id WHERE c.id=? AND g.id=?',
      )
      .get(attemptId, id);
    return (
      this.stopping ||
      deadlineMs <= Date.now() ||
      !current ||
      current['cancelled'] === true ||
      current['closed'] === true
    );
  }
  async observe(id: string, attemptId: string) {
    const grant = await this.grant(id);
    const row = await this.db
      .prepare(
        'SELECT metadata,result,lane_id,cancelled FROM execution_calls WHERE id=? AND grant_id=?',
      )
      .get(attemptId, id);
    if (!row) return { state: 'not-admitted' };
    let receipt = await this.attempts.attemptReceipt(attemptId);
    const lane = this.lanes.get(String(row['lane_id']));
    if (
      receipt?.providerRequestId &&
      (receipt.completionUncertain || receipt.estimatedCostUsd === undefined) &&
      lane?.observe &&
      grant.lanes.some(
        (bound) =>
          bound.id === lane.id && bound.fingerprint === this.bindings.get(lane.id)?.fingerprint,
      ) &&
      !this.active.has(attemptId)
    ) {
      receipt = await lane.observe(receipt);
      await this.db.transaction(async () => {
        await this.attempts.settle(attemptId, receipt!);
        await this.db
          .prepare('UPDATE execution_calls SET inflight=? WHERE id=?')
          .run(receipt!.completionUncertain, attemptId);
      });
      receipt = await this.attempts.attemptReceipt(attemptId);
    }
    if (row['result']) {
      const result = JSON.parse(String(row['result'])) as AiResult<unknown>;
      if (receipt) result.receipt = receipt;
      return result.outcome === 'value' &&
        (await this.executionBlocked(id, attemptId, grant.deadlineMs))
        ? cancelledResult(result.receipt)
        : result;
    }
    return {
      state: row['cancelled']
        ? 'cancelled'
        : receipt && !receipt.completionUncertain
          ? 'receipt-only'
          : 'pending',
      attemptId,
      receipt,
      ...(row['metadata'] ? { metadata: JSON.parse(String(row['metadata'])) as unknown } : {}),
    };
  }
  async execute(id: string, raw: unknown): Promise<AiResult<unknown> | unknown> {
    const envelope = z
      .object({
        lane: identifier,
        caseId: identifier,
        sourceHash: z.string(),
        request: z.unknown(),
      })
      .strict()
      .parse(raw);
    const lane = this.lanes.get(envelope.lane);
    const grant = await this.grant(id);
    const bound = grant.lanes.find((l) => l.id === envelope.lane);
    if (!lane || !bound || bound.fingerprint !== this.bindings.get(lane.id)?.fingerprint)
      throw new ExecutionRefusal('Original granted lane is unavailable.', 403);
    if (!grant.cases.some((c) => c.id === envelope.caseId && c.sourceHash === envelope.sourceHash))
      throw new ExecutionRefusal('Unadmitted case/source.', 403);
    const request = (
      lane.kind === 'judge' ? judge : lane.kind === 'generate' ? generate : embed
    ).parse(envelope.request);
    if (
      'maxOutputTokens' in request &&
      request.maxOutputTokens &&
      request.maxOutputTokens > lane.maxOutputTokens
    )
      throw new ExecutionRefusal('Output exceeds the granted lane.');
    if ('model' in request && request.model && request.model !== lane.model)
      throw new ExecutionRefusal('Model differs from granted lane.', 403);
    // Output policy belongs to the granted lane, never a caller's paid request.
    if (
      'macrofoldOutputMode' in request &&
      request.macrofoldOutputMode !== undefined &&
      (lane.provider !== 'macrofold' || request.macrofoldOutputMode !== lane.outputMode)
    )
      throw new ExecutionRefusal('Output format differs from granted lane.', 403);
    const attemptId = sharedAttemptId(id, envelope.caseId, request.requestId),
      fingerprint = digest(envelope);
    const reference = {
      grantId: id,
      attemptId,
      campaignId: grant.campaignId,
      jobId: grant.jobId,
      caseId: envelope.caseId,
      sourceHash: envelope.sourceHash,
    };
    const metadata = {
      ...reference,
      provider: lane.provider,
      model: lane.model,
      nativeId: request.requestId,
    };
    const deadlineMs = Math.min(grant.deadlineMs, request.deadlineMs ?? Infinity);
    const base: AiReceipt = {
      requestId: attemptId,
      provider: lane.provider,
      requestedModel: lane.model,
      model: lane.model,
      modelVersionStatus: 'unavailable',
      contextDigest: fingerprint,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      latencyMs: 0,
      dispatched: true,
      completionUncertain: true,
      sharedExecution: reference,
    };
    const admitted = await this.db.transaction(async () => {
      const old = await this.db
        .prepare('SELECT fingerprint,cancelled FROM execution_calls WHERE id=?')
        .get(attemptId);
      if (old) {
        if (old['fingerprint'] !== null && old['fingerprint'] !== fingerprint)
          throw new ExecutionRefusal('Attempt identity was submitted differently.', 409);
        if (old['fingerprint'] === null && old['cancelled']) {
          const result = cancelledResult({
            ...base,
            dispatched: false,
            completionUncertain: false,
          });
          await this.db
            .prepare(
              'UPDATE execution_calls SET lane_id=?,fingerprint=?,metadata=?,result=? WHERE id=?',
            )
            .run(lane.id, fingerprint, JSON.stringify(metadata), JSON.stringify(result), attemptId);
        }
        return false;
      }
      const current = await this.db
        .prepare('SELECT closed,calls FROM execution_grants WHERE id=? FOR UPDATE')
        .get(id);
      if (
        this.stopping ||
        !grant.run ||
        current?.['closed'] ||
        !current ||
        Number(current['calls']) >= grant.maxCalls ||
        deadlineMs <= Date.now()
      )
        throw new ExecutionRefusal('Grant is closed, expired or exhausted.', 403);
      const total = await this.db
        .prepare('SELECT COUNT(*) AS total FROM execution_calls WHERE inflight')
        .get();
      if (Number(total?.['total']) >= 128)
        throw new ExecutionRefusal('Shared execution capacity unavailable.', 429);
      const active = await this.db
        .prepare('SELECT COUNT(*) AS total FROM execution_calls WHERE lane_id=? AND inflight')
        .get(lane.id);
      const recent = await this.db
        .prepare('SELECT COUNT(*) AS total FROM execution_calls WHERE lane_id=? AND created_at>=?')
        .get(lane.id, Date.now() - 60000);
      if (
        Number(active?.['total']) >= lane.concurrency ||
        Number(recent?.['total']) >= lane.requestsPerMinute
      )
        throw new ExecutionRefusal('Provider lane capacity unavailable.', 429);
      if (
        !(await this.attempts.reserveGrant(attemptId, lane.provider, lane.reserveUsd, {
          id,
          limitUsd: grant.limitUsd,
        }))
      )
        throw new ExecutionRefusal('Job paid allowance exhausted.', 402);
      await this.db
        .prepare(
          'INSERT INTO execution_calls(id,grant_id,lane_id,fingerprint,metadata,created_at) VALUES (?,?,?,?,?,?)',
        )
        .run(attemptId, id, lane.id, fingerprint, JSON.stringify(metadata), Date.now());
      await this.db.prepare('UPDATE execution_grants SET calls=calls+1 WHERE id=?').run(id);
      return true;
    });
    if (!admitted) {
      const prior = await this.observe(id, attemptId);
      if ('outcome' in prior) return prior;
      return {
        outcome: 'uncertain',
        reason: 'shared_execution_pending',
        receipt: ('receipt' in prior ? prior.receipt : undefined) ?? base,
      };
    }
    const abort = new AbortController();
    this.active.set(attemptId, abort);
    const timer = setTimeout(() => abort.abort(), Math.max(1, deadlineMs - Date.now()));
    timer.unref();
    let result: AiResult<unknown>;
    try {
      // Cancellation may commit between admission and installing the process-local abort handle.
      if ((await this.executionBlocked(id, attemptId, deadlineMs)) || abort.signal.aborted)
        result = cancelledResult({ ...base, dispatched: false, completionUncertain: false });
      else {
        result = await lane.execute(
          { ...request, requestId: attemptId, deadlineMs },
          abort.signal,
          async (providerRequestId) => {
            await this.attempts.settle(attemptId, { ...base, providerRequestId });
          },
        );
        result = { ...result, receipt: { ...result.receipt, sharedExecution: reference } };
      }
    } catch {
      result = {
        outcome: 'uncertain',
        reason: 'shared_execution_observation_required',
        receipt: (await this.attempts.attemptReceipt(attemptId)) ?? base,
      };
    } finally {
      clearTimeout(timer);
      this.active.delete(attemptId);
    }
    await this.db.transaction(async () => {
      if (
        result.outcome === 'value' &&
        ((await this.executionBlocked(id, attemptId, deadlineMs)) || abort.signal.aborted)
      )
        result = cancelledResult(result.receipt);
      await this.attempts.settle(attemptId, result.receipt);
      result = { ...result, receipt: (await this.attempts.attemptReceipt(attemptId))! };
      await this.db
        .prepare('UPDATE execution_calls SET result=?,inflight=? WHERE id=?')
        .run(JSON.stringify(result), result.receipt.completionUncertain, attemptId);
    });
    return result;
  }
  async cancelAttempt(id: string, attemptId: string) {
    if (!/^[a-f0-9]{64}$/.test(attemptId))
      throw new ExecutionRefusal('Invalid attempt identity.', 400);
    await this.ready;
    const cancelled = await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT grant_id,cancelled FROM execution_calls WHERE id=? FOR UPDATE')
        .get(attemptId);
      if (row) {
        if (row['grant_id'] !== id) throw new ExecutionRefusal('Unknown execution attempt.', 404);
        if (!row['cancelled'])
          await this.db
            .prepare('UPDATE execution_calls SET cancelled=true WHERE id=? AND NOT cancelled')
            .run(attemptId);
        return true;
      }
      const current = await this.db
        .prepare('SELECT payload,closed,calls FROM execution_grants WHERE id=? FOR UPDATE')
        .get(id);
      if (!current) throw new ExecutionRefusal('Unknown execution grant.', 404);
      const grant = JSON.parse(String(current['payload'])) as Grant;
      if (
        current['closed'] ||
        grant.deadlineMs <= Date.now() ||
        Number(current['calls']) >= grant.maxCalls
      )
        return false;
      // A pre-admission cancellation consumes one attempt slot, never money. This bounds tombstones
      // by the same grant and prevents a delayed original request spending after cancellation.
      // docs/technical/verification-workers.md#shared-paid-execution
      await this.db
        .prepare(
          'INSERT INTO execution_calls(id,grant_id,inflight,cancelled,created_at) VALUES (?,?,false,true,?)',
        )
        .run(attemptId, id, Date.now());
      await this.db.prepare('UPDATE execution_grants SET calls=calls+1 WHERE id=?').run(id);
      return true;
    });
    this.active.get(attemptId)?.abort();
    // Cancellation acknowledgement never waits for external billing; explicit observation owns it.
    return { state: cancelled ? 'cancelled' : 'not-admitted', attemptId };
  }
  async closeGrant(id: string) {
    const grant = await this.grant(id);
    if (!grant.closed)
      await this.db
        .prepare('UPDATE execution_grants SET closed=true WHERE id=? AND NOT closed')
        .run(id);
    const active = await this.db
      .prepare('SELECT id FROM execution_calls WHERE grant_id=? AND inflight')
      .all(id);
    for (const row of active) this.active.get(String(row['id']))?.abort();
    return { jobId: grant.jobId, budget: await this.attempts.attemptBudget(id) };
  }
  async closeCampaign(id: string) {
    await this.ready;
    // Cancellation may beat an uncertain admission. Its tombstone prevents a late request buying new work.
    await this.db.transaction(async () => {
      const current = await this.db
        .prepare('SELECT id,closed FROM execution_campaigns WHERE id=? FOR UPDATE')
        .get(id);
      if (!current)
        await this.db
          .prepare('INSERT INTO execution_campaigns(id,committed,closed) VALUES (?,0,true)')
          .run(id);
      else if (!current['closed'])
        await this.db
          .prepare('UPDATE execution_campaigns SET closed=true WHERE id=? AND NOT closed')
          .run(id);
      await this.db
        .prepare('UPDATE execution_grants SET closed=true WHERE campaign_id=? AND NOT closed')
        .run(id);
    });
    const inflight = await this.db
      .prepare(
        'SELECT c.id FROM execution_calls c JOIN execution_grants g ON g.id=c.grant_id WHERE g.campaign_id=? AND c.inflight',
      )
      .all(id);
    for (const call of inflight) this.active.get(String(call['id']))?.abort();
    return this.db.transaction(async () => {
      const grants = await this.db
        .prepare('SELECT id FROM execution_grants WHERE campaign_id=? ORDER BY id')
        .all(id);
      const budget = await readAttemptBudget(
        this.db,
        grants.map((g) => String(g['id'])),
      );
      const spentMicroUsd = attemptMicroUsd(budget.spentUsd) - attemptMicroUsd(budget.uncertainUsd);
      const reservedMicroUsd = attemptMicroUsd(budget.reservedUsd),
        uncertainMicroUsd = attemptMicroUsd(budget.uncertainUsd);
      const held = spentMicroUsd + reservedMicroUsd + uncertainMicroUsd;
      const row = await this.db
        .prepare('SELECT task_id,committed FROM execution_campaigns WHERE id=? FOR UPDATE')
        .get(id);
      if (row?.['task_id'] && held !== Number(row['committed'])) {
        await this.db
          .prepare('UPDATE execution_tasks SET committed=committed+? WHERE id=?')
          .run(held - Number(row['committed']), row['task_id']);
        await this.db
          .prepare('UPDATE execution_campaigns SET committed=? WHERE id=?')
          .run(held, id);
      }
      return {
        campaignId: id,
        spentMicroUsd,
        reservedMicroUsd,
        uncertainMicroUsd,
        uncertain: uncertainMicroUsd > 0 || reservedMicroUsd > 0,
      };
    });
  }
  stop(): void {
    this.stopping = true;
    for (const abort of this.active.values()) abort.abort();
  }
}
