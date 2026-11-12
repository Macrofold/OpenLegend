# Qualification and an honest capacity envelope

[Collection](README.md) · [Sources](sources.md)

## What the present evidence establishes

The repository evidence identifies a small-world representation/CPU problem and an accepted staged native-core response. It does not establish a maximum MMORPG population. External MMO counts, simple avoidance demos and configured connection limits cannot fill that gap.

The next measurement should answer a specific architectural uncertainty, not produce the largest attractive number. Reuse [NSC](../../docs/maintainers/native-simulation-core.md), [performance](../../docs/maintainers/performance.md), R12 and PD09 rather than create a parallel benchmark programme. All speed measurements use the project's authorized AWS procedure. This documentation task ran no such experiment.

## Keep the small proof complete

NSC01–NSC03 remain the immediate experiment: equivalent movement/action progression, reception, attention/history, actual permitted consumers, saving and cold restoration, then bounded multicore execution. Preserve identical installed behavior and actual useful progress across comparison arms.

Include native/Node CPU, bridge work, copies, allocations, output preparation, persistence, queues and rejected candidates. Separately report the critical serial path. A nearly idle Node main thread after transferring work to Rust is not proof that total CPU or latency improved.

Include tiny workloads where scheduling overhead can lose, independent workloads where parallelism should help, and coupled workloads where it may not. Record adopt, reject or inconclusive under preselected criteria. Do not expand the port on the strength of an isolated arithmetic loop.

## Grow independent dimensions deliberately

A capacity profile should record at least connected humans, active human inputs, NPC/activity mix, occupied locations, density, effect reach, simulation-time rate, geometry size, mutable objects, history age, actual recipients, provider demand and supported client class. A single total-entity number is insufficient.

Use a small set of connected scenarios rather than every possible combination:

- **Dispersed exploration:** increase independently active areas while holding local density roughly fixed. Include terrain/navigation residency and autonomous residents, not empty bots standing in featureless space.
- **Concentrated encounter:** increase people and NPCs in one meaningful scene, then vary visibility/effect reach and interaction intensity. Report useful accepted participants, not merely open sockets or people queued away.
- **Boundaries and nonlocal dependencies:** move through ownership edges, include large bodies and supported long-range/shared-resource work, and compare with the same activity away from a boundary.
- **Old world, same active scene:** independently grow saved history and dormant geography. Measure routine play, correction/forgetting, cold reads, restart and first useful return.
- **Burst and failure:** simultaneous arrivals, reconnects, changed geometry, slow storage, provider unavailability and one noisy world competing with another. Include retained uncertain work and recovery load.

These are scenario families, not fixed compulsory population numbers. Use the smallest informative case first and expand only under a scoped, authorized run. Maintain the distinction between required correctness passes, required measurements and exploratory upper-bound searches.

## Measure what the player and world actually receive

Record action admission latency and first useful visible response separately. Record simulation progress against offered game time rather than reporting a low CPU rate achieved by falling behind. Include p95/p99 tails, starvation, longest pauses, backlog age and invalid/refused work alongside averages.

For each bottleneck record work units and amplification: candidates examined versus accepted interactions; objective preparation versus recipient-specific work; logical changes versus persisted rows/bytes; received evidence versus retained support; eligible cognition versus dispatched useful decisions. Conservative fallbacks and unclassified dependencies need visible counts.

Memory measurements include live state, scratch, indexes, in-flight snapshots, cold-read caches and retained queue objects. Storage measurements include database CPU, lock/connection waits, physical writes and maintenance. Network measurements include baseline/reconnect bursts, bytes, actual audiences and slow-client behavior. Client measurements include frame/input behavior and asset memory on the supported device class.

Prefer existing bounded source-attributed counters. Do not make per-entity high-cardinality telemetry or full tracing mandatory for normal production play.

## Why more cores are not a capacity estimate

For a fixed useful workload, elapsed time is bounded by available parallel compute, the ordered critical path and shared resource throughput. A conceptual lower bound is:

```text
elapsed time >= max(total useful CPU work / effective parallelism,
                    ordered critical-path time,
                    bytes moved / usable memory bandwidth,
                    required external dependency time)
```

The terms can overlap, and the expression omits overhead and contention; it is a diagnostic model, not a prediction. CPU work may itself increase when parallelization adds copies, synchronization or retries. Distinguish strong scaling of one scene from weak scaling by adding independent scenes.

When threads stop helping, investigate insufficient parallel work, task overhead, lock contention, false sharing, memory bandwidth, host acceptance, capture/encoding and database publication before concluding the language or entire architecture failed. Likewise, a good multicore kernel does not qualify distributed execution after network and migration costs.

## Find the feasible crowd frontier

Begin with unchanged semantics and inexpensive work removal. Next compare suitable parallel decompositions. Then evaluate explicitly selected representation/fidelity alternatives in isolation. Finally measure any admission or congestion policy as a gameplay offer, not as hidden evidence that excluded players were supported.

For every alternative, state what improved, what got cheaper, what behavior changed, which situations get worse, and what remains individual and exact. Include malicious or uncooperative player behavior. Measure transition costs into and out of the dense state, not only a stable scene.

Do not require evidence of literal impossibility before considering an alternative. The practical stopping condition is that further improvement is unlikely to justify its engineering, operating or gameplay cost under the measured bottleneck. Equally, do not declare a low cap solely because the first straightforward implementation is slow.

## Decision outputs

A valid report states the exact code/build, world definitions, hardware, enabled behavior, duration, workload and operating reserve. It reports both successful and failed scenarios and separates real provider quality from fixtures. It identifies the largest qualified envelope, not an untested interpolated promise.

Use that envelope to choose the next bounded milestone: extend working-set support, reduce recipient amplification, qualify a larger same-host scene, or start the existing distributed experiment. Population targets may remain aspirational while the next useful game slice ships. No unsupported estimate in this research becomes a contractual player cap or an implementation acceptance gate.
