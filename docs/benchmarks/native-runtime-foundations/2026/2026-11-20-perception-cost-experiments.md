# Reducing perception and player-view work — November 20, 2026

The [CPU profile](2026-11-20-stand-alone-cpu-profile.md) found that perception and attention accounted for 38.5% of sampled stand-alone server CPU. This batch tests three changes separately. Keeping fewer optional details is an authored-world choice. The other two changes preserve gameplay.

## What changed

| Experiment                           | Control and candidate                                                                                                                                                                                                                                         | Expected outcome                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repeated perception and history work | `28fb13b86f5f61c735e7c17a8457c1f74f9aa20b` → `16ece4c5267982592c5d01ed2f6bcfcf386813dc`                                                                                                                                                                       | Detail-only sight uses the exact due subjects and keeps the broad query's bounds, order, detector and loss handling. Attention deadlines use a minimum over borrowed anchors and existing latch records. The Rust history path omits the directory copy its SQL writer never consumes. Unchanged plain warnings and scan records keep their existing positions without sizing and encoding identical bodies. |
| Bystander attention                  | One executable at `7bd81a8f0d2548473cff4322c358f641ce18276a`; installed Base setting absent → one spare ordinary cue per human NPC. The local source variant `bc003447e547d3c47a0e6233096a6d36c4b8daf8` changes that single setting for the functional trial. | Residents keep broad sight and hearing, discovery, direct involvement, current work, explicit focus, urgency and self warnings. A resident working beside a road can still notice someone pass or hear them speak. They track less ordinary detail about multiple passersby. This reduces detailed sensing and recording together. Player attention and animal rules are unchanged.                          |
| Player display reads                 | `7bd81a8f0d2548473cff4322c358f641ce18276a` → `fc6c6163691357d7aebfc0820d344c9525504d05`                                                                                                                                                                       | Read preferences, narration metadata, recent jobs and usage in one operational read transaction. The SQL bodies, later permitted reply-label read, final publication check and separate spending admission stay in place. One reader now holds the connection across both sets of queries. Measure latency as well as transaction count.                                                                     |

The bystander setting caps only spare ordinary cues. Urgent cues and ordinary cues share a stored label. A count of all rows with that label alone cannot prove the cap worked.

## Focused verification

- The disposable detailed-subject comparison matched original candidate identities and order in 147,456 cases. It covered missing or retired targets, negative cells, altitude, cell-edge movement, restoration and exact temporary-capacity refusals. It exercised the selector, independently of the ordinary gameplay runs.
- In an authored TypeScript 26-actor scenario with real attempted speech and 60 game seconds of advancement, resident detail entries fell from 97 to 20 and retained observation changes from 1,161 to 309. Broad lists and natural loss, player detail, both active close-range warnings, the physical audience and exact addressed words were preserved. Optional distant partial-word fragments can vary with actual event identities.
- The local Rust trial used the actual packaged world. Both installed definition copies contained the setting, and all ten residents persisted the corresponding attention policy. The 180-second journey completed 34 visible and durable walks, both steering sequences and both controlled, saved replies. The ten residents held 20 detailed entries and 10,449 retained observations at the end. The preceding local control completed the same required work with 97 entries and 24,486 retained observations. Background animal and NPC activity can vary in these runs. These are descriptive work counts. The active trial also reopened the same database cold, authenticated a new tab, continued the clock, moved to a previously verified destination and returned the same action on duplicate command submission. The ten resident policies remained present.
- A separate local stand-alone trial exercised ordinary speech via the real chat route, a permitted live stream, two independently persisted witness accounts, protected forgetting and cold reopening. The player no longer received the withdrawn speech after the stream reset or reopening. The shared original and the two independent witnesses stayed byte-identical. Shutdown returned transient, resident and pending-save reservations to zero. This passed with both the stock and enabled bystander policies. The enabled result SHA-256 is `5331ab2e3a63ecb127f4f04ed07755b8aada1b02c35df966dd1709aef4aae52b`.
- The player display change completed the same local 34 walks and both saved conversations in the normal authenticated application. In a separate fixed-state caller check, each version served 20 authenticated state reads from independent copies of the same paused database. The profile, AI display and clock values matched exactly. The SQL wire observer counted 240 → 200 completed statements, 120 → 80 simple statements and 120 extended executions in each arm. Both versions received 360 data rows. This verifies one fewer transaction per view; it is a statement-count check and supplies no speed evidence.
- With the three changes integrated and the Base setting enabled, the local release completed all 34 visible and durable walks, both steering sequences and both saved replies. All ten NPCs kept the selected policy. Fresh authentication after shutdown reopened the same database, advanced the clock and displayed a new move. Repeating its command ID returned the original action. The integrated run result SHA-256 is `b506abce1e2d11c7389dbe7e1bda8294780e921ef510708c9f8299904efe81b7`.
- The first local workload set the bystander rule in the fixture process while the separate release builder still loaded stock definitions. It counted as a control rather than an activated trial. The corrected fixture explicitly checks the installed policy. Other preserved setup failures were a too-long local PostgreSQL socket path, using a command endpoint for speech, and an unverified cold-walk destination. Fresh owned database checks with the real chat endpoint and a previously accepted destination passed.

