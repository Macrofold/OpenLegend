# Events, perception, and reactions

Apply [precise history and general causes](engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause) to event facts, actor evidence and every downstream historical projection. Exact world facts never grant observer knowledge; compact wording never replaces the precise retained source.

## Spatial dependency

[Spatial world](spatial-world.md) supplies coordinates, physical geometry and queries; the sensory owner still assigns modality/detail/exposure. Position/support and geometry revisions feed the existing candidate/exposure intake. Event-time origin is immutable historical evidence; newer geometry cannot upgrade it. Apply [complete facts before recording](engine-and-world-boundaries.md#preserve-precise-history-and-solve-the-general-cause) before the event owner clones or distributes that occurrence: its position can differ from the attributed person’s position. The 3D integration adds no parallel event bus and no paid call per altitude or camera frame. See [SW08](maintainers/spatial-world.md); private thoughts and technical readiness remain distinct from external occurrences.

**Status: partially implemented; broader qualification and proposed stages remain open.** On 2026-09-28 Mike approved implementing this contract for EPR00, EPR01, EPR03, the remaining EPR04 writer/sleep/initial-opportunity work, EPR05 (except the durable-evidence hold) and EPR06, as planned in [perception-reaction intake](projects/completed/perception-reaction-intake.md). The October 14 foundation implementation additionally delivers the EPR05 durable-evidence hold and stored non-speech observer facts, with focused native and PostgreSQL evidence; the EPR tracker separates those delivered subsets from broader qualification. Approved parts that have not shipped remain targets. Installing this document does not accept the remaining proposals, authorize paid execution, or claim implementation. The [research and audit](../archive/02-research/engine-perception-and-event-architectures.md) explains the evidence. The [EPR tracker](maintainers/events-perception-and-reactions.md) defines the work.

## 1. Purpose and ownership

World modules supply registered state/sense policies through the [shared runtime contract](../archive/07-technical-architecture/world-module-runtime.md). EPR remains the sole owner of stimulus scope, perception episodes, threshold event delivery, reaction intake and cursors. Module extensibility adds no second event log, per-object queue, or permission channel.

Give external stimuli, private internal changes, perception changes, and relevant deadlines one coherent path into actor reactions. Share contracts and infrastructure without forcing every engine operation through the same bus.

This document owns **stimulus scope, perception-change identity, and reaction intake**. It does not replace these existing owners:

| Existing owner                                                                     | Responsibility retained                                                                                               |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Sensory design](../archive/07-technical-architecture/perception-and-attention.md) | Geometry, hearing, recognition/detail, physical sensory exposure and authorized camera presentation, sensory overlays |
| [Memory architecture](memory-architecture.md)                                      | Recall, Jev attention, reasoning levels, reflection, forgetting, mental privacy                                       |
| [Performance](performance.md)                                                      | Runtime cadence, work budgets, optional I/O, profiling, scale gates                                                   |
| [Narration](narration-and-conversations.md)                                        | Conversation lifecycle, story selection, private prose and transcript behavior                                        |
| [Production data](../archive/07-technical-architecture/production-data-model.md)   | Record/transaction authority, queries and storage conventions                                                         |
| [Save/load](save-and-load.md)                                                      | Consistent capture, restoration, generation fencing and active-development compatibility                              |
| [Declarations](../archive/07-technical-architecture/declarations-and-evolution.md) | Admission of new mechanics and trusted configurable behavior                                                          |

[Agent agency](agent-agency.md) owns operational goals, plan execution and decision composition. Agency goal-review/action-result/invention-result causes use this document’s single reaction intake; they do not introduce a second event pipeline. Private invention feedback uses owner-private scope, while unprojected execution receipts remain system-only.

Keep the current single-world authority, bounded elapsed-time native integration, actor model, conversation/Narrator implementation, durable records, and bounded AI executors. This is not an engine replacement.

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

Route external and private acquisition through the existing native perception/event intake. Memory-capable observations use the central semantic experience mutation boundary; physical reception and native protection do not require autobiography. Retain source attribution only when permitted, detail, time and acquisition type. Do not claim recognition merely because the server knows an entity's name.

### Event-time evidence versus current action authority

A listener retains legitimate evidence of a shout heard earlier even if the speaker has moved away. Historical audience is evaluated at occurrence time. A later action still checks current range, life state, permissions, and resources. Do not replace either check with the other.

### Selected stealth-awareness integration

