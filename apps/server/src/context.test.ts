import { entityGet } from '@open-legend/domain';
import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { NPC_ID } from '@open-legend/domain';
import { afterEach, describe, expect, it } from 'vitest';
import {
  advanceWorld,
  executeCommand,
  inventoryFor,
  navigationBlocked,
  quantityOf,
  type DeclarationDraft,
} from '@open-legend/domain';
import { readConfig } from '../../../tests/fixtures/database.js';
import {
  buildContext,
  CONTEXT_BYTE_LIMIT,
  ContextBudgetError,
  npcCandidates,
  type CandidateAction,
} from './context.js';
import { SqlGameRepository } from './store.js';
import { WorldService } from './world-service.js';
import { domainCommand } from './cognition.js';

const stores: SqlGameRepository[] = [];
async function setup(): Promise<WorldService> {
  const store = await testRepository();
  stores.push(store);
  const service = new WorldService(
    store,
    readConfig({ WORLD_SEED: '73' }),
    () => 1_800_000_000_000,
  );
  await enterLocalWorld(service);
  await service.setPresence('test', true);
  return service;
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
async function perform(service: WorldService, candidate: CandidateAction): Promise<void> {
  // These are the NPC's own candidates, so use its native command binder rather
  // than the human command endpoint that requires a lethal-attack confirmation.
  const result = await service.transition((world) =>
    executeCommand(
      world,
      domainCommand(candidate.command!, NPC_ID, `test:${world.sequence}:${candidate.id}`),
    ),
  );
  expect(result.ok, result.message).toBe(true);
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
});

describe('bounded actor context', () => {
  it('preserves complete context and trimming order with exact UTF-8 accounting', async () => {
    const service = await setup();
    const base = buildContext(service, NPC_ID, '');
    const reference = (query: string) => {
      const context = structuredClone(base);
      context.request = query;
      const bytes = () => {
        context.coverage.knownRecipeSupplied = context.knownRecipes.length;
        context.coverage.memorySupplied = context.memories.length;
        context.coverage.recentEventSupplied = context.recentEvents.length;
        context.coverage.nearbySupplied = context.nearby.length;
        return Buffer.byteLength(JSON.stringify(context));
      };
      while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 8)
        context.knownRecipes.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 4)
        context.recentEvents.shift();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 4) context.memories.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.knownRecipes.length > 1)
        context.knownRecipes.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.nearby.length) context.nearby.pop();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.recentEvents.length > 1)
        context.recentEvents.shift();
      while (bytes() > CONTEXT_BYTE_LIMIT && context.memories.length > 1) context.memories.pop();
      if (bytes() > CONTEXT_BYTE_LIMIT)
        for (const material of context.materials) material.name = '';
      if (bytes() > CONTEXT_BYTE_LIMIT) return undefined;
      return context;
    };
    // Punctuation has no recipe-search terms. Include escaping and multibyte text
    // at exact fit and progressively deeper trim boundaries through the real builder.
    const prefix = '🙂\\\"\n';
    const emptySize = Buffer.byteLength(JSON.stringify(base));
    const prefixBytes = Buffer.byteLength(JSON.stringify(prefix)) - 2;
    for (const extra of [-1, 0, 1, 250, 1000, 5000]) {
      const query =
        prefix + '.'.repeat(Math.max(0, CONTEXT_BYTE_LIMIT - emptySize - prefixBytes + extra));
      const expected = reference(query);
      if (expected) expect(buildContext(service, NPC_ID, query)).toEqual(expected);
      else expect(() => buildContext(service, NPC_ID, query)).toThrow(ContextBudgetError);
    }
  });

  it('fails honestly when mandatory request data cannot fit instead of truncating it', async () => {
    const service = await setup();
    expect(() => buildContext(service, NPC_ID, 'x'.repeat(CONTEXT_BYTE_LIMIT + 1))).toThrow(
      ContextBudgetError,
    );
  });
});

