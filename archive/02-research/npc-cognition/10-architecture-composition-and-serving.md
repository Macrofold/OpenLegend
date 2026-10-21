# Composing NPC models, perception, actions and real-time speech

**October 20, 2026. Status: research synthesis and comparison options, not a replacement architecture or an accepted implementation design.** Read the [Kevin reconstruction](01-kevin-source-reconstruction.md), [Mantella dossier](02-mantella-and-npc-systems.md), [paper panel](03-architectures-and-papers.md) and [low-refusal investigation](09-low-refusal-character-simulation.md) for their source evidence. This document connects those findings to concrete architecture choices and additional small-model and speech candidates.

## 1. The central hypothesis

The most promising starting point is an actor-permitted native-world interface, selective model decisions and continued execution of already admitted work. We own the simulation: its current resources, physical consequences and permitted observations need not be guessed from rendered pixels. Models add interpretation, choice and expression, not world authority.

This is a recommendation to improve and qualify existing owners, not create another nervous-system service. [Current cognition work](../../../docs/maintainers/cognition-redesign.md), [agency](../../../docs/maintainers/agent-agency.md), [perception](../../../docs/maintainers/events-perception-and-reactions.md), [combat](../../../docs/maintainers/combat-and-threat-responses.md) and [intelligent simulation](../../../docs/maintainers/intelligent-simulation.md) already divide these responsibilities. Their recorded implementation and acceptance states remain unchanged.

A hypothetical resident who has chosen to walk to a visible object should not reconsider every footstep. A new blocked route, completed purpose, relevant interruption or changed relationship may warrant a new choice. That distinction must come from the existing activity and event contracts, not a fixed model timer. Kevin demonstrates the advantage of native motor execution; he does not establish that an NPC should receive unlimited permission to keep attacking. The selected OpenLegend combat choice currently grants one strike. Extending that permission is a product decision, not a performance fix.

## 2. Architecture alternatives worth comparing

| Arrangement | Potential benefit | Main risk and appropriate comparison |
| --- | --- | --- |
| Native execution, bounded decision model, separate character generator | Cheap choices can happen without waiting for prose; decisions and presentation can be diagnosed separately | Several dependent model requests can accumulate latency, or separate models can disagree about intent. Compare complete turns, not only one fast call. |
| One generative model proposes supported actions and dialogue | Shared reasoning may produce more coherent action/speech intent and reduce serial gates | Longer generation, malformed arguments and verbose reasoning can delay action. A complete independently admissible proposal still needs native validation; a token prefix is not an action. |
| Cascaded transcription, text cognition and speech synthesis | Inspectable words, replaceable components, explicit text and content-admission boundaries | End-of-turn detection and serial stages can add delay; synthesis may lose the intended tone. Overlap only stages whose inputs and publication authority are ready. |
| Direct speech-to-speech or multimodal model | May preserve prosody, interruption and conversational timing more naturally | Output can precede a reviewable transcript; delivered words, heard fragments, actions and model-internal history can diverge. This needs a selected speech/authority design, not an endpoint substitution. |
| Learned pixel/control policy with higher-level language planning | Useful when native interfaces are unavailable or low-level skills cannot be expressed well | Training/data cost, opaque mistakes and observation restrictions. It is not automatically superior to exact native mechanics in our own game. |

These are experimental arrangements, not five implementations to build. Existing [E1–E8 comparisons](06-openlegend-applications-and-experiments.md) and the [evaluation brief](11-evaluation-and-research-gates.md) define useful evidence. Select a more complex arrangement only when it addresses a demonstrated limitation.

## 3. Separate understanding a command from choosing to follow it

A small model can identify that the player requested movement without deciding whether this character wants to move. Similarly, extracting a target from a sentence is not permission to attack it. Keep the proposed meaning, the person's independent choice, the available action and the actual outcome distinct.

Two additional candidates make a broader small-model comparison concrete:

