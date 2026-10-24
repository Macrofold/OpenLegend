import {
  bodySurfaceDistance,
  movingBodiesMinimumSeparation,
  SPATIAL_LIMITS,
  type WorldPoint,
} from '@open-legend/spatial';
import { entityGet } from './entity-collection.js';
import { readOnlyDraftView } from './draft.js';
import { entityVisionQuery, visionRadius } from './perception.js';
import { nearbyEntities, nearbySelectedEntities } from './spatial.js';
import { nativeSourceActor, nativeDangerSourceIds } from './native-danger-sources.js';
import { bodyProfile, worldPosition } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { chargeWork } from './work-budget.js';
import { countDomainWork } from './diagnostic-counters.js';
import { sensoryInputRevision, stateChangeRevision } from './dependencies.js';
import { isDraft } from 'immer';
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

/** A phase may interrupt an attack, so select its potential bodily sources before
 * checking current action/life/sight. Static species/body/capability facts remain
 * stable during exposure; an actual danger still needs the complete predicate. */
function nativePotentialDangerSource(profile: NativeResponseProfile, source: Entity): boolean {
  const actor = nativeSourceActor(source);
  return !!(
    actor &&
    (nativeDangerBody(profile, actor) ||
      (profile.dangers.currentNaturalAttack && actor.naturalStrikeIds?.length))
  );
}
function nativeDangerBody(profile: NativeResponseProfile, actor: NonNullable<Entity['actor']>) {
  const body = actor.body && readOnlyDraftView(actor.body);
  return (
    profile.dangers.species.includes(actor.species ?? '') ||
    !!(body && profile.dangers.bodyPlans.includes(body.plan))
  );
}

/** One existing exposure phase owns these derived sets. Common physical eligibility
 * is shared; retained evidence and old-body aliases stay observer-specific. The
 * caller's selected contact query preserves ordinary cell bounds and source order.
 * docs/projects/first-playable-world-tech-design.md#select-physical-danger-candidates-before-native-exposure */
export function prepareNativeDangerSources(world: WorldState, sourceIds: Iterable<string>) {
  let sources: Entity[] | undefined, remains: Map<string, string[]> | undefined;
  const profiles = new Map<NativeResponseProfile, ReadonlySet<string>>();
  return (observer: Entity): ReadonlySet<string> | undefined => {
    const selection = nativeResponseSightSelection(world, observer);
    if (selection.kind !== 'danger') return;
    sources ??= [...sourceIds].flatMap((id) => {
      const entity = entityGet(readOnlyDraftView(world.entities), id);
      return entity?.actor ? [entity] : [];
    });
    let common = profiles.get(selection.profile);
    if (!common) {
      const selected = new Set<string>();
      for (const source of sources) {
        chargeWork({ tests: 1 });
        countDomainWork('nativeResponseExposureSourceChecks');
        if (nativePotentialDangerSource(selection.profile, source)) selected.add(source.id);
      }
      profiles.set(selection.profile, (common = selected));
    }
    if (!selection.sourceIds.size) return common;
    if (!remains) {
      remains = new Map();
      for (const source of sources) {
        if (!source.remains) continue;
        const id = source.remains.sourceId;
        let aliases = remains.get(id);
        if (!aliases) remains.set(id, (aliases = []));
        aliases.push(source.id);
      }
    }
    let selected: Set<string> | undefined;
    const include = (id: string) => {
      if (!common.has(id)) (selected ??= new Set(common)).add(id);
    };
    for (const id of selection.sourceIds) {
      include(id);
      for (const alias of remains.get(id) ?? []) include(alias);
    }
    return selected ?? common;
  };
}

/** Current physical eligibility only; no observer's knowledge or danger record. */
export function nativeDangerSource(profile: NativeResponseProfile, source: Entity): boolean {
  const actor = nativeSourceActor(source);
  if (!actor?.alive || actor.incapacitated || !activelyParticipates(source)) return false;
  if (nativeDangerBody(profile, actor)) return true;
  const action = actor.action && readOnlyDraftView(actor.action);
  return !!(
    profile.dangers.currentNaturalAttack &&
    action?.type === 'strike' &&
    action.stage === 'working' &&
    action.strikePhase !== 'recovery' &&
    actor.naturalStrikeIds &&
    readOnlyDraftView(actor.naturalStrikeIds).includes(action.definitionId ?? '')
  );
}

export type NativeSightSelection = { accepts: (source: Entity) => boolean } & (
  | { kind: 'all' }
  | { kind: 'known'; sourceIds: ReadonlySet<string> }
  | { kind: 'danger'; profile: NativeResponseProfile; sourceIds: ReadonlySet<string> }
);

/** Only this memoryless controller's consumed sight sources can require a crossing.
 * Old exact bodies remain relevant until actual sight resolves them, including remains.
 * The predicate belongs to one unchanged query, never to saved state or a later turn.
 * docs/projects/combat-and-threat-responses-tech-design.md#dense-alarm-sight-preparation-follow-through */
