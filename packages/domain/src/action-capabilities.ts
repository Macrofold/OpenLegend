import { surfaceContains, surfaceHeight, type SurfacePoint } from '@open-legend/spatial';
import { FOLLOW_RULES, headingFrame } from './follow.js';
export { FOLLOW_RULES } from './follow.js';
import { rememberedPlace } from './agency.js';
import { canReachEntity, findApproachPath, sameSurfacePoint } from './spatial.js';
import { supportedPosition, worldPosition } from './spatial-state.js';
import { portableItems } from './item-handling.js';
import { accessiblePossession } from './object-access.js';
import { itemFor } from './objects.js';
import { SIMULATION_RULES } from './kernel.js';
import { outcome } from './events.js';
import { isSafeRecordId } from './records.js';
import { seesEntity } from './perception.js';
import type { Command, Entity, Outcome, WorldState } from './types.js';

/** Consequential request details carried as exact references, not re-derived from prose.
 * Admission checks the bound result keeps each one; an unkept slot is never exact.
 * docs/action-capabilities.md#preserve-the-consequential-slots
 */
export interface IntentSlots {
  itemId: string | null;
  instrumentId: string | null;
  recipientId: string | null;
  quantity: number | null;
  /** exact: units handled by the action; held: total the actor holds afterwards. */
  quantityMode: 'exact' | 'held' | null;
  /** A world-named clock time ("dawn"), bound to a simulation deadline natively. */
  until: string | null;
  /** Preserved method wording; no native family enforces methods yet. */
  method: string | null;
}
export const INTENT_LIMITS = { quantity: 999, method: 200 } as const;
/** The clock names this world lets a request use as a stopping time; the saved world's own
 * clock policy is the only source. docs/worlds/base/time.md#named-clock-times */
export function namedClockTimes(world: WorldState): string[] {
  return Object.keys(world.statusEffectPolicy.namedTimes);
}
const namedTime = (world: WorldState, name: unknown) =>
  typeof name === 'string' && Object.hasOwn(world.statusEffectPolicy.namedTimes, name);
const SLOT_KEYS = [
  'itemId',
  'instrumentId',
  'recipientId',
  'quantity',
  'quantityMode',
  'until',
  'method',
] as const;

/** Shape only, for envelopes checked before a world is at hand; admission and load use
 * validIntentSlots, which also requires a stopping time this world names. */
export function validIntentSlotShape(raw: unknown): raw is IntentSlots {
  return validSlots(
    raw,
    (name) => typeof name === 'string' && name.length > 0 && name.length <= 24,
  );
}
export function validIntentSlots(world: WorldState, raw: unknown): raw is IntentSlots {
  return validSlots(raw, (name) => namedTime(world, name));
}
function validSlots(raw: unknown, until: (name: unknown) => boolean): raw is IntentSlots {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const s = raw as IntentSlots;
  const id = (value: unknown) => value === null || isSafeRecordId(value);
  return (
    Object.keys(s).length === SLOT_KEYS.length &&
    SLOT_KEYS.every((key) => Object.hasOwn(s, key)) &&
    id(s.itemId) &&
    id(s.instrumentId) &&
    id(s.recipientId) &&
    (s.quantity === null
      ? s.quantityMode === null
      : Number.isSafeInteger(s.quantity) &&
        s.quantity >= 1 &&
        s.quantity <= INTENT_LIMITS.quantity &&
        (s.quantityMode === 'exact' || s.quantityMode === 'held')) &&
    (s.until === null || until(s.until)) &&
    (s.method === null ||
      (typeof s.method === 'string' &&
        s.method.trim().length > 0 &&
        s.method.length <= INTENT_LIMITS.method))
  );
}

/** Canonical identity for pending-intent matching; empty slots add nothing. */
export function slotsKey(slots: IntentSlots | null | undefined): string {
  return slots && SLOT_KEYS.some((key) => slots[key] !== null)
    ? JSON.stringify(SLOT_KEYS.map((key) => slots[key]))
    : '';
}

/** Why a request did not bind, in words the initiating actor may see. Technical
 * unavailability stays separate from semantic outcomes.
 * docs/action-capabilities.md#72-result-categories
 */
export type ResolutionCategory =
  | 'needs_clarification'
  | 'needs_planning'
  | 'needs_information'
  | 'blocked'
  | 'unsupported_capability'
  | 'forbidden'
  | 'unavailable';
export interface ActionResolution {
  category: ResolutionCategory;
  /** Actor-safe plain reason; never model reasoning or unperceived facts. */
  reason: string;
  /** Entity IDs (or @visible) whose change may alter the result; manifest always counts. */
  depends: string[];
  signature: string;
}
export const RESOLUTION_LIMITS = { depends: 8, reason: 500 } as const;
const RESOLUTION_CATEGORIES: readonly ResolutionCategory[] = [
  'needs_clarification',
  'needs_planning',
  'needs_information',
  'blocked',
  'unsupported_capability',
  'forbidden',
  'unavailable',
];

