import {
  subjectKey,
  subjectLabel,
  entityGet,
  type CognitionBinding,
  type ActorMind,
  type InnerRecordChange,
  type ObserverSubject,
  type WorldState,
} from '@open-legend/domain';
import { subjectHandle, type PersonalReferenceScope } from './entity-references.js';
import type { ReflectionRecordChange } from './cognition-contracts.js';

export type RecordBindings = Pick<
  CognitionBinding,
  'evidenceReferences' | 'identityReferences' | 'physicalEntityReferences'
>;
/** Offered records stay private interpretations. One captured subject map never
 * creates a current-body/action binding. */
export function offerInterpretationRecords(
  world: WorldState,
  actorId: string,
  context: Record<string, unknown>,
  bindings: RecordBindings,
  subjects: readonly ObserverSubject[] = [],
): void {
  const physicalSubjects: Record<string, ObserverSubject> = {};
  // Self and accessible things have stable subjects. A person's physical route
  // must retain its received local/recognized identity, already bound by perception.
  for (const [handle, id] of Object.entries(bindings.physicalEntityReferences ?? {})) {
    const entity = entityGet(world.entities, id);
    if (entity && (id === actorId || !entity.actor))
      physicalSubjects[handle] = { kind: 'entity', entityId: id };
  }
  return offerInterpretationRecordsFromRead(
    {
      scope: world,
      actorId,
      records: world.minds?.[actorId]?.records ?? [],
      documents: world.minds?.[actorId]?.documents ?? [],
      physicalSubjects,
      subjects,
      label: (subject) => subjectLabel(world, actorId, subject),
    },
    context,
    bindings,
  );
}
/** Formatting uses only this actor's private records and already admitted
 * subject labels. The binding owner must separately select their real native
 * ordinals before generated record edits can execute. */
export function offerInterpretationRecordsFromRead(
  input: {
    readonly scope: PersonalReferenceScope;
    readonly actorId: string;
    readonly records: readonly ActorMind['records'][number][];
    readonly documents: readonly Pick<ActorMind['documents'][number], 'id' | 'revision'>[];
    readonly physicalSubjects: Readonly<Record<string, ObserverSubject>>;
    readonly subjects: readonly ObserverSubject[];
    label(subject: ObserverSubject): string;
  },
  context: Record<string, unknown>,
  bindings: RecordBindings,
): void {
  const { records } = input;
  const references = (bindings.identityReferences ??= {});
  Object.assign(references, input.physicalSubjects);
  for (const subject of [
    ...input.subjects,
    ...records.flatMap((record) => (record.subjectId ? [record.subjectId] : [])),
  ]) {
    const handle = subjectHandle(input.scope, input.actorId, subject);
    if (references[handle] && subjectKey(references[handle]) !== subjectKey(subject))
      throw new Error('Interpretation subject handle collision.');
    references[handle] = subject;
  }
  const evidenceHandles = new Map(
    Object.entries(bindings.evidenceReferences ?? {}).map(([handle, id]) => [id, handle]),
  );
  context['interpretations'] = records.map((record) => {
    const evidence = record.evidence.flatMap((link) => {
      const id = evidenceHandles.get(link.id);
      return id ? [{ ...link, id }] : [];
    });
    return {
      ...record,
      subjectId: record.subjectId
        ? subjectHandle(input.scope, input.actorId, record.subjectId)
        : null,
      evidence,
      supportComplete: evidence.length === record.evidence.length,
    };
  });
  context['interpretationDocuments'] = input.documents.map(({ id, revision }) => ({
    id,
    revision,
  }));
  context['interpretationSubjects'] = Object.entries(bindings.identityReferences ?? {}).map(
    ([handle, subject]) => ({ handle, label: input.label(subject) }),
  );
}
/** Resolve only the finite offered interpretation/evidence cut. Native publication
 * owns revisions, protection, capacity and the complete atomic mutation. */
export function resolveInterpretationRecords(
  changes: readonly ReflectionRecordChange[],
  bindings: RecordBindings,
): InnerRecordChange[] {
  return changes.map((change) => {
    if (change.operation === 'remove') return change;
    const subjectId =
      change.subjectId === null ? null : bindings.identityReferences?.[change.subjectId];
    if (subjectId === undefined) throw new Error('Unoffered interpretation subject.');
    return {
      ...change,
      subjectId,
      evidence: change.evidence.map((link) => {
        const id = bindings.evidenceReferences?.[link.id];
        if (!id) throw new Error('Unoffered interpretation evidence.');
        return { ...link, id };
      }),
    };
  });
}
