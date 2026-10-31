import { describe, expect, it } from 'vitest';
import {
  activityRequestDescriptors,
  NPC_ID,
  PLAYER_ID,
  type ActivityRequestDescriptor,
} from '@open-legend/domain';
import { cooperativeCamp, installFixtureMultiOutputMethod } from '../../../tests/fixtures/world.js';
import type { JudgeRequest, JudgeValue } from '@open-legend/ai';
import {
  chooseActivityRequest,
  requestRoutes,
  projectActivityRequestRequirements,
  activityRequestChoiceFacts,
} from './activity-request-choice.js';

function chooseFirst(request: Omit<JudgeRequest, 'requestId' | 'signal'>): JudgeValue {
  return {
    answers: Object.fromEntries(
      Object.entries(request.questions).map(([id, question]) => {
        if (question.type !== 'choice') throw new Error('Expected a supplied choice.');
        return [
          id,
          {
            type: 'choice' as const,
            choice: 'option_0',
            probabilities: Object.fromEntries(
              Object.keys(question.criteria).map((key) => [key, key === 'option_0' ? 1 : 0]),
            ),
          },
        ];
      }),
    ),
  };
}
const descriptor: ActivityRequestDescriptor = {
  id: 'fixture:dependent',
  label: 'A supported request',
  submitLabel: 'Send',
  description: 'Two independent choices and an exact child of the selected parent.',
  fields: {
    recipient: { type: 'entity', label: 'Recipient', required: true },
    method: { type: 'definition', definitionKind: 'recipe', label: 'Method', required: true },
    output: {
      type: 'choice',
      label: 'Output',
      required: true,
      dependencies: ['method'],
      choices: [{ value: 'result', label: 'The selected method result' }],
    },
  },
};

