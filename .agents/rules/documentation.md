# Documentation ownership and reconciliation

Give each substantive concept one canonical owner. Local reminders may summarize and link, not duplicate full contracts, schemas, decision tables, acceptance criteria or task bodies.

- **Accepted target behavior:** Relevant specification; bundled-world mechanics under `docs/worlds/base/`
- **Tasks, dependencies, blockers, exit criteria:** Focused `docs/maintainers/` tracker; its README is navigation only
- **Miscellaneous/cross-cutting gaps with no focused tracker:** `docs/maintainers/TODO.md`
- **Implemented behavior:** `docs/architecture.md` and subsystem snapshot in `archive/05-project/implementation-status.md`
- **Actual gameplay/runtime verification evidence:** `docs/verification.md`; guidance/tooling evidence stays in its PR, linked from its focused tracker
- **Unresolved decisions / active research questions:** `archive/05-project/open-decisions.md` / `research-backlog.md`
- **Significant decisions and change history:** `docs/documentation-changelog.md`

## Keep maintainer work synchronized

Before code or design changes, find related items through the maintainer index and relevant trackers, even if none is named. Read their design owners, decisions, dependencies and exit criteria; cite tracker paths/IDs in the PR or handoff.

Update affected items with the work, not afterward: completed/partial scope, blockers, dependencies and remaining tasks. Check only satisfied exit criteria; preserve unverified acceptance checks and reopen regressions. Keep IDs stable; remove only obsolete work and link replacements. Add uncovered substantive work to its focused tracker, or the general TODO when none applies; do not duplicate tasks. Reconcile status against the final diff and evidence before handoff.

For accepted policies expected to change, maintain [Policies to revisit](../../docs/maintainers/revisitable-policies.md). Keep the current policy in its canonical owner; record why, when and by whom it should be reconsidered. Consult relevant entries when changing that policy or crossing its trigger. Update the owner, affected summaries and register together; a review trigger does not authorize relaxing the rule.

## Lightweight decision history

In [the existing changelog](../../docs/documentation-changelog.md), record consequential accepted design/product decisions, major documentation revisions/reorganizations and major game changes in the same change. Judge significance by changed contracts, ownership, compatibility or capabilities, not diff size.

Use a dated heading and a few sentences/bullets: decision/change, why and material tradeoffs, consequences, and links to canonical specs and affected work IDs (plus PR when available). Distinguish accepted targets, delivered behavior and verified evidence. Consolidate one coherent update; no entry per editing pass.

Skip typos, formatting, routine status edits, small clarifications and minor fixes without a consequential decision. Preserve prior rationale; link a superseding entry for reversals. Current contracts, task state and unresolved choices stay in their owners; history is not another specification, task list or commit diary.

## Reconcile documentation

Code/evidence establishes current behavior; accepted requirements establish targets. Explain changed assumptions and reconcile owners when improving a design. Never relax a specification to hide a bug or substitute an unaccepted proposal. Record unresolved material choices in the decision owner.

For conversation capture, extract agreed decisions, requirements, examples, limits, tasks and questions into their owners; compare the diff against that inventory. Keep proposals distinct. Silence means agreement only when explicitly granted for that conversation, never permission for destructive, paid or permission-changing actions.

Before consolidating/deleting, migrate unique current requirements, tasks, facts, criteria, questions and needed references. Preserve IDs, checkbox state, dependencies, blockers and valid exit criteria. Current specs/trackers state current truth, not dated diaries.

Review the full diff for lost meaning, duplicate owners, stale status and misplaced decisions. For moved paths/headings, search repository-wide, including code comments, and fix inbound links before removing the source. Update local why-comments when their reason changes. Verify relative targets and anchors. Edit only affected owners; record concrete follow-up work, not duplicate generic risks.
