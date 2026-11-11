import type {
  NativeGeometryQueries,
  NativeWorld,
  NativeWorldConsumer,
} from '@open-legend/native-simulation';
import { SPATIAL_LIMITS, type SpatialMap } from '@open-legend/spatial';
import { attachNativeConsumer, nativeJsonFixedWorkspace } from './native-consumer.js';
import {
  GeometryAllocationError,
  type GeometryCloneAllocation,
  type GeometryPreparationAllocation,
  type GeometryReservation,
} from './geometry-batches.js';

type Capacity = Pick<NativeWorld, 'reserveConsumerBytes'>;
type Shape = { containers: number; members: number; items: number; strings: number; units: number };
const shape = (): Shape => ({ containers: 0, members: 0, items: 0, strings: 0, units: 0 });
const object = (s: Shape, fields: number, count = 1) => {
  s.containers += count;
  s.members += fields * count;
};
const array = (s: Shape, items: number, count = 1) => {
  s.containers += count;
  s.items += items;
};
const text = (s: Shape, units: number, count = 1) => {
  s.strings += count;
  s.units += units;
};
const point = (s: Shape, count: number, idUnits = 0) => {
  object(s, idUnits ? 4 : 3, count);
  if (idUnits) text(s, count * idUnits, count);
};
// Closed physical records have no getters/toJSON/custom prototypes. Node22's
// ValueDeserializer::ReadJSObjectProperties uses field transitions (or ordinary
// property storage), and ReadDenseJSArray allocates its fixed elements once.
// Thirty-two words/container and eight/property or array item cover their
// carriers/backing/growth; copied string headers and UTF-16 are separate.
const bodyBytes = (s: Shape) =>
  s.containers * 256 + s.members * 64 + s.items * 64 + s.strings * 64 + s.units * 2;
const arrayScratch = (items: number) => 256 + items * 3 * 8;

/** Only plain physical JSON crosses these existing worker messages. Count the
 * actual selected graph without Object.keys arrays or a persistent size cache.
 * This is sizing, never another serializer or a physical-policy decision. */
function cloneShape(value: unknown, out: Shape): number {
  if (typeof value === 'string') {
    text(out, value.length);
    return 7 + 2 * value.length;
  }
  if (value === null || typeof value !== 'object') return typeof value === 'number' ? 9 : 1;
  let bytes = 24;
  if (Array.isArray(value)) {
    array(out, value.length);
    for (let i = 0; i < value.length; i++) bytes += cloneShape(value[i], out);
  } else {
    object(out, 0);
    for (const key in value)
      if (Object.hasOwn(value, key)) {
        out.members++;
        bytes += cloneShape(key, out) + cloneShape((value as Record<string, unknown>)[key], out);
      }
  }
  return bytes;
}

class CloneAllocation implements GeometryCloneAllocation {
  constructor(
    private body: GeometryReservation | undefined,
    private scratch: GeometryReservation | undefined,
  ) {}
  complete(): void {
    this.scratch?.release();
    this.scratch = undefined;
  }
  release(): void {
    this.complete();
    this.body?.release();
    this.body = undefined;
  }
}

/** Capacity only. The world still owns every query and eventual publication;
 * Rapier/Recast and the unchanged provider internals retain their separate
 * worker-memory bounds. These guards fund Native-derived copies and answers. */
export class NativeGeometryAllocation implements GeometryPreparationAllocation {
  private constructor(
    private capacity: Capacity | undefined,
    private metadata: GeometryReservation | undefined,
    private mapValue: SpatialMap | undefined,
    private readonly surfaceUnits: number,
    private readonly sourceUnits: number,
    private readonly solids: number,
    private readonly terrainSolids: number,
    private readonly featureCount: number,
  ) {}

  static capture(capacity: Capacity, map: SpatialMap): NativeGeometryAllocation {
    // Provider/port/statistics, two geometry slots, three bounded worker/event
    // carriers, their pending/timer closures, lanes and retirement containers.
    const metadata = capacity.reserveConsumerBytes(32 * 256);
    try {
      let surfaceUnits = 1,
        sourceUnits = 1,
        pieces = 0,
        terrainSolids = 0,
        supportFeatures = 0;
      for (const surface of map.spatial.surfaces) {
        surfaceUnits = Math.max(surfaceUnits, surface.id.length);
        if (!surface.terrain) supportFeatures++;
        else
          for (
            let z = Math.max(0, Math.floor(surface.minZ + 0.5));
            z <= Math.min(map.height - 1, Math.floor(surface.maxZ + 0.5));
            z++
          )
            for (
              let x = Math.max(0, Math.floor(surface.minX + 0.5));
              x <= Math.min(map.width - 1, Math.floor(surface.maxX + 0.5));
              x++
            ) {
              const tile = map.tiles[z]?.[x];
              if (tile !== undefined && map.terrain[tile]?.walkable) supportFeatures++;
            }
      }
      for (const blocker of map.spatial.blockers) {
        pieces += blocker.boxes?.length ?? 1;
        sourceUnits = Math.max(sourceUnits, blocker.id.length);
      }
      for (let z = 0; z < map.height; z++)
        for (let x = 0; x < map.width; x++) {
          const tile = map.tiles[z]?.[x];
          if (tile !== undefined && map.terrain[tile]?.solid) terrainSolids++;
        }
      // Cell-derived support identifiers use this exact existing spelling.
      surfaceUnits = Math.max(
        surfaceUnits,
        'terrain-solid:'.length + String(map.width).length + 1 + String(map.height).length,
      );
      sourceUnits = Math.max(sourceUnits, surfaceUnits);
      const solids = pieces + terrainSolids;
      return new NativeGeometryAllocation(
        capacity,
        metadata,
        map,
        surfaceUnits,
        sourceUnits,
        solids,
        terrainSolids,
        supportFeatures + terrainSolids + 5 * map.spatial.surfaces.length + 6 * solids,
      );
    } catch (error) {
      metadata.release();
      throw error;
    }
  }

