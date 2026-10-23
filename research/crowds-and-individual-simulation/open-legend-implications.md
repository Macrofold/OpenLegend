# Implications and open questions for Open Legend

| Research status                                                      | Progress                                                                                                                | Last updated |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed research synthesis; no design or implementation authorized | Connects external evidence to existing project commitments and identifies what future evidence would need to establish. | 2026-10-23   |

## 1. Assessment

**The research supports pursuing hundreds of meaningful individual actors. It does not support a capacity promise without measuring the actual Open Legend workload.** There is no general computational rule requiring an individual character to run an expensive planner or language model every frame. Persistent identity, memory, current intention and consequences can remain personal while routine continuation uses modest computation.

This assessment is an inference from the surveyed systems, not a benchmark result. The strongest comparisons are not all million-unit battle renderers: [Kingdom Come's behavior LOD, The Sims' separation of decisions and presentation, and Factorio's reuse of navigation](games-and-individual-simulation.md) address important parts of the problem. [LLM-agent research](cognition-and-agent-systems.md) demonstrates larger populations while exposing serious cadence, latency and hardware qualifications.

The difficult question is what must remain true about each individual when less work is done. A population can look convincing while losing the exact continuity, knowledge boundaries or causal history that Open Legend intends to preserve. Appearance is useful evidence about presentation; it is insufficient evidence about those deeper contracts.

## 2. Existing commitments that change the comparison

This section describes the repository at main commit `d1299aaf7cd834efbc9937e31c81efa3773b8418`. It does not amend the cited owners.

| Existing project context                                                                                                                      | Why it matters to this research                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Living actors include people and animals; cognition is a separate capability. Existing animal behavior includes native wandering and fleeing. | Actor count and cognitive-actor count are already different quantities. Animal individuality need not imply a language-model call.  |
| Simulation progresses by elapsed time to mechanical boundaries, with a host wake interval separate from rendering.                            | A display frame is not the natural unit for all decisions. Less frequent expensive work still has to respect meaningful world time. |
| Navigation uses a reused Recast/Detour worker and clearance checks; clear direct travel can avoid a worker path request.                      | Some avoidance of unnecessary global work already exists. This panel is not evidence that a new navigation system is needed.        |
| The world includes stacked traversable surfaces, such as a ramp and a passage below.                                                          | UEBS2's single-layer navigation contract is too narrow to assume as an equivalent replacement.                                      |
| Authoritative domain behavior and client presentation have distinct owners.                                                                   | A client GPU visual optimization does not automatically accelerate authoritative simulation or make client results authoritative.   |
| Triggered background work follows relevant changes and deadlines; model work has bounded concurrency and spending.                            | Event-driven continuation is consistent with existing direction, but event bursts and response time still need qualification.       |

Sources: [project README](../../README.md), [architecture](../../docs/architecture.md), [triggered background work](../../docs/performance.md#triggered-background-work), [scale path](../../docs/performance.md#scale-path), and [engine/hardware review](../game-engines/performance-and-hardware.md). The detailed navigation, memory and cognition contracts remain in their existing owners; this research adds no replacement policy.

The maintainer plan's [PF09 population work](../../docs/maintainers/performance.md#pf09--population-work-follows-relevance) distinguishes core preparation from unfinished population qualification. [PF11 scale qualification](../../docs/maintainers/performance.md#pf11--scale-qualification-and-continuous-regression) describes multiple population, interaction and history axes. Its scenario counts are qualification targets, not demonstrated capacities. Earlier fixture results must not be relabeled as the performance of the current build.

## 3. Preserve individuals while varying the amount of work

The following is a map of research possibilities and their semantic costs, not a proposed tier system or selected architecture.

| Kind of economy                                       | What could remain individual                               | What needs scrutiny                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Common execution over separate records                | Attributes, identity, current activity and resulting state | Unique branching or large histories may limit efficient batching                      |
| Reusing geographical information                      | Destinations, movement constraints and local reactions     | The reused answer must respect body clearance, permissions, knowledge and preferences |
| Continuing an established intention                   | The personal reason for acting and its eventual outcome    | Relevant changes must be able to interrupt it; repetition must not hide failure       |
| Updating a numerical process at meaningful boundaries | Individual hunger, cooldowns or scheduled activity         | Crossings and interactions between updates must still occur correctly                 |
| Reducing graphical detail                             | All authoritative actor facts                              | Visual motion and contact must still communicate the actual state adequately          |
| Coarse remote simulation of a specific person         | Identity and selected personal state                       | Which encounters and consequences are omitted or approximated?                        |
| Replacing a herd with aggregate statistics            | Population-level trends                                    | Exact individual positions, experiences or survival may no longer be represented      |
| Generating personal detail on inspection              | A coherent identity from that point onward                 | The detail was not necessarily part of a previously simulated life                    |

The first rows need not sacrifice individuality. The later rows can change what “this particular person existed and experienced this event” means. That boundary matters more to Open Legend than whether a technique is conventionally called AI LOD. The distinctions are supported by the [game comparisons](games-and-individual-simulation.md), [Mass documentation](execution-rendering-and-browser.md), and [agent-system evidence](cognition-and-agent-systems.md).

### Animals are a strong opportunity, with clear limits

Boids demonstrates that locally evaluated rules can produce complex collective movement. It does not provide a complete animal simulation. Hunger, fear, injury, species-specific behavior, familiarity, territoriality and an established activity can all be individual inputs to relatively inexpensive behavior; the claim here is conceptual compatibility, not a completed Open Legend animal design. [Boids and local rules](navigation-and-local-motion.md#4-two-different-ways-to-produce-believable-collective-motion).

A particular deer can keep its identity, wound and current escape target while using common locomotion rules. That is different from a distant herd existing only as a headcount. Both might produce convincing scenery, but only the former automatically retains those individual facts. Project Zomboid's historical herd approximation is therefore useful evidence of an explicit tradeoff, not proof that Open Legend must make it.

### Rich cognition need not be continuous cognition

A person executing a decision is still acting on that decision. Walking to meet a friend, tending a task or waiting for an agreed time does not logically require repeatedly regenerating the high-level intention. Expensive cognition may matter when interpreting an unexpected event, revising conflicting commitments, negotiating, or drawing on personal history. [Lyfe and Project Sid](cognition-and-agent-systems.md) give concrete examples of separating continued action from expensive reasoning, with different implementations and limitations.

The essential uncertainty is the frequency of situations that genuinely require deeper thought in the intended game. A quiet dispersed village, a dense emergency, and a live conversation expose very different demands. No researched paper settles that distribution for Open Legend.

## 4. Population is only one multiplier

For an illustrative workload—not a proposed cadence—500 actors reconsidering a decision 60 times per second would create 30,000 decisions per second. Reconsidering once every 30 seconds on average would create about 16.7 per second; once every five minutes would create about 1.67. That arithmetic explains why retained intentions can dominate the budget. It does not establish whether either slower rate is acceptable, how many calls one decision requires, or what hardware would be sufficient.

Other work remains even when deliberation is rare:

- Movement and contact depend on active bodies and nearby interactions.
- Perception depends on candidate observations, visibility, relevance and individual knowledge.
- Navigation depends on new requests, changed terrain, distinct movement needs and available reuse.
- Memory depends on event production, recipients, retrieval and summarization, not merely stored byte count.
- Presentation depends on visible actors, animation, geometry, shadows and network updates.
- Authoritative progression depends on applying consequences in a valid order while respecting simulation time.

These are accounting distinctions, not a measured cost model. [Scientific simulations](cognition-and-agent-systems.md) and [navigation benchmarks](navigation-and-local-motion.md) demonstrate that improving one category does not establish the cost of the rest.

The interaction structure deserves particular attention. If each actor examines only a modest local neighborhood, cost can grow roughly with population. If many actors can affect most others, the candidate relationship count can grow much faster. A dense disturbance can simultaneously expand perception, avoidance, event recording and cognition demand. Sharing a world event does not mean every observer interprets it identically.

## 5. Correctness questions that an optimization cannot answer by speed alone

### Reacting later is different from never recording an event

An actor can postpone expensive interpretation while an event and that actor's exposure remain part of authoritative history. It is a separate semantic choice to omit the observation entirely. The existing [memory architecture](../../docs/memory-architecture.md) and [events, perception and reactions](../../docs/events-perception-and-reactions.md) remain the owners of these commitments. Research about lossy memory compression is not authorization to change them.

### Reuse must not invent shared knowledge

Two characters can occupy the same place but know different entrances, fear different people or have different permissions. Shared terrain computation can be useful, yet the applicability of its result must remain consistent with the information and constraints that determine the actor's action. Shared service infrastructure is easier to justify than silently sharing private evidence. This is a deduction from the individuality requirement, not a claim that a particular researched implementation solves it.

### Smooth movement is not successful action

A crowd can look active while individual actors wait indefinitely, repeatedly request failed routes or cannot reach a particular usable position. ORCA addresses local avoidance; warehouse planning exposes stronger coordination and fairness questions. Navigation quality includes progress and interaction access, not only collision counts. [Navigation evidence](navigation-and-local-motion.md).

### Lower frequency changes semantics unless the intervening time is handled

SUMO explicitly distinguishes physical updates from action decisions and documents consequences when their assumptions differ. The relevant lesson is not to borrow its one-second default. It is to ask which processes can safely advance between decisions, what events can occur between them, and when a previous action becomes invalid. [Transport comparisons](games-and-individual-simulation.md).

### A GPU demonstration is not a deployment conclusion

UEBS2's native GPU crowd pipeline differs from an authoritative browser/server simulation. WebGPU can enable compute and indirect drawing on supported devices, but hardware support, memory transfers, synchronization, server resources and determinism remain separate questions. [Execution and browser evidence](execution-rendering-and-browser.md). No GPU migration or platform change follows from this panel.

## 6. Evidence needed for a future capacity conclusion

The existing performance owners already define qualification work. This research adds questions to interpret future evidence, without creating another implementation or benchmark plan:

| Question                                                                       | Why it affects the conclusion                                                                        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Are the hundreds retained, moving, perceiving, conversing, or deeply thinking? | Each population count describes different work                                                       |
| Are they dispersed or concentrated around contested resources?                 | Density and dependency structure can dominate                                                        |
| How long do routine intentions remain valid?                                   | This determines how much expensive reconsideration is actually necessary                             |
| What happens during a shared emergency?                                        | Average throughput can conceal long visible delays                                                   |
| Which individual facts and causal outcomes remain exact?                       | Fast approximate populations may not meet the intended promise                                       |
| What is included in the timing and cost?                                       | Local simulation, remote inference, network, rendering and persistence can sit on different machines |
| Do actors make progress and react within acceptable time?                      | Stable frame rate alone can hide overloaded decision queues                                          |
| What changes with history length, player count and simulation speed?           | A short fresh single-player scene is an incomplete qualification                                     |

The most defensible research conclusion is therefore conditional and useful: **hundreds of individual animals and characters are a credible objective; the frequency and scope of expensive cognition are central unknowns, not an inherent reason to abandon individuality.** The evidence favors careful separation of identity, intent, execution and presentation. It does not yet choose how Open Legend should realize that separation.
