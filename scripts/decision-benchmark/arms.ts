import type {
  GenerateRequest,
  ModelTokenPrices,
  TokenPrices,
} from '../../packages/ai/src/index.js';

export const benchmarkArms = [
  {
    id: 'typesafe/jev-1.13',
    alias: 'jev',
    model: 'typesafe/jev-1.13',
    transport: 'macrofold-decision',
    inputRate: 0.042,
    outputRate: 0,
  },
  {
    id: 'microsoft/microsoft-decision-1',
    alias: 'microsoft',
    model: 'microsoft/microsoft-decision-1',
    transport: 'macrofold-decision',
    inputRate: 0.042,
    outputRate: 0,
  },
  {
    id: 'openai/gpt-6-luna:decisions',
    alias: 'luna-decision',
    model: 'gpt-6-luna',
    transport: 'openai-decision',
    inputRate: 0.1,
    outputRate: 0,
  },
  {
    id: 'openai/gpt-6-luna:low',
    alias: 'luna-low',
    model: 'gpt-6-luna',
    transport: 'openai-response',
    effort: 'low',
    inputRate: 0.1,
    outputRate: 0.5,
  },
  {
    id: 'openai/gpt-6-luna:medium',
    alias: 'luna-medium',
    model: 'gpt-6-luna',
    transport: 'openai-response',
    effort: 'medium',
    inputRate: 0.1,
    outputRate: 0.5,
  },
  {
    id: 'openai/gpt-6-luna:high',
    alias: 'luna-high',
    model: 'gpt-6-luna',
    transport: 'openai-response',
    effort: 'high',
    inputRate: 0.1,
    outputRate: 0.5,
  },
  {
    id: 'meta/muse-spark-1.3-contributor',
    alias: 'spark-contributor',
    model: 'meta/muse-spark-1.3-contributor',
    transport: 'macrofold-generation',
    effort: 'medium',
    inputRate: 0.1,
    outputRate: 0.2,
  },
] as const;
/** Opt-in experiments do not alter the frozen original comparison's arm set. */
export const experimentalArms = [
  {
    id: 'openai/gpt-6-luna:none',
    alias: 'luna-none',
    model: 'gpt-6-luna',
    transport: 'openai-response',
    effort: 'none',
    inputRate: 0.1,
    outputRate: 0.5,
  },
] as const;
export interface BenchmarkArm {
  id: string;
  alias: string;
  model: string;
  transport: 'macrofold-decision' | 'openai-decision' | 'openai-response' | 'macrofold-generation';
  inputRate: number;
  outputRate: number;
  effort?: GenerateRequest['reasoningEffort'];
  prices?: TokenPrices;
  modelPrices?: readonly ModelTokenPrices[];
  billingMode?: 'managed' | 'byok';
  providerConnectionId?: string;
  maxOutputTokens?: number;
  reservationUsd?: number;
  macrofoldDeployment?: GenerateRequest['macrofoldDeployment'];
  structuredOutput?: 'auto' | 'json_schema' | 'json_object' | 'prompted_json';
  originalArm?: string;
  replicate?: number;
}
export type BenchmarkArmId = string;
export const armById = new Map<string, BenchmarkArm>(
  [...benchmarkArms, ...experimentalArms].map((a) => [a.id, a]),
);
export function resolveArm(name: string): BenchmarkArmId | undefined {
  return [...armById.values()].find((a) => a.alias === name || a.id === name)?.id;
}
export const outputTokens = 8192;
export const lunaPrices: TokenPrices = {
  inputUsdPerMillion: 0.1,
  outputUsdPerMillion: 0.5,
  cachedInputUsdPerMillion: 0.01,
  cacheWriteInputUsdPerMillion: 0.125,
};
/** Byte-level upper bound includes framing, schemas and the complete bounded output budget.
 * Text tokenizer tokens cannot exceed UTF-8 byte units; no four-characters heuristic funds work.
 * A 1.25 input premium covers Responses cache writes; long-context premiums apply conservatively.
 */
export function reservationUsd(arm: BenchmarkArm, inputBytes: number): number {
  if (arm.reservationUsd !== undefined) return arm.reservationUsd;
  const upperInput = inputBytes + 4096;
  const long = upperInput > 272_000;
  const inputRate =
    (arm.prices
      ? Math.max(
          arm.prices.inputUsdPerMillion,
          arm.prices.cachedInputUsdPerMillion ?? 0,
          arm.prices.cacheWriteInputUsdPerMillion ?? 0,
        )
      : arm.inputRate * (arm.transport === 'openai-response' ? 1.25 : 1)) *
    (arm.transport.startsWith('openai') && long ? 2 : 1);
  const outputRate = arm.outputRate * (arm.transport === 'openai-response' && long ? 1.5 : 1);
  return (
    Math.ceil(
      ((upperInput * inputRate + (arm.maxOutputTokens ?? outputTokens) * outputRate + 100) /
        1_000_000) *
        1e6,
    ) / 1e6
  );
}

/** Chat embeds the context as JSON text inside another JSON request. Fund that
 * escaping before dispatch; the raw context byte count underfunds large archives.
 * Escaping the whole prepared input also covers the schema, conservatively.
 */
export function reservationForInputUsd(arm: BenchmarkArm, input: unknown): number {
  const serialized = JSON.stringify(input);
  return reservationUsd(
    arm,
    Buffer.byteLength(
      arm.transport === 'macrofold-generation' ? JSON.stringify(serialized) : serialized,
    ),
  );
}
