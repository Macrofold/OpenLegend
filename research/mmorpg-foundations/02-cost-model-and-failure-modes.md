# Cost model and structural failure modes

This chapter is engineering analysis, not a measured OpenLegend capacity model. It supplies variables and counterexamples for the existing PF/NSC qualification owners. [Baseline evidence](01-baseline-and-existing-coverage.md) controls all statements about current code; [sources](sources.md) support external examples.

## Capacity is a vector, not a player count

Track at least: stored worlds; concurrently advancing worlds; connected humans; mechanically active people/animals/objects; due native work; active decision jobs; visible/received contacts; recipients of meaningful events; geometry extent and resident geometry; modified geography; retained history; and join/restore bursts. Also record the largest coupled interaction scope and the busiest world, not only fleet averages.

Two worlds with 1,000 connected humans can differ greatly. One may have scattered explorers with small local encounters; another may place everyone around a burning market with many NPCs, projectiles, inventories, speech recipients and independent memories. Fewer humans can still produce more work if autonomous actors interact continuously. A world with no current clients can still have admitted simulation and AI obligations. A huge empty sea can be cheap in active CPU yet expensive if represented as eagerly resident fine cells.

Google's overload guidance explicitly cautions against treating request rate as a stable proxy for resource demand [S14](sources.md#s14). The corresponding OpenLegend inference is to use player count as one workload label, never as the sole cost or placement signal.

## A useful accounting decomposition

For a fixed real interval and declared equivalent gameplay, account for:

`total service = native progression + dependency/query preparation + receiving/evidence + consumer projection + encoding/persistence + scheduling/coordination + retention/maintenance + external orchestration`

Measure provider inference separately as both elapsed service and financial/resource cost; it may run elsewhere but is not free. Include canceled, rejected, duplicated and stale work in resource cost, while counting only valid accepted progress as useful output. Keep CPU service, elapsed latency, waiting and bytes separate. An inclusive phase timer cannot be added to its nested helper timers as if they were independent costs.

A local mutation's bill includes consequences, not just its arithmetic. Moving a character may alter collision candidates, an observer's current contact, personal recording, a client projection and a saved record. Some outputs can be shared or coalesced; distinct required observations and occurrences cannot be erased to improve the graph. This is why compact resident state is necessary but insufficient.

Useful relationships, with their assumptions explicit:

- With bounded per-subject neighborhood and cheap selection, local work may grow roughly with active subjects plus actual interactions. If everyone must interact with everyone, the potential directed pair count is `n(n-1)`; an index cannot remove genuine required pairs.
- Publication work has a recipient term: `sum(event rate × eligible audience × per-recipient work)`, plus reusable event preparation. A common physical result does not imply identical private interpretation.
- Resident memory includes active canonical state, indexes, immutable shared definitions, overlap, queued inputs/results, captures, undo scratch and I/O buffers. It is not just the final entity vector size.
- Storage growth includes unique immutable seed material plus the sum of each world's mutable state and retained history, then indexes, WAL, backups and any actual replicas. Independent histories can diverge even if their initial bytes were identical.
- Recovery time has lower bounds from the bytes that must be read and work that must be validated/reconstructed; making the steady-state loop faster does not remove them.

These are accounting identities or analytical bounds, not measured coefficients. Obtain coefficients from actual complete-path workloads, including heavy and sparse cases. Do not extrapolate a microbenchmark or an all-idle actor count to a supported-world promise.

## What multicore can and cannot do

For fixed work with serial fraction `s` and `p` equally capable workers, the idealized bound is `speedup <= 1 / (s + (1-s)/p)`, before synchronization, memory and scheduling overhead. For example, a hypothetical 20% serial fraction bounds 16-worker speedup at 4×. This illustration is arithmetic, not an estimate of OpenLegend's serial fraction.

A nearly saturated main thread establishes a bottleneck in that execution path; it does not establish that all its work can be parallelized or that a language change removes the required work. Native work can remain serial behind a world mutex. Conversely, pure calculations for several observers in one cell can run concurrently without first distributing geography.

The Factorio team's belt work illustrates a relevant mechanism: identify independent interacting groups, then deal explicitly with cross-group consequences and determinism [S09](sources.md#s09). It does not justify transplanting Factorio's scheduler or simulation model. OpenLegend already chooses explicit phases and disjoint ranges rather than a universal dynamically rebuilt task graph.

