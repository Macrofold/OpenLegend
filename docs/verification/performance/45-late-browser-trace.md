# Identify what stops the browser from drawing

October 16, 2026. **Recording qualification is complete. Two oversized attempts fail; two five-second recordings pass. The original long freeze remains unexplained.**

## Results at a glance

| Recording                                          | Complete saved trace?                             | What it establishes                                                         |
| -------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Fifty seconds near the earlier freeze              | No: lost-data flag and 64 MiB file limit          | Failed diagnostic, preserved.                                               |
| Twenty seconds with fewer categories               | No: 64 MiB file limit; no internal lost-data flag | Still incomplete, preserved.                                                |
| Five seconds in a short game rehearsal             | Yes: 22.42 MB, 90,180 events                      | Recorder fits this actual game workload.                                    |
| Five seconds near second 210 in a five-minute game | Yes: 23.79 MB, 95,719 events                      | Covered gaps are 35–43 ms; original 1.89-second pause does not recur there. |

The five-minute game maintains approximately 3× but still has 534 ms walking-confirmation p95 and 646 ms visible-walking p95. Its largest drawing gap is 230 ms, outside the trace. **This is better measurement, not a delivered performance fix.**

The current ten-minute game keeps everybody alive and approaches the requested speed, but has a 1.887-second drawing freeze about 210 seconds into play. Existing records do not explain it. The longest recorded drawing calculation is 44 ms; the longest associated GPU calculation is 64 ms. Neither a player-command handler nor a recorded long task accounts for that pause. These are limits of the recording, not evidence that the browser did no work.

This trial adds a bounded diagnostic recording of the owned browser's internal work. It changes no game rule, client bundle, world calculation or storage behavior. The recording itself can slow the browser, so its results will identify work and gaps rather than qualify game speed. The earlier failed tracing cutoff remains preserved.

## First prove the recorder works

Use a separate, disposable browser with a blank page and the same pinned Chromium, headless Metal graphics arguments and viewport as the existing game runner. Record explicit page-clock markers around a deliberately blocked 200 ms JavaScript task. This is a synthetic diagnostic, not a game performance result.

Select a fifteen-second trace-completion timeout and at most 500,000 events for the blank-page qualification before execution. Keep the same 64 MiB file bound for that read. The actual game recording will receive its own bounded offline analysis after collection.

The recorder must receive the browser's trace-completion acknowledgment, report no lost data, read its stream through end-of-file, close that stream and close its browser normally. The resulting JSON must contain both page markers and the deliberately long task, with coherent timestamps and bounded file size. Retain failures unchanged. A failed qualification prevents the game trace.

Use the official Chrome tracing and stream APIs. Subscribe to completion before requesting a stop. Select available categories from the preregistered list: `toplevel`, `devtools.timeline`, `blink.user_timing`, `v8`, `disabled-by-default-v8.gc`, `cc`, `gpu`, `viz` and `renderer.scheduler`. Keep the actual accepted list in the report. Use the browser tracing backend, JSON stream, a 32 MiB trace buffer and 64 MiB output-file bound. Sampling, system-wide tracing, screenshots, memory dumps and forced garbage collection remain off. A category or completion failure is a diagnostic failure, not permission to enlarge limits.

## Then record the relevant part of actual play

Only after transport qualification and the four current storage comparisons close normally, run a new five-minute graphical observation with the unchanged qualified combined control. Preserve ordinary finite food, player meals/rest, all resident routines and physical animals. Record only seconds 180–230 of play, surrounding the earlier freeze. This fifty-second window remains below the existing sixty-second detailed-trace limit. It may not reproduce a rare pause; no reproduction means the cause remains open.

Make a private copy of the existing browser runner, with approximately 25–40 hook lines and one approximately 100-line shared recorder. The same recorder is used by qualification and actual play. Start and stop are tied to the measured play window, with explicit actual page and host timestamps. Keep all original raw-frame limits, console-through-close checks, source/assets/worker/owned cleanup, 305-second server and 300-second browser phases, and 900-second outer process bound. Parse trace details only after browser and game close. No concurrent heavy verification.

Before launch, inspect the full changed runner/helper and unchanged workload, run focused syntax/format checks, and pin their actual hashes and source/assets. Reuse complete unchanged game calculation, SQL, privacy and recovery evidence by source identity. No paid provider calls are selected.

## What would count as an answer?

