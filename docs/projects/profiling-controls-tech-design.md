# Optional performance profiling — technical design

| Status      | Current progress                                                                                                       | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Code and focused checks are complete; the two full-game observations had unequal activity and cannot qualify overhead. | 2026-10-18   |

**Technical design used for review — October 18, 2026, 00:02 EDT.** Architecture and its dated implementation reconciliations remain the design reference; the current review preserves their authority and world boundaries.

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [profiling-controls tracker](../maintainers/profiling-controls.md) owns current completion and verification; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

**Design updated:** October 17, 2026, 18:10 EDT. **Inspected source:** `Macrofold/OpenLegend`, local `codex/profile-smooth-three-times`, commit `1056a21d9d77b384ebefbc1316f11ef70aaa7deb`, with concurrent working-tree edits. This identifies the design baseline, not a benchmark. Implementation reconciles against merged commit `8d726b0af`, retaining the upstream decision owners; see the coordinated execution plan.

## Read and execute in this order

Read the [plain-language specification](profiling-controls-feature-spec.md), this document and applicable repository instructions. Then follow these guides in dependency order. They define the implementation contract; the tracker and evidence report establish what has been verified.

| Guide                                                                        | Work                                                                         | Estimated changed logic, excluding tests |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| [Server and worker implementation](profiling-controls/server-and-workers.md) | PC01–PC03: collector, configuration, callers, navigation and journal workers | Approximately 250–450 lines              |
| [Browser implementation](profiling-controls/browser.md)                      | PC04: inactive work and capture lifecycle                                    | Approximately 70–140 lines               |
| [Tools and verification](profiling-controls/tools-and-verification.md)       | PC05–PC06: explicit collection, ordinary-run comparisons, acceptance         | Approximately 100–220 lines              |

These are planning estimates, not a mandate to add that much code. Overall risk is **medium**: the data is optional, but blanket removal of clocks can accidentally change queue expiry, simulation scheduling or persistence. The highest review priority is preserving those distinctions. Runtime implementation is authorized; completion still requires the linked verification.

## Source findings at design time

| Source owner                                                                                                                                                                                                                     | Current behavior and consequence                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`performance.ts`](../../apps/server/src/performance.ts): `timed`, `timedSync`, `recordDuration`, counters/gauges                                                                                                                | Collection is always active. Bounded maps prevent unlimited retained timing data, but clocks, wrappers, lookups and writes still cost work.                                                                                                                                 |
| [`http.ts`](../../apps/server/src/http.ts): `initializeGameServer`, shutdown                                                                                                                                                     | Calls `startRuntimeMonitoring()` unconditionally, installing event-loop and GC observation plus a one-second CPU/memory sampling timer.                                                                                                                                     |
| [`world-service.ts`](../../apps/server/src/world-service.ts), [`postgres.ts`](../../apps/server/src/postgres.ts), [`history.ts`](../../apps/server/src/history.ts), [`history-batch.ts`](../../apps/server/src/history-batch.ts) | Some clocks are outside the timing wrappers. Guarding only `recordDuration()` would leave their preparation active. Some adjacent clocks enforce real scheduling and must stay.                                                                                             |
| [`navigation/coordinator.ts`](../../apps/server/src/navigation/coordinator.ts), [`worker.ts`](../../apps/server/src/navigation/worker.ts), [`backend.ts`](../../apps/server/src/navigation/backend.ts)                           | Route timing is prepared on both sides of a thread boundary. The coordinator has a 250 ms measurement-only queue-age timer. Worker mesh-build timing arrays exist even without a report consumer.                                                                           |
| [`journal-worker.ts`](../../apps/server/src/journal-worker.ts), [`journal-worker-client.ts`](../../apps/server/src/journal-worker-client.ts)                                                                                     | Background database application installs a duration listener for SQL statistics per batch; client aggregation assumes statistics are present. Saved progress and optional statistics must become independent.                                                               |
| [`diagnostic-counters.ts`](../../packages/domain/src/diagnostic-counters.ts)                                                                                                                                                     | An absent sink already makes increments a cheap branch. Function arguments are still evaluated; for example, `statusReconciliationRules` calls `statusDefinitions(world)` for a diagnostic amount.                                                                          |
| [`scene-performance.ts`](../../apps/client/src/scene-performance.ts), [`scene.ts`](../../apps/client/src/scene.ts), [`hover-outline.ts`](../../apps/client/src/hover-outline.ts)                                                 | Scene capture is opt-in. `view()` reads the clock before its stopped check, hover preparation can update a stopped report, landscape timing runs outside the gate, and `stop()` does not release outstanding GPU queries. The normal FPS meter serves the player and stays. |
| Existing server/browser profiling scripts                                                                                                                                                                                        | Scripts assume collection exists. Some also add their own observers, browser hooks and CPU capture. Disabling application collection alone does not make such a run uninstrumented.                                                                                         |

No timing estimate in this design comes from executing the game. Bounded storage is not evidence of low collection overhead. Existing measurements remain directional evidence, and this project specifically measures its own observer effect.

