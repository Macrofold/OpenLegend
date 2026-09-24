# Compositional invention and live world evolution

**Status: accepted target design.** This document owns the end-to-end integration contract between kind-specific authoring, composition, subsystem behavior, cognition, and live revision. It specializes, rather than replaces, [world-module runtime](../archive/07-technical-architecture/world-module-runtime.md), [declaration activation](../archive/07-technical-architecture/declarations-and-evolution.md), [agency](agent-agency.md), and [presentation](invention-art-pipeline.md). [Scenarios](invention-scenarios.md) provide target behavior; INV-17 and the existing INV/EWF owners track delivery.

## 1. Define experiences using real supported components

OpenLegend should support ordinary tools, evolving shelters, unusual organisms and senses, world-authored laws, and reusable mechanisms. The common infrastructure must not assume hunger, human limbs, combustion, magic, or a numeric health meter. It does require typed identities, explicit authority, coherent effects, supported computation, and durable outcomes.

A new name or schema field does not implement behavior. A new law is executable only when supported host operations can express its semantics or a separately qualified algorithm provides them. A material property with no consumer remains descriptive/unused and must be labeled as such. Native implementations can be replaceable world systems; being compiled does not make a wilderness rule a platform invariant.

## 2. One adapter per actual definition kind

Expose a small reviewed `DefinitionKindAdapter` through the existing application service. Its responsibilities are discovery/schema, exact inspection, draft normalization, dependency extraction, validation planning, scoped preview, activation preparation, and safe explanatory projection. These are implementation seams, not a mandatory class hierarchy or nine separately deployable services.

The domain owns pure interpretation/admission and state transitions. The application resolves repositories, current grants, evidence and paid execution. The MCP adapter translates protocol messages. A renderer depicts the accepted result. Avoid an adapter that quietly owns its own registry, world writer, or permission table.

| Responsibility     | Required contract                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Discover           | Kind/version, actual supported schema, exposed ports, examples, limits, and enabled/unsupported capabilities.                     |
| Inspect            | Exact definition/pins, parameters, inputs/outputs, assumptions, lifecycle, observations, and source links.                        |
| Edit               | Bounded kind-specific field changes or port bindings with expected candidate revision; no arbitrary deep patch/eval.              |
| Compile            | Normalize representation and resolve supported references; retain intent-to-field traceability and unresolved conceptual choices. |
| Summarize behavior | Derive conservative reads/effects/resources/query membership from trusted operators, never from an LLM's self-description.        |
| Validate/preview   | Select independent invariant/family/interaction scenarios and execute against isolated inputs. Report scope and unknowns.         |
| Prepare activation | Exact dependency closure, affected instances/processes, owner bindings, initialization and compatibility/migration requirements.  |
| Project            | Player explanation, discoverable action parameters, actor evidence/concerns, presentation requirements, and technical inspection. |

Do not advertise unimplemented operations as active tools. A missing kind can be discoverable as unsupported with its required host capability. Preserve the zero-generation supplied-method path. New kind adapters should not require changing the conversation protocol, budget ledger, or transport.

## 3. Composition contract

A reusable construct exposes deliberate typed ports with semantic interface/version, units, target roles, allowed effect/read domains, binding phase, defaults, dependencies, and bounded multiplicity. Binding phases are authoring, installation, invocation, or an explicitly supported runtime update; they are not freely interchangeable.

Use existing exact definitions when compatible. A partially bound template can be saved or distributed but cannot execute until required ports are bound. Missing behavior is not a successful no-op. Substituting a scalar damage effect with a memory-edit effect changes authority and semantics even when both return the same JSON shape.

Compilation resolves the graph, checks port compatibility, derives aggregate capabilities/work bounds, and produces a bounded execution representation. It must preserve existing native phase and RNG ordering during initial extraction. Do not silently convert the whole engine to simultaneous numerical evaluation as a refactor; the existing contribution design owns that separately qualified change.

Each invocation owns its progress and effects. Sharing a definition does not share an inventory, cooldown, or random state. Shared resources must be explicit identities with one owner. Transfers stage debit and credit together, and competing claims resolve under a declared policy. World-permitted creation magic can be a source; an ordinary repair cannot disguise resource creation as a cosmetic adjustment.

