---
name: openlegend-rebase
description: >-
  Select and refresh the correct development base, reconcile branch history safely, and
  stop immediately for any uncertain rebase or merge resolution.
---

# Reconcile before continuing

Apply [root task authorization](../../../AGENTS.md#task-scope-and-authorization) and perform development synchronization after initial planning, before implementation. Explicit read-only tasks permit inspection only.

A standalone rebase is a narrow reconciliation task, not fresh feature qualification. Plan from the expected overlap and risk; a routine rebase needs no new durable plan under [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized). Before rewriting, record the old base and branch tip so the resulting patch series can be compared and prior review/verification evidence assessed.

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

If any resolution is not 100% certain or requires developer input, stop all work immediately, preserve the conflicted state and ask the developer with the affected paths, competing intentions and decision needed. Do not continue independent conflicts or implementation while awaiting input. Do not add new features merely to make divergent designs coexist. Report major resolved conflicts and their rationale, especially decisions or initially uncertain resolutions settled by the developer.

Do not force-push a shared branch without authorization; an authorized rewrite should use a lease, not an unconditional force.

## Review and verify reconciliation

Compare the pre/post-rebase patch series, for example with `git range-diff` over the old and new base/tip pairs. Inspect conflict resolutions and overlapping upstream behavior, including affected callers and contracts even when Git applied the commits cleanly. For previously reviewed work, this is the affected diff under [Review](../openlegend-review/SKILL.md); reuse prior evidence where its assumptions remain valid. Repeat a full branch review only when reconciliation materially changes the feature, invalidates that review evidence or the task explicitly requires it. Missing prior evidence is a reported limit, not a claim that the feature was qualified.

Select checks from the reconciliation's actual effects under [Verification](../../rules/verification.md#rebase-verification). Update only genuinely affected owners/trackers under [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized). Report the reconciled refs, significant resolutions and actual checks or reused evidence, then apply the [root completion and stopping rule](../../../AGENTS.md#completion-and-handoff--every-task). A routine rebase does not restart the feature's entire acceptance matrix.
