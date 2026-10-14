---
name: merge-branch
description: Squash-merge the newest local/origin source branch into a destination, summarize its actual changes and provenance, report conflicts, and push to origin.
---

# Squash-merge a branch and push

Usage: `merge-branch <source>` or `merge-branch <source> into <destination>`. Default to the working repository's freshly verified `origin` default branch; in OpenLegend this is local `main`. An invocation authorizes the selected integration and normal destination push. Reading/editing the skill or an ordinary merge request does not itself authorize publication.

Operate on the working repository, even when the global entrypoint loads this file from another checkout. Apply the target repository's instructions and verification rules. In OpenLegend, follow [Rebase](../openlegend-rebase/SKILL.md) for preservation and conflict stops, and [rebase verification](../../rules/verification.md#rebase-verification) for proportional checks. Those project-specific links apply only to OpenLegend.

## Select the source

Inspect the current branch/worktrees, pending operations, staged/unstaged/untracked edits and origin URL. Validate branch names; use exact refs and safe argument quoting. Normalize a supplied `origin/` prefix, unless the developer explicitly pins a source ref/commit.

Check both `refs/heads/<source>` and the actual branch on origin. Query origin, then explicitly fetch an existing remote branch into `refs/remotes/origin/<source>`; a `+` refspec can refresh that tracking ref without changing local history. Do not use a deleted branch's stale tracking ref. Network failure is a blocker, not proof of absence.

Compare full tip hashes by ancestry:

- Only one exists: use it. Neither exists: report the missing branch.
- Equal hashes: the same tip exists in both locations.
- Local is an ancestor of origin: use origin.
- Origin is an ancestor of local: use local, including committed unpublished source work.
- Neither is an ancestor: report both hashes and unique work, then ask which to use. Do not choose by dates/counts or combine them without authorization.

Honor an explicitly pinned revision. Freeze the chosen full hash for both merge and provenance; never include or commit source-worktree edits. Finish independent inspection before asking about missing source/destination information.

## Prepare the destination

An explicit destination wins. Otherwise query origin's advertised HEAD, not a stale default pointer. Refresh the exact destination origin ref. Fast-forward a behind local destination; retain an ahead destination; stop for developer-directed reconciliation if they diverge. Do not reset/rebase shared history or force-push to make this operation succeed.

Require a clean destination and no unfinished merge/rebase/cherry-pick/revert. Do not discard, auto-stash or commit unrelated edits. Reuse an authorized destination checkout; never take over another task's checkout or force one branch into two worktrees. A missing local destination may be created from its verified origin tip under repository policy. Do not invent a base.

Report the repository, exact source/location/hash and destination/hash before merging. Report every branch/worktree creation, switch or rename when it happens and in the handoff, with previous/new branches, absolute paths and detached commits where relevant.

Inspect earlier unpublished destination commits: pushing also publishes those ancestors. Existing authorization can cover them; ask if unrelated pending work is not authorized. This command does not delete the source, edit its checkout, create a PR or change remote configuration.

## Integrate and resolve

Record the destination's pre-merge commit. Review the incoming delta and overlapping destination behavior. Reuse verified prior-import tips and valid evidence; previous squash imports can make ancestry misleading. Do not reread already-integrated history or requalify the whole feature.

Run `git merge --squash <frozen-source-hash>`. It prepares one new destination commit without rewriting source history or squashing existing destination commits. Do not substitute a normal merge followed by destination history rewriting.

Resolve certain conflicts from both sides' intent and current authoritative contracts. Preserve newer delivered behavior, useful docs, stable IDs and actual acceptance status; regenerate generated files with their owning tools. Avoid blanket ours/theirs, inspect neighboring automatic merges, and reconcile newly stale docs/trackers.

Report affected files, both intentions, the chosen resolution and rationale. If any resolution is uncertain or requires developer input, stop all work, preserve conflicts, explain alternatives and recommendation, and await the answer. Follow any stricter repository conflict rule. No unresolved conflict may be committed or pushed.

Review the complete staged diff against the recorded destination and run checks selected by reconciliation effects. Fix introduced issues; distinguish baseline failures, reused evidence and unrun checks. Do not convert a merge into broader qualification or net-new work.

With no net changes, create no empty commit. Report already-integrated content. A previously created matching squash commit may be pushed after its provenance and publication scope are verified; otherwise do not publish unrelated commits for a no-op merge.

## Commit the full net change

Read the installed `commit` skill and reuse its summarization, formatting and scope rules only. Do not invoke its commit-pending or history-rewrite procedure. If it is unavailable, the required format remains:

- A concise one-line subject; blank line; 1–10 bullets, each fewer than 20 words. Group aggressively, use as few as needed, largest impact first.
- Summarize all actual net integration changes against the recorded destination, not just the last source commit or every intermediate message. Omit canceled approaches; describe an extension as an extension.
- After another blank line, add `Squashed-from: <source-branch-name> at <full-frozen-tip-commit-hash>`. Use the chosen source tip, never the base/destination/result hash. Preserve the branch name losslessly if ASCII escaping is required.
- Printable ASCII plus actual LF newlines. Write/validate a temporary UTF-8 message file and commit with `git commit --file <message-file>`; verify the final message and provenance.

Verify exactly one new commit above the recorded destination, with that tip as its only parent, the reviewed tree unchanged, and no task edits left uncommitted. Required unresolved checks prevent completion.

## Push and finish

After verification, push the exact summary commit to the destination with an explicit refspec: `git push origin <summary-commit>:refs/heads/<destination>`. Do not push the source or rely on a different tracking upstream. On rejection, keep the local commit, refresh/inspect origin and report the needed safe reconciliation; never force, reset or silently rewrite history.

Confirm origin contains the summary commit. A concurrently advanced remote may require ancestry verification rather than equal-tip verification. Report source branch/location/full tip, destination/result commit, significant conflicts and rationale, checks/limits, push result and final status. Say explicitly when there were no conflicts or publication failed/was not performed. Then stop.
