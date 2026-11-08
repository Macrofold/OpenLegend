import {
  WORK_LIMITS,
  WORK_UNITS,
  addWork,
  requireWork,
  workVector,
  type WorkVector,
  type WorldState,
  workAllocations,
  installedWorkAllocation,
} from '@open-legend/domain';

// Current single-process native host. Multi-process placement must supply a shared
// operational admission owner before accepting concurrent worlds across processes.
// These allocations never come from a save's external/spending authority.
const accounts = new Map<symbol, { owner: WeakRef<object>; allocation: WorkVector }>();
export class HostWork {
  private readonly key = Symbol('native-world');
  constructor(private readonly owner: object) {}
  reserve(world: WorldState): { commit(): void; rollback(): void } {
    return this.reserveAllocation(addWork(workAllocations(world), installedWorkAllocation(world)));
  }
  /** Native candidates provide the same complete world allocation from their
   * semantic work owners. No TypeScript world is reconstructed for admission. */
  reserveAllocation(allocation: WorkVector): { commit(): void; rollback(): void } {
    const wanted = workVector(allocation);
    const prior = accounts.get(this.key);
    // Retain both old live obligations and new candidate capacity through SQL awaits.
    const pending = workVector(
      Object.fromEntries(
        WORK_UNITS.map((unit) => [unit, Math.max(prior?.allocation[unit] ?? 0, wanted[unit])]),
      ),
    );
    let total = pending;
    for (const [key, account] of accounts) {
      if (!account.owner.deref()) {
        accounts.delete(key);
        continue;
      }
      if (key !== this.key) total = addWork(total, account.allocation);
    }
    requireWork(total, WORK_LIMITS.world);
    const entry = { owner: new WeakRef(this.owner), allocation: pending };
    accounts.set(this.key, entry);
    let settled = false;
    return {
      commit: () => {
        if (!settled) {
          settled = true;
          accounts.set(this.key, { ...entry, allocation: wanted });
        }
      },
      rollback: () => {
        if (!settled) {
          settled = true;
          if (prior) accounts.set(this.key, prior);
          else accounts.delete(this.key);
        }
      },
    };
  }
  close(): void {
    accounts.delete(this.key);
  }
}
