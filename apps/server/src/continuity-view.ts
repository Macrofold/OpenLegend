import {
  appraisalPage,
  appraisalPin,
  characterCount,
  knowledgeDocument,
  knowledgePage,
  snapshotRevision,
  canRememberSubject,
  observerDescription,
} from '@open-legend/domain';
import type { GodMindView } from '@open-legend/protocol';
import { scopeKey, type RequestScope } from './authority.js';
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
    actor = world.entities[actorId];
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
  const subjectIds = [
    ...new Set([
      ...documents.flatMap((doc) => (doc.subjectId ? [doc.subjectId] : [])),
      ...(world.visiblePeople?.[actorId] ?? [])
        .slice(0, 40)
        .filter((id) => canRememberSubject(world, actorId, id)),
    ]),
  ];
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
    notepads: documents.map((doc) => ({
      subjectId: doc.subjectId,
      label: doc.subjectId ? label(doc.subjectId) : 'General knowledge',
      text: doc.text,
      revision: doc.revision,
      characters: characterCount(doc.text),
      maxCharacters:
        world.knowledgePolicy!.maxCharacters[doc.subjectId === null ? 'general' : 'subject'],
    })),
    identities: Object.fromEntries(
      subjectIds.flatMap((id) =>
        world.observerIdentities?.[actorId]?.[id]
          ? [[id, world.observerIdentities[actorId]![id]!]]
          : [],
      ),
    ),
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
      subjects: subjectIds.map((id) => ({ id, label: label(id) })),
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
