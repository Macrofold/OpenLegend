# Attention and investigation — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Integrated design and preparation interfaces are complete; ATI01–ATI08 implementation and gameplay qualification remain open. | 2026-10-24 |

## 1. Authority, baseline and dependency reads

This is SAD-E. The [feature specification](attention-and-investigation-feature-spec.md) owns behavior and AJ01–AJ13. [ATI](../maintainers/attention-and-investigation.md) owns implementation, dependencies and unsatisfied acceptance; [world policy](../worlds/base/attention-and-investigation.md) owns methods/tuning; [limits](../limits/attention-and-investigation.md) owns restrictions. SC01–SC14 in the [shared technical design](stealth-awareness-tech-design.md#shared-contracts) remain authoritative. The notation below refines E-owned payloads in those contracts; it is design notation, not application code or a claim that the named proposed fields already exist.

The integrated [perspective](perspective-perception-tech-design.md), [vision and gaze](vision-and-gaze-tech-design.md), and [acoustic](acoustic-stealth-tech-design.md) contracts supply evidence, physical orientation and received sound. The owner audit below distinguishes existing foundations from the selected extensions; documentation integration does not establish runtime delivery.

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

Use **one optional finite attention control nested in its existing accepted-work owner**: ActivityExecution for a composed or standalone inquiry; the current Action for a compatible direct-action amendment with no activity; or NativeResponseEpisode for a memoryless animal. It is never stored in two places. A direct standalone watch can compile into a one-node finite activity without inventing an ActorGoal. Orient-once remains B's ordinary action/amendment and need not create an E control.

An action either owns the inline control or references its exact activity/episode control; it cannot do both. A compatible direct move/guard amendment preserves the existing action ID, route, progress, purpose, work generation and cooperation. It neither wraps/restarts that action nor creates a plan. The scoped attentionRevision is monotonic for the containing Action, ActorPlan/activity or NativeResponseEpisode lifetime. Real installation, accepted terms/extent/focus-policy change and removal (including expiry) advance it; ordinary progress does not. Preserve it on that existing owner while its optional control is absent; reinstalling on the same owner cannot reset it. A genuinely new owner identity can begin a new sequence. It is not an evidence revision, per-tick counter or replacement for B's separate orientation amendment. Existing plan/step/activity identity still fences activity-owned work.

**Facet lifetime is distinct from whole-plan lifetime.** The existing ActivityExecution.control deadline can cancel its plan; do not install an attached watch's shorter deadline there. Expiry/removal of an attached attention facet closes only its coverage, subscriptions and E-requested B maintenance, leaving the underlying move/guard/work action running. Its achieved pose remains unless another actually admitted operation changes it. Standalone observation can finish its own action/activity normally. The earlier of underlying work end, existing whole-plan termination or E's original deadline bounds the facet; none extends the others. Explicit across-step investigation retains its single activity-owned inquiry, with each step's actual coverage and gaps. Ordinary enqueue/replacement never silently promotes action-owned terms into a plan; explicit readmission is required and a continuing commitment retains its original deadline.

An attention control contains only what must continue: admitted method/pins, ordered focus bindings, optional supported predicate, original finite limits, selected loss rule, current focus/frontier progress and minimal predicate/disposition continuity. Existing plan status, action phase, interruption, elapsed work, outputs and result records remain their owners; do not duplicate them in another lifecycle field.

For a native animal without agency, the same trusted method/coverage evaluator reads the selected control in its **single native response episode**. Any actual observe/move action references that episode's control rather than copying it. A native settling episode can be physically alert without an Action; capture its actual body/method values and native episode, not a fabricated action.

### 2.1 Terms and spatial binding

The following names describe new E-owned closed shapes. Shared A/B/spatial types remain imported meanings, never redefined here.

~~~ts
type AttentionFocus =
  | {
      kind: 'travel-relative';
      yawOffset: number; // Radians in the admitted horizontal-motion frame.
      bodyAssist: boolean; // Explicit consent to B's qualified body turn.
    }
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
  concerns: readonly PermittedParticipant[];
  trigger:
    | { kind: 'none' }
    | {
        kind: 'event';
        predicate: RegisteredObservationPredicate;
        stopOnMatch: boolean;
      }
    | {
        kind: 'level';
        predicate: RegisteredObservationPredicate;
        initial: 'report-current' | 'changes-only';
        stopOn: 'never' | 'true' | 'false';
      };
  stop: {
    deadline: SimTime;
    maximumChecks?: number;
  };
  anticipation?: {
    dangerKinds: readonly DefinitionPin[];
    focusOrdinals: readonly number[];
  };
}>;
~~~

PermittedSpatialBasis is exactly one existing actor-authorized spatial selection/known-place observation, A FactKey for received location, or own accepted pose captured for a relative selection. It carries the original frame/time and source eligibility; it contains no hidden emitter pointer. Use existing SupportedRegion, Position and Direction representations, not proxy entities or a new geometry language. A historical received bearing and a one-time relative spatial selection stay fixed to their captured frame. A maintained travel-relative instruction is separately typed below; it never rotates historical acoustic evidence.

ExistingPermittedPhysicalTarget is the ordinary admitted current-body/object/surface reference with its exact life/observation binding. A current exposure or an ObserverSubject by itself is not that target. Each concern is an anonymous exposure, observer-local individual, supported known person or attributed description under A's PermittedParticipant. Selected concerns can share one or several foci; [ATI-L03](../limits/attention-and-investigation.md#ati-l03--selected-input-and-composition-envelope) bounds the two lists independently. These permitted associations do not form a belief graph or cap encountered dangers. Deduplicate only identical typed bindings with the same association support, preserving observer/life scope. Do not join different exposures, rival associations or local individuals through hidden entity equality or display names. An arrivals predicate can match newly observed visitors without appending each to the terms.

