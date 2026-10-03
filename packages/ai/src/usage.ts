import { usdToMicroUsd } from './cost.js';
import type { ModelTokenPrices, TokenPrices, TokenUsage } from './types.js';

/** Prices belong to the admitted model; a different reported identity needs its explicit alias. */
export function modelTokenPrices(
  catalogue: readonly ModelTokenPrices[],
  requestedModel: string,
  reportedModel = requestedModel,
): TokenPrices | undefined {
  const entry = catalogue.find(({ model }) => model === requestedModel);
  return entry &&
    (reportedModel === requestedModel || entry.reportedAliases?.includes(reportedModel))
    ? entry.prices
    : undefined;
}

/** Estimate from explicit rates. Undefined means unpriced, never free. */
export function estimateCostUsd(
  usage: TokenUsage | undefined,
  prices: TokenPrices | undefined,
): number | undefined {
  if (!usage || !prices) return undefined;
  const counters = Object.values(usage);
  const rates = Object.values(prices);
  if (
    counters.some((n) => !Number.isSafeInteger(n) || n < 0) ||
    rates.some((n) => !Number.isFinite(n) || n < 0) ||
    !Number.isFinite(prices.inputUsdPerMillion) ||
    !Number.isFinite(prices.outputUsdPerMillion)
  )
    return undefined;
  const cached = usage.cachedInputTokens ?? 0;
  const written = usage.cacheWriteInputTokens ?? 0;
  if (
    cached + written > usage.inputTokens ||
    (usage.reasoningOutputTokens ?? 0) > usage.outputTokens
  )
    return undefined;
  // Cache-write premiums must not silently be priced as ordinary input.
  if (written > 0 && prices.cacheWriteInputUsdPerMillion === undefined) return undefined;
  const total =
    ((usage.inputTokens - cached - written) * prices.inputUsdPerMillion +
      cached * (prices.cachedInputUsdPerMillion ?? prices.inputUsdPerMillion) +
      written * (prices.cacheWriteInputUsdPerMillion ?? prices.inputUsdPerMillion) +
      usage.outputTokens * prices.outputUsdPerMillion) /
    1_000_000;
  return usdToMicroUsd(total) !== undefined ? total : undefined;
}
