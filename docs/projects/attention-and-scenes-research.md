# Attention and scenes — supporting research and alternatives

| Status      | Current progress                                                                                               | Last updated |
| ----------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Primary-source research and three design reviews are complete; runtime and capacity qualification remain open. | 2026-10-25   |

## Question and evidence boundary

How can a character follow a deer, notice an unfamiliar object and remember a conversation without accumulating a permanent recording of everything nearby? The developer requires a reliable recent sequence during deliberate continuous watching; older detail may fade. Bounded background AI or embedding work is allowed when its benefit justifies its complete cost. These decisions do not require an AI call for each observation.

The [feature specification](attention-and-scenes-feature-spec.md), [technical design](attention-and-scenes-tech-design.md) and [base-world profile](../worlds/base/attention.md) own the proposed contract. This study compares mechanisms and records review reasoning. It does not establish runtime delivery, implementation approval, a biological model or qualification for hundreds of densely interacting actors over ten simulated years.

## Primary-source ledger

Each entry distinguishes a useful mechanism from assumptions OpenLegend cannot import.

1. **Soar episodic memory — architecture and implementation.** The [manual](https://soar.eecs.umich.edu/soar_manual/07_EpisodicMemory/) describes automatic recording of symbolic experience and deliberate, time-relative retrieval. [Derbinsky and Laird (2009)](https://web.eecs.umich.edu/~soar/sitemaker/docs/pubs/iccbr09.pdf) analyze incremental storage and retrieval. Reusing unchanged structure is useful; symbolic input already supplied to Soar does not solve physical perception. The manual explicitly retains potentially linear history searches and combinatorial structural matching, rather than promising bounded lifetime cost.

2. **Structured Event Memory — Franklin et al. (2020).** [SEM](https://gershmanlab.com/pubs/Franklin20.pdf) learns event dynamics over structured scenes and uses prediction to infer boundaries and reconstruct experience. This supports separating later event interpretation from individual measurements. Its reconstruction deliberately combines incomplete traces with learned expectations. That is a model of fallible recollection, not a suitable replacement for exact evidence about what this character actually received.

3. **Unreal Engine perception.** Epic's [stimulus record](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/FAIStimulus) separates sensed locations, age, expiration and loss of sensing. Its [sight implementation documentation](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/AIModule/UAISense_Sight) describes splitting in-range and out-of-range work to reduce sorting of observer–target queries. These are useful current-perception lifecycle and scheduling examples. Latest stimuli do not provide reliable recent chronology, and the documented pair-growth problem remains relevant even with bounded attention.

4. **F.E.A.R. — Orkin (2005).** [Agent Architecture Considerations for Real-Time Planning in Games](https://cs.engr.uky.edu/~sgware/reading/papers/orkin2005agent.pdf) combines event-driven and polled sensors, cached facts and incremental expensive calculations. Planning reads prepared results instead of repeatedly performing geometry. The transferable lesson is to separate inexpensive fact maintenance from expensive decisions and account for reaction delay. Its tactical facts and authored categories are not autobiographical memory or open-ended semantic understanding.

5. **The Sims — Forbus and Wright (2001).** [Programming objects](https://users.cs.northwestern.edu/~forbus/c95-gd/2001/Programming%20Objects%20in%20The%20Sims.pdf) places behavior and advertised benefits with authored objects, allowing new objects to participate without rewriting every person. This supports world-owned meanings and affordances. It does not show that a character can infer the function or personal significance of an arbitrary new portrait, plant or anvil from an identifier or a generic native ranking formula.

6. **Comme il Faut / Prom Week — McCoy et al. (2014).** [Social Story Worlds With Comme il Faut](https://cs.uky.edu/~sgware/reading/papers/mccoy2014cif.pdf) queries timestamped social history using authored categories and temporal relationships. It demonstrates useful reasoning about prior exchanges. Its core social-history account assumes events immediately become known to every character. OpenLegend must apply such queries to individually permitted evidence; importing that shared knowledge would disclose private encounters.

7. **Talk of the Town — Ryan et al.** [Toward Characters Who Observe, Tell, Misremember, and Lie](https://expressiveintelligence.github.io/papers/ryanEtAl_TowardCharactersWhoObserveTellMisrememberLie.pdf) distinguishes personal observation, communication, belief and memory fallibility. It describes a simulated town reaching approximately 200 residents over decades. This is useful evidence for personal knowledge and social propagation, but its coarse simulation and then-unimplemented gameplay do not qualify dense, continuously sampled physical encounters or this project's complete runtime costs.

8. **Generative Agents — Park et al. (2023).** [Smallville](https://arxiv.org/html/2304.03442) stores textual observations, scores importance with an LLM, embeds memories and retrieves using relevance, recency and importance. Reflections cite earlier records. Its 25-agent, two-day experiment illustrates coherent social behavior alongside substantial historical inference expense. The per-observation semantic work and growing memory stream are unsuitable as an assumed cheap default; source-citing reflection remains useful as optional interpretation.

9. **AgentSociety.** The [paper](https://arxiv.org/html/2502.08691v2) separates chronological event descriptions from linked personal interpretations and describes grouped asynchronous execution and batched persistence. Large-population experiments demonstrate engineering for many communicating agents under specified workloads. They do not demonstrate per-observer recording of a dense physical world, faithful lifelong source retention or OpenLegend's latency target. Population count alone cannot substitute for encounters, event rates and complete cost.

10. **Voyager — Wang et al. (2023).** [Voyager](https://arxiv.org/html/2305.16291) combines current structured Minecraft information, execution feedback, a success critic and retrieval of verified program skills through embedded descriptions. This supports separating actual results from generated interpretations and indexing permitted descriptions. Its high-level game APIs and familiar Minecraft concepts do not solve unfamiliar authored realities; generated executable programs are also outside OpenLegend's trusted action boundary.

11. **LongMemEval.** The [benchmark and experiments](https://arxiv.org/html/2410.10813) distinguish extraction, temporal reasoning, knowledge updates and abstention. Replacing original conversation material with summaries or extracted facts often loses detailed answers; augmenting retrieval keys while keeping original values can help. This supports retaining exact recent material separately from search descriptions. Chat-history experiments do not establish streaming physical-world capacity, privacy or a lifetime deletion policy.

## Two actual storage alternatives

Both alternatives first accept every fact delivered by physical and physiological rules, with its original observation references unchanged. All current facts remain available according to their actual support. Attention selects what receives further consideration; it cannot retrospectively narrow what was physically received. Neither alternative needs a narrative episode boundary before writing an ordered record.

**Selective recent chronology — recommended.** Keep temporary temporal detail for followed subjects, deliberate watching, interactions and independently required evidence. Maintain stable, bounded attention before expanding optional descriptions or comparing meaning. Record received discrete events in order, with their actual scene and interaction context; maintain supported time-aware movement information alongside them. Unselected routine surroundings retain current facts without an automatic temporal diary.

This reduces optional writing when followed subjects are a small fraction of everything perceived. Its real cost is a choice about future recollection: a quiet kitchen incident that seemed irrelevant may become unrecoverable after its current evidence disappears. Discovery opportunities, explicit focus and ordinary thinking reduce that risk; they cannot eliminate it or restore discarded facts. An unfamiliar person must remain unfamiliar unless received evidence supports recognition.

**All-acquired bounded journal — credible alternative.** Temporarily retain the ordered changes and discrete events for all physically received facts, then select attention and meaning from that journal. A character can reconsider a previously ignored plant or kitchen occurrence while the record remains available. This gives stronger retrospective coverage and reduces irreversible early selection mistakes. It pays storage, write, indexing and privacy-management costs for all received changes, including dense irrelevant activity. A finite time window alone does not bound those costs.

Use lossless change records and bounded write chunks where appropriate in either alternative. Do not assume a compression ratio or collapse a watched approach, pause and departure into two endpoints. A deer stopping while visible differs from disappearing behind cover. A later sentence describing that interval is derived interpretation; exact speech remains linked to its own source.

Latest-fact-only memory fails the recent-sequence requirement. A model summarizing every observation adds work without guaranteeing fidelity or lifetime expiry. Learned event segmentation is a possible later interpreter, but is unnecessary for preserving chronology and must not reconstruct missing facts as observation.

## First slice and optional semantic work

The first slice should use native recent chronology for required events, admitted watching and interaction, with existing thinking calls interpreting selected evidence. This is an incremental delivery of the preferred alternative, not a third storage architecture. It avoids making model availability a prerequisite for truthful recent recollection. It can be less responsive to subtle personal relevance between thinking opportunities.

Embedding-based comparison or small batched LLM interpretation can be added independently if useful. Embeddings may rank a permitted portrait description against permitted interests or recollections; they cannot reveal a hidden subject or function. A batch can suggest importance, labels or a later grouping, while preserving exact references and uncertainty. No candidate uses compiled personality/history matching as a substitute for interpretation, and none requires a call per frame or observation.

For the hypothetical anvil-versus-plant choice, native selection can use received salience, current work and explicit focus. A semantic comparison may identify a personal connection only from available descriptions and knowledge. When these do not distinguish the objects, the result remains uncertain. There is no privileged relevance oracle.

## Resource and fidelity conditions

For a recent window of duration `W`, average record size `b` and received change rate `r`, retaining everything requires approximately `W × r × b` per actor. Selective retention replaces `r` with the admitted selected/required rate, plus selection bookkeeping. Use the same clock units for `W` and `r`, then convert throughput separately for simulation speed. These are accounting relationships, not measured capacities. Unchanged current facts, required source dependencies, lasting memories, identities, correction records, search indexes, pending work and saved copies add separate costs.

Reliable watching needs reserved capacity for the supported source-rate and byte envelope. Previously followed histories still occupy the aggregate recent budget after their live slots are reused. On overload, report incomplete technical coverage without inventing a fictional interruption; do not silently present endpoints as complete coverage. Prompt prominence and continued recording are separate: an urgent interruption can change what a character thinks about without silently cancelling an admitted watch.

The world-owned starting hypotheses are ten total optional slots—five soft ongoing reservations, four competing salient subjects and one discovery opportunity—and six game hours of recent detail, six normal-play minutes at the base world's 60× clock. These require qualification, including faster simulation, source bursts and variable record size. They are not biological facts or engine-wide limits.

Older optional detail can expire, but bounded total storage is impossible while nonzero-rate speech or person-encounter obligations remain permanent. Their lifetimes must be reconciled explicitly. Expiration must remove unused derivatives, references and indexes, while retaining minimum support for still-valid learned knowledge, accepted commitments and required accounts. Asynchronous interpretation must capture bounded permitted inputs and reject publication after correction, forgetting or invalidation. No rejected-observation archive may quietly restore lifetime growth.

## Recorded design reviews

**Round 1 — resource and fidelity challenge, complete.** Slot counts and a time window were insufficient bounds. The design now distinguishes unchanged physical receipt, selected temporal recording, later interpretation and durable admission. Continuous watching requires ordered supported detail, explicit overload and accounting for retained source dependencies and asynchronous work. Learned event reconstruction cannot stand in for exact observation.

**Round 2 — independent alternatives, complete.** Broad temporary recording is a credible competitor, with stronger retrospective coverage and higher all-source cost. Selective chronology remains recommended with its real loss of unselected temporal detail acknowledged. Native chronology is the first implementation slice; optional background semantics is independently assessable. Narrative grouping and lossy summaries are unnecessary prerequisites. No ten-year bound is claimed while required retention lifetimes remain unresolved.

**Round 3 — complete, October 25, 2026, 18:06 EDT.** Reviewed the actual paired design, world profile and tracker against the original goals. Fixed an additional retention loophole: histories promised to former watched subjects remain charged after their live slots are reused. Aligned rate/window clock units and clarified that core subject-following grants no future physical gaze/watch mechanics. All three independent reviewers found no remaining design blocker after corrections. Runtime behavior, semantic usefulness, tuning and population/lifetime capacity remain unqualified.

## Maintained records

[PS04-A implementation work](../maintainers/product-scalability.md#ps04-a--core-attention-and-recording) tracks delivery. The [feature specification](attention-and-scenes-feature-spec.md), [technical design](attention-and-scenes-tech-design.md), [world profile](../worlds/base/attention.md), [product limits](../limits/product-scalability.md) and [memory architecture](../memory-architecture.md) remain the policy and acceptance owners. No game/provider calls or runtime stress tests were performed for this study; game/provider spend is $0.
