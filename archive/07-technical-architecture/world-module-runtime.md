# World-module runtime contract

For end-to-end authoring, use [Composition and live revision](../../docs/invention-composition.md). The [relationship graph](../../docs/invention-graph.md) projects exact references and enforced bindings for agents and UI; it is not another module manifest. The native World Agent reaches these services through the [shared tool contract](../../docs/invention-workshop-tools.md) and [MCP adapter](../../docs/world-agent-mcp.md).

**Status: proposed implementation contract.** [Engine and world boundaries](../../docs/engine-and-world-boundaries.md) owns the architectural direction. [EWF](../../docs/maintainers/extensible-world-foundation.md) owns delivery of the missing common foundation. This contract adds integration requirements; it does not replace the existing AG, EPR, INV, CR, NC, PF, production-data, or SL implementations and trackers.

## 1. Purpose and initial scope

Make a newly supported attribute, organism, sense, action family, or controller policy fit a common world-composition boundary instead of requiring unrelated changes throughout the codebase.

Begin with reviewed native implementations, validated definitions, one world writer, the existing stores, and a small resolved world manifest. No downloaded executable plugins, arbitrary JavaScript, new service, distributed broker, new graphics engine, or wholesale ECS conversion is required.

Retain the working kernel, native simulation order, actor representation, durable conversations/history, save/load, and provider adapters while replacing particular hard-coded assumptions behind tested interfaces. Extract the default wilderness rules one family at a time.

## 2. Two catalogs with different authority

### 2.1 Host implementation catalog

The host contains reviewed implementations and codecs. Examples are a bounded reservoir evaluator, the existing wilderness body rules, the current sight query, an admitted recipe family, and a controller adapter.

The catalog is compiled/registered by trusted application code. A world artifact may select a compatible entry; it may not supply an import path, function body, SQL statement, filesystem access, or a replacement validator. Keep module-level native functions stateless or give them explicitly owned, serializable state. A function-local cache cannot become hidden simulation authority.

Each host entry exposes a narrow typed service-specific interface. A common descriptor records identity, interface version, accepted schema, required host capabilities, allowed state/effect domains, and execution category. The concrete interfaces remain different: a sense evaluator is not an action executor and a meter formatter is not a world writer.

A security grant is not an entity capability. `canSpeak` or `hasThermalSense` describes game behavior; permission to read another principal's private records or install a module is granted by the application. One must never imply the other.

Effective access is the intersection of the host's supported ceiling, the installed world's policy, the initiating principal's grants, and the specific family/invocation contract. A declaration's requested permissions describe requirements, not granted access. Validate that intersection before execution and again before consequential publication when its inputs can change. Internal adjudication may inspect more authoritative state than an actor may know, but the feedback projection must not disclose it.

### 2.2 World definition and installation manifest

Definitions are immutable versioned data admitted through the existing declaration boundary. A world manifest selects exact module/definition versions and compatible host interfaces. It is the installed configuration, not the host's catalog and not another independent invention registry.

Use one typed manifest in current world authority, provisionally `WorldState.moduleManifest`, linked to existing definition/version identities. Do not also maintain a separately writable manifest in a provider workspace or UI profile. The minimal first manifest may reference reviewed packaged definitions; dynamic admission later uses the same identity and activation contract.

Logical structure:

```text
WorldModuleManifest
  revision
  definitions: exact definition/version/digest references
  modules: exact module version + definition references + resolved dependencies
  bindings: selected implementations for explicitly replaceable policies
  stateOwnerBindings: canonical component/attribute family -> exactly one owner
  worldPolicyRef
```

Host registrations contain functions; the manifest contains only serializable references and validated configuration. Same-version saves capture the manifest and the required definition bytes or durable pinned artifacts needed to resolve it.

A component definition, action definition, sense definition, and module bundle need not share one giant payload schema. Reuse common identity and authority metadata, then validate each payload through its registered kind.

## 3. Definition envelope and composition