## Architecture and ownership

Use one temporary capture owner per server JavaScript isolate. An isolate is the main Node process or one worker's separate JavaScript environment. Reuse `apps/server/src/performance.ts`; do not create a new package, service container or event bus.

The ordinary application entry point, `apps/server/src/main.ts`, owns the main process capture for its lifetime. A standalone profiling script owns its own capture instead. The HTTP game factory does **not** own process-wide profiling. This avoids duplicate monitors when a tool creates a setup server and a measured server, and when an empty creation host adopts a running world. Capture begins before repository/server construction so initialization measurements are available.

Workers inherit a trusted boolean when created. They never receive credentials or browser input to decide profiling policy. Worker performance data is optional; worker result identity, transaction completion and failure status remain mandatory. No live broadcast or worker replacement is needed just to change profiling: restart the server after changing its startup setting.

The domain package retains its existing counter sink and has no Node timers, wall clocks, environment reads or dependency on server code. Fine-grained domain counters remain a separate explicit tool choice; the ordinary server switch does not automatically enable every native increment. Reports must identify whether domain counters were attached.

The browser owns one optional scene collector per scene. Its existing query flag creates that collector. A stopped collector may retain its one bounded completed report and read-only inspection callbacks, but must stop measurement work and release outstanding GPU resources. A page without the flag creates neither the collector nor its report buffers.

## Configuration contract

| Surface                             | Exact control                                                                            | Default and effect                                                                                                                                            |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ordinary server                     | `OPEN_LEGEND_PROFILING=off\|on`, parsed in `readConfig` into `config.profiling: boolean` | Missing means `off`. Other values, including an empty string, are rejected. Read once at startup.                                                             |
| Browser page                        | Existing `profile=1` query parameter                                                     | Absent or other values: no collector. Server mode is unaffected.                                                                                              |
| Server and browser comparison tools | `--app-profiling=on\|off`                                                                | Defaults to `on` because these commands explicitly request profiling. Tool arguments select the application mode; do not inherit an accidental shell setting. |
| CPU/allocation/browser tracing      | Existing individual options                                                              | Remain separate and explicitly reported. The baseline comparison mode rejects these heavier options.                                                          |

There is no new saved setting, URL-controlled server switch, remote toggle route, compatibility alias or mode named `V2`. Public game-view schemas do not need a profiling field. `/api/performance` retains its existing `inspect` permission and final disclosure guards.

## Shared collector contract

The following signatures describe the intended API in `performance.ts`; refine private type names as needed without changing the behavior:

```ts
declare function startPerformanceCapture(options: { runtimeMonitoring: boolean }): { stop(): void };
declare function profilingEnabled(): boolean;
declare function beginTiming(started?: number): TimingMark | undefined;
declare function elapsedTiming(mark: TimingMark | undefined, endedAt?: number): number | undefined;
declare function endTiming(
  stage: string,
  mark: TimingMark | undefined,
  excludedMs?: number,
): number | undefined;
```

`elapsedTiming` reuses an already-required admission timestamp when supplied; otherwise it reads the measurement clock only while that exact capture is active. It supports the existing history-write subtraction without adding a duplicate timing event. Review added this shared helper so queued work and writes completing after stop cannot read an optional clock or contribute to a replacement capture.

`TimingMark` contains an immutable reference to its capture and a start timestamp. Do not export a constructor or use domain IDs. `endTiming` returns the recorded duration, or `undefined` when no sample was recorded. Its optional excluded duration is only for existing measurements such as history preparation that subtract time spent writing; it is not a general arithmetic/plugin facility.

Keep `timed`, `timedSync`, `recordDuration`, `countMetric`, `gaugeMetric`, `observeDurations` and `performanceSnapshot` as the shared caller API, changing their implementation to respect capture ownership. Existing callers need no new abstraction simply to count an already-known number. Remove the standalone exported `startRuntimeMonitoring`; its implementation becomes a private resource owned by `startPerformanceCapture`.

