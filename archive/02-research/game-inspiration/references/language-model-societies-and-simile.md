# Language-model societies, individual evidence and Simile

**Research pass: October 14, 2026.** Supporting evidence for [NPC: characters, companions and relationships](../synthesis/characters-companions-and-relationships.md), not an accepted implementation design. This study distinguishes believable fictional people, prediction of real human responses, physical task competence and simulation throughput. Success at one does not establish the others.

[Game evidence](game-ai-implementation-and-scale.md) · [Efficient simulation architecture](efficient-individual-simulation.md) · [Pass inventory](../research-progress-intelligent-simulation-2026-10-14.md)

## 1. What the research actually measures

A useful comparison asks four independent questions: what information each agent receives; what decisions it makes; what the environment actually executes; and how those results were evaluated. A million generated profiles, a million environment reads and a million consequential choices are different workloads. Likewise, a plausible explanation is not an observed reason in a real person or proof that a simulated action happened.

### Smallville: memory helps, but a remembered sentence is not authoritative history

Park and colleagues' **Generative Agents** combines observation storage, relevance/recency/importance retrieval, reflection and planning. Its town demonstration involved 25 agents. Reflections derive higher-level interpretations from retrieved experiences; the paper's ablations and examples also identify missed retrieval, embellished accounts and inappropriate external-world knowledge. This supports studying memory selection and continuity, not treating fluent social behavior as proof of consciousness or unlimited practical autonomy. [A1]

**Our transfer:** retain different representations for an observed event, a person's interpretation, a current intention and a reusable method. A memory that someone appeared angry should not become an objective update to that person's private feelings. A summary can help a character choose, but cannot authorize a transfer, manufacture an object or repair a failed action. Store enough provenance to distinguish repeated retellings from independent evidence. Reflecting on ten retellings of one rumor should not create ten witnesses.

### The 1,052-person study: the June 2026 revision changes the headline

The original 2024 abstract reported 85% of participants' own retest accuracy. **Version 3, June 28, 2026, has a revised title and comparisons**: interview-only, survey-only and combined agents achieved normalized GSS accuracy of 0.83, 0.82 and 0.86; interview-only raw accuracy was 65.67%, versus human retest consistency of 79.53%. The economic-game comparison did not find significant differences across the five agent types. We inspected the revised results and Figure 2, rather than treating the older marketing headline as the latest finding. [A2]

**Our transfer:** rich individual evidence can matter more than demographic labels, but more biography is not guaranteed to help every kind of decision. Evaluate whether adding a particular remembered experience changes the relevant choice, not whether an expanded prompt sounds more personal. These experiments predict responses to questions and scenarios; they do not demonstrate years of autonomous life, physical execution or a validated causal model of every participant.

Do not turn real people's sensitive interviews into game characters without appropriate consent and access boundaries. Fictional authorship can use the methodological lesson without acquiring personal data.

### Socrates: specialized training can beat a larger general model on the actual target

The final EMNLP 2025 paper describes SocSci210: 2.9 million responses from 400,491 participants across 210 experiments. Its strongest Qwen-14B model reports 36% better alignment than its base model on unseen studies and 15% better than GPT-4o under that evaluation. Simile's homepage still gives a different, 26% summary; this study uses the final paper's stated result, without combining versions. The inspected evidence is the final proceedings abstract, not a reproduced training run. [A3]

**Our transfer:** model selection should test the actual job. Predicting a character's next choice among grounded options, recognizing a missing prerequisite and writing conversation may deserve different models. A small model trained for population response distributions is not automatically suitable for an unusual fictional individual's agency. Distilling a larger model's behavior can reduce cost while preserving its mistakes; stronger agreement with the teacher is not sufficient validation.

## 2. What Simile added in 2026

### Confidence in a prediction is different from concentration of the predicted choices

