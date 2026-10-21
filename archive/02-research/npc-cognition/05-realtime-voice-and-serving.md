# Expressive real-time voice, streaming and serving

Research date: **October 20, 2026**. Status: **documented capabilities, firsthand reports and proposed measurements; no listening panel, local inference or paid speech call performed**.

## 1. Responsiveness is a pipeline property

The relevant player experience is time from an understood utterance or meaningful event to a useful physical response and/or intelligible speech. It is not one vendor's first-token or first-audio number.

For a cascaded voice route, latency includes speech endpoint detection, transcription, context preparation, queuing, decision/target selection, generation of a usable phrase, output admission, synthesis, transport and playback buffering. Some stages can overlap; dependent ones cannot. Physical action can often begin without waiting for spoken justification. [Kevin source reconstruction](01-kevin-source-reconstruction.md), [Mantella's real-time guide](https://art-from-the-machine.github.io/Mantella/pages/real_time_npcs.html)

Record both `first useful action` and `first useful audible phrase`. Saying “hmm” immediately while the character remains inert is not equivalent to understanding the request. A model's time-to-first-byte can precede any playable audio. A fast first audio chunk followed by gaps is not a successful real-time exchange.

## 2. Voice candidates and exact limitations

| Candidate | Verified role and practical relevance | Caveat and proposed disposition |
| --- | --- | --- |
| [Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2) | Kevin's expressive reference; voice cloning/design/direction and streamed speech | Code is Apache-2.0, but weights, derivatives and self-hosted outputs are research/non-commercial under separate terms. Use only where the actual license permits; paid hosted output rights do not grant self-hosting rights. |
| [Qwen3-TTS 1.7B CustomVoice](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice) | Apache-2.0 family with preset voices and instruction-controlled delivery | CustomVoice, VoiceDesign and Base cloning are different modes. Compare the exact variant; do not promise all cloning routes accept the same expressive controls. |
| [Pocket TTS](https://huggingface.co/kyutai/pocket-tts) | Small CPU-oriented streaming/cloning candidate; current card describes browser implementations and six languages | CC BY 4.0 model card plus access/use conditions. Promising for avoiding GPU contention, but device/browser quality and lawful voice consent need qualification. |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | Small Apache-2.0 speech baseline | Useful cheap/plain-voice comparator. Do not assume arbitrary voice cloning or Kevin-level direction control. |
| [Parakeet TDT 0.6B v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3) | 600M-parameter speech recognition, extending v2's English coverage to 25 European languages | Transcription is not speaker authorization or guaranteed incremental streaming. Verify the serving wrapper and proper-noun accuracy. Kevin's documented artifact is v2 int8, not this v3 checkpoint. |
| [Moshi / Moshiko](https://huggingface.co/kyutai/moshiko-pytorch-bf16) | Full-duplex speech-text framework with parallel user/agent audio streams | An important research alternative to STT→LLM→TTS, not a drop-in replacement for committed-text evidence, tool admission or controlled multi-character output. |

The current Breeze card publishes very low warmed H100 first-audio latency and separate eager/accelerated memory requirements. Those are vendor-specific measurements, not our end-to-end results. The repository uses cached reference conditioning; such reusable preparation is worth comparing independently of voice quality. The license distinction is a material blocker to assuming the downloadable model can power a commercial OpenLegend deployment. [Breeze license section](https://huggingface.co/BreezeBlue/Breeze-TTS-2#license-and-responsible-use)

Pocket's card describes approximately 200 ms to first audio and faster-than-real-time CPU operation on a specified MacBook Air setup. These are author reports, not a guarantee across browsers or hardware. Its ability to cache a prepared voice state is a useful serving mechanism. Kokoro's small size makes it a useful baseline even if it does not win expressive preference testing; cost and intelligibility deserve measurement too.

## 3. The Qwen3-TTS serving lesson

The official Qwen family separates preset instruction-controlled voice, description-based voice design and reference-based cloning. A demonstration using one mode cannot qualify another. A controllable accent, a consistent speaker identity and emotional variation are separate qualities. [Official model card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice)

[Nari's serving implementation](https://github.com/nari-labs/nari-qwen3-tts) supports streaming audio and incremental text input. Its authors report sub-50 ms p95 first audio at ten requests/second on one H100 SXM, with a published specialized container and benchmark links. The documented hardware/software target and English testing narrow the claim. This is a promising server-side implementation to reproduce, not a consumer-GPU latency promise.

The contrasting [Hugging Face reports](04-models-local-hosted-openrouter.md#firsthand-community-evidence) include slow default local inference and inconsistent sentence prosody. These do not contradict a carefully optimized H100 result: model, runtime, batching, graph capture, hardware and workload differ. They show why benchmarking the exact deployable stack matters more than choosing a name from a leaderboard.

## 4. Cascaded speech versus native full-duplex

A **cascaded route** converts speech to text, makes the character's decision, then synthesizes approved words. It offers inspectable text, replaceable components, straightforward caption equivalence and a clean place for policy/output admission. Its weaknesses are accumulated latency, lost vocal nuance and turn-boundary errors.

A **full-duplex route** models incoming and outgoing speech concurrently. Moshi's primary description explicitly represents the two streams separately and predicts aligned text/audio. This can support interruptions and backchannels without conventional explicit turns. It does not automatically establish a faithful, screenable text transcript before every sound, independent actor knowledge or native tool safety. [Moshi card](https://huggingface.co/kyutai/moshiko-pytorch-bf16)

A **multimodal text-output model** is a third category. Gemma 4 12B and the inspected Nemotron Omni checkpoint can understand audio inputs while producing text. That is not itself a full-duplex voice generator. Such a model may reduce some transcription/interpretation boundaries but still needs an output voice and a clear acquisition contract. [Gemma](https://huggingface.co/google/gemma-4-12B-it), [Nemotron output specification](https://huggingface.co/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16)

Our initial recommendation is to measure a modular, text-grounded path first. Keep full-duplex as a bounded research arm with explicit evidence/admission questions, not a prerequisite for responsive NPCs.

## 5. What expression should and should not mean

A whisper instruction can change acoustic presentation; it should not silently change who is permitted to hear the source words. A fearful voice can express a chosen outward performance without certifying a private fear value. Conversely, a source-linked private feeling need not force an audible emotional monologue.

A proposed expression layer may supply limited delivery intent alongside exact words: quiet, emphatic, hesitant, amused or exhausted, where the selected voice system supports it. This is an experiment hypothesis, not a newly selected schema. Avoid another large model call just to decide whether to add a laugh. Compare delivery selected within the original generation against a separate prosody step at equal quality and full cost.

Do not let an autonomous voice model paraphrase authoritative facts, add a promise, invent another speaker's words or narrate an unperformed action. Evaluate exact lexical fidelity, names/numbers, unwanted extra sounds, accent drift and sentence-to-sentence identity. Generated delivery metadata is not permission to change native world state.

## 6. Streaming and interruption hazards

Sentence-sized streaming can overlap generation and synthesis. Smaller chunks reduce startup delay but can lose phrasing and context. Larger chunks may sound better but increase time before the player hears anything. Retain stable voice conditioning and test boundaries around abbreviations, names, numbers, punctuation, short answers and unfinished sentences.

Separate stopping playback from cancelling generation and from undoing an already committed action. Hearing “stop” after a strike committed cannot rewind the strike. A cancelled model request may still incur charges or emit late chunks. Use the existing source/attempt ownership and authority fences; do not introduce a new speech-specific duplicate-spend path.

An interrupted suffix must not later reappear in captions, memory or a reconnect queue as though it was spoken. Already heard words cannot be erased by cancellation. Multi-character voice scheduling needs fair, bounded playback and stale-content handling, not a growing backlog that eventually voices obsolete combat callouts.

## 7. OpenLegend's existing boundaries are stricter than these demos

The selected [NST design](../../../docs/maintainers/npc-speech-streaming.md) concerns **shared growing public text**, durable accepted prefixes, a fixed initial audience and terminal semantic intake. It does not select physical speaking duration or audio. The [HE07 voice work](../../../docs/maintainers/hearing-and-speech.md#he07--optional-speech-media-and-selected-hearing-extensions) owns optional media, microphone composition and later timed/raw voice. This research closes no runtime checkbox.

In particular:

- The selected microphone proposal yields a **private editable unsent draft**. Kevin's direct microphone-to-action behavior is a different interaction policy. Enabling direct voice commands needs an explicit future decision about recognition errors, confirmation, interruption and player authority.
- Synthesize only words the recipient may receive. Sending a full secret utterance and reducing its volume is not equivalent to sending only an authorized partial fragment. Unknown identity should not be revealed by a recognizable cloned voice without a selected recognition policy.
- Output checks must precede player exposure, including early streamed audio. A character/persona or local checkpoint cannot bypass the [service safety contract](../../../docs/agent-content-and-companion-safety.md). Text-only fallback must remain a useful experience.

The human's microphone, NPC audio and in-game prerecorded speech also need distinct source attribution. Prevent generated speech from being transcribed back as a new human instruction through acoustic feedback. Endpointing, echo handling and speaker/target ambiguity need their own measurements; a voice-activity detector does not solve all three.

## 8. Serving configuration and accounting

Keep model workers warm where useful, cache lawful reference conditioning and profile kernel/graph optimizations separately. Measure peak and steady memory with the LLM, decision model, STT, TTS and rendering active together. A fast isolated TTS measurement may collapse under concurrent prefill or another actor's synthesis.

For hosted media, include audio duration, character/token units, transport/egress, retained clips, failed/uncertain generation and idle capacity. For local media, include CPU/GPU load, power and interference with frame pacing. Do not manufacture a separate model process or permanent audio cache for every NPC.

The first useful test is a small actual exchange with typed and audio participants receiving equivalent permitted words. Then test overlapping speakers, silence, interruption, a moving listener, reconnect, output-off, name correction and provider failure. Timed doorway hearing and raw human voice remain separately selected extensions; they are not prerequisites for optional playback of already committed permitted text.

## 9. Proposed comparison outputs

Retain a versioned corpus of permitted character lines covering quiet speech, urgency, dry humor, disagreement, names, numbers and ambiguity, plus actual live episodes. Use lawful reference voices and document provenance. Compare neutral baseline, expressive generation and native full-duplex only where each route is permitted.

Report first useful audio p50/p95/p99, time to full line, underruns, interruption delay, lexical error, intelligibility, perceived character consistency, expression appropriateness, GPU/CPU contention and complete spend. Blind voice preference alone cannot establish better cognition. A screenshot of a waveform or a vendor leaderboard cannot establish practical quality in OpenLegend.
