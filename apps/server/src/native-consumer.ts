import type {
  NativeWorld,
  NativeWorldConsumer,
  NativeWorldJson,
} from '@open-legend/native-simulation';
import { jsonByteLength } from '@open-legend/domain';
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
type Holder = { entries: readonly Entry[]; scope?: Scope; released?: true };
const scopes = new AsyncLocalStorage<Scope>();
function release(holder: Holder): void {
  if (holder.released) return;
  holder.released = true;
  holder.scope?.holders.delete(holder);
  for (const entry of holder.entries) entry.consumer.release();
  // A completed product can remain in a diagnostic/cache as ordinary data.
  // Drop its dead internal JS class references too; each native header keeps
  // its fixed charge until that actual class is destroyed.
  holder.entries = [];
  holder.scope = undefined;
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
    runSync<T>(operation: () => T): T {
      if (ending) throw new Error('The native consumer owner was released.');
      active++;
      try {
        return scopes.run(scope, operation);
      } finally {
        active--;
        finish();
      }
    },
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

// Canonical receipt/prompt owners also use this conservative aggregate for
// their entries/filter/sort/map arrays. The plain encoder below has a narrower
// live-ancestor bound; changing this shared meaning would underfund those owners.
export function nativeJsonEncodingWorkspace(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let bytes = 32 * 8;
  if (Array.isArray(value)) {
    bytes += value.length * 8 * 8;
    for (let index = 0; index < value.length; index++)
      bytes += nativeJsonEncodingWorkspace(value[index]);
  } else {
    for (const key in value)
      if (Object.hasOwn(value, key)) {
        const field = (value as Record<string, unknown>)[key];
        if (field !== undefined) bytes += 8 * 8 + nativeJsonEncodingWorkspace(field);
      }
  }
  return bytes;
}

// Node22.23.2: json/json-stringifier.cc uses a HandleScope for each active
// object/object-element array, and a depth-sized cycle stack. Sibling scopes
// end before the next sibling starts. api/api.h keeps at most one spare block.
// Account one active-block rounding margin + that spare (1,022 addresses each),
// the inline 2,048-byte builder, 64-entry key cache and stringifier headers.
export const nativeJsonFixedWorkspace = 2 * (1024 - 2) * 8 + 2048 + 64 * 8 + 32 * 8;
// Source canonicalJson uses Object.entries pairs, filter/sort/map and join.
// Add each pair's own array/backing beyond the shared aggregate slot bound.
function pairWorkspace(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let bytes = 0;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) bytes += pairWorkspace(value[index]);
  } else {
    for (const key in value)
      if (Object.hasOwn(value, key))
        bytes += 64 + pairWorkspace((value as Record<string, unknown>)[key]);
  }
  return bytes;
}

function objectDepth(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let child = 0;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++)
      child = Math.max(child, objectDepth(value[index]));
    return child;
  }
  for (const key in value)
    if (Object.hasOwn(value, key))
      child = Math.max(child, objectDepth((value as Record<string, unknown>)[key]));
  return 1 + child;
}

// Node22.23.2 third_party/v8/builtins/array-sort.tq: each active object sort
// owns 85 pending-run slots, at least 32 temporary slots, SortState and the
// fixed entries/filter/map/work array headers. Dynamic slots are counted above.
const sortFrame = (85 + 32 + 32 + 32) * 8;
/** Source canonicalJson emits primitive leaves with JSON.stringify, then joins
 * ordered child strings. This is temporary encoder work, not a retained graph.
 * Eight wire bytes cover Unicode leaf builder growth, input flattening and
 * parent-join overlap; callers admit any retained result independently. */
export function nativeCanonicalJsonWorkspace(value: unknown, bytes: number): number {
  return (
    nativeJsonFixedWorkspace +
    nativeJsonEncodingWorkspace(value) +
    pairWorkspace(value) +
    sortFrame * objectDepth(value) +
    8 * bytes
  );
}

function jsonAncestorWorkspace(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let own = 32 * 8,
    child = 0;
  if (Array.isArray(value)) {
    own += value.length * 8 * 8;
    for (let index = 0; index < value.length; index++)
      child = Math.max(child, jsonAncestorWorkspace(value[index]));
  } else {
    for (const key in value)
      if (Object.hasOwn(value, key)) {
        // Object.keys and V8's handles include an undefined property's key too.
        own += 8 * 8;
        child = Math.max(child, jsonAncestorWorkspace((value as Record<string, unknown>)[key]));
      }
  }
  return own + child;
}

/** A selected string's UTF-16 backing is already funded by its input owner.
 * This extra overlap covers Flatten copying a rope while its old parts live.
 * After encoding, any resulting flat backing remains that same input's body. */
function jsonInputStringUnits(value: unknown): number {
  if (typeof value === 'string') return value.length;
  if (value === null || typeof value !== 'object') return 0;
  let units = 0;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) units += jsonInputStringUnits(value[index]);
  } else {
    for (const key in value)
      if (Object.hasOwn(value, key))
        units += key.length + jsonInputStringUnits((value as Record<string, unknown>)[key]);
  }
  return units;
}