/** Compact FNV-1a digest; signatures compare equality only and carry no facts. */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(36);
}

/** Only what the actor could notice changing: its own perception episodes, visible sets
 * and public quantities of the named dependencies. Unrelated ticks leave it unchanged. */
export function resolutionSignature(
  world: WorldState,
  actorId: string,
  depends: readonly string[],
): string {
  const facts = depends.map((id) => {
    if (id === '@visible')
      return [
        ...(world.visiblePeople?.[actorId] ?? []),
        ...(world.visibleObjects?.[actorId] ?? []),
      ];
    const entity = Object.hasOwn(world.entities, id) ? world.entities[id] : undefined;
    if (!entity || entity.retirement) return 'absent';
    return [
      world.perceptionEpisodes?.[actorId]?.[id] ?? null,
      entity.resource?.quantity ?? null,
      entity.inventoryRevision ?? null,
      entity.item?.quantity ?? null,
      entity.heat?.lit ?? null,
      entity.actor?.alive ?? null,
    ];
  });
  return shortHash(JSON.stringify([world.moduleManifest.revision, facts]));
}

export function refuseAction(
  world: WorldState,
  actorId: string,
  category: ResolutionCategory,
  reason: string,
  depends: string[] = [],
): ActionResolution {
  const bounded = [...new Set(depends)].slice(0, RESOLUTION_LIMITS.depends);
  return {
    category,
    reason: reason.slice(0, RESOLUTION_LIMITS.reason),
    depends: bounded,
    signature: resolutionSignature(world, actorId, bounded),
  };
}

export function validActionResolution(raw: unknown): raw is ActionResolution {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const r = raw as ActionResolution;
  return (
    Object.keys(r).length === 4 &&
    RESOLUTION_CATEGORIES.includes(r.category) &&
    typeof r.reason === 'string' &&
    r.reason.trim().length > 0 &&
    r.reason.length <= RESOLUTION_LIMITS.reason &&
    Array.isArray(r.depends) &&
    r.depends.length <= RESOLUTION_LIMITS.depends &&
    r.depends.every((id) => id === '@visible' || isSafeRecordId(id)) &&
    typeof r.signature === 'string' &&
    r.signature.length > 0 &&
    r.signature.length <= 16
  );
}

/** Next simulation time at a world-named clock hour; the current instant means tomorrow. */
export function clockDeadline(world: WorldState, name: string): number | undefined {
  if (!namedTime(world, name)) return;
  const day = 86400;
  const now =
    (((world.simTime + world.statusEffectPolicy.clockOffsetHours * 3600) % day) + day) % day;
  const wait = (world.statusEffectPolicy.namedTimes[name]! * 3600 - now + day) % day;
  return world.simTime + (wait || day);
}

/** Initial invocation adapter, not a second mechanics registry.
 * docs/action-capabilities.md#mechanical-workflow-reconciliation
 */
export interface ActionInvocation {
  family: 'move' | 'follow' | 'pickup' | 'drop';
  x: number | null;
  z: number | null;
  surfaceId: string | null;
  /** Move: world X/Z, or actor frame where x is metres right and z metres forward. */
  frame: 'world' | 'actor' | null;
  /** Move near a visible target now, or to where this actor last saw it. */
  place: 'target' | 'last-seen' | null;
  targetEntityId: string | null;
  distance: number | null;
  relation: 'near' | 'behind' | 'beside' | 'left' | 'right' | null;
  onLost: 'stop' | 'last-seen' | null;
  /** A world-named clock time ending a follow, e.g. "dawn". */
  until: string | null;
  /** Pickup: one stack in the target pile; drop: one accessible possession. */
  itemId: string | null;
  /** Exact whole units; null takes or drops the whole stack. */
  quantity: number | null;
}
const INVOCATION_KEYS = [
  'family',
  'x',
  'z',
  'surfaceId',
  'frame',
  'place',
  'targetEntityId',
  'distance',
  'relation',
  'onLost',
  'until',
  'itemId',
  'quantity',
] as const;
/** Actor-frame offsets stay within the actor's own surroundings. */
export const INVOCATION_LIMITS = { offset: 50 } as const;
export interface ActionFulfillment {
  requested: string;
  executableDescription: string;
  verdict: 'exact' | 'partial' | 'confirm';
  supported: string[];
  omitted: { requirement: string; reason: string }[];
  reason: string;
}
/** Family descriptions given to the interpreter, built from this world's follow rules and
 * clock names so the text states exactly what validation enforces. */
