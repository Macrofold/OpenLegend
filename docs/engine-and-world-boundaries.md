# Engine and world boundaries

## Spatial substrate and world policies

[Spatial world](spatial-world.md) owns the XYZ/support/query boundary. The first provider supports bounded public planar patches embedded in 3D and finite blockers; the wilderness module supplies the lookout, profiles and native flight route. Keep those content choices replaceable rather than treating every world as a wilderness. Sensory definitions remain replaceable policies consuming geometry; rendering/appearance never admits physical capabilities. Broader provider/profile registration remains EWF/SW work.

**Status: target architecture.** This document defines the intended separation between OpenLegend's runtime and the realities built with it. It does not claim that the current implementation already has a general module runtime. [Architecture](architecture.md) describes executable behavior; [EWF delivery](maintainers/extensible-world-foundation.md) tracks the missing shared foundation.

## 1. The product being built

**OpenLegend should be an engine for running authored realities, with a strong default reality—not a fixed survival game with an ever-growing collection of mod hooks.**

Build OpenLegend first and extract its reusable engine boundaries through playable features. The final architecture is a direction, not an instruction to complete every abstraction before making the game useful. A v1-specific implementation is acceptable when its responsibility, current limitation, and future replacement boundary are explicit.

**Worlds define what exists and how it behaves. The runtime defines how admitted rules are represented, executed, combined, authorized, inspected, and preserved.**

The wilderness game supplies a coherent starting reality, not the permanent ontology of every world. Hunger, sleep, human anatomy, ordinary senses, scalar health, spoken conversation, and one particular model of cognition must not become unavoidable requirements of unrelated worlds. Conversely, extensibility does not authorize arbitrary executable prose, direct database writes, or a different implementation of basic safety in each feature.

Continue using PlayCanvas for rendering, React for the interface, the existing authoritative domain, application coordination, and execution adapters. Logical modularity does not require a new graphics engine, an ECS replacement, a repository split, a distributed event broker, or an immediate scripting runtime.

## 2. Four logical layers

| Layer                             | Owns                                                                                                                                                                                     | Does not own                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Kernel and authority boundary** | Stable identity, current authority generation, ordered admission/commit, reference validity, permission enforcement, bounded execution, durable outcomes, restoration boundaries         | Which species exist, which needs they have, whether magic is possible, or which behavior is interesting             |
| **Reusable runtime services**     | Typed state and contributions, supported queries, scheduling/deadlines, resource transfers, native action execution, observation delivery, bounded controller execution, safe projection | One mandatory set of physiology, sense, learning, or social rules                                                   |
| **Default world systems**         | Wilderness metabolism, body/lifecycle policies, current sight/hearing, native survival priorities, standard cognition/agency, initial materials, crafting, story selection               | Unrestricted platform authority merely because they ship with the product                                           |
| **Admitted world extensions**     | Configurations, definitions, compositions, replacement policies, and eventually restricted algorithms using supported services                                                           | New host privileges, arbitrary code loading, unbounded work, or bypasses of installation/knowledge/permission rules |

These are responsibility boundaries, not a demand for four new packages. A compiled TypeScript implementation can implement a replaceable world system. Data-driven does not mean slow, untyped, or interpreted on every entity every tick.

A **world module** is a coherent group of definitions and policies with declared dependencies. It is not synonymous with a process, repository, plugin downloaded from the internet, or marketplace pack. A pack is a distribution/rights artifact; a module is an execution/composition boundary.

## 3. Fundamental but replaceable

Treat these questions independently:

1. Does the feature ship by default?
2. Is its implementation native/compiled?
3. Is it enabled in this world?
4. Can its parameters or behavior be changed?
5. Who is allowed to change it?
6. Does changing it require a new host capability?

A fast native sight evaluator can be supplied by the host while a world's sense definition selects its range, detection channels, and detail policy. A body model can be essential to the default game without being the only body model the engine can run. Native emergency response can remain immediate while the choice of emergency policy remains world-specific.

The desired boundary is **stable interfaces around replaceable behavior**, not a switch from all hard-coded code to all player-written scripts.

## Editable knowledge boundary

[Knowledge documents](knowledge.md) use reusable owner/subject identity, revision, validation and persistence mechanisms. Their meaning, default quotas and observer naming belong to the [base-world cognition policy](worlds/base/knowledge.md). Seeing an entity does not grant knowledge of its global name; runtime identity is not recognition evidence. Dynamic state is database-backed; YAML holds authored policy only.

