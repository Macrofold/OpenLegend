import { current, isDraft, original } from 'immer';
import { readOnlyDraftView, sensoryDraftWrites } from './draft.js';
import { worldRootEntities } from './entity-index.js';
import { hasMemory } from './living.js';
import { activelyParticipates } from './participation-state.js';
import { visibleFeature } from './perception-frame.js';
import { bodyProfile, spatialMap, worldPosition } from './spatial-state.js';
import type { Entity, Position, WorldState } from './types.js';
import { SpatialCandidateIndex } from './spatial.js';
import { nextSensoryPhase, recordSensoryChange, MAX_CHANGE_SCOPES } from './dependencies.js';
import { countDomainWork } from './diagnostic-counters.js';
import { sensesFor, visionRadius } from './perception.js';
import { capabilityBlocked } from './status-capabilities.js';
import { SPATIAL_LIMITS } from '@open-legend/spatial';
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
  countDomainWork('sensoryCaptures');
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
type Source = ExposureInput & { detail: string; order: number };
interface ObserverInput {
  id: string;
  position: Position;
  order: number;
  radius: number;
  signature: string;
  objectsDirty: boolean;
  people: unknown;
  objects: unknown;
  episodes: unknown;
  contacts: unknown;
}
/** Exact maxima over the finite current dimensions; removal visits distinct dimensions,
 * never every source. Values/counts are derived and may be rebuilt at any time. */
class Dimensions {
  private readonly counts = new Map<number, number>();
  maximum = 0;
  add(value: number) {
    this.counts.set(value, (this.counts.get(value) ?? 0) + 1);
    this.maximum = Math.max(this.maximum, value);
  }
  delete(value: number) {
    const count = this.counts.get(value);
    if (count === undefined) throw new Error('Unregistered sensory dimension.');
    if (count > 1) this.counts.set(value, count - 1);
    else this.counts.delete(value);
    if (value === this.maximum && !this.counts.has(value))
      this.maximum = Math.max(0, ...this.counts.keys());
  }
}
interface ExposureCache {
  owner: object;
  map: object;
  manifest: object;
  policy: object;
  inputs: Map<string, Source>;
  order: Map<string, number>;
  nextOrder: number;
  near: SpatialCandidateIndex<Source>;
  objects: SpatialCandidateIndex<Source>;
  contacts: SpatialCandidateIndex<Source>;
  observerNear: SpatialCandidateIndex<Pick<ObserverInput, 'id' | 'position' | 'order' | 'radius'>>;
  heights: Dimensions;
  radii: Dimensions;
  ranges: Dimensions;
  observers: Map<string, ObserverInput>;
  dirty?: ReturnType<typeof sensoryDraftWrites>;
}
export type EncounterBaseline = Pick<
  WorldState,
  'visiblePeople' | 'visibleObjects' | 'perceptionEpisodes' | 'places' | 'visiblePlaces'
> & { positions: Pick<ReadonlyMap<string, Position>, 'get'>; contacts: Map<string, unknown> };
// Tokens fence ownership without retaining an abandoned draft and its uncommitted records.
const ownerTokens = new WeakMap<object, object>();
function ownerToken(world: object): object {
  let token = ownerTokens.get(world);
  if (!token) ownerTokens.set(world, (token = {}));
  return token;
}
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
const snapshot = <T extends object>(value: T): T => (isDraft(value) ? current(value) : value);
const within = (a: Position, b: Position, radius: number) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= radius;

/** One continuation owns mutable derived indexes. Claiming them invalidates reuse by
 * ancestors/forks immediately; cancellation therefore costs a cold rebuild, never stale data.
 * Only successful finalization binds this ownership to another immutable snapshot. */
export function* prepareExposure(
  world: WorldState,
  base: EncounterBaseline,
): Generator<
  void,
  {
    observers: ExposureCapture[];
    affected: Set<string>;
    changedFeatures: Map<string, string>;
    nearby: (
      position: Position,
      radius: number,
      kind: 'people' | 'objects' | 'contact',
    ) => Source[];
    objectsChanged: (id: string) => boolean;
    maximumBodyHeight: number;
    maximumBodyRadius: number;
  }