Previously invented inputs require positive consumer checks for structure, resource identity, roles, capacities, supported interfaces, rights and recursive bounds. Do not merely remove the current native-input restriction. Prove one reusable intermediate material/tool input before claiming arbitrary recursive crafting.

## 4. Subsystem interactions and unknown properties

The [relationship graph](invention-graph.md) captures exact dependencies and potential read/effect/resource/event interactions. The validation planner includes reverse consumers and broad query membership, not just explicit `requires` edges. Independently accepted mechanics still require checks for new coupled or sequential behavior.

For an introduced property, identify the owner, supported consumers, units/meaning, initialization, disclosure and unknown policy. Keep missing, unknown, conflicting, not applicable, and admitted approximation distinct. No missing thermal property may silently mean fire immunity once that world has an active thermal consumer.

When a new consumer reaches old objects, admission must provide supported coverage: derive values from existing data, use an explicit accepted coarse default, initialize through a reviewed conversion, or leave the candidate blocked. Do not generate an entire neighboring science because a note suggests an influence. Store bounded unresolved hypotheses for later inquiry without executable effects or compulsory paid work.

A combustion approximation can itself be invented: its state, fuel accounting, ignition conditions and test expectations are authored through supported interfaces. It is checked under existing platform/world obligations, plus independent intended-behavior review. Its own candidate tests cannot waive the active constitution. Later torches reuse the admitted law; they do not reprompt the model to decide how fire works each tick.

## 5. Cognitive and player integration is part of completeness

A supported mechanic needs more than storage and physics. Its adapter must specify applicable action affordances, observable consequences, meaningful actor concerns, and private versus public outcomes through the existing EPR/AG/CR interfaces. An invented charge reservoir should expose actual low-charge concern and a permitted recharge action, not ask every prompt to special-case its name.

Cognition consumes admitted observations and actor state, not the World Agent's administrative investigation. Ordinary native continuation remains independent of LLM response time. A bounded semantic selector may choose a feasible native action; native validation still determines execution. Complex planning can investigate through actor-scoped tools without gaining creator tools.

Definition installation, learning, skill/proficiency, possession, action scheduling and completion are distinct transitions. A result can teach the inventor under policy but does not teach everyone or force construction. Actor goals can change while authoring runs; result arrival checks current intent before an explicit continuation. A private rejection or compiler finding is feedback, not a memory of an experiment performed in the world.

The World Agent is an out-of-world assistant with authorized world-level inspection. It can validate against more world data than an embodied actor knows. Its findings do not automatically become actor memory or dialogue. Actual NPC experimentation requires real permitted actions and receipts; only the consequent observed evidence changes that actor's beliefs.

## 6. Four kinds of later change

**Depiction refinement** changes a compatible asset, not the object. **Blueprint revision** creates a new design for future construction. **Instance modification** is a separate resource/time-consuming action or expressly authorized creator operation. **Shared-law replacement** changes world behavior and needs an installation transition.

Default to the smallest requested scope. Keep existing items on construction semantics when the shared law remains compatible. Do not let arbitrary cohorts use contradictory versions of the same law. An object-specific exception needs a causal, admitted property or a distinct construction—not merely an older creation date.

A creator can change a supported sense or reservoir without editing every actor by changing the appropriate bound definition and providing a coherent transition. Whether current values should preserve absolute quantity, fraction, or some other interpretation is a meaningful reviewed choice when it affects gameplay. The agent must not silently choose a destructive mapping.

## 7. Shared-law migration protocol

Use the existing INV-5 authority boundary, not a second tool installer:

