import { updateTerritorialPlace } from '../../territorial-threat.js';
import { nativeRegroupingIntention } from './foraging-regroup.js';
import { entityGet } from '../../entity-collection.js';
import { nativeHuntingIntention, endNativeHunt } from './foraging-hunt.js';
import { distance3D } from '@open-legend/spatial';
import { foragingProfile } from '../../native-foraging.js';
import { nativeFoodSourceCandidate, prepareNativeFeeding } from '../../native-feeding.js';
import { countDomainWork } from '../../diagnostic-counters.js';
import { nearbyEntities } from '../../spatial.js';
import { entityVisionQuery, seesEntity, visionRadius } from '../../perception.js';
import { supportedPosition, worldPosition } from '../../spatial-state.js';
import { itemFor, directChildIds } from '../../objects.js';
import { inDailyWindow, localHour, readEntityAttribute } from '../../status-effects.js';
import { nativeResponseProfile, type NativeLocomotion } from '../../native-response.js';
import { recordAnimalClockWrite } from '../../native-response-controller.js';
import { recordSemanticChange } from '../../dependencies.js';
import { nextRandom } from '../../data.js';
import { chargeWork } from '../../work-budget.js';
import { capabilityBlocked } from '../../status-capabilities.js';
import { activelyParticipates } from '../../participation-state.js';
import type { Command, Entity, Outcome, WorldState } from '../../types.js';

export interface NativeForagingIntention {
  command: Command;
  movement?: { binding: NativeLocomotion; path?: import('@open-legend/spatial').SurfacePoint[] };
}
export function nativeForagingDue(world: WorldState, animal: Entity): boolean {
  const state = animal.animal?.foraging,
    actor = animal.actor,
    target = state?.work?.targetId ? entityGet(world.entities, state.work.targetId) : undefined,
    profile =
      state?.work && ['hunt', 'regroup'].includes(state.work.kind)
        ? foragingProfile(world, animal)
        : undefined;
  return (
    !!state &&
    actor?.controller === 'native' &&
    actor.alive &&
    !actor.incapacitated &&
    !animal.animal?.episode &&
    activelyParticipates(animal) &&
    (!animal.threat || animal.threat.mode === 'idle') &&
    !capabilityBlocked(world, animal, 'actions') &&
    (!!state.proposal ||
      state.reviewAt <= world.simTime ||
      (!!state.work &&
        state.mode !== 'searching' &&
        state.mode !== 'blocked' &&
        state.work.actionId !== actor.action?.id) ||
      ((state.work?.kind === 'hunt' || state.work?.kind === 'regroup') &&
        (world.simTime >= state.work.endsAt ||
          state.work.travelledMetres >=
            (state.work.kind === 'hunt'
              ? profile!.hunt!.pursuit.routeMetres
              : profile!.regroup!.legMetres) ||
          (state.mode !== 'searching' && (!target || !seesEntity(world, animal, target))))))
  );
}
function changed(world: WorldState, animal: Entity): void {
  updateTerritorialPlace(world, animal);
  recordAnimalClockWrite(world, animal.id);
  recordSemanticChange(world, { kind: 'state', entityId: animal.id, field: 'behavior' });
}
/** Invoked by the existing animal arbitration boundary, after danger/territory.
 * One local sight read per due choice; no provider, global prey scan or extra clock. */
