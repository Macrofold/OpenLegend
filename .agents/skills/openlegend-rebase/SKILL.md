---
name: openlegend-rebase
description: >-
  Select and refresh the correct development base, reconcile branch history safely, and
  stop immediately for any uncertain rebase or merge resolution.
---

# Reconcile before continuing

Apply [root task authorization](../../../AGENTS.md#task-scope-and-authorization) and perform development synchronization after initial planning, before implementation. Explicit read-only tasks permit inspection only.

A standalone rebase is a narrow reconciliation task, not fresh feature qualification. Plan from the expected overlap and risk; a routine rebase needs no new durable plan under [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized). Before rewriting, record the old base and branch tip so the resulting patch series can be compared and prior review/verification evidence assessed.

## Keep reconciliation short

Apply these principles to rebases and merges, including synchronization within a larger task:

1. **Define the affected work once.** Identify conflicting behavior, its owners and callers, prior evidence and the smallest checks needed in a concise conversation checklist. Routine reconciliation should take a few minutes. If competing implementations or substantial code adaptation make that unrealistic, explain the concrete reason early; speed never overrides history protection or the conflict stop.
2. **Compare precisely, then resolve.** Start with Git's three-way conflict diff, targeted function/file comparisons and patch-series comparison. Separate mechanical conflicts from behavior changes; resolve known mechanical cases together. Read each affected owner/caller in a bounded pass and retain the decision. Revisit only for a changed resolution, unanswered question or failure. Narrow truncated output instead of repeatedly dumping large files. Build custom comparison tooling only when existing tools cannot answer a specific necessary question.
3. **Reuse valid evidence.** Review the reconciliation's changes and overlapping upstream behavior, not the entire feature again. Integrate through the agreed semantic owner rather than creating parallel paths to make both versions coexist. Do not add unrelated improvements or redesign merely because both branches touched a subsystem.
4. **Choose checks before running them.** Follow [rebase verification](../../rules/verification.md#rebase-verification); no browser tests belong in reconciliation. Prefer focused existing checks with a known compatible fixture. A missing check can justify one small scenario for a concrete unresolved risk, not a collection of temporary harnesses or a new lifecycle matrix. Repeat a check only after a relevant edit or to investigate its failure; correct all known setup/expectation issues before rerunning.
5. **Reconcile documents without creating ceremony.** Resolve documentation conflicts and update newly inaccurate contracts or status. Accurate plans, reports and remaining-work entries stand. Do not create a merge diary, new evidence report or repeat unchanged deferrals merely to record the operation; material planning requirements still apply.
6. **Finish at the agreed boundary.** After the requested history operation, affected-diff review and selected checks pass, report the refs, consequential resolutions and verification limits, then stop. Establish whether a failure is introduced or pre-existing; fix introduced failures, and report unrelated baseline failures without repairing them as part of reconciliation. Unchanged broader qualification remains tracked, not reopened as merge work.

These limits govern reconciliation, not separately authorized feature implementation or required CI. Agent reading, analysis and harness setup are part of elapsed time; short test execution does not justify prolonged preparation.

## Select the target

Inspect branch/worktree status, remotes, tracking upstream, PR metadata and uncommitted work. Select the base in this order:

1. The task's explicitly specified base branch/ref and repository.
2. The current branch's PR target in its base repository. For a stacked PR this is its parent branch, not the repository default or the bottom of the stack.
3. The intended repository remote's verified default branch.

A tracking upstream such as `origin/feature` normally identifies where the current branch fetches/pushes; it does not establish the merge target. Do not substitute it, assume `origin` is the intended repository in a fork setup, or hard-code `main`. Establish the intended repository/remote and ref from task context and current metadata; if ambiguous, ask before rewriting history. If a higher-priority target is known but unavailable, report the blocker rather than silently falling through to a different target.

Report the selected repository/remote, exact ref and resolved commit, plus why that precedence applies. For an explicit local ref or commit with no remote, say so and report its resolved commit; do not invent a remote association.

## Refresh and reconcile safely

Refresh the selected remote/ref and verify its resolved commit before using it; a stale remote-default pointer is not fresh evidence. On the target branch, use a safe fast-forward update; on a development branch, rebase onto the selected updated base. If the task explicitly requests a merge, honor that operation rather than replacing it with a rebase. Reconcile the implementation plan with base changes before continuing. If access/tooling prevents the required refresh or reconciliation, report the blocker rather than proceeding as though it succeeded.

Preserve unrelated edits and other contributors' commits. Do not silently reset, discard, stash or rewrite a shared branch. Account for staged, unstaged and untracked work before any operation that could affect it; do not auto-stash it. For shared/in-use worktrees or published shared history, establish safe coordination and authorization before rewriting; do not switch or mutate another task's checkout. In detached HEAD, establish the intended destination branch/ref before a history rewrite; do not infer or create one merely to proceed. A divergent target branch needs an explicit safe reconciliation, not an automatic reset or rebase of shared history.

## Conflict resolution

Resolve conflicts from both sides' intent and current contracts, not blanket ours/theirs. Inspect non-conflicting neighboring edits for semantic overlap, especially mutation ownership, observer privacy, schemas, generated configuration, receipts, saved state and task IDs. Regenerate artifacts from their authored sources with the pinned tools where appropriate; do not hand-merge generated output or invent a replacement lockfile.

If any resolution is not 100% certain or requires developer input, stop all work immediately and preserve the conflicted state. Before asking for approval, explain each conflict in plain language: the affected paths, what each side intends, the consequences of choosing either side, and the proposed resolution with its rationale. State exactly what remains uncertain and which decision or missing fact is needed; clearly label tentative proposals. Do not continue independent conflicts or implementation while awaiting input. Do not add new features merely to make divergent designs coexist. Report major resolved conflicts and their rationale, especially decisions or initially uncertain resolutions settled by the developer.

Do not force-push a shared branch without authorization; an authorized rewrite should use a lease, not an unconditional force.

## Review and verify reconciliation

Compare the pre/post-rebase patch series, for example with `git range-diff` over the old and new base/tip pairs. Inspect conflict resolutions and overlapping upstream behavior, including affected callers and contracts even when Git applied the commits cleanly. For previously reviewed work, this is the affected diff under [Review](../openlegend-review/SKILL.md); reuse prior evidence where its assumptions remain valid. Repeat a full branch review only when reconciliation materially changes the feature, invalidates that review evidence or the task explicitly requires it. Missing prior evidence is a reported limit, not a claim that the feature was qualified.

Select checks from the reconciliation's actual effects under [Verification](../../rules/verification.md#rebase-verification). Update only genuinely affected owners/trackers under [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized). Report the reconciled refs, significant resolutions and actual checks or reused evidence, then apply the [root completion and stopping rule](../../../AGENTS.md#completion-and-handoff--every-task). A routine rebase does not restart the feature's entire acceptance matrix.
