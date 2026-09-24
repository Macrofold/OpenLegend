import type { Outcome, WorldState } from './types.js';
import { getOwn, isSafeRecordId } from './records.js';
import { outcome } from './events.js';

export interface KnowledgeDocument {
  subjectId: string | null;
  text: string;
  revision: number;
  evidenceIds: string[];
}
export interface KnowledgeEdit {
  subjectId: string | null;
  expectedRevision: number;
  text: string;
}
export interface KnowledgePolicy {
  maxCharacters: { general: number; subject: number };
}
export type ActorKnowledge = Record<string, KnowledgeDocument>;
export function advanceKnowledgeRevision(world: WorldState, actorId: string): void {
  (world.knowledgeRevisions ??= {})[actorId] = (world.knowledgeRevisions?.[actorId] ?? 0) + 1;
}
export const characterCount = (text: string): number => Array.from(text).length;
export const knowledgeKey = (subjectId: string | null): string =>
  subjectId === null ? 'general' : `subject:${subjectId}`;
export function knowledgeDocument(world: WorldState, actorId: string, subjectId: string | null) {
  return getOwn(world.actorKnowledge?.[actorId] ?? {}, knowledgeKey(subjectId));
}

/** The caller supplies a permitted subject binding; prose never grants world capabilities.
 * docs/knowledge.md#mutation-and-limits
 */
export function editKnowledge(
  world: WorldState,
  actorId: string,
  edit: KnowledgeEdit,
  permittedSubjects: readonly string[],
  evidenceIds: readonly string[] = [],
): Outcome {
  const policy = world.knowledgePolicy;
  if (!policy || !world.entities[actorId]?.actor || !isSafeRecordId(actorId))
    return outcome(false, 'knowledge-unavailable', 'Knowledge is unavailable for this actor.');
  if (edit.subjectId !== null && (!permittedSubjects.includes(edit.subjectId) ||
      !isSafeRecordId(edit.subjectId) || !world.entities[edit.subjectId]))
    return outcome(false, 'unpermitted-subject', 'The knowledge subject was not supplied.');
  const current = knowledgeDocument(world, actorId, edit.subjectId);
  if (!Number.isSafeInteger(edit.expectedRevision) || edit.expectedRevision < 0 ||
      edit.expectedRevision !== (current?.revision ?? 0))
    return outcome(false, 'stale-knowledge', 'The knowledge document changed; read its current revision.');
  const limit = policy.maxCharacters[edit.subjectId === null ? 'general' : 'subject'];
  if (typeof edit.text !== 'string' || characterCount(edit.text) > limit)
    return outcome(false, 'knowledge-overflow', `Rewrite the complete notepad within ${limit} characters; the previous text was retained.`);
  const forgotten = new Set(world.experience?.forgotten[actorId] ?? []);
  if (evidenceIds.some((id) => forgotten.has(id)))
    return outcome(false, 'forgotten-evidence', 'Knowledge cannot retain forgotten evidence.');
  const documents = ((world.actorKnowledge ??= {})[actorId] ??= {});
  // Keep empty documents as revisioned tombstones: an old create cannot undo a later deletion.
  documents[knowledgeKey(edit.subjectId)] = {
    subjectId: edit.subjectId,
    text: edit.text,
    revision: (current?.revision ?? 0) + 1,
    // Current publication evidence stays bounded by admitted context; prior provenance remains in committed history.
    evidenceIds: edit.text ? [...new Set(evidenceIds.length ? evidenceIds : current?.evidenceIds ?? [])] : [],
  };
  advanceKnowledgeRevision(world, actorId);
  return outcome(true, 'knowledge-edited', 'Knowledge updated.');
}

export function validateKnowledge(world: WorldState): void {
  if (!world.knowledgePolicy && !world.actorKnowledge) return;
  for (const limit of Object.values(world.knowledgePolicy?.maxCharacters ?? {}))
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100000)
      throw new Error('Invalid admitted knowledge character limit.');
  if (!world.knowledgePolicy) throw new Error('Knowledge has no admitted policy.');
  for (const [actorId, documents] of Object.entries(world.actorKnowledge ?? {})) {
    if (!world.entities[actorId]?.actor) throw new Error('Knowledge owner is unavailable.');
    for (const [id, document] of Object.entries(documents)) {
      if (id !== knowledgeKey(document.subjectId) ||
          (document.subjectId !== null && !world.entities[document.subjectId]) ||
          !Number.isSafeInteger(document.revision) || document.revision < 1 ||
          typeof document.text !== 'string' || !Array.isArray(document.evidenceIds) ||
          document.evidenceIds.some((id) => typeof id !== 'string') ||
          characterCount(document.text) > world.knowledgePolicy.maxCharacters[document.subjectId === null ? 'general' : 'subject'])
        throw new Error(`Invalid knowledge document for ${actorId}: ${id}.`);
    }
  }
}
