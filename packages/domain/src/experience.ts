import { migrateKnowledge } from './knowledge-migration.js';
import {
  editKnowledge,
  knowledgeDocument,
  advanceKnowledgeRevision,
  type KnowledgeEdit,
} from './knowledge.js';
import {
  assignGivenName,
  canRememberSubject,
  rememberSubject,
  type GivenNameEdit,
} from './worlds/base/knowledge.js';
import { dreamStatus, dreamPolicy } from './cognition-policy.js';
import { current, isDraft } from 'immer';
import { changeGoal, type GoalChange } from './agency.js';
import { initializeIdentity } from './identity.js';
import { hasMemory } from './living.js';
import { draftWorld, finishWorld, cloneValue } from './draft.js';
import { byteCount, mindFor, wordCount } from './mind.js';
import { canonicalJson, finish, outcome } from './events.js';
import { memoryPerspective } from './memory-perspective.js';
import type { ExperienceEntry, MemoryRecord, Transition, WorldState } from './types.js';

export const EXPERIENCE_LIMITS = {
  rawHours: 6,
  recallRaw: 512,
  conversationSpeech: 512,
  protectedImportance: 8,
  backlog: 8192,
  summaryBytes: 1200,
  historyDays: 30,
} as const;
export interface Awareness {
  entityEpisodes?: Record<string, string>;
  speech?: import('./speech.js').PerceivedSpeech;
  eventId: string;
  actorId: string;
  text: string;
  at: number;
  sequence: number;
  modality: 'heard' | 'observed' | 'felt' | 'internal';
  recognized: boolean;
  intelligible: boolean;
  entityIds: string[];
  importance: number;
  /** How quickly this experience should interrupt an in-flight response, from 0–10. */
  urgency?: number;
  /** Stable event-time trigger semantics survive rotation of the bounded world-event feed. */
  eventType?: string;
  sourceId?: string;
  targetId?: string;
  /** Intended speech recipient, only when perceived at event time; not proof of delivery. */
  intendedRecipientId?: string;
  triggerKind?:
    | 'addressed_speech'
    | 'overheard_speech'
    | 'self_event'
    | 'directed_action'
    | 'observed_event';
  content?: string;
}
export interface ExperienceSummary {
  id: string;
  text: string;
  from: number;
  to: number;
  sourceIds: string[];
  entityIds: string[];
  importance: number;
  sequence?: number;
  revision?: number;
}
export interface ExperienceState {
  version: 1;
  perspectiveVersion?: 1;
  corrections?: Record<string, Record<string, string>>;
  awareness: Record<string, Awareness[]>;
  summaries: Record<string, ExperienceSummary[]>;
  consolidatedAt: Record<string, number>;
  forgotten: Record<string, string[]>;
}
export interface InnerWorld {
  text: string;
  revision: number;
  files: { path: string; text: string }[];
  sourceSnapshot: string;
  publicationJobId: string;
  evidenceIds: string[];
  reconsiderationRequired?: boolean;
}

export function experienceEntry(
  world: WorldState,
  actorId: string,
  key: string,
): ExperienceEntry | undefined {
  const separator = key.indexOf(':');
  const source = key.slice(0, separator);
  const id = key.slice(separator + 1);
  if (source === 'awareness') {
    const value = world.experience?.awareness[actorId]?.find((entry) => entry.eventId === id);
    return value && { source, value };
  }
  if (source === 'memory') {
    const value = world.memories[actorId]?.find((entry) => entry.id === id);
    return value && { source, value };
  }
  if (source === 'summary') {
    const value = world.experience?.summaries[actorId]?.find((entry) => entry.id === id);
    return value && { source, value };
  }
  return undefined;
}

export type ExperienceMutation =
  | { operation: 'add'; entry: ExperienceEntry }
  | { operation: 'update'; entryId: string; entry: ExperienceEntry }
  | { operation: 'delete'; entryId: string };

export function experienceEntries(
  world: WorldState,
  actorId: string,
): Map<string, ExperienceEntry> {
  const entries = new Map<string, ExperienceEntry>();
  for (const value of world.experience?.awareness[actorId] ?? [])
    entries.set(`awareness:${value.eventId}`, { source: 'awareness', value });
  for (const value of world.memories[actorId] ?? [])
    entries.set(`memory:${value.id}`, { source: 'memory', value });
  for (const value of world.experience?.summaries[actorId] ?? [])
    entries.set(`summary:${value.id}`, { source: 'summary', value });
  return entries;
}

