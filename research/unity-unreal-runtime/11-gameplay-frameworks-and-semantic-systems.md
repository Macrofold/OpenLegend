# Gameplay frameworks, authored rules, and semantic systems

Research snapshot: **23 October 2026**. Engine baseline: Unreal Engine 5.8 and Unity 6.6. This chapter describes mechanisms and their limits; it does not propose an OpenLegend gameplay architecture. The [OpenLegend context and coverage map](00-openlegend-context-and-coverage.md) distinguishes existing behavior from intended systems.

## What this part of the engine actually supplies

An engine's gameplay framework connects objects, execution, state, authoring, and network authority. It does not determine what those states mean in a particular world. A floating-point attribute can represent hunger, an effect can alter it, and an ability can consume a resource. Whether that constitutes eating, nutrition, ownership, a witnessed theft, or a remembered obligation depends on additional authored rules and their execution.

This distinction matters for OpenLegend's intended needs, injuries, relationships, agreements, ecology, invention, and narrative systems. The useful comparison is between explicit mechanisms: lifecycle ownership, conditional activation, interruption, shared definitions, mutable instances, authority, and history. Similar feature names do not establish equivalent world behavior.

## 1. Framework ownership and lifetimes

Unreal separates several ownership scopes. `GameInstance` spans level changes within a running game instance and is not replicated. `GameMode` owns server-side rules for a level; `GameState` and `PlayerState` expose replicated state. Controllers represent control, while Pawns represent controllable world bodies; Character adds a more specialized character framework. The lifetime of any one of these objects is distinct from disk persistence. A process-lifetime object surviving travel does not demonstrate recovery after process loss. [G01]

Unity's `MonoBehaviour` connects a script instance to a GameObject and engine lifecycle callbacks. The component supplies a place for initialization, per-frame behavior, events, and coroutine management; it does not prescribe a universal game-rules manager, controller hierarchy, or authoritative world schema. Entities provides another execution/data model, examined in [data, concurrency, and memory](05-data-concurrency-memory.md). Treating every Unity system as a MonoBehaviour update loop would omit that major alternative. [G02]

**Comparison.** Unreal's named framework classes encode more common multiplayer-game roles. Unity's component model leaves more of that organization to the application and packages. Neither object hierarchy, by itself, specifies the ordering of a durable world transaction, the knowledge available to an AI participant, or the recovery of a partially completed activity. Those are separate questions from which object currently owns a callback.

## 2. Unreal Gameplay Ability System: execution is a lifecycle

The Gameplay Ability System (GAS) combines abilities, attributes, effects, tasks, and tags. An ability is an executable activity with activation and termination behavior, rather than merely a function that changes a number. Its owner interacts with it through an Ability System Component. [G03]

The current ability documentation distinguishes the following operations:

| Operation | Documented meaning |
| --- | --- |
| Grant/revoke | Server-authorized availability of an ability; distinct from starting an execution. |
| Check activation | Ask whether current conditions allow activation. |
| Try activation | Perform the availability check and activate when allowed. |
| Commit | Apply costs and cooldowns when the ability calls the commit operation. |
| Cancel | Request interruption; the ability can reject cancellation. |
| End | Terminate execution and release its active/blocking state. |

Abilities ordinarily launch asynchronous tasks and respond to delegates rather than put their primary work in an ability tick. A missing normal `EndAbility` call can leave the framework believing an ability remains active indefinitely. Cancellation has a cleanup path; it is not synonymous with silently abandoning a callback. Local-predicted, local-only, server-initiated, and server-only execution policies distinguish immediate response from authority. Local prediction remains subject to server correction. [G04]

Ability Tasks provide asynchronous operations such as waiting for events or animation-related progress. They communicate through delegates/output pins and end themselves or when their owning ability ends. Tasks are not directly replicated as independent objects; synchronization uses the surrounding ability and replicated inputs/state. Thus, asynchronous composition, object replication, and authoritative execution are three different mechanisms. [G05]

**Interpretation.** The important lifecycle distinction is between eligibility, execution, resource commitment, cancellation, and completion. A successful eligibility check is an observation at one moment. It is not evidence that a later target still exists, a shared resource remains available, or an irreversible effect has already been durably recorded. GAS documents a game-runtime lifecycle, not a database transaction protocol. The [networking and persistence chapter](07-networking-persistence-and-replay.md) examines the separate recovery and replication questions.

