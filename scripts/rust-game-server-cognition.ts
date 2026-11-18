import {
  activityRequestDescriptors,
  decisionOfferDescription,
  formatObservedBodyHealth,
  itemOutputFamilies,
  knowledgePolicyInstructions,
  namedClockTimes,
  STIMULUS_POLICY,
  selectedAttentionPolicy,
  selectedActivityChoiceFormatter,
  selectedOccurrenceRules,
  selectedResponseExpressions,
  type WorldState,
} from '../packages/domain/src/index.js';
import {
  JUDGMENT_MAX_CHARACTERS,
  JUDGMENT_STATE_QUESTION_CHARACTERS,
} from '../packages/ai/src/index.js';
import {
  boundResponseSchema,
  COGNITION_VERSION,
  decisionAppraisalSchema,
  RESPONSE_INSTRUCTIONS,
} from '../apps/server/src/cognition-contracts.js';
import { CONTEXT_BYTE_LIMIT } from '../apps/server/src/context.js';
import { decisionActionAttentionRequest } from '../apps/server/src/attention-request.js';
import {
  formatCandidateDetails,
  formatCandidateTemporary,
} from '../apps/server/src/candidate-description.js';
import { ACTIVITY_COVERAGE } from '../apps/server/src/decision-activity-facts.js';
import { decisionPromptText } from '../apps/server/src/decision-prompt-text.js';
import {
  SITUATION_QUERY_INSTRUCTIONS,
  situationResponseJsonSchema,
} from '../apps/server/src/decision-situation-query.js';
import { decisionQuestions, LEVEL1_POLICY } from '../apps/server/src/jev-questions.js';
import { navigationInstructions } from '../apps/server/src/navigation-contracts.js';
import { INTAKE_LIMITS } from '../apps/server/src/actor-work.js';
import { NPC_INTAKE_SELECTION } from '../apps/server/src/native-npc-intake.js';
import { RECORD_ACTOR_PATHS } from '../apps/server/src/world-record-schema.js';

// These build-time tokens are replaced by request-scoped aliases issued by
// the same native capture used for effects. No tokens are model-addressable.
const references = {
  entity: '@rgs:entity',
  action: '@rgs:action',
  knowledge: '@rgs:knowledge',
  identity: '@rgs:identity',
  physical: '@rgs:physical',
  attention: '@rgs:attention',
  retention: '@rgs:retention',
};

function choiceText(world: WorldState) {
  const name = { name: '@name', nameForm: 'proper' as const };
  const description = (input: Parameters<typeof decisionOfferDescription>[0]) =>
    decisionOfferDescription(input).description;
  const activity = selectedActivityChoiceFormatter(world);
  return {
    activities: description({ kind: 'activities' }),
    inspection: description({ kind: 'inspection' }),
    continuation: [
      description({ kind: 'continuation', actionType: '@action', planPending: false }),
      description({ kind: 'continuation', planPending: true }),
      description({ kind: 'continuation', planPending: false }),
    ],
    follow: description({ kind: 'follow', target: name }),
    status: [
      description({ kind: 'status', label: '@label' }),
      description({ kind: 'status', label: '@label', targetName: '@name' }),
    ],
    approach: description({
      kind: 'approach',
      targetDescription: '@name',
      distance: '@distance',
      reach: 19759,
    }).replace('19759', '@reach'),
    probe: description({ kind: 'probe', direction: '@direction' }),
    strikes: Object.values(world.nativeStrikes ?? {}).map((definition) =>
      [false, true].map((hunting) =>
        description({ kind: 'natural-strike', target: name, definition, hunting }),
      ),
    ),
    probes: selectedOccurrenceRules(world).response.offers.probes.map((probe) => probe.direction),
    activations: world.statusEffectPolicy.definitions.map((entry) => entry.actions ?? null),
    activity: {
      camp: activity({ kind: 'camp-own' }),
      hands: activity({ kind: 'hands', label: '@label' }),
      person: activity({ kind: 'person', name }),
    },
    transitions: Object.fromEntries(
      (['continue', 'replace', 'interrupt', 'enqueue'] as const).map((transition) => [
        transition,
        formatCandidateDetails('', transition, true, undefined, undefined),
      ]),
    ),
    target: [false, true].map((withHealth) =>
      formatCandidateDetails('', 'continue', false, undefined, {
        description: '@name',
        health: withHealth ? '@health' : '',
        distance: 19759,
      }).replace('19759.0', '@distance'),
    ),
    temporary: [undefined, 19759].map((nextAt) =>
      formatCandidateTemporary('', { message: '@reason', nextAt }).replace('19759', '@next'),
    ),
    health: [
      formatObservedBodyHealth({ name: '@attr', value: 6543 } as Parameters<
        typeof formatObservedBodyHealth
      >[0]),
      formatObservedBodyHealth({ name: '@attr', value: 6543, max: 19759 } as Parameters<
        typeof formatObservedBodyHealth
      >[0]),
      formatObservedBodyHealth({ name: '@attr', value: 6543, max: 19759, min: 19757 } as Parameters<
        typeof formatObservedBodyHealth
      >[0]),
    ].map((text) =>
      text.replace('6543', '@value').replace('19757', '@min').replace('19759', '@max'),
    ),
  };
}

