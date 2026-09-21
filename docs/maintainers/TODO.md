# Maintainer TODO — cross-cutting work

This file contains miscellaneous and cross-cutting deferred validation, integration blockers, documentation gaps and small follow-ups that do not belong to a focused feature tracker. Feature task state belongs in the focused trackers listed in the [maintainer work index](README.md).

Runtime latency, database scheduling, native CPU, buffering and long-session optimization are tracked in [PF00–PF11](performance.md). Existing feature correctness checks below remain open; performance work does not complete them.

## React design-system adoption

- [ ] Verify distinct gather resources show their resource icon plus hand badge in saved shortcuts and suggestions, including reload, unavailable targets, missing-target fallback and badge/key-label layout at supported UI scales; run the relevant checks.
- [ ] Update design-system guidance and verification evidence for consistent resource-plus-action icons across the picker and quick bar after validation.
- [ ] Complete typed world-agent proposal/question envelopes, semantic reuse and confirmed conjuring through the existing INV delivery track. Current structured recipe/job cards and prose-question affordances do not implement those server contracts.
- [ ] Complete the existing diagnostics revocation, late-billing/race and comprehensive follow/focus tests. Native fixture inspection does not establish provider billing or cognition quality.
- [ ] Complete broader device/browser and assistive-technology acceptance; desktop/mobile Chromium and keyboard checks are scoped evidence, not universal accessibility certification.

## Future character reaction bubbles

