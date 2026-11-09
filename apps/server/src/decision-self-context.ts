import {
  acceptedMindDocumentText,
  activeGoalTexts,
  type ActorGoal,
  type CharacterTrait,
} from '@open-legend/domain';

/** First-person facts only. This formatter cannot resolve a foreign name, read
 * history, manufacture an accepted mind, or bind an executable choice. */
export interface DecisionSelfFacts {
  readonly label: string;
  readonly species?: string;
  readonly traits?: readonly Pick<CharacterTrait, 'name' | 'description'>[];
  readonly mind: {
    readonly accepted: boolean;
    readonly documents: readonly {
      readonly id: string;
      readonly title: string;
      readonly text: string;
    }[];
  };
  readonly goals: readonly Pick<ActorGoal, 'status' | 'objective'>[];
}

export function formatDecisionSelfContext(input: DecisionSelfFacts) {
  return {
    identity: `I am ${input.label}. Species: ${input.species ?? 'unknown'}.${input.traits?.length ? ` My traits: ${input.traits.map((trait) => `${trait.name}: ${trait.description}`).join('; ')}.` : ''}`,
    aboutMe:
      (input.mind.accepted ? acceptedMindDocumentText(input.mind.documents) : undefined) ??
      input.mind.documents.map((document) => `${document.title}\n${document.text}`).join('\n'),
    goal: activeGoalTexts(input.goals).join('; '),
  };
}
