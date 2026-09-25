  .strict();
export const LEVEL_LIMITS = {
  2: { inputBytes: 100000, outputTokens: 1024, visibleBytes: 1200, effort: 'low' as const },
  3: { inputBytes: 100000, outputTokens: 4096, visibleBytes: 1200, effort: 'low' as const },
  4: { inputBytes: 100000, outputTokens: 8192, visibleBytes: 1200, effort: 'high' as const },
  5: { inputBytes: 120000, outputTokens: 4096, visibleBytes: 720, effort: 'high' as const },
};