export function navigationCapabilities(world: WorldState) {
  const times = namedClockTimes(world);
  return NAVIGATION_FAMILIES.map((family) =>
    family.id !== 'follow'
      ? family
      : {
          ...family,
          description: `Keep near one currently visible living actor; default ${FOLLOW_RULES.defaultDistance} world units (${FOLLOW_RULES.minimumDistance}-${FOLLOW_RULES.maximumDistance}). relation behind/beside/left/right uses the direction you actually saw them travel and stays near until they move. onLost last-seen walks to where you last saw them and stops there unless they are seen again in the same encounter. ${times.length ? `until ${times.join('/')} ends it successfully at that time. ` : ''}No stealth, scent tracking or hidden pursuit.`,
        },
  );
}
const NAVIGATION_FAMILIES = [
  {
    id: 'move',
    version: 2,
    description:
      'Move to x,z on a public supported surface (frame world); or x metres right and z metres forward of your own facing on your current ground (frame actor, at most 50 m); or near a visible target now (place target); or to where you last saw a target while acting on or following it (place last-seen). Native code derives elevation. No teleportation.',
  },
  {
    id: 'pickup',
    version: 1,
    description:
      'Pick up from one visible pile (targetEntityId): one stack (itemId) or, with itemId null, everything portable in it. quantity takes exactly that many from a divisible stack; individual objects cannot be split.',
  },
  {
    id: 'drop',
    version: 1,
    description:
      'Drop one accessible possession (itemId) on the ground where you stand; quantity drops exactly that many, null drops the whole stack as counted when chosen (fewer carried by then refuses rather than dropping a different amount).',
  },
  {
    id: 'follow',
    version: 2,
    description: '',
  },
] as const;

export function validActionInvocation(world: WorldState, raw: unknown): raw is ActionInvocation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const v = raw as ActionInvocation;
  if (
    Object.keys(v).length !== INVOCATION_KEYS.length ||
    !INVOCATION_KEYS.every((k) => Object.hasOwn(v, k))
  )
    return false;
  const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
  const amount =
    v.quantity === null ||
    (Number.isSafeInteger(v.quantity) && v.quantity! >= 1 && v.quantity! <= INTENT_LIMITS.quantity);
  const navigationOnly = [
    v.x,
    v.z,
    v.surfaceId,
    v.frame,
    v.place,
    v.distance,
    v.relation,
    v.onLost,
    v.until,
  ];
  if (v.family === 'pickup')
    return (
      navigationOnly.every((value) => value === null) &&
      isSafeRecordId(v.targetEntityId) &&
      (v.itemId === null || isSafeRecordId(v.itemId)) &&
      amount &&
      (v.quantity === null || v.itemId !== null)
    );
  if (v.family === 'drop')
    return (
      navigationOnly.every((value) => value === null) &&
      v.targetEntityId === null &&
      isSafeRecordId(v.itemId) &&
      amount
    );
  if (v.itemId !== null || v.quantity !== null) return false;
  if (v.family === 'move') {
    if (v.distance !== null || v.relation !== null || v.onLost !== null || v.until !== null)
      return false;
    if (v.place !== null)
      return (
        ['target', 'last-seen'].includes(v.place) &&
        isSafeRecordId(v.targetEntityId) &&
        v.x === null &&
        v.z === null &&
        v.surfaceId === null &&
        v.frame === null
      );
    return (
      finite(v.x) &&
      finite(v.z) &&
      v.targetEntityId === null &&
      (v.frame === 'actor'
        ? v.surfaceId === null &&
          Math.hypot(v.x!, v.z!) <= INVOCATION_LIMITS.offset &&
          Math.hypot(v.x!, v.z!) > 0
        : (v.frame === null || v.frame === 'world') &&
          (v.surfaceId === null || isSafeRecordId(v.surfaceId)))
    );
  }
  return (
    v.family === 'follow' &&
    v.x === null &&
    v.z === null &&
    v.surfaceId === null &&
    v.frame === null &&
    v.place === null &&
    isSafeRecordId(v.targetEntityId) &&
    (v.distance === null ||
      (finite(v.distance) &&
        v.distance! >= FOLLOW_RULES.minimumDistance &&
        v.distance! <= FOLLOW_RULES.maximumDistance)) &&
    (v.relation === null || ['near', 'behind', 'beside', 'left', 'right'].includes(v.relation)) &&
    (v.onLost === null || ['stop', 'last-seen'].includes(v.onLost)) &&
    (v.until === null || namedTime(world, v.until))
  );
}

/** A reachable stance near where a visible target is now; it does not track later motion. */
function approachPoint(world: WorldState, actor: Entity, target: Entity): SurfacePoint | null {
  if (canReachEntity(world, actor, target, SIMULATION_RULES.interactionRadius))
    return supportedPosition(actor);
  const route = findApproachPath(world, actor, target, SIMULATION_RULES.interactionRadius);
  if (!route || (route.status !== 'reached' && route.status !== 'pending')) return null;
  return (route.status === 'pending' ? route.request.destinations[0] : route.path.at(-1)) ?? null;
}

