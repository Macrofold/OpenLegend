# Architecture review and implementation sequence

September 19, 2026. **Adversarial design review, with revisions incorporated into the architecture documents.** This is a desk review of the proposals and relevant existing Macrofold source, not a prototype, performance result or proof that generated mechanics will always be correct. It responds to the request to critique the design as an outsider.

## Assessment

The main separation is sound: Open Legend owns the world and the meaning of evidence; Macrofold supplies reusable AI execution. The first draft was more concrete about constraining AI than about ordinary simulation, perception, player sessions and durable state. It also described extension points without always specifying the first implementable policy behind them.

The revised design starts with a small simulation and a finite library of trusted operations. Richer behavior comes from new combinations, parameters, state families and eventually isolated algorithms. Extensibility means there is a controlled path to add support; it does not mean arbitrary generated formulas become correct because they fit a schema. Fully autonomous invention of arbitrary consistent physics, excellent long-term personalities and thousands of simultaneous players remain goals requiring evidence.

## What the review changed

| Weakness in the first draft | Adjustment and consequence |
|---|---|
| Module names did not enforce independence | Defined import direction and a few concrete ports. Simulation has no database, renderer or provider dependencies. AI adapters declare optional capabilities rather than pretend all runtimes are equivalent. |
| The first slice required creation AI and modular construction before the AI path existed | Begin with a fixed profile and tiny end-to-end fixture. Add the actual creator workflow after context and declaration handling work; basic shelter arrives when survival needs it. |
| “Transactional consequences” left tick durability ambiguous | One sector commits bounded batches with sequence, epoch and simulation time. Authoritative movement/perception belongs to the committed state; rendering can interpolate separately. |
| Replay language implied more than retained evidence supported | Separate restore/outcome replay from deterministic resimulation. Keep the accepted decision in game-owned storage, independent of expiring provider traces. |
| Delayed event delivery could change who heard or saw something | Preserve event-time observations/audience, ingest idempotently and expose watermarks. Learning, appraisal and consolidation are separate stages. |
| Schema validation and query tracing appeared to establish complete causal correctness | Trusted operation families define required checks and resource effects. Tracing proves what was read, not what should have been read. Behavioral validity still needs domain fixtures and bounded admission. |
| Missing properties and pinned processes had no complete passive-update policy | Require baseline process coverage or an explicit admitted fallback. Law/owner upgrades migrate or quiesce affected work; incompatible owners cannot run simultaneously. |
| A late model answer could require perpetual full replanning | Separate semantic evidence from fresh execution guards; recheck bounded query fingerprints before discarding a result. Measure useful completion under acceleration. |
| Native Macrofold runs and lightweight decisions were too tightly coupled in the proposed migration | Share execution/accounting identity while using discriminated payloads and mode-specific executors. Make claimers, recovery and presentation kind-aware before enabling admission. |
| Artifact expiry and late usage could invalidate platform guarantees | Give promoted artifacts independent ownership/retention; distinguish terminal runs from unresolved financial attempts; reconcile through existing journals without double settlement. |
| One large expansion phase hid unrelated dependencies | Split later features into independent tracks with small demonstrations and explicit prerequisites. No generic platform project must finish before the first useful game loop. |

The detailed contracts belong in [system architecture](system-architecture.md), [context and inference](context-and-inference.md), [declarations](declarations-and-evolution.md), and the [Macrofold implementation brief](macrofold-implementation-brief.md). This review records the rationale and delivery dependencies rather than defining another competing API.

## Keep the first technical commitments small

Use one world, one sector owner, one supported profile, one game process and one transactional store. Start with ordinary records and indexed queries, an explicit fixed-step policy, one command path and a small set of declaration templates. Build an attractive PlayCanvas visual proof alongside the headless loop. Keep the model/provider outside the game commit transaction.

Version only the real seams: command/view envelopes, task contracts, world state, declaration interface and external service protocol. Start with import rules and portable contract fixtures, not a plug-in framework, generic event bus, universal workflow language, new graph database or distributed simulation. Abstract storage operations with the atomicity they actually require; “replaceable database” does not mean every datastore can implement the same guarantees cheaply.

