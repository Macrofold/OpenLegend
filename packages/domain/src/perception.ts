import {
  canWalkSegment,
  clearSegment,
  distance3D,
  resolveSupport,
  soundTransmission,
  type SurfacePoint,
} from '@open-legend/spatial';
import { bodyProfile, spatialMap } from './spatial-state.js';
import { isDraft, original } from 'immer';
import { distance } from './spatial.js';
import type { Entity, Position, WorldState } from './types.js';

export const PERCEPTION_RULES = { sightRadius: 28, hearingRadius: 10 } as const;
/** Reviewed detector versions are pinned in each world's resolved manifest. */
export const SENSE_IMPLEMENTATIONS = [
  'vision-geometry-v1',
  'hearing-transmission-v1',
  'contact-proximity-v1',
] as const;
export type SenseImplementation = (typeof SENSE_IMPLEMENTATIONS)[number];
export interface SenseDefinition {
  id: string;
  version: 1;
  implementation: SenseImplementation;
  radius: number;
}
export const DEFAULT_SENSES: SenseDefinition[] = [
  { id: 'wilderness:vision', version: 1, implementation: 'vision-geometry-v1', radius: 28 },
  { id: 'wilderness:hearing', version: 1, implementation: 'hearing-transmission-v1', radius: 10 },
];
export const COARSE_TOUCH: SenseDefinition = {
  id: 'contact:touch',
  version: 1,
  implementation: 'contact-proximity-v1',
  radius: 0.8,
};
export interface ContactEpisode {
  id: string;
  senseId: string;
  detail: 'present' | 'moving';
  enteredAt: number;
  changedAt: number;
}
export interface ContactView {
  id: string;
  senseId: string;
  text: string;
  recognized: false;
  detail: 'present' | 'moving';
}
type ResolvedSenses = {
  definitions: SenseDefinition[];
  vision: number;
  hearing: number;
};
const resolvedSenses = new WeakMap<object, Map<string, ResolvedSenses>>();
function resolveSenses(world: WorldState, entity: Entity): ResolvedSenses {
  // Installed definitions/bindings are replaced, never edited in-place during a tick.
  // Reuse immutable resolution across drafts: docs/performance.md#simulation-cpu-and-growing-history.
  const manifest = isDraft(world.moduleManifest)
    ? original(world.moduleManifest!)!
    : world.moduleManifest!;
  let byBinding = resolvedSenses.get(manifest);
  if (!byBinding) resolvedSenses.set(manifest, (byBinding = new Map()));
  const bindings = entity.actor?.senses;
  const key = bindings?.join('|') ?? 'default';
  let result = byBinding.get(key);
  if (!result) {
    const ids = bindings ?? manifest.defaultSenses;
    const definitions = manifest.senses.filter((s) => ids.includes(s.id));
    result = {
      definitions,
      vision: definitions.find((s) => s.implementation === 'vision-geometry-v1')?.radius ?? 0,
      hearing: definitions.find((s) => s.implementation === 'hearing-transmission-v1')?.radius ?? 0,
    };
    byBinding.set(key, result);
  }
  return result;
}
export function sensesFor(world: WorldState, entity: Entity): SenseDefinition[] {
  return resolveSenses(world, entity).definitions;
}
export function visionRadius(world: WorldState, entity: Entity): number {
  return resolveSenses(world, entity).vision;
}
export function seesEntity(world: WorldState, observer: Entity, source: Entity): boolean {
  const radius = visionRadius(world, observer);
  if (radius <= 0 || distance(observer.position, source.position) > radius) return false;
  if (observer.id === source.id) return true;
  const eye = { ...observer.position, y: observer.position.y + bodyProfile(observer).eyeHeight };
  const height = bodyProfile(source).height;
  // Coarse extent sampling avoids an all-or-nothing center ray. Detail/recognition still
  // belong to the sensory contract, not to the renderer or the shape library.
  return [0.85, 0.5, 0.15].some((fraction) =>
    clearSegment(spatialMap(world), eye, {
      ...source.position,
      y: source.position.y + height * fraction,
    }),
  );
}
export function hearsEntity(world: WorldState, observer: Entity, source: Entity): boolean {
  const radius = resolveSenses(world, observer).hearing;
  if (radius <= 0) return false;
  const listener = {
    ...observer.position,
    y: observer.position.y + bodyProfile(observer).earHeight,
  };
  const origin = { ...source.position, y: source.position.y + bodyProfile(source).earHeight };
  const transmission = soundTransmission(spatialMap(world), listener, origin);
  // Current speech consumers assume intelligible words and identity. Until EPR supplies
  // graded auditory contacts, do not put an indistinct sound in that full-text audience.
  // docs/spatial-world.md#seeing-and-hearing-in-3d
  return transmission >= 0.65 && distance3D(listener, origin) <= radius * transmission;
}
export function contactViews(entity: Entity): ContactView[] {
  return Object.values(entity.actor?.contacts ?? {}).map((c) => ({
    id: c.id,
    senseId: c.senseId,
    recognized: false,
    detail: c.detail,
    text:
      c.detail === 'moving'
        ? 'I feel an unidentified moving contact.'
        : 'I feel an unidentified contact.',
  }));
}
/** A blind actor can probe locally, not consult the world's hidden route graph.
 * Contact identification and learned-route planning remain EWF05/AG work; see
 * docs/extensible-world-examples.md#ex02--blind-creatures-that-sense-only-by-touch. */
export function directProbe(
  world: WorldState,
  from: Position,
  to: Position,
  fromSurfaceId?: string,
  toSurfaceId?: string,
): SurfacePoint[] | null {
  const map = spatialMap(world),
    a = resolveSupport(map, from, fromSurfaceId),
    b = resolveSupport(map, to, toSurfaceId);
  if (!a || !b || distance(from, to) > 1 || !canWalkSegment(map, a, b)) return null;
  return [{ ...b }];
}
// Position-only helpers retain the default geometry for callers that do not have a receiver.
export function canSee(from: Position, to: Position): boolean {
  return distance(from, to) <= PERCEPTION_RULES.sightRadius;
}
export function canHear(world: WorldState, from: Position, to: Position): boolean {
  const transmission = soundTransmission(spatialMap(world), from, to);
  return (
    transmission >= 0.65 && distance(from, to) <= PERCEPTION_RULES.hearingRadius * transmission
  );
}
