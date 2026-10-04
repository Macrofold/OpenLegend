import { createHash } from 'node:crypto';
import Ajv, { type ValidateFunction } from 'ajv';
import type { JudgmentAnswer, JudgeValue, TypedQuestionMap, TokenUsage } from './types.js';

export class InvalidData extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

export function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Canonical JSON: no implicit toJSON, omitted undefined values, cycles, or non-finite numbers. */
export function serialize(value: unknown, maxBytes: number): string {
  let nodes = 0;
  const ancestors = new Set<object>();
  function visit(v: unknown, depth: number): unknown {
    if (++nodes > 20_000 || depth > 32) throw new InvalidData('json_complexity_limit');
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      if (Buffer.byteLength(v) > maxBytes) throw new InvalidData('request_too_large');
      return v;
    }
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'object' || v === null || ancestors.has(v))
      throw new InvalidData('non_json_input');
    const proto: unknown = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null)
      throw new InvalidData('non_json_input');
    ancestors.add(v);
    let result: unknown;
    if (Array.isArray(v)) {
      if (v.length > 20_000) throw new InvalidData('json_complexity_limit');
      result = Array.from(v, (item) => visit(item, depth + 1));
    } else {
      const obj: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const key of Object.keys(v).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(v, key);
        if (!descriptor || !('value' in descriptor)) throw new InvalidData('non_json_input');
        obj[key] = visit(descriptor.value, depth + 1);
      }
      result = obj;
    }
    ancestors.delete(v);
    return result;
  }
  const result = JSON.stringify(visit(value, 0));
  if (Buffer.byteLength(result) > maxBytes) throw new InvalidData('request_too_large');
  return result;
}

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nonempty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function validateQuestions(value: unknown): asserts value is TypedQuestionMap {
  if (!record(value) || Object.keys(value).length < 1) throw new InvalidData('invalid_questions');
  for (const [id, q] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !record(q) || !nonempty(q.instructions))
      throw new InvalidData('invalid_questions');
    if (q.type === 'choice') {
      if (
        !record(q.criteria) ||
        Object.keys(q.criteria).length < 2 ||
        Object.keys(q.criteria).length > 255 ||
        Object.entries(q.criteria).some(
          ([k, v]) => !nonempty(k) || (v !== null && typeof v !== 'string'),
        )
      )
        throw new InvalidData('invalid_choice_question');
    } else if (q.type === 'score') {
      if (
        !Array.isArray(q.criteria) ||
        q.criteria.length < 2 ||
        q.criteria.length > 10 ||
        !q.criteria.every(nonempty)
      )
        throw new InvalidData('invalid_score_question');
    } else if (q.type === 'noul') {
      if (
        q.criteria !== undefined &&
        (!record(q.criteria) ||
          Object.entries(q.criteria).some(
            ([k, v]) => !['true', 'false'].includes(k) || !nonempty(v),
          ))
      )
        throw new InvalidData('invalid_noul_question');
    } else throw new InvalidData('invalid_question_type');
  }
}

// Conservative application estimates (4 characters/token), not a provider question-count limit.
// docs/ai-providers.md#provider-behavior-and-limits
export const JUDGMENT_MAX_CHARACTERS = 55_000 * 4;
export const JUDGMENT_STATE_QUESTION_CHARACTERS = 28_000 * 4;
export function validateJudgmentSize(state: unknown, questions: TypedQuestionMap): void {
  const stateSize = JSON.stringify(state).length;
  const longest = Math.max(0, ...Object.values(questions).map((q) => JSON.stringify(q).length));
  if (JSON.stringify({ state, questions }).length > JUDGMENT_MAX_CHARACTERS)
    throw new InvalidData('judgment_exceeds_55000_estimated_tokens');
  if (stateSize + longest > JUDGMENT_STATE_QUESTION_CHARACTERS)
    throw new InvalidData('judgment_state_question_exceeds_28000_estimated_tokens');
}

function probabilities(value: unknown, keys: string[]): Record<string, number> {
  if (!record(value)) throw new InvalidData('invalid_probabilities');
  const result: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const key of keys) {
    const probability = value[key];
    // Callers compare raw values with their own thresholds, without grading provider math.
    // docs/ai-providers.md#provider-behavior-and-limits
    if (!Object.hasOwn(value, key) || !finite(probability))
      throw new InvalidData('invalid_probabilities');
    result[key] = probability;
  }
  return result;
}

