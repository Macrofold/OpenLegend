import { isSafeRecordId } from './records.js';
import type { Command, WorldState } from './types.js';

/** Extra restrictions on delayed actions, never a grant of perception or identity.
 * docs/action-capabilities.md#mechanical-workflow-reconciliation
 */
export type ActionReferencePins = Record<string, string | null>;

export function commandTargetIds(command: Command | { heatId?: string }): string[] {
  return [
    ...new Set(
      [
        'targetId' in command ? command.targetId : undefined,
        'heatId' in command ? command.heatId : undefined,
      ].filter((id): id is string => typeof id === 'string' && !!id),
    ),
  ];
}

export function captureActionReferences(
  world: WorldState,
  actorId: string,
  targetIds: readonly string[],
  expectedEpisodes?: Record<string, string>,
): ActionReferencePins {
  return Object.fromEntries(
    [...new Set(targetIds)]
      .filter(
        (id) =>
          id !== actorId &&
          !!world.entities[id]?.actor &&
          !world.observerIdentities?.[actorId]?.[id]?.authored,
      )
      .map((id) => [id, (expectedEpisodes ?? world.perceptionEpisodes?.[actorId])?.[id] ?? null]),
  );
}

export function actionReferencesCurrent(
  world: WorldState,
  actorId: string,
  pins: ActionReferencePins,
): boolean {
  return Object.entries(pins).every(
    ([id, episode]) =>
      !!world.entities[id]?.actor &&
      episode !== null &&
      world.perceptionEpisodes?.[actorId]?.[id] === episode,
  );
}

export function commandReferencePins(
  command: Command | { heatId?: string },
  pins: ActionReferencePins,
): ActionReferencePins {
  return Object.fromEntries(
    commandTargetIds(command).flatMap((id) => (Object.hasOwn(pins, id) ? [[id, pins[id]!]] : [])),
  );
}

export function validActionReferencePins(value: unknown): value is ActionReferencePins {
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
