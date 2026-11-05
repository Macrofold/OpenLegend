# Cognition Lab native runtime verification

This campaign measures the complete native HTTP caller while the ordinary game remains active. It uses [cognition-lab-runtime.ts](../../scripts/performance/cognition-lab-runtime.ts), the shared game/lab HTTP fixture, and disposable loopback PostgreSQL databases. It never opens or replaces the development game database. Base: `63263abd72e85f4c180cf7d7c5b7bb1bfbefe086`, plus the Cognition Lab implementation.

## Workload and interpretation

Each size uses two fresh databases and the normal Main initializer, seed 73, with the ordinary opening’s characters, entities, definitions and resources retained. The fixture adds either 100 or 10,000 deterministic native events and personal memories, each with 100 padding characters. It authors their timestamps as zero and the diagnostic world clock as 21,720 seconds, so the sources exercise native cold-history residency. This is a deliberately prepared diagnostic clock, rather than a naturally played six-hour world. Preparation commits before constructing an active writer. The opening contains 162 entities and ten events; the added memories are private internal episodes of the ordinary resident NPC. The initial native residency checks observe zero resident memories in both cases.

The ordinary game has a controlled player, an open native event stream, unpaused time at its default speed and clock ratio, and an ordinary presence heartbeat every three seconds. One sequential `/api/state` request consumes its complete JSON, waits 25 ms, then starts another. The game and lab share a Node process and the existing worker/runtime owners, with separate database namespaces. There are no providers or fixture inference calls. This deliberately includes actual concurrent game work; it is not an isolated database benchmark.

For each size the runner performs:

1. A real game-snapshot import through `/api/cognition-lab/operations`.
2. An explicit lab-only interval policy with no autonomous actors, preserving the ordinary game’s defaults.
3. The first finite native interval, which automatically captures its actual immutable run origin before advancing time.
4. Five serial restores of that exact origin, each including the shared native recovery checkpoint and post-install bookkeeping.

The reported operation time includes the HTTP response and consumed JSON. If the server reports a known accepted outcome whose metadata receipt remains unconfirmed, the final runner records one outcome check with the exact same command envelope and identity; this can repair metadata without repeating native installation or a stimulus. Both waits remain in the operation duration. A refused or still-unconfirmed result stops the campaign. Raw initial responses and outcome-check timestamps remain in the external report.

The runner records each operation’s game-state latency, game-clock progress, event-loop delay, memory endpoints, cumulative process maximum RSS, and native preparation/read/validation/clone/history/install/transaction/queue spans. Named-span percentiles use the first 1,000 completed spans at most; their counts and maxima cover every observed span. Complete operation and game-state samples are not truncated. SQL setup and process maximum RSS include fixture construction. No operating-system cache eviction, forced garbage collection or isolated allocation measurement occurs.

Environment: Node v22.23.2, Darwin arm64, PostgreSQL 14.17 over loopback. Ambient host load and unrelated work remain uncontrolled. Source hashes and the repository HEAD are captured in every report; the branch was still under integration. These observations do not establish remote-database performance, operating-system cold reads, renderer input latency, live-model quality, a constant-memory bound or a production capacity limit.

## Shared-owner findings and corrections

The first complete import found that the native commit fence assumed the current and target world IDs matched. Lab and game openings are independent native worlds. The shared restore path now fences the exact previous world, installs complete target canonical records, and retains the target’s original IDs. Only complete-world replacement detaches the old physical-placement edges inside that transaction. Derived recall sources are released under the same fence. A forced installation failure test confirms rollback preserves the previous head, entities, physical placements and recall source counts.

The durable pre-load recovery package still describes the world actually replaced. Its active-world pointer may therefore refer to the preceding world’s package. An exact HTTP regression switches between both independent worlds and reads their recovery aliases; direct foreign-world save IDs remain refused. Native forgetting uses the target world’s non-rewindable ledger. Operational authority and billing remain outside checkpoint replacement.

Continuing a real saved conversation exposed a separate native option-preparation defect: NPC command previews eagerly resolved the local human principal, which could still belong to the previous world or be absent under OIDC. The shared binder now resolves that principal only when a human encounter-preference reference consumes it. Native option preparation and pure previews retain their ordinary physical and permission checks; explicitly supplied execution scopes still pass through the existing authority fence. An HTTP regression imports another world and completes native context preparation, fixture judgment, response generation and a committed NPC speech. The OIDC fixture prepares both native work and direct command previews without a local principal, verifies no world mutation or external I/O, and rejects a stale explicit execution scope. These deterministic fixtures verify continuation mechanics, rather than model quality.

