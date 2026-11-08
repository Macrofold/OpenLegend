import { immutableDataSnapshot } from '@open-legend/domain';
import type { NativeGeometryAnswers, NativeGeometryQueries } from '@open-legend/native-simulation';
import {
  canStand,
  bodySweepFraction,
  distanceBounds,
  findOutsideSurfaceRoute,
  findSurfaceRoute,
  resolveSupport,
  physicalFeatureById,
  queryConvexView,
  queryPhysicalFeatures,
  sightSweep,
  soundTransmission,
  standingSurfaceAt,
  validateSpatialMap,
  walkSurfaceLine,
  type NavigationRequest,
  type BoundsQueryCursor,
  type SpatialMap,
} from '@open-legend/spatial';
import { GeometryBatches } from './geometry-batches.js';
import { prepareCandidateNavigation } from './navigation/preparation.js';

/** Physical preparation retains one immutable provider map, never a WorldState.
 * Native owns the bodies, action, permission and acquiring observer. The caller
 * keeps the candidate private while awaiting and verifies the returned binding.
 */
export class NativeGeometryProviders {
  private readonly map: SpatialMap;
  private readonly batches = new GeometryBatches();
  private closed = false;
  private active = false;

  constructor(map: SpatialMap) {
    validateSpatialMap(map);
    this.map = immutableDataSnapshot(map);
  }

  async compute(queries: NativeGeometryQueries): Promise<NativeGeometryAnswers> {
    if (this.closed) throw new Error('Native physical provider is closed.');
    if (this.active) throw new Error('Native physical provider already has a pending phase.');
    if (queries.binding.geometryRevision !== this.map.spatial.revision)
      throw new Error('Native physical preparation names stale geometry.');
    this.active = true;
    try {
      const sight: boolean[] = [];
      const walking: boolean[] = [];
      // Preserve the existing geometry owner's 128-query admission envelope;
      // there is one pending phase and no new backlog or per-actor worker.
      for (let at = 0; at < queries.sight.length; at += 128)
        sight.push(
          ...(await this.batches.compute({
            kind: 'sight',
            map: this.map,
            queries: queries.sight.slice(at, at + 128),
          })),
        );
      for (let at = 0; at < queries.walking.length; at += 128)
        walking.push(
          ...(await this.batches.compute({
            kind: 'walking',
            map: this.map,
            queries: queries.walking.slice(at, at + 128),
          })),
        );
      const support = queries.support.map(({ point, surfaceId }) =>
        resolveSupport(this.map, point, surfaceId),
      );
      const standing = queries.standing.map(({ point, body }) => canStand(this.map, point, body));
      const standingColumns = queries.standingColumns.map((query) => {
        for (let index = 0; index < query.columns.length; index++) {
          const column = query.columns[index]!;
          const point = standingSurfaceAt(
            this.map,
            column.x,
            column.z,
            query.referenceY,
            query.body,
          );
          if (point) return { index, point };
        }
        return null;
      });
      const surfaceLines = queries.surfaceLines.map(({ from, x, z, body }) => {
        const path = walkSurfaceLine(this.map, from, x, z, body);
        return path === null ? null : { path };
      });
      const sightSweeps = queries.sightSweeps.map(({ eyeFrom, eyeTo, pointFrom, pointTo }) => ({
        fractions: sightSweep(this.map, eyeFrom, eyeTo, pointFrom, pointTo).fractions,
      }));
      const sound = queries.sound.map(({ from, to }) => soundTransmission(this.map, from, to));
      const bodySweeps = queries.bodySweeps.map((query) => {
        if (query.mode !== 'first-hit' && query.mode !== 'nearest-hit')
          throw new Error('Native physical preparation has an invalid body sweep mode.');
        let fraction: number | undefined;
        let tested = 0;
        for (const bounds of query.bounds) {
          tested++;
          const hit = bodySweepFraction({ bounds }, query.from, query.to, query.body);
          if (hit !== undefined && (fraction === undefined || hit < fraction)) fraction = hit;
          if (hit !== undefined && query.mode === 'first-hit') break;
        }
        return { fraction, tested };
      });
      const features = queries.features.map((query) =>
        queryPhysicalFeatures(this.map, query.bounds, query.allowance, boundsCursor(query.cursor), {
          intersects: (bounds) => distanceBounds(bounds, query.radialOrigin) <= query.radialRadius,
          priority: (bounds) => {
            let nearest = Infinity;
            for (const anchor of query.priorityAnchors)
              nearest = Math.min(nearest, distanceBounds(bounds, anchor));
            return nearest;
          },
        }),
      );
      const featureIds = queries.featureIds.map((id) => physicalFeatureById(this.map, id) ?? null);
      const convexViews = queries.convexViews.map(({ from, target, allowance }) =>
        queryConvexView(this.map, from, target, allowance),
      );
      const routes = queries.routes.map((query) => {
        if (query.kind === 'surface' && query.to)
          return findSurfaceRoute(this.map, query.from, query.to, query.body);
        if (query.kind === 'outside' && query.bounds)
          return findOutsideSurfaceRoute(this.map, query.from, query.bounds, query.body);
        throw new Error('Native physical preparation has no route goal.');
      });
      const navigation: NativeGeometryAnswers['navigation'] = [];
      // Recast retains its own existing bounded admission and termination. The
      // direct route phase above preserves its actual cheap-positive behavior.
      for (let at = 0; at < queries.navigation.length; at += 64) {
        const requests = queries.navigation.slice(at, at + 64).map((request, offset) => ({
          id: String(at + offset),
          request: navigationRequest(request),
        }));
        const results = await prepareCandidateNavigation(this.map, requests);
        for (const { id } of requests) {
          const result = results.get(id);
          if (!result) throw new Error('Native route preparation returned an incomplete batch.');
          navigation.push(result);
        }
      }
      if (this.closed) throw new Error('Native physical provider closed during preparation.');
      return {
        binding: queries.binding,
        sight,
        walking,
        support,
        standing,
        surfaceLines,
        sightSweeps,
        sound,
        routes,
        navigation,
        features,
        featureIds,
        convexViews,
        bodySweeps,
        standingColumns,
      };
    } finally {
      this.active = false;
    }
  }

  close(): void {
    this.closed = true;
    this.batches.close();
  }
}

function navigationRequest(
  request: NativeGeometryQueries['navigation'][number],
): NavigationRequest {
  const { wait, ...fields } = request;
  if (wait !== undefined && wait !== 'world' && wait !== 'entity')
    throw new Error('Native route preparation has an invalid wait mode.');
  return { ...fields, ...(wait === undefined ? {} : { wait }) };
}

function boundsCursor(
  cursor: NativeGeometryQueries['features'][number]['cursor'],
): BoundsQueryCursor | undefined {
  if (!cursor) return;
  const { truncated, ...fields } = cursor;
  if (truncated === false) throw new Error('Native physical cursor has an invalid coverage flag.');
  return { ...fields, ...(truncated ? { truncated: true as const } : {}) };
}
