import { describe, it, expect } from 'vitest';
import {
  createWorld,
  executeCommand,
  advanceWorld,
  commitCognition,
  mindFor,
  get_memories,
  MIND_POLICY,
  wordCount,
  type CognitionBinding,
  type MindProposal,
} from './index.js';
import { appendMemory } from './events.js';

function encounter() {
  let world = createWorld(42);
  world.paused = false;
  world.entities.player!.position = { ...world.entities.ada!.position };
  world = executeCommand(world, {
    id: 'encounter',
    actorId: 'player',
    type: 'say',
    text: 'I will share berries with you.',
    targetId: 'ada',
  }).world;
  return world;
}
function setup() {
  const world = encounter();
  const recall = get_memories(world, 'ada', { limit: 300 });
  const evidence = recall.entries[0]!.id;
  const binding: CognitionBinding = {
    actorId: 'ada',
    decisionId: 'fixture-decision',
    policy: MIND_POLICY,
    tier: 'full',
    purpose: 'thought',
    watermark: recall.observationWatermark,
    evidenceIds: recall.entries.map((e) => e.id),
    entityIds: ['ada', 'player'],
    expectedPlan: world.entities.ada!.actor!.planGeneration,
    actions: { continue: null },
    restEpisode: null,
  };
  const proposal: MindProposal = {
    decisionId: binding.decisionId,
    policy: MIND_POLICY,
    expectedRevision: 0,
    thought: 'I hope the newcomer means it.',
    actionId: null,
    documents: [
      {
        id: 'newcomer',
        expectedRevision: 0,
        title: 'The newcomer',
        text: 'They offered to share berries. I tentatively believe they may help me.',
        evidence: [{ id: evidence, relation: 'supports' }],
      },
    ],
    removeDocuments: [],
    records: [
      {
        id: 'newcomer-trust',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'relationship',
        subjectId: 'player',
        source: 'inferred',
        confidence: 0.6,
        trust: 0.2,
        status: 'active',
        evidence: [{ id: evidence, relation: 'supports' }],
      },
      {
        id: 'helpful-belief',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'belief',
        subjectId: 'player',
        source: 'inferred',
        confidence: 0.5,
        trust: null,
        status: 'active',
        evidence: [{ id: evidence, relation: 'derived-from' }],
      },
    ],
    removeRecords: [],
  };
  return { world, binding, proposal };
}
describe('fixture: bounded authored minds', () => {
  it('commits directional interpretation of an actual engine encounter, not a fabricated fact', () => {
    const { world, binding, proposal } = setup();
    const result = commitCognition(world, binding, proposal);
    expect(result.outcome.ok).toBe(true);
    expect(mindFor(result.world, 'ada').records.find((r) => r.kind === 'belief')?.source).toBe(
      'inferred',
    );
    expect(mindFor(result.world, 'player').records).toHaveLength(1);
    expect(world.minds?.ada).toBeUndefined();
    expect(mindFor(result.world, 'ada').thoughts).toHaveLength(1);
    expect(result.events).toEqual([]);
  });
  it('is idempotent and rejects identity conflicts', () => {
    const { world, binding, proposal } = setup();
    const first = commitCognition(world, binding, proposal);
    expect(commitCognition(first.world, binding, proposal).outcome.code).toBe('duplicate');
    expect(
      commitCognition(first.world, binding, { ...proposal, thought: 'changed' }).outcome.ok,
    ).toBe(false);
  });
  it('preserves concurrent new experiences', () => {
    const { world, binding, proposal } = setup();
    appendMemory(world, 'ada', {
      kind: 'episode',
      source: 'observed',
      summary: 'A later bird flew past.',
      importance: 2,
      entityIds: [],
    });
    const result = commitCognition(world, binding, proposal);
    expect(
      get_memories(result.world, 'ada', { limit: 300 }).entries.some((m) =>
        m.summary.includes('bird'),
      ),
    ).toBe(true);
    expect(mindFor(result.world, 'ada').processedWatermark).toBe(binding.watermark);
  });
  it.each(['fast', 'complex'] as const)('rejects %s writes', (tier) => {
    const { world, binding, proposal } = setup();
    expect(commitCognition(world, { ...binding, tier }, proposal).outcome.ok).toBe(false);
  });
  it('rejects inaccessible evidence, forged provenance and unknown subjects', () => {
    const { world, binding, proposal } = setup();
    for (const patch of [
      { evidence: [{ id: 'private-other', relation: 'supports' as const }] },
      { source: 'authored' as const },
      { subjectId: 'unknown' },
    ]) {
      const next = structuredClone(proposal);
      Object.assign(next.records[0]!, patch);
      expect(commitCognition(world, binding, next).outcome.ok).toBe(false);
    }
  });
  it('requires relevant revisions without treating every simulation tick as a mind conflict', () => {
    const { world, binding, proposal } = setup();
    world.simTime += 1;
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(true);
    expect(commitCognition(world, binding, { ...proposal, expectedRevision: 10 }).outcome.ok).toBe(
      false,
    );
  });
  it('rejects quota overflow atomically and counts title words and UTF8 bytes', () => {
    const { world, binding, proposal } = setup();
    proposal.documents[0]!.text = Array(500).fill('word').join(' ');
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(false);
    proposal.documents[0]!.text = '界'.repeat(3000);
    expect(wordCount(proposal.documents[0]!.text)).toBe(1);
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(false);
    expect(mindFor(world, 'ada').documents).toHaveLength(1);
  });
  it('allows atomic remove/add at ten documents, protects identity', () => {
    const { world, binding, proposal } = setup();
    const mind = mindFor(world, 'ada');
    for (let i = 0; i < 9; i++)
      mind.documents.push({
        id: `old${i}`,
        title: 'Old',
        text: 'An older concern',
        revision: 1,
        evidence: [],
        protected: false,
      });
    world.minds = { ada: mind };
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(false);
    proposal.removeDocuments = [{ id: 'old0', expectedRevision: 1 }];
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(true);
    proposal.removeDocuments = [{ id: 'identity', expectedRevision: 1 }];
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(false);
  });
  it('rejects coupled invalid actions without committing a thought or mind', () => {
    const { world, binding, proposal } = setup();
    binding.actions.bad = { id: 'bad', actorId: 'ada', type: 'gather', targetId: 'missing' };
    proposal.actionId = 'bad';
    const result = commitCognition(world, binding, proposal);
    expect(result.outcome.ok).toBe(false);
    expect(result.world).toBe(world);
    expect(result.events).toEqual([]);
  });
  it('marks dreams imagined and does not insert them into observed episodes', () => {
    const { world, binding, proposal } = setup();
    world.entities.ada!.actor!.energy = 60;
    const resting = executeCommand(world, { id: 'rest', actorId: 'ada', type: 'rest' }).world;
    binding.purpose = 'dream';
    binding.restEpisode = resting.entities.ada!.actor!.action!.id;
    proposal.records.forEach((r) => (r.source = 'imagined'));
    const result = commitCognition(resting, binding, proposal);
    expect(result.outcome.ok).toBe(true);
    expect(mindFor(result.world, 'ada').thoughts[0]?.source).toBe('imagined');
    expect(result.world.memories.ada).toEqual(resting.memories.ada);
    expect(mindFor(result.world, 'ada').lastDreamEpisode).toBe(binding.restEpisode);
  });
  it('records person encounters natively without repeated per-step records', () => {
    let world = createWorld(4);
    world.paused = false;
    world.entities.player!.position = { y: 0, x: 100, z: 100 };
    world = advanceWorld(world, 1).world;
    world.entities.player!.position = { ...world.entities.ada!.position };
    world = advanceWorld(world, 1).world;
    const initial = (world.memories.ada ?? []).filter((m) => m.summary.startsWith('I saw ')).length;
    expect(initial).toBeGreaterThan(0);
    world = advanceWorld(world, 1).world;
    expect((world.memories.ada ?? []).filter((m) => m.summary.startsWith('I saw '))).toHaveLength(
      initial,
    );
  });
});
describe('fixture: recall policy', () => {
  it('retains and retrieves 300 bounded episodes, exposes coverage and isolation', () => {
    const world = encounter();
    world.memories.ada = [];
    for (let i = 0; i < 320; i++) {
      world.simTime = i;
      appendMemory(world, 'ada', {
        kind: 'episode',
        source: 'observed',
        summary: `Experience ${i}`,
        importance: 3,
        entityIds: [],
      });
    }
    const recall = get_memories(world, 'ada', { limit: 300, maxBytes: 400000, strategy: 'recent' });
    expect(recall.entries).toHaveLength(300);
    expect(recall.entries[0]!.summary).toBe('Experience 319');
    expect(recall.entries.some((m) => m.summary === 'Experience 0')).toBe(false);
    expect(
      get_memories(world, 'player', { limit: 300 }).entries.some(
        (m) => m.summary === 'Experience 319',
      ),
    ).toBe(false);
    expect(
      get_memories(world, 'ada', { maxBytes: 20, requiredIds: [recall.entries[0]!.id] }).coverage
        .requiredMissing,
    ).toEqual([recall.entries[0]!.id]);
  });
  it('prioritizes entity/lexical memories and active commitments', () => {
    const world = encounter();
    appendMemory(world, 'ada', {
      kind: 'commitment',
      source: 'heard',
      summary: 'An active promise',
      importance: 8,
      entityIds: ['player'],
    });
    const recall = get_memories(world, 'ada', {
      intent: 'berries',
      entityIds: ['player'],
      limit: 1,
    });
    expect(recall.entries[0]!.kind).toBe('commitment');
  });
});

