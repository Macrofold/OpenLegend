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

The separate interleaved campaign `d1e5a752-6a4a-4b12-acf5-b735b08ecc71` uses the same two source commits and standard worker. It makes one rolling checkpoint due in each run while ordinary play and one-second saves continue. Admission and the start were confirmed. The local AWS session expired after the durable job started. Collection, final outcome and worker stop remain unverified. Resume this campaign after renewing access so the original case order and artifacts stay intact.

## Evidence and failed attempt

The ordinary campaign `07a0b62f-f70b-4630-8139-0fde436db25c` is collected for worker slot 2, generation 592. The result manifest starts `5b499c0e4e88` and the reduced report starts `04d1eec5b3f4`. Each case has its exact source archive, executable, tools, input and independent database receipts. The first campaign `4f2ad20f-ac46-4a53-9f1c-4a66f1581ea9` completed one earlier-Rust case. Its candidate stopped before build because the managed tool still imported the removed workspace-binding file. The restored checker qualified all 22 bindings on a clean release install and the rerun. No result from the first campaign enters the matched statistics.
