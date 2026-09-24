import type { AttemptBudget, GameRepository, SqlDatabase } from './store.js';

/** Reuse operational meta records and the one attempts ledger. The passed DB is the store's
 * existing transaction connection, never another writer. No game-save migration is needed.
 * docs/world-agent-runtime.md#implemented-session-and-write-boundary
 */
export class WorkshopRepository {
  constructor(
    private readonly store: GameRepository,
    private readonly db: SqlDatabase,
  ) {}
  async compareAndSet(
    key: string,
    expected: unknown,
    value: unknown,
    related: { key: string; value: unknown }[] = [],
  ): Promise<boolean> {
    await this.store.ready;
    if (related.length > 8 || related.some((entry) => entry.key === key))
      throw new Error('Invalid operational batch.');
    return this.db.transaction(async () => {
      const row =
        expected === undefined
          ? await this.db
              .prepare(
                'INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING RETURNING key',
              )
              .get(`integration:${key}`, JSON.stringify(value))
          : await this.db
              .prepare('UPDATE meta SET value=? WHERE key=? AND value=? RETURNING key')
              .get(JSON.stringify(value), `integration:${key}`, JSON.stringify(expected));
      if (!row) return false;
      for (const entry of related) await this.store.putIntegration(entry.key, entry.value);
      return true;
    });
  }
  async budgetUsage(budget: AttemptBudget) {
    await this.store.ready;
    const row = await this.db
      .prepare(
        `SELECT
      COALESCE(SUM(CASE WHEN a.status='settled' THEN a.spent ELSE 0 END),0) AS spent,
      COALESCE(SUM(CASE WHEN a.status='reserved' THEN a.reserved ELSE 0 END),0) AS reserved,
      COALESCE(SUM(CASE WHEN a.status='uncertain' THEN a.spent ELSE 0 END),0) AS uncertain
      FROM attempt_budgets b JOIN attempts a ON a.id=b.attempt_id WHERE b.budget_id=?`,
      )
      .get(budget.id);
    const spentUsd = Number(row?.['spent'] ?? 0) / 1e6,
      reservedUsd = Number(row?.['reserved'] ?? 0) / 1e6,
      uncertainUsd = Number(row?.['uncertain'] ?? 0) / 1e6;
    return {
      limitUsd: budget.limitUsd,
      spentUsd,
      reservedUsd,
      uncertainUsd,
      remainingUsd: Math.max(0, budget.limitUsd - spentUsd - reservedUsd - uncertainUsd),
    };
  }
}
