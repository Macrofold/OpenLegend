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

## One participant

The adjacent serial and width-two revisions complete all six standard-worker observations of the one-player ordinary opening. Each accepts all 560 scheduled movements, delivers 539 changed-movement witnesses in the 360-second primary window, applies and persists both controlled conversations, and stops cleanly. The opening also contains two human NPCs, three hares and 1,246 scenery records. Both arms finish the drain with zero material debt. Values are median / arithmetic mean / nearest-rank p95. Whole-window and memory statistics use three observations per arm. Movement, command and durable latency pool 1,617 action witnesses per arm.

| Metric                                      |                      Serial |                   Width two |
| ------------------------------------------- | --------------------------: | --------------------------: |
| Server CPU, % of one core                   |       37.61 / 37.47 / 37.65 |       36.95 / 37.20 / 38.02 |
| Exclusive PostgreSQL CPU, % of one core     |          1.95 / 1.95 / 1.98 |          1.91 / 1.95 / 2.02 |
| Client CPU, % of one core                   |       0.795 / 0.795 / 0.798 |       0.792 / 0.793 / 0.803 |
| Combined CPU, % of one core                 |       40.34 / 40.22 / 40.40 |       39.67 / 39.94 / 40.84 |
| Achieved game speed, % of intended rate     | 100.002 / 100.000 / 100.004 |    99.994 / 99.994 / 99.998 |
| Complete CPU, ms per completed game-second  |       6.724 / 6.703 / 6.733 |       6.612 / 6.657 / 6.806 |
| HTTP command response, ms                   |       14.87 / 18.15 / 35.47 |       14.74 / 17.94 / 34.06 |
| First affected view receipt, ms             |       42.65 / 46.36 / 74.84 |       42.49 / 46.49 / 73.44 |
| First visible change sent to the player, ms |       61.36 / 62.34 / 96.19 |       62.82 / 62.78 / 94.03 |
| Command to durable acknowledgement, ms      |   551.14 / 551.87 / 1018.68 |   552.84 / 547.98 / 1019.97 |
| Sampled concurrent memory peak, MiB         | 1402.85 / 1401.87 / 1411.99 | 1404.04 / 1373.10 / 1420.73 |
| Lifetime transient reservation peak, MiB    |    315.17 / 307.54 / 315.50 |    270.48 / 275.42 / 311.73 |
| Whole waited combined CPU, seconds          | 159.659 / 159.181 / 159.728 | 157.758 / 158.380 / 161.412 |

Median SQL calls are 12,172 / 12,160, prepared rows 31,385 / 31,296, prepared payload bytes 58,353,312 / 57,982,295, WAL growth 41,773,304 / 41,524,768 bytes, and database growth 14,868,480 / 14,804,472 bytes. Per-run save-age p95 values are 975.50–977.05 / 974.67–978.51 ms. The complete CPU ranges overlap. This single-player cohort demonstrates ordinary gameplay at width two with no material response or durability regression. The separate crowded cohorts determine the scheduler's disposition. Managed campaign `034c0f46-16d0-4d70-9e29-32bdcd0ce414`.

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

## Twenty-five participants

Both arms finish all six matched cases. Each case admits 25 accounts and gives every move to all 24 distinct eligible observers. Each arm delivers 216 of 216 receipts across its three runs. Each action uses the fixed 15-second deadline, with the roster's three order variants and normal one-second saves. The larger opening retains two human NPCs, three hares and 1,246 scenery records. Hardware, source and independent database checks pass. This is the largest completed matched population in this batch.

Values are median / arithmetic mean / nearest-rank p95 across three primary windows or nine pooled movement actions per arm.