function stableExperienceUpdate(previous: ExperienceEntry, next: ExperienceEntry): boolean {
  if (previous.source !== next.source) return false;
  const editable =
    previous.source === 'awareness'
      ? new Set(
          previous.value.eventType === 'speech' || previous.value.speech
            ? ['importance']
            : ['text', 'content', 'importance'],
        )
      : previous.source === 'memory'
        ? new Set(['summary', 'importance'])
        : new Set(['text', 'importance']);
  const before = previous.value as unknown as Record<string, unknown>;
  const after = next.value as unknown as Record<string, unknown>;
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].every(
    (key) => editable.has(key) || canonicalJson(before[key]) === canonicalJson(after[key]),
  );
}

type IdentifiedEntry = { id?: string; eventId?: string };
type IdentityField = 'id' | 'eventId';
const additionIndexes = new WeakMap<
  object,
  { length: number; field: IdentityField; ids: Set<string | undefined> }
>();
/** IDs cannot be edited and removals replace the array. Only this mutation owner's draft
 * additions reuse a membership index; unowned mutable builders always read their live array.
 * docs/performance.md#simulation-cpu-and-growing-history
 */
function containsEntryId<T extends IdentifiedEntry>(
  entries: T[] | undefined,
  id: string,
  field: IdentityField,
): boolean {
  if (!entries) return false;
  if (!isDraft(entries)) return entries.some((entry) => entry[field] === id);
  let index = additionIndexes.get(entries);
  if (!index || index.length !== entries.length || index.field !== field) {
    // Read retained history without creating one Immer proxy per old experience.
    index = { length: entries.length, field, ids: new Set(current(entries).map((e) => e[field])) };
    additionIndexes.set(entries, index);
  }
  return index.ids.has(id);
}
function appendEntry<T extends IdentifiedEntry>(
  entries: T[],
  entry: T,
  field: IdentityField,
): void {
  const index = additionIndexes.get(entries),
    length = entries.length;
  entries.push(entry);
  if (index?.length === length && index.field === field) {
    index.ids.add(entry[field]);
    index.length = entries.length;
  } else additionIndexes.delete(entries);
}
function containsExperienceKey(world: WorldState, actorId: string, key: string): boolean {
  const separator = key.indexOf(':'),
    source = key.slice(0, separator),
    id = key.slice(separator + 1);
  if (source === 'awareness')
    return containsEntryId(world.experience?.awareness[actorId], id, 'eventId');
  if (source === 'memory') return containsEntryId(world.memories[actorId], id, 'id');
  if (source === 'summary') return containsEntryId(world.experience?.summaries[actorId], id, 'id');
  return false;
}

