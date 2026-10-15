import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NPC_ID } from '@open-legend/domain';
import type { AiClient, AiResult, JudgeRequest, JudgeValue } from '@open-legend/ai';
import { appendMemory } from '../../../packages/domain/src/events.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { editWorld, enterLocalWorld } from '../../../tests/fixtures/service.js';
import { AiDirector } from './ai-director.js';
import { WorldService } from './world-service.js';

function barrier() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function nativeDecision(request: JudgeRequest): AiResult<JudgeValue> {
  return {
    outcome: 'value',
    value: {
      answers: Object.fromEntries(
        Object.entries(request.questions).map(([id, question]) => {
          if (question.type === 'noul') return [id, { type: 'noul', noul: 0.1 }];
          if (question.type !== 'choice') throw new Error('Unexpected fixture rating kind');
          const options = Object.keys(question.criteria);
          const selected = options.includes('native')
            ? 'native'
            : options.includes('no')
              ? 'no'
              : options[0]!;
          return [
            id,
            {
              type: 'choice',
              choice: selected,
              confidence: 1,
              probabilities: Object.fromEntries(
                options.map((option) => [option, Number(option === selected)]),
              ),
            },
          ];
        }),
      ),
    },
    receipt: {
      requestId: request.requestId,
      provider: 'jev',
      requestedModel: 'fixture',
      model: 'fixture',
      modelVersionStatus: 'reported',
      contextDigest: 'fixture',
      startedAt: new Date(0).toISOString(),
      completedAt: new Date(1).toISOString(),
      latencyMs: 1,
      dispatched: false,
      completionUncertain: false,
      estimatedCostUsd: 0,
    },
  };
}
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

