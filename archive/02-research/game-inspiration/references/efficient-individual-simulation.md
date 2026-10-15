# Efficient simulation of continuing individuals

**Research synthesis, October 14, 2026.** This document compares engineering mechanisms and their semantic costs. It does not select a new OpenLegend engine, mandate a scheduler, approve a model vendor or report a runtime benchmark.

[Main NPC guide](../synthesis/characters-companions-and-relationships.md) · [Game implementation evidence](game-ai-implementation-and-scale.md) · [Language-model societies and Simile](language-model-societies-and-simile.md)

## 1. Optimize the work, not the word “agent”

A person can remain identifiable while their body is not drawn, continue an activity without choosing it again, and remember an experience without retrieving it into every prompt. These are different kinds of economy. Conversely, replacing a particular person with a statistical population average changes what is represented, even if the resulting crowd looks similar.

For a concrete workload, separate at least movement and interaction, world processes, observation, candidate discovery, decision, memory work, persistence and presentation. A fast decision API can still be surrounded by expensive scans and serialization. A fast native world can still wait on model queues. An idle crowd is not a proxy for a group exchanging possessions, speaking, changing plans and remembering outcomes.

### Three classes of optimization

| Class | Illustrative proposal | What must be established |
| --- | --- | --- |
| Preserve the represented behavior while avoiding repeated work | Reuse a valid route; share an immutable method definition; update only facts that actually changed. | The skipped calculation could not change the relevant outcome under its stated assumptions. |
| Approximate behavior under an explicit fidelity contract | Advance distant travel at a coarser resolution; use a cheaper decision model in qualified circumstances. | Which differences are permitted, how transitions preserve continuity, and which important cases still require detail. |
| Change the product or world's rules | Replace individual residents with anonymous population totals; forbid a class of interactions; make fewer, stronger enemies. | An explicit design choice, not a claim that the same simulation became faster. |

Factorio's developer accounts provide useful examples across these classes. Its belt work changes how unchanged spacing is represented, while other optimization ideas explicitly simplify the simulated problem. The [game evidence supplement](game-ai-implementation-and-scale.md#factorio) retains the versioned source distinctions. Do not present all three classes as interchangeable “level of detail.”

## 2. Let a choice remain useful

The options framework in reinforcement learning formalizes temporally extended, closed-loop behavior rather than requiring a new top-level choice after every primitive step. Its relevance here is the separation of choosing an activity from executing a policy over a period; the paper is not evidence that an OpenLegend character should optimize a single reward function. [E1]

**Our application hypothesis:** a character can choose a bounded activity with a purpose, known means, a stopping condition and limits on acceptable substitution. Native work then continues until something relevant changes. The resulting savings are primarily fewer opportunities requiring a new decision, not merely fewer output tokens.

A person who has chosen to repair a roof need not reconsider their life at every hammer stroke. But changing from designated timber to another person's possessions is not merely a low-level implementation detail. The purpose can remain unchanged while the new means raise a consequential choice. Autopilot's discretion must be narrower than “anything that achieves the objective.”

This does not require a giant universal symbolic planner. A small reusable procedure is often enough. Search is useful when choosing among known alternative means; interpretation is useful when deciding whether those means fit the person's values and circumstances. Neither should invent knowledge of a hidden recipe or treat a predicted result as an actual world effect.

## 3. Schedule reconsideration around dependencies, without pretending to understand everything

Discrete-event simulation advances through scheduled changes rather than scanning every process at the same frequency. SimPy's scheduling guide illustrates a deterministic event queue, including explicit ordering for events with the same simulated time. This is a useful implementation reference, not proof that an event queue is always faster than a dense update loop. [E2]

**Our application hypothesis:** after an activity is chosen, watch the small set of facts supporting it. A relevant target disappears; supplies are exhausted; an expected result arrives; a chosen review time is reached; a participant withdraws agreement. The character may then reconsider. These conditions invite a decision rather than prescribing its answer.

Some work remains naturally frequent: motion near contact, rapidly changing hazards and tightly coupled physical processes. A hybrid can schedule sparse changes while updating active physical neighborhoods regularly. Event storms, repeated invalidation and the cost of maintaining subscriptions can erase the expected savings. Measure both ordinary steady work and bursts.

### The semantic novelty problem

A cheap predicate cannot recognize every personally meaningful remark. A statement may matter because of a distant memory, an unusual value or an interpretation not anticipated by the current plan. Calling a large model on every observation to decide whether it deserves a large model is not an efficient solution.

