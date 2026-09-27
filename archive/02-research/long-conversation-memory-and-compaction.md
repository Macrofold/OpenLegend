# Long-conversation memory and compaction architectures for OpenLegend

**Research date:** 2026-09-27. **Status:** desk research and architectural recommendation; no dependency adoption, provider switch, live benchmark, or runtime implementation was performed.

This review focuses on the engineering side of long-running dialogue: rolling summaries, recent-window retention, dialogue-state approaches, retrieval, topical segmentation, temporal/graph memory, provider-native compaction, and long-term conversational-memory benchmarks. It asks which ideas improve OpenLegend's proposed active-conversation compactor without turning a narrow context-management feature into another memory platform.

The companion [conversation-state and grounding review](conversation-state-and-grounding.md) covers what information dialogue itself needs to preserve. Earlier OpenLegend research on broader memory infrastructure is in [Hindsight memory evaluation](hindsight-memory-evaluation.md).

## 1. Recommendation

Keep the proposed v1 architecture:

> **full authoritative actor-scoped history → one modular conversation-context entry point → rolling older-history summary + recent verbatim tail + exact current trigger**

Improve the summary rubric and evaluation suite, but **do not add retrieval, graphs, topical segmentation, hierarchical summaries, or an external framework yet**.

The most useful research-backed changes are:

1. Preserve a small conceptual conversation state rather than merely “important facts.”
2. Use multiple granularities: compact older context plus exact recent turns.
3. Treat corrections/updates and temporal order as first-class evaluation cases.
4. Preserve reference relationships and participant perspective.
5. Prompt the compactor to **report rather than adjudicate**.
6. Tune for recall first; remove only redundancy/filler once important continuity is reliably retained.
7. Evaluate natural next-turn behavior and implicit use of memory, not only explicit recall questions.
8. Keep full history append-only/available so a later, more capable strategy can rebuild or retrieve from it.

The strongest modern systems often use graphs, segment memory, or hierarchical consolidation, but they solve a broader problem than the current OpenLegend feature. The single entry point is the right seam for adopting those ideas later if v1 measurements justify them.

## 2. Why “just use a bigger context window” is not enough

Context-window size solves only one constraint. Long inputs also create relevance/noise problems.

Anthropic's 2025 context-engineering guidance describes context as a finite attention resource and notes that performance can degrade as context grows; it recommends compaction as a first-line technique for long-horizon coherence, alongside structured note-taking and other approaches. It specifically recommends tuning compaction on complex traces by **maximizing recall first**, then improving precision by removing superfluous content. [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).

This reinforces two OpenLegend choices:

- compact before the provider limit becomes a catastrophic failure;
- do not optimize the first prompt for the shortest possible summary.

A generous, high-recall older-history summary is preferable to an aggressively elegant one that drops the one detail needed thirty turns later.

## 3. Rolling summary plus recent window is a real architecture pattern

Several current systems explicitly support this form.

### Letta

