import { isDraft, original } from 'immer';
import type { WorldState } from './types.js';
export interface ExposureInput {
  id: string;
  position: { x: number; y: number; z: number };
  height: number;
  radius: number;
  alive: boolean;
  memory: boolean;
  object: boolean;
}
interface ObserverInput {
  signature: string;
  people: unknown;
  objects: unknown;
  episodes: unknown;
  contacts: unknown;
}
interface ExposureCache {
  map: object;
  inputs: Map<string, ExposureInput>;
  observers: Map<string, ObserverInput>;
}
const caches = new WeakMap<WorldState, ExposureCache>();
const pending = new WeakMap<WorldState, ExposureCache>();
const equal = (a: ExposureInput | undefined, b: ExposureInput) =>
  a &&
  a.position.x === b.position.x &&
  a.position.y === b.position.y &&
  a.position.z === b.position.z &&
  a.height === b.height &&
  a.radius === b.radius &&
  a.alive === b.alive &&
  a.memory === b.memory &&
  a.object === b.object;
/** Derived per-phase inputs, rebuilt on recovery. No visibility or event authority lives here. */
export function exposureChanges(
  world: WorldState,
  base: WorldState,
  map: object,
  inputs: ExposureInput[],
) {
  const previous = caches.get(base);
  const next: ExposureCache = {
    map,
    inputs: new Map(
      inputs.map(({ id, position, height, radius, alive, memory, object }) => [
        id,
        { id, position, height, radius, alive, memory, object },
      ]),
    ),
    observers: new Map(),
  };
  const changed: ExposureInput[] = [];
  for (const input of inputs)
    if (!equal(previous?.inputs.get(input.id), input)) {
      changed.push(input);
      const old = previous?.inputs.get(input.id);
      if (old) changed.push(old);
    }
  for (const old of previous?.inputs.values() ?? [])
    if (!next.inputs.has(old.id)) changed.push(old);
  pending.set(world, next);
  return (actor: ExposureInput, radius: number, signature: string): boolean => {
    const old = previous?.observers.get(actor.id);
    next.observers.set(actor.id, {
      signature,
      people: undefined,
      objects: undefined,
      episodes: undefined,
      contacts: undefined,
    });
    if (
      !old ||
      !Object.isFrozen(map) ||
      previous?.map !== map ||
      old.signature !== signature ||
      !equal(previous.inputs.get(actor.id), actor) ||
      old.people !== base.visiblePeople?.[actor.id] ||
      old.objects !== base.visibleObjects?.[actor.id] ||
      old.episodes !== base.perceptionEpisodes?.[actor.id] ||
      old.contacts !== base.entities[actor.id]?.actor?.contacts
    )
      return true;
    // A changed source can affect this observer at either its previous or new position.
    return changed.some(
      (input) =>
        Math.hypot(
          input.position.x - actor.position.x,
          input.position.y - actor.position.y,
          input.position.z - actor.position.z,
        ) <= radius,
    );
  };
}
export function captureExposureCache(world: WorldState): (result: WorldState) => void {
  const next = pending.get(world),
    prior = caches.get(isDraft(world) ? original(world)! : world);
  return (result) => {
    if (next) {
      for (const [id, input] of next.observers) {
        input.people = result.visiblePeople?.[id];
        input.objects = result.visibleObjects?.[id];
        input.episodes = result.perceptionEpisodes?.[id];
        input.contacts = result.entities[id]?.actor?.contacts;
      }
      caches.set(result, next);
    } else if (prior) caches.set(result, prior);
  };
}
