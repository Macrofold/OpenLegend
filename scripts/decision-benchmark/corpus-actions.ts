import {
  actionFulfillmentQuestions,
  actionGroundingQuestions,
  batchedAttentionQuestions,
  decisionQuestions,
} from '../../apps/server/src/jev-questions.js';
import { baseCognitionPolicy } from '../../packages/domain/src/worlds/base/cognition.js';
import { check, choice, noul, scene, score } from './authoring.js';
import type { BenchmarkScene } from './types.js';
import type { JsonValue } from '@open-legend/ai';

const cognitionSources = [
  'apps/server/src/jev-questions.ts',
  'docs/memory-architecture.md',
  'docs/projects/compelling-characters-feature-spec.md',
  'docs/repertoires/psychology-behavior.md',
];
const actionSources = [
  'docs/action-capabilities.md',
  'docs/agent-agency.md',
  'docs/repertoires/actions.md',
  'docs/repertoires/combat-rescue.md',
  'docs/repertoires/work-crafting.md',
];

function routed(
  id: string,
  family: string,
  title: string,
  state: Record<string, JsonValue>,
  addressed: boolean,
  route: string[],
  reflection: 'yes' | 'no',
  possibleAction: 'yes' | 'no' | undefined,
  reason: string,
): BenchmarkScene {
  const questions = decisionQuestions(addressed, 4, addressed, true);
  return scene(
    id,
    family,
    title,
    state,
    [
      check(`${id}-q1`, questions['route']!, { type: 'choice', accepted: route }, reason, {
        ambiguity: route.length > 1 ? 'multiple-valid' : 'unambiguous',
        tags: ['production-rubric', 'immediate-route'],
      }),
      check(
        `${id}-q2`,
        questions['reflection']!,
        { type: 'choice', accepted: [reflection] },
        reflection === 'yes'
          ? 'The new evidence materially bears on lasting beliefs, relationships or unresolved concerns; immediate urgency is a separate question.'
          : 'The scene supplies no new lasting relationship or belief change requiring reflection merely because an immediate choice is needed.',
        { tags: ['production-rubric', 'lasting-significance'] },
      ),
      ...(possibleAction === undefined
        ? []
        : [
            check(
              `${id}-q3`,
              questions['possibleAction'] ??
                choice(
                  'Could a physical action, visible expression, movement or interruption plausibly be relevant to the supplied trigger? Include uncertain possibilities; this decides only whether to retrieve options.',
                  {
                    yes: 'A physical response or expression is plausibly relevant.',
                    no: 'No physical response or expression is plausibly relevant.',
                  },
                ),
              { type: 'choice', accepted: [possibleAction] },
              possibleAction === 'yes'
                ? 'A physical response, visible expression or interruption is plausibly relevant. Retrieval is warranted even if no action is ultimately selected.'
                : 'This exchange is explicitly limited to private conversational clarification, with no plausible movement, practical response or visible expression now.',
              { tags: ['production-rubric', 'action-retrieval'] },
            ),
          ]),
    ],
    cognitionSources,
  );
}

