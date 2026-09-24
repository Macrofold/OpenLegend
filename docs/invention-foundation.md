# Invention foundation

**Status: accepted target design.** This is the entry point and canonical coordination contract for OpenLegend invention projects, editable revisions, mechanical acceptance, staged presentation, and later redesign. It defines required behavior as the implementation expands; it is not a claim that every described capability exists. Current execution belongs to [Architecture](architecture.md#shared-invention-workflow), evidence to [Verification](verification.md), and delivery to [INV](maintainers/inventions-and-world-evolution.md). This specification does not enable paid work, change deployed locks, admit G2 execution, or require a replacement engine.

## 1. Purpose

An invention lets a player, an eligible NPC, or an authorized creator turn an intention into a supported, reusable change to an authored reality. The result may be an object recipe, material, action, predicate, effect, sense, organism configuration, law, policy, composition, or reusable template. It need not be an item, require art, have a duration, or have an immediate physical instance.

The player should be able to create something while playing, see a truthful result quickly, use the supported result, and refine its appearance and function during creation or later. Ordinary invention should feel like play, not administering a build system. A creator workshop can expose deeper investigation, comparisons, previews, and controls without making those controls mandatory for a simple tool.

The core operating rule is:

> One editable invention project; immutable submitted revisions; separate mechanical and visual outputs; one existing authority boundary for acceptance and activation.

The system must preserve useful work when a revision fails, avoid unbounded generation and verification, keep live worlds coherent, and report unsupported behavior without pretending that generated prose or images implement it.

## 2. Specification ownership

Read this packet together with the existing subsystem owners. Links below are contracts, not optional inspiration. This document coordinates the contracts; it does not copy their schemas or create another implementation registry.

| Canonical owner                                                                                                                                                                                     | Responsibility                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Engine and world boundaries](engine-and-world-boundaries.md)                                                                                                                                       | The existing four logical layers, P01–P12, protected runtime integrity, replaceable world behavior, and the boundary decision procedure.                        |
| [World-module runtime](../archive/07-technical-architecture/world-module-runtime.md)                                                                                                                | Reviewed host registrations, installed manifest, service-specific interfaces, composition ports, state ownership, scheduling, and resource/lifecycle contracts. |
| [Declarations and evolution](../archive/07-technical-architecture/declarations-and-evolution.md)                                                                                                    | Definition/property semantics, G0–G3, admission, state-owner contributions, world activation, and live definition migration.                                    |
| This document                                                                                                                                                                                       | Invention-project/revision coordination, change scope, dependencies between mechanics and presentation, restart/repair behavior, and integrated readiness.      |
| [World constitution](world-constitution.md)                                                                                                                                                         | The resolved world-governance view, mechanic freezes, author refinement locks, and their relationship to pins and quarantine.                                   |
| [Invention validation](invention-validation.md)                                                                                                                                                     | Mandatory interaction discovery, validation plans, evidence reuse, deterministic/Jev/LLM allocation, and uncertainty.                                           |
| [Invention art pipeline](invention-art-pipeline.md)                                                                                                                                                 | Versioned presentation requirements, staged asset production, visual review, durable publication, and state-safe application.                                   |
| [Invention budgets](invention-budgets.md)                                                                                                                                                           | Episode-wide spending admission, repair allowances, runtime cost envelopes, and causal attribution.                                                             |
| [World agent and workshop](../archive/03-design-proposals/world-agent-and-workshop.md)                                                                                                              | Natural-language authoring and inspection surfaces, scoped tools, consequential review, and confirmed god-mode conjuring.                                       |
| [Invention governance](../archive/03-design-proposals/invention-governance-and-ownership.md)                                                                                                        | Independent player/NPC origin locks, authorship, rights, knowledge separation, libraries, and pack distribution.                                                |
| [Agency](agent-agency.md) and [agency runtime](../archive/07-technical-architecture/agent-agency-runtime.md)                                                                                        | The actor's decision to propose, pursue, revise, stop, learn, and separately execute native work.                                                               |
| [EPR](events-perception-and-reactions.md), [memory](memory-architecture.md), and [narration](narration-and-conversations.md)                                                                        | Exposure, private feedback, actual learning, reaction intake, and truthful narrative projection.                                                                |
| [Save/load](save-and-load.md), [production data](../archive/07-technical-architecture/production-data-model.md), and [billing](../archive/07-technical-architecture/billing-and-usage-reporting.md) | Restoration, durable authority, retention, exact accounting, reporting, and invention entitlements.                                                             |
| [INV tracker](maintainers/inventions-and-world-evolution.md)                                                                                                                                        | All invention implementation tasks and acceptance gates. Other trackers retain their existing subsystem work.                                                   |

