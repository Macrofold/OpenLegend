# Emotional physiology and adaptive reappraisal — technical design

| Status | Current progress | Last updated |
| --- | --- | --- |
| In progress | Ownership and source-grounded integration boundaries are specified; detailed schemas, flows and acceptance design are in progress. | 2026-10-19 |

## Authority and delivery boundary

This is specialist SAD-D's design under [SC08–SC09](stealth-awareness-tech-design.md#emotions-and-reconsideration), SC12 ordering and SC13–SC14 time/lifecycle. The [feature specification](emotional-physiology-feature-spec.md) owns product behavior. [The tracker](../maintainers/emotional-physiology.md) owns delivery and acceptance. This module consumes selected ND11/ND19 emotion scope; it neither merges another specialist branch nor implements runtime behavior.

The inspected source is Macrofold/OpenLegend at `a3d40b4d71e29d6504e9f3fcc21e76344a0a284e`. Existing code is evidence of delivered mechanisms; proposed contracts below require coordinated changes to their current owners and consumers. No legacy API, save reader, parallel emotion database, general expression evaluator or new scheduler is introduced.

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

Reassessment must retain the original appraisal ID, cause, stack key, creation time, definition meaning and creation receipt. A decaying proposal selects a current value at a captured simulation time. Native admission checks the immutable original-cause horizon and ages the proposed value through any publication delay. An unchanged result never renews its curve, semantic revision, event or review allowance.

Review bookkeeping has its own operational revision. Changes to that bookkeeping must not invalidate unrelated ordinary decisions as though the person's feelings changed. A standalone review acknowledges only its own captured opportunity; it cannot advance the director's ordinary evidence-consumption position or swallow an unanswered invitation or threat.

## EP-C01 — Definitions, capabilities and single ownership

All shapes in this design are proposed contracts on existing owners, not implemented APIs. Extend the current definition/schema/validator together; do not retain an older writer or a second schema for development saves. The engine implements finite trusted reaction, lifetime, aggregation and review families. The installed world selects emotion names, scale meanings, bodies, traits, conditions, tuning and review opportunities. Definition labels and freeform prose never install executable rules.

| Definition extension | Required fields and interpretation |
| --- | --- |
| Appraisal definition | Preserve existing ID/version/pin, label, cause kinds, target/cause stacking, qualitative/scaled value, lifetime, decision and reflection permissions. Add optional review policy and optional mechanical-channel mapping. Omission of review means no independent review enrollment; omission of mechanics means no direct stat effect. |
| Review policy | Supported reason discriminants; allowed reassess/resolve/retain outcomes; positive minimum dispatch spacing; finite attempts per unchanged support; optional intensity-band interval lists; hysteresis/stabilization; original-cause maximum reassessment age for a decaying family; supported evidence/context selectors. No executable predicate strings. |
| Bodily reaction definition | Exact pin; supported producer stimulus kinds; target body/receptor applicability; admitted susceptibility/recovery inputs; amplitude rule; normal-play duration and curve; channel mapping; native ending rules and owner-visible wording. No cognition permission is implied. |
| Mechanical channel | Installed ID and compatible scaled meanings; finite normalization; aggregation family; body applicability; supported parameter mappings and their units/composition/clamp owner. The initial trusted reducer is maximum. Adding a new reducer requires a real consumer and its mathematical contract. |
| Emotional review capability | Existing permitted cognition execution plus appraisal/memory ownership, installed review permission, current controller authority and appropriate body eligibility. This is independent of speech, deliberative goal selection, autonomous locomotion and inner-world workspace editing. |
| Mechanical trait binding | Exact installed numeric attribute or reviewed mechanical trait definition, scale/neutral value and explicit reaction modifier. Existing descriptive traits remain prose. Missing optional modifier means the declared neutral value; an invalid required binding refuses installation. |

