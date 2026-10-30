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

function validReceivedReference(value: unknown): value is readonly [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isSafeRecordId(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isSafeInteger(value[1]) &&
    value[1] >= 0
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
    !hasRecordFields(
      state,
      ['sources'],
      ['activeAt', 'activeSources', 'activeSource', 'retirement'],
    ) ||
    !state.sources ||
    typeof state.sources !== 'object' ||
    Array.isArray(state.sources) ||
    (state.activeAt !== undefined &&
      (!Number.isFinite(state.activeAt) || state.activeAt < 0 || state.activeAt > world.simTime)) ||
    (state.activeSources !== undefined &&
      (!Array.isArray(state.activeSources) ||
        !state.activeSources.length ||
        new Set(state.activeSources).size !== state.activeSources.length ||
        state.activeSources.some(
          (id) =>
            !isSafeRecordId(id) || !state.sources[id] || state.sources[id].at !== state.activeAt,
        ))) ||
    (state.activeAt === undefined) !== (state.activeSources === undefined) ||
    (state.activeSource !== undefined &&
      (typeof state.activeSource !== 'string' ||
        !state.sources[state.activeSource] ||
        state.activeSources?.at(-1) !== state.activeSource))
  )
    throw new Error('Invalid received value owner.');
  if (state.retirement) {
    const retirement = state.retirement;
    if (
      !hasRecordFields(
        retirement,
        ['nextGeneration', 'bytes', 'optionalAdmissionBlocked', 'pending'],
        ['cursor'],
      ) ||
      !Number.isSafeInteger(retirement.nextGeneration) ||
      retirement.nextGeneration < 0 ||
      !Number.isSafeInteger(retirement.bytes) ||
      retirement.bytes < 0 ||
      typeof retirement.optionalAdmissionBlocked !== 'boolean' ||
      (retirement.cursor !== undefined && !isSafeRecordId(retirement.cursor)) ||
      !retirement.pending ||
      typeof retirement.pending !== 'object' ||
      Array.isArray(retirement.pending) ||
      Object.entries(retirement.pending).some(
        ([id, candidate]) =>
          !isSafeRecordId(id) ||
          !hasRecordFields(
            candidate,
            ['generation', 'releaseRevision', 'bytes', 'stage'],
            ['applicationRevision', 'checkedRevision'],
          ) ||
          !Number.isSafeInteger(candidate.generation) ||
          candidate.generation < 1 ||
          candidate.generation > retirement.nextGeneration ||
          !Number.isSafeInteger(candidate.releaseRevision) ||
          candidate.releaseRevision < candidate.generation ||
          candidate.releaseRevision > retirement.nextGeneration ||
          !Number.isSafeInteger(candidate.bytes) ||
          candidate.bytes < 0 ||
          !['candidate', 'applying'].includes(candidate.stage) ||
          (candidate.stage === 'applying'
            ? !Number.isSafeInteger(candidate.applicationRevision) ||
              candidate.applicationRevision! < 1 ||
              !Number.isSafeInteger(candidate.checkedRevision) ||
              candidate.checkedRevision! < candidate.generation ||
              candidate.checkedRevision! > candidate.releaseRevision
            : candidate.applicationRevision !== undefined ||
              candidate.checkedRevision !== undefined),
      ) ||
      Object.values(retirement.pending).reduce((sum, candidate) => sum + candidate.bytes, 0) !==
        retirement.bytes
    )
      throw new Error('Invalid received value retirement.');
  }
  for (const [id, block] of Object.entries(state.sources)) {
    if (
      !hasRecordFields(block, ['id', 'at', 'sequence', 'values', 'bytes']) ||
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
      !Array.isArray(block.values) ||
      !block.values.length ||
      block.bytes !== jsonEncoding(block).bytes
    )
      throw new Error('Invalid received value block.');
    for (const fragment of block.values) {
      if (fragment === null) continue;
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
      !state.originals ||
      typeof state.originals !== 'object' ||
      Array.isArray(state.originals) ||
      !state.receipts ||
      typeof state.receipts !== 'object' ||
      Array.isArray(state.receipts) ||
      !state.current ||
      typeof state.current !== 'object' ||
      Array.isArray(state.current) ||
      !state.gaps ||
      typeof state.gaps !== 'object' ||
      Array.isArray(state.gaps)
    )
      throw new Error('Invalid active perception owner.');
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
        const location = state.current[`${subjectId}:location`];
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
          exposure: { observer: state.observer!, episodeId: location.exposure },
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
        !state.visualConfirmation.subjects ||
        Object.entries(state.visualConfirmation.subjects).some(
          ([id, selected]) =>
            !isSafeRecordId(id) ||
            !selected ||
            !Number.isFinite(selected.through) ||
            selected.through < state.visualConfirmation!.completeThrough ||
            selected.through > state.visualConfirmation!.through ||
            !Number.isSafeInteger(selected.revision) ||
            selected.revision < state.visualConfirmation!.completeRevision ||
            selected.revision > state.visualConfirmation!.revision ||
            !Number.isSafeInteger(selected.inputRevision) ||
            selected.inputRevision < 0 ||
            selected.inputRevision > (world.sensory?.revision ?? 0) ||
            (selected.detail !== undefined &&
              (!hasRecordFields(selected.detail, ['through', 'revision', 'inputRevision']) ||
                !Number.isFinite(selected.detail.through) ||
                selected.detail.through < 0 ||
                selected.detail.through > selected.through ||
                !Number.isSafeInteger(selected.detail.revision) ||
                selected.detail.revision < 1 ||
                selected.detail.revision > selected.revision ||
                !Number.isSafeInteger(selected.detail.inputRevision) ||
                selected.detail.inputRevision < 0 ||
                selected.detail.inputRevision > selected.inputRevision)),
        ) ||
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
    const usedOriginals = new Set(state.received);
    if (usedOriginals.size !== state.received.length)
      throw new Error('Duplicate current perception reception.');
    for (const [key, source] of Object.entries(state.originals)) {
      validateOriginal(source);
      const header = receivedObservationHeader(world, source);
      if (
        key !== currentOriginalKey(source) ||
        header.observer.actorId !== observerId ||
        header.observer.physicalLife !== state.life ||
        header.acquiredAt > world.simTime
      )
        throw new Error('Invalid current perception original catalogue.');
    }
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
    for (const [key, record] of Object.entries(readOnlyDraftView(state.current))) {
      if (
        !record ||
        !hasRecordFields(
          record,
          [
            'id',
            'revision',
            'subjectId',
            'subjectPhysicalLife',
            'value',
            'original',
            'originalOrdinal',
            'exposure',
            'modality',
          ],
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
        typeof record.original !== 'string' ||
        !Object.hasOwn(state.originals, record.original) ||
        !state.observer ||
        state.observer.actorId !== observerId ||
        state.observer.physicalLife !== state.life ||
        typeof record.exposure !== 'string' ||
        !record.exposure
      )
        throw new Error('Invalid current perception facet.');
      usedOriginals.add(record.original);
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
            state.current[`${lease.subjectId}:body`]?.id !== lease.bodyLeaseId)) ||
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
    if (usedOriginals.size !== Object.keys(state.originals).length)
      throw new Error('An unreferenced current perception original was retained.');
  }
}
