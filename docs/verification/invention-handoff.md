# Invention handoff audit

This is repository/history and documentation evidence, not a new runtime, live-agent, security or performance qualification. The continuation entry point is [Invention and World Agent: start here](../invention-handoff.md). Implementation tasks remain in [INV](../maintainers/inventions-and-world-evolution.md) and [WW](../maintainers/world-agent-writes.md); this report does not duplicate their checklists.

## Publication evidence

The inspected implementation head was `d7709b83a4299653e16f1590e252c884ce4bffa3` on `feature/invention-repertoire-foundation`. GitHub's compare endpoint established both of the following as ancestors of that published head, with zero commits behind those respective baselines:

| Earlier work | Published ancestor | Compare result |
| --- | --- | --- |
| Complete unified World Agent/MCP/graph/composition specification after its rebase | `73b796e28f05821b37c0625b72f63a308fe321a5` | 85 commits ahead, zero behind |
| Repertoire implementation previously distributed only as `repertoire-final.bundle` | `da2094825fb5d468b7f697e2d536ad95685ee22a` | 73 commits ahead, zero behind |

The old statements that those implementation commits are unpublished are superseded by this ancestry evidence. A new contributor must not re-import the old bundle over the branch or recreate those changes from conversation text. Ancestry preserves their history; later reviewed revisions may legitimately replace earlier code.

At the audit, main was `8f72e945894340fa262ef0196c2520492c04e16a`. The common ancestor with the feature branch was `fc01e19b30060e6c7213b1c5405be13df209297e`; the feature branch was eight main commits behind. Incoming main changes include memory/knowledge, storage/records, save handling, cognition and contributor guidance. This audit did not merge or rebase them. WW11 owns reconciliation, and these moving refs must be checked again before integration. Historical rebase evidence remains true for its named baseline, not for current main.

## Decision coverage

The handoff maps the accepted final decisions from the invention discussion to their canonical owners, including project/revision coordination, independent mechanics and progressive art, compatible reuse, local failure versus upstream redesign, active-version preservation, actor/NPC learning boundaries, invented laws/obligations, constitution/locks/quarantine, dependency and interaction graphs, deterministic/Jev/LLM review, authoring/runtime budgets, unified world-level authoring, one shared service and MCP/native execution, exact approvals and durable receipts, and the repertoire's live arrangements, methods, participation, information, social and observer-relative presentation contracts.

The existing scenario documents preserve target player, NPC and creator outcomes. The repertoire is an idea catalogue rather than a runtime capability registry. Hypothetical scenarios and future contracts are not represented as shipped mechanics. The owner decisions to use a unified conversation, request consequential approval, fund each new workshop session up to $5 including images, and prioritize capability before later cost optimization are retained; they need not be asked again.

The original broad technology-landscape Markdown/ZIP was a separate chat research deliverable, not a repository implementation or a binding selection of all the products it surveyed. That complete exported survey is not asserted to be archived on this branch. The architecture's adopted tool/service boundaries and the MCP-specific source research are in the repository. The original survey can be supplied separately for vendor research; no code, schema or current task depends on access to that attachment.

## Current-state cross-check

Source inspection and the existing [current subsystem status](../../archive/05-project/implementation-status.md#unified-owner-world-agent) agree on writable MCP, the native Macrofold adapter, durable owner sessions/reviews and the finite current tool surface. The two descriptor catalogues contain eleven world read/preview tools and nine authoring/session tools. The seven authoring kinds are `recipe`, `attribute`, `attribute-bindings`, `attribute-values`, `status-effect-policy`, `cognition-policy` and `action`.

The latest [navigation/custom-value evidence](workshop-navigation.md) separately records real local MCP/HTTP and native execution for those additions, including stale review after drain, replay and restart. Earlier [write recovery](workshop-continuation.md) and [transport/funding](workshop-transport-funding.md) evidence remains scoped to its named runs. None establishes actual hosted model/harness usefulness, full interaction correctness, graphical graph editing, generated art, or population-scale performance.

The original read-only MCP milestone is not the current product endpoint. Read-only mode still exists as an independently useful grant, while mutating/session tools require the configured write surface and retained application context. The `ol_` prefix is only the OpenLegend tool namespace.

## Known prose discrepancies and authoritative resolution

The audit found old summaries that lag the source and later accepted policy. These are explicit documentation housekeeping under **WW16**, not hidden product decisions:

| Stale reference | Authoritative interpretation for continuation |
| --- | --- |
| Older nine-read-tool / six-kind counts in `docs/world-agent-mcp.md` and older implementation-slice summaries | Use current descriptors, current `tools/list`, and the latest implementation-status section. The inspected current surface is eleven read/preview plus nine authoring tools, with seven kinds. Historical evidence retains its historical counts. |
| No-legacy/no-migration wording in `docs/invention-composition.md`, `docs/action-capabilities.md`, AC10.5, INV-14.8 and D60 | Current `AGENTS.md` and `docs/save-and-load.md#active-development-policy` already supersede it: preserve the existing world, use safe small in-place conversions where needed, do not automatically reset or create a fresh world, and do not build an elaborate legacy framework. No new owner decision is needed to follow that policy. |
| Initial catalogue, read-only bootstrap, app-executed four-turn loop and pre-rebase descriptions | Read them as named earlier slices or compatibility paths, not as the limit of the later unified native World Agent implementation. Do not mark the larger general-engine target complete either. |

A handoff is possible because the current authority and exact remaining cleanup are identified. This report does not certify that every historical paragraph in the repository has been rewritten. Before persistence work or merging, finish the tracked prose reconciliation rather than copying old restrictions into new code. Detailed target mechanics and future tasks remain at their existing owners.

## Remaining release and implementation boundaries

The feature is suitable for a fresh contributor to continue, not automatically ready to merge or enable for hosted users. WW07 / INV-21.5 retains the real connector/harness journey; WW10 retains broader body/law adapters; WW11 retains current-main and sustained full-stack qualification; WW15 / INV-15 retains richer graph extraction and complete impact analysis. INV-12/18/19 retains progressive generated art and complete image-inclusive accounting/qualification. INV-20 and AC retain actual information, social, joint-work and wider activity consumers. Origin locks exist; the complete constitution-level freeze/quarantine design is not thereby implemented.

The latest native stress evidence still misses its requested 3x simulation rate. It cannot be upgraded to scale-readiness by successful authoring queries. Existing WAC/WAF/IRF/UWA and other TODO groups remain uncompleted until their own checks run; no automated coverage became obsolete merely because a manual observation passed.

## Audit method and limits

Used the GitHub connector to inspect published refs, commit ancestry, tree/file presence, current relevant code and documentation. A retained source export was used for local full-text inspection; its differences from the published implementation head were identified with GitHub compare, and relevant changed records were read from the published revision. The handoff additions are documentation-only. No runtime code, deployed setting, grant, workflow or main reference was changed, no test suite or native stress run was executed again, and no paid call was made.

The GitHub-hosted specification and original implementation history, focused task owners and this decision map are the transfer artifact. A literal chat transcript, abandoned alternatives, temporary export workflows, provider credentials and private diagnostic fixtures are neither required nor suitable handoff inputs.
