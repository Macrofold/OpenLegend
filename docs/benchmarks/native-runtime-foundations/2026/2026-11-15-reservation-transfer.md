# Native answer reservation transfer — November 14–15, 2026

Median server CPU was **41.64% / 42.38% of one core** (control / repaired), exclusive PostgreSQL was **2.02% / 1.96%**, and the client was **1.00% / 1.00%**. Both arms achieved about **100%** of the intended game rate. **Disposition: inconclusive.** Each arm completed two of three full journeys. All six delivered movement and final saves; the missing conversations prevent a matched-work CPU, latency or memory claim. The separately verified answer-custody behavior remains in place.

The primary window starts after warmup. CPU is percent of one logical core. Server includes Native and worker threads once. Exclusive PostgreSQL and the client are shown separately. Game speed is percent of the configured automatic rate.

Statistics show median / arithmetic mean / nearest-rank p95, computed across the stated samples. For three whole-run values, p95 is the largest run. All declared attempts remain in the cohort. Sample counts show missing metrics.

Campaign `ce33c8c1-20b5-42d8-b1a1-c4204b3ff2d1`. Frozen adjacent Native revisions `3a9b55683ac8a63b2c8ccc871daca0c827a27cd4` and `e326a0aad576e751738d64a9acf38fb992ec907e`. The machine, source, build, raw and teardown identities are preserved in `descriptive.json`.

Only the reservation transfer accompanying the existing Rust provider copy differs in executable source. Plan SHA-256 `95a82756690975ca3c506ee815af9a8ead1487b7a6dd4710a6c7abcd3f142862`; original normal/toolchain input archive identities `ee6a1277…` / `a0fe6d02…`. The order was control/candidate/candidate/control/control/candidate on the same managed standard 16 GiB AWS `m7i.xlarge` worker, generations 343–348. Each run used an independent PostgreSQL database, pinned Node 22.23.2 and Rust 1.99.1 on Ubuntu 24.04, 10 seconds of warmup and a 360-second primary window at the authored 60× rate. Normal GC, unchanged 1-second saves, and no diagnostic instrumentation in the timed runs. Additional and cumulative task Jev cost: **$0**.

The observed opening has 1 player, 2 human NPCs, 3 hares and 1246 scenery records. The normal workload uses a permitted SSE stream, scheduled walking, animal reactions, two controlled local HTTPS conversations and ordinary 1000 ms background saves. The Native transient profile is 2048.00 MiB.

Of the three attempts per arm, before passed 2/3 and after passed 2/3. Complete-work and accounting gate for all six: **False**. This offline report makes no relative-performance, candidate-adoption or broader simulation claim.

| Arm    | Primary metric              | Observed | Median/mean/p95      | Range          |
| ------ | --------------------------- | -------- | -------------------- | -------------- |
| before | server                      | 3/3      | 41.64/42.16/44.13    | 40.704–44.126  |
| before | exclusivePostgres           | 3/3      | 2.02/2.07/2.21       | 1.993–2.208    |
| before | client                      | 3/3      | 1.00/1.00/1.00       | 0.995–1.000    |
| before | serverPlusExclusivePostgres | 3/3      | 43.66/44.23/46.33    | 42.697–46.333  |
| before | includingClient             | 3/3      | 44.66/45.23/47.33    | 43.692–47.333  |
| before | game speed                  | 3/3      | 100.00/100.00/100.01 | 99.990–100.009 |
| after  | server                      | 3/3      | 42.38/42.02/42.43    | 41.268–42.427  |
| after  | exclusivePostgres           | 3/3      | 1.96/1.96/1.99       | 1.935–1.993    |
| after  | client                      | 3/3      | 1.00/1.00/1.01       | 0.994–1.014    |
| after  | serverPlusExclusivePostgres | 3/3      | 44.34/43.99/44.42    | 43.203–44.420  |
| after  | includingClient             | 3/3      | 45.35/44.99/45.42    | 44.196–45.419  |
| after  | game speed                  | 3/3      | 100.01/100.00/100.01 | 99.991–100.011 |

