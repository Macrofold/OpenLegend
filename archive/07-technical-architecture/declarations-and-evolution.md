# Declarations, reusable mechanisms, and world evolution

## Spatial family boundary

[Finite spatial families](spatial-world-runtime.md) provide bounded geometry, body/anchor and locomotion contracts. INV continues to own mechanical authoring/installation; the spatial mutation boundary owns placement consistency and invalidation. A PNG, imported mesh, arbitrary JSON field or navigation edge never grants support, anatomy or a new host operation. New spatial authoring depends only on the relevant SW13/native families, not the complete 3D roadmap; G0–G3 authority is unchanged.

Definition activation, migration and cleanup must respect the [save/load design](../../docs/save-and-load.md), including preservation of dependencies needed by retained worlds. The active no-legacy-development-save policy does not remove the separate obligation to perform coherent live definition changes.

This is the canonical technical design for declarations, G0–G3 mechanisms, state ownership, admission, activation, migration and mechanic evolution. Current finite-family behavior belongs to [Architecture](../../docs/architecture.md), delivery state to the [invention tracker](../../docs/maintainers/inventions-and-world-evolution.md), governance to [Invention governance](../03-design-proposals/invention-governance-and-ownership.md), creator UX to [World agent and workshop](../03-design-proposals/world-agent-and-workshop.md), and empirical questions to the [Research backlog](../05-project/research-backlog.md).

The [invention foundation](../../docs/invention-foundation.md) is the feature entry point and owns coordination of editable projects, immutable submitted revisions, separate mechanics/art work, and repair. [World constitution](../../docs/world-constitution.md) owns resolved governing policy and protection scopes; [Invention validation](../../docs/invention-validation.md) owns mandatory impact analysis and reusable evidence; [Runtime art](../../docs/invention-art-pipeline.md) owns asset production/publication; [Invention budgets](../../docs/invention-budgets.md) owns episode and recurring-cost enforcement. These refine the existing admission path rather than establish another installer, job authority, or definition registry.

[Engine/world boundaries](../../docs/engine-and-world-boundaries.md) defines which policies are replaceable. [World-module runtime](world-module-runtime.md) defines shared host binding, installed composition and subsystem integration. This document remains the owner of mechanical property meaning, G0–G3, state-owner contributions, admission and active-definition lifecycle; a module manifest is not a second invention registry or installer. Preserve the established four-layer boundary rather than introducing a parallel meta-kernel.

## What a declaration means

A declaration is a versioned definition the simulation understands: a material profile, component schema, recipe, rule, semantic resolver, or reference to an admitted algorithm. It describes available behavior; it is not permission to execute every conceivable consequence of its prose. Live instances hold changing state. Actors hold beliefs and learned techniques. Keep these distinct even when one platform stores all three.

The practical goal is a small interpreter for registered operations, with extension points. Do not build a universal programming language or attach every possible property to every entity. A new definition earns persistence when it enables a useful choice, corrects a repeated inconsistency, or supports a reusable family. A one-off interpretation may remain an event rather than a permanent mechanic.

| Layer | Example | Authority |
| --- | --- | --- |
| World profile | Ordinary heat needs an admitted physical source | Creator-approved governing revision |
| Definition | Fiber roof material; impact rule; repair recipe | Admitted immutable artifact |
| Instance | Roof section 42 has damage and current wetness | Authoritative simulation |
| Derived value | Rain reaching a sleeping place | Registered calculation and dependency versions |
| Actor knowledge | Ada knows a binding technique | Learning and memory rules |
| Meaning or claim | This beam belonged to Ada's family | Attributed social record or private interpretation |

Calling a roof waterproof does not alter rain transmission. An admitted interpretation may classify a documented coating under an existing material profile; a player's unsupported assertion remains a claim. An heirloom's significance can affect appraisal without strengthening its wood.

