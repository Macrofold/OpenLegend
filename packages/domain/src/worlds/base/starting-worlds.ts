import type { WorldCreationAccounts } from '../../invention-attribution.js';
import type { InitialWorldPreparation } from '../../world-creation.js';
import { createReservoirDemo, createTouchDemo } from '../../world-presets.js';
import {
  BASE_OPENING_IDENTITY_KEYS,
  buildBaseInitialWorld,
  createBaseOpeningCandidate,
} from './initial-opening.js';
import { createWorld, PLAYER_ID, NPC_ID } from './world.js';
import { BASE_MAIN_ARTWORK } from './main-opening.js';

export const BASE_STARTING_WORLD_PRESETS = [
  'wilderness',
  'solo',
  'reservoir-demo',
  'touch-demo',
] as const;

export type BaseStartingWorldPreset = (typeof BASE_STARTING_WORLD_PRESETS)[number];

/** Development starts reuse the same authored openings as interactive world creation. */
export function createBaseStartingWorld(
  preset: BaseStartingWorldPreset,
  seed: number,
  accounts: WorldCreationAccounts,
  worldId?: string,
): Pick<InitialWorldPreparation, 'world' | 'useInstalledArtwork' | 'installAppearanceFamilies'> {
  switch (preset) {
    case 'wilderness':
      return {
        world: createWorld(
          seed,
          accounts,
          worldId ? { worldId, playerId: PLAYER_ID, residentId: NPC_ID } : undefined,
        ),
        ...BASE_MAIN_ARTWORK,
      };
    case 'reservoir-demo':
      return { world: createReservoirDemo(seed, accounts, worldId) };
    case 'touch-demo':
      return { world: createTouchDemo(seed, accounts, worldId) };
    case 'solo': {
      const normalizedSeed = Number.isInteger(seed) ? seed >>> 0 : 73;
      const candidate = createBaseOpeningCandidate(
        {
          worldId: worldId ?? `solo-${normalizedSeed}`,
          playerId: PLAYER_ID,
          objects: Object.fromEntries(
            BASE_OPENING_IDENTITY_KEYS.map((key) => [key, `solo-${key}`]),
          ),
        },
        'solitary',
        normalizedSeed,
      );
      return buildBaseInitialWorld(candidate, accounts);
    }
  }
}
