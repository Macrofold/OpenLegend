import { observedActionAnimation, type ObservedActionAnimation } from './observed-animation.js';
import { validatePerceivedSound } from './sound.js';
import {
  assemblyPresentation,
  receiveAssemblyConditions,
  validateObservedAssembly,
  type ObservedAssembly,
} from './assembly-presentation.js';
import {
  validPerceivedPoint as validPoint,
  validateEvidenceSource,
  validateObservedLocation,
} from './perception-values.js';
export { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import { nextId } from './data.js';
import { canonicalJson } from './events.js';
import { chargeWork } from './work-budget.js';
import { countDomainWork } from './diagnostic-counters.js';
import { requestDetailedSight } from './perception-timing.js';
import { personalFactAlias } from './experience-source.js';
import type { DetectionSupportState } from './perception-support.js';
import {
  cloneValue,
  readOnlyDraftView,
  touchNativeEvidence,
  trackOwnedCurrentMap,
} from './draft.js';
import { entityGet } from './entity-collection.js';
import { effectiveBodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { outwardStates } from './perception-frame.js';
import { equippedItems } from './equipment.js';
import { itemsForOwner } from './objects.js';
import {
  currentDetailedAttention,
  currentAttentionCues,
  nextAttentionWorkAt,
  markAttentionRelationsDirty,
  updateAttention,
  type AttentionEntry,
  type AttentionUpdate,
} from './attention.js';
import { validateReceivedSurfacePatch, validateReceivedBoundary } from './received-geometry.js';
import {
  captureTemporalAvailability,
  withTemporalAcquisition,
  captureTemporalCurrent,
  captureTemporalObservation,
  temporalReceiptSource,
  retainTemporalSupport,
  releaseTemporalSupport,
  finalizeTemporalGeometrySupport,
  reconcileTemporalGeometryCaptures,
} from './temporal-evidence.js';
import {
  refreshReceivedGeometry,
  evaluateAttentionRelations,
  currentReceivedGeometry,
  endReceivedGeometry,
  expireReceivedGeometryMotion,
} from './received-geometry.js';
import { hasMemory } from './living.js';
import { knownPlaceEvidence } from './known-place-evidence.js';
import { validEncounterExposure, type EncounterExposure } from './places.js';
import {
  hasRecordFields,
  isSafeRecordId,
  isImmutableData,
  immutableDataSnapshot,
  jsonEncoding,
  jsonText,
} from './records.js';
import {
  selectedBodyIndividual,
  selectedPruneObserverIndividuals,
  selectedOrdinaryWarning,
  selectedOutwardBodyName,
  selectedRecognitionSupportSourceIds,
  validReceivedRecognitionSupportKey,
  selectedRecordingReason,
  selectedTemporalPolicy,
  selectedAttentionContactDue,
  selectedAttentionContactAt,
  selectedAttentionPolicy,
  selectedCreditAttentionContact,
  selectedAssociateBodyFamiliarity,
} from './world-composition.js';
import { freeze, isDraft, original as draftOriginal } from 'immer';
import { validatePerceivedSpeech, validateReceivedFeatures } from './speech.js';
import { validObserverSubject } from './knowledge.js';
import { activelyParticipates } from './participation-state.js';
import {
  receivedValueAt,
  retainReceivedValue,
  receivedObservationValueReferences,
} from './received-values.js';
import { capabilityBlocked, projectStatusEffects } from './status-capabilities.js';
import { routineSensePolicy, sensesFor, visionRadius } from './perception.js';
import { projectAttributes, type AttributeView } from './world-modules.js';
import type { Awareness } from './experience.js';
import type { ObserverSubject } from './knowledge.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';
import {
  compactCurrentFacet,
  completePerceptionOriginal,
  currentFacetOriginal,
  currentFacetSupport,
  currentFacetTimes,
  updateCurrentFacetTimes,
  currentFacetExposure,
  currentFacetObserver,
  currentOriginal,
  currentOriginalKey,
  receivedPerceptionObservations,
  retainPerceptionOriginal,
  prunePerceptionOriginals,
  type CurrentFacetRecord,
} from './perception-current.js';
export {
  compactCurrentFacet,
  currentFacetOriginal,
  currentFacetSupport,
  currentFacetTimes,
  updateCurrentFacetTimes,
  currentFacetExposure,
  currentFacetObserver,
  currentOriginal,
  currentOriginalKey,
  receivedPerceptionObservations,
  type CurrentFacetRecord,
} from './perception-current.js';

export interface ObserverLife {
  actorId: string;
  physicalLife: number;
}
/** These versions belong to their source families; they are never compared across families. */
export type EvidenceSource =
  | {
      family: 'awareness' | 'memory' | 'action-result';
      id: string;
      revision: string;
      observer: ObserverLife;
    }
  | { family: 'private-condition'; id: string; revision: string | number; observer: ObserverLife }
  | {
      family: 'native-exposure' | 'native-response';
      id: string;
      revision: number;
      observer: ObserverLife;
    };
export interface ObservationFactKey {
  source: EvidenceSource;
  ordinal: number;
}
export interface ObservationExposure {
  observer: ObserverLife;
  episodeId: string;
}
export type EvidenceParticipant =
  | { kind: 'exposure'; exposure: ObservationExposure }
  | { kind: 'individual'; subject: ObserverSubject; association?: ObservationFactKey }
  | { kind: 'described'; descriptionAsHeard: string };
export interface ReceivedEventParticipant {
  /** Index into this event's received references, never a live entity lookup. */
  referenceOrdinal: number;
  participant: Extract<EvidenceParticipant, { kind: 'exposure' }>;
}
export interface ReceivedSpeechParticipants {
  speaker?: Extract<EvidenceParticipant, { kind: 'exposure' }>;
  addressee?: Extract<EvidenceParticipant, { kind: 'exposure' }>;
}
export type ObservedLocation =
  | { kind: 'point'; point: Position; errorRadius: number }
  | {
      kind: 'bearing';
      from: Position;
      sector: number;
      elevation: 'above' | 'level' | 'below';
      spread: number;
    }
  | { kind: 'region'; center: Position; radius: number };
export interface ObservationFrame {
  positionAtObservation: Position;
  forwardAtObservation?: number;
}
function sameObservationFrame(first: ObservationFrame | undefined, second: ObservationFrame) {
  return (
    !!first &&
    first.positionAtObservation.x === second.positionAtObservation.x &&
    first.positionAtObservation.y === second.positionAtObservation.y &&
    first.positionAtObservation.z === second.positionAtObservation.z &&
    first.forwardAtObservation === second.forwardAtObservation
  );
}
export function validObservationFrame(value: unknown): value is ObservationFrame {
  return (
    hasRecordFields(value, ['positionAtObservation'], ['forwardAtObservation']) &&
    validPoint(value.positionAtObservation) &&
    (value.forwardAtObservation === undefined || Number.isFinite(value.forwardAtObservation))
  );
}
/** Native producers may retain a complete installed sense definition here. Readers
 * require its exact identity/version; its additional received metadata is preserved. */
export function validObservationDetector(
  value: unknown,
): value is ObservationContribution['detector'] {
  const detector = value as ObservationContribution['detector'] | undefined;
  return (
    !!detector &&
    typeof detector.id === 'string' &&
    Number.isSafeInteger(detector.version) &&
    detector.version >= 1
  );
}
/** The finite current-channel body fields. This contains no inventory, intent or private meters. */
export interface ObservedBody {
  kind: Entity['kind'];
  position: Position;
  heading: number;
  appearance: string;
  radius: number;
  height: number;
  supportSurfaceId: string | null;
  outward: [string, string, string, string];
  label?: {
    name: string;
    nameForm?: Entity['nameForm'];
    indefiniteArticle?: Entity['indefiniteArticle'];
  };
  description?: string;
  quantity?: number;
  heatLit?: boolean;
  remainsPhase?: 'fresh' | 'rotting' | 'removed';
  /** Visible storage access only; inspection still owns the disclosure of contents. */
  storage?: { placementRevision: number };
  assembly?: ObservedAssembly;
  animation?: ObservedActionAnimation | null;
  effects?: ReturnType<typeof projectStatusEffects>;
  bodyPlan?: 'biped' | 'quadruped' | 'avian';
  subtype?: string;
  icon?: string;
}
export type ObservedBodyPose = Pick<ObservedBody, 'position' | 'heading' | 'supportSurfaceId'>;
export type ObservedBodyDetails = Omit<ObservedBody, keyof ObservedBodyPose>;
const bodyParts = new WeakMap<
  ObservedBody,
  { details: ObservedBodyDetails; pose: ObservedBodyPose }
>();
export function splitObservedBody(body: ObservedBody): {
  details: ObservedBodyDetails;
  pose: ObservedBodyPose;
} {
  body = readOnlyDraftView(body);
  const reusable = isImmutableData(body),
    previous = reusable && bodyParts.get(body);
  if (previous) return previous;
  const { position, heading, supportSurfaceId, ...details } = body;
  const value = immutableDataSnapshot(
    { details, pose: { position, heading, supportSurfaceId } },
    readOnlyDraftView,
  );
  if (reusable) bodyParts.set(body, value);
  return value;
}
export function materializeObservedBody(
  details: ObservedBodyDetails,
  pose: ObservedBodyPose,
): ObservedBody {
  return { ...details, ...pose };
}
export type SensoryFacet =
  | { kind: 'surface-patch'; patch: import('./received-geometry.js').ObservedSurfacePatch }
  | { kind: 'physical-boundary'; boundary: import('./received-geometry.js').ObservedBoundary }
  | { kind: 'detected'; detected: 'signal' | 'surface' | 'body' | 'impact'; limits: string[] }
  | { kind: 'location'; location: ObservedLocation; frame: ObservationFrame }
  | { kind: 'body'; body: ObservedBody }
  | { kind: 'description'; text: string }
  | { kind: 'carried'; items: Array<{ itemKindAsObserved: string }> }
  | {
      kind: 'pile-contents';
      items: Array<{
        id: string;
        definitionId: string;
        name: string;
        quantity: number;
        portable: boolean;
      }>;
    }
  | { kind: 'public-attributes'; attributes: AttributeView[] }
  | {
      kind: 'observed-motion';
      exposure: ObservationExposure;
      earlier: ReceivedLocationSample;
      later: ReceivedLocationSample;
      correspondence: 'unambiguous-received-continuity';
    }
  | { kind: 'contact'; exposure: ObservationExposure; detail: 'present' | 'moving' }
  | {
      kind: 'speech';
      speech: NonNullable<Awareness['speech']>;
      participants?: ReceivedSpeechParticipants;
    }
  | { kind: 'perceived-feature'; sample: NonNullable<Awareness['receivedFeatures']> }
  | {
      kind: 'sound';
      sound: NonNullable<Awareness['sound']>;
      source?: Extract<EvidenceParticipant, { kind: 'exposure' }>;
    }
  /** Complete already-admitted inspection/place meaning, independent of its prose. */
  | { kind: 'encounter-exposure'; exposure: EncounterExposure }
  | {
      kind: 'event';
      eventType: string;
      text: string;
      modality: Awareness['modality'];
      importance: number;
      sequence: number;
      recognized: boolean;
      intelligible: boolean;
      entityEpisodes?: Awareness['entityEpisodes'];
      triggerKind?: Awareness['triggerKind'];
      sourceSubject?: Awareness['sourceSubject'];
      urgency?: number;
      content?: string;
      data: NonNullable<WorldEvent['data']>;
      references: NonNullable<Awareness['references']>;
      participants?: ReceivedEventParticipant[];
    }
  | {
      kind: 'association';
      subject: ObserverSubject;
      strength: 'supported' | 'possible' | 'ambiguous';
      learningSupport?: string[];
    }
  | {
      kind: 'claim';
      claim: {
        kind: 'danger';
        where: ObservedLocation;
        when: { kind: 'stated-interval'; from: number; through: number; precision: 'approximate' };
        presence: 'possible';
      };
      strength: 'possible';
      speaker: EvidenceParticipant;
      wordsAsHeard: string;
      support: ObservationFactKey[];
      /** Correction/forgetting aliases only; exact fact keys above remain authority. */
      supportAliases?: Array<{ family: 'awareness'; id: string }>;
    };
export interface ReceivedFacetProof {
  original: ObservationFactKey;
  confirmation: EvidenceSource;
  confirmedFrom: number;
  confirmedThrough: number;
  aliases?: string[];
}
export interface ObservationFacet {
  support?: ReceivedFacetProof;
  ordinal: number;
  role: 'direct' | 'testimony' | 'inference';
  asOf: number;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  value: SensoryFacet;
}
export type ObservationOrigin =
  | { kind: 'occurrence'; eventId: string; at: number; order: number }
  | {
      kind: 'exposure';
      episodeId: string;
      detectorId: string;
      measuredFrom: number;
      measuredThrough: number;
      source?: EvidenceSource;
    };
export interface ObservationContribution {
  id: string;
  revision: number;
  observer: ObserverLife;
  origin: ObservationOrigin;
  acquiredAt: number;
  modality: 'sight' | 'hearing' | 'touch';
  detector: { id: string; version: number };
  /** Received bodies sharing this occurrence's recording scope. Participant roles
   * belong to its typed facets; this scope grants no later body access. */
  context?: { subjects: ObservationExposure[]; attended: boolean };
  facets: ObservationFacet[];
}
/** Native authority keeps compact personal metadata and exact shared payload
 * addresses. Complete observations are read products of this same record. */
export interface ReceivedFacetValue {
  kind: Exclude<SensoryFacet['kind'], 'observed-motion'>;
  reference: readonly [blockId: string, valueOrdinal: number];
  reception?:
    | { kind: 'body'; poseRef: readonly [string, number] }
    | { kind: 'location'; frameRef: readonly [blockId: string, valueOrdinal: number] };
}
export interface ReceivedObservationFacet {
  support?: ReceivedFacetProof;
  ordinal?: number;
  role?: ObservationFacet['role'];
  asOf?: number;
  measuredFrom?: number;
  measuredThrough?: number;
  acquiredAt?: number;
  value: ReceivedFacetValue;
}
export type ReceivedObservationHeader = Pick<
  ObservationContribution,
  'observer' | 'acquiredAt' | 'modality' | 'detector'
>;
export interface ReceivedObservation
  extends Omit<
    ObservationContribution,
    'facets' | 'observer' | 'acquiredAt' | 'modality' | 'detector'
  > {
  headerRef: readonly [blockId: string, valueOrdinal: number];
  facets: ReceivedObservationFacet[];
}

/** Resolve only already received metadata, without expanding a single facet. */
export function receivedObservationHeader(
  world: WorldState,
  source: Pick<ReceivedObservation, 'headerRef'>,
): ReceivedObservationHeader {
  const value = receivedValueAt(world.receivedValues?.sources ?? {}, {
    blockId: source.headerRef[0],
    valueOrdinal: source.headerRef[1],
  });
  if (value?.kind !== 'observation-header')
    throw new Error('The received observation header is unavailable.');
  return value.header;
}
/** A frame reference is comparison data, never permission to sense or move. */
export function receivedObservationFrame(
  world: WorldState,
  reference: readonly [string, number],
): ObservationFrame {
  const value = receivedValueAt(world.receivedValues?.sources ?? {}, {
    blockId: reference[0],
    valueOrdinal: reference[1],
  });
  if (value?.kind !== 'observation-frame')
    throw new Error('The received observation frame is unavailable.');
  return value.frame;
}

export function receivedObservationFacetMetadata(
  original: ReceivedObservation,
  ordinal: number,
): Omit<ObservationFacet, 'value' | 'acquiredAt'> & { acquiredAt?: number } {
  const facet = original.facets[ordinal];
  if (!facet) throw new Error('The received observation has no selected facet.');
  const from =
    original.origin.kind === 'exposure' ? original.origin.measuredFrom : original.origin.at;
  const through =
    original.origin.kind === 'exposure' ? original.origin.measuredThrough : original.origin.at;
  const measuredThrough = facet.measuredThrough ?? through;
  return {
    ordinal: facet.ordinal ?? ordinal,
    role: facet.role ?? 'direct',
    asOf: facet.asOf ?? measuredThrough,
    measuredFrom: facet.measuredFrom ?? from,
    measuredThrough,
    ...(facet.acquiredAt !== undefined ? { acquiredAt: facet.acquiredAt } : {}),
    ...(facet.support ? { support: facet.support } : {}),
  };
}

const receivedLocations = new WeakMap<
  ObservedLocation,
  WeakMap<ObservationFrame, Extract<SensoryFacet, { kind: 'location' }>>
>();

const receivedBodies = new WeakMap<
  ObservedBodyDetails,
  WeakMap<ObservedBodyPose, Extract<SensoryFacet, { kind: 'body' }>>
>();
function receivedBodyValue(
  details: ObservedBodyDetails,
  pose: ObservedBodyPose,
): Extract<SensoryFacet, { kind: 'body' }> {
  const reusable = isImmutableData(details) && isImmutableData(pose);
  let poses = reusable ? receivedBodies.get(details) : undefined;
  const existing = poses?.get(pose);
  if (existing) return existing;
  const value = immutableDataSnapshot(
    { kind: 'body' as const, body: materializeObservedBody(details, pose) },
    readOnlyDraftView,
  );
  if (reusable) {
    // Materialization already knows these exact immutable parts. Recording and
    // comparison must not split/copy the same appearance again for each pose.
    bodyParts.set(value.body, immutableDataSnapshot({ details, pose }));
    if (!poses) receivedBodies.set(details, (poses = new WeakMap()));
    poses.set(pose, value);
  }
  return value;
}
/** A reference resolves only an already selected personal facet. It grants no
 * observer/life, source identity, current body or historical membership. */
export function receivedBodyParts(
  world: WorldState,
  descriptor: ReceivedFacetValue,
):
  | {
      details: ObservedBodyDetails;
      pose: ObservedBodyPose;
    }
  | undefined {
  if (descriptor.kind !== 'body' || descriptor.reception?.kind !== 'body') return;
  const sources = readReceivedSources(world);
  const details = receivedValueAt(sources, {
    blockId: descriptor.reference[0],
    valueOrdinal: descriptor.reference[1],
  });
  const pose = receivedValueAt(sources, {
    blockId: descriptor.reception.poseRef[0],
    valueOrdinal: descriptor.reception.poseRef[1],
  });
  if (details?.kind !== 'body' || pose?.kind !== 'body-pose') return;
  return { details: details.body, pose: pose.pose };
}
export function receivedFacetValue(
  world: WorldState,
  descriptor: ReceivedFacetValue,
): SensoryFacet | undefined {
  if (descriptor.kind === 'body') {
    const parts = receivedBodyParts(world, descriptor);
    return parts && receivedBodyValue(parts.details, parts.pose);
  }
  const value = receivedValueAt(readReceivedSources(world), {
    blockId: descriptor.reference[0],
    valueOrdinal: descriptor.reference[1],
  });
  if (!value) return;
  if (descriptor.kind === 'location' && (value.kind === 'location' || value.kind === 'body-pose')) {
    if (descriptor.reception?.kind !== 'location') return;
    const location =
        value.kind === 'body-pose'
          ? observedPoseLocation(value.pose)
          : readOnlyDraftView(value.location),
      frame = readOnlyDraftView(receivedObservationFrame(world, descriptor.reception.frameRef));
    // Resolve the live address before reuse. Only exact immutable geometry and
    // the receiver's immutable frame can share this complete read wrapper.
    if (!isImmutableData(location) || !isImmutableData(frame))
      return { kind: 'location', location, frame };
    let frames = receivedLocations.get(location);
    const previous = frames?.get(frame);
    if (previous) return previous;
    const result = immutableDataSnapshot(
      { kind: 'location' as const, location, frame },
      readOnlyDraftView,
    );
    if (!frames) receivedLocations.set(location, (frames = new WeakMap()));
    frames.set(frame, result);
    return result;
  }
  if (value.kind !== descriptor.kind || value.kind === 'location') return;
  if (descriptor.reception) return;
  return value;
}

const completeObservations = new WeakMap<
  ReceivedObservation,
  { fragments: readonly object[]; value: ObservationContribution }
>();

/** Materialize the selected closure now. The resulting immutable cut owns its
 * values and never consults a later live pool to repair missing evidence. */
export function materializeObservation(
  world: WorldState,
  source: ReceivedObservation,
): ObservationContribution {
  source = readOnlyDraftView(source);
  const fragments = receivedObservationValueReferences(source).map((reference) =>
    receivedValueAt(world.receivedValues?.sources ?? {}, reference),
  );
  if (fragments.some((value) => !value))
    throw new Error('The selected received observation has unavailable values.');
  const reusable = isImmutableData(source) && fragments.every((value) => isImmutableData(value));
  const cached = reusable ? completeObservations.get(source) : undefined;
  if (
    cached &&
    cached.fragments.length === fragments.length &&
    cached.fragments.every((fragment, index) => fragment === fragments[index])
  )
    return cached.value;
  const header = receivedObservationHeader(world, source);
  const { headerRef: _header, ...fields } = source;
  const value = immutableDataSnapshot<ObservationContribution>(
    {
      ...fields,
      ...header,
      facets: source.facets.map((facet, ordinal) => {
        const value = receivedFacetValue(world, facet.value);
        if (!value) throw new Error('The received facet reference has incompatible meaning.');
        return {
          ...receivedObservationFacetMetadata(source, ordinal),
          acquiredAt: facet.acquiredAt ?? header.acquiredAt,
          value,
        };
      }),
    },
    readOnlyDraftView,
  );
  if (reusable) completeObservations.set(source, { fragments: fragments as object[], value });
  return value;
}

const frameFragments = new WeakMap<
  ObservationFrame,
  { kind: 'observation-frame'; frame: ObservationFrame }
>();
function retainObservationFrame(world: WorldState, frame: ObservationFrame) {
  frame = readOnlyDraftView(frame);
  const reusable = isImmutableData(frame);
  let value = reusable ? frameFragments.get(frame) : undefined;
  if (!value) {
    value = immutableDataSnapshot({ kind: 'observation-frame' as const, frame }, readOnlyDraftView);
    if (reusable) frameFragments.set(frame, value);
  }
  const retained = retainReceivedValue(
    world,
    value,
    selectedTemporalPolicy(world).recent.chunkBytes,
  );
  return {
    reference: [retained.reference.blockId, retained.reference.valueOrdinal] as const,
    addedBytes: retained.addedBytes,
  };
}
const locationFragments = new WeakMap<
  ObservedLocation,
  { kind: 'location'; location: ObservedLocation }
>();
const bodyFragments = new WeakMap<
  ReturnType<typeof splitObservedBody>,
  {
    details: { kind: 'body'; body: ObservedBodyDetails };
    pose: { kind: 'body-pose'; pose: ObservedBodyPose };
  }
>();
const poseFragments = new WeakMap<
  ObservedBodyPose,
  { kind: 'body-pose'; pose: ObservedBodyPose }
>();
function receivedPoseFragment(pose: ObservedBodyPose) {
  const reusable = isImmutableData(pose),
    prior = reusable && poseFragments.get(pose);
  if (prior) return prior;
  const fragment = immutableDataSnapshot({ kind: 'body-pose' as const, pose }, readOnlyDraftView);
  if (reusable) poseFragments.set(pose, fragment);
  return fragment;
}

function receivedBodyFragments(body: ObservedBody) {
  const parts = splitObservedBody(body),
    previous = bodyFragments.get(parts);
  if (previous?.details.body === parts.details && previous.pose.pose === parts.pose)
    return previous;
  // The common source already owns these immutable parts. Rebuilding wrappers
  // per receiver would serialize the same appearance and pose again for each.
  const fragments = immutableDataSnapshot(
    {
      details: { kind: 'body' as const, body: parts.details },
      pose: receivedPoseFragment(parts.pose),
    },
    readOnlyDraftView,
  );
  bodyFragments.set(parts, fragments);
  return fragments;
}
const poseLocations = new WeakMap<ObservedBodyPose, Extract<ObservedLocation, { kind: 'point' }>>();
function observedPoseLocation(
  pose: ObservedBodyPose,
): Extract<ObservedLocation, { kind: 'point' }> {
  const reusable = isImmutableData(pose),
    prior = reusable && poseLocations.get(pose);
  if (prior) return prior;
  const value = immutableDataSnapshot(
    { kind: 'point' as const, point: pose.position, errorRadius: 0 },
    readOnlyDraftView,
  );
  if (reusable) poseLocations.set(pose, value);
  return value;
}
function retainFacetValue(
  world: WorldState,
  value: SensoryFacet,
  previous?: ReceivedFacetValue,
  pose?: ObservedBodyPose,
) {
  value = readOnlyDraftView(value);
  if (value.kind === 'observed-motion')
    throw new Error('Received motion stores its actual endpoints.');
  const body = value.kind === 'body' ? receivedBodyFragments(value.body) : undefined;
  let fragment: import('./received-values.js').ReceivedValueFragment =
    value.kind === 'body' ? body!.details : value;
  let reception: ReceivedFacetValue['reception'];
  let frameBytes = 0;
  if (value.kind === 'location') {
    if (pose) fragment = receivedPoseFragment(pose);
    else {
      const location = readOnlyDraftView(value.location);
      const reusable = isImmutableData(location);
      let neutral = reusable ? locationFragments.get(location) : undefined;
      if (!neutral) {
        neutral = immutableDataSnapshot({ kind: 'location' as const, location }, readOnlyDraftView);
        if (reusable) locationFragments.set(location, neutral);
      }
      fragment = neutral;
    }
    const received = retainObservationFrame(world, value.frame);
    reception = { kind: 'location', frameRef: received.reference };
    frameBytes = received.addedBytes;
  }
  if (value.kind === 'body') {
    const retained = retainReceivedValue(
      world,
      body!.pose,
      selectedTemporalPolicy(world).recent.chunkBytes,
      previous?.reception?.kind === 'body'
        ? { blockId: previous.reception.poseRef[0], valueOrdinal: previous.reception.poseRef[1] }
        : undefined,
    );
    frameBytes += retained.addedBytes;
    reception = {
      kind: 'body',
      poseRef: [retained.reference.blockId, retained.reference.valueOrdinal],
    };
  }
  const retained = retainReceivedValue(
    world,
    fragment,
    selectedTemporalPolicy(world).recent.chunkBytes,
    previous ? { blockId: previous.reference[0], valueOrdinal: previous.reference[1] } : undefined,
  );
  return {
    value: {
      kind: value.kind,
      reference: [retained.reference.blockId, retained.reference.valueOrdinal],
      ...(reception ? { reception } : {}),
    } as ReceivedFacetValue,
    addedBytes: retained.addedBytes + frameBytes,
  };
}
export interface LiveFacetSupport {
  /** Read-only current pose metadata; original appearance keeps its own times. */
  poseSupport?: CurrentBodyPoseSupport;
  descriptionSupport?: CurrentDescriptionSupport;
  id: string;
  revision: number;
  observer: ObserverLife;
  /** Private routing binding; not a claimed identity or outward participant. */
  subjectId: string;
  subjectPhysicalLife: number | null;
  /** An acquired association expires with this exact observed body, even on same-life return. */
  bodyLeaseId?: string;
  /** A source-owned continuous local person role; it supplies no modality profile. */
  localSubject?: ObserverSubject;
  /** Private source continuity, never a permitted trajectory or participant identity. */
  motionContinuityRevision?: number;
  sourcePlacementRevision?: number;
  exposure: ObservationExposure;
  original: ReceivedObservation;
  originalOrdinal: number;
  modality: ObservationContribution['modality'];
  value: ReceivedFacetValue;
  valueMeasuredFrom: number;
  valueMeasuredThrough: number;
  valueAcquiredAt: number;
  confirmedFrom: number;
  confirmedThrough: number;
}
export interface CapturedCurrentFacet
  extends Omit<
    LiveFacetSupport,
    | 'subjectId'
    | 'subjectPhysicalLife'
    | 'revision'
    | 'motionContinuityRevision'
    | 'sourcePlacementRevision'
    | 'original'
    | 'originalOrdinal'
    | 'value'
  > {
  original: ObservationFactKey;
  role: ObservationFacet['role'];
  originalAliases?: string[];
  value: SensoryFacet;
  confirmation: Extract<EvidenceSource, { family: 'native-exposure' | 'native-response' }>;
}
/** Public presentation needs the permitted value and its times, without the
 * complete original/confirmation envelope needed by evidence consumers. */
export type CurrentFacetValue = Pick<
  LiveFacetSupport,
  'id' | 'valueMeasuredFrom' | 'valueMeasuredThrough' | 'valueAcquiredAt' | 'confirmedThrough'
> & {
  value: SensoryFacet;
  source: EvidenceSource;
  poseSupport?: CurrentBodyPoseSupport;
  descriptionSupport?: CurrentDescriptionSupport;
};
export interface CurrentDescriptionSupport extends ReceivedFacetProof {
  descriptionMeasuredFrom: number;
  descriptionMeasuredThrough: number;
  descriptionAcquiredAt: number;
}
export interface CurrentBodyPoseSupport extends ReceivedFacetProof {
  frame: ObservationFrame;
  poseMeasuredFrom: number;
  poseMeasuredThrough: number;
  poseAcquiredAt: number;
}
/** A received endpoint keeps exact selected geometry and proof, never the whole original. */
export interface ReceivedLocationSample {
  location: ObservedLocation;
  frame: ObservationFrame;
  measuredFrom: number;
  measuredThrough: number;
  acquiredAt: number;
  confirmedFrom: number;
  confirmedThrough: number;
  original: ObservationFactKey;
  confirmation: EvidenceSource;
  aliases?: string[];
}
/** Current spatial readers need measured values and their exact provenance, not
 * a second historical account/confirmation wrapper for every body and location. */
export interface BodyGeometrySample {
  /** Producer-certified reuse is validity, never a new measurement. */
  valueSupportedFrom?: number;
  valueSupportedThrough?: number;
  valueMeasuredFrom: number;
  valueMeasuredThrough: number;
  fact: ObservationFactKey;
}
export interface LocationGeometrySample extends BodyGeometrySample {
  location: ObservedLocation;
}
export interface CurrentBodyGeometryInput {
  /** Private routing; player/model projection supplies its scoped reference. */
  sourceId: string;
  exposure: string;
  /** Distance queries do not copy appearance; current facts still own those details. */
  body: Pick<ObservedBody, 'position' | 'radius' | 'height'>;
  sample: BodyGeometrySample;
  location?: LocationGeometrySample;
  motion?: { earlier: LocationGeometrySample; later: LocationGeometrySample };
}
export interface CurrentMotionSample {
  /** Previous point only; the latest point remains in the current location owner. */
  earlier: Omit<ReceivedLocationSample, 'location' | 'frame'> & { value: ReceivedFacetValue };
  through: number;
  continuityRevision: number;
  expiresAt: number;
}
export interface PerceptionEvidenceOwner {
  /** One completed full sight phase renews only its extant supported sight facets.
   * Independent values/losses remain in current. Effective readers apply this
   * actual receiver frame and timing without rewriting stationary detail. */
  visualConfirmation?: {
    through: number;
    revision: number;
    completeThrough: number;
    completeRevision: number;
    completeInputRevision: number;
    subjects: Record<
      string,
      {
        through: number;
        revision: number;
        inputRevision: number;
        detail?: { through: number; revision: number; inputRevision: number };
      }
    >;
    frameRef: readonly [blockId: string, valueOrdinal: number];
    frameRevision: number;
  };
  motionSamples?: Record<string, CurrentMotionSample>;
  motionExpiresAt?: number;
  geometry?: import('./received-geometry.js').ReceivedGeometryState;
  attention?: import('./attention.js').AttentionState;
  life: number;
  /** Residency boundary only. Explicit acquired bodies, never this number, define a cut. */
  receivedAtSequence: number;
  observer?: ObserverLife;
  originals: Record<string, ReceivedObservation>;
  received: string[];
  receipts: Record<string, number>;
  current: Record<string, CurrentFacetRecord>;
  /** Only unresolved short gaps, pruned at native acquisition; never lifetime history. */
  gaps: Record<
    string,
    { episodeId: string; lostAt: number; through: number; physicalLife: number | null }
  >;
  support?: DetectionSupportState;
}
export type PerceptionEvidenceState = Record<string, PerceptionEvidenceOwner>;
/** Existing finite receiver work joins the native clock.
 * docs/simulation-time.md#extensible-boundary-ownership
 * Read at most the selected
 * entries, never all bodies/history. Exhausted unknown geometry and an already
 * attempted declined contact provide no recurring wake-up. Motion retains its
 * explicit received interval until another genuine sight phase ends it. */
export function nextPerceptionWorkAt(world: WorldState, observerId: string): number | undefined {
  const geometry = world.perceptionEvidence?.[observerId]?.geometry;
  const next = Math.min(
    nextAttentionWorkAt(world, observerId) ?? Infinity,
    nextPerceptionMeasurementAt(world, observerId) ?? Infinity,
    geometry?.priorFrame
      ? geometry.frameAt + selectedAttentionPolicy(world).geometry.intervalSeconds
      : Infinity,
    world.perceptionEvidence?.[observerId]?.motionExpiresAt ?? Infinity,
  );
  return Number.isFinite(next) ? next : undefined;
}
/** Finite acquisition work owns its deadline even when no source moves. Ordinary
 * attention interpretation alone never requests another physical sample. */
export function nextPerceptionMeasurementAt(
  world: WorldState,
  observerId: string,
): number | undefined {
  const owners = readOnlyDraftView(world).perceptionEvidence;
  const source = owners && readOnlyDraftView(owners)[observerId];
  if (!source) return;
  const state = readOnlyDraftView(source);
  const attention = state.attention && readOnlyDraftView(state.attention);
  const geometry = state.geometry && readOnlyDraftView(state.geometry);
  if (!attention?.entries.length && (!geometry || geometry.finished)) return;
  const observer = entityGet(world.entities, observerId);
  if (
    !observer?.actor?.alive ||
    !activelyParticipates(observer) ||
    (!hasMemory(observer) &&
      !(observer.actor.controller === 'native' && observer.animal?.episode)) ||
    source.life !== (observer.actor.physicalLife ?? 0) ||
    visionRadius(world, observer) <= 0
  )
    return;
  let next = Infinity;
  const nextSight = observer.sensoryProgress?.routineSight?.nextAt ?? world.simTime;
  if (
    geometry &&
    !geometry.finished &&
    geometry.fragments.length + geometry.boundaries.length <
      selectedAttentionPolicy(world).geometry.maxViews
  )
    next = Math.min(next, Math.max(geometry.nextAt, nextSight));
  const current = readOnlyDraftView(state.current);
  for (const entry of currentDetailedAttention(world, observerId)) {
    const body = current[`${entry.sourceId}:body`];
    if (!body || body.id !== entry.leaseId) continue;
    const local = body.localSubject;
    const recognized = entry.subject;
    const through = state.visualConfirmation?.through ?? -Infinity;
    if (local?.kind === 'individual') {
      const at = selectedAttentionContactAt(world, observerId, local.individualId, through);
      if (at !== undefined) next = Math.min(next, Math.max(at, nextSight));
    }
    if (
      recognized?.kind === 'individual' &&
      (local?.kind !== 'individual' || local.individualId !== recognized.individualId)
    ) {
      const at = selectedAttentionContactAt(world, observerId, recognized.individualId, through);
      if (at !== undefined) next = Math.min(next, Math.max(at, nextSight));
    }
  }
  return Number.isFinite(next) ? next : undefined;
}
export interface EvidenceCut {
  privacyRevision: number;
  observer: ObserverLife;
  at: number;
  lastIncludedOrder: number;
  acquired: ObservationContribution[];
  current: CapturedCurrentFacet[];
}

const observerLife = (entity: Entity): ObserverLife => ({
  actorId: entity.id,
  physicalLife: entity.actor?.physicalLife ?? 0,
});
/** Prepared native source identity is a dependency token, never saved authority. */
const measuredSources = new WeakMap<
  ReceivedObservation,
  { leaseId: string; token: string; detailed: boolean }
>();
interface VisualSourceValues {
  location: Extract<ObservedLocation, { kind: 'point' }>;
  pose: ObservedBodyPose;
  facets: readonly SensoryFacet[];
}
/** The native frame owns this finite cache. Its complete source token covers only
 * common outward values; each admitted receiver still supplies its own frame,
 * detector, time, exposure, association and evidence envelope. */
const visualSourceValues = new WeakMap<
  object,
  Map<
    boolean,
    {
      token: string;
      values: VisualSourceValues;
      details: ObservedBodyDetails;
      extra: readonly SensoryFacet[];
    }
  >
>();
function prepareVisualSourceValues(
  world: WorldState,
  subject: Entity,
  detailToken: object | undefined,
  token: string | undefined,
  publicAttributes: readonly AttributeView[],
  detailed: boolean,
): VisualSourceValues {
  const shared = detailToken && visualSourceValues.get(detailToken),
    prior = shared && shared.get(detailed),
    preparedBody = prior || (shared && shared.get(!detailed));
  if (token && prior?.token === token) {
    countDomainWork('visualSourcePreparationReuses');
    return prior.values;
  }
  countDomainWork('visualSourcePreparations');
  const profile = effectiveBodyProfile(world, subject),
    placement = subject.placement!;
  const pose =
    preparedBody && preparedBody.token === token
      ? preparedBody.values.pose
      : immutableDataSnapshot(
          {
            position: readOnlyDraftView(worldPosition(subject)),
            heading: subject.spatial.heading,
            supportSurfaceId: worldSupport(subject),
          },
          readOnlyDraftView,
        );
  const body: ObservedBody | undefined = preparedBody
    ? undefined
    : {
        kind: subject.kind,
        ...pose,
        appearance: subject.appearance ?? 'sprite',
        radius: profile.radius,
        height: profile.height,
        outward: outwardStates(subject),
        ...(subject.actor
          ? {
              animation: observedActionAnimation(world, subject),
              effects: projectStatusEffects(world, subject),
              ...(subject.actor.body?.plan ? { bodyPlan: subject.actor.body.plan } : {}),
              subtype: subject.actor.species,
            }
          : {}),
        ...(subject.resource ? { subtype: subject.resource.definitionId } : {}),
        ...((
          subject.resource
            ? world.itemDefinitions[subject.resource.definitionId]?.icon
            : subject.icon
        )
          ? {
              icon: subject.resource
                ? world.itemDefinitions[subject.resource.definitionId]!.icon
                : subject.icon,
            }
          : {}),
        label: selectedOutwardBodyName(world, subject),
        ...(subject.assembly ? { assembly: assemblyPresentation(world, subject.id) } : {}),
        ...(subject.resource ? { quantity: subject.resource.quantity } : {}),
        ...(subject.heat ? { heatLit: subject.heat.lit } : {}),
        ...(subject.remains ? { remainsPhase: subject.remains.phase } : {}),
        ...(subject.container || subject.kind === 'item-pile' || subject.remains
          ? { storage: { placementRevision: placement.revision } }
          : {}),
      };
  const facets: SensoryFacet[] = [
    { kind: 'detected', detected: subject.actor ? 'body' : 'surface', limits: [] },
    preparedBody
      ? receivedBodyValue(preparedBody.details, pose)
      : { kind: 'body', body: immutableDataSnapshot(body!, readOnlyDraftView) },
    ...(prior
      ? prior.extra
      : detailed
        ? [
            {
              kind: 'carried',
              items: equippedItems(world, subject.id).flatMap((item) => {
                const definition = world.itemDefinitions[item.definitionId];
                return definition ? [{ itemKindAsObserved: definition.name }] : [];
              }),
            } as SensoryFacet,
          ]
        : []),
  ];
  if (detailed && !prior && (subject.actor?.description ?? subject.description))
    facets.push({
      kind: 'description',
      text: (subject.actor?.description ?? subject.description)!,
    });
  if (detailed && !prior && (subject.kind === 'item-pile' || subject.remains))
    facets.push({
      kind: 'pile-contents',
      items: itemsForOwner(world, subject.id).flatMap((item) => {
        const definition = world.itemDefinitions[item.definitionId];
        return definition
          ? [
              {
                id: item.id,
                definitionId: item.definitionId,
                name: definition.name,
                quantity: item.quantity,
                portable: definition.portable === true,
              },
            ]
          : [];
      }),
    });
  if (detailed && !prior && publicAttributes.length)
    facets.push({ kind: 'public-attributes', attributes: [...publicAttributes] });
  const values = immutableDataSnapshot(
    {
      location: { kind: 'point' as const, point: pose.position, errorRadius: 0 },
      pose: splitObservedBody((facets[1] as Extract<SensoryFacet, { kind: 'body' }>).body).pose,
      facets,
    },
    readOnlyDraftView,
  );
  if (detailToken && token) {
    const cached = visualSourceValues.get(detailToken) ?? new Map();
    cached.set(detailed, {
      token,
      values,
      details: splitObservedBody((values.facets[1] as Extract<SensoryFacet, { kind: 'body' }>).body)
        .details,
      extra: values.facets.slice(2),
    });
    visualSourceValues.set(detailToken, cached);
  }
  return values;
}
export const observationAcquisitionKey = (
  input: Pick<ObservationContribution, 'modality' | 'detector' | 'origin'>,
): string =>
  JSON.stringify([
    input.modality,
    input.detector.id,
    input.detector.version,
    input.origin.kind === 'occurrence'
      ? ['occurrence', input.origin.eventId, input.origin.at, input.origin.order]
      : [
          'exposure',
          input.origin.episodeId,
          input.origin.detectorId,
          input.origin.measuredFrom,
          input.origin.measuredThrough,
        ],
  ]);
export function perceptionEvidenceOwner(
  world: WorldState,
  observer: Entity,
): PerceptionEvidenceOwner {
  touchNativeEvidence(world, 'perception', observer.id);
  const states = (world.perceptionEvidence ??= {});
  let state = states[observer.id];
  const life = observer.actor?.physicalLife ?? 0;
  if (!state || state.life !== life)
    state = states[observer.id] = {
      life,
      receivedAtSequence: world.sequence,
      received: [],
      originals: {},
      receipts: {},
      current: {},
      gaps: {},
    };
  if (state.receivedAtSequence !== world.sequence) {
    const retired = new Set(state.received);
    state.received = [];
    state.receipts = {};
    state.receivedAtSequence = world.sequence;
    prunePerceptionOriginals(state, retired);
  }
  return state;
}
/** Transient reception lasts through its actual receiving phase. A later native
 * phase cannot turn an old sound into permanent awareness for a memoryless actor. */
export function beginPerceptionPhase(world: WorldState, observerId: string): void {
  expireReceivedGeometryMotion(world, observerId);
  const state = world.perceptionEvidence?.[observerId];
  if (state?.motionSamples && (state.motionExpiresAt ?? Infinity) <= world.simTime) {
    retireCurrentMotion(
      world,
      observerId,
      Object.entries(state.motionSamples)
        .filter(([, motion]) => motion.expiresAt <= world.simTime)
        .map(([id]) => id),
    );
  }
  if (
    !state?.received.length ||
    receivedPerceptionObservations(state).every(
      (observation) => receivedObservationHeader(world, observation).acquiredAt >= world.simTime,
    )
  )
    return;
  touchNativeEvidence(world, 'perception', observerId);
  const retired = new Set(state.received);
  state.received = state.received.filter(
    (reference) =>
      receivedObservationHeader(world, currentOriginal(state, reference)).acquiredAt >=
      world.simTime,
  );
  state.receipts = Object.fromEntries(
    receivedPerceptionObservations(state).map((observation, index) => [
      observationAcquisitionKey({
        ...receivedObservationHeader(world, observation),
        origin: observation.origin,
      }),
      index,
    ]),
  );
  state.receivedAtSequence = world.sequence;
  prunePerceptionOriginals(state, retired);
}
const owner = perceptionEvidenceOwner;
/** A working phase owns this map after its first write. Replacing its container
 * once avoids drafting every changed key; publication and private forks still
 * seal independent snapshots through the existing world owner. */
function writableCurrent(
  world: WorldState,
  state: PerceptionEvidenceOwner,
  observerId: string,
): PerceptionEvidenceOwner['current'] {
  countDomainWork('currentFacetWrites');
  touchNativeEvidence(world, 'perception', observerId);
  const current = state.current;
  if (isDraft(current)) {
    countDomainWork('currentFacetMapCopies');
    const view = readOnlyDraftView(current);
    // Editable input worlds still need Immer's child isolation. Published
    // immutable leases can bypass those proxies without exposing prior writes.
    state.current = { ...(isImmutableData(view) ? view : current) };
    trackOwnedCurrentMap(world, state.current);
  } else if (Object.isFrozen(current)) {
    countDomainWork('currentFacetMapCopies');
    state.current = { ...current };
    trackOwnedCurrentMap(world, state.current);
  }
  return state.current;
}
const currentOriginalBatches = new WeakMap<PerceptionEvidenceOwner, Set<string>>();
const unavailableCurrent = new WeakMap<PerceptionEvidenceOwner, LiveFacetSupport[]>();
function withCurrentOriginalBatch<T>(
  world: WorldState,
  observerId: string,
  state: PerceptionEvidenceOwner,
  work: () => T,
): T {
  if (currentOriginalBatches.has(state)) return work();
  const observer = entityGet(world.entities, observerId);
  const frame = observer
    ? {
        positionAtObservation: worldPosition(observer),
        forwardAtObservation: observer.spatial.heading,
      }
    : undefined;
  return withTemporalAcquisition(world, observerId, frame, () => {
    const retired = new Set<string>();
    currentOriginalBatches.set(state, retired);
    unavailableCurrent.set(state, []);
    try {
      return work();
    } finally {
      const unavailable = unavailableCurrent.get(state)!;
      unavailableCurrent.delete(state);
      if (unavailable.length)
        captureTemporalAvailability(
          world,
          observerId,
          unavailable,
          selectedTemporalPolicy(world).recent,
        );
      currentOriginalBatches.delete(state);
      retireCurrentOriginals(state, retired);
    }
  });
}
function retireCurrentOriginals(
  state: PerceptionEvidenceOwner,
  references: Iterable<string>,
): void {
  const retired = references instanceof Set ? references : new Set(references);
  if (!retired.size) return;
  const batch = currentOriginalBatches.get(state);
  if (batch) {
    for (const reference of retired) batch.add(reference);
    return;
  }
  prunePerceptionOriginals(state, retired);
  if (Object.keys(readOnlyDraftView(state.current)).length === 0) delete state.observer;
}
export function pruneCurrentOriginals(
  world: WorldState,
  observerId: string,
  references: Iterable<string>,
): void {
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  touchNativeEvidence(world, 'perception', observerId);
  retireCurrentOriginals(state, references);
}
export function removeCurrentFacets(
  world: WorldState,
  observerId: string,
  keys: Iterable<string>,
  retiredOriginals: Iterable<string> = [],
): void {
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  const retired = new Set(retiredOriginals),
    retiredMotion = new Set<string>();
  for (const key of keys) {
    const previous = readOnlyDraftView(state.current)[key];
    if (!previous) continue;
    const body = readOnlyDraftView(state.current)[`${previous.subjectId}:body`];
    // A later real check must fill a removed field even when its physical source
    // is unchanged. This token only proves a complete prior acquisition.
    if (body) measuredSources.delete(currentFacetOriginal(state, body));
    retired.add(previous.original);
    if (
      (previous.value.kind === 'body' || previous.value.kind === 'location') &&
      state.motionSamples?.[previous.subjectId]
    ) {
      retiredMotion.add(previous.subjectId);
    }
    delete writableCurrent(world, state, observerId)[key];
  }
  retireCurrentMotion(world, observerId, retiredMotion);
  retireCurrentOriginals(state, retired);
}
/** Completed live envelopes use the same immutable ownership as their originals.
 * Later native changes replace the envelope; raw world builders stay editable. */
function replaceCurrentFacet(
  world: WorldState,
  state: PerceptionEvidenceOwner,
  key: string,
  value: (
    | Omit<LiveFacetSupport, 'value'>
    | (Omit<CurrentFacetRecord, 'value'> & {
        observer?: never;
        valueMeasuredFrom?: never;
        valueMeasuredThrough?: never;
        valueAcquiredAt?: never;
      })
  ) & { value: SensoryFacet | ReceivedFacetValue },
): void {
  let storedValue: ReceivedFacetValue;
  if ('reference' in value.value) storedValue = value.value;
  else {
    const retained = retainFacetValue(
      world,
      value.value,
      readOnlyDraftView(state.current)[key]?.value,
    );
    if (retained.addedBytes) chargeWork({ outputBytes: retained.addedBytes });
    storedValue = retained.value;
  }
  const prior = readOnlyDraftView(state.current)[key];
  const compact =
    typeof value.original === 'string'
      ? ({ ...value, value: storedValue } as CurrentFacetRecord)
      : compactCurrentFacet(state, { ...value, value: storedValue } as LiveFacetSupport);
  writableCurrent(world, state, currentFacetObserver(state).actorId)[key] =
    isDraft(world) && Object.isFrozen(draftOriginal(world)!)
      ? immutableDataSnapshot(compact, readOnlyDraftView)
      : compact;
  if (prior && prior.original !== compact.original) retireCurrentOriginals(state, [prior.original]);
}
const observationFactKeys = new WeakMap<
  object,
  { observer: ObserverLife; keys: Map<number, ObservationFactKey> }
>();
export function contributionFactKey(
  observation: Pick<ObservationContribution, 'id' | 'revision' | 'observer'>,
  ordinal: number,
): ObservationFactKey {
  return immutableDataSnapshot(
    {
      source: {
        family: 'native-exposure' as const,
        observer: observation.observer,
        id: observation.id,
        revision: observation.revision,
      },
      ordinal,
    },
    readOnlyDraftView,
  );
}
export function observationFactKey(
  world: WorldState,
  observation:
    | Pick<ObservationContribution, 'id' | 'revision' | 'observer'>
    | Pick<ReceivedObservation, 'id' | 'revision' | 'headerRef'>,
  ordinal: number,
): ObservationFactKey {
  observation = readOnlyDraftView(observation);
  // Resolve the actual header before reuse: a remembered address never revives
  // missing received evidence. Only the original's own finite facets are cached.
  const observer = readOnlyDraftView(
    'headerRef' in observation
      ? receivedObservationHeader(world, observation).observer
      : observation.observer,
  );
  const facets = (observation as { facets?: unknown[] }).facets;
  const reusable =
    isImmutableData(observation) &&
    isImmutableData(observer) &&
    Array.isArray(facets) &&
    Number.isInteger(ordinal) &&
    ordinal >= 0 &&
    ordinal < facets.length;
  let held = reusable ? observationFactKeys.get(observation) : undefined;
  const previous = held?.observer === observer ? held.keys.get(ordinal) : undefined;
  if (previous) return previous;
  const key = contributionFactKey(
    { id: observation.id, revision: observation.revision, observer },
    ordinal,
  );
  if (reusable) {
    if (!held || held.observer !== observer)
      observationFactKeys.set(observation, (held = { observer, keys: new Map() }));
    held.keys.set(ordinal, key);
  }
  return key;
}

/** Trusted producers pass an already-permitted body. No source lookup strengthens it here.
 * The transition's actual receipts survive nested event callbacks. Durable memory owns its
 * contribution afterward; active exposure is not a second lifetime history database.
 * docs/projects/perspective-perception-tech-design.md#three-representations-one-observation */
type ObservationInput = Omit<
  ObservationContribution,
  'id' | 'revision' | 'observer' | 'acquiredAt' | 'facets'
> & {
  facets: Array<
    Omit<ObservationFacet, 'ordinal' | 'acquiredAt'> & {
      acquiredAt?: number;
      preparedPose?: ObservedBodyPose;
    }
  >;
};
function receivedEndpointInput(input: ObservationInput): ObservationInput {
  if (!input.facets.some((facet) => facet.value.kind === 'observed-motion')) return input;
  return {
    ...input,
    facets: input.facets.flatMap<ObservationInput['facets'][number]>((facet) =>
      facet.value.kind === 'observed-motion'
        ? [facet.value.earlier, facet.value.later].map((sample) => ({
            role: facet.role,
            asOf: sample.measuredThrough,
            measuredFrom: sample.measuredFrom,
            measuredThrough: sample.measuredThrough,
            acquiredAt: sample.acquiredAt,
            support: {
              original: sample.original,
              confirmation: sample.confirmation,
              confirmedFrom: sample.confirmedFrom,
              confirmedThrough: sample.confirmedThrough,
              ...(sample.aliases ? { aliases: sample.aliases } : {}),
            },
            value: { kind: 'location' as const, location: sample.location, frame: sample.frame },
          }))
        : [facet],
    ),
  };
}

function acquireReceivedObservation(
  world: WorldState,
  observer: Entity,
  input: ObservationInput,
): ReceivedObservation {
  input = receivedEndpointInput(input);
  const state = owner(world, observer),
    key = observationAcquisitionKey(input),
    index = state.receipts[key],
    prior = index === undefined ? undefined : state.received[index];
  if (prior) return currentOriginal(state, prior);
  const from = input.origin.kind === 'exposure' ? input.origin.measuredFrom : input.origin.at,
    through = input.origin.kind === 'exposure' ? input.origin.measuredThrough : input.origin.at;
  const header = retainReceivedValue(
    world,
    immutableDataSnapshot(
      {
        kind: 'observation-header' as const,
        header: {
          observer: observerLife(observer),
          acquiredAt: world.simTime,
          modality: input.modality,
          detector: input.detector,
        },
      },
      readOnlyDraftView,
    ),
    selectedTemporalPolicy(world).recent.chunkBytes,
  );
  let addedBytes = header.addedBytes;
  const contribution = immutableDataSnapshot<ReceivedObservation>(
    {
      id: nextId(world, 'perception-observation'),
      revision: 1,
      headerRef: [header.reference.blockId, header.reference.valueOrdinal],
      origin: input.origin,
      ...(input.context ? { context: input.context } : {}),
      facets: input.facets.map((facet) => {
        const retained = retainFacetValue(world, facet.value, undefined, facet.preparedPose);
        addedBytes += retained.addedBytes;
        return {
          ...(facet.support ? { support: facet.support } : {}),
          ...(facet.role !== 'direct' ? { role: facet.role } : {}),
          ...(facet.asOf !== facet.measuredThrough ? { asOf: facet.asOf } : {}),
          ...(facet.measuredFrom !== from ? { measuredFrom: facet.measuredFrom } : {}),
          ...(facet.measuredThrough !== through ? { measuredThrough: facet.measuredThrough } : {}),
          ...(facet.acquiredAt !== undefined && facet.acquiredAt !== world.simTime
            ? { acquiredAt: facet.acquiredAt }
            : {}),
          value: retained.value,
        };
      }),
    },
    readOnlyDraftView,
  );
  // Every receiver pays for its actual personal descriptor. A payload shared
  // by exact value is produced once; full retained accounts keep their own
  // complete logical quota charges at their admission owner.
  chargeWork({ effects: 1, outputBytes: jsonEncoding(contribution).bytes + addedBytes });
  state.receipts[key] = state.received.length;
  state.received.push(retainPerceptionOriginal(state, contribution));
  return contribution;
}

/** Semantic accounts own a complete immutable proof. Routine native current
 * reception uses the compact constructor above instead of expanding every pair. */
export function acquireObservation(
  world: WorldState,
  observer: Entity,
  input: ObservationInput,
): ObservationContribution {
  input = receivedEndpointInput(input);
  const existing = owner(world, observer).receipts[observationAcquisitionKey(input)] !== undefined;
  const source = acquireReceivedObservation(world, observer, input);
  const complete = materializeObservation(world, source);
  if (!existing) chargeWork({ outputBytes: jsonEncoding(complete).bytes });
  return complete;
}

/** Old originals may remain after body replacement until the next native phase.
 * Current reception belongs only to the actual observer life; hearing needs no
 * visual sense or lasting-memory capability. Historical accounts stay separate. */
export function currentReceivedObservationSources(
  world: WorldState,
  observerId: string,
): { physicalLife: number; observations: readonly ReceivedObservation[] } {
  const observer = entityGet(readOnlyDraftView(world.entities), observerId);
  const physicalLife = observer?.actor?.physicalLife ?? 0;
  const owners = readOnlyDraftView(world).perceptionEvidence;
  const stored = owners && readOnlyDraftView(owners)[observerId];
  const state = stored && readOnlyDraftView(stored);
  return {
    physicalLife,
    observations:
      observer?.actor && state?.life === physicalLife ? receivedPerceptionObservations(state) : [],
  };
}
/** Complete cuts expand only after selecting the receiver's current sources.
 * The borrowed source reader above is synchronous metadata, never a disclosure. */
export function currentReceivedObservations(
  world: WorldState,
  observerId: string,
): { physicalLife: number; observations: readonly ObservationContribution[] } {
  const current = currentReceivedObservationSources(world, observerId);
  return {
    physicalLife: current.physicalLife,
    observations: current.observations.map((source) => materializeObservation(world, source)),
  };
}

/** Capture-only: callers may supply retained source-owned support prepared before this cut.
 * No sight query, source hydration, ID allocation or timestamp-based history reconstruction. */
export function captureEvidenceCut(
  world: WorldState,
  observerId: string,
  retained: readonly ObservationContribution[] = [],
): EvidenceCut {
  const entity = entityGet(world.entities, observerId);
  if (!entity?.actor) throw new Error('An evidence cut requires an existing observer.');
  const life = observerLife(entity);
  const state = world.perceptionEvidence?.[observerId];
  const leases =
    state?.life === life.physicalLife &&
    entity.actor.alive &&
    activelyParticipates(entity) &&
    !capabilityBlocked(world, entity, 'perception')
      ? Object.values(state.current).filter((lease) =>
          currentLeaseEligible(world, observerId, lease),
        )
      : [];
  const current = leases.map((lease) =>
    captureCurrentFacet(world, effectiveCurrentFacetSupport(world, observerId, lease)),
  );
  if (state?.motionSamples)
    for (const subjectId of Object.keys(state.motionSamples)) {
      const motion = currentMotionFacet(world, observerId, subjectId);
      if (motion) current.push(motion);
    }
  const acquired = new Map<string, ObservationContribution>();
  for (const contribution of [
    ...retained,
    ...currentReceivedObservations(world, observerId).observations,
    ...currentReceivedGeometry(world, observerId).observations,
    ...leases.map((lease) => materializeObservation(world, currentFacetOriginal(state!, lease))),
  ]) {
    if (
      contribution.observer.actorId !== observerId ||
      contribution.observer.physicalLife !== life.physicalLife
    )
      continue;
    acquired.set(`${contribution.id}:${contribution.revision}`, immutableObservation(contribution));
  }
  const lastIncludedOrder = Math.max(
    world.events.at(-1)?.order ?? 0,
    ...[...acquired.values()].map((entry) =>
      entry.origin.kind === 'occurrence' ? entry.origin.order : 0,
    ),
  );
  return freeze(
    {
      observer: life,
      privacyRevision: world.experience?.privacyRevisions?.[observerId] ?? 0,
      at: world.simTime,
      lastIncludedOrder,
      acquired: [...acquired.values()],
      current,
    },
    true,
  );
}
/** Physical loss and later lease advancement do not rewrite a captured result. Only
 * current source revocation/correction or replacement of its receiving life fences it. */
export function evidenceCutEligible(world: WorldState, cut: EvidenceCut): boolean {
  const observer = entityGet(world.entities, cut.observer.actorId);
  if ((world.experience?.privacyRevisions?.[cut.observer.actorId] ?? 0) !== cut.privacyRevision)
    return false;
  if (!observer?.actor || (observer.actor.physicalLife ?? 0) !== cut.observer.physicalLife)
    return false;
  const forgotten = new Set(world.experience?.forgotten[cut.observer.actorId] ?? []);
  const corrections = world.experience?.corrections?.[cut.observer.actorId] ?? {};
  const supported = (observation: ObservationContribution): boolean => {
    const aliases = [
      observation.id,
      ...(observation.origin.kind === 'occurrence' ? [observation.origin.eventId] : []),
      ...(observation.origin.kind === 'exposure' && observation.origin.source
        ? [observation.origin.source.id]
        : []),
    ];
    if (aliases.some((id) => forgotten.has(id) || Object.hasOwn(corrections, id))) return false;
    return observation.facets.every(({ value, ordinal, support }) => {
      if (
        !sensoryFacetDependencies(value, support).every((dependency) =>
          [
            dependency.source.id,
            ...dependency.aliases,
            ...(dependency.ordinal !== null
              ? [personalFactAlias(dependency.source.id, dependency.ordinal)]
              : []),
          ].every((id) => !forgotten.has(id) && !Object.hasOwn(corrections, id)),
        )
      )
        return false;
      if (value.kind === 'observed-motion')
        return [value.earlier, value.later].every((sample) =>
          [
            sample.original.source.id,
            personalFactAlias(sample.original.source.id, sample.original.ordinal),
            sample.confirmation.id,
            ...(sample.aliases ?? []),
          ].every((id) => !forgotten.has(id) && !Object.hasOwn(corrections, id)),
        );
      if (value.kind === 'association')
        return (
          associationEvidenceStatus(world, cut.observer.actorId, value, observation, ordinal) ===
          'retained'
        );
      if (value.kind !== 'claim') return true;
      return [
        ...value.support.map((fact) => fact.source.id),
        ...(value.supportAliases ?? []).map((alias) => alias.id),
      ].every((id) => !forgotten.has(id) && !Object.hasOwn(corrections, id));
    });
  };
  return (
    cut.acquired.every(supported) &&
    cut.current.every((facet) => {
      const ids = [
        facet.original.source.id,
        personalFactAlias(facet.original.source.id, facet.original.ordinal),
        facet.confirmation.id,
        ...(facet.originalAliases ?? []),
        ...[facet.poseSupport, facet.descriptionSupport].flatMap((support) =>
          support
            ? [
                support.original.source.id,
                personalFactAlias(support.original.source.id, support.original.ordinal),
                support.confirmation.id,
                ...(support.aliases ?? []),
              ]
            : [],
        ),
      ];
      if (ids.some((id) => forgotten.has(id) || Object.hasOwn(corrections, id))) return false;
      if (
        facet.value.kind === 'association' &&
        associationEvidenceStatus(
          world,
          cut.observer.actorId,
          facet.value,
          { id: facet.original.source.id },
          facet.original.ordinal,
        ) !== 'retained'
      )
        return false;
      return sensoryFacetDependencies(facet.value).every((dependency) =>
        [
          dependency.source.id,
          ...dependency.aliases,
          ...(dependency.ordinal !== null
            ? [personalFactAlias(dependency.source.id, dependency.ordinal)]
            : []),
        ].every((id) => !forgotten.has(id) && !Object.hasOwn(corrections, id)),
      );
    })
  );
}
/** Fully immutable originals share directly; mutable builder/restored sources must
 * detach their current facts on every read without changing an earlier captured cut. */
function immutableObservation(value: ObservationContribution): ObservationContribution {
  return immutableDataSnapshot(value, readOnlyDraftView);
}
/** Pure evidence readers must not create writable Immer children merely to
 * inspect a held field. Resolve the latest owned containers for this call only. */
function readCurrentEvidence(
  world: WorldState,
  observerId: string,
): PerceptionEvidenceOwner | undefined {
  const owners = readOnlyDraftView(world).perceptionEvidence;
  const owner = owners && readOnlyDraftView(owners)[observerId];
  return owner && readOnlyDraftView(owner);
}
function readCurrentFields(world: WorldState, observerId: string) {
  const state = readCurrentEvidence(world, observerId);
  return state && readOnlyDraftView(state.current);
}
function readReceivedSources(world: WorldState) {
  const received = readOnlyDraftView(world).receivedValues;
  return received ? readOnlyDraftView(received).sources : {};
}
/** The last completed sight sample for this actual observer life. Reading a view
 * cannot advance that measurement or inherit one from a replacement body. */
export function currentSightConfirmedThrough(world: WorldState, observerId: string): number | null {
  const observer = entityGet(readOnlyDraftView(world.entities), observerId),
    actor = observer?.actor && readOnlyDraftView(observer.actor),
    owners = readOnlyDraftView(world).perceptionEvidence,
    stored = owners && readOnlyDraftView(owners)[observerId],
    state = stored && readOnlyDraftView(stored);
  return actor && state?.life === (actor.physicalLife ?? 0)
    ? (state.visualConfirmation?.through ?? null)
    : null;
}
function copyFacetValue(value: SensoryFacet): SensoryFacet {
  // One constructor detaches mutable inputs and shares only proved immutable
  // children, including nested original observations and prior motion samples.
  return immutableDataSnapshot(value, readOnlyDraftView);
}
export function captureReceivedLocationSample(
  world: WorldState,
  lease: LiveFacetSupport,
): ReceivedLocationSample {
  const held = readOnlyDraftView(lease),
    value = receivedFacetValue(world, held.value);
  if (value?.kind !== 'location') throw new Error('A received location sample is required.');
  return immutableDataSnapshot(
    {
      location: value.location,
      frame: value.frame,
      measuredFrom: held.valueMeasuredFrom,
      measuredThrough: held.valueMeasuredThrough,
      acquiredAt: held.valueAcquiredAt,
      confirmedFrom: held.confirmedFrom,
      confirmedThrough: held.confirmedThrough,
      original: observationFactKey(world, held.original, held.originalOrdinal),
      confirmation: {
        family: 'native-exposure' as const,
        observer: held.observer,
        id: held.id,
        revision: held.revision,
      },
      ...(held.original.origin.kind === 'occurrence'
        ? { aliases: [held.original.origin.eventId] }
        : held.original.origin.source
          ? { aliases: [held.original.origin.source.id] }
          : {}),
    },
    readOnlyDraftView,
  );
}

export function captureCurrentFacet(
  world: WorldState,
  lease: LiveFacetSupport,
): CapturedCurrentFacet {
  const {
    subjectId: _subject,
    subjectPhysicalLife: _sourceLife,
    revision,
    motionContinuityRevision: _continuity,
    sourcePlacementRevision: _placement,
    original,
    originalOrdinal,
    value: latest,
    ...fields
  } = readOnlyDraftView(lease);
  const originalValue = receivedFacetValue(world, latest);
  if (!originalValue) throw new Error('Selected current value is unavailable.');
  const value = currentBodyDescription(
    world,
    lease.observer.actorId,
    lease.subjectId,
    originalValue,
  );
  // Rich presentation belongs to the selected read, not every native field check.
  const descriptionSupport =
    originalValue.kind === 'body'
      ? currentDescriptionSupport(world, lease.observer.actorId, lease.subjectId)
      : undefined;
  return immutableDataSnapshot<CapturedCurrentFacet>(
    {
      ...fields,
      ...(descriptionSupport ? { descriptionSupport } : {}),
      original: observationFactKey(world, original, originalOrdinal),
      role: original.facets[originalOrdinal]?.role ?? 'direct',
      ...(original.origin.kind === 'occurrence'
        ? { originalAliases: [original.origin.eventId] }
        : original.origin.source
          ? { originalAliases: [original.origin.source.id] }
          : {}),
      value,
      confirmation: {
        family: 'native-exposure' as const,
        observer: lease.observer,
        id: lease.id,
        revision,
      },
    },
    readOnlyDraftView,
  );
}

/** Read the last actually completed sight phase without mutating every held value.
 * A missing facet cannot be revived, and inferred identity never gets a new value time. */
function currentFacetConfirmation(
  state: PerceptionEvidenceOwner,
  value: CurrentFacetRecord,
  confirmedThrough: number,
  presenceOnly = false,
) {
  const completed = state.visualConfirmation;
  const phase = completed && readOnlyDraftView(completed);
  const selected = phase?.subjects && readOnlyDraftView(phase.subjects)[value.subjectId];
  const rich =
    !presenceOnly &&
    ['description', 'carried', 'pile-contents', 'public-attributes'].includes(value.value.kind);
  const confirmation = rich
    ? selected?.detail
    : phase && {
        through: selected?.through ?? phase.completeThrough,
        revision: selected?.revision ?? phase.completeRevision,
        inputRevision: selected?.inputRevision ?? phase.completeInputRevision,
      };
  if (
    value.modality !== 'sight' ||
    !confirmation ||
    state.observer?.physicalLife !== state.life ||
    ![
      'detected',
      'body',
      'description',
      'carried',
      'pile-contents',
      'public-attributes',
      'association',
      'location',
    ].includes(value.value.kind) ||
    confirmation.through < confirmedThrough
  )
    return;
  return confirmation;
}
export function effectiveCurrentFacetTimes(
  world: WorldState,
  observerId: string,
  lease: CurrentFacetRecord,
): ReturnType<typeof currentFacetTimes> {
  const state = readOnlyDraftView(readCurrentEvidence(world, observerId)!);
  const value = readOnlyDraftView(lease),
    times = currentFacetTimes(state, value);
  const confirmation = currentFacetConfirmation(state, value, times.confirmedThrough);
  if (!confirmation) return times;
  const through = confirmation.through;
  return {
    ...times,
    confirmedThrough: through,
  };
}
export function effectiveCurrentFacetDescriptor(
  world: WorldState,
  observerId: string,
  lease: CurrentFacetRecord,
): ReceivedFacetValue {
  const record = readOnlyDraftView(lease);
  if (record.value.kind === 'body') {
    const location = readCurrentFields(world, observerId)?.[`${record.subjectId}:location`];
    const descriptor = location && readOnlyDraftView(location).value;
    const value =
      descriptor &&
      receivedValueAt(readReceivedSources(world), {
        blockId: descriptor.reference[0],
        valueOrdinal: descriptor.reference[1],
      });
    if (value?.kind === 'body-pose')
      return { ...record.value, reception: { kind: 'body', poseRef: descriptor!.reference } };
  }
  return record.value;
}
/** A current reader selects the actual pose owner separately from appearance. */
export function currentBodyPoseSupport(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CurrentBodyPoseSupport | undefined {
  return eligibleBodyLease(world, observerId, subjectId)
    ? lastBodyPoseSupport(world, observerId, subjectId)
    : undefined;
}
/** Closing a withdrawn grant still needs the last actually received pose and its
 * own times. This private read grants no current body or fresh measurement. */
function lastBodyPoseSupport(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CurrentBodyPoseSupport | undefined {
  const state = readCurrentEvidence(world, observerId),
    location = readCurrentFields(world, observerId)?.[`${subjectId}:location`];
  if (!state || !location) return;
  const record = readOnlyDraftView(location),
    fragment = receivedValueAt(readReceivedSources(world), {
      blockId: record.value.reference[0],
      valueOrdinal: record.value.reference[1],
    });
  if (fragment?.kind !== 'body-pose' || record.value.reception?.kind !== 'location') return;
  const times = effectiveCurrentFacetTimes(world, observerId, record),
    confirmation = currentFacetConfirmation(
      state,
      record,
      currentFacetTimes(state, record).confirmedThrough,
    );
  return {
    frame: receivedObservationFrame(world, record.value.reception.frameRef),
    poseMeasuredFrom: times.valueMeasuredFrom,
    poseMeasuredThrough: times.valueMeasuredThrough,
    poseAcquiredAt: times.valueAcquiredAt,
    original: observationFactKey(
      world,
      currentFacetOriginal(state, record),
      record.originalOrdinal,
    ),
    confirmation: {
      family: 'native-exposure',
      observer: currentFacetObserver(state),
      id: record.id,
      revision: Math.max(record.revision, confirmation?.revision ?? 0),
    },
    confirmedFrom: times.confirmedFrom,
    confirmedThrough: times.confirmedThrough,
  };
}
export function currentDescriptionSupport(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CurrentDescriptionSupport | undefined {
  const state = readCurrentEvidence(world, observerId),
    stored = readCurrentFields(world, observerId)?.[`${subjectId}:description`];
  if (!state || !stored || !currentLeaseEligible(world, observerId, stored)) return;
  const record = readOnlyDraftView(stored),
    times = effectiveCurrentFacetTimes(world, observerId, record),
    confirmation = currentFacetConfirmation(
      state,
      record,
      currentFacetTimes(state, record).confirmedThrough,
    );
  return {
    descriptionMeasuredFrom: times.valueMeasuredFrom,
    descriptionMeasuredThrough: times.valueMeasuredThrough,
    descriptionAcquiredAt: times.valueAcquiredAt,
    original: observationFactKey(
      world,
      currentFacetOriginal(state, record),
      record.originalOrdinal,
    ),
    confirmation: {
      family: 'native-exposure',
      observer: currentFacetObserver(state),
      id: record.id,
      revision: Math.max(record.revision, confirmation?.revision ?? 0),
    },
    confirmedFrom: times.confirmedFrom,
    confirmedThrough: times.confirmedThrough,
  };
}
function currentBodyDescription(
  world: WorldState,
  observerId: string,
  subjectId: string,
  value: SensoryFacet,
): SensoryFacet {
  if (value.kind !== 'body') return value;
  const record = readCurrentFields(world, observerId)?.[`${subjectId}:description`];
  const description = record && receivedFacetValue(world, readOnlyDraftView(record).value);
  return description?.kind === 'description' && currentLeaseEligible(world, observerId, record!)
    ? { ...value, body: { ...value.body, description: description.text } }
    : value;
}
export function effectiveCurrentFacetSupport(
  world: WorldState,
  observerId: string,
  lease: CurrentFacetRecord,
): LiveFacetSupport {
  const state = readOnlyDraftView(readCurrentEvidence(world, observerId)!);
  const record = readOnlyDraftView(lease),
    value = currentFacetSupport(state, record);
  const descriptor = effectiveCurrentFacetDescriptor(world, observerId, record),
    poseSupport =
      record.value.kind === 'body'
        ? lastBodyPoseSupport(world, observerId, record.subjectId)
        : undefined;
  const current =
    descriptor === record.value && !poseSupport
      ? value
      : { ...value, value: descriptor, ...(poseSupport ? { poseSupport } : {}) };
  const confirmation = currentFacetConfirmation(state, record, value.confirmedThrough);
  if (!confirmation) return current;
  const through = confirmation.through;
  return {
    ...current,
    revision: Math.max(value.revision, confirmation.revision),
    confirmedThrough: through,
  };
}

export function currentBodyObservation(
  world: WorldState,
  observerId: string,
  subjectId: string,
): (CapturedCurrentFacet & { value: Extract<SensoryFacet, { kind: 'body' }> }) | undefined {
  const lease = eligibleBodyLease(world, observerId, subjectId);
  return lease
    ? (captureCurrentFacet(
        world,
        effectiveCurrentFacetSupport(world, observerId, lease),
      ) as CapturedCurrentFacet & {
        value: Extract<SensoryFacet, { kind: 'body' }>;
      })
    : undefined;
}

/** Present body values do not require copying their complete historical proof.
 * Keep the same live-body eligibility as captured evidence and reference grants. */
export function currentBodyValue(
  world: WorldState,
  observerId: string,
  subjectId: string,
): (CurrentFacetValue & { value: Extract<SensoryFacet, { kind: 'body' }> }) | undefined {
  const lease = eligibleBodyLease(world, observerId, subjectId);
  return lease
    ? (projectCurrentFacetValue(world, observerId, lease) as CurrentFacetValue & {
        value: Extract<SensoryFacet, { kind: 'body' }>;
      })
    : undefined;
}
function bodyReadScope(world: WorldState, observerId: string) {
  const state = readCurrentEvidence(world, observerId),
    entities = readOnlyDraftView(world.entities),
    observer = entityGet(entities, observerId);
  if (
    !observer?.actor?.alive ||
    !activelyParticipates(observer) ||
    capabilityBlocked(world, observer, 'perception') ||
    !sensesFor(world, observer).some((sense) => sense.implementation === 'vision-geometry-v1') ||
    state?.life !== (observer.actor.physicalLife ?? 0)
  )
    return;
  const current = readOnlyDraftView(state.current);
  // This reader exists only for one synchronous batch. It never grants later
  // execution and no draft/current record leaves the owned projection below.
  // docs/memory-architecture.md#private-retrieval-fencing
  return {
    current,
    body(subjectId: string): CurrentFacetRecord | undefined {
      const stored = current[`${subjectId}:body`],
        lease = stored && readOnlyDraftView(stored),
        subject = entityGet(entities, subjectId);
      const pending = readOnlyDraftView(world).sensory;
      const invalidated = Math.max(
        pending?.invalidatedRevision ?? -1,
        pending?.scopes[observerId]?.invalidatedRevision ?? -1,
        pending?.scopes[subjectId]?.invalidatedRevision ?? -1,
      );
      const confirmed =
        lease &&
        currentFacetConfirmation(
          state,
          lease,
          currentFacetTimes(state, lease).confirmedThrough,
          true,
        );
      return lease &&
        (confirmed?.inputRevision ?? -1) >= invalidated &&
        lease.value.kind === 'body' &&
        activelyParticipates(subject) &&
        lease.subjectPhysicalLife === (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)
        ? lease
        : undefined;
    },
  };
}
function eligibleBodyLease(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CurrentFacetRecord | undefined {
  return bodyReadScope(world, observerId)?.body(subjectId);
}
/** Eligible current bodies, without copying their retained fact payloads. */
export function currentObservedBodyIds(world: WorldState, observerId: string): string[] {
  const scope = bodyReadScope(world, observerId);
  if (!scope) return [];
  const ids: string[] = [];
  for (const held of Object.values(scope.current)) {
    const lease = readOnlyDraftView(held);
    if (
      lease.value.kind === 'body' &&
      lease.subjectId !== observerId &&
      scope.body(lease.subjectId)
    )
      ids.push(lease.subjectId);
  }
  return ids;
}
function refreshMotionExpiry(state: PerceptionEvidenceOwner): void {
  let next = Infinity;
  for (const motion of Object.values(state.motionSamples ?? {}))
    next = Math.min(next, motion.expiresAt);
  if (Number.isFinite(next)) state.motionExpiresAt = next;
  else delete state.motionExpiresAt;
}
/** Every end of a received motion interval changes relation inputs, including
 * an unchanged-source sample before its expiry. No caller may only erase data. */
function retireCurrentMotion(
  world: WorldState,
  observerId: string,
  subjects: Iterable<string>,
): boolean {
  const state = world.perceptionEvidence?.[observerId];
  if (!state?.motionSamples) return false;
  let changed = false;
  for (const id of subjects)
    if (state.motionSamples[id]) {
      if (!changed) touchNativeEvidence(world, 'perception', observerId);
      changed = true;
      delete state.motionSamples[id];
    }
  if (changed) {
    refreshMotionExpiry(state);
    markAttentionRelationsDirty(world, observerId);
  }
  return changed;
}
export function revokeCurrentMotionEvidence(
  world: WorldState,
  observerId: string,
  sources: ReadonlySet<string>,
): void {
  const state = world.perceptionEvidence?.[observerId];
  if (!state?.motionSamples) return;
  const retired = new Set<string>();
  for (const [subjectId, track] of Object.entries(state.motionSamples)) {
    const sample = track.earlier;
    if (
      [
        sample.original.source.id,
        personalFactAlias(sample.original.source.id, sample.original.ordinal),
        sample.confirmation.id,
        ...(sample.aliases ?? []),
      ].some((id) => sources.has(id))
    ) {
      retired.add(subjectId);
    }
  }
  retireCurrentMotion(world, observerId, retired);
}
function currentMotionValue(
  world: WorldState,
  observerId: string,
  subjectId: string,
): Extract<SensoryFacet, { kind: 'observed-motion' }> | undefined {
  const state = readCurrentEvidence(world, observerId),
    track = state?.motionSamples?.[subjectId];
  if (
    !state ||
    !track ||
    world.simTime >= track.expiresAt ||
    !eligibleBodyLease(world, observerId, subjectId)
  )
    return;
  const location = readOnlyDraftView(state.current)[`${subjectId}:location`];
  if (
    !location ||
    (location.motionContinuityRevision ?? 0) !== track.continuityRevision ||
    currentFacetTimes(state, location).valueMeasuredThrough !== track.through ||
    !currentLeaseEligible(world, observerId, location)
  )
    return;
  const earlierValue = receivedFacetValue(world, track.earlier.value);
  if (earlierValue?.kind !== 'location') return;
  const { value: _value, ...earlierProof } = track.earlier;
  const earlier: ReceivedLocationSample = {
    ...earlierProof,
    location: earlierValue.location,
    frame: earlierValue.frame,
  };
  const later = captureReceivedLocationSample(
    world,
    effectiveCurrentFacetSupport(world, observerId, location),
  );
  const value: Extract<SensoryFacet, { kind: 'observed-motion' }> = {
    kind: 'observed-motion',
    exposure: currentFacetExposure(state, location),
    earlier,
    later,
    correspondence: 'unambiguous-received-continuity',
  };
  const forgotten = world.experience?.forgotten[observerId] ?? [],
    corrections = world.experience?.corrections?.[observerId] ?? {};
  if (
    sensoryFacetDependencies(value).some((dependency) =>
      [
        dependency.source.id,
        ...dependency.aliases,
        ...(dependency.ordinal === null
          ? []
          : [personalFactAlias(dependency.source.id, dependency.ordinal)]),
      ].some((id) => forgotten.includes(id) || Object.hasOwn(corrections, id)),
    )
  )
    return;
  return value;
}
function currentMotionFacet(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CapturedCurrentFacet | undefined {
  const value = currentMotionValue(world, observerId, subjectId),
    state = readCurrentEvidence(world, observerId),
    location = readCurrentFields(world, observerId)?.[`${subjectId}:location`];
  if (!value || !location) return;
  const latest = captureCurrentFacet(
    world,
    effectiveCurrentFacetSupport(world, observerId, location),
  );
  return immutableDataSnapshot(
    {
      ...latest,
      id: JSON.stringify([latest.id, 'observed-motion']),
      value,
      valueMeasuredFrom: value.earlier.measuredFrom,
      valueMeasuredThrough: value.later.measuredThrough,
      valueAcquiredAt: value.later.acquiredAt,
    },
    readOnlyDraftView,
  );
}
/** Owned values for the current scene, sharing observer checks within this
 * synchronous read only. Full event/cognition cuts retain their existing owner. */
export function currentBodyGeometryInputs(
  world: WorldState,
  observerId: string,
): CurrentBodyGeometryInput[] {
  const scope = bodyReadScope(world, observerId);
  if (!scope) return [];
  const result: CurrentBodyGeometryInput[] = [];
  const state = readCurrentEvidence(world, observerId)!;
  const interval = (lease: CurrentFacetRecord): BodyGeometrySample => {
    const times = effectiveCurrentFacetTimes(world, observerId, lease);
    const point =
      lease.value.kind === 'location' ? lease : scope.current[`${lease.subjectId}:location`];
    const pointTimes = point && effectiveCurrentFacetTimes(world, observerId, point);
    const source = entityGet(readOnlyDraftView(world.entities), lease.subjectId);
    const unchangedPoint = point && point.sourcePlacementRevision === source?.placement?.revision;
    return {
      valueMeasuredFrom: times.valueMeasuredFrom,
      valueMeasuredThrough: times.valueMeasuredThrough,
      valueSupportedFrom: Math.max(
        times.valueMeasuredFrom,
        pointTimes?.valueMeasuredFrom ?? times.valueMeasuredFrom,
      ),
      valueSupportedThrough: unchangedPoint
        ? world.simTime
        : Math.max(
            times.valueMeasuredThrough,
            pointTimes?.confirmedThrough ?? times.confirmedThrough,
          ),
      fact: observationFactKey(world, currentFacetOriginal(state, lease), lease.originalOrdinal),
    };
  };
  const locationSample = (sample: ReceivedLocationSample): LocationGeometrySample => ({
    valueMeasuredFrom: sample.measuredFrom,
    valueMeasuredThrough: sample.measuredThrough,
    valueSupportedFrom: sample.measuredFrom,
    valueSupportedThrough: sample.confirmedThrough,
    fact: sample.original,
    location: cloneValue(sample.location),
  });
  for (const stored of Object.values(scope.current)) {
    const lease = readOnlyDraftView(stored);
    if (lease.value.kind !== 'body' || lease.subjectId === observerId) continue;
    const admitted = scope.body(lease.subjectId);
    if (!admitted || admitted.value.kind !== 'body') continue;
    const parts = receivedBodyParts(
      world,
      effectiveCurrentFacetDescriptor(world, observerId, admitted),
    );
    if (!parts) continue;
    const location = scope.current[`${lease.subjectId}:location`];
    const pointValue = location && receivedFacetValue(world, readOnlyDraftView(location).value);
    if (pointValue?.kind !== 'location' || !currentLeaseEligible(world, observerId, location!))
      continue;
    const motion = currentMotionValue(world, observerId, lease.subjectId);
    result.push({
      sourceId: lease.subjectId,
      exposure: lease.exposure,
      body: {
        position: cloneValue(parts.pose.position),
        radius: parts.details.radius,
        height: parts.details.height,
      },
      sample: interval(admitted),
      ...(pointValue?.kind === 'location'
        ? {
            location: {
              ...interval(location!),
              location: cloneValue(pointValue.location),
            },
          }
        : {}),
      ...(motion?.kind === 'observed-motion'
        ? {
            motion: {
              earlier: locationSample(motion.earlier),
              later: locationSample(motion.later),
            },
          }
        : {}),
    });
  }
  return result;
}
/** Small exact role proof for server reference binding, without copying historical bodies. */
export function currentBodyGrant(
  world: WorldState,
  observerId: string,
  subjectId: string,
): { leaseId: string; physicalLife: number | null } | undefined {
  const lease = eligibleBodyLease(world, observerId, subjectId);
  return lease && { leaseId: lease.id, physicalLife: lease.subjectPhysicalLife };
}

/** A name may label this body only when an actually received association bound its
 * exact lease. Remembering a canonical acquaintance alone does not recognize a body. */
export function currentBodyAssociation(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject | undefined {
  const stored = readCurrentEvidence(world, observerId)?.current;
  const held = stored && readOnlyDraftView(stored)[`${subjectId}:association`];
  const association = held && readOnlyDraftView(held);
  if (association?.value.kind !== 'association') return;
  const body = eligibleBodyLease(world, observerId, subjectId);
  const subject = receivedBodyAssociation(world, observerId, body, association);
  return subject && cloneValue(subject);
}
function receivedBodyAssociation(
  world: WorldState,
  observerId: string,
  body: CurrentFacetRecord | undefined,
  association: CurrentFacetRecord | undefined,
): ObserverSubject | undefined {
  const value = association && receivedFacetValue(world, association.value);
  return body &&
    association &&
    value?.kind === 'association' &&
    value.strength === 'supported' &&
    association.bodyLeaseId === body.id &&
    associationEvidenceStatus(
      world,
      observerId,
      value,
      currentFacetOriginal(world.perceptionEvidence![observerId]!, association),
      association.originalOrdinal,
    ) === 'retained'
    ? value.subject
    : undefined;
}
/** Reuse observer/life/sense admission for one synchronous candidate pass. This
 * reader grants neither later execution nor access after the world changes. */
export function prepareCurrentBodySubjects(
  world: WorldState,
  observerId: string,
): (subjectId: string) => ObserverSubject | undefined {
  const scope = bodyReadScope(world, observerId);
  return (subjectId) => {
    if (!scope) return;
    const body = scope.body(subjectId);
    if (!body) return;
    const held = scope.current[`${subjectId}:association`];
    const association = held && readOnlyDraftView(held);
    const subject =
      receivedBodyAssociation(world, observerId, body, association) ?? body.localSubject;
    return subject && cloneValue(subject);
  };
}
export function associationEvidenceStatus(
  world: WorldState,
  observerId: string,
  value: Extract<SensoryFacet, { kind: 'association' }>,
  original?: Pick<ObservationContribution, 'id'>,
  ordinal?: number,
): 'retained' | 'disputed' | 'forgotten' {
  const keys = value.learningSupport ?? [];
  const aliases = [
    ...keys,
    ...selectedRecognitionSupportSourceIds(world, keys),
    ...(original && ordinal !== undefined ? [personalFactAlias(original.id, ordinal)] : []),
  ];
  if (aliases.some((id) => world.experience?.forgotten[observerId]?.includes(id)))
    return 'forgotten';
  return aliases.some((id) => Object.hasOwn(world.experience?.corrections?.[observerId] ?? {}, id))
    ? 'disputed'
    : 'retained';
}
export function currentBodyLocalSubject(
  world: WorldState,
  observerId: string,
  subjectId: string,
): ObserverSubject | undefined {
  const subject = eligibleBodyLease(world, observerId, subjectId)?.localSubject;
  return subject && cloneValue(subject);
}

export function recentExposureEpisode(
  world: WorldState,
  observerId: string,
  subjectId: string,
): string | undefined {
  const observer = entityGet(world.entities, observerId),
    subject = entityGet(world.entities, subjectId);
  const state = world.perceptionEvidence?.[observerId],
    gap = state?.gaps[subjectId];
  return observer?.actor &&
    state?.life === (observer.actor.physicalLife ?? 0) &&
    gap &&
    world.simTime <= gap.through &&
    gap.physicalLife === (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)
    ? gap.episodeId
    : undefined;
}
function retainVisualGap(
  world: WorldState,
  state: PerceptionEvidenceOwner,
  lease: CurrentFacetRecord,
  graceSeconds: number,
): void {
  if (lease.value.kind !== 'body' || graceSeconds <= 0) return;
  const original = currentFacetOriginal(state, lease);
  if (original.origin.kind !== 'exposure') return;
  state.gaps[lease.subjectId] = {
    episodeId: original.origin.episodeId,
    lostAt: world.simTime,
    through: world.simTime + graceSeconds,
    physicalLife: lease.subjectPhysicalLife,
  };
}

const CURRENT_BODY_FACET_KINDS = [
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
] as const;
/** Exact selected IDs avoid traversing and copying every unattended body's detail. */
function selectedCurrentFacets(
  current: PerceptionEvidenceOwner['current'] | undefined,
  exposures: ReadonlyMap<string, string>,
): CurrentFacetRecord[] {
  const held = current && readOnlyDraftView(current);
  return [...exposures].flatMap(([id, exposure]) =>
    CURRENT_BODY_FACET_KINDS.flatMap((kind) => {
      const lease = held?.[`${id}:${kind}`];
      return lease?.exposure === exposure ? [lease] : [];
    }),
  );
}

function currentObservedSupports(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kinds: readonly (typeof CURRENT_BODY_FACET_KINDS)[number][],
): CurrentFacetRecord[] {
  const state = readCurrentEvidence(world, observerId);
  const observer = entityGet(readOnlyDraftView(world.entities), observerId);
  if (
    !observer?.actor?.alive ||
    !activelyParticipates(observer) ||
    capabilityBlocked(world, observer, 'perception') ||
    state?.life !== (observer.actor.physicalLife ?? 0)
  )
    return [];
  const subject = entityGet(readOnlyDraftView(world.entities), subjectId);
  if (!subject) return [];
  return kinds
    .flatMap((kind) => readOnlyDraftView(state.current)[`${subjectId}:${kind}`] ?? [])
    .filter(
      (lease) =>
        currentLeaseEligible(world, observerId, lease) &&
        (!lease.bodyLeaseId ||
          lease.bodyLeaseId === eligibleBodyLease(world, observerId, subjectId)?.id),
    );
}

export function currentObservedFacets(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kinds: readonly (typeof CURRENT_BODY_FACET_KINDS)[number][] = CURRENT_BODY_FACET_KINDS,
): CapturedCurrentFacet[] {
  const facets = currentObservedSupports(world, observerId, subjectId, kinds).map((lease) =>
    captureCurrentFacet(world, effectiveCurrentFacetSupport(world, observerId, lease)),
  );
  const motion =
    kinds.includes('observed-motion') && currentMotionFacet(world, observerId, subjectId);
  if (motion) facets.push(motion);
  return facets;
}

/** The same live eligibility as captured evidence, projected before detaching.
 * Mutable builders remain editable; only requested values are detached. */
export function currentObservedFacetValues(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kinds: readonly (typeof CURRENT_BODY_FACET_KINDS)[number][] = CURRENT_BODY_FACET_KINDS,
): CurrentFacetValue[] {
  const facets = currentObservedSupports(world, observerId, subjectId, kinds).map((lease) =>
    projectCurrentFacetValue(world, observerId, lease),
  );
  const motion =
    kinds.includes('observed-motion') && currentMotionFacet(world, observerId, subjectId);
  if (motion)
    facets.push({
      id: motion.id,
      value: motion.value,
      valueMeasuredFrom: motion.valueMeasuredFrom,
      valueMeasuredThrough: motion.valueMeasuredThrough,
      valueAcquiredAt: motion.valueAcquiredAt,
      confirmedThrough: motion.confirmedThrough,
      source: motion.original.source,
    });
  return facets;
}

function projectCurrentFacetValue(
  world: WorldState,
  observerId: string,
  lease: CurrentFacetRecord,
): CurrentFacetValue {
  const state = readCurrentEvidence(world, observerId)!,
    record = readOnlyDraftView(lease);
  const times = currentFacetTimes(state, record);
  const effective = effectiveCurrentFacetTimes(world, observerId, record);
  const value = effectiveCurrentFacetDescriptor(world, observerId, record);
  const received = receivedFacetValue(world, value);
  if (!received) throw new Error('Selected current value is unavailable.');
  return immutableDataSnapshot<CurrentFacetValue>(
    {
      id: record.id,
      value: currentBodyDescription(world, observerId, record.subjectId, received),
      valueMeasuredFrom: effective.valueMeasuredFrom,
      valueMeasuredThrough: effective.valueMeasuredThrough,
      valueAcquiredAt: effective.valueAcquiredAt,
      confirmedThrough: effective.confirmedThrough,
      ...(record.value.kind === 'body'
        ? {
            poseSupport: currentBodyPoseSupport(world, observerId, record.subjectId),
            descriptionSupport: currentDescriptionSupport(world, observerId, record.subjectId),
          }
        : {}),
      source: observationFactKey(world, currentFacetOriginal(state, record), record.originalOrdinal)
        .source,
    },
    readOnlyDraftView,
  );
}

/** Presence-only presentation must not capture a motion's endpoint proof graph. */
export function hasCurrentObservedFacet(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kind: (typeof CURRENT_BODY_FACET_KINDS)[number],
): boolean {
  return kind === 'observed-motion'
    ? currentMotionValue(world, observerId, subjectId) !== undefined
    : currentObservedSupports(world, observerId, subjectId, [kind]).length > 0;
}
function currentLeaseEligible(
  world: WorldState,
  observerId: string,
  lease: CurrentFacetRecord,
): boolean {
  const association = lease.value.kind === 'association' && receivedFacetValue(world, lease.value);
  if (
    association &&
    association.kind === 'association' &&
    associationEvidenceStatus(
      world,
      observerId,
      association,
      currentFacetOriginal(readCurrentEvidence(world, observerId)!, lease),
      lease.originalOrdinal,
    ) !== 'retained'
  )
    return false;
  const subject = entityGet(readOnlyDraftView(world.entities), lease.subjectId);
  if (
    !activelyParticipates(subject) ||
    lease.subjectPhysicalLife !== (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)
  )
    return false;
  if (lease.modality === 'sight') return !!eligibleBodyLease(world, observerId, lease.subjectId);
  const observer = entityGet(readOnlyDraftView(world.entities), observerId);
  return (
    !!observer &&
    sensesFor(world, observer).some(
      (sense) =>
        sense.id ===
        receivedObservationHeader(
          world,
          currentFacetOriginal(readCurrentEvidence(world, observerId)!, lease),
        ).detector.id,
    )
  );
}

function finalizeLease(world: WorldState, observer: Entity, record: CurrentFacetRecord): void {
  if (!hasMemory(observer)) return;
  if (
    !currentDetailedAttention(world, observer.id).some(
      (entry) =>
        entry.sourceId === record.subjectId && entry.exposure.episodeId === record.exposure,
    )
  )
    return;
  const state = world.perceptionEvidence![observer.id]!;
  // One completed sense boundary closes all affected fields together. Releasing
  // support never manufactures another observation or a permanent diary entry.
  unavailableCurrent.get(state)?.push(effectiveCurrentFacetSupport(world, observer.id, record));
}

/** Changing a meter sample is received detail, not a new outward description.
 * Its name, status, range and critical meaning remain descriptively significant;
 * exact numeric effects retain their accounts at the attribute mutation owner. */
export function publicAttributeMeanings(
  value: Extract<SensoryFacet, { kind: 'public-attributes' }>,
) {
  return value.attributes.map(({ value: sample, revision: _revision, ...detail }) => ({
    ...detail,
    ...(detail.display === 'category' ? { value: sample } : {}),
  }));
}
/** Called only after the complete received value changed. */
function semanticFacetChanged(before: SensoryFacet, after: SensoryFacet): boolean {
  if (before.kind === 'description' && after.kind === 'description')
    return before.text !== after.text;
  if (before.kind === 'body' && after.kind === 'body') {
    const previous = before.body,
      current = after.body;
    return (
      previous.kind !== current.kind ||
      previous.appearance !== current.appearance ||
      previous.radius !== current.radius ||
      previous.height !== current.height ||
      previous.description !== current.description ||
      (previous.assembly ? jsonText(previous.assembly) : null) !==
        (current.assembly ? jsonText(current.assembly) : null) ||
      previous.animation?.id !== current.animation?.id ||
      previous.animation?.phase !== current.animation?.phase ||
      previous.bodyPlan !== current.bodyPlan ||
      previous.subtype !== current.subtype ||
      (previous.effects ? jsonText(previous.effects) : null) !==
        (current.effects ? jsonText(current.effects) : null) ||
      previous.heatLit !== current.heatLit ||
      previous.remainsPhase !== current.remainsPhase ||
      !!previous.storage !== !!current.storage ||
      previous.outward.length !== current.outward.length ||
      previous.outward.some((value, index) => value !== current.outward[index]) ||
      previous.label?.name !== current.label?.name ||
      previous.label?.nameForm !== current.label?.nameForm ||
      previous.label?.indefiniteArticle !== current.label?.indefiniteArticle
    );
  }
  if (before.kind === 'public-attributes' && after.kind === 'public-attributes')
    return (
      JSON.stringify(publicAttributeMeanings(before)) !==
      JSON.stringify(publicAttributeMeanings(after))
    );
  return after.kind === 'carried' || after.kind === 'pile-contents';
}

/** The existing native sight phase supplies its completed admitted candidates. Projection
 * never calls this function. Changed measurements replace only their own latest values. */
export function reconcileVisualEvidence(
  world: WorldState,
  observer: Entity,
  subjects: readonly Entity[],
  detector: { id: string; version: number },
  episodeGraceSeconds = 0,
  sourceToken?: (id: string) => string | undefined,
  sourcePublicAttributes?: (id: string) => readonly AttributeView[],
  measuredSubjects?: ReadonlySet<string>,
  sourceDetailsToken?: (id: string) => object | undefined,
): void {
  const state = owner(world, observer);
  return withCurrentOriginalBatch(world, observer.id, state, () => {
    const observerPosition = readOnlyDraftView(worldPosition(observer));
    const observerFrame: ObservationFrame = immutableDataSnapshot(
      {
        positionAtObservation: observerPosition,
        forwardAtObservation: observer.spatial.heading,
      },
      readOnlyDraftView,
    );
    const receivedFrame = retainObservationFrame(world, observerFrame);
    if (receivedFrame.addedBytes) chargeWork({ outputBytes: receivedFrame.addedBytes });
    const completed = readOnlyDraftView(state).visualConfirmation;
    const priorConfirmation = completed && readOnlyDraftView(completed);
    const frameChanged = !sameObservationFrame(
      priorConfirmation ? receivedObservationFrame(world, priorConfirmation.frameRef) : undefined,
      observerFrame,
    );
    const beforeAttention = new Set(
      currentDetailedAttention(world, observer.id).map((entry) => entry.sourceId),
    );
    const attentionChanges = new Set<string>();
    const lostIndividuals = new Set<string>();
    const lostKeys: string[] = [],
      retiredMotion = new Set<string>(),
      uncheckedSubjects = new Set<string>();
    const unchecked = new Map<number, LiveFacetSupport[]>();
    const pending = world.sensory;
    for (const [id, gap] of Object.entries(state.gaps))
      if (gap.through < world.simTime) delete state.gaps[id];
    const eligible = new Map(
      subjects.map(
        (entity) => [entity.id, entity.actor ? (entity.actor.physicalLife ?? 0) : null] as const,
      ),
    );
    for (const [key, stored] of Object.entries(readOnlyDraftView(state.current))) {
      const lease = readOnlyDraftView(stored);
      if (
        lease.modality === 'sight' &&
        priorConfirmation &&
        (!measuredSubjects || measuredSubjects.has(lease.subjectId))
      ) {
        const completed = priorConfirmation.subjects[lease.subjectId];
        const inputRevision = completed?.inputRevision ?? priorConfirmation.completeInputRevision;
        const invalidations = [
          pending,
          pending?.scopes[observer.id],
          pending?.scopes[lease.subjectId],
        ].filter(
          (scope) =>
            scope?.invalidatedAt !== undefined && (scope.invalidatedRevision ?? -1) > inputRevision,
        );
        if (invalidations.length) {
          uncheckedSubjects.add(lease.subjectId);
          retiredMotion.add(lease.subjectId);
          if (beforeAttention.has(lease.subjectId) && hasMemory(observer)) {
            // A coalesced marker may predate a detail check that already handled
            // its first change. Bound the unknown interval by that last actual
            // support, never invent an exact later hidden-change occurrence time.
            const at = Math.max(
              completed?.through ?? priorConfirmation.completeThrough,
              Math.min(...invalidations.map((scope) => scope!.invalidatedAt!)),
            );
            const group = unchecked.get(at) ?? [];
            group.push(effectiveCurrentFacetSupport(world, observer.id, lease));
            unchecked.set(at, group);
          }
        }
      }
      if (
        lease.modality === 'sight' &&
        (!measuredSubjects || measuredSubjects.has(lease.subjectId)) &&
        lease.subjectPhysicalLife !== eligible.get(lease.subjectId)
      ) {
        attentionChanges.add(lease.subjectId);
        if (lease.value.kind === 'body' && lease.localSubject?.kind === 'individual')
          lostIndividuals.add(lease.localSubject.individualId);
        retainVisualGap(world, state, lease, episodeGraceSeconds);
        finalizeLease(world, observer, lease);
        lostKeys.push(key);
      }
    }
    // Publish the actual uncertainty boundary before the later successful or
    // failed check. It cannot be silently bridged by a new pose sample.
    for (const [at, leases] of unchecked) {
      captureTemporalAvailability(
        world,
        observer.id,
        leases,
        selectedTemporalPolicy(world).recent,
        { change: 'unchecked', at },
      );
      // The next successful check must close the uncertainty even when the value
      // itself is unchanged. Release only these comparison marks, not history.
      const history = world.experience?.temporal?.actors[observer.id];
      if (history) for (const lease of leases) delete history.captures[lease.id];
    }
    for (const id of uncheckedSubjects) attentionChanges.add(id);
    retireCurrentMotion(world, observer.id, retiredMotion);
    removeCurrentFacets(world, observer.id, lostKeys);
    const checkedSources = new Set<string>(),
      detailedSources = new Set<string>(),
      reacquiredFields = new Set<string>(),
      unboundBodies = new Set<string>();
    const processSubject = (subject: Entity, detailed: boolean) => {
      chargeWork({ tests: 1 });
      delete state.gaps[subject.id];
      const exposed = world.perceptionEpisodes?.[observer.id]?.[subject.id];
      if (subject.placement?.mode !== 'world') return;
      const placement = subject.placement;
      checkedSources.add(subject.id);
      if (detailed) detailedSources.add(subject.id);
      const token = sourceToken?.(subject.id),
        heldBody = readOnlyDraftView(state.current)[`${subject.id}:body`],
        heldOriginal = heldBody && currentFacetOriginal(state, heldBody),
        measuredSource = heldOriginal && measuredSources.get(heldOriginal);
      if (
        token &&
        !uncheckedSubjects.has(subject.id) &&
        heldBody &&
        !subject.assembly &&
        measuredSource?.leaseId === heldBody.id &&
        measuredSource.token === token &&
        (!detailed || measuredSource.detailed)
      ) {
        const priorMotion = state.motionSamples?.[subject.id];
        if (priorMotion && world.simTime > priorMotion.through) {
          retiredMotion.add(subject.id);
          attentionChanges.add(subject.id);
        }
        if (subject.actor && !heldBody.localSubject) unboundBodies.add(subject.id);
        return;
      }
      const prepared = prepareVisualSourceValues(
        world,
        subject,
        sourceDetailsToken?.(subject.id),
        token,
        detailed
          ? (sourcePublicAttributes?.(subject.id) ?? projectAttributes(world, subject, 'public'))
          : [],
        detailed,
      );
      const values: SensoryFacet[] = [
        prepared.facets[0]!,
        freeze({ kind: 'location', location: prepared.location, frame: observerFrame }, true),
        ...prepared.facets.slice(1).map((facet) =>
          subject.assembly && facet.kind === 'body'
            ? freeze(
                {
                  ...facet,
                  body: {
                    ...facet.body,
                    assembly: facet.body.assembly
                      ? cloneValue(
                          receiveAssemblyConditions(
                            world,
                            subject.id,
                            facet.body.assembly,
                            observer.id,
                          ),
                        )
                      : undefined,
                  },
                },
                true,
              )
            : facet,
        ),
      ];
      const receivedInput = (facet: SensoryFacet): ObservationInput['facets'][number] => ({
        role: 'direct',
        asOf: world.simTime,
        measuredFrom: world.simTime,
        measuredThrough: world.simTime,
        value: facet,
        ...(facet.kind === 'location' ? { preparedPose: prepared.pose } : {}),
      });
      const currentValue = (
        facet: SensoryFacet,
        prior?: ReceivedFacetValue,
      ): SensoryFacet | ReceivedFacetValue => {
        if (facet.kind !== 'location') return copyFacetValue(facet);
        const retained = retainFacetValue(world, facet, prior, prepared.pose);
        if (retained.addedBytes) chargeWork({ outputBytes: retained.addedBytes });
        return retained.value;
      };
      const detected = readOnlyDraftView(state.current)[`${subject.id}:detected`],
        detectedLease = detected && readOnlyDraftView(detected);
      let original = detectedLease && currentFacetOriginal(state, detectedLease),
        admittedOriginal: ReceivedObservation | undefined;
      if (!original) {
        const before = state.received.length;
        original = acquireReceivedObservation(world, observer, {
          origin: {
            kind: 'exposure',
            episodeId: exposed ?? nextId(world, 'perception-exposure'),
            detectorId: detector.id,
            measuredFrom: world.simTime,
            measuredThrough: world.simTime,
          },
          modality: 'sight',
          detector,
          facets: values.map(receivedInput),
        });
        if (state.received.length > before) admittedOriginal = original;
      }
      const priorExposure = detectedLease && currentFacetExposure(state, detectedLease),
        receivedObserver = readOnlyDraftView(receivedObservationHeader(world, original).observer);
      const exposure = immutableDataSnapshot<ObservationExposure>(
        priorExposure?.episodeId === original.id &&
          priorExposure.observer.actorId === receivedObserver.actorId &&
          priorExposure.observer.physicalLife === receivedObserver.physicalLife
          ? priorExposure
          : { observer: receivedObserver, episodeId: original.id },
        readOnlyDraftView,
      );
      let earlierLocation: CurrentMotionSample['earlier'] | undefined;
      values.forEach((facet, ordinal) => {
        chargeWork({ tests: 1 });
        const key = `${subject.id}:${facet.kind}`;
        const reacquired = uncheckedSubjects.has(subject.id) && !reacquiredFields.has(key);
        if (reacquired) reacquiredFields.add(key);
        let prior = readOnlyDraftView(state.current)[key];
        // Equality and semantic comparison read completed values, not deep Immer proxies.
        // Drafting every unchanged nested body here makes later native previews copy it.
        const priorLease = prior && readOnlyDraftView(prior),
          previousBody =
            facet.kind === 'body' && priorLease && receivedBodyParts(world, priorLease.value),
          nextBody = facet.kind === 'body' ? splitObservedBody(facet.body) : undefined;
        if (
          !reacquired &&
          previousBody &&
          nextBody &&
          jsonText(previousBody.details) === jsonText(nextBody.details)
        )
          return;
        const previousValue = priorLease && receivedFacetValue(world, priorLease.value);
        const priorPose =
          facet.kind === 'location' && priorLease
            ? receivedValueAt(world.receivedValues?.sources ?? {}, {
                blockId: priorLease.value.reference[0],
                valueOrdinal: priorLease.value.reference[1],
              })
            : undefined;
        // A complete sight phase owns one shared receiver frame. Moving the
        // observer does not require replacing every stationary source location.
        const changed =
          reacquired ||
          !previousValue ||
          (facet.kind === 'location' &&
            (priorPose?.kind !== 'body-pose' ||
              jsonText(priorPose.pose) !== jsonText(prepared.pose))) ||
          (facet.kind === 'location' &&
            priorLease?.sourcePlacementRevision !== placement.revision) ||
          (previousValue.kind === 'location' && facet.kind === 'location'
            ? jsonText(previousValue.location) !== jsonText(facet.location)
            : previousValue.kind === 'body' && facet.kind === 'body'
              ? jsonText(splitObservedBody(previousValue.body).details) !==
                  jsonText(splitObservedBody(facet.body).details) ||
                jsonText(splitObservedBody(previousValue.body).pose) !==
                  jsonText(splitObservedBody(facet.body).pose)
              : jsonText(previousValue) !== jsonText(facet));
        if (changed) attentionChanges.add(subject.id);
        if (
          prior &&
          priorLease &&
          facet.kind === 'location' &&
          !uncheckedSubjects.has(subject.id) &&
          previousValue?.kind === 'location' &&
          previousValue.location.kind === 'point' &&
          facet.location.kind === 'point' &&
          (priorLease.motionContinuityRevision ?? 0) ===
            (placement.motionContinuityRevision ?? 0) &&
          placement.revision > (priorLease.sourcePlacementRevision ?? -1) &&
          Math.hypot(
            previousValue.location.point.x - facet.location.point.x,
            previousValue.location.point.y - facet.location.point.y,
            previousValue.location.point.z - facet.location.point.z,
          ) >
            previousValue.location.errorRadius + facet.location.errorRadius
        ) {
          // Comparison needs only the received value. Materialize confirmation times
          // only for an earlier motion sample that will actually use that support.
          const previous = effectiveCurrentFacetSupport(world, observer.id, prior);
          if (previous.valueMeasuredThrough < world.simTime) {
            const {
              location: _location,
              frame: _frame,
              ...proof
            } = captureReceivedLocationSample(world, previous);
            earlierLocation = immutableDataSnapshot(
              { ...proof, value: priorLease.value },
              readOnlyDraftView,
            );
          }
        }
        let facetOriginal = original;
        if (prior && previousValue && changed && semanticFacetChanged(previousValue, facet)) {
          facetOriginal = acquireReceivedObservation(world, observer, {
            origin: {
              kind: 'exposure',
              episodeId: exposure.episodeId,
              detectorId: `${detector.id}:${facet.kind}:${prior.id}:${prior.revision + 1}`,
              measuredFrom: world.simTime,
              measuredThrough: world.simTime,
            },
            modality: 'sight',
            detector,
            facets: [receivedInput(facet)],
          });
          if (facet.kind === 'body' || facet.kind === 'public-attributes') {
            // The same observed body/contact continues while its semantic fact changes.
            prior = {
              ...compactCurrentFacet(state, {
                ...currentFacetSupport(state, prior),
                original: facetOriginal,
                originalOrdinal: 0,
                confirmedFrom: world.simTime,
              }),
            };
          } else {
            removeCurrentFacets(world, observer.id, [key]);
            prior = undefined;
          }
        }
        if (!prior) {
          if (
            facetOriginal?.facets[ordinal]?.value.kind !== facet.kind &&
            facetOriginal?.facets[0]?.value.kind !== facet.kind
          )
            facetOriginal = acquireReceivedObservation(world, observer, {
              origin: {
                kind: 'exposure',
                episodeId: exposure.episodeId,
                detectorId: `${detector.id}:${facet.kind}`,
                measuredFrom: world.simTime,
                measuredThrough: world.simTime,
              },
              modality: 'sight',
              detector,
              facets: [receivedInput(facet)],
            });
          replaceCurrentFacet(world, state, key, {
            id: nextId(world, 'perception-lease'),
            revision: 1,
            observer: exposure.observer,
            subjectId: subject.id,
            subjectPhysicalLife: subject.actor ? (subject.actor.physicalLife ?? 0) : null,
            ...(facet.kind === 'location'
              ? {
                  motionContinuityRevision: placement.motionContinuityRevision ?? 0,
                  sourcePlacementRevision: placement.revision,
                }
              : {}),
            exposure,
            original: facetOriginal!,
            originalOrdinal: facetOriginal!.facets.length === 1 ? 0 : ordinal,
            modality: 'sight',
            // Only this newly admitted original proves the same current value.
            // A reused onset may predate a returning or changed detail.
            value:
              facetOriginal === admittedOriginal
                ? facetOriginal!.facets[ordinal]!.value
                : currentValue(facet),
            valueMeasuredFrom: world.simTime,
            valueMeasuredThrough: world.simTime,
            valueAcquiredAt: world.simTime,
            confirmedFrom: world.simTime,
            confirmedThrough: world.simTime,
          });
        } else if (changed) {
          const {
            at: _at,
            from: _from,
            acquiredAt: _acquired,
            confirmedThrough: _confirmed,
            ...unchanged
          } = readOnlyDraftView(prior);
          const initialAt = receivedObservationFacetMetadata(
            currentFacetOriginal(state, prior),
            prior.originalOrdinal,
          ).measuredThrough;
          replaceCurrentFacet(world, state, key, {
            ...unchanged,
            revision: prior.revision + 1,
            value: currentValue(facet, priorLease?.value),
            ...(world.simTime === initialAt ? {} : { at: world.simTime }),
            ...(reacquired ? { confirmedFrom: world.simTime } : {}),
            ...(facet.kind === 'location'
              ? {
                  motionContinuityRevision: placement.motionContinuityRevision ?? 0,
                  sourcePlacementRevision: placement.revision,
                }
              : {}),
          });
        }
      });
      const storedBody = readOnlyDraftView(state.current)[`${subject.id}:body`],
        currentBody = storedBody && readOnlyDraftView(storedBody);
      if (subject.actor && currentBody && !currentBody.localSubject) unboundBodies.add(subject.id);
      const storedLocation = readOnlyDraftView(state.current)[`${subject.id}:location`],
        locationLease = storedLocation && readOnlyDraftView(storedLocation);
      if (earlierLocation && locationLease) {
        const policy = routineSensePolicy(world, observer).sight;
        const period =
          (beforeAttention.has(subject.id) ? policy?.detailSeconds : undefined) ?? policy?.seconds;
        const epoch = world.sensory?.epochAt ?? 0;
        const expiresAt = period
          ? epoch + (Math.floor((world.simTime - epoch) / period) + 1) * period
          : world.simTime;
        (state.motionSamples ??= {})[subject.id] = immutableDataSnapshot(
          {
            earlier: earlierLocation,
            through: world.simTime,
            continuityRevision: locationLease.motionContinuityRevision ?? 0,
            expiresAt,
          },
          readOnlyDraftView,
        );
      } else if (
        state.motionSamples?.[subject.id] &&
        world.simTime > state.motionSamples[subject.id]!.through
      )
        retiredMotion.add(subject.id);
      const kinds = new Set(values.map((facet) => facet.kind));
      for (const kind of (detailed
        ? ['description', 'pile-contents', 'public-attributes']
        : []) as ('description' | 'pile-contents' | 'public-attributes')[]) {
        const key = `${subject.id}:${kind}`;
        const removed = readOnlyDraftView(state.current)[key];
        if (removed && !kinds.has(kind)) {
          attentionChanges.add(subject.id);
          finalizeLease(world, observer, readOnlyDraftView(removed));
          removeCurrentFacets(world, observer.id, [key]);
        }
      }
      const measured = readOnlyDraftView(state.current)[`${subject.id}:body`];
      if (token && measured)
        measuredSources.set(currentFacetOriginal(state, measured), {
          leaseId: measured.id,
          token,
          detailed,
        });
    };
    for (const subject of subjects)
      processSubject(subject, !!measuredSubjects || beforeAttention.has(subject.id));
    const revision = (priorConfirmation?.revision ?? 0) + 1;
    touchNativeEvidence(world, 'perception', observer.id);
    state.visualConfirmation = {
      through: world.simTime,
      revision,
      completeThrough: measuredSubjects ? (priorConfirmation?.completeThrough ?? 0) : world.simTime,
      completeRevision: measuredSubjects ? (priorConfirmation?.completeRevision ?? 0) : revision,
      completeInputRevision: measuredSubjects
        ? (priorConfirmation?.completeInputRevision ?? 0)
        : (world.sensory?.revision ?? 0),
      subjects: {},
      frameRef: receivedFrame.reference,
      frameRevision: frameChanged ? revision : priorConfirmation!.frameRevision,
    };
    for (const [id, selected] of Object.entries(priorConfirmation?.subjects ?? {}))
      if (measuredSubjects ? !measuredSubjects.has(id) || eligible.has(id) : eligible.has(id))
        state.visualConfirmation.subjects[id] = measuredSubjects
          ? selected
          : {
              ...selected,
              through: world.simTime,
              revision,
              inputRevision: world.sensory?.revision ?? 0,
            };
    if (measuredSubjects)
      for (const id of measuredSubjects)
        if (eligible.has(id))
          state.visualConfirmation.subjects[id] = {
            ...state.visualConfirmation.subjects[id],
            through: world.simTime,
            revision,
            inputRevision: world.sensory?.revision ?? 0,
          };
    const confirmDetailed = () => {
      for (const id of detailedSources)
        state.visualConfirmation!.subjects[id] = {
          through: world.simTime,
          revision,
          inputRevision: world.sensory?.revision ?? 0,
          detail: { through: world.simTime, revision, inputRevision: world.sensory?.revision ?? 0 },
        };
    };
    confirmDetailed();
    if (!measuredSubjects && hasMemory(observer)) {
      const selected = updateAttention(world, observer.id, {
        changedSourceIds: [...attentionChanges],
      }).after;
      const byId = new Map(subjects.map((subject) => [subject.id, subject]));
      for (const id of selected)
        if (!beforeAttention.has(id)) {
          const subject = byId.get(id);
          if (subject) processSubject(subject, true);
        }
    }
    confirmDetailed();
    // A broad body becomes eligible only after this completed phase installs its
    // confirmation. Bind its local person now, including people outside detail;
    // server reads must never create identities or require an extra sight sample.
    if (hasMemory(observer))
      for (const id of unboundBodies) {
        const body = readOnlyDraftView(state.current)[`${id}:body`];
        if (!body || body.localSubject) continue;
        const localSubject = selectedBodyIndividual(world, observer.id, id);
        if (localSubject)
          replaceCurrentFacet(world, state, `${id}:body`, {
            ...readOnlyDraftView(body),
            localSubject,
          });
      }
    retireCurrentMotion(world, observer.id, retiredMotion);
    pruneLostBodyIndividuals(world, observer.id, lostIndividuals);
    refreshMotionExpiry(state);
    // Memoryless native reactions consume received bodies; no current consumer asks
    // them for autobiographical scene geometry or detailed attention.
    if (!hasMemory(observer)) return;
    const newGeometry = refreshReceivedGeometry(world, observer.id).acquired;
    reconcileReceivedAttention(
      world,
      observer.id,
      beforeAttention,
      [...attentionChanges],
      true,
      newGeometry,
      frameChanged,
      { broad: checkedSources, detailed: detailedSources },
    );
  });
}

/** Pending interpretation uses held received facts. It does not sense the world,
 * refresh measurement times or credit another sensory contact. */
export function continuePerceptionWork(world: WorldState, observerId: string): void {
  const due = nextAttentionWorkAt(world, observerId);
  if (due === undefined || due > world.simTime) return;
  const before = new Set(
    currentDetailedAttention(world, observerId).map((entry) => entry.sourceId),
  );
  reconcileReceivedAttention(world, observerId, before, [], false, []);
}
function reconcileReceivedAttention(
  world: WorldState,
  observerId: string,
  beforeAttention: Set<string>,
  attentionChanges: readonly string[],
  creditContacts: boolean,
  newGeometry: readonly ObservationContribution[],
  receiverFrameChanged = false,
  checked?: { broad: ReadonlySet<string>; detailed: ReadonlySet<string> },
): void {
  reconcileAttendedTemporalEvidence(
    world,
    observerId,
    beforeAttention,
    [],
    attentionChanges,
    creditContacts,
    newGeometry,
    { receiverFrameChanged, checked },
  );
  evaluateAttentionRelations(world, observerId);
}

/** Features have their own received timeline. Attention rotation neither grants
 * earlier terrain nor duplicates a still-held fact for another body. */
function captureReceivedFeatureHistory(
  world: WorldState,
  observerId: string,
  acquired: readonly ObservationContribution[],
  options: { confirmHeld?: boolean; rebaselineMissing?: boolean } = {},
): ReadonlySet<string> | undefined {
  if (!hasMemory(entityGet(world.entities, observerId)!)) return;
  if (!acquired.length && !options.confirmHeld && !options.rebaselineMissing) return;
  const geometry = currentReceivedGeometry(world, observerId),
    available = geometry.observations;
  const captures = world.experience?.temporal?.actors[observerId]?.captures;
  const selected = new Set(acquired.map((observation) => observation.id));
  if (options.confirmHeld || options.rebaselineMissing)
    for (const observation of available)
      if (!captures?.[observation.id]) selected.add(observation.id);
  // A boundary keeps its exact near/far received planes, never today's terrain.
  for (const observation of available)
    if (selected.has(observation.id))
      for (const facet of observation.facets)
        if (facet.value.kind === 'physical-boundary')
          for (const support of [
            facet.value.boundary.nearSurface.support,
            facet.value.boundary.farSurface.support,
          ])
            selected.add(support.source.id);
  if (options.confirmHeld)
    finalizeTemporalGeometrySupport(
      world,
      observerId,
      available.filter((observation) => !selected.has(observation.id)),
      geometry.supportedThrough,
      selectedTemporalPolicy(world).recent,
    );
  const captured = new Set<string>();
  for (const observation of available)
    if (selected.has(observation.id)) {
      const receipt = captureTemporalObservation(
        world,
        observerId,
        observation,
        [observation.id],
        false,
        selectedTemporalPolicy(world).recent,
        { change: 'change', confirmedThrough: geometry.supportedThrough },
      );
      if (receipt) captured.add(observation.id);
    }
  reconcileTemporalGeometryCaptures(
    world,
    observerId,
    new Set(available.map((observation) => observation.id)),
  );
  return captured;
}

/** Seal the existing receiver's supported static interval before a cognition cut.
 * No sensing, contact credit or lasting account is created by this preparation. */
export function captureCurrentGeometrySupport(world: WorldState, observerId: string): void {
  const observer = entityGet(world.entities, observerId);
  if (!observer || !hasMemory(observer)) return;
  captureReceivedFeatureHistory(world, observerId, [], { confirmHeld: true });
}

function pruneLostBodyIndividuals(
  world: WorldState,
  observerId: string,
  candidates: ReadonlySet<string>,
): void {
  if (!candidates.size) return;
  const temporal = world.experience?.temporal?.actors[observerId];
  const retained = new Set(temporal?.chunks.flatMap((chunk) => chunk.individualIds) ?? []);
  for (const capsule of Object.values(temporal?.supports ?? {})) {
    const subject = capsule.receipt.subjectIdentity;
    if (subject?.kind === 'individual') retained.add(subject.individualId);
    for (const value of capsule.values)
      if (value.kind === 'association' && value.subject.kind === 'individual')
        retained.add(value.subject.individualId);
  }
  selectedPruneObserverIndividuals(world, observerId, {
    releasedSourceIds: [],
    retainedIndividualIds: retained,
    candidates: [...candidates],
  });
}

/** Selection follows the complete received phase. The transition retains both
 * outgoing and incoming detail, so selection cannot erase its own triggering change. */
export function reconcileAttendedTemporalEvidence(
  world: WorldState,
  observerId: string,
  before = new Set(currentDetailedAttention(world, observerId).map((entry) => entry.sourceId)),
  directSubjects: readonly string[] = [],
  changedSourceIds?: readonly string[],
  creditContacts = true,
  newGeometry: readonly ObservationContribution[] = [],
  cues: Pick<AttentionUpdate, 'urgency' | 'proofs'> & {
    receiverFrameChanged?: boolean;
    checked?: { broad: ReadonlySet<string>; detailed: ReadonlySet<string> };
  } = {},
): ReadonlySet<string> | undefined {
  touchNativeEvidence(world, 'perception', observerId);
  const observer = entityGet(world.entities, observerId);
  if (!observer || !hasMemory(observer)) return;
  const history = world.experience?.temporal?.actors[observerId];
  const rebaseline = history?.capturesInvalidated === true;
  const priorEntries = currentDetailedAttention(world, observerId).filter((entry) =>
    before.has(entry.sourceId),
  );
  const { receiverFrameChanged = false, checked, ...attentionCues } = cues;
  const result = updateAttention(world, observerId, {
    directSubjects,
    changedSourceIds,
    ...attentionCues,
  });
  const after = new Set(result.after);
  const selected = new Set([...before, ...after]);
  const storedCurrent = world.perceptionEvidence?.[observerId]?.current;
  const current = storedCurrent && readOnlyDraftView(storedCurrent);
  const selectedExposures = new Map(
    [...selected].flatMap((id) => {
      const body = current?.[`${id}:body`];
      return body ? [[id, body.exposure] as const] : [];
    }),
  );
  const entering = new Set([...after].filter((id) => !before.has(id))),
    exiting = new Set([...before].filter((id) => !after.has(id)));
  if (
    [...entering].some(
      (id) =>
        world.perceptionEvidence?.[observerId]?.visualConfirmation?.subjects[id]?.detail
          ?.through !== world.simTime,
    )
  )
    requestDetailedSight(world, observerId);
  const measured =
    changedSourceIds && !rebaseline
      ? new Set([
          ...changedSourceIds.filter((id) => selected.has(id)),
          ...entering,
          ...exiting,
          ...(receiverFrameChanged ? selected : []),
        ])
      : undefined;
  const contacts = new Map<string, ObserverSubject>();
  const contactSubject = creditContacts ? prepareCurrentBodySubjects(world, observerId) : undefined;
  if (creditContacts)
    for (const id of selected) {
      const body = current?.[`${id}:body`];
      if (!body) continue;
      const subject = contactSubject?.(id) ?? body.localSubject;
      if (!subject || !selectedAttentionContactDue(world, observerId, subject, world.simTime))
        continue;
      const lease = effectiveCurrentFacetSupport(world, observerId, body);
      if (lease.confirmedThrough === world.simTime) {
        contacts.set(id, subject);
        measured?.add(id);
      }
    }
  // Unchanged leases still keep their deduplication ownership. They need no
  // newly allocated confirmation view when this capture will skip them.
  // The completed phase proves that neither the selected values nor recording
  // scope changed. Keep watermarks intact without scanning them to rediscover it.
  const captureNeeded =
    !measured ||
    measured.size > 0 ||
    (!!checked && [...selected].some((id) => checked.broad.has(id)));
  const captured = captureNeeded
    ? captureTemporalCurrent(
        world,
        observerId,
        selectedCurrentFacets(current, selectedExposures),
        entering,
        selectedTemporalPolicy(world).recent,
        exiting,
        new Set(contacts.keys()),
        changedSourceIds && !rebaseline
          ? receiverFrameChanged
            ? measured
            : new Set(changedSourceIds)
          : undefined,
        checked,
      )
    : [];
  const creditedSources: string[] = [];
  for (const entry of captured) {
    const subject = contacts.get(entry.subjectId);
    if (!subject || !entry.body || entry.body.confirmedThrough !== world.simTime) continue;
    const ordinal = entry.receipt.facets.find(
      (facet) =>
        facet.receivedFrom?.id === entry.body!.id ||
        (facet.detailSupport?.proof.original.source.id === entry.body!.original.id &&
          facet.detailSupport.proof.original.ordinal === entry.body!.originalOrdinal),
    )?.ordinal;
    if (ordinal === undefined) continue;
    const retention = selectedTemporalPolicy(world).optional;
    const held = retainTemporalSupport(world, entry.receipt, {
      facetOrdinals: [ordinal],
      ...retention,
    });
    if (!held) continue;
    const credited = selectedCreditAttentionContact(world, observerId, subject, {
      sourceKey: JSON.stringify(temporalReceiptSource(entry.receipt)),
      at: entry.body.confirmedThrough,
      order: entry.receipt.ordinal,
      support: [JSON.stringify({ source: temporalReceiptSource(entry.receipt), ordinal })],
    });
    if (!credited) releaseTemporalSupport(world, observerId, entry.receipt.id);
    else creditedSources.push(entry.subjectId);
  }
  if (creditedSources.length) {
    const rescored = updateAttention(world, observerId, { changedSourceIds: creditedSources });
    const final = new Set(rescored.after);
    const entering = new Set([...final].filter((id) => !after.has(id)));
    const exiting = new Set([...after].filter((id) => !final.has(id)));
    if (entering.size || exiting.size) {
      const affected = new Set([...entering, ...exiting]);
      const exposures = new Map(
        [...new Set([...after, ...final])].flatMap((id) => {
          const body = current?.[`${id}:body`];
          return body ? [[id, body.exposure] as const] : [];
        }),
      );
      const leases = selectedCurrentFacets(current, exposures);
      // Credit may change prominence. Retain the newly selected current baseline before
      // publication, without recursively awarding contacts for an attention-only change.
      captureTemporalCurrent(
        world,
        observerId,
        leases,
        entering,
        selectedTemporalPolicy(world).recent,
        exiting,
        undefined,
        affected,
      );
    }
  }
  const geometry = captureReceivedFeatureHistory(world, observerId, newGeometry, {
    rebaselineMissing: rebaseline,
  });
  if (history) delete history.capturesInvalidated;
  return geometry;
}

/** Physical loss ends availability immediately; episode/familiarity continuity is separate. */
export function endCurrentEvidence(
  world: WorldState,
  observerId: string,
  modality?: ObservationContribution['modality'],
  episodeGraceSeconds = 0,
  subjectId?: string,
): void {
  touchNativeEvidence(world, 'perception', observerId);
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  return withCurrentOriginalBatch(world, observerId, state, () => {
    const observer = entityGet(world.entities, observerId);
    if (subjectId === undefined && (!modality || modality === 'sight'))
      endReceivedGeometry(world, observerId);
    const lostIndividuals = new Set<string>();
    const lostKeys: string[] = [];
    let changed = false;
    for (const [key, lease] of Object.entries(readOnlyDraftView(state.current)))
      if (
        (subjectId === undefined || lease.subjectId === subjectId) &&
        (!modality || lease.modality === modality)
      ) {
        if (lease.value.kind === 'body' && lease.localSubject?.kind === 'individual')
          lostIndividuals.add(lease.localSubject.individualId);
        retainVisualGap(world, state, lease, episodeGraceSeconds);
        if (observer?.actor && state.life === (observer.actor.physicalLife ?? 0))
          finalizeLease(world, observer, lease);
        lostKeys.push(key);
        changed = true;
      }
    removeCurrentFacets(world, observerId, lostKeys);
    if (subjectId !== undefined && !changed) return;
    pruneLostBodyIndividuals(world, observerId, lostIndividuals);
    reconcileAttendedTemporalEvidence(world, observerId);
  });
}

function awarenessBodyContext(
  world: WorldState,
  awareness: Awareness,
):
  | {
      context: NonNullable<ObservationContribution['context']>;
      participants: ReceivedEventParticipant[];
      speechParticipants: ReceivedSpeechParticipants;
      soundSource?: Extract<EvidenceParticipant, { kind: 'exposure' }>;
    }
  | undefined {
  const scope = bodyReadScope(world, awareness.actorId);
  if (!scope) return;
  const state = readOnlyDraftView(world.perceptionEvidence![awareness.actorId]!);
  const attention = state.attention && readOnlyDraftView(state.attention);
  const entries = attention && readOnlyDraftView(attention.entries);
  const result: ObservationExposure[] = [];
  const receivedParticipants: ReceivedEventParticipant[] = [];
  const speechParticipants: ReceivedSpeechParticipants = {};
  const visibleSound = awareness.sound?.visibleSource;
  let soundSource: Extract<EvidenceParticipant, { kind: 'exposure' }> | undefined;
  let attended = false;
  const participants = new Set([
    ...Object.keys(awareness.entityEpisodes ?? {}),
    ...(awareness.references?.map((reference) => reference.id) ?? []),
    ...(visibleSound ? [visibleSound.entityId] : []),
  ]);
  for (const id of participants) {
    const episode =
      awareness.entityEpisodes?.[id] ??
      (visibleSound?.entityId === id ? visibleSound.episodeId : undefined);
    const lease = scope.body(id),
      storedDetected = scope.current[`${id}:detected`],
      detected = storedDetected && readOnlyDraftView(storedDetected);
    const detectedOriginal = detected && currentFacetOriginal(state, detected);
    if (
      !lease ||
      !detected ||
      lease.value.kind !== 'body' ||
      !detectedOriginal ||
      detectedOriginal.origin.kind !== 'exposure' ||
      (lease.subjectPhysicalLife !== null &&
        (episode === undefined || detectedOriginal.origin.episodeId !== episode)) ||
      detected.exposure !== lease.exposure ||
      receivedObservationHeader(world, currentFacetOriginal(state, lease)).acquiredAt > awareness.at
    )
      continue;
    const receivedSoundSource =
      visibleSound?.entityId === id &&
      visibleSound.physicalLife === (lease.subjectPhysicalLife ?? 0) &&
      visibleSound.episodeId === detectedOriginal.origin.episodeId;
    if (awareness.sound && !receivedSoundSource) continue;
    if (
      lease.subjectPhysicalLife === null &&
      awareness.modality !== 'observed' &&
      !receivedSoundSource
    )
      continue;
    if (awareness.speech) {
      // A known unseen voice names no visible body. Only the actual received
      // speaker/body grant or independently perceived addressee can join this view.
      if (id === awareness.sourceId) {
        if (
          awareness.sourceBody?.entityId !== id ||
          awareness.sourceBody.leaseId !== lease.id ||
          awareness.sourceBody.physicalLife !== lease.subjectPhysicalLife
        )
          continue;
      } else if (id !== awareness.targetId || !awareness.speech.addressee) continue;
    } else if (
      !receivedSoundSource &&
      !awareness.references?.some((reference) => reference.id === id)
    )
      continue;
    const participant: Extract<EvidenceParticipant, { kind: 'exposure' }> = {
      kind: 'exposure',
      exposure: cloneValue(currentFacetExposure(state, lease)),
    };
    if (!result.some((context) => context.episodeId === lease.exposure))
      result.push(participant.exposure);
    // Preserve the correspondence proved now. The recording scope alone cannot
    // tell a later reader which unknown person performed each event role.
    awareness.references?.forEach((reference, referenceOrdinal) => {
      if (reference.id === id)
        receivedParticipants.push({
          referenceOrdinal,
          participant,
        });
    });
    if (awareness.speech) {
      if (id === awareness.sourceId) speechParticipants.speaker = participant;
      if (id === awareness.targetId) speechParticipants.addressee = participant;
    }
    if (receivedSoundSource) soundSource = participant;
    attended ||=
      entries?.some((stored) => {
        const entry = readOnlyDraftView(stored);
        return entry.sourceId === id && entry.exposure.episodeId === lease.exposure;
      }) === true;
  }
  return result.length
    ? {
        context: { subjects: result, attended },
        participants: receivedParticipants,
        speechParticipants,
        ...(soundSource ? { soundSource } : {}),
      }
    : undefined;
}

export function acquireAwarenessObservation(
  world: WorldState,
  event: WorldEvent,
  awareness: Awareness,
  receivedPoint?: Position,
): ObservationContribution | undefined {
  if (
    awareness.eventId === event.id &&
    awareness.observation &&
    awareness.observation.observer.actorId === awareness.actorId
  )
    return cloneValue(awareness.observation);
  if (awareness.modality === 'internal') return;
  const observer = entityGet(world.entities, awareness.actorId);
  if (!observer?.actor) return;
  const receivedContext = awarenessBodyContext(world, awareness);
  // An encounter is the existing story wrapper for this native sight input. It
  // retains the received original; recording its prose does not sample sight again.
  if (
    event.type === 'encounter' &&
    event.data?.['acquisition'] === true &&
    !event.exposure &&
    awareness.targetId
  ) {
    const received = eligibleBodyLease(world, observer.id, awareness.targetId);
    if (received)
      return materializeObservation(
        world,
        currentFacetOriginal(world.perceptionEvidence![observer.id]!, received),
      );
  }
  if (event.type === 'contact') {
    const contactId = awareness.eventData?.['contactId'],
      senseId = awareness.eventData?.['senseId'],
      detail = awareness.eventData?.['detail'];
    if (
      typeof contactId !== 'string' ||
      typeof senseId !== 'string' ||
      (detail !== 'present' && detail !== 'moving')
    )
      return;
    const exposure: ObservationExposure = {
      observer: observerLife(observer),
      episodeId: contactId,
    };
    return acquireObservation(world, observer, {
      origin: {
        kind: 'exposure',
        episodeId: contactId,
        detectorId: senseId,
        measuredFrom: event.at,
        measuredThrough: event.at,
      },
      modality: 'touch',
      detector: { id: senseId, version: 1 },
      facets: [
        {
          role: 'direct',
          asOf: event.at,
          measuredFrom: event.at,
          measuredThrough: event.at,
          value: { kind: 'contact', exposure, detail },
        },
      ],
    });
  }
  const modality =
    awareness.modality === 'heard' ? 'hearing' : awareness.modality === 'felt' ? 'touch' : 'sight';
  const values: SensoryFacet[] = [
    {
      kind: 'detected',
      detected: modality === 'hearing' ? 'signal' : modality === 'touch' ? 'impact' : 'surface',
      limits: [],
    },
  ];
  if (event.exposure?.kind === 'place')
    values.push({
      kind: 'location',
      location: { kind: 'point', point: { ...event.exposure.point }, errorRadius: 0 },
      frame: { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) } },
    });
  if (awareness.exposure)
    values.push({ kind: 'encounter-exposure', exposure: cloneValue(awareness.exposure) });
  const visualSubjectId =
    awareness.sourceId === observer.id ? awareness.targetId : awareness.sourceId;
  const visualSubject =
    modality === 'sight' && visualSubjectId
      ? entityGet(world.entities, visualSubjectId)
      : undefined;
  // The physical producer already proved this occurrence point to its named
  // witnesses. Keep that received point instead of joining a present participant.
  if (receivedPoint)
    values.push({
      kind: 'location',
      location: { kind: 'point', point: { ...receivedPoint }, errorRadius: 0 },
      frame: {
        positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) },
        forwardAtObservation: observer.spatial.heading,
      },
    });
  if (visualSubject?.placement?.mode === 'world' && !event.exposure && !receivedPoint)
    values.push({
      kind: 'location',
      location: {
        kind: 'point',
        point: { ...readOnlyDraftView(worldPosition(visualSubject)) },
        errorRadius: 0,
      },
      frame: {
        positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) },
        forwardAtObservation: observer.spatial.heading,
      },
    });
  else if (modality === 'touch' && !receivedPoint)
    values.push({
      kind: 'location',
      location: {
        kind: 'point',
        point: { ...readOnlyDraftView(worldPosition(observer)) },
        errorRadius: effectiveBodyProfile(world, observer).radius,
      },
      frame: { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) } },
    });
  if (awareness.receivedFeatures)
    values.push({ kind: 'perceived-feature', sample: cloneValue(awareness.receivedFeatures) });
  if (awareness.sound) {
    if (awareness.sound.direction)
      values.push({
        kind: 'location',
        location: {
          kind: 'bearing',
          from: { ...awareness.sound.listenerPosition },
          ...awareness.sound.direction,
          spread: Math.PI / 4,
        },
        frame: { positionAtObservation: { ...awareness.sound.listenerPosition } },
      });
    values.push({
      kind: 'sound',
      sound: cloneValue(awareness.sound),
      ...(receivedContext?.soundSource ? { source: receivedContext.soundSource } : {}),
    });
  } else if (awareness.speech) {
    const speech = awareness.speech;
    if (speech.direction)
      values.push({
        kind: 'location',
        location: {
          kind: 'bearing',
          from: { ...speech.listenerPosition },
          ...speech.direction,
          spread: Math.PI / 4,
        },
        frame: { positionAtObservation: { ...speech.listenerPosition } },
      });
    const participants = receivedContext?.speechParticipants;
    values.push({
      kind: 'speech',
      speech: cloneValue(speech),
      ...(participants?.speaker || participants?.addressee ? { participants } : {}),
    });
  }
  if (!awareness.speech)
    values.push({
      kind: 'event',
      eventType: awareness.eventType ?? event.type,
      text: awareness.text,
      modality: awareness.modality,
      importance: awareness.importance,
      sequence: awareness.sequence,
      recognized: awareness.recognized,
      intelligible: awareness.intelligible,
      ...(awareness.entityEpisodes ? { entityEpisodes: cloneValue(awareness.entityEpisodes) } : {}),
      ...(awareness.triggerKind ? { triggerKind: awareness.triggerKind } : {}),
      ...(awareness.sourceSubject ? { sourceSubject: cloneValue(awareness.sourceSubject) } : {}),
      ...(awareness.urgency !== undefined ? { urgency: awareness.urgency } : {}),
      ...(awareness.content !== undefined ? { content: awareness.content } : {}),
      data: cloneValue(awareness.eventData ?? {}),
      references: cloneValue(awareness.references ?? []),
      ...(receivedContext?.participants.length
        ? { participants: receivedContext.participants }
        : {}),
    });
  const recognition = awareness.recognition;
  const associated = new Set<string>();
  if (recognition?.subject) {
    values.push({
      kind: 'association',
      subject: cloneValue(recognition.subject),
      strength: recognition.recognized ? 'supported' : 'possible',
      ...(recognition.learningSupport?.length
        ? { learningSupport: [...recognition.learningSupport] }
        : {}),
    });
    if (recognition.subject.kind === 'individual') associated.add(recognition.subject.individualId);
  }
  for (const candidate of recognition?.candidates ?? []) {
    if (associated.has(candidate.individualId)) continue;
    values.push({
      kind: 'association',
      subject: { kind: 'individual', individualId: candidate.individualId },
      strength:
        (recognition?.candidates.length ?? 0) > 1 || recognition?.moreCandidates
          ? 'ambiguous'
          : 'possible',
      ...(recognition?.learningSupport?.length
        ? { learningSupport: [...recognition.learningSupport] }
        : {}),
    });
    associated.add(candidate.individualId);
  }
  if (recognition?.learnedSubject) {
    values.push({
      kind: 'association',
      subject: cloneValue(recognition.learnedSubject),
      strength: 'supported',
      ...(recognition.learningSupport?.length
        ? { learningSupport: [...recognition.learningSupport] }
        : {}),
    });
    if (recognition.learnedSubject.kind === 'individual')
      associated.add(recognition.learnedSubject.individualId);
  }
  if (
    awareness.sourceSubject &&
    (awareness.sourceSubject.kind !== 'individual' ||
      !associated.has(awareness.sourceSubject.individualId))
  )
    values.push({
      kind: 'association',
      subject: cloneValue(awareness.sourceSubject),
      strength: awareness.recognized ? 'supported' : 'possible',
    });
  let contribution = acquireObservation(world, observer, {
    ...(receivedContext ? { context: receivedContext.context } : {}),
    origin: {
      kind: 'occurrence',
      eventId: event.id,
      at: event.at,
      order: event.order ?? event.sequence,
    },
    modality,
    detector: { id: `native:${modality}`, version: 1 },
    facets: values.map((value) => ({
      role:
        value.kind === 'association'
          ? 'inference'
          : awareness.exposure?.kind === 'place' &&
              awareness.exposure.reportedBy &&
              (value.kind === 'location' || value.kind === 'encounter-exposure')
            ? 'testimony'
            : 'direct',
      asOf: event.at,
      measuredFrom: event.at,
      measuredThrough: event.at,
      value,
    })),
  });
  const binding = awareness.sourceBody;
  const bodyLease =
    binding && binding.leaseId !== null && eligibleBodyLease(world, observer.id, binding.entityId);
  const boundBody =
    bodyLease &&
    bodyLease.id === binding!.leaseId &&
    bodyLease.subjectPhysicalLife === binding!.physicalLife
      ? bodyLease
      : undefined;
  const receivedBody =
    // A familiar unseen voice does not attach urgency to a body by canonical ID.
    // Hearing requires the exact actually seen speech-body grant from this event.
    boundBody ??
    (!awareness.speech && modality === 'sight' && visualSubjectId
      ? eligibleBodyLease(world, observer.id, visualSubjectId)
      : undefined);
  if (boundBody && recognition?.subject && recognition.recognized) {
    const ordinal = contribution.facets.findIndex(
      (facet) =>
        facet.value.kind === 'association' &&
        facet.value.strength === 'supported' &&
        JSON.stringify(facet.value.subject) === JSON.stringify(recognition.subject),
    );
    if (ordinal >= 0) {
      const state = owner(world, observer),
        original = currentOriginal(
          state,
          state.received[state.receipts[observationAcquisitionKey(contribution)]!]!,
        );
      replaceCurrentFacet(world, state, `${binding!.entityId}:association`, {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: binding!.entityId,
        subjectPhysicalLife: binding!.physicalLife,
        bodyLeaseId: boundBody.id,
        exposure: cloneValue(currentFacetExposure(state, boundBody)),
        original,
        originalOrdinal: ordinal,
        modality: 'sight',
        value: cloneValue(contribution.facets[ordinal]!.value),
        valueMeasuredFrom: event.at,
        valueMeasuredThrough: event.at,
        valueAcquiredAt: contribution.acquiredAt,
        confirmedFrom: event.at,
        confirmedThrough: event.at,
      });
      selectedAssociateBodyFamiliarity(world, observer.id, binding!.entityId);
    }
  }
  if (receivedBody) {
    const id = receivedBody.subjectId;
    const ordinal = contribution.facets.findIndex(
      (facet) => facet.value.kind === 'event' || facet.value.kind === 'speech',
    );
    const proof = observationFactKey(world, contribution, Math.max(0, ordinal));
    reconcileAttendedTemporalEvidence(
      world,
      observer.id,
      undefined,
      awareness.targetId === observer.id ? [id] : [],
      [id],
      false,
      [],
      { urgency: { [id]: awareness.urgency ?? 0 }, proofs: { [id]: proof } },
    );
  }
  const capturedContext = contribution.context;
  const state = owner(world, observer);
  if (
    capturedContext &&
    !capturedContext.attended &&
    state.attention?.entries.some((entry) =>
      capturedContext.subjects.some((subject) => subject.episodeId === entry.exposure.episodeId),
    )
  ) {
    // Selection belongs to this same atomic receipt boundary. No native callback
    // has received the original yet; keep one final immutable routing header.
    const selected = freeze(
      {
        ...contribution,
        context: { ...capturedContext, attended: true },
      },
      true,
    );
    const position = state.receipts[observationAcquisitionKey(contribution)]!;
    const original = currentOriginal(state, state.received[position]!);
    const selectedOriginal = immutableDataSnapshot<ReceivedObservation>(
      {
        ...original,
        context: selected.context,
      },
      readOnlyDraftView,
    );
    completePerceptionOriginal(state, selectedOriginal);
    contribution = selected;
  }
  return contribution;
}