/** The one authoritative path for creator mutation of retained experience. */
export function mutateExperience(
  world: WorldState,
  actorId: string,
  mutation:
    | ExperienceMutation
    | ExperienceMutation[]
    | { operation: 'consolidate'; retiredIds: string[]; summaries: ExperienceSummary[] }
    | { operation: 'correct'; sourceId: string; correctionEventId: string }
    | {
        operation: 'obligation';
        id: string;
        expectedRevision: number;
        obligation: NonNullable<MemoryRecord['obligation']>;
      },
): string[] | null {
  if (!world.experience) migrateCognition(world);
  if (!hasMemory(world.entities[actorId])) return null;
  const additionsOnly = Array.isArray(mutation)
    ? mutation.every((change) => change.operation === 'add')
    : mutation.operation === 'add';
  if (!additionsOnly)
    for (const entries of [
      world.experience!.awareness[actorId],
      world.memories[actorId],
      world.experience!.summaries[actorId],
    ])
      if (entries) additionIndexes.delete(entries);
  if (!Array.isArray(mutation) && mutation.operation === 'consolidate') {
    const used = new Set(mutation.retiredIds);
    if (
      (world.memories[actorId] ?? []).some(
        (m) =>
          m.kind === 'commitment' && !m.resolved && (used.has(m.id) || used.has(m.eventId ?? '')),
      )
    )
      return null;
    if (
      mutation.summaries.some((s) =>
        s.sourceIds.some((id) => world.experience!.forgotten[actorId]?.includes(id)),
      )
    )
      return null;
    const state = world.experience!;
    state.summaries[actorId] = cloneValue(mutation.summaries);
    state.awareness[actorId] = (state.awareness[actorId] ?? []).filter((a) => !used.has(a.eventId));
    world.memories[actorId] = (world.memories[actorId] ?? []).filter(
      (m) => m.kind !== 'episode' || (!used.has(m.id) && !used.has(m.eventId ?? '')),
    );
    state.consolidatedAt[actorId] = world.simTime;
    return [...used];
  }
  if (!Array.isArray(mutation) && mutation.operation === 'correct') {
    if (
      !world.experience!.awareness[actorId]?.some(
        (a) => a.eventId === mutation.correctionEventId,
      ) ||
      mutation.sourceId === mutation.correctionEventId
    )
      return null;
    const invalidated = invalidateExperience(world, actorId, [mutation.sourceId]);
    ((world.experience!.corrections ??= {})[actorId] ??= {})[mutation.sourceId] =
      mutation.correctionEventId;
    return invalidated;
  }
  if (!Array.isArray(mutation) && mutation.operation === 'obligation') {
    const memory = world.memories[actorId]?.find(
      (m) => m.id === mutation.id && m.kind === 'commitment',
    );
    if (
      !memory?.obligation ||
      memory.resolved ||
      memory.obligation.revision !== mutation.expectedRevision ||
      mutation.obligation.revision !== mutation.expectedRevision + 1 ||
      mutation.obligation.evidenceId !== memory.obligation.evidenceId
    )
      return null;
    memory.obligation = cloneValue(mutation.obligation);
    memory.resolved = ['fulfilled', 'cancelled'].includes(mutation.obligation.status);
    const inner = world.innerWorlds?.[actorId];
    if (inner) inner.reconsiderationRequired = true;
    return [memory.id];
  }
  const mutations = Array.isArray(mutation) ? mutation : [mutation];
  if (!mutations.length) return [];
  if (mutations.some((change) => change.operation === 'add')) {
    if (mutations.some((change) => change.operation !== 'add')) {
      const candidate = draftWorld(world);
      const updates = mutateExperience(
        candidate,
        actorId,
        mutations.filter((change) => change.operation !== 'add'),
      );
      if (!updates) return null;
      const additions = mutateExperience(
        candidate,
        actorId,
        mutations.filter((change) => change.operation === 'add'),
      );
      if (!additions) return null;
      const committed = finishWorld(candidate);
      world.experience = committed.experience;
      world.memories = committed.memories;
      world.minds = committed.minds;
      world.innerWorlds = committed.innerWorlds;
      world.actorKnowledge = committed.actorKnowledge;
      world.observerIdentities = committed.observerIdentities;
      world.knowledgeRevisions = committed.knowledgeRevisions;
      return [...new Set([...updates, ...additions])];
    }
    const additions = mutations.map((change) => {
      if (change.operation !== 'add') throw new Error('Mixed experience mutation batch.');
      return cloneValue(change.entry);
    });
    const keys = additions.map((entry) =>
      entry.source === 'awareness'
        ? `awareness:${entry.value.eventId}`
        : `${entry.source}:${entry.value.id}`,
    );
    if (
      new Set(keys).size !== keys.length ||
      keys.some(
        (key) =>
          containsExperienceKey(world, actorId, key) ||
          world.experience?.forgotten[actorId]?.includes(key.slice(key.indexOf(':') + 1)),
      ) ||
      additions.some(
        (entry) =>
          entry.source === 'memory' &&
          entry.value.eventId &&
          world.experience?.forgotten[actorId]?.includes(entry.value.eventId),
      ) ||
      additions.some((entry) => 'actorId' in entry.value && entry.value.actorId !== actorId)
    )
      return null;
    for (const entry of additions) {
      if (entry.source === 'awareness')
        appendEntry((world.experience!.awareness[actorId] ??= []), entry.value, 'eventId');
      else if (entry.source === 'memory')
        appendEntry((world.memories[actorId] ??= []), entry.value, 'id');
      else appendEntry((world.experience!.summaries[actorId] ??= []), entry.value, 'id');
    }
    return [];
  }

  if (
    new Set(mutations.map((change) => (change.operation === 'add' ? '' : change.entryId))).size !==
    mutations.length
  )
    return null;
  const entries = experienceEntries(world, actorId);
  const resolved = mutations.map((change) => ({
    change,
    previous: change.operation === 'add' ? undefined : entries.get(change.entryId),
  }));
  if (resolved.some(({ previous }) => !previous)) return null;
  const replacements = new Map<ExperienceEntry, ExperienceEntry['value']>();
  for (const { change, previous } of resolved) {
    if (!previous || change.operation !== 'update') continue;
    if (!stableExperienceUpdate(previous, change.entry)) return null;
    const replacement = cloneValue(change.entry.value);
    if ('actorId' in replacement && replacement.actorId !== actorId) return null;
    replacements.set(previous, replacement);
  }
  const removed = new Set(
    resolved
      .filter(({ change }) => change.operation === 'delete')
      .map(({ previous }) =>
        previous!.source === 'awareness' ? previous!.value.eventId : previous!.value.id,
      ),
  );
  if (
    (world.memories[actorId] ?? []).some(
      (memory) =>
        memory.kind === 'commitment' &&
        !memory.resolved &&
        [memory.id, memory.eventId, memory.obligation?.evidenceId].some(
          (id) => !!id && removed.has(id),
        ),
    )
  )
    return null;
  const updatedSources: string[] = [];
  const rankingSources: string[] = [];
  const deletedSources: string[] = [];
  for (const { change, previous } of resolved) {
    if (!previous || change.operation === 'add') return null;
    const sourceId = previous.source === 'awareness' ? previous.value.eventId : previous.value.id;
    if (change.operation === 'update') {
      const awarenessTextChanged =
        previous.source === 'awareness' &&
        change.entry.source === 'awareness' &&
        previous.value.text !== change.entry.value.text;
      const awarenessContentChanged =
        previous.source === 'awareness' &&
        change.entry.source === 'awareness' &&
        previous.value.content !== change.entry.value.content;
      const replacement = replacements.get(previous)!;
      const proseChanged =
        previous.source === 'awareness'
          ? awarenessTextChanged || awarenessContentChanged
          : previous.source === 'memory'
            ? previous.value.summary !== (replacement as MemoryRecord).summary
            : previous.value.text !== (replacement as ExperienceSummary).text;
      Object.assign(previous.value, replacement);
      if (previous.source === 'awareness' && awarenessTextChanged && !awarenessContentChanged)
        previous.value.content = previous.value.text;
      if (previous.source === 'summary')
        previous.value.revision = (previous.value.revision ?? 0) + 1;
      // Ranking edits refresh retrieval without erasing accepted prose or its dependencies.
      // See docs/architecture.md#public-updates-and-owner-editors.
      (proseChanged ? updatedSources : rankingSources).push(sourceId);
    } else {
      deletedSources.push(sourceId);
      if (previous.source === 'memory' && previous.value.eventId)
        deletedSources.push(previous.value.eventId);
    }
  }
  const invalidated = new Set<string>(rankingSources);
  if (updatedSources.length)
    for (const id of invalidateExperience(world, actorId, updatedSources)) invalidated.add(id);
  if (deletedSources.length)
    for (const id of invalidateExperience(world, actorId, deletedSources, true))
      invalidated.add(id);
  return [...invalidated];
}
export function flattenFiles(files: InnerWorld['files']): string {
  const paths = new Set<string>();
  if (!files.length || files.length > 10) throw new Error('The inner world requires 1–10 files.');
  for (const file of files) {
    if (!/^[\p{L}\p{N}_ -]{1,64}\.md$/u.test(file.path) || paths.has(file.path))
      throw new Error('Invalid or duplicate inner-world filename.');
    if (
      wordCount(file.path + ' ' + file.text) > 500 ||
      byteCount(file.path + '\n' + file.text) > 8000
    )
      throw new Error('Inner-world file quota exceeded; content was not truncated.');
    paths.add(file.path);
  }
  return [...files]
    .sort((a, b) => a.path.localeCompare(b.path, 'en'))
    .map((f) => `# ${f.path}\n${f.text}`)
    .join('\n\n');
}
/** Historical name retained for callers; only initialize newly capable actors.
 * Never fill absent roles from raw events: absence can mean an unidentified voice.
 * docs/hearing-and-speech.md#5-one-occurrence-listener-specific-evidence */
