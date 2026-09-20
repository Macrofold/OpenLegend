# Cognition redesign delivery tasks

Status: **CR01–CR11 runtime foundation implemented; verification and conditional extensions remain explicitly open.** The user subsequently authorized implementation and capped live checks, while deferring new test authoring. Checked items identify delivered implementation; unchecked validation items are not silently closed. The [canonical design](../memory-architecture.md) owns behavior; [source request](../../archive/00-source/cognition-context-followup.md) preserves the motivation. This backlog supersedes earlier tasks that require full-harness dialogue, large default recall or inline mind-patch output. Other deferred work in [TODO](TODO.md) remains open.

Each task must update implementation status with actual evidence when delivered. Fixture results establish contracts only; live quality, cost and latency require separately authorized execution with configured credentials and a nonzero cap. No automatic paid retries.

## Delivery order

Keep CR identifiers stable for existing links. Execute in the following dependency order; a task's number does not imply that its integrations can precede their prerequisites:

1. **CR01:** contracts, budgets, repository interfaces and failure boundaries.
2. **CR02–CR03:** minimal immediate decisions and English stimulus/context, initially using the existing permitted records.
3. **CR04 foundation:** structured selection and Jev candidate contracts first; choose and add required embedding retrieval next. No tool loop is required for this slice.
4. **CR05–CR06:** durable event awareness, protected evidence and hourly consolidation; integrate those sources into CR03/CR04.
5. **CR07:** scoped files and accepted PostgreSQL text; integrate the accepted snapshot and its derived cues into CR03/CR04.
6. **CR08–CR09:** independent reflection, then eligible dreams; native rest accounting can start earlier. Add selective-recall tools only after CR04 documents a real omission and the scoped retrieval service is ready.
7. **CR10:** configurable trigger policies after the fixed policies and supported native states work.
8. **CR11:** complete migration and god-inspection integration. Design migration before schema work and test each import before switching that store; do not defer preservation to the end.
9. **CR12:** integrated behavioral and capped live acceptance. Run each slice's relevant fixture checks as it lands, not only here.

