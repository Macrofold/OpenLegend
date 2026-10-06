# Perceived World Events

## Status and ownership

Accepted player-facing event-history design; [Architecture](architecture.md#hearing-captions-and-perceived-events) records the implemented read route, finite filter catalogue and remaining qualification. The existing [narration contract](narration-and-conversations.md#5-external-world-events-and-awareness) retains ownership of world occurrences, event-time awareness, and retention. This document owns the comprehensive player-facing viewer, filtering, and read projection. [Hearing and speech](hearing-and-speech.md) owns speech detail; [memory](memory-architecture.md) owns recall and forgetting. The new viewer neither replaces the Journal nor introduces a new write pipeline.

## 1. Navigation and scope

Add a **World Events** launcher immediately below **Journal** in the normal player navigation. Reuse the current panel/pullout system and narrow-screen sheet behavior. This is distinct from the god-only World Events editor: the normal panel is read-only, actor-scoped, and never has raw JSON/edit/administrative access merely because the app also supports god mode.

The header has a plainly labeled **Type** filter, initially **All**, with **Speech** available immediately. Also provide meaningful event-family filters such as actions, expressions, environment and body/sensory events where those families are registered; preserve exact event type in row details. Do not invent world activity from the presence of a filter option. A flat filter or multi-select is enough; no query builder is needed.

**All** means every retained, authorized occurrence the player perceived, including their own enacted actions and speech, irrespective of narrator selection, importance, active conversation, or current camera location. Do not apply the current compact Journal feed's suppression of ordinary movement-start events to this comprehensive view. It does not mean recording every component tick as a new occurrence.

Include already-recorded permitted sensed body outcomes through their existing scope, but not a dump of private thoughts, plans, LLM diagnostics, technical status, or Narrator prose. Another actor's private experiences remain excluded. A heard but unintelligible utterance is a Speech row with no words, not an invisible row. A completely undetected and otherwise unperceived utterance does not appear. A supported visual-only observation of speaking must be labeled Seen, not Heard; no speech content is revealed.

The **Speech** filter is the world conversation log: it includes self-speech and overheard utterances from all perceived conversations, not only the current Talk session. Talk remains a focused conversational view. Journal remains a narrative/selected-history view. These are views of common permitted evidence, not three independently editable copies of speech.

## 2. Rows and interaction

Rows show simulation timestamp/day, a semantic event icon/type, permitted actor label when known, and the listener's permitted text. Speech uses quotes only for heard fragments, with an explicit Partly heard or Unintelligible qualifier when appropriate. A missing identity displays Someone or an appropriate permitted description, not the raw source name. Capture attribution as perceived at event time; do not silently update old unknown names from the current entity registry.

An expandable row may expose permitted modality, delivery, partialness and coarse event-time direction. It must not expose hidden target IDs, full original speech, exact hidden origins, internal audience lists, technical acoustic measurements or JSON metadata simply because the row has an event handle.

A speaker link opens current inspection only when that inspection is separately permitted now. An old log row cannot target, follow or focus the exact current position of a hidden actor. Reading history and changing filters create no new sensory evidence, cognition opportunity, or overhead caption.

Display chronological order within each loaded page, opening at the latest row. Retain older pages while the reader scrolls upward; new events show an unobtrusive “New events” affordance instead of stealing scroll. Changing filter resets the page cursor and isolates in-flight results from the old filter. Failed loads show a retryable error and keep valid already-loaded content where scope is unchanged.

The UI may initially load 50 rows per page, with a server maximum of 100. These are page sizes, not history-retention limits. “Load older” must reach all authorized retained history, rather than the last 60 hot events or last 512 awareness entries. Show truthful empty, loading, unavailable-history and end-of-history states; do not call an unavailable archive empty or claim complete history while a page failed.

## 3. Read API and common projection

The browser uses the shared `getScoped` request helper, carrying its tab identity and current authority scope. Pending requests can be aborted, and responses from an obsolete access generation are rejected before entering the panel. This matches the other private-history consumers.

The delivered `GET /api/world-events?type=speech&limit=50&cursor=...` reads through the existing actor-scoped history repository. The route binds the authenticated account and actor, checks the current timeline/history/access scope again after the asynchronous read, and returns unavailable history explicitly. It neither mixes Narrator records into the page nor changes Talk behavior. The endpoint is a read view, not a new event system.

World, controlled actor and authorization are bound on the server; the client cannot request another actor's experience by choosing an actor ID. The current route accepts a syntactically valid exact event type, binds it in SQL and returns an empty page for an unmatched type; the UI exposes its finite filter catalogue. Registration-driven discovery remains a separate extension, not current server-side catalogue validation. Omit type for All.

The current wire contract is `PerceivedEventsPage` in `packages/protocol/src/index.ts`: an `events` array of `PublicEvent`, an optional `nextCursor`, and an optional `scanLimited` flag for bounded text-search work. An absent next cursor means no further page in that read snapshot. Scope is carried by the authenticated request and bound cursor, not a second client-supplied result envelope. Public events include permitted modality and typed speech detail where applicable; they are not `WorldEvent` serialized wholesale. Preserve the existing event identity so a speech event has one identity across Talk, captions, Journal references and World Events.

Use one audited evidence-to-public-view projector for both hot events and paginated history. It starts from the reader's retained event-time awareness/perspective, not from raw world text after an audience-membership check. Domain/model formatting shares the same underlying permitted content, without requiring a server UI module in the domain.

## 4. Query and storage behavior

Talk and Journal must reuse the actor-scoped history access path rather than scanning global event order for a small page. Compute transcript watermarks from that actor's perspectives and the owning player's narration; retain their distinct filtering and presentation semantics.

Reuse the existing durable event and actor-perspective/awareness records. A retained `history_perspectives` row grants access and carries the complete permitted evidence; it replaces the separate audience-membership row. Typed order/type and permitted source/target/dialogue-participant columns are written in the same transaction and indexed for scoped pages. Speech masks and identity attribution remain self-contained after recall consolidation. No per-player copied event table or speech-specific event store is required. Persist a listener's projected partial text/identity at emission under the existing transaction owner; both hot and cold reads use those same facts. Normal memory consolidation cannot make old permitted transcript rows disappear simply because they left a hot/context window.

Apply actor authorization, forgetting/revocation, external/permitted-occurrence scope and type filters **before pagination**. A post-filtered global page can leak counts, miss rows or produce misleading empty pages. Use stable keyset pagination over the existing event order plus unique identity, not timestamps alone or ever-growing OFFSET scans. A cursor binds the authorized world/actor, timeline, history epoch, filter, position and initial high-watermark. It is validated/opaque, not a grant of authority.

Newer events arriving during older-page navigation must neither duplicate nor skip rows in that snapshot. A separate refresh supplies the new tail. Use an appropriate existing actor-perspective/order index; add a measured type-query index if plans require it. Do not scan or serialize the entire event archive to open a panel. Avoid expensive total counts; any displayed count must be actor-scoped and clearly describe its filter/retention window.

An optional text search (`q`) filters the same authorized, type-filtered rows before paging. It matches only each row's permitted perspective text, the text the reader is shown, so a search adds no exposure beyond that text and can never confirm unheard words or raw payload content. The [BW22 target-name repair](verification/camp-life.md#observer-safe-target-names-bw22) keeps targeted expression, teaching and strike/hunt shared text neutral and records each observer's own known/unknown label. Its PostgreSQL evidence covers Talk, Journal and World Events without retroactively naming earlier unknown targets; it is not full browser or provider qualification, and existing development history was not backfilled. Every word must match a word start. One request examines a bounded window of rows; when that window holds no more matches the response says so and the cursor continues into older history, so every retained row stays reachable without unbounded work per request ([HR06](limits/hearing-and-speech.md#hr06--history-paging-and-growth)).

Cold-history read failure never falls back to unredacted raw events. A missing expected perspective is an explicit integrity/unavailable condition, not an excuse to show full speech. Preserve current history backpressure and storage-failure boundaries.

## 5. Invalidation and privacy

The list uses existing scoped history revision notifications rather than periodic polling or movement-triggered full-history reads. Extend those notifications to include every row family eligible for this view, including families excluded from Journal; otherwise a movement event could be stored but never appear live. Use the smallest appropriate separate view revision if reusing a Journal-specific revision would cause needless reads.

Incremental new entries preserve scroll. Destructive history invalidation, actor/control changes, save timeline changes and source revocation clear stale retained pages and reject late replies. A save rewind is not permission to merge old-future rows into the new timeline. Reconnect refresh is history recovery, not a request to replay overhead speech.

The normal log is durable player history, not the actor's bounded current recall window. However, authoritative forgetting, privacy erasure and source revocation still remove or suppress affected evidence and derived projections. A player-facing history cache is not an escape from those boundaries. No UI can guarantee that a human forgets text they previously saw; the enforceable requirement is that the system no longer serves the revoked records.

Private Narrator prose remains in its existing Journal surface, linked to permitted evidence. It must not be re-emitted as an external world occurrence or count as a second speech event.

## Delivery references

Implementation sequencing is in [the hearing tracker](maintainers/hearing-and-speech.md); future automated coverage is in [TODO](maintainers/TODO.md#hearing-captions-and-perceived-events--deferred-validation). Broader event intake, memory and database work retain their existing owners; this feature does not claim that the full proposed EPR architecture is already implemented.

## Maintained records

- Implementation and acceptance: [HE01–HE05](maintainers/hearing-and-speech.md).
- Limits and constraints: [hearing, captions and perceived history](limits/hearing-and-speech.md).
- Related contracts: [Hearing evidence](hearing-and-speech.md#5-one-occurrence-listener-specific-evidence).
- Current integration evidence: [combined verification](verification/hearing-main-integration.md).
