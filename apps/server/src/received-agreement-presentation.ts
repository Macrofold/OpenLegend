import {
  boundaryRepairInputFields,
  validatePersonalSocial,
  validatePerceivedCompact,
  validatePerceivedCooperation,
  type AssemblyPhase,
  type Awareness,
  type CooperationDestination,
  type CooperationTerms,
  type OfferLot,
} from '@open-legend/domain';
import { digest } from './content-digest.js';

type Reference = (id: string) => string;

/** Render only native, personally received terms. The source occurrence remains
 * authoritative: a later acceptance or an unseen withdrawal cannot rewrite it. */
export function receivedAgreementPresentation(entry: Awareness, ref: Reference) {
  if (entry.retentionClass !== 'memory' || typeof entry.eventData?.agreement !== 'string') return;
  const owner = entry.actorId;
  // Agreement identities join received revisions, not live entities or executable
  // choices. The original ID and revision stay in the captured source binding.
  const agreementReference = (family: string, id: string) =>
    `agreement-${digest([owner, family, id])}`;
  if (entry.eventType === 'cooperation') {
    const value: unknown = JSON.parse(entry.eventData.agreement);
    validatePerceivedCooperation(value, owner);
    return {
      family: 'cooperation',
      reference: agreementReference('cooperation', value.id),
      proposer: ref(value.proposerId),
      recipient: ref(value.recipientId),
      terms: cooperationTerms(value.terms, owner, ref, agreementReference),
      status: value.status,
      expiresAt: value.expiresAt,
      ...(value.endAt !== undefined ? { endAt: value.endAt } : {}),
      ...(value.cause ? { cause: value.cause } : {}),
      ...(value.amendment
        ? {
            amendment: {
              proposedBy: ref(value.amendment.proposedBy),
              terms: cooperationTerms(value.amendment.terms, owner, ref, agreementReference),
              createdAt: value.amendment.createdAt,
              expiresAt: value.amendment.expiresAt,
            },
          }
        : {}),
    };
  }
  if (entry.eventType === 'social-compact') {
    const value: unknown = JSON.parse(entry.eventData.agreement);
    validatePerceivedCompact(value, owner);
    return {
      family: 'social-compact',
      reference: agreementReference('social-compact', value.id),
      proposer: ref(value.proposerId),
      recipient: ref(value.recipientId),
      terms:
        value.terms.kind === 'alliance'
          ? { kind: value.terms.kind }
          : { kind: value.terms.kind, durationSeconds: value.terms.durationSeconds },
      phase: value.phase,
      proposedAt: value.proposedAt,
      replyBy: value.replyBy,
      ...(value.acceptedAt !== undefined ? { acceptedAt: value.acceptedAt } : {}),
      ...(value.endAt !== undefined ? { endAt: value.endAt } : {}),
      ...(value.endedBy ? { endedBy: ref(value.endedBy) } : {}),
      ...(value.cause ? { cause: value.cause } : {}),
      ...(value.replaces
        ? { replaces: agreementReference('social-compact', value.replaces.compactId) }
        : {}),
    };
  }
  if (entry.eventData.personalAgreement !== true) return;
  const value: unknown = JSON.parse(entry.eventData.agreement);
  // Another native family keeps its existing payload until its semantic owner
  // supplies a projection. Do not infer a structure from arbitrary JSON strings.
  if (
    !value ||
    typeof value !== 'object' ||
    !('family' in value) ||
    (value.family !== 'item-offer' && value.family !== 'movement-outing')
  )
    return;
  validatePersonalSocial(value, owner);
  const common = {
    family: value.family,
    reference: agreementReference(value.family, value.id),
    createdAt: value.createdAt,
    expiresAt: value.expiresAt,
    status: value.status,
    ...(value.cause ? { cause: value.cause } : {}),
  };
  if (value.family === 'movement-outing')
    return {
      ...common,
      kind: value.kind,
      proposer: ref(value.proposerId),
      recipient: ref(value.recipientId),
      destination: {
        label: value.destination.label,
        ...(value.destination.point ? { point: point(value.destination.point, ref) } : {}),
      },
      ...(value.purpose ? { purpose: value.purpose } : {}),
      ownArrived: value.ownArrived,
      ...(value.opponentId ? { opponent: ref(value.opponentId) } : {}),
    };
  const lots = (items: OfferLot[], descriptions: typeof value.descriptions.offered) =>
    items.map((lot, index) => ({
      item: ref(lot.itemId),
      quantity: lot.quantity,
      whole: lot.whole,
      ...(lot.capacity !== undefined ? { capacity: lot.capacity } : {}),
      ...descriptions[index]!,
    }));
  return {
    ...common,
    offerer: ref(value.offererId),
    recipient: ref(value.recipientId),
    offered: lots(value.offered, value.descriptions.offered),
    requested: lots(value.requested, value.descriptions.requested),
    ...(value.constructionUse
      ? {
          constructionUse: {
            ...value.constructionUse.terms,
            site: {
              ...value.constructionUse.terms.site,
              surfaceId: ref(value.constructionUse.terms.site.surfaceId),
            },
          },
        }
      : {}),
  };
}

