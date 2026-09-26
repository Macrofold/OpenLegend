# Memory, knowledge and consolidation: limits and constraints

[Feature contract](../memory-architecture.md) · [Implementation work](../maintainers/cognition-redesign.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [experience.ts](../../packages/domain/src/experience.ts), [memory-repository.ts](../../apps/server/src/memory-repository.ts), [cognition-maintenance.ts](../../apps/server/src/cognition-maintenance.ts).

## LA007

**Historical — needs recheck · Restrictiveness: Safe.**

Retrieval of verbatim speech uses the latest 512 speech experiences available to the character.

**Reason / tradeoff:** Allow searches of older retained speech while keeping recent messages from the current conversation directly available.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Expand**.

## LA008

**Historical — needs recheck · Restrictiveness: Very safe.**

The text used to search a character's memories includes only the first 8 matching lines from their private mind text, cut to 1,600 characters.

**Reason / tradeoff:** Choose search clues by relevance instead of where they appear in the character's private text.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Replace**.

## LA009

**Historical — needs recheck · Restrictiveness: Safe.**

The text sent to generate a meaning-based search query must fit within 8,000 bytes of encoded text.

**Reason / tradeoff:** Keep a finite query-size limit, and explain oversized-query failures instead of treating them as no matching memories.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Keep**.

## LA010

**Historical — needs recheck · Restrictiveness: Safe.**

One foreground memory-selection request indexes at most 32 previously unindexed records for meaning-based search.

**Reason / tradeoff:** Keep indexing work per decision bounded, but report incomplete search coverage and preserve required facts through direct retrieval.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Review**.

## LA011

**Historical — needs recheck · Restrictiveness: Safe.**

The background worker indexes speech for meaning-based search in batches of 32 records.

**Reason / tradeoff:** Keep the batch size; remaining speech can be processed in later batches rather than discarded.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Keep**.

## LA012

**Historical — needs recheck · Restrictiveness: Safe.**

The server keeps reusable numerical search representations for only 16 recent queries.

**Reason / tradeoff:** Keep this cache limit; an evicted query can be recomputed without deleting its source memories.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Keep**.

## LA013

**Historical — needs recheck · Restrictiveness: Safe.**

Raw experiences become eligible for replacement by summaries after 6 game hours; this age alone does not prevent recalling them.

**Reason / tradeoff:** Keep the distinction between summarization eligibility and recall eligibility; do not hide an experience merely because it is older than six hours.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Keep**.

## LA014

**Changed — current SQL path checked · Restrictiveness: Liberal.**

The former 512-raw-record preselection is bypassed by repository-backed recall. PostgreSQL ranks current eligible indexed sources, returns 300 optional results, and supplements required sources; unindexed/SQLite fallback uses importance and recency. Repository selection accepts 1–1,000. The legacy in-memory 512 setting still exists.

**Reason / tradeoff:** Search retained eligible history before limiting returned results; keep model context bounded. This does not guarantee semantic recall of unindexed sources.

[Implementation starting point](../../apps/server/src/recall.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA015

**Historical — needs recheck · Restrictiveness: Safe.**

An experience with importance at least 8 out of 10 receives special protection during memory summarization.

**Reason / tradeoff:** Review whether the importance score reliably identifies memories that must survive unchanged before moving the cutoff.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Review**.

## LA016

**Historical — needs recheck · Restrictiveness: Safe.**

Ordinary memories produced by summarizing earlier experiences can expire after 30 game days; specially protected memories follow different retention rules.

**Reason / tradeoff:** Treat thirty-day forgetting as a character-memory design decision, not a performance requirement to remove automatically.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Review**.

## LA017

**Historical — needs recheck · Restrictiveness: Safe.**

Each generated memory summary must fit 1,200 bytes; the model response format also imposes a separate 1,200-character check.

**Reason / tradeoff:** Allow longer summaries when needed to preserve meaning, and use consistent size accounting for text containing non-English characters.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Expand**.

## LA018

**Historical — needs recheck · Restrictiveness: Too liberal.**

8,192 awareness records or 8,208 personal memories signal delayed summarization, but no longer stop simulation or cap total stored history.

**Reason / tradeoff:** Preserve movement and memories while improving long-history storage; this warning threshold alone does not prevent unlimited history growth.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Review**.

## LA019

**Historical — needs recheck · Restrictiveness: Very safe.**

A character's private written mind must contain between 1 and 10 files.

**Reason / tradeoff:** Replace the file-count ceiling with a total text allowance, allowing the character to organize the same amount of information across more files.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Replace**.

## LA020

**Historical — needs recheck · Restrictiveness: Very safe.**

Each file in a character's private written mind is limited to 500 words and 8,000 bytes.

**Reason / tradeoff:** Use a coherent total private-text allowance so important information is not rejected simply because one file needs more space.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Replace**.

## LA021

**Historical — needs recheck · Restrictiveness: Very safe.**

A reflection or dream publishes 1–3 short thoughts for display, each limited to 20 words and 240 characters.

**Reason / tradeoff:** Review this as a presentation choice; the short displayed thoughts do not need to contain the character's complete private reflection.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Review**.

## LA022

**Historical — needs recheck · Restrictiveness: Safe.**

One reflection can update at most 16 knowledge notes, 16 learned names and 8 goals.

**Reason / tradeoff:** Allow larger updates when they fit the request and can be validated and saved together safely.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Expand**.

## LA023

**Historical — needs recheck · Restrictiveness: Safe.**

A character retains only the latest 100 short thoughts produced for display in the thought-history list.

**Reason / tradeoff:** Keep a short display-history allowance for now, but make it clear that older thought text is removed from this structure.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Keep**.

## LA024

**Historical — needs recheck · Restrictiveness: Very safe.**

The older structured representation of a character's mind permits 10 prose documents and 80 records describing beliefs, relationships or similar facts.

**Reason / tradeoff:** Replace separate object counts with a total storage allowance and retrieve only relevant information for each decision.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA025

**Historical — needs recheck · Restrictiveness: Safe.**

A model's proposed update to the older structured character mind may contain at most 100,000 bytes.

**Reason / tradeoff:** Keep a total update-size guard to bound validation and saving work; reject oversized updates with an explicit reason.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Keep**.

## LA026

**Historical — needs recheck · Restrictiveness: Safe.**

A displayed thought from the older structured-mind workflow is limited to 2,000 characters and 250 words.

**Reason / tradeoff:** Keep a finite display-text allowance, but distinguish this older workflow from the newer twenty-word reflection output.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Keep**.

## LA027

**Historical — needs recheck · Restrictiveness: Safe.**

An update to the older structured character mind can cite at most 16 evidence records, and each document title is limited to 120 characters.

**Reason / tradeoff:** Preserve all evidence needed to support a belief within a total update allowance; a document-title limit can remain a separate display choice.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA028

**Historical — needs recheck · Restrictiveness: Safe.**

The older character-mind workflow remembers only its latest 300 completed-update identifiers to avoid applying the same update twice.

**Reason / tradeoff:** Tie duplicate-update prevention to durable saved job records before changing how long these identifiers are retained.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA029

**Historical — needs recheck · Restrictiveness: Very safe.**

The memory-query function returns 30 records by default and never more than 300 per call.

**Reason / tradeoff:** Select memories using relevance and available request space, and allow additional query pages rather than permanently hiding results beyond the count.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA030

**Historical — needs recheck · Restrictiveness: Safe.**

The memory-query function returns at most 30,000 bytes by default, with an allowed maximum of 400,000 bytes.

**Reason / tradeoff:** Keep a response-size budget, but align it with the actual model request so the query does not return unusably large results.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Review**.

## LA031

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** The code advertises memory-query quotas of 300 experiences and 400,000 bytes in a metadata object, while separate code enforces the query limits.

**Reason / tradeoff:** Removed the duplicate 300-experience/400,000-byte metadata. The memory-query implementation still enforces its actual limits.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Completed removals**.

## LA082

**Historical — needs recheck · Restrictiveness: Safe.**

Only one background memory-maintenance job runs at a time, and it waits while interactive cognition is busy.

**Reason / tradeoff:** Ensure memory summarization eventually runs even when characters continuously receive interactive requests, without starting unlimited simultaneous paid jobs.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA083

**Historical — needs recheck · Restrictiveness: Safe.**

Background memory maintenance for the same character is spaced at least 60 real seconds apart.

**Reason / tradeoff:** Retain spending control, but adjust the spacing if summarization cannot keep up at faster simulation speeds.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA084

**Historical — needs recheck · Restrictiveness: Safe.**

The maintenance scheduler normally checks hourly for raw experiences older than 6 game hours that can be summarized.

**Reason / tradeoff:** Keep summarization grouped into useful batches, while allowing the scheduler to respond when retained history grows too quickly.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA085

**Historical — needs recheck · Restrictiveness: Safe.**

A daily memory-summary review requires at least 2 source memories or summaries.

**Reason / tradeoff:** Keep this rule when reviewing one source cannot usefully combine information and would only buy unnecessary model work.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Keep**.

## LA086

**Historical — needs recheck · Restrictiveness: Safe.**

Background reflection is spaced at least 1 game hour apart, with additional daily scheduling checks.

**Reason / tradeoff:** Review reflection frequency as intended character behavior rather than assuming every new event needs another reflection call.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA087

**Historical — needs recheck · Restrictiveness: Safe.**

A dream becomes eligible after 7,200 game seconds in the configured resting state.

**Reason / tradeoff:** Treat the two-hour delay as an authored sleep/dream rule, not a universal engine requirement.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA088

**Historical — needs recheck · Restrictiveness: Safe.**

Background memory processing requires health of at least 40%, fullness of at least 30 and no incompatible active work; the older mind-update path also checks energy against 15.

**Reason / tradeoff:** Review whether body condition should delay each kind of mental maintenance, while preserving urgent survival actions.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA089

**Historical — needs recheck · Restrictiveness: Safe.**

Each memory-summarization request is packed into 220,000 characters, with 4,096 characters reserved for instructions and response-format overhead.

**Reason / tradeoff:** Keep complete-source batches small enough for the model, and split additional memories into further authorized requests.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA090

**Historical — needs recheck · Restrictiveness: Safe.**

Each memory-summarization call permits 8,192 output tokens; batch sizing estimates 24,576 output characters plus 128 characters of fixed overhead.

**Reason / tradeoff:** Keep output room for faithful summaries without requiring the model to erase distinctions just to fit the batch.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA193

**Historical — needs recheck · Restrictiveness: Safe.**

The remote character-mind workspace lists 20 files per request, permits 8,000 bytes per authored file and caps a downloaded file response at 16,000 bytes.

**Reason / tradeoff:** Follow file-list pages and align download sizes with allowed files before increasing the character's mind-file capacity.

[Implementation starting point](../../apps/server/src/config.ts).

Original recommendation: **Review**.

## LA208

**Historical — needs recheck · Restrictiveness: Very safe.**

The live player panel receives 20 memory summaries, and the world-owner thought-inspection view receives 100 thoughts.

**Reason / tradeoff:** Keep small initial panels while making additional stored memories or thoughts available through history navigation where retained.

[Implementation starting point](../../apps/server/src/intelligence-log.ts).

Original recommendation: **Replace**.

## LA219

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** When the domain event-handling code creates a memory, it stores identifiers for only the first 8 characters, animals or objects associated with that memory.

**Reason / tradeoff:** Removed the eight-reference memory cutoff. Memory creation copies every supplied permitted reference to the beings and objects involved.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Completed removals**.

## LA220

**Historical — needs recheck · Restrictiveness: Safe.**

A proposed memory summary is limited to 700 characters, and a native repeated-observation check uses a one-game-hour lookback.

**Reason / tradeoff:** Preserve a memory's full meaning and distinguish genuinely new events from repeated descriptions of the same observation.

[Implementation starting point](../../apps/server/src/http.ts).

Original recommendation: **Expand**.

## LA238

**Historical — needs recheck · Restrictiveness: Safe.**

The older structured-mind workflow limits local document and record identifiers to 64 characters.

**Reason / tradeoff:** Keep internal labels bounded and align them with every interface that reads or writes those same documents.

[Implementation starting point](../../apps/server/src/ai-director.ts).

Original recommendation: **Expand**.

## SV09

**Reported · Restrictiveness: Safe.**

**Maintenance preparation:** 128 sources and 512 KiB per batch. Both stored source bytes and normalized input are bounded. Remaining history waits for later batches.

**Reason / tradeoff:** Bound source hydration and model preparation; unfinished eligible history is resumed later.

[Implementation starting point](../../apps/server/src/memory-repository.ts).

## SV10

**Reported · Restrictiveness: Safe.**

**Maintenance publication:** One actor, up to 128 selected source IDs, at most 512 matching records per history table. Excessive aliases or related records cause refusal rather than unlimited loading.

**Reason / tradeoff:** Bound revision/alias validation at publication; protects latency but can refuse unusually connected history.

[Implementation starting point](../../apps/server/src/memory-repository.ts).

## SB07

**Reported · Restrictiveness: Safe.**

Consolidation commits one bounded batch at a time. A day is processed through resumable batches rather than one all-day transaction. This limits how much history can be considered together. An oversized individual source stops that batch rather than being skipped.

**Reason / tradeoff:** Bound maintenance work while preserving source coverage and resumable progress; cross-batch semantic quality remains to be qualified.

## QU10

**Reported · Restrictiveness: Safe.**

Knowledge-note pages: **40 default / 100 maximum**.

**Reason / tradeoff:** Bound each private-note page without limiting total notes.

## MH01

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**Exact vector search has no corpus-size work cap.** No fixed maximum on eligible indexed vectors considered for one actor/model/generation. The application requests 300 optional results; repository selection accepts 1–1,000. SQL orders by exact cosine distance over the scoped vector corpus before applying LIMIT. The scope index is not an approximate nearest-neighbor index.

**Exposure / consequence:** Every semantic recall after sufficient history accumulates; conversations and witnessed events grow sources without extreme item creation. Optional retrieval gets slower or times out; it is not a direct world-stop mechanism. PostgreSQL uses a separate read lane and a 5-second statement timeout, which does not include queued wait or cap cumulative multi-query work.

**Reason / tradeoff:** Preserve complete eligible recall and avoid unqualified approximate-search omissions. Retain this policy while measuring mature corpora; improve/index search with recall-quality evidence rather than silently dropping old memories.

**Evidence:** Existing synthetic PostgreSQL top-100 evidence: about 100,000 sources cost 139 ms median / 319 ms p95 for vector selection and 180 / 498 ms for full local retrieval. These are [prior component measurements](../verification.md#data-foundation-runtime), not fresh measurements of the current top-300 caller. [Implementation](../../apps/server/src/memory-repository.ts) (`readSelection; initialize`). [Revisit C17](../maintainers/limits-audit.md#c17).

## MH02

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**Coverage diagnostics count the whole scoped corpus.** No scanned-row cap in count/readCoverage: COUNT(\*) covers all eligible sources and matching vectors. It returns two scalar counts, not memory bodies. AttentionService.candidates asks for coverage before selection on each recall; a one-row result does not bound database work.

**Exposure / consequence:** Repeated decisions in a mature world repeatedly count growing indexes. Cost can add to recall latency; this pass does not establish that counting dominates vector scoring.

**Reason / tradeoff:** Accurate coverage explains indexed/missing evidence. Prefer maintained revision-scoped counts or cheaper threshold checks if measured; retain truthful diagnostics.

**Evidence:** No new timing measurement; distinguish index scans from payload hydration. [Implementation](../../apps/server/src/memory-repository.ts) (`count; readCoverage; apps/server/src/recall.ts candidates`). [Revisit C17](../maintainers/limits-audit.md#c17).

## MH03

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Lexical recall scores all eligible text before LIMIT.** No candidate-work cap for selectContext(query != null). SQL joins eligible actor sources to their payloads, extracts text, counts query-word matches and sorts before returning at most 300. The null-query recent-history branch uses ordered selection instead.

**Exposure / consequence:** Ordinary invention/world-assistant context reads on a mature actor can scan growing text. PostgreSQL can delay other read-lane work; synchronous SQLite query execution can stall native timers despite a logically separate read connection.

**Reason / tradeoff:** Keep all eligible history discoverable. Use an indexed lexical search and bounded preparation with explicit coverage, not a fixed newest-record prefilter that loses relevant older evidence.

**Evidence:** Source inspection establishes the query shape, not its latency under a natural workload. [Implementation](../../apps/server/src/memory-repository.ts) (`selectContext`). [Revisit C17](../maintainers/limits-audit.md#c17).

## MH04

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Required and conversation evidence is hydrated without a total count cap.** MemoryRepository.context loads every eligible speech ID in the active/relevant conversation. readRequired loads all required sources, correction-linked sources and supplied source/event aliases, then hydrates and constructs candidates. ID chunks (350) and hydration batches (800) bound statements, not the combined result. The separate 300-optional-result limit does not bound this path. commitments also loads all eligible commitments for explicit private inspection.

**Exposure / consequence:** Long dialogue and accumulated protected/corrected evidence can increase memory and CPU on each decision. Later request-byte checks can refuse required context only after preparation; those checks do not bound this earlier work. Creator commitment inspection is less frequent than ordinary conversation recall.

**Reason / tradeoff:** Never silently omit required evidence or conversation continuity. Introduce scoped dependency reads, incremental conversation context and explicit overflow handling before hydration; qualify semantic coverage.

**Evidence:** Callers: decision-context.ts preparation, recall.ts candidates, world-service.ts inspectMemoryContext. [Implementation](../../apps/server/src/memory-repository.ts) (`context; readRequired; hydrate; commitments`). [Revisit C17](../maintainers/limits-audit.md#c17).

## MH05

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**The hot-memory window has no fixed count or byte ceiling.** Residency keeps six simulated hours of raw memory/awareness, unresolved commitments and at least 24 awareness entries per actor. There is no additional fixed count/byte cap on that working set. compactHistory skips unchanged/unexpired collections using cached expiry, but expiry filtering and some encounter preparation iterate resident arrays.

**Exposure / consequence:** Witnessing dense encounters or sustained speech grows recent evidence quickly. Startup, expiry/commit work and encounter preparation can stall native simulation even with cold history excluded. Six game hours is only six real minutes at the current 1× rate; density matters as much as world age.

**Reason / tradeoff:** Keep current evidence accessible while avoiding whole-lifetime hydration. Bound resident processing using consumed indexes/incremental expiry and explicitly designed residency; preserve durable evidence and required outcomes.

**Evidence:** Prior cold-history runs demonstrate cold-source eviction, not a count bound or dense active-window capacity. [Implementation](../../apps/server/src/history-residency.ts) (`compactHistory; world-records.ts load; kernel.ts updateEncounters`). [Revisit C18](../maintainers/limits-audit.md#c18).

## MH06

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Canonical history and derived artifacts have no aggregate retention quota.** No general total-row/byte quota or expiry policy for canonical retained source history, retired source versions, revision-keyed vector cache and attempt provenance. Recall eligibility/forgetting controls access; it does not imply physical deletion. Indexing takes bounded pending batches, while queue/cache/history storage can keep growing.

**Exposure / consequence:** Normal observation, speech, source edits and embedding work accumulate disk use. Eventually backup size, I/O and disk exhaustion matter; a failed durable commit pauses simulation. That is a long-running capacity risk, not evidence that ordinary short play already exhausts disk.

**Reason / tradeoff:** Preserve evidence, correction provenance and paid-artifact reuse until an explicit retention policy exists. Add growth monitoring and policy-owned archival/eviction before destructive pruning; protect important history and uncertain paid execution.

**Evidence:** Production-data D2 owns retention semantics; a storage quota must not silently erase meaningful events. [Implementation](../../apps/server/src/memory-repository.ts) (`project; pending; memory_vector_cache and memory_index_attempts`). [Revisit C20](../maintainers/limits-audit.md#c20).

## MH07

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Explicit owner edits can materialize complete history.** No source-count/byte cap when WorldRecords.withHistory is called without sourceIds. It loads full source and terminal appraisal/contribution histories for selected actors, or the world when actorIds is absent. savePersonEditor, saveWorldEventsEditor and correctMemory use the full-dependency owner path. Bounded consolidation supplies sourceIds and is a different path.

**Exposure / consequence:** A normal creator edit or correction on a mature world can occupy the mutation lane and consume substantial RAM. Large editor request limits do not bound pre-existing dependencies loaded for one small edit.

**Reason / tradeoff:** Corrections must reach all dependent evidence. Replace full materialization with indexed dependency closures and resumable preparation plus atomic publication; never skip affected history just to fit a page.

**Evidence:** Rare explicit owner operations, not every tick or the bounded consolidation path. [Implementation](../../apps/server/src/world-records.ts) (`withHistory; readHistory; world-service.ts withActorHistory`). [Revisit C21](../maintainers/limits-audit.md#c21).

## KG01

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Private-note candidates enumerate all actor documents.** subjectKnowledgeCandidates walks all documents in world.actorKnowledge[actorId], formats nonempty subject notes and creates candidate text before later relevance selection. Individual note lengths are bounded, but document count and total candidate-construction bytes have no bound here. The note collection is resident.

**Exposure / consequence:** Learning about many people or creator-authored notes increases per-decision preparation. It usually grows more slowly than automatic memory/awareness; 10,000 subject notes is an extreme fixture, not a forecast for a normal session.

**Reason / tradeoff:** Keep all known subjects available. Select scoped relevant documents before formatting; keep exact involved-subject lookup and per-document controls.

**Evidence:** Existing 10,000-pad fixture measured candidate projection at 77 ms median / 106 ms p95; [prior fixture evidence](../verification.md#editable-knowledge-and-observer-names), not a new run or natural-growth estimate. [Implementation](../../apps/server/src/knowledge-context.ts) (`subjectKnowledgeCandidates`). [Revisit C07](../maintainers/limits-audit.md#c07).