| Run                         | Work | Server % | PG %  | Client % | Server + PG % | All CPU % | Speed % | Completed s | Intended s | Inferred offered s | Debt s start/end | Commands accepted/offered | Chat outcomes           |
| --------------------------- | ---- | -------- | ----- | -------- | ------------- | --------- | ------- | ----------- | ---------- | ------------------ | ---------------- | ------------------------- | ----------------------- |
| nrf-inputtransfer-01-before | PASS | 41.635   | 2.022 | 1.000    | 43.657        | 44.657    | 99.999  | 21599.455   | 21599.740  | 21599.455          | 0.000/0.000      | 560/560                   | completed/completed     |
| nrf-inputtransfer-02-after  | FAIL | 42.377   | 1.961 | 1.014    | 44.338        | 45.352    | 100.011 | 21602.223   | 21599.815  | 21599.177          | 3.046/0.000      | 560/560                   | completed/not-submitted |
| nrf-inputtransfer-03-after  | PASS | 41.268   | 1.935 | 0.994    | 43.203        | 44.196    | 99.991  | 21597.879   | 21599.841  | 21597.879          | 0.000/0.000      | 560/560                   | completed/completed     |
| nrf-inputtransfer-04-before | FAIL | 44.126   | 2.208 | 1.000    | 46.333        | 47.333    | 99.990  | 21597.674   | 21599.776  | 21600.711          | 0.000/3.037      | 560/560                   | stale/completed         |
| nrf-inputtransfer-05-before | PASS | 40.704   | 1.993 | 0.995    | 42.697        | 43.692    | 100.009 | 21601.690   | 21599.823  | 21601.690          | 0.000/0.000      | 560/560                   | completed/completed     |
| nrf-inputtransfer-06-after  | PASS | 42.427   | 1.993 | 0.999    | 44.420        | 45.419    | 100.007 | 21601.196   | 21599.747  | 21598.202          | 2.994/0.000      | 560/560                   | completed/completed     |

Steady server plus exclusive PostgreSQL CPU per completed game-second was **7.276, 7.389, 7.201, 7.723, 7.116, 7.403 ms** in run order. Those raw ratios cover unequal completed work; they do not estimate the effect of the transfer.

### Failed required work and cleanup

- Candidate 02 never submits the second conversation. All 400 actual availability checks return `ai-unavailable` after the allowance check. A separate untimed check confirms an omission in the fixture's cache-token counters can retain a synthetic reservation as uncertain. It does not identify the exact charged rows in this frozen run. The first conversation, all 560 commands and the final save complete.
- Control 04 submits the first conversation, but the current-source fence refuses it before any scoped provider exchange. The exact invalidating dependency is not identified by the clean run. The second conversation, all 560 commands and the final save complete.
- The attached collector downloads all six original artifact sets. The wrapper exits nonzero for the failed gameplay in both jobs; worker teardown and the observed server stream disconnect are clean.

| Run                         | Managed outcome | Teardown clean | Worker / generation / lifecycle | Wrapper exit                                          | Application exit | Timeout | Surviving group | Final save | Stream close |
| --------------------------- | --------------- | -------------- | ------------------------------- | ----------------------------------------------------- | ---------------- | ------- | --------------- | ---------- | ------------ |
| nrf-inputtransfer-01-before | completed       | True           | slot-2/343/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputtransfer-02-after  | failed          | True           | slot-2/344/reused               | {'terminalObserved': True, 'code': 1, 'signal': None} | None             | False   | False           | True       | disconnect   |
| nrf-inputtransfer-03-after  | completed       | True           | slot-2/345/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputtransfer-04-before | failed          | True           | slot-2/346/reused               | {'terminalObserved': True, 'code': 1, 'signal': None} | None             | False   | False           | True       | disconnect   |
| nrf-inputtransfer-05-before | completed       | True           | slot-2/347/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputtransfer-06-after  | completed       | True           | slot-2/348/idle                 | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |

