import { nextId } from './data.js';
import { cloneValue, readOnlyDraftView } from './draft.js';
import { entityGet } from './entity-collection.js';
import { bodyProfile, worldPosition, worldSupport } from './spatial-state.js';
import { outwardStates } from './perception-frame.js';
import { equippedItems } from './equipment.js';
import { retainObservationConfirmation } from './experience.js';
import { knownPlaceEvidence } from './known-place-evidence.js';
import { selectedOrdinaryWarning } from './world-composition.js';
import type { Awareness } from './experience.js';
import type { ObserverSubject } from './knowledge.js';
import type { Entity, Position, WorldEvent, WorldState } from './types.js';

export interface ObserverLife {
  actorId: string;
  physicalLife: number;
}
/** These versions belong to their source families; they are never compared across families. */
export type EvidenceSource =
  | { family: 'awareness' | 'memory' | 'action-result'; id: string; revision: string; observer: ObserverLife }
  | { family: 'private-condition'; id: string; revision: string | number; observer: ObserverLife }
  | { family: 'native-exposure' | 'native-response'; id: string; revision: number; observer: ObserverLife };
export interface ObservationFactKey { source: EvidenceSource; ordinal: number }
export interface ObservationExposure { observer: ObserverLife; episodeId: string }
export type EvidenceParticipant =
  | { kind: 'exposure'; exposure: ObservationExposure }
  | { kind: 'individual'; subject: ObserverSubject; association?: ObservationFactKey }
  | { kind: 'described'; descriptionAsHeard: string };
export type ObservedLocation =
  | { kind: 'point'; point: Position; errorRadius: number }
  | { kind: 'bearing'; from: Position; sector: number; elevation: 'above' | 'level' | 'below'; spread: number }
  | { kind: 'region'; center: Position; radius: number };
export interface ObservationFrame { positionAtObservation: Position; forwardAtObservation?: number }
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
}
export type SensoryFacet =
  | { kind: 'detected'; detected: 'signal' | 'surface' | 'body' | 'impact'; limits: string[] }
  | { kind: 'location'; location: ObservedLocation; frame: ObservationFrame }
  | { kind: 'body'; body: ObservedBody }
  | { kind: 'carried'; items: Array<{ itemKindAsObserved: string }> }
  | { kind: 'confirmation'; snapshot: CapturedCurrentFacet }
  | { kind: 'contact'; exposure: ObservationExposure; detail: 'present' | 'moving' }
  | { kind: 'speech'; speech: NonNullable<Awareness['speech']> }
  | { kind: 'event'; eventType: string; text: string; data: NonNullable<WorldEvent['data']>; references: NonNullable<Awareness['references']> }
  | { kind: 'association'; subject: ObserverSubject; strength: 'supported' | 'possible' | 'ambiguous' }
  | { kind: 'claim'; claim: { kind: 'danger'; where: ObservedLocation; when: { kind: 'stated-interval'; from: number; through: number; precision: 'approximate' }; presence: 'possible' }; strength: 'possible'; speaker: EvidenceParticipant; wordsAsHeard: string; support: ObservationFactKey[] };
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
  | { kind: 'exposure'; episodeId: string; detectorId: string; measuredFrom: number; measuredThrough: number };
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
export interface CapturedCurrentFacet extends Omit<LiveFacetSupport, 'subjectId' | 'revision'> {
  confirmation: Extract<EvidenceSource, { family: 'native-exposure' | 'native-response' }>;
}
export interface PerceptionEvidenceOwner {
  life: number;
  /** Residency boundary only. Explicit acquired bodies, never this number, define a cut. */
  receivedAtSequence: number;
  received: ObservationContribution[];
  current: Record<string, LiveFacetSupport>;
}
export type PerceptionEvidenceState = Record<string, PerceptionEvidenceOwner>;
export interface EvidenceCut {
  observer: ObserverLife;
  at: number;
  lastIncludedOrder: number;
  acquired: ObservationContribution[];
  current: CapturedCurrentFacet[];
}

