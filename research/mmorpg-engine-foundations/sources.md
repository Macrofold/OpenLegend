# Primary-source register

[Collection](README.md)

Reviewed for this research on November 11, 2026. Publication dates below are historical where stated; undated documentation can change. Sources establish mechanisms and reported cases, not OpenLegend benchmarks. The analytical recommendations in this collection are synthesis, not endorsements by the cited authors. No PDF-only figure or table is used as evidence.

## MMO concentration and population management

### S01 — Blizzard: Ahn'Qiraj engineering

[Engineer's Workshop: Recreating the Ahn'Qiraj War Effort](https://news.blizzard.com/en-us/article/23504702/engineers-workshop-recreating-the-ahnqiraj-war-effort).

Developer account of concentrated-player testing, communication growth, software optimization and population-management tradeoffs. Useful for hotspot and fan-out reasoning. Its historical sharding/layering behavior is not proof of current WoW internals or a way to merge OpenLegend's divergent persistent histories.

### S02 — Jagex: world capacity

[More Worlds, More Power: The Road to Greater Capacity](https://secure.runescape.com/m=news/more-worlds-more-power-the-road-to-greater-capacity?oldschool=1), August 2025.

Describes Old School RuneScape's 600 ms game cycle, worlds with many NPCs, player-capacity pressures and hardware/software work. NPC count is not a measure of cognition, memory or observation cost. Cloud plans in the article are historical plans, not independently verified current deployment.

### S03 — CCP: time dilation

[Introducing Time Dilation](https://www.eveonline.com/news/view/introducing-time-dilation-tidi), April 2011.

Explains a controlled simulation-time response to overload rather than unchecked processing delay. This is a gameplay/clock tradeoff, not additional throughput or an automatically suitable policy for OpenLegend. Historical internal bottleneck proportions are not current capacity evidence.

### S04 — ArenaNet: megaserver placement

[Introducing the Megaserver System](https://www.guildwars2.com/en-gb/news/introducing-the-megaserver-system/), April 2014.

Explains placing players into map copies using social and other affinity factors. Relevant to player placement and instance populations, but not to reconciling independently evolved terrain, ownership, NPC relationships and historical consequences.

## Relevance, simulation and parallel work

### S05 — Epic: replication graph

[Replication Graph](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine).

Describes persistent reusable relevance structures and replication lists instead of repeated actor-by-client tests. Its example of 100 connected players and about 50,000 replicated actors is not a claim about 50,000 fully cognitive NPCs. Recipient permissions and OpenLegend's personal evidence remain separate requirements.

### S06 — Wube: optimization and multicore limits

[Friday Facts 421: Optimizations 2.0](https://www.factorio.com/blog/post/fff-421), July 26, 2024.

Reports inactive-object work removal, shared registrations, successful parallel control-behavior evaluation and a memory-bandwidth-limited electric-network experiment. Several changes also simplified useful player configurations. The comparison supports workload-specific decomposition and reusable operations, not a general claim for or against multicore execution. Reported gains belong to Wube's workloads, not OpenLegend.

### S07 — Wube: nonlocal dependencies

[Friday Facts 151](https://www.factorio.com/blog/post/fff-151), August 2016.

Discusses challenges for dividing simulation work, including dependencies that do not respect simple geographical separation. Use as a historical design caution, not a claim about the present game's complete architecture or an argument against all parallel simulation.

### S08 — Box2D: simulation islands

[Simulation Islands](https://box2d.org/posts/2023/10/simulation-islands/), October 2023.

Explains connected constraint groups, their maintenance and sleeping behavior. Supports distinguishing local neighbour count from a coupled component. It does not prove that a large component cannot contain parallel work or that OpenLegend should adopt Box2D.

### S09 — Box2D: deterministic parallelism

[Determinism](https://box2d.org/posts/2024/08/determinism/), August 2024.

Explains how parallel completion and ordering can affect results even without data races. Relevant to stable merges and reproducible execution. Cross-platform numerical equivalence still needs an explicit scope; a library's guarantees do not automatically apply to the whole game.

### S10 — ORCA authors: reciprocal avoidance

[Optimal Reciprocal Collision Avoidance](https://gamma-web.iacs.umd.edu/ORCA/).

Primary research overview and demonstrations of reciprocal local avoidance. Its simplified movement assumptions, agent responsibilities and workload differ from a persistent multiplayer world with memory, networking and adversarial human control. This research does not select a library or establish commercial licensing suitability.

### S11 — RVO2: neighbour parameters

[RVO2 parameter documentation](https://gamma-web.iacs.umd.edu/RVO2/documentation/2.0/params.html).

Documents neighbour distance, maximum neighbours and time horizons, including safety implications of restrictive settings. Relevant to rejecting silent candidate truncation as a supposedly neutral optimization. Parameter defaults are not proposed OpenLegend limits.

## Large worlds and storage

### S12 — Epic: world partition

[World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine).

Describes grid-based streaming of world content. Content residency is distinct from authoritative simulation ownership, continuing NPC life and durable state. OpenLegend can use the distinction without replacing its renderer or adopting Unreal's implementation.

### S13 — Epic: large-world coordinates

[Large World Coordinates](https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-in-unreal-engine-5).

Describes precision changes and conversion concerns across engine systems. Relevant to a native port accidentally narrowing coordinates, and to checking local-frame, physics, navigation, persistence and rendering boundaries together. It does not prescribe one numerical layout for OpenLegend.

### S14 — PostgreSQL: isolation

[Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

Explains database snapshot and concurrency semantics. A database transaction's coherent view does not by itself include unsaved authoritative RAM or create a coherent distributed-world checkpoint. Retain the current game acceptance and save-cut owners.

### S15 — PostgreSQL: maintenance

[Routine Vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html).

Explains maintenance associated with updated/deleted row versions and recovery of reusable space. Relevant to measuring physical write and maintenance amplification, not merely serialized payload bytes. This is not a recommendation to replace PostgreSQL or run disruptive maintenance during play.

## Overload and hosting boundaries

### S16 — Google SRE: overload

[Handling Overload](https://sre.google/sre-book/handling-overload/).

Discusses admission, queueing and controlled overload responses. OpenLegend must distinguish replaceable optional work from accepted effects and mandatory privacy/accounting work. Generic load shedding does not authorize silently dropping gameplay outcomes.

### S17 — Google SRE: cascading failures

[Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/).

Explains how overload, retries and capacity loss can reinforce one another. Relevant to reconnect/rehydration storms, noisy worlds and uncertain external requests. Increasing queue sizes or blindly retrying paid work is not a capacity solution.

### S18 — AWS: GameLift lifecycle and persistent games

[How GameLift Servers works](https://docs.aws.amazon.com/gameliftservers/latest/developerguide/gamelift-howitworks.html) and [GameLift Servers FAQ](https://aws.amazon.com/gamelift/servers/faqs/).

GameLift manages server hosting/session lifecycle, not automatic partitioning of a game's simulation. The FAQ distinguishes persistent duration from managed player-session limits and discusses custom management for larger populations. Its 200-player managed-session limit must not be presented as a universal game-engine population limit.

### S19 — Agones: orchestration

[Agones overview](https://agones.dev/site/docs/overview/).

Describes orchestration of dedicated game servers on Kubernetes. Fleet allocation and process scaling remain distinct from simulation correctness, ownership transfer and one crowded encounter. No Kubernetes migration is selected by this research.

### S20 — Google Cloud: game-server churn

[Making online containerized games with managed services](https://cloud.google.com/blog/products/containers-kubernetes/making-online-containerized-games-with-managed-services).

A concrete account of game-server orchestration and lifecycle churn. Useful for separating control-plane limits from game-simulation limits. Case-study server counts are not universal cluster quotas or evidence for equivalent players inside one world.

### S21 — AWS: discontinued services

[Services that have reached full shutdown](https://docs.aws.amazon.com/general/latest/gr/full_shutdown_services.html).

The current table lists AWS SimSpace Weaver as shut down. Older spatial-simulation demonstrations may be architectural history, but the service is not a current deployment recommendation. Verify lifecycle and current terms before treating any cloud-specific mechanism as a foundation.

## Evidence limits

No reviewed source demonstrates OpenLegend's 1,000–5,000-player target with its complete semantics. External entity counts, claimed cloud fleet sizes and isolated crowd demonstrations are not transferable benchmarks. This collection does not estimate a maximum player count from another game's marketing or choose a vendor from historical prices.

Repository evidence and conversation context are recorded separately in [the coverage chapter](01-context-and-existing-coverage.md). Missing access to the implementation branch remains an explicit gap. Future measurements must identify exact code, workload, enabled behavior, hardware, time policy, latency, cost and failure envelope before supporting a capacity claim.
