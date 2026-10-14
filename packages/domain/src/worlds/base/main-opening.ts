import { hasRecordFields, isSafeRecordId } from '../../records.js';
import { definitionPin } from '../../world-modules.js';
import { supportedPosition } from '../../spatial-state.js';
import type { WorldCreationAccounts } from '../../invention-attribution.js';
import type { OpeningReadiness, WorldOpeningIdentities } from '../../world-creation.js';
import type { NavigationResult } from '@open-legend/spatial';
import type { WorldState } from '../../types.js';
import { createWorld, baseWorldInitialConstructionSeeds } from './world.js';
import {
  BASE_OPENING_PROFILE,
  prepareBaseInitialWorldState,
  type BaseOpeningScene,
} from './initial-opening.js';
import { checkBaseOpeningReadiness } from './opening-readiness.js';

/** A finite authored template, not a snapshot or a second copy of scenario content. */
export interface BaseMainWorldCandidate {
  profile: { id: string; version: number };
  worldId: string;
  opening: 'main';
  seed: number;
  rngState: number;
  title: string;
  premise: string;
  playerId: string;
  residentId: string;
}

export function validateBaseMainWorldCandidate(
  value: unknown,
): asserts value is BaseMainWorldCandidate {
  if (
    !hasRecordFields(value, [
      'profile',
      'worldId',
      'opening',
      'seed',
      'rngState',
      'title',
      'premise',
      'playerId',
      'residentId',
    ]) ||
    !hasRecordFields(value.profile, ['id', 'version']) ||
    value.profile.id !== BASE_OPENING_PROFILE.id ||
    value.profile.version !== BASE_OPENING_PROFILE.version ||
    value.opening !== 'main' ||
    ![value.worldId, value.playerId, value.residentId].every(isSafeRecordId) ||
    value.playerId === value.residentId ||
    typeof value.seed !== 'number' ||
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 0xffffffff ||
    value.rngState !== (value.seed || 0x6d2b79f5) ||
    typeof value.title !== 'string' ||
    !value.title.trim() ||
    Array.from(value.title).length > BASE_OPENING_PROFILE.limits.nameCharacters ||
    typeof value.premise !== 'string' ||
    Array.from(value.premise).length > BASE_OPENING_PROFILE.limits.textCharacters
  )
    throw new Error('Unsupported main-world template, identity or authored description.');
}

export function createBaseMainWorldCandidate(
  identities: WorldOpeningIdentities,
): BaseMainWorldCandidate {
  const candidate = {
    profile: { id: BASE_OPENING_PROFILE.id, version: BASE_OPENING_PROFILE.version },
    worldId: identities.worldId,
    opening: 'main' as const,
    seed: 73,
    rngState: 73,
    title: 'Main world',
    premise:
      'Begin at the wilderness camp and discover its people, resources and distant encounters.',
    playerId: identities.ids['player'],
    residentId: identities.ids['resident'],
  };
  validateBaseMainWorldCandidate(candidate);
  return candidate;
}

export function buildBaseMainWorld(
  candidate: BaseMainWorldCandidate,
  accounts: WorldCreationAccounts,
) {
  validateBaseMainWorldCandidate(candidate);
  const world = createWorld(candidate.seed, accounts, candidate);
  // Detect a collision with a fixed authored person before any publication or grant.
  if (
    world.entities[candidate.playerId]?.kind !== 'player' ||
    world.entities[candidate.residentId]?.name !== 'Ada'
  )
    throw new Error('The starting person identity collides with an authored scenario.');
  prepareBaseInitialWorldState(world);
  return {
    world,
    accountRoles: [
      ...accounts.creatorAccountIds.map((accountId) => ({
        accountId,
        actorId: null,
        role: 'creator' as const,
      })),
      { accountId: accounts.playerAccountId, actorId: candidate.playerId, role: 'player' as const },
    ],
    constructionSeeds: baseWorldInitialConstructionSeeds(world, candidate.playerId),
  };
}

export function checkBaseMainWorldReadiness(
  candidate: BaseMainWorldCandidate,
  world: WorldState,
  routes?: ReadonlyMap<string, NavigationResult>,
): OpeningReadiness {
  // Read the actual constructed locality once; never import a source world's data
  // or duplicate the ordinary initializer's placements, supplies or recipes.
  const scene: BaseOpeningScene[] = [];
  for (const entity of Object.values(world.entities)) {
    if (entity.placement?.mode !== 'world') continue;
    const position = supportedPosition(entity);
    if (!position) continue;
    const common = {
      id: entity.id,
      name: entity.name,
      position,
      supportSurfaceId: position.surfaceId,
    };
    if (
      entity.resource &&
      ['raw_fiber', 'wood', 'stone', 'berries'].includes(entity.resource.definitionId)
    )
      scene.push({
        ...common,
        kind: 'resource',
        definition: definitionPin(world.itemDefinitions[entity.resource.definitionId]!),
        quantity: entity.resource.quantity,
      });
    else if (entity.heat)
      scene.push({
        ...common,
        kind: 'fire',
        fuelSeconds: entity.heat.lit ? entity.heat.fuelSeconds : 0,
      });
    else if (entity.actor?.species === 'hare') scene.push({ ...common, kind: 'hare' });
  }
  const checked = checkBaseOpeningReadiness(
    {
      opening: 'inhabited',
      player: { id: candidate.playerId },
      scene,
      // The established main world starts without prepared food or stocked berries.
      // Keep that deliberate survival circumstance; advertise its actual food work.
      harsh: true,
    },
    world,
    routes,
  );
  const activity = BASE_OPENING_PROFILE.openings.find((opening) => opening.id === 'main')!;
  return { ...checked, activity: activity.activity, payoff: activity.payoff };
}
