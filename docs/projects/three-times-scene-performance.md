# Smooth 3× local scene

User-authorized implementation, September 26, 2026. Baseline `a39311dc` on refreshed `origin/main`; isolated branch `codex/smooth-three-times` protects the running game. Expected scope: several hundred runtime lines plus reusable profiling support, reassessed after attribution.

## Target and owners

One player, 20 NPC agents, 20 animals (including the seeded flying bird), and 100 visible objects in a crowded scene at 3×, or 180 game seconds per real second. Measure actual progress, command and publication tails, event-loop stalls, browser frames, SQL work and retained memory. Include cold exposure and a warmed scene; throughput alone does not establish smooth play. No absolute zero-stutter claim follows from finite samples.

Continue PF00/PF03/PF05/PF08/PF09 and PF12.3–PF12.8 under [performance](../maintainers/performance.md), [elapsed time](../simulation-time.md) and [perception/reactions](../events-perception-and-reactions.md). Canonical state/commit ownership stays in WorldService/repositories; cognition uses ActorWork, and presentation consumes permitted deltas. Limits remain in their existing inventories.

## Sequence and candidate work

1. Attribute the live small-world symptom without mutating it. Build one bounded, disposable full-server scenario reusing the existing population builder, metrics and CPU profiler. Compare PostgreSQL with SQLite/native to separate SQL round trips from simulation CPU. Include zero-cost cognition admission, SSE, repeated native actions and actual timer progress.
2. Profile native motion/perception, repeated validation/draft work, SQL writes/reads, cognition wakeups and public projection. Audit bird event/awareness growth and unchanged object work. Rank measured hotspots; retain baseline reports outside Git.
3. Implement the smallest coherent optimizations, repeating matched workloads after each meaningful group. Reuse immutable dependency-valid results and coalesce replacement state; retain action fences, meaningful evidence and explicit-command durability. Consider presentation-only quality/cadence separately from authoritative simulation. Do not add arbitrary salience mechanics unless measurements demonstrate a missing consumed policy and its world owner is explicit.
4. Exercise affected lifecycle/failure cases: movement cancellation, observation loss/wake, stale control, restart and failed database writes. Inspect carried-over branch findings against current owners; do not claim unmerged revision/follow mechanics were tested.
5. Inspect and interact with the loaded browser scene; measure frame/update behavior separately. Review the full final diff, fix notable findings, and reconcile trackers/limits/evidence. Run relevant typecheck/build/format/config checks once at the end; no unit/integration/browser suites.

## Verification and constraints

Use fresh disposable data, separate localhost ports, explicit empty provider credentials and a fixture transport with zero spending. Never reset the player's current world. Use bounded runs and terminate only owned processes. Disk has about 31 GiB free at baseline; keep database/profile artifacts small. Preserve one lockfile and existing dependencies. Reuse diagnostic scripts rather than assembling a new benchmark framework.

Completion: measured bottlenecks addressed, representative 3× full-server/browser scene exercised, actual before/after results and remaining limits reported, changed behavior checked through downstream callers, documentation and final review complete. Broader hosted/population/GPU and paid-model quality acceptance remain separate.

## Progress

- [x] Refreshed baseline, isolated checkout, identified current contracts and initial live metrics.
- [x] Captured reproducible native/full-server/browser baseline.
- [x] Implemented targeted optimizations and iterative comparisons; latest PostgreSQL runs sustain nearly 3×, with cold/warm tail acceptance still open.
- [x] Completed affected lifecycle/failure checks, full diff review and static checks; remaining acceptance is explicitly recorded below.
- [x] Reconciled evidence, limits and focused trackers; delivered reviewed changes to the user's checkout. Capacity acceptance remains open.

### Findings and scope refinements

The bird concern is observer reacquisition, not flight-position storage. Current generic living-source acquisition gives routine native animals the same semantic trigger as a social encounter. Retain raw acquisition/episode identity but give native animals ordinary (zero-importance) acquisition; goal/interest matches and meaningful separate events remain eligible. No new per-object salience editor or general memory classifier is introduced.

Review rejected the tentative middle status-reconciliation skip: its measured gain was within noise and did not justify another zero-time mutation assumption. Existing shared entity roots/spatial/limited-query owners remain; finer changed-target visibility reuse is still PF09/PF12.3. Added coalescing and a bounded diagnostic backlog because inspector snapshots were repeatedly queued while newer versions superseded them; reliable accounting remains independent.

