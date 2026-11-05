import { readFile } from 'node:fs/promises';
import { createHash, createHmac } from 'node:crypto';
import {
  createNetworkOwner,
  requestText,
  NetworkError,
  type NetworkOwner,
} from '@open-legend/network';
import type {
  AiClient,
  AiProvider,
  AiReceipt,
  AiResult,
  GenerateRequest,
  JudgeRequest,
  JsonValue,
} from './types.js';
import type { EmbeddingClient, EmbeddingRequest } from './embedding.js';
import type { MacrofoldOutputMode } from './macrofold-inference-target.js';

export const executionCapability = (
  secret: string,
  kind: 'campaign' | 'grant',
  id: string,
): string =>
  createHmac('sha256', secret)
    .update(JSON.stringify([kind, id]))
    .digest('hex');
export const SHARED_EXECUTION_CONTROL_BYTES = 20 * 1024 ** 2;
export interface SharedLane {
  id: string;
  kind: 'judge' | 'generate' | 'embed';
  provider: AiProvider;
  model: string;
  /** Trusted granted policy, used before capture/fitting; never a caller-selected override. */
  outputMode?: MacrofoldOutputMode;
}
export type SharedModelSelection = Partial<Record<SharedLane['kind'], string>>;

/** The one selection rule used by dispatch and its pre-dispatch preparation. */
export function selectSharedExecutionLane(
  lanes: readonly SharedLane[],
  kind: SharedLane['kind'],
  model?: string,
): SharedLane {
  const matching = lanes.filter(
    (lane) => lane.kind === kind && (model === undefined || lane.model === model),
  );
  if (matching.length !== 1)
    throw new Error(
      matching.length
        ? 'The shared request needs an explicit model; multiple lanes match.'
        : 'No granted lane matches this request.',
    );
  return matching[0]!;
}

/** Private job credential. Never include it in model inputs, manifests or exported diagnostics. */
export interface SharedExecutionGrant {
  url: string;
  id: string;
  token: string;
  campaignId: string;
  jobId: string;
  caseId: string;
  sourceHash: string;
  deadlineMs: number;
  lanes: SharedLane[];
}
export const sharedAttemptId = (grantId: string, caseId: string, nativeId: string): string =>
  createHash('sha256')
    .update(JSON.stringify([grantId, caseId, nativeId]))
    .digest('hex');

