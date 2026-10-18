# Is slow saving database work or a delayed reply?

October 16, 2026. **Completed current diagnosis. Database work is substantial, and receiving its results adds delay. Smooth 3× remains unmet.**

The current slowest recorded walk spends 696 ms awaiting its own database requests and only 4 ms waiting for its turn. That does not tell us whether PostgreSQL takes 696 ms to do the work or whether the busy game receives a finished answer late. Measure both before choosing a larger change. Earlier recordings show both costs, but use older game versions and worlds.

| Work in the current 30-second recording  | Inside PostgreSQL | Until the application receives completion |
| ---------------------------------------- | ----------------: | ----------------------------------------: |
| World-writing connection                 |          11.432 s |                                  15.244 s |
| Independent permitted-information reader |           0.414 s |                                   1.798 s |
| Separate trivial-query reference         |           0.059 s |                                   1.458 s |

These are summed request durations. Connections overlap, and database elapsed includes its internal waits, so these are not exclusive whole-game CPU budgets. The trivial reference does almost no database work yet still receives delayed replies. At the same time, most of the writing connection’s recorded duration is actual database elapsed work. Neither “all PostgreSQL” nor “all application scheduling” explains the complete problem.

The game averages **2.958×**, with **907 ms** walking-confirmation p95, 28 accepted walks and one missed input slot. All seventeen people and forty animals survive; residents finish 48 plans and 32 matched meals. Those functional results pass, while speed and responsiveness fail.

## Selected method and qualification

Keep the exact PF16.171 source, current finite 17-person / 40-animal travel-work-food scenario, ordinary HTTP/SSE commands, 60-game-second idle animal policy and normal durable saves. No game/provider/store/library change, CPU sampler, forced collection or browser. Reuse the already qualified 40,000-request / 32 MiB appended-log observer and main-thread-only wrapper byte for byte. It changes logging only on the exact generated fixture connections, leaves shared/global settings untouched, preserves original results/errors and stores only whitelisted timing scalars / hashes / bounded static table tokens, never SQL text, parameter values or unrelated log bodies. Log rotation, unexpected text, missing phases, connection omissions and observation errors fail coverage. Once a connection encounters an actual error, later backend durations on that connection stay unassigned.

First adapt the existing eight-group empty-database protocol qualification only to the current source / observer path, synchronous allocated-database journal, explicit five-second statement timeout and one known 20 ms database wait. Keep simple and parameterized results, named preparation/reuse, multi-command statements, actual rollback, identical delivered error objects, subsequent success, retained ERROR severity and zero STATEMENT / DETAIL / CONTEXT text. Require the known wait’s mapped database time to be at least 15 ms. Qualification uses one owned connection / 60-second outer limit and exact database / session cleanup. Formatting, syntax, complete helper delta and immutable observer/source/worker/native-storage proof guards precede it. No game run is released until it passes.

Then separately release one fresh 30-second actual game under the existing 300-second outer / 4 MiB game-report / 20,000-event limits. Add a 16 MiB duration-report readback ceiling; the existing 40,000 request and 32 MiB appended-log ceilings remain unchanged. Pin the unchanged full source/dependency/worker and observer/qualification files. Require all original finite-work/travel/life/source/error/unpaused-clock/client-server/normal-owned-cleanup gates and complete mapping of all three owned connections. Preserve failed speed/input/activity goals. Exact generated database / sessions, process group and owned directory must be absent afterward.

The offline reader must verify complete source/input hashes and request-phase mapping, exclude setup/cleanup using contained intervals with explicit millisecond clock margins, rank both database and application times, report all boundary exclusions and keep Parse / Bind / Execute or simple-protocol scopes separate. Do not subtract unlike aggregate windows and call the remainder CPU. Query grouping uses actual recorded operation/table metadata, leaving mixed groups mixed. Capture overhead and record keeping make this diagnosis, not capacity acceptance.

