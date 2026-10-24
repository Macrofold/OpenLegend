import { stockedCamp } from '../../../tests/fixtures/world.js';
import { flexibleAssemblyFamily } from './assemblies.js';
import {
  entityGet,
  entityKeys,
  entitySet,
  entityDelete,
  emptyEntities,
  validateEntityCollection,
  cloneEntities,
} from './entity-collection.js';
import { describe, expect, it } from 'vitest';
import { createWorld, PLAYER_ID, NPC_ID, nextRandom } from './data.js';
import {
  draftWorld,
  finishWorld,
  freezeWorld,
  changedEntityIds,
  changedDraftEntityIds,
  entityChangesBetween,
  sensoryDraftWrites,
} from './draft.js';
import { executeCommand } from './kernel.js';
import { worldRootEntities } from './entity-index.js';
import { observeDomainCounters, type DomainCounters } from './diagnostic-counters.js';
import {
  renewQuietTerritorialReview,
  territorialIntention,
  nextTerritorialReview,
} from './territorial-threat.js';
import { setSpatialPosition, worldPosition } from './spatial-state.js';
import { captureMaterialExposure, integrateMaterialExposure } from './material-exposure.js';
import {
  createItemLot,
  directChildIds,
  exposedMaterialIds,
  moveLot,
  retireItem,
} from './objects.js';
import { atomicObjects } from './item-handling.js';
import { attributeDefinition, setAttribute } from './world-modules.js';
import { prepareExposure, snapshotEncounters } from './encounter-cache.js';
import {
  integrateStatusRates,
  prepareStatusIntegration,
  prepareStatusRates,
} from './status-effects.js';
import { reconcileStatusEffects } from './status-effects.js';
import {
  nativeWanderRoute,
  advanceAnimalWanderClock,
  animalWanderRemaining,
  reconcileAnimalWander,
} from './native-response-controller.js';
import { AnimalWorkQueue } from './animal-work-queue.js';

function result<T>(iterator: Generator<void, T>): T {
  for (;;) {
    const step = iterator.next();
    if (step.done) return step.value;
  }
}

