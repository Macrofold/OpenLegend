# Elapsed-time simulation evidence

## Source and scope

The continuation recovered the in-progress elapsed integration at `2ca8dfe65b15efc0f27ff7d04dfe564f1e5ed515`. Current-main `03105fed9209c126e4e69e9faeb4687f42d1e74a`, including the requested `fdcbd31` guidance, was integrated with a connector-published two-parent merge at `d4614ab`. This is **not a rebase**: no lease-protected rewrite operation was available, so existing shared branch history was retained. Main itself was not modified. Reviewed three-way source reconciliation preserved physical-contact sensing, nonblocking memory pressure, removed content-count ceilings, in-place saves, elapsed integration and observer-private acquisition. No unresolved semantic conflict remained.

The initial flight completion was faulty: start-boundary takeoff removed support identity, then the first elapsed sweep treated the departure deck as an obstruction. `53e94bc` retains a validated top-contact witness without ignoring floor undersides. `e721648` resolves numerical endpoint residue and adds saved, shared five-game-second retry boundaries for blocked flight/landing. This is a finite holding policy, not crowd fairness or region-local scheduling.

No unit/integration/browser test files were authored or suites manually run. Disposable scripts outside the repository invoked actual domain, Recast/Rapier, HTTP and SQLite code. No paid provider calls were made. Normal automatic repository CI was not disabled; its failures are not represented as a passing full check. Production TypeScript, generated-configuration validation and Vite build are recorded separately from automated acceptance. The working source archive cannot satisfy the guidance checker's tracked-file inspection without a Git checkout; the existing checker was not weakened for that environment.

## Running-server workloads

Node 22.16.0 ran on an AMD EPYC 9V74 container exposing five logical CPUs. Separate disposable SQLite directories and loopback ports were used, with explicit zero AI budget and no provider credentials. The normal server timer, mutation lane, persistence, navigation worker and authorized HTTP endpoints were active. The diagnostic set `pauseWhenHidden: false`, renewed ordinary presence once per second, selected speed 8, and sampled state for about fifteen wall seconds. It measured actual `simTime` progress against monotonic elapsed time before pause, not requested calls or post-pause zero debt.

The 318-entity scenario adds sixteen memory-capable NPC people, forty-eight native deer and 240 independent resource objects to the seed-1086 starter world. The 378-entity pathological scenario additionally adds forty-eight birds on the **same flight route and contested perch**, twelve fire emitters and twenty-four overlapping-XZ elevated slabs, for 27 authored supports. These are native controllers, not LLM calls; no browser/GPU was present, so the fire emitters do not qualify rendered-light performance. Population setup was an isolated scenario transition, not a new production authoring endpoint.

| Final-code observation | Wall interval | Game seconds advanced | Game seconds per wall second | Interpretation |
| --- | ---: | ---: | ---: | --- |
| 318 entities | 15.904 s | 7563.018 | 475.54 | Close to the requested 480; short polling windows and host overhead are included, not an exact sustained-capacity certificate |
| 378 entities, 49 birds contesting one route/perch, 27 supports | 17.028 s | 617.732 | 36.28 | Does not sustain 8x; global deadline coupling and expensive atomic transitions remain material |

Earlier exploratory starter/mixed runs measured about 480 game-seconds/s but preceded the flight correction; they are not final flight-qualified capacity evidence. A presence-expiry run and an interrupted diagnostic run were discarded, not averaged into successful results. An earlier pathological run nearly stopped near game time 437 with sub-millisecond interval requests. Holding and endpoint reconciliation restore progress but do not solve aggregate dense activity. No sensory range, output audience, requested clock speed or admitted content limit was reduced to improve the figures.

The service still has one globally chosen integration interval. Many independent short boundaries can therefore force repeated unrelated work. The approximately eight-millisecond host work target is cooperative; a single atomic native transition can exceed it. The bounds catalogue and PF13 retain regional/participant deadlines, endpoint-change-fed perception, history/finalization and fairness work. This evidence does not prove a 90% whole-game improvement, unlimited agent capacity or hardware-GPU FPS.

## Mechanical boundaries actually exercised

Using initialized actual domain/collision code, diagnostics observed:

- Fullness 0.003 depleted after one game second without premature damage; two subsequent empty seconds reduced health by the corresponding starvation rate.
- A fire with 2.25 game seconds of fuel emitted its extinction at 2.25, not at the end of a twenty-second request.
- Gathering approached its target first, then received its thirty seconds of work. The approach interval was not credited as gathering; the item appeared at completion.
- Rest starting at energy 99.99 reached full energy and deactivated at approximately 2.88 game seconds. The remaining elapsed interval used the newly applicable energy behavior rather than extending sleep retroactively.
- A bird waiting 2.5 seconds stayed perched until that boundary, emitted takeoff there, and moved upward during the following second. Departure contact and the floor-underside rule remain distinct.

These are selected printed observations, not an independent proof for all authored conditions, coupled rates, shapes, event orderings or timestep partitions. Endpoint sensing is a documented bounded-displacement approximation; it does not establish complete detection of every transient peek or physical tangency.

## Ordinary gameplay and persistence

The final source ran through normal authenticated HTTP admission on a fresh disposable database. A move reached `{x:24,y:3,z:6}` on `lookout-deck`; the same elevated coordinates with `terrain` support were rejected. A subsequent descent completed near `{x:20.004043,y:0,z:5.011945}` on terrain beneath the structure. Pause held game time at `337.27735974000035`. Clean shutdown and reopening preserved that fractional time, position and support and reopened paused. No storage error was reported. The initial diagnostic reused a closed HTTP socket during restart; the observation was repeated with independent loopback connections rather than changing application validation. All processes were closed; no prior user world was reset or modified.

## Hearing-branch coordination

Inspected `feat/hearing-speech-captions` at `97668413082446e08d1e1fa5c3ee788067a1c7ef` and posted an integration note on PR #3. Its graded acoustic policy, listener-specific immutable fragments, receiver/evidence optimizations and real-time caption clocks must survive integration. Its new snapshot batching still retains one-game-second physics boundaries; those must not overwrite the elapsed integrator. The detailed [handoff](../maintainers/speech-time-integration.md) records phase ownership and recommended merge order. No joint hearing/elapsed branch or full graphical speech acceptance is claimed here.

## Remaining qualification

PF13 and the [boundary catalogue](../maintainers/simulation-boundaries.md) own the next work. Automated cross-layer regression is in [TODO](../maintainers/TODO.md). Remaining checks include arbitrary coupled conditions, multi-actor depletion races and event-time acoustic consumers, physical-contact crossings, many contested perches, long-session memory/history, in-place upgrades and named-save rewind, nontrivial network-gap interpolation and actual display-refresh/GPU performance. Rendering cadence is independent of sparse integration; no new 20 FPS cap was introduced.
