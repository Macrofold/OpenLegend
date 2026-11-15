# Native command admission comparison — November 14, 2026

Across all three attempts per arm, median server use is **39.017% of one logical core** for control and **41.854%** for the command fix. Exclusive PostgreSQL is **1.827% / 1.952%** and achieved game speed is **100.004% / 99.998%** of the intended rate. **Disposition: inconclusive.** Each arm completes required gameplay in two of three runs, so these descriptive costs establish no matched-work change.

Campaign `4e6fb088-4f3c-4304-916f-d7ed4b2f9c50` compares Native control `7f21e24ca8f30d6d57df6292f731dd6e6317cb22` with command-admission candidate `d62607ffa833c9656aee4b58f84d59cd5bfe81e6`. Both contain Native source `63b17af675a2054b551327e0652cd88c206e3df804a14ae7eeca928f8463f40f`. Only the two command wrappers and their documentation change executable sources. The six independently built Linux addons have distinct recorded hashes. The declaration, loader, source archive and process identities are retained with the raw runs. The [focused caller correctness evidence](../../../maintainers/native-runtime-foundations.md#nrf09-byte-answer-caller-checkpoint--november-14-2026) is independent of this comparison.

The frozen order is control/candidate/candidate/control/control/candidate on independent PostgreSQL databases. Each run uses the common opening of one player, two human NPCs, three hares and 1,246 scenery records, a real SSE stream, scheduled walking and animal reactions, and two permitted controlled local HTTPS conversations. The automatic clock offers 60 game seconds per elapsed second, with ten seconds warmup and a 360-second steady window. Capacity is the trusted 2 GiB transient profile with separate resident and pending-save accounting. Ordinary background saves remain scheduled at one second. Diagnostics and forced GC are off. Login/reconnect, cold startup and administrative rewind do not have independent measurement windows in these six runs.

All runs use standard 16 GiB AWS worker `slot-2`, `i-0cdb36fd4c27cf973`, with Xeon Platinum 8488C, 4 vCPU, Ubuntu 24.04 AMI `ami-096d6538c463eb1db`, kernel `7.0.0-1014-aws`, pinned Node 22.23.2 and Rust 1.99.1 release builds. Plan SHA-256 is `d084711afa53be91a8d9195dd6050bd42ab0619f274cd2a9f1e9a670a9f004f1`; normal-input and toolchain archives are `ee6a1277…` and `a0fe6d02…`.

All six predeclared runs are included. The all-six input/process gate and both three-run profiles fail. Descriptive observations use every attempt. The dataset cannot support an equivalent-work CPU/game-second quotient, an improvement measured from survivors or an adoption claim. No paid external provider calls occurred. Additional and cumulative task Jev costs are **$0**.

Primary CPU is percent of one logical core. Server includes its Native and worker threads once, PostgreSQL is exclusive and client is separate.

| Run                   | Required work          | Server% |   PG% | Client% | Server+PG% | +client% | Intended speed% | End debt (game s) |
| --------------------- | ---------------------- | ------: | ----: | ------: | ---------: | -------: | --------------: | ----------------: |
| nrf-cmdwait-01-before | PASS                   |  37.496 | 1.825 |   0.920 |     39.321 |   40.240 |         100.004 |          0.000000 |
| nrf-cmdwait-02-after  | PASS                   |  42.056 | 1.993 |   1.012 |     44.049 |   45.061 |          99.998 |          2.972472 |
| nrf-cmdwait-03-after  | FAIL second chat stale |  41.854 | 1.886 |   1.020 |     43.741 |   44.760 |         100.000 |          0.000000 |
| nrf-cmdwait-04-before | FAIL first chat stale  |  43.034 | 2.071 |   0.990 |     45.105 |   46.095 |         100.008 |          0.000000 |
| nrf-cmdwait-05-before | PASS                   |  39.017 | 1.827 |   0.957 |     40.844 |   41.801 |          99.990 |          0.000000 |
| nrf-cmdwait-06-after  | PASS                   |  41.572 | 1.952 |   0.995 |     43.524 |   44.519 |          99.990 |          0.000000 |

Both failed conversations show “The character’s evidence changed before dispatch.” Candidate 03’s second conversation performs zero controlled HTTPS exchanges for that request. Control 04’s first conversation performs the route and action-attention judgments, then goes stale before generation. Each run still accepts all 560 scheduled commands, including all 539 in the primary window. The failed conversations produce no completed reply. Both arms complete the other required conversation in their failed attempt. The exact invalidation trigger is unobserved in these clean timings.

Each group below contains all three runs, including failures. Median/average/p95 are across three whole-window averages. Nearest-rank p95 is the largest of the three runs.

| Arm / primary metric               |   n |  Median | Average |     p95 |
| ---------------------------------- | --: | ------: | ------: | ------: |
| before server                      |   3 |  39.017 |  39.849 |  43.034 |
| before exclusivePostgres           |   3 |   1.827 |   1.908 |   2.071 |
| before client                      |   3 |   0.957 |   0.956 |   0.990 |
| before serverPlusExclusivePostgres |   3 |  40.844 |  41.757 |  45.105 |
| before includingClient             |   3 |  41.801 |  42.712 |  46.095 |
| before speed% intended             |   3 | 100.004 | 100.001 | 100.008 |
| after server                       |   3 |  41.854 |  41.827 |  42.056 |
| after exclusivePostgres            |   3 |   1.952 |   1.944 |   1.993 |
| after client                       |   3 |   1.012 |   1.009 |   1.020 |
| after serverPlusExclusivePostgres  |   3 |  43.741 |  43.771 |  44.049 |
| after includingClient              |   3 |  44.760 |  44.780 |  45.061 |
| after speed% intended              |   3 |  99.998 |  99.996 | 100.000 |

Per-run primary movement latency uses the 539 successfully correlated commands in each run. Columns are median / average / p95 in milliseconds. Save age measures separate in-window unsaved-age samples, with counts 3577, 3577, 3579, 3579, 3577, 3579 in run order.

| Run                   | Commands primary accepted/offered | Response          | Affected view     | Actual movement    | Durable ACK           | Save age             |
| --------------------- | --------------------------------: | ----------------- | ----------------- | ------------------ | --------------------- | -------------------- |
| nrf-cmdwait-01-before |                           539/539 | 15.19/17.45/33.47 | 43.85/46.58/73.27 | 59.33/60.55/92.97  | 541.63/543.86/1014.09 | 509.02/508.64/974.28 |
| nrf-cmdwait-02-after  |                           539/539 | 16.64/20.20/39.04 | 47.94/50.63/78.10 | 60.18/63.65/98.32  | 551.74/550.11/1020.05 | 515.04/513.18/980.84 |
| nrf-cmdwait-03-after  |                           539/539 | 16.34/19.77/38.59 | 48.75/51.60/77.27 | 57.49/63.07/100.38 | 552.01/550.15/1014.84 | 510.69/510.64/976.59 |
| nrf-cmdwait-04-before |                           539/539 | 17.27/20.67/42.45 | 50.09/52.70/79.72 | 61.60/63.81/97.29  | 553.57/545.09/1018.50 | 514.23/513.86/982.39 |
| nrf-cmdwait-05-before |                           539/539 | 15.13/18.10/32.20 | 44.06/47.33/74.28 | 60.39/61.39/96.54  | 551.43/544.45/1015.72 | 508.50/514.02/981.14 |
| nrf-cmdwait-06-after  |                           539/539 | 16.40/19.93/37.01 | 46.05/49.38/77.06 | 60.60/63.25/98.52  | 553.50/549.59/1018.94 | 514.56/515.12/979.95 |

Primary save phase durations are median / average / p95 milliseconds. Repository duration includes application work in the save repository. Each row has equal matched counts for its four phases and no unmatched, overlapping or cross-window pairs.

| Run                   | Matched saves | Capture        | Repository        | Acknowledgement | Save start to ACK |
| --------------------- | ------------: | -------------- | ----------------- | --------------- | ----------------- |
| nrf-cmdwait-01-before |           349 | 0.53/0.61/1.09 | 15.12/15.39/22.60 | 0.99/1.15/1.96  | 21.45/21.62/32.51 |
| nrf-cmdwait-02-after  |           348 | 0.69/0.80/1.53 | 16.08/16.52/25.28 | 1.24/1.41/2.15  | 23.39/24.61/35.18 |
| nrf-cmdwait-03-after  |           349 | 0.66/0.77/1.53 | 15.98/16.24/23.48 | 1.18/1.39/2.18  | 22.78/22.70/33.15 |
| nrf-cmdwait-04-before |           348 | 0.67/0.76/1.36 | 16.46/17.36/25.78 | 1.23/1.46/2.28  | 23.19/24.95/38.41 |
| nrf-cmdwait-05-before |           349 | 0.57/0.69/1.27 | 15.85/16.36/23.41 | 1.06/1.22/1.93  | 22.11/22.45/34.13 |
| nrf-cmdwait-06-after  |           348 | 0.65/0.78/1.40 | 15.48/17.04/24.33 | 1.21/1.47/2.63  | 22.86/24.27/35.31 |

| Run                   | SQL calls / rows returned / affected | Prepared rows / MiB | WAL MiB | DB growth MiB | Sampled server / client / PG / concurrent RSS MiB | Sampled / lifetime transient peak MiB | Peak resident / pending-save MiB | Final transient MiB |
| --------------------- | ------------------------------------ | ------------------- | ------: | ------------: | ------------------------------------------------- | ------------------------------------: | -------------------------------: | ------------------: |
| nrf-cmdwait-01-before | 12209/13624/1404                     | 31381/55.39         |   38.61 |         13.83 | 1086.67/104.31/247.85/1438.58                     |                         303.32/306.19 |                       19.41/1.45 |               48.49 |
| nrf-cmdwait-02-after  | 12239/13681/1410                     | 31543/56.01         |   38.71 |         14.32 | 1117.14/108.56/267.70/1489.64                     |                         282.86/315.51 |                       19.55/1.45 |               48.17 |
| nrf-cmdwait-03-after  | 11777/12924/1358                     | 31421/55.67         |   38.31 |         13.79 | 995.59/106.44/263.54/1351.69                      |                         299.39/317.24 |                       19.92/1.45 |               48.25 |
| nrf-cmdwait-04-before | 13711/16505/1547                     | 33591/61.60         |   41.42 |         14.89 | 1118.35/104.88/261.61/1480.67                     |                         262.60/270.87 |                       20.20/1.40 |               20.40 |
| nrf-cmdwait-05-before | 12098/13188/1377                     | 31454/55.27         |   38.74 |         13.98 | 1103.54/105.43/269.80/1472.98                     |                         263.75/280.39 |                       19.48/1.45 |                3.35 |
| nrf-cmdwait-06-after  | 12078/13486/1393                     | 31356/55.70         |   38.96 |         13.89 | 1098.41/105.49/264.95/1461.05                     |                         272.58/307.95 |                       19.56/1.41 |               47.63 |

| Run                   | Completed / intended / offered inferred game seconds |  Debt start / end | Whole offered commands accepted/submitted | Chats               |
| --------------------- | ---------------------------------------------------: | ----------------: | ----------------------------------------: | ------------------- |
| nrf-cmdwait-01-before |                     21600.5240/21599.7101/21600.5240 | 0.000000/0.000000 |                                   560/560 | completed/completed |
| nrf-cmdwait-02-after  |                     21599.4929/21599.8618/21602.4653 | 0.000000/2.972472 |                                   560/560 | completed/completed |
| nrf-cmdwait-03-after  |                     21600.4847/21600.4177/21600.4847 | 0.000000/0.000000 |                                   560/560 | completed/stale     |
| nrf-cmdwait-04-before |                     21601.5879/21599.7709/21598.5732 | 3.014673/0.000000 |                                   560/560 | stale/completed     |
| nrf-cmdwait-05-before |                     21597.6916/21599.8839/21597.6916 | 0.000000/0.000000 |                                   560/560 | completed/completed |
| nrf-cmdwait-06-after  |                     21597.7933/21599.9051/21597.7933 | 0.000000/0.000000 |                                   560/560 | completed/completed |

Intended time is elapsed seconds multiplied by the configured rate. Inferred offered time reconstructs elapsed debt plus completed work and is limited by sampled boundaries. It is unavailable as an independent counter. The primary window, overlapping offer-plus-save-drain window and whole waited lifetime cannot be summed. Each CPU cell is in seconds. Primary and drain report server plus exclusive PostgreSQL and separate client. Whole lifetime reports the waited application/client tree and exclusive PostgreSQL.

| Run                   | Primary wall / server+PG / client | Offer+drain wall / server+PG / client | Whole wall / app+client / PG |
| --------------------- | --------------------------------- | ------------------------------------- | ---------------------------- |
| nrf-cmdwait-01-before | 359.995/141.553/3.310             | 360.018/141.582/3.311                 | 387.125/150.930/7.819        |
| nrf-cmdwait-02-after  | 359.998/158.574/3.645             | 360.044/158.625/3.646                 | 387.549/168.400/8.536        |
| nrf-cmdwait-03-after  | 360.007/157.469/3.672             | 360.031/157.496/3.673                 | 387.151/168.110/8.113        |
| nrf-cmdwait-04-before | 359.996/162.377/3.564             | 360.019/162.406/3.565                 | 385.636/171.950/8.845        |
| nrf-cmdwait-05-before | 359.998/147.038/3.445             | 360.044/147.086/3.446                 | 385.383/157.520/7.928        |
| nrf-cmdwait-06-after  | 359.998/156.687/3.582             | 360.024/156.722/3.583                 | 387.328/166.830/8.384        |

Application, client and PostgreSQL RSS are separately sampled peaks. The concurrent column is the largest sampled simultaneous sum and can include shared pages. The table reports reservation headroom separately from memory and preserves both the sampled transient and Native lifetime high-water marks. All six runs record zero final jobs, resident and pending-save reservations and unpoisoned hosts. Their remaining transient reservations are unclassified. No normal-GC settling measurement qualifies.

The separate whole-process receipts include startup, warmup, the steady window, draining and cleanup. All six final saves complete. The two failed wrappers exit 1 without timeout or any surviving process group. Independent application exit is unavailable for those failures. Exact numeric witnesses, observed failure messages, source/addon identities and per-window counters are retained in descriptive.json.

The worker stopped and became available at generation 336. The controller settled $0.497987: $0.245037 compute, $0.225308 operations and $0.027642 retained storage. It released $0.436743 and holds no remaining reservation for this campaign.
