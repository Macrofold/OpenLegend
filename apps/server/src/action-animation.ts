import { worldPosition, seesEntity } from '@open-legend/domain';
import { strikeDefinition, type Entity, type WorldState } from '@open-legend/domain';
import type { ActionAnimation } from '@open-legend/protocol';

/** Explicit null clears merged player deltas after completion/cancellation; undefined disappears in JSON.
 * Public motion only: no target identity or private plan leaves this projection. */
export function actionAnimation(world: WorldState, entity: Entity): ActionAnimation | null {
  const action = entity.actor?.action;
  if (action?.type !== 'strike' || action.stage !== 'working') return null;
  const definition = strikeDefinition(action.definitionId, world, action.weaponItemId);
  const target = world.entities[action.targetId ?? ''];
  if (!definition || (!target && action.strikePhase !== 'recovery')) return null;
  // Recovery or a lost target is the actor's own motion, never hidden target tracking.
  const tracking = action.strikePhase !== 'recovery' && target && seesEntity(world, entity, target);
  const x = tracking
      ? worldPosition(target).x - worldPosition(entity).x
      : Math.sin(entity.spatial.heading),
    z = tracking
      ? worldPosition(target).z - worldPosition(entity).z
      : Math.cos(entity.spatial.heading);
  const length = Math.hypot(x, z) || 1;
  return {
    id: action.id,
    kind: definition.animation,
    phase: action.strikePhase ?? 'windup',
    ...(action.weaponItemId ? { tool: world.itemDefinitions[definition.id]!.name } : {}),
    progress: Math.max(0, Math.min(1, 1 - action.remainingSeconds / action.totalSeconds)),
    direction: { x: x / length, z: z / length },
  };
}
