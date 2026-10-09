import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { createItemLot, itemFor, retireItem, setSpatialPosition, worldSupport } from './index.js';
import { worldPosition } from './spatial-state.js';
import {
  advanceWithNavigation as advanceWorld,
  prepareWorldNavigation,
} from '../../../tests/fixtures/navigation.js';
import { describe, expect, it } from 'vitest';
import {
  admitDeclaration,
  createWorld,
  executeCommand,
  findPath,
  familyMaterialEligible,
  inventoryFor,
  isWalkable,
  observeActor,
  quantityOf,
  queryMemories,
  remember,
  recipeFamily,
  validateDeclaration,
  lethalAttackOffer,
} from './index.js';
import type { Command, DeclarationDraft, WorldState } from './types.js';

/** Test-only specimens. Authored methods remain undisclosed; these specimens exercise independent invention. */
const sling = (): DeclarationDraft => ({
  family: { id: 'base:swing', version: 1 },
  name: 'Woven river sling',
  description: 'A fiber pouch held between two lengths of cord.',
  inputs: [
    { definitionId: 'cord', quantity: 1, role: 'binding' },
    { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
  ],
  output: {
    name: 'Woven river sling',
    description: 'Swings a small stone from a flexible pouch.',
  },
  parameters: { workSeconds: 60, damage: 18, range: 7, accuracy: 0.9 },
});
const bow = (): DeclarationDraft => ({
  family: { id: 'base:flex', version: 1 },
  name: 'Branch bow',
  description: 'A springy branch and a tensioned cord.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'body' },
    { definitionId: 'cord', quantity: 1, role: 'binding' },
  ],
  output: {
    name: 'Branch bow',
    description: 'Stores flexion to launch a compatible arrow.',
  },
  parameters: { workSeconds: 100, damage: 22, range: 8, accuracy: 0.8 },
});
const arrow = (): DeclarationDraft => ({
  family: { id: 'base:arrow', version: 1 },
  name: 'Bone-pointed arrow',
  description: 'A straight shaft, bone point and fiber fletching.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'shaft' },
    { definitionId: 'bone', quantity: 1, role: 'point' },
    { definitionId: 'prepared_fiber', quantity: 1, role: 'fletching' },
  ],
  output: {
    name: 'Bone-pointed arrow',
    description: 'A compatible physical projectile.',
  },
  parameters: { workSeconds: 72, damageBonus: 2 },
});
function command(
  world: WorldState,
  body: Omit<Command, 'id' | 'actorId'> | Record<string, unknown>,
  actorId = PLAYER_ID,
): WorldState {
  const result = executeCommand(world, {
    ...body,
    actorId,
    id: `test-${world.sequence}-${world.nextId}`,
  } as Command);
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return result.world;
}
/** These hunting fixtures explicitly choose the offered lethal attempt. */
function confirmedAttack(
  world: WorldState,
  body: Record<string, unknown>,
  actorId = PLAYER_ID,
): WorldState {
  const intended = { ...body, actorId, id: `test-${world.sequence}-${world.nextId}` } as Command;
  const review = lethalAttackOffer(world, intended);
  return command(
    world,
    review ? { ...review.command, lethalPermission: review.permission } : body,
    actorId,
  );
}
function itemId(world: WorldState, definitionId: string, actorId = PLAYER_ID): string {
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
    actorId: PLAYER_ID,
    requestId,
    source: 'test-fixture',
    authority: { origin: 'player', policyRevision: 1 },
  });
  expect(result.outcome.ok, result.outcome.message).toBe(true);
  return { world: result.world, recipeId: result.outcome.recipeId! };
}
function makeSling(seed = 73, draft = sling()): WorldState {
  const admitted = addRecipe(createWorld(seed), draft);
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
    expect(
      Object.values(world.recipes).every((recipe) => recipe.provenance.source === 'authored-world'),
    ).toBe(true);
    expect(world.knowledge[NPC_ID]!.every((record) => record.source === 'authored')).toBe(true);
    expect(quantityOf(world, PLAYER_ID, 'cord')).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });
  it('does not mutate its input and makes duplicate commands harmless', () => {
    const original = createWorld();
    createItemLot(original, PLAYER_ID, 'berries', 3, 'fixture-food');
    const snapshot = structuredClone(original);
    const eat: Command = {
      id: 'eat-1',
      actorId: PLAYER_ID,
      type: 'eat',
      itemId: itemId(original, 'berries'),
    };
    const result = executeCommand(original, eat);
    expect(original).toEqual(snapshot);
    expect(quantityOf(result.world, PLAYER_ID, 'berries')).toBe(2);
    expect(executeCommand(result.world, eat).world).toEqual(result.world);
    expect(executeCommand(result.world, { ...eat, itemId: 'other' }).outcome.code).toBe(
      'idempotency-conflict',
    );
  });
  it('freezes work, needs, random draws and speech while paused', () => {
    let world = command(createWorld(), {
      type: 'status-effect',
      definitionId: 'wilderness:restorative-rest',
      targetId: PLAYER_ID,
      operation: 'activate',
    });
    world = { ...world, paused: true };
    expect(advanceWorld(world, 80000).world).toBe(world);
    expect(
      executeCommand(world, { id: 'speech', actorId: NPC_ID, type: 'say', text: 'Hello' }).outcome
        .code,
    ).toBe('paused');
    expect(
      admitDeclaration(world, sling(), {
        actorId: PLAYER_ID,
        requestId: 'paused',
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      }).outcome.code,
    ).toBe('paused');
  });
  it('routes around grid obstacles and rejects out-of-bounds ground', () => {
    let world = createWorld();
    const destination = { y: 0, x: 20, z: 7, surfaceId: 'terrain' };
    const plan = findPath(world, { y: 0, x: 15, z: 7 }, destination);
    expect(plan?.status).toBe('pending');
    expect(isWalkable(world, { y: 0, x: -0.2, z: 12 })).toBe(false);
    world = command(world, { type: 'move', destination });
    world = prepareWorldNavigation(world);
    const path = world.entities[PLAYER_ID]!.actor!.action!.path;
    expect(path.length).toBeGreaterThan(0);
    expect(path.every((point) => isWalkable(world, point))).toBe(true);
    world = advanceWorld(world, 240).world;
    expect(worldPosition(world.entities[PLAYER_ID]!)).toEqual({
      x: destination.x,
      y: destination.y,
      z: destination.z,
    });
    expect(world.entities[PLAYER_ID]!.actor!.action).toBeNull();
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
    expect(
      Object.values(original.recipes).every(
        (recipe) => recipe.provenance.source === 'authored-world',
      ),
    ).toBe(true);
    expect(
      admitted.world.knowledge[PLAYER_ID]!.filter((record) => record.source === 'invented'),
    ).toHaveLength(1);
    expect(
      admitted.world.knowledge[NPC_ID]!.filter((record) => record.source === 'invented'),
    ).toHaveLength(0);
    const repeated = admitDeclaration(admitted.world, sling(), {
      actorId: PLAYER_ID,
      requestId: 'request-sling',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    });
    expect(repeated.world).toBe(admitted.world);
    const changed = sling();
    changed.parameters.workSeconds = 70;
    expect(
      admitDeclaration(admitted.world, changed, {
        actorId: PLAYER_ID,
        requestId: 'request-sling',
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      }).outcome.code,
    ).toBe('idempotency-conflict');
    expect(
      executeCommand(admitted.world, {
        id: 'unlearned',
        actorId: NPC_ID,
        type: 'craft',
        recipeId: admitted.recipeId,
      }).outcome.code,
    ).toBe('not-learned');
    const taught = command(admitted.world, {
      type: 'teach',
      targetId: NPC_ID,
      recipeId: admitted.recipeId,
    });
    expect(
      taught.knowledge[NPC_ID]?.find((record) => record.recipeId === admitted.recipeId)?.source,
    ).toBe('taught');
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
        parameters: { ...sling().parameters, damage: 999 },
      },
      { ...sling(), inputs: [] },
      { ...sling(), parameters: { ...sling().parameters, workSeconds: 0 } },
      { ...sling(), output: { ...sling().output, nutrition: 100 } },
    ];
    for (const candidate of candidates) {
      expect(validateDeclaration(world, candidate).length).toBeGreaterThan(0);
      const result = admitDeclaration(world, candidate as DeclarationDraft, {
        actorId: PLAYER_ID,
        requestId: 'bad',
        source: 'test-fixture',
        authority: { origin: 'player', policyRevision: 1 },
      });
      expect(result.outcome.ok).toBe(false);
      expect(result.world).toBe(world);
    }
  });
  it('requires actual materials, spends once at work start, and never refunds canceled work', () => {
    const { world: admitted, recipeId } = addRecipe(createWorld());
    const before = quantityOf(admitted, PLAYER_ID, 'prepared_fiber');
    let world = command(admitted, { type: 'craft', recipeId });
    expect(quantityOf(world, PLAYER_ID, 'prepared_fiber')).toBe(before - 2);
    expect(quantityOf(world, PLAYER_ID, world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    world = command(world, { type: 'cancel' });
    world = advanceWorld(world, 300).world;
    expect(quantityOf(world, PLAYER_ID, 'prepared_fiber')).toBe(before - 2);
    expect(quantityOf(world, PLAYER_ID, world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    world = command(world, { type: 'craft', recipeId });
    world = advanceWorld(world, 60).world;
    expect(quantityOf(world, PLAYER_ID, world.recipes[recipeId]!.outputDefinitionId)).toBe(1);
    expect(
      executeCommand(world, { id: 'empty', actorId: PLAYER_ID, type: 'craft', recipeId }).outcome
        .code,
    ).toBe('missing-material');
  });
  it('completes a generated sling → hunt → finite harvest → cook → eat loop', () => {
    let world = makeSling();
    const ammoBefore = quantityOf(world, PLAYER_ID, 'stone');
    world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 24).world;
    expect(quantityOf(world, PLAYER_ID, 'stone')).toBe(ammoBefore - 1);
    expect(world.entities['hare-1']!.actor!.alive).toBe(false);
    world = command(world, { type: 'harvest', targetId: 'hare-1' });
    world = advanceWorld(world, 180).world;
    expect(quantityOf(world, PLAYER_ID, 'raw_meat')).toBe(2);
    expect(quantityOf(world, PLAYER_ID, 'bone')).toBe(2);
    expect(
      executeCommand(world, {
        id: 'again',
        actorId: PLAYER_ID,
        type: 'harvest',
        targetId: 'hare-1',
      }).outcome.code,
    ).toBe('not-harvestable');
    expect(
      executeCommand(world, {
        id: 'raw',
        actorId: PLAYER_ID,
        type: 'eat',
        itemId: itemId(world, 'raw_meat'),
      }).outcome.code,
    ).toBe('not-edible');
    world = command(world, { type: 'cook', itemId: itemId(world, 'raw_meat'), heatId: 'campfire' });
    world = advanceWorld(world, 200).world;
    expect(quantityOf(world, PLAYER_ID, 'raw_meat')).toBe(1);
    expect(quantityOf(world, PLAYER_ID, 'cooked_meat')).toBe(1);
    const fullness = world.entities[PLAYER_ID]!.actor!.attributes!['wilderness:fullness']!.value;
    if (typeof fullness !== 'number') throw new Error('Wilderness fixture lacks fullness.');
    world = command(world, { type: 'eat', itemId: itemId(world, 'cooked_meat') });
    expect(
      world.entities[PLAYER_ID]!.actor!.attributes!['wilderness:fullness']!.value,
    ).toBeGreaterThan(fullness);
    expect(quantityOf(world, PLAYER_ID, 'cooked_meat')).toBe(0);
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
        actorId: PLAYER_ID,
        type: 'hunt',
        targetId: 'hare-1',
      }).outcome.code,
    ).toBe('no-ammunition');
    createItemLot(world, PLAYER_ID, 'bone', 2, 'fixture-bone');
    ({ world, recipeId } = addRecipe(world, arrow(), 'arrow'));
    world = command(world, { type: 'craft', recipeId });
    world = advanceWorld(world, 72).world;
    expect(quantityOf(world, PLAYER_ID, world.recipes[recipeId]!.outputDefinitionId)).toBe(1);
    world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 30).world;
    expect(quantityOf(world, PLAYER_ID, world.recipes[recipeId]!.outputDefinitionId)).toBe(0);
    expect(
      world.events.some((event) => event.type === 'shot' && event.data?.ammunitionKind === 'arrow'),
    ).toBe(true);
  });
  it('records misses, spends one projectile and makes the animal react', () => {
    const draft = sling();
    draft.parameters.accuracy = 0.6;
    let world = makeSling(73, draft);
    world.rngState = 12345;
    world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 20).world;
    expect(world.events.some((event) => event.type === 'shot' && event.data?.hit === false)).toBe(
      true,
    );
    expect(world.entities['hare-1']!.animal!.danger).toBeGreaterThan(0);
    expect(world.entities['hare-1']!.actor!.health).toBe(18);
    expect(quantityOf(world, PLAYER_ID, 'stone')).toBe(5);
  });
  it('resolves competing harvesters once and never duplicates finite remains', () => {
    let world = makeSling();
    world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
    world = advanceWorld(world, 24).world;
    const position = worldPosition(world.entities['hare-1']!);
    setSpatialPosition(
      world,
      world.entities[PLAYER_ID]!,
      { ...position },
      worldSupport(world.entities[PLAYER_ID]!),
    );
    setSpatialPosition(
      world,
      world.entities[NPC_ID]!,
      { ...position },
      worldSupport(world.entities[NPC_ID]!),
    );
    world = command(world, { type: 'harvest', targetId: 'hare-1' });
    world = command(world, { type: 'harvest', targetId: 'hare-1' }, NPC_ID);
    world = advanceWorld(world, 90).world;
    expect(quantityOf(world, PLAYER_ID, 'raw_meat') + quantityOf(world, NPC_ID, 'raw_meat')).toBe(
      2,
    );
    expect(world.events.filter((event) => event.type === 'harvested')).toHaveLength(1);
  });
  it('revalidates the animal before spending ammunition on a queued shot', () => {
    let world = makeSling();
    world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
    world.entities['hare-1']!.actor!.alive = false;
    world = advanceWorld(world, 24).world;
    expect(quantityOf(world, PLAYER_ID, 'stone')).toBe(6);
    expect(world.events.some((event) => event.type === 'shot')).toBe(false);
    expect(world.entities[PLAYER_ID]!.actor!.action).toBeNull();
  });
  it('requires shaft-capable material for an arrow, not merely any rigid object', () => {
    const world = createWorld();
    const snapshot = structuredClone(world);
    const candidate = arrow();
    expect(validateDeclaration(world, candidate)).toEqual([]);
    const family = recipeFamily(world, candidate.family.id)!;
    expect(familyMaterialEligible(world, family, world.itemDefinitions['wood']!, 'shaft')).toBe(
      true,
    );
    expect(familyMaterialEligible(world, family, world.itemDefinitions['stone']!, 'shaft')).toBe(
      false,
    );
    candidate.inputs[0]!.definitionId = 'stone';
    expect(validateDeclaration(world, candidate).length).toBeGreaterThan(0);
    expect(
      validateDeclaration(createWorld(), candidate).includes(
        'This material cannot fill the selected role.',
      ),
    ).toBe(true);
    const rejected = admitDeclaration(world, candidate, {
      actorId: PLAYER_ID,
      requestId: 'stone-shaft',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    });
    expect(rejected.outcome).toMatchObject({ ok: false, code: 'invalid-declaration' });
    expect(rejected.world).toBe(world);
    expect(world).toEqual(snapshot);
    expect(rejected.events).toEqual([]);
  });
  it('approaches close enough to fire a short-range tool at an already fleeing animal', () => {
    const draft = sling();
    draft.parameters.range = 3;
    draft.parameters.damage = 10;
    const admitted = addRecipe(createWorld(), draft);
    let world = command(admitted.world, { type: 'craft', recipeId: admitted.recipeId });
    world = advanceWorld(world, 60).world;
    world = command(world, {
      type: 'equip',
      itemId: itemId(world, world.recipes[admitted.recipeId]!.outputDefinitionId),
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      world = confirmedAttack(world, { type: 'hunt', targetId: 'hare-1' });
      for (let seconds = 0; seconds < 400 && world.entities[PLAYER_ID]!.actor!.action; seconds++)
        world = advanceWorld(world, 1).world;
      expect(world.entities[PLAYER_ID]!.actor!.action).toBeNull();
    }
    expect(world.events.filter((event) => event.type === 'shot')).toHaveLength(2);
    expect(
      world.events.some(
        (event) => event.type === 'action-stopped' && event.text.includes('out of range'),
      ),
    ).toBe(false);
    expect(quantityOf(world, PLAYER_ID, 'stone')).toBe(4);
  });
});

