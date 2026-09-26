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
