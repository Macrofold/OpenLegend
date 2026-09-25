# Hearing, captions and perceived-event delivery

## Scope

Focused implementation plan for [Hearing and speech](../hearing-and-speech.md), [Timed UI](../timed-ui.md) and [Perceived World Events](../perceived-world-events.md). This is a cross-layer feature slice using EPR/NC/SW/CR/PF owners, not a replacement event, conversation, memory or performance program. HE01–HE04 implementation is delivered. HE05 records measured native/offline DOM work separately from pending full-scene, provider and scale qualification. Implementation is not broad acceptance.

Do not write or run automated tests for this requested pass. Future automated cases live only in [TODO](TODO.md#hearing-captions-and-perceived-events--deferred-validation). Production build, manual execution and native stress profiling are distinct from automated suites and are required during gameplay implementation. Do not claim live model quality from native fixtures. The total paid authorization is $10 for the task, not per agent/provider; start with zero paid calls.

## Delivery order

### HE01 — Acoustic policy and rich exposure

- [x] Add continuous source/received/background/floor values and the three-threshold policy through existing sense/module admission. Specify intensity transmission semantics, review starter coefficients and source presets, retain ordered geometry and conservative source-specific audience bounds. Remove no-longer-valid fixed-radius assumptions only with their callers migrated.
- [x] Resolve acoustic policy and sense pins through current world validation, preserving native sleep/life/capability rules and separate self-expression evidence. Development compatibility follows the current [save/load policy](../save-and-load.md#active-development-policy), not a per-feature schema gate. Past utterances are not re-heard or remasked.

### HE02 — Speech admission and durable listener evidence

- [x] Extend talk/player schemas and native say metadata with volume. Preserve volume through fallback/retry, request digests and model adapters. Record one immutable projected result per listener at event-time commitment; deterministic fragments and recognition/direction travel through existing awareness/history transactions.
- [x] Migrate all full-text/boolean-hearing consumers coherently: hot and cold history, context, recall, embeddings, Narrator, reaction intake, social appraisal, commitments, teaching, catalogue and conversation eligibility. Never ship partial UI while models or another endpoint still receive full secret text. Retain existing exactly-once event/response behavior and source scopes.
- [x] Preserve unknown roles during actor initialization; remove raw-event context/retry fallbacks. Require intelligible original evidence before interactive decision dispatch. Reject generic committed-speech rewrites and persist awareness importance changes; preserve permitted durable non-speech edits after hot consolidation.
- [x] Share the linguistic speech-pool policy across consolidation and background embeddings; exclude no-word cues from the automatic dialogue window while retaining them as normal evidence. Skip SQL for empty vector source batches.
- [x] Skip completed unchanged immutable NPC inputs before speech materialization/reconciliation; partition attempt fences by actor. Reuse awareness projection and newest linguistic evidence, keep reservation denial actor-local, and retain shared provider-failure stopping.
- [x] Pack background speech and foreground recall against shared adapter count/UTF-8/JSON limits. Revalidate speech at actual dispatch and serialize bounded background speech and foreground vector/query-cache publication with mutation/forgetting; bypass inherited reentrancy context when entering the publication turn.

### HE03 — Caption and lifetime UI

- [x] Reuse React overlay and renderer projection; add SpeechCaption, the small reusable progress-ring primitive and presentation lifetime helper. Add composer volume control and reading preferences without changing work-bar/cooldown semantics.
- [x] Support overhead association, coarse listener-ring placement, neutral fallback, current-authority clipping, paused/hidden behavior, bounded queues, stable deduplication and same-world restore reset. No frame-level acoustics, persistence, RNG or model calls.
- [x] Start reading lifetimes only on fitted visible placement and preserve time while layout-hidden. Add chunk counters, non-repeating full-utterance announcements, bounded pending priority, full-rectangle collision checks, vertical/behind-camera safeguards, smaller-radius fallback and the specified 0.5-metre historical-bearing cutoff. Graphical qualification remains HE05.
- [x] Bound continuously hidden/pending caption residence independently of the reading ring, using the existing presentation clock; pause still freezes both. This prevents permanently occupied display slots without deleting history.

### HE04 — Comprehensive player World Events

- [x] Add a read-only launcher below Journal and type filters including Speech. Reuse common event projection and durable scoped history, with server filtering before keyset pagination, cold-history coverage, new-entry scroll behavior and revocation/restore invalidation. Keep the normal viewer separate from god editing.
- [x] Ensure publication notices include eligible events suppressed by the compact Journal feed. Reading/refreshing history never creates a new caption or reaction.
- [x] Index existing perspectives by actor/order and actor/type/order; use matching expressions and deep keyset seeks. Resolve commit evidence once per actor and hash common event text once. Isolate UI scope in the same render, abort stale requests, memoize rows and remove quadratic page deduplication.
- [x] Route Talk/Journal reads and watermark lookup through the same actor-scoped indexed perspective expressions, preserving participant/conversation filtering and existing transcript behavior.
- [x] Fence Talk/Journal HTTP responses after all awaited reads against actor/timeline/history changes and active-conversation replacement, preserving the existing World Events response guard.

### HE05 — Runtime and performance qualification

- [x] Integrate main through `03105fed9209c126e4e69e9faeb4687f42d1e74a`, preserving physical contact, nonblocking memory pressure, upstream content/retention rules and listener evidence. Integration preserves checkpoints with a connector-published merge rather than an unsafe force rebase.
- [x] Add conservative native work pruning and bounded snapshot slices at the authored visual-discovery cadence. Keep one-second physics/sequence/commitment boundaries, stop early on occurrences/restriction changes, retain single-step contact and fresh-root evaluation, and account actual host debt. Broader 8× qualification remains below.

- [x] Run the production-only build without invoking `check`, Vitest or Playwright suites. Native/SQLite/HTTP observations cover clear/partial/unintelligible speech, volume, durable pagination, unchanged fragments after same-format database restart and an unheard recipient that causes no paid interactive dispatch. [Verification](../verification.md#hearing-runtime-and-performance) records the scope and failures separately.
- [x] Run existing native baseline scenarios on the same machine and inputs before/after implementation, using unique output paths:

```sh
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/gems.json /tmp/hearing-gems.cpuprofile > /tmp/hearing-gems-report.json
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed.json /tmp/hearing-mixed.cpuprofile > /tmp/hearing-mixed-report.json
```

- [x] Run a bounded native speech fan-out experiment with 100 added actors, 500 objects and 250 accepted whisper/normal/shout utterances. It measures native transitions, not database, browser or provider capacity. Reusing parsed source words avoids per-listener tokenization; this does not establish a statistically significant latency improvement.
- [x] Run the actual caption/ring and World Events React components in offline Chromium with fixed projected anchors, alongside a real native HTTP history endpoint. Observe countdown progression/pause, unknown-source and partial text, 390-pixel wrapping and history rows. This is DOM evidence only.
- [ ] Qualify real PlayCanvas head/directional anchoring, camera yaw/pitch/projection, floor cutaways, visibility loss, collision/overflow, 1/4/8 captions, settings and SSE reconnect in a graphical browser. Local HTTP browser navigation was blocked by administrator policy and WebGL was unavailable; do not bypass that policy or claim a full game walkthrough from fixed DOM anchors.
- [ ] Qualify PostgreSQL query plans/late-response and revocation behavior, manual named-save rewind, actual speech/response provider schema compatibility, live naturalness and accessibility under explicit capped execution. Native injected provider non-execution is not live provider evidence.
- [x] Re-run production compilation and native stress; exercise 100,000 synthetic global events with 2,000 actor perspectives, deep All/Speech pagination, and an isolated before/after SQL writer fan-out. Inspect SQLite index/range plans, unknown-source initialization, guarded edits, durable importance and cold non-speech updates. Re-run offline React layout-hidden lifetime and immediate scope clearing. [Review evidence](../verification.md#hearing-review-hardening) records exact scope and measurements.
- [ ] Extend the measured disk-SQLite speech/native envelope to longer sessions, PostgreSQL, graphics, live AI and larger active populations. Receiver geometry reuse, actor-indexed history and append ownership are delivered; changed-pose membership scans, native dense discovery/status work, cold latency and required recipient fan-out remain measurable limits. Keep this in the EPR/PF owners, not a second speech scheduler.
- [x] Repeat scoped Talk/Journal pagination on a 100,000-event SQLite fixture, run the actual consolidation/background candidate policy with no-word cues, observe zero empty-batch database calls, exercise stale hidden captions and pause in offline Chromium, and rerun native stress and a bounded speech burst. [Second-review evidence](../verification.md#hearing-second-review) records these measurements without a production-capacity claim.
- [x] Measure mostly-unchanged NPC indexing, independent budget denial, dispatch cancellation after reservation/diagnostic yields, inherited-context publication overlapping actual forgetting, stale transcript rejection and byte-bounded Unicode/escaped embedding requests. Rerun production build and existing native stress. [Third-review evidence](../verification.md#hearing-third-review) distinguishes actual service/SQLite execution from counting/in-memory provider adapters.
- [x] Reconcile the feature onto `fdcbd31fc9e4eb31daaf00d997648aba588c8577`, including its agent guidance, status effects, knowledge and camera/cognition changes. The combined source passes production TypeScript and Vite compilation. This is integration/build evidence, not graphical, provider or scale acceptance.
- [x] Extend the existing native stress runner with explicit reference/slice execution modes and actual consumed-time/slice-size reporting; no automated suite or alternative runtime is introduced.
- [x] Reuse immutable receiver footprints across nonspatial actor changes, bind ray-bound arithmetic once, and index native supplies in the existing roster. Observe matching receiver ordering/variants and an identical evolved-world final digest. [Evidence](../verification.md#hearing-8x-runtime-qualification) records the isolated costs and remaining limits.
- [x] Exercise the actual WorldService, disk SQLite commits and public projection at 8× with 344 entities and eight utterances per real second for 60 seconds. All 480 utterances committed; 28,806 simulated seconds advanced in 60.06 wall seconds, with less than one simulated second of remaining debt. This is the measured workload, not a full-engine population guarantee.
- [ ] Qualify 8× simulation (480 native one-second steps per wall second at the base clock ratio) beyond the measured envelope with matched cold/warm native and speech/persistence workloads. Preserve every eligible recipient, committed utterance, event ordering and event-time privacy. Optional indexing, publication and captions may coalesce only under their existing contracts; a budget limit is never inaudibility. Record population, density, speech rate, history size and bottlenecks alongside headroom; do not generalize a single host or pure native result to unlimited capacity.

- [ ] Complete a narrow in-place upgrade for a saved pre-hearing manifest and its existing perspective shape under SL01/SL09 before claiming that compatibility. Do not remask historical utterances, replace the world, silently fill unknown identities, or weaken validation for newly committed speech. The integrated contact/item/status upgrader and same-hearing-state restart are already delivered; this gap is not a new legacy runtime.

## Deferred expansion

Keep room/portal propagation, frequency bands, physical timed speech, actual overlapping acoustic processes, voice recognition, language comprehension, native noise effects and sophisticated collision layout deferred until a concrete consumer justifies them. Add resulting implementation needs to the appropriate EPR/SW/NC/CR/INV owner rather than widening this slice into a general audio engine.

- [ ] Replace the finite UI event-type menu with registry-provided family/filter metadata once event registration exposes an actual runtime catalogue. All perceived event types remain available now; do not create a second event registry only for this filter.
- [ ] Define and implement dedicated committed-speech re-authoring only after [D63](../../archive/05-project/open-decisions.md#d63--re-authoring-committed-speech) is settled. Generic editors currently reject speech text rewrites; guarded deletion/importance updates are not deferred.
- [ ] Hydrate an explicitly retried chat's original evidence from actor-scoped cold history when its hot awareness has been consolidated, with revocation/generation checks before paid admission. Until then it becomes stale; raw text matching is not a recovery path.
- [ ] Add an explicit caption-overflow/gap notice backed by authorized event history; bounded display queues currently retain history but do not show a dropped-caption count. Consider a replayable live event cursor only with the common SSE/EPR delivery owner.
- [ ] Qualify long open event panels before adopting the existing or a narrowly scoped windowed-list helper. Paging is explicit and row construction is memoized, but accumulated DOM rows are not virtualized or globally bounded.
- [ ] Profile the remaining cheap background actor-roster sweep and changed-actor retained-pool selection at sustained scale. Completed immutable actors now skip reconstruction and SQL; finer linguistic-dirty wakeups, per-actor allowance retry cadence and fairness during long initial catch-up remain future CR/PF work. Preserve startup recovery, forgetting/corrections, attempt fences, ownership changes and scope resets.
- [ ] Apply the dispatch/publication qualification discipline to other derived writers, including invention embeddings, under their CR/INV owners. Background speech and foreground mixed-recall vector/query-cache writes now share a fresh mutation turn, but this is not an application-wide race audit. Qualify direct/late external corrections and source revisions in each remaining family without a parallel transaction framework.
- [ ] Extend byte-aware batch planning to invention-definition retrieval under INV when that path is next qualified; its current count-based batches retain adapter rejection. Individually oversized optional memories need an explicit semantic-chunking policy, not silent truncation. Background speech and foreground recall already use the shared planner.
- [ ] Pin/qualify tokenizer/runtime behavior for cross-runtime deterministic utterance admission before heterogeneous servers replay the same new event. Stored fragments do not reroll; this does not certify identical Intl segmentation across all runtimes.

No acceptance checkbox becomes complete merely because a specification or implementation exists. Preserve older valid regression tasks.
