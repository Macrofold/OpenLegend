# Hearing integration with current main — 2026-09-27

The sections through “Remaining gates” record the earlier `a39311dc` integration. The final combined native-action/performance rebase is qualified separately under [Current-main rebase](#current-main-rebase).

## Scope and provenance

This record qualifies the combined implementation under [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification) and the [integration plan](../projects/completed/hearing-main-integration.md). Source: hearing `c4379246b8db98974de319e1f5315439ac8176bd`, preserved at `codex/hearing-before-main-20260926`. Initial rebase base: `f551e3d8`; final refresh includes main's `a39311dc887797af267aba7b6ab9038a1a863af0` local sign-in recovery. The original published branch and main were not rewritten. The local integration branch consolidates the source tree, then records the integration review corrections.

Native runs used Node **22.23.2**, the pinned frozen lockfile, seed **73**, disposable SQLite worlds and **`AI_BUDGET_USD=0`** on the same local machine. No provider calls or charges were made. Raw saves, logs and CPU profiles remain outside the repository. These observations do not supersede the broader unresolved acceptance matrix in HE05, PF03/PF09 and SW08.

The integration exercised current-format persistence and restart. No old-radius conversion, historical re-hearing or automatic reset was introduced; existing main conversions were retained. Ongoing development compatibility is governed by the [root policy](../../AGENTS.md#development-save-policy).

## Integration corrections

- Preserve main's elapsed-time native continuation, start/rate/end status phases, deterministic work admission, contribution/exposure indexes, tagged placement, contact geometry, relational cold history and current renderer. Remove the superseded fixed-step hearing loop and four-second acquisition parameter.
- Restore volume and utterance metadata at native speech admission. An intended recipient does not grant acoustic access; accepted speech does not promise delivery. Teaching still requires intelligible reception.
- Keep event-time listener fragments and identity in command responses, history, recall and captions. Use main's scoped cold-evidence reader for interactive speech retry, without matching raw source text. Reject generic edits to committed speech evidence.
- Fix history's request-scope comparison; retain main's local sign-in recovery; include permitted encounter perspectives in World Events. Actor-scoped revisions avoid notifying unrelated observers about unheard speech.
- Preserve main's collision sweep skin in the extracted segment query. Copy conversation-cache pose coordinates rather than retaining draft references. Retain supply-ID indexing while resolving live quantities and visibility.
- Keep main's durable general memory indexer instead of the source's older speech-only queue. Restrict automatic dialogue/verbatim selection to linguistic evidence; ordinary cues retain main's ordinary-memory policy. Check generation, revocation and source revisions at actual embedding dispatch and derived publication, with provider waiting outside the mutation lane.
- Fix a measured native-loop regression: `acquireEventAwareness` materialized the whole changed entity dictionary for every visual observation. The CPU profile showed repeated shallow copies causing a 9.65-second native step and overload. It now reads only actual recipients through the existing mutation owner. Successful reruns below include this correction.
- Reconcile canonical owners, D66, HR01–HR08, current task status and joint time/hearing guidance. Earlier source performance evidence remains explicitly historical.

## Static and build checks

- Pinned Prettier on changed files, full `pnpm typecheck`, production `pnpm build`, and `pnpm config:check`: **passed** on the reviewed integration tree.
- No automated unit, integration or browser suites were authored or run, following the repository's default verification policy. Required CI remains a merge gate.
- No dependency versions or lockfile changes were needed. The production build retains Vite's large-chunk warning; this work does not qualify bundle-size reduction.

## Focused native, HTTP and browser observations

A one-off native/service/HTTP scenario exercised real command admission, SQLite commits and public routes. The completed run used valid terrain positions `(3,0,0)` and `(18,0,0)` and the normal voice. It observed partial linguistic evidence, rejected a generic committed-speech rewrite, and preserved independent parent/child histories through nested append/fork publication. A divergent history returned no append proof.

The authenticated World Events route returned exactly the acquired segments. One-row keyset pages kept their original watermark after a newer utterance; a cursor reused with another filter was rejected. Conversation history returned successfully under its request scope. An invalid session could not read history. Closing and reopening the current-format SQLite world preserved the original speech capsule byte-for-byte and expired the earlier history cursor; storage remained healthy. Local evidence: `/tmp/hearing-current-lifecycle.log` and `/tmp/ol-hearing-lifecycle-final-20260927`.

Earlier attempts of this disposable scenario were invalid verification fixtures: acting while paused produced no utterance, and moving outside the authored terrain correctly failed restart validation. They were corrected before the successful run; no production validation was relaxed.

An actual in-app browser displayed the PlayCanvas scene, clear speech above a known sprite, and partial text with explicit gaps. The World Events Speech filter showed the same partial words. Native admission at 30 metres yielded a wordless normal-voice cue, no whisper awareness, and a clear anonymous shout; public evidence contained neither hidden speaker identity nor hidden words for the weaker volumes. The browser also exercised 8× and pause controls and local sign-in recovery. These were focused presentation observations in a disposable sensory scene, not qualification of terrain placement, all camera modes, accessibility or exact 1×/8× caption duration. A final browser pass reopened the valid current-format lifecycle world: prior partial utterances appeared in World Events without replaying captions, and a new partial caption remained visible while the world was paused. No paid actor response was requested.

## Matched load observations

The checked-in [driver](../../scripts/stress-hearing.ts) offers speech independently of the tick loop, awaits actual commits, projects/encodes views, records lateness/debt and drains producers before closing SQLite. Main baseline `a39311dc` used the same driver and pinned Node 22.23.2. Its older hearing behavior receives the same offered commands but does not implement graded volume/fanout, so this is a workload comparison, not identical semantic work. Runs were sequential; single samples are not statistical capacity guarantees.

All matched runs requested 8×, added ten people, twenty animals and 300 objects to the base world, and used scattered valid placements. Reported entity counts are final counts; native deaths/consumption can change them.

| Run                            | Duration / offered speech | Accepted / scheduled | Effective speed | Speech median / p95 / max ms | Tick median / p95 / max ms | Projection median / p95 ms |
| ------------------------------ | ------------------------- | -------------------- | --------------- | ---------------------------- | -------------------------- | -------------------------- |
| Main, native only              | 15 s / 0 per s            | 0 / 0                | 7.941×          | —                            | 32.10 / 130.33 / 977.15    | 5.82 / 9.19                |
| Integrated, native only        | 15 s / 0 per s            | 0 / 0                | 7.934×          | —                            | 27.96 / 72.98 / 594.97     | 5.69 / 9.40                |
| Main, speech load              | 20 s / 8 per s            | 160 / 160            | 7.715×          | 31.97 / 83.74 / 1323.79      | 66.00 / 492.17 / 1451.07   | 6.84 / 30.51               |
| Integrated, speech load        | 20 s / 8 per s            | 160 / 160            | 7.423×          | 40.32 / 113.27 / 786.35      | 114.01 / 639.66 / 2024.29  | 7.35 / 38.81               |
| Integrated, longer speech load | 60 s / 8 per s            | 480 / 480            | 7.980×          | 46.25 / 120.21 / 845.10      | 130.22 / 1309.63 / 4086.96 | 7.04 / 34.38               |

Final pending simulation debt was zero in each successful run; storage errors were null. The longer run advanced 28,846.45 simulated seconds in 60,248.26 ms wall time, ended with 366 entities, and recorded speech scheduling lateness median/p95/max **5.10 / 210.33 / 756.14 ms**. The shorter runs ended with 376 entities. Native-only heap was 86.58 MB on main and 82.60 MB integrated; the 20-second speech heaps were 146.08 MB and 301.85 MB, and the longer integrated run ended at 120.25 MB. These are end snapshots, not peak or retained-heap measurements.

The native-only sample shows no material throughput regression and lower tick tails. New graded delivery adds work; the short speech comparison is slower, and the longer sample still has multi-second tick-call tails despite nearly achieving requested throughput. Do not claim sustained strict 8×, latency parity, dense-world qualification or bounded long-lived heap. The earlier integrated overload failure is a measured, fixed regression—not a passing run. Further cold/tail/dense acceptance remains under HE05/PF03/PF09, without dropping legitimate listeners or weakening work accounting.

Private reports are `report.json` beneath `/tmp/ol-hearing-baseline-native-20260927`, `/tmp/ol-hearing-integrated-native-20260927`, `/tmp/ol-hearing-baseline-node22-20260927`, `/tmp/ol-hearing-acquisition-fix-20260927`, and `/tmp/ol-hearing-final-60s-20260927`. The failed profile is `/tmp/hearing-integration-inspect.cpuprofile`, with diagnostics in `/tmp/ol-hearing-inspect-20260927/failure.json`. An earlier baseline run used Node 24; it is not included in the matched comparison.

## Stationary cache observations

The [cache driver](../../scripts/stress-hearing-cache.ts) now initializes main's collision runtime, then exercises stationary immutable synthetic listeners with no database, navigation or provider. Sixty measured warm passes per population returned complete result digests. Cache overflow is evaluated exactly; this is query-cost evidence, not dense simulation acceptance or independent equality proof.

| Listeners | Queries/pass | Cold ms | Warm median / p95 / max ms |
| --------- | ------------ | ------- | -------------------------- |
| 96        | 192          | 4.50    | 0.162 / 0.353 / 2.420      |
| 300       | 600          | 4.78    | 0.551 / 1.719 / 3.759      |
| 600       | 1200         | 1.62    | 1.454 / 3.149 / 4.532      |

Local report: `/tmp/hearing-cache-integration.json`. These synthetic positions are not a navigation/spawn qualification. Population order also warms the process/JIT; cold figures should not be compared as isolated process starts.

## Remaining gates

HE05 retains required CI; PostgreSQL plan/capacity checks; delayed live-provider revocation/restore and strict volume-schema qualification; broader graphical/accessibility/long-caption coverage; and cold/dense/long-lived performance qualification. Native fragment checks do not prove model quality. Existing source TODO cases remain unrun rather than being marked complete from this focused evidence.

## Current-main rebase

The owner requested a fresh merge branch. `codex/hearing-ready-for-main` retains one hearing/policy commit above main `45210d41075dc1db09dbd48f562b76b8b39bcc10`. Reconciliation first included local main `75ee15f7` (native actions), then incorporated `45210d41` when the ongoing performance work was committed and published. The previous squash `a0e1fdac` remains at `codex/hearing-main-integration`. Other checkouts and published branch history were not rewritten.

Resolved the code overlaps by keeping bounded `HistoryBatch` writes and immutable pre-transaction preparation, indexing only changed-event evidence, and retaining committed cold perspectives without raw-speech fallback. Private acquisition retains main's bounded owner batches, first-person templates, observed modality and reaction classification; external speech retains per-listener capsules. Navigation invocation/follow and speech volume coexist in the same response schema/prompt, identified by `cognition-v17-grounded-actions-hearing`. Main's later vision preparation, cognition readiness, source-aware flushes, profile caching and adapter batching remain. Newly introduced in-place migration-policy references now route to the protected root policy.

On the final combined source, full TypeScript and production build passed. Changed-file formatting, configuration, guidance and local-link checks also passed. Existing PlayCanvas worker externalization and client-bundle size warnings remain. No automated unit/integration/browser suites or paid providers ran.

Disposable Node 22.23.2 / seed-73 / zero-budget runtime exercises passed:

- Real HTTP and SQLite: partial speech, exact acquired fragments in World Events, scoped conversation history, stable pagination, mismatched-filter and unauthorized-request rejection, immutable speech edits, nested append forks, restart preservation and old-cursor expiry.
- Combined response: whisper plus native follow accepted independently through the runtime schema and response owner; exact replay retained the receipt, append proof survived, and native continuation retained follow. Twenty-four naturally generated private acquisitions retained sole-observer audiences, observed modality, `observed_event` triggers and first-person text.
- Cold history: retiring hot awareness through the consolidation owner, then editing a non-speech event through the event owner preserved its durable listener perspective through bounded publication. Storage stayed healthy. Prompt inspection confirmed both volume and navigation invocation; this is not model-quality evidence.

The final comparison used the clean main checkout at `45210d41` (verified before and after), the same driver/Node/host, disposable disk SQLite, ten added people, twenty animals and 300 objects. Both sources ended with 376 entities. Runs were sequential and single-sample; the baseline has simpler speech semantics, so offered commands are matched but semantic work is not identical.

| Source / offered speech    | Duration | Accepted / scheduled | Effective speed | Speech median / p95 / max ms | Tick median / p95 / max ms | Projection median / p95 ms |
| -------------------------- | -------- | -------------------- | --------------- | ---------------------------- | -------------------------- | -------------------------- |
| Main, native only          | 15 s     | 0 / 0                | 7.940×          | —                            | 26.85 / 85.44 / 419.63     | 4.77 / 8.84                |
| Integrated, native only    | 15 s     | 0 / 0                | 7.977×          | —                            | 24.70 / 77.51 / 422.13     | 4.12 / 6.92                |
| Main, 8 utterances/s       | 20 s     | 160 / 160            | 7.982×          | 24.68 / 61.37 / 508.53       | 31.88 / 136.32 / 538.16    | 4.65 / 6.40                |
| Integrated, 8 utterances/s | 20 s     | 160 / 160            | 7.983×          | 30.63 / 71.03 / 476.58       | 31.18 / 103.11 / 509.12    | 4.70 / 6.57                |

All final runs had no storage error or unattempted speech. The integrated native-only sample retains main's throughput; graded speech adds roughly six milliseconds to the median speech transaction in this workload, while overall throughput is similar. These observations do not establish universal latency parity, sustained dense capacity or a leak bound. Final speech-run heaps were 115.35 MB on main and 108.43 MB integrated; these are end snapshots, not measured peaks or collected retained heap.

Private final reports are under `/tmp/ol-hearing-final-{main,integrated}-{native,speech}-20260927/`; runtime logs are `/tmp/hearing-final-combined.log` and `/tmp/hearing-final-lifecycle.log`. An earlier baseline wrapper selected the wrong workspace aliases, and an initial combined wrapper called a nonexistent cleanup method; neither is passing evidence. Corrected wrappers ran against the final source and closed their owned stores. The preceding `75ee15f7` measurements remain intermediate observations, not this final comparison. Existing HE05 and AR/PF requirements for CI, broader graphical/accessibility, PostgreSQL, live-provider and sustained/tail qualification remain open.

## Floor-hearing regression — October 1, 2026

On `codex/shadow-quality`, rebased onto refreshed `Macrofold/OpenLegend origin/main@0382be76648879cf8a8397ad6c3534b4431916f5` (rebased HEAD `57012a04` plus this correction), repaired the existing spatial-world integration case against the implemented graded-hearing contract. No acoustic policy or production hearing logic changed.

At the fixture's vertically aligned terrain/lookout positions, normal speech arrives at 46.9897 dB SPL with an 18.9897 dB clarity margin: clear words, blocked sight and no identified speaker. Whispering arrives at 26.9897 dB SPL with a −1.0103 dB margin and is undetected. The previous assertion treated a sight-blocking slab as an absolute sound barrier. A second outdated assertion expected speech at the actor's feet; the authoritative event uses the existing mouth/ear-height origin.

The repaired test executes both native speech commands and checks the committed listener perspective through `projectEventEvidence`: clear audible words, no hidden actor ID/name or source coordinates; the whisper has neither listener audience membership nor listener awareness. Reach remains blocked across the floor and to the airborne bird. `spatial-world.test.ts` and `kernel.test.ts`: **27 passed**, no skipped tests, no providers. Full TypeScript and production TypeScript/Vite checks pass. This closes the specific SW08 regression, not HE05's broader history/provider/scale qualification. Additional and cumulative task Jev cost: **$0**.
