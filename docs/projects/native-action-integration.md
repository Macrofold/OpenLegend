# Native action branch integration

| Status      | Current progress                                                                                                                       | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The action integration is merged and later PostgreSQL/lifecycle checks are recorded; the remaining AR acceptance matrix is incomplete. | 2026-10-04   |

The source pins and execution sequence below describe the September 26–27 integration, not an outstanding merge. [AR02/AR03/AR04.3/AR07.2](../maintainers/action-reconciliation.md#integration-tasks) retain the remaining qualification. Later [merged-build evidence](../verification/three-times-scene-performance.md#continued-merged-build-investigation) resolves the historical disk-blocked PostgreSQL attempt and demonstrates selected follow/sleep transitions without qualifying the whole matrix. Current checks use PostgreSQL; the root development policy supersedes historical conversion/isolation instructions.

## Scope and baseline

Integrate `review/action-main-reconciled` at `580476bc` onto freshly fetched
`origin/main` at `f551e3d8` in `Macrofold/OpenLegend`. Work is isolated on
`codex/native-action-integration`; the published source branch and other checkouts
remain available. The common base is `03105fed`. Approximately 4,000 changed
production logic lines span action grounding/approval, native follow, perception,
history persistence and profiling, alongside historical evidence and documentation.
This is a substantial authority, privacy, persistence and scheduling integration.

The task authorizes reconciliation and fixes, not implementation of every future
action-repertoire entry or merging main. Preserve both branches' delivered behavior;
current code and canonical contracts take precedence over stale handoff claims.

## Work sequence and owners

1. Inspect both histories, applicable guidance and AC/AR/PF/EPR/AG/storage owners.
   Rebase the local integration branch, resolving textual and semantic overlaps
   against the current contracts. Preserve main's cadence, spatial, storage,
   resource, contribution and Worker architecture.
2. Review the full integrated diff and downstream consumers: scoped grounding,
   revision admission, execution/continuation, perception/contact lifecycle,
   save upgrades, committed history, public projection and client controls.
   Consolidate superseded implementations instead of duplicating authority.
3. Fix consequential integration defects and stale callers. Reconcile AR01–AR08,
   relevant AC/PF/EPR tasks, Architecture, implementation status, verification
   navigation and the handoff. Preserve unmet acceptance and historical evidence.
4. Run pinned formatting/static/config/build checks and native one-off scenarios
   through real downstream callers, including failure, cancellation and restore.
   Inspect the UI and measure representative hot paths on disposable worlds with
   `AI_BUDGET_USD=0`. No automated suites or live-provider calls by default.
5. Inspect the final complete diff, record exact evidence/limits and remaining
   merge gates, and leave a clean committed integration branch for review.

## Completion criteria

- Rebase completed against the recorded refreshed main, with semantic decisions
  documented and no discarded delivered behavior from either source.
- Action, approval, follow, sensing and persistence use the current owners and
  maintain scoped authority, deterministic ordering and cancellation/restore fences.
- Applicable checks and representative downstream runtime exercises complete;
  failures are resolved or explicitly block merge readiness.
- Documentation accurately distinguishes delivered behavior, accepted future
  requirements, historical observations and verification of this integration.
- Full-diff review fixes are complete and unverified acceptance is not checked off.

## Progress

- Source and main fetched; working tree initially clean; both histories inspected.
- Rebase and semantic integration completed locally; the source branch and main were not rewritten.
- Main owns current placement, shared navigation/work dependencies, account/control authority,
  canonical records/cold history/checkpoints, resource claims and boundary-limited elapsed time.
  Branch grounding, revisions, private acquisition and SQLite isolation are adapted to those owners.
- Runtime review fixed contact writes to a read-only snapshot, follow/navigation cancellation,
  actor-scoped submission, client draft lifecycle and failed-factory cleanup. Complete action
  choices retain main's byte-bounded envelope instead of the old branch's first-48 truncation.
- Native manual movement/revision/restart/follow/contact/storage drills completed. Short matched
  measurements prompted feature-cache and finalization consolidation; they do not qualify
  sustained throughput, heap growth or production PostgreSQL behavior.
- Canonical behavior, limits, trackers and historical report navigation reconciled. Broad unmet
  AC acceptance remains open. Final pinned formatting, TypeScript, configuration, production build and link/diff checks passed. Integration fixes and evidence were subsequently merged into local `main` at `75ee15f7` on September 26, 2026; refreshed `origin/main` at `45210d41` contains that merge.
- The integration is merged; qualification remains incomplete. At integration time, disk exhaustion
  blocked disposable PostgreSQL qualification, browser interaction could not pass the disposable
  instance's sign-in screen, and automated CI was unrun. See the [integration evidence](../verification/native-action-integration.md)
  and [continued merged-build observations](../verification/three-times-scene-performance.md#continued-merged-build-investigation)
  for later progress; these do not close broad AR acceptance.

## Remaining work and decisions

No unresolved product or conflict-resolution decision remains. Verify adequate disk space
for remaining disposable PostgreSQL work, complete AR02/AR03/AR04.3/AR07.2 qualification,
verify browser controls in an authenticated session, and run separately authorized required CI
against the merged code. Record results without treating the completed merge as qualification. This integration does not implement future general
tracking, workflow languages or the full repertoire to close unrelated acceptance criteria.
