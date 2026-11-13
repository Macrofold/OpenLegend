import type { NativeChangedRows, NativeWorld } from '@open-legend/native-simulation';
import {
  attachNativeConsumer,
  copyNativeProduct,
  releaseNativeProduct,
  retainNativeProduct,
} from './native-consumer.js';

export type NativeMilestones = Readonly<Record<string, Readonly<Record<string, boolean>>>>;
type Admission = Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>;

/** Canonical rows are already validated by their native owner. Admit only the
 * temporary JSON decode here; this reader does not grant or validate a badge. */
function read<T extends object>(world: Admission, text: string): T {
  const length = Buffer.byteLength(text);
  const carrier = world.reserveConsumerBytes(length + 256);
  try {
    const bytes = Buffer.allocUnsafeSlow(length);
    bytes.write(text, 0, 'utf8');
    const parsed = world.reserveConsumerJson(bytes);
    try {
      return attachNativeConsumer(JSON.parse(text) as T, parsed);
    } catch (error) {
      parsed.release();
      throw error;
    }
  } finally {
    carrier.release();
  }
}

/** Derived display metadata from actual canonical rows, prepared before Ready.
 * The independent retained copy cannot pin its publication or source rows.
 * Callers release a rejected replacement or the old accepted root explicitly. */
export function nativeMilestoneUpdates(
  world: Admission,
  before: NativeMilestones,
  changes: NativeChangedRows,
): NativeMilestones {
  const writes = changes.writes['actor_milestones'] ?? [],
    deletes = changes.deletes['actor_milestones'] ?? [];
  if (!writes.length && !deletes.length) return before;
  let actors = 0;
  for (const id in before) if (Object.hasOwn(before, id)) actors++;
  const workspace = world.reserveConsumerBytes((1 + actors + writes.length + deletes.length) * 512);
  const decoded: object[] = [];
  try {
    const after = { ...before };
    for (const id of deletes) {
      const path = read<string[]>(world, id);
      decoded.push(path);
      delete after[path.at(-1)!];
    }
    for (const row of writes) {
      const flags = read<Readonly<Record<string, boolean>>>(world, row.payload);
      decoded.push(flags);
      Object.defineProperty(after, row.slot, {
        value: flags,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return retainNativeProduct(copyNativeProduct(world, after));
  } finally {
    for (const value of decoded) releaseNativeProduct(value);
    workspace.release();
  }
}
