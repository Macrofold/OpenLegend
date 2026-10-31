import {
  receivedFacetValueReferences,
  receivedObservationValueReferences,
  type ReceivedObservation,
  type ReceivedFacetValue,
  type ReceivedValueReference,
} from '@open-legend/domain';

/** Exact shared-value closure of one canonical current-evidence row. Unlike
 * optional resident membership, a stored original remains physically readable
 * until that particular row's replacement/deletion actually commits. */
export function receivedRecordReferences(
  table: string,
  value: Record<string, unknown>,
): Record<string, number[]> {
  let references: ReceivedValueReference[] = [];
  if (table === 'mind_perception_originals')
    references = receivedObservationValueReferences(value as unknown as ReceivedObservation);
  if (table === 'mind_perception_current')
    references = receivedFacetValueReferences(value['value'] as ReceivedFacetValue);
  if (table === 'mind_perception_motion_samples')
    references = receivedFacetValueReferences(
      (value['earlier'] as { value: ReceivedFacetValue }).value,
    );
  if (table === 'mind_perception_owners') {
    const frame = (
      value['visualConfirmation'] as { frameRef?: readonly [string, number] } | undefined
    )?.frameRef;
    if (frame) references = [{ blockId: frame[0], valueOrdinal: frame[1] }];
  }
  const blocks = new Map<string, Set<number>>();
  for (const reference of references) {
    let ordinals = blocks.get(reference.blockId);
    if (!ordinals) blocks.set(reference.blockId, (ordinals = new Set()));
    ordinals.add(reference.valueOrdinal);
  }
  return Object.fromEntries([...blocks].map(([id, ordinals]) => [id, [...ordinals]]));
}
