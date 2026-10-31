import { describe, expect, it } from 'vitest';
import { compileSchema } from '@open-legend/ai';
import { boundResponseSchema, RESPONSE_PORTRAYAL_GUIDE } from './cognition-contracts.js';
import { DECISION_LIMITS } from './decision-state.js';
import {
  compileDecisionTask,
  decisionPolicyDigest,
  higherDecisionAllowance,
  permitsEscalation,
  prepareDecisionTask,
  type DecisionTask,
} from './decision-task.js';
import { readConfig } from '../../../tests/fixtures/database.js';
import {
  assertHigherDecisionModelTransport,
  resolveHigherDecisionGenerationConfig,
} from './generation-config.js';
import { CHARACTER_SERVICE_INSTRUCTIONS } from './character-service-instructions.js';
import { levelLimits } from './cognition-budget.js';

const inputBytes = (request: ReturnType<typeof compileDecisionTask>) =>
  Buffer.byteLength(request.instructions) + Buffer.byteLength(request.context);

describe('complete structured decision input', () => {
  it('retains required experience and appraisal paths without encoding the character twice', () => {
    const tasks = {
      q0: {
        kind: 'response',
        question: 'Respond to the personally heard question using the permitted evidence.',
        valueSchema: boundResponseSchema(['me', 'speaker'], ['rest'], {
          speech: true,
          expressions: ['smile'],
          proposals: false,
        }),
      },
    } satisfies Record<string, DecisionTask>;
    // Public synthetic evidence exercises the measured 102,872-byte refusal;
    // no private character checkpoint or conversation is copied into this test.
    const context = {
      sourceTime: 0,
      character: {
        aboutMe: 'My complete accepted identity remains part of this decision.',
        experience: Array.from({ length: 15 }, (_, index) => ({
          source: 'awareness',
          handle: `experience-${index}`,
          owner: 'me',
          value: { acquisition: 'heard', content: 'I heard "yes".\n'.repeat(200) },
        })),
        additionalRequiredFact: '',
      },
      choices: [{ id: 'rest', description: 'Continue the current chosen rest.' }],
      appraisals: {
        sources: [{ handle: 'cause1', experience: { reference: 'character.experience[14]' } }],
      },
    };
    const guidance = 'Supplied facts and alternatives grant no execution authority.';
    const encodedBeforePadding = compileDecisionTask(tasks, JSON.stringify(context), guidance);
    context.character.additionalRequiredFact = 'x'.repeat(
      102_872 - inputBytes(encodedBeforePadding),
    );
    const encodedTwice = compileDecisionTask(tasks, JSON.stringify(context), guidance);
    expect(inputBytes(encodedTwice)).toBe(102_872);
    expect(() => prepareDecisionTask(tasks, JSON.stringify(context), guidance)).toThrow(
      /byte allowance/,
    );

    const request = prepareDecisionTask(tasks, context, guidance);
    expect(request.instructions.startsWith(CHARACTER_SERVICE_INSTRUCTIONS)).toBe(true);
    expect(request.instructions.split(RESPONSE_PORTRAYAL_GUIDE)).toHaveLength(2);
    expect(inputBytes(request)).toBeLessThanOrEqual(DECISION_LIMITS.inputBytes);
    expect(inputBytes(encodedTwice) - inputBytes(request)).toBeGreaterThan(9_000);
    const wire = JSON.parse(request.context);
    expect(wire.permittedContext).toEqual(context);
    expect(wire.installedWorldGuidance).toBe(guidance);
    expect(wire.questions.q0).toEqual({ kind: 'response', question: tasks.q0.question });
    expect(wire.permittedContext.character.experience[14]).toEqual(
      context.character.experience[14],
    );
    expect(wire.permittedContext.appraisals.sources[0].experience.reference).toBe(
      'character.experience[14]',
    );
    expect(request.schema).toEqual(encodedTwice.schema);

    const excess = 'x'.repeat(DECISION_LIMITS.inputBytes - inputBytes(request) + 1);
    expect(() =>
      prepareDecisionTask(
        tasks,
        {
          ...context,
          character: {
            ...context.character,
            additionalRequiredFact: context.character.additionalRequiredFact + excess,
          },
        },
        guidance,
      ),
    ).toThrow(/byte allowance/);
  });

  it('preserves literal prose, exact answer forms and an independent schema allowance', () => {
    const prose = 'A person said "keep this exact account".\nIts cause is uncertain.';
    const tasks = {
      q0: { kind: 'choice', question: 'Choose.', choices: { rest: 'Rest' } },
    } satisfies Record<string, DecisionTask>;
    const request = prepareDecisionTask(tasks, prose);
    expect(JSON.parse(request.context).permittedContext).toBe(prose);
    expect(request.instructions).not.toContain(RESPONSE_PORTRAYAL_GUIDE);
    const validate = compileSchema(request.schema);
    for (const answer of [
      { status: 'answered', value: { choice: 'rest' }, reason: null },
      { status: 'abstained', value: null, reason: 'no-suitable-option' },
    ]) {
      const output = { answers: { q0: answer } };
      expect(validate(output)).toBe(true);
      expect(request.decode(output)).toEqual(output.answers);
    }
    // These combinations were schema-permitted but unusable in live higher replies.
    for (const answer of [
      { status: 'answered', value: null, reason: null },
      { status: 'answered', value: { choice: 'rest' }, reason: 'unsupported' },
      { status: 'abstained', value: null, reason: null },
      { status: 'abstained', value: { choice: 'rest' }, reason: 'unsupported' },
    ]) {
      const output = { answers: { q0: answer } };
      expect(validate(output)).toBe(false);
      expect(() => request.decode(output)).toThrow();
    }

    const largeSchema = {
      q0: {
        kind: 'choice',
        question: 'Choose the exact supplied handle.',
        choices: { ['a'.repeat(DECISION_LIMITS.schemaBytes)]: 'One supplied choice' },
      },
    } satisfies Record<string, DecisionTask>;
    const compiled = compileDecisionTask(largeSchema, { fact: 'Complete evidence.' });
    expect(inputBytes(compiled)).toBeLessThan(DECISION_LIMITS.inputBytes);
    expect(Buffer.byteLength(JSON.stringify(compiled.schema))).toBeGreaterThan(
      DECISION_LIMITS.schemaBytes,
    );
    expect(() => prepareDecisionTask(largeSchema, { fact: 'Complete evidence.' })).toThrow(
      /byte allowance/,
    );
  });
});

