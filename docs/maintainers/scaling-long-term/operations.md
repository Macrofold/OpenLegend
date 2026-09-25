# LT-O — Fleet, geography, specialized services and inference operations

[Deferred backlog](README.md) · **G3/G4/LATER, not initial hosting prerequisites.** Parents: D5/D6 and PF; ordinary release safeguards remain near-term. **Massive-scale research for every item:** [world fleet](../../../archive/02-research/massive-scale/later/world-fleet.md), [operations/cost](../../../archive/02-research/massive-scale/domains/operations-cost.md), [agent compute](../../../archive/02-research/massive-scale/domains/agent-compute.md), [persistence](../../../archive/02-research/massive-scale/domains/persistence-consistency.md) and architectural options 1/8. Audit: SCA04/SCA06/SCA32/SCA40/SCA49–SCA52.

<a id="lt-o01"></a>
- [ ] **LT-O01 — Cell/fleet isolation and placement.** Trigger: qualified worlds/regions need a managed fleet. Define bounded failure cells and place workloads by CPU, memory, sense edges, persistence, egress and inference demand with failure/deploy headroom. **Exit:** skewed expensive worlds and one failed cell do not collapse unrelated cells; measure actual resource envelopes. Kubernetes/Agones or another orchestrator is selected only if it solves measured operating needs.

<a id="lt-o02"></a>
- [ ] **LT-O02 — Directory, draining and relocation operations.** Trigger: owners move across machines. Depends on LT-R03/LT-R04. Implement versioned routing, stale-route handling, drain/reconnect, compatible client/job versions and a defined control-plane outage mode. **Exit:** existing authority continues only within its safe grant; new placement can fail without duplicate writers; a deploy does not replay paid work or resurrect an old timeline.

<a id="lt-o03"></a>
- [ ] **LT-O03 — Predictive warming and wake-storm admission.** Trigger: cold travel/join or simultaneous activation dominates. Warm permitted server assets/geometry/contexts under bounded caches and stage admissions with retry jitter. **Exit:** mistaken predictions, secret destinations and mass wake/reconnect retain privacy, bounded wasted work and useful latency; required continuity is loaded before use. A predictor never commits future actions or prefetches private data into an unauthorized client.

<a id="lt-o04"></a>
- [ ] **LT-O04 — Geographic placement and disaster recovery.** Trigger: measured player latency/residency/recovery requirements justify multiple regions. Choose world/region home authority, replica freshness, outage behavior and recovery objectives. **Exit:** intercontinental delay and regional loss tests preserve fencing, accepted durable effects and human-private scope; report recovery point/time and playability. Do not promise active-active physical simulation from globally replicated storage.

<a id="lt-o05"></a>
- [ ] **LT-O05 — Inference hosting and serving comparison.** Trigger: stable measured demand or provider limits justify alternatives. Compare API, pooled/self-hosted and specialized execution using actual task/token/latency distributions, idle reserve and operational cost. **Exit:** time-to-useful-output, batching/queue delay, cancellation, stale output, quality, upgrades and on-call costs are included; no provider or spend commitment follows from the model. Durable character memory is not an LLM KV cache.

<a id="lt-o06"></a>
- [ ] **LT-O06 — Telemetry and analytics scale-out.** Trigger: measured volume/cardinality exceeds the qualified monitoring pipeline. Separate sampled traces/restricted private payloads, low-cardinality metrics and asynchronous analytics with explicit retention. **Exit:** actor/request IDs do not create unlimited metric series, observability cannot starve gameplay, and erasure/access rules propagate to derived operational stores. Ordinary instrumentation remains PF00/PF06, not deferred here.

<a id="lt-o07"></a>
- [ ] **LT-O07 — Distributed-store selection experiment.** Trigger: PostgreSQL deployment's measured transactional/locality/recovery envelope is insufficient. Evaluate Spanner or other primary-source-supported candidates with actual hot keys, contention, transactions, indexes, failure cases and total cost. **Exit:** the chosen store improves the real requirement and has a source-preserving migration/rollback plan; no global transaction is introduced for each collision or sensor test. A decision to retain the current store is valid.

<a id="lt-o08"></a>
- [ ] **LT-O08 — Full distributed release rehearsal.** Trigger: before public multi-owner/multi-region rollout. Depends on selected LT-R/LT-M/LT-O implementation and D5 objectives. Exercise mixed populations, hot crowds, old histories, worker/provider failure, cell loss, deployment and restore with real supported clients. **Exit:** documented admitted envelope, measured cost/tails/recovery, runbooks and a rollback boundary; native/idle-socket microbenchmarks do not establish this gate.
