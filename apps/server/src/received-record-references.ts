import {
  receivedFacetValueReferences,
  receivedContactValueReferences,
  type CurrentContact,
  receivedObservationValueReferences,
  type ReceivedObservation,
  type ReceivedFacetValue,
  type ReceivedValueReference,
} from '@open-legend/domain';

export const receivedCurrentOwnerTables = [
  'mind_perception_owners',
  'mind_perception_current',
  'mind_perception_motion_samples',
] as const;

/** Exact shared-value closure of one canonical current-evidence row. Unlike
 * optional resident membership, a stored original remains physically readable
 * until that particular row's replacement/deletion actually commits. */
export function receivedRecordReferences(table: string, value: Record<string, unknown>): string[] {
  let references: ReceivedValueReference[] = [];
  if (table === 'mind_perception_current')
    return [...receivedContactValueReferences(value as unknown as CurrentContact)].sort();
  if (table === 'mind_perception_motion_samples')
    references = receivedFacetValueReferences(
      (value['earlier'] as { value: ReceivedFacetValue }).value,
    );
  if (table === 'mind_perception_owners') {
    const frame = (value['visualConfirmation'] as { frameRef?: ReceivedValueReference } | undefined)
      ?.frameRef;
    references = [
      ...(frame ? [frame] : []),
      ...((value['received'] ?? []) as ReceivedObservation[]).flatMap(
        receivedObservationValueReferences,
      ),
    ];
  }
  return [...new Set(references.filter((ref): ref is string => typeof ref === 'string'))].sort();
}
