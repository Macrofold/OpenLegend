import {
  coachingFor,
  practiceStatus,
  practiceDefinition,
  toolPracticeDefinition,
  handlingAccuracy,
  practiceText,
  describePractice,
  feedbackWaiting,
  ammoFor,
  observerName,
  type Entity,
  type ItemInstance,
  type WorldState,
} from '@open-legend/domain';
import type { CommandInput } from '@open-legend/protocol';
import { namePhrase } from '@open-legend/language';

export interface CompetenceOption {
  id: string;
  label: string;
  description: string;
  command: CommandInput;
}
/** One permitted choice source for NPCs, contextual panels and the complete catalogue. */
export function competenceOptions(
  world: WorldState,
  actorId: string,
  target: Entity,
  inventory: readonly ItemInstance[],
): CompetenceOption[] {
  const actor = world.entities[actorId];
  if (!actor?.actor) return [];
  const targetName = namePhrase(observerName(world, actorId, target.id), 'definite');
  const options: CompetenceOption[] = [];
  if (target.practiceTarget) {
    const definition = practiceDefinition(world, target.practiceTarget.attributeId);
    if (definition?.practice) {
      const tools = inventory.filter(
        (item) =>
          toolPracticeDefinition(world, world.itemDefinitions[item.definitionId]!)?.id ===
          definition.id,
      );
      for (const tool of tools.length ? tools : [undefined]) {
        const item = tool && world.itemDefinitions[tool.definitionId],
          accuracy = item?.launcher && handlingAccuracy(world, actor, item);
        const ammunition = item?.launcher && ammoFor(world, actorId, item.launcher.ammunitionKind);
        options.push({
          id: `practice:${target.id}:${tool?.id ?? 'missing'}`,
          label: definition.practice.practiceLabel,
          description: describePractice(
            definition.practice,
            targetName,
            item?.name,
            accuracy && accuracy.competence !== undefined ? accuracy.accuracy : undefined,
          ),
          command: {
            type: 'practice-shot',
            targetId: target.id,
            ...(tool ? { itemId: tool.id } : {}),
            ...(ammunition ? { ammunitionId: ammunition.id } : {}),
          },
        });
      }
    }
  }
  if (!target.actor || actorId === target.id) return options;
  const episode = coachingFor(world, actorId);
  if (episode && [episode.learnerId, episode.coachId].includes(target.id)) {
    const definition = practiceDefinition(world, episode.pin.id)!;
    const profile = definition.practice!;
    const text = (key: Parameters<typeof practiceText>[1]) =>
      practiceText(profile, key, {
        target: targetName,
        skill: definition.name.toLowerCase(),
        feedbackSeconds: profile.feedbackSeconds,
        guidance: profile.guidance,
      });
    const command = (operation: NonNullable<CommandInput['coachingOperation']>): CommandInput => ({
      type: 'coaching',
      targetId: target.id,
      attributeId: definition.id,
      coachingOperation: operation,
      episodeId: episode.id,
    });
    if (episode.phase === 'requested' && actorId === episode.coachId) {
      options.push(
        {
          id: `coaching-accept:${episode.id}`,
          label: text('acceptLabel'),
          description: text('acceptDescription'),
          command: command('accept'),
        },
        {
          id: `coaching-decline:${episode.id}`,
          label: text('declineLabel'),
          description: text('declineDescription'),
          command: command('decline'),
        },
      );
    }
    if (episode.observed && !episode.actions[actorId])
      options.push({
        id: `coaching-feedback:${episode.id}:${actorId}`,
        label: definition.practice!.coachingLabel,
        description: text('feedbackDescription'),
        command: command('feedback'),
      });
    options.push({
      id: `coaching-withdraw:${episode.id}:${actorId}`,
      label: profile.presentation.withdrawLabel,
      description: profile.presentation.withdrawDescription,
      command: command('withdraw'),
    });
  } else if (!episode) {
    for (const progress of practiceStatus(world, actor)) {
      const profile = practiceDefinition(world, progress.id)!.practice!;
      options.push({
        id: `coaching-request:${progress.id}:${target.id}`,
        label: practiceText(profile, 'requestLabel', {
          target: targetName,
          skill: progress.name.toLowerCase(),
        }),
        description: practiceText(profile, 'requestDescription', {
          target: targetName,
          scope: profile.scope,
        }),
        command: {
          type: 'coaching',
          coachingOperation: 'request',
          targetId: target.id,
          attributeId: progress.id,
        },
      });
    }
  }
  return options;
}
export function competenceContext(world: WorldState, actor: Entity): string {
  return practiceStatus(world, actor)
    .map((p) => `${p.name}: ${p.rankLabel}. ${p.progressText}. ${p.scope} ${p.effect}`)
    .join('\n');
}
export function waitingForFeedback(world: WorldState, actor: Entity): boolean {
  return !!actor.actor?.action && feedbackWaiting(world, actor, actor.actor.action);
}
