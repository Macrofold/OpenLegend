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
  ordinal: number;
  availableAt?: number;
  unavailableAt?: number;
  subject: string;
  reference: TemporalFacetReference;
  value: TemporalValue;
}
type BodyFact = Fact & { value: Extract<TemporalValue, { kind: 'body' }> };
type BoundaryFact = Fact & { value: Extract<TemporalValue, { kind: 'physical-boundary' }> };

const from = (fact: Fact) =>
  Math.max(
    fact.reference.measuredFrom,
    fact.reference.support?.confirmedFrom ?? fact.reference.measuredFrom,
    fact.value.kind === 'body'
      ? (fact.reference.detailSupport?.proof.confirmedFrom ?? -Infinity)
      : -Infinity,
    fact.availableAt ?? -Infinity,
  );
const through = (fact: Fact) =>
  Math.min(
    fact.reference.support?.confirmedThrough ??
      fact.reference.confirmedThrough ??
      fact.reference.measuredThrough,
    fact.value.kind === 'body'
      ? (fact.reference.detailSupport?.proof.confirmedThrough ?? Infinity)
      : Infinity,
  );
const supports = (fact: Fact, at: number) =>
  from(fact) <= at && at <= through(fact) && at < (fact.unavailableAt ?? Infinity);
const originalKey = (fact: Fact) =>
  JSON.stringify(fact.reference.original ?? [fact.source, fact.reference.ordinal]);
const proof = (fact: Fact): HistoricalSpatialFact => fact.source;

function geometry(fact: BodyFact, at: number, facts: Fact[]): ReceivedBodyGeometry {
  const location = facts.find(
    (candidate) =>
      (('entry' in candidate.source &&
        'entry' in fact.source &&
        candidate.source.entry === fact.source.entry) ||
        ('baseline' in candidate.source &&
          'baseline' in fact.source &&
          candidate.source.baseline === fact.source.baseline)) &&
      candidate.value.kind === 'location' &&
      candidate.value.location.kind === 'point' &&
      candidate.value.location.point.x === fact.value.body.position.x &&
      candidate.value.location.point.y === fact.value.body.position.y &&
      candidate.value.location.point.z === fact.value.body.position.z &&
      supports(candidate, at),
  );
  return {
    body: fact.value.body,
    sample: {
      valueMeasuredFrom: fact.reference.measuredFrom,
      valueMeasuredThrough: fact.reference.measuredThrough,
      valueSupportedFrom: from(fact),
      valueSupportedThrough: at,
    },
    ...(location?.value.kind === 'location'
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
        ordinal: selected.receipt.ordinal,
        unavailableAt: selected.receipt.availability?.find((group) =>
          group.fields.includes(reference.ordinal),
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
        ordinal: selected.checkpoint.ordinal,
        availableAt: selected.availableAt,
        unavailableAt: selected.checkpoint.availability?.find((group) =>
          group.fields.includes(reference.ordinal),
        )?.at,
        subject: selected.checkpoint.subject,
        reference,
        value,
      });
    }
  const bodies = facts.filter((fact): fact is BodyFact => fact.value.kind === 'body');
  const anchors = bodies
    .filter(
      (fact) =>
        fact.subject === request.anchor &&
        through(fact) >= request.from &&
        from(fact) <= request.through &&
        from(fact) <= through(fact),
    )
    .sort((a, b) => through(b) - through(a) || b.order - a.order || b.ordinal - a.ordinal);
  const others = request.other
    ? bodies
        .filter((fact) => fact.subject === request.other)
        .sort((a, b) => from(b) - from(a) || b.reference.acquiredAt - a.reference.acquiredAt)
    : [];
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
      at,
      anchor.value.body.position,
      anchor.value.body.radius,
      anchor.value.body.height,
    ]);
    if (seen.has(sampleKey)) continue;
    seen.add(sampleKey);
    const sample: (typeof samples)[number] = {
      at,
      support: [proof(anchor)],
      boundaries: [],
      boundaryCoverage: 'selected-retained',
    };
    const anchorGeometry = geometry(anchor, at, facts);
    if (request.other) {
      sample.other = { status: 'unavailable' };
      let compatible: BodyFact | undefined;
      let conflict = false;
      for (const other of others) {
        if (!remaining) {
          incomplete = true;
          conflict = true;
          break;
        }
        remaining--;
        if (!supports(other, at)) continue;
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
        sample.other = receivedSeparation(anchorGeometry, geometry(compatible, at, facts));
        if (sample.other.status === 'complete') sample.support.push(proof(compatible));
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
      if (!supports(boundary, at)) continue;
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
    return a.at - b.at || first.order - second.order || first.ordinal - second.ordinal;
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
      const key = JSON.stringify(reference.original ?? [edge.support, reference.ordinal]),
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
        support: [direct[0]!, edge.support],
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
