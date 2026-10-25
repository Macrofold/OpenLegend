import type { ExperienceEntry } from './types.js';

/** Existing working-set allowance, never a retained-history or world-size cap. */
export const PERSONAL_EVIDENCE_PREPARATION = { rows: 8192, bytes: 4 * 1024 * 1024 } as const;

/** Exact source identity in the owning world/observer partition. */
export interface PersonalSourceRef {
  kind: ExperienceEntry['source'];
  id: string;
  revision: string;
}
export function validPersonalSourceRef(value: unknown): value is PersonalSourceRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ref = value as PersonalSourceRef;
  return (
    Object.keys(ref).length === 3 &&
    ['awareness', 'memory', 'summary'].includes(ref.kind) &&
    typeof ref.id === 'string' &&
    !!ref.id &&
    typeof ref.revision === 'string' &&
    /^[a-f0-9]{64}$/.test(ref.revision)
  );
}

/** Exact local acquired-fact alias for existing correction/forgetting overlays. */
export const personalFactAlias = (observationId: string, ordinal: number): string =>
  JSON.stringify(['perception-fact', observationId, ordinal]);
