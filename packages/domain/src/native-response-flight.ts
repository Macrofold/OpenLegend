import {
  canFlySegment,
  canStand,
  distance3D,
  horizontalDistance,
  resolveSupport,
  SPATIAL_LIMITS,
  type WorldPoint,
} from '@open-legend/spatial';
import { canonicalJson } from './events.js';
import { occupiedBodySweepReader } from './spatial.js';
import { nativeAcousticPreference } from './native-response.js';
import {
  bodyProfile,
  sameBodyProfile,
  spatialMap,
  worldPosition,
  worldSupport,
  flightRouteDigest,
} from './spatial-state.js';
import type { FlightConnection } from './spatial-state.js';
import {
  nativeRefugeChoices,
  scoreNativeRefugeGeometry,
  type NativeRefugeScore,
} from './native-response-refuge.js';
import { nativeDangersClearAt, type NativeDangerFrame } from './native-response-danger.js';
import { chargeWork } from './work-budget.js';
import type { Entity, WorldState } from './types.js';

type CompleteDangers = Extract<NativeDangerFrame, { status: 'complete' }>;
export interface NativeFlightChoice extends NativeRefugeScore {
  connection: FlightConnection;
  routeDigest: string;
  /** Physical preparation only. Air points carry no invented floor identity. */
  path: WorldPoint[];
}
export interface NativeFlightPreparation {
  coverage: 'authored' | 'retained-only' | 'unavailable';
  basis: string;
  choices: NativeFlightChoice[];
  omitted: Array<{ id: string; reason: string }>;
}

/** Exact current physical/evidence basis; unrelated names, weather and history
 * do not grant a new flight or invalidate an unchanged connection. */
export function nativeFlightBasis(
  world: WorldState,
  animal: Entity,
  frame: CompleteDangers,
): string {
  const episode = animal.animal!.episode!;
  const root = animal.spatial.flight?.routeId ?? episode.aerialRouteId;
  return canonicalJson([
    animal.id,
    animal.actor!.physicalLife ?? 0,
    episode.id,
    episode.profilePin,
    episode.locomotion,
    episode.aerialRouteId,
    episode.acousticCue?.sound.direction ?? null,
    world.simTime,
    spatialMap(world).spatial.revision,
    worldPosition(animal),
    worldSupport(animal),
    bodyProfile(animal),
    animal.actor!.action?.id ?? null,
    animal.spatial.flight ?? null,
    root,
    root ? world.flightRoutes[root]?.responseConnections : null,
    root
      ? world.flightRoutes[root]?.responseConnections?.map((connection) => [
          connection.routeId,
          world.flightRoutes[connection.routeId]
            ? flightRouteDigest(world.flightRoutes[connection.routeId]!)
            : null,
        ])
      : null,
    frame.records.map(({ key, danger }) => {
      const { insideAvoidance: _band, ...observed } = danger;
      return [key, observed];
    }),
  ]);
}

/** Complete finite graph preparation, not another navigation or movement owner.
 * Explicit connections still need current physical and personally exposed paths. */
