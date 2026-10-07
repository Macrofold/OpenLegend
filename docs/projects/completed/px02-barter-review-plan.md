# PX02 — Barter implementation review

| Status    | Current progress                                                                                                                                                  | Last updated |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The barter fixes, measured work reduction, player recovery and focused action-refresh checks pass; the reviewed scope and remaining growth limits are documented. | 2026-10-06   |

[Delivered implementation](px02-reciprocal-barter-plan.md) · [Contract](../parallel-batch-04-expeditions-and-exchange-tech-design.md#px02--reciprocal-offer-contract) · [PX02](../../maintainers/parallel-batch-04-expeditions-and-exchange.md#px02--reciprocal-barter) · [BW20](../../maintainers/base-world.md#bw20--consent-aware-handover)

## Scope, base and risks

Review the complete barter change against its integrated base for atomic effects, revision consent, permitted disclosures, current inventory/work/claims, draft recovery, ordinary resident decisions, modularity and growth with people/items/offers. Preserve one exact lot per side, gifts, native mutation ownership and the agreed deferred economic/reservation scope. Initial expected fixes affect roughly 150–300 logic lines; privacy, stale controls and hot-path reuse warrant this durable plan.

The unpublished branch was reconciled from `34233ae24365eb8911fe1995c9c232bd57f34616` to refreshed `origin/main` at `0a3ab79b7a698a7f1941dc23722f89220d1ba425` in `https://github.com/Macrofold/OpenLegend.git`. The controller restriction and barter shared checks coexist; upstream history and current PX02 dispositions were retained. Patch-series comparison confirmed those scoped resolutions. Work stays on `codex/px02-reciprocal-barter` in `/Users/mzw/.codex/worktrees/097e/OpenLegend`; no checkout or branch switch and no edits to the main checkout.

## Review and implementation sequence

1. Read the full branch diff and trace handover, ordinary object moves/claims, persistence/receipts, private events, protocol, catalogue/resident callers and inventory/person controls. Reproduce suspected correctness issues before changing behavior.
2. Remove repeated global-offer scans and identical reply preparation/checks within a permitted synchronous snapshot. Reuse current inventory and cache owners; ensure changes, deletion, restore and observer scope cannot reuse stale results. Do not add a second writable authority or speculative negotiation framework.
3. Correct current-control invalidation and confirmed draft/recovery defects: Inventory quantity maxima and two simultaneously mounted trade panels overwriting saved draft quantities. Retain exact revision consent, no half-transfer, readable/reachable controls and private draft cleanup.
4. Measure matched before/after offer/person/stock workloads with provider allowance zero. Include the full PostgreSQL-backed projection/command route and report cold/warm costs and limits, rather than claiming population capacity from an isolated helper.
5. Reconcile the canonical social/item and limits owners plus PX02/BW20 and relevant parent dispositions only where behavior, decisions or gaps changed. Record unresolved concrete findings under their existing owners.

## Verification and completion

Reuse the prior native/HTTP/PostgreSQL/browser/live evidence where assumptions remain valid. Extend the existing outside-repository scenario for changed admission/projection/recovery and bounded performance cases; no new automated tests by default. Use an owned disposable PostgreSQL database and `AI_BUDGET_USD=0`. Run selected existing kernel/catalogue checks, changed-file formatting, TypeScript and production build. Exercise actual client interactions for UI changes. No paid replay or live retry is planned; earlier controlled resident evidence retains its reported cost and limits.

Completion requires the full resulting diff reviewed, concrete in-scope findings fixed, measured evidence and residual gaps reconciled, all selected checks passing, all task changes locally committed and no task-owned edits left uncommitted. Finish this review plan under the project completion policy; the shared batch remains active.

## Delivered review and evidence

The reviewed implementation fixes private conflict feedback, countering an open offer after its remembered entry ages out, work-dependent Accept controls, actual whole-item capture and the existing six-disclosure load bound. Inventory quantities can use the full currently available lot; two open panels share one private draft, reviewed revision and in-flight guard, with cleanup that fences late acknowledgments even when browser storage is unavailable. Derived immutable participant/item/count lookup, compact stock reuse and existing reply-check reuse replace repeated global scans without another mutable authority.

[Actual evidence](../../verification/reciprocal-barter.md#october-6-review-and-matched-server-measurements) records reproduced failures, 26 native integrity scenarios plus targeted review probes, real HTTP/PostgreSQL rollback/reopening/replay, actual player draft sharing, keyboard joint acceptance, fresh-page recovery/refusal and matched server timings. Focused existing kernel/catalogue and client tests, TypeScript, build, formatting and affected-diff/link review pass. Review execution added no paid calls; earlier live choice evidence and its limitations remain recorded rather than rerun.

The review changed roughly 250 existing logic lines and added the 135-line shared-draft owner, excluding tests/docs. This justified the durable cross-layer plan and preserved the exact first family. Pending whole-collection persistence/index rebuild and global lifecycle growth remain BW20 work; own-inventory materialization and full refreshed-view/crowd qualification remain PF09 work. Currency, promises, institutions and BW21 reservations remain explicitly outside PX02. There is no unfinished agreed review work or developer decision; these tracked broader gates are not relabeled as qualified by the selected measurements.
