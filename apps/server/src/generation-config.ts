import { z } from 'zod';
import {
  captureModelPrices,
  captureMacrofoldDeploymentTarget,
  modelTokenPrices,
  type MacrofoldBillingMode,
  type ModelTokenPrices,
  type TokenPrices,
  type GenerateRequest,
  type MacrofoldDeploymentTarget,
} from '@open-legend/ai';
import { DECISION_MODEL } from './decision-state.js';
import { LEVEL_LIMITS } from './cognition-contracts.js';
import { DEFAULT_MACROFOLD_MODEL } from './macrofold-model.js';

export const NPC_GENERATION_PURPOSES = ['npc_response_fast', 'npc_response_complex'] as const;
export type NpcGenerationPurpose = (typeof NPC_GENERATION_PURPOSES)[number];

const configuredTargetSchema = z
  .object({
    model_binding: z
      .object({
        deployment_id: z.uuid(),
        deployment_revision_id: z.uuid().optional(),
      })
      .strict(),
    max_output_tokens: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .strict();
const captureConfiguredTarget = <T extends z.infer<typeof configuredTargetSchema>>(target: T) =>
  Object.freeze({ ...target, model_binding: Object.freeze(target.model_binding) });
const configuredJudgmentTargetSchema = configuredTargetSchema.transform(captureConfiguredTarget);
const configuredNpcTargetSchema = configuredTargetSchema
  .extend({
    chat_template_kwargs: z.object({ enable_thinking: z.boolean() }).strict().readonly().optional(),
    structured_output: z
      .enum(['auto', 'json_schema', 'json_object', 'prompted_json'])
      .default('auto'),
  })
  .strict()
  .transform(captureConfiguredTarget);

const modelTargetsConfigSchema = z
  .object({
    schema_version: z.literal(1),
    workspace_id: z.uuid(),
    purposes: z
      .object({
        judgment: configuredJudgmentTargetSchema.optional(),
        npc_response_fast: configuredNpcTargetSchema.optional(),
        npc_response_complex: configuredNpcTargetSchema.optional(),
      })
      .strict()
      .refine(
        (purposes) => Object.values(purposes).some((purpose) => purpose !== undefined),
        'Configure judgment, npc_response_fast, or npc_response_complex.',
      )
      .transform((purposes) => Object.freeze(purposes)),
  })
  .strict()
  .transform((config) => Object.freeze(config));

/** Trusted local settings, not the Macrofold request or a gameplay-save contract. */
export type ModelTargetsConfig = z.infer<typeof modelTargetsConfigSchema>;
export type ConfiguredNpcGenerationTarget = z.infer<typeof configuredNpcTargetSchema>;

/** One native decision route covers all existing named-question callers. */
export function judgmentDeploymentTarget(
  config: ModelTargetsConfig | undefined,
): MacrofoldDeploymentTarget | undefined {
  if (!config) return undefined;
  const target = config.purposes.judgment;
  return target
    ? captureMacrofoldDeploymentTarget({
        workspaceId: config.workspace_id,
        modelBinding: target.model_binding,
      })
    : undefined;
}

export function macrofoldJudgmentModel(config: {
  modelTargets?: ModelTargetsConfig;
  macrofoldJevModel: string;
}): string {
  const target = config.modelTargets?.purposes.judgment;
  return target
    ? `deployment:${target.model_binding.deployment_id.toLowerCase()}`
    : config.macrofoldJevModel;
}

/** Offline configuration admission; a supplied invalid setting never selects the defaults. */
export function readModelTargetsConfig(raw: string | undefined): ModelTargetsConfig | undefined {
  if (raw === undefined) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('OPENLEGEND_MODEL_TARGETS_JSON must contain valid JSON.');
  }
  const parsed = modelTargetsConfigSchema.safeParse(value);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path.length ? `.${issue.path.join('.')}` : '';
    throw new Error(
      `OPENLEGEND_MODEL_TARGETS_JSON${field}: ${issue?.message ?? 'Invalid model targets.'}`,
    );
  }
  return parsed.data;
}

/** Only the actual NPC producer supplies this purpose; execution tiers are shared by other work.
 * docs/projects/custom-models-tech-design.md#4-trusted-production-configuration */
