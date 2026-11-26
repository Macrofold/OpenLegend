# Native receipt-tail ownership in ordinary play — November 15, 2026

Median server CPU was **35.25% / 34.19% of one core** (control / repaired), and exclusive PostgreSQL was **1.72% / 1.70%**. Both arms achieved about **100% of the intended game speed**. The median server-plus-PostgreSQL reduction is 2.9%, but the three-run ranges overlap and the repaired arm has the highest combined CPU observation. **The ordinary cost effect is inconclusive.** Keep the ownership repair for its verified behavior. The [paused indexed caller comparison](2026-11-15-receipt-tail-custody.md) is a separate window and likewise inconclusive.

The primary window starts after warmup. CPU is percent of one logical core. Server includes Native and worker threads once. Exclusive PostgreSQL and the client are shown separately. Game speed is percent of the configured automatic rate.

Statistics show median / arithmetic mean / nearest-rank p95, computed across the stated samples. For three whole-run values, p95 is the largest run. All declared attempts remain in the cohort. Sample counts show missing metrics.

Campaign `76b61239-75fd-490d-8ce1-b2f84e463349`. Frozen adjacent Native revisions `e326a0aad576e751738d64a9acf38fb992ec907e` and `6665d66d77b6076d06493b1ba990e45ca0034c49`. The machine, source, build, raw and teardown identities are in the sealed private evidence. The exact plan SHA-256 is `43a2ae3f46815288d59b532d4c76a7f833279f8d1f37064150299ee9d3768323`. Both arms use Native source `e3039aa2…`, SDK `faf0f550…`, loader `f51e0961…`, Node 22.23.2, toolchain archive `a0fe6d02…` and the same corrected workload archive `91ea0e69…`. The workflow runs interleaved on one managed standard 16 GiB AWS `m7i.xlarge`, generations 361–366, with an independent PostgreSQL database per run. Only the three receipt-tail TypeScript files differ. Additional and cumulative Jev cost is **$0**. The verification controller accounted for **$0.479895**, returned **$0.442181** of the hold and confirmed zero remaining reservation. The standard worker is stopped and available at generation 366. Continuing task exposure after settlement is **$18.562382** of the authorized $50.

The observed opening has 1 player, 2 human NPCs, 3 hares and 1246 scenery records. The normal workload uses a permitted SSE stream, scheduled walking, animal reactions, two controlled local HTTPS conversations and ordinary 1000 ms background saves. The Native transient profile is 2 GiB. The measured offer lasts 360 wall seconds at 60 game seconds per wall second after a 10-second warmup. The controlled response fixture provides two explicit zero cache usage fields in both arms; this changes no older campaign.

All six runs pass complete-work and accounting checks. All 560 offered commands and both selected conversations finish in each run. Native transient lifetime peaks and actual sampled memory overlap. The repaired arm’s median sampled concurrent total is about 1,500 MiB versus 1,477 MiB. This cohort does not isolate a RAM improvement, explain the prior TypeScript/Native gap, or qualify broader adoption.

| Arm    | Primary metric                               | Observed | Median/mean/p95      | Range          |
| ------ | -------------------------------------------- | -------- | -------------------- | -------------- |
| before | server                                       | 3/3      | 35.25/35.10/35.67    | 34.390–35.666  |
| before | exclusivePostgres                            | 3/3      | 1.72/1.74/1.78       | 1.716–1.785    |
| before | client                                       | 3/3      | 0.80/0.80/0.82       | 0.780–0.824    |
| before | serverPlusExclusivePostgres                  | 3/3      | 36.97/36.84/37.45    | 36.105–37.451  |
| before | includingClient                              | 3/3      | 37.80/37.64/38.25    | 36.885–38.248  |
| before | game speed                                   | 3/3      | 100.00/100.00/100.00 | 99.997–100.003 |
| before | server + PG CPU ms per completed game-second | 3/3      | 6.16/6.14/6.24       | 6.017–6.242    |
| after  | server                                       | 3/3      | 34.19/34.63/35.91    | 33.791–35.905  |
| after  | exclusivePostgres                            | 3/3      | 1.70/1.70/1.71       | 1.697–1.706    |
| after  | client                                       | 3/3      | 0.78/0.78/0.83       | 0.735–0.829    |
| after  | serverPlusExclusivePostgres                  | 3/3      | 35.89/36.33/37.60    | 35.496–37.602  |
| after  | includingClient                              | 3/3      | 36.67/37.11/38.43    | 36.231–38.431  |
| after  | game speed                                   | 3/3      | 100.00/100.00/100.00 | 99.990–100.004 |
| after  | server + PG CPU ms per completed game-second | 3/3      | 5.98/6.05/6.27       | 5.916–6.267    |

