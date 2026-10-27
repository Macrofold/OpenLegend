import { expect, it } from 'vitest';
import { freeze } from 'immer';
import { createWorld, NPC_ID, PLAYER_ID } from './data.js';
import { entityGet, entitySet, entityValues } from './entity-collection.js';
import { initializePerception, executeCommand, advanceWorld } from './kernel.js';
import { setSpatialPosition, worldSupport } from './spatial-state.js';
import {
  setAttentionFocus,
  captureAttentionPresentation,
  acknowledgeAttention,
  currentDetailedAttention,
} from './attention.js';
import {
  currentBodyObservation,
  currentBodyLocalSubject,
  currentObservedFacets,
  captureEvidenceCut,
  validatePerceptionEvidenceState,
  validateObservationContribution,
} from './perception-evidence.js';
import { invalidateExperience } from './experience.js';
import { emit } from './events.js';
import { subjectNarration } from './narration.js';
import type { WorldEvent } from './types.js';
import { validateTemporalEvidenceState } from './temporal-validation.js';
import { selectedTemporalPolicy } from './world-composition.js';
import {
  appendTemporalReceipt,
  selectTemporalHistory,
  temporalReceiptSource,
  retainedTemporalSupport,
  retainTemporalSupport,
  beginTemporalReceiptEpoch,
  clearTemporalCaptureReferences,
  captureTemporalReceiptPrefix,
  temporalReceiptWithinPrefix,
  retireTemporalChunks,
  materializeTemporalValue,
  temporalReceiptForRead,
  type TemporalValue,
  type TemporalValueReference,
  type TemporalFacetReference,
  type TemporalFragment,
} from './temporal-evidence.js';

function scene(seed = 41) {
  const world = createWorld(seed);
  const player = entityGet(world.entities, PLAYER_ID)!;
  const npc = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, worldSupport(player));
  setSpatialPosition(world, npc, { x: 3, y: 0, z: 2 }, worldSupport(npc));
  initializePerception(world, []);
  const key = Object.entries(world.perceptionEvidence![PLAYER_ID]!.attention!.candidates).find(
    ([, candidate]) => candidate.sourceId === NPC_ID,
  )![0];
  expect(setAttentionFocus(world, PLAYER_ID, [key])).toBe(true);
  return world;
}

it('binds history to the captured receipt prefix even when later measurements share its game time', () => {
  const world = scene(49),
    actorId = PLAYER_ID;
  const cut = captureTemporalReceiptPrefix(world, actorId);
  const prior = selectTemporalHistory(world.experience!.temporal, actorId, {
    cut,
    limit: 1000,
    bytes: 1024 * 1024,
  });
  const npc = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const later = selectTemporalHistory(world.experience!.temporal, actorId, {
    limit: 1000,
    bytes: 1024 * 1024,
  });
  expect(later.entries.some(({ receipt }) => !temporalReceiptWithinPrefix(receipt, cut))).toBe(
    true,
  );
  expect(
    selectTemporalHistory(world.experience!.temporal, actorId, {
      cut,
      limit: 1000,
      bytes: 1024 * 1024,
    }),
  ).toEqual(prior);
  beginTemporalReceiptEpoch(world, 'different-namespace');
  setSpatialPosition(world, npc, { x: 5, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const newCut = captureTemporalReceiptPrefix(world, actorId);
  const restoredStream = selectTemporalHistory(world.experience!.temporal, actorId, {
    cut: newCut,
    limit: 1000,
    bytes: 1024 * 1024,
  });
  expect(restoredStream.entries.some(({ receipt }) => receipt.epoch !== newCut.epoch)).toBe(true);
  expect(restoredStream.entries.some(({ receipt }) => receipt.epoch === newCut.epoch)).toBe(true);
  expect(
    selectTemporalHistory(world.experience!.temporal, actorId, {
      cut,
      limit: 1000,
      bytes: 1024 * 1024,
    }),
  ).toEqual(prior);
});

it('releases stale deduplication references without changing current sensory support', () => {
  const world = scene(),
    actor = world.experience!.temporal!.actors[PLAYER_ID]!;
  const current = currentBodyObservation(world, PLAYER_ID, NPC_ID)!;
  const references = Object.values(actor.captures);
  expect(references.length).toBeGreaterThan(0);
  const retired = new Set([references[0]!.blockId]);
  clearTemporalCaptureReferences(world, retired);
  expect(Object.values(actor.captures).every((reference) => !retired.has(reference.blockId))).toBe(
    true,
  );
  expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)!.id).toBe(current.id);
});

