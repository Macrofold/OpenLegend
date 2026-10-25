import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { afterEach, expect, it, vi } from 'vitest';
import { readConfig } from '../../../tests/fixtures/database.js';
import { SqlGameRepository, type JobRecord } from './store.js';
import { projectView } from './view.js';
import { WorldService } from './world-service.js';
import {
  currentBodyObservation,
  entityGet,
  entityValues,
  initializePerception,
  projectAttributes,
} from '@open-legend/domain';
import { currentContactReference } from './public-contact-references.js';
import { draftWorld, finishWorld, freezeWorld } from '../../../packages/domain/src/draft.js';
import { editWorld } from '../../../tests/fixtures/service.js';
import { reconcileConditions } from '../../../packages/domain/src/conditions.js';
import { attachCapabilityContribution } from '../../../packages/domain/src/state-contributions.js';
import {
  integrateStatusRates,
  prepareStatusRates,
  reconcileStatusEffects,
} from '../../../packages/domain/src/status-effects.js';

const stores: SqlGameRepository[] = [];

afterEach(async () => {
  await Promise.all(stores.splice(0).map(async (store) => await store.close()));
});

it('refreshes public visibility when a fixed perception restriction expires without an entity write', async () => {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(store, readConfig({}));
  await enterLocalWorld(service);
  await service.setPresence('current-visibility-view', true);
  await service.control({ paused: false });
  const definitionId = 'fixture:temporary-blindness';
  await editWorld(service, (world) => {
    world.statusEffectPolicy.definitions.push({
      id: definitionId,
      type: 'statusEffect',
      target: '$subject',
      label: 'Temporarily unable to see',
      enabled: true,
      requires: { all: [] },
      reactivationDelaySeconds: 0,
      occupiesAction: false,
      interruptOn: [],
      whileActive: [{ restrictCapabilities: { target: '$subject', capabilities: ['perception'] } }],
      contribution: { disclosure: 'owner', lifetime: 'fixed', seconds: 10 },
    });
  });
  const result = await service.transition((world) =>
    attachCapabilityContribution(world, {
      id: 'fixture:blindness',
      sourceId: PLAYER_ID,
      targetId: PLAYER_ID,
      definitionId,
      expectedPolicyRevision: world.statusEffectPolicy.revision,
      lifetime: { kind: 'fixed', expiresAt: world.simTime + 1 },
    }),
  );
  expect(result.ok, result.message).toBe(true);
  const before = await projectView(service);
  expect(currentBodyObservation(service.world, PLAYER_ID, NPC_ID)).toBeUndefined();
  expect(before.entities.some((entity) => entity.id === NPC_ID)).toBe(false);
  const anchor = service.world;
  const resumed = draftWorld(anchor);
  resumed.simTime += 2;
  initializePerception(resumed, []);
  const expired = freezeWorld(finishWorld(resumed));
  expect(expired.entities).toBe(anchor.entities);
  const read = vi.spyOn(service, 'world', 'get').mockReturnValue(expired);
  try {
    const after = await projectView(service);
    const contact = currentContactReference(
      expired,
      service.localScope,
      entityGet(expired.entities, NPC_ID)!,
    );
    expect(after.entities.some((entity) => entity.id === contact)).toBe(true);
  } finally {
    read.mockRestore();
  }
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
      replyReason: 'You moved out of hearing range before Ada could answer.',
      retryable: false,
    });

  await store.putJob({ ...base, status: 'failed', message: 'Provider failed.' });
  service.notify();
  await expect
    .poll(async () => (await projectView(service)).conversation.at(-1))
    .toMatchObject({
      replyStatus: 'failed',
      replyReason: 'Provider failed.',
    });
});

it('refreshes public meters when exact native progress retains an unchanged actor record', async () => {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(store, readConfig({}), () => 1_800_000_000_000);
  await enterLocalWorld(service);
  await service.setPresence('current-meter-view', true);
  await service.control({ paused: false });
  const attributeId = 'wilderness:fullness';
  await editWorld(service, (world) => {
    // An authored world may make a numeric meter public. The bundled world's
    // private food disclosure remains unchanged outside this controlled fixture.
    world.moduleManifest.definitions.find(
      (definition) => definition.id === attributeId,
    )!.disclosure = 'public';
    for (const entity of entityValues(world.entities)) {
      const attribute = entity.actor?.attributes?.[attributeId];
      if (!attribute) continue;
      attribute.value = 76;
      reconcileStatusEffects(world, entity, []);
      reconcileConditions(world, entity, []);
    }
    initializePerception(world, []);
  });
  const anchor = entityGet(service.world.entities, NPC_ID)!;
  const before = await projectView(service);
  const oldValue = before.entities
    .find(
      (entity) => entity.id === currentContactReference(service.world, service.localScope, anchor),
    )!
    .attributes!.find((attribute) => attribute.id === attributeId)!.value;
  // Isolate the real retained family. Ordinary ticks also change energy eagerly,
  // replacing this actor and hiding a missing retained-window cache dependency.
  const world = draftWorld(service.world, { retainNativeValues: true });
  const intervals = prepareStatusRates(world, entityGet(world.entities, NPC_ID)!).filter(
    (interval) => interval.definition.id === 'wilderness:metabolism',
  );
  world.simTime += 0.13;
  integrateStatusRates(world, intervals, 0.13, [], [], false, undefined, true);
  initializePerception(world, []);
  const observed = freezeWorld(finishWorld(world));
  expect(observed.pendingNativeIntegration).toBeDefined();
  expect(entityGet(observed.entities, NPC_ID)!.actor).toBe(anchor.actor);
  const read = vi.spyOn(service, 'world', 'get').mockReturnValue(observed);
  try {
    const after = await projectView(service);
    const current = after.entities.find(
      (entity) =>
        entity.id ===
        currentContactReference(
          observed,
          service.localScope,
          entityGet(observed.entities, NPC_ID)!,
        ),
    )!.attributes!;
    expect(current).toEqual(
      projectAttributes(observed, entityGet(observed.entities, NPC_ID)!, 'public'),
    );
    expect(current.find((attribute) => attribute.id === attributeId)!.value).toBeLessThan(
      Number(oldValue),
    );
  } finally {
    read.mockRestore();
  }
});
