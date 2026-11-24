import {
  DECISION_LIMITS,
  DECISION_MODEL,
  DECISION_EFFORT,
  type DecisionReason,
} from './decision-state.js';
import { digest } from './content-digest.js';
import type { AppConfig } from './config.js';
import { modelTokenPrices, type AiReceipt } from '@open-legend/ai';
import { generationAllowance } from './cognition-budget.js';
import { macrofoldJudgmentModel } from './generation-config.js';
import {
  checkDecisionTaskSize,
  compileDecisionTask as compileUnreservedDecisionTask,
  decisionTaskParts,
  finishDecisionTask,
  prepareDecisionTask as prepareUnreservedDecisionTask,
  type DecisionTask,
} from './decision-task-compiler.js';
import type { Level1Outcome } from './level1-selection.js';
import type { NativeWorld } from '@open-legend/native-simulation';
import {
  admitDecisionGraph,
  decisionArrayBytes,
  decisionObjectBytes,
  decisionRecordEntries,
  projectDecisionSchema,
} from './native-decision-allocation.js';
import {
  releaseNativeProduct,
  reserveNativeJsonTextWorkspace,
  retainNativeSources,
} from './native-consumer.js';
import { nativeDecisionJsonSize, nativeDecisionJsonText } from './native-decision-prompt.js';

type RequestCapacity = Pick<NativeWorld, 'reserveConsumerBytes'>;

export type { DecisionAnswer, DecisionTask } from './decision-task-compiler.js';

export function decisionOrigin(config: AppConfig): string {
  return config.macrofoldKey
    ? `macrofold/${macrofoldJudgmentModel(config)}`
    : `jev/${config.jevModel}`;
}
export function decisionPolicyDigest(config: AppConfig): string {
  return digest({
    policy: config.decisionEscalation,
    model: DECISION_MODEL,
    effort: DECISION_EFFORT,
    origin: decisionOrigin(config),
    judgment: config.modelTargets?.purposes.judgment
      ? { workspace: config.modelTargets.workspace_id, ...config.modelTargets.purposes.judgment }
      : undefined,
    budget: config.budgetUsd,
    prices: config.llmModelPrices,
    directAccount: digest(config.llmKey),
    originAccount: digest(config.macrofoldKey || config.jevKey),
    endpoint: config.macrofoldUrl,
    billing: config.macrofoldBillingMode,
    jevOnly: config.jevOnly,
  });
}
export function permitsEscalation(config: AppConfig, reason?: DecisionReason): boolean {
  return (
    config.decisionEscalation.mode !== 'off' &&
    !config.jevOnly &&
    !!config.llmKey &&
    config.decisionEscalation.origins.includes(decisionOrigin(config)) &&
    (!reason || config.decisionEscalation.reasons.includes(reason))
  );
}
/** The director and policy qualification use the existing suitability outcome, never a
 * benchmark reference or a new confidence threshold. Empty pure choices cannot be repaired. */
export function level1EscalationReason(outcome: Level1Outcome): DecisionReason | undefined {
  if (outcome.kind !== 'defer' && outcome.kind !== 'escalate') return undefined;
  if (outcome.reason === 'missing-answers' || outcome.reason === 'invalid-answers')
    return 'invalid-output';
  if (outcome.reason === 'no-suitable-action') return 'abstained';
  if (outcome.reason === 'uncertain-selection') return 'semantic-escalation';
  return undefined;
}
/** A resource/refusal error is not a bad answer. A receipt must establish independent
 * non-invocation before a route limitation can justify spending on another provider. */
export function decisionFailureReason(
  outcome: string,
  reason: string,
  receipt?: AiReceipt,
): DecisionReason | undefined {
  if (!receipt || receipt.completionUncertain || outcome === 'refused' || outcome === 'cancelled')
    return undefined;
  const code = /^[a-z0-9_.:-]+$/i.test(reason) ? reason : '';
  const evidence = [code, receipt.providerErrorCode, receipt.providerErrorType]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (
    [401, 403, 429].includes(receipt.httpStatus ?? 0) ||
    /budget|quota|credit|billing|rate.?limit|too_many_requests|authentication|api_key|refus/.test(
      evidence,
    )
  )
    return undefined;
  if (
    !receipt.dispatched &&
    /context|input_too_large|exceeds_|unsupported_model|model_not_found|model_unavailable|route_unavailable/.test(
      evidence,
    )
  )
    return 'route-unavailable';
  return outcome === 'invalid' && receipt.dispatched ? 'invalid-output' : undefined;
}
/** Opt-in interpretation for an ordered primary-model rubric. Retain the raw number;
 * this never applies to continuous action suitability or a fallback probability. */