export function migrateCognition(world: WorldState): void {
  initializeIdentity(world);
  world.experience ??= {
    version: 1,
    awareness: {},
    summaries: {},
    consolidatedAt: {},
    forgotten: {},
  };
  world.innerWorlds ??= {};
  for (const entity of Object.values(world.entities)) {
    if (!hasMemory(entity)) continue;
    world.experience.awareness[entity.id] ??= [];
    if (world.innerWorlds[entity.id]) continue;
    const mind = ((world.minds ??= {})[entity.id] ??= mindFor(world, entity.id));
    const files = mind.documents.map((doc) => ({
      path: `${doc.id}.md`,
      text: `${doc.title}\n\n${doc.text}`,
    }));
    world.innerWorlds[entity.id] = {
      text: [...files]
        .sort((a, b) => a.path.localeCompare(b.path, 'en'))
        .map((file) => `# ${file.path}\n${file.text}`)
        .join('\n\n'),
      files,
      revision: mind.revision,
      sourceSnapshot: 'actor-initialization',
      publicationJobId: 'actor-initialization',
      evidenceIds: mind.documents.flatMap((d) => d.evidence.map((e) => e.id)),
    };
  }
  migrateKnowledge(world);
}
/** One projection for recall and derived speech indexing; never consult the raw world event. */
export function awarenessMemory(entry: Awareness): MemoryRecord {
  return {
    id: entry.eventId,
    eventId: entry.eventId,
    actorId: entry.actorId,
    at: entry.at,
    sequence: entry.sequence,
    kind: 'episode',
    source: entry.modality,
    summary: entry.text,
    entityIds: entry.entityIds,
    importance: entry.importance,
    eventType: entry.eventType,
    speakerId: entry.sourceId,
  };
}
export function experiences(
  world: WorldState,
  actorId: string,
  includeBacklog = false,
): MemoryRecord[] {
  // Public query IDs never resolve inherited Object prototype members.
  if (!Object.hasOwn(world.entities, actorId) || !world.entities[actorId]?.actor) return [];
  const state = world.experience;
  const forgotten = new Set(state?.forgotten[actorId] ?? []);
  const aware = state?.awareness[actorId] ?? [];
  const eventIds = new Set(aware.map((a) => a.eventId));
  const personal = (world.memories[actorId] ?? []).filter(
    (m) =>
      !forgotten.has(m.id) &&
      !forgotten.has(m.eventId ?? '') &&
      !(m.eventId && eventIds.has(m.eventId) && m.kind === 'episode') &&
      (m.kind === 'commitment' || (m.kind === 'episode' && m.source !== 'inferred')),
  );
  const events: MemoryRecord[] = aware
    .filter((a) => !forgotten.has(a.eventId))
    .map(awarenessMemory);
  const summaries: MemoryRecord[] = (state?.summaries[actorId] ?? [])
    .filter(
      (s) => !s.sourceIds.some((id) => forgotten.has(id) || !!state?.corrections?.[actorId]?.[id]),
    )
    .map((s) => ({
      id: s.id,
      actorId,
      at: s.to,
      kind: 'reflection',
      source: 'inferred',
      summary: `Summary of remembered experience: ${s.text}`,
      entityIds: s.entityIds,
      importance: s.importance,
      sequence: s.sequence,
    }));
  const raw = [...personal.filter((m) => m.kind !== 'commitment'), ...events];
  // Age makes a source eligible for consolidation, not ineligible for remembering.
  // Bound initial context candidates while retaining the full backlog for maintenance.
  const eligible = includeBacklog
    ? raw
    : raw
        .sort(
          (a, b) =>
            Number(b.importance >= EXPERIENCE_LIMITS.protectedImportance) -
              Number(a.importance >= EXPERIENCE_LIMITS.protectedImportance) ||
            b.at - a.at ||
            b.importance - a.importance,
        )
        .slice(0, EXPERIENCE_LIMITS.recallRaw);
  return [...personal.filter((m) => m.kind === 'commitment'), ...eligible, ...summaries];
}
export interface MemoryGroup {
  sourceIds: string[];
  text: string;
}
/** Apply an explicit partition of the supplied sources. Uncovered sources never retire.
 * Important incidents are copied exactly and individually; only routine memories merge.
 */
