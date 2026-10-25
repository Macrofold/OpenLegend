import { finitePoint } from '@open-legend/spatial';
import { cloneValue } from './draft.js';
import { canonicalJson } from './events.js';
import { entityValues } from './entity-collection.js';
import { isDefinitionPin } from './definition-pins.js';
import { validLethalPermission } from './combat-consent.js';
import {
  evaluateTimedRelease,
  validTimedReleaseInput,
  validTimedReleaseProfile,
  type TimedReleaseInput,
  type TimedReleaseProfile,
} from './execution-input.js';
import { definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin } from './state-owners.js';
import { itemFor } from './objects.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import type { Action, WorldState } from './types.js';

/** A supported item family owns the contribution; input never supplies an effect. */
export interface AttackExecutionProfile {
  profile: TimedReleaseProfile;
  contact?: { positive: number; negative: number };
  injury?: { positive: number; negative: number };
}
/** An observed physical life used for an aiming choice; it grants neither a hit nor sight. */
export interface AimPointSubject {
  id: string;
  life: number;
}
export function validAimPointSubject(value: unknown): value is AimPointSubject {
  return (
    hasRecordFields(value, ['id', 'life']) &&
    isSafeRecordId(value.id) &&
    Number.isSafeInteger(value.life) &&
    (value.life as number) >= 0
  );
}
/** Actual directed subject; the original Action target remains review/history evidence. */
export function attackSubject(
  action: Pick<Action, 'ranged' | 'targetId' | 'targetLife'>,
): AimPointSubject | undefined {
  return action.ranged
    ? action.ranged.aimTarget
    : action.targetId
      ? { id: action.targetId, life: action.targetLife ?? 0 }
      : undefined;
}
export interface AttackExecutionState extends AttackExecutionProfile {
  tool: DefinitionPin;
  ready: boolean;
  input?: TimedReleaseInput;
  pendingRelease?: {
    input: TimedReleaseInput;
    aimTarget?: AimPointSubject;
    aimPoint?: import('@open-legend/spatial').WorldPoint;
    aimPointSubject?: AimPointSubject;
    lethalPermission?: import('./combat-consent.js').LethalPermission;
    requiresLethalReview?: boolean;
  };
}
/** Historical accepted input, separate from the actual contact/outcome evidence.
 * No live definition or browser grant is required to remember a committed choice. */
export interface AttackExecutionEvidence extends AttackExecutionProfile {
  tool: DefinitionPin;
  committedAt: number;
  input: TimedReleaseInput;
  assessment: import('./execution-input.js').ExecutionAssessment;
}
export function attackExecutionEvidence(
  action: Action,
  committedAt: number,
): AttackExecutionEvidence | undefined {
  const state = action.attackExecution;
  if (!state?.input) return;
  return cloneValue({
    tool: state.tool,
    profile: state.profile,
    contact: state.contact,
    injury: state.injury,
    committedAt,
    input: state.input,
    assessment: evaluateTimedRelease(state.profile, state.input)!,
  });
}
export function validAttackExecutionEvidence(value: AttackExecutionEvidence): boolean {
  return (
    hasRecordFields(
      value,
      ['tool', 'profile', 'committedAt', 'input', 'assessment'],
      ['contact', 'injury'],
    ) &&
    isDefinitionPin(value.tool) &&
    Number.isFinite(value.committedAt) &&
    value.committedAt >= 0 &&
    validAttackExecutionProfile({
      profile: value.profile,
      contact: value.contact,
      injury: value.injury,
    }) &&
    validTimedReleaseInput(value.input) &&
    canonicalJson(value.assessment) ===
      canonicalJson(evaluateTimedRelease(value.profile, value.input))
  );
}
export function validAttackExecutionProfile(value: AttackExecutionProfile): boolean {
  return (
    !!value &&
    hasRecordFields(value, ['profile'], ['contact', 'injury']) &&
    validTimedReleaseProfile(value.profile) &&
    [value.contact, value.injury].every(
      (channel) =>
        channel === undefined ||
        (hasRecordFields(channel, ['positive', 'negative']) &&
          [channel.positive, channel.negative].every(
            (n) => Number.isFinite(n) && n >= 0 && n <= 1,
          )),
    )
  );
}
export function bindAttackExecution(
  world: WorldState,
  action: Action,
): AttackExecutionState | undefined {
  const tool = itemFor(world, action.weaponItemId ?? ''),
    definition = tool && world.itemDefinitions[tool.definitionId];
  return definition?.execution && validAttackExecutionProfile(definition.execution)
    ? { ...cloneValue(definition.execution), tool: definitionPin(definition), ready: false }
    : undefined;
}
export function attackExecutionCurrent(world: WorldState, action: Action): boolean {
  const state = action.attackExecution;
  if (!state) return true;
  const tool = itemFor(world, action.weaponItemId ?? ''),
    definition = tool && world.itemDefinitions[tool.definitionId];
  return !!definition && sameDefinitionPin(state.tool, definitionPin(definition));
}
export function attackExecutionFactor(
  state: AttackExecutionProfile | undefined,
  score: number,
  channel: 'contact' | 'injury',
): number {
  const contribution = state?.[channel];
  return contribution
    ? 1 + score * (score >= 0 ? contribution.positive : contribution.negative)
    : 1;
}
export function attackExecutionScore(action: Action): number {
  if (!action.attackExecution) return 0;
  return (
    evaluateTimedRelease(
      action.attackExecution.profile,
      action.attackExecution.input ?? { kind: 'ordinary' },
    )?.score ?? 0
  );
}

