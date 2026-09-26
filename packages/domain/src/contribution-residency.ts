import { isDraft, original } from 'immer';
import type { Entity, WorldState } from './types.js';

type States = NonNullable<Entity['statusEffects']>;
const partial = new WeakSet<States>();
const terminalOwners = new WeakMap<WorldState['entities'], ReadonlySet<string>>();

/** Residency is derived metadata. Canonical terminal records retain exact definitions,
 * identities and outcomes; omission from a working set never grants reuse or deletion. */
export function markPartialContributions(states: States): void {
  partial.add(states);
}
export function completeContributionHistory(states: States | undefined): boolean {
  return !states || !partial.has(isDraft(states) ? original(states)! : states);
}
function hasTerminal(entity: Entity | undefined): boolean {
  return Object.values(entity?.statusEffects ?? {}).some(
    (state) => state.contribution && !state.active,
  );
}
export function terminalContributionOwners(world: WorldState): ReadonlySet<string> {
  const cached = Object.isFrozen(world.entities) ? terminalOwners.get(world.entities) : undefined;
  if (cached) return cached;
  const ids = new Set(
    Object.values(world.entities)
      .filter(hasTerminal)
      .map((entity) => entity.id),
  );
  if (Object.isFrozen(world.entities)) terminalOwners.set(world.entities, ids);
  return ids;
}
export function captureContributionResidency(
  draft: WorldState,
): (result: WorldState, changed: ReadonlySet<string>) => void {
  const base = original(draft)!;
  const prior = terminalOwners.get(base.entities);
  return (result, changed) => {
    if (base.entities === result.entities) return;
    let updated: Set<string> | undefined;
    for (const id of changed) {
      const before = base.entities[id]?.statusEffects,
        after = result.entities[id]?.statusEffects;
      if (before === after) continue;
      if (after && !completeContributionHistory(before)) markPartialContributions(after);
      if (!prior) continue;
      const terminal = hasTerminal(result.entities[id]);
      if (terminal === prior.has(id)) continue;
      updated ??= new Set(prior);
      if (terminal) updated.add(id);
      else updated.delete(id);
    }
    if (prior) terminalOwners.set(result.entities, updated ?? prior);
  };
}
