import { validatePersonalReceiptLocator } from './remembered-impressions.js';
import type { WorldState } from './types.js';
import { selectedTemporalPolicy } from './world-composition.js';
import { temporalReadSourceRevoked } from './temporal-read-context.js';
import type { ActivityFact } from './action-experience.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import {
  receivedDirectoryContains,
  temporalReceiptId,
  type TemporalReceiptLocator,
} from './temporal-evidence.js';

/** A personal evidence address requests eligible content; it never pins it or
 * grants access through the separate execution history. */
export type ResultEvidence =
  | { kind: 'account'; source: 'memory' | 'awareness'; id: string }
  | { kind: 'recent'; subject: string; receipt: TemporalReceiptLocator };

export function accountResultEvidence(
  id: string | undefined,
  source: 'memory' | 'awareness' = 'memory',
): ResultEvidence | undefined {
  return id ? { kind: 'account', source, id } : undefined;
}
export function resultEvidenceId(value: ResultEvidence | undefined): string | undefined {
  return value?.kind === 'account'
    ? value.id
    : value
      ? temporalReceiptId(value.receipt)
      : undefined;
}
export function sameResultEvidence(
  a: ResultEvidence | undefined,
  b: ResultEvidence | undefined,
): boolean {
  if (!a || !b) return a === b;
  if (a.kind === 'account') return b.kind === 'account' && a.source === b.source && a.id === b.id;
  return (
    b.kind === 'recent' && resultEvidenceMatchesReceipt(a, { ...b.receipt, subject: b.subject })
  );
}
export function validResultEvidence(value: unknown, actorId?: string): value is ResultEvidence {
  if (!value || typeof value !== 'object') return false;
  if (hasRecordFields(value, ['kind', 'source', 'id']) && value.kind === 'account')
    return ['memory', 'awareness'].includes(String(value.source)) && isSafeRecordId(value.id);
  if (
    !hasRecordFields(value, ['kind', 'subject', 'receipt']) ||
    value.kind !== 'recent' ||
    !isSafeRecordId(value.subject)
  )
    return false;
  const receipt = value.receipt;
  if (
    !receipt ||
    typeof receipt !== 'object' ||
    !('actorId' in receipt) ||
    typeof receipt.actorId !== 'string'
  )
    return false;
  try {
    validatePersonalReceiptLocator(receipt, actorId ?? receipt.actorId);
    return true;
  } catch {
    return false;
  }
}

/** Received own outcome, independent of its durable execution record. */
export interface ActionResultValue {
  kind: 'action-result';
  id: string;
  text: string;
  status: 'completed' | 'cancelled';
  outcome: { ok: boolean; code: string };
  facts: ActivityFact[];
}

/** Eligibility checks the existing directory, never hydrates execution history or
 * extends retention. Exact readers still validate the selected receipt/value. */
export function recentResultEligible(
  world: WorldState,
  actorId: string,
  evidence: ResultEvidence,
): boolean {
  if (evidence.kind !== 'recent') return true;
  const actor = world.experience?.temporal?.actors[actorId];
  return (
    evidence.receipt.actorId === actorId &&
    !!actor &&
    !temporalReadSourceRevoked(world, actorId, evidence.subject) &&
    !temporalReadSourceRevoked(world, actorId, resultEvidenceId(evidence)!) &&
    receivedDirectoryContains(
      actor.recent,
      evidence.receipt,
      undefined,
      world.simTime - selectedTemporalPolicy(world).recent.maxAgeSeconds,
    )
  );
}

export function resultEvidenceMatchesReceipt(
  evidence: ResultEvidence,
  receipt: TemporalReceiptLocator & { subject: string },
): boolean {
  return (
    evidence.kind === 'recent' &&
    evidence.subject === receipt.subject &&
    evidence.receipt.actorId === receipt.actorId &&
    evidence.receipt.physicalLife === receipt.physicalLife &&
    evidence.receipt.epoch === receipt.epoch &&
    evidence.receipt.batchOrder === receipt.batchOrder &&
    evidence.receipt.entryIndex === receipt.entryIndex
  );
}
