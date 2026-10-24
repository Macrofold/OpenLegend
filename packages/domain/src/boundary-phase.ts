import { finitePoint } from '@open-legend/spatial';
import { assemblyHeadings } from './assembly-geometry.js';
import { boundaryRepairInputFields, boundaryRepairInputIds } from './boundary-repair-inputs.js';
import { boundaryOperationFields } from './native-command-contracts.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { BoundaryPhase } from './boundary-types.js';

/** A post's stable local port is a canonical tuple, not an ambiguous joined ID. */
export function boundaryPostSlot(x: number, z: number): string {
  return JSON.stringify([x, z]);
}
export function boundaryPostGrid(slot: string): readonly [number, number] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(slot);
  } catch {
    return;
  }
  if (
    Array.isArray(parsed) &&
    parsed.length === 2 &&
    parsed.every(Number.isSafeInteger) &&
    JSON.stringify(parsed) === slot
  )
    return [parsed[0], parsed[1]];
}
export function validBoundaryPhase(value: unknown): value is BoundaryPhase {
  if (
    !hasRecordFields(
      value,
      [
        'implementation',
        'operation',
        'familyId',
        'familyVersion',
        'familyDigest',
        'requestId',
        'editId',
        'expectedRevision',
        'destination',
        'heading',
        'slot',
        'itemId',
      ],
      [
        'rootId',
        'permissionId',
        'toolId',
        ...boundaryRepairInputFields(value),
        'fromSlot',
        'toSlot',
        'thirdSlot',
        'sectionId',
        'parkingSectionId',
        'rail1Id',
        'rail2Id',
        'binding1',
        'binding2',
        'binding3',
        'binding4',
        'binding5',
        'binding6',
        'destinationId',
      ],
    ) ||
    value.implementation !== 'grounded-panel-boundary' ||
    typeof value.operation !== 'string' ||
    ![
      'post',
      'boundary-panel',
      'boundary-gate',
      'remove-boundary-panel',
      'remove-boundary-gate',
      'reclaim-post',
      'reclaim-lowered',
      'repair-boundary',
    ].includes(value.operation) ||
    !Number.isSafeInteger(value.familyVersion) ||
    Number(value.familyVersion) < 1 ||
    !isSafeRecordId(value.familyDigest) ||
    !Number.isSafeInteger(value.expectedRevision) ||
    Number(value.expectedRevision) < 0 ||
    !finitePoint(value.destination) ||
    !isSafeRecordId(Reflect.get(value.destination, 'surfaceId')) ||
    !assemblyHeadings.some((heading) => heading === value.heading) ||
    !['familyId', 'requestId', 'editId', 'slot', 'itemId'].every((key) =>
      isSafeRecordId(value[key]),
    ) ||
    ![
      'rootId',
      'permissionId',
      'toolId',
      'sectionId',
      'parkingSectionId',
      'rail1Id',
      'rail2Id',
      'binding1',
      'binding2',
      'binding3',
      'binding4',
      'binding5',
      'binding6',
      'destinationId',
    ].every((key) => value[key] === undefined || isSafeRecordId(value[key])) ||
    !['fromSlot', 'toSlot', 'thirdSlot'].every(
      (key) =>
        value[key] === undefined ||
        (typeof value[key] === 'string' && !!boundaryPostGrid(value[key])),
    )
  )
    return false;
  const fields = boundaryOperationFields(value.operation, value);
  if (!fields) return false;
  const required = fields.required;
  const operationFields = [...required, ...(fields.optional ?? [])];
  const specific = [
    'toolId',
    ...boundaryRepairInputFields(value),
    'fromSlot',
    'toSlot',
    'thirdSlot',
    'sectionId',
    'parkingSectionId',
    'rail1Id',
    'rail2Id',
    'binding1',
    'binding2',
    'binding3',
    'binding4',
    'binding5',
    'binding6',
    'destinationId',
  ];
  if (specific.some((key) => value[key] !== undefined && !operationFields.includes(key)))
    return false;
  return (
    required.every((key) => isSafeRecordId(value[key])) &&
    (value.operation !== 'post' ||
      (typeof value.slot === 'string' && !!boundaryPostGrid(value.slot)))
  );
}
export function boundaryPhaseBindings(phase: BoundaryPhase): string[] {
  return [
    phase.binding1,
    phase.binding2,
    phase.binding3,
    phase.binding4,
    phase.binding5,
    phase.binding6,
  ].filter((id): id is string => id !== undefined);
}
/** Kept tools are reserved but never become structural material or acquired origins. */
export function boundaryPhaseInputs(phase: BoundaryPhase): string[] {
  return phase.operation === 'post'
    ? [phase.itemId]
    : phase.operation === 'boundary-panel'
      ? [phase.itemId, ...boundaryPhaseBindings(phase)]
      : phase.operation === 'boundary-gate'
        ? [phase.itemId, phase.rail1Id, phase.rail2Id, ...boundaryPhaseBindings(phase)]
        : phase.operation === 'repair-boundary'
          ? boundaryRepairInputIds(phase)
          : [];
}

export function boundaryPhaseHeldItems(phase: BoundaryPhase): string[] {
  return [...boundaryPhaseInputs(phase), ...(phase.toolId ? [phase.toolId] : [])];
}
