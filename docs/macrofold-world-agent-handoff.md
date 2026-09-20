# Macrofold handoff: persistent world-agent conversations

Requested in the September 19 interface follow-up. This document combines the source-inspected conversation backend with remaining context/tool requirements. Live execution is not accepted; world-query and mutation tools remain pending. Product context: `archive/03-design-proposals/world-agent-and-workshop.md` and the quick-slot/interface proposal. The latest requested slot count is three dynamic plus three personal.

## Experience and current boundary

Open Legend now has a persistent right-side World agent launcher, a panel with multiple independent conversation tabs, and an editable message/history area per tab. New conversation creates a local conversation identity. Unmatched right-click search opens the editable native-invention composer. It sends nothing until explicit Send; creator discussion stays in the separate world-agent tabs. Plain opening, switching tabs, restoring the page and typing must not dispatch runs. Manual follow-ups stay in their selected conversation.

The client saves tabs, displayed history and drafts in browser localStorage under the world ID. These are UX records, not a backend-authoritative message archive. The authenticated `/api/world-agent/messages` route validates the world and invokes the separate Macrofold backend when configured; missing configuration returns unavailable. It does not route through NPC full-mind patches or substitute direct G1 invention for a creator agent.

The backend persists remote identities/operation fingerprints, reserves model and explicit compute allowance, uses independent conversation lanes and retains session plus sandbox IDs for continuation. Bounded NPC generation instead starts fresh model history on reusable compute. Initial requests are selector-free and use one backend key; Macrofold allocates workspace context. Files, shell and connectors remain denied, and supplied public observations do not constitute complete world-query access. Closing a tab tombstones it, cancels active work and requests sandbox destruction; remote history is retained because no session-close mutation is exposed. Uncertain outcomes remain blocked for reconciliation, never silently retried.

The earlier UI-only slice returned HTTP 503 for every world-agent message; that blanket unavailable behavior is superseded by this backend. Its no-paid-call evidence remains specific to that slice. Later static/build results and pending live checks are retained in [maintainer TODO](maintainers/TODO.md); none proves live remote persistence or latency.

## Existing Macrofold foundation inspected

The sibling `../AgentCloud` repository identifies itself as Macrofold. Its README and `docs/features/api/quickstart.md` describe saved agent presets, durable workspaces, runs, scoped keys and budget limits. `docs/features/workspaces/shared-agents.md` states that separate sessions can share persisted files, but a workspace rejects concurrent work with `409 workspace_busy`; sharing files does not share private conversation history. Do not assume a shared world workspace supports concurrent tabs today. Verify the deployed API/SDK contract against the implementation before wiring the adapter; the application contract below is intentionally independent of provider URL spelling.

## Required remote behavior

Each Open Legend tab represents a separate persistent agent instance with an independent Macrofold session, conversation history, private working files and pending run. Open Legend owns versioned master instructions and configuration; skip agent presets initially. Reusing configuration must not merge sessions. Unlike NPC cognition, these creator tabs deliberately retain their separate conversation history. Persist a server-owned mapping from `(application, world, principal, conversationId)` to the remote agent/session/workspace IDs and configuration version. The browser never chooses arbitrary remote IDs or grants.

Prefer a private workspace per conversation with scoped read/query access to the canonical world. A different implementation is acceptable if it guarantees independent mutable state and concurrent conversations without workspace collisions. Do not copy the entire mutable world into each workspace. Reuse warm execution capacity where supported; session persistence must not require a permanently running sandbox per tab. Cold starts, busy queues and failed persistence must have honest visible states.

The creator can ask questions, inspect world history and private NPC context under explicit creator authorization, invent new mechanics, and refine drafts across messages. These privileges are broader than character perception but remain restricted to the authorized world. Another tab's unpublished draft/history is private to that conversation unless explicitly shared. World-agent output must not silently become a character's knowledge, speech, journal entry or executed world effect.

## Application adapter contract

Implement a server-side `WorldAgentGateway` separate from NPC cognition and generic typed inference. Suggested operations:

- Create or resolve a conversation idempotently, using application-bound world/principal identity and versioned instructions/configuration. Return stable remote identity only to the application store.
- Submit a message with a durable request ID and expected conversation revision. Persist user-message admission before dispatch, map the request to one remote run, and distinguish rejection-before-dispatch from uncertain completion.
- Read messages and stream progress using monotonic event sequence IDs and a resume cursor. An acknowledged request is not a completed assistant answer. Support queued, starting, running, awaiting-input, completed, unavailable, failed, cancelled and completion-unknown states.
- Reopen a conversation after browser/server restart without starting another run. Persist history and mappings server-side; the browser cache becomes an optional cache, never sole durable storage.
- Explicitly cancel pending execution and reconcile its final receipt. Closing a panel or changing the active tab is not cancellation. Archival, permanent deletion and underlying workspace cleanup need separate retention rules.

