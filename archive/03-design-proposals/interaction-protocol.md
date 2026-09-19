# Universal interaction protocol — bounded meaning, reusable effects

Status: **proposed contract**, not implemented. Requirements: F11–F17, F20, F30–F31. All example values below are fictional game tuning, not physical or medical models.

September 19 follow-up: [evolving materials and modular construction](evolving-materials-and-construction.md) defines extensible component properties, script references, semantic hooks, and buildings assembled from replaceable parts. [Heat and fire](heat-and-fire.md) develops ignition and spread; a combustible target no longer implies automatic ignition by any source.

## What “universal” can mean

An extensible protocol can standardize how an interaction declares participants, prerequisites, effects, time, presentation, and evidence. It cannot encode every possible future physical or social law in a few scalar properties. The useful goal is universal **composition and admission**, with explicit extension points for new primitives.

Separate four questions:

1. **Intent:** What is the actor attempting, and which entities do their words refer to?
2. **Applicability:** Is that attempt possible here, under the current rules and actor permissions?
3. **Resolution:** What effects occur, with which uncertainty, resource costs, and duration?
4. **Presentation:** How is the attempt/outcome shown and explained to eligible observers?

A model can interpret “comfort her with the bear” while deterministic logic transfers an item, checks reach, and emits speech. A subjective response depends on the recipient's memories and personality; “cute” does not guarantee a fixed happiness boost.

The [world profile](world-rules-and-parameters.md) constrains what causes/effects can exist, independently of whether their implementation is present. Semantic expression remains open-ended: roleplaying a spell is possible speech, while actual magical ignition is rejected in a world without supernatural powers. [Complexity management](simulation-scope-and-complexity.md) favors reuse and coarse consistent rules rather than a new subsystem for every nuance.

## Proposed contracts

These are specification sketches inside documentation, not executable files or finalized API definitions.

| Contract | Required information |
|---|---|
| Intent | Request ID; world ID; source/player/NPC; actor ID; target IDs or unresolved references; requested verb/text and proposed method; supplied tools; requested mode; client timestamp |
| Observation context | Sector/tick; relevant entity/component versions; authorized facts; perception evidence; policy and world-rules versions |
| Mechanism definition | ID/version; parameter schema; applicability predicates; required knowledge/capabilities; read/write declarations; effect template; duration model; presentation bindings; tests/provenance |
| Effect proposal | Command ID; world/profile revision; input intent; mechanism/version or ad-hoc decision ID; read set; checks; reservations; bounded operations; admitted causal/source references; RNG record; expiry; causal explanation |
| Commit result | Accepted/rejected/deferred/interrupted; event ID; actual effects; consumed resources; failure reason; next allowed actions; visibility labels |
| Ongoing process | Process ID/version; participants; causal parent/root; inherited cumulative budgets; start/end or remaining work; integration rule; last evaluated tick; interruption conditions; cleanup rule |

Attribute definitions include a namespaced ID, type, units, bounds, default/unknown semantics, owner system, replication visibility, aggregation rules, and supported operations. Examples: `body.left_hand.integrity` (bounded game points), `material.moisture` (normalized fraction), `thermal.temperature` (defined simulation unit), `social.affection` (directional bounded score). Do not compare unrelated units simply because both use numbers.

Extensions require registered types. Unknown attributes do not silently become true, zero, or unlimited; an unresolved dependency should produce abstention or a request for an extension. A descriptive label such as “ancient” is semantic context until an accepted rule gives it a mechanical role.

## A deliberately small effect vocabulary

Start with operations such as transfer an owned item; consume a declared quantity; adjust a bounded attribute; add/remove a typed status; schedule/cancel a process; move via validated navigation; create an entity from an approved archetype with a declared resource budget; emit an observable event; and propose a relationship/memory update.

These operations are the only path to world mutation. No arbitrary database access, engine method invocation, unknown filesystem writes, provider calls from effects, or unbounded spawn/loop operations. Social outcomes should usually create observations and appraisal opportunities, rather than directly commanding another character to love, forgive, or obey.

A shelter recipe assembles separately addressable walls, roof sections, supports, and other needed parts. Coverage and usable space derive from that assembly, so it can be extended, damaged, and repaired without a discrete house upgrade. The proposed first representation uses a grid and simple support/coverage rules; arbitrary mesh construction and detailed structural analysis are unnecessary. New primitive behavior—such as fluid pressure if none exists—requires a separately designed extension. Typed properties and formulas inside supported contracts can evolve through versioned definitions; new host operations remain engine work.

JSON Schema can validate structure and reject undeclared properties, including composed-schema cases. It does not prove that an effect is fair, physically plausible, or within an actor's authority; runtime invariants remain separate. [JSON Schema object validation](https://json-schema.org/understanding-json-schema/reference/object)

## Example definition: apply an ignition source to a wooden section