export function receivedEventObservation(
  world: WorldState,
  observerId: string,
  eventId: string,
): ObservationContribution | undefined {
  const state = world.perceptionEvidence?.[observerId];
  const entry =
    state &&
    receivedPerceptionObservations(state).find(
      (observation) =>
        observation.origin.kind === 'occurrence' && observation.origin.eventId === eventId,
    );
  return entry && materializeObservation(world, entry);
}

/** Ground only an actually received complete clause. A source-complete prepared place
 * index is required; its absence throws the existing coherent-prefix preparation hold. */
export function acquireOrdinaryWarning(
  world: WorldState,
  event: WorldEvent,
  awareness: Awareness,
): ObservationContribution | undefined {
  if (awareness.speech?.perception !== 'heard' || !awareness.observation) return;
  const interpretation = selectedOrdinaryWarning(world, awareness.speech.segments);
  if (
    !interpretation ||
    world.simTime < event.at ||
    world.simTime >= event.at + interpretation.duration
  )
    return;
  const places = knownPlaceEvidence(world, awareness.actorId, interpretation.label);
  if (places.length !== 1) return;
  const place = places[0]!;
  const observer = entityGet(world.entities, awareness.actorId);
  if (!observer?.actor) return;
  const source = awareness.observation;
  const speechOrdinal = source.facets.findIndex((facet) => facet.value.kind === 'speech');
  if (speechOrdinal < 0) return;
  const speaker: EvidenceParticipant = awareness.sourceSubject
    ? { kind: 'individual', subject: cloneValue(awareness.sourceSubject) }
    : { kind: 'exposure', exposure: { observer: { ...source.observer }, episodeId: source.id } };
  const value: SensoryFacet = {
    kind: 'claim',
    claim: {
      kind: 'danger',
      where: cloneValue(place.location),
      when: {
        kind: 'stated-interval',
        from: event.at,
        through: event.at + interpretation.duration,
        precision: 'approximate',
      },
      presence: 'possible',
    },
    strength: 'possible',
    speaker,
    wordsAsHeard: awareness.speech.segments
      .flatMap((segment) => (segment.kind === 'heard' ? [segment.text] : []))
      .join(' '),
    support: [
      observationFactKey(world, source, speechOrdinal),
      { source: cloneValue(place.source), ordinal: place.facetOrdinal },
    ],
    supportAliases: [
      { family: 'awareness', id: event.id },
      ...(place.sourceEventId ? [{ family: 'awareness' as const, id: place.sourceEventId }] : []),
    ],
  };
  return acquireObservation(world, observer, {
    ...(source.context ? { context: source.context } : {}),
    origin: {
      kind: 'occurrence',
      eventId: event.id,
      at: event.at,
      order: event.order ?? event.sequence,
    },
    modality: 'hearing',
    detector: { id: 'native:grounded-warning', version: 1 },
    facets: [
      {
        role: 'testimony',
        asOf: event.at,
        measuredFrom: event.at,
        measuredThrough: event.at,
        value,
      },
    ],
  });
}

