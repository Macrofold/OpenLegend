# Cognition Lab — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | The technical design is being specified; runtime implementation and qualification have not started. | 2026-10-24 |

## 1. Scope, authority and baseline

This design supplies the implementation contracts for the [Cognition Lab feature specification](cognition-lab-feature-spec.md). It is a developer workspace at `/cognition` for testing characters through the ordinary game implementation using independent scenario data. The feature specification owns screen composition, control behavior, content hierarchy and user journeys. This document owns runtime composition, request and record meanings, mutation/dispatch boundaries, persistence, extension seams and qualification.

The inspected baseline is `Macrofold/OpenLegend` `main` at `795dae71d1cf6a2e846ebfaaeb7c70342bc01f66`. The following are proposed additions, not descriptions of an installed lab. Existing source evidence is cited in the owner table. The [situation-aware context project](situation-aware-cognition-context-feature-spec.md) and the emotion proposal on `codex/design-stealth-02-emotions` contain compatible targets; the lab must expose their delivered capabilities when present without requiring those entire projects to finish first.

The lab changes no game law merely because it has a privileged editor. Perception, memory retrieval, judgment/routing, action offers, generation, output admission, native effects, memory recording and ongoing work use their ordinary owners. It does not call providers from the browser, emulate a character with a second prompt pipeline, invent actions from text, or run the rendered game client as a prerequisite.