```yaml
mechanism: thermal.apply_ignition_source
version: 1
parameters: [actor, target_section, ignition_source]
requires:
  - actor_can_reach_target
  - actor_controls_ignition_source
  - ignition_source_has_available_fuel_and_supported_output
  - target_has_approved_combustible_material
  - target_has_supported_geometry_thermal_and_moisture_state
  - local_fire_policy_allows_attempt
  - target_not_already_in_incompatible_process
reads: [position, inventory, material, geometry, thermal_state, moisture, fuel, source_output, fire_policy, active_processes]
writes: [source_fuel_reservation, process_registry]
resolution:
  - reserve_source_fuel_and_begin_bounded_heat_exposure
  - consume_source_fuel_as_defined_even_if_target_does_not_ignite
  - thermal_process_evaluates_heating_ignition_and_sustain_conditions
presentation: actual_source_flame_target_heating_and_committed_ignition_if_any
on_interrupt: release_unconsumed_reservations
on_unknown: abstain
```

The referenced predicates and operations must already be supported and typed. YAML text alone grants no capability. The scheduled thermal process has its own declared reads, writes, and inherited limits; this outer action cannot hide unbounded descendant effects. The authority validates dependencies against registered predicates and operations, or instruments reads; generated declarations are not trusted to be complete. Semantic interpretation chooses the intended object and candidate rule; exact eligibility checks run again when the action begins and when its effect commits. A source can expire without igniting the target. Compatible contributions from multiple heat sources are aggregated by the thermal system, not rejected merely because heating is already active.

## Route from arbitrary language to a result

1. Resolve selected entities and the actor's literal request. Treat quoted speech, item descriptions, and memories as game data, never privileged instructions.
2. Consult the effective world profile and proposed cause/method; distinguish forbidden effects from plausible missing support and uncertain interpretation. Retrieve compatible candidate mechanisms by verb, components, and semantic similarity. Candidate retrieval does not prove applicability. Known actions can use cheap deterministic checks; unfamiliar meaning may require scoped classification.
3. Try approved mechanisms with exact typed guards. Known menus can directly select a mechanism when the player knowingly requests that existing action.
4. For unresolved meaning, use a bounded semantic choice/score if suitable; otherwise a general model produces a structured proposal or abstains.
5. Validate world/profile revision and causal constraints, permissions, visibility, resources, plausibility bounds, version dependencies, maximum affected area, event fan-out, and available primitive support.
6. Begin an interruptible action with a visible anticipation cue when appropriate.
7. Recheck changed dependencies at commit, apply atomic effects, then emit observable consequences and private appraisal events. Build player explanations from actual committed outcomes and observer-visible facts, not the model's proposed narrative.
8. Queue promising, world-compatible novel patterns for reusable mechanism generation and testing within the novelty budget. Do not automatically generalize every ad-hoc result or send an explicitly forbidden effect through repeated generation attempts.

Interpretation and execution may have different deadlines. A brief “trying to work out how” activity can preserve play while a novel request resolves. For unclear targets or consequential ambiguity, present a concise in-world choice. Do not let a model silently resolve “burn it” against the wrong person or building.

For a forbidden magical ignition in a realistic world, a friendly response can be: “Trees here are unmoved by incantations. You'll need a physical source of heat.” This rejects the effect without claiming a performed ritual or consumed items. Actual roleplay, failed physical attempts, unavailable materials, and deferred implementation have different consequences and explanations. See the [feedback contract](world-rules-and-parameters.md#friendly-rejection-and-truthful-feedback) for tone, alternatives, privacy, and fallback behavior.

## Five kinds of reuse

| Reuse kind | What is reused | Necessary boundary |
|---|---|---|
| Intent normalization | “set alight” maps to an ignite family | Current targets/meaning still resolved |
| Mechanism template | Formula/process applied to fresh parameters | Guard coverage, units, dependency versions |
| Exact semantic decision | An answer for a fully specified bounded state | Relevant state fingerprint, policy/model version, expiry |
| Semantic candidate retrieval | Similar past situations | Revalidate; similarity alone is never a cache hit |
| Agent skill/plan | Sequence such as collect wood → assemble shelter | Belief relevance, path/resources, step-by-step revalidation |

For quantitative effects, cache a validated formula or bounded parameterized procedure rather than the last output number. A semantic cache key includes the decision's declared causal inputs, not just the text of the action. Dependency discovery is imperfect: unknown material, missing helmet properties, novel weather, or new status should cause a miss. Use negative examples and guarded domains to reduce overgeneralization; there is no complete automatic solution to identifying every relevant factor.

Do not cache stochastic outcomes in a way that forces identical randomness forever. Reuse the distribution/rule, then take a recorded fresh draw. Do not share a private emotional interpretation across residents as if their memories and tastes were identical.

## Walkthrough 1: punching a helmeted head

