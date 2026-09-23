# Events, perception, and reactions

## Spatial dependency

[Spatial world](spatial-world.md) supplies coordinates, physical geometry and queries; the sensory owner still assigns modality/detail/exposure. Position/support and geometry revisions feed the existing candidate/exposure intake. Event-time origin is immutable historical evidence; newer geometry cannot upgrade it. The 3D integration adds no parallel event bus and no paid call per altitude or camera frame. See [SW08](maintainers/spatial-world.md); private thoughts and technical readiness remain distinct from external occurrences.

**Status: proposed architecture.** Installing this document does not accept every proposal, authorize paid execution, or claim implementation. The [research and audit](../archive/02-research/engine-perception-and-event-architectures.md) explains the evidence. The [EPR tracker](maintainers/events-perception-and-reactions.md) defines the work.

## 1. Purpose and ownership

World modules supply registered state/sense policies through the [shared runtime contract](../archive/07-technical-architecture/world-module-runtime.md). EPR remains the sole owner of stimulus scope, perception episodes, threshold event delivery, reaction intake and cursors. Module extensibility adds no second event log, per-object queue, or permission channel.

Give external stimuli, private internal changes, perception changes, and relevant deadlines one coherent path into actor reactions. Share contracts and infrastructure without forcing every engine operation through the same bus.

This document owns **stimulus scope, perception-change identity, and reaction intake**. It does not replace these existing owners:

| Existing owner                                                                     | Responsibility retained                                                                  |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Sensory design](../archive/07-technical-architecture/perception-and-attention.md) | Geometry, hearing, recognition/detail, camera/body exposure, sensory overlays            |
| [Memory architecture](memory-architecture.md)                                      | Recall, Jev attention, reasoning levels, reflection, forgetting, mental privacy          |
| [Performance](performance.md)                                                      | Runtime cadence, work budgets, optional I/O, profiling, scale gates                      |
| [Narration](narration-and-conversations.md)                                        | Conversation lifecycle, story selection, private prose and transcript behavior           |
| [Production data](../archive/07-technical-architecture/production-data-model.md)   | Record/transaction authority, queries and storage conventions                            |
| [Save/load](save-and-load.md)                                                      | Consistent capture, restoration, generation fencing and active-development compatibility |
| [Declarations](../archive/07-technical-architecture/declarations-and-evolution.md) | Admission of new mechanics and trusted configurable behavior                             |

[Agent agency](agent-agency.md) owns operational goals, plan execution and decision composition. Agency goal-review/action-result/invention-result causes use this document’s single reaction intake; they do not introduce a second event pipeline. Private invention feedback uses owner-private scope, while unprojected execution receipts remain system-only.

Keep the current single-world authority, fixed native steps, actor model, conversation/Narrator implementation, durable records, and bounded AI executors. This is not an engine replacement.

## 2. The six distinct concepts

| Concept                       | Meaning                                                            | Not equivalent to                                     |
| ----------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| State                         | An object is luminous; an actor has low fullness                   | An event every tick                                   |
| Domain occurrence             | Something changed or happened with an authoritative cause and time | A command requesting that change                      |
| Perception acquisition/change | One observer gains, loses, or updates permitted evidence           | A broadcast announcing everything that observer knows |
| Active stimulus               | A condition or exposure remains relevant now                       | Repeated generation or permanent memory               |
| Reaction opportunity          | An actor has a reason to reconsider, continue a plan, or react     | A guaranteed LLM call, speech, or visible thought     |
| Wake signal                   | A bounded notification that a consumer has work available          | Durable truth, evidence, permission, or completion    |

Commands still request mutations. Native validators still decide effects. Diagnostics and visual patches remain separate non-authoritative products.

## 3. Proposed flow

```text
native commands + ordered simulation + due native deadlines
                         |
             authoritative state changes
                  /                 \
    external occurrences        private internal changes
          |                            |
spatial candidates + exact sense       | owner-only exposure
          |                            |
          +---- actor-scoped evidence -+
                         |
         perception/episode update + native protection
                         |
      commit required state, evidence, and durable intent
                         |
       scoped after-commit notifications / dirty actors
                         |
        coalesced actor-specific reaction opportunities
                         |
     existing native / Jev / immediate / reflection routes
                         |
           existing command/response admission
```

