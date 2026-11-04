import { canonicalJson } from './events.js';
import { validReceivedTrackKey } from './perception-values.js';
import { receivedValueAt } from './received-values.js';
import { orderedRecordEntries } from './ordered-record.js';
import {
  temporalPageOperations,
  temporalPageMetadata,
  temporalOperationLogicalCount,
  temporalOperationLogicalBytes,
  type TemporalCheckpointAvailability,
} from './temporal-frames.js';
import type { WorldState } from './types.js';
import type {
  TemporalEvidenceState,
  TemporalFragment,
  TemporalValue,
  TemporalReceipt,
  TemporalFacetReference,
} from './temporal-evidence.js';
import {
  validObservationFrame,
  validateEvidenceSource as validateBoundEvidenceSource,
  validateReceivedFacetProof as validateBoundFacetProof,
  validateObservedBodyDetails,
  validateObservedBodyPose,
  type ObservedBodyDetails,
  validateReceivedParticipantObservers,
  validateSensoryFacet,
  validateObservedLocation,
  type ObservedLocation,
  type ObserverLife,
} from './perception-evidence.js';
import { validObserverSubject } from './knowledge.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { selectedAttentionPolicy } from './world-composition.js';
import {
  temporalReceiptId,
  materializeTemporalValue,
  temporalPageLogicalBytes,
  temporalSupportLogicalBytes,
  receivedTemporalFragment,
} from './temporal-evidence.js';

