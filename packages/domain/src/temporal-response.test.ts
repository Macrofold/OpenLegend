import { expect, it } from 'vitest';
import { createWorld, PLAYER_ID, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { initializePerception } from './kernel.js';
import { setSpatialPosition, worldSupport } from './spatial-state.js';
import { captureAttentionPresentation } from './attention.js';
import {
  captureEvidenceCut,
  evidenceCutEligible,
  currentObservedFacets,
} from './perception-evidence.js';
import { invalidateExperience } from './experience.js';
import {
  commitActorResponse,
  validResponseEnvelope,
  type ResponseOperation,
  type SituationProposalBinding,
} from './response.js';
import { selectedTemporalPolicy } from './world-composition.js';
import { selectTemporalHistory } from './temporal-evidence.js';

const empty = { talk: null, act: null, think: null, goal: null, plan: null };
function setup() {
  const world = createWorld(59);
  world.paused = false;
  for (const [id, x] of [
    [PLAYER_ID, 1],
    [NPC_ID, 3],
  ] as const) {
    const entity = entityGet(world.entities, id)!;
    setSpatialPosition(world, entity, { x, y: 0, z: 2 }, worldSupport(entity));
  }
  initializePerception(world, []);
  const candidate = Object.entries(world.perceptionEvidence![NPC_ID]!.attention!.candidates).find(
    ([, value]) => value.sourceId === PLAYER_ID,
  )!;
  const selected = selectTemporalHistory(world.experience!.temporal, NPC_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  }).entries.find(({ values }) =>
    values.some((value) => value.kind === 'body' && value.body.position.x === 1),
  )!;
  expect(selected).toBeDefined();
  const binding: SituationProposalBinding = {
    privacyRevision: 0,
    attentionReferences: { 'offered-person': candidate[0] },
    retentionReferences: { 'offered-receipt': selected.receipt },
    presented: captureAttentionPresentation(world, NPC_ID, [candidate[0]]),
  };
  const commit = (
    operations: ResponseOperation[],
    id: string,
    input = world,
    sources: string[] = [],
  ) =>
    commitActorResponse(
      input,
      id,
      NPC_ID,
      { operations },
      {},
      [NPC_ID, PLAYER_ID],
      0,
      [],
      undefined,
      sources,
      {},
      undefined,
      {},
      {},
      binding,
    );
  return { world, binding, selected, candidate, commit };
}

it('binds attention selection to supplied current candidates without creating a diary', () => {
  const { world, candidate, commit } = setup();
  const before = world.memories[NPC_ID]?.length ?? 0;
  const accepted = commit(
    [
      {
        ...empty,
        localId: 'look',
        requiresAccepted: [],
        observe: { subjects: ['offered-person'] },
      },
    ],
    'response-observe',
  );
  expect(accepted.outcome.ok).toBe(true);
  expect(accepted.world.perceptionEvidence![NPC_ID]!.attention!.explicit).toEqual([candidate[0]]);
  expect(accepted.world.memories[NPC_ID]?.length ?? 0).toBe(before);
  const rejected = commit(
    [{ ...empty, localId: 'look', requiresAccepted: [], observe: { subjects: [PLAYER_ID] } }],
    'response-observe-foreign',
  );
  expect(rejected.outcome.ok).toBe(false);
});

it('remembers a fallible source-linked interpretation and revokes it with its actual source', () => {
  const { selected, commit } = setup();
  const result = commit(
    [
      {
        ...empty,
        localId: 'keep',
        requiresAccepted: [],
        remember: {
          sources: ['offered-receipt'],
          text: 'That person seemed to be waiting for me.',
        },
      },
    ],
    'response-remember',
  );
  expect(result.outcome.ok).toBe(true);
  const memory = result.world.memories[NPC_ID]!.find((record) => record.kind === 'impression')!;
  expect(memory.impression!.claims).toEqual([
    { kind: 'interpretation', text: 'That person seemed to be waiting for me.' },
  ]);
  expect(memory.impression!.provenance[0]!.from).toBe(selected.receipt.ordinal);
  expect(memory.impression!.dependencies[0]).toMatchObject({
    source: { family: 'native-exposure', id: selected.receipt.id },
  });
  const changed = JSON.parse(JSON.stringify(result.world));
  const source = selected.receipt.facets.find((facet) => facet.original)!.original!.source.id;
  invalidateExperience(changed, NPC_ID, [source], true);
  expect(changed.memories[NPC_ID].some((record: { id: string }) => record.id === memory.id)).toBe(
    false,
  );
});

