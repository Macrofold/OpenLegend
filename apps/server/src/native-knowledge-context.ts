import { namePhrase } from '@open-legend/language';
import { knowledgeKey, knowledgePageFromDocuments, subjectKey } from '@open-legend/domain';
import type { AttentionCandidate } from './recall.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import { personalEntityHandle } from './entity-references.js';
import {
  formatMapKnowledgeCandidate,
  formatSubjectKnowledgeCandidate,
} from './knowledge-context.js';
import { retainNativeSources } from './native-consumer.js';

/** Select the same actual private pads and current subject associations as the
 * Source caller. Identity metadata comes from native semantic readers. */
export function nativeKnowledgeCandidates(
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  involved: ReadonlySet<string>,
  optionalIds?: readonly string[],
): AttentionCandidate[] {
  const facts = capture.facts,
    self = facts.self,
    installed = definitions.facts,
    documents = self.knowledge ?? {},
    metadata = facts.referenceFacts;
  const bodies = new Map(
    metadata.bodies.map((body) => {
      const binding = facts.perception.bodies[body.ordinal];
      if (!binding) throw new Error('Native notepad metadata has no originating body.');
      return [binding.sourceId, body] as const;
    }),
  );
  const involvedSubjects = new Set(
    [...involved].flatMap((id) =>
      (bodies.get(id)?.subjects ?? []).map((fact) => subjectKey(fact.subject)),
    ),
  );
  const ids = new Set(
    optionalIds ??
      knowledgePageFromDocuments(documents).values.map((doc) => knowledgeKey(doc.subjectId)),
  );
  for (const id of involved) ids.add(knowledgeKey({ kind: 'entity', entityId: id }));
  for (const id of involved)
    for (const fact of bodies.get(id)?.subjects ?? []) ids.add(knowledgeKey(fact.subject));
  const subjects = new Map(metadata.knowledge.map((fact) => [subjectKey(fact.subject), fact]));
  const result = [...ids].flatMap((id) => {
    const doc = documents[id];
    if (!doc?.subjectId || !doc.text) return [];
    if (doc.subjectId.kind === 'place' || doc.subjectId.kind === 'map-marker')
      return [
        formatMapKnowledgeCandidate(
          id,
          doc,
          doc.subjectId.kind,
          doc.subjectId.kind === 'map-marker'
            ? (self.npc.mapMarkerLabels?.[doc.subjectId.markerId] ?? 'a map marker')
            : 'a known place',
          self.at,
        ),
      ];
    const fact = subjects.get(subjectKey(doc.subjectId));
    if (!fact) throw new Error('The selected native notepad has no admitted subject metadata.');
    const bound =
      doc.subjectId.kind === 'individual'
        ? fact.identityPresent
        : doc.subjectId.entityId === self.actorId || fact.currentCommunication;
    let label = fact.label;
    if (doc.subjectId.kind === 'entity' && bound && fact.observerName) {
      if (fact.referenceAttribution === undefined)
        throw new Error('The native notepad entity label has no acquired reference attribution.');
      label = `${namePhrase(fact.observerName, 'none')} (ID:${personalEntityHandle(
        { id: self.worldId },
        self.actorId,
        doc.subjectId.entityId,
        fact.referenceAttribution,
      )})`;
    }
    const policy = installed.definitions.knowledgePolicy;
    if (!policy) throw new Error('The native subject notepad has no installed knowledge policy.');
    return [
      formatSubjectKnowledgeCandidate({
        id,
        actorId: self.actorId,
        doc,
        subject: doc.subjectId,
        label,
        bound,
        name: fact.preferredName,
        required:
          doc.subjectId.kind === 'entity'
            ? bound && involved.has(doc.subjectId.entityId)
            : involvedSubjects.has(subjectKey(doc.subjectId)),
        maxCharacters: policy.maxCharacters.subject,
        at: self.at,
      }),
    ];
  });
  return retainNativeSources(result, facts, installed);
}
