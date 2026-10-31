import type { GenerateRequest } from '@open-legend/ai';

export const DEFAULT_MACROFOLD_MODEL = 'meta/muse-spark-1.3-contributor';

/** OpenRouter wire parameters. Macrofold must forward these without dropping or
 * downgrading unsupported options, including on continued harness sessions. */
export function macrofoldModelParameters(effort: GenerateRequest['reasoningEffort'] = 'low') {
  return {
    reasoning: { effort },
    provider: { require_parameters: true },
  };
}

// Reasoning and the final typed response share the output ceiling; monetary caps
// still apply independently of the requested effort.
export function cognitionOutputTokens(execution?: GenerateRequest['execution']) {
  return execution === 'complex' ? 16384 : 2048;
}
