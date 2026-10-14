# River meal implementation

| Status    | Current progress                                                                                               | Last updated |
| --------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The accepted AV05 journey, failure/restore cases, separate live choice, review and documentation are verified. | 2026-10-06   |

## Agreed scope and base

Implement [AV05](../../maintainers/parallel-batch-05-adventure-defense-and-home.md#av05--river-fishing-and-world-defined-cooking), its [feature scope](../parallel-batch-05-adventure-defense-and-home-feature-spec.md#av05--catch-and-cook-a-river-meal), [technical definition](../parallel-batch-05-adventure-defense-and-home-tech-design.md#av05--finite-casts-and-preparation-definitions) and [world profile](../../worlds/base/river-fishing.md). The player's complete journey is gathering materials, crafting a known tool, inspecting either real reach, choosing one cast, receiving a catch or an empty result, and cooking/eating, carrying or offering a real cooked item. Excluded features in those owners remain excluded.

Edits belong to `codex/av05-river-meal` in `/Users/mzw/.codex/worktrees/4495/OpenLegend`, created from `378228e6f388e60efe5e1a446dcf138872e37ffc`. Refreshed `origin/main` in `https://github.com/Macrofold/OpenLegend.git` is `0a3ab79b7a698a7f1941dc23722f89220d1ba425`, already an ancestor; preserve the three newer local-main commits. No history reconciliation is needed. Main checkout is unaffected.

Estimated change: 1,200–1,900 logic lines excluding tests. Risk is material because exact materials, saved random outcomes, pending work, definition changes, private observation and downstream item bindings cross several layers. Existing work and resource owners remain authoritative; no new scheduler, cooking effect handler or compatibility reader.

## Owners and implementation sequence

1. **Preparation definitions and cooking.** Add installed finite preparation data with identity/revision, exact named input roles and quantities, exact output definitions/quantities, duration, supported heat requirement and authored labels. Resolve a chosen definition and exact input lots through one helper shared by offers, facts and native work. Existing cooking spends inputs at work start and does not refund interruption; retain that policy for meat and every new preparation. Pin selected definition and input/output meanings across waiting and completion. Update current command shapes, output bindings, learned methods, save validation and server/public callers together.
2. **Known tool and real reaches.** Add one trusted fishing-tool family and one starting known method using the profile's materials/work/load. Place two finite resource capabilities on actual river-bank geometry with declared water footprint, supported dry stance and line endpoint. Keep tuning and language in the bundled world. General native code checks these capabilities rather than terrain color or item names.
3. **One committed cast.** Reuse native approach, physical work, item-use exclusions, Stop and simulation deadlines. Bind exact source/tool/profile and revalidate current participation, tool, stance/line and stock at resolution. Only a lawful resolution draws saved randomness; a success atomically removes one catch unit and creates the real output. Empty attempts finish with a truthful no-yield receipt. Cancellation or exhaustion spends elapsed time but neither draws nor creates/debits stock.
4. **Player and permitted NPC consumers.** Reuse action catalogue, inventory uses, inspection and activity/result rendering. Expose known time/chance and observed exhaustion, never a future draw or hidden quantities. Offer relevant actions from perceived sources and carried tools through ordinary NPC preparation; no fishing goal or forced hunger action. Exact input/output ports support subsequent cooking and eating.
5. **Verification, review and reconciliation.** Run selected current focused checks, static checks and a disposable native/server/browser journey. Exercise contrasting preparation data, current meat behavior and the required failure/competition/restoration cases. Review the full diff, fix in-scope findings, reconcile current canonical contracts and affected tracker subsets, and commit all task-owned work.

No new prerequisite branch is needed. AV02 equipment, shelter, barter and ecology remain independent. Reassess this plan before introducing a new cross-layer contract or product decision beyond this scope.

## Verification and completion criteria

- Demonstrate real craft → approach → cast → catch → cook → eat through downstream application controls/callers, with carried and offered cooked-item alternatives. Inspect real bank geometry and readable action/result feedback.
- Native checks use `AI_BUDGET_USD=0`; database checks use only the existing disposable loopback PostgreSQL fixture. Inspect selected tests/scripts before running; do not add automated tests by default or invoke broad unfiltered suites.
- Cover empty cast, exhausted source, blocked stance/line, unavailable/replaced tool, movement/Stop cancellation, two actors contesting the final unit, extinguished heat, stale input/definition, save/reopen before and after outcome, and no preview randomness/effects/private-stock disclosure.
- A materially different installed preparation uses different real input/output/work data through the same cook owner; current meat quantities/work/nutrition stay unchanged.
- TypeScript, production build, changed-file formatting and affected-link checks pass. Inspect every affected diff and trace producers through command validation, effects, persistence and public/cognition projection.
- Live NPC choice is separate evidence from native execution. Use the smallest ordinary bounded experiment only with configured authorized credentials and a credible reservation; one shared $10 task ceiling applies. Preserve exact additional/cumulative Jev cost and uncertain commitments. Unavailable live execution remains an explicit completion gap, never a native-quality claim.
- Update AV05 and the cooking/food subsets in its technical reconciliation map without closing wider parent projects. Update affected project status tables, maintain limitations and record consequential decisions once. Finish only when agreed delivery and required checks are complete; final local commit leaves no task-owned edits uncommitted.

## Open decisions

None. World tuning and interruption policy are already specified. Routine reversible technical choices belong to this implementation; genuinely new developer decisions must be answered before dependent work.

## Delivered behavior and evidence

The complete agreed player journey and native empty/exhausted/unavailable/cancellation/competition/heat-loss/stale/save cases passed. World-defined cooking replaces the old meat-only transformation while retaining meat quantities, time and start-time consumption without interruption refunds. Preparations bind one exact lot per named role and lit heat, retain the existing 256-operation atomic limit, and charge branching lot assignment to the inherited work allowance. Finite casts keep authored stock distinct from breeding populations, hide remaining catch quantities and draw saved randomness only at lawful resolution. Changed preparation meaning cannot rewrite historical ingredient quantities or infer a current reusable method from obsolete evidence.

The contrasting real multi-input/multi-output recipe, PostgreSQL continuation, actual browser craft/catch/cook/eat/offer controls and native packed-item acceptance passed. Final TypeScript, production build, changed-file formatting, 22 selected existing tests, affected-diff review and changed-document link checks passed. Broader parent projects and scale/autonomous-survival qualification remain open. Full evidence and limitations are in [River meal verification](../../verification/river-meal.md); the current contract and limits remain in [food preparation](../../food-preparation.md).

One live NPC decision voluntarily selected cooking among permitted cooking/cast offers, and native admission queued that plan; it is separate from completed native effects. Reported-scope provider-reported estimate: **$0.00092**. Cumulative task provider-reported estimate: **$0.00092**, outstanding reservations **$0**, no unresolved commitment. No invoice charge or full live fishing-meal reliability is claimed.
