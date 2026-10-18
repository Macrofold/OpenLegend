# Does the shared database service cause the stalls?

October16,2026. **Completed diagnostic; no reliable full-game benefit.** The game is still too slow after reducing repeated world calculations. This test changes where its database runs while keeping the game the same.

The latest animal-check comparison saves20.03% CPU for identical native work, but running-game mean progress improves only2.29→2.46× and command confirmations remain near one second. Earlier slow-command snapshots show PostgreSQL waiting on real data files. The current CPU profile also contains about12seconds with the main JavaScript thread idle. These observations justify testing the database service; they do not prove it is the sole cause.

A read-only snapshot between tests finds the shared PostgreSQL14.17service using128MBof its own cache, with fourteen other client connections, one active. It does not inspect their queries or data. The filesystem has21GiBavailable and98%reported use. Those are environment facts, not demonstrated explanations.

| Comparison                                       | What changes                                                                | What stays the same                                                                                    | Result                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Shared service versus temporary isolated service | Database instance/port/data directory; temporary private access credentials | PostgreSQL14.17,128MBcache, core settings, normal durable writes, exact game source and fresh workload | Pending                                    |
| Temporary service with128MBversus512MBcache      | Only its private cache setting and required owned restart                   | Same private instance identity/data ownership, game code, workload and durable writes                  | Not yet released; depends on first results |

## Registered method

Use one current sixty-game-second idle-check source with all other mechanics intact. Add endpoint animal alive/dead counts only after measured play, because the earlier fresh profiler records animal presence without life. Qualify the complete source and actual worker first. No new observation runs during measured gameplay.

