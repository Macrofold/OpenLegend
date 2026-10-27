import { entityGet } from '@open-legend/domain';
import {
  appraisalPage,
  appraisalPin,
  characterCount,
  knowledgeDocument,
  knowledgePage,
  snapshotRevision,
  canRememberSubject,
  currentBodyObservation,
  currentBodySubjects,
  currentCommunicationSubject,
  distance3D,
  observerDescription,
  worldPosition,
  observerIndividual,
  subjectKey,
  subjectLabel,
  type ObserverSubject,
  type KnowledgeDocument,
  type WorldState,
  type Position,
} from '@open-legend/domain';
import type { GodMindView, MindSubject, MindSubjectPage } from '@open-legend/protocol';
import { z } from 'zod';
import { AuthorityError, scopeKey, type RequestScope } from './authority.js';
import { HistoryCursorError } from './perceived-events.js';
import { digest } from './store.js';
import type { WorldService } from './world-service.js';

/** Private, bounded owner/NPC-inspector projection. The ordinary observer view never
 * receives appraisal labels, cause coverage, social counts or document contents. */
export function continuityView(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  cursor?: string,
): GodMindView {
  if (!service.mayInspectPrivate(actorId, scope))
    throw new Error('Private continuity is unavailable.');
  const world = service.world,
    actor = entityGet(world.entities, actorId);
  if (!actor?.actor) throw new Error('Character unavailable.');
  const fence = digest([
    scopeKey(scope),
    service.generation,
    actorId,
    world.knowledgeRevisions?.[actorId] ?? 0,
    snapshotRevision(world.appraisals?.[actorId]),
  ]);
  let notesAfter: string | null = '',
    feelingsAfter: string | null = '';
  if (cursor) {
    if (cursor.length > 2048) throw new Error('Invalid continuity cursor.');
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as {
      fence: string;
      notes: string | null;
      feelings: string | null;
    };
    if (
      decoded.fence !== fence ||
      (decoded.notes !== null && typeof decoded.notes !== 'string') ||
      (decoded.feelings !== null && typeof decoded.feelings !== 'string')
    )
      throw new Error('Private continuity changed; reload the first page.');
    notesAfter = decoded.notes;
    feelingsAfter = decoded.feelings;
  }
  const notes =
    notesAfter === null ? { values: [], next: null } : knowledgePage(world, actorId, notesAfter);
  const feelings =
    feelingsAfter === null
      ? { values: [], next: null }
      : appraisalPage(world, actorId, feelingsAfter);
  const label = (subjectId: string) => observerDescription(world, actorId, subjectId);
  const general = knowledgeDocument(world, actorId, null);
  const documents =
    general && !notes.values.includes(general) ? [general, ...notes.values] : notes.values;
  return {
    actorId,
    name: actor.name,
    worldId: world.id,
    generation: service.generation,
    revision: world.innerWorlds?.[actorId]?.revision ?? 0,
    acceptedText: world.innerWorlds?.[actorId]?.text,
    documents: [],
    records: [],
    thoughts: [],
    knowledgeLimits: world.knowledgePolicy?.maxCharacters,
    notepads: documents.map((doc) => notepadView(world, actorId, doc)),
    continuity: {
      ...(service.config.godMode &&
      actor.actor.controller === 'npc' &&
      service.currentScope(scope, 'create')
        ? {
            authoring: {
              epoch: service.commandEpoch,
              policies: (world.moduleManifest.appraisals?.definitions ?? [])
                .filter(
                  (definition) =>
                    definition.causes.includes('authored') &&
                    definition.value.kind === 'qualitative',
                )
                .map((definition) => ({ label: definition.label, pin: appraisalPin(definition) })),
            },
          }
        : {}),
      cursor:
        notes.next !== null || feelings.next !== null
          ? Buffer.from(
              JSON.stringify({ fence, notes: notes.next, feelings: feelings.next }),
            ).toString('base64url')
          : null,
      appraisals: feelings.values.map((record) => ({
        id: record.id,
        revision: record.revision,
        label: record.feeling,
        subject: record.targetId ? label(record.targetId) : null,
        value: record.value.kind === 'scaled' ? record.value.value : null,
        lifetime: record.lifetime,
        coverage: record.coverage,
      })),
    },
  };
}

function notepadView(world: WorldState, actorId: string, doc: KnowledgeDocument) {
  return {
    subjectId: doc.subjectId,
    origin: doc.origin,
    label: doc.subjectId ? subjectLabel(world, actorId, doc.subjectId) : 'General knowledge',
    text: doc.text,
    revision: doc.revision,
    characters: characterCount(doc.text),
    maxCharacters:
      world.knowledgePolicy!.maxCharacters[doc.subjectId === null ? 'general' : 'subject'],
  };
}

/** Result page size only; search and continuation reach every candidate.
 * docs/limits/interface.md#qu11 */
const SUBJECT_PAGE = 40;
const GROUPS: Record<MindSubject['status'], number> = { 'in-view': 0, known: 1, 'notes-only': 2 };
const normalized = (text: string) => text.normalize('NFKC').toLocaleLowerCase();
const cursorSchema = z
  .object({ fence: z.string(), group: z.number().int(), key: z.string(), id: z.string() })
  .strict();

/** A subject the private notes/feelings editors may use, as this character knows it.
 * Matches the owner note-save rule: currently recognized, or already has notes. Labels are
 * the character's own names/species descriptions; a global name never enters the result. */
