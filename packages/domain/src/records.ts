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
