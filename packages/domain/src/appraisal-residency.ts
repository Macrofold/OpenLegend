import { isDraft, original } from 'immer';
import type { WorldState } from './types.js';
import type { Appraisal } from './appraisals.js';

const partial = new WeakSet<object>();
export function markPartialAppraisals(records: Record<string, Appraisal>): void {
  partial.add(records);
}
export function completeAppraisalHistory(records: Record<string, Appraisal> | undefined): boolean {
  return !records || !partial.has(isDraft(records) ? original(records)! : records);
}
/** Completeness is rebuildable residency metadata, not another saved authority. */
export function captureAppraisalResidency(world: WorldState): (result: WorldState) => void {
  const before = original(world)?.appraisals;
  const partialActors = Object.entries(before ?? {})
    .filter(([, records]) => !completeAppraisalHistory(records))
    .map(([id]) => id);
  return (result) => {
    for (const id of partialActors)
      if (result.appraisals?.[id]) markPartialAppraisals(result.appraisals[id]!);
  };
}
