# Documentation ownership and reconciliation

Give each substantive concept one canonical owner. Critical local reminders may summarize and link, but must not duplicate full contracts, schemas, decision tables, acceptance criteria or task bodies.

- **Accepted target behavior:** Relevant specification; bundled-world mechanics under `docs/worlds/base/`
- **Tasks, dependencies, blockers, exit criteria:** Focused `docs/maintainers/` tracker; its README is navigation only
- **Miscellaneous/cross-cutting gaps with no focused tracker:** `docs/maintainers/TODO.md`
- **Implemented behavior:** `docs/architecture.md` and subsystem snapshot in `archive/05-project/implementation-status.md`
- **Actual gameplay/runtime verification evidence:** `docs/verification.md`; guidance/tooling evidence stays in its PR, linked from its focused tracker
- **Unresolved decisions / active research questions:** `archive/05-project/open-decisions.md` / `research-backlog.md`
- **Moves, superseded directions, useful history:** `docs/documentation-changelog.md`

Before editing tracked work, read its design owner, dependencies and existing decisions. Current behavior comes from code/evidence; target behavior comes from accepted requirements. A justified design improvement must state its changed assumption and reconcile affected owners. Do not relax a specification to hide a bug or let an unaccepted proposal replace an agreed contract. Record unresolved material choices in the decision owner.

For conversation capture, extract agreed decisions, requirements, examples, limits, tasks and questions into their owners; compare the diff against that inventory. Keep proposals and unresolved choices distinct. Treat silence as agreement only when explicitly granted for that conversation, never as permission for destructive, paid or permission-changing actions.

Before consolidating/deleting, migrate all unique current requirements, tasks, facts, criteria, questions and needed references. Preserve IDs, checkbox state, dependencies, blockers and valid exit criteria. Moving a task does not complete it; implemented scope and verified acceptance are separate. Current specs/trackers state current truth, not dated diaries.

Review the full diff for lost meaning, duplicate owners, stale status and misplaced decisions. For moved paths/headings, search repository-wide, including code comments, and fix inbound links before removing the source. Update local why-comments when their reason changes. Verify relative targets and anchors. Edit only affected owners; not every small patch needs architecture, verification, changelog and a new tracker entry. Record concrete follow-up work, not generic risks already covered elsewhere.