## 3. Effects, attributes, and the difference between definition and instance

Gameplay Effects use shared asset definitions with runtime specifications carrying application-specific information. Instant effects execute without becoming lasting entries in the active-effects container; duration and infinite effects remain active, and periodic effects execute at configured intervals. Modifiers, custom executions, stacking, and Gameplay Cues provide different kinds of behavior. Cues communicate cosmetic feedback rather than defining the authoritative numeric result. Effect components belong to the shared definition, so they cannot be treated as independent mutable state for every application. [G06]

Attributes have base and current floating-point values. Attribute Sets connect them to the Ability System Component and supply behavior such as validation and reactions to effects. The current documentation explicitly says the metadata table's minimum and maximum columns do not automatically clamp attributes. Attribute replication also requires the relevant property/callback setup. A field named `Health` therefore does not, merely by existing, define death, injury, recovery, or replication semantics. [G07]

These facilities separate several categories that a feature checklist can blur:

| Category | Example of the distinction |
| --- | --- |
| Definition | A reusable description of an effect or ability. |
| Instance | One application, its source/target, remaining duration, and mutable execution data. |
| Derived value | A current attribute calculated in the presence of active modifiers. |
| Persistent consequence | A change that remains after the temporary effect or execution ends. |
| Presentation | A sound, animation, particle effect, or UI response describing the result. |

The table is an analytical decomposition, not an assertion that a single engine object stores every row. It explains why ending a visible effect, expiring an attribute modifier, undoing an action, and restoring a saved world are not interchangeable operations.

## 4. Tags and queries: compact predicates with explicit matching rules

Unreal Gameplay Tags are registered hierarchical labels. They can be defined through configuration, tables, or C++, attached to objects, and tested through containers or composed queries. Query expressions combine any/all/none conditions, including nested expressions. Empty-set semantics matter: an empty all-condition succeeds, while a search for any matching tag has no match. Tags are useful classification and predicate infrastructure; their names do not supply an underlying physical or social model. [G08]

The concrete matching API remains important. `FGameplayTag` and the container/library APIs distinguish matching that includes parent tags from exact matching. The presence of a hierarchy does not mean every consumer expands it in the same way. A predicate over labels also does not establish when the labels were measured, who is entitled to observe them, or how conflicting updates are ordered. [G09]

For this research, a tag-based rule is consequently classified by its consumer and lifecycle, rather than described as a universal reasoning system. A tag may gate an ability, select a conversation branch, or categorize content. These operations share vocabulary infrastructure but need not share authority, persistence, or knowledge boundaries.

## 5. Shared content definitions and runtime graphs

### Unreal Data Registries

Data Registries expose typed, read-only data through registered identifiers, ordered sources, caches, and synchronous or asynchronous access. Source ordering determines lookup precedence; metadata sources can discover or register underlying assets. The documentation distinguishes this content lookup use from mutable session progress, for which it points to saving mechanisms. A registry is therefore not a transactional inventory, evolving relationship ledger, or complete history merely because its data is globally accessible. [G10]

This explains a subtle cost distinction: locating a definition, loading its dependencies, constructing a mutable instance, and updating durable state are different operations. A cache hit on the definition does not remove the later work. Conversely, duplicating an immutable definition for every entity can add costs that the definition/instance separation was intended to avoid.

### Unity ScriptableObjects and serialization

A ScriptableObject is a Unity object that can exist as a data asset independently of a GameObject component. Multiple components can reference the same asset, reducing duplicate copies of shared authoring data. It can also carry behavior; it is not restricted to passive records. Sharing a definition is the central mechanism here. It does not establish a durable runtime-save protocol or make all users of the asset independent mutable copies. [G11]

Unity's ordinary serialization of custom classes is by value. `SerializeReference` supports managed reference identity, polymorphism, nulls, and graph structures within a host object's serialized data. The IDs and shared references are scoped to that host; assigning the same managed object to two hosts does not preserve a single shared instance across their serialized forms. Cloning the host also clones its managed references. This has additional storage/load/save cost compared with inline values. References to separate Unity objects, including ScriptableObjects, have different sharing semantics. [G12]

Unity 6.6's serialization rules operate on eligible fields rather than arbitrary C# properties. The current rules include explicitly attributed dictionary fields; the older blanket statement that Unity cannot serialize dictionaries is no longer a correct description of this baseline. The exact dictionary restrictions and persistence implications are covered in [chapter 07](07-networking-persistence-and-replay.md). [G13]

