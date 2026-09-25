# Native stress profiling

Run disposable, deterministic scenarios through the existing native profiler. This tool never connects to a database or provider, changes a live save, or enables new gameplay mechanics. It is a performance experiment, not an automated correctness test. [Performance tracker](performance.md) owns remaining work; [Verification](../verification.md) owns measured evidence.

## Primary performance baseline

**Use the full PostgreSQL-backed server as the primary production-performance baseline.** Include the real timer, command admission and durable acknowledgement, history projection, SSE, and representative cognition/maintenance load with paid dispatch disabled. Record database version/topology, actual workload, cold versus warm behavior, achieved simulation speed, debt, latency and memory. Native-only profiles remain useful for isolating engine CPU costs, but do not establish whole-server capacity.

SQLite is the local-development fallback. Retain correctness, recovery and lightweight local usability checks, but stop SQLite-specific optimization unless the owner explicitly prioritizes a local-development blocker. The existing SQLite worker is not a production-scaling improvement. Shared native/history optimizations apply to both adapters; their production benefit must be measured on PostgreSQL rather than inferred from SQLite timings.

The full-server script below currently forces disposable SQLite. It is a secondary local benchmark, not the primary baseline, and changing environment variables alone does not turn it into a PostgreSQL run. Extending profiling to an explicitly isolated disposable PostgreSQL database remains PF00 work; never point destructive fixture setup at a live database. The PostgreSQL history-only comparison is repository-path evidence, not full-server qualification. Use the existing [PF00/PF11 tasks](performance.md) for remaining implementation and acceptance; this policy change does not complete those tasks.

## Native CPU isolation

```sh
node --import tsx scripts/stress-native.ts scripts/performance/scenarios/gems.json /tmp/gems.cpuprofile > /tmp/gems-report.json
node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed.json /tmp/mixed.cpuprofile > /tmp/mixed-report.json
```

Use a new output path per run. CPU profiles may contain local paths; keep profiles, reports and private input saves outside version control. Open `.cpuprofile` in a compatible CPU-profile viewer. Stderr reports loading/setup, warm-up, measured steps and output stages. A hard parent-process timeout covers setup as well as simulation; timeout exits with code 124 and is an incomplete result, never a capacity pass. A killed run may have no usable CPU profile or report.

Copy an example JSON and configure:

| Field               | Meaning                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `input`             | Optional SavedWorld or `backup-world.ts` materialized backup; relative to the scenario file. Omit for a seed world. Input is read only.                                                    |
| `seed`              | Default 73; initializes a new world and deterministic placement shuffle. An input save retains its own gameplay RNG.                                                                       |
| `people`, `animals` | Additional people and deer, admitted through real spawn transitions; default zero. Fail explicitly if the map lacks free walkable tiles.                                                   |
| `layout`            | `crowded`: nearest walkable tiles around the player; objects use the nearest nine tiles. `scattered`: seeded shuffle across available walkable tiles. A small map still limits separation. |
| `objects`           | Groups with `count`, `name`, `properties`, optional `nutrition`, `quantity` (default 1), and `workSeconds` (default 1).                                                                    |
| `steps`, `warmup`   | Measured native one-second steps (default 180) and excluded warm-up steps (default 30). Use warmup 0 to include first encounters.                                                          |
| `speed`             | Requested multiplier used only to calculate native capacity headroom; default 1, maximum 100. This is not a real-time scheduler run.                                                       |
| `timeoutSeconds`    | Hard run deadline, default 60, maximum 600. Total added population is capped at 10,000.                                                                                                    |

Objects are synthetic resource entities with independent IDs, not stacks hidden inside one entity. Thus 500 gems means 500 ground objects. Objects can share tiles; people and animals obey spawn occupancy. Properties are limited to the domain's material vocabulary: fiber, binding, flexible, rigid, shaft, pouch, point, projectile, food and fuel. Names such as “rare gem” are descriptive; rarity, market value and autonomous attraction are not invented by this harness. Food nutrition is real item metadata, but native urgent foraging currently selects berry resources specifically. Custom resource setup is isolated fixture construction, not a production authoring API.

Reports include setup/initial-freeze cost, native step percentiles, total measured time, process CPU time, final heap usage, event/awareness counts, final-world digest and hot CPU functions. Headroom divides measured native throughput by `60 × speed`: values below 1 cannot sustain that rate even before persistence and other server work. Values above 1 do not prove end-to-end capacity. Compare identical input, scenario, warm-up, Node version and machine load; repeat runs rather than relying on one tail percentile. Digests compare native final state only, not all intermediate outcomes.

This first version excludes real-time clock debt, database commits, browser frames, cognition admission/context preparation and paid model calls. Use the running server's `/api/performance` for tick/debt and cognition spans. Long history, constrained cognition capacity and dense encounter fan-out remain distinct workloads; do not treat a successful gem scenario as 100-agent qualification.

## Full-server workload

**Secondary local benchmark:** run a generated, disposable scene through the real server timer, SQLite, SSE and a separate-process client. See the [primary baseline](#primary-performance-baseline) before using these results to prioritize production work.

```sh
pnpm run build
node --import tsx scripts/performance/profile-server.mjs scripts/performance/scenarios/mixed.json /tmp/openlegend-server-report.json 15 1,3,8
```

The output path must be new. The duration accepts 5–60 seconds per phase; supported requested speeds are 1, 3 and 8. An optional final argument sets the command interval to 25–1,000 ms (default 500); `... 60 1 25` requests a one-minute high-command-count run, and `... 30 8 25` a shorter accelerated run. Report successful counts and rejected/skipped requests, not just the requested rate. Setup creates a private temporary data directory, populates a generated scenario with the timer disabled, then restarts the same world for actual timed measurement. User-save inputs are rejected. The profiler removes only its own temporary directory and disables all paid dispatch. It is not a PostgreSQL, browser, hosted-player or live-cognition benchmark.

A separate process reads state at 4 Hz, submits short move/cancel intentions at the selected interval (2 Hz by default), consumes SSE, and sends presence heartbeats every 3 seconds. Each request lane has bounded concurrency. The report separates rejected requests, errors, request-scheduling lateness and skipped intervals from successful command latency; it cannot silently count an ungenerated request as success. SSE reports bytes/chunks, not browser render completion.

The first phase includes acquisition after ordinary bootstrap. Later phases reuse the evolving world and start at their recorded simulation time; do not describe these as independent identical fresh worlds. Before/after runs use the same host and scripted load, but wall-timed physics can diverge and small samples have noisy tails. Native fixed-step digest comparisons are separate evidence.

Report nominal elapsed-time achieved speed together with admitted/requested clock counters, pending debt and excluded gaps. Pending debt excludes elapsed wall time that an in-progress timer operation has not yet admitted. Existing >2-second callback-gap detection can misclassify long synchronous persistence as absence; the dense case does not qualify that boundary. Metric totals/counts are phase deltas, while `cumulativeMaxMs` is explicitly since startup. Keep initial presence-expiry runs separate from continuous-presence capacity evidence.

The short high-command-count SQLite cases and PostgreSQL history-only exercise have [recorded evidence](../verification.md#dense-persistence-implementation). Long soaks, repeated independent percentile cases, genuine multiple players, slow consumers, full PostgreSQL server, browser rendering and no-network cognition/maintenance fixtures remain PF00/PF11 acceptance work. Phase heap usage is the main JavaScript isolate, not total process memory; `rssBytes` includes resident memory across threads, and the SQLite worker reports its own sampled heap gauge. None of these phase-end values is a measured peak.
