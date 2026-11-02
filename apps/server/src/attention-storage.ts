import { rebuildAttentionScheduling, type AttentionState } from '@open-legend/domain';

/** Dirty keys schedule a recheck; saved cursors, latches and next due time own
 * continuation. Do not store an insert/delete pair for every completed recheck. */
export function encodeAttentionStorage(value: unknown): unknown {
  const { relationDirty: _dirty, ...saved } = value as AttentionState;
  return saved;
}
export function decodeAttentionStorage(value: unknown): AttentionState {
  const state = value as Omit<AttentionState, 'relationDirty'>;
  return rebuildAttentionScheduling(state);
}
