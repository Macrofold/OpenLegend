# Billions of memories: storage, retrieval and epistemic integrity

[Research index](../README.md) · The [memory specification](../../../../docs/memory-architecture.md) owns character semantics. This chapter proposes scalable implementation patterns beneath it.

## The important distinction is not SQL versus a vector database

Maintain separate meanings for objective world state, external occurrences, an observer's acquired evidence, remembered summaries, authored beliefs/identity, protected native commitments, and derived narration. A vector represents text for retrieval; it is not proof that the actor knows the text or that the text is true.

Generative Agents demonstrated memory, reflection and planning in a 25-character sandbox, while also reporting retrieval failures and embellished memories. Its useful contribution here is the cognition architecture and the need to evaluate behavior; it is not a large-scale durable memory benchmark. [S20](../sources.md#s20)

## A layered representation

Proposed physical layout, mapped onto existing production records rather than a new writable mind:

| Layer | Authority and access pattern |
|---|---|
| Source occurrence | Resolved event content, time, cause and immutable source identity |
| Acquisition/evidence | Which actor acquired which permitted detail, when and how |
| Durable memory/summary | Actor-scoped interpretation with evidence lineage and revision |
| Accepted inner world | Bounded authored continuity/identity under existing publication rules |
| Protected obligations | Native promise/debt/appointment lifecycle, not only summary prose |
| Recall index | Rebuildable lexical/vector/structured projection of eligible source revisions |
| Archive | Long-lived source/history segments with scoped, bounded readers |
| Erasure/correction overlay | Durable invalidation applied to serving, reindexing and restoration |

Some common source text can be stored once. Per-observer acquisition cannot always be deduplicated: one listener understands an utterance, another only hears an unidentified voice, and a third infers intent incorrectly. Preserve these differences.

## Retrieval pipeline

1. Establish actor, world/timeline, disclosure scope and relevant revision boundary.
2. Select eligible sources using indexed ownership/acquisition constraints.
3. Retrieve candidates using exact vector similarity, lexical matching, structured references, recency and explicit obligations as appropriate.
4. Deduplicate evidence lineage and rank within the already authorized corpus.
5. Assemble the bounded context, retaining required identity, current conversation and protected commitments.
6. Revalidate corrections/forgetting and applicable publication permissions before a delayed answer is admitted.

This is a logical pipeline, not six network services. A compact SQL query plus application assembly may suffice initially.

The inspected PostgreSQL vector adapter already scopes and checks source revisions before exact ranking. Preserve that property. An unfiltered global ANN query followed by filtering may return too few relevant private memories and is not an acceptable privacy architecture. The pgvector documentation explains how approximate indexing and filtering can reduce returned matches and describes iterative scans; those features still need workload-specific recall tests. [S27](../sources.md#s27)

## Exact search can remain sensible at huge global scale

A billion memories spread across a million actors may mean roughly a thousand eligible records per actor. The global corpus is enormous; the ordinary query corpus may be small. Indexed routing to a small actor/world partition followed by exact search can be simpler and more faithful than a global approximate graph.

Do not infer that every actor should have a separate database, physical table or HNSW index. Group actors into bounded physical partitions with stable routing. Benchmark large allowed-source-ID payloads in the current adapter; relational acquisition joins or materialized scoped eligibility can avoid repeatedly serializing a huge list, provided corrections remain authoritative.

Shared public knowledge, world lore and actor-private memories may need different indexes and update policies. Search each permitted corpus through its own contract and combine the results without confusing public facts with private experience.

## When approximate search is justified

HNSW, compressed GPU indexes and SSD-oriented DiskANN offer different RAM, storage, build and latency tradeoffs. They do not solve transaction semantics, source versioning or permissions. Choose based on the real per-query corpus, update/delete rates, filtering selectivity and quality requirements. [S24](../sources.md#s24), [S25](../sources.md#s25), [S26](../sources.md#s26)

Evaluate recall@k against exact authorized search, as well as downstream character behavior. Mandatory promises and exact named references should have deterministic retrieval paths rather than depending entirely on embedding similarity. A newer embedding model can require dual indexes, backfill and extra temporary storage; preserve the model/dimension/text revision with every vector.

Avoid re-embedding transient geometry. The existing memory design refreshes spatial descriptions while allowing embeddings to omit relative position. Cache stable semantic content, then attach current permitted geometry separately. Do not let a cached name or identity cross an observer boundary.

## Consolidation is a correctness workflow

Consolidation should read a bounded, versioned source interval and publish a summary with lineage, a processed watermark and concurrency checks. New events arriving during consolidation must remain available. A stale summarizer must not overwrite newer accepted character continuity or resurrect a forgotten source.

Summaries are not lossless compression. Specify what must survive: commitments, significant identity, contradictions, uncertainty, relationships grounded in experience and unresolved plans under their existing owners. Preserve source access where required rather than trusting a prose summary as the only surviving truth.

Use native text construction for routine factual events where feasible. Background model cleanup should not consume the player's immediate-response budget without policy. If cleanup falls behind, preserve required sources and expose backlog; do not stop walking merely because optional consolidation is delayed.

## Forgetting, correction and restoration

Deleting one vector does not erase every derivative. Track dependencies into summaries, inner-world revisions where policy requires, narrator output, caches, exported reports and generated media. A privacy overlay must remain effective when an old snapshot or archive segment is restored.

Different operations have different meanings: character forgetting, correction of a false source, account deletion and removal from a public search index are not interchangeable. The exact legal and product policies require separate approval; this report is not legal advice or a retention authorization.

Restore tests should verify that revoked knowledge does not return through a cold embedding backfill or cached summary. Versioned source manifests and tombstones need bounded compaction so the deletion mechanism itself does not become unbounded hot state.

## Evaluate memory as behavior, not only nearest neighbors

LongMemEval evaluates temporal reasoning, updates and long-term retrieval in assistant memory; these are useful inspirations for a game-specific evaluation suite, not a ready-made score for an NPC society. MemGPT offers a memory-tiering analogy, not an authoritative world/evidence model. [S28](../sources.md#s28), [S29](../sources.md#s29)

Create tests for remembering a promise, distinguishing rumor from observation, learning a corrected name, forgetting a secret, keeping two same-named people distinct, honoring a later change of mind and answering appropriately after a long absence. Measure retrieval quality, disclosure violations, input tokens, p99 latency and cost jointly.

The eventual goal is not maximum recall of everything ever stored. It is reliable, bounded access to what this character is entitled and expected to remember, with explicit limits and preserved continuity. See [planetary memory rollout](../later/planetary-memory.md).