> {
  countDomainWork('sensoryPhases');
  const ancestor = isDraft(world) ? original(world)! : world;
  let cache = pending.get(world) ?? caches.get(ancestor);
  const inherited = cache?.owner === ownerToken(ancestor) ? cache.dirty : undefined;
  const audit = sensoryDraftWrites(world);
  if (inherited) {
    for (const id of inherited.sources) recordSensoryChange(world, id);
    for (const id of inherited.observers) recordSensoryChange(world, id, true);
    audit.complete &&= inherited.complete;
    audit.overflow ||= inherited.overflow;
  }
  const changes = nextSensoryPhase(world, audit);
  const map = spatialMap(world),
    manifest = snapshot(world.moduleManifest),
    policy = snapshot(world.statusEffectPolicy);
  let rebuild: 'cold' | 'unknown' | 'overflow' | 'policy' | undefined;
  if (!cache || (cache.owner !== ownerToken(ancestor) && cache.owner !== ownerToken(world)))
    rebuild = 'cold';
  else if (!changes.complete) rebuild = changes.rebuildReason;
  else if (
    cache.map !== map ||
    cache.manifest !== manifest ||
    cache.policy !== policy ||
    !Object.isFrozen(map) ||
    !Object.isFrozen(manifest) ||
    !Object.isFrozen(policy)
  )
    rebuild = 'policy';
  if (rebuild) {
    const counter = {
      cold: 'sensoryColdRebuilds',
      unknown: 'sensoryUnknownRebuilds',
      overflow: 'sensoryOverflowRebuilds',
      policy: 'sensoryPolicyRebuilds',
    } as const;
    countDomainWork(counter[rebuild]);
    cache = {
      owner: ownerToken(world),
      map,
      manifest,
      policy,
      inputs: new Map(),
      order: new Map(),
      nextOrder: 0,
      near: new SpatialCandidateIndex(),
      objects: new SpatialCandidateIndex(),
      contacts: new SpatialCandidateIndex(1),
      observerNear: new SpatialCandidateIndex(),
      heights: new Dimensions(),
      radii: new Dimensions(),
      ranges: new Dimensions(),
      observers: new Map(),
    };
  }
  const prepared = cache!;
  prepared.owner = ownerToken(world);
  delete prepared.dirty;
  pending.set(world, prepared);
  const previousPositions = new Map<string, Position | undefined>();
  const priorPositions = base.positions;
  if (!rebuild)
    base.positions = {
      get: (id) =>
        previousPositions.has(id) ? previousPositions.get(id) : prepared.inputs.get(id)?.position,
    };
  const affected = new Set<string>(),
    changedFeatures = new Map<string, string>();
  const changed: Source[] = [];
  const update = (id: string, entity: Entity | undefined) => {
    const old = prepared.inputs.get(id);
    const capture = entity ? captureExposure(entity) : null;
    countDomainWork('sensoryComparisons');
    if (capture && equal(old, capture)) return;
    previousPositions.set(id, priorPositions.get(id));
    if (old) {
      changed.push(old);
      prepared.inputs.delete(id);
      prepared.near.delete(id);
      prepared.objects.delete(id);
      prepared.contacts.delete(id);
      prepared.heights.delete(old.height);
      prepared.radii.delete(old.radius);
    }
    if (!capture) {
      if (!entity) prepared.order.delete(id);
      return;
    }
    let order = prepared.order.get(id);
    if (order === undefined) prepared.order.set(id, (order = prepared.nextOrder++));
    const { entity: _entity, ...input } = capture;
    const source: Source = { ...input, position: { ...input.position }, order };
    prepared.inputs.set(id, source);
    if (source.alive) prepared.near.set(source);
    if (source.object) prepared.objects.set(source);
    prepared.contacts.set(source);
    prepared.heights.add(source.height);
    prepared.radii.add(source.radius);
    changed.push(source);
    countDomainWork('sensoryEntriesUpdated');
    if (
      world.perceptionFeatures[id] !== undefined &&
      world.perceptionFeatures[id] !== source.feature
    )
      changedFeatures.set(id, source.detail);
  };
  if (rebuild) {
    const roots = worldRootEntities(world, true, true);
    for (let i = 0; i < roots.length; i++) {
      if (i % 64 === 0) yield;
      const entity = roots[i]!;
      prepared.order.set(entity.id, prepared.nextOrder++);
      update(entity.id, entity);
      countDomainWork('sensoryRebuildEntries');
    }
  } else {
    const entities = readOnlyDraftView(world.entities);
    let index = 0;
    for (const id of new Set([...changes.sources, ...changes.observers])) {
      if (index++ % 64 === 0) yield;
      update(id, entities[id]);
    }
  }
  // Observer participation is maintained by changed source IDs. Rebuilds seed the roster.
  const observerIds = rebuild
    ? prepared.inputs.keys()
    : new Set([...changes.sources, ...changes.observers]);
  for (const id of observerIds) {
    const source = prepared.inputs.get(id);
    if (source?.alive && source.memory) {
      if (!prepared.observers.has(id))
        prepared.observers.set(id, {
          id,
          position: source.position,
          order: source.order,
          radius: 0,
          signature: '',
          objectsDirty: true,
          people: undefined,
          objects: undefined,
          episodes: undefined,
          contacts: undefined,
        });
    } else {
      const prior = prepared.observers.get(id);
      if (prior) {
        if (prior.signature) prepared.ranges.delete(prior.radius);
        prepared.observerNear.delete(id);
        prepared.observers.delete(id);
      }
    }
  }
  const observers: ExposureCapture[] = [];
  let observerIndex = 0;
  for (const input of [...prepared.observers.values()].sort((a, b) => a.order - b.order)) {
    if (observerIndex++ % 64 === 0) yield;
    const source = prepared.inputs.get(input.id)!;
    const entity = readOnlyDraftView(world.entities)[input.id]!;
    const radius = visionRadius(world, entity),
      touch = sensesFor(world, entity).find((s) => s.implementation === 'body-contact-v1');
    const contactRadius =
      Math.max(source.radius + prepared.radii.maximum, source.height, prepared.heights.maximum) +
      SPATIAL_LIMITS.epsilon;
    const range = Math.max(radius + 2, touch ? contactRadius : 0);
    const signature = `${radius}:${bodyProfile(entity).eyeHeight}:${touch?.id ?? ''}:${contactRadius}:${capabilityBlocked(world, entity, 'perception')}:${world.moduleManifest.revision}`;
    const moved = !within(input.position, source.position, 0);
    if (
      rebuild ||
      moved ||
      signature !== input.signature ||
      changes.observers.has(input.id) ||
      input.people !== base.visiblePeople?.[input.id] ||
      input.objects !== base.visibleObjects?.[input.id] ||
      input.episodes !== base.perceptionEpisodes?.[input.id] ||
      input.contacts !== base.contacts.get(input.id)
    ) {
      affected.add(input.id);
      input.objectsDirty ||=
        moved || signature !== input.signature || input.objects !== base.visibleObjects?.[input.id];
    }
    const changedRange = !input.signature || input.radius !== range;
    if (changedRange) {
      if (input.signature) prepared.ranges.delete(input.radius);
      prepared.ranges.add(range);
    }
    input.radius = range;
    input.signature = signature;
    input.position = source.position;
    if (moved || rebuild || changedRange)
      prepared.observerNear.set({
        id: input.id,
        position: input.position,
        order: input.order,
        radius: input.radius,
      });
    observers.push({ ...source, entity });
  }
  // A rebuild already selected every observer; reverse queries would duplicate the
  // complete first-exposure work without changing its required audience.
  for (let i = 0; !rebuild && i < changed.length; i++) {
    if (i % 64 === 0) yield;
    const source = changed[i]!;
    for (const observer of prepared.observerNear.query(source.position, prepared.ranges.maximum))
      if (within(source.position, observer.position, observer.radius)) {
        affected.add(observer.id);
        if (source.object) prepared.observers.get(observer.id)!.objectsDirty = true;
      }
  }
  countDomainWork('sensoryObserversSelected', affected.size);
  // Maintain the existing saved outward baseline only for sources this phase evaluated.
  if (rebuild) {
    const values = Object.fromEntries([...prepared.inputs.values()].map((s) => [s.id, s.feature]));
    if (
      Object.keys(values).length !== Object.keys(world.perceptionFeatures).length ||
      Object.entries(values).some(([id, feature]) => world.perceptionFeatures[id] !== feature)
    )
      world.perceptionFeatures = values;
  } else
    for (const id of previousPositions.keys()) {
      const source = prepared.inputs.get(id);
      if (!source) delete world.perceptionFeatures[id];
      else if (world.perceptionFeatures[id] !== source.feature)
        world.perceptionFeatures[id] = source.feature;
    }
  return {
    observers,
    affected,
    changedFeatures,
    maximumBodyHeight: prepared.heights.maximum,
    maximumBodyRadius: prepared.radii.maximum,
    objectsChanged: (id) => prepared.observers.get(id)?.objectsDirty ?? true,
    nearby: (position, radius, kind) =>
      (kind === 'contact'
        ? prepared.contacts
        : kind === 'objects'
          ? prepared.objects
          : prepared.near
      )
        .query(position, radius)
        .filter(
          (source) => kind === 'contact' || (kind === 'people' ? source.alive : source.object),
        ),
  };
}
export function captureExposureCache(world: WorldState): (result: WorldState) => void {
  const ancestor = isDraft(world) ? original(world)! : world;
  const evaluated = pending.get(world);
  const cache = evaluated ?? caches.get(ancestor);
  const audit = sensoryDraftWrites(world);
  if (cache?.dirty && !evaluated) {
    audit.complete &&= cache.dirty.complete;
    audit.overflow ||= cache.dirty.overflow;
    for (const [target, ids] of [
      [audit.sources, cache.dirty.sources],
      [audit.observers, cache.dirty.observers],
    ] as const)
      for (const id of ids) {
        if (audit.overflow) break;
        if (!target.has(id) && audit.sources.size + audit.observers.size === MAX_CHANGE_SCOPES)
          audit.overflow = true;
        else target.add(id);
      }
    if (audit.overflow) {
      audit.sources.clear();
      audit.observers.clear();
    }
  }
  pending.delete(world);
  return (result) => {
    if (!cache || (cache.owner !== ownerToken(world) && cache.owner !== ownerToken(ancestor)))
      return;
    cache.owner = ownerToken(result);
    cache.dirty = audit;
    if (evaluated)
      for (const [id, input] of cache.observers) {
        input.people = result.visiblePeople?.[id];
        input.objects = result.visibleObjects?.[id];
        input.episodes = result.perceptionEpisodes?.[id];
        input.contacts = result.entities[id]?.actor?.contacts;
        input.objectsDirty = false;
      }
    caches.set(result, cache);
  };
}
/** Phase baselines copy only observer bindings. Source positions are read through a
 * phase-local old-value overlay established before changed entries replace their bins. */
