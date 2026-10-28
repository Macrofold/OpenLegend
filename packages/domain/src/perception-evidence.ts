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
import { personalFactAlias } from './experience-source.js';
import type { DetectionSupportState } from './perception-support.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { effectiveBodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { outwardStates } from './perception-frame.js';
import { equippedItems } from './equipment.js';
import { itemsForOwner } from './objects.js';
import { retainObservationConfirmation } from './experience.js';
import {
  currentDetailedAttention,
  currentAttentionCues,
  nextAttentionWorkAt,
  updateAttention,
  type AttentionEntry,
  type AttentionUpdate,
} from './attention.js';
import { validateReceivedSurfacePatch, validateReceivedBoundary } from './received-geometry.js';
import {
  appendTemporalReceipt,
  captureTemporalCurrent,
  captureTemporalObservation,
  temporalFacetInput,
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
import { receivedValueAt, retainReceivedValue } from './received-values.js';
import { capabilityBlocked, projectStatusEffects } from './status-capabilities.js';
import { sensesFor, visionRadius } from './perception.js';
import { projectAttributes, type AttributeView } from './world-modules.js';
import type { Awareness } from './experience.js';
import type { ObserverSubject } from './knowledge.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

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
export type SensoryFacet =
  | { kind: 'surface-patch'; patch: import('./received-geometry.js').ObservedSurfacePatch }
  | { kind: 'physical-boundary'; boundary: import('./received-geometry.js').ObservedBoundary }
  | { kind: 'detected'; detected: 'signal' | 'surface' | 'body' | 'impact'; limits: string[] }
  | { kind: 'location'; location: ObservedLocation; frame: ObservationFrame }
  | { kind: 'body'; body: ObservedBody }
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
      earlier: CapturedLocationSample;
      later: CapturedLocationSample;
      correspondence: 'unambiguous-received-continuity';
    }
  | { kind: 'confirmation'; snapshot: CapturedCurrentFacet }
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
export interface ObservationFacet {
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
  kind: SensoryFacet['kind'];
  reference: readonly [blockId: string, valueOrdinal: number];
  reception?: { kind: 'location'; frameRef: readonly [blockId: string, valueOrdinal: number] };
}
export interface ReceivedObservationFacet {
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
  };
}

const receivedLocations = new WeakMap<
  ObservedLocation,
  WeakMap<ObservationFrame, Extract<SensoryFacet, { kind: 'location' }>>
>();

/** A reference resolves only an already selected personal facet. It grants no
 * observer/life, source identity, current body or historical membership. */
