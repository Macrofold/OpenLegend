import firstPlayable from './config/first-playable.generated.json' with { type: 'json' };
import { baseOpeningContentManifest } from './opening-content.js';
import type { PreparedBaseMaterialWorld } from './first-playable-config.js';
import { entityGet, entityValues } from '../../entity-collection.js';
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
  seed = firstPlayable.opening.seed,
): BaseMainWorldCandidate {
  const candidate = {
    profile: { id: BASE_OPENING_PROFILE.id, version: BASE_OPENING_PROFILE.version },
    worldId: identities.worldId,
    opening: 'main' as const,
    seed,
    rngState: seed || 0x6d2b79f5,
    title: 'Main world',
    premise:
      'Arrive empty handed at the wayside clearing. Gather food and materials, make useful tools, choose company and explore distant encounters.',
    playerId: identities.ids['player'],
    residentId: identities.ids['resident'],
  };
  validateBaseMainWorldCandidate(candidate);
  return candidate;
}

/** Both ordinary and interactive Main request this deployment's approved artwork. */
export const BASE_MAIN_ARTWORK = { useInstalledArtwork: true } as const;

export function buildBaseMainWorld(
  candidate: BaseMainWorldCandidate,
  accounts: WorldCreationAccounts,
  prepared: PreparedBaseMaterialWorld = firstPlayable as unknown as PreparedBaseMaterialWorld,
) {
  validateBaseMainWorldCandidate(candidate);
  const world = createWorld(candidate.seed, accounts, candidate, prepared);
  // Detect a collision with a fixed authored person before any publication or grant.
  if (
    entityGet(world.entities, candidate.playerId)?.kind !== 'player' ||
    entityGet(world.entities, candidate.residentId)?.name !== 'Ada'
  )
    throw new Error('The starting person identity collides with an authored scenario.');
  prepareBaseInitialWorldState(world);
  return {
    world,
    ...BASE_MAIN_ARTWORK,
    ...(prepared
      ? {
          contentManifest: baseOpeningContentManifest(
            world,
            prepared.opening.content,
            prepared.sources,
          ),
        }
      : {}),
    accountRoles: [
      ...accounts.creatorAccountIds.map((accountId) => ({
        accountId,
        actorId: null,
        role: 'creator' as const,
      })),
      { accountId: accounts.playerAccountId, actorId: candidate.playerId, role: 'player' as const },
    ],
    constructionSeeds: baseWorldInitialConstructionSeeds(world, candidate.playerId, prepared),
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
  for (const entity of entityValues(world.entities)) {
    if (entity.placement?.mode !== 'world') continue;
    const position = supportedPosition(entity);
    if (!position) continue;
    const common = {
      id: entity.id,
      name: entity.name,
      position,
      supportSurfaceId: position.surfaceId,
    };
    if (entity.resource)
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
      opening: 'main',
      player: { id: candidate.playerId },
      scene,
      harsh: false,
    },
    world,
    routes,
  );
  const activity = BASE_OPENING_PROFILE.openings.find((opening) => opening.id === 'main')!;
  return { ...checked, activity: activity.activity, payoff: activity.payoff };
}