Two repeated database paths made full restore much slower than their returned data suggested:

- History compared every restored event with a separate retained-row query, even when the checkpoint had already installed that exact body. It now compares at most 64 events and 256 KiB per batch, returning identities and equality facts; actual changed-source revocation still uses its existing owner.
- Restore removed derived cache keys with one awaited statement per entity and cache prefix. It now deletes exactly the same keys through the shared parameter/byte-bounded row batching helper. Native transaction and permission semantics remain unchanged.

The first prepared interval also exposed a unit error: its requested simulation seconds were passed as real elapsed seconds, producing a 60× conversion at the default game clock ratio. The shared explicit clock owner now performs the simulation-to-real conversion itself, and its caller passes the requested simulation duration. A native clock assertion covers a one-second advance at admitted speed three. Earlier measurements used the old conversion and cannot qualify the corrected finite-duration behavior.

Profiling exposed a response failure after an actual native installation: queued metadata operations could exceed the existing five-second database-lane wait, and a stale outgoing scope check then replaced the command’s known outcome with a generic access error. The response path now preserves account-bound accepted/unconfirmed receipts under current host creator authority; private workspace disclosure still requires a current native scope. Durable replacement markers and the exact same command identity reconcile remaining metadata after an in-process failure or restart. Queue deadlines were not increased, and uncertain native work is not automatically repeated.

## Diagnostic observations before final qualification

The controlled diagnostic reports are outside Git:

- `/tmp/openlegend-cognition-lab-runtime-20261024-h-before.json`, `2026-10-25T01:26:06.871Z`–`01:32:24.724Z`, HEAD `a95ad4cee44978f1a0c0710ca2de14f7741fc3ba`, with only the two batching changes temporarily reversed and restored unconditionally afterward.
- `/tmp/openlegend-cognition-lab-runtime-20261024-h-after.json`, `2026-10-25T01:32:37.047Z`–`01:35:03.847Z`, with batching restored. Other native/facade integration changed between these reports, and a short owned functional run overlapped near the end. They are diagnostic evidence, rather than an isolated overall speed comparison or final pass.

With 10,000 cold sources, the unbatched import took 51.453 seconds and its history comparison/build phase took 25.077 seconds. Five unbatched restores took 33.091–66.698 seconds; history comparison/build took 16.376–46.704 seconds. Exact cache cleanup added 0.363–2.990 seconds during those restores. The batched diagnostic import’s history phase took 1.923 seconds and cache cleanup took 3.491 ms; its complete import still took 31.754 seconds. This demonstrates why the whole operation must also be measured.

The batched diagnostic’s first 10,000-source restore failed with generic `stale-scope` after 36.214 seconds, despite a completed 7.148-second native persistence transaction. Fourteen database waits expired at about five seconds. Ordinary game time advanced 2,173 seconds during that failed caller, its 458 state reads had p95 94.982 ms and maximum 782.880 ms, and its final pause reason was null. This was an unmet restore requirement, not a successful restoration measurement. The largest event-loop sample in that diagnostic import was 744.489 ms; measured clone, validation and garbage-collection spans do not explain that whole delay, so it is not attributed to one of them or described as nonblocking.

The unbatched diagnostic completed both sizes with no game storage error, zero fixture inference, continued native clock progress, and only the fixed 16 KiB recovery credit left reserved. At 10,000, its 4,039 completed game-state reads had p95 90.998 ms and maximum 529.883 ms. Its cumulative process maximum RSS reached 1,110,384 KiB, including setup and both workload phases. This establishes neither isolated read allocations nor a memory ceiling.

Earlier raw reports `{a,b,c,d,e,f,g}` under the same `/tmp/openlegend-cognition-lab-runtime-20261024-` prefix retain startup/fence and queue-pressure diagnostics. In particular, an earlier run without periodic presence ended with the game away; it is excluded from active-game qualification. No failed or invalid specimen is counted as a pass.

## First complete campaign