Serialize turns within one conversation; retain independent conversations across tabs. Apply a shared world/account concurrency and spending budget across them. A fast double click or network retry must not create two workspaces, sessions or model runs. Use provider idempotency where available, plus a durable Open Legend dispatch ledger/outbox. If remote creation/submission has an uncertain result, reconcile by the original identity; do not automatically repeat paid work. A paused simulation can still have a read-only creator conversation once that product policy is wired, but any simulation mutation must follow domain admission at a valid boundary.

## World context: intentionally deferred

Future creator tools should query authorized current state, entity relationships, retained witnessed events, accepted NPC inner-world text and permitted private records, definitions, recipe/declaration versions, and workspace drafts. Unwitnessed experiential events are absent by design; operational recovery records have separate coverage. Creator access never teaches the player actor hidden facts. Open Legend owns retrieval policy, canonical state, audience separation and mutation admission. Macrofold supplies persistent execution/session abstractions and tools scoped by server-issued capabilities. Neither browser text nor a model-written file can grant broader authority.

Use versioned query results and retrieval watermarks, not a single giant prompt or duplicated world snapshot. Refresh evidence at each relevant turn, retain citations/record IDs, and recheck permissions and world/definition revisions before committing effects. Exclude credentials, other worlds and unrelated account data. Full context engineering, semantic indexing and tool implementations are separate work; do not invent placeholder world facts for this UX.

## Invention and safe effects

An explicitly sent invention message is a user invention intention; opening a draft alone is not dispatch authorization. The agent may clarify, propose, retrieve existing definitions and produce typed drafts. It must use Open Legend's supported trusted declaration families, policy checks, spending gates and version-aware admission. Code or new JSON properties never acquire executable authority automatically. Workshop changes create versions/diffs; receipt, draft, admitted definition and performed action are distinct outcomes. Context engineering should preserve the clicked target/location as structured evidence in a future request extension; the current UX sends the user's text only.

The planned [god-mode conjuring operation](../archive/03-design-proposals/world-agent-and-workshop.md#confirmed-god-mode-conjuring) extends this workflow to creating a physical instance of a named or randomly proposed object. Help define its properties, behavior, appearance and dependencies, then present a concrete quantity/location/effects and generation-budget preview for explicit confirmation. Reuse definitions/art or automatically author missing supported definitions and queue art within the confirmed scope. Conjuring requires its own server-granted mutation authority, stable candidate/confirmation/receipt and fresh admission checks; ordinary invention activation does not authorize spawning. Unsupported mechanics remain blocked, while valid instances can show a fallback pending art. INV-4.6 owns implementation and validation; no conjuring tool is currently delivered by this specification.

### Later harness operations

Persistent chat alone does not implement multi-turn tool use. Once scoped query/draft/validation tools exist, a bounded run can inspect results and choose follow-up calls for unfamiliar invention, world investigation, workshop refinement and complex conjuring. Retain task state independently of the session and stop while awaiting confirmation, world actions or long-running art. Each run has cumulative tool/byte/time/spending limits; retries need their own admission. Canonical task ownership is INV-4.7–4.9 and INV-5.5 in the [invention tracker](../archive/07-technical-architecture/declarations-and-evolution.md#inv-4--give-the-creator-useful-scoped-world-investigation-and-workshop-tools), after the initial typed invention path.

## Costs and observability

Reserve a bounded allowance before remote dispatch, aggregate all tab usage against the same world budget, and record LLM, Jev, execution and storage charges separately with provider receipts. Zero cap or missing configuration must fail before paid dispatch. No automatic paid retries. Attribute each operation to world, principal, conversation, request and remote run IDs. Keep sanitized trace correlation separate from canonical session history; trace retention cannot delete conversations or inventions. Reuse Macrofold's existing observability integration rather than introducing a second tracing stack for this handoff. No Langfuse SDK or new telemetry installation is required by this UX slice.

## Delivery sequence and batch acceptance

1. Durable conversation repository and ownership binding in Open Legend; replace local-only history with authenticated list/create/read/submit routes and preserve drafts during migration.
2. Verify the existing Macrofold adapter's session/workspace isolation, idempotent creation/submission, explicit budgets and unavailable behavior; live acceptance remains open.
3. Streaming/reconnect, cancellation, per-conversation serialization, cross-tab quotas, persistence failure handling and restart recovery.
4. Read-only creator tools with access controls and bounded retrieval; verify cross-world, cross-conversation and NPC-to-creator separation.
5. Typed invention/workshop tools and validated effect admission, then an explicitly budgeted live playtest.

Batch checks should cover two simultaneous conversations with different goals, isolation after reload/restart, duplicate first submissions, busy/cold workers, failed persistence, revoked access, world switching, completion after cancellation, missing credentials/zero allowance, and independent billing receipts. Confirm right-click Invent opens exactly one editable draft with zero requests; explicit Send dispatches once, and reopening or switching does not replay it. Fixture runs demonstrate mechanics, not model quality or live cost.
