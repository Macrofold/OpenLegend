# Characters and execution research

Current questions and proposed methods; no study or implementation is authorized by this record. Existing delivery/acceptance: [cognition redesign](../../maintainers/cognition-redesign.md) · [agent agency](../../maintainers/agent-agency.md) · [character experience](../../maintainers/character-experience.md). Earlier “not started” claims remain historical in the former backlog; consult these owners before selecting an experiment. Reuse valid evidence and keep required gates distinct from proposed research.

## R03 / P1 — Does Jev improve routing cost/latency at adequate accepted-error coverage?

Investigation: Obtain permitted access; authored development/holdout cases; compare local rules, Jev, structured-output model; region/burst tests

Evidence needed: Report accepted errors, abstention, p50/p95/p99, cost, injection results, terms/retention answers

Current qualification belongs to the linked delivery owners, not the former archive's “not started” snapshot. This question grants no new implementation or paid-experiment authority.

## R10 / P0 — Do traits, affect and memory improve perceived individuality?

Investigation: Compare small model vs richer variants in blinded/observed sessions; record behavior/cost

Evidence needed: Players notice useful differences; state predicts action enough to explain it

Current qualification belongs to the linked delivery owners, not the former archive's “not started” snapshot. This question grants no new implementation or paid-experiment authority.

## R11 / P1 — Can bounded memories preserve identity and commitments?

Investigation: Long simulated history with rumors, contradictions, repeated events, forgetting, consolidation races

Evidence needed: Attribution intact; commitments retained; capacity bounded; summary error measured

Current qualification belongs to the linked delivery owners, not the former archive's “not started” snapshot. This question grants no new implementation or paid-experiment authority.

### Character portrayal and grounding evidence

Research reviewed **2026-10-27** for R10/R11. These sources distinguish believable voice, personality, acquired knowledge and completed action; success in one does not establish the others.