The first complete campaign finished successfully at `2026-10-25T02:21:32.798Z`, after starting at `02:18:33.479Z`. The complete external report is `/tmp/openlegend-cognition-lab-runtime-20261024-i-final.json`. It records HEAD `a56c451d389d7e75bcb3783818043b38f6d8fc35`, plus the saved integration changes identified by its source hashes; all captured source hashes still matched after completion. The initial host load averages were 8.816, 10.496 and 14.995. Another checkout had an unrelated test suite running, and a previously started 13.56-second native lifecycle check finished during this campaign's initial setup at `02:18:38 UTC`. These results qualify the actual current caller under that observed load, without claiming isolated overall speedup.

Both sizes completed all eight operations: game import, lab policy, actual first-run origin/interval and five restores. Every operation returned a confirmed success on its first HTTP response; no same-command outcome check was needed. Both owned fixtures closed and their disposable databases were cleaned up. Requested interval duration was one simulation second; the separate native clock test verifies the corrected duration at admitted speed three.

| Complete caller or observation                          |                        100 cold sources |                          10,000 cold sources |
| ------------------------------------------------------- | --------------------------------------: | -------------------------------------------: |
| Game snapshot import                                    |                                 5.899 s |                                     24.727 s |
| First origin capture plus interval                      |                                 2.095 s |                                      7.337 s |
| Five restores, in order                                 | 7.950 / 5.964 / 6.521 / 7.299 / 4.089 s | 27.565 / 20.671 / 10.686 / 10.377 / 13.620 s |
| Restore median                                          |                                 6.521 s |                                     13.620 s |
| Complete concurrent game-state reads                    |                                     529 |                                        1,623 |
| Game-state p95 / maximum                                |                     92.324 / 463.773 ms |                          84.691 / 408.145 ms |
| Poll-start gap p95 / maximum, including the 25 ms delay |                    131.980 / 535.317 ms |                         123.719 / 438.931 ms |
| Ordinary native game-clock progress                     |            2,493.976 simulation seconds |                 7,000.770 simulation seconds |
| Largest operation event-loop sample                     |                              237.109 ms |                                   206.176 ms |
| Retained lab bytes after the campaign                   |                              13,684,613 |                                   57,848,245 |
| Outstanding reserved bytes                              |                                  16,384 |                                       16,384 |

The one-second baseline windows observed game-state p95 of 56.183 and 51.757 ms, with only 17 and 18 reads. The game kept a null pause reason and no storage error throughout every measured operation and at each final boundary. Each lab retained six current native checkpoint manifests after normal recovery rotation; the only outstanding reserve was the fixed recovery credit. Fixture inference calls remained zero.

At 10,000 sources, the import's history comparison/build span took 2.003 seconds, exact derived-cache cleanup 17.155 ms, and the largest native persistence transaction 8.025 seconds. Restores' history comparison/build spans took 0.554–1.933 seconds, cache cleanup 1.409–12.122 ms, package reads 0.941–1.830 seconds, and transactions 1.516–3.140 seconds. These spans overlap other spans and concurrent game work; their values are not added to manufacture a complete-time breakdown. Five shared PostgreSQL queue waits still expired at approximately five seconds during the first two large restores, although both caller outcomes remained confirmed. Existing queue deadlines were unchanged. The successful response and continued game progress do not establish that queue pressure has disappeared.

The largest measured import validation span was 135.986 ms. At 10,000 sources, restore candidate/baseline clones stayed at or below 58.441 ms and observed garbage-collection pauses at or below 68.459 ms. Import event-loop p95 was 36.864 ms and maximum 206.176 ms; restore event-loop p95 ranged 35.127–40.174 ms, with maximum 194.118 ms. These are latency observations, not a claim of nonblocking execution or attribution of every delayed sample to one named phase.

The final process maximum RSS was 1,286,912 KiB, including module/fixture setup and both sequential sizes. The last large restore ended at 1,260.6 MB RSS and 707.0 MB heap used; preceding large-restore heap endpoints ranged 332.4–891.0 MB without forced collection. Complete capture/restore still prepares the selected native state and history, so this campaign does not prove a stable retained-memory ceiling or size-independent restoration. It demonstrates completed current-source operations with measured concurrent native game progress; the remaining stated limits are not relabeled as performance improvements.

### Event-stream qualification correction

Subsequent browser verification found that the new body-receive timer also closed bodyless game event streams after ten seconds. This campaign retained actual state-poll and presence-heartbeat measurements, but its stream helper accepted an unexpected normal EOF. Its results therefore do **not** establish continuous game event streaming across the campaign. The shared receive owner now arms timing only for framed, incomplete request bodies; the unchanged native browser journey verifies three real server heartbeats on one connection, trickle expiry and deliberate forbidden-access recovery. The reusable runtime runner now treats an early event-stream EOF as a campaign failure. The corrected campaign below qualifies its sustained stream; the earlier raw report and its actual workload are preserved.

