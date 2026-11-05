import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { createNetworkOwner } from '@open-legend/network';
import {
  createAiClient,
  createEmbeddingClient,
  EMBEDDING_LIMITS,
  createMacrofoldDecisionClient,
  createMacrofoldGenerationClient,
  estimateCostUsd,
  captureMacrofoldDeploymentTarget,
  defaultMacrofoldCatalogOutputMode,
  MacrofoldTransport,
  macrofoldObject,
  captureMacrofoldInferenceReceipt,
  type TokenPrices,
} from '@open-legend/ai';
import { digest } from './content-digest.js';
import { readGenerationConfig } from './generation-config.js';
import { PostgresDatabase } from './postgres.js';
import { SharedExecution, type ExecutionLane } from './shared-execution.js';
import { createSharedExecutionServer } from './shared-execution-http.js';
const rates = z
  .object({
    inputUsdPerMillion: z.number().nonnegative(),
    outputUsdPerMillion: z.number().nonnegative(),
    cachedInputUsdPerMillion: z.number().nonnegative().optional(),
    cacheWriteInputUsdPerMillion: z.number().nonnegative().optional(),
  })
  .strict();
const laneSchema = z
  .object({
    id: z.string().min(1).max(96),
    kind: z.enum(['judge', 'generate', 'embed']),
    provider: z.enum(['jev', 'openai', 'macrofold']),
    model: z.string().min(1).max(256),
    reserveUsd: z.number().positive(),
    concurrency: z.number().int().min(1).max(128),
    requestsPerMinute: z.number().int().min(1).max(10000),
    prices: rates.optional(),
    timeoutMs: z.number().int().min(1000).max(300000).default(120000),
    maxOutputTokens: z.number().int().min(1).max(16384).default(8192),
    target: z
      .object({
        workspaceId: z.uuid(),
        modelBinding: z
          .object({ deployment_id: z.uuid(), deployment_revision_id: z.uuid().optional() })
          .strict(),
        chatTemplateKwargs: z.object({ enable_thinking: z.boolean() }).strict().optional(),
      })
      .strict()
      .optional(),
    outputMode: z.enum(['json_schema', 'json_object', 'prompted_json']).optional(),
    billingMode: z.enum(['managed', 'byok']).optional(),
    providerConnectionId: z.string().optional(),
    dimensions: z.number().int().min(64).max(3072).default(512),
  })
  .strict()
  .transform((lane) => ({
    ...lane,
    outputMode:
      lane.outputMode ??
      (lane.provider === 'macrofold' && lane.kind === 'generate' && !lane.target
        ? defaultMacrofoldCatalogOutputMode(lane.model)
        : 'json_schema'),
  }));
const schema = z
  .object({
    databaseUrl: z.string().url(),
    adminToken: z.string().min(32),
    host: z.string().default('127.0.0.1'),
    port: z.number().int().min(1024).max(65535).default(3231),
    lanes: z.array(laneSchema).min(1).max(32),
  })
  .strict();
const path = process.argv[2];
if (!path) throw new Error('Provide the private shared-execution service configuration.');
const config = schema.parse(JSON.parse(await readFile(path, 'utf8')));
if (config.databaseUrl === process.env['OPEN_LEGEND_DATABASE_URL'])
  throw new Error('Paid service requires a database separate from the game/Lab.');
