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