it('selects and funds the higher model through its actual transport and credential', () => {
  const config = readConfig({
    MACROFOLD_API_KEY: 'fixture-backend',
    MACROFOLD_MODEL_API_KEY: 'fixture-deployment-only',
    MACROFOLD_RUN_MAX_USD: '0.007',
    DECISION_ESCALATION_MODEL: 'z-ai/fixture-catalogue-model',
    AI_BUDGET_USD: '1',
    DECISION_ESCALATION_JSON:
      '{"mode":"apply","origins":["macrofold/typesafe/jev-1.13"],"reasons":["abstained"]}',
  });
  const request = prepareDecisionTask(
    { q0: { kind: 'likelihood', question: 'Would quiet help?' } },
    'The character asked for quiet.',
  );
  expect(resolveHigherDecisionGenerationConfig(config, { maxOutputTokens: 1024 })).toMatchObject({
    transport: 'macrofold',
    model: 'z-ai/fixture-catalogue-model',
    billingMode: config.macrofoldBillingMode,
    maxOutputTokens: 1024,
  });
  expect(permitsEscalation(config, 'abstained')).toBe(true);
  expect(higherDecisionAllowance(config, request)).toBe(0.007);
  expect(levelLimits(config)[4].decisionUsd).toBe(0.07);
  const policy = decisionPolicyDigest(config);
  config.llmKey = 'irrelevant-direct-key';
  expect(decisionPolicyDigest(config)).toBe(policy);
  config.macrofoldKey = 'different-backend';
  expect(decisionPolicyDigest(config)).not.toBe(policy);
  config.macrofoldKey = '';
  expect(permitsEscalation(config, 'abstained')).toBe(false);
});

it('keeps a prepared higher request on its admitted provider route', () => {
  expect(() => assertHigherDecisionModelTransport('gpt-6-luna', 'gpt-5-mini')).not.toThrow();
  expect(() =>
    assertHigherDecisionModelTransport('openai/gpt-5-mini', 'z-ai/fixture-model'),
  ).not.toThrow();
  for (const [original, selected] of [
    ['gpt-6-luna', 'openai/gpt-5-mini'],
    ['openai/gpt-5-mini', 'gpt-6-luna'],
  ] as const)
    expect(() => assertHigherDecisionModelTransport(original, selected)).toThrow(
      'Choose this model in Lab model settings and prepare a new stage',
    );
});
