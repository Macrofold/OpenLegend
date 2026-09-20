import type { GenerateRequest } from '@open-legend/ai';

export const DEFAULT_MACROFOLD_MODEL = 'meta/muse-spark-1.3-contributor';

/** OpenRouter wire parameters. Macrofold must forward these without dropping or
 * downgrading unsupported options, including on continued harness sessions. */
export function macrofoldModelParameters(execution?: GenerateRequest['execution']) {
  return {
    reasoning: { effort: execution === 'fast' ? ('low' as const) : ('xhigh' as const) },
    provider: { require_parameters: true },
  };
}

// Output ceilings include reasoning tokens. Complex thoughts need room for both
// xhigh-effort reasoning and the final typed response; monetary caps still apply.
export function cognitionOutputTokens(execution?: GenerateRequest['execution']) {
  return execution === 'complex' ? 16384 : 2048;
}
