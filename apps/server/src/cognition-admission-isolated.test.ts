import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld, freezeWorld, NPC_ID, PLAYER_ID, actionReadiness } from '@open-legend/domain';
import { ActorWork } from './actor-work.js';
import { WorldClock } from './world-runtime.js';
import type { WorldService } from './world-service.js';
import type { AiDirector } from './ai-director.js';
import type { Autosaves } from './autosaves.js';
import {
  immediateActionCandidates,
  blockedActionCapabilities,
  type CandidateAction,
} from './context.js';
import { readableDecisionContext } from './response-context.js';
import { parseEpisodeSpec } from '../../../scripts/cognition-lab/contracts.js';
import {
  resolvePhasePolicy,
  SimulationAllowanceReached,
} from '../../../scripts/cognition-lab/phase-boundary.js';

// Explicitly scoped mechanics specimens; no provider, server or paid request.
afterEach(() => vi.useRealTimers());

describe('isolated cognition admission changes', () => {
  it('completes a crossed simulation boundary only when its declared condition is satisfied', async () => {
    const end = new SimulationAllowanceReached('Original simulation allowance elapsed.');
    const exhausted = async () => {
      throw end;
    };
    await expect(resolvePhasePolicy(exhausted, async () => true)).resolves.toBeUndefined();
    await expect(resolvePhasePolicy(exhausted, async () => false)).rejects.toBe(end);
    await expect(resolvePhasePolicy(exhausted)).rejects.toBe(end);
    const other = new Error('Original funding allowance elapsed.');
    await expect(
      resolvePhasePolicy(
        async () => {
          throw other;
        },
        async () => true,
      ),
    ).rejects.toBe(other);
  });
  it('returns one maximum captured cut only for otherwise eligible pending actors', () => {
    const world = freezeWorld(createWorld(73));
    let required = 2,
      saved = 1;
    const intake = new ActorWork('isolated', () => 100, {
      capture: () => required,
      current: (ticket) => ticket <= saved,
    });
    intake.refresh(world, () => [1], 'timeline', [NPC_ID, PLAYER_ID]);
    required = 3;
    intake.wake(PLAYER_ID, { reason: 'evidence' });
    expect(intake.ready(100, world.simTime, (id) => id === NPC_ID)).toMatchObject({
      actors: [],
      durabilityTicket: 2,
      durabilityBlocked: 1,
    });
    expect(intake.ready(100, world.simTime)).toMatchObject({
      actors: [],
      durabilityTicket: 3,
      durabilityBlocked: 2,
    });
    saved = 2;
    expect(intake.ready(100, world.simTime).actors).toEqual([NPC_ID]);
    required = 99;
    expect(intake.ready(100, world.simTime).durabilityTicket).toBe(3);
    saved = 3;
    expect(intake.ready(100, world.simTime).durabilityTicket).toBeUndefined();
    expect(intake.ready(100, world.simTime).actors).toEqual([NPC_ID, PLAYER_ID]);
  });

  it('does not demand persistence for idle/deferred or excluded actors', () => {
    const world = freezeWorld(createWorld(73));
    const intake = new ActorWork('isolated', () => 100, { capture: () => 2, current: () => false });
    intake.refresh(world, () => [1], 'timeline', [NPC_ID]);
    expect(intake.ready(100, world.simTime, () => false).durabilityTicket).toBeUndefined();
    intake.defer(NPC_ID, 500);
    expect(intake.ready(100, world.simTime).durabilityTicket).toBeUndefined();
  });

  it('records readiness transitions only when enabled, and starts a fresh recording', () => {
    const world = freezeWorld(createWorld(73));
    let saved = false;
    const intake = new ActorWork('isolated', () => 100, { capture: () => 2, current: () => saved });
    intake.refresh(world, () => [1], 'timeline', [NPC_ID]);
    intake.ready(100, world.simTime);
    const observed = vi.fn();
    intake.readinessObserver = observed;
    intake.ready(100, world.simTime);
    intake.ready(100, world.simTime);
    expect(observed).toHaveBeenCalledTimes(1);
    saved = true;
    intake.ready(100, world.simTime);
    expect(observed).toHaveBeenLastCalledWith(
      expect.objectContaining({ actorId: NPC_ID, blocked: false, ticket: 2 }),
    );
    intake.readinessObserver = undefined;
    intake.readinessObserver = observed;
    intake.ready(100, world.simTime);
    expect(observed).toHaveBeenCalledTimes(3);
  });

  it('keeps blocked facts without an executable candidate, while preserving silence/continuation', () => {
    const candidates: CandidateAction[] = [
      { id: 'continue', description: 'Continue current work', command: null },
      {
        id: 'blocked',
        description: 'A known action',
        command: { type: 'cancel' },
        readiness: actionReadiness(
          {
            outcome: { ok: false, code: 'evasion-recovery', message: 'Recovery remains active.' },
            nextAt: 120,
          },
          6,
        ),
      },
      {
        id: 'ready',
        description: 'An available action',
        command: { type: 'cancel' },
        readiness: actionReadiness({ ok: true, code: 'available', message: 'Available' }, 6),
      },
    ];
    expect(immediateActionCandidates(candidates).map((c) => c.id)).toEqual(['continue', 'ready']);
    expect(blockedActionCapabilities(candidates)).toEqual([
      {
        description: 'A known action',
        readiness: {
          kind: 'blocked',
          at: 6,
          code: 'evasion-recovery',
          reason: 'Recovery remains active.',
          nextAt: 120,
        },
      },
    ]);
    const prose = readableDecisionContext(
      { blockedCapabilities: blockedActionCapabilities(candidates) },
      [],
    );
    expect(prose).toContain('Recovery remains active.');
    expect(prose).not.toContain('"id":"blocked"');
  });

  it('preserves existing work context without the unqualified presentation expansion', () => {
    const prose = readableDecisionContext(
      {
        agency: {
          plan: 'Continue the unfinished work to keep the promise.',
          progress: { remainingGameSeconds: 12 },
          choicesForCurrentWork: [{ handling: 'replace', lostGameSecondsOfWork: 8 }],
        },
      },
      [],
    );
    expect(prose).toContain('keep the promise');
    expect(prose).not.toContain('remainingGameSeconds');
    expect(prose).not.toContain('lostGameSecondsOfWork');
    expect(readableDecisionContext({ agency: { choicesForCurrentWork: [] } }, [])).not.toContain(
      'Consequences of continuing',
    );
  });

  it('coalesces completion wakes during a running consideration and ignores stopped clocks', async () => {
    let finish!: () => void;
    const held = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const considerThought = vi
      .fn()
      .mockImplementationOnce(() => held)
      .mockResolvedValue(undefined);
    const service = { storageError: null } as WorldService;
    const director = { considerThought } as unknown as AiDirector;
    const clock = new WorldClock(service, () => director, {} as Autosaves);
    clock.requestConsideration();
    clock.requestConsideration();
    clock.requestConsideration();
    expect(considerThought).toHaveBeenCalledTimes(1);
    finish();
    await clock.idle();
    await Promise.resolve();
    expect(considerThought).toHaveBeenCalledTimes(2);
    clock.stop();
    clock.requestConsideration();
    expect(considerThought).toHaveBeenCalledTimes(2);
  });

  it('never admits an autonomous completion wake during a cognition-disabled finite offer', async () => {
    const considerThought = vi.fn(async () => {});
    const service = {
      storageError: null,
      world: { simTime: 0 },
      config: { baseRatio: 60 },
      speed: 1,
      tick: vi.fn(async () => {
        service.world.simTime += 1;
      }),
    } as unknown as WorldService;
    const clock = new WorldClock(
      service,
      () => ({ considerThought }) as unknown as AiDirector,
      {} as Autosaves,
    );
    await clock.withFiniteOffer(async () => {
      clock.requestConsideration();
      await clock.advance(1, false);
    });
    expect(considerThought).not.toHaveBeenCalled();
    clock.stop();
  });

  it('rejects invalid ordinary-runtime targets before execution', () => {
    expect(() => parseEpisodeSpec({ runtimeTarget: 'game-with-lab-holds' })).toThrow();
  });
});
