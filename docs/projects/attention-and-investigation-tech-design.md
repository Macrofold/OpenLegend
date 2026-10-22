# Attention and investigation — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Owner contracts and detailed execution are selected; integration review remains in progress and runtime implementation has not started. | 2026-10-22 |

## 1. Authority, baseline and dependency reads

This is SAD-E. The [feature specification](attention-and-investigation-feature-spec.md) owns behavior and AJ01–AJ13. [ATI](../maintainers/attention-and-investigation.md) owns implementation, dependencies and unsatisfied acceptance; [world policy](../worlds/base/attention-and-investigation.md) owns methods/tuning; [limits](../limits/attention-and-investigation.md) owns restrictions. SC01–SC14 in the [shared technical design](stealth-awareness-tech-design.md#shared-contracts) remain authoritative. The notation below refines E-owned payloads in those contracts; it is design notation, not application code or a claim that the named proposed fields already exist.

Repository: **Macrofold/OpenLegend**. Working branch: **codex/design-stealth-05-attention**, created from the exact pushed **codex/design-stealth-00-contracts** commit **a3d40b4d71e29d6504e9f3fcc21e76344a0a284e**. No sibling branch is merged. The complete feature/technical pairs were read through immutable remote refs before this design:

| Responsibility | Remote branch and exact read commit | Authoritative design |
| --- | --- | --- |
| A: evidence/recognition | codex/design-stealth-01-perception — 40805523c4a19ab7c6cc455d49d51e4a122ecae0 | [Feature][a-feature] · [Technical][a-tech] |
| B: vision/gaze | codex/design-stealth-03-vision — 5837c5b30c90dbb30bd26530d196197aa311b35d | [Feature][b-feature] · [Technical][b-tech] |
| C: posture/acoustics | codex/design-stealth-04-acoustics — b242bee437f9e13801bfee77030efd309d88a35d | [Feature][c-feature] · [Technical][c-tech] |

Pinned links are intentional: these files do not yet exist on this contracts-based branch. SAD-I can replace them with integrated local references after reconciling the selected contracts. Source inspection establishes owner placement, not execution quality. This assignment writes documentation only and runs no application or executable tests.

### 1.1 Existing owners and required extensions

| Meaning | Existing authority | E's narrow extension |
| --- | --- | --- |
| Goals and personally chosen purpose | ActorGoal; ActorPlan; ResponsePurposeBinding | Refer to the actual selected purpose, including no explicit goal. No new purpose store. |
| Finite ordered work | ActorPlan.activity / ActivityExecution; invoke, sequence, branch, repeat, wait | Typed observation controls, bounded search progress and exact observation-work bindings. No parallel-plan node. |
| Physical execution | ActorComponent.action / Action; shared availability/admission | Add supported observe methods and compatible observation facets to qualified action families. |
| Orientation and body | B's single optional orientation record within the current action; spatial pose; C posture/motion | Request a finite directive through B. Do not copy angles, steering state or posture into attention authority. |
| Evidence and personal observation | A/EPR, knowledge/identity, experience, action results | Consume exact permitted facts; record scoped observation outcomes through existing owners. |
| Relevant warning/expectation | PersonalEncounters, including unknown-region evidence | F references actual work and consumes E's immutable preparation values. No second threat table. |
| Native animals | NativeResponseState / NativeResponseEpisode; ordinary movement/flight | Optional finite curiosity/observation variants under that same controller. |
| Due work and decisions | ActorWork, interests, cognition execution/validity | Derived subscriptions and owned due causes; no polling/model loop or separate scheduler. |
| Fear/startle | Existing appraisal/status/contribution owners; D | Read prior applicable effects/policy. E never creates fear or changes its causal lifetime. |
| Persistence and privacy | Current world-record tree, save/load and observer projection | Save new fields with their owning records, rebuild derived indexes and fence late work. |

Source touchpoints include domain agency.ts, activity-execution.ts, action-capabilities.ts, action-experience.ts, types.ts, spatial-state.ts, perception.ts, event-observation.ts, combat-encounters.ts and native-response*.ts; server actor-work.ts, interests.ts, ai-director.ts, cognition-execution.ts, decision-validity.ts and scoped view/history readers. These are responsibilities, not instructions to create one new file/package for every row.

**Verified baseline distinctions:** Action has an id and stage, but no general action revision or top-level startedAt. ActorPlan owns id/revision; ActivityExecution has no separate identity. Its activeKey and PlanStep.activityKey connect execution, and PlanStep.actionId links a physical action. ActorComponent.planGeneration is work-replacement authority. ActionInvocation is a proposal with no admitted-work identity. NativeResponseEpisode has id, startedAt, profilePin, mode, movement and proposalGeneration; the last is navigation freshness, not sensory/preparation revision.

Current PersonalEncounter.watch is automatic stabilized observation bookkeeping, not a chosen watch. PersonalEncounter.own records selected offense, not universal preparedness. Current fire-watch attendance is a useful finite-control foundation, not already implemented threat coverage. Current native alarm/escape exists; sound intake and this curiosity extension remain targets even where older animal prose calls the whole controller pending.

## 2. Small state model

Use **one optional attention control on the existing selected finite activity**, with actual physical work referenced through the current action. A direct sustained watch compiles into a one-node finite activity through the existing request compiler; it need not invent an ActorGoal. Orient-once remains B's ordinary action/amendment and need not create an E activity.

An attention control contains only what must continue: admitted method/pins, ordered focus bindings, optional supported predicate, original finite limits, selected loss rule, current focus/frontier progress and minimal predicate/disposition continuity. Existing plan status, action phase, interruption, elapsed work, outputs and result records remain their owners; do not duplicate them in another lifecycle field.

For a native animal without agency, the same trusted method/coverage evaluator reads the selected control in its **single native response episode** instead. It is never simultaneously owned by both a plan and an animal episode. A native settling episode can be physically alert without an Action; capture its actual body/method values and native episode, not a fabricated action.

### 2.1 Terms and spatial binding

The following names describe new E-owned closed shapes. Shared A/B/spatial types remain imported meanings, never redefined here.

~~~ts
type AttentionFocus =
  | {
      kind: 'fixed-region';
      region: SupportedRegion;
      basis: PermittedSpatialBasis;
    }
  | {
      kind: 'fixed-bearing';
      estimate: Extract<LocationEvidence, { kind: 'bearing' }>;
      basis: PermittedSpatialBasis;
    }
  | {
      kind: 'observed-subject';
      target: ExistingPermittedPhysicalTarget;
      observation: FactKey;
      onLoss: 'end' | 'hold-last-permitted';
    };

type AttentionTerms = Readonly<{
  method: DefinitionPin;
  foci: readonly AttentionFocus[];
  concern?: PermittedParticipant;
  predicate?: RegisteredObservationPredicate;
  notification: 'event' | 'level';
  initialLevel: 'report-current' | 'changes-only';
  stop: {
    deadline: SimTime;
    condition?: RegisteredObservationPredicate;
    maximumChecks?: number;
  };
  anticipation?: {
    dangerKinds: readonly DefinitionPin[];
    focusOrdinals: readonly number[];
  };
}>;
~~~

PermittedSpatialBasis is exactly one existing actor-authorized spatial selection/known-place observation, A FactKey for received location, or own accepted pose captured for a relative selection. It carries the original frame/time and source eligibility; it contains no hidden emitter pointer. Use existing SupportedRegion, Position and Direction representations, not proxy entities or a new geometry language. An accepted observer-relative bearing is fixed to its original world frame. A later relative *instruction* such as “look behind me now” is a new B binding at that instruction's admission.

ExistingPermittedPhysicalTarget is the ordinary admitted current-body/object/surface reference with its exact life/observation binding. A current exposure or an ObserverSubject by itself is not that target. One concern can be an anonymous exposure, an observer-local individual, a supported known person or attributed description under A's PermittedParticipant. Multiple focus entries can carry different supported concerns via ordinary separate selected steps; the initial single control does not create a general belief graph.

Anticipation is an **accepted instruction to maintain a supported method**, not a factual claim that danger exists. Its registered danger-family pins and focus ordinals are explicit; no arbitrary prose “anything, anywhere” predicate is executable. Omitted anticipation means ordinary observation. A supported physical guard/offense/native-alarm method can supply preparation from its own accepted owner even without AttentionTerms.

Purpose stays in the existing plan/response binding. Source facts stay in A. Exact action/plan identity and actual pose stay in their owners. Do not save a copy of current sensory evidence in every control. Retain references and the minimal immutable contribution needed while an ongoing operation depends on it, under the existing evidence lifetime rules.

### 2.2 Association and uncertainty

Reuse A's FactKey, EvidenceTiming, PermittedParticipant, SourceAssociation and CapturedCurrentFacet unchanged. SourceAssociation.rememberedSubject remains the identity owner's serialized string key, not a raw entity ID and not an embedded ObserverSubject union. A suspected voice cannot become Talk.targetId, a physical chase target or a current attack target.

Spatial scope and identity concern are independent. A doorway can be selected from permitted geometry with no threat evidence. A warning can support an expectation about a region while its alleged person remains uncertain. An observation of Ada's voice does not refresh her earlier equipment, route or current action. A later recognized person does not retroactively fill a search gap.

For several danger hypotheses, retain each original support and uncertainty in A/encounter ownership; E can examine their common region or schedule distinct foci. Do not merge them by hidden producer identity, average opposite bearings into a false exact point, or serialize a backend threat list to cognition.

## 3. Admission and physical execution

### 3.1 One admission transaction

1. Resolve the exact actor, normalized physical life, controller and current work through ProspectiveWork.expected. Resolve permitted terms against the current observation/identity owner; validate installed method/predicate/definition pins and finite original bounds.
2. Determine the chosen continue/enqueue/replace/interrupt operation. Explain lost work, committed costs, suspended-plan consequences and recovery using the existing prospective-work owner. Selection is not acceptance.
3. Run the same read-only prerequisite calculation for menus, exact player requests, NPC offers, interpreted proposals and plan dispatch: scope access, sense/body, allowed pose, tool/part/reach, real work claims, supported simultaneous combination and parameter/work-envelope limits.
4. Prepare required geometry/current facets through existing owners. Technical preparation is not elapsed fictional inspection and cannot inspect hidden truth for cognition. Incomplete work leaves admission pending or unavailable, without replacing existing work.
5. Recheck changed authority/work/source/policy after waits. Commit the selected activity/action and B directive together, or refuse atomically. No costs, RNG, events, IDs or interruption occur during preview.
6. Derive subscriptions from accepted work. Begin attention timing at actual admission; begin each method's **fulfilled physical interval** only when its required action phase/pose/senses are actually satisfied. Orientation/approach time is real but is not falsely reported as completed examination.
7. Record ordinary action outcomes and optional response reasons through their owners. An actor may say something even when its proposed observation is refused; admission does not fabricate a successful watch.

A compatible orientation amendment uses B's scoped amendment revision; it must not advance whole-action replacement generation and accidentally cancel cooperation. E additionally binds any changed attention terms through the containing plan's existing revision/step identity. A truly replaced action uses ordinary generation/recovery rules.

### 3.2 Narrow simultaneous combinations

Use B's one optional action orientation record, with at most one directive per installed independently steerable gaze group. It owns goal, group/lead receptor, head-only or explicit body assist, action/activity binding, original progress, finite extent and loss. The E control owns inquiry/notification/deadline; the action points to that control by the existing plan/step/activity key rather than copying its terms.

A walking action can carry the selected observation facet if its descriptor permits it. A stationary observe action occupies the primary lane. Finite scans are ordinary sequence/observation phases; walking scans use the same move action's qualified orientation facet and finite progress, not two concurrently executing activity nodes. Do not add a general parallel combinator.

| Combination | Exact rule |
| --- | --- |
| Walking + head/eye monitoring | Preserve route/destination/purpose and actual locomotion. Admit only within B rig constraints. |
| Walking + body-assisted rearward look | Requires explicit compatible movement choice. B/C apply actual turning, side/back speed and costs once. |
| Stationary guard + head-only look | Preserve guard body/shield facing, preparation/deadline/recovery. E reports its real visual scope separately from defense. |
| Guard + conflicting body turn | Refuse compatible amendment; an explicitly chosen replacement follows guard cancellation and recovery. |
| Aim/precise tool contact + conflicting view | Refuse or explicitly interrupt. View-required work waits for its actual view; merely retaining the tool does not continue progress. |
| Repeated work with safe observation breaks | Compose work step → look/observe → next work step. Partial steps follow that family's real restart/spending semantics; no fractional-progress preservation is assumed. |
| Speech during observation | Preserve current speech rules. Instantaneous speech is a real acoustic occurrence, not a fabricated continuing voice lock. |
| Unsupported producer or body freedom | Return unsupported capability; no new sensing, material test, limb or stamina law from the action's name. |

B's orient-once completion leaves achieved pose. Maintained directives stop at their containing action or original extent. Lost tracking follows the explicitly accepted stop/hold rule; restoring old terms does not reacquire a hidden body. Eye/head-only look has no additional effort tax selected here. Fatigue, injury and fear alter compatibility only through their actual installed effects.

### 3.3 Method semantics

**Look** requests B's physical orientation, which alone grants no detection or anticipation. **Scan** visits a finite ordered focus list; each dwell starts after actual alignment/required view availability, ends at its real boundary and consumes the original remaining limit. Movement, current gaze and sensed facets remain canonical B/A values.

**Listen** uses C's existing physical provider without an E measurement timer or detection multiplier. Actual new emissions, physical changes and legitimate continuous support can produce new A evidence. Stopping work only changes noise if that action was really emitting; current instantaneous speech does not become an ongoing noise source. C's sampled continuous sound can miss/delay narrow passages; a completed E listening interval retains that limitation. A stronger listening instrument/provider requires its own later C/A contract.

**Inspect** selects a supported observation family. Exterior visual examination requires the current view; a written record, accessible container or known instrument uses that family's exact disclosure, reach, duration and cost. No full hidden inventory, inscription, internal part or recipe is granted by visual selection. Tools or experiments that alter an object are separate admitted operations with actual permission/material/risk.

**Monitor** evaluates a registered observation condition against permitted evidence, or listens for actually acquired events. **Investigate/search** composes these methods and ordinary movement/inquiry. Its desired answer is chosen meaning; success comes only from supported results. Asking a person waits for their actual independently chosen reply, not a native callback claiming their answer.

## 4. Monitoring and search continuation

### 4.1 Event and level subscriptions

Subscribe through EPR/derived interests/ActorWork, scoped to the exact active owner. A subscription is a disposable dependency index, never evidence or continuation authority.

| Dependency | Producer and handling |
| --- | --- |
| New acquired occurrence, changed facet/association or revoked support | A supplies exact reference and eligible meaning; optional wake hints coalesce. |
| Own action/plan/attention amendment, accepted purpose or real result | Agency/action owner updates only affected subscriptions; own thought text alone is not fresh external evidence. |
| Actual pose/rig/sense/capability and relevant environment change | B/C/A update required physical coverage; E consumes their result instead of polling geometry. |
| Supported predicate prerequisite or access change | Owning observation/action family invalidates its result, with unknown/incomplete distinct from false. |
| D's due appraisal review | Existing cause/revision/deadline/finite allowance enters ActorWork; no attention-owned emotion timer. |
| Dwell, original deadline, actual condition crossing or native episode review | Existing simulation boundary/due owner; no wall-clock or browser timer. |
| Life/control/timeline/definition change | Existing lifecycle/authority transition invalidates affected work and derived subscriptions. |

Event watches act on a new acquired contribution once, using its actual identity. Level watches retain only their last completed truth, last qualified interval and emitted transition/disposition in the existing activity control. The installed predicate provides hysteresis/dwell where needed; E does not add universal salience thresholds. Initial true levels follow the admitted report-current/changes-only choice. Unknown or incomplete supplies no false/clear interval. Losing support ends fulfilled coverage immediately and resets continuous dwell; later true support is a coverage recovery, not invented new physical occurrence.

Unchanged level evaluations emit no result/event/decision. A change may create an actor-private observation result or satisfy an already admitted branch. It never authorizes an unselected attack, another person's reply or new material spending. Exiting an activity unregisters its future dependencies; retained history remains with action experience.

### 4.2 Investigation frontier and negative evidence

Use the existing activity frontier plus a bounded selected-search payload: exact admitted region/method/query, current page cursor, checked work-unit references, remaining original time/check allowance and emitted terminal disposition. Do not maintain an indefinitely growing live investigation diary.

A work unit is one actually reachable, permitted object/part/surface or supported subregion and observation method. Enumerate before hydration through current scoped spatial/container/knowledge queries. Candidate positions are **chosen vantage points**, never estimates silently treated as the hidden source. Do not query an invisible emitter's route. Method-specific spatial enumeration has a finite step allowance, deterministic continuation and a truthful incomplete outcome; a geometric refusal cannot reveal the hidden obstruction.

For each unit:

1. Preserve the selected purpose and historical spatial frame; prepare current access and supported observation.
2. Move only through normal navigation, if selected. Actual support/clearance, body dimensions, work stance and reach remain required; technical waiting is not search time.
3. Execute the observation. A supplies received facts and complete provider coverage at its declared fidelity.
4. Append one structured result through action-experience/private observation ownership; advance the frontier once.
5. Stop on the chosen answer/condition, exhausted admitted scope, original deadline/check allowance, actual interruption or unsupported/failed prerequisite. Do not silently broaden the region.
6. Offer current sensible next choices: another explicit scope, better viewpoint, inquiry, resumed work or stop. A choice to continue retains appropriate original spent effort; a new separate inquiry is explicitly new work.

A completed negative result records **what was examined, actual interval, sense/method/definition, supported detail, exclusions and fidelity**, and distinguishes checked-no-finding, inaccessible, unsupported, interrupted and incomplete portions. Store only actually available facts; omit hidden item counts/topology. A returned empty candidate page is not a guarantee that invisible or inaccessible places are empty.

Unchanged checked units are not automatically re-examined within the same selected inquiry. A changed required observation dependency makes only affected units eligible for recheck and cannot silently reset the total allowance/deadline. Merely changing an unrelated world revision does not reopen all units. Technical completion of previously owed work is continuation, not another observed event.

Negative evidence is an interval result, never a permanent safety certificate. A future arrival can invalidate its relevance without falsifying the earlier account. Other characters learn the result only from their own observation or actual testimony.

## 5. Decision opportunities and personality

Preserve EPR05's durable actor-private evidence cursor, native acquisition ordering and ActorWork ticket ownership. Never substitute Awareness.sequence or a personal durable cursor for an occurrence order/acquired cut. Required native acquisition and protective work precede optional cognition; the latter waits for its own required source durability.

On an attention-relevant change, prepare a compact actor-permitted cause and current goal/work consequences through the existing context builder. Include mandatory trigger/result/commitment/correction facts before optional selection. A newly relevant old object may be considered without being reobserved. Keep an unregistered quiet/unfamiliar meaning eligible for ordinary semantic consideration; native predicates are not an exhaustive definition of importance.

Use installed importance/urgency and ordinary fair admission; do not copy their thresholds into E or create privileged investigation tickets. Urgency may supersede an in-flight response through that owner's existing bounded policy; it cannot choose the action. Paid decisions require current authority, funding and spending admission. No automatic retry, new cadence or extra paid entitlement is selected.

Record considered versus attempted work through existing intake/decision/result dispositions:

| Case | Disposition and next opportunity |
| --- | --- |
| Continue/defer/no action | Existing work continues. Mark only captured considered evidence; unchanged cue does not immediately reopen itself. |
| Accepted finite inquiry/watch | Native continuation runs. A new decision is needed only at a material unresolved choice, result or other eligible cause. |
| Already investigated/declined | Retain the source-linked outcome; repeated equivalent optional hints coalesce. A distinct actual incident remains evidence. |
| Blocked physical method | Reconsider only changed relevant prerequisites, an explicit different choice or the existing eligible initiative route. No repeated impossible movement. |
| Provider unavailable/unfunded/stale | Preserve native work and evidence. Record unavailable/attempted separately from deliberate refusal. Newer causes survive captured-generation acknowledgment. |
| Emotion review | Consume D's original due identity and finite allowance; no self-renewal from the resulting appraisal notification. |

Personality describes the person, not “when noise X, do Y.” Familiarity/experience/expertise influence a person's interpretation and suggested methods without adding factual certainty. E does not duplicate A's recognition rule or B's Perception gain. Existing fatigue/condition effects can remove a compatible method or influence a choice only through their installed owners. No new vigilance stamina, universal fatigue formula, fear-to-gaze gain or attention score is selected.

## 6. Native animal methods

Use the single installed native-response controller. Physical acquisition, retention, language capability and controller selection remain independent. Acoustics C owns sound classification eligibility, its pattern map, persistent-source onset and absolute idle expiry. A memoryless animal does not require human history or paid intake.

Priority is the existing required body/lifecycle and territorial/alarm arbitration, then an already accepted compatible curiosity continuation, then a newly eligible optional curiosity method, then ordinary routine. A qualifying alarm preempts curiosity before optional approach; danger never waits for a curiosity dwell to finish. Preserve the existing complete locally perceived danger set, route safety and motion ownership. No nearest-danger cutoff is introduced.

Add mutually exclusive curiosity modes to the existing NativeResponseEpisode: curious-observing and curious-approaching. Their typed payload contains the installed curiosity method, exact acquired cue/retained immutable contribution, historical scope, original end/check limits, current stage and exact ordinary movement/action reference. Alarm modes retain their existing data. Transition to alarm ends curiosity terms and observation coverage in the same owner; there are not two active episodes moving one animal.

The selected method is: one short observation hold; optionally one safe ground approach; one final hold; end. It consumes real time/motion and uses actual receptor orientation where the body supports it. No candidate, unlocalized cue or unfit movement leaves a truthful observation-only/incomplete result; it does not manufacture a hidden location or force escape. On completion, use the existing routine-return owner once, without replaying its RNG scheduling.

Reuse C's original permitted-pattern entry to record that this cue has already received its curiosity disposition; do not add a second suppression table. Repetition can update genuinely received support under C but cannot restart the curiosity deadline, reroll a route or rearm the same persistent source. Native admission exhaustion remains technical incomplete; it is not a harmless-sound classification.

An active episode may retain the minimal immutable cue needed after optional sensory-cache expiry. That is existing operation continuation, not renewed observation. Hidden source disappearance gives no new knowledge. Capability loss, body replacement and control transfer end applicable native work; no automatic transfer to a person's mind. Sleep remains governed by existing eligibility; sound waking, distress calls, learned animal language, scent, packs, general flight curiosity and complex hunting search are outside this selected family.

## 7. Exact preparedness-evidence interface for Prompt 6

### 7.1 Boundary and types

F retains the existing SC12 VictimPreparationSnapshot and SurpriseDecision. E supplies **CapturedPreparationState** and **ExistingActiveWorkRef** below; it does not replace that envelope, choose CapturedWarningFact, decide surprise, or define a damage rule. EvidenceRef, FactKey, EvidenceCut, CapturedCurrentFacet, DefinitionPin and physical geometry remain their existing/A/B meanings.

~~~ts
type ExistingActiveWorkRef =
  | Readonly<{
      kind: 'action';
      actor: ActorLifeRef;
      controller: 'player' | 'npc' | 'native';
      actionId: string;
      planGeneration: number;
      plan?: {
        id: string;
        revision: number;
        stepId: string;
        activityKey?: string;
      };
      orientationAmendment?: number; // B's selected new scoped revision.
    }>
  | Readonly<{
      kind: 'native-response';
      actor: ActorLifeRef;
      episodeId: string;
      profile: DefinitionPin;
      movement?: { kind: 'action' | 'flight'; id: string };
    }>;

type CapturedAttentionScope =
  | Readonly<{
      kind: 'region';
      region: SupportedRegion;
      basis: CapturedSpatialBasis;
    }>
  | Readonly<{
      kind: 'bearing';
      estimate: Extract<LocationEvidence, { kind: 'bearing' }>;
      basis: CapturedSpatialBasis;
    }>
  | Readonly<{
      kind: 'observed-subject';
      target: ExistingPermittedPhysicalTarget;
      current: CapturedCurrentFacet;
    }>;

type PreparationFulfillment =
  | Readonly<{
      kind: 'maintaining';
      maintainedFrom: SimTime;
      evaluatedThrough: SimTime;
    }>
  | Readonly<{
      kind: 'preparing';
      beganAt: SimTime;
      remaining: SimTime;
    }>
  | Readonly<{
      kind: 'unfulfilled';
      since: SimTime;
      reason:
        | 'turning' | 'lost-required-observation' | 'incompatible-work'
        | 'lost-capability' | 'blocked-method' | 'physical-recovery';
    }>;

type CapturedPreparationState = Readonly<{
  work: ExistingActiveWorkRef;
  method: DefinitionPin;
  kind: 'observation' | 'anticipation' | 'defensive-action' | 'native-alert';
  admittedAt: SimTime;
  originalDeadline: SimTime | null;
  fulfillment: PreparationFulfillment;
  lastBreak?: { at: SimTime; reason: PreparationBreakReason };
  scopes: readonly CapturedAttentionScope[];
  expectedDangerKinds: readonly DefinitionPin[];
  concern?: PermittedParticipant;
  physical: CapturedPreparationPhysical;
  supportingFacts: readonly SupportedSensoryFact[];
  currentConfirmations: readonly CapturedCurrentFacet[];
}>;

type PreparationCapture =
  | Readonly<{
      kind: 'complete';
      actor: ActorLifeRef;
      cut: EvidenceCut;
      preparation: readonly CapturedPreparationState[];
      workSupport: readonly ExistingActiveWorkRef[];
    }>
  | Readonly<{
      kind: 'incomplete';
      continuation: ExistingWorkReference;
    }>;
~~~

The conceptual synchronous query is **capturePreparation(actor, cut, admittedPreparationFamilies)**. Its arguments contain no attacker to discover and no global threat search. F can filter the complete captured result for its actual outcome using its own native contract. A genuinely absent optional preparation family yields a complete empty contribution; missing required physical/effect/evidence preparation yields incomplete and holds the dependent outcome. Invalid current-format state fails through its owning validation; never silently return empty.

**Exact supporting payload meanings:**

| Payload | Required fields and owner |
| --- | --- |
| CapturedSpatialBasis | Copied permitted selection or original A location facet, its FactKey when evidential, original measurement/acquisition/frame and uncertainty. A literal self/known-terrain selection needs no invented warning. No hidden producer lookup. |
| CapturedPreparationPhysical | Copied actual actor body/life position and accepted B body/receptor pose; actual action/native mode; installed method/rig/pose/guard/locomotion pins; relevant occupied/required body/equipment claims; exact accepted guard-facing/arc/range when that family supplies them; supported current observation coverage/fidelity and physical restrictions. Each field is supplied by its owning closed family adapter, not an arbitrary map. |
| PreparationBreakReason | The ordinary terminal/interruption reason plus coverage loss, changed focus/terms, lost capability, expiry and explicit stop. Preserve voluntary, automatic and technical causes; no invented “chose to stop.” |
| Supporting facts and confirmations | A's immutable permitted values and exact original support. Use only acquired members of this cut. A current facet's measured interval differs from its confirmed-availability interval; both survive capture. |
| Original deadline | The actual activity/guard expiry; null only for an existing native alarm whose termination is already condition-governed. Include its current settling/review/condition values in its native physical adapter. Null never means an infinite E watch. |

Every enabled preparation family must implement one typed adapter at its existing action/native owner. The first adapters are E observation/anticipation, existing shield guard, existing actually committed offensive/evasive work and native alarm/settling. Their physical payload is a **closed discriminated union** generated from those registered adapters: action ownership, actual view/pose constraints and native physical progress are complete for each. Do not invent a generic flags bag, interpret action names, or return readiness from a private goal.

For E observation/anticipation specifically, the physical payload contains: exact active focus ordinal; current B directive and its achieved/current pose values; the installed observation family and senses; current completed A/B/C coverage interval and fidelity; current resource/phase compatibility; and active versus last-permitted-fixed focus. For guard it includes original preparation/expiry/recovery and accepted facing/coverage from guard authority. For offense/evasion it contains actual committed phase, target authorization as permitted to this actor, original timing/recovery and occupied claims. For native alert it contains exact episode mode, original startedAt, current complete danger/region support, current movement/settling progress and actual alert-body constraints; proposalGeneration is not a general readiness revision.

These native payloads can include the victim's **own actual physical state**; they cannot add an enemy's hidden position or undisclosed activity. They are immutable native inputs, not public/model DTOs. Deep-copy/freeze admitted scalars/typed values at the capture owner; retaining a mutable action, lease, episode or pose pointer violates the contract.

### 7.2 Capture algorithm and temporal boundaries

1. Advance already admitted movement, turns, effects and observation through the common pre-outcome boundary. Complete all required A/B/C work that canonically precedes the outcome.
2. Obtain A's exact acquired membership and resolved values for EvidenceCut. lastIncludedOrder is not a membership filter; an earlier event acquired later is absent.
3. Resolve this life/controller's current action and relevant active plan/native episode through existing identity lookups. A suspended, finished, cancelled, expired or unmatched reference is not active work.
4. Evaluate original deadlines and work transitions in canonical order. Active intervals are half-open: **[start, deadline)**. At equality the finite watch/guard is ended before capture if its due expiry precedes that outcome. A newly accepted same-time action contributes zero elapsed preparation.
5. Derive fulfilled physical method intervals from actual execution. Copy scope, selected anticipation, physical values, evidence and last genuine break once; deduplicate an action referenced by both plan and native ownership rather than double-counting it.
6. Return complete immutable values, including currently preparing/unfulfilled active work where useful to F. Ended/suspended work is absent; its historical result may still support F's independently owned warning history.
7. F combines this contribution with its warning facts, complete D mechanics and pinned surprise policy in SC12. It evaluates and records the actual outcome without rereading later mutable work. The hit's interruption, sound, injury, startle and new fear occur afterward.

A helper cannot return false/no preparation when a required coverage calculation is incomplete. It must finish or preserve the shared coherent-prefix hold. No synchronous capture performs SQL, text hydration, model selection or renderer queries. Required current contributions must be resident or prepared before this boundary.

The fulfilled interval means **continuous execution of the specified method**, not continuous detection of every point/person in its intended region. Current physical values and coverage describe its actual limits. An ongoing doorway guard can maintain anticipation while nothing is visible; a visual observation condition can nevertheless be unfulfilled in darkness. F chooses which particular physical/readiness predicate matters to an attack. Mere aligned gaze or observation kind never automatically passes it.

### 7.3 Retention, fading and hysteresis

E selects exact physical lifetime behavior:

- Acceptance preserves original deadline and budgets. No cue, thought, query, redraw, repeat command receipt or save/load renews them.
- Stop, incompatible replacement, expiry or loss of exact life ends dependent active coverage at its real boundary. The accepted pose can remain without a maintained preparation claim.
- A temporary loss of the watched person ends live subject coverage immediately. An explicitly selected hold-last mode can continue **fixed spatial anticipation**, with uncertainty and no live-person target. It uses the same original end.
- Compatible ongoing combat work can remain continuous despite lost sight; E does not reset its accepted method merely because a target crosses a view edge. F's encounter owner determines ongoing threat expectation and scope.
- A genuine break resets maintainedFrom for the affected method. Resume cannot reuse old uninterrupted time. Preserve only the latest break/current interval in live control; complete historical checks/gaps remain ordinary action results.
- Repeated equivalent inputs preserve the chosen focus unless an actual accepted change or required physical invalidation occurs. Level predicates have their own authored enter/exit thresholds and dwell; unknown does not count as clear. No universal attention-switch cooldown is added.
- E keeps no fading alertness meter. Physical preparation either remains supported, is preparing/unfulfilled or has ended. Historical warning/expectation can retain uncertainty and fade **only through F's PersonalEncounters policy**. A/EPR retention, acoustic pattern expiry, familiarity and shortcut grace are never reused as a surprise-immunity timer.

F must select lead time, relevant method/type/approach matching, uncertainty treatment, disengagement hysteresis and any residual warning lifetime in Prompt 6. E supplies all actual start/end/gap/scope values needed for that choice. No F result is preselected here. Guard expiry does not erase memory, but memory alone cannot recreate active guard coverage.

### 7.4 No emotional feedback around one hit

Read only pre-existing D mechanical/condition values at the specified physical/action/capture boundary. A prior feeling can influence chosen preparation or a supported method constraint without supplying attack direction. Resolve F's hit before its new shock or interpreted fear. A later choice prompted by that fear can establish later work; it cannot move maintainedFrom backward or revise the earlier cut. Two attacks with equal simulation time still follow canonical order and independent actual-victim cuts.

## 8. Lifecycle, persistence and disclosure

| Boundary | Required behavior |
| --- | --- |
| Ordinary progress/completion | Keep original limits; settle actual observation/action results once. End subscriptions and action-held maintenance when their owner ends. |
| Compatible amendment | Preserve unrelated route/cooperation/material work; update exact attention terms/amendment dependencies. Changed coverage starts at the real change. |
| Interruption and pause | Suspend only supported work; end its coverage. Preserve original deadline, prior checked units, outputs, costs and interruption flag. Restart unfinished physical step on resume where the owner requires. |
| Attack | The contact owner determines actual interruption after the pre-hit cut. A compatible surviving watch remains real; no unconditional detection-to-cancel rule. |
| Lost sight, ambiguous crossing or source departure | End affected live authorization; keep only explicitly admitted fixed last-permitted scope. No hidden reacquisition or knowledge that an unseen source died. |
| Incapacity/sleep/body death | Apply actual sense/work eligibility. End impossible work; historical outcomes persist. No sound waking or transferring old-life preparation to a replacement. |
| Controller/participation change | Retire pending old-controller choices and native work as existing policy requires. A human gets no background AI attention without authorization. |
| Definition/permission/evidence edit | Revalidate affected executable terms and supports through their owners. Unsupported or revoked continuing use ends/blocks honestly; committed effects persist. |
| Save/reopen | Capture owner records, exact pins, original deadlines, frontier/check/disposition state, pending physical progress and immutable contributions together. Rebuild only derived indexes. |
| Unavailable model/storage/physical preparation | Distinguish optional decision failure from required native incompleteness. Preserve coherent required state and evidence; do not fabricate refusal, no finding or safety. |

Use the existing current-format record schema and serializers; no new DB/table/scheduler is justified. Persist attention fields nested under plan/activity or native response ownership and result coverage under action/experience. A owns saved evidence/familiarity; B owns pose/directive timing; C owns sound/anchor continuity. Avoid double-saving the same current pose or acquired fact.

Current-format validation checks forward and reverse work ownership; exact life/action/plan/step relationships; installed method/predicate support; focus ordinals and permitted reference kinds; finite ordered times and original deadline; cursor/check allowance consistency; pending node/execution relationship; and matching native movement/episode. An ended historical result may outlive its source or removed method without authorizing resumption. Restore cannot reconstruct missing terms from prose or silently repair malformed active work.

Pause freezes simulation time, not future real account deadlines. Restore grants no offline observation, paid retry, extra dwell, new acquisition or new normal-clock conversion. Preserve B's original steering phase and C/A progress. Existing pending-presence handling prevents transport reset alone from cancelling restored physical work; genuine departure still applies before further simulation.

Own activity inspection can show accepted terms, progress, actual remaining work and permitted results. Another observer sees only A/B-acquired physical facets: head/limb posture, visible movement/equipment or actual speech. Do not serialize private predicate, suspected person, danger kinds, expected direction, fulfillment values, exact fear, work internals or readiness. Recheck current observer/control/privacy/timeline after asynchronous reads; invalidating caches alone does not fence an in-flight response.

## 9. Scaling and failure bounds

The [limits inventory](../limits/attention-and-investigation.md) selects actual initial envelopes. One active control belongs to each current activity/native episode; the existing one suspended plan remains intent only. At most eight explicitly selected focus bindings and one predicate per selected method are admitted; this is an input/work envelope, not a limit on passive perceptions or threats.

Search retains at most one page of sixteen prepared units, sixty-four checked-unit references per invocation and its original deadline; reaching the check allowance ends with a partial result. Native continuation uses the current activity frontier and native-work accounting. Process at most sixty-four cheap subscription/predicate updates before yielding at the existing continuation boundary; never omit required observations to meet that quantum.

| Growing work | Shared preparation / selection | Invalidation / overflow |
| --- | --- | --- |
| Active actors and focused work | Existing active-owner membership and due indexes; visit only changed dependencies or due boundaries. | Whole population remains a real growth dimension; no all-history scan per watch/tick. |
| Relevant evidence notifications | A's exact actor-local sources and EPR coalesced wake; no separate source copying. | Required facts preserved; optional reconsideration coalesces and exposes pending/attempted status. |
| Search candidate enumeration | Select scoped IDs before metadata/geometry hydration; page sixteen, finite checked allowance. | Continue incomplete technical work or end selected partial search; never silently claim complete coverage. |
| Pose/sensory computation | B/C/A canonical evaluation/dirty scopes, same-phase immutable preparation. | Their native coherent-prefix hold; no extra attention sampling loop. |
| Snapshot capture | Exact current action/plan/native lookup plus already prepared pertinent support. | Linear in actual active methods and required acquired support; no top-N threat truncation. |
| Retained search/action history | Existing paged action/experience storage and actual retention/correction rules. | No new total-history cap selected; accumulated history remains a storage-growth dimension, not per-cue hydration. |
| Dense legitimate alarms/observers | Existing complete native transition work and shared conservative spatial queries. | Backpressure/owed time, not disappearing cues or omitted victims. |

Do not bound a query merely by limiting the number of returned findings. Count candidates visited, exact physical evaluations, subscribed owners, emitted/coalesced reasons, selected/hydrated bytes, retained control/history size and required queue age. Test cold restore separately from warm unchanged work, dense living bodies separately from inert scenery/history and concentrated dependency changes separately from ordinary travel.

Measure the real caller from action offering/admission through native execution, storage and projection; optional model costs/latency are separate. No population/FPS target is invented by this design. There is no new stress run in this documentation task. ATI08 requires actual scoped qualification before implementation completion.

## 10. Delivery modules and paper acceptance

Implementation changes zero lines of application logic in this assignment. Future work spans domain actions/agency/observations, server subscriptions/choice context and protocol/player consumers; its cross-owner authority, persistence and disclosure risks require the durable staged plan here. Implement ATI01–ATI08 in order with separately authorized runtime work.

| Module | Parent work | Required slice |
| --- | --- | --- |
| ATI01 | SAD-E / AC07 / ND13–ND16 | Exact methods/terms, same read-only admission, ordinary finite observe/monitor and actual results. |
| ATI02 | AC08 / SAI-B/C/E | Qualified walking/guard/work compatibility through B/C, actual intervals and refusal. |
| ATI03 | AC07 / DG02 | Bounded search/frontier, supported inquiry, correct partial/negative evidence and stop. |
| ATI04 | AG06–AG07 / EPR / DG02 | Subscriptions, meaningful opportunities, purpose/context and no repeated investigation loop. |
| ATI05 | CTR / SPK / ND16 | Native cue consumers and narrowly installed curiosity through one controller. |
| ATI06 | SAI-E/F / ND11 consumer | Immutable preparation adapter/capture with exact actual-victim cut and no decision of surprise. |
| ATI07 | AG09 / AC10 / G | Current-format lifecycle, private/public projection and truthful ordinary use. |
| ATI08 | Existing quality/scale owners | End-to-end integration, measured work and uncoached usefulness with actual evidence. |

Paper traces must cover AJ01–AJ13 and these precise cuts:

- Observation acquired after an earlier cut, even though its occurrence order is lower: excluded from that cut.
- Action just admitted or still turning at impact: no invented earlier fulfilled interval.
- Exact expiry, pause/resume, guard recovery and same-time two-hit ordering: original deadlines and no retroactive fear.
- Watcher's body survives an attack with compatible work versus actually interrupted work: distinct continuation.
- Recognized voice plus stale visual spear; two ambiguous bodies crossing; correction during context wait: no new body authority.
- Moving rearward gaze, head-only shield glance and view-required tool work: one real action and actual differing constraints.
- Unavailable physical query during a search: incomplete, not negative; no future batch silently completes a prior report.
- Repeated equivalent noise after completed/declined/blocked inquiry; new stronger cue during paid work: bounded old disposition, retained new evidence.
- Native alarm/curiosity/routine conflict, complete danger set, unlocalized sound and blocked vantage: one controller and no hidden homing.
- Save/load in scan dwell, suspended investigation, curiosity approach, native settling and frozen cut: same subsequent native meaning and no extra RNG/model dispatch.

Source/document review can establish contract coherence only. Later fixture/native/database/browser/live-model evidence must be labeled separately. Real autonomous alternatives and useful uncoached play remain required; a forced action cannot establish character judgment, and scripted correctness cannot establish fun.

## 11. Open semantic questions and integration notes

**E's selected semantics are complete; no unanswered E product question is delegated to the implementer.** These are bounded cross-project gates, with conservative behavior until their owners finish:

1. **SA-D02 — exact evidence revision representation.** A proposes family-specific numeric native versus SHA-256 personal-source revisions; frozen SC02 illustrates number. This branch consumes EvidenceRef opaquely and does not adopt or redefine that proposal. Common owner/SAD-I must settle the representation before dependent PP01/ATI source adapters. Preserve the exact owning family and revision; never coerce a digest or add a universal attention counter.
2. **B/C physical integration.** Use B's accepted orientation directive and C's posture/motion accounting. Reconcile B's side/back movement factors with C through their existing owners before ATI02; E adds no locomotion formula. Current unsupported combinations refuse.
3. **F / Prompt 6.** Section 7 is the producer contract. F chooses which method/danger/approach matches, its minimum preparation lead time, scope uncertainty, continued-fight/disengagement hysteresis, warning lifetime and surprise/damage rules. Until implemented, no new runtime surprise result is claimed. E's actual expiration/interruptions and immutable intervals are already settled.
4. **D / player fear.** SA-D01 still owns longer-term controlled-player psychological acquisition. E reads prior installed conditions only and does not choose that producer. Native body effects, NPC choice and this design can proceed independently.
5. **Physical observability of preparation.** B's facets do not reveal private action-stage labels. Any NPC warning based on seeing an attack preparation requires actual admitted limb/weapon pose/trajectory and A-acquired evidence. Keep it unknown until the action producer supplies that physical support.
6. **G ordinary surfaces.** Supply accepted/pending/refused work, actual scope/time and privacy-safe outcomes. G must finish input/accessibility/patch/history presentation; no camera or selection callback may create sensing or commitment.
7. **Listening fidelity and animal scope.** Selected listening deliberately retains C's provider fidelity; stronger sampling is a future physical-family design, not a hidden E bonus. Curiosity here is E's narrow new native extension; C's alarm-only baseline remains accurately described.

The feature's scope and repertoire review record all selected positive opportunities and boundaries. The tracker owns unfinished implementation; the existing shared decision register owns SA-D01, while SA-D02 remains linked to its actual remote proposal. No duplicate question register, diary or claim of implementation is added.

## Maintained records

- Behavior and complete actor journeys: [Feature specification](attention-and-investigation-feature-spec.md).
- Work, pinned dependencies and unchecked acceptance: [ATI tracker](../maintainers/attention-and-investigation.md).
- Methods/timing/curiosity choices: [World profile](../worlds/base/attention-and-investigation.md).
- Limits and growth: [Attention inventory](../limits/attention-and-investigation.md).
- Existing contracts: [Action capabilities](../action-capabilities.md), [action experience](../action-experience.md), [agency](../agent-agency.md), [memory](../memory-architecture.md), [EPR](../events-perception-and-reactions.md), [identity](../identity-and-references.md), [spatial](../spatial-world.md), [time](../simulation-time.md), [save/load](../save-and-load.md) and [attention/scenes](attention-and-scenes-tech-design.md).

[a-feature]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-feature-spec.md
[a-tech]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/projects/perspective-perception-tech-design.md
[b-feature]: https://github.com/Macrofold/OpenLegend/blob/5837c5b30c90dbb30bd26530d196197aa311b35d/docs/projects/vision-and-gaze-feature-spec.md
[b-tech]: https://github.com/Macrofold/OpenLegend/blob/5837c5b30c90dbb30bd26530d196197aa311b35d/docs/projects/vision-and-gaze-tech-design.md
[c-feature]: https://github.com/Macrofold/OpenLegend/blob/b242bee437f9e13801bfee77030efd309d88a35d/docs/projects/acoustic-stealth-feature-spec.md
[c-tech]: https://github.com/Macrofold/OpenLegend/blob/b242bee437f9e13801bfee77030efd309d88a35d/docs/projects/acoustic-stealth-tech-design.md
