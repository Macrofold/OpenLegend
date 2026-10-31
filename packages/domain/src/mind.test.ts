import { stockedCamp } from '../../../tests/fixtures/world.js';
import { entityGet } from './entity-collection.js';
import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { setSpatialPosition, worldSupport } from './index.js';
import { worldPosition } from './spatial-state.js';
import { describe, it, expect } from 'vitest';
import {
  executeCommand,
  advanceWorld,
  updateWorld,
  publishInnerWorld,
  acceptedMindFiles,
  dreamStatus,
  dreamPolicy,
  currentObservedBodyIds,
  mindFor,
  get_memories,
  wordCount,
  type WorldState,
  type MindFiles,
  type InnerRecordChange,
  type ObserverSubject,
} from './index.js';
import { appendMemory } from './events.js';
import { currentBodySubject } from './worlds/base/knowledge.js';
import { initializePerception } from './kernel.js';

function encounter() {
  let world = stockedCamp(42);
  world.paused = false;
  setSpatialPosition(
    world,
    entityGet(world.entities, PLAYER_ID)!,
    { ...worldPosition(entityGet(world.entities, NPC_ID)!) },
    worldSupport(entityGet(world.entities, PLAYER_ID)!),
  );
  initializePerception(world, []);
  world = executeCommand(world, {
    id: 'encounter',
    actorId: PLAYER_ID,
    type: 'say',
    text: 'I will share berries with you.',
    targetId: NPC_ID,
  }).world;
  return world;
}
interface PublicationFixture {
  jobId: string;
  expectedRevision: number;
  files: MindFiles;
  thoughts: string[];
  recordChanges: InnerRecordChange[];
  dreamEpisode: string | null;
}
interface FixtureSupport {
  evidenceIds: string[];
  subjects: ObserverSubject[];
}
function publish(world: WorldState, binding: FixtureSupport, proposal: PublicationFixture) {
  return publishInnerWorld(
    world,
    NPC_ID,
    proposal.expectedRevision,
    proposal.jobId,
    'fixture',
    proposal.files,
    proposal.thoughts,
    binding.evidenceIds,
    proposal.dreamEpisode,
    [],
    [],
    [],
    binding.subjects,
    undefined,
    {},
    [],
    { sources: [], subjects: [], reflection: true },
    proposal.recordChanges,
  );
}
function setup() {
  const world = encounter();
  const recall = get_memories(world, NPC_ID, { limit: 300 });
  const evidence = recall.entries.find((entry) => entry.eventType === 'speech')!.id;
  const subject = currentBodySubject(world, NPC_ID, PLAYER_ID)!;
  const binding: FixtureSupport = {
    evidenceIds: recall.entries.map((entry) => entry.id),
    subjects: [subject],
  };
  const proposal: PublicationFixture = {
    jobId: 'fixture-decision',
    expectedRevision: world.innerWorlds![NPC_ID]!.revision,
    thoughts: ['I hope the newcomer means it.'],
    dreamEpisode: null,
    files: [
      ...acceptedMindFiles(world, NPC_ID),
      {
        path: 'newcomer.md',
        text: 'The newcomer\nThey offered to share berries. I tentatively believe they may help me.',
      },
    ],
    recordChanges: [
      {
        operation: 'upsert',
        id: 'newcomer-trust',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'relationship',
        subjectId: subject,
        source: 'inferred',
        confidence: 0.6,
        trust: 0.2,
        status: 'active',
        evidence: [{ id: evidence, relation: 'supports' }],
      },
      {
        operation: 'upsert',
        id: 'helpful-belief',
        expectedRevision: 0,
        documentId: 'newcomer',
        kind: 'belief',
        subjectId: subject,
        source: 'inferred',
        confidence: 0.5,
        trust: null,
        status: 'active',
        evidence: [{ id: evidence, relation: 'derived-from' }],
      },
    ],
  };
  return { world, binding, proposal };
}
describe('fixture: bounded authored minds', () => {
  it('commits directional interpretation of an actual engine encounter, not a fabricated fact', () => {
    const { world, binding, proposal } = setup();
    const result = publish(world, binding, proposal);
    expect(result.outcome.ok).toBe(true);
    expect(mindFor(result.world, NPC_ID).records.find((r) => r.kind === 'belief')?.source).toBe(
      'inferred',
    );
    expect(mindFor(result.world, PLAYER_ID).records).toHaveLength(1);
    expect(world.minds?.ada).toBeUndefined();
    expect(mindFor(result.world, NPC_ID).thoughts).toHaveLength(1);
    expect(result.events).toEqual([]);
  });
  it('is idempotent and rejects identity conflicts', () => {
    const { world, binding, proposal } = setup();
    const first = publish(world, binding, proposal);
    expect(publish(first.world, binding, proposal).outcome.code).toBe('duplicate');
    expect(publish(first.world, binding, { ...proposal, thoughts: ['changed'] }).outcome.ok).toBe(
      false,
    );
  });
  it('preserves concurrent new experiences', () => {
    const { world: initial, binding, proposal } = setup();
    const world = updateWorld(initial, (draft) => {
      appendMemory(draft, NPC_ID, {
        kind: 'episode',
        source: 'observed',
        summary: 'A later bird flew past.',
        importance: 2,
        entityIds: [],
      });
    });
    const result = publish(world, binding, proposal);
    expect(
      get_memories(result.world, NPC_ID, { limit: 300 }).entries.some((m) =>
        m.summary.includes('bird'),
      ),
    ).toBe(true);
    expect(mindFor(result.world, NPC_ID).records.some((record) => record.kind === 'belief')).toBe(
      true,
    );
  });
  it('rejects inaccessible evidence, forged provenance and unknown subjects', () => {
    const { world, binding, proposal } = setup();
    for (const patch of [
      { evidence: [{ id: 'private-other', relation: 'supports' as const }] },
      { source: 'authored' as const },
      { subjectId: { kind: 'individual' as const, individualId: 'unknown' } },
    ]) {
      const next = structuredClone(proposal);
      Object.assign(next.recordChanges[0]!, patch);
      expect(publish(world, binding, next).outcome.ok).toBe(false);
    }
  });
  it('requires relevant revisions without treating every simulation tick as a mind conflict', () => {
    const { world, binding, proposal } = setup();
    world.simTime += 1;
    expect(publish(world, binding, proposal).outcome.ok).toBe(true);
    expect(publish(world, binding, { ...proposal, expectedRevision: 10 }).outcome.ok).toBe(false);
  });
  it('rejects quota overflow atomically and counts filename words and UTF8 bytes', () => {
    const { world, binding, proposal } = setup();
    proposal.files[1]!.text = Array(500).fill('word').join(' ');
    expect(publish(world, binding, proposal).outcome.ok).toBe(false);
    proposal.files[1]!.text = '界'.repeat(3000);
    expect(wordCount(proposal.files[1]!.text)).toBe(1);
    expect(publish(world, binding, proposal).outcome.ok).toBe(false);
    expect(mindFor(world, NPC_ID).documents).toHaveLength(1);
  });
  it('allows atomic remove/add at ten documents, protects identity', () => {
    const { world, binding, proposal } = setup();
    const mind = mindFor(world, NPC_ID);
    for (let i = 0; i < 9; i++)
      mind.documents.push({
        id: `old${i}`,
        title: 'Old',
        text: 'An older concern',
        revision: 1,
        evidence: [],
        protected: false,
      });
    world.minds = { [NPC_ID]: mind };
    proposal.files.push(
      ...acceptedMindFiles(world, NPC_ID).filter((file) => file.path !== 'identity.md'),
    );
    expect(publish(world, binding, proposal).outcome.ok).toBe(false);
    proposal.files = proposal.files.filter((file) => file.path !== 'old0.md');
    expect(publish(world, binding, proposal).outcome.ok).toBe(true);
    proposal.files = proposal.files.filter((file) => file.path !== 'identity.md');
    expect(publish(world, binding, proposal).outcome.ok).toBe(false);
  });
  it('rejects dangling interpretation references without committing a thought or mind', () => {
    const { world, binding, proposal } = setup();
    const record = proposal.recordChanges[0]!;
    if (record.operation === 'upsert') record.documentId = 'missing';
    const result = publish(world, binding, proposal);
    expect(result.outcome.ok).toBe(false);
    expect(result.world).toBe(world);
    expect(result.events).toEqual([]);
  });
  it('marks dreams imagined and does not insert them into observed episodes', () => {
    const { world, binding, proposal } = setup();
    entityGet(world.entities, NPC_ID)!.actor!.attributes!['wilderness:energy']!.value = 60;
    const resting = executeCommand(world, {
      id: 'rest',
      actorId: NPC_ID,
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      targetId: NPC_ID,
      operation: 'activate',
    }).world;
    const policy = dreamPolicy(resting)!;
    resting.simTime += policy.afterSeconds;
    entityGet(resting.entities, NPC_ID)!.statusEffects![policy.statusEffectId]!.elapsedSeconds =
      policy.afterSeconds;
    proposal.dreamEpisode = dreamStatus(resting, entityGet(resting.entities, NPC_ID))!.episode;
    proposal.recordChanges.forEach((record) => {
      if (record.operation === 'upsert') record.source = 'imagined';
    });
    const result = publish(resting, binding, proposal);
    expect(result.outcome.ok, result.outcome.message).toBe(true);
    expect(mindFor(result.world, NPC_ID).thoughts[0]?.source).toBe('imagined');
    expect(result.world.memories[NPC_ID]).toEqual(resting.memories[NPC_ID]);
    expect(mindFor(result.world, NPC_ID).lastDreamEpisode).toBe(proposal.dreamEpisode);
  });
  it('preserves current sight without routine person history', () => {
    let world = stockedCamp(4);
    world.paused = false;
    setSpatialPosition(
      world,
      entityGet(world.entities, PLAYER_ID)!,
      { y: 0, x: 100, z: 100 },
      worldSupport(entityGet(world.entities, PLAYER_ID)!),
    );
    world = advanceWorld(world, 1).world;
    setSpatialPosition(
      world,
      entityGet(world.entities, PLAYER_ID)!,
      { ...worldPosition(entityGet(world.entities, NPC_ID)!) },
      worldSupport(entityGet(world.entities, PLAYER_ID)!),
    );
    world = advanceWorld(world, 1).world;
    const initial = (world.experience?.awareness[NPC_ID] ?? []).filter((m) =>
      world.events.some(
        (event) => event.id === m.eventId && event.type === 'encounter' && !event.exposure,
      ),
    ).length;
    initializePerception(world, []);
    expect(currentObservedBodyIds(world, NPC_ID)).toContain(PLAYER_ID);
    expect(initial).toBe(0);
    world = advanceWorld(world, 1).world;
    expect(
      (world.experience?.awareness[NPC_ID] ?? []).filter((m) =>
        world.events.some(
          (event) => event.id === m.eventId && event.type === 'encounter' && !event.exposure,
        ),
      ),
    ).toHaveLength(initial);
  });
});
describe('fixture: recall policy', () => {
  it('retains and retrieves 300 bounded episodes, exposes coverage and isolation', () => {
    const world = updateWorld(encounter(), (draft) => {
      for (let i = 0; i < 320; i++) {
        draft.simTime = i;
        appendMemory(draft, NPC_ID, {
          kind: 'episode',
          source: 'observed',
          summary: `Experience ${i}`,
          importance: 3,
          entityIds: [],
        });
      }
    });
    const recall = get_memories(world, NPC_ID, {
      limit: 300,
      maxBytes: 400000,
      strategy: 'recent',
    });
    expect(recall.entries).toHaveLength(300);
    expect(recall.entries[0]!.summary).toBe('Experience 319');
    expect(recall.entries.some((m) => m.summary === 'Experience 0')).toBe(false);
    expect(
      get_memories(world, PLAYER_ID, { limit: 300 }).entries.some(
        (m) => m.summary === 'Experience 319',
      ),
    ).toBe(false);
    expect(
      get_memories(world, NPC_ID, { maxBytes: 20, requiredIds: [recall.entries[0]!.id] }).coverage
        .requiredMissing,
    ).toEqual([recall.entries[0]!.id]);
  });
  it('prioritizes entity/lexical memories and active commitments', () => {
    const world = updateWorld(encounter(), (draft) => {
      appendMemory(draft, NPC_ID, {
        kind: 'commitment',
        source: 'heard',
        summary: 'An active promise',
        importance: 8,
        entityIds: [PLAYER_ID],
      });
    });
    const recall = get_memories(world, NPC_ID, {
      intent: 'berries',
      entityIds: [PLAYER_ID],
      limit: 1,
    });
    expect(recall.entries[0]!.kind).toBe('commitment');
  });
});

