import { nativeText, subjectNarration } from '../../narration.js';
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
  'projectile-contact': ['contactInjury', 'contactSourceId', 'contactSourceLife'],
  struck: ['definitionId', 'contactInjury', 'hit', 'reason'],
  'state-changed': ['definitionId', 'active'],
  // These outcomes narrate visible work; internal material ID lists are not public facts.
  'gate-operated': [
    'actionId',
    'itemId',
    'operation',
    'beforePosition',
    'position',
    'beforeBarred',
    'barred',
    'changed',
  ],
  'gate-checked': [
    'actionId',
    'itemId',
    'operation',
    'beforePosition',
    'position',
    'beforeBarred',
    'barred',
    'changed',
  ],
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
const contactMetrics = ['rawInjury', 'preventedInjury', 'healthBefore', 'healthAfter', 'damage'];
/** One authored descriptor is shared with the selected native family. Native
 * installation verifies its complete canonical body before using the law. */
export const BASE_EVENT_DISCLOSURE_DATA = {
  id: 'base:event-disclosure',
  version: 1,
  fields,
  activity,
  physicalReferences,
  shared,
  contactMetrics,
  feltEvents: ['struck', 'projectile-contact'],
  contactField: 'contactInjury',
  offerField: 'offerId',
  gateEvents: ['gate-operated', 'gate-checked'],
  gateCheckedEvent: 'gate-checked',
  operationField: 'operation',
  closeOperation: 'close',
  barFields: ['beforeBarred', 'barred'],
  privateBodyEvent: 'body-effect',
  privateBodyMetrics: ['healthDelta', 'wetnessDelta', 'burningDelta'],
  attributeEvent: 'attribute-changed',
  causeField: 'causeLabel',
  partialType: 'activity-observed',
  text: {
    unseenImpact: 'felt a physical impact from an unseen source.',
    defaultActivity: 'was active.',
    targetActivity: 'was involved in activity.',
    unknownActivity: 'Activity was observed.',
    causePrefix: ' from ',
  },
} as const;
const disclosure = BASE_EVENT_DISCLOSURE_DATA;
export const BASE_EVENT_DISCLOSURE: EventDisclosurePolicy = {
  partialType: disclosure.partialType,
  feltTarget: (event) =>
    (disclosure.feltEvents as readonly string[]).includes(event.type) &&
    event.data?.[disclosure.contactField] === true
      ? event.targetId
      : undefined,
  // Seeing two people does not disclose their carried lot's exact terms. Native
  // handover explicitly grants the parties that knowledge; witnesses get the act.
  permitsDetails: (event, observerId) =>
    typeof event.data?.[disclosure.offerField] !== 'string' ||
    observerId === event.actorId ||
    observerId === event.targetId,
  references: (event) =>
    physicalReferences.flatMap((key) =>
      typeof event.data?.[key] === 'string' ? [event.data[key] as string] : [],
    ),
  partial: (event, sourceId, targetId) =>
    !sourceId && targetId && event.data?.[disclosure.contactField] === true
      ? subjectNarration(targetId, disclosure.text.unseenImpact)
      : sourceId
        ? subjectNarration(sourceId, activity[event.type] ?? disclosure.text.defaultActivity)
        : targetId
          ? subjectNarration(targetId, disclosure.text.targetActivity)
          : disclosure.text.unknownActivity,
  completeText: (event, data, text) => {
    // A visible meter change does not expose a private bodily cause. The
    // disclosure grant must admit the cause before this world narrates it.
    const cause = data[disclosure.causeField];
    return event.type === disclosure.attributeEvent && typeof cause === 'string'
      ? `${nativeText(text).replace(/[.!?]$/, '')}${disclosure.text.causePrefix}${cause.toLowerCase()}.`
      : text;
  },
  data: (event, observerId, detailed) => {
    if (!detailed) {
      // An impact grants one's bodily result, not the unseen weapon/definition,
      // performer, execution identity or position referenced by the raw occurrence.
      if (event.targetId !== observerId || event.data?.[disclosure.contactField] !== true)
        return {};
      return Object.fromEntries(
        [disclosure.contactField, ...contactMetrics].flatMap((key) =>
          event.data?.[key] !== undefined ? [[key, event.data[key]]] : [],
        ),
      );
    }
    const owned = event.scope === 'private' || event.actorId === observerId;
    // Gate grant revisions and visibility controls serve native publication,
    // not perception. Finding a leaf already closed also proves no unseen bar state.
    const keys = (disclosure.gateEvents as readonly string[]).includes(event.type)
      ? fields[event.type]!.filter(
          (key) =>
            event.type !== disclosure.gateCheckedEvent ||
            event.data?.[disclosure.operationField] !== disclosure.closeOperation ||
            !(disclosure.barFields as readonly string[]).includes(key),
        )
      : owned
        ? Object.keys(event.data ?? {})
        : [...shared, ...(fields[event.type] ?? [])];
    // Feeling a contact does not reveal another person's exact bodily meters, even to
    // the attacker. Preserve this policy at acquisition instead of filtering on every read.
    const privateMetrics =
      event.type === disclosure.privateBodyEvent
        ? [...disclosure.privateBodyMetrics]
        : event.data?.[disclosure.contactField] === true
          ? contactMetrics
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
