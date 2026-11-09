import type { CognitionPolicy } from '../../cognition-policy.js';
import { definitionPin } from '../../world-modules.js';
import { BASE_THREAT_RESPONSE_PROFILE } from './threat-response-profile.js';
import type { WorldEvent } from '../../types.js';
import { freeze } from 'immer';
import { BASE_RESPONSE_RULES } from './response-rules.js';

export const BASE_OCCURRENCE_RULES = freeze(
  {
    id: 'wilderness:occurrences',
    version: 1,
    importantEvents: ['death', 'taught', 'incapacitated'] as readonly string[],
    importantValue: 9,
    speechEvent: 'speech',
    soundEvent: 'sound',
    encounterEvent: 'encounter',
    contactEvent: 'contact',
    speechImportance: 7,
    soundImportance: 3,
    receivedUrgency: 4,
    unintelligibleSpeechImportance: 3,
    semanticEvents: [
      'crafted',
      'declaration-admitted',
      'shot-released',
      'projectile-contact',
      'struck',
      'fire-out',
      'fire-lit',
      'fire-extinguished',
      'rested',
    ] as readonly string[],
    semanticImportance: 6,
    ordinaryImportance: 3,
    urgentEvents: ['death', 'incapacitated'] as readonly string[],
    urgentValue: 10,
    speechUrgency: 4,
    ordinaryUrgency: 2,
    activityEvents: [
      'action-started',
      'speech',
      'ate',
      'equipped',
      'gathered',
      'prepared',
      'crafted',
      'harvested',
      'cooked',
      'fire-lit',
      'fire-fueled',
      'fire-extinguished',
      'struck',
      'guarded',
      'shot-released',
      'shot-ended',
      'body-effect',
      'moved',
      'action-stopped',
    ] as readonly string[],
    nativeTargetEvents: [
      'struck',
      'projectile-contact',
      'projectile-passage',
      'shot-released',
      'attack-cue',
      'action-started',
    ] as readonly string[],
    projectileContactEvent: 'projectile-contact',
    projectilePassageEvent: 'projectile-passage',
    importancePolicy: 'native-v1',
    significantReason: 'significant',
    response: BASE_RESPONSE_RULES,
  },
  true,
);

/** Authored fallback salience; explicit producer metrics are normalized by the event owner. */
export function baseEventSalience(type: string, data: WorldEvent['data']) {
  const rules = BASE_OCCURRENCE_RULES;
  return {
    importance:
      data?.['significant'] === true || rules.importantEvents.includes(type)
        ? rules.importantValue
        : type === rules.speechEvent
          ? rules.speechImportance
          : data?.['semanticTrigger'] === true || rules.semanticEvents.includes(type)
            ? rules.semanticImportance
            : rules.ordinaryImportance,
    urgency: rules.urgentEvents.includes(type)
      ? rules.urgentValue
      : type === rules.speechEvent
        ? rules.speechUrgency
        : rules.ordinaryUrgency,
  };
}

/** Construct after linked world definitions initialize; exact pins use the shared
 * identity owner, rather than a second hand-maintained digest in authored data. */
export function baseCognitionPolicy(): CognitionPolicy {
  return {
    preparedResponses: definitionPin(BASE_THREAT_RESPONSE_PROFILE),
    actionGuidance: {
      reasons:
        'Choose a worthwhile next step for this person using current bodily state, feelings, interests, knowledge, commitments and chosen goals. Curiosity, enjoyment, company and rest are reasons to act without material gain or a declared goal. Reassess from actual remembered outcomes and present circumstances whether further work still serves a current reason. Mere availability or possible future usefulness is insufficient. Continuing useful admitted work is legitimate; needless restarting is not.',
      consideration:
        'Is this a reasonable action for this actor to consider taking now, given the trigger, current situation, interests and intentions?',
      selection:
        'Does this action serve a current need, intention or interest supported by this character’s knowledge, values and present circumstances?',
      criteria: {
        true: 'The action serves a current need, intention or interest. Enjoyment, curiosity, company and rest can be worthwhile without material gain or a declared goal. Its prerequisites are available; ordinary risk or further work does not make it pointless.',
        false:
          'No remaining reason supports the action here, it conflicts with the character’s values, depends on unavailable prerequisites, or needlessly restarts completed or remaining work. Mere availability or possible future usefulness does not establish a current reason.',
      },
    },
    recording: { actionResultImportance: 6, exposureImportance: 6 },
    dream: { statusEffectId: 'wilderness:restorative-rest', afterSeconds: 7200 },
    version: 1,
    revision: 2,
    maxImmediateLevel: 4,
    significantEventTypes: ['death', 'animal-died', 'incapacitated', 'taught'],
    reflection: true,
  };
}
