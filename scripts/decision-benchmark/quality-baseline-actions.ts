import type { BaselineQualityRows } from './quality-baseline.js';

export const actionChoiceQuality: BaselineQualityRows = {
  'act-route-food-q1': {
    native: [
      0,
      'unsupported-evidence',
      'No automatic eating is running; the actor still needs to choose.',
    ],
    level2: [
      50,
      'goal-shortfall',
      'Composing language is unnecessary and does not directly select the supplied meal action.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'Careful reasoning can choose food, but the ready meal needs only the cheaper supplied-action route.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'Deeper reasoning can make the choice, but no difficult unresolved tradeoff warrants it.',
    ],
  },
  'act-route-food-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'Ordinary hunger and a completed old promise supply no new lasting relationship or belief change.',
    ],
  },
  'act-route-food-q3': {
    no: [
      0,
      'unsupported-evidence',
      'Eating a carried edible berry is a directly relevant physical possibility.',
    ],
  },
  'act-route-urgent-q1': {
    native: [
      0,
      'unsupported-evidence',
      'The context explicitly says no automatic defensive movement is running.',
    ],
    level2: [
      25,
      'goal-shortfall',
      'New language does not address the supplied immediate retreat as directly as selecting that action.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'Careful reasoning could select retreat, but urgency does not make this simple choice complex.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'Deeper reasoning could select retreat, but no unresolved multi-step conflict is supplied.',
    ],
  },
  'act-route-urgent-q2': {
    no: [
      0,
      'unsupported-evidence',
      'A threat on the supposedly safer daily route directly bears on the retained safety concern.',
    ],
  },
  'act-route-urgent-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The clear executable retreat is an immediately relevant physical response.',
    ],
  },
  'act-route-running-q1': {
    level1: [
      75,
      'goal-shortfall',
      'Deliberately continuing useful cooking is reasonable, but native progress already handles this unchanged event.',
    ],
    level2: [
      25,
      'irrelevant',
      'No one spoke and no new wording or goal is needed to keep cooking.',
    ],
    level3: [
      25,
      'irrelevant',
      'The valid stable cooking action presents no new constraints requiring careful comparison.',
    ],
    level4: [25, 'irrelevant', 'Ordinary fire crackling supplies no deep unresolved conflict.'],
  },
  'act-route-running-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'The normal repeated cooking sound supplies no new lasting change.',
    ],
  },
  'act-route-treaty-q1': {
    native: [
      0,
      'constraint',
      'Mara directly asks this actor for an evidence-based reply, with no urgent protection taking precedence.',
    ],
    level1: [
      25,
      'goal-shortfall',
      'A supplied physical choice cannot express the requested account of conflicting testimony.',
    ],
    level2: [
      75,
      'goal-shortfall',
      'An ordinary reply can acknowledge uncertainty, but the request calls for comparing several consequential accounts.',
    ],
  },
  'act-route-treaty-q2': {
    no: [
      0,
      'unsupported-evidence',
      'The unresolved promise and accusation supply material evidence for later reconsideration.',
    ],
  },
  'act-route-treaty-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The scene does not rule out an accompanying gesture or other response; the rubric includes uncertain possibilities.',
    ],
  },
  'act-talk-greeting-q1': {
    native: [
      0,
      'unsupported-evidence',
      'Mike directly addresses Ada and no reply or competing emergency has already handled it.',
    ],
    level1: [
      50,
      'goal-shortfall',
      'A greeting gesture could help, but cannot compose the requested account of the day.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'This route can compose a reply, but the ordinary greeting needs no careful comparison.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'This route can compose a reply, but the greeting supplies no unusually difficult conflict.',
    ],
  },
  'act-talk-greeting-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'The ordinary greeting supplies no specific new lasting relationship evidence.',
    ],
  },
  'act-talk-greeting-q3': {
    no: [
      0,
      'unsupported-evidence',
      'A greeting gesture remains plausible in this ordinary addressed exchange.',
    ],
  },
  'act-talk-overheard-q1': {
    level1: [
      75,
      'goal-shortfall',
      'Choosing to continue admitted cord work is reasonable, but existing native progress already suffices.',
    ],
    level2: [
      25,
      'irrelevant',
      'The answered question is addressed to Mara, so composing Ada a reply is unnecessary.',
    ],
    level3: [
      25,
      'irrelevant',
      'The exchange supplies neither a question to Ada nor conflicting evidence needing comparison.',
    ],
    level4: [
      25,
      'irrelevant',
      'An already answered reed question supplies no difficult unresolved tradeoff.',
    ],
  },
  'act-talk-overheard-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'The ordinary reed exchange changes no supplied promise, relationship or belief.',
    ],
  },
  'act-talk-overheard-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The broad retrieval question includes possible physical continuation or expression, even when no interruption is chosen.',
    ],
  },
  'act-talk-fragment-q1': {
    native: [
      0,
      'unsupported-evidence',
      'Ada is addressed and the missing request has not been resolved by native behavior.',
    ],
    level1: [
      25,
      'goal-shortfall',
      'Selecting a physical delivery cannot recover the missing item and recipient.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'Careful reasoning can ask for clarification, but ordinary composed language is sufficient.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'Deeper reasoning can ask for clarification, but cannot reconstruct inaudible words.',
    ],
  },
  'act-talk-fragment-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'An incomplete ordinary request does not establish a lasting relationship or belief change.',
    ],
  },
  'act-talk-fragment-q3': {
    no: [
      0,
      'unsupported-evidence',
      'A delivery or accompanying expression may become relevant once the request is clarified.',
    ],
  },
  'act-talk-no-movement-q1': {
    native: [
      0,
      'constraint',
      'Mike directly requests a new one-word clarification; no existing behavior supplies it.',
    ],
    level1: [
      25,
      'goal-shortfall',
      'A physical action or silence cannot supply the specifically requested spoken word.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'This route can say evening, but the retained exact sentence needs no careful comparison.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'This route can answer, but no difficult unresolved conflict is present.',
    ],
  },
  'act-talk-no-movement-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'Clarifying a word in an ordinary remembered sentence adds no material lasting change.',
    ],
  },
  'act-talk-no-movement-q3': {
    yes: [
      0,
      'constraint',
      'The supplied scene explicitly requires spoken language alone and excludes gesture or practical movement.',
    ],
  },
  'act-reflect-betrayal-q1': {
    native: [
      0,
      'unsupported-evidence',
      'The addressed new confession has not already been handled and there is no competing emergency.',
    ],
    level1: [
      50,
      'goal-shortfall',
      'A visible reaction could accompany acknowledgment, but does not compose the immediate reply.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'Deeper reasoning could answer, but immediate acknowledgment need not solve the later relationship judgment.',
    ],
  },
  'act-reflect-betrayal-q2': {
    no: [
      0,
      'unsupported-evidence',
      'The specific admission of taking and lying directly challenges the actor’s prior trust.',
    ],
  },
  'act-reflect-betrayal-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The new personal confession does not rule out a gesture or another physical response.',
    ],
  },
  'act-reflect-repeated-q1': {
    level1: [
      75,
      'goal-shortfall',
      'A deliberate gesture or continuation could acknowledge the repetition, though the exchange may simply end.',
    ],
    level3: [25, 'irrelevant', 'The repeated thanks supplies no new difficult interpretation.'],
    level4: [
      25,
      'irrelevant',
      'The already acknowledged basket transfer supplies no deep unresolved conflict.',
    ],
  },
  'act-reflect-repeated-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'The second polite thanks adds no supplied lasting change to the untroubled relationship.',
    ],
  },
  'act-reflect-repeated-q3': {
    no: [
      0,
      'unsupported-evidence',
      'A brief acknowledging gesture remains possible even if Ada chooses no further action.',
    ],
  },
  'act-reflect-important-q1': {
    native: [
      0,
      'unsupported-evidence',
      'Mara addresses a fresh invitation to Ada and no native reply is already running.',
    ],
    level1: [
      50,
      'goal-shortfall',
      'Walking toward the fire could serve the visit, but does not compose the immediate answer to Mara.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'This route can answer the invitation, but importance alone does not require careful reasoning.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'This route can answer, but the straightforward invitation contains no unusually difficult conflict.',
    ],
  },
  'act-reflect-important-q2': {
    no: [
      0,
      'unsupported-evidence',
      'News about the sister’s arrival bears directly on Ada’s enduring worry about the journey.',
    ],
  },
  'act-reflect-important-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The supplied invitation explicitly makes a walk to the fire a plausible response.',
    ],
  },
  'act-reflect-routine-danger-q1': {
    native: [
      0,
      'unsupported-evidence',
      'The request addresses Ada and moving her basket is not already being performed automatically.',
    ],
    level3: [
      75,
      'goal-shortfall',
      'This route can handle the request, but the understood basket move needs no careful comparison.',
    ],
    level4: [
      75,
      'goal-shortfall',
      'This route can handle it, but loudness does not create an unusually difficult tradeoff.',
    ],
  },
  'act-reflect-routine-danger-q2': {
    yes: [
      0,
      'unsupported-evidence',
      'This repeats an understood work-path reminder without new lasting relationship information.',
    ],
  },
  'act-reflect-routine-danger-q3': {
    no: [
      0,
      'unsupported-evidence',
      'The directly requested basket move is an explicit relevant physical response.',
    ],
  },
  'act-ground-recipient-q1': {
    n0: [
      0,
      'constraint',
      'Mike is not the requested recipient; the request specifically names Mara.',
    ],
    n1: [
      0,
      'constraint',
      'Giving all five to Mara violates the exact-two quantity and three-berry reserve.',
    ],
    n3: [0, 'constraint', 'Giving one berry to Mike changes both the recipient and quantity.'],
    n4: [0, 'constraint', 'Giving two berries to Mike changes the recipient.'],
    n5: [
      0,
      'constraint',
      'Giving three berries to Mike changes recipient, quantity and retained reserve.',
    ],
    n6: [0, 'constraint', 'Giving one berry to Keri changes both the recipient and quantity.'],
    n7: [0, 'constraint', 'Giving two berries to Keri changes the recipient.'],
    n8: [
      0,
      'constraint',
      'Giving three berries to Keri changes recipient, quantity and retained reserve.',
    ],
    n9: [
      0,
      'constraint',
      'Mara’s brother is not Mara, and one berry is not the requested quantity.',
    ],
    n10: [0, 'constraint', 'Mara’s brother is not the named recipient Mara.'],
    n11: [
      0,
      'constraint',
      'Giving three berries to Mara’s brother changes recipient, quantity and reserve.',
    ],
    n12: [
      0,
      'constraint',
      'Mara’s apprentice is not Mara, and one berry is not the requested quantity.',
    ],
    n13: [0, 'constraint', 'Mara’s apprentice is not the named recipient Mara.'],
    n14: [
      0,
      'constraint',
      'Giving three berries to Mara’s apprentice changes recipient, quantity and reserve.',
    ],
    n15: [0, 'constraint', 'Giving one berry to Lena changes both the recipient and quantity.'],
    n16: [0, 'constraint', 'Giving two berries to Lena changes the recipient.'],
    n17: [
      0,
      'constraint',
      'Giving three berries to Lena changes recipient, quantity and retained reserve.',
    ],
    n18: [0, 'constraint', 'Giving one berry to Tovan changes both the recipient and quantity.'],
    n19: [0, 'constraint', 'Giving two berries to Tovan changes the recipient.'],
    n20: [
      0,
      'constraint',
      'Giving three berries to Tovan changes recipient, quantity and retained reserve.',
    ],
    n21: [0, 'constraint', 'Giving one berry to Ossa changes both the recipient and quantity.'],
    n22: [0, 'constraint', 'Giving two berries to Ossa changes the recipient.'],
    n23: [
      0,
      'constraint',
      'Giving three berries to Ossa changes recipient, quantity and retained reserve.',
    ],
    n24: [0, 'constraint', 'Giving one berry to Neri changes both the recipient and quantity.'],
    n25: [0, 'constraint', 'Giving two berries to Neri changes the recipient.'],
    n26: [
      0,
      'constraint',
      'Giving three berries to Neri changes recipient, quantity and retained reserve.',
    ],
    n27: [0, 'constraint', 'Giving one berry to Deni changes both the recipient and quantity.'],
    n28: [0, 'constraint', 'Giving two berries to Deni changes the recipient.'],
    n29: [
      0,
      'constraint',
      'Giving three berries to Deni changes recipient, quantity and retained reserve.',
    ],
    n30: [0, 'constraint', 'Giving one berry to Mira changes both the recipient and quantity.'],
    n31: [0, 'constraint', 'Giving two berries to Mira changes the recipient.'],
    n32: [
      0,
      'constraint',
      'Giving three berries to Mira changes recipient, quantity and retained reserve.',
    ],
    n33: [
      0,
      'constraint',
      'Maria is a different named recipient from Mara, and one berry changes the quantity.',
    ],
    n34: [0, 'constraint', 'Maria is not the named recipient Mara.'],
    n35: [
      0,
      'constraint',
      'Giving three berries to Maria changes recipient, quantity and retained reserve.',
    ],
    n36: [
      0,
      'constraint',
      'An unnamed visitor is not the specified Mara, and one berry changes the quantity.',
    ],
    n37: [0, 'constraint', 'An unnamed visitor is not the specified recipient Mara.'],
    n38: [
      0,
      'constraint',
      'Giving three berries to the visitor changes recipient, quantity and reserve.',
    ],
    n39: [
      0,
      'constraint',
      'The person beside Mara is not Mara, and one berry changes the quantity.',
    ],
    n40: [0, 'constraint', 'The person standing beside Mara is not the specified recipient Mara.'],
    n41: [
      0,
      'constraint',
      'Giving three berries to the person beside Mara changes recipient, quantity and reserve.',
    ],
    interpret: [
      50,
      'goal-shortfall',
      'Interpretation is a safe fallback, but an exact quantity-and-recipient command is already supplied.',
    ],
    unresolved: [
      25,
      'goal-shortfall',
      'Declining selection avoids a wrong transfer, but overlooks the exact offered command.',
    ],
  },
  'act-ground-follow-q1': {
    n0: [
      0,
      'constraint',
      'The visibly indefinite command omits both the requested secrecy and dusk stop while claiming exact fulfillment.',
    ],
    n1: [
      0,
      'constraint',
      'Moving to one present position is not following and omits secrecy and the requested duration.',
    ],
    unresolved: [
      50,
      'goal-shortfall',
      'It avoids inventing stealth, but a supported follow-until subset can be interpreted and its omission disclosed.',
    ],
  },
  'act-ground-sequence-q1': {
    n0: [
      0,
      'constraint',
      'Emptying the basket directly violates the explicit instruction to preserve its contents.',
    ],
    n1: [
      0,
      'constraint',
      'Sitting before putting down the basket reverses the explicitly requested sequence.',
    ],
    interpret: [
      50,
      'goal-shortfall',
      'Interpretation is safe but unnecessary because the exact supported sequence is already offered.',
    ],
    unresolved: [
      25,
      'goal-shortfall',
      'Refusal avoids a wrong sequence but overlooks the exact offered composite command.',
    ],
  },
  'act-ground-request-control-q1': {
    n0: [
      0,
      'constraint',
      'Making Mike carry without asking violates the requested voluntary invitation.',
    ],
    n1: [
      25,
      'goal-shortfall',
      'Carrying Ada’s own basket can move it, but does not ask Mike whether he wants to help.',
    ],
    interpret: [
      50,
      'goal-shortfall',
      'Interpretation is safe but the exact voluntary ask command is already supplied.',
    ],
    unresolved: [
      25,
      'goal-shortfall',
      'No new mechanic or missing information prevents selecting the supplied request command.',
    ],
  },
  'act-revise-deadline-q1': {
    exact: [0, 'constraint', 'Indefinite following does not preserve the explicit dusk stop.'],
    tolerable: [
      0,
      'constraint',
      'The missing stop is neither disclosed nor established as nonessential.',
    ],
    reject: [
      50,
      'goal-shortfall',
      'Rejecting avoids unauthorized longer work, but asking preserves the possibility of a useful accepted revision.',
    ],
  },
  'act-revise-style-q1': {
    ask: [
      50,
      'goal-shortfall',
      'Asking is safe but redundant because the actor explicitly accepts any safe supported path.',
    ],
    reject: [
      25,
      'goal-shortfall',
      'Rejecting discards a route that the actor explicitly made acceptable.',
    ],
  },
  'act-revise-gift-q1': {
    exact: [
      0,
      'constraint',
      'Taking Mara’s cord reverses both ownership direction and intended recipient.',
    ],
    tolerable: [
      0,
      'constraint',
      'The reversed transfer is not a disclosed nonessential style difference.',
    ],
    ask: [
      50,
      'goal-shortfall',
      'Asking before execution protects consent, but the supplied proposal is a contradictory transfer that should be rejected.',
    ],
  },
  'act-revise-price-q1': {
    exact: [0, 'constraint', 'Charging a coin contradicts the explicit no-spending requirement.'],
    tolerable: [
      0,
      'constraint',
      'The material cost change is not reported and cannot be treated as a nonessential braid omission.',
    ],
  },
  'act-body-hands-q1': {
    chop: [0, 'constraint', 'Both compatible hands are occupied and the required axe is not held.'],
    pretend: [
      0,
      'constraint',
      'Carrying an axe in a closed basket does not satisfy the held-tool prerequisite.',
    ],
  },
  'act-body-recovery-q1': {
    strike: [
      0,
      'constraint',
      'Six seconds of current hand recovery still block the strike after guard stops.',
    ],
    new: [
      0,
      'constraint',
      'Restarting guard is not an offered way to erase the independently continuing recovery.',
    ],
  },
  'act-body-range-q1': {
    hit: [
      0,
      'constraint',
      'The target is currently eight metres away, beyond the supplied two-metre contact reach.',
    ],
    invent: [
      0,
      'constraint',
      'Declaring eight-metre club reach contradicts the explicitly supplied reach.',
    ],
  },
  'act-body-output-q1': {
    cook: [
      0,
      'constraint',
      'The failed fishing result supplied no raw fish, which cooking requires.',
    ],
    claim: [
      0,
      'unsupported-evidence',
      'An ended unsuccessful fishing attempt did not produce a meal.',
    ],
  },
  'act-plan-miss-q1': {
    harvest: [0, 'constraint', 'The strike missed and no eligible corpse exists to harvest.'],
    done: [
      0,
      'unsupported-evidence',
      'No edible portion was obtained, so the food objective remains unmet.',
    ],
  },
  'act-plan-consumed-q1': {
    transfer: [
      0,
      'constraint',
      'Cord C was consumed in the basket repair and is not available to transfer.',
    ],
    done: [0, 'unsupported-evidence', 'Repairing Ada’s basket was not delivery of a cord to Mara.'],
  },
  'act-plan-partial-q1': {
    restart: [
      0,
      'constraint',
      'Three additional accepted cords after the first would exceed the exact-three delivery, and two ready cords remain.',
    ],
    done: [0, 'unsupported-evidence', 'Only one of the three required cords has been accepted.'],
  },
  'act-plan-complete-q1': {
    more: [
      25,
      'goal-shortfall',
      'More cord can be made, but no current need supports restarting the already fulfilled promise.',
    ],
    deny: [
      0,
      'unsupported-evidence',
      'The retained record explicitly establishes acceptance of all three cords.',
    ],
  },
};
