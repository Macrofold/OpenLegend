# Unified World Agent runtime

**Status: accepted target design.** This document owns unified conversation, session funding, execution-adapter behavior, context continuity and approval orchestration. The [tool service](invention-workshop-tools.md), [MCP binding](world-agent-mcp.md), [graph](invention-graph.md) and [composition](invention-composition.md) own their respective contracts. Current implementation remains in [Architecture](architecture.md), including the [read-only graph/MCP bootstrap](architecture.md#repertoire-relationship-and-mcp-foundation); it is not a connected native-harness or funded mutation session. Delivery is INV-16/18 with existing subsystem owners.

## 1. Product decisions

One World Agent conversation can discuss, investigate, design and perform permitted actions. Request approval only when the action policy requires it. Do not force players to discover a second, more capable Workshop mode. Keep ordinary action/catalogue shortcuts and supplied proposals; they need not purchase a model turn.

A new explicitly funded workshop session has a **$5 total allowance including image generation**. It covers attributable LLM/Jev inference, Macrofold compute/service charges, embeddings, art and validation work. Show purpose breakdowns but impose no separate mandatory art allowance or fixed percentage split. Existing higher-level payer/world limits still constrain dispatch. A configured operator value or user-approved lower cap remains authoritative; old sessions retain their admitted caps.

Capability is the current priority. Use a capable configured model/harness and enough turns for real investigation, rather than mandatory cheap routing or model committees. Cost optimization is a separate later workstream; accurate accounting, bounded work and no hidden retries are immediate requirements.

## 2. World Agent versus inhabitants

The World Agent is an out-of-world assistant with authorized world-wide mechanics/evidence access. It is not an NPC, need not have a body, and must not inherit `controlledEntityId` perception or recipe-knowledge restrictions. It can inspect complete definitions, materials, interactions, history, affected instances, and relevant private NPC state when world grants allow it.

Its write scope remains the initiating account's permitted operations. Ordinary player invention, creator law editing, conjuring and directing a character are distinct actions within the same conversation. A broad read grant is not permission to edit frozen laws, spend another payer's funds, or expose unrelated worlds and real-user private data.

NPCs use separately scoped cognition and tools. A private NPC investigation cannot read this World Agent session or its administrative evidence. Technical validation can inspect the authoritative world under its own grant while returning sanitized actor feedback; such feedback does not create memories of hypothetical experiments. In multi-user worlds, disclosure to a human recipient must match that recipient's grants, not just the assistant service principal's maximum access.

## 3. Durable identities and ownership

Distinguish conversation, funding session, invention project, candidate revision, agent run, tool operation, approval, installation and visual binding. A conversation can revisit older projects; doing so does not reset their costs. A single creative project may span multiple deliberately funded sessions with retained lineage.

Persist a session record with world/principal/audience, initiating purpose/origin, selected project/revision, funding limit and ledger scope, policy/config revision, provider mapping, active operation, pending questions/approvals and monotonic message/progress sequence. Secrets remain in the server/connector credential store. A model-written workspace file is not an authoritative draft or approval.

The UI creates/resumes the session through an authenticated application action. A reconnect or panel reopen does not create another $5 allowance or dispatch a run. A new funding episode requires an explicit user operation; per-payer/world caps prevent root-spamming. Serialize submitted turns within a conversation. Allow bounded concurrency between conversations without sharing unpublished drafts or provider histories.

## 4. Execution adapter

Use one `WorldAgentExecutor` boundary: start/resume an admitted turn; inspect progress; cancel; obtain a terminal receipt. The application passes a bounded purpose/selection brief, scoped tool connection, continuity refs, model/harness policy and a resource allocation. The adapter returns actual assistant/tool activity and usage with stable correlation IDs. It does not install definitions or decide that approval exists.

The preferred executor is a **native Macrofold harness with OpenLegend registered as an MCP connector**. The existing app-executed structured-inference loop is a transitional adapter, not equivalent proof of native-harness support. Retain that path only while useful for known finite recipes; never silently substitute it when the requested capability requires tools it lacks.

The agent may produce ordinary explanatory prose, ask a question, or invoke tools in any useful order within its grants. It should save drafts through tools before a run ends. Final prose is not parsed as a covert mutation command. Tool results and server receipts, not the provider's final answer, determine task status.

## 5. Macrofold provisioning and continuation

Provision a dedicated authorized workspace/preset and OpenLegend connector using actual Macrofold APIs/SDKs. Reuse existing OpenLegend provisioning and operation journals; do not make another client with different retries. Select the exact connector/tool ceiling and deny unrelated shell, filesystem and external connectors unless a specific granted need justifies them. The agent needs world tools, not root access to the world database.

Map the application session to remote worktree/session/run identities. A warm worker can be reused without merging conversations. A new world generation, reduced disclosure scope, or incompatible permission configuration requires fresh model context: old remembered secrets cannot be revoked by editing a system prompt. Retain safe project continuity from application records.

Persist admission before external run creation. Unknown completion is reconciled by original operation identity or left explicitly uncertain; never buy a second run just because the response was lost. A late terminal result can settle costs, but cannot publish a stale candidate. Completed job notifications wake application eligibility, not arbitrary remote execution.

Do not hold an idle paid harness waiting for a person or a long art/validation job. Retain the pending question/job reference, end or suspend the provider run where supported, and resume via a new admitted turn with the same funding-session identity. Exact suspend/reuse behavior must be qualified against the selected Macrofold harness; it is not assumed from API names.

## 6. Context and reasoning continuity

Initial context contains the user's goal, current selected project/revision, pinned preferences, pending decisions, concise world constitution/capability summary, budget state and tool instructions. It does not contain every definition or private memory. `ol_inspect`, graph and evidence tools can reach all authorized information needed over successive calls.

Retain a compact working record of accepted constraints, decisions, unresolved findings and evidence refs. Provider compaction may summarize explanation but cannot overwrite canonical selections, approvals, failure findings or materials. Rebuild authoritative facts from tools on resume. Never spend a turn merely to repeat a readily available native catalogue.

The agent should distinguish fact, hypothesis, supported approximation, unavailable data and unsupported computation. It can propose an experiment; only a real permitted action creates in-world evidence. A failed image provider is not a failed physical invention.

## 7. Interaction and approval

An explicit simple invention can authorize low-impact activation within its current envelope. Read/draft/refine/validate operations ordinarily proceed without repeated modal confirmation. Consequential shared-law migration, destructive modification, freeze changes, conjuring, elevated disclosure, and expanded funding require the corresponding review.

The application builds a review card from exact plan/artifact data: what changes, affected scope, important assumptions, preserved/lost state, estimated/maximum cost, and reversibility. Only the authenticated human/authorized approval surface creates its approval receipt. The model cannot call an `approve` tool or claim consent on the user's behalf.

Apply rechecks that receipt, exact revisions, current grants and runtime preconditions. Partial approval selects an explicit subset only if it is dependency-closed and separately valid; otherwise prepare a new coherent plan. Keep already active versions until a compatible replacement commits. Cancellation after activation is not historical undo.

## 8. Shared $5 allowance and external runs

All work belongs to the session ledger, including images requested by tools while the native harness is running. Track reserved, uncertain, settled and available amounts separately. Existing workshop root caps are only a subset of this end-to-end enforcement.

Before starting a Macrofold run, reserve its enforceable maximum model/compute exposure as one allocation. Before starting an image or external validation job, reserve its separate maximum from remaining capacity. Child receipts settle the corresponding allocation once; never add a provider's included cost again as an additional platform charge.

Avoid reservation deadlock: a model run that holds the entire remaining allowance cannot also spend that held amount on an image. Allocate bounded run slices based on the planned next work, with no permanent image percentage. If a requested tool needs capacity held by the current run, return a funding-rebalance pause, terminate/quiesce that run, reconcile its unused allocation, admit the tool, then resume. Do not release uncertain exposure just to continue. A coordinated provider-side shared budget could replace this only after its exact semantics are qualified.

If costs cannot be conservatively bounded or reconciled for a provider, expose that limitation and block strict-cap paid enablement for that path; local estimates alone do not guarantee a hard $5 ceiling. Reaching the limit retains drafts and usable assets. Status reads, settlement and publishing an already funded valid result do not purchase a new generation.

## 9. Capability-oriented limits

Target a configurable initial profile of 32 model turns per active investigation slice, 128 tool calls, up to 8 independent reads in one group, 192 KiB retained model-context payload, 48 KiB ordinary tool-result payload, and 8,192 requested output tokens per generation where the selected model supports them. These are generous starting operational guards, not measured guarantees or currently implemented defaults. The chosen provider/transport may impose a lower ceiling, which must be disclosed before dispatch.

Large artifacts/graphs remain fully reachable through paging; a response limit is not a knowledge limit. Long analyses use resumable jobs. Monetary/deadline exhaustion can stop earlier. Do not parallelize dependent edits/approvals; only independent reads or isolated jobs run concurrently under host capacity. Later tuning belongs in the separate optimization task, not hidden cost-saving degradation of capability.

## 10. Progress, errors and recovery

Display actual progress milestones: investigating, draft retained, validation incomplete, waiting for choice, approval needed, installed, art pending, or blocked. Show links to exact findings and the dependency graph. Do not claim a model is executing an action when it only proposed one.

Error handling is state-specific: correct an invalid output; revise an inconsistent design; retain an unsupported idea; reconcile an uncertain external attempt; refresh a stale plan; quarantine a faulty active mechanic. No single retry button should secretly regenerate everything or reapply committed state.

Loading a save fences old contexts, tools, cursors, approvals and callbacks through current generation. Costs, external operation identities, current revocations and safety quarantine remain non-rewindable. Historical projects can be inspected with proper scope, but resuming into the new timeline requires new current authorization.

## 11. Release evidence

Before enabling the native harness, demonstrate actual tool discovery/invocation, structured results or their faithful text fallback, multi-turn draft revision, a meaningful player decision, exact approval/apply, cancellation/restart, state-safe late completion and complete cost attribution. Include an unsuccessful unsupported request and a private-data boundary. Protocol-level evidence, injected model fixtures, live harness usefulness and population capacity are distinct reports.

The next implementation slice is specified in the scenario ladder and INV-16/18. There is no promise that simply turning on a connector makes every future kind adapter or migration available. Enable what is implemented and explicitly report the rest.

## Durable write sessions

The first write-capable implementation uses one application `WorldAuthoringService` over the existing world writer and attempts ledger. `WorldAgentStore` retains operational sessions and typed draft/review/turn records in two indexed tables. These records are not new mechanical truth and are not rewound by gameplay load. A session binds the initiating owner, exact world/timeline, configured connector identity, controlled inventor where relevant, admitted allowance and a hashed context handle. Opening or reconnecting the same session never allocates another allowance. The MCP credential alone permits no session mutation; write tools additionally require a currently valid session handle and write opt-in.

Submitted draft revisions are immutable. Updating a draft keeps its base and retires old unexecuted reviews by advancing its selected revision; liked earlier revisions remain inspectable. A stale installation base requires an explicit new draft, not a silent rebase. Exact request identities retain their original input fingerprint and result. A new candidate uses the owning validator for its kind, not an arbitrary generated effect interpreter.

Initial kind adapters cover native recipes, supported custom attributes, existing status-effect policy and cognition policy, and single native actions. An action draft is a reviewed invocation, not a new world definition. Recipe installation retains the actual inventor's eligibility and material knowledge; broad World Agent inspection does not teach that character. Attribute editing retains the current adapter's limited revision envelope. Status policy changes explicitly disclose ending affected effect episodes. Cognition settings do not create paid-call permission or a new controller. Larger bodies, shared-law migrations, activities, art and new physical solvers require their existing owners and remain distinct delivery slices.

`prepare` runs native checks on isolated transition results, binds exact candidate/base/affected-state evidence, and saves a pending review. The agent can request a review but cannot grant approval. The human decision binds the exact plan digest through the authenticated application UI. Every first live write in this initial owner-authoring profile requires that decision; draft editing and inspection do not. Apply rechecks the selected revision, current grants, timeline, native invariants and relevant impact inside the world mutation lane. Changing active status-effect episodes invalidates the reviewed affected set; unrelated clock ticks do not. A permanent operation receipt and world effects commit in the same existing database transaction. The review's displayed completion may be recovered from that receipt after a crash; it never authorizes a second effect.

Database transactions for operational edits must not enter the world mutation lane while holding a database lock. Apply takes world ownership first, performs only short state/authority reads, and commits through the existing repository. Model calls, connector provisioning, image requests and long scenario execution never run inside either lock. Short per-session edit queues are bounded and removed when idle; no permanent worker or global cross-session conversation lock is introduced.

Operational backups retain sessions, drafts, reviews and ledger relationships, while gameplay rewind fences them by the current timeline. Import into an empty host can restore these records; restoring gameplay into a running host does not replace current spending or session authority. Old backup envelopes lacking authoring tables must not silently lose known authoring state.

## Durable turn delivery

The application acknowledges an admitted native-agent message before waiting for external execution. The turn identity, original text, session scope and monotonic sequence are committed first. The existing Macrofold executor runs outside the HTTP request, database transaction and world mutation lane. Up to four in-process admission/execution slots protect the local host; this is not a distributed queue or a new paid retry policy.

The same-origin session API exposes paged `turns`, exact `turn`, and exact-turn `cancel` operations. Status reads never start or resume an agent. Repeating an identical submitted request returns its running or retained terminal receipt; changed text under that identity conflicts. The client persists pending request identity before sending and uses these reads after a disconnect, instead of buying a replacement run.

Cancellation first revokes the session context for that exact active turn, then signals its in-process executor. It does not close the conversation, refund work, undo committed changes, or cancel a later turn. Finishing a run retains its response and invalidates its old context. On application shutdown or gameplay load, drain admissions and cancel/await active turns before closing their repository; the existing startup recovery records unresolved external work without redispatch. Failure to retain a terminal result pauses admission through the existing storage-error boundary.

Human waiting is not an active model run. The agent saves its draft/review, ends with its question, and later receives a deliberately submitted reply under the same session allowance. Streaming partial provider output is optional future UX; durable status/replies are the required recovery path.

## Unified owner conversation interface

The owner-facing conversation is the natural-language entry point for both investigation and supported action preparation. It explicitly creates one funded session before paid dispatch, retains the same session across messages, and displays actual spending, reservations and uncertain exposure. Starting or browsing a session makes no model call. Configuration readiness is not proof that a remote connector or provider is reachable.

The session list is owner/world scoped and keyset-paged from durable storage, so browser-local transcript loss does not lose accepted work. Earlier closed or stale sessions can be inspected without restoring their authority. The current single-owner mode remains required; this is not a newly implemented multi-user permission system. Old tool-less browser transcripts are read-only history, never silently hydrated into the privileged native harness.

Only the visible conversation polls status/retained replies (two seconds while a turn is active, fifteen seconds otherwise). Hidden tabs stop scheduling reads. There is no whole-world polling or repeated paid submission on reconnect. An unsent draft and an unconfirmed request identity remain in browser storage where available; the server owns admitted turns. An uncertain acknowledgement exposes explicit same-ID reconciliation, not automatic replacement. Finite paging bounds drafts, reviews, turns and session discovery independently.

Review loads exact saved bytes and native findings on demand. Approve/Reject submits the reviewed digest, while Apply uses the retained server plan; no browser-supplied replacement effects are accepted. Historical review stays readable but cannot be approved or applied after scope expiration. The initial supported policy requires human review of every first live change. Native commands, recipe crafting and pause/resume retain their own requirements. Ending a session revokes future authority while retaining its history and real costs.

The existing finite recipe interface remains a labeled native shortcut, not a second more capable agent mode. Unsupported general physics, generated art, automated session refills and lower-impact automatic approval are not implied by the conversation UI.
