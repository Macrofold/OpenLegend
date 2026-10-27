import {
  isImmutableData,
  jsonText,
  type LiveFacetSupport,
  type ObservationContribution,
  type PerceptionEvidenceOwner,
} from '@open-legend/domain';

type StoredLease = Omit<LiveFacetSupport, 'original'> & { original: string };
type StoredOwner = Omit<PerceptionEvidenceOwner, 'current'> & {
  current: Record<string, StoredLease>;
  originals: Record<string, ObservationContribution>;
};
const projections = new WeakMap<object, StoredOwner>();
const leaseProjections = new WeakMap<object, StoredLease>();
const currentProjections = new WeakMap<object, Pick<StoredOwner, 'current' | 'originals'>>();
const originalKey = (original: ObservationContribution) =>
  JSON.stringify([
    original.observer.actorId,
    original.observer.physicalLife,
    original.id,
    original.revision,
  ]);

/** Storage normalization only. Native facets still share their exact immutable
 * received observation; neither a confirmation nor another facet copies its body.
 * docs/save-and-load.md#current-format-validation */
export function encodePerceptionOwner(value: unknown): StoredOwner {
  const owner = value as PerceptionEvidenceOwner;
  const cached = projections.get(owner);
  if (cached) return cached;
  let collection = currentProjections.get(owner.current);
  if (!collection) {
    const originals: StoredOwner['originals'] = {};
    const current = Object.fromEntries(
      Object.entries(owner.current).map(([key, lease]) => {
        const original = lease.original,
          reference = originalKey(original);
        const prior = originals[reference];
        if (prior && prior !== original && jsonText(prior) !== jsonText(original))
          throw new Error('A current observation identity has conflicting original facts.');
        originals[reference] = original;
        let stored = leaseProjections.get(lease);
        if (!stored) {
          stored = { ...lease, original: reference };
          if (isImmutableData(lease)) {
            Object.freeze(stored);
            leaseProjections.set(lease, stored);
          }
        }
        return [key, stored];
      }),
    );
    collection = { current, originals };
    if (isImmutableData(owner.current)) {
      Object.freeze(current);
      Object.freeze(originals);
      currentProjections.set(owner.current, collection);
    }
  }
  const projected = { ...owner, ...collection };
  if (isImmutableData(owner)) {
    Object.freeze(projected);
    projections.set(owner, projected);
  }
  return projected;
}

/** Resolve only this owner's exact original rows. Missing/extra/cross-owner bodies
 * are corrupt current-format data, never permission to reconstruct an observation. */
export function decodePerceptionOwner(value: unknown): PerceptionEvidenceOwner {
  const { originals, current, ...owner } = value as StoredOwner;
  const used = new Set<string>();
  const restored = Object.fromEntries(
    Object.entries(current).map(([key, lease]) => {
      const reference = lease.original;
      const original =
        typeof reference === 'string' && Object.hasOwn(originals, reference)
          ? originals[reference]
          : undefined;
      if (
        !original ||
        originalKey(original) !== reference ||
        original.observer.actorId !== lease.observer.actorId ||
        original.observer.physicalLife !== lease.observer.physicalLife
      )
        throw new Error('A current observation has no exact owned original.');
      used.add(reference);
      return [key, { ...lease, original }];
    }),
  );
  if (used.size !== Object.keys(originals).length)
    throw new Error('An unreferenced current observation original was stored.');
  return { ...owner, current: restored };
}
