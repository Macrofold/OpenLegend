import { expect, it } from 'vitest';
import { MEMORY_QUERY_BYTES, recallQueries } from './recall-query.js';

it('carries the permitted preceding exchange into both retrieval queries without lexical persona noise', () => {
  const invitation = 'Rowan said to me: "Shall we visit the riverside cedar?"';
  const query = recallQueries({
    stimulus: 'Rowan said to me: "Ready, then?"',
    goal: 'No current goal.',
    aboutMe: 'I enjoy weaving and my old riverside home.',
    discovery: { lines: [invitation, 'I said to Rowan: "Let me finish this."'], partial: false },
  });
  expect(query.lexical).toContain(invitation);
  expect(query.semantic).toContain(invitation);
  expect(query.lexical).not.toContain('weaving');
  expect(query.semantic).toContain('weaving');
  expect(query.coverage).toBe('complete');
  expect(query.lexicalSources).toContain(invitation);
  expect(query.lexicalSources?.[0]).toBe('Rowan said to me: "Ready, then?"');
  expect(query.lexicalSources?.some((source) => source.includes('weaving'))).toBe(false);
});

it('admits complete chronological cue sources without cutting words or collapsing repeated turns', () => {
  const repeated = 'I said to Rowan: "Wait."';
  const query = recallQueries({
    stimulus: 'Ready?',
    goal: '',
    discovery: { lines: ['é'.repeat(MEMORY_QUERY_BYTES), repeated, repeated], partial: false },
  });
  expect(query.includedSources).toBe(2);
  expect(query.omittedSources).toBe(1);
  expect(query.coverage).toBe('partial');
  expect(query.lexical?.split(repeated)).toHaveLength(3);
  expect(query.lexical).not.toContain('é');
  expect(Buffer.byteLength(query.semantic!)).toBeLessThanOrEqual(MEMORY_QUERY_BYTES);
});

it('preserves source coverage and makes an oversized current query unavailable without truncation', () => {
  expect(
    recallQueries({ stimulus: 'Ready?', goal: '', discovery: { lines: [], partial: true } })
      .coverage,
  ).toBe('partial');
  const query = recallQueries({
    stimulus: 'é'.repeat(MEMORY_QUERY_BYTES),
    goal: '',
    discovery: { lines: ['Earlier words.'], partial: false },
  });
  expect(query.lexical).toBeUndefined();
  expect(query.semantic).toBeUndefined();
  expect(query.coverage).toBe('unavailable');
  expect(query.omittedSources).toBe(1);
});

it('omits an oversized optional biography intact while retaining usable current cues', () => {
  const query = recallQueries({
    stimulus: 'Ready?',
    goal: 'Visit the cedar.',
    aboutMe: 'Long biography. '.repeat(1000),
  });
  expect(query.semantic).toBe(query.lexical);
  expect(query.semantic).toContain('Visit the cedar.');
  expect(query.identityIncluded).toBe(false);
});