The [world-agent tool contract](invention-workshop-tools.md) owns one application tool service for the UI and [MCP transport](world-agent-mcp.md). The [unified World Agent runtime](world-agent-runtime.md) owns conversation, native Macrofold execution and session funding. The [relationship graph](invention-graph.md) owns typed navigation/projections, and [composition and revision](invention-composition.md) supplies the end-to-end kind-adapter and live-law workflow beneath the existing module/declaration owners. [Target scenarios](invention-scenarios.md) define the player/NPC outcomes and staged capability sequence. These are accepted designs, not claims of delivered MCP, graph, or general composition.

The visual direction and [hybrid art methods](../archive/03-design-proposals/procedural-art-and-animation.md) still own style, rigs, procedural composition, and pixel-density decisions. This packet does not select a new renderer or promise particular image-provider latency.

## 3. Mechanic agnosticism without a second kernel

Use the existing four-layer architecture: kernel/authority boundary, reusable runtime services, default world systems, and admitted world extensions. Do not replace it with a second universal meta-kernel or require a mandatory three-level inheritance tree of laws, mechanics, and objects.

The engine protects how admitted behavior is represented, executed, authorized, combined, observed, and preserved. A world supplies the behavior and fictional meaning. Native or built-in code is not automatically an immutable universal law. The current wilderness's physiology, senses, materials, cognition, and gathering policies are default behavior with explicit implementation seams.

A world can introduce combustibility as a new admitted definition and process if supported state, predicates, contributions, sources, scheduling, and queries can express the intended approximation. The host does not need a universal `combustibility` field on every object. It does need an available and qualified execution interface. A new label cannot create that interface.

