# Persistence, checkpoints and recovery: limits and constraints

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

**Current — checked September 27 · Restrictiveness: Safe.**

**Changed 2026-09-28 (background saves).** Saves are now [background or synchronous](../save-and-load.md#background-and-synchronous-world-saves). Simulation progress is snapshotted about once per real second and written in a background save, without holding the world mutation queue; native time continues during the write. Commands, AI results and other effects still use synchronous saves and are saved before acknowledgment. After an abrupt crash, the simulation progress since the last completed background save is lost: about one second (up to 5 s with an [SV21](#sv21) deferral), plus the previous write's full duration (including any [SV20](#sv20) retry pauses and busy waits), plus up to about 4 s of the in-flight write ([SV19](#sv19)). Backpressure delays native time but does not discard it, and the next snapshot is due one second after a write finishes, so a slow previous write counts in full. A wall clock stepped backwards starts a save at once instead of suspending the cadence. Computed navigation results join simulation progress (saved in the background) instead of forcing a synchronous save before movement; after a crash, the durable request can prepare its route again.

**Reason / tradeoff:** Keep the documented tradeoff between write cost and losing the latest unsaved simulation progress after an abrupt crash, while removing storage latency from native time. The loss window now grows with storage latency until backpressure applies. [Design](../projects/ordered-async-saves.md#ordered-persistence-design).

[Implementation starting point](../../apps/server/src/world-service.ts).

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

**Current — source inspected · Restrictiveness: Safe.**

Write batches use at most 10,000 PostgreSQL parameters and approximately 262,144 encoded bytes; one oversized row remains admissible. History construction enforces its combined parameter-byte bound before retaining additional rows, writing source rows before audiences/perspectives inside the same transaction. Other record batches use the shared parameter limit and their existing encoded-byte bounds.

Compatible new/updated record rows are grouped within their table before batching; alternating observer updates no longer force separate statements per observer. Secondary-unique-index tables retain original row order. Duplicate-create checks, parent ordering and atomic commit remain unchanged.

**Reason / tradeoff:** Larger PostgreSQL batches reduce local round trips. SQLite support and its portable parameter floor were removed on 2026-09-27. The byte bound prevents one huge multi-row statement. The former shared 900-parameter ceiling was replaced only for PostgreSQL; this is not a cap on saved records or permission to split authoritative commits.

[Shared parameter limit](../../apps/server/src/sql-rows.ts) · [HistoryBatch](../../apps/server/src/history-batch.ts) · [Measurement limits](../verification/three-times-scene-performance.md) · [AR04.3](../maintainers/action-reconciliation.md#integration-tasks).

## LA175

**Current — source inspected at `af1eb02` · Restrictiveness: Safe.**

PostgreSQL connection/read statements have a 5-second timeout; write transactions set a 30-second statement timeout. These are not end-to-end queue deadlines or scan-count caps. The former three-second SQLite busy-lock wait was removed with that adapter.

**Reason / tradeoff:** Bound external storage stalls while permitting larger atomic extraction/restore writes; report genuine storage failure. The original audit’s blanket 5-second statement claim is superseded.

[Implementation](../../apps/server/src/postgres.ts); [queue exposure](native-work.md#nw11).

## LA176

**Changed — current checkpoint path · Restrictiveness: Too liberal.**

No named-manual-save count ceiling; saves persist until deleted. New streamed packages use SV04–SV06; the separate 64 MiB guard applies to non-streamed payload decoding, which must still pass current format/state validation (SV14).

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

**Capture duration:** 2-minute scan budget. Checked between records; it is not a guaranteed timeout for stalled filesystem operations.

**Reason / tradeoff:** Bound an active database snapshot/scan lifetime; it cannot preempt a stalled filesystem call.

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

**Current — source inspected at `bdaecaac` · Restrictiveness: Safe.**

**Non-streamed payload guard:** 64 MiB. `SaveFiles` bounds whole-JSON reads/integrity checks separately from streamed checkpoint allowances. This is not a supported legacy restore/import path: current format/state validation still applies, and the preceding-layout reader and SQLite importer were removed.

**Reason / tradeoff:** Bound whole-document allocation without claiming backwards compatibility. The original older-backup recommendation is historical; [SB15](#sb15) and the [root policy](../../AGENTS.md#development-save-policy) control current support.

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

Autosaves are enabled by default. Holders of the save grant can disable them or change cadence and retention in the Game panel; the settings are stored per world outside gameplay rewind (a load does not change them) and survive restart. Disabling them leaves only manual saves and database commits for recovery.

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

Listing saves checks metadata and file size, so same-size corruption can remain listed. Retention verification checks checksums and byte/record framing/counts; it does **not** decode/migrate the full world or validate all restore invariants. A retained integrity-checked file is not a proven restorable world. Load performs the deeper reconstruction and validation. [Implementation](../../apps/server/src/save-files.ts) (`verify`), source inspected 2026-09-26.

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

**Changed 2026-09-28 (SL08-A).** Checkpoint status is displayed in the creator’s Game panel and refreshed through catalog requests; it is not a continuously updating global notification. The latest checkpoint failure (automatic, manual or recovery) is stored with the world outside gameplay rewind and shown until a save-grant holder acknowledges it, including after restart. If storage cannot record it, it is shown from memory with that caveat. Catalog health (damaged/unlisted slots) stays separate. The last automatic checkpoint time comes from the catalog after restart, so the panel does not imply protection it cannot see. [Implementation](../../apps/server/src/game-saves.ts) (`recordFailure`, `acknowledgeFailure`).

**Reason / tradeoff:** Operators must not lose failure evidence to a restart; one retained record avoids a failure log without bounds.

## BW04

**Historical — unused conversion code remains; not a supported feature.**

**Historical conversion envelope, not supported loading behavior.** The [feeling](../../packages/domain/src/appraisal-migration.ts) and [object](../../packages/domain/src/object-migration.ts) converters remain exported but have no repository callers at `bdaecaac`. They were limited to known fear/discomfort decay and understood equipment/packing bindings. Current-model validation remains required; a separate residual startup storage-conversion path is still present and is not an authorized compatibility feature. [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths) owns retirement of these residual helpers rather than extending or reconnecting them.

**Historical reason / current tradeoff:** The old conversion refused unknown semantics instead of guessing. That does not override the present no-compatibility rule or authorize migration work.

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

**Retention and paging use a durable capture sequence.** Each capture receives the next per-world sequence from the database before it starts; the value survives restart. The first capture in each server process raises the counter to at least the highest sequence among the slots on disk, so a restored slot never outranks a new capture. Catalog order, pagination cursors and rotation sort by sequence, then wall-clock time and UUID only as tie-breakers; wall-clock time is display only. Slots without a sequence (captured before this change) sort as oldest. A capture whose sequence allocation rolls back with a failed restore transaction can share a number with a later capture; ties then fall back to time and UUID.

**Reason / tradeoff:** A backwards clock can no longer make rotation delete the newest capture. [Implementation](../../apps/server/src/save-files.ts) (`compareSaves`).

[Implementation](../../apps/server/src/save-files.ts).

## SB15

**Changed · Restrictiveness: Safe.**

**Only the current physical format is supported.** Database format 4, `records-jsonl-2` and save format `development-2026-10-02-native-continuation` require the combined perspective/access table, maintained event totals and [saved sampling progress](../simulation-time.md#native-interval-contract). The integrated model also requires exact recipe-family pins, sparse body meters and the explicit memory-search projection. It replaces the preceding format-3 gate without retaining an older reader. The remainder must be finite, positive above the current time tolerance and no greater than the world-owned fallback horizon; any exact deadline must agree with the saved clock and remainder. Exact current table coverage is mandatory. Incompatible databases and checkpoints fail explicitly without conversion or deletion under the [development save policy](../../AGENTS.md#development-save-policy).

**Historical rationale / current scope:** The former reader converted one understood preceding foundation layout. That preceding-format reader was removed with the history layout change; it is not a promised support window. The separate snapshot/journal fallback still present in `store.ts` is a residual policy violation tracked in [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths), not evidence that older format-3 checkpoints are supported. Same-version integrity and complete recovery remain required. [RP02](../maintainers/revisitable-policies.md#rp02--development-state-compatibility) tracks any future owner decision.

[Implementation](../../apps/server/src/checkpoint.ts). Normal startup's maintained-count check and explicit full-audit boundary are documented in [save/load](../save-and-load.md#current-history-capture-boundary).

## SB16

**Current — source inspected 2026-09-26 · Restrictiveness: Too liberal.**

**Capture snapshot lifetime includes file publication.** The capture read transaction remains open while records are streamed, synchronized and published. Slow output can prolong PostgreSQL row-version retention despite bounded page/worker memory. The two-minute scan budget is checked between records; it does not guarantee a deadline for final filesystem writes/sync/rename or a stalled operation.

**Reason / tradeoff:** Preserve one consistent cut without copying the world into RAM; database version retention trades against output speed. The gameplay barrier ending is not the read snapshot ending.

**Measured 2026-09-28 (shared host, SL09-C):** throttled output kept the snapshot open until the two-minute deadline aborted the capture; the oldest-snapshot age reached 85–132 transactions, command latency did not rise materially (p95 160 against 147 ms on the quietest run), and the abort released the snapshot and removed staging. A stall inside one write, sync or rename is still unbounded. [Evidence](../verification/ordered-async-saves.md#slow-output-snapshot-pressure-sl09-c).

[Implementation](../../apps/server/src/checkpoint.ts).

## SB17

**Current — source inspected 2026-09-26 · Restrictiveness: Safe.**

**Operational backup includes every retained save and requires canonical storage.** The backup command copies every retained slot selected from the world’s catalog; it offers no selective-save scope. A damaged slot/catalog blocks the operation. The source must already have a canonical world head: backup opens read-only and does not migrate legacy storage. Incompatible data must be preserved for an explicit owner decision; no legacy migration is supported. The current error still suggests starting a compatible older server, an obsolete instruction tracked by [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths).

**Reason / tradeoff:** Provide a complete recovery set and avoid mutating the source during backup. This costs space proportional to retained slots; an incompatible source is refused, not migrated. Partial/selective backup is not current behavior.

[Implementation](../../apps/server/src/operational-backup.ts).

## SB18

**Current — source inspected 2026-09-26 · Restrictiveness: Too liberal.**

**Changed 2026-09-28 (D1/D2 reconciliation).** Operational restore still copies retained slots before its database installation, but records which slots the attempt newly published. An existing-world restore also writes its pre-restore recovery checkpoint before the installation transaction. If the installation definitely did not commit, it removes exactly those slots and that recovery checkpoint, keeping any slot the target's current recovery pointer references and any whose identity or checksum changed; the source backup is never touched. If the failure came from `COMMIT` itself (outcome uncertain), copied slots and the recovery checkpoint are kept and listed for inspection. A process kill between copying and installing still leaves copied slots and, once written, the unlisted recovery checkpoint (a later in-game load's recovery rotation trims it), and the reconciliation assumes the target data directory is used only by that restore.

**Reason / tradeoff:** Immutable copied files avoid overwriting a different slot; filesystem publication stays outside the database transaction, so reconciliation is in-process and conservative. [Implementation](../../apps/server/src/operational-backup.ts) (`restoreBackupSlots`, `discardRestoredSlots`).

[Implementation](../../scripts/restore-world.ts).

## SB19

**Removed — PostgreSQL-only storage, 2026-09-27.**

The former SQLite writer/read workers, 128-RPC bounds and 128-statement caches were removed with SQLite support. They isolated native SQLite CPU and preserved transaction ownership, but no embedded/offline deployment is required. PostgreSQL keeps its existing lane limits; removing this adapter does not relax authoritative commit, save/load or uncertain-write guarantees. See the [implementation plan](../projects/postgresql-cognition-preparation.md).

## SV19

**Current 2026-09-28 · Restrictiveness: Safe.**

**Background save backpressure: 4 s.** At most one background save is in flight. When the next one is due while one is still writing, new simulation progress stays in memory; once the in-flight background save has been outstanding for 4 s, native time waits for it before advancing again. Backpressure delays native time; it does not discard it: time held back while waiting is simulated after the write finishes, and the next snapshot is due about one second later. Simulation progress lost in a crash is therefore bounded in real time by about one second (up to 5 s with an [SV21](#sv21) deferral), plus the previous write's full duration (including any [SV20](#sv20) retry pauses and busy waits), plus up to about 4 s of the in-flight write.

**Reason / tradeoff:** Bound memory and pending work under slow storage while absorbing ordinary write latency (without injected delay on the loaded shared host, background saves peaked below 1 s and the slowest world commit, a synchronous save, took 3.4 s). [Implementation](../../apps/server/src/world-service.ts) (`BACKGROUND_SAVE_BACKPRESSURE_MS`).

## SV20

**Current 2026-09-28 · Restrictiveness: Safe.**

**Background save admission retries: 4 attempts.** If the PostgreSQL writer queue refuses a background save before `BEGIN` (busy for 5 s or full), the same prepared change set is re-submitted after pauses of 0.5, 1 and 2 s, four attempts in total, then storage latches. A full queue refuses instantly, so the pauses give it about 3.5 s to drain; a busy queue adds its own 5-s wait per attempt. Nothing ran on a refused attempt. Simulation progress that is saved synchronously instead ([SB20](#sb20)) makes one attempt, because it holds the mutation queue; a refusal leaves its progress for the next tick, as before. This is admission of an unsent write, not a retry of a statement that may have executed; no other query is retried.

**Reason / tradeoff:** Once a released snapshot is live, only its own prepared change set may follow the durable baseline; latching after a bounded wait is safer than diffing a new snapshot against the old baseline, which would delete released records. [Design](../projects/ordered-async-saves.md#ordering-rules).

## SV21

**Current 2026-09-28 · Restrictiveness: Safe.**

**Background save deferral: up to 5 s.** While a command or any other operation that is not simulation progress waits for, or holds, the mutation queue, no new background save starts; that operation's own synchronous save carries the simulation progress with it. After 5 s without a completed save, a background save starts anyway. One 5-second admission budget covers both the wait for an in-flight background save and the wait for the queue; the operation receives busy after it. Exception: when the cap starts a background save while operations are already queued (a stream of requests, or the first tick after any gap of 5 s or more without a save), a queued command's synchronous save waits for that background save inside the queue for the rest of its write, as simulation-progress saves did before this change, and operations behind it may get busy.

**Reason / tradeoff:** A command should not wait inside the queue behind a background save started just before it; the cap prevents a stream of read-only operations from starving background saves.

## SV22

**Current 2026-09-28 (PF06) · Restrictiveness: Safe.**

**Shutdown deadline: 30 s, backstop 45 s.** Graceful shutdown stops admitting requests, then gives each stage (tick, checkpoint drain, AI director, navigation, final world save, projection, HTTP, storage) a share of one 30-second budget; a late or failed stage is reported and the next stage still runs. Storage close is always attempted; if it does not finish in the remaining budget (a stalled database), that is reported and the process exits one second after its report, which drops the connections. A latched storage failure skips the final save. The process reports whether the final save completed and the last revision it confirmed durable; without a confirmed save it says the database may be ahead if a commit was still outstanding. A repeated signal within one second of the first is treated as the same request (under `pnpm dev`, `tsx watch` relays Ctrl-C as a second SIGINT); a later one exits immediately, and a 45-second backstop exits a shutdown whose report never arrives. Under `pnpm dev`, `tsx watch` also force-kills the server 5 s after relaying a signal, so the 30-second budget applies only to `pnpm start` or a direct run.

**Reason / tradeoff:** A stalled database or checkpoint must not keep the process and its writer lock alive indefinitely; unsaved simulation progress is reported rather than hidden. [Implementation](../../apps/server/src/http.ts) (`shutdown`), [signals](../../apps/server/src/main.ts).

## SV23

**Current 2026-09-28 (C05) · Restrictiveness: Safe.**

**Autosave setting bounds:** cadence 1–1440 minutes of running time; retention 1–20 automatic checkpoints. Invalid stored settings disable automatic saves and are reported until saved again; they are never guessed.

**Reason / tradeoff:** Allow day-long cadence and a longer rolling window while bounding automatic disk use (20 complete packages at the 256 MiB package limit is 5 GiB).

## SB20

**Current 2026-09-28 · Restrictiveness: Safe.**

**Some simulation progress is still saved synchronously.** Simulation progress is saved in the background only if every record its hot-event trimming and history release would remove from memory is the exact object SQL already holds. Otherwise (for example an entity retired, an appraisal resolved or a contribution ended since the last completed save) that snapshot uses a synchronous save in the previous order, write then release, holding the mutation queue for its write. The collection responsible is recorded for attribution.

**Reason / tradeoff:** Keeps “not in memory implies already in SQL” for every reader during a write, instead of evicting records before they are durable. Frequency is not yet established: the drills and matched scene runs produced few background saves and no synchronous fallback ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)). Measure it on a retirement-heavy or long-running world before choosing durable-only release per record.

## SB21

**Current 2026-09-28 · Restrictiveness: Safe.**

**Commands and AI results still use synchronous saves.** Player commands, AI characters' finished actions and replies (including conversation updates) and other background-job results, world-editor changes, pause/resume and loads change the live world only after their own save completes, so each holds the mutation queue until it is written. Only simulation progress, which is already visible before it is saved, uses background saves. Under a slow database these synchronous saves are what still freeze the world ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)).

**Reason / tradeoff:** Preserves the durable publication boundary (no effect is visible before it is durable). Pipelining these writes would need durability-gated view publication; see [PF05](../maintainers/performance.md#pf05--public-view-and-browser-responsiveness).
