# How much of slow saving is work inside PostgreSQL?

October 16, 2026. **Completed diagnostic; 3× remains unmet.**

The measured run still fails: **2.54×**, with **333 ms** command-delay p 95. It accepts all 30 scheduled commands, keeps all 17 people/40 animals alive and passes the required resident activity checks. The temporary database service has been removed normally.

| Work during the measured scenario       |         Measured time | What this says                                                                                                                           |
| --------------------------------------- | --------------------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL executing game/probe queries |           **2.492 s** | Database elapsed time, including its internal waits; diagnostic query excluded.                                                          |
| PostgreSQL planning those queries       |           **0.382 s** | Query planning is measurable, but cannot explain all waiting.                                                                            |
| Game awaiting SQL                       |           **7.919 s** | Includes transport, scheduling and callbacks. Its boundaries/grouping differ from database totals; do not subtract them as measured CPU. |
| Completed world saves                   |           **6.232 s** | Overlaps SQL and other operations. Longest completed save 204 ms.                                                                        |
| Summed waiting to change the world      |           **9.182 s** | Different requests can wait during the same period; not 9.182 exclusive wall seconds.                                                    |
| Native simulation calls                 |          **21.038 s** | Elapsed work in the simulation path; not a separate exclusive CPU partition.                                                             |
| Whole-process CPU / real duration       | **29.206 / 30.119 s** | Close to one core's full budget across the process, including its worker threads.                                                        |

The important result is that database execution alone does not explain all slow input. Shared simulation work and application-side save preparation/scheduling remain substantial. This is one instrumented run on a private service; it is not proof that the shared development database always behaves the same way.

Player commands wait behind saving. The recent profile records 10.05 seconds in completed saves and 14.21 seconds of summed waiting to change the world. Those periods overlap. Existing SQL timings include waiting for the game to resume its JavaScript callback; they do not tell us how long PostgreSQL itself spends on a request.

This test uses PostgreSQL's own completed-statement counters to separate those costs. It runs one ordinary older-world scenario with 17 people and 40 animals, actual walking, finite food/work resources and unchanged game rules. The already qualified private newer edit library stays identical. A new temporary database service has its own port, directory and credentials. The shared development service is untouched; normal durable saving remains enabled.

Before/after snapshots record actual query planning and execution time, completed requests, affected rows and file/cache activity for the owned database. Query identities remain exact; text is bounded to 1000 characters per query with its hash and complete length. More than 1000 query shapes, a counter reset or discarded statistics fails coverage. Snapshot request timestamps expose their small enclosure around the game window. Unfinished work stays outside completed totals.

