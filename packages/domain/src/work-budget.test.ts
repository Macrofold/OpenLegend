import { describe, expect, it } from 'vitest';
import {
  chargeWork,
  inWorkGroup,
  meteredIterator,
  withWorkMeter,
  WorkBudgetError,
} from './work-budget.js';

// These are computation-accounting contracts, not assertions about current gameplay limits.
describe('nested native computation limits', () => {
  it('charges child work to its parent without leaking a failed charge', () => {
    withWorkMeter({ tests: 3 }, () => {
      chargeWork({ tests: 1 });
      withWorkMeter({ tests: 3 }, () => {
        expect(() => chargeWork({ tests: 3 })).toThrow(WorkBudgetError);
        chargeWork({ tests: 2 });
      });
      expect(() => chargeWork({ tests: 1 })).toThrow(WorkBudgetError);
    });
    expect(inWorkGroup()).toBe(false);
  });

  it('refuses an entire multi-counter charge before spending any allowance', () => {
    withWorkMeter({ candidates: 2, tests: 1 }, () => {
      expect(() => chargeWork({ candidates: 2, tests: 2 })).toThrow(WorkBudgetError);
      chargeWork({ candidates: 2, tests: 1 });
      expect(() => chargeWork({ candidates: 1 })).toThrow(WorkBudgetError);
    });
  });

  it('restores the parent allowance after a child throws', () => {
    withWorkMeter({ tests: 2 }, () => {
      expect(() =>
        withWorkMeter({ tests: 1 }, () => {
          chargeWork({ tests: 1 });
          throw new Error('operation stopped');
        }),
      ).toThrow('operation stopped');
      chargeWork({ tests: 1 });
      expect(() => chargeWork({ tests: 1 })).toThrow(WorkBudgetError);
    });
    expect(inWorkGroup()).toBe(false);
    expect(() => withWorkMeter({ tests: 1 }, () => chargeWork({ tests: 1 }))).not.toThrow();
  });

  it('retains spent allowance across yields and restores the caller after failure', () => {
    function* operation() {
      chargeWork({ tests: 1 });
      yield 'waiting';
      chargeWork({ tests: 1 });
      yield 'waiting again';
      chargeWork({ tests: 1 });
    }
    const work = meteredIterator({ tests: 2 }, operation());
    expect(work.next()).toEqual({ value: 'waiting', done: false });
    expect(inWorkGroup()).toBe(false);
    expect(work.next()).toEqual({ value: 'waiting again', done: false });
    expect(() => work.next()).toThrow(WorkBudgetError);
    expect(inWorkGroup()).toBe(false);
  });

  it('rejects resume under another owner without consuming the pending step', () => {
    function* operation() {
      chargeWork({ tests: 1 });
      return 'complete';
    }
    const work = meteredIterator({ tests: 1 }, operation());
    withWorkMeter({ tests: 1 }, () => {
      expect(() => work.next()).toThrow();
      chargeWork({ tests: 1 });
    });
    expect(work.next()).toEqual({ value: 'complete', done: true });
    expect(inWorkGroup()).toBe(false);
  });

  it('runs cancellation cleanup under the remaining allowance and restores the caller', () => {
    let cleaned = false;
    function* operation() {
      try {
        chargeWork({ tests: 1 });
        yield 'waiting';
      } finally {
        chargeWork({ tests: 1 });
        cleaned = true;
      }
    }
    const work = meteredIterator({ tests: 2 }, operation());
    work.next();
    expect(work.return()).toEqual({ value: undefined, done: true });
    expect(cleaned).toBe(true);
    expect(inWorkGroup()).toBe(false);
  });
});
