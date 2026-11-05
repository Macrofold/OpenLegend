import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { COGNITION_LAB_MAX_COMPARISON_VARIANTS } from '@open-legend/protocol';
import { LAB_STORAGE_DEFAULTS } from './cognition-lab-records.js';
import { labOperationSchema } from './cognition-lab-contracts.js';
import { readConfig } from '../../../tests/fixtures/database.js';
import { labModelChoices, labModelDefaults } from './cognition-lab-settings.js';

it('admits an explicit current-model choice only for saved scenario and checkpoint loads', () => {
  const expected = { runtimeGeneration: randomUUID(), scenarioRevision: 0 };
  for (const kind of ['loadScenario', 'restoreCheckpoint']) {
    const operation = { kind, commandId: randomUUID(), expected, savedId: randomUUID() };
    expect(labOperationSchema.parse(operation)).not.toHaveProperty('keepCurrentModels');
    for (const keepCurrentModels of [false, true])
      expect(labOperationSchema.parse({ ...operation, keepCurrentModels })).toMatchObject({
        keepCurrentModels,
      });
    expect(labOperationSchema.safeParse({ ...operation, keepCurrentModels: 'true' }).success).toBe(
      false,
    );
  }
  expect(
    labOperationSchema.safeParse({
      kind: 'newScenario',
      commandId: randomUUID(),
      expected,
      keepCurrentModels: true,
    }).success,
  ).toBe(false);
});

it('admits only comparison batches whose complete run identities fit the terminal receipt', () => {
  const variant = {
    name: 'Ordinary',
    stimulus: { kind: 'say', actorId: 'actor', text: 'Hello.', volume: 'normal' },
  };
  const operation = {
    kind: 'runComparison',
    commandId: randomUUID(),
    expected: { runtimeGeneration: randomUUID(), scenarioRevision: 0 },
    originId: randomUUID(),
    policy: {
      mode: 'oneResponse',
      autonomousActorIds: [],
      durationSeconds: 60,
      maximumCalls: 20,
      activeWallSeconds: 180,
    },
    variants: Array.from({ length: COGNITION_LAB_MAX_COMPARISON_VARIANTS }, () => variant),
  };
  expect(labOperationSchema.safeParse(operation).success).toBe(true);
  const terminal = {
    commandId: operation.commandId,
    fingerprint: 'f'.repeat(64),
    state: 'completed',
    createdAt: new Date().toISOString(),
    result: {
      ok: true,
      commandId: operation.commandId,
      message: 'Serial comparison complete. The final variant remains current.',
      comparisonRunIds: operation.variants.map(() => randomUUID()),
    },
  };
  expect(Buffer.byteLength(JSON.stringify(terminal))).toBeLessThan(
    LAB_STORAGE_DEFAULTS.terminalBytes,
  );
  expect(
    labOperationSchema.safeParse({ ...operation, variants: [...operation.variants, variant] })
      .success,
  ).toBe(false);
});

it('offers the configured generation catalogue on all three decision routes with backend access', () => {
  const model = 'z-ai/fixture-catalogue-model';
  const config = readConfig({
    MACROFOLD_API_KEY: 'fixture-backend',
    OPENAI_MODEL_PRICES_JSON: JSON.stringify([
      { model, prices: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.2 } },
    ]),
  });
  const defaults = labModelDefaults(config);
  const choices = labModelChoices(config);
  for (const purpose of ['responseFast', 'responseComplex', 'higherDecision'])
    expect(choices[purpose]).toContain(model);
  expect(labModelDefaults(config)).toEqual(defaults);
  config.macrofoldKey = '';
  for (const purpose of ['responseFast', 'responseComplex', 'higherDecision'])
    expect(labModelChoices(config)[purpose]).not.toContain(model);
});
