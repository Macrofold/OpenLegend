import type { GodSpawnType } from '../../types.js';

export const GOD_SPAWN_OPTIONS: ReadonlyArray<{
  id: GodSpawnType;
  label: string;
  category: 'Actors' | 'Environment';
  icon?: string;
}> = [
  { id: 'person', label: 'Person', category: 'Actors', icon: 'ui.character' },
  { id: 'banked-campfire', label: 'Banked campfire', category: 'Environment', icon: 'action.fire' },
  { id: 'berry-bush', label: 'Berry bush', category: 'Environment', icon: 'resource.berry' },
  { id: 'berry-thicket', label: 'Berry thicket', category: 'Environment', icon: 'resource.berry' },
  { id: 'deer', label: 'Deer', category: 'Actors', icon: 'creature.deer' },
  {
    id: 'dry-grass-fibers',
    label: 'Dry grass fibers',
    category: 'Environment',
    icon: 'resource.fiber',
  },
  {
    id: 'fallen-branches',
    label: 'Fallen branches',
    category: 'Environment',
    icon: 'resource.branch',
  },
  { id: 'hare', label: 'Hare', category: 'Actors', icon: 'creature.hare' },
  { id: 'river-reeds', label: 'River reeds', category: 'Environment', icon: 'resource.reed' },
  { id: 'river-stones', label: 'River stones', category: 'Environment', icon: 'resource.stone' },
];