export function nativeForagingIntention(
  world: WorldState,
  animal: Entity,
  prepared?: import('../../native-response-navigation.js').NativeRefugePreparations,
): NativeForagingIntention | 'pending' | undefined {
  if (!nativeForagingDue(world, animal)) return;
  const state = animal.animal!.foraging!,
    profile = foragingProfile(world, animal);
  if (!profile) return;
  const action = animal.actor!.action;
  if (action && action.id !== state.work?.actionId) {
    delete state.work;
    state.mode = 'resting';
    state.reviewAt = world.simTime + profile.routine.choiceGameSeconds;
    changed(world, animal);
    return;
  }
  if (action?.type === 'feed') return;
  if (
    state.work?.actionId !== action?.id &&
    state.work?.kind !== 'hunt' &&
    state.work?.kind !== 'regroup'
  )
    delete state.work;
  const here = supportedPosition(animal);
  if (!here) return;
  const clock = world.statusEffectPolicy.namedTimes,
    night = inDailyWindow(localHour(world), clock.dusk!, clock.dawn!),
    fullness = readEntityAttribute(world, animal, profile.fullness.attributeId);
  if (typeof fullness !== 'number') return;
  const hungry =
    fullness < (night ? profile.fullness.seekBelowNight : profile.fullness.seekBelowDay) ||
    (state.mode === 'feeding' && fullness < profile.fullness.stopAt);
  const sees = entityVisionQuery(world, animal);
  const retainedFood = new Set(state.anchorFood?.map((row) => row.sourceId));
  const visible = nearbyEntities(world, here, visionRadius(world, animal)).filter((entity) => {
    if (entity.id === animal.id) return false;
    countDomainWork('nativeForagingSightCandidates');
    // Actors serve hunting/company; all resources preserve depletion evidence.
    // A remembered food source still needs sight if its supported shape changed.
    if (!entity.actor && !nativeFoodSourceCandidate(entity) && !retainedFood.has(entity.id)) {
      countDomainWork('nativeForagingSightExclusions');
      return false;
    }
    return sees(entity);
  });
  // Refresh only sources actually seen now. A hidden depletion/move/removal cannot
  // erase a past food observation or grant knowledge of its new position.
  const anchorFood = (state.anchorFood ?? []).filter(
    (row) => !visible.some((target) => target.id === row.sourceId),
  );
  let chosen: { target: Entity; itemId?: string; rank: number; distance: number } | undefined;
  for (const target of visible) {
    chargeWork({ candidates: 1 });
    if (target.resource?.quantity === 0)
      state.emptySources[target.id] = {
        at: world.simTime,
        revision: target.resource.revision ?? 0,
      };
    else if (target.resource) delete state.emptySources[target.id];
    const position = worldPosition(target),
      anchors = state.anchors.flatMap((point, index) =>
        distance3D(point, position) <= world.itemHandling.reach ? [index] : [],
      );
    const consider = (itemId?: string) => {
      if (!hungry && !anchors.length) return;
      const prepared = prepareNativeFeeding(world, animal, target.id, itemId);
      if (!prepared) return;
      const rank = profile.diet.findIndex((row) => row.definitionId === prepared.binding.food.id),
        distance = distance3D(here, position);
      for (const anchor of anchors) {
        const index = anchorFood.findIndex((row) => row.anchor === anchor),
          previous = anchorFood[index],
          priorRank = previous
            ? profile.diet.findIndex((row) => row.definitionId === previous.food.id)
            : -1;
        if (
          !previous ||
          priorRank < 0 ||
          rank < priorRank ||
          (rank === priorRank &&
            (previous.at < world.simTime || target.id.localeCompare(previous.sourceId) < 0))
        ) {
          const observation = {
            anchor,
            sourceId: target.id,
            food: { ...prepared.binding.food },
            at: world.simTime,
          };
          if (index < 0) anchorFood.push(observation);
          else anchorFood[index] = observation;
        }
      }
      if (!hungry || action?.strikePhase === 'windup') return;
      if (
        !chosen ||
        rank < chosen.rank ||
        (rank === chosen.rank &&
          (distance < chosen.distance ||
            (distance === chosen.distance && target.id.localeCompare(chosen.target.id) < 0)))
      )
        chosen = { target, itemId, rank, distance };
    };
    if (target.kind === 'item-pile')
      for (const itemId of directChildIds(world, target.id)) {
        chargeWork({ candidates: 1 });
        if (
          profile.diet.some(
            (row) =>
              row.sources.includes('item') &&
              row.definitionId === itemFor(world, itemId)?.definitionId,
          )
        )
          consider(itemId);
      }
    else consider();
  }
  if (anchorFood.length) state.anchorFood = anchorFood;
  else delete state.anchorFood;
  if (chosen) {
    if (state.work?.kind === 'hunt') endNativeHunt(world, animal);
    state.mode = 'feeding';
    state.reviewAt = world.simTime + profile.routine.choiceGameSeconds;
    changed(world, animal);
    return {
      command: {
        type: 'feed',
        id: `native-forage-${world.nextId}`,
        actorId: animal.id,
        targetId: chosen.target.id,
        ...(chosen.itemId ? { itemId: chosen.itemId } : {}),
      },
    };
  }
  if (profile.hunt && (hungry || state.work?.kind === 'hunt')) {
    const hunting = nativeHuntingIntention(world, animal, visible, night, fullness, prepared);
    changed(world, animal);
    if (hunting === 'holding') return;
    if (hunting) return hunting;
  }
  if (!state.work || state.work.kind === 'routine' || state.work.kind === 'regroup') {
    const joining = nativeRegroupingIntention(world, animal, visible);
    if (joining === 'holding') {
      changed(world, animal);
      return;
    }
    if (joining) {
      changed(world, animal);
      return joining;
    }
  }
  if (action && state.reviewAt > world.simTime) return;
  if (action && state.work?.actionId === action.id) return;
  if (
    !hungry &&
    profile.routine.idleAtHomeWhenFedInDaylight &&
    !night &&
    distance3D(here, state.home) <= world.itemHandling.reach
  ) {
    state.mode = 'resting';
    state.reviewAt = world.simTime + profile.routine.choiceGameSeconds;
    delete state.work;
    changed(world, animal);
    return;
  }
  let candidates =
    !hungry && profile.routine.idleAtHomeWhenFedInDaylight && !night
      ? [state.home]
      : state.anchors.filter((point) => distance3D(here, point) > world.itemHandling.reach);
  const preferred = candidates.filter((point) =>
    state.anchorFood?.some(
      (row) =>
        state.anchors[row.anchor] === point &&
        profile.diet.some((food) => food.definitionId === row.food.id),
    ),
  );
  if (preferred.length) candidates = preferred;
  if (!candidates.length) {
    state.mode = 'resting';
    state.reviewAt = world.simTime + profile.routine.choiceGameSeconds;
    changed(world, animal);
    return;
  }
  const point =
    candidates.length === 1
      ? candidates[0]!
      : candidates[Math.floor(nextRandom(world) * candidates.length)]!;
  state.mode = 'routine';
  state.destination = { ...point };
  state.reviewAt = world.simTime + profile.routine.choiceGameSeconds;
  changed(world, animal);
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
        locomotion: animal.animal!.locomotion,
        mode: 'travel',
      },
    },
  };
}
function blockNativeForaging(world: WorldState, animal: Entity): void {
  const state = animal.animal!.foraging!;
  state.mode = 'blocked';
  state.reviewAt =
    world.simTime + nativeResponseProfile(world, animal.animal!.profile)!.blockedReviewSeconds;
  // Failed travel cannot renew a hunt's finite allowance. Keep its original
  // target/deadline/distance while waiting; a stale route grants no movement.
  // docs/worlds/base/first-playable-roaming.md#alarm-injury-lost-contact-and-blocked-routes
  if (state.work?.kind !== 'hunt' && state.work?.kind !== 'regroup') delete state.work;
  delete state.proposal;
  changed(world, animal);
}
export function noteNativeForagingFailure(
  world: WorldState,
  animal: Entity,
  actionId: string,
): void {
  if (animal.animal?.foraging?.work?.actionId === actionId) blockNativeForaging(world, animal);
}
export function noteNativeForagingAdmission(
  world: WorldState,
  animal: Entity,
  intention: NativeForagingIntention,
  result: Outcome,
): void {
  const state = animal.animal?.foraging,
    profile = foragingProfile(world, animal);
  if (!state || !profile) return;
  const installed = animal.actor?.action;
  // Commands and installed physical actions have different identities. This
  // synchronous admission owns the actual new action, not the request receipt.
  if (result.ok && installed?.type === intention.command.type) {
    if (
      (state.work?.kind === 'hunt' || state.work?.kind === 'regroup') &&
      intention.command.type !== 'feed'
    ) {
      state.work.actionId = installed.id;
      changed(world, animal);
      return;
    }
    state.work = {
      kind: intention.command.type === 'feed' ? 'food' : 'routine',
      actionId: installed.id,
      startedAt: world.simTime,
      endsAt: world.simTime + profile.routine.choiceGameSeconds,
      travelledMetres: 0,
      lastPoint: { ...supportedPosition(animal)! },
      ...('targetId' in intention.command ? { sourceId: intention.command.targetId } : {}),
    };
  } else {
    blockNativeForaging(world, animal);
    return;
  }
  changed(world, animal);
}