/** V8 doubles one contiguous builder and copies it into the final string.
 * Either may be UTF-16 even for mostly ASCII JSON. Appending exactly at a
 * capacity boundary also extends, hence strictly greater than the wire bound.
 * The new+old growth/encoding buffers and builder+result are distinct peaks. */
function jsonStringifierBodies(bytes: number): number {
  if (!Number.isSafeInteger(bytes) || bytes < 0)
    throw new Error('Native JSON encoding exceeds its finite allocation bound.');
  let capacity = 2048;
  while (capacity <= bytes) capacity *= 2;
  return Math.max(3 * capacity, 2 * capacity + 2 * bytes);
}

// Installation packets are trusted plain JSON records. Split their first
// three object levels (packet, record set, table directory), leaving each
// actual table/array to JSON.stringify. This preserves the existing codec and
// member order without a whole-world intermediate string. The input owner
// already funds these objects; shape below funds the live Object.keys ancestry.
function installationChunks(
  value: unknown,
  objectLevels: number,
  append: (value: unknown, literal?: string) => void,
): void {
  if (!objectLevels || value === null || typeof value !== 'object' || Array.isArray(value)) {
    append(value);
    return;
  }
  const record = value as Record<string, unknown>;
  append(undefined, '{');
  let fields = 0;
  for (const key of Object.keys(record)) {
    const child = record[key];
    if (child === undefined || typeof child === 'function' || typeof child === 'symbol') continue;
    if (fields++) append(undefined, ',');
    append(key);
    append(undefined, ':');
    installationChunks(child, objectLevels - 1, append);
  }
  append(undefined, '}');
}

export interface NativeJsonEncodingOptions {
  readonly prefix?: string;
  readonly suffix?: string;
  readonly sources?: readonly object[];
  /** Trusted plain own-data installation root only: no getters or toJSON.
   * Children still use the existing JSON.stringify codec. Only the actual
   * PostgreSQL/JSON-decoded producer may identify fields with flat strings;
   * authored definitions/settings/layouts retain their flattening allowance. */
  readonly installationRoot?: { readonly flatStringFields: readonly string[] };
}

function measureNativeJson(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  value: unknown,
  options: NativeJsonEncodingOptions,
) {
  const prefix = options.prefix ?? '',
    suffix = options.suffix ?? '',
    installation = options.installationRoot;
  if (installation && (value === null || typeof value !== 'object' || Array.isArray(value)))
    throw new Error('Native installation encoding requires its plain record root.');
  const root = value as Record<string, unknown>;
  const shape = nativeJsonFixedWorkspace + jsonAncestorWorkspace(value);
  let flattenUnits = 0;
  if (installation) {
    for (const key in root)
      if (Object.hasOwn(root, key)) {
        flattenUnits += key.length;
        if (!installation.flatStringFields.includes(key))
          flattenUnits += jsonInputStringUnits(root[key]);
      }
  } else flattenUnits = jsonInputStringUnits(value);
  const flattening = 2 * flattenUnits;
  // Measuring uses the same live Object.keys ancestry. Disable Native cache
  // writes: persistent WeakMap/proof entries cannot borrow a temporary guard.
  const measuring = world.reserveConsumerBytes(shape + flattening + 256);
  let bytes: number,
    bodyPeak = 0;
  try {
    if (installation) {
      bytes = 0;
      installationChunks(root, 3, (chunk, literal) => {
        if (literal !== undefined) bytes += literal.length;
        else {
          const size = jsonByteLength(chunk, { cache: false });
          bytes += size;
          bodyPeak = Math.max(bodyPeak, jsonStringifierBodies(size));
        }
      });
    } else {
      bytes = jsonByteLength(value, { cache: false });
      bodyPeak = jsonStringifierBodies(bytes);
    }
    bytes += Buffer.byteLength(prefix) + Buffer.byteLength(suffix);
  } finally {
    measuring.release();
  }
  return { bytes, bodyPeak, shape, flattening };
}

/** An existing textual hash or formatter owns its actual JSON workspace, but
 * has no reason to allocate the encoder's separate output Buffer. */
export function reserveNativeJsonTextWorkspace(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  value: unknown,
  canonical = false,
): NativeWorldConsumer {
  const { bytes, bodyPeak, shape, flattening } = measureNativeJson(world, value, {});
  const text = canonical
    ? nativeCanonicalJsonWorkspace(value, bytes) + flattening
    : Math.max(4 * bytes, bodyPeak) + shape + flattening;
  // Node's hashing consumer can make a separate UTF-8 input from the string.
  return world.reserveConsumerBytes(text + bytes + 512);
}

/** Admit the selected JSON output before its encoder or transport Buffer
 * allocates. Existing source pins do not fund newly serialized bytes. */
