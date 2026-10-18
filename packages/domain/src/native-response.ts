import { finitePoint, type SurfacePoint } from '@open-legend/spatial';
import type { Entity, Position, WorldState } from './types.js';
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
export type NativeDanger = (
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
    }
) & { insideAvoidance?: boolean };

export interface NativeRefugeProposal {
  generation: number;
  geometryRevision: number;
  at: number;
  origin: SurfacePoint;
  movementId: string | null;
  body: { radius: number; height: number; maxSlope: number };
  candidates: Array<{ id: string; point: SurfacePoint; retained?: true }>;
}

export interface NativeResponseEpisode {
  id: string;
  startedAt: number;
  latestCause: { kind: 'event' | 'action'; id: string; at: number };
  preparations?: Record<string, string>;
  /** Referenced installed definitions survive selection of future defaults. */
  profilePin: DefinitionPin;
  locomotion: string;
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

/** Trusted physical-action binding; clients cannot choose a native controller
 * profile through a command. The action keeps its actual speed definition. */
export interface NativeLocomotion {
  profile: DefinitionPin;
  locomotion: string;
  mode: 'travel' | 'escape';
  episodeId?: string;
  generation?: number;
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

/** Current-format integrity, not an old-state reader. Stale physical preparation
 * can be cancelled at execution, but its identity and data must remain usable. */
export function validateNativeResponse(world: WorldState, entity: Entity): void {
  const state = entity.animal;
  if (!state) return;
  const fail = (): never => {
    throw new Error('Invalid saved native animal response.');
  };
  const time = (value: number) => Number.isFinite(value) && value >= 0;
  const life = (value: number) => Number.isSafeInteger(value) && value >= 0;
  const point = (value: SurfacePoint) => finitePoint(value) && isSafeRecordId(value.surfaceId);
  const profile = nativeResponseProfile(world, state.profile);
  if (
    !hasRecordFields(state, ['profile', 'locomotion', 'physicalLife', 'wander'], ['episode']) ||
    !entity.actor ||
    !profile?.locomotion[state.locomotion] ||
    !life(state.physicalLife) ||
    state.physicalLife !== (entity.actor.physicalLife ?? 0) ||
    !state.wander ||
    ('dueAt' in state.wander
      ? !hasRecordFields(state.wander, ['dueAt']) || !Number.isFinite(state.wander.dueAt)
      : !hasRecordFields(state.wander, ['remainingSeconds'], ['running']) ||
        !Number.isFinite(state.wander.remainingSeconds) ||
        (state.wander.running !== undefined && state.wander.running !== true))
  )
    fail();
  const episode = state.episode;
  if (episode) {
    const activeProfile = nativeResponseProfile(world, episode.profilePin);
    if (
      !hasRecordFields(
        episode,
        [
          'id',
          'startedAt',
          'latestCause',
          'profilePin',
          'locomotion',
          'mode',
          'dangers',
          'reviewAt',
          'proposalGeneration',
        ],
        ['clearSince', 'proposal', 'refuge', 'movement', 'blocked', 'preparations'],
      ) ||
      !entity.actor?.alive ||
      entity.actor.controller !== 'native' ||
      !isSafeRecordId(episode.id) ||
      !time(episode.startedAt) ||
      !time(episode.reviewAt) ||
      !hasRecordFields(episode.latestCause, ['kind', 'id', 'at']) ||
      !['event', 'action'].includes(episode.latestCause.kind) ||
      !isSafeRecordId(episode.latestCause.id) ||
      !time(episode.latestCause.at) ||
      !activeProfile?.locomotion[episode.locomotion] ||
      !['escaping', 'settling', 'blocked'].includes(episode.mode) ||
      !life(episode.proposalGeneration) ||
      (episode.clearSince !== undefined &&
        (!time(episode.clearSince) || episode.clearSince > world.simTime)) ||
      !episode.dangers ||
      typeof episode.dangers !== 'object' ||
      Array.isArray(episode.dangers)
    )
      fail();
    if (
      episode.preparations &&
      (typeof episode.preparations !== 'object' ||
        Array.isArray(episode.preparations) ||
        !Object.values(episode.preparations).every(isSafeRecordId))
    )
      fail();
    for (const key of Object.keys(episode.preparations ?? {})) {
      let parts: unknown;
      try {
        parts = JSON.parse(key);
      } catch {
        fail();
      }
      if (
        !Array.isArray(parts) ||
        parts.length !== 2 ||
        !isSafeRecordId(parts[0]) ||
        typeof parts[1] !== 'number' ||
        !life(parts[1])
      )
        fail();
    }
    for (const [key, danger] of Object.entries(episode.dangers)) {
      if (
        !finitePoint(danger.point) ||
        !time(danger.observedAt) ||
        (danger.insideAvoidance !== undefined && typeof danger.insideAvoidance !== 'boolean')
      )
        fail();
      if (danger.kind === 'body') {
        if (
          !hasRecordFields(
            danger,
            ['kind', 'sourceId', 'physicalLife', 'point', 'extent', 'observedAt', 'visible'],
            ['lostAt', 'insideAvoidance'],
          ) ||
          !isSafeRecordId(danger.sourceId) ||
          !life(danger.physicalLife) ||
          !hasRecordFields(danger.extent, ['radius', 'height']) ||
          !Number.isFinite(danger.extent.radius) ||
          danger.extent.radius <= 0 ||
          !Number.isFinite(danger.extent.height) ||
          danger.extent.height <= 0 ||
          typeof danger.visible !== 'boolean' ||
          (danger.visible ? danger.lostAt !== undefined : !time(danger.lostAt!)) ||
          key !== JSON.stringify(['body', danger.sourceId, danger.physicalLife])
        )
          fail();
      } else if (danger.kind === 'region') {
        if (
          !hasRecordFields(
            danger,
            ['kind', 'source', 'point', 'observedAt'],
            ['incoming', 'insideAvoidance'],
          ) ||
          !hasRecordFields(danger.source, ['kind', 'id']) ||
          !['event', 'projectile'].includes(danger.source.kind) ||
          !isSafeRecordId(danger.source.id) ||
          (danger.incoming !== undefined && !finitePoint(danger.incoming)) ||
          key !== JSON.stringify(['region', danger.source.kind, danger.source.id])
        )
          fail();
      } else fail();
    }
    if (episode.proposal) {
      const proposal = episode.proposal;
      if (
        !hasRecordFields(proposal, [
          'generation',
          'geometryRevision',
          'at',
          'origin',
          'movementId',
          'body',
          'candidates',
        ]) ||
        proposal.generation !== episode.proposalGeneration ||
        !life(proposal.geometryRevision) ||
        !time(proposal.at) ||
        !point(proposal.origin) ||
        (proposal.movementId !== null && !isSafeRecordId(proposal.movementId)) ||
        !hasRecordFields(proposal.body, ['radius', 'height', 'maxSlope']) ||
        ![proposal.body.radius, proposal.body.height].every(
          (value) => Number.isFinite(value) && value > 0,
        ) ||
        !Number.isFinite(proposal.body.maxSlope) ||
        proposal.body.maxSlope < 0 ||
        !Array.isArray(proposal.candidates) ||
        proposal.candidates.length > NATIVE_RESPONSE_LIMITS.maximumCandidates ||
        new Set(proposal.candidates.map((candidate) => candidate.id)).size !==
          proposal.candidates.length ||
        !proposal.candidates.every(
          (candidate) =>
            hasRecordFields(candidate, ['id', 'point'], ['retained']) &&
            typeof candidate.id === 'string' &&
            candidate.id.length > 0 &&
            point(candidate.point) &&
            (candidate.retained === undefined || candidate.retained === true),
        )
      )
        fail();
    }
    if (
      episode.refuge &&
      (!hasRecordFields(
        episode.refuge,
        ['point', 'selectedAt', 'generation'],
        ['draw', 'flightRouteId'],
      ) ||
        !point(episode.refuge.point) ||
        !time(episode.refuge.selectedAt) ||
        !life(episode.refuge.generation) ||
        (episode.refuge.draw !== undefined &&
          (!Number.isFinite(episode.refuge.draw) ||
            episode.refuge.draw < 0 ||
            episode.refuge.draw >= 1)) ||
        (episode.refuge.flightRouteId !== undefined &&
          !world.flightRoutes[episode.refuge.flightRouteId]))
    )
      fail();
    if (
      episode.movement &&
      (!hasRecordFields(episode.movement, ['kind', 'id']) ||
        !['action', 'flight'].includes(episode.movement.kind) ||
        !isSafeRecordId(episode.movement.id))
    )
      fail();
    if (
      episode.blocked &&
      (!hasRecordFields(episode.blocked, ['reason', 'basis']) ||
        typeof episode.blocked.reason !== 'string' ||
        typeof episode.blocked.basis !== 'string')
    )
      fail();
  }
  const action = entity.actor!.action,
    binding = action?.nativeLocomotion;
  if (
    binding &&
    (!hasRecordFields(binding, ['profile', 'locomotion', 'mode'], ['episodeId', 'generation']) ||
      action?.type !== 'move' ||
      !nativeResponseProfile(world, binding.profile)?.locomotion[binding.locomotion] ||
      !['travel', 'escape'].includes(binding.mode) ||
      (binding.mode === 'escape' &&
        (!episode ||
          binding.episodeId !== episode.id ||
          !life(binding.generation!) ||
          episode.movement?.kind !== 'action' ||
          episode.movement.id !== action?.id ||
          episode.refuge?.generation !== binding.generation ||
          canonicalJson(episode.refuge?.point) !== canonicalJson(action?.destination) ||
          !sameDefinitionPin(binding.profile, episode.profilePin) ||
          binding.locomotion !== episode.locomotion)))
  )
    fail();
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
