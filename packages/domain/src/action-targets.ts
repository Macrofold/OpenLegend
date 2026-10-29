import { entityGet } from './entity-collection.js';
import { subjectReferenceCurrent } from './worlds/base/knowledge.js';
import { isSafeRecordId } from './records.js';
import type { WorldState } from './types.js';

export type ActionTarget = {
  actorId: string;
  targetId?: string;
  heatId?: string;
  /** Composition role bindings; entity references among them are targets too. */
  bindings?: Record<string, unknown>;
  /** What a composition is about beyond its bindings (see the compose command). */
  subjects?: readonly string[];
};
export type ActionTargetEpisodes = Record<string, string | null>;
const targets = (command: ActionTarget) =>
  [
    command.targetId,
    command.heatId,
    ...Object.values(command.bindings ?? {}),
    ...(command.subjects ?? []),
  ].filter((id): id is string => typeof id === 'string' && !!id && id !== command.actorId);

export function actionTargetIds(commands: readonly ActionTarget[]): string[] {
  return commands.flatMap(targets);
}

/** A saved entity ID is not proof that an anonymous person was re-identified.
 * Reuse the existing perception-episode/creator-authored identity boundary.
 * docs/architecture.md#reviewed-action-binding-and-approval-boundaries
 */
export function captureActionTargets(
  world: WorldState,
  actorId: string,
  commands: readonly ActionTarget[],
): ActionTargetEpisodes {
  return captureActionTargetReader(world, actorId, actionTargetIds(commands))(commands);
}

function capturedTargetReader(episodes: ReadonlyMap<string, string | null>) {
  return (commands: readonly ActionTarget[]): ActionTargetEpisodes =>
    Object.fromEntries(
      commands
        .flatMap((command) =>
          targets(command).flatMap((id) =>
            episodes.has(id) ? [[id, episodes.get(id)!] as const] : [],
          ),
        )
        .slice(0, 16),
    );
}
/** A request captures offered actor episodes, never a whole world. Unknown new
 * targets are still refused by normal native reference/admission checks. */
export function captureActionTargetReader(
  world: WorldState,
  actorId: string,
  ids: Iterable<string>,
) {
  return capturedTargetReader(
    new Map(
      [...new Set(ids)].flatMap((id) =>
        entityGet(world.entities, id)?.actor
          ? [[id, world.perceptionEpisodes?.[actorId]?.[id] ?? null] as const]
          : [],
      ),
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
      if (!entityGet(world.entities, id)?.actor) return true; // Native admission handles missing objects.
      return subjectReferenceCurrent(
        world,
        actorId,
        id,
        expected && Object.hasOwn(expected, id) ? expected[id] : undefined,
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