Measure useful completed progression, command/capture tail latency, total process/thread CPU, allocations and bytes moved. Count phase preparation and deterministic result application. If all cores become busy but throughput and latency do not improve, the change has not earned adoption. More memory bandwidth, tighter layout or less work may matter more than more workers; NSC already treats these as measured questions.

## Five different expansion problems

| Expansion | Likely pressure | Foundation that prevents avoidable rework |
| --- | --- | --- |
| More independent worlds | Shared pools, startup, routing, database lanes, external job capacity and minimum per-world overhead | Stable world identity, explicit lifecycle, bounded host-wide resources and world-scoped access |
| More geography in one world | Terrain/object residency, spatial query coverage, navigation preparation and coordinate precision | Sparse physical representation, local frames, complete/partial query semantics and replaceable preparation units |
| More dispersed active regions | Dependency selection, cross-boundary overlap, controller coordination and eventual transport | Existing ownership/influence contracts; no assumption that distant work requires a full-world scan |
| More participants in one encounter | Real interaction density, contested writes, receiving and fan-out | Deterministic semantic owners, actual audience filtering, measured density envelope and honest admission |
| More lifetime history | Retrieval, correction, retention, snapshots, backups and restoration | Current state separate from retained history, scoped indexed reads, bounded reclamation and recoverable cuts |

None of these is proved by another. A thousand independent tiny worlds is not proof of a thousand players in one town. A large static map is not proof of sparse-state correctness. A long run with silent history deletion is not an aged-world test.

## Amplification to detect before optimizing a mechanic

**Preparation amplification:** select a few output records only after enumerating, cloning or validating all entities. A bounded result count hides unbounded input work. Indexes should be maintained by the same mutation owner; avoid a per-update rebuild of a generic dependency universe.

**Invalidation amplification:** invalidate every actor/context/path because any world revision changes. Prefer exact supported dependencies with conservative fallback. Do not falsely narrow dependencies: missing a relevant edit is a correctness failure, not a performance win.

**Evidence amplification:** duplicate common immutable received facts for every observer, while also building redundant per-check diaries. Share only genuinely identical immutable values; preserve each receiver's separate scope, timing, identity and retained support. Existing BK and NSC already own this distinction.

**Delivery amplification:** rebuild complete viewer state or perform auxiliary SQL for every movement sample or connection. Epic's replication graph is evidence for sharing candidate preparation, not permission to share private outputs [S10](sources.md#s10). EVE's cosmetics work independently demonstrates that fan-out and serialization deserve their own accounting [S05](sources.md#s05).

**Lifetime amplification:** a small live record pins a large old capture, definition closure, source fragment or checkpoint. Count retained physical bytes and pin owners, not only logical character quotas. Cleanup must make bounded progress under normal load without discarding required provenance.

**Failure amplification:** slow SQL, inference or a lost client causes more waiting jobs, retained captures, retries and reconnect work. Google describes this resource feedback in cascading failures [S15](sources.md#s15); AWS describes asynchronous backlogs that outlive useful results [S16](sources.md#s16). Queueing does not create sustained capacity.

## Economics without invented price precision

A world-hour cost model should separate steady resident compute, useful native service, external inference, current-state storage, retained history, database/maintenance I/O, outbound bytes and allocated recovery headroom. Record how many worlds are stored, loaded, advancing and unattended. A paused world may avoid active simulation service while still consuming storage and maintenance. An unattended advancing world may cost substantially even without subscription activity during that hour.

Immutable seed sharing can reduce duplicated setup/storage; it does not synchronize independent mutable worlds or make their autonomous decisions reusable. Measure a marginal additional world and a mature world, not just average platform spending. Share immutable public assets only under the established asset rights and pinning contracts. Sharing a hash is not a new permission grant.

No new AWS price estimate is needed to establish these foundations. The native design's dated examples remain illustrative. Before purchasing or claiming affordability, price the actual hardware, database, provider, transfer, backup and failure plan on the selected date. The important architectural question now is whether those costs can be isolated, measured and bounded without changing fictional outcomes.

## Hard limits to report honestly

A global law or dense interaction graph can legitimately create a large serial/coherent scope. Remote compute can add coordination latency and read overlap; tiny cells may increase work. Exact autonomous simulation of an unbounded active population cannot have a fixed total compute cost. Retaining an ever-growing irreducible history cannot have fixed total storage. These are reasons to qualify workloads and service policies, not to weaken accepted mechanics silently or abandon the persistent-world ambition.

The engineering objective is to remove accidental costs, make necessary costs explicit, and keep later mechanisms replaceable. It is not a promise that architecture eliminates every future migration or performance problem.
