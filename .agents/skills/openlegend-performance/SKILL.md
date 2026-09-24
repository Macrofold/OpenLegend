---
name: openlegend-performance
description: >-
  Investigate or change OpenLegend simulation hot paths, hearing/perception, scheduling, scaling,
  browser latency or performance experiments.
---

# Bound work, preserve meaning, measure

Identify the workload and critical path before optimizing: population/density/history, cold versus warm state, requested simulation speed, host/device and input responsiveness. Translate a requested 8× target into native throughput plus server/renderer headroom; do not apply it as a universal promise or treat speed configuration as a benchmark.

Read the affected [performance contract](../../../docs/performance.md), focused tracker and [native stress guide](../../../docs/maintainers/performance-profiling.md). Reuse existing instrumentation and scenarios. Compare equivalent inputs/versions/machines; include setup, tail latency, memory and elapsed work, not one favorable average. Native headroom excludes persistence, browser and AI orchestration, so an isolated pass is not end-to-end qualification.

Remove unnecessary work first. Prefer meaningful change triggers, cheap conservative rejection before exact queries, bounded candidate sets, existing indexes, immutable shared definitions and dependency-correct cache reuse. Include observer scope, geometry/state revisions and lifecycle in invalidation. Budget exhaustion is not evidence of absence or unreachability. For hearing, distance/spatial filtering must not drop actually audible recipients or weaken privacy/intelligibility rules.

Move non-authoritative diagnostics/I/O off critical paths when ordering and failure semantics permit. Add batching, queues, pooling, workers or hierarchical structures only for a justified bottleneck; bound concurrency and backlog and define cancellation/backpressure. Async syntax does not offload CPU. Preserve commit order, RNG draws, simulation steps, source attribution and exact mechanical/disclosure checks unless an explicitly accepted behavior change says otherwise.

For relevant runtime changes, run a bounded stress experiment and the changed live native path under [verification rules](../../rules/verification.md). Use disposable worlds and new output paths; keep private profiles outside Git. A timeout or unavailable environment is an incomplete measurement. Record matched before/after evidence and residual limits in the existing owners. Do not force stress runs for documentation, trivial presentation or unrelated edits.
