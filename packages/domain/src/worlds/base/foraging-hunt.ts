import { navigationMembershipChanged } from '../../entity-index.js';
import { nativeResponseProfile } from '../../native-response.js';
import { distance3D, resolveSupport, canStand, type SurfacePoint } from '@open-legend/spatial';
import { entityGet } from '../../entity-collection.js';
import { bodyProfile, spatialMap, supportedPosition, worldPosition } from '../../spatial-state.js';
import { seesEntity, pointVisionQuery } from '../../perception.js';
import { canReachEntity } from '../../spatial.js';
import { attackPermissionProblem } from '../../combat-consent.js';
import { combatRecoveryDeadline } from '../../contact-defense.js';
import { stopOwnedOffense, stopCurrentWork } from '../../agency.js';
import { canonicalJson } from '../../events.js';
import {
  preparedForagingRoutes,
  type NativeRefugePreparations,
} from '../../native-response-navigation.js';
import { foragingProfile } from '../../native-foraging.js';
import { strikeDefinition, movingStrikeInReach } from '../../strikes.js';
import { activelyParticipates } from '../../participation-state.js';
import type { Entity, WorldState } from '../../types.js';
import type { NativeForagingProfile } from '../../native-foraging.js';
import type { NativeForagingIntention } from './foraging.js';

