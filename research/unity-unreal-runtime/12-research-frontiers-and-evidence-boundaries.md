# Current research frontiers and evidence boundaries

Research snapshot: **23 October 2026**. This chapter complements the current Unreal/Unity mechanisms in chapters 02–11 with recent primary papers, technical reports, conference speaker notes, and an official video transcript. These sources were read for mechanisms, evaluation conditions, and limitations. Their experiments were not reproduced.

The distinction between a **shipping engine feature**, a **published research implementation**, and a **demonstration** remains explicit. No result here selects an OpenLegend design, model, library, or provider. A newer publication date also does not establish that a technique dominates every older or simpler alternative.

## 1. Currency and inspection record

Paper version histories were checked where accessible. In particular, this study uses the September revision of MemoryArena and the **16 October 2026 revision of AgentOdyssey**, rather than repeating their initial abstracts. Dates below are publication/revision dates, not search-engine crawl dates.

| Source | Version/date used | Evidence class and inspection |
| --- | --- | --- |
| Kimodo | arXiv v1, 16 March 2026 | NVIDIA technical report; representation, denoiser, evaluation, and future-challenge sections. [F01] |
| ARDY | arXiv v1, 9 July 2026; TOG/SIGGRAPH 2026 | Paper; method, runtime/replanning, hardware-specific latency, experiments, limitations. [F02] |
| SIMA 2 | arXiv v1, 4 December 2025 | Primary technical report; interface, data/training, evaluation, discussion. Latest report version verified in this named family, not a claim about the newest foundation model. [F03] |
| MemoryArena | arXiv v2, 17 September 2026; ICML 2026 | Paper; task construction, memory/action loop, results, latency and failure analysis. [F04] |
| AgentOdyssey | arXiv v2, 16 October 2026; record reports NeurIPS 2026 acceptance | Paper; world/rule generation, observations, diagnostics, results, limitations. [F05] |
| ERRAND | arXiv HTML v1 dated 2 September 2026 | Preprint; maintenance model, explicit assumptions, scheduler, experimental protocol and accounting. Abstract-page retrieval failed; HTML was readable. [F06] |
| Agent Island | arXiv v1, 5 May 2026 | Preprint; game structure, logs, scoring, results and limitations. [F07] |
| Upgrading PSSR on PlayStation 5 Pro | SIGGRAPH course, 21 July 2026; materials updated 13 August | Sony engineer's technical presentation; extracted speaker notes throughout the 84-page PDF, especially the architecture changes. Not a Unity/Unreal feature announcement. [F08, F09] |
| KITECH synthetic-data pipeline | Recorded at Unite Seoul, July 2026; official resource published 7 September | Unity-hosted, edited transcript of the 41-minute technical presentation; runtime/sensor synchronization and calibration sections inspected. [F10] |

SIMA 2 is retained because the current first-party research index still identifies that game-agent research family and no later version of its technical report was verified. Its 2025 date is visible wherever it is discussed. The older SIMA 1 report is not used as a current capability description. [F03, F11]

## 2. Motion generation: authoring, online response, and physical validity

### Kimodo: controllable offline motion

Kimodo generates kinematic motion from text and spatial constraints using a model trained on 700 hours of optical motion capture. Its two-stage denoiser predicts global root motion, converts that result into a local representation, and conditions body prediction on it. Constraints can overwrite selected pose features during denoising. This exposes a concrete interaction between representation and controllability: global constraints and local body regularity benefit from different coordinates. The report explicitly describes offline authoring that can take seconds and identifies reactive runtime control and scene/object interaction as further challenges. It is not evidence of a complete collision-aware character controller. [F01]

### ARDY: streaming motion and latency-aware replanning

ARDY combines explicit root features with a latent body representation and autoregressive diffusion. Its demo replans on changed input and can play already-generated buffer frames while a worker generates the next sequence. The reported averages are **33 ms for four diffusion steps and 63 ms for ten, on an RTX 4090**, with a 40-frame generation window at 20 fps. These are generation measurements, not browser frame-time or population-capacity claims. The deployed demo truncates context to a configurable maximum of eight seconds; distant constraints enter when they approach that window. The paper explicitly calls the model kinematic and reports remaining foot-skating/jitter and missing physical dynamics. [F02]