export function decodeJudge(data: unknown, questions: TypedQuestionMap): JudgeValue {
  if (!record(data) || !record(data.answers)) throw new InvalidData('invalid_answers');
  const answers: Record<string, JudgmentAnswer> = Object.create(null) as Record<
    string,
    JudgmentAnswer
  >;
  for (const [id, q] of Object.entries(questions)) {
    const answer = data.answers[id];
    if (!record(answer) || answer.type !== q.type) throw new InvalidData('invalid_answer_type');
    if (q.type === 'choice') {
      if (!finite(answer.confidence)) throw new InvalidData('invalid_choice_answer');
      const distribution = probabilities(answer.probabilities, Object.keys(q.criteria));
      // Select from offered choices; preserve raw scores, with the first offered winning ties.
      const choice = Object.keys(q.criteria).reduce((best, key) =>
        distribution[key]! > distribution[best]! ? key : best,
      );
      answers[id] = {
        type: 'choice',
        choice,
        probabilities: distribution,
        confidence: answer.confidence,
      };
    } else if (q.type === 'score') {
      const keys = q.criteria.map((_, index) => String(index));
      if (!finite(answer.score) || !finite(answer.confidence))
        throw new InvalidData('invalid_score_answer');
      const distribution = probabilities(answer.probabilities, keys);
      answers[id] = {
        type: 'score',
        score: answer.score,
        legend: Object.fromEntries(q.criteria.map((label, index) => [String(index), label])),
        probabilities: distribution,
        confidence: answer.confidence,
      };
    } else {
      if (!finite(answer.noul)) throw new InvalidData('invalid_noul_answer');
      answers[id] = { type: 'noul', noul: answer.noul };
    }
  }
  return { answers };
}

/** Trusted caller schemas only. No references, external loading, coercion, mutation, or default insertion. */
export function compileSchema(schema: unknown): ValidateFunction {
  if (!record(schema) || schema.type !== 'object' || schema.anyOf !== undefined)
    throw new InvalidData('invalid_schema');
  function inspect(node: unknown): void {
    if (Array.isArray(node)) {
      node.forEach(inspect);
      return;
    }
    if (!record(node)) return;
    if (
      Object.keys(node).some((k) =>
        ['$ref', '$dynamicRef', '$recursiveRef', '$id', '$async'].includes(k),
      )
    )
      throw new InvalidData('unsupported_schema_reference');
    if (
      node.type === 'object' ||
      (Array.isArray(node.type) && node.type.includes('object')) ||
      node.properties !== undefined
    ) {
      if (
        !record(node.properties) ||
        node.additionalProperties !== false ||
        !Array.isArray(node.required) ||
        !node.required.every((k) => typeof k === 'string') ||
        node.required.length !== Object.keys(node.properties).length ||
        !Object.keys(node.properties).every((k) => (node.required as unknown[]).includes(k))
      )
        throw new InvalidData('schema_must_require_all_properties');
    }
    // Property maps contain arbitrary field names (including "properties"); they are not schemas.
    // docs/architecture.md#shared-invention-workflow
    for (const [key, value] of Object.entries(node)) {
      if (
        ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'].includes(
          key,
        ) &&
        record(value)
      )
        Object.values(value).forEach(inspect);
      else if (!['const', 'enum', 'default', 'examples'].includes(key)) inspect(value);
    }
  }
  inspect(schema);
  try {
    return new Ajv({
      strict: true,
      allErrors: false,
      ownProperties: true,
      validateFormats: false,
    }).compile(schema);
  } catch {
    throw new InvalidData('invalid_schema');
  }
}

export function decodeUsage(data: unknown): TokenUsage | undefined {
  if (!record(data) || !record(data.usage)) return undefined;
  const usage = data.usage;
  const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
  if (!count(usage.input_tokens) || !count(usage.output_tokens)) return undefined;
  const result: TokenUsage = { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
  const input = record(usage.input_tokens_details) ? usage.input_tokens_details : {};
  const output = record(usage.output_tokens_details) ? usage.output_tokens_details : {};
  if (input.cached_tokens !== undefined) {
    if (!count(input.cached_tokens)) return undefined;
    result.cachedInputTokens = input.cached_tokens;
  }
  if (input.cache_write_tokens !== undefined) {
    if (!count(input.cache_write_tokens)) return undefined;
    result.cacheWriteInputTokens = input.cache_write_tokens;
  }
  if (output.reasoning_tokens !== undefined) {
    if (!count(output.reasoning_tokens) || output.reasoning_tokens > result.outputTokens)
      return undefined;
    result.reasoningOutputTokens = output.reasoning_tokens;
  }
  if ((result.cachedInputTokens ?? 0) + (result.cacheWriteInputTokens ?? 0) > result.inputTokens)
    return undefined;
  return result;
}
