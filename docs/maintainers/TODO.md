# Maintainer TODO — cross-cutting work

## Macrofold worker reuse — deferred validation

- [ ] Cover one sandbox creation across repeated full calls, actor/reflection lanes sharing a worktree, restart and timeline rotation; separate worktrees must remain isolated. Verify run bodies retain the saved sandbox ID and fresh sessions do not reuse model history.
- [ ] Cover concurrent creation, lost creation responses, stable retry key/body after configuration changes, persisted lane-ID adoption, one compute reservation, zero-rate settlement and unavailable workers without replacement. Run live acceptance once the configured Macrofold endpoint is available; no automated tests were written or run for this change.
- [ ] Cover workspace creation recovery with changed actor names and missing original bodies; zero-rate paused-worker resume, repeated pause episodes, failed/ambiguous resume and refusal to renew paid compute implicitly. Cover process interruption after ledger reservation/settlement but before the allocation marker, preserving the original amount/account scope and rejecting ordinary model-call replay.

## Invention foundation — deferred automated coverage

- [ ] Cover supplied proposal normalization/fidelity, unknown materials, duplicate receipts, actor/world/timeline fencing and no-provider admission.
- [ ] Cover private NPC response dispatch, rejected-method feedback, one-child revisions, abandon/stop, lock/reopen during deliberation, cancellation and restart without paid replay; inspect player/NPC/narrator projections for leakage.
- [ ] Cover gathering-tool cost, non-stacking yields, finite/depleted resources, current action facts and same-version recipe/item restoration.
- [ ] Cover native action interpretation with NPC invention enabled, preservation of intent-withdrawal handles when action relevance fails, generated gathering targets outside scoped knowledge, and `idle()`/shutdown while a child invention is registering (including storage failure).
- [ ] Exercise the complete browser-originated bow/arrow craft/use flow and compare clear/ambiguous/forbidden prompts across more live samples under explicit caps. No automated tests were written or run for this slice.

This file contains miscellaneous and cross-cutting deferred validation, integration blockers, documentation gaps and small follow-ups that do not belong to a focused feature tracker. Feature task state belongs in the focused trackers listed in the [maintainer work index](README.md).

Runtime latency, database scheduling, native CPU, buffering and long-session optimization are tracked in [PF00–PF11](performance.md). Existing feature correctness checks below remain open; performance work does not complete them.

[Agent agency](agent-agency.md) owns the new decision/goal/plan work; [EPR](events-perception-and-reactions.md) owns shared reaction intake. Their tasks and acceptance stay in those focused trackers.

## Spatial review regression TODOs

