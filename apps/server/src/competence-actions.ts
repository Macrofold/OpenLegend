import {
  coachingFor,
  practiceStatus,
  practiceDefinition,
  toolPracticeDefinition,
  handlingAccuracy,
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
          description: `${definition.practice.practiceLabel} at ${targetName}.${item ? ` Tool: ${item.name}.` : ' Select a compatible tool and ammunition first.'} ${definition.practice.windupSeconds} game seconds of preparation after approach; one real projectile is consumed only on release. ${accuracy && accuracy.competence !== undefined ? `Known target chance: ${accuracy.accuracy * 100}%. ` : ''}${definition.practice.scope} No automatic next shot.`,
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
          label: `Agree to observe ${targetName}`,
          description: `Choose to observe ${targetName}'s next eligible release for ${definition.name.toLowerCase()} coaching. Speaking agreement alone does not start observation; choose this action if willing. This promises no future shot or feedback and does not transfer a recipe. I can decline or later withdraw.`,
          command: command('accept'),
        },
        {
          id: `coaching-decline:${episode.id}`,
          label: `Decline coaching ${targetName}`,
          description: `Decline ${targetName}'s request. They keep their independent practice route; nothing is taught or transferred.`,
          command: command('decline'),
        },
      );
    }
    if (episode.observed && !episode.actions[actorId])
      options.push({
        id: `coaching-feedback:${episode.id}:${actorId}`,
        label: definition.practice!.coachingLabel,
        description: `Choose ${definition.practice!.feedbackSeconds} game seconds of guided feedback with ${targetName} about the shot actually observed in this episode. Speaking advice alone does not complete feedback; both must choose this activity and remain able to communicate. ${definition.practice!.guidance} A completed episode helps once; it grants no recipe or personality trait.`,
        command: command('feedback'),
      });
    options.push({
      id: `coaching-withdraw:${episode.id}:${actorId}`,
      label: 'Withdraw from this coaching episode',
      description:
        'End this unfinished episode now. Actual released shots remain; incomplete feedback earns no coaching benefit.',
      command: command('withdraw'),
    });
  } else if (!episode) {
    for (const progress of practiceStatus(world, actor))
      options.push({
        id: `coaching-request:${progress.id}:${target.id}`,
        label: `Ask ${targetName} for ${progress.name.toLowerCase()} coaching`,
        description: `Ask ${targetName} to observe one actual release and, if both later choose, give guided feedback. They may decline or lack the applicable competence. ${progress.scope} Completed help does not stack or disclose a private recipe.`,
        command: {
          type: 'coaching',
          coachingOperation: 'request',
          targetId: target.id,
          attributeId: progress.id,
        },
      });
  }
  return options;
}
export function competenceContext(world: WorldState, actor: Entity): string {
  return practiceStatus(world, actor)
    .map(
      (p) =>
        `${p.name}: ${p.value === 1 ? 'practiced' : 'beginner'}, ${p.releases}/${p.independentRequired} real releases retained, completed coaching ${p.coached ? 'yes' : 'no'}. ${p.scope} ${p.effect}`,
    )
    .join('\n');
}
export function waitingForFeedback(world: WorldState, actor: Entity): boolean {
  return !!actor.actor?.action && feedbackWaiting(world, actor, actor.actor.action);
}
