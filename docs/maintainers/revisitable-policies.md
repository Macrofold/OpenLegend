# Policies to revisit

This register tracks accepted decisions likely to change, not unresolved choices or implementation tasks. The linked policy owns current requirements; summaries here are navigation. A review trigger does not expire a rule, increase permissions or authorize its replacement. Read relevant entries when changing the related policy or approaching its trigger, not on every development task.

## RP01 — Implementation spending ceiling

**Current policy:** [Verification — Spending](../../.agents/rules/verification.md#spending); [root summary](../../AGENTS.md#work-discipline). Mike-authorized implementation currently has one $10 aggregate per-task ceiling, including delegates and uncertain commitments. It is not permission for public contributors to charge his accounts.

**Why revisit:** The amount is a tunable balance between useful live evidence and controlled development cost, not a permanent architectural invariant.

**Review trigger:** The account owner changes the allowance, necessary representative verification repeatedly cannot fit within it, or planned autonomous/parallel paid workflows materially change exposure. Report the constraint before exceeding it; a new turn or delegate does not reset the same task's accounting.

**Decision authority:** The account owner; Mike for his standing allowance. Keep the current cap until an explicit authorized change.

## RP02 — Development-state compatibility

**Current policy:** [Save/load — Active development policy](../save-and-load.md#active-development-policy); [root summary](../../AGENTS.md#authored-reality-design-principles). Evolve development worlds in place with small safe migrations; avoid disproportionate support for legacy game versions.

**Why revisit:** Early development favors one current model; supporting released versions or other people's retained worlds may require an explicit compatibility window and migration commitments.

**Review trigger:** Before promising cross-release save compatibility, supporting production/shared worlds or multiple maintained releases, or when preserving existing worlds no longer admits a safe small conversion. A trigger calls for a decision, not an automatic compatibility framework or destructive reset.

**Decision authority:** Project maintainer, with the save/load design owner. Preserve stored state while a consequential compatibility decision remains unresolved; privacy and external accounting remain protected.

## Maintaining this register

Keep stable IDs, a canonical policy link, the reason to revisit, a concrete trigger and decision authority. Add only known revisitable decisions, not every constant or hypothetical concern. When a trigger is relevant, raise it in the task/PR; put resulting work or unresolved choices in their existing owners. An accepted change updates the policy, affected summaries and this entry together; significant decisions go in the [decision history](../documentation-changelog.md). Retire superseded entries with a link to their replacement or recorded decision, not another copy of the contract.

## RP03 — Global elapsed horizon and sampled discovery

**Current policy:** [Base time and observation fidelity](../worlds/base/time.md), under [simulation time](../simulation-time.md). The current finite integrator uses a global minimum boundary, bounded movement sampling, coupled-rule fallbacks and a shared blocked-flight retry deadline.

**Why revisit:** This is a small playable integration, not the final extreme-scale scheduler. Dense independent deadlines couple unrelated regions, and endpoint samples do not prove every transient contact/peek is detected.

**Review trigger:** A measured contested-perch/crowded-motion workload misses the clock target, brief contact becomes consequential gameplay, another world needs coupled rates, or a concrete region-local scheduler is ready. The current contested-flight evidence has already crossed the performance trigger; PF13.9 retains the next work.

**Decision authority:** Maintainer with spatial/perception/world owners. Mike decides material changes to discovery fidelity or game-time behavior. Do not silently relax collision, privacy, durability or meaningful events to meet a rate target.