function packmates(animal: Entity, visible: readonly Entity[]): Entity[] {
  const pack = animal.animal!.foraging!.packId;
  return pack
    ? visible.filter(
        (other) =>
          other.actor?.alive &&
          !other.actor.incapacitated &&
          other.animal?.foraging?.packId === pack,
      )
    : [];
}
function eligible(
  world: WorldState,
  animal: Entity,
  target: Entity,
  visible: readonly Entity[],
  night: boolean,
  fullness: number,
  profile: NativeForagingProfile,
): boolean {
  const hunt = profile.hunt!;
  if (
    !target.actor?.alive ||
    !activelyParticipates(target) ||
    attackPermissionProblem(world, animal, target, {})
  )
    return false;
  if (hunt.preySpecies.includes(target.actor.species ?? '')) return true;
  if (target.actor.body?.plan !== 'biped') return false;
  const rule = hunt.bipedRule;
  return (
    (!rule.nightOnly || night) &&
    fullness < rule.fullnessBelow &&
    packmates(animal, visible).filter(
      (mate) => distance3D(worldPosition(mate), worldPosition(target)) <= rule.packmateRadiusMetres,
    ).length >= rule.otherVisiblePackmates &&
    !visible.some(
      (other) =>
        other.id !== target.id &&
        other.actor?.alive &&
        !other.actor.incapacitated &&
        other.actor.body?.plan === 'biped' &&
        activelyParticipates(other) &&
        distance3D(worldPosition(other), worldPosition(target)) <= rule.otherBipedExclusionMetres,
    )
  );
}
export function endNativeHunt(world: WorldState, animal: Entity): void {
  const state = animal.animal!.foraging!,
    profile = foragingProfile(world, animal),
    work = state.work,
    action = animal.actor?.action;
  if (work && action?.id === work.actionId) {
    if (action.type === 'strike')
      stopOwnedOffense(world, animal.id, action.targetId!, action.targetLife!, {
        invocationId: action.id,
      });
    else stopCurrentWork(world, animal.id);
  }
  state.reconsiderAt =
    world.simTime +
    (profile?.hunt?.pursuit.reconsiderAfterGameSeconds ?? profile!.routine.choiceGameSeconds);
  delete state.work;
  delete state.proposal;
  delete state.destination;
  state.mode = 'resting';
  state.reviewAt = state.reconsiderAt;
}
function move(
  world: WorldState,
  animal: Entity,
  point: SurfacePoint,
  path?: SurfacePoint[],
  pursuit = false,
): NativeForagingIntention {
  const profile = foragingProfile(world, animal)!;
  return {
    command: {
      type: 'move',
      id: `native-forage-${world.nextId}`,
      actorId: animal.id,
      destination: { ...point },
    },
    movement: {
      binding: {
        profile: { ...animal.animal!.profile },
        locomotion: pursuit ? profile.hunt!.locomotionId : animal.animal!.locomotion,
        mode: 'travel',
      },
      ...(path ? { path } : {}),
    },
  };
}
/** The same saved hunt owns approach, preparation, cooldown travel and search. */
export function nativeHuntingIntention(
  world: WorldState,
  animal: Entity,
  visible: readonly Entity[],
  night: boolean,
  fullness: number,
  prepared?: NativeRefugePreparations,
): NativeForagingIntention | 'pending' | 'holding' | undefined {
  const state = animal.animal!.foraging!,
    profile = foragingProfile(world, animal)!,
    hunt = profile.hunt;
  if (!hunt) return;
  let work = state.work?.kind === 'hunt' ? state.work : undefined;
  if (
    work &&
    (world.simTime >= work.endsAt ||
      work.travelledMetres >= hunt.pursuit.routeMetres ||
      fullness >= profile.fullness.stopAt)
  ) {
    endNativeHunt(world, animal);
    return;
  }
  if (!work && (state.reconsiderAt ?? 0) > world.simTime) return;
  let target = work ? visible.find((entity) => entity.id === work!.targetId) : undefined;
  if (work && !target) {
    const observed = work.observed!,
      lost = (work.lostAt ??= world.simTime);
    if (world.simTime >= lost + hunt.lostSight.totalSearchGameSeconds) {
      endNativeHunt(world, animal);
      return;
    }
    if (animal.actor?.action?.strikePhase === 'windup')
      stopOwnedOffense(world, animal.id, work.targetId!, work.targetLife!, {
        invocationId: work.actionId,
      });
    delete state.proposal;
    state.mode = 'searching';
    state.reviewAt = Math.min(
      work.endsAt,
      world.simTime + hunt.approach.reviewGameSeconds,
      lost + hunt.lostSight.totalSearchGameSeconds,
    );
    if (animal.actor?.action?.id === work.actionId && animal.actor.action.type === 'move')
      return 'holding';
    if (world.simTime < lost + hunt.lostSight.lastPointGameSeconds) {
      if (distance3D(supportedPosition(animal)!, observed.point) <= world.itemHandling.reach) {
        state.reviewAt = Math.min(work.endsAt, lost + hunt.lostSight.lastPointGameSeconds);
        return 'holding';
      }
      return move(world, animal, observed.point, undefined, true);
    }
    const sight = pointVisionQuery(world, animal),
      body = bodyProfile(animal),
      map = spatialMap(world);
    while ((work.searchIndex ?? 0) < hunt.lostSight.candidateCount) {
      const index = work.searchIndex ?? 0;
      work.searchIndex = index + 1;
      const angle = (index * Math.PI * 2) / hunt.lostSight.candidateCount,
        point = resolveSupport(
          map,
          {
            x: observed.point.x + Math.cos(angle) * hunt.lostSight.radiusMetres,
            y: observed.point.y,
            z: observed.point.z + Math.sin(angle) * hunt.lostSight.radiusMetres,
          },
          observed.point.surfaceId,
        );
      if (point && sight(point) && canStand(map, point, body))
        return move(world, animal, point, undefined, true);
    }
    return 'holding';
  }
  if (
    target &&
    (!eligible(world, animal, target, visible, night, fullness, profile) ||
      (target.actor!.physicalLife ?? 0) !== work!.targetLife)
  ) {
    endNativeHunt(world, animal);
    return;
  }
  if (!target) {
    const here = worldPosition(animal);
    target = visible
      .filter((other) => eligible(world, animal, other, visible, night, fullness, profile))
      .sort((a, b) => {
        const rank = (other: Entity) => {
          const index = hunt.preySpecies.indexOf(other.actor!.species ?? '');
          return index < 0 ? hunt.preySpecies.length : index;
        };
        return (
          rank(a) - rank(b) ||
          distance3D(here, worldPosition(a)) - distance3D(here, worldPosition(b)) ||
          a.id.localeCompare(b.id)
        );
      })[0];
    if (!target) return;
    work = state.work = {
      kind: 'hunt',
      actionId: animal.actor?.action?.id ?? `native-forage-${world.nextId}`,
      targetId: target.id,
      targetLife: target.actor!.physicalLife ?? 0,
      observed: { point: { ...supportedPosition(target)! }, at: world.simTime },
      startedAt: world.simTime,
      endsAt: world.simTime + hunt.pursuit.gameSeconds,
      travelledMetres: 0,
      lastPoint: { ...supportedPosition(animal)! },
    };
  }
  const point = supportedPosition(target);
  if (!point) {
    endNativeHunt(world, animal);
    return;
  }
  const previous = work!.routeTarget ?? work!.observed!.point;
  work!.observed = { point: { ...point }, at: world.simTime };
  delete work!.lostAt;
  delete work!.searchIndex;
  state.reviewAt = Math.min(work!.endsAt, world.simTime + hunt.approach.reviewGameSeconds);
  if (animal.actor?.action?.strikePhase === 'windup') return 'holding';
  const strike = strikeDefinition(hunt.strikeId, world)!,
    inStartRange = movingStrikeInReach(world, animal, target, strike.preparationMotion!.startRange);
  if (inStartRange && combatRecoveryDeadline(world, animal) <= world.simTime) {
    state.mode = 'pursuing';
    delete state.proposal;
    return {
      command: {
        type: 'strike',
        id: `native-forage-${world.nextId}`,
        actorId: animal.id,
        targetId: target.id,
        definitionId: strike.id,
      },
    };
  }
  if (
    animal.actor?.action?.type === 'move' &&
    animal.actor.action.id === work!.actionId &&
    distance3D(previous, point) < hunt.approach.targetMovementMetres &&
    animal.actor.action.path.length &&
    !state.proposal
  )
    return 'holding';
  const here = supportedPosition(animal)!,
    mates = packmates(animal, visible),
    body = bodyProfile(animal),
    map = spatialMap(world),
    sight = pointVisionQuery(world, animal),
    basis = canonicalJson([
      target.id,
      work!.targetLife,
      point,
      mates.map((mate) => [mate.id, worldPosition(mate)]),
      map.spatial.revision,
    ]);
  if (state.proposal?.basis !== basis) {
    const candidates: Array<{ id: string; point: SurfacePoint }> = [],
      separations: Record<string, number> = {},
      start = Math.atan2(here.z - point.z, here.x - point.x),
      radius = hunt.approach.radiusMetres + body.radius + bodyProfile(target).radius;
    for (let index = 0; index < hunt.approach.bearings; index++) {
      const angle = start + (index * Math.PI * 2) / hunt.approach.bearings,
        candidate = resolveSupport(
          map,
          {
            x: point.x + Math.cos(angle) * radius,
            y: point.y,
            z: point.z + Math.sin(angle) * radius,
          },
          point.surfaceId,
        );
      if (!candidate || !sight(candidate) || !canStand(map, candidate, body)) continue;
      const id = `ring-${index}`;
      candidates.push({ id, point: candidate });
      separations[id] = mates.length
        ? Math.min(...mates.map((mate) => distance3D(candidate, worldPosition(mate))))
        : 0;
    }
    navigationMembershipChanged(
      world,
      animal.id,
      nativeResponseProfile(world, animal.animal!.profile)!.candidates.navigationWait,
    );
    state.proposal = {
      generation: (state.proposal?.generation ?? 0) + 1,
      wait: nativeResponseProfile(world, animal.animal!.profile)!.candidates.navigationWait,
      at: world.simTime,
      geometryRevision: map.spatial.revision,
      origin: { ...here },
      movementId: animal.actor?.action?.id ?? null,
      body: { radius: body.radius, height: body.height, maxSlope: body.maxSlope },
      candidates,
      separations,
      basis,
    };
  }
  const routes = preparedForagingRoutes(world, animal, prepared);
  if (routes === 'pending') return 'pending';
  if (routes === 'unavailable') {
    state.mode = 'blocked';
    return 'holding';
  }
  routes.sort(
    (a, b) =>
      state.proposal!.separations[b.candidateId]! - state.proposal!.separations[a.candidateId]! ||
      a.length - b.length ||
      a.candidateId.localeCompare(b.candidateId),
  );
  let selected = routes[0];
  if (!selected) {
    endNativeHunt(world, animal);
    return;
  }
  if (state.destination && animal.actor?.action?.type === 'move') {
    const retained = routes.find(
      (route) =>
        distance3D(
          state.proposal!.candidates.find((row) => row.id === route.candidateId)!.point,
          state.destination!,
        ) < 0.000001,
    );
    if (
      retained &&
      state.proposal.separations[selected.candidateId]! <
        state.proposal.separations[retained.candidateId]! + hunt.approach.improveSeparationMetres
    )
      selected = retained;
  }
  const destination = state.proposal.candidates.find(
    (row) => row.id === selected.candidateId,
  )!.point;
  work!.routeTarget = { ...point };
  delete state.proposal;
  state.mode = 'stalking';
  state.destination = { ...destination };
  return move(
    world,
    animal,
    destination,
    selected.path,
    combatRecoveryDeadline(world, animal) > world.simTime,
  );
}
