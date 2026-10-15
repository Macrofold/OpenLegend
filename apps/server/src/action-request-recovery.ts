import type { IntentSlots } from '@open-legend/domain';
import type { RequestRecoveryResult } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

export type PlayerActionRequest = {
  requestId: string;
  text: string;
  mode: 'enqueue' | 'replace' | 'interrupt';
  targetId?: string;
  slots?: IntentSlots | null;
  expression?: true;
};

/** Submission and inspection must name the same account, actor, timeline and exact intent.
 * A changed current task or target visibility does not rewrite an earlier request. */
export function playerActionIdentity(
  worldId: string,
  timeline: string,
  authority: RequestScope,
  request: PlayerActionRequest,
): { id: string; fingerprint: string } {
  return {
    id: `human:${digest({ account: authority.accountId, world: authority.worldId, id: request.requestId })}`,
    fingerprint: digest({
      kind: 'action',
      world: worldId,
      timeline,
      actorId: authority.actorId,
      text: request.text,
      mode: request.mode,
      targetId: request.targetId,
      slots: request.slots ?? null,
      // Describing a gesture cannot reuse a mechanical action with the same text.
      ...(request.expression ? { expression: true } : {}),
    }),
  };
}

/** Read the existing durable job only. Never enter typed execution, interpretation or admission.
 * A missing job can race the original submission and therefore remains unknown. */
export async function recoverPlayerAction(
  service: WorldService,
  authority: RequestScope,
  request: PlayerActionRequest & { timeline: string },
): Promise<RequestRecoveryResult> {
  service.assertScope(authority, 'play');
  const scope = scopeKey(authority);
  if (request.timeline !== service.timelineId)
    return {
      ok: false,
      code: 'stale-world',
      message: 'This action belongs to an earlier world timeline.',
    };
  const identity = playerActionIdentity(service.world.id, request.timeline, authority, request);
  const job = await service.store.getJob(identity.id);
  service.assertScope(authority, 'play');
  if (request.timeline !== service.timelineId)
    return {
      ok: false,
      code: 'stale-world',
      message: 'The world changed while checking the action.',
    };
  if (!job)
    return {
      ok: true,
      scope,
      status: 'unknown',
      message:
        'The original action has no confirmed record yet. Nothing was resubmitted. Check again after the connection settles.',
    };
  if (job.kind !== 'action' || job.fingerprint !== identity.fingerprint)
    return {
      ok: false,
      code: 'idempotency-conflict',
      message: 'The saved action does not match that original request. Nothing was resubmitted.',
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
      jobId: identity.id,
    },
  };
}
