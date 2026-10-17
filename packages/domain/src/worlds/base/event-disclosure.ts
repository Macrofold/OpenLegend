import { subjectNarration } from '../../narration.js';
import type { EventDisclosurePolicy } from '../../event-observation.js';

/** Wilderness observation policy. Unknown payload fields are not public facts; a new
 * family declares its observable fields here rather than exposing execution metadata.
 * Participant/private producers still own deliberate grants (for example barter terms).
 */
const fields: Record<string, readonly string[]> = {
  expression: ['mechanical', 'descriptive'],
  'attribute-changed': [
    'changeKind',
    'attributeId',
    'definitionVersion',
    'before',
    'after',
    'unit',
    'attributeName',
    'attributeMeaning',
  ],
  gathered: ['definitionId', 'quantity'],
  ate: ['definitionId'],
  crafted: ['recipeId'],
  taught: ['recipeId'],
  replenished: [],
  cooked: ['preparationId', 'quantity'],
  'cast-completed': ['definitionId', 'quantity'],
  'shot-released': ['ammunitionKind', 'quantity'],
  'projectile-contact': ['contactInjury'],
  struck: ['definitionId', 'contactInjury', 'hit', 'reason'],
  'state-changed': ['definitionId', 'active'],
  // These outcomes narrate visible work; internal material ID lists are not public facts.
  'construction-phase': [],
  'cover-lowered': [],
  'weather-cue': ['endsAt'],
};
const activity: Record<string, string> = {
  gathered: 'worked at gathering.',
  harvested: 'worked at harvesting.',
  cooked: 'worked at cooking.',
  'cast-completed': 'worked at fishing.',
  struck: 'made a striking motion.',
  'shot-released': 'made a shooting motion.',
  taught: 'appeared to be teaching.',
  'items-picked-up': 'reached to pick something up.',
  'items-dropped': 'made a dropping motion.',
  'construction-phase': 'worked at construction.',
  'cover-lowered': 'worked on a structure.',
  'item-offered': 'made an offer.',
  'offer-accepted': 'took part in an exchange.',
  'offer-withdrawn': 'discussed an offer.',
  'offer-declined': 'discussed an offer.',
  'offer-expired': 'discussed an offer.',
  'offer-lapsed': 'discussed an offer.',
};
const physicalReferences = [
  'itemId',
  'weaponItemId',
  'assemblyId',
  'changedMaterialId',
  'endingActorId',
  'destinationId',
];
const shared = ['responseId', 'conversationRelevant', 'semanticTrigger'];
export const BASE_EVENT_DISCLOSURE: EventDisclosurePolicy = {
  // Seeing two people does not disclose their carried lot's exact terms. Native
  // handover explicitly grants the parties that knowledge; witnesses get the act.
  permitsDetails: (event, observerId) =>
    typeof event.data?.['offerId'] !== 'string' ||
    observerId === event.actorId ||
    observerId === event.targetId,
  references: (event) =>
    physicalReferences.flatMap((key) =>
      typeof event.data?.[key] === 'string' ? [event.data[key] as string] : [],
    ),
  partial: (event, sourceId, targetId) =>
    sourceId
      ? subjectNarration(sourceId, activity[event.type] ?? 'was active.')
      : targetId
        ? subjectNarration(targetId, 'was involved in activity.')
        : 'Activity was observed.',
  data: (event, observerId, detailed) => {
    if (!detailed) return {};
    const owned = event.scope === 'private' || event.actorId === observerId;
    const keys = owned ? Object.keys(event.data ?? {}) : [...shared, ...(fields[event.type] ?? [])];
    // Feeling a contact does not reveal another person's exact bodily meters, even to
    // the attacker. Preserve this policy at acquisition instead of filtering on every read.
    const privateMetrics =
      event.type === 'body-effect'
        ? ['healthDelta', 'injuryDelta', 'wetnessDelta', 'burningDelta']
        : event.data?.['contactInjury'] === true
          ? ['rawInjury', 'preventedInjury', 'healthBefore', 'healthAfter', 'damage']
          : [];
    if (observerId === event.targetId) keys.push(...privateMetrics);
    return Object.fromEntries(
      keys.flatMap((key) =>
        event.data?.[key] !== undefined &&
        (observerId === event.targetId || !privateMetrics.includes(key))
          ? [[key, event.data[key]]]
          : [],
      ),
    );
  },
};