1. **Prepare a candidate.** Pin base installation, new artifacts, constitution/host versions, intended scope and author authority.
2. **Compute impact.** Include dependent definitions, live instances, active work/effects, owner bindings, observation/cognition caches, presentation, and retained references. Query in bounded pages; never hold the world transaction while an agent browses.
3. **Classify affected records.** Unchanged-compatible, explicit value initialization/conversion, finish-under-compatible-pin, quiesce-and-migrate, or blocked/unsupported. Record exact conversion logic and permitted recovery.
4. **Rehearse in isolation.** Exercise actual existing data shapes plus independent boundary/cancellation/resource scenarios. Snapshot coverage and stale assumptions are explicit.
5. **Prepare the review.** Explain changed behavior, affected counts with coverage, preserved/lost values, interrupted work, approximation, reversibility and cost. Request confirmation for consequential changes and freezes.
6. **Recheck and commit.** At a committed simulation boundary, recheck base authority and relevant revisions, quiesce affected owners, transform current eligible state, then commit manifest/state/receipt coherently. A changed snapshot may require refreshed analysis rather than applying an old copy over current progress.
7. **Resume and invalidate.** Rebuild affected derived indexes, refresh scoped action/concern/visual projections, and resume only after required owners are ready. Current native work observes either the old or new coherent installation.
8. **Recover idempotently.** A crash reads the durable activation receipt; it cannot repeat a debit/conversion. A failed preparation leaves the old law active. Post-commit correction is a forward transition, not restoration of an obsolete entire target snapshot.

Initially restrict live law changes to one local world/sector and bounded affected state. For a large change, require an explicit maintenance pause and capacity-qualified plan; do not invent distributed staged migrations prematurely. The no-legacy-development-save policy stays in force and does not waive coherence for a supported change within a live current-format world.

Required-owner failure is not permission to silently skip physics. Quarantine uses the declared scope/recovery; if isolation would corrupt other owners, visibly pause that dependent scope or world. Frozen rules can be stopped for technical safety without mutating their definitions. Old saves cannot defeat current safety or permission overlays.

## 8. Meaningful art redesign

A shared visual contract describes function, observable semantics and cosmetic freedom. The agent can retain a chosen silhouette while proposing functional changes, but incompatible constraints become a visible choice. A narrower doorway affects traversal; a painted flame does not create heat. The image provider is never the source of collision, reach, anatomy or perception authority.

Before submitting an art request, derive the brief from the selected candidate, approved references, geometry/state constraints and style revision. Use an adequate native fallback for playable behavior, then optional rough/refined output. A required state representation can block the affected live surface; polish cannot block unrelated valid behavior.

An art defect is repaired locally. A discovered genuine design contradiction creates a new candidate revision, retains liked outputs/findings, and re-enters the same planner. New mechanical versions can reuse compatible visuals; appearance versions need not match mechanical version numbers. Existing-state changes and publication use current identity, not the state that existed when generation started.

## 9. Extensible investigation without an all-knowing oracle

The World Agent can reach full authorized definitions, effects, relationships, materials, installation state, history and validation evidence through the [tool contract](invention-workshop-tools.md). There is no fixed prompt-size boundary on what it can investigate, but every call is bounded and paged. Missing information and incomplete analysis remain explicit.

Generation levels still apply: G1 configures/composes supported behavior, G2 requires a separately qualified restricted interface, and G3 is engineering. Unknown behavior should produce a retained unsupported-capability request with the required computation and a supported alternative only if it genuinely meets an accepted narrower goal.

The release path in [scenarios](invention-scenarios.md) proves a real object loop, a non-human attribute/sense loop, a cross-subsystem composition, and finally a live law change. It is ambitious through reusable capabilities, not by claiming a universal engine can be implemented in one slice.

## Repertoire integration

[Repertoire foundation](repertoire-foundation.md) defines the integration of live arrangements, activity-owned versus machine-owned work, information, obligations and temporal constraints. [Action capabilities](action-capabilities.md) owns runtime method composition; reusable definition composition remains here. A novel arrangement using installed laws is not necessarily a new definition.

## Creator authorship without an inhabitant

Creator admission is an explicit application-bound mode of the same native recipe installer. It records the current creator account instead of inventing an actor identity, permits preparation/installation while paused, and never grants character knowledge, crafts an object or emits a fictional personal discovery. Ordinary player/NPC admission retains its living actor, known-base and private-discovery rules. Exact base references, material validation, native recipe capacity, immutable attribution, declaration receipts and the current player-invention lock still apply. Creator read scope does not silently exempt the author from the existing lock. The application checks its authenticated owner before invoking this mode; candidate JSON cannot supply creator authority.
