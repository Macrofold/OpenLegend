import { releaseInvocationResources } from './resource-claims.js';
import { finishPlanAction } from './agency.js';
import type { ConstructionPermission } from './assembly-types.js';
import { canStand, incidentExposure, solidOverlap } from '@open-legend/spatial';
import { assemblySite, coverGeometry, localPoint, rectangularBounds } from './assembly-geometry.js';
import { bodyProfile, bodySpace, spatialMap, worldPosition } from './spatial-state.js';
import { worldRootEntities } from './entity-index.js';
import { overlaps } from './assemblies.js';
import { outcome } from './events.js';
import { seesEntity } from './perception.js';
import { canActivateStatusEffect } from './status-effects.js';
import type { Command, Outcome, WorldState } from './types.js';

/** Rechecked after ordinary approach: occupants and the covering may have changed. */
export function evaluateAssemblyRest(
  world: WorldState,
  actorId: string,
  rootId: string,
  bay = 0,
  atCurrentPosition = false,
): { point: import('@open-legend/spatial').SurfacePoint; facingHeading: number } | Outcome {
  const root = world.entities[rootId],
    component = root?.assembly,
    site = root && assemblySite(root),
    family = component && world.assemblyFamilies?.[component.family.id],
    actor = world.entities[actorId];
  if (
    !family ||
    !site ||
    !actor?.actor ||
    !Number.isSafeInteger(bay) ||
    bay < 0 ||
    bay >= family.limits.bays ||
    !seesEntity(world, actor, root!) ||
    !Object.values(component!.parts).some((p) => p.role === 'cover' && p.bay === bay)
  )
    return outcome(false, 'no-cover', 'Choose an actual covered bay.');
  const point = {
      ...(atCurrentPosition
        ? worldPosition(actor)
        : localPoint(site, root!.spatial.heading, bay * family.bay.width, 0)),
      surfaceId: site.surfaceId,
    },
    profile = bodyProfile(actor);
  const placed = {
    ...actor,
    placement: {
      ...actor.placement!,
      mode: 'world' as const,
      position: point,
      supportSurfaceId: point.surfaceId,
      revision: actor.placement!.revision,
    },
  };
  const rest = bodySpace(world, placed, true, root!.spatial.heading, family.restMargin);
  if (
    rest.max.x - rest.min.x >
      (Math.abs(Math.sin(root!.spatial.heading)) > 0.5 ? family.bay.length : family.bay.width) -
        family.bay.postSection ||
    rest.max.z - rest.min.z >
      (Math.abs(Math.sin(root!.spatial.heading)) > 0.5 ? family.bay.width : family.bay.length) -
        family.bay.postSection ||
    !canStand(spatialMap(world), point, profile)
  )
    return outcome(
      false,
      'rest-clearance',
      'This person’s complete resting space does not fit this bay.',
    );
  const roof = coverGeometry(family, site, root!.spatial.heading, bay, component!.arrangementId);
  const coverage = incidentExposure(
    { minX: rest.min.x, maxX: rest.max.x, minZ: rest.min.z, maxZ: rest.max.z, y: rest.max.y },
    [{ id: 'rest-cover', ...roof, transmission: 0 }],
  );
  if (
    coverage.fraction > 1e-7 ||
    spatialMap(world).spatial.blockers.some((b) => solidOverlap({ bounds: rest }, b))
  )
    return outcome(
      false,
      'rest-clearance',
      'The resting place needs complete overhead cover and clear ground.',
    );
  for (const occupant of worldRootEntities(world, true)) {
    if (occupant.id === actorId || occupant.id === rootId || occupant.assembly) continue;
    if (overlaps(rest, bodySpace(world, occupant)))
      return outcome(
        false,
        'rest-occupied',
        'Someone or a belonging occupies this resting place. Choose another clear bay.',
      );
  }
  return { point, facingHeading: root!.spatial.heading };
}

/** A checked place feeds ordinary movement and the installed rest owner; no shelter bonus. */
export function compileAssemblyRest(
  world: WorldState,
  actorId: string,
  id: string,
  rootId: string,
  bay = 0,
): Command | Outcome {
  const checked = evaluateAssemblyRest(world, actorId, rootId, bay);
  if ('ok' in checked) return checked;
  const effect = world.statusEffectPolicy.definitions.find(
    (d) => d.enabled && d.presentation?.pose === 'horizontal' && d.actions?.activate,
  );
  if (!effect)
    return outcome(
      false,
      'rest-unavailable',
      'This world has no available ordinary resting action.',
    );
  const actor = world.entities[actorId]!;
  if (
    !canActivateStatusEffect(world, { subject: actor, source: actor, actionTarget: actor }, effect)
  )
    return outcome(
      false,
      'not-applicable',
      'Ordinary rest is not available for this person right now.',
    );
  return {
    id,
    actorId,
    type: 'compose',
    name: effect.actions!.activate!,
    mode: 'replace',
    bindings: { place: checked.point, person: actorId },
    root: {
      kind: 'sequence',
      name: effect.actions!.activate!,
      children: [
        {
          kind: 'invoke',
          key: 'arrive',
          name: 'Walk to the resting place',
          command: 'move',
          args: { destination: { role: 'place' } },
        },
        {
          kind: 'invoke',
          key: 'rest',
          name: effect.actions!.activate!,
          command: 'status-effect',
          args: {
            targetId: { role: 'person' },
            definitionId: { literal: effect.id },
            operation: { literal: 'activate' },
            facingHeading: { literal: checked.facingHeading },
            restingPlaceId: { literal: rootId },
            restingBay: { literal: bay },
          },
        },
      ],
    },
  };
}

export function reconcileConstructionAuthority(
  world: WorldState,
  permissions: readonly ConstructionPermission[],
): void {
  for (const entity of Object.values(world.entities)) {
    const action = entity.actor?.action;
    if (!action?.assemblyPhase) continue;
    const receipt = action.constructionGrant,
      grant = permissions.find(
        (p) =>
          p.id === receipt?.id &&
          p.actorId === entity.id &&
          !p.revoked &&
          p.revision === receipt.revision,
      );
    if (grant) continue;
    releaseInvocationResources(world, action.id);
    finishPlanAction(
      world,
      entity.id,
      action.id,
      outcome(
        false,
        'construction-permission',
        'Current building permission is unavailable. Installed parts remain.',
      ),
    );
    entity.actor!.action = null;
  }
}
