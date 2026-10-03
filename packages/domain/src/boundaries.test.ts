import { PLAYER_ID, NPC_ID } from '@open-legend/domain';
import { createItemLot } from './index.js';
import { describe, expect, it } from 'vitest';
import {
  admitDeclaration,
  createWorld,
  executeCommand,
  observeActor,
  queryMemories,
  remember,
  validateDeclaration,
} from './index.js';
import type { Command, DeclarationDraft } from './types.js';

const inheritedIds = [
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'hasOwnProperty',
  'valueOf',
];
const draft = (): DeclarationDraft => ({
  family: { id: 'base:flex', version: 1 },
  name: 'Fixture bow',
  description: 'A test-only physical composition.',
  inputs: [
    { definitionId: 'wood', quantity: 1, role: 'body' },
    { definitionId: 'cord', quantity: 1, role: 'binding' },
  ],
  output: {
    name: 'Fixture bow',
    description: 'Test-only flex launcher.',
  },
  parameters: { workSeconds: 90, damage: 18, range: 7, accuracy: 0.8 },
});

describe('untrusted dictionary identifiers', () => {
  it.each(inheritedIds)(
    'rejects material/provenance ID %s without throwing or changing state',
    (id) => {
      const world = createWorld();
      const snapshot = structuredClone(world);
      const candidate = draft();
      candidate.inputs[0]!.definitionId = id;
      expect(validateDeclaration(world, candidate).length).toBeGreaterThan(0);
      expect(
        admitDeclaration(world, candidate, {
          actorId: PLAYER_ID,
          requestId: 'bad-material',
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
        }).outcome.code,
      ).toBe('invalid-declaration');
      expect(
        admitDeclaration(world, draft(), {
          actorId: PLAYER_ID,
          requestId: id,
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
        }).outcome.code,
      ).toBe('invalid-provenance');
      expect(
        admitDeclaration(world, draft(), {
          actorId: id,
          requestId: 'bad-actor',
          source: 'test-fixture',
          authority: { origin: 'player', policyRevision: 1 },
        }).outcome.code,
      ).toBe('invalid-provenance');
      expect(world).toEqual(snapshot);
      expect(Object.getPrototypeOf(world.declarationReceipts)).toBe(Object.prototype);
    },
  );

  it.each(inheritedIds)('rejects command references to %s and returns safe scoped reads', (id) => {
    const world = createWorld();
    createItemLot(world, PLAYER_ID, 'raw_meat', 1, 'fixture-raw');
    const payloads: Record<string, unknown>[] = [
      { type: 'gather', targetId: id },
      { type: 'harvest', targetId: id },
      { type: 'craft', recipeId: id },
      { type: 'equip', itemId: id },
      { type: 'eat', itemId: id },
      { type: 'hunt', targetId: id },
      { type: 'hunt', targetId: 'hare-1', weaponItemId: id },
      { type: 'cook', itemId: 'fixture-raw', heatId: id },
      { type: 'prepare', preparation: id },
      { type: 'teach', targetId: NPC_ID, recipeId: id },
      { type: 'say', targetId: id, text: 'This should not be spoken.' },
    ];
    for (const [index, payload] of payloads.entries()) {
      const result = executeCommand(world, {
        ...payload,
        id: `malformed-${index}`,
        actorId: PLAYER_ID,
      } as Command);
      expect(result.outcome.ok).toBe(false);
      expect(result.world).toBe(world);
      expect(result.events).toEqual([]);
    }
    expect(
      executeCommand(world, {
        id,
        actorId: PLAYER_ID,
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        targetId: PLAYER_ID,
        operation: 'activate',
      }).outcome.code,
    ).toBe('invalid-command');
    expect(
      executeCommand(world, {
        id: 'bad-actor',
        actorId: id,
        type: 'status-effect',
        definitionId: 'wilderness:restorative-rest',
        targetId: PLAYER_ID,
        operation: 'activate',
      }).outcome.code,
    ).toBe('invalid-command');
    expect(queryMemories(world, id)).toEqual([]);
    expect(observeActor(world, id)).toBeNull();
    expect(
      remember(world, id, {
        kind: 'reflection',
        source: 'inferred',
        summary: 'Not a real actor.',
        entityIds: [],
        importance: 1,
      }).outcome.ok,
    ).toBe(false);
  });

  it('does not treat a custom inherited dictionary entry as an admitted material or target', () => {
    const world = createWorld();
    Object.setPrototypeOf(world.itemDefinitions, {
      inherited_material: world.itemDefinitions.wood,
    });
    const candidate = draft();
    candidate.inputs[0]!.definitionId = 'inherited_material';
    expect(validateDeclaration(world, candidate).length).toBeGreaterThan(0);
    Object.setPrototypeOf(world.entities, { inherited_target: world.entities.branches });
    const result = executeCommand(world, {
      id: 'hidden-inheritance',
      actorId: PLAYER_ID,
      type: 'gather',
      targetId: 'inherited_target',
    });
    expect(result.outcome.ok).toBe(false);
    expect(result.world).toBe(world);
  });

  it('rejects an incapacitated inventor at the pure admission boundary', () => {
    const world = createWorld();
    world.entities[PLAYER_ID]!.actor!.incapacitated = true;
    const result = admitDeclaration(world, draft(), {
      actorId: PLAYER_ID,
      requestId: 'collapsed-invention',
      source: 'test-fixture',
      authority: { origin: 'player', policyRevision: 1 },
    });
    expect(result.outcome.code).toBe('invalid-provenance');
    expect(result.world).toBe(world);
    expect(world.recipes).toEqual({});
    expect(world.knowledge[PLAYER_ID]).toEqual([]);
  });
});
