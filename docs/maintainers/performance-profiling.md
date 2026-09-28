# Native and full-server profiling

The native-only profiler runs disposable deterministic scenarios without a database or provider. The full-server profiler below explicitly selects a disposable database. Neither changes a live save, enables gameplay mechanics or permits paid dispatch. These are performance experiments, not automated correctness tests. [Performance tracker](performance.md) owns remaining work; [Verification](../verification.md) owns measured evidence.

## Primary performance baseline

**Use the full PostgreSQL-backed server as the primary production-performance baseline.** Include the real timer, command admission and durable acknowledgement, history projection, SSE, and representative cognition/maintenance load with paid dispatch disabled. Record database version/topology, actual workload, cold versus warm behavior, achieved simulation speed, debt, latency and memory. Native-only profiles remain useful for isolating engine CPU costs, but do not establish whole-server capacity.

PostgreSQL is required locally and in production. All database-dependent profiling uses owned disposable PostgreSQL databases. Historical SQLite measurements remain evidence of the version exercised, not current backend acceptance.

The full-server script now accepts an explicit `OPEN_LEGEND_PROFILE_POSTGRES_URL` for a loopback development PostgreSQL service. It creates a uniquely named database for each run; it never resets or profiles the database named by that administrative URL, and never inherits `OPEN_LEGEND_DATABASE_URL`. Missing the profiling URL fails clearly. The PostgreSQL history-only comparison remains repository-path evidence, not full-server qualification. Use the existing [PF00/PF11 tasks](performance.md) and [AR integration tracker](action-reconciliation.md) for remaining work; a working profiler does not complete capacity acceptance.

## Native CPU isolation

```sh
node --import tsx scripts/stress-native.ts scripts/performance/scenarios/gems.json /tmp/gems.cpuprofile > /tmp/gems-report.json
node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed.json /tmp/mixed.cpuprofile > /tmp/mixed-report.json
```

Use a new output path per run. CPU profiles may contain local paths; keep profiles, reports and private input saves outside version control. Open `.cpuprofile` in a compatible CPU-profile viewer. Stderr reports loading/setup, warm-up, measured calls and output stages. A hard parent-process timeout covers setup as well as simulation; timeout exits with code 124 and is an incomplete result, never a capacity pass. A killed run may have no usable CPU profile or report.

Copy an example JSON and configure:

| Field               | Meaning                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `input`             | Optional SavedWorld or `backup-world.ts` materialized backup; relative to the scenario file. Omit for a seed world. Input is read only.                                                    |
| `seed`              | Default 73; initializes a new world and deterministic placement shuffle. An input save retains its own gameplay RNG.                                                                       |
| `people`, `animals` | Additional people and deer, admitted through real spawn transitions; default zero. Fail explicitly if the map lacks free walkable tiles.                                                   |
| `layout`            | `crowded`: nearest walkable tiles around the player; objects use the nearest nine tiles. `scattered`: seeded shuffle across available walkable tiles. A small map still limits separation. |
| `objects`           | Groups with `count`, `name`, `properties`, optional `nutrition`, `quantity` (default 1), and `workSeconds` (default 1).                                                                    |
| `steps`, `warmup`   | Measured integration calls (default 180) and excluded warm-up calls (default 30). Use warmup 0 to include first encounters.                                                                |
| `intervalSeconds`   | Maximum offered game seconds per call (default 1); use 60 to exercise sparse integration. Actual accepted time can be shorter at a boundary or zero when navigation is pending.            |
| `speed`             | Requested multiplier used only to calculate native capacity headroom; default 1, maximum 100. This is not a real-time scheduler run.                                                       |
| `timeoutSeconds`    | Hard run deadline, default 60, maximum 600. Total added population is capped at 10,000.                                                                                                    |

