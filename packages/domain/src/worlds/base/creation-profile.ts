import { supportedPosition } from '../../spatial-state.js';
import type { WorldCreationProfile, WorldOpeningIdentities } from '../../world-creation.js';
import {
  BASE_OPENING_PROFILE,
  BASE_OPENING_IDENTITY_KEYS,
  BASE_OPENING_RESOURCES,
  BASE_OPENING_STOCK_DEFINITIONS,
  BASE_OPENING_METHODS,
  createBaseOpeningCandidate,
  validateBaseOpeningCandidate,
  buildBaseInitialWorld,
  baseOpeningEditorFields,
  type BaseOpeningIdentities,
} from './initial-opening.js';
import { checkBaseOpeningReadiness } from './opening-readiness.js';

function candidate(value: unknown) {
  validateBaseOpeningCandidate(value);
  return value;
}
function identities(value: WorldOpeningIdentities): BaseOpeningIdentities {
  const playerId = value.ids['player'];
  const residentId = value.ids['resident'];
  if (!playerId || !residentId)
    throw new Error('Allocate the selected opening’s person identities.');
  return { worldId: value.worldId, playerId, residentId, objects: value.ids };
}

/** The bundled opening owns its fields and meaning; activation authority remains
 * with the application. docs/worlds/base/playable-openings.md */
export const BASE_CREATION_PROFILE: WorldCreationProfile = {
  id: BASE_OPENING_PROFILE.id,
  version: BASE_OPENING_PROFILE.version,
  choices: BASE_OPENING_PROFILE.openings,
  identityKeys: [
    'player',
    'resident',
    ...BASE_OPENING_IDENTITY_KEYS,
    ...Array.from({ length: BASE_OPENING_PROFILE.limits.scene }, (_, i) => `scene-slot-${i}`),
    ...Array.from({ length: BASE_OPENING_PROFILE.limits.stock }, (_, i) => `stock-slot-${i}`),
  ],
  metadata: {
    profile: BASE_OPENING_PROFILE,
    resources: BASE_OPENING_RESOURCES,
    stockDefinitions: BASE_OPENING_STOCK_DEFINITIONS,
    learnedMethods: BASE_OPENING_METHODS,
    identityKeys: BASE_OPENING_IDENTITY_KEYS,
    coverage:
      'The supported initial profile only. Native preparation separately checks actual geometry, supplies, methods and activity readiness; it cannot guarantee an invented tool, a successful attempt or another person’s choice.',
    notes: [
      'Use the session-owned prospective template or current_work. Preserve allocated identities, exact definition/profile pins, seed, RNG state and every unchanged selected part. Names never allocate or resolve identities.',
      'The application supplies fresh identities; none come from the source world. Source people, memories, inventories, active work, receipts, control leases, credentials and account grants are not opening content.',
      'A supplied reference is a starting proposal, not a requirement to add people or emergency resources. Preserve explicitly chosen solitude or harshness and retain unsupported essential requirements as blockers rather than substituting another premise.',
      'Describe authored history and dispositions without prescribing later decisions. Current placement, stock and fullness belong in their actual fields. Initial goals are visibly authored scenario intentions, not proof of autonomous motivation.',
      'Starting knowledge installs no physical stock. Initial stock is an explicit finite endowment, not an invented historical event or receipt.',
      'Submit or revise the retained opening and finish. Saving does not change the source world, prepare a source-world Apply plan, authorize a target, start a host or grant character control.',
    ],
  },
  validate: candidate,
  create(value, choiceId = 'inhabited') {
    const choice = BASE_OPENING_PROFILE.openings.find((opening) => opening.id === choiceId);
    if (!choice) throw new Error('The selected opening is unsupported by this profile.');
    return createBaseOpeningCandidate(identities(value), choice.id);
  },
  assertSessionCandidate(value, allocated) {
    const selected = candidate(value);
    const assigned = identities(allocated);
    const expected = createBaseOpeningCandidate(assigned);
    const allowed = new Set(Object.values(allocated.ids));
    if (
      selected.worldId !== allocated.worldId ||
      selected.player.id !== assigned.playerId ||
      (selected.resident && selected.resident.id !== assigned.residentId) ||
      selected.seed !== expected.seed ||
      selected.rngState !== expected.rngState ||
      [...selected.scene, ...selected.stock].some((object) => !allowed.has(object.id))
    )
      throw new Error(
        'Preserve the application-assigned opening identities and random results. Revise the authored circumstances, not another world’s identifiers.',
      );
  },
  controlledActor(value) {
    return candidate(value).player.id;
  },
  build(value, accounts) {
    return buildBaseInitialWorld(candidate(value), accounts);
  },
  editor(value) {
    const selected = candidate(value);
    return {
      family: { ...selected.profile },
      fields: baseOpeningEditorFields(selected),
      facts: [
        { id: 'people', label: 'People initially present', value: selected.resident ? 2 : 1 },
        { id: 'stock', label: 'Explicit initial stock lots', value: selected.stock.length },
        {
          id: 'world',
          label: 'Publication',
          value: 'Fresh paused world; no existing world is replaced.',
        },
      ],
    };
  },
  readiness(value, world, routes) {
    return checkBaseOpeningReadiness(candidate(value), world, routes);
  },
  preview(value, world, readiness, failure) {
    const selected = candidate(value);
    const activity = BASE_OPENING_PROFILE.openings.find(
      (opening) => opening.id === selected.opening,
    )!;
    return {
      worldId: selected.worldId,
      title: selected.title,
      activity: activity.activity,
      payoff: activity.payoff,
      notices: readiness?.notices ?? [],
      entries: world
        ? Object.values(world.entities).flatMap((entity) => {
            if (entity.placement?.mode !== 'world') return [];
            const position = supportedPosition(entity);
            if (!position) throw new Error('A starting object has no native world position.');
            return [
              {
                id: entity.id,
                label: entity.name,
                kind: entity.kind,
                position: { x: position.x, y: position.y, z: position.z },
                description: entity.description ?? '',
                ...(entity.resource ? { quantity: entity.resource.quantity } : {}),
              },
            ];
          })
        : [
            selected.player,
            ...(selected.resident ? [selected.resident] : []),
            ...selected.scene,
          ].map((entry) => ({
            id: entry.id,
            label: entry.name,
            kind: 'initialGoals' in entry ? 'person' : entry.kind,
            position: entry.position,
            description: 'description' in entry ? entry.description : '',
          })),
      findings: readiness
        ? readiness.findings.map((finding) => ({
            id: finding.id,
            status:
              finding.status === 'ready'
                ? ('passed' as const)
                : finding.status === 'blocked'
                  ? ('failed' as const)
                  : ('pending' as const),
            message: finding.message,
          }))
        : [
            {
              id: 'native-preparation',
              status: 'failed' as const,
              message: `Declared layout only; native preparation failed: ${failure ?? 'the opening is unusable.'}`,
            },
          ],
    };
  },
};
