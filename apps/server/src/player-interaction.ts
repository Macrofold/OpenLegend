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

/** One ordinary Send gate, shared across simulation implementations. The paid
 * execution owner still reserves its actual dispatch after this availability
 * read; checking an allowance never invokes or retries a model. */
export async function playerInteractionAvailability(request: {
  readonly mode: 'speak' | 'act';
  readonly config: AppConfig;
  readonly read: () => PlayerInteractionFacts | Promise<PlayerInteractionFacts>;
  readonly budgetAvailable: (
    actorId: string,
    allowance: number,
    ceiling: number,
  ) => Promise<boolean>;
  readonly admit?: (actorId: string) => boolean;
}): Promise<PlayerInteractionAvailability> {
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
  const current = (facts: PlayerInteractionFacts): PlayerInteractionAvailability | undefined => {
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
        request.mode === 'speak'
          ? 'Your character cannot speak now.'
          : 'Your character cannot act now.',
      );
    if (!facts.recipientAvailable)
      return unavailable(
        facts,
        'invalid-recipient',
        'Choose a known person or a person currently in sight.',
      );
    const config = request.config;
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
  };
  const initial = request.read();
  const before = initial instanceof Promise ? await initial : initial;
  const refusal = current(before);
  if (refusal) return refusal;
  const funded = await request.budgetAvailable(
    before.fundingActorId,
    interactiveAllowance(request.config),
    request.config.budgetUsd,
  );
  const latest = request.read();
  const after = latest instanceof Promise ? await latest : latest;
  const changed = current(after);
  if (changed) return changed;
  if (before.fundingActorId !== after.fundingActorId)
    return unavailable(after, 'stale', 'The selected interaction changed. Refresh it.');
  if (!funded)
    return unavailable(
      after,
      'ai-unavailable',
      'Speak and Act need an available character AI allowance.',
    );
  if (request.admit && !request.admit(before.fundingActorId))
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
