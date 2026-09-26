# Invention validation and compositional evidence

The [relationship graph](invention-graph.md) owns typed relationship representation, source provenance, scope/coverage and navigable projections. This document still owns mandatory validation obligations and evidence interpretation. [Composition](invention-composition.md) connects those checks to kind-specific compilation and live activation; neither graph metadata nor a model-generated edge grants execution authority.

**Status: accepted target design.** This document owns validation planning, relevant-interaction discovery, evidence reuse, and allocation of deterministic, Jev, LLM, and human work. It implements the acceptance responsibilities of [Declarations and evolution](../archive/07-technical-architecture/declarations-and-evolution.md), not a competing admission registry or authority. [Invention foundation](invention-foundation.md) owns revision coordination; [world constitution](world-constitution.md) owns governing policy; detailed implementation and acceptance work belongs in [INV](maintainers/inventions-and-world-evolution.md).

The [tool contract](invention-workshop-tools.md) exposes scoped findings through the existing application boundary. A finite native dry-run is not the complete compositional validation planner; current scope belongs in Architecture.

## 1. Objective and limits

Make familiar inventions cheap to verify by reusing established contracts and evidence, while spending intelligence on actual novelty, missing meaning, and consequential interactions. Verification must improve as the library grows rather than require a full-world model review for every object.

Do not promise exhaustive physical correctness, complete emergent-behavior prediction, or equivalence merely because two definitions have similar names. The enforceable promise is scoped: mandatory host integrity checks, applicable world obligations, bounded supported execution, relevant independent tests, explicit unresolved assumptions, and recoverable behavior under failure.

The default rule is:

> Code determines mandatory obligations and performs exact checks. Jev makes focused semantic judgments over supplied evidence. Generative models investigate and repair unresolved design questions. Only the existing authority boundary admits effects and definitions.

Validation is not a character's physical experiment. Its privileged evidence and copied-world results must not leak into NPC knowledge, public discovery prose, or action receipts. A hypothetical test does not prove the actor performed it.

## 2. Separate dimensions of acceptance

Use distinct findings and readiness conditions rather than an overall safety/confidence score.

| Dimension                    | What must be established                                                                                     | Typical implementation                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Structural validity          | Correct shapes, bounded text/collections, references, units, interfaces, and supported operations.           | Native schemas, parsers, registries, and deterministic checks.                                     |
| Authority and governance     | Current grants, origin, lock/freeze restrictions, rights, constitution, and funding.                         | Application/domain authorization and current policy resolution.                                    |
| Intent fidelity              | The candidate preserves the actual method, requested behavior, and pinned appearance/constraints.            | Traceable mappings, deterministic comparisons, focused semantics, and consequential clarification. |
| Mechanical composition       | Inputs, resources, effects, owners, scheduling, lifecycle, and relevant interactions are compatible.         | Trusted contract analysis and native scenario execution.                                           |
| World consistency            | Applicable fictional laws, declared approximations, and relevant established outcomes are respected.         | Explicit policies and evidence first; targeted semantic interpretation where necessary.            |
| Presentation fidelity        | The depiction agrees with admitted function, observable semantics, and minimum usable cues.                  | Presentation contract checks and the separate art review process.                                  |
| Computational sustainability | Per-invocation and aggregate work, event/cognition fan-out, state, and permitted paid execution are bounded. | Static conservative summaries plus isolated performance/runtime checks.                            |
| Experience and balance       | The result is legible, useful, and consistent with chosen design/balance policy.                             | Scenario evidence, selective critique, and playtesting; not a substitute for integrity checks.     |

A candidate can be structurally valid but unsupported, semantically plausible but resource-invalid, mechanically valid but missing required presentation, or safe but uninteresting. Preserve those distinctions in technical findings and user feedback.

A world need not implement Earth physics. Consistency means agreement with its admitted reality and the declared approximation scope. Do not reject admitted fantasy solely for violating ordinary conservation, or accept an unexplained source in a world that forbids it.

## 3. Who defines validity

Mechanic-agnostic validation needs protected meta-rules, not a prewritten validator for every fictional noun.

### 3.1 Policy hierarchy