const upstream = readGenerationConfig();
const network = createNetworkOwner({ role: 'shared-paid-providers', capacity: 128 });
const lanes: ExecutionLane[] = config.lanes.map((l) => {
  if (
    (l.kind === 'judge' && l.provider === 'openai') ||
    (l.kind === 'generate' && l.provider === 'jev') ||
    (l.kind === 'embed' && l.provider !== 'openai')
  )
    throw new Error('Lane kind/provider combination has no supported adapter.');
  const target = l.target ? captureMacrofoldDeploymentTarget(l.target) : undefined;
  if (target && l.provider !== 'macrofold')
    throw new Error('Pinned deployment targets require Macrofold.');
  const credential =
    l.provider === 'macrofold'
      ? target
        ? upstream.macrofoldModelKey
        : upstream.macrofoldKey
      : l.provider === 'jev'
        ? (process.env['TYPESAFE_API_KEY'] ?? process.env['JEV_API_KEY'] ?? '')
        : l.kind === 'embed'
          ? (process.env['OPENAI_EMBEDDING_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '')
          : (process.env['OPENAI_API_KEY'] ?? '');
  if (!credential) throw new Error(`Configured ${l.id} lane has no service-side credential.`);
  const common = {
    network,
    timeoutMs: l.timeoutMs,
    maxOutputTokens: l.maxOutputTokens,
    maxRequestBytes: 500000,
    maxResponseBytes: 1_048_576,
  };
  if (l.provider !== 'macrofold') {
    if (!l.prices) throw new Error('Direct paid lanes require explicit prices.');
    const maximum = estimateCostUsd(
      {
        inputTokens: l.kind === 'embed' ? EMBEDDING_LIMITS.batchBytes : 500000,
        outputTokens: l.kind === 'embed' ? 0 : l.maxOutputTokens,
      },
      {
        ...l.prices,
        inputUsdPerMillion: Math.max(
          l.prices.inputUsdPerMillion,
          l.prices.cachedInputUsdPerMillion ?? 0,
          l.prices.cacheWriteInputUsdPerMillion ?? 0,
        ),
      } as TokenPrices,
    );
    if (maximum === undefined || l.reserveUsd < maximum)
      throw new Error('Lane reserve does not cover its supported request bound.');
  }
  const client = createAiClient({
    ...common,
    ...(l.provider === 'jev'
      ? {
          jev: {
            apiKey: process.env['TYPESAFE_API_KEY'] ?? process.env['JEV_API_KEY'] ?? '',
            model: l.model,
            prices: l.prices,
          },
        }
      : {}),
    ...(l.provider === 'openai'
      ? {
          openai: { apiKey: process.env['OPENAI_API_KEY'] ?? '', model: l.model, prices: l.prices },
        }
      : {}),
  });
  const macro = {
    baseUrl: upstream.macrofoldUrl,
    apiKey: credential,
    maxCostUsd: l.reserveUsd,
    network,
    timeoutMs: l.timeoutMs,
    billingMode: l.billingMode ?? upstream.macrofoldBillingMode,
    providerConnectionId: l.providerConnectionId ?? upstream.macrofoldProviderConnectionId,
  };
  const base = {
    baseUrl: macro.baseUrl,
    apiKey: macro.apiKey,
    maxCostUsd: macro.maxCostUsd,
    timeoutMs: macro.timeoutMs,
    network,
  };
  const decision =
    l.provider === 'macrofold' && l.kind === 'judge'
      ? createMacrofoldDecisionClient(
          target
            ? { ...base, macrofoldDeployment: target }
            : {
                ...macro,
                model: z
                  .enum(['typesafe/jev-1.13', 'microsoft/microsoft-decision-1'])
                  .parse(l.model),
              },
        )
      : undefined;
  const generation =
    l.provider === 'macrofold' && l.kind === 'generate'
      ? createMacrofoldGenerationClient(
          target
            ? { ...base, macrofoldDeployment: target, macrofoldOutputMode: l.outputMode }
            : { ...macro, model: l.model, macrofoldOutputMode: l.outputMode },
        )
      : undefined;
  const embedding =
    l.kind === 'embed' && l.provider === 'openai'
      ? createEmbeddingClient({
          apiKey: process.env['OPENAI_EMBEDDING_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '',
          model: l.model,
          dimensions: l.dimensions,
          network,
          modelPrices: l.prices ? [{ model: l.model, prices: l.prices }] : [],
          timeoutMs: l.timeoutMs,
        })
      : undefined;
  if (l.kind === 'embed' && !embedding)
    throw new Error('Embedding requires the existing OpenAI embedding adapter.');
  const observation =
    l.provider === 'macrofold'
      ? new MacrofoldTransport(macro.baseUrl, macro.apiKey, undefined, network, false)
      : undefined;
  return {
    ...l,
    binding: digest({
      ...l,
      ...(l.provider === 'macrofold'
        ? {
            baseUrl: macro.baseUrl,
            billingMode: macro.billingMode,
            providerConnectionId: macro.providerConnectionId,
          }
        : {}),
    }),
    ...(observation
      ? {
          observe: async (receipt) => {
            if (!receipt.providerRequestId) return receipt;
            const path = `/v1/runs/${encodeURIComponent(receipt.providerRequestId)}`;
            return observation.run({ timeoutMs: 10000 }, async () => {
              const status = macrofoldObject(await observation.request(path));
              if (
                status['id'] !== receipt.providerRequestId ||
                !['succeeded', 'failed', 'cancelled', 'timed_out'].includes(
                  String(status['status']),
                )
              )
                return receipt;
              if (status['kind'] !== 'inference')
                throw new Error('Receipt does not identify immediate inference.');
              const result = macrofoldObject(await observation.request(`${path}/result`));
              const current = { ...receipt };
              captureMacrofoldInferenceReceipt(receipt.providerRequestId!, status, result, current);
              return current;
            });
          },
        }
      : {}),
    execute: async (request, signal, onAccepted) => {
      if (l.kind === 'judge' && 'questions' in request)
        return decision
          ? decision.judge({ ...request, signal, onAccepted, maxOutputTokens: l.maxOutputTokens })
          : client.judge({ ...request, signal });
      if (l.kind === 'generate' && 'schema' in request) {
        const selected = {
          ...request,
          signal,
          maxOutputTokens: request.maxOutputTokens ?? l.maxOutputTokens,
        };
        if (target) {
          // The admitted lane owns its immutable native binding. These API-model
          // selectors are not native chat options; the ordinary adapter keeps them.
          delete selected.model;
          delete selected.reasoningEffort;
        }
        return generation
          ? generation.generate({ ...selected, onAccepted })
          : client.generate(selected);
      }
      if (l.kind === 'embed' && 'texts' in request && embedding)
        return embedding.embed({ ...request, signal });
      throw new Error('Request kind differs from configured lane.');
    },
  };
});
const db = new PostgresDatabase(config.databaseUrl);
const execution = new SharedExecution(db, config.adminToken, lanes);
await execution.ready;
const server = createSharedExecutionServer(execution);
await new Promise<void>((resolve, reject) => {
  server.once('error', reject);
  server.listen(config.port, config.host, resolve);
});
console.log(
  JSON.stringify({
    event: 'shared-execution-ready',
    host: config.host,
    port: config.port,
    lanes: lanes.map(({ id, kind, model }) => ({ id, kind, model })),
  }),
);
for (const name of ['SIGINT', 'SIGTERM'] as const)
  process.once(name, () => {
    execution.stop();
    server.close(() => void db.close());
    setTimeout(() => process.exit(1), 15000).unref();
  });
