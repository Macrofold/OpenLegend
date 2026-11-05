import { modelTokenPrices, macrofoldGenerationInstructions } from '@open-legend/ai';
import type { AppConfig } from './config.js';
import { generationAllowance } from './cognition-budget.js';
import type { CognitionStageInput } from './cognition-runtime-control.js';
import { judgmentDeploymentTarget } from './generation-config.js';

/** Cost the submitted experimental envelope after editing, using bytes as a conservative
 * token upper bound. Receipts and the native spending ledger remain authoritative. */
export function stageSize(input: CognitionStageInput) {
  const bytes = (value: unknown) =>
    Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
  if (input.kind === 'judge')
    return {
      instructions: 0,
      context: bytes(input.request.state),
      schema: bytes(input.request.questions),
    };
  if (input.kind === 'embedding')
    return { instructions: 0, context: bytes(input.request.texts), schema: 0 };
  return {
    instructions: bytes(
      macrofoldGenerationInstructions(
        input.request.instructions,
        input.request.schema,
        input.request.macrofoldOutputMode,
      ),
    ),
    context: bytes(input.request.context),
    schema: bytes(input.request.schema),
  };
}
export function stageAllowance(
  config: AppConfig,
  input: CognitionStageInput,
  model?: string,
  transport?: 'openai' | 'macrofold',
): number {
  const size = stageSize(input);
  const inputBound = size.instructions + size.context + size.schema + 4096;
  if (input.kind === 'judge')
    return judgmentDeploymentTarget(config.modelTargets)
      ? 0
      : Math.max(config.jevReserveUsd, (inputBound * config.jevPrices.inputUsdPerMillion) / 1e6);
  if (input.kind === 'embedding') {
    const prices = modelTokenPrices(config.embeddingModelPrices, config.embeddingModel);
    return Math.max(
      config.embeddingReserveUsd,
      prices ? (inputBound * prices.inputUsdPerMillion) / 1e6 : config.embeddingReserveUsd,
    );
  }
  return generationAllowance(
    config,
    input.request.model ?? model,
    inputBound,
    input.request.maxOutputTokens ?? 8192,
    undefined,
    transport,
  );
}
