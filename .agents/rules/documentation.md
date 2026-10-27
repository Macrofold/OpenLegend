# Documentation ownership and reconciliation

For an explicitly requested exhaustive documentation, project and task reconciliation, use [Full Documentation Review](../skills/full-documentation-review/SKILL.md). Routine maintenance does not activate that workflow.

Give each substantive concept one canonical owner. Reuse an existing owner before creating a file; local reminders summarize and link rather than copying contracts or tasks. For creating, splitting, filing or reconciling records, read the relevant section of the [documentation system](../../docs/documentation-system.md#homes-and-filing-units). A small edit to an established owner needs no full handbook read. [Navigation](../../docs/README.md) locates current behavior, technical contracts, work, research, evidence and history; indexes are not required reading lists.

Gameplay/runtime numerical and behavioral policies retain [limits tracking](../../docs/limits/README.md) and same-change reconciliation, including reasons, restrictiveness and removed/no-limit decisions. Assess [Remove / Change / Expand](../../docs/maintainers/limits-audit.md) without turning every default into a task. Guidance-only workflow changes use their operational owner and consequential decision record, not a new gameplay limits inventory. New or substantially changed feature/design documents follow [Feature documentation](../../docs/feature-documentation.md).

## Verification reports

Keep the [verification index](../../docs/verification.md) for topic navigation and [playtest procedure](../../docs/verification/playtest-protocol.md) separate from results. Detailed evidence belongs in bounded question/campaign records under the [documentation system](../../docs/documentation-system.md#growth-rules-that-do-not-require-another-maintenance-programme); one investigation groups meaningful retries. Guidance/tool evidence can stay in a commit or handoff linked from its tracker when that suffices. Create a report only for required or useful durable detail, not every check or fixture repair.

Preserve revision/environment, workload, results, material failures and limits, distinguishing native, fixture, browser, live-provider and stress evidence. A later pass does not qualify another workload. Current work and unmet acceptance remain in their focused tracker. Settled evidence is filed with context and explicit corrections; current truth is rewritten. Read historical records only for a relevant question. Never sum overlapping cumulative spending figures into a new total.

Raw logs, traces, profiles, dumps and screenshots stay outside Git unless explicitly requested as deliverables. Authored fixtures and reusable tools are source, not generated output. Requested media and asset references follow [Asset workflows](../../docs/asset-workflow.md), the [storage policy](../../docs/projects/game-asset-storage-feature-spec.md#2-agreed-product-decisions) and [URL contract](../../docs/projects/game-asset-storage-tech-design.md#5-url-and-repository-contract). Preserve asset payloads externally with exact verified permanent revision references. Report unpublished location/status; temporary storage is not a durable archive. Existing assets/links remain until migration checks pass. Preserve privacy and real financial uncertainty.

## Keep maintainer work synchronized

Before code/design changes, discover relevant work through the [maintainer index](../../docs/maintainers/README.md) and focused trackers. Read affected design owners, decisions, dependencies and exit criteria; cite their paths/IDs in the handoff. Tasks, dependencies, blockers and acceptance have one focused owner; use [TODO](../../docs/maintainers/TODO.md) only when none fits.

For edit-authorized work, reconcile affected entries at coherent delivery checkpoints and before handoff in both directions: unfinished accepted requirements and concrete gaps needing follow-through have tracked coverage, and tracked work still describes what remains. Include direct dependents when their prerequisites change; preserve their actual integration/evidence requirements. This is an affected-scope check, not a whole-backlog audit. Findings-only reviews report discrepancies without editing.

If reconciliation finds no gaps or stale records, leave accurate entries unchanged; an empty remaining-work list is valid.

- **Missing work:** reuse or extend a matching entry; create one only for work needing durable follow-through. State the outcome, dependencies and completion criteria. Before a design handoff, reconcile proposed implementation and verification entries; label unapproved scope as proposed.
- **Satisfied criteria:** check only the satisfied scope and link evidence. Separate delivered work from remaining implementation or acceptance; do not close an unfinished parent. Apply the design/delivery distinction below.
- **Still-relevant deferred or blocked work:** keep it open with the actual reason and condition for resuming. Accurate entries need no rewrite.
- **Duplicate, superseded or no-longer-applicable work:** remove it from active work with a supported reason and replacement link where applicable; preserve unique requirements and repair dependencies. Record its actual disposition, not a false completion.
- **Regression:** reopen the affected scope and identify what invalidated completion; preserve the earlier evidence's original scope.

A task entry grants no execution authority. Routine edits and speculative improvements need no new task; significant actionable out-of-scope findings belong once in their owner. Age, low priority or unavailable verification does not make accepted work obsolete. Retiring an accepted requirement needs evidence that its purpose is satisfied elsewhere or no longer applies, or an authorized scope decision; do not silently cancel it for convenience. Keep IDs stable and file closed entries under the [tracker filing rules](../../docs/documentation-system.md#growth-rules-that-do-not-require-another-maintenance-programme).

For long-running work retain one compact current-progress section in the existing tracker or plan: unfinished scope, consequential decisions, next action, applicable evidence and owned resources/financial uncertainty. Replace stale content; do not create a parallel progress diary. A safety commit or routine reconciliation needs no new report or repeated deferral notes. Material planning risk and explicitly requested records still apply.

Accepted policies expected to change use [Policies to revisit](../../docs/maintainers/revisitable-policies.md): current policy remains in its canonical owner; the register records why, when and by whom reconsideration is needed. A trigger grants no permission to relax it.

## Project status and completion

Project feature specifications and technical designs have a compact status table immediately after the title. Supporting evidence and navigation need not duplicate live status.

```markdown
| Status      | Current progress                                                                       | Last updated |
| ----------- | -------------------------------------------------------------------------------------- | ------------ |
| In progress | Implementation is finished; required browser verification remains open in the tracker. | YYYY-MM-DD   |
```

Use Not started, In progress, Blocked or Completed. The progress cell is one plain-language sentence, not a task inventory. An optional rough percentage must be supported by scope/evidence. Update status and dates when substantive content, progress, decisions or acceptance changes. Reconcile affected owners at coherent checkpoints and before handoff; unchanged reviews need no new date. Related documents must agree with the tracker. Do not refresh architecture-use timestamps on rereads unless explicitly requested; then record actual use at the applicable checkpoint.

Task completion applies to the outcome named by that task. Close a design-only entry when its requested documents, required decisions and review are complete, linking the design and remaining implementation entries. Required unanswered design questions keep it open. Design completion does not authorize implementation or satisfy delivery/qualification criteria. For a feature-delivery project, keep its overall status unfinished and describe design completion in progress. A project scoped solely to design may be Completed as design, with that scope explicit.

Mark Completed only when agreed scope, integration, documentation, review fixes and required evidence are complete. In the completion change, follow [contract promotion and completed filing](../../docs/documentation-system.md#current-contracts-and-completed-projects): retain discoverable current contracts, file completed project material under `docs/projects/completed/<year>/`, and repair incoming/internal references together. Existing completed paths need no immediate move. Intermediate checkpoints do not move files; unfinished shared scope and required human evidence stay active. Reopen only the affected scope; an expansion need not reopen old work. Keep useful meaning and evidence without duplicate active copies.

## Project approval and current truth

Use [root authorization](../../AGENTS.md#task-scope-and-authorization) and the [design transition](../skills/openlegend-design/SKILL.md#approval-to-implementation). Before implementation reconcile missing/conflicting requirements and tracker coverage. Accurate design need not be copied into multiple documents before coding. Reconcile affected owners at coherent delivery checkpoints and before handoff; update consequential decisions or blockers when they change.

Current contracts distinguish implemented behavior, accepted-but-undelivered targets and proposals. Project documents own scope and meaningful rationale, linking persistent contracts rather than competing with them. Apply the [current-state documentation rule](../../AGENTS.md#documentation-is-a-maintained-source-of-truth), including its explicit history, status, verification and revision exceptions. Explain consequential tradeoffs beside the final contract; use Git for editing history. Keep superseded narratives in explicit history; old archives are not current authority. Do not reorganize unrelated archives for a local project.

## Lightweight decision history

Record consequential accepted product/contract decisions and major capabilities in the same change using the [weekly history collection](../../docs/documentation-changelog.md). One coherent entry states what, why, material tradeoffs, consequences and links to current owners/work IDs. Distinguish accepted targets, delivery and evidence. Skip typos, routine status edits and minor fixes; no entry per editing pass. Current rationale stays beside its contract; history is neither a specification nor another task list. Dates reflect actual decisions; never invent unknown historical dates.

## Reconcile documentation

Code/evidence establishes current behavior; accepted requirements establish targets. Explain changed assumptions and reconcile owners without weakening a specification to excuse a defect or treating a proposal as accepted. Unresolved material choices stay in their focused owner.

At coherent checkpoints and before handoff, reconcile the affected contracts, task dispositions/dependencies, project status and navigation together. Replace stale descriptions of current behavior rather than append corrections. Apply [task maintenance](#keep-maintainer-work-synchronized) and the relevant [filing/navigation rules](../../docs/documentation-system.md); new or moved owners must remain discoverable. Preserve unchanged valid content and unrelated archives. Review this against the actual task and diff, not merely the documents already edited; missing documentation updates are part of the change. Read-only requests report gaps instead.

For conversation capture extract agreed decisions, requirements, useful examples, constraints, evidence limits, tasks and questions into their existing owners. Check that each useful point is represented without copying the transcript, progress narration or a chain of revisions. Silence means agreement only where explicitly granted for that conversation; it never grants destructive, paid or permission-changing authority.

Before consolidating/deleting, preserve unique useful requirements, facts, tasks, questions, criteria and references. Retain IDs, checkbox state, dependencies, blockers, valid evidence and exit criteria. Apply [root preservation](../../AGENTS.md#documentation-is-a-maintained-source-of-truth); internal plans or summaries cannot authorize reversal. Explain authorized consequential changes and tradeoffs without retaining a chain of editing passes. Keep current contract and task sections up to date; dated records follow the same explicit-purpose or developer-requested exceptions.

Review the affected diff for lost meaning, duplicate owners, stale status and misplaced decisions. For moved paths/headings, search repository-wide including code comments and copyable instructions; repair incoming/internal targets and anchors in the same change. Update local reasoning when it changes. Edit affected owners only; concrete follow-up work is not a duplicate generic risk list.
