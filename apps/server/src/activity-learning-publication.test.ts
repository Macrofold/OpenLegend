import { describe, expect, it } from 'vitest';
import {
  NPC_ID,
  createItemLot,
  entityGet,
  executeCommand,
  normalizeActivity,
} from '@open-legend/domain';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';

describe('activity-learning dispatch claims through the existing world writer', () => {
  it.each([false, true])(
    'does not save an identical claim twice (more=%s), while retaining current guards',
    async (more) => {
      const store = await testRepository();
      const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
      try {
        await enterLocalWorld(service);
        await service.setConnection('learning-fixture', true);
        await service.setPresence('learning-fixture', true);
        await service.control({ paused: false });
        await editWorld(service, (world) => {
          createItemLot(world, NPC_ID, 'berries', 2, 'learning-fixture-food');
          const fullness = entityGet(world.entities, NPC_ID)!.actor!.attributes![
            'wilderness:fullness'
          ];
          if (fullness) fullness.value = 20;
        });
        const ids = ['learning-fixture-first', 'learning-fixture-second'];
        for (const id of ids)
          expect(
            await service.transition((world) =>
              executeCommand(world, {
                id,
                actorId: NPC_ID,
                type: 'eat',
                itemId: 'learning-fixture-food',
              }),
            ),
          ).toMatchObject({ ok: true });
        const prepared = await service.prepareActivityLearning(NPC_ID);
        const entries = prepared.rows.filter(({ entry }) => ids.includes(entry.id));
        expect(entries).toHaveLength(2);
        const candidate = normalizeActivity(
          service.world,
          NPC_ID,
          entries.map(({ entry }) => entry),
        );
        expect(candidate).toBeDefined();
        if (!candidate) return;
        // Select this exact observed span for assessment; no model execution or
        // claim about voluntary learning/quality is part of this bookkeeping check.
        const batch = { ...prepared, candidates: [candidate], examined: ids, more };
        let checks = 0;
        const checkCurrent = () => {
          checks++;
        };
        const before = (await store.records.head())!.revision;
        expect(await service.publishActivityLearning(batch, [], true, checkCurrent)).toBe(true);
        const first = (await store.records.head())!.revision;
        expect(first).toBeGreaterThan(before);
        expect(service.world.actionExperience.learning[NPC_ID]!.assessed).toContain(
          candidate.signature,
        );
        const firstChecks = checks;
        expect(await service.publishActivityLearning(batch, [], true, checkCurrent)).toBe(true);
        expect((await store.records.head())!.revision).toBe(first);
        expect(checks).toBe(firstChecks + 2);

        await service.control({ paused: true });
        expect(await service.publishActivityLearning(batch, [], true, checkCurrent)).toBe(false);
        await service.control({ paused: false });
        expect(await service.forgetMemory(NPC_ID, ids[0]!, service.localScope)).toMatchObject({
          ok: true,
        });
        const revoked = (await store.records.head())!.revision;
        expect(await service.publishActivityLearning(batch, [], true, checkCurrent)).toBe(false);
        expect((await store.records.head())!.revision).toBe(revoked);
      } finally {
        service.releaseHostWork();
        await store.close();
      }
    },
  );
});