| Metric                                           |                      Serial |                   Width two |
| ------------------------------------------------ | --------------------------: | --------------------------: |
| Server CPU, % of one core                        |    105.47 / 105.57 / 105.80 |    108.36 / 108.21 / 108.40 |
| Exclusive PostgreSQL CPU, % of one core          |          4.52 / 4.52 / 4.56 |          4.34 / 4.32 / 4.36 |
| Client CPU, % of one core                        |          2.24 / 2.19 / 2.30 |          2.10 / 2.14 / 2.27 |
| Combined CPU, % of one core                      |    112.32 / 112.29 / 112.34 |    114.74 / 114.68 / 114.97 |
| Achieved game speed, % of intended rate          | 100.053 / 100.049 / 100.095 |   99.981 / 99.982 / 100.017 |
| Server and PostgreSQL CPU, ms per game-second    |    18.326 / 18.341 / 18.386 |    18.772 / 18.759 / 18.793 |
| First eligible observer receipt, ms              |    778.97 / 692.41 / 941.53 |    816.23 / 699.16 / 848.15 |
| Median eligible observer receipt, ms             | 1323.36 / 1392.40 / 1937.92 |  994.06 / 1053.50 / 1346.99 |
| Last eligible observer receipt, ms               | 1891.86 / 1951.29 / 2522.23 | 1698.89 / 1761.78 / 2322.33 |
| First-to-last observer spread, ms                | 1237.02 / 1258.88 / 1612.04 | 1059.42 / 1062.61 / 1502.84 |
| Mover receipt, ms                                |  874.07 / 1021.12 / 1677.00 | 1023.68 / 1071.78 / 1653.98 |
| HTTP response, ms                                |    171.96 / 174.00 / 456.25 |    175.69 / 165.10 / 339.20 |
| Server acceptance to durable acknowledgement, ms |   894.82 / 874.05 / 1682.59 | 1334.83 / 1148.13 / 1822.93 |
| Sampled concurrent memory peak, MiB              | 1547.63 / 1569.20 / 1622.42 | 1517.13 / 1525.96 / 1559.06 |
| Transient reservation peak, MiB                  |    635.48 / 612.30 / 636.61 |    643.36 / 644.44 / 670.06 |
| WAL growth, MiB                                  |       62.36 / 63.01 / 65.59 |       56.88 / 58.45 / 61.80 |
| Database growth, MiB                             |       32.27 / 32.02 / 32.97 |       24.06 / 26.19 / 32.34 |

The pooled last-observer p95 drops by 199.89 ms (7.93%). The maximum observed latency is lower in each matched insertion variant by 70.40, 148.34 and 611.69 ms. Each variant has one observation per arm. The two arms' results still overlap across variants. Server CPU rises and PostgreSQL CPU falls in each paired variant. Sampled concurrent memory has a lower median and overlapping ranges. Median server plus PostgreSQL CPU rises from 110.02% to 112.65% of one core, a 2.39% increase. Both finish near their intended advancement rate and end with no material debt. Median SQL calls are 1338 / 1313, returned rows 3110 / 3461, prepared rows 48544 / 47494, and prepared bytes 101,632,286 / 98,703,550. Managed campaign `7d818dff-6d0c-4990-8184-a6b742ca1aeb`.

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

## Ordinary-play bridge comparisons

The common workload runs 360 seconds after ten seconds of warmup at the authored 60× rate. One player, two human NPCs, three hares and 1,246 scenery records exercise walking, actual reactions, appearance and history, a permitted stream, two controlled NPC replies and ordinary persistence. Complete cases accept all 560 scheduled commands. The 539 commands within the measured window have visible movement evidence. Each cohort uses independently created databases and three repetitions per arm in A/B/B/A/B/A order. Interpret each comparison on its own worker and versioned inputs. The tables give median / arithmetic mean / nearest-rank p95 for whole windows and pooled command latencies.

| Experiment                                  | Managed campaign                       | Qualified control / candidate | Disposition                                                            |
| ------------------------------------------- | -------------------------------------- | ----------------------------: | ---------------------------------------------------------------------- |
| Funded byte answers                         | `09396128-005d-4bbf-8889-7a0fdfc8ae32` |                     3/3 / 2/3 | Inconclusive. Stale before dispatch in one candidate conversation.     |
| Native answer reservation transfer          | `06e9d298-1b78-4758-b935-4b66f769645a` |                     3/3 / 3/3 | Overlapping CPU ranges. Retain existing reservation ownership.         |
| Omit unused NPC snapshots                   | `bcaf4dc3-8ab4-4077-b7e1-7392f8d8c052` |                     2/3 / 2/3 | Inconclusive. Stale before dispatch in one conversation in each arm.   |
| Executable choices stay in Rust             | `1bb2c34f-f3c8-4d0a-8dc7-b48126894976` |                     3/3 / 3/3 | Overlapping CPU ranges. Retain the smaller executable-choice boundary. |
| Installed world selects choice wording      | `8819e293-4b5f-4031-b952-1e18920848c5` |                     3/3 / 3/3 | Overlapping CPU ranges. Retain authored wording ownership.             |
| Check NPC freshness without packet encoding | `890f3e2a-6e2f-466e-aa65-0f38657cff3b` |                     3/3 / 3/3 | Overlapping CPU ranges. Retain the narrower freshness check.           |
| Read compact NPC queue inputs directly      | `16569672-5cfb-4b75-abc0-5fa970d433be` |                     3/3 / 2/3 | Inconclusive. Stale before dispatch in one candidate conversation.     |

