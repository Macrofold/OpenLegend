import type { GameView } from '@open-legend/protocol';

/** Explain local setup without credentials or provider internals crossing into the client. */
export function aiSetupReason(ai: GameView['ai']): string | null {
  // Explicit test fixtures do not use live credentials or a paid allowance.
  if (ai.mode === 'fixture') return null;
  const missing = [
    ...(!ai.jevConfigured ? ['Jev'] : []),
    ...(!ai.llmConfigured ? ['the language model'] : []),
  ];
  if (missing.length) {
    const allowance = ai.allowanceLimitUsd <= 0 ? ' and a world allowance' : '';
    return `Talk and invention need ${missing.join(' and ')}${allowance}. Set up AI to continue.`;
  }
  if (ai.allowanceLimitUsd <= 0)
    return 'AI is configured, but this world has no spending allowance. Set an allowance to use Talk and invention.';
  return null;
}
