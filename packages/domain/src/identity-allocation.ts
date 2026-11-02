import type { WorldState } from './types.js';

// Transition-local allocation intent. No durable registry or historical ID scan:
// missing/forked/imported lineage simply uses the ordinary comparison path.
const allocated = new WeakMap<WorldState, Map<string, number>>();
/** A restored builder must not give an abandoned timeline's identity to a new
 * occurrence, including an excluded source's unavailable correcting evidence. */
export function preserveIdentityHighWater(restored: WorldState, current: WorldState): void {
  restored.nextId = Math.max(restored.nextId, current.nextId);
}
export function recordIdentityAllocation(world: WorldState, id: string, sequence: number): void {
  let values = allocated.get(world);
  if (!values) allocated.set(world, (values = new Map()));
  values.set(id, sequence);
}
export function inheritIdentityAllocations(from: WorldState, to: WorldState): void {
  const values = allocated.get(from);
  if (values) allocated.set(to, new Map(values));
}
export function captureIdentityAllocations(world: WorldState): (result: WorldState) => void {
  const values = allocated.get(world);
  return (result) => {
    if (values) allocated.set(result, values);
  };
}
/** Only an actual allocator call after the accepted predecessor certifies INSERT. */
export function allocatedIdentityBetween(
  before: WorldState,
  after: WorldState,
  id: string,
): boolean {
  const sequence = allocated.get(after)?.get(id);
  return (
    before.id === after.id &&
    sequence !== undefined &&
    sequence >= before.nextId &&
    sequence < after.nextId
  );
}

/** Acceptance acknowledges captured row-creation intent. Pure previews must not
 * call this: nested native transitions still need their local allocation proof. */
export function releaseIdentityAllocationProof(world: WorldState): void {
  allocated.delete(world);
}
