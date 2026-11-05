import { normalizeReceiptCost, usdToMicroUsd, type AiReceipt } from '@open-legend/ai';
import type { SqlDatabase } from './store.js';
import type { DecisionAttemptLink } from './decision-state.js';
import {
  assertAttemptReceiptContinuity,
  retainKnownAttemptCost,
  uncertainAttemptMicroUsd,
  readAttemptBudget,
  type AttemptBudgetSnapshot,
  type AttemptBudget,
  attemptMicroUsd as micro,
  attemptExposure as exposureTotal,
} from './attempt-budget.js';

// Shared by ordinary game execution and the separate paid service, outside world restoration.
export const ATTEMPT_SCHEMA = `
      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, status TEXT NOT NULL,
        reserved BIGINT NOT NULL CHECK (reserved >= 0), spent BIGINT NOT NULL DEFAULT 0 CHECK (spent >= 0),
        receipt TEXT, created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS attempts_unsettled ON attempts(id) WHERE status IN ('reserved','uncertain');
      CREATE INDEX IF NOT EXISTS attempts_created ON attempts(created_at,id);
      CREATE TABLE IF NOT EXISTS attempt_scopes (attempt_id TEXT PRIMARY KEY, actor_id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS attempt_budgets (attempt_id TEXT PRIMARY KEY, budget_id TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS attempt_budget_scope ON attempt_budgets(budget_id, attempt_id);
      CREATE INDEX IF NOT EXISTS attempt_actor ON attempt_scopes(actor_id,attempt_id);
`;
export class AttemptRepository {
  constructor(
    private readonly db: SqlDatabase,
    private readonly ready: () => Promise<void>,
    private readonly changed: () => void = () => {},
    private readonly settled: () => void = () => {},
  ) {}
  private async exposure(actorId: string): Promise<bigint> {
    const date = new Date();
    const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    const row = await this.db
      .prepare(
        "SELECT COALESCE(SUM(spent + CASE WHEN status = 'reserved' THEN reserved ELSE 0 END), 0) AS total FROM attempts a LEFT JOIN attempt_scopes s ON s.attempt_id=a.id WHERE a.created_at>=? AND (s.actor_id=? OR s.actor_id IS NULL)",
      )
      .get(start, actorId);
    return exposureTotal(row?.['total'] ?? 0);
  }
  async budgetAvailable(actorId: string, amountUsd: number, ceilingUsd: number): Promise<boolean> {
    await this.ready();
    return (await this.exposure(actorId)) + BigInt(micro(amountUsd)) <= BigInt(micro(ceilingUsd));
  }

  async attemptBudget(id: string): Promise<AttemptBudgetSnapshot> {
    await this.ready();
    return readAttemptBudget(this.db, id);
  }
  reserve(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId = 'world-agent',
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
    decision?: DecisionAttemptLink,
  ): Promise<boolean> {
    return this.reserveScoped(
      id,
      provider,
      amountUsd,
      ceilingUsd,
      actorId,
      reuse,
      budget,
      decision,
      'actor',
    );
  }
  private async reserveScoped(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    ceilingUsd: number,
    actorId = 'world-agent',
    reuse?: 'compute-allocation',
    budget?: AttemptBudget,
    decision?: DecisionAttemptLink,
    scope: 'actor' | 'grant' = 'actor',
  ): Promise<boolean> {
    await this.ready();
    const amount = micro(amountUsd);
    const ceiling = micro(ceilingUsd);

    // A known zero request fee still needs its one durable attempt and receipt.
    // Callers separately enforce whether model execution is enabled at all.
    if (
      !Number.isFinite(amountUsd) ||
      amountUsd < 0 ||
      !Number.isFinite(ceilingUsd) ||
      ceilingUsd < 0 ||
      !actorId ||
      actorId.length > 160
    )
      throw new Error('Invalid spending reservation.');
    const accepted = await this.db.transaction(async () => {
      const existing = await this.db
        .prepare('SELECT provider,reserved FROM attempts WHERE id = ?')
        .get(id);
      // Resume the same allocation after a crash, never authorize another model dispatch.
      // docs/architecture.md#macrofold-worker-ownership
      if (
        existing &&
        reuse === 'compute-allocation' &&
        provider === 'macrofold' &&
        id.startsWith('macrofold-worker:') &&
        id.endsWith(':compute') &&
        existing['provider'] === provider &&
        Number(existing['reserved']) === micro(amountUsd)
      )
        return true;
      if (existing) throw new Error('Attempt already admitted; do not dispatch it again.');
      const actorExposure = scope === 'actor' ? await this.exposure(actorId) : 0n;
      // This is an additional cap over the same attempt ledger, not another wallet.
      // docs/architecture.md#invention-workshop-tools
      if (budget) {
        if (
          !budget.id ||
          budget.id.length > 500 ||
          !Number.isFinite(budget.limitUsd) ||
          budget.limitUsd < 0
        )
          throw new Error('Invalid episode spending scope.');
        const exposure = await this.db
          .prepare(
            "SELECT COALESCE(SUM(a.spent + CASE WHEN a.status = 'reserved' THEN a.reserved ELSE 0 END), 0) AS total FROM attempt_budgets b JOIN attempts a ON a.id=b.attempt_id WHERE b.budget_id=?",
          )
          .get(budget.id);
        if (
          exposureTotal(exposure?.['total'] ?? 0) + BigInt(amount) >
          BigInt(micro(budget.limitUsd))
        )
          return false;
      }
      if (actorExposure + BigInt(amount) > BigInt(ceiling)) {
        return false;
      }
      await this.db
        .prepare(
          "INSERT INTO attempts (id,provider,status,reserved,created_at) VALUES (?,?,'reserved',?,?)",
        )
        .run(id, provider, amount, Date.now());
      await this.db.prepare('INSERT INTO attempt_scopes VALUES (?,?)').run(id, actorId);
      if (budget)
        await this.db.prepare('INSERT INTO attempt_budgets VALUES (?,?)').run(id, budget.id);
      if (decision)
        await this.db
          .prepare(
            'INSERT INTO cognition_attempt_links(attempt_id,root_job_id,category,level,stage,execution_class) VALUES (?,?,?,?,?,?)',
          )
          .run(
            id,
            decision.rootJobId,
            decision.category,
            decision.level ?? null,
            decision.stage,
            decision.executionClass,
          );
      return true;
    });
    if (accepted) this.changed();
    return accepted;
  }

