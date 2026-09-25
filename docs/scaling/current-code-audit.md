# Current-code scaling limitations and risky assumptions

[Scaling index](README.md) · [Work tracker](../maintainers/scaling.md)

**Audit boundary:** runtime `03105fed9209c126e4e69e9faeb4687f42d1e74a`, 25 September 2026. This supersedes the earlier research's code baseline for remediation. Sources below are immutable code links. Complexity statements follow inspected loops and ownership; they are not measured timings. No load, runtime, paid-provider or security test was executed.

**Observed** identifies code that exists. **Boundary risk** identifies an assumption that becomes unsafe when an expressly named feature is introduced; it is not an assertion of a present exploit. **Unqualified** means the repository has no demonstrated capacity for that workload in this audit. All findings remain open until their canonical work/evidence owner closes them.

## 1. Human control, ownership and admission

<a id="sca01"></a>
### SCA01 — One local human and one controlled perspective

**Observed:** [WorldService][world-service] loads `local-player`, holds one profile and resolves `controlledEntityId`/default resident at service scope. [HTTP][http] creates one process-wide session token; `/api/state` establishes that local session. Commands, history, preferences and milestones consume the same control context.

**Consequence:** adding connections is not independent multiplayer. Reusing this context for public users would conflate control, preferences, private history and creator permissions. The loopback host/origin restrictions are real protections today; this is a **public-hosting blocker**, not evidence that the current local server is open to the internet.

