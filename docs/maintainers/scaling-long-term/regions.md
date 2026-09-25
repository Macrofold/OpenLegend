# LT-R — Regional authority and distributed worlds

[Deferred backlog](README.md) · **G3/LATER; not active implementation.** Parent: [D6](../production-data.md), product P6 and D61. Existing SC04 retains immediate namespace/access contracts. **Massive-scale research for every item:** [hot-world partitioning](../../../archive/02-research/massive-scale/later/hot-world.md), [target architecture](../../../archive/02-research/massive-scale/target-architecture.md), [world fleets](../../../archive/02-research/massive-scale/later/world-fleet.md) and [persistence](../../../archive/02-research/massive-scale/domains/persistence-consistency.md). Audit: SCA04/SCA05/SCA15/SCA45/SCA52.

<a id="lt-r01"></a>
- [ ] **LT-R01 — Measure the partition boundary.** Trigger: a named shared-world workload exceeds its qualified single-owner envelope after local improvements. Depends on PF00/PF11 and G1 records. Record CPU, memory, DB, projection, network and inference separately, plus cross-region physical/sensory/process/transaction edges. **Exit:** compare at least one plausible partition against keeping one larger owner; report total coordination cost and skew, not only local CPU balance. A conclusion not to split is a valid evaluation result.

<a id="lt-r02"></a>
- [ ] **LT-R02 — Regional working-set loader.** Trigger: LT-R01 selects a regional prototype. Depends on SC04, D1/D2 current records and exact lifecycle semantics. Implement region/entity lookup, bounded hydration, neighboring read replicas and scoped unload with all required plans, timers, evidence and commitments. **Exit:** loading a region does not reconstruct the whole world; unloading neither drops due effects nor grants new recall; cold/warm limits are measured. Physical DB sharding is not required.

<a id="lt-r03"></a>
- [ ] **LT-R03 — Storage-enforced owner fencing.** Trigger: before two simulation writers can operate. Depends on LT-R02 and the owner/head contract. Enforce owner generation and expected durable head at commit; define directory routing and stale-owner rejection. **Exit:** a suspended/partitioned old owner cannot write after reassignment, including delayed jobs. Preserve the existing advisory protection until its replacement is proven. Lease expiry or a heartbeat alone is insufficient.

<a id="lt-r04"></a>
- [ ] **LT-R04 — Durable entity and whole-world transfer.** Trigger: travel/relocation crosses owners. Depends on LT-R03 and destination admission. Implement stable transfer identity, capacity reservation, coherent source boundary, ownership switch, destination activation, client reset/routing and source retirement. **Exit:** inject faults and lost acknowledgments at each phase; there is one owner and no duplicate actor, inventory or paid effect. Destination-full leaves a truthful safe source outcome. Entity transfer and whole-world relocation share integrity primitives but keep their distinct payloads/lifecycles.

<a id="lt-r05"></a>
- [ ] **LT-R05 — Boundary perception and read replicas.** Trigger: a supported sight/hearing interaction spans regions. Depends on LT-R03, EPR and SW. Define read-only ghost version/freshness, event-time origin, actual per-recipient detail and acquisition routing. **Exit:** a shout during migration is neither duplicated nor lost; late arrivals gain no earlier knowledge, invisible identities remain hidden and stale ghosts never authorize an effect. Measure required boundary traffic without arbitrary witness sampling.

<a id="lt-r06"></a>
- [ ] **LT-R06 — Cross-owner conserved effects.** Trigger: a selected trade, combat, fire spread, shared structure or export cannot remain local. Depends on LT-R03 and the feature's native invariant. Choose a designated owner/co-location, same-store transaction or explicit reservation/escrow protocol per operation; distinguish compensation from erasing history. **Exit:** competing claims, boundary movement, duplicate delivery and uncertain commit preserve resources and accepted effects; connected physical islands are co-located or explicitly unsupported. Save rewind cannot recreate exported goods or external entitlements.

<a id="lt-r07"></a>
- [ ] **LT-R07 — Causal time, order and randomness.** Trigger: before independently advancing regions. Depends on D03 and LT-R01's interactions. Define owner-local ordering, cross-boundary causal identity, tie/fairness policy, clock synchronization and recorded randomness/resolved outcomes. **Exit:** pause/speed change, delayed causes and migration do not reroll effects or fabricate elapsed time. Compare a small single-owner reference; publish deliberate semantic differences. Do not publish speculative speech/private evidence that would need to be unread on rollback.

<a id="lt-r08"></a>
- [ ] **LT-R08 — Regional rule activation and retained versions.** Trigger: a law upgrade affects several loaded/unloaded regions. Depends on INV-5/SC14 and LT-R03. Plan a coherent manifest/migration boundary, native state conversion, pending-job disposition and retained-save pins. **Exit:** no mixed initialization or incompatible writers for one quantity; cold regions load the correct rules and failed preparation leaves old authority intact. Equivalent live objects do not acquire different physical laws merely by rollout cohort.

<a id="lt-r09"></a>
- [ ] **LT-R09 — Two-owner integrated qualification.** Trigger: prototype readiness, before more regions or production. Depends on LT-R03–LT-R07 and LT-R08 when upgrades are supported. Exercise contested resources, bridge/door changes, crossing conversations, delayed AI, transfer cancellation, former-owner revival and reconnect. **Exit:** record native speed, cross-boundary bytes, tail latency, recovery and costs; prove applicable invariants against the reference. Independent-world throughput cannot substitute for this shared-world gate.

<a id="lt-r10"></a>
- [ ] **LT-R10 — Physical storage distribution.** Trigger: measured storage contention/size/locality, not merely multiple compute owners. Depends on D1/D2, LT-R09 and LT-O07's store evaluation where relevant. Migrate stable logical partitions with fenced writer cutover, resumable backfill and explicit cross-store effect semantics. **Exit:** interruption and routing lag preserve one writable truth, source scope, uniqueness and recovery; dual writes cannot silently diverge. Additional shards must improve the measured bottleneck after coordination cost.
