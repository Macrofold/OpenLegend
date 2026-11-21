# Stand-alone Rust hot-path comparisons — November 20, 2026

The [current profile](2026-11-20-current-rust-server-profile.md) identified repeated observation, display, storage and decision work. This comparison keeps the previously shipped perception and Base bystander changes in both arms. The [experiment design](../../../projects/native-simulation-hot-paths.md) defines the changes and required gameplay. [Implementation and open checks](../../../maintainers/native-simulation-core.md#stand-alone-hot-path-experiments)

## Workload and decisions

Each clean comparison schedules three interleaved pairs on one standard 16 GiB H0 worker (`m7i.xlarge`, four logical CPUs), with a fresh PostgreSQL database for every run. Each run offers 10,800 game seconds over 180 real seconds after warmup. The 62 × 54 m Base opening has one player, ten human NPCs, ten deer, five hares and 1,246 scenery records. The authenticated stream, 34 walks including two warmup walks, steering, two controlled HTTPS conversations, once-a-second saves and cold continuation use the normal application paths. The transient allowance is 2 GiB. Movement latency ends when the client receives the changed position. Browser rendering and extra database observers belong to separate checks.

The CPU decision uses server plus exclusive PostgreSQL CPU per completed game second. A pure speed change must improve consistently across pairs and exceed repeat variation. A display change can earn its place with a demonstrated reduction in repeated database traffic and stable complete CPU, memory and latency. All claims require the same required gameplay, including saved replies and a recovered receipt. The optional NPC variant may change only discovery work. The profiler and database relay are separate from clean timings. [Comparison rules](../../../performance/measurement.md#planning-comparisons)

## Connected release checks

| Check                               | Source                                     | Managed campaign                       | Outcome                                                                                                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network and full type gate          | `25305cf40257d763e00fb5817e8d44e2a1aece5a` | `38e61697-568a-4e74-acdb-8f9a52afeb58` | Network passed. The shared usage contract and existing type fixtures still expected the former view. Build and gameplay did not run.                                                                                                                  |
| Release build and ordinary gameplay | `25305cf40257d763e00fb5817e8d44e2a1aece5a` | `eb7bccb0-98b5-4511-857d-32495c6a92ea` | Completed 34 durable walks, both controlled conversations and cold receipt recovery. Achieved 10,800.04 game seconds out of 10,800 offered. The process exited cleanly, with zero live transient, resident and pending-save reservations at shutdown. |
| Updated types and focused callers   | `64542e7ddbd4840ce7af3e67da0c3c2f362dbb8d` | `4cc8dad8-46ab-4efa-a34b-f47f58731b13` | Network and types passed. A syntax error from a formatting change stopped both Rust builds before play. `62a6ea0e1` corrected the delimiter.                                                                                                          |
| Focused retry                       | `62a6ea0e1`                                | `d80bb6a6-4f33-4883-ac9c-aac644e5c4fd` | A missing import stopped both Rust builds before play. `423f7dc8a` restored it.                                                                                                                                                                       |

The passing connected release used executable SHA-256 `2a843c2bfe6d375208a82b4f2ca763a53b23ee7b6a45c5a29fd4384b55375e89` and matching browser HTML SHA-256 `6a56535b219c1b2b498ea4a3cfc0b0c6f341aff49ee2b24acf5eba86d423ef02`. The type correction and later removal of an unused accounting notification have separate release evidence. This correctness run is not an isolated performance comparison.

The focused release `423f7dc8a` passed network, types, and the optimized server and browser builds. Its worker-local Chromium could not start because the worker image lacked `libatk-1.0.so.0`. Its separate save case confirmed an older held PostgreSQL transaction, later accepted movement, and two ordered durable receipts. The first cold read used a new session and was correctly refused. Campaign `6ea7d1fd-088a-4845-98ec-5356b3764045` checked the corrected caller on `b97530bf5`. The original session recovered the exact receipt and both recreated contacts after restart. A new session still received no result. A late controlled reply after cancellation left no saved reply and could not duplicate the terminal result. The original-Send test stopped at its old advisory premise. Availability now lets the Send wait. A separate caller checks the actual wait and cancellation.

The corrected original-Send case passed on `b97530bf5` in `8d6b5c1e-a3fb-4a71-b4a5-49882d8f4a0f`. The player moved while the request waited for the resident. Cancelling before admission left zero jobs, utterances and provider requests. A new Send with the same ID saved one utterance and one reply. Cold recovery found that same completed job. The stand-alone privacy case `4c37259d-a002-4454-ad66-d412615d489d` observed real speech on the permitted stream and confirmed two independent saved witnesses. Protected forgetting sent a fresh reset without the withdrawn event and preserved the witnesses and the shared original after restart.

The attached browser case `c74dd7fb-de19-4733-b2b4-fc6b2c2e1dcb` passed on `b97530bf5`. Chromium 145.0.7632.6 ran visibly at 1920 × 1080 on the approved M1 Pro over the managed worker's private tunnel. It saved camera and Story preferences through the rendered controls and read the visible allowance on opening its panel. The server rejected logged-out and foreign-scope reads. Both scripted conversations saved, with the answering NPC the actual payer. Two independently authorized streams closed without partial frames. Cold reopening returned the camera setting written only by the browser and recovered the original movement receipt. Earlier attached retries failed when the browser fixture read a body after Chromium discarded it and when it used the wrong Journal button name. This was a functional browser check.

The held-intent caller `d6ea6e0b-d2fb-4ec7-a3a8-4ea8833c471c` withdrew the selected speech before network submission. The server sent zero provider requests, kept the two independent witnesses and recovered the same refusal after restart. In the paired unrelated-change case, movement changed recognition and support while the selected speech stayed current. The server applied one reply and recovered it cold. For optional discovery, a single qualifying cue waited for game second 300. A real walk removed that cue at about game second 63. No optional job was admitted. The positive, direct-conversation and withdrawal cases together verify the changed timing. These checks used a diagnostic build, outside clean timing.

## Diagnostic work counts

In three focused profile windows, the table-selective save fold skipped 669,343–724,082 prior write-row revisits per 180 seconds. That was **54.75–57.15%** of the rows the previous fold would have revisited. It still examined 543,011–553,267 rows in tables where something changed. Both counters lost zero records. They count simulation-side visits to unsaved rows. PostgreSQL still commits the same required rows. [Save acceptance](../../../../native/simulation/src/records/save.rs) · Campaign `d4060b8d-87e7-4480-a10e-1a7e53dbfae5`

The separate PostgreSQL relay recorded one complete ordinary run per version. It counted executed statements, returned rows and loopback bytes with no errors or partial-frame cutoffs. This check excludes the fixture's independent observer queries. It establishes actual traffic for each run. NPC and save activity varied between these single runs. It cannot attribute the difference in total traffic to the display split or establish a speed change.

| Display version              | Statements / real second | Completed statements | Returned rows | Request MB | Response MB |
| ---------------------------- | -----------------------: | -------------------: | ------------: | ---------: | ----------: |
| Original batched view        |                    269.5 |               48,510 |        64,064 |     147.70 |       41.89 |
| Scoped preferences           |                    314.5 |               56,609 |        72,775 |     173.42 |       50.46 |
| Scoped preferences and usage |                    277.0 |               49,860 |        65,823 |     161.08 |       44.79 |

The preference split still needs the existing maintenance and narrator-eligibility statement. It removes unrelated account data from that hot read. The usage split takes its monthly aggregate out of every movement-view preparation. The scoped panel requests it separately. [Statement owners](../../../../native/game-server/src/store/view_profile.rs) · [Usage owner](../../../../native/game-server/src/store/view_cognition.rs) · Campaign `3622eb76-18ec-4b92-ad31-dd49cf912cd0`

## Integrated release comparison

Campaign `2e8fc56f-45ab-4070-9edf-489ad71d3722` collected all six complete runs of `744c6b2c5` and `75e457bcf` on the standard 16 GiB worker. Both arms finished 34 saved walks, steering, both controlled conversations and an exact cold receipt. Server CPU includes all process threads. Client CPU is separate. Each cell gives median / mean / p95. CPU and game speed use three entire 180-second windows per arm. Latency uses 96 steady walks per arm.

| Metric                              |                     Control |            Retained changes |
| ----------------------------------- | --------------------------: | --------------------------: |
| Rust server, % of one core          |       53.02 / 51.13 / 53.19 |       49.48 / 50.32 / 53.72 |
| Exclusive PostgreSQL, % of one core |          8.62 / 8.49 / 8.97 |          7.25 / 7.15 / 7.31 |
| Stream client, % of one core        |          0.93 / 0.94 / 0.97 |          0.86 / 0.87 / 0.92 |
| Achieved game speed, % of intended  | 100.028 / 100.019 / 100.028 | 100.000 / 100.000 / 100.001 |
| Command response, ms                |            7.0 / 8.0 / 15.3 |            6.7 / 7.7 / 13.1 |
| First movement received, ms         |          44.5 / 52.7 / 93.1 |          58.6 / 57.3 / 86.3 |
| Durable receipt, ms                 |      572.0 / 564.2 / 1092.3 |      585.8 / 587.5 / 1080.2 |

Median server plus PostgreSQL CPU per completed game second fell from 10.301 to 9.455 ms, or 8.2%. The three pairs improved by 8.46%, 0.75% and 1.26%. The median improvement is smaller than the spread of the control runs. Median sampled concurrent memory fell from 575.5 to 531.0 MiB and the median transient reservation peak fell from 288.8 to 197.1 MiB. The candidate median had 9,199 versus 8,911 PostgreSQL transactions and 110.54 versus 96.89 MB of WAL. Transactions include the independent receipt observer. The relay above is a separate statement count. The player stream measured rate and receipt time. It did not expose internal clock debt or browser paint time.

The final held relative-movement case `7bead812-1dc0-4b47-8dce-39af3539fe05` passed on diagnostic source `9769a14b`. The full and narrow original readers agreed on the same frame, scope and ordered attention references. The resident moved from x=18.7 m to x=15.4 m while waiting for the controlled reply. The resulting move reached the destination computed from the original frame, saved one effect, and recovered the same result and position after restart. The earlier run correctly refused after the old walk had completed and created a new result.

The focused physical warning case remains open. The control in `b0c124bd-db9e-45cb-b46f-812cd0c5a591` did demonstrate natural sight loss and a new lease on reacquisition. It did not produce the intended positive closing-body warning and reported outstanding native work at shutdown. Its candidate did not run. Ordinary gameplay, privacy, response and durable continuation passed independently. The scan remains provisional pending the matched warning and mixed-host cleanup check.

## Isolated comparisons

All 90 scheduled runs across the 15 isolated comparisons completed the required gameplay and cold receipt. The clock sustained its authored rate in both versions. Ordinary automatic NPC activity varied between runs. The figures below measure whole play, including that variation.

- **Optional resident discovery** had the strongest CPU result. Median server-plus-PostgreSQL CPU per game second fell 9.7%. Each matched pair improved by 6.6–11.9%. Controlled automatic judgments fell from a median of 466 to 273 per run. That count includes several reasons for thinking. The focused caller separately saw the pending discovery wait until game second 300 and save one dispatch that survived restart. Directed speech completed while that wait remained in force.
- **Original NPC reply input** reduced concurrent peak memory in all three pairs, from 571–595 MiB to 537–564 MiB, and reduced the median transient reservation peak from 306 to 197 MiB. Complete CPU was unchanged within variation. The first-movement stream p95 was higher in each pair. The pooled change was 61.7 to 89.3 ms, within the 200 ms target.
- **Recent player events and attention warning inputs** reached lower first-movement p95 in each pair. Both complete CPU differences were inconclusive. Recent-event preparation builds its lookup only for IDs the view could actually use. The warning scan needs current bodies and matching sight leases, and no longer prepares descriptions, motion scores and familiarity for ranking it never uses.
- **Scoped preferences and AI usage** remove display-only work from movement. Neither isolated change established a whole-server CPU win. On the final usage version, PostgreSQL CPU fell from a median of 7.98% to 7.02% of one core. The two versions still had overlapping complete CPU. The earlier usage notification variant was removed. Stand-alone replies spend the answering NPC's allowance and have no supported player-billed operation that needs that notification.
- **Pending-save tables** skipped the measured row visits but used more complete CPU in all three pairs. Automatic NPC judgments also increased in each pair, so the extra CPU cannot be assigned to the fold alone. The established save path stays. The one-pass work-row encoder and equal-attention-row shortcut produced mixed results. The one-pass encoder also needed a larger reserved buffer. Both came out of the candidate.
- **Current field, sight confirmation, location/body, description field and related-track changes** did not show a repeatable CPU gain. Related tracks also had a higher movement p95 in all three pairs. The established paths stay. The retained attention scan has its own isolated result and does not depend on these changes.

Animal behavior stays unchanged. The retained profile can identify the animals' own execution cost. It does not attribute enough of the observers' work to deer movement to justify a longer-rest trial.

### Clean CPU, game speed and movement

Cells show median / mean / p95, control → candidate. CPU and game speed use three whole-window observations per arm. Latency pools 96 steady walks per arm. Completed work includes two saved conversations and a cold receipt in every qualifying run. The raw records identify run order, observed game seconds, SQL writes and ordinary NPC judgments. The stream samples do not expose internal clock debt.

| Experiment                              | Server % of one core                  | PostgreSQL % of one core        | Game speed % of intended                          | Movement receipt ms               | Combined ms/game second, medians | Paired combined CPU changes % |
| --------------------------------------- | ------------------------------------- | ------------------------------- | ------------------------------------------------- | --------------------------------- | -------------------------------- | ----------------------------- |
| Resident optional discovery             | 56.25/56.30/57.71 → 51.00/51.41/53.66 | 9.14/9.04/9.24 → 8.14/8.34/8.77 | 100.028/100.020/100.028 → 100.001/100.010/100.028 | 50.5/57.8/110.6 → 46.1/48.2/77.8  | 10.912 → 9.854                   | -7.16 / -6.57 / -11.91        |
| Original NPC reply input                | 42.89/43.01/43.31 → 42.93/42.58/43.46 | 7.36/7.40/7.61 → 7.33/7.29/7.50 | 100.000/99.991/100.000 → 100.000/99.990/100.000   | 34.2/36.2/61.7 → 63.2/54.3/89.3   | 8.365 → 8.377                    | -3.54 / +0.26 / +0.09         |
| Recent player events                    | 43.72/44.35/46.44 → 43.64/43.12/44.16 | 7.44/7.48/7.81 → 6.97/6.98/7.17 | 100.000/100.006/100.017 → 100.028/100.009/100.028 | 68.3/66.5/107.7 → 35.3/39.2/81.8  | 8.527 → 8.432                    | -3.37 / +0.30 / -6.73         |
| Attention warning inputs                | 48.28/50.51/55.50 → 47.45/48.17/51.49 | 8.40/8.49/9.02 → 8.14/8.31/8.78 | 100.004/100.010/100.027 → 100.000/100.000/100.000 | 43.6/43.7/64.1 → 35.5/38.4/56.9   | 9.448 → 9.265                    | +6.33 / -13.81 / -3.99        |
| Scoped preferences                      | 43.26/43.44/44.71 → 44.17/44.89/48.21 | 7.26/7.38/7.83 → 7.18/7.24/7.48 | 99.972/99.990/100.027 → 100.000/99.991/100.000    | 31.8/37.9/76.0 → 35.3/41.6/85.3   | 8.383 → 8.560                    | +12.22 / -6.02 / +2.11        |
| Scoped AI usage                         | 52.29/52.99/58.23 → 51.20/51.11/54.02 | 7.98/8.13/9.07 → 7.02/6.86/7.05 | 100.000/100.009/100.028 → 100.000/99.992/100.000  | 70.9/68.1/94.5 → 68.4/66.2/93.3   | 10.041 → 9.708                   | -13.44 / -9.36 / +9.42        |
| Earlier usage variant with notification | 51.48/51.08/53.92 → 54.42/53.96/54.86 | 7.97/7.96/8.01 → 7.23/7.23/7.25 | 100.001/100.010/100.028 → 100.003/100.010/100.028 | 59.1/62.1/95.1 → 58.0/58.6/94.2   | 9.915 → 10.273                   | +0.27 / +10.58 / +0.57        |
| Pending-save tables                     | 46.51/46.14/47.51 → 48.06/48.69/51.23 | 7.88/7.81/7.89 → 8.35/8.32/8.63 | 100.000/100.009/100.028 → 100.000/99.991/100.000  | 51.0/51.2/76.3 → 47.4/49.4/78.8   | 9.062 → 9.402                    | +5.15 / +3.75 / +8.09         |
| One-pass work rows                      | 45.80/46.17/48.65 → 46.24/45.67/47.86 | 7.71/7.75/8.03 → 7.90/7.79/8.12 | 100.000/99.998/100.021 → 100.000/99.991/100.000   | 59.1/57.0/96.3 → 65.5/64.5/91.1   | 8.920 → 9.060                    | +1.57 / +8.15 / -11.32        |
| Equal attention rows                    | 51.80/51.70/51.89 → 50.69/51.19/53.33 | 8.46/8.43/8.54 → 8.43/8.64/9.22 | 100.001/100.001/100.003 → 100.000/100.000/100.028 | 48.2/48.7/76.9 → 53.3/58.3/95.8   | 10.043 → 9.853                   | -2.18 / +3.79 / -3.14         |
| Current field selection                 | 41.21/42.24/45.02 → 41.31/41.36/41.94 | 7.15/7.13/7.63 → 7.11/7.12/7.25 | 100.000/100.000/100.028 → 99.972/99.981/100.000   | 35.8/39.0/71.6 → 34.5/37.0/70.9   | 8.058 → 8.095                    | -0.81 / -7.03 / +3.08         |
| Sight confirmation                      | 51.69/52.33/56.80 → 53.56/52.84/60.44 | 8.41/8.45/9.15 → 8.59/8.57/9.37 | 100.000/100.000/100.000 → 100.000/99.991/100.000  | 68.0/68.8/100.2 → 71.4/67.2/96.4  | 10.016 → 10.357                  | +5.86 / +3.40 / -7.11         |
| Location/body reuse                     | 52.89/52.49/55.19 → 53.48/54.07/55.73 | 8.55/8.49/8.60 → 8.57/8.62/8.99 | 100.000/100.000/100.000 → 100.028/100.020/100.028 | 72.3/71.2/106.2 → 56.3/60.1/101.8 | 10.240 → 10.338                  | +7.48 / +5.34 / -3.94         |
| Description-field reuse                 | 47.05/46.36/49.34 → 47.90/47.25/49.49 | 7.95/7.84/8.00 → 7.59/7.89/8.57 | 100.000/100.000/100.000 → 100.028/100.018/100.028 | 65.3/64.9/98.4 → 66.9/67.1/96.1   | 9.166 → 9.235                    | -5.53 / -3.38 / +15.51        |
| Related tracks                          | 50.07/50.07/50.12 → 50.75/50.00/50.96 | 8.38/8.32/8.39 → 8.11/8.24/8.61 | 100.003/100.011/100.028 → 100.000/100.010/100.028 | 50.5/50.5/72.4 → 61.0/60.9/93.7   | 9.743 → 9.810                    | +0.69 / +2.34 / -3.78         |

### Durability, memory and database work

Response and durable receipt use median / mean / p95 of the same 96 steady walks. Memory is the median of each run’s sampled concurrent server RSS plus PostgreSQL charged memory peak. Native reservations are independent process peaks that include setup. PostgreSQL transactions include reads and the independent receipt observer. See the separate relay for actual statement counts. Median WAL and database growth use decimal MB.

| Experiment                              | Command response ms         | Durable receipt ms                      | Peak memory MiB | Peak transient reserved MiB | DB transactions | WAL MB          | DB growth MB  | Cold view ms    |
| --------------------------------------- | --------------------------- | --------------------------------------- | --------------- | --------------------------- | --------------- | --------------- | ------------- | --------------- |
| Resident optional discovery             | 7.5/9.0/17.4 → 6.7/7.9/10.4 | 562.9/555.7/1055.6 → 547.4/573.6/1075.9 | 602.5 → 579.9   | 323.5 → 322.9               | 9620 → 8450     | 109.78 → 99.93  | 35.31 → 33.40 | 1106.7 → 1047.9 |
| Original NPC reply input                | 5.5/5.8/7.5 → 5.8/6.4/10.9  | 551.3/549.7/1062.4 → 562.0/582.6/1085.0 | 590.4 → 543.4   | 306.2 → 196.6               | 9226 → 9473     | 109.92 → 109.55 | 37.01 → 33.09 | 976.9 → 1018.5  |
| Recent player events                    | 6.5/7.2/12.7 → 5.8/6.1/7.5  | 569.1/592.4/1093.7 → 531.8/558.0/1044.9 | 584.1 → 587.6   | 306.8 → 296.2               | 9580 → 8763     | 101.72 → 100.10 | 35.85 → 29.56 | 889.6 → 888.4   |
| Attention warning inputs                | 6.1/7.0/10.7 → 6.1/6.1/7.8  | 548.0/577.9/1062.5 → 565.8/558.7/1025.4 | 597.8 → 582.3   | 311.4 → 294.2               | 9297 → 9095     | 104.56 → 100.84 | 34.34 → 32.33 | 1092.7 → 1070.8 |
| Scoped preferences                      | 5.8/6.2/10.7 → 5.9/6.6/11.6 | 501.6/543.7/1063.0 → 509.9/539.0/1069.0 | 586.3 → 603.0   | 310.7 → 321.7               | 9121 → 9358     | 106.92 → 107.25 | 34.09 → 33.27 | 936.2 → 914.8   |
| Scoped AI usage                         | 6.6/7.2/12.8 → 7.2/7.7/12.8 | 555.5/557.5/1071.8 → 579.0/576.6/1034.5 | 609.9 → 589.1   | 313.1 → 311.6               | 9221 → 8924     | 109.17 → 96.84  | 34.73 → 31.56 | 1029.3 → 926.9  |
| Earlier usage variant with notification | 7.1/7.9/15.8 → 7.1/7.9/12.9 | 575.0/584.3/1085.9 → 532.5/575.5/1091.1 | 632.5 → 628.1   | 311.6 → 338.9               | 8714 → 9403     | 100.31 → 102.84 | 32.86 → 32.82 | 1016.4 → 1049.9 |
| Pending-save tables                     | 6.1/6.5/9.1 → 6.0/6.4/10.7  | 536.8/554.9/1036.7 → 526.3/566.3/1073.8 | 571.4 → 578.6   | 307.6 → 289.4               | 9080 → 9591     | 100.08 → 100.63 | 31.74 → 33.76 | 1015.8 → 986.1  |
| One-pass work rows                      | 6.6/7.0/11.7 → 6.3/6.7/12.6 | 518.3/555.5/1067.2 → 539.2/570.7/1066.7 | 572.8 → 594.0   | 279.3 → 307.3               | 9068 → 9455     | 102.01 → 104.49 | 34.37 → 34.67 | 970.2 → 966.1   |
| Equal attention rows                    | 6.6/7.5/13.9 → 7.8/8.6/14.5 | 563.8/594.4/1092.0 → 537.3/545.0/1074.1 | 574.9 → 589.4   | 340.7 → 303.2               | 8709 → 9166     | 102.89 → 102.81 | 32.98 → 32.78 | 1082.9 → 1070.8 |
| Current field selection                 | 5.3/5.6/7.6 → 5.5/5.6/7.6   | 512.2/546.3/1044.6 → 536.0/556.8/1034.9 | 576.9 → 584.7   | 328.0 → 322.7               | 9492 → 9132     | 104.39 → 105.77 | 32.97 → 33.94 | 914.1 → 936.8   |
| Sight confirmation                      | 6.5/7.5/15.5 → 8.0/8.9/15.3 | 529.4/564.1/1081.0 → 545.2/577.3/1079.4 | 600.2 → 598.3   | 282.2 → 302.3               | 8965 → 9391     | 100.02 → 105.98 | 33.57 → 33.80 | 970.6 → 1056.6  |
| Location/body reuse                     | 7.3/8.4/16.0 → 7.7/8.3/13.1 | 547.4/573.9/1068.6 → 572.3/569.8/1069.5 | 577.2 → 596.4   | 305.8 → 305.6               | 8907 → 9224     | 102.95 → 106.46 | 32.11 → 34.56 | 1098.9 → 1043.0 |
| Description-field reuse                 | 6.5/7.2/13.1 → 6.5/7.1/11.8 | 536.5/541.5/1047.2 → 538.9/569.9/1079.3 | 585.0 → 584.1   | 295.5 → 304.6               | 8810 → 8900     | 104.94 → 102.41 | 34.70 → 32.04 | 1032.6 → 1012.7 |
| Related tracks                          | 6.7/6.9/10.0 → 6.6/7.6/14.3 | 530.2/534.6/1049.2 → 562.0/572.2/1044.8 | 581.9 → 597.2   | 332.7 → 322.6               | 9026 → 8729     | 104.69 → 104.48 | 33.64 → 36.20 | 1027.6 → 1038.0 |

### Frozen comparisons

| Experiment                              | Control source | Candidate source | Campaign                               | Complete runs |
| --------------------------------------- | -------------- | ---------------- | -------------------------------------- | ------------- |
| Resident optional discovery             | `744c6b2c55a3` | `82c0a18f14d8`   | `905cb1af-b9da-4d5a-ba4e-9cc6586a2c15` | 6/6           |
| Original NPC reply input                | `744c6b2c55a3` | `60d0dc9b2b48`   | `6fb1b252-ed09-499a-aa92-59415463b43c` | 6/6           |
| Recent player events                    | `744c6b2c55a3` | `ebdbea419cdf`   | `f3397e24-ac6e-43bc-8f8e-58b9210a3810` | 6/6           |
| Attention warning inputs                | `744c6b2c55a3` | `e470297f8500`   | `ba9fa1b7-d8b0-4d39-abb4-5f2fe3095402` | 6/6           |
| Scoped preferences                      | `744c6b2c55a3` | `79b82b6a03f6`   | `86813cac-834c-432c-8296-9a992c1487bb` | 6/6           |
| Scoped AI usage                         | `f12faf34831e` | `7b7b07ba872a`   | `a85ae602-f3d5-4985-9850-b126e059d2fc` | 6/6           |
| Earlier usage variant with notification | `f12faf34831e` | `fde16fab68bb`   | `6e29ebdc-5597-475d-a460-50a810149eef` | 6/6           |
| Pending-save tables                     | `744c6b2c55a3` | `a343c419df8f`   | `ec05dec0-5f9d-4b9a-8f52-a7abe2d329bc` | 6/6           |
| One-pass work rows                      | `744c6b2c55a3` | `e2e1c1c13e36`   | `624d57e3-fb46-4b56-97d9-b48d2cfa17f2` | 6/6           |
| Equal attention rows                    | `744c6b2c55a3` | `f1372ed89715`   | `76724d9d-1003-4fbc-827e-6669ad0c6c95` | 6/6           |
| Current field selection                 | `744c6b2c55a3` | `33abf052dced`   | `4afdb058-c3fc-4b53-9c73-57d3f9f7a654` | 6/6           |
| Sight confirmation                      | `482bc13331c7` | `778fdf8604bc`   | `fd409902-3981-4d92-b0c3-3a4baab002e3` | 6/6           |
| Location/body reuse                     | `154dded1ea84` | `8d3c1a8304f2`   | `1a3f5239-4433-49ab-aded-550ae9d25f45` | 6/6           |
| Description-field reuse                 | `b0b816224aac` | `4640bc0d5a5e`   | `145d9fbb-220b-48ce-8e44-1b2335fc3705` | 6/6           |
| Related tracks                          | `744c6b2c55a3` | `b615a2fe73c9`   | `00268b0b-e7e0-4762-9d10-8ad9e0787bdc` | 6/6           |
