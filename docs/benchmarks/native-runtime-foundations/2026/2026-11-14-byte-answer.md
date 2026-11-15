# NRF09a byte-answer comparison — November 14, 2026

Across all three attempts per arm, median server use is **39.410% of one logical core** for control and **38.805%** for candidate; exclusive PostgreSQL is **1.952% / 1.996%**, and achieved game speed is **100.001% / 99.998%** of the intended rate. These failed-inclusive window observations establish no relative gain: required gameplay completes in only 2/3 control and 1/3 candidate runs. Average and p95 follow below.

Campaign `73e62138-d30b-4047-bcca-9da527d0e24e` compares Native control `51e7a2450135075696e82b8bd5097da4b50b8482` (Native `8bb0fe7e…`) with byte-answer candidate `7f21e24ca8f30d6d57df6292f731dd6e6317cb22` (Native `63b17af6…`). **Disposition: inconclusive.** Structural and selected real-caller correctness remain valid; these runs do not qualify complete-work performance or overall Native adoption. [Current work and caller evidence](../../../maintainers/native-runtime-foundations.md#current-selection-and-remaining-work) owns unresolved requirements.

The frozen order is control/candidate/candidate/control/control/candidate, three attempts per arm on independent PostgreSQL databases. Each uses one player, two human NPCs, three hares and 1,246 scenery records, a real stream, scheduled movement and animal reactions, two controlled local-HTTPS conversations, a 60-game-second/real-second automatic clock, ten-second warmup and 360-second primary window. The trusted transient allowance is 2 GiB; resident and pending-save accounting remain separate. Ordinary saves retain their one-second schedule. Diagnostics are off and no forced GC is used. Cold opening, administrative rewind and reconnect are outside this comparison.

All six use standard `m7i.xlarge` worker `slot-2`, instance `i-0cdb36fd4c27cf973`, generations 323–328: 4 vCPU, 16 GiB, Xeon Platinum 8488C, Ubuntu 24.04 image `ami-096d6538c463eb1db`, kernel `7.0.0-1014-aws`. Node is pinned to 22.23.2. This session is separate from earlier image/kernel comparisons. Plan SHA-256 is `0885f35152aff048ea34cc4a755482420e5fb21755c485a18594109b16277314`; original normal-input archive `ee6a1277…`, toolchain archive `a0fe6d02…`. Full source, declaration, addon, module-link and per-run process identities remain in the sealed evidence.

All six predeclared runs are included. Before has 2/3 complete; after has 1/3 complete. The full input/process comparison gate is false. These are resource descriptions of the work actually attempted, not evidence of relative speed, memory savings or matched-work efficiency. No survivor subset or CPU/game-second quotient is used.

Primary CPU is percent of one logical core; server includes its Native and worker threads once. PostgreSQL is exclusive and separate. The client-inclusive sum is supporting accounting.

| Run              | Required work         | Server% |   PG% | Client% | Server+PG% | +client% | Intended speed% | End debt |
| ---------------- | --------------------- | ------: | ----: | ------: | ---------: | -------: | --------------: | -------: |
| nrf09a-01-before | PASS                  |  39.410 | 1.952 |   0.896 |     41.362 |   42.258 |         100.001 | 0.000000 |
| nrf09a-02-after  | FAIL walk busy        |  38.805 | 1.996 |   0.894 |     40.802 |   41.696 |          99.998 | 0.000000 |
| nrf09a-03-after  | PASS                  |  38.662 | 1.939 |   0.886 |     40.601 |   41.487 |         100.002 | 0.000000 |
| nrf09a-04-before | FAIL first chat stale |  39.790 | 2.099 |   0.906 |     41.890 |   42.796 |          99.995 | 3.010388 |
| nrf09a-05-before | PASS                  |  38.609 | 1.931 |   0.884 |     40.539 |   41.423 |         100.002 | 0.000000 |
| nrf09a-06-after  | FAIL first chat stale |  40.068 | 2.179 |   0.898 |     42.248 |   43.145 |          99.994 | 3.046023 |

Each group below contains all three runs, including failures. Median/average/p95 are across three whole-window averages; nearest-rank p95 is the largest run.

| Arm / primary metric               |   n |  Median | Average |     p95 |
| ---------------------------------- | --: | ------: | ------: | ------: |
| before server                      |   3 |  39.410 |  39.270 |  39.790 |
| before exclusivePostgres           |   3 |   1.952 |   1.994 |   2.099 |
| before client                      |   3 |   0.896 |   0.895 |   0.906 |
| before serverPlusExclusivePostgres |   3 |  41.362 |  41.264 |  41.890 |
| before includingClient             |   3 |  42.258 |  42.159 |  42.796 |
| before speed% intended             |   3 | 100.001 |  99.999 | 100.002 |
| after server                       |   3 |  38.805 |  39.179 |  40.068 |
| after exclusivePostgres            |   3 |   1.996 |   2.038 |   2.179 |
| after client                       |   3 |   0.894 |   0.892 |   0.898 |
| after serverPlusExclusivePostgres  |   3 |  40.802 |  41.217 |  42.248 |
| after includingClient              |   3 |  41.696 |  42.109 |  43.145 |
| after speed% intended              |   3 |  99.998 |  99.998 | 100.002 |

Per-run primary movement latency uses successful command witnesses only. The failed walk remains separately refused; both stale first chats remain incomplete. Columns are median / average / p95 milliseconds. Save age uses separate in-window interval observations (not commands or independent saves): 3579, 3578, 3579, 3577, 3579, 3578 samples in run order. Per-metric witness counts and missingness remain in the archived descriptive JSON.

| Run              | Commands primary accepted/offered | Response          | Affected view     | Actual movement   | Durable ACK           | Save age             |
| ---------------- | --------------------------------: | ----------------- | ----------------- | ----------------- | --------------------- | -------------------- |
| nrf09a-01-before |                           539/539 | 15.61/18.44/39.96 | 47.03/48.88/77.99 | 59.37/62.29/97.27 | 563.22/561.17/1016.38 | 511.78/514.48/982.61 |
| nrf09a-02-after  |                           538/539 | 15.69/18.70/34.65 | 45.02/47.75/75.32 | 61.22/62.23/95.85 | 550.21/548.60/1019.88 | 511.61/513.70/979.51 |
| nrf09a-03-after  |                           539/539 | 15.33/18.30/36.07 | 46.94/49.45/75.00 | 58.92/61.86/96.28 | 551.40/550.22/1022.65 | 512.91/514.84/980.96 |
| nrf09a-04-before |                           539/539 | 15.95/18.90/36.53 | 49.34/50.88/77.62 | 59.86/62.06/95.52 | 550.82/548.27/1019.69 | 509.60/513.51/982.15 |
| nrf09a-05-before |                           539/539 | 15.90/18.36/33.70 | 44.97/47.51/73.86 | 61.97/61.89/94.45 | 555.40/551.59/1023.96 | 510.41/512.04/976.73 |
| nrf09a-06-after  |                           539/539 | 16.09/20.11/41.98 | 47.12/51.20/79.13 | 61.89/63.50/93.83 | 553.03/551.45/1020.14 | 516.55/515.03/980.46 |

| Run              | SQL calls / rows returned / affected | Prepared rows / MiB | WAL MiB | DB growth MiB | Sampled server / client / PG / concurrent RSS MiB | Native transient peak MiB | Final pending MiB |
| ---------------- | ------------------------------------ | ------------------- | ------: | ------------: | ------------------------------------------------- | ------------------------: | ----------------: |
| nrf09a-01-before | 12073/13562/1419                     | 31434/55.90         |   39.81 |         14.03 | 1059.76/107.50/250.69/1417.10                     |                    326.75 |             53.43 |
| nrf09a-02-after  | 12389/14185/1422                     | 31505/56.01         |   39.82 |         14.30 | 1107.62/110.28/259.36/1472.34                     |                    253.23 |              1.87 |
| nrf09a-03-after  | 12003/13490/1391                     | 31600/56.33         |   39.84 |         14.27 | 1148.81/103.02/262.26/1508.75                     |                    285.73 |              2.48 |
| nrf09a-04-before | 12522/14009/1449                     | 34439/63.66         |   42.43 |         14.51 | 1131.64/103.99/270.61/1501.63                     |                    350.39 |             53.94 |
| nrf09a-05-before | 12092/13413/1400                     | 31429/56.04         |   39.79 |         14.23 | 1082.39/102.60/269.04/1449.73                     |                    311.66 |             53.48 |
| nrf09a-06-after  | 13496/15979/1526                     | 33304/60.78         |   42.40 |         14.41 | 1075.35/104.36/257.64/1432.56                     |                    320.60 |             48.27 |

| Run              | Completed / intended game seconds |  Debt start / end | Whole offered commands accepted/submitted | Chats               |
| ---------------- | --------------------------------: | ----------------: | ----------------------------------------: | ------------------- |
| nrf09a-01-before |             21599.9803/21599.7893 | 3.015543/0.000000 |                                   560/560 | completed/completed |
| nrf09a-02-after  |             21599.2219/21599.6571 | 0.000000/0.000000 |                                   559/560 | completed/completed |
| nrf09a-03-after  |             21600.2311/21599.8886 | 0.000000/0.000000 |                                   560/560 | completed/completed |
| nrf09a-04-before |             21598.7672/21599.9129 | 0.000000/3.010388 |                                   560/560 | stale/completed     |
| nrf09a-05-before |             21600.1913/21599.8551 | 0.000000/0.000000 |                                   560/560 | completed/completed |
| nrf09a-06-after  |             21598.4191/21599.8008 | 0.000000/3.046023 |                                   560/560 | stale/completed     |

Overlapping windows and whole waited lifetime below are separate, never additive. Each CPU cell is seconds. Primary/drain show server+PG and separate client; whole waited app/client is the entire waited tree plus separately measured exclusivePG.

| Run              | Primary wall / server+PG / client | Offer+drain wall / server+PG / client | Whole wall / app+client / PG |
| ---------------- | --------------------------------- | ------------------------------------- | ---------------------------- |
| nrf09a-01-before | 359.996/148.902/3.227             | 360.021/148.934/3.228                 | 388.033/158.590/8.334        |
| nrf09a-02-after  | 359.994/146.883/3.218             | 360.026/146.921/3.219                 | 385.413/156.180/8.486        |
| nrf09a-03-after  | 359.998/146.163/3.189             | 360.028/146.199/3.190                 | 385.987/155.870/8.290        |
| nrf09a-04-before | 359.999/150.802/3.262             | 360.041/150.848/3.263                 | 386.416/160.280/8.899        |
| nrf09a-05-before | 359.998/145.941/3.182             | 360.022/145.970/3.183                 | 385.678/155.940/8.282        |
| nrf09a-06-after  | 359.997/152.091/3.231             | 360.036/152.142/3.232                 | 385.940/161.020/9.139        |

Native transient peak above is the lifetime reservation high-water mark, not physical RAM. RSS entries are independently sampled peaks; the concurrent column is the maximum actual concurrent sum and is nonunique. Final pending bytes are unclassified ShutdownPending residue. All six final jobs/resident/save counters are 0 and unpoisoned; that does not establish complete cleanup.

Save capture/repository/ACK/start-to-ACK distributions, overlapping drain and whole waited process CPU, offered/completed/debt, exact missingness, selected source/build identities and failure messages are retained in descriptive.json. Whole waited application/client CPU includes startup, warmup, both windows and cleanup; never add it to a window. All three failed waited commands/wrappers exited 1 without timeout or lingering group; their independent application-exit field is unavailable. Actual final saves completed. Wrapper exit, shutdown and required gameplay completion are distinct.

No application, database, compiler, cloud or provider was run by this extraction.

The candidate's failed walk returns HTTP 503 after about 21 ms; the exact ordinary admission owner remains to be attributed. Source review identifies the five-minute checkpoint's preceding flush as a concrete candidate, not a uniquely proved cause. Control 04 and candidate 06 stop the first human request at the existing `privateReadFence` before provider dispatch. An untimed observation must establish which dependency changed; nearby save acknowledgements alone do not establish causation. No source/privacy check, reply, option or observation is suppressed to qualify this comparison.

All six final saves succeed. Managed owned cleanup is clean; the last worker is confirmed stopped and released with zero outstanding campaign holds. Final settlement is **$0.511381** estimated use: $0.249595 compute, $0.225306 operations and $0.036480 retained storage; **$0.432185** of the original $0.943566 hold is released. At `2026-11-15T00:37:40Z`, continuing controller charges are $14.460665, plus the separate $0.620972 outside estimate and $0.10/$0.295737 deployment/quarantine-storage guards. This is task accounting, not an AWS invoice. Additional and cumulative external Jev/provider cost is **$0**.

All raw results, failures, process/build identities, frozen inputs, original and supplemental analyses, source reviews and final resource/settlement receipts are retained outside Git under `/Users/mzw/.codex/verification/OpenLegend/native-runtime-foundations/nrf09-answer-bytes-20261114-component-local/cloud-comparison-finished/manifest.json`, SHA-256 `4f14fcb0f2905c876f7601090b655ec32610d460d8385ae50d7efe6f9fc29c14` (164 payloads, 106,550,276 bytes). The failed-inclusive extraction manifest is `2f7ab07f7c89465de8d05502c5c3b3eb647c9ac8a6b48dc5f746d5c26ef51023`; original report and pre-frozen supplement remain unchanged. The next instrumented diagnostic is a distinct campaign on the same frozen candidate, not a replacement timing run.
