# Benchmark and failure plan: replace scale assumptions with evidence

[Research index](README.md) · **Proposed experiments only. None was executed for this report.** Runtime evidence belongs in the existing verification owner; PF/SW/CR/EPR/D0–D6 retain acceptance ownership. Large hosted or paid experiments require separate authorization and cost caps.

## 1. Establish a reproducible workload contract

Every result should identify commit SHA, dependencies, machine/CPU allocation, storage configuration, region, client/browser/device, dataset seed, world age, geometry, native speed, active processes, connected humans, cognition-enabled agents, actual inference policy and duration. Record cold preparation separately from warmed steady state.

Publish a population vector rather than “players supported.” At minimum: concurrent connections, worlds, local density, active bodies, due processes, exact sensory edges, source events, actual recipients, retained memories and admitted model calls. Include the busiest world and the upper tail, not just fleet averages.

Use a small deterministic fixture as a semantic oracle, and separate it from large capacity fixtures. The small version can exhaustively verify recipients and ownership. A load result is invalid if it becomes faster by losing events, refusing ordinary actions or falling behind its promised simulation clock.

## 2. Measure the full critical path

```text
user input
 → immediate local feedback
 → gateway arrival and admission
 → wait for authoritative mutation owner
 → native validation/routing/effects
 → required evidence and durable commit
 → permitted projection and encoding
 → network delivery
 → browser decode/state application
 → visible frame
```

Measure each span and the complete distribution. Instrument generated decisions separately: opportunity, admission wait, context assembly, recall, provider wait/first output/completion, and final authoritative admission. A fast native kernel does not establish database, browser or dialogue capacity.

