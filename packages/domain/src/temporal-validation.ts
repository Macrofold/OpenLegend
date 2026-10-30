import {
  temporalChunkReceipts,
  temporalEntryCheckpoints,
  temporalEntryConfirmations,
  temporalConfirmationChangeCount,
  temporalChunkReceipt,
  temporalDictionaryDependencies,
  type TemporalCheckpointAvailability,
  temporalEntryDependencies,
  TEMPORAL_CHANGE_DICTIONARY_FIELDS,
  TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS,
  TEMPORAL_FACET_DICTIONARY_FIELDS,
  TEMPORAL_FACET_REFERENCE_FIELDS,
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
  validateEvidenceSource,
  validateReceivedFacetProof,
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
  temporalReceiptAliases,
  temporalConfirmationReference,
  temporalReceiptIndividualIds,
  temporalReceiptId,
  temporalReceiptChangeCount,
  temporalFacetValueReferences,
  materializeTemporalValue,
  temporalChunkLogicalBytes,
  temporalSupportLogicalBytes,
  receivedTemporalFragment,
} from './temporal-evidence.js';

const encoder = new TextEncoder();
const encodedBytes = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const ordinal = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'string' && entry.length > 0) &&
  new Set(value).size === value.length;

function validateFieldAvailability(groups: readonly TemporalCheckpointAvailability[], facets: readonly TemporalFacetReference[], at: number): void {
  if (!Array.isArray(groups)) throw new Error('Invalid retained field availability.');
  const assigned=new Set<number>(), fields=new Set(facets.map(facet=>facet.ordinal));
  for(const group of groups) {
    if(!record(group)||!hasRecordFields(group,['reason','at','fields'])||
      (typeof group.reason !== 'string' || !['unavailable','unchecked','released'].includes(group.reason))||!finite(group.at)||group.at<0||group.at>at||
      !Array.isArray(group.fields)||!group.fields.length)throw new Error('Invalid retained field availability.');
    for(const field of group.fields){
      if(!ordinal(field)||!fields.has(field)||assigned.has(field))throw new Error('Invalid retained field availability mask.');
      assigned.add(field);
    }
  }
}

/** Only current canonical frame shapes enter saved authority. Every declaration
 * must belong to an operation; the decoded receipts validate its typed meaning. */
