import type { CreationActivationResult } from './creation-target-contracts.js';
import type { WorldAgentStore, WorldCreationReceiptCursor } from './world-agent-store.js';
import type { WorldCreationClient } from './world-creation-client.js';

export interface WorldCreationRecoveryResult {
  examined: number;
  confirmed: number;
  missing: number;
  failed: number;
  cancelled: boolean;
  hasMore: boolean;
  next: WorldCreationReceiptCursor | null;
}
type PublishReceipt = (
  sessionId: string,
  planId: string,
  operationId: string,
  response: CreationActivationResult,
) => Promise<void>;

const active = new WeakMap<WorldAgentStore, Map<string, Promise<WorldCreationRecoveryResult>>>();

/** One bounded native pass observes previously admitted Starts. The caller owns
 * startup/close and explicit page continuation; no timer, activation or grant lookup.
 * docs/projects/parallel-batch-07-playable-world-creation-tech-design.md#one-destination-commit-recoverable-source-status
 */
export function reconcileWorldCreationReceipts(
  records: WorldAgentStore,
  client: Pick<WorldCreationClient, 'receipt'>,
  worldId: string,
  publish: PublishReceipt,
  signal?: AbortSignal,
  after?: WorldCreationReceiptCursor,
): Promise<WorldCreationRecoveryResult> {
  let worlds = active.get(records);
  if (!worlds) {
    worlds = new Map();
    active.set(records, worlds);
  }
  const inFlight = worlds.get(worldId);
  if (inFlight) return inFlight;
  const work = runReceiptPage(records, client, worldId, publish, signal, after).finally(() => {
    worlds.delete(worldId);
    if (!worlds.size) active.delete(records);
  });
  worlds.set(worldId, work);
  return work;
}

async function runReceiptPage(
  records: WorldAgentStore,
  client: Pick<WorldCreationClient, 'receipt'>,
  worldId: string,
  publish: PublishReceipt,
  signal?: AbortSignal,
  after?: WorldCreationReceiptCursor,
): Promise<WorldCreationRecoveryResult> {
  const result: WorldCreationRecoveryResult = {
    examined: 0,
    confirmed: 0,
    missing: 0,
    failed: 0,
    cancelled: !!signal?.aborted,
    hasMore: !!signal?.aborted,
    next: after ?? null,
  };
  if (signal?.aborted) return result;
  const page = await records.creationReceiptPage(worldId, after);
  let visited = after ?? null;
  for (const operation of page.records) {
    if (signal?.aborted) {
      result.cancelled = true;
      break;
    }
    result.examined++;
    try {
      const response = await client.receipt(operation.request, signal);
      if (signal?.aborted) {
        result.cancelled = true;
        break;
      }
      // Publication belongs to the original source owner. It must match the
      // current retained request and keep audience disclosure separate from fact.
      await publish(operation.sessionId, operation.planId, operation.operationId, response);
      if (response.receipt) result.confirmed++;
      else result.missing++;
    } catch {
      if (signal?.aborted) {
        result.cancelled = true;
        break;
      }
      // Transport or publication failure leaves the same admitted operation
      // unresolved. It never proves an empty target or permits redispatch.
      result.failed++;
    }
    if (signal?.aborted) {
      result.cancelled = true;
      break;
    }
    visited = { sessionId: operation.sessionId, operationId: operation.operationId };
  }
  result.hasMore = result.cancelled || page.next !== null;
  result.next = result.cancelled ? visited : page.next;
  return result;
}