1. **Host integrity obligations:** authorization, valid references, supported effects, bounded execution, transaction/receipt identity, data isolation, and external-accounting protection. These cannot be waived by world content.
2. **Active constitution obligations:** the world's existing premise, frozen semantics, supported policy bindings, and resource/unknown/evidence requirements. Ordinary invention cannot weaken them.
3. **Admitted family/interface obligations:** assumptions, guaranteed effects, mandatory inputs, resource identities, lifecycle, permitted target/query scopes, and finite composition limits.
4. **Admitted mechanic-specific obligations:** additional constraints and scenario expectations attached to world-authored rules or artifacts through supported test/predicate interfaces.
5. **Candidate-specific evidence:** tests, semantic findings, hypotheses, and proposed checks supplied for this particular revision.

Lower levels can add evidence or stronger restrictions; they cannot remove higher-level mandatory checks. A new validation policy is itself a candidate evaluated under the prior active policy and its authorized change procedure. Simultaneously authoring a rule and a passing test is not independent acceptance.

### 3.2 Invented laws and the bootstrap

Combustibility may itself be invented. A supported combustion bundle can introduce state, predicates, source-backed contributions, termination behavior, and integration contracts. Its validation combines generic state/resource/scheduling/lifecycle checks with world-specific requirements and independently reviewed expectations. The engine does not require a built-in `combustible` enum to check an authorized source or prevent duplicate transfer.

For a genuinely new fictional rule, there may be no pre-existing empirical oracle for its intended behavior. The creator must specify or approve the intended semantics and approximations, while trusted execution boundaries establish the software properties they can actually guarantee. LLM critique can expose omissions; it cannot turn chosen fiction into a theorem about reality.

An admitted torch can then rely on a pinned combustion contract, without reauthoring or retesting the entire law on every torch. That reuse is conditional on the assumptions, dependency versions, applicable environment, and actual composition. Independent component validity never automatically proves all combinations safe.

World-authored tests use admitted templates/predicates or a separately qualified execution interface. They cannot import arbitrary test code, modify validators, read secrets, call providers during a native fixture, or exempt their author from checks. An independently maintained baseline and cross-system counterexamples remain necessary.

## 4. Dependency graph and impact analysis

Use the existing definition IDs, versions, manifest, typed ports, and registered contract summaries. A graph is a logical structure, not a requirement for a graph database or another source of definitions. Start with reference tables/maps and reverse indexes over admitted data.