export function snapshotEncounters(world: WorldState): EncounterBaseline {
  const ancestor = isDraft(world) ? original(world)! : world;
  const evaluated = pending.get(world);
  const cache = evaluated ?? caches.get(ancestor);
  const available =
    cache && (cache.owner === ownerToken(world) || cache.owner === ownerToken(ancestor))
      ? cache
      : undefined;
  // Deferred unknown/overflow writes can move an unlisted source before this baseline.
  // Rebuild starting positions too, or a stationary contact would appear to be moving.
  const knownPositions =
    available && available.dirty?.complete !== false && !available.dirty?.overflow;
  const result: EncounterBaseline = {
    places: snapshot(world.places),
    ...(world.visiblePlaces ? { visiblePlaces: snapshot(world.visiblePlaces) } : {}),
    positions: knownPositions
      ? {
          get: (id) => {
            if (available.dirty?.sources.has(id) || available.dirty?.observers.has(id)) {
              const entity = readOnlyDraftView(world.entities)[id];
              return entity?.placement?.mode === 'world' ? { ...worldPosition(entity) } : undefined;
            }
            return available.inputs.get(id)?.position;
          },
        }
      : new Map(
          worldRootEntities(world, true, true).map((entity) => [
            entity.id,
            { ...worldPosition(entity) },
          ]),
        ),
    contacts: new Map(),
    ...(world.visiblePeople ? { visiblePeople: snapshot(world.visiblePeople) } : {}),
    ...(world.visibleObjects ? { visibleObjects: snapshot(world.visibleObjects) } : {}),
    ...(world.perceptionEpisodes ? { perceptionEpisodes: snapshot(world.perceptionEpisodes) } : {}),
  };
  for (const id of available?.observers.keys() ?? Object.keys(world.entities)) {
    const contacts = world.entities[id]?.actor?.contacts;
    result.contacts.set(id, contacts ? snapshot(contacts) : contacts);
    const input = available?.observers.get(id);
    if (input && evaluated) {
      input.people = result.visiblePeople?.[id];
      input.objects = result.visibleObjects?.[id];
      input.episodes = result.perceptionEpisodes?.[id];
      input.contacts = result.contacts.get(id);
      input.objectsDirty = false;
    }
  }
  return result;
}