The diagram is a responsibility map, not permission to reorder existing native rules. A native emergency response remains inside the deterministic simulation boundary and cannot wait for the after-commit asynchronous path. Required awareness, commitments, and dependent invalidations remain atomic with their owning transition.

## 4. Scope and event identity

External/private/system scope remains a closed trusted discriminant. Registered sense/event-family IDs cannot introduce privacy scopes or broaden their audience.

### A common logical envelope, not a mandatory new global table

Use common identity fields for meaningful occurrences and evidence: world identity, current authority generation, stable source/cause identity, event/receipt identity, simulation time, stable order, typed payload, and policy version. Reuse existing identities and records rather than duplicating the world event log.

Represent scope with an explicit discriminant:

- **External sensory:** the source can expose particular facts through one or more senses; determine each recipient at event time.
- **Owner-private internal:** the occurrence is directly available only to the owning actor and separately authorized administrative inspection.
- **System-only:** control, execution, or diagnostic notifications do not become character evidence.

Do not use `sourceId`, a high importance value, or a missing audience as an implicit scope selector. The server/domain establishes scope; a model, editor JSON payload, or client cannot request broader authority by setting a field.

Do not force private internal events into a publicly projected world-event array. Reuse the existing scoped history/experience boundary with a typed source and explicit owner. The logical envelope can be shared while physical storage and retention differ. Persist neither an entire queue per object nor every continuous numeric update.

### Perception acquisition is normally private

“A sees the sword” is evidence acquired by A. It does not establish that B sees the sword or even that B observes A noticing it. If A gasps, points, or speaks, that separate outward action may create an external occurrence with its own audience.

Route both external awareness and private acquisition through the central semantic experience mutation boundary. Retain source attribution, permitted detail, time, and acquisition type. Do not claim recognition merely because the server knows an entity's name.

### Event-time evidence versus current action authority

A listener retains legitimate evidence of a shout heard earlier even if the speaker has moved away. Historical audience is evaluated at occurrence time. A later action still checks current range, life state, permissions, and resources. Do not replace either check with the other.

## 5. Perception relationships and shared source work

Model perception as a directed relation `(observer, source, sense)`. Only instantiate bookkeeping for relevant sources; decorative blades of grass do not each need actor-visible entities.

The relation distinguishes:

- current permitted exposure and detail;
- last observed source revision/facts;
- an encounter or stimulus episode identity;
- any linger/hysteresis state;
- current relevance and next configured review time, where needed.

This is logical structure, not a requirement for a database row per visible pair. Use existing state and compact in-memory indexes; persist the small subset that affects continuation behavior.

### Shared source descriptors

Cache immutable or revisioned source descriptors: physical presentation, supported sound/light profile, and safe description variants. Key by definition/state version, sense/detail tier and applicable disclosure policy. Recognition, actor goals, personal memories, and subjective appraisal remain receiver-local.

A perceived union may help decide which expensive shared descriptors need preparation. Do not build and scan that union just to avoid duplicate constant-time importance checks. No object's membership in that union determines whether native simulation runs.

### Trigger-producing changes

Produce typed deltas for entry, exit, meaningful exposed-state change, recognition/detail change, and relevant receiver-state change. Unchanged exposure produces no new acquisition every tick.

Spatial entry is not required when:

- a visible source begins burning or emitting sound;
- the observer's goal makes an already-visible tool relevant;
- the observer learns how to recognize the object;
- an ongoing condition crosses an escalation band;
- a configured reminder becomes due.

Changing a goal may re-evaluate the bounded current candidate set. It does not justify a global object scan or a model call for every candidate.

### Hysteresis and freshness

Set differencing detects entry/exit; hysteresis prevents rapid oscillation at a boundary. Keep episode stability separate from live sensory authorization. An episode may linger outside acquisition range, but its cached last-seen facts must not receive new hidden updates. Action admission always uses exact current eligibility.

Remembering and currently perceiving are independent. Forgetting a memory while still looking at a bright object does not make its physical presence disappear or require re-discovering it as a new event each step.