const routedScenes: BenchmarkScene[] = [
  routed(
    'act-route-food',
    'reasoning-route',
    'Hungry Ada can choose a carried meal',
    {
      aboutMe:
        'I am Ada. I prefer simple food to wasteful labor. I have no food-related promise or allergy. I am taking a quiet break alone.',
      body: 'Health 100/100 points; Fullness 12/100%; Energy 76/100%. I feel famished and steady on my feet.',
      trigger: 'My hunger has become noticeable. I can decide what to do next.',
      possessions: ['Four edible wild berries, ready to eat.', 'A cord and an empty basket.'],
      candidates: {
        a: 'Eat one of my edible berries.',
        b: 'Gather more berries despite already having a ready meal.',
        c: 'Continue standing here.',
      },
      currentIntention: 'Relieve my hunger. No work is already running.',
      recall: [
        'Yesterday I ate the same kind of berries without difficulty.',
        'At noon I completed my promised cord and handed it over. That obligation is finished.',
      ],
    },
    false,
    ['level1'],
    'no',
    'yes',
    'Choosing an offered edible item needs a supplied physical choice. Hunger does not require generated language, and automatic eating is not assumed.',
  ),
  routed(
    'act-route-urgent',
    'reasoning-route',
    'A simple urgent departure',
    {
      trigger: 'A visible assailant raises a club toward my head on the river bend.',
      surroundings:
        'I am on the bend I use for evening walks. I see an unobstructed retreat point three metres behind me. The offered retreat is executable. There are no bystanders behind me.',
      currentIntention:
        'Get out of this immediate danger. No automatic defensive movement is currently running.',
      candidates: {
        a: 'Move now to the supplied clear retreat point.',
        b: 'Step toward the nearby bank to reach a loose branch.',
        c: 'Ask the assailant why they are threatening me.',
      },
      recall: [
        'I do not know this assailant or their motives.',
        'For the last fortnight I have worried about threats along my daily river walk. I began using this bend because I believed it was the safer part of the path.',
        'Yesterday I walked this same bend alone and saw no one threaten passersby.',
      ],
    },
    false,
    ['level1'],
    'yes',
    'yes',
    'An urgent choice between offered actions remains simple. This threat at the supposedly safer bend bears on the actor’s enduring concern about the daily walk.',
  ),
  routed(
    'act-route-running',
    'reasoning-route',
    'Native work is already doing the needed thing',
    {
      trigger: 'I heard the normal crackle of the fire while my chosen cooking action continues.',
      currentIntention:
        'Finish cooking my own raw portion; 12 seconds remain. Fuel, food and position are still valid. The cooking action already advances without another decision.',
      surroundings:
        'The working fire remains stable and no person has spoken to me. No unusual event or new target appeared.',
      recall: [
        'I started this same portion 18 seconds ago.',
        'I cooked successfully yesterday. Nothing in the current observation contradicts that experience.',
      ],
      speechContext:
        'The only sound was ordinary fire crackling. A physical interruption is possible but unnecessary.',
    },
    false,
    ['native'],
    'no',
    undefined,
    'Existing admitted work already covers this routine event. No new semantic choice is required to keep its progress.',
  ),
  routed(
    'act-route-treaty',
    'reasoning-route',
    'Several conflicting accounts need comparison',
    {
      trigger:
        'Mara addresses me: “Did Tovan knowingly abandon the food delivery? Explain what you actually know.”',
      recentConversation: [
        'Mara asks for an evidence-based reply rather than an immediate accusation.',
      ],
      recall: [
        'Yesterday at dusk I heard Tovan promise delivery before dawn.',
        'At dawn I saw a closed bridge, but did not witness who closed it.',
        'At breakfast Keri said Tovan had sold the food. Keri admitted not seeing a sale.',
        'At noon I personally saw Tovan return with an empty basket and a torn sleeve. I did not see what caused either.',
        'Tovan later said he left the basket at the bridge and carried the food back in cloth. I have not checked the cloth.',
      ],
      currentIntention: 'Answer honestly about conflicting evidence and what remains unknown.',
    },
    true,
    ['level3', 'level4'],
    'yes',
    'yes',
    'Several relevant conflicting accounts need careful comparison and newly composed wording. The boundary between careful and deepest reasoning is not uniquely specified.',
  ),
  routed(
    'act-talk-greeting',
    'conversation-participation',
    'An ordinary direct greeting',
    {
      trigger: 'Mike looks toward me and says, “Good afternoon, Ada. How has your day been?”',
      recentConversation: ['No reply to this greeting has yet been spoken.'],
      currentIntention: 'I am free for a short exchange and have no competing emergency.',
      recall: [
        'Mike and I exchanged ordinary greetings yesterday.',
        'I spent the morning preparing cord and the afternoon walking near the river.',
      ],
    },
    true,
    ['level2'],
    'no',
    'yes',
    'A direct ordinary greeting calls for composed language, with no difficult reasoning. A greeting gesture remains plausible.',
  ),
  routed(
    'act-talk-overheard',
    'conversation-participation',
    'A question addressed to someone else',
    {
      trigger:
        'I overhear Mike looking directly at Mara and saying, “Mara, how many reeds do you need?”',
      recentConversation: ['Mara answers Mike: “Two, thank you.”'],
      currentIntention:
        'Continue my already admitted cord preparation. No one requests my help and nothing blocks my work.',
      recall: [
        'I have no outstanding reed promise to Mike or Mara.',
        'Earlier Mara asked to handle her own materials.',
      ],
    },
    false,
    ['native'],
    'no',
    'yes',
    'This is an already answered exchange between other people. It does not require Ada to compose a reply or interrupt existing work.',
  ),
  routed(
    'act-talk-fragment',
    'conversation-participation',
    'A clipped request is not a full order',
    {
      trigger: 'A nearby voice says, “Ada, could you bring the ...” and the rest is inaudible.',
      currentIntention: 'Find out what the speaker meant before selecting a delivery.',
      surroundings:
        'I can see Mike and Mara nearby, each carrying different items. I cannot identify which voice produced the inaudible object name.',
      recall: [
        'This morning Mike mentioned a basket and Mara mentioned a cord. Neither conversation tells me what this new request meant.',
      ],
      candidates: {
        a: 'Ask which item and recipient were meant.',
        b: 'Give away my cord immediately.',
        c: 'Pretend the missing words were heard.',
      },
    },
    true,
    ['level2'],
    'no',
    'yes',
    'An ordinary clarification is enough. Missing words cannot be reconstructed into a definite request from older unrelated conversations.',
  ),
  routed(
    'act-talk-no-movement',
    'conversation-participation',
    'A quiet private clarification',
    {
      trigger:
        'While both of us rest motionless with our eyes closed, Mike quietly asks, “When you said yesterday, did you mean the morning or evening? Please just say the word; stay resting.”',
      currentIntention:
        'Give a one-word spoken clarification, remaining at rest. There is no practical task or visible expression implicated.',
      recall: ['My exact earlier sentence was “I saw the heron yesterday evening.”'],
      surroundings:
        'No object, person or hazard requires attention. This exchange specifically needs only spoken language and no gesture.',
    },
    true,
    ['level2'],
    'no',
    'no',
    'The requested one-word correction is straightforward composed speech and the supplied scene explicitly excludes any plausible accompanying physical expression.',
  ),
  routed(
    'act-reflect-betrayal',
    'lasting-reflection',
    'Calm admission changes a relationship',
    {
      trigger:
        'Mike calmly says directly to me, “I deliberately took the food you saved and lied to you yesterday. I returned it now.”',
      recall: [
        'Yesterday I directly asked Mike whether he took it and he answered no.',
        'I had trusted him to respect this particular reserve.',
        'I just observed him put the missing labeled portion back into my basket.',
      ],
      currentIntention:
        'Acknowledge what I heard now; decide later what this means for our relationship. No immediate danger exists.',
    },
    true,
    ['level2', 'level3'],
    'yes',
    'yes',
    'The reply may be simple or careful, but calm emotional presentation does not erase specific new relationship evidence.',
  ),
  routed(
    'act-reflect-repeated',
    'lasting-reflection',
    'Repeated routine thanks adds no new issue',
    {
      trigger: 'Mara again says directly to me, “Thanks for passing the same basket.”',
      recentConversation: [
        'I said “You’re welcome” after the first thanks. Her second thanks is a polite repetition.',
      ],
      recall: [
        'I handed over the basket moments ago.',
        'Mara and I have the same untroubled relationship we had before the exchange.',
      ],
      currentIntention:
        'Either offer a brief normal acknowledgement or regard the exchange as already complete.',
    },
    true,
    ['level2', 'native'],
    'no',
    'yes',
    'Routine repeated thanks does not itself warrant lasting reflection; a brief reply or treating the exchange as finished are both defensible.',
  ),
  routed(
    'act-reflect-important',
    'lasting-reflection',
    'Important news is not automatically difficult',
    {
      trigger:
        'Mara says, “Your sister arrived safely. She is at the public fire and asks whether you want to see her.”',
      aboutMe:
        'I am Ada. I love my sister and had worried about her journey for several days. I know Mara as a reliable messenger, while remembering this is still testimony.',
      recall: [
        'I have been awaiting my sister’s safe arrival.',
        'I last saw her before she left on this journey.',
      ],
      currentIntention:
        'Answer Mara’s simple invitation. I may want to walk to the fire. I need not solve a mystery to give that reply.',
    },
    true,
    ['level2'],
    'yes',
    'yes',
    'A normal answer can be simple while the news materially bears on an enduring concern.',
  ),
  routed(
    'act-reflect-routine-danger',
    'lasting-reflection',
    'Routine work noise is loud but familiar',
    {
      trigger:
        'Mike raises his voice over ordinary wood chopping: “Ada, please move the empty basket away from the path.”',
      surroundings:
        'There is no threat; the loudness is necessary to be heard. A supplied move-basket option uses my own empty basket.',
      recall: [
        'Mike explained that people carrying logs use this path. I already agreed to keep it clear.',
        'The same ordinary reminder occurred this morning with no new relationship information.',
      ],
      currentIntention: 'Keep my basket out of the working path.',
      candidates: {
        a: 'Move my empty basket to the supplied safe place.',
        b: 'Ask for a long explanation despite understanding the request.',
      },
    },
    true,
    ['level1', 'level2'],
    'no',
    'yes',
    'An offered physical response or a brief acknowledgement suffices. Loudness alone adds neither lasting significance nor deep reasoning difficulty.',
  ),
];

