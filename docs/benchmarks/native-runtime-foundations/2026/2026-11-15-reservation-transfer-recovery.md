# Native answer reservation transfer during administrator recovery — November 15, 2026

Median server CPU was **75.77% / 68.53% of one core** (control / repaired), and exclusive PostgreSQL was **37.02% / 36.70%**. The game clock stayed paused, so game speed is not applicable. All three attempts in each arm load the checkpoint and serve the same actor at game second zero on the new generation. Server plus PostgreSQL CPU per recovery was **1.213 s / 0.944 s** at the median, but the run ranges overlap and the candidate wall-time p95 is higher. **Equivalent work passed; the performance effect is inconclusive.** The verified custody improvement is retained without claiming a speed or RAM gain.

Campaign `73fe1c2b-28c6-487f-83de-9491bcf3464a` compares adjacent Native sources `3a9b55683ac8a63b2c8ccc871daca0c827a27cd4` and `e326a0aad576e751738d64a9acf38fb992ec907e`. Only the existing Rust provider copy’s reservation transfer differs in executable source. Frozen plan SHA-256 `45193f501e73faa282e77c76730b2a8334bb5edb5e6aaefce1f3f8c503282194`, input descriptors `ee6a1277…` and `a0fe6d02…`. The independent databases and three interleaved runs per arm use the same managed standard 16 GiB AWS `m7i.xlarge`, generations 349–354, Node 22.23.2 and Rust 1.99.1. Both profiles use 2 GiB transient allowance, separate resident and pending-save accounting, one-second ordinary saves and normal GC. Additional and cumulative task Jev cost is **$0**.

The world has one player, two human NPCs, three hares and 1,246 scenery records. This window starts at the actual administrator load and ends with the first usable authorized view. It prices current-format replacement/recovery of that prepared world. Preparation, database installation, initial application open and shutdown are outside the interval. The HTTP driver shares the server process; no separate client CPU sample exists. Server CPU counts Native and its workers once. No player rewind, login or reconnect is measured here.

Statistics are median / arithmetic average / nearest-rank p95; the p95 is the maximum for three runs per arm. CPU utilization is percent of one logical core. The server and database may use CPU concurrently.

| Recovery metric                     | Control, n = 3          | Repaired, n = 3       | Control range  | Repaired range |
| ----------------------------------- | ----------------------- | --------------------- | -------------- | -------------- |
| Server CPU (%)                      | 75.77/77.41/86.87       | 68.53/69.21/71.81     | 69.59–86.87    | 67.29–71.81    |
| Exclusive PostgreSQL CPU (%)        | 37.02/37.34/38.02       | 36.70/36.58/37.12     | 36.97–38.02    | 35.91–37.12    |
| Combined CPU (%)                    | 113.79/114.75/123.90    | 105.23/105.79/107.72  | 106.56–123.90  | 104.42–107.72  |
| Load to usable authorized view (ms) | 1065.64/1025.94/1125.61 | 903.75/983.60/1155.44 | 886.56–1125.61 | 891.60–1155.44 |
| Combined CPU per recovery (s)       | 1.213/1.184/1.395       | 0.944/1.042/1.245     | 0.945–1.395    | 0.938–1.245    |

| Run                         | Outcome         | Load to usable view (ms) | Server CPU (%) | PostgreSQL CPU (%) | Combined CPU (s) |
| --------------------------- | --------------- | -----------------------: | -------------: | -----------------: | ---------------: |
| nrf-admintransfer-01-before | Complete, clean |                  1065.64 |          75.77 |              38.02 |            1.213 |
| nrf-admintransfer-02-after  | Complete, clean |                   891.60 |          68.53 |              36.70 |            0.938 |
| nrf-admintransfer-03-after  | Complete, clean |                   903.75 |          67.29 |              37.12 |            0.944 |
| nrf-admintransfer-04-before | Complete, clean |                   886.56 |          69.59 |              36.97 |            0.945 |
| nrf-admintransfer-05-before | Complete, clean |                  1125.61 |          86.87 |              37.02 |            1.395 |
| nrf-admintransfer-06-after  | Complete, clean |                  1155.44 |          71.81 |              35.91 |            1.245 |

