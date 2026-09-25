# SOON: migrate data without losing the world

[Research index](../README.md) · Coordinate with [D1–D4](../../../../docs/maintainers/production-data.md) and [save/load](../../../../docs/maintainers/save-and-load.md). No migration is implemented by this document.

## Migration correctness includes meaning

Preserving row counts is necessary but insufficient. Preserve entity identity, ownership, material quantities, action progress, content versions, event order, actor acquisition, private memory lineage, protected commitments and outstanding operation outcomes. A migrated world that looks similar but teaches everyone the same secrets is corrupt.

The existing prototype storage can evolve toward normalized production records incrementally. Do not maintain two independent writable truths for the same fact. An expand/contract migration should identify which representation owns writes at every phase and how the other is derived.

## Proposed migration procedure

1. Freeze the relevant logical contract and define a versioned source-to-target mapping. Record unsupported source cases explicitly.
2. Capture a coherent source boundary, including durable head, schema and rule/content pins. Preserve the original for recovery under approved retention.
3. Import into an empty target with stable identities and deterministic transformations. Record provenance and migration version.
4. Validate counts, checksums, references and semantic invariants. Reconstruct public and private views for comparison.
5. Catch up subsequent changes through a controlled journal/outbox path or use a bounded maintenance window. Do not improvise unsynchronized dual writes.
6. Fence the old writer, verify the final boundary, switch routing and allow only the new authority to commit.
7. Observe and reconcile. Roll back only through a defined compatible path that accounts for writes and external effects since cutover.

For early small worlds, a brief explicit maintenance window may be safer than a complex zero-downtime migration. The goal is reliable evolution, not the appearance of uninterrupted availability at any cost.

## Test the hard records

A resource already reserved for an action must not reappear as spendable inventory. A partially consumed fuel source must not reload from its full definition. An active process needs its remaining work and relevant clock, not merely its original duration.

A learned recipe points to a compatible immutable definition/version. A remembered name remains observer-specific. A heard utterance retains event-time audience and detail even if current membership or geometry differs. A canceled or completed job should not become eligible again because its old queue entry was imported.

Replay historical resolved outcomes rather than asking models to re-create them. Any deterministic replay claim should pin the engine and rule versions, ordering and randomness dependencies required for that claim.

## Migrations and concurrent workers

An embedding backfill, summary job or generated asset can finish while its source is migrating or being corrected. Publish only against the appropriate source revision and current authority/timeline. Keep watermarks and resumable batch identities so a failed backfill does not restart unbounded work or duplicate accepted output.

Measure database load and replication lag during migration. Throttle background batches independently from live gameplay. Large index construction may need temporary space for both old and new indexes, and enough I/O headroom to avoid starving commits.

PostgreSQL partition maintenance and recovery documentation provide concrete operational constraints, but the exact migration must be tested with the chosen engine version and schema. [S34](../sources.md#s34), [S54](../sources.md#s54)

## Save, backup, fork and migration are different operations

A backup restores an operational data boundary. A player save restores a fictional timeline under game policy. A fork creates a new lineage. A migration preserves logical identity while changing representation or placement. Treating these as the same “load JSON” function creates subtle duplication and permission bugs.

External entitlements, paid request outcomes, account bans, revoked credentials and erasure overlays do not automatically rewind with fictional time. Define which records remain outside a player-restorable world. Carry stable references into the restored timeline without resurrecting already consumed external rights.

A fork can copy a character's fictional history only under appropriate permissions. It should not claim that both copies are the same globally unique exported asset or the same active owner. Cross-world economic policy must be settled before such exports are enabled.

## Exit evidence

Use a fixture containing active actions, old history, private evidence, deleted sources, multiple definition versions, unknown external outcomes and duplicate request attempts. Restore into an empty environment, compare authoritative outcomes and permitted views, and rerun migration safely.

Demonstrate both interruption recovery and rejection of stale workers. Keep a migration report with source/target versions, counts, conservation checks, unresolved cases and recovery instructions. Do not mark a production phase complete based only on a successful SQL script.