Objects are synthetic resource entities with independent IDs, not stacks hidden inside one entity. Thus 500 gems means 500 ground objects. Objects can share tiles; people and animals obey spawn occupancy. Properties are limited to the domain's material vocabulary: fiber, binding, flexible, rigid, shaft, pouch, point, projectile, food and fuel. Names such as “rare gem” are descriptive; rarity, market value and autonomous attraction are not invented by this harness. Food nutrition is real item metadata, but native urgent foraging currently selects berry resources specifically. Custom resource setup is isolated fixture construction, not a production authoring API.

Reports include setup/initial-freeze cost, execution mode, interval counts/sizes, native slice percentiles (one-second steps in the reference mode), total measured time, process CPU time, final heap usage, event/awareness counts, final-world digest and hot CPU functions. Headroom divides measured native throughput by `60 × speed`: values below 1 cannot sustain that rate even before persistence and other server work. Values above 1 do not prove end-to-end capacity. Compare identical input, scenario, warm-up, Node version and machine load; repeat runs rather than relying on one tail percentile. Digests compare native final state only, not all intermediate outcomes.

This first version excludes real-time clock debt, database commits, browser frames, cognition admission/context preparation and paid model calls. Use the running server's `/api/performance` for tick/debt and cognition spans. Long history, constrained cognition capacity and dense encounter fan-out remain distinct workloads; do not treat a successful gem scenario as 100-agent qualification.

## Actual progress and pending navigation

The profiler initializes the shared collision adapter before constructing/loading a world. Reports distinguish requested steps, attempted steps, completed steps and actual `simulatedSeconds`. A no-progress native call stops the measured loop with `status: blocked`; throughput/headroom use actual world-time progress, never requested iterations. This script does not run the navigation coordinator: a pending derived route requires the running-server diagnostic. Re-run on the same snapshot/seed for comparisons. CPU profiling adds instrumentation overhead, so the capacity gate remains an unprofiled full-server measurement.

For cadence comparisons, record offered and actually integrated game seconds, interval count and input state. Equal call counts do not mean equal simulated work. A one-second diagnostic remains useful as a numerical reference but is not the production clock contract. See [PF13](simulation-time.md) and [cadence evidence](../verification/simulation-cadence.md).

## Full-server workload

Run a generated disposable scene through the real server timer, durable commands, SSE and a separate-process client. Set `OPEN_LEGEND_PROFILE_POSTGRES_URL` to a loopback administrative database.

```sh
pnpm run build
node --import tsx scripts/performance/profile-server.mjs scripts/performance/scenarios/mixed.json /tmp/openlegend-server-report.json 15 1,3,8
```

For PostgreSQL, use a disposable loopback service with `pgvector` installed and a role allowed to create databases and install the extension. For example, against a local service you already started:

```sh
OPEN_LEGEND_PROFILE_POSTGRES_URL='postgres://review:review@127.0.0.1:5432/postgres' \
  node --import tsx scripts/performance/profile-server.mjs scripts/performance/scenarios/mixed.json /tmp/openlegend-postgres-report.json 15 1,3 25
```

The example credentials are for a disposable local service, not production. Only PostgreSQL URLs with host `127.0.0.1`, `localhost` or `[::1]`, without query/fragment overrides, are accepted. The helper creates `openlegend_profile_<random-id>`, runs both setup and restarted measurement on that database, then drops only that successfully created database. It never force-drops databases or terminates other sessions. The report identifies the adapter, loopback topology, server version and generated database name without storing the administrative URL or password. A failed cleanup is a nonzero result; the generated name identifies any resource requiring manual inspection. Remote topology benchmarking needs a separately reviewed safe fixture mechanism, not bypassing this guard.

The profiler retains its own store through server startup so a failed initialization can close the connection/worker even before `createGameServer` returns a server handle. This does not fix the general factory's ownership gap for other callers; [AR07](action-reconciliation.md) remains separate. The current adapter initializes vector storage even when inference is disabled: plain PostgreSQL without `pgvector` is an initialization-failure workload, not a gameplay performance result. Keep a hard external deadline for manual profiling because native CPU work or broader shutdown failures can still prevent timely completion.

