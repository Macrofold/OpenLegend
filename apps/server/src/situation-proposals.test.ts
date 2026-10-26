import { expect, it } from 'vitest';
import { boundResponseSchema } from './cognition-contracts.js';

const operation = {
  localId: 'choose',
  requiresAccepted: [],
  talk: null,
  act: null,
  think: null,
  goal: null,
  plan: null,
  note: null,
  name: null,
  appraise: null,
  observe: null,
  remember: null,
};
const bound = (attention: string[] = [], retention: string[] = []) =>
  boundResponseSchema(
    ['self'],
    [],
    { speech: true, expressions: true },
    [],
    [],
    [],
    undefined,
    [],
    [],
    { attention, retention },
  );

it('offers observation and retention operations only for their request-scoped handles', () => {
  expect(
    bound(['person'], ['receipt']).parse({
      operations: [{ ...operation, observe: { subjects: ['person'] } }],
    }).operations[0]!.observe,
  ).toEqual({ subjects: ['person'] });
  expect(
    bound(['person'], ['receipt']).parse({
      operations: [
        { ...operation, remember: { sources: ['receipt'], text: 'Perhaps they are waiting.' } },
      ],
    }).operations[0]!.remember,
  ).toEqual({ sources: ['receipt'], text: 'Perhaps they are waiting.' });
  expect(
    bound(['person'], ['receipt']).safeParse({
      operations: [{ ...operation, remember: { sources: ['foreign'], text: 'Perhaps.' } }],
    }).success,
  ).toBe(false);
  expect(
    bound().safeParse({ operations: [{ ...operation, observe: { subjects: ['self'] } }] }).success,
  ).toBe(false);
  expect(
    bound().safeParse({
      operations: [{ ...operation, remember: { sources: ['receipt'], text: 'Perhaps.' } }],
    }).success,
  ).toBe(false);
});