export function validateAttackExecutions(world: WorldState): void {
  for (const entity of entityValues(world.entities)) {
    const action = entity.actor?.action,
      state = action?.attackExecution;
    if (!action || state === undefined) continue;
    const item = itemFor(world, action.weaponItemId ?? ''),
      profile = item && world.itemDefinitions[item.definitionId]?.execution;
    if (
      !['strike', 'aim'].includes(action.type) ||
      !hasRecordFields(
        state,
        ['profile', 'tool', 'ready'],
        ['contact', 'injury', 'input', 'pendingRelease'],
      ) ||
      !isDefinitionPin(state.tool) ||
      !attackExecutionCurrent(world, action) ||
      !validAttackExecutionProfile({
        profile: state.profile,
        contact: state.contact,
        injury: state.injury,
      }) ||
      canonicalJson(profile) !==
        canonicalJson({ profile: state.profile, contact: state.contact, injury: state.injury }) ||
      typeof state.ready !== 'boolean' ||
      (state.ready &&
        (action.stage !== 'working' || action.remainingSeconds !== 0 || !!state.input)) ||
      (state.input !== undefined &&
        (action.type !== 'strike' ||
          action.strikePhase !== 'recovery' ||
          state.ready ||
          state.pendingRelease !== undefined ||
          !validTimedReleaseInput(state.input)))
    )
      throw new Error('Invalid saved attack execution.');
    const pending = state.pendingRelease;
    if (
      pending !== undefined &&
      (!hasRecordFields(
        pending,
        ['input'],
        ['aimTarget', 'aimPoint', 'aimPointSubject', 'lethalPermission', 'requiresLethalReview'],
      ) ||
        state.input !== undefined ||
        (action.type === 'strike' && action.strikePhase !== 'windup') ||
        !validTimedReleaseInput(pending.input) ||
        (action.type === 'aim' && !!pending.aimPoint === !!pending.aimTarget) ||
        (pending.aimTarget !== undefined &&
          (action.type !== 'aim' ||
            !!pending.aimPoint ||
            !validAimPointSubject(pending.aimTarget))) ||
        (pending.aimPoint !== undefined &&
          (action.type !== 'aim' || !finitePoint(pending.aimPoint))) ||
        (pending.aimPointSubject !== undefined &&
          (!pending.aimPoint || !validAimPointSubject(pending.aimPointSubject))) ||
        (pending.lethalPermission !== undefined &&
          !validLethalPermission(pending.lethalPermission)) ||
        (pending.requiresLethalReview !== undefined &&
          typeof pending.requiresLethalReview !== 'boolean'))
    )
      throw new Error('Invalid saved pending release.');
  }
}
