import { z } from 'zod';
import { accountBindingSchema } from './authority.js';
import { readMcpConfig } from './mcp-config.js';
import { DEFAULT_MACROFOLD_MODEL } from './macrofold-model.js';
import { resolve } from 'node:path';
import type { ModelTokenPrices, TokenPrices } from '@open-legend/ai';

const modelIdentity = z.string().regex(/^[\w./:-]{1,128}$/);
const tokenRate = z.number().finite().nonnegative();
const modelPriceSchema = z
  .object({
    model: modelIdentity,
    prices: z
      .object({
        inputUsdPerMillion: tokenRate,
        outputUsdPerMillion: tokenRate,
        cachedInputUsdPerMillion: tokenRate.optional(),
        cacheWriteInputUsdPerMillion: tokenRate.optional(),
      })
      .strict(),
    reportedAliases: z.array(modelIdentity).optional(),
  })
  .strict();

function modelPricesSetting(
  raw: string | undefined,
  model: string,
  prices: TokenPrices,
): readonly ModelTokenPrices[] {
  modelIdentity.parse(model);
  const catalogue: ModelTokenPrices[] = [{ model, prices }];
  const owners = new Set([model]);
  const declared = new Set<string>();
  let entries: z.infer<typeof modelPriceSchema>[];
  try {
    entries = raw === undefined ? [] : z.array(modelPriceSchema).parse(JSON.parse(raw));
  } catch {
    throw new Error('OPENAI_MODEL_PRICES_JSON must be an array of valid model price records.');
  }
  for (const entry of entries) {
    if (declared.has(entry.model) || (entry.model !== model && owners.has(entry.model)))
      throw new Error('OPENAI_MODEL_PRICES_JSON has duplicate model or alias ownership.');
    declared.add(entry.model);
    if (entry.model === model) {
      const rateKeys = [
        'inputUsdPerMillion',
        'outputUsdPerMillion',
        'cachedInputUsdPerMillion',
        'cacheWriteInputUsdPerMillion',
      ] as const;
      if (rateKeys.some((key) => prices[key] !== entry.prices[key]))
        throw new Error('The default model catalogue prices conflict with its LLM price settings.');
      // Default fields remain the sole price owner; an identical entry can declare aliases.
      catalogue[0] = { model, prices, reportedAliases: entry.reportedAliases };
    } else {
      owners.add(entry.model);
      catalogue.push(entry);
    }
    for (const alias of entry.reportedAliases ?? []) {
      if (owners.has(alias))
        throw new Error('OPENAI_MODEL_PRICES_JSON has duplicate model or alias ownership.');
      owners.add(alias);
    }
  }
  return Object.freeze(
    catalogue.map((entry) =>
      Object.freeze({
        model: entry.model,
        prices: Object.freeze({ ...entry.prices }),
        reportedAliases: Object.freeze([...(entry.reportedAliases ?? [])]),
      }),
    ),
  );
}

