import type { PlaceDefinition } from '../../places.js';

export const BASE_PLACES: Readonly<Record<string, PlaceDefinition>> = {
  'camp-hearth': {
    id: 'camp-hearth',
    revision: 1,
    label: 'Camp hearth',
    description:
      'A campfire stands in this clearing. A lit fire can cook raw meat; inspect the fire before choosing to cook or add fuel.',
    landmarkId: 'campfire',
    point: { x: 11, y: 0, z: 11, surfaceId: 'terrain' },
    exposure: { kind: 'arrive-and-see', radius: 4, importance: 8 },
    mechanismFields: { story_importance: { story_importance: 8 } },
  },
  'riverside-reeds': {
    id: 'riverside-reeds',
    revision: 1,
    label: 'Riverside reeds',
    description:
      'Reeds grow here. Gather their fibers to prepare material for cord and crafting; inspect the reeds for their remaining supply.',
    landmarkId: 'reeds',
    point: { x: 5, y: 0, z: 12, surfaceId: 'terrain' },
    exposure: { kind: 'arrive-and-see', radius: 2, importance: 8 },
    mechanismFields: { story_importance: { story_importance: 8 } },
  },
};
