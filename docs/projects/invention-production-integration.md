# Invention production-data integration

## Scope and authority

Rebase `feature/invention-repertoire-foundation` onto current main, reconcile the complete invention/World Agent change with the supported-gameplay production-data foundation, and review/fix the integrated implementation. Preserve the unified action-capable World Agent, shared application/MCP tool service, exact human approvals and permanent receipts, observer/privacy boundaries, and image-inclusive workshop-session funding. This is integration and review, not permission to implement every future INV/D3–D6 capability or enable hosted/paid execution.

The initial estimate is 700–2,000 affected lines of runtime logic, excluding tests, plus history reconciliation and documentation. Reassess from the full overlapping diff. Main's canonical record/memory repositories and small safe in-place conversion policy govern persistence; preserve branch-specific performance improvements when their semantics still apply. Resolve overlap from both owners' contracts and evidence, not blanket ours/theirs.

## Canonical owners

- [Invention handoff](../invention-handoff.md), [foundation](../invention-foundation.md), [runtime](../world-agent-runtime.md), [shared tools](../invention-workshop-tools.md) and [MCP](../world-agent-mcp.md).
- [Production data](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md), [delivery](../../archive/07-technical-architecture/data-delivery-and-scale.md), and [save policy](../save-and-load.md#active-development-policy).
- Implementation tasks remain under [WW11/WW16](../maintainers/world-agent-writes.md), [INV](../maintainers/inventions-and-world-evolution.md), [D0–D6](../maintainers/production-data.md), [PF](../maintainers/performance.md) and [SL](../maintainers/save-and-load.md). This plan describes this integration's scope and method rather than duplicating those trackers.

## Implementation sequence

1. Pin and inspect both published heads, common ancestry, contributor guidance, contracts, current evidence and all overlapping files. Preserve a recovery ref before an authorized history rewrite. Perform Git writes through the connector; do not merge into main or silently substitute squash/merge for rebase. Protect concurrent contributions when publishing.
2. Rebase the feature history onto the pinned current main while preserving both sides' substantive work. Audit non-conflicting neighboring changes as carefully as textual conflicts. Record every material resolution and why in the integration evidence/changelog.
3. Route feature state, queries and mutations through the current canonical repositories and transaction owner. Review World Agent operational sessions/turns/plans, invention jobs, exact references, memory/evidence/graph inspection, source/restore generation, permanent receipts, retries and accounting. Add only feature-consumed records/indexes that the production foundation needs; do not restore legacy writable snapshot/journal authority or add a second graph/mutation owner.
4. Reconcile operational backup, restore and PostgreSQL import as one contract: complete gameplay and non-rewindable operational/accounting data; current forgetting/privacy fences; atomic migration; source preservation; repeatable recovery without duplicate effects. No private or existing owner world is reset.
5. Preserve or improve relevant query filtering, numeric cursor/index alignment, bounded active-session recovery, append/history performance and dependency-correct caches. Compare actual database plans and representative mature-history latency/record writes, including rollback and restoration, before drawing performance conclusions.
6. Complete WW16 policy/catalogue cleanup at canonical owners, update architecture/current status and focused task state, and review the full integrated diff for authority, privacy, correctness, lifecycle, unnecessary work, extensibility and public UI/runtime behavior. Preserve unmet broader release gates.
7. Run permitted static/production checks and actual no-cost application journeys; exercise SQLite/PostgreSQL, restart, backup/import/restore, stale and replayed Apply, and relevant bounded stress workloads. Publish coherent checkpoints and a final evidence-backed handoff with exact heads, resolution inventory and remaining limitations.

## Verification and completion

Use `AI_BUDGET_USD=0`, disposable worlds and native/ad-hoc scenarios. Do not author or run automated unit/integration/browser suites, `pnpm check`, `pnpm test` or `pnpm test:browser`. Inspect scripts before execution; use pinned formatting, typecheck, production build, configuration/guidance checks where applicable. Keep existing CI requirements intact. Any paid work shares the owner's $10 total ceiling including uncertain exposure; this integration starts with no paid calls.

Completion requires: current-main ancestry with no lost feature/main work; one supported persistence authority; coherent complete recovery/accounting/privacy behavior; reviewed full diff and documented material resolutions; source-backed current documentation; and all required feasible static/runtime/performance checks actually run with failures fixed. Report any genuine uncompleted verification or platform limitation explicitly; fixture/native evidence is not hosted/model usefulness or release-scale acceptance. Detailed deferred automated cases remain with existing focused owners, not a new test suite.

## Publication baseline

Initial inspected feature head: `133d206b2b841c68f07bcbc5d422c72f2a774bb4`. Initial inspected main: `da02629d9f0a29a9e24473ff2ab995977a79be1a`. Historical common ancestor: `fc01e19b30060e6c7213b1c5405be13df209297e`. Recheck moving refs before final publication; these values are planning inputs, not evidence the rebase or qualification has completed.
