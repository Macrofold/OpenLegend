import { finitePoint, SPATIAL_LIMITS, type SurfacePoint } from '@open-legend/spatial';
import { readOnlyDraftView } from './draft.js';
import { hasRecordFields, isSafeRecordId } from './records.js';
import { attributeDefinition, definitionPin, type DefinitionPin } from './world-modules.js';
import { sameDefinitionPin, isDefinitionPin } from './state-owners.js';
import type { Entity, WorldState } from './types.js';

/** Installed finite physical behavior. The selected world authors food, species,
 * timing and habitat; actions and geometry keep their existing mutation owners. */
export interface NativeForagingProfile {
  id: string;
  version: number;
  family: 'perceived-forager';
  fullness: {
    attributeId: string;
    initial: number;
    drainPerGameSecond: number;
    seekBelowDay: number;
    seekBelowNight: number;
    stopAt: number;
  };
  diet: Array<{
    definitionId: string;
    sources: Array<'resource' | 'item' | 'remains'>;
    workSeconds: number;
  }>;
  routine: { choiceGameSeconds: number; idleAtHomeWhenFedInDaylight: boolean };
  hunt?: {
    preySpecies: string[];
    bipedRule: {
      nightOnly: boolean;
      fullnessBelow: number;
      otherVisiblePackmates: number;
      packmateRadiusMetres: number;
      otherBipedExclusionMetres: number;
    };
    approach: {
      radiusMetres: number;
      bearings: number;
      improveSeparationMetres: number;
      targetMovementMetres: number;
      reviewGameSeconds: number;
    };
    strikeId: string;
    locomotionId: string;
    pursuit: { gameSeconds: number; routeMetres: number; reconsiderAfterGameSeconds: number };
    lostSight: {
      lastPointGameSeconds: number;
      totalSearchGameSeconds: number;
      candidateCount: number;
      radiusMetres: number;
    };
  };
  regroup?: {
    separationAboveMetres: number;
    stopSeparationMetres: number;
    legMetres: number;
    legGameSeconds: number;
    refreshDisplacementMetres: number;
    reviewGameSeconds: number;
  };
}
export interface NativeForagingState {
  profile: DefinitionPin;
  home: SurfacePoint;
  anchors: SurfacePoint[];
  packId?: string;
  mode:
    | 'routine'
    | 'resting'
    | 'feeding'
    | 'regrouping'
    | 'stalking'
    | 'pursuing'
    | 'searching'
    | 'blocked';
  reviewAt: number;
  destination?: SurfacePoint;
  emptySources: Record<string, { at: number; revision: number }>;
  /** Last suitable food actually seen within reach of a familiar anchor. This
   * preference asserts no current stock and grants no access to an unseen source. */
  anchorFood?: Array<{ anchor: number; sourceId: string; food: DefinitionPin; at: number }>;
  work?: {
    kind: 'routine' | 'food' | 'hunt' | 'regroup';
    actionId: string;
    sourceId?: string;
    targetId?: string;
    targetLife?: number;
    observed?: { point: SurfacePoint; at: number };
    startedAt: number;
    endsAt: number;
    travelledMetres: number;
    lastPoint: SurfacePoint;
    searchIndex?: number;
    lostAt?: number;
    routeTarget?: SurfacePoint;
  };
  reconsiderAt?: number;
  proposal?: import('./native-response.js').NativeRefugeProposal & {
    basis: string;
    separations: Record<string, number>;
  };
}
/** Current read-only controller data; querying it must not draft untouched rule pins. */
export function nativeForagingState(entity: Entity): Readonly<NativeForagingState> | undefined {
  const animal = readOnlyDraftView(entity).animal;
  const state = animal && readOnlyDraftView(animal).foraging;
  return state && readOnlyDraftView(state);
}
export function foragingProfile(
  world: WorldState,
  entity: Entity,
): NativeForagingProfile | undefined {
  const storedPin = nativeForagingState(entity)?.profile,
    pin = storedPin && readOnlyDraftView(storedPin),
    profiles = readOnlyDraftView(world).nativeForagingProfiles,
    stored = pin && profiles && readOnlyDraftView(profiles)[pin.id],
    profile = stored && readOnlyDraftView(stored);
  return profile && sameDefinitionPin(pin!, definitionPin(profile)) ? profile : undefined;
}
export function nativeForagingActive(entity: Entity): boolean {
  const state = nativeForagingState(entity),
    storedWork = state?.work,
    work = storedWork && readOnlyDraftView(storedWork),
    storedActor = readOnlyDraftView(entity).actor,
    actor = storedActor && readOnlyDraftView(storedActor);
  if (!state || !work || actor?.controller !== 'native' || !actor.alive) return false;
  return (
    (work.kind === 'hunt' && ['stalking', 'pursuing', 'searching'].includes(state.mode)) ||
    (state.mode === 'feeding' && work.actionId === actor.action?.id)
  );
}
export function validateNativeForagingProfile(
  value: unknown,
): asserts value is NativeForagingProfile {
  const fail = (): never => {
    throw new Error('Invalid installed finite foraging profile.');
  };
  const positive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;
  const nonnegative = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  if (
    !hasRecordFields(
      value,
      ['id', 'version', 'family', 'fullness', 'diet', 'routine'],
      ['hunt', 'regroup'],
    ) ||
    !isSafeRecordId(value.id) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1 ||
    value.family !== 'perceived-forager'
  )
    fail();
  const profile = value as unknown as NativeForagingProfile,
    f = profile.fullness;
  if (
    !hasRecordFields(f, [
      'attributeId',
      'initial',
      'drainPerGameSecond',
      'seekBelowDay',
      'seekBelowNight',
      'stopAt',
    ]) ||
    !isSafeRecordId(f.attributeId) ||
    ![f.initial, f.seekBelowDay, f.seekBelowNight].every(nonnegative) ||
    !positive(f.drainPerGameSecond) ||
    !positive(f.stopAt) ||
    f.stopAt <= Math.max(f.seekBelowDay, f.seekBelowNight)
  )
    fail();
  if (
    !Array.isArray(profile.diet) ||
    !profile.diet.length ||
    new Set(profile.diet.map((row) => row.definitionId)).size !== profile.diet.length
  )
    fail();
  for (const row of profile.diet)
    if (
      !hasRecordFields(row, ['definitionId', 'sources', 'workSeconds']) ||
      !isSafeRecordId(row.definitionId) ||
      !positive(row.workSeconds) ||
      !Array.isArray(row.sources) ||
      !row.sources.length ||
      new Set(row.sources).size !== row.sources.length ||
      row.sources.some((source) => !['resource', 'item', 'remains'].includes(source))
    )
      fail();
  if (
    !hasRecordFields(profile.routine, ['choiceGameSeconds', 'idleAtHomeWhenFedInDaylight']) ||
    !positive(profile.routine.choiceGameSeconds) ||
    typeof profile.routine.idleAtHomeWhenFedInDaylight !== 'boolean'
  )
    fail();
  const hunt = profile.hunt;
  if (hunt) {
    if (
      !hasRecordFields(hunt, [
        'preySpecies',
        'bipedRule',
        'approach',
        'strikeId',
        'locomotionId',
        'pursuit',
        'lostSight',
      ]) ||
      !Array.isArray(hunt.preySpecies) ||
      hunt.preySpecies.some((species) => !isSafeRecordId(species)) ||
      !isSafeRecordId(hunt.strikeId) ||
      !isSafeRecordId(hunt.locomotionId)
    )
      fail();
    const fields = [
      [
        hunt.bipedRule,
        [
          'nightOnly',
          'fullnessBelow',
          'otherVisiblePackmates',
          'packmateRadiusMetres',
          'otherBipedExclusionMetres',
        ],
      ],
      [
        hunt.approach,
        [
          'radiusMetres',
          'bearings',
          'improveSeparationMetres',
          'targetMovementMetres',
          'reviewGameSeconds',
        ],
      ],
      [hunt.pursuit, ['gameSeconds', 'routeMetres', 'reconsiderAfterGameSeconds']],
      [
        hunt.lostSight,
        ['lastPointGameSeconds', 'totalSearchGameSeconds', 'candidateCount', 'radiusMetres'],
      ],
    ] as const;
    for (const [record, keys] of fields)
      if (
        !hasRecordFields(record, [...keys]) ||
        Object.entries(record).some(([key, n]) => key !== 'nightOnly' && !positive(n))
      )
        fail();
    if (
      typeof hunt.bipedRule.nightOnly !== 'boolean' ||
      !Number.isSafeInteger(hunt.bipedRule.otherVisiblePackmates) ||
      !Number.isSafeInteger(hunt.approach.bearings) ||
      hunt.approach.bearings > 6 ||
      !Number.isSafeInteger(hunt.lostSight.candidateCount) ||
      hunt.lostSight.candidateCount > 3
    )
      fail();
  }
  const regroup = profile.regroup;
  if (
    regroup &&
    (!hasRecordFields(regroup, [
      'separationAboveMetres',
      'stopSeparationMetres',
      'legMetres',
      'legGameSeconds',
      'refreshDisplacementMetres',
      'reviewGameSeconds',
    ]) ||
      !Object.values(regroup).every(positive) ||
      regroup.stopSeparationMetres >= regroup.separationAboveMetres)
  )
    fail();
}
export function validateNativeForaging(world: WorldState, entity: Entity): void {
  const state = entity.animal?.foraging;
  if (!state) return;
  const profile = isDefinitionPin(state.profile) ? foragingProfile(world, entity) : undefined,
    point = (value: SurfacePoint) => finitePoint(value) && isSafeRecordId(value.surfaceId),
    time = (n: number) => Number.isFinite(n) && n >= 0,
    fail = (): never => {
      throw new Error('Invalid saved finite animal work.');
    };
  if (
    !hasRecordFields(
      state,
      ['profile', 'home', 'anchors', 'mode', 'reviewAt', 'emptySources'],
      ['packId', 'destination', 'work', 'reconsiderAt', 'proposal', 'anchorFood'],
    ) ||
    !profile ||
    !point(state.home) ||
    !Array.isArray(state.anchors) ||
    state.anchors.length < 2 ||
    state.anchors.length > 4 ||
    !state.anchors.every(point) ||
    !time(state.reviewAt) ||
    ![
      'routine',
      'resting',
      'feeding',
      'regrouping',
      'stalking',
      'pursuing',
      'searching',
      'blocked',
    ].includes(state.mode) ||
    (state.packId !== undefined && !isSafeRecordId(state.packId)) ||
    (state.destination !== undefined && !point(state.destination)) ||
    (state.reconsiderAt !== undefined && !time(state.reconsiderAt)) ||
    !state.emptySources ||
    typeof state.emptySources !== 'object' ||
    Array.isArray(state.emptySources)
  )
    fail();
  for (const [id, empty] of Object.entries(state.emptySources))
    if (
      !isSafeRecordId(id) ||
      !hasRecordFields(empty, ['at', 'revision']) ||
      !time(empty.at) ||
      empty.at > world.simTime ||
      !Number.isSafeInteger(empty.revision) ||
      empty.revision < 0
    )
      fail();
  if (state.anchorFood !== undefined) {
    if (
      !Array.isArray(state.anchorFood) ||
      state.anchorFood.length > state.anchors.length ||
      state.anchorFood.some(
        (row) =>
          !hasRecordFields(row, ['anchor', 'sourceId', 'food', 'at']) ||
          !Number.isSafeInteger(row.anchor) ||
          row.anchor < 0 ||
          row.anchor >= state.anchors.length ||
          !isSafeRecordId(row.sourceId) ||
          !isDefinitionPin(row.food) ||
          !time(row.at) ||
          row.at > world.simTime,
      ) ||
      new Set(state.anchorFood.map((row) => row.anchor)).size !== state.anchorFood.length
    )
      fail();
  }
  const proposal = state.proposal;
  if (
    proposal &&
    (!hasRecordFields(
      proposal,
      [
        'generation',
        'geometryRevision',
        'at',
        'origin',
        'movementId',
        'body',
        'candidates',
        'basis',
        'separations',
      ],
      ['wait'],
    ) ||
      !Number.isSafeInteger(proposal.generation) ||
      proposal.generation < 0 ||
      !Number.isSafeInteger(proposal.geometryRevision) ||
      proposal.geometryRevision < 0 ||
      !time(proposal.at) ||
      proposal.at > world.simTime ||
      (proposal.wait !== undefined && !['world', 'entity'].includes(proposal.wait)) ||
      !point(proposal.origin) ||
      (proposal.movementId !== null && !isSafeRecordId(proposal.movementId)) ||
      typeof proposal.basis !== 'string' ||
      !proposal.basis.length ||
      !hasRecordFields(proposal.body, ['radius', 'height', 'maxSlope']) ||
      !Number.isFinite(proposal.body.radius) ||
      proposal.body.radius <= 0 ||
      !Number.isFinite(proposal.body.height) ||
      proposal.body.height <= 0 ||
      !Number.isFinite(proposal.body.maxSlope) ||
      proposal.body.maxSlope < 0 ||
      !Array.isArray(proposal.candidates) ||
      proposal.candidates.length > 6 ||
      !proposal.separations ||
      typeof proposal.separations !== 'object' ||
      Array.isArray(proposal.separations) ||
      proposal.candidates.some(
        (row) =>
          !hasRecordFields(row, ['id', 'point']) ||
          !isSafeRecordId(row.id) ||
          !point(row.point) ||
          !time(proposal.separations[row.id]!),
      ) ||
      new Set(proposal.candidates.map((row) => row.id)).size !== proposal.candidates.length ||
      Object.keys(proposal.separations).length !== proposal.candidates.length)
  )
    fail();
  const work = state.work;
  if (
    work &&
    (!hasRecordFields(
      work,
      ['kind', 'actionId', 'startedAt', 'endsAt', 'travelledMetres', 'lastPoint'],
      ['sourceId', 'targetId', 'targetLife', 'observed', 'searchIndex', 'lostAt', 'routeTarget'],
    ) ||
      !['routine', 'food', 'hunt', 'regroup'].includes(work.kind) ||
      !isSafeRecordId(work.actionId) ||
      ((work.kind === 'hunt' || work.kind === 'regroup') &&
        (!work.targetId || work.targetLife === undefined || !work.observed)) ||
      !time(work.startedAt) ||
      work.startedAt > world.simTime ||
      !time(work.endsAt) ||
      work.endsAt < work.startedAt ||
      !time(work.travelledMetres) ||
      !point(work.lastPoint) ||
      (work.sourceId !== undefined && !isSafeRecordId(work.sourceId)) ||
      (work.targetId !== undefined &&
        (!isSafeRecordId(work.targetId) ||
          !Number.isSafeInteger(work.targetLife) ||
          work.targetLife! < 0)) ||
      (work.observed !== undefined &&
        (!hasRecordFields(work.observed, ['point', 'at']) ||
          !point(work.observed.point) ||
          !time(work.observed.at) ||
          work.observed.at > world.simTime)) ||
      (work.lostAt !== undefined && (!time(work.lostAt) || work.lostAt > world.simTime)) ||
      (work.routeTarget !== undefined && !point(work.routeTarget)) ||
      (work.searchIndex !== undefined &&
        (!Number.isSafeInteger(work.searchIndex) || work.searchIndex < 0 || work.searchIndex > 3)))
  )
    fail();
  if (work?.kind === 'hunt' || work?.kind === 'regroup') {
    const seconds =
        work.kind === 'hunt'
          ? profile!.hunt?.pursuit.gameSeconds
          : profile!.regroup?.legGameSeconds,
      metres =
        work.kind === 'hunt' ? profile!.hunt?.pursuit.routeMetres : profile!.regroup?.legMetres;
    // Pending work may already have expired while danger owns movement. It must
    // retain its original finite ceiling, never gain more pursuit after a load.
    if (
      seconds === undefined ||
      metres === undefined ||
      work.endsAt > work.startedAt + seconds ||
      work.travelledMetres > metres + SPATIAL_LIMITS.epsilon
    )
      fail();
  }
}
export function validateNativeForagingProfiles(world: WorldState): void {
  if (world.nativeForagingProfiles === undefined) return;
  if (
    !world.nativeForagingProfiles ||
    typeof world.nativeForagingProfiles !== 'object' ||
    Array.isArray(world.nativeForagingProfiles)
  )
    throw new Error('Invalid installed foraging profiles.');
  for (const [id, profile] of Object.entries(world.nativeForagingProfiles)) {
    validateNativeForagingProfile(profile);
    if (
      id !== profile.id ||
      attributeDefinition(world, profile.fullness.attributeId)?.schema.kind !== 'number' ||
      profile.diet.some((row) => !(world.itemDefinitions[row.definitionId]?.nutrition! > 0)) ||
      (profile.hunt &&
        (!world.nativeStrikes?.[profile.hunt.strikeId] ||
          !Object.values(world.nativeResponseProfiles ?? {}).some(
            (row) => row.locomotion[profile.hunt!.locomotionId],
          )))
    )
      throw new Error('Unresolved foraging definition.');
  }
}