it('retains intermediate actually received movement and its exact last sample on loss', () => {
  const world = scene();
  const npc = entityGet(world.entities, NPC_ID)!;
  const exposure = currentBodyObservation(world, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  for (const [at, x] of [
    [1, 4],
    [2, 5],
  ] as const) {
    world.simTime = at;
    setSpatialPosition(world, npc, { x, y: 0, z: 2 }, worldSupport(npc), {
      continuity: 'physical',
    });
    initializePerception(world, []);
  }
  world.simTime = 3;
  setSpatialPosition(world, npc, { x: 100, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)).toBeUndefined();
  const selected = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    subject: exposure,
    from: 0,
    bytes: 1024 * 1024,
    limit: 1000,
  });
  const positions = selected.entries.flatMap(({ values }) =>
    values.flatMap((value) => (value.kind === 'body' ? [value.body.position.x] : [])),
  );
  expect(positions).toEqual(expect.arrayContaining([3, 4, 5]));
  const lostBody = selected.entries.find(
    ({ receipt, values }) =>
      receipt.change === 'loss' && values.some((value) => value.kind === 'body'),
  )!;
  expect(lostBody.receipt.at).toBe(3);
  expect(lostBody.receipt.facets[0]!.measuredThrough).toBe(2);
  expect(selected.incomplete).toBe(true);
});

it('keeps a lost unfamiliar deer separate from a different deer entering the same place', () => {
  const world = createWorld(84),
    player = entityGet(world.entities, PLAYER_ID)!,
    first = entityGet(world.entities, 'deer-1')!,
    second = structuredClone(first);
  second.id = 'different-unknown-deer';
  entitySet(world.entities, second.id, second);
  for (const entity of entityValues(world.entities))
    if (entity.id !== PLAYER_ID && entity.placement?.mode === 'world')
      setSpatialPosition(world, entity, { x: 100, y: 0, z: 100 }, 'terrain');
  setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, 'terrain');
  setSpatialPosition(world, first, { x: 3, y: 0, z: 2 }, 'terrain');
  player.actor!.attentionCapacity = 1;
  initializePerception(world, []);
  expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toContain(
    first.id,
  );
  const firstBody = currentBodyObservation(world, PLAYER_ID, first.id)!,
    firstSubject = currentBodyLocalSubject(world, PLAYER_ID, first.id)!;
  expect(firstSubject.kind).toBe('individual');
  world.simTime = 1;
  setSpatialPosition(world, first, { x: 100, y: 0, z: 100 }, 'terrain', { continuity: 'physical' });
  initializePerception(world, []);
  expect(currentBodyObservation(world, PLAYER_ID, first.id)).toBeUndefined();
  world.simTime = 2;
  setSpatialPosition(world, second, { x: 3, y: 0, z: 2 }, 'terrain', { continuity: 'physical' });
  initializePerception(world, []);
  const secondBody = currentBodyObservation(world, PLAYER_ID, second.id)!,
    secondSubject = currentBodyLocalSubject(world, PLAYER_ID, second.id)!;
  expect(secondBody.exposure.episodeId).not.toBe(firstBody.exposure.episodeId);
  expect(secondSubject.kind).toBe('individual');
  expect(secondSubject).not.toEqual(firstSubject);
  for (const subject of [firstSubject, secondSubject]) {
    if (subject.kind !== 'individual') throw new Error('Expected an unfamiliar animal.');
    const identity = world.observerIdentities![PLAYER_ID]![subject.individualId]!;
    expect(identity.givenName).toBe('');
    expect(identity.canonicalId).toBeUndefined();
  }
  const read = (subject: string) =>
    selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subject,
      limit: 1000,
      bytes: 1024 * 1024,
    });
  const oldHistory = read(firstBody.exposure.episodeId),
    newHistory = read(secondBody.exposure.episodeId);
  expect(oldHistory.entries.some(({ receipt }) => receipt.change === 'loss')).toBe(true);
  expect(oldHistory.entries.every(({ receipt }) => receipt.at <= 1)).toBe(true);
  expect(newHistory.entries.length).toBeGreaterThan(0);
  expect(newHistory.entries.every(({ receipt }) => receipt.at === 2)).toBe(true);
  expect(newHistory.entries.some(({ receipt }) => receipt.change === 'loss')).toBe(false);
  expect(oldHistory.incomplete).toBe(true);
  expect(newHistory.incomplete).toBe(false);
  validateTemporalEvidenceState(world);
  const restored = JSON.parse(JSON.stringify(world));
  expect(
    selectTemporalHistory(restored.experience.temporal, PLAYER_ID, {
      subject: firstBody.exposure.episodeId,
      limit: 1000,
      bytes: 1024 * 1024,
    }),
  ).toEqual(oldHistory);
});