| Run                        | Work | Server % | PG %  | Client % | Server + PG % | All CPU % | Speed % | Completed s | Intended s | Inferred offered s | Debt s start/end | Commands accepted/offered | Chat outcomes       |
| -------------------------- | ---- | -------- | ----- | -------- | ------------- | --------- | ------- | ----------- | ---------- | ------------------ | ---------------- | ------------------------- | ------------------- |
| nrf10-tailsteady-01-before | PASS | 34.390   | 1.716 | 0.780    | 36.105        | 36.885    | 100.003 | 21600.490   | 21599.842  | 21600.490          | 0.000/0.000      | 560/560                   | completed/completed |
| nrf10-tailsteady-02-after  | PASS | 35.905   | 1.697 | 0.829    | 37.602        | 38.431    | 100.004 | 21600.794   | 21599.861  | 21597.725          | 3.069/0.000      | 560/560                   | completed/completed |
| nrf10-tailsteady-03-after  | PASS | 34.187   | 1.698 | 0.784    | 35.885        | 36.669    | 99.990  | 21597.588   | 21599.769  | 21600.654          | 0.000/3.066      | 560/560                   | completed/completed |
| nrf10-tailsteady-04-before | PASS | 35.666   | 1.785 | 0.797    | 37.451        | 38.248    | 99.997  | 21599.011   | 21599.764  | 21599.011          | 0.000/0.000      | 560/560                   | completed/completed |
| nrf10-tailsteady-05-before | PASS | 35.252   | 1.722 | 0.824    | 36.974        | 37.798    | 99.998  | 21599.353   | 21599.685  | 21599.353          | 0.000/0.000      | 560/560                   | completed/completed |
| nrf10-tailsteady-06-after  | PASS | 33.791   | 1.706 | 0.735    | 35.496        | 36.231    | 100.003 | 21600.382   | 21599.833  | 21600.382          | 0.000/0.000      | 560/560                   | completed/completed |

### Completion and cleanup

| Run                        | Managed outcome | Teardown clean | Worker / generation / lifecycle | Wrapper exit                                          | Application exit | Timeout | Surviving group | Final save | Stream close |
| -------------------------- | --------------- | -------------- | ------------------------------- | ----------------------------------------------------- | ---------------- | ------- | --------------- | ---------- | ------------ |
| nrf10-tailsteady-01-before | completed       | True           | slot-2/361/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf10-tailsteady-02-after  | completed       | True           | slot-2/362/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf10-tailsteady-03-after  | completed       | True           | slot-2/363/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf10-tailsteady-04-before | completed       | True           | slot-2/364/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf10-tailsteady-05-before | completed       | True           | slot-2/365/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf10-tailsteady-06-after  | completed       | True           | slot-2/366/idle                 | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |

### Application open

Actual application open on a preinstalled PostgreSQL world through the first usable view. It excludes fixture installation, process spawn, login/reconnect, administrative recovery and steady play. It has no independent game speed or client CPU sample.

| Run                        | Elapsed ms | Server CPU % | PG CPU % | Server CPU s | PG CPU s | First usable view |
| -------------------------- | ---------- | ------------ | -------- | ------------ | -------- | ----------------- |
| nrf10-tailsteady-01-before | 749.719    | 62.041       | 23.406   | 0.465        | 0.175    | True              |
| nrf10-tailsteady-02-after  | 637.303    | 92.743       | 26.732   | 0.591        | 0.170    | True              |
| nrf10-tailsteady-03-after  | 558.577    | 81.403       | 31.359   | 0.455        | 0.175    | True              |
| nrf10-tailsteady-04-before | 609.104    | 81.607       | 29.187   | 0.497        | 0.178    | True              |
| nrf10-tailsteady-05-before | 618.618    | 93.888       | 27.701   | 0.581        | 0.171    | True              |
| nrf10-tailsteady-06-after  | 614.704    | 97.037       | 28.783   | 0.596        | 0.177    | True              |

