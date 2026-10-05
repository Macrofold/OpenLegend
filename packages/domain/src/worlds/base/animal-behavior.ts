import { walkSurfaceLine } from '@open-legend/spatial';
import { nextRandom } from '../../data.js';
import { recordSemanticChange } from '../../dependencies.js';
import { seesEntity } from '../../perception.js';
import {
  bodyProfile,
  setSpatialPosition,
  spatialMap,
  supportedPosition,
  worldPosition,
} from '../../spatial-state.js';
import { TIME_EPSILON } from '../../simulation-time.js';
import { chargeWork } from '../../work-budget.js';
import type { Entity, WorldState } from '../../types.js';
import { nativeMovementSpeed } from './actions.js';

/** Authored native motives, shared by species. No provider, species script or flee timer.
 * docs/worlds/base/survival.md#animal-escape */
export const ANIMAL_ESCAPE = {
  directions: 16,
  lookAheadMetres: 4,
  clearanceSamples: 4,
  safeDistanceMetres: 9,
  calmSeconds: 40,
  settledDanger: 0.04,
  separationWeight: 3,
  clearanceWeight: 1.5,
  continuityWeight: 0.4,
} as const;

export function rememberAttack(world: WorldState, animal: Entity, source: Entity): void {
  if (!animal.animal || !animal.actor?.alive) return;
  const behavior = animal.animal;
  behavior.threatPosition = { ...worldPosition(source) };
  // The impact gives a direction; tracking identity requires sight.
  behavior.threatId = seesEntity(world, animal, source) ? source.id : null;
  behavior.danger = 1;
  behavior.escapeHeading = null;
  behavior.reviewAt = world.simTime;
  recordSemanticChange(world, { kind: 'state', entityId: animal.id, field: 'behavior' });
}

export function escapeDuration(entity: Entity): number {
  const animal = entity.animal;
  return animal && animal.danger > ANIMAL_ESCAPE.settledDanger && animal.calmRate > 0
    ? Math.log(animal.danger / ANIMAL_ESCAPE.settledDanger) / animal.calmRate
    : Infinity;
}

function chooseEscape(world: WorldState, entity: Entity): void {
  const animal = entity.animal!,
    start = supportedPosition(entity),
    threat = animal.threatPosition;
  if (!start || !threat) return;
  const previous = animal.escapeHeading;
  const away = Math.atan2(start.z - threat.z, start.x - threat.x);
  const currentDistance = Math.hypot(start.x - threat.x, start.z - threat.z);
  let best = -Infinity,
    heading: number | null = null;
  for (let i = 0; i < ANIMAL_ESCAPE.directions; i++) {
    const angle = away + (i * Math.PI * 2) / ANIMAL_ESCAPE.directions;
    let clearance = 0;
    let checked = start;
    for (let step = 1; step <= ANIMAL_ESCAPE.clearanceSamples; step++) {
      chargeWork({ tests: 1 });
      const length = (ANIMAL_ESCAPE.lookAheadMetres * step) / ANIMAL_ESCAPE.clearanceSamples;
      const path = walkSurfaceLine(
        spatialMap(world),
        checked,
        start.x + Math.cos(angle) * length,
        start.z + Math.sin(angle) * length,
        bodyProfile(entity),
      );
      if (!path) break;
      checked = path.at(-1)!;
      clearance = length;
    }
    if (!clearance) continue;
    const x = start.x + Math.cos(angle) * clearance,
      z = start.z + Math.sin(angle) * clearance;
    const separation =
      (Math.hypot(x - threat.x, z - threat.z) - currentDistance) / ANIMAL_ESCAPE.lookAheadMetres;
    const score =
      animal.danger *
        (separation * ANIMAL_ESCAPE.separationWeight +
          (clearance / ANIMAL_ESCAPE.lookAheadMetres) * ANIMAL_ESCAPE.clearanceWeight) +
      (previous === null ? 0 : Math.cos(angle - previous) * ANIMAL_ESCAPE.continuityWeight);
    if (score > best) {
      best = score;
      heading = angle;
    }
  }
  if (heading !== previous) {
    animal.escapeHeading = heading;
    recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
  }
}

