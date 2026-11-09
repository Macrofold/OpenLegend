import { selectedRecognitionSupportReader } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeInstalledDefinitions } from './native-definition-capture.js';
import type { NativeActorReadCut } from './native-read-cut.js';
import type { IndexedTemporalHistoryReadContext } from './temporal-storage.js';

/** Exact actor-private query input for the existing indexed history consumer.
 * Call under nativeScopedReadCut's real accepted overlay, including its temporal
 * page preview; a durable-only connection cannot represent unsaved reception. */
export function nativeTemporalHistoryContext(
  facts: NativeNpcCapture['facts'],
  captured: NativeActorReadCut,
  definitions: NativeInstalledDefinitions,
): IndexedTemporalHistoryReadContext {
  const { self, perception } = facts,
    seed = perception.npcCurrent;
  if (!seed.receiptPrefix)
    throw new Error('The native history tail must be resolved before selecting personal history.');
  const cut = captured.history.cuts[0];
  if (
    captured.worldId !== self.worldId ||
    captured.generation !== self.generation ||
    captured.actorId !== self.actorId ||
    captured.acceptedCut !== self.acceptedCut ||
    captured.at !== self.at ||
    captured.sequence !== self.sequence ||
    captured.history.cuts.length !== 1 ||
    cut?.actorId !== self.actorId ||
    cut.at !== self.at
  )
    throw new Error('History query metadata belongs to a different native NPC cut.');
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
