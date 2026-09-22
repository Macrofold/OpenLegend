# Research archive: agency, cognition, attention and persistent action

**Research snapshot:** September 21, 2026, America/New_York. This is an annotated design research archive, not evidence that Open Legend implements or has validated the proposed behavior. Source versions and access depth are identified below. The synthesis is an engineering recommendation, not a claim that an LLM agent reproduces a human or animal mind.

The [behavior specification](../../docs/agent-agency.md) owns the chosen product model. The [runtime contract](../07-technical-architecture/agent-agency-runtime.md) owns operational semantics. The [maintainer tracker](../../docs/maintainers/agent-agency.md) owns implementation and acceptance. Active experiments belong in [research backlog](../05-project/research-backlog.md), and unresolved product decisions in [open decisions](../05-project/open-decisions.md); this archive is not a competing task list.

Access-depth labels below describe the supplied research review. Integration checked the linked source identities without repeating its full-text review. The R13 DOI and R14 publisher/archive routes were unavailable or challenge-gated; the linked institutional record and author-deposited study summary still identify the intended works. Those limitations do not establish additional full-text evidence.

## 1. The most useful conclusion

For Open Legend, the strongest synthesis is **a hybrid of creative proposal, persistent intention, event-driven control and externally validated execution**. The model supplies context-sensitive choices and proposed methods. Small durable records preserve what the actor is trying to accomplish. Native mechanics perform work and report what happened. Another semantic decision is useful when the available evidence or the actor's priorities meaningfully change.

This recommendation combines ideas from BDI agents [R02], temporally extended actions [R05], grounded language-to-action systems [R03], and LLM/external-verifier architectures [R01]. None of those sources independently establishes the best design for this game. In particular, a formal planner is only as sound as its world model; an LLM reviewer is not a proof of physical plausibility.

The important optimization is not simply selecting a cheaper model. It is avoiding unnecessary decisions: do not ask a model again while a valid action is progressing, while a plan's prerequisites remain unchanged, or just because the actor wrote a thought. Preserve the ability to reconsider when food arrives, a method fails, a promise matters, or a previously irrelevant material becomes useful. Event-driven game AI provides a practical implementation precedent [R17].

### Recommended first reading

| Priority | Source                                       | Immediate design question it helps answer                                                 |
| -------- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1        | R02 — BDI                                    | What deserves to persist between decisions, and when should an intention be reconsidered? |
| 2        | R01 — LLM-Modulo                             | Where does creative generation end and trusted validation begin?                          |
| 3        | R03 — SayCan                                 | How do semantic usefulness and actual executability differ?                               |
| 4        | R05 — Options                                | How can a long action proceed without a fresh high-level decision at every step?          |
| 5        | R04 — Generative Agents                      | How do memory, reflection and planning contribute to behavioral continuity?               |
| 6        | R06 / R11 — Action competition and attention | How can goals and environmental changes jointly shape what gets considered?               |
| 7        | R16 / R17 — Game AI                          | What is the smallest practical native execution and interruption layer?                   |
| 8        | R12 / R13 / R14 — Animal cognition           | Which assumptions about nonhuman needs, anticipation and invention are too restrictive?   |

## 2. Functional cognition rather than a miniature brain

The proposed 80/20 is a set of useful functional distinctions. It is not a claim that each distinction maps to a separate brain region or a mandatory serial mental stage.

| Useful function        | Proposed game approximation                                                              | What not to simulate initially                           | Research connection |
| ---------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------- |
| Bodily regulation      | Native needs, consequences and urgent responses                                          | Detailed endocrine or interoceptive physiology           | R07                 |
| Situational attention  | Actor-permitted candidates, protected urgent evidence, goal-relevant selection           | A neural salience map or universal psychological score   | R06, R11            |
| Continuity             | Accepted inner-world prose plus a small operational goal/plan record                     | A complete symbolic theory of every belief               | R02, R04            |
| Skilled execution      | Native actions and short, interruptible sequences                                        | Model calls for footsteps, work ticks or repeated checks | R05, R16, R17       |
| Deliberation           | An occasional bounded model decision; tools only where observations change the next step | A permanently thinking agent process                     | R08, R19            |
| Anticipation           | Future-oriented goals and cue-linked reminders                                           | A full forecast of all future world states               | R09, R12            |
| Exploration            | Investigation, inspection or a scoped method proposal                                    | Rewarding novelty regardless of cost or consequences     | R13, R15            |
| Learning from outcomes | Retain actual success, failure and uncertainty; revise a method or intention             | Treating imagined attempts as experience                 | R10, R18            |

