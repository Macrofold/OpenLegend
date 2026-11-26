import type { GenerateRequest } from '@open-legend/ai';

export const DEFAULT_MACROFOLD_MODEL = 'meta/muse-spark-1.3-contributor';

// Both live provisioning and the stand-alone release use the same workspace authority.
export const COGNITION_PERMISSIONS = {
  version: 1,
  shell: 'deny',
  files: {
    read: { include: ['mind/*.md'] },
    write: { include: ['mind/*.md'], exclude: ['mind/identity.md'] },
  },
  tools: { include: [] },
};

/** OpenRouter wire parameters. Macrofold must forward these without dropping or
 * downgrading unsupported options, including on continued harness sessions. */
export function macrofoldModelParameters(
  execution?: GenerateRequest['execution'],
  effort?: GenerateRequest['reasoningEffort'],
) {
  return {
    reasoning: { effort: effort ?? (execution === 'full' ? ('xhigh' as const) : ('low' as const)) },
    provider: { require_parameters: true },
  };
}

// Reasoning and the final typed response share the output ceiling; monetary caps
// still apply independently of the requested effort.
export function cognitionOutputTokens(execution?: GenerateRequest['execution']) {
  return execution === 'complex' ? 16384 : 2048;
}
