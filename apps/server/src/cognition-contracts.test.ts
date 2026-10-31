import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  activityRequestDescriptors,
  validResponseEnvelope,
  type ActivityRequestDescriptor,
} from '@open-legend/domain';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  boundResponseSchema,
  nativeResponse,
  boundSpeechResponseSchema,
  previewSpeechOperation,
  responseSchema,
  RESPONSE_INSTRUCTIONS,
  DECISION_INSTRUCTIONS,
  REFLECTION_INSTRUCTIONS,
  responsePayloads,
  nativeGoalChange,
  reflectionSchema,
} from './cognition-contracts.js';
import { navigationInstructions, nativeActionInvocation } from './navigation-contracts.js';
import { compileSchema, createAiClient } from '@open-legend/ai';
import { validActionInvocation, commitActorResponse, entityGet, NPC_ID } from '@open-legend/domain';
import { compactActivityRequests, readableDecisionContext } from './response-context.js';
import { resolveResponseEntities } from './entity-references.js';
import { CHARACTER_SERVICE_INSTRUCTIONS } from './character-service-instructions.js';

const talk = {
  localId: 'reply',
  requiresAccepted: [],
  talk: {
    text: 'Enough. Stay back.',
    addresseeEntityId: 'person',
    selfIntroduction: null,
    volume: 'shout' as const,
  },
};
const action = {
  localId: 'act',
  requiresAccepted: [],
  act: {
    kind: 'known' as const,
    actionId: 'a0',
    mode: 'enqueue' as const,
  },
};
const bound = () =>
  boundResponseSchema(['actor', 'person'], ['a0'], { speech: true, expressions: [] });

describe('one sparse response contract', () => {
  it('inherits the same trusted service policy before authored character context', () => {
    for (const instructions of [
      RESPONSE_INSTRUCTIONS,
      DECISION_INSTRUCTIONS,
      REFLECTION_INSTRUCTIONS,
    ]) {
      expect(instructions.startsWith(`${CHARACTER_SERVICE_INSTRUCTIONS}\n\n`)).toBe(true);
      expect(instructions.split(CHARACTER_SERVICE_INSTRUCTIONS)).toHaveLength(2);
    }
  });
  it('preserves independent speech and action through request parsing, reference binding and native validation', () => {
    const parsed = bound().parse({ operations: [talk, action] });
    expect(parsed.operations.map(Object.keys)).toEqual([
      ['localId', 'requiresAccepted', 'talk'],
      ['localId', 'requiresAccepted', 'act'],
    ]);
    const resolved = resolveResponseEntities(
      nativeResponse({
        operations: parsed.operations.map(({ appraise: _appraise, ...operation }) => operation),
      }),
      {
        actor: 'native-actor',
        person: 'native-person',
      },
    );
    expect(resolved.operations[0]?.talk?.addresseeEntityId).toBe('native-person');
    expect(Object.keys(resolved.operations[0]!)).toEqual(['localId', 'requiresAccepted', 'talk']);
    expect(validResponseEnvelope(resolved)).toBe(true);
    expect(responseSchema.safeParse({ operations: [] }).success).toBe(true);
    const speechOnly = boundSpeechResponseSchema(['actor', 'person']);
    expect(speechOnly.parse({ operations: [talk] })).toEqual({ operations: [talk] });
    expect(speechOnly.safeParse({ operations: [] }).success).toBe(true);
    expect(speechOnly.safeParse({ operations: [talk, action] }).success).toBe(false);
    expect(speechOnly.safeParse({ operations: [action] }).success).toBe(false);
    expect(
      speechOnly.safeParse({ operations: [{ ...talk, requiresAccepted: ['act'] }] }).success,
    ).toBe(false);
  });

  it('rejects unused padding, combined payloads and unknown references rather than silently stripping them', () => {
    for (const operation of [
      { ...talk, act: null },
      { ...talk, think: { text: 'No.', aboutEntityIds: [] } },
      { ...talk, talk: { ...talk.talk, addresseeEntityId: 'unpermitted' } },
    ])
      expect(bound().safeParse({ operations: [operation] }).success).toBe(false);
    expect(validResponseEnvelope({ operations: [{ ...talk, act: null } as never] })).toBe(false);
    expect(validResponseEnvelope({ operations: [{ ...talk, requiresAccepted: ['later'] }] })).toBe(
      false,
    );
  });

  it('declares only enabled strict branches and previews only independent speech', () => {
    const schema = bound();
    expect(previewSpeechOperation(schema.shape.operations.element, talk)).toEqual(talk);
    expect(previewSpeechOperation(schema.shape.operations.element, action)).toBeNull();
    expect(
      previewSpeechOperation(schema.shape.operations.element, {
        ...talk,
        requiresAccepted: ['first'],
      }),
    ).toBeNull();
    expect(
      boundResponseSchema(['actor'], [], { speech: false, expressions: [] }).safeParse({
        operations: [talk],
      }).success,
    ).toBe(false);
    const json = z.toJSONSchema(schema, { target: 'draft-7' });
    const variants = (
      json.properties!.operations as {
        items: {
          anyOf: Array<{ properties: object; required: string[]; additionalProperties: boolean }>;
        };
      }
    ).items.anyOf;
    expect(variants).toHaveLength(7);
    for (const variant of variants) {
      expect(Object.keys(variant.properties)).toHaveLength(3);
      expect(variant.required).toHaveLength(3);
      expect(variant.additionalProperties).toBe(false);
    }
  });
});

