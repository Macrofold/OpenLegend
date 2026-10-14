# River meal implementation review

| Status    | Current progress                                                                            | Last updated |
| --------- | ------------------------------------------------------------------------------------------- | ------------ |
| Completed | Review fixes, native/server/browser verification and maintained documentation are complete. | 2026-10-06   |

## Scope and base

Review and improve the delivered [AV05 journey](../../maintainers/parallel-batch-05-adventure-defense-and-home.md#av05--river-fishing-and-world-defined-cooking) against [current preparation/cast contracts](../../food-preparation.md) and the [river profile](../../worlds/base/river-fishing.md). Preserve finite supply, exact real items, truthful costs and outcomes, permitted observations, deterministic saved randomness and the existing cooking mutation owner. No new gameplay chain, compatibility layer or paid decision experiment is required.

The review begins at `72d204092c17e3a6c5cb10ff3a5ed63e987c39bc` on `codex/av05-river-meal`, in `/Users/mzw/.codex/worktrees/4495/OpenLegend`. There is no pull request target. Refreshed default `origin/main` in `https://github.com/Macrofold/OpenLegend.git` resolves to `0a3ab79b7a698a7f1941dc23722f89220d1ba425` and is already an ancestor, so no rebase/merge is needed. The main checkout is unaffected.

The complete feature diff contains about 1,600 changed logic lines excluding documentation/tests. Expected review fixes affect 150–300 logic lines, subject to findings. Risk is material because saved geometry, exact ingredient selection and repeated player/NPC preparation cross admission and projection boundaries. This plan covers the complete authorized review; broader performance qualification stays with PF and the existing limits inventory.

## Review and implementation sequence

1. Inspect the full original diff and trace native admission, mutation, cancellation, records, save validation and player/NPC projections. Prioritize lost/duplicate effects, disclosure and current-format restoration. Record concrete findings and fix through their existing owner.
2. Measure matched recipe-selection workloads before changing code. Examine inexpensive shortage checks, shared-material assignment, repeated preparation per heat source, definition/quantity indexing and per-recipe sorting of NPC fires. Reuse one synchronous permitted read; preserve complete choices and failure semantics under inherited work allowances.
3. Reject malformed saved casting geometry through the existing record validators and confirm truthful valid saved continuation. Review recipe validation and exact historical meaning; do not infer unavailable facts from current definitions.
4. Exercise changes through actual downstream catalogue/view/NPC callers and a meaningful failure case, plus a bounded stress workload. Reuse unchanged browser/native/live evidence. Run selected existing tests, TypeScript, production build, changed-file formatting and affected links; no broad suite or new automated tests by default.
5. Review the resulting diff, update current contracts/limits, AV05/PF findings and the existing verification report. Mark implemented improvements and retained concrete gaps accurately, complete this plan, move it to project history with repaired links, and commit all task-owned changes.

## Completion criteria and decisions

The original feature's agreed behavior remains intact; all concrete in-scope correctness findings are fixed; avoidable repeated preparation and demonstrated search amplification are reduced with matched evidence; required checks pass and remaining scale/qualification gaps have an existing focused owner. All criteria passed; no open product decision remains.

## Completed review

Exact saved geometry, executable ingredient roles, selected-food missing-heat explanations and stale preparation descriptions were corrected. Ingredient choice now rejects shortages and skips interchangeable lots, solving each material independently. Each permitted read reuses those exact ingredients and the recipe content signature across perceived fires; NPC fire sorting is performed once. Larger-role-first assignment can select a different sufficient unselected lot, while exact commitments, selected-lot participation, quantities and native revalidation remain strict. Existing possession revisions already invalidate holds, so no additional global reservation dependency was retained.

The full original and resulting diffs were reviewed. Native meal/failure/conservation/PostgreSQL continuation, 400 controlled assignment comparisons, actual server catalogue/view/NPC reads and an ordinary production-browser missing-fire interaction passed, alongside the 22 selected existing tests, TypeScript, build, formatting and relative-link checks. The impossible assignment's matched median fell from hundreds of milliseconds to hundredths of a millisecond; all 155 diagnostic cooking choices remained. Final content-signature reuse also passed 18 selected existing cases and repeated static/service checks. Whole-menu/NPC timing varied and does not qualify population capacity. [Evidence, setup corrections, exact costs and retained limits](../../verification/river-meal.md#requested-implementation-review) remain in the verification owner; atomic cooking-preview preflight and larger complete-path qualification are tracked by AC11/PF05/FP-L01.
