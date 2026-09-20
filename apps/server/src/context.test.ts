import { afterEach, describe, expect, it } from 'vitest';
import {
  advanceWorld,
  inventoryFor,
  quantityOf,
  type DeclarationDraft,
  type ItemDefinition,
} from '@open-legend/domain';
import { readConfig } from './config.js';
import {
  buildContext,
  CONTEXT_BYTE_LIMIT,
  ContextBudgetError,
  npcCandidates,
  type CandidateAction,
} from './context.js';
import { SqliteStore } from './store.js';
import { WorldService } from './world-service.js';

const stores: SqliteStore[] = [];
function setup(): WorldService {
  const store = new SqliteStore(':memory:');
  stores.push(store);
  const service = new WorldService(
    store,
    readConfig({ WORLD_SEED: '73' }),
    () => 1_800_000_000_000,
  );
  service.setPresence('test', true);
  return service;
}
function addItem(
  service: WorldService,
  definitionId: string,
  quantity: number,
  ownerId = 'ada',
): string {
  const existing = Object.values(service.world.items).find(
    (item) => item.definitionId === definitionId && item.ownerId === ownerId,
  );
  if (existing) {
    existing.quantity += quantity;
    return existing.id;
  }
  const id = `fixture:${ownerId}:${definitionId}`;
  service.world.items[id] = { id, definitionId, quantity, ownerId };
  return id;
}
function removeItem(service: WorldService, definitionId: string): void {
  for (const item of inventoryFor(service.world, 'ada'))
    if (item.definitionId === definitionId) delete service.world.items[item.id];
}
function addTool(service: WorldService, mechanism: 'swing' | 'flex'): string {
  const id = `fixture-${mechanism}`;
  const definition: ItemDefinition = {
    id,
    version: 1,
    name: `Fixture ${mechanism} launcher`,
    description: 'Test only.',
    properties: ['flexible'],
    launcher: {
      mechanism,
      ammunitionKind: mechanism === 'swing' ? 'stone' : 'arrow',
      damage: 18,
      range: 7,
      accuracy: 0.9,
    },
  };
  service.world.itemDefinitions[id] = definition;
  return addItem(service, id, 1);
}
function select(
  service: WorldService,
  type: string,
  predicate: (candidate: CandidateAction) => boolean = () => true,
): CandidateAction {
  const candidate = npcCandidates(service).find(
    (action) => action.command?.type === type && predicate(action),
  );
  expect(candidate, `Expected feasible ${type} candidate`).toBeDefined();
  return candidate!;
}
function perform(service: WorldService, candidate: CandidateAction): void {
  const result = service.command(
    `test:${service.world.sequence}:${candidate.id}`,
    candidate.command!,
    'ada',
  );
  expect(result.ok, result.message).toBe(true);
}
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('bounded actor context', () => {
  it('fits long history, 24 recipes and 64 owned definitions without losing material mechanics or privacy', () => {
    const service = setup();
    for (let index = 0; index < 24; index++) {
      const draft: DeclarationDraft = {
        schemaVersion: 1,
        name: `Fixture sling ${index}`,
        description: 'Long descriptive prose. '.repeat(28),
        inputs: [
          { definitionId: 'cord', quantity: 1, role: 'binding' },
          { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
        ],
        workSeconds: 60,
        output: {
          kind: 'launcher',
          name: `Fixture launcher ${index}`,
          description: 'Redundant item prose. '.repeat(30),
          properties: ['flexible'],
          launcher: {
            mechanism: 'swing',
            ammunitionKind: 'stone',
            damage: 18,
            range: 7,
            accuracy: 0.8,
          },
        },
      };
      expect(
        service.admit(draft, {
          actorId: 'ada',
          requestId: `budget-recipe-${index}`,
          source: 'test-fixture',
        }).ok,
      ).toBe(true);
      const recipe = Object.values(service.world.recipes).find(
        (candidate) => candidate.name === draft.name,
      )!;
      addItem(service, recipe.outputDefinitionId, 1);
    }
    let extra = 0;
    while (new Set(inventoryFor(service.world, 'ada').map((item) => item.definitionId)).size < 64) {
      const definitionId = `fixture-owned-${extra++}`;
      service.world.itemDefinitions[definitionId] = {
        id: definitionId,
        version: 1,
        name: `Fixture carried object ${extra}`,
        description: 'Unnecessary repeated prose. '.repeat(25),
        properties: ['rigid', 'shaft'],
        recipeId: `fixture-source-${extra}`,
      };
      addItem(service, definitionId, 2);
    }
    service.world.entities['player']!.actor!.goal = 'OTHER_ACTOR_PRIVATE_GOAL';
    service.world.memories['player']!.push({
      id: 'private-fixture',
      actorId: 'player',
      kind: 'reflection',
      source: 'inferred',
      summary: 'OTHER_ACTOR_PRIVATE_MEMORY',
      at: 0,
      entityIds: [],
      importance: 10,
    });
    for (let index = 0; index < 80; index++)
      service.world.memories['ada']!.push({
        id: `long-memory-${index}`,
        actorId: 'ada',
        kind: 'reflection',
        source: 'inferred',
        summary: `Relevant berries ${index}: ${'Remembered descriptive prose. '.repeat(22)}`,
        at: index,
        entityIds: ['player'],
        importance: 9,
      });
    for (let index = 0; index < 300; index++)
      service.world.events.push({
        id: `long-speech-${index}`,
        sequence: index,
        at: index,
        type: 'speech',
        actorId: 'player',
        targetId: 'ada',
        audience: ['ada', 'player'],
        text: 'Redundant formatted speech. '.repeat(40),
        data: {
          text: `${index === 299 ? 'CURRENT_EXCHANGE_MARKER ' : ''}${'Long spoken history. '.repeat(65)}`,
        },
      });
    const before = JSON.stringify(service.world);
    const context = buildContext(
      service,
      'ada',
      'Remember the relevant berries and current conversation.',
    );
    const encoded = JSON.stringify(context);
    expect(Buffer.byteLength(encoded)).toBeLessThanOrEqual(CONTEXT_BYTE_LIMIT);
    expect(context.coverage.knownRecipeTotal).toBe(24);
    expect(context.knownRecipes.length).toBeGreaterThan(0);
    expect(context.knownRecipes.length).toBeLessThanOrEqual(24);
    expect(context.coverage.knownRecipeSupplied).toBe(context.knownRecipes.length);
    expect(context.recentEvents.at(-1)?.text).toContain('CURRENT_EXCHANGE_MARKER');
    expect(context.memories.length).toBeGreaterThan(0);
    expect(encoded).not.toContain('OTHER_ACTOR_PRIVATE');
    const owned = inventoryFor(service.world, 'ada');
    expect(context.inventory.map((item) => item.id).sort()).toEqual(
      owned.map((item) => item.id).sort(),
    );
    for (const item of owned) {
      const supplied = context.materials.find((definition) => definition.id === item.definitionId)!;
      const original = service.world.itemDefinitions[item.definitionId]!;
      expect(supplied).toBeDefined();
      expect(supplied.properties).toEqual(original.properties);
      expect(supplied.launcher).toEqual(original.launcher);
      expect(supplied.ammunition).toEqual(original.ammunition);
      expect(context.inventory.find((candidate) => candidate.id === item.id)?.quantity).toBe(
        item.quantity,
      );
    }
    expect(context.materials.find((definition) => definition.id === 'cord')).toMatchObject({
      native: true,
      properties: ['binding', 'flexible'],
    });
    expect(buildContext(service, 'ada', context.request)).toEqual(context);
    expect(JSON.stringify(service.world)).toBe(before);
  });

  it('fails honestly when mandatory request data cannot fit instead of truncating it', () => {
    const service = setup();
    expect(() => buildContext(service, 'ada', 'x'.repeat(CONTEXT_BYTE_LIMIT + 1))).toThrow(
      ContextBudgetError,
    );
  });
});

describe('actor-scoped native decision candidates', () => {
  it('offers material preparation only for carried sufficient inputs', () => {
    const service = setup();
    expect(npcCandidates(service).some((action) => action.id === 'prepare:cord')).toBe(true);
    expect(npcCandidates(service).some((action) => action.id === 'prepare:fiber')).toBe(false);
    addItem(service, 'raw_fiber', 20, 'player');
    expect(npcCandidates(service).some((action) => action.id === 'prepare:fiber')).toBe(false);
    addItem(service, 'raw_fiber', 1);
    expect(npcCandidates(service).some((action) => action.id === 'prepare:fiber')).toBe(false);
    addItem(service, 'raw_fiber', 1);
    expect(npcCandidates(service).filter((action) => action.id === 'prepare:fiber')).toHaveLength(
      1,
    );
    perform(
      service,
      select(service, 'prepare', (action) => action.id === 'prepare:fiber'),
    );
    expect(quantityOf(service.world, 'ada', 'raw_fiber')).toBe(0);
  });
  it('equips carried launchers only with matching ammunition and avoids duplicate equipment work', () => {
    const service = setup();
    const slingId = addTool(service, 'swing');
    const bowId = addTool(service, 'flex');
    expect(npcCandidates(service).some((action) => action.id === `equip:${slingId}`)).toBe(true);
    expect(npcCandidates(service).some((action) => action.id === `equip:${bowId}`)).toBe(false);
    service.world.entities.ada!.actor!.equippedItemId = slingId;
    expect(npcCandidates(service).some((action) => action.id === `equip:${slingId}`)).toBe(false);
    service.world.itemDefinitions['fixture-arrow'] = {
      id: 'fixture-arrow',
      version: 1,
      name: 'Fixture arrow',
      description: 'Test only.',
      properties: ['projectile'],
      ammunition: { kind: 'arrow', damageBonus: 1 },
    };
    addItem(service, 'fixture-arrow', 1, 'player');
    expect(npcCandidates(service).some((action) => action.id === `equip:${bowId}`)).toBe(false);
    addItem(service, 'fixture-arrow', 1);
    expect(npcCandidates(service).filter((action) => action.id === `equip:${bowId}`)).toHaveLength(
      1,
    );
  });
  it('hunts only visible living animals using owned equipped equipment and ammunition', () => {
    const service = setup();
    const toolId = addTool(service, 'swing');
    expect(npcCandidates(service).some((action) => action.command?.type === 'hunt')).toBe(false);
    service.world.entities.ada!.actor!.equippedItemId = toolId;
    const hunt = select(service, 'hunt', (action) => action.command?.targetId === 'hare-1');
    expect(hunt.command?.itemId).toBe(toolId);
    expect(service.world.items[hunt.command!.ammunitionId!]!.ownerId).toBe('ada');
    service.world.entities['hare-2']!.position = { x: 27, z: 23 };
    service.world.entities.ada!.position = { x: 1, z: 1 }; // Beyond the broader 28-unit sight field.
    expect(npcCandidates(service).some((action) => action.command?.targetId === 'hare-2')).toBe(
      false,
    );
    service.world.entities['hare-1']!.animal!.alive = false;
    expect(
      npcCandidates(service).some(
        (action) => action.command?.type === 'hunt' && action.command.targetId === 'hare-1',
      ),
    ).toBe(false);
    removeItem(service, 'stone');
    expect(npcCandidates(service).some((action) => action.command?.type === 'hunt')).toBe(false);
  });
  it('harvests finite visible remains only with a carried cutting point', () => {
    const service = setup();
    service.world.entities['test-remains'] = {
      id: 'test-remains',
      name: 'Hare remains',
      kind: 'remains',
      position: { x: 14, z: 12 },
      remains: {
        sourceId: 'test-remains',
        harvested: false,
        yields: [{ definitionId: 'raw_meat', quantity: 2 }],
      },
    };
    expect(npcCandidates(service).some((action) => action.id === 'harvest:test-remains')).toBe(
      true,
    );
    service.world.entities['test-remains']!.remains!.harvested = true;
    expect(npcCandidates(service).some((action) => action.id === 'harvest:test-remains')).toBe(
      false,
    );
    service.world.entities['test-remains']!.remains!.harvested = false;
    removeItem(service, 'stone_tool');
    expect(npcCandidates(service).some((action) => action.id === 'harvest:test-remains')).toBe(
      false,
    );
  });
  it('requires owned raw meat and visible reachable heat with enough remaining fuel', () => {
    const service = setup();
    addItem(service, 'raw_meat', 2, 'player');
    expect(npcCandidates(service).some((action) => action.command?.type === 'cook')).toBe(false);
    const meatId = addItem(service, 'raw_meat', 2);
    const cook = select(service, 'cook');
    expect(cook.command).toEqual({ type: 'cook', itemId: meatId, targetId: 'campfire' });
    expect(
      npcCandidates(service).some(
        (action) => action.command?.type === 'eat' && action.command.itemId === meatId,
      ),
    ).toBe(false);
    service.world.entities.campfire!.heat!.fuelSeconds = 1;
    expect(npcCandidates(service).some((action) => action.command?.type === 'cook')).toBe(false);
    service.world.entities.campfire!.heat!.fuelSeconds = 10000;
    service.world.entities.campfire!.position = { x: 27, z: 23 };
    service.world.entities.ada!.position = { x: 1, z: 1 };
    expect(npcCandidates(service).some((action) => action.command?.type === 'cook')).toBe(false);
  });
  it('does not offer unreachable visible resources or actions for paused/dead actors', () => {
    const service = setup();
    service.world.entities['isolated-berries'] = {
      id: 'isolated-berries',
      kind: 'resource',
      name: 'Island berries',
      position: { x: 18, z: 13 },
      resource: { definitionId: 'berries', quantity: 2, workSeconds: 30 },
    };
    for (const [x, z] of [
      [17, 13],
      [19, 13],
      [18, 12],
      [18, 14],
    ])
      service.world.map.tiles[z!]![x!] = 'water';
    expect(
      service.observe('ada')!.visibleEntities.some((entity) => entity.id === 'isolated-berries'),
    ).toBe(true);
    expect(
      npcCandidates(service).some((action) => action.command?.targetId === 'isolated-berries'),
    ).toBe(false);
    service.control({ paused: true });
    expect(npcCandidates(service)).toEqual([]);
    service.control({ paused: false });
    service.world.entities.ada!.actor!.alive = false;
    expect(npcCandidates(service)).toEqual([]);
  });
  it('preserves ongoing work and avoids wasting food/rest when needs are already met', () => {
    const service = setup();
    service.world.entities.ada!.actor!.fullness = 100;
    service.world.entities.ada!.actor!.energy = 100;
    expect(
      npcCandidates(service).some((action) => ['eat', 'rest'].includes(action.command?.type ?? '')),
    ).toBe(false);
    perform(service, select(service, 'gather'));
    expect(npcCandidates(service).map((action) => action.id)).toEqual(['continue']);
    service.world.entities.ada!.actor!.fullness = 10;
    expect(npcCandidates(service).some((action) => action.command?.type === 'eat')).toBe(true);
    expect(npcCandidates(service).some((action) => action.command?.type === 'craft')).toBe(false);
  });
  it('executes a learned tool and food loop through scoped feasible candidates', () => {
    const service = setup();
    const draft: DeclarationDraft = {
      schemaVersion: 1,
      name: 'Fixture sling',
      description: 'Test-only learned composition.',
      inputs: [
        { definitionId: 'cord', quantity: 1, role: 'binding' },
        { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
      ],
      workSeconds: 60,
      output: {
        kind: 'launcher',
        name: 'Fixture sling',
        description: 'Test only.',
        properties: ['flexible'],
        launcher: {
          mechanism: 'swing',
          ammunitionKind: 'stone',
          damage: 18,
          range: 7,
          accuracy: 0.9,
        },
      },
    };
    expect(
      service.admit(draft, { actorId: 'ada', requestId: 'learned-fixture', source: 'test-fixture' })
        .ok,
    ).toBe(true);
    perform(service, select(service, 'craft'));
    service.transition((world) => advanceWorld(world, 60));
    perform(service, select(service, 'equip'));
    perform(
      service,
      select(service, 'hunt', (action) => action.command?.targetId === 'hare-1'),
    );
    service.transition((world) => advanceWorld(world, 18));
    expect(service.world.entities['hare-1']!.animal!.alive).toBe(false);
    perform(
      service,
      select(service, 'harvest', (action) => action.command?.targetId === 'hare-1'),
    );
    service.transition((world) => advanceWorld(world, 120));
    expect(quantityOf(service.world, 'ada', 'raw_meat')).toBe(2);
    perform(service, select(service, 'cook'));
    service.transition((world) => advanceWorld(world, 200));
    const cooked = inventoryFor(service.world, 'ada').find(
      (item) => item.definitionId === 'cooked_meat',
    )!;
    perform(
      service,
      select(service, 'eat', (action) => action.command?.itemId === cooked.id),
    );
    expect(quantityOf(service.world, 'ada', 'cooked_meat')).toBe(0);
    expect(
      service.world.events.some(
        (event) => event.type === 'ate' && event.actorId === 'ada' && /meat/i.test(event.text),
      ),
    ).toBe(true);
    expect(new Set(npcCandidates(service).map((action) => action.id)).size).toBe(
      npcCandidates(service).length,
    );
    expect(npcCandidates(service).some((action) => action.command?.type === 'craft')).toBe(false);
  });
});
