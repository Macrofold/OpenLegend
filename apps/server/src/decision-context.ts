import { NAVIGATION_INSTRUCTIONS } from './navigation-contracts.js';
import { knowledgePolicyInstructions } from '@open-legend/domain';
import { generalKnowledgeContext, selectedKnowledgeReferences } from './knowledge-context.js';
import {
  if (!observed) throw new Error('Actor unavailable.');
  const awarenessSequence = Math.max(
    0,
    (world.experience?.awareness[actorId] ?? []).reduce(
      (latest, entry) => Math.max(latest, entry.sequence),
      0,
    ),
  );
  const conversation =
    includeCurrentConversation ||
      ...candidate,
      id: `p${index}`,
    }));
  const intentActions = observed.actor.actor!.agency.attempts.flatMap((attempt, index) => [
    {
      id: `w${index}`,
      description: `Decline/withdraw pending intent: ${attempt.description}`,
      command: { type: 'withdraw-attempt' as const, id: jobId, actorId, attemptId: attempt.id },
    },
    ...(attempt.alternative
      ? [
          {
            id: `c${index}`,
            description: `Accept this revised action? ${attempt.alternative.fulfillment.executableDescription}. Not fulfilled: ${attempt.alternative.fulfillment.omitted.map((o) => o.requirement).join('; ')}. ${attempt.alternative.fulfillment.reason}`,
            command: {
              type: 'confirm-attempt' as const,
              id: jobId,
              actorId,
              attemptId: attempt.id,
            },
          },
        ]
      : []),
  ]);
  const candidates = candidateSet(
    world,
    actorId,
      ? knowledgePolicyInstructions(world.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId) ?? null,
    navigation: NAVIGATION_INSTRUCTIONS,
    currentPosition: observed.actor.position,
    currentSupport: observed.actor.spatial.supportSurfaceId,
    publicSurfaces:
      world.map.spatial.disclosure === 'public'
        ? world.map.spatial.surfaces.map(({ id, name }) => ({ id, name }))
        : [],
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    planOffers: [],
    references: responseReferences(
      ? knowledgePolicyInstructions(currentWorld.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId) ?? null,
    navigation: NAVIGATION_INSTRUCTIONS,
    currentPosition: currentObserved.actor.position,
    currentSupport: currentObserved.actor.spatial.supportSurfaceId,
    publicSurfaces:
      currentWorld.map.spatial.disclosure === 'public'
        ? currentWorld.map.spatial.surfaces.map(({ id, name }) => ({ id, name }))
        : [],
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    identity: `I am ${entityLabel(currentWorld, currentObserved.actor, actorId)}. Species: ${actor.species ?? 'unknown'}.${actor.traits?.length ? ` My traits: ${actor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    feelings: activeAppraisals(currentWorld, actorId)
      .flatMap((c) => c.sourceIds ?? [c.id]),
    entityIds: Object.values(entityReferences),
    entityEpisodes: Object.fromEntries(
      [
        ...new Set([
          ...Object.values(entityReferences),
          ...currentObserved.visibleEntities.map((entity) => entity.id),
        ]),
      ].flatMap((id) => {
        const episode = currentWorld.perceptionEpisodes?.[actorId]?.[id];
        return episode ? [[id, episode]] : [];
      }),
  const candidates = fitActionCandidates(prepared.context, prepared.actionCandidates);
  const actions = {
    ...Object.fromEntries(
      // Optional relevance failure must preserve explicit intent acceptance and withdrawal.
      // docs/architecture.md#actor-agency-foundation
      Object.entries(prepared.binding.actions).filter(
        ([id]) => id.startsWith('p') || id.startsWith('w') || id.startsWith('c'),
      ),
    ),
    ...Object.fromEntries(
