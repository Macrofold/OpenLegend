# Extensibility roadmap: from OpenLegend to authored realities

**Status: target capability sequence, not a delivery-status report or a second task tracker.** [Engine/world boundaries](engine-and-world-boundaries.md) owns principles; [world-module runtime](../archive/07-technical-architecture/world-module-runtime.md) owns shared contracts. The [maintainer index](maintainers/README.md) points to actual work. The [current gameplay priorities](repertoires/gameplay-priorities.md) and [whole-game coverage](repertoires/coverage.md) control player-facing selection; capability stages here are not a competing feature order.

Build OpenLegend through this sequence, extracting an engine from real needs. A stage becomes useful when its narrow end-to-end capability works; it does not require perfect generality across all future examples. Later stages are enabled by interfaces, not made prerequisites for the first game.

## Starting architecture and preservation rule

Use the reviewed source revision and [Architecture](architecture.md) for actual state. Retain pure domain transitions, one world writer, unified physical actors, scoped context/AI execution, durable conversations/story history, independent canonical records and current-format streamed saves. Finite numeric/category attributes, registered vision/hearing/coarse-contact adapters, world-owned body and recipe policies, operational agency and reviewed World Agent writes are already delivered under their focused owners. They do not establish full cross-subsystem constructs, general sensory navigation, portability or the remaining release/scale gates.

Preserve their authority, privacy, timing, receipts, and existing behavior when extracting interfaces. Do not recreate actor unification, canonical record persistence, Narrator, spatial candidate work, or save/load. A code change affecting gameplay order, senses, or controller behavior must be identified as such, not hidden in a refactor.

Current source-specific gaps and citations are in the delivery audit; do not copy that pinned snapshot into this roadmap as a permanent implementation diary.

## Two parallel paths

**The playable-game path** follows the current experience-led priority policy: understandable control, worthwhile challenge and exploration, rewards and recovery, with a small real instance of useful invention and independent character consequence. AG/INV, conversation quality and measured reliability/performance work support that experience; their proximity in the code or this roadmap does not make them the next product milestone.

**The reusable-engine path** extracts shared state, sense, action-family, composition, and lifecycle contracts as those features need them.

The two meet at small interfaces. The delivered agency, perception and finite authoring consumers already use native adapters. Reuse those consumers and their recorded evidence while completing named remaining criteria, rather than waiting for or rebuilding a universal framework. None must wait for an entire module engine, G2 scripting, or marketplace.

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

For a genuinely new seam, use EWF00 to identify one concrete consumer, its assumptions and readers/writers, existing checks and behavior that must not change. The root instructions already link the architectural principles; retain that owner instead of scheduling the pointer again. The delivered first attribute/contact baseline does not need to be recreated, while its outstanding whole-system qualification remains open.

Mark deliberate current limitations at important boundaries. A narrow native physiology adapter is acceptable. A requirement that every new stat be manually recognized in the scheduler, prompt, protocol, UI, and persistence is the problem to remove.

Do not spend this stage building a general benchmark platform, relocating every file into new packages, or generating a registry that no feature consumes.

## EW-R1: first playable engine proof

Resolve a minimal reviewed world composition and one state owner. Keep existing physical storage behind an adapter if that is the smallest correct change. Extract one current need's concern and UI projection; then support a different reservoir with an actual replenishment action and no compulsory human need fields in generic interfaces.

Preserve deterministic bodily consequences and the installed world’s actual native response policy while using the existing EPR intake. Do not recreate the removed automatic human food-seeking controller: [bundled survival](worlds/base/survival.md) distinguishes cognitive choices from native bodily effects. New state owners supply meaningful change metadata without a second threshold/event pipeline and retain current-format save coverage from their first stateful change.

**Ship/stop gate:** the second same-family definition needs no new generic need-name branches; both the original game and the new fixture behave correctly. Stop generalizing adjacent body/psychology systems until a concrete next consumer warrants it.

## EW-R2: inputs beyond vision and hunger

Reuse the delivered registered sight/hearing adapters and coarse-contact proof before changing geometry or adding another modality. Complete the named uncertain-identity, modality-specific projection and controller/navigation requirements through EWF05/EWF06 and EPR. A blind tactile actor must receive only permitted information, not an ordinary vision context with the display hidden; the existing coarse proof is not complete tactile navigation.

