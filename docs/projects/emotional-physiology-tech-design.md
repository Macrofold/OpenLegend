# Emotional physiology and adaptive reappraisal — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Technical design is complete; EP01–EP09 implementation and qualification remain open, with SA-D01 explicitly unresolved. | 2026-10-20 |

## Authority and delivery boundary

This is SAD-D’s technical contract under binding [SC08–SC09](stealth-awareness-tech-design.md#emotions-and-reconsideration), SC12 ordering and SC13–SC14 lifecycle. The [feature specification](emotional-physiology-feature-spec.md) owns product behavior; [EP00–EP09](../maintainers/emotional-physiology.md) owns delivery and selected ND11/ND19 scope. Source inspection used Macrofold/OpenLegend `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. Contracts below are designed extensions, not implemented APIs or qualified gameplay. Update current owners/readers/writers together; add no legacy support, parallel emotion store, general expression evaluator or scheduler.

## Existing owners and required extension

| Owner | Inspected baseline and selected responsibility |
| --- | --- |
| `packages/domain/src/appraisals.ts` | Owns private records, exact cause identity, target/cause stacking, scaled/qualitative values, source binding, expiry/decay and creation outcomes. Preserve create/reframe/resolve; add a distinct source-bound reassessment operation and optional review progress on the existing appraisal record. |
| `packages/domain/src/appraisal-index.ts` and appraisal residency | Own active scoped membership and due boundaries. Extend those indexes for review deadlines; complete mechanical reads cannot use the first 24-record display/reflection prefix. |
| Body/status/state-contribution owners | Own exact-life physical effects and their lifecycle. Add only the missing numeric-parameter contribution support and startle family; memoryless actors cannot pass through the appraisal creation gate. |
| `apps/server/src/actor-work.ts` | Owns one coalesced character ticket and simulation deadlines. Add an operation-specific review reason and acknowledgement, not a second queue. |
| Existing cognition execution, decision preparation and publication | Reuse budgets, permitted snapshots, durable accounting and serialized publication. Supply an independently selectable emotion-only schema; current reflection requires presentation thoughts and cannot be reused unchanged. |
| Prepared-response appraisal and threat-response owners | Reuse exact bindings and accepted receipts; compatible due reviews can join the existing first threat stage without a third call or another threat decision. |
| Existing contact/ranged/evasion owners | Consume complete effects at declared action/outcome boundaries. A new impact's startle cannot influence that same impact. |

EP-C03–EP-C04 define appraisal identity and reassessment; EP-C05–EP-C07 define native/mechanical integration; EP-C08 defines independent review and acknowledgement; EP-C09 owns lifecycle and correction.

## EP-C01 — Definitions, capabilities and single ownership

The engine supplies finite trusted reaction, lifetime, aggregation and review families. Installed worlds select emotion names, scales, bodies, traits, conditions, tuning and review opportunities. Labels and freeform prose install no executable rules.

| Definition extension | Required fields and interpretation |
| --- | --- |
| Appraisal definition | Preserve existing ID/version/pin, label, cause kinds, target/cause stacking, qualitative/scaled value, lifetime, decision and reflection permissions. Add optional review policy and optional mechanical-channel mapping. Omission of review means no independent review enrollment; omission of mechanics means no direct stat effect. |
| Review policy | EP-C08’s finite typed reasons, outcomes, evidence selectors, opportunity limits, pacing and decay horizon. No executable predicate strings. |
| Bodily reaction definition | Exact pin; supported producer stimulus kinds; target body/receptor applicability; admitted susceptibility/recovery inputs; amplitude rule; normal-play duration and curve; channel mapping; native ending rules and owner-visible wording. No cognition permission is implied. |
| Mechanical channel | Installed ID and compatible scaled meanings; finite normalization; aggregation family; body applicability; supported parameter mappings and their units/composition/clamp owner. The initial trusted reducer is maximum. Adding a new reducer requires a real consumer and its mathematical contract. |
| Emotional review capability | Existing permitted cognition execution plus appraisal/memory ownership, installed review permission, current controller authority and appropriate body eligibility. This is independent of speech, deliberative goal selection, autonomous locomotion and inner-world workspace editing. |
| Mechanical trait binding | Exact installed numeric attribute or reviewed mechanical trait definition, scale/neutral value and explicit reaction modifier. Existing descriptive traits remain prose. Missing optional modifier means the declared neutral value; an invalid required binding refuses installation. |

Install one coherent policy group through existing manifests/pins, referencing the appraisal, body and action/parameter owners without copying their values into server prompts or client controls. Compose the existing base appraisal/body definitions; introduce a small base emotional-policy module only if shared reaction/channel/review data otherwise has duplicate owners.

A world can omit fear or select other supported emotions/lifetimes, including qualitative grief or persistent/condition-sustained fear. Unsupported physiology, arbitrary stat scripts, mind reading, numeric social reciprocity and player-control grants require separate capabilities/authorization. Existing creator inspection and definition-dependency checks apply; no new dashboard or ACT09 process UI is included.

## EP-C02 — Time, native lifetime and psychological change

Every newly authored player-facing duration here uses **normal-play seconds**. At admission, the existing clock owner converts an authored duration d into simulation duration d × r, where r is the installed normal-play simulation rate. Runtime speed changes advance that same clock faster; they do not multiply an already converted duration. External request deadlines, operational database backoff and billing remain wall/monotonic time under their existing owners.

The target appraisal schema replaces existing `seconds`/`perHour` fields with `durationNormalSeconds` for fixed expiry and `decayPerNormalSecond` plus existing notification bands for linear decay. This schema change remains unimplemented. Explicitly convert current fear/discomfort 0.25 per game hour and anger 0.125 per game hour at the selected base rate; preserve those normal-play curves. Existing `wilderness:calm` expires after 30 simulation seconds, hence 0.5 normal-play seconds at the base rate. [World policy](../worlds/base/psychological-reactions.md#authored-appraisal-time-and-review-profiles) owns these values. Do not relabel `seconds`/`perHour`, reinterpret an existing pin or retain independently editable duplicate rates.

An admitted timed lifetime retains the exact definition pin, normal-clock conversion at admission, original creation time and simulation anchor/deadline/rate needed for continuation. A derived compiled rate is owned preparation, not another editable world rule. Existing unrelated calendar-authored mechanics keep their declared units. This task does not globally rewrite all game-hour policies or ACT09 process intervals.

| Lifetime | Native continuation | Allowed psychological reassessment |
| --- | --- | --- |
| Decaying scaled appraisal | Current value comes from its accepted anchor and pinned rate; due zero resolves it natively. | Revise the current amount under the original-cause horizon and exact opportunity below. Neither read nor no-change changes the curve. |
| Persistent scaled appraisal | No implicit decline or expiry. | Supported new amount or resolution; finite review allowance still applies. Dormant review does not reduce the value. |
| Persistent qualitative appraisal | Remains active until a lawful resolution/invalidation; there is no fabricated intensity. | Retain, supported provenance reframe, or resolve. There are no assumed stages of grieving or automatic recovery deadline. |
| Fixed expiry | Original admitted expiry remains authoritative. | Supported value/interpretation change cannot move expiry. |
| Condition-sustained appraisal | Existing condition/process owner controls the actual episode's continuation. | A review cannot keep an objectively false native condition alive, re-enroll a process or replace its episode. Native condition meaning and personal interpretation remain distinct. |
| Bodily startle | Deterministic short curve under the admitted bodily rule. | Not model-writable. Reappraisal of fear never stretches, clears or recreates physical startle. |

Ending a transient contribution proves no safety, courage, forgiveness, forgetting or encounter resolution. Persistent fear can remain mechanically effective without periodic AI; a decaying record cannot silently become persistent. A genuinely new eligible occurrence uses the existing create/stacking path.

Pause freezes all simulation progress. A three-second reaction saved halfway through resumes with half remaining, not a new onset. Speed changes and native partial advances preserve the same analytic value at the same simulation time. A supported live change to clock conversion settles prior progress and rebinds remaining work through the clock/installation owner; otherwise the edit is refused while retained pins depend on it. Merely reopening the application provides no elapsed offline decay or missed model calls.

## EP-C03 — Exact appraisal and review records

Preserve the actual existing evidence shape: AppraisalEvidence contains kind, actorId, sourceId, sourceVersion, occurrenceId, coverage, subjectIds and optional recallEpisodeId. Use its existing permitted-source resolver and exact family/observer bindings. Memory ID, original occurrence ID, current source revision and recall episode solve different problems; none is interchangeable.

An internal review is an operation on an existing cause, not a sixth external AppraisalCause category. Keep the original Appraisal ID, actor, target, stack key, definition pin, cause, createdAt, creationOperation and predecessor linkage. A current interpretationSource may record eligible additional provenance, but cannot overwrite the original occurrence or manufacture a new creation identity.

Add an optional review subrecord to the existing Appraisal. Store it through mind_appraisals and the current world-record tree. Do not put reviews into AppraisalProcess: those existing explicit condition/disposition processes create feelings and currently scan their enrolled registry on appraisal advance.

| Saved review field | Required meaning |
| --- | --- |
| reviewRevision | Operational revision used to claim/acknowledge a review; separate from Appraisal.revision, which fences emotional meaning. |
| supportEpoch | Application-owned sequence/identity for the admitted material support set. It is not a model request ID or a new external event. |
| supportFrontier | Bounded monotonic proof of completely examined actor-acquisition/native-condition owner cuts and selector frontiers. Old A → B → A source selection cannot reset allowance; EP-C08 defines exact delta, materiality and incomplete-coverage rules. |
| support | Exact permitted evidence/condition references and coverage within EP-C08’s eight-reference review envelope. Original cause remains on the appraisal. Indivisible overflow is incomplete, never truncated. |
| opportunity | Monotonic owner-issued ordinal within this appraisal, with exact original-cause and epoch binding. Never reset on load, paraphrase, target disappearance or retry. |
| attemptsUsed | Number of durably claimed submitted-attempt opportunities in this support epoch, including unsuccessful/uncertain attempts; never a success counter. |
| disposition | dormant, scheduled, eligible, claimed or ended, with a closed reason: unchanged, exhausted, unavailable, incomplete, capability-blocked, resolved, invalidated or superseded as applicable. |
| nextAt / notBeforeSim | Optional simulation deadline and earliest permitted dispatch time. A dormant record has no periodic deadline; dispatch spacing survives epoch changes. Native lifetime deadlines remain separate. |
| reviewBand | Last settled band and optional candidate-band stabilization deadline for this appraisal’s own normalized intensity. It selects adaptive cadence; it is scheduling state, not a second emotion amount. |
| mechanicalBandWitness | Optional single mapped-channel eligibility witness: settled band, candidate band/start/settle cut and bounded exact policy/life/control/semantic-dependency binding. It stores no intensity and uses this same review record/deadline owner. EP-C08 defines arming, complete-channel crossings and restoration. |
| lastAttempt | Exact existing durable request/operation reference and terminal disposition where available. Full past replay protection remains in the existing receipt/journal owner, not an unbounded array on the feeling. |

The stored original-cause horizon for a reviewable decaying appraisal is fixed at original creation from the admitted definition and clock conversion. Its value must agree with that definition at current-format validation. It cannot be extended by another support epoch, ordinary reframe, provider delay or review acceptance. A true new-cause create is a separate record and follows target/cause stacking normally.

Use separate semantic appraisal/membership guards and operational review claims. [EP-C08’s validity contract](#permitted-snapshot-and-relevant-validity) specifies the required change to current whole-container guards and exact dependency checks.

## EP-C04 — Reassessment algebra and admission

Extend AppraisalChange with a closed reassess operation, admitted only with a server/native-bound ReviewOpportunity. Model output names a supplied feeling/opportunity handle and selects retain, resolve, an offered provenance-only reframe or an offered/current supported value. It does not supply raw actor IDs, source hashes, creation time, horizon, target, pin, urgency, allowance or publication authority. Reuse AppraisalValue rather than introducing an incompatible numerical payload.

A trusted opportunity binds the exact actor and physical life at preparation, current world/timeline/control/audience authority, appraisal semantic revision, review revision/epoch/ordinal, definition pins, original cause proof, selected current support, captured simulation time and only those contextual dependencies necessary for the question. Required source proof may use authorized compact lineage after raw text becomes cold; missing detailed recollection is not itself emotional expiry. No safe complete required proof means deferred/insufficient evidence, not reconstruction from hidden world truth.

For a decaying scaled appraisal let m/M be its minimum/maximum, k its admitted decay per simulation second, t0 the captured assessment time, H the immutable original-cause horizon and v the proposed absolute value at t0. Native admission requires:

- m < v <= min(M, m + k × (H − t0)).
- At publication time t1, current value is max(m, v − k × (t1 − t0)).
- Store anchorTime = t0 and anchorValue = v. Its natural zero is at or before H.
- Offer finite choices only inside that feasible interval before dispatch. A generated amount outside it refuses; do not silently clamp, change decay speed, invent a plateau or move H.
- If v equals the captured current value, canonicalize to retain before mutation. Retain preserves the existing anchor, even if its stored original amount differs from current value.
- If the existing record has ended or its semantic/source dependencies changed, reject the stale result. If a valid proposed lower curve is already at minimum when publishing while the original record remains active, resolve at current publication. Retain assessment time and the proposed curve's earlier zero time as provenance; never backdate the event or rewrite intervening mechanics. Never revive an ended record.
- Native time passage within the same semantic dependency interval is handled analytically. A relevant native threshold/lifetime transition or changed required condition may make the prepared question stale; preserve explicit refusal and accounting.

This permits legitimate same-cause intensification and reduction without bypassing reframe. A mild initial fear can become stronger when the character better understands the existing danger, but cannot indefinitely restart itself. For example, using the authored base fear rule, an initial 0.25 fear may be reassessed 30 normal seconds later to 0.75 and fade naturally by 210 seconds after creation. The same original cause cannot be assigned 0.75 near its 240-second horizon. These are consequences of an explicit authored envelope, not a claim about human recovery.

Persistent scaled families use their installed scale without a synthetic horizon. Qualitative families retain their nonnumeric meaning. A qualitative provenance-only reframe is available only for an owner-admitted newly material permitted source; it preserves `{kind: 'qualitative'}` and uses the existing interpretationSource field, with no freeform meaning/stage/label payload. Reusing the current source, another wrapper/recall of its occurrence, or cycling already consumed A→B→A support canonicalizes to retain. Source inequality alone is not novelty. A provenance revision earns no timed follow-up or refreshed allowance. Fixed-expiry and condition-sustained families obey their existing ending authority. Reassessment cannot retarget, change family/pin, alter original source history, clear another feeling, convert an opinion into fact, modify biography or resurrect a terminal record.

### Publication and component results

Prepare at most one operation for each exact active appraisal. The dedicated batch may include independent feelings, but never multiple writes whose ordering would decide the same record's value. Decode the complete bounded envelope first. In the existing serialized response/publication boundary, validate each component against its exact claim and current semantic dependencies; accept independent valid components and report stale/refused ones separately. No model-created coupling or cross-character write is supported.

Commit each appraisal mutation (if any), review disposition and immutable application result atomically through the existing world/operational transaction. [EP-C08’s durable result contract](#durable-component-result-and-replay-lookup) defines the `jobs.result.emotionalReviews` extension, exact replay lookup and all result writers; hot receipts/latest operations alone cannot prove older replay absence.

Retain/no-change changes only review bookkeeping and request accounting. It does not change Appraisal.revision, value, lifetime anchor, changedAt, target, original cause, interpretation source, next native lifetime boundary, accepted mind files, goals or public behavior. It emits no appraisal-changed occurrence. Unknown, unsupported, refused, invalid, stale, unavailable and capacity outcomes remain distinguishable from a successful retain.

Publish real changes through existing private structured experience: actual old/current/new scaled amounts, or a provenance-only qualitative source change, plus assessed/accepted times, source coverage, policy and owning receipt. Qualitative values remain `{kind: 'qualitative'}` with no invented amount, stage or meaning field. Optional concise wording derives from those facts; no model explanation is required. The change can inform later choices but supplies no new independent emotional cause.

## EP-C05 — Native bodily reaction admission and receipts

The proposed native port is `admitBodilyReaction(world, preparedCause, preparedBody, at)`. These are owner-prepared arguments, not client/model payloads. The result is a structured `admitted`, `replayed`, `inapplicable`, `incomplete` or `conflict` outcome. An admitted result supplies the exact contribution ID/revision, onset and ending time, selected definition pin, admitted peak/curve and affected physical life. Replayed returns that original result; it does not recompute traits, restart a duration or publish another onset. Inapplicable means a completely resolved body/rule does not support the reaction. Missing required preparation is incomplete, never inapplicable.

| Prepared cause field | Producer and validation |
| --- | --- |
| Cause kind | Closed union: an actual physical contact outcome, a personally acquired abrupt sensory occurrence, or an admitted physical exposure transition. These are the SC08 families; add no generic freeform emotional stimulus command. |
| Original identity | Full original invocation/projectile outcome/acquisition/transition identity, its owner-issued contact/outcome ordinal and native ordered stage. An action ID alone cannot distinguish several actual contacts; current single-contact producers may use ordinal zero. Wrapping injury, contact, awareness, memory and appraisal notifications remain aliases of the same original cause. |
| Stimulus class | Installed `unexpected-attack-contact` or `abrupt-acquired-cue` rule. F establishes unexpected contact through its exact victim preparation/evidence cut. A/C establish actual abrupt reception through the receiver's body and the [authored acoustic qualifier](../worlds/base/physical-sound.md#abrupt-acquired-sound-for-bodily-startle): a qualifying nonself impulse or supported onset/rise, acquired received level and detection margin, and the original occurrence/exposure-transition receipt. Confirmation, bootstrap, restore and coarse movement resampling alone do not create abruptness. D never reads hidden attacker intent or treats a model's description as a sensory transition. |
| Target and time | Exact affected actor/entity, physical-life identity, timeline generation, simulation time and occurrence order. The collision victim may differ from the intended target. |
| Physical support | Existing authoritative committed contact/acquisition facts and the prepared reaction/body rule pins. No named attacker, autobiographical memory, full enclosing world event, speech interpretation or model call is required. |
| Freshness proof | An owner-issued still-unconsumed native producer stage, or an exact retained prior outcome prepared through the canonical contribution receipt owner. A caller-provided `fresh: true` is not proof. |

The initial reaction declines linearly from admitted peak to zero over a fixed duration. Resolve installed body/species, susceptibility, recovery/composure and applicable physical-condition bindings once at onset; retain values/pins. Later trait or prose edits do not reshape that curve. Independent bodily effects keep their own parameters; this profile provides no shock-curve editing operation.

### One canonical contribution record

Extend independent contribution origin into the strict union below. Existing live-source semantics remain; `native-body-cause` instead binds original cause, exact target life and immutable admitted onset/curve. It requires no live `$source`; neither the recipient nor a vanished shooter is a fictitious sustaining source.

Persist under `Entity.statusEffects[id].contribution` / `sim_status_effects`. Native ending updates active state/revision but preserves the onset outcome in canonical cold history. A missing active-map entry cannot authorize replayed onset. Update the validation/binding/ending/retirement paths listed below together; body-cause origins carry no live-source retirement pin.

Reaction identity compares the complete canonical tuple of original cause, reaction definition pin and target physical life. A compact deterministic label may index it, but equality must also compare the full tuple and admitted operation body. The existing nonsecurity `contentLabel` alone is not collision-proof identity. An identical replay returns its receipt; conflicting identity/body reuse refuses before a mutation. For a selected resolved rule whose peak is zero or whose target is definitively inapplicable, store an inactive native-body-cause contribution row with the full tuple and immutable terminal no-effect receipt, but no active curve/deadline. Replay retains that outcome even if later conditions change. When the module/rule is absent, do not invent a definition pin or contribution row: the original native outcome is consumed under its existing producer and cannot later be claimed fresh after a module installation. Replay never retroactively turns that consumed old cause into new shock.

Fresh native contact admission is synchronous because the enclosing producer already proves one new still-unconsumed outcome: a melee attempt transitions out of its strike stage, a live flight commits its terminal contact, or an original acquisition/exposure transition is consumed. Allocate the reaction and its receipt in that same authoritative transition. A later duplicate/retry cannot claim that fresh stage again. For old or externally prepared deliveries, add an exact bounded `contributionOutcomes` lookup analogous to `appraisalOutcomes`; the storage owner prepares the requested identities, full operation bodies and a scoped completeness proof before native publication. Neither path scans all historical contributions or performs SQL at impact.

### Exact instance and definition branches

The native-body instance and definition branches are deliberately strict:

| Field/binding | Canonical bodily contract |
| --- | --- |
| Instance discriminator | `contribution.origin.kind = 'native-body-cause'`; current independent source contributions use `source-bound`. Native singleton statuses retain no independent contribution. Update current writers/readers together; omission is not a compatibility alias. |
| Source | `sourceId: null` only on the bodily branch. Every existing singleton/source-bound branch retains required `sourceId: string`. Never weaken all status sources into a generic optional field. |
| Recipient | Keep existing `actionTargetId: string`, exactly equal to the containing entity ID. `origin.targetLife` is the exact existing physical-life reference and must match that entity. Add no independently writable target ID. |
| Admitted outcome | Immutable onset receipt contains the full canonical cause/operation identity, definition/body/modifier/clock pins, captured modifier values, onset simulation time, resolved peak, resolved normal duration, admitted simulation-seconds-per-normal-second and curve/ending. Existing revision/state fields track later native ending separately. |
| Fixed lifetime | Keep `lifetime = {kind: 'fixed', expiresAt}`. For an admitted effect, expiry equals onsetSim + resolvedDurationNormalSeconds × admitted clock conversion. The definition's durationNormalSeconds is the base for the pinned formula, not the old source-bound constant-seconds ceiling. |
| No-effect outcome | Inactive canonical row, exact terminal no-effect receipt, no active curve or scheduled work. If the current contribution lifetime field remains required, use fixed expiry equal to onsetSim for this explicitly validated terminal branch. |
| Definition family | Separate finite native-body contribution validation: non-occupying, producer-admitted and limited to the selected bodily/channel operation. No generic actions, activation/automatic-deactivation predicate, automatic activation, ordinary refresh/reactivation or write to a fear attribute. |
| Definition references | Use `$subject` and already supported world/clock forms. Reject `$source` and independently bound `$actionTarget` predicates/operations. Do not introduce a new world entity-reference form to express existing clock/world facts. |
| Applicability versus continuation | Onset resolves receptor/body/condition/trait applicability once. Continuation checks exact life and fixed ending. Generic later `requires` reevaluation or changed trait/condition text cannot cancel, reshape or restart the fixed reaction. |

Update `status-effects.ts:crossStatusReferences` as well as `effectBindings` and `status-capabilities.ts:sourceBindings`. Bodily bindings expose the real subject/canonical recipient without a source; neither null nor an original historical actor ID becomes a required live dependency. The generic source-bound attach/refresh/remove route refuses a bodily instance. Body-effectiveness checks exclude the wrong/ended life immediately, rather than waiting for cleanup.

The current source-bound admittedLifetime comparison against now plus definition seconds is not valid for this new family. Validate saved bodily peak/duration against **frozen captured inputs and their pinned formula**, never current traits, playback speed or a replacement policy. One base-three-second profile can lawfully produce 3, 1.5 or 2.4 normal seconds under the selected neutral, high-composure or hare inputs; those are 180, 90 or 144 simulation seconds at the base clock. The admitted receipt and lifetime must agree. No second base-duration ceiling or refreshed anchor is added.

### Stacking and native consequences

Distinct abrupt occurrences can create independent short contributions; contact/damage/memory wrappers or repeated publication cannot. New causes participate in EP-C06’s maximum without extending older curves. A body with no reaction profile contributes nothing; a memoryless compatible body remains eligible.

Action selection remains separate: the hare’s existing native controller can consume the same acquired danger and choose flight without cognition/memory. Share original cause/life deduplication; a startle notification is not a second danger episode. Harmless abrupt cues need not mean danger. Humanlike fear forces no flight, freeze, surrender, speech or expression.

The physical-outcome preparation owner reserves the required contribution work and complete mechanical inputs before advancing through a dependent outcome. If the bounded native work allowance cannot complete the affected slice, retain a coherent uncommitted prefix and resume it under the existing native-work owner. Do not commit an attack and silently omit its selected reaction, or substitute zero for unprepared mechanics. Irrelevant cold history is not required on the proven-fresh path. Native expiry extends the existing `simulation-time.ts:statusBoundary` fixed-contribution boundary and `reconcileStatusEffects` → `advanceCapabilityContributions` ending path. It does not introduce a bodily-reaction due heap or an extra actor scan. Appraisal native/review deadlines separately use `appraisal-index.ts`; do not conflate these owners.

## EP-C06 — Complete effective fear and parameter resolution

`effectiveEmotion(channel, actorLife, cut, preparedInputs)` is a proposed read-only domain query. The input handle proves complete active membership for that actor/life and channel at the supplied ordered simulation cut: all applicable native reaction contributions and all mapped active appraisals, exact definition pins and relevant body/control authority. The result is `not-installed` for an absent channel, `complete` with a finite value and bounded owner-authorized explanation, or `incomplete` with a closed reason/continuation. An installed optional parameter mapping can treat not-installed only as its explicitly declared absence behavior; a missing required installed binding is a configuration/preparation refusal, never a fabricated zero. It never returns a plausible partial value. A complete empty set returns the channel's declared neutral value.

For initial fear, normalize each mapped scaled appraisal using its installed meaning and range, evaluate each current bodily curve analytically, and take the **maximum** of all applicable values. The base range is 0–1. This is the only aggregation authority. Clients, prompts, combat and species controllers do not independently reconstruct or save a global fear total. A prepared cache may retain complete membership and analytic curves keyed by relevant revisions, but must evaluate them at every requested exact simulation/occurrence cut. A numeric result is reusable only at that identical cut, since decay changes between notification bands without a semantic revision. All caches are disposable/read-only and invalidate on membership, definition, life, control and their relevant dependency changes; no until-next-band numeric cache is valid.

Preserve independent directed fears and existing stacking: one active record per exact definition/target for target stacking, independent original occurrences for cause stacking, and historical predecessors on replacement. Several sources can support one interpretation without arithmetic addition; ending one directed fear does not clear another or identify unknown danger.

Applicability comes from installed world/body/channel rules, never hidden proximity or optional cognitive relevance. Active mapped fear can affect precision after escape or target departure; resolved feelings and historical recalled amounts do not apply. Read complete mechanical membership independently of the 24-record display/reflection prefix. Only mapped fear enters the initial channel; joy, anger and grief neither offset it nor create a mood bonus. Other emotion mechanics require an explicit supported mapping.

### Finite numeric parameter contributions

Extend the current restriction-only contribution/parameter path with one supported numeric family: a dimensionless multiplicative adjustment to a registered effective action parameter, derived from the complete emotional channel. Do not write a permanent base attribute or apply inverse deltas on expiry. The base action/profile value remains authoritative. Combine base competence and already supported non-emotional adjustments under that parameter's owner, apply each declared distinct factor once, and clamp once to its registered valid range. Definition installation rejects duplicate mappings to the same channel/parameter and incompatible units.

The selected base policy defines fear factors for attack accuracy and maximum newly admitted evasive distance. There is no generic `allStats` modifier. Ordinary speed, running/fleeing speed, action duration, damage, damage resistance, speech, perception, initiative and chosen goals receive no implicit fear factor. Real injury, exhaustion, encumbrance and capability restrictions keep their existing independent owners.

| Consumer | Exact sampling and resulting behavior |
| --- | --- |
| Melee strike | Route both the timed equipment/recovery completion and the single-phase `completeAction` strike through one shared attempt resolver. Take `definition.accuracy ?? 1`, apply the actor's complete current fear factor at the attempt cut, check native reach/authority, then use the existing one hit decision. A formerly guaranteed natural strike can miss when its effective probability is below one. Never execute both completion paths or add a second fear roll. |
| Ranged shot | In `releaseShot`, apply the shooter factor to the existing final release steadiness immediately before `baseShotDirection` samples. Preserve that function's existing random/error geometry and the actual flight/collision result. Steadiness is not a direct final-hit probability. Save the released direction/flight outcome normally; later fear never bends a projectile or triggers an impact fear roll. Mechanically applicable practice shots use the same shooter factor. |
| Evasion offers and admission | Derive a single effective maximum distance from the installed body profile. Direction suggestions, preview, menu, model offerings and authoritative endpoint admission use it. If a requested endpoint exceeds it, refuse before cost with a permitted reason; do not silently shorten or move the selected endpoint. |
| Admitted evasion | Freeze admitted reach, the relevant profile/effect pins and the existing endpoint/duration in the evasion state. The chosen legal path keeps its existing length/duration speed. Later fear cannot slow it, change its destination, invalidate it on load or add a dodge roll. Existing injury/interruption and collision still apply. |
| Walk/run/native flight | No fear speed modifier and no forced action selection. A native hare's flight choice belongs to its response controller, with its own genuine physical limits. |

The existing ranged `danger-or-return` option inspects the target's returning-threat work or applicable native animal-response episode; it does not read an appraisal or the shooter's private fear. The selected base ranged policy already uses `conditionAdjustment: none`; retain that selection and apply generalized shooter physiology once. A world selecting this generalized fear mapping cannot simultaneously install the alternative target-danger heuristic for accuracy until their physical meaning and interaction have an explicitly reviewed contract; current installation rejects that combination. Independently defined physical factors retain their actual parameter owners and composition rules.

Tie explanations retain the actual equal strongest contributors in the prepared evidence set, with deterministic ordering for diagnostics. Display may summarize or bound its list with an explicit count without changing the complete numeric result. Ordinary other-character views never reveal private contributors, exact intensities or inferred identities from that explanation.

## EP-C07 — Ordered physical outcomes and native animals

Follow SC12's shared ordering exactly. First advance due physical/effect boundaries and acquire any sensing which genuinely occurred earlier. Freeze the attacker's release/attempt inputs and the **actual victim's** precontact evidence, life and effective defense cut, ordered by simulation time plus native occurrence order. F resolves preparedness/surprise, native defense, contact and damage. Commit that outcome, its injury/interruption and any newly admitted bodily shock. Only then publish personal evidence and make compatible cognition eligible.

An impact's own shock can influence a later attempt at the same simulation timestamp with a later occurrence order; it cannot influence itself. Two simultaneous contacts are serialized by the existing authoritative order, never by network response arrival or arbitrary array enumeration. A previously acquired warning counts only if its acquisition precedes that victim cut. An enclosing contact/awareness event is not required before the native reaction, and `Awareness.sequence` alone is not an adequate temporal predicate.

For a ranged collateral hit, use the struck body's own applicable reaction rule and precontact defense/evidence, not the intended victim's. The shooter can die or the projectile entity can retire after the committed outcome without ending the target's fixed shock. Target physical-life end retires that effect. An animal's loss of a known source is handled by its native response/observation owner; emotional mechanics cannot supply hidden pursuit coordinates.

EP-C02’s clock invariance applies at 1×/3×/8× and pause. Required preparation precedes the physical stage; partial work stops at a coherent cut. Deferred sensing or uncommitted shock cannot be inserted retroactively before a completed contact.

## EP-C08 — Independently selectable emotional review

### Operation selection and existing seams

`emotional-review` can change, resolve or retain supported existing appraisals without a deliberate thought, speech, goal, plan, action, expression, invention or inner-world edit. Admission uses [EP-C10’s capability/authority contract](#installation-and-operation-authority), independently of speech, action enumeration, object manipulation, locomotion and reflection-file access.

Select the strategy from native eligibility and the coalesced opportunity **before full decision preparation**, without a paid classifier. Event/intent decisions keep their ordinary route; an eligible review without an independently selected deliberate operation can use the dedicated route. Compatible reviews may join an admitted ordinary request or the threat profile’s existing first appraisal/relevance stage, with no third attack call. A genuine urgent threat proceeds even if optional review is incomplete, cooling down or unavailable.

The dedicated route makes at most **one finite Jev judgment request** for the bounded character batch: no auxiliary embedding, attention, routing, action-rating, generation, tool or reflection request. Strict Jev-only mode leaves unsupported/unavailable choices unavailable. An independently admitted generative request may carry exact review operations with any finite native-feasible value, within its existing limits. Unknown, failed or invalid emotion-only results earn no paid fallback, escalation or repair.

| Current seam | Required integration |
| --- | --- |
| `apps/server/src/ai-director.ts`: `considerThought`, `canAdmit`, `begin`, `admission`, `releaseImmediate` | Select an honest internal review operation before action preparation; use the existing one-actor admission, shared capacity and serialized admission. Do not route a review-only completion through the ordinary evidence-consumption callback. |
| `apps/server/src/decision-context.ts`: `prepareDecision`, `decisionObservation` | Extract/reuse permitted snapshot construction and the necessary actor/evidence readers. The existing `prepareDecision` also enumerates planning/action candidates; the dedicated review must not call that full path merely to discard its actions afterward. |
| `apps/server/src/appraisal-context.ts`: `bindAppraisals`, `bindDecisionAppraisals`, `selectedFeelings`, `decisionFeelings` | Add a review-purpose binding that uses exact enrolled records and complete required source lookup. Review permission is separate from `decision` and `reflection`; neither existing flag alone grants review. Preserve source privacy and distinguish semantic appraisal guards from operational review metadata. |
| `apps/server/src/decision-task.ts`: `DecisionTask`, `DecisionAnswer`, `prepareDecisionTask`, `compileDecisionTask`; `cognition-contracts.ts` | Reuse typed independent question construction and result validation. Provide the bounded review-specific output rather than the ordinary action envelope or reflection schema. |
| `apps/server/src/decision-state.ts`: `DecisionTaskKind`, `DecisionState`, `decisionRoot` | Existing task kinds include `appraisal`, but the root cause currently supports only event/intent. Add an explicit internal-review discriminant with owner-issued references; no invented external event or chosen intention. Keep separate task groups for each offered appraisal. |
| `apps/server/src/prepared-response-appraisals.ts`: `prepareResponseAppraisals`; `prepared-response-context.ts` | Combine exact eligible review questions with compatible first-stage judgments, subject to the existing question/context/operation limits and one write per stacking scope. Native receipt publication remains before the existing action-choice stage. |
| `apps/server/src/actor-work.ts`: `ActorWork.wake`, `ready`, `capture`, `inspected` | Add one operation-specific review reason to the current character ticket, plus scoped acknowledgement. Keep generation/dependency fencing, queue age and one simulation deadline per character. |
| `apps/server/src/interests.ts`: `ThoughtIntakeInputs.affected`, `read`, `stimulusReview` | Read the exact changed actor and next review deadline through the appraisal owner. Do not add another actor scan, process registry or review polling loop. |
| `apps/server/src/cognition-budget.ts`: `DecisionLedger`, `decisionAllowance`, `interactiveAllowance` | Charge the actual request through the existing level/request/cost ledger; preserve shared interactive headroom for this optional work. |
| `apps/server/src/cognition-execution.ts`: `CognitionExecution.primary`, `enqueue`, execution leases | Reuse the existing bounded primary/background capacity and uncertain-execution accounting. High fear alone does not authorize the urgent slot or another queue. |
| `apps/server/src/store.ts`: `reserve`, `markDecisionDispatch`, `settle`, `attemptReceipt`, `decisionAttempts`, `recoverInterruptedWork` | Journal the exact logical review opportunity and submitted-attempt claim through current durable request accounting. Submitted uncertainty stays reserved and cannot be retried by obtaining another request ID. |
| `apps/server/src/decision-publication.ts`: `decisionClaimCurrent`, `finishDecisionPublication`; `WorldService.transition` operational change | Publish accepted appraisal mutation, review disposition and component receipt in the same existing authoritative world/operational transaction. Refuse stale components without undoing independently accepted ones. |

`AiDirector.begin` currently constructs `DecisionState` for chat/thought only when `permitsEscalation(config)` is true. Create the review’s durable root/task groups even with escalation disabled, while granting no higher-request entitlement. Its cursor, completion callback, terminal handling and recovery use [operation-specific acknowledgement](#operation-specific-evidence-acknowledgement).

Use `decisionRoot`’s existing useful-later lifetime and wall/monotonic request deadline, plus any stricter relevant simulation horizon. Missing the immediate-response target neither buys another request nor implies an action choice; a submitted review may publish within its useful lifetime if exact dependencies remain valid. Expiry closes the accounted opportunity and preserves the native curve. The dedicated schema inherits neither reflection’s required one-to-three presentation thoughts/workspace edits/level-5 execution nor ordinary action/goal validity.

### Policy schema on the appraisal definition

Add optional `AppraisalDefinition.review`; omission means no independent review. Authoring, validation, install/pin hashing, preparation, admission, persistence and inspection consume this one typed declaration. The [base-world policy](../worlds/base/psychological-reactions.md#adaptive-review-policy) owns its authored values and installed world data.

The single installed policy group in EP-C01 owns `minimumStandaloneDispatchSpacingNormalSeconds`, a finite value of at least one normal-play second; the base world selects 1. Keep this shared field outside `AppraisalDefinition.review`. Emotion definitions reference the shared owner; installation rejects per-emotion copies or overrides rather than reconciling conflicting values.

| Field | Meaning and validation |
| --- | --- |
| `implementation` | One installed trusted review family, initially `bounded-source-review-v1`; labels and prose cannot select evaluator code. |
| `reasons` | Supported subset of initial episode, material support change, due recovery step and meaningful native band transition. An ordinary cognition opportunity is a place to execute an already eligible review, not an independent support reason. |
| `outcomes` | Supported subset of retain, reassess, resolve and explicitly bound qualitative provenance reframe. Unknown is a result disposition, not an emotional write. |
| `maxSubmittedAttemptsPerEpoch` | Positive integer no greater than eight; the base-world profile selects its smaller emotion-specific values. A submitted failure counts. The initial create is not a review attempt. |
| `timedBands` | Optional finite band table containing enter/exit boundaries, positive normal-play interval list, stabilization duration and minimum actual intensity for timed work. Interval ordinal is shared across bands; changing bands cannot restart its list. Omitted table means no timer. |
| `mechanicalBandEligibility` | Optional closed value `mapped-channel`, valid only for a scaled appraisal mapped to one supported channel with timed bands. Omission disables channel-threshold eligibility. It reuses the authored band thresholds/stabilization and this record’s finite allowance; it does not choose the cadence from the channel total. |
| `minimumRecordDispatchSpacingNormalSeconds` | Spacing of at least one normal-play second across support epochs for the same appraisal. This is separate from character-level standalone-review spacing. |
| `supportSelectors` | Finite installed evidence/condition families relevant to this emotion and existing cause. They bind exact personally acquired support and contrary evidence, never predicates over hidden world truth. |
| `finiteValues` | At most four installed finite scaled options including scaleMax, initially .25/.5/.75/1 for fear, anger and joy, plus the explicitly selected half-current lowering alternative and exact feasible-ceiling alternative when distinct. Qualitative emotions omit this numeric declaration. |
| `maximumReassessmentAgeNormalSeconds` | Required for the chosen decaying family, fixed at original creation and bounded by EP-C04's feasible curve. No review, support epoch or publication may extend it. Other lifetime families retain their ending authority. |

The current-schema validator admits at most eight submitted attempts per support epoch, eight timed bands, and eight interval entries per band, with each list no longer than the installed attempt allowance. It admits at most four authored numeric levels, requires the exact scale maximum among them, and caps each prepared finite question at eight alternatives. All configured intervals must be finite, strictly positive and representable after conversion to simulation time; record and character dispatch spacing must be at least one normal-play second. Reject overlapping/inconsistent band boundaries, a nonfinite or nonpositive converted delay, an exhausted counter, and unbounded arrays before installation or dispatch. These are engine refusal envelopes; the base-world allowance and cadence remain separately authored.

`supportSelectors` is a closed union. Worlds select finite installed category/transition lists within existing definition/work bounds; they cannot provide evaluator code or prose predicates. The current `WorldEvent.type`/`Awareness.eventType` fields are strings, so validate selected IDs against their native producers rather than inventing a global event enum.

| Selector kind | Bound data and exact match |
| --- | --- |
| `subject-event` | Authored native event categories plus personally acquired `AppraisalEvidence`. Require a non-self intersection between its structural `subjectIds` and the appraisal’s exact target/original-cause subject IDs; additional support does not widen those trigger anchors. `appraisal-context.ts` derives these IDs from `memory.entityIds`; prose mentions are not topic IDs. Empty subject scope is never a wildcard. |
| `bound-episode-transition` | Authored semantic/terminal transition kinds on an already bound original occurrence/exposure, action/command/invocation, encounter or appraisal-condition episode. Compare the exact owner’s identities and transition lineage, not action progress. `ActivityOccurrence` supplies actionId/commandId/parentId/status/resultMemoryId; encounter/exposure transitions retain their exact receiver/pair/life/episode binding. |
| `own-body-condition` | Exact actor/life and installed attribute/condition-definition pin, with a selected genuine enter, severity change/recovery or clear transition. Capture condition revision and old/new severity from the native owner. `ConditionEpisode` has no episodeId; its revision also changes for notification/review bookkeeping, which never qualifies alone. |

A match grants possible relevance, not truth, safety or an emotional conclusion. Unknown/targetless feelings use exact original source/exposure bindings or applicable own-body selectors. New testimony qualifies only if intelligibly received with an actual supplied subject/episode relation; unmatched speech may enter ordinary cognition or an already-eligible review, never purchase standalone review through keywords/classification. Current response-observation and recovery event envelopes omit some required transition/pin fields: capture them at the native producer or extend that narrow internal envelope, never infer them from narration. Detection loss is changed evidence, not proven safety.

All policy durations/rates follow EP-C02’s normal-unit schema and pinned conversion.

### Saved review state and character dispatch spacing

[EP-C03](#ep-c03--exact-appraisal-and-review-records) owns the bounded `Appraisal.review` record in `mind_appraisals`. Its `notBeforeSim` is the earliest permitted dispatch time, separate from `nextAt`; a new epoch cannot evade it. Store actual dispatch time in the durable attempt receipt, not another independently writable appraisal field. Prior replay protection remains in durable receipts; condition/disposition `AppraisalProcess` enrollment is unchanged.

Add optional `ActorMind.emotionalReviewNotBeforeSim` in `packages/domain/src/mind.ts`, at `WorldState.minds[actorId]`, persisted in the existing **`mind_state`** row by `apps/server/src/world-record-schema.ts`. The appraisal-review admission owner writes this scalar when a standalone review is durably submitted, using the shared `minimumStandaloneDispatchSpacingNormalSeconds` converted once at dispatch. Initialize it absent/null. This operational update changes no semantic mind revision, document, thought, processed evidence watermark, reflection time or dream.

Atomically admit a standalone dispatch only at or after both the character scalar and every selected record’s `notBeforeSim`, under the existing single-actor gate. A piggybacked review must satisfy its record spacing, eligibility and claim, but neither waits for nor advances the standalone scalar. Omit an ineligible component without delaying the independently admitted ordinary/urgent decision; every submitted component advances its record spacing and allowance.

The existing `semantic-schedule:<world>:<actor>` row may cache derived deadlines/fingerprints while preserving unrelated fields. Restore invalidates that cache; saved `mind_state`/`mind_appraisals` rebuild it without old-timeline timestamps or paid work. Classify review bookkeeping and the scalar as operational changes so container replacement does not invalidate semantic intake/reflection guards.

### Support epochs and finite opportunities

An epoch binds one owner-admitted material support set to the original appraisal creation identity, exact review policy, canonical support and monotonic owner ordinal. It can update review context/allowance, never the original cause, stacking key, horizon or emotional value. Only the appraisal writer admits psychological change. A genuinely new occurrence may instead use ordinary create/stacking; reassessment cannot bypass that path. [Monotonic frontier rules](#material-support-novelty-and-monotonic-frontiers) distinguish new support from aliases and rereads.

| Candidate signal | Epoch/eligibility consequence |
| --- | --- |
| Initial accepted reviewable fear/anger create | Establish its initial support epoch, attempts 0, and first interval if current intensity is in an enabled timed range. Creation has its own existing receipt and is not one of the later review attempts. |
| Initial accepted joy/grief create | Establish a dormant epoch with no timer. Do not immediately review a feeling merely because it was just created. |
| Personally acquired material new evidence relevant to the existing feeling | May establish a new epoch after exact native/source eligibility. Coalesce the complete admitted support cut and preserve original cause/horizon. |
| Known safety, actual successful escape, material separation, real bodily condition transition or relevant completed activity | May establish new support through the installed selector and actor's actual acquired evidence/condition binding. These can matter without a new injury or antagonist. |
| Due authored recovery step while the epoch remains scheduled | Make the existing opportunity eligible using its current support and remaining allowance. No new epoch and no invented event. |
| Relevant native threshold/band transition while the epoch remains scheduled | May accelerate eligibility after stabilization, with the same ordinal and remaining allowance. It cannot reset the allowance or wake a dormant same-support epoch. |
| Ordinary action progress, unchanged exposure/condition sampling, expected startle fading, countdown or a frame tick | No epoch. Harmless progress does not produce a review request. An installed active recovery timer can still become due under its own finite sequence. |
| Retained source reread, recall episode, summary alias, identical meaning with changed wording/transport revision | No epoch. Exact source correction has its own invalidation authority; a formatting revision is not new personal experience. |
| Model output, accepted appraisal notification, review receipt, diagnostic render, publication delay or successful receipt replay | No epoch and no automatic wake. These are consequences of the owning operation. |

A slot is consumed when durable dispatch intent records the exact semantic/review revisions, epoch, opportunity ordinal and request group, before provider contact. At most one live appraisal claim exists under the single-actor gate. Reload, visibility, band or provider changes never reset the ordinal.

Only a **meaningful accepted semantic change** with remaining allowance can schedule another same-support timed step: an actual changed amount or admitted interpretation under EP-C04, not metadata, timestamps, wording or a current-equal amount. Native canonicalization decides equality. A finite-value change need not cross a mechanical threshold. Qualitative provenance reframes earn no same-support follow-up or epoch; grief has no timer.

Retain, unknown/abstention, missing/invalid answer, stale/refused result, cancellation, failure or uncertain completion makes the submitted unchanged-support opportunity dormant, with its attempt consumed. Exhaustion is dormant even after a successful final change. Only material independent support can reopen submitted dormancy; no-change is not retry debt.

Before dispatch, missing credentials, headroom, capability, complete proof or capacity instead leaves **unsubmitted blocked eligibility**, with no attempt or implied retention. Record the bounded blocker and reconsider the same opportunity only on its actual availability/policy/capability/evidence change or shared capacity release. This is neither a new epoch nor periodic provider polling.

### Material support novelty and monotonic frontiers

`Appraisal.review.supportFrontier` proves the highest completely examined actor-acquisition/native-condition publication cut and exact installed selector-owner frontiers. Use existing authoritative acquisition/event sequences and condition episode/revision lineage; an optional source-family frontier list has at most eight entries. Current-support hashes alone cannot prevent old A → B → A selection from replenishing allowance. Retain no growing source-ID history and scan no complete actor history.

Enrollment captures the permitted cut and original cause’s acquisition binding. Later support requires the source owner to prove an independently acquired material occurrence or condition transition beyond its frontier. Read only that indexed delta through the captured cut; resolve exact current source versions, original occurrences/episodes, actor coverage and receipt lineage. Hydration, recall, wrapper changes and review notifications retain their original acquisition positions. A new cache hash or world sequence alone proves no material support.

Apply installed closed selectors to that delta and original-cause context. Obtain a complete selector-index range proof or use existing bounded preparation continuation to page contiguous metadata through a fixed captured cut; retain progress so a routine backlog cannot force endless prefix rereads. A truncated `unseenExperiences` resident prefix/maxSequence is not completeness proof. Candidate-metadata work is separate from the final eight-reference support envelope. Advance only proved examined ranges; unresolved coverage preserves its frontier, and material matching evidence stays in the bounded continuation until a complete support cut can be admitted. A complete immaterial delta may advance the operational cut without changing the feeling, starting an epoch or clearing submitted dormancy. Coalesce all proved material transitions in the captured cut into one epoch with at most eight support references; persist frontier and epoch together before claiming work. Older evidence remains context, never a reusable novelty token.

Correction follows its existing invalidation owner. New personally received testimony about an old subject, or a real native A → B → A transition, can qualify through new acquisition/episode lineage plus materiality and relevance. Cycling handles or sampling an unchanged condition cannot. Restore reconciles logical epoch/opportunity against nonrewound durable request/application receipts before dispatch; runtime generations cannot renew allowance.

### Adaptive intervals, hysteresis and due ordering

The [base-world profiles](../worlds/base/psychological-reactions.md#authored-appraisal-time-and-review-profiles) own interval lists, allowances, event-only emotions, thresholds and stabilization. Compile that pinned declaration once.

An interval is a **delay**, not an absolute age or mandatory appointment. Initial enrollment uses index 0 in the current band. After meaningful accepted change number n, if allowance/timed eligibility remain, choose index n in the then-settled band and anchor it at native acceptance simulation time. Band changes share the ordinal; one used high-band attempt followed by moderate intensity selects moderate index 1. New material support can begin a finite sequence without resetting spacing or the original horizon. Missed delays coalesce into one current review, never catch-up calls. Provider wall/queue time matters only insofar as authoritative simulation time actually advances.

Cadence always uses **the appraisal’s own normalized intensity**. Effective mechanical fear may accelerate eligibility separately; strong startle never substitutes for a mild appraisal’s amount. Selected fear/anger entry boundaries are .2/.5, exit boundaries below .15/.45. A candidate must persist for one normal second, represented by one indexed stabilization deadline. Mechanics remain immediate and continuous.

The timed-work floor is distinct from hysteresis: actual intensity below .2 removes the timed due entry even if the settled moderate band persists down to .15. Keep band/allowance state; material support may still permit event-driven review. A native crossing cannot wake submitted dormancy. Newly material support becomes eligible after evidence, applicable stabilization and record spacing, without an arbitrary calm-state delay. Shared admission remains optional; a genuine threat never waits for review stabilization.

At a shared timestamp, advance native appraisal/body boundaries first, derive mechanics/bands, retire ended reviews, then expose surviving eligibility. Extend the appraisal index with typed native-lifetime versus review deadlines: current `advanceAppraisals` treats due `nextAt` as lifetime work and cannot consume an untyped review date. The actor deadline is the minimum of existing interest/stimulus and surviving review boundaries. Native zero/expiry never waits for AI; startle ending proves neither safety nor a changed goal.

#### Complete-channel threshold eligibility

Base fear selects `mechanicalBandEligibility: mapped-channel`; anger, joy and grief omit it. Arm one `mechanicalBandWitness` only for an enrolled record with an active recovery opportunity, remaining allowance and own actual intensity at/above the timed floor. Initial arming establishes a complete-channel baseline, not a crossing. Body-only startle, below-floor feelings, submitted dormancy and exhaustion buy no review; new material support follows its separate rules.

The witness stores settled/candidate band, candidate start/settle cuts and bounded exact query-policy/life/control/semantic-dependency proof, never an effective amount or contributor history. A hash/cache hit alone proves no complete scope. Reuse one complete channel result for affected records at each cut; relevant membership/body/appraisal/control mutations notify enrolled records through existing indexes.

Between native changes, the selected maximum reducer has fixed nonincreasing curves. For downward threshold B, compute each contribution’s analytic falling-below boundary: current cut if already below B, infinity if constant persistent or condition-held at or above B. The complete channel boundary is their **latest**, so one persistent floor prevents crossing. Do not follow only the current winner or schedule pairwise intersections. For continuous decline, the boundary is the instant immediately after which value is below B; mechanics still returns the exact boundary value. Proven declining continuation permits candidate dwell to begin there; same-cut edits that hold/reverse it clear the candidate, avoiding zero-time equality loops.

A known membership/curve boundary or admitted upward semantic change recomputes the complete channel/candidate. Crossing plus stabilization may accelerate the **existing** opportunity, subject to spacing, ordinal, allowance and optional admission. It creates no support, urgency, extra attempt or individual cadence change. Multiple eligible feelings remain independent components on one character ticket.

Validate batch components at the same pre-mutation cut, apply accepted results, then rebaseline affected subscribed witnesses once without treating the review publication as a threshold trigger. Preserve independently eligible reasons and captured claims; earlier component bookkeeping must not stale later components in the batch. A meaningful change schedules only its permitted next interval, never immediately accelerates itself/another feeling. A later native crossing may signal a surviving non-dormant opportunity.

Fold channel-crossing/stabilization deadlines into the existing typed per-appraisal minimum with lifetime, individual-band and timed-step deadlines; add no heap. Unavailable complete proof blocks the witness as incomplete, never neutral. Save candidate age/witness in `Appraisal.review`; restore from the complete native cut and retain a candidate only if its continuation proof validates. Otherwise establish any new candidate at the current coherent cut. Disarming removes channel deadlines; neither delayed/restored crossings nor dormancy produce catch-up calls.

### Complete bounded preparation and eight finite choices

Select eligible metadata from the existing actor-scoped appraisal index **before** support hydration/formatting. Sort by oldest eligible simulation time, then stable canonical appraisal identity; the existing actor ticket retains its independent native ordering and aging. Adaptive band intervals make intense episodes eligible sooner without an undeclared per-feeling priority score. There are three separate new review envelopes:

| Bound | Selected meaning |
| --- | --- |
| 16 | Maximum independent appraisal components in one review batch, also respecting remaining ordinary response-operation capacity when piggybacked. This is not a limit on active emotional records or the effective fear reducer's required set. |
| 48 | Maximum distinct exact required source bindings in the prepared request, using the existing `bindAppraisals` complete-source envelope. Deduplicate only exact equivalent bindings; different source revisions/coverage cannot be merged merely because their words match. |
| 8 | Maximum exact support references in one selected appraisal review binding, including its required original-cause proof and admitted supporting/contrary evidence or condition references. This is a **new selected review support envelope**, not a claim that ordinary perceived/remembered appraisal causes currently have an eight-source field. The current authored-cause shape separately has a sourceRefs bound. |

Required condition/context support counts toward the component’s eight-reference envelope even when it is not recall evidence. Identity/authority/policy revisions remain separately bounded snapshot dependencies. Source counts do not guarantee byte/token fit; existing provider/context limits, finite opaque handles and diagnostics also apply.

Select in fair order only when each **complete** source/context unit fits. Indivisible oversized/unpreparable support is `incomplete`; park it on its concrete dependency and continue to independent records. Capacity-omitted records remain unclaimed with their age, no retain/unknown result or attempt charge. Resume only at a later normal shared opportunity, never an eager batch-draining loop. These review prefixes cannot replace EP-C06’s complete mechanical membership.

For each selected scaled appraisal prepare one `ChoiceQuestion` with stable request-local handles. The base finite construction is:

1. Always offer retain and unknown, with distinct typed outcomes. Offer resolve only when allowed by the installed policy and current native lifetime/record authority.
2. Consider at most four authored absolute levels, which must include the scale maximum; the selected base list is .25, .5, .75 and 1. Add the explicitly installed lower option `min + (current − min) / 2`, which is `current / 2` for the base zero-minimum scale. The definition author explicitly selects this normalized lowering family; it is not inferred from an emotion's name.
3. Remove duplicate values by native canonical numerical equality. Omit a value equal to captured current intensity; it is represented by retain. Preserve stable deterministic ordering and record the exact offered number, not a rounded display label as authority.
4. Filter every value through the current scale and EP-C04's original-cause feasibility envelope at the captured assessment time. Filter rather than clamp. Also offer the **exact feasible ceiling** when it is distinct from every retained number and the captured current value: `min(scaleMax, scaleMin + decayPerSimSecond × (originalHorizon − assessedAt))` for the chosen decay family, or the installed scale maximum for a persistent scaled family. This explicitly selected authored option can permit a legitimate increase above a non-quarter current value near the horizon. It does not extend the horizon, change the slope or clamp a model's invalid output; it is a completely specified native-feasible choice prepared before the request. If the ceiling is no larger than current, it adds no intensification option.
5. At most eight alternatives remain: no more than five numeric choices, plus retain, resolve and unknown. The bound follows from requiring scaleMax in the at-most-four authored list: a distinct submaximum feasible ceiling necessarily filtered out at least that maximum, leaving at most three authored values + ceiling + half-current; if the ceiling is scaleMax, it duplicates the authored maximum. Dedupe half-current/current-equal values normally. Fewer alternatives are expected. Model outputs may select only supplied handles. Zero/minimum is not a numeric create/reassess shorthand; use the explicit lawful resolution outcome.

Use `ChoiceQuestion.criteria`’s existing record shape in `packages/ai/src/types.ts` and prepared-response exact handles. Enforce the eight-choice cap in review preparation/validation; it is not a new global cap on every Jev task.

Qualitative grief offers retain, resolve and unknown, plus a provenance-only reframe when EP-C04’s exact newly material source rule permits it. The same rule constrains an already admitted generative operation. [EP-C10](#installation-and-operation-authority) defines source-linked versus authored grief permissions; neither gains a numeric amount, invented stage or freeform meaning payload.

Require one supplied choice or explicit unknown/abstention for every **offered** handle. A missing answer is an incomplete submitted component, dormant rather than retain. Unknown handles, duplicate appraisal writes, forbidden fields or an invalid aggregate envelope refuse before mutation. Otherwise valid independent components may publish when another is stale/unknown.

### Permitted snapshot and relevant validity

Prepare [EP-C10’s complete permitted context](#source-and-current-context-preparation), including exact actor/life/control/policy authority and CG09’s full accepted About me snapshot. Required-context overflow is incomplete before dispatch. Supply acquisition/source times and uncertainty: testimony, expression and chosen action remain evidence of what was acquired, never proof of another’s private feeling/intent.

Bind relevant dependencies rather than every world/actor field or container identity. Current work and understood alternatives are context, not an action catalog. Harmless progress, unchanged goals and unrelated conversation bookkeeping do not stale a result; acquired safety, a relevant blow, life/authority change, bodily transition or corrected evidence can.

Separate semantic `Appraisal.revision`/relevant membership from operational `reviewRevision`/claim state. Current `bindAppraisals` defaults to `guard: 'all'` and captured appraisal-object equality; distinguish bookkeeping from meaning there. Deadlines, retained receipts and dispatch scalars must not invalidate unrelated decisions/reflection, while real relevant values and terminal native boundaries still fence dependent consumers.

After every awaited source/receipt preparation and immediately before dispatch/publication, recheck current permission and exact source/record dependencies. Authorized compact lineage can preserve original-cause proof when raw text is cold; missing proof cannot be replaced by hidden history or guessing. EP-C09 owns correction/forgetting. EP-C04 analytically ages the captured value through provider delay without callback-time reanchoring; relevant threshold/lifetime/context changes can still stale it. Until valid publication, the accepted native curve remains authoritative.

### Shared admission, accounting and publication flow

1. A native transition updates affected review metadata/due indexes and the actor’s one review reason/earliest deadline, under the support and anti-loop rules.
2. `ActorWork.ready` selects from current coalesced tickets under the existing read cap/fair ordering. Capture the ticket's generation and reasons before asynchronous reads. Apply cheap alive/cognition/controller/body/provider/budget gates first; no action enumeration or paid work has occurred.
3. Under the director's existing serialized admission, choose the ordinary or dedicated operation strategy. Urgent external decisions keep their existing route. Prefer combining an eligible compatible review into an independently admitted request; do not turn another person's private state or a pending event into a review-only trigger.
4. Read due metadata and the character scalar; prepare complete components under the envelopes, snapshot guards and finite-choice construction above. Preserve omissions/deferred diagnostics.
5. Revalidate after preparation. If no component remains complete and eligible, record the appropriate no-dispatch disposition and return. Do not create an empty paid request or claim that omitted feelings were reviewed.
6. Obtain existing actor/run admission and an execution lease. A standalone review always uses `urgent: false`, regardless of an ordering hint on the coalesced ticket. Only the independently selected real event/intent threat route may claim existing urgent authority; intensity alone cannot elevate a review. The current director admits at most two immediate pipelines, at most one ordinary, and one per actor; `CognitionExecution` shares primary/background lanes with decisions/maintenance/higher work. Its current queue is bounded to 16 decision descriptors, two maintenance descriptors and 8,192 bytes per descriptor. Retain those owners and limits rather than copying review records into a new queue.
7. Preflight and reserve one `decisionAllowance(config, 'jev')` under `DecisionLedger` at the actual cognition level. The standalone optional spending ceiling is `max(0, config.budgetUsd − interactiveAllowance(config))`, using the existing conservative micro-USD arithmetic and current configured prices. No model is assumed free. A piggybacked review consumes the existing request's reservation/count once; neither create a separate ledger nor charge it twice. Provider availability and world tuning do not grant real spending authority.
8. Through the existing world/operational transaction, create the durable internal-review root/groups and claim exact appraisal opportunities against review revisions/epochs. Record durable dispatch intent before remote submission. Increment each claimed record's submitted attempt count, update its record spacing, and update the actor's standalone scalar when applicable in that transaction. The bounded logical claim and request/attempt receipt reference must survive a crash between this commit and the provider response. Recheck the slot/authority immediately before submission.
9. Issue the bounded request; no model tool, evidence request or self-scheduled pass is available. Preserve response/usage under the normal receipt owner.
10. Decode the complete envelope, then serialize native publication. For each exact component, check actor/life/control/timeline/policy and the relevant semantic/source/operational claim. Resolve durable replay identity before new mutation eligibility. Apply valid reassessment/resolution/reframe through `changeAppraisal`'s extended native owner or receipt an explicit retain/unknown. The domain mutation, review terminal/next-step state and operation receipt commit together with the root group outcome.
11. Apply the finite-opportunity rules to next-step/dormant/ended/blocked state. Only real semantic change publishes `appraisal-changed`, with its owning receipt/provenance.
12. Acknowledge only the captured operation-specific review reasons/claims that actually reached an outcome. Preserve newer review revisions and all unrelated pending actor reasons/evidence cursors. Recompute the single actor deadline. Release only this exact job's execution lease; uncertain remote execution keeps the existing reserved exposure/capacity until authoritative settlement.

Busy work retains age/unclaimed eligibility in existing bounded admission. Optional review yields to pending directed interaction and genuine threats under their policies. After admission, ordinary cancellation/busy rules apply; new input cannot steal another actor’s funded durable result.

### Durable component result and replay lookup

Extend the existing durable **`jobs.result`** with an append-once `emotionalReviews` component map. The 300-entry `world.responseReceipts` hot map and latest-only `Appraisal.lastOperation` cannot protect older replay. Add no receipt table or emotion journal.

Each bounded entry stores root job/publication ID; response-local operation/claim; original appraisal creation identity; actor/world/life/authority; epoch/ordinal/policy; full canonical operation body and collision-resistant digest; assessment/publication times; and actual accepted/retained/unknown/refused outcome. Retain the native result and permitted before/after semantics required for exact replay, with original evidence coverage and redaction authority. The admitted request/component envelopes bound the map. Conflicting reuse of an entry’s identity/body/outcome refuses transactionally.

Use `DecisionPublication.rootJobId`, `attemptId`, `receiptId` and `groups[].operations` as exact links. Update **all result writers**: `SqlGameRepository.writeWorldEffects`, `finishDecisionPublication`, `publishQuestionAnswers` and subsequent failed/settled writers. The two publication functions currently replace aggregate results; they must merge around immutable review entries. Stage-two success, refusal, action failure, timeout or job-status change cannot overwrite a first-stage emotion result.

Before testing new-operation eligibility, check current principal/world/controller/life/disclosure scope, then use `GameRepository.getJob`/the owning publication result for exact root/operation/claim lookup. Arbitrary caller job IDs grant no read authority. Compare full canonical body as well as digest. An identical retained operation returns its original component result under current disclosure; conflicting reuse refuses. Missing hot/latest entries or an aggregate `Outcome` prove no absence. Unavailable durable lookup explicitly blocks replay/new admission.

Atomically commit semantic mutation, review bookkeeping, durable component result and root-group outcome in the existing world/operational transaction. A crash cannot publish a feeling without its receipt or restore a submitted retain/refusal to eligibility. Nonrewound financial attempt receipts link to, but do not replace, application outcomes. Correction may redact private canonical bodies/values while retaining minimal non-disclosing identity/digest, claim and outcome tombstones. Return a redacted replay as the earlier redacted outcome; never reconstruct it from provider logs or admit it anew.

### Operation-specific evidence acknowledgement

`ThoughtSchedule.watermark` denotes the highest evidence sequence considered by a completed ordinary decision. Existing `attemptedOpportunity`, `skippedOpportunity` and `reviewKey` address different intake problems, not appraisal epochs/ordinals.

A standalone review must not pass the broad ordinary cursor into `DecisionState.cursor`, `begin`’s completion callback, `finishDecisionPublication`, `consumeDecisionCursor` or `recoverInterruptedWork`; those paths can consume recorded cursors even during terminal/recovery handling. Add typed acknowledgement ownership: review groups close exact review handles; event/intent groups consume their captured ordinary watermark. Preserve newer cursor values and unrelated integration-row fields.

Combined requests retain distinct ordinary/review acknowledgements. Threat stage one may discharge review groups and publish feelings; stage two independently owns action choice. Its failure preserves stage-one feelings without claiming an action, repeating the pipeline or purchasing another appraisal call. Review failure cannot consume otherwise warranted threat-choice evidence.

A genuinely new-cause first-stage question owns its exact conflicting actor/definition/stack-key scope, with the prior feeling and complete relevant context. Omit an overlapping old-record review **before claiming**; never prepare create and reassess writes whose order decides that scope, or an ambiguous combined acknowledgement. Accepted create supersedes the previous record/review. Otherwise the omitted review retains eligibility, age and allowance for later normal admission, without an implicit retain/charge, synthetic wake or immediate third call.

### Provenance and anti-loop rules

Generalize existing prepared-response self-notification suppression, which checks pipeline/response/input/cause metadata against real response receipts, to ordinary and dedicated review publication. Use native receipt-backed lineage, never model tags or a classifier.

- Parent receipt, original cause, source coverage and consumed input cut identify a result’s consequences. Replay, recall, formatting, provider completion and bookkeeping cannot make them new support. Independent occurrences with identical words still qualify through distinct native provenance.
- Changed feelings can inform later ordinary decisions, but are not independent review support. Stage two consuming stage-one feelings does not restart the threat pipeline.
- Native decay/band/startle notifications use only active finite recovery opportunities; submitted dormancy remains dormant.
- A later actual action result may supply material support through its native outcome/awareness identity. Proposing comfort, smiling or writing a thought proves neither successful coping nor a changed feeling.
- Batch components use the captured permitted cut; publication order cannot feed one result into another component’s evidence. Apply channel rebaselining as specified above.
- Each actor interprets its own acquired evidence under its controller policy. A model cannot write another’s private emotions, infer certainty from presentation, or make a speaker’s intent/action force a listener’s appraisal.

### Failure and unavailability outcomes

| Outcome | Emotional state, opportunity and work consequence |
| --- | --- |
| No configured provider or insufficient optional headroom before reservation | No paid request/attempt; native values/lifetimes continue. Park on the concrete availability/budget dependency. A real configuration/settlement change can reconsider the same unsubmitted opportunity; no epoch reset. |
| Busy actor/lane/queue before dispatch | Keep unclaimed opportunity and age under existing shared capacity; no additional queue, attempt or ordinary evidence acknowledgement. |
| Asleep/incapacitated/controller/capability blocked before dispatch | Apply the existing native eligibility and exact authority. Keep a blocker or retire if the lifecycle requires it; waking/regrant is not automatic material support and does not reset prior submitted dormancy. |
| Missing/oversized indivisible required support before dispatch | Explicit incomplete/deferred, no attempt, no fabricated no-change. Wake on actual evidence/coverage/authoring dependency change. Optional omitted records remain unclaimed. |
| Advisory schedule read fails | Reuse the current 60-wall-second scheduling-read backoff where that owner already applies. It is operational storage backoff, not authored emotion time. Do not dispatch from an unvalidated cache or add a new polling loop. |
| Authoritative claim/publication write fails | Preserve existing stronger storage-failure handling. No submission without durable intent; no emotional mutation without its outcome receipt. Never downgrade this to optional read failure. |
| Durable dispatch intent exists but provider outcome is unknown | Consume the offered attempt; same-support dormant, no resend. Keep uncertain financial exposure and execution capacity until existing reconciliation proves settlement. |
| Submitted request fails/refuses/is cancelled/returns malformed output | Existing feeling and native curve continue; offered components become explicit failed dormant outcomes, with actual cost/uncertainty. No repair or provider switch. |
| Explicit retain | Review/accounting receipt only. No value, semantic revision, anchor, creation/lifetime, goal, thought or appraisal notification change; same-support dormant. |
| Unknown/abstain/missing component answer | Distinguish from retain. No emotional mutation; consumed attempt dormant. Independently valid components may publish under native admission. |
| Stale source/policy/life/control or relevant context after submission | Refuse the affected component, keep current accepted state and consume its attempt. Other exact independent components can publish. No renewal from a stale answer. |
| Accepted changed value | Native writer admits the assessed value under EP-C04, aged through delay. Schedule only the next finite step if allowance and timed eligibility remain. |
| Accepted resolve, native expiry or invalidation | End this record's review; preserve cause/receipts. Do not resurrect it from queued/late answers. |

No failure changes another person's interpretation or supplies a fallback amount. An unavailable review does not imply bravery, panic, comfort, safety, deliberate silence or agreement. Its last accepted feeling remains psychologically and mechanically present according to its own installed lifetime.

## EP-C09 — Persistence, recovery and correction

Use the canonical records in EP-C03/EP-C05/EP-C08 and existing cognition accounting. Indexes, caches and actor tickets are derived working state, never additional emotion stores.

### Saved and derived state

| State | Save and restore rule |
| --- | --- |
| Bodily contribution | Save original cause/life/definition, admitted normal duration and clock conversion, simulation onset/ending/curve, active state and immutable onset outcome. Restore the current value analytically at saved simulation time. Retain terminal identity in cold canonical history. |
| Appraisal | Preserve existing record/stack/source/creation receipt, exact semantic revision and ending state. Save the admitted normal-unit definition meaning, simulation anchor/rate, original-cause horizon and review subrecord. |
| Review progress | Preserve epoch, monotonic support frontier, ordinal, attempts, disposition, deadlines, review revision and exact last attempt reference; preserve `ActorMind.emotionalReviewNotBeforeSim`. A new timeline does not mint a new allowance. |
| Durable review application results | Preserve `jobs.result.emotionalReviews` under EP-C08’s append-once, exact-lookup and redaction rules across later stage/status writes and hot-receipt pruning. |
| Pending request | Restore accounting and durable submitted/uncertain/completed outcome first. Never automatically resubmit external work because a promise vanished or the current ticket is absent. A prepared but provably undispatched eligible opportunity can return to ordinary bounded admission. |
| Due indexes and actor tickets | Rebuild appraisal lifetime/review indexes from canonical active records and current permitted actor state, including the minimum appraisal-lifetime, stabilization and eligible review boundaries. Bodily expiry continues through the existing status-contribution `statusBoundary` path rather than an invented body due heap. Reuse existing bounded preparation/residency; do not treat an unloaded record as absent. No offline interval catch-up. |
| Mechanical preparation | Discard derived handles/caches on timeline/control/definition changes and recreate exact complete scope through the existing owner. An admitted action keeps its frozen release/evasion inputs according to its own save contract. |

Schema validation rejects inconsistent pins, nonfinite values, negative/unbounded counters, an ended record marked eligible, a horizon later than its admitted definition permits, mismatched original-cause identity, an impossible claimed receipt or a deadline from a different physical life. One declared current schema changes with all writers/readers. No compatibility reader, older development-save migration or silent field repair is part of this work.

Include review metadata/source references in the existing per-appraisal retained-work estimate. Source-count limits do not guarantee byte/work fit. Store exact locators, revisions and required coverage through the source owner rather than duplicating long text. If complete enrollment/preparation cannot fit, preserve the feeling/lifetime and expose review incomplete/capacity-blocked status; never truncate evidence, expand limits silently or report retain. Required native body work follows EP-C05’s physical-outcome admission.

### Lifecycle and authority matrix

| Change | Bodily mechanics | Private appraisal/review behavior |
| --- | --- | --- |
| Source leaves, dies or retires | Fixed admitted reaction continues without a live source. | Existing personal evidence and interpretation may remain; absence is not forgetting, resolution or known safety. Resolve source references under their historical privacy/lifecycle rules. |
| Target physical life ends | Retire its bodily reaction and native response under their existing life owner. | Cancel/fence in-flight review of that physical life. Retained mind history follows current mind/identity rules; no old-body mechanical projection reaches another life. |
| Same mind receives a new body | No inherited startle. New body rules and parameters determine mechanical applicability. | Retained valid appraisals may remain meaningful only under existing mind continuity and selected control authority. Prepare a new exact-life context; do not renew old causes or assume the new body has the old physiology. |
| Controller, human account, capability or disclosure changes | Native body continues if its life remains valid. Rebuild authorized presentation and mechanical control gating. | Fence prepared operations before dispatch and after every await. Direct-player psychological applicability follows unresolved SA-D01, never an inferred default. No free epoch/attempt from toggling control. |
| Actor temporarily cannot perform optional cognition | Physical/native continuation remains authoritative. | Park optional review on the exact capability/body-eligibility dependency. Do not call an incapacitated/asleep actor simply because review is described as unconscious. Restorative dreams and maintenance retain separate permission. |
| Source correction or forgetting | Genuine physical shock remains an already committed bodily outcome until its native ending; forgetting a memory does not undo contact. Current disclosure may redact its private explanation. | Preserve current conservative invalidation of all that actor's appraisals. End review eligibility, clear support/provenance/private operation bodies through the existing correction owner, fence pending requests and redact retained private receipts as required. No selective-preservation redesign. |
| Definition edit/removal | Existing retained contributions keep exact meaning; admission refuses unsupported replacement while required pins remain. | The same immutable-pin restriction includes cold terminal feelings/outcomes. A model cannot update a definition or reinterpret a retained number under a new pin. |
| Pause or native partial advance | No simulation recovery beyond the authoritative committed cut. | Due eligibility waits for simulation progress. In-flight external timeout/billing remains wall time; existing pause/cancellation/publication rules revalidate the result before any mutation. |
| Save/load or process restart | Resume the saved remaining curve, not a new onset. | Preserve finite review allowance and exact outcome; submitted/uncertain requests are terminal for automatic dispatch. Rebuild eligible indexes without a global recurring actor scan. |

Correction/forgetting must include review-derived selection caches, support references, operation receipts and already prepared private presentation; clearing only the live appraisal is insufficient. Retain only the minimal non-disclosing identity/accounting tombstone needed to prevent duplicate publication and honor existing retention. Do not reconstruct erased source text from a shared event, provider request log, a player's client cache or another character's recollection. Later legitimately acquired testimony is a new permitted source with its own acquisition; it does not undo forgetting retroactively.

## EP-C10 — Capabilities, current context and permitted presentation

### Installation and operation authority

Install EP-C01’s finite families through existing module definitions, manifests, exact pins and validators. [World policy](../worlds/base/psychological-reactions.md) owns named emotions/profiles and all tuning. Preserve distinct absence outcomes: absent channel is not-installed; a completely resolved body without a matching rule is inapplicable; missing required bindings refuse. Labels supply no fallback.

Native reactions require a living applicable physical body and trusted producer proof, not memory, language or a model provider. Appraisal interpretation requires the existing memory/appraisal capability and current source permission. Independent emotional review additionally requires its exact installed review policy and compatible existing cognition execution. Reflection permission and inner-world file access are not substitutes. The dedicated operation exposes no movement, speech, goal mutation, personality editing, other-person feeling writer or general-purpose tool loop.

Preserve installed source-linked `wilderness:grief` v1 (qualitative/persistent, cause-stacked, perceived-event/remembered, reflection enabled, decision disabled) and separate `wilderness:authored-grief` v1 (authored-only, decision/reflection disabled). Add independent review permission only to the source-linked profile through an explicitly revised pin; keep decision false. Authored grief remains outside AI review. Existing persistent representation does not imply delivered review integration.

New feelings still require the existing eligible create path and exact cause; body-only startle enrolls no review. The threat first stage may create an interpretation and handle compatible eligible reviews in its bounded response, without counting creation as a paid review attempt. Wider process enrollment/creator UI remains ACT09 work.

### Source and current-context preparation

| Required context | Exact boundary |
| --- | --- |
| Feeling and original support | Exact active appraisal, current analytic amount or qualitative meaning, scale/lifetime, target, original cause and its permitted coverage. Retained memory of an old feeling is distinguished from a currently active one. |
| Material changed support | Selected acquired occurrences, personally available remembered evidence or trusted current body/condition/commitment transitions allowed by the review policy. Keep the original support as context when newer facts contradict it. |
| Self and preferences | Complete accepted About me/identity snapshot and exact revision under [CG09](../limits/cognition.md#cg09), reused from the permitted cached owner; also relevant values/beliefs/relationships and explicitly installed traits from existing owners, with subjective uncertainty. No identity excerpt, truncation, biography rewrite or unsupported diagnosis. Required-context overflow is incomplete before dispatch. |
| Body and useful ongoing activity | Current permitted bodily conditions, actual commitments/work at stake and available broad alternatives needed for interpretation. Reuse the permitted snapshot projection without enumerating every executable action or generating an action catalog. |
| Safety, separation and escape | What the character actually experienced or knows: acquired withdrawal, reached shelter, ceased observed pursuit or a real action result. These facts do not assert that all hidden enemies are absent or a speaker is truthful. |
| Conflicting feelings and causes | Other required current feelings relevant to the question, independent threats and uncertainty. If an indivisible required set cannot fit, report incomplete and retain valid state; do not answer a falsely simplified question. |

Native validation enforces source, scale, time envelope and authority without dictating the interpretation: the same permitted circumstances may support stronger fear, relief, grief alongside joy or uncertainty. An attack proves no anger, a smile no joy; another actor’s private values/intent remain unavailable unless expressed and perceived.

The existing retrieval owner uses source/subject links and accepted interests/commitments for cognitive relevance. Quiet unrelated grief need not enter every trade; a reminder may make it relevant without a periodic call. Relevance never deletes history, freezes decay, invents observation or masks applicable mechanics. Belief development and wider needs retain their own owners.

### Player and creator views

For the affected owner, native startle can have compact bodily wording and a transient mechanical explanation. Show accepted effective consequences and remaining normal-play time, with pause/speed behavior consistent across reconnect. Never report a pending proposal as the character's accepted feeling. Ordinary nearby observers receive only an actually supported expression, action or sensed physical fact; private numerical amounts, review urgency, source identities and durable receipt handles stay outside their DTOs.

The general design does not add a universal emotion HUD. Existing owner-authorized feeling inspection and useful action feedback are sufficient initial surfaces. A legal evasion preview must use the same admitted reach as the server; a changed bound must produce an understandable refusal/refresh rather than a silently moved destination. Optional accessible bodily feedback can avoid screen shake; no client camera effect is evidence of the character's psychological interpretation.

SA-D01 remains open for directly controlled characters' interpreted-emotion creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control-transfer behavior. Its alternatives and recommendation live in the feature and decision register. Implementation can complete native body support, NPC review, exact effective queries and conditional authority gates without choosing that option. A world cannot disguise an autonomous player-appraisal producer as a body modifier or silently enable it through creator inspection.

Creators use the existing authorization boundary to inspect current policy, pins, accepted source-linked records, review disposition and native contribution explanation. Those diagnostic details are not ordinary gameplay content or actor knowledge. Minimal diagnostics expose operation kind, due reason, source completeness, batch size, policy/pin, actual disposition, current/last accepted value and existing request accounting. Do not log hidden reasoning, duplicate private evidence into a new analytics store or imply a provider answer was accepted when publication refused.

## EP-C11 — Acceptance design

These are requirements for later implementation and qualification, **not executable tests or claims of passing behavior**. Use existing domain/server/storage/AI seams and full player/NPC/native routes. Controlled provider fixtures establish binding and failure handling; separate independently selected behavior and uncoached play establish whether the system is useful and enjoyable. The [EP tracker](../maintainers/emotional-physiology.md) assigns ownership and delivery order.

### Native physiology, composition and real mechanics

| Case | Required observable result |
| --- | --- |
| A01: Unexpected contact | Actual harm/defense resolves from the precontact cut; the same committed outcome adds applicable shock without memory or AI. That new shock cannot alter its own hit or surprise result. |
| A02: Zero-damage contact and harmless cue | A supported physically startling contact/cue can react with no health loss or identified source. An unacquired, weak-ineligible or merely described cue cannot. Harmless surprise does not force interpreted fear or flight. |
| A03: Same cause, several wrappers | Contact, injury, awareness, remembered alias and replay produce one onset/outcome for the exact life/pin. None refreshes duration. A later truly distinct contact can contribute separately. |
| A04: Receipt collision and cold replay | Full canonical identity/body comparison rejects conflicting reuse, including a compact-label collision. Replaying a cold ended reaction returns its original outcome without SQL in an impact callback or reactivation. |
| A05: Timing | Neutral three-normal-second shock has 180 simulation seconds at the base clock and lasts 3/1/0.375 wall seconds at 1×/3×/8×. At half progress, pause/load retains exactly half; equivalent simulation cuts agree across partial advances. |
| A06: Maximum, simultaneous causes | With native 0.6 and appraised 0.8, effective fear is 0.8; adding ten 0.1 causes changes nothing. With independent 0.8 and 0.7 fears, resolving only the first leaves 0.7. Equal ties have deterministic authorized explanation. |
| A07: Persistent versus decaying | Persistent mapped fear can remain 0.8 after every startle ends with zero periodic review calls. A decaying contribution follows its own analytic curve. Joy/anger/grief do not cancel either. |
| A08: Complete membership | A mechanically dominant fear outside the first 24 active IDs still applies. Missing required cold/prepared membership reports incomplete, never zero; native progression retains a coherent prefix. |
| A09: Melee paths | Both equipment/recovery and natural single-phase strikes use the shared attempt resolver once. At full fear, base accuracy 1 becomes 0.75; range failure and the existing random draw semantics remain authoritative. No doubled attempt or extra fear roll occurs. |
| A10: Ranged release | A full-fear shot scales existing steadiness once before its existing direction sample. Practice shares applicable physiology. Subsequent fear changes do not bend the flight or change a collision result; overlapping danger adjustment refuses installation. |
| A11: Evasion | At full fear the base 2-metre offer becomes 1.5 metres. A farther endpoint refuses before cost. A legal admitted endpoint keeps its selected path, duration and speed through later shock and save/load; default directional offers are legal under the same bound. |
| A12: Running and bodies | Ordinary running/fleeing retains its unmodified speed. A hare reacts and enters its lawful native danger response with no mind/model; a nonreactive synthetic body reports inapplicable shock without losing supported private interpretation. |
| A13: Trait distinction | Higher installed composure shortens bodily recovery under the authored formula without lowering appraised fear, revealing a threat or deciding courage. Descriptive “brave” or “sensitive” prose alone changes no coefficient. |
| A14: Source/target lifecycle | Source death/departure/retirement leaves fixed shock active. Target-life end retires it; a new body receives no old shock. A collateral victim uses its own body, life and precontact evidence rather than the intended target's. |

### Appraisal operation and bounded cognition

| Case | Required observable result |
| --- | --- |
| A15: Legitimate same-cause increase | At 30 normal seconds after a 0.25 fear's creation, an exact supported reassessment to 0.75 can be admitted and naturally reaches zero by 210 seconds after creation. Original ID/cause/createdAt/stack/pin and creation receipt remain unchanged. |
| A16: Horizon and original reframe | Ordinary same-cause reframe still cannot alter a decaying value or renew its anchor. Reassessment above the remaining feasible horizon refuses without clamping or invented cause; repeated accepted changes cannot exceed the original horizon. |
| A17: Delayed publication | A value proposed at captured time ages through provider delay before admission. If its proposed lower curve already reaches zero while the original remains active, resolve now with earlier assessed-zero provenance; never backdate mechanics. If the original already ended, reject stale. |
| A18: Retain and uncertainty | Retain leaves every semantic field, lifetime anchor, native deadline and private event unchanged. Unknown is recorded separately. Either parks unchanged support without another timer or paid fallback. |
| A19: Finite intense episode | High fear can use only its three selected attempts under one unchanged support epoch, with positive spacing. Band changes share its ordinal. A meaningful accepted change can schedule the next permitted delay; retain/failure exhausts further automatic work for that unchanged support. |
| A20: Quiet episodes | Mild fear/anger below the timer floor, stable joy and persistent grief create no mandatory periodic provider calls. Merely reading them or restoring a save does not change this. |
| A21: Threshold hysteresis | Actual mechanics change continuously. A review-band crossing must stabilize; oscillation near 0.2/0.5 cannot reset attempts or generate repeated tickets. Falling below the actual timer floor parks future intervals even if hysteresis retains a band. |
| A22: Material support | Selected exact subject/episode/body relations can admit acquired withdrawal, escape, severity change or terminal work. Reject keyword-only testimony, notification-only revisions, empty-subject wildcards and A–B → B–C trigger widening. Across a long routine backlog, fixed-cut metadata continuation resumes without prefix rereads; only proved examined ranges advance, and final support remains complete. Footsteps, countdowns, self-notification, paraphrase and aliases cannot replenish allowance. |
| A23: Several feelings | One character's compatible eligible fear, joy and grief use one admitted batch, at most one write per exact feeling. Independent valid components can succeed when another becomes stale; the output reports each actual outcome. |
| A24: Required-source overflow | More than the component source bound, request source union, operation bound or byte/work envelope leaves the indivisible question incomplete. No required source is silently dropped; selected complete independent components may proceed under their existing admitted batch. |
| A25: Ordinary activity continues | A standalone review can settle during walking/cooking/repair without selecting or restarting an action, requiring a thought or touching goals. Irrelevant action progress does not stale it; a relevant new escape/threat/condition does. |
| A26: Threat reuse | A real urgent threat's existing first stage can accept compatible due review components without a third call. Stage two uses accepted results. Its failure retains accepted emotion, does not invent an action and does not start a repeat pipeline. |
| A27: Ordinary evidence remains available | A standalone review acknowledges only captured emotional reasons. A simultaneous invitation, question, injury or other unconsumed ordinary cause remains available to its actual director/action pipeline. |
| A28: Cost and failure | Capacity/funding/provider absence before submission parks one existing ticket on relevant availability, without spending an attempt or blocking native work. A submitted failed/invalid/uncertain request consumes its exact attempt and has no automatic paid retry. Existing interactive headroom and request ceilings remain protected. |
| A29: Loop resistance | Actual private changed receipts carry trusted operation provenance. Their publications, journal replay, threshold notifications caused by those publications and repeated context reads cannot recursively purchase a review or create a new appraisal cause. A later real physical action result remains eligible. |
| A30: Journal replay | Replayed exact accepted/no-change/refused outcomes return the original result under current authority. Conflicting content refuses. A crash after dispatch, after mutation or before response delivery never grants a duplicate mutation or a second automatic billable submission. |

### Privacy, lifecycle, product and qualification

| Case | Required observable result |
| --- | --- |
| A31: Independent minds | A comforting speaker, smiling actor or attacking character cannot set another person's feeling. The listener may independently interpret perceived words as welcome, insincerity, pressure or nothing; private intent is unavailable. |
| A32: Correction during waits | Correct/forget required memory during preparation/provider/publication. Current broad actor-appraisal invalidation fences the update and all derived private views. Native physical shock still ends on its own short curve; erased evidence is not reconstructed. |
| A33: Control and body transfer | Exact account/control/life changes invalidate pending authority. No old-life effect reaches the new body. SA-D01's eventually selected masking/writer behavior and visible control-transition feedback must be qualified before claiming player interpreted-emotion delivery. |
| A34: Partial restore and definitions | Active/cold records, retained pins, review claims and normal/simulation time validate together. Unloaded is not absent. Unsupported pin replacement refuses even after the last active feeling ends. |
| A35: Rescue while afraid | An independently characterized person can choose valued rescue despite fear, continue useful movement, experience actual escape and reconsider without a mandatory speech/action interruption. Cover, routes and cooperation give the player useful choices; fear does not turn rescue into a movement-speed trap. |
| A36: Victory, food and grief | A meaningful meal/success can support joy while fear fades and qualitative grief remains. No trauma, global need points, forced gratitude or combat buff is required. Completing a threat can remain a real success. |
| A37: Celebration and chosen fright | An abrupt welcome or deliberately enjoyed frightening activity can produce bodily startle alongside different private interpretations. Consent, actual threat, enjoyment and expression remain separate evidence. Activities not yet supported are content opportunities, not implied implementation. |
| A38: Returned traveller | New personally acquired evidence can revise or resolve a grief interpretation without erasing the person's historical experience or updating unaware characters. Disagreement and uncertainty remain possible. |
| A39: Different characters | Compare composure, courage, sensitivity, persistence, temperament and coping through coherent individuals facing the same permitted circumstances. No fixed label deterministically selects an action. A practical coping activity may help, fail or matter differently to each person. |
| A40: Workload and usefulness | Use concentrated combat, many quiet inhabitants, repeated cues, multiple causes, paused/accelerated play and save/recovery through actual boundaries. Measure preparation/native work, one-ticket coalescing, calls/cost, staleness and skipped/dormant dispositions; verify no added per-frame actor scan or unbounded queue. Independently assess legibility, agency, enjoyable consequences and unnecessary interruption. |
| A41: Changing strongest fear and review bands | Let fast native startle initially exceed slower interpreted fear. When the native curve ceases to be strongest, complete mechanics remains the maximum and channel recovery eligibility waits for every applicable contribution to cross the threshold. A persistent fear floor prevents a false downward crossing. Individual appraisal intensity still selects its own cadence. Verify equal-boundary stabilization, one coalesced ticket, review-publication rebaselining without recursive eligibility, no body-only/dormant review, no duplicate attempts, and restored candidate continuity without catch-up. |

Qualification must preserve existing appraisal/social-continuity, combat/threat, speech/perception, action, save/load and authority acceptance that this extension touches. Add only meaningful later implementation checks tied to these concrete risks; passing pure helper arithmetic alone does not establish integration or fun. Numerical tuning remains provisional until those comparisons support it, while source/privacy/no-loop/clock/ownership contracts are invariants.

## EP-C12 — Implementation and specialist handoff

| Consumer/owner | Required input from this design and precise responsibility |
| --- | --- |
| F: surprise/attack designer | Consume EP-C05's original physical cause/result and exact target life, EP-C06's complete fear/parameter query, and EP-C07/SC12's frozen cuts. F owns unexpected-contact eligibility, preparedness/surprise and damage/armor/rounding. Use one melee attempt resolver for both paths, ranged release steadiness and frozen newly admitted evasive reach. Never apply the new hit's shock to itself or retain an overlapping danger factor. |
| A/C: perception/acoustics designers | Supply actual acquired abrupt cue/original exposure transition with exact receiver/life/order and body applicability. No named source or memory is required for native startle; unheard/unacquired facts cannot trigger it. D consumes their shared contracts without merging or prescribing their internal signal laws. |
| E: attention/agency designer | Reuse one ActorWork ticket and its exact changed-actor/deadline inputs. Emotional review is an independent optional operation with operation-specific acknowledgement; threat/ordinary causes retain their own consumption and urgency. Native animal action selection remains its response controller. |
| G: player-view designer | Show supported owner bodily feedback/effective action consequence and coherent normal-play durations. Preserve private appraisal/review/source information, full/patch symmetry and current controller authority. Respect the unresolved interpreted-player producer gate and accessible presentation. |
| Appraisal/cognition implementer | Extend current owner/receipt/schema/index/preparation/execution seams in EP01–EP07. Preserve delivered create/reframe/resolve, target stacking, correction and complete source proof. Do not reuse a mandatory-thought reflection response as emotion-only review. |
| Shared implementation | Preserve SC01–SC14, exact A/C cause families, E coalescing, F sampling and G disclosure across each complete delivered path. Recheck actual source seams on the implementation base and retain current runtime/qualification status. |

The native body, NPC interpretation/review, general effective query and surprise contracts are ready for implementation planning independently of SA-D01. The directly controlled creation/review, retained mechanical applicability, disclosure and control-transfer slice remains blocked on explicit SA-D01 selection and its conditional acceptance. Other listed tuning values are selected authored starting points with qualification tasks, not unassigned design questions. Broader needs, dream/older-memory transformation, experience-shaped personality, general process authoring and unrelated repertoire systems retain their existing open owners.

## Maintained records

- Product behavior: [Feature specification](emotional-physiology-feature-spec.md).
- Implementation: [Emotional physiology tracker](../maintainers/emotional-physiology.md).
- Limits: [Feelings inventory](../limits/feelings.md), with existing cognition, memory, native-work and AI-execution limits retained.
- World choices: [Psychological reactions](../worlds/base/psychological-reactions.md).
- Shared contracts: [Stealth-awareness technical design](stealth-awareness-tech-design.md).