it('retains a supplied current measurement even when recent history omits it and the subject later moves', () => {
  const { world, binding, commit } = setup();
  const player = entityGet(world.entities, PLAYER_ID)!;
  world.simTime = 5;
  setSpatialPosition(world, player, { x: 4, y: 0, z: 2 }, worldSupport(player), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const snapshot = currentObservedFacets(world, NPC_ID, PLAYER_ID).find(
    (facet) => facet.value.kind === 'location',
  )!;
  expect(
    snapshot.value.kind === 'location' &&
      snapshot.value.location.kind === 'point' &&
      snapshot.value.location.point.x,
  ).toBe(4);
  binding.retentionReferences = {};
  binding.currentReferences = { 'supplied-current-point': snapshot };
  // No new sensory sample follows this movement during the character's pending interpretation.
  world.simTime = 10;
  setSpatialPosition(world, player, { x: 7, y: 0, z: 2 }, worldSupport(player), {
    continuity: 'physical',
  });
  const result = commit(
    [
      {
        ...empty,
        localId: 'keep',
        requiresAccepted: [],
        remember: {
          sources: ['supplied-current-point'],
          text: 'That person appeared to be closer.',
        },
      },
    ],
    'response-current-point',
  );
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  const retained = selectTemporalHistory(result.world.experience!.temporal, NPC_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  }).entries.at(-1)!;
  expect(retained.values[0]).toMatchObject({
    kind: 'location',
    location: { kind: 'point', point: { x: 4 } },
  });
  expect(retained.receipt.facets[0]).toMatchObject({
    measuredFrom: 5,
    measuredThrough: 5,
    acquiredAt: 5,
    receivedFrom: snapshot.confirmation,
  });
  expect(result.world.memories[NPC_ID]!.some((memory) => memory.kind === 'impression')).toBe(true);
});

it('acknowledges only supplied attention on accepted interpretation and fences privacy edits', () => {
  const { world, binding, candidate, commit } = setup();
  const cut = captureEvidenceCut(world, NPC_ID);
  const accepted = commit([], 'response-quiet');
  expect(accepted.outcome.ok).toBe(true);
  const current = accepted.world.perceptionEvidence![NPC_ID]!.attention!.candidates[candidate[0]]!;
  expect(current.presentedChange).toBe(binding.presented![0]!.changeRevision);
  const changed = JSON.parse(JSON.stringify(world));
  invalidateExperience(changed, NPC_ID, [cut.acquired[0]!.id], true);
  expect(evidenceCutEligible(changed, cut)).toBe(false);
  const rejected = commit(
    [
      {
        ...empty,
        localId: 'keep',
        requiresAccepted: [],
        remember: {
          sources: ['offered-receipt'],
          text: 'I should remember this.',
        },
      },
    ],
    'response-stale-situation',
    changed,
  );
  expect(rejected.outcome.ok).toBe(false);
  expect(changed.experience.privacyRevisions[NPC_ID]).toBe(1);
});

it('reinforces only actually selected impressions at accepted semantic use', () => {
  const { commit } = setup();
  const remembered = commit(
    [
      {
        ...empty,
        localId: 'keep',
        requiresAccepted: [],
        remember: {
          sources: ['offered-receipt'],
          text: 'I think this person was waiting.',
        },
      },
    ],
    'response-before-reinforce',
  );
  const changed = JSON.parse(JSON.stringify(remembered.world));
  const memory = changed.memories[NPC_ID].find(
    (record: { kind: string }) => record.kind === 'impression',
  );
  const prior = memory.impression.reinforcedAt;
  changed.simTime += selectedTemporalPolicy(changed).impression.reinforceIntervalSeconds;
  const result = commit([], 'response-reinforce', changed, [memory.id]);
  expect(
    result.world.memories[NPC_ID]!.find((record) => record.id === memory.id)!.impression!
      .reinforcedAt,
  ).toBe(changed.simTime);
  expect(
    changed.memories[NPC_ID].find((record: { id: string }) => record.id === memory.id).impression
      .reinforcedAt,
  ).toBe(prior);
});

it('rejects mixed proposals and bounds repeated source references at the shared envelope', () => {
  expect(
    validResponseEnvelope({
      operations: [
        {
          ...empty,
          localId: 'x',
          requiresAccepted: [],
          observe: { subjects: ['a'] },
          remember: { sources: ['b'], text: 'Maybe.' },
        },
      ],
    }),
  ).toBe(false);
  expect(
    validResponseEnvelope({
      operations: [
        {
          ...empty,
          localId: 'x',
          requiresAccepted: [],
          remember: { sources: ['b', 'b'], text: 'Maybe.' },
        },
      ],
    }),
  ).toBe(true);
  expect(
    validResponseEnvelope({
      operations: [
        {
          ...empty,
          localId: 'x',
          requiresAccepted: [],
          remember: { sources: Array.from({ length: 9 }, () => 'b'), text: 'Maybe.' },
        },
      ],
    }),
  ).toBe(false);
});
