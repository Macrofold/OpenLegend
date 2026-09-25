# LATER: planetary memory volume without planetary queries

[Research index](../README.md) · Conditional storage expansion beneath the [memory semantics](../../../../docs/memory-architecture.md) and D2/D6. A billion retained records is not a reason to invent a new character-memory model.

## Follow the access pattern

Most character recall is scoped to one actor and a limited set of permitted shared sources. Preserve that locality physically. Route to a bounded set of storage partitions, retrieve eligible records and rank within that corpus. A billion-record global dataset can still support small ordinary queries.

Use stable logical IDs and a placement layer. Group many actors into a manageable number of physical partitions; split or move groups when measured size and access justify it. Avoid a physical table/index per NPC and avoid a global ANN query that must search everything before discovering what the actor is allowed to know.

The current exact scoped vector store is a useful baseline. Replace it only after measuring candidate-list overhead, corpus size, update/delete cost and recall latency. Approximate search is one option for large eligible corpora, not a mandatory badge of scale.

## Different data has different lifecycle

Keep active commitments and required continuity readily available. Recent evidence and frequently recalled memories may remain in transactional/search storage. Older immutable source segments can move to archive with scoped readers and appropriate access latency. Rebuildable embeddings and lexical indexes can have their own lifecycle.

Cold does not mean forgotten. A character may need an old promise or significant experience, and the semantic owners define that requirement. Do not silently age out required knowledge to satisfy a storage budget. Where archive retrieval is slower, represent the operational state honestly rather than inventing an answer.

Source sharing can reduce duplicated payloads, but acquisition identity/detail still matters. An event heard by a crowd is not one identical memory automatically owned by everyone in the world.

## Design for growth rate and maintenance

The [capacity arithmetic](../capacity-model.md) shows why ingestion dominates: a million agents acquiring one record per real minute creates 1.44 billion records per day. A system sized for a billion static vectors may fill in less than a day under that illustrative policy.

Measure source bytes, acquisition edges, summary bytes, vector/index amplification, replicas, journals, backups and temporary rebuild space. Include corrections, deletes and compaction, not just append throughput. A maintenance operation that takes days can become the practical limit before storage is full.

Partition history for efficient scoped reads and lifecycle operations. Preserve indexability by actor, event/source reference, time and relevant entity relationships. Large fanout reports and analytics should use separate read paths, not become blocking scans on the simulation database.

## Search technology selection

HNSW can be appropriate when its memory/update profile fits. SSD-oriented graph search can reduce resident vector requirements. Quantization trades representation accuracy for footprint. GPU-based search can favor batched workloads. None automatically supplies the required permissions or deletion semantics. [S24](../sources.md#s24), [S25](../sources.md#s25), [S26](../sources.md#s26)

Benchmark real private-scope selectivity and adversarially sparse matches. Compare approximate recall against exact eligible search, including mandatory evidence. Report p99 latency, not only mean throughput. Distinguish cold index startup from warmed-cache results.

A model change may require dual embeddings, dual indexes and a backfill while live ingestion continues. Record source-text revision, model and dimensions; suppress stale publication after correction. Measure the time and temporary capacity to complete this operation before promising frequent model upgrades.

## Erasure and lineage at scale

Maintain enough lineage to invalidate derivatives after source correction or forgetting under the chosen policy. Serving paths must check the current applicable overlay even while background deletion propagates. Apply the same restrictions during archive restore and index rebuild.

Tombstones and lineage graphs also consume space and query time. Compact them only through a policy that preserves the ability to reject obsolete sources. Keep operational erasure distinct from a fictional character choosing not to think about something.

## Migration and disaster recovery

Move a storage partition with stable routing and a clear writer cutover. Verify that actor recall cannot temporarily join evidence from the wrong world/timeline. Resume backfills from durable watermarks and stable batch identities.

Recovery must restore source data, permissions/overlays and index build boundaries coherently. Indexes may be rebuilt, but the game needs a declared degraded retrieval mode during that work. Native continuation can remain available where its required state is intact.

## Expansion trigger

Adopt a separate memory/search service when measured storage, query, maintenance or operational isolation needs exceed the current deployment—not because the forecast has many zeros. Demonstrate the new system with live ingest, deletion, cold wake, long-tail recall and failure recovery before moving all characters.
