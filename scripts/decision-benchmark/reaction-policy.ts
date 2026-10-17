const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
/** Benchmark-only proposal contract. Native game admission is a separate authority. */
export function permittedReaction(policy: unknown, operation: unknown, newCause: boolean): boolean {
  if (!object(policy) || !object(operation)) return false;
  const keys = ['kind', 'policy', 'source', 'target', 'intensity', 'lifetimeGameMinutes'];
  if (Object.keys(operation).some((k) => !keys.includes(k))) return false;
  if (operation.kind === 'none')
    return Object.entries(operation).every(([k, v]) => k === 'kind' || v === null);
  return (
    newCause &&
    operation.kind === 'create' &&
    Array.isArray(policy.allowedPolicies) &&
    policy.allowedPolicies.includes(operation.policy) &&
    operation.source === policy.source &&
    typeof operation.policy === 'string' &&
    object(policy.allowedTargetsByPolicy) &&
    operation.target === policy.allowedTargetsByPolicy[operation.policy] &&
    Array.isArray(policy.allowedIntensities) &&
    policy.allowedIntensities.includes(operation.intensity) &&
    operation.lifetimeGameMinutes === policy.lifetimeGameMinutes
  );
}
