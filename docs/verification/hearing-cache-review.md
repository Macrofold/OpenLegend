# Hearing crowd-cache review

Verification annex for [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification), supplementing [earlier runtime evidence](../verification.md#hearing-8x-runtime-qualification). Source baseline: `f1ee3ffb799239888eb0e8e025cf4f5193e50198`, already containing main `03105fed9209c126e4e69e9faeb4687f42d1e74a` and the `fdcbd31` guidance update. This pass did not rewrite branch history or modify main.

## Implemented change

The acoustic listener cache and visual observer cache previously evicted their oldest listener on every capacity miss. Repeated round-robin scans exceeding 256 acoustic listeners or 128 visual observers could evict the entire working set on each pass. The caches now retain admitted observers and evaluate overflow observers normally without caching them. An admitted observer's changed pose, body anchor or sight radius still replaces its entry. Map identity and immutable-input requirements are unchanged. No source, recipient, sentence, geometric crossing or evidence is omitted to meet a CPU budget.

This follows the existing bounded target-cache policy instead of adding another cache framework. Memory limits are unchanged. A heavily churned population can leave cache slots held by old IDs until map replacement/collection; that affects reuse, not correctness. A different admission/aging policy remains a measured extension, not justification to drop observations.

## Stationary crowd experiment

`scripts/stress-hearing-cache.ts` constructs a deterministic seed-73 geometry fixture with 96, 300 or 600 stationary listeners, one speaker, real hearing and sight queries, five warmup passes and 60 measured passes. It performs no database, network, provider or live-save access. This is not valid spawn/collision or full-population simulation evidence. Hashing the complete result happens outside the timed query path. Node was v22.16.0.

The same script was executed in separate processes against the baseline and reviewed cache code:

| Listeners | Before median ms | Reviewed median ms | Before / reviewed p95 ms |
| --- | ---: | ---: | ---: |
| 96 | 0.650 | 0.853 | 1.359 / 1.579 |
| 300 | 2.210 | 1.140 | 4.191 / 3.067 |
| 600 | 4.635 | 2.881 | 18.527 / 4.608 |

Complete output digests matched for each population. The 300-listener digest was `3b9bf29bca1dc19d9d8a1e969dd98ce5f174a9f178b09584dda3da09791dc28f`; the 600-listener digest was `f8087c9cdea0de86df4ee506a7e5fc17431b382fc42a2afe2c5b285762dcfe0d`. Cold preparation and tail times were noisy; the below-capacity control did not improve. These samples support the identified overflow-thrashing fix, not a universal speedup or capacity guarantee.

A separate manual 300-listener exercise compared cached reads with cloned, uncached reads after source/receiver movement, body-height changes, hearing removal, ambient changes, opaque-wall installation/removal and observer deletion. All eleven snapshots matched in candidate order, acoustic exposure and sight results. The fixture exercises query invalidation, not definition admission or full gameplay. Automated coverage remains deferred under the existing SR03 and HE-T01/HE-T07 cases in [TODO](../maintainers/TODO.md).

## Independent speech demand

The previous disk-backed driver awaited an entire `tick()` catch-up before scheduling its next speech. Under native overload this reduced the actual offered speech load. The driver now has a separately scheduled producer with at most one in-flight speech command, explicit planned/attempted/unattempted/accepted counts, and scheduling-lateness measurements. It drains admitted work before closing its disposable database. One-in-flight backpressure is reported as unmet demand; it cannot establish an unlimited concurrent-producer capacity.

Fresh seed-73 runs used 344 entities: 10 added people, 20 added animals, 300 objects and the starter population. They included native simulation, actual disk SQLite commits and full public-view serialization, with a zero provider budget. The requested active window was 10 seconds at 8x and eight speech requests per real second. Final native drain and flush are included in wall time.

| Driver | Planned / accepted speech | Wall seconds | Simulated seconds | Effective speed |
| --- | ---: | ---: | ---: | ---: |
| Previous serial producer | 80 / 6 | 22.738 | 7302 | 5.352x |
| Independent producer | 80 / 80 | 23.545 | 7574 | 5.361x |

Independent-producer speech commit latency was 7.151 ms median, 10.685 ms p95 and 427.365 ms maximum. Scheduling lateness was 6.122 ms median and 448.402 ms p95, including cold-start delays. Both runs reported no storage error. Public projection was invoked after each completed tick; six projections in these overloaded runs is not a graphical frame-rate measurement. No HTTP/SSE, PlayCanvas, PostgreSQL or live model acceptance is claimed.

**The 8x whole-runtime requirement did not pass on this host.** These observations do not erase the earlier successful 60-second result on a different execution instance; they prevent treating that single result as a portable release guarantee. Receiving all planned speech is necessary but not sufficient for 8x qualification.

## Native cost investigation

The existing native stress runner advanced 2400 simulated seconds with the mixed scenario and `execution: "native-slice"`, speed 8, warmup 0. Its 607 slices took 7551.61 ms, providing 0.662 native headroom relative to 480 simulated seconds per wall second, before persistence/publication/provider costs. The final world digest was `04c2184a3571f359aef50f934593d2bdeed97c22371f45827489100373903ea9`.

Inclusive CPU samples attributed about 2147 ms to status-effect advancement, 1285 ms to encounter processing and 1139 ms to world finalization. Inclusive times overlap; do not sum them or attribute all native cost to acoustics. This supports prioritizing native status interpretation and snapshot/finalization cost through PF/SW alongside hearing, without weakening recipient or evidence rules.

An experimental read-only snapshot before each status-condition evaluation preserved the final digest but increased the run to 25921.81 ms. It was reverted completely, not committed as an optimization. More snapshots and `async` wrappers are not solutions to this CPU bottleneck.

## Reproduction and remaining gates

Use fresh output paths. The native runner has its existing parent watchdog; the disk driver duration bounds the requested input window, not a slow final catch-up/drain.

```sh
AI_BUDGET_USD=0 node --import tsx scripts/stress-hearing-cache.ts 96 300 600 > /tmp/hearing-cache.json
AI_BUDGET_USD=0 node --import tsx scripts/stress-hearing.ts /tmp/hearing-cold-run 10 10 8 > /tmp/hearing-cold-run.json
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed-8x.json /tmp/hearing-native.cpuprofile > /tmp/hearing-native.json
```

Production TypeScript, generated-status configuration checking and Vite build passed in the restored source workspace; Vite retains its large-bundle warnings. Formatting of changed runtime and profiling sources passed. No automated suites or test files were written or run, no paid provider calls were made, and normal repository CI was not changed. Baseline tests/CI are not declared green by a production-only build.

HE05/PF retain sustained 8x across independent producers and larger active populations, native cold-tail responsiveness, real graphics, PostgreSQL and live-provider qualification. Existing deferred regression coverage stays open. This review changes no hearing thresholds, physiological rates, simulation time, speech retention or historical-event policy.
