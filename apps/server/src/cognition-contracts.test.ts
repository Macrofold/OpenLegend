import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { activityRequestDescriptors, validResponseEnvelope } from '@open-legend/domain';
import { stockedCamp } from '../../../tests/fixtures/world.js';
import {
  boundResponseSchema,
  previewSpeechOperation,
  responseSchema,
  RESPONSE_INSTRUCTIONS,
  DECISION_INSTRUCTIONS,
  REFLECTION_INSTRUCTIONS,
  responsePayloads,
} from './cognition-contracts.js';
import { navigationInstructions } from './navigation-contracts.js';
import { readableDecisionContext } from './response-context.js';
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
    verb: null,
    targetEntityId: null,
    description: null,
    invocation: null,
    slots: null,
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
      { operations: parsed.operations.map(({ appraise: _appraise, ...operation }) => operation) },
      {
        actor: 'native-actor',
        person: 'native-person',
      },
    );
    expect(resolved.operations[0]?.talk?.addresseeEntityId).toBe('native-person');
    expect(Object.keys(resolved.operations[0]!)).toEqual(['localId', 'requiresAccepted', 'talk']);
    expect(validResponseEnvelope(resolved)).toBe(true);
    expect(responseSchema.safeParse({ operations: [] }).success).toBe(true);
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
    { entityId: 'person', purpose: 'An exact situation-specific choice', quantity: 3 },
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
  expect(prompt).toContain(JSON.stringify({ requests: definitions, choices, warnings }));
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