export { validatePerceptionEvidenceState } from './perception-validation.js';

/** Continuous touch is anonymous and supplies no hidden point or source association. */
export function reconcileContactEvidence(world: WorldState, observer: Entity): void {
  const state = owner(world, observer);
  return withCurrentOriginalBatch(world, observer.id, state, () => {
    const contacts = observer.actor?.contacts ?? {};
    const renewed = new Map<string, { previous: string; newLife: boolean }>();
    for (const [key, lease] of Object.entries(readOnlyDraftView(state.current))) {
      if (lease.modality !== 'touch') continue;
      const contact = contacts[lease.subjectId];
      const subject = entityGet(world.entities, lease.subjectId),
        physicalLife = subject?.actor ? (subject.actor.physicalLife ?? 0) : null,
        newLife = lease.subjectPhysicalLife !== physicalLife;
      if (
        !contact ||
        newLife ||
        lease.exposure !== contact.id ||
        (lease.value.kind === 'contact' &&
          (receivedFacetValue(world, lease.value) as Extract<SensoryFacet, { kind: 'contact' }>)
            ?.detail !== contact.detail)
      ) {
        if (contact) renewed.set(lease.subjectId, { previous: lease.id, newLife });
        finalizeLease(world, observer, lease);
        removeCurrentFacets(world, observer.id, [key]);
      }
    }
    for (const [sourceId, contact] of Object.entries(contacts)) {
      const key = `${sourceId}:contact`;
      const held = readOnlyDraftView(state.current)[key];
      const existing = held && readOnlyDraftView(held);
      if (existing) {
        if (currentFacetTimes(state, existing).confirmedThrough < world.simTime) {
          replaceCurrentFacet(world, state, key, {
            ...updateCurrentFacetTimes(state, existing, {
              confirmedThrough: world.simTime,
              valueMeasuredThrough: world.simTime,
              valueAcquiredAt: world.simTime,
            }),
            revision: existing.revision + 1,
          });
        }
        continue;
      }
      const exposure: ObservationExposure = {
        observer: observerLife(observer),
        episodeId: contact.id,
      };
      const subject = entityGet(world.entities, sourceId),
        physicalLife = subject?.actor ? (subject.actor.physicalLife ?? 0) : null,
        renewal = renewed.get(sourceId),
        measuredFrom = renewal?.newLife ? world.simTime : contact.changedAt;
      const value: SensoryFacet = { kind: 'contact', exposure, detail: contact.detail };
      const original = acquireReceivedObservation(world, observer, {
        origin: {
          kind: 'exposure',
          episodeId: contact.id,
          detectorId: JSON.stringify([
            contact.senseId,
            physicalLife,
            contact.detail,
            renewal?.previous ?? null,
          ]),
          measuredFrom,
          measuredThrough: world.simTime,
        },
        modality: 'touch',
        detector: { id: contact.senseId, version: 1 },
        facets: [
          {
            role: 'direct',
            asOf: world.simTime,
            measuredFrom,
            measuredThrough: world.simTime,
            value,
          },
        ],
      });
      replaceCurrentFacet(world, state, key, {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: sourceId,
        subjectPhysicalLife: physicalLife,
        exposure,
        original,
        originalOrdinal: 0,
        modality: 'touch',
        value,
        valueMeasuredFrom: measuredFrom,
        valueMeasuredThrough: world.simTime,
        valueAcquiredAt: world.simTime,
        confirmedFrom: measuredFrom,
        confirmedThrough: world.simTime,
      });
    }
  });
}