it('distinguishes leaving attention, losing actual sight and no longer retaining the old sequence', () => {
  const world = createWorld(85),
    player = entityGet(world.entities, PLAYER_ID)!,
    npc = entityGet(world.entities, NPC_ID)!,
    branches = entityGet(world.entities, 'branches')!;
  for (const entity of entityValues(world.entities))
    if (entity.id !== PLAYER_ID && entity.placement?.mode === 'world')
      setSpatialPosition(world, entity, { x: 100, y: 0, z: 100 }, 'terrain');
  setSpatialPosition(world, player, { x: 1, y: 0, z: 2 }, 'terrain');
  setSpatialPosition(world, npc, { x: 3, y: 0, z: 2 }, 'terrain');
  player.actor!.attentionCapacity = 1;
  initializePerception(world, []);
  const subject = currentBodyObservation(world, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toEqual([
    NPC_ID,
  ]);
  acknowledgeAttention(world, PLAYER_ID, captureAttentionPresentation(world, PLAYER_ID));
  world.simTime = 1;
  setSpatialPosition(world, branches, { x: 1, y: 0, z: 4 }, 'terrain', { continuity: 'physical' });
  initializePerception(world, []);
  expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toEqual([
    branches.id,
  ]);
  const query = { subject, limit: 1000, bytes: 1024 * 1024 };
  const interrupted = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
  expect(interrupted.entries.some(({ receipt }) => receipt.change === 'attention-exit')).toBe(true);
  expect(interrupted.entries.some(({ receipt }) => receipt.change === 'loss')).toBe(false);
  expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)).toBeDefined();
  world.simTime = 2;
  player.actor!.attentionCapacity = 2;
  initializePerception(world, []);
  expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toContain(
    NPC_ID,
  );
  world.simTime = 3;
  setSpatialPosition(world, npc, { x: 100, y: 0, z: 100 }, 'terrain', { continuity: 'physical' });
  initializePerception(world, []);
  expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)).toBeUndefined();
  const lost = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
  const loss = lost.entries.find(({ receipt }) => receipt.change === 'loss');
  expect(loss).toBeDefined();
  expect(loss!.receipt.at).toBe(3);
  expect(loss!.receipt.facets.some((facet) => facet.measuredThrough < 3)).toBe(true);
  expect(lost.entries.some(({ receipt }) => receipt.change === 'attention-exit')).toBe(true);
  world.simTime += selectedTemporalPolicy(world).recent.maxAgeSeconds + 1;
  const actor = world.experience!.temporal!.actors[PLAYER_ID]!,
    retired = [...actor.chunks];
  retireTemporalChunks(
    world,
    PLAYER_ID,
    retired.map((chunk) => chunk.id),
    {
      bytes: retired.reduce((sum, chunk) => sum + chunk.bytes, 0),
      count: retired.reduce((sum, chunk) => sum + chunk.count, 0),
    },
    null,
    Math.max(...retired.map((chunk) => chunk.throughAt)),
  );
  const expired = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
  expect(expired.entries).toEqual([]);
  expect(expired.incomplete).toBe(true);
  expect(expired.hasMore).toBe(false);
  expect(currentBodyObservation(world, PLAYER_ID, branches.id)).toBeDefined();
});

it('keeps the original exact received sequence through current-format JSON restoration', () => {
  const world = scene(42);
  world.simTime = 1;
  const npc = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const before = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  });
  const restored = JSON.parse(JSON.stringify(world));
  expect(
    selectTemporalHistory(restored.experience.temporal, PLAYER_ID, {
      bytes: 1024 * 1024,
      limit: 1000,
    }),
  ).toEqual(before);
  const count = restored.experience.temporal.actors[PLAYER_ID].count;
  expect(restored.experience.temporal.actors[PLAYER_ID].count).toBe(count);
});