One configured AI backend is enough initially. The fixture adapter enables failure testing; a direct provider adapter supplies a baseline; Macrofold can replace it when compatible and measured. Supporting a direct decision call does not oblige Open Legend to implement all of Macrofold. Define unsupported capabilities explicitly and preserve the selected task semantics on fallback.

Keep a coherent committed-state baseline before optimizing. If batching cannot meet the selected workload, measure the bottleneck and then change integration frequency, persistence representation or deployment. Fine-grained dependency indexes, selective journaling and multiple sectors are possible refinements; each brings new correctness obligations.

## Delivery order with exit evidence

These are internal engineering steps, not separate playable releases. Under the accepted M10/M11 [MVP scope](../05-project/first-playable-mvp.md), **S0–S4 together deliver P1**: live AI decisions and conversation, useful Jev classification, generated sling crafting, hunting/harvesting/food and another supported invention. S5 expands discovery/creation toward P3. No-model and carrying-bundle fixtures alone do not meet the first playable claim. This is a dependency order, not an instruction to implement in this documentation task.

| Step | Smallest useful deliverable | Required evidence before expanding |
|---|---|---|
| S0: prove the seams | Fixed effective profile; one actor/item; one command → commit → event-time observation → context → fixture decision → validated follow-up. Run the visual proof in parallel. | Duplicate command/result is harmless; forced crash after commit restores the same item and receipt; no provider or renderer needed for the headless test. |
| S1: embodied native survival | Move, gather, carry, eat and rest; essential actions, need/death clock, pause/speed/absence, restore, browser view and basic controller identity. Begin the simple animal and food-handling support needed by S4. | Native plans progress through provider delays while playing; manual pause and absence under the selected pause policy freeze world progression and autonomous AI scheduling; return performs no offline catch-up. This tests execution, not live-AI product acceptance. |
| S2: live contextual decisions | Task-specific context; live LLM route for useful decisions; useful bounded Jev classification route; bounded observation/commitment storage. | Authorized evidence, explicit unknowns, stable submission and late-result handling; live route outcomes, queue/provider/total latency and usage measured. Fixtures support tests but cannot substitute for required live integration. |
| S3: one resident with continuity | Live conversation, committed speech, autonomous short plans, meaningful replanning, natural learning, protected promise and bounded memory. | Recent promise available despite index lag; private history stays private; death/interruption invalidates stale work; native execution supports ongoing AI behavior. Add second-client ownership/reconnect tests before shared play. |
| S4: generated survival tools and complete P1 loop | Trusted preparation/assembly, equipment/ammunition and ranged family, simple animal reactions/damage/death, finite harvest and food preparation; live-generate a sling recipe, craft/use/save/reuse it; another invention with bow-and-arrow the candidate. | Full [MVP acceptance](../05-project/first-playable-mvp.md#evidence-required-for-a-first-playable-claim): generated tool has physical utility; materials/work/ammo/harvest conserved; paraphrases reuse; wrong inputs, stale/duplicate work, save/restore and live cost measured. No hardcoded finished recipe presented as invention. |
| S5: one state-family extension and creator loop | Introduce one coarse moisture or exposure relationship, migrate an affected object/process, and exercise the cloak-as-roof story. Add AI-assisted creator setup using a curated preset and bounded missing-setting resolution. | Fixed-step contributions, passive unknown policy, atomic activation, history consistency, separate actor knowledge and readable profile assumptions work through save/reload and service failure. |

The [CR01–CR12 cognition track](../../docs/maintainers/cognition-redesign.md) refines S2/S3 under the current [memory specification](../../docs/memory-architecture.md): Jev attention/escalation, minimal level-2 speech, low/high complex routes, awareness, independent hourly cleanup and background file reflection, PostgreSQL accepted text and rest/dream thresholds. S2/S3 continuity and live-evidence gates remain necessary; prototype fixtures do not complete the redesign.

S2 and Macrofold's first inference slice can proceed alongside later S1 work once their small contracts exist. A first development conversation need not wait for Jev, remote context-provider registration, sophisticated forgetting or a task scheduler; completed P1 must nevertheless exercise the agreed useful Jev route. S4 needs enough native families to support the hunting/food story, not every planned material/system family. Carrying bundles are a useful earlier fixture. Detailed ballistics, anatomy, ecosystems and fire spread remain later scope.

The creator flow remains required direction. Moving its generalized AI authoring UI later prevents it from becoming a prerequisite for testing the world it is supposed to create. Likewise, a fixed initial profile is a seed fixture, not a decision that all future worlds must share its premise.

## Macrofold work that Open Legend actually depends on

The first integration dependency is a bounded inference with explicit context, immutable execution configuration, validated result, status/cancel, accounting and recoverable receipt. It must complete without a workspace or sandbox. Measure it against the direct adapter immediately, including mixed native/lightweight contention. A successful contract fixture establishes behavior; only a representative deployed measurement establishes latency or cost.

For P1, connect Jev to an actual bounded game question alongside the LLM routes. Context references can follow when a real consumer benefits; the initial context may travel inline. Bounded tool loops follow when a resident or authoring task needs iterative retrieval. Cross-run task wait/wake is a different capability and can follow independently; the game already schedules its own simulation-driven work. Native isolated authoring remains available for code/tests. Do not make every NPC a durable Macrofold task or conversation merely to reuse infrastructure.

If Macrofold overhead misses the selected interaction budget, preserve the direct adapter, identify whether admission, storage, dispatch or provider time dominates, and adjust the relevant path. Do not bypass accounting or permission checks to obtain a flattering benchmark. A warm native VM pool does not substitute for the lightweight execution path.

## Independent expansion tracks

| Track and desired functionality | Prerequisite and smallest demonstration | Gate / deferred work |
|---|---|---|
| Private worlds, presets and mechanics packs | S4/S5 manifests, artifact ownership and export permissions; export one recipe into a second compatible world | No private-memory export, dependency mismatch or silent rule upgrade; marketplace/payment UI can wait. |
| Rich construction, materials and local fire | S5 state-owner/contribution contract; replace a roof part, expose it to rain, then test a bounded source/fuel process | Resource accounting and step-size comparison now; unloaded-state migration when unloading is introduced. Deep structural/thermal solvers remain optional. |
| G2 generated algorithms | A desired rule demonstrably exceeds trusted compositions; one admitted isolated algorithm with typed reads/effects | Bound resources, trap without partial effect, preserve host authority, measure game-step overhead. Macrofold authoring sandboxes are not the per-tick game runtime. |
| Families, anatomy and population | Survival/lifecycle records and explicit biological-time/recovery policy; one birth/growth/death sequence | Stable identity/relationships, no doubled aging under acceleration, explainable continuity; tune population costs before large societies. |
| Text phones, voice and spoken input | Committed speech/call state and listener permissions; one human/NPC text exchange, then one private audio call | Disconnect/interruption/cancel and listener revocation; text remains usable. TTS completion never creates a second speech event. |
| Institutions, trade and currency | Atomic ownership changes and explicit role/commitment records; one negotiated trade and cooperative project | Replay-safe transfers and scoped authority; declaring a government cannot grant platform powers. Rich economic balance needs separate evidence. |
| More players and sectors | Measured single-sector limits, controller/reconnect and durable batches; two-sector handoff with a crash | One authoritative owner/item after recovery. Start with gates; seamless cross-border fire, audio and construction need additional protocols. Thousands overall remains an aspiration. |
| Assets and presentation depth | Stable semantic presentation bindings and fallback geometry; depict one new admitted object/action coherently | Picking, footprint, animation cues, download limits and provenance agree with mechanics. Bespoke generated art is asynchronous and not a prerequisite for executing a supported recipe. |
| Managed access and creator ecosystem | External entitlements, actual usage evidence, content rights and private-world boundaries | A test subscription/recognition maps once to a world entitlement; rewinds do not duplicate claims. Prices, payouts, grants and optional token concepts remain separate product work. |

No feature is “covered” merely because it appears in this table. Each track still needs its small domain specification and a working demonstration. The table preserves a place for the desired functionality without pretending every later subsystem is designed in detail now.

## U14 delivery track: governance, controls and the workshop

These later requirements do not change the S0–S4 first-playable acceptance gate. Their detailed contracts live in [governance](../03-design-proposals/invention-governance-and-ownership.md), [controls](../03-design-proposals/playability-and-controls.md) and [world agent/workshop](../03-design-proposals/world-agent-and-workshop.md). Implement useful slices independently after their stated prerequisites:

| Slice | Dependency and exit evidence |
|---|---|
| Admission policy and provenance | Add stable invention/version/creator/installation references and a persisted lock. Demonstrate a lock racing an in-flight invention, restart, and every admission entry point; existing actions still work. Establish identity and contribution terms before accepting multiplayer contributions. |
| Complete catalogue and durable inspection | Enumerate permitted actions with pagination, availability and categories. Persist an indexed journal and retained invention artifacts; inspect an invention after it leaves recent scrollback. Build ranking from deduplicated committed executions; incomplete indexes disclose lag. |
| Configurable controls and read-only world agent | Use the catalogue for drawers, remapping and contextual slots. Independently expose scoped world/journal queries to a bounded agent; show evidence and history gaps, reject cross-world reads, and apply revocation. Neither requires version editing. |
| One G1 workshop revision | Resolve the owner-lock policy, create a versioned diff, test and explicitly activate it. Demonstrate preserved prior history and a supported instance/process migration, stale-base rejection and restart without duplicate activation. |
| Account library and complete pack cloning | Preserve authorized authored artifacts across host departure/closure; assemble one complete dependency-pinned release and import it into another world. Set reuse/consent terms before offering free-use contributions; identify blockers and never label partial export complete. Marketplace commerce follows rights and compatibility evidence. |

Prefer repository interfaces and projections in the existing application until operational needs justify more services. G2 code inspection/authoring can use the same provenance and workshop UX later, but executable admission still depends on its separate isolation and behavioral-validation track. Slot counts, ranking weights, licensing details and richer delegation remain adjustable choices, not prerequisites for all five slices.

## Coverage and remaining uncertainty

| Requirements | Architectural home and current maturity |
|---|---|
| F01, F08, F21–F23, F31 | Player/controller path, event-time perception, concurrent inference and serialized commits; initial contract proposal |
| F02–F03, F35–F39 | Native survival, mortality and accelerated clock first; detailed anatomy/aging policies expand later |
| F04–F07, F09–F10, F48 | Memory/learning/appraisal and event-triggered cognition; family/life stages have a separate expansion gate |
| F11–F15, F17–F20, F42–F45, F47, F49 | Trusted declarations, inference routing, state owners, consistent activation and creator commands; arbitrary novel law admission remains a research risk |
| F16, F25, F40 | PlayCanvas and presentation contract; generated assets eventually, reusable fallbacks first |
| F24, F27 | Separate speech/text-call/media track, preserving audience and interruption semantics |
| F26 | Single-sector measurements before handoff/scale; no capacity claim yet |
| F28–F29 and community directions | Usage/entitlement/provenance seams preserved; business terms, adjacent markets, funding and payouts not resolved by engine architecture |
| F30, F32–F34, F41 | Minimal modular slices, existing research, documentation-only status and independent simulation |
| F46 | Curated starting profile first; bounded AI-assisted world creation after context/declaration contracts |
| F50–F52 | S0–S4 collectively deliver live AI/Jev, generated sling/hunting/food and another invention; pause/speed, optional connected background play, and no offline progression or autonomous work while paused |

Before each paid/runtime integration, settle the applicable budget, deadline and failure policy. Initial absence is settled: default to pausing when hidden/unfocused, with an explicit opt-out for connected background play. Before any future offline/shared mode, choose its clock/aging/absence arbitration. Before automatic admission, choose the trusted envelope and passive unknown policies. Before G2, test isolation and runtime cost. These choices need not block the tiny fixture/contract slice.

The highest remaining risks are whether contextual decisions are useful at affordable frequency, whether limited rule families yield enough creative play, whether migrations preserve a convincing consistent world, and whether that world is enjoyable to inhabit. The revised sequence tests these risks early. More abstraction cannot settle them; observed behavior and measured failures must guide the next extension.
