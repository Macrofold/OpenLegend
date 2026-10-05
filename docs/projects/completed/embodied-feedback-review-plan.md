# Feedback and wilderness implementation review

| Status    | Current progress                                                                                    | Last updated |
| --------- | --------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Both requested reviews are complete; five demonstrated findings are fixed, verified and documented. | 2026-10-04   |

## Scope and risk

Review all changes from local `main` (`84bb148d72ab4378067018d1e34b51a05bc88878`) through `01ec5909`: roughly 2,000 added logic lines across bodily feedback, equipped-item targeting, remains, native animal escape, perception graphics, terrain and scenery. Persistent lifecycle and observer disclosure carry material risk; rendering and animal decisions carry growing-world costs. Preserve the accepted gameplay decisions in the [feedback plan](embodied-feedback-plan.md) and [wilderness plan](wilderness-expansion-plan.md). Fix demonstrated issues within those contracts, rather than expanding mechanics or introducing speculative infrastructure.

## Review and completion

1. Inspect the full branch diff in owner groups. Trace native transitions through deadlines, cancellation, current-format storage, scoped server views and client consumers. Check terrain seams, corpse possessions/revival, exact equipped-item admission and unseen-fire disclosure.
2. Inspect rendering creation/disposal, cancellable guide work, per-frame allocations, static batching and spatial preparation. Check native animal queries against the existing shared indexes; distinguish bounded cold work from repeated critical-path work.
3. Reproduce actionable findings through focused existing checks or one small native scenario where coverage is missing. Apply the smallest complete fixes through existing semantic owners. Reconcile canonical contracts and focused BW/SW/PF work only for actual changed behavior or newly found gaps.
4. Run affected static checks and selected no-provider runtime checks. Use disposable PostgreSQL only where persistence is affected; interact in the browser if presentation behavior changes. Reuse prior evidence for unchanged behavior. No paid calls are needed.
5. Inspect the complete resulting diff, close all in-scope findings, record actual evidence/limits, complete this plan and commit all task changes. Keep the working tree clean; do not push or modify the main checkout.

## Dependencies and maintained records

Use domain body/action/time owners, server scoped projection and repositories, renderer resource ownership and spatial geometry/navigation. Current contracts remain in [base-world survival](../../worlds/base/survival.md), [landscape](../../worlds/base/landscape.md), [world presentation](../../world-presentation.md) and [spatial behavior](../../spatial-world.md). [BW23/BW24](../../maintainers/base-world.md) and [spatial work](../../maintainers/spatial-world.md) retain delivery and wider qualification. Actual evidence belongs in the existing [feedback](../../verification/embodied-feedback.md) and [wilderness](../../verification/wilderness-expansion.md) reports.

No unresolved product decisions are required to start. The branch already contains the selected local main commit; no rebase or checkout change is needed. Edits remain in `/Users/mzw/.codex/worktrees/54e5/OpenLegend` on `codex/embodied-feedback`.

## First review evidence

The [review report](../../verification/embodied-feedback.md#implementation-review--october-4-2026) records three corrected findings: animals stopped at terrain seams, retained stat feedback could become stale, and React rebuilt overhead content every frame. Shared support-aware local steering, disclosure/definition baselines and frame-only position/progress painting resolve them. Focused native checks, bounded cost observations, actual browser comparisons, production-game interaction and static checks passed. No in-scope finding remains; existing wider device/geometry, population and lifecycle qualification stays with its focused owners. No provider calls were made; additional Jev cost and task total are $0.

## Second requested review

Start at `175f0070` and inspect the complete feature against unchanged local `main` `84bb148d72ab4378067018d1e34b51a05bc88878`, including the first review fixes. Reuse valid earlier verification for unchanged contracts. Prioritize deadline/lifecycle transitions, retained presentation and input cancellation, geometry/support identity, revision invalidation and repeated movement work. Estimated underlying logic scope is roughly 2,000 lines; any new fixes should stay confined to demonstrated findings and their owning callers. No new product decisions or provider calls are anticipated.

For each new finding, establish a representative downstream reproduction, fix it through the existing owner, and choose the smallest applicable native/browser/static check. Performance changes need a matched bounded workload and honest limits. Update the existing verification reports and focused tracker entries; archive this plan again only after all in-scope findings, documentation, full resulting-diff inspection and required checks are complete and all task changes are committed.

### Second review completion

Explicit controlled-body removal now disposes its remembered image, and unchanged health snapshots no longer rebuild overhead content. Actual before/after browser checks confirmed both fixes, ordinary remembered imagery, restoration and changed health/labels. TypeScript and production build passed; affected formatting, documentation links and the complete resulting diff were reviewed. Earlier native/persistence evidence remains valid for unchanged owners. The [second review report](../../verification/embodied-feedback.md#second-requested-review--october-4-2026) records evidence and limits. No in-scope finding or open product decision remains. Existing wider qualification is accurately retained; no provider calls were made.
