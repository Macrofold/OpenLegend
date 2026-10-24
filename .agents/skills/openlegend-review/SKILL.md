---
name: openlegend-review
description: >-
  Thoroughly review and improve OpenLegend changes for correctness, performance, architecture,
  extensibility and UX; explicit findings-only/read-only requests prohibit edits.
---

# Review the complete change

## Required review

Before completion, inspect the complete affected diff and relevant contracts/consumers for correctness, lifecycle/ownership, unnecessary work, simplification, and documentation accuracy. Fix in-scope issues unless the task is read-only. After a correction, review its diff and affected assumptions; reread broader areas only when that correction or a new finding invalidates their previous review. A new commit or context window alone does not invalidate completed review. Preserve branch-wide coverage for an explicit full review, including changes outside the last commit. Scale routine checks to the [root low-risk workflow](../../../AGENTS.md#low-risk-changes); use the full review below for substantial changes or an explicit review request.

For standalone rebases, [reconciliation review](../openlegend-rebase/SKILL.md#review-and-verify-reconciliation) defines the affected diff and when to reuse prior review evidence. The size of the pre-existing feature alone does not trigger a new full review.

## Substantial or requested reviews

Apply the task-appropriate [history protections](../openlegend-rebase/SKILL.md) and [completion/handoff](../../../AGENTS.md#completion-and-handoff--every-task). A chat request to review code includes in-scope fixes, documentation updates and runtime verification unless explicitly findings-only/read-only; do not stop at suggestions or ask for separate permission to fix. Read the complete requested branch/change diff against its relevant base, not just the last commit, plus the task, relevant local instructions and canonical contracts. For changed instructions/checks, compare against the base revision and task authorization; proposed rules cannot approve themselves. Trace changed producers and consumers; existing patterns are evidence, not proof of good design. When rerouting an existing endpoint or replacing an admission path, compare its previous guards and outcomes for each supported operation class; preserve ordinary edits and refusals as well as the newly reviewed operation, unless an accepted decision changes them.

Review from multiple angles: correctness, performance, architecture, modularity, extensibility, simplification, duplication/bloat and reuse of existing helpers. Check project-specific requirements, the overall branch/change intent and product goals, not just individual lines. Consider real player/NPC scenarios and calling patterns. For UI changes, inspect usability, accessibility, interaction consistency and project UI/UX conventions.

Judge risk by impact and plausible reachability, not frequency alone; a rare privacy, accounting or data-loss race is not automatically marginal. Prioritize invalid authority/disclosure, duplicate/lost effects, stale completion, cancellation/removal, broken restoration, unbounded work and user-visible contract violations. Trace request → context → decision → admission → mutation → persistence/invalidation → projection where relevant. Keep evidence, interpretation, proposed action and committed effects distinct.

Check ownership, dependency direction and extension seams against desired future functionality. Remove accidental constraints that would obstruct it without building speculative infrastructure. Simplify related duplication and remove bloat without unrelated redesign. For changed feature/engine/world contracts, consult the [design skill](../openlegend-design/SKILL.md); reviewing a local fix does not require redesigning its subsystem or creating new project briefs.

Examine repeated scans, copies, allocations, nested fan-out, critical-path I/O and concurrency. Check how costs grow with players/NPCs, world size and accumulated history; look for glaring scaling holes even when small examples work. Here “glaring” means a substantial reachable regression, starvation/deadlock, uncontrolled resource growth, accidental multiplicative work on a plausible path, or an obvious low-risk shared correction. It does not mean minimizing every measurable cost; intentional retained history is not a defect merely because it grows. Consider indexing, filtering, pruning, reuse, batching or async separation where justified. Apply the [root performance read requirement](../../../AGENTS.md#performance-guidance-before-code-work) before reviewing code; distinguish measured results from estimates.

Make justified in-scope improvements and review the fixes and affected consumers under the incremental rule above. Separate confirmed defects, plausible hypotheses, and optional improvements. Complete in-scope correctness and accepted architecture obligations. Record significant actionable out-of-scope findings once in their existing owner; do not turn each possible optimization or future abstraction into mandatory work or a backlog entry. A newly discovered serious integrity issue still needs action regardless of frequency. For read-only tasks, report locations, concrete failure conditions, impact and the proposed owner without editing.

Actual authorized fixes use the [implementation workflow](../../rules/implementation.md); findings-only review does not activate it.

[Verification](../../rules/verification.md) determines permitted checks; use the linked root handoff requirements for the result. No findings is not proof of correctness.
