import { expect, it } from 'vitest';
import { createWorld, PLAYER_ID } from './worlds/base/world.js';
import { editKnowledge, knowledgeDocument } from './knowledge.js';
import { adjustRetainedKnowledgeAccounting } from './remembered-impressions.js';

it('preserves the complete prior knowledge document when its next revision cannot be represented', () => {
  const world = createWorld(174);
  const initial = knowledgeDocument(world, PLAYER_ID, null);
  expect(
    editKnowledge(
      world,
      PLAYER_ID,
      {
        subjectId: null,
        expectedRevision: initial?.revision ?? 0,
        text: 'An independently retained understanding.',
      },
      [],
    ).ok,
  ).toBe(true);
  const document = knowledgeDocument(world, PLAYER_ID, null)!;
  const prior = structuredClone(document);
  document.revision = Number.MAX_SAFE_INTEGER - 1;
  expect(adjustRetainedKnowledgeAccounting(world, PLAYER_ID, prior, document)).toBe(true);
  expect(
    editKnowledge(
      world,
      PLAYER_ID,
      {
        subjectId: null,
        expectedRevision: Number.MAX_SAFE_INTEGER - 1,
        text: 'The final valid replacement.',
      },
      [],
    ).ok,
  ).toBe(true);
  expect(knowledgeDocument(world, PLAYER_ID, null)!.revision).toBe(Number.MAX_SAFE_INTEGER);
  expect(world.knowledgeRevisions?.[PLAYER_ID]).toBeLessThan(Number.MAX_SAFE_INTEGER);
  const before = JSON.stringify(world);
  expect(
    editKnowledge(
      world,
      PLAYER_ID,
      { subjectId: null, expectedRevision: Number.MAX_SAFE_INTEGER, text: 'Replacement text.' },
      [],
    ).code,
  ).toBe('knowledge-revision-exhausted');
  expect(JSON.stringify(world)).toBe(before);
  expect(
    editKnowledge(
      world,
      PLAYER_ID,
      {
        subjectId: null,
        expectedRevision: Number.MAX_SAFE_INTEGER,
        text: knowledgeDocument(world, PLAYER_ID, null)!.text,
      },
      [],
    ).code,
  ).toBe('knowledge-unchanged');
  expect(JSON.stringify(world)).toBe(before);
});
