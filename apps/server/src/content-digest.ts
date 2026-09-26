import { createHash } from 'node:crypto';

/** Exact serialized-source identity, not semantic equivalence or an access grant. */
export const digest = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