The output path must be new. The duration accepts 5–60 seconds per phase; supported requested speeds are 1, 3 and 8. An optional final argument sets the command interval to 25–1,000 ms (default 500); `... 60 1 25` requests a one-minute high-command-count run, and `... 30 8 25` a shorter accelerated run. Report successful counts and rejected/skipped requests, not just the requested rate. Setup creates a private temporary data directory, populates a generated scenario with the timer disabled, then restarts the same world for actual timed measurement. User-save inputs are rejected. The profiler removes only its own temporary directory and disables all paid dispatch. PostgreSQL mode exercises that real adapter; neither mode qualifies browser rendering, hosted multiplayer or live cognition.

A separate process reads state at 4 Hz, submits short move/cancel intentions at the selected interval (2 Hz by default), consumes SSE, and sends presence heartbeats every 3 seconds. Each request lane has bounded concurrency. The report separates rejected requests, errors, request-scheduling lateness and skipped intervals from successful command latency; it cannot silently count an ungenerated request as success. SSE reports bytes/chunks, not browser render completion.

The first phase includes acquisition after ordinary bootstrap. Later phases reuse the evolving world and start at their recorded simulation time; do not describe these as independent identical fresh worlds. Before/after runs use the same host and scripted load, but wall-timed physics can diverge and small samples have noisy tails. Native fixed-step digest comparisons are separate evidence.

Report nominal elapsed-time achieved speed together with admitted/requested clock counters, pending debt and excluded gaps. Pending debt excludes elapsed wall time that an in-progress timer operation has not yet admitted. Existing >2-second callback-gap detection can misclassify long synchronous persistence as absence; the dense case does not qualify that boundary. Metric totals/counts are phase deltas, while `cumulativeMaxMs` is explicitly since startup. Keep initial presence-expiry runs separate from continuous-presence capacity evidence.