The Mac release used for the initial attention and privacy checks has SHA-256 `0a316a6fdb05beefb601883cfcdd92769261a192cee3e789c2575fd0f7e80317`. The integrated rerun used the repaired display-read release, SHA-256 `1f6d228354916c0977e84bb0a70c6d8aea19677a191a319d6014f399616e5576`, with the installed Base setting enabled. Privacy evidence was collected in the private `perception-privacy-20261120.a5bc9jn1` directory, manifest SHA-256 `169deb64174b4d0eb0d86bebd76a024b81b6fe7de211c29dbc4fd10dca53dd6e`. The other disposable fixtures and outputs are in the private `perception-cost-20261120.xJ8EXnWn` directory. Local correctness durations do not measure performance.

## Repeated perception and history work result

**Keep the four gameplay-preserving changes.** All six runs completed their 34 visible and durable walks, both steering sequences and both saved conversations. The optional bystander setting was absent in every run. Combined median CPU per completed game-second fell 14.5%. The paired differences were −20.2%, −13.4% and −8.7%. The largest candidate value, 12.33 ms, was below the smallest control value, 13.32 ms. Three repeats support the result for the bundle on this workload. They do not separate the four changes' contributions.

| Measure                                          | Control median / mean / p95 | Candidate median / mean / p95 |
| ------------------------------------------------ | --------------------------: | ----------------------------: |
| Server CPU (% of one logical core)               |       76.29 / 75.43 / 79.07 |         64.02 / 63.73 / 65.29 |
| PostgreSQL CPU (% of one logical core)           |          9.07 / 9.16 / 9.39 |            8.70 / 8.78 / 8.99 |
| Achieved game speed (% of intended)              |    100.00 / 100.00 / 100.03 |      100.00 / 100.00 / 100.03 |
| Client CPU (% of one logical core)               |          0.84 / 0.84 / 0.84 |            0.86 / 0.86 / 0.87 |
| Harness CPU (% of one logical core)              |          1.52 / 1.53 / 1.56 |            1.38 / 1.39 / 1.43 |
| Combined CPU (ms per completed game-second)      |       14.23 / 14.10 / 14.74 |         12.16 / 12.09 / 12.33 |
| Command response (ms)                            |       12.19 / 18.33 / 56.88 |          6.87 / 12.56 / 73.97 |
| First changed position received (ms)             |      56.95 / 76.23 / 184.36 |        59.54 / 65.11 / 148.58 |
| First observed durable receipt (ms)              |   672.28 / 644.19 / 1116.81 |     676.98 / 650.58 / 1108.34 |
| Concurrent server and database memory peak (MiB) |    802.12 / 811.52 / 842.92 |      795.52 / 783.52 / 799.10 |
| Transient reservation peak (MiB)                 |    442.11 / 457.24 / 527.93 |      409.72 / 428.62 / 481.80 |
| Resident reservation peak (MiB)                  |    198.82 / 199.54 / 205.40 |      195.55 / 194.87 / 196.36 |
| Pending-save reservation peak (MiB)              |       12.65 / 12.65 / 12.66 |         12.73 / 12.70 / 12.79 |
| Database growth (MB)                             |       63.00 / 62.01 / 65.06 |         56.43 / 56.44 / 58.41 |
| WAL (MB)                                         |    154.21 / 151.24 / 161.50 |      143.84 / 142.52 / 146.13 |

Each window offered 10,800 game seconds. The control completed 10,795.97–10,802.97 and the candidate 10,797.03–10,803.01 as observed on the permitted stream. Paired differences were at most 1.06 game seconds. Internal clock debt was unavailable. Across 96 steady walks per arm, command response had a faster median and higher p95. The p99 was 109.65 → 113.89 ms. Movement receipt had a similar median and shorter slow waits, with p99 324.38 → 229.08 ms. This measures receipt before browser rendering. Ordinary durability remained near the one-second schedule.

