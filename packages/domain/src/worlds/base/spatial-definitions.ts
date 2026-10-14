import type { BodyProfile, TerrainDefinition } from '@open-legend/spatial';
import type { EntitySpatial } from '../../spatial-state.js';

/** Starting shapes are authored here; an existing body's saved shape is authoritative.
 * Changing these presets does not retroactively resize the people already in a world.
 * docs/spatial-world.md#authored-terrain-and-bodies */
export const BASE_BODY_PROFILES = {
  person: {
    id: 'person',
    radius: 0.28,
    height: 1.75,
    eyeHeight: 1.58,
    earHeight: 1.52,
    interactionHeight: 0.85,
    maxSlope: 0.8,
  },
  hare: {
    id: 'hare',
    radius: 0.18,
    height: 0.45,
    eyeHeight: 0.35,
    earHeight: 0.4,
    interactionHeight: 0.25,
    maxSlope: 0.8,
  },
  deer: {
    id: 'deer',
    radius: 0.35,
    height: 1.55,
    eyeHeight: 1.3,
    earHeight: 1.4,
    interactionHeight: 0.8,
    maxSlope: 0.65,
  },
  bird: {
    id: 'bird',
    radius: 0.18,
    height: 0.4,
    eyeHeight: 0.3,
    earHeight: 0.3,
    interactionHeight: 0.2,
    maxSlope: 0.8,
  },
  object: {
    id: 'object',
    radius: 0.2,
    height: 0.7,
    eyeHeight: 0.4,
    earHeight: 0.4,
    interactionHeight: 0.4,
    maxSlope: 0.8,
  },
} as const satisfies Record<string, BodyProfile>;

export function baseSpatial(id: keyof typeof BASE_BODY_PROFILES): EntitySpatial {
  const body = { ...BASE_BODY_PROFILES[id] };
  return {
    body,
    inactiveBody: {
      ...body,
      height: Math.min(0.3, body.height),
      eyeHeight: 0.15,
      earHeight: 0.15,
      interactionHeight: 0.15,
    },
    heading: 0,
  };
}
export const BASE_TERRAIN: Record<string, TerrainDefinition> = {
  grass: {
    walkable: true,
    presentation: {
      style: 'ground',
      color: '#6d7960',
      overviewColor: 'color-mix(in srgb, var(--accent) 22%, var(--surface))',
    },
  },
  sand: {
    walkable: true,
    presentation: {
      style: 'earth',
      color: '#c2b78b',
      overviewColor: 'color-mix(in srgb, var(--food) 28%, var(--surface))',
    },
  },
  water: {
    walkable: false,
    presentation: {
      style: 'liquid',
      color: '#46736b',
      overviewColor: 'color-mix(in srgb, var(--energy) 40%, var(--canvas))',
      patternColors: ['#416b63', '#4f7d70', '#587e6e', '#739785'],
      bankColors: ['#c2b78b', '#6d7960'],
      glintColors: ['#a9bd9a', '#729a86'],
    },
  },
  rock: {
    walkable: false,
    solid: {
      height: 2,
      movement: true,
      sight: true,
      acousticTransmission: 0.15,
      material: 'stone',
      name: 'Rock top',
    },
    presentation: {
      style: 'ground',
      color: '#6d7960',
      overviewColor: 'color-mix(in srgb, var(--ink-faint) 45%, var(--surface))',
    },
  },
};
