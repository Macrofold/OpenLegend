# Persistence, transactions, consistency and recovery

[Research index](../README.md) · Proposals beneath the existing [production data model](../../../07-technical-architecture/production-data-model.md). Do not create a competing schema or close D0–D6 through this research.

## Decide invariants before choosing a database

The game does not need the same consistency for every field. Classify an operation by the consequence of disagreement, its authority, and whether the result can be safely merged.

| Operation | Required property | Candidate implementation boundary |
|---|---|---|
| Consume the final resource; transfer a unique item | No double spending or ownership | Serial owner decision plus atomic durable mutation/receipt |
| Publish a world's next committed transition | Only current authority may advance the durable head | Ownership generation and expected-head check |
| Acquire private speech evidence | Correct event-time audience and permitted detail | Owning occurrence/acquisition boundary |
| Complete an AI job | At most one accepted effect for the operation | Durable attempt, receipt and admission transaction |
| Update a cosmetic transform | Newer applicable state supersedes older samples | Versioned replaceable projection |
| Show a remote market listing | May be stale, but purchase must revalidate | Read model plus authoritative purchase/reservation |
| Search private memory | Only eligible, uncorrected source revisions | Scoped index and publication revalidation |
| Refresh aggregate population statistics | Bounded staleness may be acceptable | Asynchronous projection with freshness metadata |

These are recommendations to reconcile with each mechanic's specification. Coordination-avoidance research is useful precisely because it starts from invariants. A mergeable counter and a conserved inventory are not automatically the same problem. [S31](../sources.md#s31), [S32](../sources.md#s32)

## PostgreSQL first is compatible with a large eventual game

One transactional database can support a meaningful multiplayer release while the application establishes its access patterns. Normalize the identities, ownership, references, quantities, versions and hot query keys that must be constrained or indexed. Versioned bounded payloads can hold less frequently queried mechanic-specific state. Avoid both a giant perpetually rewritten history document and a universal attribute table that makes every action an expensive join.

The root world object is a useful domain interface today. It need not dictate physical storage forever. Incremental commits and bounded repository readers can evolve beneath it. A normalized table does not require an independently deployed microservice.

Be deliberate about isolation. PostgreSQL's default Read Committed does not make every multi-query game workflow serializable; stronger isolation can abort transactions and require whole-transaction retry. The operation's stable identity must survive that retry. Never hold a database transaction open while waiting for an LLM or a human confirmation. [S33](../sources.md#s33)

## Logical partitioning is not physical sharding

World scope, actor scope and historical time ranges belong in record identity/access contracts early. Physical table partitioning, separate database clusters and geographic replicas are later deployment choices.

Choose partitions around common predicates and lifecycle operations. PostgreSQL documents both planning overhead from too many partitions and constraints on uniqueness across partition keys. A table per NPC is therefore not the default answer to a million agents. Test partition pruning and uniqueness with the real schema rather than assuming an index will span arbitrary shards. [S34](../sources.md#s34)

A global monotonically growing first key can concentrate writes in a range-partitioned distributed store. Spanner's current guidance emphasizes key distribution and locality; it is not a blanket instruction to replace the repository's identity conventions with random values everywhere. Preserve stable logical IDs and design physical access keys for the selected store. [S58](../sources.md#s58)

## Where Spanner could fit—and where it cannot

Spanner is relevant when measured requirements demand distributed transactional state, geographic availability or scale beyond the chosen relational deployment. Its external consistency is valuable for certain durable invariants. It does not eliminate network latency, hot keys, contention, expensive queries, or the need for application ownership. [S01](../sources.md#s01), [S02](../sources.md#s02)

Keep movement and collision working sets local to their authority rather than issuing a globally coordinated transaction for every contact test. Global account entitlements and a cross-region market may have different requirements from local physical simulation. Benchmark representative transactions and failure behavior before a migration, including operational cost and dialect/tooling differences.

Dynamo is a useful contrasting paper about choosing availability and application reconciliation. It should not be confused with the current DynamoDB product or interpreted as permission to resolve duplicate unique items with last-write-wins. [S53](../sources.md#s53)

## Commit state and intent together

For a consequential operation, the authoritative mutation, its durable receipt, required evidence and any required asynchronous intent must share a defined atomic boundary. Otherwise a crash can leave an effect without a receipt or a receipt without its effect.

A transactional outbox is a candidate when work must cross a durable boundary: commit the intent locally, deliver asynchronously, acknowledge idempotently and reconcile unknown outcomes. It does not provide a magical exactly-once external network. Avoid describing a queue's delivery guarantee as the guarantee for the complete gameplay effect.

Receipt retention has a semantic window. Pruning receipts while accepting arbitrarily old retries reopens duplication. Existing epochs, retry windows and restoration generations should remain aligned. A reused request ID with different payload intent should fail clearly rather than alias an unrelated operation. [S35](../sources.md#s35)

## Recovery data is not the entire event-sourcing religion

Store a coherent checkpoint plus enough ordered admitted changes to recover the intended durable boundary. Record rule/content revisions and resolved nondeterministic outcomes. A seed alone does not reproduce a changed engine, changed model or changed event order.

The system need not log every cosmetic interpolation or rebuildable cache. Conversely, an audit line is not necessarily sufficient to reconstruct an inventory transfer. Define which records are recovery input, which are historical evidence and which are diagnostics.

Checkpoint publication should identify its exact durable head and complete referenced dependencies. Verify checksums/counts and restore into an empty target. PostgreSQL point-in-time recovery is a database capability; it does not by itself restore external asset versions, reconcile paid requests or apply the game's forgetting overlay. [S54](../sources.md#s54)

## Cross-owner effects need explicit protocols

Prefer co-locating a tightly coupled transaction. For cross-world trade or travel, use a durable operation state and a designated authority for the invariant. Escrow can reserve goods until a transfer is committed or safely canceled. Compensation is not equivalent to erasing an action: another player may already have used the received item.

Do not split both sides of every local trade across different databases by default. When cross-shard transactions become necessary, compare coordinated transactions, reservations and restricted transfer workflows against their latency and failure requirements. The [hot-world chapter](../later/hot-world.md) describes authority handoff separately from a simple read replica.

## Operational acceptance

Exercise crashes before and after durable commit, lost acknowledgments, duplicate deliveries, stale owners, partially built checkpoints, schema upgrades and old client retries. Check conserved quantities and authoritative head continuity after every fault.

A successful backup job is not a successful restore. A successful restore is not proof of a short recovery time at maximum corpus size. Measure both recovery point and recovery time, including caches, actors, search eligibility and external-work reconciliation.