/** Current-format validation is shared by native restore and server record validation. */
export function validateObservationContribution(
  value: unknown,
  originals = new Map<string, string>(),
): asserts value is ObservationContribution {
  const observation = value as ObservationContribution | undefined;
  if (
    !observation ||
    typeof observation !== 'object' ||
    typeof observation.id !== 'string' ||
    !observation.id.startsWith('perception-observation-') ||
    !Number.isSafeInteger(observation.revision) ||
    observation.revision < 1 ||
    !observation.observer ||
    typeof observation.observer.actorId !== 'string' ||
    !Number.isSafeInteger(observation.observer.physicalLife) ||
    observation.observer.physicalLife < 0 ||
    !Number.isFinite(observation.acquiredAt) ||
    !['sight', 'hearing', 'touch'].includes(observation.modality) ||
    !validObservationDetector(observation.detector) ||
    !observation.origin ||
    !Array.isArray(observation.facets) ||
    observation.facets.some(
      (facet, ordinal) =>
        facet.ordinal !== ordinal ||
        !['direct', 'testimony', 'inference'].includes(facet.role) ||
        !Number.isFinite(facet.asOf) ||
        !Number.isFinite(facet.measuredFrom) ||
        !Number.isFinite(facet.measuredThrough) ||
        facet.measuredThrough < facet.measuredFrom ||
        !Number.isFinite(facet.acquiredAt) ||
        facet.measuredThrough > facet.acquiredAt ||
        facet.acquiredAt > observation.acquiredAt ||
        !facet.value ||
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
          'observed-motion',
          'contact',
          'speech',
          'perceived-feature',
          'sound',
          'encounter-exposure',
          'event',
          'association',
          'claim',
        ].includes(facet.value.kind),
    )
  )
    throw new Error('Invalid acquired perception evidence.');
  const context = observation.context;
  if (
    context !== undefined &&
    (!hasRecordFields(context, ['subjects', 'attended']) ||
      typeof context.attended !== 'boolean' ||
      !Array.isArray(context.subjects) ||
      !context.subjects.length ||
      new Set(context.subjects.map((subject) => subject?.episodeId)).size !==
        context.subjects.length ||
      context.subjects.some(
        (subject) =>
          !hasRecordFields(subject, ['observer', 'episodeId']) ||
          !hasRecordFields(subject.observer, ['actorId', 'physicalLife']) ||
          !isSafeRecordId(subject.episodeId) ||
          subject.observer.actorId !== observation.observer.actorId ||
          subject.observer.physicalLife !== observation.observer.physicalLife,
      ))
  )
    throw new Error('Invalid received occurrence context.');
  if (observation.origin.kind === 'occurrence') {
    if (
      typeof observation.origin.eventId !== 'string' ||
      !Number.isFinite(observation.origin.at) ||
      !Number.isSafeInteger(observation.origin.order)
    )
      throw new Error('Invalid perception occurrence binding.');
  } else if (
    observation.origin.kind !== 'exposure' ||
    typeof observation.origin.episodeId !== 'string' ||
    typeof observation.origin.detectorId !== 'string' ||
    !Number.isFinite(observation.origin.measuredFrom) ||
    !Number.isFinite(observation.origin.measuredThrough) ||
    observation.origin.measuredThrough < observation.origin.measuredFrom
  )
    throw new Error('Invalid perception exposure binding.');
  if (observation.origin.kind === 'exposure' && observation.origin.source) {
    validateEvidenceSource(observation.origin.source);
    if (canonicalJson(observation.origin.source.observer) !== canonicalJson(observation.observer))
      throw new Error('Foreign physical support root.');
  }
  const key = canonicalJson([observation.observer, observation.id, observation.revision]);
  const body = canonicalJson(observation),
    prior = originals.get(key);
  if (prior !== undefined && prior !== body)
    throw new Error('Conflicting original observation revision.');
  originals.set(key, body);
  for (const facet of observation.facets) {
    if (facet.support)
      validateReceivedFacetProof(facet.support, observation.observer, observation.acquiredAt);
    validateSensoryFacet(facet.value, originals);
    validateReceivedParticipantObservers(facet.value, observation.observer);
    if (
      facet.value.kind === 'observed-motion' &&
      [facet.value.earlier, facet.value.later].some(
        (sample) =>
          sample.acquiredAt > observation.acquiredAt ||
          sample.confirmedThrough > observation.acquiredAt,
      )
    )
      throw new Error('Perception support was acquired after its containing contribution.');
  }
}

