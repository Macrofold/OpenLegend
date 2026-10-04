# Validation with a concrete purpose

| Status    | Current progress                                                                                                             | Last updated |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | Provider decision assertions and demonstrated redundant checks removed; audit, guidance and selected verification completed. | 2026-10-03   |

## Scope and reason

The owner supplied a successful Jev response that OpenLegend rejected because one
answer's three returned scores summed to 0.99. Choosing the highest value needs no assertion
that the values sum to one. The owner authorized removing unnecessary validation,
adding coding guidance against it, and scanning the codebase for related harm or bloat.

Work starts from refreshed `origin/main` at `b50ec6ce75f260d68c18ec99d767982c65b0fccb`
in an isolated checkout. Concurrent uncommitted work in the main checkout is preserved;
this branch does not merge, restart that server, change its database or edit its files.

## Assessment

Initially approximately 80–200 changed production logic lines, excluding tests.
Scope is the provider decision decoder, demonstrated redundant or harmful checks found
by the audit, coding instructions and affected current documentation. Removing a check
can alter failure handling or accepted data, so inspect its producer and consumers first.
Authority, private projection, current-format save integrity, billing and actual native
game preconditions remain required. No new generic validation framework is needed.

## Owners and steps

1. Inventory validation and rejecting assertions across tracked production code in
   `apps/`, `packages/` and `scripts/`; inspect consumer needs and concrete failure modes.
   Classify admission/authority, save integrity, accounting, generated proposals,
   provider decision data, internal invariants and presentation checks separately.
2. Change the shared AI decoder so choice selection uses the highest returned value
   among the offered choices, retaining the provider's values. Remove sum-to-one and
   derived-consistency assertions that do not protect a consumer. Inspect Choice,
   Score and Noul separately; do not silently change application decision thresholds.
3. Fix other demonstrated unnecessary or harmful validation through its existing owner.
   Keep checks that have a concrete reason. Record the audit's actual coverage, retained
   responsibilities and any actionable unresolved finding rather than claiming all
   validation can disappear or inventing follow-up work.
4. Add one concise universal coding rule in `AGENTS.md`; route existing TypeScript/AI
   guidance to that rule instead of creating competing policy bodies. A check needs a
   realistic invalid-input path and a meaningful consequence for its consumer, and
   belongs at the owning boundary rather than repeated trusted internal calls.
5. Reconcile provider contracts, limits and relevant maintainers with the final behavior;
   retain the historical failure and the reason the earlier assertions were removed.
6. Review the full affected diff and verify selected ordinary and unusable-input paths.
   Reassess this plan if audit findings change the affected contracts or scope materially.

## Verification and completion

- Replay the supplied record locally through the decoder and real adapters with injected
  transports. Exercise a highest-score disagreement, non-unit totals, unchanged raw values,
  appropriate tie behavior, and unusable or missing required decision data.
- Use focused existing AI checks, updating obsolete expectations for the approved behavior.
  Do not author new automated tests by default or weaken unrelated coverage.
- Use focused existing checks for any additional runtime fix, with fixtures inspected first.
- Run TypeScript, pinned changed-file formatting, guidance checks and relevant build checks.
  Distinguish introduced failures from baseline failures.
- No live-provider calls are needed; task spending is $0. Do not reuse real saves or make
  automatic paid retries. Raw supplied responses and experiment output stay outside Git.
- Finish when agreed fixes, repository audit, instructions, documentation and verification
  are complete. Update this status and file the completed plan under the documentation policy.

The [audit report](../../verification/validation-purpose.md) retains concrete findings and coverage. Existing broader provider,
multiplayer and installed-agent qualification requirements are not closed by this task.

## Delivery

Production changes are confined to three existing owners: the shared decision decoder,
early speech preview and the pure caption lifetime helper (26 added / 49 removed source
lines, including comments and formatting). The decoder no longer asserts sums, named-choice
agreement, derived rating averages, metadata echoes or conventional numeric ranges.
It chooses the highest offered raw score and retains finite provider values. Speech
preview parses its request-specific operation once. Caption timing consumes values from
its already checked caller instead of asserting them again.

Root guidance owns the new purpose requirement, with TypeScript/AI references and a
CG05 qualification case. Current provider, limit and timed-UI contracts, changelog and
maintainer status are reconciled. The protected development-save policy is byte-for-byte
unchanged. No dependencies, manifests, generated definitions or main-checkout files changed.

The supplied record passed through both real adapters with local injected transports;
ordinary and unusable-data cases, speech restrictions and pure timing were exercised.
All 26 existing AI-client checks, TypeScript, production build, changed-file Prettier,
guidance checks and affected-diff review passed. Build and guidance retain advisory
warnings about bundle size, browser-externalized PlayCanvas modules and guidance size.
No full CI, live model or browser qualification is claimed. Task provider cost: **$0**.

Delivery branch: `codex/validation-purpose-audit` in
`/Users/mzw/.codex/worktrees/validation-purpose/OpenLegend`; main and its running server
remain untouched. Publishing or merging was not part of this request.
