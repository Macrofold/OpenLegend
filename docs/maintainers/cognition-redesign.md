# Cognition redesign delivery tasks

## Spatial acceptance cross-links

Use [SW08/SW16](spatial-world.md) for geometric audience/reach and cross-level native execution. Keep CR02/CR12 level-1 selection and zero-generative-continuation gates here. CH01 is not a prerequisite for native ground navigation, and no path node or camera frame is a new paid decision.

Status: **CR01–CR11 runtime foundation implemented; verification and conditional extensions remain explicitly open.** Checked items identify delivered implementation; unchecked validation items remain open. The [canonical design](../memory-architecture.md) owns behavior. Cross-cutting deferred work lives in [TODO](TODO.md).

Each task must update implementation status with actual evidence when delivered. Fixture results establish contracts only; live quality, cost and latency require separately authorized execution with configured credentials and a nonzero cap. No automatic paid retries.

## Delivery order

The [NC track](narration-and-conversations.md) retains speech/recall, conversation and Narrator integration acceptance for its delivered foundations; private immediate thoughts remain distinct from god-only reflection presentation, and notable unseen retention grants no awareness. [AG](agent-agency.md) extends universal decisions and operational pursuit. Existing CR/NC failure and behavioral acceptance tasks remain open; current implementation is recorded in Architecture.

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

The [production-data tracker](production-data.md) supplies persistence contracts and PostgreSQL/import prerequisites for CR07. Conditional production infrastructure is not a cognition prerequisite; activate it only for a recorded feature or workload trigger.

The ordering below remains the dependency plan. Current evidence is recorded in [Verification](../verification.md); no checklist authorizes automatic paid retries.

## Companion requirements and scope

