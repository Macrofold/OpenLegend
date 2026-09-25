---
name: openlegend-performance
description: >-
  Investigate or change OpenLegend hot paths, perception queries, scheduling, scaling or browser
  latency. Not prose-only mentions of performance or routine cosmetic edits.
---

# Bound work, preserve meaning, measure

Identify the workload and critical path: population/density/history, cold versus warm state, requested simulation speed, host/device and responsiveness. Distinguish 8× simulation speed from 8× workload size using the task and current contract. Define a measurable target with native/server/renderer headroom; speed configuration alone is no benchmark.

For server/native work read the applicable [performance contract](../../../docs/performance.md) and tracker; use the [native stress guide](../../../docs/maintainers/performance-profiling.md) only for native simulation experiments. Browser work uses browser/renderer measurements; an unrelated native benchmark provides no evidence. Compare matched inputs/versions/machines, including setup, tail latency, memory and elapsed work. Native headroom excludes persistence, browser and AI orchestration.

Remove unnecessary work first: meaningful change triggers, conservative rejection before exact queries, bounded candidates, existing indexes, shared immutable definitions and dependency-correct caches. Include observer scope, geometry/state revisions and lifecycle in invalidation. Budget exhaustion is not evidence of absence or unreachability. Hearing filtering must preserve actually audible recipients and privacy/intelligibility semantics.

Move non-authoritative diagnostics/I/O off critical paths when ordering, durability and failure semantics permit. Coalesce replaceable snapshots, not distinct speech, acquisition events or committed effects; skipping work must preserve its required outcome. Add batching, queues, pooling, workers or hierarchy only for a justified bottleneck; bound concurrency/backlog and define cancellation/backpressure. Async syntax does not offload CPU. Preserve commit order, RNG draws, simulation steps, attribution and mechanical/disclosure checks unless an accepted behavior change explicitly allows otherwise.

Exercise a relevant bounded stress workload and the changed runtime path under [Verification](../../rules/verification.md). Use disposable worlds and new private output paths. Record matched before/after evidence, variance and remaining bottlenecks; unavailable baseline or runtime access is a limit, not invented improvement. A timeout is incomplete, not a capacity pass. Do not require stress for unrelated edits or weaken behavior just to hit a timing number.
