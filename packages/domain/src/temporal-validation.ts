import { compactReceivedReceipt } from './received-record.js';
import { canonicalJson } from './events.js';
import { validReceivedTrackKey } from './perception-values.js';
import { receivedValueAt } from './received-values.js';
import { orderedRecordEntries, validateOrderedRecord } from './ordered-record.js';
import {
  temporalPageMetadata,
  materializeReceivedEntry,
  temporalPageMutation,
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
import { hasRecordFields, isImmutableData, isSafeRecordId } from './records.js';
import { selectedAttentionPolicy } from './world-composition.js';
import {
  temporalReceiptId,
  materializeTemporalValue,
  temporalPageLogicalBytes,
  installTemporalChargeDirectories,
  temporalSupportLogicalBytes,
  receivedTemporalFragment,
  temporalReceiptChangeCount,
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

/** Candidate/index headers are exact unique memberships, not chronological lists. */
function sameStringMembers(value: unknown, expected: readonly string[]): boolean {
  if (!strings(value) || !strings(expected) || value.length !== expected.length) return false;
  const members = new Set(expected);
  return value.every((item) => members.has(item));
}

function validateFieldAvailability(
  groups: readonly TemporalCheckpointAvailability[],
  facets: readonly TemporalFacetReference[],
  at: number,
): void {
  if (!Array.isArray(groups)) throw new Error('Invalid retained field availability.');
  const assigned = new Set<number>(),
    fields = new Set(facets.map((facet) => facet.memberIndex));
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

/** Shared current-format native binding validation, including bindings whose
 * older raw observations have already expired. */
export function validateTemporalCurrentGroupCheckpoint(
  _world: WorldState,
  value: unknown,
  now: number,
  parts: readonly (readonly [string, 'value' | 'detail' | 'pose'])[],
): asserts value is import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint {
  const mark = value as import('./temporal-evidence.js').TemporalCurrentGroupCheckpoint;
  if (
    !record(mark) ||
    typeof mark.epoch !== 'string' ||
    !mark.epoch ||
    !Array.isArray(mark.members) ||
    !mark.members.length ||
    !Array.isArray(mark.content) ||
    !finite(mark.lastAt) ||
    mark.lastAt > now ||
    !ordinal(mark.lastOrder) ||
    !ordinal(mark.lastMeasurementRevision) ||
    !ordinal(mark.terminalBytes) ||
    typeof mark.gap !== 'boolean' ||
    (mark.refusedAt !== undefined &&
      (!Array.isArray(mark.refusedAt) ||
        mark.refusedAt.length !== 2 ||
        !mark.refusedAt.every(ordinal) ||
        !mark.gap)) ||
    !mark.members.every((member) =>
      parts.some(([kind, part]) => member.kind === kind && member.part === part),
    ) ||
    !mark.content.every((value) =>
      mark.members.some((member) => member.kind === value.kind && member.part === value.part),
    )
  )
    throw new Error('Invalid sparse recording continuation.');
  validateEvidenceSource(mark.lastSource);
}
function validateReceipt(
  world: WorldState,
  receipt: TemporalReceipt,
  actorId: string,
  values?: readonly TemporalFragment[],
): void {
  if (
    !record(receipt) ||
    receipt.actorId !== actorId ||
    !ordinal(receipt.physicalLife) ||
    typeof receipt.epoch !== 'string' ||
    !ordinal(receipt.batchOrder) ||
    !ordinal(receipt.entryIndex) ||
    receipt.id !== temporalReceiptId(receipt) ||
    !finite(receipt.at) ||
    receipt.at < 0 ||
    receipt.at > world.simTime ||
    !ordinal(receipt.order) ||
    !ordinal(receipt.acquisition) ||
    !temporalSubject(receipt.subject) ||
    typeof receipt.required !== 'boolean' ||
    !strings(receipt.sourceIds) ||
    !Array.isArray(receipt.facets) ||
    (!receipt.facets.length &&
      !['loss', 'unchecked', 'attention-exit', 'recording-gap'].includes(receipt.change)) ||
    ![
      'baseline',
      'change',
      'loss',
      'unchecked',
      'occurrence',
      'attention-exit',
      'recording-gap',
      'receiver-frame',
      'retained-state',
    ].includes(receipt.change)
  )
    throw new Error('Invalid received receipt.');
  const members = new Set<number>(),
    observer = { actorId, physicalLife: receipt.physicalLife },
    sources = world.receivedValues?.sources ?? {};
  receipt.facets.forEach((facet, index) => {
    if (
      !ordinal(facet.memberIndex) ||
      members.has(facet.memberIndex) ||
      !['direct', 'inference', 'testimony'].includes(facet.role) ||
      ![facet.asOf, facet.measuredFrom, facet.measuredThrough, facet.acquiredAt].every(finite) ||
      facet.measuredFrom < 0 ||
      facet.measuredThrough < facet.measuredFrom ||
      facet.measuredThrough > facet.acquiredAt ||
      facet.acquiredAt > receipt.at
    )
      throw new Error('Invalid received logical member.');
    members.add(facet.memberIndex);
    const fragment =
      values?.[index] ?? receivedTemporalFragment(receivedValueAt(sources, facet.valueRef));
    if (!fragment) throw new Error('Received member has no retained value.');
    validateTemporalFragment(fragment);
    for (const source of [
      facet.original?.source,
      facet.receivedFrom,
      facet.support?.confirmation,
      facet.support?.original.source,
      facet.detailSupport?.proof.confirmation,
      facet.detailSupport?.proof.original.source,
    ])
      if (source) {
        validateEvidenceSource(source);
        if (
          source.observer.actorId !== actorId ||
          source.observer.physicalLife !== receipt.physicalLife
        )
          throw new Error('Foreign received source.');
      }
    if (facet.support) validateReceivedFacetProof(facet.support, observer, receipt.at);
    if (facet.detailSupport)
      validateReceivedFacetProof(facet.detailSupport.proof, observer, receipt.at);
    validateStoredValue(facet, fragment, new Map(), observer, receipt.at, sources);
  });
  if (receipt.endedFields !== undefined) {
    if (
      !Array.isArray(receipt.endedFields) ||
      !receipt.endedFields.length ||
      !['loss', 'unchecked', 'attention-exit', 'recording-gap'].includes(receipt.change) ||
      !receipt.endedFields.every(
        (field) =>
          Array.isArray(field) &&
          field.length === 2 &&
          typeof field[0] === 'string' &&
          !!field[0] &&
          ['value', 'detail', 'pose'].includes(field[1]),
      ) ||
      new Set(receipt.endedFields.map((field) => JSON.stringify(field))).size !==
        receipt.endedFields.length
    )
      throw new Error('Invalid received field boundary.');
  }
  if (receipt.receiverFrame && !validObservationFrame(receipt.receiverFrame))
    throw new Error('Invalid received frame.');
  if (receipt.subjectIdentity && !validObserverSubject(receipt.subjectIdentity))
    throw new Error('Invalid acquired subject.');
  if (receipt.availability)
    validateFieldAvailability(receipt.availability, receipt.facets, receipt.at);
}
export function validateTemporalPage(
  world: WorldState,
  page: import('./temporal-evidence.js').TemporalPage,
  actorId = page.actorId,
): void {
  if (
    !record(page) ||
    page.actorId !== actorId ||
    !isSafeRecordId(page.id) ||
    !ordinal(page.physicalLife) ||
    !ordinal(page.order) ||
    typeof page.epoch !== 'string' ||
    !Array.isArray(page.batches) ||
    (!page.batches.length && temporalPageMutation(page) !== 'edit')
  )
    throw new Error('Invalid received history block.');
  let priorOrder = -1;
  const addresses = new Set<string>();
  for (const batch of page.batches) {
    if (
      batch.actorId !== actorId ||
      batch.physicalLife !== page.physicalLife ||
      batch.epoch !== page.epoch ||
      !ordinal(batch.batchOrder) ||
      batch.batchOrder < priorOrder ||
      !Array.isArray(batch.entries) ||
      !batch.entries.length ||
      Object.keys(batch).some(
        (key) => !['actorId', 'physicalLife', 'epoch', 'batchOrder', 'entries'].includes(key),
      )
    )
      throw new Error('Invalid sparse received block.');
    priorOrder = batch.batchOrder;
    let previous = -1;
    for (const entry of batch.entries) {
      const address = JSON.stringify([batch.batchOrder, entry.entryIndex]);
      if (
        !ordinal(entry.entryIndex) ||
        entry.entryIndex <= previous ||
        addresses.has(address) ||
        !ordinal(entry.order) ||
        !finite(entry.receivedAt) ||
        entry.receivedAt > world.simTime ||
        !['baseline', 'sample', 'boundary', 'occurrence'].includes(entry.kind) ||
        typeof entry.required !== 'boolean' ||
        !record(entry.charge) ||
        !ordinal(entry.charge.bytes) ||
        !ordinal(entry.charge.count) ||
        !entry.receipt ||
        !Array.isArray(entry.receipt.sources) ||
        !Array.isArray(entry.receipt.frames) ||
        !Array.isArray(entry.receipt.facets) ||
        entry.charge.count !== temporalReceiptChangeCount(entry.receipt) ||
        Object.keys(entry).some(
          (key) =>
            ![
              'entryIndex',
              'order',
              'receivedAt',
              'kind',
              'required',
              'receipt',
              'charge',
            ].includes(key),
        )
      )
        throw new Error('Invalid sparse received change.');
      const received = materializeReceivedEntry(batch, entry);
      if (!received) throw new Error('Received change has no admitted content.');
      validateReceipt(world, received, actorId);
      // Only the untrusted current-format boundary checks canonical compactness;
      // ordinary acquisition and reads do not repeat this reconstruction.
      if (canonicalJson(compactReceivedReceipt(batch, received)) !== canonicalJson(entry.receipt))
        throw new Error('Noncanonical received record.');
      addresses.add(address);
      previous = entry.entryIndex;
    }
  }
  const metadata = temporalPageMetadata(page, { world });
  if (
    page.count !== metadata.count ||
    page.bytes !== metadata.entryBytes ||
    !sameStringMembers(page.subjects, metadata.subjects) ||
    !sameStringMembers(page.sourceIds, metadata.sourceIds) ||
    !sameStringMembers(page.sourceRefs, metadata.references) ||
    !sameStringMembers(page.individualIds, metadata.individualIds)
  )
    throw new Error('Received block projections disagree with payload.');
}
export function validateTemporalEvidenceState(
  world: WorldState,
  value: TemporalEvidenceState | undefined,
): void {
  if (value === undefined) return;
  if (
    !record(value) ||
    value.version !== 1 ||
    typeof value.namespace !== 'string' ||
    !record(value.actors)
  )
    throw new Error('Invalid received history owner.');
  for (const [actorId, actor] of Object.entries(value.actors)) {
    if (
      !ordinal(actor.physicalLife) ||
      typeof actor.epoch !== 'string' ||
      !Array.isArray(actor.pages) ||
      !ordinal(actor.bytes) ||
      !ordinal(actor.count) ||
      !ordinal(actor.terminalReservedBytes) ||
      !record(actor.recent) ||
      !record(actor.recent.blocks) ||
      !record(actor.recent.individuals)
    )
      throw new Error('Invalid received actor history.');
    for (const page of actor.pages) validateTemporalPage(world, page, actorId);
    // Restore validates the one saved scalar against its actual existing owners.
    // Ordinary receiving maintains it incrementally; no sensing pass scans marks.
    const current = world.perceptionEvidence?.[actorId];
    let reserved = 0;
    if (current) {
      for (const [, contact] of orderedRecordEntries(current.current))
        for (const group of contact.content.groups)
          for (const mark of group.recordings ?? [])
            if (!mark.gap) reserved += mark.terminalBytes * mark.members.length;
      for (const feature of [
        ...(current.geometry?.fragments ?? []),
        ...(current.geometry?.boundaries ?? []),
      ]) {
        const mark = feature.recording;
        if (mark && !mark.gap) reserved += mark.terminalBytes * mark.members.length;
      }
    }
    if (reserved !== actor.terminalReservedBytes)
      throw new Error('Recording terminal reservations disagree with current owners.');
    const reconstructed = { ...actor };
    validateOrderedRecord(
      actor.recent.blocks,
      (value) => record(value) && Array.isArray(value.entries),
    );
    validateOrderedRecord(actor.recent.individuals, (value) => ordinal(value) && Number(value) > 0);
    installTemporalChargeDirectories(
      reconstructed,
      [...orderedRecordEntries(actor.recent.blocks)].map(([, directory]) => directory),
    );
    if (
      reconstructed.bytes !== actor.bytes ||
      reconstructed.count !== actor.count ||
      canonicalJson([...orderedRecordEntries(reconstructed.recent.individuals)]) !==
        canonicalJson([...orderedRecordEntries(actor.recent.individuals)])
    )
      throw new Error('Recent charge directory disagrees with actor totals.');
    for (const [id, capsule] of Object.entries(actor.supports ?? {})) {
      if (
        capsule.receipt.id !== id ||
        !Array.isArray(capsule.values) ||
        capsule.values.length !== capsule.receipt.facets.length ||
        !ordinal(capsule.bytes) ||
        typeof capsule.required !== 'boolean'
      )
        throw new Error('Invalid retained support capsule.');
      validateReceipt(world, capsule.receipt, actorId, capsule.values);
      if (capsule.bytes !== temporalSupportLogicalBytes(capsule))
        throw new Error('Retained support charge disagrees.');
    }
    const frontier = actor.frontier;
    if (
      frontier &&
      ((frontier.expiredThroughTime !== null &&
        (!finite(frontier.expiredThroughTime) || frontier.expiredThroughTime > world.simTime)) ||
        (frontier.pressureThrough &&
          (!ordinal(frontier.pressureThrough.address.batchOrder) ||
            !ordinal(frontier.pressureThrough.address.entryIndex) ||
            !ordinal(frontier.pressureThrough.address.memberIndex) ||
            !finite(frontier.pressureThrough.receivedAt) ||
            !ordinal(frontier.pressureThrough.order))))
    )
      throw new Error('Invalid received eligibility frontier.');
  }
}
