import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { createItemLot, entityGet, entityKeys, inventoryFor, NPC_ID } from '@open-legend/domain';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { WorldService } from './world-service.js';

it('fences whole-world replacement and rolls back its canonical and derived deletion when installation fails', async () => {
  const world = stockedCamp(73);
  appendMemory(world, NPC_ID, {
    kind: 'episode',
    source: 'internal',
    summary: 'Retained before replacement.',
    entityIds: [],
    importance: 4,
  });
  const store = await testRepository(undefined, world);
  try {
    const before = await store.records.head();
    const counts = async () =>
      Promise.all(
        ['data_world', 'sim_entities', 'sim_placements', 'recall_sources'].map((table) =>
          store.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE world_id=?`).get(world.id),
        ),
      );
    const originalCounts = await counts();
    expect(originalCounts.every((row) => Number(row?.['n']) > 0)).toBe(true);
    const replacementId = randomUUID();
    await expect(
      store.db.transaction(() =>
        store.records.advance(replacementId, before!.revision, false, world.id),
      ),
    ).rejects.toThrow('restore admission');
    await expect(
      store.db.transaction(() =>
        store.records.advance(replacementId, before!.revision - 1, true, world.id),
      ),
    ).rejects.toThrow('another writer');
    await expect(
      store.db.transaction(async () => {
        await store.memories.releaseWorldSources(world.id);
        await store.records.advance(replacementId, before!.revision, true, world.id);
        throw new Error('Target installation refused.');
      }),
    ).rejects.toThrow('Target installation refused.');
    expect(await store.records.head()).toEqual(before);
    expect(await counts()).toEqual(originalCounts);
    expect((await store.records.load())?.state.world.id).toBe(world.id);
  } finally {
    await store.close();
  }
});

it('restores a checkpoint after equipped actors and their possessions span deletion batches, while preserving surviving children', async () => {
  const store = await testRepository(undefined, stockedCamp(73));
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  try {
    await enterLocalWorld(service);
    const resumed = await service.control({ paused: false, clientId: 'records-test' });
    expect(resumed.ok, resumed.message).toBe(true);
    const checkpointId = randomUUID();
    await service.createSave('Before equipped visitors', checkpointId);
    const initialIds = new Set(entityKeys(service.world.entities));
    const initialInventory = inventoryFor(service.world, NPC_ID);
    const actors: string[] = [];
    for (let index = 0; index < 3; index++) {
      const spawned = await service.spawn({
        id: randomUUID(),
        type: 'person',
        position: { x: 24 + index * 3, y: 0, z: 5, surfaceId: 'terrain' },
        person: {
          name: `Visitor ${index + 1}`,
          personality: 'Quiet and practical.',
          backstory: 'A traveler passing through.',
          traitIds: [],
          initialGoals: [],
        },
      });
      expect(spawned.ok, spawned.message).toBe(true);
      const actorId = spawned.entityId!;
      actors.push(actorId);
      const spear = await editWorld(service, (world) => createItemLot(world, actorId, 'spear', 1));
      const equipped = await service.operatorCommand(randomUUID(), actorId, {
        type: 'equip',
        itemId: spear,
      });
      expect(equipped.ok, equipped.message).toBe(true);
      expect(entityGet(service.world.entities, spear)?.placement).toMatchObject({
        mode: 'attached',
        parentEntityId: actorId,
      });
    }
    // Force a parent in the first deletion batch and its possessions in later
    // batches: detaching only the current batch would still violate the FK.
    await editWorld(service, (world) => {
      for (let index = 0; index < 801; index++) createItemLot(world, actors[0]!, 'stone', 1);
    });
    const addedIds = entityKeys(service.world.entities).filter((id) => !initialIds.has(id));
    expect(addedIds.length).toBeGreaterThan(800);
    await service.flush();
    const head = (await store.records.head())!;
    const parentId = String(
      (await store.db
        .prepare('SELECT id FROM sim_entities WHERE world_id=? AND entity_id=?')
        .get(service.world.id, actors[0]!))!['id'],
    );
    const parentPlacement = await store.db
      .prepare('SELECT * FROM sim_placements WHERE world_id=? AND entity_id=?')
      .get(service.world.id, actors[0]!);
    await expect(
      store.db.transaction(() =>
        store.records.write(service.world.id, head.revision + 1, {
          writes: new Map(),
          deletes: new Map([['sim_entities', [parentId]]]),
          rows: 1,
        }),
      ),
    ).rejects.toThrow('23503');
    expect(
      await store.db
        .prepare('SELECT * FROM sim_placements WHERE world_id=? AND entity_id=?')
        .get(service.world.id, actors[0]!),
    ).toEqual(parentPlacement);
    const saved = await store.saves.read(service.world.id, checkpointId);
    await service.restoreSave(checkpointId, randomUUID(), saved);
    expect(entityKeys(service.world.entities).sort()).toEqual([...initialIds].sort());
    expect(inventoryFor(service.world, NPC_ID)).toEqual(initialInventory);
    const loaded = (await store.records.load())!.state.world;
    expect(addedIds.every((id) => !entityGet(loaded.entities, id))).toBe(true);
    expect(inventoryFor(loaded, NPC_ID)).toEqual(initialInventory);
  } finally {
    service.releaseHostWork();
    await store.close();
  }
}, 60_000);
