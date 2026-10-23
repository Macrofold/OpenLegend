# Simulation time, scheduling, and what characters perceive

| Research status                              | Scope                                                                                                                                 | Reviewed   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Complete for the documented mechanisms below | Current Unreal Engine 5.8 and Unity 6.6 scheduling, clocks, sensing, and the boundary between an engine query and character knowledge | 2026-10-23 |

This chapter examines when work happens, what information it reads, and what its result means. These questions matter to simulations containing many independently acting characters, changing geometry, and knowledge that belongs to particular observers. The chapter describes existing engine mechanisms; it does not propose OpenLegend architecture or change its rules. The release and package baseline is recorded in the research index. Unreal documentation below identifies itself as 5.8; Unity manual and API URLs are explicitly scoped to 6000.6. Documentation access is evidence of the published contract, not an engine benchmark or a source-code audit.

## 1. Time advancement and execution are different contracts

A simulation has at least three distinguishable quantities: real time that passes, simulated time that its rules advance, and processor time consumed calculating those rules. A callback executing less frequently does not, by itself, specify which intervening events must still occur. Conversely, advancing a clock by a large interval does not prove that collision, perception, or decision-making was correctly evaluated throughout that interval. This is a reasoning distinction used throughout the comparison.

### Unreal: ordered phases with narrower dependencies inside them

Actors and components can tick every frame, at a minimum interval, or remain disabled. Tick groups establish broad ordering, while prerequisites establish dependencies between particular tick functions. Independent work within a group can run in parallel. The world timer manager runs after the post-physics group, along with latent actions, camera updates, and streaming work. These are execution-order guarantees, not a guarantee that all gameplay is deterministic. [Actor Ticking][S02-01]

| Published Unreal phase | What a reader may assume about physics data     | Consequence of that contract                                                       |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Before physics         | Previous frame's simulation results             | Work can prepare inputs for the next solve.                                        |
| During physics         | Completion is unspecified relative to this tick | Reading a position here does not promise a completed current-frame physics result. |
| After physics          | Current frame's simulation is complete          | Dependent queries can use the completed result.                                    |

The table describes the documented frame model, without extrapolating to every asynchronous physics configuration. [Actor Ticking][S02-01]

Unreal timers supply delayed, repeating, and next-tick callbacks through timer managers associated with worlds and game instances. Handles support cancellation, replacement, pausing, and resumption. A timer bound to an object is cancelled when that object is destroyed, invalidating its handle. This provides a concrete lifecycle contract: an object disappearing can remove its future callback. It does not establish persistence across save/load or continued effects after the object's destruction; those would require another documented owner. [Gameplay Timers][S02-02]

**Interpretation.** A dependency graph reduces unnecessary waiting only when the dependency is narrower than the phase barrier it replaces. It does not remove the dependent calculation. A timer can remove repeated checks of an unchanged deadline, but the public timer contract alone says nothing about the semantic validity of a deadline after participants or world conditions change.

### Unity: fixed simulation increments inside variable rendered frames

Unity's fixed update interval describes simulated seconds per step, not evenly spaced real-time callbacks. One rendered frame can contain no fixed update, one update, or several catch-up updates. A low rendering rate therefore need not imply a proportionally larger individual physics step; it can produce multiple fixed steps before the next image. Equally, a high rendering rate can show multiple frames between physics steps. [Fixed updates][S02-03]

Unity also deliberately limits catch-up. `maximumDeltaTime` bounds the time reported through scaled frame delta and the amount of physics time simulated between frames. If a long stall exceeds that allowance, the excess is not later recovered by the game clock as though all real time had been simulated. The documented result is that game and physics time fall behind real time. Unscaled time exposes real elapsed time separately. This is a documented fidelity and responsiveness tradeoff, not merely a faster way of calculating the same elapsed simulation. [Handling variation in time][S02-04]

Changing `timeScale` changes the amount of game time represented by reported deltas. It does not slow the processor or automatically suspend every script. At zero scale, regular update callbacks can still run, allowing code using unscaled time to continue. Consequently, “paused” must be interpreted by the particular clock and subsystem being discussed. [In-game time and real time][S02-05]

