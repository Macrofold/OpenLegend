# Verification and paid execution

## Default delegated implementation

Unless the current task explicitly asks otherwise, do not write or run unit, integration or browser test suites. Do not run `pnpm check`, `pnpm test` or `pnpm test:browser` indirectly: `check` includes automated tests. Do not delete existing coverage, weaken CI or change acceptance criteria to fit this workflow. Human contributions and CI may use the full documented suite.

Run the changed code through a small representative scenario, including meaningful failure behavior where feasible. Use an isolated disposable world for experiments, never a replacement for someone's development save. Keep provider spending disabled for native checks (`AI_BUDGET_USD=0`); do not load unrelated credentials. UI changes need actual browser interaction/visual inspection when available, not only a build. Missing runtime access is a disclosed gap, not a passing result.

Choose checks by impact: format changed files with the pinned Prettier; use `pnpm typecheck` for TypeScript, `pnpm build` for build/client changes, and `pnpm config:check` for authored/generated configuration. A documentation-only change needs link/content review, not a game startup or stress run. Run `pnpm guidance:check` for instruction-system changes. Avoid repository-wide formatting churn.

For hot-path/performance changes, use the [performance skill](../skills/openlegend-performance/SKILL.md). Record specific missing automated coverage, reproduction and expected behavior in the existing focused tracker; use [TODO](../../docs/maintainers/TODO.md) only when no focused owner exists. Remove only clearly obsolete requirements, not unmet checks. Implementation completion and acceptance completion are distinct.

## Spending

Mike's standing authorization covers up to $10 total for a delegated implementation task using credentials he has authorized for it. Public contributors receive no access or permission to charge his accounts. Other accounts require their owner's authorization; absent permission, stay native/no-cost. Documentation or a discovered key does not grant authority.

Reserve conservatively before dispatch. Count settled cost plus all outstanding/uncertain commitments across providers, actors, calls and compute against the same task ceiling; application per-actor/monthly caps are not extra allowances. Set an explicit nonzero local cap only for authorized paid work. Start with the smallest adequate call, reuse evidence and do not automatically retry paid work. Cancellation, invalid output and missing usage do not prove zero cost. Ask before exceeding the authorized ceiling.

When automated tests are requested, use explicit fixtures and no external requests; live-provider experiments are separate. Label fixture, native runtime, live-provider and stress evidence distinctly. Keep keys, private prompts, saves and raw profiles out of commits. Consult [live verification](../../docs/verification.md) for the applicable checklist, not as evidence that a check ran.
