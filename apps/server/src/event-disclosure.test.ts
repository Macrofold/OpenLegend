import { afterEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  advanceWorld,
  createWorld,
  executeCommand,
  inventoryFor,
  NPC_ID,
  PLAYER_ID,
  projectEventEvidence,
  type WorldState,
  type WorldEvent,
} from '@open-legend/domain';
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

function place(world: WorldState, id: string, x: number, z = 2) {
  const entity = world.entities[id]!;
  const point = supportBelow(world.map, { x, y: 10, z })!;
  expect(point).not.toBeNull();
  expect(canStand(world.map, point, bodyProfile(entity))).toBe(true);
  setSpatialPosition(world, entity, point, point.surfaceId);
}
function arrange(world: WorldState, targetId: string, visible: boolean) {
  world.paused = false;
  for (const entity of Object.values(world.entities)) {
    if (entity.actor && entity.id !== targetId) entity.actor.controller = 'player';
  }
  place(world, NPC_ID, visible ? 6 : 5);
  place(world, PLAYER_ID, 32.5);
  place(world, targetId, 33.5);
  expect(seesEntity(world, world.entities[NPC_ID]!, world.entities[PLAYER_ID]!)).toBe(true);
  expect(seesEntity(world, world.entities[NPC_ID]!, world.entities[targetId]!)).toBe(visible);
}
function perform(world: WorldState, family: 'gather' | 'strike', visible: boolean) {
  const targetId = family === 'gather' ? 'branches' : 'mara';
  arrange(world, targetId, visible);
  const before = world.entities[targetId]!.actor?.health;
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
  const completed = advanceWorld(admitted.world, 80);
  const event = completed.events.find(
    (entry) => entry.type === (family === 'gather' ? 'gathered' : 'struck'),
  )!;
  expect(event).toBeDefined();
  if (family === 'gather') expect(event.data).toMatchObject({ definitionId: 'wood', quantity: 2 });
  else expect(completed.world.entities[targetId]!.actor!.health).toBeLessThan(before!);
  return { ...completed, event, targetId, events: [...admitted.events, ...completed.events] };
}
function evidence(world: WorldState, event: WorldEvent, actorId = NPC_ID) {
  return world.experience!.awareness[actorId]!.find((entry) => entry.eventId === event.id)!;
}
const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close();
});

describe('event-time observer facts', () => {
  it.each(['gather', 'strike'] as const)(
    'keeps only visible activity after an actual %s on a hidden target',
    (family) => {
      const result = perform(createWorld(73), family, false);
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
      const result = perform(createWorld(73), family, true);
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
      }
    },
  );

  it('keeps a real offer’s carried terms with its parties while witnesses see the offer', () => {
    const world = createWorld(73);
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
    expect(projectEventEvidence(event, evidence(result.world, event, PLAYER_ID)).text).toContain(
      world.itemDefinitions[item.definitionId]!.name,
    );
    expect(projectEventEvidence(event, evidence(result.world, event, 'mara')).text).toContain(
      world.itemDefinitions[item.definitionId]!.name,
    );
  });

  it('keeps creator-added carried possessions private, and observes a visible ground creation', () => {
    const world = createWorld(73);
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
    const world = createWorld(73);
    arrange(world, 'mara', true);
    place(world, 'tavin', 60, 20);
    const events: WorldEvent[] = [];
    emit(
      world,
      events,
      'struck',
      subjectNarration(PLAYER_ID, ['acted with ', person('tavin'), '.']),
      world.entities[PLAYER_ID],
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
      world.entities[PLAYER_ID],
      'mara',
      { definitionId: 'wood', quantity: 2, privateExecutionDetail: 'secret' },
    );
    expect(projectEventEvidence(visible[0]!, evidence(world, visible[0]!)).data).toEqual({
      definitionId: 'wood',
      quantity: 2,
    });
  });

  it('preserves target-only contact without revealing a distant shooter, and excludes unrelated observers', () => {
    const world = createWorld(73);
    arrange(world, 'mara', true);
    place(world, PLAYER_ID, 60, 20);
    const events: WorldEvent[] = [];
    // The native projectile owner attributes the visible contact to the struck body.
    emit(
      world,
      events,
      'projectile-contact',
      subjectNarration('mara', 'was struck by a projectile.'),
      world.entities.mara,
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
      world.entities.mara,
      undefined,
      { text: 'Private participant fact.' },
      'private',
    );
    expect(privateEvents[0]!.audience).toEqual(['mara']);
  });

  it('uses the same stored facts through cold PostgreSQL history and required cognition evidence', async () => {
    const store = await testRepository();
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
          world.entities[NPC_ID],
          undefined,
          undefined,
          'private',
        );
    });
    expect(
      service.world.experience!.awareness[NPC_ID]!.some((entry) => entry.eventId === event.id),
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
        'SELECT payload FROM history_perspectives WHERE world_id=? AND actor_id=? AND event_id=?',
      )
      .get(service.world.id, NPC_ID, event.id);
    const stored = JSON.parse(String(row!['payload'])) as import('./history.js').StorySource;
    expect(stored.type).toBe('activity-observed');
    expect(projectEventEvidence(event, stored.evidence)).toEqual(projectEventEvidence(event, hot));
    const saveId = randomUUID();
    await service.createSave('Observer facts', saveId);
    const payload = await store.saves.read(service.world.id, saveId);
    expect(() => store.saves.validatePayload(payload)).not.toThrow();
    const missingAwarenessFacts = structuredClone(payload);
    const savedAwareness = missingAwarenessFacts.state.world.experience!.awareness[NPC_ID]!.find(
      (entry) => entry.eventId === event.id,
    )!;
    expect(savedAwareness).toBeDefined();
    delete savedAwareness.eventData;
    expect(() => store.saves.validatePayload(missingAwarenessFacts)).toThrow('observer facts');
    const missingHistoryFacts = structuredClone(payload);
    const savedRow = missingHistoryFacts.history.history_perspectives.find(
      (entry) => entry['event_id'] === event.id && entry['actor_id'] === NPC_ID,
    )!;
    const savedSource = JSON.parse(
      String(savedRow['payload']),
    ) as import('./history.js').StorySource;
    delete savedSource.evidence.eventType;
    savedRow['payload'] = JSON.stringify(savedSource);
    expect(() => store.saves.validatePayload(missingHistoryFacts)).toThrow('observer event type');

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
  });
});
