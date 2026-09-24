import type { ActorResponse, Entity, WorldState } from '@open-legend/domain';
import { createHash } from 'node:crypto';

const cache = new WeakMap<WorldState['entities'], Map<string, string>>();

/** Opaque presentation references are not domain identities or authority.
 * docs/memory-architecture.md#metadata-stays-in-the-server-binding
 */
export function entityHandles(world: WorldState): Map<string, string> {
  const cached = cache.get(world.entities);
  if (cached) return cached;
  const hashes = Object.keys(world.entities).map(
    (id) => [id, createHash('sha256').update(id).digest('hex')] as const,
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
  cache.set(world.entities, handles);
  return handles;
}

/** Native species labels are descriptions, not individual names. */
export function hasIndividualName(entity: Entity): boolean {
  const species = entity.actor?.species;
  return (
    !!entity.name.trim() &&
    ![species, species === 'human' || !species ? 'person' : species].includes(
      entity.name.trim().toLowerCase(),
    )
  );
}

export function entityDisplayName(entity: Entity, recognized = true): string {
  if (!entity.actor) return recognized ? entity.name : 'an unidentified object';
  const species = entity.actor.species;
  const noun = species === 'human' || !species ? 'person' : species;
  const generic = !hasIndividualName(entity);
  return recognized && !generic ? entity.name : `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

export function entityLabel(world: WorldState, entity: Entity, recognized = true): string {
  return `${entityDisplayName(entity, recognized)} (ID:${entityHandles(world).get(entity.id)!})`;
}

export function entityReferenceMap(world: WorldState, ids: string[]): Record<string, string> {
  const handles = entityHandles(world);
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
export function projectEntityMarkers(text: string, world: WorldState): string {
  const handles = entityHandles(world);
  return text.replace(/\(ID:([^()\s]+)\)/g, (original, id: string) =>
    handles.has(id) ? `(ID:${handles.get(id)})` : original,
  );
}

/** Resolve structured references only; prose cannot grant a mechanical target. */
export function resolveResponseEntities(
  response: ActorResponse,
  references: Record<string, string>,
): ActorResponse {
  const resolve = (handle: string) => {
    if (!Object.hasOwn(references, handle))
      throw new Error(`Unpermitted entity reference: ${handle}`);
    return references[handle]!;
  };
  return {
    operations: response.operations.map((op) => ({
      ...op,
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
