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

### Save queue and reply lookup profile

The managed `m7i.xlarge` profile measured the original paths in `f093a3e10` with temporary probes in `fcaa92c074c5`. Each of three recorder-off and three recorder-on runs used a fresh database and the same 26-actor opening, 1,246 scenery records and 180-second steady window. Each run finished 34 walks, two steering gestures, two controlled saved replies and cold continuation. Entries below are median / average / p95 across three runs per column.

| Measure                                                  |               Recorder off |                 Recorder on |
| -------------------------------------------------------- | -------------------------: | --------------------------: |
| Server CPU (% of one logical core)                       |      43.42 / 43.23 / 44.21 |       43.43 / 43.55 / 44.97 |
| Exclusive PostgreSQL CPU (% of one logical core)         |         6.08 / 6.11 / 6.30 |          6.44 / 6.32 / 6.70 |
| Achieved game speed (% of intended rate)                 | 100.000 / 99.991 / 100.000 | 100.028 / 100.030 / 100.061 |
| Server and PostgreSQL CPU per completed game-second (ms) |         8.25 / 8.22 / 8.42 |          8.31 / 8.31 / 8.61 |

The three captures dropped zero observations. Across 11,586 save staging calls, the timed hold was **49.5–50.0 µs median, 66.6 µs average and 166–168 µs p95**. The longest hold was 0.913 ms. The 96 sampled receipt lock acquisitions averaged 0.28 µs and all were below 1 µs. The ordinary opening showed little lock contention. The repair keeps candidate memory and scheduling preparation out of the lock while retaining the final fault and capacity check.

The 7,654 reply lookups ran at 14.2 per second. Their elapsed time was **0.84–0.85 ms median, 1.06 ms average and 2.15–2.17 ms p95**. They returned 3,373–3,441 full job rows and 2.90–2.96 MB of job text per run. The compact query keeps the exact snapshot and transfer-size check. The signed retry case above establishes the reduced query work after the change. End-to-end CPU and latency effects of the repairs remain unmeasured.

Campaign `81e117ac-95f8-43b2-8756-e770f176999d` exhausted its build allowance before gameplay and cleaned up. The retry `00715088-867a-4446-b063-3b1fa6262710` increased the build allowance and preserved the selected probes and inputs. Collected manifest `f68f4003b581` and reduced report `7a464caaaddd` identify the results. The direct timings support attribution. Recorder overhead remains unqualified because there is no fixed-work safety proof and one pair exceeded the frozen game-time tolerance.

Both campaigns completed worker cleanup. EC2 and the runner confirmed the retained worker stopped at generation 596. The two campaigns settled at $0.281890 and $0.424636 estimated use, with zero hold remaining for either. Controlled model spend was $0.

### Compact reply reader correctness on November 25

The signed caller checked base commit `3a408a1f22f4869570abd40339900bf0665ee78b` with unrelated simulation-save diagnostic probes in the executable (`530a074ee0f4`). The reply reader, authorization and delivery paths came from the pinned base. The test used disposable PostgreSQL, two independently signed characters and a controlled local provider. Result `8996c77a16f1`.

- Two signed state reads and two live stream openings selected no speech eligible for private reply status. A loopback PostgreSQL relay saw zero reply sizing queries and zero reply body queries.
- In a second run, two tabs with the same signed session saw the same attempt go from pending to completed on their own streams. The second tab observed without taking control. An independently signed witness heard the utterance without seeing its private reply status. The three signed state reads and three stream openings before the utterance again issued zero reply queries. Result `037f7afe2a12`.
- The speaker saw the failed original attempt, the failed first retry, and the newest attempt while its provider reply was held. Releasing the provider call advanced that same attempt to completed on the same stream. Reopening the saved world showed the same latest attempt and the original receipt. Replaying the receipt caused no duplicate provider call.
- A nearby signed player saw the speaker's utterance via the state endpoint and the live stream, with no private reply status. In a separate held state read, PostgreSQL finished sizing the speaker's result before the relay held the body fetch. Withdrawing the speaker's access while the fetch was held caused the endpoint to return HTTP 403 with no reply information after release.
- With one speech and three saved attempts, each actual query used the speech index. The sizing query and the body query each visited three attempt rows in one scan, with three shared buffer hits and zero buffer reads. The permitted result was one row and 162 bytes for the transfer-size check. Forcing that same speech ID through the compact SQL with the nearby player's authority yielded zero rows. These counts describe the exercised retry and warm database, with timings disabled.

The server stopped, the disposable database was dropped and the private PostgreSQL cluster stopped. External model spend was $0.

### Compact reply reader during ordinary play

The first diagnostic campaign, `6e63f1b0-3000-4012-a309-7531ce5e0cc1`, completed the gameplay with one viewer and with two tabs on the same account. Traces included unrelated database work and hit the capture limit in both runs. The separate player's stream closed when the restored world resumed because its character lacked a verified controller. Those runs do not qualify the database timings or the three-viewer comparison. The runner verified cleanup and termination of the separate worker and settled at $0.281277 estimated use with no reservation remaining.

