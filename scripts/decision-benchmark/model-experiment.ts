import { isAbsolute } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import {
  captureMacrofoldDeploymentTarget,
  captureModelPrices,
  modelTokenPrices,
  usdToMicroUsd,
} from '../../packages/ai/src/index.js';
import { PRIVATE_BENCHMARK_EVIDENCE_BYTES, assertPairwiseReportFits } from './evidence-limits.js';
import {
  readGenerationConfig,
  readModelTargetsConfig,
  resolveNpcGenerationConfig,
  type NpcGenerationPurpose,
} from '../../apps/server/src/generation-config.js';
import { armById, outputTokens, resolveArm, type BenchmarkArm } from './arms.js';
import { sha256 } from './corpus.js';
import type { BenchmarkManifest, BenchmarkJournalEvent } from './journal.js';
import type { RunRecord } from './evaluate.js';
import { groupByModel } from './evaluate.js';

type OutputPolicy = NonNullable<BenchmarkArm['structuredOutput']>;
type ArmSource =
  | { kind: 'existing'; arm: string }
  | { kind: 'purpose'; purpose: NpcGenerationPurpose }
  | {
      kind: 'deployment';
      workspace_id: string;
      model_binding: { deployment_id: string; deployment_revision_id?: string };
      structured_output?: OutputPolicy;
    };
