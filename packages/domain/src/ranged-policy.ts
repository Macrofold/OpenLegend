import { hasRecordFields, isSafeRecordId } from './records.js';
import { isDefinitionPin, sameDefinitionPin } from './state-owners.js';
import type { Entity, WorldState } from './types.js';

/** Selected rules for the finite shot executor. The world chooses applicability and
 * tuning; equipment, current authority, ammunition and committed effects stay native.
 * docs/action-capabilities.md#action-availability-and-temporary-execution */
export interface RangedPolicy {
  id: string;
  version: number;
  implementation: 'finite-shot';
  targetRule: 'living-animal' | 'living-actor';
  conditionAdjustment: 'danger-or-return' | 'none';
  conditionAccuracyFactor: number;
  windupSeconds: number;
  approachBuffer: number;
  minimumApproachRange: number;
  invalidTargetText: string;
  unavailableText: string;
  targetLabel: string;
  actionLabel: string;
  activityLabel: string;
  description: string;
  scope: string;
  accuracyExplanation: string;
}
export function validateRangedPolicy(policy: RangedPolicy | null): void {
  if (policy === null) return;
  if (
    !hasRecordFields(policy, [
      'id',
      'version',
      'implementation',
      'targetRule',
      'conditionAdjustment',
      'conditionAccuracyFactor',
      'windupSeconds',
      'approachBuffer',
      'minimumApproachRange',
      'invalidTargetText',
      'unavailableText',
      'targetLabel',
      'actionLabel',
      'activityLabel',
      'description',
      'scope',
      'accuracyExplanation',
    ]) ||
    !isSafeRecordId(policy.id) ||
    !Number.isSafeInteger(policy.version) ||
    policy.version < 1 ||
    policy.implementation !== 'finite-shot' ||
    !['living-animal', 'living-actor'].includes(policy.targetRule) ||
    !['danger-or-return', 'none'].includes(policy.conditionAdjustment) ||
    !Number.isFinite(policy.conditionAccuracyFactor) ||
    policy.conditionAccuracyFactor < 0 ||
    policy.conditionAccuracyFactor > 1 ||
    !Number.isFinite(policy.windupSeconds) ||
    policy.windupSeconds <= 0 ||
    !Number.isFinite(policy.approachBuffer) ||
    policy.approachBuffer < 0 ||
    !Number.isFinite(policy.minimumApproachRange) ||
    policy.minimumApproachRange <= 0 ||
    ![
      policy.invalidTargetText,
      policy.unavailableText,
      policy.targetLabel,
      policy.actionLabel,
      policy.activityLabel,
      policy.description,
      policy.scope,
      policy.accuracyExplanation,
    ].every((value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 1600)
  )
    throw new Error('Invalid installed ranged policy.');
}
export function rangedPolicy(world: WorldState): RangedPolicy | null {
  return world.moduleManifest.rangedPolicy;
}
export function rangedTargetAllowed(world: WorldState, target: Entity): boolean {
  const policy = rangedPolicy(world);
  return (
    !!policy && !!target.actor?.alive && (policy.targetRule === 'living-actor' || !!target.animal)
  );
}
export function rangedAccuracy(world: WorldState, target: Entity, accuracy: number): number {
  const policy = rangedPolicy(world);
  if (!policy) return accuracy;
  const adjusted =
    policy.conditionAdjustment === 'danger-or-return' &&
    (target.threat
      ? target.threat.mode === 'return' && !!target.actor?.action
      : (target.animal?.danger ?? 0) > 0);
  return accuracy * (adjusted ? policy.conditionAccuracyFactor : 1);
}
export function rangedApproachRange(world: WorldState, range: number): number {
  const policy = rangedPolicy(world);
  // The authored allowance chooses a stance within the tool's actual firing range.
  return policy
    ? Math.min(range, Math.max(policy.minimumApproachRange, range - policy.approachBuffer))
    : range;
}
export function validateRangedActions(world: WorldState): void {
  for (const entity of Object.values(world.entities)) {
    const action = entity.actor?.action;
    if (!action || (action.type !== 'hunt' && !action.rangedPolicyPin)) continue;
    const pin = world.moduleManifest.rangedPolicyPin;
    if (
      action.type !== 'hunt' ||
      !pin ||
      !isDefinitionPin(action.rangedPolicyPin) ||
      !sameDefinitionPin(action.rangedPolicyPin, pin)
    )
      throw new Error('Invalid saved ranged rule or action.');
  }
}
