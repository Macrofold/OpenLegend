import { entitySet, entityValues } from '../../entity-collection.js';
import { definitionPin, initializeAttributes } from '../../world-modules.js';
import { nativeResponseProfile, installNativeResponseProfile } from '../../native-response.js';
import { supportedPosition, worldPlacement } from '../../spatial-state.js';
import { starterGroundAt, type StartingGroundReservation } from './landscape.js';
import { baseSpatial } from './spatial-definitions.js';
import { distance3D } from '@open-legend/spatial';
import type { WorldState } from '../../types.js';
import type { BaseEcologyConfiguration } from './ecology-config.js';

export function baseEcologyReservations(
  ecology: BaseEcologyConfiguration,
): StartingGroundReservation[] {
  return ecology.pasture.anchors.map(([x, z]) => ({
    minX: x - 1.5,
    maxX: x + 1.5,
    minZ: z - 1.5,
    maxZ: z + 1.5,
  }));
}

/** Creation only: no restore hook reapplies needs, food stock or habitat choices. */
export function installBaseEcology(world: WorldState, ecology: BaseEcologyConfiguration): void {
  world.nativeForagingProfiles = Object.fromEntries(
    ecology.profiles.map((profile) => [profile.id, structuredClone(profile)]),
  );
  world.nativeStrikes ??= {};
  for (const strike of ecology.strikes) world.nativeStrikes[strike.id] = structuredClone(strike);
  world.itemDefinitions[ecology.pasture.definition.id] = structuredClone(
    ecology.pasture.definition,
  );
  const ground = ([x, z]: [number, number]) => starterGroundAt(world.map.spatial!, x, z);
  for (const [index, coordinate] of ecology.pasture.anchors.entries()) {
    const point = ground(coordinate),
      id = `base:pasture-${index}`;
    entitySet(world.entities, id, {
      id,
      name: ecology.pasture.definition.name,
      kind: 'resource',
      icon: ecology.pasture.definition.icon,
      spatial: baseSpatial('object'),
      placement: worldPlacement(point, point.surfaceId),
      resource: {
        definitionId: ecology.pasture.definition.id,
        quantity: ecology.pasture.units,
        workSeconds: ecology.profiles
          .flatMap((row) => row.diet)
          .find((row) => row.definitionId === ecology.pasture.definition.id)!.workSeconds,
      },
    });
  }
  for (const entity of entityValues(world.entities)) {
    if (!entity.animal || !entity.actor || entity.threat) continue;
    const assignment = ecology.assignments.find((row) => row.species === entity.actor!.species);
    if (!assignment) continue;
    const profile = world.nativeForagingProfiles[assignment.profileId]!,
      home = assignment.home ? ground(assignment.home) : supportedPosition(entity);
    if (!home) throw new Error('A forager needs an actual supported initial home.');
    const anchors = assignment.anchors.map(ground);
    if (assignment.nearestAnchors !== undefined)
      anchors.sort((a, b) => distance3D(home, a) - distance3D(home, b));
    entity.animal.foraging = {
      profile: definitionPin(profile),
      home: { ...home },
      anchors:
        assignment.nearestAnchors === undefined
          ? anchors
          : anchors.slice(0, assignment.nearestAnchors),
      ...(assignment.packId ? { packId: assignment.packId } : {}),
      mode: 'routine',
      reviewAt: world.simTime,
      emptySources: {},
    };
    const territory = ecology.territories.find((row) => row.profileId === profile.id);
    if (territory) {
      entity.threat = {
        policy: { ...structuredClone(territory.policy), home: { ...home }, refuge: { ...home } },
        mode: 'idle',
        relinquished: false,
        reviewAt: world.simTime,
        detoursSpent: 0,
        repathAt: 0,
        travelledMetres: 0,
      };
      entity.actor.naturalStrikeIds = [territory.policy.strikeDefinitionId];
    }
    const attribute = world.moduleManifest.definitions.find(
      (definition) => definition.id === profile.fullness.attributeId,
    );
    if (!attribute || entity.actor.attributes?.[attribute.id])
      throw new Error('Ecology needs one fresh animal fullness binding.');
    initializeAttributes(entity.actor, [attribute], {
      [attribute.id]: assignment.initialById[entity.id] ?? profile.fullness.initial,
    });
    if (profile.hunt) {
      const response = nativeResponseProfile(world, entity.animal.profile)!;
      entity.animal.profile = installNativeResponseProfile(world, {
        ...structuredClone(response),
        id: `${profile.id}:responses`,
        locomotion: { ...response.locomotion, ...ecology.pursuitLocomotion },
      });
      entity.actor.naturalStrikeIds = [profile.hunt.strikeId];
    }
  }
}
