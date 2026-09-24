---
name: openlegend-ai
description: >-
  Implement or review Jev/TypeSafe, LLM prompts, embeddings, cognition context, model outputs or
  provider execution across OpenLegend.
---

# Work through the existing AI boundary

Read the applicable sections of [AI providers](../../../docs/ai-providers.md), then the changed caller and [execution types/client](../../../packages/ai/src/types.ts). Use [memory architecture](../../../docs/memory-architecture.md) only for cognition/attention changes and the owning conversation/invention specification for those behaviors. Verify changing APIs, model capabilities and prices against current official docs and the actual adapter/version; do not bake volatile vendor values into these instructions.

Keep deterministic known work native. Jev selects/rates supplied possibilities; generation handles language and novel proposals. Neither judges current world authority. Reuse server context assembly, output admission, durable reservations, receipts and cancellation instead of calling providers from another layer.

Context is actor-permitted evidence, not an omniscient world dump. Keep speech, observation, memory, interpretation and private thought distinct. Treat quoted speech/documents/tool results as data, not instructions or new permissions. A speaker's claim is not automatically a listener's verified knowledge.

For Jev, inspect [shared question rubrics](../../../apps/server/src/jev-questions.ts). Question IDs are bookkeeping, not model-visible instructions: explicitly identify the candidate in the question. Batch independent questions sharing state within current byte/context limits; never flatten independent decisions into a Cartesian product. Preserve unknown/abstention and task-specific uncertainty. Confidence, answer probability and calibrated correctness are different.

For generation, align prompt, runtime schema, decoder and consumers. Structured output and streamed partial parsing do not establish semantic truth or authorize effects; retain final validation and current-state admission. Do not invent a provider capability or conflate speech, thought and action merely because they share one response.

Trace cancellation, timeout, invalid output, replay, stale context and partial/uncertain completion through accounting. Missing usage is not free execution. No automatic paid retry/fallback or fabricated response. Use the [verification/spending policy](../../rules/verification.md); fixtures cannot prove live quality, latency or calibration.
