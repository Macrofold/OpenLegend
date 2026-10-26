import { expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID } from './worlds/base/world.js';
import { entityGet } from './entity-collection.js';
import { initializePerception, executeCommand } from './kernel.js';
import { setSpatialPosition, worldSupport } from './spatial-state.js';
import { expireExperience, invalidateExperience } from './experience.js';
import { validateRecognition,recognitionMaintenanceDue,expireRecognitionSeeds } from './worlds/base/recognition.js';

it('retains exact learned name and voice proof after ordinary speech retirement, revokes only supported learning, and restores through actual words', () => {
  let world = createWorld(167);
  world.observerIdentities![PLAYER_ID] = {};
  for (const [id, x] of [
    [PLAYER_ID, 1],
    [NPC_ID, 3],
  ] as const) {
    const entity = entityGet(world.entities, id)!;
    setSpatialPosition(world, entity, { x, y: 0, z: 2 }, worldSupport(entity));
  }
  initializePerception(world, []);
  const say = (id: string, text: string, at: number, introduction?: string) => {
    world = structuredClone(world);
    world.simTime = at;
    const transition = executeCommand(world, {
      id,
      actorId: NPC_ID,
      type: 'say',
      targetId: PLAYER_ID,
      text,
      ...(introduction ? { selfIntroduction: introduction } : {}),
    });
    expect(transition.outcome.ok).toBe(true);
    world = transition.world;
    return transition.events.find((event) => event.type === 'speech')!.id;
  };
  const original = say('first-introduction', 'My name is Tavin.', 0, 'Tavin');
  say('second-contact', 'The weather looks clear.', 120);
  say('third-contact', 'I will stay nearby.', 240);
  const learned = Object.values(world.observerIdentities![PLAYER_ID]!).find(
    (identity) => identity.givenName === 'Tavin',
  )!;
  expect(learned.voice!.samples.length).toBeGreaterThanOrEqual(2);
  const capsule = Object.values(world.experience!.temporal!.actors[PLAYER_ID]!.supports!).find(
    (value) => value.receipt.sourceIds.includes(original),
  )!;
  expect(
    capsule.values.some(
      (value) =>
        value.kind === 'speech' &&
        value.speech.segments.some((part) => part.kind === 'heard' && part.text.includes('Tavin')),
    ),
  ).toBe(true);
  expect(capsule.values.some((value) => value.kind === 'perceived-feature')).toBe(true);
  world = structuredClone(world);
  const retiring = world
    .experience!.awareness[PLAYER_ID]!.filter((entry) => entry.speech)
    .map((value) => ({ source: 'awareness' as const, value }));
  expect(expireExperience(world, PLAYER_ID, retiring, [])).toBe(true);
  expect(world.experience!.awareness[PLAYER_ID]!.some((entry) => entry.eventId === original)).toBe(
    false,
  );
  world.map.spatial.blockers.push({
    id: 'opaque-acoustically-transparent-fixture',
    bounds: { min: { x: 1.9, y: 0, z: 1 }, max: { x: 2.1, y: 3, z: 3 } },
    movement: false,
    sight: true,
    acousticTransmission: 1,
    material: 'cloth',
  });
  world.map.spatial.revision++;
  world.simTime = 300;
  initializePerception(world, []);
  const heard = say('unseen-recognized-voice', 'You can still hear me.', 360);
  const evidence = world.experience!.awareness[PLAYER_ID]!.find(
    (entry) => entry.eventId === heard,
  )!;
  expect(evidence.speech!.speaker?.nameAtTime).toBe('Tavin');
  expect(evidence.sourceId).toBeUndefined();
  expect(evidence.sourceSubject).toEqual({
    kind: 'individual',
    individualId: learned.individualId,
  });
  world = structuredClone(world);
  invalidateExperience(world, PLAYER_ID, [original], true);
  expect(
    Object.values(world.observerIdentities![PLAYER_ID]!).some(
      (identity) => identity.givenName === 'Tavin',
    ),
  ).toBe(false);
  const restored = say('renewed-introduction', 'My name is Tavin.', 480, 'Tavin');
  expect(world.experience!.awareness[PLAYER_ID]!.some((entry) => entry.eventId === restored)).toBe(
    true,
  );
  expect(
    Object.values(world.observerIdentities![PLAYER_ID]!).some(
      (identity) => identity.givenName === 'Tavin' && (identity.voice?.samples.length ?? 0) >= 2,
    ),
  ).toBe(true);
  validateRecognition(world);
});

it('expires a provisional unheard-identity introduction and its sparse proof without requiring another utterance',()=>{
  let world=createWorld(168);world.observerIdentities![PLAYER_ID]={};
  for(const [id,x]of [[PLAYER_ID,1],[NPC_ID,3]]as const){const entity=entityGet(world.entities,id)!;setSpatialPosition(world,entity,{x,y:0,z:2},worldSupport(entity));}
  world.map.spatial.blockers.push({id:'unseen-introduction-fixture',bounds:{min:{x:1.9,y:0,z:1},max:{x:2.1,y:3,z:3}},movement:false,sight:true,acousticTransmission:1,material:'cloth'});
  world.map.spatial.revision++;initializePerception(world,[]);
  const transition=executeCommand(world,{id:'provisional-unseen-name',actorId:NPC_ID,type:'say',targetId:PLAYER_ID,text:'My name is Orin.',selfIntroduction:'Orin'});
  expect(transition.outcome.ok).toBe(true);world=structuredClone(transition.world);
  const source=transition.events.find((event)=>event.type==='speech')!.id;
  const seed=world.observerIdentities![PLAYER_ID]![`voice-seed-${source}`]!;
  expect(seed).toMatchObject({seedOnly:true,givenName:'Orin'});
  expect(recognitionMaintenanceDue(world,PLAYER_ID)).toBe(1800);
  const before=world.experience!.temporal!.actors[PLAYER_ID]!.accounts!.optional.count;
  world.simTime=1800;expect(expireRecognitionSeeds(world,PLAYER_ID)).toBe(1);
  expect(recognitionMaintenanceDue(world,PLAYER_ID)).toBeNull();
  expect(world.observerIdentities![PLAYER_ID]![`voice-seed-${source}`]).toBeUndefined();
  expect(Object.values(world.experience!.temporal!.actors[PLAYER_ID]!.supports!).some((capsule)=>capsule.receipt.sourceIds.includes(source))).toBe(false);
  expect(world.experience!.temporal!.actors[PLAYER_ID]!.accounts!.optional.count).toBeLessThan(before);
  expect(world.experience!.awareness[PLAYER_ID]!.some((entry)=>entry.eventId===source)).toBe(true);
});
