import { current, freeze, isDraft } from 'immer';

/** JSON IDs never name object-prototype members or rely on inherited properties. */
export function isSafeRecordId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 180 &&
    value !== 'prototype' &&
    !Object.hasOwn(Object.prototype, value)
  );
}

export function getOwn<T>(records: Record<string, T>, id: unknown): T | undefined {
  return isSafeRecordId(id) && Object.hasOwn(records, id) ? records[id] : undefined;
}

/** Closed JSON records: required fields must be own properties; extras never
 * silently become owner operations when declarations evolve. */
export function hasRecordFields(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key))
  );
}

const immutableData = new WeakSet<object>();
const jsonEncodings = new WeakMap<object, { json: string; bytes?: number }>();
const encoder = new TextEncoder();

/** Equal received values need the same encoding in comparison and byte accounting.
 * Reuse only complete immutable data; mutable builders always encode afresh. */
function encoding(value: object): { json: string; bytes?: number } {
  const held = jsonEncodings.get(value);
  if (held) return held;
  const json = JSON.stringify(value);
  const encoded = { json };
  if (isImmutableData(value)) jsonEncodings.set(value, encoded);
  return encoded;
}
/** Comparison does not need a second UTF-8 allocation merely to inspect JSON. */
export function jsonText(value: object): string {
  return encoding(value).json;
}
export function jsonEncoding(value: object): { json: string; bytes: number } {
  const held = encoding(value);
  const bytes = (held.bytes ??= encoder.encode(held.json).byteLength);
  return { json: held.json, bytes };
}
/** Memoization needs immutable nested data, not merely a frozen outer record. */
export function isImmutableData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return typeof value !== 'function';
  if (immutableData.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    const keys = Object.keys(value);
    if (
      prototype !== Array.prototype ||
      keys.length !== value.length ||
      keys.some((key, index) => key !== String(index))
    )
      return false;
  } else if (prototype !== Object.prototype && prototype !== null) return false;
  for (const key of Reflect.ownKeys(value)) {
    const field = Object.getOwnPropertyDescriptor(value, key);
    if (!field || !('value' in field) || !isImmutableData(field.value)) return false;
  }
  immutableData.add(value);
  return true;
}

/** Construct an owned immutable JSON graph and establish its proof in the same walk.
 * The view callback resolves current draft children without exposing their proxies.
 * Foreign shallow-frozen inputs are checked, then detached when their children can
 * still change. There is no caller-supplied immutability hint.
 */
export function immutableDataSnapshot<T>(
  value: T,
  view: <V extends object>(value: V) => V = (value) => value,
): T {
  if (!value || typeof value !== 'object') return value;
  const latest = view(value);
  if (isImmutableData(latest)) return latest;
  const memo = new WeakMap<object, object>();
  const copy = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value;
    const latest = view(value);
    if (isImmutableData(latest)) return latest;
    const held = memo.get(latest);
    if (held) return held;
    const array = Array.isArray(latest),
      prototype = Object.getPrototypeOf(latest);
    if (!array && prototype !== Object.prototype && prototype !== null)
      return freeze(structuredClone(isDraft(value) ? current(value) : latest), true);
    const result = array ? new Array(latest.length) : Object.create(prototype);
    memo.set(latest, result);
    // Array elements are part of their serialized value even when an index is
    // non-enumerable. Object.keys would silently erase such received content.
    const keys: Array<string | number> = array ? [] : Object.keys(latest);
    if (array)
      for (let index = 0; index < latest.length; index++) if (index in latest) keys.push(index);
    let immutable = !array || keys.length === latest.length;
    for (const key of keys) {
      const input = (latest as Record<string | number, unknown>)[key];
      const child = input !== null && typeof input === 'object' ? copy(input) : input;
      if (key === '__proto__')
        Object.defineProperty(result, key, {
          value: child,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      else result[key] = child;
      immutable &&=
        child !== null && typeof child === 'object'
          ? immutableData.has(child)
          : typeof child !== 'function';
    }
    Object.freeze(result);
    if (immutable) immutableData.add(result);
    return result;
  };
  return copy(value) as T;
}