const observerLife = (entity: Entity): ObserverLife => ({ actorId: entity.id, physicalLife: entity.actor?.physicalLife ?? 0 });
function owner(world: WorldState, observer: Entity): PerceptionEvidenceOwner {
  const states = (world.perceptionEvidence ??= {});
  let state = states[observer.id];
  const life = observer.actor?.physicalLife ?? 0;
  if (!state || state.life !== life)
    state = states[observer.id] = { life, receivedAtSequence: world.sequence, received: [], current: {} };
  if (state.receivedAtSequence !== world.sequence) {
    state.received = [];
    state.receivedAtSequence = world.sequence;
  }
  return state;
}
export const observationFactKey = (observation: ObservationContribution, ordinal: number): ObservationFactKey => ({
  source: { family: 'native-exposure', observer: { ...observation.observer }, id: observation.id, revision: observation.revision }, ordinal,
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
  const prior = state.received.find((entry) => entry.modality === input.modality &&
    entry.detector.id === input.detector.id && entry.detector.version === input.detector.version &&
    JSON.stringify(entry.origin) === JSON.stringify(input.origin));
  if (prior) return cloneValue(prior);
  const contribution: ObservationContribution = {
    id: nextId(world, 'perception-observation'), revision: 1, observer: observerLife(observer),
    origin: cloneValue(input.origin), acquiredAt: world.simTime,
    modality: input.modality, detector: { ...input.detector },
    facets: input.facets.map((facet, ordinal) => ({ ...cloneValue(facet), ordinal, acquiredAt: world.simTime })),
  };
  state.received.push(contribution);
  return cloneValue(contribution);
}

/** Capture-only: callers may supply retained source-owned support prepared before this cut.
 * No sight query, source hydration, ID allocation or timestamp-based history reconstruction. */
export function captureEvidenceCut(world: WorldState, observerId: string, retained: readonly ObservationContribution[] = []): EvidenceCut {
  const entity = entityGet(world.entities, observerId);
  if (!entity?.actor) throw new Error('An evidence cut requires an existing observer.');
  const life = observerLife(entity);
  const state = world.perceptionEvidence?.[observerId];
  const current = state?.life === life.physicalLife ? Object.values(state.current).map(captureCurrentFacet) : [];
  const acquired = new Map<string, ObservationContribution>();
  for (const contribution of [...retained, ...(state?.life === life.physicalLife ? state.received : []), ...current.map((facet) => facet.original)]) {
    if (contribution.observer.actorId !== observerId || contribution.observer.physicalLife !== life.physicalLife)
      continue;
    acquired.set(`${contribution.id}:${contribution.revision}`, cloneValue(contribution));
  }
  return { observer: life, at: world.simTime, lastIncludedOrder: world.nextId - 1, acquired: [...acquired.values()], current };
}
export function captureCurrentFacet(lease: LiveFacetSupport): CapturedCurrentFacet {
  const { subjectId: _subject, revision, ...value } = cloneValue(lease);
  return { ...value, confirmation: { family: 'native-exposure', observer: { ...lease.observer }, id: lease.id, revision } };
}

export function currentBodyObservation(world: WorldState, observerId: string, subjectId: string): CapturedCurrentFacet & { value: Extract<SensoryFacet, { kind: 'body' }> } | undefined {
  const state = world.perceptionEvidence?.[observerId];
  const observer = entityGet(world.entities, observerId);
  if (!observer?.actor || state?.life !== (observer.actor.physicalLife ?? 0)) return;
  const lease = Object.values(state.current).find((entry) => entry.subjectId === subjectId && entry.value.kind === 'body');
  return lease ? captureCurrentFacet(lease) as CapturedCurrentFacet & { value: Extract<SensoryFacet, { kind: 'body' }> } : undefined;
}

export function currentObservedFacets(world: WorldState, observerId: string, subjectId: string): CapturedCurrentFacet[] {
  const state = world.perceptionEvidence?.[observerId];
  const observer = entityGet(world.entities, observerId);
  if (!observer?.actor || state?.life !== (observer.actor.physicalLife ?? 0)) return [];
  return Object.values(state.current).filter((lease) => lease.subjectId === subjectId).map(captureCurrentFacet);
}

function finalizeLease(world: WorldState, observer: Entity, lease: LiveFacetSupport): void {
  const snapshot = captureCurrentFacet(lease);
  const contribution = acquireObservation(world, observer, {
    origin: { kind: 'exposure', episodeId: lease.exposure.episodeId, detectorId: `${lease.id}:${lease.revision}`, measuredFrom: lease.confirmedFrom, measuredThrough: lease.confirmedThrough },
    modality: lease.modality, detector: { id: 'native:confirmation', version: 1 },
    facets: [{ role: 'direct', asOf: lease.valueMeasuredThrough, measuredFrom: lease.valueMeasuredFrom, measuredThrough: lease.valueMeasuredThrough, value: { kind: 'confirmation', snapshot } }],
  });
  const description = lease.value.kind === 'carried'
    ? lease.value.items.map((item) => item.itemKindAsObserved).join(', ') || 'no visible equipment'
    : lease.value.kind === 'body' ? lease.value.body.outward.filter(Boolean).join(', ')
      : lease.value.kind === 'location' ? 'a previously observed location' : 'a previously detected presence';
  retainObservationConfirmation(world, observer.id, contribution, `Last confirmed: ${description}.`, world.cognitionPolicy.recording.exposureImportance);
}

/** The existing native sight phase supplies its completed admitted candidates. Projection
 * never calls this function. Changed measurements replace only their own latest values. */
export function reconcileVisualEvidence(world: WorldState, observer: Entity, subjects: readonly Entity[], detector: { id: string; version: number }): void {
  const state = owner(world, observer);
  const eligible = new Set(subjects.map((entity) => entity.id));
  for (const [key, lease] of Object.entries(state.current))
    if (lease.modality === 'sight' && !eligible.has(lease.subjectId)) {
      finalizeLease(world, observer, lease);
      delete state.current[key];
    }
  for (const subject of subjects) {
    const exposed = world.perceptionEpisodes?.[observer.id]?.[subject.id];
    if (subject.placement?.mode !== 'world') continue;
    const body = bodyProfile(subject);
    const value: ObservedBody = {
      kind: subject.kind, position: { ...readOnlyDraftView(worldPosition(subject)) },
      heading: subject.spatial.heading, appearance: subject.appearance ?? 'sprite', radius: body.radius,
      height: body.height, supportSurfaceId: worldSupport(subject), outward: outwardStates(subject),
    };
    const frame: ObservationFrame = { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) }, forwardAtObservation: observer.spatial.heading };
    const values: SensoryFacet[] = [
      { kind: 'detected', detected: subject.actor ? 'body' : 'surface', limits: [] },
      { kind: 'location', location: { kind: 'point', point: value.position, errorRadius: 0 }, frame },
      { kind: 'body', body: value },
      { kind: 'carried', items: equippedItems(world, subject.id).flatMap((item) => {
        const definition = world.itemDefinitions[item.definitionId];
        return definition ? [{ itemKindAsObserved: definition.name }] : [];
      }) },
    ];
    let original = Object.values(state.current).find((entry) => entry.subjectId === subject.id && entry.modality === 'sight')?.original;
    if (!original) original = acquireObservation(world, observer, {
      origin: { kind: 'exposure', episodeId: exposed ?? nextId(world, 'perception-exposure'), detectorId: detector.id, measuredFrom: world.simTime, measuredThrough: world.simTime },
      modality: 'sight', detector, facets: values.map((facet) => ({ role: 'direct', asOf: world.simTime, measuredFrom: world.simTime, measuredThrough: world.simTime, value: facet })),
    });
    const exposure = { observer: observerLife(observer), episodeId: original.id };
    values.forEach((facet, ordinal) => {
      const key = `${subject.id}:${facet.kind}`;
      let prior = state.current[key];
      if (prior && facet.kind === 'carried' && JSON.stringify(prior.value) !== JSON.stringify(facet)) {
        finalizeLease(world, observer, prior);
        delete state.current[key];
        prior = undefined;
        original = acquireObservation(world, observer, {
          origin: { kind: 'exposure', episodeId: exposure.episodeId, detectorId: `${detector.id}:carried`, measuredFrom: world.simTime, measuredThrough: world.simTime },
          modality: 'sight', detector, facets: [{ role: 'direct', asOf: world.simTime, measuredFrom: world.simTime, measuredThrough: world.simTime, value: facet }],
        });
      }
      if (!prior) {
        state.current[key] = { id: nextId(world, 'perception-lease'), revision: 1, observer: observerLife(observer), subjectId: subject.id, exposure,
          original: cloneValue(original!), originalOrdinal: original!.facets.length === 1 ? 0 : ordinal, modality: 'sight', value: cloneValue(facet),
          valueMeasuredFrom: world.simTime, valueMeasuredThrough: world.simTime, valueAcquiredAt: world.simTime,
          confirmedFrom: world.simTime, confirmedThrough: world.simTime };
      } else {
        const changed = JSON.stringify(prior.value) !== JSON.stringify(facet);
        if (!changed && prior.confirmedThrough === world.simTime) return;
        prior.revision++;
        prior.confirmedThrough = world.simTime;
        if (changed) {
          prior.value = cloneValue(facet);
          prior.valueMeasuredFrom = world.simTime;
          prior.valueMeasuredThrough = world.simTime;
          prior.valueAcquiredAt = world.simTime;
        } else prior.valueMeasuredThrough = world.simTime;
      }
    });
  }
}

