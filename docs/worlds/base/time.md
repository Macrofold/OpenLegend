# Base-world time and observation fidelity

[Simulation time](../../simulation-time.md) owns the engine's elapsed-interval contract; [PF13](../../maintainers/performance.md#pf13--elapsed-time-simulation) owns delivery. This document owns the bundled policy in `packages/domain/src/worlds/base/time.ts`, not universal biology or a renderer frame limit.

## Current policy

The default clock converts one real second to sixty game seconds at 1x. Speed changes the time owed, not a requirement for one transition per game second. An interval is at most sixty game seconds, further shortened by relevant action, condition, supply, conversation, promise, route, flight or falling boundaries. Supported rates integrate elapsed game time; a newly activated action or condition never receives preceding time.

Moving bodies normally advance at most one metre before the next sensory sample; smaller positive non-hearing detector radii can tighten that bound. This is a deliberately bounded discovery approximation, not an exact continuous visibility/contact solver. Two moving bodies may change relative separation by more than one body's bound. A narrow peek, brief tangency or transient physical contact can occur between samples. Direct interaction admission and movement collision remain exact within their current geometry contract. Physical-contact sensing still requires body contact, not a replacement proximity radius; its descriptor's zero radius must not create zero-duration intervals.

The first implementation chooses one global minimum interval. One fast mover can shorten unrelated actors' updates. Region-local schedules and conservative range/occlusion certificates are future performance work in the [boundary catalogue](../../maintainers/simulation-boundaries.md), not implemented merely by increasing the horizon. Revisit this policy when crowded contact gameplay or missed discoveries require a smaller bound or explicit crossing detection.

Native wandering retains each animal's saved countdown and a bounded 0.4-metre non-emitting impulse. Deadline/identity ordering governs due random choices. The sixty-second horizon is shorter than the minimum renewed wandering wait; callback partitioning must not discard the remaining wait or redraw solely on reload. Impulse observation is sampled, not full continuous crowd locomotion.

The current separate-clamp composition falls back to at most one game second for opposing status rates and coupled native reservoir/fullness rates. That conservative fallback preserves the existing operation ordering; it is not a general analytic solution for arbitrary coupled or nonlinear authored rules. Add a family-owned integrator/bound before relaxing it.

## Precision and presentation

The numerical progress epsilon is not a gameplay time unit. Thresholds, waypoints and work remainders can produce fractional elapsed intervals. World positions remain continuous; Recast raster precision and exact support-contact tolerance are independent of simulation cadence.

Rendering and camera input remain device-paced, aiming at ordinary 60 FPS or display refresh where hardware permits. Sparse server updates do not cap rendering to 20 FPS. The current support-aware interpolation is an approximation between authorized poses; longer-gap recent-past path buffering remains in the presentation tracker. Never send another actor's private future route to improve interpolation.

## Reconsideration triggers

Reevaluate the movement-discovery bound for tiny bodies/contact-critical puzzles, very fast creatures, crowded opposing motion or known missed exposure. Reevaluate the shared global horizon when one participant dominates interval count. Reevaluate fallback arithmetic when a concrete authored family needs coupled transfer, regeneration or feedback. Changes must preserve physical clearance, conserved resources, action timing, event-time disclosure and actual-progress accounting. The [policies register](../../maintainers/revisitable-policies.md) records follow-up ownership; it does not replace this current contract.
