import { attributeBindingSchema } from './world-authoring-bindings.js';
import { z } from 'zod';
import {
  DECLARATION_CONTRACT,
  DEFAULT_COGNITION_POLICY,
  type WorldState,
} from '@open-legend/domain';
import { declarationSchema } from './ai-schemas.js';
import { commandInputSchema } from './world-service.js';
import type { AuthoringKind } from './world-authoring-contracts.js';

/** Discovery guidance is not another validator. Kind adapters always invoke the native owner.
 * JSON schemas are reused where available; hand-validated kinds expose honest examples/limits.
 * docs/world-agent-runtime.md#durable-write-sessions
 */
export function describeAuthoringKind(world: WorldState, kind: AuthoringKind) {
  const common = {
    kind,
    payloadEncoding: 'JSON object serialized in payloadJson',
    approval: 'Exact human-reviewed plan before every live change',
    coverage: 'Native supported family only; use ol_validate for authoritative findings.',
  };
  switch (kind) {
    case 'recipe':
      return {
        ...common,
        schema: declarationSchema,
        contract: DECLARATION_CONTRACT,
        notes:
          'Known material inputs only for the session inventor. New derived recipes leave existing instances unchanged. No crafting or spawning on installation.',
      };
    case 'action':
      return {
        ...common,
        schema: z.toJSONSchema(commandInputSchema),
        notes:
          'An existing native command as the session controlled actor, not a reusable definition. World must be resumed. Current controls, physical requirements and knowledge still apply.',
      };
    case 'attribute-bindings':
      return {
        ...common,
        schema: z.toJSONSchema(attributeBindingSchema),
        notes: [
          'This is a reviewed world-owner change to one selected body, not an NPC ability or a new definition.',
          'Use ol_activity to inspect the current body and ol_inspect to read each installed attribute first. Only custom reservoir/category attributes are eligible.',
          'Each new attribute starts at its declared initial value. Native needs, existing values, senses, controller and active work are preserved. Existing bindings cannot be reset or removed here.',
          'Added reservoirs use their existing drain/replenishment and concern projections. This does not create a compatible charging source or a new sensor.',
        ],
      };
    case 'attribute':
      return {
        ...common,
        example: {
          definition: {
            id: 'custom:charge',
            version: 1,
            implementation: 'reservoir-v1',
            name: 'Charge',
            disclosure: 'owner',
            presentation: 'neutral',
            schema: { kind: 'number', min: 0, max: 100, initial: 100, unit: 'charge' },
            concern: { below: 15, text: 'Charge is low.' },
            reservoir: {
              drainPerSecond: 0.001,
              replenishPerSecond: 1,
              workSeconds: 10,
              actionLabel: 'Recharge',
            },
          },
        },
        alternatives: { removeId: 'custom:unused-definition' },
        notes: [
          'Use exactly definition OR removeId. Namespaced IDs. New definitions use version 1; supported revisions increment exactly once.',
          'Only custom reservoir-v1 and category-v1 are authorable. Existing native body implementations cannot be rewritten here. Bound definitions cannot be removed or changed incompatibly.',
          'Category schema uses {kind:"category",choices:["a","b"],initial:"a"}; no reservoir or numeric concern.',
          'A definition alone is not attached to any body. Inspect current attributes and validate before preparing a change.',
        ],
      };
    case 'cognition-policy':
      return {
        ...common,
        example: {
          ...(world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY),
          revision: (world.cognitionPolicy ?? DEFAULT_COGNITION_POLICY).revision + 1,
        },
        notes: [
          'Exact fields: version=1, revision=current+1, maxImmediateLevel=2|3|4, significantEventTypes (at most 16 lowercase/hyphen event names), reflection boolean, dream.',
          'dream is {statusEffectId,afterSeconds>0}; the effect must already exist. This is a world-wide policy revision; it never raises real spending limits.',
        ],
      };
    case 'status-effect-policy':
      return {
        ...common,
        example: { ...world.statusEffectPolicy, revision: world.statusEffectPolicy.revision + 1 },
        notes: [
          'Supply the whole policy {revision:current+1,clockOffsetHours:[0,24),definitions:[...]}; omitted definitions are removed, not implicitly retained. At most 128 definitions.',
          'Required definition fields: id (safe record ID), type="statusEffect", target="$subject", label, enabled:boolean, requires:condition, reactivationDelaySeconds:0..86400, occupiesAction:boolean, interruptOn:string[]<=32, whileActive:operation[1..32].',
          'Optional: activationCondition, automaticActivation, automaticDeactivation; presentation; onActivate/onDeactivate; actions.',
          'A condition has exactly one of all:[conditions], any:[conditions], compare:{target,attribute,operator,value}, field:{target,name,operator,value}, dailyWindow:{target:"$world",clock:"localTime",start,end}, statusActive:{target,definitionId,value:boolean}. Groups are nonempty, depth<=12, <=128 condition nodes per tree.',
          'Entity target is $subject|$source|$actionTarget. compare uses an existing numeric attribute; operator equal|notEqual|lessThan|lessThanOrEqual|greaterThanOrEqual; value finite number.',
          'field.name is controller|alive|incapacitated|grounded|activeWork|kind; equal|notEqual; controller/kind have string values, other fields boolean. dailyWindow bounds [0,24), start != end. statusActive definitionId must occur in this policy.',
          'An operation is {changeRate:{target,attribute,amount:-1000000..1000000,per:"gameSecond"},when?:condition} OR {restrictCapabilities:{target:"$subject",capabilities:[actions|locomotion|speech|perception]}}.',
          'changeRate can write only existing numeric native-energy-v1, native-fullness-v1 or reservoir-v1 attributes. No generic memory/health/control mutation.',
          'presentation: {pose?:"horizontal",particle?:{text:<=32chars,anchor:"head",motion:"floatAway"}}. onActivate/onDeactivate: {emit:{target,type:"stateChanged",narration}} with only {subject.name}, {source.name}, {actionTarget.name} substitutions.',
          'actions: {activate:string,deactivate:string,allowOther:boolean,activateOther:boolean}. Labels do not confer controller authority.',
          'Changed active effect episodes terminate through the current owner. Current dream dependencies must be preserved. Review lists affected instances; native validation remains authoritative.',
        ],
      };
  }
}
