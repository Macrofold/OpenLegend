import {
  decodeJudge,
  validateJudgmentSize,
  validateQuestions,
  InvalidData,
  type JudgeValue,
  type TypedQuestionMap,
} from '@open-legend/ai';
import type { compilePreparedResponses, PreparedResponseProfile } from '@open-legend/domain';
import { ContextBudgetError } from './context.js';
import { offerPreparedActions, type prepareDecision } from './decision-context.js';

type Prepared = Awaited<ReturnType<typeof prepareDecision>>;
type Catalogue = NonNullable<ReturnType<typeof compilePreparedResponses>>;
export type PurposeRelevance = Record<string, 'uncertain' | 'relevant' | 'irrelevant'>;

/** Keep complete required questions or refuse before dispatch. Both transport
 * adapters use these existing limits and the same offered-key Choice decoder. */
function checkedRequest(state: Record<string, unknown>, questions: TypedQuestionMap) {
  validateQuestions(questions);
  try {
    validateJudgmentSize(state, questions);
  } catch (error) {
    if (!(error instanceof InvalidData)) throw error;
    throw new ContextBudgetError(`Complete supplied-response judgment cannot fit: ${error.code}.`);
  }
  return { state, questions };
}

function requestState(prepared: Prepared, offered: { id: string; description: string }[]) {
  return {
    decisionContext: Object.fromEntries(
      Object.entries(prepared.context).filter(
        ([key]) => !['knowledgeInstructions', 'navigation', 'planOffers'].includes(key),
      ),
    ),
    // One full authored rubric is shared, rather than copied into every independent
    // question. Default Noul yes/no still judges these exact supplied meanings.
    personalChoiceRubric: prepared.actionGuidance,
    choices: Object.fromEntries(offered.map((choice) => [choice.id, choice.description])),
  };
}

export function preparedResponseRelevanceRequest(
  prepared: Prepared,
  catalogue: Catalogue,
  profile: PreparedResponseProfile,
  appraisals?: { context: unknown; questions: TypedQuestionMap },
) {
  if (prepared.choiceCoverage !== 'complete-required')
    throw new Error('This strategy requires complete supplied choices.');
  const questions: TypedQuestionMap = {};
  for (const [index, purpose] of catalogue.purposes.entries()) {
    questions[`p${index}`] = {
      type: 'choice',
      instructions: `${profile.relevance.question} Purpose p${index}: ${purpose.description} Consider its exact bound people and available first actions in this same supplied situation.`,
      criteria: {
        // Insertion and canonical order agree. Uncertainty wins a tie containing it;
        // relevant wins a relevant/irrelevant tie above uncertainty.
        a_uncertain: profile.relevance.uncertain,
        b_relevant: profile.relevance.relevant,
        c_irrelevant: profile.relevance.irrelevant,
      },
    };
  }
  if (appraisals)
    for (const [handle, question] of Object.entries(appraisals.questions)) {
      if (Object.hasOwn(questions, handle))
        throw new Error('An appraisal question reused a purpose handle.');
      questions[handle] = question;
    }
  return checkedRequest(
    {
      ...requestState(
        prepared,
        prepared.actionCandidates.map((candidate, index) => ({
          id: `a${index}`,
          description: candidate.description,
        })),
      ),
      ...(appraisals ? { appraisals: appraisals.context } : {}),
    },
    questions,
  );
}

export function preparedResponseRelevance(
  value: JudgeValue,
  questions: TypedQuestionMap,
  catalogue: Catalogue,
): PurposeRelevance {
  // Reuse offered-score selection, including partial-score refusal and exact ties;
  // a claimed choice label never substitutes for the supplied finite scores.
  const decoded = decodeJudge(
    value,
    Object.fromEntries(
      catalogue.purposes.map((_, index) => [`p${index}`, questions[`p${index}`]!]),
    ),
  );
  return Object.fromEntries(
    catalogue.purposes.map((_, index) => {
      const handle = `p${index}`,
        answer = decoded.answers[handle];
      if (answer?.type !== 'choice') throw new InvalidData('invalid_purpose_relevance');
      return [
        handle,
        answer.choice === 'a_uncertain'
          ? 'uncertain'
          : answer.choice === 'b_relevant'
            ? 'relevant'
            : 'irrelevant',
      ];
    }),
  );
}

export function preparedResponseChoiceRequest(prepared: Prepared, relevance: PurposeRelevance) {
  const retained = prepared.actionCandidates.filter(
    (candidate) =>
      !candidate.purposeHandle ||
      relevance[candidate.purposeHandle] === 'relevant' ||
      relevance[candidate.purposeHandle] === 'uncertain',
  );
  const selected = offerPreparedActions(
    {
      ...prepared,
      context: { ...prepared.context, purposeRelevance: relevance },
    },
    retained,
    'Supplied purpose relevance; uncertain purposes retained',
  );
  const questions: TypedQuestionMap = Object.fromEntries(
    selected.offered.map(({ id }) => [
      id,
      {
        type: 'noul' as const,
        instructions: `For choices.${id}, is personalChoiceRubric.criteria.true supported rather than personalChoiceRubric.criteria.false? Judge the complete purpose and first action for this person using personalChoiceRubric.selection and reasons.`,
      },
    ]),
  );
  return {
    prepared: selected,
    request: checkedRequest(requestState(selected, selected.offered), questions),
  };
}
