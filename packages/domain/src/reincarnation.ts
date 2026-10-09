import { equippedItems } from './equipment.js';
import { canStand, distance3D, surfaceHeight, type SurfacePoint } from '@open-legend/spatial';
import { bodyPolicy, bodyNarration } from './body-policy.js';
import { validNameTemplate } from '@open-legend/language';
import { nextId, nextRandom } from './data.js';
import { seedAgency, cancelPlan, discardSuspended } from './agency.js';
import { leaveConversation } from './conversations.js';
import { recordSemanticChange } from './dependencies.js';
import { rootMembershipChanged, worldRootEntities } from './entity-index.js';
import { emit, outcome } from './events.js';
import { directChildIds, itemFor, moveLot, setItemQuantity, unequipLot } from './objects.js';
import { releaseInvocationResources, availableItemQuantity } from './resource-claims.js';
import {
  bodyProfile,
  setSpatialPosition,
  spatialMap,
  supportedPosition,
  worldPosition,
} from './spatial-state.js';
import { attributeDefinition, setAttribute } from './world-modules.js';
import { reconcileBody } from './living.js';
import { setBodyHealth } from './body-state.js';
import { canReachEntity, nearbyEntities } from './spatial.js';
import { activelyParticipates } from './participation-state.js';
import { isSafeRecordId } from './records.js';
import type { Entity, Outcome, WorldEvent, WorldState } from './types.js';

export interface DeathScar {
  id: string;
  name: string;
  description: string;
  movementFactor: number;
  outgoingInjuryFactor: number;
  incomingInjuryFactor: number;
}
/** Optional installed world law; the engine supplies custody and replacement-body execution. */
export interface ReincarnationPolicy {
  restKind: Entity['kind'];
  radius: number;
  retainedTypeFraction: number;
  spawnOffset: number;
  fillAttributes: string[];
  /** An empty authored list disables death scars and their random selection. */
  scars: DeathScar[];
  /** Required for configured scars; a scar-free world needs no treatment dependencies. */
  treatment: { materialId: string; quantity: number; workSeconds: number; reach: number } | null;
  arrivalText: string;
  arrivalNarration: string;
  continueLabel: string;
  deathText: string;
  retainedLabel: string;
  lostLabel: string;
  treatmentLabel: string;
  treatmentText: string;
}
export interface PendingDeath {
  at: number;
  position: import('./types.js').Position;
  corpseId: string;
  retained: Array<{ name: string; quantity: number }>;
  left: Array<{ name: string; quantity: number }>;
}
export function reincarnationPolicy(world: WorldState): ReincarnationPolicy | null {
  return bodyPolicy(world)?.reincarnation ?? null;
}
export function scarFactor(
  world: WorldState,
  entity: Entity,
  effect: 'movementFactor' | 'outgoingInjuryFactor' | 'incomingInjuryFactor',
): number {
  return (reincarnationPolicy(world)?.scars ?? []).reduce(
    (factor, scar) => factor * (entity.actor?.scars?.[scar.id] ? scar[effect] : 1),
    1,
  );
}

/** Called only by the body owner after a real player death. Each lot is visited once;
 * quantities never become individual lottery entries. Bags count independently of contents.
 * docs/worlds/base/lifecycle-and-protection.md#accepted-player-danger-and-death-revision */
