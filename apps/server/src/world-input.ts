import { randomUUID } from 'node:crypto';
import type { AdmittedWorldInput, WorldEvent } from '@open-legend/domain';
import type {
  AttackExecutionControl,
  WorldInputScope,
  WorldInputUpdate,
  WorldInputResult,
} from '@open-legend/protocol';

export const WORLD_INPUT_POLICY = Object.freeze({ renewalIntervalMs: 100, expiryMs: 250 });
type Window = { startsAt: number; endsAt: number; expiresAt: number; renewalSequence: number };
export interface AttackGesture {
  sequence: number;
  beginCommandId: string;
  actionId?: string;
  phase: 'open' | 'release-requested' | 'cancelled' | 'released' | 'ended';
  window?: Window;
}
export interface WorldInputState {
  actorId: string;
  identity: string;
  isCurrent: () => boolean;
  scope: WorldInputScope;
  movementSequence: number;
  gestureSequence: number;
  steering?: Window & { direction: { x: number; z: number }; sequence: number };
  attack?: AttackGesture;
}
/** Fixed transient controller state. Native actions and receipts remain elsewhere. */
export class WorldInputOwner {
  private states = new Map<string, WorldInputState>();
  private revision = 0;
  private nextRevision(): number {
    if (!Number.isSafeInteger(this.revision + 1)) throw new Error('Input revision exhausted.');
    return ++this.revision;
  }
  constructor(private readonly maximum: number) {}
  state(actorId: string, identity: string, isCurrent: () => boolean = () => true): WorldInputState {
    const current = this.states.get(actorId);
    if (current?.identity === identity) return current;
    if (!current && this.states.size >= this.maximum) {
      const idle = [...this.states].find(([, state]) => !state.steering && !state.attack?.window);
      if (!idle) throw new Error('Active input capacity reached.');
      this.states.delete(idle[0]);
    }
    const state: WorldInputState = {
      actorId,
      identity,
      isCurrent,
      scope: {
        revision: this.nextRevision(),
        inputEpoch: randomUUID(),
        movementInputToken: randomUUID(),
        attackInputToken: randomUUID(),
        ...WORLD_INPUT_POLICY,
      },
      movementSequence: 0,
      gestureSequence: 0,
    };
    this.states.set(actorId, state);
    return state;
  }
  clear(actorId?: string): void {
    if (actorId === undefined) this.states.clear();
    else this.states.delete(actorId);
  }
  released(actorId: string, actionId: string): boolean {
    const gesture = this.states.get(actorId)?.attack;
    return gesture?.actionId === actionId && gesture.phase === 'released';
  }
  invalidateMovement(actorId: string): void {
    const state = this.states.get(actorId);
    if (!state) return;
    state.steering = undefined;
    state.movementSequence = 0;
    state.scope.movementInputToken = randomUUID();
    state.scope.revision = this.nextRevision();
  }
  private retireAttack(state: WorldInputState): void {
    if (!state.attack) return;
    state.attack.window = undefined;
    state.attack.phase = 'ended';
    state.gestureSequence = 0;
    state.scope.attackInputToken = randomUUID();
    state.scope.revision = this.nextRevision();
  }
  /** Accepted native events resolve cancellation races without retaining history. */
  accepted(event: WorldEvent): void {
    if (event.type !== 'shot-released' && event.type !== 'struck') return;
    const gesture = event.actorId ? this.states.get(event.actorId)?.attack : undefined;
    if (gesture?.actionId && gesture.actionId === event.data?.['actionId']) {
      gesture.phase = 'released';
      gesture.window = undefined;
    }
  }
  reconcile(
    actionFor: (actorId: string) => { id: string; pending: boolean } | undefined,
    steeringAllowed?: (actorId: string) => boolean,
    actorId?: string,
  ): void {
    const states = actorId === undefined ? this.states.values() : [this.states.get(actorId)];
    for (const state of states) {
      if (!state) continue;
      if (state.steering && steeringAllowed && !steeringAllowed(state.actorId))
        this.invalidateMovement(state.actorId);
      const gesture = state.attack;
      if (!gesture?.actionId || !['open', 'release-requested'].includes(gesture.phase)) continue;
      const action = actionFor(state.actorId);
      if (
        action?.id !== gesture.actionId ||
        (gesture.phase === 'release-requested' && !action.pending)
      )
        // Native interruption retires only this lane, including when its Begin
        // acknowledgement has not reached the client. Accepted release events
        // already made the gesture terminal and are never inferred from absence.
        this.retireAttack(state);
    }
  }
  expire(now: number, actorId?: string): void {
    const states = actorId === undefined ? this.states.values() : [this.states.get(actorId)];
    for (const state of states) {
      if (!state) continue;
      if (!state.isCurrent()) {
        this.states.delete(state.actorId);
        continue;
      }
      if (state.steering && state.steering.expiresAt <= now) {
        this.invalidateMovement(state.actorId);
      }
      if (state.attack?.window && state.attack.window.expiresAt <= now) {
        this.retireAttack(state);
      }
    }
  }
  /** Credit only the real interval actually admitted by the one host clock. */
  credit(from: number, to: number, frontier: number, ratio: number): void {
    if (to <= from) return;
    for (const state of this.states.values())
      for (const window of [state.steering, state.attack?.window]) {
        if (!window || window.expiresAt <= from) continue;
        window.endsAt = Math.max(
          window.endsAt,
          frontier + ((Math.min(to, window.expiresAt) - from) / 1000) * ratio,
        );
      }
  }
  update(
    state: WorldInputState,
    input: WorldInputUpdate,
    now: number,
    frontier: number,
  ): WorldInputResult {
    this.expire(now, state.actorId);
    const result: WorldInputResult = {
      ok: false,
      code: 'input-stale',
      message: 'These controls expired. Use a fresh deliberate input.',
      inputScope: { ...state.scope },
    };
    if (
      this.states.get(state.actorId) !== state ||
      !state.isCurrent() ||
      input.inputEpoch !== state.scope.inputEpoch
    )
      return result;
    if (input.kind === 'steer') {
      if (
        input.movementInputToken !== state.scope.movementInputToken ||
        input.movementSequence <= state.movementSequence
      )
        return result;
      state.movementSequence = input.movementSequence;
      const moving = input.direction.x !== 0 || input.direction.z !== 0;
      state.steering = moving
        ? {
            direction: input.direction,
            sequence: input.movementSequence,
            startsAt: frontier,
            endsAt: frontier,
            expiresAt: now + WORLD_INPUT_POLICY.expiryMs,
            renewalSequence: 0,
          }
        : undefined;
      return {
        ...result,
        ok: true,
        code: 'input-accepted',
        message: moving ? 'Movement requested.' : 'Movement stopped.',
        movementAccepted: true,
      };
    }
    let movementAccepted = false,
      releaseAccepted = false;
    const move = state.steering,
      attack = state.attack;
    if (
      input.movement &&
      move &&
      input.movement.movementInputToken === state.scope.movementInputToken &&
      input.movement.movementSequence === move.sequence &&
      input.renewalSequence > move.renewalSequence
    ) {
      move.expiresAt = now + WORLD_INPUT_POLICY.expiryMs;
      move.renewalSequence = input.renewalSequence;
      movementAccepted = true;
    }
    if (
      input.pendingRelease &&
      attack?.window &&
      attack.phase === 'release-requested' &&
      input.pendingRelease.attackInputToken === state.scope.attackInputToken &&
      input.pendingRelease.gestureSequence === attack.sequence &&
      input.pendingRelease.beginCommandId === attack.beginCommandId &&
      input.pendingRelease.actionId === attack.actionId &&
      input.renewalSequence > attack.window.renewalSequence
    ) {
      attack.window.expiresAt = now + WORLD_INPUT_POLICY.expiryMs;
      attack.window.renewalSequence = input.renewalSequence;
      releaseAccepted = true;
    }
    return {
      ...result,
      ok: movementAccepted || releaseAccepted,
      code: movementAccepted || releaseAccepted ? 'input-renewed' : 'input-stale',
      message: movementAccepted || releaseAccepted ? 'Active controls renewed.' : result.message,
      movementAccepted,
      releaseAccepted,
    };
  }
  begin(
    state: WorldInputState,
    input: AttackExecutionControl,
    beginCommandId: string,
  ): string | undefined {
    if (
      input.inputEpoch !== state.scope.inputEpoch ||
      input.attackInputToken !== state.scope.attackInputToken
    )
      return 'These attack controls expired.';
    if (input.operation === 'begin' || input.operation === 'confirm-review') {
      if (input.gestureSequence <= state.gestureSequence)
        return 'This attack gesture has already ended.';
      if (
        state.attack &&
        ['open', 'release-requested'].includes(state.attack.phase) &&
        input.operation !== 'confirm-review'
      )
        return 'Finish or cancel the current attack first.';
      state.gestureSequence = input.gestureSequence;
      state.attack = { sequence: input.gestureSequence, beginCommandId, phase: 'open' };
      return;
    }
    const prior = state.attack;
    if (input.operation === 'cancel' && input.gestureSequence > state.gestureSequence) {
      if (prior && ['open', 'release-requested'].includes(prior.phase))
        return 'Finish or cancel the current attack first.';
      state.gestureSequence = input.gestureSequence;
      state.attack = {
        sequence: input.gestureSequence,
        beginCommandId: input.beginCommandId,
        phase: 'cancelled',
      };
      return;
    }
    if (
      !prior ||
      prior.sequence !== input.gestureSequence ||
      prior.beginCommandId !== input.beginCommandId
    )
      return 'This attack gesture no longer matches.';
    if (input.operation === 'cancel') {
      prior.window = undefined;
      prior.phase = 'cancelled';
      return;
    }
    if (prior.phase !== 'open') return 'This attack gesture has already ended.';
  }
  arm(state: WorldInputState, actionId: string, now: number, frontier: number): void {
    if (!state.attack) return;
    state.attack.actionId = actionId;
    state.attack.phase = 'release-requested';
    state.attack.window = {
      startsAt: frontier,
      endsAt: frontier,
      expiresAt: now + WORLD_INPUT_POLICY.expiryMs,
      renewalSequence: 0,
    };
  }
  inputs(now: number): AdmittedWorldInput[] {
    this.expire(now);
    return [...this.states.values()].flatMap((state) => {
      const movement = state.steering,
        attack = state.attack;
      if (!movement && !attack?.window) return [];
      return [
        {
          actorId: state.actorId,
          ...(movement
            ? {
                steering: {
                  direction: movement.direction,
                  startsAt: movement.startsAt,
                  endsAt: movement.endsAt,
                },
              }
            : {}),
          ...(attack?.window && attack.actionId
            ? {
                release: {
                  actionId: attack.actionId,
                  startsAt: attack.window.startsAt,
                  endsAt: attack.window.endsAt,
                },
              }
            : {}),
        },
      ];
    });
  }
  authorized(inputs: readonly AdmittedWorldInput[], now: number): boolean {
    this.expire(now);
    return inputs.every((input) => {
      const state = this.states.get(input.actorId);
      return (
        !!state &&
        (!input.steering ||
          (!!state.steering &&
            state.steering.startsAt === input.steering.startsAt &&
            state.steering.direction === input.steering.direction)) &&
        (!input.release ||
          (state.attack?.phase === 'release-requested' &&
            state.attack.actionId === input.release.actionId &&
            state.attack.window?.startsAt === input.release.startsAt))
      );
    });
  }
}
