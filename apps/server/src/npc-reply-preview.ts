import { randomUUID } from 'node:crypto';
import {
  canSpeak,
  capabilityBlocked,
  observerDescription,
  speechPerception,
} from '@open-legend/domain';
import type { ActorResponse, SpeechVolume, WorldState } from '@open-legend/domain';
import { JsonObjectStream, type GenerationProgress } from '@open-legend/ai';
import type { NpcReplyPreview } from '@open-legend/protocol';
import { AuthorityError, type RequestScope } from './authority.js';
import type { WorldService } from './world-service.js';

type Attempt = {
  scope: RequestScope;
  snapshot: NpcReplyPreview;
  current: () => boolean;
  decoder?: JsonObjectStream;
  localId?: string;
  volume?: SpeechVolume;
  receiving: boolean;
  invalid: boolean;
  sawText: boolean;
  transportSequence: number;
  checkedWorld?: WorldState;
  clearExposure?: boolean;
};

/** One replaceable private attempt. Display has no world effects or durable storage.
 * docs/projects/next-priority-batch-tech-design.md#4-separate-private-preview-projection-and-bounded-transport
 */
export class NpcReplyPreviews {
  private active?: Attempt;
  private listeners = new Set<() => void>();
  constructor(private service: WorldService) {}
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
  private permitted(attempt: Attempt) {
    const { scope, snapshot } = attempt;
    const world = this.service.world;
    if (
      !this.service.currentScope(scope, 'play', true) ||
      snapshot.timelineId !== this.service.timelineId ||
      !attempt.current()
    )
      return false;
    const npc = world.entities[snapshot.npcId];
    const player = world.entities[scope.actorId];
    if (
      !npc?.actor?.alive ||
      npc.actor.incapacitated ||
      !canSpeak(npc) ||
      !player?.actor?.alive ||
      player.actor.incapacitated ||
      capabilityBlocked(world, npc, 'speech')
    )
      return false;
    if (snapshot.conversationId) {
      const conversations = world.conversations;
      const conversation = conversations?.records[snapshot.conversationId];
      if (
        !conversation ||
        conversation.endedAt !== undefined ||
        conversations?.active[scope.actorId] !== conversation.id ||
        conversations.active[snapshot.npcId] !== conversation.id
      )
        return false;
    }
    if (!attempt.volume) return true;
    if (attempt.checkedWorld !== world) {
      let exposure;
      try {
        exposure = speechPerception(world, player, npc, attempt.volume);
      } catch {
        return false;
      }
      attempt.checkedWorld = world;
      attempt.clearExposure = exposure?.detail === 'clear' && exposure.sees(npc);
    }
    return (
      !!attempt.clearExposure &&
      (!snapshot.text || snapshot.speaker === observerDescription(world, scope.actorId, npc.id))
    );
  }
  recheck() {
    const attempt = this.active;
    if (attempt?.snapshot.state === 'forming' && !this.permitted(attempt)) this.withdraw(attempt);
  }
  private withdraw(attempt: Attempt) {
    if (attempt.snapshot.state !== 'forming') return;
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
    return { ...attempt.snapshot, historyIds: [...attempt.snapshot.historyIds] };
  }
  start(options: {
    scope: RequestScope;
    requestId: string;
    npcId: string;
    playerSpeechEventId: string;
    conversationId?: string;
    attempt: number;
    maxBytes: number;
    rootKeys: string[];
    current: () => boolean;
    operation: (value: unknown) => ActorResponse['operations'][number] | null;
  }) {
    if (this.active) this.withdraw(this.active);
    const attempt: Attempt = {
      scope: options.scope,
      snapshot: {
        requestId: options.requestId,
        npcId: options.npcId,
        playerSpeechEventId: options.playerSpeechEventId,
        conversationId: options.conversationId,
        attempt: options.attempt,
        generation: randomUUID(),
        worldId: options.scope.worldId,
        timelineId: options.scope.timelineId,
        sequence: 0,
        state: 'forming',
        speaker: '',
        text: '',
        historyIds: [],
      },
      current: options.current,
      receiving: true,
      invalid: false,
      sawText: false,
      transportSequence: 0,
      decoder: new JsonObjectStream(
        { path: ['operations', 0], maxBytes: options.maxBytes, rootKeys: options.rootKeys },
        (value) => {
          if (!attempt.receiving || this.active !== attempt || attempt.snapshot.state !== 'forming')
            return;
          const operation = options.operation(value);
          if (!operation?.talk || operation.talk.addresseeEntityId !== options.scope.actorId) {
            this.withdraw(attempt);
            return;
          }
          attempt.volume = operation.talk.volume;
          attempt.localId = operation.localId;
          if (!this.permitted(attempt)) {
            this.withdraw(attempt);
            return;
          }
          attempt.snapshot = {
            ...attempt.snapshot,
            text: operation.talk.text,
            volume: operation.talk.volume,
            speaker: observerDescription(this.service.world, options.scope.actorId, options.npcId),
            sequence: attempt.snapshot.sequence + 1,
          };
          this.changed();
        },
      ),
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
          attempt.decoder = undefined;
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
          attempt.decoder = undefined;
          this.withdraw(attempt);
          return;
        }
        if (attempt.invalid) return;
        try {
          attempt.decoder?.write(progress.text);
        } catch {
          attempt.invalid = true;
          attempt.decoder = undefined;
          this.withdraw(attempt);
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
        attempt.decoder = undefined;
        if (attempt.invalid) {
          this.withdraw(attempt);
          throw new Error('Invalid streamed decision.');
        }
      },
      admitting: () => {
        if (this.active !== attempt || attempt.snapshot.state !== 'forming') return;
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
        attempt.snapshot = {
          ...attempt.snapshot,
          text: '',
          sequence: attempt.snapshot.sequence + 1,
        };
        this.changed();
        const historyIds =
          attempt.localId && this.service.currentScope(attempt.scope, 'play', true)
            ? ((await this.service.store.history
                ?.replySpeechIds(
                  options.scope.worldId,
                  options.scope.accountId,
                  options.scope.actorId,
                  options.npcId,
                  options.requestId,
                  attempt.localId,
                )
                .catch(() => [])) ?? [])
            : [];
        if (
          this.active !== attempt ||
          attempt.snapshot.state !== 'forming' ||
          !this.service.currentScope(attempt.scope, 'play', true)
        )
          return;
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
    attempt.decoder = undefined;
    attempt.current = () => false;
  }
  close() {
    this.active = undefined;
    this.changed();
  }
}
