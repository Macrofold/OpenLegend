import { immutableDataSnapshot } from '@open-legend/domain';
import { navigationResultProblem } from '@open-legend/domain/native-install';
import type {
  NativeGeometryAnswers,
  NativeGeometryQueries,
  NativeWorld,
} from '@open-legend/native-simulation';
import {
  canStand,
  bodySweepFraction,
  distanceBounds,
  findOutsideSurfaceRoute,
  findSurfaceRoute,
  findApproachRoute,
  relativeSurfacePoint,
  resolveSupport,
  physicalFeatureById,
  queryConvexView,
  queryPhysicalFeatures,
  sightSweep,
  soundTransmission,
  standingSurfaceAt,
  traceSupportLine,
  validateSpatialMap,
  walkSurfaceLine,
  type NavigationRequest,
  type BoundsQueryCursor,
  type SpatialMap,
} from '@open-legend/spatial';
import { GeometryBatches } from './geometry-batches.js';
import { NavigationPreparation } from './navigation/preparation.js';
import { WorkLane } from './work-lane.js';
import { releaseNativeProduct } from './native-consumer.js';
import { NativeGeometryAllocation } from './native-geometry-allocation.js';

/** Physical preparation retains one immutable provider map, never a WorldState.
 * Native owns the bodies, action, permission and acquiring observer. The caller
 * keeps the candidate private while awaiting and verifies the returned binding.
 */
export class NativeGeometryProviders {
  private mapValue?: SpatialMap;
  private readonly batches: GeometryBatches;
  private readonly navigation: NavigationPreparation;
  private readonly navigationLane: WorkLane;
  private readonly allocation: NativeGeometryAllocation;
  private closed = false;
  private active = false;
  private computing?: Promise<void>;

  constructor(map: SpatialMap, capacity: Pick<NativeWorld, 'reserveConsumerBytes'>) {
    const allocation = NativeGeometryAllocation.capture(capacity, map);
    try {
      validateSpatialMap(map);
      this.mapValue = immutableDataSnapshot(map);
      this.batches = new GeometryBatches(allocation);
      this.navigation = new NavigationPreparation(allocation);
      this.navigationLane = new WorkLane('native.navigation', 64, 20_000);
      this.allocation = allocation;
    } catch (error) {
      allocation.release();
      throw error;
    }
  }

  private get map(): SpatialMap {
    if (!this.mapValue) throw new Error('Native physical provider is closed.');
    return this.mapValue;
  }

  async compute(queries: NativeGeometryQueries): Promise<NativeGeometryAnswers> {
    if (this.closed) throw new Error('Native physical provider is closed.');
    if (this.active) throw new Error('Native physical provider already has a pending phase.');
    if (queries.binding.geometryRevision !== this.map.spatial.revision)
      throw new Error('Native physical preparation names stale geometry.');
    const allocation = this.allocation.prepare(queries);
    let transferred = false;
    this.active = true;
    let finished!: () => void;
    const computing = new Promise<void>((resolve) => {
      finished = resolve;
    });
    this.computing = computing;
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
      const support = queries.support.map(({ point, surfaceId, relative }) =>
        relative
          ? surfaceId
            ? relativeSurfacePoint(
                this.map,
                { ...point, surfaceId },
                relative.heading,
                relative.x,
                relative.z,
              )
            : null
          : resolveSupport(this.map, point, surfaceId),
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
        const path = body
          ? walkSurfaceLine(this.map, from, x, z, body)
          : traceSupportLine(this.map, from, x, z);
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
      const routes = this.routes(queries);
      const navigation = await this.navigationAnswers(queries);
      if (this.closed) throw new Error('Native physical provider closed during preparation.');
      const answer = this.allocation.finish(
        {
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
        },
        allocation.output,
      );
      transferred = true;
      return answer;
    } finally {
      if (!transferred) allocation.output.release();
      allocation.scratch.release();
      this.active = false;
      this.computing = undefined;
      finished();
    }
  }

