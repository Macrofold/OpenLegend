import { testRepository } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { NPC_ID } from '@open-legend/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { advanceWorld, inventoryFor, quantityOf, type DeclarationDraft } from '@open-legend/domain';
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
  const result = await service.command(
    `test:${service.world.sequence}:${candidate.id}`,
    candidate.command!,
    NPC_ID,
  );
  expect(result.ok, result.message).toBe(true);
}
afterEach(async () => {
  for (const store of stores.splice(0)) await store.close();
});

describe('bounded actor context', () => {
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
      schemaVersion: 2,
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
    expect(
      (
        await service.admit(draft, {
          actorId: NPC_ID,
          requestId: 'learned-fixture',
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
        })
      ).ok,
    ).toBe(true);
    await perform(service, select(service, 'craft'));
    await service.transition((world) => advanceWorld(world, 60));
    await perform(service, select(service, 'equip'));
    await perform(
      service,
      select(service, 'hunt', (action) => action.command?.targetId === 'hare-1'),
    );
    await service.transition((world) => advanceWorld(world, 18));
    expect(service.world.entities['hare-1']!.actor!.alive).toBe(false);
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
        (event) => event.type === 'ate' && event.actorId === NPC_ID && /meat/i.test(event.text),
      ),
    ).toBe(true);
    expect(new Set(npcCandidates(service).map((action) => action.id)).size).toBe(
      npcCandidates(service).length,
    );
    expect(npcCandidates(service).some((action) => action.command?.type === 'craft')).toBe(false);
  });
});
