import {
  JUDGMENT_MAX_CHARACTERS,
  JUDGMENT_STATE_QUESTION_CHARACTERS,
  type TypedQuestionMap,
} from '@open-legend/ai';
import { batchedAttentionQuestions } from './jev-questions.js';

/** Fit actual descriptions and question text, rather than silently imposing a question count.
 * docs/memory-architecture.md#4-jev-attention-before-context-inclusion
 */
export function attentionRequest(
  state: Record<string, unknown>,
  entries: [string, string][],
  purpose: 'context' | 'actions' | 'choose-action' = 'context',
) {
  const candidates: Record<string, string> = {};
  const questions: TypedQuestionMap = {};
  let stateCharacters = JSON.stringify({ ...state, candidates }).length;
  let requestCharacters = JSON.stringify({ state: { ...state, candidates }, questions }).length;
  let longestQuestion = 0;
  let count = 0;
  for (const [id, text] of entries) {
    const label = purpose === 'context' ? id : `Option ${count + 1}`;
    const original = batchedAttentionQuestions([id], purpose)[id]!;
    const question = {
      ...original,
      instructions: original.instructions.replaceAll(`candidates.${id}`, label),
    };
    const questionCharacters = JSON.stringify(question).length;
    const candidateAddition = JSON.stringify({ [label]: text }).length - 2 + (count ? 1 : 0);
    const questionAddition = JSON.stringify({ [id]: question }).length - 2 + (count ? 1 : 0);
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
  return { state: { ...state, candidates }, questions };
}
