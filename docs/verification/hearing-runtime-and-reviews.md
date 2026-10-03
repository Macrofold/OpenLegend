# Hearing runtime and review measurements verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Hearing runtime and performance

The hearing sections and annexes below are historical source-branch evidence. [Combined integration verification](hearing-main-integration.md) owns the current main/hearing tree. Old schema/checkpoint, profiler-mode and typing claims apply only to their recorded revisions.

Scope: the feature branch's schema-10 hearing/captions/World Events implementation. No automated tests or test files were written or run. Paid provider spending was $0. Production-only `npm run build` completed, including TypeScript and Vite; Vite retained its large-bundle warning. Full repository checks that invoke existing test suites were intentionally not run.

### Manual native, persistence and presentation observations

An isolated zero-budget SQLite world accepted normal speech at clear, partial and detected-without-words distances. The public projection and actor context used identical listener fragments. The durable Speech query paged 78 unique perceived events across pages of 17/17/17/17/10, beyond the recent 60-event HUD feed, with no storage error.

A fresh on-disk schema-10 world retained exactly the same partial capsule and text after closing and reopening the database. Reusing a Speech cursor with the All filter was rejected. A targeted whisper beyond intelligible/detection range still committed; the visible recipient received only a speaking observation, no words and no automatic conversation membership. The actual director, with an injected non-network provider and zero budget, completed the unheard interaction with zero provider calls. This does not qualify live model output. An earlier disposable restart setup had removed a support used by the seed bird and was correctly rejected; the successful observation retained valid native support geometry.

Native HTTP `/api/state` and `/api/world-events?type=speech` returned 200 under the local session. The event endpoint returned partial text and an unknown-source capsule without hidden identity. Its actual response was supplied to the real World Events React component for the separate DOM observation.

Browser navigation to the local game failed with `ERR_BLOCKED_BY_ADMINISTRATOR`; WebGL was also unavailable. No policy bypass or real scene walkthrough was performed. Offline Chromium `setContent` rendered the real `SpeechCaptions`, `ProgressRing` and World Events components, using fixed non-authoritative anchor coordinates. The countdown stroke advanced (approximately 9.52 to 25.38) and remained unchanged during a 500 ms paused interval (25.756818 before/after). Unknown-source speech, partial fragments and history rows rendered without page errors; a 390 px viewport had no horizontal overflow. The log's scroll container was subsequently aligned with the existing ConversationThread shell and production compilation repeated. These observations do not qualify PlayCanvas projection, live camera movement, complete mobile interaction, reconnect or accessibility.

### Native performance experiments

Node v22.16.0, same container, seed 73, 180 native one-second steps, warmup 0, requested speed 3×. The existing `gems.json` adds 500 ground objects (514 total entities); `mixed.json` adds 10 people, 20 animals and 300 objects (344 entities). Baselines were captured before the feature's runtime changes; final samples include the committed native logic and shared source tokenization. Times below are baseline / final, in milliseconds.

| Scenario |        Total ms | p95 step ms | Maximum step ms | Native headroom at 3× |
| -------- | --------------: | ----------: | --------------: | --------------------: |
| gems     | 1153.7 / 1192.1 | 8.05 / 8.29 |   126.7 / 115.1 |           0.87 / 0.84 |
| mixed    | 1556.5 / 1588.5 | 5.63 / 5.94 |   879.1 / 901.4 |           0.64 / 0.63 |

An intermediate pair varied in the other direction (gems 1085.6 ms, mixed 1631.4 ms); these are short, noisy samples, not statistically established gains or regressions. Final event/awareness counts agree with the baseline for both existing scenarios. Maximum steps include dense first exposure. Both scenarios remain below 1.0 native headroom at the requested 3× speed, even before database/browser/inference work, so this is not a capacity pass.

A separate native-only, seeded scattered-source workload added 100 people and 500 objects, then committed 250 utterances cycling whisper/normal/shout. All 250 were accepted: 4299.0 ms total, p50 16.16 ms, p95 23.84 ms, maximum 127.31 ms, final heap 90.6 MiB. Final counts were 350 world events and 26327 awareness rows including fixture creation. This includes required native fan-out and masking, but excludes SQL persistence, browser frames, provider calls and scheduler debt. It is one bounded observation, not a production throughput guarantee.

