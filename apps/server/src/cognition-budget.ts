import type { AppConfig } from './config.js';

/** Same conservative allowance for cheap preflight and authoritative paid admission. */
export function decisionAllowance(config: AppConfig, provider: 'jev' | 'openai'): number {
  if (config.macrofoldKey)
    return provider === 'jev' ? config.jevReserveUsd : config.macrofoldRunUsd;
  const prices = provider === 'jev' ? config.jevPrices : config.llmPrices;
  return Math.max(
    provider === 'jev' ? config.jevReserveUsd : Math.max(0.25, config.llmReserveUsd),
    (500000 *
      Math.max(
        prices.inputUsdPerMillion,
        provider === 'openai' ? config.llmPrices.cacheWriteInputUsdPerMillion : 0,
      ) +
      8192 * prices.outputUsdPerMillion) /
      1e6,
  );
}
/** Reserve one interactive response plus optional native interpretation, attention and embeddings. */
export function interactiveAllowance(config: AppConfig): number {
  if (config.macrofoldKey)
    return 2 * config.macrofoldRunUsd + 3 * config.jevReserveUsd + config.embeddingReserveUsd;
  const inputPrice = Math.max(
    config.llmPrices.inputUsdPerMillion,
    config.llmPrices.cacheWriteInputUsdPerMillion,
  );
  const generation = Math.max(
    0.25,
    config.llmReserveUsd,
    (120000 * inputPrice + 8192 * config.llmPrices.outputUsdPerMillion) / 1e6,
  );
  const judgment = Math.max(
    config.jevReserveUsd,
    (120000 * config.jevPrices.inputUsdPerMillion) / 1e6,
  );
  return 2 * generation + 3 * judgment + config.embeddingReserveUsd;
}
