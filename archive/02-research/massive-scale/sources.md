# Annotated source registry

[Research index](README.md) · Research checked 25 September 2026. Stable source IDs support the topic chapters, [MMO case studies](case-studies/mmo-lessons.md), and [research comparison](case-studies/research-panel.md).

## How to use this bibliography

These are **65 source entries, not 65 fully read research papers**. They include peer-reviewed papers, preprints, official documentation, first-person engineering accounts and a few screened abstracts. Each entry identifies the examination boundary. “Relevant sections” means the cited methods/results were inspected, not that every reference, appendix or implementation was audited. No linked conference video was watched. Published performance is evidence about its stated workload, not OpenLegend capacity.

First-party implementation accounts establish what their authors reported at that date. They are not independent audits. Historic papers remain valuable for algorithms and failure models; dated product limits, hardware and deployment choices are not current guarantees. Living documentation was checked at the research date and should be checked again when implementing against a pinned version. Recommendations and experiments in this dossier are the report's synthesis, not statements attributed to the cited authors.

**Suggested first readings:** S08 for an unusually concrete RuneScape infrastructure account; S01/S02 for the database/simulation boundary; S05 for actor lifecycle and its limitations; S06/S49/S50 for interest management; S20/S21/S23 for distinguishing agent richness from population headlines; S27/S63 for scoped retrieval; S57 for failure testing.

## Games, distribution and production experience

<a id="s01"></a>
### S01 — Developing Global Multiplayer Games Using Cloud Spanner

