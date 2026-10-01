# Base-world time fidelity

[Simulation time](../../simulation-time.md) owns the engine interval contract. This document owns the bundled world's current fidelity choices; the numbers are not universal laws of authored realities. [PF13](../../maintainers/simulation-time.md#pf13--elapsed-time-simulation) owns delivery and qualification, and the [boundary catalogue](../../maintainers/simulation-boundaries.md) holds future exact bounds.

## Clock and fallback horizon

The base clock converts one real second to one game minute at normal speed. Speed selection scales elapsed game time, not a required count of native updates. The current finite family accepts intervals up to 60 game seconds, shortened by known mechanical deadlines or fidelity bounds. The host usually offers less time at each wake. There is no mandatory one-game-second loop for idle scenes, and no 20 FPS render limit.

## Spatial fidelity

An active route, fleeing body or falling/flying creature normally limits an interval to at most one metre of travel. An available memory actor's smaller positive non-hearing sense radius tightens a mover's bound to one quarter of that radius only when their conservative reachable envelopes overlap during the shared interval. Both participants' maximum movement and body extents contribute; a distant tiny sense does not shorten unrelated travel. Every actual movement retains swept collision, waypoint and support checks. This bound limits sampled visual/contact exposure; it does not prove every arbitrarily brief appearance through a narrow opening is detected. Flight/perch/fall/flee deadlines run as private motion slices with synchronized occurrence-time positions; shared rate integration still materializes all participants. Exact visibility-crossing certificates and fully independent regional rate integration remain catalogue candidates. A future high-speed actor must not silently justify either teleporting across obstacles or a claim that all observers were continuously evaluated.

Wandering currently makes non-emitting impulses of at most 0.4 metres on its own saved timer. The finite 60-second horizon is shorter than its repeat period; due impulses retain timer remainder and use deadline/identity order for random choices. If a smaller sensory bound requires it, that timer contributes an interval boundary. Crossing a narrow visibility opportunity during the impulse remains the declared exposure approximation. New wander emitters, larger impulses or shorter repeat periods must revise this integration rule before admission.

## Physiology and effects

Fullness and energy boundaries include the existing survival, sleep and concern thresholds. Their behavior/rates remain owned by [survival](survival.md), the status-effect definitions and the attribute owners; `worlds/base/time.ts` supplies the current finite adapter's threshold list. An interval stops at depletion or death before charging a subsequent period of starvation or exhaustion. Work beginning on arrival receives no pre-arrival duration.

Some separately clamped native/status operations cannot yet be combined as one net flow: opposing status rates, status rates alongside native fullness/reservoir updates, simultaneous draining/replenishing, or health regeneration alongside starvation/exhaustion damage. Those combinations retain a bounded one-game-second fallback. This local exception preserves existing operator order and bounds error; it is not an exact coupled integrator or a restored global tick requirement. A future net-flow owner can replace it after defining saturation and cross-target effects explicitly.

Current fidelity limits and their expansion triggers are catalogued in [NW12](../../limits/native-work.md#nw12).

## Named clock times

A request may name **dawn (06:00)** or **dusk (18:00)** as a stopping time, for example "follow her until dusk" or "wait until dawn". These names and hours are this world's choice, authored as `namedTimes` beside `clockOffsetHours` (day 1 starts at 08:00) in `worlds/base/config/status-effects.yaml`, the current authored home of the world clock. They are saved with the world and validated at load: at most eight names, each one or two lowercase words of up to 24 characters, with an hour from 0 to just under 24. A save without `namedTimes` is refused explicitly under the [development save policy](../../../AGENTS.md#development-save-policy).

Engine code never states these names. Deadline binding, request validation, the typed-request parser, AI instructions, capability descriptions, the AI's structured-output choices and the Character panel's "Stop at" options all read the saved world's list, so a world that names only "noon", or no times at all, works without code changes. A named time already reached today, including the current instant, means the next day's occurrence, so a stopping time is always in the future and at most one game day away; a name the world does not define is refused rather than guessed. Stored requests are checked for shape only when a save loads, so removing a name later never makes a save unloadable; such a request is refused when it is used, and the Character panel marks a no-longer-named choice as unavailable.

A follow or wait that ends at a named time is an exact interval boundary: elapsed-time integration stops at that instant instead of running the 60-second fallback horizon past it. Named times are a small clock vocabulary, not a general time-expression parser; "wait N minutes" is the only relative form. A separate clock policy is warranted when another clock consumer (calendar, seasons) appears.

Clock displays (the HUD clock, event times and God-tool time labels) read the world's `clockOffsetHours` from the view. Daylight is not yet a world setting: the renderer's daylight curve (06:00–18:00, in presentation code outside this project's file ownership) and the HUD's day/night icon (06:00–19:00) keep their own hours; making them read a world daylight policy is tracked in the [base-world tracker](../../maintainers/base-world.md).

## Review trigger

Revisit these bounds when fleeting encounters matter to a mechanic, new movement/sense ranges create excessive global interval splitting, an admitted operation has unknown within-interval changes, or mixed-load evidence identifies fallback work as a bottleneck. Keep the authored policy, its adapter, the catalogue and [RP06](../../maintainers/revisitable-policies.md#rp06--elapsed-time-fidelity-and-integration-limits) aligned. Changing fidelity is a visible behavioral decision; rendering performance alone cannot authorize it.