it('keeps mutable nested received values fresh while reusing immutable values with exact byte charges', () => {
  const world = scene(52);
  const nested = { note: 'Before: café and 鹿.' };
  const supplied = Object.freeze({
    kind: 'personal-account' as const,
    source: 'memory' as const,
    id: 'received-note',
    text: 'An actually received note.',
    data: { nested },
  });
  const append = (value: TemporalValue, retainedValue?: TemporalValueReference) => {
    appendTemporalReceipt(
      world,
      PLAYER_ID,
      {
        subject: value.kind === 'personal-account' ? value.id : 'received-note',
        change: 'change',
        facets: [
          {
            value,
            role: 'direct',
            asOf: world.simTime,
            measuredFrom: world.simTime,
            measuredThrough: world.simTime,
            acquiredAt: world.simTime,
            ...(retainedValue ? { retainedValue } : {}),
          },
        ],
      },
      selectedTemporalPolicy(world).recent,
    );
    return world.experience!.temporal!.actors[PLAYER_ID]!.chunks.at(-1)!.receipts.at(-1)!
      .facets[0]!;
  };
  const before = append(supplied);
  nested.note = 'After: a longer note about 鹿.';
  const after = append(supplied, before);
  expect(after.valueOrdinal).not.toBe(before.valueOrdinal);
  const sealed = freeze({ ...supplied, data: { nested: { ...nested } } }, true);
  const repeated = append(sealed, after);
  expect(repeated).toMatchObject({
    blockId: after.blockId,
    valueOrdinal: after.valueOrdinal,
  });
  const query = { subject: 'received-note', bytes: 1024 * 1024, limit: 1000 };
  const selected = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, query);
  expect(
    selected.entries.flatMap(({ values }) =>
      values.map((value) => value.kind === 'personal-account' && value.data?.['nested']),
    ),
  ).toEqual([{ note: 'Before: café and 鹿.' }, { ...nested }, { ...nested }]);
  const child = { note: 'Before an array edit.' };
  const array = [child];
  Object.defineProperty(array, '0', { enumerable: false });
  Object.freeze(array);
  const arrayValue = Object.freeze({
    ...supplied,
    id: 'received-array',
    data: Object.freeze({ array }),
  });
  const arrayBefore = append(arrayValue);
  child.note = 'After an array edit.';
  expect(append(arrayValue, arrayBefore).valueOrdinal).not.toBe(arrayBefore.valueOrdinal);
  expect(
    selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      ...query,
      subject: 'received-array',
    }).entries.flatMap(({ values }) =>
      values.map((value) => value.kind === 'personal-account' && value.data?.['array']),
    ),
  ).toEqual([[{ note: 'Before an array edit.' }], [{ note: 'After an array edit.' }]]);
  validateTemporalEvidenceState(world);
  const restored = JSON.parse(JSON.stringify(world));
  validateTemporalEvidenceState(restored);
  expect(selectTemporalHistory(restored.experience.temporal, PLAYER_ID, query)).toEqual(selected);
});

it('does not turn ordinary lost object facets into autobiographical confirmations', () => {
  const world = scene(43);
  const before = (world.memories[PLAYER_ID] ?? []).filter((record) =>
    record.summary.startsWith('Last confirmed:'),
  ).length;
  const player = entityGet(world.entities, PLAYER_ID)!;
  world.simTime = 1;
  setSpatialPosition(world, player, { x: 100, y: 0, z: 100 }, worldSupport(player));
  initializePerception(world, []);
  expect(
    (world.memories[PLAYER_ID] ?? []).filter((record) =>
      record.summary.startsWith('Last confirmed:'),
    ),
  ).toHaveLength(before);
});

it('retains received speech independently of optional detailed attention and revokes its history by source', () => {
  let world = scene(44);
  const spoken = executeCommand(world, {
    id: 'temporal-test-speech',
    type: 'say',
    actorId: NPC_ID,
    volume: 'normal',
    text: 'The gate is open.',
  });
  expect(spoken.outcome.ok).toBe(true);
  world = JSON.parse(JSON.stringify(spoken.world));
  const event = spoken.events.find((entry) => entry.type === 'speech')!;
  const before = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  });
  const heard = before.entries.find(
    ({ receipt, values }) =>
      receipt.sourceIds.includes(event.id) && values.some((value) => value.kind === 'speech'),
  )!;
  expect(heard.receipt.required).toBe(true);
  expect(
    heard.values.some(
      (value) =>
        value.kind === 'speech' &&
        value.speech.segments.some(
          (segment) => segment.kind === 'heard' && segment.text.includes('gate'),
        ),
    ),
  ).toBe(true);
  invalidateExperience(world, PLAYER_ID, [event.id], true);
  const after = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  });
  expect(after.entries.some(({ receipt }) => receipt.sourceIds.includes(event.id))).toBe(false);
  expect(after.entries.some(({ receipt }) => !receipt.sourceIds.includes(event.id))).toBe(true);
});