describe('simulation overhaul ownership and continuation', () => {
  it('installs exact contents before another read or nested transfer in the same transition', () => {
    const base = freezeWorld(createWorld()),
      world = draftWorld(base),
      itemId = createItemLot(world, PLAYER_ID, 'berries', 1);
    expect([...directChildIds(world, PLAYER_ID)]).toContain(itemId);
    atomicObjects(world, (candidate) => moveLot(candidate, itemId, NPC_ID, 1, 'test', false));
    expect([...directChildIds(world, PLAYER_ID)]).not.toContain(itemId);
    expect([...directChildIds(world, NPC_ID)]).toContain(itemId);
    atomicObjects(world, (candidate) =>
      atomicObjects(candidate, (inner) => moveLot(inner, itemId, PLAYER_ID, 1, 'test', false)),
    );
    expect([...directChildIds(world, PLAYER_ID)]).toContain(itemId);
    expect([...directChildIds(world, NPC_ID)]).not.toContain(itemId);
    const published = freezeWorld(finishWorld(world), { completedTransition: true }),
      cold = freezeWorld(structuredClone(published));
    for (const id of [PLAYER_ID, NPC_ID])
      expect([...directChildIds(published, id)]).toEqual([...directChildIds(cold, id)]);
    expect([...directChildIds(base, PLAYER_ID)]).not.toContain(itemId);
  });

  it('reuses owned entity lookup paths and invalidates only replaced or removed keys', () => {
    const base = freezeWorld(createWorld()),
      world = draftWorld(base),
      counters: DomainCounters = {};
    observeDomainCounters(counters);
    try {
      for (let index = 0; index < 100; index++)
        expect(entityGet(world.entities, PLAYER_ID)!.id).toBe(PLAYER_ID);
    } finally {
      observeDomainCounters();
    }
    expect(counters.entityDraftTreeLookups).toBe(1);
    expect(counters.entityDraftLookupHits).toBe(99);
    entityGet(world.entities, PLAYER_ID)!.name = 'Current cached edit';
    expect(entityGet(world.entities, PLAYER_ID)!.name).toBe('Current cached edit');
    entitySet(world.entities, PLAYER_ID, {
      ...structuredClone(entityGet(base.entities, PLAYER_ID)!),
      name: 'Replacement',
    });
    expect(entityGet(world.entities, PLAYER_ID)!.name).toBe('Replacement');
    entityDelete(world.entities, PLAYER_ID);
    expect(entityGet(world.entities, PLAYER_ID)).toBeUndefined();
    entitySet(world.entities, PLAYER_ID, structuredClone(entityGet(base.entities, PLAYER_ID)!));
    expect(entityGet(world.entities, PLAYER_ID)!.name).toBe(
      entityGet(base.entities, PLAYER_ID)!.name,
    );
    expect(changedEntityIds(finishWorld(world))?.has(PLAYER_ID)).toBe(true);
  });

  it('keeps late builder edits outside published membership and change-lineage proofs', () => {
    const original = freezeWorld(createWorld());
    worldRootEntities(original, true);
    const draft = draftWorld(original);
    entityGet(draft.entities, PLAYER_ID)!.name = 'Builder edit';
    const builder = finishWorld(draft);
    expect(Object.isFrozen(builder)).toBe(false);
    const added = structuredClone(entityGet(original.entities, 'stones')!);
    added.id = 'late-builder-root';
    entitySet(builder.entities, added.id, added);
    entityDelete(builder.entities, 'branches');
    freezeWorld(builder);
    const roots = worldRootEntities(builder, true).map((entity) => entity.id);
    expect(roots).toContain(added.id);
    expect(roots).not.toContain('branches');
    // An absent proof deliberately makes storage compare the complete current collection.
    expect(entityChangesBetween(original.entities, builder.entities)).toBeUndefined();
    expect(entityKeys(builder.entities)).toContain(added.id);
    expect(entityKeys(original.entities)).not.toContain(added.id);
  });

  it('renews only an empty idle territory deadline and keeps possible encounters on the full path', () => {
    const world = createWorld(),
      stag = entityGet(world.entities, 'territorial-stag')!;
    const reference = structuredClone(world);
    const before = stag.threat!.reviewAt;
    expect(territorialIntention(reference, entityGet(reference.entities, stag.id)!, [])).toBeNull();
    expect(renewQuietTerritorialReview(world, stag)).toBe(true);
    expect(stag.threat!.reviewAt).toBeGreaterThan(before);
    expect(world).toEqual(reference);
    expect(nextTerritorialReview(world, [stag.id])).toBe(stag.threat!.reviewAt);
    world.simTime = stag.threat!.reviewAt;
    setSpatialPosition(
      world,
      entityGet(world.entities, PLAYER_ID)!,
      stag.threat!.policy.home,
      stag.threat!.policy.home.surfaceId,
    );
    const unchanged = structuredClone(world);
    expect(renewQuietTerritorialReview(world, stag)).toBe(false);
    expect(world).toEqual(unchanged);
  });

  it('prunes impossible automatic rules while retaining active rules and same-pass wake cascades', () => {
    const source = createWorld(),
      player = entityGet(source.entities, PLAYER_ID)!;
    player.actor!.attributes!['wilderness:energy']!.value = 40;
    reconcileStatusEffects(source, player, []);
    const base = freezeWorld(source),
      world = draftWorld(base),
      counters: DomainCounters = {};
    observeDomainCounters(counters);
    try {
      for (let index = 0; index < 5; index++)
        reconcileStatusEffects(world, entityGet(world.entities, PLAYER_ID)!, []);
    } finally {
      observeDomainCounters();
    }
    expect(counters.statusDormantRulesExcluded).toBeGreaterThanOrEqual(5);
    expect(counters.statusRulesConsidered).toBeLessThan(
      5 * source.statusEffectPolicy.definitions.length,
    );
    const sleeping = executeCommand(finishWorld(world), {
      id: 'pruned-manual-sleep',
      actorId: PLAYER_ID,
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      operation: 'activate',
      targetId: PLAYER_ID,
    });
    expect(sleeping.outcome.ok, sleeping.outcome.message).toBe(true);
    const waking = draftWorld(sleeping.world),
      entity = entityGet(waking.entities, PLAYER_ID)!;
    setAttribute(waking, entity, attributeDefinition(waking, 'wilderness:energy')!, 100, []);
    reconcileStatusEffects(waking, entity, []);
    expect(entity.statusEffects!['wilderness:restorative-rest']!.active).toBe(false);
    expect(entity.statusEffects!['wilderness:energy-expenditure']!.active).toBe(true);
    finishWorld(waking);
  });
  it('preserves JavaScript numeric and insertion order across replacement and reinsertion', () => {
    const seed = createWorld(),
      records = emptyEntities(),
      reference: Record<string, unknown> = {};
    for (const id of ['b', '10', '2', '01', '-0', '4294967294', '4294967295', 'a']) {
      const specimen = { ...structuredClone(entityGet(seed.entities, PLAYER_ID)!), id };
      entitySet(records, id, specimen);
      reference[id] = specimen;
    }
    entitySet(records, 'a', { ...entityGet(records, 'a')!, name: 'Replaced' });
    entityDelete(records, 'b');
    delete reference.b;
    entitySet(records, 'b', { ...structuredClone(entityGet(seed.entities, PLAYER_ID)!), id: 'b' });
    reference.b = true;
    expect(entityKeys(records)).toEqual(Object.keys(reference));
    validateEntityCollection(records);
    const malformed = structuredClone(records);
    Reflect.set(malformed.byOrder!, 'left', malformed.byOrder);
    expect(() => validateEntityCollection(malformed)).toThrow('Invalid ordered records');
  });

  it('retains edits through tree insertion and keeps nested children independent', () => {
    const base = freezeWorld(createWorld()),
      parent = draftWorld(base);
    entityGet(parent.entities, PLAYER_ID)!.name = 'Parent change';
    const first = draftWorld(parent),
      second = draftWorld(parent);
    entityGet(first.entities, PLAYER_ID)!.name = 'Discarded child';
    entitySet(second.entities, 'new-resident', {
      ...structuredClone(entityGet(base.entities, NPC_ID)!),
      id: 'new-resident',
    });
    entityGet(second.entities, PLAYER_ID)!.description = 'Second edit after insertion';
    const accepted = freezeWorld(finishWorld(second));
    finishWorld(first);
    expect(entityGet(parent.entities, PLAYER_ID)!.name).toBe('Parent change');
    expect(entityGet(accepted.entities, PLAYER_ID)!.name).toBe('Parent change');
    expect(entityGet(accepted.entities, PLAYER_ID)!.description).toBe(
      'Second edit after insertion',
    );
    expect(entityGet(accepted.entities, NPC_ID)).toBe(entityGet(base.entities, NPC_ID));
    expect(entityGet(base.entities, 'new-resident')).toBeUndefined();
    expect(changedEntityIds(accepted)?.has('new-resident')).toBe(true);
    const finalized = freezeWorld(finishWorld(parent));
    expect(entityGet(finalized.entities, PLAYER_ID)!.name).toBe('Parent change');
    expect(changedEntityIds(finalized)?.has(PLAYER_ID)).toBe(true);
  });

  it('treats a replaced collection and a nested child as unknown changes until actual publication', () => {
    const base = freezeWorld(createWorld()),
      parent = draftWorld(base);
    const replacement = cloneEntities(parent.entities);
    entitySet(replacement, 'replacement-animal', {
      ...structuredClone(entityGet(base.entities, 'hare-1')!),
      id: 'replacement-animal',
    });
    entitySet(replacement, PLAYER_ID, {
      ...entityGet(replacement, PLAYER_ID)!,
      name: 'Replacement edit',
    });
    parent.entities = replacement;
    expect(changedDraftEntityIds(parent)).toBeUndefined();
    expect(sensoryDraftWrites(parent).complete).toBe(false);
    const child = draftWorld(parent);
    entityGet(child.entities, PLAYER_ID)!.description = 'Nested continuation';
    const publishedChild = finishWorld(child);
    expect(entityGet(publishedChild.entities, 'replacement-animal')).toBeDefined();
    const publishedParent = finishWorld(parent);
    expect(changedEntityIds(publishedParent)?.has('replacement-animal')).toBe(true);
    expect(entityGet(base.entities, 'replacement-animal')).toBeUndefined();
  });

  it('pauses one animal wait during incapacity and preserves an overdue one-intention remainder', () => {
    const world = stockedCamp(),
      hare = entityGet(world.entities, 'hare-1')!;
    hare.animal!.wander = { remainingSeconds: 150 };
    reconcileAnimalWander(world, hare);
    world.simTime += 60;
    expect(animalWanderRemaining(world, hare)).toBe(90);
    hare.actor!.incapacitated = true;
    reconcileAnimalWander(world, hare);
    world.simTime += 1000;
    expect(animalWanderRemaining(world, hare)).toBe(90);
    hare.actor!.incapacitated = false;
    reconcileAnimalWander(world, hare);
    world.simTime += 500;
    const prior = animalWanderRemaining(world, hare)!;
    const reference = structuredClone(world);
    nextRandom(reference);
    const wait = 120 + Math.floor(nextRandom(reference) * 120);
    nativeWanderRoute(world, hare);
    expect(world.rngState).toBe(reference.rngState);
    expect(animalWanderRemaining(world, hare)).toBe(prior + wait);
    expect(animalWanderRemaining(world, hare)).toBeLessThan(0);
  });

  it('keeps waiting clocks and older snapshots independent through current JSON restoration', () => {
    const world = stockedCamp(),
      hare = entityGet(world.entities, 'hare-1')!;
    reconcileAnimalWander(world, hare);
    const restored = JSON.parse(JSON.stringify(world)) as typeof world;
    const originalWait = animalWanderRemaining(world, hare);
    restored.simTime += 20;
    expect(animalWanderRemaining(restored, entityGet(restored.entities, hare.id)!)).toBe(
      originalWait! - 20,
    );
    expect(animalWanderRemaining(world, hare)).toBe(originalWait);
  });

  it('selects due animals in the original tied order and forks large-clock preparation independently', () => {
    const world = stockedCamp();
    world.simTime = 2 ** 40;
    const animal = entityGet(world.entities, 'hare-1')!;
    const ids = ['animal-z', 'animal-a'];
    for (const id of ids) {
      const specimen = { ...structuredClone(animal), id };
      specimen.animal!.wander = { dueAt: world.simTime + 1 };
      entitySet(world.entities, id, specimen);
    }
    const queue = new AnimalWorkQueue();
    queue.synchronize(world, ids);
    const preparation = queue.snapshot();
    world.simTime += 0.5;
    expect(queue.due(world, 0.5)).toEqual([]);
    world.simTime += 0.5;
    expect(queue.due(world, 0.5)).toEqual(['animal-a', 'animal-z']);
    const reference = structuredClone(world);
    for (const id of ['animal-a', 'animal-z']) {
      nextRandom(reference);
      const wait = 120 + Math.floor(nextRandom(reference) * 120);
      nativeWanderRoute(world, entityGet(world.entities, id)!);
      expect(animalWanderRemaining(world, entityGet(world.entities, id)!)).toBe(wait);
    }
    expect(world.rngState).toBe(reference.rngState);
    queue.synchronize(world, ids);
    expect(queue.due(world, 0)).toEqual([]);
    expect(new AnimalWorkQueue(preparation).due(world, 0)).toEqual(['animal-a', 'animal-z']);
  });

  it('retains serial subtraction when a large clock cannot represent a short animal wait', () => {
    const world = stockedCamp(),
      animal = entityGet(world.entities, 'hare-1')!;
    world.simTime = 2 ** 40;
    const wait = 0.0001;
    expect(world.simTime + wait).toBe(world.simTime);
    animal.animal!.wander = { remainingSeconds: wait };
    reconcileAnimalWander(world, animal);
    expect(animal.animal!.wander).toEqual({ remainingSeconds: wait, running: true });
    advanceAnimalWanderClock(animal, 0.00005);
    expect(animalWanderRemaining(world, animal)).toBe(wait - 0.00005);
    const queue = new AnimalWorkQueue();
    queue.synchronize(world, [animal.id]);
    expect(queue.due(world, 0.00005)).toEqual([]);
    animal.actor!.incapacitated = true;
    reconcileAnimalWander(world, animal);
    advanceAnimalWanderClock(animal, 100);
    expect(animalWanderRemaining(world, animal)).toBe(wait - 0.00005);
    animal.actor!.incapacitated = false;
    reconcileAnimalWander(world, animal);
    advanceAnimalWanderClock(animal, 0.00006);
    queue.synchronize(world, [animal.id]);
    expect(queue.due(world, 0.00006)).toEqual([animal.id]);
    const reference = structuredClone(world);
    nextRandom(reference);
    const nextWait = 120 + Math.floor(nextRandom(reference) * 120);
    nativeWanderRoute(world, animal);
    expect(animalWanderRemaining(world, animal)).toBe(wait - 0.00005 - 0.00006 + nextWait);
    expect(world.rngState).toBe(reference.rngState);
  });

  it('publishes wet materials changed after capture and updates transfer/retirement membership', () => {
    const seed = createWorld();
    const id = createItemLot(seed, PLAYER_ID, 'weather_cloth', 1);
    const base = freezeWorld(seed),
      world = draftWorld(base);
    expect(exposedMaterialIds(world)).toContain(id);
    expect(exposedMaterialIds(world, true)).not.toContain(id);
    captureMaterialExposure(world);
    const family = flexibleAssemblyFamily(
      world,
      world.itemDefinitions.weather_cloth!.assemblyMaterial!.familyId,
    )!;
    const moisture = attributeDefinition(world, family.moistureAttribute)!;
    setAttribute(world, entityGet(world.entities, id)!, moisture, 0.6, [], 'transition', {
      silent: true,
    });
    expect(exposedMaterialIds(world, true)).toContain(id);
    const published = freezeWorld(finishWorld(world));
    expect(exposedMaterialIds(published, true)).toContain(id);
    expect(exposedMaterialIds(base, true)).not.toContain(id);
    const transferred = draftWorld(published);
    moveLot(transferred, id, NPC_ID, 1, 'test transfer', false);
    expect(exposedMaterialIds(transferred).filter((candidate) => candidate === id)).toHaveLength(1);
    setAttribute(transferred, entityGet(transferred.entities, id)!, moisture, 0, [], 'transition', {
      silent: true,
    });
    expect(() => retireItem(transferred, id, 'test retirement')).toThrow('active state');
    const fiber = createItemLot(transferred, NPC_ID, 'prepared_fiber', 1);
    expect(exposedMaterialIds(transferred)).toContain(fiber);
    retireItem(transferred, fiber, 'test retirement');
    expect(exposedMaterialIds(transferred)).not.toContain(fiber);
    expect(exposedMaterialIds(published)).toContain(id);
  });

  it('shares only equal material footprints and keeps clock-only rain/drying current', () => {
    const world = createWorld();
    const first = createItemLot(world, PLAYER_ID, 'weather_cloth', 1);
    const second = createItemLot(world, PLAYER_ID, 'weather_cloth', 1);
    world.finiteRain = {
      family: world.constructionProfile!.family,
      minX: -1000,
      maxX: 1000,
      minZ: -1000,
      maxZ: 1000,
      startsAt: 1,
      endsAt: 5,
      intensity: 1,
    };
    expect(captureMaterialExposure(world).materials.some((sample) => sample.id === first)).toBe(
      false,
    );
    world.simTime = 1;
    const raining = captureMaterialExposure(world);
    const left = raining.materials.find((sample) => sample.id === first)!;
    const right = raining.materials.find((sample) => sample.id === second)!;
    expect(left.footprint).toBe(right.footprint);
    result(integrateMaterialExposure(world, raining, 2, []));
    const moisture = attributeDefinition(world, left.family.moistureAttribute)!;
    const wet = entityGet(world.entities, first)!.attributes![moisture.id]!.value as number;
    expect(wet).toBeGreaterThan(0);
    expect(entityGet(world.entities, second)!.attributes![moisture.id]!.value).toBe(wet);
    world.simTime = 5;
    const drying = captureMaterialExposure(world);
    expect(drying.materials.some((sample) => sample.id === first)).toBe(true);
    result(integrateMaterialExposure(world, drying, left.family.dryingSeconds * 2, []));
    expect(entityGet(world.entities, first)!.attributes![moisture.id]!.value).toBe(0);
    expect(captureMaterialExposure(world).materials.some((sample) => sample.id === first)).toBe(
      false,
    );
  });

  it('keeps former observers in a changed target departure and rebuilds a moved observer', () => {
    const seed = createWorld(),
      observer = entityGet(seed.entities, PLAYER_ID)!,
      target = entityGet(seed.entities, 'hare-1')!;
    const position = worldPosition(observer);
    setSpatialPosition(seed, target, { ...position, x: position.x + 2 }, 'terrain');
    (seed.visiblePeople ??= {})[PLAYER_ID] = [target.id];
    const first = draftWorld(freezeWorld(seed));
    result(prepareExposure(first, snapshotEncounters(seed)));
    // This fixture owns immediate publication, as the native completion path does.
    const warm = freezeWorld(finishWorld(first), { completedTransition: true });
    const moved = draftWorld(warm),
      baseline = snapshotEncounters(warm);
    setSpatialPosition(
      moved,
      entityGet(moved.entities, target.id)!,
      { ...position, x: position.x + 200 },
      'terrain',
    );
    const frame = result(prepareExposure(moved, baseline));
    expect(frame.affected.has(PLAYER_ID)).toBe(true);
    expect(frame.changedPeople(PLAYER_ID)?.has(target.id)).toBe(true);
    const current = freezeWorld(finishWorld(moved), { completedTransition: true });
    const shifted = draftWorld(current),
      before = snapshotEncounters(current);
    setSpatialPosition(
      shifted,
      entityGet(shifted.entities, PLAYER_ID)!,
      { ...position, z: position.z + 1 },
      'terrain',
    );
    expect(result(prepareExposure(shifted, before)).changedPeople(PLAYER_ID)).toBeUndefined();
    const fork = draftWorld(warm);
    expect(
      result(prepareExposure(fork, snapshotEncounters(warm))).changedPeople(PLAYER_ID),
    ).toBeUndefined();
  });

  it('matches direct status stepping with retained flow preparation and rejects a replaced episode', () => {
    const seed = createWorld();
    seed.paused = false;
    entityGet(seed.entities, PLAYER_ID)!.actor!.attributes!['wilderness:energy']!.value = 40;
    const started = executeCommand(seed, {
      id: 'overhaul-rest',
      actorId: PLAYER_ID,
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      targetId: PLAYER_ID,
      operation: 'activate',
    });
    expect(started.outcome.ok).toBe(true);
    const frozen = freezeWorld(started.world),
      preparedWorld = draftWorld(frozen),
      directWorld = draftWorld(frozen);
    const intervals = prepareStatusRates(
      preparedWorld,
      entityGet(preparedWorld.entities, PLAYER_ID)!,
    );
    const drains: [] = [];
    const prepared = prepareStatusIntegration(preparedWorld, intervals, drains);
    for (const seconds of [0.15, 1.2, 3.9]) {
      integrateStatusRates(preparedWorld, intervals, seconds, [], drains, false, prepared);
      integrateStatusRates(directWorld, intervals, seconds, [], drains);
    }
    expect(preparedWorld.simTime).toBe(frozen.simTime);
    expect(finishWorld(preparedWorld)).toEqual(finishWorld(directWorld));
    const replaced = draftWorld(frozen);
    for (const interval of intervals)
      entityGet(replaced.entities, PLAYER_ID)!.statusEffects![interval.definition.id]!.episode =
        'different-episode';
    const value = entityGet(replaced.entities, PLAYER_ID)!.actor!.attributes!['wilderness:energy']!
      .value;
    integrateStatusRates(replaced, intervals, 10, [], drains, false, prepared);
    expect(
      entityGet(replaced.entities, PLAYER_ID)!.actor!.attributes!['wilderness:energy']!.value,
    ).toBe(value);
  });
});
