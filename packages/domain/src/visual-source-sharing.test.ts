import { expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID } from './worlds/base/world.js';
import { entityGet, entitySet } from './entity-collection.js';
import { initializePerception } from './kernel.js';
import { worldPlacement, setSpatialPosition, worldSupport } from './spatial-state.js';
import {
  captureEvidenceCut,
  currentBodyObservation,
  currentObservedFacets,
} from './perception-evidence.js';

it('shares only complete outward source values while preserving independent receiver frames, evidence and historical samples', () => {
  const world = createWorld(218),
    source = entityGet(world.entities, NPC_ID)!,
    first = entityGet(world.entities, PLAYER_ID)!;
  const second = structuredClone(source);
  second.id = 'fixture-second-observer';
  second.placement = worldPlacement({ x: 1, y: 0, z: 4 }, null);
  entitySet(world.entities, second.id, second);
  setSpatialPosition(world, first, { x: 1, y: 0, z: 2 }, worldSupport(first));
  setSpatialPosition(world, source, { x: 3, y: 0, z: 3 }, worldSupport(source));
  initializePerception(world, []);
  const a = world.perceptionEvidence![first.id]!.current[`${source.id}:body`]!,
    b = world.perceptionEvidence![second.id]!.current[`${source.id}:body`]!;
  expect(a.value).toBe(b.value);
  expect(Object.isFrozen(a.value)).toBe(true);
  expect(a.original).not.toBe(b.original);
  expect(a.original.observer.actorId).toBe(first.id);
  expect(b.original.observer.actorId).toBe(second.id);
  const point = (id: string) =>
    currentObservedFacets(world, id, source.id).find((value) => value.value.kind === 'location')!;
  const firstLocation = point(first.id),
    secondLocation = point(second.id);
  expect(
    firstLocation.value.kind === 'location' && firstLocation.value.frame.positionAtObservation,
  ).toEqual({ x: 1, y: 0, z: 2 });
  expect(
    secondLocation.value.kind === 'location' && secondLocation.value.frame.positionAtObservation,
  ).toEqual({ x: 1, y: 0, z: 4 });
  expect(a.value.kind === 'body' && a.value.body.label?.name).toBe('person');
  const cut = captureEvidenceCut(world, first.id),
    previous = a.value;
  world.simTime = 1;
  setSpatialPosition(world, source, { x: 4, y: 0, z: 3 }, worldSupport(source), 'physical');
  initializePerception(world, []);
  const movedA = world.perceptionEvidence![first.id]!.current[`${source.id}:body`]!,
    movedB = world.perceptionEvidence![second.id]!.current[`${source.id}:body`]!;
  expect(movedA.value).toBe(movedB.value);
  expect(movedA.value).not.toBe(previous);
  expect(currentBodyObservation(world, first.id, source.id)!.value.body.position.x).toBe(4);
  expect(cut.current.find((value) => value.id === a.id)!.value).toBe(previous);
  expect(previous.kind === 'body' && previous.body.position.x).toBe(3);
  world.simTime = 2;
  setSpatialPosition(world, first, { x: 1.5, y: 0, z: 2 }, worldSupport(first), 'physical');
  initializePerception(world, []);
  expect(
    point(first.id).value.kind === 'location' &&
      (point(first.id).value as Extract<typeof firstLocation.value, { kind: 'location' }>).frame
        .positionAtObservation.x,
  ).toBe(1.5);
  expect(
    point(second.id).value.kind === 'location' &&
      (point(second.id).value as Extract<typeof secondLocation.value, { kind: 'location' }>).frame
        .positionAtObservation.x,
  ).toBe(1);
});