## 4. What must remain protected

| Replaceable world rule                                                                      | Non-negotiable runtime boundary                                                                                                                    |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health reaching zero causes death, collapse, repair shutdown, or something else             | A lifecycle transition is authorized, consistent, and cannot accidentally duplicate identity or effects                                            |
| Matter/energy require physical sources, or an admitted spell can create them                | Sources, sinks, transfers, and exceptional creation are explicit authorized operations with truthful receipts and bounded host cost                |
| Thoughts are private, or a supported telepathic effect reveals particular fictional content | Access is mediated through explicit disclosure rules and platform grants; no extension gains raw access to secrets or other users' private records |
| A character can forget, have memories altered, or share selected experiences                | Current privacy protections, external accounting, and permission revocation are not rewound or erased by fictional mechanics                       |
| A clock runs quickly, slowly, or supports an authorized fictional rewind                    | Commit order, load-generation fencing, and stale-work rejection remain unambiguous                                                                 |
| Characters value food, social contact, charge, glory, or no persistent goals                | Controllers cannot bypass native action admission, reserve unlimited inference, or seize player input without authorization                        |
| A world supports magical cloning                                                            | Retrying one admitted cloning request cannot execute it twice                                                                                      |

Conservation of ordinary physical energy is a world premise, not a universal platform invariant. Correct attribution and authorization of a supported source operation are runtime invariants. Enabling fantasy is not permission for every proposed effect; the relevant native capability or admitted algorithm must exist.

The runtime also has computational limits. Its current spatial substrate is an authoritative two-dimensional ground plane with a three-dimensional presentation. This design does not promise arbitrary spacetime topology, perfect physical simulation, unrestricted shared minds, or every imaginable organism immediately. A missing primitive remains an explicit host-capability gap.

## 5. A repeatable boundary decision

For every new feature or significant change, answer these questions in its owning design and code review:

1. **Could a coherent world behave differently?** If yes, identify a world-policy or definition boundary rather than scattering the choice through infrastructure.
2. **Can supported mechanisms express it?** Prefer configuration or composition. Do not add a native branch for a named finished invention.
3. **What new computation is genuinely missing?** Add a narrow reviewed service or evaluator only when the existing interface cannot express the necessary work.
4. **What can it read and change?** Distinguish world knowledge, actor evidence, private interpretation, security grants, and actual effects.
5. **What wakes it and what bounds it?** Declare meaningful dependencies, execution phase, deadlines, maximum affected work, and failure behavior.
6. **How does it enter and leave a running world?** Define state ownership, initialization, definition pins, active-work compatibility, removal, and save/load treatment.
7. **Does it work through ordinary user and actor surfaces?** New state/actions need scoped inspection, context, discovery, and truthful presentation—not only a field in storage.
8. **Can a substantially different fixture use the same contract?** Test a machine's charge rather than only adding thirst beside hunger.

A negative answer does not prohibit the feature. It identifies the missing layer. Localize a necessary fixed implementation behind a narrow interface rather than pretending it is already generally extensible.

Closed runtime discriminants such as private/system/external scope, admission outcomes, and permission operations should remain closed and validated. World-specific names such as species, sense IDs, attributes, and admitted action families should become registered identities. Replacing every enum with an arbitrary string is not extensibility.

### Design principles for every feature

These principles guide engine design, subsystem design, and implementation review. They do not require every feature to be player-configurable on day one.

