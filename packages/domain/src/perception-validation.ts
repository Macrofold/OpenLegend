import { canonicalJson } from './events.js';
import {
  currentFacetGet,
  currentFacetEntries,
  currentFacetCheckScope,
  type CurrentContact,
} from './perception-current.js';
import { validateOrderedRecord, orderedRecordEntries } from './ordered-record.js';
import { currentFacetGrant } from './perception-current.js';
import type { WorldState } from './types.js';
import type {
  ReceivedFacetValue,
  ReceivedObservation,
  SensoryFacet,
} from './perception-evidence.js';
import {
  materializeObservation,
  observationAcquisitionKey,
  receivedFacetValue,
  receivedObservationHeader,
  receivedObservationFrame,
  validObservationFrame,
  validObservationDetector,
  validateObservationContribution,
  validateReceivedParticipantObservers,
  validateSensoryFacet,
  validateObservedBodyPose,
  currentOriginalKey,
  currentFacetSupport,
  captureReceivedLocationSample,
  receivedPerceptionObservations,
} from './perception-evidence.js';
import { validateDetectionSupportState } from './perception-support.js';
import { validateReceivedGeometryState } from './received-geometry.js';
import { validateTemporalFragment } from './temporal-validation.js';
import { hasRecordFields, isSafeRecordId, jsonEncoding } from './records.js';
import { validObserverSubject } from './knowledge.js';
import { readOnlyDraftView } from './draft.js';

function validReceivedReference(
  value: unknown,
): value is import('./received-values.js').ReceivedValueReference {
  return (
    isSafeRecordId(value) ||
    (!!value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      'kind' in value &&
      typeof value.kind === 'string')
  );
}

/** A block's storage dates do not establish when a receiver saw anything; explicit
 * headers retain that personal timing. Released ordinals never become new values. */
export function validateReceivedValueState(
  world: WorldState,
  originals = new Map<string, string>(),
): void {
  const state = world.receivedValues;
  if (state === undefined) return;
  if (
    !hasRecordFields(state, ['sources']) ||
    !state.sources ||
    typeof state.sources !== 'object' ||
    Array.isArray(state.sources)
  )
    throw new Error('Invalid received value owner.');
  for (const [id, block] of Object.entries(state.sources)) {
    if (
      !hasRecordFields(block, ['id', 'at', 'sequence', 'value', 'bytes']) ||
      !isSafeRecordId(id) ||
      block.id !== id ||
      !Number.isFinite(block.at) ||
      block.at < 0 ||
      block.at > world.simTime ||
      !Number.isSafeInteger(block.sequence) ||
      block.sequence < 0 ||
      block.sequence > world.sequence ||
      !Number.isSafeInteger(block.bytes) ||
      block.bytes < 0 ||
      !block.value ||
      block.bytes !== jsonEncoding(block).bytes
    )
      throw new Error('Invalid received value block.');
    {
      const fragment = block.value;
      if (fragment?.kind === 'observation-header') {
        const header = fragment.header;
        if (
          !hasRecordFields(fragment, ['kind', 'header']) ||
          !hasRecordFields(header, ['observer', 'acquiredAt', 'modality', 'detector']) ||
          !hasRecordFields(header.observer, ['actorId', 'physicalLife']) ||
          !isSafeRecordId(header.observer.actorId) ||
          typeof header.observer.physicalLife !== 'number' ||
          !Number.isSafeInteger(header.observer.physicalLife) ||
          header.observer.physicalLife < 0 ||
          typeof header.acquiredAt !== 'number' ||
          !Number.isFinite(header.acquiredAt) ||
          header.acquiredAt < 0 ||
          header.acquiredAt > world.simTime ||
          !['sight', 'hearing', 'touch'].includes(header.modality) ||
          !validObservationDetector(header.detector)
        )
          throw new Error('Invalid received observation header.');
      } else if (fragment?.kind === 'body-pose') {
        if (!hasRecordFields(fragment, ['kind', 'pose']))
          throw new Error('Invalid shared body pose.');
        validateObservedBodyPose(fragment.pose);
      } else if (fragment?.kind === 'observation-frame') {
        if (!hasRecordFields(fragment, ['kind', 'frame']) || !validObservationFrame(fragment.frame))
          throw new Error('Invalid shared observation frame.');
      } else validateTemporalFragment(fragment, originals);
    }
  }
}

/** A compact address is neither a permission nor a received frame. Resolve only
 * the referenced value, then validate the same complete facet used by readers. */