The offered actions, opening and required outcomes matched. Optional game work still varied. The candidate delivered more median stream frames (2,672 → 2,823), with fewer median background judgment calls (398 → 310), animal placement changes (6,626 → 5,652), and retained resident observation receipts (24,771 → 23,502). Resident detailed entry counts were similar (96 → 93). The controller verified all 71 sealed files on generation 31. The source and six exact release executable receipts are in the private reduction, SHA-256 `f48119430081b40a820c899d9bb5e2b6bbd7b5aec9d8332be25b47cf73948499`.

## Bystander attention result

**Adopt the Base setting.** All six replays completed full gameplay on the same executable. The configured policy was verified in the installed definitions and the persisted entries of all ten human NPCs. The combined CPU reduction was 14.6% by arm medians and 16.7%, 20.4%, and 14.6% in the three matched pairs. The observed clock differed by no more than 3.09 game seconds per pair. Neither player observations nor mandatory gameplay was excluded. Median NPC detailed entries at shutdown fell from 94 to 20. Median resident retained observation receipts fell from 21,724 to 10,970. The candidate had more median wildlife placement changes, and optional judgment counts varied in both arms.

| Measure                                          | Control median / mean / p95 | Candidate median / mean / p95 |
| ------------------------------------------------ | --------------------------: | ----------------------------: |
| Server CPU (% of one logical core)               |       56.83 / 57.61 / 59.41 |         47.22 / 46.48 / 48.32 |
| PostgreSQL CPU (% of one logical core)           |          8.28 / 8.27 / 8.50 |            8.15 / 8.04 / 8.21 |
| Achieved game speed (% of intended)              |    100.00 / 100.01 / 100.03 |      100.00 / 100.00 / 100.03 |
| Client CPU (% of one logical core)               |          0.72 / 0.74 / 0.78 |            0.73 / 0.73 / 0.76 |
| Combined CPU (ms per completed game-second)      |       10.81 / 10.98 / 11.32 |            9.23 / 9.09 / 9.42 |
| Command response (ms)                            |         5.90 / 8.22 / 25.25 |           6.98 / 7.83 / 13.39 |
| First changed position received (ms)             |      44.32 / 50.11 / 117.17 |         63.04 / 57.68 / 90.34 |
| First observed durable receipt (ms)              |   554.51 / 560.38 / 1070.60 |     582.46 / 584.21 / 1066.07 |
| Concurrent server and database memory peak (MiB) | 1081.83 / 1027.60 / 1170.97 |     900.79 / 968.70 / 1155.97 |
| Transient reservation peak (MiB)                 |    439.66 / 461.56 / 517.85 |      308.11 / 313.30 / 327.29 |
| Resident reservation peak (MiB)                  |    190.32 / 191.66 / 194.81 |      174.28 / 174.03 / 175.85 |
| Pending-save reservation peak (MiB)              |       12.63 / 12.68 / 12.80 |            9.09 / 9.11 / 9.17 |
| Database growth (MB)                             |       55.22 / 56.83 / 60.28 |         36.96 / 37.55 / 39.18 |
| WAL (MB)                                         |    139.64 / 143.86 / 153.29 |      111.34 / 112.14 / 117.42 |

Whole-window and resource statistics use three runs per arm. Each run offered 10,800 game seconds. The observed completed ranges were 10,800.00–10,803.04 in the control and 10,797.02–10,802.99 in the candidate. Small boundary differences include when the client received its last clock sample. The actual internal clock debt was unavailable in this direct-server measurement. Harness CPU median was 1.20% → 1.18% of a core, separately counted from the server and client.

