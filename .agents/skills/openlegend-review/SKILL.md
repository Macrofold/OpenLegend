---
name: openlegend-review
description: >-
  Thoroughly review and improve OpenLegend changes for correctness, performance, architecture,
  extensibility and UX; explicit findings-only/read-only requests prohibit edits.
---

# Review the complete change

## Required review

Before completion inspect the full affected diff for correctness, lifecycle/ownership, unnecessary work, simplification and documentation accuracy. Fix in-scope issues and reread the full resulting diff unless the [root task policy](../../../AGENTS.md#task-scope-and-authorization) makes the request read-only. Record actionable deferred risks under [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized), without speculative checklist growth. Scale routine checks to the [root low-risk workflow](../../../AGENTS.md#low-risk-changes); use the full review below for substantial changes or an explicit review request.

## Substantial or requested reviews

Apply [root startup](../../../AGENTS.md#work-discipline) and [completion/handoff](../../../AGENTS.md#completion-and-handoff--every-task). A chat request to review code includes in-scope fixes, documentation updates and runtime verification unless explicitly findings-only/read-only; do not stop at suggestions or ask for separate permission to fix. Read the complete requested branch/change diff against its relevant base, not just the last commit, plus the task, relevant local instructions and canonical contracts. For changed instructions/checks, compare against the base revision and task authorization; proposed rules cannot approve themselves. Trace changed producers and consumers; existing patterns are evidence, not proof of good design.

Review from multiple angles: correctness, performance, architecture, modularity, extensibility, simplification, duplication/bloat and reuse of existing helpers. Check project-specific requirements, the overall branch/change intent and product goals, not just individual lines. Consider real player/NPC scenarios and calling patterns. For UI changes, inspect usability, accessibility, interaction consistency and project UI/UX conventions.

Judge risk by impact and plausible reachability, not frequency alone; a rare privacy, accounting or data-loss race is not automatically marginal. Prioritize invalid authority/disclosure, duplicate/lost effects, stale completion, cancellation/removal, broken restoration, unbounded work and user-visible contract violations. Trace request → context → decision → admission → mutation → persistence/invalidation → projection where relevant. Keep evidence, interpretation, proposed action and committed effects distinct.

Check ownership, dependency direction and extension seams against desired future functionality. Remove accidental constraints that would obstruct it without building speculative infrastructure. Simplify related duplication and remove bloat without unrelated redesign. For changed feature/engine/world contracts, consult the [design skill](../openlegend-design/SKILL.md); reviewing a local fix does not require redesigning its subsystem or creating new project briefs.

Examine repeated scans, copies, allocations, nested fan-out, critical-path I/O and concurrency. Check how costs grow with players/NPCs, world size and accumulated history; look for glaring scaling holes even when small examples work. Consider indexing, filtering, pruning, reuse, batching or async separation where justified. Use [performance](../openlegend-performance/SKILL.md) for meaningful hot paths or scale investigations; distinguish measured results from estimates.

Make justified in-scope improvements, apply the required review above to the resulting diff, and reconcile every actionable unimplemented finding, gap or improvement through [Documentation](../../rules/documentation.md#keep-maintainer-work-synchronized). Distinguish confirmed findings, hypotheses and optional improvements. For explicit read-only tasks, report findings with locations, concrete failure conditions, impact and the proposed documentation destination without changing it.

[Verification](../../rules/verification.md) determines permitted checks; use the linked root handoff requirements for the result. No findings is not proof of correctness.