Locate any reproduced long drawing/callback gaps on the trace clock using the explicit page markers. Report browser process and thread, named work, inclusive duration and uncovered time. Separate JavaScript work, garbage collection, compositor/GPU work and absence of recorded scheduling. An idle-looking trace does not prove an operating-system cause; a wide parent span does not establish exclusive CPU. Do not silently subtract overlapping events or turn trace overhead into a measured improvement.

The next implementation must follow a demonstrated cost or a clearly stated measurement gap. This recording makes no automatic renderer rewrite, gameplay compromise or retained optimization.

[Existing gap analysis](44-long-browser-freeze.md) · [Current graphical observation](42-combined-graphical-survival.md) · [Standalone bottleneck report](bottlenecks.md)

API sources: [Chrome tracing protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Tracing.pdl) and [Chrome stream protocol](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/IO.pdl). These distinguish requesting a stop from actual completion and define stream end-of-file and cleanup.

## Preparation notes

The first runner-copy preparation stops at a case-sensitive assertion in the preparation wrapper, before writing the runner or launching anything. The corrected wrapper checks the actual inserted wording; the game and original qualified runner remain unchanged. At that point qualification has not run.

## Recorder qualification result

The same Chromium 145.0.7632.6 accepts all nine selected categories. The known page task lasts 200 ms; its two trace markers are 200.028 ms apart, inside recorded timer/function/browser-task spans of about 201 ms. Both outer timing markers and the page measurement are present. The 118,655-byte recording contains 271 events, reports no data loss, reaches end-of-file and closes its stream and browser normally. No process remains; source hashes are unchanged. This qualifies the recorder, not game performance.

Private syntax/format and full helper/qualifier/runner-diff review pass. The helper includes complete failure/stream cleanup, making it larger than the initial short estimate; it remains one shared private diagnostic owner rather than a game subsystem. The unchanged 443-file game source, actual navigation worker and seventeen client assets reuse their qualified identities. The new coordinator adds only explicit recorder/comparison gates and trace metadata checks to the qualified graphical coordinator.

Qualification `/private/tmp/ol-pf166-transport-20261016-a.qualification.json`; trace and completion metadata share that stem. Helper SHA-256 `612a786379615a1fd01e24be6ee757b67bf5764ad65e288adb24c644871abc5f`; actual runner `de1f02e7ccceaeeeeb081e9cd5b3397f1097a2e7cd0ad5e677ce9bccc09c27a3`. Actual-game source remains `d211c2b341aa5f6805eef6d774111b9fbfd1c1c6fb17ad8e1cdf637e3873359e`. The plan is `/private/tmp/ol-pf166-graphical-trace-specification-20261016-a.json`. No canonical executable or provider call is changed.

## Offline trace analysis selected before reader implementation

After both owned processes close, read only the pinned server report (4 MiB), browser report (64 MiB), trace (64 MiB), completion metadata and final console record. Bound the trace to 500,000 events; do not widen it after failure. Locate exactly one begin/end page marker pair on one renderer thread and check their trace-to-page clock offsets agree within 2 ms. Keep original raw hashes before and after analysis.

Compare the five largest fully covered callback gaps with complete recorded tasks, garbage collection, JavaScript calls, layout/paint and compositor/GPU activity. Retain named process/thread metadata and incomplete/unpaired events explicitly. Calculate interval unions and clipped intersections so overlapping parent/child tasks are not added as exclusive cost. The whole-phase largest gap and any portion outside the fifty-second trace stay separate. Trace overhead, missing system scheduling and events without duration remain limits. First inspect bounded actual event examples before selecting source-map attribution; do not guess an owner from a minified label.

Use the existing interval-overlap controls plus three small controlled union/clock cases before actual readback. This is approximately 80–140 private offline reader lines, no further game or provider work. A successful trace transport is necessary but does not itself prove that the original 1.89-second freeze repeats or is explained.

## First actual trace: coverage failure

The fifty-second recording reports lost data with the selected 32 MiB browser buffer and reaches the preselected 64 MiB output-file bound. The browser reports lost trace data, and the output does not reach end-of-file. The stream and browser still close normally. Both owned process groups, the generated database/sessions and temporary directory are absent, with unchanged source/assets and no console messages. The partial trace is retained and is not parsed for a causal claim.

The server alone records 305 seconds at 2.969×, 351 resident plans and matching meals, all seventeen people and forty animals alive, no game/storage errors. The browser throws before its ordinary final timing report, so these server facts do not establish graphical or complete player-input acceptance. Failure readback: `/private/tmp/ol-pf166-trace-failure-20261016-a.json`.

