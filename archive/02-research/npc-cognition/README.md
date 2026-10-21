# Responsive, grounded NPC cognition — research library

**Research date: October 20, 2026. Status: completed desk-research packet; experiments, adoption and full designs remain separate work.** [Mike's source request](../../00-source/npc-cognition-research-followup.md) supplied the Halo Kevin and Skyrim transcripts and asked for reverse engineering, current architecture/model research and tangible OpenLegend applications. His follow-ups broadened the community/model survey and made low unnecessary refusal a central selection concern.

Repository baseline: `Macrofold/OpenLegend@a612eecf43d225b5f9087287573ec3e054641cf9`. The findings concern that baseline and the dated external snapshots below, not a claim that every linked project was run or every newer release audited. The complete research is retained on `research/npc-models-and-architecture-2026-10-20`, extending the earlier `research/npc-cognition-2026-10-20` work without changing main.

## Main findings

**Kevin's implementation is public.** The relevant project is `chasmlol/m8`, not just a mystery LLM demo. Native game code handles continuing movement, aim alignment, strafing, firing and reload. Kev selects meaningful actions/targets; Gemma handles dialogue and selected visual requests. Frequent state refresh does not imply a model call for every frame. The call graph can nevertheless make several small dependent requests for one reaction. [Source reconstruction](01-kevin-source-reconstruction.md)

**His special visual route uses the player's camera on demand.** For “go there,” native code supplies numbered ground candidates and the model selects a handle. This is neither continuous neural vision nor a model accurately inventing arbitrary world coordinates. Most ordinary combat/state information comes from the game bridge. [Perception and control details](01-kevin-source-reconstruction.md#4-how-kevin-actually-sees)

**Mantella's convincing characterization does not imply complete perception or independent minds.** Current code assembles biographies, scene facts, history and summaries; its multi-NPC route can ask one shared prompt to write several speakers. The exact Skyrim recording's build/model/settings were not established. Its dialogue/physics contradictions are valuable evidence for testing coverage and own-action context, not just personality. [Mantella dossier](02-mantella-and-npc-systems.md)

**Model selection must be broader than Kev or a popular chatbot ranking.** The catalogue and community survey cover specialist decisions, stock generators, roleplay fine-tunes, actual hosted usage and practical reports. The combined panel adds explicit low-refusal alternatives and small function/edge models for narrowly defined jobs. Hosted listing, downloadable weights, commercial rights and measured suitability remain independent. [Combined comparison panel](11-evaluation-and-research-gates.md#1-the-combined-candidate-panel)

**Unwanted refusal and quiet sanitization are core quality problems.** They must be distinguished from a character's authentic refusal, missing evidence, an impossible action or the service's applicable content boundary. HauhauCS Gemma, Hermes 4.3, Cydonia and Venice deserve direct comparison, not footnote status. Their labels and creator benchmarks do not establish the winner. Exact hosted JSON/schema/tool capabilities also differ. [Low-refusal evidence](09-low-refusal-character-simulation.md)

**Voice and long-term behavior need separate qualification.** Expression and useful phrase streaming can improve an encounter without deeper cognition. Breeze's downloadable model/output rights differ from its code license. PersonaPlex, Qwen3-Omni and MiniCPM-o broaden the direct-audio research, but audio-first publication is not a drop-in replacement for our text/hearing contract. Recent studies motivate original-character, extended-dialogue and actual knowledge-boundary tests. [Architecture and serving](10-architecture-composition-and-serving.md) · [Evaluation](11-evaluation-and-research-gates.md)

## Documents

| Document | Coverage |
| --- | --- |
| [01 — Kevin source reconstruction](01-kevin-source-reconstruction.md) | Actual model stack, event/call graph, native controller, marked visual targets, mission context, memory, limitations and reproduction requirements. |
| [02 — Mantella and adjacent NPC systems](02-mantella-and-npc-systems.md) | Exact context/prompt construction, shared-scene generation, memory participation, perception gaps, action disagreement and Chasm/FNV comparisons. |
| [03 — Architectures and papers](03-architectures-and-papers.md) | Hybrid and pixel agents, reusable skills, hierarchical control, recent memory methods, roleplay benchmarks, retrieval and serving. |
| [04 — Models, local/hosted and OpenRouter](04-models-local-hosted-openrouter.md) | Initial exact model catalogue, dated availability/pricing, specialist versus generative models, licensing, firsthand Hugging Face reports and illustrative economics. |
| [05 — Real-time voice and serving](05-realtime-voice-and-serving.md) | Cascaded versus full-duplex speech, expression, mode-specific controls, streaming, interruption, hardware contention and listener privacy. |
| [06 — OpenLegend applications and experiments](06-openlegend-applications-and-experiments.md) | E1–E8 situations, matched comparisons, evidence to collect, rejection criteria and existing empirical owners. All experiments are unrun. |
| [07 — Source register and unresolved evidence](07-source-register-and-open-questions.md) | Pinned code, reading depth, source types, negative searches, limitations and specific further investigations. |
| [08 — Community adoption and model shortlist](08-community-adoption-and-model-shortlist.md) | Dated hosted roleplay usage, NPC-mod defaults, local fine-tune distribution signals, mixed firsthand reports and adoption-informed candidates. |
| [09 — Low-refusal character simulation](09-low-refusal-character-simulation.md) | Uncensored-model evidence, explicit and quiet refusal failures, faithful independence, exact hosted capabilities, terms and policy distinctions. |
| [10 — Architecture composition and serving](10-architecture-composition-and-serving.md) | Model responsibilities, additional small/omni candidates, evidence-to-action feedback, local/hosted choices, caching, structured output and speech tradeoffs. |
| [11 — Evaluation and research gates](11-evaluation-and-research-gates.md) | Combined candidate panel, controlled episodes, longitudinal drift, original personas, knowledge boundaries, metrics and proposed experiment stages. |

[Design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) routes the remaining questions to existing character, cognition, action, perception, speech, performance and release owners. It distinguishes unrun evaluation from genuinely missing design; it is not a replacement implementation backlog or a full feature/technical design pair.

## Recommended first comparisons

Begin with actual input-to-action traces and valid native continuation, then a same-context bounded-decision comparison and a voice-free dialogue screen. Use the [combined panel](11-evaluation-and-research-gates.md#1-the-combined-candidate-panel), including low-refusal candidates alongside hosted usage leaders, stock models and creative fine-tunes. The narrower starting sets in earlier dossiers remain scoped examples, not the final universe of candidates or an instruction to test Kev first regardless of the problem.

Keep stock-versus-modified pairs to investigate tuning effects. Preserve the same applicable trusted service instructions, required evidence and native action authority. Evaluate permitted fictional expression, character consistency, legitimate disagreement and quiet sanitization together; removing assistant refusals must not turn every person into a compliant or hostile caricature. Improve perception/own-action evidence before blaming a model for an omitted fact.

Add richer memory for a demonstrated omission and optional voice through the selected media/disclosure boundaries. Pixels, direct audio, weight training and learned motor policies remain conditional candidates, not prerequisites. A candidate graduates through useful independent behavior, exact admitted outcomes, privacy/currentness, whole-episode latency/cost and deployable rights—not a compelling clip, benchmark headline or label.

Existing [research questions](../../05-project/research-backlog.md) and maintained subsystem acceptance remain authoritative. No model/provider, new NPC policy, runtime code, paid experiment or release setting changed in this work.