## Sustained-stream campaign

The corrected complete campaign passed from `2026-10-25T03:49:17.104Z` through `03:51:35.836Z`, at HEAD `7901f73e1922a538727c55d898be3c8d6342ae2c`. Every captured source hash still matched after completion. Other owned browser, test and profiling workloads were closed before dispatch; ambient host work and OS caches remained uncontrolled. Initial load averages were 7.995, 11.845 and 13.021. The exact report and process log are `/tmp/openlegend-cognition-lab-runtime-20261025-j-sustained.json` and `/tmp/openlegend-cognition-lab-runtime-20261025-j-sustained.log`.

Both sizes preserved the ordinary 162-entity, ten-event Main opening and completed all eight operations with confirmed success on the first HTTP response. The game event stream remained open until deliberate fixture shutdown, consuming 14,179,834 bytes at 100 cold sources and 39,081,272 bytes at 10,000. An early stream EOF would fail this runner. Both owned fixture pairs and databases closed successfully; inference calls remained zero.

| Complete caller or observation                      |                        100 cold sources |                         10,000 cold sources |
| --------------------------------------------------- | --------------------------------------: | ------------------------------------------: |
| Fixture startup and cold-history preparation        |                                 4.373 s |                                     9.206 s |
| Game snapshot import                                |                                 5.738 s |                                    16.222 s |
| First origin capture plus one-second interval       |                                 2.200 s |                                     5.073 s |
| Five restores, in order                             | 4.390 / 4.974 / 5.424 / 4.671 / 4.222 s | 17.576 / 17.800 / 12.007 / 11.062 / 7.470 s |
| Restore median                                      |                                 4.671 s |                                    12.007 s |
| Complete concurrent game-state reads                |                                     445 |                                       1,349 |
| Game-state p95 / maximum                            |                     77.236 / 154.162 ms |                         68.666 / 206.789 ms |
| Poll-start gap p95 / maximum, including 25 ms delay |                    113.337 / 331.362 ms |                        103.829 / 232.447 ms |
| Ordinary native game-clock progress                 |            1,995.110 simulation seconds |                5,319.812 simulation seconds |
| Largest operation event-loop sample                 |                               97.911 ms |                                  154.010 ms |
| Retained logical lab bytes                          |                              13,677,328 |                                  57,875,052 |
| Outstanding storage reserve                         |                            16,384 bytes |                                16,384 bytes |

The game retained a null pause reason and no storage error. Its one-second baseline windows had only 12 and 18 reads, with p95 144.848 and 73.191 ms; these small baseline samples do not establish a meaningful speedup or regression. A 166.068 ms event-loop sample occurred in the small baseline, outside the operation samples in the table. The changed stream workload and uncontrolled host load also prevent interpreting the older campaign as a matched before/after comparison.

At 10,000 sources, import history comparison/build took 1.080 seconds and its largest native persistence transaction took 5.550 seconds. Restore history comparison/build took 0.618–1.614 seconds, native package reads 1.097–1.621 seconds and transactions 1.392–2.382 seconds. Four PostgreSQL queue waits expired after 5.009–5.026 seconds during the first large restore; its known caller outcome remained confirmed. Existing queue deadlines were unchanged. The overlapping spans are not an additive complete-time breakdown.

Process maximum RSS reached **1,284,880 KiB**, including module setup and both sizes. The final large restore ended at 1,233,092,608 bytes RSS and 595,807,288 bytes heap used, without forced collection. Large import/restore still prepares the selected native state and full history. The campaign establishes complete operations and sustained concurrent game progress under the measured workload, rather than constant-memory restoration, imperceptible stalls, arbitrary population capacity or the absence of queue pressure.

Focused correctness evidence already covers the independent-world HTTP import/recovery alias, private-history disclosure after waits, native store behavior, authoring, and canonical rollback after failed replacement. The integration owner records the additional in-process and restart receipt-failure specimens and complete application checks. Retained-page/query/artifact measurements are separate in [retained storage verification](cognition-lab-storage.md).

No provider was invoked by this native campaign: additional and cumulative Jev cost for this campaign are $0. The parent implementation task owns task-wide cost accounting.
