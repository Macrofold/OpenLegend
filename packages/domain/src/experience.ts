import { byteCount, mindFor, wordCount } from './mind.js';
import { finish, outcome } from './events.js';
import type { MemoryRecord, Transition, WorldState } from './types.js';

export const EXPERIENCE_LIMITS = {
  rawHours: 6,
  backlog: 8192,
  summaries: 256,
  summaryBytes: 1200,
  historyDays: 30,
} as const;
export interface Awareness {
  eventId: string;
  actorId: string;
  text: string;
  at: number;
  sequence: number;
  modality: 'heard' | 'observed';
  recognized: boolean;
  intelligible: boolean;
  entityIds: string[];
  importance: number;
}
export interface ExperienceSummary {
  id: string;
  text: string;
  from: number;
  to: number;
  sourceIds: string[];
  entityIds: string[];
  importance: number;
}
export interface ExperienceState {
  version: 1;
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
/** Additive migration: legacy payloads remain audit data; only proven event copies are deduplicated. */
export function migrateCognition(world: WorldState): void {
  const initial = !world.experience;
  world.schemaVersion = 2;
  world.experience ??= {
    version: 1,
    awareness: {},
    summaries: {},
    consolidatedAt: {},
    forgotten: {},
  };
  world.innerWorlds ??= {};
  for (const entity of Object.values(world.entities)) {
    if (!entity.actor || world.innerWorlds[entity.id]) continue;
    const mind = mindFor(world, entity.id);
    const files = mind.documents.map((doc) => ({
      path: `${doc.id}.md`,
      text: `${doc.title}\n\n${doc.text}${mind.records
        .filter((r) => r.documentId === doc.id && r.kind !== 'identity')
        .map(
          (r) =>
            `\nLegacy ${r.kind}${r.subjectId ? ` about ${world.entities[r.subjectId]?.name ?? 'an unidentified person'}` : ''}: ${r.source}, ${r.status}, confidence ${r.confidence}${r.trust !== null ? `, directional trust ${r.trust}` : ''}.`,
        )
        .join('')}`,
    }));
    // Legacy imports preserve over-quota content until an explicit migration reconciles it.
    const text = [...files]
      .sort((a, b) => a.path.localeCompare(b.path, 'en'))
      .map((f) => `# ${f.path}\n${f.text}`)
      .join('\n\n');
    world.innerWorlds[entity.id] = {
      text,
      files,
      revision: mind.revision,
      sourceSnapshot: 'legacy-import',
      publicationJobId: 'legacy-import',
      evidenceIds: mind.documents.flatMap((d) => d.evidence.map((e) => e.id)),
    };
    world.experience.awareness[entity.id] ??= (initial ? world.events : [])
      .filter((e) => e.audience.includes(entity.id))
      .map((e) => ({
        eventId: e.id,
        actorId: entity.id,
        text: e.text,
        at: e.at,
        sequence: Number(e.id.split('-').at(-1)) || 0,
        modality: e.type === 'speech' ? 'heard' : 'observed',
        recognized: true,
        intelligible: true,
        entityIds: [e.actorId, e.targetId].filter((id): id is string => !!id),
        importance: e.type === 'speech' ? 7 : 3,
      }));
  }
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
  const cutoff = world.simTime - EXPERIENCE_LIMITS.rawHours * 3600;
  const personal = (world.memories[actorId] ?? []).filter(
    (m) =>
      !forgotten.has(m.id) &&
      !forgotten.has(m.eventId ?? '') &&
      !(m.eventId && eventIds.has(m.eventId) && m.kind === 'episode') &&
      (m.kind === 'commitment' || (m.kind === 'episode' && m.source !== 'inferred')) &&
      (includeBacklog || m.kind === 'commitment' || m.at >= cutoff),
  );
  const events: MemoryRecord[] = aware
    .filter((a) => !forgotten.has(a.eventId) && (includeBacklog || a.at >= cutoff))
    .map((a) => ({
      id: a.eventId,
      eventId: a.eventId,
      actorId,
      at: a.at,
      sequence: a.sequence,
      kind: 'episode',
      source: a.modality,
      summary: a.text,
      entityIds: a.entityIds,
      importance: a.importance,
    }));
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
    }));
  return [...personal, ...events, ...summaries];
}
export function acceptConsolidation(
  input: WorldState,
  actorId: string,
  id: string,
  sources: MemoryRecord[],
  text: string,
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'consolidation-rejected', message),
  });
  if (
    !input.experience ||
    !sources.length ||
    byteCount(text) > EXPERIENCE_LIMITS.summaryBytes ||
    !text.trim()
  )
    return reject('Invalid summary.');
  if (input.experience.summaries[actorId]?.some((s) => s.id === id))
    return {
      world: input,
      events: [],
      outcome: outcome(true, 'duplicate', 'Summary already accepted.'),
    };
  const current = experiences(input, actorId, true);
  if (
    sources.some(
      (s) =>
        s.kind !== 'episode' ||
        s.at >= input.simTime - 21600 ||
        !current.some((c) => c.id === s.id && c.summary === s.summary),
    )
  )
    return reject('Source coverage changed.');
  const world = structuredClone(input);
  const state = world.experience!;
  const covered = new Set(sources.map((s) => s.id));
  state.summaries[actorId] = (state.summaries[actorId] ?? []).filter(
    (s) => s.to >= world.simTime - EXPERIENCE_LIMITS.historyDays * 86400 || s.importance >= 9,
  );
  const list = (state.summaries[actorId] ??= []);
  if (list.length >= EXPERIENCE_LIMITS.summaries)
    return reject('Summary capacity requires retention review.');
  list.push({
    id,
    text,
    from: Math.min(...sources.map((s) => s.at)),
    to: Math.max(...sources.map((s) => s.at)),
    sourceIds: [...covered],
    entityIds: [...new Set(sources.flatMap((s) => s.entityIds))],
    importance: Math.max(...sources.map((s) => s.importance)),
  });
  state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
    (a) => !covered.has(a.eventId),
  );
  world.memories[actorId] = (world.memories[actorId] ?? []).filter(
    (m) => m.kind !== 'episode' || (!covered.has(m.id) && !covered.has(m.eventId ?? '')),
  );
  state.consolidatedAt[actorId] = world.simTime;
  const retained = new Set(Object.values(state.awareness).flatMap((a) => a.map((e) => e.eventId)));
  world.events = world.events.filter((e) => retained.has(e.id));
  return finish(
    world,
    [],
    outcome(true, 'consolidated', 'Summary accepted and covered raw sources retired.'),
  );
}
/** Forget derivatives conservatively; original evidence of other observers is untouched. */
export function forgetExperience(input: WorldState, actorId: string, sourceId: string): Transition {
  const world = structuredClone(input);
  migrateCognition(world);
  const state = world.experience!;
  const forgotten = new Set(state.forgotten[actorId] ?? []);
  forgotten.add(sourceId);
  for (const summary of state.summaries[actorId] ?? [])
    if (summary.sourceIds.includes(sourceId)) forgotten.add(summary.id);
  state.forgotten[actorId] = [...forgotten];
  state.awareness[actorId] = (state.awareness[actorId] ?? []).filter(
    (a) => !forgotten.has(a.eventId),
  );
  state.summaries[actorId] = (state.summaries[actorId] ?? []).filter((s) => !forgotten.has(s.id));
  world.memories[actorId] = (world.memories[actorId] ?? []).filter(
    (m) =>
      (m.kind === 'commitment' && !m.resolved) ||
      (!forgotten.has(m.id) && !forgotten.has(m.eventId ?? '')),
  );
  const inner = world.innerWorlds?.[actorId];
  if (inner) {
    const identity = mindFor(world, actorId).documents.filter((d) => d.protected);
    inner.files = identity.map((d) => ({ path: `${d.id}.md`, text: `${d.title}\n${d.text}` }));
    inner.text = flattenFiles(inner.files);
    inner.revision++;
    inner.evidenceIds = [];
    inner.reconsiderationRequired = true;
    const mind = mindFor(world, actorId);
    mind.documents = identity;
    mind.records = mind.records.filter((r) => identity.some((d) => d.id === r.documentId));
    mind.thoughts = [];
    mind.revision = inner.revision;
    (world.minds ??= {})[actorId] = mind;
  }
  return finish(
    world,
    [],
    outcome(true, 'forgotten', 'Recall and derived inner world invalidated.'),
  );
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
  processedThrough = 0,
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
    (actor.action?.id !== dreamEpisode || !actor.rest?.asleep || actor.rest.sleepingSeconds < 7200)
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
  const world = structuredClone(input);
  world.innerWorlds![actorId] = {
    text,
    files: structuredClone(files),
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
  mind.processedWatermark = Math.max(
    mind.processedWatermark,
    processedThrough,
    ...experiences(input, actorId, true)
      .filter((m) => evidenceIds.includes(m.id))
      .map((m) => m.sequence ?? 0),
  );
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
  const world = structuredClone(input);
  const state = world.experience!;
  ((state.corrections ??= {})[actorId] ??= {})[sourceId] = correctionEventId;
  // Historical witnessing is unchanged; derived summaries are now ineligible.
  const inner = world.innerWorlds?.[actorId];
  if (inner) {
    inner.reconsiderationRequired = true;
    inner.revision++;
  }
  return finish(
    world,
    [],
    outcome(
      true,
      'corrected',
      'Correction linked; affected summaries invalidated and beliefs flagged for reconsideration.',
    ),
  );
}