describe('fixture: evidence and forgetting boundaries', () => {
  it('excludes old model-authored prose from recall without deleting saved audit records', () => {
    const world = encounter();
    appendMemory(world, 'ada', {
      kind: 'reflection',
      source: 'inferred',
      summary: 'Legacy private authored text',
      importance: 10,
      entityIds: [],
    });
    expect(
      get_memories(world, 'ada', { limit: 300 }).entries.some((m) => m.summary.includes('Legacy')),
    ).toBe(false);
    expect(world.memories.ada!.some((m) => m.summary.includes('Legacy'))).toBe(true);
  });
  it('requires actual self-attributed promises and protects accepted obligations', () => {
    const { world, binding, proposal } = setup();
    proposal.records = [{ ...proposal.records[0]!, kind: 'commitment' }];
    expect(commitCognition(world, binding, proposal).outcome.ok).toBe(false);
    const spoken = executeCommand(world, {
      id: 'promise',
      actorId: 'ada',
      type: 'say',
      text: 'I promise to help you gather food.',
      targetId: 'player',
    }).world;
    const promise = spoken.memories.ada!.find((m) => m.speakerId === 'ada')!;
    binding.evidenceIds.push(promise.id);
    proposal.records[0]!.evidence = [{ id: promise.id, relation: 'supports' }];
    const accepted = commitCognition(spoken, binding, proposal);
    expect(accepted.outcome.ok).toBe(true);
    const next = {
      ...proposal,
      decisionId: 'compact',
      expectedRevision: 1,
      documents: [],
      records: [],
      removeRecords: [{ id: proposal.records[0]!.id, expectedRevision: 1 }],
    };
    expect(
      commitCognition(accepted.world, { ...binding, decisionId: 'compact' }, next).outcome.ok,
    ).toBe(false);
  });
});