No automated tests were written or run for the spatial scaling reviews. The third pass adds [manual/build evidence](../verification.md#spatial-scaling-review-third-pass), not automated qualification. Manual runtime and production-build evidence belongs in [Verification](../verification.md#spatial-scaling-review); SW/PF/EPR retain feature ownership. The earlier spatial fixtures/browser result does not certify these changes. Earlier fixture version labels are historical; use current constructors and safe in-place upgrade cases while retaining their behavioral coverage.

- [ ] **SR01 — Indexed geometry equivalence:** compare the full-extent tree against a simple complete scan for rays, support selection, sweeps and acoustic ordering. Cover large solids with centers outside the query, stacked/coplanar surfaces, sloped/filled ramps, negative coordinates, exact tangencies, zero-length segments, shared boundaries and shape-limit rejection. Exercise support-ID lookup, changed revisions and candidate Immer geometry before commit; no missed broad-phase candidate may imply clear space. Include center-based partitioning of wide stacked slabs and equivalence of early-exit boolean stance/sweep queries to complete sorted hits; sound must retain canonical crossing order.
- [ ] **SR02 — Navigation and stance work:** cover many stacked floors, height-tolerance seams, disconnected supports, directed edges, equal-cost ordering, cold/warm profiles, actual node/search/output limits and several valid/invalid interaction stances. Coarse support groups and fully explored closed-region facts can prove disconnection, never a positive route; eagerly computing weak graph components is no longer a requirement. Preserve native durations/consumption, exact surface endpoints and distinguish incomplete search from physical impossibility at the future status integration.
- [ ] **SR03 — Visibility and sound invalidation:** cover stationary actors after a wall/sense-manifest edit, observer/target height and pose changes, mutable draft queries, map replacement/load and cache eviction. Exceed 128 cached observers and 512 targets without dropping exposures or leaking state. Distant hearing rejection must agree with the full transmission rule; a muffled source must not enter full-text speech audiences.
- [ ] **SR04 — Landing and occupancy:** cover two simultaneous landings, moving occupants, already-landed birds, different coplanar support IDs, same XZ at separate heights, multi-cell extents, dead/removed participants and direct advanceFlight callers. A landing/takeoff exemption must never permit crossing a slab underside or ramp side. Keep general falling-volume safety, actor avoidance and deadlock fairness as SW07/SW12 feature gaps rather than asserting they are implemented.
- [ ] **SR05 — Observation privacy:** verify another actor's spatial.flight, native action.path and destination are absent from actor context as well as public views; preserve legitimate current activity and the observer's own private plan. Check live/remembered source scope after geometry updates, world switches and same-version restore. Verify pre-copy sanitization preserves permitted output and excludes long private agency/flight/path data before deep-copy work. Mutating nested returned actor, resource, inventory and observation records must not change the source or another observation; support both frozen snapshots and valid candidate drafts.
- [ ] **SR06 — Renderer dirty work:** exercise geometry-only rebuild with retained sprites/materials, late appearance replacement, shadow support at a seam, world/load reset, camera-orientation versus pan/zoom, stationary/moving sprites, floor cutaways, paused views and disposal. Verify cached transforms/scale/shadows still refresh when needed, hover deduplication/20 Hz sampling does not delay clicks, and stale/hidden targets cannot stay interactive. Collect allocation/GPU-resource and long-session evidence; the native timings do not measure rendering.
- [ ] **SR07 — End-to-end and sustained runtime:** extend existing spatial HTTP/restore/browser coverage to the review cases, including profile/geometry changes during native work, concentrated first exposures, long moving populations and repeated blocked landings. Separate first-exposure event fan-out, cold graph preparation and steady-state work; measure tail latency and retained memory rather than only averages. No model calls should be introduced by navigation, camera motion or index reconstruction.

- [ ] **SR08 — Draft-local admission membership:** automate repeated single additions and batches into long awareness/memory/summary histories; duplicate and forgotten IDs; same-length updates; deletion, correction, obligation changes, consolidation and array replacement; mixed-batch rollback, empty/new arrays, independent draft forks and raw mutable builders. Compare accepted entries/invalidation with direct live lookup. Inspect garbage collection across finished drafts; neither cached IDs nor profiling may become canonical/save state.
- [ ] **SR09 — Lazy support navigation and scratch reuse:** automate disjoint/partially overlapping/sloped supports, exact and tolerance-height seams, zero-cost star connectivity and collision-blocked overlap. Direct shared-endpoint paths must validate both native legs and preserve destination identity; unreachable or unsupported links cannot use the shortcut. Compare reachability/cost with the full grid where shortcuts are absent; include a failed/budget-limited query followed by success, alternating profiles/worlds, geometry edits, counter wrap, output caps and saved route continuation. Measure cold blocked connected overlap separately from cheap disconnected stacks; no worker/capacity claim follows from a cache hit.
- [ ] **SR10 — Acquisition scope and outward-audience equivalence:** private visual acquisition now intentionally has only its observer as audience. Compare real outward speech/action recipients and ordering against uncached exact sensing; cover sleepers, dead/non-memory actors, new actors, private contacts and source changes. Assert that C seeing A but not X cannot acquire X from A noticing it. Do not restore the obsolete broadcast-acquisition behavior merely to match an old digest.

- [ ] **SR11 — Lazy exact graph and closed-region proofs:** compare reachability and cost against an independent complete graph for the finite cardinal/seam family, including fractional endpoints, sloped and differently named co-located supports, invalid hub stances, asymmetric tolerance seams, blocked shortcuts, output caps and geometry/profile revision changes. Exercise lazy node/edge cache ordering, reverse-list completeness, deterministic equal-cost choices, counter wrap and budget-limited searches followed by full searches. A completed failed search may prove a closed region; a partial/budget failure cannot. Cover overlapping cached regions, more than four failures, eviction, new start subsets, a goal inside versus outside the region, and cold/warm results. Qualify worst-case no-route work separately from successful goal-directed search; new diagonal/discounted traversal requires a new admissibility check.
- [ ] **SR12 — Native participant roster:** compare each fixed-step outcome/event/RNG order with live full enumeration for mixed inert objects, actors, animals and heat sources. Include death/incapacity, cooling fires, landing, long native actions, queued plan commands replacing a draft, memory-disabled populations and memory capability changes between advances. Do not retain revoked draft entities. When a future native family adds/removes participants or relevant components, its mutation must refresh the roster before the affected phase; add that regression with the family. Roster reuse does not justify coalescing application-level perception/commit boundaries.

- [ ] **SR13 — Lazy navigation and movement-patch equivalence:** compare reachable cost and native segment validity with an independent complete graph for blocked/unblocked identical, partially overlapping and distinct patches. Preserve explicit fractional start/destination support IDs through representative seams; cover different bounds, planes, slopes, thickness, bases and materials. Different acoustic transmission/name/level metadata must remain physically and audibly distinct despite shared navigation. Include upper/lower floors, short routes, full no-route exploration, cached edges in different query orders, limits and saved paths. Future private or directed support families must not inherit public movement equivalence silently; do not require obsolete exact node numbering as behavioral equivalence.
- [ ] **SR14 — Exact stance and completed-failure memoization:** cover frozen versus mutable points, changed point height, body radius/height/slope, candidate geometry and revision/load replacement. Exercise budget-exceeded followed by success, repeated genuinely unreachable endpoint attachments, direction reversal, changed attachment sets, four closed-region proof eviction and generation wrap. Only fully exhausted no-route searches may create a closed-region proof; eviction cannot remove evidence or bypass validation. Confirm bounded retained graphs/weak point lifetime and measure distinct connected overlap independently of identical-patch fast paths.
- [ ] **SR15 — Independent JSON-data copying:** cover primitives, sparse arrays, nested objects and Immer proxies, finished draft lifetimes and modifications after copying. A JSON `__proto__` property remains an own data property and must not change prototypes; copied awareness/event/observation records must not alias mutable source data. Compare event/awareness/commitment outcomes through mixed mutation batches and record allocation/finalization under mature history. This is domain JSON copying, not a new general object serializer.

## Deferred shared-invention and output-reference validation

No automated tests were written or run for this implementation, at the owner's request. Production build and manual runtime observations are recorded separately in [Verification](../verification.md#shared-inventions-and-plan-outputs).

- [ ] Update existing response fixtures from `plan.actionIds` to total `plan.steps`, and save fixtures to the current state shape. Automate strict provider encoding, backward-only references, missing/consumed/foreign outputs, merged stacks, chained cooking, restored running work, interruption and no continuation inference.
- [ ] Automate shared-service routing/reuse, candidate checkpoint and commit crash boundaries, cancellation while queued for the writer, lock/reopen, policy/world changes, replay conflicts, typed provider failures, unknown billing, browser reload and scoped paginated history (including equal timestamps). Cover restoration that removes a formerly admitted recipe without deleting request history or replaying spend. Extend manual SQLite evidence to PostgreSQL.
- [ ] Add generic schema-walker coverage for fields named `properties`, `$ref` and other schema keywords; distinguish literal `const`/`enum` data from schema nodes, reject actual references/open objects, and verify invalid trusted schemas fail before provider dispatch. Re-run the revised plan envelope through live providers and broader browser/accessibility scenarios under a separate bounded qualification run.

## Deferred attribution validation

- [ ] Update declaration/save/view fixtures for current constructors and required authorship records. Automate multiple world creators, player-as-creator deduplication, NPC/player ownership, unknown player accounts, independent identical inventions, request replay/conflicts, teaching without ownership transfer, controller/membership changes after creation, known-only filtering, private account-ID omission, same-version save/load and missing-record rejection. No automated tests were written or run for this slice.

## Deferred invention-policy validation

- [ ] Update existing declaration/save fixtures for required origin stamps and current constructors, then automate independent locks, pre-dispatch denial, lock/reopen revocation, unrelated-group changes, cancellation accounting, owner definition/state distinctions, stale settings, restore-generation fencing and same-version save recovery. Cover missing/forged origin, non-god endpoints, public settings and UI persistence. Prefer small in-place updates; fixture changes and automated suites were deferred at the owner's request.

## Deferred agency validation

Automated tests were explicitly excluded for this slice. Production compilation and manual native/service/browser execution are evidence only for the observed cases.

- [ ] Update existing response/goal/save fixtures for the current intentional schema-9 spatial cutover, then add automated coverage for the [AG11 matrix](agent-agency.md#ag11--integrated-deterministic-and-adversarial-acceptance). Cover strict provider encoding, repeated operations, partial admission, alias/reference attacks, actual durations/material conservation, saved running work, cancellation, terminal-history bounds, reflection revisions, scope/privacy, starvation adequacy, private feedback and stale/retired job admission. Do not add old-save conversion fixtures.
- [ ] Add injected persistence-failure and concurrent-admission coverage for atomic decision/job writes, restart at each dispatch boundary and callbacks beyond hot receipt retention. Extend same-version SQLite observations to PostgreSQL.
- [ ] Add automated coverage for verified Macrofold harness failure with absent billing: preserve the failure code/run ID and failed execution disposition while retaining the full unpriced reservation. Include reflection, full generation and world-agent callers; transport/persistence uncertainty must remain distinct. Manual replay evidence is in [Verification](../verification.md#live-agency-contracts).
- [ ] Run the separate [AG12 live gate](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) with an explicitly authorized total spending cap. Verify immediate/reflection provider schema compatibility, spontaneous optionality, useful plan construction/adaptation and complete costs before claiming model quality.
- [ ] Automate native attempt resolution with a closed suggestion gate, zero-budget/exact-match bypass, unpriced/failed interpretation, forged or repeated handles, per-response/quota bounds, manifest changes during inference, private withdrawal and cross-actor IDs, explicit replacement, malformed composition rejection, saved running continuation and duplicate durable response admission. Keep synthetic interpreter fixtures separate from live semantic-quality evidence.
- [ ] Measure agency context size and native overhead on representative larger saved worlds before adding caches, batching or extra queues. Small-world paired runs are not population capacity evidence.

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
- [ ] Evaluate `text-embedding-3-small`, 512 dimensions, cosine ranking and bounded repository-backed vectors against held-out paraphrase/privacy/latency cases. `OPENAI_EMBEDDING_API_KEY` falls back to `OPENAI_API_KEY`; Macrofold credentials alone do not configure embeddings. `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS` and `EMBEDDING_CALL_RESERVE_USD` are explicit controls. The store now uses PostgreSQL pgvector exact top-300 search for optional sections including older current-conversation speech; only permitted/revision-compatible candidates are scored and only IDs/scores leave the database. Index batches are 32 sources and query caches 16; valid source vectors no longer have a 1,024-entry eviction cap. Inspect lag rather than claiming complete indexing. Add regression coverage for JSON-cache migration, database top-N ordering, actor/model isolation, corrections/forgetting, and SQLite unavailability; benchmark larger scopes and approximate indexes before changing search quality.
- [x] Replace the interim six-question Cartesian-choice workaround with native `{state, questions}` Macrofold inference. Attention uses one bounded map; route/reflection and invention admissibility/mechanism are separate named questions. Live choice/score and eight rubric scenarios succeeded. Preserve native probabilities and confidence separately; broader calibration remains open.
- [ ] Verify Macrofold guarded `worktree_files` access, binary file read/write operations, ETag/worktree-revision correspondence, operation polling, warm-worker fresh-session isolation, and file reset after canceled/forgotten jobs. Shell and external tools stay denied. Reflection output has at most three thoughts, twenty words each; files are at most ten, 500 words and 8,000 bytes each. Legacy imports preserve over-quota content and reject workspace dispatch until reconciled, rather than truncating it.
- [ ] Confirm the native harness tool-event guard in a live bounded run. Eight tool calls is the application publication ceiling; event polling cancels/rejects an overrun, but the current Macrofold native API has no pre-dispatch tool-round cap. Timeout and monetary caps remain enforced; provider-side round admission would be needed for an exact no-overshoot guarantee. Do not claim that a prompt alone enforces a tool limit.
- [ ] Validate retention/tuning assumptions: raw recall six hours; 8,192-record backlog safety pause; summary retention without a fixed count ceiling, ordinary summary expiry after thirty game days, protected high-salience summaries; 100 presentation thoughts; 1,000 diagnostic roots/stages combined. Exhausted protected capacity pauses rather than silently dropping important memory. Native promise recognition initially requires explicit “I promise to …” speech; broader paraphrases must use an admitted interpretation rather than invent obligations.
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

- [ ] Cover stress-runner option bounds, invalid material properties, input/output collisions, fixed-seed reproducibility, occupancy exhaustion, object stacking, timeout during setup/native execution, interruption cleanup, and private output permissions. Compare input bytes before/after and verify no provider/database access; automated coverage deferred by request.

- [ ] Differentially replay optimized encounters across moving observers, sight/hysteresis boundaries, dead actors, ordinary/cognitive animals, static objects, initial missing visibility state and same-position spawn/remove/edit operations. Verify exact event/audience order and source privacy, plus unchanged-array identity. Qualify cognition refresh spans and fair scheduling under staggered eligibility, cancellation, provider latency and spending exhaustion. Bounded dense first-arrival runs now complete; retain the broader differential and scheduling acceptance cases.

No automated tests were written or run for these performance changes, by user request. [PF00–PF11](performance.md) marks delivered implementation and retains unfinished acceptance. The checks below remain deferred; small runtime observations are not capacity claims.

- [ ] Cover profiling monitor cleanup/restart, bounded retention, cumulative units/deltas, nested spans, in-flight debt, rejected commits, fractional steps and excluded timer gaps. Differentially replay immutable snapshot candidates across seed/load/migration/editor/privacy paths; include long growing-history runs and overloaded 1×/3×/8× clocks versus true suspension. Automated coverage is deferred by user request; implementation remains in PF00/PF03. Include debt retained across speed changes and cleared by pause/suspension, command interleaving between prefixes, failed commits and immutable editor/source deletion. Defer OS-specific suspension detection unless single synchronous operations exceeding two seconds remain a measured problem; callback silence still uses the existing absence policy.

- [x] Run isolated native HTTP/SSE commands, retry/conflict/restart paths, cold-history owner lookup/deletion, backup/empty restore/existing-world restore and matched cadence observations. [Recorded evidence and limits](../verification.md#performance-investigation) distinguish synthetic history from live gameplay.

- [ ] Cover proven append versus edit/backfill/forged hints, duplicate IDs, chunk boundaries (rows/bytes/parameters), event-time perspectives, rollback, forgotten audiences, source revocation and schema readiness caching on SQLite and PostgreSQL. Reconcile ambiguous commit without paid replay.
- [ ] Cover Narrator startup/restart recovery, idle query count, causal deadlines, resume, pause cancellation, concurrent commit/claim/completion wakeups, explicit regeneration, revoked sources, failed storage, pause/shutdown during claim loading or before reservation, stale-source claim finalization, and shutdown while the earliest-deadline query is pending. Verify uncertain claims never automatically purchase a retry.
- [ ] Cover deferred optional projection, superseded asynchronous results, empty/error states, initial estimated usage, synchronous conversation text during pending/failed reply-status reads, narration-completion/regeneration refresh signals, spatial visibility parity, reliable action publication, SSE replay/reset and privacy invalidation. Verify Talk opening scroll when scoped refresh supersedes the initial load, opening-load failure/retry, and older-page retention, Journal new-entry signaling, reconnect/session changes and destructive page reset without movement-triggered history reads.
- [ ] Differentially replay native simulation before/after migration removal, actor spawning/capability upgrades, source-specific experience admission, spatial encounter candidates/order/hysteresis and inter-step yields. Include all speeds, RNG, resource contention, death, promises, pause and immutable inputs.
- [ ] Cover cached thought/maintenance timestamps on failures/restart, current eligibility before context work, actor removal during awaited schedule reads, single-writer cache ownership and background scheduling independent of native ticks. Verify maintenance/admission storage failures retain the explicit paused/error boundary while slow successful scheduling does not block native ticks.
- [ ] Cover dirty actor ticket invalidation, deletion/revival/capability changes, sleep/need/interest/age/hour/day deadlines, source edits, restore and enqueue-during-scheduling. Compare commitment completion/deadline ordering and numeric navigation path tie-breaking against the previous implementation.
- [ ] Cover atomic gameplay receipt/effect rollback, exact 24-hour boundaries, epoch rotation/pruning, clock changes, retry-body conflicts, reserved namespace rejection and backup rewind fencing on SQLite/PostgreSQL; legacy and paid/admin identities must remain intact.
- [ ] Cover cold event eviction versus deletion, retained awareness/obligation/knowledge sources, cold cross-event dependencies, row-coverage failures, journal replay, older backups and restore while preserving current forgetting/accounting.
- [ ] Validate bounded timing capture and authenticated metrics access; add missing request/browser/GC spans. Repeat PF00 with at least 1,000 successful intentions, a 30-minute soak, storage stalls, preserved mature history and actual PostgreSQL; compare action confirmation and first rendered movement separately. Short native SQLite observations are not these gates.
- [ ] Execute PF08 migration/recovery and PF09/PF11 population/crowd/load coverage after the remaining implementations and explicit scale authorization, including 100 independent players, 100 agents, thousands of animals, old receipts, privacy, fair admission and slow readers. No scale target has passed.

## Manual save/load deferred validation

- [ ] Cover clicking the ground after loading a paused world: show “Press Play to resume the world,” reserve reconnect messages for a lost connection, and allow movement after resuming. Automated coverage deferred at the owner's request.
- [ ] Cover the Game launcher position, empty/list/error states and save/load/re-save flow; verify custom data directories and `.data/saves/` exclusion from Git. No automated tests were written or run for this menu change.
- [ ] Cover atomic folder publication, interrupted candidates, disk-full/rename failures, directory permissions, damaged metadata and concurrent delete/create requests. Defer orphan cleanup and per-slot catalog corruption recovery until needed; verify manual save folders are included separately in operational backups.

Automated tests were neither written nor run for the initial implementation, at the owner's request. Capability work stays in [SL00–SL10](save-and-load.md); add the following automated coverage when authorized. Cover safe in-place upgrades under the [active development policy](../save-and-load.md#active-development-policy); do not add reset-based fixtures or parallel legacy runtimes.

- [ ] Cover create/list/delete, the slot/size limits, duplicate create/load requests, incompatible formats, corruption, and source-preserving failures on both SQLite and PostgreSQL.
- [ ] Cover native continuation including partial actions, inventory/definition additions, RNG, cold history, inner worlds, retained narration and current forgetting overlays. Verify complete dependency coverage whenever a new authoritative store is added.
- [ ] Cover lost load responses, concurrent requests/ticks, fresh browser baselines, all-tab conversation/draft invalidation, stale commands and callbacks, worker-drain failures, unchanged spending/uncertain attempts, and recurrence of event IDs without abandoned-future job links.
- [ ] Inject publication/install/COMMIT failures and process death; verify rollback/cache agreement and the pre-load recovery slot. Exercise server restart, slot persistence and the operational backup/import paths with slot rows.
- [ ] Qualify live-provider cancellation/workspace context and PostgreSQL restore under separately authorized no-spend or capped conditions; current native browser evidence does not establish these boundaries.
- [ ] Measure large saves and cold histories before changing the 64 MiB/20-slot limits. Defer streaming, compression, incremental snapshots, autosaves and portable/cloud saves to the focused tracker rather than adding speculative machinery.
- [ ] Reconcile the pre-existing full-typecheck failures in test files that still treat asynchronous APIs as synchronous; the production build succeeds, but that is not a green full check.

## Extensible attribute foundation — deferred automated validation

No automated tests were written or run for this slice at the owner's request. Runtime observations live in [Verification](../verification.md#extensible-attribute-runtime); EWF/AG/EPR/INV remain the implementation owners.

- [ ] Automate the attribute-slice failure cases specified by [EWF01–EWF04 and EWF07–EWF09](extensible-world-foundation.md): strict host/schema/units and namespace rejection, duplicate owners, private projection, same-version active continuation, missing pins, resource depletion/competition/cancellation, immutable snapshots, and current native behavior/RNG equivalence.
- [ ] Cover atomic initialization/edit conflicts, duplicate declaration/edit requests, restore-generation fencing, presentation-only revisions, active-reference retirement rejection, definition-only reuse between worlds and exclusion of private instance state.
- [ ] Cover private concern onset/clear and hysteresis through the existing event/awareness/ActorWork path, Narrator exclusion, restore without false novelty, and default urgency thresholds. Broader episode/sense/reminder cases stay in the EPR tracker.
- [ ] Add browser coverage for arbitrary numeric ranges, categories, public versus owner inspection, unavailable/depleted replenishment, native continuation, cancellation and manual save/load; qualify accessibility and label injection.
- [ ] Repair the pre-existing asynchronous API usage in test files before relying on full-repository typechecking. The untouched `dd40ad2` baseline reports 132 TypeScript diagnostics. The current typecheck reports 135 diagnostics, including three additional optional-need fixture errors. Adapt older mandatory-need fixture assumptions to optional applicable state as part of those test repairs; include safe in-place field upgrades without introducing a parallel legacy runtime.
- [ ] Run the existing full check and appropriate focused suites after the test repairs; compare the same PF population/history scenarios before claiming scale. No model-quality, paid-cost, or full EW-R1–EW-R3 acceptance follows from native runtime checks.

- [ ] Automate contact onset/detail/end, stationary persistence, receiver hearing and teaching exclusion, unknown identity/provenance filtering, collision-limited probes, same-version episode continuation, missing sense pins and aggregate contact bounds. Include multiple moving sources, removal, sleep/incapacity and spatial candidate fairness; implementation remains EWF05/EPR-owned.

## Supported-invention loop — deferred automated validation

No automated tests were written or run for this slice at the owner's request. Implementation ownership remains [INV-1/2/3](inventions-and-world-evolution.md); runtime evidence belongs to [Verification](../verification.md#supported-invention-loop).

- [ ] Cover durable clarification and rejected-candidate revision, preserved proposal context through search choices, derived-base pins and same-version save/load. Verify independent attribution when content deduplicates, missing/corrupt derivation, and no in-place recipe/item changes.
- [ ] Cover simultaneous continuation claims, same-ID replay/body conflict, lost responses, one-child transaction rollback, eight-follow-up bounds, pause, lock/reopen, restore, changed character/conversation, restart during every provider stage and conservative uncertain embedding accounting. No reopening or continuation may purchase an automatic retry.
- [ ] Cover scoped vector indexing/version invalidation, cached source reuse, exact-name eligibility, inaccessible recipes, empty registry, score cutoff, failed/incomplete/missing search, budget rejection and explicit continue/retry. Qualify larger retrieval quality separately; no benchmark or general quality claim follows from a handful of live requests.
- [ ] Cover modal keyboard/dismiss/reopen behavior, modify/new/reuse selection, saved follow-up drafts, a new draft opened during submission, pagination with active polling, simultaneous tabs, ingredient blockers and separate Craft/equip/use commands. Repair pre-existing test typing before running the full repository check.

## Cognition context and diagnostics — deferred automated validation

- [ ] Cover 43/300-question admission, serialized 55k/28k estimates, Unicode size handling, malformed answers and precise undispatched failure display. Cover provider rejection and conservative uncertain accounting without paid retries.
- [ ] Cover ordered hard-query baselines, active conversation on non-speech triggers, missing vector service/Jev outage, dense-scene reference budgets, concurrent state refresh, and explicit required-context overflow.
- [ ] Cover complete permitted action-library indexing, stale revisions, permission isolation, top-300 retrieval, cached reuse, unavailable deterministic fallback, prompt handles, size omissions and unlisted interpretation beyond 64 choices.
- [ ] Cover coalesced evidence snapshot admission, no retained-history draining after success/failure/native handling, new evidence during dispatch, changed goals and interests, restart, and separate consolidation retention.
- [ ] Cover diagnostics for all five operation kinds, repeated operations, dependencies, empty continuation, malformed/missing envelopes, and large retained requests without misleading empty-output summaries.

## Sleeping character presentation

- [ ] Cover authoritative asleep projection for player/NPC, immediate Sleep and full-energy waking, wake/death transitions, and same-version sleep save/load. Verify horizontal sprite/head-marker alignment under orbit, tilt, perspective, facing and floor changes; alpha picking, observation loss, pause, reduced motion and renderer cleanup. No automated tests were written or run for this presentation change.

## Targeted-strike validation

- [ ] Automate target scope/self/dead/missing rejection, unsupported bodies and airborne stance, unknown/version-mismatched definitions, automatic approach enabled/disabled, moving targets, line-of-effect/elevation obstruction and range changes during wind-up.
- [ ] Cover one-hit/idempotency, cancel/replacement/pause, body susceptibility and lethal impact, animal flee and perceived attacker appraisal, same-version save/load during approach/wind-up and rejection of incompatible active definitions.
- [ ] Cover player catalogue/command transport, NPC known/proposed/plan bindings, public animation filtering, progress across pause/completion/cancel, sprite guard/extension/recovery and reduced-motion presentation. Qualify many simultaneously pursuing attackers before adding pursuit coordination or animation infrastructure.

- [ ] Cover serialized completion/cancellation deltas explicitly clearing `actionAnimation` with null, merged player state returning to idle without reload, and sprite-only punch frames replacing the original arm (including facing, pause and no subsequent snapshots).

## Encounter acquisition privacy

- [ ] Cover living-actor and object encounters with observer-only awareness, observed modality, separate opportunities for each observer, no witness/hidden-target leakage, no public story eligibility, and unchanged external speech/action witnessing. Verify save/load preserves private scope and audience. Existing contaminated historical records are not retroactively repaired by this emission fix.

## God-mode character controls

- [ ] Cover character-panel/context-menu parity for revive and cognition grants, owner-only visibility, offline/pending disabling, selected-target identity, stale body revisions and removal of Revive after success. Verify person editing and private-mind inspection target the selected character or controlled player correctly.

## Status effects — deferred automated validation

- [ ] Cover in-place status-effect conversion on configured startup and manual-save loading: stable world/action identities, rest progress, preserved energy/history/accounting/profile/integration records, persisted upgrade diffs, idempotent restart, checksum checks before conversion, and rejection of malformed current state or corrupt journals without replacement. Verify startup on both SQLite and PostgreSQL; fresh-database checks alone do not qualify this path.

- [ ] Cover strict policy schemas, unsupported operations/attributes/targets, condition complexity limits, missing-value inequality, revision races, and changed/removed definitions ending active instances without resetting unchanged episodes.
- [ ] Cover actor and object instances, explicit subject/source/actionTarget bindings, cross-entity reservoir rates, clamping, vanished targets, inactive markers, duplicate instance/action ownership, and current-state save/load integrity. Verify no raw binding IDs or private object attributes leak through observations.
- [ ] Cover default zero/70/100 energy boundaries, midnight windows, player automatic exemption, explicit activation, wake grace, grounded eligibility, all actor kinds, full-energy completion without same-step expenditure, and interruption/plan/resource accounting, including an occupying effect that forbids voluntary/new-action interruption. Update old rest-command and sleep-policy fixtures to generic status-effect commands/state; retain their behavioral cases.
- [ ] Cover restriction composition, explicit deactivation under action restrictions, other-target range/permission, native movement/flight/perception, body cleanup, conversation membership while perception is unavailable, and past-tense observed narration. Verify menus and NPC candidates consume the same definitions.
- [ ] Cover cancellation during every provider/admission stage, late results, no accepted speech on rejection, a committed reply that activates a restriction, audience-scoped SQL history, and effect-bound dream eligibility/episode deduplication across pause/restart.
- [ ] Cover generic horizontal pose and multiple particle markers, changed text, loss of observation, floor visibility, pause/reduced motion, cleanup and restoration of upright walking/punch animation. Basic horizontal/particle/wake behavior has manual browser evidence; broader visual coverage remains outstanding.
- [ ] Add world-agent/settings authoring through the existing validated registry admission; expose object attribute authoring through its own owner. Extend capability effects to other recipients, target selectors, stacking or conserved transfers only with a concrete mechanic; the finite current primitives do not imply those capabilities.

- [ ] Cover God editor Character/Inventory/Identity tab isolation and shared save/discard, typeahead selection, add/remove/zero quantities, duplicate or unknown types, unsafe quantities, stale inventory rejection, active-work rejection, equipped-stack removal, retained stack identity, generated item definitions and same-version save/load after edits.

## Readable cognition context — deferred automated validation

- [ ] Cover the shared attention/decision projection: categorized included context, explicit inventory ownership/equipment and all supported properties, meaningful resource contents, no false idle claim, relative bearings across heading wraparound, co-located/elevated objects, scoped definitions and absent private routes.
- [ ] Cover movement refreshing model text without changing semantic-vector revision, semantic content changes invalidating vectors, optional-relevance failure preserving hard facts, and forgetting/correction during both successful and failed attention discarding stale decisions.
- [ ] Cover current body/intent/contact facts in relevance, refreshed appraisal/kinship and interest inputs, chronological conversation and retained recall guarantees. Keep live model-quality acceptance separate from projection/runtime checks.

- [ ] Cover numeric body-context values, units/ranges, native fullness direction, retained concern prose, healthy/noncritical meters, custom reservoirs, categorical attributes and unknown values.

## Intelligence readability — deferred automated validation

- [ ] Cover actor and trigger-category icons, subtype/ellipsis hover text, compact wall time, separate world time, normalized historical trigger descriptions, operation summaries and proposed-versus-committed labels. Include removed actors and failed roots.
- [ ] Cover counted independent Jev choice/score/Noul filters, the 0.5 boundary, missing answers, zero-count options, all options hidden and reset on trace change; ensure Noul rubric true/false labels do not create duplicate filter tabs.
- [ ] Cover input/output clipboard success/failure, visible collapsed-stage errors, billing loading/empty/partial/error states, receipt-only run IDs, composite stage IDs and independently failing billing/events requests.
- [ ] Cover desktop drag/vertical resize, narrow sheets, scrolling/focus, loss of god access, trace switching and Follow-off root-only polling; compare compact SQLite/PostgreSQL list projections and expression-index plans with full detail output.

## Short entity references — deferred automated validation

- [ ] Cover repeated same-species actors, named versus species-only display labels, species projection, four-character collisions/expansion, immutable-snapshot cache reuse, unknown and out-of-scope tokens, structured response reverse mapping and native authority revalidation.
- [ ] Cover token annotations in proposals/thoughts/goals, canonical persistence and later reprojection, selected action and planning targets outside the hard-query baseline, remembered identity references without newly disclosing names, stale/deleted identities, and ambiguous bare prose without guessed name matching.
- [ ] Cover inventory section ownership without repeated “I have”; entity handles must not pollute semantic embeddings or trigger paid re-embedding when only display handles change.

- [ ] Cover Intelligence rich previews on pointer hover, keyboard focus, Escape, scrolling and viewport edges; all repeated speech/action/thought operations and plan steps; long failure/output text beside fixed-width timestamps; level badges and visible trigger subtypes. Verify contextual grouping across retries, unmatched records and support failures without dropping IDs/copyable data.
- [ ] Cover action-specific reasonable-now questions versus memory/context relevance, explicit candidate references, unchanged uncertainty policy and transport accounting of longer question text. Live judgment quality remains separate from request-construction verification.

## Trace attribution and autonomous pacing — deferred automated validation

- [ ] Cover direct-Jev/skipped-vector status, zero scored results versus rejected candidates, mandatory/automatic counts, partial judgments and selected counts against captured traces.
- [ ] Cover back-to-back different actors at unchanged wall time, serial admission, immediate new-evidence eligibility, oldest-opportunity fairness, cancellation/restart and unchanged-evidence suppression; ensure no global post-completion throttle returns.
- [ ] Cover individual named episodes, generic species grouping without actor IDs, preserved source IDs/corrections, renamed/deleted subjects, mandatory evidence and chronological conversation turns. Personal aliases remain outside this implementation.
- [ ] Cover directed statements/greetings/questions versus overheard speech, explicit trigger age/current visibility, two same-species actors, and conditional reply instructions in attention, routing and generation context.
- [ ] Cover speech fallback preserving intended recipient without inventing delivery or conversation membership, actor-local perceived roles, unseen recipients and save/load omission preservation. Historical records without intent must stay unknown.
- [ ] Live model-quality follow-up: replay the two-hare scenario with current context; verify deliberate overheard participation, correct target choice, reduced repeated introductions and useful silence. Synthetic runtime checks do not establish these outcomes.

- [ ] Cover trigger facts through strict AI request serialization for speech, non-speech and missing awareness. Non-speech roles must be omitted, never `undefined`; serialized diagnostic snapshots alone cannot detect this regression because JSON.stringify drops undefined properties. Verify local validation failures remain distinguishable from dispatched provider failures.

## Base-world items — deferred automated validation

- [ ] Cover owner/origin/generation denial and idempotent God creation; unknown definitions, invalid/overflow quantities, portable/nonportable definitions, existing-world migration preserving identity/creator policy, and save/load during approach.
- [ ] Cover two actors collecting the final stack, partial/full drops, equipped references, canceled/unreachable/occluded pickup, distinct supports, identical-position merging, nonportable contents in Pick Up All, and no duplicated quantity or empty pile.
- [ ] Cover categorized hover/click/keyboard pullouts, searchable catalogues, player/other-actor inventory controls, quantity errors, observer-scoped hover/inspection, menu invalidation after movement or body/policy changes, unseen-pile removal, representative-art caps and whole-list accessibility.
- [ ] Cover immutable custody-cache invalidation after transfers and load replacement, fresh mutable/draft reads, and scheduled-preview/execution admission equivalence including status interruptions, materials and RNG. Cover capability loss during approach versus in-reach work, pile-body placement rejection, portaled arrow/Escape handling, Pick Up All ordering and single-stack item-name search.
- [ ] Cover post-merge typed invocation/revised-action/readiness integration without replacing the native transfer owner. Benchmark large mixed piles and many visible piles separately from native actor population.

- [ ] Cover skipped native-protection trace presentation for existing `native` and new `skipped` records: reason/subtype, neutral status icon, zero child stages and no fabricated execution-stage card; preserve root-only world-agent output rendering.

- [ ] Cover autonomous cognition immediately reconsidering new qualifying evidence after a prior opportunity, unchanged evidence/failed opportunities remaining suppressed, shared-slot fairness, and native-protection checks without delayed wakeups. Cover in-place removal of saved cognition `cooldownSeconds` and admission of the reduced policy; keep reflection timing separate.

## Consolidation request sizing — deferred validation

- [ ] Cover more than 256 existing and newly produced summaries; lossless singleton groups; input/output partition boundaries and oversized single sources; protected chronological gaps; stale/forgotten sources and missing/duplicate handles. Verify second-chunk failure/cancellation/budget exhaustion preserves every original and makes no automatic retry. Include Unicode/token-estimate drift and later-review compression across chunk boundaries.
- [ ] Verify live small-model grouping quality and output-budget adequacy on repetitive and distinct whole-day memories; synthetic execution does not establish paid model quality. Measure retained-summary growth under the existing age/protection policy before proposing a new storage quota.

## Knowledge documents — deferred automated validation

- [ ] Cover general/subject code-point limits (including emoji), exact-boundary replacement, rejected overflow, stale edits, clear/recreate tombstones and independent speech acceptance.
- [ ] Cover observer isolation, deliberate naming including “Deer,” introductions, authored acquaintance, continuous encounter, out-of-view/re-entry, reference collision extension and stale-encounter fencing.
- [ ] Cover direct required context and optional semantic retrieval, provenance/uncertainty, absence of private name/position leakage, knowledge/interest invalidation and no capability grant from prose.
- [ ] Cover lossless in-place migration, oversized migration refusal, transactional PostgreSQL/SQLite rows, save/restore generation, interrupted commits and projection corruption detection.
- [ ] Cover owner editor counts/stale-save feedback, reflection identity preservation, Unicode output budgets, forgotten/corrected evidence, no automatic paid repair, and structured diagnostic note/name presentation.
- [ ] After outstanding action-repertoire/hearing/spatial branches merge, exercise their response schemas, event attribution and encounter hooks with CR13/BW08; do not duplicate their executors.

## Action capability slice: deferred automated coverage

No new unit/browser tests are written or run for this task at the owner's request. Add automated cases for direct/queued follow admission, self/hidden/dead targets, blocked/multi-level routes, visual loss, hold/resume hysteresis, cancellation, interrupted plans, same-version save/load and bounded replanning. Runtime smoke and existing stress scripts provide separate limited evidence, not these tests. Follow-up acceptance is owned by [AC04/AC05](action-capabilities.md).

- Add deferred automated coverage for invocation field/target scope, coordinate/floor ambiguity, direct actor move/follow, exact pending-alternative acceptance, decline, stale replacement, manifest changes, save/load, and no physical mutation before confirmation. No tests are added by this implementation slice.

- Add deferred tests for Jev exact-match routing versus generative partial grounding, conservative approval on uncertainty, player/actor confirmation parity, exact coordinate fast paths, name ambiguity, lost target scope, negation/quotes, missing qualifiers, failing prerequisite sequences, provider failure without replay, and player request transport identity. Add browser coverage for Take an action draft/revision controls and stale-timeline responses. These suites were not written/run in this task.

- Action follow-up: general parameter clarification (including choosing an ambiguous support) currently returns an unresolved intention and diagnostic, not a generated parameter form. Full dependency-specific retry invalidation, multi-target reference roles, richer workflow nodes, and exact definition pins remain AC/INV integration work. Add coverage for strict provider invocation schemas, private follow-cursor projection, fresh development format rejection, and native-derived revision previews.
- Keep full repository typecheck repair separate: older test fixtures contain pre-existing async API, authority-provenance and removed goal-field errors. Production build/typecheck is exercised in this slice; no unit/browser suites or test-file changes are included.

- Add runtime action admission coverage for pause winning the serialized writer queue: resuming repeats only the original unpaid commit, never grounding or provider dispatch. Verify a new manifest cannot select an old pending revision with matching text.

- Add automated coverage for durable response readiness on exact player text actions, Jev-only full matches and NPC proposals whose final provider phase is Jev classification. Retired/terminal jobs must still fail closed. Verify an actor's confirmation question is a normal completed interpretation, not a provider retry trigger.

- Action acceptance follow-up: run capped live Jev/full-match and partial-revision examples, including the actor's subsequent accept/decline choice. The injected smoke outputs establish control flow, not semantic quality. Qualify the Character panel's visual layout, keyboard controls and stale-load draft/error behavior.
- Profile the existing mixed scenario's cold advance spike through the performance owner before making population/hitch-free claims; do not add an unrelated scheduler rewrite to action grounding.

- Add automated coverage for contradictory explicit target references versus exact/normalized text bindings, including confirmation alternatives and cooking heat targets. Native admission rejects the mismatch before work or a misleading approval is created.

## Action review regression TODOs

No unit/browser suites were written or run for this review. The [manual runtime evidence](../verification.md#action-capability-review) does not complete these cases. Use current fixture constructors and the active in-place upgrade policy; do not require a per-feature save version or a reset to exercise these cases.

- [ ] Cover operation-local binding identity, original-request/manifest mismatch, same prose with distinct targets and queue modes, repeated identical operations, and unrelated candidate descriptions never becoming execution authority. Include a later optional provider failure preserving earlier resolved operations and cancellation preventing all subsequent paid stages.
- [ ] Cover generated false-exact/empty-omission reports, native description versus optimistic prose, uncertain/missing/low-confidence Jev answers, tolerable reported omissions, reject, explicit confirm and no guessed missing clause. Verify indefinite follow cannot precede a supposedly reachable generated step. Keep real Jev/LLM quality evaluation separate from injected outputs.
- [ ] Cover first-step replacement preflight without side effects, lost targets, stale manifest/control/queued intent, missing resources, sleeping/incapacitated approvers, repeated delivery and invalid persisted alternatives. Enqueue can wait for future prerequisites and must not be rejected merely because an input is not carried yet.
- [ ] Cover explicit player retries after unavailable grounding without enabling automatic NPC retry storms; bounded full pending slots; distinct same-name targets beyond all candidate caps; long descriptions and complete input/output budgets.
- [ ] Cover state-stream approval deltas and private projection, mount/unmount and world/timeline/controller changes during requests, draft isolation, disappeared pinned targets, duplicate clicks and ambiguous delivery retries. Confirm no two-second polling endpoint or raw pending command bodies remain in the public UI path. Exercise keyboard/screen-reader interactions in the real browser.
- [ ] Extend same-version SQLite observations to manual save/load, PostgreSQL and injected commit failures. Capture active follow, stale pending alternatives and accepted/declined outcome identity at each actual durability boundary; no extra native effects or paid replay after restore.
- [ ] Add sustained grounded-follow workload coverage with separate first-exposure, route preparation and steady native movement measurements. Native actions must make no provider calls; cold event/awareness fan-out remains PF/EPR work, not a population-capacity pass.

## Perception performance — deferred automated validation

- [ ] Automate observer-private visual acquisition: A sees an object while C sees A but not the object; C learns nothing from A's private acquisition. Check actual speech/gesture witnesses separately, acquisition modality/provenance, ordinary-object non-trigger behavior and living-contact cognition opportunities.
- [ ] Cover 0/1/128/129/many batch entries, duplicate/forgotten-ID rejection, required commitment side effects, unchanged source ownership, event ordering, rollback, copied records and same-version restore without new acquisitions. Compare intentional private audiences separately from unchanged physical state and native RNG. No unit/browser suite was written or run for this change.

- [ ] Automate exposure-frame reuse versus fresh exact sensing for source motion/removal, stationary observers, geometry/sense/body changes, within-cell motion, sleeping/waking and feature updates. Check cold restore and cache eviction; no stale live knowledge or repeated entry. Profile sparse and crowded layouts independently.
- [ ] Cover ordered raw evidence append/load rejection, equal sequence values, forgotten/duplicated/updated sources, summaries, last-considered watermarks, cold event rotation and bounded intake. Cover external backlog invalidation, more than 64 eligible minds, eligibility fairness, and wakes arriving during asynchronous schedule reads.
- [ ] Compare synchronous and cooperatively drained native transitions, intermediate event order, RNG, finite-resource claims, current/next command admission and cancellation. Verify HTTP reads see only prior or complete state; rejected/abandoned candidates publish nothing. Qualify pause/restore/shutdown, event-loop tails and irreducible finalization/path/commit cost without paid calls.

- [ ] Automate the finite visible-feature adapter across fire/depletion/name/life changes, same coordinates on changed supports, shared inert-descriptor invalidation and mutable-builder fallback. Add each future sensory dependency with its actual implementation; cosmetic fields do not create new senses.
- [ ] Cover goal/knowledge reconsideration with an already-visible object through injected Jev native/defer routes and bounded live qualification. Verify unchanged goals/knowledge, unrelated diagnostics and distant feature changes do not repeatedly buy inference. Live model behavior is not established by these native exercises.
- [ ] Exercise cooperative HTTP publication during queued cancellation, pause, restore and shutdown; preserve the previous snapshot until full completion. Compare all events, intermediate receipts, physical states and RNG, not only throughput. Performance thresholds require repeated named-host runs; no automated suites were written or run for this task.

- [ ] Before adopting narrower per-entity perception capture, reproduce the warm 500-gem timeout in run 35959611757 and compare draft/proxy allocations, cache lifetimes and native states over at least the full failing interval. Short transition equality did not qualify that rejected optimization. The existing whole-roster capture is intentionally retained.

## Rebased action/perception regression TODOs

No unit or browser suites were written or run for this work. These are deferred regression cases, not claims of passing automated coverage. Runtime/profile evidence is in [Verification](../verification.md#rebased-action-and-perception-performance); PF/AG/EPR/SL retain implementation ownership.

- [ ] RPR01: compare cold and warm native transitions, ordered events/RNG and immutable inputs before/after scalar capture and category-local reuse. Include moving/removing/dead sources, observer motion, geometry edits, changed senses/status capabilities, asleep-to-awake transitions, and static objects beside moving people. Verify unchanged arrays/episodes retain identity only while valid.
- [ ] RPR02: validate freezing only owned experience copies, later owner text/edit/forget/obligation operations, duplicate rejection, ordering, missing sequences and large mature histories. Caller-owned mutable records must not freeze or alias. Preserve append/edit/delete/fork lineage and no cold-history prefix scan in the ordinary finalizer.
- [ ] RPR03: load existing main-world pending intents lacking target/mode and raw records with valid older ordering; preserve IDs, content, alternatives, world identity and accounting. Run twice for idempotence. Malformed present values must still fail, not be reset or guessed. Cover actual SQLite and PostgreSQL startup/manual-save paths.
- [ ] RPR04: unknown/global actor names must not leak into exact or generative action grounding or approval descriptions. Resolve nested short references through the common decoder. Perception loss clears continuous recognition without erasing knowledge/evidence; follow ends on lost perception/actions/locomotion capability.
- [ ] RPR05: preserve generic non-actor status effects while pruning only inactive effects whose own admission requires an actor. Compare synchronous/cooperative status-phase order and complete outcomes, including capability changes and cross-entity rates.
- [ ] RPR06: exercise independent full-server load generation, heartbeat expiry versus genuine overload, request identity/error classification, client crash/timeout, active SSE cleanup, bounded request lanes, cold setup and cumulative metric labels. Qualify long-run debt and the existing suspension heuristic under multi-second synchronous commits without changing offline-time policy silently.
- [ ] RPR07: qualify delayed pending/queued anonymous-target recognition across loss/reacquisition, world restore and source revocation when the shared reference/definition lifetime contract is reconciled. Canonical entity IDs must not become indefinite recognition permissions.
- [ ] RPR08: cover partial fulfillment through actual rebased player/NPC response admission (including note/name operations and exact no-AI paths), stored revision acceptance/rejection, changed work/manifest/status, and native output dependencies. Multi-command offered handles and general workflow result ports remain shared-contract work rather than silently selecting only a first step.

## Dense persistence regression coverage

Automated tests are deferred by owner instruction. Runtime/profile observations are not these suites.

- [ ] DP-R01 — Cover indexed perspective first-match/fallback semantics, forgotten audiences, append plus simultaneous prior-awareness edits, corrections, story revocation, empty audiences and new observers. Compare complete durable history, not only row counts.
- [ ] DP-R02 — Cover rollback/retry and journal/head CAS failures with commit-local prepared state; no rolled-back data or readiness may survive as authority.
- [ ] DP-R03 — Cover bounded row/byte/parameter chunks, oversize single records, exact SQL order, variable field types and measured attribution capacity.
- [ ] DP-R04 — Cover candidate preparation reuse versus different/mutable snapshots, initial history/backfill, restore, interleaved source edits, exact audience/recognition text and strict duplicate IDs. Verify no prepared state survives as authority after failed CAS/COMMIT.
- [ ] DP-R05 — Compare native acquisition perspective for quoted/punctuation/duplicate actor names, native object descriptions and outward feature changes; preserve event ordering and private recipients. Direct native templates must not become a generic user-supplied narration/effect shortcut.
- [ ] DP-R06 — Cover SQLite worker initialization/query/BEGIN/COMMIT/ROLLBACK failures, lost replies, process/thread exit, bounded pending requests, statement cache eviction/DDL invalidation, nested transactions, detached callbacks and concurrent shutdown. No retry may duplicate an uncertain durable write.
- [ ] DP-R07 — Cover unrelated reads waiting for complete commit/rollback, actual SQL state after failure, no partial HTTP/SSE world, long-result backpressure, portable SQLite/PG semantics and exact close/drain behavior.
