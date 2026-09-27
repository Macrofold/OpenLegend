import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { afterEach, expect, it } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { SqlGameRepository, type JobRecord } from './store.js';
import { projectView } from './view.js';
import { WorldService } from './world-service.js';

const stores: SqlGameRepository[] = [];

afterEach(async () => {
  await Promise.all(stores.splice(0).map(async (store) => await store.close()));
});

it('projects active, failed and interrupted reply outcomes on the originating speech', async () => {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(store, readConfig({}));
  await enterLocalWorld(service);
  await service.setConnection('conversation-view', true);
  await service.setPresence('conversation-view', true);
  expect((await service.say('player-turn', PLAYER_ID, 'Hello Ada.', NPC_ID)).ok).toBe(true);
  const speech = [...service.world.events]
    .reverse()
    .find(
      (event) =>
        event.type === 'speech' &&
        event.actorId === PLAYER_ID &&
        event.data?.['text'] === 'Hello Ada.',
    )!;
  const base: JobRecord = {
    id: 'reply-job',
    kind: 'chat',
    status: 'queued',
    message: 'Ada is considering your words.',
    fingerprint: 'fixture-fingerprint',
    createdAt: 1,
    request: { text: 'Hello Ada.', npcId: NPC_ID },
    playerSpeechEventId: speech.id,
  };

  await store.putJob(base);
  service.notify();
  await expect
    .poll(async () => (await projectView(service)).conversation.at(-1))
    .toMatchObject({
      id: speech.id,
      replyStatus: 'queued',
    });

  await store.putJob({
    ...base,
    status: 'stale',
    message: 'You moved out of hearing range before Ada could answer.',
  });
  service.notify();
  await expect
    .poll(async () => (await projectView(service)).conversation.at(-1))
    .toMatchObject({
      replyStatus: 'stale',
    });

  await store.putJob({ ...base, status: 'failed', message: 'Provider failed.' });
  service.notify();
  await expect
    .poll(async () => (await projectView(service)).conversation.at(-1))
    .toMatchObject({
      replyStatus: 'failed',
      replyFailure: 'Provider failed.',
    });
});