The requested sustained stall-free target is **not yet accepted**. Earlier scene runs retained command/publication tails despite approximately 3× progress. Earlier base and candidate runs both collapsed under a host load above 230 on 10 logical CPUs. Later completed PostgreSQL runs sustain nearly 3×, but still contain cold and warm gaps. Preserve both sets of evidence and keep the target open.

### Base refresh during final review

`main` advanced to `75ee15f7` with native action/revision/follow and perception changes while this task ran. Rebased the isolated branch and reapplied this work, retaining the new encounter batching, feature-change handling, fair/bounded scheduling, history construction bounds and general server profiler. Resolved the bird call at the new emitter owner and shared the parameter ceiling with HistoryBatch. Earlier benchmark numbers remain explicitly tied to `a39311dc`; final static/runtime verification uses the combined tree.

Changed constraints: [SQL batches](../limits/persistence.md#la174), [routine animal acquisition](../limits/cognition.md#routine-animal-acquisition), [diagnostic backlog](../limits/observability.md#diagnostic-write-backlog). Final combined browser sign-in, 3× movement, pause, reload and explicit control takeover passed on a disposable SQLite world; no current-player save was used.

### Continued investigation after native-action merge

User requested continued implementation. Refreshed `origin/main` (`a39311dc`); local `main` and the isolated branch already contain the newer native-action merge `75ee15f7`. Preserve that merge and both copies of the existing changes. Continue under PF01/PF09/PF12 with an estimated 100–300 additional logic lines, subject to measured attribution:

1. Inspect memory eligibility/embedding-queue SQL plans and statement amplification under a fresh disposable database. Compare work counts as well as latency; the overloaded host cannot establish capacity acceptance.
2. Inspect merged perception and native-action callers for repeated visibility/context work; reuse the current semantic owner and prove invalidation before retaining an optimization.
3. Exercise changed persistence through rollback, source correction/forgetting and normal acquisition; use the existing full-server/native/browser fixtures for the combined result. Retain action/control fences and distinct evidence.
4. Review the complete resulting diff, update actual evidence and outstanding acceptance, run final static checks once, and deliver changes to the normal checkout. No automated suites, paid inference, or changes to the active player save.

The continued PostgreSQL run reproduced a background scheduling storage failure that paused the entire world; later tracing also found ordinary write timeouts. Narrow this behavior: an explicitly read-only maintenance scheduling failure defers maintenance for 60 seconds and emits a failed diagnostic; authoritative commit/dispatch failures retain their existing fences and pause behavior. No automatic paid retry or memory deletion is introduced. Skip maintenance metadata reads when neither cleanup, dream review nor reflection can run. This is a consequential failure-isolation change within the authorized performance scope.

The 30-second merged PostgreSQL profile counted 1,294 advisory status checks plus repeated world-head reads. The follow-through removes the separate header read (the result is advisory and ActorWork/current-source selection retain generation fences) and coalesces each actor’s inspections to at most once per real second through existing ActorWork deferral. Unchanged actors remain asleep until their simulation deadline or a real change; this is not periodic polling of every actor.

Continued runtime verification completed: PostgreSQL batch equivalence/rollback, merged native follow/death/locomotion and sleep/wake behavior, HTTP/SQLite rollback with a pending follow action, scheduling-read failure/recovery, and 30/60-second full-server PostgreSQL runs. The last achieved 2.998× with requested endpoint populations; cold and warm stalls remain explicitly unaccepted. Static/review results are recorded in the evidence owner.

## Hearing integration and update latency — September 27

Final browser follow-through adds roughly 90 logic lines for the observed HUD overlap: React measures fixed controls and open panels only when their size, viewport, scale, opening or animation changes; the existing caption placer treats those rectangles as occupied, tries its neutral fallback and pauses reading when no position fits. Verify through the running crowded browser and inspect narrow/scale changes. General modal/panel obstruction remains the broader HE05 qualification.

The owner authorizes reviewing the merged hearing system and redesigning self-imposed behavior/constraints where that improves smooth gameplay. Baseline: local main `61437608`, containing refreshed `origin/main` `45210d41` and the complete hearing integration. Expected additional scope is several hundred logic lines across shared simulation, persistence, publication and hearing consumers; reassess from measured attribution. Preserve useful prior documentation and explicitly identify behavior changes rather than silently removing accepted requirements. The protected development-save policy, private evidence and real accounting remain intact.

1. Add the requested plain-language, documentation-preservation and behavior-change reporting instructions at their existing owners. Confirm the richer importance/urgency/salience design and its actual implementation status.
2. Review the full hearing change and downstream consumers, especially immutable hearing evidence, spatial caches, changed-event persistence, speech/goal cognition, public deltas and UI lifetimes. Reconcile with PF00/PF03/PF05/PF08/PF09/PF12 and HE01–HE05; fix actionable integration defects.
3. Extend the existing disposable full-server profiler with correlated timing for individual long update gaps and representative speech. Use PostgreSQL, zero-cost cognition, seed 73, 3×, 20 agents/20 animals/100 visible objects and movement; distinguish cold/warm intervals and host contention. Reuse private wrappers; no live-save mutation or automated suites.
4. Remove redundant work first; evaluate less frequent routine saving, simpler observation retention and independently scheduled presentation against measured costs. Choose coherent behavior changes within the owner's authorization, document consequences and retained integrity, then implement through the existing owners. Do not create a second writable world, hide lost time or manufacture improvement by omitting workload.
5. Remeasure matched inputs, natural growth and meaningful failure/lifecycle cases. Check current-format restart, immutable partial speech, revocation, pending-action failure, browser actions/captions and sustained 3×. Review the full resulting diff twice or until no actionable findings remain. Run final typecheck/build/config/guidance/changed-format checks once after fixes.

Completion requires delivered integration fixes, measured improvement in update/command tails, representative browser verification and reconciled contracts/limits/tasks. Target roughly 50 ms state delivery, 60 FPS presentation, sustained requested speed and no recurring visible stalls in the requested workload. Report actual cold/warm maxima and p95/p99 separately; no finite run proves a hard maximum. Existing broader population/live-provider/CI qualification is not replaced by this workload. Any remaining requested smoothness gap leaves this task incomplete with its concrete cause, rather than relabeling it as future work.

September 27 delivery review: refreshed `origin/main` and rebased the owned worktree onto `7ee0c0db`, preserving the newly merged narration-failure changes and both changelog entries. No uncertain conflict occurred. Implemented the instruction changes, scoped World Events reads, base-world sighting policy, batched diagnostics, leading publication window and routine route-result buffering. Removed the unused old hearing-radius constant. Rejected multi-statement SQL transport batching after inconclusive measurements. Current-format PostgreSQL hearing/restart and HTTP/SQLite failed-save scenarios passed; crowded browser walking/captions/history were exercised. Full stall-free acceptance remains incomplete under the observed host/database tail delays, and broader caption presentation qualification remains HE05. [Current evidence](../verification/three-times-scene-performance.md#hearing-review-continuation-september-27) records the measured scope rather than closing it as delivered.

## Requested implementation review — September 27

Review the complete uncommitted hearing/performance change against refreshed `origin/main` (`7ee0c0db`, Macrofold/OpenLegend). Preserve the current authored sighting decisions and protected save policy. Expected fixes: about 150–220 logic lines across event policy, optional diagnostics, caption/HUD ownership and profiling error handling; use this existing plan because the review crosses layers.

1. Trace sighting → evidence → interest/attention, navigation completion → routine/durable state, diagnostics batching/failure/shutdown, scoped history and caption layout/lifetimes. Review instructions and full documentation diff for lost meaning.
2. Keep sighting importance, urgency and reasoning eligibility independent at the base-world policy owner; remove any newly hard-coded coupling from generic event recording without introducing a policy framework. Preserve existing numerical outcomes.
3. Fix demonstrated batching/failure and UI lifecycle issues, including unnecessary scene rebuilds on caption-setting changes and repeated attachment/measurement of unchanged captions. Keep one owner for measured HUD layout and no per-frame DOM measurements.
4. Exercise targeted ad-hoc lifecycle/failure scenarios and matched 20/20/100, 3× PostgreSQL profiling. Use only new disposable data and zero-cost providers. Interact with captions/settings in a browser; no automated suites, old-save conversion or reset.
5. Run final static checks once after fixes, inspect the complete resulting diff, and reconcile PF/HE/EPR documentation. Completion is the reviewed/fixed change with accurate evidence and remaining capacity limits; existing full-scene smoothness acceptance stays open unless actually measured.

Review outcome: implemented the independent sighting-policy fields, skipped redundant scans, isolated optional-write/observer failures, separated caption preferences from scene updates, extracted HUD measurement ownership, stabilized caption refs and corrected profiler failure/measurement reporting. Native full-state equivalence, diagnostic failure/drain, browser component and built-game checks passed within the limits in the [review evidence](../verification/three-times-scene-performance.md#requested-implementation-review-september-27). The requested review fixes are complete; the earlier stall-free capacity goal remains open. No new gameplay semantics or limits were selected in this review.

## Startup, scale controls and save latency — September 27 continuation

Owner explicitly authorizes deleting the incompatible local gameplay save and requests further optimization after the Settings scale fix. Refreshed Macrofold/OpenLegend `origin/main` at `1e17fcac`; the clean current main `aba8cdb2` already includes that ancestor and the newer conversation-compaction work, so no history rewrite is needed. Expected scope is roughly 300–600 logic lines across client layout, scoped repository reads/writes and focused measurement; reassess before changing persistence authority.

1. Reproduce Settings → Appearance → UI scale with pointer and keyboard; repair the shared control/layout owner and verify scale, scrolling, captions and persistence after reload.
2. Inspect configured local storage, stop only this game's runtime if necessary, and remove incompatible gameplay state using the existing reset owner where possible. Preserve credentials/accounts and real accounting. Start a newly seeded Ada/animal world at the user's normal URL; no compatibility conversion.
3. Profile the merged full PostgreSQL workload (3×, 20 NPCs, 20 animals, 100 visible objects, speech and fixture cognition). Separate database queue wait, round-trip/statement time, transaction stages and browser frame/update gaps. Include host load and repeat comparable inputs.
4. Apply PF01/PF02/PF04/PF05 priorities from measured cost: reuse already loaded exact/scoped records, eliminate duplicate metadata/history reads, reduce repeated bookkeeping and serialization, and isolate optional writes only when evidence warrants it. Caches must have one owner, bounded residency and transaction/authority/source invalidation; do not add a parallel writable world or release commit ordering casually. Preserve current conversation-compaction lifecycle and exact listener evidence.
5. Stress changed paths and meaningful stale/rollback/failure cases with disposable data. Measure sustained real-browser frames, long tasks and server updates alongside commands; no automated suites or paid providers. Run final static checks after implementation, inspect the complete diff, update owners/limits/trackers with remaining concrete work and reasons.

Completion requires the scale control working through actual UI interaction, fresh local startup, implemented and measured performance improvements, and accurate sustained-browser evidence. The target remains roughly 50 ms state delivery and 60 FPS with no recurring visible stalls at the requested scene; report actual tails and leave unmet acceptance explicit. This is authorization to continue the implementation, not merely produce a plan or repeat a benchmark.

Profiling exposed an additional queue-ownership defect: work waiting behind another request inherited that earlier request's asynchronous context. A three-request runtime reproduction returned first/first/first instead of first/second/unscoped. Fix context capture at the shared queue boundary before using per-commit attribution; verify independent owners, transactions, failure and subsequent admission. This preserves intended request ownership rather than changing gameplay rules.

Further SQL tracing identified visibility-episode order amplification: a subject entering/leaving shifts map ordinals and rewrites unchanged bindings, including batches of 1,428 rows. Episode consumers look up observer/subject keys; their map insertion order has no gameplay meaning. Mark only this record collection as unordered, persist a neutral ordinal, and keep list/entity/history ordering unchanged. This is a codec optimization, with no new database column or legacy conversion. Verify changed-subject-only writes, exact binding values, disappearance/reappearance identity, rollback, same-format checkpoint/restart and full-server latency. Do not weaken episode fencing or retain a disappeared subject to reduce work.

Delivered so far: explicit local gameplay reset/fresh startup, radio CSS repair, bounded committed metadata sharing, transaction-safe coverage hits, narrowed visibility-only invalidation, atomic job updates, grouped record persistence, unordered sight-binding storage, scalar sensory snapshots and queue-context isolation. [Runtime evidence](../verification/three-times-scene-performance.md#startup-scale-and-save-latency--september-27) includes exact SQLite/PostgreSQL save/load/rollback checks and matched-duration 120-second fixture runs; final update gaps were 70/115/334 ms (p95/p99/max) at 3.000×. **This continuation is incomplete:** the browser tool's URL security rejection blocks scale interaction and rendered smoothness checks, and the long server run still contains save-related tails. [PF00/PF01/PF05/PF08/PF14 and HE05](../maintainers/performance.md#current-3-local-scene-follow-through) retain the concrete remaining work and reasons.
