import { addItem } from '../../data.js';
import { worldPlacement } from '../../spatial-state.js';
import { rootMembershipChanged } from '../../entity-index.js';
import { nativeActor } from './bodies.js';
import { starterGroundAt } from './landscape.js';
import type { StrikeDefinition } from '../../strikes.js';
import type { Entity, WorldState } from '../../types.js';

export const STAG_CONTACT: StrikeDefinition = {
  id: 'wilderness:antler-strike',
  version: 1,
  requiredBodyPlan: 'quadruped',
  label: 'Antler strike',
  pastTense: 'struck with its antlers',
  range: 1.6,
  approachRange: 1.6,
  autoMoveToRange: false,
  workSeconds: 120,
  recoverySeconds: 180,
  damage: 18,
  accuracy: 1,
  animation: 'melee',
};
/** Optional authored detour; ordinary prey and the camp's resources stay independent. */
export function installFirstThreat(world: WorldState): void {
  const layout = world.map.spatial;
  const home = starterGroundAt(layout, 32, 28),
    refuge = starterGroundAt(layout, 38, 31);
  const stag: Entity = {
    id: 'territorial-stag',
    name: 'Territorial stag',
    kind: 'animal',
    description:
      'A heavy stag paws the ground around a torn supply cache. Its lowered antlers and restless stance suggest aggression.',
    spatial: { bodyProfileId: 'deer', heading: -2.2 },
    placement: worldPlacement(home, home.surfaceId),
    actor: nativeActor(
      'deer',
      world.simTime,
      world.moduleManifest.definitions.filter((d) => d.id === 'wilderness:energy'),
    ),
    animal: {
      danger: 0,
      threatPosition: null,
      threatId: null,
      escapeHeading: null,
      calmRate: 0,
      reviewAt: 0,
      wanderSeconds: 0,
    },
    threat: {
      policy: {
        id: 'wilderness:territorial-contact',
        version: 1,
        home,
        refuge,
        entryRadius: 4,
        territoryRadius: 8,
        pursuitSeconds: 2400,
        reentryAfterTimeout: true,
        searchSeconds: 30,
        reviewSeconds: 15,
        refreshSeconds: 15,
        refreshDisplacement: 1,
        detours: 4,
        relinquishHealthFraction: 0.5,
        strikeDefinitionId: STAG_CONTACT.id,
        attackRange: STAG_CONTACT.range,
        movementFactor: 0.75,
        targetControllers: ['player'],
        targetBodyPlans: ['biped'],
        windupText: 'The stag lowers its antlers and braces to strike.',
        withdrawalText: 'The stag breaks off and withdraws.',
        stopText: 'The wounded stag settles where it can stand. It has abandoned the cache.',
      },
      mode: 'idle',
      relinquished: false,
      reviewAt: 0,
      detoursSpent: 0,
      repathAt: 0,
    },
  };
  const cachePosition = starterGroundAt(layout, 36.8, 26);
  stag.actor!.naturalStrikeIds = [STAG_CONTACT.id];
  const content: Entity[] = [
    stag,
    {
      id: 'stag-cache',
      name: 'Torn woodland cache',
      kind: 'item-pile',
      description: 'Prepared fibers, cord and stones spill from a torn bundle beside the stag.',
      spatial: { bodyProfileId: 'object', heading: 0 },
      placement: worldPlacement(cachePosition, cachePosition.surfaceId),
    },
    ...(
      [
        [
          'stag-tracks',
          'Deep hoof tracks',
          'Broad, fresh hoofprints churn the ground. Several gouges run sideways as if an animal repeatedly stamped here.',
          28,
          24,
        ],
        [
          'stag-brush',
          'Shredded foliage',
          'Twigs and foliage are torn and battered at antler height. The disturbed ground leads toward a secluded clearing.',
          30,
          24,
        ],
      ] as const
    ).map(([id, name, description, x, z]): Entity => {
      const point = starterGroundAt(layout, x, z);
      return {
        id,
        name,
        description,
        kind: 'resource',
        spatial: { bodyProfileId: 'object', heading: 0 },
        placement: worldPlacement(point, point.surfaceId),
      };
    }),
  ];
  for (const entity of content) {
    world.entities[entity.id] = entity;
    rootMembershipChanged(world, entity.id);
  }
  addItem(world, 'stag-cache', 'prepared_fiber', 4);
  addItem(world, 'stag-cache', 'cord', 2);
  addItem(world, 'stag-cache', 'stone', 8);
  const ground = starterGroundAt(layout, 29.5, 28);
  layout.blockers.push({
    id: 'stag-rock-screen',
    material: 'stone',
    movement: true,
    sight: true,
    acousticTransmission: 0.15,
    bounds: {
      min: { x: 29.2, y: ground.y, z: 26.3 },
      max: { x: 29.8, y: ground.y + 1.8, z: 29.7 },
    },
  });
  layout.revision++;
}
