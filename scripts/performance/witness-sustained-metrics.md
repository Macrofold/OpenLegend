# Collecting sustained perception measurements

Run the [sustained workload](witness-sustained.ts) with a fresh database and a private output directory for each run of the integrated Rust release. Retain the full source commit, executable hash, fixture inputs, actor counts, host CPU and memory, PostgreSQL version and placement, configured rate, instrumentation, and competing host load. Record cold launch through the first usable authorized player view separately. Wait for the first authorized update showing at least one elapsed game second after Resume, then run the declared warmup before starting the five-minute measurement and record any drain or cold reopen separately. Preserve refusals, closed streams, pauses and technical holds in the run evidence. Repeat matched runs and retain their spread. [Qualification order and workload](../../docs/projects/attention-and-scenes-runtime-design.md#102-measurements-and-pass-conditions) · [Performance reporting](../../docs/performance/measurement.md#reporting-results)

The existing Rust profiling campaign is pinned to a different opening. Its fixed contract covers 180 seconds, one player, ten human NPCs, fifteen animals, 1,246 scenery records, 34 walks, two steering gestures and two controlled conversations. Use the sustained workload entry point for these inputs. The previous TypeScript runner that used the standard and substantial scenarios was retired when the stand-alone Rust server became the runtime. [Pinned Rust workload contract](rust-profile/contract.ts) · [Earlier sustained scenario evidence](../../docs/verification/performance/2026-10/attention-runtime.md#final-source-workload-and-outcome)

## Reproduce the inputs

Run from the integrated checkout with its pinned Node dependencies installed. Use the Rust game server, browser build and checked language directory from the same release preparation. The archived provider helper needs Node.js 22.23.2 or compatible and an OpenSSL 3-compatible command on PATH. The release build command is `(cd native && cargo build --locked --offline --release -p openlegend-game-server)`. See the repository's [release instructions](../../README.md#run-the-stand-alone-rust-server) for browser and language preparation. Use a dedicated loopback PostgreSQL cluster on the speed-test worker. The runner creates a fresh database for each invocation and drops it after the server stops. Supply no provider credentials or existing game database.

The signed workload client reuses the stream decoder from `native-runtime-foundations/nsc04-joined-ordinary-20261123/driver.tar.gz` in the Open Legend verification directory. Mount that archive as a read-only case input on the worker. Its SHA-256 is `0e1655cff19c8bfa546279cb581df89fd4c0454cc8501eeba05496db4e238260`. The sustained entry point verifies the bytes of the archived stream reader and only the provider or process-accounting helpers the case uses. The workload uses the existing release exporter, native listener and per-player server-sent event connections. Its movement client and operator requests share the HTTP code for signed requests and use separate request limits. The movement client owns the schedule and records one movement observation per command plus a single clock series.

```sh
export OPENLEGEND_BUILD_DATABASE_ADMIN_URL='postgresql://WORKER_USER@127.0.0.1:5432/postgres'
RUST_SERVER="$PWD/native/target/release/openlegend-game-server"
BROWSER_BUILD="$PWD/dist/client"
LANGUAGE_DIR=/absolute/path/to/checked/language
DRIVER_ARCHIVE=/absolute/path/to/driver.tar.gz
RUN_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/witness-sustained.XXXXXXXX")

sha256sum "$DRIVER_ARCHIVE"
for specimen in normal:1 normal:25 crowd:1 crowd:25; do
  scenario="${specimen%:*}"
  players="${specimen#*:}"
  node --import tsx scripts/performance/witness-sustained.ts \
    "$scenario" "$players" 300 "$RUN_ROOT/$scenario-$players" \
    "$RUST_SERVER" "$LANGUAGE_DIR" "$BROWSER_BUILD" "$DRIVER_ARCHIVE"
done
RUN="$RUN_ROOT/crowd-25"
```

Use 8 in place of 300 for the connected rehearsal, in fresh output directories. The 300-second runs have a ten-second warmup with ten scheduled moves per player. The eight-second rehearsal has a five-second warmup with five scheduled moves per player. At the start of a run each player independently takes control and receives a real authorized stream reset. During play each actor attempts one alternating-destination movement request per second. The first offer is 150 ms into its second, with 29 ms of staggering per additional player. Presence renews every five seconds per player. The normal opening adds three ordinary Speak requests 250 ms apart starting four seconds into the measured window, then one at each of 60, 120, 180 and 240 seconds. It installs a disposable interactive allowance just large enough to admit Speak and points only to the archived loopback provider. The server can still schedule NPC decisions and send requests to that local endpoint. The endpoint holds each request without supplying a model result. The report records held requests, requires zero completed provider exchanges and records saved job statuses. This preserves plain speech and isolates runs from provider outcomes and external spending. The crowd arms configure no AI allowance or provider.

| Case                        | Players | NPCs | Animals | Root objects | Scheduled moves in 300 s | Scheduled moves in 8 s |
| --------------------------- | ------: | ---: | ------: | -----------: | -----------------------: | ---------------------: |
| Exact Main opening          |       1 |    6 |      20 |           74 |                      300 |                      8 |
| Main with 24 added visitors |      25 |    6 |      20 |           74 |                    7,500 |                    200 |
| Crowded meadow              |       1 |   99 |     100 |          200 |                      300 |                      8 |
| Crowded meadow              |      25 |   75 |     100 |          200 |                    7,500 |                    200 |

The single-player Main case uses the usual combined authored opening and default seed 73. The 25-player Main case preserves that content and adds 24 controlled people on separate outdoor lanes. The crowded meadow uses seed 73 in both arms and keeps the same human, wildlife and root object placements while changing which people are controlled. It uses 50 deer, 50 hares, 196 placed resource patches, four pastures and solid rock gaps. Root object counts are independently placed non-living entities. Authored terrain and decorative scenery records are separate. The six authored Main NPCs start without queued physical work. Expect native animal movement, visible stream changes and live saves in every run, and saved NPC actions or placement changes in the crowd rehearsal.

Each crowd NPC starts with an ordinary eight-leg plan. The one-player crowd starts with 792 planned legs; the 25-player crowd starts with 600. A clear 80-metre route takes about 12 real seconds at the authored clock and walking speed. The Rust action executor accepts this finite ordinary plan and rejects a repeating requested walk. The current runner has no supported way to keep these NPCs independently active for five minutes with providers disabled. Use the crowd cases to measure the actual finite-plan specimen and publish that activity horizon with any result. The crowd qualification remains open. [Walking plan bound](../../packages/domain/src/worlds/base/plan-rules.ts) · [Rust activity validation](../../native/simulation/src/plans/activity/frontier.rs)

The existing fixed scheduler holds at most one movement request in flight per player. The client discards each applied view after checking current movement and retains compact command, stream, and clock evidence. It reports slots crossed while waiting as `late-skipped`, preserves request refusals, and never sends a late catch-up burst. It checks the deadline at dispatch and lets already sent requests finish during a bounded drain. Compare actual dispatches, acknowledgments and scheduled slots for each player. A warmup request dispatched during measurement is reported separately and cannot fill a measured slot. The five-minute runner exits unsuccessfully if any scheduled move is skipped or refused. A successful short rehearsal covers basic connected activity. The full operating gate also requires speed, delivery, browser presentation, and late NPC activity evidence.

If the dense meadow cannot finish cold activation, the optional `districts` argument selects four neighborhoods with the same total roster, native work and object counts. Each neighborhood has 25 people and 25 animals. The initial horizontal candidate count within 28 metres averages about 23 other people and 24 animals per human in the four neighborhoods, compared with about 70 and 67 in the dense opening. These counts are before sight and occlusion checks. Report the less-overlapping case under its own workload name.

```sh
node --import tsx scripts/performance/witness-sustained.ts crowd 25 8 "$RUN_ROOT/crowd-25-districts" \
  "$RUST_SERVER" "$LANGUAGE_DIR" "$BROWSER_BUILD" "$DRIVER_ARCHIVE" districts
```

## Connected rehearsal on the base Rust build

The original November 25 local rehearsal used Rust source `4c0aa405c0c2c744f81f3a38a4ccdd6bc98282b7`, executable SHA-256 `811ab75e872ae7145d655f428db868bdb4adf32f8c509df440b841cede3ece1e`, and disposable PostgreSQL 14.17 databases. The normal cases used 16 measured seconds and the crowd cases used 12. These are activity checks. The integrated performance runs belong on the standard worker.

| Opening                        | Measured moves accepted / scheduled | Streams delivering patches | Players / NPCs / animals with saved placement changes | Outcome                                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------: | -------------------------: | ----------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exact Main, 1 player           |                             16 / 16 |                          1 |                                            1 / 0 / 18 | All 16 move receipts and three speech receipts were visible in the database before shutdown.                                                                                                                                          |
| Main with 24 added visitors    |                           400 / 400 |                         25 |                                           25 / 0 / 18 | A changed position reached every stream. The final read found 388 measured move receipts and all three speech receipts.                                                                                                               |
| Dense meadow, 1 player         |                                   — |                          — |                                                     — | The listener started and the signed stream attached. The native writer refused to save perception before the measured phase.                                                                                                          |
| Dense meadow, 25 players       |                           300 / 300 |                         25 |                                          25 / 75 / 79 | The final read found 250 measured move receipts. All 25 streams saw a position change overall. The clock did not advance during the measured window and only four moves could be matched to a changed stream position in that window. |
| Four neighborhoods, 1 player   |                              9 / 12 |                          1 |                                          1 / 99 / 100 | Movement reached the stream and the ordinary saves. Three measured offers were skipped. A repeat exited at the native recording byte allowance.                                                                                       |
| Four neighborhoods, 25 players |                            39 / 300 |                         25 |                                         25 / 75 / 100 | Every player had at least one move accepted and saved. The server exited after the current perception recording cohort exceeded its native byte allowance.                                                                            |

Both Main runs held six local model requests, completed zero model exchanges and incurred zero external spend. Every started database in the table was removed. The database observations show ordinary committed saves. If the server exited, the final observation reads the saved prefix it left behind. The dense one-player failure came from `Perception save requires complete current ownership and allowance.` The four-neighborhood 25-player failure reported `Current recording cohort exceeds native byte allowance.` Keep these failed cases in the evidence. The source and results belong to the rehearsal and do not establish five-minute capacity.

The reviewed collector was checked against the same Rust executable. A one-player Main run accepted 8 of 8 measured moves. The 25-player Main run accepted 269 of 300 measured moves. Every tab in both runs received measured patches and an action-correlated movement update, and the game saved all three speech commands in each run. A follow-up eight-second Main run confirmed that all eight dispatched moves reached the stream and had accepted receipts in ordinary saves. An intentional stop before the second scheduled database snapshot preserved the first snapshot and partial command evidence. Full-window clock estimates and bounds were unavailable on that stop. These local checks confirm the reporting paths. Integrated capacity evidence remains open.

## Game speed and accumulated delay

Use the runner's `start`, `end`, `progress` and `health` observations. The primary signed player's stream supplies the most recently received game clock at the start, at each ten-second boundary and at the cutoff. Keep the receipt timestamp, sample age, configured speed, pauses and navigation preparation. The runner also uses the signed Inspect account to read `GET /api/performance` at the start, each minute and the scheduled end. Inspect samples the live game clock after request dispatch and also reports pauses and save failures. Keep its dispatch and receipt timestamps and any errors so delayed or failed reads remain visible. [Rust performance status](../../native/game-server/src/player_http/operations/performance.rs)

At any checkpoint, intended progress is `60 × elapsed wall seconds` at 1×. The difference between the two received stream times estimates completed game seconds. Dividing completed by intended gives the speed fraction. Subtract completed from intended for accumulated delay in game seconds, or divide that delay by 60 for equivalent real seconds at 1×. The report retains this stream estimate as `streamObservedFraction` and the delay trajectory as `streamObservedShortfallGameSeconds`. Keep the signed values and sample ages. A stale opening update can make stream progress look better than the progress during the measurement itself.

Use `fractionBounds` for the full-window 98% progress check. The runner pairs the stream clock received by the end with the Inspect clock read after the start to find a lower bound. It pairs the Inspect clock read after the end with the stream clock received by the start to find an upper bound. This relies on game time moving only forward in the freshly started fixture. The lower bound must reach 0.98 to establish the progress floor. An upper bound below 0.98 demonstrates a miss. If the available bounds establish neither outcome, report the floor as unverified. An early exit leaves both the full-window stream estimate and the bounds unavailable. Exactly 300 real seconds offers 18,000 game seconds and requires at least 17,640 for the floor. Separately examine the delay trajectory and sample ages for persistent growth. Unexpected pauses and technical holds stay in elapsed time. [Qualification conditions](../../docs/projects/attention-and-scenes-runtime-design.md#102-measurements-and-pass-conditions)

The clean signed caller measures externally observed delay. The Rust timer's private queued debt is unavailable through both the stream and `/api/performance`. If timer attribution is needed, use a separately labeled recorder-enabled run on an equivalent build with `S02.01.offered`, `S02.10` and `S02.01.discarded`, sampling every observation. The difference between their game-microsecond totals estimates debt change across the recorder window when observations are complete. Absolute debt requires a known starting value and aligned samples, and discarded debt can differ from the external delay. Retain recorder losses and boundary uncertainty. [Clock accounting](../../native/game-server/src/game_clock.rs) · [Recorder instructions](../../docs/maintainers/performance-profiling.md#stand-alone-rust-campaigns)

## Movement, streams, and ordinary saves

- Read the `players` evidence. `measured` on a command means its actual dispatch was inside the measured window. `scheduledInWindow` records where its intended slot fell. Keep HTTP return time and outcome independently. `acknowledgedBeforeCutoff` identifies successful replies received within the window. Some requests dispatched in the window may be acknowledged during drain. Match the first authorized stream update that changes the same actor's position to the accepted action ID or its reached destination. End the association at the actor's next dispatched move or at the measured cutoff. Omit an ambiguous or missing match from the distribution and count it explicitly. The same actor may still be following a previous route. Record dispatches, successful replies, matched and unmatched positions, stream disconnects, and per-player updates and bytes. Report count, p50, mean, p95, p99 and worst for each measured latency.
- Read the runner's `activity` evidence, including durable observations from an independent PostgreSQL connection. The final saved clock, roster observations, and scoped command receipts come from one repeatable-read snapshot. A higher `world_head.revision` proves a new committed save prefix. `durableBeforeShutdown` indicates that the command has a saved receipt in the snapshot. `savedAccepted` records whether the game saved an acceptance or a refusal, independently of the HTTP reply. Leave the ordinary one-second background save schedule in effect. Record timestamps, save failures and saved acceptance counts. A revision can include multiple changes. The final snapshot comes after the load generator drains. Record whether the server was still running. Earlier successful snapshots remain in the report if a later scheduled read is interrupted. Exact cutoff durability and per-command durability latency require their own timed observations. [Ordinary save schedule](../../native/game-server/src/live_save.rs) · [Transactional save](../../native/game-server/src/store/write.rs)
- Use each actor's saved placement changes and native animal behavior changes to count activity. Membership and passive history entries do not establish that an actor moved. Compare initial and final counts and the saved placement revisions captured at the end of warmup and 30 seconds before the end of a five-minute run. A placement revision can advance even when the route returns to its starting point. The report identifies actors whose placement advanced after the last saved cut, which is near the end in five-minute runs. Record failures and who actually acted. The saved roster measures population, and saved changes measure activity.

Extract the observations and movement latency distribution from a completed run using `jq`:

```sh
jq '{progress, health, coverage, speech, activity,
     players: [.players[]? | {actorId, measured, measuredPatchFrames, streamObservedPositionChange, stream}]}' "$RUN/result.json"

jq '
  def distribution:
    sort as $s | length as $n |
    if $n == 0 then {count: 0}
    else {count: $n, p50: $s[(($n * 0.50 | ceil) - 1)],
          average: (add / $n), p95: $s[(($n * 0.95 | ceil) - 1)],
          p99: $s[(($n * 0.99 | ceil) - 1)], worst: $s[-1]} end;
  [.players[]?.commands[] | select(.measured and .ok)] as $moves |
  {accepted: ($moves | length),
   acknowledgedBeforeCutoff: ($moves | map(select(.acknowledgedBeforeCutoff)) | length),
   missingConfirmedStreamMovement: ($moves | map(select(.firstStreamMovementMs == null)) | length),
   commandResponseMs: ($moves | map(.commandResponseMs) | distribution),
   matchedStreamMovementMs: ($moves | map(.firstStreamMovementMs // empty) | distribution)}
' "$RUN/result.json"
```

## Browser presentation

The scripted authorized streams measure when the player process first receives a changed position. Browser application, interpolation, rendering and physical display are outside that measurement. Keep browser movement fields unavailable in a headless report. The existing graphical driver can record `clickToAuthoritativeSceneMs` and `clickToDisplayedMotionMs` for eligible moves which began stationary and had no earlier pending movement. Browser scene timing still ends inside the browser. [Graphical collector](profile-browser.mjs)

For a browser companion, serve the integrated browser bundle from the same integrated Rust release with the equivalent disposable opening. Have a browser-controlled player replace one scripted controller. Give that browser its own signed session and embodiment, keep the other 24 controllers and streams active for the 25-player condition, and verify their offered and accepted input rates through the companion window. Use actual ground clicks and retain the browser's authoritative coordinate and first displayed-motion time. Align the browser clock and the workload start, and record motion misses, console failures, frame gaps and commands from an already moving player separately. Use authoritative movement for confirmation, and record first displayed motion and predicted movement separately where available. Run this companion separately from clean CPU timings and verify the production browser bundle loaded.

The existing graphical driver defaults to a historical single-browser fixture and specifically selects the 3× radio before resuming. The browser companion requires adapting it to the workload's browser-owned controller, selecting and verifying 1×, and synchronizing the private start marker with the other controllers. Its CLI for that adapted companion takes the loopback PostgreSQL ready manifest and a new report path. The ready manifest supplies `url`, `databaseAdapter: "postgres"`, `startMarkerPath` and `outputPath`.

```sh
node scripts/performance/profile-browser.mjs "$READY_JSON" "$NEW_BROWSER_REPORT" 300 --app-profiling=on
```

Leave CPU sampling and browser traces off in this five-minute companion. If a browser replacement cannot be run, publish stream-receipt latency and leave the browser movement check unverified. [Browser procedure](../../docs/maintainers/performance-profiling.md#browser-frames-and-actual-walking) · [Movement targets](../../docs/maintainers/performance.md#acceptance-budgets)

## Server and PostgreSQL CPU and memory

Use the runner's `resources` evidence when the managed Linux worker supplies separate counters for the entire Rust process and the exclusive PostgreSQL cluster. The worker sets `OPENLEGEND_JOB_POSTGRES_OWNERSHIP` to its PostgreSQL ownership receipt. The runner checks the source and database receipts against the supervisor's case and actual loopback endpoint before enabling resource accounting. Without valid ownership it reports resource accounting unavailable and still collects connected gameplay evidence. Take resource cuts at the same measured start and end used for the workload so the deltas cover steady play. Each sample records both its scheduled and observed time. Missed or failed cuts stay visible. Only calculate the whole-window CPU figures when both boundary samples exist. Count the Rust process and every thread once. Keep the load generator, browser and provider counters separate. An individually disposable database in a shared PostgreSQL cluster is sufficient for correctness rehearsal, while exclusive PostgreSQL CPU requires an independently owned cluster. Neither a single backend PID nor SQL statement durations cover cluster CPU. [Worker resource controls](../../docs/maintainers/performance-profiling.md#stand-alone-rust-campaigns)

On a Linux worker with separate, verified cgroup v2 ownership for the game server and PostgreSQL, read both groups at the boundaries and at the same cadence throughout the measurement. If the case's group includes both the driver and server, use whole-process server counters from the existing worker collector instead of the shared group. Once per second is enough to label a sampled peak, with the cadence reported. Retain server RSS from `/proc/$SERVER_PID/status` alongside the PostgreSQL group's `memory.current`, matching the existing collector's scopes. For optional separate-group samples, use the following reads with the actual task-owned paths and PID:

```sh
awk '$1 == "usage_usec" { print $2 }' "$SERVER_CGROUP/cpu.stat"
awk '$1 == "usage_usec" { print $2 }' "$POSTGRES_CGROUP/cpu.stat"
awk '$1 == "VmRSS:" { print $2 * 1024 }' "/proc/$SERVER_PID/status"
cat "$POSTGRES_CGROUP/memory.current"
```

For the built-in sampler, divide the server’s `application.cpuTicks` delta by `resources.ticksPerSecond`, and the `postgres.cpuMicroseconds` delta by one million. Divide each resulting CPU-second count by the actual wall seconds between these samples, then multiply by 100. This expresses usage as a percentage of one logical core. For memory, report start, end and the sampled peak of both scopes. Add values from the same timestamp for simultaneous memory, keeping server RSS and PostgreSQL group memory labeled, because group memory can include charged file cache. Report engine memory reservation peaks separately from operating-system memory. Keep setup, warmup, shutdown, and whole-process lifetime resource summaries out of the five-minute figures. [Resource definitions](../../docs/performance/measurement.md#reporting-results)

```sh
jq '
  . as $run | .resources as $r | $r.samples as $s |
  if ($s | length) < 2 or $s[0].scheduledAt != $run.start or $s[-1].scheduledAt != $run.end
    or $run.progress.earlyClientEnd then null
  else (($s[-1].at - $s[0].at) / 1000) as $wall |
  {sampleCount: ($s | length), actualSampledSeconds: $wall,
   serverPercentOfOneCore: (100 * ($s[-1].application.cpuTicks - $s[0].application.cpuTicks) / $r.ticksPerSecond / $wall),
   postgresPercentOfOneCore: (100 * ($s[-1].postgres.cpuMicroseconds - $s[0].postgres.cpuMicroseconds) / 1000000 / $wall),
   serverSampledPeakBytes: ($s | map(.application.rss) | max),
   postgresSampledPeakBytes: ($s | map(.postgres.memoryBytes) | max),
   concurrentSampledPeakBytes: ($s | map(.concurrentServerPostgresBytes) | max)}
  end
' "$RUN/result.json"
```
