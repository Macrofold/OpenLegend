# Long-conversation continuity and compaction — feature specification

**Status:** implemented and locally qualified on 2026-09-27, following developer approval and the updated remote design. [Technical design](conversation-compaction-tech-design.md) owns the mechanism and implementation plan. [NC14–NC17](../maintainers/narration-and-conversations.md) record delivery; [runtime evidence and limits](../verification.md#conversation-compaction) distinguish native checks, live constructed scenarios and broader acceptance still outside this slice.

## 1. Outcome

NPC conversations can continue for a long time without eventually failing because the complete retained transcript no longer fits in one model request.

OpenLegend still keeps the full durable speech and actor-awareness history. For one NPC decision, the server provides a bounded actor-specific conversation projection: recent dialogue remains verbatim and older dialogue may be represented by a compact summary. The projection must preserve the information needed for a natural continuation without widening what the NPC was allowed to hear.

This is context-window management, not a new fictional memory system. Conversation compaction does not create knowledge, promises, beliefs, relationships, actions or world facts.

## 2. What a continuing conversation generally needs

The compactor should not maintain a large catalogue of special conversational concepts. Research on dialogue information state, Questions Under Discussion, grounding/repair and long-term conversational memory suggests a small useful abstraction:

1. **Established conversational context.** What the exchange now relies on: important attributed claims, explanations, choices, decisions, constraints, shared labels and relationships between referenced people, objects, places or events.
2. **Active issues and focus.** What is still being asked, discussed, negotiated, explained, disputed, decided or deferred, plus enough context to understand follow-ups and references.
3. **Updates and repairs.** Explicit corrections, clarifications, reversals, retractions, resolutions and later changes that would make an older compact statement misleading if presented as current.

These are summarization concerns, not separately writable engine records. A promise, refusal, apology, preference or boundary can matter, but it belongs in one of these general concerns when the continuing exchange relies on it; it does not require a special compaction subsystem.

Three rules cut across all three concerns:

- **Perspective and attribution:** preserve who said/perceived what when it changes meaning. “Ben said the bridge is safe” must not become “the bridge is safe.”
- **Grounding/uncertainty:** do not infer that a statement was accepted merely because it was spoken or conversation continued. Preserve explicit acceptance, disagreement or uncertainty when material.
- **Reference continuity:** retain useful temporal, spatial, attributive or comparative relationships needed to resolve later expressions such as “the second sword,” “the room with the blue rug,” or “the inn beside the bridge.”

The compactor reports the conversation; it does not critique it, decide who is correct, infer hidden motives, or invent a correction from mere contradiction.

Recent exact wording and the current trigger remain outside this abstraction where possible. The recent verbatim tail carries local discourse focus and the current speech that caused a response stays verbatim in the existing Trigger section.

Research basis: [conversation state and grounding](../../archive/02-research/conversation-state-and-grounding.md) and [long-conversation memory and compaction](../../archive/02-research/long-conversation-memory-and-compaction.md).

### Examples considered

- **Small talk:** weather, jokes and greetings can collapse aggressively once they stop affecting the exchange.
- **Directions or instructions:** retain the destination, constraints and any later correction; routine wording can disappear.
- **Planning:** retain the current plan, relevant reasons/constraints and what changed; superseded brainstorming can collapse.
- **Negotiation:** retain the current proposal, accepted/refused terms and unresolved points rather than every bargaining turn.
- **Investigation or argument:** retain attributed claims, disagreement, uncertainty and later corrections without declaring a disputed claim true or treating silence as agreement.
- **Personal conversation:** retain explicit disclosures, requests, boundaries, apologies or decisions that the current exchange still relies on; do not infer hidden feelings as fact.
- **Long explanation/story:** retain the thread and the information needed to continue or answer follow-up questions, while compressing repetitive detail.
- **Relational callback:** retain enough of “the black sword from the cellar” or “the inn beside the bridge” to distinguish it later from similar entities.
- **Multi-party/overheard conversation:** each NPC receives only the subset actually available through its event-time awareness, even when everyone shares the same conversation ID.

These examples define a general continuity goal, not fixed extraction fields.

## 3. Player and NPC behavior

Short and normal conversations behave as they do today: the NPC receives its permitted conversation verbatim.

When the permitted transcript becomes too large for the conversation portion of a model request, OpenLegend transparently compacts older dialogue. The NPC still receives:

- a compact representation of relevant older conversation;
- recent personally experienced dialogue verbatim;
- the current triggering speech verbatim through the existing trigger context;
- existing mandatory context such as authoritative active obligations or corrections through their current owners.

The user does not need to close/reopen a conversation, start a new session or manually summarize it.

The saved transcript and transcript UI remain complete. Compaction must never delete speech merely because it left the model-facing recent window.

## 4. Privacy and perspective

Compaction happens **after** OpenLegend determines what the specific NPC was permitted to perceive.

There is no shared conversation summary that is automatically given to every participant. Two actors in the same conversation may have different compacted histories because they joined at different times, overheard different intervals, heard indistinct speech, recognized different speakers or had different event-time permissions.

A late join cannot gain earlier dialogue through compaction. Hearing does not become participation. Indistinct speech does not become reconstructed words. Unknown speakers or recipients remain unknown unless that actor's evidence later establishes them through an existing mechanism.

## 5. Continuity and authority

The summary is derived context only. It may restate information the actor already had; it cannot independently:

- create or resolve a commitment;
- establish a world fact;
- teach a skill or reveal hidden knowledge;
- change a relationship, goal or plan;
- authorize an action;
- broaden an audience;
- rewrite the underlying transcript.

Where OpenLegend already has a stronger semantic owner, that owner remains authoritative. For example, an actual active obligation can be included through the existing mandatory-context path rather than trusting the compactor to rediscover it.

Compaction should preserve material corrections and revisions in its prose, but existing correction/forgetting mechanisms remain authoritative and can invalidate derived compaction.

## 6. Failure behavior

The system never silently drops older required conversation because summarization failed.

If the full permitted conversation fits, use it without a compaction call. If compaction is required and a valid cached result is sufficient, use it. If a new compaction is required and cannot be produced or validated, the response fails explicitly under the existing AI failure/spending rules rather than pretending the omitted conversation did not exist.

There is no automatic paid retry.

## 7. Scope and non-goals

V1 intentionally does **not** add:

- a third-party memory/agent framework;
- a fact graph or dialogue-state graph;
- embeddings or semantic retrieval over the active conversation;
- per-topic or per-promise records;
- hierarchical summary trees;
- background proactive compaction;
- shared summaries across actors;
- provider-opaque automatic compaction;
- transcript deletion;
- new fictional forgetting behavior.

A simple rolling actor-specific summary is sufficient until measured quality shows otherwise.

## 8. Staged capability

**Stage 1 — one projection boundary.** Introduce one server-owned conversation-context entry point used by model-facing cognition. It can return the current full actor-permitted conversation unchanged.

**Stage 2 — rolling compaction.** Add an actor/conversation-specific derived summary and on-demand update path when the conversation would otherwise exceed its context allowance.

**Stage 3 — lifecycle and inspection.** Invalidate/rebuild derived summaries on relevant correction, forgetting, restore or compactor-version changes and expose exact compaction diagnostics to authorized inspection.

**Stage 4 — qualification.** Exercise long, corrected, disputed, multi-party and partial-hearing conversations and tune prompt/budgets from evidence.

## 9. Acceptance criteria

The feature is acceptable when:

- ordinary conversations remain verbatim and unchanged;
- a very long conversation can continue without failing solely because its full transcript exceeds the request budget;
- full durable history remains available independently of the compacted model context;
- older material needed to understand the current exchange survives compaction in representative planning, negotiation, correction, argument and personal-conversation fixtures;
- current triggering speech and recent dialogue remain exact;
- corrections and reversals are not flattened into the obsolete version as current truth;
- an assertion is not silently promoted to mutual agreement; disputed/hearsay statements retain attribution or uncertainty when material;
- unanswered/current issues can remain available without introducing a specialized promise/task subsystem;
- later temporal, spatial, attributive and comparative references can resolve to the intended earlier conversational referent in representative cases;
- actor-relative references such as “the room I visited” versus “the room you visited” preserve perspective;
- unheard, indistinct or unresolved information remains unknown rather than being filled in by compaction;
- late joiners and partial overhearers never gain unheard content;
- restore, forgetting and correction cannot reuse a stale derived summary;
- compaction failure causes an explicit failure rather than silent truncation;
- diagnostics can distinguish full-transcript use from compacted use and show the exact model-facing conversation projection.

Quality should be evaluated through natural next-turn behavior and implicit callbacks, not only questions such as “what did I tell you earlier?” Qualification must also include returning to an old topic after many intervening turns; repeated failures there are the clearest trigger to evaluate a richer internal strategy.

## 10. Decisions and future extension

V1 uses a single rolling summary because it is the smallest design that solves the request-size problem while remaining inspectable. If repeated re-summarization shows measurable drift, or if returning to older topics repeatedly loses required context, the same entry point can later swap to source-backed/topic-coherent segments, targeted older-turn retrieval, hierarchical summaries or another strategy without changing cognition callers.

The summary format and prompt are implementation policy behind that boundary. The durable transcript and actor-awareness rules are not.

**Blocking product questions: none for the design.** Exact byte thresholds and model choice should be tuned during implementation/qualification rather than treated as conversational semantics.

## Maintained records

- Implementation: [Narration and conversation tasks, NC14–NC17](../maintainers/narration-and-conversations.md).
- Limits and constraints: [Narration and conversations inventory](../limits/narration.md).
- Related design: [Technical design](conversation-compaction-tech-design.md).
- Current semantic owners: [Memory architecture](../memory-architecture.md) and [Narration, agent responses and conversations](../narration-and-conversations.md).
- Research: [Conversation state and grounding](../../archive/02-research/conversation-state-and-grounding.md) · [Long-conversation memory and compaction](../../archive/02-research/long-conversation-memory-and-compaction.md).