| Arm    | Metric                      | Observed | Median/mean/p95      | Range           |
| ------ | --------------------------- | -------- | -------------------- | --------------- |
| before | wallMs                      | 3/3      | 618.62/659.15/749.72 | 609.104–749.719 |
| before | serverPct                   | 3/3      | 81.61/79.18/93.89    | 62.041–93.888   |
| before | postgresPct                 | 3/3      | 27.70/26.76/29.19    | 23.406–29.187   |
| before | serverCpuSeconds            | 3/3      | 0.50/0.51/0.58       | 0.465–0.581     |
| before | exclusivePostgresCpuSeconds | 3/3      | 0.18/0.17/0.18       | 0.171–0.178     |
| after  | wallMs                      | 3/3      | 614.70/603.53/637.30 | 558.577–637.303 |
| after  | serverPct                   | 3/3      | 92.74/90.39/97.04    | 81.403–97.037   |
| after  | postgresPct                 | 3/3      | 28.78/28.96/31.36    | 26.732–31.359   |
| after  | serverCpuSeconds            | 3/3      | 0.59/0.55/0.60       | 0.455–0.596     |
| after  | exclusivePostgresCpuSeconds | 3/3      | 0.18/0.17/0.18       | 0.170–0.177     |

### Steady command and save costs

Latency columns contain median / mean / p95 milliseconds. Counts and unmatched save phase records remain in the JSON. Command measurements use the original actual correlation and can complete in ordinary save drain. A missing latency witness stays missing.

| Run                        | HTTP response     | Affected view     | Movement          | Durable ACK           | Admission entry | Command accepted  | Sampled unsaved age  |
| -------------------------- | ----------------- | ----------------- | ----------------- | --------------------- | --------------- | ----------------- | -------------------- |
| nrf10-tailsteady-01-before | 13.82/16.51/32.17 | 40.03/43.83/71.21 | 59.01/59.77/93.38 | 544.89/541.72/1012.96 | 0.45/0.46/0.55  | 11.04/13.42/28.85 | 505.89/508.46/971.90 |
| nrf10-tailsteady-02-after  | 14.81/17.83/33.20 | 42.36/46.02/71.66 | 59.33/59.91/92.79 | 544.72/545.94/1014.63 | 0.48/0.49/0.60  | 11.83/14.54/29.16 | 512.07/509.52/971.09 |
| nrf10-tailsteady-03-after  | 14.07/16.45/32.20 | 40.74/43.88/71.58 | 61.17/60.68/94.80 | 544.25/537.98/1003.16 | 0.47/0.47/0.58  | 11.12/13.45/28.93 | 505.38/510.32/976.81 |
| nrf10-tailsteady-04-before | 14.66/17.30/29.79 | 42.56/46.31/72.52 | 60.19/60.90/97.41 | 546.39/543.39/1016.81 | 0.47/0.59/0.60  | 11.58/13.85/26.50 | 508.74/510.02/974.96 |
| nrf10-tailsteady-05-before | 13.96/16.86/32.74 | 41.69/45.41/72.13 | 59.12/59.87/93.23 | 550.35/549.51/1015.81 | 0.48/0.49/0.60  | 11.15/13.61/29.25 | 504.20/508.49/972.35 |
| nrf10-tailsteady-06-after  | 13.94/16.64/31.68 | 40.65/43.84/71.25 | 61.02/60.89/94.30 | 546.82/544.27/1015.10 | 0.45/0.46/0.58  | 11.01/13.55/28.40 | 507.63/510.03/973.95 |

| Run                        | Capture        | Repository        | Acknowledgement | Save start to ACK |
| -------------------------- | -------------- | ----------------- | --------------- | ----------------- |
| nrf10-tailsteady-01-before | 0.48/0.56/0.89 | 14.90/15.09/21.76 | 0.85/1.06/1.75  | 19.77/20.53/31.25 |
| nrf10-tailsteady-02-after  | 0.54/0.59/1.05 | 15.33/15.43/22.80 | 1.01/1.28/1.85  | 20.68/21.41/32.00 |
| nrf10-tailsteady-03-after  | 0.49/0.59/1.14 | 15.15/15.43/22.09 | 0.86/1.17/1.86  | 20.43/20.87/31.79 |
| nrf10-tailsteady-04-before | 0.49/0.56/0.89 | 14.78/15.40/22.78 | 0.93/1.09/1.77  | 19.68/21.02/31.60 |
| nrf10-tailsteady-05-before | 0.52/0.57/0.96 | 14.90/15.08/21.87 | 0.97/1.17/1.75  | 20.37/20.40/31.25 |
| nrf10-tailsteady-06-after  | 0.48/0.56/0.94 | 14.44/14.86/21.65 | 1.00/1.11/1.78  | 19.66/20.57/30.78 |

