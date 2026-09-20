# Macrofold handoff: persistent world-agent conversations

Requested in the September 19 interface follow-up. This document is an implementation proposal for Macrofold and the subsequent Open Legend integration, not a claim that the remote agents or world-context tools are connected. Product context: `archive/03-design-proposals/world-agent-and-workshop.md` and the quick-slot/interface proposal. The latest requested slot count is three dynamic plus three personal.

## Experience and current boundary

Open Legend now has a persistent center-left World agent launcher, a panel with multiple independent conversation tabs, and an editable message/history area per tab. New conversation creates a local conversation identity. Selecting Invent from unmatched right-click search creates a new tab, adds `Invent this: <original search>`, and automatically submits exactly that message. Plain opening, switching tabs, restoring the page and typing must not dispatch runs. Manual follow-ups stay in their selected conversation.

The current client saves these tabs, history and drafts in browser localStorage under the world ID. These are local UX records, not Macrofold sessions or authoritative server history. The server accepts the authenticated `/api/world-agent/messages` request shape `{requestId, conversationId, worldId, text}`, validates the current world, and returns HTTP 503 with `world-agent-unavailable`. It invokes neither Macrofold nor the existing NPC/invention director. That separation is deliberate: direct G1 invention is not a substitute for a persistent creator agent. Browser history labels the result Status, not a fabricated assistant reply. No keys, paid calls, remote agents or world-context engineering were added in this slice.

## Existing Macrofold foundation inspected

The sibling `../AgentCloud` repository identifies itself as Macrofold. Its README and `docs/features/api/quickstart.md` describe saved agent presets, durable workspaces, runs, scoped keys and budget limits. `docs/features/workspaces/shared-agents.md` states that separate sessions can share persisted files, but a workspace rejects concurrent work with `409 workspace_busy`; sharing files does not share private conversation history. Do not assume a shared world workspace supports concurrent tabs today. Verify the deployed API/SDK contract against the implementation before wiring the adapter; the application contract below is intentionally independent of provider URL spelling.

## Required remote behavior

Each Open Legend tab represents a separate persistent agent instance with an independent Macrofold session, conversation history, private working files and pending run. A common saved agent preset/configuration may be reused; sharing the preset must not merge sessions. Persist a server-owned mapping from `(application, world, principal, conversationId)` to the remote agent/session/workspace IDs and configuration version. The browser never chooses arbitrary remote IDs or grants.

Prefer a private workspace per conversation with scoped read/query access to the canonical world. A different implementation is acceptable if it guarantees independent mutable state and concurrent conversations without workspace collisions. Do not copy the entire mutable world into each workspace. Reuse warm execution capacity where supported; session persistence must not require a permanently running sandbox per tab. Cold starts, busy queues and failed persistence must have honest visible states.

The creator can ask questions, inspect world history and private NPC context under explicit creator authorization, invent new mechanics, and refine drafts across messages. These privileges are broader than character perception but remain restricted to the authorized world. Another tab's unpublished draft/history is private to that conversation unless explicitly shared. World-agent output must not silently become a character's knowledge, speech, journal entry or executed world effect.

## Application adapter contract

Implement a server-side `WorldAgentGateway` separate from NPC cognition and generic typed inference. Suggested operations:

- Create or resolve a conversation idempotently, using application-bound world/principal identity and a versioned preset. Return stable remote identity only to the application store.
- Submit a message with a durable request ID and expected conversation revision. Persist user-message admission before dispatch, map the request to one remote run, and distinguish rejection-before-dispatch from uncertain completion.
- Read messages and stream progress using monotonic event sequence IDs and a resume cursor. An acknowledged request is not a completed assistant answer. Support queued, starting, running, awaiting-input, completed, unavailable, failed, cancelled and completion-unknown states.
- Reopen a conversation after browser/server restart without starting another run. Persist history and mappings server-side; the browser cache becomes an optional cache, never sole durable storage.
- Explicitly cancel pending execution and reconcile its final receipt. Closing a panel or changing the active tab is not cancellation. Archival, permanent deletion and underlying workspace cleanup need separate retention rules.

Serialize turns within one conversation; retain independent conversations across tabs. Apply a shared world/account concurrency and spending budget across them. A fast double click or network retry must not create two workspaces, sessions or model runs. Use provider idempotency where available, plus a durable Open Legend dispatch ledger/outbox. If remote creation/submission has an uncertain result, reconcile by the original identity; do not automatically repeat paid work. A paused simulation can still have a read-only creator conversation once that product policy is wired, but any simulation mutation must follow domain admission at a valid boundary.

## World context: intentionally deferred

Future creator tools should query authorized current state, entity relationships, relevant historical events, private NPC records, definitions, recipe/declaration versions, and workspace drafts. Open Legend owns retrieval policy, canonical state, audience separation and mutation admission. Macrofold supplies persistent execution/session abstractions and tools scoped by server-issued capabilities. Neither browser text nor a model-written file can grant broader authority.

Use versioned query results and retrieval watermarks, not a single giant prompt or duplicated world snapshot. Refresh evidence at each relevant turn, retain citations/record IDs, and recheck permissions and world/definition revisions before committing effects. Exclude credentials, other worlds and unrelated account data. Full context engineering, semantic indexing and tool implementations are separate work; do not invent placeholder world facts for this UX.

## Invention and safe effects

The initial automatically submitted message is an explicit user invention intention. The agent may clarify, propose, retrieve existing definitions and produce typed drafts. It must use Open Legend's supported trusted declaration families, policy checks, spending gates and version-aware admission. Code or new JSON properties never acquire executable authority automatically. Workshop changes create versions/diffs; receipt, draft, admitted definition and performed action are distinct outcomes. Context engineering should preserve the clicked target/location as structured evidence in a future request extension; the current UX sends the user's text only.

## Costs and observability

Reserve a bounded allowance before remote dispatch, aggregate all tab usage against the same world budget, and record LLM, Jev, execution and storage charges separately with provider receipts. Zero cap or missing configuration must fail before paid dispatch. No automatic paid retries. Attribute each operation to world, principal, conversation, request and remote run IDs. Keep sanitized trace correlation separate from canonical session history; trace retention cannot delete conversations or inventions. Reuse Macrofold's existing observability integration rather than introducing a second tracing stack for this handoff. No Langfuse SDK or new telemetry installation is required by this UX slice.

## Delivery sequence and batch acceptance

1. Durable conversation repository and ownership binding in Open Legend; replace local-only history with authenticated list/create/read/submit routes and preserve drafts during migration.
2. Macrofold adapter with session/workspace isolation, idempotent creation/submission, explicit budgets and a deliberately unavailable implementation for missing configuration.
3. Streaming/reconnect, cancellation, per-conversation serialization, cross-tab quotas, persistence failure handling and restart recovery.
4. Read-only creator tools with access controls and bounded retrieval; verify cross-world, cross-conversation and NPC-to-creator separation.
5. Typed invention/workshop tools and validated effect admission, then an explicitly budgeted live playtest.

Batch checks should cover two simultaneous conversations with different goals, isolation after reload/restart, duplicate first submissions, busy/cold workers, failed persistence, revoked access, world switching, completion after cancellation, missing credentials/zero allowance, and independent billing receipts. Confirm one right-click Invent creates one tab/message/request; reopening or switching does not replay it. Fixture runs demonstrate mechanics, not model quality or live cost.