The existing [declaration contract](declarations-and-evolution.md#definition-and-property-contracts) remains the owner of property types, units, unknown values, admission, and G0–G3. The following is the additional minimum integration information required for a runnable module; it is not an alternative declaration format:

| Information | Required meaning |
| --- | --- |
| Identity | Stable namespace/name, immutable version and exact content digest; display names never resolve authority |
| Implementation binding | Registered host kind and interface version, or a future qualified G2 artifact reference |
| Dependencies | Exact required definitions/interfaces, optional supported integrations, and incompatibilities |
| State ownership | Which typed state the module owns; authoritative versus derived values |
| Reads and effects | Allowed query families, scopes, contribution/effect families, and required target bindings |
| Execution | Native phase, explicit action, reaction consumer, or bounded asynchronous proposal path |
| Invalidation | Relevant source, attribute, definition, region, policy, knowledge, or actor-intent changes |
| Budget | Per-invocation and aggregate work, fan-out, pending work, context, and storage bounds appropriate to the service |
| Lifecycle | Initialization, active-work compatibility, disabling/removal, save capture, and reconstruction rules |
| Projection | Safe descriptions, action/inspection metadata, and optional presentation references |

Schemas reject unknown executable fields, invalid references, duplicate owners, non-finite numbers, invalid units, and unbounded collections. Use namespace-safe lookups and reject inherited/prototype keys. Do not silently coerce unknown definition IDs into strings with behavior.

Resolve dependencies before activation. A missing optional integration is supported only when the module declares a behaviorally valid fallback. A missing required interface is an explicit unsupported capability, not permission to generate code at runtime.

Dependencies and read instrumentation are complementary. Runtime instrumentation can detect an undeclared read; it cannot prove that a necessary input was omitted. Use family-owned mandatory dependencies, restricted query interfaces, and independent scenario tests.

### Composable outputs

A definition can refer to another admitted definition where the consuming family accepts its capabilities, rights, and version. A material is not invalid merely because it was previously invented. Conversely, removing the current `definition.recipeId` rejection globally would be unsafe: every family must validate appropriate structural properties, resources, recursive dependencies, and supported composition.

INV-3 owns generalizing the finite recipe envelope and adding a real non-weapon family. EWF supplies shared metadata/state contracts; it does not write another recipe compiler or admission service.

### Reusable constructs and specialization

This section owns the shared technical contract for reusable constructs. INV owns their authoring, admission, versioning, and distribution lifecycle. Reuse the existing definition identity/envelope; do not establish a second template registry with conflicting versions.

Distinguish these concepts rather than forcing every artifact into a nested hierarchy:

| Concept | Meaning | Example |
| --- | --- | --- |
| Host primitive/evaluator | Reviewed computation or authority interface supplied by the runtime | Bounded region query, reservoir contribution, effect-instance admission |
| Reusable definition | One versioned meaning using supported interfaces | A resource, contact sense, target predicate, or injury effect |
| Parameterized construct | A definition with typed, deliberate unbound ports | Select targets, then apply an effect using a selected lifetime policy |
| Specialization | A derived definition binding some or all exposed ports | Bind a reusable interaction to warmth, leaving range configurable |
| Composition | A definition wiring several compatible constructs | A spell with selection, cost, resistance, effect, and termination rules |
| Module/subsystem | A coherent installation and state-ownership boundary | Alien physiology plus compatible senses and control policy |
| Pack | Immutable distribution inventory and eligible artifact payload | A library of predicates, spell templates, organisms, and art |
| Runtime invocation/instance | A particular accepted execution or ongoing state | One casting, one affected target, one active effect instance |

These concepts are related by references, not by mandatory object-oriented inheritance. A small effect can be distributed independently and referenced by many unrelated worlds. A module need not own all implementations it uses. A pack does not become an executing process.

#### Deliberate ports, not arbitrary object patching

A construct exposes a finite named set of parameter or reference ports. Each port records:

- Its semantic interface and version, value type, units if applicable, bounds, and required/optional status.
- The target roles and state/effect domains its accepted values may use.
- Whether binding occurs at authoring, world installation, invocation, or a supported runtime update.
- Whether a default exists and what happens when it remains unbound.
- Dependencies and authority requirements contributed by the binding.

Examples are `selector`, `recipientPredicate`, `cost`, `effect`, and `lifetime`. These are illustrative names, not reserved universal fields. Use different construct interfaces when semantics genuinely differ.

A creator may expose only one port on a specialization and fix the others. A published `ResonantPulse` might fix its delivery and resource cost while exposing a compatible sensory or bodily effect. Another creator can bind that port without copying the entire spell. A further specialization may keep a bounded magnitude open for invocation. An invocation cannot replace the definition's target policy or its effect implementation unless that is an explicitly admitted dynamic choice.

Allow partially bound artifacts to be saved and distributed as templates. They are **not executable** until all required installation/invocation bindings are satisfied. Missing a required effect is not equivalent to a successful no-op. Optional absence must be a declared semantic alternative, such as an explicitly cost-free action allowed by that world.

Do not allow arbitrary deep JSON patches to substitute internal implementation details. Expose stable ports; for changes outside those ports, author a new reviewed version or a permitted fork. Avoid default inheritance behavior that changes when an upstream package publishes a new release.

#### Substitution compatibility

A candidate binding must satisfy more than matching JSON shape. Check:

1. Nominal semantic interface and supported version, parameter units/ranges, target roles, and expected result shape.
2. Actual permitted reads, write/effect domains, required host capabilities, and disclosure classification.
3. Lifecycle obligations, including whether it is instantaneous, timed, sustained, or awaits a supported condition.
4. Resource rules, maximum targets, multiplicity, pending work, and aggregate fan-out.
5. Definition dependencies, modification/use rights, world premise, and current installation policy.

A slot accepting a scalar bodily contribution does not automatically accept a goal-edit effect because both return `Outcome`. To enable that substitution, the outer construct must explicitly accept the broader interface and its target-grant requirements, followed by revalidation. Casting code need not special-case `compel`, but a generic interface must not hide the greater authority needed by mental effects.

Port replacement can increase required permissions or cost; it can never silently acquire them. Installation fails, or the author receives a new consequential review, when the derived artifact exceeds its prior accepted envelope.

#### Compilation and execution closure

A composition is data selecting existing semantics, not unrestricted code. Its supported compiler performs these bounded steps:

1. Resolve exact dependencies and authorized ports; detect unresolved required inputs and invalid cycles.
2. Type-check bindings and result references, including resource identity and evidence scope—not just names or units.
3. Compute a conservative read/effect/capability summary from trusted family contracts. Derive state ownership and invalidation dependencies, including membership of target queries.
4. Build a bounded execution representation with explicitly ordered stages and declared failure/cancellation behavior. Opaque reviewed evaluators retain their declared interfaces; do not infer them from prose.
5. Bound expansion, nesting, invocations, candidates, accepted targets, descendants, retained state, and cost before activating the artifact.
6. Run the family's independent positive/negative scenarios; attach evidence to the exact candidate digest.
7. Hand the candidate to the existing INV approval/activation path. Compilation is not installation, learning, or execution.

A reference graph can share a subdefinition without copying its state. The default runtime state of an invoked construct belongs to that invocation, not to its reusable definition. Shared state is explicit: a shared cooldown reservoir is a separate named authority, whereas two instances of the same spell do not accidentally share a timer.

Separate four dependency types: definition references, invocation/result order, invalidation/read dependencies, and distribution/rights dependencies. An acyclic definition graph does not prove that runtime feedback is bounded. A recurring construct needs an explicit supported temporal loop with progress, cancellation, and an aggregate limit; zero-time recursion is rejected. Do not make a graph editor or general higher-order programming language a prerequisite for the first two-node composition.

### Cross-world portability and semantic adapters

Portability means a destination can validate and instantiate a compatible artifact, not that any pack runs in any world unchanged. A library may expose semantic ports rather than assuming `health`, `mana`, human anatomy, or Euclidean visibility exist everywhere.

A destination binding must account for required host interfaces, the exact definition closure, target/body compatibility, disclosure rules, clock interpretation, resource types, world premise, and use/modification rights. A coarse electromagnetic evaluator cannot silently replace a required physical field solver. Unsupported required capabilities remain blockers.

An adapter is itself a versioned, validated definition or reviewed implementation. Converting a quantity between units does not prove it is the same resource. Binding a magical cost to an electrical battery requires an explicit resource-conversion or cost policy, with ratios, bounds, ownership, and loss/source semantics. It is not a label substitution.

Public explanations should distinguish **usable unchanged**, **requires binding**, **requires an explicit adaptation**, **forbidden in this world**, and **unsupported by this host**. Preserve the existing INV outcome vocabulary at the service boundary; these are explanation categories, not a competing job-state machine.

Published artifacts pin dependencies. Updates do not silently affect installed worlds or partially specialized descendants. Maintain derivation/credit and declared modification rights across specialization and forks, using the existing pack governance. Export definition/configuration/assets and permitted validation examples—not live goals, private inspiration, memories, credentials, or provider sessions. Compatibility metadata is not proof of complete behavior in an arbitrary destination; run the relevant destination scenarios.

A pack may contain a compositional framework with unbound ports. Its inventory must label it as a template rather than advertise a ready-to-run ability. Preserve the distinction between the complete authorized inventory and the distributable payload; do not conceal blocked dependencies.

## 4. Typed state and attributes

### 4.1 One representation per authoritative value

Provide registered state definitions with schema, units/scale, bounds, applicability, owner, initialization, and disclosure metadata. Start with the types consumed by the first useful examples rather than a universal schema language.

Numeric reservoirs, dimensional quantities, categorical traits, proficiencies, and narrative dispositions are distinct families. Do not turn every concept into a 0–100 bar or a numeric stat check. A skill may refer to knowledge and a supported proficiency rule; no universal skill mechanic is introduced merely to support AG.

New optional state can live in a bounded, schema-validated namespaced component map. Existing hot native fields may remain authoritative behind a typed adapter while they are converted. Do not copy their values into that map and dual-write indefinitely. Declare exactly which storage provider owns each definition at each cutover; any convenience projection is read-only.

A module cannot replace an existing state owner by installing a same-named field. Name similarity, matching units, and an embedding match do not prove semantic equivalence. Explicit aliases are metadata under the owning definition, not write access.

### 4.2 Default physiology as a module

Extract the current metabolism/body parameters and policies behind registered native implementations. Preserve current numerical values and stage order initially. In particular, food consumption, food seeking, work interruption, sleep eligibility, health protection, and semantic urgency use different thresholds and must not be collapsed into one generic threshold.

The body module owns its lifecycle policy. The runtime owns valid identities, receipts, effect admission, and installed-policy selection. Current player collapse versus NPC death is a default policy, not an immutable meaning of `controller='player'`.

A charge-based organism need not carry fake fullness, human fatigue, sleep state, or autobiographical text solely to satisfy generic infrastructure. Its declared capabilities determine what is initialized. Current wilderness actors still receive their actual supported defaults.

### 4.3 Concern and response metadata

A usable need supplies more than a meter. Its module can project a bounded actor-permitted concern such as severity band, current effect, and supported satisfaction affordances. Native protection and compatible controllers consume that projection without recognizing a hard-coded need name.

An affordance reference identifies an installed action or a permitted goal cue; it is not permission to perform the action or a guarantee it will succeed. Action availability remains native. A phrase such as “moonlight restores me” cannot invent moonlight physics or reveal a hidden location.

Threshold episode/detection/notification behavior stays in EPR04. The attribute module supplies owning values and policies through that interface. It does not allocate a second reminder queue or emit a paid thought on each decrement.

## 5. Effects, ownership, and deterministic composition

Use the existing centralized semantic mutation principle. A module proposes typed effects or contributions to an owning native service; it never obtains a generic `set(path, value)` API into the whole world. Private `WorldChanges` operations remain a persistence implementation detail, not a mod API.

Required validation covers target identity, capabilities, current policy and definition versions, applicable writer, source/resource claims, units/bounds, and the relevant expected revision. Multiple independently valid proposals still compete for finite resources.

Owner rules define combination semantics explicitly: addition, multiplication, priority, saturation, exclusive replacement, or a supported dependency phase. Clamp-after-sum versus clamp-per-effect can differ and must not be changed accidentally. Coupled debit and credit commit under the same transfer identity.

A world can admit an explicit resource source, including a fictional magical source, when the host supports it and the world's policy permits it. That never grants new real spending, compute, account permission, or arbitrary storage authority. Ordinary action/resource conservation remains unchanged in the wilderness preset.

Native adapters first preserve the current sequential kernel behavior. The declaration design's broader start-of-step contribution model is a future compositional phase contract, not proof that every current transition already evaluates that way. Introduce new contribution phases with an explicit order and tests; do not rewrite tick semantics as a side effect of moving functions.

Same-step cycles require an explicitly supported bounded solver or rejection. Delayed feedback can read the previous committed phase and produce the next phase's contributions. Arbitrary recursive event callbacks and unbounded zero-time rescheduling are not admitted.

### Active effect lifecycle

An effect description and an active effect instance are separate. Stateful effects require explicit identity, ownership, and continuation data. Reuse the relevant native effect owner rather than adding a general arbitrary-world writer.

Do not assume every effect has a duration. A supported lifetime contract is a tagged choice:

| Form | Semantics | Required boundary |
| --- | --- | --- |
| Instant | One admitted transition | Exactly-once contribution; no fabricated active timer |
| Fixed interval | Active until a simulation-time deadline | Save the deadline and defined expiry operation |
| Sustained | Active while an admitted source/process maintains it | Interruption, depletion, source loss, pause, and revalidation rules |
| Until a supported condition | Ends when an authorized predicate is satisfied | Indexed dependencies, review/retention limit, unknown policy, and no hidden-state oracle |
| Persistent until explicit removal | Remains until a defined removal operation | Explicit permission, storage budget, and retirement/save support; never inferred from missing duration |

These are interface forms a host may implement over time, not a mandate that all be delivered first. A lifetime policy can be reusable content bound to a compatible effect; it is not a universal engine-owned `duration` field. The policy must actually know how to start, continue, and terminate that effect.

An active instance identifies its exact effect version, cause/invocation, relevant source and recipient, admitted parameters, current lifecycle state, stacking group, next supported review/deadline, and actual applied/ongoing contributions. Store only what continuation needs. Source/account authorization belongs to the authoritative binding, not to model-authored fields.

Define lifecycle events deliberately: application, rejection, refresh, escalation, suspension if supported, termination, expiry, dispel, source death/removal, target removal, and module retirement. Removing an effect subtracts or detaches **that effect's still-active contribution**, not a remembered snapshot of the target's entire pre-effect state. It cannot undo unrelated healing, spent resources, completed actions, or later choices.

Stacking is owned by the effect/target policy: independent, additive, exclusive, highest-priority, refresh, or other explicitly implemented combination. Recasting does not silently refresh every related effect. Tie-breaking and order are stable; shared stack keys are typed references, not attacker-chosen strings that can remove another effect.

### Selection, cost, resistance, and application are distinct stages

A reusable interaction may have stages for resolve target, establish eligibility, admit cost, check resistance, apply an effect, and continue/terminate. Its family declares their order and atomic groups. Do not create one mandatory spell execution order for all worlds.

Selection produces bounded candidates, not permission. Revalidate each affected recipient and result-specific authority at the application boundary. A selector that runs against hidden authoritative state must expose only permitted targets or an authorized outcome; its rejected-candidate count must not become an oracle for secret entities.

Define whether a cost is per invocation, per target, per successful application, or sustained per simulation time. Define cost on failure and whether multi-target admission is all-or-nothing or independently receipted. For instantaneous coupled changes, validate and commit the affected resource/effect group atomically. For duration and later stages, retain actual intermediate receipts; cancellation uses the family's existing semantics rather than rolling back history.

Area effects, chained targets, repeated pulses, and nested constructs multiply work. Bound the combined target and descendant count, not only each local query. Runtime output validation must reject an effect exceeding its advertised envelope even when its template compiled successfully.

The selected initial native order remains unchanged during extraction. More general concurrent body-resource arbitration and complex solver phases are later host capabilities, not implied by composing two action descriptions.

## 6. Senses and observation interfaces

### 6.1 Separate detector, projection, and intake

A sense definition binds a reviewed detector/query family to receiver/source interpretation and permitted evidence projection. EPR owns the resulting observation/episode/intake lifecycle. The sensory specification owns fidelity and recognition policy.

Logical service-specific information:

```text
SenseDefinition
  exact definition/implementation reference
  eligible receiver capabilities
  source/query family and bounded reach or relationship scope
  detector parameters
  supported evidence kinds and disclosure limits
  detail/recognition policy reference
  spatial and non-spatial invalidation dependencies
  failure/unknown policy
```

A query can return candidate entities, contacts, regions, fields, or approved relation endpoints. An observation may have an unknown source identity or location. A server-only event/source reference is not automatically a model-visible entity handle.

Do not encode the interface as `sense = sight | hearing` or as a mandatory known target plus coordinates. Keep a finite set of reviewed query/evidence families initially, selected by registered sense definitions. Adding a new query family is a host change; using an existing family with a new supported configuration need not be.

### 6.2 Detail and source interpretation

Detection, localization, classification, recognition, intelligibility, uncertainty, and temporal freshness are distinct. A family advertises which dimensions it supports. Visual near/far tiers and audible clarity levels can coexist without assuming they are the same scale.

Source response can resolve from sparse instance components, material/species definitions, compositions, or a declared derivation. A new sense must not require writing a zero-valued field to every entity. The existing unknown/not-applicable distinctions apply; an unmodeled electromagnetic response is not automatically proof of perfect invisibility.

Broad-phase candidate selection is not knowledge authorization. Preserve exact current sensing rules, event-time geometry, and the EPR privacy boundary after filtering. Hysteresis can stabilize an episode but cannot disclose live hidden state.

### 6.3 Initial implementations and future cases

Wrap current distance-based vision and radius/obstruction-based hearing without changing their rules. Add one different sense using an available primitive: a documented coarse contact/proximity query is sufficient for a tactile proof. It must not pretend to measure contact force or texture that the world does not model.

An electromagnetic example may later use authored signature plus distance/attenuation, labeled as a coarse game model. It is not a Maxwell solver. Unsupported propagation, arbitrary topology, or new field simulation requires an explicit host capability.

Do not make private mental content a default sensory source. A future telepathic family needs a separately authorized disclosure operation, compatible world policy, and the platform's current privacy grants. Installation of a sense never broadens those grants by itself.

## 7. Action families and agency integration

INV-3 owns the mechanical family registry and its action discovery/execution adapters. Bind those descriptors to this runtime's common definition/manifest contract instead of inventing another action registry.

A family should supply one source of truth for its parameter codec, eligibility/preview, target roles, work/resource rules, native execution and completion, cancellation/resumption support, actual effect projection, and safe presentation defaults. Player catalogues, NPC candidate builders, freeform resolution, and native plan steps consume those interfaces.

The public protocol may expose a bounded family invocation envelope with exact definition/version and validated parameters when implemented. The server supplies principal/actor authority. A family ID is never a capability token. Keep security/control operations separate from ordinary gameplay invocation.

Retain convenient typed wrappers for common actions where they improve developer ergonomics. They must delegate to the same family semantics; they cannot become parallel validators. A newly supported family must not require edits to every generic transport, prompt, and renderer switch.

AG owns optional operation lists, operational goals, native plan execution, result dependencies, and open action attempts. The initial one-physical-lane model remains. New attributes or senses provide inputs to agency; they do not implement separate goal stores or secretly dispatch commands.

Admission, starting, completing, and learning stay distinct. Generalization must not turn a queued multi-step plan into completed work or a declaration admission into an item grant. Current expression semantics and actual-impact receipts remain under NC.

## 8. Controller and context boundaries

A controller binding selects an installed policy/adapter for a compatible actor. Start with current player input, native animal behavior, and standard cognitive actor behavior. Do not immediately build a general brain editor or replace the provider abstraction.

Default context assembly accepts typed, scoped contributions from body/needs, senses, operational goals/plans, actual action results, knowledge, and private memory. Each contribution identifies the relevant revisions and whether it is required evidence or optional context. Enforce the existing global byte/token reservation, protected conversation evidence, and memory privacy rules.

Context contributors do not return arbitrary instructions with elevated priority. Generated descriptions remain untrusted data. The standard cognition adapter renders their useful meaning once; it must not grow a hard-coded paragraph for every new attribute or sense.

Controller outputs enter the AG admission boundary as proposals. An alternate controller cannot edit world state, change a host budget, impersonate a player, or publish another actor's mind. A future controller may use a different internal model while exposing compatible operations and lifecycle contracts. That requires explicit implementation; replacing a registry ID alone does not implement a hive mind.

Reflection that changes operational goals uses AG's typed mutation. Narrative goal mentions remain prose. Subjective relationship text remains distinct from objective facts and obligations; this foundation introduces no numerical relationship ladder.

A conscious hungry actor can remain eligible for AG's bounded deliberation when native action is inadequate. Preserve actual sleep/incapacity/capability checks and the current explicitly authorized one-time urgent response refresh. This is not permission for automatic retries after provider failures.

### Fictional mental effects and operational ownership

The engine should leave room for world-specific influence, compulsion, hallucination, or memory-alteration mechanics. This is an **interface requirement for future admitted families**, not permission to enable them in the standard world or to weaken current private-state rules.

A compel spell must not impersonate the victim's self-authored AG `goal` operation. Normal goal APIs remain actor-scoped. A future mental-effect family requires a separately authorized cross-actor operation mediated by the target's agency/memory owner. It carries the caster/cause, affected target, exact allowed semantic operation, world policy, finite scope, and independent component/effect receipts.

Distinguish three possible semantics:

- **Influence:** supply a labeled in-world pressure, salience change, or competing preference. The controller may still resist or choose differently.
- **Compulsion:** impose a specifically admitted constraint or imposed pursuit through a native-capable policy. A prompt instruction alone is not enforcement. An incapable controller/target returns unsupported or rejects; it must not be advertised as compelled.
- **Permanent alteration:** commit a supported explicit change to selected fictional mental state. This is not automatically reversible and needs a stronger scope/review policy.

Do not choose their strength, resistance, disclosure, or human-player eligibility merely by defining the interface. Those are concrete world/governance choices when the family is implemented.

A temporary influence should normally retain its own source-linked record and compose into the agency owner's **effective** pursuit/constraint view. The actor's self-authored intention and imposed pressure remain distinguishable; there is still one operational agency owner, not two independently executing planners. If the approved mechanic actually edits a base goal, that is an explicit typed mutation with revision, conflict, and provenance rules—not a hidden replacement of all goals.

On expiry/dispel, remove the active pressure or restriction, then reevaluate the current plan at the native safe interruption boundary. Do not restore an old entire goal list, resurrect an abandoned plan, refund materials, erase a conversation, or undo an action already completed under the effect. Save/load preserves active effect state and fences discarded-timeline work. Source disappearance and interrupted concentration follow the declared lifetime.

Human-controlled actors require explicit world/player-control policy before a mechanic can restrict input or seize an avatar. Default implementation work must not enable that power, write speech on behalf of a human, infer traits of the real user, or affect account permissions. A controller capability is not consent or administrative authority.

### Shared minds, fictional memory, and evidence separation

A hive or shared-memory organism needs an explicit shared-state owner, membership/grant rules, and origin attribution. It is not implemented by concatenating every actor's private context. Shared knowledge can be a separately authorized channel or shared store, with private compartments preserved. Concurrent contributions and controller decisions require the same resource/action arbitration as other entities. A shared controller cannot spend the same action or item twice through two bodies.

A telepathic sense needs a host-mediated disclosure projection before its output enters EPR as recipient-scoped evidence. A fictional relationship alone does not bypass platform restrictions. Event-time access, current revocation, and what a recipient is allowed to retain must be specified by the owning privacy/mental-effect policy; do not invent that policy during the first sense refactor.

Illusions and memory alteration expose why physical truth, observed appearance, belief, and remembered content need separate ownership. A supported hallucination can provide a misleading appearance without modifying the hidden physical object. A supported fictional memory effect may replace selected actor-accessible content while retaining protected technical causation where policy permits. Neither changes actual world receipts or invents historical success. Platform erasure/forgetting obligations remain distinct and stronger than a fictional spell.

Source provenance may be retained server-side without being fully disclosed to the actor: a victim need not automatically recognize an illusion as an illusion. However, the technical system must not lose its ability to distinguish native occurrence, modified observation, belief, and fictional alteration. Whether corrected or revoked information persists in recollection belongs to the memory/privacy owner, not a generic effect callback.

Advanced nonverbal controllers may use a different internal representation. Standard AG supplies one operational contract, not a requirement that every mechanism use verbal thoughts. All controllers still emit supported proposals or native commands through authoritative admission; no shared mind gets an ambient database handle.

## 9. Change dependencies and work budgets

A module's scheduling adapter declares relevant change keys and deadline kinds. EPR consumes them through its single actor intake; PF owns general budget and concurrency qualification.

Examples of distinct dependencies are attribute-band revision, source presentation revision, observer sense revision, local geometry revision, definition manifest revision, inventory availability, goal/plan revision, and source disclosure revision. A global UI telemetry change must not invalidate all of them.

Queries need membership dependencies, not only the IDs previously returned. A new source entering a query region can matter even though it was absent from the prior result. Invalidation must cover old and new spatial neighborhoods, movement inside a cell, source changes, and stationary observers. Current optimized spatial candidate work should be reused, not rewritten under a second index service.

Preserve deterministic ordering and saved RNG. A refactor that changes evaluation order or consumes random draws for optional cosmetic work can change the game. Initially route randomness through the existing native stream in its current order. Independent per-module streams are a separate reviewed design change, not an automatic consequence of modularity.

Enforce limits at more than one level:

- payload, query candidates, outputs, native work, and scheduled descendants per invocation;
- active state, definitions, episodes, queued work, and subscriptions per module/actor;
- aggregate fan-out, pending work, native CPU, storage, and paid execution for the world/host.

Many individually bounded modules can exceed the host budget together. Admission must account for aggregate capacity. Metadata estimates guide admission; measured execution and enforced interfaces constrain actual work. Do not promise exact hard time preemption of arbitrary in-process TypeScript. The initial native catalog is reviewed code; untrusted algorithms require a real isolated execution boundary.

Use bounded after-commit signals for optional work. Required effects, awareness, privacy invalidation, and authoritative receipts remain transactional. Optional diagnostics never become evidence, and private internal stimuli do not become story jobs merely because they are important to cognition.

## 10. Initialization, activation, disabling, and failure

INV remains the owner of candidate/admission/activation and active-definition version changes. Extend that path to module bundles; do not create a second installer.

For the initial reviewed-default installation, resolve configuration at world creation, bind exact versions, initialize only applicable state, validate a complete candidate, and publish atomically. Same-version restore reconstructs bindings without ordinary creation side effects, new items, fresh RNG, or paid calls.

For later live changes, provide INV with the affected state-owner bindings, state transformations, pending action/plan/sense/controller compatibility, and derived-cache invalidation list. Replace a writer only at a committed boundary. Never leave both old and new writers active on the same quantity.

Removing a module is not deleting its JSON namespace. Reject removal while required definitions, active work, retained saves, or other modules depend on it unless the owning lifecycle declares a coherent detach/retirement path. Retain necessary pinned definitions even when no longer active. A cosmetic fallback cannot silently replace a missing mechanical implementation.

Failure handling depends on responsibility:

| Failure | Required behavior |
| --- | --- |
| Invalid or unsupported candidate | Reject before installation; current world unchanged |
| Missing required active rule or invalid authoritative effect | Fail the affected transition/scope under the existing storage/simulation policy; no partial success |
| Optional observation/context adapter failure | Return explicit coverage/unavailable disposition without broader access or fabricated evidence |
| Optional presentation/art failure | Use a safe honest fallback without changing mechanics |
| Paid operation uncertain | Preserve existing attempt identity and uncertainty; no automatic paid replay |
| Missing definition when loading | Reject incompatible/incomplete candidate before replacing the live world |

A fallback may simplify only within its admitted semantics. Do not turn “could not calculate harm” into immunity or “could not retrieve a memory” into proof that no such memory exists.

## 11. Save, restore, and storage extension

Follow the current [save/load contract](../../docs/save-and-load.md). New state inside the current world object joins capture naturally; an added authoritative store must explicitly join the same consistent capture/install boundary. No module chooses arbitrary tables to read/write or supplies SQL in a save payload.

Each integration identifies:

- authoritative definition and instance state;
- required pinned artifacts and cross-record references;
- reconstructible indexes and caches;
- episode/deadline state that changes continuation;
- external operations/permissions/spending that cannot rewind.

Cache keys include the relevant world/load generation, manifest and definition versions, actor/scope, and source revisions. A rotating gameplay retry epoch is not automatically the correct restore-generation token. Restore must fence old callbacks even if entity IDs recur.

The active development policy prohibits adding old-save readers, migrations, or compatibility fixtures. Bump the current format and reject incompatible development saves when necessary. This is separate from **live definition activation inside a supported running format** and **same-version save continuity**. Those still require coherent state/definition dependencies and must not be omitted.

## 12. Restricted algorithms remain conditional

No G2 runtime is implemented by this foundation. INV's existing G2 task and D20 retain that decision and delivery gate.

When a real family needs an algorithm outside supported G1 composition, evaluate a sandbox behind the same read/proposal interface. Require explicit imported host capabilities, deterministic supplied time/randomness, memory/output/query bounds, a deterministic work budget where gameplay depends on termination, aggregate fan-out limits, cancellation, and no default network/filesystem/database access. Wall-clock timeouts protect host responsiveness but cannot alone define deterministic game outcomes.

The authoring harness and the live simulation executor are different systems. Macrofold can author/test an artifact; an always-running remote harness is not the execution engine for each native tick.

A typed interface or sandbox is not proof of physical plausibility, information-flow safety, complete dependencies, balance, or fun. Scope the inputs before execution, validate effects independently, and use trusted adversarial/differential cases rather than accepting an artifact because it passes tests it authored itself.

## 13. Natural-language authoring and technical artifact boundaries

The existing world-agent workflow and INV service own authoring state. The module runtime supplies discoverable schemas, supported ports, example summaries, compatibility checks, and dependency/effect information to those services. Do not create another chat, draft, or installation state machine.

The authoring sequence is conceptually: interpret intent under bound permissions; retrieve permitted reusable definitions; draft a small composition/specialization; validate exact artifacts; explain assumptions, effects, and gaps; obtain the approval required by existing policy; activate; observe the committed result. It may involve several bounded tool turns, but ordinary execution uses the admitted artifact rather than calling the world agent each tick.

The structured draft is the sole candidate authority. Natural-language explanation, a form, and raw technical inspection all derive from it and its validation results. Every edit carries the expected draft revision; invalid raw edits remain drafts. A successful provider response is neither validation nor activation.

Retain semantic traceability from the creator's requirements to selected ports, bindings, defaults, deliberate omissions, and unsupported host capabilities. The compiler may fill routine implementation details inside its envelope; it must not substitute a different experience silently. Do not claim a blind tactile actor exists if the candidate still feeds it vision or omniscient navigation cues.

A draft may be incomplete and can retain explicit open slots without becoming runnable. The agent may explain or save that partial design, but not fake executable success. Confirmation binds the relevant candidate digest, scope, expected world/manifest revision, authorized operation, and budget ceiling where applicable. A materially changed effect domain or a newly affected population requires revalidation and the existing renewed-approval policy; repainting a preview does not authorize a stronger mutation.

Detailed conversation, questions, confirmation UX, and technical inspection live only in [World agent and workshop](../03-design-proposals/world-agent-and-workshop.md) and [UI design](../../docs/ui-design-brief.md). Export/private-source rules remain with governance. A creator-facing execution has broader permitted tools only when the server actually granted them; an NPC invention continuation cannot inherit those tools.

## 14. Code organization and rollout

For the staged path and architectural proof cases use [the extensibility roadmap](../../docs/extensibility-roadmap.md) and [worked examples](../../docs/extensible-world-examples.md). They do not replace the task owners listed below.

Keep the current package dependency direction. A small domain registry/manifest module and service-specific submodules are sufficient initially. Separate native wilderness implementations from common interfaces as the first consuming feature is converted. Do not mechanically relocate the entire kernel or add a factory for every existing function.

The composition root can import both reviewed runtime services and default modules. Core generic services must not import named wilderness rules. Native adapters may retain typed optimized storage so long as the public ownership contract has one value and no silent side path.

Build one vertical slice: register the current need implementation, consume its scoped concern and presentation through common interfaces, then add a genuinely different reservoir with a supported replenishment action. The second definition must not require another hard-coded need branch in the generic context or UI.

AG01–AG04 can progress with current command adapters. EPR can progress with current sense implementations. Neither waits for all of EWF, and EWF does not replace their plans. Introduce the common interfaces before those new implementations freeze another closed set of world-specific names.

## 15. Contract ownership and task handoffs

| Contract/work | Sole detailed owner | EWF role |
| --- | --- | --- |
| Common host descriptor and installed world composition | This runtime contract / EWF01 | Implement minimal shared metadata and binding, not a new authoring service |
| Typed attribute/body integration and safe generic inspection | This runtime contract / EWF02–EWF04 | Fill cross-subsystem gaps not already covered by mechanical admission |
| Mechanical family registry, recipe schema, action discovery | Declarations / INV-3 | Consume common metadata; do not duplicate INV tasks |
| Mechanical writer/contribution semantics and activation | Declarations / INV-5–INV-6 | Supply module dependencies and prove cross-system integration |
| Sense geometry/fidelity | Sensory design | Supply typed registration interface; preserve its semantic policies |
| Scope, episodes, thresholds, dirty intake | EPR01–EPR08 | Supply registered sources/policies; no second event or reminder framework |
| Optional decisions, goal/plan state, open resolution | Agency / AG01–AG12 | Supply concerns, observations and action-family bindings |
| Standard memory, reflection, story presentation | CR/CH and NC | Keep their private-state and accepted-result boundaries |
| Same-version restoration and performance qualification | SL, production data, PF | Register dependencies and run integration cases; no second save or metrics framework |
| Script isolation and host-operation expansion | Existing INV G2/G3 gate and D20 | Preserve interface options; no unrequested sandbox implementation |
| Reusable construct schemas, compilation, specialization and forks | Shared port semantics here; mechanical/compiler delivery in INV-3 | EWF11 verifies host/state/permission/projection integration and local portability |
| World-agent authoring workflow and review | World-agent/workshop and UI design; INV-1/2/4 delivery | EWF12 exposes supported capabilities and artifact-derived explanation metadata |
| Advanced mental/body/clock families | The corresponding admitted family and existing AG/CR/body/time owners | EWF10 reviews missing capabilities; examples do not authorize new semantics |


### Extension capability maturity

For each implemented interface, distinguish its actual support level in the owning design and runtime capability report: **fixed native**, **native behind a replaceable adapter**, **validated definitions/configuration**, **validated composition/specialization**, or **qualified isolated algorithm**. These are descriptive capability levels, not mandatory extra database states.

A registered implementation does not establish all later levels. Do not claim scriptability because an interface accepts a function in trusted TypeScript, or portability because a JSON file can be copied. The world agent must query the actual supported host/definition contracts and report gaps honestly.

A current v1 limitation belongs beside its owning behavior, linked to an EWF/INV/EPR/AG task or expansion gate. A short code comment at the fixed boundary points to that same owner. No speculative legacy layer, placeholder service, or duplicate TODO register is required.