- [Generative Agents (UIST 2023)](https://arxiv.org/html/2304.03442v2) found memory, planning and reflection each improved rated believability. Its own evaluation still found missed or incomplete retrieval, invented embellishments and overly formal speech. Memory architecture supports coherence; it does not guarantee factual dialogue.
- [RoleLLM (ACL Findings 2024)](https://aclanthology.org/2024.findings-acl.878/) separates role-specific knowledge from speaking-style imitation. Its trained role models support evaluating these dimensions separately; its fine-tuning gains are not evidence that another role instruction alone improves our runtime.
- [InCharacter (ACL 2024)](https://aclanthology.org/2024.acl-long.102/) assesses personality through open-ended interviews rather than relying on self-reported trait scores. Recognizable diction does not establish consistent motives. Its LLM-based interview assessment does not qualify physical agency or player enjoyment.
- [TailorRPA (EMNLP Findings 2025)](https://aclanthology.org/2025.findings-emnlp.288/) combines fine-grained episodic memories with protective questions outside a character's knowledge. Training ablations support both components. Knowledge boundaries should follow authored experience, not demographic stereotypes; the paper does not establish a prompt-only cure.
- [Personas in System Prompts (EMNLP Findings 2024)](https://aclanthology.org/2024.findings-emnlp.888/) found no reliable factual-accuracy improvement across its tested roles and model families. This factual-question result cautions against treating persona as evidence; it does not rule out benefits for voice.
- [Lost in the Middle (TACL 2024)](https://aclanthology.org/2024.tacl-1.9/) found relevant-information position affects retrieval and question answering, including with long-context models. A request fitting the window does not prove its important evidence is used; ordering and distraction need controlled comparisons.
- [FActScore (EMNLP 2023)](https://aclanthology.org/2023.emnlp-main.741/) evaluates individual factual claims against sources because one fluent sentence can mix supported facts and inventions. Its biography benchmark motivates claim-level review, not importing a real-world fact checker as authority over fictional worlds.
- [Self-RAG (ICLR 2024)](https://arxiv.org/html/2310.11511) improves retrieval-grounded factuality using trained reflection and support judgments, but still reports unsupported outputs. Its training and inference procedure are not a drop-in prompt; a model's assertion of support is not proof of entailment.
- [Anthropic's hallucination guidance](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations) recommends permitting uncertainty and checking claims against exact supporting material. These are useful hypotheses for other providers, not cross-model guarantees or justification for mandatory extra verification calls.
- [SayCan (2022)](https://arxiv.org/abs/2204.01691) grounds language-selected plans in executable robotic affordances. It supports keeping plausible language separate from actual feasibility; robotics results do not qualify our game mechanics.

The selected [character policy](../../projects/compelling-characters-feature-spec.md#prompting-behavior) permits written emotional asides and compatible elaboration of sparse pre-game history. Keep biography, acquired memories, testimony and current intentions distinct; earlier self-speech proves what was said, not that an announced action happened. Concise relevant evidence, natural in-character uncertainty and independently observed native outcomes remain useful. The [native study](../../verification/cognition-lab-native-model-study.md#october-27--portrayal-and-factual-grounding) found no grounding benefit from its added source-checking prompts; neither was retained. [CE](../../maintainers/character-experience.md) and [SC](../../maintainers/cognition-context.md) retain delivery and qualification ownership.

Current context preparation already combines mechanical permissions, retrieval and budgeting with model-assisted relevance before response generation. A proposed same-call evidence plan would instead ask the response generator to select particular source handles and claims before composing its voice. That is an additional output structure, not another retrieval layer or proof of truth; it is not selected now. No new self-speech blocker, mandatory critic or source-bound rendering restriction is selected.

Offline checking means outside live gameplay, not necessarily without a model: human review needs no inference, while batch model review still costs calls. Code can check identifiers, access, exact quotations and committed action status; those checks do not establish whether arbitrary prose follows from a source. That semantic judgment generally needs human or model assessment. A selective path would reserve such extra assessment for particular consequential claims rather than every sentence. These are diagnostic options, not an adopted runtime checking pipeline.

**Conditional future training, unavailable and unselected now:** RoleLLM and TailorRPA motivate studying evidence-use skills separately from voice imitation. If a repeatable gap warrants the investment, compare memory-present, absent, contradictory and hearsay examples; reward useful in-character uncertainty without generic refusal, and hold out entire personalities and scenario families. This would use lawful representative data, not assume private histories are training material or require weights for each character. The existing [training research task](../../maintainers/npc-cognition-research-needs-design.md#7-experience-derived-routines-and-training-only-after-a-concrete-gap) owns any later scope decision.

## R19 / P1 — Does Macrofold workspace execution improve NPC behavior enough to justify its overhead?

Investigation: After implementation authorization, compare the same small cast and histories using bounded direct calls versus on-demand Macrofold runs; include fresh NPC jobs versus deliberately resumed creator conversations, accelerated time, concurrent new memories and failed persistence. Profile queue, VM creation, hydration/restore, harness initialization, first model response, output delivery and final persistence separately before changing startup behavior

Evidence needed: Measure attribution/recall, commitment misses, forgetting, permitted knowledge, p50/p95 stage latency, occupied concurrency, tokens, checkpoint bytes/file counts and actual spend; separate retail pricing from self-hosted vendor cost; compare bounded batching and warm reuse only against measured baselines

Current qualification belongs to the linked delivery owners, not the former archive's “not started” snapshot. This question grants no new implementation or paid-experiment authority.

## R20 / P1 — Can a common Macrofold AI-workflow/resource layer serve live simulation efficiently and correctly?

Investigation: After authorization, one typed environmental judgment and one NPC reasoning job against consistent scoped snapshots; compare direct provider and platform paths, then inject changed entity versions, duplicate delivery, cancellation, provider failure and a crash after commit

Evidence needed: Measure total/p95 overhead, tokens, management/storage cost, correct budget and scope enforcement, atomic/idempotent game commits and absence of mixed-revision inputs; no full file lifecycle needed for a tiny judgment

Current qualification belongs to the linked delivery owners, not the former archive's “not started” snapshot. This question grants no new implementation or paid-experiment authority.

## R24 / P1 — agency continuity, optionality and actor-method fidelity

The [agency research](../../../archive/02-research/agency-cognition-and-planning.md) motivates these experiments; [AG12](../../maintainers/agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) owns delivery and behavioral qualification. Use matched worlds, opportunities, permitted histories, models and total allowances, with held-out scenarios and independent runs. Baselines must include silence, blocked work and provider unavailability, not only successful crafting.

| Comparison                                                  | Manipulated variable                                                                                    | Measured outcome                                                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prompt-only optionality versus an extra category gate       | Add/remove the gate with the same opportunity set                                                       | Useful interventions and abstention, missed opportunities, false success, latency and full call cost                                                |
| Repeated replanning versus persistent frontier              | Retain native frontier across decisions at matched budgets                                              | Actual progress, native steps per decision, interruption, goal churn and adaptation when food arrives                                               |
| Selected-object cues versus goal-derived interests          | Add bounded cues from actor-known plan prerequisites                                                    | Relevant exposed materials found, contrary/urgent evidence retained, scoped recall and missed alternatives                                          |
| Actor method versus compiler output                         | Complete/incomplete methods, substantive substitutions, hidden equivalent designs and goal cancellation | Conceptual fidelity, explicitly accepted revisions, privacy leakage, optional construction and truthful feedback                                    |
| Bodily urgency, response adequacy and unavailable cognition | Adequate/unavailable food paths, starvation, sleep and no-provider states                               | Actual admitted response or unresolved need, retained evidence, useful deliberation and repeated-call suppression; no assumed feeding or protection |

The [compelling-character flows](../../projects/compelling-characters-feature-spec.md#complete-behavioral-flows) and [CE05](../../maintainers/character-experience.md#ce05--integrated-character-quality-and-complete-cost-qualification) extend this same program to complete ordinary life: bodily pressure and relief, contact/belonging, enjoyment, refusal, solitude, meaningful repetition, interrupted pursuits and delayed reinterpretation. Compare coherent character seeds and permitted context variants one factor at a time, preserving required identity/evidence and actual world state. Judge recognizable motives, useful stopping, continuity and the player's experience separately from fluent self-report or action diversity. The [inner-life research companion](../../../archive/03-design-proposals/character-experience-and-inner-life.md) supplies hypotheses, not evidence of consciousness or proof that a need model works.

Account for all routing, attention, embeddings, generation, tools, reflection and uncertain charges per real hour and simulated day. Each run stops on its predeclared time/cost cap, terminal scenario outcome, or a privacy/resource/replay violation; no paid repair loop follows. Record failures and uncertainty. Fix sample sizes and behavioral comparison criteria from a development baseline before holdout evaluation. Dependencies: AG11, relevant CR12/INV gates, D12/D54 and R08/R11/R19/R22; **not run** and no paid execution authorized by this entry.

R19 follow-up: include the proposed [Macrofold shared-worker mode](../../../archive/03-design-proposals/macrofold-shared-workers.md) in the adoption comparison if implemented. Compare identical model/context/tools through a minimal game executor, current sandbox execution and pooled execution; distinguish warm exclusive slots from many restricted loops in a shared process. Measure per-job control-plane cost and adaptation effort as well as VM startup. Worker reuse must preserve actor isolation, per-job accounting, cancellation and safe handling of already-committed actions. No such executor or benchmark is claimed by this archive.
