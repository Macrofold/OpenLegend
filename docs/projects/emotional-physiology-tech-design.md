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
| support | Bounded exact permitted evidence/condition references and their coverage; original cause remains on the appraisal. At most the existing eight-source supported envelope per selected review binding. Oversized indivisible support is incomplete, never truncated into a different question. |
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
- If the existing record has ended or its semantic/source dependencies changed, reject the stale result. If a valid proposed curve is already at minimum when publishing, admit the corresponding resolved result with its actual timing; never revive the record.
- Native time passage within the same semantic dependency interval is handled analytically. A relevant native threshold/lifetime transition or changed required condition may make the prepared question stale; preserve explicit refusal and accounting.

This permits legitimate same-cause intensification and reduction without bypassing reframe. A mild initial fear can become stronger when the character better understands the existing danger, but cannot indefinitely restart itself. For example, using the authored base fear rule, an initial 0.25 fear may be reassessed 30 normal seconds later to 0.75 and fade naturally by 210 seconds after creation. The same original cause cannot be assigned 0.75 near its 240-second horizon. These are consequences of an explicit authored envelope, not a claim about human recovery.

Persistent scaled families use their installed scale without a synthetic horizon. Qualitative families retain their nonnumeric meaning. Fixed-expiry and condition-sustained families obey their existing ending authority. Reassessment cannot retarget, change family/pin, alter original source history, clear another feeling, convert an opinion into fact, modify biography or resurrect a terminal record.

### Publication and component results

Prepare at most one operation for each exact active appraisal. The dedicated batch may include independent feelings, but never multiple writes whose ordering would decide the same record's value. Decode the complete bounded envelope first. In the existing serialized response/publication boundary, validate each component against its exact claim and current semantic dependencies; accept independent valid components and report stale/refused ones separately. No model-created coupling or cross-character write is supported.

For each accepted component, commit its appraisal change (if any), review disposition and operation receipt in the same existing authoritative transition. The enclosing response receipt records actual per-component outcomes. A crash cannot leave a changed feeling without its corresponding consumed review outcome. Replays consult that durable receipt before current new-operation eligibility; identical content returns the earlier result under current disclosure authority, conflicting content refuses. Appraisal.lastOperation alone is insufficient to replay arbitrarily old requests after later changes.

Retain/no-change changes only review bookkeeping and request accounting. It does not change Appraisal.revision, value, lifetime anchor, changedAt, target, original cause, interpretation source, next native lifetime boundary, accepted mind files, goals or public behavior. It emits no appraisal-changed occurrence. Unknown, unsupported, refused, invalid, stale, unavailable and capacity outcomes remain distinguishable from a successful retain.

A real changed appraisal publishes its actual old/current/new amounts, assessed time, accepted time, source/coverage, policy and owning receipt through the existing private structured experience boundary. Optional concise personal wording may be projected from those facts; no explanation text or hidden model reasoning is required. Such a publication can inform a later deliberate choice, but is not a new independent emotional cause.

## Maintained records

- Product behavior: [Feature specification](emotional-physiology-feature-spec.md).
- Implementation: [Emotional physiology tracker](../maintainers/emotional-physiology.md).
- Limits: [Feelings inventory](../limits/feelings.md), with existing cognition, memory, native-work and AI-execution limits retained.
- World choices: [Psychological reactions](../worlds/base/psychological-reactions.md).
- Shared contracts: [Stealth-awareness technical design](stealth-awareness-tech-design.md).