export function acceptConsolidation(
  input: WorldState,
  actorId: string,
  id: string,
  sources: MemoryRecord[],
  groups: MemoryGroup[],
): Transition {
  const reject = (message: string): Transition => ({
    world: input,
    events: [],
    outcome: outcome(false, 'consolidation-rejected', message),
  });
  if (!input.experience || !sources.length || !groups.length)
    return reject('Invalid memory groups.');
  if (input.experience.summaries[actorId]?.some((s) => s.id.startsWith(`${id}:`)))
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'duplicate', 'Memory groups already accepted.'),
    };
  const current = new Map(experiences(input, actorId, true).map((m) => [m.id, m]));
  const expected = new Map(sources.map((m) => [m.id, m]));
  if (
    expected.size !== sources.length ||
    sources.some(
      (s) =>
        !['episode', 'reflection'].includes(s.kind) ||
        JSON.stringify(current.get(s.id)) !== JSON.stringify(s),
    )
  )
    return reject('Source coverage changed.');
  const used = new Set<string>();
  for (const group of groups) {
    if (
      !group.sourceIds.length ||
      !group.text.trim() ||
      byteCount(group.text) > EXPERIENCE_LIMITS.summaryBytes
    )
      return reject('Invalid memory group.');
    for (const sourceId of group.sourceIds) {
      if (!expected.has(sourceId) || used.has(sourceId))
        return reject('Unknown or repeated source.');
      used.add(sourceId);
    }
    const important = group.sourceIds
      .map((id) => expected.get(id)!)
      .filter((s) => s.importance >= EXPERIENCE_LIMITS.protectedImportance);
    if (important.length && (group.sourceIds.length !== 1 || group.text !== important[0]!.summary))
      return reject('Important incidents must remain separate and unchanged.');
  }
  if (used.size !== sources.length)
    return reject('Every supplied source requires explicit coverage.');
  const world = draftWorld(input);
  const state = world.experience!;
  const previous = new Map((state.summaries[actorId] ?? []).map((s) => [s.id, s]));
  // Retention is separate from consolidation: distinct memories never compete for summary slots.
  // docs/memory-architecture.md#retention-corrections-and-protected-commitments
  const retained = [...previous.values()].filter((s) => !used.has(s.id));
  const replacements = groups.map((group, i): ExperienceSummary => {
    const entries = group.sourceIds.map((id) => expected.get(id)!);
    const existing = group.sourceIds
      .map((id) => previous.get(id))
      .filter((s): s is ExperienceSummary => !!s);
    // Keep an existing identity when revising a memory, instead of appending one per job.
    return {
      id: existing[0]?.id ?? `${id}:${i}`,
      revision: Math.max(0, ...existing.map((s) => s.revision ?? 0)) + 1,
      text: memoryPerspective(world, actorId, group.text),
      from: Math.min(...entries.map((s) => previous.get(s.id)?.from ?? s.at)),
      to: Math.max(...entries.map((s) => s.at)),
      sourceIds: [...new Set(entries.flatMap((s) => previous.get(s.id)?.sourceIds ?? [s.id]))],
      entityIds: [...new Set(entries.flatMap((s) => s.entityIds))],
      importance: Math.max(...entries.map((s) => s.importance)),
      sequence: Math.max(0, ...entries.map((s) => s.sequence ?? 0)),
    };
  });
  const invalidated = mutateExperience(world, actorId, {
    operation: 'consolidate',
    retiredIds: [...used],
    summaries: [...retained, ...replacements].sort(
      (a, b) => a.to - b.to || a.id.localeCompare(b.id),
    ),
  });
  if (!invalidated) return reject('Protected or forgotten sources changed.');
  const result = finish(
    world,
    [],
    outcome(true, 'consolidated', 'Explicit memory groups accepted; covered sources retired.'),
  );
  return { ...result, invalidatedMemoryIds: { [actorId]: invalidated } };
}
/** Forget derivatives conservatively; original evidence of other observers is untouched. */
export function forgetExperience(input: WorldState, actorId: string, sourceId: string): Transition {
  if (
    (input.memories[actorId] ?? []).some(
      (memory) =>
        memory.kind === 'commitment' &&
        !memory.resolved &&
        [memory.id, memory.eventId, memory.obligation?.evidenceId].includes(sourceId),
    )
  )
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'commitment',
        'Resolve protected obligations before forgetting their evidence.',
      ),
    };
  const world = draftWorld(input);
  migrateCognition(world);
  const key = world.experience!.awareness[actorId]?.some((entry) => entry.eventId === sourceId)
    ? `awareness:${sourceId}`
    : world.memories[actorId]?.some((entry) => entry.id === sourceId)
      ? `memory:${sourceId}`
      : world.experience!.summaries[actorId]?.some((entry) => entry.id === sourceId)
        ? `summary:${sourceId}`
        : null;
  const invalidated = key
    ? mutateExperience(world, actorId, { operation: 'delete', entryId: key })!
    : invalidateExperience(world, actorId, [sourceId], true);
  if (!invalidated)
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'commitment',
        'Resolve protected obligations before forgetting their evidence.',
      ),
    };
  return {
    ...finish(world, [], outcome(true, 'forgotten', 'Recall and derived inner world invalidated.')),
    invalidatedMemoryIds: { [actorId]: invalidated },
  };
}

