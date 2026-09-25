# Base-world time fidelity

[Simulation time](../../simulation-time.md) owns the engine interval contract. This document owns the bundled world's current fidelity choices; the numbers are not universal laws of authored realities. [PF13](../../maintainers/performance.md#pf13--elapsed-time-simulation) owns delivery and qualification, and the [boundary catalogue](../../maintainers/simulation-boundaries.md) holds future exact bounds.

## Clock and fallback horizon

The base clock converts one real second to one game minute at normal speed. Speed selection scales elapsed game time, not a required count of native updates. The current finite family accepts intervals up to 60 game seconds, shortened by known mechanical deadlines or fidelity bounds. The host usually offers less time at each wake. There is no mandatory one-game-second loop for idle scenes, and no 20 FPS render limit.

## Spatial fidelity

An active route, fleeing body or falling/flying creature normally limits an interval to at most one metre of travel. An available memory actor's smaller non-hearing sense radius can tighten the shared limit to one quarter of that radius. Every actual movement retains swept collision, waypoint and support checks. This bound limits sampled visual/contact exposure; it does not prove every arbitrarily brief appearance through a narrow opening is detected. Exact visibility-crossing certificates and per-region schedules remain catalogue candidates. A future high-speed actor must not silently justify either teleporting across obstacles or a claim that all observers were continuously evaluated.

Wandering currently makes non-emitting impulses of at most 0.4 metres on its own saved timer. The finite 60-second horizon is shorter than its repeat period; due impulses retain timer remainder and use deadline/identity order for random choices. If a smaller sensory bound requires it, that timer contributes an interval boundary. Crossing a narrow visibility opportunity during the impulse remains the declared exposure approximation. New wander emitters, larger impulses or shorter repeat periods must revise this integration rule before admission.

## Physiology and effects

Fullness and energy boundaries include the existing survival, sleep and concern thresholds. Their behavior/rates remain owned by [survival](survival.md), the status-effect definitions and the attribute owners; `worlds/base/time.ts` supplies the current finite adapter's threshold list. An interval stops at depletion or death before charging a subsequent period of starvation or exhaustion. Work beginning on arrival receives no pre-arrival duration.

Some separately clamped native/status operations cannot yet be combined as one net flow: opposing status rates, status rates alongside native fullness/reservoir updates, simultaneous draining/replenishing, or health regeneration alongside starvation/exhaustion damage. Those combinations retain a bounded one-game-second fallback. This local exception preserves existing operator order and bounds error; it is not an exact coupled integrator or a restored global tick requirement. A future net-flow owner can replace it after defining saturation and cross-target effects explicitly.

## Review trigger

Revisit these bounds when fleeting encounters matter to a mechanic, new movement/sense ranges create excessive global interval splitting, an admitted operation has unknown within-interval changes, or mixed-load evidence identifies fallback work as a bottleneck. Keep the authored policy, its adapter, the catalogue and [RP03](../../maintainers/revisitable-policies.md#rp03--base-world-integration-fidelity) aligned. Changing fidelity is a visible behavioral decision; rendering performance alone cannot authorize it.