/** Physical loss ends availability immediately; episode/familiarity continuity is separate. */
export function endCurrentEvidence(world: WorldState, observerId: string, modality?: ObservationContribution['modality']): void {
  const state = world.perceptionEvidence?.[observerId];
  if (!state) return;
  const observer = entityGet(world.entities, observerId);
  for (const [key, lease] of Object.entries(state.current))
    if (!modality || lease.modality === modality) {
      if (observer?.actor && state.life === (observer.actor.physicalLife ?? 0)) finalizeLease(world, observer, lease);
      delete state.current[key];
    }
}

export function acquireAwarenessObservation(world: WorldState, event: WorldEvent, awareness: Awareness): ObservationContribution | undefined {
  if (awareness.observation?.origin.kind === 'occurrence' && awareness.observation.origin.eventId === event.id &&
    awareness.observation.observer.actorId === awareness.actorId) return cloneValue(awareness.observation);
  if (awareness.modality === 'internal') return;
  const observer = entityGet(world.entities, awareness.actorId);
  if (!observer?.actor) return;
  if (event.type === 'contact') {
    const contactId = awareness.eventData?.['contactId'], senseId = awareness.eventData?.['senseId'], detail = awareness.eventData?.['detail'];
    if (typeof contactId !== 'string' || typeof senseId !== 'string' || (detail !== 'present' && detail !== 'moving')) return;
    const exposure: ObservationExposure = { observer: observerLife(observer), episodeId: contactId };
    return acquireObservation(world, observer, { origin: { kind: 'exposure', episodeId: contactId, detectorId: senseId, measuredFrom: event.at, measuredThrough: event.at },
      modality: 'touch', detector: { id: senseId, version: 1 },
      facets: [{ role: 'direct', asOf: event.at, measuredFrom: event.at, measuredThrough: event.at, value: { kind: 'contact', exposure, detail } }],
    });
  }
  const modality = awareness.modality === 'heard' ? 'hearing' : awareness.modality === 'felt' ? 'touch' : 'sight';
  const values: SensoryFacet[] = [{ kind: 'detected', detected: modality === 'hearing' ? 'signal' : modality === 'touch' ? 'impact' : 'surface', limits: [] }];
  if (event.exposure?.kind === 'place')
    values.push({ kind: 'location', location: { kind: 'point', point: { ...event.exposure.point }, errorRadius: 0 }, frame: { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) } } });
  const visualSubjectId = awareness.sourceId === observer.id ? awareness.targetId : awareness.sourceId;
  const visualSubject = modality === 'sight' && visualSubjectId ? entityGet(world.entities, visualSubjectId) : undefined;
  if (visualSubject?.placement?.mode === 'world' && !event.exposure)
    values.push({ kind: 'location', location: { kind: 'point', point: { ...readOnlyDraftView(worldPosition(visualSubject)) }, errorRadius: 0 }, frame: { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) }, forwardAtObservation: observer.spatial.heading } });
  else if (modality === 'touch')
    values.push({ kind: 'location', location: { kind: 'point', point: { ...readOnlyDraftView(worldPosition(observer)) }, errorRadius: bodyProfile(observer).radius }, frame: { positionAtObservation: { ...readOnlyDraftView(worldPosition(observer)) } } });
  if (awareness.speech) {
    const speech = awareness.speech;
    if (speech.direction) values.push({ kind: 'location', location: { kind: 'bearing', from: { ...speech.listenerPosition }, ...speech.direction, spread: Math.PI / 4 }, frame: { positionAtObservation: { ...speech.listenerPosition } } });
    values.push({ kind: 'speech', speech: cloneValue(speech) });
  } else values.push({ kind: 'event', eventType: awareness.eventType ?? event.type, text: awareness.text, data: cloneValue(awareness.eventData ?? {}), references: cloneValue(awareness.references ?? []) });
  return acquireObservation(world, observer, { origin: { kind: 'occurrence', eventId: event.id, at: event.at, order: event.order ?? event.sequence }, modality,
    detector: { id: `native:${modality}`, version: 1 },
    facets: values.map((value) => ({ role: 'direct', asOf: event.at, measuredFrom: event.at, measuredThrough: event.at, value })),
  });
}

