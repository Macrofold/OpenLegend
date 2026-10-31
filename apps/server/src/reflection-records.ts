import {
  subjectKey,
  subjectLabel,
  entityGet,
  type CognitionBinding,
  type InnerRecordChange,
  type ObserverSubject,
  type WorldState,
} from '@open-legend/domain';
import { subjectHandle } from './entity-references.js';
import type { ReflectionRecordChange } from './cognition-contracts.js';

type RecordBindings = Pick<
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
  const records = world.minds?.[actorId]?.records ?? [];
  const references = (bindings.identityReferences ??= {});
  // Self and accessible things have stable subjects. A person's physical route
  // must retain its received local/recognized identity, already bound by perception.
  for (const [handle, id] of Object.entries(bindings.physicalEntityReferences ?? {})) {
    const entity = entityGet(world.entities, id);
    if (entity && (id === actorId || !entity.actor))
      references[handle] = { kind: 'entity', entityId: id };
  }
  for (const subject of [
    ...subjects,
    ...records.flatMap((record) => (record.subjectId ? [record.subjectId] : [])),
  ]) {
    const handle = subjectHandle(world, actorId, subject);
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
      subjectId: record.subjectId ? subjectHandle(world, actorId, record.subjectId) : null,
      evidence,
      supportComplete: evidence.length === record.evidence.length,
    };
  });
  context['interpretationDocuments'] =
    world.minds?.[actorId]?.documents.map(({ id, revision }) => ({ id, revision })) ?? [];
  context['interpretationSubjects'] = Object.entries(bindings.identityReferences ?? {}).map(
    ([handle, subject]) => ({ handle, label: subjectLabel(world, actorId, subject) }),
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
