# Conversation state, common ground, and continuity for OpenLegend

**Research date:** 2026-09-27. **Status:** research synthesis for the proposed long-conversation compaction design; no runtime implementation, provider benchmark, or dependency adoption is authorized by this document.

This note asks a narrow question: **what information from a conversation actually has to survive when older dialogue is compressed so that a fictional character can continue naturally and correctly?** It reviews dialogue-state tracking, common-ground/grounding research, Questions Under Discussion, discourse focus, clarification/repair, discourse obligations, and recent work on persistent referential grounding. It then translates the useful ideas into OpenLegend's existing actor-perspective evidence model.

The companion [long-conversation memory and compaction review](long-conversation-memory-and-compaction.md) covers memory architectures, summarization systems, frameworks, and evaluation benchmarks. The active proposal lives in [conversation compaction feature spec](../../docs/projects/completed/conversation-compaction-feature-spec.md) and [technical design](../../docs/projects/completed/conversation-compaction-tech-design.md).

## 1. Executive conclusion

OpenLegend does **not** need a large dialogue ontology for v1. A surprisingly durable pattern appears across several generations of dialogue research:

1. **What has been established in the exchange.**
2. **What is currently at issue or in focus.**
3. **What has changed, been repaired, clarified, or superseded.**
4. **The latest moves verbatim enough to continue naturally.**

The first three are appropriate guidance for a rolling older-history summary. The fourth is already handled better by OpenLegend's recent verbatim tail and exact current Trigger.

Several cross-cutting properties matter more than adding more categories:

- **Perspective and attribution:** who said, perceived, accepted, disputed, or was uncertain about something.
- **Grounding status:** an assertion is not automatically mutually accepted merely because it was uttered.
- **Reference continuity:** later phrases such as “that room,” “the second sword,” or “the inn beside the bridge” must still resolve when the relationship was established earlier.
- **Temporal/update order:** later explicit correction, clarification, reversal, or resolution can change what should be treated as current without erasing the historical fact that an earlier claim occurred.

This suggests a smaller rubric than the first OpenLegend draft. “Promises,” “apologies,” “preferences,” “boundaries,” and similar phenomena can matter, but they should not become top-level compaction record types. When they matter to an ongoing exchange, they naturally fall under established context, active issues, or updates. Mechanically authoritative obligations, relationships, goals, knowledge, and corrections remain owned by their existing OpenLegend systems.

## 2. Classic information-state models are a useful sanity check

Dialogue research long predates LLM context windows. A useful family of systems represented dialogue through an **information state** that changes turn by turn rather than replaying the entire transcript for every decision.

An issue-based dialogue-management account described each participant's view of the common ground—their “Dialogue Gameboard”—with three especially relevant components:

- **FACTS:** shared assumptions;
- **LatestMove:** the most recent grounded move;
- **QUD (Questions Under Discussion):** the currently discussable questions, often ordered or stack-like.