The four stale attempts complete movement and the final save. They each miss one required reply and do not enter a matched cohort statistic. The recurrence on an unchanged control and independent candidates does not identify one mechanism as its cause. In the first snapshot control, the second conversation reaches judging after revision 208, and exactly one accepted turn, cut 4670 at game second 12630, precedes the refusal and no scoped route transport. A local untimed replay of the same full ordinary schedule and second request passes. Its actual recognition and support changes occur before the next fence is captured. The managed trace lacks row and revision witnesses for the refusing turn. The identity of the changed dependency remains open.

The reservation-transfer candidate removes the second charge for the same owned allocation. Its complete median CPU is slightly higher in this ordinary cohort, with overlap at the edge of the observed ranges. The separate recovery and ownership evidence still controls the retained behavior. Fewer serialized products or charged bytes are distinct from lower total CPU or RAM.

### Native answer reservation transfer

| Metric                                                |                     Control |                   Candidate |
| ----------------------------------------------------- | --------------------------: | --------------------------: |
| Server CPU, % of one core                             |       38.15 / 38.27 / 38.60 |       38.89 / 38.92 / 39.26 |
| Exclusive PostgreSQL CPU, % of one core               |          1.84 / 1.84 / 1.86 |          1.83 / 1.83 / 1.85 |
| Client CPU, % of one core                             |          0.94 / 0.93 / 0.94 |          0.93 / 0.94 / 0.97 |
| Server + PostgreSQL CPU, % of one core                |       39.97 / 40.11 / 40.45 |       40.72 / 40.75 / 41.10 |
| Complete CPU with client, % of one core               |       40.91 / 41.04 / 41.39 |       41.65 / 41.69 / 42.04 |
| Achieved game speed, % of intended rate               | 100.005 / 100.004 / 100.005 | 100.002 / 100.003 / 100.009 |
| Server + PostgreSQL CPU, ms per completed game-second |          6.66 / 6.68 / 6.74 |          6.79 / 6.79 / 6.85 |
| HTTP command response, ms                             |       15.77 / 18.78 / 34.70 |       15.81 / 18.59 / 36.03 |
| First affected view, ms                               |       44.70 / 47.13 / 75.62 |       44.98 / 47.86 / 74.84 |
| First changed movement, ms                            |       62.31 / 63.25 / 98.86 |       59.48 / 61.61 / 96.31 |
| Command to durable acknowledgement, ms                |   550.21 / 548.80 / 1016.13 |   545.86 / 540.42 / 1016.33 |
| Sampled unsaved age, ms                               |    510.49 / 511.90 / 978.25 |    508.53 / 510.76 / 975.88 |
| Save capture, ms                                      |          0.58 / 0.68 / 1.20 |          0.59 / 0.68 / 1.18 |
| Save repository phase, ms                             |       15.38 / 15.69 / 23.01 |       15.57 / 15.87 / 23.51 |
| Save acknowledgement, ms                              |          1.09 / 1.24 / 2.07 |          1.09 / 1.31 / 2.19 |

Server + PostgreSQL CPU ranges across runs are 39.91–40.45% and 40.41–41.10% of one core. Median change +1.89%.

### Executable choices stay in Rust

