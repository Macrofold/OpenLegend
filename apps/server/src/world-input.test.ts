import { describe, it, expect } from 'vitest';
import { WorldInputOwner } from './world-input.js';

describe('finite foreground input authority', () => {
  it('does not infer a committed release from a cleared pending request', () => {
    const owner = new WorldInputOwner(1),
      state = owner.state('a', 'control'),
      original = { ...state.scope };
    owner.begin(state, { operation: 'begin', ...state.scope, gestureSequence: 1 }, 'begin');
    owner.arm(state, 'action', 0, 0);
    owner.reconcile(() => ({ id: 'action', pending: false }));
    expect(state.attack?.phase).toBe('ended');
    expect(state.attack?.window).toBeUndefined();
    expect(owner.released('a', 'action')).toBe(false);
    expect(state.scope.attackInputToken).not.toBe(original.attackInputToken);
    const retired = { ...state.scope };
    owner.reconcile(() => ({ id: 'action', pending: false }));
    expect(state.scope).toEqual(retired);
  });
  it('retires an interrupted attack once while retaining the independent movement lane', () => {
    const owner = new WorldInputOwner(1),
      state = owner.state('a', 'control'),
      original = { ...state.scope };
    owner.update(
      state,
      { kind: 'steer', ...original, movementSequence: 1, direction: { x: 1, z: 0 } },
      0,
      0,
    );
    owner.begin(state, { operation: 'begin', ...original, gestureSequence: 1 }, 'begin');
    state.attack!.actionId = 'action';
    const movement = state.steering;
    owner.reconcile(() => ({ id: 'replacement', pending: false }));
    expect(state.scope.attackInputToken).not.toBe(original.attackInputToken);
    expect(state.scope.revision).toBeGreaterThan(original.revision);
    expect(state.scope.movementInputToken).toBe(original.movementInputToken);
    expect(state.scope.inputEpoch).toBe(original.inputEpoch);
    expect(state.steering).toBe(movement);
    expect(state.gestureSequence).toBe(0);
    expect(
      owner.begin(state, { operation: 'begin', ...original, gestureSequence: 999 }, 'obsolete'),
    ).toBeTruthy();
    const retired = { ...state.scope };
    owner.reconcile(() => undefined);
    expect(state.scope).toEqual(retired);
    expect(
      owner.begin(state, { operation: 'begin', ...retired, gestureSequence: 1 }, 'fresh'),
    ).toBeUndefined();
    state.attack!.actionId = 'fresh-action';
    owner.accepted({
      id: 'release-event',
      sequence: 1,
      at: 0,
      type: 'struck',
      text: '',
      actorId: 'a',
      audience: ['a'],
      data: { actionId: 'fresh-action' },
    });
    owner.reconcile(() => undefined);
    expect(owner.released('a', 'fresh-action')).toBe(true);
    expect(state.scope).toEqual(retired);
    owner.begin(
      state,
      { operation: 'cancel', ...retired, gestureSequence: 2, beginCommandId: 'cancelled' },
      'cancel-before-begin',
    );
    state.attack!.actionId = 'cancelled-action';
    owner.reconcile(() => undefined);
    expect(state.attack?.phase).toBe('cancelled');
    expect(state.scope).toEqual(retired);
  });
  it('separates input-time windows from old simulation debt and never mints time on renewal', () => {
    const owner = new WorldInputOwner(2),
      state = owner.state('a', 'control');
    expect(
      owner.update(
        state,
        { kind: 'steer', ...state.scope, movementSequence: 1, direction: { x: 1, z: 0 } },
        100,
        500,
      ).ok,
    ).toBe(true);
    owner.credit(100, 200, 500, 60);
    expect(owner.inputs(200)[0]?.steering).toMatchObject({ startsAt: 500, endsAt: 506 });
    owner.update(
      state,
      {
        kind: 'renew',
        inputEpoch: state.scope.inputEpoch,
        renewalSequence: 1,
        movement: { movementInputToken: state.scope.movementInputToken, movementSequence: 1 },
      },
      200,
      506,
    );
    expect(owner.inputs(200)[0]?.steering?.endsAt).toBe(506);
    owner.credit(200, 500, 506, 60);
    expect(state.steering?.endsAt).toBe(521);
    expect(owner.inputs(500)).toEqual([]);
  });
  it('expires each lane independently and fences even unseen higher-sequence packets', () => {
    const owner = new WorldInputOwner(1),
      state = owner.state('a', 'control'),
      scope = { ...state.scope };
    owner.update(
      state,
      { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 1, z: 0 } },
      0,
      0,
    );
    owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 1 }, 'begin');
    owner.arm(state, 'action', 100, 6);
    owner.expire(260);
    expect(state.scope.attackInputToken).toBe(scope.attackInputToken);
    expect(state.scope.movementInputToken).not.toBe(scope.movementInputToken);
    expect(
      owner.update(
        state,
        { kind: 'steer', ...scope, movementSequence: 999, direction: { x: 0, z: 1 } },
        260,
        6,
      ).ok,
    ).toBe(false);
    expect(
      owner.update(
        state,
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: 2,
          movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
          pendingRelease: {
            attackInputToken: scope.attackInputToken,
            gestureSequence: 1,
            beginCommandId: 'begin',
            actionId: 'action',
          },
        },
        260,
        6,
      ),
    ).toMatchObject({ movementAccepted: false, releaseAccepted: true });
    const attackToken = state.scope.attackInputToken;
    owner.expire(511);
    expect(state.scope.attackInputToken).not.toBe(attackToken);
    expect(
      owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 999 }, 'late'),
    ).toBeTruthy();
  });
  it('keeps per-lane renewal watermarks and terminal cancellation before begin', () => {
    const owner = new WorldInputOwner(1),
      state = owner.state('a', 'control'),
      scope = { ...state.scope };
    owner.update(
      state,
      { kind: 'steer', ...scope, movementSequence: 1, direction: { x: 0, z: 1 } },
      0,
      0,
    );
    owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 1 }, 'begin');
    owner.arm(state, 'action', 0, 0);
    owner.update(
      state,
      {
        kind: 'renew',
        inputEpoch: scope.inputEpoch,
        renewalSequence: 10,
        movement: { movementInputToken: scope.movementInputToken, movementSequence: 1 },
      },
      10,
      0,
    );
    expect(
      owner.update(
        state,
        {
          kind: 'renew',
          inputEpoch: scope.inputEpoch,
          renewalSequence: 9,
          pendingRelease: {
            attackInputToken: scope.attackInputToken,
            gestureSequence: 1,
            beginCommandId: 'begin',
            actionId: 'action',
          },
        },
        20,
        0,
      ).releaseAccepted,
    ).toBe(true);
    owner.begin(
      state,
      { operation: 'cancel', ...scope, gestureSequence: 1, beginCommandId: 'begin' },
      'cancel',
    );
    expect(
      owner.begin(
        state,
        {
          operation: 'release',
          ...scope,
          gestureSequence: 1,
          beginCommandId: 'begin',
          input: { kind: 'ordinary' },
        },
        'release',
      ),
    ).toBeTruthy();
    owner.begin(
      state,
      { operation: 'cancel', ...scope, gestureSequence: 2, beginCommandId: 'next' },
      'cancel-before-begin',
    );
    expect(
      owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 2 }, 'next'),
    ).toBeTruthy();
    expect(
      owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 3 }, 'fresh'),
    ).toBeUndefined();
  });
  it('discards obsolete candidates after expiry or authority replacement', () => {
    const owner = new WorldInputOwner(1);
    let current = true;
    const state = owner.state('a', 'control', () => current);
    owner.update(
      state,
      { kind: 'steer', ...state.scope, movementSequence: 1, direction: { x: 1, z: 0 } },
      0,
      10,
    );
    owner.credit(0, 100, 10, 1);
    const candidate = owner.inputs(100);
    expect(owner.authorized(candidate, 100)).toBe(true);
    current = false;
    expect(owner.authorized(candidate, 101)).toBe(false);
    const replacement = owner.state('a', 'new');
    expect(replacement.scope.inputEpoch).not.toBe(state.scope.inputEpoch);
    owner.update(
      replacement,
      { kind: 'steer', ...replacement.scope, movementSequence: 1, direction: { x: 1, z: 0 } },
      100,
      10,
    );
    const late = owner.inputs(101);
    expect(owner.authorized(late, 350)).toBe(false);
  });
  it('cannot replace unresolved work with a higher begin or unrelated cancellation', () => {
    const owner = new WorldInputOwner(1),
      state = owner.state('a', 'control'),
      scope = { ...state.scope };
    owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 1 }, 'begin');
    expect(
      owner.begin(state, { operation: 'begin', ...scope, gestureSequence: 2 }, 'other'),
    ).toBeTruthy();
    expect(
      owner.begin(
        state,
        { operation: 'cancel', ...scope, gestureSequence: 2, beginCommandId: 'other' },
        'cancel',
      ),
    ).toBeTruthy();
    expect(state.attack?.beginCommandId).toBe('begin');
  });
});