  reserve(bytes: number): NativeWorldConsumer {
    if (!this.capacity) throw new Error('Native physical allocation owner is closed.');
    if (!Number.isSafeInteger(bytes) || bytes < 0)
      throw new GeometryAllocationError('Physical allocation bound overflow.');
    try {
      return this.capacity.reserveConsumerBytes(bytes);
    } catch (error) {
      throw new GeometryAllocationError(error);
    }
  }

  clone(value: unknown): GeometryCloneAllocation {
    const frame = this.reserve(nativeJsonFixedWorkspace);
    let body: GeometryReservation | undefined;
    try {
      const s = shape(),
        wire = cloneShape(value, s);
      body = this.reserve(bodyBytes(s) + 256);
      // Node22 ValueSerializer::ExpandBuffer doubles capacity +64. Old/new
      // realloc overlap fits 3*wire+128. UTF-16 flattening and the serializer's
      // identity/handle tables are separate from the retained cloned graph.
      const scratch = this.reserve(
        nativeJsonFixedWorkspace + 3 * wire + 128 + 2 * s.units + s.containers * 64,
      );
      return new CloneAllocation(body, scratch);
    } catch (error) {
      body?.release();
      throw error;
    } finally {
      frame.release();
    }
  }

  result(kind: 'geometry' | 'navigation', count: number): GeometryReservation {
    const s = shape();
    object(s, 4);
    if (kind === 'geometry') array(s, count);
    else {
      object(s, 4);
      object(s, 6); // Optional existing worker timing/build envelope.
      object(s, 3);
      array(s, 1);
      array(s, SPATIAL_LIMITS.maxPathPoints);
      point(s, SPATIAL_LIMITS.maxPathPoints, this.surfaceUnits);
      text(s, 256, 2); // Existing finite status/reason and reply-key envelopes.
    }
    // A worker constructs its answer before serializing it. The receiving
    // answer's independent body is already funded by the outer preparation.
    const wire =
      kind === 'geometry'
        ? 128 + count
        : 512 + SPATIAL_LIMITS.maxPathPoints * (64 + 2 * this.surfaceUnits);
    return this.reserve(bodyBytes(s) + nativeJsonFixedWorkspace + 3 * wire + 128);
  }