export function receivedEventObservation(world: WorldState, observerId: string, eventId: string): ObservationContribution | undefined {
  const entry = world.perceptionEvidence?.[observerId]?.received.find((observation) => observation.origin.kind === 'occurrence' && observation.origin.eventId === eventId);
  return entry && cloneValue(entry);
}

/** Ground only an actually received complete clause. A source-complete prepared place
 * index is required; its absence throws the existing coherent-prefix preparation hold. */
export function acquireOrdinaryWarning(world: WorldState, event: WorldEvent, awareness: Awareness): ObservationContribution | undefined {
  if (awareness.speech?.perception !== 'heard' || !awareness.observation) return;
  const interpretation = selectedOrdinaryWarning(world, awareness.speech.segments);
  if (!interpretation || world.simTime < event.at || world.simTime >= event.at + interpretation.duration) return;
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
  const value: SensoryFacet = { kind: 'claim', claim: { kind: 'danger', where: cloneValue(place.location),
    when: { kind: 'stated-interval', from: event.at, through: event.at + interpretation.duration, precision: 'approximate' }, presence: 'possible' },
    strength: 'possible', speaker, wordsAsHeard: awareness.speech.segments.flatMap((segment) => segment.kind === 'heard' ? [segment.text] : []).join(' '),
    support: [observationFactKey(source, speechOrdinal), { source: cloneValue(place.source), ordinal: 0 }],
  };
  return acquireObservation(world, observer, {
    origin: { kind: 'occurrence', eventId: event.id, at: event.at, order: event.order ?? event.sequence },
    modality: 'hearing', detector: { id: 'native:grounded-warning', version: 1 },
    facets: [{ role: 'testimony', asOf: event.at, measuredFrom: event.at, measuredThrough: event.at, value }],
  });
}