function numberSetting(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be a number between ${min} and ${max}.`);
  }
  return value;
}

/** Trusted operator configuration. Secrets and arbitrary endpoints never come from the browser. */
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env['OPEN_LEGEND_DATABASE_URL']?.trim() ?? '';
  try {
    const url = databaseUrl ? new URL(databaseUrl) : undefined;
    if (
      !url ||
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    )
      throw new Error();
  } catch {
    throw new Error('OPEN_LEGEND_DATABASE_URL is required and must be a PostgreSQL URL.');
  }
  const macrofoldBillingMode = env['MACROFOLD_BILLING_MODE'] ?? 'byok';
  if (macrofoldBillingMode !== 'byok' && macrofoldBillingMode !== 'managed')
    throw new Error('MACROFOLD_BILLING_MODE must be byok or managed.');
  if (
    env['OPENAI_MODEL'] &&
    env['OPENAI_MODEL'] !== 'gpt-5.6-luna' &&
    [
      'LLM_INPUT_USD_PER_MILLION',
      'LLM_OUTPUT_USD_PER_MILLION',
      'LLM_CACHED_INPUT_USD_PER_MILLION',
      'LLM_CACHE_WRITE_USD_PER_MILLION',
    ].some((key) => env[key] === undefined)
  ) {
    throw new Error(
      'A custom OPENAI_MODEL requires explicit input, output, cached-input and cache-write price settings.',
    );
  }
  if (
    env['JEV_MODEL'] &&
    env['JEV_MODEL'] !== 'jev-1.13.0' &&
    env['JEV_INPUT_USD_PER_MILLION'] === undefined
  )
    throw new Error('A custom JEV_MODEL requires an explicit JEV_INPUT_USD_PER_MILLION.');
  const llmModel = env['OPENAI_MODEL'] ?? 'gpt-5.6-luna';
  const llmPrices = Object.freeze({
    inputUsdPerMillion: numberSetting(env, 'LLM_INPUT_USD_PER_MILLION', 0.2, 0, 1000),
    outputUsdPerMillion: numberSetting(env, 'LLM_OUTPUT_USD_PER_MILLION', 1.2, 0, 1000),
    cachedInputUsdPerMillion: numberSetting(env, 'LLM_CACHED_INPUT_USD_PER_MILLION', 0.02, 0, 1000),
    cacheWriteInputUsdPerMillion: numberSetting(
      env,
      'LLM_CACHE_WRITE_USD_PER_MILLION',
      0.25,
      0,
      1000,
    ),
  });
  const llmModelPrices = modelPricesSetting(env['OPENAI_MODEL_PRICES_JSON'], llmModel, llmPrices);
  const worldPreset = env['OPEN_LEGEND_WORLD_PRESET'] ?? 'wilderness';
  if (!['wilderness', 'reservoir-demo', 'touch-demo'].includes(worldPreset))
    throw new Error('Unsupported OPEN_LEGEND_WORLD_PRESET.');
  const mode = z.enum(['local', 'oidc']).parse(env['OPEN_LEGEND_AUTH_MODE'] ?? 'local');
  const host = env['OPEN_LEGEND_HOST'] ?? '127.0.0.1';
  const loopback = (name: string) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(name);
  if (mode === 'local' && !loopback(host))
    throw new Error('Local authentication requires a loopback bind address.');
  const origin = env['OPEN_LEGEND_PUBLIC_ORIGIN'] ?? '';
  // Normalized so a bare-host issuer matches with or without its trailing slash (Auth0 signs
  // tokens with `https://<tenant>/`). Issuers with a path, such as Keycloak realms, are unchanged.
  const issuerUrl = (value: string) => (URL.canParse(value) ? new URL(value).href : value);
  const issuer = issuerUrl(env['OPEN_LEGEND_OIDC_ISSUER'] ?? '');
  const clientId = env['OPEN_LEGEND_OIDC_CLIENT_ID'] ?? '';
  const insecureLoopback = env['OPEN_LEGEND_OIDC_LOOPBACK_HTTP'] === 'true';
  if (mode === 'oidc') {
    const publicUrl = new URL(origin),
      provider = new URL(issuer);
    if (
      publicUrl.origin !== origin ||
      publicUrl.username ||
      publicUrl.password ||
      provider.username ||
      provider.password ||
      provider.hash ||
      provider.search ||
      !clientId
    )
      throw new Error('OIDC requires an exact public origin, issuer and client ID.');
    // Each address is judged separately: HTTPS always, plain HTTP only on this machine with the
    // explicit development opt-in. A local game can therefore use a hosted HTTPS provider.
    // docs/projects/auth0-sign-in.md#scope-idp01
    const allowed = (url: URL) =>
      url.protocol === 'https:' ||
      (insecureLoopback && url.protocol === 'http:' && loopback(url.hostname));
    if (
      !allowed(publicUrl) ||
      !allowed(provider) ||
      (publicUrl.protocol === 'http:' && !loopback(host))
    )
      throw new Error('OIDC requires HTTPS; explicit development HTTP is loopback-only.');
  }
  const bindings = z
    .array(accountBindingSchema)
    .max(256)
    .parse(JSON.parse(env['OPEN_LEGEND_ACCOUNT_BINDINGS'] ?? '[]'))
    .map((binding) => ({ ...binding, issuer: issuerUrl(binding.issuer) }));
  if (mode === 'oidc' && bindings.some((binding) => binding.issuer !== issuer))
    throw new Error('Account bindings must use the configured issuer.');
  const players = z
    .number()
    .int()
    .parse(numberSetting(env, 'OPEN_LEGEND_PLAYER_CAPACITY', 100, 1, 10000));
  return {
    capacity: {
      players,
      connections: players * 3,
      presence: players * 6,
      sessions: Math.max(4096, players * 16),
      requests: players * 4,
    },
    authentication: {
      mode,
      origin,
      issuer,
      clientId,
      clientSecret: env['OPEN_LEGEND_OIDC_CLIENT_SECRET'] ?? '',
      insecureLoopback,
      bindings,
      sessionMs: numberSetting(env, 'OPEN_LEGEND_SESSION_HOURS', 8, 0.1, 24) * 3_600_000,
    },
    worldPreset,
    databaseUrl,
    mcpRead: readMcpConfig(env),
    embeddingKey:
      env['AI_JEV_ONLY'] === 'true'
        ? ''
        : (env['OPENAI_EMBEDDING_API_KEY'] ?? env['OPENAI_API_KEY'] ?? ''),
    embeddingModel: env['EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
    embeddingDimensions: numberSetting(env, 'EMBEDDING_DIMENSIONS', 512, 64, 3072),
    embeddingReserveUsd: numberSetting(env, 'EMBEDDING_CALL_RESERVE_USD', 0.01, 0.000001, 1),
    miniModel: env['COGNITION_MINI_MODEL'] ?? 'gpt-5-mini',
    complexModel: env['COGNITION_COMPLEX_MODEL'] ?? 'gpt-5',
    summaryModel: env['COGNITION_SUMMARY_MODEL'] ?? 'gpt-5-nano',
    macrofoldMiniModel: env['MACROFOLD_MINI_MODEL'] ?? 'openai/gpt-5-mini',
    macrofoldComplexModel: env['MACROFOLD_COMPLEX_MODEL'] ?? 'openai/gpt-5',
    macrofoldSummaryModel: env['MACROFOLD_SUMMARY_MODEL'] ?? 'openai/gpt-5-nano',
    host,
    godMode: env['OPEN_LEGEND_GOD_MODE'] === 'true',
    port: numberSetting(env, 'PORT', 3210, 1024, 65535),
    dataDirectory: resolve(env['OPEN_LEGEND_DATA_DIR'] ?? '.data'),
    seed: numberSetting(env, 'WORLD_SEED', 1086, 1, 0x7fffffff),
    baseRatio: 60,
    exitGraceMs: numberSetting(env, 'OPEN_LEGEND_EXIT_GRACE_SECONDS', 15, 1, 60) * 1000,
    budgetUsd: numberSetting(env, 'AI_BUDGET_USD', 50, 0, 100),
    jevOnly: env['AI_JEV_ONLY'] === 'true',
    conversationInactivitySeconds: numberSetting(
      env,
      'CONVERSATION_INACTIVITY_SECONDS',
      1800,
      60,
      86400,
    ),
    conversationDisconnectMs:
      numberSetting(env, 'CONVERSATION_DISCONNECT_SECONDS', 60, 5, 600) * 1000,
    narrationBatchMs: numberSetting(env, 'NARRATION_BATCH_MS', 750, 0, 10000),
    // New workshop-root default; unified session/art funding remains a separate integration.
    // docs/world-agent-runtime.md#8-shared-5-allowance-and-external-runs
    inventionWorkshopUsd: numberSetting(env, 'INVENTION_WORKSHOP_MAX_USD', 5, 0, 10),
    jevReserveUsd: numberSetting(env, 'JEV_CALL_RESERVE_USD', 0.005, 0.000001, 1),
    llmReserveUsd: numberSetting(env, 'LLM_CALL_RESERVE_USD', 0.08, 0.000001, 10),
    aiTimeoutMs: numberSetting(env, 'AI_TIMEOUT_SECONDS', 35, 5, 120) * 1000,
    macrofoldUrl: env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210',
    macrofoldKey: env['MACROFOLD_API_KEY'] ?? '',
    macrofoldBillingMode,
    // Connection IDs select credentials already stored in Macrofold, not raw keys.
    macrofoldProviderConnectionId: env['MACROFOLD_PROVIDER_CONNECTION_ID'] ?? '',
    macrofoldJevModel: env['MACROFOLD_JEV_MODEL'] ?? 'typesafe/jev-1.13',
    macrofoldJevConnectionId:
      env['MACROFOLD_JEV_CONNECTION_ID'] || env['MACROFOLD_PROVIDER_CONNECTION_ID'] || '',
    macrofoldModel: env['MACROFOLD_MODEL'] ?? DEFAULT_MACROFOLD_MODEL,
    macrofoldHarness: env['MACROFOLD_HARNESS'] ?? 'opencode',
    macrofoldWorldConnectionId: env['MACROFOLD_WORLD_CONNECTION_ID'] ?? '',
    macrofoldWorldRunUsd: numberSetting(env, 'MACROFOLD_WORLD_RUN_MAX_USD', 1, 0.000001, 5),
    macrofoldWorldTimeoutSeconds: numberSetting(
      env,
      'MACROFOLD_WORLD_TIMEOUT_SECONDS',
      900,
      5,
      1800,
    ),
    macrofoldRunUsd: numberSetting(env, 'MACROFOLD_RUN_MAX_USD', 0.25, 0.000001, 10),
    // Selected by the application/world compute owner; never allocated by an actor lane.
    macrofoldWorkerId: env['MACROFOLD_WORKER_ID']?.trim() ?? '',
    macrofoldTimeoutSeconds: numberSetting(env, 'MACROFOLD_TIMEOUT_SECONDS', 300, 5, 300),
    jevKey: env['TYPESAFE_API_KEY'] ?? env['JEV_API_KEY'] ?? '',
    llmKey: env['OPENAI_API_KEY'] ?? '',
    jevModel: env['JEV_MODEL'] ?? 'jev-1.13.0',
    llmModel,
    jevPrices: {
      inputUsdPerMillion: numberSetting(env, 'JEV_INPUT_USD_PER_MILLION', 0.042, 0, 1000),
      outputUsdPerMillion: 0,
    },
    // Explicit estimates; operators must set rates for a different model. No claim of invoice totals.
    llmPrices,
    llmModelPrices,
  };
}

export type AppConfig = ReturnType<typeof readConfig>;