A method has at most one predicate, in its event or level trigger. Validate the predicate's registered kind; incompatible kinds/operands refuse. The same predicate can end the facet through stopOnMatch/stopOn; there is no second hidden termination predicate. Unknown cannot satisfy false. Named clock endings resolve to the original deadline. A method without a predicate still records its actual scoped observation/result.

Anticipation is an **accepted instruction to maintain a supported method**, not a factual claim that danger exists. Its registered danger-family pins and focus ordinals are explicit; no arbitrary prose “anything, anywhere” predicate is executable. Omitted anticipation means ordinary observation. A supported physical guard/offense/native-alarm method can supply preparation from its own accepted owner even without AttentionTerms.

Purpose stays in the existing plan/response binding. Source facts stay in A. Exact action/plan identity and actual pose stay in their owners. Do not save a copy of current sensory evidence in every control. Retain references and the minimal immutable contribution needed while an ongoing operation depends on it, under the existing evidence lifetime rules.

### 2.2 Maintained watch behind a traveler

A travel-relative focus uses the **actual admitted locomotion segment's nonzero horizontal direction**, never body facing, a future waypoint or an external source. The base rearward method selects yawOffset = π. At admission and a genuine route-tangent change, settle earned motion/pose first; derive desired world yaw from actual travel yaw plus the accepted offset, then bind that direction through B's existing captured-relative directive against the current body pose. Explicitly permitted body assistance, rig constraints and B/C movement costs remain authoritative. B still owns all turns and joint/body progress; E adds no pose state, steering loop or travel-heading field.

Only actual locomotion direction changes rebind this method through B's scoped compatible amendment. Turning the body to fulfill it must **not** regenerate “behind,” which would otherwise make the character chase a moving direction. A route corner ends the previous directional interval; the new interval begins only when its actual requirements are fulfilled. Rapid corners can leave real preparation gaps. Use existing movement-boundary invalidation and B's canonical physical progression, not an E gaze timer. Initial support is piecewise ground-route motion with a defined horizontal tangent. Curved, vertical or other motion providers must expose their own correct physical direction boundaries before this method is supported; E never repairs them with sampling. Preserve the original E deadline, action ID, route, costs and purpose.

With no admitted nonzero tangent at first admission, terms can be accepted on a qualifying move, but the method is unfulfilled with missing-travel-frame until real movement establishes it; never guess from body facing. At a temporary stop after a valid tangent, retain the last admitted goal/achieved pose and label its scope last-travel-direction, without claiming a new direction of travel. Ending/replacing the move ends its facet; a stationary watch requires selected continuation. Captured scopes include the actual own-motion bearing, selected offset, sample time and resolved desired direction, separately from any received cue. Fixed doorway and historical sound scopes remain fixed.

### 2.3 Association and uncertainty

Reuse A's FactKey, EvidenceTiming, PermittedParticipant, SourceAssociation and CapturedCurrentFacet unchanged. SourceAssociation.rememberedSubject remains the identity owner's serialized string key, not a raw entity ID and not an embedded ObserverSubject union. A suspected voice cannot become Talk.targetId, a physical chase target or a current attack target.

Spatial scope and identity concern are independent. A doorway can be selected from permitted geometry with no threat evidence. A warning can support an expectation about a region while its alleged person remains uncertain. An observation of Ada's voice does not refresh her earlier equipment, route or current action. A later recognized person does not retroactively fill a search gap.

For several danger hypotheses, retain each original support and uncertainty in A/encounter ownership; E can examine their common region or schedule distinct foci. Do not merge them by hidden producer identity, average opposite bearings into a false exact point, or serialize a backend threat list to cognition.

## 3. Admission and physical execution

### 3.1 One admission transaction

1. Resolve the exact actor, normalized physical life, controller and current work through ProspectiveWork.expected. Resolve permitted terms against the current observation/identity owner; validate installed method/predicate/definition pins and finite original bounds. Scan/visual watch needs a nonempty admitted focus list; an ambient listening hold may have none and then supplies no directional anticipation. Anticipation requires at least one valid active-focus ordinal and installed danger family. Reject duplicate/out-of-range ordinals and nonfinite geometry/time rather than broadening scope.
2. Determine the chosen continue/enqueue/replace/interrupt operation. Explain lost work, committed costs, suspended-plan consequences and recovery using the existing prospective-work owner. Selection is not acceptance.
3. Run the same read-only prerequisite calculation for menus, exact player requests, NPC offers, interpreted proposals and plan dispatch: scope access, sense/body, action-local pose/part/view requirements, tool/reach and existing consumable reservations, supported simultaneous combination and parameter/work-envelope limits.
4. Prepare required geometry/current facets through existing owners. Technical preparation is not elapsed fictional inspection and cannot inspect hidden truth for cognition. Incomplete work leaves admission pending or unavailable, without replacing existing work.
5. Recheck changed authority/work/source/policy after waits. Commit the selected activity/action and B directive together, or refuse atomically. No costs, RNG, events, IDs or interruption occur during preview.
6. Derive subscriptions from accepted work. Begin attention timing at actual admission; begin each method's **fulfilled physical interval** only when its required action phase/pose/senses are actually satisfied. Orientation/approach time is real but is not falsely reported as completed examination.
7. Record ordinary action outcomes and optional response reasons through their owners. An actor may say something even when its proposed observation is refused; admission does not fabricate a successful watch.

The same transaction admits an initial **Walk while watching** request: one permitted destination, finite watch/anticipation terms and the required compatible orientation bind one ordinary move with its inline attention control. The review shows the combined scope, deadline and movement/pose consequences before admission. A player need not first start walking or later restart released keyboard input. A later switch to direct steering follows the same compatible movement amendment and retains the watch's original deadline. If any required part is unsupported or incomplete, the combined request refuses or remains pending without partial movement/watch admission.

A compatible orientation amendment uses B's scoped amendment revision; it must not advance whole-action replacement generation and accidentally cancel cooperation. E additionally binds changed attention terms through attentionRevision and the containing owner's exact action or plan/step/activity/episode identity. A truly replaced action uses ordinary generation/recovery rules.

