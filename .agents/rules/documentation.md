# Documentation ownership and reconciliation

Give each substantive concept one canonical owner. Other files may briefly summarize and link, but must not duplicate contracts, schemas, decision tables, acceptance criteria or task bodies.

- **Accepted target behavior:** Relevant specification; bundled-world mechanics under `docs/worlds/base/`
- **Tasks, dependencies, blockers, exit criteria:** Focused `docs/maintainers/` tracker; its README is navigation only
- **Miscellaneous/cross-cutting gaps with no focused tracker:** `docs/maintainers/TODO.md`
- **Implemented behavior:** `docs/architecture.md` and subsystem snapshot in `archive/05-project/implementation-status.md`
- **Actual verification evidence:** `docs/verification.md`
- **Unresolved decisions / active research questions:** `archive/05-project/open-decisions.md` / `research-backlog.md`
- **Moves, superseded directions, useful history:** `docs/documentation-changelog.md`

Before editing tracked work, read its design owner, dependencies and existing decisions. Improve a design when justified, but state the changed assumption and reconcile affected owners; do not silently substitute an incompatible product choice. Current behavior is established by code and evidence, target behavior by the latest accepted requirement. Record unresolved material conflicts in the decision owner.

For conversation capture, extract each agreed decision, requirement, example, limitation, task and question into its proper owner. Check the resulting diff against that inventory. Treat silence as agreement only when the owner explicitly grants that convention for that conversation; never infer authorization for destructive, paid or permission-changing actions.

Before consolidating or deleting a document, classify and migrate every unique current requirement, task, fact, criterion, question and needed reference. Preserve task IDs, checkboxes, dependencies, blockers and valid exit criteria. Moving a checklist never completes it. Current specs/trackers describe current truth, not a dated implementation diary.

After changes, review the complete diff for lost meaning, duplicate owners, stale status and misplaced decisions. Search repository-wide for renamed paths, titles and affected anchors, including code comments; fix every inbound reference before removing the source. Update nearby why-comments when the reason or behavior changes. Verify relative links and headings, and retain truthful distinctions between implemented, verified and proposed behavior.
