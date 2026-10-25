import {
  validPerceivedPoint as validPoint,
  validateEvidenceSource,
  validateObservedLocation,
} from './perception-values.js';
export { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import { nextId } from './data.js';
import { canonicalJson } from './events.js';
import { chargeWork } from './work-budget.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { outwardStates } from './perception-frame.js';
import { equippedItems } from './equipment.js';
import { itemsForOwner } from './objects.js';
import { retainObservationConfirmation } from './experience.js';
import { knownPlaceEvidence } from './known-place-evidence.js';
import {
  selectedBodyIndividual,
  selectedOrdinaryWarning,
  selectedOutwardBodyName,
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
}
export type SensoryFacet =
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
  localSubject?:ObserverSubject;
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
}
export type PerceptionEvidenceState = Record<string, PerceptionEvidenceOwner>;
export interface EvidenceCut {
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
function owner(world: WorldState, observer: Entity): PerceptionEvidenceOwner {
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
  if (prior) return freeze(cloneValue(prior), true);
  const contribution: ObservationContribution = {
    id: nextId(world, 'perception-observation'),
    revision: 1,
    observer: observerLife(observer),
    origin: cloneValue(input.origin),
    acquiredAt: world.simTime,
    modality: input.modality,
    detector: { ...input.detector },
    facets: input.facets.map((facet, ordinal) => ({
      ...cloneValue(facet),
      ordinal,
      acquiredAt: world.simTime,
    })),
  };
  chargeWork({effects:1,outputBytes:evidenceEncoder.encode(JSON.stringify(contribution)).byteLength});
  state.receipts[key] = state.received.length;
  state.received.push(contribution);
  return freeze(cloneValue(contribution), true);
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
          .map(captureCurrentFacet)
      : [];
  const acquired = new Map<string, ObservationContribution>();
  for (const contribution of [
    ...retained,
    ...(state?.life === life.physicalLife ? state.received : []),
    ...current.map((facet) => facet.original),
  ]) {
    if (
      contribution.observer.actorId !== observerId ||
      contribution.observer.physicalLife !== life.physicalLife
    )
      continue;
    acquired.set(`${contribution.id}:${contribution.revision}`, cloneValue(contribution));
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
  if (!observer?.actor || (observer.actor.physicalLife ?? 0) !== cut.observer.physicalLife)
    return false;
  const forgotten = new Set(world.experience?.forgotten[cut.observer.actorId] ?? []);
  const corrections = world.experience?.corrections?.[cut.observer.actorId] ?? {};
  const supported = (observation: ObservationContribution): boolean => {
    const aliases = [
      observation.id,
      ...(observation.origin.kind === 'occurrence' ? [observation.origin.eventId] : []),
    ];
    if (aliases.some((id) => forgotten.has(id) || Object.hasOwn(corrections, id))) return false;
    return observation.facets.every(({ value }) => {
      if (value.kind === 'confirmation') return supported(value.snapshot.original);
      if (value.kind === 'observed-motion')
        return supported(value.earlier.original) && supported(value.later.original);
      if (value.kind !== 'claim') return true;
      return [
        ...value.support.map((fact) => fact.source.id),
        ...(value.supportAliases ?? []).map((alias) => alias.id),
      ].every((id) => !forgotten.has(id) && !Object.hasOwn(corrections, id));
    });
  };
  return cut.acquired.every(supported) && cut.current.every((facet) => supported(facet.original));
}
export function captureCurrentFacet(lease: LiveFacetSupport): CapturedCurrentFacet {
  const {
    subjectId: _subject,
    subjectPhysicalLife: _sourceLife,
    revision,
    motionContinuityRevision: _continuity,
    sourcePlacementRevision: _placement,
    ...value
  } = cloneValue(lease);
  return freeze(
    {
      ...value,
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

export function currentBodyObservation(
  world: WorldState,
  observerId: string,
  subjectId: string,
): (CapturedCurrentFacet & { value: Extract<SensoryFacet, { kind: 'body' }> }) | undefined {
  const lease = eligibleBodyLease(world, observerId, subjectId);
  return lease
    ? (captureCurrentFacet(lease) as CapturedCurrentFacet & {
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
    association.value.strength === 'supported'
    ? cloneValue(association.value.subject)
    : undefined;
}
export function currentBodyLocalSubject(world:WorldState,observerId:string,subjectId:string):ObserverSubject|undefined {
  const subject=eligibleBodyLease(world,observerId,subjectId)?.localSubject;
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
  return [
    'detected',
    'location',
    'body',
    'carried',
    'pile-contents',
    'public-attributes',
    'contact',
    'association',
    'observed-motion',
  ]
    .flatMap((kind) => state.current[`${subjectId}:${kind}`] ?? [])
    .filter(
      (lease) =>
        currentLeaseEligible(world, observerId, lease) &&
        (!lease.bodyLeaseId ||
          lease.bodyLeaseId === eligibleBodyLease(world, observerId, subjectId)?.id),
    )
    .map(captureCurrentFacet);
}
function currentLeaseEligible(world: WorldState, observerId: string, lease: LiveFacetSupport): boolean {
  const subject = entityGet(world.entities, lease.subjectId);
  if (!activelyParticipates(subject) || lease.subjectPhysicalLife !== (subject?.actor ? (subject.actor.physicalLife ?? 0) : null)) return false;
  if (lease.modality === 'sight') return !!eligibleBodyLease(world, observerId, lease.subjectId);
  const observer = entityGet(world.entities, observerId);
  return !!observer && sensesFor(world, observer).some(sense => sense.id === lease.original.detector.id);
}

function finalizeLease(world: WorldState, observer: Entity, lease: LiveFacetSupport): void {
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

/** The existing native sight phase supplies its completed admitted candidates. Projection
 * never calls this function. Changed measurements replace only their own latest values. */
export function reconcileVisualEvidence(
  world: WorldState,
  observer: Entity,
  subjects: readonly Entity[],
  detector: { id: string; version: number },
  episodeGraceSeconds = 0,
): void {
  const state = owner(world, observer);
  for (const [id, gap] of Object.entries(state.gaps))
    if (gap.through < world.simTime) delete state.gaps[id];
  const eligible = new Set(subjects.map((entity) => entity.id));
  for (const [key, lease] of Object.entries(state.current))
    if (
      lease.modality === 'sight' &&
      (!eligible.has(lease.subjectId) ||
        lease.subjectPhysicalLife !==
          (entityGet(world.entities, lease.subjectId)?.actor?.physicalLife ??
            (entityGet(world.entities, lease.subjectId)?.actor ? 0 : null)))
    ) {
      retainVisualGap(world, state, lease, episodeGraceSeconds);
      finalizeLease(world, observer, lease);
      delete state.current[key];
    }
  for (const subject of subjects) {
    chargeWork({tests:1});
    delete state.gaps[subject.id];
    const exposed = world.perceptionEpisodes?.[observer.id]?.[subject.id];
    if (subject.placement?.mode !== 'world') continue;
    const placement = subject.placement;
    const body = bodyProfile(subject);
    const value: ObservedBody = {
      kind: subject.kind,
      position: { ...readOnlyDraftView(worldPosition(subject)) },
      heading: subject.spatial.heading,
      appearance: subject.appearance ?? 'sprite',
      radius: body.radius,
      height: body.height,
      supportSurfaceId: worldSupport(subject),
      outward: outwardStates(subject),
      label: selectedOutwardBodyName(world, subject),
      ...(!subject.actor
        ? {
            ...(subject.description ? { description: subject.description } : {}),
          }
        : {}),
      ...(subject.resource ? { quantity: subject.resource.quantity } : {}),
      ...(subject.heat ? { heatLit: subject.heat.lit } : {}),
      ...(subject.remains ? { remainsPhase: subject.remains.phase } : {}),
    };
    const frame: ObservationFrame = {
      positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) },
      forwardAtObservation: observer.spatial.heading,
    };
    const values: SensoryFacet[] = [
      { kind: 'detected', detected: subject.actor ? 'body' : 'surface', limits: [] },
      {
        kind: 'location',
        location: { kind: 'point', point: value.position, errorRadius: 0 },
        frame,
      },
      { kind: 'body', body: value },
      {
        kind: 'carried',
        items: equippedItems(world, subject.id).flatMap((item) => {
          const definition = world.itemDefinitions[item.definitionId];
          return definition ? [{ itemKindAsObserved: definition.name }] : [];
        }),
      },
    ];
    if (subject.kind === 'item-pile' || subject.remains)
      values.push({
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
    const publicAttributes = projectAttributes(world, subject, 'public');
    if (publicAttributes.length)
      values.push({ kind: 'public-attributes', attributes: publicAttributes });
    let original = state.current[`${subject.id}:detected`]?.original;
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
      chargeWork({tests:1});
      const key = `${subject.id}:${facet.kind}`;
      let prior = state.current[key];
      if (
        facet.kind === 'location' &&
        prior?.value.kind === 'location' &&
        prior.value.location.kind === 'point' &&
        prior.valueMeasuredThrough < world.simTime &&
        prior.motionContinuityRevision === (placement.motionContinuityRevision ?? 0) &&
        (JSON.stringify(prior.value.location.point) ===
          JSON.stringify(facet.location.kind === 'point' ? facet.location.point : null) ||
          placement.revision > (prior.sourcePlacementRevision ?? -1))
      )
        earlierLocation = captureCurrentFacet(prior) as CapturedLocationSample;
      let facetOriginal = original;
      if (
        prior &&
        (facet.kind === 'carried' || facet.kind === 'pile-contents') &&
        JSON.stringify(prior.value) !== JSON.stringify(facet)
      ) {
        finalizeLease(world, observer, prior);
        delete state.current[key];
        prior = undefined;
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
          original: cloneValue(facetOriginal!),
          originalOrdinal: facetOriginal!.facets.length === 1 ? 0 : ordinal,
          modality: 'sight',
          value: cloneValue(facet),
          valueMeasuredFrom: world.simTime,
          valueMeasuredThrough: world.simTime,
          valueAcquiredAt: world.simTime,
          confirmedFrom: world.simTime,
          confirmedThrough: world.simTime,
        };
      } else {
        const changed = JSON.stringify(prior.value) !== JSON.stringify(facet);
        if (!changed && prior.confirmedThrough === world.simTime) return;
        prior.revision++;
        prior.confirmedThrough = world.simTime;
        if (changed || facet.kind === 'location') {
          prior.value = cloneValue(facet);
          prior.valueMeasuredFrom = world.simTime;
          prior.valueMeasuredThrough = world.simTime;
          prior.valueAcquiredAt = world.simTime;
        } else prior.valueMeasuredThrough = world.simTime;
        if (facet.kind === 'location') {
          prior.motionContinuityRevision = placement.motionContinuityRevision ?? 0;
          prior.sourcePlacementRevision = placement.revision;
        }
      }
    });
    const currentBody = state.current[`${subject.id}:body`];
    if (subject.actor && currentBody && !currentBody.localSubject) {
      const localSubject=selectedBodyIndividual(world, observer.id, subject.id);
      if(localSubject)currentBody.localSubject=localSubject;
    }
    const locationLease = state.current[`${subject.id}:location`];
    const motionKey = `${subject.id}:observed-motion`;
    const laterLocation =
      locationLease && (captureCurrentFacet(locationLease) as CapturedLocationSample | undefined);
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
        (!laterLocation ||
          laterLocation.valueMeasuredThrough > priorMotion.valueMeasuredThrough ||
          priorMotion.motionContinuityRevision !== locationLease?.motionContinuityRevision)
      ) {
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
        original: cloneValue(received),
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
        finalizeLease(world, observer, state.current[key]!);
        delete state.current[key];
      }
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
  for (const [key, lease] of Object.entries(state.current))
    if (!modality || lease.modality === modality) {
      retainVisualGap(world, state, lease, episodeGraceSeconds);
      if (observer?.actor && state.life === (observer.actor.physicalLife ?? 0))
        finalizeLease(world, observer, lease);
      delete state.current[key];
    }
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
    if (received) return freeze(cloneValue(received.original), true);
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
    });
    associated.add(candidate.individualId);
  }
  if (recognition?.learnedSubject) {
    values.push({
      kind: 'association',
      subject: cloneValue(recognition.learnedSubject),
      strength: 'supported',
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
          : event.exposure?.kind === 'place' &&
              event.exposure.reportedBy &&
              value.kind === 'location'
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
    if (ordinal >= 0)
      owner(world, observer).current[`${binding!.entityId}:association`] = {
        id: nextId(world, 'perception-lease'),
        revision: 1,
        observer: observerLife(observer),
        subjectId: binding!.entityId,
        subjectPhysicalLife: binding!.physicalLife,
        bodyLeaseId: bodyLease.id,
        exposure: cloneValue(bodyLease.exposure),
        original: cloneValue(contribution),
        originalOrdinal: ordinal,
        modality: 'sight',
        value: cloneValue(contribution.facets[ordinal]!.value),
        valueMeasuredFrom: event.at,
        valueMeasuredThrough: event.at,
        valueAcquiredAt: contribution.acquiredAt,
        confirmedFrom: event.at,
        confirmedThrough: event.at,
      };
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

export function validatePerceptionEvidenceState(world: WorldState): void {
  const states = world.perceptionEvidence;
  if (states === undefined) return;
  if (!states || typeof states !== 'object' || Array.isArray(states))
    throw new Error('Invalid active perception owners.');
  const originals = new Map<string,string>();
  for (const [observerId, state] of Object.entries(states)) {
    if (
      !state ||
      !Number.isSafeInteger(state.life) ||
      state.life < 0 ||
      !Number.isSafeInteger(state.receivedAtSequence) ||
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
        observation.observer.physicalLife !== state.life
      )
        throw new Error('Invalid perception observer life.');
    }
    for (const [key, lease] of Object.entries(state.current)) {
      validateObservationContribution(lease.original, originals);
      validateSensoryFacet(lease.value, originals);
      if (
        !lease ||
        typeof lease.id !== 'string' ||
        !lease.id.startsWith('perception-lease-') ||
        !Number.isSafeInteger(lease.revision) ||
        lease.revision < 1 ||
        lease.observer.actorId !== observerId ||
        lease.observer.physicalLife !== state.life ||
        typeof lease.subjectId !== 'string' ||
        (lease.subjectPhysicalLife !== null &&
          (!Number.isSafeInteger(lease.subjectPhysicalLife) || lease.subjectPhysicalLife < 0)) ||
        key !== `${lease.subjectId}:${lease.value.kind}` ||
        (lease.localSubject!==undefined && (!validObserverSubject(lease.localSubject) ||
          (lease.localSubject.kind==='individual'&&!world.observerIdentities?.[observerId]?.[lease.localSubject.individualId]))) ||
        ![
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
        ![
          lease.valueMeasuredFrom,
          lease.valueMeasuredThrough,
          lease.valueAcquiredAt,
          lease.confirmedFrom,
          lease.confirmedThrough,
        ].every(Number.isFinite) ||
        lease.valueMeasuredThrough < lease.valueMeasuredFrom ||
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
  for (const [key, lease] of Object.entries(state.current)) {
    if (lease.modality !== 'touch') continue;
    const contact = contacts[lease.subjectId];
    if (!contact || (lease.value.kind === 'contact' && lease.value.detail !== contact.detail)) {
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
    const value: SensoryFacet = { kind: 'contact', exposure, detail: contact.detail };
    const original = acquireObservation(world, observer, {
      origin: {
        kind: 'exposure',
        episodeId: contact.id,
        detectorId: contact.senseId,
        measuredFrom: contact.changedAt,
        measuredThrough: world.simTime,
      },
      modality: 'touch',
      detector: { id: contact.senseId, version: 1 },
      facets: [
        {
          role: 'direct',
          asOf: world.simTime,
          measuredFrom: contact.changedAt,
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
      subjectPhysicalLife: entityGet(world.entities, sourceId)?.actor
        ? (entityGet(world.entities, sourceId)?.actor?.physicalLife ?? 0)
        : null,
      exposure,
      original,
      originalOrdinal: 0,
      modality: 'touch',
      value,
      valueMeasuredFrom: contact.changedAt,
      valueMeasuredThrough: world.simTime,
      valueAcquiredAt: world.simTime,
      confirmedFrom: contact.changedAt,
      confirmedThrough: world.simTime,
    };
  }
}

/** Current-format validation is shared by native restore and server record validation. */
export function validateObservationContribution(
  value: unknown,
  originals = new Map<string,string>(),
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
  const key = canonicalJson([observation.observer, observation.id, observation.revision]);
  const body = canonicalJson(observation), prior = originals.get(key);
  if (prior !== undefined && prior !== body) throw new Error('Conflicting original observation revision.');
  originals.set(key, body);
  for (const facet of observation.facets) validateSensoryFacet(facet.value, originals);
}

function validateSensoryFacet(value: SensoryFacet, originals = new Map<string,string>()): void {
  switch (value.kind) {
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
            typeof attribute.id !== 'string' ||
            !Number.isSafeInteger(attribute.version) ||
            !['meter', 'category'].includes(attribute.display) ||
            !['unknown', 'known'].includes(attribute.status) ||
            (attribute.value !== null &&
              typeof attribute.value !== 'string' &&
              typeof attribute.value !== 'boolean' &&
              !(typeof attribute.value === 'number' && Number.isFinite(attribute.value))),
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
        !['supported', 'possible', 'ambiguous'].includes(value.strength)
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
        !snapshot.original.facets[snapshot.originalOrdinal] ||
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
  }
}
