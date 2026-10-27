import { openingContentReservations } from './opening-content.js';
import { watchpostReservations } from './watchpost.js';
import { canStand } from '@open-legend/spatial';
import { entityGet, entitySet } from '../../entity-collection.js';
import { spatialMap, worldPlacement } from '../../spatial-state.js';
import { occupiedBodySweepClear } from '../../spatial.js';
import type { WorldState } from '../../types.js';
import type { BaseOpeningGeometry, BaseResourceSource } from './first-playable-config.js';
import { starterGroundAt, type StartingGroundReservation } from './landscape.js';
import { baseSpatial } from './spatial-definitions.js';

/** Only initial terrain preparation uses these bounds. They grant no build rights
 * and do not flatten fixed terrain or move an invalid authored source. */
export function baseResourceReservations(
  opening: BaseOpeningGeometry,
  sources: readonly BaseResourceSource[],
): StartingGroundReservation[] {
  return [
    ...opening.campReservations,
    ...openingContentReservations(opening.content),
    ...watchpostReservations(opening.content.watchpostOffset),
    ...sources.flatMap((source) => {
      if (source.placement.kind !== 'anchor') return [];
      const anchor = opening.anchors[source.placement.anchor]!;
      const x = anchor.xMetres + source.placement.offsetMeters.x,
        z = anchor.zMetres + source.placement.offsetMeters.z,
        margin = opening.sourceApproachClearanceMetres;
      return [{ minX: x - margin, maxX: x + margin, minZ: z - margin, maxZ: z + margin }];
    }),
  ];
}

/** Isolated fresh-world stage, before recipe admission and initial perceptions.
 * Restore never calls it, so depletion is not replenished by reopening. */
export function installBaseMaterialSources(
  world: WorldState,
  opening: BaseOpeningGeometry,
  sources: readonly BaseResourceSource[],
): void {
  const map = spatialMap(world);
  for (const source of sources) {
    const definition = world.itemDefinitions[source.item];
    if (!definition || definition.recipeId)
      throw new Error(`Source ${source.id} requires an installed native item.`);
    const prior = entityGet(world.entities, source.id);
    if (source.placement.kind === 'retained-opening') {
      if (
        !prior?.resource ||
        prior.resource.definitionId !== source.item ||
        prior.placement?.mode !== 'world'
      )
        throw new Error(`Missing exact retained source: ${source.id}`);
      prior.name = source.name;
      prior.resource.quantity = source.quantity;
      prior.resource.workSeconds = source.workSeconds;
    } else {
      if (prior) throw new Error(`Authored source identity collision: ${source.id}`);
      const anchor = opening.anchors[source.placement.anchor]!;
      const point = starterGroundAt(
        world.map.spatial!,
        anchor.xMetres + source.placement.offsetMeters.x,
        anchor.zMetres + source.placement.offsetMeters.z,
      );
      const entity = {
        id: source.id,
        name: source.name,
        kind: 'resource' as const,
        spatial: baseSpatial('object'),
        icon: definition.icon,
        placement: worldPlacement(point, point.surfaceId),
        resource: {
          definitionId: source.item,
          quantity: source.quantity,
          workSeconds: source.workSeconds,
        },
      };
      if (
        !canStand(map, point, entity.spatial.body) ||
        !occupiedBodySweepClear(world, entity, point, point)
      )
        throw new Error(`Authored source has no clear supported body: ${source.id}`);
      entitySet(world.entities, entity.id, entity);
    }
  }
}
