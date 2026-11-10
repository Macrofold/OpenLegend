import {
  contactViewsFromContacts,
  itemOutputFamilies,
  knowledgePolicyInstructions,
  namedClockTimes,
  narrationTemplateFromRead,
  renderNarrationParts,
} from '@open-legend/domain';
import { navigationInstructions } from './navigation-contracts.js';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import { nativeNpcWorkContext } from './native-npc-candidates.js';
import { gameTime } from './recall.js';
import { retainNativeSources } from './native-consumer.js';
import { ACTIVITY_COVERAGE } from './decision-activity-facts.js';

/** Common request fields read only one actor's actual first-person cut and the
 * installed immutable definitions. Historical evidence/references keep their
 * separate native source owner; this fragment cannot bind a response. */
export function nativeDecisionFields(
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
  phase: 'initial' | 'current',
) {
  const facts = capture.facts,
    installed = definitions.facts,
    self = facts.self;
  if (definitions.worldId !== self.worldId)
    throw new Error('Native NPC fields belong to another installed world.');
  const own = capture.firstPersonContext(),
    work = nativeNpcWorkContext(capture.candidates(), definitions);
  const policy = installed.definitions.moduleManifest.bodyPolicy,
    concern = policy?.carryingConcern;
  const expressions = installed.nativePolicies.occurrenceRules.response.expression;
  // Both counts come from fully consumed closed native owners. A later family
  // conversion must supply its real inventory/method formatter before widening.
  if (self.npc.inventoryCount !== 0 || self.npc.knownRecipesCount !== 0)
    throw new Error('Native NPC inventory or learned-method formatting is unavailable.');
  const carryingConcern =
    concern &&
    self.attributes.some(
      (attribute) => attribute.id === concern.attributeId && attribute.value !== null,
    )
      ? renderNarrationParts(
          narrationTemplateFromRead(concern.text, { subject: self.identity }, (binding) =>
            binding === 'subject' ? self.actorId : undefined,
          ),
          { names: new Map([[self.actorId, self.identity]]), selfId: self.actorId },
          'first',
        )
      : undefined;
  return retainNativeSources(
    {
      capabilities: {
        speech: self.speech,
        expressions: self.npc.expressions,
        expressionVerbs: self.npc.expressions ? Object.keys(expressions.verbs) : [],
      },
      expressionGuidance: self.npc.expressions
        ? expressions.guidance
        : expressions.unsupportedGuidance,
      notepad: capture.generalKnowledgeContext(
        installed.definitions.knowledgePolicy?.maxCharacters.general,
      ),
      knowledgeInstructions: installed.definitions.knowledgePolicy
        ? knowledgePolicyInstructions(installed.definitions.knowledgePolicy)
        : 'Knowledge is unavailable.',
      navigation: navigationInstructions(installed.definitions, true),
      namedTimes: namedClockTimes(installed.definitions),
      outputFamilies: itemOutputFamilies(installed.definitions),
      currentSupport: self.supportSurfaceId,
      publicSurfaces:
        installed.geometry.spatial.disclosure === 'public'
          ? installed.geometry.spatial.surfaces.map(({ id, name }) => ({ id, name }))
          : [],
      identity: own.identity,
      feelings: own.feelings,
      aboutMe: own.aboutMe,
      now: gameTime(
        self.at,
        installed.definitions.statusEffectPolicy.clockOffsetHours,
        installed.definitions.presentation?.calendar?.dayLabel,
      ),
      body: own.body,
      contacts: contactViewsFromContacts(Object.values(self.npc.contacts ?? {})).map(
        (contact) => contact.text,
      ),
      goal: own.goal,
      activityCoverage: ACTIVITY_COVERAGE,
      agency: {
        goals: self.agency.goals,
        plan: work.plan,
        paused: work.paused,
        planRevision: self.agency.plan?.revision ?? 0,
        attempts: self.agency.attempts,
        ...(phase === 'initial' ? { choicesForCurrentWork: work.choicesForCurrentWork } : {}),
      },
      ...(carryingConcern ? { carryingConcern } : {}),
      ...(self.innerWorld?.reconsiderationRequired
        ? {
            reconsideration:
              'Some remembered evidence was corrected or forgotten. Reconsider affected beliefs; old beliefs may be mistaken.',
          }
        : {}),
    },
    facts,
    installed,
    own,
    work,
  );
}
