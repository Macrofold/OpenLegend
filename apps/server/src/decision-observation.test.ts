import { expect, it } from 'vitest';
import {
  NPC_ID,
  PLAYER_ID,
  applicableConsumption,
  activityEntityReferences,
  createItemLot,
  entityGet,
  inventoryFor,
  observeActor,
  type ActivityNode,
} from '@open-legend/domain';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import { decisionObservation } from './decision-observation.js';
import { RETRIEVAL_ROWS } from './memory-repository.js';
import { supplyOpportunityContext } from './supply-opportunities.js';
import { candidateSet } from './recall.js';

it('selects only permitted stock before observation while retaining the complete default view', () => {
  const world = stockedCamp();
  const selected = createItemLot(world, NPC_ID, 'wood', 1, 'selected-observed-stock');
  const hidden = createItemLot(world, PLAYER_ID, 'cord', 1, 'other-person-stock');
  const complete = inventoryFor(world, NPC_ID);
  let metadataRows = 0;
  const observed = observeActor(world, NPC_ID, {
    includeMemories: false,
    selectInventory(inventory) {
      metadataRows = inventory.length;
      return new Set([selected, hidden]);
    },
  })!;
  expect(metadataRows).toBe(complete.length);
  expect(observed.inventory.map((item) => item.id)).toEqual([selected]);
  expect(observeActor(world, NPC_ID, { includeMemories: false })!.inventory).toEqual(complete);
});

it('pages before cloning large stock without losing paused work or inventing a supply shortage', () => {
  const world = stockedCamp();
  for (let index = 0; index <= RETRIEVAL_ROWS; index++)
    createItemLot(world, NPC_ID, 'wood', 1, `paged-stock-${String(index).padStart(5, '0')}`);
  const actor = entityGet(world.entities, NPC_ID)!.actor!;
  const consumption = applicableConsumption(world, entityGet(world.entities, NPC_ID)!)!;
  const food = Object.values(world.itemDefinitions).find(
    (definition) =>
      (definition.nutrition ?? 0) > 0 &&
      !consumption.refusals.some((refusal) => refusal.itemType === definition.id),
  )!;
  const paused = createItemLot(world, NPC_ID, food.id, 1, 'zz-paused-stock');
  const remaining = createItemLot(world, NPC_ID, food.id, 200, 'zz-unshown-food');
  actor.agency.suspended = {
    id: 'paused-stock-plan',
    revision: 1,
    goalId: null,
    status: 'active',
    steps: [
      {
        id: 'paused-eat-step',
        status: 'queued',
        command: { id: 'paused-eat-step', actorId: NPC_ID, type: 'eat', itemId: paused },
      },
    ],
  };
  world.supplyOpportunities ??= {};
  world.supplyOpportunities[NPC_ID] = {
    id: 'test-personal-supply',
    version: 1,
    foodBelow: 100 * food.nutrition!,
    ammunitionBelow: 0,
    maximumCandidates: 1,
    descriptions: {
      motive: 'I can consider my supplies.',
      food: 'I have little food ({available}).',
      ammunition: 'I have little ammunition.',
      material: 'I lack a needed material.',
      alternatives: 'I can ask or make another choice.',
    },
    places: [{ id: 'test-known-place', purposes: ['food'], materialIds: [] }],
  };

  const observed = decisionObservation(world, NPC_ID)!;
  expect(observed.inventoryCoverage.paged).toBe(true);
  expect(observed.inventoryCoverage.available).toBeGreaterThan(RETRIEVAL_ROWS);
  expect(observed.inventoryCoverage.considered).toBeLessThan(32);
  expect(observed.inventory.some((item) => item.id === paused)).toBe(true);
  expect(observed.inventory.some((item) => item.id === remaining)).toBe(false);
  const pausedCandidate = candidateSet(world, NPC_ID, observed, []).find(
    (candidate) => candidate.id === `item:${paused}`,
  );
  expect(pausedCandidate?.required).toBe(true);
  expect(observed.supplyOpportunities).toEqual([]);
  // A page-only calculation would incorrectly report a food shortage.
  expect(supplyOpportunityContext(world, NPC_ID, observed.inventory)).not.toEqual([]);
}, 60_000);

it('reads only actually referenced output ports without pinning prior output history or text roles', () => {
  const node: ActivityNode = {
    kind: 'sequence',
    name: 'Use the selected result, then speak',
    children: [
      {
        kind: 'invoke',
        key: 'equip-result',
        name: 'Equip the result',
        command: 'equip',
        args: { itemId: { output: 'made', port: 'tool', quantity: 1 } },
      },
      {
        kind: 'invoke',
        key: 'speak',
        name: 'Speak',
        command: 'say',
        args: { text: { role: 'words' }, targetId: { role: 'recipient' } },
      },
    ],
  };
  const refs = activityEntityReferences(
    node,
    { words: 'private words', recipient: 'known-person' },
    {
      made: [
        { port: 'tool', itemId: 'selected-tool', definitionId: 'tool', quantity: 1 },
        { port: 'other', itemId: 'unused-port', definitionId: 'food', quantity: 1 },
      ],
      old: [{ port: 'tool', itemId: 'old-unrelated-output', definitionId: 'tool', quantity: 1 }],
    },
  );
  expect(new Set(refs)).toEqual(new Set(['known-person', 'selected-tool']));
});
