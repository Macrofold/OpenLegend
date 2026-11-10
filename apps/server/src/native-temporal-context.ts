import { selectedRecognitionSupportReader, type TemporalReceiptLocator } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeInstalledDefinitions } from './native-definition-capture.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { IndexedTemporalHistoryReadContext } from './temporal-storage.js';

export function nativeReceiptLocator(receipt: TemporalReceiptLocator): TemporalReceiptLocator {
  return {
    actorId: receipt.actorId,
    physicalLife: receipt.physicalLife,
    epoch: receipt.epoch,
    batchOrder: receipt.batchOrder,
    entryIndex: receipt.entryIndex,
  };
}

/** Exact actor-private query input for the existing indexed history consumer.
 * Call under nativeScopedReadCut's real accepted overlay, including its temporal
 * page preview; a durable-only connection cannot represent unsaved reception. */
export function nativeTemporalHistoryContext(
  facts: NativeNpcCapture['facts'],
  captured: LiveReadCuts,
  definitions: NativeInstalledDefinitions,
): IndexedTemporalHistoryReadContext {
  const { self, perception } = facts,
    seed = perception.npcCurrent;
  if (!seed.receiptPrefix)
    throw new Error('The native history tail must be resolved before selecting personal history.');
  const cut = facts.history.cuts[0];
  const live = captured.historyEligibility?.get(self.actorId);
  if (
    captured.worldId !== self.worldId ||
    captured.generation !== self.generation ||
    captured.sequence < self.acceptedCut ||
    !live ||
    live.at < self.at ||
    facts.history.worldId !== self.worldId ||
    facts.history.generation !== self.generation ||
    facts.history.baseCut !== self.acceptedCut ||
    facts.history.cuts.length !== 1 ||
    cut?.actorId !== self.actorId ||
    cut.at !== self.at
  )
    throw new Error('History query metadata belongs to a different native NPC cut.');
  // SQL may already represent later unrelated progress. Its real current
  // eligibility/overlay supplies the rows, while this originating prefix and
  // time retain what the actor had actually received. Native source admission
  // separately rechecks the original life/privacy/timeline before consumption.
  const policy = definitions.nativePolicies.attention;
  return {
    storage: 'indexed',
    worldId: self.worldId,
    actorId: self.actorId,
    at: self.at,
    maxAgeSeconds: policy.retention.recent.maxAgeSeconds,
    maximumSubjects: policy.maximumCapacity,
    maximumOperations: policy.scene.historyReceipts,
    maximumCandidates: policy.scene.candidateVisits,
    ...seed.history,
    ...(cut.frontier ? { frontier: cut.frontier } : {}),
    disclosure: {
      actorId: self.actorId,
      forgotten: new Set(cut.forgotten),
      corrected: new Set(cut.corrected),
      recognitionSupportSourceIds: selectedRecognitionSupportReader(definitions.definitions),
    },
    cut: seed.receiptPrefix,
  };
}
