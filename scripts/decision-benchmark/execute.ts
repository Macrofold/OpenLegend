import {
  createAiClient,
  createMacrofoldDecisionClient,
  createMacrofoldGenerationClient,
  createOpenAiDecisionClient,
  estimateCostUsd,
  type AiResult,
  type JudgeValue,
  type JsonValue,
  type MacrofoldDecisionModel,
  type TypedQuestionMap,
  MacrofoldTransport,
  type MacrofoldOutputMode,
} from '../../packages/ai/src/index.js';
import {
  ModelTargetPreparation,
  describeMacrofoldDeployment,
} from '../../apps/server/src/generation-targets.js';
import {
  decisionGenerationRequest,
  decodeGeneratedDecision,
  generalGenerationInstructions,
} from './llm-prompt.js';
import { lunaPrices, outputTokens, type BenchmarkArm } from './arms.js';
import type { BenchmarkManifest } from './journal.js';

export interface PreparedTask {
  id: string;
  input: { state: unknown; questions: TypedQuestionMap };
  generation?: {
    instructions: string;
    schema: Record<string, unknown>;
    state: unknown;
    /** Production qualification must retain its actual caller-owned prompt. */
    exactInstructions?: true;
  };
}
/** Native APIs need offered questions; arbitrary JSON generation has none. */
export function armSupportsTask(arm: BenchmarkArm, task: PreparedTask): boolean {
  return !arm.transport.endsWith('decision') || Object.keys(task.input.questions).length > 0;
}
export function preparedArmInput(arm: BenchmarkArm, task: PreparedTask) {
  if (task.generation && !arm.transport.endsWith('decision'))
    return {
      instructions: task.generation.exactInstructions
        ? task.generation.instructions
        : generalGenerationInstructions + '\n' + task.generation.instructions,
      input: task.generation.state,
      schema: task.generation.schema,
    };
  return arm.transport.endsWith('decision') ? task.input : decisionGenerationRequest(task.input);
}
export type PreparedDeploymentArm = {
  macrofoldOutputMode: MacrofoldOutputMode;
  maxOutputTokens: number;
  stream: boolean;
};
/** Passive online preparation is explicit and uses the production capability owner. */
export function benchmarkDeploymentPreparation(manifest: BenchmarkManifest) {
  const api = new MacrofoldTransport(manifest.baseUrl, process.env['MACROFOLD_API_KEY'] ?? '');
  const preparation = new ModelTargetPreparation((target, operation) =>
    describeMacrofoldDeployment(api, target, operation),
  );
  return async (
    arm: BenchmarkArm,
    task: PreparedTask,
  ): Promise<PreparedDeploymentArm | undefined> => {
    const target = arm.macrofoldDeployment;
    if (!target) return undefined;
    const input = preparedArmInput(arm, task) as ReturnType<typeof decisionGenerationRequest>;
    return api.run({ timeoutMs: manifest.timeoutMs }, async (operation) =>
      preparation.prepare({
        target,
        outputPolicy: arm.structuredOutput ?? 'auto',
        schema: input.schema,
        maxOutputTokens: arm.maxOutputTokens ?? outputTokens,
        stream: manifest.streamGeneration === true,
        operation,
      }),
    );
  };
}
function deploymentMode(arm: BenchmarkArm, prepared?: PreparedDeploymentArm): MacrofoldOutputMode {
  if (prepared) return prepared.macrofoldOutputMode;
  if (!arm.structuredOutput || arm.structuredOutput === 'auto')
    throw new Error('Resolve deployment capabilities before live execution.');
  return arm.structuredOutput;
}
export async function executeArm(
  arm: BenchmarkArm,
  task: PreparedTask,
  manifest: BenchmarkManifest,
  requestId: string,
  reserve: number,
  signal: AbortSignal,
  onAccepted: (id: string) => Promise<void>,
  deployment?: PreparedDeploymentArm,
): Promise<{ result: AiResult<JudgeValue>; generation?: JsonValue }> {
  const input = preparedArmInput(arm, task);
  const macrofold = {
    baseUrl: manifest.baseUrl,
    apiKey: process.env['MACROFOLD_API_KEY'] ?? '',
    model: arm.model,
    billingMode: arm.billingMode ?? manifest.billingMode,
    providerConnectionId: arm.providerConnectionId ?? manifest.providerConnectionId,
    maxCostUsd: reserve,
    timeoutMs: manifest.timeoutMs,
  };
  const control = { requestId, signal, onAccepted };
  if (arm.transport === 'macrofold-decision')
    return {
      result: await createMacrofoldDecisionClient({
        ...macrofold,
        model: arm.model as MacrofoldDecisionModel,
      }).judge({ ...task.input, ...control }),
    };
  if (arm.transport === 'openai-decision')
    return {
      result: await createOpenAiDecisionClient({
        apiKey: process.env['OPENAI_API_KEY'] ?? '',
        timeoutMs: manifest.timeoutMs,
      }).judge({ ...task.input, ...control }),
    };
  const generated = input as ReturnType<typeof decisionGenerationRequest>;
  const request = {
    ...control,
    task: 'benchmark',
    instructions: generated.instructions,
    context: generated.input,
    schema: generated.schema,
    maxOutputTokens: deployment?.maxOutputTokens ?? arm.maxOutputTokens ?? outputTokens,
    reasoningEffort: arm.effort,
  };
  const result: AiResult<JsonValue> =
    arm.transport === 'macrofold-generation'
      ? await createMacrofoldGenerationClient(
          arm.macrofoldDeployment
            ? {
                baseUrl: macrofold.baseUrl,
                apiKey: macrofold.apiKey,
                maxCostUsd: reserve,
                timeoutMs: manifest.timeoutMs,
                macrofoldDeployment: arm.macrofoldDeployment,
                macrofoldOutputMode: deploymentMode(arm, deployment),
              }
            : macrofold,
        ).generate<JsonValue>({
          ...request,
          ...(manifest.streamGeneration ? { stream: true } : {}),
        })
      : await createAiClient({
          openai: {
            apiKey: process.env['OPENAI_API_KEY'] ?? '',
            model: arm.model,
            prices: arm.prices ?? lunaPrices,
          },
          timeoutMs: manifest.timeoutMs,
          maxRequestBytes: 500_000,
          maxResponseBytes: 1_000_000,
          maxOutputTokens: outputTokens,
        }).generate<JsonValue>(request);
  if (
    arm.transport === 'openai-response' &&
    !arm.prices &&
    result.receipt.usage &&
    result.receipt.model === arm.model
  ) {
    const long = result.receipt.usage.inputTokens > 272_000;
    result.receipt.estimatedCostUsd = estimateCostUsd(
      result.receipt.usage,
      long
        ? {
            inputUsdPerMillion: 0.2,
            outputUsdPerMillion: 0.75,
            cachedInputUsdPerMillion: 0.02,
            cacheWriteInputUsdPerMillion: 0.25,
          }
        : lunaPrices,
    );
  }
  if (result.outcome !== 'value') return { result };
  if (task.generation)
    return { result: { ...result, value: { answers: {} } }, generation: result.value };
  try {
    return {
      result: { ...result, value: decodeGeneratedDecision(result.value, task.input.questions) },
    };
  } catch {
    return {
      result: {
        outcome: 'invalid',
        reason: 'generated_decision_schema_mismatch',
        receipt: result.receipt,
      },
    };
  }
}
