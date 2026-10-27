import { describe, expect, it } from 'vitest';
import { fixture, command } from '../../../tests/fixtures/combat-execution.js';
import { admitDeclaration, advanceWorld } from './index.js';
import { entityGet } from './entity-collection.js';
import { createItemLot } from './objects.js';
import { nextRandom, PLAYER_ID, NPC_ID } from './data.js';
import { bodyProfile, setSpatialPosition, worldPosition } from './spatial-state.js';
import { rangedAccuracy } from './ranged-policy.js';
import { captureProjectileBodies, projectileBoundary, settleProjectiles } from './ranged.js';
import { changeParticipation } from './participation.js';
import { attachCapabilityContribution } from './state-contributions.js';
import { commitBodyEffects } from './living.js';
import { settleLocalPoses } from './local-avoidance.js';
import { materializeNativeValues } from './native-values.js';
import { definitionPin, validateWorldModules } from './world-modules.js';
import { occurrenceFor } from './action-experience.js';
import { projectEventEvidence } from './speech.js';
import type { DeclarationDraft, WorldEvent, WorldState } from './types.js';
import type { TimedReleaseInput } from './execution-input.js';

const bow: DeclarationDraft = {
  family: { id: 'base:flex', version: 1 },
  name: 'Specimen bow',
  description: 'A springy branch and cord.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'body' },
    { definitionId: 'cord', quantity: 1, role: 'binding' },
  ],
  output: { name: 'Specimen bow', description: 'Launches a compatible arrow.' },
  parameters: { workSeconds: 100, damage: 22, range: 8, accuracy: 0.8 },
};
const arrow: DeclarationDraft = {
  family: { id: 'base:arrow', version: 1 },
  name: 'Specimen arrow',
  description: 'A shaft, bone point and fletching.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'shaft' },
    { definitionId: 'bone', quantity: 1, role: 'point' },
    { definitionId: 'prepared_fiber', quantity: 1, role: 'fletching' },
  ],
  output: { name: 'Specimen arrow', description: 'A compatible physical projectile.' },
  parameters: { workSeconds: 72, damageBonus: 2 },
};
function generated(world: WorldState, draft: DeclarationDraft, id: string) {
  const admitted = admitDeclaration(world, draft, {
    actorId: PLAYER_ID,
    requestId: id,
    source: 'test-fixture',
    authority: { origin: 'player', policyRevision: 1 },
  });
  expect(admitted.outcome.ok, admitted.outcome.message).toBe(true);
  const definitionId =
    admitted.world.recipes[admitted.outcome.recipeId!]!.outputs[0]!.definition.id;
  return {
    world: admitted.world,
    itemId: createItemLot(admitted.world, PLAYER_ID, definitionId, 1, id + '-item'),
  };
}
function prepared(kind: 'sling' | 'bow') {
  let { world } = fixture();
  if (kind === 'bow') {
    const weapon = generated(world, bow, 'contribution-bow');
    world = weapon.world;
    world = generated(world, arrow, 'contribution-arrow').world;
    world = command(world, { type: 'equip', itemId: weapon.itemId });
  }
  const target = entityGet(world.entities, NPC_ID)!,
    p = worldPosition(target);
  world = command(world, {
    type: 'aim',
    targetId: NPC_ID,
    manualExecution: true,
    aimPoint: { ...p, y: p.y + 1.2 },
  });
  const work = entityGet(world.entities, PLAYER_ID)!.actor!.action!.remainingSeconds;
  world = advanceWorld(world, work).world;
  const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
  expect(action.attackExecution?.ready).toBe(true);
  return world;
}
function inputChoices(world: WorldState): TimedReleaseInput[] {
  const profile = entityGet(world.entities, PLAYER_ID)!.actor!.action!.attackExecution!.profile;
  return [
    { kind: 'timed-release', phase: 0 },
    { kind: 'ordinary' },
    { kind: 'timed-release', phase: profile.center / 2 },
  ];
}
function seedBetween(min: number, max: number): number {
  for (let seed = 1; seed < 100_000; seed++) {
    const sample = nextRandom({ rngState: seed } as WorldState);
    if (sample > min && sample < max) return seed;
  }
  throw Error('No deterministic sample between response thresholds.');
}
function release(base: WorldState, input: TimedReleaseInput) {
  const world = structuredClone(base),
    action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
  const ammo = action.ammoItemId!,
    before = entityGet(world.entities, ammo)!.item!.quantity,
    at = world.simTime;
  const result = command(world, { type: 'release-shot', aimId: action.id, releaseInput: input });
  expect(entityGet(result.entities, ammo)?.item?.quantity ?? 0).toBe(before - 1);
  expect(result.simTime).toBe(at);
  expect(result.events.filter((e) => e.type === 'shot-released')).toHaveLength(1);
  expect(Object.values(result.projectiles!)).toHaveLength(1);
  return result;
}
function cross(released: WorldState, seed: number) {
  const world = structuredClone(released),
    target = entityGet(world.entities, NPC_ID)!,
    p = worldPosition(target),
    flight = Object.values(world.projectiles!)[0]!,
    events: WorldEvent[] = [];
  // The real committed flight is placed at an observed upper-body crossing;
  // native sweep/time-cut equivalence has separate chronology coverage.
  flight.position = { ...p, y: p.y + 1.2 };
  world.rngState = seed;
  settleProjectiles(world, events);
  const contact = events.find((e) => e.type === 'projectile-contact');
  return { world, events, ducked: !!target.spatial.localPose, contact };
}
describe('generated ranged execution at actual body crossings', () => {
  it.each(['sling', 'bow'] as const)(
    'applies both %s contact tails without ray redirection, extra ammunition or injury scaling',
    (kind) => {
      const base = prepared(kind),
        released = inputChoices(base).map((input) => release(base, input)),
        flights = released.map((world) => Object.values(world.projectiles!)[0]!),
        ordinary = flights[1]!,
        target = entityGet(base.entities, NPC_ID)!,
        handling = rangedAccuracy(base, target, ordinary.handling);
      expect(flights.map((f) => f.execution?.score)).toEqual([-1, 0, 1]);
      expect(flights.map((f) => f.direction)).toEqual(Array(3).fill(ordinary.direction));
      expect(flights.map((f) => f.position)).toEqual(Array(3).fill(ordinary.position));
      expect(flights.map((f) => f.injury)).toEqual(Array(3).fill(ordinary.injury));
      expect(flights.map((f) => f.speed)).toEqual(Array(3).fill(ordinary.speed));
      const poor = handling * (1 - ordinary.execution!.contact!.negative),
        excellent = Math.min(1, handling * (1 + ordinary.execution!.contact!.positive));
      expect(handling).toBeGreaterThan(poor);
      expect(excellent).toBeGreaterThan(handling);
      for (const [seed, expected] of [
        [seedBetween(poor, handling), [true, false, false]],
        [seedBetween(handling, excellent), [true, true, false]],
      ] as const) {
        const results = released.map((world) => cross(world, seed));
        expect(results.map((result) => result.ducked)).toEqual(expected);
        expect(results.map((result) => !!result.contact)).toEqual(
          expected.map((ducked) => !ducked),
        );
        for (const result of results) validateWorldModules(result.world);
      }
      const allHit = released.map((world) => cross(world, seedBetween(0, poor)));
      expect(allHit.every((result) => !!result.contact)).toBe(true);
      expect(allHit.map((result) => result.contact!.data!['rawInjury'])).toEqual(
        Array(3).fill(allHit[1]!.contact!.data!['rawInjury']),
      );
      expect(
        allHit.map((result) => entityGet(result.world.entities, NPC_ID)!.actor!.health),
      ).toEqual(Array(3).fill(entityGet(allHit[1]!.world.entities, NPC_ID)!.actor!.health));
    },
  );
  it('retains alternate installed projectile injury after source departure and applies both score tails equally at player and NPC collateral contact', () => {
    let { world, toolId } = fixture();
    const supplied =
      world.itemDefinitions[entityGet(world.entities, toolId)!.item!.definitionPin.id]!;
    // Trusted alternate-world content: the bundled sling/bow profiles remain unchanged.
    const definition = {
      id: 'alternate-injury-ranged-weapon',
      version: 1,
      name: 'Alternate ranged weapon',
      description: 'A finite fixture ranged weapon with a supported injury contribution.',
      properties: [...supplied.properties],
      portable: true,
      packingLoad: supplied.packingLoad,
      equipment: structuredClone(supplied.equipment!),
      rangedWeapon: structuredClone(supplied.rangedWeapon!),
      execution: {
        ...structuredClone(supplied.execution!),
        injury: { positive: 0.25, negative: 0.2 },
      },
    };
    world.itemDefinitions[definition.id] = definition;
    toolId = createItemLot(world, PLAYER_ID, definition.id, 1);
    expect(entityGet(world.entities, toolId)!.item!.definitionPin).toEqual(
      definitionPin(definition),
    );
    world = command(world, { type: 'equip', itemId: toolId });
    const point = worldPosition(entityGet(world.entities, NPC_ID)!);
    world = command(world, {
      type: 'aim',
      manualExecution: true,
      aimPoint: { ...point, y: point.y + 0.2 },
    });
    world = advanceWorld(world, 18).world;
    validateWorldModules(world);
    const base = world,
      results: { human: boolean; injuries: number[]; health: number[] }[] = [];
    for (const human of [false, true]) {
      const injuries: number[] = [],
        health: number[] = [];
      for (const input of inputChoices(base)) {
        let current = release(base, input);
        const flight = Object.values(current.projectiles!)[0]!,
          retained = structuredClone(flight),
          nativeInjury = flight.injury;
        expect(flight.targetId).toBeUndefined();
        expect(flight.execution!.injury).toEqual(definition.execution.injury);
        for (const type of ['begin-exit', 'depart'] as const) {
          const revision =
            entityGet(current.entities, PLAYER_ID)!.actor!.participation?.revision ?? 0;
          const transition = changeParticipation(current, PLAYER_ID, revision, {
            type,
            attemptId: 'alternate-source-exit',
          });
          expect(transition.outcome.ok, transition.outcome.message).toBe(true);
          current = transition.world;
        }
        expect(current.projectiles![flight.id]).toEqual(retained);
        current = JSON.parse(JSON.stringify(current)) as WorldState;
        const target = entityGet(current.entities, NPC_ID)!,
          at = worldPosition(target),
          events: WorldEvent[] = [];
        target.actor!.controller = human ? 'player' : 'npc';
        target.actor!.body!.susceptibility.injury = 1;
        current.projectiles![flight.id]!.position = { ...at, y: at.y + 0.2 };
        const rng = current.rngState,
          healthBefore = target.actor!.health;
        settleProjectiles(current, events);
        const contact = events.find(
          (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
        )!;
        expect(contact).toBeDefined();
        const score = retained.execution!.score,
          factor = 1 + score * (score >= 0 ? 0.25 : 0.2);
        expect(contact.data!['rawInjury']).toBeCloseTo(nativeInjury * factor);
        expect(healthBefore - target.actor!.health).toBe(
          Math.min(healthBefore, Math.max(1, Math.round(nativeInjury * factor))),
        );
        expect(current.rngState).toBe(rng);
        expect(events.some((event) => event.type === 'shot-ended')).toBe(false);
        expect(contact.data).not.toHaveProperty('contactSourceId');
        expect(current.projectiles![flight.id]).toBeUndefined();
        injuries.push(Number(contact.data!['rawInjury']));
        health.push(target.actor!.health);
        validateWorldModules(current);
      }
      results.push({ human, injuries, health });
    }
    expect(results[0]!.injuries[0]).toBeLessThan(results[0]!.injuries[1]!);
    expect(results[0]!.injuries[2]).toBeGreaterThan(results[0]!.injuries[1]!);
    expect(results[1]!.injuries).toEqual(results[0]!.injuries);
    expect(results[1]!.health).toEqual(results[0]!.health);
  });
  it('continues one saved flight after the shooter departs, with anonymous actual-victim evidence', () => {
    const base = prepared('bow');
    let world = release(base, { kind: 'ordinary' });
    const flight = Object.values(world.projectiles!)[0]!,
      flightId = flight.id,
      actionId = flight.actionId,
      releaseEvidence = structuredClone(occurrenceFor(world, PLAYER_ID, actionId)!.release);
    for (const type of ['begin-exit', 'depart'] as const) {
      const revision = entityGet(world.entities, PLAYER_ID)!.actor!.participation?.revision ?? 0;
      const result = changeParticipation(world, PLAYER_ID, revision, {
        type,
        attemptId: 'source-departure',
      });
      expect(result.outcome.ok, result.outcome.message).toBe(true);
      world = result.world;
    }
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.participation!.phase).toBe('inactive');
    expect(world.projectiles![flightId]).toBeDefined();
    validateWorldModules(world);
    world = JSON.parse(JSON.stringify(world)) as WorldState;
    const target = entityGet(world.entities, NPC_ID)!,
      handling = rangedAccuracy(world, target, world.projectiles![flightId]!.handling),
      before = target.actor!.health,
      result = cross(world, seedBetween(0, handling));
    expect(result.contact).toBeDefined();
    expect(entityGet(result.world.entities, NPC_ID)!.actor!.health).toBeLessThan(before);
    expect(result.world.projectiles![flightId]).toBeUndefined();
    expect(result.events.filter((event) => event.type === 'projectile-contact')).toHaveLength(1);
    expect(result.events.some((event) => event.type === 'shot-ended')).toBe(false);
    expect(result.contact!.data).not.toHaveProperty('contactSourceId');
    const awareness = result.world.experience!.awareness[NPC_ID]!.find(
      (entry) => entry.eventId === result.contact!.id,
    )!;
    expect(awareness).toBeDefined();
    const disclosed = projectEventEvidence(result.contact!, awareness);
    expect(JSON.stringify(disclosed)).not.toContain(PLAYER_ID);
    expect(disclosed.data).not.toHaveProperty('sourceId');
    expect(disclosed.data).not.toHaveProperty('intendedTargetId');
    expect(disclosed.data).not.toHaveProperty('execution');
    expect(disclosed.text).not.toContain(entityGet(result.world.entities, PLAYER_ID)!.name);
    expect(occurrenceFor(result.world, PLAYER_ID, actionId)!.release).toEqual(releaseEvidence);
    validateWorldModules(result.world);
  });
});