### Application open

Actual application open on a preinstalled PostgreSQL world through the first usable view. It excludes fixture installation, process spawn, login/reconnect, administrative recovery and steady play. It has no independent game speed or client CPU sample. Login/reconnect, process-cold recovery and administrative rewind are unmeasured in this campaign.

| Run                         | Elapsed ms | Server CPU % | PG CPU % | Server CPU s | PG CPU s | First usable view |
| --------------------------- | ---------- | ------------ | -------- | ------------ | -------- | ----------------- |
| nrf-inputtransfer-01-before | 621.838    | 82.435       | 30.725   | 0.513        | 0.191    | True              |
| nrf-inputtransfer-02-after  | 651.823    | 82.033       | 30.965   | 0.535        | 0.202    | True              |
| nrf-inputtransfer-03-after  | 683.850    | 80.513       | 27.792   | 0.551        | 0.190    | True              |
| nrf-inputtransfer-04-before | 634.006    | 104.268      | 30.411   | 0.661        | 0.193    | True              |
| nrf-inputtransfer-05-before | 636.993    | 103.210      | 30.537   | 0.657        | 0.195    | True              |
| nrf-inputtransfer-06-after  | 638.080    | 102.032      | 29.992   | 0.651        | 0.191    | True              |

| Arm    | Metric                      | Observed | Median/mean/p95      | Range           |
| ------ | --------------------------- | -------- | -------------------- | --------------- |
| before | wallMs                      | 3/3      | 634.01/630.95/636.99 | 621.838–636.993 |
| before | serverPct                   | 3/3      | 103.21/96.64/104.27  | 82.435–104.268  |
| before | postgresPct                 | 3/3      | 30.54/30.56/30.72    | 30.411–30.725   |
| before | serverCpuSeconds            | 3/3      | 0.66/0.61/0.66       | 0.513–0.661     |
| before | exclusivePostgresCpuSeconds | 3/3      | 0.19/0.19/0.19       | 0.191–0.195     |
| after  | wallMs                      | 3/3      | 651.82/657.92/683.85 | 638.080–683.850 |
| after  | serverPct                   | 3/3      | 82.03/88.19/102.03   | 80.513–102.032  |
| after  | postgresPct                 | 3/3      | 29.99/29.58/30.97    | 27.792–30.965   |
| after  | serverCpuSeconds            | 3/3      | 0.55/0.58/0.65       | 0.535–0.651     |
| after  | exclusivePostgresCpuSeconds | 3/3      | 0.19/0.19/0.20       | 0.190–0.202     |

### Steady command and save costs

Latency columns contain median / mean / p95 milliseconds. Counts and unmatched save phase records remain in the JSON. Command measurements use the original actual correlation and can complete in ordinary save drain. A missing latency witness stays missing.