function validReceivedExposureParticipant(
  value: unknown,
): value is Extract<EvidenceParticipant, { kind: 'exposure' }> {
  return (
    hasRecordFields(value, ['kind', 'exposure']) &&
    value.kind === 'exposure' &&
    hasRecordFields(value.exposure, ['observer', 'episodeId']) &&
    isSafeRecordId(value.exposure.episodeId) &&
    hasRecordFields(value.exposure.observer, ['actorId', 'physicalLife']) &&
    isSafeRecordId(value.exposure.observer.actorId) &&
    typeof value.exposure.observer.physicalLife === 'number' &&
    Number.isSafeInteger(value.exposure.observer.physicalLife) &&
    value.exposure.observer.physicalLife >= 0
  );
}

/** A retained role may never borrow another observer's body correspondence. */
export function validateReceivedParticipantObservers(
  value: SensoryFacet,
  observer: ObserverLife,
): void {
  const participants =
    value.kind === 'event'
      ? (value.participants?.map((entry) => entry.participant) ?? [])
      : value.kind === 'speech'
        ? Object.values(value.participants ?? {})
        : value.kind === 'sound' && value.source
          ? [value.source]
          : [];
  const owners = participants.map((participant) => participant.exposure.observer);
  if (value.kind === 'contact') owners.push(value.exposure.observer);
  if (value.kind === 'claim' && value.speaker.kind === 'exposure')
    owners.push(value.speaker.exposure.observer);
  if (value.kind === 'observed-motion')
    owners.push(
      value.exposure.observer,
      value.earlier.original.source.observer,
      value.later.original.source.observer,
    );
  if (
    owners.some(
      (owner) => owner.actorId !== observer.actorId || owner.physicalLife !== observer.physicalLife,
    )
  )
    throw new Error('Foreign received participant.');
}

