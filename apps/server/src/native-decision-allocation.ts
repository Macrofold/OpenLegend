import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import { z } from 'zod';
import {
  attachNativeConsumer,
  freezeNativeProduct,
  releaseNativeProduct,
} from './native-consumer.js';

type Capacity = Pick<NativeWorld, 'reserveConsumerBytes'>;

// The supported Node layout allowances also fund native provider formatting.
// These counts cover newly assembled containers and UTF-16 text, with the
// already admitted source objects and strings borrowed from their owners.
export const decisionObjectBytes = (members: number) => 256 + members * 512;
export const decisionArrayBytes = (entries: number) => 256 + entries * 64;
export const decisionTextBytes = (units: number) => 64 + units * 2;

export function decisionRecordEntries(value: Readonly<Record<string, unknown>>): number {
  let count = 0;
  for (const key in value) if (Object.hasOwn(value, key)) count++;
  return count;
}

export function admitDecisionGraph<T extends object>(
  capacity: Capacity,
  bytes: number,
  build: () => T,
): T {
  const allocation = capacity.reserveConsumerBytes(bytes);
  let graph: T;
  try {
    graph = build();
  } catch (error) {
    allocation.release();
    throw error;
  }
  try {
    return attachNativeConsumer(graph, allocation);
  } catch (error) {
    // This new graph did not escape. Its builder may already have attached
    // independently retained schema/text borrows before final admission.
    releaseNativeProduct(graph);
    throw error;
  }
}

export function decisionJsonGraphBytes(value: unknown): number {
  if (typeof value === 'string') return decisionTextBytes(value.length);
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value)) {
    let bytes = decisionArrayBytes(value.length);
    for (const child of value) bytes += decisionJsonGraphBytes(child);
    return bytes;
  }
  let bytes = decisionObjectBytes(0);
  for (const key in value)
    if (Object.hasOwn(value, key))
      bytes +=
        512 +
        decisionTextBytes(key.length) +
        decisionJsonGraphBytes((value as Record<string, unknown>)[key]);
  return bytes;
}

/** Zod 4.6.5's processSchema records one entry/path per distinct definition
 * (including inheritance). Its draft-7 finalizer serializes inline occurrences
 * and parses that JSON anew. Count these two shapes independently. */
export function projectDecisionSchema(capacity: Capacity, schema: z.ZodType) {
  const traversal: NativeWorldConsumer[] = [];
  let workspace: NativeWorldConsumer | undefined;
  let emitted: NativeWorldConsumer | undefined;
  let uniqueBytes = 0;
  try {
    traversal.push(capacity.reserveConsumerBytes(decisionArrayBytes(64)));
    const seen = new Set<z.ZodType>();
    const visit = (value: unknown, depth: number): number => {
      if (typeof value === 'string') return decisionTextBytes(6 * value.length);
      if (!value || typeof value !== 'object') return 0;
      if (value instanceof z.ZodType) {
        if (!seen.has(value)) {
          if (seen.size % 64 === 0)
            traversal.push(capacity.reserveConsumerBytes(decisionArrayBytes(64)));
          seen.add(value);
          uniqueBytes += decisionObjectBytes(8) + 2 * decisionArrayBytes(depth + 1);
          // Parent definitions participate in Zod's resolution workspace. The
          // child shape already includes its inherited fields at emission.
          if (value._zod.parent) visit(value._zod.parent, depth + 1);
        }
        return decisionObjectBytes(3) + decisionArrayBytes(2) + visit(value.def, depth + 1);
      }
      if (Array.isArray(value)) {
        let bytes = decisionArrayBytes(value.length);
        for (const child of value) bytes += visit(child, depth + 1);
        return bytes;
      }
      let bytes = decisionObjectBytes(0);
      for (const key in value)
        if (Object.hasOwn(value, key))
          bytes +=
            512 +
            decisionTextBytes(6 * key.length) +
            visit((value as Record<string, unknown>)[key], depth + 1);
      return bytes;
    };
    const inline = visit(schema, 0);
    // The final decoded graph survives the exporter. Its own escrow makes it
    // possible to end the completed exporter workspace before reserving the
    // exact retained shape, while the graph remains continuously funded.
    emitted = capacity.reserveConsumerBytes(inline);
    workspace = capacity.reserveConsumerBytes(uniqueBytes + inline);
    const result = z.toJSONSchema(schema, { target: 'draft-7', io: 'input' });
    workspace.release();
    workspace = undefined;
    return freezeNativeProduct(
      attachNativeConsumer(result, capacity.reserveConsumerBytes(decisionJsonGraphBytes(result))),
    );
  } finally {
    workspace?.release();
    emitted?.release();
    for (const reservation of traversal) reservation.release();
  }
}
