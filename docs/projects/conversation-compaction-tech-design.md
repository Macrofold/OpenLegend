# Long-conversation continuity and compaction — technical design

**Status:** proposed design only; no runtime implementation is authorized by this document. [Feature specification](conversation-compaction-feature-spec.md) owns behavior. [NC14–NC17](../maintainers/narration-and-conversations.md) track implementation if approved.

## 1. Architectural decision

Put all model-facing conversation history behind one small server entry point. Callers ask for the conversation context available to one actor at one decision snapshot; they do not load transcripts, choose recent windows, call a summarizer or understand stored compaction state themselves.

Illustrative boundary:

```ts
buildConversationContext({
  actorId,
  conversationId,
  snapshot,
  maxBytes,
  requestId,
  signal,
  budgetCeiling,
}) -> ConversationContextProjection
```

The exact name/type is implementation detail. The important contract is one semantic owner.

That owner performs, in order:

1. resolve the actor's permitted speech from existing event-time awareness;
2. determine whether it fits the supplied conversation allowance;
3. if needed, load or update actor-specific derived compaction;
4. retain a recent verbatim tail;
5. return one bounded projection plus diagnostics/bindings for validation.

`response-context.ts`, immediate cognition and future model-facing conversation consumers use this boundary rather than recreating compaction policy.

## 2. Existing owners reused

The feature does not create a second transcript or memory authority.

- `journal.world_events` / conversation turns remain the durable speech source.
- actor awareness remains the disclosure boundary and source of personally experienced speech.
- conversation identity/lifecycle remains owned by the existing conversation subsystem.
- current trigger evidence remains owned by cognition/response context and is not summarized away.
- commitments, corrections, forgetting, knowledge and accepted mind state keep their existing owners.
- provider dispatch, spending, cancellation and no-automatic-retry behavior reuse the existing AI boundary.

The compactor consumes actor-permitted rendered speech. It never receives an unrestricted conversation and then decides what the actor was allowed to know.

## 3. Minimal derived state

V1 stores at most one current rolling compaction per world generation, actor and conversation.

Illustrative record:

```ts
ConversationCompaction {
  worldId
  generation
  actorId
  conversationId
  throughAwarenessSequence
  summary
  compactorVersion
  updatedAt
}
```

Only `summary` is model-facing. `throughAwarenessSequence` means every eligible conversation-speech awareness row for this actor at or before that actor-owned sequence was considered when building the summary. Gaps caused by unheard speech are expected and reveal nothing.

`compactorVersion` lets a focused future change to prompt/format invalidate old derived output without changing callers or transcript storage.

Do not add per-topic rows, fact nodes, source trees or separate open-question records in v1.

The row is rebuildable derived state. Full speech and awareness remain authoritative. Same-version persistence may cache the row across restarts; restore generation prevents reuse across restored timelines.

## 4. Model-facing persistence rubric

The rolling summary is free prose generated under a compact, explicit rubric rather than a large structured ontology.

Preserve only what is useful to continue the exchange:

- established context the current conversation still relies on;
- current threads still being discussed/asked/negotiated/decided;
- material changes such as corrections, clarifications, reversals and resolutions;
- explicit interaction state that still matters, such as acceptance, refusal, preference, boundary, apology or disagreement;
- attribution and uncertainty where losing them would change meaning.

Prefer the latest clarified state while retaining the fact of disagreement/uncertainty when it remains relevant. Compress repetition, greetings, filler, superseded wording and resolved detail that no longer affects the exchange.

Do not infer hidden motives or turn attributed speech into objective truth.

These are summarization instructions, not separately writable engine records.

## 5. Compaction algorithm

The entry point receives an explicit byte allowance from the surrounding context builder. V1 uses bytes rather than turn counts.

1. Read personally permitted speech in chronological actor-awareness order through the decision snapshot.
2. Render it using the same perspective/identity rules used for normal conversation context.
3. If the complete rendered conversation fits the allowance, return it verbatim. Do not call a model.
4. Otherwise choose the newest verbatim suffix that leaves room for a compact older-history representation.
5. Determine the older prefix that must be compacted.
6. If an existing valid compaction covers part of that prefix, send the existing summary plus only newly aged-out permitted turns to the compactor. Otherwise summarize the necessary older prefix from permitted history.
7. Validate the bounded result and save it atomically with its new `throughAwarenessSequence`.
8. Return `summary + recent verbatim suffix` within the allowance.
9. The current trigger remains independently included through the existing Trigger section even if it also appears in the recent conversation tail.

The exact split between summary and recent text is configurable policy. Do not introduce a semantic turn-count cutoff. The first implementation should choose a conservative byte allocation and tune it from traces.

Repeated summary-plus-new-turns compaction is accepted for v1 because it is simple and cheap. If evaluation shows material recursive drift, replace the internal strategy behind the same entry point rather than changing its callers.

## 6. Provider execution

Use the existing OpenLegend AI generation boundary with a small/cleanup-capable model route and strict output-size validation. No Letta, LangChain, Zep, Mem0 or provider-specific opaque compaction dependency is required.

The input contains:

- the prior summary when valid;
- newly compacted actor-perspective turns in chronological order;
- the concise persistence rubric above.

It does not need current world state, inventory, hidden conversation rows or unrelated memory.

Compaction is on-demand. Do not proactively summarize every conversation in the background.

Existing spending admission applies. There is no automatic paid retry/fallback. A rejected/failed compaction leaves the previous valid row unchanged.

## 7. Authority, privacy and stale-result checks

Scope before relevance/compaction:

```text
durable conversation
  -> actor event-time awareness
  -> actor-perspective rendered speech
  -> compaction
  -> model-facing conversation projection
```

Never reverse the first two steps.

