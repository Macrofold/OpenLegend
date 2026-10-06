# Command/frame spikes and physical lower-end hardware

September 28, 2026. Authorized [follow-up plan](../projects/shadow-quality-tech-design.md#follow-up-commandframe-spikes-and-physical-lower-end-hardware), tracked under [PF05](../maintainers/performance.md#pf05--public-view-and-browser-responsiveness), SW18.10/SW18.13 and HE05. Refreshed `Macrofold/OpenLegend origin/main@c5455cf8fc9e4d4fe03034a7f069d6d6581bb8f2` was already contained in `codex/shadow-quality`; no branch switch or rebase. Preserve the existing shadow work and concurrent model pilot.

## Delivered change and limits

Scheduled move/gather/hunt/harvest/cook/replenish/strike/pickup admission reads route geometry from the unchanged command input, before resource or body effects. At this point those cases have only allocated an action ID. Effects, interruption, reservations, receipts and durable publication remain in their existing mutation owners. Reach and candidate-stance queries capture the current map/body/target anchors once per call. There is no retained result cache, relaxed obstruction check, changed command eligibility, shadow reduction or simulation-time policy change.

These changes reduce isolated native query/preview cost. They do **not** establish that whole-game command/frame spikes are fixed. The full-game runs below encountered severe host contention; physical lower-end hardware was unavailable. The requested overall qualification remains incomplete.

## Method and isolated comparisons

Apple M1 Pro, macOS arm64, Node 22.23.2, PostgreSQL 14.17, pinned PlayCanvas 2.22.2 and Chromium ANGLE Metal/WebGL2. Explicit disposable databases, `AI_BUDGET_USD=0`, no provider requests or spending. Full private samples, code snapshots and temporary harnesses are under `/tmp/openlegend-spikes-20260928/`; aggregate findings are recorded below and generated measurements are kept outside Git.

The small spatial comparison alternates original/candidate order for six rounds over the same seeded crowded world and 53 targets. It compares full route results and reach booleans for four distances on ordinary and Immer-draft worlds: **424 exact comparisons**. Each timing batch makes 795 queries. Excluding the first warm-up round, median draft-query batch time is **59.20 → 29.87 ms** (about 50% less); plain-state medians are **23.82 → 22.85 ms**, with substantial variation. This measures one helper, not FPS or total command latency.

The command comparison uses the real executor for both ordinary execution and disposable previews, with original versus final code on identical seed-73 worlds. It covers normal ground, a lookout deck, unsupported airborne placement, death, incapacitation and pause; commands include target-based work/strikes, ordinary/ramp/wrong-floor movement and cooking. All **1,488 cases** match outcomes, event arrays and SHA-256 hashes of the complete serialized resulting world. Every preview returns the original world and no events. The matrix includes 72 accepted cases and scope, support, lifecycle, resource and invalid-target rejections; it is not exhaustive admission qualification.

Five fixed batches of native strike previews measured median wall time **61.63 ms original**, **27.15 ms candidate**, **43.50 ms candidate repeat**. Median process CPU was **89.40 → 53.22 / 52.75 ms** (about 40–41% less). Process CPU includes runtime/GC helper threads and can exceed elapsed wall time. Host variation makes the wall-time percentage unstable; these are isolated batches, not a claim of 40% faster whole-game input.

## Full-game diagnostics

The real production UI/server scenario retains the prior 142-root scene: player, 20 NPCs, 21 animals and 100 other objects, including eight banked fires. It uses PostgreSQL, HTTP commands, SSE, React, moving camera and a 1920×1080 framebuffer. Requested 3× means 180 simulated seconds per wall second. Native NPC meals preserve survival without disabling physiology. This follow-up increases player command frequency from once per five seconds to once per second, with one request in flight; it is not directly comparable to the earlier eight-minute acceptance sample.

- The 120-second original-code CPU-profile diagnostic reached only **1.323×**, with **50.7 FPS**, frame p95/p99/max **27.4/33.7/1,785.1 ms**, and player command p95/p99 **3,924.5/7,089.7 ms**. One command returned `busy`; two HTTP 503 errors were recorded. Load average was 143 → 129. Treat it as failed capacity evidence. Public projection and preview/draft work remained significant; a world commit reached 6.21 seconds and a PostgreSQL statement wait 4.71 seconds. Those wall spans overlap and do not isolate database execution from event-loop/host delay.
- A spatial-helper-only retry reached **1.256×**, **34.3 FPS**, with all 63 player commands successful but a **21.77-second** maximum frame interval. The browser attributed that gap to a React scheduler callback; elapsed callback time alone cannot separate CPU work from descheduling or memory pressure. This sample also overlapped task-owned correctness diagnostics, so it is not a clean matched comparison.
- A machine-wide sample during this period recorded load average **180.68**, **4.8% CPU idle**, about **12 GB compressed memory** and **176 MB unused memory**. Other tasks/processes were left untouched. The original profile already showed severe contention before the extra diagnostics.
- The initial harness used the shared build output; a concurrent rebuild removed its entry page and produced a 404 before measurement. The harness was moved to private build output for subsequent runs. This is a setup failure, not a game FPS sample.

The final 120-second integration run, with no overlapping task-owned diagnostic, crossed 17:34–22:20 game time and retained 142 roots, all 42 living actors and eight shadowed lights. All **101 player commands and 20 NPC meals** succeeded, with no browser/HTTP errors or shader-finalization wait above 10 ms. It averaged **61.98 FPS**; frame p50/p95/p99/max was **15.5/23.5/31.3/471.6 ms**, and command p50/p95/p99/max **284.6/2,324.5/3,909.4/4,192.7 ms**. Actual simulation progress was only **2.385×**, with host load 108 → 119. This verifies live integration, not the requested combined capacity or reduced tails: its dusk workload and host conditions differ from the profiled morning baseline. The final firelit 1080p screenshot was visually inspected. No game performance claim may be inferred from configuring 3× alone.

## Correctness and checks

- All 18 existing `packages/domain/src/kernel.test.ts` cases pass.
- The two selected server action-catalogue tests pass through disposable PostgreSQL: target-scoped menus/prerequisites and refresh after pause/no hidden-target previews. No provider fixtures or paid calls.
- `packages/domain/src/spatial-world.test.ts` passes eight of nine tests both before and after the final admission change. The floor-hearing test expects `hearsEntity` to be false through the lookout slab; the same test fails identically with the preserved original code. Reach and sight assertions preceding it pass. SW08/HE05 retain reconciliation against graded hearing, including intelligibility/privacy; this task does not change hearing or weaken the assertion.
- Final `pnpm typecheck`, normal `pnpm build`, changed-file Prettier and `git diff --check` pass. The build retains its existing large-chunk warning. The complete affected code/doc diff and linked records were reviewed. Temporary harnesses are archived outside the repository, normal client output has been rebuilt and the task-owned PostgreSQL cluster is stopped. No other task’s runtime or model-pilot files were changed.

## Physical device handoff

No physical lower-end machine was exposed by the available execution tools; only the local M1 Pro was accessible. Device/access information was requested and has not been supplied. SwiftShader, browser CPU throttling and the overloaded M1 Pro do not qualify this requirement.

On an available physical device, run the same zero-provider seed-73 fixture from a clean checkout with disposable loopback PostgreSQL. Record CPU/GPU/RAM, OS, browser and backend; verify the actual framebuffer is 1920×1080 and all eight admitted lights cast shadows in Detailed. Warm startup separately, then measure an entire eight-minute day with moving camera, real walking/eating commands and actual simulation progress. Repeat original/candidate runs under comparable host load; retain p50/p95/p99/max command, frame, CPU/GPU and save/queue timings, errors, actor/light counts and excluded clock intervals. Economy is a separate two-light diagnostic, never a substitute for the requested eight-light test. Reuse the private harness bundle, adapting its repository/output paths to that device; never point it at a real save or inherit provider credentials.

PF05/SW18 remain open for reliable complete-path tail reduction and physical device qualification. Remaining measured leads are repeated disposable preview drafts/events, queue/database waits and browser callback/host pauses; no asynchronous-save or admission shortcut is justified by these samples.

## PG04 preview work and larger-load follow-up — October 4, 2026

The owner requested the remaining PG04/PF05 latency and larger-load work after the PG03 reviews. Work stays on `codex/pg03-action-clarity` in `/Users/mzw/.codex/worktrees/f307/OpenLegend`; refreshed `origin/main@c4e18d91848b5b6d367dda1d7214a9f8222cf070` was already contained. There was no branch/worktree switch, push or merge. This section supersedes neither the earlier shadow qualification nor its physical-device requirement.

### Delivered scope and admission boundary

Current catalogue attribution selected possession previews. Offer prerequisites now have one read-only owner shared by preview and actual execution. Refused offers return before creating a disposable world. Accepted offers still exercise the existing disposable executor, including identity allocation and event construction. Drop previews omit their discarded action-history record after the unchanged actor/record-capacity checks, while retaining the actual disposable structural transfer, split/merge/container checks and identity/event allocation. Actual commands still record history and independently admit against current state. No command protocol, custody rule, effect order, resource/randomness rule, renderer quality, paid retry or retained eligibility cache changed.

A full pure drop/split/accepted-offer planner was deliberately not introduced: structural transfer admission still includes checks during mutation, and duplicating those rules would risk false promises. The remaining measured cost is tracked under PF05; this is a measured partial optimization, not a claim that every preview is pure or cheap at arbitrary scale.

The maintained server profiler was repaired to enter through the current embodiment endpoint and send the current scope/generation. Its first attempt failed before measurement because it used obsolete request authority. This repair uses ordinary authenticated control and does not relax the server's checks.

### Matched native comparison

Apple M1 Pro, macOS arm64, Node 22.23.2 and disposable loopback PostgreSQL. All runs use `AI_BUDGET_USD=0`; no provider calls or spending. Temporary native fixtures, source variants and full samples remain outside Git under `/private/tmp/pg04-*`. No task-owned measurement ran concurrently with another task-owned benchmark.

Original/revised/revised/original batches each read the **same immutable 138-entity world, 111 possessions and 1,443 complete choices six times**. Every serialized choice, fact, intent and refusal matches, and every read leaves the serialized world unchanged. The first read in each process is separate from the five warm reads.

| Measurement                                           |  Original |   Revised | Interpretation                                      |
| ----------------------------------------------------- | --------: | --------: | --------------------------------------------------- |
| Warm complete-catalogue median, ten reads per variant | 272.42 ms | 175.87 ms | About 35% less elapsed read time in this fixture    |
| Cold complete-catalogue median, two reads per variant | 317.25 ms | 228.34 ms | Startup/index work remains included                 |
| Drop previews, mean total per six-read batch          | 751.66 ms | 594.41 ms | About 21% less; structural transfer still dominates |
| Offer previews, mean total per six-read batch         | 432.75 ms |  60.34 ms | About 86% less; most candidates are refused         |

The initial unmatched after-offer-only run reduced that family but had slower total reads under different host conditions. It was not used to claim an overall gain. The alternating comparison above qualifies the retained combined change, not whole-game command latency or a population guarantee.

Fifty before/after native cases match complete outcomes, event arrays and SHA-256 hashes of the resulting world, including accepted/refused drop and offer commands, nested/individual objects, missing items/targets, quantities, pause, death, incapacity, target distance and bag grants. Every preview returns the original world and no events. The ordinary service scenario additionally checks explicitly revision-bound stale selection, a target moving out of reach or becoming incapacitated after preview, replaced control, competing offers (one admits, nothing moves), native recipient consent (exactly one unit moves), item deletion and save restore. Old scopes/timelines cannot execute; a fresh restored selection can. Malformed handover still returns the existing readable refusal. Catalogue commands retain their existing optional revision-pin contract; this task adds no new pins.

### Complete path, load and remaining qualification

The production browser uses Playwright 1.58.2's bundled Chromium browser with the actual M1 Pro ANGLE Metal/WebGL2 renderer and a **1920×1080 framebuffer**, with ordinary UI selections, real durable HTTP commands and SSE. Renderer settings remain Detailed. The seed-73 larger scene has **21 people, 21 animals and 100 objects**; initially 20 other people, 20 animals and 100 objects are visible. Sixty-second samples are bounded diagnostics, not the eight-minute/eight-fire physical-device acceptance or a long-lived-world soak. They contain naturally growing resident history and preserve the complete populations. The revised runs use the final production changes through `d05f9c60`; the original variants use the pre-PG04 source at `96f8abb0`.

The maintained server profiler runs one request at a time at roughly one per second. Its baseline and final runs both use seed 73, zero cognition/provider dispatch, durable PostgreSQL, HTTP and SSE. They were run separately, with no other task-owned benchmark overlapping; external host load differed. The baseline was measured after repairing control entry but before the preview optimization.

| Full-server measurement                      |                      Original |                     Revised |
| -------------------------------------------- | ----------------------------: | --------------------------: |
| Successful commands                          |                      54 of 54 |                    59 of 59 |
| Actual elapsed time                          |                       60.05 s |                     60.07 s |
| Actual simulation speed                      |                        2.998× |                      2.991× |
| HTTP command receipt p95                     |                   1,065.94 ms |                   434.92 ms |
| Publication gap p95 / p99 / max              | 137.11 / 305.46 / 1,041.97 ms | 112.96 / 195.84 / 349.51 ms |
| Host one-minute load, start → end            |                 15.07 → 20.43 |               19.24 → 14.46 |
| Independent PostgreSQL probe p95 / max       |             46.19 / 188.36 ms |            22.50 / 80.77 ms |
| Collected server heap, start → end           |              58.16 → 69.35 MB |            58.00 → 70.11 MB |
| Final resident events / awareness / memories |               605 / 3,578 / 1 |             615 / 3,788 / 1 |

No asynchronous workload, command or storage errors and no provider calls were recorded. The revised server advances 10,780.68 of 10,801.69 requested simulated seconds; 21.01 seconds of simulated debt remain at the final boundary. It is reported as actual 2.991×, not exact 3×. Heap figures are collected endpoints, not peaks or proof of bounded lifetime growth. Different idle-probe and load results prevent attributing the whole-server latency difference to this patch.

Existing stage timing separates the remaining work. The final server's retained 256-sample p95 values are **44.41 ms waiting for mutation admission**, **34.57 ms native simulation work**, **16.30 ms public projection**, **0.073 ms projection wait** and **280.55 ms durable command handling**. These are overlapping stage distributions from bounded windows, not a sum or full-run percentile. Across all captured commit samples, commit p95 is **233.87 ms**: preparation/writer-queue p95 **6.28 ms**, statement round-trip p95 **228.41 ms**, between-statement p95 **3.94 ms**. Per-stage percentiles cannot be added. Statement wall time includes database, OS and event-loop scheduling; it does not justify bypassing durability or prove database CPU alone dominates.

The final production-browser run lets the UI own Resume and presence liveness. Following is disabled through its existing control so alternating ground points remain visible; the camera stays fixed. It waits for a completed action read and an enabled **Walk here** row, then clicks normally, with one command in flight. All **52 of 52 commands succeed**, with zero browser, workload or storage errors and zero provider calls. Actual speed is **2.995×** over **60.16 seconds**; the clock advances all 10,812.30 seconds requested during its 60.07 active seconds. Initial/final visible counts are unchanged at 20 other people, 20 animals and 100 objects. Final history is 601 events, 3,530 awareness records and one memory. Host one-minute load is 9.89 → 13.64; the undelayed probe p95 is 32.30 ms. Uncollected server heap rises 114.65 → 287.93 MB, so this browser-hosted diagnostic does not qualify memory growth or a soak.

| Final browser measurement                                                  |                    Observed |
| -------------------------------------------------------------------------- | --------------------------: |
| Actual row pointer-up → HTTP receipt headers, p50 / p95 / max              |    117.4 / 428.2 / 670.2 ms |
| Browser request → receipt headers, p95                                     |                    428.0 ms |
| Row pointer-up → next changed player-position publication, p50 / p95 / max |    198.0 / 524.0 / 752.1 ms |
| Animation-frame interval, p50 / p95 / p99 / max                            | 8.3 / 16.6 / 17.5 / 59.0 ms |

Receipt timing captures the actual browser pointer event, native fetch start and response-header arrival; server command acknowledgement follows durable commit. All 52 clicks have a later changed player-position publication. Position timing is the next SSE change after the click, not a command-ID-correlated completion, first painted pixel or GPU completion; an earlier movement can continue while a new command is admitted. The immediate ground marker is not measured by this menu route. The frame series has 6,628 intervals and is a browser scheduling proxy, not GPU render duration. The harness's outer automation stopwatch includes read/click/wait overhead and is excluded from the receipt claims above. There is no matching original browser event-timing series, so this run establishes only the bounded final workload, not a causal whole-browser speedup or uninterrupted smoothness.

Complete-catalogue size checks use the production UI, actual Metal renderer at 1440×900, a stationary base world and five ordinary refreshes per size. There are 0, 104 or 400 added carried lots; the larger two include 24 knives and the remaining wood lots. All complete choices remain searchable, and clearing search mounts the same initial 40 rows with the full **Show more choices** count. Both variants have zero page errors and zero paid-route requests.

| Complete choices | Original open / median refresh | Revised open / median refresh | Revised no-match search |
| ---------------- | -----------------------------: | ----------------------------: | ----------------------: |
| 115              |              344.94 / 87.66 ms |             254.64 / 81.08 ms |                23.82 ms |
| 1,443            |             669.66 / 429.11 ms |            549.28 / 286.59 ms |                23.71 ms |
| 5,291            |         2,220.61 / 4,023.92 ms |        1,360.94 / 1,283.55 ms |                29.06 ms |

These observed UI durations include automation/HTTP/render readiness and were not alternated under matched host conditions, so they are not a reliable percentage improvement. The matched native comparison is the isolated gain. The largest final inventory still has conspicuous opening/refresh delay, despite fast client search and bounded initial DOM work. This supports the remaining projection work rather than a smaller catalogue or a capacity claim.

The first browser harness waited for a distant-target command that was never dispatched; it did not record enough admission data to attribute that cause. A subsequent fixed-screen-point run let camera following move the second point off the map. Another sample selected a row while its action read was still loading. Intermediate runs also mixed script and UI presence sequences for the same tab, allowing liveness to pause the world; a loading/position-only diagnosis did not reproduce after the UI exclusively owned activity. Those samples include failed progress and excluded pauses and are not accepted capacity evidence. A serialized temporary instrumentation callback initially depended on an unavailable `__name` helper and was corrected before measuring. These are harness failures, not permission to bypass unavailable/loading rows. The final harness uses UI liveness, disables following and waits for completed reads. The automatic approval review timed out before one browser launch; the single permitted retry succeeded. No rejected action was bypassed.

### Final review and checks

The full new code/doc diff was reviewed against `96f8abb0`, including current actor/record-capacity admission, offer privacy and malformed input, structural split/merge/container checks, item provenance, event evidence and real command recording. Accepted offers deliberately recheck inside the disposable executor; no prepared authorization crosses an await or a world change. Omitting a drop preview's action record does not omit its transfer checks, consume checks or actual execution history. Native/captured-world equivalence and service stale/failure evidence above cover the changed paths.

- Final `pnpm typecheck` and normal production build pass; the build retains its existing large-chunk and PlayCanvas worker externalization warnings.
- The focused existing server action-catalogue file passes all five tests using disposable PostgreSQL. The kernel file passes 17 of 18; its arrow-material declaration assertion at line 397 fails identically when the two changed domain files are restored to `96f8abb0`. This pre-existing PG01 mismatch is not weakened or counted as a passing suite.
- The existing production-UI action search/contextual-facts/unavailable-preference browser check passes with zero paid-route requests. Its configured SwiftShader rendering is distinct from the actual Metal load measurements above.
- Changed-file Prettier, relative-link/anchor review and `git diff --check` pass. Temporary generated output remains outside Git; successful harnesses close their own servers, browsers and disposable databases. No other task's runtime is stopped.

The zero-provider scene does not qualify cognition/provider behavior. Fresh-context subscription acknowledgement failures are nonzero in both baseline and final runs (maintenance 77 → 103; final thought preparation 20; browser maintenance 206). These counters include a captured context becoming outdated before it is acknowledged; they are separate from command/workload/storage errors and are not model-turn success counts. Cognition scheduling remains outside PG04 qualification. Additional Jev/provider cost and cumulative task cost are **$0**.

Physical lower-end hardware is still unavailable; an actual device/access question was raised. The M1 Pro and software throttling cannot close that requirement. PF05 remains open for reliable complete-path tails, larger/older worlds and long runs. Current next candidates are the remaining disposable structural drop/split/accepted-offer work, repeated full-catalogue inventory detail/material reads, and separately attributed command queue/database waits. No wider SQL batching, scheduling redesign, reduced catalogue or reduced rendering quality is delivered here.

## PG04 — Pure prerequisite previews (October 3, 2026)

**Scoped outcome: delivered; whole-game responsiveness and wider PF05/SW18 qualification remain open.** Refreshed `Macrofold/OpenLegend origin/main@c4e18d91848b5b6d367dda1d7214a9f8222cf070` was the clean detached starting point. Created `codex/cheap-action-previews` in `/Users/mzw/.codex/worktrees/b41e/OpenLegend`; no rebase or main-checkout edit. The initial 200–500-line estimate narrowed to about ten added logic lines because the existing native prerequisite owner already supplies the required checks.

### Current attribution and delivered boundary

A fresh 30-second seed-73 full-server profile confirms the earlier hypothesis rather than assuming it: 18,197 strike previews consume 2,069.56 ms of measured synchronous elapsed time; 483 status-effect previews consume 915.96 ms; 898 fire-care previews consume 144.81 ms. The CPU profile attributes approximately 3.03 seconds of sampled time to previews, including about 0.52 seconds in action recording and 0.81 seconds in status activation. Sample-weighted profiling and elapsed call brackets are attribution, not exact per-family process CPU accounting. This run reaches 2.987× at requested 3× with command p95 387.35 ms; host load is 19.37 → 19.51. It uses PostgreSQL, HTTP commands, SSE and real publication, without a browser.

Standalone movement, strike, gathering, hunting, harvesting and pickup previews now reuse the existing pure prerequisite evaluation and return the same accepted preview before allocating an action ID, recording experience, starting work or interrupting a status in a disposable draft. Current actor participation/body/conditions, perceived exact targets, equipment/ammunition, finite supplies, route/reach, interruption permission and action-record capacity still pass through that owner. Binding, duplicate/conflict checks, refusal order, public codes/messages and request-specific review notes are unchanged. Execution independently reevaluates the current world and retains every existing mutation, completion check and commit. Prepared routes/actions remain local to that synchronous call; no preview result or prepared authority is retained.

Status effects retain disposable execution: activation also admits ongoing-work capacity after its condition checks and can refuse there. Material work, fire care, following, replenishment and other immediate commands retain their existing path. Previews inside a larger native operation also retain disposable execution, preserving the caller's work allowance (see the review below). This is the explicitly uncovered portion, not a claim that every family has pure admission. No new cache, catalogue cap, sensing change, scheduling/SQL change, renderer setting or world rule is introduced.

### Equivalence and stale authority

The final bounded comparison uses original and candidate executors on identical frozen seed-73 specimens. **1,088 preview/execution comparisons** match complete outcomes, ordered event arrays and SHA-256 hashes of the entire serialized resulting world, including resources, saved randomness, IDs, receipts and action records. There are 346 accepted comparisons; all six optimized families have accepted examples. Every preview returns the identical input world with no events, and the input hash remains unchanged.

The 17 specimens include unchanged input, a prior command receipt, pause, death/incapacitation, unsupported airborne placement, a corpse, active rest, a human-controlled target, target deletion/movement, depleted gathering stock, extinguished heat, attack recovery, a moved weapon, absent ammunition and exhausted action-record allowance. Inputs include malformed IDs/purpose, missing bindings, unsupported commands and blocked/wrong-floor movement. Ten sequential command/advancement comparisons follow movement, an actual hunt attempt, gathering, cooking and eating through real navigation/completion; complete resulting worlds and event arrays match. A real competing weapon drop invalidates a previously accepted hunt preview. A competing rest activation retains the original refusal on later gathering. This finite matrix is not exhaustive admission qualification.

Focused existing checks cover catalogue refresh/privacy, control replacement, restart and elevated-route/manual-slot restoration. An additional disposable PostgreSQL service scenario checks actual refusal after a captured controller is replaced, depletion/deletion after preview, restoration into pause, rejection of a pre-restore scope and successful current gathering after reentry/resume. No preview is permission to execute later.

### Isolated work

Node 22.23.2, Apple M1 Pro, macOS 15.7.3. Alternating original/candidate order over seven rounds on the same frozen worlds; the first round is warm-up. No task-owned benchmark/test/browser overlaps the final isolated measurement. Process CPU includes runtime/GC helper threads and may exceed wall time. Values are median batches, not command latency or FPS.

| Specimen                                                    | Strike previews per batch | Original wall / CPU ms | Candidate wall / CPU ms |
| ----------------------------------------------------------- | ------------------------: | ---------------------: | ----------------------: |
| Small scene                                                 |                       120 |           6.57 / 14.09 |             3.33 / 6.21 |
| Crowded: 40 added people, 40 animals, 100 objects           |                     1,720 |        256.32 / 254.64 |           35.99 / 35.92 |
| Same crowded scene, 1,500 synthetic retained action records |                     1,720 |    3,834.13 / 3,791.95 |           37.52 / 37.31 |

Crowded wall ranges are 248.00–265.76 ms original and 35.37–42.34 ms candidate, roughly 86% less median work. The history case demonstrates avoided disposable scans/copies of retained action records; it is not a long-running save/load or population-capacity test. Actual commands still record their real actions. Earlier small/crowded diagnostic batches and an expanded matrix overlapped selected checks; the table uses the later isolated run, retaining those earlier raw observations privately.

### Complete-game measurements

Private original/candidate source snapshots use the same pinned production client output, PostgreSQL 14.17 with vector support, a fresh disposable world/database per run, zero provider budget and no provider transport calls. The current representative scene has **142 roots: one player, 20 NPCs, 21 animals and 100 other objects**, including eight lit fires. The browser retains current Detailed settings (four selected shadowed lights), full 1920×1080 output, real SSE/React, moving camera, one walking request per second with at most one in flight, and contextual menus about every two seconds. This is today's light budget, not qualification of the historical eight-shadowed-light workload. Physiology and sensing remain enabled. Screenshots were visually inspected.

The matched comparison below uses 45-second offered phases with the same corrected frame recorder and measurement boundary; observed command drain produces 45.205 / 45.238 seconds. Candidate runs first, followed by an original repeat. A preceding original browser diagnostic recorded 68.711 seconds because screenshot/browser cleanup continued the server; its valid 45-second frame capture and higher-load observations are retained, but its aggregate command/projection totals are not used as the matched baseline. Initial stale-scope setup failures, a sandboxed Chrome launch abort and a frame-recorder injection error produced no accepted frame baseline; temporary setup was corrected without changing game code.

| Metric                                           |                   Original repeat |                         Candidate |
| ------------------------------------------------ | --------------------------------: | --------------------------------: |
| Achieved simulation speed at requested 3×        |                            2.984× |                            2.984× |
| Successful commands / failures                   |                            43 / 0 |                            44 / 0 |
| HTTP command p50 / p95 / p99 / max ms            | 165.14 / 364.12 / 997.24 / 997.24 | 169.00 / 396.97 / 614.87 / 614.87 |
| Menu click to rendered result p50 / p95 / max ms |          277.95 / 450.39 / 956.27 |          284.20 / 514.92 / 637.49 |
| Menu click to API reply p50 / p95 / max ms       |          261.94 / 401.10 / 428.28 |          229.63 / 502.05 / 630.90 |
| Browser frame interval p50 / p95 / p99 / max ms  |       50.0 / 83.3 / 100.0 / 150.1 |        50.0 / 66.7 / 66.7 / 150.0 |
| Browser animation-frame cadence                  |                    18.32 / second |                    20.06 / second |
| Publication p95 / p99 / max gap ms               |          120.90 / 194.97 / 858.92 |          118.27 / 195.13 / 583.53 |
| Strike preview count / total ms / mean ms        |        30,090 / 3,641.86 / 0.1210 |        30,790 / 1,305.84 / 0.0424 |
| All preview total ms                             |                          7,514.37 |                          6,060.79 |
| Host load, start → end                           |                     39.92 → 34.51 |                     35.97 → 24.22 |

All 22 menu requests succeed in each run. The fixed pointer/camera sample selects ground with zero or one permitted catalogue entries, rather than a broad action-picker load; object/personal catalogue correctness and the larger strike candidate set have separate evidence. Naturally evolving visibility/positions and publication counts differ; no entries are removed to improve timing. Browser long tasks number two per run, maximum 212 / 149 ms. Animation-frame cadence is distinct from confirmed game progress and from the rendered-FPS widget's last one-second sample. The browser reports ANGLE Metal on Apple M1 Pro; no software rasterization or lowered fidelity is used.

Complete-path attribution uses existing metrics plus temporary per-family preview and real-command native brackets. Phase totals overlap/nest and **must not be added**:

| Stage                                               | Original count / total ms | Candidate count / total ms |
| --------------------------------------------------- | ------------------------: | -------------------------: |
| Public projection                                   |           836 / 10,186.78 |             851 / 8,964.29 |
| Real command native transition                      |               43 / 112.21 |                44 / 128.23 |
| Command admission through durable result            |             43 / 5,574.40 |              44 / 5,237.96 |
| All mutation-lane waits, including non-command work |         1,001 / 11,165.46 |          1,042 / 10,063.09 |
| Native simulation work                              |           861 / 16,085.61 |            903 / 17,768.07 |
| World commits                                       |             97 / 8,561.60 |              96 / 7,503.63 |
| PostgreSQL statement round trips                    |         6,236 / 26,582.90 |          6,528 / 22,738.36 |

The independent undelayed `SELECT 1` probe has p95 30.85 / 23.45 ms and max 60.63 / 183.76 ms. SQL spans include process/database scheduling, not just database CPU. These brackets distinguish queue/native/projection/storage/browser work without claiming a precise decomposition of every individual tail. The server-only candidate diagnostic also reaches 2.975×, command p95 317.20 ms and strike mean 0.0358 ms, under lower load than its original; that is a separate workload without browser cost.

**Interpretation:** repeated strike previews are consistently cheaper, about 65% per call in the matched full-game sample. Whole-game command and menu p95 do not consistently improve; frame cadence remains far below smooth-play acceptance. Status effects and fire care now dominate remaining preview time. Native simulation, queue/storage waits and browser/host work remain material. The changing host load and short, sequential phases do not establish a causal tail/FPS improvement or production capacity. No physical lower-end device, long soak, multiple players, broad populated menus, larger persistent histories through the complete game, remote database or live cognition workload was qualified. PF05, SW18 and AC11 retain those wider requirements.

### Checks and cleanup

- Existing kernel checks: 17/18 pass. The arrow-material English-substring assertion fails identically on original `c4e18d91`; mechanical material rejection remains intact and PG01/TODO retain that repair. All five action-catalogue checks pass with disposable PostgreSQL.
- Two selected world-service control/restart checks and the elevated-route/manual-save restoration check pass. The separate service lifecycle scenario and final equivalence matrix pass; no new automated test suite is authored.
- Typecheck, production build, changed-file formatting and full affected-diff review pass. Existing browser-module externalization and large-chunk build notices remain. Generated configuration, dependency pins and lockfile are unchanged.
- Raw profiles, screenshots, source snapshots and ad-hoc harnesses remain outside Git under `/tmp/openlegend-pg04-*`. The profiling adaptation supplies today's page scope/control acquisition, not an alternate command executor. Owned browser/server/store/database resources are closed; the preexisting PostgreSQL server and other tasks are untouched. Additional Jev/provider cost is $0; cumulative task cost $0.

### PG04 review — Work allowances and reusable attribution

The requested full branch review found and fixed a missed operational boundary: when `executeCommand` is called inside another native work group, skipping disposable interruption events could make a preview accept while the original preview and real execution exceed that caller's allowance. A policy admitted through the current status owner supplies a nonblocking status that emits when interrupted by gathering. With the caller's event allowance exhausted, the pre-review optimization accepted the preview; original and actual execution threw `work-contract` for `effects`. The reviewed code preserves the original disposable preview in that context. Public server previews remain standalone and keep the measured optimization; actual command effects and all work limits are unchanged.

A bounded native scenario compares **12** cases across no active status versus that admitted status, standalone versus nested versus exhausted work allowances, and preview versus actual execution. Complete transitions/throws, worlds and ordered events match the original; inputs remain unchanged and successful previews return the same world with no events. The existing 1,088-comparison/ten-transition scenario is rerun after the correction. This checks the concrete boundary without claiming exhaustive authored-world or load qualification.

The review also repairs the existing `scripts/profile-server.ts`, which previously omitted current page scope on writes and had not acquired current character control. It now uses the player control endpoint, refreshes scope/command epoch outside measurement, and records aggregate preview counts/elapsed milliseconds by command type. No instrumentation is added to normal gameplay. The original PG04 measurements above used equivalent temporary control/timing adaptations; they remain historical matched evidence, not results of this tool check.

The repaired tool completes a **10.021-second** disposable PostgreSQL run on Node 22.23.2: nine successful walking commands, zero failures/storage errors/provider calls, 182 publication updates and **2.987×** achieved simulation speed at requested 3×. It reports 6,949 strike previews / 255.14 ms, 181 status previews / 359.42 ms and 342 fire-care previews / 60.56 ms. Command p95 is 538.79 ms and host load changes 15.06 → 14.41. This short server-only check validates current tool setup and attribution, not a new matched performance comparison, smooth play, a browser workload or population capacity. Its owned database is dropped and resources close normally; raw output remains private under `/tmp/openlegend-pg04-review-*`.

The review retains the existing PF05/SW18/AC11 gaps: status/fire-care disposable admission, real-command history cost, queue/storage/native/browser tails, broad populated menus, larger persistent histories/loads, long runs and physical lower-end hardware. Further pure extraction needs a fresh measured cause and shared capacity/interruption checks; SQL batching, scheduling, weaker sensing and PG03 presentation remain outside this change. No new unimplemented PG04 requirement is deferred to those wider trackers.

Eleven selected existing kernel/catalogue checks pass with disposable PostgreSQL (12 unrelated checks are excluded); the preexisting arrow wording assertion remains unchanged and tracked above. Typecheck and changed-file formatting pass. Full resulting-diff review confirms current binding/privacy/authority, pure-query ownership, actual mutations, lifecycle and bounded fixture instrumentation. The earlier production build and browser evidence are reused for unchanged integration/presentation; no browser rerun, full suite or new scale/device pass is claimed. Additional Jev/provider cost is $0; cumulative task cost $0.

### PG04 second review — Diagnostic completion

The October 4 full-branch review against refreshed `Macrofold/OpenLegend origin/main` at `c4e18d91` finds no additional production-game change needed. It does reproduce a profiler reporting race: a host probe launched during measurement can reject after the report has already recorded zero failures and the process has selected a successful exit. An ad-hoc preload delays only this tool's independent `SELECT 1` completion by eight seconds, then rejects it. Before the fix, the three-second run writes `failureCount: 0` before the injected error arrives, then exits 0. After the fix, the same scenario writes one `probe` failure and exits 1. Its measured gameplay remains 3.143 seconds; the diagnostic drain is excluded from gameplay duration, simulated progress and publication timing. Late successful probes remain excluded from timing samples as before.

The tool now retains and drains its one pending probe before reporting and during failure cleanup. Its connection closes in the outer resource owner, including setup failures. A separate injected failure immediately after probe connection verifies connection closure and unsuccessful exit. The normal three-second check completes three accepted walking commands, 52 publications and 14 host probes with zero failures/storage errors/provider calls: 3.160 seconds measured, 2.808× achieved at requested 3×, command p95 408.76 ms, host load 20.56 → 20.04. This deliberately short tool check is not a matched performance comparison or capacity qualification. Node is 22.23.2 and PostgreSQL is the same local disposable setup; all four owned baseline/fixed/normal/setup-failure databases are confirmed absent afterward.

Typecheck, changed-file formatting and full resulting-diff review pass. Unchanged production behavior reuses the preceding native equivalence, stale/competing-state, focused checks, production-build and browser evidence; no new gameplay, browser or scale qualification is claimed. Existing PF05/AC11/PG04 status and wider gaps remain accurate, including the preexisting arrow wording assertion. Private failure harnesses and reports remain under `/tmp/openlegend-pg04-*`; no new automated suite or runtime instrumentation is added. Additional Jev/provider cost is $0; cumulative task cost $0.

## PG04 — Meter-refilling and following (October 4, 2026)

### Scope and current attribution

Mike authorized qualifying and implementing the two AC11 candidates. Baseline is `codex/cheap-action-previews@f7521b8e`, containing refreshed `Macrofold/OpenLegend origin/main@d36ec3bd66f9b317748147003cc174f58cfd5642`; production change is the existing standalone preview list extended with `replenish` and `follow`. Private baseline/candidate snapshots permit comparison before changing production. Replenishment's existing evaluation covers installed numeric meter, compatible/nonempty perceived source, current value, approach/reach, materials and interruption permission; it has no admission-time material claim. Following's existing evaluation prepares its route without recording a world sighting; the subsequent repeated route/sighting setup adds no starting refusal. Actual commands still perform that setup and all later checks. Nested callers keep disposable execution so their computation/event accounting is unchanged. No cache, authority/interface change, new gameplay, numerical limit, catalogue reduction, weaker sensing or renderer compromise is introduced.

Current attribution uses the existing disposable server profiler, adapted privately to the existing seed-73 clockwork demonstration, with 20 other people, 21 animals and 100 objects across the world; initial/final permitted views each show 20 other people, eight animals and 92 objects. Real HTTP following commands arrive once per second, scoped source/person menu API reads alternate every 500 ms, and SSE/native simulation run at requested 3×. Node is 22.23.2 on the same local ten-logical-CPU host; PostgreSQL is loopback/disposable, SQL delay is zero, spending/cognition-provider calls are disabled. This demonstration exercises an authored charge meter; it is not bundled drinking gameplay or the historical eight-fire/full-HD browser workload.

The valid baseline records 264 replenishment previews / 46.20 ms and 19 following previews / 6.50 ms. These are measurable repeated costs, but a small fraction of the complete workload; the change cannot plausibly remove its storage/native/browser bottlenecks. Per-family elapsed spans include accepted/refused calls and overlap projection/menu spans; CPU profiles and current queue/native/storage measurements remain separate attribution, not additive totals.

### Equivalent decisions, actual effects and current-world changes

The pre-implementation comparison checks **540** preview/actual cases across 18 world variants and 15 exact commands; **100** accept, including duplicate outcomes. Exact codes/messages, failures, complete resulting-world hashes (including saved randomness) and ordered events match. Variants cover nearby/approaching, empty/full/incompatible supply or meter, missing installed meter, removed/hidden/dead/airborne targets, paused/dead/incapacitated/airborne actors, record capacity, interruptible/noninterruptible ongoing effects and command identity conflicts. Successful previews retain the input world identity, emit nothing and leave its serialized contents unchanged.

Another **48** comparisons cover the two actions with/without an interruptible effect under nested default, zero-event, zero/limited-query, zero-input and limited-depth allowances, in both preview/actual modes. Refusals and thrown budget errors match. **19** actual start/progress/JSON-restore transitions match, including route completion, meter/source consumption, following movement, target loss and last-seen behavior. **11** stale/competing comparisons recheck changed targets, supplies, meter values or body condition; another character's actual recharge exhausts the finite supply and the later command refuses. This is bounded targeted equivalence, not exhaustive authored-world qualification.

Nine checks through the installed production service cover both availability results and scoped catalogues, zero preview commits, actual starts/action records/sightings, depleted supply, a target leaving sight and changed control authority after preview. The former approval grants no later execution permission. Initial fixture attempts had a mistaken actor-kind filter, an invalid direct actor deletion rejected by storage, and a wrong expected control-refusal code; these were corrected without gameplay changes and do not count as successful evidence. Missing/deleted target input is covered by native comparisons; the committed service case moves the target out of sight through the spatial owner instead of bypassing removal/storage integrity.

### Isolated repeated work

Each row is six alternating warmed batches of 300 exact accepted previews, on unchanged frozen inputs. Timed regions exclude serialization/reporting; both versions receive the same immutable world and native dependency versions. The history specimen adds 1,200 synthetic completed action records to the nearby world. It isolates record traversal/copy costs and is not a complete-game mature-history qualification.

| Input / action            | Baseline median batch ms | Candidate median batch ms | Reduction |
| ------------------------- | -----------------------: | ------------------------: | --------: |
| Nearby meter refill       |                    12.85 |                      3.18 |     75.3% |
| Nearby following          |                    24.42 |                      2.82 |     88.4% |
| Approach then refill      |                    14.46 |                      8.57 |     40.8% |
| Approach then follow      |                    31.12 |                     13.88 |     55.4% |
| 1,200 records / refill    |                   244.88 |                      2.29 |     99.1% |
| 1,200 records / following |                   148.05 |                      2.61 |     98.2% |

All six batches improve for each specimen. Nearby baseline/candidate ranges are 12.43–17.88 / 2.72–3.59 ms for refill and 22.94–25.06 / 2.47–3.20 ms for following; approaching ranges are 13.74–15.28 / 8.36–10.49 and 30.35–31.95 / 13.25–16.82 ms. Route calculation remains required. Skipping temporary activity recording and repeated following setup removes unnecessary work; actual-command history cost remains unchanged.

### Complete-server measurements and limits

These are sequential 20-second offered runs with the same fixture/workload, not a statistical tail/capacity acceptance. All 20 following commands succeed in both runs, all 39/40 menu API reads succeed, and failure/storage/provider counts are zero. The candidate run begins while the short type check is finishing; host load also changes between runs, so whole-path differences are observational rather than a causal speedup claim. No browser participates; menu timing is API request/result latency, not click-to-render latency.

| Metric                                   |        Baseline |       Candidate |
| ---------------------------------------- | --------------: | --------------: |
| Measured elapsed seconds                 |          20.173 |          20.242 |
| Achieved simulation speed / requested 3× |          2.978× |          2.972× |
| Refill preview mean ms                   |          0.1750 |          0.0261 |
| Following preview mean ms                |          0.3422 |          0.0996 |
| Command HTTP p95 / max ms                | 163.51 / 257.90 | 261.76 / 369.76 |
| Menu API p95 / max ms                    | 176.47 / 597.37 | 109.64 / 217.83 |
| Publication p95 / max gap ms             |  83.08 / 203.76 |  69.99 / 311.78 |
| All preview elapsed total ms             |          692.23 |          574.66 |
| Collected heap at end MB (decimal)       |           70.49 |           70.17 |
| Host one-minute load, start → end        |     8.61 → 7.88 |     5.32 → 5.48 |

Current phase totals overlap/nest and must not be added: public projection is 374 / 1,534.05 ms versus 379 / 1,384.95 ms; actual command admission-to-durable-result is 20 / 1,806.88 versus 20 / 1,695.91 ms; all mutation waits are 527 / 2,748.57 versus 525 / 2,530.80 ms; native simulation calls spend 4,449.11 versus 4,136.29 ms. Commits are 43 / 2,481.57 versus 42 / 2,095.65 ms. PostgreSQL statement round trips total 3,203 / 6,588.44 versus 3,271 / 6,019.20 ms; the independent undelayed probe p95 is 19.96 versus 10.32 ms. Statement/probe time includes host scheduling, not solely database CPU.

**Outcome:** the two candidates are verified and implemented as cheaper standalone previews; whole-game command p95 does not improve and achieved simulation speed is effectively unchanged. The apparent menu/publication improvements do not qualify browser responsiveness. Status/material/fire-care temporary checks, actual-command record/history work, queue/storage/native costs and PF05/AC11/SW18 browser-rendered menu, larger-history/load, long-run, multi-player and physical lower-end-device acceptance remain open. No full eight-fire rendering or live cognition workload was rerun. The original PG04 evidence above remains historical at its recorded revisions/workload.

Typecheck, production build and eight selected existing kernel/catalogue/service checks pass (28 unrelated checks excluded). Existing browser worker externalization and large-chunk build notices remain. Full affected-diff review and changed-file formatting/link checks qualify the implementation/documentation; no new automated suite, dependency/schema change or runtime instrumentation is added. Raw reports, CPU profiles and comparison scenarios stay private under `/tmp/openlegend-meter-follow.EhN3rX`; owned service/server/store resources and disposable databases close, while the preexisting PostgreSQL server and other tasks remain untouched. Additional Jev/provider cost is $0; cumulative task cost $0.
