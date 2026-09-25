import type { WorldAgentTurn } from './world-authoring.js';
import type { GameRepository } from './store.js';

/** Quote only: the existing attempt ledger still authorizes each actual reservation.
 * Read retained worker identity so a reused or already-accounted allocation is not charged twice.
 * docs/invention-budgets.md#native-worker-and-run-allocation
 */
export async function workshopRunAllocation(
  store: GameRepository,
  turn: WorldAgentTurn,
  worker: { key?: string; sandbox?: string; allocationUsd: number },
): Promise<WorldAgentTurn | null> {
  const exposure = await store.attemptBudget(
    turn.budget.id,
    worker.key ? `${worker.key}:compute` : undefined,
  );
  const allocation = Math.ceil(worker.allocationUsd * 1e6);
  let compute = Math.ceil((allocation / 1e6) * 1e6);
  if (worker.key) {
    const saved = (await store.getIntegration(worker.key)) as
      | { body: { max_cost_micro_usd: string }; sandbox?: string }
      | undefined;
    if (saved?.sandbox || (!saved && worker.sandbox)) {
      compute = 0;
    } else {
      compute = saved ? Number(saved.body.max_cost_micro_usd) : allocation;
      if (!Number.isSafeInteger(compute) || compute < 0)
        throw new Error('Invalid retained worker allocation.');
      compute = Math.ceil((compute / 1e6) * 1e6);
      const id = `${worker.key}:compute`;
      if (await store.getIntegration(id)) {
        compute = 0;
      } else {
        const attempt = exposure.allocation;
        // Match reserveCompute's recovery rule, including a lost operational marker.
        if (attempt) {
          if (attempt.provider !== 'macrofold' || Math.round(attempt.reservedUsd * 1e6) !== compute)
            throw new Error('Retained worker allocation conflicts with its accounting receipt.');
          compute = 0;
        }
      }
    }
  }
  if (!Number.isSafeInteger(compute) || compute < 0)
    throw new Error('Invalid retained worker allocation.');
  const remaining =
    Math.ceil(turn.budget.limitUsd * 1e6) -
    Math.round(exposure.spentUsd * 1e6) -
    Math.round(exposure.reservedUsd * 1e6);
  const run = Math.min(Math.floor(turn.runUsd * 1e6), remaining - compute);
  if (!Number.isSafeInteger(run) || run < 1) return null;
  // Currency travels as USD in the existing API but is reserved in integer microdollars.
  // A floating-point round-trip must not round the outbound cap above the available amount.
  const usd = run / 1e6;
  const runUsd = Math.ceil(usd * 1e6) > run ? (run - 1) / 1e6 : usd;
  return runUsd > 0 ? { ...turn, runUsd } : null;
}
