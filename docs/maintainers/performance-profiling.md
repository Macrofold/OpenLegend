# Native stress profiling

Run disposable, deterministic scenarios through the existing native profiler. This tool never connects to a database or provider, changes a live save, or enables new gameplay mechanics. It is a performance experiment, not an automated correctness test. [Performance tracker](performance.md) owns remaining work; [Verification](../verification.md) owns measured evidence.

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
