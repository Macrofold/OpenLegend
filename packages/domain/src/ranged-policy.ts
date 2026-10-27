import { entityValues } from './entity-collection.js';
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
  pointFire: boolean;
  localAvoidance?: {
    bodyProfiles: string[];
    heightFactor: number;
    holdSeconds: number;
    cooldownSeconds: number;
    contextFactor: number;
    contractedText: string;
    restoredText: string;
    clearedText: string;
  };
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
    !hasRecordFields(
      policy,
      [
        'id',
        'version',
        'implementation',
        'targetRule',
        'pointFire',
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
      ],
      ['localAvoidance'],
    ) ||
    !isSafeRecordId(policy.id) ||
    !Number.isSafeInteger(policy.version) ||
    policy.version < 1 ||
    policy.implementation !== 'finite-shot' ||
    typeof policy.pointFire !== 'boolean' ||
    (policy.localAvoidance !== undefined &&
      (!hasRecordFields(policy.localAvoidance, [
        'bodyProfiles',
        'heightFactor',
        'holdSeconds',
        'cooldownSeconds',
        'contextFactor',
        'contractedText',
        'restoredText',
        'clearedText',
      ]) ||
        !Number.isFinite(policy.localAvoidance.contextFactor) ||
        policy.localAvoidance.contextFactor < 0 ||
        policy.localAvoidance.contextFactor > 1 ||
        ![
          policy.localAvoidance.contractedText,
          policy.localAvoidance.restoredText,
          policy.localAvoidance.clearedText,
        ].every((text) => typeof text === 'string' && text.length > 0 && text.length <= 400) ||
        !Array.isArray(policy.localAvoidance.bodyProfiles) ||
        !policy.localAvoidance.bodyProfiles.length ||
        !policy.localAvoidance.bodyProfiles.every(
          (id) => typeof id === 'string' && id.length > 0,
        ) ||
        !Number.isFinite(policy.localAvoidance.heightFactor) ||
        policy.localAvoidance.heightFactor <= 0 ||
        policy.localAvoidance.heightFactor >= 1 ||
        ![policy.localAvoidance.holdSeconds, policy.localAvoidance.cooldownSeconds].every(
          (n) => Number.isFinite(n) && n > 0,
        ))) ||
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
export function shotPreparationSeconds(
  world: WorldState,
  practice?: { windupSeconds: number },
): number {
  return practice?.windupSeconds ?? rangedPolicy(world)!.windupSeconds;
}
export function rangedAccuracy(world: WorldState, target: Entity, accuracy: number): number {
  const policy = rangedPolicy(world);
  if (!policy) return accuracy;
  const adjusted =
    policy.conditionAdjustment === 'danger-or-return' &&
    (target.threat
      ? target.threat.mode === 'return' && !!target.actor?.action
      : !!target.animal?.episode);
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
  for (const entity of entityValues(world.entities)) {
    const action = entity.actor?.action;
    if (
      !action ||
      (!['hunt', 'aim', 'shoot-once'].includes(action.type) && !action.rangedPolicyPin)
    )
      continue;
    const pin = world.moduleManifest.rangedPolicyPin;
    if (
      !['hunt', 'aim', 'shoot-once'].includes(action.type) ||
      !pin ||
      !isDefinitionPin(action.rangedPolicyPin) ||
      !sameDefinitionPin(action.rangedPolicyPin, pin)
    )
      throw new Error('Invalid saved ranged rule or action.');
  }
}
