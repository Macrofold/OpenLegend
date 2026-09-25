import { DEFAULT_SENSES, PERCEPTION_RULES } from './worlds/base/senses.js';
import { capabilityBlocked } from './status-capabilities.js';
import {
  BoundsIndex,
  canWalkSegment,
  clearSegment,
  distance3D,
  resolveSupport,
  soundTransmission,
  SPATIAL_LIMITS,
  type SurfacePoint,
} from '@open-legend/spatial';
import {
  acousticExposure,
  acousticReach,
  type AcousticExposure,
  SPEECH_VOLUMES,
  type SpeechVolume,
} from './acoustics.js';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { current, isDraft } from 'immer';
import { distance } from './spatial.js';
import { hasMemory } from './living.js';
import type { Entity, Position, WorldState } from './types.js';

export { PERCEPTION_RULES } from './worlds/base/senses.js';
/** Reviewed detector versions are pinned in each world's resolved manifest. */
export const SENSE_IMPLEMENTATIONS = [
  'vision-geometry-v1',
  'hearing-db-v1',
  'body-contact-v1',
] as const;
export type SenseImplementation = (typeof SENSE_IMPLEMENTATIONS)[number];
export type SenseDefinition = { id: string; version: 1 } & (
  | { implementation: 'vision-geometry-v1'; radius: number; acquisitionIntervalSeconds?: number }
  | { implementation: 'body-contact-v1'; radius: number }
  | { implementation: 'hearing-db-v1'; hearingFloorDbSpl: number }
);
export { DEFAULT_SENSES } from './worlds/base/senses.js';
export const COARSE_TOUCH: SenseDefinition = {
  id: 'contact:touch',
  version: 1,
  implementation: 'body-contact-v1',
  radius: 0,
};
/** Body profiles are upright cylinders; contact uses their surfaces, never a sense radius.
 * docs/spatial-world.md#physical-contact */
export function bodiesTouch(first: Entity, second: Entity): boolean {
  if (first.id === second.id) return false;
  const a = bodyProfile(first),
    b = bodyProfile(second);
  const tolerance = SPATIAL_LIMITS.epsilon;
  const reach = a.radius + b.radius + tolerance;
  return (
    (first.position.x - second.position.x) ** 2 + (first.position.z - second.position.z) ** 2 <=
      reach ** 2 &&
    first.position.y <= second.position.y + b.height + tolerance &&
    second.position.y <= first.position.y + a.height + tolerance
  );
}
export interface ContactEpisode {
  id: string;
  senseId: string;
  detail: 'present' | 'moving';
  enteredAt: number;
  changedAt: number;
}
export interface ContactView {
  id: string;
  senseId: string;
  text: string;
  recognized: false;
  detail: 'present' | 'moving';
}
type ResolvedSenses = {
  definitions: SenseDefinition[];
  vision: number;
  hearingFloor: number | null;
  policy: WorldState['moduleManifest']['acoustics'];
  reaches: Record<SpeechVolume, number>;
};
const resolvedSenses = new WeakMap<object, Map<string, ResolvedSenses>>();
function resolveSenses(world: WorldState, entity: Entity): ResolvedSenses {
  // Capture the current definition snapshot; mutable authoring never populates the cache.
  // docs/hearing-and-speech.md#performance-and-invalidation
  const manifest = senseManifest(world);
  const reusable = Object.isFrozen(manifest);
  let byBinding = reusable ? resolvedSenses.get(manifest) : undefined;
  if (!byBinding) {
    byBinding = new Map();
    if (reusable) resolvedSenses.set(manifest, byBinding);
  }
  const bindings = entity.actor?.senses;
  const key = bindings?.join('|') ?? 'default';
  let result = byBinding.get(key);
  if (!result) {
    const ids = bindings ?? manifest.defaultSenses;
    const definitions = manifest.senses.filter((s) => ids.includes(s.id));
    const floor =
      definitions.find((s) => s.implementation === 'hearing-db-v1')?.hearingFloorDbSpl ?? null;
    result = {
      definitions,
      policy: manifest.acoustics,
      reaches: Object.fromEntries(
        SPEECH_VOLUMES.map((volume) => [
          volume,
          floor === null ? 0 : acousticReach(manifest.acoustics, floor, volume),
        ]),
      ) as Record<SpeechVolume, number>,
      vision: definitions.find((s) => s.implementation === 'vision-geometry-v1')?.radius ?? 0,
      hearingFloor: floor,
    };
    byBinding.set(key, result);
  }
  return result;
}
function senseManifest(world: WorldState) {
  return isDraft(world.moduleManifest) ? current(world.moduleManifest) : world.moduleManifest;
}

