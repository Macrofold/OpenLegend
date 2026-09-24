import { DEFAULT_SENSES, PERCEPTION_RULES } from './worlds/base/senses.js';
import { capabilityBlocked } from './status-capabilities.js';
import {
  canWalkSegment,
  clearSegment,
  distance3D,
  resolveSupport,
  soundTransmission,
  type SurfacePoint,
} from '@open-legend/spatial';
import {
  acousticExposure,
  acousticReach,
  type AcousticExposure,
  type SpeechVolume,
} from './acoustics.js';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { current, isDraft, original } from 'immer';
import { distance } from './spatial.js';
import type { Entity, Position, WorldState } from './types.js';

export { PERCEPTION_RULES } from './worlds/base/senses.js';
/** Reviewed detector versions are pinned in each world's resolved manifest. */
export const SENSE_IMPLEMENTATIONS = [
  'vision-geometry-v1',
  'hearing-db-v1',
  'contact-proximity-v1',
] as const;
export type SenseImplementation = (typeof SENSE_IMPLEMENTATIONS)[number];
export type SenseDefinition = { id: string; version: 1 } & (
  | { implementation: 'vision-geometry-v1'; radius: number }
  | { implementation: 'contact-proximity-v1'; radius: number }
  | { implementation: 'hearing-db-v1'; hearingFloorDbSpl: number }
);
export { DEFAULT_SENSES } from './worlds/base/senses.js';
export const COARSE_TOUCH: SenseDefinition = {
  id: 'contact:touch',
  version: 1,
  implementation: 'contact-proximity-v1',
  radius: 0.8,
};
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
};
const resolvedSenses = new WeakMap<object, Map<string, ResolvedSenses>>();
function resolveSenses(world: WorldState, entity: Entity): ResolvedSenses {
  // Installed definitions/bindings are replaced, never edited in-place during a tick.
  // Reuse immutable resolution across drafts: docs/performance.md#simulation-cpu-and-growing-history.
  const manifest = isDraft(world.moduleManifest)
    ? original(world.moduleManifest!)!
    : world.moduleManifest!;
  let byBinding = resolvedSenses.get(manifest);
  if (!byBinding) resolvedSenses.set(manifest, (byBinding = new Map()));
  const bindings = entity.actor?.senses;
  const key = bindings?.join('|') ?? 'default';
  let result = byBinding.get(key);
  if (!result) {
    const ids = bindings ?? manifest.defaultSenses;
    const definitions = manifest.senses.filter((s) => ids.includes(s.id));
    result = {
      definitions,
      vision: definitions.find((s) => s.implementation === 'vision-geometry-v1')?.radius ?? 0,
      hearingFloor:
        definitions.find((s) => s.implementation === 'hearing-db-v1')?.hearingFloorDbSpl ?? null,
    };
    byBinding.set(key, result);
  }
  return result;
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
  const radius = visionRadius(world, observer);
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
  const floor = resolveSenses(world, observer).hearingFloor;
  return floor === null
    ? 0
    : acousticReach(
        world.moduleManifest.acoustics,
        floor,
        'normal',
        world.moduleManifest.acoustics.thresholdsDb.clear,
      );
}
function physicalSpeechExposure(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume = 'normal',
): AcousticExposure {
  const floor = resolveSenses(world, observer).hearingFloor;
  const silent: AcousticExposure = {
    detail: 'undetected',
    receivedLevelDbSpl: null,
    clarityMarginDb: null,
  };
  if (floor === null) return silent;
  const listener = soundOrigin(observer),
    origin = soundOrigin(source);
  const separation = distance3D(listener, origin),
    policy = world.moduleManifest.acoustics;
  // Cheap rejection precedes all barrier work; listener sensitivity is part of this bound.
  if (separation > Math.max(0.25, acousticReach(policy, floor, volume))) return silent;
  return acousticExposure(
    policy,
    floor,
    volume,
    separation,
    soundTransmission(spatialMap(world), listener, origin),
  );
}
export function speechExposure(
  world: WorldState, observer: Entity, source: Entity, volume: SpeechVolume = 'normal',
): AcousticExposure {
  if (capabilityBlocked(world, observer, 'perception'))
    return { detail: 'undetected', receivedLevelDbSpl: null, clarityMarginDb: null };
  return physicalSpeechExposure(world, observer, source, volume);
}
/** Conversation continuity ignores temporary incapacity; it never grants heard evidence. */
export function withinHearingRange(
  world: WorldState, observer: Entity, source: Entity, volume: SpeechVolume = 'normal',
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
