import { BASE_OUTING } from './outing-policy.js';
import { BASE_CONSTRUCTION_DESCRIPTIONS } from './canopies.js';
import { BASE_GUARD_TEXT } from './shield-defense.js';
import { BASE_PRACTICE_COMMAND_DESCRIPTIONS } from './practical-competence.js';
import { BASE_DEATH_COMMAND_DESCRIPTIONS } from './death.js';
import { BASE_FOOD_ACTION_WORDING } from './action-views.js';

/** Bundled command explanations, selected through the installed action owner. */
export const BASE_COMMAND_DESCRIPTIONS: Record<string, string> = {
  ...BASE_DEATH_COMMAND_DESCRIPTIONS,
  outing: BASE_OUTING.description,
  ...BASE_PRACTICE_COMMAND_DESCRIPTIONS,
  ...BASE_CONSTRUCTION_DESCRIPTIONS,
  'activity-request':
    'Choose every required parameter and review a supported activity before starting it.',
  'inspect-activities':
    'Read a bounded page of my own past actions and results, without repeating them.',
  activity:
    'Attempt a personally learned sequence; each step rechecks its requirements and keeps actual completed results.',
  say: 'Speak to nearby listeners. Only people who hear the words receive the speech.',
  conversation:
    'Join or leave a nearby conversation. Membership never grants earlier unheard speech.',
  pickup:
    'Approach a visible pile and pick up its portable items. Quantities are checked again on arrival.',
  drop: 'Place the selected quantity of a portable possession on the current support. Stop active work first.',
  'transfer-item':
    'Move free units between accessible containers. Bags retain their identity and contents. Capacity and nesting are checked together.',
  'split-item':
    'Separate free units into a new lot in the same container. Reserved units stay in their original lot.',
  'merge-item':
    'Combine equivalent free lots in the same container. Individual objects and reserved lots remain separate.',
  unequip: 'Release the selected equipment into your inventory after current work has finished.',
  'confirm-attempt':
    'Accept the exact revised action and its disclosed omissions. Native prerequisites are rechecked before execution.',
  'withdraw-attempt': 'Decline or withdraw a pending action; ongoing work is unchanged.',
  follow:
    'Follow a currently perceived actor, stopping when the target is lost or the activity is interrupted. No attack or stealth is implied.',
  move: 'Walk to the chosen location along a traversable route. This replaces your current work.',
  gather:
    'Approach a resource and collect a small batch into your inventory. Supplies at each source are finite.',
  prepare: 'Turn gathered plant material into usable fibers or cord for crafting.',
  craft:
    'Make an item using a technique you know. Materials are consumed when work begins and are not refunded if you stop.',
  guard: BASE_GUARD_TEXT.description,
  equip:
    'Select one individual tool from your inventory. A ranged tool needs compatible ammunition before you can fire.',
  strike:
    'Approach the target and perform one strike. Damage requires a living target in range with a clear line of effect at impact.',
  hunt: 'Approach a living animal and attempt one shot with your equipped ranged tool. Each attempt consumes ammunition and can miss. A killed animal leaves harvestable remains.',
  harvest:
    'Use a cutting point to collect the remaining materials from animal remains. Each set of remains can be harvested once.',
  cook: BASE_FOOD_ACTION_WORDING.cookingDescription,
  fish: BASE_FOOD_ACTION_WORDING.fishingDescription,
  handover:
    'Offer carried items to a person within reach, or accept, decline or withdraw an offer. Nothing changes hands unless the recipient accepts; an unanswered offer expires.',
  'tend-fire':
    'Light a campfire that has fuel laid, add one piece of carried fuel, or put it out. Materials are used only when the work finishes; unburnt fuel stays in a fire that is put out.',
  eat: 'Consume one accessible portion through the installed body service.',
  replenish:
    'Approach a compatible supply and transfer its finite resource into your reservoir over time. Stopping keeps only the amount already transferred.',
  'status-effect': 'Activate or end an applicable state on the selected target.',
  'inspect-inventory':
    'Inspect a bounded page of your own possessions or one selected reachable container; further pages require another explicit request and current access.',
  cancel: 'Stop your current movement or work. Materials already consumed are not returned.',
  recover:
    'Use the installed recovery service. Your current action ends; world history is retained.',
  'learn-record':
    'Learn the exact production method from a currently inspected accessible record. This grants knowledge only, without making an item or consuming the record.',
  teach:
    'Share a learned crafting technique with a nearby person so they can use it themselves. Teaching shares knowledge, not an item.',
  talk: 'Open a conversation with a nearby person. You can review and edit your message before sending it.',
};
