# World-agent invention tools

**Status: accepted application contract with finite shared reads, reviewed writes and native Macrofold execution implemented.** The [world-authorized reader](architecture.md#repertoire-relationship-and-mcp-foundation), seven-kind authoring service, unified conversation and exact human workspace are delivered subsets; general composition, impact jobs, art and deployable-build qualification remain separate. Both local HTTP/UI and [MCP transport](world-agent-mcp.md) use these existing owners. [World Agent runtime](world-agent-runtime.md) owns unified conversation/session execution, [composition](invention-composition.md) owns kind integration, and the existing INV tracker owns delivery.

## 1. The boundary

There is one OpenLegend application tool service, not one service per harness. It routes typed operations to existing definition, draft, graph, validation, asset, job, budget and native-action owners. It may consist of several ordinary modules in `apps/server`; logical separation is not a microservice requirement. MCP and local HTTP are thin adapters. No tool implements a second world writer, permission system, wallet or mutable graph registry.

The World Agent is an out-of-world assistant. It has the full **authorized world-level** inspection scope needed to investigate mechanics, dependencies, effects, materials, history, affected instances and relevant NPC state. Do not bind that scope to the current character's knowledge, sight, health or proximity. Drafting can continue while the character is dead or the world is paused when the caller's administrative scope permits it; ordinary embodied actions retain their own prerequisites.

An embodied NPC may reuse selected application operations under a separate actor profile. That profile is not the World Agent's default. It cannot inherit creator transcripts, world-wide evidence, credentials, or administrative capabilities. World-wide inspection never includes unrelated worlds or ungranted real-user/private-account data.

## 2. Read, prepare, and apply are separate powers

Inspection, draft modification, validation, optional paid work, activation, instance action, freeze administration and budget administration are distinct privileges. The authority service resolves them from current world grants, the initiating human/actor and the admitted session—not from tool arguments or a fictional title.

A World Agent can inspect more than it may change. Ordinary invention still preserves player/agent origin, locks, knowledge/discovery rules where applicable, and explicit creator authority for shared laws. A creator installation need not impersonate a living inventor actor or automatically teach one. Extend the existing admission contract with a server-bound creation mode; do not bypass it with direct writes.

When world-level evidence is not authorized for the human recipient, use a privileged deterministic validator or separately scoped private review and return only permitted findings. Do not expose restricted text to the conversational model and rely solely on a prompt to hide it. For the initial single-owner world, the owner and World Agent can share the granted world-administrative view; multi-user disclosure remains explicit.

## 3. Initial tools and scope

The earlier `catalogue`, `materials`, `recipes`, `inspect_recipe`, `inspect_modules` and `validate` operations remain a separately actor-scoped profile; they no longer describe the whole implemented service. The world-level reader and session-bound authoring dispatcher supply the operations registered by their current descriptors, including selected-kind submissions across seven supported kinds. Current names and payloads come from those shared descriptors, not this broader target catalogue. [INV-21](maintainers/inventions-and-world-evolution.md#inv-21--reviewed-mcp-authoring-and-unified-native-execution) and [WW](maintainers/world-agent-writes.md) distinguish their delivered scope from remaining work.

Use semantic verbs and a bounded set of tools—not a tool per invented object. Fields shown below are an intended v1 contract; generate strict schemas from the actual service schemas during implementation. All calls carry a server-issued `contextHandle`; writes also carry an `operationId` and appropriate expected revision. Neither value grants broader authority than its verified binding.

| Tool                  | Essential input                                            | Result and effect boundary                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ol_context`          | Context handle                                             | World/session purpose, authorized capabilities, current constitution references, selection, budget status, available definition kinds and limitations. No whole-world dump.                    |
| `ol_find`             | Query, kinds, filters, cursor                              | Authorized lexical/semantic candidates with exact refs and match basis. Distinguish unavailable search; paid embedding work requires session admission.                                        |
| `ol_inspect`          | Exact ref, sections, cursor                                | Complete reachable artifact semantics: schema, ports, parameters, reads/effects, resources, lifecycle, observations, presentation, provenance and evidence. Large sections page independently. |
| `ol_graph`            | Root ref, relations, direction, snapshot/cursor            | Typed neighborhoods/paths from the common graph, with scope/completeness/provenance. Never claims complete interaction validation.                                                             |
| `ol_impact`           | Candidate ref, scope, cursor/job                           | Mandatory dependency/change analysis with coverage, affected consumers and unresolved requirements. Large work returns a durable job.                                                          |
| `ol_instances`        | Definition/install ref, typed filters, cursor              | Authorized current instance/process summaries and revision; exact sensitive records require their own access check.                                                                            |
| `ol_history`          | Refs, event kinds, time range, cursor                      | Relevant committed outcomes, conditions and source links; separate hypothetical evidence and private interpretations.                                                                          |
| `ol_draft_create`     | Project ref, intent, optional base ref, kind               | New candidate revision under existing session/project authority. Does not create a new budget automatically.                                                                                   |
| `ol_draft_read`       | Candidate ref, sections                                    | Selected revision, retained alternatives, pinned constraints, unresolved choices and validation references.                                                                                    |
| `ol_draft_update`     | Candidate ref, expected revision, kind-specific changes    | New immutable submitted revision or editable draft update under its owner; no arbitrary world patch.                                                                                           |
| `ol_compare`          | Two exact refs, sections                                   | Typed and plain-language diff, material changes and affected scope; not an activation plan by itself.                                                                                          |
| `ol_validate`         | Candidate ref, requested depth                             | Native checks plus admitted semantic/scenario work; report shows actual coverage and approval readiness.                                                                                       |
| `ol_scenarios`        | Candidate ref, registered scenario IDs/parameters          | Isolated provider-disabled execution by default; seeds, counterexamples and resource limits. No arbitrary executable test code.                                                                |
| `ol_preview`          | Candidate/plan ref, view                                   | Readable mechanics, affected scope and visual preview references, clearly marked hypothetical.                                                                                                 |
| `ol_change_prepare`   | Candidate ref, target install/scope, intended operation    | Immutable change plan covering dependencies, migration, consequences, required grants and review. No live change.                                                                              |
| `ol_approval_request` | Change-plan/art ref, question                              | Creates a review card under existing authority, never marks it approved. Identical requests reuse the same card.                                                                               |
| `ol_change_apply`     | Exact plan ref, expected installation revision             | Checks stored approval or existing low-impact authorization, current scope and generation; commits once through existing activation.                                                           |
| `ol_action`           | Controlled-actor or creator-action handle, typed arguments | Schedules an explicitly permitted native action; receipt distinguishes accepted, running, blocked and completed. No actor-ID authority injection.                                              |
| `ol_art_request`      | Candidate/visual ref, purpose, approved references         | Admits compatible rough/refinement/redesign work within the same session allowance; returns a job and existing fallback.                                                                       |
| `ol_art_inspect`      | Asset/job/requirement ref                                  | Technical/visual findings, actual preview references, compatibility, rights and readiness.                                                                                                     |
| `ol_art_select`       | Exact candidate/asset refs, expected binding revision      | Selects or proposes a compatible binding through the art owner; required human review cannot be fabricated.                                                                                    |
| `ol_job_get`          | Job ref, progress cursor                                   | Durable job/result/receipt, completeness and suggested revisit time. Polling does not dispatch work.                                                                                           |
| `ol_job_cancel`       | Job ref, operation ID                                      | Requests cancellation and revokes publication where authorized; shared consumers and uncertain cost remain accounted.                                                                          |
| `ol_budget`           | Session handle                                             | Used, reserved, uncertain and available amounts by purpose, plus higher-level constraints. Read only; no agent increase-limit tool.                                                            |

Read catalogues should not expose nonexistent mutation tools. A discovery entry can say unsupported and name its missing host capability. Resource inspection and graph traversal never execute source code. Optional future source inspection is separately granted and bounded; gameplay definitions generally have no scripts.

## 4. One optional bounded investigation

Unified conversation can perform deep investigation without forcing it on a simple request. Deterministic reuse or a complete supplied candidate stays on the short path. A capable Macrofold harness chooses successive tools, explains important tradeoffs, revises candidates and asks consequential questions. Native Macrofold authoring is already delivered for the finite session-bound tool set. Separately scoped structured inference and supplied-candidate entrypoints retain their actual purposes; they are not a transparent fallback for native authoring or proof of native tool interoperability.

Use actual tool results and exact refs. A model can request another page, inspect an interface, review a failed scenario, or retain an alternative. A final assistant message can be ordinary prose; it does not need to hide a whole candidate in a strict final-response envelope. Durable draft tools and receipts carry state. A `done` statement without an installation receipt is not installation.

## 5. Explicit Apply and revision continuity

The UI may render approval cards inline in one conversation. There is no required switch from Discuss into a different tool-enabled mode. Low-impact changes already covered by explicit invention intent and policy may activate automatically. Shared-law replacement, destructive instance edits, freeze changes, conjuring and expanded scope require the relevant approval.

An approval record binds principal, world/generation, exact plan/candidate digest, base versions, scope, consequences and funding authorization. The human approval mutation is **not** exposed as an agent tool. The agent may request or read an approval, then apply the exact approved plan. A conversational claim that the user said yes is not an approval receipt. New material consequences require a new plan and review.

Apply uses stored bytes and the existing domain mutation. Repeated operation IDs with identical fingerprints return the original receipt; different bodies conflict. Parent/revision checks prevent concurrent edits from spending or publishing twice. Returning to an older draft does not restore old authority, reset charges, or override a newer selected revision.

### Implemented human saved-work interface

The [PW11 workspace](maintainers/parallel-batch-01-playable-week.md#pw11--inspectable-and-editable-invention-workspace) is an implemented local client of the existing session/draft/receipt owner. Conversation and Work retain one session identity. Work reads exact revisions, paged revision history, exact comparisons and reviews for the selected revision; it does not treat the latest session summary as complete historical evidence. All seven existing authoring kinds expose native summaries, source requirements, supported consequences, failed/pending checks, unresolved dependencies and safe exact values. Structural comparison describes changed submitted values, not a claim that every interaction or balance question has passed.

Direct human editing is currently limited to recipe fields described by the installed native family owner. The server supplies editable field paths, labels, units, choices and generic constraints, plus compiler-derived facts; the browser neither copies family formulas nor treats its disabled buttons as authority. Preview checks the full local candidate without saving it, Check reads the exact saved revision, Save creates a new immutable revision, and Prepare creates an exact review for separate human approval and Apply. Those native operations require no provider call. A changed recipe needs fresh review and cannot reuse approval for a previous revision.

New human Save, Prepare, approval/rejection and Apply are gated by the native session owner while an authoring turn is active/recovering or a question is unanswered. Current permitted inspection, Preview and Check remain read-only. Earlier retained Save/Prepare/Apply outcomes reconcile under the original identity before new-mutation admission; a closed/expired session or newer selected draft does not turn a previously committed receipt into a second effect. Current authenticated disclosure is still required. Local recipe fields are device drafts, scoped by world/access/session/draft/revision; explicit discard clears them, and stale saves require deliberate comparison/reapplication while preserving attempted input. A device draft’s permitted namespace excludes page ID and control revision, so pausing/resuming the same character preserves input; changed session, grant, character or world timeline still invalidates it. This namespace grants no request authority: network requests retain the complete current scope. [IW02](limits/interface.md#iw02--invention-workspace) owns page bounds and supported-edit scope.

Ordinary players receive their permitted learned recipes with actual native output, materials, derived facts, limitations and Craft. They do not receive owner-session drafts, validation/approval controls or creator authority. [Native authority/receipt evidence](verification/parallel-batch-01-playable-week-engineer-4.md#pw11--exact-saved-work-and-native-receipt-authority) includes seven-kind V2 reads, paging, expiry, delayed revocation and PostgreSQL reopen; client dirty/late/input cases and actual streaming remain separate unfinished qualification. [INV-21](maintainers/inventions-and-world-evolution.md#inv-21--reviewed-mcp-authoring-and-unified-native-execution) and [WW](maintainers/world-agent-writes.md) retain the broader service, deployment and release gates; this client implementation does not qualify a live provider or close their remaining work.

<a id="6-cognition-and-world-semantics"></a>

## 6. Shared request and result model

The trusted context resolves the authenticated connection/principal, world and generation, audience, originating actor where applicable, session/project, payer, maximum grants, deadline and request correlation. Tools cannot accept authoritative replacements for those fields. A selected entity ref is an object to inspect, not a grant to control it.

Use strict input schemas with bounded strings/arrays, explicit enums for protocol discriminants, and registered IDs for world-defined kinds. Reject irrelevant fields. Definition payload schemas come from their actual kind adapters. Validate output too: malformed results must not bypass recipient scope or silently become plausible text.

Common result shape, independent of MCP version:

```json
{
  "status": "ok",
  "summary": "The candidate uses the current rain-exposure interface.",
  "data": {},
  "refs": [{ "kind": "definition", "id": "shelter:cover", "version": 2, "digest": "..." }],
  "snapshot": { "worldId": "w1", "generation": "g4", "manifestRevision": 12 },
  "coverage": { "scope": "requested_sections", "status": "complete" },
  "nextCursor": null,
  "findings": [],
  "job": null,
  "receipt": null
}
```

`status` distinguishes success, pending, needs input/approval, blocked, stale, unsupported and failed. Findings use stable codes, severity, evidence refs, affected requirement and a permitted next action. A genuine invocation/protocol error differs from a valid validation result containing failures. Coverage is specific to the requested evidence; it is not a global safety score.

A large result returns a compact summary and pageable refs, not an unannounced truncation. `ol_inspect` can reach all authorized sections. Tool output may include safe asset handles; image bytes and signed URLs are provided only by the asset owner and are never the sole durable copy.

## 7. Growing beyond recipes without a second interpreter

[Composition](invention-composition.md) defines kind adapters for discovery, editing, compilation, impact, preview, activation and cognitive projection. Extend attributes/senses through their real owners, then a compositional family, then passive systems and shared-law migration. The common conversation, MCP transport and budget identity should not change for every kind.

[Graph](invention-graph.md) owns the relationship representation; [validation](invention-validation.md) owns which relationships require checks. Descriptive `reads`/`effects` metadata is not enough to assert an enforced graph. Keep extraction coverage explicit until the host contracts supply the required evidence.

## 8. Player comprehension and truthful progress

Lead with what the player is trying to accomplish. Explain what was reused, important costs/materials, changed behavior, limitations, and the next meaningful decision. Offer Details and Graph drill-down rather than require schemas or terminology. Separate preparing, validated, awaiting approval, installed, and crafted. Native summaries take precedence over model claims.

Questions are for conflicting requirements, meaningful design tradeoffs, changed rights/cost/scope, and irreversible consequences. Ordinary field names, pagination and routine codec choices are implementation details. Progress reflects real job states, not invented percentage estimates. Use the accepted abstract usage-remaining presentation; underlying money and purpose accounting belongs in owner spending details, not the creation flow. The default workshop-session cap and separately billed shared Worker capacity remain in [the runtime funding contract](world-agent-runtime.md#1-product-decisions). Future image work must join attributable session accounting before enablement, without a compulsory separate image budget.

## 9. Cost and performance constraints

Use the existing ledger and the [session contract](world-agent-runtime.md). A read-only native query does not start a model job. Potentially paid search, validation and art require admission even when they do not change game state. The same invocation is counted once across session/project/purpose dimensions.

Perform queries and heavy preparation outside the world writer. Use immutable revisions and short fresh checks for final mutation. Do not poll every registry each tick or serialize whole artifact trees into every model turn. Pagination and bounded jobs provide full reachability without unbounded requests. Essential physical effects and privacy checks are not optional cost optimizations.

## 10. Delivery boundary

The real harness must demonstrate tool discovery, meaningful multi-turn investigation, exact draft/approval/apply, and coherent restart/cancellation under the actual Macrofold deployment before calling this integration live-ready. Inspector success and an injected model response are distinct evidence. The [scenario packet](invention-scenarios.md) and [MCP research](../archive/02-research/mcp-tooling-and-integration.md) guide the rollout.

The service can first register only implemented kinds while reporting the rest as unsupported. Do not ship empty generic interfaces and mark general mechanics authoring complete. The creator/special-player authority target is already accepted but still awaits INV-1.7/MP02 admission and persistence. [The constitution](world-constitution.md#41-who-can-control-what) distinguishes that target from current enforcement; no documentation target creates a lock bypass, an NPC owner-tool grant or permission to inspect another human's private evidence.

## 11. Minimal implementation shape

Keep the registry in the application layer as a small typed table: operation name, input/output validators, description/annotations, required grants, cost category, handler and supported kind adapters. The dispatcher constructs `ToolContext` from authenticated principal, world/generation, recipient, funding session and cancellation; the caller cannot construct that authority from JSON. Handlers return a typed value, finding, job or receipt. MCP merely serializes it and the UI renders it.

Use the existing repository for drafts/jobs/receipts and a replaceable graph reader for index queries. Kind adapters call existing domain owners. Separate `read`, `prepare` and `commit`: a read must not mutate, a prepared change has no live effects, and commit receives the reviewed exact plan plus fresh state. Do not create an inheritance framework, arbitrary plugin loader or universal effects object. Add one registration where a real new operation is needed.

Catalogue descriptions explain when to use an operation and its non-effects. For example `ol_validate` returns native findings or a retained analysis job; it does not install a definition, consume fictional ingredients, teach an NPC, or approve itself. `ol_action` is an explicit native-action intention scoped to an authorized controller and current target; it is not a general world-state patch.

MCP request IDs, native action IDs and external provider attempt IDs remain distinct. Propagate correlation for inspection, but only the owning durable receipt determines whether an effect was committed. Log bounded summaries and exact refs rather than every private payload.

## Activity and repertoire integration

The shared service must consume [AC invocation/activity contracts](action-capabilities.md), not restrict ordinary use to pre-enumerated action handles. [Repertoire foundation](repertoire-foundation.md) specifies live/evidence relationships, shared participation, observer-relative presentation and information/social records. Activity inspection can precede new start/modify tools; only implemented operations are invocable.

## Implemented world-level read profile

`WorldToolService` is shared by the local owner inspector and read-only MCP endpoint. It exposes context, lexical definition lookup, exact definition/live/evidence inspection, one-hop graph navigation, current native item instances, retained actor evidence, current activity and unpaid finite recipe validation. Its descriptors generate both transports' discovery/input schemas. Existing actor-bound tools retain their earlier restricted profile; this new grant never becomes an NPC knowledge source automatically.

This profile is an interim subset of the unified service contract, not another world registry or permission engine. The [architecture](architecture.md#repertoire-relationship-and-mcp-foundation) owns exact current coverage and caps. The finite draft/review/Apply/native-command and session-funding adapters are delivered under INV-21, with real local Macrofold journeys; bounded definition tracing and entity discovery are delivered under WW12/WW13. General impact closure, advanced art and broader kind composition remain INV-15/17/20 work, while WW07/WW11 retain deployed and sustained qualification. `ol_inspect` accepts actual exact-source refs; reference-only nodes may require a future authorized archive reader. A cursor/source failure must not be described as a nonexistent mechanic. WW11 also retains the source-identified private-subject authorization gap after awaited storage reads; checking only the reader's current grant does not establish current permission to disclose the inspected actor's evidence.
