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

/** Candidate routing only: the exact alias still governs semantic revocation. */
export function parsePersonalFactAlias(
  value: string,
): { observationId: string; ordinal: number } | undefined {
  if (!value.startsWith('["perception-fact",')) return;
  try {
    const parts: unknown = JSON.parse(value);
    if (
      !Array.isArray(parts) ||
      parts.length !== 3 ||
      parts[0] !== 'perception-fact' ||
      typeof parts[1] !== 'string' ||
      !parts[1] ||
      !Number.isSafeInteger(parts[2]) ||
      parts[2] < 0 ||
      personalFactAlias(parts[1], parts[2]) !== value
    )
      return;
    return { observationId: parts[1], ordinal: parts[2] };
  } catch {
    return;
  }
}