## 6. Spatial work and invalidation

### Initial implementation: reuse correct candidate indexes

Preserve and qualify the implemented phase-local scalar spatial candidate pass for object encounters, unchanged visibility-array identity and per-source audience reuse in the fixed-position post-movement phase. Each event still commits independently through the existing mutation owner; the resolver cannot be reused after movement, life/sleep or sense changes. Complete general external-event candidate reuse, exact event-time validity, private acquisition integration and differential acceptance. Do not recreate the old full-scan-to-grid rewrite or treat that partial improvement as complete EPR02 delivery.

Optimize external-event audiences with listener candidates appropriate to the event's sense and maximum reach. An owner-private internal event must bypass spatial audience discovery entirely.

Do not call the current `nearbyEntities` helper repeatedly on a mutable draft and assume it caches: the inspected implementation rebuilds in that case. Give a query phase a validated candidate index, or use a revision-aware context whose validity is explicit.

An event emitted after a move needs event-time positions. An end-of-step index cannot retrospectively determine all earlier audiences. If the implementation cannot prove index validity at a mutation boundary, rebuild there or retain the safe fallback. Correctness is preferable to an incorrect cache.

### Separate spatial invalidation from general entity changes

Ultimately, movement, spawn/remove, footprint/sense changes, and relevant obstacles should invalidate spatial work; an unrelated fullness decrement should not rebuild all spatial membership.

Start with phase-local reuse and counters. Maintain an incremental spatial index only when rebuilding remains a measured cost. Store stable IDs and valid spatial facts, not escaped Immer draft references. Cache invalidation must cover both old and new regions of a move or removal.

### Required dirty causes

- Observer movement, rotation if used, sense capability, sleep or perception policy changes.
- Source movement, spawn/remove, exposed features, emitter state, or footprint changes.
- Relevant occluder/environment changes.
- Teleport and restore, including a new authority generation with the same world ID.
- Goal, need, knowledge, or accepted-mind changes for actor-local relevance, without automatically rebuilding geometry.

Movement within one grid cell still changes exact distance and can cross a sight boundary. Grid-cell membership stability is not proof that sensory results are unchanged. A stationary observer must see a moving source enter; observing only observer movement is insufficient.

Use the union of affected **old and new neighborhoods** for changed sources. A reverse observer relation can help route feature changes to current observers, but it is optional until profiling justifies its memory and maintenance costs.

## 7. Internal triggers and native survival