function duckedCrossing() {
  const released = release(prepared('sling'), { kind: 'ordinary' }),
    target = entityGet(released.entities, NPC_ID)!,
    handling = rangedAccuracy(released, target, Object.values(released.projectiles!)[0]!.handling),
    result = cross(released, seedBetween(handling, 1));
  expect(result.ducked).toBe(true);
  const flight = Object.values(result.world.projectiles!)[0]!;
  expect(Object.keys(flight.encounters!)).toHaveLength(1);
  validateWorldModules(result.world);
  return { world: result.world, flightId: flight.id };
}
it('retires a departed victim pose and exact crossing atomically without resetting its cooldown or recalling the flight', () => {
  let { world, flightId } = duckedCrossing();
  const cooldown = entityGet(world.entities, NPC_ID)!.spatial.localAvoidanceReadyAt;
  for (const type of ['begin-exit', 'depart'] as const) {
    const result = changeParticipation(
      world,
      NPC_ID,
      entityGet(world.entities, NPC_ID)!.actor!.participation?.revision ?? 0,
      { type, attemptId: 'ducking-victim-exit' },
    );
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    world = result.world;
  }
  expect(entityGet(world.entities, NPC_ID)!.spatial.localPose).toBeUndefined();
  expect(entityGet(world.entities, NPC_ID)!.spatial.localAvoidanceReadyAt).toBe(cooldown);
  expect(world.projectiles![flightId]).toBeDefined();
  expect(Object.keys(world.projectiles![flightId]!.encounters!)).toHaveLength(0);
  validateWorldModules(world);
  world = JSON.parse(JSON.stringify(world)) as WorldState;
  const returned = changeParticipation(
    world,
    NPC_ID,
    entityGet(world.entities, NPC_ID)!.actor!.participation!.revision,
    { type: 'return' },
  );
  expect(returned.outcome.ok, returned.outcome.message).toBe(true);
  world = returned.world;
  expect(entityGet(world.entities, NPC_ID)!.spatial.localAvoidanceReadyAt).toBe(cooldown);
  validateWorldModules(world);
});
it('retires a dead victim crossing in the body writer before current-format publication', () => {
  const { world, flightId } = duckedCrossing(),
    target = entityGet(world.entities, NPC_ID)!;
  commitBodyEffects(
    world,
    target,
    [{ kind: 'health', amount: -target.actor!.health, targetId: NPC_ID }],
    'fixture-impact',
    [],
  );
  expect(target.actor!.alive).toBe(false);
  expect(target.spatial.localPose).toBeUndefined();
  expect(target.spatial.localAvoidanceReadyAt).toBeUndefined();
  expect(world.projectiles![flightId]).toBeDefined();
  expect(Object.keys(world.projectiles![flightId]!.encounters!)).toHaveLength(0);
  validateWorldModules(world);
});

