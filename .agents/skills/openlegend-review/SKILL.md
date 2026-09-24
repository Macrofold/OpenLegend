---
name: openlegend-review
description: >-
  Review OpenLegend changes for correctness, lifecycle, architecture, extensibility and
  performance; use for requested or substantial reviews.
---

# Review the complete change

Read the task, actual diff, applicable local instructions and canonical contracts. Trace changed producers and consumers; do not infer correctness from one implementation or assume existing patterns are all desirable.

Prioritize concrete consequential failures: invalid authority/disclosure, duplicated or lost effects/resources, stale completion, cancellation/removal, persistence/restore, unbounded work and visible behavior that diverges from the specification. Follow request → context → decision → admission → mutation → persistence/invalidation → projection where applicable. Distinguish evidence, interpretation, proposed actions and committed effects.

Check semantic ownership, dependency direction and extension seams. Reuse existing helpers and simplify related duplication; preserve clarity over clever compression. A smaller diff is not better if it leaves a broken contract, but a review is not permission for unrelated redesign. Engine/world/invention changes also use the [design skill](../openlegend-design/SKILL.md).

Look for repeated scans, oversized copies, allocation churn, nested fan-out, critical-path I/O and unbounded concurrency. Consider indexing, broadphase filtering, pruning, reuse, batching and async separation only where they preserve behavior and improve meaningful work; use the [performance skill](../openlegend-performance/SKILL.md) for investigation, not speculative optimization claims.

Fix demonstrated or clearly impactful issues within scope, then reread the resulting full diff. Track marginal risks with a concrete scenario and trigger for revisiting them. Preserve requirements and task state; mark only actually delivered scope complete. The [verification policy](../../rules/verification.md), not this review, determines which checks to run.

For review-only requests report actionable findings with code locations, failure conditions and consequences; separate hypotheses and optional improvements. For implementation report fixes, major choices, evidence, remaining gaps and questions. No findings is not proof of correctness, and an unrun check is not a pass.