God-mode debugging ships with each slice: CR01 defines the trace contract; CR02 provides the first grouped trigger viewer; CR03–CR04 expose context and retrieval; CR06–CR08 add background lifecycles; CR11 completes the integrated inspector. Do not postpone usable debugging until CR11. The [canonical inspection specification](../memory-architecture.md#god-mode-cognition-debugger) owns the shared behavior.

The [production persistence checklist](../../archive/07-technical-architecture/production-data-model.md#15-implementation-checklist) supplies PD01 contracts with CR01 and PD02–PD04 PostgreSQL/import prerequisites for CR07. PD07–PD09 link back to this backlog for memory and debugging detail. Its PX conditional infrastructure items are not cognition prerequisites; only activate them for their recorded feature or workload trigger.

The ordering below remains the dependency plan. Current implementation and live observations are recorded in [TODO](TODO.md#september-20-native-jev-and-live-cognition); no checklist authorizes automatic paid retries.

## Companion requirements and scope

| Requirements to preserve                                                           | Task ownership and source                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence boundaries, consistent snapshots, unknowns and relevant dependency checks | CR01–CR03; [context contract](../../archive/07-technical-architecture/context-and-inference.md)                                                                                                                                                                                                                                                         |
| Semantic interests, exposure detail, encounters, reminders and retrieval coverage  | CR03–CR05; [perception and attention](../../archive/07-technical-architecture/perception-and-attention.md)                                                                                                                                                                                                                                              |
| Awareness, commitments, learning, records, queries and migration                   | CR01/CR05–CR07/CR11; [data model](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md), [migration](../../archive/07-technical-architecture/data-delivery-and-scale.md), [agent continuity](../../archive/03-design-proposals/agents-and-social-simulation.md) |
| Workspaces, fresh sessions, adapter compatibility, budgets and uncertain execution | CR02/CR07–CR08; [execution contract](../../archive/07-technical-architecture/macrofold-implementation-brief.md), [providers](../ai-providers.md), [existing blockers](TODO.md#npc-memory-and-macrofold-integration)                                                                                                                                     |
| Simulation clock, pause, native rest and dream eligibility                         | CR06/CR08–CR09; [time policy](../../archive/03-design-proposals/time-and-simulation-speed.md)                                                                                                                                                                                                                                                           |
| Behavioral usefulness, privacy, costs and delivery evidence                        | CR12 and each slice; [research gates](../../archive/05-project/research-backlog.md), [verification](../verification.md), [status](../../archive/05-project/implementation-status.md)                                                                                                                                                                    |

The [canonical memory specification](../memory-architecture.md) remains the behavior owner. Reuse the relevant query/storage/adapter contracts without importing unrelated platform work: creator chat persistence, full visual/acoustic overlays, general multiplayer, commerce and broad physiology remain in their own plans. Preserve their memory/privacy interfaces here. Detailed existing failures and operational checks remain in TODO; these tasks link them rather than creating a competing queue.

### CR01 — Separate model text from execution metadata

- [x] Define route-specific context/output contracts and server-only execution bindings. Keep policy, instructions version, IDs, expected revisions, watermarks, coverage and accounting outside model text unless a short handle is required to select an offered action.
- [x] Replace the generic situation/relationships/goals/concerns request with the actual stimulus and decision purpose. Inventory becomes relevant possessions with useful properties inline; remove the duplicate materials catalogue from ordinary cognition.
- [ ] Set independent input, visible-output, reasoning, byte, tool-round and monetary limits by level. Include instructions, schemas, Jev attention/routing and tool results in total accounting. Keep the complete accepted inner-world snapshot within an explicit context budget; expose the conflict if its current quota defeats the greeting target.
- [ ] Add deterministic payload inspection for a greeting, a resource task, a promise and a hazard. Reject unsupported/oversize output without paid repair; verify meaningful empty facts survive while null/empty scaffolding disappears.

- [x] Define separate finite raw, consolidated, authored-text, thought-history and backlog quotas; select a finite presentation-thought count and preserve native commitment creation limits.
- [ ] Establish actor-scoped repository/retrieval and independently replaceable execution interfaces using the data/query contracts. Plan versioned migration and rollback before schema/retention changes; minimal current-state adapters must report unsupported capabilities honestly.

- [x] Define a versioned diagnostic root per semantic trigger/action before routing, with world/actor, perceived sentence, game/wall time, policy version, offered routes, disposition and stable child-stage/call IDs. Link coalesced triggers and queued reflection without duplicating calls or charges; capture no-call outcomes and explicit gaps under finite retention/capture limits.

Owner: `apps/server` context/cognition; generic limits in `packages/ai`. Depends on: none. Exit evidence: small model-facing examples plus separately retained authority bindings, with no private-world leakage.

### CR02 — Semantic levels and immediate speech

- [x] Implement native level 0 and Jev level 1 routing to level 2 mini, level 3 complex/low, level 4 complex/high, or level 5 reflection harness. Provider bindings must distinguish levels 3 and 4; the current fast/complex/full labels are insufficient.
- [x] Directed speech admits level 2 by default. Jev always evaluates escalation for an admitted semantic opportunity; it may raise the immediate reasoning level and/or enqueue reflection. Ordinary speech must not request mind updates or wait for reflection.
- [x] Give speech a speech-only contract, immediate action decisions only the fields they need, and reflection only short presentation thoughts as final output. Remove required `policy`, `expectedRevision`, `thought`, `documents`, `removeDocuments`, `records` and companion patch arrays from ordinary responses.
- [ ] Verify a greeting causes no harness run, relationship-writing requirement or default high-effort reasoning; an exceptional event can request reflection while conversation and simulation progress. Provider refusal, unavailable credentials, invalid data and uncertain completion remain distinct.

- [x] Apply routing to every admitted semantic trigger, including notable events, hazards, encounters, need/goal changes and speech. Reject unoffered routes; native urgency acts immediately, and unavailable semantic work is explicitly deferred.
- [ ] Start every NPC cognition job with fresh model history and current versioned instructions, including immediate decisions; warm compute must not carry prior private transcripts. Verify actual model/effort/parameter forwarding and missing-capability outcomes without silently substituting a harness/model.
- [x] Revalidate actor life, current action prerequisites, turn/plan generation and relevant dependencies before independent speech/action commits. Deduplicate completion, retain uncertain spending through recovery and never execute provisional or partial output.

- [x] Extend the right-side Intelligence calls panel into an authorized god-mode trigger viewer now: one compact row per trigger/action, expandable routing/context/model stages, and status updates even when no model runs. Show actor, time, trigger sentence, chosen route, outcome and aggregate known cost; preserve expansion, scroll and focus while new activity arrives.
- [ ] Inspect offered routes, native policy gates, Jev input/judgment and recorded routing reason, followed by actual escalated LLM/harness input/response. Separate proposed decisions, speech and presentation thoughts from validated/committed effects; distinguish pending, skipped, deferred, coalesced, canceled, stale, failed and uncertain outcomes.

Owner: server director/cognition and AI adapters. Depends on: CR01. Exit evidence: fixture dispatch traces for all levels, speech and failures; provider compatibility remains a separate live gate.

### CR03 — Compact English context

- [x] Build one projection contract for semantic calls: actual stimulus, complete accepted “About me” text, relevant body/environment, attended possessions/knowledge, and one recall section. Render calendar day/time and available temperature/weather in ordinary language; do not invent unimplemented weather.
- [x] Render each recalled experience as a string with permitted names, readable game time and source/uncertainty where useful. Combine recent aware events and raw/consolidated memories without repetition.
- [x] Omit world/profile IDs, raw simulation seconds, NPC type flags, storage envelopes and quota reports from ordinary cognition. Supply quotas/file instructions only to reflection; attach all concurrency/coverage data to server receipts.
- [ ] Keep minimal trusted instructions separate from untrusted prose. Verify that readable names, duplicate names, unrecognized speakers and old observations never grant hidden identity or action authority.

- [x] Render every semantic trigger as an actor-perspective sentence or short event description, not just a dialogue request. Use native templates for supported events; embed the permitted stimulus plus relevant decision context without inventing unobserved causes or keyword expansion.
- [ ] Assemble permitted state, accepted About me and recall from one consistent boundary. Keep historical times distinct, preserve unknown/conflicting values, track query membership and recheck only affected dependencies after newer tool reads; bound refresh attempts.
- [ ] Preserve dialogue turn-taking, interrupted/delayed utterances and per-turn audiences. Permit declining, clarification or continuing native work; a draft is not committed speech or evidence of a fulfilled promise.

- [x] Add a context-build drilldown showing stimulus, snapshot/instruction versions, accepted About me revision, section sizes, required evidence, selected/omitted sources and final submitted context. Link the application artifact to adapter-transformed provider input and label redaction, truncation, expiry and unavailable detail.

Owner: server context and projection. Depends on: CR01; integrate CR04–CR06 as available. Exit evidence: serialized requests contain useful English and tiny route-specific output schemas, with total byte/token estimates recorded as fixture measurements.

### CR04 — Jev attention across all candidate sources

Required companion reading: [context assembly and retrieval](../../archive/07-technical-architecture/context-and-inference.md#e-retrieve-personal-context-when-the-task-needs-it) and [semantic indexing and interest subscriptions](../../archive/07-technical-architecture/perception-and-attention.md#7-semantic-indexing-and-interest-subscriptions). These supply implementation constraints beneath the canonical memory specification: permission filtering, fresh evidence despite index lag, disclosure-tier isolation, shared-definition reuse, selective instance indexing and goal-change reevaluation.

- [x] Make selection respond to present people, recent events, goals, unresolved concerns and conflicting beliefs. Derive bounded cues from permitted state and accepted inner-world text without another writable narrative store; retain supporting and contradictory evidence.
- [x] Deliver structured exact/entity/topic/commitment selection first, then semantic retrieval for arbitrary intents and paraphrases. Preserve Jev inclusion judgments and record coverage for each stage.
- [x] Use one scoped recall service for assembly and later tools: purpose/stimulus, people/entities, time range, recent/relevant/mixed strategy and total record/byte limits. Rank relevance, recency and salience; diversify routine/negative repetition and retain mandatory evidence independently.
- [x] Build actor-permitted candidate sets for nearby entities, possessions, known recipes, raw experiences and consolidated recall. Ask what the actor is paying attention to now; obtain a yes/no inclusion judgment per candidate in bounded batches.
- [x] Record selection handles, candidate coverage and omissions server-side. Exact/native filtering and semantic retrieval may bound candidates, but cannot replace the requested Jev attention judgment silently or scan an unbounded history per turn.
- [ ] Select and document the embedding model/provider, dimensions, similarity metric and storage implementation using paraphrase/privacy/latency/cost evidence. `pgvector` remains a candidate, not a selected dependency.
- [x] Implement required embedding retrieval for complete natural-language intents and permitted memory text, alongside structured/full-text lookups and Jev inclusion. Do not require an LLM keyword-expansion step.
- [x] Version vectors by source/model revision and actor/disclosure scope; batch indexing, reuse unchanged vectors, invalidate corrections/forgotten content and reindex model changes without mixing vector spaces. Bound indexing/query spend with no automatic paid retries; preserve direct fresh-evidence paths and explicit lag/outage coverage.
- [x] Reevaluate on meaningful stimulus/goal changes; cache only across compatible actor, goal and evidence revisions. Preserve directed speech, urgent native danger and relevant active obligations even if optional attention fails.
- [x] Define budget exhaustion, provider outage, crowd overflow, stale selection and index-lag behavior. No paid request per simulation tick or per individual nearby object, and no recursive attention-about-attention calls.
- [ ] Preserve person-encounter opportunities, hysteresis, restart baselines and fair crowd dispositions. Keep D54 need reminders distinct from hourly consolidation; do not assume mandatory paid hourly thoughts.
- [x] Compile bounded versioned interest subscriptions from goal changes; validate supported predicates, reevaluate currently exposed candidates and record expiry/index dependencies. Reuse definition/disclosure-tier embeddings and selectively index meaningful instance text, never per movement or repeated sound.
- [x] Integrate CR05 awareness, CR06 summaries and CR07 accepted-text cues before final retrieval acceptance. Each semantic trigger uses the same full-stimulus embedding path, with scoped cache reuse rather than a paid call per fixed step.
- [ ] Gate selective-recall tools on demonstrated omissions from initial context: record the missing permitted evidence, the affected decision and whether improved selection or a bounded tool resolves it. Reflection file access remains independently required.

- [x] Add a bounded candidate inspector for memories/events, objects, possessions and knowledge: selection method, permitted text/source revision, embedding query/model/version/metric and match score, rank, Jev inclusion judgment/call link, and inclusion/exclusion reason. Distinguish exact mandatory matches, semantic scores and Jev results; expose cache hits, index lag, coverage and unexamined candidates without inventing scores or scanning full history.

Owner: server attention/retrieval, generic Jev execution. Depends on: CR01–CR03 and existing perception boundary for the foundation; CR05–CR07 for final source integration. Tool execution follows CR08 after the demonstrated-need gate. Exit evidence: crowded scenes and large inventories/recall yield bounded, scoped selection without losing required evidence.

### CR05 — Awareness and one experience source

- [x] Add event-time awareness links for every actor, including the player. Store one shared event plus actor-specific perceived text/detail when needed; never expose a raw event through the join.
- [x] Retain experiential world events only when at least one actor was aware. Keep deterministic state commits, idempotency, billing and recovery records independently; an unwitnessed action still changes the world.
- [x] Require a stored English text field for every memory and permitted awareness projection, preferring native templates. Do not copy each shared aware event into another raw memory row for that actor.
- [ ] Specify indexes, retention/evidence capsules, delivery deduplication and journal/query coverage. Later testimony creates a newly heard experience; it cannot invent historical witnessing.

- [x] Commit witnessed events and awareness delivery recoverably together; provide bounded pending-delivery/direct lookup for fresh speech and promises while indexes lag. Retain modality, recognition, intelligibility and event-time detail without retrospective upgrades.
- [x] Implement finite native obligation creation, fulfillment, deadlines and supported cancellation independent of prose. Preserve evidence-backed learning/proficiency and compatible learned-version mappings; neither partial observation nor reflection grants hidden recipe steps.

Owner: domain event/perception transitions; server repository/query projection. Depends on: CR01. Exit evidence: different observers see different detail, hidden events are absent from recall, and unwitnessed state changes survive restart without an experiential event row.

### CR06 — Six-hour raw window and hourly cleanup

- [x] Every simulated hour, select unprocessed raw memories plus aware world events older than six simulated hours for actor-scoped consolidation. Store watermarks/source coverage outside model text and preserve concurrent new experiences.
- [x] Use a separately budgeted summarization route; GPT-5 nano is the requested candidate, subject to adapter/model verification. Group routine repetitions, remove inconsequential movement detail and preserve important incidents, attribution, uncertainty and unresolved commitments.
- [x] Atomically accept summaries and retire covered raw sources from active recall without duplicate summaries or deleting another actor's evidence. Do not merge ordinary cleanup with a full psychological reflection job.
- [x] Bound backlogs at accelerated speeds; define failure retention and retry scheduling without automatic paid reruns. Recent raw input stays within six hours; delayed older input is a consolidation backlog, not an excuse to dump it into conversation.
- [ ] Verify hour and six-hour boundaries, pause/resume, source overlap, restart, actor isolation and important one-off events amid repeated eating/gathering. Explicitly measure summary loss with labeled cases before aggressive pruning.

- [x] Propagate correction, forgetting and source unavailability through derived summaries, accepted-belief reconsideration, vectors, caches and actor-accessible files without rewriting witnessed history. Keep compact attribution where detail expires, and prevent sessions/backups from restoring forgotten recall.
- [ ] Enforce distinct longer-term summary and creator-history retention; coalesce missed hourly work after pause/restart rather than buying unbounded catch-up. Exercise independent observers finishing consolidation at different times.

- [x] Expose consolidation jobs with source coverage, watermarks, summaries, backlog, usage and accepted/failed retirement status; link affected experiences from trigger context without treating maintenance as a new witnessed event.

Owner: server scheduler/repository and generic summarizer; pure acceptance rules in domain. Depends on: CR05. Exit evidence: one recall view of consolidated summaries plus recent raw memories/events, no double counting and no high-effort harness required for cleanup.

### CR07 — Persistent workspace and PostgreSQL inner_world snapshot

- [x] Make the actor's scoped persistent workspace the editable inner world. Add bounded file read/write grants, flexible names, quota inspection and staged snapshots; remove the need to echo file contents and record patches in final model JSON.
- [x] After reflection, pull and validate allowed files, flatten them deterministically into one text value, and publish one current PostgreSQL `mind.inner_world` row per world/actor. Bind revision, source snapshot and job IDs in server metadata; include that text in every decision context.
- [x] Keep the previous accepted text readable while reflection runs. Handle partial/failed export, unsafe paths/symlinks, oversized files, stale publication, duplicate completion and workspace/database disagreement without exposing half-written content.
- [x] Preserve essential identity and native obligation authority. Workspace prose cannot grant capabilities, edit world state or fabricate witnessed evidence. Keep old sessions, scratch and audit exports outside actor recall.
- [ ] Verify Macrofold scoped file and snapshot capabilities before relying on them. Provisioning a workspace alone is not working workspace reflection; a SQLite adapter is an interim step, not PostgreSQL acceptance.

- [x] Preserve authored relationship/belief/goal prose in one accepted text authority; any query index derives from that revision. Keep native skills, obligations and mechanical appraisals independently authoritative.

- [x] Seed new actors' identity, permitted knowledge and initial accepted text atomically with saved state; provision actor-scoped workspace access idempotently without fabricating witnessed background or duplicating paid setup.
- [x] Enforce the initial ten-file/500-word-per-file ceiling plus finite bytes until an explicit quota decision supersedes it. Count headings and durable scratch, expose deterministic counts/preview, keep trusted instructions read-only and reject overflow without truncation or paid repair.
- [ ] Verify workspace export, fresh-session isolation and authenticated reachability for any hosted recall tools; cancel/close and reconcile uncertain provisioning without treating the last recorded credit blocker or fixture results as live acceptance.

Owner: server workspace adapter/repository; generic execution in AI package. Depends on: CR01, CR05 and production persistence track. Exit evidence: file edits publish atomically, restart preserves the accepted snapshot and later decisions receive it.

### CR08 — Background reflection and significance

- [x] Queue level 5 during safe downtime, eligible dreams and significant events. Support both trusted event significance flags and Jev significance judgments for configured event classes.
- [x] Separate interactive admission from reflection scheduling. Native simulation and conversation must never await a reflection result or its remote cleanup; bound concurrency/reservations and give interactive work priority.
- [x] Start a fresh harness conversation per reflection on compatible warm actor compute. Permit bounded multi-turn file work; final output contains one or more presentation thoughts, each at most 20 words, with a finite per-job count.
- [x] Publish validated snapshot/thoughts idempotently after completion. Define pause, shutdown, canceled/uncertain execution, actor death, stale identity/obligation revisions and dream interruption; no automatic paid repair.

- [x] Persist/coalesce experience boundaries, idle/sleep episodes and last accepted reflection; stagger work with real-time cooldowns and fairness. Unchanged evidence cannot immediately retrigger reflection, and progress advances only after accepted publication.
- [ ] After CR04 demonstrates an omission, expose bounded get_memories, inspect_memory and list_commitments through the same scoped service. Enforce cumulative calls/records/bytes/time/spend across pagination, recheck access and report expired/partial evidence; immediate calls do not require tools.
- [x] Preserve pause distinctions: cancel background work, hold eligible explicit results before further paid stages/commits, and define restart/shutdown recovery. Shared interactive/background/embedding/summarizer reservations cannot overspend or make interactive work await reflection cleanup.

- [x] Link queued reflection/dreams to originating triggers and show eligibility, queue/dispatch, harness/tool stages, bounded workspace change preview, short presentation thoughts and accepted snapshot publication. Record explicit policy/model reasons only; unavailable provider steps stay unavailable, and inspection never reruns paid work.

Owner: server director/jobs and workspace adapter. Depends on: CR02, CR07. Exit evidence: deliberately delayed reflection cannot stall ticks, actions or conversation; failure preserves the previous inner world and new observations.

### CR09 — Eight-hour rest and two-hour dream threshold

- [x] Add saved native rest/sleep accounting with an eight-simulated-hour daily requirement. Distinguish resting from sleeping and accumulate actual sleep continuously within a sleep episode.
- [x] Admit dreams only after at least two simulated hours asleep, deduplicated per episode with bounded later opportunities. Waking before the threshold cancels eligibility; speed changes do not alter simulated thresholds.
- [x] Specify daily window, split-rest credit, interruption/reset and sleep-debt effects as explicit native rules. Initial tuning uses calendar days, split-rest credit, fifteen-minute sleep onset and bounded debt; later tuning must preserve the eight-hour need and two-hour dream minimum.
- [ ] Verify pause, acceleration, restart, interrupted sleep and budget exhaustion. Sleep/rest must proceed without an available dream model; dreamed content stays imagined.

Owner: pure domain needs/sleep, server scheduling. Depends on: CR08 for dream execution; native accounting can precede it. Exit evidence: deterministic threshold/accounting scenarios plus separate capped live dream acceptance.

### CR10 — Configurable triggers as admitted mechanics

- [x] Add finite versioned trigger/significance/escalation policy families that inventions or world settings can modify through normal admission. Capture offered routes, conditions and dependencies; keep spending, permissions and native hazards non-overridable by generated prose.
- [ ] Verify unsupported fields have no effect, changed policy invalidates relevant pending proposals, and permitted invented mechanics can alter triggers without inserting executable code.

Owner: domain definitions/admission and server routing policy. Depends on: CR02, CR08–CR09. Exit evidence: one admitted trigger variation and negative admission fixtures.

### CR11 — Migration, god inspection and documentation

- [x] Migrate existing documents/facets into the initial accepted text/workspace without losing authored identity or native commitments. Preserve legacy audit provenance; do not fabricate awareness for historical events lacking audience evidence.
- [x] Reconcile legacy duplicated event/memory sources and retention caps. Version saves and support rollback/recovery before changing active retention; no silent destructive reset.
- [x] Update god-mode thought history to short reflection presentation, keep it out of ordinary DTOs and actor recall, and show pending/failed snapshot publication honestly. Dialogue remains public only to its actual audience.
- [ ] Update every relevant document under AGENTS.md when code or decisions change: canonical spec, context/perception, data/query/migration contracts, requirements, decisions, roadmap, setup, extensions and status. Preserve unique requirements and evidence; retire a task only when its own requirement is superseded or verified.

- [x] Show accepted inner-world text, derived relationship/belief views, experience timeline, active promises and learned skills in authorized god inspection. Refresh on publication, clear on world change and enforce authorization in APIs/streams; private thoughts never become avatar labels or ordinary-player recall.
- [ ] Rehearse import on a preserved copy with identity/knowledge/commitment totals, evidence gaps, unfinished work and uncertain AI accounting reconciled. Switch one authority only after validation; diagnostics expiry must not remove accepted decisions or resurrect forgotten content.

- [x] Complete searchable/filterable god diagnostics by actor, time, trigger, route, stage and outcome, with paginated history, follow/pause updates and a new-entry indicator while reading. Expand stage cost/tokens/latency, input/output and receipts on demand; show pending/unknown versus zero and aggregate each charge once.
- [ ] Enforce god authorization on list/detail/update/export paths and clear private cached views on access loss or world change. Bound retained history and candidate payloads, redact credentials, surface dropped/truncated/expired diagnostics, and keep diagnostic failure from blocking native simulation or granting actor knowledge. Preserve existing inspector validation in TODO.

Owner: server repository/protocol/client projection and documentation. Depends on: CR05–CR10. Exit evidence: legacy-save migration/restart, actor privacy and god-access checks.

### CR12 — Acceptance and token/latency evidence

Required companion cases: [context evaluation](../../archive/07-technical-architecture/context-and-inference.md#9-evaluation-before-richer-infrastructure) and [perception/attention verification](../../archive/07-technical-architecture/perception-and-attention.md#12-verification-and-observable-tradeoffs). Include their relevant privacy, paraphrase, index-lag, stale-query, encounter-coverage and cost gates alongside the checks below; linking them does not mark them complete.

- [ ] Run fixture tests for privacy, attention, routing, retention, consolidation, publication, sleep and recovery; apply formatting and `pnpm run check` when runtime implementation is delivered.
- [ ] Verify all five selection signals with labeled, matched-history scenarios showing recalled evidence changes a later utterance, decision or action where relevant. Capture selected evidence and outcomes, including justified unchanged behavior; context inclusion alone is insufficient. Separate fixture plumbing from live behavioral evidence.

- [ ] Compare greeting, ambiguous speech, old promise, repeated routine activity, significant event and dream cases. Count instructions, schema, context, attention/routing, reasoning, final text, tool rounds and queue/provider latency separately, including background cost per real hour at each simulation speed.
- [ ] Treat a few hundred input tokens and 10–50 visible reply tokens for a simple greeting as the requested optimization target, not a guaranteed limit or measured result. Report full-snapshot size and total workflow costs when they exceed it; do not hide Jev or reasoning tokens.
- [ ] With separate live authorization and a cap, verify actual provider routes, useful replies, awareness-safe consolidation, workspace edits, PostgreSQL publication and reuse in later decisions. Report outages/unsupported models as blockers; fixtures cannot establish model quality, savings or latency.

- [ ] Include historical sensory detail, partial learning, encounter overflow/restart, interrupted dialogue, corrections, query-membership changes and held-out semantic cases; preserve the original gates in related research/perception plans.

- [ ] Exercise a non-speech notable-event case: a permitted sentence describing lightning striking a nearby tree retrieves a genuinely witnessed prior lightning death and informs the next decision. Include an actor without that memory, uncertainty about an unseen cause, and immediate native protection during model outage. Use a labeled fixture or admitted event family, not an implicit requirement to implement weather physics.
- [ ] Trace trigger → scoped candidates/coverage → selected memories → route → accepted outcome, including coalesced/deferred/stale reasons without exporting whole minds. Compare held-out behavioral cases and total cost per real hour/simulated day, with embeddings, tools and background work included.
- [ ] Include revoked access, changed query membership, required-context overflow, interrupted provisioning, duplicate completion and real process failure around publication/dispatch. Reconcile the linked TODO failures and adapter blockers as relevant slices land; no documentation audit closes them.

- [ ] Verify grouped debugging with no-cost browser/server fixtures: a non-speech trigger, Jev routing plus escalation, scored retrieval, no-call/deferred/coalesced outcomes, failed and delayed stages, background publication, late billing, stable navigation, pagination and denied/revoked god access. A developer must explain trigger, route, recall and committed outcome entirely from the panel; inspection issues zero inference calls.

Owner: maintainers across modules. Depends on: CR01–CR11. Exit evidence: reproducible fixtures plus explicitly labeled live receipts and remaining limitations; none obtained by this documentation task.