Simile's August 2026 technical post trains a separate estimate of distribution error. On roughly 8,600 held-out questions, simple output features such as entropy and the top-option gap performed weakly; a hidden-activation probe reached AUROC 0.730 versus 0.566 for the basic features. The probe uses the prediction's existing forward pass. A further trained error head was not significantly better than the probe on the reported classification comparison. Question text and its experimental sample were kept together in cross-validation folds. These are company-reported results on its task, not an OpenLegend routing benchmark. [A4]

**Our transfer:** two attractive choices can both be well understood. Conversely, a strongly preferred option can rest on a false assumption. Do not equate a small action-score margin with uncertainty, or a large margin with permission to skip reconsideration.

A cheap decision service could eventually return both a choice and a calibrated warning about error. But the hidden-activation approach requires access to model internals; it is not a feature that can be assumed available through an opaque API. Calibration would need OpenLegend-specific labels, including personally consequential mistakes. Asking another large model whether the first model is uncertain may cost more than the decision being avoided.

The source measures error against real distributions. OpenLegend additionally needs to assess whether an action violates a character's accepted boundaries, ignores a relevant experience or closes an important option. Those are not interchangeable labels. A calibrated population average can still be wrong for a particular character.

### Counterfactual explanation is a research objective, not proof of causal identification

Michael Bernstein's September 2026 *What-If Machine* essay argues that the mechanism behind behavior matters when evaluating interventions, rather than merely predicting an association. It is a useful statement of Simile's ambition, not by itself a causal-identification experiment. [A5]

For OpenLegend, the practical question is whether changing an experience, relationship or available means leads to a coherent change in later behavior. A generated rationale can be persuasive even when the model would have selected the same action without the supposed reason. Test controlled contrasts: the same hunger with and without a promise; the same request from a trusted friend and a stranger; the same object after learning it belongs to someone else. Preserve other evidence where possible, and account for stochastic variation rather than interpreting one dramatic run as a general law.

### Corporate use: faster hypothesis screening, followed by human research

Simile's September 11 Itaú case reports shortening a research workflow from five weeks to four days and shifting subsequent human research toward uncertain or high-risk questions. This is a vendor/customer account of organizational workflow, not a GPU benchmark or independent proof of predictive accuracy. [A6]

The useful analogy is **selective expensive verification**. OpenLegend could spend more evaluation effort on consequential failures and less on redundant confirmations that a valid activity should continue. However, an in-game character does not have a real human counterpart available to answer every difficult question. Creator judgment, blinded player studies and evidence-consistent alternative trajectories serve different purposes and should be reported separately.

## 3. Large societies: inspect the denominator before copying the architecture

| System and inspected scope | Concrete evidence | What cannot be inferred |
| --- | --- | --- |
| **AgentSociety**, February 2025 v1; architecture, infrastructure and efficiency sections read | Ray-based groups, asynchronous messaging and environment services; Table 4 labels 458.82 seconds per round for 10,000 agents/32 groups in its setup. Its headline interaction count includes very numerous environment reads/writes. The surrounding five-round prose and table unit are not silently reconciled here. [A7] | Millions of conversations, real-time game responsiveness, or the same cost on different models. |
| **LMAgent**, December 2024 v1; fast-memory and ablation sections read | A shopping/social simulation caches low-importance routine memory processing. A 100-agent ablation reports about 40% fewer tokens with purchase accuracy 71.99 versus 72.27. This is a token result on that workload, not a measured 40% latency improvement or a cache for every decision. [A8] | That meaningful routine exceptions can safely be ignored, or that purchase prediction evaluates friendship and obligation. |
| **OASIS**, v4; method and efficiency sections read | Hourly activity probabilities activate subsets of users; asynchronous inference and a separate environment/recommender support social-media interactions. Table 2 reports **18 hours per time step with 27 A100 GPUs at one million users**. It also reports human/agent differences in herd behavior. [A9] | A million simultaneously deliberating game characters, human equivalence, or interactive latency from the title alone. |
| **Project Sid**, 2024; primary abstract reviewed | PIANO separates concurrent agent processes; reported Minecraft demonstrations range from 10 to 1,000-plus agents and investigate roles, rules and cultural transmission. The authors label the civilizational results preliminary. [A10] | Reproduced cost, exact persistence guarantees, an independently validated civilization, or implementation detail not inspected in this pass. |
| **Concordia**, original DeepMind publication and project description | Associative memory and component-based agents interact through a Game Master that interprets intentions and can connect to external applications. [A11] | That an LLM should own OpenLegend's physics, authorization or factual history. |
| **Voyager**, original paper abstract and authors' project page | An automatic curriculum, executable skill library and feedback-driven improvement support extended Minecraft tasks without model-weight updates. [A12] | A general social mind, safe arbitrary generated code in our engine, or a universal need to maximize exploration. |

