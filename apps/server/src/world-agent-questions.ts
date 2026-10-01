import { z } from 'zod';
import type { WorldAgentQuestion, WorldAgentQuestionAnswer } from '@open-legend/protocol';
import { fingerprint } from './relationship-index.js';
import { AuthoringRequestError } from './world-authoring-contracts.js';

export interface NativeQuestionEvent {
  runId: string;
  sequence: string;
  requestId: string;
  questions: unknown;
}

const option = z
  .object({ label: z.string().refine((value) => value.trim().length > 0), description: z.string() })
  .strict();
const nativeQuestion = z
  .object({
    question: z.string().refine((value) => value.trim().length > 0),
    header: z.string(),
    options: z.array(option).max(5),
    multiple: z.boolean().optional(),
    custom: z.boolean().optional(),
  })
  .strict();
export const questionAnswersSchema = z
  .array(
    z.discriminatedUnion('kind', [
      z
        .object({
          questionId: z.string(),
          kind: z.literal('options'),
          optionIds: z.array(z.string()).min(1).max(5),
        })
        .strict(),
      z
        .object({
          questionId: z.string(),
          kind: z.literal('text'),
          text: z.string().refine((value) => value.trim().length > 0),
        })
        .strict(),
    ]),
  )
  .min(1)
  .max(3);

/** Native question text is untrusted data, not an instruction or an approval. IDs and
 * exact displayed meaning are bound once by the server. docs/projects/invention-questions-tech-design.md
 */
export function normalizeQuestion(value: unknown): WorldAgentQuestion['questions'] {
  if (Buffer.byteLength(JSON.stringify(value) ?? '') > 64 * 1024)
    throw new AuthoringRequestError('The agent question exceeds the supported size.');
  const parsed = z.array(nativeQuestion).min(1).max(3).safeParse(value);
  if (!parsed.success) throw new AuthoringRequestError('The agent question format is unsupported.');
  const questions = parsed.data.map((q, index) => {
    const custom = q.custom ?? true;
    if (
      (!custom && !q.options.length) ||
      q.options.length === 1 ||
      new Set(q.options.map((o) => o.label.normalize('NFKC').trim().toLocaleLowerCase('en-US')))
        .size !== q.options.length
    )
      throw new AuthoringRequestError('The agent question has ambiguous or unsupported choices.');
    return {
      id: `q${index + 1}`,
      text: q.question,
      header: q.header,
      multiple: q.multiple ?? false,
      custom,
      options: q.options.map((o, i) => ({ id: `o${i + 1}`, ...o })),
    };
  });
  if (Buffer.byteLength(JSON.stringify(questions)) > 16 * 1024)
    throw new AuthoringRequestError('The agent question exceeds the supported size.');
  return questions;
}

export function validateQuestionAnswer(
  question: WorldAgentQuestion,
  value: unknown,
): WorldAgentQuestionAnswer['answers'] {
  if (Buffer.byteLength(JSON.stringify(value) ?? '') > 8 * 1024)
    throw new AuthoringRequestError('The answer exceeds the supported size.');
  const parsed = questionAnswersSchema.safeParse(value);
  if (!parsed.success || parsed.data.length !== question.questions.length)
    throw new AuthoringRequestError('Answer each question before continuing.');
  return question.questions.map((q) => {
    const matches = parsed.data.filter((answer) => answer.questionId === q.id);
    const answer = matches[0];
    if (matches.length !== 1 || !answer)
      throw new AuthoringRequestError('Answer each question once.');
    if (answer.kind === 'text') {
      if (!q.custom) throw new AuthoringRequestError('This question requires a listed choice.');
      return answer;
    }
    if (
      (!q.multiple && answer.optionIds.length !== 1) ||
      new Set(answer.optionIds).size !== answer.optionIds.length ||
      answer.optionIds.some((id) => !q.options.some((o) => o.id === id))
    )
      throw new AuthoringRequestError('Choose valid options for this question.');
    // Canonical native order makes equivalent multi-select submissions identical.
    return {
      ...answer,
      optionIds: q.options.filter((o) => answer.optionIds.includes(o.id)).map((o) => o.id),
    };
  });
}

export function questionAnswerSources(
  question: WorldAgentQuestion,
  answer: WorldAgentQuestionAnswer,
) {
  return answer.answers.map((entry) => {
    const q = question.questions.find((item) => item.id === entry.questionId);
    if (!q) throw new Error('Retained question answer is invalid.');
    return {
      questionId: q.id,
      question: q.text,
      text:
        entry.kind === 'text'
          ? entry.text
          : entry.optionIds
              .map((id) => {
                const o = q.options.find((item) => item.id === id);
                if (!o) throw new Error('Retained question option is invalid.');
                return o.description ? `${o.label}: ${o.description}` : o.label;
              })
              .join('\n'),
    };
  });
}

export const questionDigest = (
  runId: string,
  nativeId: string,
  questions: WorldAgentQuestion['questions'],
) => fingerprint({ runId, nativeId, questions });
