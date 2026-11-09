import { entityGet } from '@open-legend/domain';
import {
  characterCount,
  knowledgeDocument,
  knowledgeKey,
  knowledgePage,
  currentCommunicationSubject,
  currentBodySubjects,
  subjectKey,
  validObserverSubject,
  subjectLabel,
  observerIndividual,
  type ObserverSubject,
  type WorldState,
} from '@open-legend/domain';
import { entityLabel, historicalAccountText } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';
import { createHash } from 'node:crypto';

export const noteReference = (actorId: string, subjectId: ObserverSubject): string =>
  `note-${createHash('sha256')
    .update(JSON.stringify([actorId, subjectKey(subjectId)]))
    .digest('hex')
    .slice(0, 32)}`;

/** A document reference permits editing remembered prose, never targeting a perceived body. */
export function selectedKnowledgeReferences(
  world: WorldState,
  actorId: string,
  candidates: AttentionCandidate[],
): Record<string, ObserverSubject> {
  const references: Record<string, ObserverSubject> = {};
  for (const candidate of candidates) {
    if (!candidate.id.startsWith('notepad:')) continue;
    const doc = world.actorKnowledge?.[actorId]?.[candidate.id.slice('notepad:'.length)];
    if (!doc || !validObserverSubject(doc.subjectId)) continue;
    const reference = noteReference(actorId, doc.subjectId);
    if (references[reference] && subjectKey(references[reference]) !== subjectKey(doc.subjectId))
      throw new Error('Knowledge reference collision.');
    references[reference] = doc.subjectId;
  }
  return references;
}

export function generalKnowledgeContext(world: WorldState, actorId: string) {
  return formatGeneralKnowledgeContext(
    knowledgeDocument(world, actorId, null),
    world.knowledgePolicy?.maxCharacters.general,
  );
}

/** Both native and Source context reads use the same selected private pad.
 * This formatter cannot acquire another subject or grant an edit reference. */
export function formatGeneralKnowledgeContext(
  doc: ReturnType<typeof knowledgeDocument>,
  maxCharacters: number | undefined,
) {
  const seeded = doc?.origin === 'authored-starting' && !!doc.text;
  return {
    subjectId: null,
    revision: doc?.revision ?? 0,
    origin: doc?.origin ?? null,
    ...(seeded ? { provenance: 'Authored starting understanding' } : {}),
    characters: characterCount(doc?.text ?? ''),
    maxCharacters,
    text: historicalAccountText(doc?.text ?? ''),
  };
}

/** Exact lookup handles involved subjects; optional pads reuse the existing scoped recall index.
 * docs/knowledge.md#context-selection
 */
export function subjectKnowledgeCandidates(
  world: WorldState,
  actorId: string,
  involved: Set<string>,
  optionalIds?: readonly string[],
): AttentionCandidate[] {
  const involvedSubjects = new Set(
    [...involved].flatMap((entityId) =>
      currentBodySubjects(world, actorId, entityId).map(subjectKey),
    ),
  );
  const ids = new Set(
    optionalIds ?? knowledgePage(world, actorId).values.map((doc) => knowledgeKey(doc.subjectId)),
  );
  for (const id of involved) ids.add(knowledgeKey({ kind: 'entity', entityId: id }));
  for (const id of involved)
    for (const subject of currentBodySubjects(world, actorId, id)) ids.add(knowledgeKey(subject));
  return [...ids].flatMap((id) => {
    const doc = world.actorKnowledge?.[actorId]?.[id];
    if (!doc) return [];
    if (doc.subjectId === null || !doc.text) return [];
    if (doc.subjectId.kind === 'place' || doc.subjectId.kind === 'map-marker') {
      // Map annotations supply beliefs, never physical targets or model edit handles.
      const label =
        doc.subjectId.kind === 'map-marker'
          ? (world.mapMarkers?.[actorId]?.[doc.subjectId.markerId]?.label ?? 'a map marker')
          : 'a known place';
      return [
        {
          id: `notepad:${id}`,
          kind: 'knowledge' as const,
          text: `Your map note about ${label}; read-only annotation, not an entity reference.\n${historicalAccountText(doc.text)}`,
          embeddingText: `Map note about ${label}: ${doc.text}`,
          revision: JSON.stringify([doc.subjectId.kind, doc.revision, label]),
          required: false,
          automatic: false,
          entityIds: [],
          at: world.simTime,
          salience: 3,
        },
      ];
    }
    const entity =
      doc.subjectId.kind === 'entity'
        ? entityGet(world.entities, doc.subjectId.entityId)
        : undefined;
    const bound =
      doc.subjectId.kind === 'individual'
        ? !!observerIndividual(world, actorId, doc.subjectId)
        : doc.subjectId.entityId === actorId ||
          currentCommunicationSubject(world, actorId, doc.subjectId.entityId) ===
            doc.subjectId.entityId;
    const identity = observerIndividual(world, actorId, doc.subjectId);
    const name = identity?.nickname || identity?.givenName;
    const label =
      entity && bound
        ? entityLabel(world, entity, actorId)
        : subjectLabel(world, actorId, doc.subjectId);
    return [
      formatSubjectKnowledgeCandidate({
        id,
        actorId,
        doc,
        subject: doc.subjectId,
        label,
        bound,
        name,
        required:
          doc.subjectId.kind === 'entity'
            ? bound && involved.has(doc.subjectId.entityId)
            : involvedSubjects.has(subjectKey(doc.subjectId)),
        maxCharacters: world.knowledgePolicy!.maxCharacters.subject,
        at: world.simTime,
      }),
    ];
  });
}

/** Native and Source readers separately prove subject binding and select the
 * actual document. The ordinary wording and reference format are shared. */
export function formatSubjectKnowledgeCandidate(read: {
  readonly id: string;
  readonly actorId: string;
  readonly doc: NonNullable<ReturnType<typeof knowledgeDocument>>;
  readonly subject: ObserverSubject;
  readonly label: string;
  readonly bound: boolean;
  readonly name: string | undefined;
  readonly required: boolean;
  readonly maxCharacters: number;
  readonly at: number;
}): AttentionCandidate {
  const { id, actorId, doc, subject, label, bound, name } = read;
  return {
    id: `notepad:${id}`,
    kind: 'knowledge',
    text: `Notepad ${noteReference(actorId, subject)} about ${label}${bound ? '' : '; no current identity binding'}; revision ${doc.revision}; ${doc.origin === 'authored-starting' ? 'authored starting understanding' : 'actor-edited understanding'}. ${characterCount(doc.text)}/${read.maxCharacters} characters.\n${historicalAccountText(doc.text)}`,
    embeddingText: `Notes about ${name || 'a subject'}: ${doc.text}`,
    revision: JSON.stringify([doc.revision, name ?? '']),
    required: read.required,
    automatic: false,
    entityIds: bound && subject.kind === 'entity' ? [subject.entityId] : [],
    at: read.at,
    salience: 3,
  };
}