| Run                         | HTTP response     | Affected view     | Movement           | Durable ACK           | Admission entry | Command accepted  | Sampled unsaved age  |
| --------------------------- | ----------------- | ----------------- | ------------------ | --------------------- | --------------- | ----------------- | -------------------- |
| nrf-inputtransfer-01-before | 16.51/20.45/38.51 | 47.24/50.70/79.07 | 61.05/63.73/96.86  | 558.74/555.09/1024.15 | 0.54/0.55/0.68  | 13.14/16.99/35.35 | 516.88/513.43/978.60 |
| nrf-inputtransfer-02-after  | 16.92/21.45/39.55 | 50.05/53.31/78.31 | 62.00/64.90/99.89  | 547.34/550.46/1029.74 | 0.53/0.53/0.66  | 13.57/17.47/36.26 | 513.32/512.94/978.71 |
| nrf-inputtransfer-03-after  | 16.58/19.39/36.33 | 46.21/49.37/76.16 | 64.63/65.84/100.10 | 554.57/546.86/1017.69 | 0.53/0.54/0.68  | 13.23/15.85/33.09 | 505.22/509.99/974.01 |
| nrf-inputtransfer-04-before | 17.28/20.33/41.69 | 49.80/52.11/79.24 | 63.15/65.93/103.16 | 559.01/551.43/1032.19 | 0.53/0.57/0.69  | 13.90/16.87/38.16 | 513.15/513.18/980.70 |
| nrf-inputtransfer-05-before | 16.04/18.94/35.22 | 45.50/48.15/74.96 | 59.89/62.62/97.20  | 554.30/537.66/1016.12 | 0.54/0.54/0.69  | 12.86/15.52/31.09 | 511.66/513.06/980.61 |
| nrf-inputtransfer-06-after  | 16.69/20.73/41.20 | 48.83/51.76/79.33 | 59.32/63.56/104.28 | 558.53/548.42/1018.24 | 0.54/0.64/0.68  | 13.34/17.23/37.02 | 515.43/515.86/982.96 |

| Run                         | Capture        | Repository        | Acknowledgement | Save start to ACK |
| --------------------------- | -------------- | ----------------- | --------------- | ----------------- |
| nrf-inputtransfer-01-before | 0.66/0.71/1.25 | 16.70/17.30/26.02 | 1.21/1.40/2.40  | 23.53/24.14/37.61 |
| nrf-inputtransfer-02-after  | 0.71/0.76/1.26 | 17.20/17.83/25.17 | 1.24/1.41/2.16  | 24.06/25.18/36.35 |
| nrf-inputtransfer-03-after  | 0.66/0.77/1.42 | 16.07/16.29/25.34 | 1.13/1.29/2.07  | 22.52/23.16/36.00 |
| nrf-inputtransfer-04-before | 0.71/0.84/1.55 | 17.09/17.80/25.55 | 1.30/1.49/2.72  | 24.19/25.18/36.93 |
| nrf-inputtransfer-05-before | 0.65/0.76/1.40 | 16.37/17.19/25.40 | 1.20/1.43/2.57  | 22.94/24.23/35.99 |
| nrf-inputtransfer-06-after  | 0.67/0.79/1.50 | 16.91/17.23/25.49 | 1.23/1.45/2.90  | 23.93/24.47/39.11 |

| Run                         | SQL calls / rows returned / affected | Prepared rows / MiB | WAL MiB | DB growth MiB | Server / client / PG / concurrent sampled MiB | Sampled transient MiB | Lifetime transient MiB | Lifetime resident MiB | Lifetime pending-save MiB | Final transient MiB |
| --------------------------- | ------------------------------------ | ------------------- | ------- | ------------- | --------------------------------------------- | --------------------- | ---------------------- | --------------------- | ------------------------- | ------------------- |
| nrf-inputtransfer-01-before | 12038/13190/1398                     | 31132 / 54.92       | 39.38   | 13.89         | 1138.43/106.54/256.09/1499.42                 | 247.16                | 274.74                 | 19.42                 | 1.45                      | 2.67                |
| nrf-inputtransfer-02-after  | 11948/12374/1334                     | 33539 / 60.84       | 39.92   | 14.37         | 1109.12/110.96/257.21/1474.04                 | 326.60                | 333.54                 | 20.03                 | 1.40                      | 49.32               |
| nrf-inputtransfer-03-after  | 12046/13078/1409                     | 31278 / 55.18       | 38.44   | 13.81         | 1078.97/103.21/268.26/1446.00                 | 292.36                | 310.08                 | 19.46                 | 1.45                      | 48.60               |
| nrf-inputtransfer-04-before | 13853/16721/1544                     | 33567 / 61.60       | 42.63   | 14.38         | 1047.15/105.88/259.84/1407.73                 | 240.40                | 270.61                 | 19.69                 | 1.45                      | 2.90                |
| nrf-inputtransfer-05-before | 12123/13499/1392                     | 31338 / 55.76       | 39.50   | 13.78         | 1098.45/103.61/269.38/1466.62                 | 299.16                | 316.17                 | 19.49                 | 1.44                      | 48.71               |
| nrf-inputtransfer-06-after  | 12212/13656/1411                     | 31386 / 55.65       | 39.89   | 14.24         | 1131.93/103.82/263.50/1498.23                 | 287.35                | 301.92                 | 19.47                 | 1.40                      | 2.64                |

