# Models, local serving, less-restrictive checkpoints and OpenRouter

Checked **October 20, 2026**. Availability, pricing, licenses and runtime support are dated observations. No model was downloaded, served, benchmarked or called through a paid API in this investigation. Recommendations below are proposed experiment choices, not selected production providers.

## 1. Select by responsibility, not one universal NPC model

A router, a character writer, a visual interpreter, a transcription model and a voice generator solve different problems. A small specialist may be excellent at choosing from supplied options and incapable of writing a sentence. A roleplay model may be entertaining but poor at tool arguments or respecting evidence. A multimodal model that understands audio may still output only text.

The most useful first experiment set is deliberately small: current OpenLegend baseline; Kev-4B for bounded decisions; a compact general instruct model; stock Gemma 4 12B Instruct versus the exact Kevin modification; and one hosted larger Gemma comparison. Keep voice off for the first cognition comparison so delivery does not disguise decision quality.

## 2. Concrete cognition candidates

| Candidate | Evidence and role | Proposed experiment and main caveat |
| --- | --- | --- |
| Current OpenLegend routes | Existing Jev/decision, generation and separately admitted stronger-route contracts | Preserve as the baseline. Do not replace selected routes merely because a demo is appealing. |
| [Kev-4B](https://huggingface.co/jaredpalmer/kev-4b) / [GGUF](https://huggingface.co/ggml-org/Kev-4B-GGUF) | Apache-2.0 decision model using a Qwen3.5-4B backbone, LoRA and pointer head; prefill-only typed scoring | First local decision comparator. Preserve source/version/choice semantics and calibrate on game evidence. It cannot generate dialogue. |
| [Qwen3.5-4B](https://huggingface.co/Qwen/Qwen3.5-4B) | Official Apache-2.0 multimodal generative checkpoint | Compact local control/generation baseline. Test the actual instruct template and thinking setting; do not confuse it with `-Base` or Kev. |
| [Gemma 4 12B Instruct](https://huggingface.co/google/gemma-4-12B-it) | Official Apache-2.0 text/image/audio/video-understanding model with text output | Stock local baseline for character dialogue and selected visual grounding. Use an instruction-tuned artifact, not the pretraining checkpoint. |
| [HauhauCS Gemma4-12B QAT Balanced](https://huggingface.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced) | Exact family named by m8, served there as Q4_K_M with its matching projector | Matched stock-versus-modification comparison, including permitted conflict and false refusals. The card's `gemma` license metadata differs from the upstream card's Apache label; resolve artifact terms rather than assuming equivalence. |
| [Hermes 4 14B](https://huggingface.co/NousResearch/Hermes-4-14B) | Nous's Apache-2.0 Qwen3-based hybrid reasoning/steerable instruction model with tool/structured-output support | Optional roleplay/steerability comparator after the initial panel. A 2025 release is not automatically the current best model. |
| [Gemma 4 26B A4B](https://openrouter.ai/google/gemma-4-26b-a4b-it) | Hosted mixture-of-experts comparison with a published provider table | Test whether a larger model with few active experts improves whole-episode quality at acceptable latency. Active parameters do not equal total resident weights. |
| [Gemma 4 31B](https://openrouter.ai/google/gemma-4-31b-it) | Hosted dense multimodal comparison with several provider options | Higher-capacity baseline; provider, quantization and parameters must be pinned when comparing. |
| [Nemotron 3 Nano Omni 30B-A3B](https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16) | Official unified text/image/audio/video-input model; output is text, with structured/tool support | Exploratory multimodal context comparison, not an audio speaker or required replacement for the native perception pipeline. Review NVIDIA's model license and full memory footprint. |

The [NVIDIA technical article](https://developer.nvidia.com/blog/nvidia-nemotron-3-nano-omni-powers-multimodal-agent-reasoning-in-a-single-efficient-open-model/) is dated April 28, 2026. Its throughput advantages concern specified multimodal workloads; they are not measurements of independent NPC lives. The [voice dossier](05-realtime-voice-and-serving.md) owns speech-specific candidates.

## 3. What Kev changes, and what it does not

The first-party card describes typed Choice, Score and Noul questions over shared state, with a single forward scoring process rather than generated explanation tokens. Questions are answered independently; dependent reasoning still needs the application to supply the right subsequent state. Training states and the validated context are shorter than the largest advertised serving allowance. A generated confidence distribution can be miscalibrated on OpenLegend's domain even when calibrated on the author's evaluation. [Primary card](https://huggingface.co/jaredpalmer/kev-4b)

The [GGUF publication](https://huggingface.co/ggml-org/Kev-4B-GGUF) lists Q4_K_M around 3.03 GB and Q8_0 around 4.48 GB. These are artifact sizes, not complete process/GPU requirements. The special decision endpoint requires a compatible runtime; an autogenerated generic Hugging Face chat snippet is not sufficient evidence that the System One path works.

The game author calls Kev a small Jev spin-off. Treat that as a functional analogy, not a model lineage claim. Similar endpoint shapes do not establish identical probability semantics, calibration, option-order behavior or maximum useful context. Preserve current OpenLegend raw-score handling unless a separately qualified provider contract requires otherwise.

Good first comparisons are action relevance, supplied-choice suitability, source-linked appraisal options and escalation eligibility. Poor uses are exact arithmetic, line-of-sight calculation, inventory authority, creating new dialogue or inventing an unsupported action. Native rules should continue calculating deterministic facts.

## 4. Current OpenRouter findings

“Listed” means a public catalogue page was retrieved; “provider table observed” is stronger but still does not prove this account's credentials, routing filters, exact schema or latency. An inaccessible guessed slug does not prove a model is absent from the entire service.

| Exact identifier or artifact | Observed status | What can reasonably be tried later |
| --- | --- | --- |
| `jaredpalmer/kev-4b` | **Listing and provider table observed.** 8,192-token context; $0.042 per million input tokens and $0 output. The page describes the System One contract. | Verify actual typed endpoint/adapter, billed input, provider and failure semantics before a capped comparison. This is not ordinary free-form chat generation. |
| `google/gemma-4-26b-a4b-it` | **Listing and provider table observed.** Headline $0.042 input / $0.22 output per million tokens; individual provider rates differ. | Hosted general-model baseline with explicitly supported tools/schema and selected thinking mode. |
| `google/gemma-4-31b-it` | **Listing and provider table observed.** Headline $0.10 input / $0.34 output per million tokens; individual provider rates differ. | Larger hosted comparison; the lowest price and lowest latency need not come from the same provider. |
| Exact HauhauCS 12B modification | Hugging Face weights verified; **an exact OpenRouter route was not established**. | Run a controlled local artifact or find a provider explicitly serving the same revision; do not substitute stock Gemma and call it identical. |
| Stock Gemma 4 12B Instruct | Official HF checkpoint verified; attempted OpenRouter 12B slugs did not establish a usable listing. | Treat OpenRouter availability as unresolved, not a confirmed absence. The verified 26B/31B routes are different models. |
| `nousresearch/hermes-4-70b` | Catalogue page retrieved, but the retrieved page did not expose an active provider/price table. | Catalogue existence alone is insufficient for a runnable recommendation. It is also not Hermes 4 14B. |
| Hermes 4 14B | HF weights verified; exact OpenRouter availability not established by the attempted page. | Local comparator or independently verified hosting, not a promised OpenRouter route. |
| Breeze, Parakeet, Qwen3-TTS, Pocket TTS, Kokoro | Primary local/model-service documentation verified; exact OpenRouter speech routes not established here. | Use the appropriate speech service/adapter where qualified. Do not assume a text-model catalogue exposes every model or modality. |

Sources: [Kev](https://openrouter.ai/jaredpalmer/kev-4b), [26B A4B](https://openrouter.ai/google/gemma-4-26b-a4b-it), [31B](https://openrouter.ai/google/gemma-4-31b-it), [Hermes catalogue](https://openrouter.ai/nousresearch/hermes-4-70b). Prices are public reference values checked on the research date, not a binding quote or measured project spend.

## 5. “Uncensored” is not a technical requirement for believable characters

Open weights, local deployment, permissive licensing, reduced refusal behavior, mature fictional content and unrestricted harmful output are separate properties. A model can be local and restrictive, hosted and expressive, open-weight and non-commercial, or fluent in profanity while unreliable at tools.

The video demonstrates that one modified model can produce profanity and fictional antagonism. It does not demonstrate that stock models universally refuse legitimate fictional fighting, nor that removing refusals improves memory, planning, instruction priority or model calibration. Reproducing the video's real-world harmful-instruction demonstration is not necessary to test a companion.

For OpenLegend, compare the actual desired behaviors: a rude antagonist, a warm friend, a skeptical witness, voluntary refusal of a player order, fictional threats to an avatar, non-graphic adult romance and disagreement that survives persuasion. Also test whether each model respects hidden information, native action limits and the existing service boundary. Count unnecessary refusals and unsafe/inappropriate outputs separately.

The existing [content and companion-safety contract](../../../docs/agent-content-and-companion-safety.md) permits mature non-graphic storytelling and requires shared trusted instructions and qualified output admission. This investigation changes none of it. A permissive checkpoint increases the importance of product-level validation; a stock model's default refusal behavior is not a substitute for those controls either.

Do not choose a checkpoint solely on an “uncensored” label. Prefer the one that preserves character intent, evidence and legitimate freedom most reliably at the actual whole cost. A same-family controlled comparison is much more informative than comparing one weak stock model with an unrelated larger fine-tune.

## 6. Firsthand community evidence

These are reports by implementers/users, not controlled independent benchmarks or a representative consensus. Their dates and caveats matter.

- **HauhauCS compatibility:** in [discussion 6](https://huggingface.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced/discussions/6), a June 26 user reports that speculative/MTP support did not activate in LM Studio. The model owner says direct llama.cpp was the tested path; later replies mention other wrappers. This establishes a concrete compatibility concern, not that speculation is impossible. Pin runtime/build and measure actual accepted draft tokens rather than assuming a supplied draft file is being used.
- **Fine-tune freshness:** [discussion 10](https://huggingface.co/HauhauCS/Gemma4-12B-QAT-Uncensored-HauhauCS-Balanced/discussions/10), opened August 24, asks whether upstream changes will be incorporated. It does not establish that they were incorporated or independently verify the reported upstream update. Check ancestry and artifact hashes before attributing quality to censorship removal.
- **Qwen3-TTS slow local execution:** [discussion 18](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice/discussions/18) contains January/February reports of slow generation, low GPU use and inconsistent sentence delivery. The opening post inconsistently names another model in its environment, so it is unsuitable as a clean performance number. Later users independently report configuration-specific problems. This motivates an exact local reproduction, not a blanket rejection of Qwen3-TTS.
- **A newer optimized server:** [discussion 56](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice/discussions/56), August 20, links the authors' [Nari implementation](https://github.com/nari-labs/nari-qwen3-tts). Its reported low first-audio latency at substantial request rates uses a single H100 SXM and specialized serving. It is not evidence that the same numbers hold on the creator's consumer GPU or our browser client.
- **Cloning versus emotional instructions:** [discussion 38](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice/discussions/38) reports that instructions passed to the Base cloning route did not behave like CustomVoice controls. The useful lesson is to test the exact voice mode, not assume all similarly named models accept identical emotion parameters. Suggested fine-tuning remedies in the thread remain user suggestions, not established fixes.

These reports directly answer the request to look beyond polished demos. They reveal that serving implementation, model variant and voice conditioning can dominate the result attributed to a model name.

## 7. Local, hosted and hybrid execution

**Developer workstation:** useful for exact checkpoint experiments, private traces and warm-latency profiling. Requires enough memory for all concurrent models, cache, projector and game. Do not infer production cost from already-owned hardware being treated as free.

**Operator-hosted inference:** amortizes loaded weights across actors/worlds and can centralize budgets and provenance. It introduces queuing, capacity, failover and operational work. One actor per model process is not necessary, but requests and memory must remain isolated.

**Player-local inference:** may offload cost and support a private single-player offering. It is not trusted authority for shared-world effects or other players' private information. Availability, hardware variation, tab lifecycle, model downloads and compromised clients need a separately selected product/deployment design. OpenLegend's browser-first direction is not a decision to require a 32 GB GPU.

**Hybrid:** local STT/TTS or bounded judgment with hosted difficult reasoning is plausible. Measure round trips, context transfer and data policy. The hosted fallback must remain an explicitly admitted route, not an automatic second paid request whenever a local result is inconvenient.

## 8. Illustrative economics: cadence can overwhelm cheap tokens

Use `calls × input tokens × input price / 1,000,000`, plus output, reasoning, audio, retrieval, maintenance and operational costs. The following is arithmetic, not a forecast: 2,000 billed input tokens per Kev call at the dated $0.042/M rate, with no other work.

| Assumed calls per NPC | Calls per real hour | Judgment cost per NPC-hour | 100 NPCs per real hour |
| --- | --- | --- | --- |
| Two each second | 7,200 | $0.60480 | $60.480 |
| One each ten seconds | 360 | $0.03024 | $3.024 |
| One each minute | 60 | $0.00504 | $0.504 |

These are assumed average rates, not recommended timers. Event-driven systems should perform no redundant judgment for unchanged continuing work. A complex event can still buy multiple calls. Request limits and long prompts can bind before token expenditure does.

For self-hosting, include amortized hardware, idle capacity, electricity, hosting, operations, upgrades and failure reserves, divided by useful serviced workload. Compare a full episode at matched quality, not a local token price of zero against a hosted invoice. Model caching saves preparation only where the actual runtime reuses it; it does not make changed state or generated output free.

## 9. Proposed first panel and graduation criteria

Start with a replay-only decision comparison: current provider versus Kev local Q8 and one lower-memory quantization, preserving every relevant input and available choice. Add the compact general generator only to test whether specialist scoring provides a real advantage. Use existing benchmark results as developmental evidence and reserve new natural held-out cases.

For dialogue, compare stock Gemma 4 12B Instruct with the exact HauhauCS artifact under matched quantization/context, then one verified hosted larger model. Include quiet, unfriendly and mistaken characters, delayed callbacks and actual action failures. Measure character consistency separately from obedience, swear-word frequency, response length and apparent enthusiasm.

Promote a model only after exact API/schema support, complete pricing/provenance, actor isolation, useful quality, unacceptable-error handling and end-to-end latency are demonstrated. Licence review, hosted terms and current service rules remain gates. No comparison or promotion was executed here.