Unity publishes a lifecycle ordering for script initialization, fixed and frame updates, animation, rendering, and destruction. The documentation explicitly describes that diagram as a simplified view of the full player loop. The low-level `PlayerLoop` API can return the default/current hierarchy and replace it with a modified sequence of subsystems. Reordering that sequence changes execution placement; the API is not evidence that arbitrary callbacks become parallel or that physics dependencies disappear. [Event function execution order][S02-06]; [PlayerLoop API][S02-07]

### What work is actually avoided?

The following distinctions are analytical, grounded in the contracts above rather than performance measurements:

| Mechanism                                 | Work affected                                    | What remains semantically unresolved by that mechanism alone |
| ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Disable an unnecessary recurring callback | Removes its future invocations                   | Whether another event must reactivate it                     |
| Invoke a callback at an explicit deadline | Avoids repeatedly testing a deadline             | Whether changed conditions invalidate the scheduled result   |
| Run independent work concurrently         | Reduces serialized waiting when resources permit | Total computation, contention, and publication order         |
| Spread computation over more frames       | Reduces work admitted to an individual frame     | Result latency and the age of its inputs                     |
| Clamp elapsed simulation time             | Avoids an unbounded catch-up spiral              | Equality with real elapsed time is intentionally lost        |
| Reduce update frequency                   | Executes fewer samples                           | Which transitions can happen between those samples           |

These categories cannot safely be collapsed into a single “update less” optimization. Some avoid redundant work; some defer necessary work; some change what the simulation computes.

## 2. Unreal perception is a managed listener-and-stimulus system

Unreal's perception subsystem owns registered senses, listeners, and stimulus sources. Its API includes batched events, listener configuration changes, source removal, a cached world timestamp, stimulus aging, and delayed delivery. The delayed-delivery interface associates a listener, instigator, stimulus, and delay. That is a delivery schedule; the API does not establish a general solver predicting future occlusion boundaries. [UAIPerceptionSystem][S02-08]

The listener's perception component stores information keyed by target, processes incoming stimuli, and exposes update and forgetting notifications. It can retrieve information about one target, remove one target, or clear the component's retained perceptions. This makes registration, mutation, and deletion part of the sensing lifecycle instead of treating each query as a permanently valid observation. [UAIPerceptionComponent][S02-09]

A stimulus records such properties as where the stimulus and receiver were, strength, tag, and sense type. Its API distinguishes validity, active status, expiration, aging, and unsuccessful sensing. These are useful structured facts about a sensing process. They are not, without additional game logic, proof that a character understood a sentence, identified a disguised person, or formed a durable autobiographical memory. [FAIStimulus][S02-10]

### Sight: rejection, hysteresis, query state, and deliberate approximation

The published sight configuration separates acquisition radius from the radius at which an already seen target is lost, and includes an angular field of view. It also offers an automatic-success region relative to a last-seen location. That option deliberately changes visibility semantics; it is not evidence of a newly completed exact line-of-sight test. The manual distinguishes currently perceived actors from actors known through retained perceptions. Stimulus maximum age and the project setting for forgetting stale actors control retention; zero maximum age means no age-based forgetting. [AI Perception][S02-11]

The current sight API exposes separate collections for in-range, out-of-range, and pending queries. Its own description identifies the listener–target relationship as a quadratic problem and explains why splitting out-of-range queries reduces sorting: those entries age, but do not acquire a distance component in their priority score. Visibility evaluation reports counts of synchronous line-of-sight checks and asynchronous requests. Completion handlers process pending visibility work, while listener/source updates have dedicated lifecycle hooks. This is concrete evidence of reducing administrative work around expensive visibility tests, plus support for deferred query completion. It is not proof that every possible listener–target pair is eliminated or that all updates meet a fixed latency bound. [UAISense_Sight][S02-12]

**Interpretation.** Three separate answers exist here: a target is outside a configured sensing region; an admitted visibility query has not finished; or a completed query reports no visibility. A work limit or pending queue cannot logically turn the second into the third. The inspected public API does not provide a complete fairness policy or worst-case waiting-time proof, so this research does not invent one from exposed names or historical configuration advice.

### Hearing: event delivery is not a physical acoustic model

The hearing sense accepts reported noise events, including batches, and maintains listener lifecycle hooks. This differs from continuously testing every potential sound source against every listener. [UAISense_Hearing][S02-13]

The perception manual documents hearing range and affiliation filtering. Its property named `LoS Hearing Range` is described as a debugger visualization; that label alone is not evidence of obstruction-aware sound propagation. [AI Perception][S02-11]