it('compacts repeated instructions/catalogs without changing complete identity, evidence or situation-specific choices', () => {
  const world = stockedCamp();
  const definitions = activityRequestDescriptors(world);
  expect(definitions.length).toBeGreaterThan(0);
  const aboutMe = 'A complete accepted personal history. '.repeat(150);
  const experience = [
    { acquisition: 'heard', sourceId: 'person', text: 'I will return tomorrow.', at: 1234 },
  ];
  const choices = [
    {
      entityId: 'person',
      label: 'An exact situation-specific choice',
      kind: 'entity' as const,
      roles: ['targetId'],
      accessible: true,
    },
    {
      entityId: 'other',
      label: 'A separate complete choice',
      kind: 'entity' as const,
      roles: ['targetId'],
      accessible: true,
    },
  ];
  const warnings = ['A real prerequisite remains unavailable.'];
  const prompt = readableDecisionContext(
    {
      identity: 'A person',
      aboutMe,
      body: 'Health 95 on a 0–100 scale.',
      experience,
      navigation: navigationInstructions(world, { includeActivityRequests: false }),
      activityRequests: { requests: definitions, choices, warnings },
    },
    [],
  );
  expect(prompt).toContain(aboutMe);
  expect(prompt).toContain(JSON.stringify(experience));
  const compact = compactActivityRequests({ requests: definitions, choices, warnings });
  expect(prompt).toContain(JSON.stringify(compact));
  expect(
    compact.choices.map(({ group, ...choice }) => ({ ...compact.choiceGroups[group], ...choice })),
  ).toEqual(choices);
  expect(prompt.split(JSON.stringify(definitions))).toHaveLength(2);
  expect(prompt).toContain('descriptive gesture does not perform contact');
  expect(prompt).toContain('Independent speech and action can coexist');
  expect(prompt).not.toContain('all seven unused fields must be null');
  expect(prompt).not.toContain('## Inventory');
  expect(prompt).not.toContain('## Knowledge');
  expect(prompt).not.toContain('undefined');
  expect(prompt).toContain('You may elaborate a sparse pre-game past consistently');
  expect(responsePayloads.talk.shape.text.description).toContain(
    'an emotional aside needs no matching action',
  );
});

