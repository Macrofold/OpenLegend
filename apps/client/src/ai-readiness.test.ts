import { describe, expect, it } from 'vitest';
import type { GameView } from '@open-legend/protocol';
import { aiSetupReason } from './ai-readiness';

const configured: GameView['ai'] = {
  mode: 'live',
  jevConfigured: true,
  llmConfigured: true,
  message: 'Configured',
  jobs: [],
  budget: { limitUsd: 1, spentUsd: 0, reservedUsd: 0, estimated: true },
  usage: { jevCalls: 0, llmCalls: 0, inputTokens: 0, outputTokens: 0, lastLatencyMs: 0 },
};

describe('composer AI setup guidance', () => {
  it('names both missing providers and a missing allowance together', () => {
    expect(
      aiSetupReason({
        ...configured,
        mode: 'unconfigured',
        jevConfigured: false,
        llmConfigured: false,
        budget: { ...configured.budget, limitUsd: 0 },
      }),
    ).toBe(
      'Talk and invention need Jev and the language model and a world allowance. Set up AI to continue.',
    );
  });

  it('does not suggest that an LLM key alone is enough for Jev-routed conversation', () => {
    expect(aiSetupReason({ ...configured, jevConfigured: false })).toContain('need Jev.');
    expect(aiSetupReason({ ...configured, llmConfigured: false })).toContain(
      'need the language model.',
    );
  });

  it('separates configured providers from permission to spend', () => {
    expect(
      aiSetupReason({ ...configured, budget: { ...configured.budget, limitUsd: 0 } }),
    ).toContain('no spending allowance');
    expect(
      aiSetupReason({ ...configured, budget: { ...configured.budget, spentUsd: 1 } }),
    ).toContain('allowance is used up');
  });

  it('does not ask to reconfigure when allowance is temporarily reserved by pending work', () => {
    expect(
      aiSetupReason({ ...configured, budget: { ...configured.budget, reservedUsd: 1 } }),
    ).toBeNull();
    expect(aiSetupReason(configured)).toBeNull();
  });

  it('keeps explicitly marked fixtures usable without suggesting they are live AI', () => {
    expect(
      aiSetupReason({
        ...configured,
        mode: 'fixture',
        jevConfigured: false,
        llmConfigured: false,
        budget: { ...configured.budget, limitUsd: 0 },
      }),
    ).toBeNull();
  });
});
