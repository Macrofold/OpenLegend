import { describe, expect, it } from 'vitest';
import {
  admitDeclaration,
  advanceWorld,
  createWorld,
  executeCommand,
  findPath,
  inventoryFor,
  isWalkable,
  observeActor,
  quantityOf,
  queryMemories,
  remember,
  validateDeclaration,
} from './index.js';
import type { Command, DeclarationDraft, WorldState } from './types.js';

/** Test-only specimens. Production seeds contain no finished recipe composition. */
const sling = (): DeclarationDraft => ({
  schemaVersion: 1,
  name: 'Woven river sling',
  description: 'A fiber pouch held between two lengths of cord.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  workSeconds: 60,
  output: {
    kind: 'launcher',
    name: 'Woven river sling',
    description: 'Swings a small stone from a flexible pouch.',
    properties: ['flexible'],
    launcher: { mechanism: 'swing', ammunitionKind: 'stone', damage: 18, range: 7, accuracy: 0.9 },
  },
});
const bow = (): DeclarationDraft => ({
  schemaVersion: 1,
  name: 'Branch bow',
  description: 'A springy branch and a tensioned cord.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'body' },
    { definitionId: 'cord', quantity: 1, role: 'binding' },
  ],
  workSeconds: 100,
  output: {
    kind: 'launcher',
    name: 'Branch bow',
    description: 'Stores flexion to launch a compatible arrow.',
    properties: ['flexible', 'rigid'],
    launcher: { mechanism: 'flex', ammunitionKind: 'arrow', damage: 22, range: 8, accuracy: 0.8 },
  },
});
const arrow = (): DeclarationDraft => ({
  schemaVersion: 1,
  name: 'Bone-pointed arrow',
  description: 'A straight shaft, bone point and fiber fletching.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'shaft' },
    { definitionId: 'bone', quantity: 1, role: 'point' },
    { definitionId: 'prepared_fiber', quantity: 1, role: 'fletching' },
  ],
  workSeconds: 72,
  output: {
    kind: 'ammunition',
    name: 'Bone-pointed arrow',
    description: 'A compatible physical projectile.',
    properties: ['projectile', 'rigid'],
    ammunition: { kind: 'arrow', damageBonus: 2 },
  },
});
function command(
  world: WorldState,
  body: Omit<Command, 'id' | 'actorId'> | Record<string, unknown>,
  actorId = 'player',
): WorldState {
  const result = executeCommand(world, {
    ...body,
    actorId,
    id: `test-${world.sequence}-${world.nextId}`,
  } as Command);
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return result.world;
}
function itemId(world: WorldState, definitionId: string, actorId = 'player'): string {
  const item = inventoryFor(world, actorId).find((value) => value.definitionId === definitionId);
  expect(item, `Expected ${definitionId} in inventory`).toBeDefined();
  return item!.id;
}
function addRecipe(
  world: WorldState,
  draft = sling(),
  requestId = 'request-sling',
): { world: WorldState; recipeId: string } {
  const result = admitDeclaration(world, draft, {
    actorId: 'player',
    requestId,
    source: 'test-fixture',
  });
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return { world: result.world, recipeId: result.outcome.recipeId! };
}
function makeSling(seed = 73): WorldState {
  const admitted = addRecipe(createWorld(seed));
  let world = command(admitted.world, { type: 'craft', recipeId: admitted.recipeId });
  world = advanceWorld(world, 60).world;
  return command(world, {
    type: 'equip',
    itemId: itemId(world, world.recipes[admitted.recipeId]!.outputDefinitionId),
  });
}

