import { BASE_SPECIES } from './bodies.js';
import type { TypedRequestVocabulary } from '../../typed-requests.js';

/** How the bundled world names its things and requests in typed actions. Engine parsing reads
 * this through typedRequestVocabulary() and never restates these words.
 * docs/worlds/base/typed-requests.md */
export const BASE_TYPED_REQUESTS: TypedRequestVocabulary = {
  heatSources: ['fire', 'campfire'],
  beings: [...BASE_SPECIES, 'person', 'people', 'animal', 'being'],
  unsupported: [
    {
      verbs: ['give', 'hand', 'pass', 'offer'],
      reason:
        'Handing things to someone else is not an action in this world yet; you can drop them nearby instead.',
    },
  ],
  revisions: [
    {
      // No fuelling family exists yet (AC09): tending becomes staying by the heat source.
      verbs: ['tend', 'feed', 'fuel', 'stoke', 'keep', 'mind'],
      states: ['burning', 'going', 'lit', 'alive'],
      becomes: 'stay-by-heat',
      omitted: {
        requirement: 'keep the fire fuelled',
        reason: 'No action adds fuel to a fire in this world yet.',
      },
      withoutTime: 'Adding fuel to a fire is not an action in this world yet; nothing was started.',
    },
  ],
  examples: [
    'gather wood until I have 6',
    'follow the deer behind at 4 m',
    'cook the meat at the fire then eat it',
  ],
  placeholder: 'Pick up 2 stones, or follow the deer',
};
