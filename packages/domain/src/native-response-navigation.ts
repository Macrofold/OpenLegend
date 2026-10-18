import {
  distance3D,
  findSurfaceRoute,
  type NavigationRequest,
  type NavigationResult,
} from '@open-legend/spatial';
import { activelyParticipates } from './participation-state.js';
import { bodyProfile, spatialMap, worldPosition, worldSupport } from './spatial-state.js';
import { capabilityBlocked } from './status-capabilities.js';
import { canonicalJson } from './events.js';
import { nativeResponseProfile } from './native-response.js';
import { navigationResultProblem } from './navigation-result.js';
import {
  prepareNativeRefugeRoute,
  scoreNativeRefugeRoute,
  type NativeRefugeRoute,
} from './native-response-refuge.js';
import type { NativeDangerFrame } from './native-response-danger.js';
import type { Entity, WorldState } from './types.js';

export interface NativeRefugeBatch {
  key: string;
  requests: Array<{ candidateId: string; request: NavigationRequest }>;
}
export interface PreparedNativeRefuges {
  key: string;
  results: Array<{ candidateId: string; request: NavigationRequest; result: NavigationResult }>;
}
/** Host-owned bounded derived answers; never a second saved movement path. */
export type NativeRefugePreparations = ReadonlyMap<string, PreparedNativeRefuges>;

export function nativeRefugeBatch(
  world: WorldState,
  observer: Entity,
): NativeRefugeBatch | undefined {
  const state = observer.animal,
    episode = state?.episode,
    proposal = episode?.proposal;
  if (
    !state ||
    !episode ||
    !proposal ||
    observer.actor?.controller !== 'native' ||
    !observer.actor.alive ||
    observer.actor.incapacitated ||
    !activelyParticipates(observer) ||
    state.physicalLife !== (observer.actor.physicalLife ?? 0) ||
    capabilityBlocked(world, observer, 'locomotion') ||
    !nativeResponseProfile(world, episode.profilePin) ||
    proposal.geometryRevision !== spatialMap(world).spatial.revision ||
    worldSupport(observer) !== proposal.origin.surfaceId ||
    distance3D(worldPosition(observer), proposal.origin) > 1e-7 ||
    proposal.movementId !== (observer.actor.action?.id ?? null)
  )
    return undefined;
  const body = bodyProfile(observer);
  if (
    body.radius !== proposal.body.radius ||
    body.height !== proposal.body.height ||
    body.maxSlope !== proposal.body.maxSlope
  )
    return undefined;
  const requests: NativeRefugeBatch['requests'] = [];
  for (const candidate of proposal.candidates) {
    if (candidate.retained) continue;
    const route = findSurfaceRoute(spatialMap(world), proposal.origin, candidate.point, body);
    if (route.status === 'pending')
      requests.push({ candidateId: candidate.id, request: route.request });
  }
  return {
    key: canonicalJson([
      world.id,
      observer.id,
      state.physicalLife,
      episode.id,
      episode.profilePin,
      episode.locomotion,
      proposal,
    ]),
    requests,
  };
}

export function nativeRefugePreparationReady(
  world: WorldState,
  observer: Entity,
  prepared?: NativeRefugePreparations,
): boolean {
  const batch = nativeRefugeBatch(world, observer);
  if (!batch?.requests.length) return true;
  const result = prepared?.get(observer.id);
  return (
    result?.key === batch.key &&
    result.results.length === batch.requests.length &&
    batch.requests.every(
      (request, index) =>
        request.candidateId === result.results[index]?.candidateId &&
        canonicalJson(request.request) === canonicalJson(result.results[index]?.request),
    )
  );
}

/** Complete comparison only. One missing route leaves the whole selection
 * pending; callback order cannot discard candidates or assign an RNG draw. */
export function preparedNativeRefugeRoutes(
  world: WorldState,
  observer: Entity,
  frame: Extract<NativeDangerFrame, { status: 'complete' }>,
  prepared?: NativeRefugePreparations,
): NativeRefugeRoute[] | 'unavailable' | undefined {
  const episode = observer.animal?.episode,
    proposal = episode?.proposal;
  const batch = nativeRefugeBatch(world, observer);
  if (!proposal || !batch || !nativeRefugePreparationReady(world, observer, prepared))
    return undefined;
  const routes: NativeRefugeRoute[] = [];
  for (const candidate of proposal.candidates) {
    if (candidate.retained) {
      const action = observer.actor?.action;
      if (
        !action ||
        action.id !== episode?.movement?.id ||
        action.navigation ||
        !action.path.length
      )
        continue;
      const request: NavigationRequest = {
        from: proposal.origin,
        destinations: [candidate.point],
        body: bodyProfile(observer),
        geometryRevision: proposal.geometryRevision,
      };
      if (
        navigationResultProblem(
          spatialMap(world),
          request,
          { status: 'reached', path: action.path, length: 0 },
          bodyProfile(observer),
        )
      )
        continue;
      let previous = proposal.origin,
        length = 0;
      for (const point of action.path) {
        length += distance3D(previous, point);
        previous = point;
      }
      const scored = scoreNativeRefugeRoute(
        world,
        observer,
        frame,
        candidate,
        proposal.origin,
        action.path.map((point) => ({ ...point })),
        length,
      );
      if (scored.status === 'complete') routes.push(scored.route);
      continue;
    }
    const direct = prepareNativeRefugeRoute(world, observer, frame, candidate);
    if (direct.status === 'complete') {
      routes.push(direct.route);
      continue;
    }
    if (direct.status !== 'pending') continue;
    const answer = prepared
      ?.get(observer.id)
      ?.results.find((result) => result.candidateId === candidate.id);
    if (answer?.result.status === 'unavailable' || answer?.result.status === 'budget-exceeded')
      return 'unavailable';
    if (
      !answer ||
      navigationResultProblem(
        spatialMap(world),
        direct.request,
        answer.result,
        bodyProfile(observer),
      )
    )
      continue;
    let previous = proposal.origin,
      length = 0;
    for (const point of answer.result.path) {
      length += distance3D(previous, point);
      previous = point;
    }
    const scored = scoreNativeRefugeRoute(
      world,
      observer,
      frame,
      candidate,
      proposal.origin,
      answer.result.path.map((point) => ({ ...point })),
      length,
    );
    if (scored.status === 'complete') routes.push(scored.route);
  }
  return routes;
}