  prepare(queries: NativeGeometryQueries): {
    output: NativeWorldConsumer;
    scratch: GeometryReservation;
  } {
    const frame = this.reserve(nativeJsonFixedWorkspace);
    let output: NativeWorldConsumer | undefined;
    try {
      const s = shape();
      object(s, 16);
      object(s, 5); // Borrowed numeric binding retains its independent body.
      let scratch = nativeJsonFixedWorkspace + 32 * 256;
      const slots =
        queries.sight.length +
        queries.walking.length +
        queries.support.length +
        queries.standing.length +
        queries.surfaceLines.length +
        queries.sightSweeps.length +
        queries.sound.length +
        queries.navigation.length +
        queries.routes.length +
        queries.features.length +
        queries.featureIds.length +
        queries.convexViews.length +
        queries.bodySweeps.length +
        queries.standingColumns.length;
      array(s, slots, 14);
      point(s, queries.support.length + queries.standingColumns.length, this.surfaceUnits);
      object(s, 2, queries.bodySweeps.length);
      object(s, 3, queries.standingColumns.length);
      object(s, 2, queries.standingColumns.length); // Selected horizontal direction.
      const map = this.mapValue!;
      const linePoints = 2 * map.spatial.surfaces.length;
      object(s, 1, queries.surfaceLines.length);
      array(s, linePoints * queries.surfaceLines.length, queries.surfaceLines.length);
      point(s, linePoints * queries.surfaceLines.length, this.surfaceUnits);
      const shapes = map.spatial.surfaces.length + this.solids;
      // Six planes: four linear roots each plus two roots per plane pair.
      const fractions = 54 * shapes;
      object(s, 1, queries.sightSweeps.length);
      array(s, fractions * queries.sightSweeps.length, queries.sightSweeps.length);
      if (queries.sightSweeps.length)
        scratch = Math.max(scratch, 3 * arrayScratch(fractions) + shapes * 256 + 6 * 256);
      for (const query of queries.routes) {
        object(s, 5);
        array(s, linePoints + 1);
        point(s, linePoints + 1, this.surfaceUnits);
        // Pending direct plans retain a copied request, body and up to twelve
        // Source approach destinations; no request becomes executable here.
        object(s, 6);
        object(s, 8);
        text(s, query.body.id.length);
        object(s, 2);
        point(s, 2);
        point(s, 13, this.surfaceUnits);
        array(s, 12);
        if (query.kind === 'approach' && query.targetPosition && query.reach !== undefined) {
          const radius = Math.min(12, Math.max(1, query.reach));
          let candidates = 1 + Math.min(this.terrainSolids, Math.ceil((2 * radius + 1) ** 2));
          for (const surface of map.spatial.surfaces)
            candidates +=
              Math.max(
                0,
                Math.min(Math.floor(surface.maxX), Math.floor(query.targetPosition.x + radius)) -
                  Math.max(Math.ceil(surface.minX), Math.ceil(query.targetPosition.x - radius)) +
                  1,
              ) *
              Math.max(
                0,
                Math.min(Math.floor(surface.maxZ), Math.floor(query.targetPosition.z + radius)) -
                  Math.max(Math.ceil(surface.minZ), Math.ceil(query.targetPosition.z - radius)) +
                  1,
              );
          scratch = Math.max(
            scratch,
            candidates * (256 + 2 * this.surfaceUnits) + 3 * arrayScratch(candidates),
          );
        }
      }
      object(s, 2, queries.navigation.length);
      object(s, 4, queries.navigation.length);
      array(s, queries.navigation.length * SPATIAL_LIMITS.maxPathPoints, queries.navigation.length);
      point(s, queries.navigation.length * SPATIAL_LIMITS.maxPathPoints, this.surfaceUnits);
      text(s, queries.navigation.length * 512, 3 * queries.navigation.length);
      const depth = Math.ceil(Math.log2(Math.max(1, this.featureCount))) + 1;
      for (const query of queries.features) {
        const values = Math.min(this.featureCount, query.allowance);
        object(s, 4);
        array(s, values);
        this.features(s, values);
        object(s, 4);
        array(s, 64, 1);
        array(s, 64 * (depth + 1), 64);
        const frontier = 64 + 3 * Math.min(query.allowance, 3 * this.featureCount);
        scratch = Math.max(
          scratch,
          frontier * (256 + arrayScratch(depth + 1)) + 3 * arrayScratch(frontier),
        );
      }
      this.features(s, queries.featureIds.length);
      object(s, 4, queries.convexViews.length);
      array(s, 8 * queries.convexViews.length, queries.convexViews.length);
      point(s, 8 * queries.convexViews.length);
      if (queries.convexViews.length)
        scratch = Math.max(scratch, (10 + 45) * 256 + arrayScratch(shapes));
      if (queries.standingColumns.length)
        scratch = Math.max(
          scratch,
          (map.spatial.surfaces.length + this.terrainSolids) * (256 + 2 * this.surfaceUnits) +
            3 * arrayScratch(shapes),
        );
      if (queries.sound.length)
        scratch = Math.max(scratch, shapes * 256 + 3 * arrayScratch(shapes));
      // Batches retain slice/split/result arrays until the actual awaited
      // result is appended. Navigation retains its <=64-entry request/result
      // maps and point-validation scratch through the complete batch.
      const batch = Math.min(128, Math.max(queries.sight.length, queries.walking.length));
      if (batch) scratch += 8 * arrayScratch(batch);
      scratch += Math.min(64, queries.navigation.length) * (12 * 256 + 4 * this.surfaceUnits);
      output = this.reserve(bodyBytes(s));
      return { output, scratch: this.reserve(scratch) };
    } catch (error) {
      output?.release();
      throw error;
    } finally {
      frame.release();
    }
  }

  private features(s: Shape, count: number): void {
    object(s, 6, count);
    object(s, 2, count);
    array(s, 4 * count, count);
    point(s, 7 * count);
    // Source feature IDs JSON-escape the selected support/source identifier
    // and finite number spellings; UTF-16 alone is not their emitted size.
    text(s, count * (7 * this.sourceUnits + 256), 3 * count);
  }

  finish<T extends object>(value: T, allocation: NativeWorldConsumer): T {
    return attachNativeConsumer(value, allocation);
  }

  release(): void {
    this.capacity = undefined;
    this.mapValue = undefined;
    this.metadata?.release();
    this.metadata = undefined;
  }
}
