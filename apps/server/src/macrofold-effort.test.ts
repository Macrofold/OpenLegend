import { afterAll, afterEach, expect, it, vi } from 'vitest';
import type { GenerateRequest } from '@open-legend/ai';
import { NPC_ID } from '@open-legend/domain';
import {
  testRepository,
  readConfig,
  closeTestDatabases,
} from '../../../tests/fixtures/database.js';
import { enterLocalWorld } from '../../../tests/fixtures/service.js';
import { MacrofoldBackend } from './macrofold.js';
import { WorldService } from './world-service.js';

afterEach(() => vi.unstubAllGlobals());
afterAll(closeTestDatabases);

it('forwards explicit typed effort to direct, full and reflection wire requests while preserving omitted defaults', async () => {
  const store = await testRepository();
  const config = readConfig({
    MACROFOLD_API_KEY: 'fixture',
    MACROFOLD_BASE_URL: 'https://macrofold.fixture.invalid',
    MACROFOLD_WORKER_ID: 'fixture-worker',
    AI_BUDGET_USD: '1',
  });
  const service = new WorldService(store, config);
  await enterLocalWorld(service);
  const bodies: Array<{
    path: string;
    transport: string;
    body: {
      model?: string;
      model_parameters?: unknown;
      input?: unknown;
      prompt?: string;
      limits?: { max_output_tokens?: number; max_cost_micro_usd?: string };
    };
  }> = [];
  const files = new Map<string, string>();
  let runSequence = 0,
    revision = 0;
  const runOutputs = new Map<string, string>();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (raw: string, init: RequestInit = {}) => {
      const url = new URL(raw),
        path = url.pathname,
        method = init.method ?? 'GET';
      if (method === 'POST')
        bodies.push({ path, transport: String(init.body), body: JSON.parse(String(init.body)) });
      if (path === '/v1/models')
        return Response.json({
          data: [...new Set([config.macrofoldModel, config.macrofoldSummaryModel])].map((id) => ({
            id,
            enabled: true,
            harnesses: [config.macrofoldHarness],
            billing_modes: [config.macrofoldBillingMode],
          })),
        });
      if (path === '/v1/workspaces')
        return Response.json({ id: 'fixture-workspace', default_worktree_id: 'fixture-worktree' });
      if (path === '/v1/worktrees/fixture-worktree/files')
        return Response.json({
          revision: `r${revision}`,
          entries: [...files].map(([path, text]) => ({
            path,
            type: 'file',
            size_bytes: Buffer.byteLength(text),
          })),
          next_cursor: null,
        });
      if (path === '/v1/worktrees/fixture-worktree/file') {
        const name = url.searchParams.get('path')!;
        if (method === 'GET')
          return new Response(files.get(name), { headers: { etag: `r${revision}` } });
        if (method === 'PUT') files.set(name, String(init.body));
        else files.delete(name);
        revision++;
        return Response.json({ id: `write-${revision}` });
      }
      if (path.startsWith('/v1/operations/')) return Response.json({ status: 'succeeded' });
      if (path === '/v1/runs') {
        const body = JSON.parse(String(init.body)),
          id = `fixture-run-${++runSequence}`;
        const reflection = body.scheduling_class === 'background';
        runOutputs.set(
          id,
          JSON.stringify(
            reflection
              ? { thoughts: [], goalChanges: [], knowledgeChanges: [], nameChanges: [] }
              : { text: 'Fixture output' },
          ),
        );
        return Response.json({
          run_id: id,
          worker_id: 'fixture-worker',
          worktree_id: 'fixture-worktree',
          session_id: `session-${id}`,
          urls: { status: `/v1/runs/${id}`, result: `/v1/runs/${id}/result` },
        });
      }
      if (path.endsWith('/events')) return Response.json({ data: [], next_cursor: null });
      if (path.startsWith('/v1/runs/')) {
        const id = path.split('/')[3]!;
        return Response.json(
          path.endsWith('/result')
            ? {
                run_id: id,
                final: true,
                execution_outcome: 'success',
                persistence_status: 'verified',
                output_text: runOutputs.get(id),
              }
            : {
                id,
                status: 'succeeded',
                execution_outcome: 'success',
                persistence_status: 'verified',
              },
        );
      }
      if (path === '/v1/billing/usage')
        return Response.json({
          data: [
            {
              run_id: url.searchParams.get('run_id'),
              kind: 'model',
              model_usage: {
                completeness: 'complete',
                provisional: false,
                input_tokens: '10',
                output_tokens: '2',
                reported_micro_usd: '5',
              },
            },
          ],
          next_cursor: null,
        });
      if (path === '/v1/inferences')
        return Response.json({
          run_id: 'direct-fixture',
          kind: 'inference',
          status: 'succeeded',
          result: {
            run_id: 'direct-fixture',
            final: true,
            execution_outcome: 'success',
            inference: {
              outcome: 'value',
              provider_outcome: 'responded',
              billing: {
                billing_mode: 'byok',
                charged_micro_usd: '0',
                budget_cost_micro_usd: '0',
                reported_micro_usd: '5',
                provisional: false,
              },
              usage: { completeness: 'complete', input_tokens: '10', output_tokens: '2' },
              value: {
                choices: [
                  { finish_reason: 'stop', message: { content: '{"text":"Fixture output"}' } },
                ],
              },
            },
          },
        });
      throw new Error(`Unexpected fixture request ${method} ${path}`);
    }),
  );
  const backend = new MacrofoldBackend(service);
  const request: GenerateRequest = {
    requestId: 'unused',
    task: 'fixture-effort',
    instructions: 'Return fixture output.',
    context: { fixture: true },
    schema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
      additionalProperties: false,
    },
    maxOutputTokens: 128,
  };
  try {
    for (const execution of ['fast', 'complex', 'full'] as const) {
      for (const effort of [undefined, 'high'] as const) {
        const result = await backend.generate({
          ...request,
          requestId: `${execution}-${effort ?? 'omitted'}`,
          execution,
          ...(effort ? { reasoningEffort: effort } : {}),
        });
        expect(result.outcome, JSON.stringify(result)).toBe('value');
        const actual = bodies.at(-1)!;
        expect(actual.path).toBe(execution === 'full' ? '/v1/runs' : '/v1/inferences');
        const parameters = execution === 'full' ? actual.body.model_parameters : actual.body.input;
        expect(parameters).toMatchObject({
          reasoning: { effort: effort ?? (execution === 'full' ? 'xhigh' : 'low') },
          provider: { require_parameters: true },
        });
        if (execution !== 'full') expect(actual.body.limits?.max_output_tokens).toBe(128);
        const worker = execution === 'full';
        const inputBytes = Buffer.byteLength(
          worker ? actual.body.prompt! : JSON.stringify(actual.body.input),
        );
        expect(result.receipt.requestAccounting).toEqual({
          instructionsBytes: Buffer.byteLength(request.instructions),
          contextBytes: Buffer.byteLength(JSON.stringify(request.context)),
          schemaBytes: Buffer.byteLength(JSON.stringify(request.schema)),
          toolDefinitionBytes: worker ? null : 0,
          toolResultBytes: worker ? null : 0,
          inputScope: worker ? 'worker-prompt-only' : 'adapter-input',
          encodedInputBytes: inputBytes,
          transportBytes: Buffer.byteLength(actual.transport),
          maxOutputTokens: worker ? null : 128,
          estimatedInputTokens: {
            value: Math.ceil(inputBytes / 3),
            basis: 'captured-input-utf8-divided-by-three',
            model: service.config.macrofoldModel,
            exact: false,
          },
        });
        if (execution === 'fast' && !effort) {
          const admissionCount = bodies.length;
          const replay = await backend.generate({
            ...request,
            requestId: 'fast-omitted',
            execution,
          });
          expect(replay.outcome).toBe('value');
          expect(replay.receipt.requestAccounting).toEqual(result.receipt.requestAccounting);
          expect(bodies).toHaveLength(admissionCount);
        }
      }
    }
    const reflectionSchema = {
      type: 'object',
      properties: {
        thoughts: { type: 'array', items: { type: 'string' } },
        goalChanges: { type: 'array' },
        knowledgeChanges: { type: 'array' },
        nameChanges: { type: 'array' },
      },
      required: ['thoughts', 'goalChanges', 'knowledgeChanges', 'nameChanges'],
      additionalProperties: false,
    };
    for (const effort of [undefined, 'medium'] as const) {
      if (effort) service.config.macrofoldModel = config.macrofoldSummaryModel;
      const result = await backend.reflect(
        {
          ...request,
          requestId: `reflection-${effort ?? 'omitted'}`,
          schema: reflectionSchema,
          actorScope: NPC_ID,
          ...(effort ? { reasoningEffort: effort } : {}),
        },
        [{ path: 'identity.md', text: 'Fixture identity.' }],
      );
      expect(result.outcome, JSON.stringify(result)).toBe('value');
      const actual = bodies.filter((item) => item.path === '/v1/runs').at(-1)!;
      expect(actual.body.model_parameters).toMatchObject({
        reasoning: { effort: effort ?? 'xhigh' },
        provider: { require_parameters: true },
      });
      expect(actual.body.limits?.max_cost_micro_usd).toBeDefined();
      expect(actual.body.model).toBe(service.config.macrofoldModel);
      expect(result.receipt.requestedModel).toBe(service.config.macrofoldModel);
      expect(result.receipt.requestAccounting).toMatchObject({
        inputScope: 'worker-prompt-only',
        encodedInputBytes: Buffer.byteLength(actual.body.prompt!),
        transportBytes: Buffer.byteLength(actual.transport),
        schemaBytes: Buffer.byteLength(JSON.stringify(reflectionSchema)),
        maxOutputTokens: null,
        toolDefinitionBytes: null,
        toolResultBytes: null,
      });
    }
    expect(bodies.filter((item) => item.path === '/v1/runs')).toHaveLength(4);
    expect(bodies.filter((item) => item.path === '/v1/inferences')).toHaveLength(4);
  } finally {
    await store.close();
  }
}, 60_000);