**Work:** [SC01](../maintainers/scaling.md#sc01), with D0/D1/D5. Trace every entry point, not only movement.

<a id="sca02"></a>
### SCA02 — One public snapshot and patch history for every connection

**Observed:** [HTTP][http] has a single `publicView`, `patches` map and `projectionQueue`; [view projection][view] memoizes under one service/control perspective. Each stream consumes that same view.

**Consequence:** independent players require different evidence, inventory, recognition and authorized editor surfaces. A shared cache keyed only by revision cannot become a multiplayer cache merely by adding an account field to a request. **Work:** [SC02](../maintainers/scaling.md#sc02). Share only fragments whose disclosure equivalence is established.

<a id="sca03"></a>
### SCA03 — Presence and pause are local-world assumptions

**Observed:** [WorldService][world-service] has one `pauseWhenHidden`, presence map and connection set; disconnected-conversation reconciliation concerns the controlled actor. The code intentionally implements local connected play, not the accepted multi-human unattended policy.

**Consequence:** presence must be attributed to admitted account/controller sessions; one person's tab must not change another's control or absence. Preserve D03's already accepted shared-world toggle, all-player absence rule, pause precedence and no downtime catch-up. **Work:** [SC01](../maintainers/scaling.md#sc01), not a new pause-policy decision.

<a id="sca04"></a>
### SCA04 — Database-wide ownership and a singleton operational world

**Observed:** [PostgresDatabase][postgres] acquires the fixed advisory lock `(187114, 1)`. [Store][store] uses `world.id = 1`, a global journal revision and one accepted-state cache. Several job, attempt and integration records rely on the one-world-database placement assumption.

**Consequence:** a second world/region writer cannot safely share this adapter by opening another connection or removing the lock. Some records need explicit world, timeline, actor/principal and owner scope before shared storage. The current lock is useful integrity protection. **Work:** [SC04](../maintainers/scaling.md#sc04), D1/D6.

<a id="sca05"></a>
### SCA05 — One root clock, sequence, ID allocator and RNG

**Observed:** [WorldState][types] has root `sequence`, `simTime`, `nextId`, `rngState`; [native execution][kernel] consumes ordered transitions against one world. Application transition callbacks receive the whole world.

**Boundary risk:** independently executing regions cannot assume one global mutable head or seed reproduces all outcomes. Changing ordering or RNG streams can change the game; moving entities must not rename them. **Work:** D0/D6 and [SC04](../maintainers/scaling.md#sc04). Preserve current order until a reviewed region protocol replaces it; do not introduce distributed ticks now.

<a id="sca06"></a>
### SCA06 — Promise tails serialize work but do not bound admission

**Observed:** `WorldService.mutationTail`, `PostgresDatabase.tail`, `AiDirector.admissionTail` and the HTTP projection queue accept promise-chain work without an explicit pending-count/bytes/age admission policy at those owners. The database's five-second statement timeout applies after queue wait, not to the complete request.

**Consequence:** bursts can accumulate waiters, captured payloads and old work even though actual execution is serial. Existing request byte limits, one active AI workflow and eight local SSE tabs do not bound every queued path. **Work:** [SC03](../maintainers/scaling.md#sc03). Preserve ordered accepted effects; reject/defer before admission rather than drop already accepted commands.

<a id="sca07"></a>
### SCA07 — Per-client bookkeeping needs an expiry identity

**Observed:** [WorldService][world-service] removes expired presence timestamps, while `presenceOrders` retains sequence values for presented client IDs in the inspected lifecycle. Other process maps retain per-actor schedule/attempt state under subsystem-specific cleanup.

**Consequence:** a long-lived host with repeated new tab/client identities needs bounded lifecycle cleanup. Deleting sequence guards blindly lets an old heartbeat undo a newer state. **Work:** [SC03](../maintainers/scaling.md#sc03), including expired-session rejection before watermark reclamation. This is not a recommendation to cap the number of humans ever registered.

<a id="sca08"></a>
### SCA08 — Publication failure is classified as world storage failure

**Observed:** the [HTTP][http] publish catch sets `service.storageError`, ends all streams and consequently pauses the world if projection/publication throws. A failed database commit correctly has its own pause boundary in WorldService.

**Consequence:** after adding recipient-specific projections, an isolated presentation failure must not unnecessarily stop unrelated players or label healthy durable storage as failed. Some integrity failures genuinely require a stop, so simply swallowing the exception is also wrong. **Work:** [SC03](../maintainers/scaling.md#sc03), with PF05 and D5.

## 2. Persistence, recovery and growing records

<a id="sca09"></a>
### SCA09 — Independent tables do not yet replace root-world loading

**Observed:** [Store.load][store] reconstructs the full `SavedWorld` from JSON plus a journal. Independent history, vector, knowledge and accepted-text tables exist, but live entities, inventories, processes and much experience remain in the root object. [KnowledgeStore][knowledge-store] explicitly projects committed state rather than owning independent operational writes.

**Consequence:** SQL tables alone have not delivered independently loadable regional/current records or database-first recall. **Work:** existing [D1/D2 implementation](../maintainers/production-data.md#remaining-d1d2-implementation-and-evidence). Do not close this with faster JSON serialization or another projection table.

<a id="sca10"></a>
### SCA10 — Changed dictionaries still require broad diff enumeration

**Observed:** [collectChanges][store] skips equal references and has a domain-proven event-append path. For a changed object dictionary it enumerates old keys and new entries; an unchanged sibling may then be skipped.

**Consequence:** changing one entity in a large replaced dictionary can still cost proportional to dictionary membership. It is inaccurate to claim the implementation deep-clones every entity on every command. **Work:** PF08 with D1 semantic dirty-record capture; compare real mutation cost and preserve append proofs, atomic effects and source invalidation.

<a id="sca11"></a>
### SCA11 — Commit preparation rediscovers changed actors and receipts

**Observed:** [Store.commit][store] enumerates inner worlds, actor memory arrays, response/declaration receipts and publication outcomes to find changes. Pointer checks reduce deep work but do not remove outer traversal. Knowledge projection enumerates actor keys when its root changes and changed documents thereafter.

**Consequence:** unrelated retained actors/receipts can inflate an ordinary commit's preparation; edits and changed accepted-text records also perform individual SQL operations. **Work:** PF01/PF08 and D1/D2; consume mutation-owned dirty identities and batch only semantically compatible writes. Keep receipts, effects and accepted text atomic.

<a id="sca12"></a>
### SCA12 — Whole-world checkpoints remain synchronous CPU and memory work

**Observed:** [Store.commit][store] encodes a full snapshot every 120 revisions or when one encoded change set reaches 1 MiB. Encoding happens before the SQL transaction, which is good, but still synchronously in the application's command/commit path.

**Consequence:** growing live state causes periodic allocation and event-loop/writer stalls. Revision-count cadence is not a complete bytes/time/recovery budget. **Work:** PF08; immutable capture and qualified asynchronous/chunked publication must cover the exact durable prefix before journal truncation. Do not move the commit acknowledgment ahead of durability casually.

<a id="sca13"></a>
### SCA13 — Recovery copies the world per replay record

**Observed:** [Store.load][store] loads all remaining journal rows with `.all`; `applyWorldChanges` begins with `structuredClone(state)` on each record. Validation is intentionally strict.

**Consequence:** replay work includes roughly world-sized copying per journal entry, in addition to applying changes. Small steady-state commits do not imply inexpensive cold recovery. **Work:** [SC05](../maintainers/scaling.md#sc05), PF08/D1. Preserve complete-prefix validation and failure atomicity.

<a id="sca14"></a>
### SCA14 — Startup accepted-mind verification has a nested lookup

**Observed:** [Store.load][store] reads all `mind.inner_world` rows for a world, then uses `rows.find` for each in-memory inner world. [KnowledgeStore.verify][knowledge-store] also reads/materializes the complete world's knowledge, although it uses a keyed map rather than that nested lookup.

**Consequence:** the accepted-mind comparison is quadratic in actor count in the straightforward worst case; both paths require full-world startup residency. **Work:** [SC05](../maintainers/scaling.md#sc05). First use keyed lookup without weakening checks; later stream/partition verification alongside D1/D2 loading.

<a id="sca15"></a>
### SCA15 — Recovery scans all jobs, not only unfinished work

**Observed:** [recoverInterruptedWork][store] reads every job payload and filters statuses in JavaScript, with per-job follow-up reads/writes. [GameSaves.install][game-saves] also scans all jobs to clear speech linkage. This is safe only under the current storage placement and ownership assumptions.

**Consequence:** history length increases recovery time; sharing the database later would also require world/owner scoping. **Work:** [SC06](../maintainers/scaling.md#sc06), D1/D2. Indexed resumable lifecycle queries must retain uncertain external outcomes and avoid automatic paid redispatch.

<a id="sca16"></a>
### SCA16 — Save capture materializes all history before enforcing the size limit

**Observed:** [GameSaves.capture][game-saves] selects all rows of every history table for the world; create/insert serialize the whole payload and separately hash it through another JSON encoding. The 64 MiB payload guard is checked after construction/encoding. Restore captures the old world and reinstalls history atomically in bounded SQL chunks.

**Consequence:** the guard limits supported files, not peak allocation or total capture work. Large worlds cannot be supported by merely raising it. **Work:** [SC16](../maintainers/scaling.md#sc16), under SL/D1/D2. Preserve coherent world/history capture and external-accounting/erasure overlays.

<a id="sca17"></a>
### SCA17 — Unlimited save count still uses a full filesystem catalogue walk

**Observed:** [SaveFiles.list][save-files] reads directory entries, then each save's metadata, filters by world and sorts. It correctly avoids reading world payloads. Named-save count limits were removed in main. Files remain local even with PostgreSQL authority.

**Consequence:** catalogue latency grows with stored slots, and database recovery/owner movement alone cannot relocate local saves. **Work:** [SC16](../maintainers/scaling.md#sc16). Add indexed paged metadata and a portable storage boundary when hosting needs it; do not reinstate an arbitrary slot count.

<a id="sca18"></a>
### SCA18 — Forgetting and dependent cleanup have large aggregate representations

**Observed:** [Store.commit][store] keeps a world-scoped forgetting ledger as integration JSON and compares changed memory arrays; [WorldService.restore][world-service] reapplies source forgetting across restored state. Source invalidation is part of the correctness boundary, not optional cleanup.

**Consequence:** growth can turn corrections/restores into broad scans and large JSON rewrites. **Work:** [SC11](../maintainers/scaling.md#sc11), D2/CR. Index source dependencies and current eligibility; do not optimize by leaving stale private derivatives readable.

<a id="sca19"></a>
### SCA19 — SQL dialect conversion is textual rather than syntax-aware

**Observed:** [PostgresDatabase.query][postgres] rewrites every `?` to a positional parameter and translates selected SQLite constructs with regular expressions.

**Boundary risk:** future SQL using literal question marks, PostgreSQL JSON operators or unsupported expressions can be transformed incorrectly. This audit has not demonstrated a current failing query. **Work:** [SC09](../maintainers/scaling.md#sc09), D1. Use explicit typed dialect operations/parameter binding for new repositories instead of broadening ad hoc replacements.

<a id="sca20"></a>
### SCA20 — Database and domain quantities cross JavaScript number boundaries

**Observed:** [types][types] use numbers for quantities, sequence and time; [Store][store] casts database BIGINT-derived values through `Number` and converts USD to numeric micro-units. Some request validators check individual safe integers, but that does not establish safe sums or products.

**Boundary risk:** large balances/counters or conversions can lose precision; no overflow was reproduced. **Work:** [SC09](../maintainers/scaling.md#sc09), D0/D1. Follow existing exact-unit/decimal-string conventions and test arithmetic and wire boundaries, without changing accepted gameplay units silently.

## 3. Native simulation, perception and navigation

<a id="sca21"></a>
### SCA21 — External-event audience discovery defaults to the entire entity collection

**Observed:** [events.eventAudience][events] falls back to `Object.values(world.entities)` before checking memory, life/capabilities and hearing/sight. Private encounters already use owner-private evidence and are not broadcast by this branch.

**Consequence:** distant/inert population adds enumeration even when the legitimate audience is unchanged. This is not evidence that every entity gets an exact ray or every operation is quadratic. **Work:** existing [EPR02](../maintainers/events-perception-and-reactions.md#epr02--eliminate-redundant-full-world-sensory-scans). Preserve occurrence-time geometry, receiver-specific ranges and stable ordering.

<a id="sca22"></a>
### SCA22 — Nearby indexes are rebuilt on mutable drafts or changed dictionary identity

**Observed:** [nearbyEntities][spatial] caches by immutable `world.entities` identity, but rebuilds on drafts; dictionary replacement also changes the cache key. `spatialCandidates` enumerates grid cells in three axes, collects results and sorts by stable original order.

**Consequence:** repeatedly calling the helper does not guarantee incremental spatial work. Very large query radii can enumerate many empty cells; ordering sorts and allocations add to dense-query cost. **Work:** EPR02/EPR10. Use phase-valid or incremental membership with old/new-region invalidation; do not bypass exact tests or reorder effects arbitrarily.

<a id="sca23"></a>
### SCA23 — Status-effect traversal visits every entity each native step

**Observed:** [advanceWorld][kernel] executes `advanceStatusEffects` for `Object.values(world.entities)` inside each one-second native step, separately from its filtered actor/ambient roster.

**Consequence:** inert scenery can add per-step traversal despite the earlier roster optimization. **Work:** [SC15](../maintainers/scaling.md#sc15), PF03/EWF08. An applicability/due index must include entities with automatic rules even before they possess an active effect; indexing only current effects would miss onset.

<a id="sca24"></a>
### SCA24 — Native survival and replenishment perform repeated global discovery

**Observed:** [nativeSurvival/nativeReservoirResponse][kernel] filter and distance-sort the full entity collection for visible berries or compatible sources; reservoir discovery can repeat per relevant attribute. Several candidates can invoke approach planning. Native protection correctly runs without inference.

**Consequence:** hungry populations and unavailable routes amplify scans/path work. **Work:** [SC15](../maintainers/scaling.md#sc15), PF09/EPR02. Use maintained resource/capability candidates and owner-local holdings; preserve visible evidence, finite resources and immediate native protection.

<a id="sca25"></a>
### SCA25 — Observation construction discovers all ground items and known definitions

**Observed:** [observeActor][kernel] filters all `world.items` for visible pile owners, maps all learned recipes and collects their definitions; it also calls `queryMemories`, which scores/sorts a materialized eligible memory list before slicing. The outer observation is independently copied after private plans are stripped.

**Consequence:** a small nearby scene can require work proportional to global item count, knowledge-library size or retained actor experience. **Work:** [SC15](../maintainers/scaling.md#sc15), D2 and PF05. Distinguish complete game knowledge from bounded query/context transport; never make an item disappear merely because it missed a UI page.

<a id="sca26"></a>
### SCA26 — Encounter updates rebuild population-wide phase inputs

**Observed:** [updateEncounters][kernel] materializes all entities into scalar/body records, builds alive/object indexes, and visits all living memory-capable observers after an advance call. It reuses unchanged exposure arrays and memoized exact visibility where valid.

**Consequence:** those optimizations do not yet make the complete pass proportional to changed observers/sources/regions. **Work:** EPR03/EPR10 and PF09. A stationary observer must still notice changed sources and geometry; do not use observer movement as the only dirty trigger.

<a id="sca27"></a>
### SCA27 — New-person exposure can scan retained memories for every candidate

**Observed:** [updateEncounters][kernel] checks a recent-encounter predicate with `world.memories[actor.id].some(...)` for each newly seen person. This avoids duplicate recent encounters but costs work as both new exposures and retained memory grow.

**Consequence:** first exposure of a dense crowd can combine discovery, memory lookups and required evidence creation. **Work:** EPR02/EPR03 with CR/PF09. Reuse a maintained event/subject/time index; preserve exact suppression semantics and genuine new witnesses.

<a id="sca28"></a>
### SCA28 — One large body expands the touch candidate radius for every touch observer

**Observed:** current [updateEncounters][kernel] computes population-wide maximum body height/radius, then uses those maxima to choose each physical-contact query radius before exact `bodiesTouch` and line-of-effect checks. This is the new body-contact detector, not the superseded proximity approximation.

**Boundary risk:** admitting unusually large bodies can inflate otherwise local queries, including empty grid cells. **Work:** SW08/EPR10 and [SC13](../maintainers/scaling.md#sc13). Benchmark size-skewed populations and use conservative extent-aware candidate structures; do not shrink the radius and miss contact.

<a id="sca29"></a>
### SCA29 — Native scheduling remains active-world work, not regional due-work execution

**Observed:** [nativeParticipants][kernel] scans/sorts eligible entity IDs per `advanceWorld` call; the application invokes one-second calls. Actors, animals and heat processes advance natively, with per-animal countdowns. A finite roster assumption requires refresh when membership/components change; nested command transitions already refresh it.

**Consequence:** sleeping, distant or rarely changing entities are not automatically cheap, and future native spawning can invalidate roster assumptions. **Work:** PF03/PF09, EWF08 and D1/D6. Prove exact due-time/active-roster changes; preserve RNG, thresholds, membership and event boundaries.

<a id="sca30"></a>
### SCA30 — The eight-millisecond yield is not a preemption guarantee

**Observed:** [WorldService.tickBatch][world-service] checks elapsed work after a complete `advanceWorld(world, 1)` transition; a single expensive transition may exceed the target. Pending time is retained, and storage errors halt progress appropriately. A small memory-pressure scan also inspects actor collections each batch.

**Consequence:** a expensive native step still blocks the JavaScript event loop; continued overload grows simulation debt. Replacing calls with a large elapsed interval changes encounter/event boundaries. **Work:** PF03/PF11. Measure longest single transition and achieved clock rate, not just average batch time. No silent time loss, unapproved time dilation or lossy witness cap.

<a id="sca31"></a>
### SCA31 — Navigation wrappers collapse incomplete work into `null`

**Observed:** [findPath][spatial] returns a route only for `status === 'reached'`; other provider statuses become `null`. `findApproachPath` enumerates/sorts stances, tries a bounded number of routes and also returns `null` when none succeeds within that attempt policy.

**Consequence:** downstream code cannot reliably distinguish exhausted search/unsupported coverage from proved no route using that return value alone. A stance-attempt budget does not prove all possible stances failed. **Work:** existing SW05/SW06 and AG05/action-capabilities integration, surfaced in the tracker. Carry typed incomplete/deferred/unreachable outcomes end to end; do not remove every work bound.

## 4. Cognition, memory and asynchronous work

<a id="sca32"></a>
### SCA32 — One director workflow serializes unrelated actors

**Observed:** [AiDirector][director] has one `running` workflow for direct speech, autonomous thought and invention. Interactive submission cancels maintenance and can supersede the current thought. Maintenance also avoids scheduling while interactive work is active.

**Consequence:** unrelated NPCs compete for one workflow slot; steady conversation can defer background work indefinitely. This is not a claim that the entire server has no asynchronous concurrency: narration, indexing and maintenance have separate paths. **Work:** [SC07](../maintainers/scaling.md#sc07), PF09/CR/AG. Preserve per-actor authority and aggregate spending while adding bounded fairness, not an unbounded Promise.all per NPC.

<a id="sca33"></a>
### SCA33 — Dirty tickets are computed after expensive all-actor input refresh

**Observed:** [ActorWork.refresh][actor-work] calls the input function for every live memory-capable mind. [considerThought][director] computes nearby visibility inside that callback before `ready()`, and includes global `telemetryRevision` among its dependencies. `ready()` itself scans ticket entries.

**Consequence:** unrelated telemetry or population can trigger broad discovery before the scheduler knows who needs work. **Work:** existing [EPR05](../maintainers/events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake). Keep the implemented coalescing; replace imprecise dependencies with actual committed changes and deadlines.

<a id="sca34"></a>
### SCA34 — Trigger and maintenance preparation traverse history

**Observed:** [considerThought][director] reconstructs experiences, looks up speech jobs, sorts unseen evidence and computes watermarks; [maintenance][maintenance] constructs deadline arrays from awareness/memory and materializes experiences for an existence check. Spread calls such as `Math.max(...all.map(...))` and `Math.min(...future)` also depend on input size.

**Consequence:** selecting a small fresh opportunity or one next deadline can require all retained history; very large arrays can hit runtime argument limits. The newest-eight trigger snapshot is not an owed-memory queue and is not proof that older evidence was deleted. **Work:** EPR05/CR10/D2; indexed source order/deadlines and allocation-bounded reductions, preserving fresh-opportunity semantics.

<a id="sca35"></a>
### SCA35 — Recall bounds are applied after constructing many candidates

**Observed:** [candidateSet][recall] builds awareness maps, calls `experiences` repeatedly, prepares/hashes text and deduplicates candidates before final attention/vector selection. [VectorStore][vectors] accepts an explicit source-ID/revision list serialized into a database join.

**Consequence:** a small returned top-N or prompt byte limit does not bound discovery, serialization or query preparation. **Work:** D2's database-first selection and CR04/CR11; [SC11](../maintainers/scaling.md#sc11) for source/version integration. Do not interpret an absent vector as permission to omit required evidence.

<a id="sca36"></a>
### SCA36 — Global speech-index refresh for a local utterance

**Observed:** [RecallService.indexSpeech][recall] loops over all actors represented in awareness after relevant speech changes, reconstructs speech candidates and reconciles vectors per actor. Cleanup of attempted-source state traverses the shared set while processing actors.

**Consequence:** an utterance with a small audience can cause work for unrelated minds; rebuilding source text before determining actual index work amplifies it. **Work:** [SC08](../maintainers/scaling.md#sc08), D2/EPR05. Use durable dirty source/recipient identities and index watermarks with safe coalescing.

<a id="sca37"></a>
### SCA37 — One actor's index budget failure terminates the whole pass

**Observed:** the per-actor loop in [indexSpeech][recall] uses `return` on a denied reservation or a non-value embedding result. Later actors are not visited during that pass.

**Consequence:** an early actor's exhausted allowance or failed source batch can repeatedly delay unrelated actors. No live starvation duration is claimed. **Work:** [SC08](../maintainers/scaling.md#sc08); isolate failure disposition by actor/source and demonstrate fairness without automatically retrying the failed paid attempt.

<a id="sca38"></a>
### SCA38 — Background embedding attempt suppression is process-local

**Observed:** [RecallService][recall] records attempted source/revision keys in an in-memory set; each batch gets a new random `speech-index` request ID. Startup schedules indexing again. The durable attempts ledger protects an attempt ID, but the inspected path does not durably associate the source batch with that ID for restart suppression.

**Boundary risk:** a failed/uncertain source whose vector is absent can be purchased again after reconstruction unless its logical work identity is reconciled. This audit did not run a paid duplication reproduction. **Work:** [SC06](../maintainers/scaling.md#sc06), D2/CR; preserve intentional new attempts versus unknown prior outcomes.

<a id="sca39"></a>
### SCA39 — Source revision alone is not a complete distributed publication fence

**Observed:** [vectors][vectors] are keyed by scope/model/dimensions/source ID and revision; `put` upserts by those keys. Callers check current source data before publication. Current save loading drains/cancels relevant execution and rotates generations, which is useful protection.

**Boundary risk:** independent workers, restore/import or same-ID source recreation require incarnation/timeline-aware validity at the durable publication boundary, not only a pre-await equality check. No current privacy breach is asserted. **Work:** D1/D2 source identity and [SC11](../maintainers/scaling.md#sc11). Keep scope-first exact search; ANN is not the fix for this race.

<a id="sca40"></a>
### SCA40 — Time acceleration multiplies native and maintenance demand

**Observed:** [WorldService][world-service] advances at `baseRatio * speed`; the current configured base ratio is 60. Physical and cognition deadlines often use simulation time while reservations/real wait use wall time.

**Consequence:** one in-game minute is one real second at 1×. Model latency can span many game minutes; six game hours pass in six real minutes. These are arithmetic, not capacity results. **Work:** PF11/D61/D62 and [SC07](../maintainers/scaling.md#sc07). Measure native, ingestion and cognition demand independently at each speed; do not silently change clocks to fit a queue.

## 5. Inventions, definitions and dependent data

<a id="sca41"></a>
### SCA41 — Similar-invention search serializes the learned library

**Observed:** [searchInventions][invention-search] maps all learned supported recipes, constructs full textual source descriptors, reconciles them and embeds all missing descriptors in batches before top-five ranking. The final currentness check uses a learned-array `.some` per source. Shared definitions are vectorized under actor-specific scopes.

**Consequence:** first search and newly learned libraries can require extensive serial paid work; final membership checks can be quadratic in learned library size. Small results do not bound upstream work. **Work:** [SC12](../maintainers/scaling.md#sc12), INV-2.1a/D2. Separate reusable permitted definition indexing from actor eligibility, preserving inaccessible-library confidentiality.

<a id="sca42"></a>
### SCA42 — Declaration deduplication and capability discovery scan global collections

**Observed:** [admitDeclaration][declarations] searches all recipes for identical canonical content; gathering-tool validation checks all entities for a matching resource type. Short content labels have collision resolution and are explicitly not security hashes.

**Consequence:** admission cost grows with unrelated inventions/entities. **Work:** [SC12](../maintainers/scaling.md#sc12), INV-1/INV-3/D4. Index exact content identity and resource-family membership; preserve complete equality checks, provenance and independent learning/installation. Do not replace collision-safe equality with trust in the short label.

<a id="sca43"></a>
### SCA43 — Definition edits discover dependencies by scanning entity state and plans

**Observed:** [admitAttributeDeclaration][declarations] searches all entities for attribute/source/action/queued-plan use before permitting removal/revision, rebuilds manifest pins and validates the candidate world.

**Consequence:** as declarations, dependent processes and regions grow, edits need indexed reverse dependencies and a coherent activation boundary. Full validation is appropriate for some offline imports but not the only scalable interactive path. **Work:** [SC14](../maintainers/scaling.md#sc14), INV-5/EWF07. Dependencies include pending work and retained saves, not just currently visible instances.

<a id="sca44"></a>
### SCA44 — Supported-family validation is not a general composed-work guarantee

**Observed:** current [declarations][declarations] admit finite native recipe families and parameter envelopes, not arbitrary executable graphs. Existing EWF08/INV-3 target documents describe broader composition and aggregate budgets.

**Boundary risk:** admitting selectors, recurring effects, geometry changes or generated evaluators without transitive work/dependency accounting can create global scans, recursive wakeups, expensive body queries or shared-state coupling. This is an expansion gate, not a claim that current recipes execute arbitrary code. **Work:** [SC13](../maintainers/scaling.md#sc13), a focused EWF08/INV-3 child; see [mechanic growth](mechanic-growth.md).

<a id="sca45"></a>
### SCA45 — New mechanics can invalidate finite-roster and ownership assumptions

**Observed:** [nativeParticipants][kernel] explicitly assumes native stepping does not add/remove participant components or membership, except through handled nested-command boundaries. [WorldState][types] and existing native dispatch still use finite families and global collections.

**Boundary risk:** a spawn, transformation, moving structure, large body or cross-region effect can make earlier cache/roster logic incomplete. **Work:** EWF08/EWF10, INV-3/INV-7, SW and [SC13](../maintainers/scaling.md#sc13). Require the new family's dependency/invalidation proof rather than assuming a registry entry makes it safe.

## 6. Projection, observability and economics

<a id="sca46"></a>
### SCA46 — Small visible scenes still rebuild global projection inputs

**Observed:** [projectView][view] rebuilds all pile contents when `world.items`/definitions change; visibility depends on the entire entity dictionary; learned-recipe projection repeatedly scans inventory for quantities and attribution. Entity-cache cleanup only removes deleted entities in the inspected loop, not merely out-of-view ones.

**Consequence:** unrelated inventory/entity changes and accumulated previously seen entities can inflate per-observer work and retained cache memory. Sharing one local view masks the future multiplier across players. **Work:** PF05 and [SC15](../maintainers/scaling.md#sc15). Use scoped change membership, aggregate holdings and safe cache eviction, not fewer legitimate observations.

<a id="sca47"></a>
### SCA47 — Bootstrap/reset includes the whole authored map and expanding catalogues

**Observed:** [projectView][view] spreads `world.map` into the DTO, derives obstacles from all tiles, exposes complete learned recipes and, in god mode, all item options. [HTTP][http] can re-encode a full reset for each lagging stream. The patch ring is bounded; the reset payload is a separate cost.

**Boundary risk:** future private/huge maps need authorized chunk streaming, paged catalogues and bounded join/reconnect work. The starter geometry is deliberately public; this is not evidence that a current hidden map leaked. **Work:** [SC02](../maintainers/scaling.md#sc02), PF05/SW09/SW10. Distinguish body perception, approved viewport, retained knowledge and render working set.

<a id="sca48"></a>
### SCA48 — Intermediate observations use broad records with subtractive sanitation

**Observed:** [observeActor][kernel] copies an Entity/Actor record and removes selected private fields/routes before returning an independent copy. The final browser projection is more explicit, and current cognition formatting further selects fields.

**Boundary risk:** adding a new private component can accidentally widen an intermediate observation unless every consumer is reviewed. This audit does not establish that the new human-private feature currently leaks. **Work:** [SC01](../maintainers/scaling.md#sc01), EWF04/CR/D48; positive permitted DTOs and new-private-field regression cases across model, browser, editor, export and telemetry paths.

<a id="sca49"></a>
### SCA49 — Usage caching does not bound month-long accounting reads

**Observed:** [readUsage][store] loads all current-month attempt receipts and aggregates in JavaScript; every successful reservation/settlement invalidates the display cache. Reservation separately sums actor-month ledger records transactionally.

**Consequence:** under sustained paid work, cache invalidation can make display reads repeatedly scan a growing month, while reservation latency also needs measurement. **Work:** [SC10](../maintainers/scaling.md#sc10), D1/D5/PF04. Atomic reconciled rollups may accelerate serving; never replace admission with a stale display cache or discard needed accounting evidence.

<a id="sca50"></a>
### SCA50 — Spending configuration and enforcement still need reconciliation

**Observed:** current config removed its hidden `Math.min(50, ...)` clamp, but [Store.reserve][store] still compares against `Math.min(50, ceilingUsd)`. Existing documents also contain a historical $50 policy.

**Consequence:** there are multiple apparent authorities for the ceiling; this is a configuration/policy inconsistency to resolve, not authorization to raise anyone's allowance. **Work:** [SC10](../maintainers/scaling.md#sc10). Establish the accepted owner setting, derive enforcement/display from it and test below/at/above the chosen limit while preserving conservative unknown-cost holds.

<a id="sca51"></a>
### SCA51 — Diagnostic pages and SQL batches have independent growth risks

**Observed:** [Store][store] uses OFFSET and payload substring filters for diagnostic roots; speech-job lookup expands an arbitrary ID list into one SQL placeholder list. Diagnostics already have approximate count retention and page limits; history inserts already have parameter/byte chunking.

**Consequence:** a returned-row limit does not bound query work, retained payload bytes or parameter counts. **Work:** PF06/D3 and [SC06](../maintainers/scaling.md#sc06). Use keyset/selective indexed queries and bounded batch preparation where measured; preserve report coverage and no silent authoritative-history loss.

<a id="sca52"></a>
### SCA52 — Local safeguards and partial benchmarks are not scale qualification

**Observed:** current code has useful native profiling, scoped views, durable receipts, exact geometry, actor scheduling, a bounded patch ring, socket drain handling and explicit fail-stop paths. Existing PF/D/SW/CR trackers retain substantial unverified acceptance and conditional future features.

**Unqualified:** full-stack shared-world concurrency, regional failover, cold mass joins, browser frame tails, billion-record recall/deletion, general actor collision/crowd resolution, distributed physics and private voice delivery are not established by this audit. **Work:** existing PF00/PF11/D5/D6/SW/NC gates. Treat unsupported mechanics as named future work, not as defects in a deliberately finite native family or permission to claim capacity from table creation.

## Coverage and counterclaims

Reviewed paths include service control/tick/commit/restore; HTTP bootstrap/streams/publication; PostgreSQL lane; store diff/replay/commit/jobs/accounting; knowledge projection; saves; native needs/reservoir/status/encounter/observation; spatial wrappers/indexes; event audience/perception; director/maintenance/tickets; recall/vector persistence; invention search/admission; public views; current protocol/client patch handling. Several large files were inspected in relevant ranges rather than line-by-line in their entirety. Third-party library internals, every renderer path, all action families, provider behavior and deployed infrastructure were not exhaustively audited.

The shared-world target and arbitrary-cap removal in main were considered before assigning work. The report does **not** assert that there is no backpressure, no spatial indexing, no stale-result checking, no independent history, or no privacy sanitation. The findings explain where those protections stop or retain a scaling multiplier. Exact scoped vector search is not inherently wrong for small per-actor eligible corpora. Async I/O is already used; wrapping it in another worker is not an optimization.

## Immutable code references

[world-service]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/world-service.ts
[postgres]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/postgres.ts
[store]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/store.ts
[http]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/http.ts
[view]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/view.ts
[types]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/packages/domain/src/types.ts
[kernel]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/packages/domain/src/kernel.ts
[events]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/packages/domain/src/events.ts
[spatial]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/packages/domain/src/spatial.ts
[director]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/ai-director.ts
[maintenance]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/cognition-maintenance.ts
[actor-work]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/actor-work.ts
[recall]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/recall.ts
[vectors]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/vector-store.ts
[invention-search]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/invention-search.ts
[declarations]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/packages/domain/src/declarations.ts
[game-saves]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/game-saves.ts
[save-files]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/save-files.ts
[knowledge-store]: https://github.com/Macrofold/OpenLegend/blob/03105fed9209c126e4e69e9faeb4687f42d1e74a/apps/server/src/knowledge-store.ts