function grounded(
  id: string,
  title: string,
  request: string,
  commands: string[],
  accepted: string[],
  detail: Record<string, JsonValue>,
  proposition: string,
  truth: boolean,
  rubricQuestion: string,
  rubric: string[],
  interval: [number, number],
  rationale: string,
) {
  return scene(
    id,
    'exact-action-meaning',
    title,
    {
      trigger: `I want to act: ${request}`,
      request,
      offeredCommands: commands,
      ...detail,
    },
    [
      check(
        `${id}-q1`,
        actionGroundingQuestions(commands)['route']!,
        { type: 'choice', accepted },
        rationale,
        { tags: ['production-rubric', 'semantic-completeness'] },
      ),
      check(
        `${id}-q2`,
        noul(proposition),
        { type: 'noul', min: truth ? 0.5 : 0, max: truth ? 1 : 0.49, label: truth },
        rationale,
        { difficulty: 'clear' },
      ),
      check(
        `${id}-q3`,
        score(rubricQuestion, rubric),
        { type: 'score', min: interval[0], max: interval[1] },
        rationale,
      ),
    ],
    actionSources,
  );
}

const groundingScenes = [
  grounded(
    'act-ground-recipient',
    'Same object, wrong recipient',
    'Give exactly two of my berries to Mara, keeping the other three.',
    [
      'Give two of my berries to Mike.',
      'Give all five of my berries to Mara.',
      'Give exactly two of my berries to Mara.',
    ],
    ['n2'],
    {
      possessions: ['Exactly five edible berries.'],
      recall: ['Mara asked for two; Mike did not request a gift.'],
      currentIntention: 'Keep three for tomorrow.',
    },
    'Would giving all five berries to Mara fulfill the complete request?',
    false,
    'How many of the three explicit requirements (two berries, Mara as recipient, keeping three) does command 3 satisfy? Use the supplied count rubric.',
    ['None', 'One requirement', 'Two requirements', 'All three requirements'],
    [3, 3],
    'Only the third command preserves recipient, exact quantity and the retained reserve.',
  ),
  grounded(
    'act-ground-follow',
    'Following is not hidden tracking',
    'Follow Mara without letting her know, stopping at dusk.',
    [
      'Follow Mara visibly with no specified stopping time.',
      'Move to Mara’s presently visible position.',
    ],
    ['interpret'],
    {
      worldRules:
        'Ordinary follow is supported while the target remains perceived. Stealth is not installed. An explicit until-time may be supplied through structured interpretation. Useful supported subsets can be proposed but must report omissions.',
      recall: ['Mara is presently visible on the path.'],
      currentTime: 'Day 6, one hour before dusk.',
    },
    'Does ordinary following itself grant tracking of Mara after she disappears from perception?',
    false,
    'How many meaningful requested conditions are absent from offered command 1: hidden approach and stopping at dusk?',
    ['Neither condition is missing', 'One is missing', 'Both are missing'],
    [2, 2],
    'The ordinary command omits both secrecy and the stop. A useful subset needs interpretation and explicit acceptance, not claimed exactness.',
  ),
  grounded(
    'act-ground-sequence',
    'Order and negation both matter',
    'Put down my loaded basket before sitting; do not empty it.',
    [
      'Empty the basket, then sit.',
      'Sit, then put the loaded basket down.',
      'Put the loaded basket down, then sit.',
    ],
    ['n2'],
    {
      possessions: ['My basket contains four berries and one cord.'],
      worldRules:
        'These three already offered composite commands are supported; putting down a basket preserves its contents.',
      recall: ['I want the contents together for later collection.'],
    },
    'Would sitting before putting the basket down preserve the requested action order?',
    false,
    'Rate command 1 against the request using this semantic-completeness rubric.',
    [
      'Contradicts an explicit restriction',
      'Useful but omits a condition',
      'Fulfills all conditions',
    ],
    [0, 0],
    'Command 3 alone preserves both the before relation and the prohibition on emptying.',
  ),
  grounded(
    'act-ground-request-control',
    'Asking another person is not commanding their body',
    'Ask Mike whether he would like to carry my basket to the fire.',
    [
      'Make Mike carry my basket without asking.',
      'Carry my own basket to the fire.',
      'Ask Mike whether he would like to carry my basket to the fire.',
    ],
    ['n2'],
    {
      recentConversation: ['Mike has not accepted any carrying request.'],
      currentIntention: 'Invite help while leaving him free to decide.',
      worldRules:
        'The supplied ask command speaks a request. It does not make the addressee accept or execute it.',
    },
    'Does selecting the ask command establish that Mike accepted the work?',
    false,
    'How many other people have explicitly accepted this carrying task in the supplied evidence?',
    ['None', 'One', 'Two or more'],
    [0, 0],
    'Asking preserves the voluntary invitation; neither forcing Mike nor doing the task oneself expresses the original request.',
  ),
];