Use one coherent installed emotional-policy group through the existing module manifest and definition-pin machinery. Appraisal meanings remain with the appraisal definition owner; body eligibility remains with the body policy; parameter definitions remain with their actual action/stat owner. The policy group refers to those exact definitions rather than copying their values into server prompts or client controls. The proposed bundled authoring owner is the existing base appraisal/body policy composition, with one small base emotional-policy module only if needed to avoid duplicating its shared reaction/channel/review data.

The world author can install another supported emotion, omit fear, use qualitative grief, or select persistent/condition-sustained fear through the same current families. It cannot introduce an unimplemented hormone simulation, arbitrary emotion-to-stat script, unrestricted mind reading, numeric social reciprocity or a player-control grant. Inspection/editing uses existing creator authorization and current definition dependency checks. No new general creator dashboard or ACT09 process-enrollment UI is part of this slice.

## EP-C02 — Time, native lifetime and psychological change

Every newly authored player-facing duration here uses **normal-play seconds**. At admission, the existing clock owner converts an authored duration d into simulation duration d × r, where r is the installed normal-play simulation rate. Runtime speed changes advance that same clock faster; they do not multiply an already converted duration. External request deadlines, operational database backoff and billing remain wall/monotonic time under their existing owners.

For the appraisal lifetime representation, replace the current ambiguous duration/rate fields with explicit authored normal-play units in the current schema: fixed expiry uses durationNormalSeconds; linear decay uses decayPerNormalSecond and the existing notification bands. Current fear/discomfort 0.25 per game hour and anger 0.125 per game hour are explicitly converted at the selected base rate, preserving their current normal-play curves. The world policy section owns the exact values. Do not merely relabel perHour, silently change a pin's meaning, or maintain both independently editable rate fields.

An admitted timed lifetime retains the exact definition pin, normal-clock conversion at admission, original creation time and simulation anchor/deadline/rate needed for continuation. A derived compiled rate is owned preparation, not another editable world rule. Existing unrelated calendar-authored mechanics keep their declared units. This task does not globally rewrite all game-hour policies or ACT09 process intervals.

| Lifetime | Native continuation | Allowed psychological reassessment |
| --- | --- | --- |
| Decaying scaled appraisal | Current value comes from its accepted anchor and pinned rate; due zero resolves it natively. | Revise the current amount under the original-cause horizon and exact opportunity below. Neither read nor no-change changes the curve. |
| Persistent scaled appraisal | No implicit decline or expiry. | Supported new amount or resolution; finite review allowance still applies. Dormant review does not reduce the value. |
| Persistent qualitative appraisal | Remains active until a lawful resolution/invalidation; there is no fabricated intensity. | Retain, supported provenance reframe, or resolve. There are no assumed stages of grieving or automatic recovery deadline. |
| Fixed expiry | Original admitted expiry remains authoritative. | Supported value/interpretation change cannot move expiry. |
| Condition-sustained appraisal | Existing condition/process owner controls the actual episode's continuation. | A review cannot keep an objectively false native condition alive, re-enroll a process or replace its episode. Native condition meaning and personal interpretation remain distinct. |
| Bodily startle | Deterministic short curve under the admitted bodily rule. | Not model-writable. Reappraisal of fear never stretches, clears or recreates physical startle. |

A transient fear reaching zero means that this authored temporary contribution ended. It does not prove safety, courage, forgiveness, loss of memory or resolution of an encounter. An installed persistent fear may keep mechanical fear high indefinitely without periodic AI; a decaying record is never silently promoted into that family. A genuinely new eligible occurrence can use the existing create path with its own provenance.

Pause freezes all simulation progress. A three-second reaction saved halfway through resumes with half remaining, not a new onset. Speed changes and native partial advances preserve the same analytic value at the same simulation time. A supported live change to clock conversion settles prior progress and rebinds remaining work through the clock/installation owner; otherwise the edit is refused while retained pins depend on it. Merely reopening the application provides no elapsed offline decay or missed model calls.

## EP-C03 — Exact appraisal and review records