### 3.2 Narrow simultaneous combinations

Use B's one optional action orientation record, with at most one directive per installed independently steerable gaze group. It owns goal, group/lead receptor, head-only or explicit body assist, action/activity binding, original progress, finite extent and loss. The E control owns inquiry/notification/facet-local deadline. An action with a composed inquiry points to its exact plan/step/activity control; an amended direct action owns the same shape inline. Both use the exclusive ownership rules above. Initial E methods direct one selected focus at a time; installed independent receptor groups may jointly serve it. Concurrent distinct-focus methods require a later qualified family.

A walking action can carry the selected observation facet if its descriptor permits it. A stationary observe action occupies the primary lane. Finite scans are ordinary sequence/observation phases; walking scans use the same move action's qualified orientation facet and finite progress, not two concurrently executing activity nodes. Do not add a general parallel combinator.

| Combination | Exact rule |
| --- | --- |
| Walking + head/eye monitoring | Preserve route/destination/purpose and actual locomotion. Admit only within B rig constraints. A travel-relative focus follows actual route-tangent changes through section 2.2; ending the facet does not end walking. |
| Walking + body-assisted rearward look | Requires explicit compatible movement choice. B/C apply actual turning, side/back speed and costs once. |
| Stationary guard + head-only look | Preserve guard body/shield facing, preparation/deadline/recovery. E reports its real visual scope separately from defense. |
| Guard + conflicting body turn | Refuse compatible amendment; an explicitly chosen replacement follows guard cancellation and recovery. |
| Aim/precise tool contact + conflicting view | Refuse or explicitly interrupt. View-required work waits for its actual view; merely retaining the tool does not continue progress. |
| Repeated work with safe observation breaks | Compose work step → look/observe → next work step. Partial steps follow that family's real restart/spending semantics; no fractional-progress preservation is assumed. |
| Speech during observation | Preserve current speech rules. Instantaneous speech is a real acoustic occurrence, not a fabricated continuing voice lock. |
| Unsupported producer or body freedom | Return unsupported capability; no new sensing, material test, limb or stamina law from the action's name. |

Bind the control to the exact B directive/amendment and whether E installed it or only borrows an already compatible action-required directive. A borrowed directive keeps its existing owner and lifetime. On facet termination, remove maintenance only if the current directive is still owned by that exact E control/amendment; never cancel a borrowed or subsequently replaced directive. Shared admission must explicitly end/replace an incompatible E facet before accepting a conflicting later look, preserving compatible base work. These are bindings in the existing records, not a lease store or stacked executor.

B's orient-once completion leaves achieved pose. Maintained directives stop at their containing action or original extent. Lost tracking follows the explicitly accepted stop/hold rule; restoring old terms does not reacquire a hidden body. Eye/head-only look has no additional effort tax selected here. Fatigue, injury and fear alter compatibility only through their actual installed effects.

### 3.3 Method semantics

**Look** requests B's physical orientation, which alone grants no detection or anticipation. **Scan** visits a finite ordered focus list; each dwell starts after actual alignment/required view availability, ends at its real boundary and consumes the original remaining limit. Movement, current gaze and sensed facets remain canonical B/A values.

**Listen** uses C's existing physical provider without an E measurement timer or detection multiplier. Actual new emissions, physical changes and legitimate continuous support can produce new A evidence. Stopping work only changes noise if that action was really emitting; current instantaneous speech does not become an ongoing noise source. C's sampled continuous sound can miss/delay narrow passages; a completed E listening interval retains that limitation. A stronger listening instrument/provider requires its own later C/A contract.

**Inspect** selects a supported observation family. Exterior visual examination requires the current view; a written record, accessible container or known instrument uses that family's exact disclosure, reach, duration and cost. No full hidden inventory, inscription, internal part or recipe is granted by visual selection. Tools or experiments that alter an object are separate admitted operations with actual permission/material/risk.

**Monitor** evaluates a registered observation condition against permitted evidence, or listens for actually acquired events. **Investigate/search** composes these methods and ordinary movement/inquiry. Its desired answer is chosen meaning; success comes only from supported results. Asking a person waits for their actual independently chosen reply, not a native callback claiming their answer.

## 4. Monitoring and search continuation

### 4.1 Event and level subscriptions

Required method, coverage and stop predicates run at the existing domain action, acquisition and temporal boundary. Derived EPR/interests/ActorWork subscriptions notify optional semantic reconsideration; they do not gate native completion or expiration. Scope subscriptions to the exact active owner; they are disposable dependency indexes, never evidence or continuation authority.

| Dependency | Producer and handling |
| --- | --- |
| New acquired occurrence, changed facet/association or revoked support | A supplies exact reference and eligible meaning; optional wake hints coalesce. |
| Own action/plan/attention amendment, accepted purpose or real result | Agency/action owner updates only affected subscriptions; own thought text alone is not fresh external evidence. |
| Actual pose/rig/sense/capability and relevant environment change | B/C/A update required physical coverage; E consumes their result instead of polling geometry. |
| Supported predicate prerequisite or access change | Owning observation/action family invalidates its result, with unknown/incomplete distinct from false. |
| D's due appraisal review | Existing cause/revision/deadline/finite allowance enters ActorWork; no attention-owned emotion timer. |
| Dwell, original deadline, actual condition crossing or native episode review | Existing simulation boundary/due owner; no wall-clock or browser timer. |
| Life/control/timeline/definition change | Existing lifecycle/authority transition invalidates affected work and derived subscriptions. |

Event watches act on a new acquired contribution once, using its actual identity. Level watches retain only their last completed truth, last qualified interval and emitted transition/disposition in the existing activity control. The installed predicate provides hysteresis/dwell where needed; E does not add universal salience thresholds. Initial true levels follow the admitted report-current/changes-only choice for both reporting and predicate-driven stopping. Changes-only establishes its first complete baseline without reporting or stopping; later true/false transitions can qualify. After a coverage gap, a supported recovery result may say now-observed, never invent an unobserved crossing. Unknown or incomplete supplies no false/clear interval. Losing support ends fulfilled coverage immediately and resets continuous dwell; later true support is a coverage recovery, not invented new physical occurrence.

