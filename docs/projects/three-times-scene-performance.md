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
