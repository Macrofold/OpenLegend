import { distance3D, resolveSupport, type SurfacePoint } from '@open-legend/spatial';
import { entityGet } from '../../entity-collection.js';
import { supportedPosition, bodyProfile, spatialMap } from '../../spatial-state.js';
import { foragingProfile } from '../../native-foraging.js';
import { stopCurrentWork } from '../../agency.js';
import type { Entity, WorldState } from '../../types.js';
import type { NativeForagingIntention } from './foraging.js';
import {
  foragingBehaviorChanged,
  setForagingMode,
  setForagingDestination,
  setForagingReviewAt,
} from './foraging-state.js';

/** Local visible joining, never a shared leader, hidden follow or second route. */
export function nativeRegroupingIntention(
  world: WorldState,
  animal: Entity,
  visible: readonly Entity[],
): NativeForagingIntention | 'holding' | undefined {
  const state = animal.animal!.foraging!,
    profile = foragingProfile(world, animal)!,
    rule = profile.regroup,
    here = supportedPosition(animal);
  if (!rule || !state.packId || !here) return;
  let work = state.work?.kind === 'regroup' ? state.work : undefined;
  const stop = () => {
    if (work && animal.actor?.action?.id === work.actionId) stopCurrentWork(world, animal.id);
    if (state.work) {
      delete state.work;
      foragingBehaviorChanged(world, animal);
    }
    setForagingDestination(world, animal, undefined);
    setForagingMode(world, animal, 'routine');
    setForagingReviewAt(world, animal, world.simTime + rule.reviewGameSeconds);
  };
  let mate = work ? visible.find((other) => other.id === work!.targetId) : undefined;
  if (
    work &&
    (!mate?.actor?.alive ||
      !supportedPosition(mate) ||
      (mate.actor.physicalLife ?? 0) !== work.targetLife ||
      world.simTime >= work.endsAt ||
      work.travelledMetres >= rule.legMetres)
  ) {
    stop();
    return 'holding';
  }
  if (!mate)
    mate = visible
      .filter(
        (other) =>
          other.actor?.alive &&
          other.animal?.foraging?.packId === state.packId &&
          supportedPosition(other),
      )
      .sort(
        (a, b) =>
          distance3D(here, supportedPosition(a)!) - distance3D(here, supportedPosition(b)!) ||
          a.id.localeCompare(b.id),
      )[0];
  const point = mate && supportedPosition(mate);
  if (!mate || !point) return;
  const distance = distance3D(here, point),
    radii = bodyProfile(animal).radius + bodyProfile(mate).radius;
  if (distance - radii <= (work ? rule.stopSeparationMetres : rule.separationAboveMetres)) {
    if (work) stop();
    return;
  }
  setForagingReviewAt(
    world,
    animal,
    Math.min(work?.endsAt ?? Infinity, world.simTime + rule.reviewGameSeconds),
  );
  if (
    work &&
    animal.actor?.action?.id === work.actionId &&
    distance3D(work.routeTarget ?? work.observed!.point, point) < rule.refreshDisplacementMetres
  )
    return 'holding';
  if (!work) {
    work = state.work = {
      kind: 'regroup',
      actionId: animal.actor?.action?.id ?? `native-forage-${world.nextId}`,
      targetId: mate.id,
      targetLife: mate.actor!.physicalLife ?? 0,
      observed: { point: { ...point }, at: world.simTime },
      startedAt: world.simTime,
      endsAt: world.simTime + rule.legGameSeconds,
      travelledMetres: 0,
      lastPoint: { ...here },
    };
    foragingBehaviorChanged(world, animal);
  }
  work.observed = { point: { ...point }, at: world.simTime };
  work.routeTarget = { ...point };
  const leg = Math.min(
      rule.legMetres - work.travelledMetres,
      distance - radii - rule.stopSeparationMetres,
    ),
    fraction = leg / distance,
    destination: SurfacePoint | null = resolveSupport(
      spatialMap(world),
      {
        x: here.x + (point.x - here.x) * fraction,
        y: here.y + (point.y - here.y) * fraction,
        z: here.z + (point.z - here.z) * fraction,
      },
      here.surfaceId,
    );
  if (!destination) {
    stop();
    return 'holding';
  }
  setForagingMode(world, animal, 'regrouping');
  setForagingDestination(world, animal, destination);
  return {
    command: { type: 'move', id: `native-forage-${world.nextId}`, actorId: animal.id, destination },
    movement: {
      binding: {
        profile: { ...animal.animal!.profile },
        locomotion: animal.animal!.locomotion,
        mode: 'travel',
      },
    },
  };
}
