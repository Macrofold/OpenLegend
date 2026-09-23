# Extensible world foundation — implementation tracker

[INV-15–INV-19](inventions-and-world-evolution.md#unified-world-agent-delivery) now own the agent-facing graph/MCP/kind-adapter integration and capability journeys. EWF remains responsible for the actual shared host/state/port interfaces; tool descriptions or graph edges do not complete them. Use [Composition](../invention-composition.md) and [target scenarios](../invention-scenarios.md) when qualifying unlike consumers.

**Status: the first attribute and coarse-contact slices are implemented; broader EWF release gates remain open.** Checked items below identify delivered work, not automated or live-model acceptance. See [current implementation](../architecture.md#extensible-attribute-foundation) and [runtime evidence](../verification.md#extensible-attribute-runtime).

[Engine and world boundaries](../engine-and-world-boundaries.md) owns the architectural decision rule. [World-module runtime](../../archive/07-technical-architecture/world-module-runtime.md) owns the shared integration contract. Current behavior and test results belong to [Architecture](../architecture.md) and [Verification](../verification.md).

## Ownership and execution rules

This tracker owns missing shared registration, typed state, default-module boundaries, generic projections, sense/controller integration contracts, and cross-subsystem proofs. It is not another action, event, invention, save, or performance backlog.

| Existing tracker                                                                    | Work retained there                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [AG](agent-agency.md)                                                               | Multi-operation decisions, operational intentions/plans, native continuation, freeform attempts, actor-side invention                            |
| [EPR](events-perception-and-reactions.md)                                           | Stimulus scope, observation episodes, internal threshold events, reaction intake, cursors, and sensory scan improvements                         |
| [INV](inventions-and-world-evolution.md)                                            | Invention orchestration, mechanical family registry and schema, data-driven action discovery, active-definition activation, materials, packs, G2 |
| [CR/CH](cognition-redesign.md) and [NC](narration-and-conversations.md)             | Standard cognition, memory/recall, reflection, conversations, expressions, story selection/narration                                             |
| [ACT](actor-model.md)                                                               | Existing unified actor/lifecycle implementation and remaining compatibility/behavior acceptance                                                  |
| [PF](performance.md), [SL](save-and-load.md), [production data](production-data.md) | Profiling, scheduling capacity, same-version saves, durable state/receipts, and recovery                                                         |

When a shared change touches another track, update that track with a link and the relevant dependency. Do not copy its task body here or mark it complete from an EWF integration check. Preserve existing task IDs and checkbox states.

The [capability roadmap](../extensibility-roadmap.md) sequences early proofs and later horizons without owning task status. [Worked examples](../extensible-world-examples.md) supply cross-system anchors. EWF11 adds shared reusable-construct integration; EWF12 adds runtime-to-world-agent explainability integration. INV retains their compilers, drafts, tools, and activation workflows.

## Read before implementation

Read `AGENTS.md`, both new design documents, the master index, current Architecture, `docs/extending.md`, save/load's active-development policy, and the AG/EPR/INV owner documents. Inspect current code, not the original audit's line numbers, and preserve unrelated changes.

Current starting points worth retaining include unified actors, shared native body effects, immutable domain snapshots, one writer, journal plus checkpoints, cold history, durable conversations/story jobs, scoped reference binding, current manual save files, and the story evaluator registry. The AG and EPR designs are not proof their complete runtime exists.

No old-development-save migration, compatibility reader, or legacy fixture is part of EWF. Same-version save/load, external spending/privacy authority, and active-definition lifecycle remain required.

## Delivery order and stop rules

1. **EWF00–EWF02:** short baseline, minimal host/world binding, typed state ownership.
2. **EWF03–EWF04:** one complete default need/body slice and safe context/UI integration; prove a second non-human need before generalizing every current system.
3. **EWF05–EWF06:** general sense and controller/action integration using the relevant EPR/AG/INV interfaces.
4. **EWF07–EWF09:** lifecycle, budget, and integrated qualification; design these boundaries from the first stateful slice, not at the end.
5. **EWF11–EWF12:** after the relevant first interfaces, prove typed reuse/specialization and the natural-language authoring bridge; do not make the first need/sense slice wait for them.
6. **EWF10:** conditional extension review only. Do not build G2, parallel body execution, or new spatial physics without its evidence gate and existing owner.

AG01–AG04 need not wait for a complete world-module runtime. INV's first playable authoring workflow need not wait for every attribute/sense. EPR can continue with current native detector adapters. Agree the interface at the point of integration; avoid a prerequisite cycle that prevents any playable slice.

The first useful release gate is EWF01–EWF04 with current-format save continuity and a no-new-generic-branches second-need fixture. Do not spend the entire first batch constructing a framework with no consumer.

## EWF00 — Pinned baseline and change boundaries

**Dependencies:** none. **Files:** current `AGENTS.md`, `types.ts`, `living.ts`, `kernel.ts`, `perception.ts`, `declarations.ts`, `response.ts`; server context/catalogue/save code; current trackers.

- [x] Record the implementation commit used for the work and the actual current host/world policy boundaries. Keep that audit evidence in Verification or the work report, not a new permanent source-of-truth architecture.
- [x] Identify all readers and writers for the first attribute slice, including native progression, direct actions, effects, god editing, cognition, UI projection, and save validation.
- [ ] Establish fixture traces for the current wilderness loop and current perception/response boundaries. Distinguish an intentional semantic change from a refactor regression.
- [x] Identify the already implemented work: do not recreate shared actors, conversations, journal/SSE/save systems, or the population-perception spatial pass.
- [x] Agree the shared interface handoffs with INV-3.1, EPR01/EPR04/EPR05, AG01–AG04, and SL. Record dependencies in their existing trackers rather than duplicate tasks.

- [x] For each deliberately fixed v1 boundary touched in this slice, record its present limitation, intended seam, expansion trigger, and owning task in the relevant design. Add a brief nearby code pointer; do not introduce a duplicate debt tracker or claim a future API already exists.

**Exit:** the first slice has a known state owner, known callers, an unchanged behavior baseline, and a small implementation scope. This task does not require a general benchmark platform or complete repository cleanup.

The first slice is bounded to numeric/category attributes and native physiology adapters. One 600-step wilderness runtime comparison and an isolated browser recharge/save/load exercise were run; no automated tests were written or run. Registered senses, AG multi-operation/frontier delivery, EX04 constructs and world-agent authoring remain open. Native charge does not imply a power/shutdown solver.

## EWF01 — Host registrations and one resolved world manifest

**Dependencies:** EWF00. **Contract:** runtime §§2–3. **Suggested code location:** small reviewed modules inside `packages/domain/src`; composition wiring in the existing application root. Exact filenames follow repository conventions.

- [ ] Add a typed common descriptor for host implementation identity/interface, definition kind/codec, required services, state/effect domains, and execution category. Use service-specific interfaces rather than one callback accepting arbitrary world JSON.
- [ ] Add one serializable installed manifest, provisionally `WorldState.moduleManifest`, resolving exact definitions, dependencies, policy bindings, and state-owner bindings. Reuse existing definition identity where available; do not create a competing invention library.
- [x] Resolve the default wilderness composition once during creation/load binding. Reject unknown or incompatible required implementations, duplicate owners, invalid namespace IDs, and missing dependencies before the candidate becomes active.
- [x] Keep function references in trusted code only. Reject user-supplied module paths, executable expressions, validator replacements, and grants. Data may select only implemented and authorized capabilities.
- [ ] Adapt the existing story-policy binding as a small reference consumer when useful without exposing hidden story fields or rewriting NC selection behavior.
- [x] Keep this common envelope distinct from INV-3.1's mechanical family codec/execution implementation. That task consumes the envelope; it is not implemented twice.

**Tests:** same definitions resolve deterministically; unknown kind/version and duplicate state owner fail; namespaced IDs do not collide; instance values remain separate from definitions; a data artifact cannot load code or expand grants. Include a missing required implementation on current-format load.

**Exit:** a world explicitly names its installed default policies and their implementations without requiring an external package manager or remote lookup on each tick.

## EWF02 — Typed state providers and one authoritative value

**Dependencies:** EWF01. **Contract:** runtime §§3–5. **Files:** domain types/living/state mutations; current god editing; current state projections.

- [x] Implement the minimum schema-validated state definitions needed by the first reservoir and a nonnumeric counterexample. Include semantic type, units/scale where applicable, bounds, applicability, initialization, ownership, and disclosure.
- [x] Support sparse namespaced state for genuinely new attributes. Keep existing hot fields behind explicit typed providers until cut over; do not permanently dual-write fields and a generic map.
- [ ] Route mutations to the registered owner, preserving expected revisions, actual contribution provenance, deterministic aggregation, and existing transaction semantics. Arbitrary JSON paths or unbounded `effects` maps are not mutation APIs.
- [ ] Resolve missing/unknown/not-applicable/default cases under the existing declaration contract. Do not silently materialize zero-valued state on every entity.
- [x] Expose meaningful change metadata suitable for EPR's existing scope/threshold interfaces. Do not implement a separate threshold detector, event store, or reminder scheduler here.
- [x] Validate that new state cannot overwrite protected actor identity, current privacy/accounting records, or another module's values by reusing a display name.

**Tests:** one canonical value across native actions/editor/projection/save; wrong units/type/owner rejected; idempotent changes and conflict handling; unknown is not zero; absent optional attribute does not initialize unrelated species; existing default quantities preserve their outcomes.

**Exit:** one additional state definition does not require another mandatory field on every actor or another writable copy in the mind, UI, or provider workspace.

## EWF03 — Extract default body and need policies through real consumers

**Dependencies:** EWF02. Coordinate with ACT, INV contribution semantics, and EPR04; use the existing native evaluator before full EPR delivery.

- [ ] Move current wilderness physiology/body configuration behind reviewed registered implementations. Preserve its current values, controller defaults, maximum-health logic, food seeking, recovery, and update order in the initial extraction.
- [x] Keep eating, food seeking, work continuation, rest, sleep, and cognitive urgency as separately named policies. Do not normalize their different thresholds into one number.
- [ ] Remove hard-coded dependence on the selected first need from generic consumers. Native mechanics may retain their domain-specific adapters; generic context, inspection, and scheduler wiring must obtain its meaning through the common contract.
- [ ] Define a concern projection and supported response references for that need. Reuse native action eligibility; do not infer execution from an English description or automatically create goals.
- [x] Add one reviewed fixture module for charge or lunar reserve with an actual supported replenishment action. Use the selected same interfaces; do not add a new `if charge` branch to generic controller, protocol, or meter logic.
- [x] Use EX01 as the first end-to-end example, and keep broader anatomy or psychology out of this extraction.
- [ ] Prove a non-human actor can omit the human need without receiving fake hunger, sleep, or verbal mind state. Keep ordinary native animals inexpensive and cognition opt-in.
- [ ] When the first body policy is exposed, isolate death/collapse/revival choices from runtime permission/identity rules. Preserve the current accepted full god-revival behavior; do not reopen it as an unresolved decision.

**Tests:** matched current wilderness traces; optional need absent; second need changes through native action; concurrent effects/resources reconcile; no automatic paid decision for every decrement; body effects remain native and cannot be authored by unvalidated prose.

**Exit:** the default game uses the new extension boundary rather than retaining a privileged side path, and a second meaningful need works without changing the generic runtime's vocabulary.

## EWF04 — Generic permitted inspection, context, and presentation

**Dependencies:** EWF02–EWF03. **Files:** protocol `index.ts`, server `view.ts`, `decision-context.ts`, response/context helpers, god editor projections, React condition/editor components. Coordinate CR/NC presentation owners.

- [x] Add a bounded server-projected attribute/condition view with stable definition ID, safe name, display kind, value/range/units where permitted, uncertainty/visibility, and approved symbolic presentation reference. Do not expose private declaration data wholesale.
- [x] Render the applicable meter/label/category from that view instead of requiring every actor to supply health/hunger/energy. Allow specialized native UI to consume the same authoritative projection where useful.
- [x] Supply bounded typed context contributions from installed needs/body modules. Preserve required evidence and total context budgets; descriptors are untrusted character data, not new high-priority instructions.
- [x] Route editor changes through the corresponding owner service and expected revision. Generic editing cannot modify definition authority, evidence links, ownership, or protected external records.
- [x] Preserve asset fallback, keyboard accessibility, current server authority, and plaintext handling. No generated HTML/JavaScript, arbitrary CSS execution, or model calls on hover.
- [ ] Remove redundant generic literal-name assumptions only after their callers use the new view; do not replace all specialized UI with an unbounded form generator.

**Tests:** charge/mana-like range not forced into 0–100; categorical trait renders without a fake bar; private value omitted even if declaration is public; added need appears in allowed context/inspection/UI; label injection is inert; unknown display cannot become zero; editing uses native effects and preserves atomicity.

**Exit:** the second-need fixture needs no new top-level protocol field, hard-coded prompt paragraph, or React meter branch.

## EWF05 — Registered sense definitions and generalized evidence shape

**Dependencies:** EWF01 and sufficient EPR01 scope contract. EPR owns episodes, exact audience integration, and dirty intake; sensory design owns geometry/detail policy.

- [x] Add a service-specific sense descriptor selecting implemented candidate/detector/projection interfaces with exact version and bounded configuration. Keep current vision/hearing implementations as adapters first.
- [x] Support evidence whose source identity or location is unknown and whose subject is a contact/region rather than a fully identified entity. Define permitted data separately from server-only provenance.
- [ ] Support sense-specific quality/detail dimensions and change metadata rather than a universal binary visible flag or one globally ordered detail enum.
- [ ] Resolve source response from shared definitions, sparse overrides, or reviewed derivation. Adding a sense must not allocate its property on every object or make unmodeled response equal invisibility.
- [x] Add one third-sense fixture using a supported primitive, preferably coarse contact/proximity. Document its approximation. An electromagnetic signature fixture may use a supported bounded radial query; it must not claim a field solver exists.
- [ ] Hand results to EPR's acquisition/episode system and standard context, with event-time scope and receiver rules. No separate sense-specific cognition pipeline or raw omniscient target list.
- [x] Reuse the existing post-movement spatial improvements and exact-query boundaries. Do not implement a second index or mark EPR02 fully complete without its remaining tests and audience work.

Delivered scope: pinned vision/hearing/contact adapters, unidentified present/moving contact views, private onset/detail/end evidence and short direct movement probes are implemented. Same-version episodes are captured with the existing world. A native runtime run verifies speech exclusion, stable contacts and continuation; broader source responses, general EPR intake, learned navigation and touch-only player presentation keep the remaining items open. See [evidence](../verification.md#extensible-attribute-runtime).

**Tests:** unchanged vision/hearing baseline; third sense added through registration/configuration; unidentified sound/contact; detail change without entry; stationary observer/moving source; hidden properties not revealed; private internal event bypasses spatial audience; restore does not create false novelty.

- [ ] Use EX02 to verify touch-only control has no hidden vision, hearing, or omniscient navigation-context fallback. Any coarse contact/navigation approximation must be explicit; identifying a missing host primitive is an honest supported outcome, not completed touch mechanics.

**Exit:** a new supported sense does not require changing the generic cognition contract or enumerating every object to add a new field. Novel physics still returns an explicit host-capability gap.

## EWF06 — Action and controller integration without a parallel agency system

Delivered native agency scope and remaining AG/INV boundaries are recorded in [Architecture](../architecture.md#actor-agency-foundation); delivery state remains in the [AG tracker](agent-agency.md).

**Dependencies:** EWF01–EWF04 plus the particular INV-3/AG interfaces being consumed. Basic AG01–AG04 can proceed earlier.

- [ ] Bind mechanical family descriptors supplied by INV-3 to the shared manifest/version contract. INV remains the sole owner of action family schema, applicability, execution, and catalogue expansion.
- [ ] Define the controller-facing concern/observation/affordance interface. Standard cognition, native animals, and player input use distinct adapters with explicit capabilities, not a mandatory human mind.
- [ ] Connect module-defined needs and sense evidence to AG06/CR context through bounded projections; connect dependency changes to EPR, not a second work queue.
- [x] Ensure AG's optional repeated operation kinds and open attempt route survive family registration and provider schema adaptation. Closing action suggestions does not remove the proposal route.
- [ ] Preserve one current physical lane, native step receipts, actor-method fidelity, private invention feedback, and separation between definition admission, learning, proficiency, and item creation.
- [ ] Keep module/algorithm selection separate from execution budget, account permission, and origin locks. Do not automatically enable autonomous invention or invoke a creator session as an NPC controller.

**Tests:** player discovery and NPC suggestions agree on legal bindings; a supported action may resolve from prose through AG without a new definition; unavailable shortlist does not suppress a permitted attempt; completed step—not queued step—unblocks continuation; private invention remains private; standard controller still handles an actor with the second need and third sense.

**Exit:** action/agency work expands through its existing owners, with no new generic dispatch switch for each world-specific name.

## EWF07 — Module lifecycle and current-format save integration

**Dependencies:** start design at EWF01; complete after relevant stateful slices. INV-5 owns live version activation, SL owns save/install, data owner owns transactions.

- [ ] Include installed manifest, definition dependency closure, module state, and behaviorally relevant episode/deadline bindings in same-version capture. Register any new authoritative store with the existing save boundary rather than writing an independent save system.
- [x] Resolve exact host/definition interfaces before installing a loaded candidate. Missing required mechanics or dependency bytes reject the candidate without changing the active world; do not generate replacements.
- [x] Rebuild only derived indexes and caches. Restoration must not run ordinary spawn/grant hooks, reroll state, dispatch paid work, or reinterpret abandoned-future callbacks.
- [ ] Supply INV-5 with the module-level dependency and state-owner changes needed for activation and retirement. Do not add a competing module installer or bypass existing authoring/activation permissions.
- [ ] Verify removal or replacement while an action, AG plan, source observation, private mind, or retained save still references the old version. Reject or use the owner's explicit compatible transition; never orphan state or allow two writers.
- [ ] When a stateful effect or specialized construct is included, save its exact definition bindings, active contribution, supported termination state, and relevant phase/deadline. Expiry or module removal cannot restore a stale target snapshot or erase unrelated later changes.
- [x] Keep development-format breaks separate from live definition updates. Add no legacy readers; preserve real spending, current privacy, and load-generation fencing.

**Tests:** same-version save/load of a custom need/sense; save with a missing required definition; replaced implementation interface; stale callback from same world ID/different load generation; removal blocked by a live dependency; failed activation leaves old manifest/state; returned receipt does not imply a repeated installation.

**Exit:** customization survives coherent save/load and uses the existing activation lifecycle without hidden mutable global configuration.

## EWF08 — Declared dependencies, aggregate budgets, and containment

**Dependencies:** EWF01–EWF06 as applicable; EPR/PF retain actual scheduler and profiling implementations.

- [ ] Expose meaningful state/query membership dependencies for registered modules. Include old/new spatial regions and scope/manifest changes; observing only returned entities is insufficient.
- [ ] Include construct expansion depth, combined selector fan-out, recurring effect descendants, and per-invocation versus shared state in budget review. Nested individually small artifacts cannot evade world-level bounds.
- [ ] Validate finite work and fan-out per definition, and aggregate installed/subscribed work against world/host bounds. Reject infinite zero-time rescheduling and duplicate owners before activation.
- [ ] Distinguish required native effects/evidence from optional wakeups, model work, and presentation. Optional failures cannot silently erase required state or become in-world explanations.
- [ ] Preserve the declared native phase order and RNG behavior. Name intentional changes and prove their consequences; a new registry cannot reorder rules arbitrarily.
- [ ] Integrate profiling with PF's existing metrics. Do not build another telemetry database, generic broker, or unbounded per-object queue.
- [ ] Apply the host failure policy to invalid module output. Native reviewed implementations are not claimed to be safely preemptible untrusted scripts; G2 remains conditional.

**Tests:** unrelated UI telemetry does not invalidate module computations; new query member is detected; many small modules cannot bypass aggregate limits; feedback loop is bounded/rejected; invalid optional output leaves world effects intact; changed snapshot/manifest invalidates only relevant projections without widening permissions.

**Exit:** the extension mechanism does not make work or permissions unbounded merely because each individual declaration looked small.

## EWF09 — Cross-world proof and release qualification

**Dependencies:** first useful EWF01–EWF04 slice, then EWF05–EWF08 integrations. Coordinate existing AG/EPR/INV/CR/NC/ACT/SL/PF tests rather than rebuilding their suites.

- [ ] Run the baseline human wilderness loop through the extracted default policies. Compare action results, resources, event/audience ordering, native time and RNG where behavior is intended unchanged.
- [ ] Run a mechanically different actor with the additional reservoir, a supported replenishment action, and no compulsory human fullness. Confirm normal projection, context, and same-version continuation.
- [ ] Run the third-sense case, including partial recognition, no known source identity, and changed detail without object entry. Confirm bounded EPR intake and private evidence.
- [ ] Use INV's accepted non-weapon/composition fixture to test that an admitted output can participate in a supported later composition without weakening capability validation. Do not invent a hidden canned recipe or bypass family bounds.
- [ ] Exercise install/load/remove failures, actor/controller grant boundaries, god-versus-ordinary projections, duplicates and unknown callbacks. A fixture may select a fantasy profile only when the relevant native effect exists; it must not silently enable magic in the default world.
- [x] Inspect the code diff for the generality claim: adding the second same-family definition changes definitions/registration and fixtures, not generic protocol, cognition, scheduler, UI, and persistence branches. Any necessary new host primitive is explicitly identified rather than concealed.
- [ ] Measure against the same existing PF baseline, including dense observation fan-out and mature history. Report results and limitations; do not infer scale or model quality from a native fixture.

The delivered local reuse exercise covers definition-only attribute transfer and explicit unsupported-host rejection. It does not complete the construct/adaptation cases in EWF11.

**Exit:** the new boundary is demonstrated through different worlds, not merely an interface declaration. Keep unrelated acceptance gates open. No live-provider call is required to prove native generality; paid behavioral quality remains the relevant separately authorized AG/CR/NC gate.

## EWF10 — Conditional capability expansion review

**Dependencies:** a demonstrated inability of the current interfaces to express a useful feature. No implementation is authorized merely by this task existing.

- [ ] For a proposed advanced feature, identify whether it needs only a new definition, a new reviewed native evaluator, an isolated G2 algorithm, or a new G3 host primitive.
- [ ] Reuse the existing INV G2 task and D20 for executable isolation decisions. Add the specific consumer and required interface to that owner, not a second sandbox roadmap.
- [ ] Review EX05–EX09 and EX11–EX12 only for an actual requested consumer. Goal-compulsion, shared-memory access, time bubbles, and simultaneous body-resource arbitration need explicitly supported operations and policy; the registry alone implements none of them.
- [ ] Preserve ordinary self-authored AG goal permission. A future cross-actor mental effect needs a dedicated target-owner operation, conflict/lifetime semantics, explicit human-control policy, and tests proving expiry does not restore old whole-state snapshots. Add concrete delivery to the relevant existing AG/INV/CR owners, not a new parallel mind framework.
- [ ] Treat arbitrary field solvers, non-spatial topologies, simultaneous body-resource arbitration, shared/private-memory organisms, and player-authored controllers as separate concrete consumers. Do not promise them from a generic registry alone.
- [ ] Require a bounded prototype, explicit grants, relevant invariants, performance evidence, and failure/save semantics before widening the supported interface.

**Stop condition:** without a demonstrated consumer and approved boundary, leave the advanced feature unsupported and explain it honestly. Do not let speculative capability work block the first playable extension loop.

## EWF11 — Reusable-construct integration and local portability proof

**Dependencies:** EWF01 plus the actual INV-3 family/composition interface; EWF07 save/version boundary as soon as stateful instances exist. **Contract:** runtime §3, including “Reusable constructs and specialization,” and §5 active effects. **Ownership:** INV owns construct schemas/compiler, candidate admission, specialization/forks, and pack artifacts. EWF owns consistency with common module/authority/state/projection contracts and the cross-world integration proof.

- [ ] Agree one construct/reference/port vocabulary with INV-3; reuse the existing definition envelope and exact version/digest identities. Do not create EWF-owned copies of the compiler, installer, draft state, or package registry.
- [ ] Require port descriptors to expose semantic interface/version, units/bounds, target/effect domains, binding phase, optional/default behavior, and contributed dependencies. Preserve typed service distinctions instead of accepting arbitrary callbacks with the same output shape.
- [ ] Integrate partially bound templates, closed specializations, and active invocations distinctly. A required unbound port prevents execution. Per-cast state cannot accidentally live on a shared definition.
- [ ] Connect resolved constructs to existing installed manifests, state owners, scopes, aggregate budgets, context/action presentation, and current-format saves. No special top-level transport fields for named spells.
- [ ] Prove a small selector/effect construct and two compatible specializations using supported native families. One may be instantaneous and another use an implemented lifetime; do not require a duration field for every effect. Follow EX04 without building a full spell language.
- [ ] In two local test worlds, qualify unchanged reuse, explicit parameter binding, an explicit semantic adaptation, and an unsupported dependency. Follow EX08/EX10; publishing a marketplace or choosing commercial terms is not a prerequisite.
- [ ] Inspect derived permission and cost changes when swapping a port. A bodily effect replaced with a mental-effect reference rejects until that interface and target authority actually exist; an effect ID never grants them.

**Tests:** wrong interface/units/target/effect domain; default versus required-unbound port; bound-phase override; pinned dependency versus changed upstream version; two casts with separate state; nested fan-out caps; import without required rights/capabilities; removal with a retained dependency; save/load of the invocation; no private goals/memories in exported artifacts.

**Exit:** a creator's supported reusable construct can be specialized and used through the existing path, while a second world receives either a valid binding or a concrete compatibility explanation. Generic framework code does not acquire branches for individual spell names. No claim of arbitrary cross-world portability or G2 safety follows from this fixture.

## EWF12 — Runtime-to-world-agent authoring and explanation bridge

**Dependencies:** a real first supported module/family and the relevant INV-1/2/4 authoring operations. It can begin with native descriptors before full template composition. **Contract:** runtime §13 authoring boundary; world-agent/workshop and UI owners define the user workflow.

- [ ] Supply the existing world-agent tools with bounded, permission-filtered support discovery: installed host interfaces, reusable constructs, supported ports, required bindings, effect/lifetime domains, defaults, examples, and known unsupported capabilities. Do not provide an omniscient private registry dump.
- [ ] Expose validation/projection results that let the existing draft service relate a requested behavior to exact bindings, assumptions, affected state, required decisions, and current support. The technical artifact and validation result are authoritative; the chat is not a second schema store.
- [ ] Wire candidate-revision/digest and scope into existing review/confirmation, so a stale explanation cannot approve a materially different effect or wider target set. Preserve existing low-impact automatic-invention envelopes and stronger world-change/conjuring rules; no universal extra confirmation per tool call.
- [ ] Support inspectable structured/raw details and conversational revision of the same candidate. Unknown fields, direct raw edits, and “please approve” in descriptions cannot bypass validation or expand grants. Failed compilation remains a draft with explicit blockers.
- [ ] Prove a native fixture authoring sequence for EX01/EX02/EX04: discover, bind/reuse, state defaults, expose a consequential choice, validate, preview, activate when authorized, and explain the actual receipt. Missing host behavior must be reported rather than quietly replaced.
- [ ] Keep the world agent off ordinary tick/runtime execution. Pure repeated effects, plan continuation, and perception of unchanged scenes require no authoring call; provider unavailability does not undo existing admitted mechanics.

**Tests:** concurrent chat/raw edits with expected revision; stale confirmation; permission/lock changes while drafting; hidden/private dependencies; unsupported touch navigation; incomplete reusable template; meaningful effect-domain change; provider failure after durable activation; refresh without duplicate activation; inspection without model calls where native data suffices.

**Exit:** current supported technical work can be performed through the existing natural-language workflow with inspectable artifacts and truthful receipts. INV owns the shipped workflow and its live-quality gate; EWF fixture integration alone does not establish that an LLM explains or asks questions well. A separately capped world-agent behavioral evaluation should show that the creator need not write JSON or know internal table names.

## Required implementation report

For each delivered slice report: task IDs and exact changed files; behavior preserved versus deliberately changed; canonical owner updates; native/fixture tests run; same-version save implications; deliberate v1 limitations and code/design seam links; measured performance where applicable; remaining blockers and unverified claims. Never claim a whole subsystem complete because its adapter compiles.
