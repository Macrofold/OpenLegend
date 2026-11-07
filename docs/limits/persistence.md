# Persistence, checkpoints and recovery: limits and constraints

The [bookkeeping implementation](../projects/bookkeeping-simplification-feature-spec.md) replaces journal/application and evidence-layout bookkeeping. BKS entries describe current engineering bounds; [BK](../maintainers/production-data.md#bookkeeping-simplification) retains operating qualification. PF17-J01 is historical.

[Feature contract](../save-and-load.md) · [Implementation work](../maintainers/save-and-load.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [checkpoint-format.ts](../../apps/server/src/checkpoint-format.ts), [save-files.ts](../../apps/server/src/save-files.ts), [autosaves.ts](../../apps/server/src/autosaves.ts), [operational-backup.ts](../../apps/server/src/operational-backup.ts).

## LA167

**Changed — current checkpoint path (2026-09-28, C05) · Restrictiveness: Safe.**

Only one checkpoint capture runs at once. The slot is reserved before the world mutation queue, so a waiting capture never holds that queue. One manual save may wait for the capture in progress and runs before the next automatic save; automatic saves never wait in admission: while a capture runs or a manual save waits, the due automatic save is held and starts on the first tick after the slot frees, with no failure recorded; if the world mutation queue refuses it as busy, it retries after 30 s of running time, and the third consecutive busy refusal is recorded as a checkpoint failure ([SB12](#sb12)). A second, different manual save while one waits receives busy; identical requests share completion. Restore fences concurrent mutation; simulation can continue while a pinned checkpoint is written.

**Reason / tradeoff:** Bound capture work and preserve a coherent revision while not failing routine manual intent behind an autosave. Single-capture admission is tunable; atomic restore/authorization are correctness requirements. [Admission](../../apps/server/src/game-saves.ts) (`admit`).

[Implementation starting point](../../apps/server/src/game-saves.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA171

**Current live acceptance under verification · Restrictiveness: Medium.** Ordinary player/NPC effects and native progress publish in memory and save in one ordered stream. [BKS-L08](#bks-l08--ordinary-live-acceptance-target) owns the one-second opportunity, oldest-unsaved admission deadline, finite byte ceiling and crash-loss promise. Computed navigation and evidence follow the accepted cut; protected operational effects retain durability.

**Reason / tradeoff:** A crash can lose accepted unsaved play. Storage latency is removed from ordinary acknowledgment, while bounded admission, exact outcomes and complete saved cuts remain required.

[Implementation starting point](../../apps/server/src/world-service.ts).

## LA172

**Historical — superseded canonical storage · Restrictiveness: — (superseded).**

The former whole-world snapshot/journal cadence was 120 durable revisions or a 1 MiB change batch. Supported gameplay now uses canonical per-owner SQL records; do not treat that cadence as the current ordinary write path.

**Reason / tradeoff:** Avoid whole-world rewriting; current per-owner batching remains separately bounded.

[Implementation starting point](../../apps/server/src/world-records.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA173

**Current — source inspected 2026-10-04 · Restrictiveness: Safe.**

During ordinary save preparation, `retainHotEvents` keeps the latest 512 events plus every event still required by active awareness, memories, obligations or knowledge. It considers trimming above 768 events and only applies a trim that removes at least 256. Startup also selects the latest 512 hot events plus required dependencies through the canonical record owner. This is not a hard active-event count: required references can keep more events resident.

**Reason / tradeoff:** Keep this storage-placement policy; moving an event out of active state must not delete its saved history or break a memory that still refers to it.

[Runtime placement](../../apps/server/src/hot-events.ts) · [Startup selection](../../apps/server/src/world-records.ts).

Original recommendation: **Keep**.

## LA174

**Current — source inspected · Restrictiveness: Safe.**

Write batches use at most 10,000 PostgreSQL parameters and approximately 262,144 encoded bytes; one oversized row remains admissible. History construction enforces its combined parameter-byte bound before retaining additional rows. Independent history source/perspective writes and world-record table writes may share a parameterized PostgreSQL statement; foreign keys check the completed statement. Other record batches retain the shared parameter limit and existing encoded-byte bounds.

Canonical and memory-source writes can transport bounded batches as typed JSON expanded through the existing trusted table composite type. Explicit columns, row ordering, insert-only/upsert behavior, same-table barriers and dependent-read/delete flushes remain owned by the existing writer. Both complete encoded JSON bytes and the original row/parameter ceilings remain enforced; lower wire parameter count does not enlarge admitted batches. No prepared-statement cache or retry policy is added.

Compatible new/updated record rows are grouped within their table before batching; alternating observer updates no longer force separate statements per observer. Transport groups contain at most 64 writes, 10,000 parameters and approximately 262,144 bytes including SQL text; an already admitted oversized statement is sent alone. Repeating a table flushes the preceding group, preserving secondary-unique ordering and preventing two group members from modifying the same row. Dependent reads and all record deletes occur after the write group finishes, so re-parented children survive old-parent deletion. Strict duplicate-create failures and atomic commit remain unchanged. `OPEN_LEGEND_SQL_WRITE_GROUPS=off` restores separate statement waits for diagnosis.

The single final history flush includes its complete retained-event-count delta in the group and checks exactly one returned total row. Missing totals still refuse the entire transaction. Intermediate byte/parameter flushes do not reset the cumulative inserted-event count; total creation remains an earlier statement.

**Reason / tradeoff:** Larger PostgreSQL batches reduce local round trips. SQLite support and its portable parameter floor were removed on 2026-09-27. The byte bound prevents one huge multi-row statement. The former shared 900-parameter ceiling was replaced only for PostgreSQL; this is not a cap on saved records or permission to split authoritative commits.

[Shared parameter limit](../../apps/server/src/sql-rows.ts) · [HistoryBatch](../../apps/server/src/history-batch.ts) · [Measurement limits](../verification/three-times-scene-performance.md) · [AR04.3](../maintainers/action-reconciliation.md#integration-tasks).

## LA175

**Current — source inspected at `af1eb02` · Restrictiveness: Safe.**

PostgreSQL connection/read statements have a 5-second timeout; write transactions set a 30-second statement timeout. A grouped write has one 30-second statement deadline for its complete bounded group. These are not end-to-end queue deadlines or scan-count caps. The former three-second SQLite busy-lock wait was removed with that adapter.

**Reason / tradeoff:** Bound external storage stalls while permitting larger atomic extraction/restore writes; report genuine storage failure. The original audit’s blanket 5-second statement claim is superseded.

[Implementation](../../apps/server/src/postgres.ts); [queue exposure](native-work.md#nw11).

## LA176

**Changed — current checkpoint path · Restrictiveness: Too liberal.**

No named-manual-save count ceiling; saves persist until deleted. Current streamed packages use SV04–SV06; the obsolete whole-document decode path was removed (SV14). Legacy operational JSON restore is not supported.

**Reason / tradeoff:** Keep complete user-selected saves; there is currently no overall disk quota. Backup separately refuses more than 10,000 retained packages (SV13).

[Implementation starting point](../../apps/server/src/save-files.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA177

**Current — source inspected 2026-10-04 · Restrictiveness: Safe.**

Scoped gameplay commands have a 24-hour retry window. The service durably advances the command epoch before pruning expired positive-epoch receipts older than the immediately preceding epoch. A prior receipt is checked for expiry and matching input; an unknown request from a closed epoch is refused before domain admission. This policy covers gameplay retries, not provider-attempt or financial-history retention.

**Reason / tradeoff:** Keep duplicate-action prevention when cleaning old retry records, rejecting commands that belong to an expired session.

[Receipt retention](../../apps/server/src/command-receipts.ts) · [Command admission](../../apps/server/src/world-service.ts).

**BK28 experiment, not installed:** a fixed 1 MiB current-epoch membership filter can skip only provably new command lookups; possible matches and unknown coverage retain exact SQL. Saturation increases false-positive reads without rejecting valid commands or changing the 24-hour window. This operational bound is an engineering choice, not a player limit; [mechanics and adoption](../projects/bookkeeping-simplification-runtime-design.md#conditional-current-epoch-absence-proof) require a useful complete-command result after the retention root repair.

Original recommendation: **Review**.

## LA237

**Current; complete worker/session-failure qualification open · Restrictiveness: Medium.**

One game server owns each database. A competing game server must obtain the exclusive PostgreSQL advisory reservation and is refused while the current server holds that reservation. The game service serializes authoritative mutations, while PostgreSQL maintains independent bounded write and read lanes. Read-only checkpoint/backup connections do not acquire the writer lock. One world per database remains the current operational contract; this is not a claim of distributed world ownership.

**Reason / tradeoff:** Keep exclusive authoritative writing so simultaneous changes cannot overwrite each other or produce inconsistent saved state.

[Writer lock and database lanes](../../apps/server/src/postgres.ts) · [Mutation coordination](../../apps/server/src/world-service.ts).

Original recommendation: **Keep**.

## SV01

**Changed 2026-09-28 (C05) · Restrictiveness: Safe.**

**Autosave cadence:** operator setting, default every 5 minutes of running real time, allowed 1–1440 minutes ([SV23](#sv23)). Paused time does not count. This is not in-game minutes.

**Reason / tradeoff:** Periodic crash-recovery points without capturing every commit; operators can trade disk/work for recovery granularity. The default is an engineering choice.

## SV02

**Changed 2026-09-28 (C05) · Restrictiveness: Safe.**

**Autosave retention:** operator setting, default 3 integrity-checked checkpoints selected for retention, allowed 1–20 ([SV23](#sv23)); lowering it removes older automatic checkpoints after the next successful autosave. Normally about ten minutes between the oldest and newest retained points. This is not a hard count/byte limit on files: replacement publishes first, cleanup can fail, and damaged slots omitted from listing or protected recovery files can remain. Rotation checks byte/record counts and checksums, not successful world restoration ([SB08](#sb08)).

**Reason / tradeoff:** Bound automatic disk use; three points offer only a short recovery window.

## SV03

**Reported · Restrictiveness: Safe.**

**Before-load recovery:** 2 integrity-checked recovery packages are the rotation target; the current protected recovery pointer can retain an additional file. Only the current pointer appears as “Before last load” in the UI. File verification does not prove restoration, and failed cleanup can leave more packages ([SV02](#sv02)).

**Reason / tradeoff:** Keep rollback protection across repeated loads without retaining every pre-load world forever.

## SV04

**Reported · Restrictiveness: Very safe.**

**Package size:** 256 MiB per streamed package. Larger checkpoints fail. The same limit applies separately to an operational backup’s gameplay and external-record streams.

**Reason / tradeoff:** Bound package work and disk exposure; stream size is not a semantic world-size requirement.

## SV05

**Reported · Restrictiveness: Very safe.**

**Individual record size:** 1 MiB encoded. One oversized record can prevent saving even when the total world is small. Growing owners must split their records or this limit must change.

**Reason / tradeoff:** Bound one encode/decode allocation; growing canonical owners may need record splitting.

## SV06

**Reported · Restrictiveness: Safe.**

**Package record count:** 2,000,000 stream records, including framing. Another independent reason a package can be refused.

**Reason / tradeoff:** Bound framing/validation work independently of encoded bytes.

## SV07

**Reported · Restrictiveness: Safe.**

**Capture duration:** 2-minute scan budget checked between records, plus a 125-second runtime checkpoint-worker watchdog covering the whole capture. If that watchdog fires, the server terminates the worker, waits for its exit and cleans its private staging directory before reporting failure. The failed worker is not reused. Worker termination is asynchronous, so the 125 seconds start cancellation rather than guarantee an exact wall-clock completion time. The command-line operational backup uses a separate combined snapshot and is outside this runtime-worker limit.

**Reason / tradeoff:** Bound normal database scans and cancel a worker stuck awaiting an individual write, sync or publication call without acknowledging failure before a late publication is ruled out. Operational backup consistency still requires its own snapshot policy.

## SV08

**Reported · Restrictiveness: Safe.**

**Worker memory:** 256 MiB V8 old-generation heap. This is not a cap on total process memory or restore memory.

**Reason / tradeoff:** Contain worker heap growth; restore and total RSS need separate qualification.

## SV11

**Reported · Restrictiveness: Safe.**

**Save-list pagination:** 100 entries per response, using 101 to detect another page. Retained manual-save count remains unlimited. This bounds response/result memory, not filesystem scanning; [SV17](#sv17) owns the full-directory scan limitation.

**Reason / tradeoff:** Bound each catalog response while preserving access to older pages.

## SV12

**Reported · Restrictiveness: Safe.**

**Metadata size:** 16 KiB per save’s metadata; 1 MiB per backup manifest. Oversized metadata is rejected.

**Reason / tradeoff:** Bound untrusted header/manifest parsing independently of world content.

## SV13

**Reported · Restrictiveness: Very safe.**

**Operational backup catalog:** 10,000 retained save packages. A world can have more manual saves, but the backup command then refuses. This is a significant constraint I introduced.

**Reason / tradeoff:** Bound backup catalog work; this conflicts with unlimited manual-save retention.

## SV14

**Removed 2026-10-14 · Historical allowance.**

The former **64 MiB non-streamed decode guard** accompanied whole-JSON checkpoint loading. FR08 removed that unused alternative together with inline world payloads and alternate write/copy paths. Current packages require streamed metadata and use SV04–SV06; the small database recovery pointer is bounded to 1 KiB before decoding.

**Reason / tradeoff:** One current representation avoids maintaining an unused loader. Atomic publication, exact integrity and current-format validation remain required; no conversion or deletion of unrelated data is performed.

## SV15

**Reported · Restrictiveness: Safe.**

**Internal database batches:** 64 rows per capture page/backfill batch; 1,000 IDs per eligibility-rebuild batch. Performance tuning choices, not gameplay limits.

**Reason / tradeoff:** Bound individual SQL operations without reducing total accessible history.

## SV16

**Reported · Restrictiveness: Safe.**

**File buffers:** 256 KiB write-flush threshold; 64 KiB read chunks. Internal throughput/memory tradeoffs.

**Reason / tradeoff:** Trade transient memory for streaming throughput; no content is intentionally omitted.

## SB01

**Changed 2026-09-28 (C05) · Restrictiveness: Safe.**

Autosaves are enabled by default. Holders of the save grant can disable them or change cadence and retention in **Game → Checkpoints**; the settings are stored per world outside gameplay rewind (a load does not change them) and survive restart. Disabling them leaves only manual saves and database commits for recovery.

**Reason / tradeoff:** Provide recovery by default while giving operators disk and recovery control. [Settings](../../apps/server/src/game-saves.ts) (`settings`, `updateSettings`).

## SB02

**Reported · Restrictiveness: Safe.**

The autosave timer restarts with the server. Elapsed time toward the next autosave is not persisted. Shutdown finishes admitted saves but does not force a final checkpoint.

**Reason / tradeoff:** Avoid another persisted scheduler and extra shutdown capture; database commits remain the primary durability path.

## SB03

**Reported · Restrictiveness: Safe.**

Busy periods produce one pending autosave opportunity. Missed intervals do not accumulate into a queue. Failed saves wait for another cadence opportunity rather than retrying immediately.

**Reason / tradeoff:** Avoid a save backlog and retry storms during load or failure.

## SB05

**Reported · Restrictiveness: Safe.**

Each checkpoint remains a complete, uncompressed standalone copy. I chose streamed JSON records, without incremental snapshots, compression or cross-save deduplication. Manual retention/disk policy is recorded in LA176.

**Reason / tradeoff:** Standalone complete packages simplify restore and inspection; they cost proportional disk space per save.

## SB06

**Reported · Restrictiveness: Too liberal.**

Loading pauses before reading and validating the large package. Reconstruction uses memory proportional to the saved world. A failed validation can leave the existing world paused.

**Reason / tradeoff:** Prevent mutation during reconstruction and preserve a diagnosable failed restore; loading still materializes the full saved world.

## SB08

**Reported · Restrictiveness: Safe.**

Listing saves checks metadata and file size, so same-size corruption can remain listed. Retention verification checks checksums and byte/record framing/counts; it does **not** decode the full current-format world or validate all restore invariants. A retained integrity-checked file is not a proven restorable world. Load performs the deeper reconstruction and validation. [Implementation](../../apps/server/src/save-files.ts) (`verify`), source inspected 2026-09-26.

**Reason / tradeoff:** Keep ordinary catalog browsing fast; integrity verification is deferred to use/retention.

## SB09

**Reported · Restrictiveness: Safe.**

Operational backup is deliberately strict about retained saves. One damaged retained slot can block the entire backup, even if the current world is healthy. I chose refusal rather than producing a partial backup with warnings.

**Reason / tradeoff:** Promise a complete recovery set rather than silently omitting retained saves.

## SB10

**Reported · Restrictiveness: Safe.**

Interrupted-file cleanup is conservative. Startup removes staging directories only when their recorded local process is demonstrably gone. Ambiguous stages and interrupted operational backups require manual inspection.

**Reason / tradeoff:** Avoid deleting another process’s in-flight capture; ambiguous ownership requires operator judgment.

## SB11

**Reported · Restrictiveness: Safe.**

The save worker starts with the server and is not automatically restarted after a fatal worker failure. Recovery currently requires restarting the server.

**Reason / tradeoff:** Avoid unsafe automatic replay after worker death; automatic fresh worker recovery is not implemented.

## SB12

**Reported · Restrictiveness: Safe.**

**Changed 2026-09-28 (SL08-A).** Checkpoint status is displayed in **Game → Checkpoints** and refreshed through catalog requests; it is not a continuously updating global notification. The latest checkpoint failure (automatic, manual or recovery) is stored with the world outside gameplay rewind and shown until a save-grant holder acknowledges it, including after restart. If storage cannot record it, it is shown from memory with that caveat. Catalog health (damaged/unlisted slots) stays separate. The last automatic checkpoint time comes from the catalog after restart, so the panel does not imply protection it cannot see. [Implementation](../../apps/server/src/game-saves.ts) (`recordFailure`, `acknowledgeFailure`).

**Reason / tradeoff:** Operators must not lose failure evidence to a restart; one retained record avoids a failure log without bounds.

## BW04

**Historical; superseded by current-format rejection · Restrictiveness: Medium.**

Earlier feeling conversion supported only the known fear/discomfort format and decay rate. Earlier equipment conversion rebound understood weapon references, rejected unsupported references and did not grant unknown item definitions packing compatibility. These were restrictions on the former conversion paths, not current save support. Current equipment ownership is in [objects](../../packages/domain/src/objects.ts); the [development save policy](../../AGENTS.md#development-save-policy) forbids retaining an older-format reader.

**Former reason / tradeoff:** Only understood legacy semantics could be converted without guessing or losing references. Ordinary loading rejects incompatible data rather than converting or truncating it; current-format initialization, validation and same-version restoration remain required. Mike-authorized replacement and reconciliation of incompatible development data follow the current root policy, including preservation and coherent placement of the combined meaningful content. That separate developer operation is not an older-format runtime reader. [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths) tracks the remaining obsolete feeling-conversion helper without reopening removed importers or claiming that ordinary loading calls it.

## SV17

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**Save catalog pages still scan the full directory.** SaveFiles.list iterates every save directory and reads metadata/file size before selecting a page. With limit set, retained result metadata is bounded to at most 101; directory visits and filesystem calls are not. Without limit, it retains all matching metadata. Three rolling autosaves do not bound indefinitely retained manual saves.

**Exposure / consequence:** Catalog reads/rotation/backup get slower as manual-save counts grow. Reaching thousands of manual checkpoints requires sustained explicit saving; it is less imminent than automatic memory growth. This is separate from the 10,000-package operational backup refusal.

**Reason / tradeoff:** Filesystem enumeration avoids another writable catalog for the first implementation. Keep the present policy until measured save counts warrant an indexed/paged catalog; do not prioritize a hypothetical 10,001st save over routine gameplay.

**Evidence:** No new catalog timing run; page size is a result-memory bound, not an I/O-work bound. [Implementation](../../apps/server/src/save-files.ts) (`list`). [Revisit R02](../maintainers/limits-audit.md#r02).

## SB13

**Current — source inspected 2026-09-26 · Restrictiveness: Very safe.**

**Changed 2026-09-28 (SL09-A).** **Loading depends on a new complete recovery save.** A gameplay load first writes a full “Before last load” checkpoint pinned to the exact revision it replaces, before any database write. The candidate save is validated first; exhausted disk space, capture limits or capture failure then refuse the load. The current world is kept, still paused by the load request (in-flight AI work was already stopped), without a storage error, and the refusal is recorded as a recovery failure. If the load is refused or fails after the checkpoint was written (busy writer, revoked access, failed restore transaction), that recovery file is not listed; recovery rotation after every load attempt keeps the two newest recovery files plus the one the current “Before last load” entry references, and waits if that entry cannot be read. There is no supported bypass. Operator guidance: free disk space or resolve the limit and load again. If the world can no longer be captured at all, the operational backup cannot preserve it either (it uses the same capture limits); stop the server and take a PostgreSQL-level dump plus a copy of the data directory, and ask for an explicit, verified load path, which does not exist yet.

**Reason / tradeoff:** Preserve the current world before a rewind; the same safeguard can obstruct recovery from a world that can no longer be saved. A future escape path needs a verified independent preservation, not silent deletion. [Open decision](../maintainers/save-and-load.md#recovery-qualifications-identified-by-the-save-limit-follow-up).

[Implementation](../../apps/server/src/game-saves.ts).

## SB14

**Changed 2026-09-28 (SL09-B) · Restrictiveness: Safe.**

**Retention and paging use a durable capture sequence.** Each gameplay capture receives the next per-world sequence from the database before it starts; the value survives restart. The first capture in each server process raises the counter to at least the highest sequence among the slots on disk, so a restored slot never outranks a new capture. Catalog order, pagination cursors and rotation sort by sequence, then wall-clock time and UUID only as tie-breakers; wall-clock time is display only. The read-only operational backup deliberately makes an unordered root capture without updating this counter; absence of a sequence is therefore not exclusively a legacy format. Catalog comparison also accepts unsequenced slot metadata and orders it last. That compatibility exposure remains subject to [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths), without removing the current read-only backup use. A capture whose sequence allocation rolls back with a failed restore transaction can share a number with a later capture; ties then fall back to time and UUID.

**Reason / tradeoff:** A backwards clock can no longer make rotation delete the newest capture. [Implementation](../../apps/server/src/save-files.ts) (`compareSaves`).

[Implementation](../../apps/server/src/save-files.ts).

## SB15

**Changed · Restrictiveness: Safe.**

**Only the current physical format is supported.** The [current database/save formats](../save-and-load.md#current-history-capture-boundary) and `records-jsonl-2` require the combined perspective/access table, maintained event totals and [saved sampling progress](../simulation-time.md#native-interval-contract). The integrated model also requires exact recipe-family pins, sparse body meters and the explicit memory-search projection. The integrated current format also requires exact body-port equipment attachments, finite guard work, authored-method provenance, source-bearing invention receipts, current recipe-record acquisitions/transactions, owned practice support, active coaching records and shelter/material-exposure records, installed preparation definitions, finite cast definitions, selected world rules and knowledge origins, held aims, finite projectile flights and exact combat-help agreements. Current records additionally require authored terrain descriptors, saved numeric body shapes, claimant-bearing resource reservations and committed observer-specific event facts. Every package requires stream encoding, byte/row counts and checksum; inline worlds and whole-JSON slots are refused. It replaces the preceding layouts without retaining an older reader. The remainder must be finite, positive above the current time tolerance and no greater than the world-owned fallback horizon; any exact deadline must agree with the saved clock and remainder. Exact current table coverage is mandatory. Incompatible databases and checkpoints are rejected as current data without conversion. The [development save policy](../../AGENTS.md#development-save-policy) permits replacement of incompatible development state while protecting credentials, access controls and real spending records.

**Historical rationale / current scope:** The former reader converted one understood preceding foundation layout. That reader was removed with the history layout change; it is not a promised support window. Same-version integrity and complete recovery remain required. [RP02](../maintainers/revisitable-policies.md#rp02--development-state-compatibility) tracks any future owner decision.

[Implementation](../../apps/server/src/checkpoint.ts). Normal startup's maintained-count check and explicit full-audit boundary are documented in [save/load](../save-and-load.md#current-history-capture-boundary).

## SB16

**Current — measured 2026-10-01 · Restrictiveness: Liberal.**

**Capture snapshot lifetime includes file publication.** The capture read transaction remains open while records are streamed, synchronized and published. Slow output can prolong PostgreSQL row-version retention despite bounded page/worker memory. The two-minute scan budget is checked between records; the separate 125-second worker watchdog starts termination during a blocked write/sync/rename, then waits for worker exit before reporting failure. It does not promise an exact 125-second end-to-end deadline.

**Reason / tradeoff:** Preserve one consistent cut without copying the world into RAM; database version retention trades against output speed. The gameplay barrier ending is not the read snapshot ending.

**Measured 2026-09-28 and 2026-10-01 (shared hosts, SL09-C):** throttled output kept the snapshot open until the two-minute scan deadline aborted the capture; the oldest-snapshot age reached 85–132 transactions, and the abort released the snapshot and removed staging. A later 100,000-memory checkpoint with concurrent writes held five dead `world_head` tuples (465 bytes) until its snapshot ended; the whole-capture watchdog now covers an individual stalled file operation. These local samples do not quantify sustained or production-wide version/WAL retention. [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c).

[Implementation](../../apps/server/src/checkpoint.ts).

## SB17

**Current — source inspected 2026-09-26 · Restrictiveness: Safe.**

**Operational backup includes every retained save and requires current-format storage.** The backup command copies every retained slot selected from the world’s catalog; it offers no selective-save scope. A damaged slot/catalog blocks the operation. The source must already have a current-format world head: backup opens read-only and refuses incompatible development storage without conversion or deletion.

**Reason / tradeoff:** Provide a complete recovery set and avoid mutating the source during backup. This costs space proportional to retained slots; partial/selective backup is not current behavior.

[Implementation](../../apps/server/src/operational-backup.ts).

## SB18

**Current — verified 2026-10-01 · Restrictiveness: Medium under the stopped-server, one-database-per-directory contract.**

**Changed 2026-10-01 (D1/D2 reconciliation).** Before copying, operational restore durably records an attempt and binds the save directory to its target PostgreSQL database. Each newly published retained slot and pre-restore recovery checkpoint carries an attempt owner marker inside its atomic slot directory. The database installation writes a matching marker in the same transaction. After a process exit, the next restore checks that marker: committed files stay; if the install did not commit and the world head is unchanged, it removes only intact attempt-owned files that no current recovery pointer references. Pre-existing, changed, damaged, ambiguous or newly referenced files stay for inspection. A failed `COMMIT` initially keeps the files; a later process can resolve its outcome. The source backup is never touched. A different database using the same marked save directory is refused before repository startup; an unmarked mixed-world directory is refused before adoption.

**Reason / tradeoff:** The files cannot join the PostgreSQL transaction, so durable ownership evidence and an in-transaction commit marker distinguish an orphan from a committed slot after process death. The small marker files and one database meta record per successful restore cost space; refusing ambiguous/shared ownership is safer than deleting a usable recovery point. First use of an unmarked same-world directory relies on the operator's exclusive-directory choice; the marker cannot prove past ownership. Servers must be stopped for operational restore; the marker is an operational-restore guard, not a general cross-process file lock. [Implementation](../../apps/server/src/operational-restore-attempt.ts), [slot publication](../../apps/server/src/operational-backup.ts).

[Implementation](../../scripts/restore-world.ts).

## SB19

**Removed — PostgreSQL-only storage, 2026-09-27.**

The former SQLite writer/read workers, 128-RPC bounds and 128-statement caches were removed with SQLite support. They isolated native SQLite CPU and preserved transaction ownership, but no embedded/offline deployment is required. PostgreSQL keeps its existing lane limits; removing this adapter does not relax authoritative commit, save/load or uncertain-write guarantees. See the [implementation plan](../projects/completed/postgresql-cognition-preparation.md).

## SV19

**Superseded ordinary-save envelope · Restrictiveness: — (superseded).** The former four-second in-flight-write threshold is replaced by [BKS-L08](#bks-l08--ordinary-live-acceptance-target), measured from the oldest accepted unsaved change across pending and in-flight work. Waiting preserves actual simulation debt; the current rule does not bound database outage duration.

## SV20

**Superseded admission retries · Restrictiveness: — (superseded).** The former four-attempt pre-BEGIN retry loop is removed. A captured save makes one ordered commit attempt; failure latches admission and retains the accepted suffix in RAM. The existing head/receipt owner distinguishes committed, rolled-back and uncertain completion without re-executing gameplay or buying provider work. [BKS-L08](#bks-l08--ordinary-live-acceptance-target) owns the current failure boundary.

## SV21

**Superseded command-driven save deferral · Restrictiveness: — (superseded).** Commands no longer postpone native saves while waiting to issue their own strict transaction. [BKS-L08](#bks-l08--ordinary-live-acceptance-target) schedules the accepted prefix from its first arrival; ordinary durability waiters join that scheduled cut. Protected operations explicitly flush their predecessor cut.

## SV22

**Current 2026-09-28 (PF06) · Restrictiveness: Safe.**

**Shutdown deadline: 30 s, backstop 45 s.** Graceful shutdown stops admitting requests, then gives each stage (tick, checkpoint drain, AI director, navigation, final world save, projection, HTTP, storage) a share of one 30-second budget; a late or failed stage is reported and the next stage still runs. Storage close is always attempted; if it does not finish in the remaining budget (a stalled database), that is reported and the process exits one second after its report, which drops the connections. A latched storage failure skips the final save. The process reports whether the final save completed and the last revision it confirmed durable; without a confirmed save it says the database may be ahead if a commit was still outstanding. A repeated signal within one second of the first is treated as the same request (under `pnpm dev`, `tsx watch` relays Ctrl-C as a second SIGINT); a later one exits immediately, and a 45-second backstop exits a shutdown whose report never arrives. Under `pnpm dev`, `tsx watch` also force-kills the server 5 s after relaying a signal, so the 30-second budget applies only to `pnpm start` or a direct run.

**Reason / tradeoff:** A stalled database or checkpoint must not keep the process and its writer lock alive indefinitely; unsaved simulation progress is reported rather than hidden. [Implementation](../../apps/server/src/http.ts) (`shutdown`), [signals](../../apps/server/src/main.ts).

## SV23

**Current 2026-09-28 (C05) · Restrictiveness: Safe.**

**Autosave setting bounds:** cadence 1–1440 minutes of running time; retention 1–20 automatic checkpoints. Invalid stored settings disable automatic saves and are reported until saved again; they are never guessed.

**Reason / tradeoff:** Allow day-long cadence and a longer rolling window while bounding automatic disk use (20 complete packages at the 256 MiB package limit is 5 GiB).

## SB20

**Removed synchronous residency fallback · Restrictiveness: — (superseded).** A finite pending/in-flight buffer retains admitted records and chronology that leave the hot working set. Residency release no longer means every absent record is already in SQL and no longer forces a synchronous native save. Captured cold reads merge the appropriate pending cut with a recognized database snapshot. [BKS-L08](#bks-l08--ordinary-live-acceptance-target) bounds this work; the [runtime contract](../projects/bookkeeping-simplification-runtime-design.md#63-reads-while-progress-is-unsaved) owns ordering and privacy.

## SB21

**Current · Restrictiveness: Safe.**

Ordinary commands and accepted NPC effects publish their authoritative transition in memory; their canonical rows, history, exact source changes, references and outcomes save together through one PostgreSQL writer. Protected effects retain explicit durable barriers. Native progress continues during background writes until [BKS-L08](#bks-l08--ordinary-live-acceptance-target) backpressure applies.

The [current compact storage path](../projects/bookkeeping-simplification-tech-design.md#3-runtime-representation) saves immutable acquisition suffixes, explicit native order and contact groups. It persists native continuation and rebuilds derived attention work after restoration. Encoded pending bytes are not a decoded heap bound; [BK](../maintainers/production-data.md#bookkeeping-simplification) owns complete cost qualification.

Receipt-page lookup uses a [fixed 16,384-key bucket dictionary](../projects/attention-and-scenes-runtime-design.md#61-segmented-physical-layout), always followed by exact metadata and authority checks; collisions may increase candidate work but cannot discard or grant evidence, and the existing preparation guards remain unchanged.

Physical cleanup uses indexed candidates and actual transactional owner/value uses on the same writer. Logical expiry/revocation remains immediate. Ordinary movement performs no cold-owner cleanup scan; finite request copies need no temporary physical pins. [BKS-L03/BKS-L04](#bks-l03--coarse-physical-expiry-target) owns current cleanup bounds.

**Reason / tradeoff:** native play continues while storage and optional AI work independently; ordinary acknowledgments can be lost on crash before their cut saves. Slow writes still consume real CPU/database capacity and can hold protected barriers or trigger ordinary admission backpressure. [BK](../maintainers/production-data.md#bookkeeping-simplification) owns the integrated operating pass; [PF05](../maintainers/performance.md#pf05--public-view-and-browser-responsiveness) retains public-delivery qualification.

## RW-L01 — One protected world history

**Proposed DG25 choice · Restrictiveness: coherent same-world scope.** One active world follows an authorized restore to an actual retained compatible checkpoint. The first scope selects protected rewind of all fictional private messages/read/evidence with goods, bodies and agreements. No alternate-history archive, arbitrary point-in-time reconstruction, selective item/message rescue or automatic new model outcome. [Product](../projects/corrections-and-shared-restoration-feature-spec.md#7-selected-shared-restoration-policy), [SL10 consumer](../maintainers/save-and-load.md#dg25--protected-shared-restoration).

## RW-L02 — Existing authority and bound people

**Proposed reuse · Restrictiveness: current D60/MP.** Creator and authorized system administrators retain save/load rights; ordinary participants receive no rewind power. All currently bound human people must exist in the candidate, matching current refusal. No new per-player body copy, re-entry, vote, attendance minimum or countdown. A changed binding/authority or active-history review is stale; current restrictions are rechecked before installation.

## RW-L03 — Protected private cut

**Proposed D48 treatment · Restrictiveness: one fictional chronology.** Message submissions, eligible arrivals, actual reading, fictional contact/device state and accepted derivatives restore at the same cut. Post-cut text is absent from current inbox, unread cues and NPC recall. Pre-cut unread text may be acquired after resume; humans can remember the discarded future without the system teaching it to NPCs. The existing protected pre-load file is whole-world recovery, not individual private-history browsing.

## RW-L04 — Current privacy versus fictional ownership

**Proposed clarification · Restrictiveness: current external authority.** Current account/control grants, human-private ownership, blocks/revocations, erasure and device revocations constrain restored evidence before disclosure. A block does not itself erase text legitimately arrived at the cut. Fictional item title/access, association state and agreements restore with their objects; “permissions remain current” does not preserve a later fictional trade. A new human controller gains no earlier NPC private-human corpus.

## RW-L05 — One replacement and truthful pending outcomes

**Proposed · Restrictiveness: bounded admission, no paid replay.** One admitted world replacement at a time; another distinct request is busy and a retry resolves the same operation. A single destructive review permits cancellation before admission. No promised mid-install cancel or automatic restart/retry after uncertainty. Current real spending, uncertain attempts and DG24 real-time sending allowance stay current. Old receipts describe earlier-history outcomes only; restored pending narration is cancelled under current policy.

## RW-L06 — Notice and readable continuation

**Proposed · Restrictiveness: bounded presentation, no all-participant acknowledgement barrier.** One latest relevant unacknowledged restore result per participant avoids an accumulating modal stack. Real/game times and whole-world/private-progress scope are permitted operational information; no hidden-person/message/relationship diff. Connected notice and reconnect do not wait for everyone. Fresh paused return and current eligibility govern new commands; eligible in-session drafts require explicit review, not auto-send. Existing operational history retention remains its owner, with no new lifetime audit quota.

## RW-L07 — Existing capture and load bounds

**Existing values reused, no capacity claim.** LA167, SV01–SV08/SV11/SV23 and SB05/SB06/SB13/SB16 retain capture admission, 256 MiB package, 1 MiB record, two-million-record and duration bounds, autosave/retention settings, paged catalog and proportional-memory load. The current world must be capturable before deliberate restore; there is no new bypass. Full current private/cold history is required, not a subset fitting the budget.

## RW-L08 — Retention and recovery are finite promises

**Proposed reuse · Restrictiveness: explicit retained-point availability.** Existing rolling automatic and pre-load counts are targets, not hard disk quotas or proven restore success; manual saves retain no fixed count ceiling. Current erasure still constrains older saves. A missing point, damaged/incompatible payload or failed current-world preservation refuses the operation while retaining current authority. SL09-A/PD06 owns any independently preserved operational escape path.

## RW-L09 — No first private portable transfer or branch merge

**Proposed restriction.** First shared/private scope uses protected retained service slots. Creator-facing complete private-world download/import, alternate live branches, merge, selective recovery and unsupported cross-world effects are unavailable. No public-only export may be called complete. SL10 retains a later destination/identity/privacy/accounting transfer choice; PD06's authorized operational backup and DG16's personal Journal export remain distinct.

## RW-L10 — Growing text and economic qualification

**Proposed consumer exposure · Restrictiveness: unqualified aggregate growth.** DG24's 100 × 24 × 8,000 bytes/minute envelope is 19.2 MB/minute: roughly fourteen real minutes to 256 MiB of raw bodies alone, before world state/encoding/derivatives. This is worst-envelope arithmetic, not demand, exact saved size or capacity. Existing sender/page limits do not prove indefinite saveability. NC/SL/data must qualify a concrete supported accumulated-history envelope or explicit admission policy, with current retention rationale; no silent private expiry, copy-per-utterance or paid reconstruction is selected.

## BKS-L01 — Direct transactional saving target

**Implemented under verification; operating qualification open · Restrictiveness: Medium.** One ordered PostgreSQL writer, one detached in-flight prefix and one accumulating change buffer. [BKS-L08](#bks-l08--ordinary-live-acceptance-target) owns ordinary live acceptance and the finite age/byte envelope; protected spending/access/privacy operations keep their barriers. SQL groups retain their encoded row/byte/parameter bounds, and a candidate that cannot fit the finite admission allowance is refused before ordinary publication or uses an existing explicit durable operation. Decoded retained memory is measured separately. PostgreSQL remains the sole durable table authority, with no custom replay/application stage. [Mechanism](../projects/bookkeeping-simplification-tech-design.md#4-direct-transactional-saving).

## BKS-L02 — Explicit evidence layout target

**Implemented; normal-speed and cleanup qualification unmet · Restrictiveness: Medium.** Small changing measurements are inline; stable/richer compatible received values are shared by immutable ID. Keep world-owned logical memory allowances and the whole-operation exception; [BKS-L09](#bks-l09--span-and-check-representation) owns operational packing/residency. Save only new operation suffixes under existing SQL row/byte/parameter bounds; no per-coordinate SQL row, growing-prefix rewrite or hidden live-object layout cache. Sharing changes physical bytes, never personal access or logical allowance. [Representation](../projects/bookkeeping-simplification-tech-design.md#3-runtime-representation).

## BKS-L03 — Coarse physical expiry target

**Replaced by [BKS-L10](#bks-l10--received-batches-and-frontiers).** Logical age and exact member-pressure eligibility are independent of physical collection. Mixed boundary blocks may retain inaccessible storage, without charging expired personal evidence or discarding eligible siblings. Required support keeps its independent owner.

## BKS-L04 — Background collection target

**Implemented; sustained physical debt unqualified · Restrictiveness: Safe per pass.** At most one queued cleanup slice, examining up to 128 candidates of each kind and selecting at most 256 combined candidates or 256 KiB of body bytes, counting dependent use-row work and honoring smaller existing statement limits; a whole oversized admitted record is processed alone. Use indexed candidates and one reverse-reference existence check, with no payload hydration just to check ownership. Ordinary cleanup wakes coalesce over five real seconds; nonempty slices yield then continue. Due cleanup receives turns between foreground batches; no full backlog drain or per-command scan. This bounds work, not physical disk growth: deletion/index reuse must keep up in sustained acceptance; existing storage failure/backpressure remains. No separate gameplay candidate-byte census is added. [Collector](../projects/bookkeeping-simplification-tech-design.md#62-one-background-collector).

## BKS-L05 — Removed bookkeeping and retained boundaries target

**Removed · Restrictiveness: —.** Removed custom journal entry/debt/application limits with that stage, block-slot reclamation generations, temporary storage pins and accepted/applied/pending ownership mirrors. A finite request copy grants no saved-history retention extension; ordinary expiry and explicit correction have the distinct pending-publication rules in [BKS-L11](#bks-l11--sparse-history-and-bounded-capture-proposal). One transactional owner/value projection, current-format reference validation, exact command receipts, privacy overlays and real spending protection remain. No new lifetime encounter registry or full-history hot cache is allowed. [Safety and removal](../projects/bookkeeping-simplification-tech-design.md#63-why-unsaved-work-and-reads-are-safe-without-pins).

## PF17-J01 — Experimental deferred saving

**Historical — removed · Restrictiveness: —.** The custom journal, accepted/applied revision limits, admission-probe fallback and application-worker handoff are removed. One direct PostgreSQL transaction commits supported changes. Current pending-write, evidence and background-collection bounds are [BKS-L01–BKS-L05](#bks-l01--direct-transactional-saving-target). The [journal experiment](../projects/performance-overhaul/journal-contract.md) preserves its former limits and evidence; they are not current runtime requirements.

## BKS-L06 — Maintenance headroom target

**Installed under verification · Restrictiveness: Medium.** [BK10/BK12](../maintainers/production-data.md#database-work-reduction) separates ordinary age eligibility, optional pressure maintenance and required support admission. The [base retention profile](../worlds/base/attention.md#background-retention-target) owns target/headroom/low-water values; engine code consumes the installed policy. Age cutoff and explicit privacy remain exact. Optional overshoot is finite; reaching the hard ceiling stops new optional recording/indexing with honest coverage, never physical advancement. Ordinary exact speech has independent 25% maintenance headroom above its unchanged target; its hard ceiling cannot silently omit required words. Required support reserves its strict allowance before admission. Required-account aftermath cleanup starts below that ceiling using the selected maintenance reserve (75% in the base world); this permits no overflow or removal of active obligations/independent support. Lasting knowledge and independently owned support capsules also retain the original target ceiling; replaceable-account headroom does not apply to them. Normal acceptance cannot rely on repeated overflow or reduced sensory fidelity. Usage deltas avoid per-change candidate enumeration; unknown usage needs one aggregate reconstruction. Event archives receive no new deletion policy or universal disk bound. The world-owned target sizes remain unchanged; operating checks must establish that temporary headroom is not routine overflow.

## BKS-L07 — Background storage service target

**Installed under verification · Restrictiveness: Medium.** Reuse the one writer/maintenance scheduler. Ordinary physical-cleanup notifications retain five-second coalescing, but nonempty work waits at least 250 ms before another slice rather than immediately draining. Keep the existing 128-per-kind / 256-combined candidate and 256 KiB slice bounds, counting dependent links and whole-record exceptions. Prefer queued foreground saves; service one due maintenance slice after at most ten foreground batches or one second of continuously waiting maintenance, whichever comes first at a writer boundary. These are cooperative scheduling targets, not database-execution deadlines. No maintenance transaction preempts an in-flight save. Retention/derived workers coalesce per actor and have at most one prepared result per actor and one database-preparation job per existing maintenance lane; selected input/body bounds still apply. Cleanup debt and optional queues must stabilize under sustained required workloads. Failed stability blocks operating acceptance rather than authorizing data loss or a second writer. [Mechanism](../projects/bookkeeping-simplification-runtime-design.md#5-background-helpers-with-bounded-work).

## BKS-L08 — Ordinary live acceptance target

**Owner-approved November 1, 2026; installed under verification · Restrictiveness: Medium.** Ordinary gameplay acknowledgments may precede disk. Save opportunities target one real second from the first unsaved acceptance, with one writer and one accumulating buffer; later arrivals cannot reset that deadline. Ordinary durability waiters, including paid cognition's evidence barrier, join a fixed captured batch without forcing another early save. Waiting consumes the existing urgent inference budget; it cannot renew a deadline or fund another request. Five seconds since the oldest unsaved acceptance stops further native/ordinary-command admission until a durable cut advances; an operation already executing may overrun and must be measured. The initial combined pending/in-flight encoded-work ceiling is 64 MiB, with 64 KiB reserved inside it for prompt emergency Pause, conservatively charged through record codecs from existing payload sizes and changed-metadata bounds; unknown-size payloads are prepared once before admission, never by serializing the whole buffer each tick. This is a server operational bound, not a character memory allowance or full-heap limit. Prepared/body copies and resident snapshots are measured separately. A single operation exceeding available capacity must be preflighted through the existing explicit durable path or refused before effects; no partial ordinary acceptance.

A crash can lose the whole accepted suffix since the last complete saved cut. The five-second rule bounds admission without durable progress, not downtime or a hard wall-clock completion guarantee. Ordinary duplicate/outcome lookup can await scoped cold data outside native mutation. Real spending, access changes, explicit privacy settlement, checkpoint/restore and external irreversible operations retain their actual durability barriers. New process/timeline acceptance epochs prevent blind replay of missing old outcomes. This installed admission envelope supersedes the earlier ordinary-command portions of BKS-L01 and SV19/SV21; it does not reinstate the removed custom journal or its second application stage. [Complete contract](../projects/bookkeeping-simplification-runtime-design.md#6-live-acceptance-and-ordered-saving).

## BKS-L09 — Span and check representation

**Predecessor representation; superseded by [BKS-L10](#bks-l10--received-batches-and-frontiers).** BK17–BK19 established shared rich values, inline changing measurements, exact checks, independently retained support and weighted residency. Its open reservations, late-closed spans, kind-separated pages and span-range relation are replaced by received batches and exact actor frontiers. World-owned memory/context allowances, 64 KiB preferred packing, 128 KiB weighted resident tail and the hard record/pending limits remain unchanged. The predecessor's [design and evidence](../projects/bookkeeping-simplification-reception-design.md) do not establish operating acceptance of the replacement.

## BKS-L10 — Received batches and frontiers

**Predecessor representation, superseded by [BKS-L11](#bks-l11--sparse-history-and-bounded-capture-proposal); operating acceptance failed · Restrictiveness: earlier unchanged gameplay allowances.** [BK20–BK23](../maintainers/production-data.md#received-batches-and-lifetime) retain the existing sensory/attention/age/count/byte/save/work limits. One receiver batch groups actual exact checks and changes, never treats the whole batch as one logical fact, and admits optional contributions before accumulation. Smaller canonical metadata may retain more useful detail under the same byte allowance; it does not extend age eligibility or create a route before attention.

Small changing pose, position, frame and receiver-header fragments remain inline even above the ordinary small-value threshold; precise coordinates and long valid references cannot create a pooled row per movement. Rich stable values retain the shared pool. Count each covered logical facet once, including co-covered typed parts, with one personal stable value/provenance closure and actual sample-clock charges; physical seed/index duplication is server overhead. The fixed 16,384-bucket candidate vocabulary still requires exact membership postchecks.

Physical saving keeps the existing preferred 64 KiB target and whole-operation/SQL bounds, with mixed actor suffixes rather than kind-specific pages. First-use descriptors contain only used parts of used bindings; a record-local typed source/proof table and inherited owner header avoid repeated full proofs. Rich values remain shared. Their repetition at save boundaries and candidate-index scans are explicit costs to measure, not claimed constant work. No larger packing/head rewrite allowance, new background sampling/model cadence or collection budget is selected. [The batch design](../projects/bookkeeping-simplification-batch-design.md#5-save-layout-and-cold-reads) owns selection and exact predecessor-seed rules.

Recent charge metadata is grouped and bounded by retained recent entries, with exact closure-use accounting; repeated checks reference shared coverage projections rather than create per-facet headers. Stable projections exclude changing sample clocks/frames. There is no lifetime header catalogue. Separate age and exact logical-member pressure frontiers preserve partial eligibility independently of deletion; increasing policy allowances cannot revive expired data. A partially eligible boundary block may retain inaccessible bytes until all of it expires, bounded by physical block size and the existing indivisible-operation exception. No co-resident evidence is discarded to enable deletion. Pending/live and durable frontiers remain distinct until commit, and required independent support retains its existing guarantees. Header heap, descriptor/ownership/index bytes, boundary slack and collectible debt must all qualify under unchanged BK12/BK16 gates. BK20–BK23 distinguish source conversion from semantic and operating qualification; neither a smaller encoding nor a batch counter establishes capacity.

## BKS-L11 — Sparse history and bounded capture proposal

**Implemented; operating qualification open · Restrictiveness: explicit loss of historical check/replay fidelity.** The [feature proposal](../projects/bookkeeping-simplification-feature-spec.md#12-playable-personal-knowledge-and-sparse-recent-history) and [technical alternatives](../projects/bookkeeping-simplification-tech-design.md#15-compact-native-evidence-and-change-history) distinguish candidate A's unchanged exact-check contract from preferred candidate B. B removes the successful-check diary, arbitrary continuous past-scene reconstruction and exact partial-member pressure retirement. Actual received changes, independent current freshness, baseline/gap semantics, private correction and independent learned support remain. Age eligibility ends when a block's oldest record reaches the horizon; reads apply it even before physical cleanup. Whole-block expiry may remove younger optional neighbors; no lasting/required support is housed only in those blocks.

Retain the authored age horizon and current numerical optional memory targets as initial tuning, with a changed representation/accounting meaning: compact records and sealed block bytes, rather than recursively deduplicated proof/closure atoms. Use the existing 64 KiB preferred block target and, provisionally, one open block per observer bounded by both 256 typed change/event slots and a 64 KiB conservative encoded-size reservation. The compact record constructor owns fixed tuple/header charges and cached string/value sizes; the existing rich-value admission owner computes a value's size once before accepting it. Do not call a recursive graph-size estimator on every append. Large indivisible inputs require the existing explicit single-record admission bound before copying and are sealed directly, never accumulated in an unbounded open block. Seal or stop optional recording before exceeding either open-block bound. Once sealed, charge actual encoded block bytes plus cached payload sizes of its unique owned rich-value list, then reuse that total. Short pooled IDs cannot hide large retained descriptions or geometry. Repeat charging a value across distinct blocks is deliberately conservative; do not restore a per-entry exact deduplication ledger. Account one admitted open block/indivisible-record slack per active observer and existing pending-save capacity separately. A limit checked only after building an arbitrarily large graph is insufficient. When admitting a detail baseline, reserve one constructor-bounded closing marker (bytes and slot) in the existing bounded history/control accounting. At most the configured active tracks and supported field parts hold reservations; splitting a scope transfers its per-part units instead of duplicating budget; the first terminal/refusal consumes its scope’s reservation into an ordinary block record. Equal subject/time/reason/coverage boundaries coalesce, while independently timed endings retain their affected field parts. Decline a new baseline if payload plus closing reserve cannot fit. Closed markers stay charged until normal retirement, repeated refusals add nothing, and a later resume needs new admission capacity. No separate unbounded gap log or mutation of sealed records is permitted. These provisional engineering envelopes need worst-case input and steady-retirement checks. No new unbounded text, native queue, lifetime index or growth exemption is introduced.

A finite permitted thought may retain its admitted input until its existing deadline even if optional history expires. This deliberately changes the former expiry-invalidates-pending rule without extending saved-history eligibility. Existing request byte/slot/deadline bounds cap that transient memory, including its selected native/rich payload closure rather than only rendered prompt text. Explicit forgetting/correction/privacy revocation and timeline replacement still cancel affected publication; physical actions need current authority/preconditions. The separate [world timing proposal](../worlds/base/attention.md#bk24-timing-qualification) and [PS-L02](product-scalability.md#ps-l02--attention-and-sensory-grouping) own ordinary sensing changes and their responsiveness tradeoffs. [BK24](../maintainers/production-data.md#bk24--reception-cost-removal) owns delivery; speed, cleanup sustainability and population capacity are unproved.

[BK25's execution/read conversion](../projects/bookkeeping-simplification-tech-design.md#16-proposed-native-execution-and-current-read-reduction) adds no gameplay/storage cap or fidelity reduction. Borrowed read scopes retain only requested current subjects/parts until mutation or a wait; receiving preparation lasts only through its exclusively owned accepted prefix; existing view-cache eviction bounds presentation reuse. No lifetime encounter map, saved cache, new history lease or per-field SQL row is selected. Genuine broad first acquisition remains proportional to observers × received subjects/parts; ten attention slots do not bound that work. Conditional direct-field storage must measure total native/encoded/resident amplification before adoption. Existing work, recent-memory, pending-input and save limits continue to apply.

[BK26's deadline/attention preparation](../projects/bookkeeping-simplification-tech-design.md#17-proposed-sensory-deadlines-and-attention-preparation) retains those limits. Transient contact tickets use requested observers × selected entries; lazy annotation/candidate working projections can use requested observers × current candidates. Both end with the native invocation, without cross-publication inheritance. Receiving descriptors end with their prefix; lazy geometry ends with its compatible read. No preparation is saved. First acquisition and actual ranking/correspondence can still visit all current candidates; relation paging bounds rich input preparation, not the cheap membership pass. There is no new visible-subject cap, numerical tuning or fidelity loss. [BK27](../projects/bookkeeping-simplification-tech-design.md#18-proposed-status-invalidation-and-event-only-publication) retains existing native-feed overflow fallback, event-feed thresholds and real history release. Total cold construction, invalidation, allocation and maintenance costs require isolated measurement before adoption.

BK24 capture uses the same whole-block eligibility at one durable revision for blocks, temporal perspectives and shared-value ownership validation. Existing save-package bounds remain unchanged; safe allowance-specific failures distinguish per-record bytes, package bytes and stream lines. [Retained-state export](../projects/bookkeeping-simplification-tech-design.md#retained-state-checkpoint-and-recovery) and E3 own its bounded-query experiment; physical debt cannot require a second full retained-ID catalogue.

The [reviewed-source follow-through](../projects/bookkeeping-simplification-tech-design.md#19-reviewed-source-work-removal) installs R1/R2/P1, with broader operating qualification open. R1/R2 retain the existing save/read envelopes and remove placement-induced deletion and no-recent body hydration. They add no archive cap: legitimate retained world history can grow independently of bounded character recent memory and must remain cold-selected, never walked per tick. P1 uses constant-size completed broad state per observer plus existing explicit per-part exceptions; both latest and completed frames count toward real reference ownership, while selected baseline repair stays bounded by selected tracks/members. Initial broad acquisition remains proportional to actual witnesses/subjects; this is no new visibility limit. N2 is evaluated and removed; A5 adds no new transient owner or bound. S2 is not selected because the existing meter cannot bound safe continuation; current coherent returns, 8 ms I/O/32 ms publication targets and native limits remain intact. Q1 is not adopted because ordinary progress has no genuine revocation work. Each optional change needs isolated whole-caller benefit including cold/exception/retained costs, or is removed. No slower sight, shortened memory, wider pending allowance or new saved cache is selected.

[BK28's proposed removal stages](../projects/bookkeeping-simplification-tech-design.md#20-receiving-preparation-and-command-wait-removal) preserve these numerical limits. Native knowledge/support scheduling adds only scalar actor metadata; support cleanup scans the existing quota-bounded capsule set once per dirty generation and retains existing membership query guards, rather than storing another growing candidate map. Exact retirement intent is separate from its pending read context. Group-removal transport chunks compose into one query relation; bounded actor-selection requests retain their complete exclusion arrays. The world-owned after-release experiment discards qualified routine own movement instead of creating an impression, while preserving exact recent/action support and meaningful learning. Initial account creation remains. The after-release choice lives only in its canonical retention payload; unchanged candidate selection needs no extra SQL column/index. Repair coverage and the after-release decision require coordinated current-format conversion; no legacy reader. Each mechanism must measure its added writes, cold/fallback work and retained memory as well as removed queries/records.
