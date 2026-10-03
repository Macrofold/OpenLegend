# Local playable-week branch integration

Mike authorized merging local engineer branches into local `main`, including adapting Engineer 2's changes to preserve main's shared action admission and execution. This is a reconciliation plan, not additional feature scope or completion of the full PW06 acceptance matrix.

[Week tracker](../../maintainers/next-playable-week.md) · [Technical design](../next-playable-week-tech-design.md) · [Save contract](../../save-and-load.md)

## Scope and starting points

- Local `main` starts at `9eb80973`, containing Engineer 1's `1f8fba49` delivery.
- Engineer 2's source is `oct2-eng-2` at `7530abd9`.
- The next requested source is local `oct2-eng-3`; record its exact tip when that merge starts.
- Remain on `main`, preserve the source branches and their other worktrees, and do not push.

## Reconciliation and responsibilities

The material overlap is native action admission, world-configured body services, simulation continuation, current save validation and shared delivery trackers. Approximately 100 substantive logic lines need adaptation for Engineer 2; indentation and inherited implementation size do not measure the new integration work.

1. Preserve the domain's shared read-only feasibility checks and its single execution path. Integrate world-owned consumption and recovery into that path; retain exact inventory revision checks and refusal without committed effects.
2. Preserve Engineer 1's saved mechanical sampling progress, incident-pair invalidation and path-proof improvements while installing Engineer 2's world-configured rates. Keep current database format 4 and the native-continuation checkpoint marker. Validate the complete combined model; add no old-save reader or migration.
3. Preserve main's product/production plans, each branch's unique implementation evidence and still-open acceptance criteria. Update stale independent-branch integration statements only where the actual merge changes them.
4. Inspect cleanly merged callers for removed assumptions, then use focused existing checks for action selection, inventory handling, body rates and current continuation. Run configuration, formatting, guidance, TypeScript and production-build checks. Reuse unchanged browser/provider evidence with its original limits.
5. Commit Engineer 2 only after its reconciliation passes, then inspect and merge Engineer 3 as a separate operation. Review its overlap and actual final stock-spending safeguards before choosing relevant checks. Stop for any further uncertain resolution.

## Completion criteria and evidence

Each merge must preserve the intended behavior of both inputs, have no conflict markers or unstaged tracked edits, and record its source tip and checks. A merge does not close unresolved capacity, model-quality, browser or full-week qualification. Native checks dispatch no provider work; additional and cumulative provider cost for this integration remain $0.

Engineer 2 reconciliation is verified: 71 focused existing checks pass across native kernel/boundaries and server selection/accounting/storage. Nine current JSON continuation comparisons match uninterrupted execution; nine invalid-remainder examples refuse. The wilderness cases retain sampling progress; reservoir/contact cases reach native boundaries without a saved remainder. The survival scenario runner completes 27 current scenarios with zero unexpected outcomes, without a baseline comparison. Configuration, formatting, guidance, TypeScript and production build pass. [Integration evidence](../../verification/next-playable-week-engineer-2.md#local-main-reconciliation) records scope and limits. Engineer 3 remains pending.