export function encodeNativeJson(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  value: unknown,
  options: NativeJsonEncodingOptions = {},
): Buffer {
  const prefix = options.prefix ?? '',
    suffix = options.suffix ?? '',
    installation = options.installationRoot;
  const { bytes, bodyPeak, shape, flattening } = measureNativeJson(world, value, options);
  const output = world.reserveConsumerBytes(bytes + 32 * 8);
  let workspace: NativeWorldConsumer | undefined;
  try {
    // The fixed output Buffer is admitted separately. Installation emits one
    // child string at a time, so its temporary body bound is the largest actual
    // chunk's V8 growth/result overlap, not four copies of the whole packet.
    // Ordinary callers keep their existing monolithic floor.
    workspace = world.reserveConsumerBytes(
      (installation ? bodyPeak : Math.max(4 * bytes, bodyPeak)) + shape + flattening,
    );
    // Avoid Node's pooled small-Buffer slab: this owner funds this exact body.
    const buffer = Buffer.allocUnsafeSlow(bytes);
    let at = buffer.write(prefix, 0, 'utf8');
    if (installation) {
      installationChunks(value, 3, (chunk, literal) => {
        at += buffer.write(literal ?? JSON.stringify(chunk), at, 'utf8');
      });
    } else at += buffer.write(JSON.stringify(value), at, 'utf8');
    buffer.write(suffix, at, 'utf8');
    return attachNativeConsumer(buffer, output, ...(options.sources ?? []));
  } catch (error) {
    output.release();
    throw error;
  } finally {
    workspace?.release();
  }
}

/** A bridge call borrows the actual encoded input until its native result (or
 * refusal) completes. The encoder admits its Buffer and workspace beforehand. */
export async function withNativeJsonInput<T>(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  value: unknown,
  consume: (bytes: Buffer) => Promise<T>,
  options: NativeJsonEncodingOptions = {},
): Promise<T> {
  const input = encodeNativeJson(world, value, options);
  try {
    return await consume(input);
  } finally {
    releaseNativeProduct(input);
  }
}

/** Some existing consumers require JSON text rather than a Buffer. Its UTF-16
 * backing and small envelope remain owned independently after encoding ends. */
export function encodeNativeJsonText(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  value: unknown,
): { readonly text: string; readonly bytes: number } {
  const encoded = encodeNativeJson(world, value);
  let allocation: NativeWorldConsumer | undefined;
  try {
    allocation = world.reserveConsumerBytes(2 * encoded.length + 512);
    return attachNativeConsumer(
      { text: encoded.toString('utf8'), bytes: encoded.length },
      allocation,
    );
  } catch (error) {
    allocation?.release();
    throw error;
  } finally {
    releaseNativeProduct(encoded);
  }
}

/** Already encoded provider/canonical text still needs its own UTF-8 carrier.
 * Keep that exact Buffer admitted until the borrowing native call settles. */
export async function withNativeUtf8Input<T>(
  world: Pick<NativeWorld, 'reserveConsumerBytes'>,
  text: string,
  consume: (bytes: Buffer) => Promise<T>,
): Promise<T> {
  const bytes = Buffer.byteLength(text);
  const allocation = world.reserveConsumerBytes(bytes + 256);
  try {
    const buffer = Buffer.allocUnsafeSlow(bytes);
    buffer.write(text, 0, 'utf8');
    return await consume(buffer);
  } finally {
    allocation.release();
  }
}

/** A small retained report/cache entry owns its copied JSON graph, rather than
 * pinning the publication or request whose scalar fields it was built from. */
export function copyNativeProduct<T extends object>(
  world: Pick<NativeWorld, 'reserveConsumerBytes' | 'reserveConsumerJson'>,
  value: T,
): T {
  const encoded = encodeNativeJson(world, value);
  let allocation: NativeWorldConsumer | undefined;
  try {
    allocation = world.reserveConsumerJson(encoded);
    return attachNativeConsumer(JSON.parse(encoded.toString('utf8')) as T, allocation);
  } catch (error) {
    allocation?.release();
    throw error;
  } finally {
    releaseNativeProduct(encoded);
  }
}

export function retainNativeProduct<T extends object>(owner: T): T {
  const holder = holders.get(owner);
  if (!holder || holder.released) throw new Error('Native output has no live allocation owner.');
  holder.scope?.holders.delete(holder);
  holder.scope = undefined;
  return owner;
}

/** Capacity-only input custody survives the caller's temporary scope. The
 * provider already holds the immutable value itself; these pins grant no read. */
export function borrowNativeProduct(owner: object): { release(): void } | undefined {
  const holder = holders.get(owner);
  if (!holder || holder.released) return undefined;
  const pins: NativeWorldConsumer[] = [];
  try {
    for (const entry of holder.entries) pins.push(entry.consumer.retain());
  } catch (error) {
    for (const pin of pins) pin.release();
    throw error;
  }
  return {
    release() {
      for (const pin of pins) pin.release();
      pins.length = 0;
    },
  };
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
  const { value, consumer } = encoded.decode();
  try {
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
    const previous = holders.get(owner);
    if (previous?.released) throw new Error('Native output allocation owner was released.');
    for (const entry of previous?.entries ?? []) {
      if (!entry.owned) continue;
      entries.push({ ...entry, consumer: entry.consumer.retain() });
      seen.add(entry.origin);
    }
    for (const root of roots) {
      const holder = holders.get(root);
      if (!holder || holder.released)
        throw new Error('A derived native product has no live scoped allocation owner.');
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
      if (holder.released) throw new Error('Native output allocation owner was released.');
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