export function npcGenerationTarget(
  config: ModelTargetsConfig | undefined,
  purpose: NpcGenerationPurpose,
): ConfiguredNpcGenerationTarget | undefined {
  return config?.purposes[purpose];
}

/** Each caller retains its current allowance. Capability preparation may reduce it further. */
export function npcGenerationOutputTokens(
  roleLimit: number,
  target: ConfiguredNpcGenerationTarget | undefined,
): number {
  return Math.min(roleLimit, target?.max_output_tokens ?? roleLimit);
}

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
  return captureModelPrices(catalogue);
}

export function numberSetting(
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

/** Shared native-deployment credential selection; Worker/World Agent access keeps its own key. */
export function modelDeploymentApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return env['MACROFOLD_MODEL_API_KEY'] ?? env['MACROFOLD_API_KEY'] ?? '';
}

/** Shared trusted generation settings; reading them never starts a server or opens a database. */
export function readGenerationConfig(env: NodeJS.ProcessEnv = process.env) {
  const macrofoldKey = env['MACROFOLD_API_KEY'] ?? '';
  const macrofoldModelKey = modelDeploymentApiKey(env);
  const configuredBillingMode = env['MACROFOLD_BILLING_MODE'] ?? 'byok';
  if (configuredBillingMode !== 'byok' && configuredBillingMode !== 'managed')
    throw new Error('MACROFOLD_BILLING_MODE must be byok or managed.');
  const macrofoldBillingMode: MacrofoldBillingMode = configuredBillingMode;
  const modelTargets = readModelTargetsConfig(env['OPENLEGEND_MODEL_TARGETS_JSON']);
  if (modelTargets && !macrofoldModelKey)
    throw new Error(
      'OPENLEGEND_MODEL_TARGETS_JSON requires MACROFOLD_MODEL_API_KEY or MACROFOLD_API_KEY.',
    );
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
  // The higher caller may select the same configured chat target independently
  // of a later Lab response-tier choice; this is one immutable selection snapshot.
  const configuredHigherDecisionTarget = modelTargets?.purposes.npc_response_complex
    ? Object.freeze({
        workspaceId: modelTargets.workspace_id,
        target: modelTargets.purposes.npc_response_complex,
      })
    : undefined;
  const higherDecisionModel = modelIdentity.parse(
    env['DECISION_ESCALATION_MODEL'] ??
      (configuredHigherDecisionTarget
        ? `deployment:${configuredHigherDecisionTarget.target.model_binding.deployment_id.toLowerCase()}`
        : DECISION_MODEL),
  );
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
  // Standard short-context rates checked 2026-10-17; fallback admission is at most 100 KB.
  // An explicit operator catalogue owns its entries; missing models still fail closed.
  // https://developers.openai.com/api/docs/pricing
  const catalogue =
    env['OPENAI_MODEL_PRICES_JSON'] ??
    JSON.stringify(
      llmModel === DECISION_MODEL
        ? []
        : [
            {
              model: DECISION_MODEL,
              prices: {
                inputUsdPerMillion: 0.1,
                outputUsdPerMillion: 0.5,
                cachedInputUsdPerMillion: 0.01,
                cacheWriteInputUsdPerMillion: 0.125,
              },
            },
          ],
    );
  const llmModelPrices = modelPricesSetting(catalogue, llmModel, llmPrices);
  // Standard embedding rate checked 2026-10-04. Explicit catalogue ownership wins;
  // custom/unknown models never inherit it. docs/ai-providers.md#configuration-and-interface
  const embeddingModelPrices = llmModelPrices.some(
    (entry) =>
      entry.model === 'text-embedding-3-small' ||
      entry.reportedAliases?.includes('text-embedding-3-small'),
  )
    ? llmModelPrices
    : captureModelPrices([
        ...llmModelPrices,
        {
          model: 'text-embedding-3-small',
          prices: { inputUsdPerMillion: 0.02, outputUsdPerMillion: 0 },
        },
      ]);
  return Object.freeze({
    modelTargets,
    macrofoldKey,
    macrofoldModelKey,
    configuredHigherDecisionTarget,
    macrofoldUrl: env['MACROFOLD_BASE_URL'] ?? 'http://localhost:3210',
    macrofoldBillingMode,
    // Connection IDs select credentials already stored in Macrofold, not raw keys.
    macrofoldProviderConnectionId: env['MACROFOLD_PROVIDER_CONNECTION_ID'] ?? '',
    macrofoldModel: env['MACROFOLD_MODEL'] ?? DEFAULT_MACROFOLD_MODEL,
    macrofoldRunUsd: numberSetting(env, 'MACROFOLD_RUN_MAX_USD', 0.25, 0.000001, 10),
    macrofoldMiniModel: env['MACROFOLD_MINI_MODEL'] ?? 'openai/gpt-5-mini',
    macrofoldComplexModel: env['MACROFOLD_COMPLEX_MODEL'] ?? 'openai/gpt-5',
    macrofoldSummaryModel: env['MACROFOLD_SUMMARY_MODEL'] ?? 'openai/gpt-5-nano',
    miniModel: env['COGNITION_MINI_MODEL'] ?? 'gpt-5-mini',
    complexModel: env['COGNITION_COMPLEX_MODEL'] ?? 'gpt-5',
    summaryModel: env['COGNITION_SUMMARY_MODEL'] ?? 'gpt-5-nano',
    llmKey: env['OPENAI_API_KEY'] ?? '',
    llmModel,
    higherDecisionModel,
    // Explicit operator estimates; no claim of invoice totals.
    llmPrices,
    llmModelPrices,
    embeddingModelPrices,
  });
}

