import { isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';

export type ActionTarget = { actorId: string; targetId?: string; heatId?: string };
export type ActionTargetEpisodes = Record<string, string | null>;
const targets = (command: ActionTarget) =>
  [command.targetId, command.heatId].filter(
    (id): id is string => !!id && id !== command.actorId,
  );

/** A saved entity ID is not proof that an anonymous person was re-identified.
 * Reuse the existing perception-episode/creator-authored identity boundary.
 * docs/architecture.md#reviewed-action-binding-and-approval-boundaries
 */
export function captureActionTargets(
  world: WorldState,
  actorId: string,
  commands: readonly ActionTarget[],
): ActionTargetEpisodes {
  return Object.fromEntries(
    commands.flatMap((command) =>
      targets(command)
        .filter((id) => !!world.entities[id]?.actor)
        .map((id) => [id, world.perceptionEpisodes?.[actorId]?.[id] ?? null]),
    ),
  );
}

export function actionTargetsCurrent(
  world: WorldState,
  actorId: string,
  commands: readonly ActionTarget[],
  expected: ActionTargetEpisodes | undefined,
): boolean {
  return commands.every((command) =>
    targets(command).every((id) => {
      if (!world.entities[id]?.actor) return true; // Native admission handles missing objects.
      if (world.observerIdentities?.[actorId]?.[id]?.authored) return true;
      return (
        !!expected &&
        Object.hasOwn(expected, id) &&
        expected[id] === (world.perceptionEpisodes?.[actorId]?.[id] ?? null)
      );
    }),
  );
}

export function validActionTargets(value: unknown): value is ActionTargetEpisodes {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length <= 16 &&
    Object.entries(value).every(
      ([id, episode]) => isSafeRecordId(id) && (episode === null || isSafeRecordId(episode)),
    )
  );
}