/** Binding creates an intention only. The ordinary command owner rechecks physics at start. */
export function bindActionInvocation(
  world: WorldState,
  actorId: string,
  id: string,
  raw: unknown,
  permittedEntityIds: readonly string[],
): Command | Outcome {
  if (!validActionInvocation(world, raw))
    return outcome(
      false,
      'invalid-invocation',
      'Navigation arguments do not match an available capability.',
    );
  const actor = Object.hasOwn(world.entities, actorId) ? world.entities[actorId] : undefined;
  if (!actor?.actor) return outcome(false, 'actor-unavailable', 'The actor is unavailable.');
  const targetId = raw.targetEntityId;
  const target =
    targetId && Object.hasOwn(world.entities, targetId) ? world.entities[targetId] : undefined;
  const visibleTarget =
    !!target &&
    targetId !== actorId &&
    permittedEntityIds.includes(targetId!) &&
    seesEntity(world, actor, target);
  if (raw.family === 'pickup') {
    const stacks =
      visibleTarget && target!.kind === 'item-pile' ? portableItems(world, target!.id) : [];
    const stack = raw.itemId ? stacks.find((item) => item.id === raw.itemId) : undefined;
    if (!stacks.length || (raw.itemId && !stack))
      return outcome(
        false,
        'target-unavailable',
        'Choose a visible pile and a portable stack that is in it.',
      );
    if (stack && raw.quantity !== null && raw.quantity > stack.quantity)
      return outcome(false, 'unavailable', `Only ${stack.quantity} are in that stack.`);
    return {
      id,
      actorId,
      type: 'pickup',
      targetId: target!.id,
      ...(raw.itemId ? { itemId: raw.itemId } : {}),
      // A stated amount is kept even when it equals the stack, so it stays exact.
      ...(raw.quantity !== null && stack ? { quantity: raw.quantity } : {}),
    };
  }
  if (raw.family === 'drop') {
    const item = itemFor(world, raw.itemId!);
    if (!item || !accessiblePossession(world, actorId, item.id))
      return outcome(false, 'target-unavailable', 'Choose something you are carrying.');
    if (raw.quantity !== null && raw.quantity > item.quantity)
      return outcome(false, 'unavailable', `You carry only ${item.quantity} in that stack.`);
    return { id, actorId, type: 'drop', itemId: item.id, quantity: raw.quantity ?? item.quantity };
  }
  if (raw.family === 'follow') {
    if (!visibleTarget || !target!.actor?.alive)
      return outcome(
        false,
        'target-unavailable',
        'Choose a currently perceived living actor to follow.',
      );
    const until = raw.until ? clockDeadline(world, raw.until) : undefined;
    return {
      id,
      actorId,
      type: 'follow',
      targetId: targetId!,
      distance: raw.distance ?? FOLLOW_RULES.defaultDistance,
      ...(raw.relation && raw.relation !== 'near' ? { relation: raw.relation } : {}),
      ...(raw.onLost === 'last-seen' ? { onLost: 'last-seen' as const } : {}),
      ...(until !== undefined ? { until } : {}),
    };
  }
  if (raw.place) {
    // A visible reference is a fresh snapshot of what is seen now; only an unseen reference
    // uses the actor's own remembered sighting. Tying a new sighting to an older record by
    // hidden entity ID would re-identify it, so neither case consults the other.
    const destination = visibleTarget
      ? approachPoint(world, actor, target!)
      : raw.place === 'last-seen'
        ? (rememberedPlace(actor.actor, targetId!)?.point ?? null)
        : null;
    if (!destination)
      return outcome(
        false,
        'target-unavailable',
        raw.place === 'last-seen' && !visibleTarget
          ? 'There is no remembered sighting of that to return to.'
          : 'Choose something currently in view that can be reached.',
      );
    return { id, actorId, type: 'move', destination: { ...destination } };
  }
  // The first spatial provider explicitly discloses starter geometry. Hidden topology needs SW's scoped provider.
  if (world.map.spatial.disclosure !== 'public')
    return outcome(
      false,
      'unsupported-navigation',
      'This geometry requires a scoped destination provider.',
    );
  if (raw.frame === 'actor') {
    // The actor's own facing is the frame, never a camera; only its current ground qualifies.
    const here = worldPosition(actor);
    const { forward, right } = headingFrame(actor.spatial.heading);
    const destination = sameSurfacePoint(
      world,
      actor,
      here.x + right.x * raw.x! + forward.x * raw.z!,
      here.z + right.z * raw.x! + forward.z * raw.z!,
    );
    return destination
      ? { id, actorId, type: 'move', destination }
      : outcome(
          false,
          'invalid-destination',
          'That spot is not on the ground you are standing on; choose a nearer point.',
        );
  }
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