Registered attribute policies supply [typed state and concerns](../archive/07-technical-architecture/world-module-runtime.md#4-typed-state-and-attributes); threshold episodes and native protection remain owned here.

Treat meaningful internal changes as owner-private stimuli. Initial sources should be current native needs/body state, not inferred LLM diagnoses.

A registered threshold policy defines the owning quantity, applicable actor capabilities, comparison/bands, recovery rule, episode identity, native response eligibility, and optional cognition eligibility. Emit only a meaningful crossing/escalation/recovery, not every decrement.

**Do not collapse all existing thresholds to one number.** Native eating, native food seeking, action interruption, semantic urgency, and sleep protection serve different purposes. The research audit identifies current values; implementation must inventory and preserve them before changing any policy. The user's “health below 20%” example illustrates the mechanism; it is not a mandate to replace current health/survival rules.

The proposed episode lifecycle is `inactive → active → escalated/continued → recovered`. Latch state prevents duplicate crossings. Separate recovery margins can provide hysteresis where approved. If a quantity crosses and recovers within a batch, meaningful intermediate events cannot disappear through final-value coalescing.

Native protection remains immediate and deterministic. At first, keep the current native evaluator at its existing step boundary and call it only once; the new event records explain and schedule the response rather than creating a second survival action. Later skipping native evaluations requires proof that all relevant changes—food acquired, resource depletion, failed path, interrupted action, body change, or due rest—wake it correctly.

Threshold recording preserves existing native rules. The [agency survival policy](agent-agency.md#8-attention-and-initiation) separately permits bounded deliberation when a capable actor lacks an adequate native response; it does not alter thresholds, duplicate native protection or consume merely deferred evidence.

Owner-private routing does not imply conscious awareness during sleep: preserve current waking/sleep capability rules, and do not manufacture remembered experiences for an actor that could not perceive them. Routine animals retain native behavior without requiring a mind, a persisted human-style memory, or a model call. Sensory/memory capability determines evidence retention, not whether physical protection is allowed.

## 8. Ongoing salience, relevance, and reminders

Use distinct concepts rather than one overloaded importance field:

| Concept                | Example                                               | Owner                            |
| ---------------------- | ----------------------------------------------------- | -------------------------------- |
| Perceptible strength   | A source is intensely bright or loud at this location | Sensory model                    |
| Actor relevance        | This actor needs a cutting tool                       | Native/semantic attention policy |
| Novelty                | Newly seen, changed, or newly recognized              | Perception episode bookkeeping   |
| Urgency                | A known hazard needs an immediate response            | Native/typed reaction policy     |
| Narrative significance | A story-worthy introduction or event                  | Existing story selector          |

Keep current event importance compatible; new dimensions need not all become numeric scores or stored fields.

An ongoing high-salience stimulus uses three mechanisms: an onset opportunity, bounded inclusion in later current context while valid, and an optional due review. Escalation or meaningful changes can produce additional opportunities. This does not create one paid thought per simulation tick.

Mandatory native hazards cannot be removed by optional attention filtering. Many simultaneous persistent cues require bounded grouping and explicit overflow handling; no field can promise unlimited mandatory prompt size. Narrative descriptions remain separate from physical effects such as blindness or burning, which require supported native mechanics.

For production behavior, preserve existing cooldowns, urgency policy, and explicit urgent single-refresh semantics. Implement configurable reminder contracts but do not invent a mandatory paid hourly-thought policy. Use an explicit test policy to exercise reminders; unresolved cadence or attention-forcing preferences remain in the decision register. A reminder may decide to continue a valid native plan without invoking a model.

## 9. Reaction intake and scheduling

### One intake, several executors

Adapt direct speech, newly committed external awareness, internal crossings, perception changes, due reminders, goal reviews and actor-permitted action/invention results to one actor-local intake. The intake carries actor identity, generation, relevant evidence/episode, reason class, urgency, due time, and current disposition.

Direct player speech retains explicit interactive priority. It must not also enqueue duplicate autonomous work for the same actor/response identity. Existing Jev escalation, response admission, optional reflection and native actions remain the executors; the agency contract extends response composition and native continuation.

A reaction opportunity can be handled natively, coalesced, delayed, explicitly declined, or routed to reasoning. It is not a model request until durable admission and spending checks succeed.

### Extend ActorWork instead of replacing the scheduler

Feed actor IDs and reason-specific revisions from accepted changes into `ActorWork.wake` or an equivalent typed update. Replace broad `telemetryRevision` dependence and full per-poll input reconstruction with explicit invalidations where coverage is proven.

Consume newly relevant awareness through existing durable identities/cursors, not a full reconstruction of retained actor experience on each scheduler pass. Retained recall remains available when building actual context; trigger selection should not become an unnecessary recall query.

Keep a small ready set and due-time checks initially. A heap or timing wheel is justified only when scanning eligible tickets is a measured bottleneck. Simulation-time deadlines and wall-time cooldown/provider deadlines must remain distinct. Speed changes and pause/restore cannot silently convert one to the other.

### Correct coalescing and overload

Coalesce cognition wakeups while preserving distinct accepted speech, effects and evidence in their authoritative stores. The cognition wakeup watermark covers the current opportunity snapshot, including native or unavailable dispositions; it is not evidence of semantic handling. Retained history never becomes a backlog of owed cognition calls. The [memory context contract](memory-architecture.md#4-jev-attention-before-context-inclusion) supplies fresh hard-query and semantic context for each opportunity.

Bound pending actor/episode metadata and work per turn using the performance policy. Keep required evidence in its existing authoritative store and retain authoritative evidence when optional work queues fill. Do not materialize an unbounded per-event promise chain. Never drop an authoritative occurrence or let a full queue disable native protection. If required retention cannot progress, use the existing explicit backpressure behavior rather than silent loss.

Priority should preserve interactive and urgent work while aging deferred actors sufficiently to avoid starvation. This design does not increase global model concurrency or per-actor spending automatically.

## 10. Transactions, subscriptions, and secondary consumers

Use a small typed routing table for named consumers, not arbitrary callbacks attached to every object. Initially the relevant consumers are actor reaction intake, reflection scheduling, and the existing story selector. The UI receives its existing authorized projections.

Required native consequences—including awareness insertion, commitment changes, and dependent invalidation—remain within the ordered domain/repository transition. Do not move them into optional after-commit callbacks. Consumers that request later physical work must return through ordinary command/effect admission, with bounded causal depth and no reentrant event cascade.

After-commit wakeups carry bounded IDs/revisions, not entire private records. Required history and durable job intent must commit before optional paid processing observes them. Routine progression may retain its current bounded durability interval; hold affected paid wakeups until the required evidence is committed rather than forcing a new write for every footstep.

A crash between commit and notification is recoverable from existing durable work/cursors. Do not add a generic broker or second authoritative event log merely to make local notification durable. Existing Narrator job rows remain its durable queue.

Preserve strict consumer boundaries:

- Internal events do not become public Narrator candidates by default.
- Cognition importance does not override story selection.
- Diagnostics do not become actor stimuli or evidence.
- Private reflection presentation is not automatically recallable intentional thought.
- Unknown/generated metadata cannot register executable subscribers or change privacy/spending rules.

Shared event identity can later support achievements, tool availability, and other consumers. Add one named consumer when a real feature needs it; do not build a generic plugin framework in EPR. The shared EWF foundation has its separate scope; neither permits arbitrary callbacks, a broker or a universal bus.

## 11. Save/load, reset, and privacy

Follow the current save/load owner and the active no-legacy-support policy. Do not add old-format migrations for this change. Reject incompatible development formats explicitly when a necessary version changes; same-version integrity remains required.

Classify new state explicitly:

| State                                                                 | Treatment                                                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Spatial bins, reverse adjacency, ready queues                         | Rebuildable indexes if reconstruction preserves behavior                                   |
| Active perception/threshold episode and pending simulation deadline   | Save or deterministically reconstruct; cannot be discarded if it changes the next reaction |
| Accepted occurrence, permitted acquisition, consumed/attempted cursor | Existing durable authority and retention rules                                             |
| In-flight provider operation                                          | Existing non-rewindable attempt/accounting; never recreate by replaying a wakeup           |
| Runtime listener handles/timers                                       | Recreate, never serialize                                                                  |

Restore must invalidate indexes and pending callbacks using the actual authority generation, not just world ID. Keep the restore generation distinct from time-rotating command retry epochs where their purposes differ.

Rebuilding current visibility must not fabricate a new encounter for every already-visible source, lose pending native reminders, reveal the abandoned future, or dispatch paid work. New-world initialization and restored-world rebaselining are different operations. Current forgetting, revocation, and spending protections survive gameplay rewind.

Private event existence, payload, queue length, and revision activity must not leak through general public counters, diagnostics endpoints, or shared story updates. Authorized god inspection stays a separate capability.

## 12. Decision gates and non-goals

Proceed first with the behavior-preserving scan fixes and explicit scope contract. Add the proposed private internal/acquisition semantics with dedicated acceptance tests. Qualify the resulting small-world system before adding population infrastructure.

Do not change the engine, adopt a new ECS, add per-object queues, persist every property write, or use a global topic to which every actor subscribes. Do not suppress native offscreen simulation or make perception depend on a renderer-only camera. Do not add arbitrary user-authored subscription code.

Advanced index maintenance, reverse observer dependencies, deadline heaps, workers, coarse regional simulation, and analytic needs advancement require named measured gates under the existing performance and scale owners.

Product choices that may need explicit approval are narrowly scoped: production reminder cadence, which cue types can force context inclusion, habituation/re-entry behavior, and any future permission to narrate private internal states. These do not block scoped routing, profiling, or behavior-preserving spatial improvements. Default to current policies and private disclosure until accepted otherwise.
