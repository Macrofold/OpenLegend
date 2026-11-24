# Stand-alone Rust release qualification — November 24, 2026

[Release tracker](../../../maintainers/native-simulation-core.md#full-game-on-the-stand-alone-server) · [Retained caller inventory](../../../maintainers/native-simulation-core-coverage.md#full-server-conversion-inventory) · [Acceptance rules](../../../limits/native-simulation-core.md#nsc-l10--stand-alone-rust-server-comparison)

The released game keeps one Rust writer and uses PostgreSQL for ordinary saving. The browser, offline world preparation and managed build tooling can use Node. The running game serves signed play without it. The local release passed reviewed Main and Solo activation, movement and exact reconnect after an accepted walk lost its response, cold continuation and protected checkpoint recovery. Actual held conversation checks exercised independent movement, source withdrawal, cancellation and lost control. The [release tracker](../../../maintainers/native-simulation-core.md#full-game-on-the-stand-alone-server) preserves the exact local artifacts and the retained gameplay cases.

## Matched ordinary play

Earlier Rust `13b670652cf28a7caffa1eda84986e06d356c203` and release Rust `24e4f7454936011a972f5178c53945a020b5a107` used the same 26 active actors (one player, ten human NPCs, ten deer and five hares) and 1,246 scenery records. After 10 seconds of warmup, the signed stream and automatic clock ran for 180 real seconds at 60 game seconds per real second. Each run completed 34 visible and durable walks, including 32 in the measured window, two held steering gestures and two controlled HTTPS conversations through reply application and ordinary one-second saves. The restarted server recovered the sampled original command receipt. Automatic movement and NPC jobs also continued throughout each run.

The one standard `m7i.xlarge` worker supplied four logical cores and 16 GiB in `us-east-2`. Each arm had three interleaved runs in earlier/release, release/earlier, earlier/release order, with independent databases and the same two-GiB transient allowance and one simulation worker. The build, startup, warmup, drain and cold reopen are separate from steady gameplay. The browser receives the same signed stream. The timing client observes its messages without drawing frames.

Cells report median / average / p95. CPU, speed and resource peaks are distributions across three runs per arm. Latency is pooled across 96 timed commands per arm.

| Measure                                                 |               Earlier Rust |                Release Rust |
| ------------------------------------------------------- | -------------------------: | --------------------------: |
| Server CPU (% of one logical core)                      |      37.99 / 40.93 / 47.37 |       38.84 / 38.81 / 40.18 |
| Exclusive PostgreSQL CPU (% of one logical core)        |         5.89 / 6.12 / 6.98 |          5.90 / 5.85 / 6.07 |
| Achieved game speed (% of intended rate)                | 100.000 / 99.991 / 100.000 | 100.000 / 100.000 / 100.000 |
| Command response (ms)                                   |         5.27 / 5.52 / 7.81 |          5.27 / 5.30 / 7.44 |
| First moved position received by the stream (ms)        |      50.87 / 51.81 / 75.90 |       46.91 / 47.96 / 63.06 |
| First observation of the committed command (ms)         | 681.74 / 669.96 / 1,108.58 |  661.19 / 635.60 / 1,084.65 |
| Concurrent server RSS plus PostgreSQL memory peak (MiB) |      588.1 / 588.0 / 602.0 |       595.2 / 593.3 / 597.7 |
| Combined CPU per completed game second (ms)             |         7.25 / 7.84 / 9.06 |          7.46 / 7.44 / 7.71 |

Both arms ran at the intended rate with small differences at stream sample boundaries. They were each offered 10,800 game seconds per run. The earlier build completed 10,797.00–10,800.03, and the release completed 10,800.00–10,800.03. Internal clock debt was unavailable from this caller. The movement receipt tail fell from 75.9 to 63.1 ms. Maximum receipt latency was 97.2 and 94.0 ms. This is stream delivery evidence. PostgreSQL receipt polling runs every 100 ms, so its observation also includes polling delay. The exact save scheduling age, commit acknowledgement and save phases are unavailable in these clean timings.

Combined CPU per game second changed by −17.7%, −1.2% and +6.8% in the matched pairs. Earlier Rust used more CPU in its first run. NPC jobs through drain had medians of 244 and 200. Both arms recorded the same 162 NPC occurrences. The CPU result is inconclusive. All six runs completed the required work.

### Memory, storage and reopening

Cells again report median / average / p95 across the three runs. Reservation maxima cover the process lifetime. The actual memory peaks are sampled in the live window. Separate Rust and PostgreSQL peaks may occur at different times.

| Measure                                        |              Earlier Rust |              Release Rust |
| ---------------------------------------------- | ------------------------: | ------------------------: |
| Signed client CPU (% of one logical core)      |        0.57 / 0.67 / 0.86 |        0.60 / 0.60 / 0.62 |
| Fixture driver CPU (% of one logical core)     |        0.95 / 1.05 / 1.31 |        0.94 / 0.95 / 1.02 |
| Server RSS peak (MiB)                          |     159.9 / 162.9 / 169.9 |     169.0 / 170.3 / 174.7 |
| PostgreSQL memory peak (MiB)                   |     429.3 / 425.9 / 432.0 |     420.6 / 423.0 / 430.6 |
| Transient reservation peak (MiB)               |     135.7 / 138.4 / 144.0 |     136.3 / 135.9 / 138.3 |
| Resident reservation peak (MiB)                |     182.3 / 183.7 / 187.5 |     183.0 / 183.7 / 185.4 |
| Pending-save reservation peak (MiB)            |           7.5 / 7.4 / 7.5 |           7.1 / 7.2 / 7.2 |
| Database growth (MiB)                          |        35.8 / 36.4 / 40.4 |        37.2 / 37.7 / 39.2 |
| WAL growth (MiB)                               |     119.1 / 122.7 / 135.4 |     122.4 / 121.6 / 122.6 |
| Cold reopening to a usable permitted view (ms) | 964.3 / 1,012.2 / 1,109.7 | 993.5 / 1,010.9 / 1,063.6 |

Median PostgreSQL transaction commits were 10,162 and 10,050. Median inserted/updated/deleted tuple counts were 30,664 / 80,124 / 11,561 and 32,865 / 83,546 / 13,579. These are database work counters. Exact server statements, rows transferred and prepared bytes are unavailable. Client and fixture driver CPU are outside the server and PostgreSQL totals. Rust worker threads are already included in the server process. The launcher used at most 0.02 CPU seconds in any steady window.

## Scheduled checkpoint window

The first scheduled-checkpoint comparison, `d1e5a752-6a4a-4b12-acf5-b735b08ecc71`, made one rolling checkpoint due during ordinary play. One earlier-Rust run and two release runs completed play, publication and cold continuation. The second earlier-Rust run saved all 34 walks and both replies, but three admission attempts failed before any checkpoint file reached staging. The last two scheduled runs did not start. The result was collected after AWS access returned. Worker generation 593 cleaned up and stopped with no hold remaining for this campaign.

The original failure text did not distinguish an occupied save gate from a native refusal during the protected drain. The three successful runs above remain partial evidence. The checkpoint now probes for a momentary opening without entering the intake queue. Sustained contention still uses the existing 30-second backoff.

The uninstrumented release `1ff11741f3453db7c53045186f9bba93884bb9bf` passed the same local 180-second case. It saved all 34 walks, both steering gestures and both replies. The automatic file contained 12,907 verified rows and the complete 26-actor roster. The cold server recovered the original movement receipt. Both processes exited cleanly, all reservations released and the disposable database was removed. The retained manifest starts `121cf98c34b0` and the executable hash starts `6de6c5353c18`.

A separate local diagnostic held a real ordinary intake guard for 751 ms. An extra signed walk was accepted and appeared on the live stream during the hold, then produced exactly one durable receipt. The checkpoint acquired the gate after the guard released. An induced refusal from the native world-admission owner triggered the existing 30-second retry. The next attempt published a valid checkpoint. Scheduled walks, both replies, cold continuation and cleanup still passed. The diagnostic manifest starts `bb6e52ad135e`. Its measurements do not enter the clean timings.

The clean comparison `f795c51c-f13d-4944-b880-d9171ebaa51e` used the common repair on top of earlier Rust (`dfcbbbe8f8342b311ef78f1d72faf9df457fbfc5`) and the release (`1ff11741f3453db7c53045186f9bba93884bb9bf`). All six runs on the same standard 16 GiB worker completed the frozen 180-second workload and published one verified scheduled file during play. Each used an independent database, saved 34 walks, two steering gestures and two replies, then reopened the latest world and recovered the original command receipt. A signed operator listed the checkpoint while still connected. The freeze starts `8ea97c118f4e`, collected manifest `d579ecba3a0d`, cleanup receipt `4871d20b29a3` and reduced report `833448c625ff`. The case receipts include each exact release executable and source archive.

Cells report median / average / p95, across three interleaved runs per arm or 96 timed walks per arm for the three latency rows. Server CPU includes all Rust threads and the checkpoint writer. The PostgreSQL figures use an exclusive database process group.

| Measure                                                 |                Earlier Rust |                Release Rust |
| ------------------------------------------------------- | --------------------------: | --------------------------: |
| Server CPU (% of one logical core)                      |       53.13 / 52.32 / 53.28 |       51.39 / 52.14 / 55.29 |
| Exclusive PostgreSQL CPU (% of one logical core)        |          7.77 / 7.74 / 8.09 |          7.35 / 7.49 / 8.36 |
| Achieved game speed (% of intended rate)                |   99.973 / 99.982 / 100.000 |  100.000 / 99.991 / 100.000 |
| Command response (ms)                                   |        9.23 / 10.22 / 18.10 |          6.86 / 7.12 / 9.77 |
| First moved position received by the stream (ms)        |      75.42 / 67.35 / 117.64 |       57.44 / 59.65 / 91.21 |
| First observation of the committed command (ms)         |  625.75 / 611.00 / 1,116.90 |  643.68 / 600.35 / 1,080.62 |
| Combined CPU per completed game second (ms)             |       10.15 / 10.01 / 10.23 |         9.79 / 9.94 / 10.61 |
| Concurrent server RSS plus PostgreSQL memory peak (MiB) |       592.7 / 573.8 / 602.2 |       586.8 / 594.4 / 620.2 |
| Transient reservation peak (MiB)                        |       137.0 / 137.7 / 140.9 |       139.4 / 139.5 / 141.5 |
| Resident reservation peak (MiB)                         |       178.5 / 179.7 / 182.9 |       177.3 / 178.7 / 185.7 |
| Pending-save reservation peak (MiB)                     |             7.1 / 7.2 / 7.4 |             7.4 / 7.5 / 7.6 |
| Database growth (MiB)                                   |          33.4 / 35.1 / 39.0 |          32.2 / 33.6 / 40.6 |
| WAL growth (MiB)                                        |       104.7 / 108.1 / 118.4 |       107.6 / 108.9 / 126.9 |
| Checkpoint output window (ms)                           |     947.8 / 968.3 / 1,018.4 |     924.6 / 940.2 / 1,018.8 |
| Retained file (MiB)                                     |          29.7 / 30.0 / 31.7 |          29.2 / 29.9 / 32.5 |
| Concurrent memory peak during file output (MiB)         |       571.4 / 545.7 / 585.8 |       579.8 / 588.7 / 609.8 |
| Cold reopening to a usable permitted view (ms)          | 1,113.5 / 1,151.7 / 1,231.2 | 1,112.8 / 1,128.4 / 1,236.4 |

The 10,800 offered game seconds yielded 10,797.03–10,800.02 in earlier Rust and 10,796.98–10,800.05 in release Rust at the stream boundaries. Internal clock debt was unavailable. Combined CPU per game second changed by −3.6%, −2.4% and +3.7% in the matched pairs. Autonomous NPC job medians were 223 and 183 through drain, with 162 recorded NPC occurrences in every run. The sampled CPU result is inconclusive. Command response and movement receipt both met their respective latency targets. Their p99 values were 19.9 and 139.3 ms in earlier Rust and 15.4 and 108.4 ms in release Rust.

The sampled file-writing windows included 9–11 memory cuts per run. The verified files contained 12,598–14,038 rows on the release and 12,697–13,624 on the earlier build, using each arm's actual captured cut. No first-movement receipt or PostgreSQL receipt observation landed strictly inside a file-writing window. The full windows establish gameplay with checkpoints enabled. The effect on a walk or commit during the write itself remains unmeasured. The driver checks for committed rows every 100 ms. Exact commit acknowledgement, save scheduling age, save phases and prepared SQL bytes remain unavailable from this clean comparison.

Median database transaction commits were 9,664 and 9,394, including the fixture's reads. Median inserted/updated/deleted tuple counts were 28,402 / 77,198 / 10,496 and 28,407 / 74,909 / 10,800. These are PostgreSQL counters, with exact statement and transferred-row counts unavailable. The signed client used 0.97 / 0.98 / 0.99% and 0.97 / 0.97 / 0.97% of one core. The fixture driver used 1.33 / 1.32 / 1.34% and 1.31 / 1.33 / 1.43%. Both are separate from the server and PostgreSQL totals. The launcher used at most 0.02 CPU seconds in a steady window.

## Release decision

Retain stand-alone Rust as the sole live server for the approved game scope. The Node-free release passes the required starting-world, privacy, reconnect, persistence and recovery journeys. Both managed windows complete the same scheduled play at the authored rate. The release delivers movement sooner in these runs and combined CPU varies across the matched pairs. The result qualifies the retained gameplay and operations at the measured opening.

The scheduled campaign cleaned up its processes, databases and workspaces. EC2 and the pool confirmed the stop at generation 594. The runner settled at $0.611604 estimated use with no remaining campaign hold. Controlled provider spend was $0.

## Evidence and failed attempt

The ordinary campaign `07a0b62f-f70b-4630-8139-0fde436db25c` is collected for worker slot 2, generation 592. The result manifest starts `5b499c0e4e88` and the reduced report starts `04d1eec5b3f4`. Each case has its exact source archive, executable, tools, input and independent database receipts. The first campaign `4f2ad20f-ac46-4a53-9f1c-4a66f1581ea9` completed one earlier-Rust case. Its candidate stopped before build because the managed tool still imported the removed workspace-binding file. The restored checker qualified all 22 bindings on a clean release install and the rerun. No result from the first campaign enters the matched statistics.

## Post-cutover Rust review

The local reviews use signed callers, disposable PostgreSQL databases and controlled provider responses. These are correctness checks. The matched standard-worker results above remain the performance evidence.

- **Player state and stream.** The earlier build reused an open stream after an audience change. The repaired build closed it and served the new grant on a fresh connection. Two ordinary movement patches matched signed HTTP state and one saved receipt. A control transfer within the original audience reset the view and kept the private draft. Requests without Play remained refused. Result `c570ba511373`.
- **Save and recovery.** The signed caller recovered the accepted walk while PostgreSQL held the writer. The ordinary save committed one result with the visible position. Cold reopening returned that position and original receipt. Administrative Load returned the earlier position on a fresh timeline and the old scope was refused. Result `3e96d27475d7`.
- **Private Journal deadline.** A held receipt write settled after the five-second deadline. The earlier build applied the decoded reply. The repaired build recorded both provider attempts once, published no late text and returned the earlier Journal revision after reopening and replay. Final result `3cffe44034de`.
- **Conversation retry.** Signing out while the retry queue write was held returned a refusal. The earlier build left a queued job behind. The final build rolled it back without starting a provider request. A fresh session reused the request ID, saved one reply and recovered it after restart with no second request to the provider. Result `3cf264492210`.
- **Craft replacement.** A running flint craft held the only hammer. The earlier build omitted it from the available recipe stock and refused to start a replacement. The final build offered the exact hammer for the replacement and kept it unavailable to Drop. A forged tool left the old work intact. The accepted replacement released the old hold, kept the same hammer and spent the second flint once. Replay and cold continuation produced one cutter and released the new hold. Result `57d4b294c340`.
- **Projectile impact.** One shielded sling hit reduced health from 100 to 93. The struck character's record now includes the original 14 injury, the 7 prevented, exact health and the authored attention priority. The shooter and a third witness received their permitted observations without the private values. One stone was consumed. The saved evidence and original Guard receipt survived restart. Result `435eb5507530`.

The first stream, save and Journal checks used release tree `c814aa07ecfd` and executable `8cbcce1bf260`. The final release used tree `5152d4b9af34` and executable `221ea6b8bc04`. The stream check returned the same result on both builds. The save fixture's first attempts had setup errors: a second writer correctly refused the database lease, and the raw PostgreSQL fixture needed the configured schema. An early projectile run used a new session for the original receipt. The current fixture keeps the original session and uses the receipt endpoint across restart.

The final executable also passed the 180-second local ordinary journey with one player, ten human NPCs, ten deer, five hares and 1,246 scenery records. It completed 34 streamed and saved walks, both steering gestures, observable animal movement and both controlled replies through ordinary one-second saves. The original receipt returned after cold reopening. The Rust server ran with Node absent from its path, stopped cleanly and released its transient, resident and pending-save reservations. The fixtures removed their databases. Result `a38182782df8`, ordinary driver `1911653b7fb9`, evidence archive `rust-review-20261124`.

## Post-cutover sling, Craft and storage follow-up

The local controls use the release in `f093a3e10` and independent disposable databases. The sling release sequence spent ammunition on a missed Hunt and a successful ordinary shot. Only its five inert-target releases earned credit. The Craft and All actions menus offered the selected recipes with a Work line alone. On one actual saved conversation with two retry attempts, the old reply query selected three full job rows. The compact query on that same snapshot returned one permitted row. The SQL preflight sized 3,081 bytes before and 162 bytes after, with a transfer allowance of 52,368 and 3,616 bytes. These counts describe query work for this conversation.

Optimized release `5156acf42710`, tree `e65071ff43b1`, passed the following local checks using the existing signed callers. Each gameplay fixture used and removed an independent PostgreSQL database.

- **Sling handling.** A missed Hunt and five inert hits counted as six equivalent releases. The sixth still used 75% handling. The next ordinary shot used 81.25%. A separate installed rule yielded 87.5% and retained the observed hit while withholding exact damage for private health. The world without a skill rule spent ordinary ammunition without adding practice. Stop before release, original receipt replay, personal visibility and cold reopening passed. Results `4715790d4b7e`, `a035a22d718f`, `0759343e7acf`.
- **Craft preview.** Signed recipe and All actions offers matched the prepared-world TypeScript view for a hammer, an exact selected knife from two allowed definitions, and a recipe without a kept tool. The saved action used the same facts and authored start message. Replacing the work reused the hammer and spent only the second flint. The cold receipt returned the same result and the work produced one cutter. A real browser selected Resume Here and rendered the Trim tooltip with one Supple branch, one Knife and its 90-game-second cost. Results `850468e95f57` and `eb0e689f9567`.
- **Conversation reply status.** The speaker saw the latest permitted status for the original attempt and both retries. A nearby signed witness heard the speech and received no private status. The cold view and exact receipt recovered one accepted reply. Result `44a411c96819`.
- **Save receipt while the writer waits.** The accepted walk could be recovered while PostgreSQL held the writer. The ordinary save wrote one receipt and the correct position. The cold server returned that receipt and position. An authorized Load restored the earlier checkpoint on a fresh timeline and rejected the old scope. Result `9549f3f562bf`.
