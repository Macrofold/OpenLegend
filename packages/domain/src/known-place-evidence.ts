import { original, isDraft } from 'immer';
import { PERSONAL_EVIDENCE_PREPARATION, validPersonalSourceRef } from './experience-source.js';
import { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import type { PersonalSourceRef } from './experience-source.js';
import type { Awareness } from './experience.js';
import type { EvidenceSource, ObservedLocation } from './perception-evidence.js';
import type { ObservationContribution } from './perception-evidence.js';
import type { EncounterExposure } from './places.js';
import type { ExperienceEntry, WorldState } from './types.js';
import type { TemporalSupportCapsule } from './temporal-evidence.js';

export interface RetainedPlaceObservation {
  capsule: KnownPlaceCapsule;
  exposure: Extract<EncounterExposure, { kind: 'place' }>;
}

/** A minimal projection of one retained place observation, never live place geometry. */
export interface KnownPlaceCapsule {
  placeId: string;
  label: string;
  location: ObservedLocation;
  source: EvidenceSource;
  facetOrdinal: number;
  personalSource?: PersonalSourceRef;
  /** Original personal occurrence alias, used only for correction/forgetting routing. */
  sourceEventId?: string;
  observedAt: number;
  observedOrder: number;
  acquiredAt: number;
  provenance: 'observed' | 'testimony' | 'authored';
}
export interface PreparedKnownPlaceEvidence {
  capsules: readonly KnownPlaceCapsule[];
  bytes: number;
  /** Each exact label retains every matching place, including equal authored labels. */
  labels: ReadonlyMap<string, readonly KnownPlaceCapsule[]>;
}
const copyLocation = (location: ObservedLocation): ObservedLocation =>
  location.kind === 'point'
    ? { ...location, point: { ...location.point } }
    : location.kind === 'region'
      ? { ...location, center: { ...location.center } }
      : { ...location, from: { ...location.from } };
const copyCapsule = (capsule: KnownPlaceCapsule): KnownPlaceCapsule => ({
  ...capsule,
  location: copyLocation(capsule.location),
  source: { ...capsule.source, observer: { ...capsule.source.observer } },
  ...(capsule.personalSource ? { personalSource: { ...capsule.personalSource } } : {}),
});
const textEncoder = new TextEncoder();
interface KnownPlacePreparation {
  value?: PreparedKnownPlaceEvidence;
  revision: object;
}
const unpreparedRevision = Object.freeze({});
const prepared = new WeakMap<WorldState, Map<string, KnownPlacePreparation>>();
export class KnownPlacePreparationError extends Error {
  override readonly name = 'KnownPlacePreparationError';
  constructor() {
    super(
      'Required remembered-place preparation is incomplete; the dependent operation must wait.',
    );
  }
}
export function prepareKnownPlaceEvidence(
  capsules: readonly KnownPlaceCapsule[],
): PreparedKnownPlaceEvidence {
  if (capsules.length > PERSONAL_EVIDENCE_PREPARATION.rows) throw new KnownPlacePreparationError();
  const labels = new Map<string, KnownPlaceCapsule[]>();
  let bytes = 0;
  for (const capsule of capsules) {
    if (
      !capsule ||
      typeof capsule.placeId !== 'string' ||
      !capsule.placeId ||
      typeof capsule.label !== 'string' ||
      !capsule.label.trim() ||
      !Number.isSafeInteger(capsule.facetOrdinal) ||
      capsule.facetOrdinal < 0 ||
      !Number.isFinite(capsule.observedAt) ||
      !Number.isSafeInteger(capsule.observedOrder) ||
      capsule.observedOrder < 0 ||
      !Number.isFinite(capsule.acquiredAt) ||
      capsule.observedAt > capsule.acquiredAt ||
      !['observed', 'testimony', 'authored'].includes(capsule.provenance) ||
      (capsule.provenance !== 'authored' &&
        (typeof capsule.sourceEventId !== 'string' || !capsule.sourceEventId)) ||
      (capsule.personalSource !== undefined && !validPersonalSourceRef(capsule.personalSource))
    )
      throw new KnownPlacePreparationError();
    validateEvidenceSource(capsule.source);
    validateObservedLocation(capsule.location);
    const value = copyCapsule(capsule);
    bytes += textEncoder.encode(JSON.stringify(value)).length;
    if (bytes > PERSONAL_EVIDENCE_PREPARATION.bytes) throw new KnownPlacePreparationError();
    const matches = labels.get(value.label);
    if (matches) matches.push(value);
    else labels.set(value.label, [value]);
  }
  return { capsules: [...labels.values()].flat(), labels, bytes };
}
export function installKnownPlaceEvidence(
  world: WorldState,
  actorId: string,
  value: PreparedKnownPlaceEvidence,
): void {
  if (value.capsules.some((capsule) => capsule.source.observer.actorId !== actorId))
    throw new KnownPlacePreparationError();
  const actors = new Map(currentPreparation(world) ?? []);
  // Installing a derived read changes no evidence. Concurrent preparation of
  // the same source cut must not invalidate another complete read of that cut.
  actors.set(actorId, { value, revision: actors.get(actorId)?.revision ?? unpreparedRevision });
  prepared.set(world, actors);
}
function currentPreparation(world: WorldState) {
  return prepared.get(world) ?? (isDraft(world) ? prepared.get(original(world)!) : undefined);
}
/** A required native read never treats missing preparation as an unknown label. */
export function knownPlaceEvidence(
  world: WorldState,
  actorId: string,
  label: string,
): readonly KnownPlaceCapsule[] {
  const index = currentPreparation(world)?.get(actorId)?.value;
  if (!index) throw new KnownPlacePreparationError();
  return index.labels.get(label) ?? [];
}
export function knownPlaceEvidenceReady(world: WorldState, actorId: string): boolean {
  return !!currentPreparation(world)?.get(actorId)?.value;
}
/** Only a change to place evidence advances this native dependency. It survives
 * invalidation while preparation is absent, so an older cold read cannot install
 * after a newer acquisition or revocation. No personal content is duplicated. */
export function knownPlaceEvidenceRevision(world: WorldState, actorId: string): object {
  return currentPreparation(world)?.get(actorId)?.revision ?? unpreparedRevision;
}
/** Newly received observations update only their affected label/place entry. Hash-bound
 * personal aliases are attached by storage preparation; the synchronous native contribution
 * already supplies an exact immutable source for speech in this same native transition. */
export function knownPlaceCapsule(
  entry: Awareness,
  personalSource?: PersonalSourceRef,
): KnownPlaceCapsule | undefined {
  const exposure = entry.exposure;
  if (exposure?.kind !== 'place' || !entry.observation) return;
  return placeCapsule(entry.observation, exposure, entry.eventId, personalSource);
}
function placeCapsule(
  observation: ObservationContribution,
  exposure: Extract<EncounterExposure, { kind: 'place' }>,
  sourceEventId: string,
  personalSource?: PersonalSourceRef,
): KnownPlaceCapsule | undefined {
  if (observation.origin.kind !== 'occurrence' || observation.origin.eventId !== sourceEventId)
    return;
  const location = observation.facets.find(
    (facet) =>
      facet.value.kind === 'location' &&
      facet.value.location.kind === 'point' &&
      JSON.stringify(facet.value.location.point) === JSON.stringify(exposure.point),
  );
  if (!location || location.value.kind !== 'location') return;
  return {
    placeId: exposure.id,
    label: exposure.label,
    location: copyLocation(location.value.location),
    source: {
      family: 'native-exposure',
      observer: { ...observation.observer },
      id: observation.id,
      revision: observation.revision,
    },
    facetOrdinal: location.ordinal,
    sourceEventId,
    ...(personalSource ? { personalSource } : {}),
    observedAt: location.asOf,
    observedOrder: observation.origin.order,
    acquiredAt: location.acquiredAt,
    provenance: exposure.reportedBy ? 'testimony' : 'observed',
  };
}
/** Consolidation retains the original observation, so a learned place survives the
 * retirement of its prose account without becoming a new sensory observation. */
export function retainedPlaceObservations(
  observations: readonly ObservationContribution[],
  personalSource?: PersonalSourceRef,
): RetainedPlaceObservation[] {
  const places = new Map<string, RetainedPlaceObservation>();
  for (const observation of observations) {
    if (observation.origin.kind !== 'occurrence') continue;
    for (const facet of observation.facets) {
      if (facet.value.kind !== 'encounter-exposure' || facet.value.exposure.kind !== 'place')
        continue;
      const exposure = facet.value.exposure;
      const capsule = placeCapsule(
        observation,
        exposure,
        observation.origin.eventId,
        personalSource,
      );
      if (!capsule) throw new KnownPlacePreparationError();
      const key = JSON.stringify([capsule.source, capsule.facetOrdinal]);
      places.set(key, { capsule, exposure });
    }
  }
  return [...places.values()];
}

/** A sparse retained receipt keeps the same original place fact, not a new visit.
 * No live place definition or forgotten account is consulted to reconstruct it. */
export function temporalKnownPlaceCapsules(
  actorId: string,
  support: TemporalSupportCapsule,
): KnownPlaceCapsule[] {
  const receipt = support.receipt;
  if (receipt.actorId !== actorId || receipt.facets.length !== support.values.length)
    throw new KnownPlacePreparationError();
  if (receipt.origin?.kind !== 'occurrence') return [];
  const places: KnownPlaceCapsule[] = [];
  support.values.forEach((value, index) => {
    if (value.kind !== 'encounter-exposure' || value.exposure.kind !== 'place') return;
    const exposure = value.exposure;
    const exposureSource = receipt.facets[index]?.original?.source;
    const locationIndex = support.values.findIndex(
      (candidate, ordinal) =>
        candidate.kind === 'location' &&
        candidate.location.kind === 'point' &&
        JSON.stringify(candidate.location.point) === JSON.stringify(exposure.point) &&
        JSON.stringify(receipt.facets[ordinal]?.original?.source) ===
          JSON.stringify(exposureSource),
    );
    const location = support.values[locationIndex];
    const fact = receipt.facets[locationIndex];
    if (
      !location ||
      location.kind !== 'location' ||
      !fact?.original ||
      fact.original.source.observer.actorId !== actorId ||
      fact.original.source.observer.physicalLife !== receipt.physicalLife
    )
      throw new KnownPlacePreparationError();
    places.push({
      placeId: exposure.id,
      label: exposure.label,
      location: copyLocation(location.location),
      source: { ...fact.original.source, observer: { ...fact.original.source.observer } },
      facetOrdinal: fact.original.ordinal,
      sourceEventId: receipt.origin!.kind === 'occurrence' ? receipt.origin!.eventId : undefined,
      observedAt: fact.asOf,
      observedOrder: receipt.origin!.kind === 'occurrence' ? receipt.origin!.order : receipt.order,
      acquiredAt: fact.acquiredAt,
      provenance: exposure.reportedBy ? 'testimony' : 'observed',
    });
  });
  return places;
}
export function acquireKnownPlaceEvidence(world: WorldState, entry: Awareness): void {
  const exposure = entry.exposure;
  if (exposure?.kind !== 'place' || !entry.observation) return;
  const capsule = knownPlaceCapsule(entry);
  if (!capsule) throw new KnownPlacePreparationError();
  acquireKnownPlaceCapsules(world, entry.actorId, [capsule]);
}

/** Canonical accounts and sparse support share the same place projection. This
 * checks only the changed received record, never an actor's retained history. */
export function experienceKnownPlaceCapsules(entry: ExperienceEntry): KnownPlaceCapsule[] {
  if (entry.source === 'awareness') {
    const capsule = knownPlaceCapsule(entry.value);
    return capsule ? [capsule] : [];
  }
  const value = entry.value,
    evidence = entry.source === 'memory' ? entry.value.evidence : undefined,
    manifest = 'manifest' in value ? value.manifest : undefined;
  return retainedPlaceObservations([
    ...(manifest?.observations ?? []),
    ...('observation' in value && value.observation ? [value.observation] : []),
    ...('observations' in value ? (value.observations ?? []) : []),
    ...(evidence?.observation ? [evidence.observation] : []),
    ...(evidence?.observations ?? []),
  ]).map((place) => place.capsule);
}

/** A new source can update a complete index directly. Missing preparation remains
 * missing: acquiring one place cannot establish that all other places are unknown. */
export function acquireKnownPlaceCapsules(
  world: WorldState,
  actorId: string,
  incoming: readonly KnownPlaceCapsule[],
): void {
  if (!incoming.length) return;
  const current = currentPreparation(world)?.get(actorId)?.value;
  if (!current) {
    invalidateKnownPlaceEvidence(world, actorId);
    return;
  }
  const labels = new Map(current.labels);
  let capsules = current.capsules,
    bytes = current.bytes,
    changed = false;
  for (const capsule of incoming) {
    if (capsule.source.observer.actorId !== actorId) throw new KnownPlacePreparationError();
    const prior = capsules.find((value) => value.placeId === capsule.placeId);
    if (
      prior &&
      (prior.observedAt > capsule.observedAt ||
        (prior.observedAt === capsule.observedAt && prior.observedOrder > capsule.observedOrder))
    )
      continue;
    const encoded = JSON.stringify(capsule),
      old = prior ? JSON.stringify(prior) : undefined;
    if (encoded === old) continue;
    if (prior) {
      const retained = (labels.get(prior.label) ?? []).filter(
        (value) => value.placeId !== capsule.placeId,
      );
      if (retained.length) labels.set(prior.label, retained);
      else labels.delete(prior.label);
    }
    labels.set(capsule.label, [...(labels.get(capsule.label) ?? []), capsule]);
    capsules = [...capsules.filter((value) => value.placeId !== capsule.placeId), capsule];
    bytes += textEncoder.encode(encoded).length - (old ? textEncoder.encode(old).length : 0);
    changed = true;
  }
  if (!changed) return;
  if (
    capsules.length > PERSONAL_EVIDENCE_PREPARATION.rows ||
    bytes > PERSONAL_EVIDENCE_PREPARATION.bytes
  ) {
    // Retention already committed to its source owner. Hold only dependent native use;
    // neither truncating the index nor rejecting the source would preserve that meaning.
    invalidateKnownPlaceEvidence(world, actorId);
    return;
  }
  const actors = new Map(currentPreparation(world) ?? []);
  actors.set(actorId, { value: { capsules, labels, bytes }, revision: {} });
  prepared.set(world, actors);
}
export function invalidateKnownPlaceEvidence(world: WorldState, actorId: string): void {
  const actors = new Map(currentPreparation(world) ?? []);
  actors.set(actorId, { revision: {} });
  prepared.set(world, actors);
}
/** Process-local indexes are transferable only through the real publication boundary.
 * Serializing a partial resident history does not manufacture completeness. */
export function captureKnownPlaceEvidence(world: WorldState): (next: WorldState) => void {
  const value = currentPreparation(world);
  return (next) => {
    if (value) prepared.set(next, value);
  };
}
