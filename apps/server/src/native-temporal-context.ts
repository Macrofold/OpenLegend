import {
  selectedRecognitionSupportReader,
  type TemporalReceiptLocator,
  type TemporalReceiptPrefix,
} from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeInstalledDefinitions } from './native-definition-capture.js';
import type { LiveReadCuts } from './live-read-overlay.js';
import type { IndexedTemporalHistoryReadContext } from './temporal-storage.js';
import type { NativePrivateHistoryPacket } from './native-history-capture.js';

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
  return indexedNativeHistoryContext(
    self,
    facts.history,
    seed.history,
    seed.receiptPrefix,
    captured,
    definitions,
  );
}

export function nativeRecentHistoryContext(
  facts: NativePrivateHistoryPacket,
  captured: LiveReadCuts,
  definitions: NativeInstalledDefinitions,
): IndexedTemporalHistoryReadContext {
  if (facts.purpose !== 'recent')
    throw new Error('Personal history cannot supply receipt chronology.');
  const { scope } = facts;
  return indexedNativeHistoryContext(
    scope,
    facts.history,
    { releasedThrough: scope.releasedThrough, recordingGap: facts.recordingGap },
    scope.receiptPrefix.state === 'known' ? scope.receiptPrefix.prefix : undefined,
    captured,
    definitions,
  );
}

function indexedNativeHistoryContext(
  self: {
    readonly worldId: string;
    readonly generation: string;
    readonly actorId: string;
    readonly acceptedCut: number;
    readonly at: number;
  },
  history: Extract<NativePrivateHistoryPacket, { purpose: 'recent' }>['history'],
  window: {
    readonly releasedThrough?: number;
    readonly recordingGap?: { readonly from: number; readonly through: number };
  },
  prefix: TemporalReceiptPrefix | undefined,
  captured: LiveReadCuts,
  definitions: NativeInstalledDefinitions,
): IndexedTemporalHistoryReadContext {
  if (!prefix)
    throw new Error('The native history tail must be resolved before selecting personal history.');
  const cut = history.cuts[0];
  const live = captured.historyEligibility?.get(self.actorId);
  if (
    captured.worldId !== self.worldId ||
    captured.generation !== self.generation ||
    captured.sequence < self.acceptedCut ||
    !live ||
    live.at < self.at ||
    history.worldId !== self.worldId ||
    history.generation !== self.generation ||
    history.baseCut !== self.acceptedCut ||
    history.cuts.length !== 1 ||
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
    ...window,
    ...(cut.frontier ? { frontier: cut.frontier } : {}),
    disclosure: {
      actorId: self.actorId,
      forgotten: new Set(cut.forgotten),
      corrected: new Set(cut.corrected),
      recognitionSupportSourceIds: selectedRecognitionSupportReader(definitions.definitions),
    },
    cut: prefix,
  };
}
