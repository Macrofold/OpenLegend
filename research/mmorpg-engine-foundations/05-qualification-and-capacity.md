# Qualification and an honest capacity envelope

[Collection](README.md) · [Sources](sources.md)

## What the present evidence establishes

The repository evidence identifies a small-world representation/CPU problem and an accepted staged native-core response. It does not establish a maximum MMORPG population. External MMO counts, simple avoidance demos and configured connection limits cannot fill that gap.

Reuse [NSC](../../docs/maintainers/native-simulation-core.md), [performance](../../docs/maintainers/performance.md), R12 and PD09 rather than create another benchmark programme. All speed measurements follow the project's authorized AWS procedure. This documentation task ran no such experiment.

## Keep the small proof complete

NSC01–NSC03 remain the immediate experiment: equivalent movement/action progression, reception, attention/history, actual permitted consumers, saving and cold restoration, then bounded multicore execution. Preserve identical installed behavior and actual useful progress across comparison arms.

Include native/Node CPU, bridge work, copies, allocations, output preparation, persistence, queues and rejected candidates. Separately report the critical serial path. A nearly idle Node main thread after transferring work to Rust is not proof that total CPU or latency improved.

Include tiny workloads where scheduling overhead can lose, independent workloads where parallelism should help, and coupled workloads where it may not. Record adopt, reject or inconclusive under preselected criteria. Do not expand the port on the strength of an isolated arithmetic loop.

## Grow independent dimensions deliberately

A capacity profile records connected humans, actual human inputs, autonomous NPC decisions and native reactions separately, alongside occupied locations, density, effect reach, simulation rate, geometry, mutable objects, history age, actual recipients, provider demand and supported clients. State both the NPC mix and the interaction intensity; neither a fixed NPC-to-player ratio nor a total-entity count describes all useful play.

Use a small set of connected scenarios rather than every possible combination:

- **Dispersed exploration:** increase independently active areas while holding local density roughly fixed. Include terrain/navigation residency and autonomous residents, not empty bots in featureless space.
- **Concentrated encounter:** increase people and NPCs in one meaningful scene, then vary reach and interaction intensity. Report useful accepted participants, not merely open sockets or people queued away.
- **Boundaries and nonlocal dependencies:** include supported large bodies, shared resources and long-range work; compare the same activity away from an ownership edge.
- **Old world, same active scene:** independently grow history and dormant geography. Include ordinary play, correction/forgetting, cold reads, restart and first useful return.
- **Burst and failure:** arrivals, reconnects, changed geometry, slow storage, provider unavailability and noisy-world contention. Include retained uncertain work and recovery load.

These are scenario families, not compulsory population numbers. Use the smallest informative case first. Separate required correctness, required measurements and exploratory upper-bound searches; do not require every expansion scenario to complete the native proof.

## Measure useful play as well as useful computation

The [existing capacity contract](../../docs/product-scalability/capacity-and-economics.md#10-qualification-workloads), character/scene owners and first-playable acceptance retain quality judgment. For the selected scene, keep a concrete useful journey in the load comparison: reach and interact with someone, receive the required reaction, pursue a goal, then encounter a meaningful later consequence. Use the [crowd applications](02-scale-model-and-crowds.md#player-value-and-the-first-crowd-candidate) as candidate journeys, not a new universal playtest checklist.

An optimization that improves throughput by making residents interchangeable, preventing ordinary interaction, erasing independent choice or changing decisive outcomes is a different gameplay offer, not an equivalent-capacity pass. Record such changes explicitly and compare the resulting experience before adoption. Native correctness, human enjoyment and live-model quality are distinct evidence; none can stand in for the others. Lower-cost behavior can be a good design, but its value must be shown rather than assumed from the player count.

Record action admission and first useful visible response separately. Record actual progress against offered game time, p95/p99 tails, longest pauses, starvation, backlog age and invalid/refused work. Low CPU achieved by falling behind is not efficiency.

For attribution, compare candidates to accepted interactions; objective preparation to recipient-specific work; logical changes to persisted rows/bytes; received evidence to retained support; and eligible cognition to dispatched useful decisions. Include conservative fallbacks, unclassified dependencies, canceled/discarded preparation and detail-transition work. Count each authoritative activity once rather than simulate a shared scene per player.

Memory includes live state, scratch, indexes, in-flight captures, cold caches and queues. Storage includes database CPU, lock/connection waits, physical writes and maintenance. Network includes baseline/reconnect bursts, actual audiences and slow clients. Client evidence includes frame/input behavior and asset memory on the supported device class. Prefer existing bounded source-attributed counters over per-entity high-cardinality telemetry.

## Why more cores are not a capacity estimate

For a fixed useful workload, a conceptual lower bound is:

```text
elapsed time >= max(total useful CPU work / effective parallelism,
                    ordered critical-path time,
                    bytes moved / usable memory bandwidth,
                    required external dependency time)
```

Terms can overlap; overhead and contention are omitted. This is a diagnostic model, not a forecast. Parallelization can add copies, synchronization or retries. Distinguish strong scaling of one scene from weak scaling by adding independent scenes.

When threads stop helping, inspect available parallel work, task overhead, locks, false sharing, memory traffic, host acceptance, capture/encoding and publication before blaming the language or declaring the ambition impossible. A good same-host kernel does not qualify distributed execution after network and migration costs.

## Find the feasible crowd frontier

Compare unchanged-semantics work removal and parallel decomposition first, then explicitly selected representation or behavior alternatives. State the gain, changed behavior, worse cases and preserved individual guarantees. Include uncooperative participants, transition bursts and the cost of blocked-path recovery. Measure admission/congestion as a gameplay offer; excluded people do not count as successfully served.

Transparent geographical compute placement is an implementation option, not evidence that players must be separated. An explicit operating limit may be necessary when the quality-qualified system still exceeds its resources; it should follow measured bottlenecks and reasonable alternatives rather than the first slow implementation. Do not require proof of literal computational impossibility to ship a smaller useful milestone, or treat that milestone as the maximum ambition.

## Decision outputs

A report identifies exact code/build, world definitions, hardware, enabled behavior, duration, workload and operating reserve. Preserve failed scenarios and separate live-provider quality from fixtures. Report the largest qualified envelope, not an untested interpolation. Include full cost per useful active-player-hour and the declared unattended service where applicable.

Use that evidence to choose the next bounded investment: working-set support, less recipient amplification, a larger same-host scene or the existing distributed experiment. Population targets can remain ambitious while a smaller game ships. No research estimate becomes an advertised capacity or a new implementation gate merely by appearing in this collection.