export function nativeResponseSightSelection(
  world: WorldState,
  observer: Entity,
): NativeSightSelection {
  const animal = readOnlyDraftView(observer).animal,
    current = animal && readOnlyDraftView(animal).episode,
    episode = current && readOnlyDraftView(current),
    profile = episode && nativeResponseProfile(world, episode.profilePin);
  // Missing preparation cannot prove that any candidate is irrelevant.
  if (!episode) {
    const exposed = world.perceptionEpisodes?.[observer.id];
    return {
      kind: 'known',
      sourceIds: new Set(Object.keys(exposed ?? {})),
      accepts: (source) => !!exposed && Object.hasOwn(exposed, source.id),
    };
  }
  if (!profile) return { kind: 'all', accepts: (_source) => true };
  const dangers = readOnlyDraftView(episode.dangers);
  const retainedSources = new Set<string>();
  for (const danger of Object.values(dangers)) {
    chargeWork({ tests: 1 });
    if (danger.kind === 'body') retainedSources.add(danger.sourceId);
  }
  const accepts = (source: Entity): boolean => {
    chargeWork({ tests: 1 });
    countDomainWork('nativeResponseSightSourceChecks');
    if (nativeDangerSource(profile, source)) return true;
    const id = source.remains?.sourceId ?? source.id;
    const retained =
      !!source.actor &&
      retainedSources.has(id) &&
      dangers[nativeBodyDangerKey(id, source.actor.physicalLife ?? 0)]?.kind === 'body';
    if (!retained) countDomainWork('nativeResponseSightSourceExclusions');
    return retained;
  };
  return { kind: 'danger', profile, sourceIds: retainedSources, accepts };
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
const dangerAssessments = new WeakMap<
  WorldState,
  Map<
    string,
    {
      episode: string;
      at: number;
      sensory: number;
      state: number;
      manifest: number;
      geometry: number;
      mapRevision: number;
      frame: NativeDangerFrame;
    }
  >
>();
export function reconcileNativeDangers(
  world: WorldState,
  observer: Entity,
  episode: NativeResponseEpisode,
  candidates?: Iterable<Entity>,
): NativeDangerFrame {
  const owned = isDraft(world) && observer.animal?.episode === episode,
    sensory = sensoryInputRevision(world),
    state =
      stateChangeRevision(world, 'body') +
      stateChangeRevision(world, 'contribution') +
      stateChangeRevision(world, 'participation') +
      stateChangeRevision(world, 'behavior'),
    manifest = world.moduleManifest.revision,
    geometry = world.assemblyGeometryRevision ?? 0,
    mapRevision = world.map.spatial.revision,
    retained = owned ? dangerAssessments.get(world)?.get(observer.id) : undefined;
  if (
    retained &&
    retained.episode === episode.id &&
    retained.at === world.simTime &&
    retained.sensory === sensory &&
    retained.state === state &&
    retained.manifest === manifest &&
    retained.geometry === geometry &&
    retained.mapRevision === mapRevision
  ) {
    countDomainWork('nativeResponseDangerReuses');
    return retained.frame;
  }
  const frame = reconcileCurrentNativeDangers(world, observer, episode, candidates);
  if (owned && frame.status === 'complete') {
    let entries = dangerAssessments.get(world);
    if (!entries) dangerAssessments.set(world, (entries = new Map()));
    entries.set(observer.id, {
      episode: episode.id,
      at: world.simTime,
      sensory,
      state,
      manifest,
      geometry,
      mapRevision,
      frame,
    });
  }
  return frame;
}
function reconcileCurrentNativeDangers(
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
  const selected =
    complete && !candidates
      ? nativeDangerSourceIds(
          world,
          profile,
          new Set(
            previous.flatMap(([, danger]) => (danger.kind === 'body' ? [danger.sourceId] : [])),
          ),
        )
      : undefined;
  const sources = complete
    ? (candidates ??
      (selected
        ? nearbySelectedEntities(world, worldPosition(observer), radius, selected)
        : nearbyEntities(world, worldPosition(observer), radius)))
    : [];
  for (const source of sources) {
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
    const known = episode.dangers[nativeBodyDangerKey(source.id, source.actor.physicalLife ?? 0)];
    if ((!known && !nativeDangerSource(profile, source)) || !sees(source)) continue;
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
          !current.actor?.alive)
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

/** A physical preview may test landing permission without publishing exposure.
 * Only danger records' scalar visibility fields are mutated by reconciliation. */
export function readNativeDangers(
  world: WorldState,
  observer: Entity,
  episode: NativeResponseEpisode,
): NativeDangerFrame {
  return reconcileNativeDangers(world, observer, {
    ...episode,
    dangers: Object.fromEntries(
      Object.entries(episode.dangers).map(([key, danger]) => [key, { ...danger }]),
    ),
  });
}

export function nativeDangersClearAt(
  observer: Entity,
  point: WorldPoint,
  frame: Extract<NativeDangerFrame, { status: 'complete' }>,
  at: number,
): boolean {
  return frame.records.every(
    ({ danger }) =>
      nativeDangerSeparation(observer, point, danger, frame.profile, at) >=
      frame.profile.avoidanceDistance + frame.profile.clearanceMargin - SPATIAL_LIMITS.epsilon,
  );
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
  from: WorldPoint,
  path: readonly WorldPoint[],
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