export function validatePerceptionEvidenceState(world: WorldState): void {
  const states = world.perceptionEvidence;
  if (states === undefined) return;
  if (!states || typeof states !== 'object' || Array.isArray(states)) throw new Error('Invalid active perception owners.');
  for (const [observerId, state] of Object.entries(states)) {
    if (!state || !Number.isSafeInteger(state.life) || state.life < 0 || !Number.isSafeInteger(state.receivedAtSequence) ||
      !Array.isArray(state.received) || !state.current || typeof state.current !== 'object' || Array.isArray(state.current))
      throw new Error('Invalid active perception owner.');
    for (const observation of state.received) {
      validateObservationContribution(observation);
      if (observation.observer.actorId !== observerId || observation.observer.physicalLife !== state.life) throw new Error('Invalid perception observer life.');
    }
    for (const lease of Object.values(state.current)) {
      validateObservationContribution(lease.original);
      if (!lease || typeof lease.id !== 'string' || !lease.id.startsWith('perception-lease-') || !Number.isSafeInteger(lease.revision) || lease.revision < 1 ||
        lease.observer.actorId !== observerId || lease.observer.physicalLife !== state.life || typeof lease.subjectId !== 'string' ||
        !Number.isSafeInteger(lease.originalOrdinal) || !lease.original.facets[lease.originalOrdinal] ||
        ![lease.valueMeasuredFrom, lease.valueMeasuredThrough, lease.valueAcquiredAt, lease.confirmedFrom, lease.confirmedThrough].every(Number.isFinite) ||
        lease.valueMeasuredThrough < lease.valueMeasuredFrom || lease.confirmedThrough < lease.confirmedFrom)
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
    const exposure: ObservationExposure = { observer: observerLife(observer), episodeId: contact.id };
    const value: SensoryFacet = { kind: 'contact', exposure, detail: contact.detail };
    const original = acquireObservation(world, observer, {
      origin: { kind: 'exposure', episodeId: contact.id, detectorId: contact.senseId, measuredFrom: contact.changedAt, measuredThrough: world.simTime },
      modality: 'touch', detector: { id: contact.senseId, version: 1 },
      facets: [{ role: 'direct', asOf: world.simTime, measuredFrom: contact.changedAt, measuredThrough: world.simTime, value }],
    });
    state.current[key] = { id: nextId(world, 'perception-lease'), revision: 1, observer: observerLife(observer), subjectId: sourceId,
      exposure, original, originalOrdinal: 0, modality: 'touch', value, valueMeasuredFrom: contact.changedAt, valueMeasuredThrough: world.simTime,
      valueAcquiredAt: world.simTime, confirmedFrom: contact.changedAt, confirmedThrough: world.simTime };
  }
}

/** Current-format validation is shared by native restore and server record validation. */
export function validateObservationContribution(value: unknown): asserts value is ObservationContribution {
  const observation = value as ObservationContribution | undefined;
  if (!observation || typeof observation !== 'object' || typeof observation.id !== 'string' || !observation.id.startsWith('perception-observation-') ||
    !Number.isSafeInteger(observation.revision) || observation.revision < 1 || !observation.observer || typeof observation.observer.actorId !== 'string' ||
    !Number.isSafeInteger(observation.observer.physicalLife) || observation.observer.physicalLife < 0 || !Number.isFinite(observation.acquiredAt) ||
    !['sight', 'hearing', 'touch'].includes(observation.modality) || !observation.detector || typeof observation.detector.id !== 'string' ||
    !Number.isSafeInteger(observation.detector.version) || observation.detector.version < 1 || !observation.origin || !Array.isArray(observation.facets) ||
    observation.facets.some((facet, ordinal) => facet.ordinal !== ordinal || !['direct', 'testimony', 'inference'].includes(facet.role) ||
      !Number.isFinite(facet.asOf) || !Number.isFinite(facet.measuredFrom) || !Number.isFinite(facet.measuredThrough) || facet.measuredThrough < facet.measuredFrom ||
      !Number.isFinite(facet.acquiredAt) || facet.acquiredAt > observation.acquiredAt || !facet.value ||
      !['detected', 'location', 'body', 'carried', 'confirmation', 'contact', 'speech', 'event', 'association', 'claim'].includes(facet.value.kind)))
    throw new Error('Invalid acquired perception evidence.');
  if (observation.origin.kind === 'occurrence') {
    if (typeof observation.origin.eventId !== 'string' || !Number.isFinite(observation.origin.at) || !Number.isSafeInteger(observation.origin.order))
      throw new Error('Invalid perception occurrence binding.');
  } else if (observation.origin.kind !== 'exposure' || typeof observation.origin.episodeId !== 'string' || typeof observation.origin.detectorId !== 'string' ||
    !Number.isFinite(observation.origin.measuredFrom) || !Number.isFinite(observation.origin.measuredThrough) || observation.origin.measuredThrough < observation.origin.measuredFrom)
    throw new Error('Invalid perception exposure binding.');
}
