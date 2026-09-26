# Macrofold handoff: unified World Agent

This handoff is navigation to the canonical integration contracts, not a second runtime or tool specification. The World Agent is an out-of-world assistant with authorized world-level inspection, one unified action-capable conversation and approval when required. It is not an NPC; [agency](agent-agency.md) retains separately scoped actor cognition and investigation.

## Conversation and remote-session mapping

[World Agent runtime](world-agent-runtime.md#3-durable-identities-and-ownership) owns conversation, funding session, project, candidate and remote-run identities. [Provisioning and continuation](world-agent-runtime.md#5-macrofold-provisioning-and-continuation) owns restart, warm-worker isolation and current-authority handling. The [MCP design](world-agent-mcp.md) owns authenticated connector/context binding. Retained application records, not provider workspace files, are authoritative.

## Lifecycle and recovery

Use the runtime's [execution adapter](world-agent-runtime.md#4-execution-adapter) and [continuity](world-agent-runtime.md#6-context-and-reasoning-continuity) contracts. Reopening and reconnecting do not create a paid turn; uncertain remote creation is reconciled, not blindly repeated. The existing provisioning journals are the starting implementation seam, not permission to add another API client with different retry behavior.

## Scope, tools and authority

The [shared tool service](invention-workshop-tools.md) owns operations; UI and MCP call the same services and authoritative domain. The [MCP authority binding](world-agent-mcp.md#3-authentication-and-world-level-authority) gives the World Agent the complete authorized world view, not the controlled character's recipe/perception scope. NPC investigation remains separately restricted. No tool grants itself approval, payer rights or direct storage access.

## Budgets, idempotency and observability

The [runtime funding contract](world-agent-runtime.md#8-shared-5-allowance-and-external-runs) establishes $5 per explicitly funded session including image generation, with no fixed art split. [Budgets](invention-budgets.md) owns accounting and uncertainty; [MCP](world-agent-mcp.md#7-long-running-work-and-idempotency) owns transport-independent operation receipts. No reconnect/refinement resets exposure. Durable history and scoped diagnostics remain distinct.

## Available bootstrap

The [implemented read-only MCP endpoint](world-agent-mcp.md#implemented-read-only-bootstrap) can expose current definitions, relationships, native activity and retained evidence under an explicit world-owner grant. It uses the same source readers as local owner inspection. Configure the dedicated remote connector and qualify actual Macrofold forwarding before calling this a connected World Agent. Session/approval/mutation integration remains pending; no paid context handle is inferred from the read credential.

## Handoff acceptance

Use the [MCP qualification sequence](world-agent-mcp.md#10-qualification-and-upgrade-contract), [runtime evidence gate](world-agent-runtime.md#11-release-evidence), and [target scenarios](invention-scenarios.md). The actual native Macrofold harness must discover/call tools, retain drafts, request approval, apply once, and recover safely before live readiness is claimed. Current finite app-executed inference is not that evidence. Tasks and deferred automated scenarios remain in INV and the maintainer TODO.
