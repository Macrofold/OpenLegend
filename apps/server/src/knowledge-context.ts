import {
  characterCount,
  knowledgeDocument,
  recognizesSubject,
  type WorldState,
} from '@open-legend/domain';
import { entityLabel, projectEntityMarkers } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';
import { createHash } from 'node:crypto';

const noteReference = (actorId: string, subjectId: string): string =>
  `note-${createHash('sha256').update(`${actorId}\0${subjectId}`).digest('hex').slice(0, 16)}`;

/** A document reference permits editing remembered prose, never targeting a perceived body. */
export function selectedKnowledgeReferences(
  world: WorldState,
  actorId: string,
  candidates: AttentionCandidate[],
): Record<string, string> {
  const references: Record<string, string> = {};
  for (const candidate of candidates) {
    if (!candidate.id.startsWith('notepad:')) continue;
    const doc = world.actorKnowledge?.[actorId]?.[candidate.id.slice('notepad:'.length)];
    if (!doc?.subjectId) continue;
    const reference = noteReference(actorId, doc.subjectId);
    if (references[reference] && references[reference] !== doc.subjectId)
      throw new Error('Knowledge reference collision.');
    references[reference] = doc.subjectId;
  }
  return references;
}

export function generalKnowledgeContext(world: WorldState, actorId: string) {
  const doc = knowledgeDocument(world, actorId, null);
  return {
    subjectId: null,
    revision: doc?.revision ?? 0,
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
    const entity = world.entities[doc.subjectId];
    const bound = !!entity && recognizesSubject(world, actorId, doc.subjectId);
    const name = world.observerIdentities?.[actorId]?.[doc.subjectId]?.givenName;
    const label = bound
      ? entityLabel(world, entity!, actorId)
      : name || 'a previously individuated subject';
    return [
      {
        id: `notepad:${id}`,
        kind: 'knowledge' as const,
        text: `Notepad ${noteReference(actorId, doc.subjectId)} about ${label}${bound ? '' : '; no current identity binding'}; revision ${doc.revision}. ${characterCount(doc.text)}/${world.knowledgePolicy!.maxCharacters.subject} characters.\n${projectEntityMarkers(doc.text, world, actorId)}`,
        embeddingText: `Notes about ${name || 'a subject'}: ${doc.text}`,
        // A new preferred name changes semantic search text; exposure tokens do not.
        revision: JSON.stringify([doc.revision, name ?? '']),
        required: bound && involved.has(doc.subjectId),
        automatic: false,
        entityIds: bound ? [doc.subjectId] : [],
        at: world.simTime,
        salience: 3,
      },
    ];
  });
}
