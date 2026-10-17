import { recordDecisionTiming } from '../../apps/server/src/decision-publication.js';
import { NPC_ID } from '../../packages/domain/src/index.js';
import { decisionRoot } from '../../apps/server/src/decision-state.js';
import { decisionOrigin, decisionPolicyDigest } from '../../apps/server/src/decision-task.js';
import { levelLimits } from '../../apps/server/src/cognition-budget.js';
import { IntelligenceLog } from '../../apps/server/src/intelligence-log.js';
import { undispatchedReceipt } from '../../apps/server/src/decision-state.js';
import type { WorldService } from '../../apps/server/src/world-service.js';

/** Controlled inspector data, including a fictitious cost. Performs no model request. */
export async function seedDecisionInspection(service: WorldService) {
  await service.ready;
  const now = Date.now(),
    id = 'fixture-decision-inspection',
    child = `${id}-higher`;
  const decision = decisionRoot({
    jobId: id,
    worldId: service.world.id,
    timelineId: service.timelineId,
    generation: service.generation,
    actorId: NPC_ID,
    physicalLife: service.world.entities[NPC_ID]!.actor!.physicalLife ?? 0,
    cause: { kind: 'intent', id },
    originalWatermark: 0,
    urgency: 0,
    acceptedAt: now,
    groups: { q0: 'response' },
    origin: decisionOrigin(service.config),
    policyDigest: decisionPolicyDigest(service.config),
    limits: levelLimits(service.config),
  });
  decision.phase = 'closed';
  decision.immediate = { kind: 'deferred', at: now + 1000 };
  decision.higherEntitlement = 'claimed-child';
  decision.groups['q0'] = {
    kind: 'response',
    state: 'resolved',
    attemptId: child,
    receiptId: child,
  };
  decision.higher = {
    id: child,
    reason: 'invalid-output',
    eligibleAt: now + 100,
    dispatchBy: now + 2100,
    publishBy: now + 30_100,
    dispatchByMonotonic: performance.now() + 2100,
    publishByMonotonic: performance.now() + 30_100,
    state: 'finished',
    policyDigest: decision.policyDigest,
    startedAt: now + 110,
    reservedAt: now + 200,
    dispatchedAt: now + 220,
    returnedAt: now + 2400,
    accountedAt: now + 2420,
  };
  await service.store.putJob({
    id,
    kind: 'chat',
    status: 'completed',
    fingerprint: id,
    createdAt: now,
    completedAt: now + 2500,
    request: { text: 'A fixture conversation.', npcId: NPC_ID },
    message: 'Completed fixture.',
    decision,
  });
  await service.store.reserve(child, 'openai', 0.25, 1, NPC_ID, undefined, undefined, {
    rootJobId: id,
    category: 'level',
    level: 4,
    stage: 'decision-escalation',
    executionClass: 'background',
  });
  await service.store.markDecisionDispatch(child);
  await service.store.settle(child, {
    ...undispatchedReceipt(child, 'openai', now),
    dispatched: true,
    requestedModel: 'gpt-6-luna',
    model: 'gpt-6-luna',
    estimatedCostUsd: 0.001,
  });
  const log = new IntelligenceLog(service.store);
  await log.save({
    id,
    kind: 'Semantic trigger',
    actorId: NPC_ID,
    actorName: 'Fixture resident',
    worldId: service.world.id,
    trigger: 'A difficult reply needed reconsideration.',
    triggerType: 'Player speech',
    status: 'completed',
    startedAt: new Date(now).toISOString(),
    completedAt: new Date(now + 2500).toISOString(),
    exchanges: [],
    disposition: 'resolved',
    input: {},
  });
  await recordDecisionTiming(log, { id, decision }, 'immediate', now + 1000, 1000);
  await recordDecisionTiming(log, { id, decision }, 'final', now + 2500, 2500);
  await log.close();
  return id;
}
