import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { ExperienceEntry } from './types.js';
import { canonicalJson } from './events.js';
import {
  speechRoles,
  speechRelationship,
  type PerceivedSpeech,
  type SpeechRoles,
} from './speech.js';
import { hasRecordFields, isSafeRecordId } from './records.js';

export interface ExperienceSourceReference {
  kind: ExperienceEntry['source'];
  id: string;
  revision: string;
}
const encoder = new TextEncoder();
/** Shared preparation capacity, never a forgetting or retained-history rule. */
export const EXPERIENCE_PREPARATION_LIMITS = { rows: 8192, bytes: 4 * 1024 * 1024 } as const;
const hash = (value: string) => bytesToHex(sha256(encoder.encode(value)));
export const experienceRecordRevision = (value: unknown): string => hash(JSON.stringify(value));
export const experienceSourceKey = (source: Pick<ExperienceSourceReference, 'kind' | 'id'>) =>
  JSON.stringify([source.kind, source.id]);
export const experienceEntryKey = (entry: ExperienceEntry) =>
  experienceSourceKey({
    kind: entry.source,
    id: entry.source === 'awareness' ? entry.value.eventId : entry.value.id,
  });

/** Exact current source bytes, matching the persisted personal-account revision.
 * The pure hash works in native/browser code without I/O or provider dependencies.
 * Only selected sources need hashing; their owning partition supplies world/actor.
 */
export function experienceSourceReference(entry: ExperienceEntry): ExperienceSourceReference {
  return {
    kind: entry.source,
    id: entry.source === 'awareness' ? entry.value.eventId : entry.value.id,
    revision: experienceRecordRevision(entry.value),
  };
}

export interface SpeechAttribution {
  speakerId: string | null;
  targetId: string | null;
  addressing: PerceivedSpeech['addressing'];
  observerRelation: SpeechRoles['relationship'];
  acquisition: PerceivedSpeech['perception'];
  intelligibility: PerceivedSpeech['intelligibility'];
  firstAt: number;
  lastAt: number;
  sourceCount: number;
  supportKey: string;
  /** Exact original observer sources. SQL projects these into the dependency index;
   * ordinary model reads receive group coverage, not lifetime leaf bodies. */
  sources: ExperienceSourceReference[];
}
export interface SpeechAttributionManifest {
  version: 1;
  groups: SpeechAttribution[];
}
const versionKey = (source: ExperienceSourceReference) =>
  JSON.stringify([source.kind, source.id, source.revision]);
const orderedSources = (sources: Iterable<ExperienceSourceReference>) =>
  [...sources].sort((a, b) => versionKey(a).localeCompare(versionKey(b)));
const supportKey = (ownerId: string, sources: ExperienceSourceReference[]) =>
  hash(canonicalJson([ownerId, orderedSources(sources)]));

export function validExperienceSourceReference(value: unknown): value is ExperienceSourceReference {
  return (
    hasRecordFields(value, ['kind', 'id', 'revision']) &&
    ['awareness', 'memory', 'summary'].includes(value.kind as string) &&
    isSafeRecordId(value.id) &&
    typeof value.revision === 'string' &&
    /^[a-f0-9]{64}$/.test(value.revision)
  );
}

export function experienceSourceCoverage(
  entries: readonly ExperienceEntry[],
): ExperienceSourceReference[] {
  return orderedSources(
    new Map(
      entries
        .flatMap((entry) => [
          experienceSourceReference(entry),
          ...(entry.source === 'summary' ? entry.value.sources : []),
        ])
        .map((source) => [versionKey(source), source]),
    ).values(),
  );
}

/** The native owner, never model prose, supplies attribution and distinct occurrence
 * coverage. Reusing an original through two child summaries cannot count it twice. */
export function speechAttribution(
  entries: readonly ExperienceEntry[],
  ownerId: string,
): SpeechAttributionManifest {
  const groups = new Map<
    string,
    { meaning: SpeechAttribution; sources: Map<string, ExperienceSourceReference> }
  >();
  const revisions = new Map<string, string>();
  for (const entry of entries) {
    let incoming: SpeechAttribution[] = [];
    if (entry.source === 'summary') {
      if (!validSpeechAttribution(entry.value.attribution, ownerId))
        throw new Error('A selected summary has invalid speech attribution.');
      incoming = entry.value.attribution.groups;
    } else if (entry.source === 'awareness' && entry.value.speech) {
      if (entry.value.actorId !== ownerId) throw new Error('Speech attribution crosses its owner.');
      const roles = speechRoles(entry.value)!;
      incoming = [
        {
          speakerId: roles.sourceId ?? null,
          targetId: roles.targetId ?? null,
          addressing: roles.addressing,
          observerRelation: roles.relationship,
          acquisition: roles.acquisition,
          intelligibility: entry.value.speech.intelligibility,
          firstAt: entry.value.at,
          lastAt: entry.value.at,
          sourceCount: 1,
          supportKey: '',
          sources: [experienceSourceReference(entry)],
        },
      ];
    }
    for (const group of incoming) {
      for (const source of group.sources) {
        const key = experienceSourceKey(source),
          previous = revisions.get(key);
        if (previous && previous !== source.revision)
          throw new Error('Speech attribution contains conflicting source revisions.');
        revisions.set(key, source.revision);
      }
      // An unidentified source or third party is not a claim that several events
      // involved one individual. Keep those uncertain groups occurrence-specific.
      const unbound =
        group.speakerId === null || (group.addressing === 'directed' && group.targetId === null);
      const key = canonicalJson([
        group.speakerId,
        group.targetId,
        group.addressing,
        group.observerRelation,
        group.acquisition,
        group.intelligibility,
        unbound ? group.sources.map(versionKey) : null,
      ]);
      const previous = groups.get(key),
        sources = previous?.sources ?? new Map<string, ExperienceSourceReference>();
      for (const source of group.sources) sources.set(versionKey(source), source);
      groups.set(key, {
        meaning: {
          ...group,
          firstAt: Math.min(previous?.meaning.firstAt ?? group.firstAt, group.firstAt),
          lastAt: Math.max(previous?.meaning.lastAt ?? group.lastAt, group.lastAt),
        },
        sources,
      });
    }
  }
  // Finalize each union once. Sorting and hashing after every incoming record
  // makes a long exchange quadratic even when it belongs to one exact group.
  return {
    version: 1,
    groups: [...groups.values()].map(({ meaning, sources: collected }) => {
      const sources = orderedSources(collected.values());
      return {
        ...meaning,
        sources,
        sourceCount: sources.length,
        supportKey: supportKey(ownerId, sources),
      };
    }),
  };
}