Source: [Issue based Dialogue Management: basic principles, ACL 2005 proceedings](https://aclanthology.org/P05-1.pdf).

This is not a schema OpenLegend should copy literally. The mapping is nevertheless striking:

| Classic concept | Useful OpenLegend interpretation | Why not copy literally |
| --- | --- | --- |
| FACTS | Established conversational context | Spoken claims may be false, disputed, hearsay, or known only from one actor's perspective; “fact” is too strong. |
| QUD | Active issues and focus | Open-world conversation is not always a literal question stack, but the idea of unresolved/current issues generalizes well. |
| LatestMove | Recent verbatim dialogue + exact Trigger | OpenLegend already has a better source-preserving representation than another derived field. |

The lesson is not “implement a Dialogue Gameboard.” It is that **a compact state plus recent moves is a long-standing dialogue architecture**, not merely an LLM-era workaround.

### Dialogue state tracking says similar things from another direction

Dialogue State Tracking (DST) tracks the state needed to interpret the conversation and support the next action, often user goals and constraints in task-oriented domains. A 2022 survey describes DST as tracking user needs/goals from conversation history and notes that generalization beyond narrow domains remains a challenge. [Jacqmin et al., 2022](https://aclanthology.org/2022.sigdial-1.33/).

Two findings are particularly relevant to OpenLegend:

- Incremental approaches update prior state as new turns arrive instead of re-deriving everything from the whole history. [Liao et al., 2021](https://aclanthology.org/2021.tacl-1.34/).
- A study comparing context granularities found a tradeoff: predicting from the entire history can suffer from noise for short dependencies, while updating only from prior state/current turn can struggle with longer dependencies; combining granularities helps. [Yang et al., 2021](https://aclanthology.org/2021.acl-long.193/).

That supports OpenLegend's proposed **older compact state + recent exact dialogue**, rather than either a summary-only design or “always send every turn.”

## 3. Common ground is useful, but the word is dangerous for OpenLegend

Human dialogue relies on common ground: participants build enough shared understanding to interpret each other's utterances. A 2025 survey covering 448 papers emphasizes that common ground has many meanings and can include personal, domain-specific, or commonsense information, with static or dynamic representations. [Anikina, Leippert, and Ostermann, 2025](https://aclanthology.org/2025.luhme-1.2/).

For OpenLegend, **common ground must not become an omniscient shared database**. There are at least three reasons:

1. Each NPC has actor-specific event-time awareness.
2. Two participants may misunderstand one another.
3. A spoken proposition may be disputed, sarcastic, uncertain, deceptive, or merely unacknowledged.

So the compactor should maintain an **actor-local representation of the conversation**, not claim to compute objective mutual belief.

### Do not presume agreement

This warning is especially important with LLMs. “Grounding Gaps in Language Model Generations” found that, compared with humans in the studied datasets, LLM-generated dialogue used fewer grounding acts and tended to presume common ground rather than actively establish it through acknowledgments, clarification, and related moves. [Shaikh et al., 2024](https://aclanthology.org/2024.naacl-long.348/).

A later study of human-LLM grounding reported that LLMs were substantially less likely than humans to initiate clarification or follow-up requests in the evaluated logs. [Shaikh et al., 2025](https://aclanthology.org/2025.acl-long.1016/).

For compaction, the practical consequence is simple:

> **Do not promote “someone said X” into “everyone agrees X” unless the source dialogue actually supports that interpretation.**

Silence, topic continuation, or the model's sense that a statement is plausible are not evidence of acceptance.

OpenLegend does not need an explicit grounding-status enum for every sentence in v1. The summary prompt should preserve acceptance, disagreement, uncertainty, or lack of resolution **when losing that distinction would change the meaning of the ongoing exchange**.

## 4. Questions Under Discussion are a better abstraction than “unresolved promises”

The Question Under Discussion (QUD) framework models discourse around the issues/questions that organize what is currently relevant. A 2025 survey reviews the growing use of QUD models in discourse processing and their connections to broader discourse frameworks. [Fu, 2025](https://aclanthology.org/2025.naacl-long.84/).

The OpenLegend-friendly generalization is **active issues and focus**, not a literal question stack.

Examples:

- “Where did you hide the sword?” → an unanswered question.
- “Should we leave tonight or at dawn?” → a decision under discussion.
- “I don't believe your story about Ben.” → a live dispute.
- “Let me explain how the machine works.” → an explanation whose thread is unfinished.
- “Will you meet me at sunset?” → an open social proposal until answered.
- “Fine, I’ll meet you at sunset.” → the conversational issue may now be resolved, while any mechanically authoritative obligation belongs elsewhere.

This is why “unresolved commitments” should **not** be the main compaction category. Dialogue research does contain explicit models of discourse obligations and public commitments—for example, [Traum and Allen, 1994](https://aclanthology.org/P94-1001/) and later work on public commitments—but commitments are one important subclass of interaction state, not the universal organizer of conversation.

For v1, OpenLegend needs to know **what remains live in the exchange**, not maintain a dedicated record for each pragmatic phenomenon.

## 5. Repair and clarification deserve explicit preservation

Dialogue is not monotonic. Participants correct themselves, clarify references, retract claims, answer questions, resolve ambiguity, and repair misunderstandings.

Clarification-question research treats clarification as central when the listener cannot infer the underlying need or intended meaning. [Rahmani et al., 2023](https://aclanthology.org/2023.acl-long.152/). Grounding research likewise treats repair and acknowledgment as basic dialogue operations.

For compaction, this means a simple “salient facts from the conversation” prompt is unsafe. It can easily preserve both:

- “The package came from Ben.”
- “Wait, I meant Clara.”

as two equally current statements—or worse, keep only the first.

The summary should instead preserve **updates and repairs**:

- explicit correction;
- clarification;
- reversal/retraction;
- resolution of an earlier ambiguity;
- answer/resolution of a live issue when the resolution matters later.

But the compactor should not invent repairs. Two inconsistent statements do not necessarily mean the latter is a correction; they may represent disagreement, deception, uncertainty, changed opinion, or different referents.

A safe prompt principle is:

> Report what changed according to the conversation; do not adjudicate what should have changed.

That aligns with Microsoft's Semantic Kernel summarization reducer, whose current default instructions explicitly tell the summarizer to maintain continuity while not critiquing, correcting, interpreting, presuming, or assuming the dialogue. [Semantic Kernel documentation](https://learn.microsoft.com/en-us/python/api/semantic-kernel/semantic_kernel.contents.history_reducer.chat_history_summarization_reducer.chathistorysummarizationreducer?view=semantic-kernel-python).

## 6. Local focus matters even when there is no explicit question

Centering Theory models local discourse coherence by tracking which entities/concepts are currently central. The classic treatment is [Grosz, Joshi, and Weinstein, 1995](https://aclanthology.org/J95-2003/). Follow-up-question research has also shown that discourse structure and centering information can help decide which earlier context matters. [Bernardi, Kirschner, and Ratkovic, 2010](https://aclanthology.org/L10-1226/).

For OpenLegend, this argues against reducing “active issue” to explicit unanswered questions.

Consider:

> Ada: “The red door leads downstairs.”  
> Mike: “And behind it?”  
> Ada: “There’s a storage room.”  
> Mike: “Is it guarded?”

The active focus includes the red door/storage room relationship even though subsequent turns use pronouns and ellipsis. A useful compaction must preserve enough context to resolve these short references.

This also justifies keeping **recent verbatim dialogue**. Fine local coherence is often carried by exact wording, pronouns, ellipsis, and short-lived focus that is expensive and lossy to normalize into permanent state.

## 7. Referential continuity is more important than we initially gave it credit for

A 2026 Findings of ACL paper, “Frame of Reference,” directly studies persistent common-ground representations in situated dialogue. The authors argue that long-term grounding requires information that is efficiently retrievable, dynamically updatable, and perspective-aware. They focus on **relational references** such as referring to an entity through temporal, spatial, attributive, or comparative relationships—for example, a restaurant visited after another event or a sofa in a particular room. [Mohapatra et al., 2026](https://aclanthology.org/2026.findings-acl.1645.pdf).

Their analysis identifies:

- temporal references;
- spatial references;
- attributive references;
- comparative references;
- inferred grounding.

The benchmark deliberately uses multiple similar entities so keyword matching is insufficient, and it tests self/other perspective (“I” versus “you”). Their tested generic representations struggled with these relational references, including in full-context settings.

The paper is about situated reference resolution, not arbitrary fantasy NPC conversation, so its quantitative results should not be generalized blindly. But the qualitative lesson is highly relevant:

> A conversation summary that remembers propositions but loses **how participants identified the relevant person/place/object/event** can still make later dialogue incoherent.

OpenLegend already has observer-scoped identity/reference machinery. V1 should not add a knowledge graph, but its compaction rubric should explicitly preserve **referential anchors that remain useful to the exchange**:

- “the second sword Mike showed me”;
- “the inn beside the stone bridge”;
- “the woman who warned us before the storm”;
- “the plan we discussed after Ben left.”

This is a cross-cutting requirement, not a new record family.

## 8. Simulating representative conversations

The following thought experiments were used to test whether the proposed three-part rubric is sufficient.

### 8.1 Small talk that becomes relevant

> Mike: “Cold morning.”  
> Ada: “The river froze last night.”  
> ...many turns...  
> Mike: “Could we cross on foot?”

Keep: the river froze, if still relevant to the current exchange.  
Drop: redundant greeting language.  
Category: established context + current focus.

### 8.2 A correction

> Ada: “Ben has the key.”  
> Ada: “Sorry—Clara has it. Ben returned it yesterday.”

Keep: Ada now says Clara has the key; Ada corrected her earlier statement about Ben.  
Do not infer: Clara objectively has the key.  
Category: update/repair + attribution.

### 8.3 Disagreement

> Ben: “The bridge is safe.”  
> Ada: “No, I saw it crack this morning.”

Keep: Ben claimed it is safe; Ada disputes that and gives her reason.  
Do not compact to: “The bridge is unsafe” unless that is separately established by the actor's evidence.  
Category: established context with disagreement/attribution.

### 8.4 Negotiation

> Merchant: “Twelve coins.”  
> Player: “Eight.”  
> Merchant: “Ten and you carry it yourself.”  
> Player: “Deal.”

Keep: agreed current terms: ten coins, player carries it.  
Drop: superseded offers unless the bargaining history itself matters socially.  
Category: established context + resolved issue + update.

### 8.5 Refusal/boundary

> Player: “Tell me where your sister lives.”  
> Ada: “No. I’m not telling you that.”

Keep while materially relevant: Ada explicitly refused that request.  
No special “boundary object” is required.  
Category: established interaction context; the issue may be resolved as refused.

### 8.6 Deferred answer

> Player: “Who gave you the map?”  
> Ada: “Give me a minute. I’ll explain after we get out of here.”

Keep: the question remains live/deferred.  
If a native obligation is created elsewhere, that is separate.  
Category: active issue.

### 8.7 Reference by relationship

> Ada: “There are two chests: a red one by the window and a black one beneath the stairs.”  
> ...many turns...  
> Player: “What was inside the one under the stairs?”

Keep: enough of the relational anchor to identify the black chest beneath the stairs.  
Category: established context + reference continuity.

### 8.8 Multi-party partial hearing

Ada hears turns 1–20. Carol cannot hear 1–10, hears 11–20, then joins at 21.

Ada's summary may contain 1–20. Carol's summary may contain 11–20. There is no legitimate shared summary covering 1–20 for both.  
Category: perspective/privacy invariant, before compaction.

### 8.9 Ambiguous acknowledgment

> Ben: “So you agree the cave is safe?”  
> Ada: “We need to leave.”

Do not summarize as “Ada agreed the cave is safe.”  
Category: grounding-status caution.

### 8.10 Long story with a later callback

> Ada tells a long story about three villages, then later says, “the village where my mother grew up.”

The summary needs enough referential relation to resolve which village is meant.  
Category: established context + reference continuity.

These cases do not reveal a missing fourth or fifth top-level category. They mostly stress attribution, live focus, repairs, and references.

## 9. Recommended OpenLegend rubric

The initial four-item design should be simplified to three general concerns:

### A. Established conversational context

Preserve earlier content that later turns still rely on: claims, explanations, decisions, shared labels, relevant reasons, constraints, relationships between referenced entities/events, or explicit interaction outcomes.

When material, retain whether something was:

- merely asserted/reported;
- explicitly acknowledged or accepted;
- disputed;
- uncertain.

Do not create a universal status field for every statement.

### B. Active issues and focus

Preserve what is still being asked, discussed, negotiated, decided, explained, disputed, or deferred, plus enough referential context to understand follow-ups.

This is the OpenLegend analogue of QUD plus local discourse focus, without implementing a formal stack.

### C. Updates and repairs

Preserve explicit corrections, clarifications, reversals, retractions, resolutions, and other later changes that make an older compact statement misleading if presented as the current conversational state.

Do not infer a repair merely from contradiction.

### Cross-cutting invariants

- preserve actor perspective and event-time disclosure;
- preserve speaker/source attribution when it changes meaning;
- preserve uncertainty/disagreement rather than falsely grounding it;
- preserve important temporal/spatial/attributive relationships used to refer back to entities/events;
- keep the current trigger and enough recent turns verbatim instead of forcing all local coherence through summary prose.

## 10. What not to add in v1

The literature offers much richer formalisms: QUD stacks, commitment stores, belief models, grounding acts, graphs, frames, dialogue-act taxonomies, and discourse relations. They are useful conceptual tools but are not justified as new OpenLegend runtime state for this task.

Do **not** add, merely because the research has names for them:

- one record per question-under-discussion;
- a universal common-ground database;
- a grounding-status enum on every utterance;
- per-turn dialogue-act classification;
- a commitment store parallel to OpenLegend's actual obligation owner;
- a reference graph solely for conversation compaction;
- a separate belief tracker;
- a discourse parser.

The v1 summary can be prompted with the concepts above and evaluated against them. Add structure only where measured failures demonstrate that prose cannot preserve the needed distinction.

## 11. Research implications for testing

The test/acceptance set should include more than memory QA.

Add scenarios for:

- **assertion versus acceptance:** a claim made but never agreed to;
- **explicit acknowledgment:** something clearly accepted becomes safe conversational context without becoming objective world truth;
- **disagreement:** competing attributed views remain distinct;
- **repair chains:** X → explicit correction Y → clarification Z;
- **resolved versus still-live issue:** an unanswered question survives, an answered one no longer consumes attention unnecessarily;
- **reference continuity:** temporal, spatial, attributive, and comparative references among multiple similar entities;
- **self/other perspective:** “the room I visited” versus “the room you visited”;
- **implicit next-turn use:** old context should improve a natural reply even when the player does not explicitly ask “what did I tell you?”;
- **abstention/unknown:** the compact summary must not fill in unheard or unresolved information.

The current trigger and recent tail should also be tested as the equivalent of “LatestMove”: the model must not need the older summary to reconstruct the immediate conversational act.

## 12. Sources and evidence limits

Primary/review sources used:

- [Building Common Ground in Dialogue: A Survey (2025)](https://aclanthology.org/2025.luhme-1.2/)
- [Grounding Gaps in Language Model Generations (2024)](https://aclanthology.org/2024.naacl-long.348/)
- [Navigating Rifts in Human-LLM Grounding (2025)](https://aclanthology.org/2025.acl-long.1016/)
- [Frame of Reference: Addressing the Challenges of Common Ground Representation in Situational Dialogs (2026)](https://aclanthology.org/2026.findings-acl.1645.pdf)
- [A Survey of QUD Models for Discourse Processing (2025)](https://aclanthology.org/2025.naacl-long.84/)
- [Centering: A Framework for Modeling the Local Coherence of Discourse (1995)](https://aclanthology.org/J95-2003/)
- [Context Fusion: The Role of Discourse Structure and Centering Theory (2010)](https://aclanthology.org/L10-1226/)
- [Dialogue State Tracking with Incremental Reasoning (2021)](https://aclanthology.org/2021.tacl-1.34/)
- [Comprehensive Study: How the Context Information of Different Granularity Affects Dialogue State Tracking? (2021)](https://aclanthology.org/2021.acl-long.193/)
- [A Survey on Asking Clarification Questions Datasets in Conversational Systems (2023)](https://aclanthology.org/2023.acl-long.152/)
- [Discourse Obligations in Dialogue Processing (1994)](https://aclanthology.org/P94-1001/)
- [Modelling Grounding and Discourse Obligations Using Update Rules (2000)](https://aclanthology.org/A00-2001/)
- [Semantic Kernel ChatHistorySummarizationReducer documentation](https://learn.microsoft.com/en-us/python/api/semantic-kernel/semantic_kernel.contents.history_reducer.chat_history_summarization_reducer.chathistorysummarizationreducer?view=semantic-kernel-python)

The classic dialogue papers often study task-oriented or constrained settings, and the 2026 referential-grounding benchmark is situated rather than open-world roleplay. They support vocabulary, failure modes, and architecture patterns; they do not prove that a particular OpenLegend prompt or summary budget will meet quality targets. That must be established with the proposed game-specific qualification scenarios.