The semantic layer recognizes a deliberate hand strike to a head, including protective equipment and the actor's hand condition. The resolver gathers body regions, equipment coverage, material/rigidity, strike class, reach, stance, relevant impairment, and local conflict rules. Missing coverage or material data prevents reuse of an unhelmeted rule.

A validated game rule distributes a bounded impact budget between hand injury, protected head effects, fatigue, and interrupted actions. Armor condition and coverage affect the result; a rigid helmet can increase hand injury while reducing head injury. This is a designed approximation, not a universal claim about real injuries. Do not let a model invent exact anatomical damage outside the rule's allowed range.

Wind-up begins; the target can step away, block, or react. At contact, recheck range, target identity, current equipment, and interruptions. A removed helmet invalidates the original helmet-dependent proposal. On success, commit both parties' effects together, then emit a sound/visible event. Witness memories depend on actual visibility; the target's trust response depends on interpreted intent and prior relationship.

The reusable mechanism is **not** “punching causes 10 damage.” It is a versioned hand-strike family with material/coverage guards, fresh parameters, interruption rules, bounded effects, and tests distinguishing helmet/no helmet, glove/no glove, missed contact, different body parts, and new materials.

## Walkthrough 2: setting a tree on fire

The chosen tree exposes fuel, moisture, combustible material, and integrity. The actor has an ignition source and can reach the target. First-time semantic reasoning can decide whether the request falls within a supported ignition family. If combustion does not yet exist as a supported primitive/process, the system can propose a bounded new definition; it cannot claim the tree burns merely because it produced a paragraph about fire.

The admitted source exposure first updates local heat and moisture; ignition requires the supported target conditions. Once burning, a process consumes fuel, damages affected sections, emits heat/light/sound observations, and selects presentation from actual state. A no-spread campfire remains a limited first milestone. The desired [growing-fire model](heat-and-fire.md) aggregates heat from nearby sources and propagates across exposed sections, with bounded fuel/heat accounting and spatial queries. Materials, effective heated surface, moisture, and source duration distinguish a twig from a substantial wooden wall; combustibility alone is insufficient.

For a simple rate process, integrate `change = bounded_rate × elapsed_simulation_time`, clipped at resource limits and evaluated at event boundaries. At fuel exhaustion stop burning; when rain changes moisture, recalculate from that time rather than applying one stale rate over the whole interval. Subdivide steps where thresholds matter. If work per frame is capped, retain time debt for later integration rather than discarding elapsed time. A loaded sector and a caught-up sector should not consume different amounts simply because their update intervals differ.

Art is a consumer of `burning` and intensity state. If a custom burning-tree asset is missing, use an approved flame overlay and a darkened generic trunk. The server's burn schedule does not depend on asset generation finishing. If the process is invalid, cancel before committing; if it traps mid-evaluation, reject that step without partial fuel/injury mutation and use a bounded safe fallback.

## Walkthrough 3: inventing a bow or trap

Interpret the player's proposed materials and method; check tool access, material properties, time, knowledge, and resource quantities. Compose an archetype and recipe from approved tension, storage, projectile, trigger, and assembly primitives if available. A first version may simply be a low-quality bow archetype with an approximate range and durability rule. A trap can be a visible trigger zone with a bounded capture effect rather than a newly simulated machine.

Persist the validated recipe definition in the capability registry. Separately record which actors discovered, learned, or taught it. Existence in the engine is not omniscient knowledge for every NPC. Recipes can have local variants and quality bands, but endless near-identical registry entries should canonicalize to a common mechanism family.

Resource conversion has declared inputs, outputs, losses, and work. A model cannot make “two twigs” produce infinite lumber by fluent justification. Failure can consume a declared amount of time/material and teach something; it must be predictable enough to be playable.

## Critical invariants and acceptance scenarios

The authority enforces nonnegative inventory, one owner per item, bounded rates/durations, no undeclared cross-entity writes, valid lifecycle transitions, no hidden-state leakage, compatible versions, exactly-once effective commits through idempotency, and scoped spawn/event budgets. Scheduled descendants inherit causal IDs and cumulative resource/work budgets, so a chain of individually bounded fire-spread steps cannot grow without a world-level limit.

Before admission, evaluate mechanism families on paired counterexamples: dry/wet wood; wood/stone; match present/missing; target reachable/moved; helmet absent/present; privacy permissions changed; duplicate request; process interrupted; save/reload during burning; a rule update halfway through a process. Replay committed outcomes under the pinned version. Sample cache hits in shadow evaluation and suspend a mechanism if mismatch rates breach its threshold.

A universal interaction protocol makes errors local and inspectable. It does not make generated mechanics intrinsically correct. That is why [capability promotion](generative-capability-lifecycle.md), [budgeted cognition](agents-and-social-simulation.md), and [evaluation gates](../05-project/roadmap.md) are part of the design rather than later polish.