function validateFrameEntries(chunk: import('./temporal-evidence.js').TemporalChunk): void {
  const used = new Set<number>(),
    declarations = new Set<number>();
  let previous = -1;
  for (const entry of chunk.entries) {
    if (!record(entry) || !ordinal(entry.ordinal) || entry.ordinal <= previous)
      throw new Error('Invalid temporal frame order.');
    previous = entry.ordinal;
    if (entry.kind === 'dictionary') {
      if (
        !hasRecordFields(entry, ['ordinal', 'kind', 'value']) ||
        !record(entry.value) ||
        !hasRecordFields(entry.value, ['kind', 'value']) ||
        ![
          'text',
          'identity',
          'source',
          'fact',
          'proof',
          'origin',
          'reception',
          'detail',
          'view',
        ].includes(entry.value.kind)
      )
        throw new Error('Invalid temporal declaration.');
      const stored = entry.value;
      if (stored.kind === 'fact' && (!record(stored.value) || !hasRecordFields(stored.value,['source','ordinal']) || !ordinal(stored.value.ordinal)))
        throw new Error('Invalid temporal fact declaration.');
      if (stored.kind === 'proof' && (!record(stored.value) || !hasRecordFields(stored.value,['original','confirmation','confirmedFrom','confirmedThrough'],['aliases'])))
        throw new Error('Invalid temporal proof declaration.');
      if (stored.kind === 'detail' && (!record(stored.value) || !hasRecordFields(stored.value,['proof','from','through','acquiredAt'])))
        throw new Error('Invalid temporal detail declaration.');
      for (const dependency of temporalDictionaryDependencies(entry)) {
        if (!ordinal(dependency.ordinal)) throw new Error('Invalid temporal dictionary dependency.');
        used.add(dependency.ordinal);
      }
      declarations.add(entry.ordinal);
    } else if (entry.kind === 'frame') {
      if (
        !hasRecordFields(
          entry,
          ['ordinal', 'kind', 'acquisition', 'at', 'order'],
          ['receiverFrame', 'coverageGap'],
        ) ||
        !ordinal(entry.acquisition) ||
        !finite(entry.at) ||
        entry.at < 0 ||
        !ordinal(entry.order) ||
        (entry.receiverFrame !== undefined && !validObservationFrame(entry.receiverFrame))
      )
        throw new Error('Invalid temporal acquisition.');
      declarations.add(entry.ordinal);
    } else if (entry.kind === 'change' || entry.kind === 'checkpoint' || entry.kind === 'confirmation') {
      const raw = entry as unknown as Record<string, unknown>;
      const shape =
        entry.kind === 'change'
          ? hasRecordFields(
              entry,
              ['ordinal', 'kind', 'receipt', 'frame', 'subject', 'change', 'facets'],
              ['order', 'contexts', 'identity', 'origin', 'required', 'sources', 'spatialContext', 'availabilityAt'],
            ) &&
            ordinal(entry.receipt) &&
            (entry.required === undefined || entry.required === true)
          : entry.kind === 'checkpoint' ? hasRecordFields(entry, ['ordinal', 'kind', 'frame', 'subject', 'facets'], ['order', 'availability'])
          : hasRecordFields(entry,['ordinal','kind','frame','receipt','subjects'],['order']) && ordinal(entry.receipt) && Array.isArray(entry.subjects);
      if (!shape || !ordinal(entry.frame) || (entry.kind !== 'confirmation' && !Array.isArray(entry.facets)))
        throw new Error('Invalid temporal operation.');
      used.add(entry.frame);
      for (const field of TEMPORAL_CHANGE_DICTIONARY_FIELDS)
        if (raw[field] !== undefined) {
          if (!ordinal(raw[field])) throw new Error('Invalid temporal dictionary address.');
          used.add(raw[field]);
        }
      for (const field of TEMPORAL_CHANGE_DICTIONARY_ARRAY_FIELDS)
        if (raw[field] !== undefined) {
          const values = raw[field];
          if (!Array.isArray(values)) throw new Error('Invalid temporal dictionary list.');
          for (const at of values) {
            if (!ordinal(at)) throw new Error('Invalid temporal dictionary address.');
            used.add(at);
          }
        }
      const fields = entry.kind === 'confirmation' ? entry.subjects.flatMap(group => {
        if (!record(group) || !hasRecordFields(group,['subject','fields']) || !ordinal(group.subject) || !Array.isArray(group.fields) || !group.fields.length)
          throw new Error('Invalid temporal confirmation group.');
        used.add(group.subject); return group.fields;
      }) : entry.facets;
      for (const facet of fields) {
        if (
          !record(facet) ||
          !hasRecordFields(
            facet,
            entry.kind === 'confirmation' ? ['value','original','source'] : ['value'],
            entry.kind === 'confirmation' ? ['pose','reception','from','through','details','ordinal'] : [
              'pose',
              'poseFrame',
              'ordinal',
              'role',
              'at',
              'from',
              'through',
              'acquired',
              'confirmed',
              'original',
              'source',
              'support',
              'reception',
              'details',
            ],
          ) ||
          (facet.pose !== undefined && facet.reception !== undefined)
        )
          throw new Error('Invalid packed temporal field.');
        for (const field of TEMPORAL_FACET_REFERENCE_FIELDS)
          if (facet[field] !== undefined) {
            const reference = facet[field];
            if (!Array.isArray(reference) || reference.length !== 2 || !reference.every(ordinal))
              throw new Error('Invalid temporal value address.');
            used.add(reference[0]);
          }
        for (const field of TEMPORAL_FACET_DICTIONARY_FIELDS)
          if (facet[field] !== undefined) {
            if (!ordinal(facet[field])) throw new Error('Invalid temporal dictionary address.');
            used.add(facet[field]);
          }
      }
    } else throw new Error('Unsupported temporal frame entry.');
  }
  const entries = new Map(chunk.entries.map(entry=>[entry.ordinal,entry]));
  for (const entry of chunk.entries) for (const dependency of temporalDictionaryDependencies(entry)) {
    const target=entries.get(dependency.ordinal);
    if(target?.kind!=='dictionary'||target.value.kind!==dependency.kind)
      throw new Error('Invalid typed temporal dictionary dependency.');
  }
  if (
    [...declarations].some((at) => !used.has(at)) ||
    [...used].some((at) => !declarations.has(at))
  )
    throw new Error('Incomplete temporal declaration closure.');
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
          !Array.isArray(reception.poseRef) ||
          reception.poseRef.length !== 2 ||
          typeof reception.poseRef[0] !== 'string' ||
          !ordinal(reception.poseRef[1])
        )
          throw new Error('Invalid shared body reception.');
      } else {
        if (!hasRecordFields(reception, ['kind', 'pose']))
          throw new Error('Invalid body reception.');
        validateObservedBodyPose(reception.pose);
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
      !Array.isArray(actor.chunks) ||
      !record(actor.captures) ||
      (actor.capturesInvalidated !== undefined && actor.capturesInvalidated !== true) ||
      typeof actor.maintenanceDue !== 'boolean' ||
      (actor.nextDue !== null && (!finite(actor.nextDue) || actor.nextDue < 0))
    )
      throw new Error('Invalid personal temporal owner.');
    if (actor.lastReceiverFrame !== undefined && !validObservationFrame(actor.lastReceiverFrame))
      throw new Error('Invalid last received viewpoint.');
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
      receiptKeys = new Set<string>();
    const validateReference = (reference: { blockId: string; valueOrdinal: number }) => {
      const block = sources[reference.blockId];
      const fragment = receivedTemporalFragment(block?.values[reference.valueOrdinal] ?? undefined);
      if (
        !block ||
        !ordinal(reference.valueOrdinal) ||
        reference.valueOrdinal >= block.values.length ||
        !fragment
      )
        throw new Error('Unavailable retained temporal fragment.');
      return fragment;
    };
    for (const reference of Object.values(actor.captures)) {
      const fragment = validateReference(reference);
      const captured = validateStoredValue(
        reference,
        fragment,
        originals,
        { actorId, physicalLife: actor.physicalLife },
        world.simTime,
        sources,
      );
      validateReceiver(captured, { actorId, physicalLife: actor.physicalLife }, world.simTime);
      if (
        (reference.confirmedThrough !== undefined &&
          (!finite(reference.confirmedThrough) ||
            reference.confirmedThrough < 0 ||
            reference.confirmedThrough > world.simTime)) ||
        (reference.contextSubjects !== undefined &&
          (!strings(reference.contextSubjects) ||
            reference.contextSubjects.length > maximumContextSubjects))
      )
        throw new Error('Invalid temporal capture coverage.');
    }
    if (
      actor.releasedThrough !== undefined &&
      (!finite(actor.releasedThrough) ||
        actor.releasedThrough < 0 ||
        actor.releasedThrough > world.simTime)
    )
      throw new Error('Invalid temporal unavailable prefix.');
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
          facet.asOf > receipt.at
        )
          throw new Error('Invalid temporal measurement interval.');
        if (facet.detailSupport) {
          const detail = facet.detailSupport;
          if (
            value.kind !== 'body' ||
            !hasRecordFields(detail, ['proof', 'from', 'through', 'acquiredAt']) ||
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
            (value?.kind !== 'surface-patch' && value?.kind !== 'physical-boundary')
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
        typeof receipt.subject !== 'string' ||
        !receipt.subject ||
        (receipt.contextSubjects !== undefined &&
          (!strings(receipt.contextSubjects) ||
            receipt.contextSubjects.length > maximumContextSubjects)) ||
        (receipt.subjectIdentity !== undefined && !validObserverSubject(receipt.subjectIdentity)) ||
        !['baseline', 'change', 'loss', 'unchecked', 'occurrence', 'attention-exit', 'receiver-frame', 'retained-state'].includes(
          receipt.change,
        ) ||
        (receipt.availabilityAt !== undefined &&
          (!['loss', 'unchecked', 'attention-exit'].includes(receipt.change) ||
            !finite(receipt.availabilityAt) || receipt.availabilityAt < 0 ||
            receipt.availabilityAt > receipt.at)) ||
        (receipt.change === 'retained-state' && !fragments) ||
        (receipt.availability !== undefined && receipt.change !== 'retained-state') ||
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
      if(receipt.availability)validateFieldAvailability(receipt.availability,receipt.facets,receipt.at);
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
    for (const chunk of actor.chunks) {
      if (Array.isArray(chunk?.entries)) validateFrameEntries(chunk);
      if (
        !record(chunk) ||
        !isSafeRecordId(chunk.id) ||
        chunks.has(chunk.id) ||
        chunk.actorId !== actorId ||
        !ordinal(chunk.physicalLife) ||
        typeof chunk.epoch !== 'string' ||
        !chunk.epoch ||
        !ordinal(chunk.fromOrdinal) ||
        !ordinal(chunk.throughOrdinal) ||
        chunk.fromOrdinal > chunk.throughOrdinal ||
        !finite(chunk.fromAt) ||
        !finite(chunk.throughAt) ||
        chunk.fromAt < 0 ||
        chunk.fromAt > chunk.throughAt ||
        chunk.throughAt > world.simTime ||
        !ordinal(chunk.bytes) ||
        !ordinal(chunk.count) ||
        !ordinal(chunk.nextEntryOrdinal) ||
        (Array.isArray(chunk.entries) &&
          (chunk.entries.at(-1)?.ordinal ?? -1) >= chunk.nextEntryOrdinal) ||
        !strings(chunk.subjects) ||
        !strings(chunk.individualIds) ||
        !strings(chunk.sourceIds) ||
        !strings(chunk.sourceRefs) ||
        !Array.isArray(chunk.entries) ||
        !temporalChunkReceipts(chunk).length ||
        temporalChunkReceipts(chunk).reduce(
          (sum, row) => sum + temporalReceiptChangeCount(row),
          0,
        ) + temporalConfirmationChangeCount(chunk.entries) !== chunk.count
      )
        throw new Error('Invalid personal temporal chunk.');
      chunks.add(chunk.id);
      bytes += chunk.bytes;
      count += chunk.count;
      for (const checkpoint of temporalEntryCheckpoints(chunk)) {
        if (
          checkpoint.chunkId !== chunk.id ||
          checkpoint.actorId !== actorId ||
          checkpoint.physicalLife !== chunk.physicalLife ||
          checkpoint.epoch !== chunk.epoch ||
          !ordinal(checkpoint.ordinal) ||
          !ordinal(checkpoint.acquisition) ||
          !finite(checkpoint.at) ||
          checkpoint.at < 0 ||
          checkpoint.at > world.simTime ||
          !ordinal(checkpoint.order) ||
          !checkpoint.subject ||
          !checkpoint.facets.length
        )
          throw new Error('Invalid retained field checkpoint.');
        validateFields(checkpoint);
        if(checkpoint.availability)validateFieldAvailability(checkpoint.availability,checkpoint.facets,checkpoint.at);
      }
      for (const confirmation of temporalEntryConfirmations(chunk)) {
        const parent = temporalChunkReceipt(chunk, confirmation.receiptOrdinal);
        if (!ordinal(confirmation.receiptOrdinal) || !ordinal(confirmation.acquisition) ||
          !finite(confirmation.at) || confirmation.at < 0 || confirmation.at > world.simTime ||
          !ordinal(confirmation.order) || !confirmation.subject || !ordinal(confirmation.original.ordinal) ||
          !parent || parent.acquisition !== confirmation.acquisition || parent.at !== confirmation.at ||
          parent.order !== confirmation.order)
          throw new Error('Invalid temporal confirmation.');
        const reference=temporalConfirmationReference(confirmation);
        const fragment=validateReference(reference);
        const supported=validateStoredValue(reference,fragment,originals,{actorId,physicalLife:chunk.physicalLife},confirmation.at,sources);
        validateReceiver(supported,{actorId,physicalLife:chunk.physicalLife},confirmation.at);
        const detail=confirmation.detailSupport;
        if (detail) {
          if (supported.kind!=='body' || !hasRecordFields(detail,['proof','from','through','acquiredAt']) ||
            ![detail.from,detail.through,detail.acquiredAt].every(finite) || detail.from<0 ||
            detail.from>detail.through || detail.through>detail.acquiredAt || detail.acquiredAt>confirmation.at)
            throw new Error('Invalid confirmed outward detail support.');
          validateReceivedFacetProof(detail.proof,{actorId,physicalLife:chunk.physicalLife},confirmation.at);
        }
      }
      const subjects = new Set<string>(),
        references = new Set<string>(),
        aliases = new Set<string>(),
        individuals = new Set<string>();
      let lastOrdinal = chunk.fromOrdinal - 1,
        lastAt = chunk.fromAt;
      for (const receipt of temporalChunkReceipts(chunk)) {
        const key = JSON.stringify([receipt.physicalLife, receipt.epoch, receipt.ordinal]);
        validateReceipt(receipt);
        if (
          receipt.physicalLife !== chunk.physicalLife ||
          receipt.epoch !== chunk.epoch ||
          receipt.ordinal <= lastOrdinal || receiptKeys.has(key) ||
          receipt.at < lastAt || receipt.at > chunk.throughAt
        )
          throw new Error('Invalid temporal chunk membership or order.');
        receiptKeys.add(key);
        lastOrdinal = receipt.ordinal;
        lastAt = receipt.at;
        subjects.add(receipt.subject);
        for (const subject of receipt.contextSubjects ?? []) subjects.add(subject);
        for (const alias of temporalReceiptAliases(receipt, sources, world)) aliases.add(alias);
        for (const id of temporalReceiptIndividualIds(receipt, sources)) individuals.add(id);
        for (const facet of receipt.facets)
          for (const reference of temporalFacetValueReferences(facet)) {
            references.add(reference.blockId);
          }
      }
      for (const checkpoint of temporalEntryCheckpoints(chunk)) {
        subjects.add(checkpoint.subject);
        for (const alias of temporalReceiptAliases(checkpoint, sources, world)) aliases.add(alias);
        for (const id of temporalReceiptIndividualIds(checkpoint, sources)) individuals.add(id);
        for (const facet of checkpoint.facets)
          for (const reference of temporalFacetValueReferences(facet))
            references.add(reference.blockId);
      }
      for (const confirmation of temporalEntryConfirmations(chunk)) {
        subjects.add(confirmation.subject);
        const reference=temporalConfirmationReference(confirmation);
        for (const alias of temporalReceiptAliases({facets:[reference],sourceIds:[]},sources,world)) aliases.add(alias);
        for (const id of temporalReceiptIndividualIds({facets:[reference]},sources)) individuals.add(id);
        for (const value of temporalFacetValueReferences(reference)) references.add(value.blockId);
      }
      if (
        temporalChunkReceipts(chunk)[0]!.ordinal !== chunk.fromOrdinal ||
        lastOrdinal !== chunk.throughOrdinal ||
        temporalChunkReceipts(chunk)[0]!.at !== chunk.fromAt ||
        lastAt !== chunk.throughAt ||
        subjects.size !== chunk.subjects.length ||
        chunk.subjects.some((subject) => !subjects.has(subject)) ||
        references.size !== chunk.sourceRefs.length ||
        chunk.sourceRefs.some((id) => !references.has(id)) ||
        aliases.size !== chunk.sourceIds.length ||
        chunk.sourceIds.some((id) => !aliases.has(id)) ||
        individuals.size !== chunk.individualIds.length ||
        chunk.individualIds.some((id) => !individuals.has(id)) ||
        chunk.bytes !== temporalChunkLogicalBytes(chunk, sources)
      )
        throw new Error(
          `Inconsistent temporal chunk metadata (${JSON.stringify({ subjects: [chunk.subjects.length, subjects.size], sources: [chunk.sourceIds.length, aliases.size], references: [chunk.sourceRefs.length, references.size], individuals: [chunk.individualIds.length, individuals.size], bytes: [chunk.bytes, temporalChunkLogicalBytes(chunk, sources)] })}).`,
        );
      if (
        chunk.epoch === actor.epoch &&
        chunk.physicalLife === actor.physicalLife &&
        chunk.throughOrdinal >= actor.nextOrdinal
      )
        throw new Error('Temporal receipt counter precedes its tail.');
    }
    if (bytes > actor.bytes || count > actor.count)
      throw new Error('Understated temporal retention counters.');
  }
}
