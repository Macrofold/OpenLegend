import type { RequestRecoveryResult } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import { humanRequestId } from './human-request-id.js';
import type { WorldService } from './world-service.js';

/** Inspect one original admission without repeating generation or changing its funding.
 * A missing record can still race the original submission and remains unconfirmed.
 * docs/world-agent-runtime.md#ordinary-invention-request-recovery
 * docs/narration-and-conversations.md#explicit-failed-response-retry */
export async function recoverHumanRequest(
  service: WorldService,
  authority: RequestScope,
  request: { requestId: string; timeline: string },
  kind: 'chat' | 'invention',
): Promise<RequestRecoveryResult> {
  service.assertScope(authority, 'play');
  const scope = scopeKey(authority);
  const job = await service.store.getJob(humanRequestId(authority, request.requestId));
  service.assertScope(authority, 'play');
  if (request.timeline !== service.timelineId)
    return { ok: false, code: 'stale-world', message: 'This request belongs to an earlier save.' };
  if (!job)
    return {
      ok: true,
      scope,
      status: 'unknown',
      message: 'The original request has no confirmed record yet. Nothing was resubmitted.',
    };
  if (
    job.kind !== kind ||
    job.authority?.accountId !== authority.accountId ||
    job.authority.actorId !== authority.actorId ||
    job.authority.worldId !== authority.worldId ||
    job.authority.timelineId !== request.timeline ||
    (kind === 'invention' &&
      (job.request.invention?.actorId !== authority.actorId ||
        job.request.invention.worldId !== authority.worldId ||
        job.request.invention.timelineId !== request.timeline))
  )
    return {
      ok: false,
      code: 'request-unavailable',
      message: 'The original request is not available to this character in this save.',
    };
  return {
    ok: true,
    scope,
    status: 'resolved',
    message: job.message,
    result: {
      ok: !['failed', 'cancelled', 'stale'].includes(job.status),
      code: job.status,
      message: job.message,
      jobId: job.id,
      jobStatus: job.status,
    },
  };
}