### Needs need not become goals

A useful distinction is between an immediate controller response and an intention maintained beyond the present stimulus. The same hunger state might lead to eating food already carried, seeking help, searching, or maintaining a longer-term food-supply goal. The game need not create a textual goal to explain every bodily adjustment. Conversely, it should not assume that future-oriented behavior is exclusively human or always caused by current deprivation; the animal studies below argue against such a blanket design rule [R07, R12–R14].

### The environment should change opportunities, not write the answer

In the proposed design, seeing animals can make food acquisition relevant; seeing suitable material can make an existing intention actionable. Neither observation must force hunting, teach a hidden recipe, or create a goal automatically. Environmental influence is expressed through available evidence, native constraints and attention. The model can still choose an idiosyncratic, social, cautious or mistaken response. This is our design inference from action-competition and attention research, rather than a finding that those papers tested in LLM games [R06, R11].

### A plan is a hypothesis about means

A remembered intention and its current means should be separable. Receiving food can remove the immediate urgency while leaving a desire for a better hunting tool. A failed material preparation can invalidate one step without erasing the objective. A relationship goal may have no reliable engine-computable success predicate. Operational records can retain continuity without forcing subjective matters into objectively true Boolean world facts [R02, R10].

## 3. Annotated primary-source collection

Access labels distinguish targeted full-text inspection from an abstract or institutional record. A source being relevant does not mean its entire architecture should be adopted.

### R01 — LLM-Modulo: use generation with an external check

**Source:** Kambhampati et al. (2024), _LLMs Can't Plan, But Can Help Planning in LLM-Modulo Frameworks_, ICML position paper. [Paper and metadata](https://arxiv.org/abs/2402.01817), [HTML, version 3](https://arxiv.org/html/2402.01817v3). **Access:** abstract and relevant full-text sections.

The authors argue for combining LLM-generated knowledge and candidates with external model-based verification, rather than trusting self-verification or limiting the model to a syntax translator. For this project, the valuable architectural lesson is to let actors propose and revise while the engine checks effects, dependencies and resources.

**Limit:** the title is a position taken in a 2024 paper, not a timeless proof that every later model fails all planning tasks. External verification only checks the modeled contract. A bow recipe passing a finite validator is not proof that a real bow would work or that all game interactions are covered.

### R02 — BDI: persistent intentions with bounded reconsideration

**Source:** Rao and Georgeff (1995), _BDI Agents: From Theory to Practice_. [AAAI paper](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf). **Access:** targeted full text and page image inspection.

The belief–desire–intention approach distinguishes information, possible objectives and committed pursuit. Its practical discussion exposes a central tradeoff: repeatedly reconsidering everything is costly, but retaining an obsolete intention can be inappropriate.

**Application:** preserve chosen goals across fresh model jobs; reconsider on meaningful changes, not every simulation tick. Keep the current plan separate from the desire it serves.

**Limit:** Open Legend does not need a complete BDI logic, a symbolic record for every belief, or a rigid cognitive pipeline. A small typed intention record plus the existing narrative mind captures the useful distinction without adopting the whole formalism.

### R03 — SayCan: relevance is not feasibility

