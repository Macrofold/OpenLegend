# Long-conversation continuity and compaction — technical design

**Status:** implemented and locally qualified on 2026-09-27, following developer approval and the updated remote design. [Feature specification](conversation-compaction-feature-spec.md) owns behavior. [NC14–NC17](../maintainers/narration-and-conversations.md) record delivery; NC18 tracks conditional future work; [runtime evidence and limits](../verification/conversation-compaction.md#conversation-compaction) distinguish native checks, live constructed scenarios and broader acceptance still outside this slice.

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

The rolling summary is free prose generated under a compact, explicit rubric rather than a large structured ontology. The research synthesis maps classic dialogue-state/common-ground ideas to three OpenLegend-friendly concerns:

- **Established conversational context:** earlier attributed claims, explanations, decisions, constraints, shared labels and relevant relationships that later turns still rely on.
- **Active issues and focus:** what is still being asked, discussed, negotiated, explained, disputed, decided or deferred, plus enough context to understand follow-ups.
- **Updates and repairs:** explicit corrections, clarifications, reversals, retractions, resolutions and later changes that supersede or qualify earlier conversational state.

Cross-cutting rules:

- preserve speaker/source and actor perspective when losing them changes meaning;
- preserve explicit acceptance, disagreement and uncertainty when material, and never infer mutual agreement from mere utterance or silence;
- preserve useful temporal, spatial, attributive and comparative relationships that identify conversational referents;
- prefer the latest explicitly clarified state while retaining disagreement/uncertainty or the fact of a correction when needed to interpret the exchange;
- never decide objective truth, infer hidden motives, invent a correction from contradiction alone, or upgrade hearsay into observed evidence.

Compress repetition, greetings, filler, duplicated explanation, clearly superseded wording whose replacement is retained, and resolved detail that no longer affects interpretation. Initial tuning should bias toward **recall before brevity**; summary elegance is less important than continuity.

These are summarization instructions, not separately writable engine records. Do not add QUD records, dialogue-act labels, a common-ground store, per-topic rows or grounding-status fields in v1.

Research basis: [conversation state and grounding](../../archive/02-research/conversation-state-and-grounding.md) and [long-conversation memory and compaction](../../archive/02-research/long-conversation-memory-and-compaction.md).

### Research-to-runtime mapping

The compaction rubric is a deliberately small adaptation of established dialogue architectures:

- **Dialogue Gameboard / information state:** the entire model-facing conversation projection is an incrementally maintained information state rather than an ever-growing transcript.
- **Common ground / grounding → established conversational context:** preserve what this actor's continuation can rely on, without promoting an utterance to objective truth or silently assuming mutual acceptance.
- **Questions Under Discussion (QUD) + discourse focus/Centering Theory → active issues and focus:** preserve what currently organizes the exchange and enough referential context for follow-ups.
- **Conversational repair / clarification → updates and repairs:** explicit corrections, clarifications, reversals, retractions and resolutions update the compact representation.
- **LatestMove / local discourse coherence → recent verbatim tail + exact Trigger:** do not summarize away the newest turns whose wording, pronouns and local structure matter directly.
- **Persistent referential grounding → reference continuity:** preserve actor-relative temporal, spatial, attributive and comparative relationships needed for later references.

These mappings are conceptual guidance for the summarizer and verification suite, **not new authoritative runtime record families**. The implementation remains one rolling derived summary plus recent exact turns behind one entry point.

## 5. Enforcement model: hard invariants versus compaction-quality requirements

Not every rule in this design is enforced the same way. Privacy, authority, timeline validity and exact recent context are **hard runtime invariants**. Semantic fidelity inside generated summary prose is a **model-quality requirement** enforced by prompt design, inspection and qualification rather than pretending an LLM guarantee is deterministic.

The intended flow is:

```text
authoritative durable conversation
        ↓
actor event-time awareness filter                 HARD
        ↓
actor-perspective rendered speech                 HARD
        ↓
full transcript fits?
   ├─ yes → return permitted speech verbatim      HARD
   └─ no
        ↓
older-history summarization prompt                MODEL QUALITY
        ↓
size/shape validation + source/timeline recheck   HARD
        ↓
summary + recent verbatim tail                    mixed
        +
exact current Trigger + existing mandatory state HARD
        ↓
NPC response generation
```

| Requirement                                                                                    | Enforcement in v1                                                                                                     |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| NPC receives only speech it was allowed to perceive                                            | **Hard:** actor event-time awareness scopes input before the compactor sees it.                                       |
| Late join/partial hearing cannot expose earlier or unheard speech                              | **Hard:** there is no global conversation summary; compaction is actor-scoped after disclosure filtering.             |
| Current triggering speech stays exact                                                          | **Hard:** owned by the existing Trigger context and never depends on the older-history summary.                       |
| Recent dialogue stays exact                                                                    | **Hard:** retained as a verbatim suffix rather than represented only by generated summary prose.                      |
| Summary cannot create world facts, knowledge, commitments, goals, relationships or permissions | **Hard authority boundary:** the summary is derived read-only context; existing semantic owners remain authoritative. |
| Restore/correction/forgetting cannot reuse stale compaction                                    | **Hard:** generation/source-boundary checks and invalidation reject stale derived state.                              |
| Summary stays within its admitted size/format                                                  | **Hard:** validate output before installing it.                                                                       |
| Preserve speaker attribution and actor perspective inside summarized material                  | **Prompt + qualification:** actor-perspective source text helps, but generated prose remains fallible.                |
| Do not infer agreement from an assertion or silence                                            | **Prompt + qualification.**                                                                                           |
| Preserve explicit corrections, clarification, disagreement and uncertainty                     | **Prompt + qualification;** existing authoritative correction records remain separately protected when applicable.    |
| Preserve active issues/focus and useful relational references                                  | **Prompt + qualification.**                                                                                           |
| Prefer recall/continuity over elegant brevity                                                  | **Prompt/tuning policy + qualification.**                                                                             |

A generated summary that passes structural validation is **not certified semantically correct**. V1 deliberately does not add a second paid LLM “summary verifier”: that would add another fallible inference step, cost and latency without turning semantic fidelity into a hard guarantee. Instead, raw history remains available, exact model-facing summaries are inspectable, and [NC17](../maintainers/narration-and-conversations.md) qualifies the model/prompt against adversarial and natural conversation scenarios.

## 6. Compaction algorithm

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

## 7. Provider execution

Use the existing OpenLegend AI generation boundary with a model route qualified for attributed compaction and strict output-size validation. Live qualification selected the configured complex reasoning route at low effort after smaller routes lost material distinctions; see the [implementation policy](#17-tradeoffs-and-open-decisions). No Letta, LangChain, Zep, Mem0 or provider-specific opaque compaction dependency is required.

The input contains:

- the prior summary when valid;
- newly compacted actor-perspective turns in chronological order;
- the concise persistence rubric above.

The compaction instruction should frame the model as a **reporter of the supplied conversation, not an adjudicator**: maintain continuity, preserve material attribution/uncertainty/reference relationships, and do not critique, correct, interpret or presume beyond what the dialogue establishes. This is a prompt rule, not a claim that the generated summary is semantically infallible.

It does not need current world state, inventory, hidden conversation rows or unrelated memory.

Compaction is on-demand. Do not proactively summarize every conversation in the background.

Existing spending admission applies. There is no automatic paid retry/fallback. A rejected/failed compaction leaves the previous valid row unchanged.

## 8. Authority, privacy and stale-result checks

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

## 9. Invalidation kept intentionally coarse

V1 does not build source-level dependency graphs.

Invalidate the affected actor's conversation compaction when:

- the world restore generation changes;
- a source speech/awareness record represented by that conversation is corrected, forgotten or authoritatively edited;
- disclosure changes make prior model-facing content ineligible;
- `compactorVersion` changes.

If cheaply identifying the affected conversation is awkward for an existing correction/forgetting path, invalidating all conversation compactions for that actor is acceptable. These operations are rare compared with normal turns, and rebuilding from authoritative history is safer than fine-grained dependency machinery.

Appending ordinary new speech does not invalidate the old summary; it simply becomes new recent dialogue and later input to the next compaction.

## 10. Failure and concurrency

Compaction updates use stable request/attempt identity and the existing AI cancellation/spending contracts.

If the full transcript does not fit and no valid projection can be produced within the current allowance, fail the response explicitly. Do not:

- silently drop the oldest turns;
- use a summary from another actor;
- reuse a stale restore generation;
- automatically retry a paid provider;
- treat the failure as evidence that older conversation did not exist.

Two compaction attempts for the same actor/conversation should serialize or install only when their expected source boundary is still current. A later successful compaction supersedes an earlier derived row; neither modifies transcript history.

## 11. Inspection

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

## 12. Save/load and storage

The full transcript and awareness are the saved truth. Conversation compaction is derived state.

For supported same-version persistence, cache it in the server's existing durable derived-data/storage boundary so a restart need not repeatedly pay to summarize the same history. Key by restore generation and reject mismatches. It does not require a new portable fictional-memory format or per-feature save version.

A rebuild is always possible from the actor's retained permitted history. Restore must never dispatch a model merely to reconstruct caches; reconstruction occurs lazily when conversation context is next required and spending is admitted.

## 13. Performance

The hot path remains cheap for ordinary conversations: load/render current conversation and return it if it fits.

The model compaction call occurs only when newly aged-out text must be summarized. Cached rolling state makes later work proportional to the newly compacted portion rather than the entire lifetime transcript.

Database preparation still needs a bounded path for fetching the relevant permitted rows. Existing repository admission limits remain safety boundaries; implementation must not replace one oversized model request with an unbounded hydration loop.

No embeddings or vector search are needed because the task is sequential compression of one known conversation, not open-ended recall.

## 14. Extension seam

The single entry point is the intentional extension seam.

Potential future strategies can implement the same contract:

- periodic rebuild from source-backed chunks if recursive drift is measured;
- topic-coherent source-backed segments if old topics are repeatedly lost when revisited;
- targeted retrieval from older permitted verbatim turns if the current trigger requires detail absent from the rolling summary;
- source-backed hierarchical/temporal summaries if conversations become long enough to justify them;
- a different summarization model or deterministic extraction for a demonstrated conversational family.

None requires cognition callers to know how compaction works.

Prefer that order of escalation before introducing a general conversation graph. Extraction or retrieval is warranted only when measured scenarios cannot be solved cleanly by the rolling strategy.

These are **future improvement candidates, not committed v1 implementation**. [NC18](../maintainers/narration-and-conversations.md) is the single conditional follow-up owner: it is activated only by measured NC17 failures and evaluates the smallest research-backed mechanism that addresses the observed failure. It explicitly includes source-backed rebuilds, topic segmentation, targeted retrieval, hierarchical/temporal memory and—only for demonstrated needs—richer dialogue structures such as QUD/commitment/grounding state or temporal graphs. Individual research ideas are not separate implementation tasks until evidence selects one.

## 15. Implementation stages

**NC14 — boundary and contract.** Add the single conversation-context owner, route existing full-transcript behavior through it, preserve current semantics and expose baseline diagnostics.

**NC15 — rolling actor-scoped compaction.** Add derived storage, on-demand generation, byte-budgeted recent tail and atomic/stale-safe installation.

**NC16 — lifecycle and consumers.** Integrate correction/forgetting/restore invalidation, response-context rendering and authorized inspection; keep existing mandatory semantic context separate.

**NC17 — qualification.** Exercise long conversations across planning, negotiation, correction, disagreement, personal disclosure, relational reference, self/other perspective, implicit callback, old-topic return, abstention and multi-party/overhearing cases; measure context size, compaction frequency and continuity failures before tuning policy.

**NC18 — conditional richer-strategy evaluation.** Only if NC17 demonstrates a repeatable failure of the rolling-summary design, evaluate the smallest relevant candidate behind the same entry point: source-backed rebuild, topic-coherent segments, targeted older-turn retrieval, hierarchical/temporal summaries, or richer dialogue/graph state where the failure specifically warrants it. This item does not pre-authorize implementing all candidates.

## 16. Verification criteria

Verify at minimum:

- short conversation parity with current full-transcript rendering;
- long conversation continuation under the request allowance;
- exact current trigger and recent-turn preservation;
- actor-specific partial-hearing and late-join privacy;
- attributed disputed claims without silent promotion to agreement;
- successive correction/reversal without inventing a repair from contradiction alone;
- active-issue persistence without special promise/task records;
- temporal/spatial/attributive/comparative reference continuity among similar entities;
- self/other perspective in relational references;
- natural implicit use of older context without an explicit memory question;
- return to an old topic after many intervening turns, recorded as the main trigger for a richer future strategy if flat compaction fails;
- abstention when the relevant detail was unheard, indistinct or unresolved;
- stale-summary rejection after correction/forgetting/restore;
- compactor failure without silent truncation;
- restart reuse of valid derived compaction without model dispatch during restore;
- concurrent new speech/compaction cannot install a stale boundary.

Live model quality, deterministic privacy fixtures and storage/performance measurements are separate evidence classes.

## 17. Tradeoffs and open decisions

The rolling summary can accumulate semantic drift across many generations. That is an accepted v1 tradeoff because hierarchical provenance would add complexity before evidence shows it is needed. Raw history remains available for rebuilding and future strategies.

The summary rubric is intentionally broad rather than a fixed conversation ontology. Classic dialogue-state work motivates established context, active issues/focus and recent moves, while grounding/repair work motivates explicit handling of updates and uncertainty; none requires new authoritative dialogue records. This keeps v1 adaptable while relying on existing semantic owners for mechanically important obligations and corrections.

**Implementation policy:** use the configured complex reasoning model at low effort; live qualification rejected nano cleanup after attribution/boundary drift and mini after it invented disagreement from distinct overheard participants. Attributed third-person prose plus an explicit memory-owner binding addresses speaker/listener confusion. [Evidence](../verification/conversation-compaction.md#conversation-compaction) records the trials; the initial byte allocation and cold-preparation ceiling are recorded in [LA236](../limits/narration.md#la236). These are tunable context policy, not conversational semantics. No blocking product decisions remain.

## Implementation plan — 2026-09-26

Scope is NC14–NC17, approximately 700–1,100 changed logic lines. The privacy, asynchronous publication and persistence contracts make this substantial work. The initial base was `Macrofold/OpenLegend` `origin/main` at `45210d41075dc1db09dbd48f562b76b8b39bcc10`. On 2026-09-27 the developer explicitly selected the updated `origin/design/conversation-compaction` at `33bbfde1e8f38480407f19f96dace25fb6719f8b`. Implementation was checkpointed locally and rebased cleanly onto that ref; its researched rubric and expanded qualification take precedence.

1. Add a single server conversation-context owner and reuse the existing actor-perspective speech renderer. Give it the remaining conversation byte allowance before optional recall/action selection. Route immediate cognition and reflection through it; keep current trigger and mandatory semantic records separate.
2. Read bounded actor-scoped conversation metadata from the memory repository, hydrate only uncovered speech, and store one derived rolling row per actor/conversation. Bind cached coverage to source revisions, perspective, compactor version and restore generation. Revalidate and install atomically; concurrent competing publication must fail explicitly.
3. Generate bounded prose with the existing configured reasoning execution route through the caller's admitted/accounted AI boundary. Use stable attempt/chunk identities, cancellation and explicit failure with no retry. Split large permitted prefixes into bounded chronological inputs; retain the existing 8,192-row/4-MiB preparation ceilings and fail visibly at capacity rather than omit evidence.
4. Reuse cognition diagnostics for full/compacted mode, source/summary/recent bytes, coverage and exact projection. Preserve full speech storage. Reconcile the persistent owners, limits, tracker, implementation snapshot and decision history.
5. Verify with pinned formatting, TypeScript and production build; exercise disposable PostgreSQL worlds and downstream context assembly with short, long, corrected, disputed, private and partial-hearing input, failed/cancelled generation, stale publication, restart and restore. Measure bounded history preparation and repeated compaction over 1,000+ turns, including assertion versus agreement, explicit repair versus contradiction, temporal/spatial/comparative references, I/you perspective, implicit callbacks, old-topic return and unknown/abstention. Inspect both projection fidelity and downstream behavior; fixture summaries only establish plumbing. No automated test suites are authorized by default. Live continuity qualification needs configured authorized credentials and a credible bound within the shared $10 task ceiling; report unavailable evidence separately.

Completion means integrated NC14–NC16 behavior, all feasible NC17 scenarios exercised, full diff reviewed and in-scope findings fixed. Keep unverified live quality acceptance open rather than claiming deterministic fixture output proves model quality.

## Delivery — 2026-09-27

NC14–NC17 are complete for this slice. One shared owner, atomic derived storage, lifecycle invalidation, admitted generation, exact-source bindings and authorized diagnostics are implemented. Both SQL adapters passed native lifecycle/failure scenarios; final live qualification exercised repeated compaction and game-path callbacks. Review fixes addressed publication-time cancellation, evidence binding, serialized input bounds and cold PostgreSQL query planning. [Verification](../verification/conversation-compaction.md#conversation-compaction) records measured results, provider accounting and the limits of constructed-case qualification; broader integrated acceptance stays with NC12.

## Requested implementation review — 2026-09-27

Review the complete NC14–NC17 implementation against the updated design, including source/privacy ownership, asynchronous admission, persistence, byte bounds, repeated work, modularity and comments. The reviewed scope is approximately 650 logic lines; expected fixes are localized, but disclosure and publication paths remain high consequence. Refreshed `origin/design/conversation-compaction` is still `33bbfde1e8f38480407f19f96dace25fb6719f8b`, already an ancestor of the preserved implementation; no history rewrite is needed.

1. Trace both cognition consumers through preparation, generation and mutation; reproduce concrete failures before fixing them.
2. Measure cold/warm preparation with representative histories, remove redundant work within existing owners and simplify code only where semantics remain explicit. Preserve the rolling-summary seam and qualified prompt unless evidence requires changing them.
3. Recheck native lifecycle/privacy failures through downstream callers on disposable stores, with zero-cost generation fixtures; run formatting, TypeScript and build checks for changed code. Use live calls only if a changed prompt/model requires requalification, within the existing shared task ceiling.
4. Review the resulting full diff, update comments beside non-obvious invariants and reconcile the canonical owners, limits, tracker and evidence. Completion requires all actionable in-scope findings fixed and verified, with remaining broader acceptance stated accurately.

Review completed: reproduced and fixed covered-speech reintroduction through recent-memory/duplicate grouping, concurrent awareness edits crossing a SQL validation read, and custom-store forgetting/edit checks. Shared metadata selection and snapshot fingerprints reduce repeated work without introducing another cache, queue or memory authority. Cache publication derives its actor/conversation key internally. Comments explain the read-publication fence, immutable-world reuse and independently protected evidence; the qualified v8 prompt/model policy is unchanged. [Review evidence](../verification/conversation-compaction.md#conversation-compaction-review) records matched measurements and remaining limits.

## Main integration — 2026-09-27

Rebase the reviewed implementation onto the developer-selected `origin/main` at `1e17fcac82eec8a849278108f1c516cfb1650fab`. Expected runtime reconciliation is under 30 logic lines, concentrated in privacy-sensitive speech eligibility; preserve main's listener-specific capsules, embedding publication fences, narration failure policy and protected development-save instructions alongside compaction and its remaining-work rule.

Carry the existing heard-word predicate into SQL and resident conversation selection, preserve main's speech embedding text/revisions, and retain compaction's required-source distinction. Keep both sets of independent documentation and evidence. Review the resulting branch diff and run TypeScript, build, guidance/format/link checks plus fresh current-format native scenarios for short/long conversation, heard fragments versus no-word/visual cues, source revocation and actual cognition. Use zero-cost fixtures, not paid requalification or old-save migration. Completion requires a clean rebased branch and evidence of the combined behavior; broader PF14/NC12 work remains separately tracked.

Integration completed with the existing hearing predicate preserved in both source paths and all independent guidance/history retained. [Rebase evidence](../verification/conversation-compaction.md#conversation-compaction-main-rebase) records current-format SQLite/PostgreSQL lifecycle, cognition/reflection and source-race checks. That rebase left PF14 preparation consolidation unimplemented; its subsequent implementation is tracked in the [PostgreSQL/preparation plan](postgresql-cognition-preparation.md). NC12 maintained automation and independent live qualification remain deferred under the existing test/spending policy. Earlier model-quality and performance measurements retain their original revision/workload scope.

## Maintained records

- Implementation: [Narration and conversation tasks, NC14–NC18](../maintainers/narration-and-conversations.md).
- Limits and constraints: [Narration and conversations inventory](../limits/narration.md).
- Related behavior: [Feature specification](conversation-compaction-feature-spec.md).
- Current semantic owners: [Memory architecture](../memory-architecture.md) and [Narration, agent responses and conversations](../narration-and-conversations.md).
- Research: [Conversation state and grounding](../../archive/02-research/conversation-state-and-grounding.md) · [Long-conversation memory and compaction](../../archive/02-research/long-conversation-memory-and-compaction.md).
