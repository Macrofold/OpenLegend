# Trace a slow save across the game process and database

October 16, 2026. **Game, database and resource recording complete; precise CPU clock alignment fails and remains open. No optimization adopted.**

The unchanged-index game has a 12.6-second history-write callback and a 7.3-second timer delay. The subsequent tiny read-only process does not reproduce either. A high system-load reading alone does not establish the cause; the small process also does not exercise game writes, a larger working set or intermittent stalls. Record the actual game and database together before another optimization or comparison.

## Selected diagnostic

Use the exact qualified PF16.174 ordinary-record-writer control, including independent presence, seventeen people / forty animals and finite real travel/work/food. Change no game, profiler, schema, rules, queue deadline or providers. Enable the existing CPU-profile option and reuse the exact qualified duration-only PostgreSQL observer. Add only a private main-thread observer (about 25–45 logic lines) recording process CPU, peak resident memory, page-fault / filesystem-operation / context-switch counters and current resident bytes once per second. It starts before imports and labels its absolute clocks, so analysis clips startup and cleanup from measured play. The observer holds scalar counters only, never game bodies, environment variables or command arguments. It cannot schedule work or authorize a mutation.

[Node's documented resource counters](https://nodejs.org/docs/latest-v22.x/api/process.html#processresourceusage) distinguish CPU usage, memory faults and scheduler switches; unsupported counters must not be treated as evidence of zero activity. A counter increase does not measure how long an individual fault or switch takes. The [CPU profile format](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/#type-Profile) has timestamped samples; wall time attributed to a sampled stack is not automatically CPU consumed by that function, especially during process stalls.

Bound resource recording to 400 samples / 256 KiB, CPU-profile readback to 16 MiB, the original duration observer to 40,000 queries / 32 MiB appended log / 16 MiB output, game report to 4 MiB and the existing 300-second outer deadline. Timed game length is 120 seconds. No detailed completed-stage journal, browser, artificial game stall, forced garbage collection, paid provider, settings change or unrelated-process action. Original life/travel/food/error/unpaused/source/worker/exact-owned-cleanup gates remain. A busy refusal or any other error stays failed even if the remaining diagnostic files are useful; do not automatically repeat the game if a long stall does not recur.

Before gameplay, review/format/syntax-check the resource observer, verify actual worker inactivity and qualify it in a short standalone process with a bounded known amount of CPU work. Require increasing CPU counters, valid clock ordering, scalar-only bounded output and normal owned process closure. Reuse unchanged native/storage/source proofs and the latest exact duration/protocol/error/privacy evidence only by identity. Those gates release one separately pinned actual game.

After closure, verify complete duration mapping, source / lifecycle identity, CPU file bounds / sample IDs / clocks and resource coverage. Rank actual database phases and game calculation samples; correlate only bounded, correctly aligned intervals. Distinguish PostgreSQL elapsed work from application callback waits, process CPU from wall time, and memory activity from a demonstrated stall cause. Preserve missing coverage and unassigned time. This is diagnosis, not uninstrumented capacity or a completed index comparison.

## Resource qualification and released game

The new scalar recorder passes syntax, formatting and full source review. An actual child worker exits normally without installing it. A bounded standalone calibration performs 100.003 ms of known CPU work; surrounding resource samples record 144.761 ms including other process work, four monotonic samples and a 0.450 ms range between the two clock origins. The owned calibration process closes normally in 2.318 seconds. No game or database runs in that calibration.

Private calibration proof: `ol-pf179-resource-calibration-proof-20261016-a.json`, SHA-256 `4c7aa8186288fada9653b8cfb3a1acdd0b4bb61017f0b295687d59b417782aa0`. The actual ordinary-index source is byte-identical to PF16.177's control, so its fresh full current-world / canonical / derived / privacy / rollback / index-catalog proof is reusable. The original duration observer is unchanged and has complete current no-game coverage plus its known-wait / error-identity protocol qualification.

Those gates release exactly one instrumented 120-second game. Plan: `ol-pf179-game120-launch-plan-20261016-a.json`, SHA-256 `f3d930cac336c5ecc67dccca1e2de616dac3e5efa5a89f68448fa20c2c54c39e`. Release SHA-256: `cd46f4e1cd49a56100c80c4b5563257d9f721441783be67ce3aa3bf299b9f3b3`. Original deadlines and every failed gate remain controlling; results are pending. No index-removal speed comparison or capacity acceptance is implied.

## Completed game and usable evidence

The process closes normally with exact owned cleanup and unchanged source / worker guards. All seventeen people and forty animals survive, sixteen residents travel and eat their produced food, 128 plans / 112 matched meals complete, and 105 walks confirm. Runtime/provider/storage errors and clock pauses are zero. **1.980×**, **1,042 ms walking p95**, fourteen skipped input slots and eight rather than twelve plans per least-active resident still fail the performance/activity targets. No browser is measured.

The longest save is **6.908 seconds** and the longest SQL callback is **1.764 seconds**. The prior seven-second timer pause does not recur: timer lateness peaks at **380 ms**, and recorded garbage collection at **103 ms**. This does not repair or explain the earlier severe control failure.

| Actual recorded writer cost in this game                     | Elapsed time |
| ------------------------------------------------------------ | -----------: |
| PostgreSQL processing / waiting inside the writer connection | **45.486 s** |
| The same writer requests through application callbacks       | **63.217 s** |
| Writer parsing                                               |  **5.355 s** |
| Writer preparing bound values                                |  **7.085 s** |
| Writer executing extended requests                           | **31.327 s** |

The separate parse/bind/execute/simple categories sum to the database total; application waits overlap save and other stages. Neither total is pure CPU. Reader requests add 1.707 seconds inside PostgreSQL / 8.022 seconds through callbacks; trivial reference queries add 0.776 / 11.816 seconds. Their connections run in parallel, so do not add those totals as an exclusive timeline.

The largest recurring query families are new searchable-experience insertion (**388 calls / 7.095 s backend**), recall eligibility / search-queue reconciliation (**238 / 5.331 s**) and the grouped historical-event/audience/total writes (**219 / 5.187 s**). Every exact query shape is retained in the ranking; mixed statements stay mixed. The slowest database request inserts canonical awareness rows: **1.366 s backend / 1.671 s callback**, 4,956 parameters and 219,544 string bytes. A recall reconciliation takes **1.327 s** nearly entirely inside PostgreSQL. These are actual backend delays, but include database I/O / scheduling waits and do not by themselves prove bad query algorithms.

Complete duration mapping covers **6,836 requests / 18,298 phases** across three closed connections, with zero omissions/errors/text leaks or unassigned successful phases. Strict measured-window boundary exclusions remain explicit. The source/callback clock-origin range is 2.488 ms, within the existing three-millisecond gate.

## Process counters: no new major faults in covered play

All 129 scalar samples fit 37,006 bytes with zero omitted/failed observations and monotonic counters. The recorder brackets the complete game; 119 wholly contained intervals cover measured milliseconds 709–120,325 of 120,723. The excluded edges stay unmeasured rather than assumed.

Those covered intervals report **zero new major page faults**, 157,722 minor faults and 435,950 involuntary scheduler switches. The latter include the measurement machinery and worker threads; they cannot establish how long a particular callback was delayed. Resident memory ranges approximately **91–510 MB** among measured samples; it is not a retained-heap or leak measurement. The largest resource-sample gap is 1.052 seconds. Filesystem counters remain zero, without a claim that no I/O or compressed-memory work occurred. These observations do not support attributing this game's long database waits to major paging of the game process.

## CPU clock-alignment check fails; sample counts remain usable

The 4.12 MB CPU file contains 72,312 valid sample IDs / nonnegative intervals. Its timestamps use an origin about **1,943 seconds** different from the existing game's high-resolution timing markers. The original strict parser therefore rejects start and end alignment. It emits **no aligned phase durations**. That failed check is retained; no arbitrary timestamp shift or new game is used to conceal it.

Whole-file counts remain usable without claiming CPU seconds or exact play-window placement: 32,743 samples are marked idle; the ordered classification assigns 4,471 to ongoing needs/conditions/work, 4,417 to sightings/recognition, 2,654 to completing world edits, 1,877 to other condition reconciliation and 2,920 to player-view preparation. Other native work remains a substantial category. Editing-library caller counts overlap these categories and must not be added. A properly bounded clock translation or fresh calibration remains needed before claiming that a particular sampled stack occupied a specific slow-save interval. The original long timer pause is still unreproduced.

No runtime optimization is adopted from this diagnostic. The strongest specific optimization targets remain the repeatedly measured experience/index writes and repeated whole-world calculations; the index-removal game comparison is still incomplete.

Private raw game SHA-256: `3605dd3421448f52e647adab9d0f2e7de88b28a4a5680999021e3709f2ce516c`. Complete backend ranking: `ol-pf179-database-readback-20261016-a.json`. Original rejected alignment: `ol-pf179-cpu-attribution-20261016-a.json`. Whole-file count reader SHA-256: `0996a0beeaa6885f0347c5e63fd589962dbb3f0580115afc2ac79a98a23f618b`. Resource readback SHA-256: `2ef6258a5f2129606f957d813519c0de00269491393f26d4ed2a3f06784d0a85`. Each reader pins its complete inputs. Additional and cumulative game-provider/Jev cost remains **$0**.

## Later bounded clock qualification — October 16, 2026, 19:11 EDT

The original direct-origin comparison above remains failed. [PF16.185](63-cpu-clock-alignment.md) subsequently qualifies a start/stop interval translation with independently known CPU/idle markers. It retains115.954msuncertainty and excludes80ambiguousedge samples, allowing a bounded measured-play stack-count ranking. It still cannot assign a sampled function to a particular slow save: those old save entries lack time bounds, and exact Unix-query alignment lacks an independent bracket. No new game or performance pass follows from this correction.
