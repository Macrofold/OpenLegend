import { personalFactAlias } from './experience-source.js';
import { entityGet } from './entity-collection.js';
import { readOnlyDraftView } from './draft.js';
import { immutableDataSnapshot } from './records.js';
import { orderedRecordSet } from './ordered-record.js';
import { sameDefinitionPin } from './definition-pins.js';
import {
  currentFacetGet,
  currentGroupNativeFacet,
  detachedCurrentPartition,
  currentFacetSupport,
  currentFacetTimes,
  currentContactEntries,
  currentContactGet,
  type CurrentReadOwner,
  type CurrentReceivedGroup,
  type CurrentFacetRecord,
} from './perception-current.js';
import {
  contributionFactKey,
  currentFacetConfirmation,
  currentLeaseEligible,
  receivedFacetValueFromSources,
  currentBodyGrant,
  prepareCurrentBodyReadScope,
  type ObserverLife,
  type PerceptionEvidenceOwner,
  type CurrentMotionSample,
  currentMotionEarlierProof,
  type CurrentBodyPoseSupport,
  type CurrentDescriptionSupport,
  type CapturedCurrentFacet,
  type LiveFacetSupport,
  type SensoryFacet,
  type ReceivedFacetValue,
  type ReceivedLocationSample,
} from './perception-evidence.js';
import {
  receivedValueAt,
  type ReceivedValueLookup,
  type ReceivedValueReference,
} from './received-values.js';
import type { DefinitionPin } from './world-modules.js';
import type { ObserverSubject } from './knowledge.js';
import type { WorldState } from './types.js';

export type ReceivedCurrentReader = CurrentReadOwner &
  Pick<PerceptionEvidenceOwner, 'life' | 'visualConfirmation'>;
/** A private immutable read product of one receiver. Payload references are copied
 * only from those personal grants; no world/other receiver index is retained. */