Keep p50/p95/p99, maximum observed pause, queue ages, request timeouts, accepted/rejected counts and measurement duration. A percentile from a tiny sample is weak evidence. Correlate long tails with GC, cold indexes, database checkpoints, fanout, background work and content versions. [S36](sources.md#s36)

## 3. Workload matrix

| Scenario | Vary independently | Measure | Invariant or failure signal |
|---|---|---|---|
| Quiet large world | Dormant/inert entities; active set fixed | Step CPU, heap, enumeration, startup | Routine cost should not track every inert object without a documented reason |
| Small old world | Historical age/corpus; live activity fixed | Commit bytes, heap, recall/page cost | One movement must not require loading all old history |
| Dense town square | Local actors and simultaneous sources | Candidate/exact tests, acquisitions, serialization, egress | All legitimate evidence retained; optional thought can be separately admitted |
| Bridge/underpass | Surfaces, body sizes, doors, stacked levels | Cold/warm routes, sweeps, sight/hearing | No wrong-floor travel, reach through ceilings or leaked identity |
| Construction burst | Local edits, extent, active dependents | Cache invalidation and rebuild tails | All affected physics/senses update, unrelated regions avoid global rebuild where safe |
| Resource contention | Two then many actors claiming one unit | Commit wait/conflicts/receipts | One conserved outcome; duplicate request cannot consume twice |
| Speech storm | Speakers, listeners, conversation groups | Source-to-recipient expansion, queue age, dialogue latency | Distinct utterances not coalesced away; no cross-actor private context |
| Clock stress | Same fixture at each supported speed | Simulated progress, debt, CPU, maintenance rate | No silent loss of required steps, thresholds or obligations |
| Agent wake storm | Cold minds and due obligations | Load/context I/O, inference admission, memory | Native continuity survives; no mass redispatch of uncertain paid jobs |
| Private recall | Per-actor corpus, total corpus, filter selectivity | Recall quality, IDs serialized, SQL plan, index cost | Scope and source revision preserved before exposure |
| Ingest/delete/reindex | Arrival and deletion rates; embedding versions | Backlog, throughput, temporary disk/RAM | Revoked sources cannot reappear through late jobs or rebuild |
| Browser entry | Assets, initial view size, device capability | First playable, main-thread stalls, GPU/heap | Only permitted content; native fallback while assets load |
| Reconnect wave | Disconnect fraction and retry synchronization | Admission, snapshot bytes/CPU, queue age | No duplicate control or old-timeline patch acceptance |
| Fleet skew | Many worlds with a few heavy ones | Cell isolation, placement, resource contention | One pathological world cannot starve unrelated admitted worlds |
| Cold restore | Snapshot and history size, missing artifacts | Time to safe useful play | Coherent ownership, rules, private evidence and external-work reconciliation |

The [code-grounded pressure points](repository-hot-paths.md) identify especially valuable local cases: default event candidate enumeration and the 128-observer/512-target sight-cache boundaries. Those are optimization boundaries, not gameplay population limits.

## 4. Load generation must not hide overload

Use both controlled-concurrency clients and scheduled-arrival workloads. A client that waits for every slow response before sending another request lowers offered load precisely when the server struggles. Record intended arrival, actual send, admission and completion so that hidden waiting does not make latency look better.

Track offered, admitted, completed, timed-out and rejected operations separately. Keep the generator's CPU/network capacity visible. A saturated generator cannot demonstrate that the server has spare capacity. Distinguish idle socket tests, native command tests and full AI-backed sessions.

Increase one variable at a time to find the first nonlinear cost, then test realistic mixtures and bursts. A reasonable **initial experiment ladder**, not a capacity target, is 2 → 16 → 64 → 256 clients or active agents, changing those populations separately and stopping at a safety limit. The exact ladder should follow machine and budget constraints. Do not dispatch hundreds of paid agent calls simply because this example lists a population.

Short runs locate costs; longer soaks expose growth and maintenance. Compare repeated matched runs with warmup, variance and cold-start results. Test at least one aged dataset rather than assuming a fresh save represents a persistent world. No fixed soak duration is prescribed as sufficient for every risk.

## 5. Memory-specific quality and cost experiments

Build a synthetic but semantically labeled corpus: direct observations, hearsay, self-thoughts, corrected names, contradictory testimony, protected promises, duplicates, expired sources and same-named actors. Include different private corpora for actors in the same physical location.

Measure eligible exact top-k as a reference, then compare candidate indexes. Report recall@k, mandatory-reference retrieval, abstention on unavailable evidence, source-version correctness and unauthorized-result count alongside latency and cost. A privacy failure is not a tolerable reduction in retrieval quality.

Vary **eligible corpus size** independently from global size. A billion-record total with small actor partitions exercises routing/storage differently from a single actor permitted to search millions of records. Test skew toward celebrity agents, shared public lore and frequent corrections. Include concurrent backfill with live requests and enough temporary space for old and new index versions. [S27](sources.md#s27), [S63](sources.md#s63), [S64](sources.md#s64)

Evaluate downstream behavior with the same admitted evidence: retaining a promise, distinguishing inference from observation, updating an old belief, and maintaining identity after a long absence. A nearest-neighbor benchmark alone cannot detect all of these failures.

## 6. Deterministic failure testing

FoundationDB's simulator is inspiration for reproducible fault timing, not a framework this project must copy wholesale. Keep a small harness around the existing pure domain and controlled I/O. Use recorded model outcomes or no-cost fixtures; that establishes lifecycle correctness, not live model quality. [S57](sources.md#s57)

| Injection point | Expected property |
|---|---|
| Before durable commit | No acknowledged effect; retry safely re-evaluates under the same operation contract |
| After commit, before acknowledgment | Retry resolves the committed receipt; no duplicate consumption or payment |
| During owner takeover | Old owner cannot commit under its former generation |
| After transfer ownership changes, before destination acknowledgment | Recovery consults durable transfer state; source does not resume unilaterally |
| During checkpoint publication | No journal prefix pruned before a complete covering checkpoint is committed |
| After model dispatch, before result receipt | Outcome remains uncertain/reconcilable; no automatic second paid attempt |
| During forgetting/correction and summary publication | Stale derivative rejected or fenced from serving |
| During world restoration | Old clients/jobs cannot publish into the new timeline |
| During database/asset recovery | Missing dependencies prevent false success; coherent recovery or explicit degraded state |
| During dependency outage and retry burst | Queues remain bounded and useful admitted work recovers |

Check both **safety** and **liveness**. A server that never accepts commands can avoid duplication while failing the product. Restore the faulted environment and verify that an eligible authority eventually resumes and queued work reaches a valid terminal or deferred state.

## 7. Proposed stage gates

**Local foundation:** two independently controlled actors, scoped evidence, stable operation identity, bounded native effects and repeatable recovery. This is correctness before capacity.

**First hosted world:** the chosen workload meets agreed responsiveness, durability and cost objectives with headroom, under realistic browser/network conditions and maintenance. Shared pause, disconnect and restore behavior is explicit.

**World fleet:** workload-aware placement, fenced relocation, skew, cell failure and reconnect waves pass. Aggregate success does not imply that one crowded world is qualified.

**Hot-world sectors:** a two-owner prototype matches permitted single-owner outcomes for boundary interactions and survives every handoff fault. Measure coordination overhead before expanding the sector count.

**Specialized memory storage:** live ingest, correction/deletion, private retrieval, cold wake, model reindex and restore all meet chosen quality and operational objectives. Static vector throughput is insufficient.

## 8. Evidence template

For every claimed improvement, record: hypothesis; semantic contract preserved; old/new SHA; fixture and seed; hardware and deployment; offered/admitted/completed load; cold/warm state; duration/sample size; latency/CPU/bytes/quality distributions; failure cases; cost; remaining limits; and a reproducible command or procedure.

A pass says **which envelope passed**. A timeout is incomplete. A fixture is not live-model behavioral acceptance. An arithmetic extrapolation is not a measured million-player result. Publish the first bottleneck and expansion trigger as carefully as the headline throughput.
