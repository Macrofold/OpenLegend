import { namePhrase } from '@open-legend/language';
import { subjectKey, type ObserverSubject, type Awareness } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import type { NativePersonalSource } from './native-recall.js';
import type { NativeNpcSubjectFact } from './native-npc-sources.js';
import type { CapturedExperienceContext } from './experience-context.js';
import { nativeCurrentValue } from './native-perception.js';
import { nativeNpcSpatialFrame } from './native-situation.js';
import { personalEntityHandle, permittedSourceHandle, subjectHandle } from './entity-references.js';
import {
  formatCurrentReference,
  formatRememberedIndividualReference,
  formatRememberedPersonReference,
} from './response-reference-format.js';
import { formatResponseTrigger, formatResponseTriggerContext } from './response-trigger-format.js';
import { experienceForModel, experienceModelBindings } from './perceived-context.js';
import { gameTime } from './recall.js';
import { retainNativeSources } from './native-consumer.js';

function awareness(source: NativePersonalSource): Awareness | undefined {
  return source.reference.kind === 'awareness' ? (source.value as Awareness) : undefined;
}

/** Event causes remain personally received evidence. Current visibility comes
 * from the refreshed native read, independently of event-time attribution. */
export function nativeTriggerContext(
  source: NativePersonalSource,
  current: NativeNpcCapture,
  original: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  presentation: CapturedExperienceContext,
) {
  const aware = awareness(source);
  if (!aware) throw new Error('Native trigger context requires an admitted awareness source.');
  const facts = current.facts,
    self = facts.self,
    installed = definitions.facts;
  const body = (id: string) => facts.perception.bodies.find((body) => body.sourceId === id);
  const roles = source.attribution.occurrenceRoles,
    origin = aware.sourceBody && body(aware.sourceBody.entityId),
    sourceRole = roles.find((role) => role.role === 'source'),
    recipient = roles.find((role) => role.role === 'subject');
  const eventTime = gameTime(
    aware.at,
    installed.definitions.statusEffectPolicy.clockOffsetHours,
    installed.definitions.presentation?.calendar?.dayLabel,
  );
  return retainNativeSources(
    {
      stimulus: formatResponseTrigger(aware, self.actorId, '', eventTime),
      facts: formatResponseTriggerContext(aware, {
        experience: experienceForModel(
          { source: 'awareness', value: aware },
          experienceModelBindings(
            presentation,
            self.actorId,
            { source: 'awareness', value: aware },
            'trigger',
          ),
        ),
        eventTime,
        now: self.at,
        ...(aware.sourceSubject?.kind === 'individual'
          ? {
              speakerSubject: subjectHandle(
                { id: self.worldId },
                self.actorId,
                aware.sourceSubject,
              ),
            }
          : {}),
        ...(sourceRole ? { source: { myself: sourceRole.myself } } : {}),
        ...(recipient ? { recipient: { currentBody: !!body(recipient.entityId) } } : {}),
        sourceCurrentlyVisible: aware.speech
          ? !!origin &&
            origin.leaseId === aware.sourceBody!.leaseId &&
            (origin.physicalLife ?? 0) === aware.sourceBody!.physicalLife
          : !!sourceRole && !!body(sourceRole.entityId),
      }),
    },
    facts,
    original.facts,
    installed,
    presentation,
    original.sources(),
  );
}

/** These are display/projection aliases only. The native two-read binder
 * separately accepts ordinal selectors and retains its real source grants. */
