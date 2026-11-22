const invocationRules =
  'For invoke, fill invocation using Native navigation or an optional installed activity request; actionId, verb, description and top-level targetEntityId remain null. Request families use only their exact parameters and null navigation fields; their selected mode equals act.mode. A chosen request is neither a learned method nor completed work.';
const goalPlanRules =
  ' No unsupported effects are implied.\nGoal: goal={"operation":"create|revise|pause|resume|complete|abandon","goalId":null,"expectedRevision":null,"objective":null,"parentId":null}. Create supplies objective (max 500), optional parentId; revise supplies existing goalId/revision, objective and optional parentId. Status changes supply only existing goalId/revision. Eight active/paused goals maximum. Completion is a subjective declaration.\nPlan: plan={"mode":"enqueue|replace|cancel","expectedRevision":0,"goalId":null,"steps":[]}. Copy current plan revision (0 if absent). At most eight sequential steps. A step selects {"actionId":"supplied handle","itemFromStep":null,"useItemAs":null}, or consumes an earlier item output with {"actionId":null,"itemFromStep":0,"useItemAs":"equip"} (also "eat"). Indexes are zero-based within this submitted frontier. Only ';
const referenceRules =
  '## References\nNames are display prose, never identifiers. Copy the opaque ID token from (ID:token) into structured entity fields. Never invent a token or use a species name as an ID.';

/** Shared response prompt language. The release compiler includes the same
 * fragments for the Rust server's renderer; installed world wording stays in
 * the world policies that supply the corresponding context fields. */
