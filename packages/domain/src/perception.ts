import { readOnlyDraftView } from './draft.js';
import { assemblyShapes } from './assembly-geometry.js';
import { canonicalJson, contentLabel } from './events.js';
import { isImmutableData } from './records.js';
import { entityGet, entityValues } from './entity-collection.js';
import { countDomainWork } from './diagnostic-counters.js';
import { chargeWork } from './work-budget.js';
import { worldPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { DEFAULT_SENSES, PERCEPTION_RULES } from './worlds/base/senses.js';
import { capabilityBlocked } from './status-capabilities.js';
import {
  BoundsIndex,
  canWalkSegment,
  clearSegment,
  createSightProbe,
  horizontalCone,
  distance3D,
  resolveSupport,
  soundTransmission,
  SPATIAL_LIMITS,
  type SurfacePoint,
  type SightRay,
} from '@open-legend/spatial';
import {
  acousticExposure,
  acousticExposureAtLevel,
  acousticReach,
  acousticReachAtLevel,
  type AcousticExposure,
  SPEECH_VOLUMES,
  type SpeechVolume,
} from './acoustics.js';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { current, isDraft } from 'immer';
import { distance } from './spatial.js';
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
  | {
      implementation: 'vision-geometry-v1';
      routineTiming: 'boundary' | 'cadence';
      radius: number;
      sampleSeconds?: number;
      fieldOfViewRadians?: number;
    }
  | {
      implementation: 'body-contact-v1';
      radius: number;
      awarenessTiming: 'crossing' | 'sampled';
      sampleSeconds?: number;
    }
  | { implementation: 'hearing-db-v1'; hearingFloorDbSpl: number }
);
export { DEFAULT_SENSES } from './worlds/base/senses.js';
export const COARSE_TOUCH: SenseDefinition = {
  id: 'contact:touch',
  version: 1,
  implementation: 'body-contact-v1',
  awarenessTiming: 'crossing',
  radius: 0,
};
/** Body profiles are upright cylinders; contact uses their surfaces, never a sense radius.
 * docs/spatial-world.md#physical-contact */
