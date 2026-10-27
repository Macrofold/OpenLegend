import { stockedCamp } from '../../../tests/fixtures/world.js';
import { entityGet, entityValues } from '@open-legend/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  advanceWorld,
  createWorld,
  sensesFor,
  executeCommand,
  inventoryFor,
  NPC_ID,
  PLAYER_ID,
  projectEventEvidence,
  type WorldState,
  type WorldEvent,
  initializePerception,
  setAttentionFocus,
  selectedTemporalPolicy,
  reviveActor,
  receivedScene,
  captureEvidenceCut,
  experienceEntry,
  queryMemories,
} from '@open-legend/domain';
import { applyBodyEffects } from '../../../packages/domain/src/living.js';
import { validateWorldModules } from '../../../packages/domain/src/world-modules.js';
import { canStand, supportBelow } from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition } from '../../../packages/domain/src/spatial-state.js';
import { seesEntity } from '../../../packages/domain/src/perception.js';
import { emit } from '../../../packages/domain/src/events.js';
import { createGodItem } from '../../../packages/domain/src/item-handling.js';
import { person, subjectNarration } from '../../../packages/domain/src/narration.js';
import { awarenessMemory } from '../../../packages/domain/src/experience.js';
import { readConfig, testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld, editWorld } from '../../../tests/fixtures/service.js';
import { WorldService } from './world-service.js';
import { readPerceivedEvents } from './perceived-events.js';
import { responseTriggerContext } from './response-context.js';
import { storyAccountSql, storySourceRow } from './personal-accounts.js';
import { receivedEventAccounts } from './received-event-accounts.js';
import { captureSituation, expandSituation } from './situation-context.js';
import { entityHandle, permittedSourceHandle } from './entity-references.js';

function place(world: WorldState, id: string, x: number, z = 2) {
  const entity = entityGet(world.entities, id)!;
  const point = supportBelow(world.map, { x, y: 10, z })!;
  expect(point).not.toBeNull();
  expect(canStand(world.map, point, bodyProfile(entity))).toBe(true);
  setSpatialPosition(world, entity, point, point.surfaceId);
}
function arrange(world: WorldState, targetId: string, visible: boolean) {
  world.paused = false;
  for (const entity of entityValues(world.entities)) {
    if (entity.actor && entity.id !== targetId) entity.actor.controller = 'player';
  }
  place(world, NPC_ID, visible ? 6 : 5);
  place(world, PLAYER_ID, 32.5);
  place(world, targetId, 33.5);
  expect(
    seesEntity(world, entityGet(world.entities, NPC_ID)!, entityGet(world.entities, PLAYER_ID)!),
  ).toBe(true);
  expect(
    seesEntity(world, entityGet(world.entities, NPC_ID)!, entityGet(world.entities, targetId)!),
  ).toBe(visible);
  initializePerception(world, []);
  const key = Object.entries(world.perceptionEvidence?.[NPC_ID]?.attention?.candidates ?? {}).find(
    ([, candidate]) => candidate.sourceId === PLAYER_ID,
  )?.[0];
  expect(key).toBeDefined();
  expect(setAttentionFocus(world, NPC_ID, [key!])).toBe(true);
}
function perform(world: WorldState, family: 'gather' | 'strike', visible: boolean) {
  const targetId = family === 'gather' ? 'branches' : 'mara';
  arrange(world, targetId, visible);
  const before = entityGet(world.entities, targetId)!.actor?.health;
  const admitted = executeCommand(
    world,
    family === 'gather'
      ? { id: 'disclosure-gather', actorId: PLAYER_ID, type: 'gather', targetId }
      : {
          id: 'disclosure-strike',
          actorId: PLAYER_ID,
          type: 'strike',
          targetId,
          definitionId: 'punch',
        },
  );
  expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
  // The arranged actor is already in reach; finish the installed work, not its former duration.
  const seconds =
    family === 'gather' ? entityGet(world.entities, targetId)!.resource!.workSeconds + 1 : 80;
  const completed = advanceWorld(admitted.world, seconds);
  const event = completed.events.find(
    (entry) => entry.type === (family === 'gather' ? 'gathered' : 'struck'),
  )!;
  expect(event).toBeDefined();
  if (family === 'gather') expect(event.data).toMatchObject({ definitionId: 'wood', quantity: 2 });
  else expect(entityGet(completed.world.entities, targetId)!.actor!.health).toBeLessThan(before!);
  return { ...completed, event, targetId, events: [...admitted.events, ...completed.events] };
}
function evidence(world: WorldState, event: WorldEvent, actorId = NPC_ID) {
  const account = receivedEventAccounts(world, actorId, new Set([event.id]), { current: true }).get(
    event.id,
  );
  return (account?.awareness ?? account?.projected)!;
}
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