PostgreSQL reports execution elapsed time, including waits inside the database; this is not pure processor time. Tracking planning can itself add overhead, so this is a diagnosis, not a capacity benchmark. The official [PostgreSQL14statement-statistics reference](https://www.postgresql.org/docs/14/pgstatstatements.html) describes these counters and that overhead. No benefit from a proposed optimization is assumed.

First qualify the installed statistics module with a known 20 millisecond wait and ordinary queries in an exactly owned disposable database. Then qualify the private profiler source/types/real navigation worker and run the selected 30 second scenario. Preserve all activity, input, error and cleanup failures. Finally remove the exact owned service and verify its databases, processes, port, directory and credentials are gone. No game mechanic, product query or shared setting is retained by this diagnostic.

[Standalone bottleneck report](bottlenecks.md) · [Plan](../../projects/three-times-scene-performance.md#measure-database-execution-separately) · [Experiment register](../../maintainers/performance.md)

## Initialization failure preserved

The first isolated-service initialization fails because the sandbox denies PostgreSQL’s required macOS shared-memory operation. No database server starts. The dependent source-copy stage also stops because service qualification is absent; no application source is accepted. The exact recorded failed-initialization directory and its temporary credentials are removed after checking its ownership marker, absent data directory and closed owned port. Nothing in the shared service changes. A new isolated attempt will use the normal execution-permission review for that operating-system requirement; original failure evidence remains intact.

## Measurement qualification

The isolated service starts after normal execution review and passes identity, durable-settings and owned-fixture cleanup checks. Its known 20 millisecond wait is measured as 22.21 milliseconds; an actual update is counted once with one affected row. Planning and file-I/O timing are enabled only in that owned service. The private profiler passes formatting, equivalent formatted execution, TypeScript, exact package/source guards and all six namespaces through the real separate route worker.

The first exact snapshot-query proof stops before creating a database: its source extractor expects punctuation that formatting changed. Preserve that failed helper. The corrected extractor reads only the actual known SQL literal up to its closing delimiter, forbids interpolation, and uses synchronous pre-connection database-identity recording. No application or game result is claimed by the failed extraction.

## First older-world measurement: failed coverage

The selected game restores the complete older world in 47.116 seconds and reaches its 30 second gameplay phase, then fails the after-snapshot bound. Its failure report, log and normal owned-database/session/directory cleanup remain intact. No full performance or database-time result is accepted. Metadata inspection in this new private service finds 1619 query shapes for that generated database across setup and play, above the 1000 row retention bound. Installing the statistics view in the temporary service's administrative database enables that inspection; the shared service remains untouched.

Before a new source copy, refine collection without increasing the 1000 row or 4 MiBbound: clear only the generated test database's diagnostic statement counters after restoration, immediately before the measurement's first snapshot. This does not change game data or database query plans. Materialize one filtered statistics read so its count, totals and ranked rows use the same observed set. Capture complete aggregate counters for every statement, retain the most expensive 1000 query shapes, and explicitly report omitted shapes and their unassigned time. Never relabel the failed all-row capture as a pass. Record reset/snapshot timestamps, complete aggregate deltas and collection overhead. Preserve all original gameplay, source, ownership, activity and error gates.

This changes the measurement design from complete per-query retention to complete totals plus a bounded detailed ranking. Any unlisted time remains a gap, even when the total is known. Reassessed private profiler scope is roughly 60–90 logic lines including the existing hooks and bounded aggregate read; no product/runtime policy change is selected. A new private copy and fresh output paths preserve the failed source/run. Qualify the exact revised SQL/control/reset behavior and source/types/worker before one further original 30 second run, then close the exact owned service normally.

## Complete successful query accounting

The revised exact-query/reset controls pass, including a one-row update and a new 20 millisecond wait after the own-database counter reset. Other databases' call counters stay unchanged. Formatting, execution-equivalent formatting, TypeScript,443 source/package identities and actual six-namespace separate-worker routes pass again on the new private copy.

The successful 30.119 second game records **819 query shapes**, all within the unchanged 1000 detail cap, with **no omitted query time** beyond floating-point rounding. Global statistics reset identity stays fixed and no entry is discarded. After removing the known diagnostic statement, it records 2388 completed calls,2162 plans,22,695 affected/returned rows and 95.421 MBof recovery-log bytes. File-read timing totals 201 ms and file-write timing 30 ms; those do not include every possible operating-system or recovery-log wait and are not proof of physical disk traffic. Database execution time includes such waits.

The largest separately identifiable write family saves the recent character decision/expression results: **175 standalone requests,10,917 row writes,634.497 ms execution and 21.833 ms planning**, with 21.640 MBof recovery-log bytes. Another mixed group beginning with those results takes 146.759 ms; its other tables cannot be separated from 1000 character prefixes. This is the bounded latest 300 result list, **not** the player's permanent command-confirmation history. An initial private family-summary label confused those owners; corrected summary b preserves the counts and original summary a.

The detailed source already has an earlier private optimization that keeps unchanged result positions stable. It reduced 299 survivor writes to zero in controlled storage checks, but an older one-pair game comparison worsened 1.876→1.681×. That negative result remains valid evidence. The current complete database timing now identifies those writes as the largest standalone database family, so a separately registered current four-run retest is justified; this is not a claim that the old negative result disappeared or that fixing this family alone reaches 3×.

The diagnostic snapshot itself is not free. Its first read takes 153 ms at the client, including 135 ms measured database execution, before the gameplay clock starts; its temporary-file traffic accounts for all 1164 temporary blocks read/written in the aggregate. Exclude that known diagnostic work from game totals. The after-snapshot takes 94 ms after the normal measurement cutoff, so database totals enclose that explicit edge. No exact per-request match to application awaits or phase maximum is invented.

All 30 issued walking commands succeed, with no skipped slots, storage/maintenance/SQL rejection or paid call. All 16 residents select at least two new plans (41 total),25 food outputs match, all 17 people/40 animals remain alive. Required source/worker/error/normal owned-database/session/directory checks pass. The 3× and 200 mscommand-p 95 targets fail. There is no browser or sustained-capacity pass.

## Artifacts and cleanup

Successful report `/private/tmp/ol-pf157-aged-0-candidate-20261016-b.json`; exact statement snapshots `.database-statements.json`; attribution `/private/tmp/ol-pf157-database-attribution-20261016-b.json`; corrected query families `/private/tmp/ol-pf157-query-families-20261016-b.json`. Revised source hash12c23350…f52f, with only private profiler evidence collection changed. The first failed source/run and all setup/extraction failures remain separate.

The successful game closes normally, its exact generated database/sessions count0/0 and its directory is absent. The private PostgreSQL service then smart-stops normally; owned postmaster PID, listening port, entire owned directory and credentials are verified absent. Cleanup `/private/tmp/ol-pf157-postgres-cleanup-20261016-b.json`. No shared-service setting, product query, game rule or dependency is changed. Additional/cumulative provider cost remains **$0**.