export function prepareNativeFlightChoices(
  world: WorldState,
  animal: Entity,
  frame: CompleteDangers,
  retained?: FlightConnection,
): NativeFlightPreparation {
  const episode = animal.animal!.episode!;
  const basis = nativeFlightBasis(world, animal, frame),
    rootId = animal.spatial.flight?.routeId ?? episode.aerialRouteId,
    root = rootId ? world.flightRoutes[rootId] : undefined,
    from = worldPosition(animal),
    departure = worldSupport(animal),
    body = bodyProfile(animal),
    map = spatialMap(world);
  const omitted: NativeFlightPreparation['omitted'] = [],
    prepared: NativeFlightChoice[] = [],
    digests = new Map<string, string>();
  const coverage = root?.responseConnections?.length
    ? 'authored'
    : retained
      ? 'retained-only'
      : 'unavailable';
  if (frame.profile.locomotion[episode.locomotion]?.flightEscape === undefined)
    return {
      basis,
      coverage: 'unavailable',
      choices: [],
      omitted: [{ id: 'profile', reason: 'unsupported-flight-profile' }],
    };
  const connections = [
    ...(retained ? [{ connection: retained, retained: true }] : []),
    ...(root?.responseConnections ?? []).map((connection) => ({ connection, retained: false })),
  ];
  const sweeps = occupiedBodySweepReader(world, animal);
  for (const entry of connections) {
    chargeWork({ tests: 1 });
    const connection = entry.connection,
      id = JSON.stringify([connection.kind, connection.routeId, connection.next, entry.retained]),
      route = world.flightRoutes[connection.routeId];
    const refuse = (reason: string) => omitted.push({ id, reason });
    if (!route || !sameBodyProfile(route.body, body)) {
      refuse('body-or-route-unavailable');
      continue;
    }
    const end = connection.kind === 'landing' ? route.points.length - 1 : connection.next;
    if (connection.next < 0 || end < connection.next || end >= route.points.length) {
      refuse('invalid-connection');
      continue;
    }
    const points = route.points.slice(connection.next, end + 1);
    const terminal = points.at(-1)!;
    if (connection.kind === 'transit' && terminal.landingSurfaceId) {
      refuse('unsupported-air-node');
      continue;
    }
    if (
      connection.kind === 'landing' &&
      (route.continuation.kind !== 'land' || !terminal.landingSurfaceId)
    ) {
      refuse('unsupported-landing');
      continue;
    }
    let previous = from,
      support = departure,
      length = 0,
      refusal: string | undefined;
    for (const point of points) {
      chargeWork({ tests: 1 });
      if (
        point !== terminal &&
        point.landingSurfaceId &&
        distance3D(from, point.position) > SPATIAL_LIMITS.epsilon &&
        !nativeDangersClearAt(animal, point.position, frame, world.simTime)
      ) {
        refusal = 'unsafe-intermediate-landing';
        break;
      }
      if (
        ((support !== null || point.landingSurfaceId) &&
          horizontalDistance(previous, point.position) > SPATIAL_LIMITS.epsilon) ||
        !canFlySegment(
          map,
          previous,
          point.position,
          body,
          [support, point.landingSurfaceId].filter((id): id is string => !!id),
        )
      ) {
        refusal = 'blocked-connector-or-corridor';
        break;
      }
      length += distance3D(previous, point.position);
      previous = point.position;
      support = point.landingSurfaceId ?? null;
    }
    if (refusal) {
      refuse(refusal);
      continue;
    }
    if (length <= SPATIAL_LIMITS.epsilon) {
      refuse('no-advance');
      continue;
    }
    const landing =
      terminal.landingSurfaceId &&
      resolveSupport(map, terminal.position, terminal.landingSurfaceId);
    if (connection.kind === 'landing' && (!landing || !canStand(map, landing, body))) {
      refuse('unsupported-landing');
      continue;
    }
    const candidate = {
      id,
      point: landing ? { ...landing } : { ...terminal.position },
      ...(entry.retained ? { retained: true as const } : {}),
    };
    const path = points.map((point) => ({ ...point.position }));
    const scored = scoreNativeRefugeGeometry(
      world,
      animal,
      frame,
      candidate,
      from,
      path,
      length,
      sweeps,
    );
    if (scored.status !== 'complete') {
      refuse(scored.reason);
      continue;
    }
    if (connection.kind === 'landing' && scored.score.arrivalMargin < -SPATIAL_LIMITS.epsilon) {
      refuse('unsafe-landing');
      continue;
    }
    let routeDigest = digests.get(route.id);
    if (!routeDigest) {
      routeDigest = flightRouteDigest(route);
      digests.set(route.id, routeDigest);
    }
    prepared.push({
      candidate,
      connection: { ...connection },
      path,
      length,
      routeDigest,
      ...scored.score,
    });
  }
  // A currently usable supported landing is the actual escape goal. Air nodes
  // are finite continuation when no such landing is currently available.
  const landings = prepared.filter((choice) => choice.connection.kind === 'landing');
  const pool = landings.length ? landings : prepared;
  const unique = new Map<string, NativeFlightChoice>();
  for (const choice of pool) {
    const key = canonicalJson([choice.connection.kind, choice.candidate.point]);
    const old = unique.get(key);
    if (
      !old ||
      choice.candidate.retained ||
      (!old.candidate.retained &&
        (choice.worsening < old.worsening - SPATIAL_LIMITS.epsilon ||
          (Math.abs(choice.worsening - old.worsening) <= SPATIAL_LIMITS.epsilon &&
            choice.length < old.length)))
    )
      unique.set(key, choice);
  }
  const choices = nativeRefugeChoices(
    [...unique.values()].sort((a, b) =>
      a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0,
    ),
    frame.profile,
    nativeAcousticPreference(animal),
  );
  return { basis, coverage, choices, omitted };
}
