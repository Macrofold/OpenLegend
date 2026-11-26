import { describe, expect, it } from 'vitest';
import type { GameView } from '@open-legend/protocol';
import { aiSetupReason } from './ai-readiness';

const configured: GameView['ai'] = {
  mode: 'live',
  jevConfigured: true,
  llmConfigured: true,
  message: 'Configured',
  jobs: [],
  allowanceLimitUsd: 1,
};

describe('composer AI setup guidance', () => {
  it('names both missing providers and a missing allowance together', () => {
    expect(
      aiSetupReason({
        ...configured,
        mode: 'unconfigured',
        jevConfigured: false,
        llmConfigured: false,
        allowanceLimitUsd: 0,
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
    expect(aiSetupReason({ ...configured, allowanceLimitUsd: 0 })).toContain(
      'no spending allowance',
    );
    expect(aiSetupReason(configured)).toBeNull();
  });

  it('does not ask to reconfigure while a job is pending', () => {
    expect(
      aiSetupReason({
        ...configured,
        jobs: [{ id: 'pending', kind: 'chat', status: 'judging', message: 'Pending' }],
      }),
    ).toBeNull();
  });

  it('keeps explicitly marked fixtures usable without suggesting they are live AI', () => {
    expect(
      aiSetupReason({
        ...configured,
        mode: 'fixture',
        jevConfigured: false,
        llmConfigured: false,
        allowanceLimitUsd: 0,
      }),
    ).toBeNull();
  });
});