Yoojeong Choi and Paul Hyung Yuel Kim, Google Cloud; undated vendor whitepaper. [PDF supplied by Mike](https://services.google.com/fh/files/misc/develop_global_multiplayer_games_using_cloud_spanner.pdf).

**Examined:** relevant architecture, game-state, transaction and schema guidance, including the architecture diagram. Useful for separating high-frequency game-server state from persistent backend data. Vendor positioning is not a comparative benchmark. Read consistency/performance statements alongside the original Spanner paper; the whitepaper does not establish that a distributed database runs a million-body simulation.

<a id="s02"></a>
### S02 — Spanner: Google's Globally-Distributed Database

James C. Corbett et al., OSDI 2012. [Proceedings](https://www.usenix.org/conference/osdi12/technical-sessions/presentation/corbett) · [Paper](https://www.usenix.org/system/files/conference/osdi12/osdi12-final-16.pdf).

**Examined:** abstract and relevant implementation/transaction sections, especially sections 2 and 4. TrueTime supports external consistency; it does not eliminate Paxos or cross-group two-phase commit. Use this to reason about transaction placement and coordination, not to copy historical latency numbers or assume global reads/writes are free.

<a id="s03"></a>
### S03 — Colyseus: A Distributed Architecture for Online Multiplayer Games

Ashwin Bharambe, Jeffrey Pang and Srinivasan Seshan, NSDI 2006. [Paper](https://static.usenix.org/event/nsdi06/tech/full_papers/bharambe/bharambe_html/index.html).

**Examined:** relevant architecture and replication discussion in the full-text paper. Object ownership, interest discovery and replica updates are useful distinctions. Its historical game workload and weak read replicas do not solve OpenLegend's private evidence or conserved resources. This paper is **not** the modern TypeScript Colyseus framework.

<a id="s04"></a>
### S04 — Donnybrook: Enabling Large-Scale High-Speed Peer-to-Peer Games

Ashwin Bharambe et al., SIGCOMM 2008. [Microsoft Research publication record](https://www.microsoft.com/en-us/research/publication/donnybrook-enabling-large-scale-high-speed-peer-to-peer-games/).

**Examined:** primary publication summary, not a reproduced implementation. Attention-based fidelity is a useful alternative design. Reduced detail and peer-to-peer assumptions need separate review before applying them to a persistent authoritative game. It is not permission to omit legitimate sensory evidence.

<a id="s05"></a>
### S05 — Orleans: Distributed Virtual Actors for Programmability and Scalability

Philip A. Bernstein, Sergey Bykov, Alan Geller, Gabriel Kliot and Jorgen Thelin, MSR-TR-2014-41, March 2014. [Paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/Orleans-MSR-TR-2014-41.pdf).

**Examined:** persistence, activation consistency and messaging sections, especially 2.6, 3.9 and 3.10. Virtual identity simplifies lifecycle, but the report discusses multiple activations during failures and application-controlled persistence. This is a historical design, not a claim about every current Orleans configuration or economically safe exactly-once effects.

<a id="s06"></a>
### S06 — Unreal Engine Replication Graph

Epic Games, official implementation documentation. [Documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine).

**Examined:** overview and shared replication-list design. Persistent reusable interest structures can avoid repeated per-actor/per-connection work. Replication relevancy is not equivalent to character knowledge, and a framework's examples are not OpenLegend benchmarks.

<a id="s07"></a>
### S07 — RuneLite GameTick API

RuneLite, official client API documentation. [GameTick](https://static.runelite.net/runelite-api/apidocs/net/runelite/api/events/GameTick.html).

**Examined:** API event description. Useful supplementary evidence for the approximately 0.6-second game tick. RuneLite is not Jagex and does not establish the server implementation. Prefer S08 for first-party infrastructure and timing evidence.

<a id="s08"></a>
### S08 — More Worlds, More Power: The Road To Greater Capacity

Old School RuneScape and Jagex Infrastructure teams, 7 August 2025. [First-party engineering account](https://secure.runescape.com/m=news/more-worlds-more-power-the-road-to-greater-capacity?oldschool=1).

**Examined:** full relevant infrastructure, server-performance and capacity discussion. Covers whole-world servers, 0.6-second ticks, virtualization contention and profiling actual gameplay scripts. Descriptions of then-current hosting and future cloud plans are dated evidence, not a claim those plans completed by September 2026.

<a id="s09"></a>
### S09 — Cross-Realm Zones Coming to Beta

Blizzard Entertainment, 10 May 2012. [Official article](https://worldofwarcraft.blizzard.com/en-us/news/5393667).

**Examined:** indexed official article text; direct page access was inconsistent. Cross-realm population, grouping and economic boundaries show that social identity and simulation placement need not coincide. This is historical product behavior, not a reconstruction of current WoW internals or trading rules.

<a id="s10"></a>
### S10 — Introducing Time Dilation (TiDi)

CCP Veritas, 22 April 2011. [EVE developer account](https://www.eveonline.com/news/view/introducing-time-dilation-tidi).

**Examined:** implementation rationale and overload discussion. A deliberate shared-clock policy can preserve useful ordering under overload. It changes the experience; it is not a free optimization. The illustrative crowd scenario is not a measured OpenLegend limit.

<a id="s11"></a>
### S11 — Observing the “Burn Jita” Player Event

CCP Explorer and collaborators, 2 May 2012. [EVE engineering account](https://www.eveonline.com/news/view/observing-the-burn-jita-player-event).

**Examined:** technical operations sections. Reinforcement, neighboring-system preparation and different activity profiles are useful operational lessons. Event-era occupancy settings and hardware do not define present EVE or OpenLegend capacity.

<a id="s12"></a>
### S12 — Friday Facts #421: Optimizations 2.0

Factorio developers, 26 July 2024. [Engineering article](https://factorio.com/blog/post/fff-421).

**Examined:** relevant sleeping, radar/chunk accounting and workload-profiling sections. Replacing repeated work with valid change-driven bookkeeping can outperform blindly adding parallelism. Reported component speedups are tied to specific saves and do not imply a whole-game or multiplayer speedup here.

<a id="s13"></a>
### S13 — Peeking into VALORANT's Netcode

Riot Games engineering. [First-party account](https://www.riotgames.com/en/news/peeking-valorants-netcode).

**Examined:** relevant networking discussion. Prediction, buffering, authoritative outcomes and fairness interact. A competitive shooter's tick targets are not requirements for a tactical browser simulation. Use the reasoning, not an imported numerical target.

<a id="s14"></a>
### S14 — Snapshot Interpolation

Glenn Fiedler, practitioner article. [Article](https://gafferongames.com/post/snapshot_interpolation/).

**Examined:** snapshot and interpolation explanation. Useful for decoupling smooth rendering from authoritative update delivery. Interpolation does not decide whether an action is valid or whether an observer may receive the state.

<a id="s15"></a>
### S15 — Fix Your Timestep!

Glenn Fiedler, practitioner article. [Article](https://gafferongames.com/post/fix_your_timestep/).

**Examined:** fixed-step accumulation and overload discussion. Explains why insufficient headroom produces accumulating simulation debt. A catch-up cap alone does not specify which fictional time or events may be discarded.

## Spatial algorithms and simulation

<a id="s16"></a>
### S16 — Box2D Simulation Documentation

Box2D project. [Simulation guide](https://box2d.org/documentation/md_simulation.html).

**Examined:** relevant stepping, body and sleeping documentation, not the entire implementation. Good reference for physical lifecycle and substep choices. Box2D is two-dimensional; it is not a proposed replacement for OpenLegend's accepted three-dimensional model.

<a id="s17"></a>
### S17 — Optimal Reciprocal Collision Avoidance

ORCA authors' project and paper collection. [Author site](https://gamma-web.iacs.umd.edu/ORCA/).

**Examined:** project/method summary. Useful local avoidance candidate under its stated motion assumptions. It does not prove global route existence, implement priority in narrow doorways, or replace authoritative collision checks.

<a id="s18"></a>
### S18 — Rapier JavaScript Determinism

Rapier project. [Documentation](https://rapier.rs/docs/user_guides/javascript/determinism/).

**Examined:** determinism conditions. Reproducibility depends on consistent inputs and initialization; an engine's claim is not a guarantee for arbitrary surrounding JavaScript or changed rule versions. Relevant before introducing a physics provider or deterministic replay requirement.

<a id="s19"></a>
### S19 — Near Optimal Hierarchical Path-Finding

Adi Botea, Martin Müller and Jonathan Schaeffer, Journal of Game Development, 2004. [Author-hosted paper locator](https://webdocs.cs.ualberta.ca/~mmueller/ps/hpastar.pdf) · [Author-associated publication record](https://www.researchgate.net/publication/228785110_Near_optimal_hierarchical_path-finding_HPA).

**Examined:** bibliographic/abstract material; the author PDF could not be fetched in this research session. Hierarchical pathfinding is a candidate for large maps. Detailed implementation, optimality tradeoffs and dynamic-edit behavior require full-paper follow-up before selection. No benchmark from this paper is imported.

## Cognition, LLM systems and memory search

<a id="s20"></a>
### S20 — Generative Agents: Interactive Simulacra of Human Behavior

Joon Sung Park et al., UIST 2023; arXiv v2, 6 August 2023. [Full text](https://arxiv.org/html/2304.03442v2).

**Examined:** architecture, evaluation overview and reported retrieval/embellishment failures. The 25-agent sandbox motivates memory, reflection and planning, not production-scale durable society infrastructure. Use its failure cases to design character-continuity tests.

<a id="s21"></a>
### S21 — A Parallelized Framework for Simulating Large-Scale LLM Agents with Realistic Environments and Interactions

Jun Zhang et al., ACL 2025 Industry Track, pages 1339–1349. [Proceedings](https://aclanthology.org/2025.acl-industry.94/) · [Paper](https://aclanthology.org/2025.acl-industry.94.pdf).

**Examined:** worker/process design, experiment setup and Table 1; the table and architecture were inspected as page images. Grouped workers reduce resource overhead. Round throughput and individual inference latency differ sharply. See the [research panel](case-studies/research-panel.md) before translating its agent count into an interactive-game target.

<a id="s22"></a>
### S22 — Very Large-Scale Multi-Agent Simulation in AgentScope

AgentScope authors, arXiv:2407.17789, 2024, v2. [Full text](https://arxiv.org/html/2407.17789v2).

**Examined:** experiment and scaling descriptions. Its narrow guessing-game workload distinguishes short/long responses and dummy execution. Population throughput is not evidence of open-ended, low-latency NPC interaction; preserve the workload definition when citing results.

<a id="s23"></a>
### S23 — Modeling Earth-Scale Human-Like Societies with One Billion Agents

Haoxiang Guan et al., Light Society; 2025 preprint, **v2 revised 28 June 2026**. [Record](https://arxiv.org/abs/2506.12078v2) · [Full text](https://arxiv.org/html/2506.12078v2).

**Examined:** mixture/surrogate methods and billion-agent opinion experiment, including its restricted precomputed decision table. Useful example of specialization. A billion agents here is not a billion simultaneous open-ended LLM conversations, and aggregate social fidelity is not individual NPC continuity.

<a id="s24"></a>
### S24 — Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs

Yury A. Malkov and Dmitry A. Yashunin; arXiv:1603.09320, initially 2016. [Paper record](https://arxiv.org/abs/1603.09320).

**Examined:** abstract/method overview. HNSW is an important approximate-index family. Selection still requires filtered recall, update/deletion, build-memory and latency experiments on the game's corpus; it supplies no authorization model.

<a id="s25"></a>
### S25 — DiskANN: Fast Accurate Billion-Point Nearest Neighbor Search on a Single Node

Suhas Jayaram Subramanya et al., NeurIPS 2019. [Primary publication record](https://www.microsoft.com/en-us/research/publication/diskann-fast-accurate-billion-point-nearest-neighbor-search-on-a-single-node/).

**Examined:** primary method/results summary. SSD-oriented search is relevant to large cold corpora. Dataset dimensions, filtering and update assumptions must be preserved; a billion-vector search result is not a billion-agent simulation result.

<a id="s26"></a>
### S26 — Billion-Scale Similarity Search with GPUs

Jeff Johnson, Matthijs Douze and Hervé Jégou; arXiv:1702.08734, initially 2017. [Paper record](https://arxiv.org/abs/1702.08734).

**Examined:** abstract/method summary. Relevant to compressed vector representations and GPU search. Benchmark batch shape and representation accuracy matter; GPU throughput does not automatically imply good private, small-scope interactive retrieval.

<a id="s27"></a>
### S27 — pgvector: Filtering, Multitenancy and Iterative Index Scans

pgvector project, official documentation. [Repository documentation](https://github.com/pgvector/pgvector#filtering).

**Examined:** filtering, multitenancy and iterative-scan sections. Exact scoped search can be effective; approximate post-filtering may return too few matches. Iterative scans have limits and do not replace disclosure checks. Benchmark the actual allowed corpus rather than only unfiltered ANN throughput.

<a id="s28"></a>
### S28 — LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory

LongMemEval authors, arXiv:2410.10813, initially 2024. [Paper record](https://arxiv.org/abs/2410.10813).

**Examined:** abstract and evaluation-scope summary. Temporal reasoning, updates and long-term retrieval suggest useful evaluation dimensions. Assistant-memory scores do not directly establish game-character privacy, promises or simulated-life continuity.

<a id="s29"></a>
### S29 — MemGPT: Towards LLMs as Operating Systems

MemGPT authors, arXiv:2310.08560, 2023. [Paper record](https://arxiv.org/abs/2310.08560).

**Examined:** abstract/architecture summary. A useful analogy for managing limited context through memory tiers. It does not supply the native world authority, event-time evidence or irreversible-operation model this game requires.

<a id="s30"></a>
### S30 — Efficient Memory Management for Large Language Model Serving with PagedAttention

Woosuk Kwon et al., arXiv:2309.06180, 2023. [Paper record](https://arxiv.org/abs/2309.06180).

**Examined:** abstract and serving-method summary. Attention-cache management and batching concern inference infrastructure. They are distinct from durable autobiographical memory, and throughput gains must be evaluated against interactive latency.

## Consistency, databases and operations

<a id="s31"></a>
### S31 — Coordination Avoidance in Database Systems

Peter Bailis et al., PVLDB 8(3), 2014. [Author-lab publication record](https://amplab.cs.berkeley.edu/publication/coordination-avoidance-in-database-systems/) · [Paper record](https://arxiv.org/abs/1402.2237).

**Examined:** primary abstract and invariant-confluence framing. Whether coordination can be avoided depends on operations and invariants. This is not blanket permission to use eventually consistent unique-item transfers.

<a id="s32"></a>
### S32 — Making Geo-Replicated Systems Fast as Possible, Consistent when Necessary

Cheng Li et al., OSDI 2012. [Proceedings](https://www.usenix.org/conference/osdi12/technical-sessions/presentation/li).

**Examined:** primary abstract and RedBlue consistency summary. Useful vocabulary for separating coordinated and coordination-free operations. Applying it requires an operation-specific correctness argument, not labeling all movement or all game data “blue.”

<a id="s33"></a>
### S33 — PostgreSQL 18 Transaction Isolation

PostgreSQL project. [Documentation](https://www.postgresql.org/docs/18/transaction-iso.html).

**Examined:** isolation behavior and serialization-failure guidance. Default isolation does not make arbitrary multi-query workflows serializable. Whole-transaction retry must preserve operation identity and cannot include an unguarded repeated external paid effect.

<a id="s34"></a>
### S34 — PostgreSQL 18 Table Partitioning

PostgreSQL project. [Documentation](https://www.postgresql.org/docs/18/ddl-partitioning.html).

**Examined:** relevant partitioning, constraint and planning considerations. Partition keys affect uniqueness and access paths; excessive physical partitions have costs. Table partitioning is not the same as routing a world among independent database shards.

<a id="s35"></a>
### S35 — Making Retries Safe with Idempotent APIs

Amazon Builders' Library. [Engineering article](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/).

**Examined:** request identity, repeated intent and retry semantics. Essential for commands, transfers and uncertain external work. Idempotent API design is an application contract, not proof that all network delivery is exactly once.

<a id="s36"></a>
### S36 — The Tail at Scale

Jeffrey Dean and Luiz André Barroso, Communications of the ACM, 2013. [Google Research record](https://research.google/pubs/the-tail-at-scale/).

**Examined:** primary overview of tail latency and fanout. Useful for end-to-end budgets across dependent services. Do not hedge non-idempotent writes or duplicate paid model requests simply because speculative reads can reduce latency elsewhere.

<a id="s37"></a>
### S37 — Handling Overload

Google Site Reliability Engineering book, chapter 21, 2016. [Chapter](https://sre.google/sre-book/handling-overload/).

**Examined:** load, queue and overload guidance. Bounded admission and retry policy prevent amplified failure. Which game work may degrade remains a product/integrity decision; this chapter does not authorize loss of required evidence.

<a id="s38"></a>
### S38 — Reducing Scope of Impact with Cell-Based Architecture

AWS Well-Architected whitepaper and guidance. [Whitepaper index](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html) · [Rationale](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/why-to-use-a-cell-based-architecture.html).

**Examined:** first-party overview and cell-isolation rationale. Bounded independent operational units can limit failure scope. Shared control/data dependencies can still reconnect failure domains; merely calling a deployment a cell does not isolate it.

<a id="s39"></a>
### S39 — Agones Overview

Agones project. [Documentation](https://agones.dev/site/docs/overview/).

**Examined:** game-server fleet/allocation overview. An eventual orchestration option after operational need is established. Fleet management does not partition the simulation, provide conserved transfer semantics or qualify per-world capacity.

## Browser, assets and security

<a id="s40"></a>
### S40 — WebSocket API

MDN Web Docs. [Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket).

**Examined:** API and backpressure warning. Applications need explicit buffering limits and overload handling. Transport reliability does not supply game receipts, authorization or timeline-safe reconnect.

<a id="s41"></a>
### S41 — WebTransport API

MDN Web Docs. [Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebTransport).

**Examined:** API, compatibility and Baseline notice. At research time the core API is marked Baseline 2026, newly available since March; older clients and individual features still require checking. Validate browser, proxy, hosting and fallback paths rather than assuming universal availability.

<a id="s42"></a>
### S42 — Using Server-Sent Events

MDN Web Docs. [Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events).

**Examined:** connection, event-ID and reconnection behavior. Useful for the current transport's evolution. Browser resumption does not establish that a scoped game baseline is still valid or that its history remains retained.

<a id="s43"></a>
### S43 — PlayCanvas Optimization

PlayCanvas, official documentation. [Guide](https://developer.playcanvas.com/user-manual/optimization/).

**Examined:** optimization overview and profiling guidance. Rendering/asset budgets require representative devices. A server population benchmark does not establish mobile frame time, texture-memory use or first-playable latency.

<a id="s44"></a>
### S44 — WebSocket Security Cheat Sheet

OWASP. [Guidance](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).

**Examined:** origin, authentication, authorization, validation and resource-limit guidance. A checklist for implementation review, not a security certification or a reason to change transport by itself.

<a id="s45"></a>
### S45 — Wasmtime Security

Wasmtime project. [Security model](https://docs.wasmtime.dev/security.html).

**Examined:** guest isolation and host-boundary discussion. A potential later execution boundary for reviewed extension requirements. Host capabilities and resource limits remain application responsibilities; sandboxing does not make every guest computation cheap or authorized.

<a id="s46"></a>
### S46 — LiveKit Publishing and Track Permissions

LiveKit, official documentation. [Track permissions](https://docs.livekit.io/transport/media/publish/#track-permissions).

**Examined:** subscription permissions and default accessibility. Ordinary published tracks are broadly subscribable unless restricted. The game needs a trusted enforcement path for changing hearing audiences; client volume and voluntary subscription behavior are not confidentiality controls.

## Additional foundations and adjacent research

<a id="s47"></a>
### S47 — Broad-Phase Collision Detection with CUDA

NVIDIA GPU Gems 3, chapter 32. [Chapter](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-32-broad-phase-collision-detection-cuda).

**Examined:** broad/narrow-phase and spatial-subdivision explanation. Conservative candidate reduction is valuable; dense overlap retains a quadratic worst case. The chapter's historical GPU implementation is not a recommendation to move OpenLegend collision to CUDA.

<a id="s48"></a>
### S48 — D* Lite

Sven Koenig and Maxim Likhachev, AAAI 2002. [Author publication record](https://idm-lab.org/bib/abstracts/Koen02e.html).

**Examined:** primary abstract. Incremental repair can reuse pathfinding work after changes. The current navigation provider, geometry invalidation, actor capabilities and knowledge constraints still need an implementation-specific comparison.

<a id="s49"></a>
### S49 — RING: A Client-Server System for Multi-User Virtual Environments

Thomas A. Funkhouser, Symposium on Interactive 3D Graphics, 1995. [Author paper page](https://gfx.cs.princeton.edu/pubs/Funkhouser_1995_RAC/index.php) · [Project](https://www.cs.princeton.edu/~funk/ring.html).

**Examined:** author abstract/project description. Visibility-based communication reduction provides historical context for spatial interest management. Static visibility techniques require extension for mutable buildings, hearing and private evidence.

<a id="s50"></a>
### S50 — A Scalable Server for 3D Metaverses

Ewen Cheslack-Postava et al., USENIX ATC 2012. [Proceedings](https://www.usenix.org/conference/atc12/technical-sessions/presentation/cheslack-postava).

**Examined:** primary abstract and architecture summary, not an implementation audit. Sirikata's query-based, visible-size approach motivates a broader vocabulary than a fixed distance bubble. Visible significance remains distinct from permission to know an entity exists.

<a id="s51"></a>
### S51 — From 101 to nnn: A Review and a Classification of Computer Game Architectures

Meng Zhu, Alf Inge Wang and Hong Guo; online 2012, Multimedia Systems 19, 2013. [Publisher record](https://link.springer.com/article/10.1007/s00530-012-0274-0).

**Examined:** abstract and bibliographic material; full article was not available. A survey/navigation source for architecture vocabulary, not primary proof of every implementation it classifies. Use the original papers for concrete protocols.

<a id="s52"></a>
### S52 — Distributed Snapshots: Determining Global States of a Distributed System

K. Mani Chandy and Leslie Lamport, ACM Transactions on Computer Systems 3(1), 1985. [Author publication page](https://www.microsoft.com/en-us/research/publication/distributed-snapshots-determining-global-states-distributed-system/) · [Caltech record](https://authors.library.caltech.edu/records/4chat-vem22).

**Examined:** author discussion and abstract; not a new proof or implemented snapshot protocol. The consistent-cut concept is valuable when several owners and in-flight transfers must be captured coherently. It does not by itself specify game restore or external billing semantics.

<a id="s53"></a>
### S53 — Dynamo: Amazon's Highly Available Key-Value Store

Giuseppe DeCandia et al., SOSP 2007. [Author-hosted paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf).

**Examined:** relevant availability and application-reconciliation overview. A useful contrast to strict transactional designs. Dynamo the paper is not the current DynamoDB product, and reconciliation does not automatically preserve unique-item invariants.

<a id="s54"></a>
### S54 — PostgreSQL 18 Continuous Archiving and Point-in-Time Recovery

PostgreSQL project. [Documentation](https://www.postgresql.org/docs/18/continuous-archiving.html).

**Examined:** backup/WAL/recovery guidance. Database recovery is only part of world recovery: external artifacts, admitted jobs, erasure overlays and game-version interpretation also need a coherent boundary.

<a id="s55"></a>
### S55 — Unbiased Deterministic Total Ordering of Parallel Simulations with Simultaneous Events

Neil McGlohon and Christopher D. Carothers, arXiv:2105.00069, 2021. [Paper record](https://arxiv.org/abs/2105.00069).

**Examined:** abstract. Simultaneous-event tie-breaking can affect model outcomes as well as reproducibility. This does not prescribe the game's competitive fairness policy or prove all deterministic orders are equally suitable.

<a id="s56"></a>
### S56 — Parallel Discrete Event Simulation

Richard M. Fujimoto, Winter Simulation Conference tutorial, 1989, pages 19–28. [Publisher locator](https://doi.org/10.1145/76738.76741).

**Examined:** indexed publisher abstract/bibliographic record; full tutorial access was unavailable. A foundational pointer to conservative/optimistic simulation protocols. Detailed protocol selection needs further reading and explicit lookahead, rollback and irreversible-effect analysis. No performance result is imported.

<a id="s57"></a>
### S57 — FoundationDB: A Distributed Unbundled Transactional Key Value Store

Jingyu Zhou et al., SIGMOD 2021. [Project-hosted paper](https://www.foundationdb.org/files/fdb-paper.pdf).

**Examined:** section 4 and its simulator diagram, including stated limitations. Deterministic execution with controllable network/disk/time faults is especially relevant to preserving correctness as ownership evolves. Simulation testing does not replace actual performance testing or validate every external dependency.

<a id="s58"></a>
### S58 — Spanner Schema Design Best Practices

Google Cloud, official documentation. [Guide](https://docs.cloud.google.com/spanner/docs/schema-design).

**Examined:** relevant key-distribution/locality guidance. Physical key design can create or avoid concentrated writes. Logical stable IDs, secondary indexes and transaction locality all need review; choosing a UUID alone is not a complete partitioning strategy.

<a id="s59"></a>
### S59 — Prometheus Instrumentation Best Practices

Prometheus project. [Guidance](https://prometheus.io/docs/practices/instrumentation/).

**Examined:** relevant instrumentation/cardinality guidance. Per-actor or per-memory metric labels can create an unmanageable monitoring workload. Preserve fine-grained diagnosis through appropriately scoped logs/traces rather than unbounded metric dimensions.

<a id="s60"></a>
### S60 — LLM Prompt Injection Prevention Cheat Sheet

OWASP. [Guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

**Examined:** relevant content/authority separation and defense-in-depth guidance. Books, speech and memories are untrusted content. Restrict tools and validate admitted effects; prompt wording alone cannot guarantee that a model will not follow hostile content.

<a id="s61"></a>
### S61 — Building the Halo 4 Services with Orleans

Caitie McCaffrey, Øredev 2014. [Conference session record](https://archive.oredev.org/oredev2014/2014/sessions/building-the-halo-4-services-with-orleans).

**Examined:** speaker/session abstract only; video not watched. A production-services lead for further study. Do not describe Orleans' service role as evidence that Halo's complete realtime physics runs through virtual actors.

<a id="s62"></a>
### S62 — Towards Billion-Scale Social Simulations

Toyotaro Suzumura, Charuwat Houngkaew and Hiroki Kanezashi, Winter Simulation Conference 2014. [IBM Research record](https://research.ibm.com/publications/towards-billion-scale-social-simulations).

**Examined:** primary abstract/results summary. The billion-agent case uses a specialized classical traffic model and substantial parallel hardware. Useful for activation/locality ideas, not evidence of a billion generative minds.

<a id="s63"></a>
### S63 — ACORN: Performant and Predicate-Agnostic Search Over Vector Embeddings and Structured Data

Liana Patel, Peter Kraft, Carlos Guestrin and Matei Zaharia, 2024. [Paper record](https://arxiv.org/abs/2403.04871) · [Publisher](https://doi.org/10.1145/3654923).

**Examined:** abstract and method summary. Filter-aware vector retrieval deserves a benchmark when eligible memories are a small structured subset. Faster filtering is not an authorization boundary; policy/version checks remain necessary.

<a id="s64"></a>
### S64 — FreshDiskANN: A Fast and Accurate Graph-Based ANN Index for Streaming Similarity Search

Aditi Singh et al., arXiv:2105.09613, 2021. [Paper record](https://arxiv.org/abs/2105.09613).

**Examined:** abstract. Mixed search, insert and delete workloads are a closer benchmark lead than a static billion-vector corpus for continuously evolving memories. Maintenance and source revocation still need separate application guarantees.

<a id="s65"></a>
### S65 — In-Place Updates of a Graph Index for Streaming Approximate Nearest Neighbor Search

Haike Xu et al., arXiv:2502.13826, 2025. [Paper record](https://arxiv.org/abs/2502.13826).

**Examined:** abstract. In-place graph updates are another candidate for evaluating memory churn and maintenance cost. This entry is a research lead, not a recommendation to replace pgvector or a claim that its deletion behavior satisfies all game privacy requirements.

## Evidence limitations and follow-through

A useful next implementation review should re-open the full paper and pinned implementation for any technique selected from abstract-only entries. Reproduce its relevant assumptions with OpenLegend data before accepting a capacity claim. Search/index quality, character behavior, privacy and distributed correctness need different tests; a result in one does not certify the others.

The [research gaps](research-gaps.md) distinguish inaccessible details and unmeasured hypotheses from known architectural constraints. The [benchmark plan](benchmark-plan.md) turns the strongest lessons into proposed, reproducible experiments. No third-party paper text, images or game assets are redistributed in this dossier.
