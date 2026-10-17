# OpenLegend decision API benchmark

| Status    | Current progress                                                                                                                                                          | Last updated |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Completed | The 4,000-question corpus, seven-model comparison, structured-output comparison and reusable harness are complete, with capacity and reference-quality limits documented. | 2026-10-17   |

Specification updated **2026-10-17T20:58:12Z**. The existing AI-provider, world-authority, privacy and accounting architecture was used and checked on that date. [Implementation tracking](../../maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison).

## Delivered scope

A reproducible synthetic benchmark tests character decisions against realistic permitted context: memories, plans, needs, bodily restrictions, emotional history, commitments and explicit world rules. It contains **4,000 scored questions in 724 situations**, plus **80 separate structured-generation tasks**. Related views test memory/option order, changed facts and mood; they remain grouped when interpreting evidence. Hypothetical future mechanics are labeled and never installed as universal engine policy.

The seven configurations are native Jev 1.13, Microsoft Decision 1 and Luna Decisions; ordinary Luna low, medium and high; and Muse Spark 1.3 Contributor through OpenRouter. Native APIs choose supplied alternatives or ratings. Ordinary LLMs use a strict prompt/schema to produce equivalent decisions, plus the separate generated plan/feeling/tone tasks. All generative efforts share their task prompt.

Every current question has an accepted answer or answer set. Ordered ratings select the nearest category; probabilities stay continuous. Answer points allow equally good alternatives to tie and distinguish reasonable disagreement from clear contradiction. A separate factual-error check has an explicit assessed denominator. Accuracy and points use answered questions; coverage, service failures, latency and cost remain separate. Current stock and reservations come from the engine, not reconstructed memories.

## Harness and ownership

The standalone [harness](../../../scripts/decision-benchmark/README.md) reuses typed provider adapters and production contracts where appropriate. It never runs on game startup or changes a saved world. Prompts contain no answer keys, reference rationales or grading metadata. World-specific scenarios live in authored benchmark data; adapters own execution and decoding, not game rules.

Exact input/model/prompt fingerprints, captured source and append-only private journals bind each attempt. Before dispatch, conservative reservations enforce one explicit aggregate cap across providers and prior experiments. Completed known costs release unused headroom; uncertain spending remains reserved. A single writer, durable admission and accepted Run identity prevent automatic resubmission. Offline reporting makes no model calls. Explicit new experiments retain every previous attempt and do not overwrite substantive wrong answers.

Shared bounded HTTP decoding and rate controls distinguish refusal, incomplete output, service failure and uncertain completion. Native decisions reject streaming before dispatch. Optional streamed Macrofold generation observes the same accepted Run after delivery failure, without buying another inference. Incremental journal accounting and bounded-row export avoid repeated full-history rescans and whole-document temporary strings; eager corpus construction remains an expansion limit.

## Results and completion

Jev and ordinary Luna low/medium/high each answered all 4,000 questions. Native Luna Decisions answered 3,999 and explicitly refused one. Microsoft could not fit 576 questions in 96 scene requests; Spark could not fit six questions in one scene request. All four generative configurations completed their separate eighty tasks. These capacity/refusal limits are visible rather than misreported as incorrect decisions. Every feasible unanswered request was attempted; first usable predictions were preserved for identical inputs.

The [results index](../../benchmarks/README.md) is the entry point for model selection. The [full comparison](../../verification/decision-api-benchmark.md) owns measured metrics and accounting. The [corpus audit](../../verification/decision-benchmark-audit.md) owns current construction, shortcuts, post-run reference changes and interpretation limits. [Fallback model comparisons](../../benchmarks/decision-fallback-models.md) and [runtime verification](../../verification/decision-escalation.md) are separate studies under the escalation project.

## Scope limits

This authored suite is not independent human validation, production memory-retrieval qualification or evidence of natural long-term character behavior. Subjective references include twenty-one disclosed broadened answers. Correlated variants cannot be counted as independent lives. Prose needs human review, and no benchmark action was executed in the game. [DB01](../../maintainers/cognition-redesign.md#db01--synthetic-decision-api-comparison) retains the offline growth constraint; broader cognition and deployment requirements keep their existing owners.

[AI execution limits](../../limits/ai-execution.md#db01--standalone-synthetic-decision-evaluation) · [Current AI contracts](../../ai-providers.md) · [Engine/world boundaries](../../engine-and-world-boundaries.md)
