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
  'mending-clearing': {
    id: 'mending-clearing',
    revision: 1,
    label: 'Mending Clearing',
    description:
      'A small clearing along the camp-side meadow before the Reed-side Store, marked by a low mending stone and a ground work spot.',
    landmarkId: 'mending-clearing-spot',
    point: { x: 11, y: 0, z: 18, surfaceId: 'terrain' },
    exposure: { kind: 'arrive-and-see', radius: 2.2, importance: 7 },
    mechanismFields: { story_importance: { story_importance: 7 } },
  },
  'reed-side-store': {
    id: 'reed-side-store',
    revision: 1,
    label: 'Reed-side Store',
    description:
      'A dry storage spot beside a split stone near the river reeds along the safe camp-side meadow.',
    landmarkId: 'reed-side-store-pile',
    point: { x: 11, y: 0, z: 22.5, surfaceId: 'terrain' },
    exposure: { kind: 'arrive-and-see', radius: 2.2, importance: 8 },
    mechanismFields: { story_importance: { story_importance: 8 } },
  },
};
