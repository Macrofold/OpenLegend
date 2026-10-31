import { entityGet } from './entity-collection.js';
import { emit, outcome } from './events.js';
import { supportsManualWork } from './living.js';
import { person, presentVerb, subjectNarration } from './narration.js';
import { activelyParticipates } from './participation-state.js';
import { seesEntity } from './perception.js';
import type { ExpressionDefinition } from './expression-definitions.js';
import { canReachEntity, hasLineOfSight } from './spatial.js';
import { worldPosition } from './spatial-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import type { Entity, Outcome, WorldEvent, WorldState } from './types.js';

export function selectedExpressions(
  world: WorldState,
  actor?: Entity,
): readonly ExpressionDefinition[] {
  return actor && !supportsManualWork(actor) ? [] : (world.moduleManifest.expressions ?? []);
}

export function expressionProblem(
  world: WorldState,
  actorId: string,
  verb: string,
  targetId?: string,
): Outcome | null {
  const actor = entityGet(world.entities, actorId);
  if (
    !actor?.actor?.alive ||
    !activelyParticipates(actor) ||
    actor.actor.incapacitated ||
    capabilityBlocked(world, actor, 'actions')
  )
    return outcome(false, 'unavailable', 'This person cannot act right now.');
  if (!supportsManualWork(actor))
    return outcome(false, 'unsupported-body', 'This character cannot make that gesture.');
  const definition = selectedExpressions(world).find((d) => d.id === verb);
  if (!definition)
    return outcome(false, 'invalid-expression', 'That expression is not available in this world.');
  const target = targetId ? entityGet(world.entities, targetId) : undefined;
  if (
    (definition.target === 'required' &&
      (!target || target.id === actor.id || !activelyParticipates(target))) ||
    (definition.contact && !target?.actor?.alive) ||
    (targetId &&
      (!target ||
        !seesEntity(world, actor, target) ||
        // Contact reach checks the interaction anchors, not the feet below a low barrier.
        (!definition.contact &&
          !hasLineOfSight(world, worldPosition(actor), worldPosition(target))) ||
        (target.actor && !target.actor.alive)))
  )
    return outcome(false, 'invalid-expression', 'That target is no longer in view or available.');
  if (
    definition.reach !== undefined &&
    (!target || !canReachEntity(world, actor, target, definition.reach))
  )
    return outcome(false, 'out-of-reach', 'Move within reach before trying that gesture.');
  return null;
}

/** Both native commands and ordered NPC response operations use this mutation owner.
 * Recheck now: an offer or an earlier response component cannot promise contact.
 * docs/narration-and-conversations.md#4-expressive-and-mechanical-actions */
export function commitExpression(
  world: WorldState,
  events: WorldEvent[],
  actorId: string,
  verb: string,
  targetId?: string,
  responseId?: string,
): Outcome {
  const problem = expressionProblem(world, actorId, verb, targetId);
  if (problem) return problem;
  const actor = entityGet(world.entities, actorId)!;
  const target = targetId ? entityGet(world.entities, targetId) : undefined;
  const definition = selectedExpressions(world).find((d) => d.id === verb)!;
  emit(
    world,
    events,
    'expression',
    subjectNarration(actor, [
      presentVerb(actor, definition.verb),
      ...(definition.possessiveSuffix
        ? [' ', person(actor, 'possessive'), definition.possessiveSuffix]
        : []),
      ...(target
        ? [definition.targetJoiner, person(target, target.id === actorId ? 'reflexive' : 'object')]
        : []),
      '.',
    ]),
    actor,
    target?.id,
    {
      expressionId: definition.id,
      mechanical: !!definition.contact,
      ...(definition.contact
        ? { contactKind: definition.contact.kind, contactFelt: definition.contact.felt }
        : {}),
      ...(responseId ? { responseId } : {}),
      semanticTrigger: true,
      ...(target ? { targetReference: true } : {}),
    },
  );
  return definition.contact
    ? outcome(true, 'contacted', 'Brief contact occurred.')
    : outcome(true, 'expressed', 'Expression accepted without mechanical effects.');
}
