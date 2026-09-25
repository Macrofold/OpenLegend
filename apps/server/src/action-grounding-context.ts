import type { Command, NavigationInvocation, WorldState } from '@open-legend/domain';
import { entityReferenceMap } from './entity-references.js';

/** Grounding consumes native bindings but providers only see current observer-scoped tokens.
 * Keep canonical identities out of the second-stage prompt just as in the first decision.
 * docs/architecture.md#jev-first-action-grounding
 */
export function groundingReferences(world: WorldState, actorId: string, entityIds: string[]) {
  const references = entityReferenceMap(world, entityIds, actorId);
  const handles = new Map(Object.entries(references).map(([token, id]) => [id, token]));
  const reference = (id: string | null | undefined) => (id ? handles.get(id) ?? null : null);
  const text = (value: string) =>
    value.replace(/\(ID:([^()\s]+)\)/g, (_, id: string) => {
      const token = handles.get(id) ?? (Object.hasOwn(references, id) ? id : undefined);
      return token ? `(ID:${token})` : '(unavailable reference)';
    });
  const permitted = (command: Command) =>
    (!('targetId' in command) || !command.targetId || handles.has(command.targetId)) &&
    (!('heatId' in command) || !command.heatId || handles.has(command.heatId));
  return {
    reference,
    text,
    permitted,
    invocation(value: NavigationInvocation): NavigationInvocation | undefined {
      const target = value.targetEntityId;
      if (target !== null && !Object.hasOwn(references, target)) return;
      return { ...value, targetEntityId: target === null ? null : references[target]! };
    },
    command(command: Command) {
      if (!permitted(command)) throw new Error('The native action has an unavailable target.');
      const { id: _id, actorId: _actorId, ...parameters } = command;
      return {
        ...parameters,
        ...('targetId' in command ? { targetId: reference(command.targetId) } : {}),
        ...('heatId' in command ? { heatId: reference(command.heatId) } : {}),
      };
    },
  };
}
