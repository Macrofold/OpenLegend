import { describe, expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { advanceWithNavigation } from '../../../tests/fixtures/navigation.js';
import { admitDeclaration } from './declarations.js';
import { executeCommand } from './kernel.js';
import { entityGet, entityValues } from './entity-collection.js';
import { createItemLot, custodian, itemContainerCapacity } from './objects.js';
import { freezeWorld } from './draft.js';
import { PLAYER_ID } from './data.js';
import { normalizeActivity, retainActivity } from './activity-learning.js';
import { occurrenceFor } from './action-experience.js';
import { validateWorldModules } from './world-modules.js';
import type { Command, WorldState } from './types.js';

function fixture() {
  const world = stockedCamp();
  for (const body of entityValues(world.entities))
    if (body.actor) {
      body.actor.action = null;
      body.actor.agency.plan = null;
      if (body.id !== PLAYER_ID) body.actor.incapacitated = true;
    }
  createItemLot(world, PLAYER_ID, 'prepared_fiber', 20);
  createItemLot(world, PLAYER_ID, 'cord', 10);
  const admitted = admitDeclaration(
    world,
    {
      family: { id: 'base:woven-container', version: 1 },
      name: 'Small travel pouch',
      description: 'A woven pouch secured with cord.',
      inputs: [
        { role: 'pouch', definitionId: 'prepared_fiber', quantity: 2 },
        { role: 'binding', definitionId: 'cord', quantity: 1 },
      ],
      output: { name: 'Small travel pouch', description: 'A portable pouch.' },
      parameters: {},
    },
    {
      actorId: PLAYER_ID,
      requestId: 'learning-pouch',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    },
  );
  expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
  return { world: freezeWorld(admitted.world), recipeId: admitted.outcome.recipeId! };
}
function perform(world: WorldState, fields: Omit<Command, 'actorId'>): WorldState {
  const result = executeCommand(world, {
    actorId: PLAYER_ID,
    humanInitiated: true,
    ...fields,
  } as Command);
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return freezeWorld(result.world);
}
function advance(world: WorldState, seconds: number): WorldState {
  const result = advanceWithNavigation(world, seconds);
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return freezeWorld(result.world);
}
function makeAndSetDown(world: WorldState, recipeId: string, id: string) {
  world = perform(world, { type: 'craft', id: `${id}-craft`, recipeId } as Command);
  const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
  world = advance(world, world.recipes[recipeId]!.workSeconds);
  const made = occurrenceFor(world, PLAYER_ID, action.id)!;
  expect(made.status).toBe('completed');
  expect(made.outputs).toHaveLength(1);
  const itemId = made.outputs[0]!.itemId;
  world = perform(world, { type: 'drop', id: `${id}-drop`, itemId, quantity: 1 } as Command);
  world = advance(world, 1);
  const dropped = world.actionExperience.occurrences[PLAYER_ID]!.find(
    (entry) => entry.command.id === `${id}-drop`,
  )!;
  expect(dropped.status).toBe('completed');
  return { world, itemId, entries: [occurrenceFor(world, PLAYER_ID, action.id)!, dropped] };
}

describe('ordinary learned manufacture', () => {
  it('retains a craft/output method and replays through current ordinary manufacture', () => {
    const f = fixture();
    const ordinary = makeAndSetDown(f.world, f.recipeId, 'ordinary');
    const candidate = normalizeActivity(ordinary.world, PLAYER_ID, ordinary.entries)!;
    expect(candidate).toBeDefined();
    expect(JSON.stringify(candidate.method.root)).toContain('"output"');
    let world = structuredClone(ordinary.world);
    const methodId = retainActivity(world, PLAYER_ID, candidate)!;
    expect(methodId).toBeTruthy();
    world = freezeWorld(world);
    expect(itemContainerCapacity(world, entityGet(world.entities, ordinary.itemId)!)).toBe(8);
    validateWorldModules(world);
    const withoutManufacture = structuredClone(world);
    withoutManufacture.moduleManifest.activityHosts =
      withoutManufacture.moduleManifest.activityHosts.filter(
        (pin) => pin.id !== 'base:manufacturing',
      );
    const stale = executeCommand(freezeWorld(withoutManufacture), {
      type: 'activity',
      actorId: PLAYER_ID,
      id: 'unsupported-replay',
      methodId,
      bindings: candidate.bindings,
    });
    expect(stale.outcome.ok).toBe(false);
    world = perform(world, {
      type: 'activity',
      id: 'ordinary-replay',
      methodId,
      bindings: candidate.bindings,
    } as Command);
    world = advance(world, world.recipes[f.recipeId]!.workSeconds + 2);
    const definitionId = world.recipes[f.recipeId]!.outputs[0]!.definition.id;
    const outputs = entityValues(world.entities).filter(
      (body) => body.item?.definitionPin.id === definitionId && !body.retirement,
    );
    expect(outputs).toHaveLength(2);
    const fresh = outputs.find((body) => body.id !== ordinary.itemId)!;
    expect(fresh).toBeDefined();
    expect(itemContainerCapacity(world, fresh)).toBe(8);
    expect(custodian(world, fresh.id)).not.toBe(PLAYER_ID);
    expect(
      world.actionExperience.occurrences[PLAYER_ID]!.some(
        (entry) =>
          entry.status === 'completed' &&
          entry.command.type === 'drop' &&
          entry.command.itemId === fresh.id,
      ),
    ).toBe(true);
    validateWorldModules(world);
  });
});
