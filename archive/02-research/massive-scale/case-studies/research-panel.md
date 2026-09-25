# Research panel: compare mechanisms, assumptions and evidence

[Research index](../README.md) · This is a structured comparison of published work, not a simulated conversation with experts. No source is presented as endorsing this report's architecture. Read-depth and primary links are in the [registry](../sources.md).

## 1. What does the headline number count?

| Work | Published workload or claim | What is actually demonstrated | What remains unproven for OpenLegend |
|---|---|---|---|
| Generative Agents, 2023 | 25 characters in an interactive sandbox | Memory/reflection/planning architecture and behavioral evaluation | Production durability, hostile users, long-lived private histories and large multiplayer load |
| AgentSociety systems paper, ACL 2025 | 30,000 agents with 24 A800 GPUs | Grouped execution and a defined round-based societal workload | Player-facing subsecond response, rich continuous collision and production recovery |
| AgentScope, 2024 | Million-agent experiments | Distributed execution in a constrained guessing game; cost varies with response length | A million simultaneous open-ended dialogues or richly coupled worlds |
| Light Society v2, 2026 | Billion-agent opinion experiment | Specialized, distilled and precomputed decision execution | A billion unique, continuously deliberating autobiographical agents |
| IBM WSC 2014 | Billion-agent traffic simulation | Specialized classical spatial processing on substantial parallel hardware | LLM cognition or persistent private memory |
| DiskANN, 2019 | Billion-point search | Retrieval over a specified vector workload | Agent execution, evidence acquisition, authorization and economic consistency |

