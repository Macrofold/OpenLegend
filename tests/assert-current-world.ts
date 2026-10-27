import { expect } from 'vitest';
import { entityGet, entityValues } from '../packages/domain/src/entity-collection.js';
import { materializeNativeValues } from '../packages/domain/src/native-values.js';
import type { WorldState } from '../packages/domain/src/types.js';

/** Linear meters permit last-bit subdivision differences, not different histories,
 * physical actions, RNG, accounting or effects. Eager-reference comparisons may also
 * differ in meter invalidation counts; same-format continuation keeps those strict. */
export function expectCurrentWorldEquivalent(
  actual: WorldState,
  expected: WorldState,
  allowMeterRevisionChanges = false,
): void {
  const current = structuredClone(materializeNativeValues(actual));
  const reference = materializeNativeValues(expected);
  for (const entity of entityValues(current.entities)) {
    const other = entityGet(reference.entities, entity.id)!;
    for (const [id, state] of Object.entries(entity.actor?.attributes ?? entity.attributes ?? {})) {
      const prior = (other.actor?.attributes ?? other.attributes)?.[id];
      if (typeof state.value === 'number' && typeof prior?.value === 'number') {
        expect(state.value).toBeCloseTo(prior.value, 10);
        state.value = prior.value;
        if (allowMeterRevisionChanges) {
          expect(Number.isSafeInteger(state.revision)).toBe(true);
          state.revision = prior.revision;
        }
      }
    }
    for (const [id, state] of Object.entries(entity.statusEffects ?? {})) {
      const prior = other.statusEffects?.[id];
      if (prior) {
        expect(state.elapsedSeconds).toBeCloseTo(prior.elapsedSeconds, 10);
        state.elapsedSeconds = prior.elapsedSeconds;
      }
    }
  }
  expect(current).toEqual(reference);
}