| Run                         | SQL calls / rows returned / affected | Prepared rows / bytes | WAL bytes | DB growth bytes | Server RSS + PostgreSQL boundary memory (MiB) | Transient boundary reservation (MiB) |
| --------------------------- | ------------------------------------ | --------------------- | --------: | --------------: | --------------------------------------------: | -----------------------------------: |
| nrf-admintransfer-01-before | 860 / 2346 / 1374                    | 1,849 / 1,545,389     | 1,823,896 |       1,417,216 |                                        640.14 |                                15.04 |
| nrf-admintransfer-02-after  | 860 / 2346 / 1374                    | 1,849 / 1,545,389     | 1,823,888 |       1,417,216 |                                        677.70 |                                15.12 |
| nrf-admintransfer-03-after  | 869 / 2349 / 1375                    | 1,849 / 1,545,389     | 1,824,496 |       1,433,600 |                                        698.29 |                                15.16 |
| nrf-admintransfer-04-before | 862 / 2347 / 1374                    | 1,849 / 1,545,389     | 1,823,864 |       1,417,216 |                                        704.38 |                                15.15 |
| nrf-admintransfer-05-before | 860 / 2346 / 1374                    | 1,849 / 1,545,389     | 2,925,664 |       1,417,216 |                                        689.59 |                                15.12 |
| nrf-admintransfer-06-after  | 860 / 2346 / 1374                    | 1,849 / 1,545,389     | 1,823,888 |       1,417,216 |                                        691.17 |                                15.07 |

The SQL writer prepares the same rows and payload bytes in all runs. Calls range from 860 to 869 and there are no omitted query or prepared-row counts. One control produces more WAL; this series does not attribute the exact source of that variation. Full replacement remains the administrator recovery path. Memory values are the greater of the two observed boundary samples, not an interval peak. Separate resident, pending-save, main-isolate heap and PostgreSQL process observations are in the private report. No normal-GC settling measurement is implied.

| Separate interval or witness              | Control median / average / p95 | Repaired median / average / p95 |
| ----------------------------------------- | ------------------------------ | ------------------------------- |
| In-window final usable GET (ms)           | 32.08/30.38/32.78              | 26.12/25.96/30.62               |
| Preinstalled application open window (ms) | 719.17/715.56/763.31           | 695.48/662.75/715.68            |
| Whole waited process maximum RSS (MiB)    | 486.12/489.67/498.07           | 500.01/495.43/500.68            |

The combined CPU median and average move in the same direction, but the run ranges overlap and the slowest candidate takes longer than the slowest control. The adjacent steady-gameplay comparison remains [inconclusive for a different reason](2026-11-15-reservation-transfer.md): two journeys miss required replies. Neither window attributes the cost of the individual geometry/SQL/serialization phases or changes the overall adoption decision. The earlier untimed caller check remains the evidence that actual restore questions use the corrected transferred owner.

One earlier attempt stopped before admission because the temporary toolchain directory was missing. No worker job started or budget was reserved. The owner restored the toolchain from the verified frozen archive, checked identical archive and descriptor hashes for both bundles, and ran the same plan. The failed preflight is retained separately and no scheduled case was replaced.

The controller released and stopped slot 2 after generation 354. The campaign settled at **$0.365896**: $0.125276 compute, $0.225315 operations and $0.015305 retained storage. It released $0.556504 of the original hold, with no remaining reservation. Continuing accounted task spend, including prior work outside the controller, is **$17.741749 of $50**. The private evidence archive `nrf09b-transfer-recovery-20261115/manifest.json` seals 192 payloads (42,382,782 bytes), SHA-256 `f8e631e47d20501a58c8b1782093a92455bc2c0f95f99ebddb94c44444a7b66a`. See the [caller checkpoint](../../../maintainers/native-runtime-foundations.md#nrf09-byte-answer-caller-checkpoint--november-14-2026) for correctness evidence and the agreed scope.
