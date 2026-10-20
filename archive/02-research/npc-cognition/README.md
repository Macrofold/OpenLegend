# Responsive, grounded NPC cognition — research library

**Research date: October 20, 2026. Status: completed desk-research packet; experiments, adoption and full designs are not completed or authorized by this packet.** [Mike's source request](../../00-source/npc-cognition-research-followup.md) supplied the Halo Kevin and Skyrim transcripts and asked for reverse engineering, current architecture/model research and tangible OpenLegend applications.

Repository baseline: `Macrofold/OpenLegend@a612eecf43d225b5f9087287573ec3e054641cf9`. The findings concern that baseline and the dated external snapshots below, not a claim that every linked project was run or every newer release audited.

## Main findings

**Kevin's implementation is public.** The relevant project is `chasmlol/m8`, not just a mystery LLM demo. Native game code handles continuing movement, aim alignment, strafing, firing and reload. Kev selects meaningful actions/targets; Gemma handles dialogue and selected visual requests. Frequent state refresh does not imply a model call for every frame. The call graph can nevertheless make several small dependent requests for one reaction. [Source reconstruction](01-kevin-source-reconstruction.md)

**His special visual route uses the player's camera on demand.** For “go there,” native code supplies numbered ground candidates and the model selects a handle. This is neither continuous neural vision nor a model accurately inventing arbitrary world coordinates. Most ordinary combat/state information comes from the game bridge. [Perception and control details](01-kevin-source-reconstruction.md#4-how-kevin-actually-sees)

**Mantella's convincing characterization does not imply complete perception or independent minds.** Current code assembles biographies, scene facts, history and summaries; its multi-NPC route can ask one shared prompt to write several speakers. The exact Skyrim recording's build/model/settings were not established. Its dialogue/physics contradictions are valuable evidence for testing coverage and own-action context, not just personality. [Mantella dossier](02-mantella-and-npc-systems.md)

**Local bounded judgment is a concrete experiment.** Kev-4B weights and its OpenRouter listing were verified. Exact availability of the Kevin Gemma modification on OpenRouter was not established; verified larger Gemma routes are different models. Local, open-weight, commercially licensed and less restrictive are independent properties. [Model catalogue](04-models-local-hosted-openrouter.md)

**Voice contributes much of the apparent liveliness.** Streaming phrases, cached conditioning and overlapping stages can improve experience without deeper cognition. Breeze's downloadable weights and self-hosted outputs carry non-commercial restrictions despite Apache-licensed code. Qwen3-TTS, Pocket TTS and Kokoro are comparison candidates, not measured winners. [Voice and serving](05-realtime-voice-and-serving.md)

## Documents

| Document | Coverage |
| --- | --- |
| [01 — Kevin source reconstruction](01-kevin-source-reconstruction.md) | Actual model stack, event/call graph, native controller, marked visual targets, mission context, memory, limitations and reproduction requirements. |
| [02 — Mantella and adjacent NPC systems](02-mantella-and-npc-systems.md) | Exact context/prompt construction, shared-scene generation, memory participation, perception gaps, action disagreement and Chasm/FNV comparisons. |
| [03 — Architectures and papers](03-architectures-and-papers.md) | Hybrid and pixel agents, reusable skills, hierarchical control, recent memory methods, roleplay benchmarks, retrieval and serving. |
| [04 — Models, local/hosted and OpenRouter](04-models-local-hosted-openrouter.md) | Exact candidate identities, dated availability/pricing, specialist versus generative models, licensing, firsthand Hugging Face reports and illustrative economics. |
| [05 — Real-time voice and serving](05-realtime-voice-and-serving.md) | Cascaded versus full-duplex speech, expression, mode-specific controls, streaming, interruption, hardware contention and listener privacy. |
| [06 — OpenLegend applications and experiments](06-openlegend-applications-and-experiments.md) | Useful situations, matched comparisons, evidence to collect, rejection criteria and existing empirical owners. All experiments are unrun. |
| [07 — Source register and unresolved evidence](07-source-register-and-open-questions.md) | Pinned code, reading depth, source types, negative searches, limitations and specific further investigations. |

[Design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) routes the remaining questions to existing DG/CE/CR/AG/CTR/SPK/NST/HE owners. It is not a new implementation backlog or a full feature/technical design pair.

## Recommended first comparisons

Our recommendation is to begin with actual input-to-action traces and valid native continuation, then a same-context Kev comparison and a voice-free stock-versus-modified character-model comparison. Improve perception/own-action evidence before blaming a model for an omitted fact. Add richer memory only for a demonstrated omission, and optional voice only through the selected media and disclosure boundaries. Pixels, full-duplex speech and learned motor policies remain selective candidates rather than prerequisites.

A candidate graduates through useful independent behavior, exact admitted outcomes, privacy/currentness, whole-episode latency/cost and deployable rights—not a compelling clip, benchmark headline or “uncensored” label. Existing [research questions](../../05-project/research-backlog.md) and maintained subsystem acceptance remain authoritative. No model/provider, new NPC policy, runtime code, paid experiment or release setting changed in this work.
