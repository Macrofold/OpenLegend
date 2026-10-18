# Would a larger database cache reduce the stalls?

October16,2026. **Completed diagnostic; input and smooth 3× still fail.** A separate database instance did not reliably make the game faster. This test asks a narrower question: does keeping more database pages in that instance's memory help?

| Comparison          | Changes                                                               | Preserved                                                                                                                | Result  |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| 128 MB versus512 MB | Only the temporary instance's database cache and its required restart | Identical game, all character behavior, original durable writes, same PostgreSQL version and all other recorded settings | Pending |

The four runs will use128/512/512/128 MB, each with thirty seconds of actual expanded-game play. Every run keeps real HTTP commands, saving, finite food and sixteen travelling residents. Existing source, actual navigation worker, activity, animal/person survival, input, late-error and exact owned-cleanup checks remain. Only the already owned temporary service is restarted normally; the shared service remains untouched. No timeout is enlarged and no failed observation is replaced with a pass.

After each measured game, the report will record its own database size, largest tables and cumulative reported page reads/cache hits. Those counters include initialization and delayed statistics reporting. Total database size is not its exact active working set. These measurements help interpret the cache trial without pretending to identify every I/O delay.

All four games use one source whose gameplay is byte-identical to the current qualified sixty-second idle-check candidate. Only postmeasurement reporting is added. Full source/type/import/real-worker qualification precedes play. After the comparison, the temporary service must close with normal smart shutdown and verified exact process, port, directory and credential removal. Additional and cumulative provider cost remain $0.

[Previous isolation results](25-database-service-isolation.md) · [Standalone remaining gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md#private-database-cache-comparison) · [Experiment register](../../maintainers/performance.md)

## First128 MB run: game valid, table-detail reporting gap

The first run closes normally with source/worker/dependency/asset/owned-database cleanup intact. It reaches2.980× but command p95609ms still fails. All seventeen people and forty animals survive; actual plans/food, command and late-error checks pass. Its total database size is69,026,595bytes, about65.8MiB. Cumulative reported blocks are7,566read and1,606,411cache hits; I/O-duration tracking is disabled, so zero reported duration does not mean zero I/O cost.

The reader then rejects a null largest-table list. The query is limited to the public schema, while application tables use a separate schema. This is a real missing reporting detail, preserved as failed coverage; no game or SQL execution error occurred. Before continuing, narrow the analysis to the valid total size and cumulative page counts, explicitly retaining the table-detail gap. Keep the exact source identical across all four games; do not repair its query midcomparison or count absent table detail as a pass. A separate reader records that failed detail rather than rejecting the otherwise usable capacity measurements. No activity, error, source, lifecycle, timeout or gameplay gate is relaxed. The table-list query remains unqualified and private.

## Completed comparison

| Run |  Cache | Actual speed | Command confirmation p95 | Accepted / skipped | Plans / matched food | Database size after play |
| --- | -----: | -----------: | -----------------------: | -----------------: | -------------------: | -----------------------: |
| 0   | 128 MB |       2.980× |                   609 ms |              28 /1 |               48 /32 |                  69.0 MB |
| 1   | 512 MB |       2.862× |                   615 ms |              29 /0 |               48 /32 |                  67.3 MB |
| 2   | 512 MB |       2.916× |                   545 ms |              28 /1 |               48 /32 |                  68.2 MB |
| 3   | 128 MB |       2.403× |                 1,117 ms |              26 /3 |               48 /32 |                  63.7 MB |

Mean speed is **2.691→2.889×, 7.34% higher** with512 MB. Mean per-run confirmation p95 is **863→580 ms**, not a pooled percentile. The first128 MB run is faster than either512 MB run, so variation prevents calling this a reliable cache solution. All four still fail sustained smooth3× and responsive input. Mean saving elapsed is6.434→5.919seconds; native elapsed18.091→17.975seconds. Those overlapping, unequal-work totals are not exclusive CPU or exact database execution.

The databases occupy63.7–69.0 MB in total after play, below either allocated cache. That is not their active working set. Cumulative reads/cache hits are7,566/1,606,411;7,353/1,548,462;7,462/1,578,334;6,919/1,457,579 respectively. These counts include setup and asynchronously reported statistics, rather than exact phase I/O. A high fraction of cache hits does not measure the delay caused by the remaining reads. The largest-table detail remains failed coverage in all four reports; it has not been silently converted to a pass.

Every issued command succeeds. Every resident selects three plans, all32produced-food bindings match per run, and all seventeen people and forty animals survive at the endpoint. No stopped plan, late SQL/maintenance/observation rejection or storage error is reported. Source, actual-worker, dependency, asset and exact owned game-database/session/folder checks pass; all groups close normally. Both private restarts use smart shutdown, verify old-process disappearance, record new identities and match every core setting except the selected buffer size.

**The temporary service is now normally stopped and removed.** Its exact final PID and port are gone, its owned directory and credentials are removed, and no shared-service setting, credential or database was changed. No permanent cache tuning or game change is retained from this trial. Evidence: `/private/tmp/ol-pf146-cache-comparison-20261016-a.json`, four raw reports/reviews/source/lifecycle/log records, both restart qualifications and `/private/tmp/ol-pf146-final-service-cleanup-20261016-a.json`. Provider additional/cumulative cost remains $0.