Preserve the actual existing evidence shape: AppraisalEvidence contains kind, actorId, sourceId, sourceVersion, occurrenceId, coverage, subjectIds and optional recallEpisodeId. Use its existing permitted-source resolver and exact family/observer bindings. Memory ID, original occurrence ID, current source revision and recall episode solve different problems; none is interchangeable.

An internal review is an operation on an existing cause, not a sixth external AppraisalCause category. Keep the original Appraisal ID, actor, target, stack key, definition pin, cause, createdAt, creationOperation and predecessor linkage. A current interpretationSource may record eligible additional provenance, but cannot overwrite the original occurrence or manufacture a new creation identity.

Add an optional review subrecord to the existing Appraisal. Store it through mind_appraisals and the current world-record tree. Do not put reviews into AppraisalProcess: those existing explicit condition/disposition processes create feelings and currently scan their enrolled registry on appraisal advance.

| Saved review field | Required meaning |
| --- | --- |
| reviewRevision | Operational revision used to claim/acknowledge a review; separate from Appraisal.revision, which fences emotional meaning. |
| supportEpoch | Application-owned sequence/identity for the admitted material support set. It is not a model request ID or a new external event. |
| support | Bounded exact permitted evidence/condition references and their coverage; original cause remains on the appraisal. Select an eight-source envelope per review binding, borrowing the existing authored-cause sourceRefs bound as a proposed review limit rather than claiming an existing review API. Oversized indivisible support is incomplete, never truncated into a different question. |
| opportunity | Monotonic owner-issued ordinal within this appraisal, with exact original-cause and epoch binding. Never reset on load, paraphrase, target disappearance or retry. |
| attemptsUsed | Number of durably claimed submitted-attempt opportunities in this support epoch, including unsuccessful/uncertain attempts; never a success counter. |
| disposition | dormant, scheduled, eligible, claimed or ended, with a closed reason: unchanged, exhausted, unavailable, incomplete, capability-blocked, resolved, invalidated or superseded as applicable. |
| nextAt / notBefore | Optional simulation deadline and positive dispatch spacing. A dormant record has no periodic deadline. Native lifetime deadlines remain separate. |
| reviewBand | Last settled band and optional candidate-band stabilization deadline, only where the installed review family uses it. It is scheduling state, not a second emotion amount. |
| lastAttempt | Exact existing durable request/operation reference and terminal disposition where available. Full past replay protection remains in the existing receipt/journal owner, not an unbounded array on the feeling. |

The stored original-cause horizon for a reviewable decaying appraisal is fixed at original creation from the admitted definition and clock conversion. Its value must agree with that definition at current-format validation. It cannot be extended by another support epoch, ordinary reframe, provider delay or review acceptance. A true new-cause create is a separate record and follows target/cause stacking normally.

Revision guards compare relevant appraisal membership and semantic revisions, exact selected source/definition/context dependencies, and review claims separately. Update current whole-appraisal-container guards in appraisal-context.ts: a no-change receipt or review deadline must not invalidate unrelated ordinary cognition merely because an object identity changed. A real changed value, source correction, new relevant membership or native lifetime ending must still invalidate the appropriate consumer.

## EP-C04 — Reassessment algebra and admission

Extend AppraisalChange with a closed reassess operation, admitted only with a server/native-bound ReviewOpportunity. Model output names a supplied feeling/opportunity handle and selects retain, resolve or an offered/current supported value. It does not supply raw actor IDs, source hashes, creation time, horizon, target, pin, urgency, allowance or publication authority. Reuse AppraisalValue rather than introducing an incompatible numerical payload.

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

Persistent scaled families use their installed scale without a synthetic horizon. Qualitative families retain their nonnumeric meaning. Fixed-expiry and condition-sustained families obey their existing ending authority. Reassessment cannot retarget, change family/pin, alter original source history, clear another feeling, convert an opinion into fact, modify biography or resurrect a terminal record.

### Publication and component results

