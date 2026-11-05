import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { entityGet, entitySet, NPC_ID, PLAYER_ID } from '@open-legend/domain';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  entityHandles,
  entityLabel,
  entityReferenceMap,
  experienceEntityReferences,
  projectEntityMarkers,
  resolveEntityMarkers,
} from './entity-references.js';

it('resolves only requested exact subjects and keeps annotations and binding together', () => {
  const world = stockedCamp();
  const resolver = entityHandles(world, NPC_ID);
  expect(resolver.resolvedCount).toBe(0);
  expect(resolver.has(PLAYER_ID)).toBe(true);
  expect(resolver.resolvedCount).toBe(0);
  const token = resolver.get(PLAYER_ID)!;
  expect(resolver.resolvedCount).toBe(1);
  expect(entityLabel(world, entityGet(world.entities, PLAYER_ID)!, NPC_ID)).toContain(
    `(ID:${token})`,
  );
  expect(entityReferenceMap(world, [PLAYER_ID], NPC_ID)).toEqual({ [token]: PLAYER_ID });
  expect(projectEntityMarkers(`Person (ID:${PLAYER_ID})`, world, NPC_ID)).toBe(
    'Person (unrecognized identity)',
  );
  expect(resolveEntityMarkers(`(ID:${token})`, { [token]: PLAYER_ID })).toBe(`(ID:${PLAYER_ID})`);
  expect(resolver.get('unavailable-subject')).toBeUndefined();
  expect(resolver.resolvedCount).toBe(1);
  expect(entityHandles(world, PLAYER_ID).get(PLAYER_ID)).not.toBe(token);
});

it('extends a genuinely colliding new token without changing already rendered references', () => {
  const world = stockedCamp();
  const prefixes = new Map<string, string>();
  let pair: [string, string] | undefined;
  for (let index = 0; index < 5000; index++) {
    const id = `reference-subject-${index}`;
    const hash = createHash('sha256')
      .update(JSON.stringify([NPC_ID, id, world.sequence]))
      .digest('hex');
    const prefix = hash.slice(0, 4);
    const previous = prefixes.get(prefix);
    if (previous) {
      pair = [previous, id];
      break;
    }
    prefixes.set(prefix, id);
  }
  expect(pair).toBeDefined();
  for (const id of pair!)
    entitySet(world.entities, id, {
      ...structuredClone(entityGet(world.entities, PLAYER_ID)!),
      id,
    });
  const resolver = entityHandles(world, NPC_ID);
  const first = resolver.get(pair![0])!;
  const label = entityLabel(world, entityGet(world.entities, pair![0])!, NPC_ID);
  const second = resolver.get(pair![1])!;
  expect(first).toHaveLength(4);
  expect(second.startsWith(first)).toBe(true);
  expect(second.length).toBeGreaterThan(first.length);
  expect(resolver.get(pair![0])).toBe(first);
  expect(label).toContain(`(ID:${first})`);
  expect(entityReferenceMap(world, pair!, NPC_ID)).toEqual({
    [first]: pair![0],
    [second]: pair![1],
  });
  expect(resolver.resolvedCount).toBe(2);
});

it('does not disclose hidden world membership through unrecognized stored annotations', () => {
  const world = stockedCamp();
  const id = 'unrecognized-goal-subject';
  const text = `Find the subject (ID:${id}).`;
  const absent = projectEntityMarkers(text, world, NPC_ID);
  entitySet(world.entities, id, {
    ...structuredClone(entityGet(world.entities, PLAYER_ID)!),
    id,
  });
  expect(projectEntityMarkers(text, world, NPC_ID)).toBe(absent);
  expect(absent).toBe('Find the subject (unrecognized identity).');
});

it('keeps remembered-only identities separate and rebuilds recognition in a new snapshot', () => {
  const world = stockedCamp();
  const unknown = 'departed-person';
  const remembered = experienceEntityReferences(world, NPC_ID, [unknown]).get(unknown)!;
  expect(remembered).toMatch(/^remembered-[a-f0-9]{64}$/);
  expect(entityHandles(world, NPC_ID).get(unknown)).toBeUndefined();
  const changed = structuredClone(world);
  ((changed.observerIdentities ??= {})[NPC_ID] ??= {})[unknown] = {
    givenName: 'A remembered person',
    revision: 1,
    encounterId: null,
    authored: true,
  };
  const known = experienceEntityReferences(changed, NPC_ID, [unknown]).get(unknown)!;
  expect(known).toMatch(/^[a-f0-9]{4,64}$/);
  expect(known).not.toBe(remembered);
  expect(entityGet(changed.entities, unknown)).toBeUndefined();
  expect(projectEntityMarkers(`Find (ID:${unknown}).`, changed, NPC_ID)).toBe(
    `Find (ID:${known}).`,
  );
});
