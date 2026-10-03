import { afterEach, describe, expect, it } from 'vitest';
import { NPC_ID, type MemoryRecord, type WorldEvent } from '@open-legend/domain';
import { appendMemory, emit } from '../../../packages/domain/src/events.js';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import type { SqlGameRepository } from './store.js';

const stores = new Set<SqlGameRepository>();
afterEach(async () => {
  for (const store of stores) await store.close();
  stores.clear();
});
async function setup() {
  const store = await testRepository();
  stores.add(store);
  const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  await enterLocalWorld(service);
  await service.setPresence('fixture', true);
  expect((await service.control({ paused: false })).ok).toBe(true);
  return service;
}
async function addEvent(service: WorldService, text: string) {
  let id = '';
  const result = await service.transition((original) => {
    const world = structuredClone(original);
    const events: WorldEvent[] = [];
    id = emit(world, events, 'fixture-event', text, undefined, undefined, { significant: true }).id;
    return { world, events, outcome: { ok: true, code: 'fixture', message: 'Event added.' } };
  });
  expect(result.ok).toBe(true);
  return id;
}

describe('God editor three-way saves', () => {
  it('edits one memory without erasing a memory added while the editor was open, then rejects a same-entry stale edit', async () => {
    const service = await setup();
    await editWorld(service, (world) => {
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'internal',
        summary: 'First memory',
        importance: 2,
        entityIds: [],
      });
      world.memories[NPC_ID]!.push(
        ...Array.from({ length: 3_000 }, (_, index) => ({
          id: `mature-${index}`,
          actorId: NPC_ID,
          kind: 'episode' as const,
          source: 'internal' as const,
          summary: `Unchanged memory ${index}`,
          importance: 1,
          entityIds: [],
          at: world.simTime,
          sequence: 0,
        })),
      );
    });
    const memoryCount = async () => {
      const { records, memories } = service.store;
      if (!records || !memories) throw new Error('PostgreSQL history repositories are required.');
      const head = await records.head();
      if (!head) throw new Error('Missing committed world head.');
      return memories.count({
        worldId: service.world.id,
        actorId: NPC_ID,
        generation: head.generation,
      });
    };
    const baselineCount = await memoryCount();
    const opened = await service.personEditor(NPC_ID);
    if (!opened.ok || !('person' in opened)) throw new Error(opened.message);
    const first = opened.memories.find((entry) => entry.source === 'memory');
    expect(first).toBeDefined();
    const detail = await service.personMemoryJson(NPC_ID, first!.id);
    if (!detail.ok) throw new Error(detail.message);
    const replacement = JSON.parse(detail.json) as MemoryRecord;
    replacement.summary = 'Edited first memory';
    let laterId = '';
    await editWorld(service, (world) => {
      const before = new Set(world.memories[NPC_ID]?.map((entry) => entry.id));
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'internal',
        summary: 'Later memory',
        importance: 2,
        entityIds: [],
      });
      laterId = `memory:${world.memories[NPC_ID]!.find((entry) => !before.has(entry.id))!.id}`;
    });
    const change = {
      entryId: first!.id,
      expectedHash: detail.hash,
      replacement: { source: 'memory' as const, value: replacement },
    };
    const saved = await service.savePersonEditor(
      NPC_ID,
      opened.person,
      opened.person,
      [change],
      opened,
    );
    if (!saved.ok) throw new Error(JSON.stringify(saved));
    expect(await memoryCount()).toBe(baselineCount + 1);
    const refreshed = await service.personEditor(NPC_ID);
    if (!refreshed.ok || !('person' in refreshed)) throw new Error(refreshed.message);
    expect(refreshed.memories.some((entry) => entry.text === 'Edited first memory')).toBe(true);
    const later = await service.personMemoryJson(NPC_ID, laterId);
    if (!later.ok) throw new Error(later.message);
    expect(JSON.parse(later.json)).toMatchObject({ summary: 'Later memory' });
    expect(
      (await service.savePersonEditor(NPC_ID, opened.person, opened.person, [change], opened)).code,
    ).toBe('stale');
  });

  it('deletes one event without erasing a new event and rejects an edit to the deleted event', async () => {
    const service = await setup();
    const firstId = await addEvent(service, 'First editable event');
    const opened = await service.worldEventsEditor();
    const first = opened.events.find((entry) => entry.id === firstId);
    expect(first).toBeDefined();
    const laterId = await addEvent(service, 'Later simulation event');
    const change = { id: firstId, expectedHash: first!.hash, replacement: null };
    expect((await service.saveWorldEventsEditor([change])).ok).toBe(true);
    const refreshed = await service.worldEventsEditor();
    expect(refreshed.events.some((entry) => entry.id === firstId)).toBe(false);
    expect(refreshed.events.some((entry) => entry.id === laterId)).toBe(true);
    expect((await service.saveWorldEventsEditor([change])).code).toBe('stale');
  });
});
