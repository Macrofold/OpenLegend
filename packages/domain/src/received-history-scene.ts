import { BoundsIndex, type Bounds3 } from '@open-legend/spatial';
import { receivedBoundarySeparation } from './received-geometry.js';
import {
  receivedBodyBounds,
  receivedBoundsIntersect,
  receivedSeparation,
  type ReceivedBodyGeometry,
} from './received-scene.js';
import { canonicalJson } from './events.js';
import type { ObservationFactKey } from './perception-evidence.js';
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
export interface HistoricalGeometrySupport {
  original: ObservationFactKey;
  value: TemporalValue;
  confirmedThrough: number;
}
interface EndpointChange {
  from: number;
  through: number;
  decreaseLower: number;
  support: HistoricalSpatialFact[];
}
export interface HistoricalSpatialFact {
  entry: number;
  facet: number;
}
interface Fact extends HistoricalSpatialFact {
  subject: string;
  reference: TemporalFacetReference;
  value: TemporalValue;
}
type BodyFact = Fact & { value: Extract<TemporalValue, { kind: 'body' }> };
type BoundaryFact = Fact & { value: Extract<TemporalValue, { kind: 'physical-boundary' }> };

const through = (fact: Fact) => fact.reference.confirmedThrough ?? fact.reference.measuredThrough;
const supports = (fact: Fact, at: number) =>
  fact.reference.measuredFrom <= at && at <= through(fact);
const originalKey = (fact: Fact) =>
  JSON.stringify(fact.reference.original ?? [fact.entry, fact.reference.ordinal]);
const proof = (fact: Fact): HistoricalSpatialFact => ({ entry: fact.entry, facet: fact.facet });

function geometry(fact: BodyFact, at: number, facts: Fact[]): ReceivedBodyGeometry {
  const location = facts.find(
    (candidate) =>
      candidate.entry === fact.entry &&
      candidate.value.kind === 'location' &&
      candidate.value.location.kind === 'point' &&
      candidate.value.location.point.x === fact.value.body.position.x &&
      candidate.value.location.point.y === fact.value.body.position.y &&
      candidate.value.location.point.z === fact.value.body.position.z &&
      supports(candidate, at),
  );
  return {
    body: fact.value.body,
    sample: { valueMeasuredFrom: fact.reference.measuredFrom, valueMeasuredThrough: at },
    ...(location?.value.kind === 'location'
      ? {
          location: {
            value: location.value,
            valueMeasuredFrom: location.reference.measuredFrom,
            valueMeasuredThrough: through(location),
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
  held: readonly HistoricalGeometrySupport[] = [],
) {
  const certificates = new Map(
    held.map((certificate) => [
      canonicalJson(certificate.original),
      { ...certificate, serialized: canonicalJson(certificate.value) },
    ]),
  );
  const facts: Fact[] = [];
  for (const [entry, selected] of selection.entries.entries())
    for (const [facet, value] of selected.values.entries()) {
      const original = selected.receipt.facets[facet]!;
      const certificate = original.original && certificates.get(canonicalJson(original.original));
      const reference =
        certificate &&
        (value.kind === 'surface-patch' || value.kind === 'physical-boundary') &&
        certificate.serialized === canonicalJson(value)
          ? {
              ...original,
              confirmedThrough: Math.max(
                original.confirmedThrough ?? original.measuredThrough,
                certificate.confirmedThrough,
              ),
            }
          : original;
      facts.push({
        entry,
        facet,
        subject: selected.receipt.subject,
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
        fact.reference.measuredFrom <= request.through,
    )
    .sort(
      (a, b) =>
        through(b) - through(a) ||
        selection.entries[b.entry]!.receipt.order - selection.entries[a.entry]!.receipt.order ||
        selection.entries[b.entry]!.receipt.ordinal - selection.entries[a.entry]!.receipt.ordinal,
    );
  const others = request.other
    ? bodies
        .filter((fact) => fact.subject === request.other)
        .sort(
          (a, b) =>
            b.reference.measuredFrom - a.reference.measuredFrom ||
            b.reference.acquiredAt - a.reference.acquiredAt,
        )
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
      for (const other of others) {
        if (!remaining) {
          incomplete = true;
          break;
        }
        remaining--;
        if (!supports(other, at)) continue;
        sample.other = receivedSeparation(anchorGeometry, geometry(other, at, facts));
        if (sample.other.status === 'complete') sample.support.push(proof(other));
        break;
      }
    }
    const bounds = receivedBodyBounds(
      anchor.value.body,
      anchorGeometry.location?.value.location.kind === 'point'
        ? anchorGeometry.location.value.location.errorRadius
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
        from: boundary.reference.measuredFrom,
        through: through(boundary),
      });
      if (measurement.status === 'complete')
        sample.boundaries.push({ support: proof(boundary), measurement });
    }
    samples.push(sample);
  }
  samples.sort(
    (a, b) =>
      a.at - b.at ||
      selection.entries[a.support[0]!.entry]!.receipt.order -
        selection.entries[b.support[0]!.entry]!.receipt.order ||
      selection.entries[a.support[0]!.entry]!.receipt.ordinal -
        selection.entries[b.support[0]!.entry]!.receipt.ordinal,
  );
  let previousOther: { at: number; lower: number; support: HistoricalSpatialFact[] } | undefined;
  const previousEdges = new Map<
    string,
    { at: number; lower: number; support: HistoricalSpatialFact[] }
  >();
  for (const sample of samples) {
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
      const reference = selection.entries[edge.support.entry]!.receipt.facets[edge.support.facet]!;
      const key = JSON.stringify(reference.original ?? [edge.support.entry, reference.ordinal]),
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