type Receiver = { entity: Entity; order: number };
type ReceiverTree = Map<SpeechVolume, BoundsIndex<Receiver>>;
const receivers = new WeakMap<object, WeakMap<object, ReceiverTree>>();
/** Conservative full-extent broad phase, not an audience cap. Both foot and ear points are
 * queried so visual-only cues and all body heights survive pruning. Exact perception follows.
 * A current draft snapshot includes moves/spawns/sense edits; only frozen snapshots are reused.
 * docs/hearing-and-speech.md#performance-and-invalidation
 */
export function speechObservers(world: WorldState, source: Entity, volume: SpeechVolume): Entity[] {
  const entities = isDraft(world.entities) ? current(world.entities) : world.entities;
  const manifest = senseManifest(world);
  const reusable = Object.isFrozen(entities) && Object.isFrozen(manifest);
  let byManifest = reusable ? receivers.get(entities) : undefined;
  if (!byManifest) {
    byManifest = new WeakMap();
    if (reusable) receivers.set(entities, byManifest);
  }
  let trees = byManifest.get(manifest);
  if (!trees) byManifest.set(manifest, (trees = new Map()));
  let index = trees.get(volume);
  if (!index) {
    index = new BoundsIndex(
      Object.values(entities).flatMap((entity, order) => {
        if (!hasMemory(entity)) return [];
        const senses = resolveSenses(world, entity);
        const radius = Math.max(0.25, senses.reaches[volume]);
        const p = entity.position;
        const earY = p.y + bodyProfile(entity).earHeight;
        const sight = senses.vision;
        const reach = Math.max(radius, sight);
        return [
          {
            value: { entity, order },
            bounds: {
              min: { x: p.x - reach, y: Math.min(p.y - sight, earY - radius), z: p.z - reach },
              max: { x: p.x + reach, y: Math.max(p.y + sight, earY + radius), z: p.z + reach },
            },
          },
        ];
      }),
    );
    trees.set(volume, index);
  }
  const foot = source.position,
    ear = soundOrigin(source);
  const found: Receiver[] = [];
  index.visit(
    (b) =>
      [foot, ear].some(
        (p) =>
          p.x >= b.min.x &&
          p.x <= b.max.x &&
          p.y >= b.min.y &&
          p.y <= b.max.y &&
          p.z >= b.min.z &&
          p.z <= b.max.z,
      ),
    (entry) => {
      found.push(entry);
      return false;
    },
  );
  // Keep established event audience order. Tree traversal order is an implementation detail.
  return found.sort((a, b) => a.order - b.order).map((entry) => entry.entity);
}

type AcousticPath = { position: Position; ear: number; transmission: number };
type AcousticSource = { position: Position; ear: number; targets: Map<string, AcousticPath> };
const acousticPaths = new WeakMap<WorldState['map'], Map<string, AcousticSource>>();
const ACOUSTIC_CACHE = { sources: 256, targets: 256 } as const;
/** Reuse only ordered geometric crossings, never listener evidence or its permissions.
 * Cache bounds limit memory, not exposure; misses always take the full physical path.
 */