Possible research candidates include character-selected attention cues, cheap matching against relevant entities and commitments, small-model classification where qualified, and some budgeted open-ended reconsideration. None guarantees perfect recall of meaningful moments. Quiet curiosity, chosen leisure and reconsideration without a crisis must retain a route into behavior; otherwise the system becomes an emergency-response bot with dialogue.

Coalescing notifications can reduce repeated work, but should not erase distinct meanings. “Request received,” “request withdrawn” and “request renewed under different terms” are not necessarily one replaceable notification. Summarize repetitions where their identity and causal order are immaterial; retain actual events where another decision depends on them.

## 4. Think about thinking only when that helps

Metareasoning treats computation as an action with a cost and an expected benefit to the eventual decision. Hay and colleagues formulate this selection problem rather than assuming unlimited deliberation is always worthwhile. A later LLM study reports reducing tokens through training with a computation cost on its evaluated tasks. Neither supplies a calibrated gate for personally meaningful NPC choices. [E3, E4]

**Our application hypothesis:** the value of another decision depends on plausible alternatives, the chance that the current plan is wrong, the consequence of being wrong and the time available to act. An unfamiliar but reversible choice may be less urgent than a familiar choice involving a promise or irreversible loss.

Do not reduce that to the gap between the two highest action scores. The [Simile study](language-model-societies-and-simile.md#2-what-simile-added-in-2026) explains why concentrated predictions and confidence in their correctness are different. A character may confidently understand two equally appealing activities. Conversely, one strongly preferred action may rest on missing evidence.

A practical gate also has overhead: candidate preparation, retrieval, tokenization, inference and logging. Count the calls that say “continue” as well as the calls that change behavior. A cheap rule proving that an already accepted step remains applicable may be preferable to a model asking the same question again. An uncalibrated model's self-reported confidence is not such a proof.

## 5. Data layout and information locality

FLAME GPU 2 separates model description from execution, organizes typed agent variables for efficient access, specializes messages and uses explicit function dependencies to expose concurrency. Its paper also emphasizes moving only needed data and resolving competing agents' resource requests deliberately. GPU execution order alone does not preserve a serial model's allocation behavior. The experiments concern mathematical agent models, including Sugarscape, not language-model minds. [E5]

**Our application hypotheses:**

- Keep frequently updated physical fields separate from rarely read biographies and archived history. Do not copy the whole person to update a position.
- Share immutable capability and object descriptions, but retain each person's own progress, knowledge, permissions and experience.
- Ask spatial or relationship indexes for plausible candidates before doing expensive visibility or semantic work. An index narrows a search; it must not grant knowledge.
- Update derived results when their actual dependencies change. A global “world changed” flag is easy to implement but can discard nearly every useful cache.

The architecture should still fit the project. Introducing a GPU simulation framework for a modest TypeScript world could add deployment, data transfer and debugging costs larger than the savings. First identify the dominant repeated work. GPU suitability depends on sufficiently regular, parallel workloads; highly divergent long language decisions are a different problem from numerically updating positions.

### An index is not a second source of truth

A stale search result can suggest an action, but the authoritative operation must check its current prerequisites. Store the relationship between a derived result and the evidence supporting it; do not give both the cache and the canonical record independent mutation authority.

Invalidation should be precise enough to retain useful work, but not so elaborate that every minor change requires rebuilding a large dependency graph. Start at existing semantic owners, with known consumers and measured repeated work. This is a research direction, not permission to create speculative infrastructure.

## 6. Movement has several different problems

Reynolds's flocking work demonstrates coordinated-looking group motion from local steering rules. ORCA formalizes reciprocal collision avoidance, splitting responsibility between interacting agents and selecting velocities through a small optimization problem. Its authors show robotics and crowd examples. Neither technique decides why a person should travel or whether another person has agreed to accompany them. [E6, E7]

**Our application hypothesis:** separate destination choice, route planning, local avoidance, body execution and social interpretation. A route can be mechanically valid but socially unacceptable. A local steering policy can avoid an immediate collision while failing to find a route through a crowded doorway. A formation can move coherently without its participants sharing every intention.

Factorio's hierarchical pathfinding is a useful example of an inexpensive abstraction serving as a hint to more detailed search, rather than being treated as final proof of reachability. See the [technical supplement](game-ai-implementation-and-scale.md#factorio). For OpenLegend, geometry, body capability and current obstacles must still govern admission.

Potential shared computation includes paths to a common destination, static connectivity and nearby obstacle queries. Sharing does not imply that everyone may take the same dangerous shortcut, traverse the same opening or know the same destination. Avoid conflating geometric reuse with shared knowledge or consent.

## 7. Parallel work needs causal discipline

Parallel discrete-event simulation research separates logical processes while preserving event causality. Conservative approaches avoid unsafe advancement; optimistic approaches can recover after processing events out of order. The surveyed tradeoffs include synchronization and memory overhead, not just more processors. [E8]

**Our application hypothesis:** parallelize preparation and independent work before distributing authority over tightly coupled world effects. Two people attempting to consume the same item need a definite outcome. Two asynchronous decisions based on a shared snapshot do not both acquire the resource merely because each proposal was reasonable when generated.

A character's response should be checked against facts relevant to that response when it arrives. An unrelated distant movement need not invalidate a local decision. A changed intention, withdrawn agreement or consumed resource may. Record stale, cancelled, failed and completed work distinctly; discarding an answer does not prove that a paid request cost nothing.

Optimistic rollback is especially awkward for external calls and player-visible effects. A simulation can restore a local record, but cannot assume a provider refunds a completed inference or that a human forgets what they already saw. That is a reason to be cautious about borrowing rollback schemes, not a claim that all parallel simulation is unsuitable.

A single process with carefully bounded asynchronous inference can be a better first implementation than a distributed actor per NPC. An individual identity does not require an operating-system thread, process, container or VM. Isolation, recovery and workload may justify those boundaries in particular cases; the word “agent” does not.

## 8. Fidelity should be multidimensional

A distant person might need no animation while still participating in an important exchange. A nearby sleeping person might need visible breathing but little deliberation. Camera distance alone is therefore a weak proxy for cognitive importance.

Consider presentation detail, physical resolution, interaction detail, observation frequency, deliberation frequency and retained personal evidence separately. Reducing one does not automatically authorize reducing the others. In particular, identifying a character as unobserved by the player does not mean no other character can observe or be affected by them.

### Preserve the connected consequences that matter

**Hypothetical example:** a distant baker is expected to deliver food to a nearby gathering. Coarse work advancement still needs actual ingredients, time, ownership and a delivery outcome. If the baker is interrupted, the resulting shortage should not be replaced by a fabricated successful delivery when the player arrives.

An approximate model needs a declared account of what it computes and what it leaves unknown. On returning to more detailed simulation, preserve identity and compatible outcomes; do not invent a precise personal memory for an event that was never represented. A coarse estimate can be presented as an estimate, not retroactively promoted into witnessed history.

Analytical fast-forward can be appropriate for a process whose intermediate states have no relevant interactions. A rate change, threshold, arrival or new observer can invalidate that assumption. Skipping directly over a lethal threshold or over the moment another person could intervene changes the story, even when an end-of-interval number looks plausible.

### Aggregate behavior is a different fidelity target

AgentTorch's archetype tutorial provides a concrete alternative: shared behavioral rules or language-model outputs condition population behavior through reusable archetypes. That can support large-scale population modeling without a distinct language-model conversation for every individual. It does not establish that archetypes preserve a particular person's unusual memories or commitments. [E9]

For OpenLegend's individually cognitive people, begin by sharing mechanics and avoiding redundant decisions. Use population aggregation only where the authored world's promise permits it. Keeping a million labels is not the same as retaining a million distinct lives.

## 9. Memory and history costs are also behavioral choices

Memory can have multiple useful access forms: recent exact outcomes, durable facts and commitments, searchable older episodes, and summaries or interpretations. The underlying occurrence and the person's account should remain distinguishable. A summary index can reduce search cost without becoming the sole surviving authority over the past.

Retrieval should be scoped before semantic ranking. A very relevant secret is still unavailable to a character without access. Repetition, salience and relevance can compete: a quiet fulfilled promise may matter more than the twentieth dramatic retelling of an unrelated fight.

Measure what compaction loses, not only how small the prompt becomes. Persistent activity progress should not depend on optional autobiographical retrieval. Conversely, retaining an activity's progress should not be mistaken for retaining its emotional meaning. Background reflection can reinterpret experience without overwriting actual receipts or another person's private state.

The [language-model research](language-model-societies-and-simile.md) examines these distinctions and current evaluation limits. Existing [OpenLegend memory architecture](../../../../docs/memory-architecture.md) remains the contract; this research does not replace its scheduling or retention requirements.

## 10. A budget model and an evidence-producing comparison

For an illustrative workload, total decision rate is approximately the sum of each active person's admitted reconsideration rate. Multiply each class of decision by its complete average cost, then add native simulation, retrieval, storage and presentation. This is an accounting identity, not a forecast. Costs vary with context size, output, cache eligibility, provider, batching and failures.

Report both **per real hour** and **per simulated day**. Accelerating the clock can change urgency and the number of decisions required per real second. A fixed call allowance can become a behavioral handicap if native consequences advance while every character waits for inference. The response to overload should be explicit and consistent with the world/time contract, not concealed as an in-world personality change.

Measure steady state, burst arrivals and tail latency. A fire or public announcement can wake many people together. Admission queues, useful coalescing, fair scheduling and already-authorized continuing work may help, but must not let permanently quiet individuals disappear from cognition. Spending limits and fairness are separate constraints.

A focused future comparison should retain the same authored people, opportunities, permitted evidence and action mechanics while changing one optimization. Evaluate completed activity, relevant interruption, later recollection and stopping. Include a quiet successful episode, a resource conflict, a personally meaningful exception and provider unavailability. Count local work and all model-related calls. No such comparison was run for this research.

## 11. Priorities and disconfirming evidence

Our recommendation is to investigate, in order: unnecessary repeated preparation; continuity of a valid chosen activity; relevant outcome delivery; precise reconsideration; and only then broader approximation or learned routing. This is a proposed study order, not a new implementation roadmap.

The recommendation should change if profiling finds another dominant cost, if maintaining dependencies costs more than reevaluation, or if delayed reconsideration consistently misses consequential meaning. A cheaper system that preserves the ordinary majority but loses every interesting exception is not an adequate result. A more elaborate system that saves little and obscures authority should be simplified.

## Primary source register

All accessed October 14, 2026. No benchmark below was reproduced. Links identify the actual paper or official documentation; applicability beyond the stated task is our analysis.

- **E1:** Sutton, Precup and Singh, 1999, [Between MDPs and semi-MDPs: A framework for temporal abstraction in reinforcement learning](https://www.sciencedirect.com/science/article/pii/S0004370299000521). Abstract and framing; not a claim of inspecting every theorem.
- **E2:** [SimPy, Time and Scheduling](https://simpy.readthedocs.io/en/latest/topical_guides/time_and_scheduling.html). Scheduling semantics; the rolling documentation version is not a project dependency selection.
- **E3:** Hay, Russell, Tolpin and Shimony, 2012, [Selecting Computations: Theory and Applications](https://proceedings.mlr.press/r10/hay12a.html). Primary proceedings summary.
- **E4:** De Sabbata, Sumers and Griffiths, 2024, [A rational analysis of computation in language models](https://arxiv.org/abs/2410.05563). Primary abstract; task-specific token savings are not imported as a game forecast.
- **E5:** Richmond et al., 2023, [FLAME GPU 2](https://onlinelibrary.wiley.com/doi/10.1002/spe.3207). Full HTML architecture, data movement, concurrency, conflict-resolution and experiment sections reviewed. Its benchmark hardware and disabled checking configuration matter when reading its numbers; no GPU throughput target is adopted here.
- **E6:** Craig Reynolds, [Boids](https://www.red3d.com/cwr/boids/) and [1987 paper page](https://www.red3d.com/cwr/papers/1987/boids.html). Author's description of local behavioral emergence.
- **E7:** Van den Berg et al., [Optimal Reciprocal Collision Avoidance](https://gamma-web.iacs.umd.edu/ORCA/). Authors' method and experiment description. No videos or integration benchmark viewed/run; library licensing and suitability require separate evaluation before reuse.
- **E8:** Ferscha and Tripathi, 1998, [Parallel and Distributed Simulation of Discrete Event Systems](https://drum.lib.umd.edu/items/4eddc168-df99-48f8-8bc5-b49a19032b13). Authors' institutional report abstract; the survey's full algorithms were not audited.
- **E9:** [AgentTorch, Configuring Agent Behavior](https://agenttorch.github.io/AgentTorch/tutorials/configure-behavior/) and [Creating Archetypes](https://agenttorch.github.io/AgentTorch/tutorials/creating-archetypes/). Official tutorial architecture, not an independently verified population-scale deployment.

This source-limited synthesis leaves actual performance, acceptable behavioral approximation, calibration and player-experience effects open. It authorizes no paid calls, runtime change or new engine law.
