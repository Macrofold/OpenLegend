import {
  bodySurfaceDistance,
  movingBodiesMinimumSeparation,
  type SurfacePoint,
} from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { entityVisionQuery, visionRadius } from './perception.js';
import { nearbyEntities } from './spatial.js';
import { bodyProfile, worldPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { chargeWork } from './work-budget.js';
import { countDomainWork } from './diagnostic-counters.js';
import {
  nativeResponseProfile,
  type NativeDanger,
  type NativeResponseEpisode,
  type NativeResponseProfile,
} from './native-response.js';
import type { Entity, Position, WorldState } from './types.js';

export const nativeBodyDangerKey = (id: string, physicalLife: number): string =>
  JSON.stringify(['body', id, physicalLife]);
export const nativeRegionDangerKey = (
  source: Extract<NativeDanger, { kind: 'region' }>['source'],
): string => JSON.stringify(['region', source.kind, source.id]);

export function nativeDangerUncertainty(
  profile: NativeResponseProfile,
  danger: NativeDanger,
  at: number,
): number {
  if (danger.kind === 'body' && danger.visible) return 0;
  const since = danger.kind === 'body' ? (danger.lostAt ?? danger.observedAt) : danger.observedAt;
  return Math.min(
    profile.maximumUncertainty,
    Math.max(0, at - since) * profile.uncertaintyPerSecond,
  );
}
export function nativeDangerExpiresAt(
  profile: NativeResponseProfile,
  danger: NativeDanger,
): number {
  return danger.kind === 'body' && danger.visible
    ? Infinity
    : (danger.kind === 'body' ? (danger.lostAt ?? danger.observedAt) : danger.observedAt) +
        profile.retentionSeconds;
}

function dangerous(profile: NativeResponseProfile, source: Entity): boolean {
  const actor = source.actor;
  if (!actor?.alive || actor.incapacitated || !activelyParticipates(source)) return false;
  if (
    profile.dangers.species.includes(actor.species ?? '') ||
    (actor.body && profile.dangers.bodyPlans.includes(actor.body.plan))
  )
    return true;
  const action = actor.action;
  return !!(
    profile.dangers.currentNaturalAttack &&
    action?.type === 'strike' &&
    action.stage === 'working' &&
    action.strikePhase !== 'recovery' &&
    actor.naturalStrikeIds?.includes(action.definitionId ?? '')
  );
}
function samePoint(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

export type NativeDangerFrame =
  | { status: 'unavailable'; reason: 'profile-missing' | 'perception-unavailable' }
  | {
      status: 'complete';
      profile: Readonly<NativeResponseProfile>;
      /** Borrowed current native-phase records, never retained across publication. */
      records: ReadonlyArray<{ key: string; danger: Readonly<NativeDanger> }>;
      changed: boolean;
      newlyVisible: readonly string[];
    };

/** One complete animal-scoped exposure read. The shared physical index supplies
 * candidates only; actual sight admits each estimate. No local-density cutoff or
 * retained-history scan can substitute for completeness.
 * docs/worlds/base/animal-responses.md#potential-dangers-during-an-alarm */
export function reconcileNativeDangers(
  world: WorldState,
  observer: Entity,
  episode: NativeResponseEpisode,
  candidates?: Iterable<Entity>,
): NativeDangerFrame {
  const profile = nativeResponseProfile(world, episode.profilePin);
  if (!profile) return { status: 'unavailable', reason: 'profile-missing' };
  const radius = visionRadius(world, observer);
  const complete =
    radius > 0 &&
    activelyParticipates(observer) &&
    !capabilityBlocked(world, observer, 'perception');
  const sees = entityVisionQuery(world, observer);
  const previous = Object.entries(episode.dangers);
  const visible = new Set<string>();
  const visiblyEnded = new Set<string>();
  const newlyVisible: string[] = [];
  let changed = false;
  countDomainWork('nativeResponseDangerQueries');
  for (const source of complete
    ? (candidates ?? nearbyEntities(world, worldPosition(observer), radius))
    : []) {
    countDomainWork('nativeResponseDangerCandidates');
    chargeWork({ tests: 1 });
    if (source.id === observer.id || !source.actor) continue;
    if (!source.actor.alive || source.actor.incapacitated) {
      // A departed person's corpse is the real old body, with its original life;
      // the new living identity is not evidence that the old body became safe.
      const key = nativeBodyDangerKey(
        source.remains?.sourceId ?? source.id,
        source.actor.physicalLife ?? 0,
      );
      if (episode.dangers[key]?.kind === 'body' && sees(source)) visiblyEnded.add(key);
      continue;
    }
    if (!dangerous(profile, source) || !sees(source)) continue;
    const physicalLife = source.actor!.physicalLife ?? 0;
    const key = nativeBodyDangerKey(source.id, physicalLife);
    visible.add(key);
    const old = episode.dangers[key];
    const point = worldPosition(source),
      extent = bodyProfile(source);
    if (!old || old.kind !== 'body' || !old.visible) newlyVisible.push(key);
    if (
      !old ||
      old.kind !== 'body' ||
      !old.visible ||
      !samePoint(old.point, point) ||
      old.extent.radius !== extent.radius ||
      old.extent.height !== extent.height
    ) {
      episode.dangers[key] = {
        kind: 'body',
        sourceId: source.id,
        physicalLife,
        point: { ...point },
        extent: { radius: extent.radius, height: extent.height },
        observedAt: world.simTime,
        visible: true,
        ...(old?.insideAvoidance === undefined ? {} : { insideAvoidance: old.insideAvoidance }),
      };
      changed = true;
    }
  }
  for (const [key, old] of previous) {
    countDomainWork('nativeResponseDangerRecords');
    chargeWork({ tests: 1 });
    if (old.kind === 'body' && !visible.has(key)) {
      const current = entityGet(world.entities, old.sourceId);
      // Hidden removal, death, replacement or movement cannot resolve old evidence.
      if (
        visiblyEnded.has(key) ||
        (complete &&
          current &&
          (current.actor?.physicalLife ?? 0) === old.physicalLife &&
          sees(current) &&
          !dangerous(profile, current))
      ) {
        delete episode.dangers[key];
        changed = true;
        continue;
      }
      if (old.visible) {
        old.visible = false;
        old.lostAt = world.simTime;
        changed = true;
      }
    }
    const retained = episode.dangers[key];
    if (retained && nativeDangerExpiresAt(profile, retained) <= world.simTime) {
      delete episode.dangers[key];
      changed = true;
    }
  }
  if (!complete) return { status: 'unavailable', reason: 'perception-unavailable' };
  return {
    status: 'complete',
    profile,
    changed,
    newlyVisible,
    records: Object.entries(episode.dangers)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, danger]) => ({ key, danger })),
  };
}

