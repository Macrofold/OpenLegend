# Native bridge input custody comparison — November 14, 2026

Median server CPU was **37.85% / 38.07% of one logical core** (control / repaired), with exclusive PostgreSQL **1.88% / 1.92%**. The world ran at about **100% of the intended rate** in both arms. **Disposition: inconclusive.** All three controls and two of three repaired runs completed the required work. The missing reply prevents a matched-work performance or memory claim. Keep the ordered input custody repair for its separately verified correctness effect.

The primary window starts after warmup. CPU is percent of one logical core. Server includes Native and worker threads once. Exclusive PostgreSQL and the client are shown separately. Game speed is percent of the configured automatic rate.

Statistics show median / arithmetic mean / nearest-rank p95, computed across the stated samples. For three whole-run values, p95 is the largest run. All declared attempts remain in the cohort. Sample counts show missing metrics.

Campaign `995edccb-1ba8-4123-9480-20c06143f13d`. Frozen adjacent Native revisions `d62607ffa833c9656aee4b58f84d59cd5bfe81e6` and `3a9b55683ac8a63b2c8ccc871daca0c827a27cd4`. Only the ordered custody of existing copied inputs changes in executable source. Both revisions use generated declarations `faf0f550…` and loader `f51e0961…`; per-run Linux addon identities and the raw and teardown bindings are preserved outside Git. Frozen plan SHA-256 `9c1f7572bd9114699db0a29e9aea5843b37977b2befe0c19fdce8fbf1eb80746`.

The three interleaved repetitions on independent databases run control/candidate/candidate/control/control/candidate on the standard 16 GiB AWS `m7i.xlarge` (4 vCPU, Xeon Platinum 8488C), generations 337–342. Node 22.23.2 and Rust 1.99.1 are pinned on Ubuntu 24.04 `ami-096d6538c463eb1db`. The configured automatic rate is 60 game seconds per elapsed second; the window is 360 seconds after ten seconds of warmup. Ordinary GC, no owner diagnostic instrumentation and zero paid model requests. Additional and cumulative task Jev cost is **$0**.

The observed opening has 1 player, 2 human NPCs, 3 hares and 1246 scenery records. The normal workload uses a permitted SSE stream, scheduled walking, animal reactions, two controlled local HTTPS conversations and ordinary 1000 ms background saves. The Native transient profile is 2048.00 MiB.

Of the three attempts per arm, before passed 3/3 and after passed 2/3. The complete-work and accounting gate fails. These observations include all declared runs and establish no relative performance or rollout qualification.

| Arm    | Primary metric              | Observed | Median/mean/p95      | Range           |
| ------ | --------------------------- | -------- | -------------------- | --------------- |
| before | server                      | 3/3      | 37.85/37.57/38.23    | 36.622–38.227   |
| before | exclusivePostgres           | 3/3      | 1.88/1.89/1.91       | 1.868–1.910     |
| before | client                      | 3/3      | 0.87/0.87/0.90       | 0.830–0.896     |
| before | serverPlusExclusivePostgres | 3/3      | 39.73/39.45/40.09    | 38.532–40.095   |
| before | includingClient             | 3/3      | 40.60/40.32/40.99    | 39.363–40.991   |
| before | game speed                  | 3/3      | 100.00/100.00/100.00 | 100.001–100.005 |
| after  | server                      | 3/3      | 38.07/38.09/38.38    | 37.819–38.378   |
| after  | exclusivePostgres           | 3/3      | 1.92/1.93/1.96       | 1.912–1.961     |
| after  | client                      | 3/3      | 0.86/0.87/0.90       | 0.843–0.902     |
| after  | serverPlusExclusivePostgres | 3/3      | 39.99/40.02/40.34    | 39.731–40.339   |
| after  | includingClient             | 3/3      | 40.83/40.89/41.24    | 40.587–41.241   |
| after  | game speed                  | 3/3      | 99.99/99.99/100.00   | 99.991–99.997   |

