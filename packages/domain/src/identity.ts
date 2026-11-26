import { entityGet, entityValues } from './entity-collection.js';
import type { WorldState } from './types.js';

/** Saved bindings separate control roles from entity identity. Legacy IDs remain immutable. */
export function initializeIdentity(world: WorldState): void {
  if (world.identity) return;
  const actors = entityValues(world.entities);
  const controlled = actors.filter((entity) => entity.actor?.controller === 'player');
  if (controlled.length !== 1)
    throw new Error('World needs exactly one local controlled actor binding.');
  // Select the local opening’s default NPC for callers that omit a conversation or goal target.
  // The saved binding identifies one actor. It says nothing about where other characters live.
  const resident = actors.find((entity) => entity.actor?.controller === 'npc');
  world.identity = {
    controlledEntityId: controlled[0]!.id,
    defaultResidentEntityId: resident?.id ?? null,
  };
}

export function controlledEntityId(world: WorldState): string {
  const id = world.identity?.controlledEntityId;
  if (!id || !entityGet(world.entities, id)?.actor)
    throw new Error('Controlled actor binding is unavailable.');
  return id;
}
export function defaultResidentEntityId(world: WorldState): string {
  const id = world.identity?.defaultResidentEntityId;
  if (!id || !entityGet(world.entities, id)?.actor)
    throw new Error('Select a resident by entity ID.');
  return id;
}
