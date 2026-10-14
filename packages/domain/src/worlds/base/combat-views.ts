import { bodyPolicy } from '../../body-policy.js';
import { combatRecoveryDeadline } from '../../contact-defense.js';
import { seesEntity } from '../../perception.js';
import { supportedPosition, worldPosition } from '../../spatial-state.js';
import { sameSurfacePoint } from '../../spatial.js';
import { distance3D, interpolate, type SurfacePoint } from '@open-legend/spatial';
import { BASE_EVASION_DIRECTIONS } from './ranged-counterplay.js';
import type { Entity, WorldState } from '../../types.js';

/** Exact selected movement facts share the installed profile with native execution. */
export function evasionDescription(world: WorldState, actor: Entity, destination: SurfacePoint) {
  const profile = bodyPolicy(world)?.evasion;
  if (!profile) return undefined;
  const distance = distance3D(worldPosition(actor), destination);
  return `Move ${distance.toFixed(2)} m along the selected supported path in ${profile.seconds} game seconds; wait ${profile.repeatSeconds} game seconds between evasions. ${profile.description}`;
}

/** Local disclosed examples. The ordinary point command remains available. */
export function evasionChoices(world: WorldState, actor: Entity) {
  const profile = bodyPolicy(world)?.evasion,
    from = supportedPosition(actor);
  if (!profile || !from) return [];
  return BASE_EVASION_DIRECTIONS.flatMap((direction) => {
    const point = sameSurfacePoint(
      world,
      actor,
      from.x + direction.x * profile.maximumDistance,
      from.z + direction.z * profile.maximumDistance,
    );
    if (!point) return [];
    // The limit measures the supported 3D segment, including a slope's height change.
    const fraction = Math.min(1, profile.maximumDistance / distance3D(from, point));
    const destination = { ...interpolate(from, point, fraction), surfaceId: point.surfaceId };
    return [
      {
        label: `${profile.label} ${direction.label}`,
        description: evasionDescription(world, actor, destination),
        destination,
      },
    ];
  });
}
function preparationDescription(target: Entity): string | undefined {
  const action = target.actor?.action;
  if (action?.ranged && action.stage === 'working')
    return action.ranged.ready
      ? 'Holding a prepared aim; a shot has not been released.'
      : `Preparing a shot; ${Math.ceil(action.remainingSeconds)} game seconds of preparation remain.`;
  if (action?.strikePhase === 'windup')
    return `Preparing a strike; ${Math.ceil(action.remainingSeconds)} game seconds remain.`;
}
/** Read the authoritative activity, returning only the currently visible preparation.
 * Scoped observations deliberately omit private ranged bindings.
 * docs/memory-architecture.md#spatial-context-boundary */
export function observedAttackPreparation(
  world: WorldState,
  observer: Entity,
  target: Pick<Entity, 'id'>,
): string | undefined {
  const current = world.entities[target.id];
  if (!current?.actor?.alive) return;
  const description = preparationDescription(current);
  return description && seesEntity(world, observer, current) ? description : undefined;
}
/** No observed preparation grants the target's private purpose or a hidden countdown. */
export function observedCombatActivity(
  world: WorldState,
  observer: Entity,
  target: Pick<Entity, 'id'>,
): string | undefined {
  const current = world.entities[target.id];
  if (!current?.actor?.alive) return;
  let description = preparationDescription(current);
  if (!description) {
    const recovery = combatRecoveryDeadline(world, current) - world.simTime;
    description =
      recovery > 0
        ? `Recovering from combat; ${Math.ceil(recovery)} game seconds remain. Movement is still possible.`
        : current.actor.action?.evasion
          ? 'Making a chosen short evasive movement. It grants no immunity.'
          : undefined;
  }
  return description && seesEntity(world, observer, current) ? description : undefined;
}