describe('sparse nested payloads', () => {
  it('binds installed families to their own fields through schema, resolution and native validation', () => {
    const world = stockedCamp();
    const requests: ActivityRequestDescriptor[] = [
      {
        id: 'take-count',
        label: 'Counted work',
        description: 'Choose a count',
        fields: {
          amount: {
            type: 'integer' as const,
            minimum: 1,
            maximum: 3,
            label: 'Count',
            required: true as const,
          },
        },
      },
      {
        id: 'take-target',
        label: 'Targeted work',
        description: 'Choose a target',
        fields: { target: { type: 'entity' as const, label: 'Target', required: true as const } },
      },
    ];
    const schema = boundResponseSchema(
      ['actor', 'person'],
      ['a0'],
      { speech: true, expressions: [] },
      [],
      [],
      requests,
    );
    const validate = compileSchema(z.toJSONSchema(schema, { target: 'draft-7' }));
    const invoke = (invocation: unknown) => ({
      operations: [
        {
          localId: 'act',
          requiresAccepted: [],
          act: { kind: 'invoke', mode: 'enqueue', invocation },
        },
      ],
    });
    for (const invocation of [
      { family: 'take-count', parameters: { amount: 2 } },
      { family: 'take-target', parameters: { target: 'person' } },
      { family: 'move', frame: 'world', x: 0, z: 2, surfaceId: null },
      { family: 'move', place: 'target', targetEntityId: 'person' },
      {
        family: 'follow',
        targetEntityId: 'person',
        distance: null,
        relation: null,
        onLost: null,
        until: null,
      },
      { family: 'drop', itemId: 'person', quantity: null },
    ]) {
      expect(schema.safeParse(invoke(invocation)).success).toBe(true);
      expect(validate(invoke(invocation))).toBe(true);
    }
    for (const invocation of [
      { family: 'take-count', parameters: { target: 'person' } },
      { family: 'take-target', parameters: { target: 'unpermitted' } },
      { family: 'take-count', parameters: { amount: 4 } },
      { family: 'take-count', parameters: { amount: 2 }, targetEntityId: null },
      { family: 'move', frame: 'world', x: 0, z: 2, surfaceId: null, place: null },
    ]) {
      expect(schema.safeParse(invoke(invocation)).success).toBe(false);
      expect(validate(invoke(invocation))).toBe(false);
    }
    expect(
      validActionInvocation(
        world,
        nativeActionInvocation({ family: 'move', frame: 'world', x: 0, z: 2, surfaceId: null }),
      ),
    ).toBe(true);
  });

  it('keeps goal status and cancellation sparse, while native commands retain required fields', () => {
    const parsed = bound().parse({
      operations: [
        {
          localId: 'goal',
          requiresAccepted: [],
          goal: { operation: 'create', objective: 'Keep some food for later', parentId: null },
        },
        {
          localId: 'plan',
          requiresAccepted: ['goal'],
          plan: {
            mode: 'enqueue',
            expectedRevision: 0,
            goalId: '$goal',
            steps: [{ actionId: 'a0' }, { itemFromStep: 0, useItemAs: 'eat' }],
          },
        },
        {
          localId: 'pause',
          requiresAccepted: [],
          goal: { operation: 'pause', goalId: 'existing', expectedRevision: 1 },
        },
        { localId: 'stop', requiresAccepted: [], plan: { mode: 'cancel', expectedRevision: 0 } },
      ],
    });
    const native = nativeResponse({
      operations: parsed.operations.map(({ appraise: _, ...op }) => op),
    });
    expect(validResponseEnvelope(native)).toBe(true);
    expect(native.operations[2]?.goal).toEqual({
      operation: 'pause',
      goalId: 'existing',
      expectedRevision: 1,
      objective: null,
      parentId: null,
    });
    expect(native.operations[3]?.plan).toEqual({
      mode: 'cancel',
      expectedRevision: 0,
      goalId: null,
      steps: [],
    });
    expect(
      bound().safeParse({
        operations: [
          {
            localId: 'stop',
            requiresAccepted: [],
            plan: { mode: 'cancel', expectedRevision: 0, steps: [] },
          },
        ],
      }).success,
    ).toBe(false);
    const reflected = reflectionSchema.parse({
      appraisalChanges: [],
      knowledgeChanges: [],
      nameChanges: [],
      goalChanges: [{ operation: 'complete', goalId: 'existing', expectedRevision: 1 }],
      thoughts: ['That is finished.'],
    });
    expect(nativeGoalChange(reflected.goalChanges[0]!)).toMatchObject({
      operation: 'complete',
      objective: null,
      parentId: null,
    });
  });

  it('keeps reflection interpretation alternatives sparse without dropping revisions or meaningful null values', () => {
    const validate = compileSchema(z.toJSONSchema(reflectionSchema, { target: 'draft-7' }));
    const base = {
      thoughts: ['I can trust her a little more.'],
      goalChanges: [],
      knowledgeChanges: [],
      nameChanges: [],
    };
    const changes = [
      { kind: 'create', policy: 'policy1', source: 'cause1', subject: null, value: null },
      { kind: 'reframe', appraisal: 'feeling1', expectedRevision: 2, source: 'cause2', value: 0.5 },
      { kind: 'resolve', appraisal: 'feeling2', expectedRevision: 1 },
    ];
    expect(reflectionSchema.parse({ ...base, appraisalChanges: changes }).appraisalChanges).toEqual(
      changes,
    );
    expect(validate({ ...base, appraisalChanges: changes })).toBe(true);
    for (const change of [
      { ...changes[0], appraisal: null },
      { ...changes[1], expectedRevision: null },
      { ...changes[2], value: null },
      { kind: 'create', policy: 'policy1', source: 'cause1' },
    ]) {
      const reply = { ...base, appraisalChanges: [change] };
      expect(reflectionSchema.safeParse(reply).success).toBe(false);
      expect(validate(reply)).toBe(false);
    }
  });

  it('omits unavailable exact choices without invalid empty enums and preserves speech and open actions', () => {
    const schema = boundResponseSchema(['actor'], [], {
      speech: true,
      expressions: [],
      proposals: false,
    });
    expect(() => compileSchema(z.toJSONSchema(schema, { target: 'draft-7' }))).not.toThrow();
    expect(schema.safeParse({ operations: [action] }).success).toBe(false);
    expect(
      schema.safeParse({
        operations: [
          {
            localId: 'move',
            requiresAccepted: [],
            act: {
              kind: 'invoke',
              mode: 'enqueue',
              invocation: { family: 'move', frame: 'actor', x: 1, z: 0, surfaceId: null },
            },
          },
        ],
      }).success,
    ).toBe(true);
  });
});