**Source:** Ahn et al. (2022), _Do As I Can, Not As I Say: Grounding Language in Robotic Affordances_. [Paper](https://arxiv.org/abs/2204.01691). **Access:** abstract and primary paper overview.

SayCan combines language-based task relevance with skill-grounding information when choosing among a robot's available behaviors. This separates what would help from what the embodiment can execute.

**Application:** an action shortlist should contain useful grounded options, but a generated intention is not authority to perform them. Resource, capability and target checks remain outside the actor model.

**Limit:** selection among established skills does not supply open-ended invention. Open Legend needs a proposal path beyond the shortlist, followed by existing-command resolution or the separate invention workflow. Do not treat a language-model score as a mechanical validator.

### R04 — Generative Agents: memory and planning support continuity

**Source:** Park et al. (2023), _Generative Agents: Interactive Simulacra of Human Behavior_. [Paper](https://arxiv.org/abs/2304.03442), [HTML, version 2](https://arxiv.org/html/2304.03442v2). **Access:** architecture and evaluation sections, including planning and ablation discussion.

The system combines experience retrieval, reflection and plans to produce coherent social behavior. It describes retrieval using recency, relevance and importance, and discusses failures such as repetitive behavior. Its ablation evidence supports examining these components rather than treating a single prompt as sufficient continuity.

**Application:** compare behavior with and without operational persistence and relevant recall, including unwanted repetition.

**Limit:** believability evaluations do not establish physical consistency or scalable runtime costs. The interview-style ablations use shared histories rather than proving every alternative architecture through independent full-world rollouts. Do not copy an expensive schedule of model calls into native work execution.

### R05 — Options: decisions at several time scales

**Source:** Sutton, Precup and Singh (1999), _Between MDPs and semi-MDPs: A framework for temporal abstraction in reinforcement learning_. [Paper](https://www-anw.cs.umass.edu/~barto/courses/cs687/Sutton-Precup-Singh-AIJ99.pdf). **Access:** targeted full text and page image inspection.

Options formalize temporally extended behavior using conditions for initiation and termination, with a policy operating between them.

**Application:** represent a native craft, gathering sequence or approach as work that continues until completion, failure or interruption. High-level choice and low-level execution should not share the same frequency.

**Limit:** this is an architectural analogy. It does not require reinforcement learning, a universal reward function, learned policies or an MDP representation of relationships. The existing deterministic action engine can supply the temporally extended behavior.

### R06 — Affordance competition: action selection is not necessarily a serial ritual

**Source:** Cisek (2007), _Cortical mechanisms of action selection: the affordance competition hypothesis_. [Author-hosted paper](https://www.cisek.org/pavel/Pubs/Cisek2007.pdf), [publication record](https://pubmed.ncbi.nlm.nih.gov/17428779/). **Access:** targeted full text and page images.

This hypothesis describes potential actions being represented and selected through competition influenced by available information, rather than a clean perception-then-cognition-then-action pipeline.

**Application:** allow a single decision to consider practical opportunities, goals and social responses together. Do not require a thought, then a goal, then a plan before every action.

**Limit:** this is a neuroscience framework, not a validated software decomposition for general LLM agents. It does not justify exposing every world object or evaluating every possible action in parallel.

### R07 — Homeostatic reinforcement learning: physiology matters without verbal goals

**Source:** Keramati and Gutkin (2014), _Homeostatic reinforcement learning for integrating reward collection and physiological stability_. [eLife article](https://elifesciences.org/articles/04811). **Access:** full-text conceptual model and discussion.

The paper links reward collection to physiological regulation through a computational framework. It provides a useful reminder that changing bodily state can alter the value of the same outcome.

**Application:** hunger, energy and injury should affect relevant context and native priorities. A need can motivate behavior without first becoming an authored long-horizon goal.

**Limit:** the game should not reduce every human concern to a physiological reward formula. Nor does this research justify a categorical rule that hunger disables useful cognition. Exact controller thresholds are simulation policy, to be tested rather than attributed to biology.

### R08 — Expected value of control: deliberation has an opportunity cost

**Source:** Shenhav, Botvinick and Cohen (2013), _The expected value of control: an integrative theory of anterior cingulate cortex function_. [Publication abstract](https://pubmed.ncbi.nlm.nih.gov/23889930/). **Access:** abstract; full-text access was restricted in this review.

The theoretical account relates allocation of cognitive control to expected benefits and costs.

**Application:** expensive planning should be reserved for consequential uncertainty or a blocked useful objective. Continuing a valid native sequence normally does not need a higher reasoning tier.

**Limit:** this does not provide calibrated thresholds, a monetary value-of-computation estimator, or a justification for simulating a brain region. A practical initial router can remain rule-based and measured against behavioral outcomes.

### R09 — Implementation intentions: connect an intention to a cue

**Source:** Gollwitzer and Sheeran, _Implementation Intentions_, author overview hosted by the US National Cancer Institute. [Overview](https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf). **Access:** full-text overview and page image. Publication date was not established from the inspected document; do not label this file as the original 1999 paper.

The overview discusses linking a situational cue to an intended response rather than relying only on a broad goal.

**Application:** a supported reminder such as “when I encounter suitable binding material, reconsider the bow plan” can be a bounded subscription, not continuous LLM monitoring.

**Limit:** observed effects in human goal pursuit do not establish effectiveness for this game. Cue activation must still respect actor knowledge, current intent and live action prerequisites; it is not an unconditional automation script.

### R10 — Goal-directed action and habits: changed value should matter

**Source:** Balleine and Dickinson (1998), _Goal-directed instrumental action: contingency and incentive learning and their cortical substrates_. [Publication abstract](https://pubmed.ncbi.nlm.nih.gov/9704982/). **Access:** abstract/review record.

The review distinguishes aspects of instrumental behavior through sensitivity to action–outcome relations and the current value of outcomes.

**Application:** assess whether an actor changes course when the relevant outcome becomes less useful, while allowing well-established execution to remain cheap. Receiving a meal halfway through a tool-making plan is a useful design probe.

**Limit:** native execution is not literally a biological habit. Do not assume every repeated game action has become habitual, or that every goal change must immediately cancel useful work.

### R11 — Goal-directed and stimulus-driven attention

**Source:** Corbetta and Shulman (2002), _Control of goal-directed and stimulus-driven attention in the brain_. [Nature Reviews Neuroscience article](https://www.nature.com/articles/nrn755). **Access:** publisher abstract and relevant overview.

The review distinguishes and relates goal-directed attention and responses to salient, behaviorally relevant stimuli.

**Application:** retrieval should include both the actor's current concerns and unexpected important changes. Goal-focused material selection must not hide an urgent nearby threat or contradictory evidence.

**Limit:** the proposed protected-context path and discovery allowance are engineering choices, not direct neural implementations. Attention ranking comes after the authority boundary establishes what this actor could know.

### R12 — Scrub-jays: future needs need not equal present hunger

**Source:** Raby, Alexis, Dickinson and Clayton (2007), _Planning for the future by western scrub-jays_. [Abstract and DOI](https://pubmed.ncbi.nlm.nih.gov/17314979/). **Access:** primary publication abstract.

The reported experiments found caching patterns responsive to expected food availability the following morning. The authors interpret the results as challenging the claim that anticipation independent of current motivation is uniquely human.

**Application:** do not make “animal” synonymous with a controller that can only respond to current deprivation. Anticipatory caching is an interesting future behavior for a suitably supported species/controller.

**Limit:** this is evidence from a particular species and task. It is not proof of human-like inner speech, universal animal planning or a reason to attach an LLM to every creature.

### R13 — Crows: tool invention can involve composition

**Source:** von Bayern et al. (2018), _Compound tool construction by New Caledonian crows_. [DOI](https://doi.org/10.1038/s41598-018-33458-z), [author-institution record](https://epub.ub.uni-muenchen.de/59397/). **Access:** institutional abstract/record; publisher full text was not accessible in this review.

The reported behavior includes assembling components into compound tools. It makes composition of available things a more interesting design primitive than selecting only named finished objects.

**Application:** expose relevant material properties and permit a method proposal that combines them, while retaining native validation of actual outcomes.

**Limit:** this is not evidence that all animals can invent arbitrary technology. It also does not solve the different problem of a pretrained LLM knowing technologies that the fictional character should not yet know.

### R14 — Canada jays: avoid universalizing a successful animal example

**Source:** Martin et al. (2021), _No evidence for future planning in Canada jays (Perisoreus canadensis)_. [Primary publication](https://royalsocietypublishing.org/rsbl/article/17/12/20210504/62862/No-evidence-for-future-planning-in-Canada-jays), [archived article](https://pmc.ncbi.nlm.nih.gov/articles/PMC8651407/), [author-deposited data and study summary](https://datadryad.org/dataset/doi%3A10.5061/dryad.x0k6djhkn). **Access:** publication record and author-deposited study summary; full article not successfully inspected.

This is a counterweight to broad claims about all caching birds. The study reports a negative result for future planning in the studied setting; the author-deposited summary describes caching where food was usually available rather than where a future lack was expected.

**Application:** treat species-specific anticipatory behavior as a design choice that needs evidence, rather than a universal cognitive capability.

**Limit:** a cross-species result does not directly refute the scrub-jay finding. The limited access here supports this caution and reading pointer, not a detailed assessment of experimental comparability.

### R15 — Curiosity and information-seeking

**Source:** Gottlieb, Oudeyer, Lopes and Baranes (2013), _Information-seeking, curiosity, and attention: computational and neural mechanisms_. [Publication record](https://pubmed.ncbi.nlm.nih.gov/24126129/), [author-hosted paper](https://www.pyoudeyer.com/TICSCuriosity2013.pdf). **Access:** abstract and author-source overview.

The review connects information-seeking with attention and curiosity across computational and neural accounts.

**Application:** inspection, asking a question or testing a method can be useful actions even when they do not immediately produce food or equipment. A goal can reduce uncertainty rather than acquire an item.

**Limit:** the project does not need an intrinsic-reward optimizer initially. Novelty without bounds risks repeated invention, needless experiments and paid loops. Model imagination and a validator report are not physical observations.

### R16 — F.E.A.R. and GOAP: native operators can compose useful behavior

**Source:** Jeff Orkin (2006), _Three States and a Plan: The A.I. of F.E.A.R._ [GDC talk record](https://gdcvault.com/play/1013282/Three-States-and-a-Plan), [author-written paper, mirror](https://www.gamedevs.org/uploads/three-states-plan-ai-of-fear.pdf). **Access:** targeted full paper and page image; the paper is hosted on a mirror.

The implementation describes goal-oriented action planning using authored action conditions/effects and a small execution state machine.

**Application:** establish clear native action prerequisites and outcomes; compose a short sequence without generating a new permanent mechanic for every description. A deterministic bounded planner can later fill known prerequisites when that actually helps.

**Limit:** the finite operator model does not cover arbitrary social meaning or unknown physics. A goal described in prose is not automatically an admissible GOAP predicate. Do not build a universal symbolic planner before demonstrating a simple native frontier.

### R17 — Event-driven behavior trees in Unreal Engine

**Source:** Epic Games, _Behavior Tree Overview_. [Official documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview). **Access:** official overview, checked September 21, 2026.

The documented implementation uses event-driven changes, blackboard observers and conditional aborts rather than requiring a full tree scan every frame.

**Application:** extend Open Legend's existing readiness and dependency machinery so unchanged work can continue cheaply. Wake a plan when its relevant condition changes.

**Limit:** this is implementation precedent, not a recommendation to adopt Unreal, a full behavior-tree framework or a second scheduler. Event-driven control still needs bounded callback fan-out and durable recovery semantics.

### R18 — Voyager: reuse learned procedures, but not its execution authority

**Source:** Wang et al. (2023), _Voyager: An Open-Ended Embodied Agent with Large Language Models_. [Paper](https://arxiv.org/abs/2305.16291). **Access:** abstract and primary system description.

Voyager combines an automatic curriculum, a growing skill library and feedback-driven iteration in Minecraft, using executable code as its skill representation.

**Application:** a useful learned method should be reusable, and actual execution feedback should inform later attempts. Repeatedly regenerating an equivalent recipe is wasteful.

**Limit:** importing generated executable code would conflict with Open Legend's authority model. Reuse the lesson through admitted recipes and trusted action compositions, not generated JavaScript. The system also does not by itself distinguish a fictional actor's proposed design from privileged engine authoring.

### R19 — ReAct: observations can change the next step

**Source:** Yao et al. (2022 preprint; ICLR 2023), _ReAct: Synergizing Reasoning and Acting in Language Models_. [Paper](https://arxiv.org/abs/2210.03629). **Access:** abstract and primary overview.

ReAct interleaves model reasoning and actions that obtain external observations, allowing later steps to respond to information returned by the environment.

**Application:** a bounded investigation route is useful when inspecting a material or retrieving permitted evidence changes what the actor proposes next.

**Limit:** do not require public chain-of-thought, repeated tool use or a long-lived provider run for ordinary cognition. Open Legend's simulated construction and other actors' replies must happen outside such a private run and return as real later results.

### R20 — Concordia: separate actors from the environment's resolution

**Source:** Vezhnevets et al. (2023), _Generative agent-based modeling with actions grounded in physical, social, or digital space using Concordia_. [Paper](https://arxiv.org/abs/2312.03664). **Access:** abstract and primary architecture overview.

Concordia provides a generative agent-based modeling framework in which proposed actions are grounded through an environment/game-master arrangement.

**Application:** preserve the separation between an actor expressing an intention and the system establishing consequences. This is especially useful when comparing social simulation with mechanically grounded survival.

**Limit:** a language-model game master is not sufficient authority for physical resources or repeatable mechanics here. Narration can explain an admitted result; it cannot become the mechanism that makes the result true.

### R21 — AgentSociety: scale requires an environment and evaluation, not just personalities

**Source:** Piao et al., _AgentSociety: Large-Scale Simulation of LLM-Driven Generative Agents Advances Understanding of Human Behaviors and Society_, submitted 2025; version 2 revised April 10, 2026. [Reviewed version](https://arxiv.org/abs/2502.08691v2). **Access:** versioned abstract and project summary.

The authors describe large-scale agent simulation, environmental infrastructure and social intervention experiments. This is relevant to thinking about system-level throughput and whether aggregate behavior responds meaningfully to interventions.

**Application:** evaluate populations, interaction effects and environmental changes, not just isolated convincing dialogue.

**Limit:** reported scale and alignment with selected social observations do not establish Open Legend's cost, fidelity or performance. Its mechanical workload, privacy constraints and execution model differ. No throughput numbers from this paper are used as capacity promises. The [current project repository](https://github.com/tsinghua-fib-lab/agentsociety/) also points to _AgentSociety 2_ (2026); that newer paper could not be fetched in this review, so this entry does not present the older architecture as a review of the latest platform.

### R22 — BALROG: fluent explanations are not gameplay competence

**Source:** Paglieri et al., _BALROG: Benchmarking Agentic LLM and VLM Reasoning On Games_, 2024 preprint, ICLR 2025; reviewed version 2. [Paper](https://arxiv.org/abs/2411.13543v2). **Access:** abstract and benchmark description.

BALROG evaluates agentic performance across game environments with different demands and reports difficulties in complex interactive settings for the models studied.

**Application:** evaluate actual accomplishment, adaptation and navigation through a changing world, not merely the plausibility of a generated plan. Include mechanically valid but behaviorally poor choices in the failure taxonomy.

**Limit:** historical benchmark results are not current rankings and are not evidence about this game's chosen models. The important transfer is evaluation structure, not a claim that a particular present-day model cannot succeed.

### R23 — Jev: useful bounded judgments, not authority

**Source:** TypeSafe AI, [Primitives](https://docs.typesafe.ai/primitives) and [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13). **Access:** official documentation, checked September 21, 2026; limitations page identifies a September 17, 2026 review.

The documentation describes typed decision primitives and limitations including numerical tasks, distracting context and adversarial steering. Independent questions in one request do not become a sequential reasoning program.

**Application:** retain focused relevance/routing judgments where useful. Test optionality in prompts before adding another paid judgment for every possible response category. Use deterministic checks for quantities, ownership, reference validity and resource conservation.

**Limit:** vendor descriptions are capability guidance, not independent calibration evidence. A high score or confident route cannot authorize effects, prove physical correctness, or reliably enforce a cross-field invariant without native validation.

### R24 — Event sourcing: distinguish recorded facts from external side effects

**Source:** Martin Fowler (2005), _Event Sourcing_. [Author's article](https://martinfowler.com/eaaDev/EventSourcing.html). **Access:** architecture article.

The article explains retaining state changes as events and deriving state from them. Its broader relevance is the distinction between a durable record and executing effects outside that record.

**Application:** retain operation identities and actual outcomes so reconstruction of readiness does not repeat a paid generation or consume materials twice. This is a project-specific engineering inference.

**Limit:** no wholesale event-sourcing rewrite is recommended. Open Legend already has snapshots, transactions and receipts. A private thought also need not become a public world event merely because both are stored changes.

## 4. Alternatives considered

These comparisons are recommendations for this repository, not experimental findings about Open Legend.

**Only improve the prompt.** Useful for optionality, but insufficient for durable goals, sequencing, scope or mechanical execution. Text cannot replace an authoritative queue or make a proposal executable. Use prompt changes as one part of the contract.

**Use one enormous natural-language agent memory file.** Flexible for identity and subjective interpretation, but weak as the sole operational record. It cannot reliably provide stable step IDs, independent cancellation, queryable dependencies or exactly-once execution. Retain narrative freedom while giving execution a small typed structure.

**Make everything a formal planner operator.** Attractive for known finite mechanics, unsuitable as the only representation for arbitrary interests, social interpretation and incomplete methods. Start with native steps and a bounded frontier. Add planning over trusted operators only when measured examples justify it [R16].

**Let a world LLM decide all consequences.** Expressive, but undermines replayable resource accounting and established mechanics. Use generation to propose supported changes and scoped explanations, not to silently substitute physical law [R01, R20].

**Give every NPC an always-running harness.** Convenient continuity within a provider session, but ties behavior to remote lifetime and spends while waiting for world events. Persist intentions in the game; use short jobs for decisions and optional bounded tool sessions for investigation [R05, R19].

**Fully unify all events, thoughts and speech into one log.** Shared plumbing can help, but a universal public event stream risks privacy leaks and spurious reactions. Share a small opportunity interface while keeping private stimuli, public occurrences, application receipts and presentation separate. This is an authority decision, not a biological claim.

## 5. Design risks research does not remove

The model's pretrained knowledge is not identical to the actor's learned knowledge. Retrieval controls access to game records but cannot make a modern model genuinely forget what a bow is. Historical technology constraints therefore need an explicit conceptual-baseline policy and behavioral evaluation, not only filtered context.

A method can be valid under a finite construction contract yet exploit the upper edge of every allowed performance parameter. Structural validity, resource conservation, game balance and believable choice are separate properties. Actor-side proposals should not select authoritative numerical damage merely because an authoring schema contains it.

Freeform language is not synonymous with unrestricted mechanics. Most useful variation should initially come from different intentions, compositions, material choices and social responses over a small stable substrate. New privileged engine capabilities remain engineering work. This limitation should be visible to the developer without turning every character into a spokesperson for the software architecture.

Silence needs evaluation too. A model that always emits a plan is not necessarily more agentic than one that continues sensible work. Conversely, a cheap router that suppresses every non-routine response may hide failure behind low cost. Compare both under the same opportunities and budgets; the concrete experiment procedures belong in the maintainer tracker and research backlog.

## 6. Evidence boundaries and further reading practice

This was a targeted design review, not a systematic meta-analysis. The collection combines older foundational work with contemporary agent systems and current vendor documentation. It includes both positive animal findings and a negative finding, but it does not establish a complete account of animal cognition. Some sources were inspected only through abstracts or publication records, as explicitly labeled.

Before using a paper to justify an irreversible implementation choice, read its relevant methods and limitations rather than relying on its title or this synopsis. In particular, biological analogies motivate hypotheses; they do not determine schema fields, optimal prompt sizes, simulator thresholds or spending limits. System demonstrations motivate comparisons; they do not establish this project's live quality or scalability.

The near-term engineering hypothesis is that **durable intentions plus native execution and selective reconsideration** will produce better continuity per unit of compute than either stateless menu selection or constant freeform deliberation. That remains to be measured in Open Legend. Research provenance stays here; accepted requirements, active questions and task status stay with their designated owners.
