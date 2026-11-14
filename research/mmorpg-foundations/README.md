# Foundations for a simulation-heavy persistent MMORPG

| Status | Evidence date | Repository baseline |
| --- | --- | --- |
| Research and design-preparation recommendations; no runtime change or capacity claim | 2026-11-09 | `Macrofold/OpenLegend`, `codex/stealth-runtime-01-evidence`, `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977` |

## Executive conclusion

**Build the small world with bounded, world-scoped, locality-aware contracts; do not build a large hosting platform first.** Rust and multicore execution address important costs, but do not by themselves bound interaction fan-out, resident geography, accumulating history, external work, or recovery. Equally, most of the necessary ownership and correctness principles are already present in OpenLegend's native-core design and earlier scalability work. This research is not a reason to restart those designs.

The immediate concern is an interface that quietly requires the entire world, all observers, all history, one provider session, or one machine to exist together. Such assumptions become expensive when many mechanics depend on them. A particular index, pool size, cell size, database partition, or cloud instance can usually change later behind a sound boundary. Establish the boundary first; implement a more elaborate mechanism only for an actual consumer or demonstrated limitation.

**Important correction:** geographical partitioning is not a prerequisite for multicore execution. Independent calculations and disjoint writes can use multiple cores inside one place. Cells help select, own, load and eventually distribute spatial work. The accepted [native design](../../docs/projects/native-simulation-core-tech-design.md) correctly separates these responsibilities. Its NSC03 parallel proof precedes NSC05 cell qualification. Do not turn cells into permanent CPU assignments.

## The working ambition

Mike's November 9 brief describes numerous independent copies of the same seed world, vast land and sea, roughly 1,000 players per world with a desire to support more, and potentially thousands of independently evolving world datasets. This is a research workload, **not** a demonstrated capacity, newly selected release gate, fixed entity limit, or instruction to operate thousands of worlds now. Earlier shared-world release/growth targets retain their own owners until explicitly reconciled.

A seed may be shared; a lived history cannot be silently merged with another copy. An empty human player list does not establish that a world has no ongoing NPC obligations. Conversely, persistence alone does not promise continuous full-cost computation during every absence. The service promise for unattended advancement remains a product decision under the existing product-scalability owners.

## What to protect now, prepare soon, and defer

| Timing | Foundation | Smallest useful outcome | Existing coverage / remaining preparation |
| --- | --- | --- | --- |
| Now, while native boundaries are forming | Stable world/space/entity identity, separate seed/build/timeline/custody identities | Create two seed copies; changes, jobs and restores cannot cross their authority boundaries | Identity, current-format restore and custody are already designed; make the independent-seed lifecycle and cross-consumer namespace audit explicit |
| Now | Coordinate precision and local computation frames | A small scene remains mechanically equivalent at a large global offset, including bridge, geometry, save and display paths | Continuous metres already exist; qualify the entire numeric path before native types and saved spatial layouts harden |
| Now | Bounded operation and dependency contracts | Each supported owner identifies relevant subjects, changed outputs, influence, completion and retention; unknown influence takes a conservative path | NSC and native work admission already supply much of this; reconcile coverage rather than add a universal runtime graph |
| Now | Complete-path cost visibility and representative comparison inputs | Distinguish useful progress from moved work, queueing, discarded work and reduced behavior | Extend existing PF/NSC qualification; do not create a second benchmark program |
| Soon, before large geography becomes ordinary content | Sparse physical residency and query coverage | A region can be absent from RAM without being treated as empty or having its consequences silently stopped | Earlier scale notes propose this; native history residency is not the complete physical-world contract |
| Soon, before an unattended service offer | Explicit advancement, suspension, reactivation and funding meaning | Returning to a camp cannot invent elapsed outcomes or hide an unbounded catch-up debt | Resolve through PS and continuing-life owners, not an engine-specific shortcut |
| Soon, before offered multiplayer/world growth | Aggregate budgets, disclosure-safe publication and restart/recovery envelopes | A busy world, slow client, old history or reconnect wave cannot consume unbounded host resources | Reuse scheduling, NET, BK, PF and production-delivery owners; qualify their combined lifecycle |
| Later, at a measured trigger | Multiple machines, adaptive placement, physical database sharding, fleet orchestration | Greater useful capacity after coordination, migration and operating costs | NSC06–08 and production-delivery gates already own these experiments |

The detailed design-preparation owner is [MMORPG scalability needs design](../../docs/maintainers/mmorpg-scalability-needs-design.md). It distinguishes genuinely incomplete preparation from preservation requirements and already-owned qualification. It does not reopen completed NSC design or authorize runtime work.

## Read the corpus

| Document | Purpose |
| --- | --- |
| [01 — Baseline and existing coverage](01-baseline-and-existing-coverage.md) | Source provenance, prior discussion leads, accepted designs, inspected code and limits of the review |
| [02 — Cost model and failure modes](02-cost-model-and-failure-modes.md) | Independent scaling dimensions, serial limits, fan-out, memory/IO and economics; no capacity forecast |
| [03 — Core engine contracts](03-core-engine-contracts.md) | Hard-to-retrofit ownership, identity, locality, deterministic work and replaceable boundaries |
| [04 — Geography and physical residency](04-geography-and-physical-residency.md) | Large coordinates, streamed physical state, dependency closure, navigation and unloaded-state meaning |
| [05 — Independent worlds and data lifecycle](05-independent-worlds-and-data-lifecycle.md) | Seed copies, world lifecycle, durable growth, restoration and future build compatibility |
| [06 — Scheduling, delivery and overload](06-scheduling-delivery-and-overload.md) | Shared capacity, external cognition, fan-out, honest backpressure and headroom |
| [07 — Game and cloud evidence](07-game-and-cloud-evidence.md) | Transferable mechanisms and limits from MMOs, simulation games, AWS and Agones/Google Cloud |
| [08 — Sequencing and qualification](08-sequencing-and-qualification.md) | Small-world delivery path, validation scenarios, decision triggers and explicit non-goals |
| [Sources](sources.md) | Primary-source register with dates, inspected scope and limits |

## Interpretation

Research recommendations are analysis, not installed behavior. Repository observations are tied to the baseline above. Public manuals were checked on November 9, 2026; historical articles are identified by their publication dates rather than treated as current implementation reports. Vendor examples are not OpenLegend measurements. No paid inference, benchmark, cloud provisioning, gameplay test, source-code change or database modification is part of this research.

The named implementation branch `codex/native-simulation-proof` was unavailable on the connected GitHub remote: direct branch retrieval returned 404 and branch search returned no matching native branch. That does not establish that implementation work does not exist locally or elsewhere. The implementation owner must reconcile this research against its actual source before treating a preparation item as missing.

The desired outcome is a more capable small game whose foundations survive growth—not a collection of distributed systems that delay making the game worthwhile.
