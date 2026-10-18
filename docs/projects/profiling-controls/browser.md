# Optional profiling — browser implementation

| Status      | Current progress                                                                                                       | Last updated |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Code and focused checks are complete; the two full-game observations had unequal activity and cannot qualify overhead. | 2026-10-18   |

**Implementation update — October 17, 2026, 20:12 EDT.** Mike authorized implementation of the complete package. The [profiling-controls tracker](../../maintainers/profiling-controls.md) owns current completion and verification; the earlier source findings below describe the design baseline. No smooth-3× result is asserted.

**Design updated:** October 17, 2026, 18:10 EDT. Follow the [feature specification](../profiling-controls-feature-spec.md), [technical design](../profiling-controls-tech-design.md) and [PC04 tracker](../../maintainers/profiling-controls.md). Apply the PlayCanvas lifecycle guidance before implementation; this design reuses the existing WebGL query API and does not select a new renderer API.

## Preserve the working off-by-default gate

Keep `ScenePerformance.create()` behind the existing exact `profile=1` query value. No collector instance means no histograms, sample arrays, profiling-specific frame listeners, GPU timer queries or global profiling API. Keep renderer preparation and ordinary frame-rate display independent of this choice.

The scene still imports the collector's code and checks an optional reference at existing call sites. That is small residual work, not a claim of zero overhead or zero bundle size. Do not add dynamic loading, a new build variant or two scene implementations solely to remove those checks.

## Implement the capture lifecycle

Use the existing private `recording` flag and report ownership, plus a private `destroyed` boolean for terminal teardown. No general state machine library is needed. A collector is recording, stopped with one retained report, or destroyed.

1. Change `begin()` to return `number | undefined`; return undefined before reading the clock when not recording. Update the two scene call sites that currently substitute zero. A clock value of zero is valid, so guards test `started === undefined`, not truthiness.
2. In `view()`, test the optional start and recording flag before assigning `viewAt` or calling the clock. In `update()`, use the same explicit start check. Keep all other recording methods guarded before allocation or mutation.
3. Add `isRecording(): boolean` to the existing optional local browser API. In `hover-outline.ts`, check that method before preparing a timing value, then call `recordHoverPreparation` only if a start value exists. The receiving method also returns immediately when stopped. Keep actual shader preparation and graphics-state restoration unconditional.
4. In `scene.ts`, use the collector's `begin()` for `buildLandscape` measurement. Update the diagnostic-only dataset values `sceneryCount`, `landscapeResourceCount`, `landscapeResourceBuildCount`, `landscapeBuildMs` and `landscapeBuildCount` only while recording. On a new capture, the collector clears these five attributes through its existing canvas reference; counters then mean builds observed in that capture, and missing attributes mean no measurement yet. Record this change from scene-lifetime counters in the usage guide. Before editing, re-search these attributes for any new non-diagnostic consumer. The inspected source has no other readers.
5. Leave `dataset.ready`, camera/projection attributes, reduced-motion behavior and revealing/input state unchanged. Leave `recordFrame()` and `sampleFrameRate()` clocks used by the visible FPS meter unchanged. Also preserve GPU rendering backpressure and its fences; they control rendering, not profiling.
6. Implement one private `stopCapture()` method and call it from the global API. If already stopped, return the same completed report without changing its time or counts. On first stop, mark recording false before cleanup; record one stop timestamp; finalize the pending-query accounting below; release its queries without waiting; then return the report. Do not reset data until a subsequent start.
7. At stop, retain `pendingGpuQueries` as the number of issued pending plus active queries whose results were not included. Its meaning becomes explicit: **uncollected at this capture's stop**, not still-live graphics resources. Do not report these as completed GPU samples. Reuse the existing field and document its clarified meaning in OB01 and report consumers; do not add a second equivalent counter.
8. If the context is live, use the existing release helper to end/delete an active query and delete pending queries. Never wait for availability, call `finish()` or try to recover every final GPU sample. If stop discovers a lost context before its event was handled, finalize the report by adding the current handle count to `gpuContextLostDiscarded`, setting pending-at-stop to zero and discarding handles without GL calls. This happens inside stop before returning the completed report even though recording is already false. Make the context-loss callback and release helper respect that ownership so the same handles are not counted twice.
9. While stopped, context-loss/restoration callbacks still update the collector's private resource availability, but do not mutate the completed report. On restoration, reacquire timer support only when recording, or defer it to the next start. Keep the existing listeners until scene destruction so resource state remains correct without a second lifecycle manager.
10. On start, return immediately if already recording or destroyed. For a new capture after stop, clear any remaining query references, refresh optional GPU timer support, replace the report with a fresh bounded report, reset `stationaryAnchor`, `frameStarted`, `updateMs` and `viewAt`, then set the new start time and recording flag. Do not carry prior frame gaps, GPU records or timings into it. The constructor still starts the first cold capture. To reset an active capture, callers explicitly stop then start.
11. `destroy()` returns if already destroyed; otherwise marks that terminal state, calls the same owned stop/release path, removes listeners, clears callbacks and deletes the global API only if it still belongs to this collector. A previously retained API reference cannot restart a destroyed collector. Never remove a replacement scene's API or destroy graphics resources owned by another scene.

Stop need not detach every existing frame callback: a stopped collector's guarded callback is acceptable. It must not read clocks, query GPU state, construct samples or mutate the report. A normal page without the query flag has no such profiling callbacks attached in the first place.

## Keep inspection separate from collection

Existing read-only `isGroundInput` and `characterModels` callbacks are tools for the opted-in local page. They remain usable after capture stops, because the current driver inspects models after `stop()`. They do work only when explicitly called and must not append measurements or restart capture. No secret world state, authority or command shortcut is exposed.

Do not put those callbacks on an ordinary unprofiled page just to make a benchmark easier. The [tool guide](tools-and-verification.md#pc05-browser-tool) specifies the smaller comparison workload that does not require them. A future comparison needing the survival input probe can deliberately design a separate read-only testing seam; this project does not silently invent one.

Browser CPU sampling, long-task observation and WebGL-call wrappers installed by the external driver are owned by that driver. Stopping the scene collector stops scene collection only; the driver must stop its own hooks and accurately report their intervals. Do not claim that `ScenePerformance.stop()` disables Chrome DevTools profiling.

## Bounds and output

Keep existing raw-sample and histogram limits, aggregate totals/maxima, dropped-sample counts, GPU query backlog limit and unavailable/disjoint reporting. Never increase those allowances merely to avoid a failed capture. No background export or per-frame JSON serialization is introduced.

Snapshot inspection remains on demand. The caller can retain the completed report, and the next start allocates a new report rather than mutating that retained one. This does not authorize retaining every capture forever in the application; only the current/final report is internally owned. External tools own their bounded private export lifecycle.

## Maintained records

- Behavior: [feature specification](../profiling-controls-feature-spec.md).
- Overall architecture: [technical design](../profiling-controls-tech-design.md).
- Implementation: [PC04](../../maintainers/profiling-controls.md).
- Existing bounds and implemented lifecycle: [OB01](../../limits/observability.md#ob01--explicit-browser-performance-capture), [OB02](../../limits/observability.md#ob02--optional-profiling-controls).
- Verification: [browser scenarios](tools-and-verification.md#browser-scenarios).
