import { createDraft, finishDraft } from 'immer';
import { describe, expect, it } from 'vitest';
import { cloneValue } from './draft.js';

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