describe('authoritative pure world', () => {
  it('starts in wilderness with knowledge and possessions but no invented recipe', () => {
    const world = createWorld();
    expect(world).toEqual(createWorld());
    expect(world.recipes).toEqual({});
    expect(world.knowledge.ada).toEqual([]);
    expect(quantityOf(world, 'player', 'cord')).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });
  it('does not mutate its input and makes duplicate commands harmless', () => {
    const original = createWorld();
    const snapshot = structuredClone(original);
    const eat: Command = {
      id: 'eat-1',
      actorId: 'player',
      type: 'eat',
      itemId: itemId(original, 'berries'),
    };
    const result = executeCommand(original, eat);
    expect(original).toEqual(snapshot);
    expect(quantityOf(result.world, 'player', 'berries')).toBe(2);
    expect(executeCommand(result.world, eat).world).toEqual(result.world);
    expect(executeCommand(result.world, { ...eat, itemId: 'other' }).outcome.code).toBe(
      'idempotency-conflict',
    );
  });
  it('freezes work, needs, random draws and speech while paused', () => {
    let world = command(createWorld(), { type: 'rest' });
    world = { ...world, paused: true };
    expect(advanceWorld(world, 80000).world).toBe(world);
    expect(
      executeCommand(world, { id: 'speech', actorId: 'ada', type: 'say', text: 'Hello' }).outcome
        .code,
    ).toBe('paused');
    expect(
      admitDeclaration(world, sling(), {
        actorId: 'player',
        requestId: 'paused',
        source: 'test-fixture',
      }).outcome.code,
    ).toBe('paused');
  });
  it('routes around grid obstacles and rejects out-of-bounds ground', () => {
    let world = createWorld();
    const destination = { x: 20, z: 7 };
    const path = findPath(world, { x: 15, z: 7 }, destination)!;
    expect(path.length).toBeGreaterThan(5);
    expect(path.every((point) => isWalkable(world, point))).toBe(true);
    expect(isWalkable(world, { x: -0.2, z: 12 })).toBe(false);
    world = command(world, { type: 'move', destination });
    world = advanceWorld(world, 240).world;
    expect(world.entities.player!.position).toEqual(destination);
    expect(world.entities.player!.actor!.action).toBeNull();
  });
  it('resumes in-progress native work exactly after a JSON restore', () => {
    const initial = command(createWorld(), { type: 'gather', targetId: 'branches' });
    const midway = advanceWorld(initial, 30).world;
    const restored = JSON.parse(JSON.stringify(midway)) as WorldState;
    expect(advanceWorld(restored, 120).world).toEqual(advanceWorld(midway, 120).world);
  });
});

