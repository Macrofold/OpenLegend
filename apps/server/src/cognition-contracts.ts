  .strict();
export const LEVEL_LIMITS = {
  2: { outputTokens: 1024, effort: 'low' as const },
  3: { outputTokens: 4096, effort: 'low' as const },
  4: { outputTokens: 8192, effort: 'high' as const },
};

