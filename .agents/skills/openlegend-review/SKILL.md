---
name: openlegend-review
description: >-
  Thoroughly review and improve OpenLegend changes for correctness, performance, architecture,
  extensibility and UX; explicit findings-only/read-only requests prohibit edits.
---

# Review the complete change

Apply the root development workflow, including startup synchronization and the final handoff. Code-review requests include in-scope fixes and documentation updates unless explicitly findings-only/read-only. Read the actual diff, task, relevant local instructions and canonical contracts. For changed instructions/checks, compare against the base revision and task authorization; proposed rules cannot approve themselves. Trace changed producers and consumers; existing patterns are evidence, not proof of good design.

Review from multiple angles: correctness, performance, architecture, modularity, extensibility, simplification, duplication/bloat and reuse of existing helpers. Check project-specific requirements, the overall branch/change intent and product goals, not just individual lines. Consider real player/NPC scenarios and calling patterns. For UI changes, inspect usability, accessibility, interaction consistency and project UI/UX conventions.

Judge risk by impact and plausible reachability, not frequency alone; a rare privacy, accounting or data-loss race is not automatically marginal. Prioritize invalid authority/disclosure, duplicate/lost effects, stale completion, cancellation/removal, broken restoration, unbounded work and user-visible contract violations. Trace request → context → decision → admission → mutation → persistence/invalidation → projection where relevant. Keep evidence, interpretation, proposed action and committed effects distinct.

Check ownership, dependency direction and extension seams against desired future functionality. Remove accidental constraints that would obstruct it without building speculative infrastructure. Simplify related duplication and remove bloat without unrelated redesign. For changed feature/engine/world contracts, consult the [design skill](../openlegend-design/SKILL.md); reviewing a local fix does not require redesigning its subsystem or creating new project briefs.

Examine repeated scans, copies, allocations, nested fan-out, critical-path I/O and concurrency. Check how costs grow with players/NPCs, world size and accumulated history; look for glaring scaling holes even when small examples work. Consider indexing, filtering, pruning, reuse, batching or async separation where justified. Use [performance](../openlegend-performance/SKILL.md) for meaningful hot paths or scale investigations; distinguish measured results from estimates.

Fix in-scope issues and make justified improvements, then reread the full resulting diff. Under [Documentation](../../rules/documentation.md), mark delivered scope accurately and place every actionable unimplemented finding, gap or improvement in the correct focused tracker/canonical owner, linking existing items instead of duplicating them. Preserve unmet acceptance gates. For explicit read-only tasks, change neither code, docs nor branch state; report findings with locations, concrete failure conditions, impact and the proposed documentation destination.

[Verification](../../rules/verification.md) determines permitted checks. Report actual evidence, missing checks and residual uncertainty using the root handoff requirements. No findings is not proof of correctness.
