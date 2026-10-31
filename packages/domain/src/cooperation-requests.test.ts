import { describe, expect, it } from 'vitest';
import { cooperativeCamp, installFixtureMultiOutputMethod } from '../../../tests/fixtures/world.js';
import {
  entityGet,
  entitySet,
  entityValues,
  executeCommand,
  PLAYER_ID,
  NPC_ID,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  supportedPosition,
  possessionItems,
  validateWorldModules,
  observeActor,
  activityRequestHost,
  type Entity,
} from './index.js';
import {
  bindCooperationRequest,
  cooperationRequestChoices,
  cooperationRequestDescriptors,
  COOPERATION_REQUESTS,
} from './worlds/base/cooperation-requests.js';

function nearbyCompanion() {
  const world = cooperativeCamp();
  const actor = entityGet(world.entities, PLAYER_ID)!;
  const companion = entityGet(world.entities, NPC_ID)!;
  const point = worldPosition(actor);
  setSpatialPosition(world, companion, { ...point, x: point.x + 0.75 }, worldSupport(actor));
  world.visiblePeople ??= {};
  world.visiblePeople[PLAYER_ID] = [NPC_ID];
  return { world, actor, companion };
}

describe('world-owned cooperation request forms', () => {
  it('keeps personally known off-screen destinations and binds one exact native proposal', () => {
    const { world, actor, companion } = nearbyCompanion();
    const place = entityValues(world.entities).find(
      (entry) => !entry.actor && entry.kind !== 'item-pile',
    )!;
    const knownPoint = supportedPosition(place);
    if (!knownPoint) throw new Error('The fixture needs a supported known place.');
    actor.actor!.agency.places = [
      {
        subjectId: place.id,
        label: 'The place I remember',
        episode: null,
        point: knownPoint,
        at: world.simTime,
      },
    ];
    world.visibleObjects![PLAYER_ID] = [];
    world.visiblePeople![PLAYER_ID] = [];
    const evidence = structuredClone(world.experience);
    const observed = observeActor(world, PLAYER_ID, { includeMemories: false })!;
    expect(observed.visibleEntities.some((entry) => entry.id === companion.id)).toBe(true);
    const recipientQuery = {
      family: COOPERATION_REQUESTS.guide,
      field: 'recipientId',
      arguments: {},
    };
    expect(cooperationRequestChoices(world, PLAYER_ID, undefined, recipientQuery).choices).toEqual(
      cooperationRequestChoices(world, PLAYER_ID, observed, recipientQuery).choices,
    );
    expect(
      activityRequestHost(world, COOPERATION_REQUESTS.guide)!.requestChoice!(
        world,
        PLAYER_ID,
        COOPERATION_REQUESTS.guide,
        'recipientId',
        companion.id,
      ),
    ).toMatchObject({ id: companion.id, accessible: true });
    const carried = [...possessionItems(world, PLAYER_ID)][0]!;
    expect(
      activityRequestHost(world, COOPERATION_REQUESTS.guide)!.requestChoice!(
        world,
        PLAYER_ID,
        COOPERATION_REQUESTS.guide,
        'recipientId',
        carried.id,
      ),
    ).toBeUndefined();
    expect(world.experience).toEqual(evidence);
    const query = cooperationRequestChoices(world, PLAYER_ID, undefined, {
      family: COOPERATION_REQUESTS.guide,
      field: 'destinationId',
      arguments: { recipientId: companion.id },
    });
    expect(query.choices).toContainEqual(
      expect.objectContaining({ id: place.id, label: 'The place I remember', kind: 'entity' }),
    );
    const command = bindCooperationRequest(
      world,
      PLAYER_ID,
      'fixture-guide-proposal',
      {
        family: COOPERATION_REQUESTS.guide,
        arguments: { recipientId: companion.id, destinationId: place.id, agreement: 'new' },
      },
      [companion.id, place.id],
    );
    expect(command).toMatchObject({
      type: 'outing',
      operation: 'propose',
      cooperationKind: 'guide',
      recipientId: companion.id,
      destinationId: place.id,
    });
    if ('ok' in command) throw new Error(command.message);
    const result = executeCommand(world, command);
    expect(result.outcome.ok).toBe(true);
    expect(Object.values(result.world.outings ?? {})).toContainEqual(
      expect.objectContaining({ kind: 'cooperate', status: 'pending' }),
    );
    expect(result.world.rngState).toBe(world.rngState);
    const known = cooperationRequestChoices(result.world, PLAYER_ID, undefined, {
      family: COOPERATION_REQUESTS.guide,
      field: 'agreement',
      arguments: { recipientId: companion.id },
    }).choices[0]!;
    expect(known.kind).toBe('choice');
    expect(known.id).not.toBe('new');
    const revised = bindCooperationRequest(
      result.world,
      PLAYER_ID,
      'fixture-guide-revision',
      {
        family: COOPERATION_REQUESTS.guide,
        arguments: { recipientId: companion.id, destinationId: place.id, agreement: known.id },
      },
      [companion.id, place.id],
    );
    expect(revised).toMatchObject({ type: 'outing', operation: 'revise', expectedRevision: 1 });
  });

  it('associates each selected output with its learned multi-output method and preserves material meaning', () => {
    const { world } = nearbyCompanion();
    const multi = installFixtureMultiOutputMethod(world, PLAYER_ID);
    expect(() => validateWorldModules(world)).not.toThrow();
    const domains = cooperationRequestChoices(world, PLAYER_ID);
    const method = domains.choices.find(
      (entry) => entry.kind === 'definition' && entry.id === multi.id,
    )!;
    expect(method.label).toContain('spends 2');
    expect(method.label).toContain('keeps 1');
    expect(
      domains.choices
        .filter((entry) => entry.roles.includes('outputPort'))
        .map((entry) => ({ id: entry.id, requires: entry.requires })),
    ).toEqual([
      { id: 'first', requires: { recipeId: multi.id } },
      { id: 'second', requires: { recipeId: multi.id } },
    ]);
    const command = bindCooperationRequest(
      world,
      PLAYER_ID,
      'fixture-prepare',
      {
        family: COOPERATION_REQUESTS.prepare,
        arguments: {
          recipientId: NPC_ID,
          recipeId: multi.id,
          outputPort: 'second',
          quantity: 3,
          agreement: 'new',
        },
      },
      [NPC_ID],
    );
    expect(command).toMatchObject({
      type: 'outing',
      cooperationKind: 'help',
      task: { kind: 'prepare', recipeId: multi.id, outputPort: 'second', quantity: 3 },
    });
    world.knowledge[PLAYER_ID] = world.knowledge[PLAYER_ID]!.filter(
      (entry) => entry.recipeId !== multi.id,
    );
    expect(
      cooperationRequestDescriptors(world, PLAYER_ID).some(
        (entry) => entry.id === COOPERATION_REQUESTS.prepare,
      ),
    ).toBe(false);
  });

  it('grows shared role domains rather than materializing recipient, quarry and destination products', () => {
    const summaries: Array<{
      recipients: number;
      quarry: number;
      places: number;
      choices: number;
    }> = [];
    for (const count of [2, 4, 8]) {
      const { world, actor, companion } = nearbyCompanion();
      const point = worldPosition(actor);
      const animal = entityValues(world.entities).find(
        (entry) => entry.animal && entry.actor?.alive,
      )!;
      const place = entityValues(world.entities).find(
        (entry) => !entry.actor && entry.kind !== 'item-pile',
      )!;
      const visible: Entity[] = [];
      world.visibleObjects![PLAYER_ID] = [];
      world.visiblePeople![PLAYER_ID] = [];
      for (let index = 0; index < count; index++) {
        const clone = structuredClone(companion);
        clone.id = `fixture-person-${index}`;
        entitySet(world.entities, clone.id, clone);
        setSpatialPosition(
          world,
          clone,
          {
            ...point,
            x: point.x + Math.cos((index * Math.PI * 2) / count),
            z: point.z + Math.sin((index * Math.PI * 2) / count),
          },
          worldSupport(actor),
        );
        visible.push(clone);
        world.visiblePeople![PLAYER_ID]!.push(clone.id);
        const quarry = structuredClone(animal);
        quarry.id = `fixture-quarry-${index}`;
        entitySet(world.entities, quarry.id, quarry);
        visible.push(quarry);
        world.visiblePeople![PLAYER_ID]!.push(quarry.id);
        const destination = structuredClone(place);
        destination.id = `fixture-place-${index}`;
        entitySet(world.entities, destination.id, destination);
        world.visibleObjects![PLAYER_ID]!.push(destination.id);
      }
      const choices = cooperationRequestChoices(world, PLAYER_ID, {
        actor,
        visibleEntities: visible,
        inventory: [],
      }).choices;
      const guide = choices.filter((entry) =>
        entry.requestIds?.includes(COOPERATION_REQUESTS.guide),
      );
      const hunt = choices.filter((entry) => entry.requestIds?.includes(COOPERATION_REQUESTS.hunt));
      const recipients = guide.filter((entry) => entry.roles.includes('recipientId')).length;
      const places = guide.filter((entry) => entry.roles.includes('destinationId')).length;
      const quarry = hunt.filter((entry) => entry.roles.includes('quarryId')).length;
      expect(recipients).toBeGreaterThan(0);
      expect(places).toBe(count);
      expect(quarry).toBe(count);
      expect(guide).toHaveLength(recipients * 2 + places);
      expect(hunt).toHaveLength(recipients * 2 + places + quarry);
      expect(choices.length).toBeLessThanOrEqual(count * 16 + 20);
      summaries.push({ recipients, quarry, places, choices: choices.length });
    }
    expect(summaries.map((entry) => entry.choices)).toEqual(
      [...summaries.map((entry) => entry.choices)].sort((a, b) => a - b),
    );
  });
  it('keeps unavailable carry forms out of actor-scoped generation without hiding the installed native family', () => {
    const { world } = nearbyCompanion();
    const actorForms = cooperationRequestDescriptors(world, PLAYER_ID);
    expect(actorForms.some((entry) => entry.id === COOPERATION_REQUESTS.carry)).toBe(false);
    expect(
      cooperationRequestDescriptors(world).some((entry) => entry.id === COOPERATION_REQUESTS.carry),
    ).toBe(true);
    expect(
      actorForms.every((entry) =>
        Object.values(entry.fields).every(
          (field) => field.type !== 'choice' || field.choices.length > 0,
        ),
      ),
    ).toBe(true);
  });

  it('binds the exact pending whole-load offer and removes it when custody changes', () => {
    let { world } = nearbyCompanion();
    const place = entityValues(world.entities).find(
      (entry) => !entry.actor && entry.kind !== 'item-pile' && supportedPosition(entry),
    )!;
    entityGet(world.entities, PLAYER_ID)!.actor!.agency.places = [
      {
        subjectId: place.id,
        label: 'A known meeting place',
        episode: null,
        point: supportedPosition(place)!,
        at: world.simTime,
      },
    ];
    const load = [...possessionItems(world, PLAYER_ID)].find((item) => !item.container)!;
    expect(load).toBeDefined();
    const offered = executeCommand(world, {
      id: 'fixture-carry-gift',
      actorId: PLAYER_ID,
      type: 'handover',
      operation: 'offer',
      targetId: NPC_ID,
      offered: [{ itemId: load.id, quantity: load.quantity }],
      requested: [],
    });
    expect(offered.outcome.ok, offered.outcome.message).toBe(true);
    world = offered.world;
    const choices = cooperationRequestChoices(world, PLAYER_ID, undefined, {
      family: COOPERATION_REQUESTS.carry,
      field: 'offer',
      arguments: { recipientId: NPC_ID },
    }).choices;
    expect(choices).toHaveLength(1);
    const offer = Object.values(world.itemOffers ?? {})[0]!;
    expect(choices[0]).toMatchObject({
      id: JSON.stringify([offer.id, offer.revision]),
      requires: { recipientId: NPC_ID },
    });
    const destination = cooperationRequestChoices(world, PLAYER_ID, undefined, {
      family: COOPERATION_REQUESTS.carry,
      field: 'destinationId',
      arguments: {},
    }).choices[0]!;
    expect(
      bindCooperationRequest(
        world,
        PLAYER_ID,
        'fixture-carry',
        {
          family: COOPERATION_REQUESTS.carry,
          arguments: {
            recipientId: NPC_ID,
            agreement: 'new',
            offer: choices[0]!.id,
            destinationId: destination.id,
          },
        },
        [NPC_ID, destination.id],
      ),
    ).toMatchObject({
      type: 'outing',
      operation: 'propose',
      cooperationKind: 'help',
      task: {
        kind: 'carry',
        offerId: offer.id,
        offerRevision: offer.revision,
        destinationId: destination.id,
      },
    });
    const dropped = executeCommand(world, {
      id: 'fixture-drop-load',
      actorId: PLAYER_ID,
      type: 'drop',
      itemId: load.id,
      quantity: load.quantity,
    });
    expect(dropped.outcome.ok, dropped.outcome.message).toBe(true);
    expect(
      cooperationRequestDescriptors(dropped.world, PLAYER_ID).some(
        (entry) => entry.id === COOPERATION_REQUESTS.carry,
      ),
    ).toBe(false);
  });
});