// Current action menus can contain dozens of similar choices. Preserve that actual shape
// without turning independent candidate ratings into a Cartesian-product question.
const largeChoiceScene = groundingScenes[0]!;
const additionalRecipients = [
  'Mike',
  'Keri',
  'Mara’s brother',
  'Mara’s apprentice',
  'Lena',
  'Tovan',
  'Ossa',
  'Neri',
  'Deni',
  'Mira',
  'Maria',
  'the unnamed visitor',
  'the person standing beside Mara',
];
const expandedCommands = [
  ...(largeChoiceScene.state['offeredCommands'] as string[]),
  ...additionalRecipients.flatMap((recipient) =>
    [1, 2, 3].map((quantity) => `Give exactly ${quantity} of my berries to ${recipient}.`),
  ),
];
largeChoiceScene.state['offeredCommands'] = expandedCommands;
largeChoiceScene.cases[0]!.question = actionGroundingQuestions(expandedCommands)['route']!;
largeChoiceScene.cases[0]!.tags.push('42-native-commands-44-choices');

function fulfillment(
  id: string,
  title: string,
  request: string,
  behavior: string,
  omitted: string[],
  accepted: string[],
  proposition: string,
  truth: boolean,
  reason: string,
  scope: BenchmarkScene['scope'] = 'current-contract',
) {
  return scene(
    id,
    'revised-action-acceptance',
    title,
    {
      request,
      decodedNativeBehavior: behavior,
      omitted,
      trigger:
        'Compare the proposed executable revision with what I actually requested before I accept it.',
      currentIntention:
        'Preserve recipient, duration, costs and meaningful restrictions of my request.',
      originalRequest: request,
      proposal: { behavior, omitted },
      ...(scope === 'hypothetical-world'
        ? {
            worldRules:
              'This hypothetical authored workshop supports an explicit one-coin visit fee. Coins and workshop charging are supplied future-world rules, not claims about the current bundled game.',
          }
        : {}),
      recall: [
        'No other agreement changes the meaning of this request. The proposal’s fluency does not prove it fulfills the request.',
      ],
    },
    [
      check(
        `${id}-q1`,
        actionFulfillmentQuestions()['fulfillment']!,
        { type: 'choice', accepted },
        reason,
        {
          tags: ['production-rubric', 'approval-boundary'],
          ambiguity: accepted.length > 1 ? 'multiple-valid' : 'unambiguous',
        },
      ),
      check(
        `${id}-q2`,
        noul(proposition),
        { type: 'noul', min: truth ? 0.5 : 0, max: truth ? 1 : 0.49, label: truth },
        reason,
      ),
      check(
        `${id}-q3`,
        score(
          'How many omissions are explicitly listed in proposal.omitted? Count the report, not omissions you infer yourself.',
          ['None', 'One', 'Two', 'Three or more'],
        ),
        { type: 'score', min: Math.min(3, omitted.length), max: Math.min(3, omitted.length) },
        'The omission report can be counted independently of whether it is complete.',
        { difficulty: 'clear' },
      ),
    ],
    actionSources,
    scope,
  );
}
const fulfillmentScenes = [
  fulfillment(
    'act-revise-deadline',
    'A missing deadline silently extends work',
    'Follow Mara until dusk.',
    'Follow Mara indefinitely while visible.',
    [],
    ['ask'],
    'Does the omission report explicitly disclose the missing dusk stopping condition?',
    false,
    'Removing the stop may materially lengthen activity and the omission is not reported; acceptance is needed.',
  ),
  fulfillment(
    'act-revise-style',
    'Disclosed nonessential wording is tolerable',
    'Move to the fire; I would prefer an elegant path, but any safe supported route is acceptable.',
    'Move to the fire on the supported safe path.',
    ['No guarantee of an elegant-looking path.'],
    ['tolerable', 'exact'],
    'Does the requested wording explicitly allow any safe supported route?',
    true,
    'The sole difference is disclosed and the initiator explicitly made it nonessential; exactness versus tolerable style can reasonably differ.',
  ),
  fulfillment(
    'act-revise-gift',
    'A gift becomes a theft',
    'Offer my spare cord to Mara, keeping it if she declines.',
    'Transfer Mara’s cord to me immediately.',
    ['No offer or acceptance step.'],
    ['reject'],
    'Does the decoded behavior preserve the requested direction of transfer?',
    false,
    'The recipient and ownership direction are reversed; this is a contradiction rather than a useful revision.',
  ),
  fulfillment(
    'act-revise-price',
    'A hidden charge changes the request',
    'Prepare one cord using my existing fibers without spending money.',
    'Prepare one cord using my fibers and charge one coin for a workshop visit.',
    ['The cord will have no decorative braid.'],
    ['ask', 'reject'],
    'Is the added coin charge disclosed in the omission list?',
    false,
    'An unreported charge contradicts an explicit cost constraint. Asking for a changed agreement or rejecting this proposal is defensible; exact or tolerable is not.',
    'hypothetical-world',
  ),
];