function validateEvidenceSource(
  value: unknown,
): asserts value is import('./perception-evidence.js').EvidenceSource {
  validateBoundEvidenceSource(value as import('./perception-evidence.js').EvidenceSource);
}
function validateReceivedFacetProof(
  value: unknown,
  observer: ObserverLife,
  through: number,
): asserts value is import('./perception-evidence.js').ReceivedFacetProof {
  validateBoundFacetProof(
    value as import('./perception-evidence.js').ReceivedFacetProof,
    observer,
    through,
  );
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const ordinal = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const temporalSubject = (value: unknown): value is string =>
  isSafeRecordId(value) || validReceivedTrackKey(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'string' && entry.length > 0) &&
  new Set(value).size === value.length;

function validateFieldAvailability(
  groups: readonly TemporalCheckpointAvailability[],
  facets: readonly TemporalFacetReference[],
  at: number,
): void {
  if (!Array.isArray(groups)) throw new Error('Invalid retained field availability.');
  const assigned = new Set<number>(),
    fields = new Set(facets.map((facet) => facet.ordinal));
  for (const group of groups) {
    if (
      !record(group) ||
      !hasRecordFields(group, ['reason', 'at', 'fields']) ||
      typeof group.reason !== 'string' ||
      !['unavailable', 'unchecked', 'released'].includes(group.reason) ||
      !finite(group.at) ||
      group.at < 0 ||
      group.at > at ||
      !Array.isArray(group.fields) ||
      !group.fields.length
    )
      throw new Error('Invalid retained field availability.');
    for (const field of group.fields) {
      if (!ordinal(field) || !fields.has(field) || assigned.has(field))
        throw new Error('Invalid retained field availability mask.');
      assigned.add(field);
    }
  }
}

/** The same exact clock payload is used by page seeds and span terminals. */
function validateClockSeed(
  value: unknown,
  observer: ObserverLife,
  at: number,
  order: number,
  sources: import('./received-values.js').ReceivedValueLookup,
): asserts value is import('./temporal-frames.js').TemporalCheckSeed {
  if (
    !record(value) ||
    !hasRecordFields(
      value,
      ['member', 'receivedAt', 'order', 'support', 'measuredFrom', 'measuredThrough', 'acquiredAt'],
      ['receivedFrom', 'reception', 'poseFrame', 'part'],
    ) ||
    !ordinal(value['member']) ||
    !finite(value['receivedAt']) ||
    value['receivedAt'] < 0 ||
    value['receivedAt'] > at ||
    !ordinal(value['order']) ||
    value['order'] > order ||
    !finite(value['measuredFrom']) ||
    !finite(value['measuredThrough']) ||
    !finite(value['acquiredAt']) ||
    value['measuredFrom'] < 0 ||
    value['measuredFrom'] > value['measuredThrough'] ||
    value['measuredThrough'] > value['acquiredAt'] ||
    value['acquiredAt'] > value['receivedAt'] ||
    (value['poseFrame'] !== undefined && !validObservationFrame(value['poseFrame'])) ||
    (value['part'] !== undefined && !['value', 'detail', 'pose'].includes(String(value['part'])))
  )
    throw new Error('Invalid retained exact clocks.');
  validateReceivedFacetProof(value['support'], observer, value['receivedAt']);
  if (value['receivedFrom']) {
    validateEvidenceSource(value['receivedFrom']);
    const source = value['receivedFrom'] as import('./perception-evidence.js').EvidenceSource;
    if (
      source.observer.actorId !== observer.actorId ||
      source.observer.physicalLife !== observer.physicalLife
    )
      throw new Error('Foreign retained measurement.');
  }
  const reception = value['reception'] as TemporalFacetReference['reception'];
  if (reception) {
    if (reception.kind === 'location') {
      if (!validObservationFrame(reception.frame))
        throw new Error('Invalid retained receiver frame.');
    } else if (reception.kind === 'body') {
      if (reception.poseRef) {
        const pose = receivedValueAt(sources, reception.poseRef);
        if (pose?.kind !== 'body-pose') throw new Error('Unavailable retained body pose.');
        validateObservedBodyPose(pose.pose);
      } else if (reception.pose) validateObservedBodyPose(reception.pose);
      else throw new Error('Invalid retained body reception.');
    } else throw new Error('Invalid retained reception.');
  }
}

/** Current recording is an annotation of held members, never a saved page cursor. */
export function validateTemporalCurrentGroupCheckpoint(
  value: unknown,
  now: number,
  parts: readonly (readonly [string, 'value' | 'detail' | 'pose'])[],
): asserts value is import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint {
  if (
    !record(value) ||
    !hasRecordFields(
      value,
      [
        'epoch',
        'openingOrdinal',
        'acquisition',
        'admittedAt',
        'admittedOrder',
        'started',
        'startedSource',
        'lastTimes',
        'lastSource',
        'lastAt',
        'lastOrder',
        'members',
        'count',
        'through',
        'startedMeasurementRevision',
        'lastMeasurementRevision',
        'reservedBytes',
      ],
      ['coverage', 'startedFrame', 'lastFrame'],
    ) ||
    typeof value['epoch'] !== 'string' ||
    !value['epoch'] ||
    !ordinal(value['openingOrdinal']) ||
    !ordinal(value['acquisition']) ||
    value['acquisition'] > value['openingOrdinal'] ||
    !finite(value['admittedAt']) ||
    value['admittedAt'] < 0 ||
    value['admittedAt'] > now ||
    !ordinal(value['admittedOrder']) ||
    !ordinal(value['startedMeasurementRevision']) ||
    !ordinal(value['lastMeasurementRevision']) ||
    !ordinal(value['reservedBytes']) ||
    !ordinal(value['count']) ||
    !finite(value['through']) ||
    value['through'] < 0 ||
    value['through'] > now ||
    !Array.isArray(value['members']) ||
    !value['members'].length ||
    !record(value['started'])
  )
    throw new Error('Invalid current recording annotation.');
  const times = value['started'];
  if (
    !hasRecordFields(times, [
      'valueMeasuredFrom',
      'valueMeasuredThrough',
      'valueAcquiredAt',
      'confirmedFrom',
      'confirmedThrough',
    ]) ||
    !Object.values(times).every(finite) ||
    Number(times['valueMeasuredFrom']) < 0 ||
    Number(times['valueMeasuredFrom']) > Number(times['valueMeasuredThrough']) ||
    Number(times['valueMeasuredThrough']) > Number(times['valueAcquiredAt']) ||
    Number(times['valueAcquiredAt']) > value['admittedAt'] ||
    Number(times['confirmedFrom']) < 0 ||
    Number(times['confirmedFrom']) > Number(times['confirmedThrough']) ||
    Number(times['confirmedThrough']) > now
  )
    throw new Error('Invalid current recording start clocks.');
  validateEvidenceSource(value['startedSource']);
  validateEvidenceSource(value['lastSource']);
  if (value['startedFrame'] !== undefined && !validObservationFrame(value['startedFrame']))
    throw new Error('Invalid initial recording receiver frame.');
  if (value['lastFrame'] !== undefined && !validObservationFrame(value['lastFrame']))
    throw new Error('Invalid current recording receiver frame.');
  if (
    !finite(value['lastAt']) ||
    value['lastAt'] < 0 ||
    value['lastAt'] > now ||
    !ordinal(value['lastOrder']) ||
    !record(value['lastTimes']) ||
    !hasRecordFields(value['lastTimes'], [
      'valueMeasuredFrom',
      'valueMeasuredThrough',
      'valueAcquiredAt',
      'confirmedFrom',
      'confirmedThrough',
    ]) ||
    !Object.values(value['lastTimes']).every(finite)
  )
    throw new Error('Invalid current recording predecessor.');
  const last = value['lastTimes'];
  if (
    Number(last['valueMeasuredFrom']) < 0 ||
    Number(last['valueMeasuredFrom']) > Number(last['valueMeasuredThrough']) ||
    Number(last['valueMeasuredThrough']) > Number(last['valueAcquiredAt']) ||
    Number(last['valueAcquiredAt']) > value['lastAt'] ||
    Number(last['confirmedFrom']) < 0 ||
    Number(last['confirmedFrom']) > Number(last['confirmedThrough']) ||
    Number(last['confirmedThrough']) > value['lastAt']
  )
    throw new Error('Invalid current recording predecessor clocks.');

  const kinds = new Set<string>(),
    seen = new Set<string>(),
    ordinals = new Set<number>();
  for (const member of value['members']) {
    if (
      !record(member) ||
      !hasRecordFields(member, ['kind', 'part', 'ordinal', 'bytes']) ||
      typeof member['kind'] !== 'string' ||
      !['value', 'detail', 'pose'].includes(String(member['part'])) ||
      !ordinal(member['bytes']) ||
      member['bytes'] <= 0 ||
      !ordinal(member['ordinal']) ||
      ordinals.has(member['ordinal']) ||
      !parts.some(([kind, part]) => kind === member['kind'] && part === member['part'])
    )
      throw new Error('Invalid current recording member.');
    const id = JSON.stringify([member['kind'], member['part']]);
    if (seen.has(id)) throw new Error('Duplicate current recording member.');
    seen.add(id);
    ordinals.add(member['ordinal']);
    kinds.add(member['kind']);
  }
  if (
    seen.size !== parts.length ||
    value['count'] !== kinds.size ||
    value['reservedBytes'] !==
      value['members'].reduce((sum, member) => sum + Number(member['bytes']), 0)
  )
    throw new Error('Current recording does not cover its exact held partition.');
  const coverage = value['coverage'];
  if (
    coverage !== undefined &&
    (!record(coverage) ||
      !hasRecordFields(coverage, ['id', 'memberOrdinals', 'measurement']) ||
      !ordinal(coverage['id']) ||
      typeof coverage['measurement'] !== 'boolean' ||
      !Array.isArray(coverage['memberOrdinals']) ||
      new Set(coverage['memberOrdinals']).size !== coverage['memberOrdinals'].length ||
      coverage['memberOrdinals'].some((member) => !ordinal(member) || !ordinals.has(member)))
  )
    throw new Error('Invalid current recording coverage declaration.');
}

export function validateTemporalValue(
  value: unknown,
  originals?: Map<string, string>,
): asserts value is TemporalValue {
  if (!record(value) || typeof value['kind'] !== 'string')
    throw new Error('Invalid temporal value.');
  if (value['kind'] === 'observation-header' || value['kind'] === 'observation-frame')
    throw new Error('Personal metadata is not a temporal fact.');
  if (value['kind'] === 'personal-account') {
    if (
      !['awareness', 'memory'].includes(String(value['source'])) ||
      typeof value['id'] !== 'string' ||
      !value['id'] ||
      typeof value['text'] !== 'string' ||
      (value['content'] !== undefined && typeof value['content'] !== 'string') ||
      (value['eventType'] !== undefined && typeof value['eventType'] !== 'string') ||
      (value['data'] !== undefined && !record(value['data']))
    )
      throw new Error('Invalid temporal personal account.');
  } else
    validateSensoryFacet(
      value as unknown as Exclude<TemporalValue, { kind: 'personal-account' }>,
      originals,
    );
}

/** Shared geometry contains no receiver proof; a personal receipt supplies it. */
export function validateTemporalFragment(
  value: unknown,
  originals?: Map<string, string>,
): asserts value is TemporalFragment {
  if (!record(value)) throw new Error('Invalid temporal fragment.');
  if (value['kind'] === 'observed-motion')
    throw new Error('Motion is derived from received points, not a stored payload.');
  if (value['kind'] === 'body') {
    if (
      !hasRecordFields(value, ['kind', 'body']) ||
      !record(value['body']) ||
      ['position', 'heading', 'supportSurfaceId'].some((key) =>
        Object.hasOwn(value['body'] as object, key),
      )
    )
      throw new Error('Invalid shared body details.');
    validateObservedBodyDetails(value['body'] as unknown as ObservedBodyDetails);
  } else if (value['kind'] === 'location') {
    if (!hasRecordFields(value, ['kind', 'location']))
      throw new Error('Invalid shared temporal location.');
    validateObservedLocation(value['location'] as ObservedLocation);
  } else if (value['kind'] === 'body-pose') {
    if (!hasRecordFields(value, ['kind', 'pose'])) throw new Error('Invalid shared temporal pose.');
    validateObservedBodyPose(value['pose'] as import('./perception-evidence.js').ObservedBodyPose);
  } else validateTemporalValue(value, originals);
}

function validateStoredValue(
  reference: Pick<TemporalFacetReference, 'reception' | 'support'>,
  fragment: TemporalFragment,
  originals: Map<string, string>,
  observer: ObserverLife,
  through: number,
  sources: import('./received-values.js').ReceivedValueLookup,
): TemporalValue {
  const reception = reference.reception;
  if (reception !== undefined) {
    if (!record(reception)) throw new Error('Invalid temporal reception.');
    if (reception.kind === 'body') {
      if (reception.poseRef) {
        if (
          !hasRecordFields(reception, ['kind', 'poseRef']) ||
          (typeof reception.poseRef === 'string'
            ? !isSafeRecordId(reception.poseRef)
            : !record(reception.poseRef))
        )
          throw new Error('Invalid shared body reception.');
      } else {
        if (!hasRecordFields(reception, ['kind', 'pose']))
          throw new Error('Invalid body reception.');
        validateObservedBodyPose(reception.pose!);
      }
    } else if (reception.kind === 'location') {
      if (!hasRecordFields(reception, ['kind', 'frame']))
        throw new Error('Invalid temporal location reception.');
    } else throw new Error('Unsupported temporal reception.');
  }
  if (reference.support) validateReceivedFacetProof(reference.support, observer, through);
  const value = materializeTemporalValue(reference, fragment, sources);
  if (!value) throw new Error('Temporal fragment has no matching personal reception.');
  validateTemporalValue(value, originals);
  return value;
}

function validateReceiver(value: TemporalValue, observer: ObserverLife, acquiredAt: number): void {
  if (value.kind === 'event' || value.kind === 'speech' || value.kind === 'sound')
    validateReceivedParticipantObservers(value, observer);
  if (
    value.kind === 'observed-motion' &&
    (value.exposure.observer.actorId !== observer.actorId ||
      value.exposure.observer.physicalLife !== observer.physicalLife ||
      value.earlier.acquiredAt > acquiredAt ||
      value.later.acquiredAt > acquiredAt ||
      value.earlier.confirmedThrough > acquiredAt ||
      value.later.confirmedThrough > acquiredAt)
  )
    throw new Error('Foreign or future temporal motion reception.');
}

/** Validates retained exact receipts, not a second interpretation of world truth.
 * Resident tails may omit cold chunks, so counters must cover at least the tail;
 * the repository audits complete canonical totals within its load snapshot. */
export function validateTemporalEvidenceState(
  world: WorldState,
  originals = new Map<string, string>(),
): void {
  const value = world.experience?.temporal;
  if (value === undefined) return;
  const maximumContextSubjects = selectedAttentionPolicy(world).maximumCapacity * 2;
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.namespace !== 'string' ||
    !isSafeRecordId(value.namespace) ||
    !hasRecordFields(value, ['version', 'namespace', 'actors']) ||
    !record(value.actors)
  )
    throw new Error('Invalid temporal evidence owner.');
  const temporal: TemporalEvidenceState = value;
  const sources = world.receivedValues?.sources ?? {};
  for (const [actorId, actor] of Object.entries(temporal.actors)) {
    if (
      !isSafeRecordId(actorId) ||
      !record(actor) ||
      !ordinal(actor.physicalLife) ||
      typeof actor.epoch !== 'string' ||
      !actor.epoch ||
      !ordinal(actor.nextOrdinal) ||
      !ordinal(actor.bytes) ||
      !ordinal(actor.count) ||
      !Array.isArray(actor.pages) ||
      typeof actor.maintenanceDue !== 'boolean' ||
      (actor.nextDue !== null && (!finite(actor.nextDue) || actor.nextDue < 0))
    )
      throw new Error('Invalid personal temporal owner.');
    if (
      actor.recordingGap !== undefined &&
      (!record(actor.recordingGap) ||
        !finite(actor.recordingGap.from) ||
        !finite(actor.recordingGap.through) ||
        actor.recordingGap.from < 0 ||
        actor.recordingGap.through < actor.recordingGap.from ||
        actor.recordingGap.through > world.simTime)
    )
      throw new Error('Invalid recording coverage gap.');
    let bytes = 0,
      count = 0;
    const chunks = new Set<string>(),
      receiptKeys = new Map<string, Set<number>>();
    const validateReference = (reference: {
      valueRef: import('./received-values.js').ReceivedValueReference;
    }) => {
      const fragment = receivedTemporalFragment(receivedValueAt(sources, reference));
      if (!fragment) throw new Error('Unavailable retained temporal fragment.');
      return fragment;
    };
    if (
      actor.releasedThrough !== undefined &&
      (!finite(actor.releasedThrough) ||
        actor.releasedThrough < 0 ||
        actor.releasedThrough > world.simTime)
    )
      throw new Error('Invalid temporal unavailable prefix.');
    if (
      actor.individualRepairs !== undefined &&
      (!Array.isArray(actor.individualRepairs) ||
        new Set(actor.individualRepairs).size !== actor.individualRepairs.length ||
        actor.individualRepairs.some((id) => !isSafeRecordId(id)))
    )
      throw new Error('Invalid pending individual reference repair.');
    if (
      actor.retiredThrough !== undefined &&
      (!record(actor.retiredThrough) ||
        !ordinal(actor.retiredThrough.pageOrder) ||
        !ordinal(actor.retiredThrough.ordinal) ||
        !finite(actor.retiredThrough.at) ||
        actor.retiredThrough.at < 0 ||
        actor.retiredThrough.at > world.simTime)
    )
      throw new Error('Invalid temporal retention frontier.');
    if (actor.accounts !== undefined) {
      if (
        !record(actor.accounts) ||
        Object.keys(actor.accounts).some(
          (key) => !['nextDue', 'optional', 'required', 'speech', 'archives'].includes(key),
        )
      )
        throw new Error('Invalid retained account counters.');
      if (
        actor.accounts.nextDue !== null &&
        (!finite(actor.accounts.nextDue) || actor.accounts.nextDue < 0)
      )
        throw new Error('Invalid account retention deadline.');
      if (
        actor.accounts.archives !== undefined &&
        (!record(actor.accounts.archives) ||
          Object.keys(actor.accounts.archives).length !== 3 ||
          ['optional', 'required', 'speech'].some(
            (key) => !Object.hasOwn(actor.accounts!.archives!, key),
          ))
      )
        throw new Error('Invalid exact source closure counters.');
      for (const key of ['optional', 'required', 'speech'] as const) {
        const counter = actor.accounts[key];
        if (!record(counter) || !ordinal(counter.bytes) || !ordinal(counter.count))
          throw new Error('Invalid retained account counter.');
        const archive = actor.accounts.archives?.[key];
        if (
          archive &&
          (!record(archive) ||
            !ordinal(archive.bytes) ||
            !ordinal(archive.count) ||
            archive.bytes > counter.bytes ||
            archive.count > counter.count)
        )
          throw new Error('Invalid exact source closure charge.');
      }
    }
    const validateFields = (
      receipt: Pick<TemporalReceipt, 'facets' | 'at' | 'physicalLife'>,
      fragments?: TemporalFragment[],
    ) => {
      const ordinals = new Set<number>();
      receipt.facets.forEach((facet: TemporalFacetReference, index: number) => {
        if (facet.poseFrame !== undefined && !validObservationFrame(facet.poseFrame))
          throw new Error('Invalid received pose viewpoint.');
        if (!ordinal(facet.ordinal) || ordinals.has(facet.ordinal))
          throw new Error('Invalid temporal fact ordinal.');
        ordinals.add(facet.ordinal);
        const fragment = fragments ? fragments[index] : validateReference(facet);
        if (fragments) validateTemporalFragment(fragment, originals);
        if (!fragment) throw new Error('Unavailable retained temporal fragment.');
        const value = validateStoredValue(
          facet,
          fragment,
          originals,
          { actorId, physicalLife: receipt.physicalLife },
          receipt.at,
          sources,
        );
        if (
          !['direct', 'inference', 'testimony'].includes(facet.role) ||
          !finite(facet.asOf) ||
          facet.asOf < 0 ||
          !finite(facet.measuredFrom) ||
          !finite(facet.measuredThrough) ||
          !finite(facet.acquiredAt) ||
          facet.measuredFrom < 0 ||
          facet.measuredFrom > facet.measuredThrough ||
          facet.measuredThrough > facet.acquiredAt ||
          facet.acquiredAt > receipt.at ||
          facet.asOf !== facet.measuredThrough ||
          facet.asOf > receipt.at
        )
          throw new Error('Invalid temporal measurement interval.');
        if (facet.detailSupport) {
          const detail = facet.detailSupport;
          if (
            value.kind !== 'body' ||
            !hasRecordFields(detail, ['proof', 'role', 'from', 'through', 'acquiredAt']) ||
            !['direct', 'inference', 'testimony'].includes(detail.role) ||
            ![detail.from, detail.through, detail.acquiredAt].every(finite) ||
            detail.from < 0 ||
            detail.from > detail.through ||
            detail.through > detail.acquiredAt ||
            detail.acquiredAt > receipt.at
          )
            throw new Error('Invalid independent outward detail support.');
          validateReceivedFacetProof(
            detail.proof,
            { actorId, physicalLife: receipt.physicalLife },
            receipt.at,
          );
        }
        validateReceiver(value, { actorId, physicalLife: receipt.physicalLife }, facet.acquiredAt);
        if (facet.confirmedThrough !== undefined) {
          if (
            !finite(facet.confirmedThrough) ||
            facet.confirmedThrough < facet.measuredThrough ||
            facet.confirmedThrough > receipt.at ||
            !facet.original ||
            (facet.support !== undefined &&
              facet.support.confirmedThrough !== facet.confirmedThrough)
          )
            throw new Error('Invalid held geometry confirmation.');
        }
        for (const source of [
          facet.original?.source,
          facet.receivedFrom,
          facet.support?.original.source,
          facet.support?.confirmation,
        ])
          if (source) {
            validateEvidenceSource(source);
            if (
              source.observer.actorId !== actorId ||
              source.observer.physicalLife !== receipt.physicalLife
            )
              throw new Error('Foreign temporal original.');
          }
        if (facet.original && !ordinal(facet.original.ordinal))
          throw new Error('Invalid temporal original ordinal.');
      });
    };
    const validateReceipt = (receipt: TemporalReceipt, fragments?: TemporalFragment[]) => {
      if (
        !record(receipt) ||
        receipt.actorId !== actorId ||
        !ordinal(receipt.physicalLife) ||
        typeof receipt.epoch !== 'string' ||
        !receipt.epoch ||
        !ordinal(receipt.ordinal) ||
        !ordinal(receipt.acquisition) ||
        receipt.acquisition > receipt.ordinal ||
        receipt.id !== temporalReceiptId(receipt) ||
        !finite(receipt.at) ||
        receipt.at < 0 ||
        receipt.at > world.simTime ||
        !ordinal(receipt.order) ||
        (receipt.receiverFrame !== undefined && !validObservationFrame(receipt.receiverFrame)) ||
        (receipt.coverageGap !== undefined &&
          (!finite(receipt.coverageGap.from) ||
            !finite(receipt.coverageGap.through) ||
            receipt.coverageGap.from < 0 ||
            receipt.coverageGap.from > receipt.coverageGap.through ||
            receipt.coverageGap.through > receipt.at)) ||
        !temporalSubject(receipt.subject) ||
        (receipt.contextSubjects !== undefined &&
          (!strings(receipt.contextSubjects) ||
            !receipt.contextSubjects.every(temporalSubject) ||
            receipt.contextSubjects.length > maximumContextSubjects)) ||
        (receipt.subjectIdentity !== undefined && !validObserverSubject(receipt.subjectIdentity)) ||
        ![
          'baseline',
          'change',
          'loss',
          'unchecked',
          'occurrence',
          'attention-exit',
          'receiver-frame',
          'retained-state',
        ].includes(receipt.change) ||
        (receipt.availabilityAt !== undefined &&
          (!['loss', 'unchecked', 'attention-exit'].includes(receipt.change) ||
            !finite(receipt.availabilityAt) ||
            receipt.availabilityAt < 0 ||
            receipt.availabilityAt > receipt.at)) ||
        (receipt.change === 'retained-state' && !fragments) ||
        (receipt.spatialContext !== undefined && receipt.spatialContext !== true) ||
        typeof receipt.required !== 'boolean' ||
        !strings(receipt.sourceIds) ||
        !Array.isArray(receipt.facets) ||
        (!receipt.facets.length && receipt.change !== 'receiver-frame')
      )
        throw new Error('Invalid personal temporal receipt.');
      if (receipt.origin) {
        const origin = receipt.origin;
        if (!record(origin)) throw new Error('Invalid temporal receipt origin.');
        if (origin.kind === 'occurrence') {
          if (
            !isSafeRecordId(origin.eventId) ||
            !finite(origin.at) ||
            origin.at < 0 ||
            origin.at > receipt.at ||
            !ordinal(origin.order)
          )
            throw new Error('Invalid temporal occurrence origin.');
        } else if (
          origin.kind !== 'exposure' ||
          typeof origin.episodeId !== 'string' ||
          !origin.episodeId ||
          typeof origin.detectorId !== 'string' ||
          !origin.detectorId ||
          !finite(origin.measuredFrom) ||
          !finite(origin.measuredThrough) ||
          origin.measuredFrom < 0 ||
          origin.measuredFrom > origin.measuredThrough ||
          origin.measuredThrough > receipt.at
        )
          throw new Error('Invalid temporal exposure origin.');
        if (origin.kind === 'exposure' && origin.source) {
          validateEvidenceSource(origin.source);
          if (
            origin.source.observer.actorId !== actorId ||
            origin.source.observer.physicalLife !== receipt.physicalLife
          )
            throw new Error('Foreign temporal origin source.');
        }
      }
      if (
        receipt.spatialContext &&
        receipt.facets.some((reference, index) => {
          const fragment = fragments?.[index] ?? validateReference(reference);
          return fragment.kind !== 'surface-patch' && fragment.kind !== 'physical-boundary';
        })
      )
        throw new Error('Invalid received feature context.');
      validateFields(receipt, fragments);
      if (receipt.availability)
        validateFieldAvailability(receipt.availability, receipt.facets, receipt.at);
    };
    if (actor.supports !== undefined) {
      if (!record(actor.supports)) throw new Error('Invalid temporal support owner.');
      for (const [id, capsule] of Object.entries(actor.supports)) {
        if (
          !record(capsule) ||
          capsule.receipt.id !== id ||
          !ordinal(capsule.bytes) ||
          typeof capsule.required !== 'boolean' ||
          !Array.isArray(capsule.values) ||
          capsule.values.length !== capsule.receipt.facets.length
        )
          throw new Error('Invalid temporal support capsule.');
        validateReceipt(capsule.receipt, capsule.values);
        if (capsule.bytes !== temporalSupportLogicalBytes(capsule))
          throw new Error('Invalid temporal support charge.');
      }
    }
    for (const page of actor.pages) {
      if (
        !record(page) ||
        !isSafeRecordId(page.id) ||
        chunks.has(page.id) ||
        !ordinal(page.order) ||
        page.actorId !== actorId ||
        !ordinal(page.physicalLife) ||
        typeof page.epoch !== 'string' ||
        !page.epoch ||
        !ordinal(page.fromOrdinal) ||
        !ordinal(page.throughOrdinal) ||
        page.fromOrdinal > page.throughOrdinal ||
        !finite(page.fromAt) ||
        !finite(page.throughAt) ||
        page.fromAt < 0 ||
        page.fromAt > page.throughAt ||
        page.throughAt > world.simTime ||
        !ordinal(page.bytes) ||
        !ordinal(page.count) ||
        (page.appendClosed !== undefined && page.appendClosed !== true) ||
        !Array.isArray(page.operations) ||
        !page.operations.length ||
        !Array.isArray(page.declarations) ||
        !strings(page.subjects) ||
        !page.subjects.every(temporalSubject) ||
        !strings(page.sourceIds) ||
        !strings(page.individualIds) ||
        !strings(page.sourceRefs)
      )
        throw new Error('Invalid personal temporal page.');
      chunks.add(page.id);
      bytes += page.bytes;
      count += page.count;
      const declarations = new Map<number, (typeof page.declarations)[number]>(),
        used = new Set<number>();
      for (const declaration of page.declarations) {
        if (
          !record(declaration) ||
          !hasRecordFields(declaration, ['id', 'subject', 'members', 'seeds']) ||
          !ordinal(declaration.id) ||
          declarations.has(declaration.id) ||
          !temporalSubject(declaration.subject) ||
          !Array.isArray(declaration.members) ||
          !declaration.members.length ||
          !Array.isArray(declaration.seeds)
        )
          throw new Error('Invalid temporal check declaration.');
        const members = new Set<string>();
        for (const member of declaration.members) {
          if (
            !record(member) ||
            !hasRecordFields(
              member,
              ['locator', 'memberOrdinal', 'original', 'role'],
              ['part', 'confirmationIdentity', 'revisionFloor'],
            ) ||
            !record(member.locator) ||
            member.locator.actorId !== actorId ||
            member.locator.physicalLife !== page.physicalLife ||
            member.locator.epoch !== page.epoch ||
            !ordinal(member.locator.ordinal) ||
            !ordinal(member.memberOrdinal) ||
            !record(member.original) ||
            !ordinal(member.original.ordinal) ||
            typeof member.role !== 'string' ||
            !['direct', 'inference', 'testimony'].includes(member.role)
          )
            throw new Error('Invalid temporal check member.');
          validateEvidenceSource(member.original.source);
          if (
            (member.part !== undefined &&
              !['value', 'detail', 'pose'].includes(String(member.part))) ||
            (member.revisionFloor !== undefined && !ordinal(member.revisionFloor))
          )
            throw new Error('Invalid temporal check part.');
          if (member.confirmationIdentity) {
            if (!record(member.confirmationIdentity))
              throw new Error('Invalid temporal check identity.');
            const identity = {
              ...member.confirmationIdentity,
              revision: member.revisionFloor ?? 1,
            };
            validateEvidenceSource(identity);
            if (
              identity.observer.actorId !== actorId ||
              identity.observer.physicalLife !== page.physicalLife
            )
              throw new Error('Foreign temporal check identity.');
          }

          if (
            member.original.source.observer.actorId !== actorId ||
            member.original.source.observer.physicalLife !== page.physicalLife
          )
            throw new Error('Foreign temporal check original.');
          const id = JSON.stringify([
            member.locator.epoch,
            member.locator.ordinal,
            member.memberOrdinal,
          ]);
          if (members.has(id)) throw new Error('Duplicate temporal check member.');
          members.add(id);
        }
        const seeds = new Set<number>();
        for (const seed of declaration.seeds) {
          validateClockSeed(
            seed,
            { actorId, physicalLife: page.physicalLife },
            world.simTime,
            Number.MAX_SAFE_INTEGER,
            sources,
          );
          if (seed.member >= declaration.members.length || seeds.has(seed.member))
            throw new Error('Invalid temporal predecessor membership.');
          const member = declaration.members[seed.member]!;
          if (canonicalJson(seed.support.original) !== canonicalJson(member.original))
            throw new Error('Temporal predecessor has another original.');
          seeds.add(seed.member);
        }
        if (seeds.size !== declaration.members.length)
          throw new Error('Temporal checks require self-contained predecessor clocks.');
        declarations.set(declaration.id, declaration);
      }
      let priorOrdinal = -1;
      for (const operation of temporalPageOperations(page)) {
        if (!record(operation) || !ordinal(operation.ordinal) || operation.ordinal <= priorOrdinal)
          throw new Error('Invalid temporal operation order.');
        priorOrdinal = operation.ordinal;
        if (
          !record(operation.charge) ||
          !hasRecordFields(operation.charge, ['bytes', 'count']) ||
          !ordinal(operation.charge.bytes) ||
          operation.charge.bytes <= 0 ||
          !ordinal(operation.charge.count) ||
          operation.charge.count <= 0 ||
          operation.charge.count !== temporalOperationLogicalCount(operation, page.declarations) ||
          operation.charge.bytes !== temporalOperationLogicalBytes(operation, sources)
        )
          throw new Error('Invalid temporal operation charge.');
        if (operation.kind === 'check') {
          if (
            !hasRecordFields(operation, [
              'ordinal',
              'kind',
              'at',
              'order',
              'acquisition',
              'stamps',
              'charge',
            ]) ||
            !finite(operation.at) ||
            operation.at < 0 ||
            operation.at > world.simTime ||
            !ordinal(operation.order) ||
            !ordinal(operation.acquisition) ||
            operation.acquisition > operation.ordinal ||
            !Array.isArray(operation.stamps) ||
            !operation.stamps.length
          )
            throw new Error('Invalid received temporal check.');
          for (const stamp of operation.stamps) {
            const declaration = declarations.get(stamp.declaration);
            if (
              !record(stamp) ||
              !hasRecordFields(
                stamp,
                ['declaration', 'confirmation', 'confirmedFrom', 'confirmedThrough'],
                ['measurement', 'frame'],
              ) ||
              !declaration ||
              !finite(stamp.confirmedFrom) ||
              !finite(stamp.confirmedThrough) ||
              stamp.confirmedFrom < 0 ||
              stamp.confirmedFrom > stamp.confirmedThrough ||
              stamp.confirmedThrough > operation.at ||
              (stamp.frame !== undefined && !validObservationFrame(stamp.frame))
            )
              throw new Error('Invalid exact check clocks.');
            validateEvidenceSource(stamp.confirmation);
            if (
              stamp.confirmation.observer.actorId !== actorId ||
              stamp.confirmation.observer.physicalLife !== page.physicalLife
            )
              throw new Error('Foreign temporal confirmation.');
            for (const seed of declaration.seeds)
              if (seed.order > operation.order || seed.receivedAt > operation.at)
                throw new Error('Temporal seed is later than its check.');
            if (stamp.measurement) {
              const measured = stamp.measurement;
              if (
                !record(measured) ||
                !hasRecordFields(measured, [
                  'measuredFrom',
                  'measuredThrough',
                  'acquiredAt',
                  'receivedFrom',
                ]) ||
                !finite(measured.measuredFrom) ||
                !finite(measured.measuredThrough) ||
                !finite(measured.acquiredAt) ||
                measured.measuredFrom < 0 ||
                measured.measuredFrom > measured.measuredThrough ||
                measured.measuredThrough > measured.acquiredAt ||
                measured.acquiredAt > operation.at
              )
                throw new Error('Invalid exact measurement clocks.');
              validateEvidenceSource(measured.receivedFrom);
              if (
                measured.receivedFrom.observer.actorId !== actorId ||
                measured.receivedFrom.observer.physicalLife !== page.physicalLife
              )
                throw new Error('Foreign temporal measurement.');
            }
            used.add(declaration.id);
          }
        } else if (operation.kind === 'span' || operation.kind === 'occurrence') {
          if (
            !hasRecordFields(
              operation,
              operation.kind === 'span'
                ? [
                    'ordinal',
                    'kind',
                    'receipt',
                    'charge',
                    'closedAt',
                    'closedOrder',
                    'reason',
                    'terminal',
                  ]
                : ['ordinal', 'kind', 'receipt', 'charge'],
            )
          )
            throw new Error('Invalid temporal retained value.');
          const receipt = operation.receipt;
          validateReceipt(receipt);
          if (receipt.physicalLife !== page.physicalLife || receipt.epoch !== page.epoch)
            throw new Error('Foreign temporal page receipt.');
          const receiptKey = JSON.stringify([receipt.physicalLife, receipt.epoch, receipt.ordinal]);
          const retainedMembers = receiptKeys.get(receiptKey) ?? new Set<number>();
          for (const field of receipt.facets) {
            if (retainedMembers.has(field.ordinal))
              throw new Error('Duplicate temporal logical member.');
            retainedMembers.add(field.ordinal);
          }
          receiptKeys.set(receiptKey, retainedMembers);
          if (
            operation.kind === 'span' &&
            (!finite(operation.closedAt) ||
              operation.closedAt < receipt.at ||
              operation.closedAt > world.simTime ||
              !ordinal(operation.closedOrder) ||
              operation.closedOrder < receipt.order)
          )
            throw new Error('Invalid temporal span boundary.');
          if (operation.kind === 'span') {
            if (
              !Array.isArray(operation.terminal) ||
              operation.terminal.length !== receipt.facets.length
            )
              throw new Error('Closed span requires exact terminal clocks.');
            const terminalMembers = new Set<number>();
            for (const seed of operation.terminal) {
              validateClockSeed(
                seed,
                { actorId, physicalLife: page.physicalLife },
                operation.closedAt,
                operation.closedOrder,
                sources,
              );
              const field = receipt.facets.find((field) => field.ordinal === seed.member);
              if (!field || terminalMembers.has(seed.member))
                throw new Error('Invalid closed span terminal membership.');
              const original =
                seed.part === 'detail' ? field.detailSupport?.proof.original : field.original;
              if (canonicalJson(original) !== canonicalJson(seed.support.original))
                throw new Error('Terminal clock has another original.');
              terminalMembers.add(seed.member);
            }
          }
        } else throw new Error('Unsupported temporal operation.');
      }
      if (used.size !== declarations.size)
        throw new Error('Unreferenced temporal check declaration.');
      const meta = temporalPageMetadata(page, { world, sources });
      const same = (a: readonly string[], b: readonly string[]) =>
        a.length === b.length && a.every((id) => b.includes(id));
      if (
        !same(meta.subjects, page.subjects) ||
        !same(meta.sourceIds, page.sourceIds) ||
        !same(meta.individualIds, page.individualIds) ||
        !same(meta.sourceRefs, page.sourceRefs) ||
        meta.changes !== page.count ||
        page.bytes !== temporalPageLogicalBytes(page, sources) ||
        page.fromOrdinal !== page.operations[0]!.ordinal ||
        page.throughOrdinal !== page.operations.at(-1)!.ordinal ||
        meta.firstAt !== page.fromAt ||
        meta.lastAt !== page.throughAt
      )
        throw new Error('Temporal page metadata disagrees with its canonical operations.');
      if (
        page.epoch === actor.epoch &&
        page.physicalLife === actor.physicalLife &&
        page.throughOrdinal >= actor.nextOrdinal
      )
        throw new Error('Temporal receipt counter precedes its retained tail.');
    }
    const current = world.perceptionEvidence?.[actorId]?.current;
    if (current)
      for (const [, contact] of orderedRecordEntries(current))
        for (const group of contact.content.groups)
          for (const partition of group.metadata) {
            const mark = partition.recording;
            if (!mark) continue;
            validateTemporalCurrentGroupCheckpoint(mark, world.simTime, partition.members);
            if (
              mark.epoch !== actor.epoch ||
              mark.openingOrdinal >= actor.nextOrdinal ||
              mark.startedSource.observer.actorId !== actorId ||
              mark.startedSource.observer.physicalLife !== actor.physicalLife
            )
              throw new Error('Current recording belongs to another reception epoch.');
            bytes += mark.reservedBytes;
            count += mark.count;
          }
    if (bytes > actor.bytes || count > actor.count)
      throw new Error('Understated temporal retention counters.');
  }
}