| Run                        | SQL calls / rows returned / affected | Prepared rows / MiB | WAL MiB | DB growth MiB | Server / client / PG / concurrent sampled MiB | Sampled transient MiB | Lifetime transient MiB | Lifetime resident MiB | Lifetime pending-save MiB | Final transient MiB |
| -------------------------- | ------------------------------------ | ------------------- | ------- | ------------- | --------------------------------------------- | --------------------- | ---------------------- | --------------------- | ------------------------- | ------------------- |
| nrf10-tailsteady-01-before | 11917/13249/1398                     | 31338 / 55.51       | 38.87   | 14.05         | 1136.08/107.89/249.14/1480.23                 | 311.02                | 323.83                 | 19.37                 | 1.45                      | 2.39                |
| nrf10-tailsteady-02-after  | 11860/12861/1396                     | 31269 / 55.22       | 38.86   | 14.26         | 1138.56/104.23/262.23/1499.70                 | 260.40                | 279.26                 | 19.42                 | 1.40                      | 2.88                |
| nrf10-tailsteady-03-after  | 12035/13195/1417                     | 31189 / 55.19       | 38.90   | 14.20         | 1079.16/108.35/261.42/1445.07                 | 273.29                | 302.75                 | 19.36                 | 1.45                      | 48.09               |
| nrf10-tailsteady-04-before | 12100/13392/1388                     | 31345 / 55.54       | 38.69   | 14.16         | 1096.36/104.26/278.41/1476.31                 | 235.51                | 253.36                 | 19.53                 | 1.45                      | 3.30                |
| nrf10-tailsteady-05-before | 11835/12930/1383                     | 31337 / 55.53       | 38.61   | 13.91         | 1102.83/102.48/277.27/1476.63                 | 297.41                | 308.57                 | 19.44                 | 1.44                      | 48.52               |
| nrf10-tailsteady-06-after  | 12037/13321/1412                     | 31350 / 55.53       | 38.55   | 13.91         | 1116.87/107.45/284.82/1504.57                 | 284.95                | 302.38                 | 19.99                 | 1.45                      | 48.58               |

### Overlapping lifecycle totals

Wall and CPU values are seconds. The waited application/client tree includes startup, warmup, steady play, drain and cleanup. Its CPU overlaps the primary and drain windows.

| Run                        | Steady wall / server+PG / client | Offer+drain wall / server+PG / client | Whole wall / waited tree / PG |
| -------------------------- | -------------------------------- | ------------------------------------- | ----------------------------- |
| nrf10-tailsteady-01-before | 359.997/129.979/2.806            | 360.024/130.010/2.808                 | 385.216/138.710/7.394         |
| nrf10-tailsteady-02-after  | 359.998/135.368/2.984            | 360.022/135.399/2.985                 | 385.113/144.720/7.315         |
| nrf10-tailsteady-03-after  | 359.996/129.185/2.822            | 360.029/129.222/2.823                 | 386.573/138.050/7.268         |
| nrf10-tailsteady-04-before | 359.996/134.820/2.871            | 360.018/134.847/2.872                 | 384.852/143.720/7.707         |
| nrf10-tailsteady-05-before | 359.995/133.104/2.966            | 360.017/133.132/2.967                 | 384.892/142.140/7.453         |
| nrf10-tailsteady-06-after  | 359.997/127.785/2.645            | 360.019/127.812/2.646                 | 385.013/136.530/7.403         |

### Limits

- Both original raw arms stay Native. Before and after refer only to the declared receipt-tail repair revisions. No code, app, database, build, cloud or model was run by this extraction.
- All six attempts stay present. A failed overall game, conversation, save, stream or shutdown stays visible. Supporting CPU per game-second appears only after the six-run completion and accounting gate passes. There is no survivor comparison.
- Offered game time is inferred from the change in elapsed debt plus completed time. There is no independent offered-time counter at these sampled boundaries.
- Startup, steady, overlapping offer-plus-save-drain and waited lifetime are separate. CPU percentages are whole-window ratios. They are not instantaneous samples.
- Command witnesses use actual application responses, movement and server stream receipt. They do not measure rendering. Save-age samples are separate from saves and save-phase percentiles are not additive.
- Concurrent sampled memory is a nonunique sum. Reservation peaks and unclassified final reservation bytes do not measure physical RAM or normal-GC settling. Holder-specific CPU, causality of stale dispatch and residual allocation classes are absent from these clean timings.
- Job teardown and worker reuse/release are recorded separately from the final independent worker/charge reconciliation. Independent resource records, when supplied, are bound without converting their recorded costs into the campaign figure.

Private evidence: `nrf10-tail-ordinary-comparison-20261115/manifest.json`, SHA-256 `7dc421e6ce8fd2c0247618ba1c26498890ca06b23b6bff2d05031c1b331d89ee`. It binds all six original results, phase and accounting data, frozen source/inputs, and the independent worker and spending records.
