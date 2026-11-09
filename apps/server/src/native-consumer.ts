import type { NativeWorldConsumer, NativeWorldJson } from '@open-legend/native-simulation';

// A Buffer can disappear while its parsed strings/arrays still serve a request,
// save or model context. Keep their separate native admission with the actual
// decoded root, rather than releasing it at the end of the parsing function.
type Entry = { readonly origin: symbol; readonly consumer: NativeWorldConsumer };
type Holder = { readonly entries: readonly Entry[] };
const decodedConsumers = new FinalizationRegistry<Holder>((holder) => {
  for (const entry of holder.entries) entry.consumer.release();
});
const holders = new WeakMap<object, Holder>();

function attach(owner: object, entries: readonly Entry[]): void {
  const previous = holders.get(owner);
  const holder = { entries };
  holders.set(owner, holder);
  decodedConsumers.register(owner, holder, holder);
  if (previous) {
    decodedConsumers.unregister(previous);
    for (const entry of previous.entries) entry.consumer.release();
  }
}

/** Decode one already scoped native product. Its semantic owner supplies the
 * concrete type; this function grants neither world access nor mutation. */
export function decodeNativeProduct<T extends object>(encoded: NativeWorldJson): T {
  const consumer = encoded.consumer();
  try {
    const value: unknown = JSON.parse(encoded.consume().toString('utf8'));
    if (value === null || typeof value !== 'object')
      throw new Error('A scoped native product requires an owned object root.');
    attach(value, [{ origin: Symbol(), consumer }]);
    return value as T;
  } catch (error) {
    // No decoded product escaped this failed boundary.
    consumer.release();
    throw error;
  }
}

/** The decoded JSON graph is owned and admitted already. Freeze it in place so
 * shared domain formatters can prove/reuse its immutable children instead of
 * cloning all received bodies or installed geometry into another graph. */
export function freezeNativeProduct<T extends object>(owner: T): T {
  if (!holders.has(owner)) throw new Error('Native immutable data has no decoded product owner.');
  const freeze = (value: object): void => {
    for (const child of Object.values(value))
      if (child !== null && typeof child === 'object') freeze(child);
    Object.freeze(value);
  };
  freeze(owner);
  return owner;
}

/** A derived view/save/context can retain individual strings or child arrays
 * without otherwise keeping the decoded root alive. Its actual owner must
 * share their allocation admission until that derived product is unreachable.
 * This retains no obsolete parent graph or chain of previous captures. */
export function retainNativeSources<T extends object>(
  owner: T,
  ...roots: readonly [object, ...object[]]
): T {
  const entries: Entry[] = [];
  const seen = new Set<symbol>();
  try {
    for (const root of roots) {
      const holder = holders.get(root);
      if (!holder) throw new Error('A derived native product has no scoped allocation owner.');
      for (const entry of holder.entries) {
        if (seen.has(entry.origin)) continue;
        const consumer = entry.consumer.retain();
        entries.push({ origin: entry.origin, consumer });
        seen.add(entry.origin);
      }
    }
  } catch (error) {
    for (const entry of entries) entry.consumer.release();
    throw error;
  }
  attach(owner, entries);
  return owner;
}
