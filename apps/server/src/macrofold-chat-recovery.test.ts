import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '@open-legend/ai';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { MacrofoldBackend } from './macrofold.js';
import { WorldService } from './world-service.js';

afterEach(() => vi.unstubAllGlobals());

describe('chat inference recovery through the PostgreSQL journal', () => {
  it.each([false, true])(
    'reuses the accepted chat request as its deadline approaches (deployment=%s)',
    async (deployment) => {
      const store = await testRepository();
      const service = new WorldService(
        store,
        readConfig({
          AI_BUDGET_USD: '1',
          MACROFOLD_API_KEY: 'fixture',
          MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
        }),
      );
      await enterLocalWorld(service);
      let wallNow = Date.now();
      const clock = vi.spyOn(Date, 'now').mockImplementation(() => wallNow);
      const workspaceId = '11111111-1111-4111-8111-111111111111';
      const deploymentId = '22222222-2222-4222-8222-222222222222';
      const revisionId = '33333333-3333-4333-8333-333333333333';
      const bodies: Record<string, unknown>[] = [];
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          expect(new URL(url).pathname).toBe('/v1/inferences');
          expect(init.method).toBe('POST');
          expect(new Headers(init.headers).get('authorization')).toBe('Bearer fixture');
          bodies.push(JSON.parse(String(init.body)));
          return Response.json({
            run_id: 'chat-fixture-run',
            kind: 'inference',
            status: 'succeeded',
            result: {
              run_id: 'chat-fixture-run',
              final: true,
              execution_outcome: 'success',
              inference: {
                outcome: 'value',
                provider_outcome: 'responded',
                ...(deployment
                  ? {
                      deployment: {
                        deployment_id: deploymentId,
                        deployment_revision_id: revisionId,
                      },
                      cost_attribution: {
                        basis: 'deployment',
                        deployment_id: deploymentId,
                        infrastructure_cost_included: false,
                      },
                    }
                  : {}),
                billing: {
                  billing_mode: 'byok',
                  charged_micro_usd: '0',
                  budget_cost_micro_usd: '0',
                  reported_micro_usd: deployment ? '0' : '5',
                  provisional: false,
                },
                usage: { completeness: 'complete', input_tokens: '10', output_tokens: '2' },
                value: {
                  choices: [{ finish_reason: 'stop', message: { content: '{"text":"Hello."}' } }],
                },
              },
            },
          });
        }),
      );
      const request: GenerateRequest = {
        requestId: 'chat-recovery-fixture',
        task: 'npc-response',
        execution: 'fast',
        instructions: 'Return a short greeting.',
        context: { greeting: 'Hello' },
        schema: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text'],
          additionalProperties: false,
        },
        maxOutputTokens: 128,
        deadlineMs: wallNow + 30_000,
        ...(deployment
          ? {
              macrofoldDeployment: {
                workspaceId,
                modelBinding: {
                  deployment_id: deploymentId,
                  deployment_revision_id: revisionId,
                },
              },
              macrofoldOutputMode: 'json_object' as const,
            }
          : {}),
      };
      try {
        const first = await new MacrofoldBackend(service).generate(request);
        expect(first.outcome, JSON.stringify(first)).toBe('value');
        expect(first).toMatchObject({
          outcome: 'value',
          value: { text: 'Hello.' },
        });
        expect(bodies[0]).toMatchObject({ limits: { timeout_seconds: 30 } });
        wallNow += 1200;
        expect(await new MacrofoldBackend(service).generate(request)).toMatchObject({
          outcome: 'value',
          value: { text: 'Hello.' },
        });
        expect(
          await new MacrofoldBackend(service).generate({
            ...request,
            context: { greeting: 'Changed input' },
          }),
        ).toMatchObject({ outcome: 'failed', receipt: { dispatched: false } });
        expect(bodies).toHaveLength(1);
      } finally {
        clock.mockRestore();
        await store.close();
      }
    },
  );
});
