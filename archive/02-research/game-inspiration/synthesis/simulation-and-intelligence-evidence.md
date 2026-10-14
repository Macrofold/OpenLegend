# Efficient intelligent simulation — academic and industrial evidence

| Field | State |
| --- | --- |
| Status | Completed scoped literature and primary-source pass; evidence review, not experimental replication. |
| Last reviewed | 2026-10-14 |
| Owner | Supporting evidence for **NPC**, not a new top-level topic. |
| Scope | Agent cognition, memory, calibration, individual/population fidelity, simulation scheduling and inference efficiency. |
| Evidence discipline | Each record names the inspected source, access depth, supported finding, transfer hypothesis and important limit. |

[NPC guide](characters-companions-and-relationships.md) · [Technical synthesis](simulation-and-intelligence.md) · [Game inventory](../research-progress-intelligent-simulation-2026-10-14.md) · [Assessment records](assessment-records.md)

## Reading the evidence correctly

A system can predict a population distribution without reproducing any particular person. A simulated person can answer survey questions consistently without sustaining a coherent embodied life. A GPU can update millions of simple agents without generating millions of open-ended decisions. A message broker's throughput is not a cognition benchmark. These are methodological distinctions used throughout this review, not accusations that the cited authors claimed otherwise.

The primary technical findings below are deliberately compact; the companion guide develops our own implications. Sources available only as abstracts or indexed primary text are labeled. No paper, game or corporate system was executed in this pass. No private customer data, paid provider experiment or newly measured OpenLegend result is included.

## E01 — Generative Agents: memory, reflection and planning