export function executionUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
  )
    throw new Error('Shared execution requires HTTPS or explicit loopback HTTP.');
  return url;
}
/** Transport only. The remote owner authorizes funding, lanes, dispatch and receipt recovery. */
export function createSharedExecutionClient(
  grant: SharedExecutionGrant,
  network?: NetworkOwner,
  selection: SharedModelSelection = {},
): AiClient &
  EmbeddingClient & {
    readonly lanes: readonly SharedLane[];
    observe(nativeId: string, signal?: AbortSignal): Promise<unknown>;
    close(): Promise<unknown>;
    /** Release local transports without closing the supervisor-owned grant. */
    dispose(): Promise<void>;
  } {
  executionUrl(grant.url);
  for (const [kind, model] of Object.entries(selection))
    if (!grant.lanes.some((lane) => lane.kind === kind && lane.model === model))
      throw new Error('The selected model is not granted for this typed operation.');
  const grantedLanes = grant.lanes.filter(
    (lane) => selection[lane.kind] === undefined || selection[lane.kind] === lane.model,
  );
  const owner = network ?? createNetworkOwner({ role: 'shared-ai-execution', capacity: 16 });
  const controls = createNetworkOwner({ role: 'shared-ai-controls', capacity: 4 });
  const cancel = (attemptId: string) =>
    controls
      .run({ timeoutMs: 2000 }, (operation) =>
        requestText(operation, {
          url: new URL(`/grants/${grant.id}/attempts/${attemptId}/cancel`, grant.url).href,
          init: {
            method: 'POST',
            redirect: 'error',
            headers: { authorization: `Bearer ${grant.token}` },
          },
          bodyPolicy: { kind: 'bounded', maxBytes: 524288 },
          diagnostics: 'omit',
        }),
      )
      .catch(() => undefined);
  const call = async (
    path: string,
    body?: unknown,
    signal?: AbortSignal,
    deadlineMs = grant.deadlineMs,
  ) => {
    // Native lifetimes include fractional monotonic time; network durations
    // require whole milliseconds. Preserve the exact absolute deadline rather
    // than rounding a sub-millisecond remainder into permission to dispatch.
    const timeoutMs = Math.floor(Math.min(300_000, deadlineMs - Date.now()));
    if (timeoutMs < 1)
      throw Object.assign(new Error('Shared execution deadline expired before dispatch.'), {
        status: 403,
      });
    return owner.run({ timeoutMs, deadlineAtMs: deadlineMs, signal }, async (operation) => {
      const result = await requestText(operation, {
        url: new URL(path, grant.url).href,
        init: {
          method: body === undefined ? 'GET' : 'POST',
          redirect: 'error',
          headers: { authorization: `Bearer ${grant.token}`, 'content-type': 'application/json' },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        bodyPolicy: { kind: 'bounded', maxBytes: 4_194_304 },
        diagnostics: 'omit',
      });
      if (result.status !== 200)
        throw Object.assign(new Error(`Shared execution returned ${result.status}.`), {
          status: result.status,
        });
      return JSON.parse(result.text) as unknown;
    });
  };
  async function execute<T>(
    kind: SharedLane['kind'],
    request: JudgeRequest | GenerateRequest | EmbeddingRequest,
  ): Promise<AiResult<T>> {
    const deployment = 'macrofoldDeployment' in request ? request.macrofoldDeployment : undefined;
    const model = deployment
      ? `deployment:${deployment.modelBinding.deployment_id}`
      : 'model' in request
        ? request.model
        : undefined;
    const lane = selectSharedExecutionLane(grantedLanes, kind, model);
    const startedAt = new Date().toISOString(),
      started = performance.now();
    const attemptId = sharedAttemptId(grant.id, grant.caseId, request.requestId);
    const { signal, ...input } = request;
    const reference = {
      grantId: grant.id,
      attemptId,
      campaignId: grant.campaignId,
      jobId: grant.jobId,
      caseId: grant.caseId,
      sourceHash: grant.sourceHash,
    };
    let response: unknown;
    let cancellation: ReturnType<typeof cancel> | undefined;
    const stop = () => void (cancellation ??= cancel(attemptId));
    signal?.addEventListener('abort', stop, { once: true });
    try {
      const deadlineMs = Math.min(grant.deadlineMs, request.deadlineMs ?? Infinity);
      if (deadlineMs <= Date.now())
        throw Object.assign(new Error('Execution grant expired before dispatch.'), { status: 403 });
      response = await call(
        `/grants/${grant.id}/execute`,
        { lane: lane.id, caseId: grant.caseId, sourceHash: grant.sourceHash, request: input },
        signal,
        deadlineMs,
      );
      if (!response || typeof response !== 'object' || !('receipt' in response))
        throw new Error('Missing original execution receipt.');
      const result = response as AiResult<T>;
      if (
        result.receipt.requestId !== attemptId ||
        !result.receipt.sharedExecution ||
        result.receipt.sharedExecution.grantId !== grant.id ||
        result.receipt.sharedExecution.attemptId !== attemptId ||
        result.receipt.sharedExecution.caseId !== grant.caseId ||
        result.receipt.sharedExecution.sourceHash !== grant.sourceHash ||
        result.receipt.sharedExecution.jobId !== grant.jobId ||
        result.receipt.sharedExecution.campaignId !== grant.campaignId
      )
        throw new Error('Shared execution response identity differs from this request.');
      const receipt = { ...result.receipt, requestId: request.requestId };
      if (result.outcome === 'value' && (signal?.aborted || deadlineMs <= Date.now())) {
        stop();
        return { outcome: 'cancelled', reason: 'shared_execution_cancelled', receipt };
      }
      return { ...result, receipt };
    } catch (error) {
      const notStarted = error instanceof NetworkError && error.dispatch === 'not_started';
      const known =
        notStarted ||
        (!!error &&
          typeof error === 'object' &&
          'status' in error &&
          [400, 401, 402, 403, 404, 409, 413, 429].includes(Number(error.status)));
      // Unknown delivery is observation-only. No transport path resubmits a paid request.
      const receipt: AiReceipt = {
        requestId: request.requestId,
        provider: lane.provider,
        requestedModel: lane.model,
        model: lane.model,
        modelVersionStatus: 'unavailable',
        contextDigest: '',
        startedAt,
        completedAt: new Date().toISOString(),
        latencyMs: Math.round(performance.now() - started),
        dispatched: !known,
        completionUncertain: !known,
        sharedExecution: reference,
      };
      if (!known) stop();
      return {
        outcome: signal?.aborted ? 'cancelled' : known ? 'unavailable' : 'uncertain',
        reason: signal?.aborted
          ? 'shared_execution_cancelled'
          : known
            ? 'shared_execution_refused'
            : 'shared_execution_observation_required',
        receipt,
      };
    } finally {
      signal?.removeEventListener('abort', stop);
    }
  }
  return {
    lanes: Object.freeze(
      grantedLanes.map(({ id, kind, provider, model, outputMode }) =>
        Object.freeze({ id, kind, provider, model, ...(outputMode ? { outputMode } : {}) }),
      ),
    ),
    judge: (request: JudgeRequest) => execute('judge', request),
    generate: <T = JsonValue>(request: GenerateRequest) => execute<T>('generate', request),
    embed: (request: EmbeddingRequest) => execute<number[][]>('embed', request),
    observe: (nativeId, signal) =>
      call(
        `/grants/${grant.id}/attempts/${sharedAttemptId(grant.id, grant.caseId, nativeId)}`,
        undefined,
        signal,
        Date.now() + 10_000,
      ),
    close: () => call(`/grants/${grant.id}/close`, {}, undefined, Date.now() + 10_000),
    dispose: async () => {
      const results = await Promise.allSettled([
        controls.shutdown({ timeoutMs: 5000 }),
        ...(!network ? [owner.shutdown({ timeoutMs: 5000 })] : []),
      ]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    },
  };
}

/** Read the supervisor-owned job capability once at caller startup, away from game-step work. */
export async function loadJobExecutionClient(
  path = process.env['OPENLEGEND_JOB_EXECUTION'],
  selection: SharedModelSelection = {},
) {
  if (!path) throw new Error('No shared execution grant was supplied to this job.');
  const value = JSON.parse(await readFile(path, 'utf8')) as SharedExecutionGrant;
  if (
    !value.id ||
    !value.token ||
    !value.caseId ||
    !value.sourceHash ||
    !Number.isSafeInteger(value.deadlineMs) ||
    !Array.isArray(value.lanes)
  )
    throw new Error('Invalid job execution grant.');
  return createSharedExecutionClient(value, undefined, selection);
}
