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

Explicitly look for duplicate or overlapping queries across callers and consider reusing already-fetched data, fetching only missing data, or sharing identical in-flight reads. Reuse must match the required fields, permissions/observer scope and state or transaction snapshot. Prefer request-scoped reuse; longer-lived caches need clear ownership, bounded storage and complete invalidation, including edits, deletions and restores. Keep consumers from mutating shared results, and measure the complete path to confirm a real reduction in work without stale or unauthorized data.

Before replacing a fast path with a shared helper, compare the conditions each actually handles; broader usefulness does not prove replacement coverage. In the selected checks, include a previously cheap case, the newly supported case and a meaningful refusal. Record whether each finishes directly or now requires deferred preparation, not only whether it eventually succeeds or its warm timing. Preserve a useful shortcut until the replacement covers its valid cases and cost, or document a justified tradeoff. [PX01's ramp review](../../../docs/verification/first-threat-encounter.md#px01-navigation-review--october-6-2026) demonstrates why: walking across ground edges did not cover entering a ramp inside a larger ground patch, so a successful route still regressed into unnecessary mesh preparation.

For paged SQL, a result limit or application scan allowance does not bound database work. Inspect the actual production query plan, including rows, repeated loops and buffer reads, on representative data before manually refreshing statistics; fresh bulk and naturally aged data are distinct workloads. A bounded first query can still multiply whole-history scans in later joins. Prefer indexed selection and batched related reads in the same snapshot when the plan demonstrates that problem. Count statements across the complete observer/source batch, not only one observer. A timeout disappearing is not sufficient performance evidence.

Move non-authoritative diagnostics/I/O off critical paths when ordering, durability and failure semantics permit. Coalesce replaceable snapshots, not distinct speech, acquisition events or committed effects; skipping work must preserve its required outcome. Add batching, queues, pooling, workers or hierarchy only for a justified bottleneck; bound concurrency/backlog and define cancellation/backpressure. Async syntax does not offload CPU. Preserve commit order, RNG draws, simulation steps, attribution and mechanical/disclosure checks unless an accepted behavior change explicitly allows otherwise.

Exercise a relevant bounded stress workload and the changed runtime path under [Verification](../../rules/verification.md). Use disposable worlds and new private output paths. Record matched before/after evidence, variance and remaining bottlenecks; unavailable baseline or runtime access is a limit, not invented improvement. A timeout is incomplete, not a capacity pass. Do not require stress for unrelated edits or weaken behavior just to hit a timing number.