export function validateReceivedFacetProof(
  proof: ReceivedFacetProof,
  observer: ObserverLife,
  through = Infinity,
): void {
  if (
    !proof ||
    !hasRecordFields(
      proof,
      ['original', 'confirmation', 'confirmedFrom', 'confirmedThrough'],
      ['aliases'],
    ) ||
    !hasRecordFields(proof.original, ['source', 'ordinal'])
  )
    throw new Error('Invalid selected facet support.');
  validateEvidenceSource(proof.original.source);
  validateEvidenceSource(proof.confirmation);
  if (
    !Number.isSafeInteger(proof.original.ordinal) ||
    proof.original.ordinal < 0 ||
    !Number.isFinite(proof.confirmedFrom) ||
    !Number.isFinite(proof.confirmedThrough) ||
    proof.confirmedFrom > proof.confirmedThrough ||
    proof.confirmedThrough > through ||
    canonicalJson(proof.original.source.observer) !== canonicalJson(observer) ||
    canonicalJson(proof.confirmation.observer) !== canonicalJson(observer) ||
    (proof.aliases !== undefined &&
      (!Array.isArray(proof.aliases) || proof.aliases.some((id) => !isSafeRecordId(id))))
  )
    throw new Error('Invalid selected facet support.');
}

export interface ObservationDependency {
  source: EvidenceSource;
  ordinal: number | null;
  aliases: string[];
}
export function sensoryFacetDependencies(
  value: SensoryFacet,
  support?: ReceivedFacetProof,
): ObservationDependency[] {
  const result: ObservationDependency[] = [];
  const fact = (key: ObservationFactKey, aliases: string[] = []) =>
    result.push({ source: key.source, ordinal: key.ordinal, aliases });
  if (support) {
    fact(support.original, support.aliases ?? []);
    result.push({ source: support.confirmation, ordinal: support.original.ordinal, aliases: [] });
  }
  if (value.kind === 'claim')
    for (const key of value.support)
      fact(
        key,
        (value.supportAliases ?? []).map((alias) => alias.id),
      );
  if (value.kind === 'physical-boundary')
    for (const support of [value.boundary.nearSurface.support, value.boundary.farSurface.support])
      fact(support, [personalFactAlias(support.source.id, support.ordinal)]);
  if (value.kind === 'observed-motion')
    for (const sample of [value.earlier, value.later]) {
      fact(sample.original, sample.aliases ?? []);
      result.push({ source: sample.confirmation, ordinal: sample.original.ordinal, aliases: [] });
    }
  return result;
}