async function setup(config: NodeJS.ProcessEnv = {}) {
  const clock = { now: 10_000 };
  const directory = mkdtempSync(join(tmpdir(), 'openlegend-cognition-fixture-'));
  const store = await testRepository(directory);
  const service = new WorldService(
    store,
    readConfig({
      TYPESAFE_API_KEY: 'injected-fixture',
      AI_JEV_ONLY: 'true',
      AI_BUDGET_USD: '1',
      OPEN_LEGEND_GOD_MODE: 'true',
      ...config,
    }),
    () => clock.now,
  );
  await enterLocalWorld(service);
  await service.setPresence('durability-fixture', true);
  await service.control({ paused: false });
  const memoryId = await editWorld(service, (world) => {
    for (const entity of Object.values(world.entities))
      if (entity.actor && entity.id !== NPC_ID) entity.actor.controller = 'player';
    return appendMemory(world, NPC_ID, {
      kind: 'episode',
      source: 'observed',
      summary: 'A retained fixture observation.',
      entityIds: [],
      importance: 8,
    })!;
  });
  const calls: JudgeRequest[] = [];
  let respond = async (request: JudgeRequest) => nativeDecision(request);
  const client: AiClient = {
    judge: async (request) => {
      calls.push(request);
      return respond(request);
    },
    generate: async () => {
      throw new Error('Generation must not run in this fixture');
    },
  };
  const director = new AiDirector(service, client, () => clock.now);
  cleanup.push(async () => {
    await director.close();
    service.releaseHostWork();
    await store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const scheduleKey = `semantic-schedule:${service.world.id}:${NPC_ID}`;
  return {
    directory,
    client,
    store,
    service,
    director,
    clock,
    calls,
    memoryId,
    scheduleKey,
    respond: (next: typeof respond) => {
      respond = next;
    },
  };
}

describe('durable character decision admission', () => {
  it.each(['cancel', 'close'] as const)(
    'does not start maintenance after %s during its admission write',
    async (ending) => {
      const h = await setup({
        AI_JEV_ONLY: 'false',
        MACROFOLD_API_KEY: 'injected-fixture',
        AI_BUDGET_USD: '0',
      });
      h.clock.now = 70_000;
      await h.service.setPresence('durability-fixture', true);
      await h.service.control({ paused: false });
      const maintenance = h.director['maintenance'];
      await maintenance.enqueue(NPC_ID, 'fixture', 'Current experience', h.service.generation);
      const started = barrier(),
        released = barrier();
      const original = h.store.putIntegration.bind(h.store);
      const jobs = vi.spyOn(h.store, 'putJob');
      vi.spyOn(h.store, 'putIntegration').mockImplementation(async (key, value) => {
        await original(key, value);
        if (key === `maintenance-at:${h.service.world.id}:${NPC_ID}`) {
          started.resolve();
          await released.promise;
        }
      });
      const scheduling = maintenance.tick(false);
      await Promise.race([
        started.promise,
        scheduling.then(() => {
          throw new Error('Scheduling returned before the held admission write.');
        }),
      ]);
      const stopped = ending === 'close' ? maintenance.close() : maintenance.cancel();
      released.resolve();
      await scheduling;
      await stopped;
      expect(jobs).not.toHaveBeenCalled();
      expect(maintenance['active']).toBeNull();
      expect(h.calls).toEqual([]);
    },
  );

  it('does not let an abandoned maintenance read consume a restored reflection request', async () => {
    const h = await setup({
      AI_JEV_ONLY: 'false',
      MACROFOLD_API_KEY: 'injected-fixture',
      AI_BUDGET_USD: '0',
    });
    h.clock.now = 70_000;
    await h.service.setPresence('durability-fixture', true);
    await h.service.control({ paused: false });
    const saveId = randomUUID();
    await h.service.createSave('Maintenance fixture', saveId);
    const payload = await h.store.saves.read(h.service.world.id, saveId);
    const maintenance = h.director['maintenance'];
    const queueKey = `reflection-queue:${h.service.world.id}:${NPC_ID}`;
    const attemptKey = `reflection-attempt:${h.service.world.id}:${NPC_ID}`;
    await maintenance.enqueue(NPC_ID, 'before-restore', 'Earlier experience', h.service.generation);
    const started = barrier(),
      released = barrier();
    const original = h.store.getIntegration.bind(h.store);
    vi.spyOn(h.store, 'getIntegration').mockImplementation(async (key) => {
      const value = await original(key);
      if (key === attemptKey) {
        started.resolve();
        await released.promise;
      }
      return value;
    });
    const scheduling = maintenance.tick(false);
    await Promise.race([
      started.promise,
      scheduling.then(() => {
        throw new Error('Scheduling returned before the held reflection-attempt read.');
      }),
    ]);
    try {
      await h.service.restoreSave(saveId, randomUUID(), payload);
      await maintenance.enqueue(
        NPC_ID,
        'after-restore',
        'Current experience',
        h.service.generation,
      );
    } finally {
      released.resolve();
    }
    await scheduling;
    expect(await h.store.getIntegration(queueKey)).toMatchObject({
      origin: 'after-restore',
      reason: 'Current experience',
    });
    expect(await h.store.getIntegration(attemptKey)).toBeUndefined();
    expect(h.calls).toEqual([]);
    await enterLocalWorld(h.service);
    await h.service.setPresence('durability-fixture', true);
    await h.service.control({ paused: false });
    await maintenance.tick(false);
    await maintenance['pending'];
    expect(await h.store.getIntegration(queueKey)).toBeNull();
    expect(await h.store.getIntegration(attemptKey)).toMatchObject({ day: 0 });
    expect(await h.store.getIntegration(`maintenance-at:${h.service.world.id}:${NPC_ID}`)).toBe(
      h.clock.now,
    );
    // Ordinary current work can start; the explicit zero allowance still prevents dispatch.
    expect(h.calls).toEqual([]);
  });

  it.each(['commit', 'failure'] as const)(
    'holds work through a delayed %s without blocking native progress',
    async (outcome) => {
      const h = await setup();
      const started = barrier(),
        released = barrier();
      const original = h.store.commit.bind(h.store);
      vi.spyOn(h.store, 'commit').mockImplementationOnce(async (...args) => {
        started.resolve();
        await released.promise;
        if (outcome === 'failure') {
          // A real error rolls back a disposable PostgreSQL transaction.
          return h.store.db.transaction(async () => {
            await h.store.db.prepare('SELECT 1 / 0').get();
            return 0;
          });
        }
        return original(...args);
      });
      h.clock.now += 1100;
      const ticking = h.service.tick(0.05);
      await started.promise;
      let waiting: Promise<unknown> | undefined;
      try {
        await ticking;
        const at = h.service.world.simTime;
        await h.director.considerThought();
        expect(h.calls).toHaveLength(0);
        expect(await h.store.getIntegration(h.scheduleKey)).toBeUndefined();
        h.clock.now += 50;
        await h.service.tick(0.05);
        expect(h.service.world.simTime).toBeGreaterThan(at);
        waiting = h.service.whenDurable().then(
          (mark) => mark,
          (error: unknown) => error,
        );
      } finally {
        released.resolve();
      }
      await waiting;
      if (outcome === 'failure') {
        expect(h.service.storageError).not.toBeNull();
        await h.director.considerThought();
        expect(h.calls).toHaveLength(0);
        expect(await h.store.getIntegration(h.scheduleKey)).toBeUndefined();
      } else {
        expect(h.service.storageError).toBeNull();
        await h.director.considerThought();
        await h.director.idle();
        expect(h.calls.length).toBeGreaterThan(0);
        const schedule = (await h.store.getIntegration(h.scheduleKey)) as { watermark?: number };
        expect(schedule.watermark).toBeGreaterThan(0);
        expect(schedule.watermark).toBeLessThanOrEqual(h.service.durable.nextId);
        const count = h.calls.length;
        await h.director.considerThought();
        await h.director.idle();
        expect(h.calls).toHaveLength(count);
      }
    },
  );

  it('does not reuse an abandoned timeline’s considered cursor or complete its held decision', async () => {
    const h = await setup();
    const saveId = randomUUID();
    await h.service.createSave('Durable fixture', saveId);
    const payload = await h.store.saves.read(h.service.world.id, saveId);
    await h.director.considerThought();
    await h.director.idle();
    expect(
      ((await h.store.getIntegration(h.scheduleKey)) as { watermark: number }).watermark,
    ).toBeGreaterThan(0);
    await editWorld(h.service, (world) =>
      appendMemory(world, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: 'Later fixture observation.',
        entityIds: [],
        importance: 8,
      }),
    );
    const started = barrier(),
      released = barrier();
    h.respond(async (request) => {
      started.resolve();
      await released.promise;
      return nativeDecision(request);
    });
    await h.director.considerThought();
    await started.promise;
    try {
      await h.service.restoreSave(saveId, randomUUID(), payload);
      expect(await h.store.getIntegration(h.scheduleKey)).toBeUndefined();
    } finally {
      released.resolve();
    }
    await h.director.idle();
    expect(await h.store.getIntegration(h.scheduleKey)).toBeUndefined();
    h.respond(async (request) => nativeDecision(request));
    await enterLocalWorld(h.service);
    await h.service.setPresence('durability-fixture', true);
    await h.service.control({ paused: false });
    const count = h.calls.length;
    await h.director.considerThought();
    await h.director.idle();
    expect(h.calls.length).toBeGreaterThan(count);
    const schedule = (await h.store.getIntegration(h.scheduleKey)) as { watermark: number };
    expect(schedule.watermark).toBeLessThanOrEqual(h.service.durable.nextId);
  });
  it('reconstructs pending committed evidence after restarting without an in-memory wake', async () => {
    const h = await setup();
    expect(await h.store.getIntegration(h.scheduleKey)).toBeUndefined();
    await h.director.close();
    h.service.releaseHostWork();
    await h.store.close();
    const store = await testRepository(h.directory);
    const service = new WorldService(
      store,
      readConfig({
        TYPESAFE_API_KEY: 'injected-fixture',
        AI_JEV_ONLY: 'true',
        AI_BUDGET_USD: '1',
        OPEN_LEGEND_GOD_MODE: 'true',
      }),
      () => h.clock.now,
    );
    await enterLocalWorld(service);
    await service.setPresence('restarted-fixture', true);
    await service.control({ paused: false });
    const director = new AiDirector(service, h.client, () => h.clock.now);
    cleanup.unshift(async () => {
      await director.close();
      service.releaseHostWork();
      await store.close();
    });
    await director.considerThought();
    await director.idle();
    expect(h.calls.length).toBeGreaterThan(0);
    const schedule = (await store.getIntegration(h.scheduleKey)) as { watermark: number };
    expect(schedule.watermark).toBeGreaterThan(0);
    expect(schedule.watermark).toBeLessThanOrEqual(service.durable.nextId);
  });
});