  private routes(queries: NativeGeometryQueries): NativeGeometryAnswers['routes'] {
    return queries.routes.map((query) => {
      if (
        query.kind === 'approach' &&
        query.targetPosition &&
        query.goal &&
        query.reach !== undefined
      )
        return (
          findApproachRoute(
            this.map,
            query.from,
            query.body,
            query.targetPosition,
            query.targetSupport ?? null,
            query.reach,
            query.goal,
          ) ?? { status: 'no-route' as const, path: [], expanded: 0 }
        );
      if (query.kind === 'surface' && query.to)
        return findSurfaceRoute(this.map, query.from, query.to, query.body);
      if (query.kind === 'outside' && query.bounds)
        return findOutsideSurfaceRoute(this.map, query.from, query.bounds, query.body);
      throw new Error('Native physical preparation has no route goal.');
    });
  }

  private navigationAnswers(
    queries: NativeGeometryQueries,
  ): Promise<NativeGeometryAnswers['navigation']> {
    if (!queries.navigation.length) return Promise.resolve([]);
    return this.navigationLane.run(async () => {
      if (this.closed) throw new Error('Native physical provider is closed.');
      const navigation: NativeGeometryAnswers['navigation'] = [];
      // Recast retains its own existing bounded admission and termination. The
      // direct route phase above preserves its actual cheap-positive behavior.
      for (let at = 0; at < queries.navigation.length; at += 64) {
        const requests = queries.navigation.slice(at, at + 64).map((request, offset) => ({
          id: String(at + offset),
          request: navigationRequest(request),
        }));
        const results = await this.navigation.compute(this.map, requests);
        for (const { id, request } of requests) {
          const result = results.get(id);
          if (!result) throw new Error('Native route preparation returned an incomplete batch.');
          navigation.push({
            result,
            problem: navigationResultProblem(this.map, request, result, request.body),
          });
        }
      }
      if (this.closed) throw new Error('Native physical provider closed during preparation.');
      return navigation;
    });
  }

  /** Entity-local preparation shares the existing bounded Recast provider,
   * while unrelated synchronous physical phases continue on the accepted map. */
  async prepareEntityNavigation(queries: NativeGeometryQueries): Promise<NativeGeometryAnswers> {
    if (this.closed || queries.binding.geometryRevision !== this.map.spatial.revision)
      throw new Error('Native navigation preparation names unavailable geometry.');
    for (const key of Object.keys(queries) as (keyof NativeGeometryQueries)[]) {
      if (key !== 'binding' && key !== 'routes' && key !== 'navigation' && queries[key].length)
        throw new Error('Entity-local preparation contains another physical phase.');
    }
    const allocation = this.allocation.prepare(queries);
    let transferred = false;
    try {
      const navigation = await this.navigationAnswers(queries);
      if (this.closed) throw new Error('Native physical provider closed during preparation.');
      const answer = this.allocation.finish(
        {
          binding: queries.binding,
          routes: this.routes(queries),
          navigation,
          sight: [],
          walking: [],
          support: [],
          standing: [],
          surfaceLines: [],
          sightSweeps: [],
          sound: [],
          features: [],
          featureIds: [],
          convexViews: [],
          bodySweeps: [],
          standingColumns: [],
        },
        allocation.output,
      );
      transferred = true;
      return answer;
    } finally {
      if (!transferred) allocation.output.release();
      allocation.scratch.release();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    const computing = this.computing;
    const stopped = await Promise.allSettled([this.batches.close(), this.navigation.close()]);
    try {
      await this.navigationLane.idle();
      await computing;
    } finally {
      // Returned answers retain only their independent allocation through the
      // real encoder. Even a failed termination must end this closed owner.
      this.mapValue = undefined;
      this.allocation.release();
      releaseNativeProduct(this);
    }
    const failed = stopped.find((value) => value.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
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