/** Mutates a domain draft; callers commit cache invalidation with the resulting world. */
export function invalidateExperience(
  world: WorldState,
  actorId: string,
  sourceIds: string[],
  forget = false,
): string[] {
  const state = world.experience!;
  const affected = new Set(sourceIds);
  for (const memory of world.memories[actorId] ?? [])
    if (memory.eventId && affected.has(memory.eventId)) affected.add(memory.id);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const [source, correction] of Object.entries(state.corrections?.[actorId] ?? {}))
      if (affected.has(correction) && !affected.has(source)) {
        affected.add(source);
        expanded = true;
      }
    for (const summary of state.summaries[actorId] ?? [])
      if (!affected.has(summary.id) && summary.sourceIds.some((id) => affected.has(id))) {
        affected.add(summary.id);
        expanded = true;
      }
  }
  if (forget) {
    state.forgotten[actorId] = [...new Set([...(state.forgotten[actorId] ?? []), ...affected])];
    state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
      (a) => !affected.has(a.eventId),
    );
    world.memories[actorId] = (world.memories[actorId] ?? []).filter(
      (m) => (m.kind === 'commitment' && !m.resolved) || !affected.has(m.id),
    );
    const corrections = state.corrections?.[actorId];
    if (corrections)
      for (const [id, evidence] of Object.entries(corrections))
        if (affected.has(id) || affected.has(evidence)) delete corrections[id];
  }
  // Privacy invalidation must also reach accepted canvases and observer identity associations.
  // docs/knowledge.md#privacy-and-correction
  advanceKnowledgeRevision(world, actorId);
  if (world.actorKnowledge?.[actorId]) {
    for (const document of Object.values(world.actorKnowledge[actorId]!)) {
      document.text = '';
      document.evidenceIds = [];
      document.revision++;
    }
  }
  if (forget && world.observerIdentities?.[actorId]) world.observerIdentities[actorId] = {};
  const roots = new Set(sourceIds);
  const summaries = state.summaries[actorId] ?? [];
  const retained = summaries.filter((s) => !affected.has(s.id) || (!forget && roots.has(s.id)));
  if (retained.length !== summaries.length) state.summaries[actorId] = retained;
  const inner = world.innerWorlds?.[actorId];
  const mind = mindFor(world, actorId);
  const identity = mind.documents.filter((d) => d.protected);
  mind.documents = identity;
  mind.records = mind.records.filter((r) => identity.some((d) => d.id === r.documentId));
  mind.thoughts = [];
  mind.revision++;
  (world.minds ??= {})[actorId] = mind;
  if (inner) {
    inner.files = identity.map((d) => ({ path: `${d.id}.md`, text: `${d.title}\n${d.text}` }));
    inner.text = flattenFiles(inner.files);
    inner.revision++;
    inner.evidenceIds = [];
    inner.reconsiderationRequired = true;
    mind.revision = inner.revision;
  }
  return [...affected];
}