Before accepting an asynchronous compaction result, revalidate world generation and the actor/conversation source boundary used by the request. If relevant source eligibility changed, discard the result.

A compaction result grants no authority. It cannot mutate commitments, beliefs, goals, relationships, plans, knowledge or events.

## 8. Invalidation kept intentionally coarse

V1 does not build source-level dependency graphs.

Invalidate the affected actor's conversation compaction when:

- the world restore generation changes;
- a source speech/awareness record represented by that conversation is corrected, forgotten or authoritatively edited;
- disclosure changes make prior model-facing content ineligible;
- `compactorVersion` changes.

If cheaply identifying the affected conversation is awkward for an existing correction/forgetting path, invalidating all conversation compactions for that actor is acceptable. These operations are rare compared with normal turns, and rebuilding from authoritative history is safer than fine-grained dependency machinery.

Appending ordinary new speech does not invalidate the old summary; it simply becomes new recent dialogue and later input to the next compaction.

## 9. Failure and concurrency

Compaction updates use stable request/attempt identity and the existing AI cancellation/spending contracts.

If the full transcript does not fit and no valid projection can be produced within the current allowance, fail the response explicitly. Do not:

- silently drop the oldest turns;
- use a summary from another actor;
- reuse a stale restore generation;
- automatically retry a paid provider;
- treat the failure as evidence that older conversation did not exist.

Two compaction attempts for the same actor/conversation should serialize or install only when their expected source boundary is still current. A later successful compaction supersedes an earlier derived row; neither modifies transcript history.

## 10. Inspection

Cognition inspection should expose enough information to diagnose continuity without exposing anything beyond the inspected actor's existing authorization:

- conversation ID;
- whether full or compacted context was used;
- count/bytes of permitted speech considered;
- compaction coverage sequence;
- summary bytes;
- recent verbatim bytes/turn count;
- exact summary and recent model-facing text;
- compactor version;
- explicit compaction failure/omission reason.

This should reuse existing grouped cognition/debug surfaces rather than create a new UI subsystem.

## 11. Save/load and storage

The full transcript and awareness are the saved truth. Conversation compaction is derived state.

For supported same-version persistence, cache it in the server's existing durable derived-data/storage boundary so a restart need not repeatedly pay to summarize the same history. Key by restore generation and reject mismatches. It does not require a new portable fictional-memory format or per-feature save version.

A rebuild is always possible from the actor's retained permitted history. Restore must never dispatch a model merely to reconstruct caches; reconstruction occurs lazily when conversation context is next required and spending is admitted.

## 12. Performance

The hot path remains cheap for ordinary conversations: load/render current conversation and return it if it fits.

The model compaction call occurs only when newly aged-out text must be summarized. Cached rolling state makes later work proportional to the newly compacted portion rather than the entire lifetime transcript.

Database preparation still needs a bounded path for fetching the relevant permitted rows. Existing repository admission limits remain safety boundaries; implementation must not replace one oversized model request with an unbounded hydration loop.

No embeddings or vector search are needed because the task is sequential compression of one known conversation, not open-ended recall.

## 13. Extension seam

The single entry point is the intentional extension seam.

Potential future strategies can implement the same contract:

- source-backed hierarchical summaries if recursive drift is measured;
- a different summarization model;
- deterministic extraction for particular conversation types;
- retrieval from older verbatim turns for a rare exact-quote need.

None requires cognition callers to know how compaction works.

Extraction is warranted only when a measured scenario cannot be solved cleanly by the rolling strategy.

## 14. Implementation stages

**NC14 — boundary and contract.** Add the single conversation-context owner, route existing full-transcript behavior through it, preserve current semantics and expose baseline diagnostics.

**NC15 — rolling actor-scoped compaction.** Add derived storage, on-demand generation, byte-budgeted recent tail and atomic/stale-safe installation.

**NC16 — lifecycle and consumers.** Integrate correction/forgetting/restore invalidation, response-context rendering and authorized inspection; keep existing mandatory semantic context separate.

**NC17 — qualification.** Exercise long conversations across planning, negotiation, correction, disagreement, personal disclosure and multi-party/overhearing cases; measure context size, compaction frequency and continuity failures before tuning policy.

## 15. Verification criteria

Verify at minimum:

- short conversation parity with current full-transcript rendering;
- long conversation continuation under the request allowance;
- exact current trigger and recent-turn preservation;
- actor-specific partial-hearing and late-join privacy;
- attributed disputed claims and successive correction/reversal;
- current thread persistence without special promise/task records;
- stale-summary rejection after correction/forgetting/restore;
- compactor failure without silent truncation;
- restart reuse of valid derived compaction without model dispatch during restore;
- concurrent new speech/compaction cannot install a stale boundary.

Live model quality, deterministic privacy fixtures and storage/performance measurements are separate evidence classes.

## 16. Tradeoffs and open decisions

The rolling summary can accumulate semantic drift across many generations. That is an accepted v1 tradeoff because hierarchical provenance would add complexity before evidence shows it is needed. Raw history remains available for rebuilding and future strategies.

The summary rubric is intentionally broad rather than a fixed conversation ontology. This makes the first version adaptable to ordinary dialogue while relying on existing semantic owners for mechanically important obligations and corrections.

**Blocking implementation decisions:** exact byte allocation and selected configured cleanup model should be chosen against the actual request budget/provider at implementation time. They do not change the architecture.

## Maintained records

- Implementation: [Narration and conversation tasks, NC14–NC17](../maintainers/narration-and-conversations.md).
- Limits and constraints: [Narration and conversations inventory](../limits/narration.md).
- Related behavior: [Feature specification](conversation-compaction-feature-spec.md).
- Current semantic owners: [Memory architecture](../memory-architecture.md) and [Narration, agent responses and conversations](../narration-and-conversations.md).
