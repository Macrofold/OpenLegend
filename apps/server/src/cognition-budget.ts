import type { AppConfig } from './config.js';
/** Reserve room for one complete interactive pipeline, including attention and embeddings. */
export function interactiveAllowance(config: AppConfig): number {
  if (config.macrofoldKey)
    return config.macrofoldRunUsd + 3 * config.jevReserveUsd + config.embeddingReserveUsd;
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
  return generation + 3 * judgment + config.embeddingReserveUsd;
}
