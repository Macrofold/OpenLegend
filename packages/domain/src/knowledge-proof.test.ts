import { describe, expect, it } from 'vitest';
import { createWorld, PLAYER_ID } from './worlds/base/world.js';
import { learnRecipe, validateKnowledge } from './knowledge.js';
import { temporalReceiptId } from './temporal-evidence.js';
import { ensureExperienceAccounting } from './remembered-impressions.js';
import { forgetExperience } from './experience.js';

const method = (world: ReturnType<typeof createWorld>) =>
  world.itemDefinitions['field-sling-record']!.recipeRecord!.method.id;

describe('learned method minimum proof', () => {
  it('keeps one exact grant, makes rereading idempotent and revokes only explicitly removed learned support', () => {
    let world = createWorld();
    const id = method(world);
    expect(learnRecipe(world, PLAYER_ID, id, 'record', 'fixture-record-proof')).toBe('acquired');
    const record = world.knowledge[PLAYER_ID]!.find((record) => record.recipeId === id)!;
    const receipt = temporalReceiptId(record.sourceReceipt!);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.supports![receipt]!.required).toBe(true);
    validateKnowledge(world);
    const missingProof = structuredClone(world);
    delete missingProof.knowledge[PLAYER_ID]!.find((record) => record.recipeId === id)!
      .sourceReceipt;
    expect(() => validateKnowledge(missingProof)).toThrow('receipt locator');
    const inheritedMethod = structuredClone(world);
    inheritedMethod.knowledge[PLAYER_ID]!.push({
      recipeId: '__proto__',
      source: 'authored',
      evidenceId: 'fixture-forged-method',
      learnedAt: world.simTime,
    });
    expect(() => validateKnowledge(inheritedMethod)).toThrow('Invalid learned capability');
    const before = JSON.stringify(world);
    expect(learnRecipe(world, PLAYER_ID, id, 'taught', 'fixture-second-read')).toBe(
      'already-known',
    );
    expect(JSON.stringify(world)).toBe(before);
    const forgotten = forgetExperience(world, PLAYER_ID, 'fixture-record-proof');
    expect(forgotten.outcome.ok).toBe(true);
    world = forgotten.world;
    expect(world.knowledge[PLAYER_ID]!.some((record) => record.recipeId === id)).toBe(false);
    expect(world.experience!.temporal!.actors[PLAYER_ID]!.supports?.[receipt]).toBeUndefined();
    expect(world.knowledge[PLAYER_ID]!.some((record) => record.source === 'authored')).toBe(true);
    validateKnowledge(world);
  });
  it('refuses a new grant before retaining either the capability or its proof when the required allowance is full', () => {
    const world = createWorld();
    ensureExperienceAccounting(world, PLAYER_ID);
    world.experience!.temporal!.actors[PLAYER_ID]!.accounts!.required.count = 512;
    const before = JSON.stringify(world);
    expect(learnRecipe(world, PLAYER_ID, method(world), 'record', 'fixture-full-proof')).toBe(
      'capacity',
    );
    expect(JSON.stringify(world)).toBe(before);
  });
});