export function validSpeechAttribution(
  value: unknown,
  ownerId: string,
): value is SpeechAttributionManifest {
  if (
    !hasRecordFields(value, ['version', 'groups']) ||
    value.version !== 1 ||
    !Array.isArray(value.groups) ||
    value.groups.length > EXPERIENCE_PREPARATION_LIMITS.rows
  )
    return false;
  const keys = new Set<string>();
  const covered = new Set<string>();
  return value.groups.every((group) => {
    if (
      !hasRecordFields(group, [
        'speakerId',
        'targetId',
        'addressing',
        'observerRelation',
        'acquisition',
        'intelligibility',
        'firstAt',
        'lastAt',
        'sourceCount',
        'supportKey',
        'sources',
      ]) ||
      !(group.speakerId === null || isSafeRecordId(group.speakerId)) ||
      !(group.targetId === null || isSafeRecordId(group.targetId)) ||
      !(
        group.addressing === null ||
        group.addressing === 'ambient' ||
        group.addressing === 'directed'
      ) ||
      !['self', 'addressed', 'overheard', 'ambient', 'seen'].includes(
        group.observerRelation as string,
      ) ||
      !['self', 'heard', 'seen'].includes(group.acquisition as string) ||
      !['none', 'partial', 'clear'].includes(group.intelligibility as string) ||
      typeof group.firstAt !== 'number' ||
      !Number.isFinite(group.firstAt) ||
      typeof group.lastAt !== 'number' ||
      !Number.isFinite(group.lastAt) ||
      group.firstAt > group.lastAt ||
      !Array.isArray(group.sources) ||
      !group.sources.length ||
      group.sources.some(
        (source) => !validExperienceSourceReference(source) || source.kind !== 'awareness',
      ) ||
      group.sourceCount !== group.sources.length ||
      new Set(group.sources.map((source) => versionKey(source as ExperienceSourceReference)))
        .size !== group.sources.length
    )
      return false;
    const sources = group.sources as ExperienceSourceReference[];
    if (new Set(sources.map(experienceSourceKey)).size !== sources.length) return false;
    for (const source of sources) {
      const key = versionKey(source);
      if (covered.has(key)) return false;
      covered.add(key);
    }
    if (covered.size > EXPERIENCE_PREPARATION_LIMITS.rows) return false;
    const acquisition = group.acquisition as PerceivedSpeech['perception'];
    const addressing = group.addressing as PerceivedSpeech['addressing'];
    if (
      group.observerRelation !==
        speechRelationship(ownerId, group.targetId as string | null, {
          perception: acquisition,
          addressing,
        }) ||
      (acquisition === 'self') !== (group.speakerId === ownerId) ||
      (acquisition === 'self' && group.intelligibility !== 'clear') ||
      (acquisition === 'seen' &&
        (addressing !== null || group.targetId !== null || group.intelligibility !== 'none')) ||
      (acquisition !== 'seen' && addressing === null) ||
      (addressing === 'ambient' && group.targetId !== null)
    )
      return false;
    if (group.supportKey !== supportKey(ownerId, sources) || keys.has(group.supportKey as string))
      return false;
    keys.add(group.supportKey as string);
    return true;
  });
}

export function validExperienceSummary(
  value: unknown,
  ownerId: string,
): value is import('./experience.js').ExperienceSummary {
  if (
    !hasRecordFields(
      value,
      ['id', 'text', 'from', 'to', 'sources', 'attribution', 'entityIds', 'importance'],
      ['sequence', 'revision'],
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
    value.sources.length > EXPERIENCE_PREPARATION_LIMITS.rows ||
    value.sources.some((source) => !validExperienceSourceReference(source)) ||
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
    encoder.encode(JSON.stringify(value)).byteLength > EXPERIENCE_PREPARATION_LIMITS.bytes ||
    !validSpeechAttribution(value.attribution, ownerId)
  )
    return false;
  const references = new Set((value.sources as ExperienceSourceReference[]).map(versionKey));
  return (
    references.size === value.sources.length &&
    value.attribution.groups.every(
      (group) =>
        group.firstAt >= (value.from as number) &&
        group.lastAt <= (value.to as number) &&
        group.sources.every((source) => references.has(versionKey(source))),
    )
  );
}
