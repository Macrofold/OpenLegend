# Native active areas and ordinary-play costs

[Current implementation and qualification](../../../maintainers/native-simulation-core.md#current-implementation-batch) · [Measurement contract](../../../performance/measurement.md#reporting-results)

## Isolated ordinary gameplay

Each comparison uses the same physical managed `m7i.xlarge` for three interleaved runs per arm and six independent PostgreSQL databases. The opening contains one player, two human NPCs, three hares and 1,246 scenery records. At the automatic 60× clock, the fixed 360-second production window uses actual movement, reactions, perception, the permitted live state stream, two controlled HTTPS conversations and ordinary one-second background saves. Qualification requires all 560 movements and 74 presence renewals including warmup, two saved replies and a clean stop. The window statistics are across runs, in median / arithmetic average / nearest-rank p95 order. Three-run p95 is the highest run average. OpenLegend and exclusive PostgreSQL run on the same isolated host. The load client runs in a separate process. Native and geometry worker threads are already included in server CPU.

| Comparison               | Arm (qualified / scheduled) | Server CPU % of one core | PostgreSQL CPU % of one core |       Achieved game speed % |
| ------------------------ | --------------------------- | -----------------------: | ---------------------------: | --------------------------: |
| Choice packet transfer   | Control 3/3                 |    39.30 / 39.53 / 40.89 |           1.94 / 1.94 / 1.97 |   99.993 / 99.997 / 100.005 |
| Choice packet transfer   | Candidate 3/3               |    40.58 / 39.96 / 41.21 |           1.95 / 1.94 / 1.96 | 100.004 / 100.000 / 100.005 |
| Direct JSON text         | Control 3/3                 |    35.73 / 35.87 / 36.22 |           1.75 / 1.77 / 1.82 |    99.998 / 99.997 / 99.998 |
| Direct JSON text         | Candidate 3/3               |    36.37 / 36.05 / 36.54 |           1.75 / 1.73 / 1.78 |  99.998 / 100.000 / 100.005 |
| Shared-value protection  | Control 3/3                 |    43.99 / 44.00 / 44.06 |           2.11 / 2.12 / 2.15 |  99.999 / 100.002 / 100.008 |
| Shared-value protection  | Candidate 3/3               |    43.71 / 43.76 / 43.99 |           2.12 / 2.15 / 2.21 | 100.001 / 100.000 / 100.002 |
| NPC publication validity | Control 3/3                 |    39.66 / 39.54 / 39.86 |           2.04 / 2.03 / 2.06 |    99.996 / 99.995 / 99.997 |
| NPC publication validity | Candidate 3/3               |    39.23 / 39.34 / 39.57 |           2.07 / 2.04 / 2.08 | 100.000 / 100.002 / 100.008 |
| Same-world dispatch      | Control 3/3                 |    38.82 / 38.83 / 39.45 |           1.94 / 1.90 / 1.97 | 100.004 / 100.005 / 100.011 |
| Same-world dispatch      | Candidate 3/3               |    38.96 / 39.95 / 42.74 |           1.87 / 1.91 / 1.99 | 100.003 / 100.002 / 100.004 |

| Comparison               | Arm       | Load-client CPU % of one core | Complete CPU ms / completed game-second |   Command response ms | First visible movement ms | Command to durable acknowledgement ms |
| ------------------------ | --------- | ----------------------------: | --------------------------------------: | --------------------: | ------------------------: | ------------------------------------: |
| Choice packet transfer   | Control   |            0.97 / 0.97 / 1.01 |                   7.040 / 7.074 / 7.308 | 15.99 / 18.92 / 35.78 |     64.81 / 64.42 / 99.50 |             550.88 / 552.26 / 1019.09 |
| Choice packet transfer   | Candidate |            1.00 / 0.98 / 1.01 |                   7.258 / 7.146 / 7.361 | 15.80 / 18.60 / 34.23 |     60.88 / 62.86 / 98.69 |             548.20 / 542.86 / 1013.66 |
| Direct JSON text         | Control   |            0.86 / 0.86 / 0.88 |                   6.386 / 6.417 / 6.487 | 14.24 / 16.89 / 31.84 |     57.97 / 59.36 / 94.28 |             544.67 / 541.08 / 1003.30 |
| Direct JSON text         | Candidate |            0.85 / 0.85 / 0.86 |                   6.497 / 6.439 / 6.509 | 14.26 / 16.71 / 31.92 |     61.07 / 61.61 / 97.46 |             542.63 / 541.37 / 1010.70 |
| Shared-value protection  | Control   |            1.04 / 1.04 / 1.04 |                   7.858 / 7.860 / 7.875 | 17.40 / 20.46 / 38.29 |     61.76 / 65.05 / 98.21 |             556.53 / 553.80 / 1022.37 |
| Shared-value protection  | Candidate |            1.03 / 1.03 / 1.04 |                   7.827 / 7.824 / 7.859 | 16.94 / 20.40 / 39.02 |     60.08 / 63.58 / 98.05 |             554.90 / 555.42 / 1022.04 |
| NPC publication validity | Control   |            0.94 / 0.93 / 0.94 |                   7.100 / 7.084 / 7.142 | 15.46 / 18.16 / 34.13 |     60.80 / 61.57 / 95.91 |             551.96 / 550.08 / 1021.14 |
| NPC publication validity | Candidate |            0.93 / 0.93 / 0.93 |                   7.041 / 7.053 / 7.080 | 15.24 / 18.30 / 34.33 |     62.11 / 62.59 / 94.91 |             551.78 / 548.46 / 1019.67 |
| Same-world dispatch      | Control   |            0.93 / 0.93 / 0.94 |                   6.922 / 6.943 / 7.055 | 15.71 / 18.28 / 35.27 |     60.37 / 61.35 / 95.59 |             547.39 / 546.35 / 1016.08 |
| Same-world dispatch      | Candidate |            0.92 / 0.95 / 1.02 |                   6.957 / 7.135 / 7.624 | 16.06 / 19.36 / 37.34 |     60.71 / 62.91 / 99.65 |             550.25 / 549.24 / 1016.49 |

CPU per completed second includes server, client and exclusive PostgreSQL once. The latency distributions pool individual qualifying primary command observations. The accompanying JSON reductions retain sample counts and missing records separately. First visible is receipt of a scope-specific decoded SSE frame. Acknowledgement reflects the covering saved revision from the ordinary timer. Both work and resource gates apply to each run.

| Comparison               | Arm       | Offered / completed game seconds | End debt, game seconds | SQL calls / returned rows | Prepared rows / MiB | WAL / database growth MiB | Concurrent RAM / transient reserve MiB |
| ------------------------ | --------- | -------------------------------: | ---------------------: | ------------------------: | ------------------: | ------------------------: | -------------------------------------: |
| Choice packet transfer   | Control   |            21,599.82 / 21,598.65 |                 0.0000 |           12,029 / 13,607 |      31,523 / 56.16 |             38.68 / 14.20 |                      1,420.54 / 249.82 |
| Choice packet transfer   | Candidate |            21,599.73 / 21,600.72 |                 0.0000 |           12,134 / 13,436 |      31,198 / 55.08 |             38.56 / 14.11 |                      1,403.48 / 237.53 |
| Direct JSON text         | Control   |            21,599.80 / 21,599.32 |                 0.0000 |           12,042 / 13,267 |      31,486 / 55.42 |             39.06 / 14.10 |                      1,381.16 / 242.99 |
| Direct JSON text         | Candidate |            21,599.79 / 21,599.38 |                 0.0000 |           11,850 / 12,945 |      31,450 / 55.33 |             38.95 / 13.92 |                      1,349.99 / 202.37 |
| Shared-value protection  | Control   |            21,599.81 / 21,599.51 |                 0.0000 |           12,095 / 13,250 |      31,129 / 54.83 |             38.64 / 14.24 |                      1,411.77 / 224.98 |
| Shared-value protection  | Candidate |            21,599.77 / 21,599.99 |                 0.0000 |           12,149 / 13,424 |      31,365 / 55.87 |             38.82 / 13.99 |                      1,431.04 / 238.29 |
| NPC publication validity | Control   |            21,599.79 / 21,598.87 |                 0.0000 |           12,005 / 13,430 |      31,523 / 56.11 |             39.56 / 14.05 |                      1,403.70 / 262.82 |
| NPC publication validity | Candidate |            21,599.86 / 21,599.74 |                 0.0000 |           12,135 / 13,491 |      31,623 / 56.12 |             39.56 / 14.20 |                      1,407.64 / 256.58 |
| Same-world dispatch      | Control   |            21,599.77 / 21,600.64 |                 0.0000 |           12,300 / 13,730 |      31,420 / 55.66 |             38.98 / 14.28 |                      1,421.97 / 248.66 |
| Same-world dispatch      | Candidate |            21,599.80 / 21,600.45 |                 0.0000 |           12,028 / 13,085 |      31,117 / 54.97 |             38.53 / 13.95 |                      1,421.84 / 209.93 |

These supporting values are medians across qualifying windows. Concurrent RAM sums sampled application/client RSS and exclusive PostgreSQL memory at the same instant. Shared pages may be counted more than once. Reservation peaks track separate bytes admitted by Native. Prepared JSON bytes, SQL socket traffic, WAL and actual database growth remain separate. Setup, closing save drain and shutdown stay separate from the steady window. The held windows below use different manual offers.

| Comparison               | Control → candidate source                                                              | Campaign                               | Combined CPU change, median | Observed run ranges, CPU ms / game-second |
| ------------------------ | --------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------: | ----------------------------------------: |
| Choice packet transfer   | `ed91745c75054c3701de538f2c47e10cbc02b091` → `79f8839b61ad5845f151dd743faaf74bdfb4f109` | `63f79829-543e-4d18-9c89-3d6fb5bcf11c` |                      +3.09% |                 6.873–7.308 → 6.819–7.361 |
| Direct JSON text         | `0e0670c4816eed3fee266ce4efeee0b26f1e503c` → `79f8839b61ad5845f151dd743faaf74bdfb4f109` | `15d01073-fb1f-42cc-a085-8d6329fd4cf6` |                      +1.74% |                 6.377–6.487 → 6.310–6.509 |
| Shared-value protection  | `63cc944468facd6bc41f0811abf03dfd002f131b` → `79f8839b61ad5845f151dd743faaf74bdfb4f109` | `16ef2fdc-74f9-4d90-bf4b-6ac0f1c45a75` |                      -0.40% |                 7.845–7.875 → 7.786–7.859 |
| NPC publication validity | `245e3d3fbd2a65a5958788974b6f96b797afdb16` → `79f8839b61ad5845f151dd743faaf74bdfb4f109` | `1e976555-9662-47a7-a5e7-a4e68302d797` |                      -0.84% |                 7.010–7.142 → 7.038–7.080 |
| Same-world dispatch      | `babd12ef5dab1536aba827fc446a66706bf5d592` → `939de951b04a0230c085a570b13f4113a9068caa` | `ec38d333-009a-45d7-9975-12f40fa47032` |                      +0.51% |                 6.851–7.055 → 6.823–7.624 |

All five original comparisons complete six qualified runs each. Their complete CPU ranges overlap and the individual pairs move in both directions. This leaves the CPU effect inconclusive for each change. Keep the choice transfer and direct text path because they remove a copy or encode/decode round trip. Keep the shared-value protection lookup because the actual caller confirms it skips repeated full membership exports while preserving exact read custody. Keep the NPC check because it repairs a reproduced refusal and keeps genuine invalidation. Keep same-world dispatch as the tested prerequisite for safe nested work. None of these reasons depends on a whole-opening speedup.

For the integrated NPC-validity candidate, 1,044 complete autosave traces show where time is spent. Values pool the matched phase durations, in median / average / nearest-rank p95 milliseconds.

| Autosave phase                             |                 Latency, ms |
| ------------------------------------------ | --------------------------: |
| Oldest unsaved change when the timer fires | 1001.92 / 1006.85 / 1021.39 |
| Save start to native capture start         |          0.12 / 1.28 / 6.50 |
| Native capture                             |          0.53 / 0.61 / 1.15 |
| Capture end to repository start            |          1.79 / 1.78 / 2.55 |
| Repository start to commit return          |       16.69 / 17.04 / 25.17 |
| Commit return to acknowledgement start     |          0.05 / 1.28 / 6.50 |
| Acknowledgement                            |          0.97 / 1.19 / 2.12 |

The one-second policy explains most of the command-to-durable interval. Repository work is the largest traced phase after save starts. The interval containing synchronous row encoding, decoded transfer and save preparation sums to 0.615–0.623 seconds across a 360-second run. It bounds the coordination benefit of moving that interval in this opening. It does not isolate encoding CPU or waiting at larger populations. These results do not warrant changing the save schedule or making commands wait for durability.

## Two-worker held replies

| Held window                        | Server CPU, % of one logical core | PostgreSQL CPU, % of one logical core | Offered game seconds | Completed game seconds | End debt, game seconds |
| ---------------------------------- | --------------------------------: | ------------------------------------: | -------------------: | ---------------------: | ---------------------: |
| Completion, cancellation, repeat   |                             68.91 |                                  5.41 |                  460 |                    460 |                      0 |
| View loss and permitted late reply |                            105.18 |                                  6.08 |                  238 |                    238 |                      0 |

One run per scenario on the same managed `m7i.xlarge` in `us-east-2`, with independent databases. PostgreSQL uses its exclusive cgroup. The server measurement includes the Native worker threads and inline controlled HTTPS/client work once. The driver makes discrete manual offers, all of which complete. Intended-rate game speed is unavailable for these windows. Complete waited CPU including startup and cleanup is separate. Combined held CPU is 21.85 and 22.43 ms per completed game-second respectively. The full process envelope uses 40.32 and 57.50 ms per completed game-second.

| Movement latency, ms (median / average / p95) | Completion, cancellation, repeat (n=5) |             View loss (n=1) |
| --------------------------------------------- | -------------------------------------: | --------------------------: |
| Command response                              |                  12.69 / 14.09 / 22.01 |       16.96 / 16.96 / 16.96 |
| First changed decoded GET                     |                  37.92 / 44.38 / 75.70 |       64.47 / 64.47 / 64.47 |
| SQL commit with command receipt               |                 82.75 / 79.07 / 135.85 |       81.98 / 81.98 / 81.98 |
| Covering flush acknowledged                   |            1097.88 / 1120.67 / 1370.86 | 2997.54 / 2997.54 / 2997.54 |

The runs retain two independent older-cut reads during each provider hold. The three-cycle case saves two replies around a cancellation without speech. The view-loss case withdraws its provisional preview and saves exactly one permitted late reply. Both use pinned Node 22.23.2, app `79f8839b61ad5845f151dd743faaf74bdfb4f109`, Native release `8096eb7c674174783316f8093f4ce50c88539fb5d61268f9a6949a140fa6d45c`, and the sealed held input manifest `c7e5cd27c14c8f4b89ecce4722d7e8401e815b0cf25271d44882d286b314d23d`. Additional and cumulative Jev spend is $0.

| Memory, MiB                                    | Three cycles |   View loss |
| ---------------------------------------------- | -----------: | ----------: |
| Peak sampled concurrent RSS and PostgreSQL RAM |       705.19 |      719.23 |
| Lifetime transient reservation peak            |        88.64 |       81.05 |
| Minimum transient headroom under 2 GiB         |      1959.36 |     1966.95 |
| Resident / pending-save reservation peaks      |  5.23 / 1.25 | 4.38 / 1.25 |
| Final unclassified transient reservations      |         8.78 |        3.53 |

The concurrent sample includes the main process, any descendants and exclusive PostgreSQL memory at the same instant. It can count shared pages more than once, and the roughly 100 ms cadence can miss shorter peaks. After the three fixed one-second normal-GC cycle settles, concurrent RAM is 661.90, 672.52 and 702.11 MiB. It falls to 576.07 MiB after provider and application close plus one second. View loss has 718.26 MiB at the fixed settle and 542.19 MiB after shutdown. These observations establish neither a stable floor nor a split between retained bodies and released wrapper headers. Both native hosts report `ShutdownPending` with zero jobs, resident and pending-save reservations. The applications exit cleanly and both disposable database cleanups pass.

The repeat and view-loss cases respectively observe 1,194 and 425 SQL calls, 982 and 287 returned rows, 1,385 and 619 prepared rows, 2,595,230 and 1,156,467 prepared bytes, and 2,921,632 and 1,156,920 bytes of WAL insert growth. Calls include overflow families (647 and 237), whose owners are unclassified. All 38 artifacts for campaign `6284bbb8-5a65-4dd6-80fc-10cb578c3850` are collected. The controller and EC2 confirm the temporary instance terminated. The $0.695149 hold settled at $0.215583 estimated usage, releasing $0.479566 with zero remaining held. These two named windows provide current memory, execution and cleanup evidence for two Native workers. Comparative timing requires matched repeated runs.
