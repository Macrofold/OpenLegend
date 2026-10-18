# Explain the large drawing gap in the current long game

October 16, 2026. **Completed offline diagnosis. The measured pause is confirmed; its cause remains unknown.**

The completed current ten-minute graphical observation has a 1.887-second gap between drawing submissions, despite a 91-per-second average and no console errors. Walking confirmations also remain slow. These are separate failures; do not assign the drawing gap to saving just because both exist.

Read only the immutable completed graphical/server reports and final console record. Keep their exact hashes, phase windows and original failures. Locate the largest drawing and browser-callback gaps, then inspect the actual nearby renderer-update, scene-preparation, GPU and browser long-task records. Check whether the browser remains visible/focused according to the available evidence. Correlate the same wall-clock window with the existing complete server probe and player-command observations only where clocks/coverage support it. A missing timestamp or bracket is an explicit limit.

This is approximately 40–90 lines of bounded offline readback, with a small derived summary. It adds no sampler, trace, code change, provider or gameplay work. Do not treat a sampled maximum as exclusive CPU, convert a missing long-task record into proof of no work, or infer a precise operating-system/GPU cause from a gap alone. If the existing recording cannot explain the pause, identify the exact missing measurement before selecting another live recording. Preserve the earlier graphics warnings separately.

[Current graphical observation](42-combined-graphical-survival.md) · [Standalone bottleneck report](bottlenecks.md) · [Plan](../../projects/three-times-scene-performance.md#current-long-browser-gap-readback)

## What the completed recording establishes

The longest browser-callback gap begins **209.87seconds into play** and lasts **1,879.2ms**. The matching drawing gap is **1,887.4ms**. Both are real recorded gaps. One ordinary3.3msrenderer row lies just after the beginning, followed by the long absence of callbacks; no scene-view preparation timestamp appears strictly inside the window. There is no network update received by the page during that interval either.

Across the complete phase, the maximum recorded renderer bracket is44ms, scene update18.3ms, scene-view preparation20.1ms and associated-frame GPU work63.8ms. The browser supports long-task observations but records none, with no raw truncation. Those facts do not identify or exclude browser internals, garbage collection, process scheduling, the compositor or a driver wait. GPU rows carry their original frame timestamp, not a complete result-delivery or driver trace.

No recorded player-command handler overlaps the gap on the common wall clock. This does not measure every server operation, prove the server was idle or establish that a save caused the browser pause. The server's idle-database probes retain aggregate percentiles only, with no individual timestamps, so they cannot be correlated to this window. The initial shape inspection incorrectly expects such a field, then mistakes a drawing-summary object for a per-draw array; both stop before any attribution. The corrected bounded reader uses the actual retained schema and keeps those missing observations explicit.

Visibility and focus are good at the captured endpoints; there is no continuous foreground trace. Console messages remain zero through normal browser-close acknowledgment. Input reports and original data are unchanged. The offline reader checks monotonic callback timing, gap alignment, three overlap arithmetic controls and unchanged input hashes.

**Remaining measurement:** a separately qualified bounded trace of the owned browser process, renderer/compositor, garbage collection and scheduling around this part of play. The earlier tracing-cutoff failure must remain preserved; any new capture needs confirmed trace completion and explicit coverage. No causal code fix follows from the present recording alone.

Readback `/private/tmp/ol-pf165-gap-readback-20261016-a.json` retains exact raw hashes and nearby rows. Browser callback page times218187.10→220066.30ms map to Unix milliseconds1792153433793.3→1792153435672.5. The drawing summary is a separate1887.4msinterval. No game, sampler, provider or runtime change is made by this diagnosis.
