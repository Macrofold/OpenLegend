import { knowledgePolicyInstructions } from '@open-legend/domain';
import { generalKnowledgeContext, selectedKnowledgeReferences } from './knowledge-context.js';
import {
  if (!observed) throw new Error('Actor unavailable.');
  const awarenessSequence = Math.max(
    0,
    ...(world.experience?.awareness[actorId] ?? []).map((entry) => entry.sequence),
  );
  const conversation =
    includeCurrentConversation ||
      ...candidate,
      id: `p${index}`,
    }));
  const intentActions = observed.actor.actor!.agency.attempts.map((attempt, index) => ({
    id: `w${index}`,
    description: `Withdraw my pending intent: ${attempt.description}`,
    command: { type: 'withdraw-attempt' as const, id: jobId, actorId, attemptId: attempt.id },
  }));
  const candidates = candidateSet(
    world,
    actorId,
      ? knowledgePolicyInstructions(world.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId) ?? null,
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    planOffers: [],
    references: responseReferences(
      ? knowledgePolicyInstructions(currentWorld.knowledgePolicy)
      : 'Knowledge is unavailable.',
    triggerFacts: responseTriggerContext(service, actorId, triggerEvidenceId) ?? null,
    intentActions: intentActions.map(({ id, description }) => ({ id, description })),
    identity: `I am ${entityLabel(currentWorld, currentObserved.actor, actorId)}. Species: ${actor.species ?? 'unknown'}.${actor.traits?.length ? ` My traits: ${actor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    feelings: activeAppraisals(currentWorld, actorId)
      .flatMap((c) => c.sourceIds ?? [c.id]),
    entityIds: Object.values(entityReferences),
    entityEpisodes: Object.fromEntries(
      Object.values(entityReferences).flatMap((id) => {
        const episode = currentWorld.perceptionEpisodes?.[actorId]?.[id];
        return episode ? [[id, episode]] : [];
      }),
  const candidates = fitActionCandidates(prepared.context, prepared.actionCandidates);
  const actions = {
    ...Object.fromEntries(
      // Optional relevance failure must preserve explicitly offered intent withdrawal.
      // docs/architecture.md#actor-agency-foundation
      Object.entries(prepared.binding.actions).filter(
        ([id]) => id.startsWith('p') || id.startsWith('w'),
      ),
    ),
    ...Object.fromEntries(
