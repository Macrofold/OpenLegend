import { original, isDraft } from 'immer';
import { validPersonalSourceRef } from './experience-source.js';
import { validateEvidenceSource, validateObservedLocation } from './perception-values.js';
import type { PersonalSourceRef } from './experience-source.js';
import type { Awareness } from './experience.js';
import type { EvidenceSource, ObservedLocation } from './perception-evidence.js';
import type { WorldState } from './types.js';

/** A minimal projection of one retained place observation, never live place geometry. */
export interface KnownPlaceCapsule {
  placeId: string;
  label: string;
  location: ObservedLocation;
  source: EvidenceSource;
  facetOrdinal: number;
  personalSource?: PersonalSourceRef;
  observedAt: number;
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
const prepared = new WeakMap<WorldState, Map<string, PreparedKnownPlaceEvidence>>();
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
      !Number.isFinite(capsule.acquiredAt) ||
      capsule.observedAt > capsule.acquiredAt ||
      !['observed', 'testimony', 'authored'].includes(capsule.provenance) ||
      (capsule.personalSource !== undefined && !validPersonalSourceRef(capsule.personalSource))
    )
      throw new KnownPlacePreparationError();
    validateEvidenceSource(capsule.source);
    validateObservedLocation(capsule.location);
    const value = copyCapsule(capsule);
    bytes += textEncoder.encode(JSON.stringify(value)).length;
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
  const actors = new Map(prepared.get(world) ?? []);
  actors.set(actorId, value);
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
  const index = currentPreparation(world)?.get(actorId);
  if (!index) throw new KnownPlacePreparationError();
  return index.labels.get(label) ?? [];
}
export function knownPlaceEvidenceReady(world: WorldState, actorId: string): boolean {
  return !!currentPreparation(world)?.has(actorId);
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
  const observation = entry.observation;
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
    ...(personalSource ? { personalSource } : {}),
    observedAt: location.asOf,
    acquiredAt: location.acquiredAt,
    provenance: exposure.reportedBy ? 'testimony' : 'observed',
  };
}
export function acquireKnownPlaceEvidence(world: WorldState, entry: Awareness): void {
  const exposure = entry.exposure;
  const current = currentPreparation(world)?.get(entry.actorId);
  if (exposure?.kind !== 'place' || !current || !entry.observation) return;
  const capsule = knownPlaceCapsule(entry);
  if (!capsule) throw new KnownPlacePreparationError();
  const labels = new Map(current.labels);
  const prior = current.capsules.find((value) => value.placeId === exposure.id);
  if (prior) {
    const retained = (labels.get(prior.label) ?? []).filter(
      (value) => value.placeId !== exposure.id,
    );
    if (retained.length) labels.set(prior.label, retained);
    else labels.delete(prior.label);
  }
  labels.set(capsule.label, [...(labels.get(capsule.label) ?? []), capsule]);
  const capsules = [...current.capsules.filter((value) => value.placeId !== exposure.id), capsule];
  const encoder = textEncoder;
  installKnownPlaceEvidence(world, entry.actorId, {
    capsules,
    labels,
    bytes:
      current.bytes -
      (prior ? encoder.encode(JSON.stringify(prior)).length : 0) +
      encoder.encode(JSON.stringify(capsule)).length,
  });
}
export function invalidateKnownPlaceEvidence(world: WorldState, actorId: string): void {
  const actors = new Map(currentPreparation(world) ?? []);
  actors.delete(actorId);
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