| Metric                                                |                    Control |                   Candidate |
| ----------------------------------------------------- | -------------------------: | --------------------------: |
| Server CPU, % of one core                             |      43.68 / 43.35 / 44.87 |       42.05 / 42.40 / 43.81 |
| Exclusive PostgreSQL CPU, % of one core               |         2.05 / 2.06 / 2.13 |          2.08 / 2.06 / 2.10 |
| Client CPU, % of one core                             |         1.05 / 1.03 / 1.05 |          1.03 / 1.01 / 1.06 |
| Server + PostgreSQL CPU, % of one core                |      45.74 / 45.41 / 46.99 |       44.13 / 44.47 / 45.91 |
| Complete CPU with client, % of one core               |      46.78 / 46.44 / 48.05 |       45.15 / 45.48 / 46.96 |
| Achieved game speed, % of intended rate               | 100.002 / 99.999 / 100.002 | 100.000 / 100.000 / 100.004 |
| Server + PostgreSQL CPU, ms per completed game-second |         7.62 / 7.57 / 7.83 |          7.35 / 7.41 / 7.65 |
| HTTP command response, ms                             |      16.93 / 20.49 / 40.54 |       16.67 / 20.35 / 39.96 |
| First affected view, ms                               |      48.62 / 51.85 / 78.16 |       49.24 / 51.87 / 77.72 |
| First changed movement, ms                            |      60.83 / 64.02 / 94.82 |      61.04 / 64.05 / 100.80 |
| Command to durable acknowledgement, ms                |  553.22 / 550.69 / 1017.65 |   553.41 / 548.58 / 1012.38 |
| Sampled unsaved age, ms                               |   512.89 / 512.81 / 979.18 |    510.76 / 513.64 / 980.76 |
| Save capture, ms                                      |         0.66 / 0.75 / 1.39 |          0.65 / 0.77 / 1.39 |
| Save repository phase, ms                             |      16.98 / 17.60 / 25.57 |       16.58 / 16.92 / 25.52 |
| Save acknowledgement, ms                              |         1.20 / 1.42 / 2.37 |          1.17 / 1.38 / 2.22 |

Server + PostgreSQL CPU ranges across runs are 43.50–46.99% and 43.36–45.91% of one core. Median change -3.52%.

### Installed world selects choice wording

| Metric                                                |                   Control |                 Candidate |
| ----------------------------------------------------- | ------------------------: | ------------------------: |
| Server CPU, % of one core                             |     34.16 / 34.23 / 34.63 |     33.24 / 33.72 / 34.98 |
| Exclusive PostgreSQL CPU, % of one core               |        1.74 / 1.74 / 1.76 |        1.67 / 1.70 / 1.75 |
| Client CPU, % of one core                             |        0.77 / 0.77 / 0.79 |        0.71 / 0.73 / 0.77 |
| Server + PostgreSQL CPU, % of one core                |     35.90 / 35.97 / 36.34 |     34.90 / 35.42 / 36.73 |
| Complete CPU with client, % of one core               |     36.67 / 36.74 / 37.13 |     35.62 / 36.15 / 37.50 |
| Achieved game speed, % of intended rate               | 99.996 / 99.997 / 100.000 | 99.994 / 99.999 / 100.011 |
| Server + PostgreSQL CPU, ms per completed game-second |        5.98 / 5.99 / 6.06 |        5.82 / 5.90 / 6.12 |
| HTTP command response, ms                             |     14.07 / 16.55 / 30.14 |     13.68 / 15.76 / 28.74 |
| First affected view, ms                               |     41.98 / 44.67 / 71.69 |     41.13 / 43.47 / 69.80 |
| First changed movement, ms                            |     61.60 / 61.32 / 95.46 |     59.48 / 59.24 / 92.32 |
| Command to durable acknowledgement, ms                | 545.89 / 539.39 / 1006.64 | 541.76 / 543.05 / 1010.73 |
| Sampled unsaved age, ms                               |  505.86 / 510.82 / 975.12 |  506.01 / 512.81 / 977.85 |
| Save capture, ms                                      |        0.50 / 0.56 / 0.93 |        0.48 / 0.56 / 0.99 |
| Save repository phase, ms                             |     15.24 / 15.34 / 21.88 |     14.80 / 14.95 / 21.87 |
| Save acknowledgement, ms                              |        0.96 / 1.09 / 1.78 |        0.85 / 1.03 / 1.62 |

Server + PostgreSQL CPU ranges across runs are 35.65–36.34% and 34.61–36.73% of one core. Median change -2.78%.

### Check NPC freshness without packet encoding

