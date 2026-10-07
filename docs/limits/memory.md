# Memory, knowledge and consolidation: limits and constraints

[Feature contract](../memory-architecture.md) · [Implementation work](../maintainers/cognition-redesign.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. Entries marked **source inspected 2026-10-06** were checked against review-branch source at `7fddcea7c7c1adf79bd53c1dfa16558111c772d3`; synchronization with newer main is deferred. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. Original recommendations preserve the audit rationale, not fresh implementation approval. In particular, the residual structured-mind helpers in LA024–LA030/LA238 are not the current inner-world publication path; do not expand them merely to preserve an earlier iteration. [DF04](../maintainers/production-data.md#df04--retire-residual-compatibility-paths) owns residual compatibility cleanup. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [experience.ts](../../packages/domain/src/experience.ts), [memory-repository.ts](../../apps/server/src/memory-repository.ts), [cognition-maintenance.ts](../../apps/server/src/cognition-maintenance.ts).

## LA007

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The latest 512 eligible linguistic speech experiences are protected from routine and daily consolidation. Heard partial words qualify; purely seen speech and speech with no intelligible words do not. This is the retained verbatim-speech pool, not a ceiling on searchable history or the current conversation. Repository-backed recall can select older retained eligible sources; the complete permitted active conversation has its own preparation/compaction contract ([LA014](#la014), [MH04](#mh04)).

**Reason / tradeoff:** Keep a finite exact-speech tail without confusing it with a first-512 search filter. The historical proposal to reach older retained speech is partly delivered; further model-facing query continuation needs a demonstrated omission under the existing recall owner.

[Speech-pool owner](../../apps/server/src/speech-recall.ts) · [SQL maintenance selection](../../apps/server/src/memory-repository.ts).

Original recommendation: **Expand**.

## LA008

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The later attention-selection query takes the first 8 private-mind lines matching its English concern/goal/belief keywords and clips the joined excerpt to 1,600 JavaScript string units. This is not the complete retained-corpus retrieval query: `RecallService.candidates` includes the full accepted inner-world text before its separate 8,000-byte query-embedding admission. The excerpt is a heuristic cue, not verified belief extraction or permission to truncate the accepted mind in final context.

**Reason / tradeoff:** Choose search clues by relevance instead of where they appear in the character's private text.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Replace**.

## LA009

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

A query sent for an embedding must fit 8,000 UTF-8 bytes. The retained-corpus candidate path skips paid query embedding when its complete query is too large and returns structured fallback with coverage instead; the later attention path explicitly rejects an oversized compact query. Neither outcome establishes that no matching memory exists. Keep these different consumers and their reported retrieval quality distinct.

**Reason / tradeoff:** Keep a finite query-size limit, and explain oversized-query failures instead of treating them as no matching memories.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Keep**.

## LA010

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The later attention-selection path may index one batch of at most 32 eligible previously unindexed source texts, with an optional query prefix. The shared batcher also enforces 8,000 UTF-8 bytes per text and 64,000 bytes for the exact JSON text array; the adapter allows at most 33 texts including the query. Oversized optional source text remains available through structured recall instead of being truncated or deleted. The primary retained-corpus candidate query does not inline a complete source-indexing pass.

**Reason / tradeoff:** Keep indexing work per decision bounded, but report incomplete search coverage and preserve required facts through direct retrieval.

[Attention consumer](../../apps/server/src/recall.ts) · [Shared batcher](../../apps/server/src/embedding-batches.ts) · [Adapter bounds](../../packages/ai/src/embedding.ts).

Original recommendation: **Review**.

## LA011

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The background indexer processes eligible memory sources, not only speech, through the same count-and-byte-bounded embedding batcher as LA010. It takes one batch per eligible NPC turn and revisits remaining work under spending admission and recorded-attempt rules. The 32-source ceiling is a work batch, not a speech-retention limit.

**Reason / tradeoff:** Keep bounded, fairly scheduled indexing and preserve incomplete coverage explicitly. Additional batches still need admission; unfinished work does not authorize automatic paid retries.

[Background indexer](../../apps/server/src/recall.ts) · [Shared batcher](../../apps/server/src/embedding-batches.ts).

Original recommendation: **Keep**.

## LA012

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The attention-selection cache retains embeddings for 16 recent queries per actor. The retained-corpus path separately stores one exact query entry under its world/actor key, checking query content, generation, model and dimension before reuse. Neither is a limit on the number of stored or searchable memories.

**Reason / tradeoff:** Bound replaceable query reuse. Eviction can require recomputation under spending admission; it does not delete source evidence or justify claiming complete semantic coverage when an embedding is unavailable.

[Implementation starting point](../../apps/server/src/recall.ts).

Original recommendation: **Keep**.

## LA013

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Raw experiences become eligible for replacement by summaries after 6 game hours; this age alone does not prevent recalling them.

**Reason / tradeoff:** Keep the distinction between summarization eligibility and recall eligibility; do not hide an experience merely because it is older than six hours.

[Experience policy](../../packages/domain/src/experience.ts) · [SQL maintenance eligibility](../../apps/server/src/memory-repository.ts).

Original recommendation: **Keep**.

## LA014

**Changed — current SQL path checked · Restrictiveness: Liberal.**

Decision/reflection preparation reuses source bodies only within its actor/generation request. The cache retains at most the existing 8,192-row / 4 MiB preparation allowance and evicts on pressure; eviction causes rereading, never evidence truncation. Reused bytes still count against each hydration admission. Conversation-covered optional sources are excluded before SQL selection limits; independently required evidence and the complete conversation retain their separate admission guarantees.

The former 512-raw-record preselection is bypassed by repository-backed recall. PostgreSQL ranks current eligible indexed sources, returns 300 optional results, and supplements required sources; unindexed fallback uses importance and recency. Repository selection accepts 1–1,000. The legacy in-memory 512 setting still exists.

**Reason / tradeoff:** Search retained eligible history before limiting returned results; keep model context bounded. This does not guarantee semantic recall of unindexed sources.

[Implementation starting point](../../apps/server/src/recall.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA015

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

An experience with importance at least 8 out of 10 must be represented by a separate unchanged-text group when consolidated: its group contains exactly that one source and the original summary text. This protection is enforced at publication, not only in model instructions. It does not override explicit forgetting, correction or privacy obligations.

**Reason / tradeoff:** Review whether the importance score reliably identifies memories that must survive unchanged before moving the cutoff.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Review**.

## LA016

**Historical value — no active expiry consumer at the inspected revision · Restrictiveness: — (not enforced).**

The historical `historyDays: 30` constant remains declared, but the inspected runtime has no consumer applying it as an automatic summary-expiry window. Consolidation retains unrelated summaries; age alone does not delete them. The canonical memory contract labels weekly/thirty-day transformation as a future idea, not delivered expiry. Retained history therefore still has the growth exposure in [MH06](#mh06).

**Reason / tradeoff:** Do not promise automatic forgetting that does not run, or introduce deletion merely to make an unused constant true. A future retention rule needs an explicit accepted policy, preservation of required evidence and scoped verification; this correction is not a decision to retain everything forever.

[Declared value and summary publication](../../packages/domain/src/experience.ts) · [Future transformation ideas](../memory-architecture.md#future-memory-transformation-ideas--not-implemented).

Original recommendation: **Review**.

## LA017

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Each generated consolidation summary must fit 1,200 UTF-8 bytes at native publication; the model schema independently allows up to 1,200 JavaScript string units. These are different checks for non-ASCII text. Protected-source identity and text preservation still apply; an oversized required source is not permission to truncate it.

**Reason / tradeoff:** Allow longer summaries when needed to preserve meaning, and use consistent size accounting for text containing non-English characters.

[Native admission](../../packages/domain/src/experience.ts) · [Response schema](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA018

**Current — source inspected 2026-10-06 · Restrictiveness: Too liberal.**

The SQL scheduling status signals pressure at 8,192 awareness records or 8,208 personal memories for an actor. It does not stop simulation, limit total retained history or mean that all of those records reside in the hot projection. The separate hot-memory bounds are in [MH05](#mh05).

**Reason / tradeoff:** Preserve movement and memories while improving long-history storage; this warning threshold alone does not prevent unlimited history growth.

[SQL scheduling facts](../../apps/server/src/memory-repository.ts) · [Maintenance scheduler](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA019

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

An accepted inner-world snapshot contains 1–10 files. `flattenFiles` also validates distinct permitted filenames and per-file text allowances; it rejects an invalid snapshot rather than accepting a truncated one.

**Reason / tradeoff:** Replace the file-count ceiling with a total text allowance, allowing the character to organize the same amount of information across more files.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Replace**.

## LA020

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Each accepted inner-world file is limited to 500 normalized whitespace-delimited words and 8,000 UTF-8 bytes, counting the filename with the text. This is a per-file allowance in addition to LA019, not a single 80,000-byte pool that a larger file can borrow from.

**Reason / tradeoff:** Use a coherent total private-text allowance so important information is not rejected simply because one file needs more space.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Replace**.

## LA021

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

A reflection or dream inner-world publication supplies 1–3 nonempty short presentation thoughts, each at most 20 words; the response schema additionally checks at most 240 JavaScript string units. These are not the daily consolidation summaries, which use LA017, or the residual structured-mind thought in LA026.

**Reason / tradeoff:** Review this as a presentation choice; the short displayed thoughts do not need to contain the character's complete private reflection.

[Native publication](../../packages/domain/src/experience.ts) · [Reflection schema](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Review**.

## LA022

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

One reflection publication can include at most 16 knowledge-note changes, 16 learned-name changes, 8 goal changes and 8 appraisal changes. Each still uses its own authority, evidence and revision checks; the count allowances do not permit replacing player intentions.

**Reason / tradeoff:** Allow larger updates when they fit the request and can be validated and saved together safely.

[Publication owner](../../packages/domain/src/experience.ts) · [Reflection schema](../../apps/server/src/cognition-contracts.ts).

Original recommendation: **Expand**.

## LA023

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

A character retains only the latest 100 short thoughts produced for display in the thought-history list.

**Reason / tradeoff:** Keep a short display-history allowance for now, but make it clear that older thought text is removed from this structure.

[Implementation starting point](../../packages/domain/src/experience.ts).

Original recommendation: **Keep**.

## LA024

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The older structured representation of a character's mind permits 10 prose documents and 80 records describing beliefs, relationships or similar facts.

**Reason / tradeoff:** Replace separate object counts with a total storage allowance and retrieve only relevant information for each decision.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA025

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

A model's proposed update to the older structured character mind may contain at most 100,000 bytes.

**Reason / tradeoff:** Keep a total update-size guard to bound validation and saving work; reject oversized updates with an explicit reason.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Keep**.

## LA026

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

A displayed thought from the older structured-mind workflow is limited to 2,000 characters and 250 words.

**Reason / tradeoff:** Keep a finite display-text allowance, but distinguish this older workflow from the newer twenty-word reflection output.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Keep**.

## LA027

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

Each document or record update in `commitCognition` can cite at most 16 evidence links; this is not a single sixteen-link total for the entire proposed update. Each document title is limited to 120 JavaScript string units. These checks belong to the residual structured-mind helper, not the current freeform inner-world filename contract.

**Reason / tradeoff:** Preserve all evidence needed to support a belief within a total update allowance; a document-title limit can remain a separate display choice.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA028

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

The older character-mind workflow remembers only its latest 300 completed-update identifiers to avoid applying the same update twice.

**Reason / tradeoff:** Tie duplicate-update prevention to durable saved job records before changing how long these identifiers are retained.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA029

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Very safe.**

The in-memory `get_memories` helper returns 30 entries by default and clamps the requested count to 0–300. It reports omitted and required-missing entries instead of granting them extra slots. These helper limits do not describe the retained-corpus SQL selection or the independently paged player/inspector history in MH08; the remaining structured-mind verification script is not evidence that the current director uses this older preparation path.

**Reason / tradeoff:** Select memories using relevance and available request space, and allow additional query pages rather than permanently hiding results beyond the count.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Replace**.

## LA030

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

The in-memory `get_memories` helper has a 30,000-byte default serialized-result allowance, clamped to 0–400,000 bytes. Required entries also consume it, with missing required IDs explicitly reported. Its older `cognitionContext` caller requests different tier-specific budgets and rejects missing required evidence. The production retained-corpus path has its own preparation and complete-context allowances.

**Reason / tradeoff:** Keep a response-size budget, but align it with the actual model request so the query does not return unusably large results.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Review**.

## LA031

**Removed — absence rechecked 2026-10-06 · Restrictiveness: — (removed).**

**Former limit, now removed:** The code advertises memory-query quotas of 300 experiences and 400,000 bytes in a metadata object, while separate code enforces the query limits.

**Reason / tradeoff:** Removed the duplicate 300-experience/400,000-byte metadata. The memory-query implementation still enforces its actual limits.

[Implementation starting point](../../packages/domain/src/mind.ts).

Original recommendation: **Completed removals**.

## LA082

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Only one background memory-maintenance job runs at a time, and it waits while interactive cognition is busy.

**Reason / tradeoff:** Ensure memory summarization eventually runs even when characters continuously receive interactive requests, without starting unlimited simultaneous paid jobs.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA083

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Background memory maintenance for the same character is spaced at least 60 real seconds apart.

**Reason / tradeoff:** Retain spending control, but adjust the spacing if summarization cannot keep up at faster simulation speeds.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA084

**Implemented · Restrictiveness: Safe.**

The maintenance scheduler checks simulation deadlines and changed actor sources for raw experiences older than 6 game hours that can be summarized. Advisory checks read the last durable snapshot instead of forcing a save per actor. New sources can wait until the next routine commit (normally one real second). Advisory SQL inspections are also limited to once per actor per real second; unchanged actors retain their simulation deadlines. Actual maintenance selection flushes first.

**Reason / tradeoff:** Keep summarization grouped into useful batches, while allowing the scheduler to respond when retained history grows too quickly.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA085

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The SQL-backed daily-review selector can return one eligible source and partitions a completed day under SV09/SB07. The older pure `consolidationBatch` fallback requires at least two sources for daily mode; that check is not a universal runtime minimum. Protected-only selections can take native cleanup instead of buying a summarizer call.

**Reason / tradeoff:** Judge unnecessary summarization at the actual selected consumer. Do not add a two-source gate that strands a final one-record SQL partition, and do not infer unlimited whole-day preparation from the fallback selector.

[SQL selector](../../apps/server/src/memory-repository.ts) · [Fallback selector](../../apps/server/src/memory-consolidation.ts) · [Execution](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Keep**.

## LA086

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

A native-downtime reflection opportunity requires no accepted reflection in the current game day and at least one game hour since the last accepted reflection. Separately, the maintenance scheduler durably records at most one reflection-harness attempt per actor per game day before starting it. Failure does not clear that attempt marker or authorize a retry; a later opportunity can remain queued for another eligible day. These rules do not schedule hourly paid reflection. Dream-episode eligibility, daily-summary cursors and the real-time maintenance cooldown remain separate.

**Reason / tradeoff:** Review reflection frequency as intended character behavior rather than assuming every new event needs another reflection call.

[Implementation starting point](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA087

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The bundled cognition policy makes a dream eligible after 7,200 game seconds continuously in its configured restorative-rest effect. The engine reads the installed status-effect reference and elapsed threshold; an explicitly null dream policy disables this opportunity. Episode identity, current eligibility and spending admission still apply.

**Reason / tradeoff:** Treat the two-hour delay as an authored sleep/dream rule, not a universal engine requirement.

[Authored default](../../packages/domain/src/worlds/base/cognition.ts) · [Maintenance consumer](../../apps/server/src/cognition-maintenance.ts).

Original recommendation: **Review**.

## LA088

**Current — configured body gates, October 2 · Restrictiveness: Safe.** The bundled world's installed body policy requires health of at least 40% and food of at least 30 for provider-backed maintenance. Reflection additionally requires energy of at least 30. Domain cognition commits use their distinct energy threshold 15, exempting an active configured dream/rest episode; intake watches below 15 and below 10, while the director retains only its former below-15 reconsideration boundary. Action/controller/capability/participation guards still apply. These are separate authored predicates, not a merged universal distress rule.

Exact body/manifest/status/cognition dependency evidence is captured before asynchronous work and rechecked at completion, alongside current meter eligibility. Missing optional meters remain absent. A world can disable dreaming explicitly and author no body-based thinking gate. Native hourly protected-only cleanup retains its prior ungated housekeeping behavior; it is not a paid maintenance call.

**Reason / tradeoff:** Preserve the accepted differences between maintenance, commits and reflection while making their thresholds world-owned. Delay does not authorize a survival action or a provider retry. [Body policy](../../packages/domain/src/worlds/base/body-policy.ts), [maintenance consumer](../../apps/server/src/cognition-maintenance.ts), and [current native/server evidence](../verification/world-configured-survival.md) own behavior and its limits. No current live model-quality claim is made; broader maintenance tuning remains open.

## LA089

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Memory-summarization input packing uses a 220,000-character allowance, counting encoded source text plus instructions and a 4,096-character framing estimate. This is distinct from the earlier 128-source/512-KiB SQL preparation allowance. A single source that cannot fit fails explicitly; additional complete-source partitions require separately admitted calls.

**Reason / tradeoff:** Keep complete-source batches small enough for the model, and split additional memories into further authorized requests.

[Summarization packing](../../apps/server/src/memory-consolidation.ts) · [SQL source preparation](../../apps/server/src/memory-repository.ts).

Original recommendation: **Review**.

## LA090

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Each memory-summarization call permits 8,192 output tokens; batch sizing estimates 24,576 output characters plus 128 characters of fixed overhead.

**Reason / tradeoff:** Keep output room for faithful summaries without requiring the model to erase distinctions just to fit the batch.

[Output estimate and packing](../../apps/server/src/memory-consolidation.ts).

Original recommendation: **Review**.

## LA193

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The remote inner-world workspace requests at most 20 listing entries and rejects a returned continuation cursor rather than silently accepting the first page. Export rejects an authored file reported above 8,000 bytes; the transport independently stops a file response above 16,000 bytes, and final `flattenFiles` admission enforces LA019/LA020 including filenames. Export also rechecks the workspace revision; listing, transfer and accepted-file quotas are different boundaries.

**Reason / tradeoff:** Keep bounded, complete snapshot export rather than silently omitting files. Any future increase in accepted file capacity must reconcile listing coverage and byte limits together; following extra pages is not currently delivered.

[Workspace listing/export](../../apps/server/src/workspace.ts) · [File transport](../../packages/ai/src/macrofold.ts).

Original recommendation: **Review**.

## LA208

**Current — rechecked 2026-09-28 · Restrictiveness: Safe (compact snapshot; history is paged).**

The live player snapshot (`GameView.player.memories`) still carries the newest **20** eligible memories. The Character panel's **Older memories** control and search now page through every eligible retained memory 20 at a time through `/api/memories` ([MH08](#mh08)). God inspection of a non-player character shows the same paged, searchable history with a **Private thoughts only** filter for remembered private thoughts; reflection thoughts in the mind state are shown in full, because only the latest 100 are retained ([LA023](#la023)). Another human's memories are never available.

**Reason / tradeoff:** Keep the live update small while making all retained memories reachable. Only eligible sources are read (forgotten sources, inferred duplicates and summaries built on forgotten or corrected sources stay excluded), so paging never widens recall eligibility. A corrected memory stays visible as witnessed history, as in the live snapshot, and its correction is a separate event; labelling corrected entries would need a separate decision.

[Snapshot](../../apps/server/src/view.ts), [history pages](../../apps/server/src/memory-history.ts).

Original recommendation: **Replace** — delivered.

## LA219

**Removed — source inspected 2026-10-06 · Restrictiveness: — (removed).**

**Former limit, now removed:** When the domain event-handling code creates a memory, it stores identifiers for only the first 8 characters, animals or objects associated with that memory.

**Reason / tradeoff:** Removed the eight-reference memory cutoff. Memory creation copies every supplied permitted reference to the beings and objects involved.

[Memory creation](../../packages/domain/src/events.ts).

Original recommendation: **Completed removals**.

## LA220

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

The native `remember` proposal boundary still permits a summary of at most 700 JavaScript string units; this does not cap every stored awareness, reflected thought or consolidation summary. The current `appendMemory` deduplication checks the same event ID and memory kind among resident records, with no one-game-hour lookback. The historical lookback description is not a current repeat-observation rule.

**Reason / tradeoff:** Preserve a memory's full meaning and distinguish genuinely new events from repeated descriptions of the same observation.

[Proposal admission](../../packages/domain/src/kernel.ts) · [Memory append/deduplication](../../packages/domain/src/events.ts).

Original recommendation: **Expand**.

## LA238

**Residual helper — source inspected 2026-10-06 · Restrictiveness: Safe.**

The residual structured-mind helper accepts local document/record IDs of 1–64 ASCII letters, digits, underscores or hyphens, excluding unsafe object-property names. Current freeform inner-world filenames use their separate Unicode filename rule in `flattenFiles`; this helper limit is not a reason to narrow or rebuild that file interface.

**Reason / tradeoff:** Keep internal labels bounded and align them with every interface that reads or writes those same documents.

[Residual structured-mind admission](../../packages/domain/src/mind.ts) · [Current file admission](../../packages/domain/src/experience.ts).

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

**Evidence:** Existing synthetic PostgreSQL top-100 evidence: about 100,000 sources cost 139 ms median / 319 ms p95 for vector selection and 180 / 498 ms for full local retrieval. These are [prior component measurements](../verification/data-foundation.md#data-foundation-runtime), not fresh measurements of the current top-300 caller. [Implementation](../../apps/server/src/memory-repository.ts) (`readSelection; initialize`). [Revisit C17](../maintainers/limits-audit.md#c17).

## MH02

**Current — source inspected at `af1eb02` · Restrictiveness: Liberal.**

**Coverage diagnostics count the whole scoped corpus.** No scanned-row cap in count/readCoverage: COUNT(\*) covers all eligible sources and matching vectors. It returns two scalar counts, not memory bodies. AttentionService.candidates asks for coverage before selection on each recall; a one-row result does not bound database work.

**Exposure / consequence:** Repeated decisions in a mature world repeatedly count growing indexes. Cost can add to recall latency; this pass does not establish that counting dominates vector scoring.

**Reason / tradeoff:** Accurate coverage explains indexed/missing evidence. Prefer maintained revision-scoped counts or cheaper threshold checks if measured; retain truthful diagnostics.

**Evidence:** No new timing measurement; distinguish index scans from payload hydration. [Implementation](../../apps/server/src/memory-repository.ts) (`count; readCoverage; apps/server/src/recall.ts candidates`). [Revisit C17](../maintainers/limits-audit.md#c17).

**Implemented mitigation:** The 512-entry coverage cache follows actor source changes and exact actor/model/dimension vector publication. Unrelated actors and other models retain reuse; restore/global/unknown changes reset it, and explicit transactions bypass it. Active readers retain their stamps across eviction, so stale reads cannot republish reusable counts. Stamp maps are bounded by cached entries and outstanding readers. Misses still perform exact counts. [PW09 correctness evidence](../verification/data-foundation.md#pw09--unicode-and-scoped-retrieval).

## MH03

**PW09 Unicode/scoped reuse locally verified; large-history recovery and release qualification remain open.** [Matched 5k/25k/100k evidence](../verification/data-foundation.md#pw09--unicode-and-scoped-retrieval) preserves ordered lexical/caller results and removes unrelated reranking/counts. One 100k cold exact request and all six 100k restores fail unchanged deadlines; rollback preserves committed evidence. These failures remain in [C17](../maintainers/limits-audit.md#c17), without a retained-memory cap or production ANN switch.

**Changed · Restrictiveness: Liberal.**

**Indexed lexical recall has no total match-work cap.** selectContext(query != null) uses a derived text projection with explicitly positioned quoted tsvector/GIN values. Projection/query normalization shares history’s NFKC, lowercase, dotted-I fold and Unicode letter/mark/number words; PostgreSQL locale cannot change boundaries. Original wording is preserved. Existing PostgreSQL lexeme bytes (<2,047), positions (16,383) and repeated positions (255) remain parser edges, not new history caps. Unique query tokens match word prefixes with OR semantics; native text rank replaces historical arbitrary substring-count scoring. Protected required records precede matches, then importance/recent fallback fills the optional limit (maximum 300). The null-query branch remains recent-history selection. Exact vector recall is separate and unchanged.

**Exposure / consequence:** Ordinary invention/world-assistant context reads on a mature actor can scan growing text. PostgreSQL can delay other read-lane work; bounded output alone does not bound scan work.

**Reason / tradeoff:** Keep all eligible history discoverable. Use an indexed lexical search and bounded preparation with explicit coverage, not a fixed newest-record prefilter that loses relevant older evidence.

**Evidence:** C and en_US.UTF-8 correctness checks preserve original wording and ordinary ASCII ordered scores. The [PW09 matrix](../verification/data-foundation.md#pw09--unicode-and-scoped-retrieval) records 18 synthetic PostgreSQL runs: after an unrelated source commit lexical SQL falls 6 → 5, with no rerank and unchanged freshness/body admission. Every warm selective/broad result remains ordered identically; new relevant evidence invalidates and outranks the old optional match. Broad matching still examines 4,999 / 24,999 / 99,999 sources. Shared-host timings do not qualify natural workloads. [Implementation](../../apps/server/src/memory-repository.ts) (`selectContext`). [Revisit C17](../maintainers/limits-audit.md#c17).

**Implemented mitigation:** Inverted indexes avoid parsing every JSON source on each miss; an indexed required/importance fallback avoids an extra full sort. Repeated normalized selections use a 64-entry actor-source/reset-scoped cache with snapshot source validation; unrelated actor/vector changes preserve reuse. Explicit transactions bypass shared entries. Broad matches still rank substantial postings, with no approximate/corpus cutoff. Hydration has MH04 admission checks. The derived projection/index adds disk/write cost and rebuilds atomically from canonical sources. [Measured evidence](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits).

## MH04

**Changed · Restrictiveness: Safe.**

Conversation/required/correction preparation allows 8,192 unique sources and 4 MiB of serialized bodies. Selection detects overflow before hydration in one scoped SQL snapshot. No partial required set is returned. Existing paged history provides access beyond one preparation.

**Reason / tradeoff:** Keep ordinary decisions from materializing arbitrary history while preserving all durable evidence. Conversation context now uses [actor-scoped compaction](narration.md#la236); metadata admission and uncovered-body hydration retain these safety bounds, so an oversized cold preparation still fails explicitly. Optional top-result limits do not bound exact search. [Owner](../memory-architecture.md#retrieval-preparation-admission).

## MH05

**Changed · Restrictiveness: Safe for awareness; Too liberal for remaining personal-memory growth.**

Resident awareness: latest 256 records/actor, targeting 1 MiB while always preserving the latest 24 observation records. Startup selects the row-bounded tail; post-commit eviction applies bytes. Every evicted source remains eligible in SQL. Personal memory records still use the six-hour window plus protected commitments. Expiry compaction may lag eligibility by one game minute to amortize copying.

**Reason / tradeoff:** Automatic observation growth should not pin six hours of bodies and event dependencies. Native continuity retains its 24-record tail; explicit old-source reads use SQL. Required native personal records are not silently removed to achieve a global byte claim. Individual admitted transitions still retain complete output until commit. [Owner](../performance.md#inactive-history-residency); [C18](../maintainers/limits-audit.md#c18).

## MH06

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Canonical history and derived artifacts have no aggregate retention quota.** No general total-row/byte quota or expiry policy for canonical retained source history, retired source versions, revision-keyed vector cache and attempt provenance. Recall eligibility/forgetting controls access; it does not imply physical deletion. Indexing takes bounded pending batches, while queue/cache/history storage can keep growing.

**Exposure / consequence:** Normal observation, speech, source edits and embedding work accumulate disk use. Eventually backup size, I/O and disk exhaustion matter; a failed durable commit pauses simulation. That is a long-running capacity risk, not evidence that ordinary short play already exhausts disk.

**Reason / tradeoff:** Preserve evidence, correction provenance and paid-artifact reuse until an explicit retention policy exists. Add growth monitoring and policy-owned archival/eviction before destructive pruning; protect important history and uncertain paid execution.

**Evidence:** Production-data D2 owns retention semantics; a storage quota must not silently erase meaningful events. [Implementation](../../apps/server/src/memory-repository.ts) (`project; pending; memory_vector_cache and memory_index_attempts`). [Revisit C20](../maintainers/limits-audit.md#c20).

## MH07

**Changed · Restrictiveness: Liberal.**

**Explicit edits prepare the full affected dependency set, with no source-count/byte cap.** Creator event edits, character-memory edits, correction and forgetting follow indexed source/event aliases, summary dependencies and correction links outside the mutation queue. Only requested event bodies and affected source bodies are loaded. All appraisals for affected actors are included because privacy invalidation clears terminal records too. Publication rejects a changed world rather than using stale preparation. No automatic retry is added.

**Exposure / consequence:** Ordinary small edits avoid unrelated lifetime memory/event bodies. A heavily referenced event or an actor with many appraisals can still require substantial RAM and work. The existing five-second read statement deadline can reject a large dependency query; affected records are never silently skipped. Full recovery and explicitly requested full actor-history maintenance still materialize complete scoped history.

**Reason / tradeoff:** Preserve complete correction/forgetting semantics while reducing unnecessary reads and mutation-lane occupancy. The former whole-world creator-edit preparation is removed. Resumable preparation remains a future response to measured large dependency closures, rather than speculative infrastructure.

**Evidence:** [Implementation](../../apps/server/src/history-edit.ts), [verification](../verification/history-storage-efficiency.md#history-storage-efficiency). [Revisit C21](../maintainers/limits-audit.md#c21); D2/PF08 retain larger dependency and hosted qualification.

## MH08

**Current — implemented 2026-09-28 · Restrictiveness: Safe per request; no cap on reachable history.**

Owner memory history and search (`/api/memories`, god variant for inspectable non-player characters) return pages of **20**, newest first by (time, ID, source kind), with a fenced continuation cursor of at most 2,048 characters. A search accepts up to **200** characters, which become at most **8** distinct letter/number words of at most **64** characters each; every word must match the start of a word in the memory text the viewer is shown (`recall_sources.search_text`, AND semantics). The server matches in JavaScript after NFKC normalization and lowercasing, so matching does not depend on the database locale; accents must match (“eloise” does not find “Éloise”). A search or the **Private thoughts only** filter examines at most **2,000** eligible memories per request, read in chunks of 250 that stop once a page of matches is found; when that window holds no more matches, the response says so and the cursor continues into older memories. The same bounds apply to perceived-event search ([HR06](hearing-and-speech.md#hr06--history-paging-and-growth)). A plain browse request reads 21 index rows and hydrates at most 20 bodies within the shared [preparation allowance](#la014).

**Reason / tradeoff:** Predictable work per request on a growing corpus, while every eligible retained memory stays reachable through continuation. Matching only displayed text means a search adds no exposure beyond that text: it cannot confirm unheard words or forgotten sources. [BW22](../maintainers/base-world.md#bw22--observer-safe-names-in-event-text) repaired targeted-event names at occurrence: the stored perspective uses the witness's then-permitted name rather than the target's global name. Its [native/PostgreSQL evidence](../verification/camp-life.md#observer-safe-target-names-bw22) does not qualify arbitrary generated prose or authorize rewriting historical development saves. Search still matches only the resulting displayed text; it does not confer name knowledge. Prefix matching is weaker for scripts without spaces; semantic search would need paid query embeddings and is not used. Measured on one host with the earlier SQL matcher: a 2,000-row window with no match took 107 ms, the following continuation 21 ms; the chunked JavaScript matcher's private-thoughts window with no match took 38 ms ([evidence](../verification/player-clarity-ui.md#review-follow-up)). History retains its displayed-text AND-prefix matcher; [MH03](#mh03) now uses the same Unicode words with separately serialized OR-prefix database recall. [Implementation](../../apps/server/src/memory-history.ts), [search terms](../../apps/server/src/text-search.ts).

## KG01

**Current — source inspected at `af1eb02` · Restrictiveness: Too liberal.**

**Private-note candidates enumerate all actor documents.** subjectKnowledgeCandidates walks all documents in world.actorKnowledge[actorId], formats nonempty subject notes and creates candidate text before later relevance selection. Individual note lengths are bounded, but document count and total candidate-construction bytes have no bound here. The note collection is resident.

**Exposure / consequence:** Learning about many people or creator-authored notes increases per-decision preparation. It usually grows more slowly than automatic memory/awareness; 10,000 subject notes is an extreme fixture, not a forecast for a normal session.

**Reason / tradeoff:** Keep all known subjects available. Select scoped relevant documents before formatting; keep exact involved-subject lookup and per-document controls.

**Evidence:** Existing 10,000-pad fixture measured candidate projection at 77 ms median / 106 ms p95; [prior fixture evidence](../verification/items-and-knowledge.md#editable-knowledge-and-observer-names), not a new run or natural-growth estimate. [Implementation](../../apps/server/src/knowledge-context.ts) (`subjectKnowledgeCandidates`). [Revisit C07](../maintainers/limits-audit.md#c07).

**Implemented mitigation:** Current candidate preparation checks a combined 8,192 current-world/note items and 4 MiB of note text before formatting. The document collection is still resident; overflow is explicit, not silent note deletion.
