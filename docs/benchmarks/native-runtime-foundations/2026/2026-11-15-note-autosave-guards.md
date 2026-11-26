# Native remembered-note and autosave repairs — November 15, 2026

Ordinary play used **33.93–36.24% of one core for the server** and **1.71–1.96% for exclusive PostgreSQL**, reaching **99.996–100.009% of the intended game speed**. These are descriptive ranges across all nine attempts. Four attempts lost the first controlled conversation to a stale-source refusal, so neither ordinary comparison qualifies an isolated cost result. The separate paused note comparison completed all six runs. Its median server CPU was **48.72% / 49.49% of one core**, exclusive PostgreSQL was **7.19% / 7.27%**, and combined CPU was **10.695 / 10.700 seconds per completed case** before and after. The ranges overlap.

## Frozen work and comparisons

Both scenarios use the common six-body opening of one player, two human NPCs, three hares and 1,246 scenery records. The ordinary scenario exercises walking, animal reactions, perception and history, permitted SSE, two controlled NPC conversations over local HTTPS and one-second background saves. A ten-second warmup precedes 360 wall seconds of ordinary play at the authored 60× rate. The note scenario exercises a scoped remembered document, permitted reply generation, a separate speech and durable continuation with the clock paused during the selected request. Both use one Native worker, 2 GiB transient allowance, separate resident and pending-save accounting, and normal garbage collection.

| Arm | Exact application revision                 | Native source |
| --- | ------------------------------------------ | ------------- |
| A   | `6665d66d77b6076d06493b1ba990e45ca0034c49` | `e3039aa2…`   |
| B   | `f1396d2497167974e43db4772b8ae301165c460a` | `2d0ed28e…`   |
| C   | `d479e112f0a5a3af9bf71a74ddd8b7beb5919679` | `2d0ed28e…`   |

