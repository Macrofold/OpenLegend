import type { PreparedResponseProfile } from '../../prepared-responses.js';

/** One authored source for the selected catalogue, wording and finite tuning.
 * docs/worlds/base/threat-response-options.md */
export const BASE_THREAT_RESPONSE_PROFILE: PreparedResponseProfile = {
  id: 'wilderness:threat-responses',
  version: 1,
  instructions:
    'Consider what this particular person wants to do from their complete identity, actual body, personally perceived evidence, feelings, valued work and commitments. Availability does not prescribe conduct. Fear and decisive action can coexist. Stopping immediate danger, protecting someone, retaliation, withdrawal and continuing useful work are distinct purposes. A chosen purpose grants no capability, consent, knowledge, compelled response or proof of success. Each offensive option authorizes one actual attack; another attack requires another choice. A spoken line is one ordinary speech operation, with no simultaneous movement or strike implied.',
  relevance: {
    question:
      'Does this exact grounded purpose plausibly fit this person and their personally available situation?',
    uncertain:
      'The evidence leaves whether this purpose fits unresolved. Retain this exact instance for the person’s actual choice.',
    relevant:
      'This purpose plausibly fits this person and the supplied situation. Retain this exact instance for their actual choice.',
    irrelevant:
      'This supplied purpose does not fit this person and situation. Exclude this instance only.',
  },
  purposes: [
    {
      id: 'TR01',
      label: 'Stop the present assault on me',
      meaning:
        'Respond to personally experienced harm or a credible attack on my body. Reconsider the actual result, cessation, withdrawal or changed safety. An unknown source cannot become a guessed target.',
      requires: ['personal-danger'],
      means: ['attack', 'guard', 'evade', 'leave'],
    },
    {
      id: 'TR02',
      label: 'Drive this assailant away',
      meaning:
        'Defend this actual place by a grounded action or warning. Their leaving ends this purpose; it does not authorize endless pursuit.',
      requires: ['visible-assailant'],
      means: ['attack', 'approach', 'guard', 'speech'],
    },
    {
      id: 'TR03',
      label: 'Hold this place without chasing',
      meaning:
        'Remain at the selected current place for the original finite commitment. No repeated attacks or guards are implied; an actual result or changed situation warrants reconsideration.',
      requires: [],
      means: ['hold', 'guard', 'attack', 'speech'],
    },
    {
      id: 'TR04',
      label: 'Prevent the next blow while choosing what to do',
      meaning:
        'One actual guard, evasion or movement away, followed by reconsideration at its result or recovery. This grants no invulnerability.',
      requires: ['personal-danger'],
      means: ['guard', 'evade', 'leave'],
    },
    {
      id: 'TR05',
      label: 'Get clear of immediate danger',
      meaning:
        'Choose one feasible displacement. Arrival, obstruction or materially changed danger requires another choice; the destination is not guaranteed safe.',
      requires: ['personal-danger'],
      means: ['leave', 'evade', 'speech'],
    },
    {
      id: 'TR06',
      label: 'Break contact and leave this dispute',
      meaning:
        'Unilaterally end or replace my current conduct and leave by an actual finite action, or express that wish. This neither stops the opponent nor creates peace.',
      requires: ['encounter'],
      means: ['leave', 'follow-helper', 'speech'],
    },
    {
      id: 'TR07',
      label: 'Follow the retreating assailant to keep pressure on them',
      meaning:
        'A finite visible follow or approach. Stop at reach, lost sight, obstruction, the original time/distance limit or changed purpose. No automatic new attack follows.',
      requires: ['withdrawing', 'visible-assailant'],
      means: ['pursue'],
    },
    {
      id: 'TR08',
      label: 'Search the last place I actually saw them',
      meaning:
        'Move once to the exact personally recorded last-seen point. Arrival ends this movement. No hidden location update, search pattern or automatic return is supplied.',
      requires: ['last-seen'],
      means: ['last-seen'],
    },
    {
      id: 'TR09',
      label: 'Let them leave and recover my situation',
      meaning:
        'End pursuit or attack and choose available recovery, observation, movement or useful continuation. Harm remains historical; no forgiveness is inferred.',
      requires: ['withdrawal-or-ended'],
      means: ['leave', 'assess', 'resume', 'continue', 'speech'],
    },
    {
      id: 'TR10',
      label: 'Protect this particular person from immediate harm',
      meaning:
        'Intervene for this exact personally perceived person by a supported attack, movement, own-body guard or words. No shield protection, consent or shared plan is projected onto them.',
      requires: ['protectee'],
      means: ['attack', 'guard', 'approach', 'speech'],
    },
    {
      id: 'TR11',
      label: "Cover this person's escape",
      meaning:
        'Act for the exact endangered person whose movement or words are perceived. Reconsider their observed arrival/disappearance and changing danger; no shared plan is invented.',
      requires: ['escaping-protectee'],
      means: ['hold', 'attack', 'speech'],
    },
    {
      id: 'TR12',
      label: 'Reach someone whose help I actually expect',
      meaning:
        'Move toward or address this known available person. Whether to expect help is personal judgment from available knowledge; arrival is not guaranteed safety or cooperation.',
      requires: ['known-helper'],
      means: ['follow-helper', 'approach-helper', 'speech'],
    },
    {
      id: 'TR13',
      label: 'Ask nearby people to intervene',
      meaning:
        'Use ordinary audible words with possible actual recipients. No off-screen broadcast, compulsory response or faction alert follows.',
      requires: ['possible-hearer'],
      means: ['speech'],
    },
    {
      id: 'TR14',
      label: 'Warn them before choosing greater force',
      meaning:
        'Speak the exact offered words to the actual addressable person. Their compliance and any subsequent force remain independent choices.',
      requires: ['visible-assailant'],
      means: ['speech'],
    },
    {
      id: 'TR15',
      label: 'Find out whether this was an accident',
      meaning:
        'Ask about personally experienced contact or observe. A claimed accident is testimony and does not erase actual harm.',
      requires: ['personal-contact'],
      means: ['speech', 'assess'],
    },
    {
      id: 'TR16',
      label: 'Accept an opportunity to de-escalate',
      meaning:
        'Choose unilateral cessation, guard, distance or words in light of perceived change. This creates no treaty, surrender or numerical relationship repair.',
      requires: ['encounter'],
      means: ['leave', 'guard', 'assess', 'speech'],
    },
    {
      id: 'TR17',
      label: 'Set a firm boundary against humiliation or coercion',
      meaning:
        'Interpret actual conduct personally and choose a supported warning, withdrawal or physical response. The engine does not decide wrongdoing or require aggression.',
      requires: ['identified-conduct'],
      means: ['speech', 'leave', 'attack'],
    },
    {
      id: 'TR18',
      label: 'Retaliate for the harm they caused',
      meaning:
        'A personally chosen attack or finite pursuit for supported harm, potentially after immediate defense ends. Injury does not automatically assign this purpose.',
      requires: ['identified-harm'],
      means: ['attack', 'pursue'],
    },
    {
      id: 'TR19',
      label: 'Preserve something I value without a needless fight',
      meaning:
        'Consider actual possessions, place, current work or commitments and choose supported defensive, movement or communication conduct. No seizure, bargain or transfer is invented.',
      requires: ['valued-stake'],
      means: ['leave', 'guard', 'speech'],
    },
    {
      id: 'TR20',
      label: 'Stop fighting because the cost has become too high',
      meaning:
        'Respond to actual hurt, failed action, exhaustion, loss or realization by withdrawal, observation or words. No health percentage forces surrender.',
      requires: ['experienced-cost'],
      means: ['leave', 'assess', 'speech'],
    },
    {
      id: 'TR21',
      label: 'Check the harm that just happened',
      meaning:
        'Observe or ask the actual person about personally available harm. No diagnosis, healing or moral conclusion is fabricated.',
      requires: ['observed-harm'],
      means: ['assess', 'speech'],
    },
    {
      id: 'TR22',
      label: 'Resume what I was doing',
      meaning:
        'Continue or resume actual remaining work through its owner, with its real materials, progress and stopping conditions. New danger or a refused resumption requires reconsideration.',
      requires: ['existing-work'],
      means: ['resume', 'continue'],
    },
    {
      id: 'TR23',
      label: 'Stay still and assess the situation',
      meaning:
        'Deliberately choose no new physical action until an earlier relevant cue or the original short review deadline. This is not an unavailable provider or a lost decision.',
      requires: [],
      means: ['assess'],
    },
    {
      id: 'TR24',
      label: 'Continue my current choice despite the provocation',
      meaning:
        'Keep the exact still-valid native work or plan for a personally defensible reason. A prompt does not remove this alternative to force a fight.',
      requires: ['existing-work'],
      means: ['continue'],
    },
  ],
  speech: [
    {
      id: 'TS01',
      text: 'Help!',
      purposes: ['TR13'],
      requires: [],
      audience: 'possible-hearer',
      addressee: 'involved',
    },
    {
      id: 'TS02',
      text: "Help! I'm hurt.",
      purposes: ['TR12', 'TR13', 'TR21'],
      requires: ['hurt'],
      audience: 'possible-hearer',
      addressee: 'involved',
    },
    {
      id: 'TS03',
      text: 'Back away.',
      purposes: ['TR02', 'TR03', 'TR14', 'TR17'],
      requires: [],
      audience: 'person',
      addressee: 'involved',
    },
    {
      id: 'TS04',
      text: 'Leave me alone.',
      purposes: ['TR06', 'TR14', 'TR17'],
      requires: [],
      audience: 'person',
      addressee: 'involved',
    },
    {
      id: 'TS05',
      text: 'Was that an accident?',
      purposes: ['TR15'],
      requires: ['personal-contact'],
      audience: 'person',
      addressee: 'involved',
    },
    {
      id: 'TS06',
      text: "Stop. I don't want to keep fighting.",
      purposes: ['TR06', 'TR16'],
      requires: ['encounter'],
      audience: 'person',
      addressee: 'involved',
    },
    {
      id: 'TS07',
      text: "Stay back. I'm leaving.",
      purposes: ['TR05', 'TR06', 'TR14'],
      requires: [],
      audience: 'person',
      addressee: 'involved',
    },
    {
      id: 'TS08',
      text: 'Are you hurt?',
      purposes: ['TR10', 'TR21'],
      requires: [],
      audience: 'person',
      addressee: 'beneficiary',
    },
    {
      id: 'TS09',
      text: 'Do you want my help?',
      purposes: ['TR10', 'TR11', 'TR12', 'TR21'],
      requires: ['supported-help'],
      audience: 'person',
      addressee: 'beneficiary',
    },
    {
      id: 'TS10',
      text: "I'll stay here.",
      purposes: ['TR03', 'TR09', 'TR16'],
      requires: ['can-stay'],
      audience: 'person',
      addressee: 'involved',
    },
  ],
  appraisals: [
    {
      definitionId: 'wilderness:fear',
      meaning:
        'My interpretation of possible harm, uncertainty, stakes, actual control, abilities and alternatives. This is intensity, not a probability, an increment from damage or an instruction to flee.',
      amounts: [0.25, 0.5, 0.75, 1],
    },
    {
      definitionId: 'wilderness:anger',
      meaning:
        'My interpretation of perceived opposition, harm or violated values from what I actually know. This is intensity, not a probability of attacking or an automatic judgment of another person.',
      amounts: [0.25, 0.5, 0.75, 1],
    },
  ],
  limits: {
    pursuitSeconds: 600,
    pursuitRadius: 30,
    holdSeconds: 600,
    assessmentSeconds: 120,
    rangeMargin: 0.75,
    stableSeconds: 12,
  },
};