export interface CapturedCurrentSources {
  observer: ObserverLife;
  at: number;
  privacyRevision: number;
  lastIncludedOrder: number;
  sources: Record<string, { order: number; groups: readonly CurrentReceivedGroup[] }>;
  subjects: ObserverSubject[];
  reader: ReceivedCurrentReader;
  values: ReceivedValueLookup;
  motions: Record<string, { track: CurrentMotionSample; channel: DefinitionPin }>;
}
export function captureCurrentSources(
  world: WorldState,
  actorId: string,
  selection?: { sourceIds?: ReadonlySet<string>; kinds?: ReadonlySet<string> },
  reads = prepareCurrentBodyReadScope(world, actorId),
): CapturedCurrentSources {
  const actor = entityGet(world.entities, actorId);
  if (!actor?.actor) throw new Error('A current source cut requires an observer.');
  const observer = { actorId, physicalLife: actor.actor.physicalLife ?? 0 },
    state = world.perceptionEvidence?.[actorId];
  const sources: CapturedCurrentSources['sources'] = {},
    values: Record<string, { value: NonNullable<ReturnType<typeof receivedValueAt>> }> = {},
    subjects = new Map<string, ObserverSubject>(),
    current: PerceptionEvidenceOwner['current'] = { size: 0 };
  const captureRef = (ref: ReceivedValueReference) => {
    if (typeof ref !== 'string' || Object.hasOwn(values, ref)) return;
    const value = receivedValueAt(world.receivedValues?.sources ?? {}, ref);
    if (!value) throw new Error('A granted current source payload is unavailable.');
    values[ref] = { value };
  };
  const captureValue = (value: ReceivedFacetValue) => {
    captureRef(value.reference);
    if (value.reception?.kind === 'body') captureRef(value.reception.poseRef);
    if (value.reception?.kind === 'location') captureRef(value.reception.frameRef);
  };
  const addSubject = (subject: ObserverSubject | undefined) => {
    if (subject) subjects.set(JSON.stringify(subject), subject);
  };
  if (state?.life === observer.physicalLife) {
    const selectedContacts = selection?.sourceIds
      ? [...selection.sourceIds].flatMap((id) => {
          const contact = currentContactGet(state, id);
          return contact ? [[id, contact] as const] : [];
        })
      : currentContactEntries(state);
    for (const [id, contact] of selectedContacts) {
      const groups: CurrentReceivedGroup[] = [];
      for (const raw of contact.content.groups) {
        const live = readOnlyDraftView(raw);
        const metadata = live.metadata.map((partition) =>
          detachedCurrentPartition(state, live, partition),
        );
        const group = metadata.some((partition, index) => partition !== live.metadata[index])
            ? { ...live, metadata }
            : live,
          kinds = Object.keys(group.received.fields),
          representative = kinds.find((kind) => kind !== 'association') ?? kinds[0];
        if (!representative) continue;
        const first = currentGroupNativeFacet(
          group,
          contact.content.originals[group.received.grant.original]!,
          representative,
        );
        if (
          !first ||
          !currentLeaseEligible(world, actorId, first, {
            allowUnchecked: true,
            bodyReadScope: reads,
          })
        )
          continue;
        const association =
          group.received.fields['association'] &&
          currentGroupNativeFacet(
            group,
            contact.content.originals[group.received.grant.original]!,
            'association',
          );
        const dropAssociation =
          association &&
          !currentLeaseEligible(world, actorId, association, {
            allowUnchecked: true,
            bodyReadScope: reads,
          });
        const fields =
          dropAssociation || selection?.kinds
            ? Object.fromEntries(
                Object.entries(group.received.fields).filter(
                  ([kind]) =>
                    !(dropAssociation && kind === 'association') &&
                    (!selection?.kinds || selection.kinds.has(kind)),
                ),
              )
            : group.received.fields;
        if (!Object.keys(fields).length) continue;
        groups.push(
          fields === group.received.fields
            ? group
            : {
                received: { grant: group.received.grant, fields },
                metadata: group.metadata.flatMap((partition) => {
                  const members = partition.members.filter(([kind]) => Object.hasOwn(fields, kind));
                  return members.length ? [{ ...partition, members }] : [];
                }),
              },
        );
        for (const partition of group.metadata)
          if (partition.frameRef) captureRef(partition.frameRef);
        captureRef(contact.content.originals[group.received.grant.original]!.headerRef);
        for (const field of Object.values(fields)) {
          captureValue(field.value);
          addSubject(field.localSubject);
          if (field.value.kind === 'association' || field.value.kind === 'claim') {
            const value = receivedValueAt(
              world.receivedValues?.sources ?? {},
              field.value.reference,
            );
            if (value?.kind === 'association') addSubject(value.subject);
            if (value?.kind === 'claim' && value.speaker.kind === 'individual')
              addSubject(value.speaker.subject);
          }
        }
      }
      if (groups.length) {
        sources[id] = { order: contact.order, groups };
        const grants = new Set(groups.map((group) => group.received.grant.original));
        const fieldKeys = new Set(
          groups.flatMap((group) =>
            Object.keys(group.received.fields).map((kind) =>
              JSON.stringify([
                kind,
                group.received.grant.channel.id,
                group.received.grant.channel.version,
                group.received.grant.channel.digest,
              ]),
            ),
          ),
        );
        orderedRecordSet(current, id, {
          order: contact.order,
          content: {
            groups,
            fieldOrder: contact.content.fieldOrder.filter((key) => fieldKeys.has(key)),
            originals: Object.fromEntries(
              Object.entries(contact.content.originals).filter(([key]) => grants.has(key)),
            ),
          },
          ...(contact.sight ? { sight: contact.sight } : {}),
        });
      }
    }
  }
  if (state?.visualConfirmation) {
    captureRef(state.visualConfirmation.frameRef);
    if (state.visualConfirmation.complete) captureRef(state.visualConfirmation.complete.frameRef);
  }
  for (const [, contact] of currentContactEntries({ current })) {
    if (contact.sight) captureRef(contact.sight.frameRef);
    if (contact.sight?.detail) captureRef(contact.sight.detail.frameRef);
  }
  const motions: CapturedCurrentSources['motions'] = {};
  for (const [id, motion] of Object.entries(state?.motionSamples ?? {})) {
    if (
      world.simTime >= motion.expiresAt ||
      !sources[id] ||
      !currentBodyGrant(world, actorId, id, reads)
    )
      continue;
    const location = state && currentFacetGet(state, `${id}:location`, { modality: 'sight' });
    if (!location) continue;
    const source = motion.earlier.original.id,
      ordinal = motion.earlier.original.ordinal;
    const aliases = [source, personalFactAlias(source, ordinal), ...(motion.earlier.aliases ?? [])];
    if (
      aliases.some(
        (alias) =>
          (world.experience?.forgotten[actorId] ?? []).includes(alias) ||
          Object.hasOwn(world.experience?.corrections?.[actorId] ?? {}, alias),
      )
    )
      continue;
    motions[id] = { track: motion, channel: location.grant.channel };
    captureValue(motion.earlier.value);
  }
  return immutableDataSnapshot(
    {
      observer,
      at: world.simTime,
      privacyRevision: world.experience?.privacyRevisions?.[actorId] ?? 0,
      lastIncludedOrder: world.events.at(-1)?.order ?? 0,
      sources,
      subjects: [...subjects.values()],
      reader: {
        observer,
        life: observer.physicalLife,
        current,
        ...(state?.visualConfirmation ? { visualConfirmation: state.visualConfirmation } : {}),
      },
      values,
      motions,
    },
    readOnlyDraftView,
  );
}
function recordFor(
  captured: CapturedCurrentSources,
  id: string,
  kind: string,
  channel: DefinitionPin,
  exposure: string,
): CurrentFacetRecord | undefined {
  const allowed = captured.sources[id]?.groups.some(
    (group) =>
      group.received.grant.exposure === exposure &&
      sameDefinitionPin(group.received.grant.channel, channel) &&
      !!group.received.fields[kind],
  );
  return allowed ? currentFacetGet(captured.reader, `${id}:${kind}`, { channel }) : undefined;
}
/** Eligibility belongs to the live/frozen selector. Projection shares the same
 * received phase, independent times and proofs once a member is selected. */
