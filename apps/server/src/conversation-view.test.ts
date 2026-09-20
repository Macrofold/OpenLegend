import { afterEach, expect, it } from 'vitest';
import { readConfig } from './config.js';
import { SqliteStore, type JobRecord } from './store.js';
import { projectView } from './view.js';
import { WorldService } from './world-service.js';

const stores: SqliteStore[] = [];

afterEach(async () => {
  await Promise.all(stores.splice(0).map(async (store) => await store.close()));
});

it('projects active, failed and interrupted reply outcomes on the originating speech', async () => {
  const store = new SqliteStore(':memory:');
  stores.push(store);
  const service = new WorldService(store, readConfig({}));
  await service.ready;
  await service.setConnection('conversation-view', true);
  await service.setPresence('conversation-view', true);
  expect((await service.say('player-turn', 'player', 'Hello Ada.', 'ada')).ok).toBe(true);
  const speech = [...service.world.events]
    .reverse()
    .find(
      (event) =>
        event.type === 'speech' &&
        event.actorId === 'player' &&
        event.data?.['text'] === 'Hello Ada.',
    )!;
  const base: JobRecord = {
    id: 'reply-job',
    kind: 'chat',
    status: 'queued',
    message: 'Ada is considering your words.',
    fingerprint: 'fixture-fingerprint',
    createdAt: 1,
    request: { text: 'Hello Ada.', npcId: 'ada' },
    playerSpeechEventId: speech.id,
  };

  await store.putJob(base);
  expect((await projectView(service)).conversation.at(-1)).toMatchObject({
    id: speech.id,
    replyStatus: 'queued',
  });

  await store.putJob({ ...base, status: 'completed', message: 'Ada replied.' });
  expect((await projectView(service)).conversation.at(-1)).toEqual(
    expect.not.objectContaining({ replyInterruption: expect.anything() }),
  );

  await store.putJob({
    ...base,
    status: 'stale',
    message: 'You moved out of hearing range before Ada could answer.',
  });
  expect((await projectView(service)).conversation.at(-1)).toMatchObject({
    replyStatus: 'stale',
    replyInterruption: 'You moved out of hearing range before Ada could answer.',
  });

  await store.putJob({ ...base, status: 'failed', message: 'Provider failed.' });
  expect((await projectView(service)).conversation.at(-1)).toMatchObject({
    replyStatus: 'failed',
    replyFailure: 'Provider failed.',
  });
  expect((await projectView(service)).conversation.at(-1)).toEqual(
    expect.not.objectContaining({ replyInterruption: expect.anything() }),
  );
});
