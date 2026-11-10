import type { NativeWorldConsumer, NativeWorldJson } from '@open-legend/native-simulation';
import { AsyncLocalStorage } from 'node:async_hooks';

// A Buffer can disappear while its parsed strings/arrays still serve a request,
// save or model context. Keep their separate native admission with the actual
// decoded root, rather than releasing it at the end of the parsing function.
type Entry = {
  readonly origin: symbol;
  readonly consumer: NativeWorldConsumer;
  /** This admission funds this object's own allocation, beyond borrowed pins. */
  readonly owned?: true;
};
type Scope = { readonly holders: Set<Holder>; closed: boolean };
type Holder = { readonly entries: readonly Entry[]; scope?: Scope; released?: true };
const scopes = new AsyncLocalStorage<Scope>();
function release(holder: Holder): void {
  if (holder.released) return;
  holder.released = true;
  holder.scope?.holders.delete(holder);
  for (const entry of holder.entries) entry.consumer.release();
}
const decodedConsumers = new FinalizationRegistry<Holder>(release);
const holders = new WeakMap<object, Holder>();

/** Temporary formatting products end with the real request. An output that
 * leaves it must explicitly retain its holder through its actual consumer. */
export function createNativeConsumerScope() {
  const scope: Scope = { holders: new Set(), closed: false };
  let active = 0;
  let ending = false;
  const finish = () => {
    if (!ending || active || scope.closed) return;
    scope.closed = true;
    for (const holder of scope.holders) {
      decodedConsumers.unregister(holder);
      release(holder);
    }
  };
  return {
    async run<T>(operation: () => Promise<T>): Promise<T> {
      if (ending) throw new Error('The native consumer owner was released.');
      active++;
      try {
        return await scopes.run(scope, operation);
      } finally {
        active--;
        finish();
      }
    },
    dispose(): void {
      ending = true;
      finish();
    },
  };
}

export async function withNativeConsumerScope<T>(operation: () => Promise<T>): Promise<T> {
  const scope = createNativeConsumerScope();
  try {
    return await scope.run(operation);
  } finally {
    scope.dispose();
  }
}

/** Accepted publications and independent save/provider owners cannot inherit a
 * caller's temporary preparation lifetime through async context propagation. */
export function withoutNativeConsumerScope<T>(operation: () => T): T {
  return scopes.exit(operation);
}

export function retainNativeProduct<T extends object>(owner: T): T {
  const holder = holders.get(owner);
  if (!holder || holder.released) throw new Error('Native output has no live allocation owner.');
  holder.scope?.holders.delete(holder);
  holder.scope = undefined;
  return owner;
}

/** The real transport/stream owner calls this only after final consumption. */
export function releaseNativeProduct(owner: object): void {
  const holder = holders.get(owner);
  if (!holder) return;
  decodedConsumers.unregister(holder);
  holders.delete(owner);
  release(holder);
}

function attach(owner: object, entries: readonly Entry[]): void {
  const previous = holders.get(owner);
  const active = scopes.getStore();
  const holder: Holder = { entries, scope: active?.closed ? undefined : active };
  holders.set(owner, holder);
  holder.scope?.holders.add(holder);
  decodedConsumers.register(owner, holder, holder);
  if (previous) {
    decodedConsumers.unregister(previous);
    release(previous);
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
    attach(value, [{ origin: Symbol(), consumer, owned: true }]);
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
    for (const entry of holders.get(owner)?.entries ?? []) {
      if (!entry.owned) continue;
      entries.push({ ...entry, consumer: entry.consumer.retain() });
      seen.add(entry.origin);
    }
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

/** Transfer an already reserved allocation to its actual Node object. A failed
 * attachment consumes/releases the incoming guard too. Source pins keep their
 * separate lifetimes; later source attachment preserves this owned admission. */
export function attachNativeConsumer<T extends object>(
  owner: T,
  consumer: NativeWorldConsumer,
  ...sources: readonly object[]
): T {
  const entries: Entry[] = [{ origin: Symbol(), consumer, owned: true }];
  const seen = new Set<symbol>();
  try {
    for (const root of [owner, ...sources]) {
      const holder = holders.get(root);
      if (!holder) {
        if (root === owner) continue;
        throw new Error('A derived native product has no scoped allocation owner.');
      }
      for (const entry of holder.entries) {
        if (seen.has(entry.origin)) continue;
        entries.push({
          origin: entry.origin,
          consumer: entry.consumer.retain(),
          ...(root === owner && entry.owned ? { owned: true as const } : {}),
        });
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
