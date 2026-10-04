import { createHash } from 'node:crypto';
import {
  BASE_FAMILY_POLICY,
  familyRelations,
  parentLinkSentence,
  type WorldState,
} from '@open-legend/domain';
import type { FamilyView, FamilyPeoplePage } from '@open-legend/protocol';

const PAGE_SIZE = 30;
function signature(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function page<T>(rows: T[], after: string | undefined, identity: unknown) {
  const digest = signature(identity);
  let offset = 0;
  if (after) {
    const parts = after.split(':');
    const [pin, position] = parts;
    offset = Number(position);
    if (
      parts.length !== 2 ||
      pin !== digest ||
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > rows.length
    )
      throw new Error('This family page changed. Refresh to continue.');
  }
  return {
    rows: rows.slice(offset, offset + PAGE_SIZE),
    next: offset + PAGE_SIZE < rows.length ? `${digest}:${offset + PAGE_SIZE}` : null,
  };
}
/** On-demand creator projection only; never called by ordinary view/cognition. */
export function familyPeople(
  world: WorldState,
  generation: string,
  query: string,
  after?: string,
): FamilyPeoplePage {
  const text = query.trim().toLocaleLowerCase();
  const all = Object.values(world.entities)
    .filter((entity) => entity.actor)
    .map((entity) => ({ id: entity.id, label: entity.name, detail: entity.actor?.description }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const result = page(
    all.filter((actor) => actor.label.toLocaleLowerCase().includes(text)),
    after,
    [generation, text, all],
  );
  return { ok: true, people: result.rows, next: result.next };
}
export function projectFamily(
  world: WorldState,
  generation: string,
  actorId: string,
  after?: string,
  parentId?: string,
): FamilyView {
  const actor = world.entities[actorId];
  if (!actor?.actor) throw new Error('Choose an existing character.');
  const revision = world.familyTree?.revision ?? 0;
  const rows = familyRelations(world, actorId)
    .map((relation) => {
      const other = world.entities[relation.actorId]!;
      return {
        ...relation,
        label: other.name,
        ...(relation.link
          ? {
              deletion: parentLinkSentence(
                world.entities[relation.link.parentId]!.name,
                world.entities[relation.link.childId]!.name,
              ),
            }
          : {}),
      };
    })
    .sort(
      (a, b) => a.actorId.localeCompare(b.actorId) || a.description.localeCompare(b.description),
    );
  const result = page(rows, after, [generation, revision, actorId, rows]);
  const parent = parentId ? world.entities[parentId] : undefined;
  return {
    ok: true,
    generation,
    revision,
    actor: { id: actorId, label: actor.name },
    policy: BASE_FAMILY_POLICY,
    relations: result.rows,
    next: result.next,
    ...(parent?.actor ? { preview: parentLinkSentence(parent.name, actor.name) } : {}),
  };
}