The short high-command-count SQLite cases and PostgreSQL history-only exercise have [recorded evidence](../verification/integration-summaries.md#dense-persistence-implementation). The [action reconciliation observations](../verification/action-reconciliation.md) separately record current-source full-server PostgreSQL diagnostics and their failed throughput/dense-tail targets. Long soaks, repeated independent percentile cases, genuine multiple players, slow consumers, remote database topology, browser rendering and no-network cognition/maintenance fixtures remain PF00/PF11 acceptance work. Phase heap usage is the main JavaScript isolate, not total process memory; `rssBytes` includes resident memory across threads. None of these phase-end values is a measured peak.

## Contact candidate isolation

`createPerceptionFrame` builds its optional physical-contact grid from current maximum body radius/height rather than the 28-unit vision cell size. The query still includes conservative horizontal and vertical body extent, preserves source order and performs the unchanged exact overlap/barrier checks. No contact count, physical range or sensory authority is reduced. Frame construction still samples the world; this is not a persistent regional index or a fix for general million-player scaling.

Compare matched generated worlds with contact explicitly granted, fixed native steps and ordered contact/event/final-world digests before discussing throughput. The bundled default senses are sight/hearing, so a contact-only improvement cannot explain speed changes in an ordinary sight-only PostgreSQL workload. Dense coincident bodies still require proportional legitimate contact work. The [recorded contact experiment](../verification/action-reconciliation.md#physical-contact-candidate-experiment) reports isolated timings separately from database and real-timer measurements; existing [physical contact coverage](TODO.md#physical-contact-correction) remains deferred.

For accelerated-play qualification, copy a scenario outside the repository and set `execution` to `native-slice`, `speed` to `8`, and `steps` to a representative sustained duration (for example 2400). Compare it with `single-step` on the same scenario and acquisition policy. The profiler measures actual consumed simulated time and fails on non-progress; it never assumes every invocation advances the requested duration. A native-slice result still excludes server scheduling, persistence and rendering.

## Hearing with the actual server and disk

```sh
node --import tsx scripts/stress-hearing.ts /tmp/hearing-run-unique 60 10 8
```

Set `OPENLEGEND_STRESS_DATABASE_URL` to a loopback administrative PostgreSQL database for `stress-hearing.ts`, `stress-data.ts`, `stress-world-data.ts`, `stress-checkpoints.ts` and `profile-server.ts`. These tools create a fresh owned database and drop it on exit; the URL’s named database is never reset. Checkpoint/report output remains available for inspection.

The output directory must not exist; its parent must exist. Arguments are wall seconds (1–120), added people (0–100), and scheduled speech per real second (0–20). The fixed seed-73 fixture also adds 20 animals and 300 objects. It constructs the real WorldService with an owned disposable PostgreSQL world and zero provider budget, runs at 8×, keeps presence alive, commits alternating whisper/normal/shout, and generates/encodes complete public views. It neither loads `.env` nor opens an existing game database. The setup population is outside the measured interval. Invalid/unavailable speech aborts the run rather than being counted as accepted.

`report.json` records scheduled versus accepted utterances, actual wall/simulation time, final clock debt, native/SQL metrics, commit/projection distributions, view bytes and final heap. The final drain and flush count toward wall time. Native catch-up and the speech producer run independently, with at most one speech request in flight; overload still appears as lateness or unattempted demand. A drained queue alone is not a pass. Check both achieved speed and accepted work. Output snapshots/profile data remain private and untracked. This runner has bounded inputs, not a parent-process hard timeout; use an external process deadline for hostile or pathological workloads.

This is a service/persistence workload with an independently scheduled bounded speech producer, not a full graphical client, live AI, network SSE or production PostgreSQL. Full-view JSON bytes are not actual delta traffic. Run the same fixture on the target host, include cold tails, and extend qualification with genuine concurrency before making broader capacity claims. Do not interpret `async` calls or zero storage errors as proof of frame-time responsiveness.

## Full-server scene profiler

`node --expose-gc --import tsx scripts/profile-server.ts /tmp/NEW-scene-report.json 30` runs a disposable PostgreSQL game with real HTTP commands, presence heartbeats, SSE and the server timer at 3×. The initial player view has 20 other agents, 20 animals and 100 objects; one additional seeded animal begins outside view. Populations move naturally, so initial visibility is not a guarantee of sustained density.

For PostgreSQL, set `OPENLEGEND_STRESS_DATABASE_URL` to a **new disposable database**, then drop that database afterward. Existing OpenLegend schemas are refused before migrations. The script never loads `.env`; provider transports are local fixtures and embedding credentials are empty. `OPENLEGEND_PROFILE_COGNITION=1` exercises native-route Jev decisions with zero-cost receipts; it does not measure real model quality or latency. Otherwise spending is disabled. `OPENLEGEND_CPU_PROFILE=1` additionally writes a private CPU profile next to the report. Duration is 3–120 seconds; use an external watchdog for blocked startup/shutdown.

Compare the same Node version, fixture and host load. Read accepted/rejected commands, actual elapsed simulation, initial/final visible populations, resident history counts, cold and post-five-second publication gaps, command latency and collected heap. SQL wrapper timings include queue time; `postgres.statement` is the narrower statement span. Retained metric percentiles cover their bounded sample window. A saturated host, zero progress, rejected movement or timeout is not a passing capacity result. No automated unit/integration/browser suite is invoked.

`OPENLEGEND_PROFILE_SPEECH=1` independently offers two NPC utterances per real second, alternating whisper/normal/shout. It reports attempted, accepted and skipped offers and allows only one in-flight utterance. Stage spans of at least 3 ms are correlated with the 20 longest update gaps above 150 ms; these thresholds bound diagnostic output, not gameplay. Host CPU count/load and publication p99 supplement p95/max. Setup and pause/GC/final inspection are excluded from publication measurements; measured play includes the initial resume command and final in-flight workload drain.

Unexpected asynchronous command/speech failures and early SSE termination are counted, preserve up to ten diagnostic messages and make the run exit unsuccessfully after writing its report. Rejected gameplay outcomes remain separately visible in command/speech counts. An optional duration observer that throws is disabled without failing the gameplay operation it was timing. This is failure isolation for profiling, not suppression of authoritative storage errors.
