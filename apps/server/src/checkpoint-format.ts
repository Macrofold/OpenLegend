// Encoding limits are work bounds, not history retention. Larger individual owners
// must split growing collections in the canonical codec before raising these limits.
export const CHECKPOINT_LIMITS = {
  rowBytes: 1024 * 1024,
  bytes: 256 * 1024 * 1024,
  rows: 2_000_000,
  page: 64,
};
export const CHECKPOINT_ENCODING = 'records-jsonl-1';
