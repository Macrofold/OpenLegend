import { createDraft, finishDraft } from 'immer';
import { describe, expect, it } from 'vitest';
import { cloneValue, readOnlyDraftView } from './draft.js';

// Protect the shared copy contract without depending on world content or event wording.
describe('independent domain data copies', () => {
  it('preserves nested values while isolating writes in both directions', () => {
    const source = { records: [{ amount: 3, details: { seen: true } }], label: null };
    const copy = cloneValue(source);
    expect(copy).toEqual(source);

    copy.records[0]!.amount = 9;
    source.records[0]!.details.seen = false;
    expect(source.records[0]!.amount).toBe(3);
    expect(copy.records[0]!.details.seen).toBe(true);
  });

  it('keeps a JSON prototype-shaped key as independent data', () => {
    const source = JSON.parse('{"__proto__":{"privateValue":7},"value":1}') as {
      __proto__: { privateValue: number };
      value: number;
    };
    const copy = cloneValue(source);

    expect(Object.getPrototypeOf(copy)).toBe(Object.prototype);
    expect(Object.hasOwn(copy, '__proto__')).toBe(true);
    expect(Object.hasOwn(copy, 'privateValue')).toBe(false);
    expect(copy.__proto__).toEqual({ privateValue: 7 });
    copy.__proto__.privateValue = 8;
    expect(source.__proto__.privateValue).toBe(7);
  });

  it('preserves array holes, length and explicitly present undefined values', () => {
    const source: ({ amount: number } | undefined)[] = new Array(4);
    source[1] = undefined;
    source[3] = { amount: 2 };
    const copy = cloneValue(source);

    expect(copy).toHaveLength(4);
    expect(0 in copy).toBe(false);
    expect(1 in copy).toBe(true);
    expect(2 in copy).toBe(false);
    copy[3]!.amount = 5;
    expect(source[3]!.amount).toBe(2);
  });

  it('reuses unchanged data after child inspection and sees later draft writes', () => {
    const source = { records: [{ amount: 2 }] },
      draft = createDraft(source);
    void draft.records[0];
    expect(readOnlyDraftView(draft)).toBe(source);
    draft.records[0]!.amount = 3;
    expect(readOnlyDraftView(draft).records[0]!.amount).toBe(3);
    expect(source.records[0]!.amount).toBe(2);
    finishDraft(draft);
  });

  it('copies nested draft values that remain usable after the draft is finished', () => {
    const source = { records: [{ amount: 2 }] };
    const draft = createDraft(source);
    draft.records[0]!.amount = 3;
    const copy = cloneValue({ record: draft.records[0]!, records: draft.records });
    draft.records[0]!.amount = 4;
    const published = finishDraft(draft);

    expect(copy.record.amount).toBe(3);
    expect(copy.records[0]!.amount).toBe(3);
    copy.record.amount = 8;
    expect(published.records[0]!.amount).toBe(4);
    expect(source.records[0]!.amount).toBe(2);
  });
});

import { createWorld, PLAYER_ID, NPC_ID } from './data.js';
import { entityGet } from './entity-collection.js';
import { freezeWorld, updateWorld, draftWorld, finishWorld } from './draft.js';
import { initializePerception } from './kernel.js';
import { setSpatialPosition, worldSupport } from './spatial-state.js';
it('seals recent observations before nested native preparation and isolates both continuations', () => {
  const initial = createWorld(74);
  initializePerception(initial, []);
  freezeWorld(initial);
  const before = JSON.stringify(initial.experience!.temporal);
  const outer = draftWorld(initial);
  outer.simTime = 1;
  const npc = entityGet(outer.entities, NPC_ID)!;
  setSpatialPosition(outer, npc, { x: 14, y: 0, z: 15 }, worldSupport(npc), {
    continuity: 'physical',
  });
  initializePerception(outer, []);
  const nested = draftWorld(outer);
  const sealed = readOnlyDraftView(outer.experience!.temporal!);
  expect(Object.isFrozen(sealed)).toBe(true);
  const captured = JSON.stringify(sealed);
  nested.simTime = 2;
  setSpatialPosition(
    nested,
    entityGet(nested.entities, NPC_ID)!,
    { x: 15, y: 0, z: 15 },
    worldSupport(npc),
    { continuity: 'physical' },
  );
  initializePerception(nested, []);
  finishWorld(nested);
  expect(JSON.stringify(sealed)).toBe(captured);
  expect(JSON.stringify(initial.experience!.temporal)).toBe(before);
  expect(JSON.stringify(finishWorld(outer).experience!.temporal)).toBe(captured);
});
it('seals shared received evidence once while preserving earlier immutable snapshots', () => {
  const initial = createWorld(73);
  initializePerception(initial, []);
  freezeWorld(initial);
  const before = JSON.stringify(initial.perceptionEvidence);
  const changed = updateWorld(initial, (world) => {
    const owner = world.perceptionEvidence![PLAYER_ID]!;
    const lease = Object.values(owner.current).find((value) => value.subjectId === NPC_ID)!;
    lease.confirmedThrough += 1;
  });
  expect(JSON.stringify(initial.perceptionEvidence)).toBe(before);
  expect(changed.perceptionEvidence).not.toBe(initial.perceptionEvidence);
  const owner = changed.perceptionEvidence![PLAYER_ID]!;
  expect(Object.isFrozen(owner)).toBe(true);
  const leases = Object.values(owner.current).filter((value) => value.subjectId === NPC_ID);
  expect(leases.length).toBeGreaterThan(1);
  expect(leases[0]!.original).toBe(leases[1]!.original);
  const nested = draftWorld(changed);
  entityGet(nested.entities, PLAYER_ID)!.actor!.agency.revision++;
  expect(finishWorld(nested).perceptionEvidence).toBe(changed.perceptionEvidence);
});
