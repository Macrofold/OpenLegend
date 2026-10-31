import { expect, it } from 'vitest';
import type { AttentionCandidate } from './recall.js';
import {
  assembleModelEvidence,
  contextSections,
  experienceForModel,
  type ModelEvidenceSource,
} from './perceived-context.js';
import { readableDecisionContext } from './response-context.js';

function source(id: string, summary = 'My sister carved the cedar bird.'): ModelEvidenceSource {
  const experience = experienceForModel(
    {
      source: 'memory',
      value: {
        id,
        actorId: 'owner',
        kind: 'episode',
        source: 'heard',
        summary,
        speakerId: 'speaker',
        at: 86400,
        entityIds: ['speaker'],
        importance: 8,
      },
    },
    {
      source: id,
      ownerId: 'owner',
      perspective: { selfId: 'owner', names: new Map() },
      entities: new Map([
        ['owner', 'self'],
        ['speaker', 'other'],
      ]),
      sourceReferences: new Map(),
    },
  );
  return {
    key: `memory:${id}`,
    revision: 'revision',
    experience,
    acquisition: 'heard',
    subjectIds: ['speaker'],
    occurrence: null,
  };
}
function candidate(
  entry: ModelEvidenceSource,
  kind: 'memory' | 'conversation',
): AttentionCandidate {
  return {
    id: entry.key,
    kind,
    text: 'Duplicate narrative must not be supplied.',
    experience: [entry.experience],
    modelSources: [entry],
    sourceKeys: [entry.key],
    revision: entry.revision,
    required: true,
    automatic: false,
    entityIds: [],
    at: 86400,
    salience: 8,
  };
}

it('renders one full source with both recall and conversation roles', () => {
  const entry = source('old-memory');
  const evidence = assembleModelEvidence([
    entry,
    { ...entry, experience: { ...entry.experience, handle: 'another-role' } },
  ]);
  const sections = contextSections(
    [candidate(entry, 'memory'), candidate(entry, 'conversation')],
    evidence.sources,
  );
  const context = { ...sections, experience: evidence.experience };
  const prompt = readableDecisionContext(context, []);
  expect(evidence.experience).toHaveLength(1);
  expect(sections['recall']).toEqual(['character.experience[0]']);
  expect(sections['conversation']).toEqual(['character.experience[0]']);
  expect(prompt).not.toContain('Duplicate narrative');
  expect(prompt.split('My sister carved the cedar bird.')).toHaveLength(2);
  expect(evidence.experience[0]?.value).toMatchObject({
    source: 'heard',
    speakerId: 'other',
    actorId: 'self',
    at: 86400,
  });
});

it('keeps distinct occurrences with identical prose and time, and rejects conflicting source versions', () => {
  const first = source('first');
  const second = source('second');
  const evidence = assembleModelEvidence([first, second]);
  expect(evidence.experience).toHaveLength(2);
  expect(evidence.sources.get(second.key)?.index).toBe(1);
  expect(() => assembleModelEvidence([first, { ...first, revision: 'changed' }])).toThrow(
    'conflicting source',
  );
  expect(() =>
    assembleModelEvidence([
      first,
      { ...first, experience: { ...first.experience, owner: 'another-observer' } },
    ]),
  ).toThrow('conflicting source');
});

it('does not alias another source family or a summary to its original occurrence', () => {
  const entry = source('same-id');
  const distinct = { ...source('same-id'), key: 'awareness:same-id' };
  const evidence = assembleModelEvidence([entry, distinct]);
  expect(evidence.experience).toHaveLength(2);
  expect(evidence.sources.get(entry.key)?.index).toBe(0);
  expect(evidence.sources.get(distinct.key)?.index).toBe(1);
  expect(() => contextSections([candidate(entry, 'memory')], new Map())).toThrow('array slot');
});