it('forecasts a movement-restricted falling body at its actual position across native time cuts', () => {
  let world = release(prepared('sling'), { kind: 'ordinary' });
  const target = entityGet(world.entities, NPC_ID)!,
    p = worldPosition(target),
    source = worldPosition(entityGet(world.entities, PLAYER_ID)!),
    flight = Object.values(world.projectiles!)[0]!,
    height = bodyProfile(target).height;
  setSpatialPosition(world, target, { ...p, y: p.y + 2 }, null);
  target.spatial.fallVelocity = 0;
  // The ray crosses just below the stationary body's crown. Forecasting a fall
  // that the movement owner has prohibited would miss this chronological cut.
  flight.position = { ...source, y: p.y + 2 + height - 0.05 };
  flight.direction = { x: 1, y: 0, z: 0 };
  flight.speed = 1;
  flight.handling = 0;
  flight.sourceExited = true;
  const definitionId = 'fixture:restricted-faller';
  world.statusEffectPolicy.definitions.push({
    id: definitionId,
    type: 'statusEffect',
    target: '$subject',
    label: 'Movement blocked',
    enabled: true,
    requires: { field: { target: '$subject', name: 'alive', operator: 'equal', value: true } },
    reactivationDelaySeconds: 0,
    occupiesAction: false,
    interruptOn: [],
    whileActive: [{ restrictCapabilities: { target: '$subject', capabilities: ['locomotion'] } }],
    contribution: { disclosure: 'owner', lifetime: 'fixed', seconds: 10 },
  });
  const restricted = attachCapabilityContribution(world, {
    id: 'fixture:restricted-faller-contribution',
    sourceId: PLAYER_ID,
    targetId: NPC_ID,
    definitionId,
    expectedPolicyRevision: world.statusEffectPolicy.revision,
    lifetime: { kind: 'fixed', expiresAt: world.simTime + 10 },
  });
  expect(restricted.outcome.ok, restricted.outcome.message).toBe(true);
  world = restricted.world;
  const boundary = projectileBoundary(
    world,
    captureProjectileBodies(world, [NPC_ID]),
    [flight.id],
    4,
    undefined,
    false,
  );
  expect(boundary).toBeGreaterThan(1);
  expect(boundary).toBeLessThan(2);
  const run = (step: number) => {
    let current = structuredClone(world);
    const events: WorldEvent[] = [];
    for (let left = 4; left > 1e-8; left -= Math.min(step, left)) {
      const result = advanceWorld(current, Math.min(step, left));
      expect(result.outcome.ok, result.outcome.message).toBe(true);
      current = result.world;
      events.push(...result.events);
    }
    validateWorldModules(current);
    return {
      world: current,
      contact: events.find(
        (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
      ),
    };
  };
  const large = run(4),
    small = run(0.1);
  expect(large.contact).toBeDefined();
  expect(small.contact).toBeDefined();
  expect(large.contact!.at).toBeCloseTo(small.contact!.at, 5);
  expect(worldPosition(entityGet(large.world.entities, NPC_ID)!)).toEqual({ ...p, y: p.y + 2 });
  expect(entityGet(large.world.entities, NPC_ID)!.actor!.health).toBe(
    entityGet(small.world.entities, NPC_ID)!.actor!.health,
  );
  expect(large.world.rngState).toBe(small.world.rngState);
});

it('settles a restored-body contact before starting incompatible work after the old blocker departs', () => {
  const crossing = duckedCrossing();
  let world = materializeNativeValues(crossing.world);
  const target = entityGet(world.entities, NPC_ID)!,
    blocker = entityGet(world.entities, PLAYER_ID)!,
    p = worldPosition(target),
    health = target.actor!.health;
  // Isolate the supported saved blocked-return boundary. The pending real shot
  // stays inside the ordinary body while another body prevents its expansion.
  setSpatialPosition(world, blocker, { ...p, y: p.y + 1.2 }, null);
  blocker.spatial.fallVelocity = 0;
  world.simTime = target.spatial.localPose!.restoreAt;
  delete world.nativeInterval;
  expect(settleLocalPoses(world, [NPC_ID, PLAYER_ID], [])).toBe(false);
  expect(target.spatial.localPose!.phase).toBe('restore-blocked');
  validateWorldModules(world);
  for (const type of ['begin-exit', 'depart'] as const) {
    const departed = changeParticipation(
      world,
      PLAYER_ID,
      entityGet(world.entities, PLAYER_ID)!.actor!.participation?.revision ?? 0,
      { type, attemptId: 'standing-blocker-exit' },
    );
    expect(departed.outcome.ok, departed.outcome.message).toBe(true);
    world = departed.world;
  }
  expect(entityGet(world.entities, NPC_ID)!.spatial.localPose!.phase).toBe('restore-blocked');
  const recipe = Object.values(world.recipes).find((value) =>
    value.outputs.some((output) => output.definition.id === 'cord'),
  )!;
  expect(recipe).toBeDefined();
  const result = command(world, { type: 'craft', actorId: NPC_ID, recipeId: recipe.id });
  expect(entityGet(result.entities, NPC_ID)!.spatial.localPose).toBeUndefined();
  expect(entityGet(result.entities, NPC_ID)!.actor!.health).toBeLessThan(health);
  expect(entityGet(result.entities, NPC_ID)!.actor!.alive).toBe(true);
  expect(entityGet(result.entities, NPC_ID)!.actor!.action?.type).toBe('craft');
  expect(result.projectiles![crossing.flightId]).toBeUndefined();
  expect(
    result.events.filter(
      (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
    ),
  ).toHaveLength(1);
  validateWorldModules(result);
});
