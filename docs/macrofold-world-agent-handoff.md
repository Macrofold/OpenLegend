# Macrofold handoff: unified World Agent

This handoff is navigation to the canonical integration contracts, not a second runtime or tool specification. The World Agent is an out-of-world assistant with authorized world-level inspection, one unified action-capable conversation and approval when required. It is not an NPC; [agency](agent-agency.md) retains separately scoped actor cognition and investigation.

## Conversation and remote-session mapping

Each Open Legend creator tab is one independent conversation with its own durable application identity, ordered messages, pending operation and remote Macrofold session/workspace mapping. Persist the mapping from `(application, world, principal, conversationId)` to remote identities and configuration version on the server. The browser may cache drafts and presentation state but cannot choose arbitrary remote IDs or become the history authority.

Serialize turns within one conversation and permit bounded concurrency between conversations. Separate conversations must not share unpublished drafts or private history. Reusing instructions or warm compute must not merge sessions. Prefer a private logical workspace per conversation with scoped reads of canonical world data; do not copy the mutable world into every workspace or require a permanently running Worker per tab.

[World Agent runtime](world-agent-runtime.md#3-durable-identities-and-ownership) owns conversation, funding session, project, candidate and remote-run identities. [Provisioning and continuation](world-agent-runtime.md#5-macrofold-provisioning-and-continuation) owns restart, warm-worker isolation and current-authority handling. The [MCP design](world-agent-mcp.md) owns authenticated connector/context binding. Retained application records, not provider workspace files, are authoritative.

## Lifecycle and recovery

Use the runtime's [execution adapter](world-agent-runtime.md#4-execution-adapter) and [continuity](world-agent-runtime.md#6-context-and-reasoning-continuity) contracts. Reopening and reconnecting do not create a paid turn; uncertain remote creation is reconciled, not blindly repeated. The existing provisioning journals are the starting implementation seam, not permission to add another API client with different retry behavior.

## Scope, tools and authority

The [shared tool service](invention-workshop-tools.md) owns operations; UI and MCP call the same services and authoritative domain. The [MCP authority binding](world-agent-mcp.md#3-authentication-and-world-level-authority) gives the World Agent the complete authorized world view, not the controlled character's recipe/perception scope. NPC investigation remains separately restricted. No tool grants itself approval, payer rights or direct storage access.

## Budgets, idempotency and observability

The [runtime funding contract](world-agent-runtime.md#8-shared-5-allowance-and-external-runs) establishes a default $5 cap per explicitly funded session for attributable Run charges; shared Worker capacity is billed separately. Future images must join that ledger before enabling image tools, with no fixed art split; image generation is not delivered by this slice. [Budgets](invention-budgets.md) owns accounting and uncertainty; [MCP](world-agent-mcp.md#7-long-running-work-and-idempotency) owns transport-independent operation receipts. No reconnect/refinement resets exposure. Durable history and scoped diagnostics remain distinct. Player UI shows abstract usage remaining; owner controls and disclosures handle the underlying economics.

## Available integration

The [read surface](world-agent-mcp.md#implemented-read-only-bootstrap) exposes current definitions, relationships, native activity and retained evidence under an explicit world-owner grant. The [implemented write surface](world-agent-mcp.md#implemented-write-surface) shares durable authoring sessions, immutable candidates, native checks, exact human approval and replay-safe Apply with the local owner UI. Selected context/tool profiles and the structured-question bridge are implemented and locally qualified through real Macrofold execution. A read credential still grants no paid execution, human approval or mutation authority. Configure the actual reachable authenticated connector and its explicit approved tool ceiling; no credentials belong in this handoff.

## Handoff acceptance

Verify two simultaneous conversations with different goals, isolation after browser and server restart, duplicate creation/submit, cold or busy execution, failed persistence, revoked access, world switching, completion after cancellation, missing credentials, zero allowance and independent billing receipts. Confirm one explicit Send dispatches once and that reopening or switching never replays it. Live acceptance must verify remote persistence and receipts under a separately authorized cap; fixtures establish lifecycle mechanics only.

## Current Worker caller boundary

The native caller uses an owner-selected shared `MACROFOLD_WORKER_ID`, not per-tab compute. Each conversation retains its own remote mapping; current authoring turns/stages use fresh native Sessions with scoped application continuity, and changed tool grants require a fresh Worktree after prior exposure reconciles. NPC full/reflection calls keep their existing actor scope and fresh-history behavior. Work is submitted before waiting on a sleeping Worker. Closing a conversation fences its late results and cancels only its Run, never shared compute or published context. Unknown admission remains blocked, not replayed. [Provider setup/cutover](ai-providers.md#shared-worker-setup-and-cutover) owns the operator, scope and spending contract; [MW01–MW04](maintainers/macrofold-worker-api.md) owns verification and live gates.

Use the [MCP qualification sequence](world-agent-mcp.md#10-qualification-and-upgrade-contract), [runtime evidence gate](world-agent-runtime.md#11-release-evidence), and [target scenarios](invention-scenarios.md). Actual native Macrofold recipe/refinement, policy, custom-resource and question journeys are recorded in [context qualification](verification/world-agent-context.md#final-local-qualification) and [question final acceptance](verification/invention-questions.md#final-acceptance--september-29), with exact human review/Apply and native recovery checks distinguished from model execution. These bounded local results do not close hosted deployment or sustained-load qualification.

## Qualified build and deployment boundary

As checked October 1, 2026, [Macrofold PR #12](https://github.com/Macrofold/Macrofold/pull/12) remains open at `a8c2ced1e3e88bcfd5d3354af42c6a2d86a4ac0c`. Its [five code CI gates](https://github.com/Macrofold/Macrofold/actions/runs/36529766462) pass, as does the ordinary preview; the separate staging deployment still fails. Earlier deployment inspection identified a paused staging project. That is an operator deployment issue, not a waived release gate.

The companion change supplies readable unique tool aliases, optional default-preserving `permissions.questions` and optional `limits.stop_on_model_error`. OpenLegend selects supported tools, opts into the error fence, uses medium effort and honors configured BYOK/provider connection selection. The qualified OpenCode question bridge captures and stops a Run; it does not call the native question-answer endpoint or resume the same Run. Other API consumers do not acquire mandatory new parameters. The [runtime contract](world-agent-runtime.md#structured-human-questions) owns lifecycle details.

Local live qualification also used the owner's **separate uncommitted filesystem-affordance, runtime-reliability and reported-cost changes** as a temporary build overlay. They are not included in PR #12. Question qualification used native image `sha256:50acfc2b82b47183ca7f98c6bb2989388862631d20881297b16508588db7acbb`, with the guarded model gateway/protocol from the companion work. An image digest identifies that observation; it is not proof that the image or temporary source tree remains available, nor a substitute for reviewable source provenance.

[WW07](maintainers/world-agent-writes.md#remaining-implementation-and-qualification) owns the remaining release work: establish committed equivalents of the required overlay behavior, qualify the exact deployable OpenLegend/API/runtime/image combination, coordinate draining old Runs before cutover, resolve staging deployment, and retain/reconcile uncertain historical charges. Do not deploy PR #12 alone on the assumption that it reproduces the tested local environment. Reuse unchanged local evidence and target checks at changed contracts; do not repeat paid qualification to replace missing accounting evidence. [Final acceptance](verification/invention-questions.md#final-acceptance--september-29) is the latest durable cumulative spending record; temporary logs and this conversation are not required handoff artifacts.
