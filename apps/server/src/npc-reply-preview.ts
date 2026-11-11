import { entityGet } from '@open-legend/domain';
import { randomUUID } from 'node:crypto';
import {
  canSpeak,
  capabilityBlocked,
  observerDescription,
  speechPerception,
} from '@open-legend/domain';
import type { ActorResponse, SpeechVolume, WorldState } from '@open-legend/domain';
import { JsonObjectStream, jsonCaptureBytes, type GenerationProgress } from '@open-legend/ai';
import type { NpcReplyPreview } from '@open-legend/protocol';
import { AuthorityError, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';

// A projection allocation failure withdraws optional words; malformed provider
// syntax remains a distinct failure of the streamed decision contract.
class PreviewUnavailable extends Error {}

type Attempt = {
  scope: RequestScope;
  snapshot: NpcReplyPreview;
  current: () => boolean;
  operation?: (value: unknown) => ActorResponse['operations'][number] | null;
  decoder?: JsonObjectStream;
  localId?: string;
  volume?: SpeechVolume;
  receiving: boolean;
  displaying: boolean;
  invalid: boolean;
  sawText: boolean;
  transportSequence: number;
  speech?: { text: string; volume: SpeechVolume; localId: string };
  speechMemory?: { release(): void };
  speechSpeaker?: string;
  stateMemory?: { release(): void };
  historyMemory?: { release(): void };
  parserMemory: { release(): void }[];
  writing: boolean;
  parserRetired: boolean;
};

/** A fresh disclosure can be pending while Native reads its immutable geometry cut.
 * Pending reads clear provisional words; only a current result may republish them. */
export interface NpcReplyPreviewHost {
  readonly timelineId: string;
  assertScope(scope: RequestScope, access: 'play', controlling: true): void;
  currentScope(scope: RequestScope, access: 'play', controlling: true): boolean;
  begin?(scope: RequestScope, npcId: string): void;
  disclosure(
    scope: RequestScope,
    npcId: string,
    volume?: SpeechVolume,
  ): { speaker: string } | false | undefined;
  replySpeechIds(
    scope: RequestScope,
    npcId: string,
    requestId: string,
    localId: string,
  ): Promise<string[]>;
  releaseHistoryIds?(ids: readonly string[]): void;
  reserveBytes?(bytes: number): { release(): void };
  captureSnapshot?(value: NpcReplyPreview): NpcReplyPreview;
  watch?(notify: () => void): () => void;
  close?(): void | Promise<void>;
}

export function sourceNpcReplyPreviewHost(service: WorldService): NpcReplyPreviewHost {
  let checked:
    | { world: WorldState; actorId: string; npcId: string; volume: SpeechVolume; clear: boolean }
    | undefined;
  return {
    get timelineId() {
      return service.timelineId;
    },
    assertScope: (scope, access, controlling) => service.assertScope(scope, access, controlling),
    currentScope: (scope, access, controlling) => service.currentScope(scope, access, controlling),
    disclosure(scope, npcId, volume) {
      const world = service.world;
      const npc = entityGet(world.entities, npcId);
      const player = entityGet(world.entities, scope.actorId);
      if (
        !npc?.actor?.alive ||
        npc.actor.incapacitated ||
        !canSpeak(npc) ||
        !player?.actor?.alive ||
        player.actor.incapacitated ||
        capabilityBlocked(world, npc, 'speech')
      )
        return false;
      if (!volume) return { speaker: '' };
      if (
        checked?.world !== world ||
        checked.actorId !== scope.actorId ||
        checked.npcId !== npcId ||
        checked.volume !== volume
      ) {
        let clear = false;
        try {
          const exposure = speechPerception(world, player, npc, volume);
          clear = exposure?.detail === 'clear' && exposure.sees(npc);
        } catch {
          return false;
        }
        checked = { world, actorId: scope.actorId, npcId, volume, clear };
      }
      return checked.clear ? { speaker: observerDescription(world, scope.actorId, npcId) } : false;
    },
    replySpeechIds: async (scope, npcId, requestId, localId) =>
      (await service.store.history?.replySpeechIds(
        scope.worldId,
        scope.accountId,
        scope.actorId,
        npcId,
        requestId,
        localId,
      )) ?? [],
    close() {
      checked = undefined;
    },
  };
}

/** One replaceable private attempt. Display has no world effects or durable storage.
 * docs/projects/completed/parallel-batch-02-foundations-and-usability-tech-design.md#4-separate-private-preview-projection-and-bounded-transport
 */
export class NpcReplyPreviews {
  private active?: Attempt;
  private listeners = new Set<() => void>();
  private unwatch?: () => void;
  constructor(private service: NpcReplyPreviewHost) {
    this.unwatch = service.watch?.(() => this.recheck());
  }
  watch(notify: () => void) {
    this.listeners.add(notify);
    return () => {
      this.listeners.delete(notify);
    };
  }
  private changed() {
    for (const notify of this.listeners) {
      try {
        notify();
      } catch {
        /* A viewer cannot interrupt paid work or native admission. */
      }
    }
  }
  private reserve(bytes: number) {
    try {
      return this.service.reserveBytes?.(bytes);
    } catch {
      throw new PreviewUnavailable();
    }
  }
  private unavailable(attempt: Attempt) {
    attempt.receiving = false;
    this.retireParser(attempt);
    this.withdraw(attempt);
  }
  private permitted(attempt: Attempt) {
    const { scope, snapshot } = attempt;
    if (
      !this.service.currentScope(scope, 'play', true) ||
      snapshot.timelineId !== this.service.timelineId ||
      !attempt.current()
    )
      return false;
    const disclosure = this.service.disclosure(scope, snapshot.npcId, attempt.volume);
    if (
      disclosure &&
      attempt.displaying &&
      attempt.speechSpeaker !== undefined &&
      attempt.speechSpeaker !== disclosure.speaker
    )
      return false;
    return disclosure;
  }
  recheck() {
    const attempt = this.active;
    if (attempt?.snapshot.state !== 'forming') return;
    let disclosure: ReturnType<NpcReplyPreviewHost['disclosure']>;
    try {
      disclosure = this.permitted(attempt);
    } catch {
      this.unavailable(attempt);
      return;
    }
    if (disclosure === false) this.withdraw(attempt);
    else if (!disclosure) this.clearText(attempt);
    else if (attempt.speech && attempt.displaying) {
      if (
        attempt.snapshot.text === attempt.speech.text &&
        attempt.snapshot.speaker === disclosure.speaker
      )
        return;
      attempt.speechSpeaker = disclosure.speaker;
      attempt.snapshot = {
        ...attempt.snapshot,
        text: attempt.speech.text,
        volume: attempt.speech.volume,
        speaker: disclosure.speaker,
        sequence: attempt.snapshot.sequence + 1,
      };
      this.changed();
    }
  }
  private clearText(attempt: Attempt) {
    if (!attempt.snapshot.text) return;
    attempt.snapshot = { ...attempt.snapshot, text: '', sequence: attempt.snapshot.sequence + 1 };
    this.changed();
  }
  private retireParser(attempt: Attempt) {
    attempt.decoder = undefined;
    attempt.operation = undefined;
    attempt.parserRetired = true;
    if (!attempt.writing) {
      for (const memory of attempt.parserMemory) memory.release();
      attempt.parserMemory = [];
    }
  }
  private retireSpeech(attempt: Attempt) {
    attempt.speech = undefined;
    attempt.speechMemory?.release();
    attempt.speechMemory = undefined;
  }
  private retireAttempt(attempt: Attempt) {
    attempt.current = () => false;
    attempt.receiving = false;
    attempt.displaying = false;
    this.retireParser(attempt);
    this.retireSpeech(attempt);
    attempt.historyMemory?.release();
    attempt.historyMemory = undefined;
    attempt.stateMemory?.release();
    attempt.stateMemory = undefined;
  }
  private withdraw(attempt: Attempt) {
    if (attempt.snapshot.state !== 'forming') return;
    this.retireSpeech(attempt);
    attempt.snapshot = {
      ...attempt.snapshot,
      state: 'withdrawn',
      text: '',
      sequence: attempt.snapshot.sequence + 1,
    };
    this.changed();
  }
  snapshot(scope: RequestScope, requestId: string): NpcReplyPreview | null {
    this.service.assertScope(scope, 'play', true);
    this.recheck();
    const attempt = this.active;
    if (!attempt || attempt.snapshot.requestId !== requestId) return null;
    const owner = attempt.scope;
    if (
      owner.accountId !== scope.accountId ||
      owner.actorId !== scope.actorId ||
      owner.sessionId !== scope.sessionId ||
      owner.controlGeneration !== scope.controlGeneration ||
      owner.timelineId !== scope.timelineId
    )
      throw new AuthorityError('forbidden');
    return this.service.captureSnapshot
      ? this.service.captureSnapshot(attempt.snapshot)
      : { ...attempt.snapshot, historyIds: [...attempt.snapshot.historyIds] };
  }
  start({
    scope,
    requestId,
    npcId,
    playerSpeechEventId,
    attempt: attemptNumber,
    maxBytes,
    rootKeys,
    current,
    operation,
  }: {
    scope: RequestScope;
    requestId: string;
    npcId: string;
    playerSpeechEventId: string;
    attempt: number;
    maxBytes: number;
    rootKeys: string[];
    current: () => boolean;
    operation: (value: unknown) => ActorResponse['operations'][number] | null;
  }) {
    // The fixed attempt, callback closures and two overlapping 14-field snapshots
    // fit this allowance; streamed graphs/text have separate owners below. The
    // settled or withdrawn snapshot remains readable until replacement or close.
    let stateMemory: { release(): void } | undefined;
    let parserMemory: { release(): void } | undefined;
    try {
      if (this.service.reserveBytes) {
        stateMemory = this.reserve(64 * 1024);
        parserMemory = this.reserve(64 * 1024);
      }
    } catch {
      stateMemory?.release();
      parserMemory?.release();
      if (this.active) this.end(this.active.snapshot.requestId);
      return undefined;
    }
    if (this.active) {
      this.withdraw(this.active);
      this.active.receiving = false;
      this.retireAttempt(this.active);
      this.active = undefined;
    }
    try {
      this.service.begin?.(scope, npcId);
    } catch {
      stateMemory?.release();
      parserMemory?.release();
      return undefined;
    }
    const attempt: Attempt = {
      scope,
      snapshot: {
        requestId,
        npcId,
        playerSpeechEventId,
        attempt: attemptNumber,
        generation: randomUUID(),
        worldId: scope.worldId,
        timelineId: scope.timelineId,
        sequence: 0,
        state: 'forming',
        speaker: '',
        text: '',
        historyIds: [],
      },
      current,
      operation,
      receiving: true,
      displaying: true,
      invalid: false,
      sawText: false,
      transportSequence: 0,
      stateMemory,
      parserMemory: parserMemory ? [parserMemory] : [],
      writing: false,
      parserRetired: false,
      decoder: new JsonObjectStream({ path: ['operations', 0], maxBytes, rootKeys }, (value) => {
        if (!attempt.receiving || this.active !== attempt || attempt.snapshot.state !== 'forming')
          return;
        let memory: { release(): void } | undefined;
        try {
          memory = this.service.reserveBytes ? this.reserve(jsonCaptureBytes(value)) : undefined;
          const operation = attempt.operation?.(value);
          if (!operation?.talk || operation.talk.addresseeEntityId !== scope.actorId) {
            this.withdraw(attempt);
            return;
          }
          const speechMemory = this.service.reserveBytes
            ? this.reserve(1024 + 2 * (operation.talk.text.length + operation.localId.length))
            : undefined;
          this.retireSpeech(attempt);
          attempt.speechMemory = speechMemory;
          attempt.volume = operation.talk.volume;
          attempt.localId = operation.localId;
          attempt.speech = {
            text: operation.talk.text,
            volume: operation.talk.volume,
            localId: operation.localId,
          };
          this.recheck();
        } catch (error) {
          // The JSON library converts callback exceptions into syntax errors.
          // End optional capture here so a quota refusal keeps its own meaning.
          if (error instanceof PreviewUnavailable) this.unavailable(attempt);
          else throw error;
        } finally {
          memory?.release();
        }
      }),
    };
    this.active = attempt;
    this.changed();
    return {
      progress: (progress: GenerationProgress) => {
        if (this.active !== attempt || !attempt.receiving) return;
        if (progress.kind === 'withdrawn') {
          // The adapter abandoned this partial representation (interrupted delivery
          // or a different terminal body). Ordinary final validation owns its result.
          attempt.sawText = false;
          attempt.receiving = false;
          attempt.invalid = false;
          this.retireParser(attempt);
          this.withdraw(attempt);
          return;
        }
        if (progress.kind === 'accepted') {
          attempt.snapshot = { ...attempt.snapshot, providerRequestId: progress.providerRequestId };
          return;
        }
        attempt.sawText = true;
        if (progress.sequence !== ++attempt.transportSequence) {
          attempt.invalid = true;
          this.retireParser(attempt);
          this.withdraw(attempt);
          return;
        }
        if (attempt.invalid) return;
        try {
          if (this.service.reserveBytes) {
            // Count every possible token carrier before the incremental parser allocates.
            // Counting punctuation inside strings is conservative across split escapes.
            let bytes = 128 + 6 * progress.text.length;
            for (const character of progress.text)
              bytes +=
                character === ':'
                  ? 512
                  : character === '{'
                    ? 256
                    : character === '['
                      ? 320
                      : character === ',' || character === '"'
                        ? 64
                        : 0;
            const memory = this.reserve(bytes);
            if (memory) attempt.parserMemory.push(memory);
          }
          attempt.writing = true;
          attempt.decoder?.write(progress.text);
        } catch (error) {
          if (error instanceof PreviewUnavailable) this.unavailable(attempt);
          else {
            attempt.invalid = true;
            this.retireParser(attempt);
            this.withdraw(attempt);
          }
        } finally {
          attempt.writing = false;
          if (attempt.parserRetired) this.retireParser(attempt);
        }
      },
      finish: () => {
        attempt.receiving = false;
        if (attempt.sawText && !attempt.invalid) {
          try {
            attempt.decoder?.finish();
          } catch {
            attempt.invalid = true;
          }
        }
        this.retireParser(attempt);
        if (attempt.invalid) {
          this.withdraw(attempt);
          throw new Error('Invalid streamed decision.');
        }
      },
      admitting: () => {
        if (this.active !== attempt || attempt.snapshot.state !== 'forming') return;
        attempt.displaying = false;
        this.retireSpeech(attempt);
        attempt.snapshot = {
          ...attempt.snapshot,
          text: '',
          sequence: attempt.snapshot.sequence + 1,
        };
        this.changed();
      },
      settle: async () => {
        if (this.active !== attempt || attempt.snapshot.state !== 'forming') return;
        // Clear provisional words before awaiting history; late callbacks are already retired.
        attempt.displaying = false;
        this.retireSpeech(attempt);
        attempt.snapshot = {
          ...attempt.snapshot,
          text: '',
          sequence: attempt.snapshot.sequence + 1,
        };
        this.changed();
        const receivedIds =
          attempt.localId && this.service.currentScope(attempt.scope, 'play', true)
            ? await this.service
                .replySpeechIds(scope, npcId, requestId, attempt.localId)
                .catch(() => {
                  if (this.service.reserveBytes) {
                    this.unavailable(attempt);
                    return undefined;
                  }
                  return [];
                })
            : [];
        if (receivedIds === undefined) return;
        let historyIds: string[];
        let historyMemory: { release(): void } | undefined;
        try {
          if (this.service.reserveBytes) {
            let bytes = 256 + 64 * receivedIds.length;
            for (const id of receivedIds) bytes += 64 + 2 * id.length;
            historyMemory = this.reserve(bytes);
            historyIds = [...receivedIds];
          } else historyIds = receivedIds;
        } catch (error) {
          historyMemory?.release();
          if (error instanceof PreviewUnavailable) {
            this.unavailable(attempt);
            return;
          }
          throw error;
        } finally {
          this.service.releaseHistoryIds?.(receivedIds);
        }
        if (
          this.active !== attempt ||
          attempt.snapshot.state !== 'forming' ||
          !this.service.currentScope(attempt.scope, 'play', true)
        ) {
          historyMemory?.release();
          return;
        }
        attempt.historyMemory?.release();
        attempt.historyMemory = historyMemory;
        attempt.snapshot = {
          ...attempt.snapshot,
          state: 'settled',
          historyIds,
          sequence: attempt.snapshot.sequence + 1,
        };
        this.changed();
      },
    };
  }
  end(requestId: string) {
    const attempt = this.active;
    if (attempt?.snapshot.requestId !== requestId) return;
    this.withdraw(attempt);
    attempt.receiving = false;
    this.retireParser(attempt);
    this.retireSpeech(attempt);
    attempt.current = () => false;
  }
  close() {
    if (this.active) this.retireAttempt(this.active);
    this.unwatch?.();
    this.unwatch = undefined;
    this.active = undefined;
    this.changed();
    this.listeners.clear();
    return this.service.close?.();
  }
}
