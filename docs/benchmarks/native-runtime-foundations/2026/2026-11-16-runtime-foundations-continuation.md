# Native runtime foundations continuation — November 16, 2026

The [maintainer tracker](../../../maintainers/native-runtime-foundations.md#continuation-caller-checkpoints--november-15-2026) identifies the exact implementation and local caller evidence for each experiment. Every managed comparison has its own standard 16 GiB AWS worker and independent PostgreSQL cases, one native simulation worker, a 2 GiB transient budget, one-second ordinary background saves and normal garbage collection. Controlled HTTPS model traffic costs $0 in this continuation and cumulatively for this task.

## Selected remembered-note comparisons

The snapshot experiment measures `ee9192b8a…` against `16db376b8…`. The recall experiment starts at `16db376b8…` and changes only note refresh at `5de38ef8c…`. Each has three completed observations per arm, interleaved A/B/B/A/B/A. Matching source catalogs, runtime, SDK, plan and input, standard machine and independent PostgreSQL verification pass. The workload uses one player, two human NPCs, three hares and 1,246 scenery records. Each case offers the same document and typed requests, edits the note, applies a reply, observes the covering ordinary save, opens a fresh world and repository and continues to the same durable game second. The warm request advances zero game seconds with zero debt. Achieved game speed and CPU per game-second are inapplicable to that paused window.

Values are median / arithmetic mean / nearest-rank p95 for three runs. The complete envelope includes startup, the ordinary save window, reopening and shutdown. Its process CPU includes any waited children, including fixture transport. The warm server reading is the application process. Exclusive PostgreSQL is separate. Concurrent memory samples combine nonunique RSS and PostgreSQL memory. Each reservation has its own owner and units.

| Metric                                      |               Snapshot A |               Snapshot B |                 Recall A |                 Recall B |
| ------------------------------------------- | -----------------------: | -----------------------: | -----------------------: | -----------------------: |
| Server with waited children, % of one core  |    52.19 / 51.57 / 53.02 |    51.44 / 51.00 / 53.34 |    52.51 / 53.30 / 55.03 |    54.76 / 53.22 / 55.14 |
| Exclusive PostgreSQL, % of one core         |       7.47 / 7.36 / 7.50 |       7.24 / 7.26 / 7.66 |       7.87 / 7.84 / 7.95 |       8.06 / 7.85 / 8.12 |
| Combined CPU, % of one core                 |    59.69 / 58.93 / 60.49 |    58.68 / 58.26 / 61.01 |    60.24 / 61.14 / 62.98 |    62.82 / 61.07 / 63.26 |
| Combined CPU, seconds per complete case     | 11.432 / 11.405 / 11.483 | 11.344 / 11.404 / 11.540 | 12.262 / 12.286 / 12.451 | 12.299 / 12.305 / 12.343 |
| Warm server, % of one core                  |    36.09 / 36.30 / 39.09 |    38.82 / 36.81 / 40.04 |    37.35 / 38.89 / 43.73 |    40.62 / 39.76 / 41.50 |
| Warm exclusive PostgreSQL, % of one core    |       8.07 / 8.16 / 8.44 |       8.18 / 7.66 / 8.22 |       8.79 / 8.82 / 8.87 |       8.86 / 8.92 / 9.12 |
| Warm request to completed job, ms           | 1442.2 / 1442.6 / 1453.5 | 1493.3 / 1687.9 / 2089.7 | 1497.7 / 1486.8 / 1519.0 | 1497.0 / 1500.4 / 1512.8 |
| Warm request to durable acknowledgement, ms | 2463.5 / 2461.5 / 2478.4 | 2519.3 / 2713.3 / 3114.3 | 2521.0 / 2508.1 / 2536.7 | 2518.8 / 2518.7 / 2538.0 |
| Warm SQL calls                              |    355.0 / 352.0 / 355.0 |    356.0 / 368.7 / 394.0 |    356.0 / 356.0 / 358.0 |    356.0 / 356.0 / 357.0 |
| Warm SQL rows returned                      |    232.0 / 230.7 / 232.0 |    233.0 / 243.7 / 265.0 |    233.0 / 233.0 / 235.0 |    233.0 / 233.0 / 234.0 |
| Warm prepared rows                          |          146 / 146 / 146 |          146 / 146 / 146 |          146 / 146 / 146 |          146 / 146 / 146 |
| Warm prepared bytes                         | 227659 / 227659 / 227659 | 227659 / 227659 / 227659 | 227659 / 227659 / 227659 | 227659 / 227659 / 227659 |
| Warm WAL growth, MiB                        |    0.587 / 0.581 / 0.588 |    0.588 / 0.596 / 0.613 |    0.569 / 0.575 / 0.588 |    0.588 / 0.588 / 0.588 |
| Warm database growth, MiB                   |    1.383 / 1.388 / 1.398 |    1.398 / 1.406 / 1.422 |    1.383 / 1.388 / 1.398 |    1.398 / 1.398 / 1.398 |
| Sampled concurrent memory peak, MiB         | 620.17 / 614.89 / 635.04 | 627.68 / 625.16 / 632.11 | 618.47 / 622.89 / 633.09 | 621.10 / 617.54 / 634.49 |
| Transient reservation peak, MiB             |    60.19 / 60.18 / 60.19 |    58.80 / 59.09 / 59.69 |    59.70 / 59.70 / 59.72 |    59.46 / 59.45 / 59.49 |
| Resident reservation peak, MiB              |       3.42 / 3.42 / 3.42 |       3.42 / 3.42 / 3.42 |       3.42 / 3.42 / 3.42 |       3.42 / 3.42 / 3.42 |
| Pending-save reservation peak, MiB          |       0.48 / 0.48 / 0.48 |       0.48 / 0.48 / 0.48 |       0.48 / 0.48 / 0.48 |       0.48 / 0.48 / 0.48 |
| Final unclassified transient, MiB           |       5.70 / 5.63 / 5.71 |       5.65 / 5.63 / 5.68 |       5.54 / 5.58 / 5.70 |       5.57 / 5.59 / 5.70 |

Complete combined CPU ranges overlap in both comparisons. The snapshot control spans 11.299–11.483 seconds and the candidate 11.327–11.540. The recall control spans 12.144–12.451 and the candidate 12.274–12.343. Both show lower transient reservation peaks, while sampled physical memory ranges overlap. The snapshot candidate has higher warm request and durable-acknowledgement times in the three recorded cases. The latest acknowledgement adds about 0.64 seconds at p95. The measured save cadence, query totals and CPU spread leave that difference unattributed. The separate recall experiment has similar warm latency and identical prepared rows and bytes. Neither establishes an end-to-end CPU improvement. Structural results remain separate from these measurements.

The managed snapshot campaign is `6d9363d5-69f2-43b7-b2ca-430bdb2a6418` and the recall campaign is `72799c7c-9571-4fe2-9ecd-9615adf75010`. The exact local and managed cases are separate.

## Two participants

The serial and width-two arms each complete all three repetitions, with three moves per run and one distinct eligible observer for each move. Both deliver all nine expected receipts. The six checks verify exact revisions `ee9192b8a…` and `8ff939b3b…`, independent owned PostgreSQL cases, matching standard-worker environment, accepted actions, streams, ordinary saves and shutdown. The opening has two player accounts, two human NPCs, three hares and 1,246 scenery records. The separate single-participant case exercises the two controlled conversations on the ordinary opening. The held-reply cognition comparison and actual browser display remain separate functional evidence.

Values are median / arithmetic mean / nearest-rank p95. CPU, speed and memory use three complete primary windows per arm. Receipt, command and durability samples pool nine witnessed moves per arm. First, middle and last eligible observer receipt are identical here because each move has one expected observer.

| Metric                                           |                      Serial |                 Width two |
| ------------------------------------------------ | --------------------------: | ------------------------: |
| Server CPU, % of one core                        |       29.77 / 29.63 / 31.45 |     30.40 / 30.14 / 30.45 |
| Exclusive PostgreSQL CPU, % of one core          |          0.88 / 0.86 / 0.89 |        0.89 / 0.88 / 0.92 |
| Client CPU, % of one core                        |          0.98 / 1.05 / 1.19 |        0.95 / 0.97 / 1.07 |
| Combined CPU, % of one core                      |       31.56 / 31.54 / 33.53 |     32.23 / 31.99 / 32.27 |
| Achieved game speed, % of intended rate          | 100.027 / 100.006 / 100.043 |  99.987 / 99.980 / 99.990 |
| Server and PostgreSQL CPU, ms per game-second    |       5.099 / 5.082 / 5.388 |     5.221 / 5.171 / 5.224 |
| Last eligible observer receipt, ms               |    528.53 / 439.25 / 572.77 |  542.98 / 386.88 / 561.24 |
| Mover receipt, ms                                |       54.02 / 49.27 / 73.94 |     59.03 / 56.40 / 68.95 |
| HTTP response, ms                                |       15.41 / 16.88 / 31.18 |     16.01 / 15.85 / 24.92 |
| Server acceptance to durable acknowledgement, ms |    500.32 / 472.88 / 972.18 | 628.02 / 689.78 / 1050.72 |
| Sampled concurrent memory peak, MiB              |    719.39 / 756.86 / 861.15 |  695.00 / 730.50 / 819.02 |
| Transient reservation peak, MiB                  |      46.06 / 65.03 / 103.03 |     55.44 / 64.91 / 85.64 |
| WAL growth, MiB                                  |          5.67 / 5.73 / 5.89 |        6.20 / 6.17 / 6.64 |
| Database growth, MiB                             |          2.18 / 2.29 / 2.52 |        2.38 / 2.30 / 2.39 |

Last eligible receipt spans 57.38–572.77 ms in serial and 58.61–561.24 ms at width two. The 11.52 ms lower pooled p95 coexists with a 14.44 ms higher median and overlapping CPU and memory ranges. Both finish each window without material debt. Median SQL calls are 476 / 476, returned rows 350 / 353, prepared rows 5930 / 5914, and prepared bytes 10,784,796 / 10,920,082. This cohort establishes no repeatable last-observer improvement. Managed campaign `4f5b26c5-5403-4179-9bb9-58f7be146ab4`.

## Dense multiplayer capacity

All 50 distinct accounts in each first attempt completed permitted initial views. For the first move at the fixed 15-second deadline, serial delivered **24 of 49** eligible observer receipts and width two delivered **43 of 49**. The remaining scheduled moves were not offered after that failure. The last observed receipt among delivered messages arrived at 14,191 ms and 14,139 ms respectively. These values describe incomplete distributions. Neither arm has a last-eligible receipt or a qualified p95. During the observed partial window the serial world completed 600 of 1,021.57 offered game-seconds and ended with 657.03 seconds of debt. Width two completed 559.45 of 1,060.87 and ended with 715.15 seconds of debt. Peak transient reservations were 1.25 and 1.28 GiB. Both applications and databases cleaned up. The controller had already started a third case when the comparison stopped under its frozen completeness rule. The later cases remained unopened.

Campaign `3fad3ac5-7eca-4050-9ac4-7c4ee9e91cc6` retains both failures, the cancellation and the unstarted slots. The verified capacity result is a delivery failure at 50 for both exact revisions. The separate 25-participant bracket preserves the first 24 eligible observer placements and three original command legs. It has its own timing and completion criteria.

## Provider answer phase attribution

This separate managed diagnostic uses current reservation-transfer Native source `feb3a34b…` and TypeScript observer `8a901e318…`. It completes the 100-second steady window after ten seconds of warmup, 40 movement commands, 1,988 permitted post-warmup views, both controlled replies and the final save. It completes 6,002.40 game-seconds during the 99.996-second steady window and ends with floating-point-only debt. The observer records 9,780 answer calls across the process and 7,348 fully contained in steady play, or about 1.22 per completed game-second. It records one funded outgoing encode for each returned answer and no omitted observations.

Across contained calls, funded encoding takes **381.18 ms** summed synchronous elapsed time. Actual geometry or scoped PostgreSQL supply calls take **1,093.08 ms** summed elapsed time. The total for their enclosing answer steps is **1,834.13 ms**. Producer time includes waits and can overlap other answers. These totals are per-answer elapsed observations, with no CPU or critical-path interpretation. Native copying/parsing/resume, external HTTPS and the special rewind-retention formatter are separate owners outside these measurements. No change to application behavior is measured by this diagnostic.

| Real producer               | Answers | Output bytes | Supply median / mean / p95, ms | Packaging median / mean / p95, ms |
| --------------------------- | ------: | -----------: | -----------------------------: | --------------------------------: |
| Geometry                    |   5,944 |    9,029,853 |          0.073 / 0.095 / 0.217 |             0.028 / 0.056 / 0.265 |
| Scoped source rows          |      57 |      827,744 |         6.224 / 8.244 / 28.463 |             0.190 / 0.257 / 0.649 |
| Recent history for activity |       4 |        6,918 |          2.800 / 3.057 / 4.088 |             0.073 / 0.076 / 0.088 |
| Source-version check        |       4 |          460 |          1.698 / 1.712 / 2.180 |             0.034 / 0.034 / 0.037 |
| Support membership          |       7 |          750 |          4.688 / 5.312 / 7.780 |             0.041 / 0.042 / 0.047 |

The diagnostic phase extractor uses interpolated p95 per producer. Complete-gameplay comparisons use the reporting contract's nearest-rank p95. Geometry contributes 330.00 ms of summed packaging elapsed time. Scoped source and supporting SQL producers spend much more elapsed time obtaining their inputs than encoding them. This does not support another packaging redesign without an attributable end-to-end result.

The original managed job was cancelled after inherited artifact names were discovered. Corrected campaign `e795c631-19ce-4fa6-b4bb-2f102e84d86c` passes the actual gameplay checker and cleans the case process and database. Its last reduction step fails because it looks for a nonexistent refusal counter. The offline successor reads the sealed original command records and requires every one to have been accepted with no skipped slot or stream error. It then verifies the unchanged timing trace and all existing phase boundaries. The managed failure remains recorded. No additional timing run is substituted.
