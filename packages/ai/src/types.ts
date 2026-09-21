export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonSchema = Record<string, unknown>;

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string | null>;
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string;
  criteria: string[];
}

export interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria?: { true?: string; false?: string };
}

export type JudgmentQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;
export type TypedQuestionMap = Record<string, JudgmentQuestion>;
export type JudgmentAnswer =
  | { type: 'choice'; choice: string; probabilities: Record<string, number>; confidence: number }
  | {
      type: 'score';
      score: number;
      legend: Record<string, string>;
      probabilities: Record<string, number>;
      confidence: number;
    }
  | { type: 'noul'; noul: number };

export interface JudgeValue {
  answers: Record<string, JudgmentAnswer>;
}

export interface RequestControl {
  requestId: string;
  signal?: AbortSignal;
  /** Absolute Unix time in milliseconds. The client also enforces its configured timeout. */
  deadlineMs?: number;
}

export interface JudgeRequest extends RequestControl {
  state: unknown;
  questions: TypedQuestionMap;
}

export interface GenerateRequest extends RequestControl {
  model?: string;
  reasoningEffort?: 'none' | 'low' | 'high';
  actorScope?: string;
  execution?: 'fast' | 'complex' | 'full';
  /** Diagnostic task category; domain policy and instructions remain caller-owned. */
  task: string;
  instructions: string;
  context: unknown;
  schema: JsonSchema;
  schemaName?: string;
  maxOutputTokens?: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  cacheWriteInputTokens?: number;
  reasoningOutputTokens?: number;
}

/** Explicit caller-supplied rates, never a provider quotation or a billing ledger. */
export interface TokenPrices {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  cachedInputUsdPerMillion?: number;
  cacheWriteInputUsdPerMillion?: number;
}

export type AiProvider = 'jev' | 'openai' | 'macrofold';
export type AiFailureOutcome =
  | 'unknown'
  | 'unavailable'
  | 'invalid'
  | 'failed'
  | 'refused'
  | 'cancelled'
  | 'uncertain';

export interface AiReceipt {
  requestId: string;
  provider: AiProvider;
  requestedModel: string;
  /** Provider-reported model when available; otherwise the requested model. */
  model: string;
  modelVersionStatus: 'reported' | 'unavailable';
  providerRequestId?: string;
  contextDigest: string;
  providerRequestDigest?: string;
  startedAt: string;
  completedAt: string;
  /** Open Legend wall time around the adapter call. */
  latencyMs: number;
  /** Provider execution time when the intermediary reports authoritative timestamps. */
  providerLatencyMs?: number;
  /** Provider queue time before execution, when reported separately. */
  providerQueueLatencyMs?: number;
  dispatched: boolean;
  completionUncertain: boolean;
  httpStatus?: number;
  usage?: TokenUsage;
  estimatedCostUsd?: number;
}

export type AiResult<T> =
  | { outcome: 'value'; value: T; receipt: AiReceipt }
  | { outcome: AiFailureOutcome; reason: string; receipt: AiReceipt };

export type FetchTransport = (input: string, init: RequestInit) => Promise<Response>;

export interface ProviderConfig {
  apiKey: string;
  model?: string;
  /** Trusted server configuration only. Never accept an endpoint from a game request. */
  endpoint?: string;
  prices?: TokenPrices;
}

export interface OpenAiProviderConfig extends ProviderConfig {
  /** Set only for a model whose documented capabilities support it. */
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
}

export interface AiClientConfig {
  jev?: ProviderConfig;
  openai?: OpenAiProviderConfig;
  fetch?: FetchTransport;
  timeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  maxOutputTokens?: number;
}

export interface AiClient {
  judge(request: JudgeRequest): Promise<AiResult<JudgeValue>>;
  generate<T = JsonValue>(request: GenerateRequest): Promise<AiResult<T>>;
}
