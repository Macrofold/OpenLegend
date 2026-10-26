import { expect, it } from 'vitest';
import { createWorld, NPC_ID, PLAYER_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { initializePerception, executeCommand } from './kernel.js';
import { setSpatialPosition, worldSupport } from './spatial-state.js';
import { setAttentionFocus } from './attention.js';
import {
  currentBodyObservation,
  currentObservedFacets,
  captureEvidenceCut,
  validatePerceptionEvidenceState,
} from './perception-evidence.js';
import { invalidateExperience } from './experience.js';
import {
  selectTemporalHistory,
  temporalReceiptSource,
  retainedTemporalSupport,
  retainTemporalSupport,
  beginTemporalReceiptEpoch,
  clearTemporalCaptureReferences,
  captureTemporalReceiptPrefix,
  temporalReceiptWithinPrefix,
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
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), 'physical');
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
  setSpatialPosition(world, npc, { x: 5, y: 0, z: 2 }, worldSupport(npc), 'physical');
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
    setSpatialPosition(world, npc, { x, y: 0, z: 2 }, worldSupport(npc), 'physical');
    initializePerception(world, []);
  }
  world.simTime = 3;
  setSpatialPosition(world, npc, { x: 100, y: 0, z: 2 }, worldSupport(npc), 'physical');
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

it('keeps the original exact received sequence through current-format JSON restoration', () => {
  const world = scene(42);
  world.simTime = 1;
  const npc = entityGet(world.entities, NPC_ID)!;
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), 'physical');
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
  setSpatialPosition(world, branches, { x: 2, y: 0, z: 2 }, worldSupport(branches), 'physical');
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
  expect(bodyReference(promoted.entries)).toMatchObject({
    blockId: bodyReference(playerHistory.entries).blockId,
    valueOrdinal: bodyReference(playerHistory.entries).valueOrdinal,
  });
  const encoded = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
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
                world.experience!.temporal!.sources[reference.blockId]!.values[
                  reference.valueOrdinal
                ],
              ),
            0,
          ),
        0,
      );
      expect(chunk.bytes).toBe(encoded(chunk) + supportBytes);
    }
    for (const capsule of Object.values(actor.supports ?? {}))
      expect(capsule.bytes).toBe(encoded(capsule));
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
  setSpatialPosition(world, npc, { x: 4, y: 0, z: 2 }, worldSupport(npc), 'physical');
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
  setSpatialPosition(world, npc, { x: 100, y: 0, z: 2 }, worldSupport(npc), 'physical');
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