The [module runtime](../archive/07-technical-architecture/world-module-runtime.md#reusable-constructs-and-specialization) distinguishes definition, invocation/order, invalidation/read, and distribution/rights dependencies. Preserve those meanings. Add validation/evidence and presentation associations as typed projections over the same identity system, not a single untyped `dependsOn` list.

### 4.1 Information needed for a runnable contract

A trusted family supplies mandatory summary fields that a candidate may specialize only within its supported envelope:

| Summary                                  | What it must distinguish                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Definition and implementation references | Exact versions/digests, service interfaces, optional integrations with valid fallbacks, and missing required capabilities. |
| Reads/queries                            | State domains, target roles, query families, region/entity scope, and query membership dependencies.                       |
| Writes/contributions                     | Owning state, effect domains, allowed operations, precision/units, and authoritative versus derived values.                |
| Resource semantics                       | Named sources, sinks, transfers, conversion policy, conservation obligations where applicable, and competing claims.       |
| Events/reactions                         | Emitted event families, eligible disclosure, possible subscribers, and admitted scheduling/cognition implications.         |
| Lifecycle                                | Initialization, progress, cancellation, completion, removal, failure, active-work compatibility, and retained references.  |
| Computational envelope                   | Expansion, nesting, candidates/targets, descendants, rate, retained state, and optional semantic work.                     |
| Presentation/observation                 | Supported observable meaning and required state/geometry cues, separate from renderer objects.                             |
| Assumptions and guarantees               | Conditions under which prior evidence applies and the behaviors promised to consumers.                                     |

The compiler derives conservative summaries from actual registered operations and bindings. It does not trust a model's declaration that an effect is harmless. Hidden undeclared access is rejected. Read instrumentation can detect extra accesses; it cannot identify a necessary input the implementation mistakenly never reads.

### 4.2 Selecting mandatory interactions

Start from the actual candidate diff and compute the relevant impact set:

- Resolve the exact referenced definition and interface closure.
- Include owners and consumers of affected state/effect domains.
- Include shared-resource competitors, source/sink and conversion relationships.
- Include applicable event producers/subscribers and scheduling or disclosure consequences.
- Include query membership changes, including newly eligible objects or negative lookups becoming positive.
- Include affected frozen scopes, constitution obligations, initialization, active processes, knowledge/presentation bindings, and save pins.
- Expand where the selected family's obligations require higher-order or temporal composition checks.

An invention can interact without naming another invention. A new material may enter every fire query over a material class; a new event producer may activate an existing reaction; a new wall may change navigation or exposure for neighbors. The reverse indexes and membership revisions must capture these cases.

Do not validate a heater against ten thousand object names. Validate its bindings against thermal/material interfaces and the affected family/consumer scenarios, plus exceptions whose supported contracts genuinely differ. Reuse representative equivalence classes only when the family contract justifies the equivalence. Similar descriptions or matching units alone do not.

Two valid mechanics can create an invalid sequence: a repair operation that restores consumable mass without an admitted source may combine with combustion to create forbidden free output. The planner must consider shared-resource cycles and relevant operation sequences, not only pairwise type compatibility.

### 4.3 Completeness and graph bounds

Distinguish complete mandatory coverage, a deliberately scoped supported approximation, and incomplete analysis. A retrieval limit is not a correctness boundary. Never take the top semantic matches, omit the rest of a mandatory closure, and report pass.

Bound traversal, expansion, memory, and verification work. If the required impact set exceeds the admitted analysis budget, use an already justified aggregate contract, move to a broader authorized review, narrow the candidate with acceptance, or leave it pending. Do not silently weaken the gate.

Not every cycle in every graph is invalid. Distribution references, metadata, and supported temporal feedback have different semantics from recursive definition expansion or zero-time rescheduling. Detect invalid cycles by edge type. A recurring process needs supported progress/cancellation and aggregate rate bounds; a long-lived weather process does not need an arbitrary short lifetime merely to avoid a graph cycle.

### 4.4 Cost of the validation planner itself

Compile reusable behavior summaries and reverse dependency indexes on definition/registry changes, not on every native step, provider stage, or editor keystroke. Traverse with visited node/edge identities and bounded expansion; do not materialize every path or a full transitive closure when a reachable set suffices. Bound nodes, edges, serialized evidence bytes, scenario combinations, and retained intermediate memory separately. Existing maps and indexed SQL records are sufficient initially. An incomplete bounded traversal remains pending, not a successful partial verification.

Only submitted revisions authorize work. Coalesce superseded undispatched revisions; retain stable attempt identity for already dispatched work. Memoized data is derived, byte-bounded and evictable, never a second authority. Fingerprints include the relevant source and query-membership versions; a cache hit still passes current publication gates. Expanding a graph or changing an index is not permission for new paid review.

## 5. Deterministic validation-plan construction

Build one bounded plan for the submitted candidate. The plan records input identities, governing policy, mandatory checks, optional investigations, scenario selection, evidence that may be reused, resource limits, and unresolved questions.

The default order is:

1. Check request eligibility, current scope/origin/rights, basic quotas, and bounded input size before expensive work.
2. Decode and validate shape, IDs, supported operations, units, finite values, and family-specific structural constraints.
3. Resolve the constitution and exact relevant definition closure; reject unsupported mandatory capabilities and owner/interface conflicts.
4. Compute conservative effects/resources/scheduling summaries and the mandatory interaction set.
5. Select applicable independent host/family/world checks and available evidence with matching assumptions.
6. Identify unresolved semantic questions and the smallest permitted evidence packet for them.
7. Allocate the required native tests and any justified semantic review within explicit budgets.
8. Execute expensive work outside the live mutation lane, retain findings, and return to revision when needed.
9. Recheck relevant current dependencies and authority at the existing approval/activation boundary.

This is one logical path with reuse, not a demand to rerun all computation on every revision. A complete supported supplied method should stay on the zero-generation path. An exact reuse can skip authoring while still rechecking current knowledge/action applicability at its separate boundaries.

Cheap rejectable conditions come first. Do not pay for an LLM critique of malformed references. Do not start expensive art refinement for an unsupported required mechanic. Independent checks can run concurrently only within shared CPU/funding limits and without making publication order ambiguous.

## 6. Deterministic test families

The engine should accumulate reusable tests of behavior and failure boundaries, parameterized by the candidate's actual supported contract. Tests are not keyed by finished invention names.

### 6.1 Structural and algebraic checks

Check schema/interface compatibility, target binding, units and resource identity, finite bounds, duplicate state owners, invalid references, unbounded expansion, inappropriate disclosure, and unsupported operation requests. A matching output shape is insufficient when semantic interface or effect authority differs.

Arithmetic, time comparisons, resource debits/credits, limit calculations, and graph traversal remain native. A semantic score cannot establish exact damage, mass, permeability, or work bounds.

### 6.2 Shared invariants

Preserve idempotent commands and effects; atomic resource claims and transfers; no outputs without admitted causes; one authoritative owner; consistent interruption/cancellation; no expired/stale authority; no duplicate installation, learning, spawning, or quota debit; and no effect from a cosmetic revision.

Conservation checks use the world's actual source/conversion rules. A fantasy creation operation still needs explicit authorization and bounded accounting. The host invariant is not that every fictional world obeys an identical physical-energy law.

### 6.3 Family and interaction scenarios

A crafting family exercises missing ingredients, selected material compatibility, concurrent consumers, input consumption at the correct boundary, interruption, completion once, and use after same-version save/load.

A supported thermal/material family exercises the declared exposure and unknown/default policies, fuel/source exhaustion, competing contributions, removal while active, and provider outage. A contact sense exercises what is and is not observed, rather than merely changing a screen effect. A reservoir checks finite supply, replenishment, concern thresholds, and controller applicability without assuming human hunger.

A combination must exercise relevant sequences: use, interrupt, repair, transfer, delete, restore, and repeat. Sequence and boundary tests reveal failures invisible in a single successful invocation. Randomized tests retain seed and the minimized counterexample. Mandatory expected behavior comes from independently maintained invariants or admitted world obligations, not only the authoring model's assertions.

### 6.4 Metamorphic and differential checks

Where justified by the contract, check that equivalent supported inputs preserve outcomes, resource totals reconcile across operation order, save/load preserves native continuation, duplicate requests do not repeat effects, and a purely visual revision leaves native state unchanged. Compare replacement behavior to the pinned base on unaffected cases and require explicit differences where behavior is intended to change.

Do not assume mathematical invariances that the world did not promise. For example, fixed-step numerical approximations, tie-breaking, geometry, or a deliberate nonlinear rule may make a naive permutation test invalid. The test records its applicability conditions.

### 6.5 Performance and migration checks

Measure work at representative populations, speed settings, and relevant state/history sizes. Check aggregate target/event/descendant growth and cancellation under load, not just one invocation. A test that completes on a tiny fixture does not establish shared-world capacity.

For active replacements, rehearse the affected state/process mapping on isolated data. Preserve consumed resources, elapsed work, contents, references, and outstanding commitments under the activation owner's contract. A failed proposed replacement leaves the current world unchanged.

## 7. Jev's role

Jev is a replaceable focused semantic judgment adapter. Its useful jobs include selecting among supplied supported interpretations, judging whether a particular requirement is preserved, flagging a claim absent from supplied capabilities, and ranking optional retrieved evidence for an unresolved question.

A question should name its exact evidence and possible outcomes, including none/unknown where appropriate. Do not ask whether an entire invention is safe, whether arbitrary code is correct, or whether a resource cycle conserves an exact quantity. Do not use Jev to discover a complete dependency graph from prose.

Ask independent questions sharing the same state together. A later question needs another request only when its actual evidence/options cannot be built until the earlier result arrives. Do not manufacture serial calls for questions already answerable from the first packet. The vendor's [primitives documentation](https://docs.typesafe.ai/primitives) describes this independence; it is not a performance guarantee for OpenLegend.

Use task-specific qualification and thresholds. Reported confidence summarizes the answer distribution rather than proving whole-invention correctness; see the [confidence contract](https://docs.typesafe.ai/confidence). Do not promote a single prototype threshold to all admission decisions. Preserve abstention and distinguish unknown evidence, insufficient method detail, forbidden premise, and unsupported execution.

Mandatory deterministic checks cannot be removed by a high-confidence semantic answer. Jev can add a concern, choose among genuinely eligible supplied alternatives under policy, or trigger deeper review. It cannot waive a freeze, grant source authority, change cost bounds, or certify hidden behavior.

Do not require Jev before every generation call. If the route is already known, a no-call deterministic choice is preferable. Qualify routing on relevant clear, ambiguous, contradictory, and adversarial examples; nominally cheap calls can still add latency or erroneous rejection.

The documented [Jev 1.13 limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13) include numerical precision, indirection, irrelevant context, and adversarial content. Keep arithmetic and mandatory structural identities in code; send bounded relevant state and treat descriptions as untrusted data. A different model revision must be qualified rather than assumed to share the same behavior.

## 8. Generative model and human review

Use an LLM for genuinely new structured authoring, explaining or resolving conflicting requirements, proposing the smallest supported repair, investigating missing conceptual interactions, and suggesting additional bounded scenarios. A tool-using harness is useful when the next query depends on actual evidence, not as a mandatory wrapper around a simple candidate.

The review packet includes the selected intent and pinned constraints; candidate/diff; exact relevant contracts and world policy; analysis summaries; selected trusted historical evidence; failed test counterexamples; unresolved assumptions; and the reviewer's permitted tools/limits. It does not contain a full omniscient world snapshot or private actor context unrelated to the task.

Require actionable findings with requirement/definition references, evidence, uncertainty, proposed repair or test, and the required authority/acceptance. `Looks good` and generic confidence prose are not validation artifacts. Contradictory historical observations must be evaluated with their recorded conditions and provenance; one wet object surviving brief heat is not proof of universal fire immunity.

Semantic review distinguishes a missing conceptual requirement from a missing rendering technique. An enclosed heater may require a supported ventilation approximation or an explicit limitation; it does not automatically authorize inventing every neighboring physical subsystem. Store useful speculative influences as bounded notes under the declaration design, not recursive automatic generation.

A reviewer cannot weaken user-pinned requirements or world obligations without a revised candidate and the necessary acceptance. A model-generated test is supplemental. Even using a separate model does not make it an oracle or mathematically independent proof. High-impact novelty can require independent expert/creator review according to policy; routine supported parameters should not incur a committee of models.

Human review approves a concrete design/scope and accepts declared approximations; it cannot override host integrity or manufacture an unavailable primitive. Conjuring and consequential world changes retain their specific confirmation rules. A creator's willingness to accept a risk is not permission to charge another payer or leak actual private data.

## 9. Escalation by actual change

Determine the route from compiled differences, not a user/model label such as `cosmetic` or `minor`.

| Change class                                                                | Default verification path                                                                                      |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Exact reuse or presentation-only improvement                                | Current permission/compatibility checks; reuse applicable mechanical evidence; visual checks separately.       |
| Parameter binding inside a qualified envelope                               | Native validation and applicable family/boundary scenarios; focused semantics only for unresolved meaning.     |
| New composition or formula using supported operations                       | Mandatory impact closure, additional sequence/resource/performance tests, and targeted semantic investigation. |
| Shared law, owning-state, disclosure, or broadly applicable behavior change | Broader independent evidence and migration/review under current constitution.                                  |
| New restricted algorithm or host capability                                 | Existing G2/G3 gates; unsupported until their runtime/engineering prerequisites exist.                         |

A flashy weapon can be a cheap parameterized recipe. A small change to awareness can affect privacy and paid cognition throughout a world. Scope, behavioral novelty, and consequences determine effort.

Balance and fun can use a lighter optional review when no chosen policy makes them mandatory. Clearly separate `accepted but needs playtesting` from structural correctness and from `required behavior unsupported`. Expensive quality review should earn its cost through measured improvements, not become ritual.

## 10. Evidence records and reuse

Retain a verification record attached to the exact candidate and relevant context. It includes candidate content identity, trusted compiler/validator/test versions, relevant definition/implementation pins, constitution/lock and membership dependencies, scenario identities/seeds, resource bounds, outcomes, findings, coverage, assumptions/defaults, and whether evidence is native fixture, isolated simulation, semantic review, or live observation.

Semantic findings additionally record actual question/input identity, model and policy revision, outcome/uncertainty, permitted source references, and paid receipt linkage. Store only scoped diagnostic content under the relevant privacy policy. Evidence is not a second definition registry.

### 10.1 Cache conditions

Reuse a result only when its actual inputs and assumptions still apply. Start with coarse mechanical and presentation dependency fingerprints, not a complex incremental build framework. A fingerprint includes the relevant host/family interpretation and test policy, not only the candidate JSON.

Use collision-resistant content digests, or exact canonical content comparison, for durable evidence/publication bindings. A short display label or non-cryptographic content identifier is not sufficient proof that two candidates and their dependencies are identical. This requirement does not turn an untrusted hash into authorization; permissions and source validity remain independent.

A cached test pass does not replace fresh activation permission, lock/revocation, applicable funding authorization, world identity, or current action prerequisites. A world tick unrelated to the requirement should not invalidate an immutable material-role check. A changed material, owner, source policy, query membership, validator revision, or required scenario can.

A newly installed consumer can invalidate a prior `no relevant interaction` result. Track membership/index revisions and the complete analyzed scope. Negative retrieval and unsupported-result caches have explicit expiry or relevant invalidation; they are not proof that an idea is forever impossible.

### 10.2 Cross-world and partial reuse

Host-contract evidence may travel when the exact implementation and assumptions match. World-law and installation evidence requires destination compatibility. Current grants, frozen scopes, initialization, private history, and funding are always destination-specific.

A valid subcomponent can be reused even when another branch fails, but its presence does not prove the whole combination. Keep complete/partial coverage explicit. Sharing technical work must respect rights and privacy; a matching digest cannot reveal an inaccessible invention or its private motivating context.

### 10.3 Revising after a finding

A changed draft re-enters plan construction. Preserve applicable checks and artifacts; generate only missing or invalidated work. A local output defect does not force a new semantic design. A changed conceptual requirement creates a new revision and may expand the mandatory interaction set.

Bound the repair loop under the existing episode. Provide a minimized counterexample and precise findings, not a request to rethink the entire world. Do not accept repeated unchanged candidates, silently lower thresholds, or treat budget exhaustion as permission to skip a mandatory check.

## 11. Cost and runtime isolation

Use [invention budgets](invention-budgets.md) for reservations, limits, uncertain completion, and attribution. Verification has real CPU/memory/storage and possible model costs even when it does not mutate the world.

Run expensive test batches against an isolated snapshot or bounded affected-state representation outside the live writer. Preserve deterministic initial state, native ordering, saved randomness, and fixture identity. Do not accidentally run paid provider adapters, create real accounts, emit public discoveries, or use a live world as an experiment.

Share immutable, pinned scenario input where practical and allocate bounded mutable state per run; avoid deep-cloning the entire mature world for every parameter combination. A reduced scenario must retain the dependencies needed for its claimed scope. Do not omit relevant consumers merely to make a test cheap. Larger integration/rehearsal runs remain separate, explicitly budgeted evidence. Reuse the current native runner before introducing worker pools or a general simulation farm.

Separate preparatory checks from a short final activation recheck. If relevant inputs changed, replan or reject stale activation; do not hold the world paused through unbounded model reasoning. Limit concurrent verifications and their memory/CPU share so background invention does not starve survival or player commands.

Native runtime loops use admitted rules, not repeated validation prompts. A deliberately admitted semantic resolver has an explicit question, evidence, outcomes, cost/fan-out ceiling, uncertainty behavior, and no-provider fallback under the declaration design. It is not an implicit LLM call attached to every object update.

Check amplification across native events, EPR intake, cognition, narration, and art. Optional reactions may be coalesced under their owners' policies; mandatory physical effects cannot be silently dropped to save money. An inability to sustain required behavior produces a visible recovery/quarantine or narrower accepted design, not misleading simulation success.

## 12. Measuring whether the validator is useful

Measure cost and latency per usable invention, not just per call. Track false rejection, unnecessary escalation, unsupported declarations correctly blocked, successful artifact reuse, repair rounds, minimized failures, later discovered regressions, and runtime cost added by installed behavior.

Use a curated held-out set spanning supported variants, novel combinations, conflicting constraints, ambiguous requests, irrelevant context, adversarial names/instructions, actor knowledge boundaries, and failure/recovery. Do not tune on the same examples and present that as general quality. Calibrate routing questions separately; report coverage and uncertainty rather than a single universal accuracy number.

An authoring model that is cheaper per token but requires repeated repairs may be more expensive per working result. A native invariant that catches a recurring error is reusable infrastructure. Once a repeated semantic issue becomes a stable admitted rule or test, move that check into the relevant contract rather than paying to rediscover it indefinitely.

Tools such as [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/) can help generate and reduce operation sequences; adoption is optional and must fit the existing TypeScript test setup. No new dependency is introduced by this design.

The long-term scaling property is cumulative: established contracts and independently maintained evidence make future ordinary inventions cheaper, while genuinely new behavior receives proportional investigation. No amount of cached evidence eliminates the need for current world authority and coherent activation.
