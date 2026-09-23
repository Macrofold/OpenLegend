# Hearing, captions and perceived-event delivery

## Scope

Focused implementation plan for [Hearing and speech](../hearing-and-speech.md), [Timed UI](../timed-ui.md) and [Perceived World Events](../perceived-world-events.md). This is a cross-layer feature slice using EPR/NC/SW/CR/PF owners, not a replacement event, conversation, memory or performance program. All runtime tasks below are pending; documentation does not establish acceptance.

Do not write or run automated tests for this requested pass. Future automated cases live only in [TODO](TODO.md#hearing-captions-and-perceived-events--deferred-validation). Production build, manual execution and native stress profiling are distinct from automated suites and are required during gameplay implementation. Do not claim live model quality from native fixtures. The total paid authorization is $10 for the task, not per agent/provider; start with zero paid calls.

## Delivery order

### HE01 — Acoustic policy and rich exposure

- [ ] Add continuous source/received/background/floor values and the three-threshold policy through existing sense/module admission. Specify intensity transmission semantics, review starter coefficients and source presets, retain ordered geometry and conservative source-specific audience bounds. Remove no-longer-valid fixed-radius assumptions only with their callers migrated.
- [ ] Update current development schema/pins and reject incompatible saves explicitly; no old-save conversion. Preserve native sleep/life/capability rules and separate self-expression evidence.

### HE02 — Speech admission and durable listener evidence

- [ ] Extend talk/player schemas and native say metadata with volume. Preserve volume through fallback/retry, request digests and model adapters. Record one immutable projected result per listener at event-time commitment; deterministic fragments and recognition/direction travel through existing awareness/history transactions.
- [ ] Migrate all full-text/boolean-hearing consumers coherently: hot and cold history, context, recall, embeddings, Narrator, reaction intake, social appraisal, commitments, teaching, catalogue and conversation eligibility. Never ship partial UI while models or another endpoint still receive full secret text. Retain existing exactly-once event/response behavior and source scopes.

### HE03 — Caption and lifetime UI

- [ ] Reuse React overlay and renderer projection; add SpeechCaption, the small reusable progress-ring primitive and presentation lifetime helper. Add composer volume control and reading preferences without changing work-bar/cooldown semantics.
- [ ] Support overhead association, coarse listener-ring placement, neutral fallback, current-authority clipping, paused/hidden behavior, bounded queues, stable deduplication and same-world restore reset. No frame-level acoustics, persistence, RNG or model calls.

### HE04 — Comprehensive player World Events

- [ ] Add a read-only launcher below Journal and type filters including Speech. Reuse common event projection and durable scoped history, with server filtering before keyset pagination, cold-history coverage, new-entry scroll behavior and revocation/restore invalidation. Keep the normal viewer separate from god editing.
- [ ] Ensure publication notices include eligible events suppressed by the compact Journal feed. Reading/refreshing history never creates a new caption or reaction.

### HE05 — Runtime and performance qualification

- [ ] Run the production-only build without invoking `check`, Vitest or Playwright suites. Manually run an isolated no-paid world and exercise clear/partial/unintelligible/undetected speech, unknown sources, volume fallback, directional camera changes, ring pause/speed behavior, filters and same-version restore. Record only observed results in [Verification](../verification.md).
- [ ] Run existing native baseline scenarios on the same machine and inputs before/after implementation, using unique output paths:

```sh
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/gems.json /tmp/hearing-gems.cpuprofile > /tmp/hearing-gems-report.json
AI_BUDGET_USD=0 node --import tsx scripts/stress-native.ts scripts/performance/scenarios/mixed.json /tmp/hearing-mixed.cpuprofile > /tmp/hearing-mixed-report.json
```

- [ ] Extend the existing performance experiment (not an automated assertion suite) with bounded native committed speech bursts and scattered/crowded listeners. Compare a normal case and supported denser cases; do not assume a small map admits 100 spawned actors. Measure cold versus warm geometry, audience candidates/exact checks, required awareness fan-out, masking, persistence, p50/p95/p99 commit latency and heap. Use fixed seeds, explicit deadlines and no providers.
- [ ] Measure 1/4/8 active captions, overlapping labels, camera motion, UI scale, long paginated history and reconnect in the actual browser/server. Native gems/mixed timings exclude UI, database and speech-specific throughput and cannot establish those capacities. Profile before adding caches, extra indexes, worker threads or room graphs. A timeout is incomplete evidence, never a pass.

## Deferred expansion

Keep room/portal propagation, frequency bands, physical timed speech, actual overlapping acoustic processes, voice recognition, language comprehension, native noise effects and sophisticated collision layout deferred until a concrete consumer justifies them. Add resulting implementation needs to the appropriate EPR/SW/NC/CR/INV owner rather than widening this slice into a general audio engine.

No existing implementation or acceptance checkbox becomes complete merely because these specifications exist. Preserve older valid regression tasks.