export interface ModelExperimentPlan {
  schema_version: 1;
  id: string;
  question: string;
  cases: string[];
  replicates: number;
  arms: Array<{ id: string; source: ArmSource }>;
  limits: {
    cap_usd: number;
    per_call_usd: number;
    timeout_ms: number;
    concurrency: number;
    max_output_tokens: number;
  };
  prior_commitment_usd: number;
  hosting_cost: { basis: 'already-funded-shared'; cost_usd?: number };
}
export interface ResolvedModelExperiment {
  plan: ModelExperimentPlan;
  planDigest: string;
  arms: BenchmarkArm[];
  referenceDigest: string;
}
function record(value: unknown, keys: string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${field} must be an object.`);
  const result = value as Record<string, unknown>;
  const unknown = Object.keys(result).filter((key) => !keys.includes(key));
  if (unknown.length) throw new Error(`${field} has unknown fields: ${unknown.join(', ')}.`);
  return result;
}
function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required.`);
  return value;
}
function integer(value: unknown, field: string, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max)
    throw new Error(`${field} must be a positive safe integer at most ${max}.`);
  return Number(value);
}
function money(value: unknown, field: string, positive: boolean): number {
  const amount = usdToMicroUsd(value);
  if (amount === undefined || (positive && amount === 0))
    throw new Error(`${field} must be ${positive ? 'positive' : 'nonnegative'} USD.`);
  return Number(value);
}
function deployment(source: Record<string, unknown>) {
  const parsed = readModelTargetsConfig(
    JSON.stringify({
      schema_version: 1,
      workspace_id: source.workspace_id,
      purposes: {
        npc_response_fast: {
          model_binding: source.model_binding,
          ...(source.structured_output === undefined
            ? {}
            : { structured_output: source.structured_output }),
        },
      },
    }),
  );
  if (!parsed?.purposes.npc_response_fast) throw new Error('Missing deployment target.');
  return captureMacrofoldDeploymentTarget({
    workspaceId: parsed.workspace_id,
    modelBinding: parsed.purposes.npc_response_fast.model_binding,
  });
}
/** Local study admission shares deployment setting validation and makes no provider calls. */
export function parseModelExperiment(value: unknown): ModelExperimentPlan {
  const p = record(
    value,
    [
      'schema_version',
      'id',
      'question',
      'cases',
      'replicates',
      'arms',
      'limits',
      'prior_commitment_usd',
      'hosting_cost',
    ],
    'Model experiment',
  );
  if (p.schema_version !== 1) throw new Error('Model experiment schema_version must be 1.');
  const id = text(p.id, 'id');
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) throw new Error('id must be a plain study identifier.');
  if (
    !Array.isArray(p.cases) ||
    !p.cases.length ||
    p.cases.some((id) => typeof id !== 'string' || !id) ||
    new Set(p.cases).size !== p.cases.length
  )
    throw new Error('cases must contain unique existing task IDs.');
  if (!Array.isArray(p.arms) || !p.arms.length) throw new Error('arms must be nonempty.');
  const arms = p.arms.map((value, index): ModelExperimentPlan['arms'][number] => {
    const a = record(value, ['id', 'source'], `arms.${index}`);
    const id = text(a.id, `arms.${index}.id`);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) throw new Error('Arm IDs must be plain identifiers.');
    const s = record(
      a.source,
      ['kind', 'arm', 'purpose', 'workspace_id', 'model_binding', 'structured_output'],
      `arms.${index}.source`,
    );
    if (s.kind === 'existing') {
      record(s, ['kind', 'arm'], `arms.${index}.source`);
      const arm = resolveArm(text(s.arm, 'source.arm'));
      if (!arm || armById.get(arm)?.transport.endsWith('decision'))
        throw new Error('An experiment generation arm needs an existing generation model.');
      return { id, source: { kind: 'existing', arm } };
    }
    if (s.kind === 'purpose') {
      record(s, ['kind', 'purpose'], `arms.${index}.source`);
      if (s.purpose !== 'npc_response_fast' && s.purpose !== 'npc_response_complex')
        throw new Error('source.purpose must identify fast or complex NPC responses.');
      return { id, source: { kind: 'purpose', purpose: s.purpose } };
    }
    if (s.kind !== 'deployment')
      throw new Error('source.kind must be existing, purpose or deployment.');
    record(
      s,
      ['kind', 'workspace_id', 'model_binding', 'structured_output'],
      `arms.${index}.source`,
    );
    const target = deployment(s);
    return {
      id,
      source: {
        kind: 'deployment',
        workspace_id: target.workspaceId,
        model_binding: target.modelBinding,
        structured_output: (s.structured_output ?? 'auto') as OutputPolicy,
      },
    };
  });
  if (new Set(arms.map((arm) => arm.id)).size !== arms.length)
    throw new Error('Arm IDs must be unique.');
  const l = record(
    p.limits,
    ['cap_usd', 'per_call_usd', 'timeout_ms', 'concurrency', 'max_output_tokens'],
    'limits',
  );
  const limits = {
    cap_usd: money(l.cap_usd, 'limits.cap_usd', true),
    per_call_usd: money(l.per_call_usd, 'limits.per_call_usd', true),
    timeout_ms: integer(l.timeout_ms, 'limits.timeout_ms', 300000),
    concurrency: integer(l.concurrency, 'limits.concurrency', 4),
    max_output_tokens: integer(l.max_output_tokens, 'limits.max_output_tokens', 16384),
  };
  const prior = money(p.prior_commitment_usd, 'prior_commitment_usd', false);
  if (
    limits.cap_usd > 100 ||
    limits.per_call_usd > limits.cap_usd ||
    prior > limits.cap_usd ||
    limits.timeout_ms < 1000
  )
    throw new Error('Study limits exceed the existing benchmark budget or deadline envelope.');
  const h = record(p.hosting_cost, ['basis', 'cost_usd'], 'hosting_cost');
  if (h.basis !== 'already-funded-shared')
    throw new Error(
      'Hosting must already be funded outside this study; this tool never starts hosting.',
    );
  return {
    schema_version: 1,
    id,
    question: text(p.question, 'question'),
    cases: p.cases as string[],
    replicates: integer(p.replicates, 'replicates'),
    arms,
    limits,
    prior_commitment_usd: prior,
    hosting_cost: {
      basis: 'already-funded-shared',
      ...(h.cost_usd === undefined
        ? {}
        : { cost_usd: money(h.cost_usd, 'hosting_cost.cost_usd', false) }),
    },
  };
}
export async function readModelExperiment(path: string): Promise<ModelExperimentPlan> {
  if (!isAbsolute(path))
    throw new Error('--model-experiment requires an absolute private plan path.');
  if ((await stat(path)).size > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
    throw new Error('Model experiment exceeds the 20MB private evidence envelope.');
  const source = await readFile(path, 'utf8');
  if (Buffer.byteLength(source) > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
    throw new Error('Model experiment exceeds the 20MB private evidence envelope.');
  return parseModelExperiment(JSON.parse(source));
}
export function applyExperimentOptions(
  plan: ModelExperimentPlan,
  options: Map<string, string>,
): void {
  if (options.has('models')) throw new Error('--models conflicts with --model-experiment.');
  for (const [flag, value] of [
    ['cap-usd', plan.limits.cap_usd],
    ['per-call-usd', plan.limits.per_call_usd],
    ['timeout-ms', plan.limits.timeout_ms],
    ['concurrency', plan.limits.concurrency],
    ['max-output-tokens', plan.limits.max_output_tokens],
    ['prior-commitment-usd', plan.prior_commitment_usd],
  ] as const) {
    const previous = options.get(flag);
    const same = flag.endsWith('usd')
      ? usdToMicroUsd(Number(previous)) === usdToMicroUsd(value)
      : Number(previous) === value;
    if (previous !== undefined && !same)
      throw new Error(`--${flag} conflicts with the model experiment.`);
    options.set(flag, String(value));
  }
}
export function resolveModelExperiment(
  plan: ModelExperimentPlan,
  reference: unknown,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedModelExperiment {
  const config = plan.arms.some((arm) => arm.source.kind === 'purpose')
    ? readGenerationConfig(env)
    : undefined;
  const arms: BenchmarkArm[] = [];
  let retainedBytes = Buffer.byteLength(JSON.stringify(plan));
  const plannedCalls = plan.cases.length * plan.arms.length * plan.replicates;
  if (!Number.isSafeInteger(plannedCalls))
    throw new Error('Planned request count exceeds safe arithmetic.');
  assertPairwiseReportFits(plan.arms.length * plan.replicates);
  // Every retained request needs its key, 64-character digest and reservation. Reject a
  // provably oversized grid before constructing either repeated arms or per-request records.
  const minimumRequestBytes = Buffer.byteLength(
    JSON.stringify({ key: ':', digest: '0'.repeat(64), reserve: 0 }),
  );
  retainedBytes += plannedCalls * minimumRequestBytes;
  if (retainedBytes > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
    throw new Error(
      'Resolved model experiment request metadata exceeds the 20MB private evidence envelope before expansion.',
    );
  for (const entry of plan.arms) {
    let base: BenchmarkArm;
    if (entry.source.kind === 'existing') {
      const selected = armById.get(entry.source.arm);
      if (!selected) throw new Error('Unknown generation arm.');
      base = { ...selected };
    } else if (entry.source.kind === 'purpose') {
      if (!config) throw new Error('Missing generation configuration.');
      const selected = resolveNpcGenerationConfig(config, entry.source.purpose);
      const prices = selected.prices;
      if (selected.transport === 'openai' && !prices)
        throw new Error('Configured direct model has no exact price entry.');
      base = {
        id: entry.id,
        alias: entry.id,
        model:
          selected.model ??
          `deployment:${selected.macrofoldDeployment?.modelBinding.deployment_id}`,
        transport: selected.transport === 'macrofold' ? 'macrofold-generation' : 'openai-response',
        inputRate: prices?.inputUsdPerMillion ?? 0,
        outputRate: prices?.outputUsdPerMillion ?? 0,
        prices,
        ...(selected.transport === 'openai'
          ? {
              modelPrices: config.llmModelPrices.filter(
                (entry) =>
                  entry.model === selected.model ||
                  entry.reportedAliases?.includes(selected.model ?? ''),
              ),
            }
          : {}),
        maxOutputTokens: selected.maxOutputTokens,
        effort: selected.reasoningEffort,
        billingMode: selected.billingMode,
        providerConnectionId: selected.providerConnectionId,
        macrofoldDeployment: selected.macrofoldDeployment,
        structuredOutput: selected.structuredOutput,
        ...(selected.transport === 'macrofold' ? { reservationUsd: config.macrofoldRunUsd } : {}),
      };
    } else {
      const target = deployment({
        workspace_id: entry.source.workspace_id,
        model_binding: entry.source.model_binding,
        structured_output: entry.source.structured_output,
      });
      base = {
        id: entry.id,
        alias: entry.id,
        model: `deployment:${target.modelBinding.deployment_id}`,
        transport: 'macrofold-generation',
        inputRate: 0,
        outputRate: 0,
        reservationUsd: plan.limits.per_call_usd,
        macrofoldDeployment: target,
        structuredOutput: entry.source.structured_output ?? 'auto',
      };
    }
    const maxOutputTokens = Math.min(
      base.maxOutputTokens ?? outputTokens,
      plan.limits.max_output_tokens,
    );
    const bytesPerArm = Buffer.byteLength(
      JSON.stringify({
        ...base,
        id: `experiment/${entry.id}/replicate-1`,
        alias: entry.id,
        originalArm: entry.id,
        replicate: 1,
        maxOutputTokens,
      }),
    );
    const bytes = bytesPerArm * plan.replicates;
    if (!Number.isSafeInteger(bytes) || retainedBytes + bytes > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
      throw new Error(
        'Resolved model experiment metadata exceeds the 20MB private evidence envelope before expansion.',
      );
    retainedBytes += bytes;
    for (let replicate = 1; replicate <= plan.replicates; replicate++)
      arms.push({
        ...base,
        id: `experiment/${entry.id}/replicate-${replicate}`,
        alias: entry.id,
        originalArm: entry.id,
        replicate,
        maxOutputTokens,
      });
  }
  assertPairwiseReportFits(
    arms.length,
    arms.reduce((bytes, arm) => bytes + Buffer.byteLength(JSON.stringify(arm.id)) - 2, 0),
  );
  return { plan, planDigest: sha256(plan), arms, referenceDigest: sha256(reference) };
}
export function experimentArms(
  manifest: Pick<BenchmarkManifest, 'modelExperiment'>,
): ReadonlyMap<string, BenchmarkArm> {
  return manifest.modelExperiment
    ? new Map(manifest.modelExperiment.arms.map((arm) => [arm.id, arm]))
    : armById;
}
export function experimentReport(
  experiment: ResolvedModelExperiment,
  records: RunRecord[],
  planned: number,
  events: readonly BenchmarkJournalEvent[] = [],
) {
  const recordsByModel = groupByModel(records);
  return {
    id: experiment.plan.id,
    question: experiment.plan.question,
    planDigest: experiment.planDigest,
    referenceDigest: experiment.referenceDigest,
    coverage: {
      planned,
      admitted: events.filter((event) => event.event === 'admitted').length,
      accepted: events.filter((event) => event.event === 'accepted').length,
      returned: records.length,
      answered: records.filter((r) => r.result.outcome === 'value').length,
      unattemptedOrPending: planned - records.length,
    },
    arms: experiment.arms.map((arm) => ({
      id: arm.id,
      originalArm: arm.originalArm,
      replicate: arm.replicate,
      target: arm.macrofoldDeployment ?? { model: arm.model },
      actualRevisions: (recordsByModel.get(arm.id) ?? []).map((r) => ({
        deployment: r.result.receipt.macrofoldDeployment ?? null,
        outputMode: r.outputMode ?? null,
        model: r.result.receipt.model,
        modelVersionStatus: r.result.receipt.modelVersionStatus,
      })),
    })),
    hosting: {
      basis: experiment.plan.hosting_cost.basis,
      sharedCostUsd: experiment.plan.hosting_cost.cost_usd ?? null,
      attribution: 'Declared once for this study window; never multiplied by requests.',
      qualification:
        experiment.plan.hosting_cost.cost_usd === undefined
          ? 'unqualified-shared-cost'
          : 'operator-reported-window-cost',
    },
    interpretation: {
      assistantRefusal: 'Human review required; provider refusal outcomes are reported separately.',
      quietSanitization: 'Human review required.',
      independentCharacterChoice: 'Human review required.',
      nativeRejectionAndCommittedEffects: 'Not established by offline model outputs.',
      firstUsefulPermittedOutputLatencyMs: null,
    },
    failures: records
      .filter((r) => r.result.outcome !== 'value')
      .map((r) => ({
        arm: r.model,
        case: r.sceneId,
        outcome: r.result.outcome,
        reason: r.result.outcome === 'value' ? null : r.result.reason,
      })),
  };
}
/** Current saved study records are executable funding inputs, not unvalidated report metadata. */
export function validateResolvedModelExperiment(
  value: unknown,
): asserts value is ResolvedModelExperiment {
  const e = record(
    value,
    ['plan', 'planDigest', 'arms', 'referenceDigest'],
    'Saved model experiment',
  );
  const plan = parseModelExperiment(e.plan);
  if (
    e.planDigest !== sha256(plan) ||
    typeof e.referenceDigest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(e.referenceDigest)
  )
    throw new Error('Saved model experiment fingerprints changed.');
  if (!Array.isArray(e.arms) || e.arms.length !== plan.arms.length * plan.replicates)
    throw new Error('Saved model experiment arm count changed.');
  if (Buffer.byteLength(JSON.stringify(e.arms)) > PRIVATE_BENCHMARK_EVIDENCE_BYTES)
    throw new Error('Saved model experiment exceeds the 20MB private evidence envelope.');
  const originalArms = new Set(plan.arms.map((arm) => arm.id));
  const seen = new Set<string>();
  for (const value of e.arms) {
    const a = record(
      value,
      [
        'id',
        'alias',
        'model',
        'transport',
        'inputRate',
        'outputRate',
        'effort',
        'prices',
        'modelPrices',
        'billingMode',
        'providerConnectionId',
        'maxOutputTokens',
        'reservationUsd',
        'macrofoldDeployment',
        'structuredOutput',
        'originalArm',
        'replicate',
      ],
      'Saved arm',
    );
    if (
      typeof a.id !== 'string' ||
      seen.has(a.id) ||
      !originalArms.has(String(a.originalArm)) ||
      !Number.isSafeInteger(a.replicate) ||
      Number(a.replicate) < 1 ||
      Number(a.replicate) > plan.replicates ||
      a.id !== `experiment/${a.originalArm}/replicate-${a.replicate}`
    )
      throw new Error('Saved model experiment arm identity changed.');
    seen.add(a.id);
    text(a.model, 'Saved arm model');
    if (!['macrofold-generation', 'openai-response'].includes(String(a.transport)))
      throw new Error('Saved model experiment must use generation.');
    integer(a.maxOutputTokens, 'Saved output limit', plan.limits.max_output_tokens);
    if (a.reservationUsd !== undefined) money(a.reservationUsd, 'Saved reservation', true);
    for (const field of ['inputRate', 'outputRate']) money(a[field], `Saved ${field}`, false);
    if (a.prices !== undefined) {
      const prices = record(
        a.prices,
        [
          'inputUsdPerMillion',
          'outputUsdPerMillion',
          'cachedInputUsdPerMillion',
          'cacheWriteInputUsdPerMillion',
        ],
        'Saved model prices',
      );
      money(prices.inputUsdPerMillion, 'input price', false);
      money(prices.outputUsdPerMillion, 'output price', false);
      for (const field of ['cachedInputUsdPerMillion', 'cacheWriteInputUsdPerMillion'])
        if (prices[field] !== undefined) money(prices[field], field, false);
    }
    if (a.modelPrices !== undefined) {
      if (!Array.isArray(a.modelPrices)) throw new Error('Saved model prices must be a catalogue.');
      const catalogue = a.modelPrices.map((raw) => {
        const entry = record(
          raw,
          ['model', 'prices', 'reportedAliases'],
          'Saved model price entry',
        );
        const prices = record(
          entry.prices,
          [
            'inputUsdPerMillion',
            'outputUsdPerMillion',
            'cachedInputUsdPerMillion',
            'cacheWriteInputUsdPerMillion',
          ],
          'Saved entry prices',
        );
        if (entry.reportedAliases !== undefined && !Array.isArray(entry.reportedAliases))
          throw new Error('Saved aliases must be an array.');
        return {
          model: text(entry.model, 'Saved priced model'),
          prices: {
            inputUsdPerMillion: money(prices.inputUsdPerMillion, 'input price', false),
            outputUsdPerMillion: money(prices.outputUsdPerMillion, 'output price', false),
            ...(prices.cachedInputUsdPerMillion === undefined
              ? {}
              : {
                  cachedInputUsdPerMillion: money(
                    prices.cachedInputUsdPerMillion,
                    'cached price',
                    false,
                  ),
                }),
            ...(prices.cacheWriteInputUsdPerMillion === undefined
              ? {}
              : {
                  cacheWriteInputUsdPerMillion: money(
                    prices.cacheWriteInputUsdPerMillion,
                    'cache write price',
                    false,
                  ),
                }),
          },
          ...(entry.reportedAliases === undefined
            ? {}
            : {
                reportedAliases: entry.reportedAliases.map((alias) =>
                  text(alias, 'Saved model alias'),
                ),
              }),
        };
      });
      const selected = modelTokenPrices(captureModelPrices(catalogue), String(a.model));
      const prices = a.prices;
      if (
        !selected ||
        !prices ||
        typeof prices !== 'object' ||
        ![
          'inputUsdPerMillion',
          'outputUsdPerMillion',
          'cachedInputUsdPerMillion',
          'cacheWriteInputUsdPerMillion',
        ].every((field) => Reflect.get(selected, field) === Reflect.get(prices, field))
      )
        throw new Error('Saved model catalogue does not match its selected rates.');
    }
    if (a.effort !== undefined && !['none', 'low', 'medium', 'high'].includes(String(a.effort)))
      throw new Error('Invalid saved reasoning effort.');
    if (a.billingMode !== undefined && !['managed', 'byok'].includes(String(a.billingMode)))
      throw new Error('Invalid saved billing mode.');
    if (a.providerConnectionId !== undefined)
      text(a.providerConnectionId, 'Saved provider connection');
    if (
      a.structuredOutput !== undefined &&
      !['auto', 'json_schema', 'json_object', 'prompted_json'].includes(String(a.structuredOutput))
    )
      throw new Error('Invalid saved output policy.');
    if (a.macrofoldDeployment !== undefined) {
      const target = record(
        a.macrofoldDeployment,
        ['workspaceId', 'modelBinding'],
        'Saved deployment',
      );
      const captured = deployment({
        workspace_id: target.workspaceId,
        model_binding: target.modelBinding,
      });
      if (
        a.transport !== 'macrofold-generation' ||
        a.model !== `deployment:${captured.modelBinding.deployment_id}` ||
        a.effort !== undefined ||
        a.prices !== undefined ||
        a.modelPrices !== undefined
      )
        throw new Error('Saved deployment has mixed provider settings.');
    }
  }
}
