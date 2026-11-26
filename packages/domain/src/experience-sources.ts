import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { ExperienceEntry } from './types.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import {
  PERSONAL_EVIDENCE_PREPARATION,
  validPersonalSourceRef,
  type PersonalSourceRef,
} from './experience-source.js';
import { validateExperienceManifest } from './experience-manifest.js';
const encoder = new TextEncoder();
export const experienceRecordRevision = (value: unknown): string =>
  bytesToHex(sha256(encoder.encode(JSON.stringify(value))));
export const experienceSourceKey = (source: Pick<PersonalSourceRef, 'kind' | 'id'>): string =>
  JSON.stringify([source.kind, source.id]);
export const experienceEntryKey = (entry: ExperienceEntry): string =>
  experienceSourceKey({
    kind: entry.source,
    id: entry.source === 'awareness' ? entry.value.eventId : entry.value.id,
  });
export function experienceSourceReference(entry: ExperienceEntry): PersonalSourceRef {
  return {
    kind: entry.source,
    id: entry.source === 'awareness' ? entry.value.eventId : entry.value.id,
    revision: experienceRecordRevision(entry.value),
  };
}
export function experienceSourceCoverage(entries: readonly ExperienceEntry[]): PersonalSourceRef[] {
  const sources = new Map<string, PersonalSourceRef>();
  for (const entry of entries)
    for (const source of entry.source === 'summary'
      ? entry.value.sources
      : [experienceSourceReference(entry)])
      sources.set(JSON.stringify(source), source);
  return [...sources.values()];
}
export function validExperienceSummary(
  value: unknown,
  ownerId: string,
): value is import('./experience.js').ExperienceSummary {
  if (
    !hasRecordFields(
      value,
      ['id', 'text', 'from', 'to', 'sources', 'manifest', 'entityIds', 'importance'],
      ['sequence', 'revision', 'retention'],
    ) ||
    !isSafeRecordId(value.id) ||
    typeof value.text !== 'string' ||
    !value.text.trim() ||
    value.text.length > 20_000 ||
    typeof value.from !== 'number' ||
    !Number.isFinite(value.from) ||
    value.from < 0 ||
    typeof value.to !== 'number' ||
    !Number.isFinite(value.to) ||
    value.to < value.from ||
    !Array.isArray(value.sources) ||
    !value.sources.length ||
    value.sources.length > PERSONAL_EVIDENCE_PREPARATION.rows ||
    value.sources.some((source) => !validPersonalSourceRef(source)) ||
    !Array.isArray(value.entityIds) ||
    value.entityIds.some((id) => !isSafeRecordId(id)) ||
    typeof value.importance !== 'number' ||
    !(value.importance >= 0 && value.importance <= 10) ||
    (value.sequence !== undefined &&
      !(
        typeof value.sequence === 'number' &&
        Number.isSafeInteger(value.sequence) &&
        value.sequence >= 0
      )) ||
    (value.revision !== undefined &&
      !(
        typeof value.revision === 'number' &&
        Number.isSafeInteger(value.revision) &&
        value.revision >= 0
      )) ||
    encoder.encode(JSON.stringify(value)).byteLength > PERSONAL_EVIDENCE_PREPARATION.bytes
  )
    return false;
  try {
    validateExperienceManifest(value.manifest);
  } catch {
    return false;
  }
  return (
    value.manifest.observations.every((observation) => observation.observer.actorId === ownerId) &&
    new Set(value.sources.map((source) => JSON.stringify(source))).size === value.sources.length
  );
}
