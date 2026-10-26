# Context, memory and serving capacity

**Research reviewed October 25, 2026.** This guide explains how to turn the [model hosting records](hosting-matrix.md) into a bounded deployment proposal. It contains no measured Open Legend model capacity. The [Runpod workflow](runpod-hosting.md) owns platform setup; [MX06](../../docs/maintainers/custom-models.md#mx06--production-contract-recovery-and-operating-acceptance) owns later operating qualification.

## Five different limits must remain separate

| Limit                            | What it establishes                                                                                | What to record                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Published model capability       | The publisher's supported or evaluated sequence length, sometimes with a special extension recipe. | Exact artifact, native length, extension method and evidence scope. Parent-model evidence stays labeled as parent evidence.   |
| Artifact configuration           | Values such as `max_position_embeddings` in a particular configuration file.                       | Exact source revision and field. A serialization value alone is not a quality result or a deployed allowance.                 |
| Runtime configuration            | What the selected engine and wrapper actually permit and allocate.                                 | Image digest, engine version, tokenizer/template, configured total context, output cap, batch/concurrency and cache settings. |
| Transport and application limits | What the endpoint and game admit: bytes, time, audio duration, output allowance or question count. | Every applicable cap and its units, protocol and enforcement point.                                                           |
| Qualified operating capacity     | What this exact deployment completed under a stated workload.                                      | Full serialized request count, peak VRAM/RAM, concurrency, delay, failure/recovery outcomes and actual charges.               |

Increasing GPU memory can make a supported configuration practical. It does not automatically change a server flag, a model's supported positions, an API output cap, or the game caller's limits. Likewise, successfully loading weights says nothing yet about the largest usable request. vLLM explicitly defines its model length as prompt plus output and derives an unspecified value from model configuration; current releases also expose automatic memory-based sizing. Pin the version and explicit settings instead of depending on a moving default. [RPH027](https://docs.vllm.ai/en/latest/configuration/engine_args/)

### What the Kev/Huihui statement establishes

The earlier conversation reports that full game requests failed a preflight fit check and were not submitted, while smaller requests had previously returned answers. **That is not an inference result for the full scenarios, a model refusal, or a verified maximum context.** This research did not recover the original serialized requests, tokenizer counts, serving limits or preflight log. Their precise sizes and limits remain unknown; the catalogue's deployment measurements remain null.

The [current operator guide](../../docs/live-ai-setup.md#discover-and-authorize-a-current-service) identifies two particular sources:

| Intended route   | Exact identity                                                                                                                       | How to interpret it                                                                                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native judgments | `jaredpalmer/kev-4b@6cfce5c2fa4b4bd64026336ab649c5ca78857d52`, using `Qwen/Qwen3.5-4B-Base@1001bb4d826a52d1f399e183466143f4da7b741b` | A native supplied-question model, with its own head/base/runtime recipe and protocol. Ordinary chat context/output assumptions do not describe the whole interface. See the [Kev family record](decision-models.md#decision-kev-canonical). |
| Chat replies     | `huihui-ai/Huihui-Qwen3-4B-abliterated-v2@a494c65b10bf8fdc56c0ff11d36987c1d018f162`                                                  | This is the pinned 4B derivative, distinct from the catalogue's Huihui Qwen3.8 27B and Flash Next entries. See [RP35](character-models.md#rp35) for the distinction between its config value and parent context claims.                     |

A model repository commit, container image digest and Macrofold serving-revision UUID identify different things. Preserve all three when available. Earlier upstream inference or a qualified native image does not establish current game-key access, a qualified managed chat image, the full scenario's fit, or useful character behavior.

For the pinned Huihui 4B specifically, its [exact config](https://huggingface.co/huihui-ai/Huihui-Qwen3-4B-abliterated-v2/blob/a494c65b10bf8fdc56c0ff11d36987c1d018f162/config.json) contains **40,960 positions**, while the [official Qwen3-4B parent card](https://huggingface.co/Qwen/Qwen3-4B) states **32,768 native tokens** and **131,072 with YaRN extension**. Those three numbers have different scopes. None recovers the prior endpoint's actual configured limit, and the parent extension is not a demonstrated long-context result for this derivative.

## Count the request that actually reaches the model

For an ordinary autoregressive chat route, use:

```text
serialized input tokens + reserved generation tokens <= configured total context
reserved generation tokens <= endpoint output cap and caller output allowance
```

The serialized input includes system instructions, character identity, permitted memories, perceived surroundings, available actions, tool/schema definitions, history, chat-template markers and any inserted generation prefix. Count using the exact tokenizer and template used by that serving revision. Counting only the player's sentence, using a generic characters-per-token ratio, or counting an earlier prompt version does not establish fit. Hugging Face documents model-specific chat templates and warns that adding special tokens again can duplicate them. [RPH029](https://huggingface.co/docs/transformers/chat_templating)

Also pin the model's generation configuration and the engine's policy for loading or overriding it. Current vLLM documentation says `--generation-config auto` loads the model configuration, where `max_new_tokens` can impose a server-wide output ceiling. `--generation-config vllm` and explicit overrides have different behavior. A surprisingly small output allowance can therefore come from generation configuration even when the total context is large. [RPH027](https://docs.vllm.ai/en/latest/configuration/engine_args/)

**Illustration, not a recovered scenario:** a configured 8,192-token window with a 1,024-token response reservation permits at most 7,168 input tokens before any additional caller margin. A 7,600-token input fails that reservation even though it is below 8,192. If reasoning consumes the same generation allowance, a short visible answer can still exhaust it. Record the selected model's reasoning semantics; do not assume all APIs account identically.

For native selectors, count the actual state, named questions, choices and protocol-specific special tokens using the native recipe. Some selectors use a prefill-only forward pass and prediction heads instead of generating a chat answer. Their input capacity, maximum questions/choices, output structure and activation memory still matter; a tiny response is not evidence of tiny computation. The owning [decision profiles](decision-models.md) retain those differences.

For speech, keep text characters, UTF-8 bytes, phonemes, text tokens, audio tokens, input seconds, reference seconds, output seconds, sample rate and channel count in their original units. A model trained on 40-second examples has not thereby acquired a documented hard 40-second API cap. A 510-phoneme internal chunk is not a 510-character request limit. Unknown limits remain unknown.

### When a request will not fit

Resolve the limiting layer before changing the hardware. If the runtime was deliberately capped below a supported model length, a larger configured length may be an option after memory sizing. If the application supplied unnecessary material, use its existing permitted-context owner to select relevant information. If the role requires more context than that exact model supports, select a suitable variant or route.

Any context reduction must preserve identity, current task, relevant evidence, available choices and uncertainty needed for that decision. Do not silently discard decisive information or give a smaller model less essential evidence and interpret the resulting behavior as a fair model comparison. Summaries and retrieval can help, but they introduce their own omissions, latency and cost. This research does not change the game's context policy or implement a new memory system.

## GPU memory is more than weights

The following are idealized arithmetic examples in **decimal GB**, using total parameter count. They exclude quantization scales, padding, higher-precision tensors, adapters, cache, runtime allocations and auxiliary models.

| Total parameters | BF16/FP16, 2 bytes | 8-bit, 1 byte | 4-bit, 0.5 bytes |
| ---------------- | ------------------ | ------------- | ---------------- |
| 4B               | 8 GB               | 4 GB          | 2 GB             |
| 8B               | 16 GB              | 8 GB          | 4 GB             |
| 27B              | 54 GB              | 27 GB         | 13.5 GB          |
| 70B              | 140 GB             | 70 GB         | 35 GB            |
| 120B             | 240 GB             | 120 GB        | 60 GB            |

One GiB is 1,073,741,824 bytes; one GB is 1,000,000,000 bytes. Preserve publisher units and normalize only with an explicit conversion. A nominal 24GB offering and a reported 24GiB process allocation are not interchangeable evidence. A mixed-precision or quantized artifact's actual selected files are better storage evidence than multiplying its model name by nominal bits.

Plan VRAM as the sum of **resident weights + attention/recurrent state + peak activations/workspace + runtime and graph allocations + co-resident components + explicit headroom**. These terms change with engine, kernel, input length, batch, modalities and precision. Publisher peak measurements apply to their complete stated recipe; a weights-only figure cannot establish a full-process fit. CUDA graphs and multimodal processing can add memory beyond weights; vLLM's memory guide describes these costs and the effect of shorter context and smaller batches. [RPH026](https://docs.vllm.ai/en/latest/configuration/conserving_memory/)

For a mixture-of-experts model, **total parameters** determine stored weights. Active parameters describe the subset used in computation; they are not the downloadable size. Adapter-only repositories require the exact base and potentially a separate conversion/merge step. Speech pipelines may also load a codec, vocoder, speaker encoder, ASR model or text-normalization model. The [voice records](voice-models.md) identify known components and external-service dependencies.

### Attention cache: a useful bounded calculation

For a conventional decoder that retains full-attention keys and values, an idealized cache size is:

```text
KV bytes = 2 × layers × KV heads × head dimension × bytes per value
           × sum of retained tokens across simultaneous sequences
```

The factor two represents keys and values. Grouped-query attention uses the number of **KV heads**, not all query heads. As arithmetic only, 32 layers × 8 KV heads × 128 dimensions × two-byte values yields 131,072 bytes per retained token: about 1GiB at 8,192 tokens for one sequence, 4GiB for four equally long sequences. Padding, block allocation, sharing and runtime overhead change actual allocations.

Do not apply this formula unchanged to MLA, sliding-window attention, hybrid linear/recurrent models, encoder-decoder speech systems or prefill-only selectors. Their state layout and peak work differ. Prefix caching can reduce repeated prefill work when exact prefixes match; it does not grant a larger semantic context window. Weight quantization and cache quantization are separate settings with separate kernel and quality implications. Exact support is runtime- and hardware-specific. [RPH027](https://docs.vllm.ai/en/latest/configuration/engine_args/), [RPH028](https://docs.vllm.ai/en/latest/features/quantization/)

### Multiple GPUs, replicas and offload

Several 24GB cards are not automatically one contiguous large-memory device. Tensor/pipeline/expert parallelism must be supported by the exact architecture, quantization and runtime; replicated layers, communication buffers and uneven partitions still consume memory. Record same-host topology, interconnect, per-GPU free memory and required parallelism. Multiple Serverless workers ordinarily mean multiple model replicas, not a sharded model; GPU count per worker is a different setting. Multi-node distribution needs an explicit supported deployment. [RPH018](https://docs.runpod.io/serverless/endpoints/endpoint-configurations), [RPH037](https://docs.vllm.ai/en/latest/serving/parallelism_scaling/)

CPU offload exchanges GPU residency for host memory and transfer work. It can permit loading a model but does not establish interactive latency. Retain the exact offload mode and amount in a profile; never compare it with a fully GPU-resident result as if the hardware conditions were equal. [RPH027](https://docs.vllm.ai/en/latest/configuration/engine_args/)

## Host RAM, CPU and disk must be sized independently

| Resource                 | Include in the proposal                                                                                                                              | Common mistaken inference                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Host RAM                 | Loader peak, file mappings/resident pages, unsharded or conversion copies, CPU offload, tokenizer/audio processing, workers and runtime buffers.     | “It fits in VRAM, so host RAM cannot be the problem.”                            |
| CPU                      | Concurrent tokenization, audio resampling/encoding, data loading, server processes and any CPU inference. Record offered vCPUs and effective limits. | “A GPU model does no meaningful CPU work.”                                       |
| Persistent model disk    | Selected weight shards, tokenizer/config, adapters, auxiliary weights and retained exact revisions.                                                  | “Download every file in the repository” or “the adapter size is the model size.” |
| Temporary/container disk | Image layers, package/build caches, extraction/conversion peaks, temporary audio and logs.                                                           | “The persistent volume's free space covers container startup.”                   |
| Network/storage I/O      | Initial transfer, concurrent worker reads, model-to-GPU loading and output storage.                                                                  | “Cached weights mean an instantly warm model.”                                   |

There is no credible universal host-RAM-to-VRAM ratio. A loader can read more than its final GPU shard, and an in-place quantization/conversion job can need the full source weights plus a second representation. Use a publisher requirement or explicit loading plan; otherwise keep the minimum unverified. vLLM describes sharded loading as a way to avoid each worker reading a complete checkpoint. [RPH026](https://docs.vllm.ai/en/latest/configuration/conserving_memory/)

For disk, calculate **selected artifacts + required dependencies + retained revisions + peak temporary work + operating reserve**. State whether cache files share storage or are duplicated. Hugging Face supports revision pinning and file-selection patterns; a full repository snapshot may contain mutually exclusive quantizations. Verify the selected file set and bytes before allocating a volume. [RPH030](https://huggingface.co/docs/huggingface_hub/guides/download)

## Record enough evidence to reproduce a capacity claim

The [deployment worksheet](data/deployment-record-template.json) is an unfilled record, not an executable manifest. Copy its relevant fields into the existing operating record when a deployment is selected. Keep secret **references**, never credentials. Required identity includes the model/profile ID, artifact and base revisions, exact filenames/hashes, tokenizer/template, container digest, runtime/library/CUDA versions, GPU topology, RAM/disk, protocol and relevant limits.

Record these observations separately when an authorized qualification occurs:

- Startup: image/weight transfer, host loading, GPU loading, graph compilation and readiness time; peak RAM/VRAM and free disk.
- Representative full request: caller serialization, exact token/audio counts, response reservation, admission result and any truncation. A preflight failure is a useful result, but not a generated answer.
- Warm service: time to first useful token/audio and completion; native head timing separately; successful work and failures at the stated concurrency, including queue time.
- Audible speech: reference encoding, first generated PCM, resampling/codec work, transport buffering and first audible player playback are separate timings. Preserve cancellation and interruption cleanup; model-side first audio is not the player's complete wait.
- Recovery: deadline/cancellation, stale or unavailable service, worker replacement and exact accepted-operation identity. No automatic paid retry is authorized by this document.
- Economics: active/idle/startup seconds, replica count, storage duration, actual receipts and useful completed work. Keep unknown usage and outstanding charges explicit.

These are the dimensions of the existing MX06 acceptance work, not a requirement to benchmark every catalogue entry. Broad research helps choose a small useful deployment. Qualification then establishes what that deployment can actually support. A larger context, faster token rate or lower refusal count is valuable only when it improves a compelling encounter within the game's full latency and cost budget.
