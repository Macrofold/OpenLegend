# Persistence, checkpoints and recovery: limits and constraints

[Feature contract](../save-and-load.md) · [Implementation work](../maintainers/save-and-load.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [checkpoint-format.ts](../../apps/server/src/checkpoint-format.ts), [save-files.ts](../../apps/server/src/save-files.ts), [autosaves.ts](../../apps/server/src/autosaves.ts), [operational-backup.ts](../../apps/server/src/operational-backup.ts).

## LA167

**Changed — current checkpoint path · Restrictiveness: Safe.**

Only one checkpoint capture is admitted at once. Different manual requests receive busy; identical requests share completion. Restore fences concurrent mutation; simulation can continue while a pinned checkpoint is written.

**Reason / tradeoff:** Bound capture work and preserve a coherent revision. Single-capture admission is tunable; atomic restore/authorization are correctness requirements.

[Implementation starting point](../../apps/server/src/game-saves.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA171

**Historical — needs recheck · Restrictiveness: Safe.**

Routine simulation progress is durably saved about once per real second; explicit commands are saved immediately.

**Reason / tradeoff:** Keep the documented tradeoff between write cost and losing the latest unsaved routine progress after an abrupt crash.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA172

**Historical — superseded canonical storage · Restrictiveness: — (superseded).**

The former whole-world snapshot/journal cadence was 120 durable revisions or a 1 MiB change batch. Supported gameplay now uses canonical per-owner SQL records; do not treat that cadence as the current ordinary write path.

**Reason / tradeoff:** Avoid whole-world rewriting; current per-owner batching remains separately bounded.

[Implementation starting point](../../apps/server/src/world-records.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA173

**Historical — needs recheck · Restrictiveness: Safe.**

The server tries to keep the latest 512 events in active world state and moves older unreferenced events to stored history in batches of at least 256, starting above 768 events.

**Reason / tradeoff:** Keep this storage-placement policy; moving an event out of active state must not delete its saved history or break a memory that still refers to it.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA174

**Historical — needs recheck · Restrictiveness: Safe.**

A database write batch is limited to 262,144 bytes or 900 query parameters.

**Reason / tradeoff:** Keep manageable database statements and process remaining rows in subsequent batches without losing transaction correctness.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Keep**.

## LA175

**Current — source inspected at `af1eb02` · Restrictiveness: Safe.**

PostgreSQL connection/read statements have a 5-second timeout; write transactions set a 30-second statement timeout. SQLite busy-lock waiting is up to 3 seconds. These are not end-to-end queue deadlines, scan-count caps or SQLite CPU-query interruption.

**Reason / tradeoff:** Bound external storage stalls while permitting larger atomic extraction/restore writes; report genuine storage failure. The original audit’s blanket 5-second statement claim is superseded.

[Implementation](../../apps/server/src/postgres.ts); [queue exposure](native-work.md#nw11).

## LA176

**Changed — current checkpoint path · Restrictiveness: Too liberal.**

No named-manual-save count ceiling; saves persist until deleted. New streamed packages use SV04–SV06; the former 64 MiB ceiling remains only on legacy JSON reading (SV14).

**Reason / tradeoff:** Keep complete user-selected saves; there is currently no overall disk quota. Backup separately refuses more than 10,000 retained packages (SV13).

[Implementation starting point](../../apps/server/src/save-files.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA177

**Historical — needs recheck · Restrictiveness: Safe.**

Gameplay-command retry records use a 24-hour retry window and retain recent command-session boundaries before pruning older records.

**Reason / tradeoff:** Keep duplicate-action prevention when cleaning old retry records, rejecting commands that belong to an expired session.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Review**.

## LA237

**Historical — needs recheck · Restrictiveness: Medium.**

Only one server process can own PostgreSQL world-writing access, and game mutations/database transactions run through serialized execution.

**Reason / tradeoff:** Keep exclusive authoritative writing so simultaneous changes cannot overwrite each other or produce inconsistent saved state.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Keep**.

## SV01

**Reported · Restrictiveness: Safe.**

**Autosave cadence:** Every 5 minutes of running real time. Paused time does not count. This is not five in-game minutes.

**Reason / tradeoff:** Periodic crash-recovery points without capturing every commit; exact cadence was an engineering default.

## SV02

**Reported · Restrictiveness: Safe.**

**Autosave retention:** 3 complete checkpoints. Normally about ten minutes between the oldest and newest retained points.

**Reason / tradeoff:** Bound automatic disk use; three points offer only a short recovery window.

## SV03

**Reported · Restrictiveness: Safe.**

**Before-load recovery:** 2 recovery packages. Extra protection around restoration. Only the latest appears as “Before last load” in the UI.

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

**Capture duration:** 2-minute scan budget. Checked between records; it is not a guaranteed timeout for stalled filesystem operations.

**Reason / tradeoff:** Bound an active database snapshot/scan lifetime; it cannot preempt a stalled filesystem call.

## SV08

**Reported · Restrictiveness: Safe.**

**Worker memory:** 256 MiB V8 old-generation heap. This is not a cap on total process memory or restore memory.

**Reason / tradeoff:** Contain worker heap growth; restore and total RSS need separate qualification.

## SV11

**Reported · Restrictiveness: Safe.**

**Save-list pagination:** 100 entries per response, using 101 to detect another page. Retained manual-save count remains unlimited.

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

**Reported · Restrictiveness: Safe.**

**Older JSON backups:** 64 MiB for legacy backup restore/import. I extended this guard to the operational tools; the legacy gameplay-save guard already existed.

**Reason / tradeoff:** Legacy formats parse a whole JSON document; avoid unbounded legacy allocations.

## SV15

**Reported · Restrictiveness: Safe.**

**Internal database batches:** 64 rows per capture page/backfill batch; 1,000 IDs per eligibility-rebuild batch. Performance tuning choices, not gameplay limits.

**Reason / tradeoff:** Bound individual SQL operations without reducing total accessible history.

## SV16

**Reported · Restrictiveness: Safe.**

**File buffers:** 256 KiB write-flush threshold; 64 KiB read chunks. Internal throughput/memory tradeoffs.

**Reason / tradeoff:** Trade transient memory for streaming throughput; no content is intentionally omitted.

## SB01

**Reported · Restrictiveness: Safe.**

Autosaves are always enabled. There is currently no setting to disable them or change cadence/retention.

**Reason / tradeoff:** Provide recovery by default; operator control has not been implemented.

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

Listing saves avoids full checksum verification. It checks metadata and file size; full checksums run during load and retention. Same-size corruption can therefore remain visible in the list until examined.

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

Autosave status is displayed in the creator’s Game panel and refreshed through catalog requests. It is not a continuously updating global notification.

**Reason / tradeoff:** Keep operational feedback in the existing creator surface; no global status delivery was added.

## BW04

**Reported · Restrictiveness: Medium.**

Legacy feeling migration only supports the known fear/discomfort format and decay rate. Equipment migration only rebinds understood weapon references; unsupported references block migration. Unknown legacy item definitions do not automatically gain packing compatibility. [Feeling migration](../../packages/domain/src/appraisal-migration.ts), [object migration](../../packages/domain/src/object-migration.ts)

**Reason / tradeoff:** Only understood legacy semantics can be converted without guessing or losing references.

## SV17

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**Save catalog pages still scan the full directory.** SaveFiles.list iterates every save directory and reads metadata/file size before selecting a page. With limit set, retained result metadata is bounded to at most 101; directory visits and filesystem calls are not. Without limit, it retains all matching metadata. Three rolling autosaves do not bound indefinitely retained manual saves.

**Exposure / consequence:** Catalog reads/rotation/backup get slower as manual-save counts grow. Reaching thousands of manual checkpoints requires sustained explicit saving; it is less imminent than automatic memory growth. This is separate from the 10,000-package operational backup refusal.

**Reason / tradeoff:** Filesystem enumeration avoids another writable catalog for the first implementation. Keep the present policy until measured save counts warrant an indexed/paged catalog; do not prioritize a hypothetical 10,001st save over routine gameplay.

**Evidence:** No new catalog timing run; page size is a result-memory bound, not an I/O-work bound. [Implementation](../../apps/server/src/save-files.ts) (`list`). [Revisit R02](../maintainers/limits-audit.md#r02).