**Comparison.** Unreal registries and Unity ScriptableObjects both help organize reusable authored data, but they are not direct equivalents: a registry adds a typed lookup/source/cache system, while a ScriptableObject is an asset/object representation. Similarly, a serialized reference graph is not an automatically versioned database of world identities. The comparison must preserve those different responsibilities.

## 6. Feature composition and conversation infrastructure

Game Features packages functionality into plugins and activates feature actions. Documented actions include adding components to opted-in Actor subclasses, adding registries or registry sources, and adding World Partition content. Component injection can be scoped to client, server, or both, and receivers register with the framework component manager. This supplies controlled composition and lifecycle integration, rather than requiring every feature to be embedded into a single base Actor. [G14]

The associated **Modular Gameplay plugin is still marked Beta** in the current 5.8 plugin reference. This status is recorded separately from the maturity of GAS or the engine release as a whole. The documentation describes plugin composition; it does not establish a security sandbox for arbitrary untrusted world-author code. That last statement is an evidence boundary, not a claim that extensibility is impossible. [G15]

Unreal's **Common Conversation is Experimental**. Its current API separates an asset containing conversation graphs/participants from active conversation instances. Requirements gate branches, choices describe available options, participant components connect actors, and side-effect nodes run after tasks. Its conversation memory stores arbitrary structs in conversation contexts. This is useful authored-dialogue infrastructure, but that API alone does not demonstrate a lifetime model of autobiographical memory, private beliefs, relationships, or freely generated dialogue. [G16, G17]

Unity Behavior and Unreal StateTree/Behavior Trees provide additional authored decision/execution graphs, examined in [chapter 03](03-ai-navigation-and-crowds.md). A conversation tree, behavior tree, animation graph, and effect graph all use graph-shaped authoring, but their state, timing, cancellation, and output contracts differ. Their common visual shape is not evidence of interchangeable runtime semantics.

## 7. Relationship to OpenLegend's intended world systems

The existing [engine/world boundary](../../docs/engine-and-world-boundaries.md), [repertoire coverage](../../docs/repertoires/coverage.md), and [needs-design register](../../docs/maintainers/needs-design.md) identify a much wider world than a conventional ability-and-animation example. The following table records how the researched mechanisms relate to those areas. It is a **coverage and evidence map**, not a list of proposed implementations.

| Existing OpenLegend area of interest | Engine mechanisms examined | What those mechanisms do not, by themselves, establish |
| --- | --- | --- |
| Needs, stamina, health, injuries, illness | Attributes, effects, timers, execution graphs, physical contacts | A validated physiological model; the causal meaning of symptoms, treatment, or death. |
| Inventory, crafting, tools, materials, invention | Shared definitions, typed registries, components, activation/commit lifecycles, import pipelines | Conservation, ownership transfer, recipe semantics, or atomic durable exchange. |
| Agreements, relationships, groups, institutions, economy | Tags, predicates, authority, reservations, dialogue graphs, persistence | A social rule system, mutually understood obligations, trust, prices, or historical evidence. |
| Memory, perception, knowledge, narration | Stimulus state, graph context, observable events, reference identity, generated-language research | Who witnessed an event, what they inferred, what they later remember, or whether narration is true. |
| Ecology, animals, generations, growth | Population data, simulation scheduling, navigation, spatial queries, LOD, procedural content | Population balance, inheritance, reproduction, accumulated ecological consequences, or offscreen causal continuity. |
| Weather, heat, fire, fluids, destruction | Physics, fields, rendering, particles, material systems, procedural world generation | Agreement between visible phenomena and mechanically meaningful world state. |
| World authoring and extensibility | Registries, feature plugins, data assets, graph authoring, serialization | Stable authored-rule compatibility, trust isolation, validation of arbitrary rules, or save migration. |

These limits are deliberately narrower than saying an engine “cannot” support a system. The documentation establishes reusable infrastructure. Application code, external systems, content, and validation can supply further meaning. This study does not infer that work is already included or prescribe what OpenLegend should add.

## 8. Cross-system findings

Several observations recur across this chapter and the rest of the collection:

1. **Ownership is plural.** Object lifetime, authority over a change, ownership of a resource, and who can know the result are distinct. An engine's use of the word “owner” needs its specific context.
2. **A successful asynchronous operation still has an identity and a lifetime.** A late response can refer to a previous ability execution, an unloaded actor, or a replaced content definition. The task/feature/streaming mechanisms answer different parts of that problem.
3. **Reusing definitions is different from sharing mutable state.** Data registries, ScriptableObjects, effect definitions, and graph assets make this difference concrete. Shared state can alter behavior, while shared immutable descriptions need not.
4. **Prediction is scoped.** Ability prediction, movement prediction, animation trajectories, and anticipated world events have different consumers and correction mechanisms. Evidence for one is not evidence for all.
5. **An engine event is not automatically a durable historical fact.** Callbacks and presentation cues describe runtime activity; persistence, replay, provenance, and observer-specific memory require their own evidence.

These are comparisons of the documented mechanisms and OpenLegend's existing stated boundaries. They make no adoption decision and introduce no new runtime contract.

## Source provenance and inspection record

All entries were inspected on **23 October 2026**. Unreal entries resolve to current **5.8** documentation/API pages; Unity entries use explicit **6000.6** paths. They describe the mechanisms above, not measured OpenLegend performance. The older sample-game links embedded in some Epic pages were not used as evidence of current sample compatibility.

| ID | Primary source | Evidence used |
| --- | --- | --- |
| G01 | [Epic: Gameplay Framework](https://dev.epicgames.com/documentation/unreal-engine/gameplay-framework-in-unreal-engine) | Ownership roles and process/level lifetimes. |
| G02 | [Unity 6.6: MonoBehaviour components](https://docs.unity3d.com/6000.6/Documentation/Manual/class-MonoBehaviour.html) | Component instances and lifecycle hooks. |
| G03 | [Epic: Gameplay Ability System](https://dev.epicgames.com/documentation/unreal-engine/gameplay-ability-system-for-unreal-engine) | Framework responsibilities and constituent systems. |
| G04 | [Epic: Gameplay Abilities](https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine) | Grant, activation, commitment, cancellation, termination, and network execution policy. |
| G05 | [Epic: Ability Tasks](https://dev.epicgames.com/documentation/unreal-engine/gameplay-ability-tasks-in-unreal-engine) | Asynchronous work, lifetime, and replication boundary. |
| G06 | [Epic: Gameplay Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine) | Definition/specification separation, effect duration, modifiers, cues, shared components. |
| G07 | [Epic: Attributes and Attribute Sets](https://dev.epicgames.com/documentation/unreal-engine/gameplay-attributes-and-attribute-sets-for-the-gameplay-ability-system-in-unreal-engine) | Base/current values, explicit clamping and replication behavior. |
| G08 | [Epic: Gameplay Tags](https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-tags-in-unreal-engine) | Registration, hierarchy, composition, empty-query semantics. |
| G09 | [Epic: FGameplayTag API](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/GameplayTags/FGameplayTag) and [Blueprint tag library](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/GameplayTags/UBlueprintGameplayTagLibrary) | Specific matching operations and parent-tag expansion. |
| G10 | [Epic: Data Registries](https://dev.epicgames.com/documentation/en-us/unreal-engine/data-registries-in-unreal-engine) | Typed read-only lookup, source precedence, caches and mutable-progress boundary. |
| G11 | [Unity 6.6: ScriptableObject data assets](https://docs.unity3d.com/6000.6/Documentation/Manual/class-ScriptableObject.html) | Shared standalone asset definitions. |
| G12 | [Unity 6.6: SerializeReference](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/SerializeReference.html) | Managed graph identity, host scope, cloning, cost. |
| G13 | [Unity 6.6: Serialization rules](https://docs.unity3d.com/6000.6/Documentation/Manual/script-serialization-rules.html) | Current field/type rules, including dictionary support. |
| G14 | [Epic: Game Features and Modular Gameplay](https://dev.epicgames.com/documentation/unreal-engine/game-features-and-modular-gameplay-in-unreal-engine) | Plugin actions, opt-in component injection, side selection, content registration. |
| G15 | [Epic: Modular Gameplay plugin](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/ModularGameplay) | Current Beta designation. |
| G16 | [Epic: Common Conversation plugin](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/CommonConversation) | Current Experimental designation and authored graph scope. |
| G17 | [Epic: CommonConversationRuntime API](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/CommonConversationRuntime?lang=en-US) | Definition/instance split, participant and requirement/side-effect types. |
