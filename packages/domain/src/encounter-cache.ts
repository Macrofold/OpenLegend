import { current, isDraft, original } from 'immer';
import { readOnlyDraftView } from './draft.js';
import { worldRootEntities } from './entity-index.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { visibleFeature } from './perception-frame.js';
import { bodyProfile, worldPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';
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
/** A new continuous-exposure episode identity. Its format is owned here with its parser. */
export function perceptionEpisodeId(world: WorldState, sourceId: string): string {
  return `${world.sequence}:${world.simTime}:${sourceId}`;
}
/** Simulation time an episode began, or undefined for a foreign/unknown identity. */
export function episodeStartedAt(episode: string | undefined): number | undefined {
  const at = episode ? Number(episode.split(':')[1]) : Number.NaN;
  return Number.isFinite(at) ? at : undefined;
}
/** Latest private sighting record per subject for one observer (EPR03). */
export interface SightingRecord {
  /** False when the latest record is a departure. */
  present: boolean;
  at: number;
  episode?: string;
}
/** Read the observer's newest sighting records back to `since`, without copying its
 * resident awareness. Only records still resident are visible: a missing or evicted record
 * can cause an extra record later, never a lost one. Awareness is appended in time order.
 * docs/events-perception-and-reactions.md#hysteresis-and-freshness */
export function recentSightings(
  world: WorldState,
  observerId: string,
  since: number,
): Map<string, SightingRecord> {
  const records = new Map<string, SightingRecord>();
  const awareness = world.experience ? readOnlyDraftView(world.experience.awareness) : undefined;
  const entries = readOnlyDraftView(awareness?.[observerId] ?? []);
  // Presence comes from the newest arrival or departure; an outward-change record only marks
  // the subject as recently recorded and cannot re-arm a departure.
  const resolved = new Set<string>();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    if (entry.at < since) break;
    const subject = entry.targetId;
    if (entry.eventType !== 'encounter' || !subject || resolved.has(subject)) continue;
    if (entry.change === 'detail') {
      if (records.has(subject)) continue;
    } else resolved.add(subject);
    records.set(subject, {
      present: entry.change !== 'end',
      at: entry.at,
      ...(entry.entityEpisodes?.[subject] ? { episode: entry.entityEpisodes[subject] } : {}),
    });
  }
  return records;
}
/** One root's read-only encounter inputs for a phase. */
export interface ExposureCapture extends ExposureInput {
  entity: Entity;
  detail: string;
}
const captures = new WeakMap<Entity, ExposureCapture | null>();
/** Every field depends only on the entity record (and constant body profiles), so an
 * immutable record reuses its capture across slices; a live draft is captured afresh.
 * Returns null for a root that does not currently participate. Callers only read it.
 * PF03/09: static roots otherwise rebuilt identical inputs on every slice. */
export function captureExposure(entity: Entity): ExposureCapture | null {
  const frozen = Object.isFrozen(entity);
  if (frozen) {
    const cached = captures.get(entity);
    if (cached !== undefined) return cached;
  }
  let capture: ExposureCapture | null = null;
  if (activelyParticipates(entity)) {
    const position = worldPosition(entity),
      profile = bodyProfile(entity);
    capture = {
      entity,
      id: entity.id,
      position: isDraft(position) ? current(position) : position,
      height: profile.height,
      radius: profile.radius,
      alive: !!entity.actor?.alive,
      memory: hasMemory(entity),
      object: !entity.actor && !entity.animal,
      ...visibleFeature(entity),
    };
  }
  if (frozen) captures.set(entity, capture);
  return capture;
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
  const next: ExposureCache = { map, inputs: new Map(), observers: new Map() };
  const changed: ExposureInput[] = [];
  for (const input of inputs) {
    const old = previous?.inputs.get(input.id);
    // Unchanged copies are reused; the cache never retains a caller's mutable position.
    if (old && equal(old, input)) {
      next.inputs.set(input.id, old);
      continue;
    }
    const { id, position, height, radius, alive, memory, object, feature } = input;
    next.inputs.set(id, {
      id,
      position: { ...position },
      height,
      radius,
      alive,
      memory,
      object,
      feature,
    });
    changed.push(input);
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
