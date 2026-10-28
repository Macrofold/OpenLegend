import { entityGet } from '@open-legend/domain';
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
    if (!doc?.subjectId || doc.subjectKind) continue;
    const reference = noteReference(actorId, doc.subjectId);
    if (references[reference] && references[reference] !== doc.subjectId)
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
    if (doc.subjectKind) {
      // Map subjects are not entity references, even if their string IDs coincide.
      // These owner-private notes may inform context without granting physical
      // targeting or an unsupported model writer for the map annotation.
      const label =
        doc.subjectKind === 'map-marker'
          ? (world.mapMarkers?.[actorId]?.[doc.subjectId]?.label ?? 'a map marker')
          : 'a known place';
      return [
        {
          id: `notepad:${id}`,
          kind: 'knowledge' as const,
          text: `Your map note about ${label}; read-only annotation, not an entity reference.\n${projectEntityMarkers(doc.text, world, actorId)}`,
          embeddingText: `Map note about ${label}: ${doc.text}`,
          revision: JSON.stringify([doc.subjectKind, doc.revision, label]),
          required: false,
          automatic: false,
          entityIds: [],
          at: world.simTime,
          salience: 3,
        },
      ];
    }

    const entity = entityGet(world.entities, doc.subjectId);
    const bound = !!entity && recognizesSubject(world, actorId, doc.subjectId);
    const identity = world.observerIdentities?.[actorId]?.[doc.subjectId];
    const name = identity?.nickname || identity?.givenName;
    const label = bound
      ? entityLabel(world, entity!, actorId)
      : name || 'a previously individuated subject';
    return [
      {
        id: `notepad:${id}`,
        kind: 'knowledge' as const,
        text: `Notepad ${noteReference(actorId, doc.subjectId)} about ${label}${bound ? '' : '; no current identity binding'}; revision ${doc.revision}; ${doc.origin === 'authored-starting' ? 'authored starting understanding' : 'actor-edited understanding'}. ${characterCount(doc.text)}/${world.knowledgePolicy!.maxCharacters.subject} characters.\n${projectEntityMarkers(doc.text, world, actorId)}`,
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
