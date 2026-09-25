---
name: openlegend-rebase
description: >-
  Before off-main development, rebase onto current main; reconcile conflicts without losing
  semantic intent and stop immediately for any uncertain resolution.
---

# Reconcile before continuing

First inspect branch/worktree status, upstream refs and uncommitted work. Refresh `main` and, unless already on `main`, rebase onto it before development. Report the exact base used. Explicit read-only tasks permit inspection, not branch mutations. Preserve unrelated changes and other contributors' commits; do not silently reset, discard, stash or rewrite a shared branch. If access/tooling prevents the required refresh or rebase, report the blocker rather than proceeding as though it succeeded.

Resolve conflicts from both sides' intent and current contracts, not blanket ours/theirs. Inspect non-conflicting neighboring edits for semantic overlap, especially mutation ownership, observer privacy, schemas, generated configuration, receipts, saved state and task IDs. Regenerate artifacts from their authored sources with the pinned tools where appropriate; do not hand-merge generated output or invent a replacement lockfile.

If any resolution is not 100% certain or requires developer input, stop all work immediately, preserve the conflicted state and ask the developer with the affected paths, competing intentions and decision needed. Do not continue independent conflicts or implementation while awaiting input. Do not add new features merely to make divergent designs coexist. Report major resolved conflicts and their rationale, especially decisions or initially uncertain resolutions settled by the developer.

After reconciliation inspect the complete branch diff against the updated base, then use the [review skill](../openlegend-review/SKILL.md) and applicable [verification policy](../../rules/verification.md). Reconcile documentation and completion state without closing unmet gates. Do not force-push a shared branch without authorization; an authorized rewrite should use a lease, not an unconditional force.
