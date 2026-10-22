import { microUsdToUsd, usdToMicroUsd, type AiReceipt } from '@open-legend/ai';
import type { SqlDatabase } from './store.js';

export interface AttemptBudgetSnapshot {
  spentUsd: number;
  reservedUsd: number;
  /** Included in spentUsd, not an additional charge. */
  uncertainUsd: number;
}

/** Later evidence cannot move an admitted obligation to another execution or funding mode. */
export function assertAttemptReceiptContinuity(
  prior:
    | Partial<
        Pick<
          AiReceipt,
          | 'dispatched'
          | 'providerRequestId'
          | 'macrofoldBillingMode'
          | 'macrofoldDeployment'
          | 'macrofoldRequestedDeployment'
        >
      >
    | undefined,
  receipt: AiReceipt,
): void {
  if (prior?.dispatched && !receipt.dispatched)
    throw new Error('Spending receipt cannot retract dispatch evidence.');
  if (prior?.providerRequestId && prior.providerRequestId !== receipt.providerRequestId)
    throw new Error('Spending receipt changed its external request identity.');
  if (prior?.macrofoldBillingMode && prior.macrofoldBillingMode !== receipt.macrofoldBillingMode)
    throw new Error('Spending receipt changed its original billing mode.');
  if (
    prior?.macrofoldDeployment &&
    receipt.macrofoldDeployment &&
    (prior.macrofoldDeployment.deploymentId !== receipt.macrofoldDeployment.deploymentId ||
      prior.macrofoldDeployment.deploymentRevisionId !==
        receipt.macrofoldDeployment.deploymentRevisionId)
  )
    throw new Error('Spending receipt changed its admitted deployment revision.');
  const original = prior?.macrofoldRequestedDeployment;
  const observed = receipt.macrofoldRequestedDeployment;
  if (
    original &&
    observed &&
    (original.workspaceId !== observed.workspaceId ||
      original.modelBinding.deployment_id !== observed.modelBinding.deployment_id ||
      original.modelBinding.deployment_revision_id !== observed.modelBinding.deployment_revision_id)
  )
    throw new Error('Spending receipt changed its originally requested deployment.');
}

/** After matching attempt/Run identities, preserve known pricing independently of
 * completion. Only a new complete priced observation may replace a larger amount. */
export function retainKnownAttemptCost(receipt: AiReceipt, priorCostUsd?: number): AiReceipt {
  const prior = usdToMicroUsd(priorCostUsd);
  const observed = usdToMicroUsd(receipt.estimatedCostUsd);
  return prior !== undefined &&
    (observed === undefined || (receipt.completionUncertain && prior > observed))
    ? { ...receipt, estimatedCostUsd: priorCostUsd }
    : receipt;
}

/** Unknown completion retains the reserve and any larger observed obligation.
 * This raises a spending hold; it never confirms execution or settles the bill. */
export function uncertainAttemptMicroUsd(
  reservedMicroUsd: number,
  retainedMicroUsd: number,
  ...knownCostsUsd: unknown[]
): number {
  if (
    ![reservedMicroUsd, retainedMicroUsd].every(
      (value) => Number.isSafeInteger(value) && value >= 0,
    )
  )
    throw new Error('Attempt spending exceeds safe arithmetic.');
  return Math.max(
    reservedMicroUsd,
    retainedMicroUsd,
    ...knownCostsUsd.map((value) => usdToMicroUsd(value) ?? 0),
  );
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
  const spentUsd = microUsdToUsd(String(row?.['spent'] ?? 0));
  const reservedUsd = microUsdToUsd(String(row?.['reserved'] ?? 0));
  const uncertainUsd = microUsdToUsd(String(row?.['uncertain'] ?? 0));
  if (spentUsd === undefined || reservedUsd === undefined || uncertainUsd === undefined)
    throw new Error('Episode spending exceeds safe arithmetic.');
  return { spentUsd, reservedUsd, uncertainUsd };
}
