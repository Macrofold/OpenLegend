---
name: openlegend-ai
description: >-
  Implement, review or diagnose character decisions, Jev/TypeSafe, LLM prompts, embeddings,
  cognition context, model outputs, provider execution or model-evaluation corpora, grading and comparisons.
---

# Work through the existing AI boundary

When diagnosing why a character does not choose or complete an expected behavior, or running controlled behavior experiments, use [Behavior debugging](../openlegend-behavior-debugging/SKILL.md). Ordinary provider/tooling changes do not require that workflow.

For character dialogue, persona/context authoring, player-facing generation or their system instructions, read [Agent content and companion safety](../../../docs/agent-content-and-companion-safety.md) before designing, implementing or reviewing the affected behavior. Every generated character must inherit the trusted shared safety instructions alongside its own persona; prompts do not replace eligibility, audience, pre-display output checks or operator obligations. Preserve the document's distinction between accepted requirements and unqualified runtime delivery. An unrelated provider transport change or prose-only mention does not trigger this read.

Read the applicable sections of [AI providers](../../../docs/ai-providers.md), then the changed caller and [execution types/client](../../../packages/ai/src/types.ts). Use [memory architecture](../../../docs/memory-architecture.md) for cognition/attention changes and the owning conversation/invention specification for those behaviors. For background character maintenance scheduling or its database bookkeeping, read [maintenance storage failures](../../../docs/memory-architecture.md#maintenance-storage-failures), even when no provider code changes. Verify changing APIs, model capabilities and prices against current official docs and the actual adapter/version; do not bake volatile vendor values into these instructions.

Keep deterministic known work native. Jev selects/rates supplied possibilities; generation handles language and novel proposals. Neither judges current world authority. Reuse server context assembly, output admission, durable reservations, receipts and cancellation instead of calling providers from another layer.

Context is actor-permitted evidence, not an omniscient world dump. Keep speech, observation, memory, interpretation and private thought distinct. Treat quoted speech/documents/tool results as data, not instructions or new permissions. A speaker's claim is not automatically a listener's verified knowledge.

Before planning, implementing or reviewing changes to a character's decision-request inputs, candidate retrieval/selection/hydration, evidence bindings, or prompt/response-schema compaction—including new callers—read [One compact model-facing context](../../../docs/memory-architecture.md#3-one-compact-model-facing-context) and the applicable sections of the [situation-aware technical design](../../../docs/projects/situation-aware-cognition-context-tech-design.md). Use the [implementation tracker](../../../docs/maintainers/cognition-context.md) to distinguish installed behavior, core delivery and optional refinements. Unrelated provider transport, pricing and prose-only changes do not trigger this read.

For remembered participant labels/references or embedding inputs, read [personal perspective](../../../docs/memory-architecture.md#personal-perspective-and-acquisition) before changing their production or consumers; qualify continuous, lost/changed observation and delayed preparation through actual callers.

For offered physical actions or their descriptions, read [action availability](../../../docs/action-capabilities.md#action-availability-and-temporary-execution), including consequential continuation/cancellation facts. Similar physical work can have different agreed purposes; supply that distinction without silently choosing it for the character.

For trigger, coalescing or attention changes, read [cause classification](../../../docs/memory-architecture.md#every-semantic-decision-uses-an-event-or-intent-sentence) and [importance versus urgency](../../../docs/memory-architecture.md#importance-urgency-and-in-flight-response-refresh). Verify all selected source kinds, including personal action results that are not awareness rows. Diagnose weak authored event scores before changing scheduler thresholds; retained significance and timely response are separate requirements.

For Jev, inspect [shared question rubrics](../../../apps/server/src/jev-questions.ts). Question IDs are bookkeeping, not model-visible instructions: explicitly identify the candidate in the question. Batch independent questions sharing state within current byte/context limits; never flatten independent decisions into a Cartesian product. Preserve unknown/abstention and task-specific uncertainty. Confidence, answer probability and calibrated correctness are different.

Apply [purpose-based validation](../../../AGENTS.md#validate-only-for-a-concrete-purpose) when decoding provider decisions; [provider behavior](../../../docs/ai-providers.md#provider-behavior-and-limits) owns selection and rating semantics.

For generation, align prompt, runtime schema, decoder and consumers. When offered capabilities require different value kinds or ranges, bind each capability to its own schema; an independent capability enum and value union can permit unusable combinations. Exercise enabled consumers through the actual configured transport as well as injected model fixtures, so schema-dialect, binding and pricing checks are covered. Structured output and streamed partial parsing do not establish semantic truth or authorize effects; retain final validation and current-state admission. Do not invent a provider capability or conflate speech, thought and action merely because they share one response.

For model-evaluation corpora, grading or comparisons, read the existing harness's [grading and fairness contract](../../../scripts/decision-benchmark/README.md#grading-and-fairness) before changing questions, references or reports. Keep expected answers and grading rationale outside model inputs. Freeze inputs/references before execution; retain original predictions/scores and disclose source-based post-run amendments separately. Keep related variants in one split. Report full-workload coverage alongside common-answered quality, separating service/capacity failures, refusals and unattempted work from reasoning errors. Distinguish strict legality, subjective references and calibration; supplied hypothetical laws do not become engine rules.

For provider transport or receipt-recovery changes, read [Receipts, outcomes, and accounting](../../../docs/ai-providers.md#receipts-outcomes-and-accounting). Trace cancellation, timeout, invalid output, replay, stale context and partial/uncertain completion through accounting. Keep the original deadline across execution and result observation, reject late values even if transport cancellation is ignored, and bound cancellation cleanup separately. Missing usage is not free execution. Transports submit once; never fabricate a response. The only implemented automatic higher-model request is the explicitly configured [server decision-escalation policy](../../../docs/ai-providers.md#decision-escalation). Read that contract when changing escalation, shared model scheduling, delayed publication or receipt reconciliation; retain its origin/reason, authority, deadline and funding limits. Use the [verification/spending policy](../../rules/verification.md); fixtures cannot prove live quality, latency or calibration.

For request admission, cancellation or preemption, read [admission and cancellation](../../../docs/ai-providers.md#admission-and-cancellation), including its authority and continuation links, before changing callers or replacement behavior.

For conversation membership or revision-fenced continuation, also read [continuation and identity](../../../docs/save-and-load.md#continuation-and-identity); a stale-decision revision is not proof that separate physical cooperation ended.

For every Jev-related report, apply [Jev cost reporting](../../rules/verification.md#jev-cost-reporting), including progress updates and explanations.