it('records an actually attended resource target and a routine occurrence that draws its performer into attention', () => {
  const world = scene(53);
  const player = entityGet(world.entities, PLAYER_ID)!;
  player.actor!.attentionCapacity = 1;
  const branches = entityGet(world.entities, 'branches')!;
  branches.resource!.workSeconds = 1;
  setSpatialPosition(world, branches, { x: 4, y: 0, z: 2 }, 'terrain');
  initializePerception(world, []);
  const attention = world.perceptionEvidence![PLAYER_ID]!.attention!;
  acknowledgeAttention(
    world,
    PLAYER_ID,
    captureAttentionPresentation(world, PLAYER_ID, Object.keys(attention.candidates)),
  );
  const keys = [
    Object.entries(attention.candidates).find(([, value]) => value.sourceId === branches.id)![0],
  ];
  expect(setAttentionFocus(world, PLAYER_ID, keys)).toBe(true);
  world.simTime = 10;
  branches.description = 'Newly exposed branches beside the path.';
  initializePerception(world, []);
  expect(
    currentDetailedAttention(world, PLAYER_ID).some((entry) => entry.sourceId === branches.id),
  ).toBe(true);
  expect(
    currentDetailedAttention(world, PLAYER_ID).some((entry) => entry.sourceId === NPC_ID),
    JSON.stringify(
      currentDetailedAttention(world, PLAYER_ID).map((entry) => ({
        source: entry.sourceId,
        basis: entry.basis,
        score: attention.candidates[entry.key]?.score,
        urgency: attention.candidates[entry.key]?.urgency,
      })),
    ),
  ).toBe(false);
  const exposure = currentBodyObservation(world, PLAYER_ID, branches.id)!.exposure.episodeId;
  const started = executeCommand(world, {
    id: 'attended-target-gather',
    actorId: NPC_ID,
    type: 'gather',
    targetId: branches.id,
  });
  expect(started.outcome.ok, started.outcome.message).toBe(true);
  const result = advanceWorld(started.world, 2);
  const event = result.events.find(
    (event) => event.type === 'gathered' && event.actorId === NPC_ID,
  )!;
  expect(event.targetId).toBe(branches.id);
  expect(event.data).toMatchObject({ definitionId: 'wood', quantity: 1 });
  const selected = selectTemporalHistory(result.world.experience!.temporal, PLAYER_ID, {
    subjects: [exposure],
    bytes: 1024 * 1024,
    limit: 1000,
  });
  const received = selected.entries.find(({ receipt }) => receipt.sourceIds.includes(event.id))!;
  expect(received).toBeDefined();
  expect(received.receipt.contextSubjects).toContain(exposure);
  expect(
    result.world.experience!.awareness[PLAYER_ID]!.some((value) => value.eventId === event.id),
  ).toBe(false);
  const later = structuredClone(result.world);
  acknowledgeAttention(
    later,
    PLAYER_ID,
    captureAttentionPresentation(
      later,
      PLAYER_ID,
      Object.keys(later.perceptionEvidence![PLAYER_ID]!.attention!.candidates),
    ),
  );
  expect(currentDetailedAttention(later, PLAYER_ID).map((entry) => entry.sourceId)).toEqual([
    branches.id,
  ]);
  const personExposure = currentBodyObservation(later, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  later.simTime = 20;
  const nativeEvents: WorldEvent[] = [];
  const performer = entityGet(later.entities, NPC_ID)!;
  // An authored native occurrence supplies urgency, without an authored Awareness
  // or a lasting-policy override. The real receiver and recorder do the rest.
  const routine = emit(
    later,
    nativeEvents,
    'routine-fixture-gesture',
    subjectNarration(performer, 'makes a sudden visible gesture.'),
    performer,
    undefined,
    { urgency: 8 },
  );
  expect(
    currentDetailedAttention(later, PLAYER_ID).some((value) => value.sourceId === NPC_ID),
  ).toBe(true);
  expect(
    later.experience!.awareness[PLAYER_ID]!.some((value) => value.eventId === routine.id),
  ).toBe(false);
  expect(
    selectTemporalHistory(later.experience!.temporal, PLAYER_ID, {
      subjects: [personExposure],
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.some(({ receipt }) => receipt.sourceIds.includes(routine.id)),
  ).toBe(true);
  validatePerceptionEvidenceState(JSON.parse(JSON.stringify(later)));
  const forgotten = structuredClone(result.world);
  invalidateExperience(forgotten, PLAYER_ID, [event.id], true);
  expect(
    selectTemporalHistory(forgotten.experience!.temporal, PLAYER_ID, {
      subjects: [exposure],
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.some(({ receipt }) => receipt.sourceIds.includes(event.id)),
  ).toBe(false);
});

it('captures an attended person recipient while the actually visible speaker is unattended', () => {
  const world = scene(55);
  const speaker = entityGet(world.entities, 'mara')!;
  setSpatialPosition(world, speaker, { x: 4, y: 0, z: 2 }, 'terrain');
  initializePerception(world, []);
  const attention = world.perceptionEvidence![PLAYER_ID]!.attention!;
  acknowledgeAttention(
    world,
    PLAYER_ID,
    captureAttentionPresentation(world, PLAYER_ID, Object.keys(attention.candidates)),
  );
  entityGet(world.entities, PLAYER_ID)!.actor!.attentionCapacity = 1;
  expect(setAttentionFocus(world, PLAYER_ID, [])).toBe(true);
  const recipient = Object.entries(attention.candidates).find(
    ([, candidate]) => candidate.sourceId === NPC_ID,
  )![0];
  expect(setAttentionFocus(world, PLAYER_ID, [recipient])).toBe(true);
  expect(currentDetailedAttention(world, PLAYER_ID).map((entry) => entry.sourceId)).toEqual([
    NPC_ID,
  ]);
  const exposure = currentBodyObservation(world, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  expect(currentBodyObservation(world, PLAYER_ID, speaker.id)).toBeDefined();
  const result = executeCommand(world, {
    id: 'addressed-attended-person',
    actorId: speaker.id,
    type: 'say',
    targetId: NPC_ID,
    text: 'Please wait here.',
  });
  expect(result.outcome.ok).toBe(true);
  const event = result.events.find((event) => event.type === 'speech')!;
  const observation = result.world.experience!.awareness[PLAYER_ID]!.find(
    (entry) => entry.eventId === event.id,
  )!.observation!;
  expect(observation.context?.attended).toBe(true);
  const invalid = structuredClone(observation);
  invalid.context!.subjects[0]!.observer.physicalLife++;
  expect(() => validateObservationContribution(invalid)).toThrow(
    'Invalid received occurrence context',
  );
  expect(observation.context?.subjects.some((subject) => subject.episodeId === exposure)).toBe(
    true,
  );
  expect(
    selectTemporalHistory(result.world.experience!.temporal, PLAYER_ID, {
      subjects: [exposure],
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.some(({ receipt }) => receipt.sourceIds.includes(event.id)),
  ).toBe(true);
  validatePerceptionEvidenceState(JSON.parse(JSON.stringify(result.world)));
});

it('keeps an actually heard unseen voice separate from a previously seen body', () => {
  let world = scene(54);
  const exposure = currentBodyObservation(world, PLAYER_ID, NPC_ID)!.exposure.episodeId;
  entityGet(world.entities, NPC_ID)!.appearance = entityGet(world.entities, 'branches')!.appearance;
  initializePerception(world, []);
  const visible = executeCommand(world, {
    id: 'changed-appearance-context',
    actorId: NPC_ID,
    type: 'say',
    text: 'Still visibly speaking here.',
  });
  expect(visible.outcome.ok).toBe(true);
  const visibleEvent = visible.events.find((event) => event.type === 'speech')!;
  expect(
    visible.world
      .experience!.awareness[PLAYER_ID]!.find((entry) => entry.eventId === visibleEvent.id)!
      .observation!.context!.subjects.map((subject) => subject.episodeId),
  ).toContain(exposure);
  world = structuredClone(visible.world);
  world.map.spatial.blockers.push({
    id: 'voice-without-body',
    bounds: { min: { x: 1.9, y: 0, z: 1 }, max: { x: 2.1, y: 3, z: 3 } },
    movement: false,
    sight: true,
    acousticTransmission: 1,
    material: 'cloth',
  });
  world.map.spatial.revision++;
  world.simTime = 1;
  initializePerception(world, []);
  expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)).toBeUndefined();
  const result = executeCommand(world, {
    id: 'unseen-context-words',
    actorId: NPC_ID,
    type: 'say',
    text: 'These words are audible behind the screen.',
  });
  expect(result.outcome.ok).toBe(true);
  world = result.world;
  const event = result.events.find((event) => event.type === 'speech')!;
  const heard = world.experience!.awareness[PLAYER_ID]!.find(
    (entry) => entry.eventId === event.id,
  )!;
  expect(heard.speech!.segments.some((segment) => segment.kind === 'heard')).toBe(true);
  expect(heard.sourceBody).toBeUndefined();
  expect(heard.observation!.context).toBeUndefined();
  expect(
    selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.some(({ receipt }) => receipt.sourceIds.includes(event.id)),
  ).toBe(true);
  expect(
    selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
      subjects: [exposure],
      bytes: 1024 * 1024,
      limit: 1000,
    }).entries.some(({ receipt }) => receipt.sourceIds.includes(event.id)),
  ).toBe(false);
});

it('retains only the exact qualifying contact capsule when familiarity uses a temporal source', () => {
  const world = scene(45);
  const supports = Object.values(world.experience!.temporal!.actors[PLAYER_ID]!.supports ?? {});
  expect(supports.length).toBeGreaterThan(0);
  const support = supports[0]!;
  expect(support.receipt.facets).toHaveLength(1);
  expect(support.values[0]!.kind).toBe('body');
  expect(
    retainedTemporalSupport(
      world.experience!.temporal,
      PLAYER_ID,
      temporalReceiptSource(support.receipt),
    ),
  ).toEqual(support);
  expect(
    retainedTemporalSupport(
      world.experience!.temporal,
      NPC_ID,
      temporalReceiptSource(support.receipt),
    ),
  ).toBeUndefined();
  const temporal = world.experience!.temporal!;
  const actor = temporal.actors[PLAYER_ID]!;
  const original = actor.chunks
    .flatMap((chunk) => chunk.receipts)
    .find((receipt) => receipt.id === support.receipt.id)!;
  const location = original.facets.find(
    (facet) => temporal.sources[facet.blockId]!.values[facet.valueOrdinal]!.kind === 'location',
  )!;
  const before = { ...actor.accounts!.optional };
  const extended = retainTemporalSupport(world, support.receipt, {
    facetOrdinals: [location.ordinal],
    maxBytes: 4 * 1024 * 1024,
    maxRecords: 2048,
  })!;
  expect(extended.values.map((value) => value.kind)).toEqual(
    expect.arrayContaining(['body', 'location']),
  );
  expect(actor.accounts!.optional.count).toBe(before.count);
  expect(actor.accounts!.optional.bytes).toBe(before.bytes - support.bytes + extended.bytes);
  expect(
    retainTemporalSupport(world, support.receipt, {
      facetOrdinals: [9999],
      maxBytes: 4 * 1024 * 1024,
      maxRecords: 2048,
    }),
  ).toBeUndefined();
});

it('shares equal received values without granting another observer the earlier history', () => {
  const world = scene(46);
  const player = entityGet(world.entities, PLAYER_ID)!;
  const npc = entityGet(world.entities, NPC_ID)!;
  player.actor!.attentionCapacity = 5;
  npc.actor!.attentionCapacity = 5;
  const focus = (observer: string, target: string) => {
    const key = Object.entries(world.perceptionEvidence![observer]!.attention!.candidates).find(
      ([, candidate]) => candidate.sourceId === target,
    )![0];
    expect(setAttentionFocus(world, observer, [key])).toBe(true);
  };
  focus(PLAYER_ID, 'branches');
  focus(NPC_ID, PLAYER_ID);
  const branches = entityGet(world.entities, 'branches')!;
  world.simTime = 1;
  setSpatialPosition(world, branches, { x: 2, y: 0, z: 2 }, worldSupport(branches), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const exposure = currentBodyObservation(world, NPC_ID, 'branches')!.exposure.episodeId;
  expect(
    selectTemporalHistory(world.experience!.temporal, NPC_ID, {
      subject: exposure,
      from: 1,
      bytes: 1024 * 1024,
    }).entries,
  ).toEqual([]);
  world.simTime = 2;
  focus(NPC_ID, 'branches');
  const promoted = selectTemporalHistory(world.experience!.temporal, NPC_ID, {
    subject: exposure,
    from: 1,
    bytes: 1024 * 1024,
  });
  expect(promoted.entries.length).toBeGreaterThan(0);
  expect(promoted.entries.every(({ receipt }) => receipt.at === 2)).toBe(true);
  const playerExposure = currentBodyObservation(world, PLAYER_ID, 'branches')!.exposure.episodeId;
  const playerHistory = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    subject: playerExposure,
    from: 1,
    bytes: 1024 * 1024,
  });
  const bodyReference = (entries: typeof promoted.entries) =>
    entries
      .flatMap(({ receipt, values }) =>
        values.flatMap((value, index) => (value.kind === 'body' ? [receipt.facets[index]!] : [])),
      )
      .at(-1)!;
  const bodyValue = (reference: ReturnType<typeof bodyReference>) =>
    world.experience!.temporal!.sources[reference.blockId]!.values[reference.valueOrdinal];
  expect(bodyValue(bodyReference(promoted.entries))).toEqual(
    bodyValue(bodyReference(playerHistory.entries)),
  );
  // Two actual recipients of the same changed value share this append's payload.
  // A later attention entry still has its own recording time and no earlier route.
  world.simTime = 3;
  setSpatialPosition(world, branches, { x: 2.5, y: 0, z: 2 }, worldSupport(branches), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const currentBodyReference = (actorId: string, subject: string) =>
    bodyReference(
      selectTemporalHistory(world.experience!.temporal, actorId, {
        subject,
        from: 3,
        bytes: 1024 * 1024,
      }).entries,
    );
  expect(currentBodyReference(NPC_ID, exposure)).toMatchObject({
    blockId: currentBodyReference(PLAYER_ID, playerExposure).blockId,
    valueOrdinal: currentBodyReference(PLAYER_ID, playerExposure).valueOrdinal,
  });
  const encoded = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const completeValue = (reference: TemporalFacetReference, fragment: TemporalFragment) => {
    const value = materializeTemporalValue(reference, fragment);
    expect(value).toBeDefined();
    return value;
  };
  for (const block of Object.values(world.experience!.temporal!.sources))
    expect(block.bytes).toBe(encoded(block));
  for (const actor of Object.values(world.experience!.temporal!.actors)) {
    for (const chunk of actor.chunks) {
      const supportBytes = chunk.receipts.reduce(
        (sum, receipt) =>
          sum +
          receipt.facets.reduce(
            (n, reference) =>
              n +
              encoded(
                completeValue(
                  reference,
                  world.experience!.temporal!.sources[reference.blockId]!.values[
                    reference.valueOrdinal
                  ]!,
                ),
              ),
            0,
          ),
        0,
      );
      expect(chunk.bytes).toBe(
        encoded({ ...chunk, receipts: chunk.receipts.map(temporalReceiptForRead) }) + supportBytes,
      );
    }
    for (const capsule of Object.values(actor.supports ?? {}))
      expect(capsule.bytes).toBe(
        encoded({
          ...capsule,
          receipt: temporalReceiptForRead(capsule.receipt),
          values: capsule.values.map((value, index) =>
            completeValue(capsule.receipt.facets[index]!, value),
          ),
        }),
      );
  }
});

it('reports an empty change window as unavailable without renewing an older acquisition', () => {
  const world = scene(47);
  const before = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  });
  world.simTime = 60;
  const empty = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    from: 1,
    through: 60,
  });
  expect(empty.entries).toEqual([]);
  expect(empty.incomplete).toBe(true);
  const held = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  });
  expect(held).toEqual(before);
  expect(held.entries.every(({ receipt }) => receipt.at === 0)).toBe(true);
  expect(
    held.entries.flatMap(({ receipt }) => receipt.facets).every((facet) => facet.acquiredAt === 0),
  ).toBe(true);
});