**Comparison with engine animation.** The [animation chapter](08-rendering-animation-and-audio.md) describes current authored/motion-matching execution and pose budgets. A generated pose sequence answers another question: what movement can be synthesized from controls and context? Neither kind of motion representation, alone, establishes support, collision clearance, resource use, interaction permission, or the authoritative result of touching another body. That distinction follows from the outputs being compared, rather than from a preference for one animation method.

There are also different meanings of “latency”:

| Quantity | Meaning in this comparison |
| --- | --- |
| Generation time | Time to produce a new sequence or window. |
| Visible continuity | Whether previously available motion can keep playing without a gap. |
| Control response | When new input first changes the motion that is displayed or executed. |
| Authoritative reaction | When a mechanically meaningful world consequence is admitted and becomes observable. |

Buffering can preserve continuity while delaying the first influence of a new control. That is an analytical timing distinction; it does not convert an offline throughput result into a real-time response guarantee.

## 3. Embodied agents: the observation/action interface is part of the result

SIMA 2 acts through rendered RGB frames and keyboard/mouse commands, without privileged access to underlying game state. Its Gemini-based model is trained with gameplay demonstrations, additional interaction data, and reinforcement learning. The report evaluates both familiar and held-out environments, including generated worlds. Its discussion still identifies short interaction memory, difficult very long tasks, precise low-level control, and complex visual understanding as limitations. This is research evidence for a generalist game-playing interface, not a drop-in implementation of an NPC's durable biography, private beliefs, or continuous authoritative simulation. [F03]

The interface difference is decisive when comparing results. An agent receiving pixels must infer geometry and affordances from images. An agent receiving a structured observation depends on how that observation was constructed, filtered, and timed. Neither interface grants a universal performance advantage independently of the task. OpenLegend's current observation/knowledge boundaries are grounded in [chapter 00](00-openlegend-context-and-coverage.md), while current engine inference runtimes are covered in [chapter 03](03-ai-navigation-and-crowds.md).

A model's ability to describe an intended action is also different from executing that action within a world's rules. The research examples make this separation observable: an action proposal, a controller command, an environment transition, and the subsequent observation are separate stages.

## 4. Memory, persistent consequences, and learning through action

### MemoryArena: remembering must affect later execution

MemoryArena separates related subtasks into sessions and carries information forward through explicit retrieval/update operations. Later actions depend on earlier choices or discoveries. Its tasks include shopping, planning, information seeking, and formal reasoning; these are not real-time NPC simulations. The current revision reports workload-dependent differences among long context, retrieval, and more elaborate memory systems, with declining success as dependencies deepen. It also measures **subtask completion latency**, which must not be confused with the latency of a single memory lookup. The useful result is a distinction between retrieving information and successfully using it over later actions, not a universal ranking of memory architectures. [F04]

### AgentOdyssey: generated worlds with executable rules

AgentOdyssey represents locations, objects, and NPCs in a world graph, with agent-visible observations restricted to relevant state. Action rules and environment step rules have preconditions and state transitions; separate generators extend entities, rules, and quests. The current paper combines game progress with diagnostics for world knowledge, episodic memory, exploration, actions, and cost. Its limitations are explicit: textual observations, a single agent, and turn-based fixed-duration actions. The October revision also qualifies continual learning, including catastrophic forgetting in its fine-tuning study. These results do not establish concurrent multiplayer causality, visual grounding, or production-safe admission of generated rules. [F05]

### ERRAND: stale knowledge competes for an action budget

ERRAND studies rechecking consolidated knowledge when the environment changes. It uses incoming task observations as evidence, budgets additional checks by their estimated decision value, and retains versioned/suspended knowledge rather than treating every change as deletion. Its closed-form scheduler is evaluated with frozen agents in scripted tool-use environments. The underlying model includes checkable facts, specified drift assumptions, and explicit check costs; these are substantial conditions. The paper illustrates how maintenance can displace useful action. It does not prove that a probabilistic belief-maintenance policy is a correct substitute for exact geometry/cache invalidation or an authoritative event history. [F06]

