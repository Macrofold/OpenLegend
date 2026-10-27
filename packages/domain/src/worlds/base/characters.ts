import type { CharacterTrait } from '../../types.js';

import people from './config/people.generated.json' with { type: 'json' };

/** One authored source; constructing a person copies identity into their mutable life.
 * docs/worlds/base/first-playable-people.md#authored-fields-and-assembly */
export const BASE_PEOPLE = people;
export const ADA_IDENTITY = BASE_PEOPLE.ada.identity;
export const KEST_IDENTITY = {
  traits: [] as CharacterTrait[],
  personality:
    'Proud, blunt and possessive; values self-reliance and resents taking another person’s work for granted.',
  backstory:
    'I am Kest. I formerly traveled with a small supply caravan. The supplies at the Broken Watchpost are the remaining security from that life. I settled here with Orin, who traveled with me after losing a home. I have experience with ordinary hand tools and a shield.',
  initialGoals: ['Keep our watchpost supplies available for Orin and me.'],
};
export const ORIN_IDENTITY = {
  traits: [] as CharacterTrait[],
  personality:
    'Independent, practical and proud of skill with a bow; dislikes feeling trapped and values a chance to begin again.',
  backstory:
    'I am Orin. I traveled with Kest after losing my previous home. We keep our equipment and supplies at the Broken Watchpost. I am proud of using a bow and of practical skills. The building matters less to me than our equipment and the possibility of making a life here.',
  initialGoals: ['Keep our equipment and our chance to make a life here.'],
};
