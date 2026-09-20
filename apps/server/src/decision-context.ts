import { compileInterests } from './interests.js';
import {
  observeActor,
  type CognitionBinding,
  MIND_POLICY,
  mindFor,
  DEFAULT_COGNITION_POLICY,
} from '@open-legend/domain';
import type { JudgeRequest, JudgeValue } from '@open-legend/ai';
import { npcCandidates } from './context.js';
import { domainCommand } from './cognition.js';
import { candidateSet, gameTime, type RecallService } from './recall.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';
import { COGNITION_VERSION, RESPONSE_INSTRUCTIONS } from './cognition-contracts.js';
import { readableDecisionContext } from './response-context.js';
import { attentionQuestions } from './jev-questions.js';
function currentConversationEvidenceIds(
  world: WorldService['world'],
  actorId: string,
  requiredIds: string[],
): string[] {
  const trigger = [...world.events]
    .reverse()
    .find((event) => requiredIds.includes(event.id) && event.type === 'speech');
  const participants = new Set(
    [actorId, trigger?.actorId, trigger?.targetId].filter((id): id is string => !!id),
  );
  const aware = new Set(
    (world.experience?.awareness[actorId] ?? []).map((experience) => experience.eventId),
  );
  if (!trigger) return [];
  const ids: string[] = [];
  let previousAt = trigger.at;
  const triggerIndex = world.events.findIndex((event) => event.id === trigger.id);
  for (let index = triggerIndex; index >= 0; index--) {
    const event = world.events[index]!;
    // Until durable conversation IDs exist, a two-hour gap is an explicit heuristic
    // boundary. It tolerates provider latency at accelerated simulation speeds.
    if (previousAt - event.at > 7200) break;
    if (
      aware.has(event.id) &&
      event.actorId &&
      event.targetId &&
      event.actorId !== event.targetId &&
      participants.has(event.actorId) &&
      participants.has(event.targetId)
    ) {
      ids.push(event.id);
      previousAt = event.at;
    } else if (
      event.type === 'speech' &&
      ((event.actorId && participants.has(event.actorId)) ||
        (event.targetId && participants.has(event.targetId)))
    ) {
      // A participant addressing somebody else starts another exchange.
      break;
    }
  }
  return ids.reverse();
}
export function decisionDependencies(service: WorldService, actorId: string) {
  const world = service.world;
  const observed = service.observe(actorId);
  const actor = observed?.actor.actor;
  return digest({
    mind: world.innerWorlds?.[actorId]?.revision,
    policy: (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision,
    goal: actor?.goal,
    planGeneration: actor?.planGeneration,
    body: actor
      ? {
          alive: actor.alive,
          incapacitated: actor.incapacitated,
          veryHungry: actor.fullness < 30,
          exhausted: actor.energy < 25,
          seriouslyInjured: actor.health < 40,
          asleep: !!actor.rest?.asleep,
          action: actor.action ? { id: actor.action.id, type: actor.action.type } : null,
        }
      : null,
    visible: observed?.visibleEntities.map((e) => ({
      id: e.id,
      alive: e.actor?.alive ?? e.animal?.alive,
      resource: e.resource?.quantity,
      heat: e.heat?.lit,
    })),
    knowledge: observed?.knownRecipes.map((r) => r.id),
    inventory: observed?.inventory,
    obligations: (world.memories[actorId] ?? []).filter((m) => m.kind === 'commitment'),
    forgotten: world.experience?.forgotten[actorId],
  });
}
export async function prepareDecision(
  service: WorldService,
  recall: RecallService,
  actorId: string,
  jobId: string,
  stimulus: string,
  requiredIds: string[],
  judge: (r: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
  signal: AbortSignal,
  budgetCeiling = service.config.budgetUsd,
  includeCurrentConversation = false,
) {
  const world = service.world;
  const observed = observeActor(world, actorId);
  if (!observed) throw new Error('Actor unavailable.');
  const dependencies = decisionDependencies(service, actorId);
  const automaticIds =
    includeCurrentConversation ||
    requiredIds.some((id) =>
      world.events.some((event) => event.id === id && event.type === 'speech'),
    )
      ? currentConversationEvidenceIds(world, actorId, requiredIds)
      : [];
  const candidates = candidateSet(world, actorId, observed, requiredIds, automaticIds);
  const snapshotActor = observed.actor.actor!;
  const automaticIdSet = new Set(automaticIds);
  const triggerIdSet = new Set(requiredIds);
  const requiredContext: Record<string, unknown> = {
    stimulus,
    identity: `I am ${observed.actor.name} (${actorId}).${snapshotActor.traits?.length ? ` My traits: ${snapshotActor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    aboutMe:
      world.innerWorlds?.[actorId]?.text ??
      mindFor(world, actorId)
        .documents.map((document) => `${document.title}\n${document.text}`)
        .join('\n'),
    now: gameTime(world.simTime),
    body: `${snapshotActor.fullness < 30 ? 'I am very hungry. ' : ''}${snapshotActor.energy < 25 ? 'I am exhausted. ' : ''}${snapshotActor.health < 40 ? 'I am seriously injured. ' : ''}${snapshotActor.rest?.asleep ? 'I am asleep.' : `I am ${snapshotActor.action?.type ?? 'idle'}.`}`,
    goal: snapshotActor.goal,
    conversation: candidates
      .filter(
        (candidate) =>
          candidate.kind === 'memory' &&
          automaticIdSet.has(candidate.id) &&
          !triggerIdSet.has(candidate.id),
      )
      .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
      .map((candidate) => candidate.text),
    surroundings: observed.visibleEntities.map(
      (entity) =>
        `${entity.name} (${entity.id}): ${entity.actor ? `person, ${entity.actor.action?.type ?? 'idle'}` : entity.kind}`,
    ),
    possessions: observed.inventory.map(
      (item) =>
        `${item.quantity} ${world.itemDefinitions[item.definitionId]?.name ?? item.definitionId} (${item.id})`,
    ),
  };
  if (
    !observed.inventory.some((item) =>
      world.itemDefinitions[item.definitionId]?.properties.includes('food'),
    )
  )
    requiredContext['food'] = 'I have no food.';
  if (world.innerWorlds?.[actorId]?.reconsiderationRequired)
    requiredContext['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  const requiredBytes =
    Buffer.byteLength(readableDecisionContext(requiredContext, [], false)) +
    Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (requiredBytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  const selection = await recall.select(
    world,
    actorId,
    stimulus,
    jobId,
    candidates,
    judge,
    signal,
    budgetCeiling,
    100000 - requiredBytes,
  );
  if (decisionDependencies(service, actorId) === dependencies)
    await service.store.putIntegration(
      `interests:${world.id}:${actorId}`,
      compileInterests(world, actorId, selection.selected),
    );
  // Attention can outlive a simulation transition. Refresh current state after
  // it returns and bind later admission to this exact dependency snapshot.
  const currentWorld = service.world;
  const currentObserved = observeActor(currentWorld, actorId);
  if (!currentObserved) throw new Error('Actor unavailable.');
  const currentDependencies = decisionDependencies(service, actorId);
  const actor = currentObserved.actor.actor!;
  const terms = new Set(
    `${stimulus} ${actor.goal} ${selection.selected.map((entry) => entry.text).join(' ')}`
      .toLowerCase()
      .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  );
  const rankedActions = npcCandidates(service, actorId)
    .map((candidate, index) => ({
      candidate,
      index,
      score: [...terms].reduce(
        (sum, term) => sum + Number(candidate.description.toLowerCase().includes(term)),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 16)
    .map(({ candidate }) => candidate);
  const context: Record<string, unknown> = {
    stimulus,
    identity: `I am ${currentObserved.actor.name} (${actorId}).${actor.traits?.length ? ` My traits: ${actor.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    aboutMe:
      currentWorld.innerWorlds?.[actorId]?.text ??
      mindFor(currentWorld, actorId)
        .documents.map((d) => `${d.title}\n${d.text}`)
        .join('\n'),
    now: gameTime(currentWorld.simTime),
    body: `${actor.fullness < 30 ? 'I am very hungry. ' : ''}${actor.energy < 25 ? 'I am exhausted. ' : ''}${actor.health < 40 ? 'I am seriously injured. ' : ''}${actor.rest?.asleep ? 'I am asleep.' : `I am ${actor.action?.type ?? 'idle'}.`}`,
    goal: actor.goal,
  };
  const conversationIds = new Set(automaticIds);
  context['conversation'] = selection.selected
    .filter((entry) => conversationIds.has(entry.id) && !triggerIdSet.has(entry.id))
    .map((entry) => entry.text);
  for (const [name, kind] of [
    ['surroundings', 'entity'],
    ['possessions', 'possession'],
    ['knowledge', 'knowledge'],
    ['recall', 'memory'],
  ]) {
    const texts = selection.selected
      .filter((c) => c.kind === kind && (kind !== 'memory' || !conversationIds.has(c.id)))
      .map((c) => `${c.text} [${c.kind === 'entity' ? c.entityIds.join(', ') : c.id}]`);
    if (texts.length) context[name!] = texts;
  }
  if (currentWorld.innerWorlds?.[actorId]?.reconsiderationRequired)
    context['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  if (
    !currentObserved.inventory.some((i) =>
      currentWorld.itemDefinitions[i.definitionId]?.properties.includes('food'),
    )
  )
    context['food'] = 'I have no food.';
  const binding: CognitionBinding = {
    actorId,
    decisionId: jobId,
    policy: MIND_POLICY,
    tier: 'fast',
    purpose: 'thought',
    watermark: Math.max(0, ...selection.selected.map((c) => c.at)),
    evidenceIds: selection.selected.filter((c) => c.kind === 'memory').map((c) => c.id),
    entityIds: [actorId, ...currentObserved.visibleEntities.map((e) => e.id)],
    expectedPlan: actor.planGeneration,
    restEpisode: actor.action?.type === 'rest' ? actor.action.id : null,
    actions: {},
  };
  const offered: { id: string; description: string }[] = [];
  // Every visible reference remains identifiable even if optional recall omitted it.
  context['surroundings'] = currentObserved.visibleEntities.map(
    (entity) =>
      `Entity ID "${entity.id}" — ${entity.name}: ${entity.actor ? `person, ${entity.actor.action?.type ?? 'idle'}` : entity.kind}. Use exactly "${entity.id}" in addressee, target, and about fields.`,
  );
  context['possessions'] = currentObserved.inventory.map(
    (item) =>
      `${item.quantity} ${currentWorld.itemDefinitions[item.definitionId]?.name ?? item.definitionId} (${item.id})`,
  );
  const prompt = readableDecisionContext(context, offered, false);
  const bytes = Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (bytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  return {
    context,
    prompt,
    binding,
    offered,
    actionCandidates: rankedActions,
    dependencies: currentDependencies,
    diagnostics: {
      instructionsVersion: COGNITION_VERSION,
      snapshot: currentWorld.sequence,
      sourceTime: currentWorld.simTime,
      acceptedRevision: currentWorld.innerWorlds?.[actorId]?.revision,
      inputBytes: bytes,
      estimatedInputTokens: Math.ceil(bytes / 3),
      sections: Object.fromEntries(
        Object.entries(context).map(([key, value]) => [
          key,
          Buffer.byteLength(JSON.stringify(value)),
        ]),
      ),
      selection: selection.diagnostics,
    },
  };
}

export async function selectDecisionActions(
  prepared: Awaited<ReturnType<typeof prepareDecision>>,
  judge: (r: Omit<JudgeRequest, 'requestId' | 'signal'>) => Promise<JudgeValue>,
  signal: AbortSignal,
) {
  const candidates = prepared.actionCandidates;
  let selected = candidates;
  let status = candidates.length ? 'fallback: all bounded candidates' : 'no candidates';
  if (candidates.length) {
    try {
      const judged = await judge({
        state: {
          stimulus: prepared.context['stimulus'],
          goal: prepared.context['goal'],
          candidates: Object.fromEntries(
            candidates.map((candidate, index) => [`action${index}`, candidate.description]),
          ),
        },
        questions: attentionQuestions(candidates.map((_, index) => `action${index}`)),
      });
      selected = candidates.filter((candidate, index) => {
        const answer = judged.answers[`action${index}`];
        return (
          candidate.command === null ||
          (answer &&
            'choice' in answer &&
            answer.choice === 'yes' &&
            (answer.probabilities['yes'] ?? 0) >= 0.5)
        );
      });
      status = 'completed';
    } catch (error) {
      signal.throwIfAborted();
      status = error instanceof Error ? `fallback: ${error.message}` : 'fallback: unavailable';
    }
  }
  const actions = Object.fromEntries(
    selected.map((candidate, index) => [
      `a${index}`,
      candidate.command
        ? domainCommand(candidate.command, prepared.binding.actorId, prepared.binding.decisionId)
        : null,
    ]),
  );
  const offered = selected.map((candidate, index) => ({
    id: `a${index}`,
    description: candidate.description,
  }));
  const binding = { ...prepared.binding, actions };
  const prompt = readableDecisionContext(prepared.context, offered, true);
  const inputBytes = Buffer.byteLength(prompt) + Buffer.byteLength(RESPONSE_INSTRUCTIONS);
  if (inputBytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  return {
    ...prepared,
    binding,
    offered,
    prompt,
    diagnostics: {
      ...prepared.diagnostics,
      inputBytes,
      estimatedInputTokens: Math.ceil(inputBytes / 3),
      actionSelection: { status, candidates: candidates.length, offered: offered.length },
    },
  };
}