Unchanged level evaluations emit no result/event/decision. A change may create an actor-private observation result or satisfy an already admitted branch. It never authorizes an unselected attack, another person's reply or new material spending. Exiting an activity unregisters its future dependencies; retained history remains with action experience.

### 4.2 Investigation frontier and negative evidence

Use the existing activity frontier plus a bounded selected-search payload: exact admitted region/method/query, current page cursor, checked work-unit references, remaining original time/check allowance and emitted terminal disposition. Do not maintain an indefinitely growing live investigation diary.

The initial search families are (1) current permitted exterior-object observations, (2) accessible container/record inspection through their existing query/action owners, and (3) an explicitly selected finite sequence of permitted vantages with actual scan/listen checks. Each uses the owning query's stable cursor/order; exterior candidates come from A's current permitted exposure scope, ordered by existing typed reference order, never a new hidden-world object query. Do not invent a region grid or certify full-room absence. A request for unsupported complete area coverage returns its available partial method for acceptance or refuses unchanged.

A work unit is one actually reachable, permitted object/part/surface or a subregion whose existing observation provider supports the claimed coverage, plus its observation method. Enumerate before hydration through current scoped spatial/container/knowledge queries. Candidate positions are **chosen vantage points**, never estimates silently treated as the hidden source. Do not query an invisible emitter's route. Method-specific spatial enumeration has a finite step allowance, deterministic continuation and a truthful incomplete outcome; a geometric refusal cannot reveal the hidden obstruction.

A check allowance is consumed once when a physical observation attempt is admitted, including a later real blocked/interrupted outcome. Preview, duplicate receipts and unfinished technical preparation consume no extra check; they cannot grant results or reset the original deadline. Rechecks are new admitted attempts within the same original allowance.

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

Use the single installed native-response controller. Physical acquisition, retention, language capability and controller selection remain independent. A owns acquired sound classification; C owns acoustic alarm eligibility and its pattern/presence policy. A memoryless animal does not require human history or paid intake.

Priority is the existing required body/lifecycle and territorial/alarm arbitration, then an already accepted compatible curiosity continuation, then a newly eligible optional curiosity method, then ordinary routine. At a sealed physical boundary, complete required cue/danger intake and its alarm arbitration before starting optional curiosity. With no higher-priority work and no active curiosity, choose the first eligible new acoustic cue in canonical acquisition order. Other eligible cues receive a considered-busy curiosity disposition through the same slot/result owner; they do not queue approaches or replace the selected episode. An already active compatible curiosity similarly continues without resetting its original cue/deadline. A qualifying alarm preempts curiosity before optional approach; danger never waits for a curiosity dwell to finish. Preserve the existing complete locally perceived danger set, route safety and motion ownership. No nearest-danger cutoff is introduced.

Add mutually exclusive curiosity modes to the existing NativeResponseEpisode: curious-observing and curious-approaching. Their typed payload contains the installed curiosity method, exact acquired cue/retained immutable contribution, historical scope, original end/check limits, current stage and exact ordinary movement/action reference. Alarm modes retain their existing data. Transition to alarm ends curiosity terms and observation coverage in the same owner; there are not two active episodes moving one animal.

The selected method is: one short observation hold; one safe ground approach if an eligible candidate exists; one final hold; end. It consumes real time/motion and uses actual receptor orientation where the body supports it. An unlocalized cue selects observation-only. If no candidate is eligible, finish with the completed first hold's observation-only result. A route that is physically refused or lost after movement admission records blocked/partial. Only unfinished required calculation remains incomplete and retains its continuation. None supplies a hidden source location or forces escape. On completion, use the existing routine-return owner once, without replaying its RNG scheduling.

Extend **the same NativeResponseState acoustic-pattern value**, preserving C's key and alarm semantics, with two independent optional slots: alarm { latestCue, idleExpiry } and curiosity { latestCue, idleExpiry }. The existing alarm fields map to the alarm slot; no second map, result diary or new source key exists. C tests only its alarm slot. E tests only its curiosity slot. A curiosity-only entry cannot suppress a later alarm. Evaluate C alarm eligibility first: a cue meeting it is never a curiosity candidate, even when its alarm transition is repeat-suppressed. Actual bodily/territorial danger and newly qualifying alarm preempt curiosity through the existing episode/action cancellation owner.

The first curiosity profile is acoustic-triggered only. It considers a newly acquired acoustic occurrence or genuinely new absent-to-present hearing-envelope onset allowed by its installed profile. A current visible object may guide a vantage only if A legitimately associates it with that same triggering cue; standalone visual-object curiosity needs a later supported onset/disposition adapter. Confirmation, reclassification, query, expiry, routine return and restore create no onset. Keep the consumed-curiosity-onset receipt alongside C's existing per-ExposureRef presence/native acquisition record until actual loss; do not add a presence map. A real later absence-to-presence transition may qualify, subject to a still-live curiosity slot.

Prune each slot independently at idleExpiry <= acquisition time; expiry itself schedules no behavior, and remove a key only when both slots are absent. A repeat updates only its own slot's latest cue and absolute idle expiry, never the episode deadline, route, safe-settling clock or RNG. The world separately pins curiosity's idle duration. Retain an active episode's minimal cue independently. Save exact keys, slots and presence receipts; count the additional bytes in C/native retained-work reservations. No top-N eviction may rearm evidence. Required admission/preparation exhaustion remains incomplete before mutation, not a harmless/ignored finding. This additive C/E adapter is an integration obligation on the existing owner, not a redefinition of C's shared physical/acquisition contract.

