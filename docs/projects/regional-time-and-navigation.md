# Regional time and navigation performance

Requested in chat on 2026-09-28 by Mike (project owner) as a go-ahead to implement: elapsed-time, status-effect and navigation performance in the priority order below. This plan is the durable record required by [root planning](../../AGENTS.md#plan-before-implementation). Canonical contracts stay with [simulation time](../simulation-time.md), [base-world time](../worlds/base/time.md), the [boundary catalogue](../maintainers/simulation-boundaries.md) and the focused trackers ([PF13](../maintainers/simulation-time.md#pf13--elapsed-time-simulation), [PF12](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution), [SW06/SW17](../maintainers/spatial-world.md)).

## Baseline, ownership and constraints

- Repository `https://github.com/Macrofold/OpenLegend.git` (remote `origin`). Base: refreshed `origin/main` at `be68b1e0d75baac3c2c9f38948824aa4a98ed0d9`, explicitly specified by the task. Branch `codex/time-nav-performance`, created from that commit with no upstream. No merge into main as part of this task. Rebased on 2026-10-01 at Mike's request onto local `main` at `9ce4b7ad`; the conflicts were main's campfire burn rule, its item-offer deadline and documentation, and the full suite, typecheck and build pass there.
- Owned: `packages/domain/src/{temporal-boundaries,simulation-time,motion-boundaries,flight,status-effects}.ts`, `packages/domain/src/worlds/base/status-effects.ts`, `apps/server/src/navigation/*`, and `packages/spatial` where needed. Small shared edits only: `packages/domain/src/kernel.ts`, `apps/server/src/world-service.ts`. Excluded: invention/World Agent files, all of `apps/client`, perception/intake code (sensory-envelope changes stay in `motion-boundaries.ts` with the seam recorded), save code.
- Four other agents plus `codex/integrate-invention` and `codex/shadow-quality` run in parallel. Shared-file edits are listed in the handoff. No paid model/provider calls (`AI_BUDGET_USD=0`). Disk is nearly full; nothing not created by this task is deleted.
- Timings are shared-host observations: baseline and changed code run back to back on identical input; they are never acceptance claims.

## Stage 1 — reproduction and attribution

A disposable native harness (outside the repository) drives the real `advanceWorldSlices` generator exactly as the server does: one accepted interval per call and a coherent-stop request once eight wall milliseconds have elapsed. Each repetition builds a fresh world, warms to game time 60 and measures exactly 300 further game seconds, offering at most 30 game seconds per call. It records actual game-time progress, calls, intervals, motion slices, wall/CPU time, per-call and longest uninterrupted-resume latency, and digests of final mechanical state (positions, supports, flight/wander timers, needs, attributes, statuses; rounded to 10⁻⁶), the emitted event sequence and audiences, plus awareness counts. A second, uncommitted instrumentation pass times each loop phase and records why each motion slice ended.

- **Staggered flight:** the 806-entity seed-73 mixed fixture of the [matched comparison](../verification/spatial-cadence-main-integration.md#matched-native-comparison) plus 48 copies of `bird-1` with perch waits `180 + i × 0.19` s (854 entities). Baseline: 300 game seconds took 19.0–22.6 s (13–16 game s/s, 0.028–0.033 of 8×) in 204 calls. Every call contained one motion slice because a single slice already exceeded the eight-millisecond stop point. 136 slices ended at a bird's own mid-air corridor turn, 48 at a staggered perch-wait takeoff, 13 at the one-metre sensing bound, 4 at shared mechanical deadlines and 3 at the offer end. Per slice, perception sampling took 46%, publication 18%, rate integration/endpoint reconciliation 15%, start-boundary work 8%, movement 5% and mechanical prediction 4.5%.
- **100 sleepers:** 100 crowded exhausted deer that fall asleep through the authored automatic activation, plus the starter world (126 entities; 101 sleeping). Baseline ranged 0.95–3.35 of 3× across runs (a 0.5-second uninterrupted resume in the worst run), so it still fails robust 3× capacity. 16 of 27 slices ended at the lone bird's one-metre sensing bound; per slice, perception took 25%, rate integration/endpoints 24% and publication 23%.
- **Global synchronization cost:** any single mover's private deadline makes every rate-bearing entity (about 211 in the flight fixture) integrate and reconcile, repeats all start-boundary checks, and forces a whole-world perception sample and publication. Continuous rates dirty every such entity each slice, which also multiplies perception's per-slice snapshot copying and publication finalization.

## Design

The two-level structure from the [cadence integration decision](spatial-cadence-main-integration.md#motion-deadline-implementation-decision) remains: one authoritative `world.simTime`, shared mechanical deadlines, private motion slices, no second per-region authority and no externally visible per-actor clock. Everything below changes which work a slice must perform, never the saved representation.

1. **Private corridor turns (PF13.11).** A mid-air flight waypoint with no wait and no landing emits nothing, reserves nothing and is not observed as an occurrence. The mover traverses such turns inside one slice with a swept check per segment; landing and hovering waypoints remain slice boundaries, and the sensing travel bound applies to total path length. A prototype reduced the flight fixture from 204 to 73 slices (about 3× less wall time) with identical mechanical, event, audience and awareness digests.
2. **Regional rate integration (PF13.11, PF12.5).** Rates captured at a shared interval's start stay constant until its predicted end or a mutation. A slice that only moves bodies defers integration and skips no-op endpoint reconciliation for everything else; the deferred values are applied through the same operators when the shared interval ends, before any occurrence, command or reader that needs magnitudes, and always before a coherent publication. Perception runs before deferred values are applied on such slices, so it no longer copies every rate-bearing entity. Unsupported or uncertain readers force immediate application (conservative fallback).
3. **Exact fleeting sight/contact crossings (PF13.11).** For near observer/mover pairs over a candidate slice, compute the exact visibility intervals of the existing vision predicate (3D range to the observer's vision radius, and line of sight from the eye to the target's three body sample heights against the same shrunken sight-blocking polytopes as `clearSegment`) and the exact body-contact envelope intervals. When an interval lies strictly inside the slice, end the slice inside it so the unchanged sampler records it. The geometry primitive lives in `packages/spatial`; pair selection and the mirrored predicate stay in `motion-boundaries.ts`, with the perception seam documented. Moving-observer sight uses the general bilinear form; any unsupported case keeps the declared sampled fallback.
4. **Status and sleeper follow-ups (PF12.5).** Attribute remaining status applicability, finalization and serialization costs after stages 2–3 and remove measured repeated work in the status owner.
5. **Boundary matrix and net-flow saturation (PF13.16, PF13.12).** Exercise each listed boundary for non-progress and repeated micro-intervals; fix stuck boundaries at their owner. Define net flow with saturation as the continuous limit of serial clamps, qualify it against fine serial stepping, and only then replace the one-second fallback.
6. **Navigation attribution (SW06.2a, PF12.6, SW17.7).** Instrument the worker/coordinator to split cold Recast build, queue wait and query time under dense distinct geometry, many profile changes and simultaneous worlds; qualify route reuse, static segment certificates and relevant-tile invalidation before changing preparation. Implement affected-tile updates only if the attribution shows they are the fix.

## Steps and commits

Each completed stage is committed separately so the branch stays coherent. Stage order follows the request; later stages may be recorded as not achieved with evidence rather than skipped silently.

1. Plan and trackers (this document; PF13/PF12/SW links).
2. Private corridor turns plus regional rate integration; matched re-measurement.
3. Exact fleeting crossings with brute-force window verification and a fleeting-peek scenario.
4. PF12.5 status/sleeper follow-ups.
5. PF13.16 matrix and PF13.12 net flow.
6. Navigation attribution, qualification and (only if justified) affected-tile updates.
7. Reconcile catalogue, base time policy, NW12, trackers, verification report and changelog; full diff review.

## Verification

- Matched baseline/changed runs of both fixtures on identical inputs, back to back, three repetitions each: actual game-time progress, calls, intervals, slices, wall/CPU, latency, and the four outcome digests. Mechanical/event/audience digests must match; any intentional perception difference (for example a newly captured fleeting peek) is explained, not hidden.
- Brute-force checks: computed sight/contact windows against dense evaluation of the real predicates on real geometry, including moving observers and grazing cases.
- Focused existing unit files for touched owners (flight/spatial/cadence), `pnpm typecheck`, pinned Prettier on changed files; `pnpm build` where server code changes. PostgreSQL-backed full-server profiling only if disk and the shared host permit; otherwise recorded as a gap.
- No new permanent test suite; missing coverage goes to the focused trackers.

## Completion criteria

Both fixtures re-measured with identical outcomes and actual game-time progress recorded; every scoped item (PF13.11, PF12.5 and the dense sleeper/status follow-ups, PF13.16, PF13.12, SW06.2a, PF12.6, SW17.7) implemented or recorded as not achieved with evidence; trackers, [simulation boundaries](../maintainers/simulation-boundaries.md), [base time](../worlds/base/time.md), [NW12](../limits/native-work.md#nw12) and verification docs updated; required review of the full diff completed.

## Outcome

[Evidence](../verification/regional-time-and-navigation.md) records every measurement; tracker state lives in PF13/PF12/SW.

- **PF13.11:** delivered private corridor turns, deferred rates on body-only slices, local flyer takeoff/landing re-prediction and exact skip prevention for fleeting sight/contact of predictable movers. Staggered flight: 204 → 73 slices, CPU 14.8–15.4 s → 6.9–7.9 s, identical outcomes. Not achieved: dense 8× (headroom 0.054–0.077), because perception sampling and publication still run world-wide per slice.
- **PF12.5 and sleeper follow-ups:** deferred rates, local re-prediction and skipped restriction lookups. 100 sleepers: 27 → 18 calls, 3.35–4.51 of 3× (main 1.67–2.62), identical outcomes. Dense finalization/serialization qualification remains.
- **PF13.16:** the matrix and both reviews' fixes are delivered; driven scenarios for contribution, reservation and appraisal expiry and for start-boundary perception loss/return remain.
- **PF13.12:** net flow replaces the one-second fallback for opposing status rates and status rates coupled with native fullness/reservoir drains. Replenishment against a drain and health regeneration against damage keep the fallback.
- **SW06.2a / PF12.6 / SW17.7:** navigation is attributed. Route reuse, segment certificates and tile updates are not justified by the measurements, so none was implemented. A paused stale route no longer re-queues, and navigation metrics record each reply once. Measured queue wait is the cold worker's startup and map build.

## Decisions and open questions

- Deferred rates are applied through the same operators before any occurrence, command, re-prediction or publication that needs them. Floating-point sums over a longer span may differ from per-slice sums below 10⁻⁶; outcome digests round to 10⁻⁶.
- Net flow is the continuous limit of serial clamps. Combinations whose serial result depends on ordering beyond that limit (replenishment against a drain, health regeneration against damage) keep the fallback rather than an assumed sum.
- A landing is reached exactly on arrival, as on main. Only an unavailable landing under one game second away retries at the one-metre cadence. This stops the shrinking gap that fails main at 569 s. A one-second retry cost 3× the slices in the 900 s flock, and retrying at the cadence whenever arrival was within it delayed free landings.
- Wander deadlines within 10⁻⁶ s are due together and draw in entity-ID order. Main's order came from floating-point residue and changed with call size; two idle-scenario hares now swap draws compared with main.
- A `move` ends at its route's last point. Main completed it wherever a slice stopped within the 2 cm arrival tolerance, which depended on call size and was exposed by the crossing bounds in `spatial-http.test.ts`.
- Deferral is world-wide and conservative: a slice whose work ends, or whose interval has only floating-point residue left, applies pending rates first, and a pending local re-prediction travels with the continuation, so neither changes later outcomes at a call end. Sampled approaches, refused-landing retries and effects ordered within one endpoint (a lethal hit resolved before the victim's own rates for that slice) still depend on call size, as on main.
- Landings on a route whose whole lap takes under a game second retry at the sensing cadence; otherwise degenerate routes (a perch listed twice, or a hover point micrometres above it) would land at every tiny slice and stop the clock.
- The crossing scheduler mirrors perception's sight sample heights in `motion-boundaries.ts` rather than editing perception code. The perception owner must update both together.
- No open product questions.

## Progress

- [x] Read scoped docs/trackers, created the branch, reproduced both cases and attributed per-slice cost.
- [x] Stage 2 — private turns and regional rate integration.
- [x] Stage 3 — exact fleeting crossings.
- [x] Stage 4 — PF12.5 status/sleeper follow-ups.
- [x] Stage 5 — PF13.16 matrix and PF13.12 net flow.
- [x] Stage 6 — navigation attribution/qualification.
- [x] Stage 7 — documentation reconciliation and review.