### Overlapping lifecycle totals

Wall and CPU values are seconds. The waited application/client tree includes startup, warmup, steady play, drain and cleanup. Its CPU overlaps the primary and drain windows.

| Run                         | Steady wall / server+PG / client | Offer+drain wall / server+PG / client | Whole wall / waited tree / PG |
| --------------------------- | -------------------------------- | ------------------------------------- | ----------------------------- |
| nrf-inputtransfer-01-before | 359.996/157.163/3.600            | 360.020/157.195/3.601                 | 388.038/166.950/8.602         |
| nrf-inputtransfer-02-after  | 359.997/159.614/3.651            | 360.023/159.645/3.652                 | 385.545/169.980/8.422         |
| nrf-inputtransfer-03-after  | 359.997/155.529/3.577            | 360.027/155.562/3.578                 | 387.101/165.760/8.291         |
| nrf-inputtransfer-04-before | 359.996/166.798/3.600            | 360.035/166.842/3.601                 | 386.423/176.000/9.275         |
| nrf-inputtransfer-05-before | 359.997/153.709/3.581            | 360.019/153.738/3.582                 | 385.513/163.460/8.474         |
| nrf-inputtransfer-06-after  | 359.996/159.911/3.595            | 360.020/159.941/3.596                 | 385.501/169.790/8.480         |

### Limits

- Both original raw arms stay Native. Before and after refer only to the declared custody revisions. No code, app, database, build, cloud or model was run by this extraction.
- All six attempts stay present. A failed overall game, conversation, save, stream or shutdown stays visible. The displayed raw CPU per game-second ratios do not estimate an equivalent-work change. There is no survivor comparison.
- Offered game time is inferred from the change in elapsed debt plus completed time. There is no independent offered-time counter at these sampled boundaries.
- Startup, steady, overlapping offer-plus-save-drain and waited lifetime are separate. CPU percentages are whole-window ratios. They are not instantaneous samples.
- Command witnesses use actual application responses, movement and server stream receipt. They do not measure rendering. Save-age samples are separate from saves and save-phase percentiles are not additive.
- Concurrent sampled memory is a nonunique sum. Reservation peaks and unclassified final reservation bytes do not measure physical RAM or normal-GC settling. Holder-specific CPU, causality of stale dispatch and residual allocation classes are absent from these clean timings.
- Job teardown and worker reuse/release are recorded separately from the final independent worker/charge reconciliation. Independent resource records, when supplied, are bound without converting their recorded costs into the campaign figure.

The controller stopped and released slot 2 after generation 348. The campaign settled at **$0.492541**, including $0.249273 compute, $0.225315 operations and $0.017953 retained storage. It released $0.432507 of the original hold; no reservation remains. Settled continuing task exposure is **$17.375853** of $50, including the previously recorded costs outside the controller. The private evidence archive `nrf09b-transfer-steady-20261115/manifest.json` seals 345 payloads (519,494,391 bytes), SHA-256 `3cb4f9020490911e90f73dc72b9ed4b8fac74d4ef70b7a7e5130dccba20334b9`. See the [actual caller checkpoint](../../../maintainers/native-runtime-foundations.md#nrf09-byte-answer-caller-checkpoint--november-14-2026) for the correctness evidence and the separate recovery comparison.
