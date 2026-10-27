# Can the computer stall even when the game is absent?

October 16, 2026. **Completed: the severe game pause does not recur in this minimal read-only case.**

The first ordinary-index control in PF16.177 fails at 1.086×, with walking p95 5.941 seconds, 39 skipped walk slots and one resident's next native plan refused as busy. The changed index version has not run. A 17.092-second save contains 16.954 summed seconds awaiting SQL; its longest history-write request takes 12.606 seconds. A timer runs 7.297 seconds late, while the largest recorded garbage-collection pause is 169 ms. These overlapping measurements do not identify whether the database, application, operating system or several of them caused each delay.

The game process uses 36.798 CPU seconds in 120.380 measured seconds. Recorded host load rises 80.60→117.31 on ten logical CPUs. After that owned fixture has fully closed, a separate system snapshot reports load 140.69, 95–97% CPU use and about fifteen gigabytes reported as compressed memory. That observation is later than the game, does not identify which other activity caused it, and does not prove all game delays are external. No unrelated process is stopped or reconfigured.

## Selected minimal ablation

Run one sixty-second **no-game** measurement: no world, people, animals, UI, AI, route worker or simulation. Use one fresh journaled owned database, the same pinned PostgreSQL client and exact already qualified duration-only observer. Send ordinary `SELECT 1` at five opportunities per second with one request in flight; keep skips explicit. Separately record gaps in a fifty-millisecond timer. Verify every actual returned scalar. Reuse the current known-wait/protocol/error/privacy proof only by exact helper/observer/client identity. This is a new minimal caller, not a new query or protocol hook.

Bound the helper to 400 requests, 2,000 timer entries, a 1 MiB helper report and the observer's existing 40,000-query / 32 MiB log / 16 MiB report ceilings. Keep a five-second connection / statement timeout, a sixty-second measurement deadline and 180-second outer deadline including setup and exact owned cleanup. Retain all errors and incomplete coverage. No automatic query retry, settings change, paid provider or unrelated log text.

Before execution, review helper/launcher differences and syntax; require the same exact source/package/bindings and ownership checks as the qualified empty protocol helper. Compare observed callback, database-duration and timer delays. Separate first-use/setup from the measured window, close the client before database removal, and verify the exact allocated database is absent with no connection. Preserve the failed game and its original gate failure; do not release another game automatically from this result.

A slow empty case would demonstrate delays without the game's calculations. A fast empty case cannot rule out memory pressure or scheduling delays specific to a larger game, nor can it erase the failed game. Neither result by itself establishes the cause of the 12.6-second history write or authorizes calling 3× achieved.

## Release after static review

The complete new helper and reused owned-launcher difference pass review, Node 22 syntax and formatting. The same frozen PF16.174 ordinary-writer source supplies the pinned client / allocator; no game module is imported. Exact original observer/wrapper hashes, current protocol / known-wait / error/privacy proof, source manifests, package bindings and existing worker evidence are pinned before launch. The helper adds no query or timer retry and retains nominal unissued input opportunities separately from in-flight skips.

One sixty-second measurement is released under the preregistered bounds. Private plan: `ol-pf178-empty-launch-plan-20261016-a.json`, SHA-256 `216619de59a6ba268dd4efc1d029a105cfc9c9d94b4702757dc529329677560d`. Helper SHA-256: `5811b1ba7aec15971c5f20522e1cc8c80503199c6b0a822a15af0731d367343f`. Results are pending; no repeated run or game comparison is automatically released.

## Result: the severe pause does not recur in the empty case

The complete sixty-second minimal measurement passes its result, recording, bounds and exact owned-cleanup checks. All **298 constant queries** return the expected number. There are no query/connection errors or in-flight skips; three nominal opportunities are unissued because timers do not maintain a perfect ideal schedule. The helper uses **319 ms of CPU** across the minute.

| No-game measurement                             | 95th percentile |      Maximum |
| ----------------------------------------------- | --------------: | -----------: |
| Constant query through the application callback |    **19.20 ms** | **51.62 ms** |
| The same query inside PostgreSQL                |     **2.39 ms** | **18.53 ms** |
| How late the fifty-millisecond timer runs       |     **5.21 ms** | **33.79 ms** |

System load is still very high, 183.50→120.65 on ten logical CPUs, but neither the 7.3-second timer delay nor a multi-second query occurs. This means the system-load number alone cannot explain the failed game. It does not rule out intermittent interference, paging of the much larger game process, or write-specific waits: this minimal case performs **reads**, not ordinary game saves / WAL flushes. Its timing window is later than the failed game and is not a matched causal comparison.

The owned process exits normally, source/protocol/observer guards pass, its sole client closes, and its exact allocated database has no remaining catalog entry or connection. Complete backend-duration attribution has zero errors, omissions, text leaks or unmapped successful requests. The original index trial remains failed and incomplete; no game or optimization is automatically released from this result.

Private report: `ol-pf178-empty-result-20261016-a.json`. Full pinned readback: `ol-pf178-empty-readback-20261016-a.json`, SHA-256 `c1652a2147fd795248a69c588d981a90673f54605d97916aefc761437f0d4850`. Nearest-rank percentiles cover all completed samples. Additional and cumulative game-provider/Jev cost remains **$0**.
