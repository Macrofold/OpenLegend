# Extensibility roadmap: from OpenLegend to authored realities

**Status: target capability sequence, not a delivery-status report or a second task tracker.** [Engine/world boundaries](engine-and-world-boundaries.md) owns principles; [world-module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns shared contracts. The [maintainer index](maintainers/README.md) points to actual work. The product's P1–P7 roadmap continues to own player-facing milestones.

Build OpenLegend through this sequence, extracting an engine from real needs. A stage becomes useful when its narrow end-to-end capability works; it does not require perfect generality across all future examples. Later stages are enabled by interfaces, not made prerequisites for the first game.

## Starting architecture and preservation rule

Use the latest checkout and `docs/architecture.md` for actual state. The audited baseline has pure domain transitions, one world writer, unified physical actors, finite body and weapon families, scoped context/AI execution, durable conversations/story history, journal/checkpoint persistence, and current-format manual saves. AG and EPR describe further work beyond that baseline. The module/attribute/sense composition foundation is not implied by those working systems.

Preserve their authority, privacy, timing, receipts, and existing behavior when extracting interfaces. Do not recreate actor unification, the world journal, Narrator, spatial candidate work, or save/load. A code change affecting gameplay order, senses, or controller behavior must be identified as such, not hidden in a refactor.

Current source-specific gaps and citations are in the delivery audit; do not copy that pinned snapshot into this roadmap as a permanent implementation diary.

## Two parallel paths

**The playable-game path** continues AG decisions/plans, INV's authorized invention loop, current conversation/narration quality, and measured performance fixes.

**The reusable-engine path** extracts shared state, sense, action-family, composition, and lifecycle contracts as those features need them.

The two meet at small interfaces. AG01–AG04 may initially use current native command adapters. EPR can initially use current sight/hearing implementations. The world-agent workflow can author the finite supported families before generic templates exist. None must wait for an entire module engine, G2 scripting, or marketplace.

## Capability stages

| Stage                                                               | Result that becomes possible                                                                                              | Primary owners                                               | Evidence gate                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **EW-R0 — Preserve behavior and identify seams**                    | New work stops spreading fixed wilderness assumptions through unrelated code                                              | EWF00; existing AGENTS/extending guidance                    | A concrete first slice has an owner, present baseline, documented limitation, and nearby code pointer                      |
| **EW-R1 — One end-to-end extensible state family**                  | A default need and a different reservoir use the same state/context/UI/save contract                                      | EWF01–EWF04, relevant existing native action adapters        | EX01 works without a named branch in generic consumers; current wilderness results remain correct                          |
| **EW-R2 — Modality-independent evidence and input**                 | Current vision/hearing and a third supported sense reach the same evidence/reaction/controller boundary                   | EWF05–EWF06, EPR, sensory owner, AG/CR input integration     | EX02 or EX03 demonstrates permitted partial evidence and same-version continuation; no omniscient navigation/context leak  |
| **EW-R3 — Reusable constructs and natural-language specialization** | A creator uses an existing template, binds one compatible part, and gets a usable mechanic through the world agent        | INV-1/2/3/4, EWF11–EWF12                                     | EX04 runs with one simple effect and lifetime; chat and technical views refer to one validated candidate                   |
| **EW-R4 — Safe installed-world evolution and local portability**    | Definitions can be revised, pinned, retired, and adopted into another compatible world without copying live private state | INV-5 and existing pack work, EWF07/11, SL/data, governance  | Active effects/plans and saves retain valid dependencies; EX08/EX10 shows explicit destination binding and rejection cases |
| **EW-R5 — Richer bodies, mental effects, and controllers**          | A separately approved world can use component bodies, constrained goal influence, or selective shared knowledge           | Concrete INV families; AG/CR/EPR/NC; EWF10 capability review | The relevant EX05/EX06/EX07/EX12 scenario has explicit policy, native enforcement, and recovery tests                      |
| **EW-R6 — Qualified algorithm extensions**                          | A useful mechanic beyond current declarative composition can run a bounded isolated algorithm                             | Existing INV G2 task and D20; EWF10 interface review         | A named consumer demonstrates the need; containment, deterministic inputs, aggregate bounds, and failure/save rules pass   |
| **EW-R7 — Broader ecosystem and scale**                             | Creators distribute reusable libraries and hosts qualify richer populations/worlds                                        | Existing packs/governance/production/PF tracks               | Explicit rights, compatibility, deployment/recovery, capacity, and actual user value—not merely valid artifact files       |

These are not all-or-nothing releases. A simple reusable construct can ship before every sense or body is generalized. More advanced constructs need their own capabilities, not a completed universal language.

## EW-R0: the first development step

Use EWF00 to select one concrete consumer. Record its current assumptions and readers/writers, inspect existing tests, and establish behavior that must not change. Add the architectural principles pointer to `AGENTS.md` through the documentation integration instructions.

Mark deliberate current limitations at important boundaries. A narrow native physiology adapter is acceptable. A requirement that every new stat be manually recognized in the scheduler, prompt, protocol, UI, and persistence is the problem to remove.

Do not spend this stage building a general benchmark platform, relocating every file into new packages, or generating a registry that no feature consumes.

## EW-R1: first playable engine proof

Resolve a minimal reviewed world composition and one state owner. Keep existing physical storage behind an adapter if that is the smallest correct change. Extract one current need's concern and UI projection; then support a different reservoir with an actual replenishment action and no compulsory human need fields in generic interfaces.

Use current native protection before full EPR delivery. Provide EPR-compatible change metadata without implementing a second threshold/event pipeline. Have current-format save coverage from the first stateful change.

**Ship/stop gate:** the second same-family definition needs no new generic need-name branches; both the original game and the new fixture behave correctly. Stop generalizing adjacent body/psychology systems until a concrete next consumer warrants it.

## EW-R2: inputs beyond vision and hunger

Wrap the existing sight/hearing rules before changing their geometry. Introduce a supported third modality, including uncertain source identity and modality-specific detail. Prove that a blind tactile actor receives only permitted information, not an ordinary vision context with the display hidden.

EPR remains responsible for scope, episodes, thresholds, dirty intake, and coalescing. CR/AG consume concerns and evidence; no separate tactile cognition service. Identify any unavailable contact/navigation capability honestly and implement only the approved initial proof. The current physical-contact rule supersedes the earlier proximity approximation; scale work must not restore that approximation to reduce query cost.

If exact audience semantics or private-acquisition behavior changes, test that as an explicit semantic change. Do not count an index optimization as proof that the knowledge boundary is correct.

## EW-R3: useful authoring before a universal compiler

First make world-agent authoring reliable for already supported definitions under INV-1/2/4. Then expose one reusable construct with two or three meaningful ports. An initial selector plus effect, with a bounded lifetime where needed, is sufficient. Do not require every spell to use a fixed five-part ontology.

Creator A publishes a parameterized construct; creator B specializes one compatible part. Use a deterministic fixture to prove binding, execution, receipts, and source/version identity. Separately evaluate whether the world agent can perform the specialization in plain English without hidden technical manual steps.

This stage needs one typed internal execution representation sufficient for the chosen operators, not arbitrary code or a visual graph editor. Reject unsupported composition. Preserve existing confirmation rules: explicit low-impact invention can use its admitted scope, while consequential world changes and conjuring require their existing review/confirmation.

**Gate:** supported template reuse changes artifacts and approved bindings, not generic engine branches. A stronger substituted effect is revalidated and cannot inherit missing permissions.

## EW-R4: portability includes lifecycle, not just export

Coordinate live activation with INV-5 rather than creating a module installer. Start with additive compatible definitions, then one explicit version replacement while an invocation or plan still references the prior version. Demonstrate rollback-safe preparation, exact active manifests, and coherent same-version save/load.

A local pack round-trip between two test worlds is enough to establish initial portability semantics. The destination can require bindings or adapters; refusal is a valid result. A marketplace, pricing scheme, or hosted account library is not required for the first local proof.

Distinguish active-definition transformation from legacy-development-runtime support. The [active development policy](save-and-load.md#active-development-policy) prefers small safe in-place migrations that preserve identity and unrelated state, without maintaining a parallel legacy runtime. It does not allow a live revision to orphan active state or a same-version save to depend on mutable “latest” behavior.

## EW-R5: ambitious behavior only with explicit semantic owners

Bring one concrete advanced feature forward when it becomes useful. For goal compulsion, the essential extension is a scoped effect interface into the existing agency owner, with a lifetime and conflict policy—not a privileged prompt or a second planner. For a hive, it is explicit shared-state and disclosure ownership—not merging all actor contexts.

Do not implement all mental effects together. Begin with a bounded fixture in an explicitly configured world. Decide consequential target/control/privacy policy before live deployment. Keep the default wilderness and ordinary user rights unchanged.

Behavioral claims need appropriate evidence. An influence prompt can guide a model but cannot establish hard compulsion. A component-body interface does not establish realistic medicine. A third-sense registry does not establish arbitrary sensory physics.

## EW-R6 and EW-R7: conditional growth

Keep restricted algorithms behind existing G2/G3 ownership. Select a sandbox only when a real mechanic exceeds supported composition. A new algorithm is permitted to compute within its admitted interface, not mutate arbitrary world state or install another interpreter. Declarative expressiveness, computational power, and authority remain distinct.

Scale and public ecosystem work follow measured active populations, real concentrated fan-out, retained history, permission enforcement, and operational needs. Public library discovery and natural-language compatibility advice must not claim that a package is safe, legally reusable, or semantically correct solely from a model score.

## Scaling foundations do not wait for EW-R7

The [current-code audit](scaling/current-code-audit.md) distinguishes implemented finite-family behavior from remaining shared-world and data-growth work. The accepted main target is a shared world divided into regions, with independent worlds supported; independent-world sharding alone does not satisfy it. Keep region-compatible identity, query scope, mutation ownership and source/definition lifecycle in the early interfaces without deploying multiple authorities prematurely.

Library growth and active simulation growth need different solutions. [SC12](maintainers/scaling.md#sc12) addresses invention lookup/indexing and exact deduplication as learned libraries grow. [SC13](maintainers/scaling.md#sc13) refines EWF08/INV-3's aggregate work, extent, recurrence and query-membership proof before broader constructs execute. [SC14](maintainers/scaling.md#sc14) covers INV-5/EWF07's reverse dependencies and coherent changes. The [worked mechanic-growth cases](scaling/mechanic-growth.md) are reference/acceptance inputs, not another construct schema.

Qualify a large inactive library separately from many simultaneous invocations. Include newly applicable status effects, changed geometry seen by stationary observers, unusually large bodies and cyclic selectors. A small per-definition schema or nesting bound does not establish finite aggregate work, and a count cap is not a substitute for paging, incremental queries and measured admission. Preserve required effects, all legitimate evidence, current privacy restrictions and the no-automatic-paid-retry contract.

The remaining local-player/service snapshot assumptions are tracked in [SC01–SC04](maintainers/scaling.md#sc01); independent records and DB-first recall remain D1/D2 work. Do not let a newly extensible field become another whole-world scan, private Entity projection or globally shared mutable value merely because its type is generic. Current implemented features remain implemented; these additional growth/qualification gates are not retroactive claims that their narrow releases never worked.

## Cross-cutting gates from the first slice

Every stage considers save/load, authoritative outcomes, private-source filtering, cancellation/revocation, definition references, cost, and bounded work while designing its first records. They are not cleanup tasks deferred to the final stage.

Keep default rules and specialized performance optimizations behind tested contracts. Native batching may be faster than one callback per module/entity; the abstraction does not prescribe a slow implementation. Reuse PF measurements and its stop rules rather than adding another global performance budget table.

For each promoted interface, state what is implemented now: native-only, replaceable adapter, data-defined, composable, or isolated-scriptable. Record observed results in Verification and implementation status, detailed remaining work in its tracker, and adopted documentation history in the single changelog.

## Definition of the long-term destination

A creator can ask the world agent for a supported reality, reuse or specialize player-authored constructs at several levels, review consequential choices, and activate a coherent change. Actors can perceive and act through the installed senses, needs, abilities, and controller policies; work persists and changes honestly with its evidence. Runtime integrity and human/account authority remain protected.

That destination does not mean arbitrary prose always works, every imaginable solver is installed, or OpenLegend must be finished as a general-purpose engine before its own game is enjoyable.