| Metric                                                |                     Control |                  Candidate |
| ----------------------------------------------------- | --------------------------: | -------------------------: |
| Server CPU, % of one core                             |       42.44 / 42.84 / 43.80 |      42.71 / 42.92 / 43.52 |
| Exclusive PostgreSQL CPU, % of one core               |          1.98 / 2.01 / 2.08 |         2.00 / 1.97 / 2.03 |
| Client CPU, % of one core                             |          1.03 / 1.03 / 1.04 |         1.03 / 1.03 / 1.05 |
| Server + PostgreSQL CPU, % of one core                |       44.40 / 44.85 / 45.88 |      44.59 / 44.89 / 45.52 |
| Complete CPU with client, % of one core               |       45.43 / 45.88 / 46.92 |      45.61 / 45.92 / 46.56 |
| Achieved game speed, % of intended rate               | 100.007 / 100.005 / 100.009 | 99.999 / 100.000 / 100.007 |
| Server + PostgreSQL CPU, ms per completed game-second |          7.40 / 7.47 / 7.65 |         7.43 / 7.48 / 7.59 |
| HTTP command response, ms                             |       17.14 / 20.77 / 41.11 |      17.39 / 21.12 / 40.82 |
| First affected view, ms                               |       48.39 / 50.97 / 79.12 |      48.84 / 51.93 / 78.23 |
| First changed movement, ms                            |       62.28 / 64.43 / 99.83 |     63.08 / 64.93 / 101.12 |
| Command to durable acknowledgement, ms                |   555.59 / 550.82 / 1021.35 |  557.27 / 552.52 / 1024.19 |
| Sampled unsaved age, ms                               |    512.91 / 513.31 / 980.39 |   513.56 / 514.31 / 979.85 |
| Save capture, ms                                      |          0.68 / 0.77 / 1.41 |         0.69 / 0.79 / 1.41 |
| Save repository phase, ms                             |       16.81 / 17.18 / 25.51 |      16.76 / 17.01 / 25.49 |
| Save acknowledgement, ms                              |          1.23 / 1.49 / 2.25 |         1.25 / 1.45 / 2.36 |

Server + PostgreSQL CPU ranges across runs are 44.27–45.88% and 44.57–45.52% of one core. Median change +0.42%.

### Ordinary database and memory observations

Values are control / candidate medians across three equivalent primary windows. Prepared bytes count actual shared-writer JSON. WAL uses the insert-log sequence change. Concurrent memory is a sampled nonunique application/client RSS and PostgreSQL sum. Transient budgets are accounted separately.

| Experiment                                  |       SQL calls |   Returned rows |   Prepared rows |  Prepared MiB |       WAL MiB | Database growth MiB | Concurrent memory MiB | Transient reserve MiB |
| ------------------------------------------- | --------------: | --------------: | --------------: | ------------: | ------------: | ------------------: | --------------------: | --------------------: |
| Native answer reservation transfer          | 12,177 / 12,013 | 13,464 / 13,387 | 31,233 / 31,433 | 55.13 / 55.58 | 38.79 / 38.95 |       14.04 / 13.98 |   1,393.88 / 1,376.28 |       284.60 / 286.14 |
| Executable choices stay in Rust             | 12,160 / 12,176 | 13,202 / 13,443 | 31,203 / 31,406 | 55.02 / 55.93 | 39.40 / 38.92 |       13.96 / 14.30 |   1,450.91 / 1,491.15 |       287.53 / 287.86 |
| Installed world selects choice wording      | 11,986 / 11,846 | 13,255 / 12,859 | 31,469 / 31,460 | 55.49 / 55.38 | 39.17 / 39.01 |       14.21 / 14.16 |   1,349.89 / 1,421.88 |       294.08 / 279.78 |
| Check NPC freshness without packet encoding | 12,245 / 12,137 | 13,736 / 13,205 | 31,320 / 31,114 | 55.70 / 54.82 | 39.90 / 38.49 |       14.12 / 14.09 |   1,420.03 / 1,387.99 |       285.49 / 291.68 |

Across these four qualified cohorts the paired observations end essentially debt-free. Completed and offered game time, each case's latency and phase spread, SQL/bytes, unclassified shutdown custody, startup and full process accounting remain in the separately collected case records. Startup, the steady window and the whole service envelope overlap differently and are never added together.