The proposed applications below are ours, not findings claimed by these systems.

### Concurrent cognition needs an authority boundary

Parallel speech, planning and reflection may reduce apparent waiting but can produce incompatible decisions. One process may negotiate a transfer while another consumes the same resource. Reading a shared snapshot is not permission for every returned proposal to commit.

A practical comparison should preserve one owner of effects, check the relevant facts when a proposal arrives, and distinguish a stale answer from a valid choice not yet executed. Avoid invalidating useful work because an unrelated event changed the world. Conversely, avoid continuing merely because the target still exists when consent or the actor's current intention changed.

### Information delivery is part of behavior, not neutral plumbing

A social-media recommendation system controls which information people encounter. The analogy to a game's perception and recall is direct: changing the filter can change the society even with identical decision models. Optimizing the candidate set therefore needs quality evidence, not only faster queries.

Measure which relevant facts were excluded. A memory system that returns useful facts quickly may still consistently omit apologies, minority viewpoints or quiet acts of care. Relevance should not be defined solely by how often a fact was repeated or how dramatic its wording sounds.

### Reuse skills without importing generated-code authority

Voyager is a strong motivation for remembering successful means. OpenLegend's boundary is different: a generated procedure should be supported data interpreted through trusted actions, not unreviewed JavaScript installed into the world. Learning a method, being physically capable of it, having permission to use it and deciding to use it now are separate conditions.

An exploration-maximizing curriculum would also be a poor universal personality. A satisfied character may repeat a familiar pleasure, care for someone or choose quiet. Novel action count is one possible experiment, not the definition of aliveness.

## 4. Evaluation design for an efficient individual mind

These are proposed study designs, not checks performed in this research pass.

**Use three comparisons, not just one expensive oracle.** Compare the existing controller, a simpler native/structured baseline and the proposed hybrid. Where useful, include more frequent high-capability cognition, but do not assume its choices are correct. More frequent generation can produce indecision, overwritten intentions or persuasive false memories.

**Evaluate an episode and a later return.** Record the initial purpose, permitted observations, selected means, actual effects, relevant recollection and subsequent choice. Check stopping as well as starting: a satisfied purpose should not regenerate because it remains in old prompt text. A refusal should survive a later unrelated movement. A completed exchange should not be offered repeatedly as though it never happened.

**Test asymmetric errors.** Missing a cheap path update is unlike consuming a sentimental item, disclosing a secret or abandoning an ally. Average action agreement can hide the rare mistakes that define the experience. Maintain ordinary cases and deliberately constructed exception cases; report them separately rather than inflating the exception rate in a claimed natural workload.

**Separate four kinds of fidelity.** Mechanical fidelity concerns actual resource/time/permission effects. Personal fidelity concerns continuity of the authored individual. Social fidelity concerns plausible interaction and consequences. Perceptual legibility concerns whether an observer understands the activity. A line of dialogue can improve legibility without improving the other three.

