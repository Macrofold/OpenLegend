import { expect, it } from 'vitest';
import { validateQuestions, validateJudgmentSize } from '@open-legend/ai';
import { attentionRequest } from './attention-request.js';
import { attentionIncludes } from './jev-questions.js';

it('admits 300 independent Noul questions with a shared rubric and explicit candidate references', () => {
  const entries: [string, string][] = Array.from({ length: 300 }, (_, i) => [
    `c${i}`,
    `Fixture evidence ${i}`,
  ]);
  const request = attentionRequest({ attentionPolicy: 'Keep useful evidence.' }, entries);
  validateQuestions(request.questions);
  validateJudgmentSize(request.state, request.questions);
  expect(Object.keys(request.questions)).toHaveLength(300);
  expect(request.questions.c299).toEqual({
    type: 'noul',
    instructions: 'Is `candidates.c299` relevant under `attentionPolicy`?',
  });
  expect(Object.values(request.questions).every((q) => !('criteria' in q))).toBe(true);
});

it('keeps the existing relevance threshold and does not include missing answers', () => {
  expect(attentionIncludes({ type: 'noul', noul: 0.5 })).toBe(true);
  expect(attentionIncludes({ type: 'noul', noul: 0.49 })).toBe(false);
  expect(attentionIncludes(undefined)).toBe(false);
});