export function validateReceivedFacetValue(
  world: WorldState,
  input: unknown,
  originals = new Map<string, string>(),
): SensoryFacet {
  if (
    !hasRecordFields(input, ['kind', 'reference'], ['reception']) ||
    typeof input.kind !== 'string' ||
    !validReceivedReference(input.reference) ||
    (input.kind === 'body'
      ? !hasRecordFields(input.reception, ['kind', 'poseRef']) ||
        input.reception.kind !== 'body' ||
        !validReceivedReference(input.reception.poseRef)
      : input.kind === 'location'
        ? !hasRecordFields(input.reception, ['kind', 'frameRef']) ||
          input.reception.kind !== 'location' ||
          !validReceivedReference(input.reception.frameRef)
        : input.kind === 'observed-motion' || input.reception !== undefined)
  )
    throw new Error('Invalid received facet reference.');
  const value = receivedFacetValue(world, input as unknown as ReceivedFacetValue);
  if (!value || value.kind !== input.kind) throw new Error('Unavailable received facet value.');
  validateSensoryFacet(value, originals);
  return value;
}

/** Current originals retain the full original facet order. Sparse receipt/support
 * selections have their separate ordinal owner and are never renumbered here. */
export function validateReceivedObservation(
  world: WorldState,
  input: unknown,
  originals = new Map<string, string>(),
): asserts input is ReceivedObservation {
  if (
    !hasRecordFields(input, ['id', 'revision', 'headerRef', 'origin', 'facets'], ['context']) ||
    !validReceivedReference(input.headerRef) ||
    !input.origin ||
    typeof input.origin !== 'object' ||
    !Array.isArray(input.facets)
  )
    throw new Error('Invalid received observation.');
  const source = input as unknown as ReceivedObservation;
  receivedObservationHeader(world, source);
  for (const [ordinal, facet] of source.facets.entries()) {
    if (
      !hasRecordFields(
        facet,
        ['value'],
        ['ordinal', 'role', 'asOf', 'measuredFrom', 'measuredThrough', 'acquiredAt', 'support'],
      ) ||
      (facet.ordinal !== undefined && facet.ordinal !== ordinal) ||
      (facet.role !== undefined && !['direct', 'testimony', 'inference'].includes(facet.role)) ||
      [facet.asOf, facet.measuredFrom, facet.measuredThrough, facet.acquiredAt].some(
        (time) => time !== undefined && (typeof time !== 'number' || !Number.isFinite(time)),
      )
    )
      throw new Error('Invalid received observation facet.');
    validateReceivedFacetValue(world, facet.value, originals);
  }
  validateObservationContribution(materializeObservation(world, source), originals);
}

