import { afterEach, expect, it, vi } from 'vitest';
import {
  PLAYER_ID,
  NPC_ID,
  entityGet,
  initializePerception,
  setSpatialPosition,
  worldSupport,
  worldPosition,
  executeCommand,
  appendTemporalReceipt,
  selectedTemporalPolicy,
} from '@open-legend/domain';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld, useNearCampSight } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { memoryHistory } from './memory-history.js';
import { resolveRecentObservationReference } from './recent-history.js';
import { RecallService } from './recall.js';
import { IntelligenceLog } from './intelligence-log.js';
import { prepareDecision } from './decision-context.js';
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});
it('lets the owner read exact acquired recent positions without revealing an unknown name', async () => {
  const store = await testRepository(),
    service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('recent-reader', true);
  await editWorld(service, (world) => {
    const player = entityGet(world.entities, PLAYER_ID)!,
      other = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, worldSupport(player));
    setSpatialPosition(world, other, { x: 3, y: 0, z: 2 }, worldSupport(other));
    other.name = 'Hidden secret name';
    initializePerception(world, []);
  });
  await editWorld(service, (world) => {
    world.simTime += 1;
    const other = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, other, { x: 4, y: 0, z: 2 }, worldSupport(other), {
      continuity: 'physical',
    });
    initializePerception(world, []);
  });
  const page = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
  expect(page.entries.some((entry) => entry.text.includes('(4, 0, 2)'))).toBe(true);
  expect(
    page.entries.every((entry) => entry.sourceKind === 'observation' && entry.fidelity === 'exact'),
  ).toBe(true);
  expect(JSON.stringify(page)).not.toContain('Hidden secret name');
  const token = page.entries.at(-1)!.editReference!;
  expect(
    resolveRecentObservationReference(service, PLAYER_ID, service.localScope, token).actorId,
  ).toBe(PLAYER_ID);
  expect(() =>
    resolveRecentObservationReference(service, NPC_ID, service.localScope, token),
  ).toThrow();
  expect(() =>
    resolveRecentObservationReference(
      service,
      PLAYER_ID,
      { ...service.localScope, accountId: 'unrelated-account' },
      token,
    ),
  ).toThrow();
  const forgotten = await service.forgetRecentObservation(
    resolveRecentObservationReference(service, PLAYER_ID, service.localScope, token),
  );
  expect(forgotten.ok).toBe(true);
  const after = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
  expect(after.entries.some((entry) => entry.id === page.entries.at(-1)!.id)).toBe(false);
  await expect(
    memoryHistory(
      service,
      NPC_ID,
      { ...service.localScope, accountId: 'unrelated-account' },
      { recent: true },
    ),
  ).rejects.toThrow();
});