export function publishInnerWorld(
  input: WorldState,
  actorId: string,
  expectedRevision: number,
  jobId: string,
  snapshot: string,
  files: InnerWorld['files'],
  thoughts: string[],
  evidenceIds: string[],
  dreamEpisode: string | null,
  _processedThrough = 0,
  goalChanges: GoalChange[] = [],
  knowledgeChanges: KnowledgeEdit[] = [],
  nameChanges: GivenNameEdit[] = [],
  permittedSubjects: string[] = [],
  expectedEncounters?: Record<string, string>,
  knowledgeReferences: Record<string, string> = {},
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'publication-rejected', message),
  });
  const prior = input.innerWorlds?.[actorId];
  const actor = input.entities[actorId]?.actor;
  if (prior?.publicationJobId === jobId)
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'duplicate', 'Snapshot already published.'),
    };
  if (
    !prior ||
    prior.revision !== expectedRevision ||
    !actor?.alive ||
    actor.incapacitated ||
    input.paused
  )
    return reject('Actor or accepted revision changed.');
  if (
    dreamEpisode &&
    (dreamStatus(input, input.entities[actorId])?.episode !== dreamEpisode ||
      dreamStatus(input, input.entities[actorId])!.elapsedSeconds < dreamPolicy(input).afterSeconds)
  )
    return reject('Dream interrupted.');
  if (
    !thoughts.length ||
    thoughts.length > 3 ||
    thoughts.some((t) => wordCount(t) > 20 || !t.trim())
  )
    return reject('Invalid presentation thoughts.');
  let text: string;
  try {
    text = flattenFiles(files);
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid files.');
  }
  const mind = mindFor(input, actorId);
  for (const document of mind.documents.filter((d) => d.protected)) {
    const old = prior.files.find((f) => f.path === `${document.id}.md`);
    if (old && !files.some((f) => f.path === old.path && f.text === old.text))
      return reject('Essential identity must be preserved.');
  }
  const forgotten = new Set(input.experience?.forgotten[actorId] ?? []);
  if (evidenceIds.some((id) => forgotten.has(id))) return reject('Evidence was forgotten.');
  const world = draftWorld(input);
  if (knowledgeChanges.length > 16 || nameChanges.length > 16)
    return reject('Too many knowledge changes.');
  if (
    expectedEncounters &&
    [
      ...nameChanges,
      ...knowledgeChanges.filter(
        (edit) => !edit.subjectId || !Object.hasOwn(knowledgeReferences, edit.subjectId),
      ),
    ].some(
      (edit) =>
        edit.subjectId &&
        expectedEncounters[edit.subjectId] !==
          world.perceptionEpisodes?.[actorId]?.[edit.subjectId],
    )
  )
    return reject('A knowledge subject encounter changed during reflection.');
  for (const edit of nameChanges) {
    const result = assignGivenName(world, actorId, edit, permittedSubjects);
    if (!result.ok) return reject(result.message);
  }
  for (const edit of knowledgeChanges) {
    const rememberedSubject =
      edit.subjectId && Object.hasOwn(knowledgeReferences, edit.subjectId)
        ? knowledgeReferences[edit.subjectId]
        : undefined;
    const subjectId = rememberedSubject ?? edit.subjectId;
    if (
      subjectId !== null &&
      (rememberedSubject
        ? !knowledgeDocument(world, actorId, subjectId)
        : !canRememberSubject(world, actorId, subjectId))
    )
      return reject('Knowledge subject is not recognized.');
    const result = editKnowledge(
      world,
      actorId,
      { ...edit, subjectId },
      rememberedSubject ? [rememberedSubject] : permittedSubjects,
      evidenceIds,
    );
    if (!result.ok) return reject(result.message);
    if (subjectId !== null && !rememberedSubject) rememberSubject(world, actorId, subjectId);
  }
  if (goalChanges.length > 8 || (actor.controller === 'player' && goalChanges.length))
    return reject('Reflection cannot replace player intentions or exceed eight goal changes.');
  for (const [index, change] of goalChanges.entries()) {
    const result = changeGoal(
      world.entities[actorId]!.actor!,
      change,
      `${jobId}:goal:${index}`,
      'actor',
    );
    if (!result.ok) return reject(result.message);
  }
  world.innerWorlds![actorId] = {
    text,
    files: cloneValue(files),
    revision: prior.revision + 1,
    sourceSnapshot: snapshot,
    publicationJobId: jobId,
    evidenceIds,
  };
  mind.revision++;
  mind.documents = files.map((f) => ({
    id: f.path.slice(0, -3),
    title: f.path.slice(0, -3),
    text: f.text,
    revision: mind.revision,
    protected: mind.documents.some((d) => d.protected && `${d.id}.md` === f.path),
    evidence: [],
  }));
  mind.records = mind.records.filter(
    (r) =>
      ['identity', 'commitment', 'appraisal'].includes(r.kind) &&
      mind.documents.some((d) => d.id === r.documentId),
  );
  mind.thoughts.push(
    ...thoughts.map((text) => ({
      decisionId: jobId,
      at: world.simTime,
      text,
      kind: dreamEpisode ? ('dream' as const) : ('reflection' as const),
      source: dreamEpisode ? ('imagined' as const) : ('inferred' as const),
    })),
  );
  mind.thoughts = mind.thoughts.slice(-100);
  mind.lastReflectionAt = world.simTime;
  // Reflection revisits memories; the legacy watermark is deliberately not advanced.
  if (dreamEpisode) mind.lastDreamEpisode = dreamEpisode;
  (world.minds ??= {})[actorId] = mind;
  return finish(
    world,
    [],
    outcome(true, 'snapshot-published', 'Inner world published atomically.'),
  );
}

export function correctExperience(
  input: WorldState,
  actorId: string,
  sourceId: string,
  correctionEventId: string,
): Transition {
  const aware = input.experience?.awareness[actorId]?.find((a) => a.eventId === correctionEventId);
  const retained = experiences(input, actorId, true);
  if (!aware || !retained.some((m) => m.id === sourceId) || sourceId === correctionEventId)
    return {
      world: input,
      events: [],
      outcome: outcome(
        false,
        'correction-rejected',
        'Correction requires newly perceived evidence and a retained source.',
      ),
    };
  const world = draftWorld(input);
  const invalidated = mutateExperience(world, actorId, {
    operation: 'correct',
    sourceId,
    correctionEventId,
  })!;
  return {
    ...finish(
      world,
      [],
      outcome(
        true,
        'corrected',
        'Correction linked; affected summaries invalidated and beliefs flagged for reconsideration.',
      ),
    ),
    invalidatedMemoryIds: { [actorId]: invalidated },
  };
}