const pointExtent = { radius: 0, height: 0 };
/** Current observed/remembered geometry only, with no hidden-source dereference. */
export function nativeDangerSeparation(
  observer: Entity,
  point: Position,
  danger: NativeDanger,
  profile: NativeResponseProfile,
  at: number,
): number {
  return (
    bodySurfaceDistance(
      point,
      bodyProfile(observer),
      danger.point,
      danger.kind === 'body' ? danger.extent : pointExtent,
    ) - nativeDangerUncertainty(profile, danger, at)
  );
}

/** Full route comparison uses every piece; endpoint separation cannot certify a
 * route passing another personally perceived danger. This selects no movement. */
export function nativeRouteDangerSeparation(
  observer: Entity,
  from: SurfacePoint,
  path: readonly SurfacePoint[],
  danger: NativeDanger,
  profile: NativeResponseProfile,
  at: number,
): number {
  if (!path.length) return nativeDangerSeparation(observer, from, danger, profile, at);
  let minimum = Infinity,
    previous = from;
  const extent = bodyProfile(observer),
    other = danger.kind === 'body' ? danger.extent : pointExtent;
  const uncertainty = nativeDangerUncertainty(profile, danger, at);
  for (const point of path) {
    chargeWork({ tests: 1 });
    minimum = Math.min(
      minimum,
      movingBodiesMinimumSeparation(previous, point, extent, danger.point, danger.point, other) -
        uncertainty,
    );
    previous = point;
  }
  return minimum;
}
