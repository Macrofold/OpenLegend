import { createHash } from 'node:crypto';
import Ajv, { type ValidateFunction } from 'ajv';
import type {
  JudgmentAnswer,
  JudgeValue,
  TypedQuestionMap,
  TokenUsage,
  JsonSchema,
  GenerateRequest,
} from './types.js';
import { jsonQuotedUnits, schemaCompileWorkspace } from './schema-capacity.js';

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

/** Strict JSON, canonical by default: no implicit toJSON, omitted undefined values, cycles, or non-finite numbers. */
export function serialize(
  value: unknown,
  maxBytes: number,
  options: { preserveKeyOrder?: boolean } = {},
): string {
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
      // Schema property order controls the generated field order. Transport may
      // preserve it while canonical validation/digests keep the default sorting.
      const keys = Object.keys(v);
      if (!options.preserveKeyOrder) keys.sort();
      for (const key of keys) {
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

/** One operation owns these validated bytes through hashing, journaling and HTTP.
 * This is not a reusable authority check or a cache of a mutable caller object. */
export class PreparedJson {
  readonly #text: string;
  readonly #bytes: number;
  constructor(value: unknown, maxBytes: number) {
    // Schema fields and offered choices have intentional order. Capture that
    // order through the envelope; canonical comparisons use serialize directly.
    this.#text = serialize(value, maxBytes, { preserveKeyOrder: true });
    this.#bytes = Buffer.byteLength(this.#text);
  }
  text(maxBytes: number): string {
    if (this.#bytes > maxBytes) throw new InvalidData('request_too_large');
    return this.#text;
  }
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

/** Keep offered choice order as well as values through asynchronous execution.
 * Canonical JSON sorts object keys, so its parsed copy cannot own tie-breaking. */
export function prepareQuestions(value: unknown, maxBytes: number): TypedQuestionMap {
  serialize(value, maxBytes);
  const captured: unknown = structuredClone(value);
  validateQuestions(captured);
  freezeJson(captured);
  return captured;
}

function freezeJson(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeJson(child);
  Object.freeze(value);
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
  // A decision about only part of the required evidence cannot answer the
  // original supplied question. Missing optional diagnostics remain allowed.
  if (data.truncated === true) throw new InvalidData('judgment_input_truncated');
  const answers: Record<string, JudgmentAnswer> = Object.create(null) as Record<
    string,
    JudgmentAnswer
  >;
  for (const [id, q] of Object.entries(questions)) {
    const answer = data.answers[id];
    if (!record(answer) || answer.type !== q.type) throw new InvalidData('invalid_answer_type');
    // Native decision models can omit confidence. Preserve that absence; only
    // callers requiring a separate confidence measure should abstain for it.
    const confidence =
      Object.hasOwn(answer, 'confidence') && finite(answer.confidence)
        ? answer.confidence
        : undefined;
    if (Object.hasOwn(answer, 'confidence') && confidence === undefined)
      throw new InvalidData(`invalid_${q.type}_answer`);
    if (q.type === 'choice') {
      const distribution = probabilities(answer.probabilities, Object.keys(q.criteria));
      // Select from offered choices; preserve raw scores, with the first offered winning ties.
      const choice = Object.keys(q.criteria).reduce((best, key) =>
        distribution[key]! > distribution[best]! ? key : best,
      );
      answers[id] = {
        type: 'choice',
        choice,
        probabilities: distribution,
        ...(confidence === undefined ? {} : { confidence }),
      };
    } else if (q.type === 'score') {
      const keys = q.criteria.map((_, index) => String(index));
      if (!finite(answer.score)) throw new InvalidData('invalid_score_answer');
      const distribution = probabilities(answer.probabilities, keys);
      answers[id] = {
        type: 'score',
        score: answer.score,
        legend: Object.fromEntries(q.criteria.map((label, index) => [String(index), label])),
        probabilities: distribution,
        ...(confidence === undefined ? {} : { confidence }),
      };
    } else {
      if (!finite(answer.noul)) throw new InvalidData('invalid_noul_answer');
      answers[id] = {
        type: 'noul',
        noul: answer.noul,
        ...(confidence === undefined ? {} : { confidence }),
      };
    }
  }
  return { answers };
}

/** Trusted caller schemas only. No references, external loading, coercion, mutation, or default insertion. */
export function compileSchema(schema: unknown, bounded = false): ValidateFunction {
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
      // Native admission uses the pinned looped, single-render CodeGen profile.
      // It preserves strict validation while bounding the compiler's scratch.
      ...(bounded ? { loopRequired: 1, loopEnum: 1, code: { optimize: false } } : {}),
    }).compile(schema);
  } catch {
    throw new InvalidData('invalid_schema');
  }
}

/** Size the independent JSON copy without constructing the serialized text or
 * a second graph. The carrier allowances match the host's JSON decode model. */
export function jsonCaptureBytes(schema: unknown): number {
  let nodes = 0;
  let carriers = 0;
  let textUnits = 0;
  const string = (value: string) => {
    carriers += 64;
    // Count actual escaping before allocation, including isolated UTF-16 units.
    textUnits += jsonQuotedUnits(value);
  };
  const visit = (value: unknown, depth: number): void => {
    if (++nodes > 20_000 || depth > 32) throw new InvalidData('json_complexity_limit');
    if (typeof value === 'string') {
      string(value);
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      textUnits += 25;
      return;
    }
    if (value === null || typeof value === 'boolean') {
      textUnits += 5;
      return;
    }
    if (!record(value) && !Array.isArray(value)) throw new InvalidData('non_json_input');
    carriers += 256;
    textUnits += 2;
    if (Array.isArray(value)) {
      if (value.length > 20_000) throw new InvalidData('json_complexity_limit');
      carriers += 64 * value.length;
      textUnits += value.length;
      for (let index = 0; index < value.length; index++) {
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor || !('value' in descriptor)) throw new InvalidData('non_json_input');
        visit(descriptor.value, depth + 1);
      }
      return;
    }
    for (const key in value) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) continue;
      if (!('value' in descriptor)) throw new InvalidData('non_json_input');
      carriers += 512;
      textUnits += 2;
      string(key);
      visit(descriptor.value, depth + 1);
    }
  };
  visit(schema, 0);
  // Input, flattening and parsed string backing can overlap the graph.
  return 64 * 1024 + carriers + 6 * textUnits;
}