These three studies examine different objects often called “memory”:

| Object | What is evaluated or preserved |
| --- | --- |
| Information available to a later decision | Whether an agent can recover and use earlier experience. |
| A changing internal estimate | Whether an earlier assertion still describes the current environment. |
| An environment's own state | What objects, rules, consequences, and progress currently exist. |
| A durable history | What actually happened, including later changes and corrections. |

The last row is not guaranteed by success on the first three. An agent can forget a true event, retain a false belief, or correctly remember an event whose consequences later changed. The [perception](02-simulation-and-perception.md) and [persistence](07-networking-persistence-and-replay.md) chapters examine the corresponding engine/runtime boundaries without conflating them.

## 5. Multiagent interaction and social evidence

Agent Island uses seven anonymized agents, private conversations, public pitches, elimination votes, and memory consolidation. Its released completed-game logs support analysis of messages, decisions, and outcomes. Relative skill is estimated with a Bayesian ranking model, rather than treating eloquent dialogue as the success criterion. The paper also documents limitations: a low-stakes setting and a scoring model that does not represent matchup effects. This is evidence about a particular competitive interaction environment. It does not establish a general model of friendship, institutions, economic exchange, ecological behavior, or a persistent inhabited society. [F07]

For OpenLegend's broader intended scope, the substantive distinction is between **producing plausible social language** and **maintaining relationships between words, actions, shared resources, and later consequences**. A social benchmark can inspect part of that relationship. Its environment rules, participants, memory policy, observability, and scoring remain part of what was tested. A model ranking from the paper's specific run is therefore not presented as a current provider recommendation.

This also explains why a multiagent study cannot be substituted for the engine mechanisms in [chapters 02–07](02-simulation-and-perception.md): communication quality does not measure scheduling fairness, spatial query correctness, streaming continuity, or network recovery.

## 6. Technical talks: what was actually consumed

### SIGGRAPH 2026: Upgrading PSSR on PlayStation 5 Pro

Daniel Craig's speaker notes describe moving from a network that predicts color to one that predicts filtering/blending parameters, while explicit GPU operations perform more of the reconstruction. The architecture uses color differences and an anisotropic Gaussian representation, with filtering in input space. The notes explain how this changes HDR handling, gradient flow, parameter allocation, and high-upscale behavior. This is first-party evidence from the implementation's engineer about a specific hardware/software stack. It is not a Unity or Unreal integration guarantee, and the reported improvements are not an OpenLegend benchmark. [F08]

The extracted notes were read, including the architecture section around PDF pages 53–71 and the concluding results. The deck's embedded moving comparisons were **not watched**, so no independent perceptual judgment is claimed. The course index establishes the event and material-update dates. [F09]

### Unite Seoul 2026: KITECH synthetic-data pipeline

The Unity-hosted transcript describes integrating physics, rendering, multiple sensors, and labels on a shared simulation time axis. Its technical section uses measured geometry/sensor placement, recorded robot trajectories with Articulation Body, and labels derived from the same simulation state. It also describes residual camera mismatch and a calibration stage rather than assuming photorealistic appearance proves measurement accuracy. This is an application team's pipeline account, not a claim that stock Unity automatically supplies every component or that its validation transfers to arbitrary worlds. The substantive transcript passages are approximately **26:09–34:40**; the underlying video was not independently watched. [F10]

These talks add implementation reasoning that a feature list omits. Their evidentiary value comes from the described mechanisms and conditions. A video landing page, attractive demo, or publication date alone would not support the same analysis.

## 7. What these frontiers clarify across the engine study

The current evidence supports several comparisons without prescribing a build:

| Often combined in a headline | Distinction retained in this research |
| --- | --- |
| “Real-time generation” | Throughput, reaction latency, buffering, frame rate, and simultaneous population size. |
| “Intelligent characters” | Perception, observation construction, reasoning, action selection, execution, learning, and durable personal state. |
| “A world model” | A model producing observations versus an authoritative system preserving identities, rules, and consequences. |
| “Long-term memory” | Storage capacity, retrieval, belief freshness, correct use, historical provenance, and recoverability. |
| “Generated game” | Generating content/rules, validating them, admitting them, executing them, and maintaining save compatibility. |
| “Physical realism” | Plausible appearance, kinematic constraint satisfaction, collision handling, dynamics, and application-specific validation. |
| “Many agents” | Number represented, number actively simulated, number making expensive decisions, and number evaluated concurrently. |
| “Better performance” | The actual hardware, inputs, population, timing metric, quality criterion, and comparison implementation. |