The [attention subscription contract](projects/attention-and-investigation-tech-design.md#4-monitoring-and-search-continuation) consumes acquired facts through this owner and existing ActorWork. It distinguishes continued physical work, a source-linked decision opportunity and required evidence; [ATI04](maintainers/attention-and-investigation.md#ati04--intake-initiative-and-meaningful-opportunities) adds no perception history or scheduler.

**Accepted target, reconciled 2026-10-24; runtime implementation remains separate.** The [shared contracts](projects/stealth-awareness-tech-design.md#shared-contracts) extend this owner for independent detection, localization, source association, recognition and detail. [SA](maintainers/stealth-awareness.md) coordinates the specialist work with EPR/SPK/CTR; their existing implementation and qualification gates remain open as recorded. The current speech receiver and awareness paths still use memory eligibility, while the native animal controller already has a separate permitted attack/contact intake. The selected extension shares physical evaluation and observer evidence meaning without requiring a human-style memory record for native reception or routing it through paid cognition.

Preserve source occurrence time/order separately from actual observer acquisition. In the inspected event producer, `WorldEvent.order` is assigned before native callbacks, while some non-speech `Awareness.sequence` values are assigned after nested callbacks allocate IDs. Copy source order explicitly; neither that mutable sequence nor a timestamp proves that evidence was already acquired. At a [combat evidence cut](projects/stealth-awareness-tech-design.md#threat-preparedness-and-surprise), the observer/encounter owner supplies immutable already-acquired support and the captured warning/preparation values. An inclusive source-order watermark is provenance, not a later history query that can add earlier sources acquired after the cut. The incoming contact's own evidence and new startle follow its defensive resolution.

Continuous exposure can retain its existing episode, evaluated interval and physical dependencies without inventing an event for every sample. Discrete occurrences keep their original event identity; native continuation can retain the minimum permitted support its controller needs. Required acquisition and native effects complete at their native boundary before optional attention. Incomplete required preparation follows the existing hold/backpressure owner and cannot mean no cue, no warning or extra surprise. [Time and lifecycle](projects/stealth-awareness-tech-design.md#time-and-lifecycle) govern saved progress, original deadlines and restoration.

The [observer-specific perception design](projects/perspective-perception-tech-design.md) supplies the concrete evidence, association and retention contracts for this extension; [PP01–PP07](maintainers/perspective-perception.md) owns its delivery through the existing EPR owners. Physical receiver evaluation, the observer's detected facts, source hypotheses, individual recognition and autobiographical retention remain separate results. An unclassified sound requires no entity binding. Related weak cues can contribute once through their permitted continuity, while equivalent publication or recall cannot add exposure. Current physical support ends at provider-defined loss even when a repeat-recording policy suppresses another departure row; episode grace never grants hidden updates.

Expose the committed permitted result to native consumers and the acquired-evidence cut before optional cognition notification. Detection is neither a Jev classification request nor an action choice: a reasoning person may continue working, an animal may use its installed controller, and a player receives only authorized evidence. The same typed result supplies each route without requiring equal memory, language or reasoning capabilities. Missed transient evidence is not reconstructed from later world state; unfinished required evaluation remains explicit incomplete work.

The physical providers own sensing boundaries. B’s [bounded temporal law](projects/vision-and-gaze-tech-design.md#9-actual-trajectories-and-bounded-temporal-sensing) uses canonical 50 ms normal-time samples for active affected scopes, with its distinct one-second daylight field; C owns actual impulses and held acoustic intervals. Preserve each value’s original measurement interval and actual `valueAcquiredAt` separately from provider-held availability. Holding coverage can advance A’s eligible weak-cue integral once and schedule its solved threshold, but never refresh a measured coordinate or create another learning sample. Redraw, publication, polling and combat capture do not request a new physical evaluation. Exact native contact/impulse order remains authoritative. F captures settled receipts before its cut and cannot sample on demand to discover an attack.

Use A’s [family-specific source adapters](projects/perspective-perception-tech-design.md#exact-shared-source-revisions), including exact personal-source string digests and explicit native contribution/confirmation roles. A shared ID or numeric coercion cannot substitute another source kind/version. A’s received-axis/motion details retain measured support; private action targets and velocity never enter their observer projection. The [ordinary spoken-warning adapter](projects/perspective-perception-tech-design.md#native-ordinary-warning-testimony) uses complete understood speech and a source-complete prepared Known-place index. Required source preparation finishes through existing bounded activation/dirty work before dependent mutation, without history SQL in hearing or a cut; incomplete is not unknown. These are selected integrations, not delivered-runtime claims or another event store.

### Recorded non-speech facts

Each non-speech awareness record retains its event-time permitted payload with its text, participant identities and event type. The authoritative event keeps the complete physical outcome. Seeing the acting person alone does not disclose a hidden target, material, quantity or successful outcome: that witness retains an `activity-observed` account. Visibility of every participant referenced by structured narration, plus the selected world's physical-reference fields, is required for detailed wording. Complete accounts retain those explicitly named participants as subject references, distinguishing the actor and target from other participants. Thus a personally seen shooter can remain in a projectile-contact memory without treating the struck body as the shooter. Partial accounts never recover these references from raw narration. External attachments use their visible root; closed containment never exposes contents. Owner/private records retain their producer's deliberate knowledge grants.

The selected bundled policy owns partial wording and the public fields of each event family in `worlds/base/event-disclosure.ts`. Unknown execution fields are not public observations. It keeps exact injury/health changes with the injured person, preserves the projectile-contact producer's attribution to the visible struck body without revealing a distant shooter, and keeps exact offered item terms with the parties. A new event family must declare its public facts there; this is an explicit composition seam, not a runtime plugin loader. Construction outcomes omit internal material-identity lists from witnesses; the final dismantling observation is captured before the empty structure loses its physical placement, within the same atomic transition. Creator additions directly to carried inventory are private to its owner; ground additions retain ordinary visibility. Shared speech evidence retains its separate intelligibility and attribution contract.

The selected disclosure policy can grant a directly contacted person a felt
account independently of visual witnesses. In the bundled world, actual melee or
projectile contact retains the recipient's bodily result even without sight of
the performer. That grant does not identify an unseen source or its weapon,
execution identity or position. The ordinary event-time recording owner retains
the partial source-free account; recognition consumes that admitted source.

Resident history, PostgreSQL perspectives, public event pages and cognition consume this same stored account. They cannot fill missing details from raw event data or later visibility. Generic edits to exact event prose do not upgrade a partial account. The current development format requires the stored payload; there is no legacy fallback. Current-world admission validates resident awareness, and complete checkpoint admission validates its loaded awareness, history perspectives and queued story sources before installation. This uses already loaded records, without a second SQL history scan. Cold rows written by the current recording owner retain these facts; reading cold evidence never reconstructs a missing payload from the raw occurrence. No new event stream, storage query or scheduler is introduced. Recording adds bounded per-witness participant checks; owner/private recording skips spatial checks and later projection no longer filters raw payloads repeatedly.

When an owner edits exact event prose, permitted personal accounts use the accepted replacement text; the previous structured narration cannot override that edit. Partial witness accounts remain unchanged. The [follow-up review](verification/foundation-hardening.md#requested-follow-up-review) exercises both after actual PostgreSQL residency compaction.

## 5. Perception relationships and shared source work

Model perception as a directed relation `(observer, source, sense)`. Only instantiate bookkeeping for relevant sources; decorative blades of grass do not each need actor-visible entities.

The relation distinguishes:

- current permitted exposure and detail;
- last observed source revision/facts;
- an encounter or stimulus episode identity;
- any linger/hysteresis state;
- current relevance and next configured review time, where needed.

This is logical structure, not a requirement for a database row per visible pair. Use existing state and compact in-memory indexes; persist the small subset that affects continuation behavior.

**Selected redesign target, not implemented:** the [runtime design](projects/attention-and-scenes-runtime-design.md) replaces repeated personal facet receipts with shared received values and compact observer delta frames/access intervals. The [world profile](worlds/base/attention.md#selected-acquisition-cadence) selects separate broad, detailed and contextual sensing opportunities for dirty physical scopes. Actual action/contact/effect chronology retains its native owner. A reliable detailed sequence means the admitted sampled sequence, not every point of a continuous physical trajectory. Starting attention grants a current baseline and subsequent supported changes, never an earlier route merely because shared source history exists.

### Shared source descriptors

Cache immutable or revisioned source descriptors: physical presentation, supported sound/light profile, and safe description variants. Key by definition/state version, sense/detail tier and applicable disclosure policy. Recognition, actor goals, personal memories, and subjective appraisal remain receiver-local.

In the selected redesign, share physical terrain/feature geometry through the existing map/support owner rather than a personal ground-patch factory. Bounded native queries around self, chosen work and changed attended anchors acquire actual context before producing a relation cue or cognition cut. Keep static context independently of detailed-body slots; do not enumerate all ground. Source variants preserve actual visible extent, clipping, precision and modality. Shared geometry or an authored landmark name grants neither unseen detail nor a learned label. Record personal view/support intervals, and derive historical context from the received variant available then, never the later map. An incomplete query establishes neither absence nor safety.

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

The redesign closes the affected support/attention interval instead of copying every last facet into a separate loss record. Preserve independent detail times, actual unobserved gaps and body/correspondence breaks. An original reference identifies the acquired fact; later confirmation identifies actual continuing support. Neither is a reason to repeat whole source/observer envelopes. Native correspondence means the same encountered body, not canonical recognition: a new unknown body cannot inherit historical identity, notes or goals through a private routing ID.

## 6. Spatial work and invalidation

### Initial implementation: reuse correct candidate indexes

Preserve and qualify the implemented phase-local scalar spatial candidate pass for object encounters and unchanged visibility-array identity. Initial visual acquisition has only the observer as its private recipient, so it needs no external audience resolver. Each record still commits through the existing mutation owner. Complete general external-event candidate reuse, exact event-time validity, exposure deltas and differential acceptance; external audiences cannot be reused across movement, life/sleep or sense changes. Do not recreate the old full-scan-to-grid rewrite or treat these delivered subsets as complete EPR02/EPR03 delivery.

Optimize external-event audiences with listener candidates appropriate to the event's sense and maximum reach. An owner-private internal event must bypass spatial audience discovery entirely.

Do not call the current `nearbyEntities` helper repeatedly on a mutable draft and assume it caches: the inspected implementation rebuilds in that case. Give a query phase a validated candidate index, or use a revision-aware context whose validity is explicit.

An event emitted after a move needs event-time positions. An end-of-step index cannot retrospectively determine all earlier audiences. If the implementation cannot prove index validity at a mutation boundary, rebuild there or retain the safe fallback. Correctness is preferable to an incorrect cache.

### Separate spatial invalidation from general entity changes

Ultimately, movement, spawn/remove, footprint/sense changes, and relevant obstacles should invalidate spatial work; an unrelated fullness decrement should not rebuild all spatial membership.

Phase-local reuse and counters established the measured source-preparation cost. NP02 now maintains source indexes from complete warm phase changes, selecting observers near old/new positions while retaining conservative cold/unknown/overflow/policy rebuilds ([evidence](verification/perception-reaction-intake.md#np02-sensory-preparation--october-3-2026)). Finer reverse dependencies and target-only recomputation remain separately measured work, not implied delivery. Store stable IDs and valid spatial facts, not escaped Immer draft references. Cache invalidation must cover both old and new regions of a move or removal.

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

**Do not collapse existing thresholds to one number.** Condition descriptions, cognitive reconsideration, background-thinking eligibility, sleep activation and recovery serve different purposes. Their current values and meanings come from the installed world policies. The earlier native eating/food-seeking controller was explicitly removed by the approved [embodied-survival design](projects/embodied-survival-tech-design.md); historical research values must not recreate it. The user's “health below 20%” example illustrates the mechanism; it is not a mandate to replace current health/survival rules.

The proposed episode lifecycle is `inactive → active → escalated/continued → recovered`. Latch state prevents duplicate crossings. Separate recovery margins can provide hysteresis where approved. If a quantity crosses and recovers within a batch, meaningful intermediate events cannot disappear through final-value coalescing.

Bodily consequences, configured sleep and admitted actions remain deterministic and independent of providers. In the bundled world, deciding to eat, gather or hunt is cognitive; unavailable or declining cognition can leave a person unfed even while carrying food. Installed reservoir response and native animal policies remain separate replaceable consumers. Their reuse/skipping requires coverage of their actual inputs and deadlines, not a universal hunger-to-action evaluator or a second survival controller.

Threshold recording supplies private bodily evidence under the current [agency survival policy](agent-agency.md#8-attention-and-initiation), including initial hunger without an existing goal. It does not select food, change a threshold, duplicate a native effect or treat merely deferred evidence as handled. [World-configured survival](worlds/base/survival.md) owns the current default rules; the mechanism does not require every world to have hunger or sleep.

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

Keep current event importance compatible; new dimensions need not all become numeric scores or stored fields. The implemented base-world default now omits stored ordinary animal/object sighting onsets and records person sightings without automatically requesting reasoning; [memory architecture](memory-architecture.md#encounters-sensory-detail-and-reminder-continuity) owns that September 27 decision and its lost-history tradeoff. Its base-world policy supplies importance, urgency and eligibility to request reasoning independently; the generic event recorder must not derive either of the latter from a numerical importance threshold. This small policy does not complete the richer dimensions or reminders below.

An ongoing high-salience stimulus uses three mechanisms: an onset opportunity, bounded inclusion in later current context while valid, and an optional due review. Escalation or meaningful changes can produce additional opportunities. This does not create one paid thought per simulation tick.

Mandatory native hazards cannot be removed by optional attention filtering. Many simultaneous persistent cues require bounded grouping and explicit overflow handling; no field can promise unlimited mandatory prompt size. Narrative descriptions remain separate from physical effects such as blindness or burning, which require supported native mechanics.

For production behavior, preserve urgency policy and explicit urgent single-refresh semantics. Autonomous cognition has no actor cooldown; background maintenance timing remains separate. Implement configurable reminder contracts but do not invent a mandatory paid hourly-thought policy. Use an explicit test policy to exercise reminders; unresolved cadence or attention-forcing preferences remain in the decision register. A reminder may decide to continue a valid native plan without invoking a model.

## 9. Reaction intake and scheduling

### One intake, several executors

Adapt direct speech, newly committed external awareness, internal crossings, perception changes, due reminders, goal reviews and actor-permitted action/invention results to one actor-local intake. The intake carries actor identity, generation, relevant evidence/episode, reason class, urgency, due time, and current disposition.

Direct player speech retains explicit interactive priority. It must not also enqueue duplicate autonomous work for the same actor/response identity. Existing Jev escalation, response admission, optional reflection and native actions remain the executors; the agency contract extends response composition and native continuation.

A reaction opportunity can be handled natively, coalesced, delayed, explicitly declined, or routed to reasoning. It is not a model request until durable admission and spending checks succeed.

The [shared agency deliberation contract](../archive/07-technical-architecture/agent-agency-runtime.md#25-shared-deliberation-and-prepared-choices) consumes this intake for task, social, threat and other compatible choices. It owns the selected strategy and decision lifetime, not another queue or source envelope. Exact internally produced results already consumed within a decision cannot immediately restart it; later independent evidence and native outcomes retain this owner's normal eligibility and cursors.

### Selected attention-admission target

**Supported native baseline; redesign selected and not implemented; integrated qualification remains open in PS04-A.** The [attention design](projects/attention-and-scenes-tech-design.md#5-perception-attention-interpretation-and-memory) separates native inspection of a changed situation from paying to interpret it. Inspect ordinary movement, appearance/loss, familiarity reinforcement and current-source revisions cheaply. These changes update permitted sampled surroundings and native attention; only attended or independently required evidence enters recent history, with no extra background sampler. They do not independently grant a model turn. The current director excludes routine profile/familiarity updates from generic changed-knowledge/state paid admission. Actual note/name edits, new knowledge, contradictions and consequential results retain their distinct permitted causes.

At the existing intake, first test whether already chosen native work adequately handles the cause. Continuing an admitted plan requires its actual current preconditions and parameters; knowing a method alone does not authorize selecting it. Otherwise a supported reason for a new choice or interpretation can offer one coalesced ordinary turn: directed received speech, a consequential unresolved result, a blocked plan, a meaningful condition crossing or an eligible finite discovery opportunity. Existing urgency, actor eligibility, durable input, spending and provider admission remain separate checks. An exhausted budget is not evidence that the character understood or chose silence.

The current native relation-cue baseline uses dirty attended subjects. The selected target also admits self and actual current-work/required-cause targets through existing finite work admission, deduplicated under the same actor-wide allowance. Stationary anchors become dirty when their received neighbors move. Broad-region geometry remains available independently but does not automatically make every person a cue anchor or grant a new model call. Use only compatible-time received positions, bodies and physical boundaries. Reuse attention/episode continuation for a latch per local anchor and predicate family, coalescing witnesses rather than adding a queue for each neighbor. The [world profile](worlds/base/attention.md#native-relation-cues) owns predicates, thresholds, uncertainty margins, native cadence and shared work allowance. Neither predicate recognizes an enemy, family member, intention or certain danger. Evaluate at existing receipt/commit boundaries, sharing work fairly across dirty anchors. A positive witnessed false-to-true transition offers one cause. Incomplete evaluation cannot establish a negative or rearm it; clearing requires supported recovery for the world's hysteresis interval. Contact loss or an unavailable boundary retires current support without silently resetting the latch. A new severe qualitative condition uses its actual distinct cause under existing urgency policy. Detail rotation preserves a still-current exposure's latch. Rearming permits native inspection; a valid prior quiet/active continuation can handle the same family without buying thought. Keep bounded entry/newest proof and resolution state under the [technical contract](projects/attention-and-scenes-tech-design.md#55-semantic-noticing-through-existing-cognition). No recurring paid poll, automatic rescue or new physical protection follows.

Finite quiet discovery uses the existing agency owner's genuine free interval. Open one allowance at initial settled creation or when the actor becomes awake/free through a genuinely new saved agency-purpose/free-interval transition, with no current chosen continuation or independently pending decision. Model-job completion or an instantaneous utterance/reply does not open an interval; the same conversational purpose keeps its existing allowance without adding membership. Keep the same interval across component steps of one purpose, choosing no action, ordinary exposure churn and UI/reconnect/restore. Reserve the allowance at admission, spend it on actual provider dispatch, and release a pre-dispatch capacity/preparation refusal; dispatched failure remains spent/dormant. One dispatched discovery turn can consider a bounded batch of eligible current descriptions; subsequent native discovery may rotate without another paid call. A later independently justified turn can include remaining material. An unchanged failed/uncertain cause stays dormant, not considered; neither a timer nor renaming the opportunity renews its attempt. This permits misses rather than promising a paid turn for every object or full coverage of a quiet scene.

The few-real-second objective applies **after a justified thinking opportunity exists**. It is neither a recurring dispatch period nor a movement threshold. Capture exact cause/revision and the discovery allowance in existing continuation/schedule state; acknowledge only the supplied evidence cut, leaving newer causes pending. Restore preserves spent allowances and dormant attempts without generating work. Directly controlled people and minds without a semantic controller keep native evidence/attention without compulsory model calls. Chosen investigation, gaze and physical watch/follow actions remain [ATI](maintainers/attention-and-investigation.md) work; these native cues do not close that project or full PP07/SAI-A acceptance.

### Extend ActorWork instead of replacing the scheduler

Feed actor IDs and reason-specific revisions from accepted changes into `ActorWork.wake` or an equivalent typed update. Replace broad `telemetryRevision` dependence and full per-poll input reconstruction with explicit invalidations where coverage is proven.

Consume newly relevant awareness through existing durable identities/cursors, not a full reconstruction of retained actor experience on each scheduler pass. Retained recall remains available when building actual context; trigger selection should not become an unnecessary recall query.

Keep a small ready set and due-time checks initially. A heap or timing wheel is justified only when scanning eligible tickets is a measured bottleneck. Simulation-time deadlines and wall-time cooldown/provider deadlines must remain distinct. Speed changes and pause/restore cannot silently convert one to the other.

### Progressive speech readiness — accepted target

The [shared NPC streaming feature specification](projects/npc-speech-streaming-feature-spec.md) and [technical design](projects/npc-speech-streaming-tech-design.md) select one growing authoritative speech occurrence with fixed first-publication hearing. [NST](maintainers/npc-speech-streaming.md) owns pending implementation and qualification; [streaming limits](limits/npc-speech-streaming.md) records its bounds. The existing EPR implementation evidence above does not establish this integration.

First acceptance fixes occurrence identity, original time/order, complete listener accounts and permitted physical recognition/addressing. Later approved text amends those same accounts after durable commitment. It does not create another event, acquisition episode, per-part geometry check or reaction opportunity. Human captions and Events can observe accepted open text. Every semantic consumer, including context opportunistically prepared for another event, excludes it until closure.

The already-complete permitted acoustic cue reaches its installed native response owner once in that first domain transition, with the ordinary recording, pattern and consequence changes committed together. This direct typed input contains no open quotation. Append, terminal closure and recovery do not replay intake or renew absolute sensory expiry. Later listener body/sense changes do not recalculate historical hearing; actual account/source suppression and current terminal effect eligibility retain their owners under the [NST listener contract](projects/npc-speech-streaming-tech-design.md#observer-account).

Native closure as complete or interrupted allocates `semanticReadyOrder` once from the existing saved native order domain. A shared eligibility helper returns no eligible order for open speech, its retained terminal readiness order for every current-format closed speech occurrence, including atomic speech, and the ordinary order for other evidence. Retained sound-only speech accounts also carry this metadata; their capability and retention rules still exclude linguistic evidence and model memory. The fixed native acoustic intake does not use this semantic selector. Existing actor considered cursors, response refresh, `ActorWork` and downstream source consumers use that eligibility consistently; scanning only original event/awareness order can miss an older utterance closed after a newer event was considered. History remains in original occurrence order. Closure supplies one ordinary opportunity for the retained prefix, preserving the interruption qualification and the actor's choice whether to respond.

Required terminal word-derived changes use exact event-bound observer evidence inside the existing ordered transition; optional paid work waits for its durable mark. Neither append notifications nor unchanged/hidden listener projections create paid work or expose source revisions. Crash recovery uses saved lifecycle/readiness and existing cursor ownership, with no speech broker, new scheduler or independent order clock. Current generation/actor/request cancellation may end pending output while retaining accepted speech; movement and doors add no new physical interruption behavior.

### Correct coalescing and overload

Coalesce cognition wakeups while preserving distinct accepted speech, effects and evidence in their authoritative stores. The cognition wakeup watermark covers the current opportunity snapshot, including native or unavailable dispositions; it is not evidence of semantic handling. Retained history never becomes a backlog of owed cognition calls. The [memory context contract](memory-architecture.md#4-jev-attention-before-context-inclusion) supplies fresh hard-query and semantic context for each opportunity.

Bound pending actor/episode metadata and work per turn using the performance policy. Keep required evidence in its existing authoritative store and retain authoritative evidence when optional work queues fill. Do not materialize an unbounded per-event promise chain. Never drop an authoritative occurrence or let a full queue disable native protection. If required retention cannot progress, use the existing explicit backpressure behavior rather than silent loss.

Priority should preserve interactive and urgent work while aging deferred actors sufficiently to avoid starvation. This design does not increase global model concurrency or per-actor spending automatically.

## 10. Transactions, subscriptions, and secondary consumers

Use a small typed routing table for named consumers, not arbitrary callbacks attached to every object. Initially the relevant consumers are actor reaction intake, reflection scheduling, and the existing story selector. The UI receives its existing authorized projections.

Required native consequences—including awareness insertion, commitment changes, and dependent invalidation—remain within the ordered domain/repository transition. Do not move them into optional after-commit callbacks. Consumers that request later physical work must return through ordinary command/effect admission, with bounded causal depth and no reentrant event cascade.

After-commit wakeups carry bounded IDs/revisions, not entire private records. Required history and durable job intent must commit before optional paid processing observes them. Routine progression may retain its current bounded durability interval; hold affected paid wakeups until the required evidence is committed rather than forcing a new write for every footstep.

**Selected asynchronous boundary:** bounded native source/context acquisition and required evidence finish before publication; expensive optional expansion, history reads, formatting and interpretation use existing task lanes afterward. There is no mandatory new CPU worker, per-actor queue or sensing/model call on every world step. Captured jobs contain finite selected values, geometry fragments and exact dependencies, not a whole-world snapshot or closure over one. A later result preserves measurement time separately from when the actor can use it; old output becomes current only under its still-valid source, geometry, observer-life and permission dependencies. Corrections, forgetting, expiry and restore invalidate pending access. Preserve distinct admitted samples; coalesce only replaceable optional snapshots and reaction wakeups. Cancellation releases captured inputs through their existing owner without pretending unresolved execution has stopped. No prediction engine or retroactive perception fills a processing gap.

A crash between commit and notification is recoverable from existing durable work/cursors. Do not add a generic broker or second authoritative event log merely to make local notification durable. Existing Narrator job rows remain its durable queue.

Preserve strict consumer boundaries:

- Internal events do not become public Narrator candidates by default.
- Cognition importance does not override story selection.
- Diagnostics do not become actor stimuli or evidence.
- Private reflection presentation is not automatically recallable intentional thought.
- Unknown/generated metadata cannot register executable subscribers or change privacy/spending rules.

Shared event identity can later support achievements, tool availability, and other consumers. Add one named consumer when a real feature needs it; do not build a generic plugin framework in EPR. The shared EWF foundation has its separate scope; neither permits arbitrary callbacks, a broker or a universal bus.

## 11. Save/load, reset, and privacy

Follow the [save/load contract](save-and-load.md) and [development save policy](../AGENTS.md#development-save-policy).

Classify new state explicitly:

| State                                                                                   | Treatment                                                                                                                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spatial bins, reverse adjacency, ready queues                                           | Rebuildable indexes if reconstruction preserves behavior                                                                                           |
| Active perception/threshold episode and pending simulation deadline                     | Save or deterministically reconstruct; cannot be discarded if it changes the next reaction                                                         |
| Accepted occurrence, permitted acquisition, consumed/attempted cursor                   | Existing durable authority and retention rules                                                                                                     |
| NST open speech body, frozen observer account, mask continuation and terminal readiness | Accepted target: save through the same occurrence/evidence owner; restore closes an open prefix once, with no new occurrence or provider execution |
| In-flight provider operation                                                            | Existing non-rewindable attempt/accounting; never recreate by replaying a wakeup                                                                   |
| Runtime listener handles/timers                                                         | Recreate, never serialize                                                                                                                          |

Restore must invalidate indexes and pending callbacks using the actual authority generation, not just world ID. Keep the restore generation distinct from time-rotating command retry epochs where their purposes differ.

Rebuilding current visibility must not fabricate a new encounter for every already-visible source, lose pending native reminders, reveal the abandoned future, or dispatch paid work. New-world initialization and restored-world rebaselining are different operations. Current forgetting, revocation, and spending protections survive gameplay rewind.

Private event existence, payload, queue length, and revision activity must not leak through general public counters, diagnostics endpoints, or shared story updates. Authorized god inspection stays a separate capability.

## 12. Decision gates and non-goals

The initial scope/private-evidence intake and subsequent NP02 source-index slice are delivered to the extent recorded by the [EPR tracker](maintainers/events-perception-and-reactions.md). Complete the remaining named generalization, durability and differential/scale gates rather than repeating those implementations. Select checks under the repository verification policy; no blanket new test suite or broader acceptance follows from this architecture document.

Do not change the engine, adopt a new ECS, add per-object queues, persist every property write, or use a global topic to which every actor subscribes. Do not suppress native offscreen simulation or make perception depend on a renderer-only camera. Do not add arbitrary user-authored subscription code.

Advanced index maintenance, reverse observer dependencies, deadline heaps, workers, coarse regional simulation, and analytic needs advancement require named measured gates under the existing performance and scale owners.

Product choices that may need explicit approval are narrowly scoped: production reminder cadence, which cue types can force context inclusion, habituation/re-entry behavior, and any future permission to narrate private internal states. These do not block scoped routing, profiling, or behavior-preserving spatial improvements. Default to current policies and private disclosure until accepted otherwise.

## Product-scalability attention target

The [attention and scene direction](product-scalability/attention-and-scenes.md) retains observer-permitted broad context and stable detail before expensive individual cognition. The [selected redesign](projects/attention-and-scenes-runtime-design.md) changes sampled capture, shared history and physical-feature context through this same intake; it is not implemented. [PS04-A](maintainers/product-scalability.md#ps04-a--core-attention-and-recording) distinguishes the supported baseline from redesign work and remaining integrated qualification. Exact attended exchanges and compact expressive background contributions retain their separate [PS04](maintainers/product-scalability.md) stages and independent recipient interpretation. Broader aggregate crowds, vocal activity and timed speech retain their separate choices under [PS-D02](maintainers/decisions/world-and-play.md#product-scalability-integration-choices). None adds a second reaction queue or silently drops evidence acquired under the active policy.

Keep a perceived group distinct from its physical members, their private goals and their independent minds. Grouped commotion can become new evidence without exposing a hidden roster. Individual contact, damage, understood speech and other required sources remain authoritative under the active policy. Corrections, forgetting and changed permissions must invalidate any dependent aggregate text; changing focus cannot grant retrospective awareness. A future explicitly changed perception rule is not a load-shedding shortcut for today's already-acquired evidence.

## Maintained records

- Implementation: [Events and reactions](maintainers/events-perception-and-reactions.md); cross-feature target integration in [PS04](maintainers/product-scalability.md).
- Limits and constraints: [Native work](limits/native-work.md) and [cognition](limits/cognition.md) own their existing shared mechanisms; proposed product choices are in [PS-L02/PS-L06/PS-L07](limits/product-scalability.md).
- Related design: [Memory](memory-architecture.md) and [hearing](hearing-and-speech.md) retain attention/recall and acoustic ownership.