**Interpretation.** Hearing an engine noise event, receiving audible waveform energy, understanding language, and being permitted to learn private information are different claims. A distance filter can be a candidate-selection mechanism for one of these, but it does not establish the others. Nothing in the inspected hearing contract supplies a general acoustic diffraction, intelligibility, or private-conversation model. This is a limit of the reviewed evidence, not a claim that those models cannot be authored or supplied by other packages.

## 3. Unity's documented pieces do not establish an identical perception owner

Unity Behavior supplies graph execution, variables, and events. Physics supplies geometric queries, while ML-Agents supplies observation collection for policies. The inspected current documentation does not identify a single built-in service with the same listener/source registration, retained stimuli, and forgetting contract as Unreal AI Perception. This is an evidence boundary, not a claim that Unity or its ecosystem cannot implement such a system. [Unity Behavior introduction][S02-14]; [ML-Agents: Agents][S02-15]

In ML-Agents, an agent collects observations when it requests a decision, passes them to a policy, and executes the returned action through application code. Decisions can be requested manually on events or by a requester at step intervals; requesters can stagger different agents' decision steps. The package separates a policy from the agent using it, so agents can share decision logic. This defines an observation–decision interface and its cadence. It does not establish whether those observations contain only knowledge the represented character legitimately has. [ML-Agents: Agents][S02-15]

Unity Behavior can react through events and custom script nodes, with start/update/end lifecycle methods. Blackboards carry data between graph nodes and scripts. These mechanisms connect sensing results to behavior, but the graph itself does not prove a sensing result's completeness or freshness. [Unity Behavior introduction][S02-14]

Detailed decision execution and model scheduling are covered in [AI, navigation, and crowds](03-ai-navigation-and-crowds.md). The snapshot and completion semantics of physics queries are covered in [Physics and spatial queries](04-physics-and-spatial-queries.md).

## 4. Visibility, attention, and knowledge must be read at their actual level

The following is a conceptual classification, not a proposed implementation:

| Question                                                              | Kind of answer                                           | What it does not establish                                           |
| --------------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| Would geometry contribute to a camera's rendered image?               | Presentation visibility                                  | That an in-world character saw or recognized it                      |
| Does a configured geometric query reach a target?                     | Spatial result against a particular scene representation | Attention, identity, comprehension, or durable knowledge             |
| Did a character's configured sense accept a stimulus?                 | Perception result                                        | A complete history of everything the character experienced           |
| Is an actor still retained in the component's perception information? | Stored sensing state                                     | That the actor is currently visible                                  |
| Which observation should influence behavior next?                     | Attention or selection policy                            | That other unprocessed observations are absent                       |
| What may a character recall or tell someone?                          | Knowledge and disclosure semantics                       | A consequence that follows automatically from rendering or a raycast |

Unreal's separation between current and retained perceptions makes one of these boundaries explicit. Unity's observation callback makes the supplied policy input explicit. Neither public contract makes a renderer's camera culling result a substitute for observer-specific knowledge. [AI Perception][S02-11]; [ML-Agents: Agents][S02-15]

This distinction also applies to distance-based simulation changes. An object being visually unimportant does not prove that its unseen actions are irrelevant to another character or to later world state. Reducing the fidelity of presentation and reducing the fidelity of simulation are different changes even if both use distance as an input. Whether a particular lower-frequency simulation is equivalent, approximate, or intentionally suspended depends on that subsystem's rules; it cannot be inferred from the word “LOD.”

## 5. Evidence limits and current-documentation traps

The inspected contracts establish scheduling phases, retained sensing data, query queues, and lifecycle hooks. They do not establish a universal event-driven simulation of all continuous interactions, exact prediction of every future perception transition, complete cross-platform determinism, or measured population capacity. No engine was run for this study.

The Unreal 5.8 page titled _Physics Sub-Stepping_ still contains APEX Destruction and broad mobile-support wording inherited from earlier engine generations. Its current header cannot authenticate every statement in its body. The page was inspected as a provenance warning; those backend and platform claims are not used as current facts. Modern physics mechanisms are discussed using more specific current APIs in the physics chapter. [Physics Sub-Stepping][S02-16]

Other specific unresolved points are the worst-case delay and fairness of sight processing under load, application-defined behavior after a timer's participant disappears, and the exact dependency coverage required to reuse a future perception prediction. Exposed interfaces do not provide sufficient evidence to resolve these by assertion. They remain research limits rather than OpenLegend proposals or unmeasured defects.