Prepare at most one operation for each exact active appraisal. The dedicated batch may include independent feelings, but never multiple writes whose ordering would decide the same record's value. Decode the complete bounded envelope first. In the existing serialized response/publication boundary, validate each component against its exact claim and current semantic dependencies; accept independent valid components and report stale/refused ones separately. No model-created coupling or cross-character write is supported.

For each accepted component, commit its appraisal change (if any), review disposition and operation receipt in the same existing authoritative transition. The enclosing response receipt records actual per-component outcomes. A crash cannot leave a changed feeling without its corresponding consumed review outcome. Replays consult that durable receipt before current new-operation eligibility; identical content returns the earlier result under current disclosure authority, conflicting content refuses. Appraisal.lastOperation alone is insufficient to replay arbitrarily old requests after later changes.

Retain/no-change changes only review bookkeeping and request accounting. It does not change Appraisal.revision, value, lifetime anchor, changedAt, target, original cause, interpretation source, next native lifetime boundary, accepted mind files, goals or public behavior. It emits no appraisal-changed occurrence. Unknown, unsupported, refused, invalid, stale, unavailable and capacity outcomes remain distinguishable from a successful retain.

A real changed appraisal publishes its actual old/current/new amounts, assessed time, accepted time, source/coverage, policy and owning receipt through the existing private structured experience boundary. Optional concise personal wording may be projected from those facts; no explanation text or hidden model reasoning is required. Such a publication can inform a later deliberate choice, but is not a new independent emotional cause.

## EP-C05 — Native bodily reaction admission and receipts

The proposed native port is `admitBodilyReaction(world, preparedCause, preparedBody, at)`. These are owner-prepared arguments, not client/model payloads. The result is a structured `admitted`, `replayed`, `inapplicable`, `incomplete` or `conflict` outcome. An admitted result supplies the exact contribution ID/revision, onset and ending time, selected definition pin, admitted peak/curve and affected physical life. Replayed returns that original result; it does not recompute traits, restart a duration or publish another onset. Inapplicable means a completely resolved body/rule does not support the reaction. Missing required preparation is incomplete, never inapplicable.

| Prepared cause field | Producer and validation |
| --- | --- |
| Cause kind | Closed union: an actual physical contact outcome, a personally acquired abrupt sensory occurrence, or an admitted physical exposure transition. These are the SC08 families; add no generic freeform emotional stimulus command. |
| Original identity | Full original invocation/projectile outcome/acquisition/transition identity and its native ordered stage. Wrapping injury, contact, awareness, memory and appraisal notifications remain aliases of the same original cause. |
| Stimulus class | Installed `unexpected-attack-contact` or `abrupt-acquired-cue` rule. F establishes unexpected contact through its exact victim preparation/evidence cut. A/C establish actual abrupt reception through the receiver's body and their signal laws. D never reads hidden attacker intent or treats a model's description as a sensory transition. |
| Target and time | Exact affected actor/entity, physical-life identity, timeline generation, simulation time and occurrence order. The collision victim may differ from the intended target. |
| Physical support | Existing authoritative committed contact/acquisition facts and the prepared reaction/body rule pins. No named attacker, autobiographical memory, full enclosing world event, speech interpretation or model call is required. |
| Freshness proof | An owner-issued still-unconsumed native producer stage, or an exact retained prior outcome prepared through the canonical contribution receipt owner. A caller-provided `fresh: true` is not proof. |

The first supported fear-channel reaction has a linear curve from an admitted peak to zero at a fixed admitted duration. Body/species applicability, susceptibility, recovery/composure and applicable physical-condition modifiers are resolved once at onset from exact installed numerical bindings. Their admitted values and dependency pins are recorded. Later descriptive personality text cannot reinterpret those numbers. A later real bodily effect may independently modify its own supported parameter; changing an already admitted shock curve requires an explicitly designed native operation, which this initial profile does not provide.

### One canonical contribution record