## Narrower second recording selected before changes

Reduce the selected recording to **seconds 200–220**, centred on the earlier pause near second 210. Keep the 32 MiB buffer, 64 MiB output, sixty-second maximum, fifteen-second completion timeout, 500,000-event analysis bound and all gameplay/raw/process/SQL limits unchanged. Retain the first failure. Use fresh helper, qualification, runner, plan and output paths.

Keep only `toplevel`, `devtools.timeline`, `blink.user_timing`, `v8` and `disabled-by-default-v8.gc`. This deliberately narrows the question to recorded browser tasks, JavaScript, garbage collection and ordinary timeline events. Detailed compositor, GPU and renderer-scheduler categories are not collected in this second attempt; a missing cause in those areas remains a gap. Generic named process/thread task spans may still appear, but are not a substitute for detailed GPU execution.

The helper changes only its selected category list. The private runner changes only start/stop delays and the diagnostic collection note. Repeat the same known 200 ms blocked-task qualification on the exact helper before releasing the unchanged five-minute game. The coordinator's minimum expected recording duration changes from 49 to 19 seconds to match the deliberately shorter selection; no failed bound is enlarged. After closure, the same bounded reader must preserve incomplete phases and outside-window gaps. A rare freeze may not reproduce.

The narrower recorder passes the unchanged known-task qualification: the page reports 200.10 ms of deliberate blocking, both markers and enclosing tasks are present, all five categories are supported, no data is lost, the 113,320-byte stream reaches end-of-file and closes. The browser closes normally, with its owned process group absent and unchanged hashes. This qualification takes about 22.6 seconds including browser startup/shutdown; browser close alone takes 15.6 seconds. Those are observed diagnostic lifecycle delays, not an attributed gameplay cause. Exact completion is `/private/tmp/ol-pf166-transport-20261016-b.qualification.json` and its lifecycle/metadata sidecars.

## Second actual trace: output coverage still fails

The twenty-second, reduced-category recording again reaches the unchanged 64 MiB output bound before end-of-file. Its browser buffer reports no lost data, but the saved file is incomplete and cannot support the planned causal analysis. Stream/browser close and exact owned process/database/session/directory cleanup pass; source/assets remain unchanged. Preserve both failures.

Before selecting another capture, inspect only the first 64 KiB of each already-closed partial trace for recorded category/name metadata. This bounded prefix inspection is for recorder-volume diagnosis only, not freeze attribution or a representative whole-trace frequency claim. Keep original hashes. Check the official category-filter implementation rather than assuming that shrinking the requested list changed actual coverage. Do not launch another five-minute game merely to discover an oversized recording again. Any further capture must first fit during a short actual-game rehearsal.

## Prefix diagnosis and short rehearsal selected

