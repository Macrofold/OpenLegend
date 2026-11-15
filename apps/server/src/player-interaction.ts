import type { PlayerInteractionAvailability } from '@open-legend/protocol';
import type { AppConfig } from './config.js';
import { interactiveAllowance } from './cognition-budget.js';

/** Current gameplay permission facts come from their actual Source/native
 * reader. Spending and scheduler admission remain application-owned. */
export interface PlayerInteractionFacts {
  readonly controlling: boolean;
  readonly paused: boolean;
  readonly pauseReason: 'manual' | 'away' | 'storage' | 'maintenance' | null;
  readonly actorAvailable: boolean;
  readonly recipientAvailable: boolean;
  readonly fundingActorId: string;
  readonly reply: boolean;
  readonly recipientName?: string;
}

type PlayerInteractionMode = 'speak' | 'act';

const unavailable = (
  facts: PlayerInteractionFacts,
  code: string,
  reason: string,
): PlayerInteractionAvailability => ({
  available: false,
  code,
  reason,
  reply: false,
  ...(facts.controlling && facts.recipientName ? { recipientName: facts.recipientName } : {}),
});

/** Evaluate the current gameplay and configuration prerequisites. Pure so a
 * reader can send a refusal inside its authorized turn. */
export function playerInteractionRefusal(
  mode: PlayerInteractionMode,
  config: AppConfig,
  facts: PlayerInteractionFacts,
): PlayerInteractionAvailability | undefined {
  if (!facts.controlling)
    return unavailable(facts, 'control', 'Resume control of your character to send.');
  if (facts.paused)
    return unavailable(
      facts,
      'paused',
      facts.pauseReason === 'storage'
        ? 'Saving must recover before sending.'
        : facts.pauseReason === 'maintenance'
          ? 'Sending is unavailable during maintenance.'
          : 'Resume the world to send.',
    );
  if (!facts.actorAvailable)
    return unavailable(
      facts,
      'actor-unavailable',
      mode === 'speak' ? 'Your character cannot speak now.' : 'Your character cannot act now.',
    );
  if (!facts.recipientAvailable)
    return unavailable(
      facts,
      'invalid-recipient',
      'Choose a known person or a person currently in sight.',
    );
  if (
    config.jevOnly ||
    !(config.macrofoldKey || config.jevKey) ||
    !(config.macrofoldKey || config.llmKey) ||
    config.budgetUsd <= 0
  )
    return unavailable(
      facts,
      'ai-unavailable',
      'Speak and Act need configured character AI and an allowance.',
    );
}

/** Decide with fresh facts after funding settles. Admission only checks current
 * scheduler capacity; it does not schedule or reserve a paid job. */
export function fundedPlayerInteractionAvailability(
  mode: PlayerInteractionMode,
  config: AppConfig,
  after: PlayerInteractionFacts,
  payer: string,
  funded: boolean,
  admit?: (actorId: string) => boolean,
): PlayerInteractionAvailability {
  const changed = playerInteractionRefusal(mode, config, after);
  if (changed) return changed;
  if (payer !== after.fundingActorId)
    return unavailable(after, 'stale', 'The selected interaction changed. Refresh it.');
  if (!funded)
    return unavailable(
      after,
      'ai-unavailable',
      'Speak and Act need an available character AI allowance.',
    );
  if (admit && !admit(payer))
    return unavailable(
      after,
      'busy',
      'Character AI is busy. Your draft is saved; check again shortly.',
    );
  return {
    available: true,
    ...(after.controlling && after.recipientName ? { recipientName: after.recipientName } : {}),
    code: 'available',
    reason: null,
    reply: after.reply,
  };
}

/** One ordinary Send gate for callers that already own an in-lane capture.
 * The paid execution owner still reserves its actual dispatch separately. */
export async function playerInteractionAvailability(request: {
  readonly mode: PlayerInteractionMode;
  readonly config: AppConfig;
  readonly read: () => PlayerInteractionFacts | Promise<PlayerInteractionFacts>;
  readonly budgetAvailable: (
    actorId: string,
    allowance: number,
    ceiling: number,
  ) => Promise<boolean>;
  readonly admit?: (actorId: string) => boolean;
}): Promise<PlayerInteractionAvailability> {
  const initial = request.read();
  const before = initial instanceof Promise ? await initial : initial;
  const refusal = playerInteractionRefusal(request.mode, request.config, before);
  if (refusal) return refusal;
  const funded = await request.budgetAvailable(
    before.fundingActorId,
    interactiveAllowance(request.config),
    request.config.budgetUsd,
  );
  const latest = request.read();
  const after = latest instanceof Promise ? await latest : latest;
  return fundedPlayerInteractionAvailability(
    request.mode,
    request.config,
    after,
    before.fundingActorId,
    funded,
    request.admit,
  );
}
