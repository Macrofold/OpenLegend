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

/** A saved entity ID is not proof that an anonymous person was re-identified.
 * Reuse the existing perception-episode/creator-authored identity boundary.
 * docs/architecture.md#reviewed-action-binding-and-approval-boundaries
 */
export function captureActionTargets(
  world: WorldState,
  actorId: string,
  commands: readonly ActionTarget[],
): ActionTargetEpisodes {
  // Saved pins stay within their 16-entry bound; an unpinned extra actor later reads as a
  // changed encounter, which refuses rather than trusting an unchecked identity.
  return Object.fromEntries(
    commands
      .flatMap((command) =>
        targets(command)
          .filter((id) => !!world.entities[id]?.actor)
          .map((id) => [id, world.perceptionEpisodes?.[actorId]?.[id] ?? null] as const),
      )
      .slice(0, 16),
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