export function validateObservedBodyPose(pose: ObservedBodyPose): void {
  if (
    !pose ||
    !validPoint(pose.position) ||
    !Number.isFinite(pose.heading) ||
    (pose.supportSurfaceId !== null && typeof pose.supportSurfaceId !== 'string')
  )
    throw new Error('Invalid observed body placement.');
}
export function validateObservedBodyDetails(body: ObservedBodyDetails): void {
  if (
    !body ||
    typeof body.kind !== 'string' ||
    typeof body.appearance !== 'string' ||
    !Number.isFinite(body.radius) ||
    body.radius < 0 ||
    !Number.isFinite(body.height) ||
    body.height <= 0 ||
    !Array.isArray(body.outward) ||
    body.outward.length !== 4 ||
    body.outward.some((state) => typeof state !== 'string')
  )
    throw new Error('Invalid observed body.');
  if (
    (body.quantity !== undefined && (!Number.isFinite(body.quantity) || body.quantity < 0)) ||
    (body.description !== undefined && typeof body.description !== 'string') ||
    (body.heatLit !== undefined && typeof body.heatLit !== 'boolean') ||
    (body.remainsPhase !== undefined &&
      !['fresh', 'rotting', 'removed'].includes(body.remainsPhase)) ||
    (body.storage !== undefined &&
      (!hasRecordFields(body.storage, ['placementRevision']) ||
        !Number.isSafeInteger(body.storage.placementRevision) ||
        body.storage.placementRevision < 0)) ||
    (body.label !== undefined && (typeof body.label.name !== 'string' || !body.label.name))
  )
    throw new Error('Invalid observed outward detail.');
  if (body.assembly !== undefined) validateObservedAssembly(body.assembly);
  if (
    (body.subtype !== undefined && typeof body.subtype !== 'string') ||
    (body.icon !== undefined && typeof body.icon !== 'string') ||
    (body.bodyPlan !== undefined && !['biped', 'quadruped', 'avian'].includes(body.bodyPlan)) ||
    (body.effects !== undefined &&
      (!Array.isArray(body.effects) ||
        body.effects.some(
          (effect) =>
            !effect ||
            typeof effect.id !== 'string' ||
            typeof effect.label !== 'string' ||
            (effect.pose !== undefined && effect.pose !== 'horizontal') ||
            (effect.particle !== undefined &&
              (typeof effect.particle.text !== 'string' ||
                effect.particle.anchor !== 'head' ||
                effect.particle.motion !== 'floatAway')),
        )))
  )
    throw new Error('Invalid observed outward presentation.');
  if (
    body.animation !== undefined &&
    body.animation !== null &&
    (typeof body.animation.id !== 'string' ||
      !['punch', 'melee'].includes(body.animation.kind) ||
      !['windup', 'recovery'].includes(body.animation.phase) ||
      !Number.isFinite(body.animation.progress) ||
      body.animation.progress < 0 ||
      body.animation.progress > 1 ||
      !Number.isFinite(body.animation.direction?.x) ||
      !Number.isFinite(body.animation.direction?.z) ||
      (body.animation.tool !== undefined && typeof body.animation.tool !== 'string'))
  )
    throw new Error('Invalid observed action pose.');
}

