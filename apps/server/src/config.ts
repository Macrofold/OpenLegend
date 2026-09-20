import { DEFAULT_MACROFOLD_MODEL } from './macrofold-model.js';
import { resolve } from 'node:path';

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
  return {
    databaseUrl: env['OPEN_LEGEND_DATABASE_URL'] ?? '',
    embeddingKey: env['OPENAI_EMBEDDING_API_KEY'] ?? env['OPENAI_API_KEY'] ?? '',
    embeddingModel: env['EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
    embeddingDimensions: numberSetting(env, 'EMBEDDING_DIMENSIONS', 512, 64, 3072),
    embeddingReserveUsd: numberSetting(env, 'EMBEDDING_CALL_RESERVE_USD', 0.01, 0.000001, 1),
    miniModel: env['COGNITION_MINI_MODEL'] ?? 'gpt-5-mini',
    complexModel: env['COGNITION_COMPLEX_MODEL'] ?? 'gpt-5',
    summaryModel: env['COGNITION_SUMMARY_MODEL'] ?? 'gpt-5-nano',
    macrofoldMiniModel: env['MACROFOLD_MINI_MODEL'] ?? 'openai/gpt-5-mini',
    macrofoldComplexModel: env['MACROFOLD_COMPLEX_MODEL'] ?? 'openai/gpt-5',
    macrofoldSummaryModel: env['MACROFOLD_SUMMARY_MODEL'] ?? 'openai/gpt-5-nano',
    host: '127.0.0.1',
    godMode: env['OPEN_LEGEND_GOD_MODE'] === 'true',
    port: numberSetting(env, 'PORT', 3210, 1024, 65535),
    databasePath: resolve(env['OPEN_LEGEND_DATA_DIR'] ?? '.data', 'world.sqlite'),
    seed: numberSetting(env, 'WORLD_SEED', 1086, 1, 0x7fffffff),
    baseRatio: 60,
    budgetUsd: numberSetting(env, 'AI_BUDGET_USD', 0, 0, 100),
    jevReserveUsd: numberSetting(env, 'JEV_CALL_RESERVE_USD', 0.005, 0.000001, 1),
    llmReserveUsd: numberSetting(env, 'LLM_CALL_RESERVE_USD', 0.08, 0.000001, 10),
    thoughtIntervalMs: numberSetting(env, 'NPC_THOUGHT_INTERVAL_SECONDS', 45, 15, 3600) * 1000,
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
    macrofoldRunUsd: numberSetting(env, 'MACROFOLD_RUN_MAX_USD', 0.25, 0.000001, 10),
    macrofoldComputeUsd: numberSetting(env, 'MACROFOLD_COMPUTE_MAX_USD', 0, 0, 100),
    macrofoldTimeoutSeconds: numberSetting(env, 'MACROFOLD_TIMEOUT_SECONDS', 300, 5, 300),
    jevKey: env['TYPESAFE_API_KEY'] ?? env['JEV_API_KEY'] ?? '',
    llmKey: env['OPENAI_API_KEY'] ?? '',
    jevModel: env['JEV_MODEL'] ?? 'jev-1.13.0',
    llmModel: env['OPENAI_MODEL'] ?? 'gpt-5.6-luna',
    jevPrices: {
      inputUsdPerMillion: numberSetting(env, 'JEV_INPUT_USD_PER_MILLION', 0.042, 0, 1000),
      outputUsdPerMillion: 0,
    },
    // Explicit estimates; operators must set rates for a different model. No claim of invoice totals.
    llmPrices: {
      inputUsdPerMillion: numberSetting(env, 'LLM_INPUT_USD_PER_MILLION', 0.2, 0, 1000),
      outputUsdPerMillion: numberSetting(env, 'LLM_OUTPUT_USD_PER_MILLION', 1.2, 0, 1000),
      cachedInputUsdPerMillion: numberSetting(
        env,
        'LLM_CACHED_INPUT_USD_PER_MILLION',
        0.02,
        0,
        1000,
      ),
      cacheWriteInputUsdPerMillion: numberSetting(
        env,
        'LLM_CACHE_WRITE_USD_PER_MILLION',
        0.25,
        0,
        1000,
      ),
    },
  };
}

export type AppConfig = ReturnType<typeof readConfig>;
