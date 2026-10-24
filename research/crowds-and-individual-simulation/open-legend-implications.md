# Implications and open questions for Open Legend

| Research status                                                                            | Progress                                                                                                                | Last updated |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed research synthesis; no new architecture or implementation selected by this panel | Connects external evidence to existing project commitments and identifies what future evidence would need to establish. | 2026-10-23   |

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

Substantial design coverage also predates this panel. The [intelligent-simulation integration map](../../docs/maintainers/intelligent-simulation.md) records completed designs for chosen continuation, individual interpretation, shared computation and truthful changes of detail, with implementation and qualification tracked separately. In particular, exact calculated physical advancement and compact expressive background contributions already have selected boundaries. The alternatives surveyed here do not reopen those choices or authorize approximate physical outcomes, invented personal histories or shared private minds. The [research-to-design map](#7-research-to-design-map) identifies where to use the evidence without creating another design programme.

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

### Personal decisions and actor-specific rules

Separate individual attributes, authored capabilities and behavior rules, and the procedure that chooses a person's intention. Shared execution can operate on different personal inputs without choosing everyone's purpose collectively. Conversely, retaining separate IDs and destinations does not establish independent agency if a group controller secretly supplies those destinations.

For cognitively capable characters, the existing [character-authorship boundary](../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality) already distinguishes authoring a person and their circumstances from prescribing their decisions in biography or hidden prompts. Native animal responses remain their own [world-owned behavior](../../docs/worlds/base/animal-responses.md). The request for individuals with their own rules therefore does not require a separate process or unrelated executable program per actor, nor does this research expand the engine's supported authored capabilities. Any proposed shared calculation must preserve the distinctions that actually affect its answer; arbitrary unrelated logic can offer less efficient batching.

### Animals are a strong opportunity, with clear limits

Boids demonstrates that locally evaluated rules can produce complex collective movement. It does not provide a complete animal simulation. Hunger, fear, injury, species-specific behavior, familiarity, territoriality and an established activity can all be individual inputs to relatively inexpensive behavior; the claim here is conceptual compatibility, not a completed Open Legend animal design. [Boids and local rules](navigation-and-local-motion.md#4-two-different-ways-to-produce-believable-collective-motion).

A particular deer can keep its identity, wound and current escape target while using common locomotion rules. That is different from a distant herd existing only as a headcount. Both might produce convincing scenery, but only the former automatically retains those individual facts. Project Zomboid's historical herd approximation is therefore useful evidence of an explicit tradeoff, not proof that Open Legend must make it.

### Rich cognition need not be continuous cognition

A person executing a decision is still acting on that decision. Walking to meet a friend, tending a task or waiting for an agreed time does not logically require repeatedly regenerating the high-level intention. Expensive cognition may matter when interpreting an unexpected event, revising conflicting commitments, negotiating, or drawing on personal history. [Lyfe and Project Sid](cognition-and-agent-systems.md) give concrete examples of separating continued action from expensive reasoning, with different implementations and limitations.

The essential uncertainty is the frequency of situations that genuinely require deeper thought in the intended game. A quiet dispersed village, a dense emergency, and a live conversation expose very different demands. No researched paper settles that distribution for Open Legend.

Sophistication can vary across moments in the **same individual's life**. A person may spend a long time carrying out a chosen activity, then require richer interpretation when circumstances become consequential. This is not a proposal for permanent classes of sophisticated named people and interchangeable background people. Internal concerns, deadlines and quiet opportunities can matter as well as obvious external disturbances. Retaining a valid intention can also make a character more coherent and understandable: follow-through, an intelligible change of mind and a legitimate stopping point are positive behavioral outcomes, not only savings in model calls.

### A personal choice need not be an optimal search result

The [separate public BGS crowd example](uebs2.md#a-separate-public-example-makes-cheap-individuality-concrete) illustrates an additional economy: retain a personal target and improve it using limited candidate checks instead of exhaustively finding the globally best opponent. This mechanism is not established for UEBS2. The transferable observation is that individualized choice does not imply exhaustive optimization. Whether such an approximation is appropriate depends on the choice's consequences and required alternatives; it is not permission to omit required options, drop legitimate observations or change Open Legend's selected physical fidelity. Apparent fallibility alone is not proof of believable judgment.

### What larger populations could add to play

These are **hypothetical opportunities to evaluate**, not implemented features, new authored-world rules or additions to the selected first-playable scope. They apply the mechanisms and distinctions in the [game case studies](games-and-individual-simulation.md) and [cognition research](cognition-and-agent-systems.md). The existing [gameplay priorities](../../docs/repertoires/gameplay-priorities.md) remain controlling: improving a worthwhile encounter does not need to wait for crowd capacity.

| Hypothetical situation                                                                                                  | What the population could make worthwhile                                                                  | Individual consequence and evidence of value                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A herd uses a clearing and scatters around a disturbance; one previously injured animal moves differently               | Recognizing inhabitants, learning their behavior, following physical traces and affecting later encounters | The particular animal's condition remains meaningful. More animals add situations the player can understand and influence, rather than only repeated decoration.                    |
| A familiar craftsperson carries out a chosen delivery through a busy settlement                                         | Following, intercepting, helping or relying on someone with a life beyond the immediate conversation       | Shared movement executes that person's intention. Intervention can alter their actual outcome, and a changed purpose has a grounded cause.                                          |
| Different people witness different parts of one incident                                                                | Asking questions, comparing accounts, discovering possibilities and deciding whom to trust                 | Differences follow exposure, interpretation and uncertainty. Variation in generated dialogue alone does not establish different lived perspectives.                                 |
| A crowded emergency brings flight, assistance, conflicting commitments and efforts to reach particular people or places | Consequential choices about whom to help, where to go and how to change the situation                      | Actors make useful progress while retaining their own choices. A high aggregate evacuation rate does not establish that the particular person needing help was served.              |
| A gathering continues before the player arrives, and a prior promise matters within it                                  | Joining an ongoing activity, discovering an opportunity, negotiating, declining or returning later         | The player's arrival can affect unresolved choices without rewriting completed events. The activity and its payoff remain understandable without reading every background exchange. |

The useful product question is what an additional population enables someone to do, discover, enjoy or affect. Compare with a smaller population that can already deliver the same activity. More actors can increase opportunities, uncertainty and remembered consequences; they can also add waiting, visual confusion and reading burden. A responsive, legible small encounter can be more valuable than a larger technically impressive crowd. These are evaluation hypotheses, not measured enjoyment findings or an argument to lower the research ambition of at least hundreds of actors.

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

## 7. Research-to-design map

The panel supplies comparative evidence and useful cases to existing owners. It does not create a replacement feature/technical pair, new ND IDs or another performance backlog. The [needs-design register](../../docs/maintainers/needs-design.md#intelligent-individuals-and-efficient-simulation-research-derived-design-follow-up) and [IS integration map](../../docs/maintainers/intelligent-simulation.md) distinguish completed design from remaining delivery. Read their current scope before treating a research question as missing design.

| Research question or opportunity                                                   | Existing owner                                                                                                                                                                                                                                                                                    | How to use this panel                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Who chose the intention, and what can continue without choosing again?             | [Character authorship](../../docs/projects/compelling-characters-feature-spec.md#character-authorship-and-changing-personality), [DG02](../../docs/maintainers/needs-design.md#dg02--one-resident-who-follows-through), IS01–IS03                                                                 | Keep personal motivation distinct from shared execution. Apply existing continuation and conditional-routing designs to an actual omission or cost; do not replace them with prescribed personality scripts or a permanent cheap/expensive caste.                                                                 |
| What makes many animals interesting as particular inhabitants?                     | [ND06's selected wildlife](../../docs/maintainers/needs-design.md#nd06--ecology-aging-and-generations), [RW delivery](../../docs/maintainers/first-playable-roaming.md), [animal responses](../../docs/worlds/base/animal-responses.md)                                                           | Use individual condition, local interaction and observable consequences within the selected wildlife scope. Use RW's current delivery and encounter-evidence status; full ecology, generations and animal LLM cognition are not prerequisites.                                                                    |
| Which geographical work is equivalent, and can each actor actually arrive and act? | [Spatial movement](../../docs/spatial-world.md#movement), [shared-computation comparison](../../docs/projects/intelligent-simulation-evaluation-tech-design.md#shared-computation-experiment), IS06 and PF09                                                                                      | Separate engine collision knowledge from personal knowledge or route preference; distinguish route search, avoidance and usable arrival. Include concentrated contention and the progress of particular actors in the relevant existing comparison, without assuming a new pathfinder or universal fairness rule. |
| What does a larger attended gathering add?                                         | [DG18](../../docs/maintainers/needs-design.md#dg18--worthwhile-crowds-and-background-social-scenes), [attention/scenes contract](../../docs/product-scalability/attention-and-scenes.md), [PS04](../../docs/maintainers/product-scalability.md#ps04--coherent-scenes-and-limited-attention), IS05 | Connect population to useful independent contributions, readable choices and intervention. Exact attended speech and selected compact background contributions retain their distinct evidence contracts; broader aggregate sound and larger gatherings keep their existing selection gates.                       |
| What survives reduced computation or a change in detail?                           | [Selected fidelity and readiness](../../docs/maintainers/intelligent-simulation.md#selected-scope-and-readiness), IS07 and [PS05](../../docs/maintainers/product-scalability.md#ps05--transitions-protection-logout-and-clocks)                                                                   | Preserve the already selected exact physical outcomes and truthful source precision. Other games' herd aggregation and lazy biographies are comparison points, not adopted permissions. Camera distance alone does not establish irrelevance.                                                                     |
| When does deeper thinking earn its latency and cost?                               | IS02–IS03, [evaluation feature](../../docs/projects/intelligent-simulation-evaluation-feature-spec.md), [conditional routing](../../docs/projects/intelligent-simulation-evaluation-tech-design.md#conditional-routing-and-calibration)                                                           | Compare ordinary continuation, meaningful exceptions and quiet initiative through the existing episode framework. Significance detection itself has a cost; more frequent or more capable generation is a comparison, not an oracle.                                                                              |
| What would satisfying the ambition of hundreds actually mean?                      | IS09, [PS08](../../docs/maintainers/product-scalability.md#ps08--broader-experience-and-scale-qualification), [PF11](../../docs/maintainers/performance.md#pf11--scale-qualification-and-continuous-regression)                                                                                   | For the selected experience, distinguish retained identities, moving bodies, perceiving actors, active interactions and simultaneous deliberations. Carry the actual scene, clock, response/progress requirements and complete costs into existing qualification; external counts do not close it.                |

A new design is warranted only when a selected experience exposes a concrete missing contract in these owners. Unfinished implementation, proprietary UEBS2 unknowns and an unrun comparison are different kinds of gap. None by itself justifies a new crowd architecture document or reopening an already settled design decision.
