import type { WorldState } from './types.js';
import type {
  TemporalEvidenceState,
  TemporalFragment,
  TemporalValue,
  TemporalReceipt,
  TemporalFacetReference,
} from './temporal-evidence.js';
import {
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
  temporalReceiptIndividualIds,
  temporalReceiptId,
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
  } else if (value['kind'] === 'observed-motion') {
    if (!hasRecordFields(value, ['kind', 'earlier', 'later']))
      throw new Error('Invalid shared temporal motion.');
    validateObservedLocation(value['earlier'] as ObservedLocation);
    validateObservedLocation(value['later'] as ObservedLocation);
  } else validateTemporalValue(value, originals);
}

function validateStoredValue(
  reference: Pick<TemporalFacetReference, 'reception' | 'support'>,
  fragment: TemporalFragment,
  originals: Map<string, string>,
  observer: ObserverLife,
  through: number,
): TemporalValue {
  const reception = reference.reception;
  if (reception !== undefined) {
    if (!record(reception)) throw new Error('Invalid temporal reception.');
    if (reception.kind === 'body') {
      if (!hasRecordFields(reception, ['kind', 'pose'])) throw new Error('Invalid body reception.');
      validateObservedBodyPose(reception.pose);
    } else if (reception.kind === 'location') {
      if (!hasRecordFields(reception, ['kind', 'frame']))
        throw new Error('Invalid temporal location reception.');
    } else if (reception.kind === 'observed-motion') {
      if (
        !hasRecordFields(reception, ['kind', 'exposure', 'earlier', 'later', 'correspondence']) ||
        [reception.earlier, reception.later].some(
          (sample) =>
            !hasRecordFields(
              sample,
              [
                'frame',
                'measuredFrom',
                'measuredThrough',
                'acquiredAt',
                'original',
                'confirmation',
                'confirmedFrom',
                'confirmedThrough',
              ],
              ['aliases'],
            ),
        )
      )
        throw new Error('Invalid temporal motion reception.');
    } else throw new Error('Unsupported temporal reception.');
  }
  if (reference.support) validateReceivedFacetProof(reference.support, observer, through);
  const value = materializeTemporalValue(reference, fragment);
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
    const validateReceipt = (receipt: TemporalReceipt, fragments?: TemporalFragment[]) => {
      if (
        !record(receipt) ||
        receipt.actorId !== actorId ||
        !ordinal(receipt.physicalLife) ||
        typeof receipt.epoch !== 'string' ||
        !receipt.epoch ||
        !ordinal(receipt.ordinal) ||
        receipt.id !== temporalReceiptId(receipt) ||
        !finite(receipt.at) ||
        receipt.at < 0 ||
        receipt.at > world.simTime ||
        !ordinal(receipt.order) ||
        typeof receipt.subject !== 'string' ||
        !receipt.subject ||
        (receipt.contextSubjects !== undefined &&
          (!strings(receipt.contextSubjects) ||
            receipt.contextSubjects.length > maximumContextSubjects)) ||
        (receipt.subjectIdentity !== undefined && !validObserverSubject(receipt.subjectIdentity)) ||
        !['baseline', 'change', 'loss', 'occurrence', 'attention-exit'].includes(receipt.change) ||
        typeof receipt.required !== 'boolean' ||
        !strings(receipt.sourceIds) ||
        !Array.isArray(receipt.facets) ||
        !receipt.facets.length
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
      const ordinals = new Set<number>();
      receipt.facets.forEach((facet: TemporalFacetReference, index: number) => {
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
        !strings(chunk.subjects) ||
        !strings(chunk.individualIds) ||
        !strings(chunk.sourceIds) ||
        !strings(chunk.sourceRefs) ||
        !Array.isArray(chunk.receipts) ||
        !chunk.receipts.length ||
        chunk.receipts.length !== chunk.count ||
        typeof chunk.boundary !== 'string'
      )
        throw new Error('Invalid personal temporal chunk.');
      chunks.add(chunk.id);
      bytes += chunk.bytes;
      count += chunk.count;
      const subjects = new Set<string>(),
        references = new Set<string>(),
        aliases = new Set<string>(),
        individuals = new Set<string>();
      let lastOrdinal = chunk.fromOrdinal - 1,
        lastAt = chunk.fromAt;
      for (const receipt of chunk.receipts) {
        const key = JSON.stringify([receipt.physicalLife, receipt.epoch, receipt.ordinal]);
        if (
          !record(receipt) ||
          receipt.actorId !== actorId ||
          receipt.physicalLife !== chunk.physicalLife ||
          receipt.epoch !== chunk.epoch ||
          !ordinal(receipt.ordinal) ||
          receipt.ordinal <= lastOrdinal ||
          receiptKeys.has(key) ||
          !finite(receipt.at) ||
          receipt.at < lastAt ||
          receipt.at > chunk.throughAt ||
          !ordinal(receipt.order) ||
          typeof receipt.subject !== 'string' ||
          !receipt.subject ||
          (receipt.subjectIdentity !== undefined &&
            !validObserverSubject(receipt.subjectIdentity)) ||
          !['baseline', 'change', 'loss', 'occurrence', 'attention-exit'].includes(
            receipt.change,
          ) ||
          typeof receipt.required !== 'boolean' ||
          !strings(receipt.sourceIds) ||
          !Array.isArray(receipt.facets) ||
          !receipt.facets.length
        )
          throw new Error('Invalid personal temporal receipt.');
        validateReceipt(receipt);
        receiptKeys.add(key);
        lastOrdinal = receipt.ordinal;
        lastAt = receipt.at;
        subjects.add(receipt.subject);
        for (const subject of receipt.contextSubjects ?? []) subjects.add(subject);
        for (const alias of temporalReceiptAliases(receipt, sources, world)) aliases.add(alias);
        for (const id of temporalReceiptIndividualIds(receipt, sources)) individuals.add(id);
        for (const facet of receipt.facets) {
          references.add(facet.blockId);
        }
      }
      if (
        chunk.receipts[0]!.ordinal !== chunk.fromOrdinal ||
        lastOrdinal !== chunk.throughOrdinal ||
        chunk.receipts[0]!.at !== chunk.fromAt ||
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
        throw new Error('Inconsistent temporal chunk metadata.');
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