describe('actor-scoped native decision candidates', () => {
  it('executes a learned tool and food loop through scoped feasible candidates', async () => {
    const service = await setup();
    const draft: DeclarationDraft = {
      family: { id: 'base:swing', version: 1 },
      name: 'Fixture sling',
      description: 'Test-only learned composition.',
      inputs: [
        { definitionId: 'cord', quantity: 1, role: 'binding' },
        { definitionId: 'prepared_fiber', quantity: 2, role: 'pouch' },
      ],
      output: { name: 'Fixture sling', description: 'Test only.' },
      parameters: { workSeconds: 60, damage: 18, range: 7, accuracy: 0.9 },
    };
    const admitted = await service.admit(draft, {
      actorId: NPC_ID,
      requestId: 'learned-fixture',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    });
    expect(admitted.ok, admitted.message).toBe(true);
    expect(admitted.recipeId).toBeDefined();
    const recipe = service.world.recipes[admitted.recipeId!]!;
    await perform(
      service,
      select(service, 'craft', (action) => action.command?.recipeId === recipe.id),
    );
    await service.transition((world) => advanceWorld(world, 60));
    const tool = inventoryFor(service.world, NPC_ID).find(
      (item) => item.definitionId === recipe.outputDefinitionId,
    );
    expect(tool).toBeDefined();
    await perform(
      service,
      select(service, 'equip', (action) => action.command?.itemId === tool!.id),
    );
    await perform(
      service,
      select(
        service,
        'hunt',
        (action) => action.command?.targetId === 'hare-1' && action.command.itemId === tool!.id,
      ),
    );
    await service.transition((world) => advanceWorld(world, 18));
    expect(
      service.world.events.some(
        (event) =>
          event.type === 'shot-released' && event.actorId === NPC_ID && event.targetId === 'hare-1',
      ),
    ).toBe(true);
    // Releasing the shot does not resolve its flight or guarantee an impact.
    expect(entityGet(service.world.entities, 'hare-1')!.actor!.alive).toBe(true);
    const flight = Object.values(service.world.projectiles ?? {}).find(
      (projectile) => projectile.sourceId === NPC_ID && projectile.targetId === 'hare-1',
    );
    expect(flight).toBeDefined();
    const before = service.world.simTime;
    const result = await service.transition((world) =>
      advanceWorld(world, flight!.remainingRange / flight!.speed),
    );
    const evidence = JSON.stringify({
      result,
      before,
      after: service.world.simTime,
      navigationBlocked: navigationBlocked(service.world),
      projectiles: service.world.projectiles,
    });
    expect(result.ok, evidence).toBe(true);
    expect(service.world.simTime, evidence).toBeGreaterThan(before);
    expect(
      entityGet(service.world.entities, 'hare-1')!.actor!.alive,
      JSON.stringify(service.world.events.slice(-10)),
    ).toBe(false);
    await perform(
      service,
      select(service, 'harvest', (action) => action.command?.targetId === 'hare-1'),
    );
    await service.transition((world) => advanceWorld(world, 120));
    expect(quantityOf(service.world, NPC_ID, 'raw_meat')).toBe(2);
    await perform(service, select(service, 'cook'));
    await service.transition((world) => advanceWorld(world, 200));
    const cooked = inventoryFor(service.world, NPC_ID).find(
      (item) => item.definitionId === 'cooked_meat',
    )!;
    await perform(
      service,
      select(service, 'eat', (action) => action.command?.itemId === cooked.id),
    );
    expect(quantityOf(service.world, NPC_ID, 'cooked_meat')).toBe(0);
    expect(
      service.world.events.some(
        (event) =>
          event.type === 'ate' &&
          event.actorId === NPC_ID &&
          event.data?.definitionId === 'cooked_meat',
      ),
    ).toBe(true);
    expect(new Set(npcCandidates(service).map((action) => action.id)).size).toBe(
      npcCandidates(service).length,
    );
    // Spending this method's inputs cannot prohibit unrelated starter recipes.
    expect(
      npcCandidates(service).some(
        (action) => action.command?.type === 'craft' && action.command.recipeId === recipe.id,
      ),
    ).toBe(false);
  });
});
