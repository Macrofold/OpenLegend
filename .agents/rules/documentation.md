# Documentation ownership and reconciliation

For an explicitly requested exhaustive documentation, project and task reconciliation, use [Full Documentation Review](../skills/full-documentation-review/SKILL.md). Routine documentation maintenance does not activate that full-repository workflow.

Give each substantive concept one canonical owner. Local reminders may summarize and link, not duplicate full contracts, schemas, decision tables, acceptance criteria or task bodies.

- **Project-specific proposals, scope and context:** Paired feature spec/technical design in `docs/projects/`, for creation requests, follow [Design](../skills/openlegend-design/SKILL.md)
- **Current cross-project behavior and accepted contracts:** Relevant persistent specification; bundled-world mechanics under `docs/worlds/base/`
- **Feature document structure:** For new or substantively changed feature specs/designs and persistent feature docs, follow [Feature documentation](../../docs/feature-documentation.md); include links to implementation work and the owning limits inventory.
- **Non-correctness limits and constraints:** For introduced, changed, removed or explicitly unlimited numerical/behavioral policies, follow [Limits tracking](../../docs/limits/README.md) and update the feature inventory in the same change. Retain rationale, restrictiveness and removal history; assess [Remove / Change / Expand](../../docs/maintainers/limits-audit.md) without turning every default into a task.
- **Tasks, dependencies, blockers, exit criteria:** Focused `docs/maintainers/` tracker; its README is navigation only
- **Miscellaneous/cross-cutting gaps with no focused tracker:** `docs/maintainers/TODO.md`
- **Implemented behavior:** `docs/architecture.md` and subsystem snapshot in `archive/05-project/implementation-status.md`
- **Actual gameplay/runtime verification evidence:** Topic reports under `docs/verification/`, linked from the [verification index](../../docs/verification.md); guidance/tooling evidence stays in its commit/PR or handoff, linked from its focused tracker
- **Unresolved decisions / active research questions:** `archive/05-project/open-decisions.md` / `research-backlog.md`
- **Significant decisions and change history:** `docs/documentation-changelog.md`

## Verification reports

Keep `docs/verification.md` as a short navigation index and shared playtest protocol. Record detailed results in the relevant `docs/verification/<topic>.md` report; create a focused report for a distinct investigation rather than appending unrelated runs to one file or creating a file for every check. Link the report from the index and affected specifications/trackers, using section anchors for specific evidence. Summarize the setup, checks, observed results, failures and limits in the report itself. Do not commit generated verification output (probe logs, request/response dumps, traces, profiles or screenshots) as supporting evidence. Keep raw output outside the repository during the task; commit an artifact only when the user explicitly requests that artifact as a deliverable. Authored fixtures and reusable verification tools are source files, not generated output.

Preserve the recorded revision/environment, workload, results, failures and limitations, distinguishing native, fixture, browser, live-provider and stress evidence. Retain older observations as labeled historical evidence; a later pass does not erase an earlier failure or qualify a different workload. Current task state and unmet acceptance remain in the focused maintainer tracker, not a duplicate checklist in the index. Load only reports relevant to the task.

## Keep maintainer work synchronized

Before code or design changes, find related items through the maintainer index and relevant trackers, even if none is named. Read their design owners, decisions, dependencies and exit criteria; cite tracker paths/IDs in the PR or handoff.

Update affected items with the work, not afterward: completed/partial scope, blockers, dependencies and remaining tasks. Check only satisfied exit criteria; preserve unverified acceptance checks and reopen regressions. Keep IDs stable; remove only obsolete work and link replacements. Add uncovered substantive work to its focused tracker, or the general TODO when none applies; do not duplicate tasks. Reconcile status against the final diff and evidence before handoff.

