import { characterCount, knowledgeDocument, recognizesSubject, type WorldState } from '@open-legend/domain';
import { entityLabel, projectEntityMarkers } from './entity-references.js';
import type { AttentionCandidate } from './recall.js';

export function generalKnowledgeContext(world: WorldState, actorId: string) {
  const doc = knowledgeDocument(world, actorId, null);
  return { subjectId: null, revision: doc?.revision ?? 0, characters: characterCount(doc?.text ?? ''),
    maxCharacters: world.knowledgePolicy?.maxCharacters.general, text: projectEntityMarkers(doc?.text ?? '', world, actorId) };
}

/** Exact lookup handles involved subjects; optional pads reuse the existing scoped recall index.
 * docs/knowledge.md#context-selection
 */
export function subjectKnowledgeCandidates(world: WorldState, actorId: string, involved: Set<string>): AttentionCandidate[] {
  return Object.entries(world.actorKnowledge?.[actorId] ?? {}).flatMap(([id, doc]) => {
    if (doc.subjectId === null || !doc.text) return [];
    const entity = world.entities[doc.subjectId];
    const bound = !!entity && recognizesSubject(world, actorId, doc.subjectId);
    const name = world.observerIdentities?.[actorId]?.[doc.subjectId]?.givenName;
    const label = bound ? entityLabel(world, entity!, actorId) : name || 'a previously individuated subject';
    return [{id: `notepad:${id}`, kind: 'knowledge' as const,
      text: `Notepad about ${label}${bound ? `; revision ${doc.revision}` : '; no current identity binding'}. ${characterCount(doc.text)}/${world.knowledgePolicy!.maxCharacters.subject} characters.\n${projectEntityMarkers(doc.text, world, actorId)}`,
      embeddingText: `Notes about ${name || 'a subject'}: ${doc.text}`,
      revision: String(doc.revision), required: bound && involved.has(doc.subjectId), automatic: false,
      entityIds: bound ? [doc.subjectId] : [], at: world.simTime, salience: 3}];
  });
}