export function validatePerceptionEvidenceState(
  world: WorldState,
  originals = new Map<string, string>(),
): void {
  validateReceivedValueState(world, originals);
  const states = world.perceptionEvidence;
  if (states === undefined) return;
  if (!states || typeof states !== 'object' || Array.isArray(states))
    throw new Error('Invalid active perception owners.');
  const validated = new WeakSet<ReceivedObservation>();
  const validateOriginal = (source: ReceivedObservation) => {
    if (validated.has(source)) return;
    validateReceivedObservation(world, source, originals);
    validated.add(source);
  };
  for (const [observerId, state] of Object.entries(states)) {
    if (
      !state ||
      !Number.isSafeInteger(state.life) ||
      state.life < 0 ||
      !Number.isSafeInteger(state.receivedAtSequence) ||
      state.receivedAtSequence < 0 ||
      state.receivedAtSequence > world.sequence ||
      !Array.isArray(state.received) ||
      !state.receipts ||
      typeof state.receipts !== 'object' ||
      Array.isArray(state.receipts) ||
      !Number.isSafeInteger(state.nextContact) ||
      state.nextContact < 0 ||
      !state.current ||
      typeof state.current !== 'object' ||
      Array.isArray(state.current) ||
      !state.gaps ||
      typeof state.gaps !== 'object' ||
      Array.isArray(state.gaps)
    )
      throw new Error('Invalid active perception owner.');
    const contactOrders = new Set<number>();
    validateOrderedRecord(state.current, (value): value is CurrentContact => {
      if (!hasRecordFields(value, ['order', 'content'], ['sight'])) return false;
      const contact = value as unknown as CurrentContact;
      if (!hasRecordFields(contact.content, ['fieldOrder', 'originals', 'groups'])) return false;
      if (
        !Number.isSafeInteger(contact.order) ||
        contact.order < 0 ||
        contact.order >= state.nextContact ||
        contactOrders.has(contact.order) ||
        !Array.isArray(contact.content.fieldOrder) ||
        contact.content.fieldOrder.some((kind) => typeof kind !== 'string') ||
        new Set(contact.content.fieldOrder).size !== contact.content.fieldOrder.length ||
        !contact.content.originals ||
        typeof contact.content.originals !== 'object' ||
        Array.isArray(contact.content.originals) ||
        !Array.isArray(contact.content.groups) ||
        !contact.content.groups.length
      )
        return false;
      contactOrders.add(contact.order);
      return true;
    });
    for (const [subjectId, contact] of orderedRecordEntries(state.current)) {
      const kinds = new Set<string>(),
        used = new Set<string>(),
        contexts = new Set<string>();
      for (const group of contact.content.groups) {
        if (
          !hasRecordFields(group, ['grant', 'times', 'check', 'fields']) ||
          !hasRecordFields(group.grant, [
            'subjectId',
            'subjectPhysicalLife',
            'original',
            'exposure',
            'modality',
          ]) ||
          group.grant.subjectId !== subjectId ||
          !isSafeRecordId(subjectId) ||
          (group.grant.subjectPhysicalLife !== null &&
            (!Number.isSafeInteger(group.grant.subjectPhysicalLife) ||
              group.grant.subjectPhysicalLife < 0)) ||
          typeof group.grant.exposure !== 'string' ||
          !group.grant.exposure ||
          !['sight', 'hearing', 'touch'].includes(group.grant.modality) ||
          typeof group.grant.original !== 'string' ||
          !Object.hasOwn(contact.content.originals, group.grant.original) ||
          !Array.isArray(group.times) ||
          group.times.length < 1 ||
          group.times.length > 5 ||
          group.times[0] === null ||
          group.times.at(-1) === null ||
          group.times.some(
            (value) =>
              value !== null &&
              (typeof value !== 'number' ||
                !Number.isFinite(value) ||
                value < 0 ||
                value > world.simTime),
          ) ||
          !group.fields ||
          typeof group.fields !== 'object' ||
          Array.isArray(group.fields) ||
          !Object.keys(group.fields).length
        )
          throw new Error('Invalid acquired current group.');
        const context = canonicalJson([group.grant, group.times, group.check]);
        if (contexts.has(context)) throw new Error('Duplicate current receipt group.');
        contexts.add(context);
        used.add(group.grant.original);
        for (const [kind, field] of Object.entries(group.fields)) {
          if (
            kinds.has(kind) ||
            !hasRecordFields(
              field,
              ['id', 'revision', 'value', 'originalOrdinal'],
              [
                'bodyLeaseId',
                'localSubject',
                'motionContinuityRevision',
                'sourcePlacementRevision',
              ],
            ) ||
            kind !== field.value.kind ||
            group.check !== currentFacetCheckScope(kind, group.grant.modality)
          )
            throw new Error('Invalid current group membership.');
          kinds.add(kind);
        }
      }
      if (
        kinds.size !== contact.content.fieldOrder.length ||
        contact.content.fieldOrder.some((kind) => !kinds.has(kind)) ||
        used.size !== Object.keys(contact.content.originals).length
      )
        throw new Error('Current contact membership disagrees with its groups.');
      for (const [key, source] of Object.entries(contact.content.originals)) {
        validateOriginal(source);
        const header = receivedObservationHeader(world, source);
        if (
          key !== currentOriginalKey(source) ||
          header.observer.actorId !== observerId ||
          header.observer.physicalLife !== state.life ||
          header.acquiredAt > world.simTime
        )
          throw new Error('Invalid current group original.');
      }
      if (contact.sight) {
        const check = contact.sight,
          phase = state.visualConfirmation;
        if (
          !phase ||
          !hasRecordFields(check, ['through', 'revision', 'inputRevision'], ['detail']) ||
          !Number.isFinite(check.through) ||
          check.through < 0 ||
          check.through > phase.through ||
          !Number.isSafeInteger(check.revision) ||
          check.revision < 1 ||
          check.revision > phase.revision ||
          !Number.isSafeInteger(check.inputRevision) ||
          check.inputRevision < 0 ||
          check.inputRevision > (world.sensory?.revision ?? 0) ||
          (check.detail !== undefined &&
            (!hasRecordFields(check.detail, ['through', 'revision', 'inputRevision']) ||
              !Number.isFinite(check.detail.through) ||
              check.detail.through < 0 ||
              check.detail.through > check.through ||
              !Number.isSafeInteger(check.detail.revision) ||
              check.detail.revision < 1 ||
              check.detail.revision > check.revision ||
              !Number.isSafeInteger(check.detail.inputRevision) ||
              check.detail.inputRevision < 0 ||
              check.detail.inputRevision > check.inputRevision))
        )
          throw new Error('Invalid completed contact check.');
      }
    }
    if (
      state.observer &&
      (state.observer.actorId !== observerId || state.observer.physicalLife !== state.life)
    )
      throw new Error('Invalid current perception receiver.');
    if (
      Object.values(state.gaps).some(
        (gap) =>
          !gap ||
          typeof gap.episodeId !== 'string' ||
          ![gap.lostAt, gap.through].every(Number.isFinite) ||
          gap.through < gap.lostAt ||
          (gap.physicalLife !== null &&
            (!Number.isSafeInteger(gap.physicalLife) || gap.physicalLife < 0)),
      )
    )
      throw new Error('Invalid short exposure gap.');
    if (state.motionSamples !== undefined) {
      if (!hasRecordFields(state.motionSamples, [], Object.keys(state.motionSamples)))
        throw new Error('Invalid current motion tracks.');
      let next = Infinity;
      for (const [subjectId, track] of Object.entries(state.motionSamples)) {
        const location = currentFacetGet(state, `${subjectId}:location`);
        if (
          !location ||
          !hasRecordFields(track, ['earlier', 'through', 'continuityRevision', 'expiresAt']) ||
          !Number.isFinite(track.through) ||
          track.through > world.simTime ||
          !Number.isFinite(track.expiresAt) ||
          track.expiresAt < track.through ||
          !Number.isSafeInteger(track.continuityRevision) ||
          track.continuityRevision < 0
        )
          throw new Error('Invalid current motion support.');
        const { value, ...proof } = track.earlier;
        const prior = receivedFacetValue(world, value);
        const latest = receivedFacetValue(world, location.value);
        if (prior?.kind !== 'location' || latest?.kind !== 'location')
          throw new Error('Missing current motion point.');
        const later = captureReceivedLocationSample(world, currentFacetSupport(state, location));
        validateSensoryFacet({
          kind: 'observed-motion',
          exposure: {
            observer: state.observer!,
            episodeId: currentFacetGrant(state, location).exposure,
          },
          earlier: { ...proof, location: prior.location, frame: prior.frame },
          later,
          correspondence: 'unambiguous-received-continuity',
        });
        next = Math.min(next, track.expiresAt);
      }
      if (state.motionExpiresAt !== (Number.isFinite(next) ? next : undefined))
        throw new Error('Invalid current motion deadline.');
    } else if (state.motionExpiresAt !== undefined)
      throw new Error('Current motion deadline has no support.');
    if (
      state.visualConfirmation &&
      (!Number.isFinite(state.visualConfirmation.through) ||
        state.visualConfirmation.through < 0 ||
        state.visualConfirmation.through > world.simTime ||
        !Number.isSafeInteger(state.visualConfirmation.revision) ||
        state.visualConfirmation.revision < 1 ||
        !Number.isFinite(state.visualConfirmation.completeThrough) ||
        state.visualConfirmation.completeThrough < 0 ||
        state.visualConfirmation.completeThrough > state.visualConfirmation.through ||
        !Number.isSafeInteger(state.visualConfirmation.completeRevision) ||
        state.visualConfirmation.completeRevision < 0 ||
        state.visualConfirmation.completeRevision > state.visualConfirmation.revision ||
        !Number.isSafeInteger(state.visualConfirmation.completeInputRevision) ||
        state.visualConfirmation.completeInputRevision < 0 ||
        state.visualConfirmation.completeInputRevision > (world.sensory?.revision ?? 0) ||
        !Number.isSafeInteger(state.visualConfirmation.frameRevision) ||
        state.visualConfirmation.frameRevision < 1 ||
        state.visualConfirmation.frameRevision > state.visualConfirmation.revision ||
        !validReceivedReference(state.visualConfirmation.frameRef) ||
        !validObservationFrame(receivedObservationFrame(world, state.visualConfirmation.frameRef)))
    )
      throw new Error('Invalid completed visual confirmation.');
    if (state.support) validateDetectionSupportState(world, observerId, state.support, originals);
    if (state.geometry) validateReceivedGeometryState(world, observerId, state.geometry, originals);
    const received = receivedPerceptionObservations(state);
    if (new Set(state.received.map(currentOriginalKey)).size !== state.received.length)
      throw new Error('Duplicate current perception reception.');
    if (
      Object.entries(state.receipts).some(
        ([key, index]) =>
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= state.received.length ||
          key !==
            observationAcquisitionKey({
              ...receivedObservationHeader(world, received[index]!),
              origin: received[index]!.origin,
            }),
      )
    )
      throw new Error('Invalid perception acquisition receipt.');
    for (const observation of received) {
      validateOriginal(observation);
      const header = receivedObservationHeader(world, observation);
      if (
        header.observer.actorId !== observerId ||
        header.observer.physicalLife !== state.life ||
        header.acquiredAt > world.simTime
      )
        throw new Error('Invalid perception observer life.');
    }
    for (const [key, record] of currentFacetEntries(state)) {
      if (
        !record ||
        !hasRecordFields(
          record,
          ['id', 'revision', 'grant', 'originalSource', 'times', 'value', 'originalOrdinal'],
          [
            'bodyLeaseId',
            'localSubject',
            'motionContinuityRevision',
            'sourcePlacementRevision',
            'at',
            'from',
            'acquiredAt',
            'confirmedFrom',
            'confirmedThrough',
          ],
        ) ||
        !state.observer ||
        state.observer.actorId !== observerId ||
        state.observer.physicalLife !== state.life
      )
        throw new Error('Invalid current perception facet.');
      const lease = currentFacetSupport(state, record);
      validateOriginal(lease.original);
      const header = receivedObservationHeader(world, lease.original);
      const value = validateReceivedFacetValue(world, lease.value, originals);
      validateReceivedParticipantObservers(value, lease.observer);
      if (
        typeof lease.id !== 'string' ||
        !lease.id.startsWith('perception-lease-') ||
        !Number.isSafeInteger(lease.revision) ||
        lease.revision < 1 ||
        // This location changes at most once per full sight phase. The phase
        // revision must distinguish each newly captured receiver frame.
        (lease.modality === 'sight' &&
          value.kind === 'location' &&
          state.visualConfirmation &&
          lease.revision > state.visualConfirmation.revision) ||
        lease.observer.actorId !== observerId ||
        lease.observer.physicalLife !== state.life ||
        !isSafeRecordId(lease.subjectId) ||
        (lease.subjectPhysicalLife !== null &&
          (!Number.isSafeInteger(lease.subjectPhysicalLife) || lease.subjectPhysicalLife < 0)) ||
        key !== `${lease.subjectId}:${value.kind}` ||
        !lease.exposure ||
        typeof lease.exposure.episodeId !== 'string' ||
        !lease.exposure.episodeId ||
        lease.exposure.observer?.actorId !== observerId ||
        lease.exposure.observer.physicalLife !== state.life ||
        !['sight', 'hearing', 'touch'].includes(lease.modality) ||
        (value.kind !== 'association' && lease.modality !== header.modality) ||
        [lease.motionContinuityRevision, lease.sourcePlacementRevision].some(
          (revision) => revision !== undefined && (!Number.isSafeInteger(revision) || revision < 0),
        ) ||
        (lease.localSubject !== undefined &&
          (!validObserverSubject(lease.localSubject) ||
            (lease.localSubject.kind === 'individual' &&
              !world.observerIdentities?.[observerId]?.[lease.localSubject.individualId]))) ||
        ![
          'surface-patch',
          'physical-boundary',
          'detected',
          'location',
          'body',
          'description',
          'carried',
          'pile-contents',
          'public-attributes',
          'contact',
          'association',
          'observed-motion',
        ].includes(value.kind) ||
        (value.kind === 'association' &&
          (typeof lease.bodyLeaseId !== 'string' ||
            currentFacetGet(state, `${lease.subjectId}:body`)?.id !== lease.bodyLeaseId)) ||
        header.observer.actorId !== observerId ||
        header.observer.physicalLife !== state.life ||
        !Number.isSafeInteger(lease.originalOrdinal) ||
        !lease.original.facets[lease.originalOrdinal] ||
        lease.original.facets[lease.originalOrdinal]!.value.kind !== value.kind ||
        header.acquiredAt > world.simTime ||
        ![
          lease.valueMeasuredFrom,
          lease.valueMeasuredThrough,
          lease.valueAcquiredAt,
          lease.confirmedFrom,
          lease.confirmedThrough,
        ].every(Number.isFinite) ||
        lease.valueMeasuredThrough < lease.valueMeasuredFrom ||
        // Unchanged continuously measured values may predate their latest support.
        // Completed measurement still cannot claim time after this native boundary.
        lease.valueMeasuredThrough > world.simTime ||
        lease.valueMeasuredThrough > lease.valueAcquiredAt ||
        lease.valueMeasuredThrough > lease.confirmedThrough ||
        lease.valueAcquiredAt < header.acquiredAt ||
        lease.valueAcquiredAt > world.simTime ||
        lease.confirmedThrough > world.simTime ||
        lease.confirmedThrough < lease.confirmedFrom
      )
        throw new Error('Invalid current perception facet.');
    }
  }
}
