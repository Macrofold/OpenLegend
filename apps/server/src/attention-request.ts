import {
  JUDGMENT_MAX_CHARACTERS,
  JUDGMENT_STATE_QUESTION_CHARACTERS,
  validateJudgmentSize,
  type TypedQuestionMap,
} from '@open-legend/ai';
import { attentionQuestionPolicy, batchedAttentionQuestions } from './jev-questions.js';
import type { WorldState } from '@open-legend/domain';

/** Fit actual descriptions and question text, rather than silently imposing a question count.
 * docs/memory-architecture.md#4-jev-attention-before-context-inclusion
 */
export function attentionRequest(
  state: Record<string, unknown>,
  entries: [string, unknown][],
  purpose: 'context' | 'actions' | 'choose-action' = 'context',
  guidance?: WorldState['cognitionPolicy']['actionGuidance'],
  fixedQuestions: TypedQuestionMap = {},
) {
  const policy = attentionQuestionPolicy(purpose, guidance);
  const sharedState = policy ? { ...state, actionQuestionPolicy: policy } : state;
  const candidates: Record<string, unknown> = {};
  const questions: TypedQuestionMap = { ...fixedQuestions };
  const fixedCount = Object.keys(fixedQuestions).length;
  let stateCharacters = JSON.stringify({ ...sharedState, candidates }).length;
  let requestCharacters = JSON.stringify({
    state: { ...sharedState, candidates },
    questions,
  }).length;
  let longestQuestion = Math.max(
    0,
    ...Object.values(fixedQuestions).map((question) => JSON.stringify(question).length),
  );
  if (
    stateCharacters + longestQuestion > JUDGMENT_STATE_QUESTION_CHARACTERS ||
    requestCharacters > JUDGMENT_MAX_CHARACTERS
  )
    validateJudgmentSize({ ...sharedState, candidates }, questions);
  let count = 0;
  for (const [id, text] of entries) {
    if (Object.hasOwn(fixedQuestions, id))
      throw new Error('A candidate question conflicts with an independently required question.');
    const label = purpose === 'context' ? id : `Option ${count + 1}`;
    const original = batchedAttentionQuestions([id], purpose, guidance)[id]!;
    const question = {
      ...original,
      instructions: original.instructions.replaceAll(`candidates.${id}`, label),
    };
    const questionCharacters = JSON.stringify(question).length;
    const candidateAddition = JSON.stringify({ [label]: text }).length - 2 + (count ? 1 : 0);
    const questionAddition =
      JSON.stringify({ [id]: question }).length - 2 + (fixedCount + count ? 1 : 0);
    const longest = Math.max(longestQuestion, questionCharacters);
    if (
      stateCharacters + candidateAddition + longest > JUDGMENT_STATE_QUESTION_CHARACTERS ||
      requestCharacters + candidateAddition + questionAddition > JUDGMENT_MAX_CHARACTERS
    )
      continue;
    candidates[label] = text;
    questions[id] = question;
    count++;
    stateCharacters += candidateAddition;
    requestCharacters += candidateAddition + questionAddition;
    longestQuestion = longest;
  }
  return { state: { ...sharedState, candidates }, questions };
}