export function separateDeadLife(world: WorldState, entity: Entity, events: WorldEvent[]): void {
  const policy = reincarnationPolicy(world),
    actor = entity.actor!;
  if (!policy || actor.controller !== 'player' || actor.pendingDeath) return;
  if (actor.action) releaseInvocationResources(world, actor.action.id);
  cancelPlan(world, actor, entity.id);
  discardSuspended(world, actor, entity.id);
  leaveConversation(world, entity.id, 'disconnect');
  actor.action = null;
  for (const item of equippedItems(world, entity.id)) unequipLot(world, entity.id, item.id);
  delete actor.combatReadyAt;
  const corpseId = nextId(world, 'body');
  const body = actor.body!;
  const corpse: Entity = {
    id: corpseId,
    name: entity.name,
    nameForm: entity.nameForm,
    kind: 'remains',
    appearance: entity.appearance,
    spatial: { ...entity.spatial },
    placement: entity.placement && { ...entity.placement },
    actor: {
      controller: 'native',
      species: actor.species,
      capabilities: { cognition: false, memory: false, innerWorld: false, speech: false },
      body: {
        ...body,
        conditions: { ...body.conditions },
        susceptibility: { ...body.susceptibility },
        harvestYield: [],
      },
      health: 0,
      alive: false,
      incapacitated: false,
      bornAt: actor.bornAt,
      physicalLife: actor.physicalLife ?? 0,
      action: null,
      planGeneration: 0,
      agency: seedAgency(),
    },
    remains: { ...entity.remains!, sourceId: entity.id, yields: [] },
  };
  delete corpse.spatial.flight;
  world.entities[corpseId] = corpse;
  rootMembershipChanged(world, corpseId);
  // Snapshot the existing indexed custody tree before moving anything. Deepest first lets
  // a retained child leave a lost bag without exceeding another bag's capacity or depth.
  const lots: Array<{ id: string; parent: string; type: string }> = [];
  const pending = [entity.id];
  while (pending.length) {
    const parent = pending.pop()!;
    for (const id of directChildIds(world, parent)) {
      const item = itemFor(world, id)!;
      lots.push({ id, parent, type: item.definitionId });
      if (world.entities[id]?.container) pending.push(id);
    }
  }
  const types = [...new Set(lots.map((lot) => lot.type))].sort();
  const retained = new Set<string>();
  for (let i = 0; i < Math.floor(types.length * policy.retainedTypeFraction); i++) {
    const chosen = i + Math.floor(nextRandom(world) * (types.length - i));
    [types[i], types[chosen]] = [types[chosen]!, types[i]!];
    retained.add(types[i]!);
  }
  const totals = new Map<string, number>();
  for (const lot of lots)
    totals.set(lot.type, (totals.get(lot.type) ?? 0) + itemFor(world, lot.id)!.quantity);
  const summary = (keep: boolean) =>
    [...totals]
      .filter(([id]) => retained.has(id) === keep)
      .map(([id, quantity]) => ({ name: world.itemDefinitions[id]!.name, quantity }));
  const decisions = new Map(lots.map((lot) => [lot.id, retained.has(lot.type)]));
  for (let i = lots.length - 1; i >= 0; i--) {
    const lot = lots[i]!;
    const keep = decisions.get(lot.id)!;
    if (lot.parent === entity.id ? !keep : decisions.get(lot.parent) !== keep)
      moveLot(
        world,
        lot.id,
        keep ? entity.id : corpseId,
        itemFor(world, lot.id)!.quantity,
        'death',
        false,
      );
  }
  const scar = policy.scars.length
    ? policy.scars[Math.floor(nextRandom(world) * policy.scars.length)]
    : undefined;
  if (scar) {
    const scars = (actor.scars ??= {});
    if (!Number.isSafeInteger((scars[scar.id] ?? 0) + 1)) throw new Error('Scar count exhausted.');
    scars[scar.id] = (scars[scar.id] ?? 0) + 1;
  }
  actor.pendingDeath = {
    at: world.simTime,
    position: { ...worldPosition(entity) },
    corpseId,
    retained: summary(true),
    left: summary(false),
  };
  delete entity.remains;
  rootMembershipChanged(world, entity.id);
  emit(
    world,
    events,
    'player-death',
    policy.deathText,
    entity,
    undefined,
    {
      corpseId,
      ...(scar ? { scarId: scar.id } : {}),
      retainedTypes: retained.size,
      lostTypes: types.length - retained.size,
    },
    'private',
  );
}

