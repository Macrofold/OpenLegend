---
name: openlegend-performance
description: >-
  Read before planning, implementing or reviewing executable behavior or runtime data flow,
  including ordinary features and new files. Also use for scaling/latency investigations;
  exclude prose, comments and non-executable formatting.
---

# Bound work and preserve meaning

Before choosing an algorithm, identify who calls it, how often, what grows, and whether work is repeated across objects, requests, observers, or frames. Separate setup from recurring cost. Use existing semantic owners and query helpers; avoid accidental full scans, repeated copies, and nested preparation. A bounded result does not prove bounded work.

Select eligible candidates and only the fields or proof the caller consumes before expensive preparation. Use exact lookups for known identities and share target-independent work within a compatible read. Use existing indexes first. Add caches, indexes, workers, hierarchy, or batching for a demonstrated cost or clear task requirement, not speculative scale. Reuse must preserve permissions, actual dependencies, current-format restoration, ordering, and bounded retention; derived preparation is never another authority.

Match the evidence to the change. A clear, low-risk removal of repeated pure work can use source reasoning and focused correctness checks. An uncertain or invasive optimization needs measured attribution before editing. Claims of faster complete behavior need representative complete-path measurements; fewer helper calls alone are not sufficient.

Select performance checks under [Verification](../../rules/verification.md). Distinguish ordinary workload, required capacity, required measurements, and exploration. Stress only the relevant dimensions. Specify the question and stopping condition before expensive experiments. Repeat for a defined purpose, including variance and reproducibility; do not search for a favorable run. Preserve actual simulation progress, mechanical and privacy semantics, and honest failed results.

Load only the matching detailed contract below. An ordinary feature reads this core, not every performance chapter or historical report. Relevant high-risk behavior still requires its full contract.

- For repeated collection work, caches, retained data or changed prepared reads, read [Preparation, reuse and retained data](../../../docs/performance/preparation.md).
- For queues, workers, asynchronous coordination or recurring scheduling, read [Scheduling, admission and fairness](../../../docs/performance/scheduling.md).
- For database access and its callers, schema/indexes, saved-record codecs/diffs, snapshots or persistence preparation, read [Storage execution and transactional persistence](../../../docs/performance/storage.md).
- For movement, geometry, navigation preparation or sensory candidate work, read [Spatial, navigation and sensory performance](../../../docs/performance/spatial.md).
- For collecting/interpreting performance, optional instrumentation or benchmark drivers, read [Performance measurement and interpretation](../../../docs/performance/measurement.md).

No benchmark, questionnaire or new instrumentation is required merely by loading this guidance. No optimization is needed when the existing design meets the task's requirements and review finds no actionable performance issue.