export function advanceAnimal(world: WorldState, entity: Entity, seconds: number): void {
  const animal = entity.animal;
  if (
    !animal ||
    !entity.actor?.alive ||
    entity.actor.incapacitated ||
    entity.actor.action ||
    entity.spatial.flight ||
    entity.spatial.fallVelocity !== undefined
  )
    return;
  if (animal.danger > 0 && animal.threatPosition) {
    if (seconds === 0) {
      if (world.simTime < animal.reviewAt) return;
      const before = [
        animal.danger,
        animal.calmRate,
        animal.threatPosition.x,
        animal.threatPosition.z,
      ];
      const source = animal.threatId ? world.entities[animal.threatId] : undefined;
      if (source?.actor?.alive && seesEntity(world, entity, source)) {
        animal.threatPosition = { ...worldPosition(source) };
        const distance = Math.hypot(
          worldPosition(entity).x - animal.threatPosition.x,
          worldPosition(entity).z - animal.threatPosition.z,
        );
        animal.danger = Math.max(
          animal.danger,
          Math.max(0, 1 - distance / ANIMAL_ESCAPE.safeDistanceMetres),
        );
      }
      const distance = Math.hypot(
        worldPosition(entity).x - animal.threatPosition.x,
        worldPosition(entity).z - animal.threatPosition.z,
      );
      animal.calmRate =
        Math.min(1, distance / ANIMAL_ESCAPE.safeDistanceMetres) / ANIMAL_ESCAPE.calmSeconds;
      if (
        [animal.danger, animal.calmRate, animal.threatPosition.x, animal.threatPosition.z].some(
          (value, i) => value !== before[i],
        )
      )
        recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'behavior' });
      chooseEscape(world, entity);
      // An absolute decision deadline survives callback partitioning and save/restore.
      // Shorter sensing slices do not repeatedly choose a different escape direction.
      animal.reviewAt =
        world.simTime +
        ANIMAL_ESCAPE.lookAheadMetres /
          ANIMAL_ESCAPE.clearanceSamples /
          nativeMovementSpeed(entity, true);
      return;
    }
    const heading = animal.escapeHeading;
    if (heading !== null) {
      const travel = nativeMovementSpeed(entity, true) * seconds;
      const position = worldPosition(entity),
        start = supportedPosition(entity);
      const point =
        start &&
        walkSurfaceLine(
          spatialMap(world),
          start,
          position.x + Math.cos(heading) * travel,
          position.z + Math.sin(heading) * travel,
          bodyProfile(entity),
        )?.at(-1);
      if (point) setSpatialPosition(world, entity, point, point.surfaceId);
    }
    animal.danger *= Math.exp(-animal.calmRate * seconds);
    if (animal.danger <= ANIMAL_ESCAPE.settledDanger + TIME_EPSILON) {
      animal.danger = 0;
      animal.threatPosition = null;
      animal.threatId = null;
      animal.escapeHeading = null;
      animal.calmRate = 0;
    }
    return;
  }
  animal.wanderSeconds -= seconds;
  if (animal.wanderSeconds <= TIME_EPSILON) {
    const angle = nextRandom(world) * Math.PI * 2,
      position = worldPosition(entity);
    const start = supportedPosition(entity);
    const point =
      start &&
      walkSurfaceLine(
        spatialMap(world),
        start,
        position.x + Math.cos(angle) * 0.4,
        position.z + Math.sin(angle) * 0.4,
        bodyProfile(entity),
      )?.at(-1);
    if (point) setSpatialPosition(world, entity, point, point.surfaceId);
    animal.wanderSeconds += 120 + Math.floor(nextRandom(world) * 120);
  }
}
