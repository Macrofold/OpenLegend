import { stockedCamp } from './world.js';
import { entityGet, entityValues } from '../../packages/domain/src/entity-collection.js';
import { admitDeclaration, executeCommand } from '../../packages/domain/src/index.js';
import { createItemLot } from '../../packages/domain/src/objects.js';
import { PLAYER_ID, NPC_ID } from '../../packages/domain/src/worlds/base/world.js';
import {
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from '../../packages/domain/src/spatial-state.js';
import type { Command, DeclarationDraft, WorldState } from '../../packages/domain/src/types.js';

const sling: DeclarationDraft = {
  family: { id: 'base:swing', version: 1 },
  name: 'Test sling',
  description: 'A woven pouch and cords.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  output: { name: 'Test sling', description: 'A flexible pouch for stones.' },
  parameters: { workSeconds: 60, damage: 10, range: 7, accuracy: 0.8 },
};
export function fixture(): { world: WorldState; toolId: string } {
  let world = stockedCamp(73);
  for (const body of entityValues(world.entities))
    if (body.actor) {
      body.actor.action = null;
      body.actor.incapacitated = body.id !== PLAYER_ID && body.id !== NPC_ID;
      body.actor.agency.plan = null;
    }
  const source = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(
    world,
    target,
    { ...worldPosition(source), x: worldPosition(source).x + 2 },
    worldSupport(source),
  );
  const admitted = admitDeclaration(world, sling, {
    actorId: PLAYER_ID,
    requestId: 'execution-sling',
    source: 'test-fixture',
    authority: { origin: 'player', policyRevision: 1 },
  });
  if (!admitted.outcome.ok) throw new Error(admitted.outcome.message);
  world = admitted.world;
  const definition = world.recipes[admitted.outcome.recipeId!]!.outputs[0]!.definition.id;
  const toolId = createItemLot(world, PLAYER_ID, definition, 1, 'execution-sling-item');
  world = command(world, { type: 'equip', itemId: toolId });
  return { world, toolId };
}
export function command(world: WorldState, fields: Record<string, unknown>): WorldState {
  const result = executeCommand(world, {
    id: `execution-${world.nextId}`,
    actorId: PLAYER_ID,
    ...fields,
  } as Command);
  if (!result.outcome.ok) throw new Error(result.outcome.message);
  return result.world;
}
export function aim(world: WorldState): WorldState {
  const source = worldPosition(entityGet(world.entities, PLAYER_ID)!);
  return command(world, {
    type: 'aim',
    manualExecution: true,
    aimPoint: { x: source.x + 5, y: source.y + 0.85, z: source.z },
  });
}
