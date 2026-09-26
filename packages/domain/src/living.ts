import { recordSemanticChange } from './dependencies.js';
import { worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { livingBody, nativeActor } from './worlds/base/bodies.js';
import { setBodyHealth } from './body-state.js';
import { interruptStatusEffects } from './status-effects.js';
import { finishPlanAction } from './agency.js';
import type { Entity, WorldEvent, WorldState, Transition } from './types.js';
import { draftWorld } from './draft.js';
import { canonicalJson, emit, finish, outcome } from './events.js';

export interface LivingBody {
  plan: 'biped' | 'quadruped' | 'avian';
  maxHealth: number;
  revision: number;
  conditions: { injury: number; wetness: number; burning: number };
  susceptibility: { injury: number; wetness: number; burning: number; healing: number };
  harvestYield: { definitionId: string; quantity: number }[];
}
export function hasMemory(entity: Entity | undefined): boolean {
  return (
    !!entity?.actor && (entity.actor.capabilities?.memory ?? entity.actor.controller !== 'native')
  );
}
/** Current manual-work families are reviewed for the biped body only. Cognition is not anatomy.
 * docs/engine-and-world-boundaries.md#intentional-v1-specificity
 */
export function supportsManualWork(entity: Entity | undefined): boolean {
  return entity?.actor?.body?.plan === 'biped';
}
export function canSpeak(entity: Entity | undefined): boolean {
  return (
    !!entity?.actor && (entity.actor.capabilities?.speech ?? entity.actor.controller !== 'native')
  );
}
// Stable composition exports; authored defaults have one base-world owner.
export { livingBody, nativeActor } from './worlds/base/bodies.js';
/** The sole legacy physical conversion. Run inside the startup/create transaction. */
export function migrateActors(world: WorldState): void {
  if (world.schemaVersion >= 3) return;
  for (const entity of Object.values(world.entities)) {
    const legacy = entity.animal;
    if (!entity.actor && legacy) {
      if (!legacy.species) throw new Error(`Missing legacy species for ${entity.id}`);
      entity.actor = nativeActor(legacy.species, world.simTime);
      entity.actor.birthTimeKnown = false;
      entity.actor.health = legacy.health ?? entity.actor.health;
      entity.actor.alive = legacy.alive ?? !entity.remains;
      if (entity.kind === 'remains') entity.kind = 'animal';
    }
    if (entity.actor) {
      const actor = entity.actor;
      actor.species ??= legacy?.species ?? 'human';
      actor.body ??= livingBody(actor.species);
      actor.capabilities ??= {
        cognition: true,
        memory: true,
        innerWorld: true,
        speech: true,
        needs: true,
      };
      if (legacy) {
        delete legacy.health;
        delete legacy.alive;
        delete legacy.species;
      }
    }
  }
  world.schemaVersion = 3;
  const result = outcome(true, 'actors-migrated', 'Living actors migrated to schema 3.');
  world.commandReceipts['migration:actors:3'] = { digest: 'living-actors:3', outcome: result };
  emit(world, [], 'schema-migrated', result.message, undefined, undefined, {
    significant: true,
    schemaVersion: 3,
  });
  world.sequence++;
}
/** All health/condition/lifecycle changes reconcile through this native mutation. */
export function reconcileBody(
  world: WorldState,
  entity: Entity,
  events: WorldEvent[],
  cause: string,
): void {
  const actor = entity.actor!;
  const body = actor.body!;
  body.revision++;
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'body' });
  setBodyHealth(actor, Math.max(0, Math.min(body.maxHealth, actor.health)));
  if (actor.health === 0 && actor.alive && !actor.incapacitated) {
    if (actor.action)
      finishPlanAction(
        world,
        entity.id,
        actor.action.id,
        outcome(false, 'actor-unavailable', 'The body can no longer continue this work.'),
      );
    actor.action = null;
    if (worldSupport(entity) === null) {
      delete entity.spatial.flight;
      entity.spatial.fallVelocity = 0;
    }
    actor.planGeneration++;
    if (actor.controller === 'player') actor.incapacitated = true;
    else {
      actor.alive = false;
      if (entity.animal) {
        entity.animal.fleeSeconds = 0;
        entity.animal.fleeFrom = null;
      }
      if (body.harvestYield.length && !entity.remains)
        entity.remains = {
          sourceId: entity.id,
          harvested: false,
          yields: body.harvestYield.map((y) => ({ ...y })),
        };
    }
    interruptStatusEffects(world, entity, events, 'body-unavailable');
    emit(
      world,
      events,
      actor.incapacitated ? 'incapacitated' : 'death',
      actor.incapacitated
        ? `${entity.name} collapsed and can recover at camp.`
        : `${entity.name} died.`,
      entity,
      undefined,
      { significant: true, cause },
    );
  }
  if (world.innerWorlds?.[entity.id]) world.innerWorlds[entity.id]!.reconsiderationRequired = true;
}
export interface BodyEffect {
  targetId: string;
  kind: 'health' | 'injury' | 'healing' | 'wetness' | 'burning';
  amount: number;
}
/** Simultaneous effects aggregate before clamping. Caller supplies native authority, never prose. */
export function applyBodyEffects(
  input: WorldState,
  id: string,
  effects: BodyEffect[],
  expected: Record<string, number>,
): Transition {
  const digest = canonicalJson({ effects, expected });
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'effect-rejected', message),
  });
  const prior = input.commandReceipts[id];
  if (prior)
    return prior.digest === digest
      ? { world: input, events: [], outcome: prior.outcome }
      : reject('Effect identity reused.');
  if (
    !id ||
    !effects.length ||
    effects.length > 64 ||
    effects.some(
      (e) =>
        !['health', 'injury', 'healing', 'wetness', 'burning'].includes(e.kind) ||
        !Number.isFinite(e.amount) ||
        Math.abs(e.amount) > 100 ||
        (e.kind !== 'health' && e.amount < 0) ||
        !input.entities[e.targetId]?.actor?.alive ||
        !activelyParticipates(input.entities[e.targetId]) ||
        input.entities[e.targetId]?.actor?.body?.revision !== expected[e.targetId],
    )
  )
    return reject('Invalid, incompatible or stale body effect.');
  const world = draftWorld(input);
  const events: WorldEvent[] = [];
  for (const targetId of [...new Set(effects.map((e) => e.targetId))].sort()) {
    commitBodyEffects(
      world,
      world.entities[targetId]!,
      effects.filter((e) => e.targetId === targetId),
      id,
      events,
    );
  }
  const result = outcome(true, 'effects-applied', 'Native body effects committed.');
  world.commandReceipts[id] = { digest, outcome: result };
  return finish(world, events, result);
}

