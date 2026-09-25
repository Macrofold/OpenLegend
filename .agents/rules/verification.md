# Verification and paid execution

## Default delegated implementation

Unless the current task explicitly asks otherwise, do not author or run automated unit, integration or browser suites. `pnpm check`, `pnpm test` and `pnpm test:browser` include tests; do not invoke them indirectly during this workflow. Static checks and small manual/ad-hoc runtime scenarios are permitted. Do not disguise a test suite as a smoke script, delete coverage, weaken CI or waive acceptance criteria. Existing CI and a separately requested full validation workflow may run the full suite.

Exercise changed code in a representative scenario and meaningful failure case where feasible. Use disposable worlds, never replace someone's save. Native checks use `AI_BUDGET_USD=0` without unrelated credentials. UI work needs actual interaction/visual inspection when available, not only a build. Review/design-only work does not require changing or running the game merely because a skill mentions verification. Missing access is a gap, not a pass.

Choose checks by impact: pinned Prettier on changed files, `pnpm typecheck` for TypeScript, `pnpm build` for production/build/client integration, `pnpm config:check` for generated configuration, and `pnpm guidance:check` for guidance. Documentation-only work needs content/link review, not game stress. Avoid repository-wide formatting churn. Inspect script side effects before execution. Restore temporary settings and stop processes you started; do not stop another contributor's runtime.

If a check fails, distinguish introduced failures from an existing baseline using the diff and available evidence. `pnpm typecheck` also checks test sources; stale tests can block it without proving the production build is broken. Report both outcomes where checked; never suppress diagnostics or claim the whole branch is green from a narrower pass. Required CI remains a merge gate unless maintainers explicitly decide otherwise.

Stress meaningful hot-path changes under the [performance skill](../skills/openlegend-performance/SKILL.md). Record specific missing coverage, reproduction and expected behavior in its focused tracker, using [TODO](../../docs/maintainers/TODO.md) only without a focused owner. Consolidate related gaps and remove only clearly obsolete requirements, not unmet checks. Deferred verification is not acceptance.

## Spending

Mike's standing authorization covers up to $10 total for a delegated implementation task using credentials he authorized for it. Contributors get no permission to charge his accounts. Other accounts need their owner's authorization; absent permission, stay native/no-cost. Documentation or a discovered key grants no authority.

Count settled cost plus outstanding/uncertain commitments across providers, actors, delegates, calls and compute against one task ceiling. Reserve conservatively before dispatch; application per-actor/monthly caps do not enforce this aggregate limit or create extra allowances. Use the smallest adequate bounded call and reuse evidence. Without a credible upper bound and accounting, do not dispatch. This ceiling covers the software/provider work launched for the task, not a claim to measure the coding assistant's own subscription or token billing. Cancellation, invalid output or missing usage do not prove zero cost. No automatic paid retry/fallback; ask before exceeding the ceiling.

Requested automated tests use explicit fixtures and no external requests; live-provider experiments are separate. Label static, fixture, native, live-provider and stress evidence distinctly. Keep keys, private prompts/saves and raw profiles out of commits. Consult [live verification](../../docs/verification.md) for the applicable checklist, never as proof a check ran.
