import { bodyEligibilityRevisionFor, type ActorComponent } from '@open-legend/domain';
import type { NativeNpcCapture } from './native-npc-capture.js';
import type { NativeDefinitionCapture } from './native-definition-capture.js';
import {
  decisionValidityFromRead,
  preparedResponseValidityFromRead,
  type DecisionValidityFacts,
  type PreparedResponseValidityFacts,
} from './decision-validity.js';

export interface NativeDecisionValidityRead {
  readonly decision: Omit<DecisionValidityFacts, 'body'> & {
    readonly body?: ActorComponent['body'];
  };
  readonly prepared: PreparedResponseValidityFacts;
}

/** These fingerprints serve the server's request reuse/diagnostics. The native
 * ticket retains and rechecks its own originating semantic witness at effects. */
export function nativeDecisionValidity(
  capture: NativeNpcCapture,
  definitions: NativeDefinitionCapture,
): string {
  const facts = capture.facts,
    read = facts.validity.decision,
    installed = definitions.facts.definitions;
  if (definitions.worldId !== facts.self.worldId || read.actorId !== facts.self.actorId)
    throw new Error('Native decision validity belongs to a different actor.');
  return decisionValidityFromRead({
    ...read,
    body: bodyEligibilityRevisionFor({
      manifest: installed.moduleManifest.revision,
      bodyPolicy: installed.moduleManifest.bodyPolicyPin,
      attributes: installed.moduleManifest.pins,
      status: installed.statusEffectPolicy.revision,
      cognition: installed.cognitionPolicy,
      body: read.body,
    }),
  });
}

export function nativePreparedResponseValidity(capture: NativeNpcCapture): string {
  const facts = capture.facts;
  if (
    facts.validity.decision.actorId !== facts.self.actorId ||
    facts.validity.prepared.world !== facts.self.worldId
  )
    throw new Error('Native prepared-response validity belongs to a different actor.');
  return preparedResponseValidityFromRead(facts.validity.prepared);
}