it('carries the same sparse contract through the direct provider adapter and native projection', async () => {
  const schema = bound();
  const wire = {
    operations: [
      talk,
      action,
      { localId: 'stop', requiresAccepted: [], plan: { mode: 'cancel', expectedRevision: 0 } },
    ],
  };
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' });
  let calls = 0;
  const client = createAiClient({
    openai: { apiKey: 'fixture', reasoningEffort: 'low' },
    fetch: async (url, init) => {
      calls++;
      expect(url).toBe('https://api.openai.com/v1/responses');
      const body = JSON.parse(String(init.body));
      expect(body.text.format.schema).toEqual(jsonSchema);
      return new Response(
        JSON.stringify({
          id: 'response-fixture',
          model: 'gpt-5.6-luna',
          status: 'completed',
          output: [
            { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(wire) }] },
          ],
          usage: { input_tokens: 100, output_tokens: 100 },
        }),
        { headers: { 'content-type': 'application/json' } },
      );
    },
  });
  const result = await client.generate({
    requestId: 'sparse-contract-fixture',
    task: 'npc_response',
    instructions: RESPONSE_INSTRUCTIONS,
    context: 'Fixture permitted context',
    schema: jsonSchema,
  });
  expect(result.outcome).toBe('value');
  if (result.outcome !== 'value') return;
  const parsed = schema.parse(result.value);
  expect(
    validResponseEnvelope(
      nativeResponse({ operations: parsed.operations.map(({ appraise: _, ...op }) => op) }),
    ),
  ).toBe(true);
  expect(calls).toBe(1);
});

it('commits a sparse goal and independent thought once through the native response owner', () => {
  const world = stockedCamp();
  const parsed = boundResponseSchema([NPC_ID], [], { speech: true, expressions: [] }).parse({
    operations: [
      {
        localId: 'purpose',
        requiresAccepted: [],
        goal: { operation: 'create', objective: 'Keep food for tomorrow', parentId: null },
      },
      {
        localId: 'thought',
        requiresAccepted: [],
        think: { text: 'Tomorrow matters too.', aboutEntityIds: [] },
      },
    ],
  });
  const response = nativeResponse({
    operations: parsed.operations.map(({ appraise: _, ...op }) => op),
  });
  const planGeneration = entityGet(world.entities, NPC_ID)!.actor!.planGeneration;
  const committed = commitActorResponse(
    world,
    'sparse-native-fixture',
    NPC_ID,
    response,
    {},
    [NPC_ID],
    planGeneration,
  );
  expect(committed.outcome.ok).toBe(true);
  expect(committed.world.responseReceipts?.['sparse-native-fixture']?.components).toMatchObject({
    purpose: { ok: true },
    thought: { ok: true },
  });
  const replay = commitActorResponse(
    committed.world,
    'sparse-native-fixture',
    NPC_ID,
    response,
    {},
    [NPC_ID],
    planGeneration,
  );
  expect(replay.outcome.ok).toBe(true);
  expect(replay.world).toBe(committed.world);
  expect(replay.events).toHaveLength(0);
});
