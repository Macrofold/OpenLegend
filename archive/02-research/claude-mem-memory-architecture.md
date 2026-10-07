# Claude-mem: selective memory retrieval for OpenLegend

| Status | Current progress | Last updated |
| --- | --- | --- |
| Research complete; adaptations proposed | Evaluated developer use and character-memory lessons against the existing memory contract; no runtime integration or behavioral experiment performed. | 2026-10-07 |

## Conclusion and player value

**Use Claude-mem as a candidate development aid, not as the game's replacement memory engine.** The valuable runtime lesson is letting a character discover relevant experiences cheaply and inspect the few that matter, without turning another character's secrets or a generated summary into knowledge.

A useful hypothetical game test is a resident remembering a previous ambush when choosing whether to accompany the player, or reconsidering a suspicion after hearing contradictory testimony. Success means a coherent later choice, not a larger memory database or an impressive private monologue. Memory work should support enjoyable conversation, danger, exploration, cooperation and consequences; it must not displace the playable-game priorities in the [root overview](../../README.md).

OpenLegend already specifies much of the architecture Claude-mem makes convenient for coding agents: scoped recall, preserved evidence, compact context, derived indexes and selective inspection. The incremental opportunity is therefore **better discovery and evidence expansion within the existing owner**, not another observer service or writable mind. This study proposes experiments; it changes no accepted contract, task status, inference policy, retention rule or runtime dependency.

Evidence baseline: OpenLegend `main` at `63cd42fc2555dd97b1cd9ec5c03dcf84e6d2ef36`; upstream `thedotmack/claude-mem` at `71ddd11735d6dc38a6356fe376921fc216f2aa38` (October 6, 2026; v13.34.2 changelog). Rolling official documentation was checked October 7. Repository contracts are evidence of intended/currently documented behavior, not newly executed acceptance tests.

## What the reference actually does

Claude-mem's local hooks/adapters capture agent activity for a worker that generates observations and session summaries. Local SQLite/full-text storage and optional Chroma semantic indexing make that history reusable in later sessions. Its compact startup context and on-demand retrieval avoid automatically loading complete past conversations. See the [architecture overview](https://docs.claude-mem.ai/architecture/overview).

