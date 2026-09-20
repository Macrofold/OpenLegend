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
  return digest({
    mind: world.innerWorlds?.[actorId]?.revision,
    policy: (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision,
    goal: observed?.actor.actor?.goal,
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
  const actor = observed.actor.actor!;
  const actions = npcCandidates(service, actorId).slice(0, 16);
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
  const context: Record<string, unknown> = {
    stimulus,
    aboutMe:
      world.innerWorlds?.[actorId]?.text ??
      mindFor(world, actorId)
        .documents.map((d) => `${d.title}\n${d.text}`)
        .join('\n'),
    now: gameTime(world.simTime),
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
  if (world.innerWorlds?.[actorId]?.reconsiderationRequired)
    context['reconsideration'] =
      'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.';
  if (
    !observed.inventory.some((i) =>
      world.itemDefinitions[i.definitionId]?.properties.includes('food'),
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
    entityIds: [actorId, ...observed.visibleEntities.map((e) => e.id)],
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
    dependencies,
    diagnostics: {
      instructionsVersion: COGNITION_VERSION,
      snapshot: world.sequence,
      sourceTime: world.simTime,
      acceptedRevision: world.innerWorlds?.[actorId]?.revision,
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