EPR remains responsible for scope, episodes, thresholds, dirty intake, and coalescing. CR/AG consume concerns and evidence; no separate tactile cognition service. Identify any unavailable contact/navigation capability honestly and implement only the approved coarse proof.

If exact audience semantics or private-acquisition behavior changes, test that as an explicit semantic change. Do not count an index optimization as proof that the knowledge boundary is correct.

## EW-R3: useful authoring before a universal compiler

First make world-agent authoring reliable for already supported definitions under INV-1/2/4. Then expose one reusable construct with two or three meaningful ports. An initial selector plus effect, with a bounded lifetime where needed, is sufficient. Do not require every spell to use a fixed five-part ontology.

Creator A publishes a parameterized construct; creator B specializes one compatible part. Use a deterministic fixture to prove binding, execution, receipts, and source/version identity. Separately evaluate whether the world agent can perform the specialization in plain English without hidden technical manual steps.

This stage needs one typed internal execution representation sufficient for the chosen operators, not arbitrary code or a visual graph editor. Reject unsupported composition. Preserve existing confirmation rules: explicit low-impact invention can use its admitted scope, while consequential world changes and conjuring require their existing review/confirmation.

**Gate:** supported template reuse changes artifacts and approved bindings, not generic engine branches. A stronger substituted effect is revalidated and cannot inherit missing permissions.

## EW-R4: portability includes lifecycle, not just export

Coordinate live activation with INV-5 rather than creating a module installer. Start with additive compatible definitions, then one explicit version replacement while an invocation or plan still references the prior version. Demonstrate rollback-safe preparation, exact active manifests, and coherent same-version save/load.

A local pack round-trip between two test worlds is enough to establish initial portability semantics. The destination can require bindings or adapters; refusal is a valid result. A marketplace, pricing scheme, or hosted account library is not required for the first local proof.

Development compatibility follows the [root policy](../AGENTS.md#development-save-policy). Active-definition transformation must not orphan live state or make a same-version save depend on mutable “latest” behavior.

## EW-R5: ambitious behavior only with explicit semantic owners

Bring one concrete advanced feature forward when it becomes useful. For goal compulsion, the essential extension is a scoped effect interface into the existing agency owner, with a lifetime and conflict policy—not a privileged prompt or a second planner. For a hive, it is explicit shared-state and disclosure ownership—not merging all actor contexts.

Do not implement all mental effects together. Begin with a bounded fixture in an explicitly configured world. Decide consequential target/control/privacy policy before live deployment. Keep the default wilderness and ordinary user rights unchanged.

Behavioral claims need appropriate evidence. An influence prompt can guide a model but cannot establish hard compulsion. A component-body interface does not establish realistic medicine. A third-sense registry does not establish arbitrary sensory physics.

## EW-R6 and EW-R7: conditional growth

Keep restricted algorithms behind existing G2/G3 ownership. Select a sandbox only when a real mechanic exceeds supported composition. A new algorithm is permitted to compute within its admitted interface, not mutate arbitrary world state or install another interpreter. Declarative expressiveness, computational power, and authority remain distinct.

Scale and public ecosystem work follow measured active populations, real concentrated fan-out, retained history, permission enforcement, and operational needs. Public library discovery and natural-language compatibility advice must not claim that a package is safe, legally reusable, or semantically correct solely from a model score.

## Cross-cutting gates from the first slice

Every stage considers save/load, authoritative outcomes, private-source filtering, cancellation/revocation, definition references, cost, and bounded work while designing its first records. They are not cleanup tasks deferred to the final stage.

Keep default rules and specialized performance optimizations behind tested contracts. Native batching may be faster than one callback per module/entity; the abstraction does not prescribe a slow implementation. Reuse PF measurements and its stop rules rather than adding another global performance budget table.

For each promoted interface, state what is implemented now: native-only, replaceable adapter, data-defined, composable, or isolated-scriptable. Record observed results in Verification and implementation status, detailed remaining work in its tracker, and adopted documentation history in the single changelog.

## Definition of the long-term destination

A creator can ask the world agent for a supported reality, reuse or specialize player-authored constructs at several levels, review consequential choices, and activate a coherent change. Actors can perceive and act through the installed senses, needs, abilities, and controller policies; work persists and changes honestly with its evidence. Runtime integrity and human/account authority remain protected.

That destination does not mean arbitrary prose always works, every imaginable solver is installed, or OpenLegend must be finished as a general-purpose engine before its own game is enjoyable.