export type GenerationConfig = ReturnType<typeof readGenerationConfig>;

export type ResolvedNpcGenerationConfig = Readonly<
  { maxOutputTokens: number } & (
    | {
        transport: 'macrofold';
        macrofoldDeployment: MacrofoldDeploymentTarget;
        structuredOutput: ConfiguredNpcGenerationTarget['structured_output'];
        billingMode: 'byok';
        model?: never;
        reasoningEffort?: never;
        providerConnectionId?: never;
        prices?: never;
      }
    | {
        transport: 'macrofold' | 'openai';
        model: string;
        structuredOutput: 'json_schema';
        reasoningEffort: GenerateRequest['reasoningEffort'];
        billingMode?: MacrofoldBillingMode;
        providerConnectionId?: string;
        prices?: TokenPrices;
        macrofoldDeployment?: never;
      }
  )
>;

/** Select by the actual NPC purpose. Callers supply their current output allowance when it differs
 * from the ordinary level-two/three envelope; the optional study consumes this same baseline. */
export function resolveNpcGenerationConfig(
  config: GenerationConfig,
  purpose: NpcGenerationPurpose,
  options: { maxOutputTokens?: number; reasoningEffort?: GenerateRequest['reasoningEffort'] } = {},
): ResolvedNpcGenerationConfig {
  const fast = purpose === 'npc_response_fast';
  const allowance = options.maxOutputTokens ?? LEVEL_LIMITS[fast ? 2 : 3].outputTokens;
  const target = npcGenerationTarget(config.modelTargets, purpose);
  if (target && config.modelTargets) {
    return resolveDeploymentGeneration(config.modelTargets.workspace_id, target, allowance);
  }
  const transport = config.macrofoldKey ? ('macrofold' as const) : ('openai' as const);
  const model =
    transport === 'macrofold'
      ? fast
        ? config.macrofoldMiniModel
        : config.macrofoldComplexModel
      : fast
        ? config.miniModel
        : config.complexModel;
  return Object.freeze({
    transport,
    model,
    structuredOutput: 'json_schema' as const,
    maxOutputTokens: allowance,
    reasoningEffort: options.reasoningEffort ?? LEVEL_LIMITS[fast ? 2 : 3].effort,
    ...(transport === 'macrofold'
      ? {
          billingMode: config.macrofoldBillingMode,
          providerConnectionId: config.macrofoldProviderConnectionId,
        }
      : { prices: modelTokenPrices(config.llmModelPrices, model) }),
  });
}

function resolveDeploymentGeneration(
  workspaceId: string,
  target: ConfiguredNpcGenerationTarget,
  allowance: number,
): ResolvedNpcGenerationConfig {
  return Object.freeze({
    transport: 'macrofold' as const,
    macrofoldDeployment: captureMacrofoldDeploymentTarget({
      workspaceId,
      modelBinding: target.model_binding,
      ...(target.chat_template_kwargs ? { chatTemplateKwargs: target.chat_template_kwargs } : {}),
    }),
    structuredOutput: target.structured_output,
    maxOutputTokens: npcGenerationOutputTokens(allowance, target),
    billingMode: 'byok' as const,
  });
}

