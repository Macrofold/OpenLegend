import { expect, it } from 'vitest';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  PLAYER_ID,
  NPC_ID,
  entityGet,
  setSpatialPosition,
  worldSupport,
  executeCommand,
  nativeOperationAvailable,
  experienceEntry,
  selectedExpressions,
  seesEntity,
  hasLineOfSight,
  canReachEntity,
  worldPosition,
  definitionPin,
  commitActorResponse,
  type ActorResponse,
  type WorldState,
} from './index.js';
import { validateModuleManifest, validateWorldModules } from './world-modules.js';

function setup() {
  const world = stockedCamp();
  for (const [id, z] of [
    [PLAYER_ID, 13],
    [NPC_ID, 14],
  ] as const) {
    const actor = entityGet(world.entities, id)!;
    setSpatialPosition(world, actor, { x: 12, y: 0, z }, worldSupport(actor));
    actor.spatial.heading = 0;
  }
  return world;
}
const contact = {
  id: 'contact-once',
  actorId: PLAYER_ID,
  type: 'express' as const,
  verb: 'tickle',
  targetId: NPC_ID,
};
const contactEvent = (world: WorldState) =>
  world.events.find(
    (event) => event.type === 'expression' && event.data?.['contactKind'] === 'tickle',
  );

it('commits one real contact with felt recipient evidence, no injury or forced reaction, and replay is inert', () => {
  const world = setup();
  const before = entityGet(world.entities, NPC_ID)!.actor!;
  const result = executeCommand(world, contact);
  expect(result.outcome).toMatchObject({ ok: true, code: 'contacted' });
  const event = contactEvent(result.world)!;
  expect(event.data).toMatchObject({
    expressionId: 'tickle',
    contactKind: 'tickle',
    mechanical: true,
  });
  expect(experienceEntry(result.world, NPC_ID, `awareness:${event.id}`)?.value).toMatchObject({
    modality: 'felt',
    eventType: 'expression',
    sourceId: PLAYER_ID,
    targetId: NPC_ID,
    eventData: { contactKind: 'tickle', mechanical: true },
  });
  const after = entityGet(result.world.entities, NPC_ID)!.actor!;
  expect(after.health).toBe(before.health);
  expect(after.action).toEqual(before.action);
  expect(
    result.events.filter((event) => event.actorId === NPC_ID && event.type === 'speech'),
  ).toEqual([]);
  expect(executeCommand(result.world, contact).events).toEqual([]);
  expect(executeCommand(result.world, { ...contact, verb: 'smile' }).outcome.code).toBe(
    'idempotency-conflict',
  );
  expect(
    Object.values(result.world.actionExperience.occurrences[PLAYER_ID] ?? {}).some(
      (entry) => entry.command.type === 'express',
    ),
  ).toBe(true);
  expect(() => validateWorldModules(result.world)).not.toThrow();
});