function speechTransmission(world: WorldState, listener: Entity, source: Entity): number {
  const map = spatialMap(world);
  const from = isDraft(listener.position) ? current(listener.position) : listener.position;
  const to = isDraft(source.position) ? current(source.position) : source.position;
  const fromEar = bodyProfile(listener).earHeight,
    toEar = bodyProfile(source).earHeight;
  let cache: Map<string, AcousticPath> | undefined;
  if (Object.isFrozen(map) && Object.isFrozen(from) && Object.isFrozen(to)) {
    let observers = acousticPaths.get(map);
    if (!observers) acousticPaths.set(map, (observers = new Map()));
    let entry = observers.get(listener.id);
    if (!entry || entry.position !== from || entry.ear !== fromEar) {
      if (!entry && observers.size >= ACOUSTIC_CACHE.sources)
        observers.delete(observers.keys().next().value!);
      entry = { position: from, ear: fromEar, targets: new Map() };
      observers.set(listener.id, entry);
    }
    cache = entry.targets;
    const prior = cache.get(source.id);
    if (prior?.position === to && prior.ear === toEar) return prior.transmission;
  }
  const transmission = soundTransmission(
    map,
    { x: from.x, y: from.y + fromEar, z: from.z },
    { x: to.x, y: to.y + toEar, z: to.z },
  );
  if (cache && (cache.has(source.id) || cache.size < ACOUSTIC_CACHE.targets))
    cache.set(source.id, { position: to, ear: toEar, transmission });
  return transmission;
}
export function sensesFor(world: WorldState, entity: Entity): SenseDefinition[] {
  return capabilityBlocked(world, entity, 'perception')
    ? []
    : resolveSenses(world, entity).definitions;
}
export function visionRadius(world: WorldState, entity: Entity): number {
  if (capabilityBlocked(world, entity, 'perception')) return 0;
  return resolveSenses(world, entity).vision;
}
interface SightTarget {
  id: string;
  position: Position;
  height: number;
}
interface SightResult {
  height: number;
  seen: boolean;
}
interface ObserverSight {
  from: Position;
  radius: number;
  eyeHeight: number;
  targets: Map<Position, SightResult>;
}
// Bounded memoization only, never an exposure limit. Uncached targets use exact geometry.
const SIGHT_CACHE_LIMITS = { observers: 128, targets: 512 } as const;
const visibility = new WeakMap<WorldState['map'], Map<string, ObserverSight>>();
/** Bind one stable sensing boundary instead of rereading an observer's Immer proxies per target.
 * Cache only frozen transforms/maps: draft edits and mutable authoring data must query live geometry.
 * Radius and both body anchors participate in reuse; future senses must add their own dependencies.
 */
export function visionQuery(world: WorldState, observer: Entity): (source: SightTarget) => boolean {
  if (capabilityBlocked(world, observer, 'perception')) return () => false;
  return unblockedVisionQuery(world, observer);
}
function unblockedVisionQuery(
  world: WorldState,
  observer: Entity,
): (source: SightTarget) => boolean {
  const radius = resolveSenses(world, observer).vision;
  const from = isDraft(observer.position) ? current(observer.position) : observer.position;
  const eyeHeight = bodyProfile(observer).eyeHeight;
  const eye = { x: from.x, y: from.y + eyeHeight, z: from.z };
  const observerId = observer.id;
  const map = spatialMap(world);
  let cached: Map<Position, SightResult> | undefined;
  if (Object.isFrozen(map) && Object.isFrozen(from)) {
    let observers = visibility.get(map);
    if (!observers) visibility.set(map, (observers = new Map()));
    let entry = observers.get(observerId);
    if (entry?.from !== from || entry.radius !== radius || entry.eyeHeight !== eyeHeight) {
      if (!entry && observers.size >= SIGHT_CACHE_LIMITS.observers)
        observers.delete(observers.keys().next().value!);
      entry = { from, radius, eyeHeight, targets: new Map() };
      observers.set(observerId, entry);
    }
    cached = entry.targets;
  }
  return (source) => {
    const p = source.position;
    if (radius <= 0 || distance(from, p) > radius) return false;
    if (source.id === observerId) return true;
    const reusable = Object.isFrozen(p) ? cached : undefined;
    const old = reusable?.get(p);
    if (old && old.height === source.height) return old.seen;
    // Extent samples provide coarse exposure, not recognition or private-state disclosure.
    const seen = [0.85, 0.5, 0.15].some((fraction) =>
      clearSegment(map, eye, { x: p.x, y: p.y + source.height * fraction, z: p.z }),
    );
    // Keep the admitted stable transforms when a dense scan exceeds capacity. Evicting
    // its first entry on every miss makes a 513-target scan miss all 512 entries forever.
    // docs/performance.md#simulation-cpu-and-growing-history
    if (reusable && (reusable.has(p) || reusable.size < SIGHT_CACHE_LIMITS.targets)) {
      reusable.set(p, { height: source.height, seen });
    }
    return seen;
  };
}
export function seesEntity(world: WorldState, observer: Entity, source: Entity): boolean {
  return visionQuery(
    world,
    observer,
  )({
    id: source.id,
    position: isDraft(source.position) ? current(source.position) : source.position,
    height: bodyProfile(source).height,
  });
}
export function soundOrigin(entity: Entity): Position {
  return { ...entity.position, y: entity.position.y + bodyProfile(entity).earHeight };
}
export function hearingReferenceRadius(world: WorldState, observer: Entity): number {
  const { hearingFloor: floor, policy } = resolveSenses(world, observer);
  return floor === null ? 0 : acousticReach(policy, floor, 'normal', policy.thresholdsDb.clear);
}
function physicalSpeechExposure(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume = 'normal',
): AcousticExposure {
  const { hearingFloor: floor, policy, reaches } = resolveSenses(world, observer);
  const silent: AcousticExposure = {
    detail: 'undetected',
    receivedLevelDbSpl: null,
    clarityMarginDb: null,
  };
  if (floor === null) return silent;
  const listener = soundOrigin(observer),
    origin = soundOrigin(source);
  const separation = distance3D(listener, origin);
  // Cheap rejection precedes all barrier work; listener sensitivity is part of this bound.
  if (separation > Math.max(0.25, reaches[volume])) return silent;
  return acousticExposure(
    policy,
    floor,
    volume,
    separation,
    speechTransmission(world, observer, source),
  );
}
export function speechExposure(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume = 'normal',
): AcousticExposure {
  if (capabilityBlocked(world, observer, 'perception'))
    return { detail: 'undetected', receivedLevelDbSpl: null, clarityMarginDb: null };
  return physicalSpeechExposure(world, observer, source, volume);
}
/** One synchronous listener query owns permission plus both sensory channels. It may be
 * reused for the intended recipient in this same utterance, not across world changes.
 * docs/hearing-and-speech.md#performance-and-invalidation */
