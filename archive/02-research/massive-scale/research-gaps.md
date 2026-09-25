# Research gaps, verification limits and follow-through

[Research index](README.md) · This page distinguishes what the dossier establishes from what still needs evidence. It is not a declaration that the project cannot scale, nor a duplicate implementation backlog.

## What this research did

The review inspected the repository's product direction, relevant architecture/performance/memory/spatial/production specifications, focused implementation trackers and selected live code paths at the pinned baseline. It searched primary papers, official technical documentation and first-person engineering accounts across simulation, multiplayer, databases, retrieval, agent execution, browsers and operations.

The [source registry](sources.md) has explicit examination-depth notes. Important numerical comparisons were checked against the papers' actual workload definitions, including the AgentSociety table as a page image. The supplied Google paper's architecture diagram and relevant sections were reviewed alongside the original Spanner transaction design.

The deliverable is an informational architecture dossier and proposed experiments. No game runtime, benchmark, database migration, distributed deployment, security penetration test or paid model evaluation was executed. No library/provider was installed or selected for production by this report.

## Repository scope

The baseline is `3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238`. Other feature branches and later changes are not silently included. The code review followed authority, data shape, browser patching, scoped vectors, events and perception; it was not a line-by-line audit of every source file.

Large architecture documents were read in relevant sections rather than every historical appendix. Implemented behavior is distinguished from target behavior and uncompleted acceptance gates. Where static code suggests a cost, the dossier calls for measurement instead of inventing timing or throughput.

Before implementing a recommendation, refresh the affected canonical owners and current code. Preserve the audit's pinned links as historical evidence rather than editing them to imply it inspected a later version.

## Primary-source access limits

The HPA* author PDF could not be fetched; S19 is a screened bibliographic/abstract lead. The full architecture taxonomy in S51 and Fujimoto tutorial in S56 were not available in this session. Their entries identify the limitation and do not import inaccessible benchmark details.

Several useful algorithm and memory papers were screened at abstract/method-summary level rather than exhaustively read. That is enough to identify a candidate, not enough to implement it from this dossier. Retrieve the full paper and pinned implementation before selecting the technique.

Blizzard's official historical cross-realm article was readable through indexed text while direct page requests were inconsistent. It describes product behavior, not complete proprietary internals. Conference videos, including the Halo services session, were not watched. Jagex's first-party 2025 infrastructure article did provide direct server/tick/profile evidence; the dossier does not rely solely on community reconstruction of RuneScape.

## The evidence not yet available for OpenLegend

| Open question | Why literature does not settle it | Evidence to obtain |
|---|---|---|
| Sustainable native population and density | The game's exact rules, time acceleration and geometry differ from published workloads | Matched CPU/GC and exact-query measurements with actual active mechanics |
| Full multiplayer responsiveness | Native throughput excludes storage, projections, transport and browser rendering | End-to-end traces with independently authenticated clients |
| Billion-record private recall economics | Corpus selectivity, text size, updates, deletion and skew determine cost | Scoped real-data/synthetic-oracle retrieval and maintenance benchmarks |
| Agent quality at a fixed budget | Model latency, context, goals and behavioral fidelity interact | Live play-based evaluations with explicit paid budgets and baseline comparisons |
| Correct hot-world sectoring | Arbitrary cross-boundary effects and private evidence are game-specific | Two-owner prototype with a single-owner oracle and systematic failure injection |
| Coarse offstage simulation | The acceptable loss of individual detail is a product choice | Approved fidelity contract and adversarial promotion/intervention tests |
| Shared save/restore semantics | External trade, human knowledge and real spending cannot simply rewind | Product decision plus conservation, privacy and operation-reconciliation tests |
| Provider/framework fit | Documentation cannot reveal this team's integration and operating cost | Narrow proof of concept against a concrete bottleneck, not a universal bake-off |
| Regional recovery guarantees | Database topology and external dependencies define possible loss and recovery time | Empty-target drills and owner/region failure scenarios |
| Long-term economic/social stability | Correct local rules can produce unwanted emergent outcomes | Long-horizon experiments, human playtests and abuse-oriented scenarios |

## Further research that could change a decision

**Workload-aware partitioning.** Investigate actual interaction traces before choosing spatial sectors, social groups or dynamic islands. Measure stable boundaries and migration churn; an optimal graph cut computed offline may be unsuitable for live continuous movement.

**Filtered and mutable ANN.** S63–S65 provide useful leads beyond a static HNSW comparison. Examine predicate selectivity, delete propagation, rebuild behavior and memory requirements using the game's source/permission model. Keep exact eligible search as the reference.

**Distributed snapshot and time protocols.** Read the full primary literature when more than one simulation owner must advance or restore coherently. Determine what is committed, what is in flight, and what cannot be reversed after a human or external service observes it.

**Agent evaluation.** Extend temporal-memory tests to private knowledge, persistent goals, believable refusal/silence, multiple witnesses, conflicting testimony and intervention by a human. Aggregate society statistics do not establish a named NPC's consistency.

**Numerical and environmental models.** A future structural, thermal or fluid mechanic needs its own fidelity, stability, conservation and execution budget. The [environment chapter](domains/environment-systems.md) outlines the questions; it does not select a general physical solver.

**Current operational products.** Recheck browser support and provider/library contracts at implementation time. Historical architecture is useful; prices, regions, supported versions and service guarantees should not be frozen from this research.

## What would justify revising the main recommendation?

Evidence that the core desired experience requires a huge tightly coupled scene from the first release would bring hot-world partitioning or an explicit crowd design forward. Evidence that one world's native state is small but inference is overwhelmingly expensive would prioritize scheduling and quality/cost research instead. Evidence that actor-private histories remain small could postpone specialized vector infrastructure despite a large global total.

These outcomes are compatible with the foundation guidance: stable identity, explicit authority, scoped knowledge, bounded work and reversible infrastructure choices. The purpose is to discover the first real constraint early, not to declare an eventual architecture immune to change.

## Documentation follow-through

Accepted product choices belong in the existing decision/specification owners. Concrete implementation or qualification work belongs in PF/SW/CR/EPR/NC/SL/EWF/INV or D0–D6 as appropriate. Runtime evidence belongs in verification. This research folder remains a reference and proposed-experiment library; it does not mark those owners' work complete.
