import type { ExperienceEntry } from './types.js';

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