An active episode may retain the minimal immutable cue needed after optional sensory-cache expiry. That is existing operation continuation, not renewed observation. Hidden source disappearance gives no new knowledge. Capability loss, body replacement and control transfer end applicable native work; no automatic transfer to a person's mind. Sleep remains governed by existing eligibility; sound waking, distress calls, learned animal language, scent, packs, general flight curiosity and complex hunting search are outside this selected family.

## 7. Exact preparedness-evidence interface

### 7.1 Boundary and types

F retains SC12 VictimPreparationSnapshot and SurpriseDecision. E supplies **CapturedPreparationState** and **ExistingActiveWorkRef** below; it does not replace the envelope, select CapturedWarningFact, decide surprise or define damage. Shared EvidenceRef, FactKey, EvidenceCut, CapturedCurrentFacet, DefinitionPin and spatial types retain their existing/A/B meanings. Names prefixed Existing denote immutable projections supplied by the named canonical owner, not a claim that identically named exported types already exist. Reuse exact current types where applicable; otherwise implement the narrow projection listed below within that owner's integration, without new state or registration owners.

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
        revision: number; // Captured freshness, not a reason to break physical work.
        stepId: string;
        activityKey?: string;
      };
      attentionRevision?: number;
      orientationAmendment?: number; // B's distinct scoped revision.
    }>
  | Readonly<{
      kind: 'native-response';
      actor: ActorLifeRef;
      episodeId: string;
      profile: DefinitionPin;
      attentionRevision?: number;
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
      kind: 'own-motion-relative';
      motionBearing: Direction;
      sampledAt: SimTime;
      yawOffset: number;
      desiredWorldDirection: Direction;
      basisState: 'moving' | 'last-travel-direction';
    }>
  | Readonly<{
      kind: 'observed-subject';
      target: ExistingPermittedPhysicalTarget;
      current: CapturedCurrentFacet & {
        value: Extract<SensoryFacet, { kind: 'location' }>;
      };
    }>;

type PreparationTermination =
  | Readonly<{ kind: 'deadline'; at: SimTime }>
  | Readonly<{
      kind: 'existing-owner';
      owner: 'action' | 'native-response';
    }>;

type PreparationRemaining =
  | Readonly<{ kind: 'exact'; seconds: number }>
  | Readonly<{ kind: 'estimate'; seconds: number }>
  | Readonly<{
      kind: 'unknown';
      reason: 'moving-goal' | 'condition-dependent';
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
      remaining: PreparationRemaining;
    }>
  | Readonly<{
      kind: 'unfulfilled';
      since: SimTime;
      reason:
        | 'turning' | 'lost-required-observation' | 'incompatible-work'
        | 'lost-capability' | 'blocked-method' | 'physical-recovery'
        | 'missing-travel-frame';
    }>;

type CapturedOwnPreparationBody = Readonly<{
  actor: ActorLifeRef;
  position: Position;
  bodyHeading: number;
  pose: ExistingResolvedOwnBodyAndReceptorPose;
  posture: ExistingAdmittedPosture;
  poseRequirements: ExistingCapturedPosePartAndViewRequirements;
  restrictions: readonly ExistingPhysicalWorkRestriction[];
}>;

type CapturedPreparationPhysical =
  | Readonly<{
      family: 'observation';
      body: CapturedOwnPreparationBody;
      activeFocusOrdinal: number | null;
      focusBinding: 'current' | 'last-permitted-fixed' | 'last-travel-direction';
      orientation: ExistingCapturedOrientation | null;
      observationMethod: DefinitionPin;
      senses: readonly DefinitionPin[];
      coverage: readonly ExistingCapturedProviderCoverage[];
      compatible: boolean;
    }>
  | Readonly<{
      family: 'shield-guard';
      body: CapturedOwnPreparationBody;
      guard: Readonly<GuardState>;
      shield: ExistingAdmittedItemReference;
      coverageDegrees: number;
      equippedAndCompatible: boolean;
    }>
  | Readonly<{
      family: 'ranged-aim';
      body: CapturedOwnPreparationBody;
      aim: Readonly<AimState>;
      actionStage: 'approaching' | 'working';
      remainingPreparationSeconds: number;
      totalPreparationSeconds: number;
      target: ExistingPermittedPhysicalTarget | null;
      prerequisites: ExistingCapturedAimPrerequisites;
    }>
  | Readonly<{
      family: 'strike';
      body: CapturedOwnPreparationBody;
      strikeDefinition: Readonly<{ id: string; version: number }>;
      weapon: ExistingAdmittedItemReference | null;
      actionStage: 'approaching' | 'working';
      strikePhase: 'windup' | 'recovery' | null; // Null: ordinary unphased timed work.
      remainingPhaseSeconds: number;
      totalPhaseSeconds: number;
      target: ExistingPermittedPhysicalTarget | null;
      combatReadyAt: SimTime | null;
    }>
  | Readonly<{
      family: 'evasion';
      body: CapturedOwnPreparationBody;
      evasion: Readonly<EvasionState>;
      trajectory: ExistingAdmittedOwnTrajectory;
    }>
  | Readonly<{
      family: 'native-alert';
      body: CapturedOwnPreparationBody;
      mode: 'escaping' | 'settling' | 'blocked';
      episodeStartedAt: SimTime;
      reviewAt: SimTime;
      clearSince: SimTime | null;
      settlingSeconds: number;
      movement: ExistingCapturedNativeMovement | null;
      dangers: readonly ExistingCapturedPermittedDanger[];
      alertConstraints: ExistingCapturedNativeAlertConstraints;
    }>;

