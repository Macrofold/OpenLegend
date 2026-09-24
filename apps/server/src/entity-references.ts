import { observerDescription, recognizesSubject } from '@open-legend/domain';
import type { ActorResponse, Entity, WorldState } from '@open-legend/domain';
import { createHash } from 'node:crypto';

const cache = new WeakMap<WorldState, Map<string, Map<string, string>>>();

/** Opaque presentation references are not domain identities or authority.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding
 */
export function entityHandles(
  world: WorldState,
  observerId = world.identity?.controlledEntityId ?? '',
): Map<string, string> {
  const cached = cache.get(world)?.get(observerId);
  if (cached) return cached;
  const hashes = Object.keys(world.entities).map(
    (id) =>
      [
        id,
        createHash('sha256')
          .update(
            `${observerId}:${id}:${world.perceptionEpisodes?.[observerId]?.[id] ?? (recognizesSubject(world, observerId, id) ? 'known' : world.sequence)}`,
          )
          .digest('hex'),
      ] as const,
  );
  const groups = new Map<string, typeof hashes>();
  for (const entry of hashes) {
    const prefix = entry[1].slice(0, 4);
    const group = groups.get(prefix) ?? [];
    group.push(entry);
    groups.set(prefix, group);
  }
  const handles = new Map<string, string>();
  for (const group of groups.values()) {
    let length = 4;
    while (new Set(group.map(([, hash]) => hash.slice(0, length))).size !== group.length) {
      if (++length > 64) throw new Error('Entity reference collision.');
    }
    for (const [id, hash] of group) handles.set(id, hash.slice(0, length));
  }
  const observers = cache.get(world) ?? new Map<string, Map<string, string>>();
  observers.set(observerId, handles);
  cache.set(world, observers);
  return handles;
}

export function entityLabel(world: WorldState, entity: Entity, observerId: string): string {
  const label = observerDescription(world, observerId, entity.id);
  return `${label} (ID:${entityHandles(world, observerId).get(entity.id)!})`;
}

export function entityReferenceMap(
  world: WorldState,
  ids: string[],
  observerId: string,
): Record<string, string> {
  const handles = entityHandles(world, observerId);
  return Object.fromEntries(
    ids.map((id) => {
      const handle = handles.get(id);
      if (!handle) throw new Error('Referenced entity is unavailable.');
      return [handle, id];
    }),
  );
}

export function resolveEntityMarkers(text: string, references: Record<string, string>): string {
  return text.replace(/\(ID:([^()\s]+)\)/g, (_, handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return `(ID:${references[handle]})`;
  });
}

/** Persist full identities in intentions, then reproject annotations in a later context. */
export function projectEntityMarkers(text: string, world: WorldState, observerId: string): string {
  const handles = entityHandles(world, observerId);
  return text.replace(/\(ID:([^()\s]+)\)/g, (original, id: string) =>
    handles.has(id)
      ? recognizesSubject(world, observerId, id)
        ? `(ID:${handles.get(id)})`
        : '(unrecognized identity)'
      : original,
  );
}

/** Resolve structured references only; prose cannot grant a mechanical target. */
export function resolveResponseEntities(
  response: ActorResponse,
  references: Record<string, string>,
  knowledgeReferences: Record<string, string> = {},
): ActorResponse {
  const resolve = (handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return references[handle]!;
  };
  return {
    operations: response.operations.map((op) => ({
      ...op,
      ...(op.note
        ? {
            note: {
              ...op.note,
              subjectId: op.note.subjectId
                ? Object.hasOwn(knowledgeReferences, op.note.subjectId)
                  ? op.note.subjectId
                  : resolve(op.note.subjectId)
                : null,
              text: resolveEntityMarkers(op.note.text, references),
            },
          }
        : {}),
      ...(op.name ? { name: { ...op.name, subjectId: resolve(op.name.subjectId) } } : {}),
      talk: op.talk ? { ...op.talk, addresseeEntityId: resolve(op.talk.addresseeEntityId) } : null,
      act: op.act
        ? {
            ...op.act,
            targetEntityId: op.act.targetEntityId ? resolve(op.act.targetEntityId) : null,
            description: op.act.description
              ? resolveEntityMarkers(op.act.description, references)
              : null,
          }
        : null,
      think: op.think
        ? {
            ...op.think,
            text: resolveEntityMarkers(op.think.text, references),
            aboutEntityIds: op.think.aboutEntityIds.map(resolve),
          }
        : null,
      goal: op.goal
        ? {
            ...op.goal,
            objective: op.goal.objective
              ? resolveEntityMarkers(op.goal.objective, references)
              : null,
          }
        : null,
    })),
  };
}

/** An old event's canonical source cannot identify a new, unrecognized exposure. */
export function awarenessBindsSubject(
  world: WorldState,
  observerId: string,
  aware: import('@open-legend/domain').Awareness,
  subjectId: string,
): boolean {
  if (subjectId === observerId) return true;
  if (
    aware.recognized &&
    subjectId === aware.sourceId &&
    recognizesSubject(world, observerId, subjectId)
  )
    return true;
  const episode = aware.entityEpisodes?.[subjectId];
  return !!episode && episode === world.perceptionEpisodes?.[observerId]?.[subjectId];
}
