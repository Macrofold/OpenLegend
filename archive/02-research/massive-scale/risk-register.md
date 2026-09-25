# Architectural risk register

[Research index](README.md) · Research synthesis, not a duplicate task tracker or probabilistic forecast. Rows identify failure modes to examine; they do **not** assert each defect exists. Observed code findings are separately documented in [repository hot paths](repository-hot-paths.md).

## A. Foundation risks: keep these assumptions from spreading

| Risk | Why it becomes expensive | Early signal / proving scenario | Existing owner and proposed response |
|---|---|---|---|
| Single-player identity becomes implicit everywhere | Later authentication must repair control, views, presence, history and editors simultaneously | Two accounts see the same private history or one tab pauses everyone | D0/D1 plus protocol/knowledge owners: explicit account/session/actor binding |
| Whole-world access becomes every subsystem's API | Unrelated growth inflates routine work; partial residency becomes a rewrite | Distant entities or old memories increase one local command's cost | PF/D1: bounded access and changed/due/relevant sets |
| Location becomes identity | Migration invalidates references, receipts and learned relationships | Moving an actor changes its durable ID | D0/D6: stable logical identity, separate placement/generation |
| Every event requires a global total order | Many independent worlds contend on one bottleneck | Unrelated worlds wait on one sequence/lock | D0/D6: owner-local order plus explicit causal boundaries when split |
| Lease/activation is mistaken for exclusive durable ownership | A former worker can reappear and write a second history | Pause old owner, promote new owner, resume old one | D1/D6: storage-enforced ownership generation and expected head |
| A received model result is treated as authorized effect | Stale/private/invalid reasoning mutates current state | Remove bridge or revoke control while inference runs | CR/AG/D2: bound proposal to relevant inputs and normal admission |
| Private evidence is mixed with shared world truth | Search, summaries and clients inherit omniscience | Whisper test after door opens and after restore | CR/EPR/NC/D2: acquisition/detail/source lineage and current permission checks |
| Mutable definitions silently reinterpret saved instances | Old recipes, quantities and actions change after upgrades | Load a partially completed action after definition edit | EWF/INV/SL: pinned versions and explicit migration |
| Time and units are implicit | Speed changes alter costs, deadlines or conservation unexpectedly | Compare a supported process across speeds and pause | Domain/PF/D0: distinct simulation/real/logical clocks and units |
| Raw code/prose expands authority | A novel mechanic bypasses all tested bounds | Generated rule schedules global work or requests unrestricted tools | EWF/INV/AI: finite trusted families and explicit capability/cost admission |
| Save/restore rewinds external reality | Exports, payments or erasures can be duplicated/reversed | Restore after trade, paid dispatch or forgetting | SL/D1/D2: external operation identities and restoration overlays |

## B. Scaling multipliers: measure before promising a population

| Risk | Dominant variable | What to measure / avoid |
|---|---|---|
| Dense sensory fanout | Genuine observer-source edges, not total accounts | Candidates, exact tests, acquisition bytes and reactions separately; do not cap legitimate witnesses silently |
| Expensive per-recipient projection | Clients × changed permitted records | Shared public work, dirty views, encoding/GC and reconnect snapshots |
| Clock-accelerated maintenance | Simulated-to-real-time ratio | Cognition, retention and cleanup rates in their actual time domain |
| Unbounded inference backlog | Admitted arrival rate versus service capacity | Queue age, accepted/rejected work, stale results and spend; more promises are not more compute |
| Private search modeled as global ANN | Eligible corpus/selectivity and index churn | Exact scoped baseline, filters, updates/deletes and cold-query latency |
| Historical data leaks into hot state | World age, source lineage and tombstones | Resident memory and local-command cost versus age; bounded cold readers |
| Content-created dependency explosion | Mechanic reach, descendants and cycles | Per-family aggregate work and active-instance count, not just callback runtime |
| Cross-owner interaction dominates local compute | Boundary edges, migration frequency and coupling | End-to-end cost before/after sectoring, not just lower CPU per worker |
| Empty worlds continue expensive lives indefinitely | Active world-hours and agent activity without humans | Retention/offline policy and marginal world-hour cost, not CCU alone |
| Global services become hidden single points | Login, directory, catalog, quota or market dependencies | Existing-world behavior during each dependency outage |

## C. Operational surprises

**Cold starts and mass wakeups.** Cache-warm tests miss navigation preparation, actor hydration, private-context loads and index initialization. A release or regional interruption can synchronize them. Admission needs a safe burst envelope and progress UI.

**Migration's temporary footprint.** New schema/index/model generations can require both old and new data, live ingestion and background I/O simultaneously. Budget the peak footprint and the full backfill duration before starting.

**Monitoring becomes the workload.** Per-agent metric labels and unrestricted full-state/model logs can dominate storage and expose private information. Low-cardinality metrics, targeted traces and restricted diagnostics have different purposes. [S59](sources.md#s59)

**Recovered infrastructure, unrecovered game.** A promoted database or running process is not evidence that content pins, erasure overlays, private recall and uncertain jobs are coherent. Time-to-safe-play must include these dependencies.

**Backpressure preserves memory but loses meaning.** Dropping old transform samples can be safe; dropping a promise or private acquisition may not be. Classify replaceable versus required traffic before applying queue limits.

**A successful framework hides an unmet guarantee.** Room libraries, actor runtimes, distributed databases and media services each solve a subset. Test the complete effect across their boundaries. Their documentation does not certify the game's item conservation, privacy or spending behavior.

## D. Behavioral and product risks

**Economically coherent but unplayable worlds.** Perfect local conservation can coexist with resource starvation, incumbent dominance or trivially exploitable time-rate differences. Test aggregate outcomes and strategic multi-account behavior.

**Fast agents without continuity.** Throughput improvements can lose protected obligations, personality, uncertainty or long-term goals. Track behavioral quality and evidence fidelity alongside request cost.

**Cold actors become different people.** A lossy summary or statistical promotion can erase personal history. Preserve the accepted memory contract; evaluate any changed fidelity as a product decision.

**Social inference feedback loops.** One ambiguous observation can spread as increasingly confident rumor through repeated summaries. Preserve testimony/inference labels and source lineage; do not accidentally upgrade repetition into independent evidence.

**Developer tooling bypasses player rules.** An editor, test endpoint or creator dashboard may have broad authority in a local prototype. Before hosting, separate administrative inspection, world-authoring power and ordinary character knowledge.

## How to prioritize without speculative infrastructure

First prevent semantic assumptions with a wide blast radius: identity, ownership, knowledge, time, immutable definitions and external effects. Then measure growing multipliers and add the smallest capability that addresses the first real limit. Fleet isolation and specialized storage become obligations at their launch/scale triggers, not a reason to build them all today.

The [benchmark plan](benchmark-plan.md) supplies proposed tests. Promote specific accepted work into the existing focused tracker with its evidence and exit criteria. This research register deliberately has no duplicate task IDs, checkbox status or invented probability scores.
