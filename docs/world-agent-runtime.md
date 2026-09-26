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