| Principle                                                     | Required architectural consequence                                                                                                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P01 — Protect integrity, not one reality**                  | Keep authorization, valid references, commit/receipt semantics, and external accounting protected; let admitted worlds choose their fictional laws.                                   |
| **P02 — Separate mechanism, policy, and content**             | Put efficient reusable operations behind narrow contracts; keep wilderness choices in the default package; put supported variations in definitions.                                   |
| **P03 — Build a playable vertical slice**                     | Prove a real user interaction through state, behavior, observation, UI, and persistence before generalizing neighboring systems.                                                      |
| **P04 — One semantic owner**                                  | A quantity, goal, active effect, or definition has one authoritative owner. Other systems use typed operations or read-only projections.                                              |
| **P05 — Compose meanings, not matching names**                | Reuse explicit interfaces, units, target roles, resource rules, and effect domains. Similar labels do not establish compatibility.                                                    |
| **P06 — Evidence, interpretation, and effects differ**        | A perceived fact, a hypothesis, a goal, an attempted action, and a committed result cannot substitute for one another.                                                                |
| **P07 — No ambient authority**                                | An extension receives only explicitly granted inputs and operations; a new fictional ability does not grant platform privileges.                                                      |
| **P08 — Change dependencies and costs are part of behavior**  | Declare what makes results stale, when work runs, and what bounds it. Do not make extensibility depend on world-wide polling or unbounded callbacks.                                  |
| **P09 — Lifecycle is part of a feature**                      | Creation, ongoing execution, cancellation, replacement, removal, save/restore, and failure must have defined outcomes.                                                                |
| **P10 — Natural language is the primary authoring interface** | The world agent handles supported technical assembly, explains consequences, and asks consequential questions; inspectable technical artifacts remain the executable source of truth. |
| **P11 — Make specificity explicit and local**                 | A fixed v1 subsystem may remain fixed. Mark its intended extension seam, owner, and expansion trigger in its documentation and nearby code, without pretending an interface exists.   |
| **P12 — Prove generality with a different example**           | Test charge instead of only thirst, touch instead of only wider sight, and a nonnumeric disposition instead of only another meter.                                                    |

Apply P07 separately to fictional knowledge and application security. A world may deliberately support telepathy or compulsion through admitted game effects; neither can reach credentials, actual billing, or ungranted human-private data.

### Intentional v1 specificity

Do not scatter placeholder interfaces everywhere. A deliberate fixed implementation is acceptable when:

1. It serves a current playable requirement and uses the existing authority, privacy, time, and save boundaries.
2. The fixed assumption is localized in the owning module or adapter rather than copied into unrelated transport, UI, cognition, and storage code.
3. The owning design identifies **what is fixed now**, **the intended replaceable boundary**, **what evidence or feature triggers extraction**, and **the task owner**.
4. A brief code comment at the important boundary links to that design and owner. It states a current limitation and intended extension, not a historical development diary.
5. Before another feature relies on the fixed assumption as universal, its developer either uses the seam or extends it in the owning subsystem.

Example comment pattern—not a required filename or an instruction to claim the target exists:

```ts
// Default-world policy, not a universal actor requirement.
// Current seam: the physiology adapter owns these thresholds.
// Target: docs/engine-and-world-boundaries.md#intentional-v1-specificity.
// Expand through EWF03 when another installed need family is consumed here.
```

Keep detailed work in the focused tracker. Do not create an independent permanent “architecture debt” checklist in every spec or mark every literal constant as a future extension. A clearly unsupported capability is better than a nominally generic interface with hidden special cases.

## 6. Attributes, needs, traits, skills, and bodies

### Semantics before meters

The same storage mechanism may support multiple types, but their meanings differ:

| Concept                    | Appropriate starting model                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fullness or battery charge | Reservoir with bounds, rates, replenishment, and transition policies                                      |
| Temperature or mass        | Quantity with units, precision, applicability, and conversion rules                                       |
| Skill                      | Proficiency and knowledge, with explicitly supported prerequisites and action effects                     |
| Trait                      | Category, disposition, structured value, or bounded narrative description                                 |
| Empathy                    | Interpretation/behavior disposition unless the world deliberately defines a numerical mechanic            |
| Health                     | A body-model value or derived condition summary; not universally a mandatory scalar                       |
| Psychological need         | State with declared satisfaction mechanisms and controller relevance, not necessarily a physical resource |

A bar is a projection of state. A useful new mechanic includes its state contract, update rules, effects, observation policy, controller meaning, available responses, and presentation. Its name alone grants none of these.