export function orderedRating(raw: number, categories: Record<string, string>, nearest = false) {
  const indices = Object.keys(categories)
    .map(Number)
    .sort((a, b) => a - b);
  if (!Number.isFinite(raw) || !indices.length || indices.some((n) => !Number.isSafeInteger(n)))
    return undefined;
  if (!nearest) return indices.includes(raw) ? { raw, category: raw } : undefined;
  const category = indices.reduce((best, candidate) =>
    Math.abs(candidate - raw) <= Math.abs(best - raw) ? candidate : best,
  );
  return { raw, category };
}
/** Runtime admission keeps its own byte limits; offline comparisons can compile the
 * identical contract for larger retained evidence without lifting gameplay limits. */
export function prepareDecisionTask(
  tasks: Record<string, DecisionTask>,
  context: string,
  worldInstructions = '',
  capacity?: RequestCapacity,
) {
  if (!capacity) return prepareUnreservedDecisionTask(tasks, context, worldInstructions);
  const prepared = compileDecisionTask(tasks, context, worldInstructions, capacity);
  try {
    checkDecisionTaskSize(prepared, (schema) => nativeDecisionJsonSize(capacity, schema));
    return prepared;
  } catch (error) {
    releaseNativeProduct(prepared);
    throw error;
  }
}

/** Fund native capture products before invoking the shared decision compiler. */
export function compileDecisionTask(
  tasks: Record<string, DecisionTask>,
  context: string,
  worldInstructions = '',
  capacity?: RequestCapacity,
) {
  if (!capacity) return compileUnreservedDecisionTask(tasks, context, worldInstructions);
  const count = decisionRecordEntries(tasks);
  let bytes = decisionArrayBytes(count) + decisionObjectBytes(count);
  for (const key in tasks) {
    if (!Object.hasOwn(tasks, key)) continue;
    const task = tasks[key]!;
    // Answer/status/reason/value wrappers and their fixed fields. An existing
    // selected response/appraisal schema is borrowed by its request wrapper.
    bytes += decisionObjectBytes(8) * 12;
    if (task.valueSchema) continue;
    const values = task.choices ?? task.categories ?? task.candidates;
    if (values) bytes += decisionRecordEntries(values) * decisionObjectBytes(1);
  }
  return admitDecisionGraph(capacity, bytes, () => {
    const parts = decisionTaskParts(tasks, context, worldInstructions);
    const schema = projectDecisionSchema(capacity, parts.schema);
    let input: ReturnType<typeof nativeDecisionJsonText> | undefined;
    const digestInput = (value: unknown) => {
      const workspace = reserveNativeJsonTextWorkspace(capacity, value);
      try {
        return digest(value);
      } finally {
        workspace.release();
      }
    };
    try {
      input = nativeDecisionJsonText(capacity, parts.input);
      const compiled = finishDecisionTask(parts, input.text, schema, digestInput);
      return retainNativeSources(compiled, schema, input);
    } finally {
      releaseNativeProduct(schema);
      if (input) releaseNativeProduct(input);
    }
  });
}
export function higherDecisionAllowance(
  config: AppConfig,
  request: ReturnType<typeof prepareDecisionTask>,
  jsonSize: (value: unknown) => number = (value) => Buffer.byteLength(JSON.stringify(value)),
): number {
  if (!modelTokenPrices(config.llmModelPrices, DECISION_MODEL))
    throw new Error('Exact Luna fallback pricing is not configured.');
  const bytes =
    jsonSize({
      model: DECISION_MODEL,
      instructions: request.instructions,
      input: request.context,
      schema: request.schema,
      reasoning: { effort: DECISION_EFFORT },
      store: false,
    }) + 4096;
  return generationAllowance(
    config,
    DECISION_MODEL,
    bytes,
    DECISION_LIMITS.outputTokens,
    Math.max(0.25, config.llmReserveUsd),
    'openai',
  );
}
