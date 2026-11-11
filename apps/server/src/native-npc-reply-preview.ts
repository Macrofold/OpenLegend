import type { SpeechVolume } from '@open-legend/domain';
import type { NpcReplyPreview } from '@open-legend/protocol';
import type { NativeWorldReplyPreviewRead } from '@open-legend/native-simulation';
import { scopeKey } from './authority.js';
import type { NpcReplyPreviewHost } from './npc-reply-preview.js';
import type { NativeWorldService } from './native-world-service.js';
import {
  copyNativeProduct,
  attachNativeConsumer,
  encodeNativeJsonText,
  releaseNativeProduct,
} from './native-consumer.js';
import type { PrivateSnapshotMemory } from './private-snapshot-stream.js';
import { withNativeSqlPreparation } from './native-source-preparation.js';
import { decisionJsonGraphBytes, decisionObjectBytes } from './native-decision-allocation.js';

type Facts = Awaited<ReturnType<NativeWorldService['finishReplyPreview']>>;
type Frame = {
  nonce: number;
  key: string;
  cut: number;
  epoch: string;
  volume?: SpeechVolume;
  read: NativeWorldReplyPreviewRead;
  memory: { release(): void };
};

/** One private attempt retains at most its running pair read and one next cut.
 * Historical negatives retire a prefix; only a current positive grants words. */