function spawnCandidates(world: WorldState, entity: Entity, rest: Entity): SurfacePoint[] {
  const policy = reincarnationPolicy(world)!,
    support = supportedPosition(rest);
  if (!support) return [];
  const map = spatialMap(world),
    surface = map.spatial.surfaces.find((s) => s.id === support.surfaceId);
  if (!surface) return [];
  const nearby = nearbyEntities(world, support, policy.spawnOffset + 3).filter(
    (other) =>
      other.id !== entity.id &&
      other.actor?.alive &&
      activelyParticipates(other) &&
      distance3D(worldPosition(other), support) <= policy.spawnOffset + 3,
  );
  return Array.from({ length: 8 }, (_, i) => {
    const x = support.x + Math.cos((i * Math.PI) / 4) * policy.spawnOffset,
      z = support.z + Math.sin((i * Math.PI) / 4) * policy.spawnOffset;
    return { ...support, x, z, y: surfaceHeight(surface, x, z) };
  }).filter(
    (point) =>
      canStand(map, point, bodyProfile(entity)) &&
      !nearby.some(
        (other) =>
          distance3D(worldPosition(other), point) <
          (other.threat ? other.threat.policy.attackRange + 0.5 : 0.75),
      ),
  );
}
/** Player intention commits a new physical life; reconnect alone never resurrects a body. */
export function respawnPlayer(world: WorldState, entity: Entity, events: WorldEvent[]): Outcome {
  const policy = reincarnationPolicy(world),
    actor = entity.actor!,
    death = actor.pendingDeath;
  if (!policy || !death || actor.alive)
    return outcome(false, 'respawn-unavailable', 'There is no lost life to continue.');
  if (actor.participation?.phase !== undefined && actor.participation.phase !== 'active')
    return outcome(false, 'inactive', 'Return to the world before continuing.');
  const rests = worldRootEntities(world, true)
    .filter((rest) => rest.kind === policy.restKind)
    .map((rest) => ({ rest, distance: distance3D(death.position, worldPosition(rest)) }))
    .sort((a, b) => a.distance - b.distance || a.rest.id.localeCompare(b.rest.id));
  // Rare replacement-body work, not a tick scan. Test nearest candidates lazily once no
  // in-range rest is usable; a larger world does not build every camp's spawn geometry.
  let choices = rests
    .filter((entry) => entry.distance <= policy.radius)
    .map((entry) => ({ ...entry, points: spawnCandidates(world, entity, entry.rest) }))
    .filter((entry) => entry.points.length);
  if (!choices.length) {
    for (const entry of rests) {
      const points = spawnCandidates(world, entity, entry.rest);
      if (points.length) {
        choices = [{ ...entry, points }];
        break;
      }
    }
  }
  if (!choices.length)
    return outcome(
      false,
      'respawn-unavailable',
      'No usable rest spot is available. Your belongings and lost body remain saved.',
    );
  if (!Number.isSafeInteger((actor.physicalLife ?? 0) + 1))
    throw new Error('Physical life exhausted.');
  const choice =
    choices[choices.length === 1 ? 0 : Math.floor(nextRandom(world) * choices.length)]!;
  const point = choice.points[Math.floor(nextRandom(world) * choice.points.length)]!;
  actor.physicalLife = (actor.physicalLife ?? 0) + 1;
  actor.alive = true;
  actor.incapacitated = false;
  actor.body!.conditions = { injury: 0, wetness: 0, burning: 0 };
  setBodyHealth(actor, actor.body!.maxHealth);
  actor.action = null;
  delete actor.combatReadyAt;
  delete actor.pendingDeath;
  delete entity.spatial.flight;
  delete entity.spatial.fallVelocity;
  setSpatialPosition(world, entity, point, point.surfaceId);
  for (const id of policy.fillAttributes) {
    const definition = attributeDefinition(world, id)!;
    if (definition.schema.kind === 'number')
      setAttribute(world, entity, definition, definition.schema.max, events);
  }
  reconcileBody(world, entity, events, 'respawn');
  rootMembershipChanged(world, entity.id);
  recordSemanticChange(world, { kind: 'state', entityId: entity.id, field: 'body' });
  emit(
    world,
    events,
    'respawn',
    bodyNarration(policy.arrivalNarration, entity),
    entity,
    undefined,
    { significant: true },
  );
  return outcome(true, 'respawned', policy.arrivalText);
}

export function scarTreatmentProblem(
  world: WorldState,
  actor: Entity,
  scarId: string,
  restId: string,
): string | null {
  const policy = reincarnationPolicy(world),
    treatment = policy?.treatment,
    rest = world.entities[restId];
  if (
    !policy ||
    !treatment ||
    !actor.actor?.scars?.[scarId] ||
    !policy.scars.some((scar) => scar.id === scarId)
  )
    return 'That scar no longer needs treatment.';
  if (rest?.kind !== policy.restKind || !canReachEntity(world, actor, rest, treatment.reach))
    return 'Stay beside a rest spot to treat this scar.';
  if (
    ![...directChildIds(world, actor.id)].some((id) => {
      const item = itemFor(world, id)!;
      return (
        item.definitionId === treatment.materialId &&
        availableItemQuantity(world, id) >= treatment.quantity
      );
    })
  )
    return `Treatment needs ${treatment.quantity} ${world.itemDefinitions[treatment.materialId]?.name ?? 'material'} in your carried inventory.`;
  return null;
}
export function completeScarTreatment(
  world: WorldState,
  actor: Entity,
  scarId: string,
  restId: string,
  events: WorldEvent[],
): Outcome {
  const problem = scarTreatmentProblem(world, actor, scarId, restId);
  if (problem) return outcome(false, 'treatment-unavailable', problem);
  const policy = reincarnationPolicy(world)!;
  const treatment = policy.treatment!;
  const id = [...directChildIds(world, actor.id)].find((id) => {
    const item = itemFor(world, id)!;
    return (
      item.definitionId === treatment.materialId &&
      availableItemQuantity(world, id) >= treatment.quantity
    );
  })!;
  setItemQuantity(world, id, itemFor(world, id)!.quantity - treatment.quantity, 'scar-treatment');
  const scars = actor.actor!.scars!;
  if (--scars[scarId]! === 0) delete scars[scarId];
  reconcileBody(world, actor, events, 'scar-treatment');
  emit(world, events, 'scar-treated', policy.treatmentText, actor, undefined, { scarId });
  return outcome(true, 'completed', policy.treatmentText);
}

