# Macrofold handoff: persistent world-agent conversations

This document defines the focused integration boundary for persistent creator conversations backed by Macrofold. Product behavior belongs to the [world-agent and workshop design](../archive/03-design-proposals/world-agent-and-workshop.md); invention admission and delivery belong to [Declarations and evolution](../archive/07-technical-architecture/declarations-and-evolution.md) and the [invention tracker](maintainers/inventions-and-world-evolution.md). Generic NPC cognition and ordinary conversation lifecycle are outside this handoff.

## Conversation and remote-session mapping

Each Open Legend creator tab is one independent conversation with its own durable application identity, ordered messages, pending operation and remote Macrofold session/workspace mapping. Persist the mapping from `(application, world, principal, conversationId)` to remote identities and configuration version on the server. The browser may cache drafts and presentation state but cannot choose arbitrary remote IDs or become the history authority.

Serialize turns within one conversation and permit bounded concurrency between conversations. Separate conversations must not share unpublished drafts or private history. Reusing instructions or warm compute must not merge sessions. Prefer a private logical workspace per conversation with scoped reads of canonical world data; do not copy the mutable world into every workspace or require a permanently running sandbox per tab.

## Lifecycle and recovery

Creating or resolving a conversation is idempotent. Submitting a message persists admission and expected conversation revision before dispatch and maps one durable request ID to one remote run. Reopening, switching tabs, restoring the page or reconnecting never dispatches work. Closing a panel is not cancellation; archive, cancel and permanent deletion are distinct operations with explicit retention rules.

Persist monotonic progress/message sequence IDs and a resume cursor. Distinguish queued, starting, running, awaiting input, completed, unavailable, failed, cancelled and completion unknown. If remote creation or submission is uncertain, reconcile by the original request identity and never automatically repeat paid work. Session loss cannot erase the canonical conversation or invention task.

## Scope, tools and authority

The server grants scoped creator capabilities for the authorized world. Macrofold may execute bounded conversation and tool loops, but Open Legend owns canonical state, permissions, retrieval policy, spending admission and every mutation. Query results carry versions and evidence IDs; recheck access and relevant revisions before committing. Exclude credentials, unrelated worlds and ordinary actors' private state unless explicit creator authorization permits it. Creator findings never become character knowledge automatically.

Tool calls use the same application services as UI operations. A model-written file, browser text or assistant claim cannot install a mechanic, spawn an item, change policy or grant authority. Detailed workshop, invention, conjuring and world-query behavior stays in its canonical design owners.

## Budgets, idempotency and observability

Reserve a bounded allowance before remote dispatch and aggregate all creator conversations against the applicable world/account concurrency and spending caps. Record LLM, Jev, execution and storage charges separately with world, principal, conversation, request and remote-run identities. Missing configuration or a zero cap fails before paid dispatch. Cancellation reconciles any late final receipt; unknown completion retains a conservative reservation. No automatic paid retry is permitted.

Use sanitized correlation records for diagnostics without making trace retention the owner of conversation history. Credentials and private payloads remain redacted. Provider/session expiry cannot delete accepted application records.

## Handoff acceptance

Verify two simultaneous conversations with different goals, isolation after browser and server restart, duplicate creation/submit, cold or busy execution, failed persistence, revoked access, world switching, completion after cancellation, missing credentials, zero allowance and independent billing receipts. Confirm one explicit Send dispatches once and that reopening or switching never replays it. Live acceptance must verify remote persistence and receipts under a separately authorized cap; fixtures establish lifecycle mechanics only.
