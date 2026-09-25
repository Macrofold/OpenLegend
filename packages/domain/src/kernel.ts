import { confirmActionRevision } from './agency.js';
import { current, isDraft } from 'immer';
import {
  canWalkSegment,
  finitePoint,
  interpolate,
  SPATIAL_LIMITS,
  type SurfacePoint,
} from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { FOLLOW_RULES, updateFollowPath } from './follow.js';
  sensesFor,
  contactViews,
  bodiesTouch,
  directProbe,
} from './perception.js';
  const encounter = encounterEmitter(world, events);
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  const maximumBodyHeight = entities.reduce(
    (largest, entity) => Math.max(largest, entity.height),
    0,
  );
  const maximumBodyRadius = entities.reduce(
    (largest, entity) => Math.max(largest, entity.bodyRadius),
    0,
  );
  for (const actor of entities.filter((source) => source.alive && source.memory)) {
    const observer = world.entities[actor.id]!;
      continue;
    }
    const touch = sensesFor(world, observer).find((s) => s.implementation === 'body-contact-v1');
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
      for (const source of nearbyAll(
        actor.position,
        Math.max(actor.bodyRadius + maximumBodyRadius, actor.height, maximumBodyHeight) +
          SPATIAL_LIMITS.epsilon,
      ).filter(
        (e) =>
          e.id !== actor.id &&
          bodiesTouch(observer, world.entities[e.id]!) &&
          hasLineOfEffect(world, observer, world.entities[e.id]!),
      )) {
        const oldPosition = original.entities[source.id]?.position;
        const detail =
