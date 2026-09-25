---
name: openlegend-rebase
description: >-
  Rebase an OpenLegend branch on updated main or resolve requested merge conflicts while
  preserving semantic changes and unrelated work.
---

# Reconcile before continuing

Inspect branch/worktree status, upstream refs and uncommitted work first. Preserve unrelated changes and other contributors' commits; do not silently reset, discard, stash or rewrite a shared branch. Fetch the requested base when access permits and state the exact base used. Worktree or remote limitations are reported, not disguised as a completed rebase.

Resolve conflicts from both sides' intent and current contracts, not blanket ours/theirs. Inspect non-conflicting neighboring edits for semantic overlap, especially mutation ownership, observer privacy, schemas, generated configuration, receipts, saved state and task IDs. Regenerate artifacts from their authored sources with the pinned tools where appropriate; do not hand-merge generated output or invent a replacement lockfile.

If a consequential product/architecture conflict remains unclear, preserve the work and report the competing choices instead of silently selecting one. Resolve safe independent conflicts and continue remaining in-scope work when feasible. Do not add new features merely to make divergent designs coexist.

After reconciliation inspect the complete branch diff against the updated base, then use the [review skill](../openlegend-review/SKILL.md) and applicable [verification policy](../../rules/verification.md). Reconcile documentation and completion state without closing unmet gates. Do not force-push a shared branch without authorization; an authorized rewrite should use a lease, not an unconditional force.