A bounded first-64-KiB inspection confirms that the second recording really omits the formerly selected GPU/compositor categories in that prefix. It retains ordinary browser-task and timeline events. The official category-filter implementation also checks explicit included categories, so no evidence supports blaming an ignored filter. Prefix counts are not whole-recording frequencies or freeze attribution. [Chromium category-filter source](https://raw.githubusercontent.com/chromium/chromium/main/base/trace_event/trace_config_category_filter.cc).

Before another late game, select a **five-second trace inside a forty-five-second browser/fifty-second server rehearsal**. Record seconds 20–25, retain the same five categories, exact unchanged recorder, 32 MiB buffer, 64 MiB trace file and 500,000-event analysis limits. Reuse the exact recorder's successful blank-task qualification by byte identity; do not change its transport implementation. The new private runner accepts only the two preselected durations: 45 seconds for rehearsal and 300 seconds for a conditional late diagnostic. Both use five-second recordings; the latter selects seconds 208–213. The short raw browser report retains its original 4 MiB read bound and 300-second outer process limit.

Only complete, loss-free, bounded JSON with both coherent page markers and passed ordinary scene/source/console/owned-cleanup checks releases the conditional late 300/305-second run under its original 900-second outer limit. Five seconds may miss the original rare freeze; that limitation remains. If the rehearsal still fails, stop repeated long captures and record the specific remaining coverage problem. No game mechanics, provider or image fidelity changes.

The five-second actual-game rehearsal completes with a 22,417,611-byte, loss-free trace, end-of-file, closed stream and normal browser/server/owned database cleanup. Its first offline reader stops before gap attribution because it treats the browser's six truncation counters as a single boolean. Actual counters are all zero. Preserve that reader/failure and correct only the schema check on a new reader/output path; recording, caps and gameplay remain unchanged.

## Short actual-game recording qualifies

The corrected reader keeps the same raw data and all original bounds. Six arithmetic controls pass. It reads 90,180 events from the complete 22.42 MB trace; begin/end clock offsets differ by 0.044 ms. The actual selected window is 20.061–25.072 seconds into play. Both processes close normally, all people and animals survive, sixteen residents select eighty plans and complete sixty-four checked meals, console messages remain zero through browser close, and source/assets and exact owned cleanup pass. The actual final image is inspected: player health100, food52%, energy81%, with a visible crowded scene and normal interface.

The game itself still fails responsiveness: walking confirmation p95 is 625 ms, despite 2.9994× server progress, no missed slots and 79.2 drawing submissions per second. Maximum drawing gap is 60.8 ms. This is a diagnostic rehearsal, not an improvement or sustained capacity pass.

The five largest fully covered callback gaps last 36–44 ms, with no overlapping recorded garbage collection in those gaps. The largest has a roughly 32.5 ms browser microtask-checkpoint span, plus ordinary drawing/callback work. That broad browser span is not yet attributed to game code, exclusive CPU or the earlier 1.89-second pause. The earlier pause does not reproduce in this short phase. Source-map or deeper stack work must follow actual demonstrated spans rather than a guessed label.

Readback `/private/tmp/ol-pf166-trace-readback-20261016-d.json` (SHA-256 `f905e515fc6d306c3f09e9f2210465d4804d5cb175d7a79c8d30bb9c9c25584e`) preserves the failed c reader separately. Release `/private/tmp/ol-pf166-rehearsal-release-20261016-c.json` now qualifies the preselected late five-second capture at208–213seconds in a new unchanged five-minute game. That capture may still miss a rare pause. All limits and explicit category omissions remain.

## Late recording result and remaining cause

The late five-second trace completes with 23,793,510 bytes and 95,719 events, no lost data, end-of-file and a closed stream. Actual coverage is seconds 208.072–213.101; marker offsets agree within 0.013 ms. The same six arithmetic controls, original input bounds and hashes, source/assets, zero console messages through actual browser close and exact owned cleanup pass. Both processes exit normally. The final image is inspected: nighttime scene, visible player with 100 health, 20% food and 54% energy, ordinary interface, and two named residents shown sleeping. Native evidence establishes all seventeen people and forty animals alive; the image does not show every identity.

The original 1.89-second pause does not reproduce within the recording. The whole-phase maximum callback gap is 224 ms and drawing gap 230 ms, outside the selected trace. Covered callback gaps last 35–43 ms. Their largest contains a 34.1 ms browser microtask checkpoint, where queued follow-up work runs; the recording does not identify the detailed work inside it. Recorded garbage collection overlaps only 2.74 ms of that 42.6 ms gap. These overlapping spans do not prove exclusive CPU or identify the missing game/browser-internal work. Other event phases remain counted and are not given fabricated durations. No causal renderer, database, garbage-collection or operating-system fix is selected from this recording.

The whole 305-second server phase achieves 3.00003×, with 351 resident plans and 351 checked meals. All sixteen residents start ordinary rest and remain asleep at cutoff; this phase does not demonstrate waking. The player accepts 263 walks and six meals; 28 walks are physically blocked, none are unconfirmed, and no input slots are skipped. Accepted walking confirmation p95 is 534 ms; 93 eligible idle starts have 646 ms visible-motion p95. Drawing averages 91.49 submissions per second, with 22.25/38 ms 95th/99th-percentile gaps and a 230 ms maximum. The trace adds overhead and this single run is not a speedup comparison or sustained smoothness pass.

Readback `/private/tmp/ol-pf166-trace-readback-20261016-e.json`, SHA-256 `39640bfb9707f338bea923cf7af5479c8a982795eec30423c9afa92b905bf05f`, retains exact inputs, clocks, covered gaps, event names and unknowns. The recorder is now qualified for a bounded actual-game window. The original rare freeze still needs a recording that actually contains it; detailed GPU/compositor/scheduler coverage is also absent from these narrower attempts. Repeated long recordings are not launched automatically. The next work returns to measured command/save and shared-calculation costs.
