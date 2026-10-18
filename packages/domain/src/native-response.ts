import type { SurfacePoint } from '@open-legend/spatial';
import type { Position, WorldState } from './types.js';
import type { DefinitionPin } from './world-modules.js';
import { definitionPin } from './world-modules.js';
import type { LivingBody } from './living.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { cloneValue } from './draft.js';
import { sameDefinitionPin } from './state-owners.js';
import { canonicalJson } from './events.js';

/** Supported complete preparation envelope, independent of the world's ring tuning. */
export const NATIVE_RESPONSE_LIMITS = { maximumCandidates: 64 } as const;

/** Installed data for the supported native refuge family. No species, distance,
 * motivation or speed is implicit in selecting native control.
 * docs/projects/combat-and-threat-responses-tech-design.md#native-animal-execution-ctr03ctr04 */
export interface NativeResponseProfile {
  id: string;
  version: number;
  implementation: 'local-refuge';
  dangers: {
    species: string[];
    bodyPlans: LivingBody['plan'][];
    currentNaturalAttack: boolean;
  };
  retentionSeconds: number;
  uncertaintyPerSecond: number;
  maximumUncertainty: number;
  avoidanceDistance: number;
  clearanceMargin: number;
  settlingSeconds: number;
  reviewSeconds: number;
  blockedReviewSeconds: number;
  passageDistance: number;
  candidates: {
    rings: Array<{ count: number; distance: number }>;
    maximumRouteLength: number;
    frontierMargin: number;
    minimumAdvance: number;
    worseningSlack: number;
    arrivalMarginCap: number;
    continuityImprovement: number;
    tieMargin: number;
    distanceWeightScale: number;
  };
  locomotion: Record<string, { travel: number; escape: number; flightEscape?: number }>;
  wander: { distance: number; minimumWaitSeconds: number; waitChoices: number };
  wake?: { attributeId: string; above: number; reason: 'perceived-danger' };
  presentation: {
    alarmed: string;
    escaping: string;
    settling: string;
    blocked: string;
    routine: string;
  };
}

/** A body estimate is retained evidence, never a live hidden tracking reference.
 * Its observed extent continues to mean the body actually seen at that time. */
export type NativeDanger =
  | {
      kind: 'body';
      sourceId: string;
      physicalLife: number;
      point: Position;
      extent: { radius: number; height: number };
      observedAt: number;
      visible: boolean;
      lostAt?: number;
    }
  | {
      kind: 'region';
      source: { kind: 'event' | 'projectile'; id: string };
      point: Position;
      observedAt: number;
      incoming?: Position;
    };

export interface NativeRefugeProposal {
  generation: number;
  at: number;
  origin: SurfacePoint;
  movementId: string | null;
  body: { radius: number; height: number; maxSlope: number };
  candidates: Array<{ id: string; point: SurfacePoint; retained?: true }>;
}

export interface NativeResponseEpisode {
  id: string;
  startedAt: number;
  latestCause: { id: string; at: number };
  /** Referenced installed definitions survive selection of future defaults. */
  profilePin: DefinitionPin;
  mode: 'escaping' | 'settling' | 'blocked';
  dangers: Record<string, NativeDanger>;
  reviewAt: number;
  clearSince?: number;
  proposalGeneration: number;
  proposal?: NativeRefugeProposal;
  refuge?: {
    point: SurfacePoint;
    selectedAt: number;
    generation: number;
    draw?: number;
    flightRouteId?: string;
  };
  movement?: { kind: 'action' | 'flight'; id: string };
  blocked?: { reason: string; basis: string };
}

export interface NativeResponseState {
  profile: DefinitionPin;
  locomotion: string;
  physicalLife: number;
  episode?: NativeResponseEpisode;
  /** Exactly one clock mode, shared with the existing routine due-work owner. */
  wander: { dueAt: number } | { remainingSeconds: number; running?: true };
}

export function nativeResponseProfileKey(pin: DefinitionPin): string {
  return JSON.stringify([pin.id, pin.version, pin.digest]);
}

/** Explicit world initialization/definition owner. This installs data for one
 * supported family; neither the registry nor its pin grants a physical action. */
export function installNativeResponseProfile(
  world: WorldState,
  profile: NativeResponseProfile,
): DefinitionPin {
  validateNativeResponseProfile(profile);
  const pin = definitionPin(profile),
    key = nativeResponseProfileKey(pin);
  const profiles = (world.nativeResponseProfiles ??= {});
  const previous = profiles[key];
  if (previous && canonicalJson(previous) !== canonicalJson(profile))
    throw new Error('A native response definition identity cannot change its meaning.');
  if (!previous) profiles[key] = cloneValue(profile);
  return pin;
}

export function nativeResponseProfile(
  world: WorldState,
  pin: DefinitionPin,
): NativeResponseProfile | undefined {
  const profile = world.nativeResponseProfiles?.[nativeResponseProfileKey(pin)];
  return profile && sameDefinitionPin(pin, definitionPin(profile)) ? profile : undefined;
}

