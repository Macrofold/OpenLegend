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

Only the payload modal's Submit sends its replacement envelope with that handle. Ordinary composer Submit has no override parameter and always prepares from the current scenario. Closing the modal discards its override draft; it does not leave a persistent hidden override. Applying a left-panel edit invalidates prepared handles before further dispatch and visibly disables their Submit action. Restore, scenario load, principal change and runtime replacement do the same.

Provide Restore original and an original/edited difference view. The server retains original and actually submitted requests separately. A run's summary states whether it used ordinary inputs, model-only context additions, a stage override or several explicit interventions.

### 6.4 Human wait and deadlines

A breakpoint is reached before dispatch of its selected call. No provider call is suspended mid-request. Operator editing time must not consume that call's provider timeout. Existing calls already in flight keep their real deadlines and settlement semantics.

When a lab gate holds a prepared operation, the shared decision timing owner records the start/end of the operator hold and shifts only that undispatched operation's lab-relative preparation/publication deadline by the actual hold interval. Do not patch `Date.now`, `performance.now`, global timers or provider clocks. Introduce one explicit timing operation on the existing decision owner and use it for all deadline fields that represent the interrupted operation. A normal game request never invokes it.

This is an explicit timing intervention, captured in the run, and therefore cannot qualify ordinary production latency. No already-expired operation is revived; cancellation, changed evidence or actual in-flight expiry still invalidates it. If another admitted operation changes a dependency while the selected call waits, invalidate the handle and offer explicit re-preparation. Do not silently recompute the request under the old handle.

### 6.5 Replay and rerun

Replay displays previously captured inputs, outputs and effects without inference or mutation. Rerun captured call creates a new run from the recorded prerequisite checkpoint/inputs and submits a new request under current compatible runtime and configured allowance. It never edits the old run.

A captured-call rerun is labeled as testing that stage. A complete-scenario rerun executes perception and earlier selection again. Neither is claimed to reproduce remote model answers exactly. If the saved data is incompatible with the current runtime, it remains unavailable for execution under the development policy; no compatibility engine is added.

## Maintained records

- Feature and user journeys: [Cognition Lab feature specification](cognition-lab-feature-spec.md).
- Implementation, dependencies and acceptance: [Cognition Lab tasks](../maintainers/cognition-lab.md).
- Numerical and behavioral limits: [Cognition Lab constraints](../limits/cognition-lab.md).
- Shared contracts: [memory architecture](../memory-architecture.md), [action capabilities](../action-capabilities.md), [save/load](../save-and-load.md), [identity](../identity-and-references.md), [AI providers](../ai-providers.md), and [engine/world boundaries](../engine-and-world-boundaries.md).