function embodiment(
  id: string,
  title: string,
  state: Record<string, JsonValue>,
  criteria: Record<string, string>,
  accepted: string[],
  proposition: string,
  truth: boolean,
  rationale: string,
) {
  return scene(
    id,
    'body-equipment-prerequisites',
    title,
    state,
    [
      check(
        `${id}-q1`,
        choice(
          'Which supplied next step respects the actual body, equipment and current prerequisites?',
          criteria,
        ),
        { type: 'choice', accepted },
        rationale,
      ),
      check(
        `${id}-q2`,
        noul(proposition),
        { type: 'noul', min: truth ? 0.5 : 0, max: truth ? 1 : 0.49, label: truth },
        rationale,
      ),
      check(
        `${id}-q3`,
        score(
          'Rate whether the requested immediate target action can execute now under the supplied prerequisites. Do not rate its desirability.',
          [
            'Blocked by an explicit current prerequisite',
            'Prerequisites unresolved',
            'All supplied prerequisites satisfied',
          ],
        ),
        { type: 'score', min: 0, max: 0 },
        rationale,
      ),
    ],
    [...actionSources, 'docs/repertoires/bodies-species.md', 'docs/repertoires/objects.md'],
  );
}
const embodimentScenes = [
  embodiment(
    'act-body-hands',
    'A useful tool is not currently held',
    {
      trigger: 'I want to start chopping the supplied branch with my axe.',
      possessions: ['A carried axe, currently in my closed basket. A cup in each hand.'],
      worldRules:
        'This offered chopping action requires the axe held in a free compatible hand. My two compatible hands are occupied. Putting down a cup and taking out the axe are available steps.',
      recall: [
        'I chopped successfully yesterday while holding the axe. That does not establish my current hand arrangement.',
      ],
    },
    {
      prepare: 'Put down one cup, then take and hold the axe.',
      chop: 'Start axe chopping immediately without changing equipment.',
      pretend: 'Treat the axe as held because it is somewhere in my possessions.',
    },
    ['prepare'],
    'Does carrying the axe inside the basket satisfy the explicitly required held-axe prerequisite?',
    false,
    'The tool exists but is not held; one hand must be freed and the axe equipped before chopping.',
  ),
  embodiment(
    'act-body-recovery',
    'Stopping defense does not erase bodily recovery',
    {
      trigger: 'I stopped my guard activity and want to strike now.',
      body: 'My hand recovery still has six seconds remaining. This is a current body condition, not the stopped guard activity.',
      worldRules:
        'A strike requires this hand to have finished recovery. Stopping an activity does not clear recovery. Waiting is available.',
      possessions: ['A properly held club.'],
      recall: ['I stopped guarding one second ago. No record says the six-second recovery ended.'],
    },
    {
      wait: 'Wait for the remaining recovery before striking.',
      strike: 'Strike now because guard was stopped.',
      new: 'Restart guard solely to erase the recovery timer.',
    },
    ['wait'],
    'Does stopping guard by itself establish that the hand has recovered?',
    false,
    'An activity ending and the body recovering are distinct; the explicit remaining recovery blocks an immediate strike.',
  ),
  embodiment(
    'act-body-range',
    'A remembered target is beyond offered reach',
    {
      trigger: 'I want to hit the visible wolf with my held club.',
      surroundings:
        'The wolf is eight metres away across clear ground; my club’s supplied contact reach is two metres. I am not in contact range.',
      worldRules:
        'The current requested contact strike requires range no greater than two metres. A supported move to a safe observed point is offered; future hit success is never guaranteed.',
      recall: ['The wolf stood one metre away earlier, before it walked away.'],
    },
    {
      approach: 'Consider the supplied approach before any later fresh strike check.',
      hit: 'Commit a contact strike now using the earlier location.',
      invent: 'Assert that the club has eight-metre reach.',
    },
    ['approach'],
    'Does the earlier one-metre observation override the current eight-metre observation for an immediate strike?',
    false,
    'The current range exceeds the supplied reach; old proximity cannot authorize a present strike.',
  ),
  embodiment(
    'act-body-output',
    'A cooking attempt needs actual food',
    {
      trigger: 'I want to cook the fish I just tried to catch.',
      possessions: ['A hook, dry fuel and an empty basket. No fish or other raw food.'],
      recall: [
        'My recorded fishing attempt ended: no fish caught.',
        'Someone said “You finished fishing, so supper must be ready.” I did not observe a meal.',
      ],
      worldRules:
        'The offered fish-cooking action requires an actual raw fish in my permitted possessions. A completed failed fishing attempt creates none.',
    },
    {
      find: 'Seek or catch actual raw food before cooking it.',
      cook: 'Cook the nonexistent catch now.',
      claim: 'Declare the meal produced because fishing ended.',
    },
    ['find'],
    'Does completion of the recorded fishing attempt establish that a fish was produced?',
    false,
    'The actual output was empty; a completed attempt and a successful result are not interchangeable.',
  ),
];

