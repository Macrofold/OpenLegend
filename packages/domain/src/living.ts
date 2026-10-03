import { activeActivity, connectActivityState } from './action-experience.js';
import { seesEntity } from './perception.js';
import { observerDescription } from './worlds/base/knowledge.js';
import { reconcileConditions } from './conditions.js';
import { recordSemanticChange } from './dependencies.js';
import { worldSupport } from './spatial-state.js';
import { activelyParticipates } from './participation-state.js';
import { livingBody, nativeActor } from './worlds/base/bodies.js';
import { bodyPolicy, bodyNarration } from './body-policy.js';
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
    const lifecycle = bodyPolicy(world)?.zeroHealth;
    if (!lifecycle) throw new Error('Living body has no installed lifecycle policy.');
    if (lifecycle[actor.controller] === 'incapacitate') actor.incapacitated = true;
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
    if (!actor.alive) {
      // Death ends live sensory continuity, not retained knowledge or historical evidence.
      // docs/knowledge.md#subject-binding
      if (actor.contacts && Object.keys(actor.contacts).length) actor.contacts = {};
      if (world.visiblePeople?.[entity.id]?.length) world.visiblePeople[entity.id] = [];
      if (world.visibleObjects?.[entity.id]?.length) world.visibleObjects[entity.id] = [];
      if (Object.keys(world.perceptionEpisodes?.[entity.id] ?? {}).length)
        world.perceptionEpisodes![entity.id] = {};
    }
    interruptStatusEffects(world, entity, events, 'body-unavailable');
    emit(
      world,
      events,
      actor.incapacitated ? 'incapacitated' : 'death',
      actor.incapacitated
        ? bodyNarration(lifecycle.incapacitateNarration, entity)
        : bodyNarration(lifecycle.deathNarration, entity),
      entity,
      undefined,
      { significant: true, cause },
    );
  }
  reconcileConditions(world, entity, events);
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
  const experience = activeActivity(world, cause);
  const observer = experience && world.entities[experience.actorId];
  connectActivityState(
    world,
    entity.id,
    cause,
    before,
    actor.health,
    !!observer && (observer.id === entity.id || seesEntity(world, observer, entity)),
    observer ? observerDescription(world, observer.id, entity.id) : undefined,
  );
  if (actor.health < before) interruptStatusEffects(world, entity, events, 'injury');
  emit(world, events, 'body-effect', `${entity.name}'s body changed.`, entity, entity.id, {
    effectId: cause,
    healthDelta: actor.health - before,
    injuryDelta: body.conditions.injury - previous.injury,
    wetnessDelta: body.conditions.wetness - previous.wetness,
    burningDelta: body.conditions.burning - previous.burning,
  });
}
