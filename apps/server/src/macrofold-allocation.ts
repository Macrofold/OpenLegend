import type { WorldAgentTurn } from './world-authoring.js';
import type { GameRepository } from './store.js';

/** Quote only; atomic ledger admission still owns the session and actor limits.
 * Shared Worker capacity is separately owned by the world operator, never purchased here.
 * docs/invention-budgets.md#native-worker-and-run-allocation
 */
export async function workshopRunAllocation(
  store: GameRepository,
  turn: WorldAgentTurn,
): Promise<WorldAgentTurn | null> {
  const exposure = await store.attemptBudget(turn.budget.id);
  const remaining =
    Math.floor(turn.budget.limitUsd * 1e6) -
    Math.round(exposure.spentUsd * 1e6) -
    Math.round(exposure.reservedUsd * 1e6);
  const run = Math.min(Math.floor(turn.runUsd * 1e6), remaining);
  if (!Number.isSafeInteger(run) || run < 1) return null;
  // Do not round the USD transport amount above the integer ledger's remaining allowance.
  const usd = run / 1e6;
  const runUsd = Math.ceil(usd * 1e6) > run ? (run - 1) / 1e6 : usd;
  return runUsd > 0 ? { ...turn, runUsd } : null;
}