Use sparse components and shared definitions. Do not add every possible attribute to every entity. Missing, unknown, not applicable, and unsupported remain distinct under the [declaration property contract](../archive/07-technical-architecture/declarations-and-evolution.md#definition-and-property-contracts).

Default physiology must consume the same supported mechanisms available to eligible world definitions. It may use optimized storage and native code, but cannot rely on hidden writable copies of generic state. Other systems submit contributions through the owning mutation interface; they do not edit a second `health` or `energy` value.

### Authoring permission is a separate question

The accepted player-designed-stat policy currently restricts creation of new stats to god mode. The default NPC invention lock and player lock remain governed by [invention governance](../archive/03-design-proposals/invention-governance-and-ownership.md). Generalizing the runtime does not open those permissions, change their defaults, or authorize paid work.

A player may use a mechanic without being allowed to define it. An actor may propose a method without being allowed to install it. An engine developer can add a host operation without making it available to ordinary world authors.

## 7. Senses and observations

Vision and hearing are default sense implementations, not the full definition of perception. A sense combines:

- a supported candidate/query or propagation mechanism;
- a world-specific receiver and source interpretation;
- an actor-scoped observation projection.

Contact sensing can use a supported contact/proximity primitive. An electromagnetic game sense can use declared emitter/material response and a bounded propagation evaluator. A detailed field solver would be a separate host capability, not something a free-text sense description creates.

Do not require every observation to identify an entity at an exact point. Valid observations can concern an unidentified sound, a contact surface, a region, a direction, a field intensity, or an explicitly authorized non-spatial relationship. Detail can include detection, localization, classification, recognition, and intelligibility; it need not be one global near/medium/far integer.

Source descriptors may be shared; observer recognition, relevance, and evidence remain receiver-specific. Source properties can be inherited or derived from material/species/active-process definitions. A new sense does not require adding a new explicit field to every object.

[EPR](events-perception-and-reactions.md) continues to own exposure episodes and reaction intake. The [sensory design](../archive/07-technical-architecture/perception-and-attention.md) owns geometry, fidelity, and disclosure of sensory facts. A new sense plugs into those contracts; it does not introduce another event bus or another copy of actor awareness.

## 8. Minds, agency, and behavior

The existing memory and agency designs are the standard cognition package. They remain authoritative for that package, but are not a claim that every organism must have autobiographical text, goals, verbal thoughts, or speech.

Keep these boundaries distinct:

- physical capability and safety;
- controller choice;
- observed evidence;
- private beliefs and feelings;
- maintained intentions and plans;
- social obligations;
- proposed effects and actual outcomes.

The [agency specification](agent-agency.md) already permits empty or repeated decision operations and persistent pursuit. Use it; do not preserve the current single `talk`/`act`/`think` response shape as a universal engine limit. Provider JSON constraints are adapter concerns, not the world's ontology.

A new need should supply a bounded meaningful concern to a compatible controller. A new sense should provide permitted evidence. A new action should expose discoverable, typed affordances. None should require its name to be added to every prompt or scheduler branch.

The initial physical executor remains the agency contract's single work lane. Multiple simultaneous limbs, mouths, or effect channels are future supported capabilities, not inferred from an operations list. Preserve explicit cancellation, interruption, resources, and actual completion evidence.

A thought does not automatically change matter. A supported telekinetic mechanic may connect an explicitly admitted mental act to a native force/effect. Similarly, a future shared-memory organism requires a declared sharing policy and access boundary; it cannot read a database of other minds directly.

General model knowledge may supply hypotheses under the agency policy. Hypotheses are not fabricated observations, learned techniques, hidden-registry access, or executable mechanics. This architecture introduces no new mandatory technology-era or intelligence gate.

## 9. A ladder of power, not a new taxonomy

Use the existing [G0–G3 classification](../archive/07-technical-architecture/declarations-and-evolution.md#generation-levels-and-executable-references):

- Configure existing behavior inside its supported envelope.
- Compose registered state, predicates, effects, and processes as G1 where the interpreter supports them.
- Introduce a bounded new algorithm as G2 only when an isolated execution interface is implemented and qualified.
- Add a host primitive, privilege, storage interpretation, or incompatible runtime change through G3 engineering.

A touch sense may begin as native code, later become configurable, and eventually accept an isolated custom evaluator. Its subject matter does not permanently fix its extension tier.

A sandbox limits access and resources; it does not prove plausible physics, fairness, useful gameplay, or complete dependency declarations. Validation, world-premise compliance, composition tests, and player experience remain separate concerns.

### Reusable content at several scales

Player-generated content can be a material, object definition, action, effect, target selector, reusable interaction template, organism, sense, controller policy, subsystem, or module bundle. A pack can distribute any permitted combination of those; an instance in a live world is separate from the reusable artifact.

A reusable template exposes deliberate variation points. One creator can publish a bounded “select targets and apply an effect” construct; another can bind its effect, target predicate, cost, and supported lifetime policy. A third may publish a partially specialized variant with some choices still exposed. That does not require code generation when the composition is already expressible through supported operators.

This is a dependency graph, not one mandatory inheritance hierarchy. Define explicit ports, compatible substitution, and pinned dependencies. Do not copy a whole subsystem merely to change one permitted parameter, and do not assume every effect has a duration. The [runtime composition contract](../archive/07-technical-architecture/world-module-runtime.md#reusable-constructs-and-specialization) defines the technical boundary. Pack rights and distribution remain governed by the existing invention/ownership owner.

### Natural-language authoring with inspectable mechanics

The world agent is the normal bridge from player or creator intent to supported world artifacts. A creator should be able to say “Make blind creatures that sense only by touch,” inspect a plain-English proposal, select meaningful tradeoffs, and receive a usable supported result without hand-editing schemas or scripts.

The agent discovers permitted existing constructs, proposes sensible defaults, identifies missing host capabilities, authors the smallest dependency-closed change, invokes validation, and explains what was actually installed. It asks about consequential ambiguity—such as whether known locations remain remembered—not internal table names or routine serialization choices. It does not silently reduce “touch only” to ordinary vision with a darker screen.

The same authorized artifact can be inspected or edited technically. Chat, forms, and raw editing are views into the same versioned draft/validation/activation path, not separate rule authorities. Natural language abstracts technical labor, **not** permissions, costs, uncertainty, or evidence of success.

Detailed workflow and presentation belong to [World agent and workshop](../archive/03-design-proposals/world-agent-and-workshop.md) and [UI design](ui-design-brief.md). The world agent is an authoring/control surface; it is not the per-tick execution engine and is not automatically an omniscient NPC mind.

## 10. The practical foundation

The initial architecture should enable a small number of substantially different cases without modifying generic infrastructure for each one:

- Preserve the existing human wilderness physiology and actions through default-module adapters.
- Add a non-human charge or lunar-reserve mechanic, with a real replenishment action, scoped context, and a meter only when appropriate.
- Express current vision and hearing through sense descriptors, then add one non-visual sense using an already supported query primitive.
- Expose registered action metadata to player discovery, NPC suggestions, and agency resolution without duplicating admission logic.
- Capture the installed module versions and their authoritative state in current-format saves.

These are architectural proof cases, not mandatory new launch content. A full magic system, custom controller editor, general scripting runtime, and marketplace do not block the first proof.

The [extensibility roadmap](extensibility-roadmap.md) sequences these capabilities without becoming a second task tracker. [Worked examples](extensible-world-examples.md) anchor ambitious future behavior and identify the prerequisites for each example; they are not additional launch commitments.

Retain the current native update order while extracting interfaces. Changing every subsystem to simultaneous start-of-step evaluation is a separate behavior change requiring dedicated evidence, not a harmless module refactor.

## 11. Ownership

This document owns the conceptual engine/world boundary and the extension decision procedure. It does not own all subsystem contracts.

| Owner                                                                                                                   | Responsibility                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [World-module runtime](../archive/07-technical-architecture/world-module-runtime.md)                                    | Shared registration, composition, interfaces, resource contracts, and cross-subsystem lifecycle requirements               |
| [Declarations](../archive/07-technical-architecture/declarations-and-evolution.md)                                      | Mechanical property meaning, G0–G3, admission, active-definition/version lifecycle, and state-owner contribution semantics |
| [Agency](agent-agency.md) and its runtime contract                                                                      | Decision composition, intentions, physical plans, and actor-side invention continuation                                    |
| [EPR](events-perception-and-reactions.md) and sensory design                                                            | Stimulus scope, perception identity, sensory fidelity, episodes, and reaction intake                                       |
| [Memory](memory-architecture.md), [Narration](narration-and-conversations.md)                                           | Their respective default behavior, data, privacy, and presentation contracts                                               |
| [Save/load](save-and-load.md), data, performance, and governance owners                                                 | Existing operational, permission, integrity, and measurement boundaries                                                    |
| [EWF tracker](maintainers/extensible-world-foundation.md)                                                               | Missing common foundation and integration demonstrations only; existing subsystem task IDs remain authoritative            |
| [Extensibility roadmap](extensibility-roadmap.md)                                                                       | Capability sequence and evidence gates, not task bodies or progress status                                                 |
| [Worked examples](extensible-world-examples.md)                                                                         | Illustrative target behaviors and cross-subsystem failure cases, not competing specifications                              |
| [World agent and workshop](../archive/03-design-proposals/world-agent-and-workshop.md) / [UI brief](ui-design-brief.md) | Natural-language authoring workflow, review decisions, and progressive technical inspection                                |

The active no-legacy-development-save policy remains in force. It does not remove same-version integrity or the separate requirement that a live definition change preserve a coherent running world.