- [FunctionGemma 270M](https://huggingface.co/google/functiongemma-270m-it) is Google's specialized function-calling model; [its official description](https://deepmind.google/models/gemma/functiongemma/) emphasizes customization for constrained local applications. It may be useful for a narrow semantic-to-command task after appropriate qualification or tuning. Its card uses the Gemma license. It is not evidence that 270M parameters can replace general character judgment or dialogue.
- [LFM2.5-1.2B-Instruct](https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct) documents edge deployment, instruction/extraction/agentic uses and several inference formats. The authors warn against knowledge-intensive uses. Its default tool format is Python-like; producing that text must never mean executing generated Python. It has a custom `lfm1.0` license. Treat it as a small general comparator, not an established low-refusal NPC winner.

Keep [Kev, compact Qwen and fixed-label SetFit](03-architectures-and-papers.md#3-cheap-judgment-is-a-separate-research-axis) as distinct comparison classes. A fixed-label classifier is appropriate only when the labels are genuinely stable; dynamic offered game actions are a different problem. Native calculations should remain native. No extra classifier should be placed before every request merely because its individual inference is inexpensive.

## 4. Preserve the full chain from evidence to consequence

The proposed research trace should answer: what happened, what this person could notice, what information reached the model, what they chose, what the engine accepted, and what actually completed. That is a diagnostic view of existing records, not another writable source of truth.

| Information | Why a model needs the distinction |
| --- | --- |
| Actual own activity, pending intention and recent completed or failed outcomes | A character must not claim an attack stopped merely because they requested it, or say an item was delivered before transfer. |
| Direct observation versus another person's claim | An eloquent assertion is not a witnessed event or confirmed inventory change. |
| Current observation versus remembered last position | A once-seen opponent is not continuously visible through walls. |
| Offered exact reference versus displayed name | Similar names and visual descriptions cannot create authority over an arbitrary entity. |
| Missing evidence versus evidence of absence | Failed retrieval, an unexported object or an incomplete scan cannot prove nothing happened. |
| Character desire versus service or mechanical rejection | A denied operation should not silently rewrite the character's motivation. |

Use accepted identity and the complete required actor-permitted context. Optional retrieval can improve relevance, but prompt shortening must not remove the exact constraint being tested. Background reflection should not block immediate protection, speech or continued work, and prose should not invent the other person's consent or response.

For visual reference resolution, compare native permitted candidates first. Marking candidate objects or places can bind a model's selection to known positions without granting it hidden identity or free coordinate authority. A screenshot is a captured observation with a viewpoint and time, not omniscient world state. Kevin's use of the player's camera is a property of that mod, not an appropriate default for every OpenLegend resident.

## 5. Personality, memory and orchestration

Character cards, biographies and examples can supply a voice and tendencies. They do not need to prescribe an action sequence. The relevant experiment is whether distinct authored people preserve their values and current interests while responding to evidence, not whether each recites a colorful biography. Use the existing accepted About me/knowledge owners rather than a second parallel persona store.

Separate five meanings of learning: remembering an event, interpreting it, retrieving it later, acquiring a supported method and updating model weights. A journal or experience card is not weight training. A generated reflection is not a new witnessed fact. The [memory paper panel](03-architectures-and-papers.md#4-memory-useful-advances-without-a-second-canonical-mind) provides candidates for retrieval and consolidation, not a mandate to combine every graph, tree and codebook.

A shared scene writer can produce convincing group dialogue but is not equivalent to independent private minds. Sharing immutable common preparation or compatible prefix computation is a different optimization from exposing several characters' secrets to one generation. Test divergent knowledge, a late listener and a person who stays silent. Authoring one coherent scene may be a useful separate mode; it must not be introduced invisibly as an efficiency change to the current game.

Fine-tuning or distillation is conditional work. First establish the repeated failure, the quality of its training examples and whether a prompt, evidence or decoding repair suffices. Training-data permission, contributor consent, privacy, deletion implications and train/test contamination require review. Rejected outputs and another player's private conversations are not automatically an available training corpus. No fine-tuning pipeline or reinforcement-learning project is selected here.

## 6. Speech: component quality and semantic timing are different questions

The [voice dossier](05-realtime-voice-and-serving.md) owns the cascaded stack, expression, interruption and Breeze's non-commercial constraints. Three additional first-party candidates broaden the comparison:

| Candidate | Documented capability and terms | Research question |
| --- | --- | --- |
| [PersonaPlex 7B v1](https://huggingface.co/nvidia/personaplex-7b-v1) | Concurrent listening/speaking with separate text-persona and voice conditioning; NVIDIA Open Model License | Does direct audio improve turn-taking and stable voice without losing evidence, character constraints or reviewable publication? |
| [Qwen3-Omni 30B-A3B Instruct](https://huggingface.co/Qwen/Qwen3-Omni-30B-A3B-Instruct) | Text/image/audio/video input and streaming text/speech output; Apache-2.0 card | Can multimodal expression outperform a matched cascade for a specific encounter? It is not the same model as text-output-only Qwen variants. |
| [MiniCPM-o 4.5](https://huggingface.co/openbmb/MiniCPM-o-4_5) | Documented full-duplex and half-duplex multimodal modes; Apache-2.0 card, model-specific code | Which exact mode and runtime are usable on the intended host? Pin and review custom runtime code rather than blindly enabling remote code. |

These are documented capabilities, not independently measured latency or current OpenRouter speech endpoints. Their own model cards and runtime dependencies must be reviewed before use. A model with speech output is not necessarily capable of the same interruption behavior in every serving system.

OpenLegend's accepted growing-text design fixes an audience and retains accepted text, while semantic readers consume terminal speech. It does not implement physical speaking duration. The optional microphone proposal currently creates an editable unsent draft. Direct voice-to-action, audio-first publication and interpreting partial utterances therefore need explicit design choices through [hearing/speech](../../../docs/maintainers/hearing-and-speech.md) and [shared text streaming](../../../docs/maintainers/npc-speech-streaming.md).

An exploratory audio system must distinguish generated text, permitted published text, synthesized audio, audio actually played and what each listener could hear. Do not retrospectively treat an unplayed ending as witnessed dialogue. Voice emotion must not covertly add words or real-player pressure absent from the accepted passage. Compare text-only episodes first so delivery quality does not mask cognitive defects.

## 7. Serving choices and their tradeoffs

A developer-local checkpoint permits exact artifact experiments. Operator-hosted inference can share loaded weights across characters while keeping requests isolated. Player-local inference shifts resource use but is untrusted for shared-world authority and other people's private information. Browser-first delivery does not imply a mandatory large GPU, model download or always-on microphone. These alternatives require a selected deployment use case rather than one universal local-versus-cloud answer.

For memory sizing, count all resident weights, caches, multimodal projectors, runtime buffers, speech models and the game workload. Mixture-of-experts active parameters describe computation, not total resident weight memory. A quantized file's download size is not peak process memory. Local token generation has no API invoice but still incurs capacity, idle time, electricity and operational costs.

[vLLM's prefix caching](https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/) reuses matching-prefix computation. It does not establish that a previous decision remains correct or that private dialogue can be shared across actors. [Its structured-output documentation](https://docs.vllm.ai/en/latest/features/structured_outputs/) describes constrained choice/regex/JSON/grammar paths, with model/runtime-specific parsing requirements. Syntactic validity is not evidence truth, action feasibility or service-policy compliance.

Continuous batching can improve throughput while increasing a player's wait; speculative decoding can help one workload and compete for memory in another. Evaluate the actual runtime and workload rather than copy a tokens-per-second claim from long completions. Stable trusted prompt portions may improve cache reuse, but prompt placement cannot remove mandatory evidence or preserve obsolete privacy permissions.

For hosted comparisons, [OpenRouter's routing controls](https://openrouter.ai/docs/guides/routing/provider-selection) expose provider selection, fallback, required parameter support and data-policy filters. Record requested and actual model/provider identity, quantization when disclosed and all unsupported/unknown fields. Provider-side routing, application escalation and an SDK retry are different mechanisms. Disabling a local retry alone does not characterize the whole request path. Do not silently relax parameter requirements to obtain a successful call.

The [low-refusal dossier](09-low-refusal-character-simulation.md) records concrete Cydonia/Venice metadata ambiguity: response-format support, strict schema output and function calling must be tested separately. The same checkpoint through a different provider may have different speed, moderation and supported parameters. A hosted alias is insufficient experimental provenance.

## 8. What further evidence would change the recommendation

Measure the complete path from a meaningful event or player utterance to useful committed action and useful readable/audible expression. Separate input detection, transcription, preparation, recall, waiting, each model stage, validation, persistence, screening and delivery. Record p50 and tail behavior only with sample counts and workload; a warm isolated request cannot qualify an active town.

A worthwhile architectural change must improve a named outcome without removing actor independence, required evidence, current-state checks or the accepted content boundary. A slower but more coherent model can win; a simpler model with complete context can also win. Long-horizon character quality and knowledge boundaries need independent evaluation, not merely a fast JSON response.

The [evaluation brief](11-evaluation-and-research-gates.md) and [design-preparation map](../../../docs/maintainers/npc-cognition-research-needs-design.md) specify the comparisons and unanswered choices. This synthesis runs no models, installs no services and claims no new runtime performance. Reading consisted of the previously pinned game-source investigation plus the linked primary model cards and official serving documentation; no new source/runtime audit or benchmark replication is implied.