export function validateSensoryFacet(
  value: SensoryFacet,
  originals = new Map<string, string>(),
): void {
  switch (value.kind) {
    case 'surface-patch':
      validateReceivedSurfacePatch(value.patch);
      break;
    case 'physical-boundary':
      validateReceivedBoundary(value.boundary);
      break;
    case 'encounter-exposure':
      if (!validEncounterExposure(value.exposure))
        throw new Error('Invalid received encounter exposure.');
      break;
    case 'detected':
      if (
        !['signal', 'surface', 'body', 'impact'].includes(value.detected) ||
        !Array.isArray(value.limits) ||
        value.limits.some((limit) => typeof limit !== 'string')
      )
        throw new Error('Invalid perception detection.');
      break;
    case 'location':
      validateObservedLocation(value.location);
      if (!validObservationFrame(value.frame))
        throw new Error('Invalid original observation frame.');
      break;
    case 'description':
      if (!hasRecordFields(value, ['kind', 'text']) || typeof value.text !== 'string')
        throw new Error('Invalid received description.');
      break;
    case 'body':
      validateObservedBodyPose(value.body);
      validateObservedBodyDetails(value.body);
      break;
    case 'carried':
      if (
        !Array.isArray(value.items) ||
        value.items.some(
          (item) =>
            !item || typeof item.itemKindAsObserved !== 'string' || !item.itemKindAsObserved.trim(),
        )
      )
        throw new Error('Invalid observed equipment.');
      break;
    case 'pile-contents':
      if (
        !Array.isArray(value.items) ||
        value.items.some(
          (item) =>
            !item ||
            typeof item.id !== 'string' ||
            typeof item.definitionId !== 'string' ||
            typeof item.name !== 'string' ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0 ||
            typeof item.portable !== 'boolean',
        )
      )
        throw new Error('Invalid observed ground-pile contents.');
      break;
    case 'public-attributes':
      if (
        !Array.isArray(value.attributes) ||
        value.attributes.some(
          (attribute) =>
            !attribute ||
            !isSafeRecordId(attribute.id) ||
            !Number.isSafeInteger(attribute.version) ||
            attribute.version < 1 ||
            !Number.isSafeInteger(attribute.revision) ||
            attribute.revision < 0 ||
            typeof attribute.name !== 'string' ||
            !attribute.name ||
            !attribute.presentation ||
            typeof attribute.presentation.icon !== 'string' ||
            !attribute.presentation.icon ||
            typeof attribute.presentation.color !== 'string' ||
            !attribute.presentation.color ||
            !['meter', 'category'].includes(attribute.display) ||
            !['unknown', 'known'].includes(attribute.status) ||
            (attribute.status === 'unknown'
              ? attribute.value !== null
              : attribute.display === 'meter'
                ? typeof attribute.value !== 'number' || !Number.isFinite(attribute.value)
                : typeof attribute.value !== 'string') ||
            (attribute.display === 'meter' &&
              (typeof attribute.min !== 'number' ||
                typeof attribute.max !== 'number' ||
                !Number.isFinite(attribute.min) ||
                !Number.isFinite(attribute.max) ||
                attribute.min >= attribute.max ||
                typeof attribute.unit !== 'string')) ||
            [attribute.meaning, attribute.condition, attribute.concern].some(
              (text) => text !== undefined && typeof text !== 'string',
            ) ||
            [attribute.bodyHealth, attribute.critical, attribute.editorCritical].some(
              (flag) => flag !== undefined && typeof flag !== 'boolean',
            ) ||
            (attribute.changeFeedback !== undefined && attribute.changeFeedback !== 'effects') ||
            (attribute.editorCriticalComparison !== undefined &&
              (!['lessThan', 'lessThanOrEqual'].includes(
                attribute.editorCriticalComparison.operator,
              ) ||
                !['none', 'nearest-integer'].includes(
                  attribute.editorCriticalComparison.rounding,
                ) ||
                !Number.isFinite(attribute.editorCriticalComparison.value) ||
                (attribute.editorCriticalComparison.unit !== undefined &&
                  attribute.editorCriticalComparison.unit !== 'fractionOfRange'))),
        )
      )
        throw new Error('Invalid observed public attributes.');
      break;
    case 'observed-motion': {
      for (const sample of [value.earlier, value.later]) {
        validateObservedLocation(sample.location);
        validateEvidenceSource(sample.original.source);
        validateEvidenceSource(sample.confirmation);
        if (
          sample.location.kind !== 'point' ||
          !validObservationFrame(sample.frame) ||
          !Number.isSafeInteger(sample.original.ordinal) ||
          sample.original.ordinal < 0 ||
          ![
            sample.measuredFrom,
            sample.measuredThrough,
            sample.acquiredAt,
            sample.confirmedFrom,
            sample.confirmedThrough,
          ].every(Number.isFinite) ||
          sample.measuredFrom !== sample.measuredThrough ||
          sample.measuredThrough > sample.acquiredAt ||
          sample.confirmedFrom > sample.confirmedThrough ||
          (sample.aliases !== undefined &&
            (!Array.isArray(sample.aliases) || sample.aliases.some((id) => !isSafeRecordId(id)))) ||
          canonicalJson(sample.original.source.observer) !==
            canonicalJson(value.exposure.observer) ||
          canonicalJson(sample.confirmation.observer) !== canonicalJson(value.exposure.observer)
        )
          throw new Error('Received motion requires completed point samples.');
      }
      if (
        value.correspondence !== 'unambiguous-received-continuity' ||
        !value.exposure?.episodeId ||
        value.earlier.measuredThrough >= value.later.measuredFrom ||
        value.earlier.acquiredAt > value.later.acquiredAt ||
        value.earlier.confirmation.id !== value.later.confirmation.id
      )
        throw new Error('Invalid received motion correspondence.');
      break;
    }
    case 'speech':
      validatePerceivedSpeech(value.speech);
      if (
        value.participants !== undefined &&
        (!hasRecordFields(value.participants, [], ['speaker', 'addressee']) ||
          Object.values(value.participants).some(
            (participant) => !validReceivedExposureParticipant(participant),
          ))
      )
        throw new Error('Invalid received speech participants.');
      break;
    case 'perceived-feature':
      validateReceivedFeatures(value.sample);
      break;
    case 'sound':
      validatePerceivedSound(value.sound);
      if (value.source !== undefined && !validReceivedExposureParticipant(value.source))
        throw new Error('Invalid received sound source.');
      break;
    case 'association':
      if (
        !validObserverSubject(value.subject) ||
        !['supported', 'possible', 'ambiguous'].includes(value.strength) ||
        (value.learningSupport !== undefined &&
          (!Array.isArray(value.learningSupport) ||
            value.learningSupport.some((id) => !validReceivedRecognitionSupportKey(id))))
      )
        throw new Error('Invalid acquired association.');
      break;
    case 'contact':
      if (
        !value.exposure ||
        typeof value.exposure.episodeId !== 'string' ||
        !['present', 'moving'].includes(value.detail)
      )
        throw new Error('Invalid anonymous contact evidence.');
      break;
    case 'event':
      if (
        typeof value.eventType !== 'string' ||
        typeof value.text !== 'string' ||
        !['observed', 'heard', 'felt', 'internal'].includes(value.modality) ||
        !Number.isFinite(value.importance) ||
        value.importance < 0 ||
        value.importance > 10 ||
        !Number.isSafeInteger(value.sequence) ||
        value.sequence < 0 ||
        typeof value.recognized !== 'boolean' ||
        typeof value.intelligible !== 'boolean' ||
        (value.triggerKind !== undefined &&
          ![
            'addressed_speech',
            'overheard_speech',
            'self_event',
            'directed_action',
            'observed_event',
          ].includes(value.triggerKind)) ||
        (value.sourceSubject !== undefined && !validObserverSubject(value.sourceSubject)) ||
        (value.entityEpisodes !== undefined &&
          (!value.entityEpisodes ||
            typeof value.entityEpisodes !== 'object' ||
            Array.isArray(value.entityEpisodes) ||
            Object.entries(value.entityEpisodes).some(
              ([id, episode]) =>
                !value.references.some((reference) => reference.id === id) ||
                typeof episode !== 'string' ||
                !episode,
            ))) ||
        (value.urgency !== undefined &&
          (!Number.isFinite(value.urgency) || value.urgency < 0 || value.urgency > 10)) ||
        (value.content !== undefined && typeof value.content !== 'string') ||
        !value.data ||
        typeof value.data !== 'object' ||
        Array.isArray(value.data) ||
        Object.values(value.data).some(
          (part) =>
            part !== null &&
            typeof part !== 'string' &&
            typeof part !== 'boolean' &&
            !(typeof part === 'number' && Number.isFinite(part)),
        ) ||
        !Array.isArray(value.references) ||
        value.references.some(
          (reference) =>
            !reference ||
            typeof reference.id !== 'string' ||
            typeof reference.label !== 'string' ||
            !['actor', 'target', 'participant'].includes(reference.role),
        ) ||
        (value.participants !== undefined &&
          (!Array.isArray(value.participants) ||
            value.participants.length > value.references.length ||
            new Set(value.participants.map((entry) => entry?.referenceOrdinal)).size !==
              value.participants.length ||
            value.participants.some(
              (entry) =>
                !hasRecordFields(entry, ['referenceOrdinal', 'participant']) ||
                !Number.isSafeInteger(entry.referenceOrdinal) ||
                entry.referenceOrdinal < 0 ||
                entry.referenceOrdinal >= value.references.length ||
                !validReceivedExposureParticipant(entry.participant),
            )))
      )
        throw new Error('Invalid permitted event detail.');
      break;
    case 'claim':
      validateObservedLocation(value.claim.where);
      if (
        value.claim.kind !== 'danger' ||
        value.claim.presence !== 'possible' ||
        value.claim.when.kind !== 'stated-interval' ||
        value.claim.when.precision !== 'approximate' ||
        !Number.isFinite(value.claim.when.from) ||
        !Number.isFinite(value.claim.when.through) ||
        value.claim.when.through <= value.claim.when.from ||
        value.strength !== 'possible' ||
        typeof value.wordsAsHeard !== 'string' ||
        !value.wordsAsHeard.trim() ||
        !Array.isArray(value.support) ||
        value.support.length < 2
      )
        throw new Error('Invalid attributed danger testimony.');
      for (const support of value.support) {
        validateEvidenceSource(support.source);
        if (!Number.isSafeInteger(support.ordinal) || support.ordinal < 0)
          throw new Error('Invalid warning source facet.');
      }
      if (
        value.supportAliases !== undefined &&
        (!Array.isArray(value.supportAliases) ||
          value.supportAliases.some(
            (alias) =>
              !alias || alias.family !== 'awareness' || typeof alias.id !== 'string' || !alias.id,
          ))
      )
        throw new Error('Invalid warning correction alias.');
      if (
        !value.speaker ||
        (value.speaker.kind === 'individual'
          ? !validObserverSubject(value.speaker.subject)
          : value.speaker.kind === 'exposure'
            ? !validReceivedExposureParticipant(value.speaker)
            : value.speaker.kind !== 'described' ||
              typeof value.speaker.descriptionAsHeard !== 'string')
      )
        throw new Error('Invalid heard warning speaker.');
      break;
    default:
      throw new Error('Invalid received sensory facet.');
  }
}