  /** A fixed job grant is not a monthly actor allowance. Its indexed budget binding is the cap. */
  reserveGrant(
    id: string,
    provider: 'jev' | 'openai' | 'macrofold',
    amountUsd: number,
    budget: AttemptBudget,
  ): Promise<boolean> {
    return this.reserveScoped(
      id,
      provider,
      amountUsd,
      budget.limitUsd,
      budget.id,
      undefined,
      budget,
      undefined,
      'grant',
    );
  }

  async attemptReceipt(id: string): Promise<AiReceipt | undefined> {
    await this.ready();
    const row = await this.db.prepare('SELECT receipt FROM attempts WHERE id = ?').get(id);
    return row?.['receipt'] ? (JSON.parse(String(row['receipt'])) as AiReceipt) : undefined;
  }

  async settle(id: string, receipt: AiReceipt): Promise<void> {
    await this.ready();
    if (receipt.requestId !== id) throw new Error('Spending receipt identity mismatch.');
    receipt = normalizeReceiptCost(receipt);
    await this.db.transaction(async () => {
      const row = await this.db
        .prepare('SELECT status,reserved,spent,receipt FROM attempts WHERE id = ?')
        .get(id);
      if (!row) return;
      const prior = row['receipt'] ? (JSON.parse(String(row['receipt'])) as AiReceipt) : undefined;
      // Later accounting may omit optional metadata without changing the exact admitted Run.
      // Retain its already-established deployment revision and separate hosting attribution.
      if (
        prior?.macrofoldDeployment ||
        prior?.macrofoldCostAttribution ||
        prior?.macrofoldRequestedDeployment
      )
        receipt = {
          ...receipt,
          macrofoldDeployment: receipt.macrofoldDeployment ?? prior.macrofoldDeployment,
          macrofoldCostAttribution:
            receipt.macrofoldCostAttribution ?? prior.macrofoldCostAttribution,
          macrofoldRequestedDeployment:
            receipt.macrofoldRequestedDeployment ?? prior.macrofoldRequestedDeployment,
        };
      assertAttemptReceiptContinuity(prior, receipt);
      if (row['status'] === 'settled') {
        // A final priced receipt is immutable; an unpriced attempt may receive
        // definitive billing later without authorizing another dispatch.
        if (!prior?.dispatched || usdToMicroUsd(prior.estimatedCostUsd) !== undefined) return;
      }
      const observedCostUsd = receipt.estimatedCostUsd;
      const completionAlreadyConfirmed =
        prior?.dispatched && !prior.completionUncertain && receipt.completionUncertain;
      // A slower observation cannot reopen completed execution. Keep its definitive
      // receipt, while retaining any larger provisional charge only as a spending hold:
      // copying that charge into the completed receipt would falsely settle unknown billing.
      if (completionAlreadyConfirmed) receipt = prior;
      receipt = retainKnownAttemptCost(receipt, prior?.estimatedCostUsd);
      const reserve = Number(row['reserved']);
      const estimated = receipt.estimatedCostUsd;
      const uncertain =
        receipt.dispatched && (receipt.completionUncertain || estimated === undefined);
      // A later uncertain observation can increase the obligation without proving
      // completion. Missing/smaller evidence cannot restore spending headroom.
      const spent = !receipt.dispatched
        ? 0
        : uncertain
          ? uncertainAttemptMicroUsd(
              reserve,
              Number(row['spent']),
              prior?.estimatedCostUsd,
              estimated,
              observedCostUsd,
            )
          : micro(estimated!);
      const priorCharge = usdToMicroUsd(prior?.estimatedCostUsd) ?? -1;
      const observedCharge = usdToMicroUsd(estimated) ?? -1;
      // Repeated uncertain polling must not rewrite an unchanged obligation.
      // A higher known charge is worth retaining even while below the reserve.
      if (
        row['status'] === 'uncertain' &&
        (receipt.completionUncertain || completionAlreadyConfirmed) &&
        prior?.providerRequestId === receipt.providerRequestId &&
        prior?.completionUncertain === receipt.completionUncertain &&
        prior?.macrofoldBillingMode === receipt.macrofoldBillingMode &&
        spent === Number(row['spent']) &&
        observedCharge <= priorCharge
      )
        return;
      await this.db
        .prepare(
          "UPDATE attempts SET status=?,spent=?,receipt=? WHERE id=? AND status IN ('reserved','uncertain','settled')",
        )
        .run(uncertain ? 'uncertain' : 'settled', spent, JSON.stringify(receipt), id);
      const notify = () => {
        this.settled();
      };
      if (this.db.afterCommit) this.db.afterCommit(notify);
      else notify();
    });
    this.changed();
  }
}