World-authored contracts, constraints, and scenario expectations can themselves be versioned artifacts. They are evaluated by admitted mechanisms and the [validation policy hierarchy](invention-validation.md#3-who-defines-validity), not accepted merely because the same author/model supplied a passing test. A new candidate cannot remove the obligations under which it is being reviewed.

Use G1 for supported configuration/composition, G2 only after its restricted runtime is implemented and separately qualified, and G3 for new host computation, privilege, storage meaning, or incompatible interpreter behavior. A missing cloth solver, spatial primitive, or disclosure operation is an explicit host gap. Offer an honest supported approximation only with acceptance of a material change to intent.

The [spatial world contract](spatial-world.md) owns XYZ position, physical extent, surfaces, locomotion and camera semantics. New inventions bind its actual supported spatial/query interfaces. A sprite or imported mesh cannot grant a new body, support surface or movement operation. Generic invention coordination must not assume one ground plane, a fixed camera or omniscient visual access.

## 4. The invention project and its identities

An invention project is the durable root for one creative objective. A funding session is separate: one conversation may revisit projects or deliberately fund another session without losing lineage or resetting old exposure. [World Agent runtime](world-agent-runtime.md#3-durable-identities-and-ownership) owns that mapping. Begin with the existing request/root lineage and repositories rather than introducing a new service. A project survives browser reload, provider-session expiry, an interrupted worker, and a failed revision. A conversation is a view into it, not its authoritative state.

Keep these identities distinct:

| Record                      | Meaning                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Project/root                | The creative objective, originating actor/account/world, current selected draft, accumulated work, and funding scope.                            |
| Draft revision              | An editable snapshot based on an expected revision, with requested behavior, appearance intent, constraints, references, and unresolved choices. |
| Submitted candidate         | An immutable content snapshot/digest to which validation, generation attempts, and reviews attach.                                               |
| Mechanical artifact/version | A reusable admitted definition or dependency bundle.                                                                                             |
| World installation          | Exact versions active in one world, their applicable configuration, and activation/recovery receipts.                                            |
| Presentation requirements   | What must be depicted, using which supported visual states and semantic bindings.                                                                |
| Visual artifact/manifest    | Particular asset bytes or a retained procedural recipe and their approved compatibility metadata.                                                |
| Instance                    | One actual constructed, spawned, or otherwise created world object/process.                                                                      |
| Actor knowledge             | A separately admitted fact that the actor knows a method; not ownership, proficiency, or an object.                                              |
| Attempt/receipt             | One provider, verification, activation, creation, publication, or quota operation with its own outcome.                                          |

IDs are not names, worker sessions, model runs, or content similarity scores. An identical mechanical digest may be reused while independent discovery and attribution retain their own receipts. A hash does not establish access rights, authenticity, or semantic equivalence.

### 4.1 What a draft retains

Retain the chosen base version or explicit fork; current intention; conceptual method; mechanically relevant requirements; appearance and observable-property intent; user-pinned choices; permitted source references; selected scope; assumptions/defaults; unresolved requirements; and proposal-to-compiled-field traceability.

Store structured meaning once. Chat summaries, forms, friendly previews, technical JSON, and eventual asset briefs derive from that draft. A conversational summary must not become a competing specification. A raw editor cannot bypass the same validation and authority checks.

Support intentional preservation such as `keep this silhouette`, `do not change the material`, or `preserve function; improve rendering`. These are requirements, not instructions embedded in an untrusted prompt that automatically acquire authority. Show a conflict when a requested change cannot honor them together.

Cosmetic preferences, observable semantics, and function are distinct. A painted flame is not combustion. A recognizable emblem or changed visible material may affect permitted observation and therefore require a semantic definition review. A capacity increase is not merely an art change even if requested through a visual editor.

### 4.2 Concurrency and undo

Maintain one selected revision per project initially. Editing uses expected-revision checks. Conflicting edits from another tab or collaborator must be reconciled or explicitly forked; do not use last-writer-wins for a mechanical design.

Submitting creates a new immutable candidate. An older job can finish, but it may not replace the selected candidate or use an approval issued for a different revision. Transport retries keep their original identities. Preserve the current one-child continuation protection while extending it; do not reinterpret a single-chain implementation as an unrestricted revision graph without explicit support.

Undo selects prior content through a new revision or explicit re-selection operation, retaining current permissions, spending, and dependency checks. It does not erase paid attempts, world effects, or revocation. Forking retains lineage and requires its own permitted scope/funding; it is not a means of resetting limits or avoiding locks.

## 5. One workflow, with independent work branches

The player sees one coherent invention and may inspect separate mechanics and art status. Internally, keep attempt status, candidate readiness, installation, presentation readiness, and policy restrictions as separate facts. Do not introduce a giant enum containing every combination of `frozen`, `art_failed`, `approved`, `installed`, and `awaiting_review`.

The normal responsibilities are:

1. Bind current world, timeline/authority generation, principal, origin, actor, intent, target context, and budget.
2. Reuse an existing authorized result or accept a complete supplied method; otherwise resolve the request and author the smallest supported candidate.
3. Freeze the submitted candidate and derive its mechanical and presentation requirements.
4. Plan and execute required validation; prepare an adequate native visual fallback where presentation is needed.
5. Resolve blockers or consequential changes through a retained revision, without losing useful work.
6. Approve and activate through the existing declaration policy, with current dependencies and authority.
7. Deliver scoped knowledge/result feedback; expose separate native crafting/use or confirmed instance creation.
8. Produce, validate, review, and publish optional artwork asynchronously, bound to the intended definition and current visual state.
9. Permit deliberate refinement later, preserving the active version until a valid replacement is installed.

These are responsibilities, not nine mandatory model calls. Use the shortest sufficient path. An exact supplied supported candidate does not need another model to rewrite it. A known compatible definition does not need regeneration. A named family does not grant validity without the native checks.

### 5.1 Reuse and supplied methods

Preserve the existing freeform similar-invention experience: permission-scoped exact/lexical/embedding retrieval; clear differences; Use existing, Modify existing, Invent new, and Cancel; an unavailable search visibly distinct from an empty search. Similarity does not teach undiscovered techniques or prove compatibility.

A complete supplied candidate takes the direct validation path. Optional duplicate detection must not become a compulsory paid search or redesign. Normalize only representation differences allowed by the schema. Do not silently swap materials, mechanisms, work, or quantities. A substantive repair requires a revised proposal accepted by its initiator.

A selected base stays pinned through clarification. Reusing it is not constructing it. A modification is a candidate or fork, not an in-place change to the base. Internal equivalent-result reuse preserves independent attribution and does not reveal private source methods.

### 5.2 Parallel work and paid speculation

Mechanics and art are coordinated, not synchronized at every stage. Simple supported-family candidates normally complete mechanical admission before paid asset production. For a longer verified workflow, a stable candidate may permit a cheap speculative concept after basic policy/feasibility checks and explicit funding.

Speculative artwork is draft-only. It cannot establish that the invention exists or functions. Expensive refinement normally waits for a stable accepted design or a deliberate workshop request. Never require every invention to buy a rough pass, a refined pass, a directional set, and animation. Exact reuse or a native composition may be final.

Confirmed god-mode conjuring retains its separate preview and confirmation gate. No paid art dispatch is authorized merely by discussing what might be conjured. Approval of a random candidate pins that candidate rather than rerolling it on retry.

## 6. Readiness, review, and live use

Mechanical approval, world activation, visual publication, knowledge, and instance creation have different receipts. One UI may review several of them together, but each grant is scoped to the actual candidate, requested operation, world, meaningful effects, and spending allowance.

A simple low-impact invention can auto-activate within its already authorized envelope. Shared-law changes, destructive migrations, expanded scope/cost, and conjuring keep their explicit review requirements. Do not add human approval to every harmless stage or tool call. Conversely, an art approval never approves mechanics.

The ordinary readiness condition is:

> The required behavior is active, and any required presentation has a truthful, adequate supported representation.

A generic inventory icon may suffice for a tool. A dangerous trap may require readable footprint and active/inactive cues. A traversable doorway must agree with authoritative space. If no fallback can meet the minimum presentation contract, do not expose the affected action or instance as usable; a non-executable draft/preview may remain available. This is not a requirement to wait for polished art.

A missing optional icon must not roll back a valid definition. A missing required execution dependency must not be disguised by an attractive sprite. A pure policy or invisible effect may need no new asset at all; its actual observation and explanation requirements still apply.

For a combined review, show what will change, what remains provisional, affected scope, relevant tests and limitations, expected ongoing cost, the exact candidate, and which approval is requested. Material changes invalidate affected approval. An unrelated world tick does not force a complete new review.

The player-facing card should distinguish usable, still a draft, blocked, and awaiting a decision without exposing every job implementation state. An example is: `Reed sling — ready to craft; mechanics accepted; basic appearance available; refined art pending`. Failure messages explain the next meaningful action and do not falsely label provider failure as an in-world failed experiment.

## 7. Editing during creation and after publication

The same draft/review path supports both function and appearance. Players can keep a preferred appearance while changing function, or keep function while seeking another rendering. Generated output is evidence for a design decision, not authority to mutate the selected design.

Classify the actual proposed change, not the label supplied by the client/model:

| Change                                                                                 | Default treatment                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Better depiction of unchanged semantics                                                | New compatible visual manifest; reuse applicable mechanical evidence.                                                           |
| New meaningful appearance, dimensions, attachments, or supported observable properties | A semantic/presentation revision, including mechanical checks where the meaning crosses those boundaries.                       |
| Different blueprint or construction method                                             | New definition/version or permitted fork; existing physical objects do not silently transform.                                  |
| Modify one existing physical object                                                    | A supported native modification action with resources/time and current prerequisites, or a separately authorized god operation. |
| Change a shared law, owner binding, or broadly applicable policy                       | Creator workshop and the existing atomic activation/migration path.                                                             |
| Different world style                                                                  | A presentation-profile revision and compatible asset rebinding, not new physical laws or paid generation on every zoom.         |

Default to the smallest scope. `Improve my basket` does not mean change all baskets in all worlds. Preserve stable object identity through a supported modification, including contents, ownership, damage, and past events.

Objects built under distinct blueprint versions can remain distinct constructions. Equivalent objects must not receive contradictory shared physical laws merely because different players or release cohorts created them. World-law replacement and explicit causally scoped variants are different operations.

A rendering revision can be preferred for compatible consumers without changing a mechanical version. A mechanical parameter change can retain the same presentation contract if compatibility is established. Changing silhouette, topology, footprint, required attachment/state cues, or material appearance invalidates the affected visual bindings. Version numbers do not have to advance together.

A published definition remains immutable even when a project is editable. Editing prepares a replacement; it does not revoke an already working version by default. Do not overwrite an author's selected art through unsolicited refinement or translate `make it cleaner` into `redesign it`.

## 8. Repair, backtracking, and failure

Every submitted changed design re-enters the same logical planning/validation path. Restarting that path does not mean deleting history, regenerating all outputs, rereading the whole world, refunding costs, or resetting a live invention. Each step may reuse evidence and artifacts only under their exact dependency and policy conditions.

| Finding                                                                  | Required handling                                                                                                                                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid output representation, malformed asset, or wrong depicted object | Repair/reject the affected output. Do not redesign valid mechanics to accommodate a generator mistake.                                                                |
| Genuine upstream design contradiction                                    | Attach a typed finding to the current candidate; propose a new revision or ask a consequential question. Preserve pinned intent and already accepted choices.         |
| Missing host capability                                                  | Keep the requirement explicit and the candidate incomplete, or propose a supported approximation with acceptance. Do not keep prompting until a model claims success. |
| Missing evidence or unknown property                                     | Apply only an admitted scoped default/unknown policy, gather permitted evidence, or defer. Unknown is not impossible or a numeric zero.                               |
| Provider failure or uncertain completion                                 | Retain candidate and attempt status. Reconcile results/costs; no automatic failed-run replay.                                                                         |
| New candidate fails tests                                                | Leave the old active version and compatible art intact.                                                                                                               |
| Active behavior violates integrity or enforced resource limits           | Use scoped quarantine and declared recovery. Do not delete artifacts or rewrite already committed history.                                                            |
| Candidate superseded, cancelled, revoked, or restored away               | Stop further dispatch/publication for that authority. Late results cannot become current; separately authorized asset retention/reuse may remain possible.            |
| Shared job loses one requester                                           | Detach that requester; retain work for other authorized consumers only under their funding and publication scopes.                                                    |

A repair finding identifies the requirement, evidence, affected definitions/contracts, severity, proposed change, and whether user acceptance or a new authority grant is necessary. Ordinary schema normalization can remain automatic. Material substitutions, weakened requirements, changed behavior, broader effect scope, or cost increases beyond the admitted allowance require renewed acceptance.

A loop is permitted only inside an explicitly admitted finite refinement allowance. Bound rounds, time, tokens, test work, and cost. Exhaustion leaves a useful blocked draft with findings and retained outputs. Automatic repair is not an unlimited retry policy, and a new draft ID does not create another budget.

Cancellation has two parts: best-effort stopping of outstanding work and guaranteed refusal of stale publication. A completed HTTP response, successful worker, or late webhook does not override the latter. Work is charged according to real dispatch/settlement, not whether its result was eventually used.

## 9. Actor-led invention and knowledge

The project coordinator is not an NPC's mind. Actor intention and private method formation remain in agency. An eligible actor can propose a complete supported candidate, receive private feedback, decide to revise or stop, and independently choose whether to construct or use the result.

Do not insert a hidden designer after a complete NPC method. A compiler can resolve known identifiers and bounded representation details; it cannot silently give the actor a better conceptual method or reveal a private invention discovered elsewhere.

Compiler/validator knowledge and actor-visible feedback are different projections. Internal checking may require authoritative world facts, but feedback cannot become an oracle for secret properties or other actors' knowledge. Validation on a copied scene is not an experiment the character experienced. Narrative outcomes must refer to committed actions, not test results.

Player delegation retains player origin and its permissions/budget. An independently motivated NPC request follows agent origin. A model, harness, or fictional god label cannot select its own authority. Existing default locks and enablement policies remain unchanged by this design.

The definition can outlive the actor's original plan. Result arrival must not construct an object, resume a cancelled goal, spend materials, or revive a dead actor. Native continuation rechecks the current actor intent, target, knowledge, resources, safety, and action authority. No survival action waits for art, authoring, or optional review.

## 10. Persistence and application boundaries

Start with the existing application-owned invention service, durable jobs, serialized world mutation boundary, repositories, and replaceable AI execution port. Reuse the world module manifest and existing declaration receipts. Do not introduce a graph database, distributed broker, separate wallet, per-entity sandbox, second actor store, or general plugin framework as a prerequisite.

The implementation needs small logical responsibilities: draft/revision handling; resolved constitution; validation planning/execution; presentation requirement/asset handling; budget reservation; and existing admission/activation. They can be in-process modules. Split services only for measured isolation or scale needs.

Record newly eligible dependent work durably at the relevant commit boundary. Execute paid work and expensive testing outside the world mutation lane. A startup dispatcher can read eligible durable work; the commit-to-dispatch gap cannot lose a required job or cause a duplicate paid attempt. Repeated wakeups merely revisit eligibility. A broker/outbox framework is not mandatory if existing transaction/job records provide the same guarantee.

Publication rechecks candidate identity, selected revision, relevant dependency/constitution versions, current rights and lock watermarks, original attempt funding authorization, and world/authority generation. Exhaustion alone cannot block publication of an already funded result or require charging it again; any newly incurred work follows the [budget contract](invention-budgets.md#4-attempt-lifecycle-and-uncertainty). Mechanical activation, visual manifest publication, instance creation, and accounting settlement each keep their appropriate independent atomic boundaries. Do not hold a database transaction open while a provider or reviewer is working.

Save/load pins necessary mechanical definitions, world configuration, assets, and same-version state. It fences abandoned generation and preserves current external spending, privacy protections, permission revocation, and real-operation receipts. A missing generated artifact is not permission to regenerate it with a paid model during load. Current-format saves may reject incompatible development formats; this does not eliminate the separate need for coherent live definition activation.

A gameplay rewind can restore fictional state and world-rule pins under save policy, but cannot restore a revoked grant, clear an outstanding charge, or revive cancelled old-generation work. Historical project results may remain inspectable while clearly distinguished from what is installed in the restored timeline.

Garbage collection follows retained-world/save/pack references and privacy/rights policy. Optional old attempts can expire independently of active artifacts, mandatory validation evidence, accounting, and referenced dependencies. Cross-world technical reuse cannot copy private prompts, NPC memories, or ungranted source assets.

## 11. Observability and service choice

Expose a correlated view of request, selected revision, checks, generation attempts, costs, review, activation, and asset publication. Record no-call/reuse decisions as such. Keep technical diagnostics scoped; player summaries should not reveal private validation inputs.

Measure time to a usable result, time to improved art, spend per usable invention, revision/repair counts, false rejection and unnecessary escalation, cache reuse, later defects, and incremental runtime cost. Report fixture evidence, measured provider behavior, and design expectations separately.

Vendor services may accelerate text generation, classification, images, rigs, or validation tooling, but they remain replaceable workers. OpenLegend owns meaning, permissions, canonical drafts, mechanical acceptance, manifests, state, and funding. A character platform must not become a second memory or world authority; an asset API must not decide collision or anatomy. No vendor-specific orchestration object belongs in the domain save.

The default art strategy is exact authorized reuse, trusted composition and immediate state effects, then optional paid generation. Authoring software and offline asset tools may supply reusable families; the runtime must still support inventions created during play. Provider rankings and price lists belong in research/configuration, not permanent correctness rules.

## 12. Delivery direction and decision coverage

Extend the delivered supported-family path rather than rebuild it. Prioritize the unified, capable native World Agent with one shared MCP tool surface, explicit action approvals, and a $5 funded session including images. Prove inspection/drafting/Apply with current recipes first, then typed graph navigation and a substantially different kind adapter, then real compositions, NPC investigations and shared-law revision. Progressive art can ship alongside the relevant supported families rather than block all graph/agent work. Use the phase gates in [Target scenarios](invention-scenarios.md#capability-ladder-and-stop-conditions). Cost optimization follows capable, accountable operation; permission, correctness and work bounds are not deferred. General G2, distributed hosting, marketplace automation and exhaustive physics are not first-slice prerequisites.

The following decisions are final architectural constraints; detailed tasks remain only in INV:

| Concern                                                                            | Governing destination                                  |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Mechanic-agnostic execution without universal wilderness laws                      | Existing engine/world boundary and section 3.          |
| One experience, separate mechanics/art work                                        | Sections 4–6 and the art pipeline.                     |
| Editing function and appearance before/after use                                   | Sections 4 and 7.                                      |
| Backtracking without losing work or retrying paid uncertainty                      | Section 8 and budgets.                                 |
| Invented mechanics and evolving validation obligations                             | Validation policy hierarchy and world constitution.    |
| Typed dependency graph, interaction closure, and evidence reuse                    | Relationship graph and invention validation.           |
| Independent origin locks, author refinement control, frozen laws, pins, quarantine | Governance and world constitution.                     |
| Root authoring allowance plus aggregate runtime sustainability                     | Invention budgets.                                     |
| Actor knowledge, privacy, continuation, and non-oracle feedback                    | Section 9 and AG/EPR/memory owners.                    |
| Saves, rollback boundaries, artifact retention, and late results                   | Section 10 and save/load.                              |
| Cheap paths and deliberate optional enrichment                                     | Sections 5 and 11, validation routing, and art stages. |

The exact provider, confidence calibration, numeric work limits, and entitlement amounts are configuration/research decisions under their existing owners. They must be explicit and qualified before enabling the corresponding capability, rather than silently treated as unlimited or zero cost. They do not change this feature's authority boundaries.

## Repertoire integration

[Repertoire foundation](repertoire-foundation.md) maps the action examples to definition authoring, ordinary invocations, retained methods, live structures, participants, information and obligations. It refines graph/presentation/integration without replacing AC/AG/INV ownership.