The completed diagnostic campaign, `a39a2058-7922-4fdc-9faa-0916fe2cb572`, used a separate standard `m7i.xlarge` worker in `us-east-2` (slot 4, generation 123, four vCPUs, 16 GiB). Each setup used the same Rust executable (`33a634956205`) and a separate PostgreSQL database. The source was `3a408a1f22f4` plus reply-only recording probes in `343c814f0408`. Each 180-second window kept the ordinary clock and saves running. Each run completed 34 walks, two steering gestures and two controlled replies, then reopened the saved world and recovered its movement receipt. The separate player controlled their own stationary character with Play permission. The speaker could also manage saves. The recorder dropped zero observations.

| Work per 180 seconds                   | One viewer | Two tabs on one account | Two different players |
| -------------------------------------- | ---------: | ----------------------: | --------------------: |
| Delivered stream updates               |      3,155 |                   6,285 |                 6,029 |
| Updates with a reply-status transition |          4 |                       8 |                     4 |
| Updates without a transition           |      3,151 |                   6,277 |                 6,025 |
| Speech IDs selected by the server      |      3,314 |                   6,562 |                 3,130 |
| Server selections that skipped SQL     |        715 |                   1,443 |                 3,719 |
| Reply lookups started                  |      2,457 |                   4,861 |                 2,325 |
| Reply lookups per second               |      13.65 |                   27.01 |                 12.92 |
| Reply lookups per delivered update     |      0.779 |                   0.773 |                 0.386 |
| Reply read transactions committed      |      2,456 |                   4,861 |                 2,325 |
| Transfer-size SELECTs completed        |      2,457 |                   4,861 |                 2,325 |
| Reply-body SELECTs completed           |      2,454 |                   4,839 |                 2,318 |
| Confirmed reply SQL statements         |      9,824 |                  19,422 |                 9,293 |
| Reply body rows returned               |      3,292 |                   6,515 |                 3,108 |
| PostgreSQL result-row bytes            |    521,883 |               1,032,538 |               492,879 |

Statement counts include transaction start, commit and completed SELECTs. One lookup in the single-viewer run was canceled after its transaction started. The statement count includes the confirmed work before cancellation. Result-row bytes include the size result and body rows with their PostgreSQL row framing. Query parameters and other protocol messages are outside that byte count. The numerator for lookups per update covers signed HTTP and stream preparation, including attempts that produced no later stream update. The denominator counts updates received by the stream clients. The separate player received 3,035 updates, heard the speaker and selected zero private reply speech IDs.

| Timing per operation, median / average / p95 |            One viewer | Two tabs on one account | Two different players |
| -------------------------------------------- | --------------------: | ----------------------: | --------------------: |
| Wait for the read connection (µs)            |   2.42 / 12.27 / 3.45 |     2.10 / 11.44 / 3.12 |   2.42 / 12.40 / 3.38 |
| Reply lookup (ms)                            |    1.28 / 1.44 / 2.67 |      1.17 / 1.32 / 2.42 |    1.25 / 1.38 / 2.47 |
| Database transaction elapsed (ms)            |    1.27 / 1.42 / 2.67 |      1.16 / 1.30 / 2.39 |    1.23 / 1.35 / 2.42 |
| Transfer-size SELECT wait (ms)               |    0.57 / 0.65 / 1.12 |      0.51 / 0.60 / 1.07 |    0.56 / 0.63 / 1.09 |
| Reply-body SELECT wait (ms)                  |    0.31 / 0.43 / 0.98 |      0.30 / 0.39 / 0.90 |    0.32 / 0.41 / 0.92 |
| First stream update showing a walk (ms)      | 57.07 / 56.57 / 79.25 |  65.24 / 67.70 / 103.95 | 54.19 / 50.87 / 73.53 |

Reply timing distributions use the observed operations in each window, with medians and p95s reported at the upper edge of their recorder bins. Database transaction elapsed time includes PostgreSQL waits and the application's work while the connection is held. The two SELECT waits include the driver and loopback transport. PostgreSQL execution time within an individual SQL statement was unavailable. Walk timings use the 32 steady-window walks per run at the signed stream client, before browser rendering.

| Whole-window resources and progress | One viewer | Two tabs on one account | Two different players |
| ----------------------------------- | ---------: | ----------------------: | --------------------: |
| Game server CPU (% of one vCPU)     |      49.44 |                   54.24 |                 57.26 |
| PostgreSQL CPU (% of one vCPU)      |       6.94 |                    9.67 |                  8.61 |
| Game speed (% of intended)          |    100.028 |                 100.000 |               100.028 |
| All PostgreSQL commits              |      9,323 |                  15,090 |                11,798 |