export function receivedFacetValue(
  world: WorldState,
  descriptor: ReceivedFacetValue,
): SensoryFacet | undefined {
  const value = receivedValueAt(world.receivedValues?.sources ?? {}, {
    blockId: descriptor.reference[0],
    valueOrdinal: descriptor.reference[1],
  });
  if (!value || value.kind !== descriptor.kind) return;
  if (value.kind === 'location') {
    if (descriptor.reception?.kind !== 'location') return;
    const location = readOnlyDraftView(value.location),
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
  const fragments = [
    { reference: source.headerRef },
    ...source.facets.map((facet) => facet.value),
    ...source.facets.flatMap((facet) =>
      facet.value.reception ? [{ reference: facet.value.reception.frameRef }] : [],
    ),
  ].map((value) =>
    receivedValueAt(world.receivedValues?.sources ?? {}, {
      blockId: value.reference[0],
      valueOrdinal: value.reference[1],
    }),
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

function retainFacetValue(world: WorldState, value: SensoryFacet) {
  value = readOnlyDraftView(value);
  let fragment: import('./received-values.js').ReceivedValueFragment = value;
  let reception: ReceivedFacetValue['reception'];
  let frameBytes = 0;
  if (value.kind === 'location') {
    const location = readOnlyDraftView(value.location);
    const reusable = isImmutableData(location);
    let neutral = reusable ? locationFragments.get(location) : undefined;
    if (!neutral) {
      neutral = immutableDataSnapshot({ kind: 'location' as const, location }, readOnlyDraftView);
      if (reusable) locationFragments.set(location, neutral);
    }
    fragment = neutral;
    const received = retainObservationFrame(world, value.frame);
    reception = { kind: 'location', frameRef: received.reference };
    frameBytes = received.addedBytes;
  }
  const retained = retainReceivedValue(
    world,
    fragment,
    selectedTemporalPolicy(world).recent.chunkBytes,
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
    | 'value'
  > {
  original: ObservationContribution;
  value: SensoryFacet;
  confirmation: Extract<EvidenceSource, { family: 'native-exposure' | 'native-response' }>;
}
/** Public presentation needs the permitted value and its times, without the
 * complete original/confirmation envelope needed by evidence consumers. */
export type CurrentFacetValue = Pick<
  LiveFacetSupport,
  'id' | 'valueMeasuredFrom' | 'valueMeasuredThrough' | 'valueAcquiredAt' | 'confirmedThrough'
> & { value: SensoryFacet; source: EvidenceSource };
export type CapturedLocationSample = CapturedCurrentFacet & {
  value: Extract<SensoryFacet, { kind: 'location' }>;
};
/** Current spatial readers need measured values and their exact provenance, not
 * a second historical account/confirmation wrapper for every body and location. */
export interface BodyGeometrySample {
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
  body: ObservedBody;
  sample: BodyGeometrySample;
  location?: LocationGeometrySample;
  motion?: { earlier: LocationGeometrySample; later: LocationGeometrySample };
}
export interface PerceptionEvidenceOwner {
  /** One completed full sight phase renews only its extant supported sight facets.
   * Independent values/losses remain in current. Effective readers apply this
   * actual receiver frame and timing without rewriting stationary detail. */
  visualConfirmation?: {
    through: number;
    revision: number;
    frameRef: readonly [blockId: string, valueOrdinal: number];
    frameRevision: number;
  };
  geometry?: import('./received-geometry.js').ReceivedGeometryState;
  attention?: import('./attention.js').AttentionState;
  life: number;
  /** Residency boundary only. Explicit acquired bodies, never this number, define a cut. */
  receivedAtSequence: number;
  received: ReceivedObservation[];
  receipts: Record<string, number>;
  current: Record<string, LiveFacetSupport>;
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
  let next = nextAttentionWorkAt(world, observerId) ?? Infinity;
  const nextSight = observer.sensoryProgress?.routineSight?.nextAt ?? world.simTime;
  if (
    geometry &&
    !geometry.finished &&
    geometry.fragments.length + geometry.boundaries.length <
      selectedAttentionPolicy(world).geometry.maxFragments
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
const measuredSources = new WeakMap<ReceivedObservation, { leaseId: string; token: string }>();
interface VisualSourceValues {
  location: Extract<ObservedLocation, { kind: 'point' }>;
  facets: readonly SensoryFacet[];
}
/** The native frame owns this finite cache. Its complete source token covers only
 * common outward values; each admitted receiver still supplies its own frame,
 * detector, time, exposure, association and evidence envelope. */
const visualSourceValues = new WeakMap<
  (id: string) => string | undefined,
  Map<string, { token: string; values: VisualSourceValues }>
>();
function prepareVisualSourceValues(
  world: WorldState,
  subject: Entity,
  sourceToken: ((id: string) => string | undefined) | undefined,
  token: string | undefined,
  publicAttributes: readonly AttributeView[],
): VisualSourceValues {
  let prepared = sourceToken && visualSourceValues.get(sourceToken);
  const prior = prepared?.get(subject.id);
  if (token && prior?.token === token) {
    countDomainWork('visualSourcePreparationReuses');
    return prior.values;
  }
  countDomainWork('visualSourcePreparations');
  const profile = effectiveBodyProfile(world, subject),
    placement = subject.placement!;
  const body: ObservedBody = {
    kind: subject.kind,
    position: { ...readOnlyDraftView(worldPosition(subject)) },
    heading: subject.spatial.heading,
    appearance: subject.appearance ?? 'sprite',
    radius: profile.radius,
    height: profile.height,
    supportSurfaceId: worldSupport(subject),
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
      subject.resource ? world.itemDefinitions[subject.resource.definitionId]?.icon : subject.icon
    )
      ? {
          icon: subject.resource
            ? world.itemDefinitions[subject.resource.definitionId]!.icon
            : subject.icon,
        }
      : {}),
    label: selectedOutwardBodyName(world, subject),
    ...((subject.actor?.description ?? subject.description)
      ? { description: subject.actor?.description ?? subject.description }
      : {}),
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
    { kind: 'body', body },
    {
      kind: 'carried',
      items: equippedItems(world, subject.id).flatMap((item) => {
        const definition = world.itemDefinitions[item.definitionId];
        return definition ? [{ itemKindAsObserved: definition.name }] : [];
      }),
    },
  ];
  if (subject.kind === 'item-pile' || subject.remains)
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
  if (publicAttributes.length)
    facets.push({ kind: 'public-attributes', attributes: [...publicAttributes] });
  const values = immutableDataSnapshot(
    { location: { kind: 'point' as const, point: body.position, errorRadius: 0 }, facets },
    readOnlyDraftView,
  );
  if (sourceToken && token) {
    if (!prepared) visualSourceValues.set(sourceToken, (prepared = new Map()));
    prepared.set(subject.id, { token, values });
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
  const states = (world.perceptionEvidence ??= {});
  let state = states[observer.id];
  const life = observer.actor?.physicalLife ?? 0;
  if (!state || state.life !== life)
    state = states[observer.id] = {
      life,
      receivedAtSequence: world.sequence,
      received: [],
      receipts: {},
      current: {},
      gaps: {},
    };
  if (state.receivedAtSequence !== world.sequence) {
    state.received = [];
    state.receipts = {};
    state.receivedAtSequence = world.sequence;
  }
  return state;
}
/** Transient reception lasts through its actual receiving phase. A later native
 * phase cannot turn an old sound into permanent awareness for a memoryless actor. */
export function beginPerceptionPhase(world: WorldState, observerId: string): void {
  const state = world.perceptionEvidence?.[observerId];
  if (
    !state?.received.length ||
    state.received.every(
      (observation) => receivedObservationHeader(world, observation).acquiredAt >= world.simTime,
    )
  )
    return;
  state.received = state.received.filter(
    (observation) => receivedObservationHeader(world, observation).acquiredAt >= world.simTime,
  );
  state.receipts = Object.fromEntries(
    state.received.map((observation, index) => [
      observationAcquisitionKey({
        ...receivedObservationHeader(world, observation),
        origin: observation.origin,
      }),
      index,
    ]),
  );
  state.receivedAtSequence = world.sequence;
}
const owner = perceptionEvidenceOwner;
/** A working phase owns this map after its first write. Replacing its container
 * once avoids drafting every changed key; publication and private forks still
 * seal independent snapshots through the existing world owner. */
function writableCurrent(state: PerceptionEvidenceOwner): PerceptionEvidenceOwner['current'] {
  const current = state.current;
  if (isDraft(current)) {
    const view = readOnlyDraftView(current);
    // Editable input worlds still need Immer's child isolation. Published
    // immutable leases can bypass those proxies without exposing prior writes.
    state.current = { ...(isImmutableData(view) ? view : current) };
  } else if (Object.isFrozen(current)) state.current = { ...current };
  return state.current;
}
/** Completed live envelopes use the same immutable ownership as their originals.
 * Later native changes replace the envelope; raw world builders stay editable. */
function replaceCurrentFacet(
  world: WorldState,
  state: PerceptionEvidenceOwner,
  key: string,
  value: Omit<LiveFacetSupport, 'value'> & { value: SensoryFacet | ReceivedFacetValue },
): void {
  let stored: LiveFacetSupport;
  if ('reference' in value.value) stored = value as LiveFacetSupport;
  else {
    const retained = retainFacetValue(world, value.value);
    if (retained.addedBytes) chargeWork({ outputBytes: retained.addedBytes });
    stored = { ...value, value: retained.value };
  }
  writableCurrent(state)[key] =
    isDraft(world) && Object.isFrozen(draftOriginal(world)!)
      ? immutableDataSnapshot(stored, readOnlyDraftView)
      : stored;
}
export const observationFactKey = (
  world: WorldState,
  observation:
    | Pick<ObservationContribution, 'id' | 'revision' | 'observer'>
    | Pick<ReceivedObservation, 'id' | 'revision' | 'headerRef'>,
  ordinal: number,
): ObservationFactKey => ({
  source: {
    family: 'native-exposure',
    observer: immutableDataSnapshot(
      'headerRef' in observation
        ? receivedObservationHeader(world, observation).observer
        : observation.observer,
      readOnlyDraftView,
    ),
    id: observation.id,
    revision: observation.revision,
  },
  ordinal,
});

/** Trusted producers pass an already-permitted body. No source lookup strengthens it here.
 * The transition's actual receipts survive nested event callbacks. Durable memory owns its
 * contribution afterward; active exposure is not a second lifetime history database.
 * docs/projects/perspective-perception-tech-design.md#three-representations-one-observation */
type ObservationInput = Omit<
  ObservationContribution,
  'id' | 'revision' | 'observer' | 'acquiredAt' | 'facets'
> & {
  facets: Array<Omit<ObservationFacet, 'ordinal' | 'acquiredAt'>>;
};

function acquireReceivedObservation(
  world: WorldState,
  observer: Entity,
  input: ObservationInput,
): ReceivedObservation {
  const state = owner(world, observer),
    key = observationAcquisitionKey(input),
    index = state.receipts[key],
    prior = index === undefined ? undefined : state.received[index];
  if (prior) return readOnlyDraftView(prior);
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
        const retained = retainFacetValue(world, facet.value);
        addedBytes += retained.addedBytes;
        return {
          ...(facet.role !== 'direct' ? { role: facet.role } : {}),
          ...(facet.asOf !== facet.measuredThrough ? { asOf: facet.asOf } : {}),
          ...(facet.measuredFrom !== from ? { measuredFrom: facet.measuredFrom } : {}),
          ...(facet.measuredThrough !== through ? { measuredThrough: facet.measuredThrough } : {}),
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
  state.received.push(contribution);
  return contribution;
}

/** Semantic accounts own a complete immutable proof. Routine native current
 * reception uses the compact constructor above instead of expanding every pair. */
export function acquireObservation(
  world: WorldState,
  observer: Entity,
  input: ObservationInput,
): ObservationContribution {
  const existing = owner(world, observer).receipts[observationAcquisitionKey(input)] !== undefined;
  const source = acquireReceivedObservation(world, observer, input);
  const complete = materializeObservation(world, source);
  if (!existing) chargeWork({ outputBytes: jsonEncoding(complete).bytes });
  return complete;
}

/** Old originals may remain after body replacement until the next native phase.
 * Current reception belongs only to the actual observer life; hearing needs no
 * visual sense or lasting-memory capability. Historical accounts stay separate. */
export function currentReceivedObservations(
  world: WorldState,
  observerId: string,
): { physicalLife: number; observations: readonly ObservationContribution[] } {
  const observer = entityGet(readOnlyDraftView(world.entities), observerId);
  const physicalLife = observer?.actor?.physicalLife ?? 0;
  const owners = readOnlyDraftView(world).perceptionEvidence;
  const stored = owners && readOnlyDraftView(owners)[observerId];
  const state = stored && readOnlyDraftView(stored);
  return {
    physicalLife,
    observations:
      observer?.actor && state?.life === physicalLife
        ? readOnlyDraftView(state.received).map((source) => materializeObservation(world, source))
        : [],
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
  const current =
    state?.life === life.physicalLife &&
    entity.actor.alive &&
    activelyParticipates(entity) &&
    !capabilityBlocked(world, entity, 'perception')
      ? Object.values(state.current)
          .filter((lease) => currentLeaseEligible(world, observerId, lease))
          .map((lease) =>
            captureCurrentFacet(world, effectiveCurrentFacetSupport(world, observerId, lease)),
          )
      : [];
  const acquired = new Map<string, ObservationContribution>();
  for (const contribution of [
    ...retained,
    ...currentReceivedObservations(world, observerId).observations,
    ...currentReceivedGeometry(world, observerId).observations,
    ...current.map((facet) => facet.original),
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
    return observation.facets.every(({ value, ordinal }) => {
      if (value.kind === 'confirmation') return supported(value.snapshot.original);
      if (value.kind === 'observed-motion')
        return supported(value.earlier.original) && supported(value.later.original);
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
  return cut.acquired.every(supported) && cut.current.every((facet) => supported(facet.original));
}
/** Fully immutable originals share directly; mutable builder/restored sources must
 * detach their current facts on every read without changing an earlier captured cut. */
function immutableObservation(value: ObservationContribution): ObservationContribution {
  return immutableDataSnapshot(value, readOnlyDraftView);
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
    value: latest,
    ...fields
  } = readOnlyDraftView(lease);
  const value = receivedFacetValue(world, latest);
  if (!value) throw new Error('Selected current value is unavailable.');
  return immutableDataSnapshot<CapturedCurrentFacet>(
    {
      ...fields,
      original: materializeObservation(world, original),
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
export function effectiveCurrentFacetSupport(
  world: WorldState,
  observerId: string,
  lease: LiveFacetSupport,
): LiveFacetSupport {
  const value = readOnlyDraftView(lease),
    stored = world.perceptionEvidence?.[observerId],
    state = stored && readOnlyDraftView(stored),
    completed = state?.visualConfirmation;
  const confirmation = completed && readOnlyDraftView(completed);
  if (
    value.modality !== 'sight' ||
    !confirmation ||
    value.observer.physicalLife !== state?.life ||
    ![
      'detected',
      'body',
      'carried',
      'pile-contents',
      'public-attributes',
      'association',
      'location',
    ].includes(value.value.kind) ||
    confirmation.through < value.confirmedThrough
  )
    return value;
  const through = confirmation.through;
  const facet = readOnlyDraftView(value.value);
  return {
    ...value,
    revision: Math.max(value.revision, confirmation.revision),
    confirmedThrough: through,
    ...(value.value.kind === 'association'
      ? {}
      : facet.kind === 'location'
        ? {
            valueMeasuredFrom: through,
            valueMeasuredThrough: through,
            valueAcquiredAt: through,
            value: {
              ...facet,
              reception: { kind: 'location' as const, frameRef: confirmation.frameRef },
            },
          }
        : { valueMeasuredThrough: through, valueAcquiredAt: through }),
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
function bodyReadScope(world: WorldState, observerId: string) {
  const state = world.perceptionEvidence?.[observerId],
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
    body(subjectId: string): LiveFacetSupport | undefined {
      const stored = current[`${subjectId}:body`],
        lease = stored && readOnlyDraftView(stored),
        subject = entityGet(entities, subjectId);
      return lease &&
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
): LiveFacetSupport | undefined {
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
/** Owned values for the current scene, sharing observer checks within this
 * synchronous read only. Full event/cognition cuts retain their existing owner. */
export function currentBodyGeometryInputs(
  world: WorldState,
  observerId: string,
): CurrentBodyGeometryInput[] {
  const scope = bodyReadScope(world, observerId);
  if (!scope) return [];
  const result: CurrentBodyGeometryInput[] = [];
  const interval = (
    lease: Pick<
      LiveFacetSupport,
      'valueMeasuredFrom' | 'valueMeasuredThrough' | 'originalOrdinal'
    > & { original: Parameters<typeof observationFactKey>[1] },
  ): BodyGeometrySample => ({
    valueMeasuredFrom: lease.valueMeasuredFrom,
    valueMeasuredThrough: lease.valueMeasuredThrough,
    fact: observationFactKey(world, lease.original, lease.originalOrdinal),
  });
  const locationSample = (
    lease: Pick<
      CapturedLocationSample,
      'value' | 'valueMeasuredFrom' | 'valueMeasuredThrough' | 'original' | 'originalOrdinal'
    >,
  ): LocationGeometrySample => ({
    ...interval(lease),
    location: cloneValue(lease.value.location),
  });
  for (const stored of Object.values(scope.current)) {
    const lease = readOnlyDraftView(stored);
    if (lease.value.kind !== 'body' || lease.subjectId === observerId) continue;
    const admitted = scope.body(lease.subjectId);
    if (!admitted || admitted.value.kind !== 'body') continue;
    const bodyValue = receivedFacetValue(world, admitted.value);
    if (bodyValue?.kind !== 'body') continue;
    const body = effectiveCurrentFacetSupport(world, observerId, admitted);
    const location = scope.current[`${lease.subjectId}:location`];
    const point = location && effectiveCurrentFacetSupport(world, observerId, location);
    const pointValue = point && receivedFacetValue(world, point.value);
    const motionSource = scope.current[`${lease.subjectId}:observed-motion`];
    const motion = motionSource && receivedFacetValue(world, readOnlyDraftView(motionSource).value);
    result.push({
      sourceId: lease.subjectId,
      exposure: lease.exposure.episodeId,
      body: cloneValue(bodyValue.body),
      sample: interval(body),
      ...(pointValue?.kind === 'location'
        ? {
            location: {
              ...interval(point!),
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
  const stored = world.perceptionEvidence?.[observerId]?.current;
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
  body: LiveFacetSupport | undefined,
  association: LiveFacetSupport | undefined,
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
      association.original,
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
  lease: LiveFacetSupport,
  graceSeconds: number,
): void {
  if (lease.value.kind !== 'body' || graceSeconds <= 0 || lease.original.origin.kind !== 'exposure')
    return;
  state.gaps[lease.subjectId] = {
    episodeId: lease.original.origin.episodeId,
    lostAt: world.simTime,
    through: world.simTime + graceSeconds,
    physicalLife: lease.subjectPhysicalLife,
  };
}

const CURRENT_BODY_FACET_KINDS = [
  'detected',
  'location',
  'body',
  'carried',
  'pile-contents',
  'public-attributes',
  'contact',
  'association',
  'observed-motion',
] as const;
/** Exact selected IDs avoid traversing and copying every unattended body's detail. */
function selectedCurrentSupports(
  world: WorldState,
  observerId: string,
  current: PerceptionEvidenceOwner['current'] | undefined,
  exposures: ReadonlyMap<string, string>,
  measuredSubjects?: ReadonlySet<string>,
): LiveFacetSupport[] {
  const held = current && readOnlyDraftView(current);
  return [...exposures].flatMap(([id, exposure]) =>
    CURRENT_BODY_FACET_KINDS.flatMap((kind) => {
      const lease = held?.[`${id}:${kind}`];
      return lease?.exposure.episodeId === exposure
        ? [
            !measuredSubjects || measuredSubjects.has(id)
              ? effectiveCurrentFacetSupport(world, observerId, lease)
              : readOnlyDraftView(lease),
          ]
        : [];
    }),
  );
}

function currentObservedSupports(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kinds: readonly (typeof CURRENT_BODY_FACET_KINDS)[number][],
): LiveFacetSupport[] {
  const state = world.perceptionEvidence?.[observerId];
  const observer = entityGet(world.entities, observerId);
  if (
    !observer?.actor?.alive ||
    !activelyParticipates(observer) ||
    capabilityBlocked(world, observer, 'perception') ||
    state?.life !== (observer.actor.physicalLife ?? 0)
  )
    return [];
  const subject = entityGet(world.entities, subjectId);
  if (!subject) return [];
  return kinds
    .flatMap((kind) => state.current[`${subjectId}:${kind}`] ?? [])
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
  return currentObservedSupports(world, observerId, subjectId, kinds).map((lease) =>
    captureCurrentFacet(world, effectiveCurrentFacetSupport(world, observerId, lease)),
  );
}

/** The same live eligibility as captured evidence, projected before detaching.
 * Mutable builders remain editable; only requested values are detached. */
export function currentObservedFacetValues(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kinds: readonly (typeof CURRENT_BODY_FACET_KINDS)[number][] = CURRENT_BODY_FACET_KINDS,
): CurrentFacetValue[] {
  return currentObservedSupports(world, observerId, subjectId, kinds).map((lease) => {
    const value = effectiveCurrentFacetSupport(world, observerId, lease);
    const received = receivedFacetValue(world, value.value);
    if (!received) throw new Error('Selected current value is unavailable.');
    return immutableDataSnapshot<CurrentFacetValue>(
      {
        id: value.id,
        value: received,
        valueMeasuredFrom: value.valueMeasuredFrom,
        valueMeasuredThrough: value.valueMeasuredThrough,
        valueAcquiredAt: value.valueAcquiredAt,
        confirmedThrough: value.confirmedThrough,
        source: observationFactKey(world, value.original, value.originalOrdinal).source,
      },
      readOnlyDraftView,
    );
  });
}

/** Presence-only presentation must not capture a motion's endpoint proof graph. */
export function hasCurrentObservedFacet(
  world: WorldState,
  observerId: string,
  subjectId: string,
  kind: (typeof CURRENT_BODY_FACET_KINDS)[number],
): boolean {
  return currentObservedSupports(world, observerId, subjectId, [kind]).length > 0;
}
function currentLeaseEligible(
  world: WorldState,
  observerId: string,
  lease: LiveFacetSupport,
): boolean {
  const association = lease.value.kind === 'association' && receivedFacetValue(world, lease.value);
  if (
    association &&
    association.kind === 'association' &&
    associationEvidenceStatus(
      world,
      observerId,
      association,
      lease.original,
      lease.originalOrdinal,
    ) !== 'retained'
  )
    return false;
  const subject = entityGet(world.entities, lease.subjectId);
  if (
    !activelyParticipates(subject) ||
    lease.subjectPhysicalLife !== (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)
  )
    return false;
  if (lease.modality === 'sight') return !!eligibleBodyLease(world, observerId, lease.subjectId);
  const observer = entityGet(world.entities, observerId);
  return (
    !!observer &&
    sensesFor(world, observer).some(
      (sense) => sense.id === receivedObservationHeader(world, lease.original).detector.id,
    )
  );
}

function finalizeLease(world: WorldState, observer: Entity, lease: LiveFacetSupport): void {
  lease = effectiveCurrentFacetSupport(world, observer.id, lease);
  // Memoryless native policies already own their retained response capsule. A
  // dropped live facet does not create an unused autobiographical confirmation.
  if (!hasMemory(observer)) return;
  if (
    currentDetailedAttention(world, observer.id).some(
      (entry) =>
        entry.sourceId === lease.subjectId && entry.exposure.episodeId === lease.exposure.episodeId,
    )
  )
    appendTemporalReceipt(
      world,
      observer.id,
      {
        subject: lease.exposure.episodeId,
        change: 'loss',
        sourceIds: [lease.original.id],
        facets: [temporalFacetInput(world, readOnlyDraftView(lease))],
      },
      selectedTemporalPolicy(world).recent,
    );
  // Ending a routine measurement is not a reason to write a permanent diary.
  // Historical attention above and exact consumer-owned support remain independent.
  if (
    selectedRecordingReason(world, {
      source: 'confirmation',
      own: false,
      hasExposure: false,
      consequence: false,
    }) === 'none'
  )
    return;
  const snapshot = captureCurrentFacet(world, lease);
  const contribution = acquireObservation(world, observer, {
    origin: {
      kind: 'exposure',
      episodeId: lease.exposure.episodeId,
      detectorId: `${lease.id}:${lease.revision}`,
      measuredFrom: lease.confirmedFrom,
      measuredThrough: lease.confirmedThrough,
    },
    modality: lease.modality,
    detector: { id: 'native:confirmation', version: 1 },
    facets: [
      {
        role: 'direct',
        asOf: lease.valueMeasuredThrough,
        measuredFrom: lease.valueMeasuredFrom,
        measuredThrough: lease.valueMeasuredThrough,
        value: { kind: 'confirmation', snapshot },
      },
    ],
  });
  const retainedValue = receivedFacetValue(world, lease.value)!;
  const description =
    retainedValue.kind === 'carried'
      ? retainedValue.items.map((item) => item.itemKindAsObserved).join(', ') ||
        'no visible equipment'
      : retainedValue.kind === 'body'
        ? retainedValue.body.outward.filter(Boolean).join(', ')
        : retainedValue.kind === 'location'
          ? 'a previously observed location'
          : 'a previously detected presence';
  retainObservationConfirmation(
    world,
    observer.id,
    contribution,
    `Last confirmed: ${description}.`,
    world.cognitionPolicy.recording.exposureImportance,
  );
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
): void {
  const state = owner(world, observer);
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
  for (const [id, gap] of Object.entries(state.gaps))
    if (gap.through < world.simTime) delete state.gaps[id];
  const eligible = new Map(
    subjects.map(
      (entity) => [entity.id, entity.actor ? (entity.actor.physicalLife ?? 0) : null] as const,
    ),
  );
  for (const [key, stored] of Object.entries(readOnlyDraftView(state.current))) {
    const lease = readOnlyDraftView(stored);
    if (lease.modality === 'sight' && lease.subjectPhysicalLife !== eligible.get(lease.subjectId)) {
      attentionChanges.add(lease.subjectId);
      if (lease.value.kind === 'body' && lease.localSubject?.kind === 'individual')
        lostIndividuals.add(lease.localSubject.individualId);
      retainVisualGap(world, state, lease, episodeGraceSeconds);
      finalizeLease(world, observer, lease);
      delete writableCurrent(state)[key];
    }
  }
  for (const subject of subjects) {
    chargeWork({ tests: 1 });
    if (frameChanged) attentionChanges.add(subject.id);
    delete state.gaps[subject.id];
    const exposed = world.perceptionEpisodes?.[observer.id]?.[subject.id];
    if (subject.placement?.mode !== 'world') continue;
    const placement = subject.placement;
    const token = sourceToken?.(subject.id),
      heldBody = readOnlyDraftView(state.current)[`${subject.id}:body`],
      heldOriginal = heldBody && readOnlyDraftView(heldBody).original,
      measuredSource = heldOriginal && measuredSources.get(readOnlyDraftView(heldOriginal));
    if (
      token &&
      heldBody &&
      !subject.assembly &&
      measuredSource?.leaseId === heldBody.id &&
      measuredSource.token === token
    ) {
      const location = readOnlyDraftView(state.current)[`${subject.id}:location`];
      const motionKey = `${subject.id}:observed-motion`,
        storedMotion = readOnlyDraftView(state.current)[motionKey],
        motion = storedMotion && readOnlyDraftView(storedMotion);
      if (motion && location && world.simTime > motion.valueMeasuredThrough) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, motion);
        delete writableCurrent(state)[motionKey];
      }
      if (subject.actor && !heldBody.localSubject) {
        const local = selectedBodyIndividual(world, observer.id, subject.id);
        if (local)
          replaceCurrentFacet(world, state, `${subject.id}:body`, {
            ...readOnlyDraftView(heldBody),
            localSubject: local,
          });
      }
      continue;
    }
    const prepared = prepareVisualSourceValues(
      world,
      subject,
      sourceToken,
      token,
      sourcePublicAttributes?.(subject.id) ?? projectAttributes(world, subject, 'public'),
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
    const detected = readOnlyDraftView(state.current)[`${subject.id}:detected`],
      detectedLease = detected && readOnlyDraftView(detected);
    let original = detectedLease?.original,
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
        facets: values.map((facet) => ({
          role: 'direct',
          asOf: world.simTime,
          measuredFrom: world.simTime,
          measuredThrough: world.simTime,
          value: facet,
        })),
      });
      if (state.received.length > before) admittedOriginal = original;
    }
    const priorExposure = detectedLease && readOnlyDraftView(detectedLease.exposure),
      receivedObserver = readOnlyDraftView(receivedObservationHeader(world, original).observer);
    const exposure = immutableDataSnapshot<ObservationExposure>(
      priorExposure?.episodeId === original.id &&
        priorExposure.observer.actorId === receivedObserver.actorId &&
        priorExposure.observer.physicalLife === receivedObserver.physicalLife
        ? priorExposure
        : { observer: receivedObserver, episodeId: original.id },
      readOnlyDraftView,
    );
    let earlierLocation: CapturedLocationSample | undefined;
    values.forEach((facet, ordinal) => {
      chargeWork({ tests: 1 });
      const key = `${subject.id}:${facet.kind}`;
      let prior = readOnlyDraftView(state.current)[key];
      // Equality and semantic comparison read completed values, not deep Immer proxies.
      // Drafting every unchanged nested body here makes later native previews copy it.
      const priorLease = prior && readOnlyDraftView(prior),
        previousValue = priorLease && receivedFacetValue(world, priorLease.value);
      // A complete sight phase owns one shared receiver frame. Moving the
      // observer does not require replacing every stationary source location.
      const changed =
        !previousValue ||
        (previousValue.kind === 'location' && facet.kind === 'location'
          ? jsonText(previousValue.location) !== jsonText(facet.location)
          : jsonText(previousValue) !== jsonText(facet));
      if (changed) attentionChanges.add(subject.id);
      if (
        prior &&
        priorLease &&
        facet.kind === 'location' &&
        previousValue?.kind === 'location' &&
        previousValue.location.kind === 'point' &&
        facet.location.kind === 'point' &&
        priorLease.motionContinuityRevision === (placement.motionContinuityRevision ?? 0) &&
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
        if (previous.valueMeasuredThrough < world.simTime)
          earlierLocation = captureCurrentFacet(world, previous) as CapturedLocationSample;
      }
      let facetOriginal = original;
      if (prior && previousValue && changed && semanticFacetChanged(previousValue, facet)) {
        finalizeLease(world, observer, prior);
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
          facets: [
            {
              role: 'direct',
              asOf: world.simTime,
              measuredFrom: world.simTime,
              measuredThrough: world.simTime,
              value: facet,
            },
          ],
        });
        if (facet.kind === 'body' || facet.kind === 'public-attributes') {
          // The same observed body/contact continues while its semantic fact changes.
          prior = {
            ...readOnlyDraftView(prior),
            original: facetOriginal,
            originalOrdinal: 0,
            confirmedFrom: world.simTime,
          };
        } else {
          delete writableCurrent(state)[key];
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
            facets: [
              {
                role: 'direct',
                asOf: world.simTime,
                measuredFrom: world.simTime,
                measuredThrough: world.simTime,
                value: facet,
              },
            ],
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
              : copyFacetValue(facet),
          valueMeasuredFrom: world.simTime,
          valueMeasuredThrough: world.simTime,
          valueAcquiredAt: world.simTime,
          confirmedFrom: world.simTime,
          confirmedThrough: world.simTime,
        });
      } else if (changed) {
        replaceCurrentFacet(world, state, key, {
          ...readOnlyDraftView(prior),
          revision: prior.revision + 1,
          confirmedThrough: world.simTime,
          value: copyFacetValue(facet),
          valueMeasuredFrom: world.simTime,
          valueMeasuredThrough: world.simTime,
          valueAcquiredAt: world.simTime,
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
    if (subject.actor && currentBody && !currentBody.localSubject) {
      const localSubject = selectedBodyIndividual(world, observer.id, subject.id);
      if (localSubject)
        replaceCurrentFacet(world, state, `${subject.id}:body`, {
          ...currentBody,
          localSubject,
        });
    }
    const storedLocation = readOnlyDraftView(state.current)[`${subject.id}:location`],
      locationLease = storedLocation && readOnlyDraftView(storedLocation);
    const motionKey = `${subject.id}:observed-motion`;
    const laterLocation =
      earlierLocation &&
      locationLease &&
      (captureCurrentFacet(world, locationLease) as CapturedLocationSample | undefined);
    const motion =
      earlierLocation &&
      laterLocation &&
      earlierLocation.value.location.kind === 'point' &&
      laterLocation.value.location.kind === 'point' &&
      Math.hypot(
        earlierLocation.value.location.point.x - laterLocation.value.location.point.x,
        earlierLocation.value.location.point.y - laterLocation.value.location.point.y,
        earlierLocation.value.location.point.z - laterLocation.value.location.point.z,
      ) >
        earlierLocation.value.location.errorRadius + laterLocation.value.location.errorRadius
        ? immutableDataSnapshot(
            {
              kind: 'observed-motion' as const,
              exposure: locationLease!.exposure,
              earlier: earlierLocation,
              later: laterLocation,
              correspondence: 'unambiguous-received-continuity' as const,
            },
            readOnlyDraftView,
          )
        : undefined;
    const storedMotion = readOnlyDraftView(state.current)[motionKey],
      priorMotion = storedMotion && readOnlyDraftView(storedMotion);
    if (!motion) {
      if (
        priorMotion &&
        (!locationLease ||
          // This actual sight phase confirms the point even when its stored value
          // is unchanged. Cold/full and held-token refreshes end old motion alike.
          world.simTime > priorMotion.valueMeasuredThrough ||
          priorMotion.motionContinuityRevision !== locationLease?.motionContinuityRevision)
      ) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, priorMotion);
        delete writableCurrent(state)[motionKey];
      }
    } else if (priorMotion) {
      replaceCurrentFacet(world, state, motionKey, {
        ...priorMotion,
        revision: priorMotion.revision + 1,
        value: motion,
        valueMeasuredFrom: earlierLocation!.valueMeasuredFrom,
        valueMeasuredThrough: world.simTime,
        valueAcquiredAt: world.simTime,
        confirmedThrough: world.simTime,
      });
    } else {
      const received = acquireReceivedObservation(world, observer, {
        origin: {
          kind: 'exposure',
          episodeId: locationLease!.exposure.episodeId,
          detectorId: `${detector.id}:motion`,
          measuredFrom: earlierLocation!.valueMeasuredFrom,
          measuredThrough: world.simTime,
        },
        modality: 'sight',
        detector,
        facets: [
          {
            role: 'direct',
            asOf: world.simTime,
            measuredFrom: earlierLocation!.valueMeasuredFrom,
            measuredThrough: world.simTime,
            value: motion,
          },
        ],
      });
      replaceCurrentFacet(world, state, motionKey, {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: motion.exposure.observer,
        subjectId: subject.id,
        subjectPhysicalLife: locationLease!.subjectPhysicalLife,
        motionContinuityRevision: locationLease!.motionContinuityRevision,
        exposure: motion.exposure,
        original: received,
        originalOrdinal: 0,
        modality: 'sight',
        value: motion,
        valueMeasuredFrom: earlierLocation!.valueMeasuredFrom,
        valueMeasuredThrough: world.simTime,
        valueAcquiredAt: world.simTime,
        confirmedFrom: world.simTime,
        confirmedThrough: world.simTime,
      });
    }
    const kinds = new Set(values.map((facet) => facet.kind));
    for (const kind of ['pile-contents', 'public-attributes'] as const) {
      const key = `${subject.id}:${kind}`;
      const removed = readOnlyDraftView(state.current)[key];
      if (removed && !kinds.has(kind)) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, readOnlyDraftView(removed));
        delete writableCurrent(state)[key];
      }
    }
    const measured = readOnlyDraftView(state.current)[`${subject.id}:body`];
    if (token && measured)
      measuredSources.set(readOnlyDraftView(readOnlyDraftView(measured).original), {
        leaseId: measured.id,
        token,
      });
  }
  pruneLostBodyIndividuals(world, observer.id, lostIndividuals);
  const revision = (priorConfirmation?.revision ?? 0) + 1;
  state.visualConfirmation = {
    through: world.simTime,
    revision,
    frameRef: receivedFrame.reference,
    frameRevision: frameChanged ? revision : priorConfirmation!.frameRevision,
  };
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
  );
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
): void {
  const priorCues = new Set(currentAttentionCues(world, observerId).map((cue) => cue.id));
  const recordedGeometry = reconcileAttendedTemporalEvidence(
    world,
    observerId,
    beforeAttention,
    [],
    attentionChanges,
    creditContacts,
    newGeometry,
  );
  evaluateAttentionRelations(world, observerId);
  const newCues = currentAttentionCues(world, observerId).filter((cue) => !priorCues.has(cue.id));
  if (!newCues.length) return;
  const geometry = currentReceivedGeometry(world, observerId).observations;
  for (const cue of newCues) {
    const anchor = currentDetailedAttention(world, observerId).find(
      (entry) => entry.key === cue.anchorKey,
    );
    if (!anchor) continue;
    for (const observation of geometry) {
      if (recordedGeometry?.has(observation.id)) continue;
      const facts = cue.proof.filter(
        (fact) =>
          fact.source.id === observation.id && fact.source.revision === observation.revision,
      );
      if (!facts.length) continue;
      for (const facet of observation.facets)
        if (facet.value.kind === 'physical-boundary')
          for (const support of [
            facet.value.boundary.nearSurface.support,
            facet.value.boundary.farSurface.support,
          ]) {
            if (recordedGeometry?.has(support.source.id)) continue;
            const original = geometry.find((value) => value.id === support.source.id);
            if (original)
              captureTemporalObservation(
                world,
                observerId,
                original,
                [original.id, cue.id],
                false,
                selectedTemporalPolicy(world).recent,
                { contextSubjects: [anchor.exposure.episodeId], change: 'baseline' },
              );
          }
      captureTemporalObservation(
        world,
        observerId,
        observation,
        [observation.id, cue.id],
        false,
        selectedTemporalPolicy(world).recent,
        {
          subject: anchor.exposure.episodeId,
          ordinals: new Set(facts.map((fact) => fact.ordinal)),
        },
      );
    }
  }
}

/** Recording context links actual received geometry to the attended exposures at
 * this boundary. It asserts no spatial relation or scene meaning. Entry baselines
 * reuse the original facts/times; unchanged confirmation alone writes nothing. */
function captureAttendedGeometryContext(
  world: WorldState,
  observerId: string,
  previous: readonly AttentionEntry[],
  acquired: readonly ObservationContribution[],
  options: { confirmHeld?: boolean; rebaselineMissing?: boolean } = {},
): ReadonlySet<string> | undefined {
  const { confirmHeld = false, rebaselineMissing = false } = options;
  const entries = currentDetailedAttention(world, observerId);
  const oldContexts = new Set(previous.map((entry) => entry.exposure.episodeId));
  const newContexts = entries
    .map((entry) => entry.exposure.episodeId)
    .filter((id) => !oldContexts.has(id));
  const active = new Set([...oldContexts, ...entries.map((entry) => entry.exposure.episodeId)]);
  const changedScope = oldContexts.size !== entries.length || newContexts.length > 0;
  if (!active.size || (!acquired.length && !changedScope && !confirmHeld && !rebaselineMissing))
    return;
  const geometry = currentReceivedGeometry(world, observerId);
  const available = geometry.observations;
  const byId = new Map(available.map((observation) => [observation.id, observation]));
  const fresh = new Set(acquired.map((observation) => observation.id));
  const scopes = new Map<string, { observation: ObservationContribution; subjects: Set<string> }>();
  const include = (observation: ObservationContribution, subjects: Iterable<string>) => {
    let scope = scopes.get(observation.id);
    if (!scope) scopes.set(observation.id, (scope = { observation, subjects: new Set() }));
    for (const subject of subjects) scope.subjects.add(subject);
  };
  for (const observation of acquired) include(observation, active);
  if (newContexts.length) for (const observation of available) include(observation, newContexts);
  if (confirmHeld || rebaselineMissing) {
    const captures = world.experience?.temporal?.actors[observerId]?.captures;
    for (const observation of available)
      if (!captures?.[observation.id]) include(observation, active);
  }
  // A received edge needs its actual near/far patch facts even when those were
  // acquired before this recording scope began. Never consult today's terrain.
  for (const { observation, subjects } of scopes.values())
    for (const facet of observation.facets)
      if (facet.value.kind === 'physical-boundary')
        for (const support of [
          facet.value.boundary.nearSurface.support,
          facet.value.boundary.farSurface.support,
        ]) {
          const original = byId.get(support.source.id);
          if (original) include(original, subjects);
        }
  // Replacing expired payload restores only missing baselines. Unaffected held
  // intervals close at a real scope/view boundary or cognition cut, not eviction.
  // docs/projects/attention-and-scenes-tech-design.md#53-recent-chronology-without-narrative-boundaries
  if (changedScope || confirmHeld) {
    const captures = world.experience?.temporal?.actors[observerId]?.captures;
    for (const { observation, subjects } of scopes.values()) {
      const held = captures?.[observation.id];
      // One actual boundary can both close held support and introduce the same
      // original to a new recording scope. Preserve the outgoing scope only when
      // its interval really extends; no second copy of the fact/time is needed.
      if (held && geometry.supportedThrough > (held.confirmedThrough ?? observation.acquiredAt))
        for (const subject of held.contextSubjects ?? []) subjects.add(subject);
    }
    finalizeTemporalGeometrySupport(
      world,
      observerId,
      available.filter((observation) => !scopes.has(observation.id)),
      geometry.supportedThrough,
      selectedTemporalPolicy(world).recent,
    );
  }
  const captured = new Set<string>();
  // Source patches precede their dependent boundaries in this owned collection.
  for (const observation of available) {
    const scope = scopes.get(observation.id);
    if (!scope) continue;
    const receipt = captureTemporalObservation(
      world,
      observerId,
      observation,
      [observation.id],
      false,
      selectedTemporalPolicy(world).recent,
      {
        contextSubjects: [...scope.subjects],
        change: fresh.has(observation.id) ? 'change' : 'baseline',
        confirmedThrough: geometry.supportedThrough,
      },
    );
    if (receipt) captured.add(observation.id);
  }
  reconcileTemporalGeometryCaptures(
    world,
    observerId,
    new Set(available.map((observation) => observation.id)),
    entries.map((entry) => entry.exposure.episodeId),
  );
  return captured;
}

/** Seal the existing receiver's supported static interval before a cognition cut.
 * No sensing, contact credit or lasting account is created by this preparation. */
export function captureCurrentGeometrySupport(world: WorldState, observerId: string): void {
  const observer = entityGet(world.entities, observerId);
  if (!observer || !hasMemory(observer)) return;
  captureAttendedGeometryContext(
    world,
    observerId,
    currentDetailedAttention(world, observerId),
    [],
    { confirmHeld: true },
  );
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
  cues: Pick<AttentionUpdate, 'urgency' | 'proofs'> = {},
): ReadonlySet<string> | undefined {
  const observer = entityGet(world.entities, observerId);
  if (!observer || !hasMemory(observer)) return;
  const history = world.experience?.temporal?.actors[observerId];
  const rebaseline = history?.capturesInvalidated === true;
  const priorEntries = currentDetailedAttention(world, observerId).filter((entry) =>
    before.has(entry.sourceId),
  );
  const result = updateAttention(world, observerId, { directSubjects, changedSourceIds, ...cues });
  const after = new Set(result.after);
  const selected = new Set([...before, ...after]);
  const storedCurrent = world.perceptionEvidence?.[observerId]?.current;
  const current = storedCurrent && readOnlyDraftView(storedCurrent);
  const selectedExposures = new Map(
    [...selected].flatMap((id) => {
      const body = current?.[`${id}:body`];
      return body ? [[id, body.exposure.episodeId] as const] : [];
    }),
  );
  const entering = new Set([...after].filter((id) => !before.has(id))),
    exiting = new Set([...before].filter((id) => !after.has(id)));
  const measured =
    changedSourceIds && !rebaseline
      ? new Set([...changedSourceIds.filter((id) => selected.has(id)), ...entering, ...exiting])
      : undefined;
  const contacts = new Map<string, ObserverSubject>();
  if (creditContacts)
    for (const id of selected) {
      const body = current?.[`${id}:body`];
      if (!body) continue;
      const subject = currentBodyAssociation(world, observerId, id) ?? body.localSubject;
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
  const captureNeeded = !measured || measured.size > 0;
  const captured = captureNeeded
    ? captureTemporalCurrent(
        world,
        observerId,
        selectedCurrentSupports(world, observerId, current, selectedExposures, measured),
        entering,
        selectedTemporalPolicy(world).recent,
        exiting,
        new Set(contacts.keys()),
        changedSourceIds && !rebaseline ? new Set(changedSourceIds) : undefined,
      )
    : [];
  const creditedSources: string[] = [];
  for (const entry of captured) {
    const subject = contacts.get(entry.subjectId);
    if (!subject || !entry.body || entry.body.confirmedThrough !== world.simTime) continue;
    const ordinal = entry.receipt.facets.find(
      (facet) => facet.receivedFrom?.id === entry.body!.id,
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
          return body ? [[id, body.exposure.episodeId] as const] : [];
        }),
      );
      const leases = selectedCurrentSupports(world, observerId, current, exposures, affected);
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
  const geometry = captureAttendedGeometryContext(world, observerId, priorEntries, newGeometry, {
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
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  const observer = entityGet(world.entities, observerId);
  if (subjectId === undefined && (!modality || modality === 'sight'))
    endReceivedGeometry(world, observerId);
  const lostIndividuals = new Set<string>();
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
      delete writableCurrent(state)[key];
      changed = true;
    }
  if (subjectId !== undefined && !changed) return;
  pruneLostBodyIndividuals(world, observerId, lostIndividuals);
  reconcileAttendedTemporalEvidence(world, observerId);
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
    if (
      !lease ||
      !detected ||
      lease.value.kind !== 'body' ||
      detected.original.origin.kind !== 'exposure' ||
      (lease.subjectPhysicalLife !== null &&
        (episode === undefined || detected.original.origin.episodeId !== episode)) ||
      detected.exposure.episodeId !== lease.exposure.episodeId ||
      detected.observer.actorId !== lease.observer.actorId ||
      detected.observer.physicalLife !== lease.observer.physicalLife ||
      receivedObservationHeader(world, lease.original).acquiredAt > awareness.at
    )
      continue;
    const receivedSoundSource =
      visibleSound?.entityId === id &&
      visibleSound.physicalLife === (lease.subjectPhysicalLife ?? 0) &&
      visibleSound.episodeId === detected.original.origin.episodeId;
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
      exposure: cloneValue(lease.exposure),
    };
    if (!result.some((context) => context.episodeId === lease.exposure.episodeId))
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
        return entry.sourceId === id && entry.exposure.episodeId === lease.exposure.episodeId;
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
    if (received) return materializeObservation(world, received.original);
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
        original = state.received[state.receipts[observationAcquisitionKey(contribution)]!]!;
      replaceCurrentFacet(world, state, `${binding!.entityId}:association`, {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: binding!.entityId,
        subjectPhysicalLife: binding!.physicalLife,
        bodyLeaseId: boundBody.id,
        exposure: cloneValue(boundBody.exposure),
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
    const original = readOnlyDraftView(state.received[position]!);
    const selectedOriginal = immutableDataSnapshot<ReceivedObservation>(
      {
        ...original,
        context: selected.context,
      },
      readOnlyDraftView,
    );
    state.received[position] = selectedOriginal;
    const association = binding && state.current[`${binding.entityId}:association`];
    if (association && readOnlyDraftView(association.original) === original)
      replaceCurrentFacet(world, state, `${binding!.entityId}:association`, {
        ...readOnlyDraftView(association),
        original: selectedOriginal,
      });
    contribution = selected;
  }
  return contribution;
}

export function receivedEventObservation(
  world: WorldState,
  observerId: string,
  eventId: string,
): ObservationContribution | undefined {
  const entry = world.perceptionEvidence?.[observerId]?.received.find(
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
      lease.exposure.episodeId !== contact.id ||
      (lease.value.kind === 'contact' &&
        (receivedFacetValue(world, lease.value) as Extract<SensoryFacet, { kind: 'contact' }>)
          ?.detail !== contact.detail)
    ) {
      if (contact) renewed.set(lease.subjectId, { previous: lease.id, newLife });
      finalizeLease(world, observer, lease);
      delete writableCurrent(state)[key];
    }
  }
  for (const [sourceId, contact] of Object.entries(contacts)) {
    const key = `${sourceId}:contact`;
    const held = readOnlyDraftView(state.current)[key];
    const existing = held && readOnlyDraftView(held);
    if (existing) {
      if (existing.confirmedThrough < world.simTime) {
        replaceCurrentFacet(world, state, key, {
          ...existing,
          confirmedThrough: world.simTime,
          valueMeasuredThrough: world.simTime,
          valueAcquiredAt: world.simTime,
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
          'carried',
          'pile-contents',
          'public-attributes',
          'observed-motion',
          'confirmation',
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
    validateSensoryFacet(facet.value, originals);
    validateReceivedParticipantObservers(facet.value, observation.observer);
    if (
      (facet.value.kind === 'confirmation' &&
        facet.value.snapshot.valueAcquiredAt > observation.acquiredAt) ||
      (facet.value.kind === 'observed-motion' &&
        facet.value.later.valueAcquiredAt > observation.acquiredAt)
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
    owners.push(value.exposure.observer, value.earlier.observer, value.later.observer);
  if (value.kind === 'confirmation') owners.push(value.snapshot.observer);
  if (
    owners.some(
      (owner) => owner.actorId !== observer.actorId || owner.physicalLife !== observer.physicalLife,
    )
  )
    throw new Error('Foreign received participant.');
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
    case 'body': {
      const body = value.body;
      if (
        !body ||
        typeof body.kind !== 'string' ||
        !validPoint(body.position) ||
        !Number.isFinite(body.heading) ||
        typeof body.appearance !== 'string' ||
        !Number.isFinite(body.radius) ||
        body.radius < 0 ||
        !Number.isFinite(body.height) ||
        body.height <= 0 ||
        (body.supportSurfaceId !== null && typeof body.supportSurfaceId !== 'string') ||
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
      break;
    }
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
        if (
          !sample ||
          sample.value.kind !== 'location' ||
          sample.value.location.kind !== 'point' ||
          sample.valueMeasuredFrom !== sample.valueMeasuredThrough ||
          sample.valueMeasuredThrough > sample.valueAcquiredAt
        )
          throw new Error('Received motion requires completed point samples.');
        validateSensoryFacet({ kind: 'confirmation', snapshot: sample }, originals);
      }
      if (
        value.correspondence !== 'unambiguous-received-continuity' ||
        !value.exposure?.episodeId ||
        value.earlier.valueMeasuredThrough >= value.later.valueMeasuredFrom ||
        value.earlier.confirmation.id !== value.later.confirmation.id ||
        value.earlier.exposure.episodeId !== value.exposure.episodeId ||
        value.later.exposure.episodeId !== value.exposure.episodeId ||
        JSON.stringify(value.earlier.observer) !== JSON.stringify(value.later.observer)
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
    case 'confirmation': {
      const snapshot = value.snapshot;
      if (!snapshot || !snapshot.confirmation)
        throw new Error('Invalid retained perception confirmation.');
      validateEvidenceSource(snapshot.confirmation);
      validateObservationContribution(snapshot.original, originals);
      if (
        !Number.isSafeInteger(snapshot.originalOrdinal) ||
        !snapshot.original.facets[snapshot.originalOrdinal] ||
        snapshot.original.facets[snapshot.originalOrdinal]!.value.kind !== snapshot.value.kind ||
        !snapshot.observer ||
        !snapshot.exposure ||
        canonicalJson(snapshot.observer) !== canonicalJson(snapshot.original.observer) ||
        canonicalJson(snapshot.observer) !== canonicalJson(snapshot.confirmation.observer) ||
        canonicalJson(snapshot.observer) !== canonicalJson(snapshot.exposure.observer) ||
        ![
          snapshot.valueMeasuredFrom,
          snapshot.valueMeasuredThrough,
          snapshot.valueAcquiredAt,
          snapshot.confirmedFrom,
          snapshot.confirmedThrough,
        ].every(Number.isFinite) ||
        snapshot.valueMeasuredThrough < snapshot.valueMeasuredFrom ||
        snapshot.valueMeasuredThrough > snapshot.valueAcquiredAt ||
        snapshot.confirmedThrough < snapshot.confirmedFrom ||
        snapshot.value.kind === 'confirmation'
      )
        throw new Error('Invalid retained facet timing.');
      validateSensoryFacet(snapshot.value, originals);
      break;
    }
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
