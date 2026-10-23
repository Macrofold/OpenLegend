# Cognition, individual agents, and the meaning of scale

| Field         | Status                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| Research date | 2026-10-23                                                             |
| Status        | Completed desk research; no benchmark performed                        |
| Evidence      | Original papers; published results are attributed to their authors     |
| Scope         | Broad research and limitations; no Open Legend implementation selected |

The central research question is not whether a large population can retain individual state. It is how much new work each individual requires, how often that work runs, and what delay or simplification the world permits. A character's persistent memories and motives are different resources from its moment-to-moment movement. Calling both “AI” can hide enormous differences in cost.

The studies below show that individual language-model agents can exist at substantial scale. They also show why headline population alone is misleading: a conversational village, a Minecraft society, and a city simulation advancing through five-minute decision rounds are different workloads. Their counts cannot be compared without cadence, hardware, model, prompt size, interaction rate, and responsiveness.

## 1. What the original agent papers actually demonstrate

### Generative Agents / Smallville: memorable behavior at high historical cost

**Source:** Park et al., _Generative Agents: Interactive Simulacra of Human Behavior_, UIST 2023; arXiv v2, 2023-08-06. [Original paper](https://arxiv.org/html/2304.03442v2).

The 25-agent study combines observations, memory retrieval, reflection, and plans. Section 8.2 reports that two in-game days required thousands of dollars in tokens and multiple real days in its historical implementation. Appendix A describes cached identity/motive summaries and detailed plans constructed just before use rather than expanding an entire future in advance. Proposed future savings include batching dialogue, partial replanning, and parallel agents; these are not all measured results of that experiment.

**Limits:** The published cost describes its 2023 model/workload, not present pricing. A simulated-minute conversion in the implementation description is not equivalent to the full experiment completing at that ratio. Twenty-five convincing agents demonstrate behavioral possibilities, not the feasibility of hundreds of equivalent agents on consumer hardware.

### Lyfe Agents: temporally extended intentions reduce repeated reasoning

**Source:** Kaiya et al., _Lyfe Agents: Generative agents for low-cost real-time social interactions_, 2023-10-03. [Original paper](https://arxiv.org/html/2310.02172v1).

An LLM chooses a high-level option and subgoal, then lower-level activity continues until a cheap non-LLM termination condition calls for reconsideration. Conditions include elapsed time and repetition. Conversation still generates words with an LLM; the approach does not make every lower-level action free. Asynchronous summarization handles relevant new observations, while memory compression/forgetting controls storage and context. The authors report about $0.50 per agent per human hour with their 2023 GPT-3.5 setup. Their advertised 10–100-fold comparison with Smallville partly depends on estimates and differing simulation speed assumptions, not a matched workload benchmark.

**Research implication:** Persisting an intention can improve behavioral coherence as well as reduce model calls. Forgetting or summarizing memories changes retained information; compatibility with an exact, persistent experience record is a separate question. Historical dollar figures are not current cost estimates.

### Project Sid: concurrent cognition and reflexes, with a 1,000-agent caveat

**Source:** Altera et al., _Project Sid: Many-agent simulations toward AI civilization_, arXiv v1, 2024-10-31. [Original paper](https://arxiv.org/html/2411.00114v1).

PIANO uses concurrently running modules with different rates and roles. Shared agent state and a cognitive controller maintain coherent intent across actions and speech; some social processing is conditional, and small non-LLM neural reflexes handle rapid reactions. The paper's headline scale requires qualification: Section 5.3 says runs exceeding 1,000 agents surpassed Minecraft server computational constraints and became sporadically unresponsive. The cultural analysis instead uses one 500-agent run lasting 9,000 seconds across six towns and surrounding rural areas within a 1,000-by-1,200-block region. Other experiments use smaller populations and durations, so their results should not all be attached to the maximum headline count.

**Limits:** It does not establish a reproducible consumer-hardware budget for hundreds of deeply deliberating game characters. The inspected passages do not give a complete per-agent token/cost/tail-latency budget. Per-agent modular execution is different from a common group mind; a small neural policy is also computationally different from generating a new large-model response.

### AgentSociety: 30,000 individual LLM agents, five-minute decision rounds

**Source:** Zhang et al., _A Parallelized Framework for Simulating Large-Scale LLM Agents with Realistic Environments and Interactions_, ACL 2025 Industry Track, 2025-07-28–30. [Paper page](https://aclanthology.org/2025.acl-industry.94/), [original PDF](https://aclanthology.org/2025.acl-industry.94.pdf).

The reported 30,000-agent configuration uses 24 A800 40GB GPUs across three servers, Qwen2.5-7B-Instruct, and vLLM 0.8.1. Its agent iteration corresponds to 300 simulated seconds. Table 1 averages ten rounds: with eight agent groups, a 30,000-agent round takes 251.85 seconds and each LLM call averages 123.22 seconds. Four groups take 327.39 seconds per round; higher concurrency can overload the service. Average prompts contain about 348 input and 62 output tokens. Grouping agents into worker processes with shared network clients avoids the memory and port exhaustion caused by per-agent processes. Individuals remain separate. The underlying mobility simulator steps at one second; this is distinct from the LLM iteration cadence.

**Limits:** Faster-than-real-time here means finishing a five-minute model round in less than five wall-clock minutes. It does not mean subsecond cognition, 30,000 rendered bodies, or game-frame physics. The same eight-group row reports 70.7 agent-message-system calls per round against 29,869.7 successful LLM calls. That is the paper's message-system metric, not a count of conversations; it does not establish the cost of a continuously conversing crowd. Hardware, cadence, queue latency and interaction workload must accompany every scale claim.

### Concordia: concurrency and variable simulation time, not a scale benchmark

**Source:** Vezhnevets et al., _Generative agent-based modeling with actions grounded in physical, social, or digital space using Concordia_, 2023-12-06. [Original paper](https://arxiv.org/html/2312.03664v1).

Concordia combines an LLM with memory/components and a game master that resolves intended actions into world effects. Appendix A.5 identifies API waiting as a major bottleneck and updates independent components concurrently, while offering a sequential wrapper where ordering is necessary. Nested scenarios can run on a finer clock than their surrounding simulation, for example for a conversation.

**Limits:** These are useful scheduling concepts, not a measured demonstration of hundreds of responsive agents. A model-driven game master adds work and uncertainty that differs from executing actions against a deterministic game simulation.

## 2. Individuality, cognition, and execution are separate commitments

An individual can have a distinct identity, memory, private knowledge, current intention, and outcome even when its update procedure is shared with every other individual. A shared rule is a mechanism; the state and evidence supplied to it determine whose decision it is. Conversely, making a separate model call for every character does not by itself produce coherent individuality. If the call ignores that character's history or changes goals arbitrarily, additional computation may make the behavior less consistent.

It helps to separate three questions. **What persists?** This concerns identity, knowledge, relationships, and commitments. **What selects or revises an intention?** This concerns cognition, planning, or reactive choice. **What carries out the intention?** This concerns movement, object interaction, animation, and concrete state changes. These questions can run on different time scales without implying that only the most expensive component is “real.”

A person walking toward a chosen shop is still acting on a personal intention while following an existing route. An animal already fleeing a threat can continue to move without reconsidering its entire life strategy. The meaningful requirement is that relevant changes can affect the individual appropriately: a blocked route, a new threat, a completed activity, or changed circumstances can make continuation wrong. Expensive rethinking is useful when it changes the action, not merely because another frame has elapsed.

This does not claim that every sophisticated behavior can be reduced to a short rule. Some situations depend on accumulated personal experience, conflicting commitments, negotiation, or inference about others. The research supports distinguishing these situations from routine execution; it does not identify a universal boundary or select one for Open Legend.

## 3. Event-driven cognition has benefits and limits

There are several ways to avoid reconsidering an unchanged decision: retain the intention until completion, react when relevant state changes, periodically check whether assumptions still hold, or reconsider when a deadline arrives. These are conceptual scheduling options. They do not prescribe an Open Legend implementation, and they need not be mutually exclusive.

The advantage is straightforward: a character need not spend equal reasoning effort on every instant of an uneventful activity. The corresponding challenge is deciding what counts as a relevant change. If significance detection itself requires an expensive model call for every observation, the intended saving may disappear. If it is too coarse, the character may miss a subtle event that matters to its goals or relationships.

Event-driven work can also arrive in bursts. A shared disturbance may require many characters to react at once. Low average cost therefore does not guarantee acceptable response time. A useful future evaluation would distinguish routine load from bursts, completion time from queue waiting, and average reaction from the slowest visible reactions. These are evidence requirements, not benchmarks performed in this panel.

Keeping an intention also creates a behavioral tradeoff. Too little persistence makes agents fickle; too much makes them appear oblivious. A believable character may react immediately to an urgent obstacle while postponing a larger change of plans. The correct balance depends on the world and the kind of character. Animals, townspeople, active combatants, and conversational participants do not have the same reasons to reconsider.

## 4. Cheap rules, small policies, and large-model generation

A fixed rule can evaluate numerical state and choose from a small set of actions. A trained policy can map observations to an action through a bounded inference computation. A language model generating text normally performs successive token-generation work, with cost also affected by its input context and output length. All can contribute to intelligent behavior, but their execution profiles differ.

An individual's behavior can therefore combine expensive interpretation with inexpensive continuation. A high-level choice can constrain subsequent actions, while a cheaper mechanism carries out an established task. The key question is what authority the continuation mechanism has: whether it may change the goal, merely select the next movement, or only stop when the existing action becomes invalid. This panel identifies the distinction without choosing a hierarchy for Open Legend.

There is also a distinction between a learned policy and a hosted language-model call. Both may use neural networks, but “neural AI” is not a meaningful unit of cost. Model size, observation format, action space, invocation frequency, memory traffic, output generation, and service latency all matter. Similarly, a simulated social exchange with generated prose does different work from a numerical relationship update, even if both ultimately affect the same friendship value.

## 5. Memory is more than storage capacity

An agent's past can be stored without rereading all of it at every decision. The canonical record, the subset retrieved for a current task, a compressed summary, and the model's active context are separate concepts. Their relationship determines both cost and behavior.

Summarization may save context work while losing detail, uncertainty, chronology, or the distinction between direct observation and hearsay. Retrieval can omit a decisive fact even when it remains stored. A compact behavioral state can support a current routine without representing why the character acquired it. These are different forms of simplification, with different consequences for a world promising individual cognition and personal continuity.

That distinction is especially relevant when comparing “believable behavior” evaluations with a game that requires inspectable causal history. A plausible answer after a compressed memory is not necessarily a faithful continuation of everything that happened. The cited agent papers offer techniques and evidence about their tasks; they do not settle which information Open Legend is allowed to lose.

## 6. What a population number must be accompanied by

| Question                                                            | Why it changes the interpretation                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| How many individuals are retained, active, and deeply deliberating? | These can be three different populations.                                                                     |
| What action does one decision select, and how long does it last?    | An intention covering minutes differs from a choice required several times per second.                        |
| How frequently do agents interact?                                  | A dispersed population can be cheaper than a smaller tightly coupled crowd.                                   |
| What are the model, context, and output sizes?                      | Equal call counts need not mean equal inference work.                                                         |
| What hardware or remote service performs the work?                  | Framework throughput alone does not specify the cost of the inference resources.                              |
| What are the response-time distribution and failure rate?           | Aggregate throughput can coexist with characters waiting too long.                                            |
| Which costs are included?                                           | A brain subsystem may exclude perception, navigation, rendering, physical interaction, or memory maintenance. |
| What happens when an agent is inactive or remote?                   | Persistence, coarse individual simulation, and population aggregation make different promises.                |

A simple accounting relationship is useful without predicting capacity: total deliberations per second depend on population multiplied by deliberation rate, summed across kinds of activity. Inference work additionally depends on what each call contains. Movement, perception, interactions, memory, and presentation impose separate costs. Parallel execution can use hardware more effectively and hide waiting, but it does not eliminate the underlying work.

For Open Legend, the defensible conclusion is that hundreds of individually meaningful actors deserve investigation, including characters whose deeper thinking happens intermittently while personal intentions guide ordinary behavior. The available research does not justify promising hundreds of continuously deliberating language-model minds at game-frame responsiveness on an unspecified machine. The opportunity lies in understanding precisely which individual commitments need continuous computation and which can remain valid between meaningful changes.

## 7. Scientific agent-based simulation: individuality without language-model cognition

Scientific simulators provide another kind of evidence: very large populations can retain separate state and execute individual rules. Their agents may be cells, particles or animals with numerical attributes. They are not necessarily language-model agents or characters with autobiographical memory. The relevant distinction is between the existence of individual state and the amount of computation needed to update that state. Neither a billion scientific agents nor a thousand LLM agents specifies a general-purpose game capacity.

### FLAME GPU 2: individual state with shared GPU execution

The [2023 FLAME GPU 2 paper](https://eprints.whiterose.ac.uk/id/eprint/199416/1/Softw%20Pract%20Exp%20-%202023%20-%20Richmond%20-%20FLAME%20GPU%202%20%20A%20framework%20for%20flexible%20and%20performant%20agent%20based%20simulation%20on%20GPUs.pdf) describes typed agent state, behavior functions, communication, state changes, birth and death. Structure-of-arrays storage places the same variable for many agents together, making concurrent reads efficient. Grouping work by state reduces divergent execution. Spatial sorting improves locality, while small populations may underutilize the GPU. Its “circles” benchmark is a simple force-particle model. The timing and capacity results below refer to that workload. The paper's Sugarscape experiment also counts environment cells as agents; its population cannot be read as an equal number of mobile characters.

| Reported result                                                | Machine and workload qualification                                                                                                   | What the number establishes                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Approximately 3 ms per step for one million circle agents      | One 32 GB V100 and one allocated CPU core on a Xeon Gold 6138 node; spatial partitioning; runtime checks disabled after verification | Numerical simulation-step performance, not full gameplay      |
| Up to 200 million circle agents; about 500 million anticipated | V100 32 GB capacity statement; A100 80 GB extrapolation                                                                              | The first has no attached latency; the second is a projection |

The framework authors' [February 2023 engineering article](https://developer.nvidia.com/blog/fast-large-scale-agent-based-simulations-on-nvidia-gpus-with-flame-gpu/) explains that agent functions are compiled into GPU code, rather than running an ordinary Python interpreter loop for every individual. It also describes iterative conflict resolution when agents compete to occupy cells. Sharing execution therefore does not eliminate the need to define whose action succeeds. Its CUDA–OpenGL visualizer can connect simulation data directly to instanced rendering, but that is a particular native implementation, not evidence of the same cost in a browser.

### Interaction topology and reading nearby data

[FLAME GPU's communication documentation](https://docs.flamegpu.com/guide/agent-functions/agent-communication.html) distinguishes spatial messaging from broader message access. Spatial queries return nearby candidates and can include some outside the requested radius, requiring an exact distance check. This separates discovering candidates from deciding whether they interact.

**Research inference:** interaction structure can matter as much as population. A dispersed population with short-range communication asks different questions from a dense crowd, a network of distant social relationships, or agents repeatedly reading global state. Spatial proximity in the world can support efficient data access, but it does not automatically organize a relationship graph or private memories. Making the movement stage local does not make every cognition stage local.

### BioDynaMo: CPU locality and omitting provably redundant mechanics

The [PPoPP 2023 BioDynaMo paper](https://arxiv.org/abs/2301.06984) describes OpenMP execution, optimized uniform-grid neighbor search, parallel merging of added or removed agents, spatial sorting, a pool allocator, and iteration arranged around NUMA memory locality. NUMA means that a processor can access some memory more cheaply than memory attached to another processor. These techniques reduce data movement while preserving individual agents and behaviors.

Its static-region optimization omits mechanical-force calculations under model-specific conditions that guarantee no movement. Relevant changes invalidate that status. This is not permission to suspend every behavior of an unseen actor. The paper also identifies spatial-index rebuilding as a substantial cost in its workloads.

| Reported result                                   | Machine and workload qualification                                            | What the number establishes                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1.72 billion agents at 26.3 seconds per iteration | Cell-sorting model; four Xeon E7-8890 v3 CPUs, 72 physical cores, 1008 GB RAM | Large scientific simulation capacity, not real-time character cognition |

The authors provide a [reproduction artifact](https://doi.org/10.5281/zenodo.6463816). No reproduction or benchmark was performed for this panel.

### What transfers conceptually

The strongest transferable questions concern which data a calculation actually needs, which actors perform similar work, and which changes invalidate an existing result. These questions apply to CPU execution as well as GPUs. They do not select a memory layout, scheduler or simulation platform for Open Legend.

A reduced calculation can preserve individuality when it avoids redundant work while respecting the relevant dependencies. A reduced model can instead change outcomes by omitting interactions or information. Both can improve speed, but they make different promises. These scientific results help distinguish the two; they do not measure the cost of Open Legend's complete cognition, perception, persistence or presentation contracts.
