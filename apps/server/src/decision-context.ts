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
import { COGNITION_VERSION, DECISION_INSTRUCTIONS } from './cognition-contracts.js';
export function decisionDependencies(service: WorldService, actorId: string) {
  const world = service.world;
  const observed = service.observe(actorId);
  const actor = observed?.actor.actor;
  return digest({
    mind: world.innerWorlds?.[actorId]?.revision,
    policy: (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision,
    goal: actor?.goal,
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
) {
  const world = service.world;
  const observed = observeActor(world, actorId);
  if (!observed) throw new Error('Actor unavailable.');
  const dependencies = decisionDependencies(service, actorId);
  const candidates = candidateSet(world, actorId, observed, requiredIds);
  const selection = await recall.select(
    world,
    actorId,
    stimulus,
    jobId,
    candidates,
    judge,
    signal,
    budgetCeiling,
  );
  if (decisionDependencies(service, actorId) === dependencies)
    service.store.putIntegration(
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
  const actions = npcCandidates(service, actorId).slice(0, 16);
  const context: Record<string, unknown> = {
    stimulus,
    aboutMe:
      currentWorld.innerWorlds?.[actorId]?.text ??
      mindFor(currentWorld, actorId)
        .documents.map((d) => `${d.title}\n${d.text}`)
        .join('\n'),
    now: gameTime(currentWorld.simTime),
    body: `${actor.fullness < 30 ? 'I am very hungry. ' : ''}${actor.energy < 25 ? 'I am exhausted. ' : ''}${actor.health < 40 ? 'I am seriously injured. ' : ''}${actor.rest?.asleep ? 'I am asleep.' : `I am ${actor.action?.type ?? 'idle'}.`}`,
    goal: actor.goal,
  };
  for (const [name, kind] of [
    ['surroundings', 'entity'],
    ['possessions', 'possession'],
    ['knowledge', 'knowledge'],
    ['recall', 'memory'],
  ]) {
    const texts = selection.selected.filter((c) => c.kind === kind).map((c) => c.text);
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
    actions: Object.fromEntries(
      actions.map((c, i) => [`a${i}`, c.command ? domainCommand(c.command, actorId, jobId) : null]),
    ),
  };
  const offered = actions.map((c, i) => ({ id: `a${i}`, description: c.description }));
  const bytes =
    Buffer.byteLength(JSON.stringify(context)) + Buffer.byteLength(DECISION_INSTRUCTIONS);
  if (bytes > 100000)
    throw new Error('Complete accepted inner world and required context exceed the input budget.');
  return {
    context,
    binding,
    offered,
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
