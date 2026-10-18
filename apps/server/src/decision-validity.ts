import {
  entityGet,
  activeAppraisals,
  appraisalDefinition,
  attributeDefinition,
  bodyEligibilityRevision,
  projectAttributes,
  requiredOutcomeMemoryIds,
  scopedAppraisals,
  type AppraisalScope,
  type WorldState,
} from '@open-legend/domain';
import { digest } from './content-digest.js';

/** Additive personally experienced blows remain evidence for the next opportunity,
 * not an automatic veto of a still-legal choice after the one funded refresh.
 * Physical capability, exact work and selected subjects are checked again at admission. */
export function preparedResponseValidity(
  world: WorldState,
  actorId: string,
  scopes: readonly AppraisalScope[],
): string {
  const entity = entityGet(world.entities, actorId),
    actor = entity?.actor;
  return digest({
    world: world.id,
    policy: world.cognitionPolicy,
    modules: world.moduleManifest.revision,
    status: world.statusEffectPolicy.revision,
    identity: [entity?.name, actor?.species, actor?.traits],
    life: actor?.physicalLife,
    controller: actor?.controller,
    alive: actor?.alive,
    incapacitated: actor?.incapacitated,
    capabilities: actor?.capabilities,
    goals: actor?.agency.goals,
    mind: world.innerWorlds?.[actorId]?.revision ?? world.minds?.[actorId]?.revision,
    forgotten: world.experience?.forgotten[actorId],
    corrections: world.experience?.corrections?.[actorId],
    feelings: scopedAppraisals(world, actorId, scopes).map((feeling) => {
      const definition = appraisalDefinition(world, feeling.definitionPin);
      return {
        id: feeling.id,
        revision: feeling.revision,
        value:
          definition?.lifetime.kind === 'decays' && feeling.value.kind === 'scaled'
            ? {
                kind: 'band',
                band: definition.lifetime.bands.findIndex(
                  (boundary) => feeling.value.kind === 'scaled' && feeling.value.value >= boundary,
                ),
              }
            : feeling.value,
      };
    }),
  });
}

/** Task-local semantic facts: no history bodies or whole-world revision in this fingerprint. */
export function decisionValidity(world: WorldState, actorId: string): string {
  const entity = entityGet(world.entities, actorId);
  const actor = entity?.actor;
  if (!actor) return 'unavailable';
  const flowing = new Set(
    world.statusEffectPolicy.definitions.flatMap((definition) =>
      definition.whileActive.flatMap((operation) =>
        'changeRate' in operation && operation.changeRate.target === '$subject'
          ? [operation.changeRate.attribute]
          : [],
      ),
    ),
  );
  const attributes = projectAttributes(world, entity, 'owner').map((attribute) => {
    const definition = attributeDefinition(world, attribute.id);
    if (
      (definition?.reservoir || flowing.has(attribute.id)) &&
      (definition?.concern || definition?.condition)
    ) {
      const { value: _value, revision: _revision, ...stable } = attribute;
      return stable;
    }
    return attribute;
  });
  const feelings = activeAppraisals(world, actorId).map((feeling) => {
    const definition = appraisalDefinition(world, feeling.definitionPin);
    if (definition?.lifetime.kind === 'decays' && feeling.value.kind === 'scaled') {
      const value = feeling.value.value;
      return {
        ...feeling,
        value: {
          kind: 'band',
          band: definition.lifetime.bands.findIndex((boundary) => value >= boundary),
        },
      };
    }
    return feeling;
  });
  const conversationId = world.conversations?.active[actorId];
  const conversation = conversationId ? world.conversations?.records[conversationId] : undefined;
  const awareness = world.experience?.awareness[actorId] ?? [];
  let latestSpeech: string | undefined;
  for (let index = awareness.length - 1; index >= 0; index--) {
    const evidence = awareness[index]!;
    if (evidence.triggerKind === 'addressed_speech' && evidence.intelligible) {
      latestSpeech = evidence.eventId;
      break;
    }
  }
  return digest({
    // Installed rules and authored identity shape the meaning of the prepared question.
    // Their revisions change independently of the plan or selected memory sources.
    installed: {
      modules: world.moduleManifest.revision,
      cognition: world.cognitionPolicy.revision,
      status: world.statusEffectPolicy.revision,
    },
    identity: { name: entity.name, species: actor.species, traits: actor.traits },
    actorId,
    life: actor.physicalLife,
    controller: actor.controller,
    alive: actor.alive,
    incapacitated: actor.incapacitated,
    capabilities: actor.capabilities,
    body: bodyEligibilityRevision(world, entity),
    attributes,
    feelings,
    planGeneration: actor.planGeneration,
    agency: actor.agency,
    action: actor.action
      ? {
          id: actor.action.id,
          type: actor.action.type,
          stage: actor.action.stage,
          targetId: actor.action.targetId,
        }
      : null,
    mind: world.innerWorlds?.[actorId]?.revision ?? world.minds?.[actorId]?.revision,
    forgotten: world.experience?.forgotten[actorId],
    corrections: world.experience?.corrections?.[actorId],
    outcomes: requiredOutcomeMemoryIds(world, actorId),
    conversation: conversation
      ? {
          id: conversation.id,
          generation: conversation.generation,
          endedAt: conversation.endedAt,
          latestSpeech,
        }
      : null,
  });
}