**Measure all work.** Count prompts for shortlisting, attention, memory selection, embeddings, generation, reflection, validation and retries; also count local scans, serialization, storage and queue wait. Report cost per useful completed episode alongside cost per call. Include model/version, concurrency, hardware, real elapsed time, simulated elapsed time, input/output volumes and active versus retained population.

**Protect experimental independence.** Split evaluation by scenario family or episode, not adjacent paraphrases from the same situation. Retain private information boundaries in the evaluation harness. A scorer with access to hidden world facts can identify execution errors, but should not penalize a character for failing to know an unobserved fact.

## 5. Decision implications and unresolved evidence

The strongest near-term research direction is to make an already valid choice useful for longer, with reliable outcomes and reconsideration cues. Calibration and learned routing are attractive only after representative traces exist. Large-population papers motivate concurrency, bounded information access and active-subset scheduling, but do not supply a ready-made interactive NPC budget.

Open questions include how to detect quiet semantic novelty cheaply, how to retain justified changes of mind without causing constant switching, and how to preserve uncommon personalities under distillation. None is settled by a population-response benchmark. No paid provider experiment, model training, live society simulation or OpenLegend runtime benchmark was performed here. No adoption is approved by this document.

## Source register and access boundaries

All links accessed October 14, 2026. Revisions are pinned where the result depends on them. Primary papers, official technical descriptions and first-party corporate reports are distinguished above; no market valuation is used as technical evidence.

- **A1:** Park et al., 2023, [Generative Agents: Interactive Simulacra of Human Behavior, v2](https://arxiv.org/html/2304.03442v2). Architecture, memory/reflection and evaluation/failure sections reviewed.
- **A2:** Park et al., June 2026 revision, [LLM Agents Grounded in Self-Reports Enable General-Purpose Simulation of Individuals, v3](https://arxiv.org/abs/2411.10109v3); [PDF](https://arxiv.org/pdf/2411.10109v3). Results and Figure 2 inspected, including PDF pages 6–7. The full 86-page appendix was not audited.
- **A3:** Kolluri et al., [Finetuning LLMs for Human Behavior Prediction in Social Science Experiments](https://aclanthology.org/2025.emnlp-main.1530/), EMNLP 2025. Final proceedings abstract and metadata reviewed.
- **A4:** Wesel, Chen and Liang, [Building confidence in Simile](https://www.simile.com/blog/confidence), August 25, 2026. Methods, split design and reported comparisons reviewed; vendor results not reproduced.
- **A5:** Bernstein, [Building the What-If Machine](https://www.simile.com/blog/what-if-machine), September 2, 2026. Argument about mechanisms and interventions; not a validation paper.
- **A6:** Simile Business Staff, [How Itaú turned five weeks of research into four days](https://www.simile.com/blog/itau-at-esomar), September 11, 2026. First-party workflow case.
- **A7:** Piao et al., [AgentSociety, v1](https://arxiv.org/html/2502.08691v1), February 2025. Infrastructure/efficiency and interaction-count sections reviewed; no replication.
- **A8:** [LMAgent, v1](https://arxiv.org/html/2412.09237v1), December 2024. Architecture, fast memory and ablation reviewed.
- **A9:** Yang et al., [OASIS, v4](https://arxiv.org/html/2411.11581v4). Methods, efficiency table, activity model and evaluation limitations reviewed. HTML tables read directly; no claim that every appendix was reviewed.
- **A10:** Altera and collaborators, [Project Sid](https://arxiv.org/abs/2411.00114), 2024. Primary abstract only; deeper implementation remains a source-access/coverage limitation.
- **A11:** Google DeepMind, [Concordia publication](https://deepmind.google/research/publications/64717/), 2023, and [official project](https://github.com/google-deepmind/concordia). Architecture description, not an audited deployment.
- **A12:** Wang et al., [Voyager paper](https://arxiv.org/abs/2305.16291) and [authors' project](https://voyager.minedojo.org/), 2023. Components and scope reviewed; headline performance is not imported as an OpenLegend forecast.