/** Internal native mutation used by admitted effects and physical mechanics. */
export function commitBodyEffects(
  world: WorldState,
  entity: Entity,
  effects: BodyEffect[],
  cause: string,
  events: WorldEvent[],
): void {
  if (!activelyParticipates(entity)) return;
  const actor = entity.actor!;
  const body = actor.body!;
  const totals = { health: 0, injury: 0, healing: 0, wetness: 0, burning: 0 };
  for (const effect of [...effects].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.amount - b.amount,
  ))
    totals[effect.kind] +=
      effect.amount * (effect.kind === 'health' ? 1 : body.susceptibility[effect.kind]);
  const before = actor.health;
  const previous = { ...body.conditions };
  body.conditions.injury = Math.max(
    0,
    Math.min(100, previous.injury + totals.injury - totals.healing),
  );
  body.conditions.wetness = Math.max(0, Math.min(100, previous.wetness + totals.wetness));
  body.conditions.burning = Math.max(
    0,
    Math.min(100, previous.burning + totals.burning - totals.wetness),
  );
  setBodyHealth(
    actor,
    actor.health + totals.health + totals.healing - totals.injury - totals.burning,
  );
  reconcileBody(world, entity, events, cause);
  if (actor.health < before) interruptStatusEffects(world, entity, events, 'injury');
  emit(world, events, 'body-effect', `${entity.name}'s body changed.`, entity, entity.id, {
    effectId: cause,
    healthDelta: actor.health - before,
    injuryDelta: body.conditions.injury - previous.injury,
    wetnessDelta: body.conditions.wetness - previous.wetness,
    burningDelta: body.conditions.burning - previous.burning,
  });
}