**Primary source:** Park et al., [*Generative Agents: Interactive Simulacra of Human Behavior*, 2023, v2](https://arxiv.org/html/2304.03442v2). Architecture, evaluation and limitations sections inspected as text.

**Supported finding:** the small-town experiment connects stored observations, retrieval, reflection and planning. The paper also reports costly, slow execution and failures involving retrieval, inappropriate behavior and agent style. Its historical multi-day runtime and thousands-of-dollars cost for a short simulated period are not contemporary provider prices or an OpenLegend estimate.

**Transfer hypothesis:** separate recording an experience from interpreting it; use retrieved evidence to support revisable pursuit rather than regenerate a person from a short persona each turn. Reflection may be useful at selected moments, but need not be an unconditional per-event expense.

**Limit:** a small, short-lived demonstration and its believability measures do not establish real-time large-population economics, long-term identity stability or human behavioral prediction. Fluent dialogue and successful event propagation are narrower outcomes than a complete autonomous life.

## E02 — Simulating 1,052 particular people: use the revised paper, not a cached headline

**Primary source:** Park et al., [arXiv 2411.10109, current PDF retrieved October 14](https://arxiv.org/pdf/2411.10109), titled *LLM Agents Grounded in Self-Reports Enable General-Purpose Simulation of Individuals*. Abstract, methods, results and discussion inspected; relevant PDF pages viewed. The earlier 2024 title and cached 85% headline are not treated as identical to this revision.

**Supported finding:** on held-out GSS questions, the revised abstract reports interview, survey and combined agents at 83%, 82% and 86% of participants' own two-week consistency, versus 74% for demographic-only agents. These are normalized comparisons, not the percentage of all human behavior reproduced. Richer grounding did not significantly beat demographic baselines on the economic games, and combining information had diminishing returns. The study concerns English-language self-reports from a US sample and specific tests, not continuous social life.

**Transfer hypothesis:** specific experiences and constraints can matter more than a generic demographic persona. Preserve meaningful individual evidence, but test whether extra context actually changes relevant choices before paying to include everything.

**Limit:** fictional-character coherence and predictive accuracy for real people are different objectives. Interview-derived reflections are interpretations, not authoritative facts about a person.

## E03 — Simile's newer confidence work: prediction and knowing when to trust it

**Primary source:** Simile, [*Building confidence in Simile*, August 25, 2026](https://www.simile.com/blog/confidence). Full substantive technical article inspected. Vendor-authored validation, not independent replication.

**Supported finding:** the article evaluates predicting simulation error on held-out survey experiments, separately from predicting answers. Probability-based features such as entropy and score gaps were weak error predictors, with reported AUROC no better than roughly 0.57; text embeddings reached roughly 0.69 and model activations roughly 0.73 in the described setup. Its fine-tuned confidence work and total-variation-distance thresholds belong to a particular experimental distribution. Access to useful internal activations is not guaranteed through a generic hosted decision API.

**Transfer hypothesis:** OpenLegend should not interpret a high winning action score as calibrated confidence that a cheap decision is adequate. A future escalation policy needs separate evidence about consequential errors, unfamiliar contexts and missed alternatives. Features might include changed assumptions, recent failure, novel information and disagreement, but their predictive value must be tested.

**Limit:** the vendor's high-confidence subset is not proof of comparable NPC quality, universal 95% correctness or a free confidence service. Classification can itself consume enough preparation and inference to erase savings.

## E04 — Simile's applied workflow and counterfactual positioning

**Primary sources:** [*The What-If Machine*, September 2, 2026](https://www.simile.com/blog/what-if-machine), and [Itaú at ESOMAR, September 11, 2026](https://www.simile.com/blog/itau-at-esomar). Substantive vendor articles inspected.

**Supported finding:** Simile positions simulation as an aid to exploring decisions and testing hypotheses. Its Itaú account describes a workshop considering seven hypotheses and a reported research-cycle reduction from weeks to days. This is a customer-workflow account, not per-agent decision latency, autonomous-world throughput or an independently controlled causal evaluation.

**Transfer hypothesis:** use inexpensive simulation to find cases worth closer scrutiny and compare alternatives, rather than treating every generated outcome as established truth. A small set of discriminating episodes can be more valuable than a huge undirected run.

**Limit:** this pass found no public benchmark sufficient to price or certify Simile as a real-time OpenLegend NPC backend. Public corporate material supplies ideas and evaluation discipline, not a verified plug-in architecture for our engine.

## E05 — Socrates / SocSci210: narrow specialization can beat a larger general model

**Primary sources:** [EMNLP 2025 paper PDF](https://aclanthology.org/2025.emnlp-main.1530.pdf), [author project page](https://stanfordhci.github.io/socrates/), and [arXiv v2](https://arxiv.org/html/2509.05830v2). Method and evaluation text inspected; PDF first page viewed.

**Supported finding:** the work trains a specialized survey-simulation model using SocSci210, drawing on millions of responses across hundreds of experiments. The inspected PDF/project reports improved distributional alignment for its Qwen-based 14B model relative to its base and GPT-4o comparisons. Some landing-page summary numbers differ from the inspected paper, so no universal numerical uplift is adopted here. This is a structured-response task with curated data, not a demonstration of general autonomous characters.

**Transfer hypothesis:** after collecting suitable evidence, a smaller model may handle a well-defined recurring decision better and more cheaply than a general model. The training target must preserve individuality and important exceptions, not merely imitate the majority action.

**Limit:** fine-tuning cost, maintenance, model drift and out-of-domain performance belong in the comparison. A better survey distribution cannot certify memory, physical grounding or moral choice in a changing game.

## E06 — AgentSociety: whole-system throughput and individual latency differ

**Primary source:** [*AgentSociety*, arXiv 2502.08691v1](https://arxiv.org/html/2502.08691v1), architecture and performance sections 5–6 inspected, including table context.

**Supported finding:** the system groups agents, overlaps asynchronous work and reuses connections; it separately benchmarks simulation, messaging, storage and model-backed agents. One reported 10,000-agent configuration with 32 groups takes about 459 seconds per round and about 8.05 seconds per LLM call. That experiment uses specified cloud hardware and an external DeepSeek-V3 service. A large messaging rate or a fast native environment step is not that same workload. More groups improve round throughput without necessarily reducing individual call latency.

**Transfer hypothesis:** overlap independent preparation and inference, but measure end-to-end character response and queueing separately. A city-wide throughput gain can coexist with an unacceptably slow conversation.

**Limit:** different hardware, provider load, prompt sizes, interactions and time semantics prevent direct transfer of a maximum population. Asynchronous computation does not remove the need to serialize conflicting world consequences.

## E07 — Light Society: very large populations through approximation

**Primary source:** [*Light Society*, arXiv 2506.12078v1](https://arxiv.org/html/2506.12078v1), architecture and opinion/trust experiment sections inspected.

**Supported finding:** the system combines semantic reuse, task-specific surrogate models, different execution backends and compact population/network handling. Its billion-agent opinion experiment uses a structured interaction and response setting, not a billion independent long-context minds. A surrogate is trained and validated against its designated task; similarity-based reuse substitutes one computation for another rather than merely accelerating an identical calculation.

**Transfer hypothesis:** identify narrow repeatable subproblems that can tolerate approximation and expose a fallback for unfamiliar cases. Reusing an already-authorized method is a safer first step than reusing someone else's personal decision because their embeddings look similar.

**Limit:** a large synthetic sample can reduce sampling noise while retaining the same systematic model error. Smaller error bars inside the simulation do not establish accuracy about the real world. No quoted population headline here is an OpenLegend capacity prediction.

## E08 — Concordia: modular cognition, different world authority

**Primary sources:** [Google DeepMind publication overview](https://deepmind.google/research/publications/64717/) and [official Concordia repository overview](https://github.com/google-deepmind/concordia). Primary overview/abstract material inspected; not a complete code audit.

**Supported finding:** Concordia composes agent behavior from components and uses a game-master role to interpret proposed actions and progress an environment. Its interfaces support different execution arrangements. That flexibility does not imply a deterministic physical simulation or identical semantics across every example.

**Transfer hypothesis:** components can separate remembered facts, current commitments and decision preparation without requiring a monolithic prompt. But OpenLegend should retain trusted world admission and factual outcomes: an LLM's plausible adjudication is not automatically an authoritative transfer, injury or completed invention.

**Limit:** a natural-language experimental environment can deliberately have looser world rules than a persistent multiplayer game. Adopt the useful separation of responsibilities, not an incompatible authority model.

## E09 — Voyager: reuse executable skill, not a whole life policy

**Primary source:** [MineDojo/Voyager author repository](https://github.com/MineDojo/Voyager), architecture and skill-library overview inspected. This is a research agent operating in Minecraft, not Mojang's shipped NPC implementation.

**Supported finding:** Voyager combines an automatic curriculum, an accumulating executable skill library, and iterative feedback from execution and errors. It demonstrates a different way to amortize expensive generation: retain useful procedures rather than repeatedly produce every low-level action.

**Transfer hypothesis:** a character can learn or select a reusable method while still deciding whether it suits the present situation. A successful method should retain prerequisites, relevant limits and failure evidence.

**Limit:** OpenLegend does not authorize model-generated JavaScript or arbitrary execution. A transferable version would stay within supported trusted action families. A research curriculum that maximizes exploration is not a substitute for a character's chosen purposes, and a passed skill test does not prove future social appropriateness.

## E10 — LongMemEval: retrieval and reading are separate failure points

**Primary source:** [LongMemEval, arXiv 2410.10813v2](https://arxiv.org/html/2410.10813v2), March 2025 revision, benchmark construction and memory-system sections inspected.

**Supported finding:** the benchmark covers extracting information, combining sessions, temporal reasoning, updates and abstaining when evidence is absent. It separates indexing, retrieval and reading. Relevant information reaching the reader does not guarantee a correct answer; compression and retrieval design can lose useful details. The reported model results belong to the evaluated versions and constructed conversational histories.

**Transfer hypothesis:** diagnose whether an NPC forgot because evidence was never recorded, was inaccessible, was not retrieved, was truncated, or was misinterpreted. These require different fixes. More reflection or a larger model is not automatically the right remedy.

**Limit:** question answering over histories does not establish that a character will act consistently, stop after success or maintain a believable relationship. Evaluation should include actual later choices, not only recall quizzes.

## E11 — LongMemEval-V2: remember failure and conditions, not only success

**Primary source:** [LongMemEval-V2, arXiv 2605.12493v1](https://arxiv.org/html/2605.12493v1), May 2026, task construction and evaluation sections inspected.

**Supported finding:** this distinct newer benchmark studies memory over web-agent experience, including successful and failed trajectories, changing information, workflows, pitfalls and premise-aware questions. Its evaluation distinguishes memory ingestion from query-time work. Useful evidence can reside in failed attempts rather than a polished successful procedure.

**Transfer hypothesis:** retain why a method failed and the circumstances in which it worked. A character should not retry the same blocked approach because a summary preserved only the original intention. Separate inexpensive factual recording from optional interpretation and account for both ingestion and recall cost.

**Limit:** web-agent trajectories and bounded question answering differ from embodied life. The benchmark's large history sizes are not context windows that every evaluated model reads in full, nor proof that arbitrary game memories remain cheap.

## E12 — Negative evidence: synthetic respondents can match means and miss relationships

**Primary source:** Bisbee et al., [*Synthetic Replacements for Human Survey Data: The Perils of Large Language Models*, Political Analysis, 2024](https://www.cambridge.org/core/journals/political-analysis/article/synthetic-replacements-for-human-survey-data-the-perils-of-large-language-models/B92267DC26195C7F36E63EA04A47D2FE), abstract, experiment design and findings inspected.

**Supported finding:** in the studied survey settings, plausible aggregate responses coexisted with reduced variation, distorted relationships among variables, sensitivity to prompt changes and changes across model versions. These are findings about the tested systems, not a proof that no newer specialized simulation can improve.

**Transfer hypothesis:** evaluate differences among characters and sensitivity to their actual histories. A town in which everyone politely agrees may produce plausible prose while failing to represent conflicting values. Pin evaluation conditions and recheck consequential behavior when a model changes.

**Limit:** the opposing positive results in E02/E05 use different grounding and tasks. They should be compared as different conditions, not averaged into a universal verdict about LLM agents.

## E13 — Discrete-event scheduling: skip empty time, preserve order

**Primary source:** [SimPy, *Time and Scheduling*](https://simpy.readthedocs.io/en/latest/topical_guides/time_and_scheduling.html), official documentation inspected.

**Supported finding:** the documented scheduler uses a time-ordered event queue with deterministic tie handling. Modeled processes can occur at the same simulation time while execution still processes events in an order. Simulated concurrency is not automatically CPU parallelism.

**Transfer hypothesis:** schedule the next relevant change rather than poll every dormant activity. Define simultaneous-event semantics and causal invalidation explicitly; otherwise a faster queue can change who obtains a scarce item or who observes a departure.

**Limit:** a discrete-event framework does not supply correct NPC policy, continuous collision or fair arbitration by itself. Events also have storage, invalidation and dispatch cost. A dense continuously changing subsystem may be simpler as a bounded fixed-step loop.

## E14 — Traffic simulation: movement frequency and decision frequency need not match

**Primary sources:** SUMO official [basic simulation definitions](https://sumo.dlr.de/daily/userdoc/Simulation/Basic_Definition.html) and [safety documentation](https://sumo.dlr.de/daily/userdoc/Simulation/Safety.html), relevant action-step and update-order material inspected.

**Supported finding:** SUMO distinguishes simulation time steps from intervals at which vehicles make selected driving decisions. Reaction assumptions, headway and update ordering matter; changing a step size can change insertion opportunities and safety behavior rather than only runtime.

**Transfer hypothesis:** an NPC can continue moving between decisions, but the permitted delay depends on how quickly relevant circumstances change. A crowded confrontation and an unobstructed journey need not share a deliberation frequency.

**Limit:** traffic models solve a constrained domain. A longer decision interval is not free if it removes a meaningful response opportunity, and a vehicle-following rule is not a human social policy.

## E15 — Reciprocal collision avoidance: a narrow controller can be useful below cognition

**Primary source:** [RVO2 official repository README](https://github.com/snape/RVO2/blob/main/README.md), algorithm and API overview inspected.

**Supported finding:** the library implements reciprocal collision avoidance for agents with local motion constraints, using a small optimization problem and assumptions about shared avoidance responsibility. This is local motion selection, not long-horizon goal selection or social reasoning.

**Transfer hypothesis:** ordinary navigation can remain native while a character decides whom to approach and whether a route's risk is acceptable. A motor controller should respect the chosen destination and body limits without acquiring authority over personal goals.

**Limit:** stated guarantees depend on the model assumptions. Other bodies, noncooperating movers, acceleration limits or unusual authored physics may require different treatment. No library adoption or pathfinding rewrite is recommended without an actual integration need.

## E16 — FLAME GPU 2: large numbers of simple local interactions

**Primary sources:** [official project](https://flamegpu.com/), [documentation](https://docs.flamegpu.com/api/page_md_README.html), and [NVIDIA developer account](https://developer.nvidia.com/blog/fast-large-scale-agent-based-simulations-on-nvidia-gpus-with-flame-gpu/). Official documentation/overview and indexed developer text inspected; article direct access was intermittent, and benchmarks were not reproduced.

**Supported finding:** typed agent data, spatial messaging and GPU-oriented execution support very large agent-based models with suitable local work. Published population and speed examples concern particular simple models and hardware, with setup costs and extrapolations requiring care.

**Transfer hypothesis:** data locality and batching can improve large repeated native calculations. A regular numeric body/environment calculation is a more plausible GPU workload than heterogeneous private histories and external LLM requests.

**Limit:** an agent in an agent-based modeling benchmark is not necessarily an intelligent individual. GPU execution introduces transfer, synchronization, branching and tooling costs. This is evidence for matching representation to workload, not for moving OpenLegend wholesale to a GPU simulator.

## E17 — BioDynaMo: memory locality is part of simulation architecture

**Primary source:** [BioDynaMo's PPoPP 2023 artifact account](https://blog.biodynamo.org/2023/04/PPoPP23-best-artifact-biodynamo.html), indexed primary technical text inspected; direct article retrieval failed during this pass.

**Supported finding:** the account emphasizes locality, allocation, spatial organization and conditional work in large biological agent-based simulations. Its very large cell-population examples are numerical biological models on specified compute, not large language-model populations.

**Transfer hypothesis:** before adding threads or machines, inspect repeated allocation, copying, scattered memory access and unnecessary queries. Separate shared immutable descriptions from frequently changing individual fields where that matches actual access patterns.

**Limit:** the full paper and artifact were not executed or independently audited here. Biological cells are useful architectural contrasts, not evidence for psychological fidelity or a ready-made game engine.

## E18 — AgentTorch / FLAME: learning a simulator's parameters

**Primary source:** MIT Media Lab, [*FLAME: A Framework for Learning in Agent-Based Models*, AAMAS 2024](https://www.media.mit.edu/publications/flame-a-framework-for-learning-in-agent-based-models-1/), primary abstract inspected.

**Supported finding:** the work concerns differentiable agent-based modeling and learning from data in example domains. This FLAME framework is not FLAME GPU 2 merely because the names overlap.

**Transfer hypothesis:** parameters of a narrow approximate simulator might be calibrated rather than hand-tuned. But an optimization objective must be explicit: matching an observed population distribution, reducing prediction error and making a fictional character enjoyable are different goals.

**Limit:** parameter learning does not establish that individual agents have learned personal values or that a fitted model generalizes to interventions. No code adoption or new training project is proposed by this abstract-level comparison.

## E19 — Exact prefix caching is not semantic decision reuse

**Primary source:** [vLLM automatic prefix caching documentation](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/), official feature explanation inspected.

**Supported finding:** matching prompt prefixes can reuse existing attention-cache computation. This saves repeated input processing; it does not eliminate generating new output, and offers less benefit when output generation dominates or prefixes do not match.

**Transfer hypothesis:** stable world instructions and trusted method descriptions may be arranged for reuse while private current evidence remains separate. This can improve inference efficiency without substituting another person's answer.

**Limit:** privacy, tenancy, invalidation and the chosen provider's actual support must be checked at implementation time. Prefix caching, semantic answer caching, reusable plans and shared model weights are different mechanisms with different correctness risks.

## Synthesis: what these sources jointly support

The defensible direction is to use expensive cognition where interpretation or consequential choice is needed, then preserve the usefulness of that choice through reliable execution. The strongest general optimization candidate is avoiding unchanged work; the strongest warning is that an approximation can remove precisely the rare exception that makes an individual distinct.

There are several legitimate alternatives. A finite authored controller can be the entire mind of a deliberately simple creature. A survey surrogate can be a useful research instrument. A coarse population model can support a background economy. An LLM game master can support an improvisational text experiment. None is a universal replacement for the others, and none alone proves OpenLegend's intended combination of agency, embodiment, privacy and persistent consequences.

For our evaluation, separate five questions: does the engine execute correctly; does the character use permitted evidence; does its choice express a coherent individual; does the overall world remain causally consistent; and what does the complete episode cost? A favorable answer to one cannot stand in for the rest.

## Evidence not established by this pass

No source here establishes the optimal population, cognition interval, model mix, hardware, dollar budget or acceptable approximation for OpenLegend. No inspected corporate article supplies an independently verified turnkey real-time individual-simulation backend. No abstract-only game case has been promoted into a detailed source-code audit. Those are limits of the available evidence, not reasons to invent implementation facts or defer the requested synthesis.
