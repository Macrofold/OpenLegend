import { entityGet } from '@open-legend/domain';
import {
  characterCount,
  knowledgeDocument,
  recognizesSubject,
  subjectKey,
  subjectLabel,
  observerIndividual,
  type ObserverSubject,
  type WorldState,
} from '@open-legend/domain';
import { entityLabel, projectEntityMarkers } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';
import { createHash } from 'node:crypto';

const noteReference = (actorId: string, subjectId: ObserverSubject): string =>
  `note-${createHash('sha256').update(JSON.stringify([actorId, subjectKey(subjectId)])).digest('hex').slice(0, 32)}`;

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
    if (!doc?.subjectId) continue;
    const reference = noteReference(actorId, doc.subjectId);
    if (references[reference] && subjectKey(references[reference]) !== subjectKey(doc.subjectId))
      throw new Error('Knowledge reference collision.');
    references[reference] = doc.subjectId;
  }
  return references;
}

export function generalKnowledgeContext(world: WorldState, actorId: string) {
  const doc = knowledgeDocument(world, actorId, null);
  const seeded = doc?.origin === 'authored-starting' && !!doc.text;
  return {
    subjectId: null,
    revision: doc?.revision ?? 0,
    origin: doc?.origin ?? null,
    ...(seeded ? { provenance: 'Authored starting understanding' } : {}),
    characters: characterCount(doc?.text ?? ''),
    maxCharacters: world.knowledgePolicy?.maxCharacters.general,
    text: projectEntityMarkers(doc?.text ?? '', world, actorId),
  };
}

/** Exact lookup handles involved subjects; optional pads reuse the existing scoped recall index.
 * docs/knowledge.md#context-selection
 */
export function subjectKnowledgeCandidates(
  world: WorldState,
  actorId: string,
  involved: Set<string>,
): AttentionCandidate[] {
  return Object.entries(world.actorKnowledge?.[actorId] ?? {}).flatMap(([id, doc]) => {
    if (doc.subjectId === null || !doc.text) return [];
    const entity = doc.subjectId.kind === 'entity' ? entityGet(world.entities, doc.subjectId.entityId) : undefined;
    const bound = doc.subjectId.kind === 'individual'
      ? !!observerIndividual(world, actorId, doc.subjectId)
      : recognizesSubject(world, actorId, doc.subjectId.entityId);
    const name = observerIndividual(world, actorId, doc.subjectId)?.givenName;
    const label = entity && bound ? entityLabel(world, entity, actorId) : subjectLabel(world, actorId, doc.subjectId);
    return [
      {
        id: `notepad:${id}`,
        kind: 'knowledge' as const,
        text: `Notepad ${noteReference(actorId, doc.subjectId)} about ${label}${bound ? '' : '; no current identity binding'}; revision ${doc.revision}; ${doc.origin === 'authored-starting' ? 'authored starting understanding' : 'actor-edited understanding'}. ${characterCount(doc.text)}/${world.knowledgePolicy!.maxCharacters.subject} characters.\n${projectEntityMarkers(doc.text, world, actorId)}`,
        embeddingText: `Notes about ${name || 'a subject'}: ${doc.text}`,
        // A new preferred name changes semantic search text; exposure tokens do not.
        revision: JSON.stringify([doc.revision, name ?? '']),
        required: bound && doc.subjectId.kind === 'entity' && involved.has(doc.subjectId.entityId),
        automatic: false,
        entityIds: bound && doc.subjectId.kind === 'entity' ? [doc.subjectId.entityId] : [],
        at: world.simTime,
        salience: 3,
      },
    ];
  });
}