Raw observation JSON/logs and CPU profiles were written outside the repository in the task workspace. [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification) retains graphical/browser, PostgreSQL, live-provider, sustained-load and save-rewind qualification; automated cases remain in [TODO](../maintainers/TODO.md#hearing-captions-and-perceived-events--deferred-validation).

## Hearing review hardening

Scope: review of the hearing feature based on `9d58e50`, without merging concurrent main changes. Production `npm run build` passes; the existing Vite bundle-size warning remains. No automated test files or suites were written, edited or run; paid API spending is $0. Temporary manual observation programs and synthetic data live outside the repository. The values below are the repeated observations after restoration of the interrupted local review workspace, not unrecoverable earlier samples.

### Native and persistence observations

A freshly emitted, partially understood unknown voice retained exactly the same actor evidence when the initialization entrypoint ran again. It stayed unnamed in durable history. Generic awareness-text and raw-speech rewrites were rejected; an importance-only change persisted as 9 without adding speaker identity. Sixteen deterministic one-word examples contained both reveal and gap outcomes. A retained non-speech event whose hot awareness was removed could be edited and persisted as “Ada waves.” without recreating hot awareness. These exercise native/domain and the actual SQLite history repository, not live providers or a named-save rewind. A separate actual WorldService/AiDirector submission at detected-but-unintelligible whisper range committed one speech event and completed its job with heard/none evidence, zero injected-provider calls, zero network requests and no storage error. Provider credentials were inert fixture strings; network access was disabled in that observation.

### Actor-scoped query experiment

An in-memory SQLite dataset contained 100,000 synthetic global events, 2,000 perspectives for one actor, and 100 speech perspectives for that actor. The same dataset was queried before and after adding the perspective-order/type indexes; newest-page medians use 15 reads of 50 rows. Complete keyset traversal returned exactly the same 2,000 All and 100 Speech records without duplicates.

| Query              | Before median ms | Reviewed median ms |
| ------------------ | ---------------: | -----------------: |
| All newest page    |            2.280 |              0.452 |
| Speech newest page |           37.448 |              0.612 |

SQLite EXPLAIN changed from the global event-order index to the actor perspective-order/type-order indexes; deep pages included an indexed order ceiling/range seek. The experiment measures read/query planning on synthetic in-memory SQLite, not network/disk latency, production PostgreSQL or end-to-end UI capacity.

### Persistence fan-out experiment

Two runs used the same reviewed native domain and the old versus reviewed HistoryRepository writer. The seeded workload added 100 people and 500 objects and committed 250 utterances to at most 102 listeners. Both accepted all utterances and retained 25,765 perspectives. The common native domain means its timing differences are repetition variance, not a before/after native optimization claim.

| SQLite writer         |  Before | Reviewed |
| --------------------- | ------: | -------: |
| Total persistence ms  | 1840.44 |   945.16 |
| Median per commit ms  |   7.040 |    3.545 |
| p95 per commit ms     |  12.557 |    5.806 |
| Maximum per commit ms |  20.452 |   15.657 |

This isolates per-actor tail evidence resolution, shared event hashing and the new perspective indexes. It excludes fsync/network, browser and inference. It is a bounded sample, not a production throughput guarantee.

### Existing native stress rerun

Node 22.16.0, seed 73, 180 one-second native steps, warmup 0, requested speed 3×; the existing gems/mixed scenarios ran in baseline and reviewed worktrees on the same machine.

| Scenario                           | Before / reviewed total ms | Before / reviewed p95 ms | Before / reviewed maximum ms | Before / reviewed 3× headroom |
| ---------------------------------- | -------------------------: | -----------------------: | ---------------------------: | ----------------------------: |
| 500 added objects                  |          1174.49 / 1088.19 |            8.751 / 7.083 |              149.25 / 127.77 |                 0.851 / 0.919 |
| 10 people, 20 animals, 300 objects |          1583.64 / 1699.29 |            4.881 / 5.446 |              905.42 / 977.30 |                 0.631 / 0.588 |

Event/awareness counts matched for each pair: 1024/2048 for gems and 3254/31756 for mixed. Dense first-exposure work remains the dominant maximum step. These short samples move in different directions; no statistically established native gain/regression is claimed. Both are below 1.0 native 3× headroom before database/browser/inference costs. The remaining candidate, fan-out and long-history work stays open under HE/EPR/PF.

### Offline presentation rerun

Offline Chromium `setContent` executed the actual revised SpeechCaptions, ProgressRing and WorldEvents components compiled through Vite, with fixed non-authoritative anchors and controlled fetch responses. A caption that could not fit remained present but hidden with zero depletion after 4.8 seconds; enlarging the viewport made it visible and started reading time. Its ring advanced and stayed unchanged during a subsequent paused interval. Changing the history scope removed the old evidence immediately while the new scope loaded; a later revision displayed the new-entry notice without extra fetching (two requests for two scopes). There were no page errors. The temporary component entry was removed after observation.

This is not a full PlayCanvas walkthrough, camera projection or assistive-technology certification. Actual graphical placement, PostgreSQL plans/revocation, named-save rewind, real-provider schemas, sustained load and the concurrent-main combined tree remain unqualified in [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification).

## Hearing second review

Scope: feature branch based on `7ec34d9`, without merging the concurrent main changes. Production-only `npm run build` passed after the changes (TypeScript and Vite; the existing large-bundle warning remains). No automated test files or suites were written, edited or run. Paid provider spending was $0. Observation programs, synthetic data, logs and CPU profiles were kept outside the repository; a temporary component build entry was removed before the final build/commit.

### Scoped transcript reads

An in-memory SQLite fixture contained 100,000 global events, 2,000 perspectives for one actor, and 100 understood speech perspectives for that actor. The real HistoryRepository transcript path was sampled 11 times for newest pages of 40 items, followed by full explicit pagination. Before / final median milliseconds:

| Transcript mode       | Before ms | Final ms | Returned / unique records |
| --------------------- | --------: | -------: | ------------------------: |
| Journal               |    10.773 |    0.950 |               2000 / 2000 |
| Talk speech           |    54.780 |    0.911 |                 100 / 100 |
| Selected participant  |    53.919 |    1.134 |                 100 / 100 |
| Selected conversation |    53.770 |    0.915 |                 100 / 100 |

Counts and sampled page endpoints matched before/after; no duplicate IDs appeared during traversal. These measurements exclude fixture construction, disk/fsync, networking, PostgreSQL, concurrent narrations and UI cost. They demonstrate removal of the global-history access path in this fixture, not a production throughput guarantee.

### Linguistic evidence and empty database batches

The actual consolidation policy was given a fresh world's synthetic awareness containing one understood sentence followed by 513 newer no-word cues. Before the change, the old sentence was selected for consolidation while the newest no-word cues occupied the verbatim pool. After the change, the understood sentence stayed protected and the first 20 no-word cues were eligible for the normal bounded cleanup batch. All 514 sources remained present: selection itself neither deleted nor summarized anything.

The actual RecallService background candidate path, with a non-network vector adapter reporting its supplied sources already indexed, selected only that understood sentence for the actor; an additional NPC with no linguistic sources supplied an empty batch. No embedding calls occurred. The real VectorStore methods with a counting database adapter returned empty reconcile/search results and performed no statements for empty reconcile/write/search batches; an invalid zero vector was still rejected. These isolate policy and I/O gating, not live embeddings or PostgreSQL execution.

### Caption queue residence

Offline Chromium executed the actual SpeechCaptions/ProgressRing code with production CSS, fixed projection callbacks and a controlled monotonic presentation clock. Eight long captions that could not fit remained invisible; before the change they still occupied all active slots when a new short caption arrived after more than 60 active seconds. With the residence limit, the same eight captions remained queued at 59 seconds and through a further 61-second paused interval, then retired after the remaining unpaused second. The new caption became visible with no old active/pending entries and no page errors. This is a component/queue observation, not real PlayCanvas, camera, accessibility or end-to-end event persistence qualification.

### Native stress rerun

Node 22.16.0; seed 73; existing gems/mixed scenarios; 180 native one-second steps, warmup 0, requested speed 3x. Native domain sources are unchanged by this review. Final world digests and event/awareness counts matched before/after for each scenario. These short timing samples vary with runtime load; they establish neither a native optimization nor a regression.

| Scenario                           | Before / final total ms | Before / final p95 ms | Before / final maximum ms | Before / final 3x headroom |
| ---------------------------------- | ----------------------: | --------------------: | ------------------------: | -------------------------: |
| 500 added objects                  |       2131.64 / 2432.02 |         17.60 / 21.42 |           273.37 / 290.42 |              0.469 / 0.411 |
| 10 people, 20 animals, 300 objects |       3069.73 / 3032.23 |           9.24 / 8.70 |         1862.91 / 1866.66 |              0.326 / 0.330 |

Both scenarios remain below 1.0 native headroom at the requested 3x rate, excluding database, browser and inference. Dense first-exposure work remains a bottleneck. A separate native-only burst added 100 people and 500 objects, then committed 250 utterances across 101 NPC speakers cycling whisper/normal/shout: all accepted, 7573.59 ms total, 29.58 ms median, 40.39 ms p95, 75.90 ms maximum, 60.59 MiB final heap. It retained 350 events and 25,636 awareness entries including setup. This is one bounded run, not a sustained capacity pass or a comparison to a different prior fixture.

Remaining qualification stays in [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification): the combined main/feature tree, actual graphical placement, PostgreSQL and concurrency/erasure, live providers, named-save rewind, assistive technology, sustained loads and actor-local indexing invalidation. No old-event migration or re-authoring was added.

## Hearing third review

Scope: the feature branch based on `bdff720`, without merging concurrent main changes. Production-only `npm run build` passed after runtime changes; TypeScript/Vite succeeded with the existing large-bundle warning. No automated test files or suites were written, edited or run. Paid provider spending was $0. Temporary diagnostic programs, synthetic data, logs and CPU profiles were kept outside the repository. There was no new graphical/browser, PostgreSQL or live-provider qualification in this pass.

### Completed-actor indexing work

The actual RecallService indexed a synthetic frozen world with 48 NPCs, each holding 512 linguistic and 512 unrelated awareness entries. A counting, non-network vector adapter reported its supplied sources already indexed. After one initial pass, 15 publications changed one NPC's evidence while the other 47 remained unchanged. The same fixture ran against the baseline and reviewed code.

| Measurement                           |  Before | Reviewed |
| ------------------------------------- | ------: | -------: |
| Initial actor reconciliations         |      48 |       48 |
| Reconciliations across 15 updates     |     720 |       15 |
| Sources supplied across those updates |  368640 |     7680 |
| Median update CPU/await time, ms      | 159.682 |    2.434 |

This measures source preparation, hashing and mock-call overhead, not SQL, network or provider speed. The completed actor cache and direct linguistic projection remove most work for unchanged NPCs in this fixture; roster checks remain linear in the number of actors. Separate executions showed that one actor's corrections/forgetting invalidated only that actor, generation replacement reconsidered both fixture actors, and removed actors left neither completion nor attempt state. Mutable-state and larger fleet qualification remains deferred.

### Budget isolation and dispatch

With two actors missing vectors, baseline background admission stopped after the first actor's denied reservation. The revised scheduler attempted both actor allowances and called the second actor's injected embedding implementation once. This was an inert result, not a paid/network call. A shared provider-failure fixture stopped after one injected failure instead of continuing across actors.

Shutdown and generation replacement while awaiting reservation produced zero embedding calls and nondispatched settlement receipts. A source forgotten during awaited diagnostic preparation also produced zero embedding calls and a cancelled-before-dispatch receipt. These used the actual RecallService with controlled storage/provider adapters. They do not qualify real provider cancellation after a request has already left the process.

### Publication and HTTP revocation

The actual WorldService and SQLite repository emitted and forgot real speech. A delayed background publication queued after forgetting did not restore its vector. A second reproduction created the delayed callback inside an actual commit notification: an initial staged publication gate inherited a stale AsyncLocalStorage reentrancy marker, bypassed the mutation queue and left one vector after invalidation. The final shared recall-publication turn explicitly leaves that context; the same overlap produced zero concurrent writes and zero remaining vectors, without a storage error. The vector adapter counted writes while the SQLite forgetting transaction was deliberately held; this is not production pgvector evidence.

The actual foreground RecallService exhibited the corresponding baseline problem: while forgetting was held after invalidation, it wrote 32 vectors and a query cache, resolved its context, and retained the forgotten vector. The reviewed path queued publication, observed the completed forgetting snapshot, rejected the stale context and issued neither write. A separate unchanged-scope run resolved normally and wrote the 32 vectors and query cache. Generation and privacy checks are now inside the same fresh turn for both recall paths; this does not certify all other derived writers.

A real local HTTP `/api/history?speechOnly=true` request was held after its scoped read, then its source was forgotten. The late response returned 400 with a refresh explanation and no stale transcript text; a new request returned 200 with empty items/messages. Stable native state and history operations had no storage error. This covers the response fence with actual HTTP/SQLite, not concurrent PostgreSQL or every active-conversation switch.

### Byte-aware embedding requests

The real embedding adapter rejected a count-only batch of 32 individually valid 1200-character CJK texts: its JSON input was 115297 bytes, above its 64000-byte bound. The shared planner yielded 17- and 15-source batches of 61252 and 54046 bytes; both returned valid results through an injected in-memory transport and all 32 source IDs were preserved. Forty JSON-escaped texts with a query prefix produced five valid eight-source batches of 57654 bytes each. Empty and individually oversized optional sources were skipped without truncation; a remaining valid source stayed eligible.

Seven transport invocations in this observation were in-memory fixture functions; there were zero external requests or charges. The measurements demonstrate adapter admission, encoded-byte accounting and source correspondence, not live-model quality. Background speech uses all planned batches; foreground recall takes one bounded batch, preserving its spending/call allowance. Invention-definition batching remains separate pending INV work.

### Native stress rerun

Node 22.16.0, seed 73, existing gems/mixed scenarios, 180 one-second native steps, warmup 0, requested speed 3x. Baseline and reviewed worktrees ran sequentially on the same machine. Final world digests and event/awareness counts matched for each pair: 1024/2048 for gems and 3254/31756 for mixed.

| Scenario                           | Before / reviewed total ms | Before / reviewed p95 ms | Before / reviewed maximum ms | Before / reviewed 3x headroom |
| ---------------------------------- | -------------------------: | -----------------------: | ---------------------------: | ----------------------------: |
| 500 added objects                  |          1533.92 / 1462.35 |            11.09 / 10.86 |              164.50 / 151.90 |                 0.652 / 0.684 |
| 10 people, 20 animals, 300 objects |          2108.20 / 2238.72 |              7.82 / 7.46 |            1177.29 / 1271.93 |                 0.474 / 0.447 |

These short native timings vary in both directions; the pure awareness projection extraction preserves outcomes and is not a claimed native optimization. Both scenarios remain below 1.0 native 3x headroom before database/browser/inference work. Dense first-exposure and required recipient fan-out remain EPR/PF limits, not solved by skipping optional background indexing.

[HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification) retains combined-main, graphical, PostgreSQL, live-provider, named-save, accessibility and sustained-load qualification. The [TODO](../maintainers/TODO.md#hearing-third-review--deferred-regression-coverage) records automated regression cases. This review adds no historical-event migration or re-authoring policy.

## PostgreSQL history read fencing

October 1, 2026, `codex/save-editor-family` based on local `main` `add92ccb` (including `origin/main` `0382be76`). A real local HTTP server and `WorldService` used a private disposable PostgreSQL cluster, a new database for each run, the bundled world, no configured provider and `AI_BUDGET_USD=0`. A temporary probe outside Git held specified repository/profile awaits after their result had been read, performed an authorized mutation, then released the HTTP request. This qualifies the read boundary with concurrent operations, not a graphical browser or a provider decision.

| Held read and concurrent change                                    | Observed late HTTP result                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Journal profile lookup; forget the speech already read             | 400; the forgotten words were absent                            |
| Active conversation transcript; leave that conversation            | 400; retry for the former active conversation also returned 400 |
| Transcript; replace the controlling tab's lease                    | 403                                                             |
| Transcript; append ordinary new speech                             | 200; a fresh page returned the appended speech                  |
| Transcript; load a current-format save, replacing the timeline     | 403                                                             |
| Optional speech-job lookup; forget the speech already read         | 400; the forgotten words were absent                            |
| World Events page; replace the controlling tab's lease             | 403                                                             |
| Transcript; rebind the account's actor through the authority owner | 403                                                             |

The earlier same-PostgreSQL HTTP check also held a transcript query across actual forgetting, then observed a 400 late page without its text and a clean 200 fresh page. World Events uses the same final authority/epoch fence and rejected its held page. The Talk history hook and Journal component now discard retained pages immediately when the viewer's world, actor, access scope, timeline or history epoch changes; older active-conversation requests identify the conversation they began with. `pnpm typecheck` passed after the server changes. This is focused manual concurrency evidence; HE-T06/07's larger pagination, browser, accessibility and scale matrices remain open. There were no Jev calls or paid charges ($0).