function values(
  id: string,
  title: string,
  state: Record<string, JsonValue>,
  candidates: Record<string, string>,
  labels: boolean[],
) {
  const questions = batchedAttentionQuestions(
    Object.keys(candidates),
    'choose-action',
    baseCognitionPolicy().actionGuidance,
  );
  return scene(
    id,
    'needs-values-and-enough',
    title,
    {
      attentionPolicy: baseCognitionPolicy().actionGuidance.reasons,
      candidates,
      ...state,
    },
    Object.keys(candidates).map((key, index) => {
      const label = labels[index]!;
      return check(
        `${id}-q${index + 1}`,
        questions[key]!,
        { type: 'noul', min: label ? 0.5 : 0, max: label ? 1 : 0.49, label },
        label
          ? 'This option has a current supplied reason and available prerequisites; material production is not required.'
          : 'The option has no supplied remaining purpose, violates a known boundary or needlessly restarts work.',
        { tags: ['production-rubric', 'authored-action-guidance'] },
      );
    }),
    [
      ...cognitionSources,
      'packages/domain/src/worlds/base/cognition.ts',
      'docs/repertoires/needs.md',
      'docs/repertoires/arts-leisure.md',
      'docs/repertoires/traits.md',
    ],
  );
}
const valueScenes = [
  values(
    'act-values-river',
    'A quiet afternoon can be enough',
    {
      aboutMe:
        'I am Ada. I enjoy watching river birds and value quiet time. I have finished my promised work and have no current use for additional stone.',
      body: 'Health 100/100 points; Fullness 78/100%; Energy 71/100%. I am comfortable and have no painful condition.',
      currentIntention: 'I want a pleasant quiet break.',
      recall: [
        'I placed the finished cord in Mara’s hand and she accepted it.',
        'I counted six usable stones already set aside for my only planned stone task.',
      ],
    },
    {
      a: 'Watch the visible river birds for enjoyment.',
      b: 'Gather twenty more stones solely because more might someday be useful.',
      c: 'Rest quietly by the river.',
    },
    [true, false, true],
  ),
  values(
    'act-values-company',
    'Company has value and refusal has meaning',
    {
      aboutMe:
        'I am Ada. I want company after a lonely morning, and enjoy talking with Keri. I respect other people’s choices.',
      trigger:
        'Mike says “I need to work alone until dusk.” Keri says “I would enjoy a chat whenever you feel like joining me before dusk.”',
      body: 'Health 100/100 points; Fullness 68/100%; Energy 38/100%. My legs feel tired after a long walk, though I can move comfortably.',
      currentIntention:
        'I would like company and a chance to rest my legs after the walk. The afternoon is free of appointments.',
      recall: [
        'Mike already declined a conversation five minutes ago.',
        'Keri and I enjoyed talking yesterday; Keri’s new invitation is current evidence.',
      ],
    },
    {
      a: 'Join Keri for the conversation they invited before dusk.',
      b: 'Ask Mike for a conversation now while he completes his work.',
      c: 'Sit quietly by the river and rest my tired legs for a while.',
    },
    [true, false, true],
  ),
  values(
    'act-values-continue',
    'Finish remaining useful work without restarting',
    {
      currentIntention:
        'Finish the third cord length promised to Mara before dusk. Two lengths are complete; 90 seconds remain on the third, with sufficient fiber.',
      recall: [
        'Mara still needs exactly three lengths.',
        'I have already made two; the current admitted preparation retains its progress.',
      ],
      body: 'Health 100/100 points; Fullness 67/100%; Energy 62/100%. I can comfortably finish the remaining work.',
    },
    {
      a: 'Continue the already admitted third length.',
      b: 'Cancel and restart the same third length for no benefit.',
      c: 'Gather ten stones despite no current stone purpose.',
    },
    [true, false, false],
  ),
  values(
    'act-values-relieved',
    'The meal changed the reason for acting',
    {
      body: 'Current fullness is 93/100 after eating. I do not feel hungry.',
      currentIntention:
        'My earlier intention was to relieve hunger; I now reconsider it from the actual meal.',
      recall: [
        'I ate my prepared portion; the committed result raised fullness from 29 to 93.',
        'Yesterday I enjoyed practicing knot work; I still have a suitable cord and some interest.',
      ],
      possessions: [
        'A suitable practice cord. No ingredient shortage or current food delivery promise.',
      ],
    },
    {
      a: 'Start another meal solely to relieve the hunger already relieved.',
      b: 'Practice an available knot for current enjoyment.',
      c: 'Rest after the meal.',
    },
    [false, true, true],
  ),
];