| Run                        | Work | Server % | PG %  | Client % | Server + PG % | All CPU % | Speed % | Completed s | Intended s | Inferred offered s | Debt s start/end | Commands accepted/offered | Chat outcomes       |
| -------------------------- | ---- | -------- | ----- | -------- | ------------- | --------- | ------- | ----------- | ---------- | ------------------ | ---------------- | ------------------------- | ------------------- |
| nrf-inputcustody-01-before | PASS | 36.622   | 1.910 | 0.830    | 38.532        | 39.363    | 100.001 | 21600.154   | 21599.887  | 21600.154          | 0.000/0.000      | 560/560                   | completed/completed |
| nrf-inputcustody-02-after  | FAIL | 38.068   | 1.919 | 0.843    | 39.988        | 40.831    | 99.991  | 21597.968   | 21599.812  | 21597.968          | 0.000/0.000      | 560/560                   | stale/completed     |
| nrf-inputcustody-03-after  | PASS | 37.819   | 1.912 | 0.855    | 39.731        | 40.587    | 99.997  | 21599.676   | 21600.238  | 21599.672          | 3.042/3.038      | 560/560                   | completed/completed |
| nrf-inputcustody-04-before | PASS | 38.227   | 1.868 | 0.896    | 40.095        | 40.991    | 100.005 | 21600.905   | 21599.839  | 21600.905          | 0.000/0.000      | 560/560                   | completed/completed |
| nrf-inputcustody-05-before | PASS | 37.846   | 1.880 | 0.873    | 39.727        | 40.599    | 100.001 | 21599.984   | 21599.724  | 21596.995          | 2.989/0.000      | 560/560                   | completed/completed |
| nrf-inputcustody-06-after  | PASS | 38.378   | 1.961 | 0.902    | 40.339        | 41.241    | 99.993  | 21598.206   | 21599.780  | 21598.206          | 0.000/0.000      | 560/560                   | completed/completed |

For context, steady-window combined server and exclusive PostgreSQL CPU per completed game-second was **6.422, 6.665, 6.622, 6.682, 6.621 and 6.723 ms** in run order. These are raw work ratios; the missing reply prevents comparing them as equivalent work.

### Failed required work and cleanup

- `nrf-inputcustody-02-after`. Original complete-work and movement qualification. Clean real process receipt. chat 0: stale, route, action-attention, The character’s evidence changed before dispatch.. The separately exercised stale-evidence diagnostic does not identify which dependency invalidated this timed request. The second conversation and final save complete. All six worker jobs report clean teardown. One redundant explicit download hit `ECONNRESET`; the original collector has all six complete artifact sets, including the failed gameplay run.

| Run                        | Managed outcome | Teardown clean | Worker / generation / lifecycle | Wrapper exit                                          | Application exit | Timeout | Surviving group | Final save | Stream close |
| -------------------------- | --------------- | -------------- | ------------------------------- | ----------------------------------------------------- | ---------------- | ------- | --------------- | ---------- | ------------ |
| nrf-inputcustody-01-before | completed       | True           | slot-2/337/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputcustody-02-after  | failed          | True           | slot-2/338/reused               | {'terminalObserved': True, 'code': 1, 'signal': None} | None             | False   | False           | True       | disconnect   |
| nrf-inputcustody-03-after  | completed       | True           | slot-2/339/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputcustody-04-before | completed       | True           | slot-2/340/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputcustody-05-before | completed       | True           | slot-2/341/reused               | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |
| nrf-inputcustody-06-after  | completed       | True           | slot-2/342/idle                 | {'terminalObserved': True, 'code': 0, 'signal': None} | 0                | False   | False           | True       | disconnect   |

### Application open

Actual application open on a preinstalled PostgreSQL world through the first usable view. It excludes fixture installation, process spawn, login/reconnect, administrative recovery and steady play. It has no independent game speed or client CPU sample. Login/reconnect, process-cold recovery and administrative rewind are unmeasured here.

| Run                        | Elapsed ms | Server CPU % | PG CPU % | Server CPU s | PG CPU s | First usable view |
| -------------------------- | ---------- | ------------ | -------- | ------------ | -------- | ----------------- |
| nrf-inputcustody-01-before | 637.611    | 79.649       | 30.347   | 0.508        | 0.193    | True              |
| nrf-inputcustody-02-after  | 671.276    | 79.325       | 28.105   | 0.532        | 0.189    | True              |
| nrf-inputcustody-03-after  | 628.953    | 81.356       | 29.676   | 0.512        | 0.187    | True              |
| nrf-inputcustody-04-before | 646.899    | 97.926       | 30.103   | 0.633        | 0.195    | True              |
| nrf-inputcustody-05-before | 654.824    | 100.240      | 28.516   | 0.656        | 0.187    | True              |
| nrf-inputcustody-06-after  | 659.090    | 78.562       | 29.575   | 0.518        | 0.195    | True              |