- [ ] Deliver optional transient overhead presentations of accepted reactions through [NC02/NC03/NC10/NC12](../maintainers/narration-and-conversations.md), without a duplicate implementation track. Brief “Hmm” or gesture variants must adapt to the player, current exchange, character disposition and nearby events, with explicit triggers, short display lifetimes and accessible presentation. The September 20 narration request supersedes the earlier no-memory rule for actual speech/expressions: accepted reactions are remembered, private thoughts stay private, and fading UI does not erase experience. Work progress and technical AI request status remain distinct. Preserve behavioral, timing, reduced-motion, overlap and privacy acceptance in the [UI brief](../ui-design-brief.md#future-character-reactions).

- [ ] Rehearse PostgreSQL import and recovery on preserved copies before switching a live world. `OPEN_LEGEND_DATABASE_URL` selects PostgreSQL; `scripts/import-postgres.ts SOURCE_SQLITE BACKUP_JSON` refuses an occupied destination and preserves the source. `scripts/backup-world.ts BACKUP_JSON` and `scripts/restore-world.ts BACKUP_JSON` require a stopped server; world restore preserves current spending and forgetting records. Use `pnpm exec tsx --env-file-if-exists=.env` to run these scripts. Validate record counts, full payloads, identities, knowledge, obligations, pending work and accounting. Never restore an older whole-database backup without replaying the newest forgetting ledger and spending records.
- [ ] Verify actual provider compatibility and costs under separately authorized caps: direct defaults are `gpt-5-mini` (level 2), `gpt-5` low/high (levels 3/4), `gpt-5-nano` (cleanup), and the existing configured Macrofold harness for reflection. Operator overrides are `COGNITION_MINI_MODEL`, `COGNITION_COMPLEX_MODEL`, `COGNITION_SUMMARY_MODEL` and their `MACROFOLD_*_MODEL` counterparts. Unknown costs conservatively consume reservations; model selection is not a price/quality measurement.
- [ ] Evaluate `text-embedding-3-small`, 512 dimensions, cosine ranking and bounded repository-backed vectors against held-out paraphrase/privacy/latency cases. `OPENAI_EMBEDDING_API_KEY` falls back to `OPENAI_API_KEY`; Macrofold credentials alone do not configure embeddings. `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` and `EMBEDDING_CALL_RESERVE_USD` are explicit controls. The store now uses PostgreSQL pgvector exact top-24 search for ordinary optional sections and top-32 search for older current-conversation speech; only permitted/revision-compatible candidates are scored and only IDs/scores leave the database. Index batches are 32 sources and query caches 16; valid source vectors no longer have a 1,024-entry eviction cap. Inspect lag rather than claiming complete indexing. Add regression coverage for JSON-cache migration, database top-N ordering, actor/model isolation, corrections/forgetting, and SQLite unavailability; benchmark larger scopes and approximate indexes before changing search quality.
- [x] Replace the interim six-question Cartesian-choice workaround with native `{state, questions}` Macrofold inference. Attention uses one bounded map; route/reflection and invention admissibility/mechanism are separate named questions. Live choice/score and eight rubric scenarios succeeded. Preserve native probabilities and confidence separately; broader calibration remains open.
- [ ] Verify Macrofold guarded `worktree_files` access, binary file read/write operations, ETag/worktree-revision correspondence, operation polling, warm-worker fresh-session isolation, and file reset after canceled/forgotten jobs. Shell and external tools stay denied. Reflection output has at most three thoughts, twenty words each; files are at most ten, 500 words and 8,000 bytes each. Legacy imports preserve over-quota content and reject workspace dispatch until reconciled, rather than truncating it.
- [ ] Confirm the native harness tool-event guard in a live bounded run. Eight tool calls is the application publication ceiling; event polling cancels/rejects an overrun, but the current Macrofold native API has no pre-dispatch tool-round cap. Timeout and monetary caps remain enforced; provider-side round admission would be needed for an exact no-overshoot guarantee. Do not claim that a prompt alone enforces a tool limit.
- [ ] Validate retention/tuning assumptions: raw recall six hours; 8,192-record backlog safety pause; 256 summaries, ordinary summary expiry after thirty game days, protected high-salience summaries; 100 presentation thoughts; 1,000 diagnostic roots/stages combined. Exhausted protected capacity pauses rather than silently dropping important memory. Rest credit uses calendar game days and allows split rest, sleep starts after fifteen uninterrupted resting minutes, and debt modestly increases fatigue. Native promise recognition initially requires explicit “I promise to …” speech; broader paraphrases must use an admitted interpretation rather than invent obligations.
- [ ] Exercise grouped god debugging entirely from the UI: routing, no-call/deferred/coalesced outcomes, candidate scores and unknowns, input/output/receipt details, background publication, late billing, filters, paging, follow/pause, new activity indicators, reading position/focus, revocation/world changes and bounded capture gaps. Verify private accepted text, thoughts and legacy audit history never enter ordinary actor/client recall. Inspection must issue no inference calls.
- [ ] Keep selective-recall tools behind the documented demonstrated-omission gate. No validated omission case was produced in this no-test batch; existing scoped recall supports assembly, while model-facing recall tools remain gated. Reflection file access is independent and implemented.
- [ ] Reconcile cross-cutting documentation after validation where evidence changes several owners. Explain prerequisites, configuration, quotas, tuning and real adapter limitations; do not mark a task complete from static compilation or proposed behavior.

## September 20 follow-up — runtime checks authorized without new tests

- [ ] Reconcile every remaining fixture failure against the accepted behavior before claiming a green suite; preserve meaningful privacy, stale-result and accounting checks while replacing obsolete contract assumptions.
- [ ] Configure a dedicated production database, rehearse the preserved-save import, and verify capped live embeddings/reflection with the configured BYOK provider. Disposable runtime checks do not establish full migration or workspace/provider acceptance. Correction to the initial billing interpretation: zero platform balance alone is not a local BYOK blocker; Macrofold inference reserves zero for BYOK, and local Docker BYOK runs reserve zero platform credit with zero-rate local compute. Hosted compute or separately charged services have distinct credit requirements. All Open Legend Macrofold inference, Jev and harness payloads forward the configured BYOK mode.

## September 20 database-side vector search

- [ ] Add durable vector migration/privacy/top-N regression coverage, crash/restart checks, and representative larger-scope latency/recall benchmarks. Exact search still compares eligible vectors inside PostgreSQL; adopt approximate indexing only with explicit recall-quality evidence.

## Shared input interaction follow-up

- [ ] Add deferred automated coverage for pause during response commit waiting through resume, actor unavailability during generation ending without a failed message, actor-specific Talk availability projection, and the disabled textarea's hover and keyboard explanation. Verify that only technical response failures receive message-local failure presentation. Tests were deferred at the user's request.
- [ ] Add regression coverage and reconcile design-system guidance for shared shortcut/spawn/trait ComboBox, portal typography, heading/body hierarchy, universal content spacing, corner wordmark, and starvation-driven gathering/resting oscillation. Verify ongoing food gathering is not replaced by rest each native tick.
- [ ] Add coverage and reconcile UI guidance for non-redundant animal descriptions, pointer-only hover labels after clicks, borderless inner action-search inputs, and empty states that count inspection/god rows and hidden unavailable actions.
- [ ] Cover and document shortcut combo-box layout: one input border/focus ring, full-control popup anchoring, inherited UI font/box sizing, wrapped labels, and scrolling at supported HUD scales.
- [ ] Add deferred accessibility regression coverage for shared typeahead selects: filtering, keyboard selection, focus-visible behavior, dismissal, eight-row scrolling, and explicit reduced-motion behavior.
- [ ] Add deferred preference coverage for unavailable-action filtering without post-save flashing, persistence success/failure, rollback, and refresh ordering.
- [ ] Reconcile the design-system documentation for the quick-action typeahead, eight-row scrolling, explicit motion preference, and unavailable-action interaction after visual acceptance.

## God-mode editors and pullouts

- [ ] Add regression coverage for delta-only editor requests with mature characters: a one-line memory edit or single deletion must send only the changed before/after entry, remain under the bounded body limit, preserve thousands of untouched memories, and report field-specific validation errors for malformed edited JSON.
- [ ] Add regression coverage for dirty-editor discard/reset and three-way save merging: preserve simulation-created memories/events, apply only user-edited/deleted entries, reject a conflict on the same entry, and allow refresh immediately after discard.
- [ ] Add automated coverage for the reusable right-hand pullout: alphabetical options, filtering, keyboard operation, focus/dismissal, viewport flipping and scrolling after eight rows. Reconcile the design-system component guidance after visual acceptance.
- [ ] Add editor-window coverage for fresh centering, independent dragging and stacking, non-resizability, tab focus, concurrent windows, refresh timestamps, atomic save, stale revisions, JSON/input validation, save-without-close and the Save and Close / Discard and Close warning. Document the reusable draggable/editor contracts and god-mode owner boundary.
- [ ] Add domain/API regression coverage for `/api/god/act` revive admission, actor-only behavior, person creation/editing, identity-mind synchronization, raw/consolidated memory updates, actor awareness removal, global world-event editing, request size limits, authorization and transaction rollback. Update the existing `/api/god/revive` fixtures to the general action route.
- [ ] Run browser accessibility and narrow-viewport acceptance for person creation/editing, trait descriptions/tags, memory/event JSON detail panes, multiple overlapping editors and game-time versus real-time labels. No automated tests or product documentation were written or run for this implementation per session instruction.

## Journal persistence, public patches and editor scaling

- [ ] Add crash/restart, incomplete-journal, compare-and-swap, periodic-snapshot compaction and shutdown-flush coverage for transactional world change journals. Measure journal growth and recovery time on mature saves, and document snapshot/retention policy after acceptance.
- [ ] Add automated coverage for explicit unchanged/append/diff event persistence contracts, incremental event-index maintenance, bounded player journal/conversation projection, player-audience milestone completion, atomic indexed experience batches and large world-event editor saves. Tests were deferred at the user's request.
- [ ] Add public `GamePatch` coverage for ordered delivery, reconnect from a retained revision, reset fallback, entity upsert/removal/order, revision mismatch recovery and strict exclusion of private world or actor-memory data. Measure patch sizes and browser work during routine simulation on mature worlds.
- [ ] Add editor coverage for summary-only list loads, one-record JSON fetches, hash conflicts, constant-time dirty tracking, discard/refresh, and fixed JSON panes while long memory/event lists scroll.
- [ ] Add interaction coverage and design-system guidance for the action picker's explicit refresh control, including loading, failure, repeated refresh and stale-response handling. The action picker must not poll; the diagnostics trace page keeps its accepted three-second polling cadence.

## Review fixes

- [ ] Add/run domain structural-sharing and nested-transition regression coverage, including immutable inputs, event DTOs without draft proxies, migration, deterministic command/response composition, and all existing native survival paths.
- [ ] Cover person-editor forgetting of raw evidence, awareness and dependent summaries; transitive dependencies, unresolved commitments, durable ledger restoration, concurrent reflection, vector invalidation failures and no resurrection after restart.
- [ ] Add automated coverage for the editor invariant guards: immutable identity/source-kind/evidence links, protected commitment/knowledge evidence, dependent summaries/corrections, global narration and retained observations. Extend the deliberately restricted editable fields only with explicit reconciliation rules.
- [ ] Cover constant-time memory/event typing with thousands of records, draft restoration across selection/tabs, discard/refresh, stale JSON fetches and save interaction locking. Measure long-list opening/scrolling separately; list virtualization remains a possible later optimization.
- [ ] Cover journal splice/replay, full snapshot thresholds, compare-and-swap, backup/restore/import with uncheckpointed journal entries, interrupted commits and shutdown. Measure mature-save CPU, bytes and recovery time; changed collection traversal and periodic full snapshots remain intentional.
- [ ] Cover memoized public projection dependencies/privacy, telemetry invalidation, ordered SSE replay/reset, byte/count bounds, slow-reader drain/timeout, server restart session refresh, stale callbacks, React-render/reconnect races, paused initial connections and concurrent bootstraps.
- [ ] Run browser acceptance and full repository checks when authorized. No paid/model-quality acceptance is claimed by native runtime checks.

## Editor and delivery follow-up

- [ ] Add automated coverage for transactional editor/cache invalidation (including rollback), unchanged-record identity, delayed JSON replies after refresh/discard/unmount, and first/reconnect SSE changes during projection. Verify indexed batch speech-job lookup on SQLite and PostgreSQL.
- [ ] Cover independent global event retention after actor consolidation, event deletion/edits with transitive summaries and correction evidence, attributed speech content, and successful saves followed by failed editor reloads.

## Central mutation and scaling follow-up

- [ ] Add automated coverage for the authoritative experience mutation entrypoint across add, batched update, batched delete and mixed editor saves. Verify owner/source validation, active commitments, transitive summaries/corrections, forgetting-ledger durability, inner-world reconsideration and transactional vector/interest invalidation.
- [ ] Add regression and performance coverage for append-hinted journal commits, explicit global-event edits, long event histories, restart milestone backfill and incremental milestone updates. Confirm normal event appends remain proportional to the appended records and that edit/delete paths cannot incorrectly use the append hint.
- [ ] Add observation compatibility coverage proving current awareness projects recent actor events without scanning global history, while legacy saves without cognition state retain their bounded fallback behavior.
- [ ] Add connection-race coverage for disconnect during SSE admission, concurrent connection-limit reservations, idempotent lease release, initialization failure and server shutdown.

## Intelligence latency and supersession follow-up

- [ ] Add automated coverage for typed concise trigger projection, legacy thought/world-agent normalization, stable trace/stage references, semantic stage labels, non-duplicated embedding/context summaries and root-only world-agent failure rendering. Verify the full sanitized stimulus stays available only through authorized raw JSON and never enters `GameView`. Tests were deferred at the user's request.
- [ ] Add automated coverage for separate Open Legend and Macrofold queue/execution latency, completed HTTP exchange timestamps, asynchronous diagnostic persistence and shutdown flushing. Exercise failed diagnostic writes without delaying or changing authoritative inference, job, accounting or world commits. Automated tests were deferred at the user's request.
- [ ] Add automated coverage for urgency-and-importance supersession: unrelated world movement must not reject speech or thought, a qualifying awareness entry aborts the active provider stage, every qualifying entry received before retry is rescanned into required evidence, and attempt-specific context/routing/action diagnostics do not overwrite each other. Verify evidence arriving during the refreshed attempt cannot create another retry and user, pause and shutdown cancellation never enter the supersession path. Automated tests were deferred at the user's request.
- [ ] Add automated coverage for the prompt conversation window: newest 32 speech events are always included; up to 32 older events from the same actor-permitted durably associated conversation use vector ranking and Jev relevance; missing legacy association, group membership, event-time privacy, embedding outage, deduplication and the shared 100-question/global-byte limits remain correct. Verify hourly and daily consolidation retain only the newest 512 verbatim speech sources per actor, older displaced speech becomes eligible again, and this prompt policy does not alter the independently bounded player projection. Automated tests were deferred at the user's request.
- [ ] Add automated coverage for post-route action selection: a confident closed gate performs no action query; an open or uncertain gate refreshes native feasibility; optional Jev failure exposes only that fresh bounded set; and commit-time target, range, inventory, cost and plan validation can reject the action without discarding valid speech or thought. Validate the revised Jev rubrics with live sampled outcomes before claiming quality. Automated and live tests were deferred at the user's request.
- [ ] Add typed/indexed diagnostic metadata columns only if retained trace volume grows beyond the current 1,000-record bound or measured history-query latency remains material after the single-query stage load. Keep JSON as bounded detail rather than introducing a migration for the current scale.
- [ ] Add automated coverage for asynchronous speech indexing: speech commits before provider work, notifications coalesce, actor-scoped 32-source batches catch up the newest-512 pool, spending denial and provider failure preserve speech, uncertain batches are not automatically repurchased, stale revisions cannot publish, foreground retrieval avoids in-flight duplication, shutdown drains or cancels safely, and SQLite remains an explicit structured fallback. Measure startup catch-up cost and lag on a mature PostgreSQL save before changing batch size or adding more scheduling infrastructure.
- [ ] Consider response-component provenance only if urgency/importance supersession plus deterministic action admission still discards useful speech or thought in observed play. Do not add sentence-level dependency tracking without a demonstrated failure.

## Three-program deferred validation

Automated tests were explicitly deferred for this implementation. These coverage tasks do not replace the ACT, D0–D2, NC or CR focused implementation trackers and do not establish acceptance.

- [ ] Repair existing async-service test typing before the full `pnpm run typecheck`/`check` gates; tests still read Promise results synchronously. No test files were changed in this implementation.
- [ ] ACT01–ACT06: old-save migration/idempotency/restart, preserved IDs/positions/RNG/time/inventory/knowledge/person and animal state, native wandering/fleeing/hunting, finite harvest/retry/restart, generic revival (including missing/living/incompatible/stale/duplicate/rollback), full god revival after partial/complete harvesting without inventory clawback, simultaneous effects/conditions, body susceptibility, capability upgrades, privacy, god authorization, action catalogue and protocol/browser projection. Update legacy fixtures that still mutate animal health/alive fields.
- [ ] Diagnostic FIFO: slow store off inference/Jev/poll critical path; A→B→C ordering; enqueue-time immutable snapshots; nested secret/abort/vector redaction; failure isolation; shutdown drain; unchanged workflow/job/billing outcomes; GET poll coalescing and capture/retention limits.
- [ ] D0/D1: WorldChanges diff/apply and array splice bounds; incomplete/head/gap rejection; CAS conflicts; append hints versus edits/deletes; 120-revision and UTF-8 1 MiB snapshot thresholds; compaction, uncheckpointed backup, empty-target restore/import, interrupted commit, clean shutdown and required event/receipt/mind/job/accounting agreement. Exercise ambiguous provider completion without paid replay. Compare SQLite/PostgreSQL record digests and verify source preservation.
- [ ] D2: separate event/awareness/memory/summary/commitment identities; mixed add/update/delete; correction/forgetting dependencies and protected obligations; transactional vector invalidation; restart privacy and non-resurrection; history paging/watermarks, explicit source edits/revocations, backup/restore/import. Measure mature journal size, snapshot bytes, recovery, backup/restore, queries/editor access, pgvector and routine commit CPU/bytes.
- [ ] NC01–NC12/CR12: all talk/act/think/silence combinations; expression zero-effects versus committed impact provenance; notable unseen retention; self-talk, two→five→two, join/leave/overhearing, merge races/duplicates/redirects/late responses, restart and legacy gaps; private narration provenance, source suppression, Journal/top-screen accessibility and read position. Cover generated Narrator execution, cancellation, coalescing, voices and fan-out.
- [ ] Behavioral acceptance: greeting, direct/overheard speech, appropriate silence, private thoughts, old promises/deadlines/fulfillment evidence, directional relationships, corrections/forgetting, significant-event reflection, sleep/dream and later recall. Keep native runtime evidence separate from separately authorized capped live naturalness, recall usefulness, latency, token and cost measurements.

- [ ] Add regression coverage for per-agent UTC month rollover, legacy ownership, concurrent reservations, uncertain prior-month billing, story claim/crash/restart, source revision races, causal coalescing/fan-out, explicit regeneration idempotency, voice permissions, transcript refresh/read position, editor paging and completion/job atomicity. No test files or suites were added or executed during this implementation.

- [ ] Keep Narrator JSON Schema on the execution adapter’s supported dialect and cover validation before paid dispatch; exercise scoped source revocation during generation and diagnostic trigger/stage linkage.

## Identity and reference verification

No test files or suites were written or run for this change, as requested. [Identity contract](../identity-and-references.md).

- [ ] Update existing fixtures that hard-code seeded `player`/`ada` IDs or old response fields; retain meaningful assertions and use saved bindings. Existing suites have not been validated against the new contract.
- [ ] Add regression coverage for event-ID-based memory attribution, preserved unknown legacy subjects, duplicate names, renames during pending responses, wrong-kind/unknown/disallowed IDs, empty action enums, malformed component fields, partial admission and exact response replay.
- [ ] Verify prompt/schema/binding parity, duplicate-name disambiguation, unrecognized-source privacy, reference budgeting and state changes while attention is running.
- [ ] Exercise old saves, restore across different bindings, history ownership, cache invalidation, SSE reconnect, and stale pending jobs without paid replay. Verify audit payloads and receipt digests stay unchanged.
- [ ] Plan and rehearse a coordinated migration if legacy IDs spelled `player`/`ada` must also disappear from existing saves. Cover database history, cognition/accounting/job references, integrations, backups and idempotency; do not rewrite arbitrary prose or digests. Current additive migration deliberately preserves those IDs.
- [ ] Run capped live response acceptance with explicit spending authorization; no provider requests were made during this implementation.

- [ ] Verify restored chat bubbles, pending/failure controls and older-message scroll anchoring across inactivity, leaving, disconnect/restart, new groups, legacy ungrouped speech, pagination and rapid person changes. Saved history must remain accessible without an active conversation.

- [ ] Verify Talk history excludes movement, eating, narration and unrelated speakers before pagination on SQLite/PostgreSQL; verify selected-person changes, old ungrouped direct speech and untargeted audible replies.

- [ ] Verify Talk history includes response-linked accepted actions and expressions in saved order without exposing private thoughts or unrelated journal events. Cover pagination, refresh, restart, selected-person changes and SQLite/PostgreSQL. Automated tests were deferred at the user's request.

- [ ] Verify Talk scrolls to the latest message after asynchronous history loads on first opening and reopening, even with cached messages and a long new backlog; subsequent arrivals must still respect a reader scrolled upward.

- [ ] Verify chat retry: one original bubble/speech event, preserved text/recipient IDs, latest-attempt status, double-click and transport idempotency, repeated failure, pause/unavailable actors, cross-world ownership, partial accepted effects, uncertain provider completion, restart recovery, keyboard access and Retry tooltip. No automated tests were written or run for this change.

## Deferred regression coverage — persistence and owner editors

- [ ] Cover the distinct person-creation and Person-editor schemas: creation keeps initial goals, editing round-trips description/current goals, the first goal drives native planning, and identity context receives every authored field without leaking it to another actor.
- [ ] Cover Person-editor stat snapshots, manual refresh, 0–100 validation, fill-to-100, preservation of unedited simulation drift, and explicit stat overrides after drift.
- [ ] Migrate stale test fixtures/callers to asynchronous repository/service APIs and current opaque actor bindings; restore the full typecheck/test gate. Tests were intentionally neither edited nor run in this change.
- [ ] Cover append proof across composed transitions, earlier-prefix edits, replacement/removal, divergent forks and forged caller hints; verify journal replay and durable history agree.
- [ ] Cover milestones from routine state before flushing and after a control/editor flush and restart, including event index consistency.
- [ ] Cover importance-only edits preserving dependent summaries/mind prose while refreshing retrieval metadata; text edits and deletion must still invalidate dependents.
- [ ] Cover Person memory pagination ordering/cursor staleness, collection-reference invalidation and page-only hashing; save conflict checks should hash only changed records.

- [ ] Verify a terminal actor-response rejection remains retryable with an uncertain provider receipt; preserve the old reservation, reject active/applied responses, and reject currently sleeping/incapacitated/dead recipients before dispatch.

- [ ] Verify shared TextTooltip on hover and keyboard focus: compact text-only Retry label, disabled composer explanation, viewport wrapping and portal layering across themes.

- [ ] Verify the shared composer input fills available width and Send stays at the right edge across disabled tooltips, multiline text and narrow panels.

## Story selection deferred validation

Automated tests were not written or run for this change at user request. These are validation gaps for [NC09–NC12](narration-and-conversations.md), not new implementation ownership.

- [ ] Cover ordinary hare/deer/person/object silence, high cognition importance/urgency silence, designated introduction once, reentry/version replacement, routine special-entity actions, and explicit consequential rules for ordinary entities.
- [ ] Cover hidden/private source exclusion, invalid values and unknown predicates, unauthorized editor access, atomic invalid field batches, defaults/removal/persistence, unused fields, and replacement evaluator behavior.
- [ ] Cover response grouping/source bounds, significance ordering, cooldown/drop/expiry, concurrent duplicate admission, restart and queued revocation, no automatic paid resend, provider failure, cancelled receipts and published-history stability.
- [ ] Cover migration with old queued/running/completed records, awareness/memory/accounting preservation, backup/restore including banner/frequency tables, owner-scoped SQL projection on SQLite/PostgreSQL, reload/dismissal/pending/legacy banner exclusion and editor accessibility.
- [ ] Repair existing full-typecheck failures in asynchronous store/service/view test callers; rerun full repository checks after restoring that baseline.

- [ ] Verify World Agent retry on workspace/sandbox/run admission rejection, `execution_disabled`, genuine lost-response ambiguity, provider re-enablement, two rapid clicks, same-request transport replay, reload of local drafts, closed tabs, world/text mismatch, budget rejection and persisted older ambiguous operation journals. Check no duplicate bubble/reply or execution, preserved accounting, and shared Retry icon/tooltip. No automated tests were written or run.

- [ ] Add Macrofold session-continuation regression coverage: creation includes configuration, continuation omits immutable fields while preserving per-run limits, changed defaults do not gate existing sessions, fresh reflection sessions retain configuration, and confirmed HTTP 400 rejection permits explicit retry. Automated tests deferred by user request.

## Deferred performance validation

No automated tests were written or run for these performance changes, by user request. [PF00–PF11](performance.md) marks delivered implementation and retains unfinished acceptance. The checks below remain deferred; small runtime observations are not capacity claims.

- [x] Run isolated native HTTP/SSE commands, retry/conflict/restart paths, cold-history owner lookup/deletion, backup/empty restore/existing-world restore and matched cadence observations. [Recorded evidence and limits](../verification.md#performance-investigation) distinguish synthetic history from live gameplay.

- [ ] Cover proven append versus edit/backfill/forged hints, duplicate IDs, chunk boundaries (rows/bytes/parameters), event-time perspectives, rollback, forgotten audiences, source revocation and schema readiness caching on SQLite and PostgreSQL. Reconcile ambiguous commit without paid replay.
- [ ] Cover Narrator startup/restart recovery, idle query count, causal deadlines, resume, pause cancellation, concurrent commit/claim/completion wakeups, explicit regeneration, revoked sources, failed storage and shutdown. Verify uncertain claims never automatically purchase a retry.
- [ ] Cover deferred optional projection, superseded asynchronous results, empty/error states, initial estimated usage, scoped speech/narration updates, reliable action publication, SSE replay/reset and privacy invalidation. Verify Talk opening scroll and older-page retention, Journal new-entry signaling, reconnect/session changes and destructive page reset without movement-triggered history reads.
- [ ] Differentially replay native simulation before/after migration removal, actor spawning/capability upgrades, source-specific experience admission, spatial encounter candidates/order/hysteresis and inter-step yields. Include all speeds, RNG, resource contention, death, promises, pause and immutable inputs.
- [ ] Cover cached thought/maintenance timestamps on failures/restart, cooldown eligibility before context work, single-writer cache ownership and background scheduling independent of native ticks. Verify maintenance/admission storage failures retain the explicit paused/error boundary while slow successful scheduling does not block native ticks.
- [ ] Cover dirty actor ticket invalidation, deletion/revival/capability changes, sleep/need/interest/age/hour/day deadlines, cooldowns, source edits, restore and enqueue-during-scheduling. Compare commitment completion/deadline ordering and numeric navigation path tie-breaking against the previous implementation.
- [ ] Cover atomic gameplay receipt/effect rollback, exact 24-hour boundaries, epoch rotation/pruning, clock changes, retry-body conflicts, reserved namespace rejection and backup rewind fencing on SQLite/PostgreSQL; legacy and paid/admin identities must remain intact.
- [ ] Cover cold event eviction versus deletion, retained awareness/obligation/knowledge sources, cold cross-event dependencies, row-coverage failures, journal replay, older backups and restore while preserving current forgetting/accounting.
- [ ] Validate bounded timing capture and authenticated metrics access; add missing request/browser/GC spans. Repeat PF00 with at least 1,000 successful intentions, a 30-minute soak, storage stalls, preserved mature history and actual PostgreSQL; compare action confirmation and first rendered movement separately. Short native SQLite observations are not these gates.
- [ ] Execute PF08 migration/recovery and PF09/PF11 population/crowd/load coverage after the remaining implementations and explicit scale authorization, including 100 independent players, 100 agents, thousands of animals, old receipts, privacy, fair admission and slow readers. No scale target has passed.
