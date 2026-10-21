# What roleplay and NPC communities actually use

**Checked October 20, 2026. Status: desk research and proposed comparisons; no model execution, adoption or runtime changes.** This supplements the [technical model catalogue](04-models-local-hosted-openrouter.md) with Mike's requested evidence about current popularity and actual use. The original catalogue included alternatives to Kev but was not a sufficient adoption survey. This document owns the additional popularity snapshot; the [existing experiment dossier](06-openlegend-applications-and-experiments.md) and [design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) retain evaluation and design ownership.

## 1. What the evidence measures

Use five different evidence levels without treating them as interchangeable:

- **Tracked application usage:** OpenRouter's application-specific model/token tables. These show actual routed traffic, not all users of the application, local execution or direct-provider traffic.
- **NPC-mod guidance:** the maintainers' recommended starting configurations. A default is evidence of a supported starting point, not a user census.
- **Hugging Face downloads:** interest and distribution for one exact repository. Repeated downloads, alternative quantizations and other repositories prevent interpreting the count as unique players or production deployments.
- **Firsthand reports:** useful accounts of actual problems or preferences, not representative consensus or controlled comparisons.
- **Model-card claims:** intended capabilities and training provenance, not demonstrated OpenLegend quality.

The monthly labels below are the pages' own labels. Do not reinterpret them as a precisely defined calendar-month or rolling-30-day window. Token volume can favor long histories, verbose output and reasoning-heavy requests; none of these sources measures useful independent NPC decisions per dollar.

## 2. Hosted character-chat usage

### SillyTavern

OpenRouter's **top models used by SillyTavern this month**, retrieved on the research date:

| Rank | Model | Reported tokens |
| --- | --- | --- |
| 1 | DeepSeek V4.1 Flash | 32.8 billion |
| 2 | GLM 5.2 | 30.8 billion |
| 3 | Gemini 3.8 Flash | 29 billion |
| 4 | GLM 5.3 Flash | 24.8 billion |
| 5 | DeepSeek V3.2 | 19.3 billion |
| 6 | GLM 5.3 | 18.9 billion |
| 7 | Claude Opus 5.5 | 15.8 billion |

