import { confirmActionRevision } from './agency.js';
import { current, isDraft } from 'immer';
import { canWalkSegment, finitePoint, interpolate, type SurfacePoint } from '@open-legend/spatial';
import { bodyProfile, setSpatialPosition, spatialMap, supportedPosition } from './spatial-state.js';
import { FOLLOW_RULES, updateFollowPath } from './follow.js';
  sensesFor,
  contactViews,
  directProbe,
} from './perception.js';
  const encounter = encounterEmitter(world, events);
  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;
  for (const actor of entities.filter((source) => source.alive && source.memory)) {
    const observer = world.entities[actor.id]!;
      continue;
    }
    const touch = sensesFor(world, observer).find(
      (s) => s.implementation === 'contact-proximity-v1',
    );
    if (touch) {
      nearbyAll ??= spatialCandidates(entities);
      // Source IDs stay in private state; acquisition is owner-scoped, never a public encounter.
      // docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling owns intake.
      for (const source of nearbyAll(actor.position, touch.radius)
        .filter(
          (e) =>
            e.id !== actor.id &&
            distance(actor.position, e.position) <= touch.radius &&
            hasLineOfEffect(world, observer, world.entities[e.id]!),
        )
        .slice(0, 32)) {
        const oldPosition = original.entities[source.id]?.position;
        const detail =