1. At module load, optional capture state is `undefined`. Allocate no optional metric maps, timing rings or observer sets until capture starts. The existing bounded operational failure store remains independent.
2. Starting creates fresh metric storage. Starting again while active is a synchronous configuration/programming error before acquiring resources; it is not a reference-counted feature. One process has one owner.
3. If runtime monitoring is requested, install the existing event-loop histogram, GC observer and sample timer once. Reuse existing bounds and cadence. Roll back partially acquired monitoring resources if startup throws; the tool/entry point reports that startup failure rather than claiming collection succeeded.
4. `stop()` is idempotent. Mark the owned capture inactive, detach its observers, clear its timer, disable the event-loop histogram and disconnect GC observation. It must never stop a newer capture. Clear its maps/observer set and release monitoring references after consumers have taken their final snapshot; an old timing mark or detach handle must not retain the populated collections.
5. `beginTiming()` checks for an active capture before calling the clock or allocating a mark. `endTiming()` returns immediately for an absent mark or an inactive/different capture, before reading the clock. Otherwise record `max(0, elapsed - excludedMs)` with `excludedMs` defaulting to zero. Do not add repeated numeric validation for trusted internal timings.
6. Synchronous wrappers call the supplied operation exactly once and preserve its result or thrown error. Asynchronous wrappers retain their current rejected-Promise behavior if the supplied function throws synchronously. Use `return await operation()` in the disabled branch of the existing async wrapper to retain its awaited completion semantics, without clocks, profiling callbacks, metric allocation or a profiling `finally`; do not claim that the remaining wrapper/Promise has zero cost.
7. Enabled wrappers capture their mark before starting work and finish in `finally`. A Promise finishing after stop must not contribute to a later capture. Timing an operation does not grant it another attempt.
8. `recordDuration` is for an already-computed observation in the active capture; asynchronous producers use an owned mark or a capture-lifetime owner instead of letting a stale completion write into a new capture. Counter/gauge calls return before map access when disabled. Guard expensive arguments at the producer; a no-op callee does not prevent their evaluation.
9. `observeDurations` throws a synchronous programming/configuration error if called without an active capture, retaining no callback. When active, it returns an idempotent detach function bound to that capture. This catches an incompletely updated tool instead of silently returning an empty profile. Detach a failing callback and keep the existing static error report. Never catch a gameplay error as if it were a listener error. No new automatic retries or listener scheduler.

Use the existing single-threaded ownership model; no lock, AsyncLocalStorage layer, global subscription manager or recursive validation is required. Lifecycle tests cover late completions because that is a real path, not an invented failure hierarchy.

## Snapshot and missing-data contract

Preserve existing top-level timing stage names and `runtime` metadata layout. Add `runtime.profiling` so current stage iteration that excludes `runtime` remains straightforward:

```ts
interface ProfilingStatus {
  enabled: boolean;
  startedAtUnixMs: number | null;
  runtimeMonitoring: boolean;
  omitted: { durationEvents: number; counterEvents: number; gaugeEvents: number };
}
```

When disabled: `enabled=false`, `startedAtUnixMs=null`, `runtimeMonitoring=false`; timing stages are absent, and counters/gauges are empty. The three omission counts are zero because collection was not attempted, **not** because the measured work was zero. Consumers must check `enabled` before presenting any timing conclusion. Keep uptime and bounded operational failures available on demand.

When enabled: use capture start time, collected samples and existing retained limits. If the stage/counter/gauge name limit rejects an event, increment the corresponding fixed scalar. Count rejected recording calls, not distinct omitted names; do not allocate a second unbounded set of rejected names. Duration listeners still receive observed spans before bounded stage-table admission, preserving tool coverage. Late samples from a stopped capture are discarded rather than charged to the new capture's omission counts.

Snapshots sort/copy retained values only when requested. Do not construct them every tick or push them into game views. Caller-owned returned snapshots are detached from mutable capture arrays. Export/report work remains outside measured intervals wherever the existing tool permits it.

## Complexity and performance expectations

Cost grows with instrumented operations and observer callbacks, not only the number of retained samples. Off mode must eliminate optional clocks, metric storage, per-observation allocations, diagnostic-only scans, timers and worker message statistics. Preserve unavoidable function checks and necessary operational work honestly.

On mode retains current finite stage/name/ring bounds and browser limits. Synchronous listener cost has no independent time budget; only trusted local profiling tools can attach them. Those tools must aggregate bounded numeric data rather than format strings, serialize worlds, write files or await I/O inside a callback. Do not add a generic subscriber queue to solve hypothetical misuse. Worker build records remain scoped to the current message and existing mesh bounds.

Preparation is shared by the one active collector; a restart invalidates that collector's samples and handles. No world revision invalidates performance data because it is observation, not an authoritative derived gameplay result. Repeated names use existing map entries; no per-entity labels or private text are added.

## Documentation and completion

The guide files own concrete edits and scenario definitions. [PC01–PC06](../maintainers/profiling-controls.md) owns progress and acceptance. After implementation, update the current profiling guide, `.env.example`, affected architecture statements and observability inventory together. Only then describe default-off collection as implemented. Keep historical measured reports unchanged and label old captures with their original settings.

There are no unresolved product choices blocking this proposal. Expected speedup, disabled-wrapper cost and enabled collection overhead remain empirical questions, with the required comparison defined in the verification guide. This design does not promise 3× qualification or change the main performance project's remaining acceptance.

## Maintained records

- Behavior: [feature specification](profiling-controls-feature-spec.md).
- Implementation: [PC01–PC06](../maintainers/profiling-controls.md).
- Constraints: [OB02](../limits/observability.md#ob02--optional-profiling-controls), alongside existing [LA209](../limits/observability.md#la209), [LA210](../limits/observability.md#la210) and [OB01](../limits/observability.md#ob01--explicit-browser-performance-capture).
- Existing runtime contracts: [performance](../performance.md), [architecture](../architecture.md#performance-critical-path), [engine/world boundaries](../engine-and-world-boundaries.md#design-principles-for-every-feature).