| Arm    | Metric                      | Observed | Median/mean/p95      | Range           |
| ------ | --------------------------- | -------- | -------------------- | --------------- |
| before | wallMs                      | 3/3      | 646.90/646.44/654.82 | 637.611–654.824 |
| before | serverPct                   | 3/3      | 97.93/92.60/100.24   | 79.649–100.240  |
| before | postgresPct                 | 3/3      | 30.10/29.66/30.35    | 28.516–30.347   |
| before | serverCpuSeconds            | 3/3      | 0.63/0.60/0.66       | 0.508–0.656     |
| before | exclusivePostgresCpuSeconds | 3/3      | 0.19/0.19/0.19       | 0.187–0.195     |
| after  | wallMs                      | 3/3      | 659.09/653.11/671.28 | 628.953–671.276 |
| after  | serverPct                   | 3/3      | 79.32/79.75/81.36    | 78.562–81.356   |
| after  | postgresPct                 | 3/3      | 29.58/29.12/29.68    | 28.105–29.676   |
| after  | serverCpuSeconds            | 3/3      | 0.52/0.52/0.53       | 0.512–0.532     |
| after  | exclusivePostgresCpuSeconds | 3/3      | 0.19/0.19/0.19       | 0.187–0.195     |

### Steady command and save costs

Latency columns contain median / mean / p95 milliseconds. Counts and unmatched save phase records remain in the JSON. Command measurements use the original actual correlation and can complete in ordinary save drain. A missing latency witness stays missing.

| Run                        | HTTP response     | Affected view     | Movement          | Durable ACK           | Admission entry | Command accepted  | Sampled unsaved age  |
| -------------------------- | ----------------- | ----------------- | ----------------- | --------------------- | --------------- | ----------------- | -------------------- |
| nrf-inputcustody-01-before | 14.72/17.01/34.16 | 43.54/45.53/72.21 | 59.70/61.21/91.88 | 548.80/548.22/1010.82 | 0.48/0.49/0.63  | 11.57/13.93/31.28 | 510.84/512.73/978.39 |
| nrf-inputcustody-02-after  | 15.49/19.48/37.29 | 46.65/49.32/75.57 | 59.38/61.25/94.74 | 553.98/556.45/1020.56 | 0.47/0.48/0.59  | 12.37/16.12/34.17 | 514.30/512.84/977.41 |
| nrf-inputcustody-03-after  | 14.88/17.88/34.34 | 43.74/46.76/73.75 | 61.47/61.94/91.38 | 553.86/544.32/1019.15 | 0.47/0.48/0.60  | 11.98/14.73/30.70 | 512.61/512.19/979.22 |
| nrf-inputcustody-04-before | 15.14/18.30/35.22 | 43.13/47.21/75.19 | 61.59/62.07/94.21 | 552.57/547.96/1018.06 | 0.48/0.73/0.61  | 12.21/15.00/32.82 | 507.87/511.55/978.01 |
| nrf-inputcustody-05-before | 15.34/18.25/35.12 | 46.23/49.37/74.42 | 58.33/60.82/94.37 | 548.03/549.03/1015.74 | 0.48/0.61/0.61  | 12.15/15.12/31.43 | 510.43/512.76/978.42 |
| nrf-inputcustody-06-after  | 15.52/18.34/37.07 | 44.99/47.31/74.94 | 62.10/62.60/95.69 | 550.92/549.73/1021.89 | 0.49/0.51/0.63  | 12.52/15.22/33.55 | 509.04/513.51/980.41 |

| Run                        | Capture        | Repository        | Acknowledgement | Save start to ACK |
| -------------------------- | -------------- | ----------------- | --------------- | ----------------- |
| nrf-inputcustody-01-before | 0.52/0.60/1.18 | 15.50/15.79/23.98 | 0.88/1.14/1.96  | 21.32/21.72/33.73 |
| nrf-inputcustody-02-after  | 0.55/0.63/0.97 | 16.98/17.19/24.32 | 1.00/1.20/2.90  | 22.38/23.26/34.90 |
| nrf-inputcustody-03-after  | 0.55/0.65/1.30 | 16.60/16.71/24.69 | 0.95/1.15/1.94  | 22.06/22.74/34.22 |
| nrf-inputcustody-04-before | 0.58/0.64/1.07 | 15.84/16.28/24.64 | 1.00/1.22/2.48  | 22.31/22.22/33.16 |
| nrf-inputcustody-05-before | 0.56/0.65/1.33 | 15.99/16.13/23.84 | 1.08/1.19/1.93  | 21.74/22.12/34.64 |
| nrf-inputcustody-06-after  | 0.62/0.67/1.17 | 15.83/15.99/23.58 | 1.07/1.21/2.05  | 22.23/22.60/33.31 |

