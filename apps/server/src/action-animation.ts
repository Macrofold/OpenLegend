import { strikeDefinition, type Entity, type WorldState } from '@open-legend/domain';
import type { ActionAnimation } from '@open-legend/protocol';

/** Explicit null clears merged player deltas after completion/cancellation; undefined disappears in JSON.
 * Public motion only: no target identity or private plan leaves this projection. */
export function actionAnimation(world: WorldState, entity: Entity): ActionAnimation | null {
  const action = entity.actor?.action;
  if (action?.type !== 'strike' || action.stage !== 'working') return null;
  const definition = strikeDefinition(action.definitionId);
  const target = world.entities[action.targetId ?? ''];
  if (!definition || !target) return null;
  const x = target.position.x - entity.position.x,
    z = target.position.z - entity.position.z;
  const length = Math.hypot(x, z) || 1;
  return {
    id: action.id,
    kind: definition.animation,
    progress: Math.max(0, Math.min(1, 1 - action.remainingSeconds / action.totalSeconds)),
    direction: { x: x / length, z: z / length },
  };
}