Sources by row: [S20](../sources.md#s20), [S21](../sources.md#s21), [S22](../sources.md#s22), [S23](../sources.md#s23), [S62](../sources.md#s62), [S25](../sources.md#s25). These rows are intentionally **not a ranking**: they solve different problems, and their resource/latency/quality axes are not directly comparable.

### A particularly important reading of AgentSociety

Table 1's 30,000-agent, eight-group configuration reports **251.85 seconds per round** and **123.22 seconds per LLM call** on the 24-GPU serving setup. Section 3.4 maps a round to **300 simulated seconds**. Thus its faster-than-wall-clock result does not imply prompt interactive replies. The experiment also shows failures in some more-concurrent configurations. These are means from that workload, not p99 guarantees. [S21](../sources.md#s21)

**Our implication:** keep native physical progress independent of paid deliberation, and budget admission wait separately from model execution. More concurrent tasks can exceed serving capacity instead of increasing useful work. Do not import the experiment's retry behavior into OpenLegend's no-automatic-paid-retry contract.

### A particularly important reading of Light Society

The billion-agent opinion experiment resolves its constrained interaction inputs through a precomputed table over 10,000 profiles and three stance values. The paper's 2026 revision distinguishes that specialization from general LLM execution. [S23](../sources.md#s23)

**Our implication:** a narrow, evaluated surrogate could eventually serve a repetitive background mechanic. It would need an explicit fidelity contract and must not silently replace a named character's private memory or open-ended choices. Useful specialization is not evidence that all cognition can be reduced to a lookup table.

## 2. World ownership and distribution

| Source family | Mechanism to study | Assumption or boundary to inspect | Proposed experiment |
|---|---|---|---|
| Colyseus 2006 | Primary object ownership, replica discovery and update propagation | Weak read replicas and historical game workload | Compare discovery/replication costs while authority and private knowledge remain centralized |
| Orleans 2014 | Virtual identity, activation and routing | Application persistence and failure-time ownership behavior | Competing-owner and lost-acknowledgment tests against a fenced durable head |
| Spanner | Distributed transactions and clock uncertainty | Coordination, locality, contention and geographic latency | Benchmark actual resource-transfer transactions, not only key/value throughput |
| RING / Sirikata | Visibility/extent-aware distributed interest | Geometry assumptions, mutable content and detail policies | Large landmark plus private interior with bounded permitted delivery |
| Donnybrook | Attention-based reduction in replicated detail | Approximation and trust differ from this game's evidence contract | Explore only as an explicitly different crowd mode, not a silent optimization |
| Chandy–Lamport / PDES | Consistent cuts, causal advancement and rollback analysis | Channel/order assumptions, lookahead and irreversible effects | Two-owner snapshot with an in-flight resource transfer and delayed speech |

Sources: [S03](../sources.md#s03), [S05](../sources.md#s05), [S02](../sources.md#s02), [S49](../sources.md#s49), [S50](../sources.md#s50), [S04](../sources.md#s04), [S52](../sources.md#s52), [S56](../sources.md#s56). The last family's inaccessible/full-text limitations are recorded in the registry; this table does not claim a complete protocol evaluation.

**Synthesis.** Distributing ownership is valuable where it cuts mostly independent work. It is harmful when it turns every nearby interaction into a remote coordination step. Use whole-world placement first; preserve identity independently of placement. Physical region boundaries, conversational membership and economic scope need not be the same partition.

## 3. Read the supplied Spanner paper critically

The Google gaming whitepaper distinguishes high-frequency game-server execution from persistent backend data. That is the most relevant starting point for this project. Its database examples should inform record locality, durability and scalable backend access, not replace an in-memory physics working set. [S01](../sources.md#s01)

The original Spanner paper explicitly uses Paxos and cross-group two-phase commit. TrueTime enables useful consistency/timestamp behavior; it does not abolish distributed write coordination. [S02](../sources.md#s02)

**Proposed interpretation for OpenLegend:** a world owner computes a narrow authoritative transition, then durably commits its changed records, required evidence and receipt. Later, the database implementation may become distributed if actual write scale or geographic requirements warrant it. A distributed store cannot repair an application that still scans every entity or broadcasts every event globally.

Measure which records are accessed together and which invariants cross owners. Select a transactional boundary large enough to preserve the invariant and small enough to avoid a universal lock. A global catalog of immutable recipe versions is a different workload from a unique item being simultaneously consumed and sold.

## 4. Memory research: three independent dimensions

**Representation and recall quality.** Generative Agents supplies an architecture and concrete retrieval/embellishment failure cases. LongMemEval supplies useful temporal/update evaluation dimensions. MemGPT supplies a tiering analogy. None is the authoritative model of world truth or character permissions. [S20](../sources.md#s20), [S28](../sources.md#s28), [S29](../sources.md#s29)

**Index algorithms.** HNSW, DiskANN and GPU search address retrieval performance under different resource profiles. ACORN brings structured predicates into the search problem. Exact actor-scoped ranking remains an important baseline when the global corpus is huge but an individual's eligible corpus is small. [S24](../sources.md#s24), [S25](../sources.md#s25), [S26](../sources.md#s26), [S63](../sources.md#s63)

**Lifecycle and mutation.** FreshDiskANN and in-place graph-update research motivate testing concurrent ingestion, correction and deletion rather than only a static dataset. A new index must still obey current source revisions and revocation at serving and publication boundaries. [S64](../sources.md#s64), [S65](../sources.md#s65)

### Proposed search experiment matrix

Vary eligible records per actor separately from total records. Test dense and extremely selective permissions, recent and old sources, exact entity references, paraphrases, corrected facts and multiple same-named actors. Add concurrent ingestion/deletion and old/new embedding model versions.

Compare exact eligible top-k against candidate implementations using recall@k, protected-obligation retrieval, no-answer behavior, p50/p95/p99 latency, index build/rebuild cost, memory/disk footprint and source-correctness checks. Search throughput alone cannot establish useful or private character behavior.

Do not benchmark an unrestricted global corpus and assume the result transfers to a million isolated minds. Do not conclude that a larger nearest-neighbor score makes a false memory true.

## 5. Simulation depth: exact work avoidance versus behavioral approximation

Physics and navigation sources address different layers: broad phase reduces candidates; body solvers evaluate contact; ORCA offers local avoidance; hierarchical/incremental search improves route queries. None supplies all the others. [S47](../sources.md#s47), [S16](../sources.md#s16), [S17](../sources.md#s17), [S19](../sources.md#s19), [S48](../sources.md#s48)

For this engine, distinguish an exact optimization from a changed model. Scheduling an analytically known threshold can preserve the same state and event outcomes. Updating a distant settlement statistically may intentionally discard individual detail. Both can be useful, but only the first can be treated as transparent after equivalence is proved.

**Proposed proof obligation:** identify what the cheaper representation preserves—resource totals, contact outcomes, event ordering, evidence, promises, identity, or a stated error bound. Define how it returns to detailed simulation. Test a player's intervention immediately before and after that transition. An offscreen character must not invent a past that contradicts its observed history.

## 6. Reliability research is part of the game engine foundation

FoundationDB's section 4 runs real database logic inside a deterministic environment with controllable faults and assertions. It also states important limits: this is not a substitute for performance testing or validation of every external dependency. [S57](../sources.md#s57)

**Our proposal:** keep time, randomness, disk outcomes, message delay and model results injectable around the pure domain. Begin with a small deterministic failure harness, not an attempt to rebuild FoundationDB's framework. Replay the same contested resource, actor migration, partial checkpoint and stale answer under varied failure timing.

Test safety and liveness separately. “No duplicated item” is a safety property; “a surviving owner eventually resumes useful play” is a liveness property. Refusing every action can satisfy the former while failing the game. A simulator can find ordering bugs, while realistic database/browser/provider tests establish actual service behavior.

## 7. A reading sequence tied to decisions

Start with S08, S01/S02 and the [repository audit](../repository-audit.md) to understand the present authority and deployment shape. Read S05 before adding virtual-actor infrastructure, and S06/S49/S50 before redesigning interest management. Read S20/S21/S23 before setting an agent-population promise. Read S27/S63/S64 before replacing memory retrieval. Read S57 and the [benchmark plan](../benchmark-plan.md) before claiming scale or failover safety.

Then revisit the [decision questions](../decision-questions.md). The literature does not choose whether OpenLegend allows world forks, arbitrary cross-world trade, time dilation, huge single-scene gatherings or loss of unobserved individual detail. Those product commitments determine which architectures remain viable.