Latency statistics pool the 96 steady walks per arm. Median movement receipt took 18.72 ms longer and average receipt took 7.57 ms longer. The candidate was slower at median in two pairs and faster in one. The p95 improved from 117.17 to 90.34 ms and the largest sample improved from 139.41 to 135.53 ms. Command p99 was 66.36 → 21.22 ms. Both command samples met the [response targets](../../../maintainers/native-simulation-core.md#applicable-multiplayer-timing-policy). The stream receipt samples were under the movement thresholds as well. These receipts measure a changed position delivered to the client, before rendering. The typical latency tradeoff did not outweigh the repeatable CPU and tail benefit for this opening.

Median committed database transactions, including read-only transactions and the fixture observer, increased from 12,128 to 12,734 while delivered stream frames increased from 3,027 to 3,275. Database growth and WAL decreased. Clean timing did not measure statement calls by family or views prepared without delivery. The complete run data, including actual activity and each latency distribution, remains in the verified private result. The shared worker executable SHA-256 was `113cb498faa45450fe47441790c9a79681deb7dd3f7b071d9b6d2b30c1269a34` and all 58 sealed files verified on generation 33.

## Player display reads result

**Keep one snapshot and one transaction for the display reads.** All six runs completed the full schedule. The scoped HTTP check proves one fewer transaction per state response, with the same data statements and results. In ordinary play, median PostgreSQL commits across all readers and writers fell from 12,067 to 9,138, a 24.3% reduction. All three pairs had fewer commits. The clean workload includes read-only transactions and an independent fixture reader and supplies no per-query CPU breakdown.

| Measure                                          | Control median / mean / p95 | Candidate median / mean / p95 |
| ------------------------------------------------ | --------------------------: | ----------------------------: |
| Server CPU (% of one logical core)               |       58.32 / 58.49 / 59.64 |         58.94 / 57.07 / 61.36 |
| PostgreSQL CPU (% of one logical core)           |          8.31 / 8.36 / 8.47 |            8.25 / 8.04 / 8.44 |
| Achieved game speed (% of intended)              |     100.00 / 99.99 / 100.00 |      100.00 / 100.00 / 100.00 |
| Client CPU (% of one logical core)               |          0.72 / 0.73 / 0.77 |            0.75 / 0.73 / 0.76 |
| Harness CPU (% of one logical core)              |          1.28 / 1.32 / 1.41 |            1.24 / 1.26 / 1.33 |
| Combined CPU (ms per completed game-second)      |       11.10 / 11.14 / 11.35 |         11.20 / 10.85 / 11.63 |
| Command response (ms)                            |        5.61 / 10.01 / 50.85 |           5.72 / 7.37 / 17.84 |
| First changed position received (ms)             |       51.20 / 53.69 / 99.62 |        43.48 / 47.37 / 105.65 |
| First observed durable receipt (ms)              |   638.76 / 628.73 / 1084.73 |     563.19 / 575.63 / 1077.99 |
| Concurrent server and database memory peak (MiB) |    822.29 / 816.93 / 864.20 |      788.95 / 790.08 / 814.17 |
| Transient reservation peak (MiB)                 |    514.71 / 503.25 / 558.44 |      429.29 / 431.73 / 481.83 |
| Resident reservation peak (MiB)                  |    205.39 / 205.19 / 208.99 |      198.60 / 196.43 / 200.45 |
| Pending-save reservation peak (MiB)              |       12.74 / 12.76 / 12.80 |         12.61 / 12.65 / 12.74 |
| Database growth (MB)                             |       65.02 / 64.35 / 72.05 |         58.82 / 57.75 / 61.53 |
| WAL (MB)                                         |    160.55 / 162.43 / 174.24 |      151.06 / 144.60 / 154.08 |

The arm median combined CPU increased 0.85%. The three matched pairs changed by −12.5%, +6.0%, and −1.4%. The complete CPU effect is inconclusive. The largest apparent CPU gain coincided with substantially less optional animal motion and background model work in the candidate. Median delivered stream frames were 3,014 → 3,017. Median resident observation receipts were 27,172 → 24,785. Variations in optional work limit attribution of small CPU differences to read batching.

Every run was offered 10,800 game seconds. The control completed 10,797.01–10,800.03 and the candidate 10,799.97–10,800.03 as observed on the stream. Paired differences were at most 2.96 game seconds. Internal clock debt was unavailable. Movement receipt became faster at median and 6 ms slower at p95. The p99 was 179.43 → 140.85 ms. Command p99 was 117.01 → 52.76 ms. Both arms sustained the intended clock and completed the movement and durability obligations. Keep the verified statement reduction and coherent read snapshot. The benchmark does not establish a CPU or multiplayer-capacity gain.

All 71 sealed files verified on generation 11. The reduction with source and exact executable identities has SHA-256 `956fa3120168b5f78f59ad8d3eab5b4f6356055af63e641f07159f8f75934619`.

## Managed comparison plan

Each comparison uses its own standard 16 GiB worker. It interleaves three control and three candidate runs, with a fresh PostgreSQL database in each arm. One authenticated player, ten human NPCs, ten deer and five hares play on the same 62 × 54 m opening with 1,246 scenery records. The steady window is 180 real seconds after warmup at 60 game seconds per real second, one simulation worker and the 2 GiB transient profile. Every run must complete the frozen movement schedule and both saved conversations while ordinary one-second saves continue. The controlled provider is local HTTPS. CPU timing has no stack sampler or phase recorder.

The comparisons hold the offered schedule fixed and record actual game progress, background jobs, animal activity and stream delivery. Review differences in background work before assigning a speed difference. For the bystander trial, reduced optional observation work is the intended difference. Judge the cut against complete CPU, ordinary command and stream latency, preserved interaction behavior and durable state. A failed required walk or reply is incomplete work. The target comparison is at least 5% less median combined server and PostgreSQL CPU per completed game-second before adopting the authored tradeoff, without a material measured movement regression. Six game seconds across a matched pair is the planned tolerance for observed clock boundaries.

The [worker method](../../../../.agents/rules/verification-workers.md) owns resource cleanup, and [measurement](../../../performance/measurement.md) owns distributions and claims. View work beyond one transaction, keyed pending saves, background thought frequency and quieter wildlife remain separate. No change to the normal clock, geometric visibility, animal escape, spending limits or save interval belongs to these experiments.

| Campaign                                                      | Worker  | Frozen plan SHA-256                                                |
| ------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Perception `83de3a6d-0369-4faa-89e8-1cfe51df6fc6`             | Slot 5  | `908eeebc0a0b54a324ab2b379720ff3aa23cda10bd6e7d41252ca66d6c302c6d` |
| Bystander `907f37c6-6cbe-4b8f-ba65-236ac9b082ee`              | Slot 6  | `9ecf6dfb67ea5d0515b2c42d68cf1573831f60028ef93b1bf3386a84862eac2e` |
| Initial display reads `a755fd97-7ccc-4f18-b5a6-83b85bcc39e4`  | Slot 11 | `84349ec357aa31d1becaf37fe41ebf045dea4690da765c8bf149089a74ba82ff` |
| Repaired display reads `37df3133-e76f-4603-a40d-e782b541c40e` | Slot 12 | `db025c8238d2659d7208fa4f4071d6f6ef7358e5218b0910e1e26f94754eeb9e` |

The initial display-read campaign used candidate `8daac960939bf3f98e2dd84c3e93d5c87c9fba82`. It was stopped after the integrated network-boundary check found a PostgreSQL SDK type imported from a player-view module. Before redispatch, the query and its decoding moved into the existing store owner with the SQL unchanged. The repaired implementation passed the network boundary and Rust compile checks. The controller recovered the interrupted run, verified cleanup and retired the worker. The cancelled run's five sealed files verify and contain zero completed timings. It settled at $0.325576 estimated AWS usage with zero outstanding hold. The control remains pinned, and the withdrawn campaign remains separate from the repaired results.

All three comparisons and the stopped attempt are collected. All 18 timed runs completed the offered gameplay. These comparisons use separate controls, and a combined managed result remains unmeasured. Rust workspace and release checks, TypeScript, network boundaries, configuration, formatting and diff checks covered the local integration. The unit suite was skipped.

The four temporary workers were terminated and all four campaign holds reached zero. The worker ledger settled at **$1.579806 estimated AWS usage for this batch**. This includes $0.486741 for perception, $0.324532 for bystander detail, $0.325576 for the interrupted display-read attempt, and $0.442957 for the repaired display-read comparison. There was zero external AI spend. At 03:33 EST, the shared allocation showed $71.815672 charged and $4.830055 held for other work, including the pre-existing quarantine. Another $1.016709 was tracked outside that allocation. These are ledger estimates and commitments under the continuing $100 ceiling. They are separate from invoiced charges.

## Next opportunities

1. Check how often preferences and AI display totals actually change during play. If many movement updates repeat them, refresh those fields on their own changes or when the player opens the panel. Keep a fresh result on reconnect, account changes and usage-window rollover. The reply markers and provider spending check each serve a separate purpose. Batching one transaction proves less transaction overhead for a state response. It does not tell us how much view preparation could be avoided entirely.
2. Count how many already-pending save rows each accepted update revisits without changing them. The earlier stack capture had 126 of 12,568 samples in the row merge under acceptance, about 1% of sampled server CPU. That is one part of storage work. If many tables are untouched, try folding only the tables the update changed before replacing the data structure. The next actual save and its retries still use the same immutable batch.
3. Count why residents begin background decisions. The recorded provider judgment calls include several steps within one decision. If optional curiosity is frequent, try disabling only that use of the model via Base's existing discovery policy and watch whether residents become noticeably less spontaneous. Keep visual discovery, directed speech, danger and blocked-work responses. Separate any savings from the surrounding reads and evidence preparation, which happen even in some checks that end without a model call.
4. Leave deer and hare behavior in place for now. Direct wildlife control used 0.3% of server samples in the earlier profile. The cost their movement creates for witnesses is part of the broader perception and recording totals. If a follow-up finds that cost is still large, try giving a well-fed animal a longer rest while keeping event-driven escape and actual food-seeking.
