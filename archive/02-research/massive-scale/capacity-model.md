# Capacity model: turn “millions” into explicit workloads

[Research index](README.md) · All examples below are arithmetic scenarios, **not measured OpenLegend capacity, forecasts or vendor prices**. Decimal kB/GB/TB/PB are used unless stated otherwise.

## Define the population vector

Registered accounts measure neither simulation nor network load. Track DAU, peak concurrent connections, active player-hours, active worlds, humans per world, active bodies, cognition-enabled agents, eligible thinking opportunities, actual paid calls, relevant observer-source edges, simultaneous speakers and retained history. Keep peak and percentile distributions, not only averages.

Useful symbols:

| Symbol | Meaning |
|---|---|
| P | Concurrent human connections |
| W | Active authoritative worlds/owners |
| A | Resident active agents |
| C | Cognition opportunities per active agent per real second |
| F | Fraction of opportunities causing the measured paid execution class |
| R | Mean request latency in real seconds, including queueing if computing total in-flight work |
| K | Average relevant sources per observer, with tail distribution recorded separately |
| B | Authorized application bytes delivered per client per real second |
| M | Retained memory records; d is vector dimension |
| S | Simulated seconds advanced per real second |

Measure count and byte distributions for each action class. “Average NPC” conceals a quietly sleeping villager, a busy merchant, and a high-degree social coordinator. They are different workloads.

## Network arithmetic

`state egress bytes/second = P × B`

At 1,000,000 connections and an illustrative 20,000 bytes/second each: 20 GB/second, 160 Gbit/second, or **1.728 PB/day**. This excludes protocol overhead, retransmission, voice, asset downloads, new snapshots and reconnect bursts. Reducing per-client authorized traffic by a factor of four reduces this component by four; adding database replicas does not.

Decompose B into update rate, changed entities, fields changed, encoding size and subscription churn. A small steady delta can coexist with an enormous join snapshot. Quantization, delta encoding and slower cosmetic updates can help when they preserve the appropriate contract. Do not put reliable speech or ownership events into a lossy stream merely to lower B.

`projection work ≈ observers × relevant candidates × cost per exact test`, after conservative indexing. Naive scans replace relevant candidates with all entities. At high density K itself grows; indexing cannot eliminate the cost of outcomes the game genuinely requires.

## Agent compute and queue arithmetic

`paid calls/second ≈ A × C × F + player-triggered calls + background calls`

One million agents each making one call per **real** minute implies roughly **16,667 calls/second**. At four seconds mean end-to-end time, Little's-law arithmetic gives roughly **66,667 concurrent outstanding calls** in steady state. This does not imply that a provider accepts that rate or that a scheduler can sustain it. Retries, tool steps and multiple calls per decision add separately.

For input/output token counts I and O and quoted prices pI and pO per million tokens:

`cost/second = calls/second × (I×pI + O×pO) / 1,000,000`

Add attention/classification, embeddings, reasoning tokens where billed, TTS/STT, tool execution, discarded stale answers, retries and background work. Use measured distributions and actual contract prices; there is no price assumption embedded in this report.

Queue stability requires service capacity to exceed admitted arrival rate over the appropriate interval, with headroom for bursts. An unlimited queue converts overload into latency and memory growth. A strict inference budget requires explicit deferred/denied outcomes, not silent paid retries or loss of native survival behavior.

## Time acceleration is a multiplier, not a display preference

The [current performance specification](../../../docs/performance.md) describes 1× as 60 simulated seconds per real second. Under that convention, a decision once per simulated minute becomes one decision per real second, not one per real minute. A million such agents would imply a million decisions per real second before filtering or native continuation.

Likewise, six simulated hours pass in six real minutes at S=60. This arithmetic does not redefine the existing memory policy; it explains why retention, scheduling and ingestion must state their clock. An 8× speed test and an eightfold population test are not the same experiment.

`native work/real second ≈ S × work/simulated second`, only where all steps must execute. Exact event scheduling can reduce unnecessary evaluation, but cannot skip meaningful thresholds or change required perception without an accepted contract.

## Memory arithmetic

1,000,000 agents × 1,000 retained memories each = **1,000,000,000 records**.

Float32 vectors alone cost `M × d × 4 bytes`:

| Corpus | Raw vector payload |
|---|---:|
| 1 billion × 512 dimensions | 2.048 TB |
| 1 billion × 1,536 dimensions | 6.144 TB |
| 1 billion × 512 dimensions, three full copies | 6.144 TB |

These exclude source text, row/tuple overhead, identifiers, indexes, graph links, quantization metadata, WAL, backups, temporary builds and concurrent old/new embedding models. RAM needed for an ANN index is not identical to raw vector bytes. DiskANN and quantization papers show useful storage options, not a guaranteed footprint for OpenLegend's filtered, mutable corpus. [S24](sources.md#s24), [S25](sources.md#s25), [S26](sources.md#s26)

One new memory per real minute per million agents produces **1.44 billion records/day**. Thus “we can store a billion” says little about an indefinitely operating world. Measure acquisition rate, durable source sharing, genuine consolidation, searchable retention, archive growth and deletion work.

If one utterance is legitimately heard by 500 agents, storing a source once can reduce duplicated text, but it does not remove 500 distinct acquisition/permission facts. De-duplication must not collapse different observations into a false common memory.

## World placement and hotspot arithmetic

`world owners needed ≥ peak aggregate workload / tested safe owner workload`

This is only a lower bound. Add spare capacity, uneven placement, regional imbalance, failures and worlds too large to fit an average slot. Do not estimate machines from players alone. Use a resource vector: simulation CPU, active bytes, exact perception edges, persistence bandwidth, projection CPU and AI admission.

A world with 100 humans and 10,000 actively thinking NPCs can be more expensive than one with 1,000 humans and little autonomous activity. A million players spread across 20,000 worlds says nothing about whether 10,000 can gather at one market.

## A worksheet to maintain as the engine changes

For each representative scenario, record baseline SHA, machine, duration, native speed, clients/device profile, active body count, density distribution, active process count, candidate/exact sense tests, world age, memory corpus per actor, actual token/call distribution, bytes/client, commit bytes, CPU/GC, queue age and failure assumptions.

Then estimate marginal cost of one more human, one more active agent, one more event recipient, one more day of retained history, one more global interaction and one more simultaneous world wake. The marginal curves reveal architectural walls earlier than a single maximum-player headline.

Use the [benchmark plan](benchmark-plan.md) to replace assumptions with evidence. Capacity planning should state which dimensions were measured, which remain extrapolated, and where the extrapolation is likely nonlinear.