export function validateReincarnationPolicy(policy: ReincarnationPolicy | null): void {
  if (!policy) return;
  const treatment = policy.treatment;
  if (
    !['campfire', 'resource', 'item-pile'].includes(policy.restKind) ||
    !Number.isFinite(policy.retainedTypeFraction) ||
    policy.retainedTypeFraction < 0 ||
    policy.retainedTypeFraction > 1 ||
    ![policy.radius, policy.spawnOffset].every((value) => Number.isFinite(value) && value > 0) ||
    (treatment === null
      ? policy.scars.length > 0
      : !treatment ||
        ![treatment.workSeconds, treatment.reach].every(
          (value) => Number.isFinite(value) && value > 0,
        ) ||
        !Number.isSafeInteger(treatment.quantity) ||
        treatment.quantity <= 0 ||
        !isSafeRecordId(treatment.materialId)) ||
    policy.scars.length > 16 ||
    new Set(policy.scars.map((scar) => scar.id)).size !== policy.scars.length ||
    policy.scars.some(
      (scar) =>
        !isSafeRecordId(scar.id) ||
        !scar.name ||
        !scar.description ||
        ![scar.movementFactor, scar.outgoingInjuryFactor, scar.incomingInjuryFactor].every(
          (factor) => Number.isFinite(factor) && factor > 0 && factor <= 4,
        ),
    ) ||
    ![
      policy.arrivalText,
      policy.arrivalNarration,
      policy.continueLabel,
      policy.deathText,
      policy.retainedLabel,
      policy.lostLabel,
      ...(treatment ? [policy.treatmentLabel, policy.treatmentText] : []),
    ].every((text) => typeof text === 'string' && text.trim().length > 0 && text.length <= 1024) ||
    !validNameTemplate(policy.arrivalNarration, ['subject'])
  )
    throw new Error('Invalid installed reincarnation policy.');
}
export function validateReincarnation(world: WorldState): void {
  const policy = reincarnationPolicy(world);
  for (const entity of Object.values(world.entities)) {
    const actor = entity.actor;
    if (!actor) continue;
    if (
      actor.physicalLife !== undefined &&
      (!Number.isSafeInteger(actor.physicalLife) || actor.physicalLife < 0)
    )
      throw new Error('Invalid physical life.');
    if (
      actor.scars &&
      (!policy ||
        Object.entries(actor.scars).some(
          ([id, count]) =>
            !policy.scars.some((scar) => scar.id === id) ||
            !Number.isSafeInteger(count) ||
            count <= 0,
        ))
    )
      throw new Error('Invalid saved scars.');
    const death = actor.pendingDeath;
    if (
      death &&
      (!policy ||
        actor.controller !== 'player' ||
        actor.alive ||
        actor.action ||
        entity.remains ||
        !Number.isFinite(death.at) ||
        death.at < 0 ||
        death.at > world.simTime ||
        ![death.position.x, death.position.y, death.position.z].every(Number.isFinite) ||
        ![death.retained, death.left].every(
          (items) =>
            Array.isArray(items) &&
            items.every(
              (item) =>
                typeof item.name === 'string' &&
                item.name.length > 0 &&
                item.name.length <= 256 &&
                Number.isSafeInteger(item.quantity) &&
                item.quantity > 0,
            ),
        ) ||
        world.entities[death.corpseId]?.remains?.sourceId !== entity.id)
    )
      throw new Error('Invalid pending player death.');
  }
}
