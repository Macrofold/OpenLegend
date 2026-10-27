import { describe, expect, it } from 'vitest';
import { fixture, command, aim } from '../../../tests/fixtures/combat-execution.js';
import { advanceWithNavigation } from '../../../tests/fixtures/navigation.js';
import { entityGet, entityValues } from './entity-collection.js';
import { advanceWorld, executeCommand } from './kernel.js';
import { createWorld, PLAYER_ID, NPC_ID } from './worlds/base/world.js';
import { itemFor, createItemLot } from './objects.js';
import { isEquipped } from './equipment.js';
import { inspectPossessions } from './inventory-inspection.js';
import { itemCharacteristics } from './item-characteristics.js';
import {
  bodyProfile,
  effectiveBodyProfile,
  setSpatialPosition,
  worldPosition,
  worldSupport,
  spatialMap,
} from './spatial-state.js';
import { definitionPin, validateWorldModules } from './world-modules.js';
import { rangedPolicy } from './ranged-policy.js';
import { settleProjectiles } from './ranged.js';
import { soundOrigin, visionQuery } from './perception.js';
import { interactionAnchor } from './spatial.js';
import { movingStrikeInReach } from './strikes.js';
import { canStand, movingBodyContact } from '@open-legend/spatial';
import type { WorldEvent, WorldState } from './types.js';

