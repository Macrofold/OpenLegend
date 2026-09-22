# Agent agency runtime contract

**Status:** proposed implementation contract for the [agent agency specification](../../docs/agent-agency.md). This document owns wire-to-domain translation, operational storage, admission, execution and continuation semantics. It does not own mechanical definition validation, memory retention or conversation membership. Implementation tasks and acceptance criteria belong to the [agency tracker](../../docs/maintainers/agent-agency.md), with level-1 action selection owned by [CR02/CR12](../../docs/maintainers/cognition-redesign.md#cr02--semantic-levels-and-immediate-speech).

## 1. Fit the existing authority boundary

Use registered concern/observation/action adapters from the [shared runtime](world-module-runtime.md), not another engine or independent module registry.

Keep one in-process simulation authority. The useful extension is a small operational layer between a model's proposal and the existing native commands, not a replacement engine.

```text
native body state / actor-scoped awareness / awaited result
                         |
                 coalesced opportunity
                         |
       permitted context + existing attention/routing
                         |
                  ActorDecision
                         |
              response admission boundary
           /              |               \
  private mind/goal   external dispatch   invention service
      mutations      and native plan      (INV ownership)
           |              |               |
           |       actual action receipts  scoped resolution
           |              |               |
           +------ derived interests / continuation -------+
```

The domain owns serializable goals, plan execution state, authoritative action transitions and validated receipts. The server owns permitted context, asynchronous interpretation, spending, actor/world bindings, job recovery and publication. The AI package executes typed requests without deciding admission policy. Protocol/client projections expose only authorized views.

Use the existing `WorldService` serialized mutation lane and repository transaction boundaries. No distributed event broker, global actor framework, second world copy, new engine-level scripting language or model call inside a fixed simulation step is required. Extract a module when a responsibility becomes difficult to test, not a new service for every box in the diagram.

## 2. Decision envelope and translation

Registered action families extend `act` bindings, not privileged operation kinds. Unknown kinds still reject unless the host explicitly supports them.

### 2.1 Logical model contract

The following is a logical contract, not a claim that today's provider JSON schema accepts TypeScript unions verbatim. Provider adapters may encode the alternatives as total objects with irrelevant fields set to `null`, as the current structured-output path does. The adapter must preserve the same domain semantics and validate the result before admission.

```ts
type LocalRef = string; // response-local, bounded, unique; not authority

type DecisionOperation = {
  localId: LocalRef;
  requiresAccepted: LocalRef[]; // earlier operations only
} & (
  | { type: 'think'; text: string; about: string[] }
  | { type: 'goal'; change: GoalChange }
  | { type: 'plan'; change: PlanChange }
  | { type: 'speak'; text: string; addressee: string | null }
  | { type: 'act'; attempt: ActionAttempt; mode: 'enqueue' | 'replace' }
  | { type: 'invent'; proposal: InventionIntent }
);

type ActorDecision = { operations: DecisionOperation[] };
```

`GoalChange`, `PlanChange`, `ActionAttempt` and `InventionIntent` are validated alternatives described below. The schema exposes only the fields relevant to the admitted actor and route. All categories can appear repeatedly; the overall operation and byte limits still apply. `{"operations":[]}` is valid.

The application binds actor identity, world identity, load epoch, policy version, decision/attempt ID, permitted references, relevant revisions and spending authority. These fields are not claims the model can manufacture. Short handles can be presented for selecting existing goals, targets, actions or evidence. Resolve exact handles, not display-name guesses. A local alias refers only to an object created in this response and cannot grant access to an arbitrary stored ID.

`requiresAccepted` represents admission dependencies only. It can express “attach this plan to the goal just created.” It cannot mean “the bow has already been crafted” merely because a craft request was accepted. A future success dependency belongs in the plan, not in a prewritten thought asserting future success.

Malformed envelope structure, duplicate local IDs, cyclic/forward dependency references or a byte-limit violation fail before any component is committed. A well-formed component that is not authorized or is currently invalid receives its own rejection; independent components may survive. This retains useful speech when an unrelated physical request fails.

### 2.2 Optionality instructions

Use a short instruction with the semantics below; do not require a justification for an empty response:

> You are this actor, not an assistant completing a checklist. Return only changes or attempts warranted now. Every operation is optional and each kind may occur more than once within the limits. An empty operations list means continue without a new intervention. You may speak, privately think, maintain a goal, arrange a plan, attempt an unlisted action, or propose a method. Do not claim an attempted action has mechanically succeeded. A thought is brief fictional inner speech, not a reasoning transcript. Do not invent goals just because the schema includes them. Preserve useful ongoing work unless you deliberately choose otherwise.

The exact schema/examples must include empty output and single-component responses alongside combined responses. Avoid training every example into the same six-operation pattern. Small typed goal edits do not require the full reflection harness or a rewrite of the actor's identity documents.

Keep the existing cognition route/attention selection unless separately changed. A preliminary action-context gate may omit expensive _suggestions_; it must not remove the open attempt, goal or invention alternatives. Adding another paid Jev decision for each optional category is not part of this design. Later gating is an experiment owned by the research/acceptance process, not a prerequisite.

### 2.3 Bounds

All limits are centralized, versioned, advertised before generation and validated again at admission. Reasonable starting **engineering hypotheses**, not biological measurements or performance claims, are: at most 16 operations per decision, 8 active/paused goals per actor, 8 explicit steps in one proposed plan frontier, 16 queued steps total per actor, one unresolved invention conversation per actor, and two actor clarification continuations per invention episode. Also enforce total bytes, provider tokens, work rounds, elapsed wall time and money independently.

The implementation may choose smaller limits after fixture payload measurement. A limit change must not silently discard accepted active intentions or obligations. Refuse or explicitly consolidate through the relevant mutation boundary. There are no unlimited free-text scratch fields beside the accepted mind.

### 2.4 Level-1 selection without generative escalation

An actor-scoped opportunity may follow **Jev selection → normal response/action admission → native execution**, with no generative LLM. Native routines, urgent protection and valid ongoing plan steps remain level 0 and require no model call. Do not route an adequately handled native situation through Jev merely to describe its action.

Reuse existing action discovery to prepare a bounded, actor-permitted set of fully specified bindings. Each server-owned binding retains the actual command, target/item references, parameters and relevant knowledge, scope and plan dependencies. Jev sees useful permitted descriptions and short request-bound handles; it returns a choice label, not executable commands, authored parameters or an operation list.

When fresh candidates are available, combine route/action selection into one focused Choice question offering a supplied action handle, continue without a new intervention, or escalation to an offered higher semantic level. Candidates must exist before the question that selects them. If preparation depends on an earlier result, a bounded second Jev request may select the resulting candidates without requiring an LLM. Questions batched together must be independent of one another's answers. Action relevance filtering only identifies suggestions worth considering; positive relevance answers never authorize execution or combine into a new multi-step plan.

Escalation remains available when no supplied action fits, including for unlisted attempts and invention proposals. Use levels 2–4 when a warranted reply, thought, goal revision or planning response requires generation; an available physical action must not suppress those needs. Level-5 reflection remains independently admitted and never follows automatically from successful action selection.

Resolve the selected label to its original binding and translate it through the same response/action admission path as other controllers. Initially admit at most one selected action, or one already-supported native routine, per level-1 decision; do not create another executor. Continue translates to no new intervention and leaves ongoing work and goals unchanged. Selection cannot implicitly replace work, waive costs or introduce a goal or thought.

Revalidate at admission and again before queued execution: actor scope and knowledge, lifecycle/capability, actual resources and prerequisites, current plan dependencies, pause/cancellation, world/load epochs and native interruption policy remain authoritative. Apply the shared [receipt contract](#42-receipts-are-not-interchangeable) and [readiness checks](#44-readiness-and-revalidation). Keep decision, offered-binding and child action identities connected for idempotent admission and recovery. A selected label records a proposal; only native receipts establish admission, start and completion. Remember actual occurrences through normal awareness, without fabricating a thought or goal.

Selection thresholds are configurable and require evaluation; model probability is never proof of feasibility. Missing, uncertain, invalid or unoffered answers receive explicit deferred/escalated dispositions, distinct from deliberate continue. Any paid escalation needs the normal spending allowance; if unavailable, record deferral. Provider failure or a stale action cannot launch automatic paid repair/retry loops. Preserve native survival and valid ongoing work where permitted, and report failed/stale admission without claiming an effect.

## 3. Operational state

### 3.1 Goals and plans

Prefer a small typed, serializable actor-owned agency record in domain state, for example `WorldState.agency[actorId]`. This is an implementation location, not a demand for a new database subsystem. Store the minimum data required to resume work and explain its disposition.

```text
ActorAgencyState
  revision
  goals: Goal[]
  plans: Plan[]
  foregroundPlanId?          # actor-selected physical pursuit, not all goals at once
  pendingDispatches: references to admitted bounded work

Goal
  id, revision, objective
  status: active | paused | completed | abandoned
  relativePriority
  parentGoalId?                # same actor, acyclic
  supportingEvidenceRefs[]     # permitted references, not proof of truth
  completionRule?              # finite supported actor-observable predicate
  completionEvidence?          # actor-declared and/or engine-evidenced, labeled
  reviewCue?                   # supported reminder, not arbitrary executable code

Plan
  id, revision, goalId?         # a one-off sequence need not create a goal
  approach                     # short subjective summary
  status: active | blocked | waiting | completed | cancelled
  frontier: Step[]
  currentStepId?
  lastRelevantOutcomeRef?
```

Use application/domain-generated durable IDs after resolving local aliases. Goal updates compare the affected goal revision; plan replacement compares the affected plan revision. A change to one goal does not invalidate unrelated speech or another actor's work. Reject parent cycles and cross-actor editing. An actor may author an unrealistic goal; goal storage is not a physics validator. Its executable steps are still constrained.

Several goals or stored plans do not imply several competing physical executors. The actor selects a foreground plan when arranging physical pursuit; direct one-off requests join its explicitly ordered work queue. At a physical dispatch boundary, native urgency takes its established precedence, otherwise the selected plan's next ready step is considered. A blocked foreground step waits or requests reconsideration; it does not silently switch to another goal based on a prose-derived score. Relative goal priority informs later choice without automatically rewriting the physical queue. Switching focus is an explicit plan operation, and interrupting already-started work still requires the native replacement policy.

`GoalChange` supports create, revise, pause, resume, complete and abandon. The status of a blocked plan is separate from the actor's continued desire to achieve the goal. Engine evidence that a supported completion rule holds can be recorded without pretending the actor changed its subjective interpretation. An actor can deliberately reactivate a completed objective through a new revision.

`PlanChange` replaces a named bounded frontier or cancels future dispatch. It does not patch arbitrary engine state. Preserve actual completed-step receipts outside the mutable prose; replacing a plan cannot rewrite history. Do not make a huge append-only plan transcript another mandatory context section. Terminal goals and plans leave the active working set under an explicit bounded history policy; retain the minimal evidence and durable receipts required by memory, replay and outstanding dependencies. Do not prune an active intention, obligation or unresolved dispatch merely to make a quota look satisfied.

### 3.2 Single ownership and existing fields

Replace the current independently writable operational goal representations at the cutover. During implementation, identify every reader of `actor.goal`, `actor.goals`, initial-goal seeding, goal mind facets, goal context rendering and interest signatures. Keep any necessary UI/native “current objective” as a read-only projection from the active agency record. Do not install permanent dual-write compatibility machinery.

Accepted inner-world prose may mention goals without being an executable mirror. The engine must not silently extract and authorize plans from that prose. Reflection uses the same typed goal/plan mutation boundary when it intends an operational change; it does not write a shadow planner file. Ordinary thought retention remains in the existing memory system. Private goal edits can have compact provenance without automatically duplicating every field as another raw thought memory.

### 3.3 Completion and wait conditions

A completion or wait predicate is a finite typed operation supplied by trusted code. Initial useful predicates concern this actor's actual action outcome, an owned item/quantity, a resolved invention request, or an authorized observation/review time. An unsupported free-text condition stays a reminder for later cognition rather than becoming executable truth.

Do not watch hidden global state for the actor. “When Ada secretly finishes her bow” is not an admissible private subscription unless a supported communication or observation makes that event available. Native execution may use authoritative state to reject a command, but feedback must not reveal hidden identities, locations or reasons unnecessarily.

A wait must have a bounded retention/review disposition. Expiry can produce one coalesced opportunity to reconsider; it is not permission for a retry loop. A goal waiting for an absent person may remain meaningful without repeatedly polling an LLM.

### Future admitted mental effects

[Source-linked imposed influences](world-module-runtime.md#fictional-mental-effects-and-operational-ownership) and self-authored intentions remain distinct under one agency owner. Expiry cannot restore an old goal list or undo completed work. No immediate cross-actor API or human-control permission is authorized; detailed effect delivery remains conditional under INV/EWF10.

## 4. Admission, ordering and physical execution

### 4.1 Two phases, not one giant asynchronous transaction

**Admission phase.** In the serialized mutation lane, validate the envelope and current binding, apply independent immediate private/speech operations in declared order, and persist any accepted queued action, plan or invention intent with component receipts. Publish the result atomically. Do not hold a database transaction open while asking an LLM to resolve a proposal.

**Continuation phase.** Asynchronous interpretation/authoring runs only from a durably admitted request. The result re-enters the same application/domain authority with its original identity and fresh relevant checks. Native plan dispatch happens on actual readiness changes. A request that fails later does not retroactively erase independent speech already committed at admission.

An envelope-level storage failure publishes nothing. A semantic component rejection may coexist with accepted independent components. A dependent component whose required predecessor was rejected receives `dependency_not_accepted`. Every outcome is explicit in the diagnostic projection.

### 4.2 Receipts are not interchangeable

Maintain distinct stages such as:

| Stage                            | Meaning                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| Proposed                         | Untrusted model output was received                                |
| Admitted                         | The specific intention/component passed admission                  |
| Queued / awaiting interpretation | Durable work exists; the requested effect has not happened         |
| Started                          | A native action began and any start-time resource rules applied    |
| Completed / failed / cancelled   | The authoritative action reached a terminal outcome                |
| Blocked / deferred / unavailable | Work cannot proceed for the recorded reason; no success is implied |
| Duplicate                        | The original stored result is being returned, not executed again   |

Retain a stable decision receipt and child identities for component, plan step, invention request and action attempt. Reusing the same identity with the same canonical body returns the original disposition; a different body conflicts. A human-readable label or a short non-security content hash alone is not sufficient proof of identity.

Use the existing durable job/command accounting boundaries for replay beyond the bounded hot response receipt window. Do not assume 300 recent in-world response receipts protect arbitrarily old provider callbacks. A pruned or retired identity must be rejected or reconciled, not mistaken for fresh authority.

Before publication, recheck pause/cancel policy, actor lifecycle, conversation generation, target scope and relevant revisions. Cancellation stops uncommitted work; it cannot unsay speech or undo committed effects. Report empty, fully accepted, partially accepted and wholly rejected decisions distinctly; a wholly rejected nonempty response is a failed job, while an empty response completes cleanly. Accepted starts are not completed actions. Coupled effects, occurrence and required awareness commit atomically.

Accepted speech/action occurrences enter remembered self-awareness exactly once, with observer-specific wording for witnesses. An accepted private thought enters the existing actor-owned raw experience store with `self_thought` acquisition and response/component identity; entityless thoughts retain their trigger binding without inventing a subject. Thoughts may be mistaken but cannot convert rejected work into a completed deed or authoritative fact. Rejected proposals are not remembered as completed actions; actual failed attempts use their committed outcomes. Existing finite retention/consolidation applies. Reflection's god-only presentation history is separate and never duplicates these experiences into recall or automatically edits accepted inner-world text.

The model receives permitted handles only; native target roles and speech audience rules still apply. Unknown handles, contradictory structured targets and oversized fields fail admission. Richer target roles or multiple addressees must use the conversation contract rather than overriding targets through prose.

### 4.3 Do not loop `executeCommand` over multiple timed actions

The current actor has one native `action` slot. Issuing gather, prepare and craft sequentially inside one response would replace running work, not complete a plan. It can also interact incorrectly with start-time resource consumption.

Initial execution therefore retains **one physical work lane per actor**. `enqueue` is the default. A request waits behind the actor's current compatible work and revalidates when it becomes eligible. `replace` requires explicit intent and the current native interruption/cancellation policy; it is never inferred from the mere presence of a new action in the response.

Running work does not suppress eligible need/review opportunities. An admitted foreground change can suspend the old plan and request explicit replacement of its current action; native emergency supersession remains independently authorized. Each trusted action family defines its safe interruption boundary and whether work can pause with retained progress or must cancel. Preserve actual elapsed work, consumed inputs and committed effects; cancellation cannot invent refunds, and unsupported resumability cannot be simulated by prose. Before restarting or resuming, revalidate resources, targets and the suspended plan.

A plan frontier can contain native command steps, supported bounded waits and a request for renewed cognition when the next method is unresolved. Explicit dependencies are on terminal action outcomes, not on queue insertion. A receipt binding may substitute the actual item or admitted technique produced by an earlier step, but only through a trusted, typed result reference—not text interpolation or a forged global ID.

A single direct act request can be represented as a one-step plan without requiring a public goal. Multiple direct act requests in one response enqueue in their declared physical order unless explicitly represented as independent bounded work. An earlier failed physical step blocks later implicitly sequenced steps and produces an opportunity to reconsider; it does not blindly attempt craft after gathering failed.

Speech/private operations need not occupy the physical work lane. Their real capability restrictions still apply. Multiple body-dependent expressions cannot bypass embodiment or inflate mechanical effects. Additional hands/mouth/movement resource arbitration is deferred until a concrete family needs concurrency beyond the current body model.

### 4.4 Readiness and revalidation

Before starting each step, recheck actor lifecycle/controller authority, current goal/plan revision, actual target and scope, prerequisites, quantities, definition version and relevant cancellation state. Resource checks at plan admission are informative, not long-lived reservations of the world. Reserve or consume through existing native rules when their stage requires it.

If two actors intend to take the same last resource, the single authoritative transition determines the winner. The loser gets a real blocked/failure result and may adapt; a model's confidence does not duplicate the resource. Cancellation cannot refund inputs that native work has already consumed.

Use dependency-specific staleness. Mere passage of simulation time or unrelated awareness does not invalidate everything. A target's disappearance or a superseded plan can invalidate its affected action while leaving a valid utterance intact. Separate intent revision from the current broad `planGeneration` uses where those uses conflate a goal edit with replacing physical work.

## 5. Open action resolution

[INV-3](../../docs/maintainers/inventions-and-world-evolution.md) owns family applicability/execution under [runtime §7](world-module-runtime.md#7-action-families-and-agency-integration).

`ActionAttempt` accepts a known offered action handle, a supported expression reference, or a free-form attempt with scoped references and an optional proposed method. The request never contains authoritative effects.

Resolve with the cheapest adequate path:

| Resolution                    | Application behavior                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| Existing native command       | Bind exact authorized parameters, then use native admission/execution                       |
| Existing native sequence      | Produce a bounded plan frontier; each step still revalidates                                |
| Existing supported expression | Use the finite expression contract and its actual impact rules                              |
| Ambiguous target/method       | Return a scoped clarification; do not guess hidden identity                                 |
| Missing supported definition  | Enter the shared INV invention process with actor-origin intent                             |
| Missing information           | Offer permitted inspection/recall or reconsideration when useful, under existing tool gates |
| Unsupported engine capability | Record an honest bounded deferral; do not counterfeit an effect                             |
| Forbidden premise/operation   | Reject under the named world/authority policy                                               |
| Temporarily blocked action    | Record the concrete dependency that can make reconsideration useful                         |

A permanent definition is not required for every new description. Prefer lexical/handle resolution and existing capability-family metadata; use bounded semantic interpretation only for genuinely ambiguous language or composition. The same capability family should supply applicability, legal parameter binding, native execution and player/NPC descriptions as INV-3 develops. Do not build a second catalogue whose commands disagree with the domain.

The interpreter receives actor-permitted evidence and returns untrusted structured proposals. The engine validates them. An LLM's feasibility judgment is not proof of physical possibility, and a valid JSON object is not proof of acceptable mechanics.

Negative results have reason-specific invalidation. A missing-item result can expire when inventory changes. A missing-knowledge result can expire on learning. Unsupported engine behavior ordinarily waits for a relevant capability/profile revision. Rephrasing the same impossible attempt must not continuously consume budget or reroll a validator until it accepts. Do not globally cache a private failed invention as world knowledge available to everyone.

## 6. Interface to actor-led invention

The canonical definition lifecycle remains in [declarations and evolution](declarations-and-evolution.md), with work owned by INV-1, INV-2, INV-4 and INV-7. This section defines only the caller contract and the return into agency.

### 6.1 Request and trust domains

Bind the initiating actor explicitly rather than looking up `controlledEntityId`. The request records actor-origin purpose, proposed method, permitted material/entity references, uncertainty, request/draft revision and optional associated plan/goal. Preserve origin through any delegation: a player using an NPC or an NPC using the creator UI does not obtain a more privileged policy.

Separate three contexts:

1. **Actor proposal context:** accepted mind, relevant intentions, actual awareness, permitted material properties and techniques the actor knows.
2. **Mechanical adjudication context:** the minimal trusted family/profile and authoritative inputs needed to validate/compile the proposal. This may contain facts the actor cannot inspect.
3. **Actor feedback projection:** only the result and explanations this actor is allowed to receive, with technical status distinguished from experienced facts.

Do not use a privileged creator session as the actor's continuing mind. Existing Macrofold creator tabs have different permission/history contracts. Reuse generic execution and application services, not those privileges or private transcripts.

### 6.2 A bounded proposal dialogue

Use the shared invention request's outcomes and actor-method rules in [Actor-authored methods and private invention](declarations-and-evolution.md#actor-authored-methods-and-private-invention). Do not create a second invention lifecycle. A complete proposal can proceed directly; clarification resumes a fresh actor-scoped job under the same request/revision and existing limits. AG stores the association to actor intent and schedules the actor's choice to answer, revise or stop. A planned clarification is distinct from automatically retrying a failed or uncertain paid request.

### 6.3 Definition, knowledge and continuation

Reuse mechanical identities where appropriate without exposing an unknown existing design to the actor. A character may independently propose an equivalent method; deduplicating internal definitions must preserve its discovery provenance and the other inventor's privacy. A similarity score alone neither proves mechanical equivalence nor grants knowledge.

Return an actor-scoped resolution reference with admitted definition/version, learned-technique disposition and authorized explanation where applicable. Definition installation is not an item. No skill or material grant accompanies the return unless an independently authoritative learning or resource rule explicitly caused it.

Publish the result and continuation intent recoverably. A crash between resolution and wakeup must not lose the result or create duplicate paid work. Use an existing durable job transition/outbox-equivalent in the application repository; a new messaging platform is unnecessary.

If the actor previously authorized an unchanged supported next step conditional on this exact method's admission, bind the actual result and revalidate. Otherwise schedule a coalesced decision opportunity. Do not automatically create “Build it,” consume resources or route every success into a new high-effort call.

The current `declaration-admitted` public event path must not be reused unchanged for private conception. Mechanical registry changes, actor knowledge updates, private resolution delivery and any genuinely observable demonstration are separate projections. This distinction also prevents a private invention from creating irrelevant visible-event cognition in every nearby actor.

### 6.4 General-knowledge limits

Apply the [actor invention knowledge policy](../../docs/agent-agency.md#61-the-actor-proposes-a-mechanism): permitted actor context includes its profile, traits and backstory alongside scoped evidence. General model knowledge can supply hypotheses, never fabricated acquisition provenance or hidden registry access. Profile guidance is not an enforceable knowledge boundary or permission to bypass mechanical validation.

## 7. Opportunities, attention and efficient continuation

### 7.1 Private stimuli are not public world events

Use the [EPR actor-local reaction intake](../../docs/events-perception-and-reactions.md#9-reaction-intake-and-scheduling) and its [scope/identity contract](../../docs/events-perception-and-reactions.md#4-scope-and-event-identity). Agency adds goal-review, action-result and invention-result reasons with references to their canonical receipts and relevant goal/plan revisions. It does not define another opportunity envelope, event log or scheduler.

Private needs, goals and invention feedback retain owner-private scope; application control and diagnostic receipts remain system-only unless explicitly projected as actor-permitted feedback. Actual external actions use event-time sensory evidence. Goal relevance cannot reveal hidden state. Non-speech sound uses the sensory owner, without creating fake conversation turns. EPR owns episode/coalescing/cursor mechanics; agency owns whether an accepted plan continues or needs a new decision.

### 7.2 Attention inputs

Bounded module-defined concerns and sense evidence share this context budget; they add no compulsory category-selection call or mental-state extractor.

Preserve the existing required-versus-optional context budget and scope-before-relevance rule. Add a compact active-intention projection, current plan frontier and fresh relevant results. Mandatory evidence already protected by memory/conversation contracts remains protected; do not reduce the current-conversation guarantee incidentally to fit new planner prose.

Optional candidate construction combines perceived surroundings, possessions, known techniques, permitted memories and opportunities suggested by current needs or plan gaps. Compile bounded interests from explicit operational goals and known prerequisites as well as already-selected objects. The current selected-object-derived subscription should not be the only way to discover a needed material that has never entered attention.

Goal/plan changes invalidate the relevant interest signature. Reevaluate currently exposed candidates once under the new interest. Do not scan all world entities or private recipe definitions for conceptual matches. Preserve contrary evidence and a small configurable discovery allowance so goal-focused retrieval does not become an echo chamber. The allowance is a budget allocation, not a random grant of unseen knowledge.

### 7.3 Reconsider only when it can matter

Use native plan continuation for already-resolved steps. A self-authored thought alone is not a generic new semantic trigger. A goal edit can update subscriptions without triggering an immediate second decision. A failed step creates a bounded reconsideration opportunity; repeated unchanged failure does not.

Track delivered, deferred and resolved opportunities separately. A native urgency disposition must not advance the semantic evidence cursor as though a missing solution had been considered and resolved. Explicit empty output can resolve the current opportunity without canceling a plan. Deferred semantic opportunities retain the evidence necessary for later attention under bounded retention rules.

Coalesce compatible causes per actor, preserve a compact list of distinct relevant changes, and carry a cause-chain/episode identity through result delivery. Apply per-actor and global real-time spending/cooldown limits. Hysteresis prevents need-band jitter and repeated enter/exit exposure from producing paid storms. The exact need thresholds/reminders remain in existing policy/D54, not a new competing table here.

Keep the current authorized one-time urgent response supersession distinguishable from a provider-error retry. It must retain its own attempt identity, shared episode accounting and bounded refresh behavior. General failures still do not automatically generate paid repair loops.

### 7.4 Survival and model availability

Keep native survival and physical safety actions timely without waiting on providers. Replace blanket low-fullness exclusion with a disposition based on actual capability and whether an adequate native response is available. A conscious actor with no useful native solution may receive a bounded opportunity to request help, plan or propose a method while native time continues. Immediate emergencies may defer deliberation but should preserve unresolved evidence.

This is controller policy, not a universal physiological theorem. Lack of food does not guarantee the agent survives, and no fallback should conjure resources. Exact body incapacity, sleeping and cognition capability checks remain authoritative. A no-op decision or a deliberate different priority should not be relabeled as a network failure.

### 7.5 Spend and scale

Native body/action updates, plan completion predicates and ready-step dispatch must require zero model calls. Existing model routing remains available for actual decisions; optional complex harness use remains CH01/CH03 work. A harness stores no authoritative hidden continuation: accepted goals, uncertainties and results survive outside the provider session.

Measure the current global workflow and thought interval before expanding concurrency. Per-actor cause coalescing and fair admission are useful even with one worker. Bounded future concurrency must preserve the single world writer and reserve aggregate budget before dispatch. Do not solve responsiveness by launching one unbounded harness per actor.

Simulation time governs action durations, physical outcomes and adopted in-world review times. Wall time governs provider timeouts, admission rate and money. Do not infer mental effort, fatigue or simulated action duration from token count. Native time continues during inference according to the existing pause/time policy; stale results are rechecked rather than freezing every actor until a model answers.

If native scaling later requires dormant/far-agent approximations, gate it through the performance owner with equivalence/error evidence. This design does not authorize skipped RNG draws, fabricated offscreen outcomes or different facts for different observers.

## 8. Persistence, pause, restore and failure

Continuation dependencies include exact manifest/definition versions. This is same-version integrity, not legacy support.

Goals, plan frontier, pending native execution and actor-visible invention progress belong to same-version save integrity. Provider requests, uncertain charges, admission receipts and other real external operations retain the existing non-rewind/accounting rules.

Persist admission before dispatch. Persist accepted results before scheduling dependent work. Associate every callback with the original world/load epoch, actor, operation and revision. Loading a saved world must fence callbacks from the old timeline; it must not replay captured queued/running provider jobs merely because their intent appears in a snapshot. Reconcile external work by its existing identity where supported. Otherwise report uncertainty and stop automatic dispatch.

A same-version restart can rebuild native readiness from authoritative state without generating another thought or invention. Derived indexes/subscriptions can be rebuilt; durable goals and completed effects cannot be reconstructed by asking a model what probably happened.

Keep explicit pause semantics consistent with the existing distinction between player-initiated work and autonomous background cognition. No new paid stage or physical effect is admitted while its policy forbids it. A result held across pause still needs relevant freshness checks after resume. Cancellation removes future authority, not necessarily charges already incurred remotely.

The active development policy in [AGENTS](../../AGENTS.md) and [save/load](../../docs/save-and-load.md#active-development-policy) applies: **do not add old-save migrations or compatibility readers for this redesign**. Reject incompatible development saves explicitly. This does not remove same-version recovery, privacy revocation, external accounting or the separate future version/activation semantics of generated world definitions.

## 9. Diagnostics and observable behavior

Extend the existing god-only cognition trace, rather than building an independent planner dashboard. A developer should be able to follow the initiating need/awareness/result, selected context, goal/plan revisions, proposed components, their admission outcomes, native starts/completions, invention stages and subsequent reconsideration.

Keep operational receipt IDs and exact structured proposals available in authorized diagnostics. Actor-visible narration should describe actual supported effects, while private inner speech remains explicitly fictional and scoped. Do not display model reasoning tokens as an actor's definitive mental process. Do not have the UI infer a completed action from an accepted plan.

Useful counters include semantic opportunities by disposition, queued-plan age, native steps per model decision, proposal resolutions by category, unchanged repeated attempts suppressed, urgent-native adequacy, goal churn, lost/delayed result delivery, context omissions, per-stage latency and aggregate known/uncertain spending. Definitions and evaluation procedures live in the tracker rather than being duplicated here.
