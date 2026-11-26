import { nativeCommandSupported } from '../../activity-hosts.js';
import type { WorldState } from '../../types.js';
import type { ActivityDefinitionScope } from '../../activity-hosts.js';
import { BASE_SPECIES } from './bodies.js';
import type { TypedRequestVocabulary } from '../../typed-requests.js';

export const BASE_TYPED_NOUNS = {
  heatSources: ['fire', 'campfire'],
  beings: [...BASE_SPECIES, 'person', 'people', 'animal', 'being'],
} as const;

/** How the bundled world names its things and requests in typed actions. Engine parsing reads
 * this through typedRequestVocabulary() and never restates these words.
 * docs/worlds/base/typed-requests.md */
export function baseTypedRequestVocabulary(
  world: ActivityDefinitionScope & Pick<WorldState, 'profile'>,
): TypedRequestVocabulary {
  return {
    ...BASE_TYPED_NOUNS,
    // Giving is an offer the recipient accepts; typed requests reach it through grounding.
    unsupported: [],
    revisions: [
      {
        // Single fuel, light and put-out requests ground to fire care (AC09.7). Keeping a fire
        // going over time needs repeated fuelling, which no activity offers yet (AC06).
        verbs: ['tend', 'keep', 'mind'],
        states: ['burning', 'going', 'lit', 'alive'],
        becomes: 'stay-by-heat',
        omitted: {
          requirement: 'keep the fire fuelled',
          reason:
            'Fuelling a fire again and again is not an ongoing activity yet; add fuel yourself.',
        },
        withoutTime:
          'Keeping a fire going is not an ongoing activity yet; add fuel to it or light it instead.',
      },
    ],
    examples: [
      ...(nativeCommandSupported(world, 'gather') ? ['gather wood until I have 6'] : []),
      'follow the deer behind at 4 m',
      ...(nativeCommandSupported(world, 'cook') ? ['cook the meat at the fire then eat it'] : []),
    ],
    placeholder: 'Pick up 2 stones, or follow the deer',
  };
}