export function nativeResponseReferences(
  current: NativeNpcCapture,
  original: NativeNpcCapture,
  selectedVisibleIds: readonly string[],
  sources: readonly NativePersonalSource[],
  evidenceIds: readonly string[],
  rememberedIds: readonly string[],
  learnedSubjects: readonly ObserverSubject[] = [],
) {
  const facts = current.facts,
    self = facts.self,
    scope = { id: self.worldId },
    frame = nativeNpcSpatialFrame(self),
    metadata = facts.referenceFacts;
  const bodies = new Map(
    facts.perception.bodies.map((body, ordinal) => [body.sourceId, { body, ordinal }]),
  );
  const bodySubjects = new Map(metadata.bodies.map((body) => [body.ordinal, body.subject]));
  const currentIds = new Set(
    current.candidates().bodyOrdinals.map((ordinal) => {
      const body = facts.perception.bodies[ordinal];
      if (!body) throw new Error('Native references have no selected current body.');
      return body.sourceId;
    }),
  );
  // Source preserves the refreshed attention selection's order. The current
  // native roster filters permission; it does not choose presentation order.
  const visibleIds = selectedVisibleIds.filter((id) => currentIds.has(id));
  const visible = new Set(visibleIds),
    evidence = new Set(evidenceIds);
  const selected = sources.flatMap((source) => {
    const value = awareness(source);
    return value && evidence.has(value.eventId) ? [{ source, value }] : [];
  });
  const ids = [
    ...new Set([
      self.actorId,
      ...visibleIds,
      ...selected.flatMap(({ source, value }) => {
        const bound = new Set(source.attribution.boundEntityIds);
        return [value.sourceId, value.targetId, ...value.entityIds].filter(
          (id): id is string => !!id && bound.has(id),
        );
      }),
    ]),
  ];
  const subjects = new Map<string, NativeNpcSubjectFact>();
  for (const fact of [
    ...sources.flatMap((source) => [
      ...source.attribution.subjects,
      ...source.attribution.entitySubjects,
    ]),
    metadata.myself,
    ...metadata.knowledge,
    ...metadata.social,
    ...metadata.bodies.flatMap((body) => [...body.subjects, body.entity]),
  ])
    subjects.set(subjectKey(fact.subject), fact);
  const entityFact = (id: string) => subjects.get(subjectKey({ kind: 'entity', entityId: id }));
  const entityHandle = (id: string) => {
    const body = bodies.get(id)?.body;
    if (body) return personalEntityHandle(scope, self.actorId, id, body.leaseId);
    const attribution =
      id === self.actorId ? self.referenceAttribution : entityFact(id)?.referenceAttribution;
    if (attribution === undefined)
      throw new Error('Native reference has no acquired entity attribution.');
    return personalEntityHandle(scope, self.actorId, id, attribution);
  };
  const rememberedHandle = (id: string) =>
    permittedSourceHandle(scope, self.actorId, ['remembered-person', id]);
  const roleHandle = (id: string) =>
    id === self.actorId || visible.has(id) ? entityHandle(id) : rememberedHandle(id);
  const roles = new Map<string, { evidenceId: string; role: string }[]>();
  for (const { source, value } of selected) {
    const bound = new Set(source.attribution.boundEntityIds);
    for (const [id, role] of [
      [value.sourceId, 'source'],
      [value.targetId, value.eventType === 'speech' ? 'intended_recipient' : 'subject'],
    ] as const) {
      if (!id || !bound.has(id)) continue;
      const values = roles.get(id) ?? [];
      values.push({ evidenceId: value.eventId, role });
      roles.set(id, values);
    }
  }
  const identityReferences: Record<string, ObserverSubject> = {};
  const references = ids.map((id) => {
    const currentBody = visible.has(id) ? bodies.get(id) : undefined;
    const facet =
      currentBody &&
      facts.perception.cut.current
        .slice(currentBody.body.first, currentBody.body.first + currentBody.body.count)
        .find((facet) => facet.value.kind === 'body');
    if (currentBody && (!facet || facet.value.kind !== 'body'))
      throw new Error('Native reference has no acquired body value.');
    const received =
      facet && facet.value.kind === 'body'
        ? { ...nativeCurrentValue(facet), value: facet.value }
        : undefined;
    const subject = currentBody && bodySubjects.get(currentBody.ordinal);
    if (subject) identityReferences[roleHandle(id)] = subject.subject;
    return formatCurrentReference(
      {
        handle: roleHandle(id),
        label:
          id === self.actorId
            ? `${namePhrase(self.observerName, 'none')} (ID:${entityHandle(id)})`
            : currentBody
              ? currentBody.body.name.name
              : 'Unidentified source',
        myself: id === self.actorId,
        ...(received ? { received } : {}),
        ...(subject
          ? {
              knowledge: {
                subject: subject.subject,
                noteRevision: subject.noteRevision,
                noteCharacters: subject.noteCharacters,
                nameRevision: subject.nameRevision,
              },
            }
          : {}),
        triggerRoles: roles.get(id) ?? [],
      },
      frame,
    );
  });
  const remembered = [
    ...new Set([
      ...rememberedIds,
      ...selected.flatMap(({ value }) =>
        value.recognized && value.sourceId ? [value.sourceId] : [],
      ),
    ]),
  ].filter((id) => id !== self.actorId && entityFact(id)?.canAddressRemembered);
  for (const id of remembered) {
    const fact = entityFact(id)!;
    identityReferences[rememberedHandle(id)] = { kind: 'entity', entityId: id };
    references.push(
      formatRememberedPersonReference({
        handle: rememberedHandle(id),
        label: fact.label,
        nameRevision: fact.nameRevision,
        noteRevision: fact.noteRevision,
      }),
    );
  }
  for (const subject of [
    ...learnedSubjects,
    ...selected.flatMap(({ value }) => (value.sourceSubject ? [value.sourceSubject] : [])),
  ]) {
    if (subject.kind !== 'individual') continue;
    const fact = subjects.get(subjectKey(subject)),
      handle = subjectHandle(scope, self.actorId, subject);
    if (!fact?.identityPresent || fact.seedOnly || identityReferences[handle]) continue;
    identityReferences[handle] = subject;
    references.push(
      formatRememberedIndividualReference({
        handle,
        label: fact.label,
        nameRevision: fact.nameRevision,
        noteRevision: fact.noteRevision,
      }),
    );
  }
  return retainNativeSources(
    {
      references,
      identityReferences,
      entityReferences: Object.fromEntries<string>([
        ...ids.map((id) => [roleHandle(id), id] as const),
        ...remembered.map((id) => [rememberedHandle(id), id] as const),
      ]),
      physicalEntityReferences: Object.fromEntries(
        [...new Set([self.actorId, ...visibleIds])].map((id) => [entityHandle(id), id]),
      ),
      entityLeases: Object.fromEntries(visibleIds.map((id) => [id, bodies.get(id)!.body.leaseId])),
    },
    facts,
    original.facts,
    original.sources(),
  );
}
