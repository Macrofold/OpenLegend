import type { AiResult, EmbeddingClient, EmbeddingRequest } from '@open-legend/ai';
import type { HttpPublication } from '@open-legend/network';
import type { ExecutionLease } from './cognition-execution.js';
import type { AppConfig } from './config.js';
import type { GameRepository } from './store.js';
import { digest } from './content-digest.js';

/** Foreground recall, indexing and background maintenance use the actual
 * admitted execution lease and SQL attempt. The caller owns lease release;
 * an uncertain dispatch keeps its normal durable reconciliation obligation. */
export async function dispatchEmbedding(input: {
  service: {
    readonly config: AppConfig;
    readonly paused: boolean;
    readonly store: Pick<GameRepository, 'markDecisionDispatch'>;
  };
  embeddings: EmbeddingClient;
  request: EmbeddingRequest;
  lease: ExecutionLease | undefined;
  current(): boolean | Promise<boolean>;
  assertCurrent(): void;
  publication: HttpPublication;
  now(): number;
}): Promise<AiResult<number[][]>> {
  const { service, request, lease } = input;
  const cancelled = (): AiResult<number[][]> => {
    const at = new Date(input.now()).toISOString();
    return {
      outcome: 'cancelled',
      reason: 'Embedding context changed before dispatch.',
      receipt: {
        requestId: request.requestId,
        provider: 'openai',
        requestedModel: service.config.embeddingModel,
        model: service.config.embeddingModel,
        modelVersionStatus: 'unavailable',
        contextDigest: digest(request.texts),
        startedAt: at,
        completedAt: at,
        latencyMs: 0,
        dispatched: false,
        completionUncertain: false,
      },
    };
  };
  let intent = false,
    admitted = false,
    invoked = false,
    completed = false;
  try {
    input.assertCurrent();
    if (
      lease?.uncertainCompletion ||
      request.signal?.aborted ||
      service.paused ||
      !(await input.current())
    )
      return cancelled();
    if (lease) {
      intent = true;
      if (!(await service.store.markDecisionDispatch(request.requestId)))
        throw new Error('Embedding dispatch was already claimed.');
    }
    admitted = true;
    const result = await input.embeddings.embed({
      ...request,
      publication: (start) =>
        input.publication(() => {
          input.assertCurrent();
          if (lease?.uncertainCompletion || request.signal?.aborted || service.paused)
            throw new Error('Embedding canceled before dispatch.');
          invoked = true;
          return start();
        }),
    });
    completed = true;
    if (result.receipt.completionUncertain) lease?.uncertain(request.requestId);
    return result;
  } catch (error) {
    // A veto before any claim, or a known claim with an uninvoked final
    // transport callback, proves local non-dispatch. Return its receipt so the
    // caller can settle the reservation it already made. A lost SQL claim
    // acknowledgement still remains uncertain.
    if ((!intent || admitted) && !invoked) return cancelled();
    throw error;
  } finally {
    if (intent && !completed && (!admitted || invoked)) lease?.uncertain(request.requestId);
  }
}