## Source and provenance register

All entries were accessed on **2026-10-23**. “Undated live” means the inspected page supplied a current version label but no reliable publication date. A documentation generator/build date identifies the documentation snapshot, not the introduction date of its mechanism. Relevant prose/API sections were read; no video viewing or executable validation is implied.

| ID     | First-party source                       | Version/date and medium                         | Inspection and qualification                                                                               |
| ------ | ---------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| S02-01 | [Actor Ticking][S02-01]                  | UE 5.8; undated live manual                     | Read ordering, dependencies, and tick registration.                                                        |
| S02-02 | [Gameplay Timers][S02-02]                | UE 5.8; undated live manual                     | Read timer ownership, handles, and destruction behavior.                                                   |
| S02-03 | [Fixed updates][S02-03]                  | Unity 6.6; live manual                          | Read fixed/variable cadence and catch-up explanation.                                                      |
| S02-04 | [Handling variation in time][S02-04]     | Unity 6.6; live manual                          | Read clamping, unscaled time, and fixed-step catch-up limit.                                               |
| S02-05 | [In-game time and real time][S02-05]     | Unity 6.6; live manual                          | Read time-scale and pause behavior.                                                                        |
| S02-06 | [Event function execution order][S02-06] | Unity 6.6; live manual                          | Read lifecycle and simplified-loop qualification.                                                          |
| S02-07 | [PlayerLoop][S02-07]                     | Unity 6.6; API reference                        | Read loop inspection and replacement contract.                                                             |
| S02-08 | [UAIPerceptionSystem][S02-08]            | UE 5.8; undated generated API                   | Read registration, batching, aging, delayed delivery, and lifecycle.                                       |
| S02-09 | [UAIPerceptionComponent][S02-09]         | UE 5.8; undated generated API                   | Read stored target data, updates, and forgetting interfaces.                                               |
| S02-10 | [FAIStimulus][S02-10]                    | UE 5.8; undated generated API                   | Read fields, aging, validity, and expiration interfaces.                                                   |
| S02-11 | [AI Perception][S02-11]                  | UE 5.8; undated live manual                     | Read sight/hearing configuration, retained/current perception, and forgetting.                             |
| S02-12 | [UAISense_Sight][S02-12]                 | UE 5.8; undated generated API                   | Read query partition explanation and pending/asynchronous interfaces; no numeric budget defaults inferred. |
| S02-13 | [UAISense_Hearing][S02-13]               | UE 5.8; undated generated API                   | Read noise-event and listener interfaces; not evidence of acoustic propagation.                            |
| S02-14 | [Unity Behavior introduction][S02-14]    | Behavior 1.0.16; documentation built 2026-05-28 | Read events, blackboards, and node lifecycle; execution details continue in chapter 03.                    |
| S02-15 | [ML-Agents: Agents][S02-15]              | ML-Agents 4.1.0; documentation built 2026-07-29 | Read observation/action contract and decision scheduling.                                                  |
| S02-16 | [Physics Sub-Stepping][S02-16]           | UE 5.8 header; undated live manual              | Inspected; inherited APEX/mobile statements excluded from current factual claims.                          |

[S02-01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/actor-ticking-in-unreal-engine
[S02-02]: https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-timers-in-unreal-engine
[S02-03]: https://docs.unity3d.com/6000.6/Documentation/Manual/fixed-updates.html
[S02-04]: https://docs.unity3d.com/6000.6/Documentation/Manual/time-handling-variations.html
[S02-05]: https://docs.unity3d.com/6000.6/Documentation/Manual/time-scale.html
[S02-06]: https://docs.unity3d.com/6000.6/Documentation/Manual/execution-order.html
[S02-07]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/LowLevel.PlayerLoop.html
[S02-08]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAIPerceptionSystem
[S02-09]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAIPerceptionComponent
[S02-10]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/FAIStimulus
[S02-11]: https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine
[S02-12]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAISense_Sight
[S02-13]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAISense_Hearing
[S02-14]: https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/behavior-features.html
[S02-15]: https://docs.unity3d.com/Packages/com.unity.ml-agents@4.1/manual/Learning-Environment-Design-Agents.html
[S02-16]: https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-sub-stepping-in-unreal-engine