/** Count the decoded carriers from bounded wire text before JSON.parse. Syntax
 * and supported complexity remain the existing parser/serializer's concern. */
export function jsonTextCaptureBytes(text: string): number {
  let bytes = 64 * 1024 + 6 * text.length;
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '\\') index++;
      else if (character === '"') quoted = false;
    } else if (character === '"') {
      quoted = true;
      bytes += 64;
    } else if (character === '{') bytes += 256;
    else if (character === '[') bytes += 256 + 64;
    else if (character === ':') bytes += 512;
    else if (character === ',') bytes += 64;
  }
  return bytes;
}

function immutableJson(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true;
  if (!Object.isFrozen(value)) return false;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++)
      if (!immutableJson(value[index])) return false;
  } else {
    for (const key in value)
      if (Object.hasOwn(value, key) && !immutableJson((value as Record<string, unknown>)[key]))
        return false;
  }
  return true;
}

/** Capture the exact schema once; later caller mutation cannot change its request
 * or the validator retained across the provider wait. No cross-request cache. */
export function prepareSchema(
  schema: unknown,
  maxBytes: number,
  reserve?: NonNullable<GenerateRequest['allocation']>['reserveBytes'],
  borrow?: NonNullable<GenerateRequest['allocation']>['borrow'],
) {
  const capture = () =>
    JSON.parse(serialize(schema, maxBytes, { preserveKeyOrder: true })) as JsonSchema;
  if (!reserve) {
    const captured = capture();
    const validate = compileSchema(captured);
    freezeJson(captured);
    return Object.freeze({ schema: captured, validate, release: undefined });
  }
  // Fund the shape walk before it reads descriptors or allocates its stack
  // and path work. The strict existing serializer still owns JSON validation.
  const preflight = reserve(64 * 1024);
  let cloneBytes: number;
  let compiler: ReturnType<typeof schemaCompileWorkspace>;
  let immutable = false;
  try {
    cloneBytes = jsonCaptureBytes(schema);
    compiler = schemaCompileWorkspace(schema);
    immutable = !!borrow && immutableJson(schema);
  } finally {
    preflight.release();
  }
  const input = immutable ? borrow!(schema as object) : undefined;
  let retained: ReturnType<NonNullable<GenerateRequest['allocation']>['reserveBytes']> | undefined;
  try {
    retained = reserve((input ? 0 : cloneBytes) + compiler.retainedBytes);
    let captured: JsonSchema;
    const cloning = reserve(cloneBytes);
    try {
      // Keep strict JSON/size validation even when the independent input owner
      // proves the complete graph immutable. Shallow freezes still copy.
      captured = input
        ? (serialize(schema, maxBytes, { preserveKeyOrder: true }), schema as JsonSchema)
        : capture();
    } finally {
      cloning.release();
    }
    const compiling = reserve(compiler.peakBytes - compiler.retainedBytes);
    try {
      const validate = compileSchema(captured, true);
      freezeJson(captured);
      return Object.freeze({
        schema: captured,
        validate,
        release: () => {
          retained!.release();
          input?.release();
        },
      });
    } finally {
      compiling.release();
    }
  } catch (error) {
    retained?.release();
    input?.release();
    throw error;
  }
}

export type PreparedSchema = ReturnType<typeof prepareSchema>;

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
