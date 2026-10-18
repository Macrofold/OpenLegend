import { entityGet } from '../../entity-collection.js';
import { isDraft } from 'immer';
import { walkSurfaceLine } from '@open-legend/spatial';
import { capabilityBlocked } from '../../status-capabilities.js';
import { readOnlyDraftView } from '../../draft.js';
import { countDomainWork } from '../../diagnostic-counters.js';
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
import type { AnimalComponent, Entity, WorldState } from '../../types.js';
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

const wanderClockWrites = new WeakMap<WorldState, { owner: object; ids: Set<string> }>();
/** Only the native caller owns every clock writer in a working draft. An unknown draft,
 * builder or another queue owner needs a full capture before this proof can be reused.
 * No publication or predecessor world is retained by this disposable notification set. */
export function takeAnimalWanderClockWrites(
  world: WorldState,
  owner: object,
  beginNative = false,
): ReadonlySet<string> | undefined {
  if (!isDraft(world)) return;
  const previous = wanderClockWrites.get(world);
  if (!previous || previous.owner !== owner) {
    const next = { owner, ids: new Set<string>() };
    wanderClockWrites.set(world, next);
    return beginNative && !previous ? next.ids : undefined;
  }
  const ids = previous.ids;
  if (ids.size) previous.ids = new Set();
  return ids;
}
function recordWanderClockWrite(world: WorldState, id: string): void {
  wanderClockWrites.get(world)?.ids.add(id);
}
/** A waiting animal's clock stops whenever ordinary wandering cannot run. The two modes
 * share one authority, rather than retaining a second writable countdown beside a deadline. */
export function animalWanderNeedsCountdown(world: WorldState): boolean {
  // Leave generous room below the shared time tolerance. At ancient clock values,
  // adding a short wait can round all the way back to now; serial subtraction avoids it.
  return Math.abs(world.simTime) * Number.EPSILON > TIME_EPSILON / 4;
}
export function animalWanderRemaining(world: WorldState, entity: Entity): number | undefined {
  const record = readOnlyDraftView(entity);
  const animal = record.animal && readOnlyDraftView(record.animal);
  const clock = animal?.wander && readOnlyDraftView(animal.wander);
  return clock && ('dueAt' in clock ? clock.dueAt - world.simTime : clock.remainingSeconds);
}
export function reconcileAnimalWander(world: WorldState, entity: Entity): void {
  const record = readOnlyDraftView(entity);
  const animal = record.animal && readOnlyDraftView(record.animal);
  if (!animal) return;
  countDomainWork('animalWanderEligibilityChecks');
  const actor = record.actor && readOnlyDraftView(record.actor);
  const spatial = readOnlyDraftView(record.spatial);
  const eligible =
    !record.threat &&
    !!actor?.alive &&
    !actor.incapacitated &&
    !actor.action &&
    !spatial.flight &&
    spatial.fallVelocity === undefined &&
    !(animal.danger > 0 && animal.threatPosition) &&
    !capabilityBlocked(world, entity, 'locomotion');
  const clock = readOnlyDraftView(animal.wander);
  let next: AnimalComponent['wander'] | undefined;
  if (eligible) {
    if (animalWanderNeedsCountdown(world)) {
      if ('dueAt' in clock) next = { remainingSeconds: clock.dueAt - world.simTime, running: true };
      else if (!clock.running) next = { remainingSeconds: clock.remainingSeconds, running: true };
    } else if ('remainingSeconds' in clock)
      next = { dueAt: world.simTime + clock.remainingSeconds };
  } else if ('dueAt' in clock) next = { remainingSeconds: clock.dueAt - world.simTime };
  else if (clock.running) next = { remainingSeconds: clock.remainingSeconds };
  if (next) {
    entity.animal!.wander = next;
    recordWanderClockWrite(world, entity.id);
  }
}
/** The native caller advances only running precision-fallback clocks for the interval
 * during which wandering was eligible. Landing and newly removed restrictions therefore
 * grant future time, exactly as with the ordinary paused/absolute modes. */
export function advanceAnimalWanderClock(entity: Entity, seconds: number): void {
  const animal = readOnlyDraftView(entity).animal;
  const stored = animal && readOnlyDraftView(animal).wander;
  const clock = stored && readOnlyDraftView(stored);
  // The queue keeps only running membership; due selection reads this value live.
  if (clock && 'remainingSeconds' in clock && clock.running)
    (entity.animal!.wander as { remainingSeconds: number }).remainingSeconds -= seconds;
}
export function advanceAnimal(world: WorldState, entity: Entity, seconds: number): void {
  reconcileAnimalWander(world, entity);
  const animal = entity.animal;
  if (
    !animal ||
    entity.threat ||
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
      const source = animal.threatId ? entityGet(world.entities, animal.threatId) : undefined;
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
          nativeMovementSpeed(world, entity, true);
      return;
    }
    const heading = animal.escapeHeading;
    if (heading !== null) {
      const travel = nativeMovementSpeed(world, entity, true) * seconds;
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
  const remaining = animalWanderRemaining(world, entity)!;
  if (remaining <= TIME_EPSILON) {
    countDomainWork('animalWanderDecisions');
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
    const wait = 120 + Math.floor(nextRandom(world) * 120);
    // Add to the old deadline, carrying negative remainder and making one hop only.
    const clock = animal.wander;
    animal.wander =
      'dueAt' in clock
        ? { dueAt: clock.dueAt + wait }
        : {
            remainingSeconds: clock.remainingSeconds + wait,
            ...(clock.running ? { running: true as const } : {}),
          };
    recordWanderClockWrite(world, entity.id);
  }
}