export function effectiveReceivedFacetSupport(
  owner: ReceivedCurrentReader,
  record: CurrentFacetRecord,
): LiveFacetSupport {
  const input = currentFacetSupport(owner, record),
    confirmation = currentFacetConfirmation(owner, record, input.confirmedThrough);
  return confirmation
    ? {
        ...input,
        confirmedThrough: confirmation.through,
        revision: Math.max(input.revision, confirmation.revision),
      }
    : input;
}
function factKey(owner: ReceivedCurrentReader, record: CurrentFacetRecord) {
  return contributionFactKey(
    { ...record.originalSource, observer: owner.observer! },
    record.originalOrdinal,
  );
}
export function receivedBodyPoseSupport(
  owner: ReceivedCurrentReader,
  values: ReceivedValueLookup,
  record: CurrentFacetRecord,
): CurrentBodyPoseSupport | undefined {
  const value = receivedFacetValueFromSources(values, record.value),
    held = effectiveReceivedFacetSupport(owner, record);
  if (
    value?.kind !== 'location' ||
    receivedValueAt(values, record.value.reference)?.kind !== 'body-pose'
  )
    return;
  return {
    frame: value.frame,
    role: held.original.facets[record.originalOrdinal]?.role ?? 'direct',
    ...(record.availability ? { availability: record.availability } : {}),
    poseMeasuredFrom: held.valueMeasuredFrom,
    poseMeasuredThrough: held.valueMeasuredThrough,
    poseAcquiredAt: held.valueAcquiredAt,
    original: factKey(owner, record),
    confirmation: {
      family: 'native-exposure',
      observer: held.observer,
      id: record.id,
      revision: held.revision,
    },
    confirmedFrom: held.confirmedFrom,
    confirmedThrough: held.confirmedThrough,
  };
}
export function receivedDescriptionSupport(
  owner: ReceivedCurrentReader,
  record: CurrentFacetRecord,
): CurrentDescriptionSupport {
  const held = effectiveReceivedFacetSupport(owner, record);
  return {
    role: held.original.facets[record.originalOrdinal]?.role ?? 'direct',
    ...(record.availability ? { availability: record.availability } : {}),
    descriptionMeasuredFrom: held.valueMeasuredFrom,
    descriptionMeasuredThrough: held.valueMeasuredThrough,
    descriptionAcquiredAt: held.valueAcquiredAt,
    original: factKey(owner, record),
    confirmation: {
      family: 'native-exposure',
      observer: held.observer,
      id: record.id,
      revision: held.revision,
    },
    confirmedFrom: held.confirmedFrom,
    confirmedThrough: held.confirmedThrough,
  };
}
export function effectiveReceivedFacetDescriptor(
  values: ReceivedValueLookup,
  record: CurrentFacetRecord,
  location?: CurrentFacetRecord,
): ReceivedFacetValue {
  return record.value.kind === 'body' &&
    location &&
    receivedValueAt(values, location.value.reference)?.kind === 'body-pose'
    ? { ...record.value, reception: { kind: 'body', poseRef: location.value.reference } }
    : record.value;
}
export function composeReceivedFacetValue(
  value: SensoryFacet,
  description?: SensoryFacet,
  support?: CurrentDescriptionSupport,
): SensoryFacet {
  return value.kind === 'body' &&
    description?.kind === 'description' &&
    support?.role === 'direct' &&
    !support.availability
    ? { kind: 'body', body: { ...value.body, description: description.text } }
    : value;
}
/** Compose already selected received members. This creates no sensory grant;
 * live eligibility and frozen track permissions remain with their selectors. */
