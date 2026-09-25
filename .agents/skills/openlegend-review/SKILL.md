---
name: openlegend-review
description: >-
  Review OpenLegend changes for correctness, lifecycle, architecture, extensibility and
  performance. Review-only tasks report findings; apply fixes only when requested.
---

# Review the complete change

Establish whether the task requests findings only or permits edits. Read the actual diff, task, relevant local instructions and canonical contracts. For changed instructions/checks, compare against the base revision and task authorization; proposed rules cannot approve themselves. Trace changed producers and consumers; existing patterns are evidence, not proof of good design.

Judge risk by impact and plausible reachability, not frequency alone; a rare privacy, accounting or data-loss race is not automatically marginal. Prioritize consequential failures: invalid authority/disclosure, duplicate/lost effects, stale completion, cancellation/removal, broken restoration, unbounded work and user-visible contract violations. Trace request → context → decision → admission → mutation → persistence/invalidation → projection where relevant. Keep evidence, interpretation, proposed action and committed effects distinct.

Check ownership, dependency direction and extension seams. Find opportunities to reuse helpers, simplify related duplication and remove bloat without unrelated redesign. For changed feature/engine/world contracts, consult the [design skill](../openlegend-design/SKILL.md); reviewing a local fix does not require redesigning its subsystem.

Examine repeated scans, copies, allocations, nested fan-out, critical-path I/O and concurrency. Consider indexing, filtering, pruning, reuse, batching or async separation where justified. Use [performance](../openlegend-performance/SKILL.md) for a real investigation, not unsupported optimization claims.

With edit authorization, fix consequential in-scope issues and reread the resulting full diff. Otherwise report findings with location, concrete failure conditions and impact; separate hypotheses and optional improvements. Do not modify code, trackers or branch state just because this procedure says “fix.” Record actionable deferred work only when updates are authorized; preserve unmet acceptance gates and avoid duplicating existing backlog items.

[Verification](../../rules/verification.md) determines permitted checks. Report actual evidence, missing checks and residual uncertainty. No findings is not proof of correctness. For implemented fixes, explain consequential choices and the remaining gaps without filling empty checklist sections.
