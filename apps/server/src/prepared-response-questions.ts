import {
  decodeJudge,
  batchJudgmentQuestions,
  InvalidData,
  type JudgeValue,
  type TypedQuestionMap,
} from '@open-legend/ai';
import type { compilePreparedResponses, PreparedResponseProfile } from '@open-legend/domain';
import { ContextBudgetError } from './context.js';
import {
  offerPreparedActions,
  type prepareDecision,
  type DecisionInputMeasure,
  type DecisionInputSources,
} from './decision-context.js';
import { preparedResponseDecisionContext } from './prepared-response-context.js';

type Prepared = Awaited<ReturnType<typeof prepareDecision>>;
type Catalogue = NonNullable<ReturnType<typeof compilePreparedResponses>>;
type AppraisalContextProjection = (sources: DecisionInputSources['sharedExperiences']) => unknown;
const PURPOSE_RELEVANCE_VALUES = ['uncertain', 'relevant', 'irrelevant'] as const;
export type PurposeRelevance = Record<string, (typeof PURPOSE_RELEVANCE_VALUES)[number]>;

/** Keep complete required questions or refuse before dispatch. Both transport
 * adapters use these existing limits and the same offered-key Choice decoder. */
function checkedRequest(state: Record<string, unknown>, questions: TypedQuestionMap) {
  try {
    batchJudgmentQuestions(state, questions);
  } catch (error) {
    if (!(error instanceof InvalidData)) throw error;
    throw new ContextBudgetError(
      `Complete supplied-response judgment cannot fit: ${error.code}; ${JSON.stringify({ state, questions }).length} serialized characters.`,
    );
  }
  return { state, questions };
}

function sharedRequestState(
  context: Record<string, unknown>,
  actionGuidance: Prepared['actionGuidance'],
) {
  return {
    // Match the shared trigger, conversation and recall source-reference root.
    character: preparedResponseDecisionContext(context),
    // One full authored rubric is shared, rather than copied into every independent
    // question. Default Noul yes/no still judges these exact supplied meanings.
    personalChoiceRubric: actionGuidance,
  };
}

function requestState(prepared: Prepared) {
  return sharedRequestState(prepared.context, prepared.actionGuidance);
}

/** Reserve both actual shared-state consumers before optional evidence fits.
 * Purpose relevance is added between stages; it cannot buy a larger context or
 * displace required evidence after the first paid judgment. Question batches
 * retain their independent complete-set admission in checkedRequest. */
export function preparedResponseInputMeasure(
  catalogue: { purposes: readonly unknown[] },
  projectAppraisals?: AppraisalContextProjection,
): DecisionInputMeasure {
  const encodedBytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
  const longest = PURPOSE_RELEVANCE_VALUES.reduce((left, right) =>
    encodedBytes(left) >= encodedBytes(right) ? left : right,
  );
  const purposeRelevance = Object.fromEntries(
    catalogue.purposes.map((_, index) => [`p${index}`, longest]),
  );
  return ({ context, actionGuidance, sources }) => {
    const { purposeRelevance: _laterRelevance, ...beforeRelevance } = context;
    const choiceBytes = encodedBytes(
      sharedRequestState({ ...context, purposeRelevance }, actionGuidance),
    );
    // This native field is published only after the first stage. Its actual new
    // feelings and receipts are consumed by choice, never the earlier relevance.
    return Object.hasOwn(context, 'admittedInterpretations')
      ? choiceBytes
      : Math.max(
          encodedBytes({
            ...sharedRequestState(beforeRelevance, actionGuidance),
            ...(projectAppraisals
              ? { appraisals: projectAppraisals(sources.sharedExperiences) }
              : {}),
          }),
          choiceBytes,
        );
  };
}

export function preparedResponseRelevanceRequest(
  prepared: Prepared,
  catalogue: Catalogue,
  profile: PreparedResponseProfile,
  appraisals?: { projectContext: AppraisalContextProjection; questions: TypedQuestionMap },
) {
  if (prepared.choiceCoverage !== 'complete-required')
    throw new Error('This strategy requires complete supplied choices.');
  const descriptions = new Map<string, string>();
  for (const candidate of prepared.actionCandidates)
    if (candidate.purposeHandle && candidate.purposeDescription)
      descriptions.set(candidate.purposeHandle, candidate.purposeDescription);
  const questions: TypedQuestionMap = {};
  for (const [index, purpose] of catalogue.purposes.entries()) {
    const description = descriptions.get(`p${index}`);
    if (!description) throw new Error('The supplied purpose has no permitted descriptive meaning.');
    questions[`p${index}`] = {
      type: 'choice',
      instructions: `${profile.relevance.question} Purpose p${index}: ${description} Consider its exact bound people and available first actions in this same supplied situation.`,
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
      // Complete purposes/methods already occur in requiredChoices. Repeating
      // every opaque purpose-method pairing here can exceed the per-question
      // state limit without adding meaning; each purpose question names its people.
      ...requestState(prepared),
      ...(appraisals ? { appraisals: appraisals.projectContext(prepared.sharedExperiences) } : {}),
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

export function preparedResponseChoiceRequest(
  prepared: Prepared,
  relevance: PurposeRelevance,
  voice?: NonNullable<PreparedResponseProfile['voice']>,
) {
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
    selected.offered.map(({ id }, index) => [
      id,
      {
        type: 'noul' as const,
        // The actual purpose and action belong in each question, rather than two
        // layers of opaque references. Shared tables still retain full meanings,
        // control/cost facts and exact bindings; no offered alternative is removed.
        instructions: (() => {
          const candidate = retained[index]!;
          if (
            candidate.purpose &&
            (!candidate.firstActionDescription || !candidate.purposeDescription)
          )
            throw new Error('The supplied first action has no descriptive meaning.');
          return candidate.purpose
            ? `${candidate.id}: ${candidate.purposeDescription}. First action: ${candidate.firstActionDescription}. Would I choose this now?`
            : `${candidate.description} Would I choose this now?`;
        })(),
      },
    ]),
  );
  if (voice)
    questions.voice = {
      type: 'choice',
      instructions: voice.question,
      // Silence wins ties and covers uncertainty; it never buys a repair call.
      criteria: { a_silent: voice.silent, b_speak: voice.speak },
    };
  return {
    prepared: selected,
    request: checkedRequest(requestState(selected), questions),
  };
}

export function preparedResponseVoiceSelected(value: JudgeValue, questions: TypedQuestionMap) {
  if (!questions.voice) return false;
  const answer = decodeJudge(value, { voice: questions.voice }).answers.voice;
  return (
    answer?.type === 'choice' &&
    answer.choice === 'b_speak' &&
    (answer.probabilities.b_speak ?? 0) > (answer.probabilities.a_silent ?? 0)
  );
}
