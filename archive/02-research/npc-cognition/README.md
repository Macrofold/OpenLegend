# Responsive, grounded NPC cognition — research library

**Research date: October 20, 2026. Status: completed desk-research packet and critical product review; experiments, adoption and full designs remain separate work.** [Mike's source request and conversation inventory](../../00-source/npc-cognition-research-followup.md) preserve the videos, broader model questions, importance of low unnecessary refusal and the request to connect this research to a compelling, unique and fun OpenLegend.

Repository baseline: `Macrofold/OpenLegend@a612eecf43d225b5f9087287573ec3e054641cf9`. The findings concern that baseline and the dated external snapshots below, not a claim that every linked project was run or every newer release audited. The complete research is retained on `research/npc-models-and-architecture-2026-10-20`, extending the earlier `research/npc-cognition-2026-10-20` work without changing main.

## Start with the decision you need to make

- **What would make this a better game?** Read [playable opportunities and critical review](12-playable-opportunities-and-review.md), then the [design/test preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md). Start with a wanted player experience, not a model leaderboard.
- **Which model or architecture should we compare?** Read [the combined panel and evaluation](11-evaluation-and-research-gates.md), using [low-refusal evidence](09-low-refusal-character-simulation.md) and [architecture composition](10-architecture-composition-and-serving.md) for the relevant tradeoffs. The catalogue is not a requirement to test everything.
- **How do the demonstrations actually work?** Read [Kevin](01-kevin-source-reconstruction.md) and [Mantella](02-mantella-and-npc-systems.md), with the [source audit](07-source-register-and-open-questions.md) for reading depth and unresolved attribution.

## Main findings

**The opportunity is consequential play, not unlimited conversation.** Independent people, practical invention, meaningful cooperation and conflict, humor, discovery and remembered consequences can reinforce OpenLegend's existing survival-adventure goals. Correctness protects these experiences but does not establish enjoyment. The review adds positive opportunities and actual player-study evidence alongside failure diagnostics. [Product synthesis](12-playable-opportunities-and-review.md)

**Kevin's implementation is public.** The relevant project is `chasmlol/m8`, not just a mystery LLM demo. Native game code handles continuing movement, aim alignment, strafing, firing and reload. Kev selects meaningful actions/targets; Gemma handles dialogue and selected visual requests. Frequent state refresh does not imply a model call for every frame. The call graph can nevertheless make several small dependent requests for one reaction. [Source reconstruction](01-kevin-source-reconstruction.md)

**His special visual route uses the player's camera on demand.** For “go there,” native code supplies numbered ground candidates and the model selects a handle. This is neither continuous neural vision nor a model accurately inventing arbitrary world coordinates. Most ordinary combat/state information comes from the game bridge. [Perception and control details](01-kevin-source-reconstruction.md#4-how-kevin-actually-sees)

**Mantella's convincing characterization does not imply complete perception or independent minds.** Current code assembles biographies, scene facts, history and summaries; its multi-NPC route can ask one shared prompt to write several speakers. The exact Skyrim recording's build/model/settings were not established. Dialogue/physics disagreements motivate testing own-action evidence, while intentional lies must remain distinct from missing information or model error. [Mantella dossier](02-mantella-and-npc-systems.md)

**Model selection must be broader than Kev or a popular chatbot ranking.** The catalogue and community survey cover specialist decisions, stock generators, roleplay fine-tunes, actual hosted usage and practical reports. The combined panel adds explicit low-refusal alternatives and small function/edge models for narrowly defined jobs. Hosted listing, downloadable weights, commercial rights and measured suitability remain independent. [Combined comparison panel](11-evaluation-and-research-gates.md#1-the-combined-candidate-panel)

**Unwanted refusal and quiet sanitization are core quality problems.** They must be distinguished from a character's authentic refusal, missing evidence, an impossible action or the service's applicable content boundary. HauhauCS Gemma, Hermes 4.3, Cydonia and Venice deserve direct comparison, not footnote status. Their labels and creator benchmarks do not establish the winner. Exact hosted JSON/schema/tool capabilities also differ. [Low-refusal evidence](09-low-refusal-character-simulation.md)

**Voice and long-term behavior need separate and integrated qualification.** Expression and timing can be genuine sources of enjoyment without proving deeper cognition. Isolate them for diagnosis, then test the whole encounter. Breeze's downloadable model/output rights differ from its code license. PersonaPlex, Qwen3-Omni and MiniCPM-o broaden direct-audio research, but audio-first publication is not a drop-in replacement for our text/hearing contract. [Architecture and serving](10-architecture-composition-and-serving.md) · [Evaluation](11-evaluation-and-research-gates.md)

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
| [11 — Evaluation and research gates](11-evaluation-and-research-gates.md) | Combined candidate panel, controlled episodes, longitudinal drift, original personas, knowledge boundaries, player-value evidence and proposed experiment stages. |
| [12 — Playable opportunities and critical review](12-playable-opportunities-and-review.md) | Positive game opportunities, competence without replacing the player, useful invention, deliberate deception, expression, mixed player-study evidence and the review's changes and retained conclusions. |

[Design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) routes the remaining questions to existing character, cognition, action, perception, speech, performance and release owners. It distinguishes unrun evaluation from genuinely missing design; it is not a replacement implementation backlog or a full feature/technical design pair.

## Recommended first comparisons

Choose a wanted player experience and identify its current evidence and actual dependencies. Actual input-to-action traces and valid native continuation help distinguish missing context from model weakness. A same-context decision comparison and a voice-free dialogue screen can then isolate model effects; a narrow player-experience study can proceed alongside them when its real prerequisites permit it.

Use the [combined panel](11-evaluation-and-research-gates.md#1-the-combined-candidate-panel), including low-refusal candidates alongside hosted usage leaders, stock models and creative fine-tunes. The narrower starting sets in earlier dossiers remain scoped examples, not the final universe of candidates or an instruction to test Kev first regardless of the problem. Same-parent comparisons reduce confounding; they do not attribute every quality change specifically to refusal reduction.

Preserve applicable trusted service instructions, required evidence and native action authority. Evaluate permitted fictional expression, individuality, legitimate disagreement, deliberate deception and quiet sanitization together; removing assistant refusals must not turn every person into a compliant or hostile caricature. Improve perception/own-action evidence before blaming a model for an omitted fact, while preserving the distinction between reality, belief and chosen speech.

Richer memory, optional voice, pixels, direct audio, weight training and learned motor policies remain scoped candidates, not prerequisites. A concrete positive player opportunity can justify exploratory research; existing selected adoption gates and release requirements remain unchanged. Judge both technical integrity and the resulting play, not only a compelling clip, benchmark headline or label.

Existing [research questions](../../05-project/research-backlog.md) and maintained subsystem acceptance remain authoritative. No model/provider, new NPC policy, runtime code, paid experiment or release setting changed in this work.