Letta exposes compaction modes including full and sliding-window summarization and allows a custom prompt, model, summary-size clipping, and retained-window proportion. [Letta compaction docs](https://docs.letta.com/api/resources/conversations/subresources/messages/methods/compact).

The relevant lesson is architectural, not a recommendation to adopt Letta:

- compaction can be a replaceable operation;
- a sliding window preserves exact recent context;
- the summarization prompt is a first-class policy.

OpenLegend already has the harder pieces Letta cannot supply for it: actor-specific event-time awareness, world authority, save/restore generation, and game-specific evidence boundaries.

### Semantic Kernel

Semantic Kernel's experimental chat-history summarization reducer combines a target recent-message count with summarization. Its default summarization instructions emphasize continuity and explicitly tell the model not to critique, correct, interpret, presume, or assume. [Microsoft documentation](https://learn.microsoft.com/en-us/python/api/semantic-kernel/semantic_kernel.contents.history_reducer.chat_history_summarization_reducer.chathistorysummarizationreducer?view=semantic-kernel-python).

The useful OpenLegend idea is the **non-adjudicating summarizer**. It should compress what the participants expressed, including corrections or disagreement that actually occurred, rather than “fix” the conversation according to the summarizer's judgment.

### OpenAI provider-native compaction

OpenAI's current Responses API supports automatic and standalone compaction. The provider returns an opaque compaction item intended to carry forward needed state with fewer tokens. [OpenAI Compaction guide](https://developers.openai.com/api/docs/guides/compaction).

This validates compaction as a mainstream model-context mechanism, but the opaque representation is a poor semantic owner for OpenLegend. OpenLegend needs:

- actor-specific privacy auditing;
- exact inspection of what an NPC received;
- source-aware invalidation after correction/forgetting/restore;
- provider portability.

Provider-native compaction can remain an adapter optimization someday, but it should not replace OpenLegend's inspectable conversation projection.

## 4. Multiple context granularities outperform a false binary

Dialogue-state research gives a useful conceptual result: “full transcript” and “only compact state” both have weaknesses.

A 2021 study found that all-history prediction can suffer from noise for short dependencies, while previous-state/current-turn approaches can struggle with long dependencies; different context granularities serve different dependencies. [Yang et al., 2021](https://aclanthology.org/2021.acl-long.193/).

This is a strong theoretical fit for:

- **older compact state** for long dependency/continuity;
- **recent verbatim dialogue** for local coherence, pronouns, tone, and exact conversational action;
- **exact Trigger** for the immediate response target.

OpenLegend should preserve all three instead of trying to make one summary carry everything.

## 5. Long-term memory benchmarks reveal which failure cases matter

### LongMemEval

LongMemEval evaluates five abilities:

- information extraction;
- multi-session reasoning;
- temporal reasoning;
- knowledge updates;
- abstention.

The benchmark reports substantial degradation in long-horizon memory systems and studies design choices around indexing, retrieval, and reading. [Wu et al., 2024](https://arxiv.org/abs/2410.10813).

OpenLegend's active-conversation compactor is not a general multi-session memory bank, but three categories transfer directly:

- **updates** → correction/reversal tests;
- **temporal reasoning** → order-sensitive references and “before/after” changes;
- **abstention** → do not fabricate unheard/unresolved information.

The benchmark also cautions against assuming a technically successful retrieval/summary is enough; downstream reading/reasoning still matters.

### LoCoMo

LoCoMo provides very long conversations and tests temporal and causal memory. [Maharana et al., 2024](https://aclanthology.org/2024.acl-long.747/). Its broader lesson is that long conversational coherence is not reducible to exact fact lookup.

### LOCOMO-CONV

LOCOMO-CONV (2026) was designed specifically because QA-style memory probes miss failures that occur during normal conversation. It evaluates dialog, implicit, counterfactual, and composed query styles across memory systems. The authors report that conversational framing exposes retrieval gaps overlooked by QA benchmarks, particularly for implicit and composed queries; strong retrieval also does not automatically produce good responses. [Chang and Chen, 2026](https://arxiv.org/abs/2609.03467).

This should directly affect OpenLegend acceptance:

> Do not test only “What did I tell you 200 turns ago?” Test whether the NPC naturally uses old context when the next turn presupposes it.

Example:

Earlier:
> “I hate crossing rope bridges.”

Much later:
> “We can take the rope bridge or the tunnel. Which way?”

A coherent response may use that prior context without repeating it verbatim.

### LoCoMo-Plus

LoCoMo-Plus (ACL 2026) targets “cue–trigger semantic disconnect”: later behavior may need to respect an earlier constraint, goal, or value even when the later wording does not explicitly query it. [Li et al., 2026](https://aclanthology.org/2026.acl-long.1150/).

For OpenLegend, the key lesson is evaluation, not architecture. Some older conversational context matters because it changes an appropriate next response, not because it is easy to formulate as a remembered fact.

## 6. Summaries are lossy; factuality failures are real

Dialogue summaries are unusually difficult because salient information is sparse, distributed, speaker-dependent, and interactive. A 2021 long-dialogue summarization study compared extended-context, retrieve-then-summarize, and hierarchical approaches; on its meeting/media/TV datasets, retrieve-then-summarize performed best among the studied approaches. [Zhang et al., 2021](https://aclanthology.org/2021.findings-emnlp.377/).

A 2024 study of dialogue summarization factual consistency found substantial inconsistency rates in evaluated models and highlighted subject/object understanding as difficult. [Exploring Factual Consistency in Dialogue Comprehension Using Large Language Models, NAACL 2024](https://aclanthology.org/2024.naacl-long.338/).

A 2025 production banking summarization system (AUTOSUMM) treats speaker attribution errors and hallucination as first-class engineering problems and combines segmentation, coverage tracking, multiple hallucination checks, human feedback, and version management. [Gupta et al., 2025](https://aclanthology.org/2025.acl-industry.35/). Its regulated production results are domain-specific, but its architecture demonstrates that **speaker attribution and auditability remain hard even with modern LLMs**.

OpenLegend should therefore avoid making summary prose authoritative. The existing design already does this correctly.

It also argues against a second paid “summary correctness judge” in v1. Automated factuality metrics themselves can be unreliable, especially as source context grows. The safer architecture is:

- retain raw sources;
- constrain scope;
- keep summary derived/non-authoritative;
- inspect exact output;
- test behavior;
- rebuild when invalidated.

## 7. Segment-level memory is a plausible v2, not a v1 requirement

SeCom (2025) studies memory granularity and argues that turn-level, session-level, and summary-level memories each have weaknesses. It constructs **topically coherent segments** and applies compression, reporting gains over its baselines on long-conversation benchmarks. [Pan et al., 2025](https://arxiv.org/abs/2502.05589).

This is one of the most relevant future alternatives to a single rolling summary.

Why not start there?

- OpenLegend is compacting one known active conversation, not searching a lifetime memory bank.
- Topic segmentation adds another model/algorithm and another stored structure.
- The first version has no evidence that recursive-summary drift or topic return is a practical failure.

But it gives us a clean expansion trigger:

> If qualification shows that the rolling summary loses old topics when the conversation later returns to them, **topic-coherent source-backed segments** should be evaluated before building a universal graph.

This should be documented in the extension seam.

## 8. Temporal graphs and structured memory are powerful but broader than this task

### APEX-MEM

APEX-MEM (ACL 2026) combines a domain-agnostic temporal property graph, append-only interaction history, and agentic multi-tool retrieval. It reports strong results on LOCOMO and LongMemEval. The system resolves conflicting/evolving information at retrieval time while preserving history. [Banerjee et al., 2026](https://aclanthology.org/2026.acl-long.749/).

This is attractive for general long-term memory because it makes entities, relationships, temporal validity, and updates explicit.

OpenLegend should **not** adopt it for active conversation compaction because:

- OpenLegend already has authoritative typed world/awareness/memory owners;
- a second extracted graph would be derived and fallible;
- the active conversation has a known sequential source, so agentic retrieval is unnecessary overhead;
- privacy must be actor-scoped before any extraction.

The useful idea is **append-only source history + derived current representation**, which the proposed design already follows.

### TiMem

TiMem (Findings ACL 2026) uses temporal-hierarchical consolidation and reports improved benchmark accuracy with shorter recalled memory. [Li et al., 2026](https://aclanthology.org/2026.findings-acl.1091/).

Again, temporal hierarchy is a reasonable response if a flat rolling summary shows measurable drift, but it should not be front-loaded into v1.

### Zep/Graphiti

Zep represents derived facts with temporal validity/invalidation and explicitly notes that its derived facts do not establish that the source content is true. [Zep Facts documentation](https://help.getzep.com/facts). Its documentation also recommends not grounding solely from high-level summaries; recent messages and relevant facts/source-like context complement summaries. [Zep context documentation](https://help.getzep.com/v2/facts).

This supports two OpenLegend choices:

- history remains source of truth;
- summary + recent exact dialogue is safer than summary alone.

But OpenLegend does not need Zep's graph to obtain those benefits.

## 9. Persistent references are a specific blind spot

The 2026 “Frame of Reference” work is unusually relevant to game dialogue because its benchmark uses situated conversations where speakers refer back to entities through temporal, spatial, and attributive relationships. It reports difficulty preserving/using such relational references and argues that useful common-ground representations need to be dynamically updatable, efficiently usable, and perspective-aware. [Mohapatra et al., 2026](https://aclanthology.org/2026.findings-acl.1645.pdf).

This suggests a specific prompt/evaluation improvement:

> Preserve the **relationships used to identify conversational referents**, not merely entity names and propositions.

OpenLegend already has observer-scoped names and opaque reference bindings. The compactor should use that rendered actor perspective; no new graph is needed.

Tests should include multiple similar entities to prevent accidental success through a unique noun:

- two swords;
- two taverns;
- two guards;
- several rooms;
- the same person encountered at different times.

## 10. A better v1 compaction prompt philosophy

Research across systems and dialogue theory suggests the following principles.

### 10.1 Optimize for recall before elegance

Initially keep more than feels aesthetically necessary. Anthropic explicitly recommends maximizing recall first when tuning compaction, then improving precision.

The first compactor should remove:

- greetings/filler after they stop mattering;
- verbatim repetition;
- duplicated explanations;
- clearly superseded wording when the supersession itself is retained;
- resolved details that no longer affect interpretation.

It should be conservative about removing:

- names/referential relationships;
- reasons/constraints;
- unresolved/live issues;
- disagreement/uncertainty;
- correction chains whose current meaning depends on knowing what changed;
- explicit acceptance/refusal when later turns may presuppose it.

### 10.2 Report, do not adjudicate

The summary should not:

- decide which speaker is objectively correct;
- infer consent/agreement from silence;
- infer motives or feelings not expressed;
- “repair” contradictions on its own;
- upgrade hearsay into observed truth;
- convert a player request into an NPC obligation.

This is consistent with Semantic Kernel's conservative summarization instructions and OpenLegend's evidence/authority model.

### 10.3 Preserve useful relationship phrases

When a conversation has several similar referents, preserve identifying relations:

> “the black sword Mike found in the cellar”

rather than collapsing to:

> “a sword.”

This may cost a few extra tokens but prevents expensive ambiguity later.

### 10.4 Keep local language local

Do not force tone, jokes, pronouns, cadence, or every conversational move into the old-history summary. Recent verbatim turns are the right place for those.

## 11. Rolling-summary drift: accepted risk and guardrails

The simple v1 update is:

```text
previous summary + newly aged-out turns -> new summary
```

Every generation can introduce drift. The research does not eliminate that risk.

V1 guardrails should remain:

- raw transcript/awareness retained;
- compactor version stored;
- exact summary inspectable;
- coarse invalidation/rebuild on source changes;
- summary non-authoritative;
- recent tail exact;
- current trigger exact;
- qualification includes many successive compactions, not merely one.

A useful stress test is 1,000+ turns with repeated compactions and a few planted continuity facts, corrections, unresolved issues, and relational references. Compare model-facing summary after each compaction to the source semantics and test downstream responses.

If drift becomes material, evaluate in this order:

1. rebuilding periodically from source-backed chunks rather than prior summary;
2. topically coherent source-backed segments (SeCom-like);
3. hierarchical temporal summaries (TiMem-like);
4. targeted older-turn retrieval for the current trigger;
5. richer graph/temporal memory only if the broader use case justifies it.

This ordering preserves the “least new machinery first” philosophy.

## 12. Why retrieval stays out of v1

A current player turn can revive an old detail that the rolling summary omitted. Retrieval from the full transcript is the obvious solution.

However, adding retrieval immediately has costs:

- embedding/index lifecycle;
- query formulation;
- candidate ranking;
- source hydration;
- more context-policy interactions;
- another path that can miss required material;
- more difficult privacy and debugging.

OpenLegend already has broader memory-retrieval machinery, but active-conversation continuity currently has a stronger guarantee than optional recall. Replacing that guarantee with probabilistic retrieval is a semantic change.

Therefore v1 should **measure this failure explicitly** rather than assume it away. Add “return to an old topic after hundreds of turns” cases. If failures are significant, the one conversation-context entry point is where retrieval can later be added without spreading policy across cognition callers.

## 13. Evaluation matrix recommended for OpenLegend

### A. Short-context parity

No compaction. Exact current behavior.

### B. Long sequential continuity

Hundreds/thousands of turns, repeated compactions, ordinary follow-ups.

### C. Update chains

“X” → correction to “Y” → clarification to “Y with condition Z.”

Expected: current conversational state is clear; history is not rewritten into false certainty.

### D. Disagreement and grounding

One participant asserts; another disputes; third participant only overhears part.

Expected: no false agreement, correct per-actor summary.

### E. Temporal references

“the guard we met before the storm,” “the second tavern,” “what you said yesterday.”

### F. Spatial/attributive references

“the chest under the stairs,” “the room with the blue rug,” with multiple similar candidates.

### G. Active issue lifetime

Question/proposal/explanation stays live across unrelated digressions, then resolves.

Expected: survives while live; can collapse after resolution unless needed for later context.

### H. Implicit next-turn use

Later prompt presupposes earlier context without naming it directly.

Expected: response naturally respects it.

### I. Return to old topic

A previously resolved/quiet topic becomes active again hundreds of turns later.

Expected: measure whether flat summary is enough. This is the principal v2 trigger.

### J. Unknown/abstention

Required detail was never heard or was indistinct.

Expected: compaction does not invent it.

### K. Failure/restore/privacy

Provider failure, correction/forgetting invalidation, restore generation, late join, partial hearing.

Expected: explicit failure/stale rejection/no disclosure widening.

Metrics should include both:

- **projection fidelity:** whether the needed meaning exists in the exact model-facing summary/recent context;
- **behavioral continuity:** whether the NPC's next response actually uses it appropriately.

A high-fidelity projection with a poor generated response is a different failure from a lossy compactor.

## 14. Framework/adoption decision

| Option | What to borrow | Adopt for v1? |
| --- | --- | --- |
| Letta | sliding-window compaction; custom summary policy | No dependency |
| Semantic Kernel | conservative non-adjudicating summary instructions | No dependency |
| OpenAI compaction | threshold-triggered compaction concept | No; opaque state conflicts with inspection/portability |
| Zep/Graphiti | temporal invalidation; raw + derived separation | No; OL already owns source/evidence semantics |
| SeCom | topical source-backed segments | Future candidate if topic-return failures appear |
| TiMem | temporal hierarchical consolidation | Future candidate if recursive drift appears |
| APEX-MEM | append-only history + temporal relationship reasoning | Broader long-term-memory inspiration, not active-conversation v1 |
| Anthropic guidance | maximize recall first, then precision | Yes, as tuning philosophy |

## 15. Changes recommended to the current design

The research supports **modest changes, not a redesign**:

1. Replace the four initial summary categories with three:
   - **established conversational context**;
   - **active issues and focus**;
   - **updates and repairs**.
2. Make **perspective/attribution, grounding status, and referential continuity** explicit cross-cutting invariants.
3. State that the compactor must not infer agreement, correction, truth, motives, or hidden knowledge.
4. Call out relational references as a specific acceptance area.
5. Expand NC17/verification to include implicit next-turn use, abstention, reference resolution, and return-to-old-topic stress tests.
6. Add topic-segmented/source-backed compaction as the first documented future strategy if the flat rolling summary fails those tests.
7. Keep the existing single modular entry point, one rolling summary, recent verbatim tail, exact trigger, coarse invalidation, and no-retrieval/no-graph v1.

## 16. Sources

Research/benchmarks:

- [LongMemEval (2024)](https://arxiv.org/abs/2410.10813)
- [LoCoMo (ACL 2024)](https://aclanthology.org/2024.acl-long.747/)
- [LOCOMO-CONV (2026)](https://arxiv.org/abs/2609.03467)
- [LoCoMo-Plus (ACL 2026)](https://aclanthology.org/2026.acl-long.1150/)
- [On Memory Construction and Retrieval for Personalized Conversational Agents / SeCom (2025)](https://arxiv.org/abs/2502.05589)
- [TiMem (Findings ACL 2026)](https://aclanthology.org/2026.findings-acl.1091/)
- [APEX-MEM (ACL 2026)](https://aclanthology.org/2026.acl-long.749/)
- [An Exploratory Study on Long Dialogue Summarization (2021)](https://aclanthology.org/2021.findings-emnlp.377/)
- [AUTOSUMM (ACL Industry 2025)](https://aclanthology.org/2025.acl-industry.35/)
- [Frame of Reference (Findings ACL 2026)](https://aclanthology.org/2026.findings-acl.1645.pdf)

Current systems/documentation checked:

- [Letta conversation compaction](https://docs.letta.com/api/resources/conversations/subresources/messages/methods/compact)
- [Semantic Kernel ChatHistorySummarizationReducer](https://learn.microsoft.com/en-us/python/api/semantic-kernel/semantic_kernel.contents.history_reducer.chat_history_summarization_reducer.chathistorysummarizationreducer?view=semantic-kernel-python)
- [OpenAI Compaction guide](https://developers.openai.com/api/docs/guides/compaction)
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Zep facts](https://help.getzep.com/facts)
- [Zep facts and summaries](https://help.getzep.com/v2/facts)

Vendor documentation describes current product behavior and vendor recommendations, not independent comparative evidence. Benchmark results are tied to their datasets, model versions, and evaluation protocols. None of the cited systems has been benchmarked against OpenLegend in this research pass.