function subjectView(
  world: WorldState,
  actorId: string,
  subjectId: ObserverSubject,
  currentBodies: ReadonlyMap<string, Position>,
): MindSubject | undefined {
  const individual = observerIndividual(world, actorId, subjectId);
  const recognized =
      subjectId.kind === 'entity'
        ? canRememberSubject(world, actorId, subjectId.entityId)
        : !!individual &&
          !individual.seedOnly &&
          (currentBodies.has(subjectKey(subjectId)) ||
            !!individual.voice?.authored ||
            (individual.voice?.samples.length ?? 0) >= 2 ||
            !!individual.sight?.authored ||
            (individual.sight?.samples.length ?? 0) >= 1),
    notes = !!knowledgeDocument(world, actorId, subjectId);
  if (!recognized && !notes) return undefined;
  const observer = entityGet(world.entities, actorId);
  const position = currentBodies.get(subjectKey(subjectId));
  const inView = recognized && !!position && !!observer;
  const status = inView ? 'in-view' : recognized ? 'known' : 'notes-only';
  const detail =
    status === 'in-view'
      ? `In view · ${Math.round(distance3D(worldPosition(observer!), position!))} m away`
      : status === 'known'
        ? 'Recognized'
        : 'Notes only · not currently recognized';
  return {
    id: subjectKey(subjectId),
    subject: subjectId,
    label: subjectLabel(world, actorId, subjectId),
    status,
    detail: notes && status !== 'notes-only' ? `${detail} · has notes` : detail,
  };
}

/** Searchable owner/NPC-inspector subject choices for the private mind editors. The work
 * is one pass over this character's current sightings and note subjects (no storage read). */
export function continuitySubjects(
  service: WorldService,
  actorId: string,
  scope: RequestScope,
  request: { query?: string; after?: string; subjectId?: ObserverSubject },
): MindSubjectPage {
  if (!service.mayInspectPrivate(actorId, scope)) throw new AuthorityError('forbidden');
  const world = service.world;
  if (!entityGet(world.entities, actorId)?.actor) throw new AuthorityError('forbidden');
  const words = normalized(request.query ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const fence = digest([
    scopeKey(scope),
    service.generation,
    actorId,
    words,
    world.knowledgeRevisions?.[actorId] ?? 0,
  ]);
  let after: z.infer<typeof cursorSchema> | undefined;
  if (request.after) {
    try {
      after = cursorSchema.parse(JSON.parse(Buffer.from(request.after, 'base64url').toString()));
    } catch {
      throw new HistoryCursorError('Invalid people page. Search again.');
    }
    if (after.fence !== fence) throw new HistoryCursorError('People changed. Search again.');
  }
  const currentBodies = new Map<string, Position>();
  const currentSubjects: ObserverSubject[] = [];
  for (const lease of Object.values(world.perceptionEvidence?.[actorId]?.current ?? {})) {
    if (lease.value.kind !== 'body') continue;
    const body = currentBodyObservation(world, actorId, lease.subjectId);
    if (!body) continue;
    const supported = currentBodySubjects(world, actorId, lease.subjectId);
    if (!supported.length && !entityGet(world.entities, lease.subjectId)?.actor)
      supported.push({ kind: 'entity', entityId: lease.subjectId });
    for (const subject of supported) {
      currentSubjects.push(subject);
      currentBodies.set(subjectKey(subject), body.value.body.position);
    }
    const known = currentCommunicationSubject(world, actorId, lease.subjectId);
    if (known)
      currentBodies.set(subjectKey({ kind: 'entity', entityId: known }), body.value.body.position);
  }
  if (request.subjectId) {
    // Exact lookup for the note editor: a subject's notes may lie on any notes page.
    const selected = subjectView(world, actorId, request.subjectId, currentBodies);
    const document = selected ? knowledgeDocument(world, actorId, selected.subject) : undefined;
    return {
      ok: true,
      worldId: world.id,
      generation: service.generation,
      subjects: [],
      next: null,
      selected: selected
        ? {
            subject: selected,
            notepad: document ? notepadView(world, actorId, document) : null,
            identity: observerIndividual(world, actorId, selected.subject) ?? null,
          }
        : null,
    };
  }
  const subjects = new Map<string, ObserverSubject>();
  for (const subject of currentSubjects) subjects.set(subjectKey(subject), subject);
  for (const document of Object.values(world.actorKnowledge?.[actorId] ?? {}))
    if (document.subjectId) subjects.set(subjectKey(document.subjectId), document.subjectId);
  for (const identity of Object.values(world.observerIdentities?.[actorId] ?? {})) {
    if (!identity.individualId || identity.seedOnly) continue;
    const subject: ObserverSubject = { kind: 'individual', individualId: identity.individualId };
    subjects.set(subjectKey(subject), subject);
  }
  const order = (
    a: { group: number; key: string; id: string },
    b: { group: number; key: string; id: string },
  ) =>
    a.group - b.group ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const matches = [...subjects.entries()]
    .flatMap(([id, reference]) => {
      const subject = subjectView(world, actorId, reference, currentBodies);
      if (!subject) return [];
      const key = normalized(subject.label);
      return words.every((word) => key.includes(word))
        ? [{ subject, group: GROUPS[subject.status], key, id }]
        : [];
    })
    .filter((entry) => !after || order(entry, after) > 0)
    .sort(order);
  const page = matches.slice(0, SUBJECT_PAGE);
  const last = page.at(-1);
  return {
    ok: true,
    worldId: world.id,
    generation: service.generation,
    subjects: page.map((entry) => entry.subject),
    next:
      matches.length > SUBJECT_PAGE && last
        ? Buffer.from(
            JSON.stringify({ fence, group: last.group, key: last.key, id: last.id }),
          ).toString('base64url')
        : null,
  };
}