export function bodiesTouch(first: Entity, second: Entity): boolean {
  chargeWork({ tests: 1 });
  if (first.id === second.id || !activelyParticipates(first) || !activelyParticipates(second))
    return false;
  const a = bodyProfile(first),
    b = bodyProfile(second),
    from = worldPosition(first),
    to = worldPosition(second);
  const tolerance = SPATIAL_LIMITS.epsilon;
  const reach = a.radius + b.radius + tolerance;
  return (
    (from.x - to.x) ** 2 + (from.z - to.z) ** 2 <= reach ** 2 &&
    from.y <= to.y + b.height + tolerance &&
    to.y <= from.y + a.height + tolerance
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
  visionAngle: number;
  visionCadence?: number;
  routine: RoutineSensePolicy;
  hearingFloor: number | null;
  policy: WorldState['moduleManifest']['acoustics'];
  reaches: Record<SpeechVolume, number>;
};
export interface RoutineSensePolicy {
  sight?: { key: string; mode: 'boundary' | 'cadence'; seconds?: number };
  contact?: { key: string; mode: 'crossing' | 'sampled'; seconds?: number };
}
const resolvedSenses = new WeakMap<object, Map<string, ResolvedSenses>>();
const senseBindingKeys = new WeakMap<object, string>();
function resolveSenses(world: WorldState, entity: Entity): ResolvedSenses {
  // Capture the current definition snapshot; mutable authoring never populates the cache.
  // docs/hearing-and-speech.md#performance-and-invalidation
  const manifest = senseManifest(world);
  const reusable = isImmutableData(manifest);
  let byBinding = reusable ? resolvedSenses.get(manifest) : undefined;
  if (!byBinding) {
    byBinding = new Map();
    if (reusable) resolvedSenses.set(manifest, byBinding);
  }
  const bindings = entity.actor?.senses;
  const stableBindings = bindings && readOnlyDraftView(bindings);
  let key = stableBindings ? senseBindingKeys.get(stableBindings) : '';
  if (key === undefined) {
    key = JSON.stringify(stableBindings);
    if (isImmutableData(stableBindings)) senseBindingKeys.set(stableBindings!, key);
  }
  let result = byBinding.get(key);
  if (!result) {
    const ids = bindings ?? manifest.defaultSenses;
    const definitions = manifest.senses.filter((s) => ids.includes(s.id));
    const floor =
      definitions.find((s) => s.implementation === 'hearing-db-v1')?.hearingFloorDbSpl ?? null;
    const vision = definitions.find((s) => s.implementation === 'vision-geometry-v1');
    const contact = definitions.find((s) => s.implementation === 'body-contact-v1');
    const routine: RoutineSensePolicy = {
      sight: vision && {
        key: contentLabel(
          canonicalJson(definitions.filter((s) => s.implementation === 'vision-geometry-v1')),
        ),
        mode: vision.routineTiming,
        seconds: vision.sampleSeconds,
      },
      contact: contact && {
        key: contentLabel(
          canonicalJson(definitions.filter((s) => s.implementation === 'body-contact-v1')),
        ),
        mode: contact.awarenessTiming,
        seconds: contact.sampleSeconds,
      },
    };
    if (reusable) Object.freeze(definitions);
    result = {
      definitions,
      policy: manifest.acoustics,
      reaches: Object.fromEntries(
        SPEECH_VOLUMES.map((volume) => [
          volume,
          floor === null ? 0 : acousticReach(manifest.acoustics, floor, volume),
        ]),
      ) as Record<SpeechVolume, number>,
      vision: vision?.radius ?? 0,
      visionAngle: vision?.fieldOfViewRadians ?? 2 * Math.PI,
      visionCadence: vision?.sampleSeconds,
      routine,
      hearingFloor: floor,
    };
    byBinding.set(key, result);
  }
  return result;
}
function senseManifest(world: WorldState) {
  return isDraft(world.moduleManifest) ? current(world.moduleManifest) : world.moduleManifest;
}

type Receiver = {
  id: string;
  order: number;
  position: Position;
  ear: number;
  senses: ResolvedSenses;
};
type ReceiverIndex = {
  entries: Receiver[];
  trees: Map<SpeechVolume, BoundsIndex<Receiver>>;
};
const receivers = new WeakMap<object, WeakMap<object, ReceiverIndex>>();
const latestReceivers = new WeakMap<object, ReceiverIndex>();
/** Cache geometry, never an observer's live permissions or a retained entity snapshot.
 * Health/activity changes invalidate entity records without moving any acoustic bound.
 * Compare the current receiver footprint once before reusing a tree across those changes.
 * Mutable poses still take the uncached path. docs/hearing-and-speech.md#performance-and-invalidation
 */
function receiverIndex(world: WorldState, entities: WorldState['entities']): ReceiverIndex {
  const manifest = senseManifest(world);
  const frozen = Object.isFrozen(entities) && Object.isFrozen(manifest);
  let byManifest = frozen ? receivers.get(entities) : undefined;
  const existing = byManifest?.get(manifest);
  if (existing) return existing;
  const entries: Receiver[] = [];
  for (const entity of entityValues(entities)) {
    if (!entity.actor?.alive || !activelyParticipates(entity)) continue;
    chargeWork({ candidates: 1 });
    entries.push({
      id: entity.id,
      order: entries.length,
      position: worldPosition(entity),
      ear: bodyProfile(entity).earHeight,
      senses: resolveSenses(world, entity),
    });
  }
  const reusable = Object.isFrozen(manifest) && entries.every((e) => Object.isFrozen(e.position));
  const previous = reusable ? latestReceivers.get(manifest) : undefined;
  const same =
    previous?.entries.length === entries.length &&
    entries.every((e, i) => {
      const old = previous.entries[i]!;
      return (
        old.id === e.id &&
        old.position === e.position &&
        old.ear === e.ear &&
        old.senses === e.senses
      );
    });
  const prepared = same ? previous : { entries, trees: new Map() };
  if (reusable) latestReceivers.set(manifest, prepared);
  if (frozen) {
    if (!byManifest) receivers.set(entities, (byManifest = new WeakMap()));
    byManifest.set(manifest, prepared);
  }
  return prepared;
}
/** Conservative full-extent broad phase, not an audience cap. Both foot and ear points are
 * queried so visual-only cues and all body heights survive pruning. Exact perception follows.
 * The result binds IDs back to the current snapshot, never stale eligibility/knowledge.
 * docs/hearing-and-speech.md#performance-and-invalidation
 */
export function speechObservers(world: WorldState, source: Entity, volume: SpeechVolume): Entity[] {
  const entities = isDraft(world.entities) ? current(world.entities) : world.entities;
  const prepared = receiverIndex(world, entities);
  let index = prepared.trees.get(volume);
  if (!index) {
    index = new BoundsIndex(
      prepared.entries.map((entry) => {
        const radius = Math.max(0.25, entry.senses.reaches[volume]);
        const p = entry.position;
        const earY = p.y + entry.ear;
        const sight = entry.senses.vision;
        const reach = Math.max(radius, sight);
        return {
          value: entry,
          bounds: {
            min: { x: p.x - reach, y: Math.min(p.y - sight, earY - radius), z: p.z - reach },
            max: { x: p.x + reach, y: Math.max(p.y + sight, earY + radius), z: p.z + reach },
          },
        };
      }),
    );
    prepared.trees.set(volume, index);
  }
  const foot = worldPosition(source),
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
  // Relative receiver order is unchanged by inserting/removing non-observers.
  return found.sort((a, b) => a.order - b.order).map((entry) => entityGet(entities, entry.id)!);
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
  const listenerPosition = worldPosition(listener),
    sourcePosition = worldPosition(source);
  const from = isDraft(listenerPosition) ? current(listenerPosition) : listenerPosition;
  const to = isDraft(sourcePosition) ? current(sourcePosition) : sourcePosition;
  const fromEar = bodyProfile(listener).earHeight,
    toEar = bodyProfile(source).earHeight;
  let cache: Map<string, AcousticPath> | undefined;
  if (Object.isFrozen(map) && Object.isFrozen(from) && Object.isFrozen(to)) {
    let observers = acousticPaths.get(map);
    if (!observers) acousticPaths.set(map, (observers = new Map()));
    let entry = observers.get(listener.id);
    // Keep admitted listeners when a crowd exceeds capacity. FIFO eviction makes every
    // repeated 257-listener pass miss a 256-entry cache. Uncached listeners still hear exactly.
    if (
      (!entry || entry.position !== from || entry.ear !== fromEar) &&
      (entry || observers.size < ACOUSTIC_CACHE.sources)
    ) {
      entry = { position: from, ear: fromEar, targets: new Map() };
      observers.set(listener.id, entry);
    }
    cache = entry?.targets;
    const prior = cache?.get(source.id);
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
export function visionFieldOfView(world: WorldState, entity: Entity): number {
  return resolveSenses(world, entity).visionAngle;
}
interface SightTarget {
  assemblyId?: string;
  id?: string;
  position: Position;
  height: number;
}
interface SightResult {
  from: Position;
  probe?: ReturnType<typeof createSightProbe>;
  assemblyId?: string;
  position: Position;
  height: number;
  seen: boolean;
}
interface ObserverSight {
  radius: number;
  eyeHeight: number;
  angle: number;
  heading?: number;
  targets: Map<string, SightResult>;
}
// Bounded memoization only, never an exposure limit. Uncached targets use exact geometry.
const SIGHT_CACHE_LIMITS = { observers: 128, targets: 512 } as const;
const visibility = new WeakMap<WorldState['map'], Map<string, ObserverSight>>();
const samePoint = (a: Position, b: Position) => a.x === b.x && a.y === b.y && a.z === b.z;
/** One sample geometry for ordinary sight and predicted fleeting sight. */
export const SIGHT_BODY_FRACTIONS = [0.85, 0.5, 0.15] as const;
/** Bind one stable sensing boundary instead of rereading an observer's Immer proxies per target.
 * Copy scalar transforms, never retain mutable positions or draft entities. Geometry must be frozen.
 * Radius and both body anchors participate in reuse; future senses must add their own dependencies.
 */
export function visionQuery(world: WorldState, observer: Entity): (source: SightTarget) => boolean {
  if (!activelyParticipates(observer) || capabilityBlocked(world, observer, 'perception'))
    return () => false;
  return unblockedVisionQuery(world, observer);
}
/** Installed routine policy, including while perception is temporarily restricted. */
export function routineSensePolicy(world: WorldState, observer: Entity): RoutineSensePolicy {
  return resolveSenses(world, observer).routine;
}
/** Optional authored awareness cadence. Actions and event-time speech still query
 * current geometry; this only schedules routine noticing during clock advancement. */
export function sightSampleSeconds(world: WorldState, observer: Entity): number | undefined {
  return resolveSenses(world, observer).visionCadence;
}
/** Terrain exposure uses the same eye, range and occlusion as ordinary sight.
 * Geometric points have no entity identity and never enter the entity sight cache. */
export function pointVisionQuery(
  world: WorldState,
  observer: Entity,
): (point: Position) => boolean {
  const sees = visionQuery(world, observer);
  return (position) => sees({ position, height: 0 });
}
function sightContext(world: WorldState, observer: Entity) {
  const senses = resolveSenses(world, observer),
    radius = senses.vision,
    angle = senses.visionAngle;
  const position = worldPosition(observer);
  const from = { x: position.x, y: position.y, z: position.z };
  const eyeHeight = bodyProfile(observer).eyeHeight;
  const eye = { x: from.x, y: from.y + eyeHeight, z: from.z };
  const heading = angle < 2 * Math.PI ? observer.spatial.heading : undefined;
  const inCone = horizontalCone(from, heading ?? 0, angle);
  const observerId = observer.id;
  const map = spatialMap(world);
  let cached: Map<string, SightResult> | undefined;
  if (Object.isFrozen(map)) {
    let observers = visibility.get(map);
    if (!observers) visibility.set(map, (observers = new Map()));
    let entry = observers.get(observerId);
    // Stable admission avoids crowd scans evicting every cached observer.
    if (
      (!entry ||
        entry.radius !== radius ||
        entry.eyeHeight !== eyeHeight ||
        entry.angle !== angle ||
        entry.heading !== heading) &&
      (entry || observers.size < SIGHT_CACHE_LIMITS.observers)
    ) {
      entry = { radius, eyeHeight, angle, heading, targets: new Map() };
      observers.set(observerId, entry);
    }
    cached = entry?.targets;
  }
  return { radius, from, eye, observerId, map, cached, inCone };
}
function sameSight(old: SightResult | undefined, source: SightTarget, from: Position): boolean {
  return (
    !!old &&
    samePoint(old.from, from) &&
    old.assemblyId === source.assemblyId &&
    samePoint(old.position, source.position) &&
    old.height === source.height
  );
}
/** Batch only genuinely unresolved geometry; existing pair/open-space/blocker
 * proofs are cheaper than scheduling that work a second time on another thread. */
export function sightPreparationQuery(
  world: WorldState,
  observer: Entity,
): (source: SightTarget) => SightRay | undefined {
  const { radius, from, eye, observerId, cached, inCone } = sightContext(world, observer);
  return (source) => {
    if (source.assemblyId || source.id === observerId || radius <= 0 || !inCone(source.position))
      return;
    const old = source.id === undefined ? undefined : cached?.get(source.id);
    if (sameSight(old, source, from)) return;
    const to = {
      ...source.position,
      y: source.position.y + source.height * SIGHT_BODY_FRACTIONS[0]!,
    };
    if (old?.probe?.known(eye, to) !== undefined) return;
    return { from: eye, to };
  };
}
function unblockedVisionQuery(
  world: WorldState,
  observer: Entity,
): (source: SightTarget) => boolean {
  const { radius, from, eye, observerId, map, cached, inCone } = sightContext(world, observer);
  return (source) => {
    chargeWork({ tests: 1 });
    const p = source.position;
    if (
      radius <= 0 ||
      (!source.assemblyId &&
        (from.x - p.x) ** 2 + (from.y - p.y) ** 2 + (from.z - p.z) ** 2 > radius ** 2)
    )
      return false;
    if (source.id === observerId) return true;
    if (!source.assemblyId && !inCone(p)) return false;
    const old = source.id === undefined ? undefined : cached?.get(source.id);
    if (old && sameSight(old, source, from)) {
      countDomainWork('senseCacheHits');
      return old.seen;
    }
    countDomainWork('senseTests');
    const probe = source.assemblyId ? undefined : (old?.probe ?? createSightProbe(map));
    // Extent samples provide coarse exposure, not recognition or private-state disclosure.
    const structure = source.assemblyId ? entityGet(world.entities, source.assemblyId) : undefined;
    const seen = source.assemblyId
      ? !!structure &&
        assemblyShapes(world, structure).posts.some((solid) =>
          (solid.boxes ?? [solid.bounds]).some((bounds) => {
            const closest = {
                x: Math.max(bounds.min.x, Math.min(bounds.max.x, eye.x)),
                y: Math.max(bounds.min.y, Math.min(bounds.max.y, eye.y)),
                z: Math.max(bounds.min.z, Math.min(bounds.max.z, eye.z)),
              },
              middle = {
                x: (bounds.min.x + bounds.max.x) / 2,
                y: (bounds.min.y + bounds.max.y) / 2,
                z: (bounds.min.z + bounds.max.z) / 2,
              };
            const visible = (point: Position) => {
              chargeWork({ tests: 1 });
              return (
                distance(from, point) <= radius && inCone(point) && clearSegment(map, eye, point)
              );
            };
            if (visible(closest)) return true;
            return (['x', 'y', 'z'] as const).some(
              (axis) =>
                visible({ ...middle, [axis]: bounds.min[axis] }) ||
                visible({ ...middle, [axis]: bounds.max[axis] }),
            );
          }),
        )
      : SIGHT_BODY_FRACTIONS.some((fraction) =>
          probe!(eye, { x: p.x, y: p.y + source.height * fraction, z: p.z }),
        );
    // Keep the admitted stable transforms when a dense scan exceeds capacity. Evicting
    // its first entry on every miss makes a 513-target scan miss all 512 entries forever.
    // docs/performance.md#simulation-cpu-and-growing-history
    if (
      source.id !== undefined &&
      cached &&
      (cached.has(source.id) || cached.size < SIGHT_CACHE_LIMITS.targets)
    ) {
      cached.set(source.id, {
        from,
        ...(probe ? { probe } : {}),
        position: { x: p.x, y: p.y, z: p.z },
        height: source.height,
        seen,
        ...(source.assemblyId ? { assemblyId: source.assemblyId } : {}),
      });
    }
    return seen;
  };
}
export function seesEntity(world: WorldState, observer: Entity, source: Entity): boolean {
  return entityVisionQuery(world, observer)(source);
}
/** Bind once for a read-only query phase. Each target still supplies its current
 * participation, transform and body; do not retain this across observer/geometry changes. */
export function entityVisionQuery(
  world: WorldState,
  observer: Entity,
): (source: Entity) => boolean {
  const sees = visionQuery(world, observer);
  return (source) => {
    if (!activelyParticipates(source)) return false;
    const position = worldPosition(source);
    return sees({
      id: source.id,
      ...(source.assembly?.implementation === 'grounded-panel-boundary'
        ? { assemblyId: source.id }
        : {}),
      position: isDraft(position) ? current(position) : position,
      height: bodyProfile(source).height,
    });
  };
}
export function soundOrigin(entity: Entity): Position {
  const position = worldPosition(entity);
  return { ...position, y: position.y + bodyProfile(entity).earHeight };
}
export function hearingReferenceRadius(world: WorldState, observer: Entity): number {
  const { hearingFloor: floor, policy } = resolveSenses(world, observer);
  return floor === null ? 0 : acousticReach(policy, floor, 'normal', policy.thresholdsDb.clear);
}
/** Readonly display parameters, never new observation tiers. The client may sample
 * only the already-public spatial layout; docs/spatial-world.md#perception-range-guides. */
export function perceptionGuide(world: WorldState, observer: Entity) {
  const body = bodyProfile(observer);
  const { hearingFloor: floor, policy, visionAngle } = resolveSenses(world, observer);
  const enabled =
    activelyParticipates(observer) && !capabilityBlocked(world, observer, 'perception');
  return {
    vision: {
      enabled,
      fieldOfViewRadians: visionAngle,
      ...(visionAngle < 2 * Math.PI ? { heading: observer.spatial.heading } : {}),
      eyeHeight: body.eyeHeight,
      targetHeights: SIGHT_BODY_FRACTIONS.map((fraction) => fraction * body.height),
    },
    hearing: {
      enabled: enabled && floor !== null,
      earHeight: body.earHeight,
      partialRadius:
        floor === null ? 0 : acousticReach(policy, floor, 'normal', policy.thresholdsDb.partial),
      detectionRadius:
        floor === null ? 0 : acousticReach(policy, floor, 'normal', policy.thresholdsDb.detect),
    },
  };
}

export interface AcousticEmission {
  origin: Position;
  sourceLevelDbSplAt1m: number;
  /** The current emitting body, never historical authorship of a detached effect. */
  emitterId?: string;
}
function physicalSoundExposure(
  world: WorldState,
  observer: Entity,
  emission: AcousticEmission,
): AcousticExposure {
  const { hearingFloor: floor, policy } = resolveSenses(world, observer);
  const silent: AcousticExposure = {
    detail: 'undetected',
    receivedLevelDbSpl: null,
    clarityMarginDb: null,
  };
  chargeWork({ tests: 1 });
  if (floor === null || !observer.actor?.alive || !activelyParticipates(observer)) return silent;
  const listener = soundOrigin(observer),
    origin = emission.origin;
  const separation = distance3D(listener, origin);
  const reach = acousticReachAtLevel(policy, floor, emission.sourceLevelDbSplAt1m);
  if (separation > Math.max(0.25, reach)) return silent;
  const emitter = emission.emitterId ? entityGet(world.entities, emission.emitterId) : undefined;
  const actual = emitter && soundOrigin(emitter);
  const transmission =
    emitter && actual && actual.x === origin.x && actual.y === origin.y && actual.z === origin.z
      ? speechTransmission(world, observer, emitter)
      : soundTransmission(spatialMap(world), listener, origin);
  return acousticExposureAtLevel(
    policy,
    floor,
    emission.sourceLevelDbSplAt1m,
    separation,
    transmission,
  );
}
export function speechEmission(
  world: WorldState,
  source: Entity,
  volume: SpeechVolume,
): AcousticEmission {
  return {
    origin: soundOrigin(source),
    emitterId: source.id,
    sourceLevelDbSplAt1m: world.moduleManifest.acoustics.sourceLevelDbSplAt1m[volume],
  };
}
export function speechExposure(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume = 'normal',
): AcousticExposure {
  if (!activelyParticipates(source) || capabilityBlocked(world, observer, 'perception'))
    return { detail: 'undetected', receivedLevelDbSpl: null, clarityMarginDb: null };
  return physicalSoundExposure(world, observer, speechEmission(world, source, volume));
}
/** One synchronous query owns actual contact and sight; consumers reuse this exact result. */
export function soundPerception(world: WorldState, observer: Entity, emission: AcousticEmission) {
  if (
    !observer.actor?.alive ||
    !activelyParticipates(observer) ||
    capabilityBlocked(world, observer, 'perception')
  )
    return null;
  const sight = unblockedVisionQuery(world, observer);
  const sees = (entity: Entity) => {
    if (!activelyParticipates(entity)) return false;
    const position = worldPosition(entity);
    return sight({
      id: entity.id,
      position: isDraft(position) ? current(position) : position,
      height: bodyProfile(entity).height,
    });
  };
  return { ...physicalSoundExposure(world, observer, emission), sees };
}
export function speechPerception(
  world: WorldState,
  observer: Entity,
  source: Entity,
  volume: SpeechVolume,
) {
  return activelyParticipates(source)
    ? soundPerception(world, observer, speechEmission(world, source, volume))
    : null;
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
  fromSurfaceId: string | undefined,
  toSurfaceId: string | undefined,
  body: import('@open-legend/spatial').BodyProfile,
): SurfacePoint[] | null {
  const map = spatialMap(world),
    a = resolveSupport(map, from, fromSurfaceId),
    b = resolveSupport(map, to, toSurfaceId);
  if (!a || !b || distance(from, to) > 1 || !canWalkSegment(map, a, b, body)) return null;
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