| Run                        | SQL calls / rows returned / affected | Prepared rows / MiB | WAL MiB | DB growth MiB | Server / client / PG / concurrent sampled MiB | Sampled transient MiB | Lifetime transient MiB | Lifetime resident MiB | Lifetime pending-save MiB | Final transient MiB |
| -------------------------- | ------------------------------------ | ------------------- | ------- | ------------- | --------------------------------------------- | --------------------- | ---------------------- | --------------------- | ------------------------- | ------------------- |
| nrf-inputcustody-01-before | 12210/13758/1419                     | 31441 / 56.05       | 39.70   | 14.05         | 1003.79/105.82/249.61/1351.44                 | 217.56                | 231.82                 | 19.38                 | 1.45                      | 0.67                |
| nrf-inputcustody-02-after  | 13265/15105/1505                     | 33291 / 60.83       | 40.95   | 14.91         | 1080.11/106.27/254.88/1438.29                 | 300.62                | 318.63                 | 19.61                 | 1.45                      | 49.50               |
| nrf-inputcustody-03-after  | 12034/13082/1400                     | 31267 / 55.09       | 38.43   | 14.09         | 1101.29/107.68/260.72/1467.04                 | 228.89                | 244.00                 | 19.99                 | 1.39                      | 2.51                |
| nrf-inputcustody-04-before | 12005/13274/1395                     | 31373 / 55.37       | 39.75   | 14.27         | 1134.49/109.08/264.39/1502.57                 | 261.34                | 284.69                 | 19.39                 | 1.44                      | 3.23                |
| nrf-inputcustody-05-before | 12022/13453/1401                     | 31514 / 55.90       | 38.42   | 14.04         | 1065.73/106.95/269.36/1434.45                 | 288.74                | 319.27                 | 19.43                 | 1.40                      | 48.58               |
| nrf-inputcustody-06-after  | 12187/13617/1415                     | 31711 / 56.29       | 38.96   | 14.02         | 1056.98/107.08/270.84/1427.43                 | 303.87                | 308.46                 | 19.41                 | 1.45                      | 48.83               |

### Overlapping lifecycle totals

Wall and CPU values are seconds. The waited application/client tree includes startup, warmup, steady play, drain and cleanup. Its CPU overlaps the primary and drain windows.

| Run                        | Steady wall / server+PG / client | Offer+drain wall / server+PG / client | Whole wall / waited tree / PG |
| -------------------------- | -------------------------------- | ------------------------------------- | ----------------------------- |
| nrf-inputcustody-01-before | 359.998/138.715/2.989            | 360.026/138.748/2.990                 | 387.076/147.710/8.146         |
| nrf-inputcustody-02-after  | 359.997/143.954/3.035            | 360.049/144.013/3.036                 | 385.328/153.130/8.239         |
| nrf-inputcustody-03-after  | 360.004/143.034/3.079            | 360.032/143.065/3.080                 | 387.074/152.290/8.156         |
| nrf-inputcustody-04-before | 359.997/144.339/3.226            | 360.026/144.373/3.227                 | 387.122/153.870/8.002         |
| nrf-inputcustody-05-before | 359.995/143.014/3.142            | 360.037/143.062/3.143                 | 386.070/152.320/8.096         |
| nrf-inputcustody-06-after  | 359.996/145.218/3.248            | 360.040/145.267/3.249                 | 387.094/154.630/8.367         |

### Limits

- Both arms use Native and the same declared workload. This measurement establishes no comparison with Source.
- All six attempts stay present. A failed overall game, conversation, save, stream or shutdown stays visible. The raw CPU per game-second ratios do not establish equivalent-work costs. There is no survivor comparison.
- Offered game time is inferred from the change in elapsed debt plus completed time. There is no independent offered-time counter at these sampled boundaries.
- Startup, steady, overlapping offer-plus-save-drain and waited lifetime are separate. CPU percentages are whole-window ratios. They are not instantaneous samples.
- Command witnesses use actual application responses, movement and server stream receipt. They do not measure rendering. Save-age samples are separate from saves and save-phase percentiles are not additive.
- Concurrent sampled memory is a nonunique sum. Reservation peaks and unclassified final reservation bytes do not measure physical RAM or normal-GC settling. Holder-specific CPU, causality of stale dispatch and residual allocation classes are absent from these clean timings.
- Job teardown and worker reuse/release are recorded separately from the final independent worker/charge reconciliation. Independent resource records, when supplied, are bound without converting their recorded costs into the campaign figure.

The controller released and stopped slot 2 after generation 342. The campaign settled at **$0.493330**, including $0.247326 compute, $0.225312 operations and $0.020692 retained storage. The remainder of the original $0.927784 hold was released and no reservation remains. Continuing task exposure is **$16.883312** against the $50 ceiling, including the previously recorded costs outside the controller. The private evidence directory `nrf09-input-owner-20261114/cloud-custody-equivalence` seals 176 payloads (378,107,555 bytes) in `manifest.json`, SHA-256 `644ac062bc60f2edd4e06ce01c0f7ae6b1acab089d6ff4b11502d983043d8b37`. See the [NRF09 checkpoint](../../../maintainers/native-runtime-foundations.md#nrf09-byte-answer-caller-checkpoint--november-14-2026) for real-caller verification and remaining qualification.