The [development compatibility policy](../../AGENTS.md#development-save-policy) applies. Lab data is disposable development data. Implement the current format and reject incompatible data; no legacy reader, migration service, versioned protocol family, compatibility adapter or historical code replay is part of this project. A source commit or prompt/model identity stored with a result explains that result; it does not promise that the application can execute obsolete code.

## 2. Selected composition and isolation

### 2.1 One lab runtime beside the game runtime

The same server process owns the ordinary game and one lazily opened lab runtime. Each runtime consists of its own `WorldService`, `SqlGameRepository`, `AiDirector`, `CognitionExecution`, navigation preparation, ordinary mutation lane and lifecycle handles. They use shared constructors and shared semantic code.

Use one dedicated PostgreSQL database and one dedicated data directory for the lab. The current repository has singleton active-world state, explicit `open_legend` and `mind` schemas, and repository-owned operational rows. A different world ID in the gameplay database is insufficient isolation. A separate database avoids a repository-wide multitenancy refactor.

Standard development setup provisions the lab database alongside the gameplay database and exposes its URL through server-owned configuration. A configured lab database must differ from the gameplay database after resolving connection identity; the lab directory must not resolve to the gameplay directory. Missing or invalid lab configuration produces one actionable unavailable state. Never silently reuse the gameplay store. Connection strings and provider credentials are never sent to the browser or saved in exported scenarios.

The app opens without a configuration wizard when development setup is valid. On first use, initialize through the same current starting-world initializer as the game, with a new lab world identity and the installed authored rules. Do not copy a half-constructed live world or replace the normal opening with a hidden cognition-only definition set. Initial characters and objects are subsequently editable within the lab.

Exactly one scenario is active in the lab at a time. Saved scenarios, checkpoints and completed runs support serial experiments and side-by-side inspection; simultaneous live A/B worlds are not required. This constraint does not limit the number of characters in a scenario. It is a small development composition, not a new hosted simulation tenancy system. [Constraint owner](../limits/cognition-lab.md).

### 2.2 Shared runtime extraction

Extract the runtime construction currently embedded in `apps/server/src/http.ts` into a narrow shared factory, proposed `apps/server/src/world-runtime.ts`. It owns constructing and disposing the existing service, director, execution capacity, navigation and world-clock wiring. Ordinary game startup and lab startup call this same factory; there is no copied initialization function.

The runtime factory receives an existing repository, server-owned effective configuration and optional lab control/capture hooks. It returns the existing service/director accessors, one clock driver, and one close/drain operation. HTTP routing, authentication and static asset delivery remain host concerns. The lab consumes none of the PlayCanvas scene, entry artwork preparation, camera or render-frame loop to run cognition. Installed definitions, geometry and sensing required by the simulation still load normally.

Do not mechanically extract unrelated World Agent, public asset, invitation or hosting machinery into a generic container. Preserve their existing game startup ownership. Add only the second caller's required composition seam, and qualify normal game startup through that same factory.

### 2.3 Runtime and tab scope

Every lab endpoint is under `/api/cognition-lab`; it resolves the lab runtime explicitly. Existing gameplay endpoints resolve the gameplay runtime. Never select the destination store from a client-supplied arbitrary path, database URL, world name or actor label.

Server identity for a lab mutation is the authenticated principal plus the lab workspace, active world, timeline and expected scenario revision. Entity and record IDs retain their existing native scopes. Display names do not route requests. A second browser tab may inspect the same active lab; edits use the expected revision and return a concrete conflict rather than silently overwriting another edit. This is the existing one-writer model with revision checks, not a collaboration platform.

Opening or operating the lab must not change gameplay pause, selected/controlled character, game save, autonomous actors, model configuration or request budgets. The game and lab may share process-level provider/network capacity; expose waiting caused by shared capacity rather than implying physical isolation of CPU or provider quota. The lab's own spending limits still apply.

## 3. Source-verified owners and proposed modules

| Responsibility | Existing owner to reuse | Lab integration |
| --- | --- | --- |
| Runtime startup and 50 ms host wake | `apps/server/src/http.ts`, `main.ts` | Shared `world-runtime.ts`; lab supplies run control, not different simulation arithmetic. |
| Serialized native writes, publication, pause and restore | `apps/server/src/world-service.ts` | Commands and authoring enter its mutation lane. Add small lab-facing methods where a required operation lacks an admitted entry point. |
| PostgreSQL, native records and operational accounting | `apps/server/src/store.ts`, `postgres.ts`, `world-records.ts` | Separate lab repository instance; current native format remains canonical. |
| Initial authored world | `WorldService.initialize` and the existing `createBaseStartingWorld` caller | Same initializer and installed definitions, distinct database/world. |
| Perception and context descriptions | `perceived-context.ts`, `context.ts`, `decision-context.ts` | Inspector reads projections; scenario truth is not automatically included in a character request. |
| Personal memory and retrieval | `memory-repository.ts`, `recall.ts`, `speech-recall.ts` | Full source scope and correction invalidation; selected-request record contains the exact material used. |
| Cognition coordination and native output admission | `ai-director.ts`, `decision-task.ts`, `decision-preparation.ts`, `decision-publication.ts` | Optional stage/run hooks; ordinary route, reference binding and final admission remain authoritative. |
| Provider transport | `packages/ai/src/client.ts`, `types.ts`, the selected Macrofold adapter | Retain normal transport, validation, deadlines and receipts. No browser provider calls or raw URL override. |
| Action interpretation and offers | `action-grounding.ts`, `action-catalogue.ts`, `action-retrieval.ts`, `typed-actions.ts` | Say/Act use these paths. Catalog availability, offered choices and admitted effects remain distinct. |
| Owner-editing memories and mind | `history-edit.ts`, `god-mind.ts`, existing `WorldService` owner editor methods | Extend the same admitted mutation owners for lab authoring, not a JSON assignment bypass. |
| Checkpoint and file storage | `game-saves.ts`, `checkpoint.ts`, `save-files.ts` | Save isolated full-world state under the lab directory, with experiment records stored separately. |
| Diagnostics | `intelligence-log.ts`, `cognition-inspection.ts`, `diagnostic-capture.ts` | Retain trace identities and recorded facts; add experiment ownership and completeness metadata. |
| Structured inspector renderers | `apps/client/src/ui/diagnostics.tsx` | Extract reusable presentation sections; lab supplies shallow replacement navigation and modals. |
| Shared UI primitives | `apps/client/src/design-system/` | Compact light-theme workspace; no new component/UI framework. |

New modules are deliberately few: `cognition-lab.ts` (workspace/scenario/run owner), `cognition-lab-routes.ts` (authenticated endpoint wiring), `cognition-lab-records.ts` (lab metadata and validation), `cognition-lab-control.ts` (run boundaries and prepared-call handles), and client `ui/cognition-lab/` components. Split a module only for an actual independent responsibility. These are proposed file paths; source links above describe current owners.

Public intentions and views belong in `packages/protocol` under its existing export conventions. They carry developer-authorized projections, not raw service objects, SQL rows, provider clients or writable world references.

## 4. State model and identities

### 4.1 Four independent selections

The client keeps these values separately:

1. `inspectedActorId`: whose current editable information is displayed on the left.
2. Composer `actorId`: who submits the next Say/Act.
3. Composer target binding: exact person/object/location references required by the selected operation, or an explicit ambient/no-addressed-target choice.
4. `selectedTraceId` / `selectedStageId`: which captured processing is inspected on the right.

Changing item 4 never replaces item 1's current values. Changing item 1 does not transfer control, change the composer actor or mutate autonomy. A deliberate “Inspect this person” navigation changes inspection only. Targets use exact IDs, not the current inspector selection as an implicit fallback.

The left pane consumes the current lab projection with `scenarioRevision`. The right pane consumes immutable run/trace records with their captured time and source revisions. A link from a historical memory to its current source labels the destination as current; it does not silently update the recorded input.

### 4.2 Lab records

| Record | Required meaning and fields | Lifetime |
| --- | --- | --- |
| Workspace | Stable lab ID, owner, active scenario/checkpoint references, current runtime generation, last confirmed save status | One configured lab store; no cross-game alias. |
| Scenario | Name/description, current-format full initial-world checkpoint reference, authored event sequence, chosen autonomous participant set, experimental context fields, effective run settings, optional evaluation notes | Reusable starting situation. Saving a new starting situation does not preserve live request handles. |
| Run | Run ID, scenario/checkpoint origin, status, simulation and wall start/end, exact effective nonsecret configuration, stimulus occurrences, interventions, roots/stages/outcomes, accounting/completeness, optional annotations | Inspectable experiment, independently retained from rolling diagnostics. |
| Checkpoint | Existing game-save identity plus lab name, scenario/run origin and capture instant | Resume native state and accepted history using the current native save contract. |
| Prepared call | Opaque handle, run/root/stage, world/timeline/generation, scenario revision, purpose, request kind, immutable original request, server bindings, gate status | Process-local and single-use; never resurrected by loading. |
| Evaluation note | Expected behavioral qualities or required result, selected source evidence, operator annotation | Outside all actor/model inputs unless explicitly copied into a separately labeled experimental field. |

Use native IDs for game records and application-issued opaque IDs for lab records. Composite keys preserve their components, following [identity and references](../identity-and-references.md#contract). A recorded source reference includes record kind and observer where applicable; matching only a shared event ID is not sufficient.

`sourceCommit`, installed definition identity, model, prompt/rubric identity and adapter identity are explanatory provenance. Store current identifiers already provided by their owners. Do not build an old-code loader, global schema registry or version-negotiation protocol.

### 4.3 Current data and saved evidence

The active world and its complete relevant history remain in the ordinary lab repository. The left pane does not become a second persisted character object. A run captures the exact inputs/outputs it needs to explain an experiment, plus references into an immutable run checkpoint when requested; it must not depend exclusively on a rolling diagnostic cache.

Manual scenario edits are interventions. Retain their concise structured differences inside the run when they occur during an experiment. This is experiment evidence, not a development revision diary. Before a run begins, the saved scenario itself is the starting truth; every keystroke need not be retained.

## 5. Control of simulation and cognition

### 5.1 Distinct controls

| Operation | Effect |
| --- | --- |
| Stop following live updates | Client selection/scroll behavior only. Server simulation and paid work are unaffected. |
| Pause simulation | Ordinary game pause semantics through the shared owner; resulting job cancellation/deferral remains explicit. |
| Lab breakpoint | A deliberate experiment hold before a selected operation or at a completed run boundary. It is not implemented by toggling ordinary manual pause. |
| Cancel request | Cancel the exact admitted request through its owning controller. Already accepted effects and paid/uncertain work remain recorded. |
| Stop run | Close further run-scoped admission, drain or explicitly cancel outstanding work as described below, then publish a terminal run result. |

The shared runtime's clock driver accepts a lab hold that stops offering new native elapsed time and drops time accumulated while held. It does not change the underlying world's ordinary paused flag, cancel background work through the ordinary pause path, run native ticks at zero time to manufacture opportunities, or accumulate catch-up time for resume.

The run owner also gates new cognition admission at the shared director boundary. It may allow the selected run's existing admitted work to settle; it must not dispatch unrelated work while the operator is examining a breakpoint. Both gates belong to the lab runtime only. The game runtime remains active.

### 5.2 One-stimulus default

Default Submit performs this finite workflow:

1. Validate and record the submitted Say/Act/Event against the current lab revision.
2. Commit the ordinary source event or action request through its owner.
3. Identify the focal actor and that actor's actual opportunity/disposition associated with the committed occurrence.
4. Let the ordinary cognition pipeline perform its relevant immediate stages, including dependent judgments and required output admission.
5. Stop after that focal immediate decision reaches a terminal disposition and its accepted effects are durably published.
6. Close further admission for this run, settle already-dispatched work, and hold at the resulting current world. Show the exact stop reason.

A decision may complete by continuing current work, declining to intervene, or failing; it need not produce speech. “No perceived stimulus” and “no new decision admitted” are terminal explanations, not an infinite wait for a reply. The source association is not derived from message wording.

The default does not wait for an action's future completion, every bystander's later reply, memory consolidation, reflection or all possible consequences. Started native work remains started in the held scenario. The UI shows that state. Separate explicit stop conditions support a selected action's completion, a chosen actor's next decision, a particular event/condition or an elapsed simulation duration.

An already-dispatched child that finishes before the hold becomes quiescent keeps its actual outcome. A future independent opportunity remains pending/eligible under the shared scheduler and is visible when relevant; it is not falsely recorded as completed or automatically dispatched to make the trace look tidy.

### 5.3 Continuous and stepped execution

Continuous Run repeatedly offers elapsed time and ordinary admission until an operator stop, selected stop condition, configured run spending limit or real error. It does not create a new model call merely because a UI interval elapsed.

Advance-time and run-until use the same clock driver/native boundaries as normal play. A step crosses one defined semantic boundary (selected event, stage or decision), not an assumed number of 50 ms host wakes. The recorded step specifies which boundary was crossed. Provider waiting time, simulation time and operator breakpoint time remain separate measurements.

The selected autonomous participant set is a lab admission policy, not a transfer of human control and not a changed personality. A scripted event authored for a character remains labeled operator-authored. Actual directly controlled-character psychology follows its owning policy; the lab does not resolve the emotion branch's separate SA-D01 decision by selecting a person in a dropdown.

### 5.4 Bounded stopping

Do not wait for abstract “global quiet.” Stop at the selected identity-bound condition. Existing request deadlines, execution capacity, context limits, native work budgets and spending admission continue to bound work. Every run has a visible cost allowance derived from and no larger than its operator-authorized allowance; there is no hidden lab budget multiplication.

If the stop condition cannot be reached because the selected operation was refused, the actor disappeared, a required capability is unavailable, or a request has an uncertain external outcome, terminate with that specific disposition. A completed useful action is not required to call the run finished. Unknown external completion stays unknown until the existing receipt owner resolves it.

## 6. Prepared-call inspection and one-shot overrides

### 6.1 Hook position

The shared stage wrapper offers a prepared-call hook after the exact typed application request and server-owned reference/source bindings exist, but before cost reservation, dispatch intent and the provider call for that stage. This must be an ordinary shared dispatch boundary used by attention, routing, action scoring, generation and other supported stages—not a separate lab implementation of those operations.

The current `AiDirector.attempt` wrapper accepts a closure that dispatches the request. Refactor that boundary into a typed prepared request plus an execution function where necessary so the hook can inspect the actual request, not infer it from a log. Existing judgment/generation callers continue through the same attempt reservation, source validation, settlement and publication paths. Equivalent hooks are required for independently dispatched embedding or reflection/harness operations the UI offers to inspect/edit; an unsupported hook must be explicitly unavailable, never approximated with a fabricated payload.

No debug hook is enabled for the gameplay runtime. With the lab hook disabled, ordinary callers receive the same inputs, route choices and outcomes, without diagnostic deep-copy work.

### 6.2 Request kinds and editable material

The discriminated request kinds are the existing judgment, generation, embedding and supported harness/tool request types; derive their schemas from their actual transport owners. The editable envelope contains all model-facing fields accepted by that kind: state/context, instructions, questions/options, supported model/effort settings, response schema and supported tool declarations/results.

The following remain server-owned: request/attempt IDs, principal and permission context, world/timeline/control bindings, secret credentials, endpoint URL, abort signal, actual execution deadline, real spending reservation, tool execution authority, and the captured reverse map from model references to native identities. Display safe identity and accounting summaries beside the editable envelope; do not serialize protected execution material into an editable JSON blob.

An operator may remove, replace or invent fictional information inside the request, including deliberately false or contradictory context. This is the point of the experiment. The run identifies the override. The normal response parser and native admission remain in force: adding a person's name, action string or invented reference token does not grant an executable target or capability. Structural validation failures report their path and preserve the draft rather than silently rewriting it.

### 6.3 Handle state machine

A prepared-call handle moves through `prepared → submitted → consumed`, or from `prepared` to `discarded`, `invalidated` or `cancelled`. The server issues it after preparation and accepts it exactly once. It binds an immutable original request and the exact scenario revision/generation. A duplicate Submit returns the same accepted submission outcome; it never makes a second provider request.

Only the payload modal's Submit sends its replacement envelope with that handle. Ordinary composer Submit has no override parameter and always prepares from the current scenario. Closing the modal discards its override draft and leaves the call visibly held. It does not dispatch or leave a persistent hidden override. Continue original submits the unchanged prepared request; Stop cancels it through the shared owner. Applying a left-panel edit invalidates prepared handles before further dispatch and visibly disables their Submit action. Restore, scenario load, principal change and runtime replacement do the same.

Provide Restore original and an original/edited difference view. The server retains original and actually submitted requests separately. A run's summary states whether it used ordinary inputs, model-only context additions, a stage override or several explicit interventions.

### 6.4 Human wait and deadlines

A breakpoint is reached before dispatch of its selected call. No provider call is suspended mid-request. Operator editing time must not consume that call's provider timeout. Existing calls already in flight keep their real deadlines and settlement semantics.

When a lab gate holds a prepared operation, the shared decision timing owner records the start/end of the operator hold and shifts only that undispatched operation's lab-relative preparation/publication deadline by the actual hold interval. Do not patch `Date.now`, `performance.now`, global timers or provider clocks. Introduce one explicit timing operation on the existing decision owner and use it for all deadline fields that represent the interrupted operation. A normal game request never invokes it.

This is an explicit timing intervention, captured in the run, and therefore cannot qualify ordinary production latency. No already-expired operation is revived; cancellation, changed evidence or actual in-flight expiry still invalidates it. If another admitted operation changes a dependency while the selected call waits, invalidate the handle and offer explicit re-preparation. Do not silently recompute the request under the old handle.

### 6.5 Replay and rerun

Replay displays previously captured inputs, outputs and effects without inference or mutation. Rerun request creates a new, explicitly paid request comparison using the captured application input and chosen compatible settings. It uses the normal provider adapter and response validation, but does not publish actions, speech, memories or other native effects into the active world. Its result is labeled Request comparison, not a new character decision that happened in the scenario. Never edit the old run.

Continue from checkpoint is available only when an actual coherent checkpoint was captured at that held decision boundary and the current runtime can reconstitute its native prerequisite bindings. A process-local handle itself is never serialized. On restore, re-prepare those bindings through the normal owner and verify the recorded request/dependencies before allowing continuation; changed dependencies make the continuation unavailable. Do not capture a full world before every model call merely to provide this action.

Run scenario again restores the saved starting checkpoint and executes perception and every earlier selection again. The active scenario then contains this new execution's real effects. Complete-scenario reruns and request comparisons neither promise identical remote-model answers nor substitute a recorded answer for a new model call without an explicitly labeled intervention.

If the captured request or checkpoint is incompatible with the current runtime, explain why execution is unavailable and permit ordinary recorded inspection where readable. Do not add an obsolete-code loader or compatibility engine.

### 6.6 Preparing from an idle composer

Opening Edit next input reads the supported stages and opens a preparation sheet. It must not commit the stimulus, advance time or call a model. Prepare and hold is the explicit executing action: it submits the source once, then allows necessary earlier native processing until the next matching actual prepared call. Its incurred calls and source occurrence remain in the run even if the operator later cancels.

The default match is the next supported model call belonging to the chosen focal response. A specific purpose filter matches a reported stage capability, not a mandatory pipeline position. If that response never needs the requested call, finish with its actual no-call or terminal disposition. Do not generate a dummy request. The sheet states that preceding work may incur cost; the held modal shows the resulting exact application input.

## 7. Scenario authoring and mutation contracts

### 7.1 One authoring transaction, real owners

A current editor draft is local UI state until Apply. Field edits do not advance time, dispatch models or autosave a new checkpoint. Apply validates the full draft, prepares its dependency closure where required, then commits through the ordinary service mutation lane. The result supplies the new revision and a structured summary of changed native values, invalidated derived evidence and deliberately authored experimental inputs.

Each mutation carries the current runtime generation, expected scenario revision and the existing owner-specific concurrency tokens. Reuse stronger existing checks: person editor base values, memory source hashes, installed manifest revision and body policy pin. A disagreement returns the current field values and a stale outcome without partially applying the draft. Do not replace the existing field-level/native checks with a single weaker UI counter.

When a field group spans several owners, the server prepares/validates all groups first and applies them under one admitted service operation. If the current service cannot provide atomicity for that group, separate its Apply actions visibly by owner; do not present multiple partially successful writes as one atomic edit. Applying an edit cancels or invalidates affected prepared work before subsequent admission.

| Editable subject | Required native path | Semantic rule |
| --- | --- | --- |
| Name, description, personality, backstory, installed trait selections, goals, inventory and exposed meters | `WorldService.personEditor` / `savePersonEditor`; `editPersonState` and meter/body owners underneath | Preserve each installed value's type, unit, bounds and reconciliation rules. A nominal need value may create real condition/events through its owner. |
| Installed attribute declaration or value | `godAttributeDeclaration`, `godAttributeEdit`, `attributeEditor` | Distinguish installing an actual definition from adding a model-only experimental field. Recompute derived projections through their actual owner. |
| Private appraisal | `authorCharacterAppraisal` | Authored appraisal stays private to its owner and follows source/revision validity. Public event or speech never acquires private attribution by a UI label. |
| Learned/known information | `editCharacterKnowledge` | Preserve teacher/source/observer semantics. Omniscient scenario truth is not automatically learned knowledge. |
| Personal memories and remembered speech | `personMemoryJson`, `savePersonEditor`, `correctMemory`, `forgetMemory`; `history-edit.ts` dependency preparation | Actual source correction/deletion invalidates dependent recall summaries, occurrences and appraisals as the existing owner requires. |
| World events and event history | `worldEventsEditor`, `worldEventJson`, `saveWorldEventsEditor` | Author the underlying event and relevant perspectives coherently; do not repaint only the center transcript. |
| Relationships, family, conditions/effects, equipment and nearby objects | `godFamily`, `godFamilyEdit`, `godEffects`, `spawn`, `createItem`, `godAct`, and installed domain owners | Use existing supported relations and effects. An arbitrary descriptive statement does not create a new body channel, consent relationship, promise ledger or action primitive. |
| Position, location, environmental state and scene setup | Existing creator action/geometry/environment owners admitted by `WorldService` | Geometry and perception update through native state. Reject an impossible/unsupported transform rather than silently approximating it. |
| Experimental model-only information | The explicit lab context contract in §7.3 | Does not mutate native mechanics, permissions, knowledge provenance or entity identity. |

This mapping is an implementation starting point, not permission to force every requested field through `savePersonEditor`. Extend an owning operation where the current API cannot express a required supported edit. Keep the domain owner authoritative and expose its actual result.

### 7.2 Speech history, memories and coherent retcons

The editor distinguishes what happened, what a particular person perceived, what they remember now, and what they believe. These are different editable sources with different consequences. Choosing a speaker and writing a past sentence is insufficient to imply that every nearby or current character heard it.

A new history authoring operation accepts an exact source kind, source time/order, actor/subject references, actual event content and explicit observer perspectives where the native model permits them. It validates temporal references and source links against the loaded scenario. It uses the existing creator-history preparation/commit owner, extended to admit insertion if insertion is not currently supported. This extension is CL03 work, not existing functionality inferred from the JSON viewer.

A prospective edit preview names the selected source and the affected actors/derived records. The existing history correction path hydrates the complete selected dependency closure, including cold SQL history; its recall candidate limit must not truncate this maintenance work. It can clear existing appraisals for affected actors. Show that consequence before Apply and refresh the left projection after the durable commit. Do not hide this by leaving stale private feelings painted on screen.

Changing a source inside a completed run never rewrites that run's evidence. The operator creates or edits a new starting scenario, then reruns. A current-run retcon is permitted as an explicit intervention when the run is held, with before/after source references; its label makes the experiment's edited history clear. Backdating an utterance is not replaying an actual earlier provider request.

### 7.3 Declared model-only fields

A custom field record has an application ID, label, datatype (`text`, `number`, `boolean`, `enum`, or validated JSON), value, subject scope, enabled flag, recipient actor IDs and supported input placement. Subject scopes are person, directed relation, object and scene. A directed relation binds exact `fromActorId` and `toActorId`; the direction is never inferred from display order.

Recipient actor IDs are explicit. A person field defaults to that person's private input; a directed-relation field defaults to its `fromActorId`. Object and scene fields require selecting whose input receives the experimental information. Adding another recipient is an intentional, recorded injection; it is not presented as natural perception. The editor offers source labels such as private belief, observed description and story premise to explain the experiment, but those labels alone do not install knowledge or physical facts.

The shared decision-context assembler accepts a lab-owned extra-context section with a clear experimental provenance marker. Only applicable fields for that focal actor and that stage's declared context capability are included. Stages that cannot accept contextual additions advertise this and are not silently patched elsewhere. The normal state/context envelope carries this section; it is never converted into provider/system instructions or tool authority. An embedding, response schema or judgment question is not modified just because a field is enabled.

Installed native fields and model-only fields must have different descriptors and mutation endpoints/operation kinds. A model-only `fear`, `hunger`, `blessing`, `knows_secret` or `can_fly` does not install an actual emotion, satisfy a resource, create knowledge provenance or grant flight. If a matching native capability later exists, the operator can deliberately author that native state through its owner. Do not auto-promote custom names into mechanics.

Custom-field size/count ceilings belong to [CLL08](../limits/cognition-lab.md). A rejected field remains in the editor draft with a validation message. No silent truncation, coercion to a string, or hidden exclusion is allowed. The recorded right-hand input includes the exact submitted fields and placement, so an operator can verify that a change affected the request.

### 7.4 Typed capability descriptors

The workspace bootstrap exposes small, concrete descriptors for installed editable fields, stimulus kinds, stages and maintenance operations. A field descriptor includes identity, label, datatype, value, unit/bounds/options where meaningful, editability, native versus model-only meaning, mutation owner and unavailable reason. Prefer the installed module's existing descriptors; add projections for missing metadata. This is not a new general plugin/schema framework.

The UI selects controls from the datatype: compact numeric input plus an appropriate bounded slider; checkbox/switch for boolean; searchable select only for genuinely long option sets; multiline editor for prose; full modal for complex structured content. Unknown structured native fields remain inspectable and clearly read-only until an owner exposes a validated editor. An advanced JSON editor may edit a declared supported JSON field, not arbitrary properties of a world object.

## 8. Stimulus, run and settings contracts

### 8.1 Submitted stimuli

Every executing stimulus has `commandId`, `expectedRevision`, `focalActorId`, a discriminated stimulus body and requested run policy. The authenticated principal and destination runtime come from server routing. The command ID deduplicates repeat submission of this same intention; it does not identify a new run when retried after an uncertain HTTP response.

| Kind | Body | Execution and evidence |
| --- | --- | --- |
| Say | `actorId`, text, native channel/options when available, addressed target IDs or explicit ambient address | Use `WorldService.say` and ordinary event/perception recording. Addressing someone does not guarantee that they heard it; actual observers appear separately. |
| Act | `actorId` and either a supported command intention or a prepared native action choice with exact bindings | Use `previewCommand` / `prepareCommandChoice` / `command` as appropriate, then normal grounding, action admission and execution. A preview is not a successful effect. |
| Event | A supported owner-authored event intention, its native subject/target references and required typed data | Apply through the corresponding creator/domain owner. The emitted event carries operator-authored provenance and native perspectives. Unsupported event text remains a clearly labeled contextual experiment, never a claimed physical effect. |

Selecting an Act does not imply that arbitrary source text is a supported native action. Existing generative grounding may propose a mapping; it must still resolve to the shared catalog and pass admission. Distinguish input accepted, interpretation pending, interpreted choice, command admitted, action started, action completed, refused and unavailable. If the game needs a clarification, preserve that result in the lab; do not manufacture a successful command.

The operator may submit a stimulus as one character while inspecting a different character and focusing the response on a third. The request records all three bindings. The focal actor is whose immediate response defines One response; other autonomous actors retain their actual eligibility and captured outcomes within the chosen run policy.

### 8.2 Run policies and guards

A run policy contains mode (`oneResponse`, `untilCondition`, `forDuration`, `continuous`), focal actor when required, a typed stop condition, autonomous participant IDs, requested simulation duration, active-wall guard, maximum newly dispatched model calls and current authorized spending allowance reference. The policy is validated and displayed before work begins. The run records the requested and effective values plus any constraint that reduced them.

[CLL06](../limits/cognition-lab.md) owns proposed numerical defaults and their qualification status. Its time, call-count and active-wall guards are different from monetary spending authority and per-provider deadlines. Reaching a guard ends with Run limit reached; it must never be represented as an actor choosing silence. Already admitted work settles or cancels through its owner, and no new work is dispatched after the stop gate closes.

Continue explicitly opens a new displayed guard interval on the same retained run. It does not reset paid accounting, erase previous interventions, refund calls or recursively continue by itself. Run until stopped is a deliberate continuous mode with visible bounds, not a hidden unbounded loop. Advance time uses the ordinary clock path and tells the operator whether autonomous cognition is enabled during the interval.

### 8.3 Effective inference configuration

Run configuration is a nonsecret snapshot derived from the ordinary installed settings. It includes model/provider route per supported purpose, requested model identity, effort and output settings, escalation policy, actual judgment/rubric/instruction identity, relevant context inclusion settings, prompt template identity, native seed/state origin, active capabilities and the run guards. Capture both requested and actual reported model/deployment identity where the adapter exposes them.

Changes apply to the lab run or named variant, never the live game's global config. A request's supported settings are validated before its existing cost reservation. A model/provider choice must resolve through configured server routes; no arbitrary endpoint, API key, hosting credential or permission override is accepted from a payload editor.

For `JudgeRequest`, the captured application input includes `state` and the complete typed `questions` map, including each question's instructions, choices/criteria and answer kind. For `GenerateRequest`, it includes `task`, `instructions`, `context`, `schema`, `schemaName` when present, model/effort/output bounds and supported execution/output-mode choices. Effective adapter settings omitted from these typed objects are captured alongside them. The reference tables actually included in state/context are part of the captured request; their executable reverse bindings remain server-owned.

Retain both the editable application request and any actual provider input/output capture emitted by the adapter. Label an adapter capture unavailable when it does not exist; never call a reconstructed prompt exact wire input. Neither receipt output nor UI explanation includes hidden provider chain-of-thought. Record actual supplied rationales and application deliberation only.

### 8.4 Serial experiments and native randomness

A serial A/B experiment restores the same full starting checkpoint before each variant, then applies that variant's declared settings or scenario edits and runs the specified stimulus/episode. Each result records its origin and exact differences. The final variant's resulting state remains the current lab state, visibly labeled; restoration afterward is an explicit action.

Preserve the native saved RNG continuation, simulation clock and current work state when cloning/restoring an origin. Reusing a seed alone does not prove equal state after different preceding events. Remote-model answers and completion ordering may vary despite identical captured inputs; comparisons show observed differences rather than claiming determinism or causal statistical significance from one pair.

Expectation notes, quality tags and operator scores do not enter character inputs automatically. Episode evaluation may include repeated runs or an explicitly requested evaluator model as a separately budgeted/captured stage. No automatic extra paid judge is necessary for a single speech test or for opening a comparison.

## 9. Capture, causality and historical inspection

### 9.1 Actual graph, flat presentation

Store the actual operation graph: a root for the stimulus/decision, stable stage/attempt IDs, parent/dependency IDs, actor, purpose, kind, start/finish/held times and terminal disposition. A judgment, generation, memory retrieval, action admission, publication or maintenance step may appear only when it actually occurred. The UI renders the graph as a flat ordered list with relationship badges and filters; storage identity must not force a recursive tree UI.

Do not hard-code a mandatory attention → routing → action → speech sequence. Existing branches can include fast decisions without generation, action scoring only after a speech/action gate, failed/skipped routes, memory work and independently scheduled maintenance. A missing stage can mean not needed, not admitted, not captured or unavailable; expose the actual reason when known, and preserve unknown when it was not recorded.

The root summary joins the submitted occurrence to perceived stimulus, selected response/disposition and accepted native effects. It remains understandable without expanding every call. A historical selected root or stage reads only captured records and never re-executes context builders against the current actor.

### 9.2 Minimum captured evidence

| Evidence group | Required contents |
| --- | --- |
| Input origin | Scenario/checkpoint, stimulus identity, exact actor/target/focal bindings, native time, current revision, actual observer/perspective refs and any authored intervention. |
| Preparation | Actual context source identities/revisions, selected values/text, available candidate/omission reasons, applicable role/prompt/rubric/definition identities and source completeness. |
| Submitted request | Complete actual application request, supported effective parameters, actual transmitted reference tables, original versus override, actual adapter capture if supported. |
| Response | Actual provider/model identity, raw captured response where available, normalized output, schema/parse failures, returned confidence/scores/options and existing receipts. |
| Admission | Proposed intent, resolved native choices/targets, current-source checks, accepted/rejected disposition with actual reason. No invented rationale. |
| Publication | Actual emitted speech/events, started/continued/stopped work, native effects, recorded memory/awareness and before/after values where their owner exposes them. |
| Cost/time | Existing request/attempt identity, reservation, actual or explicitly estimated cost, known/pending/uncertain settlement, tokens if reported, active processing time, operator hold time and native latency when available. |
| Completeness | `complete`, `partial` or `unavailable` per group plus a reason; never use an empty list or zero to imply that unrecorded work did not exist. |

A context selection manifest is a shared cognition-context deliverable where needed, not evidence that all planned SC tasks already exist. Add the minimum shared source/result hooks for the lab's implemented stages. Keep their records compatible with the cognition-context project's intended provenance and budget accounting. Rich omitted-candidate evidence must be captured at selection time; do not reconstruct candidates later by rerunning retrieval.

Current-stage scalar or source comparisons show both captured values and an explicitly labeled current projection. They are separate views. Context-field text, source SQL, model-facing references and creator-only truth are not interchangeable labels.

### 9.3 Retention and costs

A run record retains its bounded exact request/response evidence independently of the transient diagnostic log. Reuse existing receipts and log identifiers; do not create a second financial ledger that can disagree with settlement. Aggregate each unique actual attempt once across root, stage and run totals. Retries, embeddings, reflection/harness work and uncertain completion remain attributable when dispatched in the run.

Unknown cost is not zero. Estimates retain their pricing basis. A cancelled display row does not erase a provider request that may have executed, and a rewind does not refund or redispatch it. A request comparison adds new cost to its own result and the current allowance, never to the old recorded run.

Loading older evidence is read-only and free of model work. Annotation saves update only annotation records, not captured inputs/outcomes. Immutable evidence here means the app does not silently rewrite an experiment; it does not require a tamperproof archival subsystem or indefinite storage.

## Maintained records

- Feature and user journeys: [Cognition Lab feature specification](cognition-lab-feature-spec.md).
- Implementation, dependencies and acceptance: [Cognition Lab tasks](../maintainers/cognition-lab.md).
- Numerical and behavioral limits: [Cognition Lab constraints](../limits/cognition-lab.md).
- Shared contracts: [memory architecture](../memory-architecture.md), [action capabilities](../action-capabilities.md), [save/load](../save-and-load.md), [identity](../identity-and-references.md), [AI providers](../ai-providers.md), and [engine/world boundaries](../engine-and-world-boundaries.md).