**Disposition at the time.** The measured cost alone did not justify changing the compact reader for the tested load. Two tabs nearly doubled the reply SQL traffic and received eight status transitions in 6,285 updates. Even in that case the reply transactions held the read connection for about 6.32 seconds of the 180-second window, returned about 1.03 MB of result rows and had a 2.39 ms p95 transaction time. Waiting for the connection stayed below 4 µs at p95 in all three setups. The engine completed ordinary saves and continued at the intended game speed. Each lookup took its own database snapshot and rechecked permission before release. This instrumented study recorded one run per viewer setup under the former wire contract. The subsequent [reply policy](../../../narration-and-conversations.md#explicit-failed-response-retry) removes the redundant per-speech fields from signed views and keeps pending and terminal status in Speak. These figures remain the historical baseline, with no clean successor speedup measurement.

The collected manifest starts `6a8b080866ff`, the cleanup receipt `42d4d9a0445e` and the reduced report `7c2690d57712`.

The runner verified process and database cleanup. EC2 confirmed both dedicated workers terminated, and slot 4 returned empty at generation 123. The completed campaign settled at $0.254023 estimated use. The two campaigns together used $0.535300 of the shared allocation, with zero outstanding reservation and $0.433408 still available. External model spend was $0.

### Reply lookup removal and administrator retry

The successor keeps ordinary speech in signed state and live updates and carries pending and terminal reply information through recent activity and exact receipts. A disposable PostgreSQL relay recorded zero calls to the retired conversation reply query while the signed speaker and witness received actual speech. It independently counted 134 recent-activity body reads and eight exact-job body reads across retry and receipt callers. The scope change preserves the already measured baseline above and eliminates the dedicated caller, with no claim about elapsed player latency, CPU use or broader SQL traffic.

Signed Chrome exercised Play alone and Play with Manage access against the built Rust server. The ordinary player saw the failure and kept their newer draft. The Retry button was absent, and a direct retry request returned HTTP 403 without a job or provider call. The player sent new words and recovered the completed reply through its own receipt. The administrator saw and clicked Retry, watched the held reply finish, and recovered the completed attempt. The original speech remained one occurrence. Signed state and the same live streams carried the committed words without the retired fields.

A separate signed HTTP and stream replay refused attempts to retry a superseded failure and to retry from an administrator tab that lacked control. Both owner tabs saw the latest permitted attempt complete, and a separately signed witness heard the speech without receiving the private attempt. PostgreSQL held a genuine exact receipt read after its size check. A committed access change caused the old request to return HTTP 403 with no private details. A fresh Play grant could read the same exact receipt. Cold recovery caused no extra model dispatch. A follow-up signed walk after the held reply completed reached its target on the same stream with the original words and completed job still visible. The replay again observed zero calls to the retired query. Result `3a6c44c9855e`.

The Rust executable starts `7897d214c528`. The signed replay result starts `80aea9d88d4f`, and the ordinary and administrator Chrome results start `50f2c889d796` and `3ef3b8d84145`. An initial browser fixture seeded an unpaused opening and was corrected before either role qualified. An initial SQL classifier matched unrelated NPC scheduling reads and was narrowed to the retired query's exact fields before the replay. The controlled providers made no external calls. The servers and private PostgreSQL clusters stopped and the disposable databases were dropped. This was correctness verification. No clean server comparison ran under the remaining shared allocation.

### Review checks for retry and Trade

The review uses the same saved administrator check for retry, access changes, character binding and invitations. The check runs within the existing write transaction. This is server access policy. The installed world still determines whether a resident can hear and answer.

A signed retry reached an exact queued write and waited in PostgreSQL. A separately signed administrator removed Manage access while the write waited. The old request returned HTTP 403 when the write was released. PostgreSQL saved no retry and the provider received no retry request. The speaker retained Play and control, and their original failed receipt was still recoverable. The rebuilt Rust executable starts `1bd488cb41dc` and the held-write result starts `704dc388c990`. Signed Chrome also verified the controlling administrator could complete a normal retry on that build. Result `7151083ab9b5`.

A signed Play-only Chrome session also recovered a new completed reply and verified that Trade rendered the player's original words. Signed state and the live stream carried those words without the retired reply fields. Result `11ac876f8562` and Trade screenshot `5b09904ad58c`. At 1440 × 960, In view covered the Speak close button during the first run. The verification used Hide In view to continue through the normal controls, and the [shared panel issue](../../../maintainers/ui-ux.md#uiux19) remains tracked. The controlled provider made no external calls. Test servers stopped and disposable databases were dropped. These were correctness checks.

### Unreal reply status after lookup removal

The arm64 Mac Development build used source `228bc5367730` (executable SHA-256 starts `491c7d2d25b4`) and the integrated Rust release (SHA-256 starts `63c52ba96c06`). In a disposable PostgreSQL Base world with a local HTTPS provider, the packaged player saw a held reply complete on its signed stream and sent a second message without checking a receipt. The second reply’s controlled failure showed its reason and the original words. A single explicit administrator retry completed on the same stream. Two original speech events and three attempts were saved, with statuses completed, failed and completed. The provider was local and the run incurred $0 in external charges.
