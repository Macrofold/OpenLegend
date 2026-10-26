import {
  validPerceivedPoint as validPoint,
  validateEvidenceSource,
  validateObservedLocation,
} from './perception-values.js';
export { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import { nextId } from './data.js';
import { canonicalJson } from './events.js';
import { chargeWork } from './work-budget.js';
import { personalFactAlias } from './experience-source.js';
import { validateDetectionSupportState, type DetectionSupportState } from './perception-support.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { outwardStates } from './perception-frame.js';
import { equippedItems } from './equipment.js';
import { itemsForOwner } from './objects.js';
import { retainObservationConfirmation } from './experience.js';
import { currentDetailedAttention, currentAttentionCues, updateAttention } from './attention.js';
import {
  validateReceivedSurfacePatch,
  validateReceivedBoundary,
  validateReceivedGeometryState,
} from './received-geometry.js';
import {
  appendTemporalReceipt,
  captureTemporalCurrent,
  captureTemporalObservation,
  temporalFacetInput,
  temporalReceiptSource,
  retainTemporalSupport,
  releaseTemporalSupport,
} from './temporal-evidence.js';
import {
  refreshReceivedGeometry,
  evaluateAttentionRelations,
  currentReceivedGeometry,
} from './received-geometry.js';
import { hasMemory } from './living.js';
import { knownPlaceEvidence } from './known-place-evidence.js';
import { validEncounterExposure, type EncounterExposure } from './places.js';
import { hasRecordFields, isSafeRecordId, isImmutableData } from './records.js';
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
  selectedCreditAttentionContact,
  selectedAssociateBodyFamiliarity,
} from './world-composition.js';
import { freeze } from 'immer';
import {
  validatePerceivedSpeech,
  validatePerceivedSound,
  validateReceivedFeatures,
} from './speech.js';
import { validObserverSubject } from './knowledge.js';
import { activelyParticipates } from './participation-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { sensesFor } from './perception.js';
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
  | { kind: 'speech'; speech: NonNullable<Awareness['speech']> }
  | { kind: 'perceived-feature'; sample: NonNullable<Awareness['receivedFeatures']> }
  | { kind: 'sound'; sound: NonNullable<Awareness['sound']> }
  /** Complete already-admitted inspection/place meaning, independent of its prose. */
  | { kind: 'encounter-exposure'; exposure: EncounterExposure }
  | {
      kind: 'event';
      eventType: string;
      text: string;
      data: NonNullable<WorldEvent['data']>;
      references: NonNullable<Awareness['references']>;
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
  facets: ObservationFacet[];
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
  original: ObservationContribution;
  originalOrdinal: number;
  modality: ObservationContribution['modality'];
  value: SensoryFacet;
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
  > {
  confirmation: Extract<EvidenceSource, { family: 'native-exposure' | 'native-response' }>;
}
export type CapturedLocationSample = CapturedCurrentFacet & {
  value: Extract<SensoryFacet, { kind: 'location' }>;
};
export interface PerceptionEvidenceOwner {
  /** One completed full sight phase renews only its extant supported sight facets.
   * Values/independent losses remain in current; no stationary detail is rewritten. */
  visualConfirmation?: { through: number; revision: number };
  geometry?: import('./received-geometry.js').ReceivedGeometryState;
  attention?: import('./attention.js').AttentionState;
  life: number;
  /** Residency boundary only. Explicit acquired bodies, never this number, define a cut. */
  receivedAtSequence: number;
  received: ObservationContribution[];
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
const evidenceEncoder = new TextEncoder();
/** Prepared native source identity is a dependency token, never saved authority. */
const measuredSources = new WeakMap<ObservationContribution, { leaseId: string; token: string }>();
interface VisualSourceValues {
  location:Extract<ObservedLocation,{kind:'point'}>;
  facets:readonly SensoryFacet[];
}
/** The native frame owns this finite cache. Its complete source token covers only
 * common outward values; each admitted receiver still supplies its own frame,
 * detector, time, exposure, association and evidence envelope. */
const visualSourceValues=new WeakMap<(id:string)=>string|undefined,Map<string,{token:string;values:VisualSourceValues}>>();
function prepareVisualSourceValues(world:WorldState,subject:Entity,sourceToken:((id:string)=>string|undefined)|undefined,
  token:string|undefined,publicAttributes:readonly AttributeView[]):VisualSourceValues {
  let prepared=sourceToken&&visualSourceValues.get(sourceToken);
  const prior=prepared?.get(subject.id);
  if(token&&prior?.token===token)return prior.values;
  const profile=bodyProfile(subject),placement=subject.placement!;
  const body:ObservedBody={kind:subject.kind,position:{...readOnlyDraftView(worldPosition(subject))},heading:subject.spatial.heading,
    appearance:subject.appearance??'sprite',radius:profile.radius,height:profile.height,supportSurfaceId:worldSupport(subject),
    outward:outwardStates(subject),label:selectedOutwardBodyName(world,subject),
    ...(!subject.actor&&subject.description?{description:subject.description}:{}),
    ...(subject.resource?{quantity:subject.resource.quantity}:{}),...(subject.heat?{heatLit:subject.heat.lit}:{}),
    ...(subject.remains?{remainsPhase:subject.remains.phase}:{}),
    ...(subject.container||subject.kind==='item-pile'||subject.remains?{storage:{placementRevision:placement.revision}}:{})};
  const facets:SensoryFacet[]=[{kind:'detected',detected:subject.actor?'body':'surface',limits:[]},{kind:'body',body},
    {kind:'carried',items:equippedItems(world,subject.id).flatMap((item)=>{
      const definition=world.itemDefinitions[item.definitionId];return definition?[{itemKindAsObserved:definition.name}]:[];
    })}];
  if(subject.kind==='item-pile'||subject.remains)facets.push({kind:'pile-contents',items:itemsForOwner(world,subject.id).flatMap((item)=>{
    const definition=world.itemDefinitions[item.definitionId];return definition?[{id:item.id,definitionId:item.definitionId,name:definition.name,quantity:item.quantity,portable:definition.portable===true}]:[];
  })});
  if(publicAttributes.length)facets.push({kind:'public-attributes',attributes:[...cloneValue(publicAttributes)]});
  const values=freeze({location:{kind:'point' as const,point:body.position,errorRadius:0},facets},true);
  if(sourceToken&&token){if(!prepared)visualSourceValues.set(sourceToken,(prepared=new Map()));prepared.set(subject.id,{token,values});}
  return values;
}
const acquisitionKey = (
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
const owner = perceptionEvidenceOwner;
export const observationFactKey = (
  observation: ObservationContribution,
  ordinal: number,
): ObservationFactKey => ({
  source: {
    family: 'native-exposure',
    observer: { ...observation.observer },
    id: observation.id,
    revision: observation.revision,
  },
  ordinal,
});

/** Trusted producers pass an already-permitted body. No source lookup strengthens it here.
 * The transition's actual receipts survive nested event callbacks. Durable memory owns its
 * contribution afterward; active exposure is not a second lifetime history database.
 * docs/projects/perspective-perception-tech-design.md#three-representations-one-observation */
export function acquireObservation(
  world: WorldState,
  observer: Entity,
  input: Omit<ObservationContribution, 'id' | 'revision' | 'observer' | 'acquiredAt' | 'facets'> & {
    facets: Array<Omit<ObservationFacet, 'ordinal' | 'acquiredAt'>>;
  },
): ObservationContribution {
  const state = owner(world, observer);
  const key = acquisitionKey(input);
  const index = state.receipts[key];
  const prior = index === undefined ? undefined : state.received[index];
  if (prior) return immutableObservation(prior);
  const contribution: ObservationContribution = {
    id: nextId(world, 'perception-observation'),
    revision: 1,
    observer: observerLife(observer),
    origin: cloneValue(input.origin),
    acquiredAt: world.simTime,
    modality: input.modality,
    detector: { ...input.detector },
    facets: input.facets.map((facet, ordinal) => ({
      ...cloneValue({ ...facet, value: undefined }),
      value: copyFacetValue(facet.value),
      ordinal,
      acquiredAt: world.simTime,
    })),
  };
  chargeWork({
    effects: 1,
    outputBytes: evidenceEncoder.encode(JSON.stringify(contribution)).byteLength,
  });
  state.receipts[key] = state.received.length;
  freeze(contribution, true);
  state.received.push(contribution);
  return contribution;
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
            captureCurrentFacet(effectiveCurrentFacetSupport(world, observerId, lease)),
          )
      : [];
  const acquired = new Map<string, ObservationContribution>();
  for (const contribution of [
    ...retained,
    ...(state?.life === life.physicalLife ? state.received : []),
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
/** Native originals never change. Sharing the frozen source body avoids copying it once
 * per current facet and again through every nested native transition. Restored plain
 * sources become immutable on their first captured read; this cache grants no evidence. */
const immutableObservations = new WeakMap<ObservationContribution, ObservationContribution>();
function immutableObservation(value: ObservationContribution): ObservationContribution {
  const source = readOnlyDraftView(value);
  if (Object.isFrozen(source)) return source;
  let result = immutableObservations.get(source);
  if (!result) {
    result = freeze(cloneValue(source), true);
    immutableObservations.set(source, result);
  }
  return result;
}
function immutableSnapshot(value: CapturedCurrentFacet): CapturedCurrentFacet {
  const source = readOnlyDraftView(value);
  return Object.isFrozen(source) ? source : freeze(cloneValue(source), true);
}
function copyFacetValue(value: SensoryFacet): SensoryFacet {
  const source = readOnlyDraftView(value);
  if(isImmutableData(source))return source;
  if (source.kind === 'confirmation')
    return { kind: 'confirmation', snapshot: immutableSnapshot(source.snapshot) };
  if (source.kind === 'observed-motion')
    return {
      ...source,
      exposure: cloneValue(source.exposure),
      earlier: immutableSnapshot(source.earlier) as CapturedLocationSample,
      later: immutableSnapshot(source.later) as CapturedLocationSample,
    };
  return cloneValue(source);
}
export function captureCurrentFacet(lease: LiveFacetSupport): CapturedCurrentFacet {
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
  return freeze(
    {
      ...cloneValue(fields),
      original: immutableObservation(original),
      value: copyFacetValue(latest),
      confirmation: {
        family: 'native-exposure' as const,
        observer: { ...lease.observer },
        id: lease.id,
        revision,
      },
    },
    true,
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
    state = world.perceptionEvidence?.[observerId];
  const confirmation = state?.visualConfirmation;
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
  return {
    ...value,
    revision: Math.max(value.revision, confirmation.revision),
    confirmedThrough: through,
    ...(value.value.kind === 'association'
      ? {}
      : value.value.kind === 'location'
        ? { valueMeasuredFrom: through, valueMeasuredThrough: through, valueAcquiredAt: through }
        : { valueMeasuredThrough: through }),
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
        effectiveCurrentFacetSupport(world, observerId, lease),
      ) as CapturedCurrentFacet & {
        value: Extract<SensoryFacet, { kind: 'body' }>;
      })
    : undefined;
}
function eligibleBodyLease(
  world: WorldState,
  observerId: string,
  subjectId: string,
): LiveFacetSupport | undefined {
  const state = world.perceptionEvidence?.[observerId],
    observer = entityGet(world.entities, observerId),
    subject = entityGet(world.entities, subjectId);
  if (
    !observer?.actor?.alive ||
    !activelyParticipates(observer) ||
    capabilityBlocked(world, observer, 'perception') ||
    !sensesFor(world, observer).some((sense) => sense.implementation === 'vision-geometry-v1') ||
    state?.life !== (observer.actor.physicalLife ?? 0) ||
    !activelyParticipates(subject)
  )
    return;
  const lease = state.current[`${subjectId}:body`];
  return lease &&
    lease.value.kind === 'body' &&
    lease.subjectPhysicalLife === (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)
    ? lease
    : undefined;
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
  const body = eligibleBodyLease(world, observerId, subjectId);
  const association = world.perceptionEvidence?.[observerId]?.current[`${subjectId}:association`];
  return body &&
    association?.bodyLeaseId === body.id &&
    association.value.kind === 'association' &&
    association.value.strength === 'supported' &&
    associationEvidenceStatus(
      world,
      observerId,
      association.value,
      association.original,
      association.originalOrdinal,
    ) === 'retained'
    ? cloneValue(association.value.subject)
    : undefined;
}
export function associationEvidenceStatus(
  world: WorldState,
  observerId: string,
  value: Extract<SensoryFacet, { kind: 'association' }>,
  original?: ObservationContribution,
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
): LiveFacetSupport[] {
  const held = current && readOnlyDraftView(current);
  return [...exposures].flatMap(([id, exposure]) =>
    CURRENT_BODY_FACET_KINDS.flatMap((kind) => {
      const lease = held?.[`${id}:${kind}`];
      return lease?.exposure.episodeId === exposure
        ? [effectiveCurrentFacetSupport(world, observerId, lease)]
        : [];
    }),
  );
}

export function currentObservedFacets(
  world: WorldState,
  observerId: string,
  subjectId: string,
): CapturedCurrentFacet[] {
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
  return CURRENT_BODY_FACET_KINDS.flatMap((kind) => state.current[`${subjectId}:${kind}`] ?? [])
    .filter(
      (lease) =>
        currentLeaseEligible(world, observerId, lease) &&
        (!lease.bodyLeaseId ||
          lease.bodyLeaseId === eligibleBodyLease(world, observerId, subjectId)?.id),
    )
    .map((lease) => captureCurrentFacet(effectiveCurrentFacetSupport(world, observerId, lease)));
}
function currentLeaseEligible(
  world: WorldState,
  observerId: string,
  lease: LiveFacetSupport,
): boolean {
  if (
    lease.value.kind === 'association' &&
    associationEvidenceStatus(
      world,
      observerId,
      lease.value,
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
    sensesFor(world, observer).some((sense) => sense.id === lease.original.detector.id)
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
        facets: [temporalFacetInput(readOnlyDraftView(lease))],
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
  const snapshot = captureCurrentFacet(lease);
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
  const description =
    lease.value.kind === 'carried'
      ? lease.value.items.map((item) => item.itemKindAsObserved).join(', ') ||
        'no visible equipment'
      : lease.value.kind === 'body'
        ? lease.value.body.outward.filter(Boolean).join(', ')
        : lease.value.kind === 'location'
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

/** Pose and continuously changing quantities keep only their latest received sample.
 * Semantic detail changes retain the ended meaning; numeric effects already have
 * their exact before/after accounts at the attribute mutation owner. */
function attributeMeanings(value: Extract<SensoryFacet, { kind: 'public-attributes' }>) {
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
      previous.heatLit !== current.heatLit ||
      previous.remainsPhase !== current.remainsPhase ||
      !!previous.storage !== !!current.storage ||
      previous.outward.some((value, index) => value !== current.outward[index]) ||
      previous.label?.name !== current.label?.name ||
      previous.label?.nameForm !== current.label?.nameForm ||
      previous.label?.indefiniteArticle !== current.label?.indefiniteArticle
    );
  }
  if (before.kind === 'public-attributes' && after.kind === 'public-attributes')
    return JSON.stringify(attributeMeanings(before)) !== JSON.stringify(attributeMeanings(after));
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
  const beforeAttention = new Set(
    currentDetailedAttention(world, observer.id).map((entry) => entry.sourceId),
  );
  const attentionChanges = new Set<string>();
  const lostIndividuals = new Set<string>();
  for (const [id, gap] of Object.entries(state.gaps))
    if (gap.through < world.simTime) delete state.gaps[id];
  const eligible = new Set(subjects.map((entity) => entity.id));
  for (const [key, lease] of Object.entries(readOnlyDraftView(state.current)))
    if (
      lease.modality === 'sight' &&
      (!eligible.has(lease.subjectId) ||
        lease.subjectPhysicalLife !==
          (entityGet(world.entities, lease.subjectId)?.actor?.physicalLife ??
            (entityGet(world.entities, lease.subjectId)?.actor ? 0 : null)))
    ) {
      attentionChanges.add(lease.subjectId);
      if (lease.value.kind === 'body' && lease.localSubject?.kind === 'individual')
        lostIndividuals.add(lease.localSubject.individualId);
      retainVisualGap(world, state, lease, episodeGraceSeconds);
      finalizeLease(world, observer, lease);
      delete state.current[key];
    }
  for (const subject of subjects) {
    chargeWork({ tests: 1 });
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
      measuredSource?.leaseId === heldBody.id &&
      measuredSource.token === token
    ) {
      const position = readOnlyDraftView(worldPosition(observer)),
        heading = observer.spatial.heading;
      const location = readOnlyDraftView(state.current)[`${subject.id}:location`];
      const locationValue = location && readOnlyDraftView(location.value);
      if (locationValue?.kind === 'location') {
        const frame = locationValue.frame;
        const moved =
          frame.positionAtObservation.x !== position.x ||
          frame.positionAtObservation.y !== position.y ||
          frame.positionAtObservation.z !== position.z ||
          frame.forwardAtObservation !== heading;
        if (moved) {
          attentionChanges.add(subject.id);
          const writable = state.current[`${subject.id}:location`]!;
          writable.revision++;
          writable.confirmedThrough = world.simTime;
          writable.valueMeasuredFrom = world.simTime;
          writable.valueMeasuredThrough = world.simTime;
          writable.valueAcquiredAt = world.simTime;
          if (writable.value.kind === 'location')
            writable.value.frame = {
              positionAtObservation: { ...position },
              forwardAtObservation: heading,
            };
        }
      }
      const motionKey = `${subject.id}:observed-motion`,
        motion = state.current[motionKey];
      if (motion && location && world.simTime > motion.valueMeasuredThrough) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, motion);
        delete state.current[motionKey];
      }
      if (subject.actor && !heldBody.localSubject) {
        const local = selectedBodyIndividual(world, observer.id, subject.id);
        if (local) state.current[`${subject.id}:body`]!.localSubject = local;
      }
      continue;
    }
    const prepared=prepareVisualSourceValues(world,subject,sourceToken,token,
      sourcePublicAttributes?.(subject.id)??projectAttributes(world,subject,'public'));
    const frame:ObservationFrame={positionAtObservation:{...readOnlyDraftView(worldPosition(observer))},forwardAtObservation:observer.spatial.heading};
    const values:SensoryFacet[]=[prepared.facets[0]!,{kind:'location',location:prepared.location,frame},...prepared.facets.slice(1)];
    const detected = state.current[`${subject.id}:detected`];
    let original = detected && readOnlyDraftView(detected).original;
    if (!original)
      original = acquireObservation(world, observer, {
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
    const exposure = { observer: observerLife(observer), episodeId: original.id };
    let earlierLocation: CapturedLocationSample | undefined;
    values.forEach((facet, ordinal) => {
      chargeWork({ tests: 1 });
      const key = `${subject.id}:${facet.kind}`;
      let prior = state.current[key];
      // Equality and semantic comparison read completed values, not deep Immer proxies.
      // Drafting every unchanged nested body here makes later native previews copy it.
      const previous = prior && effectiveCurrentFacetSupport(world, observer.id, prior),
        previousValue = previous && readOnlyDraftView(previous.value);
      const changed = !previousValue || JSON.stringify(previousValue) !== JSON.stringify(facet);
      if (changed) attentionChanges.add(subject.id);
      if (
        prior &&
        previous &&
        facet.kind === 'location' &&
        previousValue?.kind === 'location' &&
        previousValue.location.kind === 'point' &&
        facet.location.kind === 'point' &&
        previous.valueMeasuredThrough < world.simTime &&
        previous.motionContinuityRevision === (placement.motionContinuityRevision ?? 0) &&
        placement.revision > (previous.sourcePlacementRevision ?? -1) &&
        Math.hypot(
          previousValue.location.point.x - facet.location.point.x,
          previousValue.location.point.y - facet.location.point.y,
          previousValue.location.point.z - facet.location.point.z,
        ) >
          previousValue.location.errorRadius + facet.location.errorRadius
      )
        earlierLocation = captureCurrentFacet(previous) as CapturedLocationSample;
      let facetOriginal = original;
      if (prior && previousValue && changed && semanticFacetChanged(previousValue, facet)) {
        finalizeLease(world, observer, prior);
        facetOriginal = acquireObservation(world, observer, {
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
          prior.original = facetOriginal;
          prior.originalOrdinal = 0;
          prior.confirmedFrom = world.simTime;
        } else {
          delete state.current[key];
          prior = undefined;
        }
      }
      if (!prior) {
        if (
          facetOriginal?.facets[ordinal]?.value.kind !== facet.kind &&
          facetOriginal?.facets[0]?.value.kind !== facet.kind
        )
          facetOriginal = acquireObservation(world, observer, {
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
        state.current[key] = {
          id: nextId(world, 'perception-lease'),
          revision: 1,
          observer: observerLife(observer),
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
          value: copyFacetValue(facet),
          valueMeasuredFrom: world.simTime,
          valueMeasuredThrough: world.simTime,
          valueAcquiredAt: world.simTime,
          confirmedFrom: world.simTime,
          confirmedThrough: world.simTime,
        };
      } else if (changed) {
        prior.revision++;
        prior.confirmedThrough = world.simTime;
        prior.value = copyFacetValue(facet);
        prior.valueMeasuredFrom = world.simTime;
        prior.valueMeasuredThrough = world.simTime;
        prior.valueAcquiredAt = world.simTime;
        if (facet.kind === 'location') {
          prior.motionContinuityRevision = placement.motionContinuityRevision ?? 0;
          prior.sourcePlacementRevision = placement.revision;
        }
      }
    });
    const currentBody = state.current[`${subject.id}:body`];
    if (subject.actor && currentBody && !currentBody.localSubject) {
      const localSubject = selectedBodyIndividual(world, observer.id, subject.id);
      if (localSubject) currentBody.localSubject = localSubject;
    }
    const locationLease = state.current[`${subject.id}:location`];
    const motionKey = `${subject.id}:observed-motion`;
    const laterLocation =
      earlierLocation &&
      locationLease &&
      (captureCurrentFacet(locationLease) as CapturedLocationSample | undefined);
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
        ? {
            kind: 'observed-motion' as const,
            exposure: cloneValue(locationLease!.exposure),
            earlier: earlierLocation,
            later: laterLocation,
            correspondence: 'unambiguous-received-continuity' as const,
          }
        : undefined;
    const priorMotion = state.current[motionKey];
    if (!motion) {
      if (
        priorMotion &&
        (!locationLease ||
          locationLease.valueMeasuredThrough > priorMotion.valueMeasuredThrough ||
          priorMotion.motionContinuityRevision !== locationLease?.motionContinuityRevision)
      ) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, priorMotion);
        delete state.current[motionKey];
      }
    } else if (priorMotion) {
      priorMotion.revision++;
      priorMotion.value = motion;
      priorMotion.valueMeasuredFrom = earlierLocation!.valueMeasuredFrom;
      priorMotion.valueMeasuredThrough = world.simTime;
      priorMotion.valueAcquiredAt = world.simTime;
      priorMotion.confirmedThrough = world.simTime;
    } else {
      const received = acquireObservation(world, observer, {
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
      state.current[motionKey] = {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: subject.id,
        subjectPhysicalLife: locationLease!.subjectPhysicalLife,
        motionContinuityRevision: locationLease!.motionContinuityRevision,
        exposure: cloneValue(locationLease!.exposure),
        original: received,
        originalOrdinal: 0,
        modality: 'sight',
        value: motion,
        valueMeasuredFrom: earlierLocation!.valueMeasuredFrom,
        valueMeasuredThrough: world.simTime,
        valueAcquiredAt: world.simTime,
        confirmedFrom: world.simTime,
        confirmedThrough: world.simTime,
      };
    }
    const kinds = new Set(values.map((facet) => facet.kind));
    for (const kind of ['pile-contents', 'public-attributes'] as const) {
      const key = `${subject.id}:${kind}`;
      if (state.current[key] && !kinds.has(kind)) {
        attentionChanges.add(subject.id);
        finalizeLease(world, observer, state.current[key]!);
        delete state.current[key];
      }
    }
    const measured = state.current[`${subject.id}:body`];
    if (token && measured)
      measuredSources.set(readOnlyDraftView(readOnlyDraftView(measured).original), {
        leaseId: measured.id,
        token,
      });
  }
  pruneLostBodyIndividuals(world, observer.id, lostIndividuals);
  state.visualConfirmation = {
    through: world.simTime,
    revision: (state.visualConfirmation?.revision ?? 0) + 1,
  };
  refreshReceivedGeometry(world, observer.id);
  const priorCues = new Set(currentAttentionCues(world, observer.id).map((cue) => cue.id));
  reconcileAttendedTemporalEvidence(world, observer.id, beforeAttention, [], [...attentionChanges]);
  evaluateAttentionRelations(world, observer.id);
  const geometry = currentReceivedGeometry(world, observer.id).observations;
  for (const cue of currentAttentionCues(world, observer.id)) {
    if (priorCues.has(cue.id)) continue;
    const anchor = currentDetailedAttention(world, observer.id).find(
      (entry) => entry.key === cue.anchorKey,
    );
    if (!anchor) continue;
    for (const observation of geometry) {
      const facts = cue.proof.filter(
        (fact) =>
          fact.source.id === observation.id && fact.source.revision === observation.revision,
      );
      if (!facts.length) continue;
      captureTemporalObservation(
        world,
        observer.id,
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
): void {
  const observer = entityGet(world.entities, observerId);
  if (!observer || !hasMemory(observer)) return;
  const result = updateAttention(world, observerId, { directSubjects, changedSourceIds });
  const after = new Set(result.after);
  const selected = new Set([...before, ...after]);
  const current = world.perceptionEvidence?.[observerId]?.current;
  const selectedExposures = new Map(
    [...selected].flatMap((id) => {
      const body = current?.[`${id}:body`];
      return body ? [[id, body.exposure.episodeId] as const] : [];
    }),
  );
  const leases = selectedCurrentSupports(world, observerId, current, selectedExposures);
  const contacts = new Map<string, ObserverSubject>();
  for (const lease of leases) {
    if (!creditContacts || lease.value.kind !== 'body' || lease.confirmedThrough !== world.simTime)
      continue;
    const subject =
      currentBodyAssociation(world, observerId, lease.subjectId) ?? lease.localSubject;
    if (subject && selectedAttentionContactDue(world, observerId, subject, lease.confirmedThrough))
      contacts.set(lease.subjectId, subject);
  }
  const captured = captureTemporalCurrent(
    world,
    observerId,
    leases,
    new Set([...after].filter((id) => !before.has(id))),
    selectedTemporalPolicy(world).recent,
    new Set([...before].filter((id) => !after.has(id))),
    new Set(contacts.keys()),
    changedSourceIds ? new Set(changedSourceIds) : undefined,
  );
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
        [...affected].flatMap((id) => {
          const body = current?.[`${id}:body`];
          return body ? [[id, body.exposure.episodeId] as const] : [];
        }),
      );
      const changed = selectedCurrentSupports(world, observerId, current, exposures);
      // Credit may change prominence. Retain the newly selected current baseline before
      // publication, without recursively awarding contacts for an attention-only change.
      captureTemporalCurrent(
        world,
        observerId,
        changed,
        entering,
        selectedTemporalPolicy(world).recent,
        exiting,
        undefined,
        affected,
      );
    }
  }
}

/** Physical loss ends availability immediately; episode/familiarity continuity is separate. */
export function endCurrentEvidence(
  world: WorldState,
  observerId: string,
  modality?: ObservationContribution['modality'],
  episodeGraceSeconds = 0,
): void {
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  const observer = entityGet(world.entities, observerId);
  const lostIndividuals = new Set<string>();
  for (const [key, lease] of Object.entries(readOnlyDraftView(state.current)))
    if (!modality || lease.modality === modality) {
      if (lease.value.kind === 'body' && lease.localSubject?.kind === 'individual')
        lostIndividuals.add(lease.localSubject.individualId);
      retainVisualGap(world, state, lease, episodeGraceSeconds);
      if (observer?.actor && state.life === (observer.actor.physicalLife ?? 0))
        finalizeLease(world, observer, lease);
      delete state.current[key];
    }
  pruneLostBodyIndividuals(world, observerId, lostIndividuals);
  reconcileAttendedTemporalEvidence(world, observerId);
}

export function acquireAwarenessObservation(
  world: WorldState,
  event: WorldEvent,
  awareness: Awareness,
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
  // An encounter is the existing story wrapper for this native sight input. It
  // retains the received original; recording its prose does not sample sight again.
  if (
    event.type === 'encounter' &&
    event.data?.['acquisition'] === true &&
    !event.exposure &&
    awareness.targetId
  ) {
    const received = eligibleBodyLease(world, observer.id, awareness.targetId);
    if (received) return immutableObservation(received.original);
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
  if (visualSubject?.placement?.mode === 'world' && !event.exposure)
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
  else if (modality === 'touch')
    values.push({
      kind: 'location',
      location: {
        kind: 'point',
        point: { ...readOnlyDraftView(worldPosition(observer)) },
        errorRadius: bodyProfile(observer).radius,
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
    values.push({ kind: 'sound', sound: cloneValue(awareness.sound) });
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
    values.push({ kind: 'speech', speech: cloneValue(speech) });
  } else
    values.push({
      kind: 'event',
      eventType: awareness.eventType ?? event.type,
      text: awareness.text,
      data: cloneValue(awareness.eventData ?? {}),
      references: cloneValue(awareness.references ?? []),
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
  const contribution = acquireObservation(world, observer, {
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
  if (
    bodyLease &&
    bodyLease.id === binding!.leaseId &&
    bodyLease.subjectPhysicalLife === binding!.physicalLife &&
    recognition?.subject &&
    recognition.recognized
  ) {
    const ordinal = contribution.facets.findIndex(
      (facet) =>
        facet.value.kind === 'association' &&
        facet.value.strength === 'supported' &&
        JSON.stringify(facet.value.subject) === JSON.stringify(recognition.subject),
    );
    if (ordinal >= 0) {
      owner(world, observer).current[`${binding!.entityId}:association`] = {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: binding!.entityId,
        subjectPhysicalLife: binding!.physicalLife,
        bodyLeaseId: bodyLease.id,
        exposure: cloneValue(bodyLease.exposure),
        original: contribution,
        originalOrdinal: ordinal,
        modality: 'sight',
        value: cloneValue(contribution.facets[ordinal]!.value),
        valueMeasuredFrom: event.at,
        valueMeasuredThrough: event.at,
        valueAcquiredAt: contribution.acquiredAt,
        confirmedFrom: event.at,
        confirmedThrough: event.at,
      };
      selectedAssociateBodyFamiliarity(world, observer.id, binding!.entityId);
      reconcileAttendedTemporalEvidence(
        world,
        observer.id,
        undefined,
        [binding!.entityId],
        [binding!.entityId],
      );
    }
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
  return entry && cloneValue(entry);
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
      observationFactKey(source, speechOrdinal),
      { source: cloneValue(place.source), ordinal: place.facetOrdinal },
    ],
    supportAliases: [
      { family: 'awareness', id: event.id },
      ...(place.sourceEventId ? [{ family: 'awareness' as const, id: place.sourceEventId }] : []),
    ],
  };
  return acquireObservation(world, observer, {
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

export function validatePerceptionEvidenceState(
  world: WorldState,
  originals = new Map<string, string>(),
): void {
  const states = world.perceptionEvidence;
  if (states === undefined) return;
  if (!states || typeof states !== 'object' || Array.isArray(states))
    throw new Error('Invalid active perception owners.');
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
      !state.current ||
      typeof state.current !== 'object' ||
      Array.isArray(state.current) ||
      !state.gaps ||
      typeof state.gaps !== 'object' ||
      Array.isArray(state.gaps)
    )
      throw new Error('Invalid active perception owner.');
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
    if (
      state.visualConfirmation &&
      (!Number.isFinite(state.visualConfirmation.through) ||
        state.visualConfirmation.through < 0 ||
        state.visualConfirmation.through > world.simTime ||
        !Number.isSafeInteger(state.visualConfirmation.revision) ||
        state.visualConfirmation.revision < 1)
    )
      throw new Error('Invalid completed visual confirmation.');
    if (state.support) validateDetectionSupportState(world, observerId, state.support, originals);
    if (state.geometry) validateReceivedGeometryState(world, observerId, state.geometry, originals);
    if (
      Object.entries(state.receipts).some(
        ([key, index]) =>
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= state.received.length ||
          key !== acquisitionKey(state.received[index]!),
      )
    )
      throw new Error('Invalid perception acquisition receipt.');
    for (const observation of state.received) {
      validateObservationContribution(observation, originals);
      if (
        observation.observer.actorId !== observerId ||
        observation.observer.physicalLife !== state.life ||
        observation.acquiredAt > world.simTime
      )
        throw new Error('Invalid perception observer life.');
    }
    for (const [key, lease] of Object.entries(readOnlyDraftView(state.current))) {
      if (!lease || typeof lease !== 'object' || !lease.observer || !lease.value)
        throw new Error('Invalid current perception facet.');
      validateObservationContribution(lease.original, originals);
      validateSensoryFacet(lease.value, originals);
      if (
        typeof lease.id !== 'string' ||
        !lease.id.startsWith('perception-lease-') ||
        !Number.isSafeInteger(lease.revision) ||
        lease.revision < 1 ||
        lease.observer.actorId !== observerId ||
        lease.observer.physicalLife !== state.life ||
        !isSafeRecordId(lease.subjectId) ||
        (lease.subjectPhysicalLife !== null &&
          (!Number.isSafeInteger(lease.subjectPhysicalLife) || lease.subjectPhysicalLife < 0)) ||
        key !== `${lease.subjectId}:${lease.value.kind}` ||
        !lease.exposure ||
        typeof lease.exposure.episodeId !== 'string' ||
        !lease.exposure.episodeId ||
        lease.exposure.observer?.actorId !== observerId ||
        lease.exposure.observer.physicalLife !== state.life ||
        !['sight', 'hearing', 'touch'].includes(lease.modality) ||
        (lease.value.kind !== 'association' && lease.modality !== lease.original.modality) ||
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
          'carried',
          'pile-contents',
          'public-attributes',
          'contact',
          'association',
          'observed-motion',
        ].includes(lease.value.kind) ||
        (lease.value.kind === 'association' &&
          (typeof lease.bodyLeaseId !== 'string' ||
            state.current[`${lease.subjectId}:body`]?.id !== lease.bodyLeaseId)) ||
        lease.original.observer.actorId !== observerId ||
        lease.original.observer.physicalLife !== state.life ||
        !Number.isSafeInteger(lease.originalOrdinal) ||
        !lease.original.facets[lease.originalOrdinal] ||
        lease.original.facets[lease.originalOrdinal]!.value.kind !== lease.value.kind ||
        lease.original.acquiredAt > world.simTime ||
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
        lease.valueMeasuredThrough > lease.confirmedThrough ||
        lease.valueAcquiredAt < lease.original.acquiredAt ||
        lease.valueAcquiredAt > world.simTime ||
        lease.confirmedThrough > world.simTime ||
        lease.confirmedThrough < lease.confirmedFrom
      )
        throw new Error('Invalid current perception facet.');
    }
  }
}

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
      (lease.value.kind === 'contact' && lease.value.detail !== contact.detail)
    ) {
      if (contact) renewed.set(lease.subjectId, { previous: lease.id, newLife });
      finalizeLease(world, observer, lease);
      delete state.current[key];
    }
  }
  for (const [sourceId, contact] of Object.entries(contacts)) {
    const key = `${sourceId}:contact`;
    const existing = state.current[key];
    if (existing) {
      if (existing.confirmedThrough < world.simTime) {
        existing.confirmedThrough = world.simTime;
        existing.valueMeasuredThrough = world.simTime;
        existing.revision++;
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
    const original = acquireObservation(world, observer, {
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
    state.current[key] = {
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
    };
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
    !observation.detector ||
    typeof observation.detector.id !== 'string' ||
    !Number.isSafeInteger(observation.detector.version) ||
    observation.detector.version < 1 ||
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
    if (
      (facet.value.kind === 'confirmation' &&
        facet.value.snapshot.valueAcquiredAt > observation.acquiredAt) ||
      (facet.value.kind === 'observed-motion' &&
        facet.value.later.valueAcquiredAt > observation.acquiredAt)
    )
      throw new Error('Perception support was acquired after its containing contribution.');
  }
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
      if (
        !validPoint(value.frame?.positionAtObservation) ||
        (value.frame.forwardAtObservation !== undefined &&
          !Number.isFinite(value.frame.forwardAtObservation))
      )
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
      break;
    case 'perceived-feature':
      validateReceivedFeatures(value.sample);
      break;
    case 'sound':
      validatePerceivedSound(value.sound);
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
        )
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
            ? !value.speaker.exposure?.episodeId
            : value.speaker.kind !== 'described' ||
              typeof value.speaker.descriptionAsHeard !== 'string')
      )
        throw new Error('Invalid heard warning speaker.');
      break;
    default:
      throw new Error('Invalid received sensory facet.');
  }
}