type CapturedPreparationState = Readonly<{
  work: ExistingActiveWorkRef;
  kind:
    | 'observation' | 'anticipation' | 'defensive-action'
    | 'committed-combat-work' | 'native-alert';
  admittedAt: SimTime;
  currentMethodStartedAt: SimTime | null;
  termination: PreparationTermination;
  fulfillment: PreparationFulfillment;
  lastBreak?: { at: SimTime; reason: PreparationBreakReason };
  scopes: readonly CapturedAttentionScope[];
  expectedDangerKinds: readonly DefinitionPin[];
  concerns: readonly PermittedParticipant[];
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

declare function capturePreparation(
  actor: ActorLifeRef,
  cut: EvidenceCut,
  admittedPreparationFamilies: readonly CapturedPreparationPhysical['family'][],
): PreparationCapture;
~~~

The synchronous producer query is **capturePreparation(actor, cut, admittedPreparationFamilies)**. Arguments contain no attacker to discover and no global threat search. admittedPreparationFamilies is the complete validated family set derived from the installed action/observation/native descriptors, not a caller-selected filter for omitting applicable required families. Reject a mismatched set through existing admission; missing required support cannot become an empty contribution. F can match the complete immutable contribution to its actual outcome under F's policy. An absent optional family yields a complete empty contribution; required physical/effect/evidence preparation still unfinished yields incomplete and holds the dependent outcome. Invalid current-format state fails through owning validation; never return empty to disguise it.

`currentMethodStartedAt` is copied from the actual physical family on its existing owner. It is null until that method begins, is preserved across preparing → maintaining, and resets only after a genuine break, replacement or restart. A harmless plan revision does not reset it. Approach and general action admission are not method start; `maintainedFrom` separately records continuous current fulfillment. Each physical family has its own anchor even when a guard and head watch share one action. F combines this actual start with the family's own stricter readiness and its authored lead.

**Identity and chronology rules.** physical.family selects trusted projection code; it is not a new authored world definition. Preserve actual method/profile/definition identity in each family arm, including EvasionState.profile's existing contentLabel string. Required adapters come from the existing installed family descriptors; no capture-definition registry is added. An Action has no general revision or admission timestamp; the new scoped attentionRevision is explicitly E-owned, and initial adapter implementation must record missing **admission, current-method start, continuous fulfillment and latest break timestamps within that existing action/preparation/native owner**. Reuse existing semantically identical times where present. Never derive elapsed preparation from Action duration, native episode.startedAt, navigation proposalGeneration or an arbitrary last tick. Native mode changes and physical loss/recovery establish real boundaries; current-format restore requires those selected fields rather than inventing a historical interval.

PreparationRemaining.seconds is finite, nonnegative **simulation duration**, not an absolute time or authored normal-speed duration. An exact guard/phase deadline can produce exact remaining time; moving/tracked B goals can have only an estimate or unknown. Estimates confer no earned fulfillment. E watches/curiosity always use deadline termination. Existing guard, ranged preparation and strike retain action-owner completion/cancellation/prerequisite rules, including approaches whose completion time is unknown; condition-governed native alarm retains its native owner. Evasion can use its actual endsAt. Phase timing remains separate from work lifetime: guard.expiresAt ends protection and starts recovery, while its action may continue until recoveryUntil. The corresponding physical arm carries those dates/prerequisites. This neither imposes new timeouts on existing actions nor permits infinite new E watches.

**Exact owner payload requirements:**

| Payload | Required values and source |
| --- | --- |
| CapturedSpatialBasis | Copied admitted spatial selection or original A location facet; its FactKey when evidential, original measurement/acquisition/frame and uncertainty. Own/known-terrain selection needs no invented warning. |
| Own body / orientation / provider coverage | B/C's actual own body, joint/receptor pose, accepted directive and achieved progress; B/action-local pose, part and view requirements plus actual physical restrictions; A/B/C's completed evaluated interval/scope/fidelity, including unsupported/unavailable sense distinctions. Desired pose is separate from achieved pose; no new E measurement or negative-certainty certificate. |
| GuardState | Exact existing phase, profile, physicalLife, facing, readyAt, expiresAt and recoveryUntil when present; actual admitted shield coverage/equipment compatibility. Preserve guard authority independently of head observation. |
| AimState | Exact sourceLife, tool, ammunition, reservationId, manual/ready and permitted observedMotion when present. Copy current work preparation, target authorization and required tool/ammunition/view/capability facts, including action.rangedPolicyPin and its resolved eligibility where that family uses it. No extra damage/flight-policy snapshot, manufactured start timestamp or hidden target repair. |
| Strike / evasion | Strike copies its nonnull definition id/version, weapon reference or null, actual action stage, strikePhase or null, remaining/total phase or unphased work timing, combatReadyAt and permitted target or null. Natural strikes still have an exact definition; null phase means ordinary timed work, not invented windup/recovery. Evasion copies sourceLife, profile content label, startedAt, endsAt, repeatAt, speed and actual trajectory. None automatically implies defensive readiness. |
| Native movement | Null for legitimate stationary alert; ground carries the exact ordinary Action reference and trajectory plus episode support; flight carries its actual existing flight reference/progress. Do not fabricate an action for settling or stationary blocked behavior. |
| Native alert constraints/dangers | Installed method's actual consciousness, required sense/body eligibility and relevant pose/movement restrictions, separately from controller mode/route block. Dangers are the complete **observer-permitted** estimates with their original observations/confirmations and uncertainty, not all nearby world bodies or refreshed hidden positions. |
| PreparationBreakReason | Existing terminal/interruption reasons plus coverage loss, changed focus/terms, missing travel frame, lost capability, expiry and explicit stop. Preserve voluntary, automatic and technical causes; no invented choice to stop. |
| Facts/current confirmations | Exact immutable A-permitted values acquired within this cut, with their original support. Measured value intervals and confirmed-availability intervals are distinct and both survive capture. |

B's pose/part/view compatibility evaluator remains authoritative; this capture adds no body-resource claim scheduler. Existing consumable reservations remain in the families that use them, such as ranged aim.

The initial closed adapters are observation, shield guard, ranged aim, strike, evasion and native alert; no arbitrary flags map or inferred action-name semantics is allowed. Register an adapter only after its producer can supply all required current values. Internal own-body state is legitimate native input, never permission to fetch an enemy's hidden state or publish private work.

**Current scope, not the plan.** An observation record contains only the actually active focus and its fulfilled/being-prepared scope. For anticipation, intersect that active ordinal with anticipation.focusOrdinals; omitted/unvisited/previous scan foci grant no current coverage. Relevant expectedDangerKinds apply only to that selected active anticipation; an ordinary observation record has an empty list. Changing focus closes that directional interval and begins another only at real fulfillment. A previously checked doorway stays historical support, not current vigilance. A desired travel-relative direction or watched region is paired with actual pose/coverage/fulfillment and cannot be mistaken for physically achieved coverage.

One guard action with a compatible head watch may produce **both guard and observation records**, each with its own actual method/scope/continuity. Deduplicate workSupport identities and repeated projections of the same family, not distinct family evidence merely sharing actionId. Sort capture deterministically by existing work identity and the closed physical.family order declared above. Between activity steps, plan intent without actual observe work supplies no preparation record; an explicitly supported native stationary method can supply one with an episode-only reference even when actor.action is null. Blocked locomotion neither proves nor disproves actual sensory alert; evaluate its installed method constraints separately. Any real animal gaze turn still goes through B's action/orientation owner.

Resolve observed-subject scope through the same admission/capture focus resolver: require an A location facet bound to the exact permitted target and physical life. A detection/detail facet or location alone cannot grant target authorization.

Copy/freeze the resolved native values once. Mutable action/directive/episode/pose pointers or later reacquisition violate the cut, even if their IDs match.

### 7.2 Capture algorithm and temporal boundaries

Steps 1–2 belong to the existing outcome coordinator; steps 3–6 are the read-only capture query; step 7 is F's consumer. capturePreparation and its family adapters never advance the world, expire work or acquire evidence.

1. The coordinator settles admitted movement, turns, due effects, action transitions/expiry and observation through the common pre-outcome boundary. Complete required A/B/C work once through their canonical owners before capture.
2. Obtain A's exact acquired membership and resolved values for EvidenceCut. lastIncludedOrder is not a membership filter; an earlier event acquired later is absent.
3. Resolve this life/controller's current action and relevant active plan/native episode through existing identity lookups. A suspended, finished, cancelled, expired or unmatched reference is not active work. Legitimate stationary native methods use their episode directly; do not require actor.action merely to include them.
4. Read the already-settled lifetimes and phases. Finite active intervals are half-open: **[start, deadline)**. At equality a finite watch has ended; at guard.expiresAt protection has ended and the recovery action may remain as unfulfilled physical-recovery work. Existing action/native lifetimes follow their owners, not an invented deadline. A newly accepted same-time action contributes zero elapsed preparation.
5. Derive fulfilled physical method intervals from actual execution. Copy current scope, selected anticipation, physical values, evidence and last genuine break once. Deduplicate identical work references/repeated family projection while retaining independent guard/observation contributions from the same action.
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

[Preparedness and surprise](preparedness-and-surprise-tech-design.md#active-preparation-and-matching) selects lead time, method/danger/approach matching, uncertainty treatment, disengagement hysteresis and finite warning lifetime. E supplies the actual start/end/gap/scope values for that policy; it does not calculate the surprise result. Guard expiry does not erase memory, but memory alone cannot recreate active guard coverage.

### 7.4 No emotional feedback around one hit

Read only pre-existing D mechanical/condition values at the specified physical/action/capture boundary. A prior feeling can influence chosen preparation or a supported method constraint without supplying attack direction. Resolve F's hit before its new shock or interpreted fear. A later choice prompted by that fear can establish later work; it cannot move maintainedFrom backward or revise the earlier cut. Two attacks with equal simulation time still follow canonical order and independent actual-victim cuts.

## 8. Lifecycle, persistence and disclosure

| Boundary | Required behavior |
| --- | --- |
| Ordinary progress/completion | Keep original limits; settle actual observation/action results once. End subscriptions/maintenance at facet expiry without ending compatible underlying work; owner completion closes all dependent facets. |
| Compatible amendment | Preserve unrelated route/cooperation/material work; update exact attention terms/amendment dependencies. Changed coverage starts at the real change. |
| Interruption and pause | Suspend only supported work; end its coverage. Preserve original deadline, prior checked units, outputs, costs and interruption flag. Restart unfinished physical step on resume where the owner requires. |
| Attack | The contact owner determines actual interruption after the pre-hit cut. A compatible surviving watch remains real; no unconditional detection-to-cancel rule. |
| Lost sight, ambiguous crossing or source departure | End affected live authorization; keep only explicitly admitted fixed last-permitted scope. No hidden reacquisition or knowledge that an unseen source died. |
| Incapacity/sleep/body death | Apply actual sense/work eligibility. End impossible work; historical outcomes persist. No sound waking or transferring old-life preparation to a replacement. |
| Controller/participation change | Retire pending old-controller choices and native work as existing policy requires. A human gets no background AI attention without authorization. |
| Definition/permission/evidence edit | Revalidate affected executable terms and supports through their owners. Unsupported or revoked continuing use ends/blocks honestly; committed effects persist. |
| Save/reopen | Capture exclusive owner/reference placement, attentionRevision, pins, distinct original facet/whole-work deadlines, frontier/check/disposition state, physical progress and immutable contributions together. Rebuild only derived indexes. |
| Unavailable model/storage/physical preparation | Distinguish optional decision failure from required native incompleteness. Preserve coherent required state and evidence; do not fabricate refusal, no finding or safety. |

Use the existing current-format record schema and serializers; no new DB/table/scheduler is justified. Persist attention fields nested under their exclusive activity, direct Action or native response ownership and result coverage under action/experience. A owns saved evidence/familiarity; B owns pose/directive timing; C owns sound/anchor continuity. Avoid double-saving the same current pose or acquired fact.

Current-format validation checks forward and reverse work ownership; exact life/action/plan/step relationships (stable plan ID plus step/activity key for ownership, current plan revision for captured freshness); installed method/predicate support; focus ordinals and permitted reference kinds; finite ordered times and original deadline; cursor/check allowance consistency; pending node/execution relationship; action-owned versus reference-only exclusivity; attentionRevision; distinct facet/whole-plan deadlines; and matching native movement/episode. Reject dual or dangling ownership rather than inventing a wrapper or silently repairing it. An unrelated plan revision, such as enqueueing future work, does not break a valid physical watch; reciprocal ownership updates must remain atomic. An ended historical result may outlive its source or removed method without authorizing resumption. Restore cannot reconstruct missing terms from prose or silently repair malformed active work.

Pause freezes simulation time, not future real account deadlines. Restore grants no offline observation, paid retry, extra dwell, new acquisition or new normal-clock conversion. Preserve B's original steering phase and C/A progress. Existing pending-presence handling prevents transport reset alone from cancelling restored physical work; genuine departure still applies before further simulation.

Own activity inspection can show accepted terms, progress, actual remaining work and permitted results. Another observer sees only A/B-acquired physical facets: head/limb posture, visible movement/equipment or actual speech. Do not serialize private predicate, suspected person, danger kinds, expected direction, fulfillment values, exact fear, work internals or readiness. Recheck current observer/control/privacy/timeline after asynchronous reads; invalidating caches alone does not fence an in-flight response.

## 9. Scaling and failure bounds

[ATI-L03–ATI-L05](../limits/attention-and-investigation.md#ati-l03--selected-input-and-composition-envelope) owns input limits, search pages/check allowances, continuation quanta and retention. Apply them to each exclusively owned active control; a suspended plan remains intent only. Exhausting a search allowance returns partial coverage. Yielding required work preserves its native continuation rather than dropping observations.

| Growing work | Shared preparation / selection | Invalidation / overflow |
| --- | --- | --- |
| Active actors and focused work | Existing active-owner membership and due indexes; visit only changed dependencies or due boundaries. | Whole population remains a real growth dimension; no all-history scan per watch/tick. |
| Relevant evidence notifications | A's exact actor-local sources and EPR coalesced wake; no separate source copying. | Required facts preserved; optional reconsideration coalesces and exposes pending/attempted status. |
| Search candidate enumeration | Select scoped IDs before metadata/geometry hydration within ATI-L04's page and checked-work allowances. | Continue incomplete technical work or end selected partial search; never silently claim complete coverage. |
| Pose/sensory computation | B/C/A canonical evaluation/dirty scopes, same-phase immutable preparation. | Their native coherent-prefix hold; no extra attention sampling loop. |
| Snapshot capture | Exact current action/plan/native lookup plus already prepared pertinent support. | Linear in actual active methods and required acquired support; no top-N threat truncation. |
| Retained search/action history | Existing paged action/experience storage and actual retention/correction rules. | No new total-history cap selected; accumulated history remains a storage-growth dimension, not per-cue hydration. |
| Dense legitimate alarms/observers | Existing complete native transition work and shared conservative spatial queries. | Backpressure/owed time, not disappearing cues or omitted victims. |

Do not bound a query merely by limiting the number of returned findings. Count candidates visited, exact physical evaluations, subscribed owners, emitted/coalesced reasons, selected/hydrated bytes, retained control/history size and required queue age. Test cold restore separately from warm unchanged work, dense living bodies separately from inert scenery/history and concentrated dependency changes separately from ordinary travel.

Measure the real caller from action offering/admission through native execution, storage and projection; optional model costs/latency are separate. No population/FPS target is invented by this design. There is no new stress run in this documentation task. ATI08 requires actual scoped qualification before implementation completion.

## 10. Delivery modules and paper acceptance

[ATI01–ATI08](../maintainers/attention-and-investigation.md) owns the implementation sequence, dependencies, parent work and exit criteria. The paper cases below must remain covered during implementation.

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

## 11. Implementation dependencies and open player choice

**The selected attention semantics and shared technical choices are settled.** Runtime delivery depends on the following existing-owner extensions:

1. **Exact evidence revisions.** SC02 preserves each source family's exact numeric native or string personal-source revision. E compares that tagged value without digest coercion or another attention-wide counter; SA-D02 is resolved.
2. **Physical composition.** B's orientation and C's posture/motion accounting supply actual compatible movement, costs and view. Unsupported combinations refuse through ordinary admission.
3. **Preparation capture.** Section 7 supplies all six actual physical families, including `currentMethodStartedAt`. F owns matching, lead, warning continuation and surprise. SA-D03 is resolved; these adapters remain unimplemented.
4. **Controlled-player interpreted emotion.** SA-D01 remains open for creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control transfer. E reads only effects authorized by the eventually selected policy. Native body effects, NPC choice and this design proceed independently.
5. **Observable preparation and flight.** B measures actual visible pose/motion and A records acquired support. Their physical details, never private action-stage labels, feed the world's danger adapter.
6. **Ordinary surfaces.** G presents accepted/pending/refused combined work, actual scope/time and permitted findings across full views, patches and history. Camera/selection callbacks create no sensing or commitment.
7. **Listening and animals.** Listening retains C's provider fidelity. E's opt-in ground curiosity shares C's existing pattern/presence owner with independent alarm and curiosity slots; alarm eligibility has priority. No additional sensing gain or controller is implied.

## Maintained records

- Behavior and complete actor journeys: [Feature specification](attention-and-investigation-feature-spec.md).
- Work, pinned dependencies and unchecked acceptance: [ATI tracker](../maintainers/attention-and-investigation.md).
- Methods/timing/curiosity choices: [World profile](../worlds/base/attention-and-investigation.md).
- Limits and growth: [Attention inventory](../limits/attention-and-investigation.md).
- Existing contracts: [Action capabilities](../action-capabilities.md), [action experience](../action-experience.md), [agency](../agent-agency.md), [memory](../memory-architecture.md), [EPR](../events-perception-and-reactions.md), [identity](../identity-and-references.md), [spatial](../spatial-world.md), [time](../simulation-time.md), [save/load](../save-and-load.md) and [attention/scenes](attention-and-scenes-tech-design.md).