Create a uniquely owned temporary database service on loopback, matching the installed14.17binary,UTF8/C locales and recorded core settings. Keep fsync, synchronous commit and full-page writes enabled. Its data, socket and private credential files live in its own temporary directory. Existing databases, credentials, settings and the shared service remain untouched. PostgreSQL documents initialization of an independent instance and per-instance buffer settings in [initdb](https://www.postgresql.org/docs/14/app-initdb.html) and [memory configuration](https://www.postgresql.org/docs/14/runtime-config-resource.html).

Compare shared/isolated/isolated/shared with identical30-second actual games, one at a time under the existing300-second watchdog. Each game creates and normally removes only its own generated fixture database and folder. Preserve every incomplete activity, skipped input, slow confirmation, late error and failed cleanup. Source, input, worker, dependency and asset checks remain. No model requests, samplers, recurring external observer or forced collection.

Before starting or stopping the temporary service, verify its unique cluster name, exact data directory and recorded postmaster identity. Require no remaining clients and use normal smart shutdown, then verify its PID/port are gone before removing only its owned directory. [PostgreSQL's control tool](https://www.postgresql.org/docs/14/app-pg-ctl.html) describes that lifecycle. If ownership or cleanup is uncertain, stop further experiments and preserve the evidence. A cache-size comparison is separately selected after the isolation results; no recommendation to alter the shared service is made from setup.

[Standalone remaining gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md#database-service-isolation) · [Experiment register](../../maintainers/performance.md)

## Setup qualification and preserved failures

The unchanged-game copy passes formatting equivalence, TypeScript, six package identities, a real separate navigation worker and fresh expanded-world construction. All executable gameplay files are byte-identical to the qualified current sixty-second candidate; only the postmeasurement report adds animal alive/dead counts. Its 444-file aggregate is `d22f832fafc1a75c42411b15a0036f25b4a792303a41fa6deb96e3753278bab9`.

The first initialization fails before service startup because the sandbox denies PostgreSQL's shared-memory system call. Its exact owned directory and credentials are removed after confirming no database service was created; the failed setup evidence is preserved. A separately authorized fresh setup starts successfully. The first identity comparison rejects the installed version's literal “14.17 (Homebrew)” label; correction keeps exact process, directory, port and unique instance checks. A later summary print fails after the actual authentication, vector extension and create/drop qualification already passed. Preserve both tool failures; neither is a game result.

A settings comparison then finds one difference: message locale defaults to an empty value instead of C. Only the temporary instance is adjusted before any game runs. The sandbox blocks its reload signal; the authorized reload succeeds. The final comparison verifies every recorded core setting equal, including 128 MB buffers and all normal durable-write settings. No shared setting or service is changed. All setup failures and subsequent positive qualification remain separate private records.

The selected four-run sequence is now released one run at a time. No result is claimed from setup. Private source/static/worker records use the PF145 prefix; service ownership and matching-settings evidence are `/private/tmp/ol-pf145-postgres-owned-20261016-b.json` and `/private/tmp/ol-pf145-postgres-settings-comparison-20261016-b.json`. The qualified launcher checks instance identity and the private configuration before and after each run.

### First shared-game setup failed before play

The first shared run stops during CREATE DATABASE after the unchanged thirty-second administration statement limit (PostgreSQL 57014). No measured game report exists. Its process closes normally, all source guards pass, its exact generated database/session counts are 0/0 and its temporary folder is absent. Preserve this failed setup; do not count it as a slow game or silently skip it.

A bounded read-only inspection afterward finds no template-database clients, an 8.7 MB template, eight idle client connections, one active client and an autovacuum worker. Those observations do not identify what consumed the earlier thirty seconds. The owned isolated service remains healthy with no other clients. After inspecting both results, explicitly select a new separately named four-run sequence with the same shared/private/private/shared order, original settings, source and all time limits. The failed first sequence remains separate evidence; no automatic retry or larger timeout is introduced.

## Four completed games: isolation does not solve the stalls

| Run | Database service       | Actual speed | Command confirmation p95 | Accepted / skipped inputs | Plans / matched food checks |
| --- | ---------------------- | -----------: | -----------------------: | ------------------------: | --------------------------: |
| 0   | Shared, 128 MB cache   |       2.351× |                 1,732 ms |                    26 / 3 |                     48 / 32 |
| 1   | Isolated, 128 MB cache |       2.541× |                   558 ms |                    27 / 2 |                     48 / 32 |
| 2   | Isolated, 128 MB cache |       1.162× |                 2,272 ms |                    23 / 6 |                     32 / 16 |
| 3   | Shared, 128 MB cache   |       2.541× |                 1,791 ms |                    24 / 5 |                     48 / 32 |

Mean progress is **2.446→1.852×, 24.3% lower** in isolation. This does not establish that isolation itself causes the slowdown: the individual runs vary substantially and complete different amounts of work. It does establish that moving to a separate instance is **not a reliable fix** in this comparison. Mean per-run command p95 is1,762→1,415ms, still unacceptable and not a pooled percentile.

Overlapping save elapsed totals average13.250→8.681seconds, while native work averages15.423→17.443seconds. Neither set is exclusive CPU; do not add them or infer an equal-work speedup. CPU per simulated game second rises4.267→5.946ms. All sources, actual workers, dependencies and assets remain pinned. Every issued command succeeds, all seventeen people and forty animals survive at the endpoint, produced-food bindings match, no stopped plan or late storage/SQL/maintenance/observation error occurs, and each exact owned game database/session/folder is absent after normal closure. The endpoint survival count closes the earlier report gap for these runs only.

No permanent service or gameplay change is selected. The private instance remains owned and idle temporarily for the separately registered cache comparison; normal smart stop and exact instance-directory cleanup remain required after that experiment. All game-created fixture databases are already gone. No shared service setting, credential or database has been modified. Evidence: `/private/tmp/ol-pf145-service-comparison-20261016-a.json`, four completed b reports/reviews/source/lifecycle/logs, plus the separate failed first setup. Additional and cumulative provider cost: $0.

The subsequent cache experiment is complete and the owned temporary service has now passed normal smart shutdown plus exact PID/port/directory/credential removal. No service cleanup remains open. [Cache results and cleanup](26-private-database-cache.md#completed-comparison).