A mechanic such as combustibility can itself be a world-authored artifact when the supported runtime can express it. Its assumptions and validation obligations can be versioned through admitted interfaces. It cannot remove host checks, grant authority, or certify itself by supplying the only tests it passes. Follow the [validation hierarchy](../../docs/invention-validation.md#3-who-defines-validity) and current constitution. Fictional conservation/source rules may differ between worlds; correct source identity, authorized effects and external-accounting integrity do not become optional.

## Similar inventions before authoring

When a player clicks **Invent** with a described intent, use text embeddings and vector search to retrieve similar existing inventions before generating a new candidate. Embed a bounded description of each invention's purpose, supported behavior, materials and constraints; retain definition/version identity, source digest and embedding model/version so the derived index can be refreshed or rebuilt. Embed the requested intent with the same model. Exact IDs, aliases and applicability filters complement semantic retrieval; similarity is not proof of equivalent mechanics.

This freeform search responsibility does not add a mandatory paid search to the complete supplied-method path. A complete supported candidate goes directly through native checks and existing admission. Exact duplicate lookup may reuse mechanics without additional authoring or lost independent attribution. [Foundation reuse](../../docs/invention-foundation.md#51-reuse-and-supplied-methods) owns that coordination.

Search only records the requester may discover, initially the world's permitted invention registry. Later authorized library search must respect reuse/modification rights and world compatibility. Do not expose hidden inventions or grant character knowledge through search. Return bounded ranked matches with names, concise behavior/material differences and use/modification availability; keep match scores available for inspection rather than presenting them as correctness probabilities.

If similar inventions are found, open a new **Similar inventions** modal asking whether to **Use existing**, **Modify existing**, or **Invent new**; also allow cancellation. Wait for the choice before new candidate authoring. Use existing selects the pinned definition and opens the ordinary use/crafting flow with fresh prerequisites; it does not spawn an item or consume resources on selection. Modify existing carries the selected version and original intent into a derived draft, preserving lineage and permissions; shared-law changes use the workshop's validation/migration path. Invent new explicitly continues the original request. No matches continues normal authoring. A failed or incomplete search is visibly distinct from no matches and offers retry or an explicit continue choice. Closing the modal cancels continuation without generation, and reopening must not duplicate paid work.

This is a reuse choice, not an additional activation-approval dialog. INV-2 owns its delivery; reuse the retrieval service for autonomous discovery in INV-7 without showing NPCs a player modal.

### Actor-authored methods and private invention

Player, NPC and permitted creator entry points use one application-owned invention service with explicit initiating actor, origin and authority. The actor supplies purpose and a proposed method. A complete valid proposal proceeds without a redundant hidden designer; missing conceptual steps receive a neutral clarification opportunity. [Agency](../../docs/agent-agency.md#6-actor-led-invention) owns the actor's choice to propose, revise, pursue or stop.

Keep actor proposal context, scoped compiler/validator inputs and actor-visible feedback as distinct projections. The compiler may normalize known references and fill bounded engine-owned implementation values. Substantive material, preparation or mechanism substitutions require the actor to revise or explicitly accept them; preserve proposal-to-compiled-field traceability. Mapping known cord to its permitted ID is normalization; silently replacing raw grass with prepared binding is a conceptual change. Privileged registry knowledge must not masquerade as the actor's prior knowledge. Validation is not a physical experiment and cannot create memories of unperformed tests or act as an unlimited oracle for hidden properties.

Reuse the shared request outcomes rather than introducing a parallel lifecycle: `needs clarification` distinguishes insufficient method detail from unknown evidence; rejection identifies an invalid method; `unsupported capability` identifies a missing host operation; `forbidden premise` identifies a policy violation. `reused` or `activated` returns the admitted method and its pinned version; stale/conflict, cancelled, unavailable and uncertain execution retain their distinct technical meanings. Unknown evidence is not proof of impossibility, and transport failure is not an in-world failed experiment. Clarification consumes the existing episode allowance; failed/uncertain paid work is never automatically retried.

A private method/knowledge admission retains a durable technical receipt and actor-scoped feedback, without a public occurrence announcing discovery. Registry installation, learning, private result delivery and an observable demonstration or spoken disclosure have separate projections through the [EPR scope boundary](../../docs/events-perception-and-reactions.md#4-scope-and-event-identity). Public provenance must exclude private motivating goals, drafts and other inventors' discoveries. Internal deduplication may reuse equivalent mechanics without granting access to an unknown design or erasing independent discovery provenance.

Installation, knowing a technique, owning a crafted item and proficiency are distinct. Initial agency delivery needs no universal skill subsystem, G2 runtime, general material ontology or creator workshop. Invention can finish without construction; the [agency continuation contract](agent-agency-runtime.md#63-definition-knowledge-and-continuation) returns the result for a bounded decision or a previously explicit native continuation after fresh checks. Activation alone cannot execute a plan or consume crafting inputs.

Independent player/NPC locks and origin revocation remain authoritative through every continuation. Apply the accepted [NPC enablement policy](../03-design-proposals/invention-governance-and-ownership.md#open-and-locked-invention). A live test must explicitly enable the NPC path through owner policy, use supported families and a separately authorized nonzero cap, and restore the chosen setting afterward; documentation integration changes no deployment setting. Reopening a lock cannot revive a revoked request.

## Definition and property contracts

### Runtime integration metadata

Runnable definitions also bind to the [shared runtime envelope](world-module-runtime.md#3-definition-envelope-and-composition): implementation interface, declared dependencies, owning state, allowed reads/effects, scheduling category, bounds and projections. Use a service-specific schema beneath common metadata rather than one universal effects map. Host function registrations remain reviewed code; artifacts select supported implementations but do not supply code paths, validators or authority grants.

A previously admitted output can be an input to another supported family when its pinned capabilities, structure, provenance, rights and resource semantics satisfy that consumer. A native-only input restriction is a property of the current finite validator, not the long-term definition of composition. INV-3 must replace it with positive family validation, not remove constraints globally.

Reusable content may include predicates, selectors, effects, lifetime policies, parameterized constructs, closed specializations, organisms, senses, and coherent module bundles—not only finished objects or recipes. The [shared construct contract](world-module-runtime.md#reusable-constructs-and-specialization) defines typed ports, binding phases, dependencies, and substitution requirements. This document continues to own admitted definition identity, active versions, and installation. The invention foundation owns project/draft coordination. A template with required unbound ports is a valid reusable artifact but not executable behavior. Partial specialization and explicit forks preserve lineage; they do not mutate installed upstream definitions.

The [hybrid visual direction](../03-design-proposals/procedural-art-and-animation.md#proposed-contracts-caching-and-delivery) and [runtime art contract](../../docs/invention-art-pipeline.md#2-the-shared-presentation-contract) keep presentation separately versioned: trusted primitive/rig references, bounded parts, materials, attachments, supported observable states, and density/style parameters. Generated art cannot supply executable JavaScript, physical anatomy, reach or collision. New visual requirements can request a mechanical design revision; they never mutate an accepted definition implicitly.

The following fields are illustrative requirements, not implemented syntax. An immutable artifact needs identity/version and digest, kind, typed parameters, compatible schema/runtime, dependency references, applicability, input/query contract, permitted effects, world-domain requirements, resource/work limits, failure policy, and provenance. Tests and admission results attach to the exact artifact digest and applicable dependency/policy context, not merely a name or project ID.

Each mechanical property definition specifies type, units, bounds, applicable component families, owning system, permitted operations, visibility, dependency rules, and initialization semantics. An instance's property resolution should return more than a number:

| Resolution status | Meaning | Required treatment |
| --- | --- | --- |
| Known | Explicit authoritative value or reproducible derivation | Preserve source and relevant versions |
| Admitted estimate/default | An approximation explicitly permitted by a versioned policy | Record method, scope, and uncertainty where relevant |
| Unknown | Applicable, but sufficient evidence/value is unavailable | Follow the consumer's unknown policy |
| Conflicting | Authoritative inputs or interpretations disagree | Reconcile or defer; do not silently choose |
| Not applicable | Schema establishes that this property does not apply | Do not treat as a numeric zero |

Also distinguish a missing component definition from a known component whose instance value is unknown. The former may require a capability extension; the latter may only require observation, initialization, or an approved approximation. Fields omitted from a model context are not evidence that they are absent from the world.

Resolve values through explicit registered precedence: instance override, constructed composition, material definition, or admitted default. Preserve provenance for each resolved value. Composition is property-specific: combustible bindings remain separate from a stone panel; flammability should not become an arbitrary average. Derived values have dependencies and are not independently writable copies.

For partial declarations, list unresolved requirements and supported consumers. Carrying an object need not require its detailed thermal model, but introducing it into a world with active fire requires coverage by an admitted coarse thermal family. Foundational passive processes, such as rain exposure and combustion, need a deterministic unknown/default policy for every applicable admitted object. Record any approximation; never interpret an unknown value as immunity. A consumer may ignore an unknown only when an admitted bound establishes that it cannot affect the selected outcome.

This policy also applies when nobody requests an action and providers are unavailable. Use the admitted family fallback when rain or fire reaches a partially specified object. Defer activation of an unsupported optional domain. Unexpected missing foundational coverage is a technical fault: invoke the declared recovery or pause the affected process/scope visibly, rather than silently skipping the object or asking a model every tick. Such a pause is not a successful fictional outcome. Initial admission tests must exercise passive exposure during a provider outage.

## State ownership and dormant influences

The following contribution model describes the target for compositional owner families. Extracting existing native modules must initially preserve their current phase and RNG order. Adopting a new simultaneous evaluation phase is a separately tested behavior change, not an automatic part of interface refactoring.

A changing quantity has one authoritative owner, usually a small registered module. Other mechanics submit typed contributions declaring units, rate/event meaning, source identity, applicability, saturation/overflow and resource claims. Coordinated quantities may share an owner; derived display values remain read-only.

The initial one-sector runtime uses fixed simulation steps. Read one immutable start-of-step state; calculate bounded proposals; resolve aggregate resource claims in a stable declared order; then commit accepted contributions and resulting events together. A rain rate integrates once over the step; a discrete splash applies once by contribution identity. No rule observes another rule's partially applied update. Heat affecting drying and dryness affecting burning read the same starting state, with their combined results available next step. Step size is versioned and tested against representative smaller steps; this is a coarse numerical model, not a proof of physical accuracy. Arbitrary same-step feedback solvers are deferred.

Transfers across owners stage debit and credit under one transfer identity. Two individually valid proposals cannot both spend the same water or fuel: aggregate claims are checked against the source budget before either commits. Initial allocation uses stable priority/order and rejects unmet whole claims; a partial rate allocation requires a template that declares how to scale both sides. Environmental sources/sinks must be explicit admitted operations. Bound contributions, affected entities and scheduled descendants per step as well as per invocation.

Before adding a variable or writer, look up registered family IDs and explicit aliases. Semantic matching proposes reuse; it cannot establish equivalence from similar names or compatible units. `Wetness`, `dampness` and `water_saturation` may refer to one quantity or distinct surface/retained-water states. Validate applicability and behavior before merging them. Ownership changes require a migration, not a second writer.

Authoring stores capped notes attached to relevant families: plausible influences/consumers, conditions, uncertainty, compatible profiles, missing dependencies, provenance and a relevance trigger. Keep `anticipated`, `uncertain` and `forbidden` distinct from executable `admitted`. Notes cause no updates, jobs, NPC learning or recursive subsystem generation. Retrieve a small relevant set when needed and follow normal admission. Explicit identities deduplicate records; uncertain matches remain proposals. An immersion note is neither evidence of past immersion nor proof that immersion is impossible until implemented. A separate speculative graph service is unnecessary.

## Generation levels and executable references

The subject of a mechanic does not determine its level: a sense can configure an existing capability or require a new host evaluator.

| Level | Permitted output | Boundary |
| --- | --- | --- |
| G0 | Speech, interpretation, plans, attributed appraisal | Existing actions and bounded semantic outcomes |
| G1 | Material profiles, component declarations, recipes, formulas, compositions | Supported declarative types and host operations |
| G2 | Restricted executable algorithm | Registered input/effect interface, isolation and execution limits |
| G3 | New host operation, runtime authority, storage representation, or incompatible engine change | Engineering release and explicit migration |

Registering another component schema expressible by an existing generic component store can be G1. Changing database representation, introducing a new privileged operation, or changing the interpreter's meaning is G3. This distinction avoids treating every additional field as an engine release while preserving meaningful limits.

The first automatic G1 path parameterizes or composes a finite set of trusted templates: material profiles, recipes, bounded predicates/formulas, state-owner contributions and source-backed transfers. Templates supply mandatory reads, typed units, legal effects, initialization, failure behavior and finite composition limits. A new field alone provides storage, not a working mechanic. Generated declarations cannot replace their template's validators or invent a resource source by renaming an effect.

The [first playable scope](../05-project/first-playable-mvp.md) requires live generation of usable recipes rather than only generated flavor text around prewritten finished recipes. Current delivered families and evidence belong in Architecture/Verification; larger source/material/owner composition remains gated by INV-3/6. A carrying bundle is not a claim of implemented general containers. Missing trusted operations need engineering rather than an unrestricted generated effect.

Parameter changes within an admitted envelope can use its existing acceptance policy. A novel formula may still be G1 when expressible by the supported interpreter, but it is a new behavioral candidate, not automatically a safe parameter change. Require scoped domain evidence and admission before reuse. A calculation beyond the declarative language may use the later G2 runtime if its existing interface suffices; changing the trusted interpreter or host operations is G3. Structural/type checks and enforced resource bounds establish specific invariants. They cannot prove arbitrary physical plausibility, relevance completeness or consistency with every past event. Use trusted operation contracts plus curated counterexamples and scenario comparisons. Author-generated tests supplement these checks rather than certify their own correctness. The [validation policy](../../docs/invention-validation.md#9-escalation-by-actual-change) defines effort by actual behavioral novelty and scope; numeric qualification remains explicit configuration.

G2 scripts reference immutable artifacts and receive scoped inputs through enforced interfaces, returning bounded effect proposals. An isolated Macrofold authoring/test harness can produce and evaluate them; starting that harness is not the runtime for each game tick. Live G2 requires a separately admitted game isolation runtime with no AI/network access, direct world mutation or ambient clock/randomness. Supply recorded time/random inputs where needed; enforce instruction/time, memory, query, output and scheduled-work limits, and measure execution latency under contention. Until that runtime is demonstrated, reuse G1/native mechanisms or defer G2 execution. Isolation limits authority; it does not establish game-rule correctness.

## Dependency bundles and activation

The [installed module manifest](world-module-runtime.md#10-initialization-activation-disabling-and-failure) uses this same activation boundary. Affected consumers include dependent senses/controllers, agency frontiers, active effects and retained-save pins. Live definition transitions remain distinct from incompatible development-format rejection.

A useful change often spans artifacts. Adding roof waterproofing may require a material parameter, a rainfall-to-moisture relationship, a coverage calculation, instance initialization, and presentation labels. Activating only one can produce inconsistent behavior.

An illustrative bundle could contain:

```text
bundle: shelter.rain_response / revision 2
requires: world profile revision; supported interpreter ABI
artifacts: material profiles; coverage rule; moisture update rule
migration: initialize wetness using a declared approximation
active processes: migrate/quiesce affected owners and processes; compatible recipes may finish
invalidates: derived exposure; affected semantic and applicability caches
assets: existing wet/damaged presentation bindings and fallbacks
evidence: scenario fixtures; resource checks; migration rehearsal
activation: expected prior bundle and schema revisions
```

Resolve dependencies into a pinned manifest. Check absent artifacts, incompatible units, duplicate owners, contradictory overrides, unsupported operations and invalid cycles. Admitted feedback uses the fixed-step policy above; unbounded recursion or same-step rescheduling is invalid. Trusted operation/query contracts establish mandatory dependencies. Instrumentation records actual reads and can detect undeclared access, but cannot discover a necessary query that an algorithm omitted.

The [typed impact graph](../../docs/invention-validation.md#4-dependency-graph-and-impact-analysis) includes reverse consumers, shared resources, event subscriptions, query membership and protected scopes, not just references named by the candidate. Bound analysis without silently omitting mandatory interactions. Existing evidence may be reused under matching assumptions; current authority and installation conditions are always rechecked.

Include relevant committed outcomes and their conditions in compatibility checks. A damp wall resisting a brief flame does not imply universal fire immunity; a recorded wall burning cannot be silently replaced with an incompatible history. New wording must not reroll a law. If a better approximation conflicts with established behavior, use an explicit creator/version correction and migration policy rather than presenting the change as ordinary discovery.

Initial activation targets one sector: prepare and rehearse the bundle, pause at a committed tick boundary, verify the expected manifest, then migrate or quiesce affected state and processes. Preserve elapsed work, accumulators, pending events, contribution identities and already consumed resources under explicit mappings. Commit the new manifest, migrated state and activation receipt atomically before resuming. Preparation failure leaves the old bundle active; restart reads the committed receipt rather than repeating migration. A request cannot observe mixed initialization and definitions.

Only recipes explicitly compatible with the new owner interfaces, units, state meanings and current laws may finish under pinned versions. Old/new authoritative owners never update the same quantity concurrently. An incompatible process must migrate, finish before activation, or enter its declared recovery; activation otherwise waits. Candidate approval and per-world activation are separate records. The receipt identifies old/new manifests, migration digest and effective tick. Larger staged or unloaded-region transitions require additional design and are deferred from this initial policy.

## Candidate lifecycle and deduplication

The [invention-project coordinator](../../docs/invention-foundation.md#4-the-invention-project-and-its-identities) owns draft revision, selected candidate, work attempts and review linkage. Mechanical candidate evaluation, live installation state, art maturity and protection policy are separate dimensions, not one status enum.

A submitted immutable candidate is validated and evaluated under the relevant plan. It can be approved, rejected, deferred for evidence/capacity, superseded, or withdrawn without mutating its recorded content. Repair creates a new candidate revision; it does not erase the old evidence or reset the episode. Approval only makes the exact candidate eligible for a separate fresh activation check.

An active installation can be retired or quarantined under its declared lifecycle while its artifact remains immutable and its author/owner restrictions remain in force. A frozen law can be quarantined for safety; that is not permission to rewrite it. A failed replacement leaves the current working installation intact. [Constitution stability](../../docs/world-constitution.md#4-stability-is-several-independent-controls) owns the orthogonal controls.

Candidate-law experiments use copied scenes or another isolated evaluation environment, not unadmitted live laws. A candidate tested under yesterday's rules may need reevaluation. Never assign different physical laws to otherwise equivalent live objects solely by player or rollout cohort. Narrow applicability must have a causal basis, such as material family or construction method. A live local prototype can use shared admitted laws; it cannot contain an unadmitted universal law by geography alone.

Deduplicate generation by world compatibility, canonical family, missing contract, relevant source definitions, and generation-policy revision. Ten requests to waterproof the same material should join one bounded job or reuse its result where rights and funding permit. Each original action still has its own target, permissions, deadline, and resource checks. Different outcomes must not collapse merely because their descriptions sound alike. Cancelling one consumer does not erase another consumer's independently authorized work.

Use stable request/attempt identity and bounded execution ownership for authoring work. Do not automatically retry failed or uncertain paid generation; explicitly admitted clarification/refinement stays within its existing allowance. Publication compares the expected base/selected revision, relevant dependencies, current protection and authority generation. If another candidate wins, rebase or supersede the loser rather than automatically activating both. Charge authoring separately from executing the resulting mechanic, without resetting budgets across revisions.

## One-off semantic resolution

A semantic resolver is itself an admitted versioned definition. It specifies the residual question, eligible outcomes, necessary evidence, unknown handling, relevant dependencies, acceptance policy, maximum consequences, expiration, and fallback. It may interpret a gift's meaning or map an unusual fastening method to existing construction operations. It cannot waive a known rule or fill an essential physical unknown without an admitted estimation policy.

Jev supports supplied choices and ordered rubrics over structured text state; questions sharing a request are evaluated independently. Consequently, it can help choose among eligible interpretations, while novel prose or multi-step design requires a generative model or agent workflow. One question's answer cannot silently supply missing evidence to another in the same call. [TypeSafe primitives](https://docs.typesafe.ai/primitives)

A semantic descriptor such as “oily, tightly woven cloth” may justify retrieving candidate material profiles. Selecting a profile remains a proposal until the classification policy accepts its provenance and scope. Jev's limitations explicitly include arithmetic, distractor context and adversarial steering; do not derive exact strength, ignition time, or permeability from a confident Score. [Jev limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)

Record the admitted judgment and actual resulting events. Equivalent future requests can reuse a validated mechanism; they do not automatically inherit the same emotional reaction or physical outcome. Promote recurring one-off interpretations only when reuse is valuable and counterexamples establish an adequate applicability contract. Authoring-time semantic routing follows [invention validation](../../docs/invention-validation.md#7-jevs-role); ongoing semantic execution additionally needs the explicit [runtime cost envelope](../../docs/invention-budgets.md#7-installed-runtime-envelopes).

## Bounded multi-turn authoring and investigation

A harness can be important when the next useful operation depends on a previous result: inspect material properties, retrieve an existing family, discover a missing dependency, draft a composition, inspect validation feedback and refine the proposal. World investigation similarly follows evidence across records; workshop revisions may need repeated dependency and consequence inspection. These are extensions of the simple INV-2 path, not a requirement to add several model calls to every recipe.

Use the [revision/repair contract](../../docs/invention-foundation.md#8-repair-backtracking-and-failure) and [episode allowance](../../docs/invention-budgets.md#6-bounded-repair-and-paid-speculation). Tools return scoped evidence, versions, unknowns and validation findings; the harness chooses the next useful call within finite tool, byte/token, elapsed-time, CPU and monetary limits. Refinement inside an explicitly budgeted run differs from replaying a failed/uncertain paid operation. Exhaustion leaves a retained draft and clear status. A proposed experiment changes character knowledge only after a real authorized action and observable result; a copied-scene validator is not an NPC's lived experience.

## Worked case: a roof becomes more useful

An actor asks to bind branches into a little house. Intent resolution retrieves a lean-to family, identifies missing expectations such as enclosure, and selects a supported assembly. Construction creates stable supports and roof sections, consumes declared material, and computes coverage. Household attachment is a separate social consequence. Naming the assembly “house” grants neither area nor waterproofing.

Later, the actor proposes adding a woven coating to keep rain out. First inspect existing material profiles and relations. If the current coverage/rain rule already accepts a supported permeability profile, generate a recipe variant; no new physical subsystem is needed. If the relation is absent, propose the smallest bundle connecting admitted permeability and coverage to local exposure and moisture. A frozen rain owner can still be used compatibly; replacing its protected meaning requires the constitution's explicit change process.

Missing historical wetness requires an explicit initialization approximation. Do not retroactively claim the old roof kept occupants dry or replay all past weather from invented evidence. Activate the bundle only with compatible initialization and cache invalidation. Recheck the actor's proposed construction after activation: the materials may have been used elsewhere while generation ran.

A family expansion adds sections and changes derived space. Replacing a wall with stone preserves dwelling identity but records replacement/salvage, material composition and support changes. Recomputing comfort may include each resident's preferences; it does not change physical capacity. Removing a wall invalidates affected enclosure, rain exposure, navigation and thermal-neighbor results, including cached queries whose result set gains new neighbors.

The same discipline applies to fire: combustibility alone cannot establish ignition. Once a coarse source-strength/duration, moisture, ignition-progress and fuel model is admitted, repeated fire updates execute it directly. Refinement to detailed thermal nodes requires a declared conversion rather than maintaining two contradictory authoritative quantities. See [coarse simulation scope](../03-design-proposals/simulation-scope-and-complexity.md).

## Persistence, invalidation, and replay

Maintain two logical registries: world capabilities and actor knowledge of those capabilities. A successful invention can make a recipe executable without teaching every NPC how to make it. An admitted physical relationship applies to equivalent supported objects under its conditions whether or not characters know it. Observation, practice or testimony updates knowledge with provenance and uncertainty; it does not activate physics. Imported packs likewise do not automatically grant character knowledge or permissions. Library improvements leave existing worlds' pinned revisions unchanged until an explicit compatible transition.

Store definition provenance, creator permissions, dependency digests, initialization/migration evidence, and private/public scope. Pack export selects authorized definitions and assets; it must not include the conversations or private memories that inspired them. Reusable artifacts and historical traces need different retention and access policies.

Cache invalidation follows world/profile, mechanism, material/composition, relevant state, observation scope and query membership. A negative lookup for “no ignition rule” expires when a suitable capability activates. Start with conservative region/registry revisions and fresh critical predicates; optimize to narrower revisions only when every relevant mutation is covered. Semantic similarity retrieves candidates, never proves dependency equality. Snapshot refresh and context acceptance follow the [context contract](context-and-inference.md); [verification reuse](../../docs/invention-validation.md#10-evidence-records-and-reuse) adds validator/test and assumption identities.

Replay uses recorded admitted judgments, committed effects, pinned artifacts and random draws. A model returning a different answer today cannot rewrite yesterday's history. Keep required retired versions through the chosen replay horizon. A failed new process step commits nothing; previously committed consequences require explicit compensation or a declared recovery policy. Reverting definitions alone cannot safely undo consumed materials, learned information, or demolished parts.

Gameplay save/load fences abandoned jobs and retains required content while respecting current external rights, privacy, accounting and revocation. It cannot refund paid attempts or cause old-generation artwork to publish into a restored world. The [save owner](../../docs/save-and-load.md) remains authoritative; no old-development-save migration is introduced by this feature.

## World admission, creator ownership and workshop revisions

The future [NC13 on-the-spot action/effect invention](../../docs/narration-and-conversations.md#11-delivery-boundaries-and-deferred-invention) reuses this admission path. A missing slap rule, for example, may eventually declare a conditional health effect using supported injury predicates, then execute only after validation/activation and fresh target checks. Generated descriptions cannot create new trusted primitives or bypass god-mode-only stat creation. Initial narration instead permits bounded expressive actions with no new mechanical effects; admitting a later rule never retrospectively applies damage to an earlier expression. The Narrator only describes committed outcomes and never authors/adjudicates effects. NC13 remains explicitly deferred from the initial narration slice and links to this document's INV delivery gates.

The [governance requirements](../03-design-proposals/invention-governance-and-ownership.md) define a versioned world invention policy with independent agent/NPC and player locks. Carry server-established originating authority and delegation provenance through authoring jobs; execution by an LLM, NPC helper or Macrofold never changes a player-origin request into autonomous NPC invention. Check the applicable lock before dispatch and atomically at admission, alongside expected definition/manifest revisions, across conversation, imports, revisions and background work. Enabling that lock invalidates its in-flight attempts; changing only the other lock requires fresh validation but does not itself forbid admission. Save and restore both fictional settings under the save contract while respecting current external revocations. Existing actions, crafting, learning and NPC cognition remain available; permitted invention by the other group continues. Owner edits require the player lock off unless the separately proposed administrative exception is adopted; no agent receives an implicit exception.

The [world constitution](../../docs/world-constitution.md) adds independently scoped owner freezes, author refinement locks and protection against indirect replacement. These controls do not supersede governance's ownership/rights model, grant a payer exception, or make an author able to activate changes in another owner's world.

Keep invention identity and immutable versions separate from creator/account attribution, character knowledge, world installations and reuse grants. A host admitting a contribution does not become its author. An account library retains the author's authorized technical contribution and source-world provenance; a world manifest records the exact versions installed there. Neither record grants private-memory access or permission to redistribute dependencies. These are application-owned records, even when a generic artifact service stores their bytes.

The [workshop](../03-design-proposals/world-agent-and-workshop.md) uses this document's existing validation, activation and migration path. [Scope-sensitive editing](../../docs/invention-foundation.md#7-editing-during-creation-and-after-publication) distinguishes depiction, blueprint, actual instance modification and shared law. Editing creates a candidate version or explicit fork, previews the diff and affected instances/processes, and commits only with current authority and a valid migration where required. Preserve prior events and versions; a slower-burning revision cannot retroactively restore fuel already consumed. Every world has a complete logical invention-pack inventory; an export release pins versions and dependency closure, and exposes any rights or compatibility blockers instead of silently omitting entries.

## Open policies and acceptance evidence

Deployment choices such as numeric automatic-review envelopes, family fallback values, step size, allocation priorities, runtime ceilings and retention remain explicit versioned policy under their existing owners. The accepted foundation fixes the authority and lifecycle rules; it does not silently choose unlimited work or claim that every future family is ready. Unresolved product choices remain in [Open decisions](../05-project/open-decisions.md), not a second list here.

The existing physical worked cases illustrate required coverage: unknown versus explicitly noncombustible values; misleading waterproof claims; competing consumers; consistent start-state contributions; interrupted activation; live-owner replacement; rain during construction; a changed neighbor invalidating prior queries; stable assembly identity; private discovery; explicit source rules; outage; and bounded later G2 failure. [Validation](../../docs/invention-validation.md#6-deterministic-test-families) owns the reusable test strategy, and [INV](../../docs/maintainers/inventions-and-world-evolution.md) owns concrete implementation/acceptance tasks including the earlier family gates and INV-14 integration.

The acceptance question is useful, consistent play within the declared supported scope—not whether generated prose plausibly explains every situation. Fixture evidence, live-model quality, browser usability and population-scale performance must remain separately recorded in [Verification](../../docs/verification.md).

## Implementation tracker

Delivery state, dependencies and exit criteria live in the [Inventions and world evolution implementation tracker](../../docs/maintainers/inventions-and-world-evolution.md). INV-1–INV-8 retain their existing identities and unfinished scope; INV-9–INV-14 add coordinated revisions, constitution controls, compositional verification, staged art, budget enforcement and integrated qualification.
