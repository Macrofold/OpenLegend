import { experienceSourceKey } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeWorldService } from './native-world-service.js';
import type { nativeResponseReferences } from './native-response-context.js';
import type { SharedModelExperience } from './perceived-context.js';
import { offerInterpretationRecordsFromRead } from './reflection-records.js';

/** Source's private interpretation presentation over the genuine current mind
 * and its admitted labels. Returned aliases address actual native source rows;
 * the reflection ticket owns resolution and publication permissions. */
export async function offerNativeInterpretationRecords(input: {
  service: NativeWorldService;
  original: NativeNpcCapture;
  current: NativeNpcCapture;
  context: Record<string, unknown>;
  references: ReturnType<typeof nativeResponseReferences>;
  sharedExperiences: ReadonlyMap<string, SharedModelExperience>;
  evidenceIds: ReadonlySet<string>;
}) {
  const { service, original, current, references } = input;
  const self = current.facts.self;
  const personal = original
    .sources()
    .flatMap((inventory, inventoryIndex) =>
      inventory.personal.map((record, ordinal) => ({ record, inventory: inventoryIndex, ordinal })),
    );
  const evidenceReferences: Record<string, string> = {};
  const evidenceAliases = [...input.sharedExperiences].flatMap(([key, shared]) => {
    const source = personal.find(
      ({ record }) =>
        experienceSourceKey(record.reference) === key &&
        record.reference.revision === shared.revision,
    );
    if (!source) throw new Error('Included interpretation evidence has no native source owner.');
    if (!input.evidenceIds.has(source.record.reference.id)) return [];
    evidenceReferences[shared.experience.handle] = source.record.reference.id;
    return [
      { alias: shared.experience.handle, inventory: source.inventory, ordinal: source.ordinal },
    ];
  });
  const physicalSubjects = Object.fromEntries(
    Object.entries(references.physicalEntityReferences).flatMap(([alias, id]) =>
      id === self.actorId ||
      current.facts.perception.bodies.some((body) => body.sourceId === id && !body.actor)
        ? [[alias, { kind: 'entity' as const, entityId: id }]]
        : [],
    ),
  );
  const labels = await service.prepareNpcExperiencePresentation(current, [
    self.mind.records,
    ...Object.values(references.identityReferences),
    ...Object.values(physicalSubjects),
  ]);
  const bindings = {
    identityReferences: references.identityReferences,
    physicalEntityReferences: references.physicalEntityReferences,
    evidenceReferences,
  };
  offerInterpretationRecordsFromRead(
    {
      scope: { id: self.worldId },
      actorId: self.actorId,
      records: self.mind.records,
      documents: self.mind.documents,
      physicalSubjects,
      subjects: [],
      label: (subject) => labels.subjectLabel(subject),
    },
    input.context,
    bindings,
  );
  return { evidenceAliases };
}
