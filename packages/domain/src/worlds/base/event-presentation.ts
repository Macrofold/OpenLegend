import type { EventPresentation, EventPresentationPolicy } from '../../event-presentation.js';

const types: Record<string, EventPresentation> = {};
function register(
  category: EventPresentation['category'],
  icon: string,
  names: string[],
  displayToPlayer = false,
) {
  for (const name of names) types[name] = { category, icon, displayToPlayer };
}
register('speech', 'ui.speech', ['speech', 'expression'], true);
register(
  'actions',
  'action.craft',
  [
    'crafted',
    'construction-phase',
    'cover-lowered',
    'method-learned',
    'taught',
    'equipped',
    'prepared',
    'declaration-admitted',
    'competence-improved',
    'coaching-requested',
    'coaching-accepted',
    'coaching-completed',
    'coaching-ended',
  ],
  true,
);
register(
  'actions',
  'action.gather',
  [
    'gathered',
    'harvested',
    'items-picked-up',
    'items-dropped',
    'items-transferred',
    'items-arranged',
    'replenished',
    'item-offered',
    'offer-accepted',
    'offer-declined',
    'offer-withdrawn',
    'offer-expired',
    'offer-lapsed',
  ],
  true,
);
register('actions', 'action.eat', ['ate', 'cooked', 'cast-completed'], true);
register(
  'actions',
  'action.fire',
  ['fire-lit', 'fire-out', 'fire-extinguished', 'fire-fueled'],
  true,
);
register('actions', 'action.rest', ['rested', 'recovered'], true);
register('actions', 'action.walk', ['action-started', 'action-stopped', 'moved', 'outing']);
register(
  'conflict',
  'action.hunt',
  [
    'struck',
    'shot',
    'shot-released',
    'projectile-contact',
    'death',
    'incapacitated',
    'guarded',
    'evasion-ended',
    'attack-preparation',
    'aim-ready',
    'shot-ended',
    'projectile-ended',
    'threat-withdrew',
    'threat-stopped',
    'player-death',
  ],
  true,
);
register(
  'body',
  'ui.character',
  [
    'attribute-changed',
    'attribute-concern',
    'body-condition',
    'body-effect',
    'state-changed',
    'contact',
    'scar-treated',
  ],
  true,
);
register('observations', 'ui.inview', ['encounter', 'weather-cue', 'activity-observed']);
// Retain routine evidence, but never turn a new event family into player-facing noise by default.
register('observations', 'ui.inview', ['takeoff', 'landed', 'departed', 'returned', 'respawn']);

export const BASE_EVENT_PRESENTATION: EventPresentationPolicy = {
  types,
  fallback: { category: 'observations', icon: 'ui.inview', displayToPlayer: false },
};
