import {
  experienceEntryKey,
  speechDescription,
  type ExperienceEntry,
  type MemoryRecord,
} from '@open-legend/domain';
import type { AttentionCandidate } from './recall.js';
import { digest } from './content-digest.js';
import { historicalAccountText } from './entity-references.js';

/** Permission/attribution is supplied by the selected read owner. Formatting
 * cannot resolve another actor, inspect a world, or manufacture an experience. */
export interface MemoryCandidateRead {
  readonly actorId: string;
  readonly permittedEntities: ReadonlySet<string>;
  readonly occurrenceLabels: readonly string[];
  readonly experience: NonNullable<AttentionCandidate['experience']>[number];
  readonly embeddingText: string;
  readonly time: (at: number) => string;
}
export function formatMemoryCandidate(
  memory: MemoryRecord,
  read: MemoryCandidateRead,
  requiredIds: ReadonlySet<string>,
  automaticIds: ReadonlySet<string>,
  conversationIds: ReadonlySet<string>,
  corrections: Readonly<Record<string, string>>,
  correctedIds: ReadonlySet<string>,
  entry: ExperienceEntry,
): AttentionCandidate {
  const { actorId, permittedEntities, experience } = read;
  const awareness = entry.source === 'awareness' ? entry.value : undefined;
  const matches = (ids: ReadonlySet<string>) =>
    ids.has(memory.id) || (memory.eventId ? ids.has(memory.eventId) : false);
  let summary = memory.summary.replace(/\(ID:([^()\s]+)\)/g, (marker, id: string) =>
    permittedEntities.has(id) ? marker : '',
  );
  // Preserve who spoke to whom using this observer's event-time evidence. An ongoing
  // exposure can bind an unnamed speaker; an old canonical ID cannot identify a new exposure.
  // docs/memory-architecture.md#personal-perspective-and-acquisition
  if (awareness?.speech) {
    summary = speechDescription(awareness.speech, {
      observerId: actorId,
      targetId: awareness.targetId,
    });
  } else if (awareness && awareness.eventType !== 'speech') {
    for (const label of read.occurrenceLabels) summary += label;
  }
  const required =
    matches(requiredIds) ||
    (memory.kind === 'commitment' && !memory.resolved) ||
    !!corrections[memory.id] ||
    correctedIds.has(memory.id);
  // Presentation metadata alone is not structured evidence. Avoid rendering the
  // complete source again just to decide whether equivalent prose may be grouped.
  const hasStructuredExperience = !!(
    memory.evidence ||
    memory.observation ||
    memory.observations?.length ||
    memory.manifest ||
    memory.impression
  );
  return {
    id: experienceEntryKey(entry),
    experience: [experience],
    kind: matches(conversationIds) ? 'conversation' : 'memory',
    text: `${read.time(memory.at)} [${memory.source}]: ${summary}`,
    hasStructuredExperience,
    subjects: [
      ...(memory.evidence?.sourceSubject ? [memory.evidence.sourceSubject] : []),
      ...(memory.manifest?.speech.flatMap((group) =>
        group.sourceSubject ? [group.sourceSubject] : [],
      ) ?? []),
      ...[
        ...(memory.observation ? [memory.observation] : []),
        ...(memory.manifest?.observations ?? []),
      ].flatMap((observation) =>
        observation.facets.flatMap((facet) =>
          facet.value.kind === 'association' ? [facet.value.subject] : [],
        ),
      ),
    ],
    embeddingText: read.embeddingText,
    revision: awareness ? digest(memory) : digest({ ...memory, summary }),
    required,
    requiredSource: required,
    automatic: matches(automaticIds),
    entityIds: [...permittedEntities].filter(
      (id) => id !== actorId || memory.entityIds.includes(id),
    ),
    at: memory.at,
    salience: memory.importance,
    sourceIds: [memory.id],
    sourceKeys: [experienceEntryKey(entry)],
  };
}

/** The same grouping rules apply to complete already-permitted Source/native
 * memory candidates. Named identity is an independently captured input. */
export function groupMemoryCandidates(
  memories: AttentionCandidate[],
  namedMemoryIds: ReadonlySet<string>,
  time: (at: number) => string,
  recentMemoryLimit: number,
): AttentionCandidate[] {
  // The recent baseline counts complete individual experiences, before optional
  // repetition grouping. Eight groups can contain an unbounded personal history.
  // docs/memory-architecture.md#4-jev-attention-before-context-inclusion
  const recentMemories = new Set(
    memories
      .filter((memory) => memory.kind === 'memory')
      .sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))
      .slice(0, recentMemoryLimit)
      .map((memory) => memory.id),
  );
  const candidates: AttentionCandidate[] = [];
  const duplicateMemories = new Map<string, AttentionCandidate>();
  for (const memory of memories) {
    if (recentMemories.has(memory.id)) memory.required = true;
    // Named others remain individual episodes; generic species recall has no actor handles.
    // The observer's own identity does not prevent grouping encounters with unnamed animals.
    // docs/memory-architecture.md#named-and-generic-memory-subjects
    const namedOther = namedMemoryIds.has(memory.id);
    if (memory.required || memory.automatic || namedOther || memory.hasStructuredExperience) {
      candidates.push(memory);
      continue;
    }
    // Repeated speech is still a distinct turn in a conversation.
    const timePrefix = `${time(memory.at)} `;
    const content = memory.text.startsWith(timePrefix)
      ? memory.text.slice(timePrefix.length)
      : memory.text;
    const key = `${memory.kind}:${content.trim().replace(/\s+/g, ' ').toLocaleLowerCase()}`;
    const existing = memory.kind === 'conversation' ? undefined : duplicateMemories.get(key);
    if (!existing) {
      duplicateMemories.set(key, memory);
      candidates.push(memory);
      continue;
    }
    existing.sourceIds!.push(...(memory.sourceIds ?? []));
    existing.sourceKeys!.push(...(memory.sourceKeys ?? []));
    existing.experience!.push(...(memory.experience ?? []));
    existing.entityIds = [...new Set([...existing.entityIds, ...memory.entityIds])];
    existing.salience = Math.max(existing.salience, memory.salience);
    existing.revision = digest([existing.revision, memory.revision].sort());
    if (memory.at > existing.at) {
      existing.at = memory.at;
      existing.text = memory.text;
    }
  }
  for (const memory of candidates) {
    memory.embeddingText ??= memory.text;
    memory.text = historicalAccountText(memory.text);
  }
  for (const memory of candidates)
    if (memory.sourceIds && memory.sourceIds.length > 1)
      memory.text += ` (${memory.sourceIds.length} records contain this same remembered content.)`;
  return candidates;
}