function plan(
  id: string,
  title: string,
  state: Record<string, JsonValue>,
  criteria: Record<string, string>,
  accepted: string[],
  statement: string,
  truth: boolean,
  expectedStatus: number,
  reason: string,
) {
  return scene(
    id,
    'plans-actual-results',
    title,
    state,
    [
      check(
        `${id}-q1`,
        choice(
          'Which interpretation or next step preserves the actual recorded result and remaining intention?',
          criteria,
        ),
        { type: 'choice', accepted },
        reason,
      ),
      check(
        `${id}-q2`,
        noul(statement),
        { type: 'noul', min: truth ? 0.5 : 0, max: truth ? 1 : 0.49, label: truth },
        reason,
      ),
      check(
        `${id}-q3`,
        score(
          'Classify the recorded status of the original chosen objective, using only actual supplied results.',
          [
            'Not fulfilled; no successful required output',
            'Partially fulfilled; some required outcome remains',
            'Fulfilled by the actual recorded result',
          ],
        ),
        { type: 'score', min: expectedStatus, max: expectedStatus },
        reason,
      ),
    ],
    [
      'docs/action-experience.md',
      'docs/agent-agency.md',
      'docs/repertoires/automation-creators.md',
      'docs/repertoires/mechanics.md',
      'docs/repertoires/abilities-progression.md',
    ],
  );
}
const planScenes = [
  plan(
    'act-plan-miss',
    'An ended attack did not produce victory',
    {
      trigger: 'My hunting strike ended.',
      currentIntention: 'Obtain one edible portion from this hunt.',
      recall: [
        'Actual result: the strike missed; no damage or death occurred.',
        'The animal ran away and is not presently observed.',
      ],
      possessions: ['My held hunting weapon. No meat, carcass or catch.'],
      worldRules:
        'Harvesting requires a real eligible corpse. A completed attack attempt does not establish a hit or kill.',
    },
    {
      seek: 'Acknowledge the failed attempt and reconsider how to find food.',
      harvest: 'Harvest the animal as if the missed strike killed it.',
      done: 'Mark my food objective fulfilled.',
    },
    ['seek'],
    'Did the ended strike itself fulfill the objective of obtaining food?',
    false,
    0,
    'A missed strike created no harvestable corpse or edible portion.',
  ),
  plan(
    'act-plan-consumed',
    'A bound output has already been used',
    {
      trigger: 'I revisit an earlier plan to give Mara the cord I made.',
      currentIntention: 'Give Mara one usable cord.',
      recall: [
        'I completed cord C and later consumed that exact cord in repairing my basket.',
        'The repair is complete; cord C is no longer an available item.',
        'I still have enough loose fiber to prepare a replacement.',
      ],
      possessions: ['A repaired basket and loose fiber. No spare usable cord.'],
      worldRules:
        'A historical output reference identifies what was produced; it does not recreate a consumed object or authorize transferring it.',
    },
    {
      replace: 'Prepare a replacement or discuss the changed situation.',
      transfer: 'Transfer historical cord C despite its consumption.',
      done: 'Count the repair as delivery to Mara.',
    },
    ['replace'],
    'Does remembering cord C as a produced output establish that it is still available to give?',
    false,
    0,
    'The exact produced cord was consumed in a different task; the delivery objective remains unmet.',
  ),
  plan(
    'act-plan-partial',
    'One delivery leaves an exact remainder',
    {
      trigger: 'I finish the first trip of my chosen delivery.',
      currentIntention: 'Deliver exactly three cords to Mara.',
      recall: [
        'Mara accepted exactly one cord on the first trip.',
        'Two usable cords remain in my basket, already prepared. No one changed the agreed quantity.',
      ],
      possessions: ['Two finished cords in my basket.'],
      worldRules:
        'Each accepted cord counts once. Walking back does not reset the previous accepted delivery.',
    },
    {
      remaining: 'Deliver the remaining two without remaking or recounting the first.',
      restart: 'Prepare and deliver three new cords as if nothing happened.',
      done: 'Mark all three delivered because the first trip ended.',
    },
    ['remaining'],
    'Has the objective already been completely fulfilled?',
    false,
    1,
    'One accepted cord is real progress, but two still remain; continuing does not require restarting completed work.',
  ),
  plan(
    'act-plan-complete',
    'A finished purpose should not be reconstructed',
    {
      trigger: 'I reconsider what to do after the delivery.',
      currentIntention: 'My recorded chosen objective was to deliver three cords to Mara.',
      recall: [
        'I handed Mara three usable cords. She accepted all three. The delivery record names this objective.',
        'Mara said “That is all I needed.”',
        'A separate old reminder says “prepare cords for Mara”; it predates the completed delivery.',
      ],
      possessions: ['Loose leftover fiber. No other promise or current need for extra cord.'],
      body: 'Health 100/100 points; Fullness 72/100%; Energy 58/100%. A quiet break feels welcome after the delivery.',
    },
    {
      stop: 'Recognize the objective is fulfilled and choose a fresh reason before more work.',
      more: 'Restart cord production solely from the old reminder.',
      deny: 'Treat the accepted delivery as if it never occurred.',
    },
    ['stop'],
    'Do the supplied committed results establish completion of the original three-cord delivery?',
    true,
    2,
    'The exact requested quantity was accepted, and an old reminder cannot negate the later completed result.',
  ),
];

export const actionScenes: BenchmarkScene[] = [
  ...routedScenes,
  ...groundingScenes,
  ...fulfillmentScenes,
  ...embodimentScenes,
  ...valueScenes,
  ...planScenes,
];