/** Exact configured selection only; an arbitrary deployment-looking string grants nothing. */
export function higherDecisionDeploymentTarget(
  config: GenerationConfig,
): MacrofoldDeploymentTarget | undefined {
  const configured = config.configuredHigherDecisionTarget;
  if (
    !configured ||
    config.higherDecisionModel !==
      `deployment:${configured.target.model_binding.deployment_id.toLowerCase()}`
  )
    return undefined;
  return resolveDeploymentGeneration(
    configured.workspaceId,
    configured.target,
    Number.MAX_SAFE_INTEGER,
  ).macrofoldDeployment;
}

/** Exact deployment bindings resolve separately; unbound higher models use one
 * route classification in selection and prepared-input admission. */
export function higherDecisionModelTransport(model: string): 'macrofold' | 'openai' {
  return model.includes('/') ? 'macrofold' : 'openai';
}

export function assertHigherDecisionModelTransport(original: string, selected: string): void {
  if (higherDecisionModelTransport(original) !== higherDecisionModelTransport(selected))
    throw new Error(
      'Choose this model in Lab model settings and prepare a new stage to change provider routes.',
    );
}

export function resolveHigherDecisionGenerationConfig(
  config: GenerationConfig,
  options: { maxOutputTokens: number; reasoningEffort?: GenerateRequest['reasoningEffort'] },
): ResolvedNpcGenerationConfig {
  const configured = config.configuredHigherDecisionTarget;
  if (configured && higherDecisionDeploymentTarget(config))
    return resolveDeploymentGeneration(
      configured.workspaceId,
      configured.target,
      options.maxOutputTokens,
    );
  // Catalogue identities include their provider namespace. Keep these on the
  // existing inference adapter; an absent backend credential must prevent
  // dispatch rather than send an OpenRouter identity to OpenAI Responses.
  const transport = higherDecisionModelTransport(config.higherDecisionModel);
  return Object.freeze({
    transport,
    model: config.higherDecisionModel,
    structuredOutput: 'json_schema' as const,
    maxOutputTokens: options.maxOutputTokens,
    reasoningEffort: options.reasoningEffort,
    ...(transport === 'macrofold'
      ? {
          billingMode: config.macrofoldBillingMode,
          providerConnectionId: config.macrofoldProviderConnectionId,
        }
      : { prices: modelTokenPrices(config.llmModelPrices, config.higherDecisionModel) }),
  });
}

export function hasHigherDecisionGenerationAccess(config: GenerationConfig): boolean {
  const selected = resolveHigherDecisionGenerationConfig(config, { maxOutputTokens: 1 });
  return !!(selected.macrofoldDeployment
    ? config.macrofoldModelKey
    : selected.transport === 'macrofold'
      ? config.macrofoldKey
      : config.llmKey);
}

export function npcGenerationModel(
  config: GenerationConfig,
  purpose: NpcGenerationPurpose,
): string {
  const selected = resolveNpcGenerationConfig(config, purpose);
  return selected.macrofoldDeployment
    ? `deployment:${selected.macrofoldDeployment.modelBinding.deployment_id}`
    : selected.model;
}

export function configuredDeploymentModel(
  config: GenerationConfig,
  model: string | undefined,
): boolean {
  if (!model) return false;
  const configured = [
    config.modelTargets?.purposes.npc_response_fast,
    config.modelTargets?.purposes.npc_response_complex,
    config.configuredHigherDecisionTarget?.target,
  ];
  return configured.some(
    (target) =>
      target && model === `deployment:${target.model_binding.deployment_id.toLowerCase()}`,
  );
}

export function hasJudgmentAccess(config: GenerationConfig & { jevKey: string }): boolean {
  return !!(
    config.macrofoldKey ||
    config.jevKey ||
    (config.macrofoldModelKey && judgmentDeploymentTarget(config.modelTargets))
  );
}

export function hasNpcGenerationAccess(
  config: GenerationConfig,
  purpose: NpcGenerationPurpose,
): boolean {
  const selected = resolveNpcGenerationConfig(config, purpose);
  return selected.macrofoldDeployment
    ? !!config.macrofoldModelKey
    : !!(config.macrofoldKey || config.llmKey);
}
