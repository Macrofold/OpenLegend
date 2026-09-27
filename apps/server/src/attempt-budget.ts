import type { SqlDatabase } from './store.js';

export interface AttemptBudgetSnapshot {
  spentUsd: number;
  reservedUsd: number;
  /** Included in spentUsd, not an additional charge. */
  uncertainUsd: number;
}

/** Read-only ledger projection shared by authoring status and execution preflight.
 * This is not a reservation: dispatch still uses the existing atomic reserve operation.
 */
export async function readAttemptBudget(
  db: SqlDatabase,
  budgetId: string,
): Promise<AttemptBudgetSnapshot> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(a.spent),0) AS spent,
      COALESCE(SUM(CASE WHEN a.status='reserved' THEN a.reserved ELSE 0 END),0) AS reserved,
      COALESCE(SUM(CASE WHEN a.status='uncertain' THEN a.spent ELSE 0 END),0) AS uncertain
      FROM attempts a JOIN attempt_budgets b ON b.attempt_id=a.id WHERE b.budget_id=?`,
    )
    .get(budgetId);
  return {
    spentUsd: Number(row?.['spent'] ?? 0) / 1e6,
    reservedUsd: Number(row?.['reserved'] ?? 0) / 1e6,
    uncertainUsd: Number(row?.['uncertain'] ?? 0) / 1e6,
  };
}
