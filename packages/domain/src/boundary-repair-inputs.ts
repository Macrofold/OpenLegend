/** Explicit input units must fit a bounded native phase and its ordinary controls.
 * docs/limits/editable-shelters.md#sh-l16--camp-integrity-repair-and-harmless-light-failure */
export const BOUNDARY_REPAIR_INPUT_LIMIT = 64;
export type BoundaryRepairInputField = `input:repair_${number}`;
export type BoundaryRepairInputs = Partial<Record<BoundaryRepairInputField, string>>;
const inputField = (index: number): BoundaryRepairInputField => `input:repair_${index}`;
const isInputField = (field: string): field is BoundaryRepairInputField =>
  /^input:repair_(0|[1-9][0-9]*)$/.test(field);

export function boundaryRepairInputFields(value: unknown): BoundaryRepairInputField[] {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value)
        .filter(isInputField)
        .sort((a, b) => Number(a.slice(13)) - Number(b.slice(13)))
    : [];
}
export function validBoundaryRepairInputFields(value: unknown): boolean {
  const fields = boundaryRepairInputFields(value);
  return (
    fields.length > 0 &&
    fields.length <= BOUNDARY_REPAIR_INPUT_LIMIT &&
    fields.every((field, index) => field === inputField(index))
  );
}
export function boundaryRepairInputBindings(ids: readonly string[]): BoundaryRepairInputs {
  return Object.fromEntries(ids.map((id, index) => [inputField(index), id]));
}
export function boundaryRepairInputIds(phase: BoundaryRepairInputs): string[] {
  return boundaryRepairInputFields(phase).map((field) => phase[field]!);
}
