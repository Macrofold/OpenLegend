import { describe, expect, it } from 'vitest';
import { fixture, command, aim } from '../../../tests/fixtures/combat-execution.js';
import { entityGet } from './entity-collection.js';
import { advanceWorld, executeCommand, freezeWorld } from './index.js';
import { createItemLot } from './objects.js';
import { PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import {
  effectiveBodyProfile,
  bodyProfile,
  setSpatialPosition,
  worldPosition,
  worldSupport,
} from './spatial-state.js';
import { validateWorldModules } from './world-modules.js';
import { pointShotProblem, settleProjectiles } from './ranged.js';
import { seesEntity } from './perception.js';
import { occurrenceFor } from './action-experience.js';
import { bodyCenter, interactionAnchor, nearbyBodyEntities } from './spatial.js';

describe('native skilled combat execution', () => {
  it('retains an observed body point through early release and reload while low cover still intercepts the ray', () => {
    let { world } = fixture();
    const actor = entityGet(world.entities, PLAYER_ID)!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(actor);
    setSpatialPosition(world, target, { ...p, z: p.z - 2 }, worldSupport(actor));
    actor.spatial.heading = Math.PI;
    world.map.spatial!.blockers.push({
      id: 'low-aim-screen',
      bounds: {
        min: { x: p.x - 0.8, y: p.y, z: p.z - 1.2 },
        max: { x: p.x + 0.8, y: p.y + 1.4, z: p.z - 1.1 },
      },
      movement: true,
      sight: true,
      acousticTransmission: 1,
      material: 'wood',
    });
    world.map.spatial!.revision++;
    const point = { ...worldPosition(target), y: p.y + 0.875 },
      subject = { id: NPC_ID, life: target.actor!.physicalLife ?? 0 },
      health = target.actor!.health;
    expect(seesEntity(world, actor, target)).toBe(true);
    expect(pointShotProblem(world, actor, point, 7)?.code).toBe('not-visible');
    expect(pointShotProblem(world, actor, point, 7, subject)).toBeNull();
    expect(
      pointShotProblem(world, actor, point, 7, { ...subject, life: subject.life + 1 })?.code,
    ).toBe('not-visible');
    expect(pointShotProblem(world, actor, { ...point, x: point.x + 0.7 }, 7, subject)?.code).toBe(
      'not-visible',
    );
    world = command(world, {
      type: 'aim',
      manualExecution: true,
      targetId: NPC_ID,
      aimPoint: point,
      aimPointSubject: subject,
    });
    const id = entityGet(world.entities, PLAYER_ID)!.actor!.action!.id;
    world = command(world, {
      type: 'release-shot',
      aimId: id,
      aimPoint: point,
      aimPointSubject: subject,
      releaseInput: { kind: 'ordinary' },
    });
    expect(
      entityGet(world.entities, PLAYER_ID)!.actor!.action!.attackExecution!.pendingRelease!
        .aimPointSubject,
    ).toEqual(subject);
    validateWorldModules(world);
    world = JSON.parse(JSON.stringify(world));
    world = advanceWorld(world, 18, {
      playerInputs: [{ actorId: PLAYER_ID, release: { actionId: id, startsAt: 0, endsAt: 19 } }],
    }).world;
    expect(world.events.filter((event) => event.type === 'shot-released')).toHaveLength(1);
    world = advanceWorld(world, 5).world;
    expect(Object.keys(world.projectiles ?? {})).toHaveLength(0);
    expect(world.events.some((event) => event.data?.['interceptionId'] === 'low-aim-screen')).toBe(
      true,
    );
    expect(entityGet(world.entities, NPC_ID)!.actor!.health).toBe(health);
    validateWorldModules(world);
  });

  it('holds a point shot, releases the exact ray once and keeps body recovery after cancellation', () => {
    let { world } = fixture();
    world = aim(world);
    world = advanceWorld(world, 18).world;
    const action = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
    expect(action.attackExecution?.ready).toBe(true);
    const rng = world.rngState,
      at = world.simTime;
    world = command(world, {
      type: 'release-shot',
      aimId: action.id,
      releaseInput: { kind: 'timed-release', phase: 0.25 },
    });
    const flight = Object.values(world.projectiles!)[0]!;
    expect(flight.direction).toEqual({ x: 1, y: 0, z: 0 });
    expect(world.rngState).toBe(rng);
    expect(flight.execution?.score).toBe(1);
    const evidence = occurrenceFor(world, PLAYER_ID, action.id)!;
    expect(evidence.noLearningControl).toBe(true);
    expect(evidence.attackExecution?.input).toEqual({
      kind: 'timed-release',
      phase: 0.25,
    });
    expect(evidence.attackExecution?.assessment).toEqual({
      score: 1,
      quality: 'excellent',
      mode: 'manual',
    });
    expect(flight.targetId).toBeUndefined();
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.combatReadyAt).toBe(at + 18);
    world = command(world, { type: 'cancel' });
    expect(
      executeCommand(world, {
        id: 'too-soon',
        actorId: PLAYER_ID,
        type: 'aim',
        aimPoint: { x: 5, y: 0.85, z: 0 },
      }).outcome.code,
    ).toBe('combat-recovery');
    expect(Object.keys(world.projectiles!)).toHaveLength(1);
    validateWorldModules(world);
    const damaged = structuredClone(world);
    occurrenceFor(damaged, PLAYER_ID, action.id)!.attackExecution!.assessment.score = 0;
    expect(() => validateWorldModules(damaged)).toThrow(
      'Invalid committed attack execution evidence',
    );
  });

  it('retains an early release through current-format reload but requires a live action-bound window', () => {
    let { world } = fixture();
    world = aim(world);
    const id = entityGet(world.entities, PLAYER_ID)!.actor!.action!.id;
    world = command(world, {
      type: 'release-shot',
      aimId: id,
      aimTarget: { id: NPC_ID, life: entityGet(world.entities, NPC_ID)!.actor!.physicalLife ?? 0 },
      releaseInput: { kind: 'timed-release', phase: 0.25 },
    });
    validateWorldModules(world);
    world = structuredClone(world);
    world = advanceWorld(world, 18, {
      playerInputs: [
        {
          actorId: NPC_ID,
          steering: {
            direction: { x: 0, z: 1 },
            startsAt: world.simTime,
            endsAt: world.simTime + 18,
          },
        },
      ],
    }).world;
    const aimed = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
    expect(aimed.ranged?.aimTarget?.id).toBe(NPC_ID);
    expect(aimed.ranged?.aimPoint).toBeUndefined();
    expect(aimed.ranged?.observedMotion?.to.z).toBeGreaterThan(
      aimed.ranged!.observedMotion!.from.z,
    );
    expect(aimed.ranged?.observedMotion?.to).toEqual(
      bodyCenter(world, entityGet(world.entities, NPC_ID)!),
    );
    expect(Object.keys(world.projectiles ?? {})).toHaveLength(0);
    expect(
      entityGet(world.entities, PLAYER_ID)!.actor!.action!.attackExecution?.pendingRelease,
    ).toBeDefined();
    const continued = advanceWorld(world, 0.01, {
      playerInputs: [
        {
          actorId: PLAYER_ID,
          release: { actionId: id, startsAt: world.simTime, endsAt: world.simTime + 1 },
        },
      ],
    });
    expect(continued.world.events.filter((event) => event.type === 'shot-released')).toHaveLength(
      1,
    );
    expect(entityGet(continued.world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    const shot = Object.values(continued.world.projectiles!)[0]!;
    const from = interactionAnchor(world, entityGet(world.entities, PLAYER_ID)!);
    const to = bodyCenter(world, entityGet(world.entities, NPC_ID)!);
    expect(shot.targetId).toBe(NPC_ID);
    expect(shot.direction.z / shot.direction.x).toBeGreaterThan((to.z - from.z) / (to.x - from.x));
    expect(occurrenceFor(continued.world, PLAYER_ID, id)!.release?.aimTarget?.id).toBe(NPC_ID);
    validateWorldModules(continued.world);
  });

  it('holds a spear without pursuit, then commits an out-of-range miss and full recovery', () => {
    let { world } = fixture();
    const spear = createItemLot(world, PLAYER_ID, 'spear', 1, 'execution-spear');
    world = command(world, { type: 'equip', itemId: spear });
    const before = { ...worldPosition(entityGet(world.entities, PLAYER_ID)!) };
    world = command(world, {
      type: 'strike',
      targetId: NPC_ID,
      definitionId: 'spear',
      weaponItemId: spear,
      manualExecution: true,
    });
    world = advanceWorld(world, 18).world;
    const held = entityGet(world.entities, PLAYER_ID)!.actor!.action!;
    expect(held.attackExecution?.ready).toBe(true);
    expect(worldPosition(entityGet(world.entities, PLAYER_ID)!)).toEqual(before);
    const target = entityGet(world.entities, NPC_ID)!;
    setSpatialPosition(
      world,
      target,
      { ...worldPosition(target), x: before.x + 4 },
      worldSupport(target),
    );
    world = command(world, {
      type: 'release-strike',
      expectedActionId: held.id,
      releaseInput: { kind: 'timed-release', phase: 0.25 },
    });
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action?.strikeOutcome).toBe('miss');
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.combatReadyAt).toBe(world.simTime + 36);
    validateWorldModules(world);
  });

  it('settles equal-time arrows against one actual duck and still lets a low arrow hit', () => {
    let { world } = fixture();
    world = aim(world);
    world = advanceWorld(world, 18).world;
    const id = entityGet(world.entities, PLAYER_ID)!.actor!.action!.id;
    world = command(world, { type: 'release-shot', aimId: id });
    const flight = Object.values(world.projectiles!)[0]!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(target);
    flight.position = { x: p.x, y: p.y + 1.2, z: p.z };
    flight.handling = 0;
    world.projectiles!['zz-low'] = {
      ...structuredClone(flight),
      id: 'zz-low',
      actionId: 'low-second',
      position: { x: p.x, y: p.y + 0.2, z: p.z },
    };
    const health = target.actor!.health,
      rng = world.rngState,
      events: import('./types.js').WorldEvent[] = [];
    settleProjectiles(world, events);
    expect(events.filter((event) => event.type === 'body-ducked')).toHaveLength(1);
    expect(effectiveBodyProfile(world, target).height).toBeLessThan(bodyProfile(target).height);
    expect(target.actor!.health).toBeLessThan(health);
    expect(world.projectiles![flight.id]).toBeDefined();
    expect(world.projectiles!['zz-low']).toBeUndefined();
    expect(world.rngState).toBe(rng);
    validateWorldModules(world);
    world.projectiles = {};
    world = advanceWorld(world, 12).world;
    expect(entityGet(world.entities, NPC_ID)!.spatial.localPose).toBeUndefined();
  });

  it('mutates the current contact body when the reusable neighborhood came from a frozen snapshot', () => {
    let { world } = fixture();
    entityGet(world.entities, NPC_ID)!.actor!.incapacitated = true;
    world = aim(world);
    world = advanceWorld(world, 18).world;
    world = command(world, {
      type: 'release-shot',
      aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
    });
    const target = entityGet(world.entities, NPC_ID)!,
      health = target.actor!.health;
    nearbyBodyEntities(world, worldPosition(target), 0);
    freezeWorld(world);
    const advanced = advanceWorld(world, 6).world;
    expect(entityGet(world.entities, NPC_ID)!.actor!.health).toBe(health);
    expect(entityGet(advanced.entities, NPC_ID)!.actor!.health).toBeLessThan(health);
    expect(advanced.events.filter((event) => event.type === 'projectile-contact')).toHaveLength(1);
    validateWorldModules(advanced);
  });
});