Extend the existing independent contribution origin into a discriminated union. Its current live-source branch retains exact source-sustained semantics. The native-body-cause branch instead retains original cause, target life, onset, immutable admitted rule/peak/duration/curve, and immutable onset receipt. It has no required live `$source` reference. Do not use the recipient as a fictitious source or keep a vanished shooter/object alive to preserve a fixed reaction.

The record remains under `Entity.statusEffects[id].contribution` and the existing `sim_status_effects` world-record mapping. Update schema validation, `effectBindings`, `status-capabilities.ts` source bindings, fixed ending and retirement together. A body-cause origin does not participate in live-source retirement pins. Native expiry changes active state/revision while retaining the original onset outcome. Cold terminal contribution history remains canonical under existing compaction/residency; absence from the active map cannot authorize another onset with that identity.

Reaction identity compares the complete canonical tuple of original cause, reaction definition pin and target physical life. A compact deterministic label may index it, but equality must also compare the full tuple and admitted operation body. The existing nonsecurity `contentLabel` alone is not collision-proof identity. An identical replay returns its receipt; conflicting identity/body reuse refuses before a mutation. If the original producer recorded a fully resolved inapplicable outcome, replay retains that outcome even if a later body/policy would react differently.

Fresh native contact admission is synchronous because the enclosing producer already proves one new still-unconsumed outcome: a melee attempt transitions out of its strike stage, a live flight commits its terminal contact, or an original acquisition/exposure transition is consumed. Allocate the reaction and its receipt in that same authoritative transition. A later duplicate/retry cannot claim that fresh stage again. For old or externally prepared deliveries, add an exact bounded `contributionOutcomes` lookup analogous to `appraisalOutcomes`; the storage owner prepares the requested identities, full operation bodies and a scoped completeness proof before native publication. Neither path scans all historical contributions or performs SQL at impact.

### Stacking and native consequences

Genuinely separate abrupt occurrences can create separate short contributions. The same burst's repeated publication, the same contact's damage event and its personal memory cannot. New causes neither add intensity into a total nor extend an older record: their current applicable values participate in EP-C06's maximum. A fresh strong cause can therefore dominate a fading one, while duplicate delivery has no mechanical effect. A resolved body with no reaction profile contributes nothing; a memoryless reactive body remains fully eligible.

Physical reaction does not choose an NPC action. The selected hare alarm/flee controller can consume the same exact acquired danger through its existing native response episode and independently choose its installed flight rule, without cognition or memory. Share original cause/life deduplication with that controller; do not create another danger episode from the resulting startle notification. A startle caused by a harmless abrupt cue need not be classified as danger. A humanlike person's fear does not force fleeing, freezing, surrender, speech or a facial animation.

The physical-outcome preparation owner reserves the required contribution work and complete mechanical inputs before advancing through a dependent outcome. If the bounded native work allowance cannot complete the affected slice, retain a coherent uncommitted prefix and resume it under the existing native-work owner. Do not commit an attack and silently omit its selected reaction, or substitute zero for unprepared mechanics. Irrelevant cold history is not required on the proven-fresh path. Native expiry uses the existing due index rather than a scan of all actors each frame.

## EP-C06 — Complete effective fear and parameter resolution

`effectiveEmotion(channel, actorLife, cut, preparedInputs)` is a proposed read-only domain query. The input handle proves complete active membership for that actor/life and channel at the supplied ordered simulation cut: all applicable native reaction contributions and all mapped active appraisals, exact definition pins and relevant body/control authority. The result is complete with a finite value and bounded owner-authorized explanation, or incomplete with a closed reason. It never returns a plausible partial value. A complete empty set returns the channel's declared neutral value.

For initial fear, normalize each mapped scaled appraisal using its installed meaning and range, evaluate each current bodily curve analytically, and take the **maximum** of all applicable values. The base range is 0–1. This is the only aggregation authority. Clients, prompts, combat and species controllers do not independently reconstruct or save a global fear total. A revision-keyed prepared aggregate may cache this calculation, but it is disposable, read-only and invalidated by complete membership, definition, life, control and native time-boundary dependencies.

