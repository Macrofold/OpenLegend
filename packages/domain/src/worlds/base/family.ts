import type { Transition, WorldState } from '../../types.js';
import { draftWorld } from '../../draft.js';
import { finish, outcome } from '../../events.js';
import { hasRecordFields, isSafeRecordId } from '../../records.js';

/** Biological ancestry is this world's law, not a universal engine constraint.
 * docs/projects/completed/family-authoring-tech-design.md */
export const BASE_FAMILY_POLICY = {
  maxParents: 2,
  title: 'Family',
  parentLabel: 'Parent',
  childLabel: 'Child',
  recordLabel: 'Record parent',
  guidance:
    'Record biological parents. Siblings and ancestry are calculated from the tree. Unknown parents stay unknown.',
};
export interface ParentLink {
  id: string;
  parentId: string;
  childId: string;
}
export interface FamilyTree {
  revision: number;
  links: Record<string, ParentLink>;
}
export type FamilyChange = { kind: 'add' | 'remove'; link: ParentLink };
const emptyLinks: Record<string, ParentLink> = Object.freeze({});
const validId = (id: unknown): id is string =>
  isSafeRecordId(id) && /^[a-zA-Z0-9:_-]{1,120}$/.test(id);
type Index = { parents: Map<string, ParentLink[]>; children: Map<string, ParentLink[]> };
const indexes = new WeakMap<Record<string, ParentLink>, Index>();
function indexFor(links: Record<string, ParentLink>): Index {
  const cached = indexes.get(links);
  if (cached) return cached;
  const result: Index = { parents: new Map(), children: new Map() };
  for (const link of Object.values(links)) {
    result.parents.set(link.childId, [...(result.parents.get(link.childId) ?? []), link]);
    const children = result.children.get(link.parentId);
    if (children) children.push(link);
    else result.children.set(link.parentId, [link]);
  }
  // Drafts/mutable caller data must never retain a stale derived index.
  if (Object.isFrozen(links)) indexes.set(links, result);
  return result;
}
function distances(
  start: string,
  adjacency: Map<string, ParentLink[]>,
  direction: 'parentId' | 'childId',
) {
  const found = new Map<string, number>([[start, 0]]);
  const pending = [start];
  for (let i = 0; i < pending.length; i++) {
    const id = pending[i]!;
    for (const link of adjacency.get(id) ?? []) {
      const next = link[direction];
      if (found.has(next)) continue;
      found.set(next, found.get(id)! + 1);
      pending.push(next);
    }
  }
  found.delete(start);
  return found;
}
export function validateFamilyTree(world: WorldState): void {
  if ('kinships' in world)
    throw new Error(
      'Incompatible development family data. Existing data was not converted or replaced.',
    );
  const tree = world.familyTree;
  if (tree === undefined) return;
  if (
    !hasRecordFields(tree, ['revision', 'links']) ||
    !Number.isSafeInteger(tree.revision) ||
    tree.revision < 0 ||
    !tree.links ||
    typeof tree.links !== 'object' ||
    Array.isArray(tree.links)
  )
    throw new Error('Invalid family tree.');
  const pairs = new Set<string>();
  const counts = new Map<string, number>();
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const [id, link] of Object.entries(tree.links)) {
    if (
      !hasRecordFields(link, ['id', 'parentId', 'childId']) ||
      !validId(id) ||
      link.id !== id ||
      !validId(link.parentId) ||
      !validId(link.childId) ||
      link.parentId === link.childId ||
      !world.entities[link.parentId]?.actor ||
      !world.entities[link.childId]?.actor
    )
      throw new Error('Parent links must connect two existing characters.');
    const parentSpecies = world.entities[link.parentId]!.actor!.species;
    const childSpecies = world.entities[link.childId]!.actor!.species;
    if (!parentSpecies || parentSpecies === 'construct' || parentSpecies !== childSpecies)
      throw new Error(
        'Biological parentage requires characters of the same known biological species.',
      );
    // The current initial actors share placeholder birth times; those are not a genealogy
    // chronology contract. Do not reject authored ancestry by inferring ages from them.
    const pair = `${link.parentId}/${link.childId}`;
    if (pairs.has(pair)) throw new Error('This parent is already recorded.');
    pairs.add(pair);
    const count = (counts.get(link.childId) ?? 0) + 1;
    if (count > BASE_FAMILY_POLICY.maxParents)
      throw new Error('A character can have at most two biological parents.');
    counts.set(link.childId, count);
    indegree.set(link.childId, (indegree.get(link.childId) ?? 0) + 1);
    if (!indegree.has(link.parentId)) indegree.set(link.parentId, 0);
    const next = children.get(link.parentId);
    if (next) next.push(link.childId);
    else children.set(link.parentId, [link.childId]);
  }
  const ready = [...indegree].filter(([, n]) => n === 0).map(([id]) => id);
  for (let i = 0; i < ready.length; i++)
    for (const child of children.get(ready[i]!) ?? []) {
      const count = indegree.get(child)! - 1;
      indegree.set(child, count);
      if (!count) ready.push(child);
    }
  if (ready.length !== indegree.size) throw new Error('Parentage cannot contain a cycle.');
}
export function changeFamilyTree(
  input: WorldState,
  change: FamilyChange,
  expectedRevision: number,
): Transition {
  const reject = (message: string) => ({
    world: input,
    events: [],
    outcome: outcome(false, 'family-rejected', message),
  });
  const revision = input.familyTree?.revision ?? 0;
  if (revision !== expectedRevision)
    return reject('The family tree changed. Refresh before editing.');
  if (!Number.isSafeInteger(revision + 1)) return reject('Family revision exhausted.');
  const links = input.familyTree?.links ?? emptyLinks;
  const { link } = change;
  if (
    !hasRecordFields(link, ['id', 'parentId', 'childId']) ||
    !validId(link.id) ||
    !validId(link.parentId) ||
    !validId(link.childId)
  )
    return reject('Invalid parent link.');
  const prior = links[link.id];
  if (change.kind === 'remove') {
    if (!prior || prior.parentId !== link.parentId || prior.childId !== link.childId)
      return reject('This parent link changed or was removed. Refresh before deleting.');
  } else if (change.kind === 'add') {
    if (prior) return reject('This parent link identity is already in use.');
  } else return reject('Unsupported family edit.');
  const world = draftWorld(input);
  world.familyTree ??= { revision: 0, links: {} };
  if (change.kind === 'add') world.familyTree.links[link.id] = { ...link };
  else delete world.familyTree.links[link.id];
  world.familyTree.revision++;
  try {
    validateFamilyTree(world);
  } catch (error) {
    return reject(error instanceof Error ? error.message : 'Invalid family tree.');
  }
  // Creator edits change authority, not what characters have perceived or remembered.
  return finish(
    world,
    [],
    outcome(
      true,
      'family-changed',
      change.kind === 'add'
        ? 'Parent recorded.'
        : 'Parent link deleted. Memories were left unchanged.',
    ),
  );
}
export function familyRelations(
  world: WorldState,
  actorId: string,
): Array<{ actorId: string; description: string; link?: ParentLink }> {
  const index = indexFor(world.familyTree?.links ?? emptyLinks);
  const result: Array<{ actorId: string; description: string; link?: ParentLink }> = [];
  const childLinks = new Map(
    (index.children.get(actorId) ?? []).map((link) => [link.childId, link]),
  );
  for (const [id, depth] of distances(actorId, index.parents, 'parentId'))
    result.push({
      actorId: id,
      description:
        depth === 1 ? 'Parent' : depth === 2 ? 'Grandparent' : `Ancestor (${depth} generations)`,
      ...(depth === 1 ? { link: index.parents.get(actorId)?.find((l) => l.parentId === id) } : {}),
    });
  for (const [id, depth] of distances(actorId, index.children, 'childId'))
    result.push({
      actorId: id,
      description:
        depth === 1 ? 'Child' : depth === 2 ? 'Grandchild' : `Descendant (${depth} generations)`,
      ...(depth === 1 ? { link: childLinks.get(id) } : {}),
    });
  const parents = new Set((index.parents.get(actorId) ?? []).map((l) => l.parentId));
  const siblings = new Set(
    [...parents].flatMap((id) => (index.children.get(id) ?? []).map((l) => l.childId)),
  );
  siblings.delete(actorId);
  for (const id of siblings) {
    const other = index.parents.get(id) ?? [];
    const shared = other.filter((l) => parents.has(l.parentId)).length;
    const description =
      shared === 2
        ? 'Full sibling'
        : parents.size === 2 && other.length === 2
          ? 'Half-sibling'
          : 'Sibling (one recorded shared parent; other ancestry unknown)';
    result.push({ actorId: id, description });
  }
  return result;
}
export function parentLinkSentence(parent: string, child: string): string {
  return `${parent} is a parent of ${child}.`;
}
