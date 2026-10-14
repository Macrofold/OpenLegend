# River meal second implementation review

| Status    | Current progress                                                                                              | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The second review fixes, player and restoration checks, measured improvements and documentation are complete. | 2026-10-07   |

## Scope and base

Review the full [AV05 river-meal change](../../maintainers/parallel-batch-05-adventure-defense-and-home.md#av05--river-fishing-and-world-defined-cooking), including the prior fixes and guidance, against the [preparation/cast contract](../../food-preparation.md), [world profile](../../worlds/base/river-fishing.md) and [existing evidence](../../verification/river-meal.md). This is a new review iteration, not a reversal of the completed prior review. Preserve one semantic effect owner, finite catch stock, permitted knowledge, exact ingredient/tool bindings, saved randomness and truthful interruption costs. Do not expand the gameplay exclusions or add compatibility support.

Start: `c8410eb53712efdb6de5fd05b70bf0cf8e127412` on `codex/av05-river-meal` in `/Users/mzw/.codex/worktrees/4495/OpenLegend`; full feature comparison is local parent `c13a0fa265954397e8426979d40c02cb74e06d1b`. No PR exists. Refreshed verified default `origin/main` in `https://github.com/Macrofold/OpenLegend.git` is `63cd42fc2555dd97b1cd9ec5c03dcf84e6d2ef36`, already an ancestor. No rebase, branch or checkout operation is needed; main is unaffected.

The delivered change affects roughly 1,600 logic lines plus documentation. Planning estimated roughly 150–350 logic lines for reproduced findings: distinct choice identities, shared queued-command validation, structured recipe facts and native admission against existing record limits. At review start, a 256-role recipe spent ingredients and produced food but could not reopen; record-capacity admission therefore had to refuse before effects and recheck prospective cooking results. Reuse the current item stacking and history owners rather than raising limits or introducing a separate cooking record. Risk is material: saved work, nested custody, definition replacement, privacy, resource conservation and repeated menu/NPC calculation cross authority and projection boundaries.

## Review sequence and owners

1. Inspect the full runtime and documentation diff, tracing input/admission → exact work → resource/item effects → records → save/load → actor-safe projections. Check source/tool/heat/input movement, removal, replacement, stock competition, cancellation and malformed current-format data against owning contracts.
2. Examine deterministic cast timing/RNG and general cooking/learned-method bindings. Fix reproduced in-scope defects through the current owner; retain precise completed history and unsupported-state distinctions.
3. Check choice/search work through actual catalogue, view and NPC callers. Reuse permitted request-local calculations and existing invalidation; measure any demonstrated scaling hole before/after without weakening complete choices or native revalidation.
4. Use selected existing checks and a small adaptive downstream scenario for concrete new findings. Reuse unchanged native/browser/live evidence. Run relevant TypeScript/build/format/link checks; no new automated suite or paid provider call is planned. Any UI behavior change gets actual interaction and visual verification.
5. Review the full resulting diff; reconcile the current contracts, AV05 and focused limits/performance trackers, verification report and completed plan status. Commit all task changes locally and confirm a clean task diff.

## Completion and decisions

The final replacement check reproduced a stale product-definition choice starting successfully because only the preparation's own body was checked. Include referenced item-definition meanings in the existing preparation signature and use that same owner for choices, native work and restored bindings. No wire field, duplicate definition store or compatibility reader is needed. Verify refusal before costs, fresh selection, pending continuation and existing learned-command consumers; measure the final service path again.

The final service comparison exposed cache misses for unchanged definitions accessed through a native draft. Reuse the existing pin cache through Immer’s current snapshot: unmodified drafts yield their immutable base, while edited definitions yield a fresh uncached value. This is a shared owner change; verify both paths and the actual catalogue/NPC callers, then repeat the selected native and static checks. Do not cache mutable snapshots or remove necessary record checks to regain speed.

The player-control check also exposed a shortcut consumer that inferred ordinary gathering from resource appearance and treated withheld stock as zero. Repair that consumer using its actual permitted Gather offers, retaining unavailable pinned choices and selecting the nearest usable source in one pass instead of rescanning/sorting by resource type. This extends the review to one existing client helper and requires fresh player interaction/visual inspection after the production rebuild. Record the new downstream-envelope and composite-identity lessons in the already-routed TypeScript owner; guidance checks apply without reopening completed dispatch evidence.

All concrete in-scope findings are fixed, preserved cases remain qualified, required checks pass, and actionable unimplemented broader work has the correct existing owner. No unresolved product decision is currently known. Prior live choice remains separate from native execution; no new paid dispatch or reliability claim is required. The recorded timing comparisons do not establish larger-world capacity.

## Delivered review

The full feature and resulting fixes were reviewed. Selected existing catalogue/view/boundary checks passed 21 cases, with four native seed/idempotency/restore/meat checks passed separately. Real PostgreSQL continuation, larger supported/refused recipe shapes, stale dependency refusal and overflow-safe item receipts passed the downstream diagnostic. Production player controls cooked two distinct input recipes, ate one item, carried one and submitted an exact offer without forcing acceptance. TypeScript, production build, changed-file formatting, guidance and affected links passed; existing build/guidance advisories remain.

[The second-review evidence](../../verification/river-meal.md#second-requested-review--october-7-2026) records setup failures and corrections, actual timings, native/player versus prior live evidence, and cost. The shortcut calculation and immutable definition reuse improved their measured paths; complete menu integrity still adds cost compared with the archived implementation. Broader AC11/PF05/FP-L01 qualification remains with its existing owners, outside this completed review. No paid provider call or new gameplay scope was added.