Distinct directed fears remain separate private records. Fear of one opponent ending does not clear fear of another; unidentified danger does not invent a target. A target-stacked family keeps its existing one-active-record-per-exact-definition/target semantics, including admitted replacement and predecessor history. Several still-relevant causes supporting that one interpretation are supplied together through its bounded source support; their numbers are not summed. Cause-stacked families preserve independent original occurrences.

Mechanical applicability is an explicit world/body/channel rule, not a hidden search for an objectively nearby threat. Current persistent fear may affect precision after a person escapes, and the departure of a target does not mechanically prove recovery. Old resolved feelings or merely recalled historical amounts do not apply. A private actor's current fear can be mechanically relevant even if it is temporarily omitted from an optional language-context display. The engine must therefore read complete active mechanical membership independently of the 24-record convenience projection.

Only mapped fear contributes to the initial fear channel. Joy, anger and grief coexist without subtracting, adding a universal mood bonus or canceling fear. Another authored emotion can acquire direct mechanics only by declaring a supported meaning, applicability and parameter mapping; renaming a meter is insufficient.

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

The current ranged `danger-or-return` condition option must not stack a second fear-like adjustment with this channel. The selected base ranged policy already uses `conditionAdjustment: none`; retain that selection and apply the generalized shooter physiology once. For another installed profile, admission rejects a simultaneous overlapping danger adjustment and emotion mapping. A genuinely different future physical condition factor needs a distinct declared meaning and owner; renaming the existing danger factor does not satisfy that requirement.

Tie explanations retain the actual equal strongest contributors in the prepared evidence set, with deterministic ordering for diagnostics. Display may summarize or bound its list with an explicit count without changing the complete numeric result. Ordinary other-character views never reveal private contributors, exact intensities or inferred identities from that explanation.

## EP-C07 — Ordered physical outcomes and native animals

Follow SC12's shared ordering exactly. First advance due physical/effect boundaries and acquire any sensing which genuinely occurred earlier. Freeze the attacker's release/attempt inputs and the **actual victim's** precontact evidence, life and effective defense cut, ordered by simulation time plus native occurrence order. F resolves preparedness/surprise, native defense, contact and damage. Commit that outcome, its injury/interruption and any newly admitted bodily shock. Only then publish personal evidence and make compatible cognition eligible.

An impact's own shock can influence a later attempt at the same simulation timestamp with a later occurrence order; it cannot influence itself. Two simultaneous contacts are serialized by the existing authoritative order, never by network response arrival or arbitrary array enumeration. A previously acquired warning counts only if its acquisition precedes that victim cut. An enclosing contact/awareness event is not required before the native reaction, and `Awareness.sequence` alone is not an adequate temporal predicate.

For a ranged collateral hit, use the struck body's own applicable reaction rule and precontact defense/evidence, not the intended victim's. The shooter can die or the projectile entity can retire after the committed outcome without ending the target's fixed shock. Target physical-life end retires that effect. An animal's loss of a known source is handled by its native response/observation owner; emotional mechanics cannot supply hidden pursuit coordinates.

At 1×, 3× or 8×, equivalent simulation cuts produce identical native curves, eligibility and outcomes for the same admitted action/random inputs. Paused simulation creates no native recovery. Partial native work stops at a coherent cut; neither deferred sensing nor a still-uncommitted new shock is retroactively inserted before a completed contact. Required preparation and finite work admission therefore belong before the relevant physical stage, not in a later UI or model callback.

## Maintained records

- Product behavior: [Feature specification](emotional-physiology-feature-spec.md).
- Implementation: [Emotional physiology tracker](../maintainers/emotional-physiology.md).
- Limits: [Feelings inventory](../limits/feelings.md), with existing cognition, memory, native-work and AI-execution limits retained.
- World choices: [Psychological reactions](../worlds/base/psychological-reactions.md).
- Shared contracts: [Stealth-awareness technical design](stealth-awareness-tech-design.md).