Source: [OpenRouter's SillyTavern application statistics](https://openrouter.ai/apps/sillytavern). This is stronger popularity evidence than a generic model recommendation article, but does not isolate game NPC use from other character chat.

### A second audience gives a different ranking

The equivalent [Janitor AI table](https://openrouter.ai/apps/janitor-ai) lists DeepSeek V3.2 first at **215 billion** tokens, Nemotron 3 Ultra second at **117 billion**, and GLM 5.2 third at **62.2 billion**. DeepSeek V4 Pro 0423 and DeepSeek V4.1 Flash follow at 49.8 and 49.1 billion. The chart does not establish which pricing tier caused that traffic.

**Interpretation:** DeepSeek and GLM deserve serious inclusion in our dialogue comparisons. Gemini Flash is another important hosted candidate, while Claude provides a separate high-capability reference. Nemotron's character-chat traffic also deserves investigation rather than dismissal as an enterprise-only family. The persistence of DeepSeek V3.2 is a useful reminder that newest release and actual adoption are different questions. These are candidate-selection inferences, not conclusions about quality, cost or response time in OpenLegend.

## 3. What actual NPC-mod projects recommend

[Mantella's installation guide](https://art-from-the-machine.github.io/Mantella/pages/installation.html) uses **Gemma 4 26B A4B (free)** as its OpenRouter starting model and includes **Gemma 4 E4B** in its local KoboldCpp guidance. This makes stock Gemma an especially relevant NPC comparator, independently of Kevin's modified 12B checkpoint. These are documented setup examples, not a claim that every Mantella user uses Gemma or that a free route has production availability guarantees.

Mantella's [fine-tuned-model page](https://art-from-the-machine.github.io/Mantella/pages/fine_tuned_models.html) explicitly no longer recommends its older Skyrim Llama 3 8B fine-tune, saying newer non-fine-tuned models perform better. The general lesson is not that fine-tuning fails; it is that lore-specific training does not excuse comparing against an obsolete general-model baseline.

[CHIM's LLM configuration](https://dwemerdynamics.com/chim/llm.html) supports separate Standard, Fast, Powerful, Experimental, Diary and Formatter choices, with additional model roles for other systems. Its [local-model guide](https://dwemerdynamics.com/chim/local-llm-guide.html) distinguishes conversational success from reliable action formatting and warns about competition for hardware resources. This is evidence for assigning different jobs to different models, not evidence of a single CHIM-wide favorite. We did not obtain a representative census of CHIM installations.

Mantella's [real-time guidance](https://art-from-the-machine.github.io/Mantella/pages/real_time_npcs.html) also emphasizes provider latency, transcription and speech generation. A popular model on a slow provider can be a poor real-time companion; a model-family name alone does not specify the whole experience.

## 4. Local roleplay fine-tunes worth serious attention

The counts here come from **bartowski's exact GGUF repositories**, not the original full-precision repositories. GGUF is a format commonly used for local inference; each repository offers compressed variants with different memory/quality tradeoffs. These four entries are a researched comparison panel, not a complete leaderboard of local roleplay.

| Exact candidate | Model lineage / intended role | Monthly downloads of the checked GGUF repository |
| --- | --- | --- |
| **Artemis 31B v1.2** | Gemma 4 31B-derived character dialogue and creative writing | **52,594** — [artifact](https://huggingface.co/bartowski/TheDrummer_Artemis-31B-v1.2-GGUF), [author card](https://huggingface.co/TheDrummer/Artemis-31B-v1.2) |
| **Orion 26B-A4B v1.1** | Gemma 4 26B-A4B-derived roleplay model | **36,870** — [artifact](https://huggingface.co/bartowski/TheDrummer_Orion-26B-A4B-v1.1-GGUF), [author card](https://huggingface.co/TheDrummer/Orion-26B-A4B-v1.1) |
| **Rocinante-X 12B v1** | Mistral Nemo-derived smaller character/writing model | **12,865** — [artifact](https://huggingface.co/bartowski/TheDrummer_Rocinante-X-12B-v1-GGUF), [author card](https://huggingface.co/TheDrummer/Rocinante-X-12B-v1) |
| **Magidonia 24B v4.3** | Magistral/Mistral-derived roleplay and writing model | **10,044** — [artifact](https://huggingface.co/bartowski/TheDrummer_Magidonia-24B-v4.3-GGUF), [author card](https://huggingface.co/TheDrummer/Magidonia-24B-v4.3) |

**Proposed use:** compare Orion against stock Gemma 4 26B A4B and Artemis against stock Gemma 4 31B. This isolates whether roleplay tuning improves our characters without simultaneously changing the entire model family. Rocinante-X provides a smaller creative-writing comparison; Magidonia tests a different lineage. An A4B label describes active computation, not a promise that only four billion parameters occupy memory.

Additional useful candidates and evidence boundaries:

- **Skyfall 31B v4.2:** the [author card](https://huggingface.co/TheDrummer/Skyfall-31B-v4.2) includes a user's RimTalk report about coherent dialogue and usable JSON, alongside praise for detailed writing. That is directly relevant anecdotal game-mod evidence, but it is author-curated and not an independent integration benchmark. Long output can be a liability in rapid exchanges.
- **Stock Qwen3.5 4B / 9B:** retain compact general-model baselines rather than compare only creative fine-tunes. The [official 9B card](https://huggingface.co/Qwen/Qwen3.5-9B) documents multimodal input and thinking controls. This establishes a candidate's capabilities, not NPC-specific popularity. The [original catalogue](04-models-local-hosted-openrouter.md) owns the 4B candidate.
- **Euryale/Stheno and Magnum:** [Sao10K's catalogue](https://huggingface.co/Sao10K) and [Magnum v4 12B](https://huggingface.co/anthracite-org/magnum-v4-12b) remain useful references to earlier roleplay-focused families. Their existence and continuing downloads should not be presented as proof that they lead October 2026 adoption.
- **Emerging NPC/writing adaptations:** [Gemma4NPC E4B GGUF](https://huggingface.co/chimbiwide/Gemma4NPC-E4B-GGUF) describes NPC-context tuning and showed 236 monthly downloads; [GarnetV3 31B](https://huggingface.co/ConicCat/Gemma4-GarnetV3-31B) describes preference training for writing/roleplay and showed 348. They are research watchlist candidates, not established popular winners. Neither was tested here.

This evidence expands the earlier Qwen/Gemma/Hermes/Nemotron shortlist; it does not prove those earlier alternatives are bad. Check each exact artifact's terms, training provenance and runtime requirements before commercial deployment. “Open-weight,” “uncensored,” “roleplay” and “commercially deployable” are not synonyms.

## 5. What users report: strengths and problems together

Artemis illustrates why popularity cannot substitute for qualification. In [discussion 1](https://huggingface.co/TheDrummer/Artemis-31B-v1.2/discussions/1), users disagree about v1.2 versus v1.1. Reports include excessive description, weaker formatting or instruction adherence, but also better interpretation of character intentions. One tabletop-roleplay report describes mundane movement/equipment exchanges becoming unnecessarily elaborate. The author's chat-template explanation is a hypothesis, not a demonstrated universal cause.

In [discussion 5](https://huggingface.co/TheDrummer/Artemis-31B-v1.2/discussions/5), another user reports successful everyday use and useful instruction following. These are small firsthand samples. They justify testing short spontaneous replies, not declaring the model uniformly good or bad.

**OpenLegend implication:** a model that writes a beautiful page can still be a poor person to talk to while moving, working or responding to danger. Test exact requested actions, factual state, interruption, brief answers and authentic refusal separately from prose style. Test the documented template before blaming the checkpoint, while preserving a matched-context comparison and disclosing any model-specific prompt tuning.

## 6. Which are actually on OpenRouter?

Public pages were verified for **`deepseek/deepseek-v4.1-flash`**, **`google/gemini-3.8-flash`** and **`z-ai/glm-5.3-flash`**. The application statistics above additionally establish routed traffic for the other named hosted models. This is evidence of listing/use, not a qualification of our account, selected provider, output schema or latency. [DeepSeek](https://openrouter.ai/deepseek/deepseek-v4.1-flash), [Gemini](https://openrouter.ai/google/gemini-3.8-flash), [GLM](https://openrouter.ai/z-ai/glm-5.3-flash).

[TheDrummer's OpenRouter catalogue](https://openrouter.ai/thedrummer) lists Cydonia 24B v4.1, Valkyrie 49B v1, Skyfall 36B v2, UnslopNemo 12B and Rocinante 12B. **These are not the same artifacts as Artemis 31B v1.2, Orion 26B-A4B v1.1, Skyfall 31B v4.2, Magidonia 24B v4.3 or Rocinante-X 12B v1.** Exact public OpenRouter routes for the latter comparison set were not established. Treat them as downloadable/local candidates until exact hosting is verified, not categorically absent from every host.

Check tool/schema support per model and provider. A hosted text-generation listing does not establish function calling, and a similarly named older checkpoint is not a valid substitute in a controlled comparison.

## 7. Proposed OpenLegend comparison roster

These are research recommendations, not adopted defaults or authorization to execute every comparison.

| Question | Proposed candidates | What a useful result would establish |
| --- | --- | --- |
| Which hosted dialogue model merits a deeper trial? | Current generator; DeepSeek V4.1 Flash; GLM 5.3 Flash; Gemini 3.8 Flash | Useful, brief, grounded replies at measured whole-turn cost and latency |
| Does roleplay tuning improve a capable base? | Stock Gemma 4 26B A4B versus Orion; stock Gemma 4 31B versus Artemis | Better character fidelity without losing evidence fidelity or action reliability |
| What works at a smaller local footprint? | Qwen3.5 4B/9B and Rocinante-X 12B | A viable quality/latency/memory tradeoff on an identified host, not a zero-cost inference assumption |
| Do common alternatives reveal a missed quality dimension? | DeepSeek V3.2, Nemotron 3 Ultra, Claude Opus 5.5; optional Magidonia/Skyfall | An adoption-informed reference or a specific useful failure contrast |
| Is bounded decision scoring better served separately? | Existing decision route, Kev and the compact general-model baseline | Accurate selections and abstentions using equivalent permitted evidence |

Start with a small screening set, then spend the bulk of the evaluation on survivors. Preserve the separate stock-versus-HauhauCS 12B comparison when investigating refusal behavior specifically; changing many unrelated variables cannot isolate that question.

Use the existing episode evaluation rather than create another benchmark backlog: action-state truth, uncertainty, private knowledge, character continuity, voluntary disagreement, short dialogue, delayed memory, supported tool arguments, and real stopping/cancellation. Measure time to useful committed action and first useful dialogue separately, including preparation, reasoning and output length. Turn voice off for the cognition comparison. Do not ask any of these text generators to compute every aim adjustment or movement step.

## 8. Coverage limits and next research

This panel combines two hosted character-chat usage views, NPC-mod maintainer guidance, selected local distribution signals, author documentation and firsthand reports. It is not a census of private Discord communities, direct Anthropic/Google usage, every local runner or all game studios. No representative Reddit consensus was established. The AI Horde live text-model endpoint could not be retrieved, so no current Horde ranking is claimed. General roleplay category pages were not used to substitute global model traffic for application-specific adoption.

Before a selected experiment, refresh exact model/provider identities and licenses; pin checkpoint, quantization, template, reasoning mode and context size. Obtain actual NPC traces rather than infer game suitability from token consumption. Reuse the [existing experiment owner](06-openlegend-applications-and-experiments.md) and [needs-design map](../../../docs/maintainers/npc-cognition-research-needs-design.md); no new policy, full design, memory service or implementation queue follows from this popularity survey.
