import { BoundsIndex, type Bounds3 } from '@open-legend/spatial';
import { receivedBoundarySeparation } from './received-geometry.js';
import {
  receivedBodyBounds,
  receivedBoundsIntersect,
  receivedSeparation,
  type ReceivedBodyGeometry,
} from './received-scene.js';
import type {
  TemporalFacetReference,
  TemporalHistorySelection,
  TemporalValue,
} from './temporal-evidence.js';

export interface HistoricalSpatialRequest {
  anchor: string;
  other?: string;
  from: number;
  through: number;
  radius: number;
}
interface EndpointChange {
  from: number;
  through: number;
  decreaseLower: number;
  support: HistoricalSpatialFact[];
}
export type HistoricalSpatialFact =
  | { entry: number; facet: number }
  | { baseline: number; facet: number };
interface Fact {
  source: HistoricalSpatialFact;
  order: number;
  batchOrder: number;
  entryIndex: number;
  acquisition: number;
  epoch: string;
  physicalLife: number;
  availableAt?: number;
  unavailableAt?: number;
  subject: string;
  reference: TemporalFacetReference;
  value: TemporalValue;
}
type LocationFact = Fact & { value: Extract<TemporalValue, { kind: 'location' }> };
type BodyFact = Fact & {
  value: Extract<TemporalValue, { kind: 'body' }>;
  detail?: BodyFact;
  position?: LocationFact;
};
type BoundaryFact = Fact & { value: Extract<TemporalValue, { kind: 'physical-boundary' }> };

const detailFrom = (fact: BodyFact) =>
  Math.max(
    fact.reference.detailSupport?.from ?? fact.reference.measuredFrom,
    fact.reference.detailSupport?.proof.confirmedFrom ??
      fact.reference.support?.confirmedFrom ??
      fact.reference.measuredFrom,
    fact.availableAt ?? -Infinity,
  );
const detailThrough = (fact: BodyFact) =>
  fact.reference.detailSupport?.proof.confirmedThrough ??
  fact.reference.support?.confirmedThrough ??
  fact.reference.confirmedThrough ??
  fact.reference.measuredThrough;
const from = (fact: Fact) =>
  Math.max(
    fact.reference.measuredFrom,
    fact.reference.support?.confirmedFrom ?? fact.reference.measuredFrom,
    fact.value.kind === 'body'
      ? detailFrom((fact as BodyFact).detail ?? (fact as BodyFact))
      : -Infinity,
    fact.availableAt ?? -Infinity,
  );
const through = (fact: Fact) =>
  Math.min(
    fact.reference.support?.confirmedThrough ??
      fact.reference.confirmedThrough ??
      fact.reference.measuredThrough,
    fact.value.kind === 'body'
      ? detailThrough((fact as BodyFact).detail ?? (fact as BodyFact))
      : Infinity,
  );
const supports = (fact: Fact, at: number) =>
  from(fact) <= at && at <= through(fact) && at < (fact.unavailableAt ?? Infinity);
const originalKey = (fact: Fact) =>
  JSON.stringify(fact.reference.original ?? [fact.source, fact.reference.memberIndex]);
const proof = (fact: Fact): HistoricalSpatialFact => fact.source;
const trackKey = (fact: Fact) => JSON.stringify([fact.physicalLife, fact.epoch, fact.subject]);
const acquisitionKey = (fact: Fact) =>
  JSON.stringify([fact.physicalLife, fact.epoch, fact.acquisition]);