describe('perception, survival and continuity', () => {
  it('preserves event-time listeners and private memories independently of later positions', () => {
    let world = createWorld();
    setSpatialPosition(
      world,
      world.entities[NPC_ID]!,
      { y: 0, x: 26, z: 22 },
      worldSupport(world.entities[NPC_ID]!),
    );
    world = command(world, { type: 'say', text: 'The secret is moonflower.', volume: 'whisper' });
    setSpatialPosition(
      world,
      world.entities[NPC_ID]!,
      { y: 0, x: 12, z: 13 },
      worldSupport(world.entities[NPC_ID]!),
    );
    expect(
      queryMemories(world, NPC_ID).some((record) => record.summary.includes('moonflower')),
    ).toBe(false);
    // Seeing a distant speaker is allowed; moving closer must never reveal unheard words.
    expect(
      observeActor(world, NPC_ID)!.recentEvents.some((event) => event.text.includes('moonflower')),
    ).toBe(false);
    world = command(world, { type: 'say', text: 'I will bring you berries.', targetId: NPC_ID });
    const event = world.events.at(-1)!;
    world = remember(world, NPC_ID, {
      kind: 'commitment',
      source: 'heard',
      summary: 'The newcomer promised me berries.',
      entityIds: [PLAYER_ID],
      eventId: event.id,
      importance: 10,
    }).world;
    expect(queryMemories(world, NPC_ID)[0]!.kind).toBe('commitment');
    expect(queryMemories(world, PLAYER_ID).some((record) => record.kind === 'commitment')).toBe(
      false,
    );
    expect(
      observeActor(world, PLAYER_ID)!
        .visibleEntities.find((entity) => entity.id === NPC_ID)!
        .actor!.agency.goals.map((goal) => goal.objective)
        .join('; '),
    ).toBe('');
  });
  it('preserves physiology without automatically choosing food without a provider', () => {
    let world = createWorld();
    world.entities[NPC_ID]!.actor!.attributes!['wilderness:fullness']!.value = 20;
    for (const item of inventoryFor(world, NPC_ID))
      if (item.definitionId === 'berries') retireItem(world, item.id, 'fixture');
    world = advanceWorld(world, 300).world;
    expect(world.entities[NPC_ID]!.actor!.alive).toBe(true);
    expect(world.entities[NPC_ID]!.actor!.attributes!['wilderness:fullness']!.value).toBeLessThan(
      20,
    );
    expect(
      world.events.some(
        (event) => event.actorId === NPC_ID && ['gathered', 'ate'].includes(event.type),
      ),
    ).toBe(false);
  });
  it('allows NPC death while preserving player continuity across a new physical life', () => {
    let world = createWorld();
    for (const item of inventoryFor(world, NPC_ID)) retireItem(world, item.id, 'fixture');
    for (const entity of Object.values(world.entities))
      if (entity.resource) entity.resource.quantity = 0;
    for (const actor of [world.entities[PLAYER_ID]!, world.entities[NPC_ID]!]) {
      actor.actor!.attributes!['wilderness:fullness']!.value = 0;
      actor.actor!.health = 0.01;
    }
    world = advanceWorld(world, 3).world;
    expect(world.entities[NPC_ID]!.actor!.alive).toBe(false);
    const player = world.entities[PLAYER_ID]!;
    expect(player.actor!.alive).toBe(false);
    expect(world.entities[player.actor!.pendingDeath!.corpseId]!.remains!.sourceId).toBe(PLAYER_ID);
    world = command(world, { type: 'respawn' });
    expect(world.entities[PLAYER_ID]!.actor!.health).toBe(100);
    expect(world.entities[PLAYER_ID]!.actor!.physicalLife).toBe(1);
    expect(Object.values(world.entities[PLAYER_ID]!.actor!.scars!)).toEqual([1]);
    expect(world.events.some((event) => event.type === 'death' && event.actorId === NPC_ID)).toBe(
      true,
    );
  });
});
