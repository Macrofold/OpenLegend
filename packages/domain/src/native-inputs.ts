import { isSafeRecordId } from './records.js';

/** Exact material-input roles shared by native actions and finite activity bindings.
 * Each action owner still validates its installed roles, quantities and permissions. */
export function isMaterialInputRole(value: unknown): value is string {
  return isSafeRecordId(value) && /^[a-z][a-z0-9_-]*$/.test(value);
}
export const isNativeInputField = (field: string): boolean =>
  field.startsWith('input:') && isMaterialInputRole(field.slice(6));