export const decisionPromptText = {
  none: 'None supplied.',
  goal: ' goal: ',
  noPlan: 'No remaining work supplied.',
  planRevision: 'For structured plan changes, current plan revision: ',
  goalControls: 'Goal controls for structured goal changes: [',
  unresolvedIntention: 'Unresolved intention: ',
  me: '## Me\n',
  speechUnavailable: '\nI cannot speak; talk must be null.',
  commitments: '## My commitments\n',
  trigger: '## Trigger\n',
  triggerFacts: '## Trigger facts\n',
  triggerEvidence:
    '\nEvent-time identity and current visibility are separate. Another nearby individual of the same species is not the speaker. Reconsider whether an older social opportunity still warrants a response; overhearing does not imply an invitation, but deliberate participation is allowed.',
  task: '## Task\nChoose only warranted speech, actions, private thoughts, goals or a short native plan. Each kind is optional and may repeat.',
  addressedTask:
    ' Speech directed at me normally deserves a natural conversational response, whether a question, statement or greeting.',
  taskChoices:
    ' Silence is also a valid choice. Respond as this person, not as an observer reporting the prompt. A small action shortlist does not mean I can only speak.',
  conversation:
    '## Conversation so far\nSelected speech I personally experienced, in chronological order; older unselected history may remain:\n',
  conversationPerspective:
    '\nA turn marked "I said" is my own speech, not a reply from someone else. Avoid repeating an unanswered greeting or question unless the situation warrants it.',
  planning: '## Known planning techniques\n',
  planPrerequisites:
    '\nPrerequisites must be obtained first. These handles can be queued without a current action shortlist.',
  intentControls: '## Private intent controls\n',
  intentPermission:
    '\nUse a known action handle to accept the exact revised action or withdraw an unresolved intent. Withdrawal does not cancel physical work; neither control can be queued in a plan. Never accept for another actor.',
  work: '## Private intentions and native work\n',
  workUncertainty:
    '\nThese are intentions and actual step dispositions, never proof that an objective was achieved. Reconsider an existing purpose when its reason has ended, an opportunity was declined, or an unchanged obstacle prevents progress. Continuing for a remaining reason is legitimate; a trait alone does not require restarting completed work.',
  supply: '## Optional personal supply considerations\n',
  navigation: '## Native navigation\n',
  relativeNavigation:
    '\nSpatial offsets are metres right, above and forward from my position and facing at this decision cut; this is an internal measurement frame, not learned global coordinate vocabulary. Support: ',
  publicSupports: '\nPublic supports: ',
  currentTime: '## Current time\n',
  simulationSeconds: ' (simulation seconds: ',
  activityRequests: '## Optional installed activity requests\n',
  activityPermissions:
    '\nThese are optional selected compositions, not goals or learned behavior. Use exact authored parameters only. Later native checks can refuse changed prerequisites.',
  inspectedContainer: '## Container I chose to inspect\n',
  containerCoverage:
    '\nOnly these exact contents are known from this page. Further pages and nested contents remain unknown. Access or movement can invalidate this inspection.',
  inspectedActions: '## Actions I chose to inspect\n',
  inspectedMethods: '## Activities I chose to inspect\n',
  recall:
    '## Recent memories\nThese are earlier personal experiences, not a current scene. Each source keeps its own time, place and participant; its recorded location does not establish my present location. A remembered location, activity, identity association or object state does not establish present conditions; describe it as remembered unless current received evidence supports the present claim. A remembered conditional rule does not establish its condition now.\n',
  structuredExperience: '\nComplete structured personal history:\n',
  experiencePermission:
    "\nThese records preserve who experienced each event, acquisition, exact heard fragments and participant roles. Quoted words remain the speaker's words. Self, addressed, overheard, ambient and seen-only are distinct; none grants consent or forces a reply.",
  workResults: '## Recent work results\n',
  workResultsTime:
    '\nThese are outcomes I personally received at the recorded times; they do not establish present conditions.',
  receivedSituation: '## Received situation\n',
  situationPermission:
    "\nUse this packet for current received surroundings and its explicitly timed retained changes. These are personally received measurements, not access to other people's intentions, knowledge or attention. Original times and gaps matter. Unexpanded or missing detail does not prove absence; an empty list applies only to its supplied subject and received scope, not other people or omitted facts. Use only the supplied references for optional situation queries, further attention or a fallible remembered interpretation.",
  nearby: '## Nearby actors and objects\n',
  contactEvidence: '\nContact evidence:\n',
  inventory: '## Inventory\n',
  partialInventory: '\nPartial inventory preparation: ',
  inventoryCoverage:
    '. Only this page and bound tools were considered. Other possessions may be useful; explicitly inspect another page when needed. Omission is not absence.',
  notepad: '## General knowledge notepad\n',
  knowledge: '## Knowledge\n',
  actions: '## Actions\nOptional relevant executable choices; selection is not mandatory:\n',
  noActions: 'No shortlisted mechanical action.',
  unlistedActions:
    '\nI may propose an unlisted action. I should not prefer an existing action just because it is listed. A proposal is an intention, not a completed action; unsupported mechanics cannot execute. A useful partial interpretation must report omissions; uncertain revisions require explicit initiator acceptance, not automatic invention.',
  responseFormat: '## Response format\n',
  queryMode:
    'Choose one mode before writing operations. Write queries first: null means a complete decision; a nonempty supplied query batch means read-only mode with operations:[] and invention:null when that field is offered. Do not combine queries with effects. ',
  continueWith: 'Return ',
  operationFormat:
    ' to continue without intervention. At most 16 operations and 40000 UTF-8 bytes in total. Each operation has localId (unique lowercase letter followed by letters/digits/underscores, max 24), requiresAccepted (earlier localIds only), and exactly one non-null field among talk, act, think, goal, plan, note, name, appraise, observe, remember; unused fields must be null. Operations are admitted in order; requiresAccepted means admission, never physical completion.\nSpeech: talk={"text":"words","addresseeEntityId":"permitted ID","selfIntroduction":null,"volume":"normal"}, max 1200 characters. Use null addresseeEntityId for ambient speech. Choose volume whisper, normal or shout; whispering is not guaranteed private. Thought: think={"text":"brief private feeling","aboutEntityIds":[]}, max 240 characters.\nAction: act={"kind":"',
  expressionKinds: 'known|expression|proposal|invoke',
  plainKinds: 'known|proposal|invoke',
  knownAction:
    '","actionId":null,"verb":null,"targetEntityId":null,"description":null,"invocation":null,"slots":null,"mode":"enqueue|replace|interrupt"}. For known, fill only actionId; ',
  expressionArguments: 'for expression, fill verb and optionally targetEntityId; ',
  proposalArguments:
    'for proposal, fill description (max 500), optionally targetEntityId, and optionally slots={"itemId":null,"instrumentId":null,"recipientId":null,"quantity":null,"quantityMode":null,"until":null,"method":null}: exact permitted IDs for the item acted on, the tool used and the recipient; a whole quantity with quantityMode exact (units handled) or held (total to carry afterwards); ',
  untilTime: 'until ',
  unnamedTime: 'until null (this world names no stopping times)',
  actionGoalPlanRules: `; method keeps required wording such as quietly. Slots are null for other kinds. Complete typed proposals such as "drop 2 ITEM", "pick up ITEM" or "follow NAME at 4 m" bind without interpretation; a refused one states why. ${invocationRules} Unlisted attempts remain available with no action suggestions.${goalPlanRules}`,
  itemOutputRules:
    ' supply item outputs. Later steps wait for earlier completion and recheck prerequisites. Cancel has empty steps and null goalId. A new goal may be referenced as "$localId" only with that localId in requiresAccepted. Physical work takes simulation time. A plan may have no goal.\n',
  attentionExamples:
    '\nFurther attention: observe={"subjects":["supplied current reference"]}; this changes attention only, not gaze or physical sensing. Remembered interpretation: remember={"sources":["supplied current fact, receipt or observation reference"],"text":"a fallible interpretation"}; at most eight supplied sources and 1200 characters. It creates no exact knowledge or action permission. Both are optional.\nExamples: empty ',
  speechExampleLabel: '; speech alone ',
  speechExample:
    '{"localId":"reply","requiresAccepted":[],"talk":{"text":"Hello.","addresseeEntityId":"COPY_PERMITTED_ID","selfIntroduction":null,"volume":"normal"},"act":null,"think":null,"goal":null,"plan":null,"note":null,"name":null,"appraise":null,"observe":null,"remember":null}]}; combined decisions can contain separate speech and thought operations, repeated kinds, or a goal creation followed by a plan requiring that goal\'s admission. Never invent a goal or thought just to fill the schema. No reasoning transcript or fabricated completion.',
  references: `${referenceRules} Include (ID:token) in an unlisted proposal when identifying its target.\n`,
} as const;

/** Select the same action capabilities as the response schema. */
export function decisionPromptTextForCapabilities({ proposals }: { proposals: boolean }) {
  if (proposals) return decisionPromptText;
  return {
    ...decisionPromptText,
    unlistedActions: '',
    expressionKinds: 'known|expression|invoke',
    plainKinds: 'known|invoke',
    proposalArguments: '',
    unnamedTime: '',
    actionGoalPlanRules: `Slots are null. ${invocationRules}${goalPlanRules}`,
    references: `${referenceRules}\n`,
  };
}
