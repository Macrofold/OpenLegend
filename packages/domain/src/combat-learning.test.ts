import { describe, expect, it } from 'vitest';
import { fixture, command } from '../../../tests/fixtures/combat-execution.js';
import { advanceWithNavigation } from '../../../tests/fixtures/navigation.js';
import { advanceWorld, lethalAttackOffer } from './kernel.js';
import { entityGet } from './entity-collection.js';
import { createItemLot } from './objects.js';
import { PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { worldPosition } from './spatial-state.js';
import { occurrenceFor } from './action-experience.js';
import { normalizeActivity, retainActivity } from './activity-learning.js';
import { validateWorldModules } from './world-modules.js';
import type { TimedReleaseInput } from './execution-input.js';
import type { Command } from './types.js';

function completed(kind: 'strike' | 'aim', input: TimedReleaseInput, pointOnly = false) {
  let { world } = fixture();
  const target = worldPosition(entityGet(world.entities, NPC_ID)!);
  if (kind === 'strike') {
    const weaponItemId = createItemLot(world, PLAYER_ID, 'spear', 1);
    world = command(world, { type: 'equip', itemId: weaponItemId });
    world = command(world, {
      type: 'strike',
      targetId: NPC_ID,
      definitionId: 'spear',
      weaponItemId,
      manualExecution: true,
    });
  } else {
    world = command(world, {
      type: 'aim',
      ...(pointOnly ? { aimPoint: { ...target, y: target.y + 0.2 } } : { targetId: NPC_ID }),
      manualExecution: true,
    });
  }
  const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!,
    actionId = action.id;
  world = advanceWorld(world, action.remainingSeconds).world;
  const release: Command =
    kind === 'strike'
      ? {
          type: 'release-strike',
          id: `confirmed-release-${actionId}`,
          actorId: PLAYER_ID,
          expectedActionId: actionId,
          releaseInput: input,
        }
      : {
          type: 'release-shot',
          id: `confirmed-release-${actionId}`,
          actorId: PLAYER_ID,
          aimId: actionId,
          releaseInput: input,
        };
  const review = lethalAttackOffer(world, release);
  if (kind === 'strike') expect(review).not.toBeNull();
  world = command(
    world,
    review ? { ...review.command, lethalPermission: review.permission } : { ...release },
  );
  const releaseOccurrence = world.actionExperience.occurrences[PLAYER_ID]!.find(
    (entry) => entry.commandId === release.id,
  )!;
  expect(releaseOccurrence.command).not.toHaveProperty('lethalPermission');
  world = advanceWorld(world, 40).world;
  world = command(world, { type: 'say', text: 'The attempt is finished.' });
  const speech = world.actionExperience.occurrences[PLAYER_ID]!.slice()
    .reverse()
    .find((entry) => entry.command.type === 'say')!;
  const attack = occurrenceFor(world, PLAYER_ID, actionId)!;
  expect(attack.status).toBe('completed');
  expect(speech.status).toBe('completed');
  expect(attack.noLearningControl).toBe(true);
  expect(attack.attackExecution!.input).toEqual(input);
  validateWorldModules(world);
  return { world, entries: [attack, speech] };
}

describe('resolved ordinary attack learning without replayable human input', () => {
  it.each(['strike', 'aim'] as const)(
    'replays a neutral %s as an ordinary native subject action without another human release',
    (kind) => {
      const source = completed(kind, { kind: 'ordinary' }),
        canonical = JSON.stringify(source.entries);
      const candidate = normalizeActivity(source.world, PLAYER_ID, source.entries)!;
      expect(candidate).toBeDefined();
      const root = JSON.stringify(candidate.method.root);
      expect(root).toContain(kind === 'strike' ? '"command":"strike"' : '"command":"shoot-once"');
      for (const field of [
        'manualExecution',
        'aimPoint',
        'releaseInput',
        'attackExecution',
        'phase',
        'score',
        'inputEpoch',
      ])
        expect(root).not.toContain(field);
      expect(JSON.stringify(source.entries)).toBe(canonical);
      let world = structuredClone(source.world);
      const methodId = retainActivity(world, PLAYER_ID, candidate)!;
      expect(methodId).toBeTruthy();
      const before = world.events.filter(
        (event) => event.type === (kind === 'strike' ? 'struck' : 'shot-released'),
      ).length;
      world = command(world, { type: 'activity', methodId, bindings: candidate.bindings });
      const result = advanceWithNavigation(world, 100);
      expect(result.outcome.ok, result.outcome.message).toBe(true);
      world = result.world;
      expect(
        world.events.filter(
          (event) => event.type === (kind === 'strike' ? 'struck' : 'shot-released'),
        ),
      ).toHaveLength(before + 1);
      expect(entityGet(world.entities, PLAYER_ID)!.actor!.action).toBeNull();
      const replay = world.actionExperience.occurrences[PLAYER_ID]!.slice()
        .reverse()
        .find((entry) => entry.command.type === (kind === 'strike' ? 'strike' : 'shoot-once'))!;
      expect(replay.status).toBe('completed');
      expect(replay.attackExecution).toBeUndefined();
      expect('manualExecution' in replay.command && replay.command.manualExecution).toBeFalsy();
      expect(replay.command).not.toHaveProperty('aimPoint');
      expect(JSON.stringify(source.entries)).toBe(canonical);
      validateWorldModules(world);
    },
  );

  it('excludes actual timing, including a zero score, and refuses relabeled retention', () => {
    const ordinary = completed('strike', { kind: 'ordinary' });
    const candidate = normalizeActivity(ordinary.world, PLAYER_ID, ordinary.entries)!;
    // A point inside the ordinary band evaluates to zero but still needs human timing.
    const timed = completed('strike', { kind: 'timed-release', phase: 0.2 });
    expect(timed.entries[0]!.attackExecution!.assessment.score).toBe(0);
    expect(normalizeActivity(timed.world, PLAYER_ID, timed.entries)).toBeUndefined();
    expect(
      retainActivity(timed.world, PLAYER_ID, {
        ...candidate,
        occurrenceIds: timed.entries.map((entry) => entry.id),
      }),
    ).toBeUndefined();
    validateWorldModules(timed.world);
  });

  it('keeps a neutral point-only shot non-reusable and retains its exact physical evidence', () => {
    const result = completed('aim', { kind: 'ordinary' }, true),
      canonical = JSON.stringify(result.entries);
    expect(normalizeActivity(result.world, PLAYER_ID, result.entries)).toBeUndefined();
    expect(JSON.stringify(result.entries)).toBe(canonical);
    expect(result.entries[0]!.command).toHaveProperty('aimPoint');
    expect(result.entries[0]!.command).not.toHaveProperty('targetId');
  });
});
