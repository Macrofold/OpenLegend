import { InvalidData, record, serialize, type PreparedSchema } from './validation.js';
import type { AiReceipt, GenerateRequest } from './types.js';

/** Projection of Macrofold's canonical deployment binding, not another inference wire schema. */
export interface MacrofoldDeploymentTarget {
  readonly workspaceId: string;
  readonly modelBinding: {
    readonly deployment_id: string;
    readonly deployment_revision_id?: string;
  };
}

export type MacrofoldOutputMode = 'json_schema' | 'json_object' | 'prompted_json';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retain the selected target across asynchronous work without retaining mutable caller data. */
export function captureMacrofoldDeploymentTarget(
  target: MacrofoldDeploymentTarget,
): MacrofoldDeploymentTarget {
  if (
    !record(target) ||
    typeof target.workspaceId !== 'string' ||
    !uuid.test(target.workspaceId) ||
    !record(target.modelBinding) ||
    typeof target.modelBinding.deployment_id !== 'string' ||
    !uuid.test(target.modelBinding.deployment_id) ||
    (target.modelBinding.deployment_revision_id !== undefined &&
      (typeof target.modelBinding.deployment_revision_id !== 'string' ||
        !uuid.test(target.modelBinding.deployment_revision_id))) ||
    Object.keys(target).some((key) => !['workspaceId', 'modelBinding'].includes(key)) ||
    Object.keys(target.modelBinding).some(
      (key) => !['deployment_id', 'deployment_revision_id'].includes(key),
    )
  )
    throw new InvalidData('invalid_deployment_binding');
  // PostgreSQL/API projections use canonical UUID spelling; casing cannot select a different service.
  return Object.freeze({
    workspaceId: target.workspaceId.toLowerCase(),
    modelBinding: Object.freeze({
      deployment_id: target.modelBinding.deployment_id.toLowerCase(),
      ...(target.modelBinding.deployment_revision_id === undefined
        ? {}
        : { deployment_revision_id: target.modelBinding.deployment_revision_id.toLowerCase() }),
    }),
  });
}

export function macrofoldDeploymentRequestFields(target: MacrofoldDeploymentTarget) {
  const captured = captureMacrofoldDeploymentTarget(target);
  return { workspace_id: captured.workspaceId, model_binding: captured.modelBinding };
}

/** All output strategies use the caller's one captured schema and complete local validation. */
export function prepareMacrofoldGenerationInput(
  request: GenerateRequest,
  preparedSchema: PreparedSchema,
  mode?: MacrofoldOutputMode,
): Record<string, unknown> {
  if (!request.task?.trim() || !request.instructions?.trim())
    throw new InvalidData('invalid_generation_instructions');
  const name = request.schemaName ?? request.task.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name)) throw new InvalidData('invalid_schema_name');
  if (mode !== undefined && !['json_schema', 'json_object', 'prompted_json'].includes(mode))
    throw new InvalidData('invalid_deployment_output_mode');
  if (
    (request.macrofoldDeployment !== undefined && mode === undefined) ||
    (request.macrofoldOutputMode !== undefined && request.macrofoldOutputMode !== mode)
  )
    throw new InvalidData('invalid_deployment_output_mode');
  if (mode !== undefined && (request.model !== undefined || request.reasoningEffort !== undefined))
    throw new InvalidData('deployment_provider_parameters_unsupported');
  if (
    request.reasoningEffort !== undefined &&
    !['none', 'low', 'medium', 'high'].includes(request.reasoningEffort)
  )
    throw new InvalidData('invalid_reasoning_effort');
  const context = serialize(request.context, 500_000);
  const instructions =
    mode === 'json_object' || mode === 'prompted_json'
      ? `${request.instructions}\n\nReturn only JSON matching this schema. Do not use Markdown fences or tools.\n${serialize(preparedSchema.schema, 500_000)}`
      : request.instructions;
  return {
    messages: [
      { role: 'system', content: instructions },
      { role: 'user', content: typeof request.context === 'string' ? request.context : context },
    ],
    ...(request.maxOutputTokens === undefined ? {} : { max_tokens: request.maxOutputTokens }),
    ...(mode === 'prompted_json'
      ? {}
      : mode === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {
            response_format: {
              type: 'json_schema',
              json_schema: { name, strict: true, schema: preparedSchema.schema },
            },
          }),
    ...(mode === undefined ? { provider: { require_parameters: true } } : {}),
    ...(request.reasoningEffort ? { reasoning: { effort: request.reasoningEffort } } : {}),
  };
}

export function decodeMacrofoldGeneration<T>(
  raw: unknown,
  preparedSchema: PreparedSchema,
): { value: T } | { refused: true } {
  if (
    !record(raw) ||
    !Array.isArray(raw.choices) ||
    raw.choices.length !== 1 ||
    !record(raw.choices[0])
  )
    throw new InvalidData('invalid_generation_response');
  const choice = raw.choices[0];
  const message = choice.message;
  if (!record(message)) throw new InvalidData('invalid_generation_response');
  if (message.refusal || choice.finish_reason === 'content_filter') return { refused: true };
  if (choice.finish_reason !== 'stop') throw new InvalidData('generation_incomplete');
  if (typeof message.content !== 'string') throw new InvalidData('missing_generation_text');
  let value: unknown;
  try {
    value = JSON.parse(message.content);
  } catch {
    throw new InvalidData('invalid_generation_json');
  }
  if (!preparedSchema.validate(value)) throw new InvalidData('generation_schema_mismatch');
  return { value: value as T };
}

/** Match the admitted deployment and deliberate pin; later hosting/revision changes are irrelevant. */
export function captureMacrofoldDeploymentReceipt(
  inference: Record<string, unknown>,
  receipt: AiReceipt,
  expected?: MacrofoldDeploymentTarget,
): void {
  const deployment = inference['deployment'];
  // A definite refusal before provider dispatch need not contain an admitted
  // target. Successful model content always needs the actual deployment IDs.
  if (
    deployment === undefined &&
    inference['provider_outcome'] === 'not_invoked' &&
    inference['outcome'] !== 'value'
  )
    return;
  if (expected !== undefined || deployment !== undefined) {
    if (
      !record(deployment) ||
      typeof deployment['deployment_id'] !== 'string' ||
      !uuid.test(deployment['deployment_id']) ||
      typeof deployment['deployment_revision_id'] !== 'string' ||
      !uuid.test(deployment['deployment_revision_id']) ||
      (expected !== undefined &&
        (deployment['deployment_id'].toLowerCase() !==
          expected.modelBinding.deployment_id.toLowerCase() ||
          (expected.modelBinding.deployment_revision_id !== undefined &&
            deployment['deployment_revision_id'].toLowerCase() !==
              expected.modelBinding.deployment_revision_id.toLowerCase())))
    )
      throw new InvalidData('macrofold_deployment_identity_invalid');
    receipt.macrofoldDeployment = {
      deploymentId: deployment['deployment_id'].toLowerCase(),
      deploymentRevisionId: deployment['deployment_revision_id'].toLowerCase(),
    };
  }
  const attribution = inference['cost_attribution'];
  const admitted = receipt.macrofoldDeployment;
  if (
    admitted &&
    record(attribution) &&
    attribution['basis'] === 'deployment' &&
    typeof attribution['deployment_id'] === 'string' &&
    attribution['deployment_id'].toLowerCase() === admitted.deploymentId &&
    attribution['infrastructure_cost_included'] === false
  )
    receipt.macrofoldCostAttribution = {
      basis: 'deployment',
      deploymentId: admitted.deploymentId,
      infrastructureCostIncluded: false,
    };
}