describe('event-time observer facts', () => {
  it('keeps actually heard voice-like sound as finite sensory evidence without words or autobiographical memory', () => {
    const world = createWorld(73);
    // The real receiver hears a shout directly above it through the deck, without
    // an azimuth or visual sense; current sound must not depend on visual eligibility.
    setSpatialPosition(
      world,
      entityGet(world.entities, NPC_ID)!,
      { x: 20, y: 0, z: 5.5 },
      'terrain',
    );
    setSpatialPosition(
      world,
      entityGet(world.entities, PLAYER_ID)!,
      { x: 20, y: 3, z: 5.5 },
      'lookout-deck',
    );
    const actor = entityGet(world.entities, NPC_ID)!.actor!;
    actor.capabilities = {
      cognition: false,
      innerWorld: false,
      speech: false,
      memory: false,
      language: false,
    };
    actor.senses = sensesFor(world, entityGet(world.entities, NPC_ID)!)
      .filter((sense) => sense.implementation === 'hearing-db-v1')
      .map((sense) => sense.id);
    initializePerception(world, []);
    const result = executeCommand(world, {
      id: 'voice-only-current',
      actorId: PLAYER_ID,
      type: 'say',
      text: 'Unreceived private fixture words.',
      volume: 'shout',
    });
    expect(result.outcome.ok).toBe(true);
    const event = result.events.find((entry) => entry.type === 'speech')!;
    const acquired = evidence(result.world, event);
    expect(acquired.sound).toBeDefined();
    expect(acquired.speech).toBeUndefined();
    const projected = projectEventEvidence(event, acquired);
    expect(projected.type).toBe('sound');
    expect(projected.data).toEqual({});
    expect(JSON.stringify(projected)).not.toContain('Unreceived private fixture words');
    expect(projected.actorId).toBeUndefined();
    expect(projected.targetId).toBeUndefined();
    const sensory = result.world.experience?.awareness[NPC_ID]?.find(
      (entry) => entry.eventId === event.id,
    );
    expect(sensory).toMatchObject({
      retentionClass: 'sensory',
      sound: acquired.sound,
      expiresAt: event.at + result.world.moduleManifest.acoustics.sensoryLifetimeSeconds,
    });
    expect(experienceEntry(result.world, NPC_ID, `awareness:${event.id}`)).toBeUndefined();
    expect(queryMemories(result.world, NPC_ID).some((memory) => memory.eventId === event.id)).toBe(
      false,
    );
    expect(receivedScene(result.world, NPC_ID).nonlocalized).toBe(1);
    const listener = entityGet(result.world.entities, NPC_ID)!;
    const died = applyBodyEffects(
      result.world,
      'memoryless-sound-life-ended',
      [{ targetId: NPC_ID, kind: 'health', amount: -100 }],
      { [NPC_ID]: listener.actor!.body!.revision },
    );
    expect(died.outcome.ok).toBe(true);
    expect(entityGet(died.world.entities, NPC_ID)!.actor!.alive).toBe(false);
    const revived = reviveActor(died.world, NPC_ID);
    expect(revived.outcome.ok).toBe(true);
    const restored = JSON.parse(JSON.stringify(revived.world)) as WorldState;
    validateWorldModules(restored);
    const life = entityGet(restored.entities, NPC_ID)!.actor!.physicalLife ?? 0;
    expect(restored.perceptionEvidence![NPC_ID]!.life).not.toBe(life);
    expect(receivedScene(restored, NPC_ID)).toMatchObject({ physicalLife: life, nonlocalized: 0 });
    expect(captureEvidenceCut(restored, NPC_ID).acquired).toHaveLength(0);
    // The combined account reader includes the independently retained finite
    // buffer. It is dated evidence from the old life, never the fresh body's
    // current received scene or autobiographical recall.
    const priorSound = receivedEventAccounts(restored, NPC_ID, new Set([event.id]), {
      current: true,
    }).get(event.id)?.evidence;
    expect(priorSound).toMatchObject({
      retentionClass: 'sensory',
      expiresAt: sensory!.expiresAt,
      sound: { physicalLife: sensory!.sound!.physicalLife },
    });
    expect(priorSound!.sound!.physicalLife).not.toBe(life);
    expect(experienceEntry(restored, NPC_ID, `awareness:${event.id}`)).toBeUndefined();
    const fresh = executeCommand(restored, {
      id: 'voice-only-new-life',
      actorId: PLAYER_ID,
      type: 'say',
      text: 'New actual sound.',
      volume: 'shout',
    });
    expect(fresh.outcome.ok).toBe(true);
    expect(receivedScene(fresh.world, NPC_ID)).toMatchObject({
      physicalLife: life,
      nonlocalized: 1,
    });
  });
  it.each(['gather', 'strike'] as const)(
    'keeps only visible activity after an actual %s on a hidden target',
    (family) => {
      const result = perform(stockedCamp(73), family, false);
      const own = projectEventEvidence(
        result.event,
        evidence(result.world, result.event, PLAYER_ID),
      );
      expect(own.targetId).toBe(result.targetId);
      const seen = evidence(result.world, result.event);
      const projected = projectEventEvidence(result.event, seen);
      expect(projected).toMatchObject({ actorId: PLAYER_ID, type: 'activity-observed', data: {} });
      expect(projected.targetId).toBeUndefined();
      expect(seen.entityIds).not.toContain(result.targetId);
      expect(JSON.stringify(projected)).not.toContain('wood');
      expect(JSON.stringify(projected)).not.toContain('healthAfter');
      expect(awarenessMemory(seen).eventType).toBe('activity-observed');
      // A later view cannot upgrade the original account from raw exact history.
      const later = structuredClone(result.world);
      place(later, NPC_ID, 32);
      expect(projectEventEvidence(result.event, seen)).toEqual(projected);
    },
  );

  it.each(['gather', 'strike'] as const)(
    'retains observable %s details and owner-only bodily values',
    (family) => {
      const result = perform(stockedCamp(73), family, true);
      const projected = projectEventEvidence(result.event, evidence(result.world, result.event));
      expect(projected.type).toBe(result.event.type);
      expect(projected.targetId).toBe(result.targetId);
      if (family === 'gather')
        expect(projected.data).toMatchObject({ definitionId: 'wood', quantity: 2 });
      else {
        expect(projected.data?.['healthAfter']).toBeUndefined();
        const felt = projectEventEvidence(
          result.event,
          evidence(result.world, result.event, result.targetId),
        );
        expect(felt.data?.['healthAfter']).toBe(result.event.data?.['healthAfter']);
        expect(felt.data?.['damage']).toBeGreaterThan(0);
        const bodyEffect = result.events.find(
          (entry) => entry.type === 'body-effect' && entry.targetId === result.targetId,
        )!;
        expect(bodyEffect.data).toMatchObject({
          effectId: expect.any(String),
          healthDelta: expect.any(Number),
          wetnessDelta: 0,
          burningDelta: 0,
        });
        expect(
          Object.keys(bodyEffect.data!)
            .filter((key) => key.endsWith('Delta'))
            .sort(),
        ).toEqual(['burningDelta', 'healthDelta', 'wetnessDelta']);
        const feltBody = projectEventEvidence(
          bodyEffect,
          evidence(result.world, bodyEffect, result.targetId),
        );
        expect(feltBody.data?.['healthDelta']).toBeLessThan(0);
        expect(
          projectEventEvidence(bodyEffect, evidence(result.world, bodyEffect)).data?.[
            'healthDelta'
          ],
        ).toBeUndefined();
      }
    },
  );

  it('keeps a real offer’s carried terms with its parties while witnesses see the offer', () => {
    const world = stockedCamp(73);
    arrange(world, 'mara', true);
    const item = inventoryFor(world, PLAYER_ID).find((entry) => entry.definitionId === 'wood')!;
    expect(item).toBeDefined();
    const result = executeCommand(world, {
      id: 'disclosure-offer',
      actorId: PLAYER_ID,
      type: 'handover',
      operation: 'offer',
      targetId: 'mara',
      itemId: item.id,
      quantity: 1,
    });
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    const event = result.events.find((entry) => entry.type === 'item-offered')!;
    expect(event).toBeDefined();
    const witness = projectEventEvidence(event, evidence(result.world, event));
    expect(witness).toMatchObject({ type: 'activity-observed', data: {} });
    expect(witness.text).not.toContain(world.itemDefinitions[item.definitionId]!.name);
    for (const participant of [PLAYER_ID, 'mara']) {
      const receipt = result.events.find(
        (entry) =>
          entry.type === 'item-offered' &&
          entry.data?.personalAgreement === true &&
          entry.audience.includes(participant),
      )!;
      expect(receipt).toBeDefined();
      expect(
        projectEventEvidence(receipt, evidence(result.world, receipt, participant)).text,
      ).toContain(world.itemDefinitions[item.definitionId]!.name);
    }
  });

  it('keeps creator-added carried possessions private, and observes a visible ground creation', () => {
    const world = stockedCamp(73);
    const carried = createGodItem(world, {
      id: 'disclosure-private-creation',
      definitionId: 'wood',
      quantity: 17,
      destination: { actorId: PLAYER_ID },
    });
    expect(carried.outcome.ok).toBe(true);
    const privateEvent = carried.events.find((entry) => entry.type === 'god-item-created')!;
    expect(privateEvent.audience).toEqual([PLAYER_ID]);
    expect(evidence(carried.world, privateEvent)).toBeUndefined();
    expect(
      projectEventEvidence(privateEvent, evidence(carried.world, privateEvent, PLAYER_ID)).text,
    ).toContain('17');
    const ground = createGodItem(world, {
      id: 'disclosure-ground-creation',
      definitionId: 'wood',
      quantity: 17,
      destination: { position: supportBelow(world.map, { x: 10, y: 10, z: 10 })! },
    });
    expect(ground.outcome.ok).toBe(true);
    const publicEvent = ground.events.find((entry) => entry.type === 'god-item-created')!;
    expect(projectEventEvidence(publicEvent, evidence(ground.world, publicEvent)).text).toContain(
      '17',
    );
  });

  it('does not disclose a hidden third participant or an unknown execution field', () => {
    const world = stockedCamp(73);
    arrange(world, 'mara', true);
    place(world, 'tavin', 60, 20);
    const events: WorldEvent[] = [];
    emit(
      world,
      events,
      'struck',
      subjectNarration(PLAYER_ID, ['acted with ', person('tavin'), '.']),
      entityGet(world.entities, PLAYER_ID),
      'mara',
      { weaponItemId: 'tavin', privateExecutionDetail: 'secret', damage: 5 },
    );
    const event = events[0]!,
      seen = evidence(world, event);
    expect(projectEventEvidence(event, seen)).toMatchObject({
      type: 'activity-observed',
      data: {},
    });
    expect(JSON.stringify(seen)).not.toContain('tavin');
    const visible: WorldEvent[] = [];
    emit(
      world,
      visible,
      'gathered',
      subjectNarration(PLAYER_ID, 'gathered visible material.'),
      entityGet(world.entities, PLAYER_ID),
      'mara',
      { definitionId: 'wood', quantity: 2, privateExecutionDetail: 'secret' },
    );
    expect(projectEventEvidence(visible[0]!, evidence(world, visible[0]!)).data).toEqual({
      definitionId: 'wood',
      quantity: 2,
    });
  });

  it('preserves target-only contact without revealing a distant shooter, and excludes unrelated observers', () => {
    const world = stockedCamp(73);
    arrange(world, 'mara', true);
    place(world, PLAYER_ID, 60, 20);
    const events: WorldEvent[] = [];
    // The native projectile owner attributes the visible contact to the struck body.
    emit(
      world,
      events,
      'projectile-contact',
      subjectNarration('mara', 'was struck by a projectile.'),
      entityGet(world.entities, 'mara'),
      'mara',
      { contactInjury: true, damage: 5, healthAfter: 95 },
    );
    const event = events[0]!;
    const projected = projectEventEvidence(event, evidence(world, event));
    expect(projected).toMatchObject({
      type: 'projectile-contact',
      actorId: 'mara',
      targetId: 'mara',
    });
    expect(projected.data?.['damage']).toBeUndefined();
    expect(event.audience).not.toContain(PLAYER_ID);
    expect(JSON.stringify(projected)).not.toContain(PLAYER_ID);
    const felt = projectEventEvidence(event, evidence(world, event, 'mara'));
    expect(felt.data?.['damage']).toBe(5);
    const privateEvents: WorldEvent[] = [];
    emit(
      world,
      privateEvents,
      'thought',
      'Private participant fact.',
      entityGet(world.entities, 'mara'),
      undefined,
      { text: 'Private participant fact.' },
      'private',
    );
    expect(privateEvents[0]!.audience).toEqual(['mara']);
  });

  it('uses the same stored facts through cold PostgreSQL history and required cognition evidence', async () => {
    const store = await testRepository(undefined, stockedCamp());
    const service = new WorldService(store, readConfig({ OPEN_LEGEND_GOD_MODE: 'true' }));
    cleanup.push(async () => {
      service.releaseHostWork();
      await store.close();
    });
    await enterLocalWorld(service);
    await service.setPresence('event-disclosure-fixture', true);
    await service.control({ paused: false });
    let event!: WorldEvent;
    await service.transition((world) => {
      const result = perform(structuredClone(world), 'gather', false);
      event = result.event;
      return result;
    });
    const hot = evidence(service.world, event);
    // Real residency compaction leaves the older record in SQL, without deleting or forgetting it.
    await editWorld(service, (world) => {
      place(world, NPC_ID, 32);
      for (let i = 0; i < 257; i++)
        emit(
          world,
          [],
          'thought',
          `Later fixture observation ${i}.`,
          entityGet(world.entities, NPC_ID),
          undefined,
          undefined,
          'private',
        );
    });
    expect(
      service.world.experience!.awareness[NPC_ID]!.some((entry) => entry.eventId === event.id),
    ).toBe(false);
    // Three actual received position changes publish separate chunks; ordinary
    // residency releases the older receipt body while retaining its SQL reference.
    for (let sample = 0; sample < 3; sample++)
      await editWorld(service, (world) => {
        world.simTime += 1;
        place(world, PLAYER_ID, 32.6 + sample * 0.1);
        initializePerception(world, []);
      });
    expect(
      service.world
        .experience!.temporal!.actors[NPC_ID]!.chunks.flatMap((chunk) => chunk.receipts)
        .some(
          (receipt) => receipt.origin?.kind === 'occurrence' && receipt.origin.eventId === event.id,
        ),
    ).toBe(false);
    const retrieved = await service.awarenessEvidence(NPC_ID, [event.id]);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0]!.eventData).toEqual({});
    expect(retrieved[0]!.targetId).toBeUndefined();
    expect(awarenessMemory(retrieved[0]!)).toEqual(awarenessMemory(hot));
    const trigger = responseTriggerContext(service, NPC_ID, event.id, retrieved);
    expect(JSON.stringify(trigger)).not.toContain('branches');
    expect(JSON.stringify(trigger)).not.toContain('wood');
    const page = await readPerceivedEvents(store.db, service.world.id, NPC_ID, 'fixture-scope', {
      type: 'activity-observed',
      limit: 100,
    });
    const publicOccurrence = page.events.find((entry) => entry.id === event.id);
    expect(publicOccurrence).toMatchObject({ type: 'activity-observed' });
    expect(publicOccurrence!.targetId).toBeUndefined();
    expect(publicOccurrence!.text).not.toContain('wood');
    const row = await store.db
      .prepare(
        `SELECT p.payload,${storyAccountSql()} AS account_payload FROM history_perspectives p WHERE p.world_id=? AND p.actor_id=? AND p.event_id=?`,
      )
      .get(service.world.id, NPC_ID, event.id);
    const stored = storySourceRow(row!);
    expect(stored.type).toBe('activity-observed');
    expect(projectEventEvidence(event, stored.evidence)).toEqual(projectEventEvidence(event, hot));
    const head = await store.records.head();
    const scope = { worldId: service.world.id, actorId: NPC_ID, generation: head!.generation };
    const captured = captureSituation(service.world, NPC_ID, 'cold-subject-query', {
      entries: [],
      incomplete: true,
    });
    const subject = captured.scene.bodies.get(PLAYER_ID)!.exposure;
    const capturedAt = service.world.simTime;
    await editWorld(service, (world) => {
      place(world, PLAYER_ID, 33.1);
      initializePerception(world, []);
    });
    expect(service.world.simTime).toBe(capturedAt);
    const laterSameTime = await store.memories.temporalHistory(
      scope,
      { subjects: [subject], bytes: 262144, limit: 128 },
      service.world,
    );
    expect(
      laterSameTime.entries.some(
        (entry) =>
          entry.receipt.epoch === captured.receiptPrefix.epoch &&
          entry.receipt.ordinal > captured.receiptPrefix.throughOrdinal,
      ),
    ).toBe(true);
    const unfiltered = await store.memories.temporalHistory(
      scope,
      { bytes: 262144, limit: 128 },
      service.world,
    );
    expect(
      unfiltered.entries.some(
        (entry) =>
          entry.receipt.subject !== subject && !entry.receipt.contextSubjects?.includes(subject),
      ),
    ).toBe(true);
    const expanded = await expandSituation(
      captured,
      [
        {
          kind: 'history',
          subject: entityHandle(service.world, NPC_ID, PLAYER_ID),
          from: 0,
          through: service.world.simTime,
        },
      ],
      async (query) => {
        expect(query.subjects).toEqual([subject]);
        expect(query.cut).toEqual(captured.receiptPrefix);
        const page = await store.memories.temporalHistory(scope, query, service.world);
        expect(page.entries.length).toBeGreaterThan(0);
        expect(
          page.entries.every(
            (entry) =>
              entry.receipt.epoch !== captured.receiptPrefix.epoch ||
              entry.receipt.ordinal <= captured.receiptPrefix.throughOrdinal,
          ),
        ).toBe(true);
        return page;
      },
    );
    const entries = (
      expanded.results[0] as {
        result: { entries: Array<{ subject: string; contextFor?: string[] }> };
      }
    ).result.entries;
    expect(entries.length).toBeGreaterThan(0);
    const requestedSubject = permittedSourceHandle(service.world, NPC_ID, [
      'received-subject',
      subject,
    ]);
    expect(
      entries.every(
        (entry) =>
          entry.subject === requestedSubject || entry.contextFor?.includes(requestedSubject),
      ),
    ).toBe(true);
    const saveId = randomUUID();
    await service.createSave('Observer facts', saveId);
    const payload = await store.saves.read(service.world.id, saveId);
    expect(() => store.saves.validatePayload(payload)).not.toThrow();
    const missingReceivedFacts = structuredClone(payload);
    expect(
      missingReceivedFacts.state.world.experience!.awareness[NPC_ID]!.some(
        (entry) => entry.eventId === event.id,
      ),
    ).toBe(false);
    const temporal = missingReceivedFacts.state.world.experience!.temporal!;
    const receipt = temporal.actors[NPC_ID]!.chunks.flatMap((chunk) => chunk.receipts).find(
      (entry) => entry.origin?.kind === 'occurrence' && entry.origin.eventId === event.id,
    )!;
    const eventValue = receipt.facets
      .map((reference) => temporal.sources[reference.blockId]!.values[reference.valueOrdinal]!)
      .find((value) => value.kind === 'event')!;
    delete (eventValue as unknown as Record<string, unknown>)['data'];
    expect(() => store.saves.validatePayload(missingReceivedFacts)).toThrow('temporal source');
    const missingHistoryFacts = structuredClone(payload);
    const savedRow = missingHistoryFacts.history.history_perspectives.find(
      (entry) => entry['event_id'] === event.id && entry['actor_id'] === NPC_ID,
    )!;
    const savedSource = JSON.parse(String(savedRow['payload'])) as { account?: unknown };
    delete savedSource.account;
    savedRow['payload'] = JSON.stringify(savedSource);
    expect(() => store.saves.validatePayload(missingHistoryFacts)).toThrow('personal account');

    // Editing exact history after residency compaction must change the owner's wording
    // without teaching a witness the material or outcome they never saw.
    const editable = await service.worldEventJson(event.id);
    expect(editable.ok).toBe(true);
    if (!editable.ok) throw new Error(editable.message);
    const replacement = JSON.parse(editable.json) as WorldEvent;
    replacement.text = 'Mike quietly gathered 2 wood beside the branches.';
    const edited = await service.saveWorldEventsEditor([
      { id: event.id, expectedHash: editable.hash, replacement },
    ]);
    expect(edited.ok, edited.message).toBe(true);
    const owner = await service.awarenessEvidence(PLAYER_ID, [event.id]);
    expect(owner[0]!.text).toContain('quietly gathered 2 wood');
    const witness = await service.awarenessEvidence(NPC_ID, [event.id]);
    expect(witness[0]!.text).toBe(hot.text);
    const revisedPage = await readPerceivedEvents(
      store.db,
      service.world.id,
      NPC_ID,
      'fixture-scope',
      { type: 'activity-observed', limit: 100 },
    );
    expect(revisedPage.events.find((entry) => entry.id === event.id)!.text).toBe(hot.text);
    // The actor's original receipt owns this historical grant. Expiring it removes
    // the derived event row even though objective world history still contains it.
    await editWorld(service, (world) => {
      world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 1;
    });
    expect(await service.awarenessEvidence(NPC_ID, [event.id])).toEqual([]);
    expect(
      await store.db
        .prepare(
          'SELECT event_id FROM history_perspectives WHERE world_id=? AND actor_id=? AND event_id=?',
        )
        .get(service.world.id, NPC_ID, event.id),
    ).toBeUndefined();
  });
});