export function validateNativeResponseProfiles(world: WorldState): void {
  const profiles = world.nativeResponseProfiles;
  if (profiles === undefined) return;
  if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles))
    throw new Error('Invalid installed native response definitions.');
  for (const [key, profile] of Object.entries(profiles)) {
    validateNativeResponseProfile(profile);
    if (key !== nativeResponseProfileKey(definitionPin(profile)))
      throw new Error('Invalid installed native response definition identity.');
  }
}

export function validateNativeResponseProfile(profile: NativeResponseProfile): void {
  const invalid = () => {
    throw new Error('Invalid native response profile.');
  };
  const positive = (value: number) => Number.isFinite(value) && value > 0;
  const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
  if (
    !hasRecordFields(
      profile,
      [
        'id',
        'version',
        'implementation',
        'dangers',
        'retentionSeconds',
        'uncertaintyPerSecond',
        'maximumUncertainty',
        'avoidanceDistance',
        'clearanceMargin',
        'settlingSeconds',
        'reviewSeconds',
        'blockedReviewSeconds',
        'passageDistance',
        'candidates',
        'locomotion',
        'wander',
        'presentation',
      ],
      ['wake'],
    ) ||
    !isSafeRecordId(profile.id) ||
    !Number.isSafeInteger(profile.version) ||
    profile.version < 1 ||
    profile.implementation !== 'local-refuge'
  )
    invalid();
  if (
    !hasRecordFields(profile.dangers, ['species', 'bodyPlans', 'currentNaturalAttack']) ||
    !Array.isArray(profile.dangers.species) ||
    !profile.dangers.species.every(isSafeRecordId) ||
    !Array.isArray(profile.dangers.bodyPlans) ||
    !profile.dangers.bodyPlans.every((plan) => ['biped', 'quadruped', 'avian'].includes(plan)) ||
    typeof profile.dangers.currentNaturalAttack !== 'boolean'
  )
    invalid();
  if (
    ![
      profile.retentionSeconds,
      profile.avoidanceDistance,
      profile.settlingSeconds,
      profile.reviewSeconds,
      profile.blockedReviewSeconds,
    ].every(positive) ||
    ![
      profile.uncertaintyPerSecond,
      profile.maximumUncertainty,
      profile.clearanceMargin,
      profile.passageDistance,
    ].every(nonnegative)
  )
    invalid();
  const candidates = profile.candidates;
  if (
    !hasRecordFields(candidates, [
      'rings',
      'maximumRouteLength',
      'frontierMargin',
      'minimumAdvance',
      'worseningSlack',
      'arrivalMarginCap',
      'continuityImprovement',
      'tieMargin',
      'distanceWeightScale',
    ]) ||
    !Array.isArray(candidates.rings) ||
    !candidates.rings.length ||
    !candidates.rings.every(
      (ring) =>
        hasRecordFields(ring, ['count', 'distance']) &&
        Number.isSafeInteger(ring.count) &&
        ring.count > 0 &&
        positive(ring.distance),
    ) ||
    candidates.rings.reduce((count, ring) => count + ring.count, 0) + 1 >
      NATIVE_RESPONSE_LIMITS.maximumCandidates ||
    ![
      candidates.maximumRouteLength,
      candidates.minimumAdvance,
      candidates.distanceWeightScale,
    ].every(positive) ||
    ![
      candidates.frontierMargin,
      candidates.worseningSlack,
      candidates.arrivalMarginCap,
      candidates.continuityImprovement,
      candidates.tieMargin,
    ].every(nonnegative)
  )
    invalid();
  if (
    !profile.locomotion ||
    typeof profile.locomotion !== 'object' ||
    Array.isArray(profile.locomotion) ||
    !Object.keys(profile.locomotion).length
  )
    invalid();
  for (const [id, speed] of Object.entries(profile.locomotion))
    if (
      !isSafeRecordId(id) ||
      !hasRecordFields(speed, ['travel', 'escape'], ['flightEscape']) ||
      !positive(speed.travel) ||
      !positive(speed.escape) ||
      (speed.flightEscape !== undefined && !positive(speed.flightEscape))
    )
      invalid();
  if (
    !hasRecordFields(profile.wander, ['distance', 'minimumWaitSeconds', 'waitChoices']) ||
    !positive(profile.wander.distance) ||
    !nonnegative(profile.wander.minimumWaitSeconds) ||
    !Number.isSafeInteger(profile.wander.waitChoices) ||
    profile.wander.waitChoices < 1
  )
    invalid();
  if (
    profile.wake !== undefined &&
    (!hasRecordFields(profile.wake, ['attributeId', 'above', 'reason']) ||
      !isSafeRecordId(profile.wake.attributeId) ||
      !Number.isFinite(profile.wake.above) ||
      profile.wake.reason !== 'perceived-danger')
  )
    invalid();
  if (
    !hasRecordFields(profile.presentation, [
      'alarmed',
      'escaping',
      'settling',
      'blocked',
      'routine',
    ]) ||
    !Object.values(profile.presentation).every((text) => typeof text === 'string' && text.trim())
  )
    invalid();
}