Existing accurate documentation and deferral reasons satisfy this tracking requirement. Update only changed behavior, decisions, status or newly discovered gaps; do not rewrite unchanged remaining-work explanations on every task. A routine standalone rebase needs no new durable plan, repeated deferral notes or separate documentation commit merely to record that it occurred. Material reconciliation risk still follows [root planning](../../AGENTS.md#plan-before-implementation), and explicitly requested documentation remains required.

For accepted policies expected to change, maintain [Policies to revisit](../../docs/maintainers/revisitable-policies.md). Keep the current policy in its canonical owner; record why, when and by whom it should be reconsidered. Consult relevant entries when changing that policy or crossing its trigger. Update the owner, affected summaries and register together; a review trigger does not authorize relaxing the rule.

## Project status and completion

Every document describing a project under `docs/projects/`, including its feature spec, technical design, plan and supporting briefs, must have this compact table immediately after its title:

```markdown
| Status      | Current progress                                                                                       | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| In progress | Implementation is finished, but the project's browser verification remains open in the linked tracker. | YYYY-MM-DD   |
```

Keep **Current progress** to one plain-language sentence naming the most important delivered work, remaining work or blocker; include task references when helpful, not a full task inventory. Use **Not started**, **In progress**, **Blocked** or **Completed**. An optional rough percentage belongs in the status cell, such as **In progress (50%)** or **In progress (75%)**, only when the agreed scope and evidence support that estimate; never invent precision. Use the actual date of the status review in `YYYY-MM-DD` format.

Whenever finishing project work, reconcile this table in every affected project document with the owning tracker and actual evidence, and refresh the date even if the broad status remains unchanged. Keep documents for the same project consistent; completing a design, subtask or implementation stage does not make the whole project complete. Add the table to existing project documents when their project is next worked on; navigation-only indexes are not project descriptions. Detailed tasks and acceptance remain in their current owners.

Mark the project **Completed** only when its entire agreed scope, integration, documentation, review fixes and required verification are complete under [root completion](../../AGENTS.md#completion-and-handoff--every-task). In that same change, move its project documents together into `docs/projects/completed/`, retaining filenames and the relative organization of supporting documents. Preserve useful content and completion evidence, repair links inside moved files, and update repository-wide incoming references, including code comments and copyable instructions; do not leave duplicate active copies. A shared document covering unfinished projects cannot be marked wholly complete or moved on the strength of one finished part. If the project is reopened, return its documents to the active project area, revise the status/date and repair references together.

## Project approval and current truth

For a project authorized under [root task policy](../../AGENTS.md#task-scope-and-authorization), use the [design transition](../skills/openlegend-design/SKILL.md#approval-to-implementation). Before coding, create/update detailed maintainer work referencing both project files and integrate relevant accepted behavior/decisions into their persistent cross-project owners. Mark approved-but-unimplemented capabilities as targets, not current runtime behavior; update those owners and task states as each slice ships. Project docs retain project-specific scope, context and history, referencing canonical contracts rather than becoming competing current specifications.

Main documentation must describe current behavior/contracts and clearly labeled remaining targets. Keep superseded narratives in project-specific docs or the changelog, not interleaved with current guidance. Historical material already retained in archives is not a current contract merely because it exists; do not reorganize unrelated archives for a local project.

## Lightweight decision history

In [the existing changelog](../../docs/documentation-changelog.md), record consequential accepted design/product decisions, major documentation revisions/reorganizations and major game changes in the same change. Judge significance by changed contracts, ownership, compatibility or capabilities, not diff size.

Use a dated heading and a few sentences/bullets: decision/change, why and material tradeoffs, consequences, and links to canonical specs and affected work IDs (plus PR when available). Distinguish accepted targets, delivered behavior and verified evidence. Consolidate one coherent update; no entry per editing pass.

Skip typos, formatting, routine status edits, small clarifications and minor fixes without a consequential decision. Preserve prior rationale; link a superseding entry for reversals. Current contracts, task state and unresolved choices stay in their owners; history is not another specification, task list or commit diary.

## Reconcile documentation

Code/evidence establishes current behavior; accepted requirements establish targets. Explain changed assumptions and reconcile owners when improving a design. Never relax a specification to hide a bug or substitute an unaccepted proposal. Record unresolved material choices in the decision owner.

For conversation capture, extract agreed decisions, requirements, examples, limits, tasks and questions into their owners; compare the diff against that inventory. Keep proposals distinct. Silence means agreement only when explicitly granted for that conversation, never permission for destructive, paid or permission-changing actions.

Before consolidating/deleting, migrate unique current requirements, tasks, facts, criteria, questions and needed references. Preserve IDs, checkbox state, dependencies, blockers and valid exit criteria. Current specs/trackers state current truth, not dated diaries.

Apply the [root preservation rule](../../AGENTS.md#documentation-is-a-maintained-source-of-truth) to every edit. Compare removed or replaced passages against the task's explicit scope; retain useful material outside that scope. Internal agent plans and summaries cannot authorize a reversal. When an authorized change supersedes prior behavior, update its canonical owner and retain the prior rationale with a clearly linked explanation of the reversal.

Review the full diff for lost meaning, duplicate owners, stale status and misplaced decisions. For moved paths/headings, search repository-wide, including code comments, and fix inbound links before removing the source. Update local why-comments when their reason changes. Verify relative targets and anchors. Edit only affected owners; record concrete follow-up work, not duplicate generic risks.
