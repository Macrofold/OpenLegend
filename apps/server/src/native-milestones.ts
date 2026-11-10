import type { NativeChangedRows } from '@open-legend/native-simulation';

export type NativeMilestones = Readonly<Record<string, Readonly<Record<string, boolean>>>>;
/** Derived display metadata from actual canonical rows, prepared before Ready.
 * This reader grants no progression and never writes a simulation record. */
export function nativeMilestoneUpdates(
  before: NativeMilestones,
  changes: NativeChangedRows,
): NativeMilestones {
  const writes = changes.writes['actor_milestones'] ?? [],
    deletes = changes.deletes['actor_milestones'] ?? [];
  if (!writes.length && !deletes.length) return before;
  const after = { ...before };
  for (const id of deletes) delete after[(JSON.parse(id) as string[]).at(-1)!];
  for (const row of writes)
    Object.defineProperty(after, row.slot, {
      value: JSON.parse(row.payload) as Readonly<Record<string, boolean>>,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  return after;
}
