import { surfaceContains, surfaceHeight } from '@open-legend/spatial';
import { FOLLOW_RULES } from './follow.js';
export { FOLLOW_RULES } from './follow.js';
import { outcome } from './events.js';
import { isSafeRecordId } from './records.js';
import { seesEntity } from './perception.js';
import type { Command, Outcome, WorldState } from './types.js';

/** Initial invocation adapter, not a second mechanics registry.
 * docs/action-capabilities.md#mechanical-workflow-reconciliation
 */
export interface NavigationInvocation {
  family: 'move' | 'follow';
  x: number | null;
  z: number | null;
  surfaceId: string | null;
  targetEntityId: string | null;
  distance: number | null;
}
export interface ActionFulfillment {
  requested: string;
  executableDescription: string;
  verdict: 'exact' | 'partial' | 'confirm';
  supported: string[];
  omitted: { requirement: string; reason: string }[];
  reason: string;
}
export const NAVIGATION_CAPABILITIES = [
  {
    id: 'move',
    version: 1,
    description:
      'Move to x,z on a public supported surface; native code derives elevation. Null surface is accepted only at an unambiguous support. No teleportation.',
  },
  {
    id: 'follow',
    version: 1,
    description:
      'Keep near one currently visible living actor. Default distance is 3 world units. Continues until cancellation, native interruption or target loss. No stealth, tracking through occlusion, behind/beside formation or sunset stop.',
  },
] as const;

export function validNavigationInvocation(raw: unknown): raw is NavigationInvocation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const v = raw as NavigationInvocation;
  if (
    Object.keys(v).length !== 6 ||
    !['family', 'x', 'z', 'surfaceId', 'targetEntityId', 'distance'].every((k) =>
      Object.hasOwn(v, k),
    )
  )
    return false;
  if (v.family === 'move')
    return (
      typeof v.x === 'number' &&
      Number.isFinite(v.x) &&
      typeof v.z === 'number' &&
      Number.isFinite(v.z) &&
      (v.surfaceId === null || isSafeRecordId(v.surfaceId)) &&
      v.targetEntityId === null &&
      v.distance === null
    );
  return (
    v.family === 'follow' &&
    v.x === null &&
    v.z === null &&
    v.surfaceId === null &&
    isSafeRecordId(v.targetEntityId) &&
    (v.distance === null ||
      (typeof v.distance === 'number' &&
        Number.isFinite(v.distance) &&
        v.distance >= FOLLOW_RULES.minimumDistance &&
        v.distance <= FOLLOW_RULES.maximumDistance))
  );
}

/** Binding creates an intention only. The ordinary command owner rechecks physics at start. */
export function bindNavigationInvocation(
  world: WorldState,
  actorId: string,
  id: string,
  raw: unknown,
  permittedEntityIds: readonly string[],
): Command | Outcome {
  if (!validNavigationInvocation(raw))
    return outcome(
      false,
      'invalid-invocation',
      'Navigation arguments do not match an available capability.',
    );
  const actor = Object.hasOwn(world.entities, actorId) ? world.entities[actorId] : undefined;
  if (!actor?.actor) return outcome(false, 'actor-unavailable', 'The actor is unavailable.');
  if (raw.family === 'follow') {
    const targetId = raw.targetEntityId!;
    const target = Object.hasOwn(world.entities, targetId) ? world.entities[targetId] : undefined;
    if (
      targetId === actorId ||
      !permittedEntityIds.includes(targetId) ||
      !target?.actor?.alive ||
      !seesEntity(world, actor, target)
    )
      return outcome(
        false,
        'target-unavailable',
        'Choose a currently perceived living actor to follow.',
      );
    return {
      id,
      actorId,
      type: 'follow',
      targetId,
      distance: raw.distance ?? FOLLOW_RULES.defaultDistance,
    };
  }
  // The first spatial provider explicitly discloses starter geometry. Hidden topology needs SW's scoped provider.
  if (world.map.spatial.disclosure !== 'public')
    return outcome(
      false,
      'unsupported-navigation',
      'This geometry requires a scoped destination provider.',
    );
  const point = { x: raw.x!, z: raw.z! };
  const surfaces = world.map.spatial.surfaces.filter(
    (surface) =>
      (!raw.surfaceId || surface.id === raw.surfaceId) && surfaceContains(surface, point),
  );
  if (surfaces.length !== 1)
    return outcome(
      false,
      surfaces.length ? 'ambiguous-destination' : 'invalid-destination',
      surfaces.length
        ? 'Choose the intended support or floor for these coordinates.'
        : 'No supported surface covers that destination.',
    );
  const surface = surfaces[0]!;
  return {
    id,
    actorId,
    type: 'move',
    destination: { ...point, y: surfaceHeight(surface, point.x, point.z), surfaceId: surface.id },
  };
}

export function validActionFulfillment(raw: unknown): raw is ActionFulfillment {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as ActionFulfillment;
  const text = (v: unknown, max: number) =>
    typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  return (
    ['exact', 'partial', 'confirm'].includes(r.verdict) &&
    text(r.requested, 500) &&
    text(r.executableDescription, 1000) &&
    text(r.reason, 1000) &&
    Array.isArray(r.supported) &&
    r.supported.length <= 8 &&
    r.supported.every((v) => text(v, 500)) &&
    Array.isArray(r.omitted) &&
    r.omitted.length <= 8 &&
    r.omitted.every((v) => v && text(v.requirement, 500) && text(v.reason, 500)) &&
    (r.verdict !== 'exact' || r.omitted.length === 0) &&
    (r.verdict !== 'partial' || r.omitted.length > 0)
  );
}