export function captureReceivedFacet(
  held: LiveFacetSupport,
  values: ReceivedValueLookup,
  description?: SensoryFacet,
): CapturedCurrentFacet {
  const received = receivedFacetValueFromSources(values, held.value);
  if (!received) throw new Error('A captured current value is unavailable.');
  const value = composeReceivedFacetValue(received, description, held.descriptionSupport);
  const {
    channel: _channel,
    subjectId: _subject,
    subjectPhysicalLife: _life,
    revision,
    motionContinuityRevision: _motion,
    sourcePlacementRevision: _placement,
    original,
    originalOrdinal,
    value: _value,
    descriptionSupport,
    ...fields
  } = held as typeof held & { channel?: DefinitionPin };
  return immutableDataSnapshot(
    {
      ...fields,
      // A generic body caption is not the separate description's received text.
      // Retaining this composite must never attribute fallback prose to its proof.
      ...(value !== received && descriptionSupport ? { descriptionSupport } : {}),
      original: contributionFactKey({ ...original, observer: held.observer }, originalOrdinal),
      role: original.facets[originalOrdinal]?.role ?? 'direct',
      ...(original.origin.kind === 'occurrence'
        ? { originalAliases: [original.origin.eventId] }
        : original.origin.source
          ? { originalAliases: [original.origin.source.id] }
          : {}),
      value,
      confirmation: {
        family: 'native-exposure',
        observer: held.observer,
        id: held.id,
        revision,
      },
    },
    readOnlyDraftView,
  );
}
function captureRecord(
  captured: CapturedCurrentSources,
  record: CurrentFacetRecord,
): CapturedCurrentFacet {
  let held = effectiveReceivedFacetSupport(captured.reader, record);
  let descriptionValue: SensoryFacet | undefined;
  if (record.value.kind === 'body') {
    const grant = record.grant,
      location = recordFor(captured, grant.subjectId, 'location', grant.channel, grant.exposure),
      description = recordFor(
        captured,
        grant.subjectId,
        'description',
        grant.channel,
        grant.exposure,
      ),
      poseSupport = location && receivedBodyPoseSupport(captured.reader, captured.values, location),
      descriptionSupport = description && receivedDescriptionSupport(captured.reader, description);
    held = {
      ...held,
      value: effectiveReceivedFacetDescriptor(captured.values, record, location),
      ...(poseSupport ? { poseSupport } : {}),
      ...(descriptionSupport?.role === 'direct' && !descriptionSupport.availability
        ? { descriptionSupport }
        : {}),
    };
    if (description && held.descriptionSupport)
      descriptionValue = receivedFacetValueFromSources(captured.values, description.value);
  }
  return captureReceivedFacet(held, captured.values, descriptionValue);
}
/** Hydrate exactly the captured track. Later live movement/recognition cannot extend this cut. */
export function captureCurrentSource(
  captured: CapturedCurrentSources,
  sourceId: string,
  selection: { exposure: string; channel: DefinitionPin; kinds?: readonly SensoryFacet['kind'][] },
): CapturedCurrentFacet[] {
  const available = new Set(
    captured.sources[sourceId]?.groups
      .filter(
        (group) =>
          group.received.grant.exposure === selection.exposure &&
          sameDefinitionPin(group.received.grant.channel, selection.channel),
      )
      .flatMap((group) => Object.keys(group.received.fields)) ?? [],
  );
  const records = [...available]
    .filter(
      (kind) =>
        !selection.kinds ||
        selection.kinds.includes(kind as SensoryFacet['kind']) ||
        (kind === 'location' && selection.kinds.includes('observed-motion')),
    )
    .flatMap(
      (kind) => recordFor(captured, sourceId, kind, selection.channel, selection.exposure) ?? [],
    );
  const facts = records
    .filter((record) => !selection.kinds || selection.kinds.includes(record.value.kind))
    .map((record) => captureRecord(captured, record));
  const selectedMotion = captured.motions[sourceId],
    motion = selectedMotion?.track;
  if (
    motion &&
    sameDefinitionPin(selectedMotion!.channel, selection.channel) &&
    (!selection.kinds || selection.kinds.includes('observed-motion'))
  ) {
    const location = records.find(
      (record) => record.value.kind === 'location' && record.grant.modality === 'sight',
    );
    if (
      location &&
      location.motionContinuityRevision === motion.continuityRevision &&
      currentFacetTimes(captured.reader, location).valueMeasuredThrough === motion.through
    ) {
      const earlier = receivedFacetValueFromSources(captured.values, motion.earlier.value),
        latest = captureRecord(captured, location);
      if (earlier?.kind === 'location' && latest.value.kind === 'location') {
        const earlierProof = currentMotionEarlierProof(captured.observer, motion.earlier);
        const later: ReceivedLocationSample = {
          location: latest.value.location,
          frame: latest.value.frame,
          measuredFrom: latest.valueMeasuredFrom,
          measuredThrough: latest.valueMeasuredThrough,
          acquiredAt: latest.valueAcquiredAt,
          confirmedFrom: latest.confirmedFrom,
          confirmedThrough: latest.confirmedThrough,
          original: latest.original,
          confirmation: latest.confirmation,
          ...(latest.originalAliases ? { aliases: latest.originalAliases } : {}),
        };
        const value: Extract<SensoryFacet, { kind: 'observed-motion' }> = {
          kind: 'observed-motion',
          exposure: latest.exposure,
          earlier: { ...earlierProof, location: earlier.location, frame: earlier.frame },
          later,
          correspondence: 'unambiguous-received-continuity',
        };
        facts.push(
          immutableDataSnapshot(
            {
              ...latest,
              id: JSON.stringify([latest.id, 'observed-motion']),
              value,
              valueMeasuredFrom: value.earlier.measuredFrom,
              valueMeasuredThrough: value.later.measuredThrough,
              valueAcquiredAt: value.later.acquiredAt,
            },
            readOnlyDraftView,
          ),
        );
      }
    }
  }
  return facts;
}