it('persists receipt-only native movement before immediate recent browsing and decision validation', async () => {
  const store = await testRepository(),
    service = new WorldService(
      store,
      readConfig({ OPEN_LEGEND_GOD_MODE: 'true', AI_BUDGET_USD: '0' }),
      () => 1800000000000,
    );
  const log = new IntelligenceLog(store),
    recall = new RecallService(service, log);
  cleanup.push(async () => {
    await recall.close();
    await log.close();
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('moving-recent-reader', true);
  await useNearCampSight(service);
  await editWorld(service, (world) => {
    const player = entityGet(world.entities, PLAYER_ID)!,
      other = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, worldSupport(player));
    setSpatialPosition(world, other, { x: 3, y: 0, z: 2 }, worldSupport(other));
    initializePerception(world, []);
  });
  expect(
    (
      await service.transition((world) =>
        executeCommand(world, {
          id: 'fixture-recent-moving',
          actorId: NPC_ID,
          type: 'move',
          destination: {
            x: 6,
            y: 0,
            z: 2,
            surfaceId: worldSupport(entityGet(world.entities, NPC_ID))!,
          },
        }),
      )
    ).ok,
  ).toBe(true);
  const before = service.world;
  // Reach the installed three-game-second sight sample; a held interval must
  // not invent an observation merely because the actor physically moved.
  await service.tick(0.05);
  expect(worldPosition(entityGet(service.world.entities, NPC_ID)!).x).toBeGreaterThan(3);
  expect(service.world.memories[PLAYER_ID]).toBe(before.memories[PLAYER_ID]);
  expect(service.world.experience!.awareness[PLAYER_ID]).toBe(
    before.experience!.awareness[PLAYER_ID],
  );
  expect(service.world.experience!.summaries[PLAYER_ID]).toBe(
    before.experience!.summaries[PLAYER_ID],
  );
  expect(service.world.experience!.temporal!.actors[PLAYER_ID]!.chunks).not.toBe(
    before.experience!.temporal!.actors[PLAYER_ID]!.chunks,
  );
  const durable = vi.spyOn(service, 'whenDurable');
  await service.flushMemorySources(PLAYER_ID, false);
  expect(durable).not.toHaveBeenCalled();
  const page = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
  expect(durable).toHaveBeenCalledTimes(1);
  expect(page.entries.some((entry) => entry.time > before.simTime)).toBe(true);
  const decision = await prepareDecision(
    service,
    recall,
    PLAYER_ID,
    'fixture-moving-context',
    'Observe current surroundings.',
    [],
    async () => {
      throw new Error('No semantic provider in this storage fixture');
    },
    new AbortController().signal,
    0,
    false,
    0,
    undefined,
    undefined,
    'native-only',
  );
  await expect(decision.validateConversation()).resolves.toBeUndefined();
  const head = await store.records.head();
  const selected = await store.memories.temporalHistory(
    { worldId: service.world.id, actorId: PLAYER_ID, generation: head!.generation },
    { from: before.simTime, bytes: 32768 },
    service.world,
  );
  expect(
    await store.memories.temporalSelectionsCurrent(
      { worldId: service.world.id, actorId: PLAYER_ID, generation: head!.generation },
      selected.entries,
    ),
  ).toBe(true);
});

it('keeps older observations reachable when a whole newest utterance exceeds the page allowance', async () => {
  const store = await testRepository(),
    service = new WorldService(store, readConfig());
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('large-recent-reader', true);
  expect((await service.control({ paused: false })).ok).toBe(true);
  expect(
    (await service.say('small-recent-speech', PLAYER_ID, 'An earlier small sentence.')).ok,
  ).toBe(true);
  expect((await service.say('large-recent-speech', PLAYER_ID, '界'.repeat(1200))).ok).toBe(true);
  let page = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
  let found = page.entries.some((entry) => entry.text.includes('An earlier small sentence.'));
  const cursors = new Set<string>();
  for (let i = 0; i < 8 && !found && page.next; i++) {
    expect(cursors.has(page.next)).toBe(false);
    cursors.add(page.next);
    page = await memoryHistory(service, PLAYER_ID, service.localScope, {
      recent: true,
      cursor: page.next,
    });
    found = page.entries.some((entry) => entry.text.includes('An earlier small sentence.'));
  }
  expect(found).toBe(true);
});

it('renders exact speech, measured location and geometry without a redundant prose event or private routing', async () => {
  const store = await testRepository(),
    service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
  cleanup.push(async () => {
    service.releaseHostWork();
    await store.close();
  });
  await enterLocalWorld(service);
  await service.setPresence('literal-recent-reader', true);
  const at = await editWorld(service, (world) => {
    world.simTime++;
    const at = world.simTime;
    appendTemporalReceipt(
      world,
      PLAYER_ID,
      {
        subject: 'fixture-literal-detail',
        change: 'occurrence',
        facets: [
          {
            role: 'direct',
            asOf: at,
            measuredFrom: at,
            measuredThrough: at,
            acquiredAt: at,
            value: {
              kind: 'speech',
              speech: {
                perception: 'heard',
                intelligibility: 'partial',
                segments: [
                  { kind: 'heard', text: 'Mind the edge' },
                  { kind: 'unintelligible' },
                  { kind: 'heard', text: 'please' },
                ],
                speaker: null,
                addressee: null,
                addressing: 'ambient',
                delivery: 'normal',
                direction: null,
                listenerPosition: { x: 1, y: 0, z: 2 },
              },
            },
          },
          {
            role: 'direct',
            asOf: at,
            measuredFrom: at,
            measuredThrough: at,
            acquiredAt: at,
            value: {
              kind: 'location',
              location: { kind: 'region', center: { x: 2, y: 0, z: 3 }, radius: 1 },
              frame: { positionAtObservation: { x: 1, y: 0, z: 2 } },
            },
          },
          {
            role: 'direct',
            asOf: at,
            measuredFrom: at,
            measuredThrough: at,
            acquiredAt: at,
            value: {
              kind: 'surface-patch',
              patch: {
                vertices: [
                  { x: 1, y: 0, z: 1 },
                  { x: 2, y: 0, z: 1 },
                  { x: 2, y: 0, z: 2 },
                  { x: 1, y: 0, z: 2 },
                ],
                normal: { x: 0, y: 1, z: 0 },
                errorRadius: 0.1,
                edges: ['coverage-limit', 'coverage-limit', 'coverage-limit', 'coverage-limit'],
                frame: { positionAtObservation: { x: 1, y: 0, z: 2 } },
              },
            },
          },
          {
            role: 'direct',
            asOf: at,
            measuredFrom: at,
            measuredThrough: at,
            acquiredAt: at,
            value: {
              kind: 'encounter-exposure',
              exposure: {
                kind: 'inventory-item',
                id: 'private-native-item',
                definition: { id: 'private-native-definition', version: 1 },
                label: 'Folded note',
                description: 'A small folded note.',
                introductionKey: 'private-native-introduction',
                inscription: 'Wait by the water.',
              },
            },
          },
        ],
      },
      selectedTemporalPolicy(world).recent,
    );
    return at;
  });
  const page = await memoryHistory(service, PLAYER_ID, service.localScope, { recent: true });
  const entry = page.entries.find((entry) => entry.time === at)!;
  expect(entry.text).toContain('Mind the edge […] please');
  expect(entry.text).toContain('(partly heard)');
  expect(entry.text).toContain('within 1 of (2, 0, 3)');
  expect(entry.text).toContain('Visible part of a surface');
  expect(entry.text).toContain('uncertainty 0.1');
  expect(entry.text).toContain('Inscription: Wait by the water.');
  expect(JSON.stringify(page)).not.toContain('private-native-');
  expect(() =>
    resolveRecentObservationReference(service, PLAYER_ID, service.localScope, 'malformed-token'),
  ).toThrow();
});