it('rechecks current reach after an offer and records no fictional contact when the target moved', () => {
  const world = setup();
  expect(nativeOperationAvailable(world, contact).ok).toBe(true);
  const target = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, target, { x: 12, y: 0, z: 17 }, worldSupport(target));
  const result = executeCommand(world, contact);
  expect(result.outcome).toMatchObject({ ok: false, code: 'out-of-reach' });
  expect(contactEvent(result.world)).toBeUndefined();
  expect(entityGet(result.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
});

it('uses interaction-anchor clearance over a low barrier and refuses a blocking barrier', () => {
  for (const height of [0.4, 2]) {
    const world = setup();
    world.map.spatial.blockers.push({
      id: 'contact-barrier',
      bounds: { min: { x: 11, y: -0.1, z: 13.45 }, max: { x: 13, y: height, z: 13.55 } },
      movement: true,
      sight: true,
      acousticTransmission: 0,
      material: 'wood',
    });
    world.map.spatial.revision++;
    const source = entityGet(world.entities, PLAYER_ID)!,
      target = entityGet(world.entities, NPC_ID)!;
    expect(hasLineOfSight(world, worldPosition(source), worldPosition(target))).toBe(false);
    expect(seesEntity(world, source, target)).toBe(height === 0.4);
    expect(canReachEntity(world, source, target, 1.5)).toBe(height === 0.4);
    const result = executeCommand(world, contact);
    expect(result.outcome.ok).toBe(height === 0.4);
    expect(!!contactEvent(result.world)).toBe(height === 0.4);
  }
});

it('does not reveal an unseen performer to the recipient of real contact', () => {
  const world = setup();
  const vision = world.moduleManifest.senses.find(
    (sense) => sense.implementation === 'vision-geometry-v1',
  )!;
  if (vision.implementation !== 'vision-geometry-v1') throw new Error('Fixture vision missing.');
  vision.fieldOfViewRadians = Math.PI / 2;
  world.moduleManifest.sensePins = world.moduleManifest.senses.map(definitionPin);
  const source = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  expect(seesEntity(world, source, target)).toBe(true);
  expect(seesEntity(world, target, source)).toBe(false);
  const result = executeCommand(world, contact),
    event = contactEvent(result.world)!;
  expect(result.outcome.ok).toBe(true);
  const entry = experienceEntry(result.world, NPC_ID, `awareness:${event.id}`);
  if (entry?.source !== 'awareness') throw new Error('Missing contact awareness.');
  const evidence = entry.value;
  expect(evidence).toMatchObject({
    modality: 'felt',
    targetId: NPC_ID,
    eventData: { contactKind: 'tickle' },
  });
  expect(evidence?.sourceId).toBeUndefined();
  expect(evidence?.references?.some((reference) => reference.id === PLAYER_ID)).toBe(false);
  expect(evidence?.text).toContain('unseen source');
});

it('uses the same contact owner for an ordinary NPC expression and preserves response replay', () => {
  const world = setup();
  const response: ActorResponse = {
    operations: [
      {
        localId: 'touch',
        requiresAccepted: [],
        act: {
          kind: 'expression',
          verb: 'tickle',
          targetEntityId: PLAYER_ID,
          actionId: null,
          description: null,
          mode: 'enqueue',
        },
      },
    ],
  };
  const run = (input: WorldState) =>
    commitActorResponse(input, 'npc-contact', NPC_ID, response, {}, [NPC_ID, PLAYER_ID], 0);
  const result = run(world);
  expect(contactEvent(result.world)?.actorId).toBe(NPC_ID);
  expect(
    Object.values(result.world.responseReceipts!['npc-contact']!.components).some(
      (value) => value.code === 'contacted',
    ),
  ).toBe(true);
  expect(run(result.world).events).toEqual([]);
});

it('honors selected-world omission and rejects invalid contact definitions without a base fallback', () => {
  const world = setup();
  delete world.moduleManifest.expressions;
  expect(() => validateModuleManifest(world.moduleManifest)).not.toThrow();
  expect(selectedExpressions(world)).toEqual([]);
  expect(executeCommand(world, contact).outcome).toMatchObject({
    ok: false,
    code: 'invalid-expression',
  });
  world.moduleManifest.expressions = [
    {
      id: 'touch',
      label: 'Touch',
      verb: 'touch',
      description: 'Brief contact.',
      target: 'optional',
      targetJoiner: ' ',
      contact: { kind: 'touch', felt: 'felt contact' },
    },
  ];
  expect(() => validateModuleManifest(world.moduleManifest)).toThrow(
    'Invalid expression definition',
  );
});

it('keeps existing noncontact gestures as fiction without granting felt contact', () => {
  for (const verb of ['smile', 'slap']) {
    const result = executeCommand(setup(), { ...contact, verb });
    expect(result.outcome).toMatchObject({ ok: true, code: 'expressed' });
    expect(result.events.find((event) => event.type === 'expression')?.data).toMatchObject({
      mechanical: false,
    });
    expect(contactEvent(result.world)).toBeUndefined();
  }
});

it('refuses contact through an intervening slab and a body that cannot perform manual gestures', () => {
  const world = setup();
  const source = entityGet(world.entities, PLAYER_ID)!,
    target = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, source, { x: 20, y: 0, z: 5.5 }, 'terrain');
  setSpatialPosition(world, target, { x: 20, y: 3, z: 5.5 }, 'lookout-deck');
  expect(executeCommand(world, contact).outcome.ok).toBe(false);
  expect(contactEvent(world)).toBeUndefined();
  const animalWorld = setup();
  const animal = entityGet(animalWorld.entities, 'hare-1')!;
  expect(selectedExpressions(animalWorld, animal)).toEqual([]);
  expect(executeCommand(animalWorld, { ...contact, actorId: animal.id }).outcome).toMatchObject({
    ok: false,
    code: 'unsupported-body',
  });
});