The note compares A/B in AB BA AB order. Ordinary play runs ABC CBA ABC. A/B guards the note binding during ordinary play, and B/C guards the recoverable pre-capture save refusal. Only the latter fixes autosave. The genuine refusal and exactly-once recovery checks were exercised separately through the [real save callers](../../../maintainers/native-runtime-foundations.md#shared-bridge-work). The ordinary scenario does not inject a refusal or edit a note. Both workload families use independent database scopes for each job. The three B ordinary observations serve both comparisons.

The managed worker was the standard 16 GiB AWS m7i.xlarge using image `ami-096d6538c463eb1db`, generations 379–393. Application Node is 22.23.2, generated SDK `faf0f550…`, and loader `f51e0961…`. Per-run release-addon hashes, source archives, identity checks, raw work and teardown are sealed with the private evidence. External Jev cost is $0.

## The remembered-note caller with the clock paused

All six interleaved runs complete equal work. The authenticated conversation offers the same document-only alias, makes two judgment requests and one generation request with the same typed exchange identities and contents, and applies one note edit and one independent speech. The ordinary save acknowledges the accepted work, and a fresh world and repository in the same process reopen the same revision-two document and continue through durable second 2. The original non-self document refusal remains a correctness control outside the cost comparison.

The complete measured envelope includes the waited server process tree, inline client and controlled HTTPS provider, and exclusive PostgreSQL CPU. The warm window starts at the application caller and ends at the covering ordinary save acknowledgement. It offers and completes zero game seconds and has zero elapsed debt. Automatic game speed and CPU per game-second are inapplicable. All statistics are median / arithmetic mean / nearest-rank p95 across three runs per arm.

| Metric                                            |          A, before note fix |                 B, note fix |
| ------------------------------------------------- | --------------------------: | --------------------------: |
| Complete server CPU, % of one core                |       48.72 / 49.23 / 50.79 |       49.49 / 49.74 / 50.64 |
| Complete exclusive PostgreSQL CPU, % of one core  |          7.19 / 7.23 / 7.40 |          7.27 / 7.27 / 7.37 |
| Complete combined CPU, % of one core              |       55.91 / 56.45 / 58.20 |       56.76 / 57.02 / 58.02 |
| Complete combined CPU, seconds per completed case |    10.695 / 10.696 / 10.713 |    10.700 / 10.706 / 10.775 |
| Warm server CPU, % of one core                    |       32.54 / 31.27 / 36.71 |       28.38 / 31.24 / 37.22 |
| Warm exclusive PostgreSQL CPU, % of one core      |          7.87 / 7.38 / 8.09 |          6.99 / 7.03 / 7.92 |
| Warm combined CPU, seconds per completed request  |       1.007 / 1.024 / 1.086 |       1.097 / 1.100 / 1.160 |
| Warm request to completed job, ms                 | 1413.78 / 1684.52 / 2254.41 | 1951.09 / 1902.33 / 2340.83 |
| Warm request to durable acknowledgement, ms       | 2436.07 / 2706.15 / 3276.85 | 2971.10 / 2919.66 / 3358.65 |
| Warm SQL adapter calls                            |             355 / 372 / 406 |             387 / 383 / 409 |
| Complete sampled concurrent memory peak, MiB      |    686.46 / 673.95 / 701.55 |    687.29 / 684.57 / 708.51 |
| Lifetime transient reservation peak, MiB          |       60.17 / 60.17 / 60.19 |       60.17 / 60.06 / 60.18 |

Complete combined CPU ranges from 10.680–10.713 seconds on A and 10.642–10.775 on B. Warm request-to-durable ranges overlap at 2.406–3.277 and 2.429–3.359 seconds, with all six runs paying the ordinary background-save wait. Warm combined CPU ranges also overlap. Both arms prepare 146 rows and 227,659 bytes during that window. Sampled memory is a nonunique concurrent sum, and reservations are independently accounted. The focused comparison establishes no repeatable cost effect. Keep the fix because the verified document-only response now completes without re-resolving the subject through a physical binding.

## Ordinary comparison disposition

The note-binding comparison qualifies two of three runs on A and two of three on B. The autosave comparison qualifies two of three on B and one of three on C. Each attempt delivered and accepted all 560 scheduled commands, kept the permitted stream intact, and finished with a durable save and a released database/process scope. The 539 commands in each primary window all have a changed-movement witness. The reported game-speed and debt outcomes describe the automatic clock even when a conversation fails.

The first conversation returns stale before dispatch in 04-C, 05-B, 06-A and 09-C. In the three reverse-order runs, the selected path reaches judgment but records no generation exchange. The fourth failure, 09-C, records no actual exchange in the first request's scoped list. Each second conversation applies and persists one reply. The workload exits 1 after the final save in those four cases and the managed worker verifies clean teardown separately. The same refusal occurs before either repair, and the clean timing input has no evidence-owner trace. The artifacts establish where the request stops, while the changed dependency and whether any revision affected its likelihood remain unknown.

Both ordinary cost guards are **inconclusive**. Keep the note fix for its verified document-only edit and the autosave fix for its verified recovery of queued work. Neither comparison measures the later unused-snapshot or changed-row adapter work.

### Ordinary play observations

CPU is each whole-window average as a percentage of one logical core. Game speed uses the actual window duration at the authored 60× rate. Inferred offered time is completed time plus the change in debt. Each row describes one attempt.

| Run  | Server % | Exclusive PG % | Client % | Server + PG % | Game speed % | Server + PG CPU ms/game-s | Game seconds completed / intended / inferred offered | Debt start / end, s | Full-run commands | Conversations         |
| ---- | -------- | -------------- | -------- | ------------- | ------------ | ------------------------- | ---------------------------------------------------- | ------------------- | ----------------- | --------------------- |
| 01-A | 35.03    | 1.76           | 0.78     | 36.80         | 100.009      | 6.13                      | 21601.83 / 21599.83 / 21601.83                       | 0.00 / 0.00         | 560/560           | completed / completed |
| 02-B | 35.07    | 1.78           | 0.81     | 36.85         | 99.996       | 6.14                      | 21598.98 / 21599.77 / 21598.98                       | 0.00 / 0.00         | 560/560           | completed / completed |
| 03-C | 35.37    | 1.71           | 0.81     | 37.08         | 99.996       | 6.18                      | 21599.01 / 21599.81 / 21599.01                       | 0.00 / 0.00         | 560/560           | completed / completed |
| 04-C | 35.52    | 1.88           | 0.81     | 37.40         | 99.996       | 6.23                      | 21599.03 / 21599.83 / 21599.03                       | 0.00 / 0.00         | 560/560           | stale / completed     |
| 05-B | 36.24    | 1.82           | 0.81     | 38.06         | 100.002      | 6.34                      | 21600.20 / 21599.85 / 21600.20                       | 0.00 / 0.00         | 560/560           | stale / completed     |
| 06-A | 35.65    | 1.96           | 0.79     | 37.60         | 100.003      | 6.27                      | 21600.37 / 21599.80 / 21600.37                       | 0.00 / 0.00         | 560/560           | stale / completed     |
| 07-A | 33.93    | 1.77           | 0.80     | 35.71         | 99.998       | 5.95                      | 21599.44 / 21599.85 / 21599.44                       | 0.00 / 0.00         | 560/560           | completed / completed |
| 08-B | 34.39    | 1.75           | 0.78     | 36.13         | 100.004      | 6.02                      | 21600.74 / 21599.86 / 21600.74                       | 0.00 / 0.00         | 560/560           | completed / completed |
| 09-C | 35.36    | 1.87           | 0.78     | 37.23         | 100.000      | 6.21                      | 21599.82 / 21599.86 / 21599.82                       | 0.00 / 0.00         | 560/560           | stale / completed     |

Latency triples are median / arithmetic mean / nearest-rank p95 in milliseconds. Movement and affected-view times end at receipt by the permitted SSE client. Durable times end at an ordinary save acknowledgement covering the command. Save age comes from periodic samples. Save phase durations use complete in-window pairs.

| Run  | HTTP response         | First affected view   | First changed movement | Durable acknowledgement   | Unsaved age              | Save start to acknowledgement | Missing response / view / movement / durability |
| ---- | --------------------- | --------------------- | ---------------------- | ------------------------- | ------------------------ | ----------------------------- | ----------------------------------------------- |
| 01-A | 13.72 / 15.84 / 29.73 | 40.96 / 43.90 / 70.63 | 62.22 / 61.31 / 96.25  | 544.37 / 541.11 / 1013.00 | 511.00 / 511.46 / 974.51 | 19.75 / 19.80 / 29.20         | 0 / 0 / 0 / 0                                   |
| 02-B | 14.15 / 16.50 / 31.00 | 40.48 / 43.92 / 69.99 | 61.38 / 60.65 / 95.03  | 541.97 / 543.26 / 1010.94 | 504.15 / 511.21 / 978.69 | 20.02 / 20.34 / 30.40         | 0 / 0 / 0 / 0                                   |
| 03-C | 14.16 / 16.44 / 30.67 | 41.53 / 44.43 / 71.93 | 61.94 / 60.80 / 91.79  | 541.64 / 544.19 / 1013.54 | 505.25 / 508.43 / 972.45 | 20.01 / 20.24 / 30.94         | 0 / 0 / 0 / 0                                   |
| 04-C | 14.35 / 16.98 / 32.88 | 41.75 / 45.30 / 73.14 | 60.17 / 60.02 / 93.16  | 544.64 / 544.25 / 1013.07 | 507.34 / 509.48 / 973.67 | 20.73 / 21.37 / 29.85         | 0 / 0 / 0 / 0                                   |
| 05-B | 13.77 / 16.59 / 33.80 | 43.87 / 45.48 / 73.29 | 55.71 / 58.70 / 95.03  | 544.21 / 544.42 / 1008.86 | 512.38 / 512.24 / 975.53 | 20.71 / 21.53 / 32.30         | 0 / 0 / 0 / 0                                   |
| 06-A | 14.04 / 16.37 / 32.02 | 41.59 / 44.17 / 73.62 | 60.58 / 59.70 / 91.64  | 541.87 / 546.78 / 1012.77 | 513.64 / 512.21 / 974.76 | 20.65 / 21.26 / 32.78         | 0 / 0 / 0 / 0                                   |
| 07-A | 14.08 / 16.33 / 29.81 | 41.57 / 44.53 / 69.62 | 58.67 / 58.70 / 93.91  | 542.84 / 541.99 / 1005.91 | 505.96 / 505.89 / 969.24 | 19.75 / 20.08 / 30.51         | 0 / 0 / 0 / 0                                   |
| 08-B | 14.10 / 16.20 / 29.87 | 41.46 / 44.27 / 70.18 | 61.49 / 60.67 / 97.49  | 546.84 / 537.66 / 1013.75 | 508.25 / 508.43 / 972.23 | 20.09 / 20.46 / 30.48         | 0 / 0 / 0 / 0                                   |
| 09-C | 14.36 / 17.01 / 31.03 | 42.86 / 45.08 / 72.26 | 59.54 / 59.86 / 90.09  | 548.41 / 545.62 / 1017.74 | 510.11 / 512.55 / 978.39 | 21.03 / 21.99 / 30.61         | 0 / 0 / 0 / 0                                   |

SQL figures are application-adapter calls and rows. Prepared bytes describe the shared writer’s batches. WAL uses the increase in the insert log sequence number. The sampled concurrent total sums application/client RSS and exclusive PostgreSQL memory at each sample. Reservation peaks and final unclassified transient charges are separate.

| Run  | SQL calls / rows returned / affected | Prepared rows / MiB | WAL / DB growth, MiB | Sampled server / client / PG / concurrent MiB | Lifetime transient / resident / pending-save, MiB | Final transient, MiB |
| ---- | ------------------------------------ | ------------------- | -------------------- | --------------------------------------------- | ------------------------------------------------- | -------------------- |
| 01-A | 11951 / 13371 / 1378                 | 31698 / 56.34       | 39.19 / 14.21        | 1043.26 / 103.07 / 277.92 / 1421.39           | 260.22 / 19.39 / 1.45                             | 4.06                 |
| 02-B | 11994 / 13339 / 1400                 | 31568 / 55.80       | 39.26 / 14.30        | 1059.59 / 102.53 / 285.82 / 1444.29           | 304.96 / 19.42 / 1.45                             | 48.44                |
| 03-C | 11845 / 12881 / 1387                 | 31418 / 55.34       | 38.92 / 14.05        | 927.94 / 108.41 / 279.14 / 1312.58            | 280.29 / 20.02 / 1.45                             | 2.68                 |
| 04-C | 13254 / 15184 / 1505                 | 33372 / 60.70       | 41.36 / 14.29        | 1120.76 / 108.83 / 286.34 / 1511.58           | 307.84 / 19.73 / 1.45                             | 48.54                |
| 05-B | 12615 / 13803 / 1463                 | 34387 / 63.42       | 41.60 / 14.63        | 1031.71 / 107.30 / 277.63 / 1408.16           | 339.52 / 20.20 / 1.45                             | 47.55                |
| 06-A | 13669 / 16406 / 1544                 | 33540 / 61.67       | 41.59 / 15.09        | 998.54 / 106.10 / 283.85 / 1385.29            | 281.94 / 19.59 / 1.53                             | 2.87                 |
| 07-A | 12006 / 13441 / 1401                 | 31421 / 55.88       | 38.90 / 14.07        | 1119.81 / 106.57 / 275.90 / 1497.85           | 318.53 / 19.43 / 1.45                             | 47.61                |
| 08-B | 12042 / 13101 / 1401                 | 31334 / 55.16       | 39.06 / 14.25        | 1066.40 / 103.40 / 277.63 / 1438.91           | 247.71 / 19.39 / 1.39                             | 3.21                 |
| 09-C | 13698 / 16023 / 1529                 | 33361 / 60.86       | 41.80 / 14.56        | 1185.83 / 101.05 / 280.16 / 1561.51           | 320.29 / 19.62 / 1.45                             | 49.22                |

### Separate and overlapping windows

The first-useful-view measure covers application opening in the prepared process, and the complete envelope includes startup, warmup, play, drain and cleanup. The offer-plus-drain and complete-envelope rows overlap steady and cannot be added to it. The raw samples retain separate save capture, repository and acknowledgement timings. No reconnect, browser paint or administrative rewind is timed in these guards.

| Run  | First usable view, ms | Offer + drain wall / server + PG CPU / client CPU, s | Complete wall / waited app + client CPU / PG CPU, s |
| ---- | --------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| 01-A | 553.88                | 360.02 / 132.49 / 2.80                               | 384.81 / 141.01 / 7.57                              |
| 02-B | 733.23                | 360.03 / 132.71 / 2.93                               | 385.07 / 141.62 / 7.63                              |
| 03-C | 696.54                | 360.02 / 133.51 / 2.92                               | 384.95 / 142.59 / 7.36                              |
| 04-C | 744.56                | 360.02 / 134.66 / 2.90                               | 385.07 / 143.27 / 7.97                              |
| 05-B | 618.08                | 360.02 / 137.05 / 2.91                               | 384.89 / 145.46 / 7.81                              |
| 06-A | 587.59                | 360.02 / 135.40 / 2.84                               | 384.78 / 143.22 / 8.32                              |
| 07-A | 586.72                | 360.02 / 128.57 / 2.87                               | 386.23 / 137.13 / 7.57                              |
| 08-B | 580.65                | 360.02 / 130.10 / 2.81                               | 384.70 / 138.58 / 7.46                              |
| 09-C | 564.79                | 360.02 / 134.06 / 2.81                               | 384.80 / 142.05 / 7.91                              |

## Campaign reconciliation

Credential expiry interrupted campaign `955a48e1-7022-4180-8a5f-701a8542eafa` during upload. After sign-in, the controller confirmed that all 15 jobs were cancelled before starting and no worker had been assigned. The campaign settled at $0.342903 in estimated operations and returned $0.785080 of its hold. All timing data comes from the subsequently admitted campaign `82b899fd-eda8-48c8-82d1-5174455977fc`. The byte-identical plan SHA-256 is `b74abe5a0694e87fb006efc41a23a52841294a8ec511be6883b7cc26e1481082` and the admitted manifest SHA-256 is `eed1c27942b088f8dc9d759a278764aab4f4d082c5ea029df754dc5af31279d6`. The admitted note archive switched file permissions to read-only during sealing. Its ten files match the qualified input byte for byte.

All 15 outcomes and artifacts were collected. The second campaign settled at **$0.797478** in controller-estimated usage, including retained storage, and returned **$0.345793**. An independent read confirmed the standard worker stopped and available at generation 393, with **zero reservation**. Continuing task exposure is **$20.269501** against the authorized $50 ceiling, including $1.016709 of prior accounted work outside the controller. Both campaign charges are already included in that total.

Private evidence `nrf10-note-nrf11-autosave-comparison-20261115/manifest.json`, SHA-256 `1121537235474f2381f1fc538589177f2e825bc246879aba0834325b3b543e5f`. It binds the interrupted claim, exact input and release identities, all raw attempts, independent database ownership, offline analysis and final resource receipts.