it('confirms unchanged sight without rewriting every detail and freezes the last actual sample on loss', () => {
  const world = scene(49);
  const raw = world.perceptionEvidence![PLAYER_ID]!.current[`${NPC_ID}:body`]!;
  const originalTime = raw.valueMeasuredThrough;
  for (const at of [1, 2, 3]) {
    world.simTime = at;
    initializePerception(world, []);
    expect(currentBodyObservation(world, PLAYER_ID, NPC_ID)!.valueMeasuredThrough).toBe(at);
  }
  expect(
    world.perceptionEvidence![PLAYER_ID]!.current[`${NPC_ID}:body`]!.valueMeasuredThrough,
  ).toBe(originalTime);
  const cut = captureEvidenceCut(world, PLAYER_ID);
  const location = currentObservedFacets(world, PLAYER_ID, NPC_ID).find(
    (f) => f.value.kind === 'location',
  )!;
  expect(location.valueMeasuredFrom).toBe(3);
  const npc = entityGet(world.entities, NPC_ID)!;
  world.simTime = 4;
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const motion = currentObservedFacets(world, PLAYER_ID, NPC_ID).find(
    (f) => f.value.kind === 'observed-motion',
  )!;
  expect(motion.value.kind === 'observed-motion' && motion.value.earlier.valueMeasuredThrough).toBe(
    3,
  );
  expect(
    cut.current.find(
      (f) => f.exposure.episodeId === raw.exposure.episodeId && f.value.kind === 'body',
    )!.valueMeasuredThrough,
  ).toBe(3);
  world.simTime = 5;
  setSpatialPosition(world, npc, { x: 100, y: 0, z: 2 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(world, []);
  const losses = selectTemporalHistory(world.experience!.temporal, PLAYER_ID, {
    bytes: 1024 * 1024,
    limit: 1000,
  }).entries.filter(
    ({ receipt, values }) => receipt.change === 'loss' && values.some((v) => v.kind === 'body'),
  );
  expect(losses.at(-1)!.receipt.facets[0]!.measuredThrough).toBe(4);
  validatePerceptionEvidenceState(JSON.parse(JSON.stringify(world)));
});

it('keeps same-time receipt chronology ordered across independently named restore epochs', () => {
  let world = scene(48);
  beginTemporalReceiptEpoch(world, 'zzz-restored-timeline');
  const first = executeCommand(world, {
    id: 'epoch-first',
    type: 'say',
    actorId: NPC_ID,
    volume: 'normal',
    text: 'First actual words.',
  });
  world = JSON.parse(JSON.stringify(first.world));
  beginTemporalReceiptEpoch(world, 'aaa-newer-timeline');
  const second = executeCommand(world, {
    id: 'epoch-second',
    type: 'say',
    actorId: NPC_ID,
    volume: 'normal',
    text: 'Second actual words.',
  });
  const event = second.events.find((value) => value.type === 'speech')!;
  const latest = selectTemporalHistory(second.world.experience!.temporal, PLAYER_ID, {
    limit: 1,
    bytes: 1024 * 1024,
  });
  expect(latest.entries).toHaveLength(1);
  const receipt = latest.entries[0]!.receipt;
  expect(receipt.sourceIds).toContain(event.id);
  expect(receipt.epoch.startsWith('aaa-newer-timeline')).toBe(true);
  const preceding = selectTemporalHistory(second.world.experience!.temporal, PLAYER_ID, {
    before: {
      at: receipt.at,
      order: receipt.order,
      epoch: receipt.epoch,
      ordinal: receipt.ordinal,
    },
    limit: 1000,
    bytes: 1024 * 1024,
  });
  expect(
    preceding.entries.some(({ receipt }) => receipt.epoch.startsWith('zzz-restored-timeline')),
  ).toBe(true);
  expect(preceding.entries.every((entry) => entry.receipt.id !== receipt.id)).toBe(true);
});