describe('fixture: evidence and forgetting boundaries', () => {
  it('keeps unqualified generated prose out of recall while retaining its current audit record', () => {
    const world = updateWorld(encounter(), (draft) => {
      appendMemory(draft, NPC_ID, {
        kind: 'reflection',
        source: 'inferred',
        summary: 'Unqualified generated text',
        importance: 10,
        entityIds: [],
      });
    });
    expect(
      get_memories(world, NPC_ID, { limit: 300 }).entries.some((m) =>
        m.summary.includes('Unqualified'),
      ),
    ).toBe(false);
    expect(world.memories[NPC_ID]!.some((m) => m.summary.includes('Unqualified'))).toBe(true);
  });
  it('requires actual self-attributed promises and protects accepted obligations', () => {
    const { world, binding, proposal } = setup();
    proposal.recordChanges = [
      {
        ...(proposal.recordChanges[0] as Extract<InnerRecordChange, { operation: 'upsert' }>),
        kind: 'commitment',
      },
    ];
    expect(publish(world, binding, proposal).outcome.ok).toBe(false);
    const spoken = executeCommand(world, {
      id: 'promise',
      actorId: NPC_ID,
      type: 'say',
      text: 'I promise to help you gather food.',
      targetId: PLAYER_ID,
    }).world;
    const promise = spoken.memories[NPC_ID]!.find((m) => m.speakerId === NPC_ID)!;
    binding.evidenceIds.push(promise.id);
    const record = proposal.recordChanges[0]!;
    if (record.operation === 'upsert') record.evidence = [{ id: promise.id, relation: 'supports' }];
    const accepted = publish(spoken, binding, proposal);
    expect(accepted.outcome.ok).toBe(true);
    const next = {
      ...proposal,
      jobId: 'compact',
      expectedRevision: 1,
      recordChanges: [
        { operation: 'remove' as const, id: proposal.recordChanges[0]!.id, expectedRevision: 1 },
      ],
    };
    expect(publish(accepted.world, binding, next).outcome.ok).toBe(false);
  });
});
