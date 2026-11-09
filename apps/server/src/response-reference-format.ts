import type { ObserverSubject, currentBodyValue } from '@open-legend/domain';
import { modelSpatialPoint, type ModelSpatialFrame } from './perceived-context.js';

export interface CurrentReferenceFacts {
  readonly handle: string;
  readonly label: string;
  readonly myself: boolean;
  readonly received?: NonNullable<ReturnType<typeof currentBodyValue>>;
  readonly knowledge?: {
    readonly subject: ObserverSubject;
    readonly noteRevision: number;
    readonly noteCharacters: number;
    readonly nameRevision: number;
  };
  readonly triggerRoles: readonly { readonly evidenceId: string; readonly role: string }[];
}

/** These facts were selected by the Source/native permission owner. Rendering
 * a reference never creates its body lease, identity association or note grant. */
export function formatCurrentReference(facts: CurrentReferenceFacts, frame: ModelSpatialFrame) {
  const received = facts.received;
  return JSON.stringify({
    entityId: facts.handle,
    label: facts.label,
    ...(facts.myself ? { relation: 'myself' } : {}),
    currentBody: !!received,
    ...(received
      ? {
          position: modelSpatialPoint(frame, received.value.body.position),
          positionMeasuredFrom: received.valueMeasuredFrom,
          positionMeasuredThrough: received.valueMeasuredThrough,
          positionAcquiredAt: received.valueAcquiredAt,
        }
      : {}),
    ...(facts.knowledge
      ? {
          noteRevision: facts.knowledge.noteRevision,
          noteCharacters: facts.knowledge.noteCharacters,
          nameRevision: facts.knowledge.nameRevision,
        }
      : { knowledgeBinding: 'unresolved' }),
    triggerRoles: facts.triggerRoles,
  });
}

export function formatRememberedPersonReference(facts: {
  readonly handle: string;
  readonly label: string;
  readonly nameRevision: number;
  readonly noteRevision: number;
}) {
  return JSON.stringify({
    entityId: facts.handle,
    label: facts.label,
    role: 'remembered-person',
    communication: true,
    currentBody: false,
    nameRevision: facts.nameRevision,
    noteRevision: facts.noteRevision,
  });
}

export function formatRememberedIndividualReference(facts: {
  readonly handle: string;
  readonly label: string;
  readonly nameRevision: number;
  readonly noteRevision: number;
}) {
  return JSON.stringify({
    subjectReference: facts.handle,
    label: facts.label,
    role: 'remembered-individual',
    currentBody: false,
    nameRevision: facts.nameRevision,
    noteRevision: facts.noteRevision,
  });
}