describe('bounded invented mechanisms', () => {
  it('admits a new composition idempotently and teaches only its inventor', () => {
    const original = createWorld();
    const admitted = addRecipe(original);
    expect(original.recipes).toEqual({});
    expect(admitted.world.knowledge.player).toHaveLength(1);
    expect(admitted.world.knowledge.ada).toHaveLength(0);
    const repeated = admitDeclaration(admitted.world, sling(), {
      actorId: 'player',
      requestId: 'request-sling',
      source: 'test-fixture',
    });
    expect(repeated.world).toBe(admitted.world);
    const changed = sling();
    changed.workSeconds = 70;
    expect(
      admitDeclaration(admitted.world, changed, {
        actorId: 'player',
        requestId: 'request-sling',
        source: 'test-fixture',
      }).outcome.code,
    ).toBe('idempotency-conflict');
    expect(
      executeCommand(admitted.world, {
        id: 'unlearned',
        actorId: 'ada',
        type: 'craft',
        recipeId: admitted.recipeId,
      }).outcome.code,
    ).toBe('not-learned');
    const taught = command(admitted.world, {
      type: 'teach',
      targetId: 'ada',
      recipeId: admitted.recipeId,
    });
    expect(taught.knowledge.ada?.[0]?.source).toBe('taught');
  });
  it('rejects invented sources, overpowered effects, missing roles and unknown fields atomically', () => {
    const world = createWorld();
    const candidates: unknown[] = [
      { ...sling(), effects: [{ spawn: 'food' }] },
      {
        ...sling(),
        inputs: [
          { definitionId: 'stone', quantity: 1, role: 'binding' },
          { definitionId: 'wood', quantity: 1, role: 'pouch' },
        ],
      },
      {
        ...sling(),
        output: { ...sling().output, launcher: { ...sling().output.launcher, damage: 999 } },
      },
      { ...sling(), inputs: [] },
      { ...sling(), workSeconds: 0 },
      { ...sling(), output: { ...sling().output, nutrition: 100 } },
    ];
    for (const candidate of candidates) {
      expect(validateDeclaration(world, candidate).length).toBeGreaterThan(0);
      const result = admitDeclaration(world, candidate as DeclarationDraft, {
        actorId: 'player',
        requestId: 'bad',
        source: 'test-fixture',
      });
      expect(result.outcome.ok).toBe(false);
      expect(result.world).toBe(world);
    }
  });
  it('requires actual materials, spends once at work start, and never refunds canceled work', () => {
    const { world: admitted, recipeId } = addRecipe(createWorld());
    const before = quantityOf(admitted, 'player', 'prepared_fiber');
    let world = command(admitted, { type: 'craft', recipeId });
    expect(quantityOf(world, 'player', 'prepared_fiber')).toBe(before - 2);
    expect(quantityOf(world, 'player', world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    world = command(world, { type: 'cancel' });
    world = advanceWorld(world, 300).world;
    expect(quantityOf(world, 'player', 'prepared_fiber')).toBe(before - 2);
    expect(quantityOf(world, 'player', world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    world = command(world, { type: 'craft', recipeId });
    world = advanceWorld(world, 60).world;
    expect(quantityOf(world, 'player', world.recipes[recipeId]!.outputDefinitionId)).toBe(1);
    expect(
      executeCommand(world, { id: 'empty', actorId: 'player', type: 'craft', recipeId }).outcome
        .code,
    ).toBe('missing-material');
  });
  it('completes a generated sling → hunt → finite harvest → cook → eat loop', () => {
    let world = makeSling();
    const ammoBefore = quantityOf(world, 'player', 'stone');
    world = command(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 24).world;
    expect(quantityOf(world, 'player', 'stone')).toBe(ammoBefore - 1);
    expect(world.entities['hare-1']!.animal!.alive).toBe(false);
    world = command(world, { type: 'harvest', targetId: 'hare-1' });
    world = advanceWorld(world, 180).world;
    expect(quantityOf(world, 'player', 'raw_meat')).toBe(2);
    expect(quantityOf(world, 'player', 'bone')).toBe(2);
    expect(
      executeCommand(world, { id: 'again', actorId: 'player', type: 'harvest', targetId: 'hare-1' })
        .outcome.code,
    ).toBe('not-harvestable');
    expect(
      executeCommand(world, {
        id: 'raw',
        actorId: 'player',
        type: 'eat',
        itemId: itemId(world, 'raw_meat'),
      }).outcome.code,
    ).toBe('not-edible');
    world = command(world, { type: 'cook', itemId: itemId(world, 'raw_meat'), heatId: 'campfire' });
    world = advanceWorld(world, 200).world;
    expect(quantityOf(world, 'player', 'raw_meat')).toBe(1);
    expect(quantityOf(world, 'player', 'cooked_meat')).toBe(1);
    const fullness = world.entities.player!.actor!.fullness;
    world = command(world, { type: 'eat', itemId: itemId(world, 'cooked_meat') });
    expect(world.entities.player!.actor!.fullness).toBeGreaterThan(fullness);
    expect(quantityOf(world, 'player', 'cooked_meat')).toBe(0);
  });
  it('uses the same ranged family for a bow with compatible crafted arrows', () => {
    let { world, recipeId } = addRecipe(createWorld(), bow(), 'bow');
    world = command(world, { type: 'craft', recipeId });
    world = advanceWorld(world, 100).world;
    world = command(world, {
      type: 'equip',
      itemId: itemId(world, world.recipes[recipeId]!.outputDefinitionId),
    });
    expect(
      executeCommand(world, {
        id: 'wrong-ammo',
        actorId: 'player',
        type: 'hunt',
        targetId: 'hare-1',
      }).outcome.code,
    ).toBe('no-ammunition');
    world.items['fixture-bone'] = {
      id: 'fixture-bone',
      ownerId: 'player',
      definitionId: 'bone',
      quantity: 2,
    };
    ({ world, recipeId } = addRecipe(world, arrow(), 'arrow'));
    world = command(world, { type: 'craft', recipeId });
    world = advanceWorld(world, 72).world;
    expect(quantityOf(world, 'player', world.recipes[recipeId]!.outputDefinitionId)).toBe(1);
    world = command(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 30).world;
    expect(quantityOf(world, 'player', world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    expect(
      world.events.some((event) => event.type === 'shot' && event.data?.ammunitionKind === 'arrow'),
    ).toBe(true);
  });
  it('records misses, spends one projectile and makes the animal react', () => {
    let world = makeSling();
    world.rngState = 12345;
    const weapon =
      world.itemDefinitions[
        world.items[world.entities.player!.actor!.equippedItemId!]!.definitionId
      ]!;
    weapon.launcher!.accuracy = 0.6;
    world = command(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 20).world;
    expect(world.events.some((event) => event.type === 'shot' && event.data?.hit === false)).toBe(
      true,
    );
    expect(world.entities['hare-1']!.animal!.fleeSeconds).toBeGreaterThan(0);
    expect(world.entities['hare-1']!.animal!.health).toBe(18);
    expect(quantityOf(world, 'player', 'stone')).toBe(5);
  });
  it('resolves competing harvesters once and never duplicates finite remains', () => {
    let world = makeSling();
    world = command(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 24).world;
    const position = world.entities['hare-1']!.position;
    world.entities.player!.position = { ...position };
    world.entities.ada!.position = { ...position };
    world = command(world, { type: 'harvest', targetId: 'hare-1' });
    world = command(world, { type: 'harvest', targetId: 'hare-1' }, 'ada');
    world = advanceWorld(world, 90).world;
    expect(quantityOf(world, 'player', 'raw_meat') + quantityOf(world, 'ada', 'raw_meat')).toBe(2);
    expect(world.events.filter((event) => event.type === 'harvested')).toHaveLength(1);
  });
  it('revalidates the animal before spending ammunition on a queued shot', () => {
    let world = makeSling();
    world = command(world, { type: 'hunt', targetId: 'hare-1' });
    world.entities['hare-1']!.animal!.alive = false;
    world = advanceWorld(world, 24).world;
    expect(quantityOf(world, 'player', 'stone')).toBe(6);
    expect(world.events.some((event) => event.type === 'shot')).toBe(false);
    expect(world.entities.player!.actor!.action).toBeNull();
  });
  it('requires shaft-capable material for an arrow, not merely any rigid object', () => {
    const candidate = arrow();
    candidate.inputs[0]!.definitionId = 'stone';
    expect(
      validateDeclaration(createWorld(), candidate).some((error) => error.includes('shaft')),
    ).toBe(true);
  });
  it('approaches close enough to fire a short-range tool at an already fleeing animal', () => {
    const draft = sling();
    draft.output.launcher!.range = 3;
    draft.output.launcher!.damage = 10;
    const admitted = addRecipe(createWorld(), draft);
    let world = command(admitted.world, { type: 'craft', recipeId: admitted.recipeId });
    world = advanceWorld(world, 60).world;
    world = command(world, {
      type: 'equip',
      itemId: itemId(world, world.recipes[admitted.recipeId]!.outputDefinitionId),
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      world = command(world, { type: 'hunt', targetId: 'hare-1' });
      for (let seconds = 0; seconds < 400 && world.entities.player!.actor!.action; seconds++)
        world = advanceWorld(world, 1).world;
      expect(world.entities.player!.actor!.action).toBeNull();
    }
    expect(world.events.filter((event) => event.type === 'shot')).toHaveLength(2);
    expect(
      world.events.some(
        (event) => event.type === 'action-stopped' && event.text.includes('out of range'),
      ),
    ).toBe(false);
    expect(quantityOf(world, 'player', 'stone')).toBe(4);
  });
});

describe('perception, survival and continuity', () => {
  it('preserves event-time listeners and private memories independently of later positions', () => {
    let world = createWorld();
    world.entities.ada!.position = { x: 26, z: 22 };
    world = command(world, { type: 'say', text: 'The secret is moonflower.' });
    world.entities.ada!.position = { x: 12, z: 13 };
    expect(
      queryMemories(world, 'ada').some((record) => record.summary.includes('moonflower')),
    ).toBe(false);
    expect(observeActor(world, 'ada')!.recentEvents.some((event) => event.type === 'speech')).toBe(
      false,
    );
    world = command(world, { type: 'say', text: 'I will bring you berries.', targetId: 'ada' });
    const event = world.events.at(-1)!;
    world = remember(world, 'ada', {
      kind: 'commitment',
      source: 'heard',
      summary: 'The newcomer promised me berries.',
      entityIds: ['player'],
      eventId: event.id,
      importance: 10,
    }).world;
    expect(queryMemories(world, 'ada')[0]!.kind).toBe('commitment');
    expect(queryMemories(world, 'player').some((record) => record.kind === 'commitment')).toBe(
      false,
    );
    expect(
      observeActor(world, 'player')!.visibleEntities.find((entity) => entity.id === 'ada')!.actor!
        .goal,
    ).toBe('');
  });
  it('keeps native NPC foraging and eating functional without a provider', () => {
    let world = createWorld();
    world.entities.ada!.actor!.fullness = 20;
    for (const item of inventoryFor(world, 'ada'))
      if (item.definitionId === 'berries') delete world.items[item.id];
    world = advanceWorld(world, 300).world;
    expect(world.entities.ada!.actor!.alive).toBe(true);
    expect(world.entities.ada!.actor!.fullness).toBeGreaterThan(38);
    expect(world.events.some((event) => event.actorId === 'ada' && event.type === 'gathered')).toBe(
      true,
    );
  });
  it('allows NPC death while preserving separate player recovery and history', () => {
    let world = createWorld();
    for (const item of inventoryFor(world, 'ada')) delete world.items[item.id];
    for (const entity of Object.values(world.entities))
      if (entity.resource) entity.resource.quantity = 0;
    for (const actor of [world.entities.player!, world.entities.ada!]) {
      actor.actor!.fullness = 0;
      actor.actor!.health = 0.01;
    }
    world = advanceWorld(world, 3).world;
    expect(world.entities.ada!.actor!.alive).toBe(false);
    expect(world.entities.player!.actor!.incapacitated).toBe(true);
    world = command(world, { type: 'recover' });
    expect(world.entities.player!.actor!.health).toBe(65);
    expect(world.events.some((event) => event.type === 'death' && event.actorId === 'ada')).toBe(
      true,
    );
  });
});