PostgreSQL documents [duration-only logging](https://www.postgresql.org/docs/14/runtime-config-logging.html) and its separate extended-protocol phases. Its [protocol description](https://www.postgresql.org/docs/14/protocol-flow.html) explains prepared statements and query planning during binding. Those facts justify measuring phases; they do not establish a benefit from caching or changing the driver. No such optimization is selected by this plan.

## Current protocol qualification passes

All nine groups pass against PostgreSQL 14.17 and the unchanged pinned driver. The known 20 ms wait maps to **21.915 ms database elapsed / 22.550 ms submit-to-callback**. The two deliberate errors retain their original delivered objects and ERROR counts, with no statement/detail/context text; later durations remain explicitly unassigned. The exact generated database / sessions are absent, source guards pass and the process closes normally. The complete helper process takes 29.08 seconds including creation/cleanup; that is not query execution or game-speed evidence.

Protocol result `/private/tmp/ol-pf172-protocol-result-20261016-a.json`, SHA-256 `1e1d1173720ea09c142b811f2193e556333cce0dbb1e16f27f803bee4884c3d4`; duration result SHA-256 `a5f3d14cbac27ba6d5fa4b6904bd5e915546fad756e91bbe613714d328923072`. The unchanged observer is `ol-pf92-duration-preload-20261015-e.mjs`, SHA-256 `9e9923c68ca43581956dc4da8284f306d44d104f78efb70786d2b40036ac7f7b`; main-thread wrapper SHA-256 `f270fc604c02c38dbb6e96c441e6ddf6f8721e2a13bff7d5d442b0b0ef0adc58`. That qualification releases the separately pinned one-game plan; its completed results follow below.

## Current game and complete query accounting

The unchanged current game closes normally in 38.96 seconds including setup/cleanup; measured play lasts 30.088 seconds. All original source/worker/finite-stock/travel/life/unpaused-clock/error/client-server gates pass. All three owned connections close, with zero statement/detail/context text, errors, omissions or unassigned duration phases. The complete capture has **2,638 query records / 7,186 phases**, a 1.96 MB duration file and a 438,617-byte appended log window, within every original limit. Exact generated database / session counts are 0 / 0, owned process group and directory absent.

Strict one-millisecond boundary margins retain **1,958 fully contained calls**, covering all three connections. No measurement-edge call overlaps while failing containment. Four small containment/overlap checks and complete phase-sum / query identity checks pass. Setup/cleanup remains excluded. There are **735 exact query texts** in the measured calls; all hashes and their complete ranking are retained. Grouping by the actual operation and reported table tokens also retains the original hash detail. The token reader can include query aliases or the word `set`, so mixed groups are not assigned to one physical table.

### What makes writing expensive

| Stage on the world-writing connection | Summed database elapsed | Meaning                                                                       |
| ------------------------------------- | ----------------------: | ----------------------------------------------------------------------------- |
| Parse                                 |                 1.663 s | Reading the request’s SQL structure.                                          |
| Bind                                  |                 1.911 s | Preparing supplied values and choosing how to execute; not pure planning CPU. |
| Execute                               |                 7.049 s | Executing writes/reads, including database waits.                             |
| Simple-protocol requests              |                 0.809 s | Includes COMMIT; these do not have the separate three-phase breakdown.        |

Parse and Bind total **3.574 seconds**, a meaningful target rather than a promised saving. The largest single request takes **262.062 ms** inside PostgreSQL / **268.157 ms** until completion reaches the application. It sends 4,949 parameters and 175,150 bytes of string values, combining personal observations, visible people and current events/command results. Parse/Bind take **98.965 / 81.006 ms**, followed by 82.091 ms Execute. The current writer expands every row into SQL placeholders, so different row counts also produce different SQL texts. A more compact row encoding is a justified next experiment; decoding it might offset its savings. No such improvement is claimed here.

The largest combined recorded groups include new recall-source writes (**1.206 s** database elapsed), recall eligibility/reconciliation (**1.110 s**), a mixed event/perspective/count write group (**1.070 s**) and COMMIT (**0.793 s**). These groups are not exclusive CPU or complete independent feature budgets. Request-record upserts look expensive at the application (**1.528 s**), yet their actual database work is only **0.212 s**, helping explain why omitting some did not yield the expected whole-game benefit.

Across calls wholly inside command-service windows, the writer records **5.670 s database elapsed / 6.705 s submit-to-callback**. These are temporal associations, not a durable per-command await tree. The slowest 1,058 ms HTTP walk includes an 821 ms service call, with 21 contained writer calls taking 562 ms in PostgreSQL / 746 ms until application completion. Another 819 ms HTTP walk has only a 32 ms service call, demonstrating that earlier waiting still matters. Boundary-crossing calls remain excluded per command and are counted.

Game report `/private/tmp/ol-pf172-current30-0-candidate-20261016-a.json`, SHA-256 `b1e11c875699a5f2efc3401d844195380908f3b07453a1b10e911b0f8b0f13af`; readback `ol-pf172-database-readback-20261016-a.json`, SHA-256 `b3723a869c508c4589b069b95e1bc4a0ef609742bc01cb283641ff557b1a6faf`; complete grouped ranking `ol-pf172-query-families-20261016-a.json`, SHA-256 `69e60453063adafcb47561adc5d38dbd5692f003eabe3dac1b2619436f9d0ed4`. Source, release, protocol, duration and lifecycle records remain beside them. Added logging/recording affects timing, so this is diagnosis, not capacity. No source/game/shared-service setting is retained. Additional and cumulative game-provider/Jev cost: **$0**.
