# Policies to revisit

This register tracks accepted decisions likely to change, not unresolved choices or implementation tasks. The linked policy owns current requirements; summaries here are navigation. A review trigger does not expire a rule, increase permissions or authorize its replacement. Read relevant entries when changing the related policy or approaching its trigger, not on every development task.

## RP01 — Implementation spending ceiling

**Current policy:** [Verification — Spending](../../.agents/rules/verification.md#spending); [root summary](../../AGENTS.md#work-discipline). Mike-authorized implementation currently has one $10 aggregate per-task ceiling, including delegates and uncertain commitments. It is not permission for public contributors to charge his accounts.

**Why revisit:** The amount is a tunable balance between useful live evidence and controlled development cost, not a permanent architectural invariant.

**Review trigger:** The account owner changes the allowance, necessary representative verification repeatedly cannot fit within it, or planned autonomous/parallel paid workflows materially change exposure. Report the constraint before exceeding it; a new turn or delegate does not reset the same task's accounting.

**Decision authority:** The account owner; Mike for his standing allowance. Keep the current cap until an explicit authorized change.

## RP02 — Development-state compatibility

**Current policy:** [AGENTS.md — Development save policy](../../AGENTS.md#development-save-policy), the sole binding text.

**Why revisit:** A future real-player release may need declared compatibility windows for saves, APIs and other supported contracts. This is a review candidate, not a commitment to implement compatibility now.

**Review trigger:** Before promising retained worlds across releases or supporting real players, present the proposed support window and cost to Mike. Until then the linked rule remains in force; reaching a trigger never changes it automatically.

**Decision authority:** Mike, the project owner, through the explicit policy-change request required by the linked block. Engineering judgment, a design-owner approval or a general implementation request cannot substitute for that request.

## RP03 — Selective history and initial overload handling

**Current policies:** [Retention decision ledger](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger) and [regional admission](../../archive/07-technical-architecture/data-delivery-and-scale.md#shared-world-regions-and-active-state). Engineering has authority to select and document performance/retention choices, with meaningful experience and game-level privacy preserved. The [immediate implementation](../projects/immediate-gameplay-limits.md) selects bounded awareness residency and queued-work admission without deleting canonical evidence.

**Why revisit:** New gameplay can make previously routine detail meaningful, and measured crowded-world behavior can justify a different scheduling or admission design.

**Review trigger:** A new memory/gameplay consumer needs information an omission policy loses; grouping degrades useful recall; retained-source pressure requires a new expiry policy; or qualified regional load exposes unacceptable admission behavior. Update the canonical ledger with source coverage, guards and consequences before implementing a changed loss policy; do not infer irrelevance from budget pressure.

**Decision authority:** Implementing engineer under the owner's delegated design judgment, with measured evidence and recorded tradeoffs. Changing product privacy or silently losing confirmed actions is outside this optimization policy.

The accepted [product-scalability direction](../product-scalability/README.md) adds a review trigger before prospective crowd grouping or activity-dependent admission is enabled (PS04/PS06). Treat that as an explicit new world policy, not permission to discard already-acquired evidence; [PS-D02/PS-D04](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) retain the material choices.

## RP04 — Exact recall and reusable derived artifacts

**Current policy:** [Implemented retrieval](../memory-architecture.md#implemented-retrieval-and-storage) uses exact actor-scoped cosine ranking and retains revision-keyed vector artifacts outside gameplay rewind. Only current eligible sources can enter search; cache/history presence cannot bypass forgetting. The [preparation/index policy](../memory-architecture.md#retrieval-preparation-admission) adds snapshot-fenced caches and indexed optional token-prefix search; exact semantic recall is unchanged.

**Why revisit:** Exact ranking avoids an unmeasured recall-quality tradeoff, but measured 100,000-source searches are slower than smaller corpora. Retaining reusable vectors prevents duplicate purchases after source correction/restore at additional storage cost.

**Review trigger:** Source/index growth materially degrades measured complete retrieval, or operational cache size becomes significant. Evaluate approximate recall quality and an explicit derived-cache eviction/rebuild policy before changing either behavior. Missing/uncertain paid work must not become an automatic retry.

**Decision authority:** Implementing engineer under the owner's performance-design delegation, with quality/cost evidence and the existing privacy/spending boundaries.

## RP05 — Prototype account and native-work operating envelopes

**Current policy:** [Account setup](../../README.md#configure-authenticated-shared-play) and [aggregate native work](../architecture.md#typed-state-claims-and-aggregate-work) use configurable eight-hour sessions, fifteen-second real-time exit grace, one active embodiment per account/world, and versioned finite process-wide native-work ceilings. These are operational v1 choices, not universal world laws or hosted capacity promises. [Measured release admission](../performance.md#bounded-admission) now coordinates 100-player defaults and admits 64 MB of native event output without trimming witnesses; PF11/D5 performance acceptance remains open.

**Why revisit:** Multiple simultaneous embodiments, deployment security needs, new supported recurring families or measured shared-world load may need different envelopes. The final mixed profile has an explicit [PF03/09 CPU gap](performance.md#foundations-15-measurements-and-remaining-cost).

**Review trigger:** Before hosted release, adding multi-embodiment control, changing native cadence/sample frequency or admitting a family beyond the current cost vector/interval policy. Preserve current grants/privacy, saved work progress and required native outcomes when changing an envelope.

**Decision authority:** Project maintainer for embodiment/product policy; operator for supported session/grace settings; implementing engineer for measured native bounds within accepted semantics. Bounds never authorize truncating owed effects or creating spending allowances.

Before implementing [dangerous-logout continuation](../product-scalability/participation-and-protection.md), revisit the current exit grace and distinguish encounter continuation from protected post-exit absence. [PS-D01](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns the remaining fairness/ending choices; PS05 does not change today's grace or control rules merely by being documented.

## Limits inventory and concrete work

[Feature limits](../openlegend-limits-decisions.md) record individual numerical and behavioral constraints. [Remove / Change / Expand](limits-audit.md) ranks concrete candidates, including RP03–RP05 history, retrieval, account and work envelopes. This register continues to own accepted-policy authority and review triggers; it is not a second limit/task list.

## RP06 — Elapsed-time fidelity and integration limits

**Current policy:** [Base-world time policy](../worlds/base/time.md); the independent clock and interval contract is in [Simulation time](../simulation-time.md). The finite bundled-world horizon, perception displacement and coupled-flow fallback constrain approximation; they are not mandatory ticks derived from clock speed.

**Why revisit:** These deliberately small implementation limits trade bounded work and perception fidelity against general analytic scheduling. They should not become universal laws for future authored worlds. The September 26 follow-through localized short-range sensing envelopes and motion deadlines. The [September 29 regional follow-through](../verification/regional-time-and-navigation.md) defers captured rates on body-only slices, replaces most coupled-rate fallbacks with net flow and prevents skipping fleeting sight/contact of predictable movers; perception sampling and publication still run world-wide per slice. Revisit the private 32-slice ceiling and remaining global rate work using measured command latency and throughput together.

**Review trigger:** A fast actor or tiny sense forces excessive whole-world work; a fleeting exposure is observably missed; a new timed/coupled mechanic lacks a safe interval bound; or profiling shows useful headroom from region-local integration. Consult the [boundary catalogue](simulation-boundaries.md), retain exact occurrence/collision/permission boundaries, and measure the changed approximation rather than silently increasing time steps.

**Decision authority:** The world policy owner for fidelity/balance, with the simulation and perception maintainers for runtime integrity. Unsupported rate interactions retain their conservative fallback until the owning mechanic supplies and qualifies a better bound. No change to these limits may turn a presentation setting into altered actor knowledge.

The proposed [independent calendar](../product-scalability/participation-and-protection.md#8-calendar-time-is-not-necessarily-mechanical-time) is another explicit review trigger. Assign affected mechanics, needs, memories and shared deadlines before enabling it; current speed conversion and sensing fidelity remain unchanged. [PS-D03](../../archive/05-project/open-decisions.md#product-scalability-integration-choices) owns the residual clock choices.

## Maintaining this register

Keep stable IDs, a canonical policy link, the reason to revisit, a concrete trigger and decision authority. Add only known revisitable decisions, not every constant or hypothetical concern. When a trigger is relevant, raise it in the task/PR; put resulting work or unresolved choices in their existing owners. An accepted change updates the policy, affected summaries and this entry together; significant decisions go in the [decision history](../documentation-changelog.md). Retire superseded entries with a link to their replacement or recorded decision, not another copy of the contract.