function bodyProofs(fact: BodyFact): HistoricalSpatialFact[] {
  return fact.detail && JSON.stringify(fact.detail.source) !== JSON.stringify(fact.source)
    ? [fact.source, fact.detail.source]
    : [fact.source];
}
/** Join only selected personal evidence. Position changes never replace or freshen appearance. */
function receivedBodySamples(facts: readonly Fact[], request: HistoricalSpatialRequest) {
  const details = new Map<string, BodyFact[]>(),
    samples: BodyFact[] = [];
  for (const fact of facts)
    if (fact.value.kind === 'body') {
      const body = fact as BodyFact;
      if ((body.reference.detailSupport?.role ?? body.reference.role) !== 'direct') continue;
      const key = trackKey(body),
        held = details.get(key) ?? [];
      if (detailFrom(body) <= detailThrough(body)) held.push(body);
      details.set(key, held);
      samples.push(body); // Its raw acquisition pose remains a separately dated actual observation.
    }
  for (const held of details.values())
    held.sort((a, b) => detailThrough(a) - detailThrough(b) || detailFrom(a) - detailFrom(b));
  for (const fact of facts) {
    if (
      fact.value.kind !== 'location' ||
      fact.value.location.kind !== 'point' ||
      fact.reference.role !== 'direct' ||
      (fact.subject !== request.anchor && fact.subject !== request.other)
    )
      continue;
    const at = Math.min(through(fact), request.through);
    if (!supports(fact, at)) continue;
    const held = details.get(trackKey(fact)) ?? [];
    let low = 0,
      high = held.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (detailThrough(held[middle]!) < at) low = middle + 1;
      else high = middle;
    }
    const candidates: BodyFact[] = [];
    for (let index = low; index < held.length; index++) {
      const detail = held[index]!;
      if (detailFrom(detail) > at) break;
      if (at < (detail.unavailableAt ?? Infinity)) candidates.push(detail);
    }
    if (!candidates.length) continue;
    const paired = candidates.filter((detail) => acquisitionKey(detail) === acquisitionKey(fact)),
      choices = paired.length ? paired : candidates,
      detail = choices[0]!;
    // A conflicting same-time shape cannot become a precise body by sorting it.
    if (
      choices.some(
        (candidate) =>
          candidate.value.body.radius !== detail.value.body.radius ||
          candidate.value.body.height !== detail.value.body.height,
      )
    )
      continue;
    samples.push({
      ...fact,
      value: { kind: 'body', body: { ...detail.value.body, position: fact.value.location.point } },
      detail,
      position: fact as LocationFact,
    });
  }
  return samples;
}
function geometry(fact: BodyFact, at: number): ReceivedBodyGeometry {
  const detail = fact.detail ?? fact,
    location = fact.position;
  return {
    body: fact.value.body,
    sample: {
      valueMeasuredFrom: detail.reference.detailSupport?.from ?? detail.reference.measuredFrom,
      valueMeasuredThrough:
        detail.reference.detailSupport?.through ?? detail.reference.measuredThrough,
      valueSupportedFrom: detailFrom(detail),
      valueSupportedThrough: Math.min(detailThrough(detail), at),
    },
    ...(location
      ? {
          location: {
            location: location.value.location,
            valueMeasuredFrom: location.reference.measuredFrom,
            valueMeasuredThrough: location.reference.measuredThrough,
            valueSupportedFrom: from(location),
            valueSupportedThrough: Math.min(through(location), at),
          },
        }
      : {}),
  };
}
function boundaryBounds(fact: BoundaryFact): Bounds3 {
  const { a, b, errorRadius: error } = fact.value.boundary;
  return {
    min: {
      x: Math.min(a.x, b.x) - error,
      y: Math.min(a.y, b.y) - error,
      z: Math.min(a.z, b.z) - error,
    },
    max: {
      x: Math.max(a.x, b.x) + error,
      y: Math.max(a.y, b.y) + error,
      z: Math.max(a.z, b.z) + error,
    },
  };
}

/** A disposable index over an already actor-scoped, byte/receipt-bounded selection.
 * No current world, map or entity lookup can fill missing historical measurements.
 * Every sampled anchor and candidate visit consumes the caller's existing allowance.
 * The result concerns retained evidence only; an empty result never proves safety.
 */