export function nativeNpcReplyPreviewHost(service: NativeWorldService): NpcReplyPreviewHost {
  let nonce = 0;
  let closed = false;
  let denied = false;
  let shownSpeaker: string | undefined;
  let running: Promise<void> | undefined;
  let inFlight: Frame | undefined;
  let pending: Frame | undefined;
  let current: { key: string; epoch: string; value: Facts } | undefined;
  const listeners = new Set<() => void>();
  let stateMemory: ReturnType<NativeWorldService['world']['reserveConsumerBytes']> | undefined =
    service.world.reserveConsumerBytes(decisionObjectBytes(12));
  const notify = () => {
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Optional delivery observers cannot fail the gameplay owner or its cleanup.
      }
    }
  };
  const clearCurrent = () => {
    if (current) releaseNativeProduct(current.value);
    current = undefined;
  };
  const retire = (frame: Frame | undefined) => {
    frame?.read.release();
    frame?.memory.release();
  };
  const deny = () => {
    denied = true;
    clearCurrent();
    retire(pending);
    pending = undefined;
  };
  const start = (frame: Frame) => {
    inFlight = frame;
    running = (async () => {
      let value: Facts | undefined;
      try {
        value = await service.finishReplyPreview(frame.read);
        if (closed || frame.nonce !== nonce || denied) return;
        if (!value.eligible || (frame.volume !== undefined && !value.clear)) {
          // Do not erase an intervening loss just because a newer physical
          // cut has already returned to clear exposure.
          deny();
        } else if (
          frame.volume !== undefined &&
          shownSpeaker !== undefined &&
          value.speaker !== shownSpeaker
        ) {
          deny();
        } else if (
          value.worldId === service.worldId &&
          value.generation === service.generation &&
          value.acceptedCut === service.acceptedCut &&
          frame.epoch === service.historyEpoch
        ) {
          clearCurrent();
          current = { key: frame.key, epoch: frame.epoch, value };
          value = undefined;
        }
      } catch {
        // A lost generation or unavailable read grants no provisional text.
        if (!closed && frame.nonce === nonce) deny();
      } finally {
        if (value) releaseNativeProduct(value);
        retire(frame);
      }
    })().finally(() => {
      inFlight = undefined;
      running = undefined;
      const next = pending;
      pending = undefined;
      if (next && !closed && !denied && next.nonce === nonce) start(next);
      else retire(next);
      if (!closed) notify();
    });
  };
  return {
    get timelineId() {
      return service.timelineId;
    },
    assertScope: (scope, access, controlling) => service.assertScope(scope, access, controlling),
    currentScope: (scope, access, controlling) => service.currentScope(scope, access, controlling),
    begin() {
      nonce++;
      denied = false;
      shownSpeaker = undefined;
      clearCurrent();
      retire(pending);
      pending = undefined;
    },
    disclosure(scope, npcId, volume) {
      if (closed || denied || !service.currentScope(scope, 'play', true)) return false;
      const key = JSON.stringify([scopeKey(scope), npcId, volume]);
      const cut = service.acceptedCut;
      const epoch = service.historyEpoch;
      if (current?.key === key && current.epoch === epoch && current.value.acceptedCut === cut) {
        if (volume !== undefined) shownSpeaker = current.value.speaker;
        return { speaker: volume === undefined ? '' : current.value.speaker };
      }
      if (
        [inFlight, pending].some(
          (frame) =>
            frame?.nonce === nonce &&
            frame.key === key &&
            frame.cut === cut &&
            frame.epoch === epoch,
        )
      )
        return undefined;
      if (pending) {
        // Two retained cuts bound this optional consumer. Lost continuity is
        // explicit withdrawal; final speech still uses ordinary admission.
        deny();
        return false;
      }
      let memory: { release(): void } | undefined;
      let read: NativeWorldReplyPreviewRead | undefined;
      try {
        memory = service.world.reserveConsumerBytes(
          decisionObjectBytes(8) + decisionJsonGraphBytes(scope) + 2 * key.length + 64,
        );
        read = service.captureReplyPreview(scope, npcId, volume);
        const frame: Frame = { nonce, key, cut, epoch, volume, read, memory };
        read = undefined;
        memory = undefined;
        if (running) pending = frame;
        else start(frame);
      } catch {
        read?.release();
        memory?.release();
        // A private candidate may temporarily own the native session. The
        // next ordinary publication/request retries initial setup. Once words
        // were shown, an uncaptured cut cannot prove continuous disclosure.
        if (shownSpeaker !== undefined) {
          deny();
          return false;
        }
      }
      return undefined;
    },
    replySpeechIds: (scope, npcId, requestId, localId) =>
      withNativeSqlPreparation(service.world, service.store.db, async () =>
        copyNativeProduct(
          service.world,
          (await service.store.history?.replySpeechIds(
            scope.worldId,
            scope.accountId,
            scope.actorId,
            npcId,
            requestId,
            localId,
          )) ?? [],
        ),
      ),
    releaseHistoryIds: (ids) => releaseNativeProduct(ids),
    captureSnapshot: (value) => copyNativeProduct(service.world, value),
    reserveBytes: (bytes) => service.world.reserveConsumerBytes(bytes),
    watch(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async close() {
      if (closed) {
        await running;
        return;
      }
      closed = true;
      nonce++;
      clearCurrent();
      retire(pending);
      pending = undefined;
      inFlight?.read.release();
      try {
        await running;
      } finally {
        listeners.clear();
        stateMemory?.release();
        stateMemory = undefined;
      }
    },
  };
}

/** Native snapshots, retained serialized text and the actual HTTP queue have
 * distinct last uses. Source's existing stream keeps its own default codec. */
export function nativeNpcReplyPreviewMemory(
  service: NativeWorldService,
): PrivateSnapshotMemory<NpcReplyPreview | null> {
  return {
    serialize(snapshot) {
      const text = encodeNativeJsonText(service.world, snapshot);
      return { text: text.text, release: () => releaseNativeProduct(text) };
    },
    frame(cursor, payload) {
      const reservation = service.world.reserveConsumerBytes(
        4 * (cursor.length + payload.length + 32) +
          Buffer.byteLength(cursor) +
          Buffer.byteLength(payload) +
          32 +
          1024,
      );
      let bytes: Buffer;
      try {
        bytes = attachNativeConsumer(
          Buffer.from(`id: ${cursor}\nevent: snapshot\ndata: ${payload}\n\n`),
          reservation,
        );
      } catch (error) {
        reservation.release();
        throw error;
      }
      return { bytes, release: () => releaseNativeProduct(bytes) };
    },
    releaseSnapshot(snapshot) {
      if (snapshot) releaseNativeProduct(snapshot);
    },
  };
}
