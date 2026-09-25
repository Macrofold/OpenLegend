# Simulation depth, time and scheduling

[Research index](../README.md) · Proposed engineering analysis; the existing [performance](../../../../docs/performance.md) and [simulation scope](../../../03-design-proposals/simulation-scope-and-complexity.md) contracts take precedence.

## Depth is not the number of things evaluated every frame

A coherent world can have many durable entities while only a subset changes at a given instant. Distinguish rendered objects, physically active bodies, due processes, active sensory relations, current plans, cognition opportunities and retained minds. A sleeping creature remains a creature; it does not need an operating-system thread or a model completion each tick.

OpenLegend's accepted direction is finite reusable laws, refined when they create meaningful choices. A thermal model can be causally useful without computational fluid dynamics. A social relationship can be rich prose plus evidence without a dense matrix of every possible pair. The engine should support these representations without silently switching between contradictory authorities.

## Four clocks, four meanings

Simulation time governs physical processes and in-world appointments. Owner-local logical order resolves causal sequencing and ties. Real monotonic elapsed time measures scheduling, timeout and performance. UTC wall time governs external billing, audit and civil-time schedules. Browser presentation interpolates between approved states but cannot advance authority.

The current 1× multiplier is particularly important: 60 simulated seconds per real second. Define whether an appointment, cooldown, lease, regeneration, model budget and queue deadline uses simulation or real time. Different-speed worlds sharing an economy may enable arbitrage even when both are internally correct; this is a product decision, not just a scheduler setting.

Do not use arrival order at an arbitrary gateway as a universal notion of fairness. Decide how an owner orders simultaneous commands and handles latency. A deterministic tie breaker can accidentally favor one ID forever; research on simultaneous-event ordering identifies this as a modeling issue as well as a reproducibility issue. [S55](../sources.md#s55)

## Fixed steps, due events and exact lazy evaluation

A fixed native transition is a useful correctness reference. Variable render rates must not change simulation results. Fiedler's timestep analysis explains why accumulated work can spiral when the simulation cannot catch up; the relevant lesson is headroom and a deliberate overload contract, not silently dropping required time. [S15](../sources.md#s15)

Proposed progression:

| Technique | Suitable use | Correctness obligation |
|---|---|---|
| Fixed native step | Coupled movement, immediate hazards and established rules | Preserve ordering and the current transition semantics |
| Due-time heap or timing wheel | Appointments, finite process completions, cooldown expiry | Persist relevant deadlines; bound canceled-entry accumulation; process every consequential crossing |
| Exact lazy evaluation | Analytic decay or accumulation between known discontinuities | Prove equivalence to the chosen rule, including thresholds and intervening causes |
| Incremental dependency updates | A changed roof affects shelter, moisture and selected local effects | Declare dependencies; invalidate complete affected sets; avoid missed reverse edges |
| Batched independent work | Many identical, independent resource processes | Preserve stable ordering where outcomes interact; avoid duplicate resource accounting |
| Coarse statistical model | Offstage economy, distant ecology or large populations | Explicitly approve approximation, error envelope and promotion semantics |

The last row is not equivalent to the others. A mathematically exact deferred hunger calculation can preserve all consequences; replacing a person's life with a statistical cohort may not. This report does not authorize the latter merely because the person is offscreen.

## Activation and deactivation need invariants

Define why a body or process is active: contact, movement, nearby relevant change, due deadline or external command. Deactivation requires that no unhandled cause can affect its future before its next scheduled activation. Waking requires reconstructing a consistent current boundary without replaying an unbounded number of obsolete frames.

A static statue and a burning unattended house should not share the same dormancy policy. The statue may require no native work until touched. The house can exhaust fuel, spread fire, collapse support and affect neighbors while no human is looking. Either model those consequences correctly, or explicitly choose a game policy under which they do not occur.

Protect unresolved commitments and required evidence across suspension. A wake storm after a patch or popular event needs staged admission and warm capacity. Waking every cold mind simultaneously can saturate database reads, context assembly and inference long before movement CPU is exhausted.

## Data-oriented execution without a wholesale rewrite

Keep semantic APIs stable while measuring hot loops. Dense arrays, typed arrays, pooled scratch buffers and component-specific iteration can improve locality when profiles show allocation or pointer chasing dominates. They are implementation choices, not requirements to expose an ECS storage format to every plugin.

Separate immutable content from mutable component state. Group processing by rule family where useful, but preserve per-instance identity and resource ownership. Avoid per-entity timers, promises, closures and event emitters when a shared due-work structure does the same job with bounded overhead.

TypeScript can remain orchestration and much game logic. Move a measured numerical kernel to worker threads or a native/WASM implementation only behind a versioned, testable input/output contract. Sending a large world object across a worker boundary each step can erase the benefit. Async functions alone do not parallelize CPU work.

## Parallel simulation is not “run every subsystem concurrently”

Parallelize independent worlds first. Within a world, jobs can compute pure proposals from a stable phase snapshot; a deterministic merge applies results where dependencies permit. Collision islands, independent navigation queries and independent actor context construction are candidates. A pair of effects spending the same resource is not independent.

Parallel discrete-event simulation offers conservative execution, which waits until earlier causally relevant messages cannot arrive, and optimistic execution, which rolls back on late events. These approaches require explicit assumptions about lookahead, state history and reversible effects. Their existence is not proof that a latency-sensitive game with arbitrary instantaneous interactions can be distributed cheaply. [S56](../sources.md#s56)

OpenLegend makes optimistic world rollback particularly expensive: an utterance may already have been read by a human, a paid API called, or a private fact disclosed. Those effects cannot be unobserved. Speculative internal computation may be useful; publishing uncommitted simulated history is a different contract. Keep speculative outputs behind a commitment boundary.

## Required experiments

Run the same seed, commands and admitted outcomes through the reference transition and each optimization. Compare physical state, resource totals, event order, permitted acquisitions, action outcomes and continuation state—not only positions. Include close threshold crossings, concurrent consumption, support removal, extinguished fires and speed changes.

Measure cold and warm scheduling, mass cancellations, long inactivity, dense dependency cycles and the catch-up distribution. Record simulated progress per real second and accumulated debt. If the owner cannot maintain the promised clock under an admitted workload, expose overload and invoke an approved policy; do not let the game quietly run different laws.