describe('hierarchical installed activity parameters', () => {
  it('queries current native child roles using only this decision’s captured entity references', () => {
    const world = cooperativeCamp();
    const method = installFixtureMultiOutputMethod(world, PLAYER_ID);
    const form = activityRequestDescriptors(world, PLAYER_ID).find(
      (entry) => entry.id === 'base:cooperation-prepare',
    )!;
    const parameters = { recipientId: 'person_handle', recipeId: method.id };
    const choices = activityRequestChoiceFacts(world, PLAYER_ID, form, 'outputPort', parameters, {
      person_handle: NPC_ID,
    });
    expect(choices.map((choice) => ({ value: choice.value, requires: choice.requires }))).toEqual([
      { value: 'first', requires: { recipeId: method.id } },
      { value: 'second', requires: { recipeId: method.id } },
    ]);
    expect(
      activityRequestChoiceFacts(world, PLAYER_ID, form, 'outputPort', parameters, {}),
    ).toEqual([]);
    world.knowledge[PLAYER_ID] = world.knowledge[PLAYER_ID]!.filter(
      (entry) => entry.recipeId !== method.id,
    );
    expect(
      activityRequestChoiceFacts(world, PLAYER_ID, form, 'outputPort', parameters, {
        person_handle: NPC_ID,
      }),
    ).toEqual([]);
  });
  it('projects declared entity-parent associations without rewriting definition values or leaking unknown IDs', () => {
    const choice = {
      requestIds: [descriptor.id],
      requires: { recipient: 'native-person', method: 'method-a' },
    };
    expect(
      projectActivityRequestRequirements([descriptor], choice, (id) =>
        id === 'native-person' ? 'person-handle' : undefined,
      ),
    ).toEqual({ recipient: 'person-handle', method: 'method-a' });
    expect(
      projectActivityRequestRequirements([descriptor], choice, () => undefined),
    ).toBeUndefined();
    expect(projectActivityRequestRequirements([descriptor], {}, () => undefined)).toEqual({});
  });
  it('routes forms without a universal work mode or a pre-expanded dependent domain', () => {
    expect([...requestRoutes([descriptor]).values()]).toEqual([descriptor]);
  });

  it('batches independent fields, then resolves their dependent role once', async () => {
    const reads: Array<{ field: string; parameters: Record<string, string | number | boolean> }> =
      [];
    const questionCounts: number[] = [];
    const response = await chooseActivityRequest({
      descriptor,
      choices: [],
      simTime: 100,
      namedDeadlines: [],
      state: { question: 'Choose a supported combination.' },
      resolveChoices: async (field, parameters) => {
        reads.push({ field, parameters: { ...parameters } });
        if (field === 'recipient')
          return [
            {
              entityId: 'person-handle',
              kind: 'entity',
              label: 'A perceived person',
              roles: [field],
              accessible: true,
            },
          ];
        if (field === 'method')
          return [
            {
              definitionId: 'method-a',
              kind: 'definition',
              label: 'A learned method',
              roles: [field],
              accessible: true,
            },
          ];
        return [
          {
            value: 'result',
            kind: 'choice',
            label: 'The result of method A',
            roles: [field],
            accessible: true,
            requires: { method: 'method-a' },
          },
        ];
      },
      judge: async (request) => {
        questionCounts.push(Object.keys(request.questions).length);
        return chooseFirst(request);
      },
    });
    expect(questionCounts).toEqual([2, 1]);
    expect(reads.map((entry) => entry.field)).toEqual(['recipient', 'method', 'output']);
    expect(reads[2]!.parameters).toEqual({ recipient: 'person-handle', method: 'method-a' });
    expect(response?.operations[0]?.act).toEqual({
      kind: 'invoke',
      mode: 'enqueue',
      invocation: {
        family: descriptor.id,
        parameters: { recipient: 'person-handle', method: 'method-a', output: 'result' },
      },
    });
  });

  it('declines an empty dependent domain without a paid retry or another parent', async () => {
    let calls = 0;
    const response = await chooseActivityRequest({
      descriptor,
      choices: [],
      simTime: 100,
      namedDeadlines: [],
      state: {},
      resolveChoices: async (field) =>
        field === 'recipient'
          ? [
              {
                entityId: 'person-handle',
                kind: 'entity',
                label: 'Person',
                roles: [field],
                accessible: true,
              },
            ]
          : field === 'method'
            ? [
                {
                  definitionId: 'method-a',
                  kind: 'definition',
                  label: 'Method',
                  roles: [field],
                  accessible: true,
                },
              ]
            : [],
      judge: async (request) => {
        calls++;
        return chooseFirst(request);
      },
    });
    expect(response).toBeUndefined();
    expect(calls).toBe(1);
  });

  it('preserves exact parent associations in a supplied domain', async () => {
    const response = await chooseActivityRequest({
      descriptor,
      choices: [
        {
          entityId: 'person-handle',
          kind: 'entity',
          label: 'Person',
          roles: ['recipient'],
          accessible: true,
        },
        {
          definitionId: 'method-a',
          kind: 'definition',
          label: 'Method A',
          roles: ['method'],
          accessible: true,
        },
        {
          value: 'result',
          kind: 'choice',
          label: 'Only method B supplies this result',
          roles: ['output'],
          accessible: true,
          requires: { method: 'method-b' },
        },
      ],
      simTime: 100,
      namedDeadlines: [],
      state: {},
      judge: async (request) => chooseFirst(request),
    });
    expect(response).toBeUndefined();
  });

  it('distinguishes a family literal named mode from its declared work handling', async () => {
    const response = await chooseActivityRequest({
      descriptor: {
        id: 'fixture:mode-meanings',
        label: 'Mode meanings',
        description: 'Independent family setting and work handling.',
        submitLabel: 'Choose',
        fields: {
          mode: {
            type: 'choice',
            label: 'Approach',
            required: true,
            choices: [{ value: 'careful', label: 'Careful approach' }],
          },
          handling: { type: 'mode', label: 'Current work', required: true },
        },
      },
      choices: [],
      simTime: 100,
      namedDeadlines: [],
      state: {},
      judge: async (request) => chooseFirst(request),
    });
    expect(response?.operations[0]?.act).toMatchObject({
      kind: 'invoke',
      mode: 'enqueue',
      invocation: { parameters: { mode: 'careful', handling: 'enqueue' } },
    });
  });
});