The [search interface](https://docs.claude-mem.ai/usage/search-tools) encourages a compact `search`, surrounding `timeline` when useful, and batched `get_observations` for selected details. The [progressive-disclosure explanation](https://docs.claude-mem.ai/progressive-disclosure) extends the idea to underlying evidence. A generated observation is not the original event; full observation retrieval does not guarantee exact original speech. The useful abstraction is a cheap catalogue with trustworthy routes to more detail.

The [pinned MCP source](https://github.com/thedotmack/claude-mem/blob/71ddd11735d6dc38a6356fe376921fc216f2aa38/src/servers/mcp-server.ts) separates local worker operations from server-runtime observation operations. The [checkout scope helper](https://github.com/thedotmack/claude-mem/blob/71ddd11735d6dc38a6356fe376921fc216f2aa38/src/servers/checkout-search-scope.ts) broadens matching local project names to historical aliases; it leaves explicit and unscoped requests unchanged. That is a convenience for project continuity, not proof of game-level disclosure safety.

There is also a [hosted beta](https://docs.claude-mem.ai/hosted-server), with PostgreSQL, queued generation, authenticated recall and deletion. Its remote MCP exposes `search`, `context` and `recent`, not the identical local retrieval surface. Basic team/project scoping is useful infrastructure but does not encode which words an individual character heard. Its presence makes “Claude-mem has no server or authentication” an inaccurate objection; the actual objection is the mismatch with our evidence, authority and lifecycle semantics.

## Existing OpenLegend architecture: preserve, do not duplicate

The controlling owner is [Memory architecture](../../docs/memory-architecture.md), especially its attention, retrieval-service and personal-acquisition sections. It distinguishes runtime foundations from remaining integrated acceptance. [Cognition work](../../docs/maintainers/cognition-redesign.md) and [implemented architecture](../../docs/architecture.md) retain delivery ownership.

| Existing contract | Consequence for this research |
| --- | --- |
| Actor scope is established before relevance, snippets and counts. | Search and timeline must be projections of that actor's permitted evidence, never filters applied after reading an omniscient result. |
| Identity, triggering evidence, commitments/corrections and current conversation have protected coverage. | A small memory index cannot replace these required context inputs. |
| Current conversation preserves permitted speech, with controlled older compaction and recent exact speech. | Do not force a character to rediscover the conversation it is currently participating in. |
| Exact/entity/topic lookup, semantic discovery and Jev inclusion already have roles. | Compare an improvement with this actual pipeline, not an assumed full-history dump. |
| The shared retrieval design includes bounded `get_memories`, `inspect_memory` and commitment lookup. | Extend the existing owner only when recorded misses justify it; do not create parallel tools with different privacy semantics. |
| PostgreSQL/pgvector and source/model revisions support derived semantic indexes. | There is no demonstrated need for another Chroma store or one SQLite database/process per NPC. |
| Raw experience, consolidation, authored inner world, native state and presentation are distinct. | A summary may guide recall; it cannot rewrite the world, teach a skill or replace an action receipt. |

The current specification deliberately gives immediate decisions assembled context without requiring a tool round. Preserve that fast path. Its tool-access sequence is also deliberate: improve initial structured and semantic selection first, then enable additional recall when actual omitted-evidence cases establish the need. Claude-mem is supporting evidence for that approach, not a reason to declare it newly implemented.

## Direct use while developing the game

An isolated developer pilot could retain rejected approaches, failed checks, explanations for architectural decisions and useful source locations across coding sessions. Repository instructions and the current checked-out files remain authoritative. Historical memories should identify their repository, commit and branch where available; a fix described on another branch is not proof that the current game contains it.

Start with non-sensitive engineering activity. Do not capture live player information, credentials or character-private production traces by default. Keep developer-project memory separate from the game world's event and mind stores. Installing a tool that remembers coding work does not authorize it to inspect NPC minds or a human-controlled character's private state.

Disable the optional source-reading intervention for the first pilot with `CLAUDE_MEM_FILE_READ_GATE_ENABLED=false`. The [File Read Gate](https://docs.claude-mem.ai/file-read-gate) can block qualifying large whole-code-file reads in Claude Code while allowing targeted reads; it does not block all file types or all hosts. Separate evaluation of this feature avoids confusing better memory with less inspection of current implementation. No plugin, hook or setting is installed by this document.

## Adaptations worth testing

### 1. A compact discovery view on the existing recall owner

For an authorized long investigation or reflection, offer small candidate descriptions with a short handle, permitted event time, source/acquisition kind, uncertainty, useful subject cues and estimated detail size. Resolve handles server-side to source identity, revision, actor and restore generation. Do not expose hidden actor IDs or internal bookkeeping merely to describe provenance.

A discovery view is a projection, not another database of independently editable facts. A potential addition is a discovery-format option on the existing recall service, followed by selected inspection through the same owner. This is a proposed interface shape, not an available API. Exact entities or commitments already known to be needed can be retrieved directly; mandatory evidence bypasses optional ranking.

Compare compact discovery with current candidate selection on negation, uncertainty and misleading titles. Compressing “I did not see who took it” to “the theft” can introduce a belief or hide the only fact that mattered. If a compact view harms selection, retain a richer permitted excerpt. Metadata-first is an optimization hypothesis, not a rule that smaller is always better.

### 2. Actor-permitted episode expansion, not a world timeline

Timeline expansion should answer “what else did I personally acquire around this experience?” It must not answer “what actually happened everywhere at that time?” Apply authorization before selecting neighbors and before producing result counts or titles. Revalidate each expansion when its permission or source revision has changed.

For example, one listener heard only an unidentified shout and another heard the full warning. Expanding either memory must preserve that listener's original fragment and attribution. A nearby complete transcript must never repair missing words. Hearing, testimony, inference and imagination retain different provenance under [hearing and speech](../../docs/hearing-and-speech.md) and [events/perception](../../docs/events-perception-and-reactions.md).

Chronological proximity does not prove causation. Show related evidence without inventing “because” links. Keep event time distinct from when a report was heard, a summary generated or a fact recalled. A later correction can alter the character's interpretation without changing what the character originally witnessed.

### 3. Preserve experience, interpretation and present authority

The existing example “I saw someone take berries” versus “they stole from me” captures the distinction. A memory catalogue should retain a route to the observed event and label any interpretation as such. Conflicting testimony belongs alongside its source, not as an automatic overwrite. Characters may hold mistaken beliefs; validation protects scope and mechanics rather than forcing an objectively correct personality.

Native inventory, health, learned techniques, action outcomes and protected obligations remain in their current owners. Recalling a promise is not discharging it; imagining a weapon is not crafting it. An old statement about a location is not a current observation. A generated reflection must not acquire the authority of its cited source or silently become a new witnessed event.

About me and authored subject knowledge should remain their existing accepted records. Reuse [knowledge ownership](../../docs/knowledge.md); do not add a competing biography, relationship score store or generic profile extracted after every reply. Prevent repeated injected summaries from becoming self-reinforcing new evidence.

### 4. Revision-aware derived memory across correction and restore

Bind derived records and in-flight work to world, actor, source identity/revision and timeline/restore generation through the existing [save/load owner](../../docs/save-and-load.md). Recheck these bindings before admitting results. Restoring a save must not allow a late summary from the discarded future to enter the character's current mind.

Explicit forgetting and privacy revocation must invalidate dependent summaries, vectors, cached candidates and pending writes; an identifier returned before revocation is not continuing permission. Ordinary creator edits are different: changing an object's present name or location does not automatically erase historical beliefs. Preserve the memory specification's distinction between an actual source dependency and a merely similar mention.

A rebuildable search index is not permission to recreate deliberately forgotten experience from an old checkpoint. Recovery needs the current admitted forgetting/revocation state and a compatible source boundary. Do not invent a second rollback authority in Claude-mem or in a Macrofold workspace. Technical cache eviction must also remain distinct from a world-authored forgetting mechanic.

### 5. Pay for useful continuity, not exhaustive capture

Do not summarize each native simulation tick, repeated exposure or streamed token. The game already has event acquisition and bounded scheduling; attach any derived indexing to committed permitted experience and meaningful revisions. Coalesce optional work, preserve native reactions and expose missing optional recall rather than silently treating it as an empty past.

Keep brief interactions on the assembled-context fast path. Deeper reflection can search and inspect in bounded batches, with optional episode expansion. Total calls, records, bytes/tokens, wall time and paid work must remain bounded across the job; pagination does not reset them. Existing server admission and AI execution own costs and cancellation. Do not introduce a second timer, free retry path or off-screen backlog of mandatory paid summaries.

Use the existing PostgreSQL index first. Semantic retrieval remains valuable for paraphrases, but changing storage is not the primary opportunity. A colder derived index may be acceptable for optional older history; fresh required evidence must retain its direct path. Rank and cache only against valid actor-specific dependencies.

## Where an implementation would belong

This is a map of existing responsibilities, not a proposed package split. The domain continues to own deterministic world transitions and admitted records. The server continues to own actor-permitted context, recall, scheduling, money, stale-result checks and publication. The AI package supplies typed execution, not knowledge rights. The client shows permitted outcomes and explanations, not a global memory browser. Follow the [engine/world boundary](../../docs/engine-and-world-boundaries.md).

Generic mechanisms can support scoped discovery, evidence expansion and revision checks. World policy determines what an actor acquires, what matters, and any fictional retention/forgetting behavior. A different coherent world may choose different salience without receiving access to forbidden evidence. Start with a narrow extension of existing retrieval, not a universal memory framework.

When Macrofold executes a character job, OpenLegend must supply its authorized evidence and enforce admission on return. A shared model, host or memory project cannot justify pooling minds. World-authoring/developer memory is a separate use case from character memory, even when both run on Macrofold. The [companion Macrofold study](https://github.com/Macrofold/Macrofold/blob/5f048cebb00fe651944478f4ba4108c7c89fc729/docs/architecture/claude-mem-research.md) describes application-level integration without changing this boundary.

## Behavioral evaluation and decision gates

Use current assembled/scoped retrieval as the baseline. Compare it with compact discovery plus selective expansion under the same models, source data and total budget. All scenarios below are proposed experiments, not claims of implemented gameplay or completed tests.

| Scenario | Evidence required |
| --- | --- |
| A later encounter recalls a danger or helpful companion | The correct permitted experience influences a coherent later choice, without fabricated current danger or automatic action success. |
| A suspicion is challenged by new testimony | Original experience and competing claims remain distinguishable; character response is grounded but need not become objectively correct. |
| Two listeners heard different fragments | Neither search titles, counts, neighboring events nor details disclose the other listener's missing words or identity. |
| A simple greeting amid a long history | No required conversation evidence is dropped and no unnecessary multi-call investigation delays the reply. |
| A rare important event is buried in routine history | Recall improves at equal total cost; recent repetition does not crowd it out. |
| Correction, forgetting or permission change occurs during retrieval | A stale handle/cache/job cannot publish forbidden or superseded derived content. |
| A save is restored while generation is in flight | No experience or interpretation from the abandoned future is admitted. |
| Optional indexing fails or inference allowance is exhausted | Required context and native protection preserve their contract; unavailable optional work is explicit and no paid retry is invented. |

Measure supported recall, missed relevant sources, exact-fragment fidelity, stale/contradictory claims, privacy leakage, meaningful later behavior, time to reply and total cost. Include Jev selection, embeddings, observation generation, tool turns and repeated prompt reads. Measure cost per complete interaction, not only tokens returned by the search service. Compare both typical and tail latency; upstream token-saving examples do not establish game performance or enjoyment.

First reproduce a real missed-recall or excessive-context case. Then test the smallest discovery/inspection change that addresses it. Only after evidence supports the change should a scoped implementation be proposed under [cognition work](../../docs/maintainers/cognition-redesign.md), with any conversation, hearing and restore impacts assigned to their existing owners. This research does not reopen completed foundations or close remaining acceptance gates.

## Licensing, privacy and review limits

The [pinned upstream license](https://github.com/thedotmack/claude-mem/blob/71ddd11735d6dc38a6356fe376921fc216f2aa38/LICENSE) is Apache-2.0; earlier licensing descriptions must not be applied to this revision. The [upstream IP boundary](https://github.com/thedotmack/claude-mem/blob/71ddd11735d6dc38a6356fe376921fc216f2aa38/docs/ip-boundary.md) separates public components from commercial offerings. This document adopts ideas without copying implementation; any dependency still needs the repository's normal licensing review.

[Private tags](https://docs.claude-mem.ai/usage/private-tags) filter memory capture rather than undoing disclosure in the original conversation. [Auto-redaction](https://docs.claude-mem.ai/usage/auto-redaction) is optional pattern matching, not a substitute for player-data policy or actor scope. Neither a local database nor a hosted project key establishes those guarantees by itself.

Selected upstream source and official documentation were reviewed against the existing OpenLegend contracts. No Claude-mem runtime was installed, no live model or game experiment was executed, and no end-to-end isolation, deletion, retrieval-quality or performance claim is made. The recommendation is to pilot developer use and selectively borrow retrieval ideas only where the current game demonstrates a need.