| Requirements to preserve                                                           | Task ownership and source                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence boundaries, consistent snapshots, unknowns and relevant dependency checks | CR01–CR03; [context contract](../../archive/07-technical-architecture/context-and-inference.md)                                                                                                                                                                                                                                                         |
| Semantic interests, exposure detail, encounters, reminders and retrieval coverage  | CR03–CR05; [perception and attention](../../archive/07-technical-architecture/perception-and-attention.md)                                                                                                                                                                                                                                              |
| Awareness, commitments, learning, records, queries and migration                   | CR01/CR05–CR07/CR11; [data model](../../archive/07-technical-architecture/production-data-model.md), [queries](../../archive/07-technical-architecture/data-queries-and-mcp.md), [migration](../../archive/07-technical-architecture/data-delivery-and-scale.md), [agent continuity](../../archive/03-design-proposals/agents-and-social-simulation.md) |
| Workspaces, fresh sessions, adapter compatibility, budgets and uncertain execution | CR02/CR07–CR08; [execution contract](../../archive/07-technical-architecture/macrofold-implementation-brief.md), [providers](../ai-providers.md), [migrated acceptance gaps](#migrated-acceptance-gaps)                                                                                                                                                 |
| Simulation clock, pause, native rest and dream eligibility                         | CR06/CR08–CR09; [time policy](../../archive/03-design-proposals/time-and-simulation-speed.md)                                                                                                                                                                                                                                                           |
| Behavioral usefulness, privacy, costs and delivery evidence                        | CR12 and each slice; [research gates](../../archive/05-project/research-backlog.md), [verification](../verification.md), [status](../../archive/05-project/implementation-status.md)                                                                                                                                                                    |

The [canonical memory specification](../memory-architecture.md) remains the behavior owner. Reuse the relevant query/storage/adapter contracts without importing unrelated platform work: creator chat persistence, full visual/acoustic overlays, general multiplayer, commerce and broad physiology remain in their own plans. Preserve their memory/privacy interfaces here. Detailed existing failures and operational checks remain in TODO; these tasks link them rather than creating a competing queue.

[AG01/AG02](agent-agency.md) extend the delivered minimal response and narrative goal foundations with multi-operation decisions and one operational pursuit store. Checked CR foundations retain their recorded scope; they do not complete AG work. All pending privacy, provider, parameter and recovery gates remain open. The active save/load policy removes old-development-save compatibility work, not same-version integrity or source/privacy preservation.

### CR01 — Separate model text from execution metadata

- [x] Define route-specific context/output contracts and server-only execution bindings. Keep policy, instructions version, IDs, expected revisions, watermarks, coverage and accounting outside model text unless a short handle is required to select an offered action.
- [x] Replace the generic situation/relationships/goals/concerns request with the actual stimulus and decision purpose. Inventory becomes relevant possessions with useful properties inline; remove the duplicate materials catalogue from ordinary cognition.
- [ ] Set independent input, visible-output, reasoning, byte, tool-round and monetary limits by level. Include instructions, schemas, Jev attention/routing and tool results in total accounting. Keep the complete accepted inner-world snapshot within an explicit context budget; expose the conflict if its current quota defeats the greeting target.
- [ ] Add deterministic payload inspection for a greeting, a resource task, a promise and a hazard. Reject unsupported/oversize output without paid repair; verify meaningful empty facts survive while null/empty scaffolding disappears.

- [x] Define separate finite raw, consolidated, authored-text, thought-history and backlog quotas; select a finite presentation-thought count and preserve native commitment creation limits.
- [ ] Establish actor-scoped repository/retrieval and independently replaceable execution interfaces using the data/query contracts. Plan current-format validation, same-version restore and recoverable schema/retention changes without old-development-save conversion; minimal current-state adapters must report unsupported capabilities honestly.

- [x] Define a versioned diagnostic root per semantic trigger/action before routing, with world/actor, perceived sentence, game/wall time, policy version, offered routes, disposition and stable child-stage/call IDs. Link coalesced triggers and queued reflection without duplicating calls or charges; capture no-call outcomes and explicit gaps under finite retention/capture limits.

Owner: `apps/server` context/cognition; generic limits in `packages/ai`. Depends on: none. Exit evidence: small model-facing examples plus separately retained authority bindings, with no private-world leakage.

### CR02 — Semantic levels and immediate speech

- [ ] Implement the [level-1 selection contract](../../archive/07-technical-architecture/agent-agency-runtime.md#24-level-1-selection-without-generative-escalation) in `jev-questions.ts`, `ai-director.ts`, `decision-context.ts`, `context.ts` and domain response admission. Review routing/action-preparation order so bindings precede selection; support a combined Choice or a bounded dependent second request. Translate one selected binding through existing admission, with explicit continue/escalate and failure dispositions, configurable thresholds and linked receipts. No new executor or automatic paid repair.

Coordinate response translation with [AG01](agent-agency.md#ag01--optional-bounded-multi-operation-decisions) and opportunity/native-adequacy integration with [AG07](agent-agency.md#ag07--meaningful-feedback-survival-and-bounded-reconsideration). Level-1 delivery and its acceptance remain owned here and in CR12; the existing checked routing foundation below does not establish this new path.

- [x] Implement native level 0 and Jev level 1 routing to level 2 mini, level 3 complex/low, level 4 complex/high, or level 5 reflection harness. Provider bindings must distinguish levels 3 and 4; the current fast/complex/full labels are insufficient.
- [x] Directed speech admits level 2 by default. Jev always evaluates escalation for an admitted semantic opportunity; it may raise the immediate reasoning level and/or enqueue reflection. Ordinary speech must not request mind updates or wait for reflection.
- [x] Keep ordinary response components minimal and reflection limited to short presentation thoughts as final output. The response envelope now supports optional repeated operations through AG01; no component is mandatory. Typed reflection goal changes share AG02 mutation instead of duplicating operational goals in prose. Remove required `policy`, `expectedRevision`, `thought`, `documents`, `removeDocuments`, `records` and companion patch arrays from ordinary responses.
- [ ] Verify a greeting causes no harness run, relationship-writing requirement or default high-effort reasoning; an exceptional event can request reflection while conversation and simulation progress. Provider refusal, unavailable credentials, invalid data and uncertain completion remain distinct.

- [x] Apply routing to every admitted semantic trigger, including notable events, hazards, encounters, need/goal changes and speech. Reject unoffered routes; native urgency acts immediately, and unavailable semantic work is explicitly deferred.
- [ ] Start every NPC cognition job with fresh model history and current versioned instructions, including immediate decisions; warm compute must not carry prior private transcripts. Verify actual model/effort/parameter forwarding and missing-capability outcomes without silently substituting a harness/model.
- [x] Revalidate actor life, current action prerequisites, turn/plan generation and relevant dependencies before independent speech/action commits. Deduplicate completion, retain uncertain spending through recovery and never execute provisional or partial output.

- [x] Extend the right-side Intelligence calls panel into an authorized god-mode trigger viewer now: one compact row per trigger/action, expandable routing/context/model stages, and status updates even when no model runs. Show actor, time, trigger sentence, chosen route, outcome and aggregate known cost; preserve expansion, scroll and focus while new activity arrives.
- [ ] Inspect offered routes, native policy gates, Jev input/judgment and recorded routing reason, followed by actual escalated LLM/harness input/response. Separate proposed decisions, speech and presentation thoughts from validated/committed effects; distinguish pending, skipped, deferred, coalesced, canceled, stale, failed and uncertain outcomes.

Owner: server director/cognition and AI adapters. Depends on: CR01. Exit evidence: fixture dispatch traces for all levels, speech and failures; provider compatibility remains a separate live gate.

[AG06](agent-agency.md#ag06--goalplan-aware-context-and-derived-interests) owns new operational context and goal-derived interests; CR03/CR04 retain attention algorithms, scoped retrieval and pending behavioral acceptance.

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

Proposed [EPR03](events-perception-and-reactions.md#epr03--actor-private-perception-acquisition-and-exposure-deltas) owns perception-acquisition integration and [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) owns change-fed intake. Recall/awareness behavior and its unique verification remain here.

Required companion reading: [context assembly and retrieval](../../archive/07-technical-architecture/context-and-inference.md#e-retrieve-personal-context-when-the-task-needs-it) and [semantic indexing and interest subscriptions](../../archive/07-technical-architecture/../../docs/memory-architecture.md#selection-signals-and-delivery-order). These supply implementation constraints beneath the canonical memory specification: permission filtering, fresh evidence despite index lag, disclosure-tier isolation, shared-definition reuse, selective instance indexing and goal-change reevaluation.

- [x] Make selection respond to present people, recent events, goals, unresolved concerns and conflicting beliefs. Derive bounded cues from permitted state and accepted inner-world text without another writable narrative store; retain supporting and contradictory evidence.
- [x] Deliver structured exact/entity/topic/commitment selection first, then semantic retrieval for arbitrary intents and paraphrases. Preserve Jev inclusion judgments and record coverage for each stage.
- [x] Use one scoped recall service for assembly and later tools: purpose/stimulus, people/entities, time range, recent/relevant/mixed strategy and total record/byte limits. Rank relevance, recency and salience; diversify routine/negative repetition and retain mandatory evidence independently.
- [x] Build actor-permitted candidate sets for nearby entities, possessions, known recipes, raw experiences and consolidated recall. Ask what the actor is paying attention to now; obtain a yes/no inclusion judgment per candidate in bounded batches.
- [x] Record selection handles, candidate coverage and omissions server-side. Exact/native filtering and semantic retrieval may bound candidates, but cannot replace the requested Jev attention judgment silently or scan an unbounded history per turn.
- [x] Use OpenAI `text-embedding-3-small`, 512 dimensions, and pgvector database-side cosine top-N search; return scoped IDs/scores without loading stored vectors into the application. Preserve existing embeddings through database-side migration.
- [ ] Evaluate these defaults with held-out paraphrase/privacy/latency/cost evidence and benchmark approximate indexes before adopting a recall/speed tradeoff.
- [x] Implement required embedding retrieval for complete natural-language intents and permitted memory text, alongside structured/full-text lookups and Jev inclusion. Do not require an LLM keyword-expansion step.
- [x] Version vectors by source/model revision and actor/disclosure scope; batch indexing, reuse unchanged vectors, invalidate corrections/forgotten content and reindex model changes without mixing vector spaces. Bound indexing/query spend with no automatic paid retries; preserve direct fresh-evidence paths and explicit lag/outage coverage.
- [x] Reevaluate on meaningful stimulus/goal changes; cache only across compatible actor, goal and evidence revisions. Preserve directed speech, urgent native danger and relevant active obligations even if optional attention fails.
- [x] Define budget exhaustion, provider outage, crowd overflow, stale selection and index-lag behavior. No paid request per simulation tick or per individual nearby object, and no recursive attention-about-attention calls.
- [ ] Preserve person-encounter opportunities, hysteresis, restart baselines and fair crowd dispositions. Keep D54 need reminders distinct from hourly consolidation; do not assume mandatory paid hourly thoughts.
- [x] Compile bounded versioned interest subscriptions from selected possessions/entities with goal-digest invalidation; validate supported predicates, reevaluate currently exposed candidates and record expiry/index dependencies. Semantic derivation from operational goals/known prerequisites remains AG06 work. Reuse definition/disclosure-tier embeddings and selectively index meaningful instance text, never per movement or repeated sound.
- [x] Integrate CR05 awareness, CR06 summaries and CR07 accepted-text cues before final retrieval acceptance. Each semantic trigger uses the same full-stimulus embedding path, with scoped cache reuse rather than a paid call per fixed step.
- [ ] Gate selective-recall tools on demonstrated omissions from initial context: record the missing permitted evidence, the affected decision and whether improved selection or a bounded tool resolves it. Reflection file access remains independently required.

- [x] Add a bounded candidate inspector for memories/events, objects, possessions and knowledge: selection method, permitted text/source revision, embedding query/model/version/metric and match score, rank, Jev inclusion judgment/call link, and inclusion/exclusion reason. Distinguish exact mandatory matches, semantic scores and Jev results; expose cache hits, index lag, coverage and unexamined candidates without inventing scores or scanning full history.

Owner: server attention/retrieval, generic Jev execution. Depends on: CR01–CR03 and existing perception boundary for the foundation; CR05–CR07 for final source integration. Tool execution follows CR08 after the demonstrated-need gate. Exit evidence: crowded scenes and large inventories/recall yield bounded, scoped selection without losing required evidence.

### CR05 — Awareness and one experience source

Proposed [EPR03](events-perception-and-reactions.md#epr03--actor-private-perception-acquisition-and-exposure-deltas) owns perception-acquisition integration and [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) owns change-fed intake. Recall/awareness behavior and its unique verification remain here.

- [x] Add event-time awareness links for every actor, including the player. Store one shared event plus actor-specific perceived text/detail when needed; never expose a raw event through the join.
- [x] Delivered CR baseline: retain experiential world events when at least one actor was aware. Keep deterministic state commits, idempotency, billing and recovery records independently; an unwitnessed action still changes the world. Future NC04 adds the configured notable-unseen exception; this checked item does not claim that extension is implemented.
- [x] Require a stored English text field for every memory and permitted awareness projection, preferring native templates. Do not copy each shared aware event into another raw memory row for that actor.
- [ ] Specify indexes, retention/evidence capsules, delivery deduplication and journal/query coverage. Later testimony creates a newly heard experience; it cannot invent historical witnessing.

- [x] Commit witnessed events and awareness delivery recoverably together; provide bounded pending-delivery/direct lookup for fresh speech and promises while indexes lag. Retain modality, recognition, intelligibility and event-time detail without retrospective upgrades.
- [x] Implement finite native obligation creation, fulfillment, deadlines and supported cancellation independent of prose. Preserve evidence-backed learning/proficiency and compatible learned-version mappings; neither partial observation nor reflection grants hidden recipe steps.

Owner: domain event/perception transitions; server repository/query projection. Depends on: CR01. Exit evidence: different observers see different detail, hidden events are absent from recall, and unwitnessed state changes survive restart independently of experiential retention. NC04 separately verifies notable unseen-event retention without awareness; ordinary unwitnessed events remain unretained.

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
- [x] Start a fresh harness conversation per reflection on compatible warm actor compute. Permit bounded multi-turn file work; final output contains one or more presentation thoughts, each at most 20 words, with a finite per-job count, plus optional typed goal changes through AG02.
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

CR10 and D54 retain threshold/reminder policy; [AG07](agent-agency.md#ag07--meaningful-feedback-survival-and-bounded-reconsideration) adds need/result integration and native-response adequacy through EPR intake without closing CR12 gates.

### CR10 — Configurable triggers as admitted mechanics

Coordinate proposed typed integration with [EPR04](events-perception-and-reactions.md#epr04--private-internal-threshold-events-and-native-protection), [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) and [EPR06](events-perception-and-reactions.md#epr06--persistent-stimuli-and-bounded-actor-local-relevance); broader admitted cognition policies remain here.

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

Owner: server repository/protocol/client projection and documentation. Depends on: CR05–CR10. Exit evidence: same-version restart/restore, explicit incompatible-format rejection, actor privacy and god-access checks. Previously delivered migrations are historical facts, not requirements to extend compatibility.

CR12 may reuse [AG12](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) scenarios while retaining its memory/recall acceptance scope.

### CR12 — Acceptance and token/latency evidence

Level-1 selection fixtures (zero external requests; implementation remains pending under CR02):

- [ ] Hungry actor with owned edible food: fixture Jev selects its supplied binding; native admission/execution consumes the item and applies nutrition with zero generative LLM calls and no fabricated thought, goal, speech or reflection.
- [ ] Adequate native eating and valid ongoing work use zero model calls. Deliberate continue leaves work and goals unchanged; missing, uncertain and invalid answers have distinct dispositions.
- [ ] No suitable candidate can escalate within its allowance rather than trapping the actor in the shortlist. An independently warranted conversational or planning response still reaches generation; successful simple selection never automatically schedules reflection. Exercise both combined Choice and dependent second-request routing without batching dependent questions.
- [ ] Stale items, unauthorized handles, duplicate results, pause/load races and exhausted budgets cause no unauthorized or duplicate effects and no automatic paid retries. Assert actual action/decision receipts, resource changes and dispatch counts; relevance-only positive answers do not execute actions.

Use [EPR09](events-perception-and-reactions.md#epr09--differential-and-performance-acceptance) for proposed stimulus privacy and ordering acceptance. Live cognition-quality acceptance remains CR12 work; native/fixture evidence cannot close it.

Required companion cases: [context evaluation](../../archive/07-technical-architecture/context-and-inference.md#9-evaluation-before-richer-infrastructure) and [perception/attention verification](../../archive/07-technical-architecture/perception-and-attention.md#8-acceptance-criteria). Include their relevant privacy, paraphrase, index-lag, stale-query, encounter-coverage and cost gates alongside the checks below; linking them does not mark them complete.

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

## Later harness extensions

Future increments after CR12's core acceptance; these do not expand CR01–CR11 or require a harness for ordinary speech. Existing CR07–CR08 own multi-turn reflection and publication. The following tasks own character-side behavior; INV tasks own creator investigation and mechanical authoring.

- [ ] **CH01 — Bounded investigation and planning.** Add a separately admitted harness route for difficult character goals when useful scoped tools exist: inspect permitted evidence and known methods, compare alternatives and propose a supported next action. Persist the objective, uncertainty and actual outcome between fresh jobs; resume on meaningful feedback rather than holding a run through construction or weather. Recheck intent, resources and evidence before action. Depend on CR04's recall gate when additional memory tools are needed; missing mechanics use INV-7.6 rather than creator privileges. Consume the AG-owned goal/frontier and submit typed proposals through AG admission; never create a second plan store or hold a run alive during native work.
- [ ] **CH02 — Teaching and social coordination.** After CH01 and the relevant learning/conversation contracts, support tool-assisted preparation when teaching, negotiating or coordinating requires evidence lookup. Preserve separate actor knowledge, attributed claims, partial learning and native commitments. Actual replies and practice arrive as new world events; never simulate the other person's agreement or learning inside one agent's private run. Keep ordinary conversation on the immediate route.
- [ ] **CH03 — Demonstrate useful iteration.** Compare bounded multi-turn and one-call approaches on conflicting-belief reflection, a blocked practical goal and incomplete teaching. Record tools/results, selected evidence, changed proposals, accepted outcomes, latency and total spend in god diagnostics. Enforce cumulative tool/byte/time/cost caps, interruption and stale-result checks; a failed run does not authorize an automatic paid retry. Promote richer routes only where observable continuity or successful action improves enough to justify their cost. Reuse [AG12](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) scenarios for matched-budget comparisons; no duplicated acceptance matrix.

## Migrated acceptance gaps

These pending checks directly define cognition completion and were moved from the cross-cutting TODO. They do not change CR task status.

### CR01–CR11 runtime acceptance

- [ ] Add and run meaningful CR01–CR04 fixtures: route/output contracts, full accepted-text overflow, directed speech and independent reflection, all semantic stimulus families, five selection signals, privacy, required evidence, candidate coverage, index lag, semantic paraphrases, stale dependencies, compatible cache reuse and changed-vector spaces. Adjust old fixtures that assume full-harness speech or per-event memory copies. No current compilation result establishes behavior.
- [ ] Add CR05–CR06 fixtures for event-time audience/detail, one shared event without duplicate raw recall, unknown historical audience, native explicit promises/deadlines/fulfillment/cancellation, learning continuity, six-hour/hour boundaries, summaries versus backlog, concurrent observers, corrections, forgetting and independent important incidents. Check important summaries remain protected at the finite quota.
- [ ] Add CR07–CR09 fixtures for quota-counted file names/content, identity protection, paths/symlinks, consistent export revision, staged partial failure, fresh histories on warm compute, duplicate/stale publication, pause/cancel/death, dream interruption, shared spending, interactive priority and late provider accounting. Verify midnight windows, split rest, fatigue debt, actual sleeping and the two-hour minimum independently of speed.
- [ ] Add CR10–CR11 fixtures for versioned policy admission and unoffered routes, same-version source preservation, incompatible-format rejection, import rollback, interrupted/uncertain jobs, PostgreSQL CAS/snapshot agreement, current forgetting-ledger reapplication during restore and god authorization on every endpoint. Run `pnpm run check` and browser checks after the deferred tests are updated.

### Individual memory perspective

- [ ] Add/run regression coverage for owner versus observer wording, named Mike identity, heard testimony, exact quoted dialogue, object/possessive references, repeated same-version restore, promise attribution, retained source tags and consolidation/reflection outputs. Run static/full checks when requested.
- [ ] Reconcile architecture, domain/extension guidance and implementation status with actor-perspective storage and named character identity; review related memory documents and links. Validate varied retained free prose and model-authored summaries/reflections before claiming universal first-person compliance.
- [ ] Verify a current-format local save after server restart: Mike's displayed name, Ada's source-attributed memories, persistence and scoped embedding/workspace refresh. Do not claim running-save or paid-model acceptance from isolated native execution; no incompatible-save conversion is requested.

### NPC memory and Macrofold integration

- [x] Resume live integration after account setup. Historical September 19 retry: sandbox setup now passes the execution-enabled gate but returns HTTP 402 `insufficient_credit`. No model run was admitted on that attempt. September 20 synthetic BYOK inference and reflection subsequently succeeded; the upgraded account reports Scale concurrency 50. Preserve original operation evidence; no automatic paid retries.
- [ ] Complete encounter → immediate speech → independent file reflection → accepted relationship/belief text → restart → later decision acceptance, then dream acceptance, only when authorized execution is available. Preserve the original continuity/restart gate; fixture success is not live evidence.
- [ ] Verify generic JSON inference for each CR02/CR06 chosen provider/model, including the level-2 mini and small summarizer. The earlier GPT-5.4-mini check predated the Contributor migration; inspected support then covered Anthropic JSON and Jev via Typesafe/OpenRouter. No selected route may silently substitute a model or harness; capability acceptance remains open.
- [x] Reconcile implementation status and the recorded HTTP 402 blocker with eventual live outcomes. September 20 native inference and reflection succeeded; current architecture, setup and task bodies now describe those routes. Keep actual execution evidence in status/TODO rather than a competing architecture audit.
- [ ] Verify newly admitted actors receive seed identity atomically with their first saved transition and one separately scoped Macrofold workspace. Verify unexpected Jev routes abstain rather than selecting unoffered cognition opportunities.
- [ ] Fix new god-endpoint fixture's no-cookie expectation: HTTP 401 is the actual unauthenticated contract; 403 remains the unauthorized-origin/god-disabled contract. This assertion failed before the instruction to stop tests; runtime rejected the request correctly.
- [ ] Refresh six existing menu assertions (five catalogue tests and one HTTP catalogue test) for the previously requested target-specific/empty-grass behavior. The latest localhost-enabled full check passed 171 scenarios and retained these six failures alongside the tracked 401/403, context-ordering, schema-version and journal expectations.
- [x] Run formatting, typecheck, focused native/god-route fixtures and the full check in the next requested implementation batch. September 20 god-world-editing run: formatting/typecheck passed; the separate production build passed; three domain, one same-origin HTTP and one Chromium scenario passed; the full suite reported 171 passed / 10 tracked failures. No provider calls were made.
- [ ] Expand rejection checks for byte limits, stale evidence/policies, quota-preserving commitment summaries, async provisioning shutdown, and exactly-once recovery after uncertain sandbox admission.
- [ ] Extend full-harness memory tools/files only through actor-scoped bounded interfaces. Accepted About me text travels inline; reflection edits scoped files directly and publishes validated snapshots. Extra MCP recall tools remain gated on demonstrated omissions.
- [ ] Add native obligation fulfillment/deadlines and richer relationship/emotion mechanics through typed rules. Current commitment facets require actual self-attributed promise speech and cannot erase active obligations.
- [ ] Review god-inspector UX, document revision/evidence presentation, refresh after new accepted thoughts and world-switch clearing. Ordinary state must continue excluding private mind data.

### Muse Spark 1.3 Contributor model migration

- [ ] Macrofold handoff: enabled model `meta/muse-spark-1.3-contributor` already appears in the local catalogue for `opencode` (managed/byok). Add `model_parameters` to both POST `/v1/runs` and POST `/v1/inferences`: `{reasoning:{effort:"low"|"xhigh"},provider:{require_parameters:true}}`. Forward this OpenRouter-shaped object without dropping reasoning or changing the model; include parameters in admission, idempotency, execution and usage provenance. Send model/harness/parameters only when creating a session; continuations inherit the accepted session configuration. Changed defaults apply to new sessions. The subsequent native-input inference contract forwards reasoning/provider fields inside input; harness requests retain model_parameters. Live reflection forwarding succeeded; remaining continuation cases require validation.
- [ ] Ensure generic JSON inference via OpenRouter supports this model as well as Jev. Open Legend sends the exact slug in `model_binding.model`, with `provider:"openrouter"`; no `openai/` prefix. Jev routing remains unchanged. No fallback to the standard/non-contributor model is allowed.
- [ ] Verify all generation routes: immediate mini uses low, complex routes use independently selected low/high, and the configured Contributor harness retains its supported full-work parameter binding. CR02 and CR08 now separate speech from reflection/dreams. Invention and world-agent harness parameter forwarding also remain pending verification. Existing chat continuations must not silently retain the previous GPT model. Confirm warm compute compatibility.
- [ ] Run deferred static/fixture checks for request shapes, contributor identity, continuation overrides, missing parameter support, and budget enforcement. Complex inference now allows 16,384 output tokens (including reasoning); fast defaults to 2,048. Monetary caps remain unchanged. No tests or paid inference were run for this migration.
- [ ] Update live acceptance scripts' old mini-model wording when their route contracts are implemented and verified. Model/setup/memory documentation now distinguishes the current Contributor helper from the accepted CR target; script and live verification remain pending. Contributor identity uses the model slug, not a separate boolean. Sources: https://openrouter.ai/meta/muse-spark-1.3-contributor and https://openrouter.ai/docs/guides/best-practices/reasoning-tokens .

### Local BYOK billing

- [ ] Validate `MACROFOLD_BILLING_MODE=byok` for harness runs (including continuations), Muse fast/complex inference and Jev inference; no silent managed fallback. Catalogue validation follows the selected billing mode.
- [ ] Document optional `MACROFOLD_PROVIDER_CONNECTION_ID` for the OpenRouter connection and optional `MACROFOLD_JEV_CONNECTION_ID` override for Jev through OpenRouter (the earlier separate Typesafe requirement is superseded). IDs select credentials stored in Macrofold; never send raw provider keys in prompts or frontend code. If omitted, Macrofold must resolve configured BYOK credentials or report unavailable.
- [ ] Verify existing managed sessions reject incompatible BYOK overrides explicitly or migrate according to Macrofold's supported contract. Keep original pending mutation IDs/bodies intact during reconciliation.
- [ ] Clarify model-provider BYOK versus sandbox compute allocation: compute caps/reservations remain unchanged. Tests and documentation deferred per session instruction; no paid calls made for this change.

### Contributor effort correction

- [ ] Supersedes earlier `max` handoff examples: Contributor fast thoughts use `reasoning.effort="low"`; complex thoughts and all harness calls use `"xhigh"`. `"max"` is standard-tier only. Earlier active documentation/handoff examples are corrected in this batch; verify serialized initial/continuation/inference requests in the deferred runtime batch. The new CR02 low/high target still needs independent binding choices. Shared runtime parameter helper updated; no tests or paid calls run.

### Jev through OpenRouter

- [ ] Supersedes the separate Typesafe-connection requirement: Macrofold Jev choice requests now use `provider:"openrouter"`, `model:"typesafe/jev-1.13"` (the exact identifier accepted by Macrofold's decision-model resolver), with the existing OpenRouter BYOK connection by default. `MACROFOLD_JEV_CONNECTION_ID` remains an optional override; `MACROFOLD_JEV_MODEL` controls this route independently of direct Typesafe `JEV_MODEL`.
- [ ] Verify live Jev choice parsing, confidence/probabilities, BYOK connection selection, spending and NPC/invention routing. No paid calls or automated tests run for this configuration change. Setup/provider documentation now reflects this route; runtime and live checks remain pending.

### Conversations across simulation pauses

- [ ] Explicit chat/invention requests no longer abort merely because the game pauses or the tab is hidden. An admitted provider stage may finish; successful results wait for resume before another paid stage or deterministic commit. Background NPC cognition still cancels on pause. Shutdown cancels pending resume waits; process-restart recovery of held responses remains follow-up work.
- [ ] Check pause during Jev, harness execution and after completion; repeated blur/resume; no new stage while paused; stale actor/action/evidence rejection after resume; no duplicate billing or dispatch; shutdown cleanup and actual provider failure messages.
- [ ] Verify pause-policy documentation against runtime acceptance; architecture/time/setup guidance now reflects held explicit responses. Update remaining UI wording in its own pending batch. Thinking text now explains that detailed responses can take about a minute; completed held responses say to resume. No automated tests or paid calls run for this change.
- [ ] Add automated coverage for guaranteed current-conversation recall: the newest 32 actor-aware speech events in the durably associated conversation bypass embeddings and Jev, appear once in chronological order and remain private to actors with awareness. Up to 32 older speech events use vector ranking followed by Jev relevance. Cover forgotten/corrected evidence, large transcripts, multiple NPCs, untargeted overhearing, restart, semantic outage and context-budget failure. Tests were deferred at the user's request.
- [ ] Add automated coverage that the current trigger appears only in the Trigger section; non-speech events do not consume the guaranteed speech window; non-person objects never enter `peoplePresent`; required context fails before embedding/Jev dispatch; and semantic candidates are bounded by the remaining context allowance. No test files or suites were added or run at the user's request.
- [x] Reconcile conversation/retrieval documentation for durable conversation association, the newest-32 plus semantic-32 prompt policy, retained-history independence and required-versus-semantic byte allocation.
- [x] Replace the interim pair/time-gap boundary with durable conversation association. Recall requires actor-owned event-time awareness; missing legacy association remains unknown. The native conversation and event-binding implementation is tracked in NC05; integrated privacy and merge acceptance remains open.
- [ ] Add automated coverage for component-specific action admission, mandatory-budget rejection before embeddings, zero-remaining-budget retrieval, action-space reservation before Jev, and large-backlog candidate construction. Tests were deferred at the user's request.
- [ ] Add automated coverage for importance/urgency interruption policy and the single response refresh: ordinary awareness must not delay replies; only events at or above both thresholds abort the active provider stage and refresh once; the retry rescans from the original watermark and includes every qualifying event received before it starts under distinct provider/application-stage identities; evidence arriving during the refreshed attempt does not loop. Cover legacy awareness without urgency and ensure user, pause and shutdown cancellation cannot become a retry. Automated tests were deferred at the user's request.
- [ ] Add automated coverage for shared context-list attention: each ordinary section with at most 24 optional entries bypasses embeddings, larger sections use ranked semantic top-24, older conversation speech uses top 32, all optional section finalists share one batched Jev judgment, and only judged entries fitting the global byte balance render. Cover asynchronous actor-scoped speech indexing, mature-save catch-up, memories, conversation, surroundings, inventory, knowledge, vector lag/fallback and per-section diagnostics. Tests were deferred at the user's request.

### Manual AI cancellation and player priority

- [ ] Verify the authenticated, same-origin `/api/ai/cancel` route binds an exact current job ID; stale cancel clicks cannot cancel newer work. Check paused response waits, remote cancellation, uncertain completion and no new paid retries.
- [ ] Verify composer Cancel request / Cancel background thought controls and background thoughts no longer disabling Send. Explicit player submissions abort background cognition and await cleanup before taking its worker; concurrent player submissions retain one-job admission.
- [ ] Check refresh/reconnect, interrupted-server recovery, preserved drafts, status messages, and no immediate automatic restart following user cancellation. Update UX documentation in the next batch. Runtime changes only; tests deferred.

### Stale composer cancellation warning

- [ ] Verify newest-first job selection: the composer previously reversed the server's newest-first list and redisplayed the oldest chat cancellation. It now selects the newest matching job and labels terminal errors as previous requests; cancellation wording no longer implies the world is currently paused.
- [ ] Cover refreshed/reconnected views, a new successful chat replacing an old cancellation, background versus interactive jobs, and focus/resume status. No tests run; documentation deferred.

### Message-local reply outcomes

- [x] Preserve verified Macrofold harness failure codes and run identities in user-visible failure details without releasing unreported charges. Native replay evidence is in [Verification](../verification.md#live-agency-contracts); automated caller coverage remains in [TODO](TODO.md#deferred-agency-validation).
- [ ] Restore the configured external reflection harness and complete the typed goal-change publication walkthrough. The [current live blocker](../verification.md#live-agency-contracts) prevents reflection compatibility acceptance. Preserve the failed run and its accounting before a separately admitted verification attempt.

- [ ] Verify chat jobs persist the exact player speech event ID; animated dots and failure labels appear only alongside that message, including repeated identical text and reloads. Completed turns have no label. Legacy unlinked messages intentionally receive no guessed status.
- [ ] Add an index for speech-event job lookup if chat history/job counts grow; verify actor visibility boundaries, repeated identical text, reload behavior and terminal status persistence. Focused projection and browser scenarios cover the current state mapping, one-line growth, pending dots, successful replies and failures; broader recovery coverage remains open.
- [ ] Add automated regression coverage for pending dots occupying a separate incoming-response row, failure reasons remaining inside the originating message, and legacy saved identity/provenance errors being normalized into a plain-language failure tooltip. This correction was runtime-checked without adding or running automated tests at the user's request.
- [ ] Add automated regression coverage: a technically `failed` chat job must project **Failed** inside the originating player message, with its reason on hover/focus. `cancelled` and `stale` jobs end the pending state without becoming message failures. No failure, cancellation, stale-context, pause, admission, or generation explanation may appear as a standalone transcript row. Active work alone gets the separate incoming dot placeholder.
- [ ] Add automated regression coverage for conversational context races: ordinary awareness changes do not invalidate a response; the first newly perceived event meeting both importance and urgency thresholds refreshes context once with distinct admitted provider IDs; another qualifying event cannot loop. Pause races wait and commit the generated response after resume. Provider, schema, storage and spending failures remain terminal and visible only through the message-local **Failed** state. Actor unavailability cancels the response and appears through the disabled Talk input's specific explanation.
- [ ] Add automated and accessibility coverage for the shared character/world-agent conversation components: incoming and outgoing messages scroll to the bottom while either of the latest two messages remains visible; readers scrolled far enough that both are offscreen retain their position and receive the keyboard-operable **New Message** down-arrow control; activating it reaches the bottom and clears the indicator. Cover tab switching, empty/short/long threads, rapid messages, pending-to-response replacement, failure updates, narrow screens, reduced motion and screen-reader announcements.
- [ ] Cover opening and switching character or World Agent conversations with existing long histories: initial mount and every conversation-key change must land on the most recent message without showing the **New Message** indicator; only messages arriving after the conversation is open may preserve a deliberately scrolled-up reading position.
- [ ] Cover conversation panels that remain mounted while hidden: reopening either panel must detect its zero-height-to-visible transition, make the thread the sole history scroll owner and land on the newest message while leaving the composer visible. Verify actual effect summaries when available, and ensure effect-free actions do not render a redundant “no mechanical effects” label.
- [ ] Add regression coverage that `replyInterruption`-style subtitles cannot reappear: failed terminal reply jobs project only as message-local **Failed** with hover/focus detail, while cancelled and stale jobs end pending presentation without a failure label. Successful messages show no technical caption, including partially rejected response components.
- [ ] Add regression coverage for explicit conversation visibility and capped history: opening/reopening either panel always schedules a post-layout scroll to the latest message; new messages are detected by last-message identity even when the 30-entry server projection evicts the oldest entry and keeps the same array length; deliberate far-history reading still receives **New Message** instead of being displaced.
- [ ] Add interaction coverage for draggable character-conversation and World Agent panels: header-only pointer dragging, interactive header controls, viewport bounds, focus, overlapping panels, UI scaling and the fixed narrow-screen sheet behavior. Reconcile the draggable panel contract in design-system documentation when documentation work resumes.

### AI status from request history

- [ ] Verify old failed jobs no longer keep the badge degraded after a newer successful completion. Cancellations are not provider-health evidence. Labels now say Recent AI error / Latest AI request failed instead of implying a live Service limited health check.
- [ ] Document the distinction between configured providers, request outcomes and actual service health; consider independent per-provider health later. No tests run for this change.

### Intelligence call inspector — deferred validation and documentation

- [ ] Add focused tests for direct Jev/LM, Macrofold inference, and full harness/world-agent input/output capture, failures, cancellation, receipt usage, billing, raw provider responses, and restart history.
- [ ] Verify owner-session, origin, and god-mode authorization; credential redaction; response capture limits; provider response preservation; pagination and panel refresh behavior.
- [ ] Run runtime tests and browser verification; changed runtime files were formatted and typechecking passed, but no tests were written or run at user request.
- [ ] Document the right-side Intelligence calls panel and synchronize relevant architecture, extension, provider, verification, and implementation-status docs without losing unique information.
- [ ] Document persistent local debug storage, god-mode access, missing usage/billing semantics, one-megabyte response capture truncation, latest-status poll coalescing, and restart-interrupted entries.
- [ ] Verify the on-demand Macrofold run-events and billing-usage integration against live permissions, late-arriving charges, missing usage, BYOK estimates, and pagination limits; individual harness LM inputs/outputs depend on provider event coverage.
- [ ] Define debug-history retention/export and account for persistent conversation history supplied by Macrofold beyond the locally submitted prompt.
- [ ] Verify intelligence inspector scroll stability while reading nested outputs and manually refreshing; verify Macrofold details collapse during/after fetching and the wider panel at desktop/mobile sizes.
- [ ] Document manual Refresh calls, doubled inspector width, and the distinction between locally recorded input/output and optional remote Macrofold events/billing. Tests and documentation deferred at user request.
- [ ] Verify camera/canvas framing after reload, viewport resizing, browser panel resizing, and opening wide docks; cover fractional dimensions and confirm no ResizeObserver sizing feedback. Tests deferred per requested workflow.
- [ ] Document CSS-owned canvas display sizing and rendering-buffer-only resize behavior in the relevant client architecture guidance.
- [ ] Verify JSON Copy buttons copy full displayed contents, including refreshed Macrofold details, preserve disclosure/scroll state, and report clipboard failures; document controls in the next documentation batch.
- [ ] Add and run regression coverage for list-to-detail navigation, Back to Intelligence, independently collapsed stage accordions, JSON controls remaining visible while stages are collapsed, and combined provider-exchange JSON.
- [ ] Update the canonical architecture, UI, verification, and implementation-status documentation for the stage accordions and persistent JSON controls after runtime validation.
- [ ] Add regression coverage for grouped Jev rubrics: render shared question text and options once, resolve candidate handles to target text, and show one compact target/selection/probability row per answer across choice, score, Noul, missing-answer, and non-candidate question shapes.
- [ ] Document grouped Jev target results and the distinction between display labels such as `Mike (player)` and admissible entity handles such as `player` in the next Intelligence-inspector documentation batch.
- [ ] Add response-admission coverage proving nearby display names cannot be mistaken for handles: generated talk, expression, and thought references must use the exact advertised entity ID, while label-shaped values such as `Mike (player)` remain rejected and visibly diagnosable.
- [ ] Add Intelligence-inspector coverage for Jev purpose labels derived from routing, memory-attention, action-attention, invention, and fallback question shapes; verify the visible stage heading and expanded purpose agree.
- [ ] Add use-case coverage for structured LM summaries: NPC speech/action/thought, invention request/proposal/materials, memory-consolidation mode/sources/groups, background-reflection thoughts, provider failures, null components, and unknown task fallbacks. Raw provider/schema payloads must remain confined to the JSON pullout.
- [ ] Add failure-stage coverage for retained `input.reason`, `output.message`, `output.reason`, and thrown `output.error` values, then document the Jev-purpose, LM-purpose, and workflow-error presentation in the next debugger documentation batch.
- [ ] Verify compact intelligence headers display time, friendly model, actor, trigger, and accessible success/failure/pending icons across old/new records; document header fields in the next batch.

### September 20 native Jev and live cognition

- [ ] Author the deferred meaningful CR fixtures and migrate superseded contracts, especially pause/stale completion, privacy, consolidation semantics, sleep and workspace recovery.
- [ ] Complete held-out matched-history quality checks across all five selection signals, summary attribution, meaningful action changes, broader invention reuse, and total cost per real hour at each speed. The few live examples above do not establish universal quality or the greeting token target.
- [ ] Exercise real process failure during publication/provisioning and reconcile late/unknown billing; retain original request identities and never automatically re-dispatch paid work.

### Cognition persistence and consolidation follow-up

- [ ] Migrate existing fixtures to asynchronous repository/service APIs (`await service.ready`, mutations, reads and close); add transaction isolation, concurrent world commands, budget admission, rollback/disconnection and shutdown coverage. No tests were authored or run for this refactor. Production builds use `tsconfig.build.json`; the full test-inclusive typecheck still requires fixture migration.
- [ ] Add consolidation coverage for explicit source partitions, updating existing memory identities, unrelated routine incidents, unchanged individual important incidents, missing/duplicate/stale sources, capacity preflight, hourly same-day batches, daily review of every consolidated and remaining raw memory from the previous completed day, and cancellation/provider failure preserving originals. Reject reordered groups and groups spanning an intervening memory. Verify useful recall from overdue raw sources within the 512-source initial retrieval limit and independent required-evidence selection.
- [ ] Verify repeated overlapping reflections: memories never become “done reflecting”; legacy processed watermarks are ignored by scheduling and no longer advanced. Verify intentional idle-only scheduling, one dispatched reflection maximum per actor/game day, queued later opportunities, and real-time budget limits independently of memory reuse. Dream consolidation is separate from reflection.
- [ ] **Known limitation, explicitly deferred:** forgetting/correcting evidence during Jev attention can leave stale selected text in the next model request, certified against a newer dependency snapshot. Rebuild or reject selection when its original dependencies change; do not silently refresh the dependency stamp. User accepted deferring this uncommon race.
- [ ] Synchronize memory architecture, implemented architecture, cognition-redesign tasks, production-data model, setup and verification docs with this implementation: asynchronous PostgreSQL transactions/serialized world mutations, changed-row writes, explicit reusable memory groups, individually protected incidents, chronology-safe hourly batches, one daily dream review of the previous completed day, no age-only loss of unconsolidated recall, and once-daily intentional idle reflection without processed-memory semantics. Documentation propagation was deferred at the user's request; preserve unique requirements and dated evidence.
- [ ] Add semantic-scheduler coverage proving evidence watermarks advance only after a completed route/action, failed/stale/cancelled work remains eligible without automatically retrying the identical paid opportunity, sleeping defers evidence, and newly consolidated summaries retain source sequence.
- [ ] Add pgvector coverage proving ordinary bounded recall never deletes vectors outside its candidate window; consolidation, correction and forgetting explicitly invalidate affected source/summary rows; revision filtering prevents stale vectors from matching; and returning candidates reuse their existing embeddings.
- [ ] Complete live model-quality validation when Macrofold capacity is available. The one capped BYOK attempt returned HTTP 429 `inference_capacity_unavailable`; no retry was sent and no source memories were retired. Its isolated $1 ledger conservatively charged the $0.25 reservation as uncertain, not confirmed provider spend.
- [ ] Add regression coverage and UI guidance for resource-based gathering shortcuts: one option per resource type, nearest stocked visible target, retargeting after depletion/movement, unavailable only when no eligible sources remain, and migration of old object-specific pins.
- [ ] Add deferred movement-memory coverage for destination details, arrival versus interrupted movement, and first-person narration; cover Memories/Journey game-time labels (08:00 origin, day boundaries, narrow layouts) and removal of character History. Reconcile architecture and UI documentation for these changes. Manual domain execution and React rendering succeeded; finish browser acceptance once concurrent client/server compile errors are resolved. No test files were authored or test suites run for this change.