export function speechPerception(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume,
) {
  if (capabilityBlocked(world, observer, 'perception')) return null;
  const sight = unblockedVisionQuery(world, observer);
  const sees = (entity: Entity) =>
    sight({
      id: entity.id,
      position: isDraft(entity.position) ? current(entity.position) : entity.position,
      height: bodyProfile(entity).height,
    });
  return { detail: physicalSpeechExposure(world, observer, source, volume).detail, sees };
}
/** Conversation continuity ignores temporary incapacity; it never grants heard evidence. */
export function withinHearingRange(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume = 'normal',
): boolean {
  return physicalSpeechExposure(world, observer, source, volume).detail !== 'undetected';
}
/** Eligibility helpers retain the strong meaning of understanding ordinary speech.
 * Detection/partial evidence is delivered separately at emission, never through this boolean. */
export function hearsEntity(world: WorldState, observer: Entity, source: Entity): boolean {
  return speechExposure(world, observer, source).detail === 'clear';
}
export function contactViews(entity: Entity): ContactView[] {
  return Object.values(entity.actor?.contacts ?? {}).map((c) => ({
    id: c.id,
    senseId: c.senseId,
    recognized: false,
    detail: c.detail,
    text:
      c.detail === 'moving'
        ? 'I feel an unidentified moving contact.'
        : 'I feel an unidentified contact.',
  }));
}
/** A blind actor can probe locally, not consult the world's hidden route graph.
 * Contact identification and learned-route planning remain EWF05/AG work; see
 * docs/extensible-world-examples.md#ex02--blind-creatures-that-sense-only-by-touch. */
export function directProbe(
  world: WorldState,
  from: Position,
  to: Position,
  fromSurfaceId?: string,
  toSurfaceId?: string,
): SurfacePoint[] | null {
  const map = spatialMap(world),
    a = resolveSupport(map, from, fromSurfaceId),
    b = resolveSupport(map, to, toSurfaceId);
  if (!a || !b || distance(from, to) > 1 || !canWalkSegment(map, a, b)) return null;
  return [{ ...b }];
}
// Position-only helpers retain the default geometry for callers that do not have a receiver.
export function canSee(from: Position, to: Position): boolean {
  return distance(from, to) <= PERCEPTION_RULES.sightRadius;
}
export function canHear(world: WorldState, from: Position, to: Position): boolean {
  const policy = world.moduleManifest.acoustics;
  const separation = distance3D(from, to);
  if (separation > Math.max(0.25, acousticReach(policy, 0, 'normal', policy.thresholdsDb.clear)))
    return false;
  return (
    acousticExposure(
      policy,
      0,
      'normal',
      separation,
      soundTransmission(spatialMap(world), from, to),
    ).detail === 'clear'
  );
}
