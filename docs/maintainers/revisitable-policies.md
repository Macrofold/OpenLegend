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

## RP03 — Selective history and initial overload handling

**Current policies:** [Retention decision ledger](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger) and [regional admission](../../archive/07-technical-architecture/data-delivery-and-scale.md#shared-world-regions-and-active-state). Engineering has authority to select and document performance/retention choices, with meaningful experience and game-level privacy preserved.

**Why revisit:** New gameplay can make previously routine detail meaningful, and measured crowded-world behavior can justify a different scheduling or admission design.

**Review trigger:** A new memory/gameplay consumer needs information an omission policy loses; grouping degrades useful recall; retained-source pressure requires a new expiry policy; or qualified regional load exposes unacceptable admission behavior. Update the canonical ledger with source coverage, guards and consequences before implementing a changed loss policy; do not infer irrelevance from budget pressure.

**Decision authority:** Implementing engineer under the owner's delegated design judgment, with measured evidence and recorded tradeoffs. Changing product privacy or silently losing confirmed actions is outside this optimization policy.

## RP04 — Exact recall and reusable derived artifacts

**Current policy:** [Implemented retrieval](../memory-architecture.md#implemented-retrieval-and-storage) uses exact actor-scoped cosine ranking and retains revision-keyed vector artifacts outside gameplay rewind. Only current eligible sources can enter search; cache/history presence cannot bypass forgetting.

**Why revisit:** Exact ranking avoids an unmeasured recall-quality tradeoff, but measured 100,000-source searches are slower than smaller corpora. Retaining reusable vectors prevents duplicate purchases after source correction/restore at additional storage cost.

**Review trigger:** Source/index growth materially degrades measured complete retrieval, or operational cache size becomes significant. Evaluate approximate recall quality and an explicit derived-cache eviction/rebuild policy before changing either behavior. Missing/uncertain paid work must not become an automatic retry.

**Decision authority:** Implementing engineer under the owner's performance-design delegation, with quality/cost evidence and the existing privacy/spending boundaries.

## Maintaining this register

Keep stable IDs, a canonical policy link, the reason to revisit, a concrete trigger and decision authority. Add only known revisitable decisions, not every constant or hypothetical concern. When a trigger is relevant, raise it in the task/PR; put resulting work or unresolved choices in their existing owners. An accepted change updates the policy, affected summaries and this entry together; significant decisions go in the [decision history](../documentation-changelog.md). Retire superseded entries with a link to their replacement or recorded decision, not another copy of the contract.
