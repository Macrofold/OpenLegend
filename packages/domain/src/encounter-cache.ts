import { current, isDraft, original } from 'immer';
import { worldRootEntities } from './entity-index.js';
import { worldPosition } from './spatial-state.js';
import type { Position, WorldState } from './types.js';
import { spatialCandidates } from './spatial.js';
export interface ExposureInput {
  id: string;
  position: { x: number; y: number; z: number };
  height: number;
  radius: number;
  alive: boolean;
  memory: boolean;
  object: boolean;
  feature: string;
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
export type EncounterBaseline = Pick<
  WorldState,
  'visiblePeople' | 'visibleObjects' | 'perceptionEpisodes'
> & { positions: Map<string, Position>; contacts: Map<string, unknown> };
const caches = new WeakMap<object, ExposureCache>();
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
  a.object === b.object &&
  a.feature === b.feature;
/** Derived per-phase inputs, rebuilt on recovery. No visibility or event authority lives here. */
export function exposureChanges(
  world: WorldState,
  base: EncounterBaseline,
  map: object,
  inputs: ExposureInput[],
) {
  const previous = caches.get(base);
  const next: ExposureCache = {
    map,
    inputs: new Map(
      inputs.map(({ id, position, height, radius, alive, memory, object, feature }) => [
        id,
        { id, position: { ...position }, height, radius, alive, memory, object, feature },
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
  const nearbyChanges = spatialCandidates(changed);
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
      old.contacts !== base.contacts.get(actor.id)
    )
      return true;
    // A changed source can affect this observer at either its previous or new position.
    return nearbyChanges(actor.position, radius).some(
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

/** Only encounter dependencies cross a private motion slice. Histories, plans and the
 * remaining world are not copied just to remember the last observed positions. */
export function snapshotEncounters(world: WorldState): EncounterBaseline {
  const next = pending.get(world);
  const snapshot = <T extends object | undefined>(value: T): T =>
    value && isDraft(value) ? current(value) : value;
  const result: EncounterBaseline = {
    positions: new Map(
      (next
        ? [...next.inputs.values()].map((input) => [input.id, input.position] as const)
        : undefined) ??
        worldRootEntities(world).map((entity) => [entity.id, { ...worldPosition(entity) }]),
    ),
    contacts: new Map(),
    ...(world.visiblePeople ? { visiblePeople: snapshot(world.visiblePeople) } : {}),
    ...(world.visibleObjects ? { visibleObjects: snapshot(world.visibleObjects) } : {}),
    ...(world.perceptionEpisodes ? { perceptionEpisodes: snapshot(world.perceptionEpisodes) } : {}),
  };
  const prior = caches.get(isDraft(world) ? original(world)! : world);
  const cache = next ?? prior;
  for (const id of cache?.observers.keys() ?? Object.keys(world.entities))
    result.contacts.set(id, snapshot(world.entities[id]?.actor?.contacts));
  if (next) {
    for (const [id, input] of next.observers) {
      input.people = result.visiblePeople?.[id];
      input.objects = result.visibleObjects?.[id];
      input.episodes = result.perceptionEpisodes?.[id];
      input.contacts = result.contacts.get(id);
    }
    caches.set(result, next);
  } else if (prior) caches.set(result, prior);
  return result;
}
