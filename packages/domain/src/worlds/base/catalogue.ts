import type { GodSpawnType } from '../../types.js';

export const GOD_SPAWN_OPTIONS: ReadonlyArray<{
  id: GodSpawnType;
  label: string;
  category: 'Actors' | 'Environment';
}> = [
  { id: 'person', label: 'Person', category: 'Actors' },
  { id: 'banked-campfire', label: 'Banked campfire', category: 'Environment' },
  { id: 'berry-bush', label: 'Berry bush', category: 'Environment' },
  { id: 'berry-thicket', label: 'Berry thicket', category: 'Environment' },
  { id: 'deer', label: 'Deer', category: 'Actors' },
  { id: 'dry-grass-fibers', label: 'Dry grass fibers', category: 'Environment' },
  { id: 'fallen-branches', label: 'Fallen branches', category: 'Environment' },
  { id: 'hare', label: 'Hare', category: 'Actors' },
  { id: 'river-reeds', label: 'River reeds', category: 'Environment' },
  { id: 'river-stones', label: 'River stones', category: 'Environment' },
];
