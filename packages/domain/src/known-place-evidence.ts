import { original, isDraft } from 'immer';
import { cloneValue } from './draft.js';
import type { Awareness } from './experience.js';
import type { EvidenceSource, ObservedLocation } from './perception-evidence.js';
import type { WorldState } from './types.js';

/** A minimal projection of one retained place observation, never live place geometry. */
export interface KnownPlaceCapsule {
  placeId: string;
  label: string;
  location: ObservedLocation;
  source: EvidenceSource;
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
    const value = cloneValue(capsule);
    bytes += new TextEncoder().encode(JSON.stringify(value)).length;
    labels.set(value.label, [...(labels.get(value.label) ?? []), value]);
  }
  return { capsules: [...labels.values()].flat(), labels, bytes };
}
export function installKnownPlaceEvidence(
  world: WorldState,
  actorId: string,
  value: PreparedKnownPlaceEvidence,
): void {
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
export function acquireKnownPlaceEvidence(world: WorldState, entry: Awareness): void {
  const exposure = entry.exposure;
  const current = currentPreparation(world)?.get(entry.actorId);
  if (exposure?.kind !== 'place' || !current || !entry.observation) return;
  const observation = entry.observation;
  const capsule: KnownPlaceCapsule = {
    placeId: exposure.id,
    label: exposure.label,
    location: { kind: 'point', point: { ...exposure.point }, errorRadius: 0 },
    source: {
      family: 'native-exposure',
      observer: { ...observation.observer },
      id: observation.id,
      revision: observation.revision,
    },
    observedAt: entry.at,
    acquiredAt: observation.acquiredAt,
    provenance: exposure.reportedBy ? 'testimony' : 'observed',
  };
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
  const encoder = new TextEncoder();
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
