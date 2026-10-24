import { hasRecordFields, isSafeRecordId } from './records.js';
import type { DefinitionPin } from './world-modules.js';

export function isDefinitionPin(value: unknown): value is DefinitionPin {
  return (
    hasRecordFields(value, ['id', 'version', 'digest']) &&
    isSafeRecordId(value.id) &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) > 0 &&
    typeof value.digest === 'string' &&
    value.digest.length > 0 &&
    value.digest.length <= 128
  );
}

export function sameDefinitionPin(a: DefinitionPin, b: DefinitionPin): boolean {
  return a.id === b.id && a.version === b.version && a.digest === b.digest;
}