export function historicalSpatialMeasurements(
  selection: TemporalHistorySelection,
  request: HistoricalSpatialRequest,
  allowance: number,
) {
  const facts: Fact[] = [];
  for (const [entry, selected] of selection.entries.entries())
    for (const [facet, value] of selected.values.entries()) {
      const reference = selected.receipt.facets[facet]!;
      facts.push({
        source: { entry, facet },
        order: selected.receipt.order,
        batchOrder: selected.receipt.batchOrder,
        entryIndex: selected.receipt.entryIndex,
        acquisition: selected.receipt.acquisition,
        epoch: selected.receipt.epoch,
        physicalLife: selected.receipt.physicalLife,
        availableAt: selected.receipt.at,
        unavailableAt: selected.receipt.availability?.find((group) =>
          group.fields.includes(reference.memberIndex),
        )?.at,
        subject: selected.receipt.subject,
        reference,
        value,
      });
    }
  for (const [baseline, selected] of (selection.baselines ?? []).entries())
    for (const [facet, value] of selected.values.entries()) {
      const reference = selected.checkpoint.facets[facet]!;
      facts.push({
        source: { baseline, facet },
        order: selected.checkpoint.order,
        batchOrder: selected.checkpoint.batchOrder,
        entryIndex: selected.checkpoint.entryIndex,
        acquisition: selected.checkpoint.acquisition,
        epoch: selected.checkpoint.epoch,
        physicalLife: selected.checkpoint.physicalLife,
        availableAt: selected.availableAt,
        unavailableAt: selected.checkpoint.availability?.find((group) =>
          group.fields.includes(reference.memberIndex),
        )?.at,
        subject: selected.checkpoint.subject,
        reference,
        value,
      });
    }
  const bodies = receivedBodySamples(facts, request);
  const anchors = bodies
    .filter(
      (fact) =>
        fact.subject === request.anchor &&
        through(fact) >= request.from &&
        from(fact) <= request.through &&
        from(fact) <= through(fact),
    )
    .sort(
      (a, b) =>
        through(b) - through(a) ||
        b.order - a.order ||
        b.batchOrder - a.batchOrder ||
        b.entryIndex - a.entryIndex,
    );
  const others = request.other
    ? bodies
        .filter((fact) => fact.subject === request.other)
        .sort((a, b) => from(b) - from(a) || b.reference.acquiredAt - a.reference.acquiredAt)
    : [];
  const othersByPhase = new Map<string, BodyFact[]>();
  for (const other of others) {
    const key = acquisitionKey(other),
      group = othersByPhase.get(key) ?? [];
    group.push(other);
    othersByPhase.set(key, group);
  }
  const boundaries = facts.filter(
    (fact): fact is BoundaryFact => fact.value.kind === 'physical-boundary',
  );
  const index = new BoundsIndex(
    boundaries.map((value) => ({ value, bounds: boundaryBounds(value) })),
  );
  let remaining = Math.max(0, Math.floor(allowance));
  const samples: Array<{
    at: number;
    support: HistoricalSpatialFact[];
    other?: ReturnType<typeof receivedSeparation> & { endpointChange?: EndpointChange };
    boundaries: Array<{
      support: HistoricalSpatialFact;
      measurement: ReturnType<typeof receivedBoundarySeparation> & {
        endpointChange?: EndpointChange;
      };
    }>;
    boundaryCoverage: 'selected-retained' | 'partial';
  }> = [];
  const seen = new Set<string>();
  let incomplete = selection.incomplete;
  for (const [position, anchor] of anchors.entries()) {
    if (!remaining) {
      incomplete = true;
      break;
    }
    remaining--;
    const at = Math.min(through(anchor), request.through);
    if (!supports(anchor, at)) continue;
    const sampleKey = JSON.stringify([
      anchor.physicalLife,
      anchor.epoch,
      anchor.acquisition,
      at,
      anchor.value.body.position,
      anchor.value.body.radius,
      anchor.value.body.height,
    ]);
    if (seen.has(sampleKey)) continue;
    seen.add(sampleKey);
    const sample: (typeof samples)[number] = {
      at,
      support: bodyProofs(anchor),
      boundaries: [],
      boundaryCoverage: 'selected-retained',
    };
    const anchorGeometry = geometry(anchor, at);
    if (request.other) {
      sample.other = { status: 'unavailable' };
      let compatible: BodyFact | undefined;
      let conflict = false;
      const samePhase = othersByPhase.get(acquisitionKey(anchor)) ?? [],
        counterparts = samePhase.some((candidate) => supports(candidate, at)) ? samePhase : others;
      for (const other of counterparts) {
        if (!remaining) {
          incomplete = true;
          conflict = true;
          break;
        }
        remaining--;
        if (!supports(other, at)) continue;
        // A shared actual receiver phase can pair independent subjects. Otherwise
        // different same-time endpoints stay ambiguous rather than sorted into a story.
        // Two different positions at one timestamp have no ordering relationship
        // to this anchor measurement. Never pick whichever happened to sort first.
        if (
          compatible &&
          JSON.stringify([
            compatible.value.body.position,
            compatible.value.body.radius,
            compatible.value.body.height,
          ]) !==
            JSON.stringify([
              other.value.body.position,
              other.value.body.radius,
              other.value.body.height,
            ])
        )
          conflict = true;
        compatible ??= other;
      }
      if (compatible && !conflict) {
        sample.other = receivedSeparation(anchorGeometry, geometry(compatible, at));
        if (sample.other.status === 'complete') sample.support.push(...bodyProofs(compatible));
      }
    }

    const bounds = receivedBodyBounds(
      anchor.value.body,
      anchorGeometry.location?.location.kind === 'point'
        ? anchorGeometry.location.location.errorRadius
        : 0,
    );
    for (const point of [bounds.min, bounds.max])
      for (const axis of ['x', 'y', 'z'] as const)
        point[axis] += point === bounds.min ? -request.radius : request.radius;
    // Share remaining spatial work across the still-retained anchor samples.
    const visits = Math.floor(remaining / Math.max(1, anchors.length - position));
    const found = index.query((candidate) => receivedBoundsIntersect(bounds, candidate), visits);
    remaining -= found.visited;
    if (found.status === 'partial') {
      incomplete = true;
      sample.boundaryCoverage = 'partial';
    }
    const usedBoundaries = new Set<string>();
    for (const boundary of found.values) {
      if (
        boundary.epoch !== anchor.epoch ||
        boundary.physicalLife !== anchor.physicalLife ||
        !supports(boundary, at)
      )
        continue;
      const key = originalKey(boundary);
      if (usedBoundaries.has(key)) continue;
      usedBoundaries.add(key);
      const measurement = receivedBoundarySeparation(anchorGeometry, boundary.value.boundary, {
        from: from(boundary),
        through: through(boundary),
      });
      if (measurement.status === 'complete')
        sample.boundaries.push({ support: proof(boundary), measurement });
    }
    samples.push(sample);
  }
  const position = (source: HistoricalSpatialFact) =>
    'entry' in source
      ? selection.entries[source.entry]!.receipt
      : selection.baselines![source.baseline]!.checkpoint;
  samples.sort((a, b) => {
    const first = position(a.support[0]!),
      second = position(b.support[0]!);
    return (
      a.at - b.at ||
      first.order - second.order ||
      first.batchOrder - second.batchOrder ||
      first.entryIndex - second.entryIndex
    );
  });
  let previousOther: { at: number; lower: number; support: HistoricalSpatialFact[] } | undefined;
  const previousEdges = new Map<
    string,
    { at: number; lower: number; support: HistoricalSpatialFact[] }
  >();
  for (const sample of samples) {
    // A checkpoint is useful known state at its retained suffix, never another
    // measured endpoint from which a route or approach can be manufactured.
    if (!('entry' in sample.support[0]!)) continue;
    const direct = [...sample.support];
    if (
      sample.other?.status === 'complete' &&
      sample.other.lower !== undefined &&
      sample.other.upper !== undefined
    ) {
      if (previousOther && previousOther.at < sample.at)
        sample.other.endpointChange = {
          from: previousOther.at,
          through: sample.at,
          decreaseLower: previousOther.lower - sample.other.upper,
          support: previousOther.support,
        };
      previousOther = { at: sample.at, lower: sample.other.lower, support: direct };
    }
    for (const edge of sample.boundaries) {
      const reference =
        'entry' in edge.support
          ? selection.entries[edge.support.entry]!.receipt.facets[edge.support.facet]!
          : selection.baselines![edge.support.baseline]!.checkpoint.facets[edge.support.facet]!;
      const key = JSON.stringify(reference.original ?? [edge.support, reference.memberIndex]),
        previous = previousEdges.get(key),
        measurement = edge.measurement;
      if (measurement.lower === undefined || measurement.upper === undefined) continue;
      if (previous && previous.at < sample.at)
        measurement.endpointChange = {
          from: previous.at,
          through: sample.at,
          decreaseLower: previous.lower - measurement.upper,
          support: previous.support,
        };
      previousEdges.set(key, {
        at: sample.at,
        lower: measurement.lower,
        support: [...direct, edge.support],
      });
    }
  }
  return {
    status: samples.length ? ('partial' as const) : ('unavailable' as const),
    coverage: incomplete ? ('partial' as const) : ('selected-retained' as const),
    // All measurements retain explicit timestamps; no continuous path or all-clear
    // claim follows from endpoint changes or incomplete retained surroundings.
    samples,
    visited: Math.max(0, Math.floor(allowance)) - remaining,
    preparedFacts: facts.length,
  };
}