describe('connected native combat qualification', () => {
  it('walks to the starting lookout case, picks it up, inspects and equips its hammer, then completes one ordinary strike', () => {
    let world = createWorld(73);
    world.paused = false;
    for (const entity of entityValues(world.entities))
      if (entity.actor) {
        entity.actor.action = null;
        entity.actor.agency.plan = null;
        entity.actor.incapacitated = entity.id !== PLAYER_ID;
      }
    const caseEntity = entityValues(world.entities).find(
      (entity) => entity.item?.definitionPin.id === 'lookout-equipment-case',
    )!;
    const hammer = entityValues(world.entities).find(
      (entity) => entity.item?.definitionPin.id === 'hammer',
    )!;
    const spear = entityValues(world.entities).find(
      (entity) => entity.item?.definitionPin.id === 'spear',
    )!;
    expect(itemFor(world, caseEntity.id)?.ownerId).toBe('lookout-equipment');
    expect(itemFor(world, hammer.id)?.ownerId).toBe(caseEntity.id);
    expect(itemFor(world, spear.id)?.ownerId).toBe(caseEntity.id);
    const start = { ...worldPosition(entityGet(world.entities, PLAYER_ID)!) };
    world = command(world, {
      type: 'pickup',
      targetId: 'lookout-equipment',
      itemId: caseEntity.id,
    });
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action?.stage).toBe('approaching');
    const walked = advanceWithNavigation(world, 400);
    expect(walked.outcome.ok, walked.outcome.message).toBe(true);
    world = walked.world;
    expect(itemFor(world, caseEntity.id)?.ownerId).toBe(PLAYER_ID);
    expect(worldPosition(entityGet(world.entities, PLAYER_ID)!)).not.toEqual(start);
    expect(worldSupport(entityGet(world.entities, PLAYER_ID)!)).toBe('lookout-deck');
    world = command(world, { type: 'inspect-inventory', containerId: caseEntity.id });
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.inventoryInspection?.itemIds).toContain(
      hammer.id,
    );
    expect(
      inspectPossessions(world, PLAYER_ID, '', undefined, caseEntity.id).page.join(' '),
    ).toContain('Camp hammer');
    world = command(world, { type: 'equip', itemId: hammer.id });
    expect(isEquipped(world, PLAYER_ID, hammer.id)).toBe(true);
    world = command(world, { type: 'inspect-inventory', itemId: hammer.id });
    expect(
      inspectPossessions(world, PLAYER_ID, '', undefined, undefined, undefined, hammer.id).page[0],
    ).toContain('equipped');
    const definition = world.itemDefinitions['hammer']!;
    expect(itemCharacteristics(world, definition)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: definition.melee!.windupSeconds }),
        expect.objectContaining({ value: definition.melee!.recoverySeconds }),
      ]),
    );
    const actor = entityGet(world.entities, PLAYER_ID)!,
      target = entityGet(world.entities, NPC_ID)!,
      p = worldPosition(actor);
    // A controlled, available target on the actual deck isolates the ordinary weapon path.
    setSpatialPosition(world, target, { ...p, x: p.x - 0.8 }, worldSupport(actor));
    const health = target.actor!.health;
    world.rngState = 1;
    world = command(world, {
      type: 'strike',
      targetId: target.id,
      definitionId: 'hammer',
      weaponItemId: hammer.id,
    });
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action?.attackExecution).toBeUndefined();
    const impact = advanceWorld(world, definition.melee!.windupSeconds!);
    expect(impact.outcome.ok, impact.outcome.message).toBe(true);
    world = impact.world;
    expect(
      impact.events.filter((event) => event.type === 'struck' && event.actorId === PLAYER_ID),
    ).toHaveLength(1);
    expect(entityGet(world.entities, target.id)!.actor!.health).toBeLessThan(health);
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action?.strikePhase).toBe('recovery');
    world = advanceWorld(world, definition.melee!.recoverySeconds!).world;
    expect(entityGet(world.entities, PLAYER_ID)!.actor!.action).toBeNull();
    validateWorldModules(world);
  });

  it.each([0.35, 0.6, undefined])(
    'uses the installed duck height factor %s, with no omitted-law fallback',
    (factor) => {
      let { world } = fixture();
      const policy = world.moduleManifest.rangedPolicy!;
      if (factor === undefined) delete policy.localAvoidance;
      else policy.localAvoidance!.heightFactor = factor;
      world.moduleManifest.rangedPolicyPin = definitionPin(policy);
      world = aim(world);
      world = advanceWorld(world, 18).world;
      world = command(world, {
        type: 'release-shot',
        aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
      });
      const target = entityGet(world.entities, NPC_ID)!,
        ordinary = bodyProfile(target),
        p = worldPosition(target),
        flight = Object.values(world.projectiles!)[0]!,
        events: WorldEvent[] = [];
      flight.position = { ...p, y: p.y + 1.4 };
      flight.handling = 0;
      const health = target.actor!.health;
      settleProjectiles(world, events);
      const actual = effectiveBodyProfile(world, target);
      if (factor === undefined) {
        expect(target.spatial.localPose).toBeUndefined();
        expect(actual).toEqual(ordinary);
        expect(target.actor!.health).toBeLessThan(health);
      } else {
        expect(target.spatial.localPose?.profile).toEqual(definitionPin(rangedPolicy(world)!));
        expect(actual.height).toBeCloseTo(
          Math.max(ordinary.radius * 2 + 1e-5, ordinary.height * factor),
          4,
        );
        expect(target.actor!.health).toBe(health);
        expect(soundOrigin(world, target).y - p.y).toBeCloseTo(actual.earHeight);
        expect(interactionAnchor(world, target).y - p.y).toBeCloseTo(actual.interactionHeight);
        const witness = entityGet(world.entities, PLAYER_ID)!;
        setSpatialPosition(
          world,
          witness,
          { ...p, x: p.x + 0.05, y: p.y + actual.height + 0.08 },
          null,
        );
        witness.spatial.fallVelocity = 0;
        expect(movingStrikeInReach(world, target, witness, 0.03)).toBe(false);
        expect(movingBodyContact(flight.position, flight.position, p, p, actual)).toBeUndefined();
        // This screen is above the lower eye but below the taller alternate eye.
        world.map.spatial.blockers.push({
          id: 'qualification:eye-screen',
          bounds: {
            min: { x: p.x + 0.8, y: p.y, z: p.z - 0.5 },
            max: { x: p.x + 0.9, y: p.y + 0.72, z: p.z + 0.5 },
          },
          movement: true,
          sight: true,
          acousticTransmission: 1,
          material: 'wood',
        });
        world.map.spatial.revision++;
        expect(
          visionQuery(
            world,
            target,
          )({ position: { x: p.x + 1.5, y: p.y + actual.eyeHeight, z: p.z }, height: 0 }),
        ).toBe(factor === 0.6);
        world.map.spatial.blockers.push({
          id: 'qualification:ceiling',
          bounds: {
            min: { x: p.x - 0.4, y: p.y + actual.height + 0.02, z: p.z - 0.4 },
            max: { x: p.x + 0.4, y: p.y + actual.height + 0.08, z: p.z + 0.4 },
          },
          movement: true,
          sight: false,
          acousticTransmission: 1,
          material: 'wood',
        });
        world.map.spatial.revision++;
        const standing = { ...p, surfaceId: worldSupport(target)! };
        expect(canStand(spatialMap(world), standing, actual)).toBe(true);
        expect(canStand(spatialMap(world), standing, ordinary)).toBe(false);
        // Installed meaning cannot be withdrawn while the live saved posture depends on it.
        const missing = structuredClone(world);
        delete missing.moduleManifest.rangedPolicy!.localAvoidance;
        missing.moduleManifest.rangedPolicyPin = definitionPin(
          missing.moduleManifest.rangedPolicy!,
        );
        expect(() => validateWorldModules(missing)).toThrow();
      }
      validateWorldModules(world);
    },
  );

  it.each([true, false])(
    'retains native directional shield reduction and body susceptibility after scored flight (front: %s)',
    (front) => {
      for (const phase of [0, 0.125, 0.25]) {
        let { world } = fixture();
        const shield = Object.values(world.itemDefinitions).find(
          (definition) => definition.contactDefense,
        )!;
        expect(shield).toBeDefined();
        const itemId = createItemLot(world, NPC_ID, shield.id, 1);
        const act = (fields: Record<string, unknown>) => {
          const result = executeCommand(world, {
            id: `shield-${world.nextId}`,
            actorId: NPC_ID,
            ...fields,
          } as Parameters<typeof executeCommand>[1]);
          expect(result.outcome.ok, result.outcome.message).toBe(true);
          world = result.world;
        };
        act({ type: 'equip', itemId });
        act({ type: 'guard', itemId, facing: front ? -Math.PI / 2 : Math.PI / 2 });
        world = aim(world);
        world = advanceWorld(world, 18).world;
        expect(entityGet(world.entities, NPC_ID)!.actor!.action?.guard?.phase).toBe('ready');
        world = command(world, {
          type: 'release-shot',
          aimId: entityGet(world.entities, PLAYER_ID)!.actor!.action!.id,
          releaseInput: phase === 0.125 ? { kind: 'ordinary' } : { kind: 'timed-release', phase },
        });
        const target = entityGet(world.entities, NPC_ID)!,
          p = worldPosition(target),
          flight = Object.values(world.projectiles!)[0]!,
          events: WorldEvent[] = [];
        target.actor!.body!.susceptibility.injury = 0.5;
        flight.position = { ...p, y: p.y + 1.2 };
        flight.direction = { x: 1, y: 0, z: 0 };
        const health = target.actor!.health;
        settleProjectiles(world, events);
        const contact = events.find(
          (event) => event.type === 'projectile-contact' && event.actorId === NPC_ID,
        )!;
        expect(contact).toBeDefined();
        expect(contact.data!['rawInjury']).toBe(5);
        expect(contact.data!['preventedInjury']).toBe(front ? 2.5 : 0);
        // Exact contact harm is rounded by the installed whole-point health meter.
        expect(health - target.actor!.health).toBe(front ? 3 : 5);
        expect(target.spatial.localPose).toBeUndefined();
        expect(Object.keys(world.projectiles ?? {})).toHaveLength(0);
        if (front)
          expect(target.actor!.combatReadyAt).toBe(
            world.simTime + shield.contactDefense!.recoverySeconds,
          );
        validateWorldModules(world);
      }
    },
  );
});
