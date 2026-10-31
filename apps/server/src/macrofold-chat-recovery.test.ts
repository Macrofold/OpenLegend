import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '@open-legend/ai';
import { testRepository, readConfig } from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { MacrofoldBackend } from './macrofold.js';
import { IntelligenceLog } from './intelligence-log.js';
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
          MACROFOLD_API_KEY: 'backend-fixture',
          MACROFOLD_MODEL_API_KEY: 'model-fixture',
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
      const paths: string[] = [];
      const cancellation = new AbortController();
      const log = new IntelligenceLog(store);
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, init: RequestInit) => {
          const path = new URL(url).pathname;
          paths.push(path);
          expect(new Headers(init.headers).get('authorization')).toBe(
            deployment && path !== '/v1/billing/usage'
              ? 'Bearer model-fixture'
              : 'Bearer backend-fixture',
          );
          if (path === '/v1/runs/chat-fixture-run/events' || path === '/v1/billing/usage') {
            expect(init.method).toBe('GET');
            return Response.json({
              data: [{ fixture: path === '/v1/billing/usage' ? 'billing' : 'events' }],
              next_cursor: null,
            });
          }
          if (path === '/v1/runs/chat-cancel-run/cancel') {
            expect(init.method).toBe('POST');
            return Response.json({ id: 'chat-cancel-run', status: 'cancelled' });
          }
          if (path === '/v1/runs/chat-cancel-run') {
            cancellation.abort();
            throw new DOMException('Fixture caller cancelled.', 'AbortError');
          }
          expect(path).toBe('/v1/inferences');
          expect(init.method).toBe('POST');
          bodies.push(JSON.parse(String(init.body)));
          if (bodies.length === 2)
            return Response.json(
              {
                run_id: 'chat-cancel-run',
                kind: 'inference',
                status: 'running',
                urls: {
                  status: '/v1/runs/chat-cancel-run',
                  result: '/v1/runs/chat-cancel-run/result',
                },
              },
              { status: 202 },
            );
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
                chatTemplateKwargs: { enable_thinking: false },
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
        const first = await log.run(
          'Native chat fixture',
          request,
          () => new MacrofoldBackend(service, log).generate(request),
          { id: request.requestId },
        );
        await log.close();
        expect(first.outcome, JSON.stringify(first)).toBe('value');
        expect(first).toMatchObject({
          outcome: 'value',
          value: { text: 'Hello.' },
        });
        expect(bodies[0]).toMatchObject({
          limits: { timeout_seconds: 30, max_output_tokens: 128 },
          input: { max_tokens: 128 },
        });
        if (deployment) {
          expect(bodies[0]).toMatchObject({
            limits: { max_cost_micro_usd: '0' },
            input: { chat_template_kwargs: { enable_thinking: false } },
          });
        } else
          expect(
            (bodies[0]!.input as Record<string, unknown>).chat_template_kwargs,
          ).toBeUndefined();
        expect(await new MacrofoldBackend(service).inspectCall(request.requestId)).toMatchObject({
          runs: [
            {
              runId: 'chat-fixture-run',
              events: { data: [{ fixture: 'events' }] },
              billing: { data: [{ fixture: 'billing' }] },
            },
          ],
        });
        if (deployment) {
          service.config.macrofoldKey = '';
          expect(await new MacrofoldBackend(service).inspectCall(request.requestId)).toMatchObject({
            runs: [
              {
                runId: 'chat-fixture-run',
                events: { data: [{ fixture: 'events' }] },
                billing: { unavailable: expect.stringContaining('not configured') },
              },
            ],
          });
          expect(first.receipt.estimatedCostUsd).toBe(0);
          service.config.macrofoldKey = 'backend-fixture';
        }
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
        const cancelled = await new MacrofoldBackend(service).generate({
          ...request,
          requestId: 'cancel-credential-fixture',
          context: 'Cancel this request.',
          signal: cancellation.signal,
        });
        expect(cancelled.outcome).toBe('cancelled');
        expect(cancelled.receipt).toMatchObject({
          providerRequestId: 'chat-cancel-run',
          completionUncertain: true,
        });
        expect(paths.filter((path) => path === '/v1/runs/chat-cancel-run/cancel')).toHaveLength(1);
        expect(bodies).toHaveLength(2);
      } finally {
        clock.mockRestore();
        await log.close();
        await store.close();
      }
    },
  );
});
