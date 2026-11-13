import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import type { NativeNpcCapture } from './native-npc-capture.js';
import { attachNativeConsumer, encodeNativeJson, releaseNativeProduct } from './native-consumer.js';
import { nativeEntityMarkerFactCount, nativeEntityMarkerReader } from './native-recall-service.js';
import {
  measureEntityMarkerProjection,
  projectEntityMarkersFromRead,
} from './entity-references.js';

const referenceField = /^(entityId|actorId|targetId|sourceId|targetEntityId|addresseeEntityId)$/;

/** Preserve the Source JSON/marker/reviver projection while admitting its new
 * strings, decoded sections and actual reference-spelling expansion separately
 * from the captured source graphs that they borrow. */
export function projectNativeDecisionContext(
  world: Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>,
  context: Record<string, unknown>,
  capture: NativeNpcCapture,
  references: Readonly<Record<string, string>>,
): void {
  let referenceCount = 0;
  for (const key in references) if (Object.hasOwn(references, key)) referenceCount++;
  // One presized fact vector, one alias map, and the five-field HMAC size
  // tuple. These are selected read metadata, never a second authority map.
  const metadata = world.reserveConsumerBytes(
    4 * 256 + 5 * 64 + nativeEntityMarkerFactCount(capture) * 64 + referenceCount * 512,
  );
  let hashing: NativeWorldConsumer | undefined;
  try {
    const marker = nativeEntityMarkerReader(capture);
    hashing = world.reserveConsumerBytes(5 * marker.hashInputBytes() + 4 * 256);
    const aliases = new Map<string, string>();
    let largestAliasUnits = 0;
    for (const alias in references)
      if (Object.hasOwn(references, alias)) {
        const id = references[alias]!;
        // Source's Object.entries(...).find chooses the first canonical match.
        if (!aliases.has(id)) aliases.set(id, alias);
        largestAliasUnits = Math.max(largestAliasUnits, alias.length);
      }
    for (const key in context) {
      if (!Object.hasOwn(context, key)) continue;
      const value = context[key];
      if (typeof value === 'string') {
        const measuring = world.reserveConsumerBytes(2 * Buffer.byteLength(value) + 4 * 256);
        let output: NativeWorldConsumer | undefined;
        let workspace: NativeWorldConsumer | undefined;
        let attached = false;
        try {
          const size = measureEntityMarkerProjection(value, marker.reference);
          output = world.reserveConsumerBytes(2 * size.bytes + 256);
          workspace = world.reserveConsumerBytes(2 * size.bytes + size.replacements * 128 + 256);
          context[key] = projectEntityMarkersFromRead(value, marker.reference);
          attachNativeConsumer(context, output);
          attached = true;
        } finally {
          if (!attached) output?.release();
          workspace?.release();
          measuring.release();
        }
      } else if (value != null) {
        const encoded = encodeNativeJson(world, value);
        let measuring: NativeWorldConsumer | undefined;
        let projectedBody: NativeWorldConsumer | undefined;
        let workspace: NativeWorldConsumer | undefined;
        let traversal: NativeWorldConsumer | undefined;
        let decoded: NativeWorldConsumer | undefined;
        let expansion: NativeWorldConsumer | undefined;
        let decodedAttached = false,
          expansionAttached = false;
        try {
          // Existing JSON bytes precede the marker pass: its identifiers and
          // lone UTF16/quote/backslash escapes must be measured at this boundary.
          measuring = world.reserveConsumerBytes(4 * encoded.length + 4 * 256);
          const text = encoded.toString('utf8');
          const size = measureEntityMarkerProjection(text, marker.reference);
          projectedBody = world.reserveConsumerBytes(size.bytes + 256);
          workspace = world.reserveConsumerBytes(4 * size.bytes + size.replacements * 128 + 256);
          const projected = projectEntityMarkersFromRead(text, marker.reference);
          const buffer = Buffer.allocUnsafeSlow(size.bytes);
          buffer.write(projected, 0, 'utf8');
          let traversalBytes = 0,
            expansionBytes = 0;
          const walk = (input: unknown): void => {
            if (input === null || typeof input !== 'object') return;
            traversalBytes += 256;
            if (Array.isArray(input)) {
              traversalBytes += input.length * (64 + 128);
              for (let at = 0; at < input.length; at++) walk(input[at]);
            } else {
              for (const field in input)
                if (Object.hasOwn(input, field)) {
                  const entry = (input as Record<string, unknown>)[field];
                  if (entry === undefined) continue;
                  traversalBytes += 64 + 128;
                  if (typeof entry === 'string' && referenceField.test(field))
                    // A reviver can replace a short private ID with a longer
                    // actual offered alias. Input-only decode admission cannot
                    // fund that new spelling. Marker changes may also shorten
                    // the input first, so bound the whole selected alias here.
                    expansionBytes += 2 * largestAliasUnits;
                  walk(entry);
                }
            }
          };
          walk(value);
          traversal = world.reserveConsumerBytes(traversalBytes + 256);
          if (expansionBytes) expansion = world.reserveConsumerBytes(expansionBytes);
          decoded = world.reserveConsumerJson(buffer);
          const result: unknown = JSON.parse(projected, (field, entry: unknown) =>
            typeof entry === 'string' && referenceField.test(field)
              ? (aliases.get(entry) ?? entry)
              : entry,
          );
          const owner = result !== null && typeof result === 'object' ? result : context;
          attachNativeConsumer(owner, decoded);
          decodedAttached = true;
          if (expansion) {
            attachNativeConsumer(owner, expansion);
            expansionAttached = true;
          }
          context[key] = result;
        } finally {
          if (!decodedAttached) decoded?.release();
          if (!expansionAttached) expansion?.release();
          traversal?.release();
          workspace?.release();
          projectedBody?.release();
          measuring?.release();
          releaseNativeProduct(encoded);
        }
      }
    }
  } finally {
    hashing?.release();
    metadata.release();
  }
}