/** Export definitions and provider templates from the existing owners. The
 * release only stores trusted static data; it contains no actor or SQL cut. */
export function rustGameServerDecisionPolicy(world: WorldState) {
  const requests = activityRequestDescriptors(world);
  const namedTimes = namedClockTimes(world);
  const supported = selectedResponseExpressions(world, true);
  const unsupported = selectedResponseExpressions(world, false);
  const appraises = world.moduleManifest.appraisals?.definitions.some((entry) => entry.decision);
  const maxQueries = selectedAttentionPolicy(world).scene.maximumQueries;
  const schemas = [false, true].flatMap((speech) =>
    [false, true].map((expressions) => {
      const bound = boundResponseSchema(
        [references.entity],
        [references.action],
        { speech, expressions, expressionVerbs: expressions ? supported.expressionVerbs : [] },
        [references.knowledge],
        namedTimes,
        requests,
        appraises ? decisionAppraisalSchema : undefined,
        [references.identity],
        [references.physical],
        {
          attention: [references.attention],
          retention: [references.retention],
          // Schema projection uses the field's input shape. The retained
          // decision's actual coordinate frame owns conversion on admission.
          frame: {
            position: { x: 0, y: 0, z: 0 },
            axes: { right: { x: -1, z: 0 }, forward: { x: 0, z: 1 } },
            support: null,
          },
        },
      );
      return {
        speech,
        expressions,
        schema: situationResponseJsonSchema(bound, maxQueries),
      };
    }),
  );
  const maximum = world.cognitionPolicy.maxImmediateLevel;
  return {
    instructionsVersion: COGNITION_VERSION,
    responseInstructions: RESPONSE_INSTRUCTIONS,
    queryInstructions: SITUATION_QUERY_INSTRUCTIONS,
    contextBytes: CONTEXT_BYTE_LIMIT,
    text: decisionPromptText,
    namedTimes,
    outputFamilies: itemOutputFamilies(world),
    navigation: navigationInstructions(world, true),
    activityCoverage: ACTIVITY_COVERAGE,
    requests,
    knowledgeInstructions: world.knowledgePolicy
      ? knowledgePolicyInstructions(world.knowledgePolicy)
      : 'Knowledge is unavailable.',
    expressionGuidance: [unsupported.expressionGuidance, supported.expressionGuidance],
    questions: [false, true].flatMap((generation) =>
      [
        { addressed: false, speech: false },
        { addressed: false, speech: true },
        { addressed: true, speech: true },
      ].map(({ addressed, speech }) => ({
        addressed,
        speech,
        generation,
        questions: decisionQuestions(addressed, maximum, speech, generation),
      })),
    ),
    actionAttention: (['actions', 'choose-action'] as const).map((purpose) => {
      const request = decisionActionAttentionRequest(
        {},
        [{ id: 'bound', description: 'one offered action' }],
        purpose,
        world.cognitionPolicy.actionGuidance,
      );
      const state: Record<string, unknown> = request.state;
      const policy = state['attentionPolicy'];
      if (typeof policy !== 'string' || request.questions['bound']?.type !== 'noul')
        throw new Error('The installed action-attention template is unavailable.');
      return {
        policy,
        question: request.questions['bound'],
      };
    }),
    choiceThreshold: LEVEL1_POLICY.selectAt,
    judgmentCharacters: [JUDGMENT_MAX_CHARACTERS, JUDGMENT_STATE_QUESTION_CHARACTERS],
    references,
    schemas,
    choices: choiceText(world),
    scheduling: {
      ...INTAKE_LIMITS,
      selection: NPC_INTAKE_SELECTION,
      actorPaths: Object.fromEntries(RECORD_ACTOR_PATHS),
      stimuli: STIMULUS_POLICY,
      significantEvents: world.cognitionPolicy.significantEventTypes,
      policyRevision: world.cognitionPolicy.revision,
      bodyPolicyPin: world.moduleManifest.bodyPolicyPin,
      discovery: selectedAttentionPolicy(world).semantic.discovery,
      preparedResponses: world.cognitionPolicy.preparedResponses,
    },
  };
}