The table is an analytical synthesis across the collection. It does not rank these research systems against Unreal, Unity, or OpenLegend as whole products. Their outputs and evaluation conditions are too different for such a ranking to be justified.

Two particularly important consequences follow. First, sophisticated approximate systems can be highly useful within a well-defined consumer boundary while remaining unsuitable evidence for an exact guarantee elsewhere. Second, explicitly preserving some operations outside a learned model is compatible with modern research; “state of the art” does not mean that every stage has become generative or probabilistic. The engine chapters show the same coexistence of data structures, exact checks, asynchronous work, authored rules, and selective approximation.

## 8. Limits and provenance discipline

This chapter uses current named report versions and recent technical presentations. It does not revive older crowd, generative-agent, or rendering papers as if they described the current shipping engines. Established algorithms are explained in the engine chapters using current documentation and APIs.

The reading included methods and explicit limitations, not only abstracts. It did not execute released code, train models, run demonstrations, validate licensing for a proposed deployment, or benchmark a candidate integration. A paper's code/model link is not proof that it fits a particular browser, inference runtime, content pipeline, or world-authority contract.

Some sources remain inaccessible at full depth, including the oversized Epic release-notes response and the MegaLights 2025 presentation noted in [chapters 01](01-evidence-and-version-baseline.md) and [08](08-rendering-animation-and-audio.md). Those access gaps are not filled with invented implementation details. The accessible current manuals/APIs, papers, speaker notes, and transcript support the claims actually made here.

## Primary sources

- **F01:** [Kimodo technical report, arXiv 2603.15546v1][F01]. [Version history](https://arxiv.org/abs/2603.15546).
- **F02:** [ARDY, arXiv 2607.08741v1][F02]. [Version/venue record](https://arxiv.org/abs/2607.08741).
- **F03:** [SIMA 2, arXiv 2512.04797v1][F03]. [Version history](https://arxiv.org/abs/2512.04797).
- **F04:** [MemoryArena, arXiv 2602.16313v2][F04]. [Revision/venue record](https://arxiv.org/abs/2602.16313).
- **F05:** [AgentOdyssey, arXiv 2606.24893v2][F05]. [Revision/venue record](https://arxiv.org/abs/2606.24893).
- **F06:** [ERRAND, arXiv HTML 2609.29545v1][F06]. Peer-review status was not verified.
- **F07:** [Agent Island, arXiv 2605.04312v1][F07]. [Version history](https://arxiv.org/abs/2605.04312).
- **F08:** [Daniel Craig, Upgrading PSSR on PlayStation 5 Pro — PDF with speaker notes][F08].
- **F09:** [SIGGRAPH 2026 Advances in Real-Time Rendering course and material dates][F09]. Course abstracts are not substituted for uninspected slide content.
- **F10:** [Unity: KITECH synthetic-data pipeline for manufacturing AI — official transcript][F10]. Application report, recorded July 2026 and published September 2026.
- **F11:** [Google DeepMind research index][F11]. Used only to corroborate current identification of the SIMA 2 research family.

[F01]: https://arxiv.org/html/2603.15546v1
[F02]: https://arxiv.org/html/2607.08741v1
[F03]: https://arxiv.org/html/2512.04797v1
[F04]: https://arxiv.org/html/2602.16313v2
[F05]: https://arxiv.org/html/2606.24893v2
[F06]: https://arxiv.org/html/2609.29545v1
[F07]: https://arxiv.org/html/2605.04312v1
[F08]: https://advances.realtimerendering.com/s2026/content/siggraph2026_advances_dcraig_v1_0_publish.pdf
[F09]: https://advances.realtimerendering.com/s2026/index.html
[F10]: https://unity.com/resources/kitech-synthetic-data-pipeline-manufacturing-ai
[F11]: https://deepmind.google/research/