function point(value: CooperationDestination['point'], ref: Reference) {
  return { x: value.x, y: value.y, z: value.z, surfaceId: ref(value.surfaceId) };
}

function destination(value: CooperationDestination, ref: Reference) {
  return {
    label: value.label,
    point: point(value.point, ref),
    acquiredFrom: ref(value.source.subjectId),
    observedAt: value.source.observedAt,
    ...(value.entityId ? { subject: ref(value.entityId) } : {}),
    ...(value.anchor ? { anchor: ref(value.anchor.entityId) } : {}),
  };
}

const phaseAuthorityFields = new Set([
  'implementation',
  'arrangementId',
  'familyId',
  'familyVersion',
  'familyDigest',
  'requestId',
  'permissionId',
  'editId',
  'expectedRevision',
]);
const phaseEntityFields = new Set([
  'rootId',
  'itemId',
  'toolId',
  'rail1Id',
  'rail2Id',
  'sectionId',
  'parkingSectionId',
  'binding1',
  'binding2',
  'binding3',
  'binding4',
  'binding5',
  'binding6',
  'destinationId',
]);
function constructionPhase(value: AssemblyPhase, ref: Reference) {
  const entityFields = new Set([...phaseEntityFields, ...boundaryRepairInputFields(value)]);
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, field]) =>
      phaseAuthorityFields.has(key)
        ? []
        : [
            [
              key,
              key === 'destination'
                ? point(value.destination, ref)
                : entityFields.has(key) && typeof field === 'string'
                  ? ref(field)
                  : field,
            ],
          ],
    ),
  );
}

function cooperationTerms(
  value: CooperationTerms,
  owner: string,
  ref: Reference,
  agreement: (family: string, id: string) => string,
) {
  if (value.purpose === 'hunt')
    return {
      purpose: value.purpose,
      quarry: { subject: ref(value.quarry.id), description: value.quarry.labels[owner]! },
      meetingPlace: destination(value.meetingPlace, ref),
    };
  if (value.purpose === 'guide')
    return { purpose: value.purpose, destination: destination(value.destination, ref) };
  const task = value.task;
  const common = { kind: task.kind, helper: ref(task.helperId) };
  return {
    purpose: value.purpose,
    task:
      task.kind === 'prepare'
        ? {
            ...common,
            recipe: task.recipeLabel,
            output: task.outputLabel,
            outputPort: task.output.port,
            quantity: task.quantity,
            unit: task.unit,
          }
        : task.kind === 'carry'
          ? {
              ...common,
              offer: agreement('item-offer', task.offerId),
              item: ref(task.itemId),
              description: task.itemLabel,
              quantity: task.quantity,
              destination: destination(task.destination, ref),
            }
          : { ...common, description: task.label, phase: constructionPhase(task.phase, ref) },
  };
}
