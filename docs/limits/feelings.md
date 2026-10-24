# Feelings and social continuity: limits and constraints

[Feature contract](../projects/completed/appraisal-social-continuity-feature-spec.md) · [Implementation work](../maintainers/actor-model.md#advanced-emotional-state-foundation) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline unless an entry explicitly identifies a selected future target. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [appraisals.ts](../../packages/domain/src/appraisals.ts), [appraisal-context.ts](../../apps/server/src/appraisal-context.ts).

## LA080

**Removed — current foundation · Restrictiveness: — (removed).**

The former 16-strongest-feelings retention cap is gone. Persistent cause-linked feelings use native-work admission and paginated reads; reflection input remains separately bounded (FL07).

**Reason / tradeoff:** Avoid silently losing durable feelings due to a tiny count cap. Native retained-work admission is finite; total historical storage and cold-index reconstruction are separate costs, not made bounded by a page size.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

Original finding and recommendation superseded by the merged implementation; the ID remains stable.

## LA081

**Current — source-inspected 2026-09-26 · Restrictiveness: Medium.**

The bundled fear/discomfort definitions decay by 0.25 intensity per game hour; interpreted anger decays by 0.125. This is an explicit world policy, not a default lifetime for every feeling; other installed policies can persist or follow conditions.

**October 18 installed selection:** [FL24](#fl24--interpreted-threat-reactions) replaces automatic fear production with source-linked interpretation and adds anger through the two-stage threat route. Discomfort remains bodily experience. Mechanical integration is qualified separately from independent character behavior.

**Reason / tradeoff:** Review this fading rate as a behavior rule rather than removing it as an unnecessary processing limit.

[Implementation starting point](../../packages/domain/src/worlds/base/appraisals.ts). [Current social rules](../worlds/base/social.md#feelings).

Original recommendation: **Review**.

## FL01

**Reported · Restrictiveness: Very safe.**

Creation requires a **living, memory-capable actor**.

**Reason / tradeoff:** Use actors that have supported memory/cognition ownership; other emotional entities are not integrated.

## FL02

**Reported · Restrictiveness: Very safe.**

Five supported cause categories: perceived event, memory, condition, disposition and explicit authoring.

**Reason / tradeoff:** Keep causes typed and inspectable; additional causal families require resolvers.

## FL03

**Reported · Restrictiveness: Medium.**

Each record has **one target or none**, and either a qualitative label or one bounded numeric value.

**Reason / tradeoff:** Simple directed records retain clear evidence; multidimensional or multi-target feelings need another contract.

## FL04

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Stacking is limited to separate causes or **replacement within the same actor, exact definition revision and target**. A new feeling does not replace a different feeling family merely because both concern the same person. There is no additive/blended aggregation in this current stacking owner. The selected [FL26](#fl26--complete-effective-emotion-mechanics) adds a read-only maximum fear channel without changing these records' stacking. [Identity and replacement owner](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Avoid hidden arithmetic across meanings; authored blending needs a defined reducer.

## FL05

**Reported · Restrictiveness: Very safe.**

Lifetimes: persistent, fixed expiry, **linear decay**, or condition-sustained. Decay supports at most **16 notification thresholds**.

**Reason / tradeoff:** Deterministic finite lifetime families and bounded notifications keep native scheduling predictable.

## FL06

**Reported · Restrictiveness: Very safe.**

AI reflection supports only explicitly enabled event/memory policies using separate causes. It cannot create condition/disposition processes or new policies.

**Reason / tradeoff:** Keep model output within enabled trusted policies; model proposals cannot author new native processes.

## FL07

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Reflection may propose **8 feeling changes**. Source preparation considers only the first **48 supplied evidence IDs**, then keeps the eligible scoped sources returned by the repository. Feelings come from the first page of at most **24 currently active records**, subject to QU09’s 200-record scan window; this is stable ID order, not relevance or strongest-first ranking. The reflection adapter does not follow the continuation cursor. These are model-context selections, not retention limits. [Context owner](../../apps/server/src/appraisal-context.ts) · [Output schema](../../apps/server/src/cognition-contracts.ts).

**October 17 selected consumer:** [FL24](#fl24--interpreted-threat-reactions) requires complete relevant subject/source-bound feeling acquisition for threat decisions through this same owner, using exact lookup or continued pages. The current reflection prefix remains a baseline fact; copying it cannot satisfy that selected required-context contract.

The installed threat preparation uses exact feeling scopes
and complete source binding: more than 48 required IDs or an unavailable required
source refuses preparation. It offers at most one question per exact definition
and target, checks stored cause outcomes before offering a fresh intensity, and
refuses a complete set exceeding the native response's 16 operations. Ordinary
reflection retains its separate eight-change and optional-source policy. These
mechanical bounds do not establish independent interpretation quality.

**Reason / tradeoff:** Bound supplied feeling choices and changes, but the selected prefix can omit a relevant feeling or cause. Preserve that limitation rather than describing the supplied page as the character’s complete emotional state.

## FL08

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Before dispatch, the reflection adapter checks **100,000 UTF-8 bytes** across `JSON.stringify(request.context)` and the instruction string. That sum excludes the output schema, separately supplied mind files, subsequent tool results and the surrounding provider/harness envelope. It is checked after context preparation and diagnostic recording, so it does not cap that earlier work. [Input check](../../apps/server/src/cognition-maintenance.ts) · [Broader execution limits](ai-execution.md).

**Reason / tradeoff:** Bound these two supplied input fields before paid dispatch, not the complete reflection request, preparation memory or stored history. Other request and execution owners retain their separate allowances.

## FL09

**Current — source inspected 2026-10-06 · Restrictiveness: Medium.**

Each feeling reserves **8,192 estimated bytes**, one live allocation and one subscription; its execution allowance is **64 checks / 32 effects / depth 1**. Admission checks selected record state using **JSON string length × 3**, not actual UTF-8 length or measured heap. Ending the feeling releases its native-work allocation; the retained historical record has separate persistence/residency handling. [Admission and ending](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Conservative per-record admission estimates avoid unbounded native retained work.

## FL10

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

An opt-in internal feeling process admits an interval of **1–86,400 simulated seconds**, with one execution allowance per interval. After a due opportunity it schedules from the current simulation time rather than banking missed opportunities. The routine still walks the complete enrolled-process registry on each appraisal advance, including processes not yet due; expiry/decay records have a separate due index. This interval bound is not a bound on that registry walk or a requirement to enroll every actor. [Process owner](../../packages/domain/src/appraisals.ts) · [Feeling indexes](../../packages/domain/src/appraisal-index.ts).

**Reason / tradeoff:** Bound each process’s recurrence without claiming constant preparation cost at larger enrollment. The selected [emotional-review operation](../projects/emotional-physiology-tech-design.md#ep-c08--independently-selectable-emotional-review) uses existing appraisal due indexes and actor tickets, not this full-registry process loop. Any broader creator exposure under [ACT09](../maintainers/actor-model.md#act09--internal-feeling-process-authoring) must account for this separate cost; the ordinary authoring UI is still proposed.

## FL11

**Reported · Restrictiveness: Very safe.**

Conditions support only **one numeric field on that actor being below a threshold**. Disposition processes are periodic opportunities; no compound/randomized condition evaluator.

**Reason / tradeoff:** Deliver the currently needed condition family without an arbitrary expression engine.

## FL12

**Reported · Restrictiveness: Very safe.**

Those processes create targetless feelings; numeric feelings begin at the definition’s maximum. Each process keeps at most one active feeling.

**Reason / tradeoff:** One process-owned record avoids duplicate emissions; target/value selection is a current feature boundary.

## FL13

**Reported · Restrictiveness: Very safe.**

Process configuration is immutable under its ID; **no dedicated unenrollment API** was added.

**Reason / tradeoff:** Keep saved process identity stable; explicit retire/replace controls remain unimplemented.

## FL14

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Process requests are capped at **1,800 estimated bytes**, stored processes at **2,048**; allocation is one live item/subscription, with **16 checks / 8 effects / depth 1**. These checks use **JSON string length × 3**, not measured heap or a literal encoded-byte ceiling. [Process admission and current-format validation](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Bound serialized process state and execution expansion; sizes are estimates, not total world limits.

## FL15

**Reported · Restrictiveness: Medium.**

Reframing cannot change the target or reset lifetime; for decaying feelings it cannot change the numeric value. A resolved cause cannot simply be replayed to restart it. [FL27](#fl27--same-cause-reassessment-and-original-horizon) specifies a separate, still-unimplemented reassess operation; it does not relax this reframe restriction.

**Reason / tradeoff:** Preserve original causal/time identity; a new target or renewed lifetime requires a distinct cause/record.

## FL16

**Reported · Restrictiveness: Very safe.**

Creator UI authoring supports **qualitative NPC feelings only**, with create/resolve operations and known subjects.

**Reason / tradeoff:** Expose a narrow trusted authoring surface; numeric/reframe/process editing is not yet delivered. [ACT09](../maintainers/actor-model.md#act09--internal-feeling-process-authoring) scopes a possible process-authoring journey and its required lifecycle decisions; it does not authorize implementation or promise a general editor.

## FL17

**Current — source inspected 2026-10-06 · Restrictiveness: Very safe.**

Memory correction/erasure **invalidates all that actor’s feelings**, rather than selectively preserving unrelated ones. It also clears each enrolled process’s active-feeling reference, advances its opportunity identity and postpones it until at least one interval after correction. It does not unenroll the process: a later independently satisfied condition may create a new feeling, never resurrect the forgotten episode or its source text. [Correction boundary](../../packages/domain/src/experience.ts) · [Feeling/process invalidation](../../packages/domain/src/appraisals.ts).

**Reason / tradeoff:** Conservative invalidation prevents erased evidence surviving indirectly; selective dependencies would preserve unrelated feelings. The selected emotion extension includes review support, claims, derived caches and private receipts in this same conservative boundary; it does not narrow it or undo actual physical shock.

## FL18

**Reported · Restrictiveness: Very safe.**

Optional feelings can be refused on capacity exhaustion while the underlying injury/event still succeeds.

**Reason / tradeoff:** Optional cognition must not block authoritative injury/event outcomes; refusal must remain observable. A selected required native bodily reaction is different: its physical-outcome owner reserves complete native work before committing the dependent outcome, as specified by FL25. No model dependency is introduced.

## QU09

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling pages return **24 by default / 100 maximum**, scanning at most **200 active-index candidates** per page and returning a continuation when more remain. Initial index construction can still traverse the resident appraisal records across actors; the page’s 200-candidate window is not a cold-index construction limit. [Page owner](../../packages/domain/src/appraisals.ts) · [Index owner](../../packages/domain/src/appraisal-index.ts).

**Reason / tradeoff:** Bound view and scan work; continuation preserves access to the rest.

## PB05

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling label: **80 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB06

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

AI feeling/source/policy/subject handles: **120 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../apps/server/src/cognition-contracts.ts).

## PB07

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Definition hash; supplied feeling source version: **128 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Definition pins](../../packages/domain/src/state-owners.ts) · [Supplied source validation](../../packages/domain/src/appraisals.ts).

## PB08

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Feeling evidence coverage description: **200 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB09

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Subjects per evidence source: **48 subjects maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB10

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Evidence references per authored feeling: **8 references maximum**.

**Reason / tradeoff:** Bound evidence fan-out and validation/model work; exact counts are chosen envelopes.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## PB11

**Current — source inspected 2026-10-06 · Restrictiveness: Safe.**

Saved internal feeling source version: **2,048 characters maximum**.

**Reason / tradeoff:** Bound serialized request/record fields and validation work; exact length is a chosen envelope, not a population limit.

[Implementation starting point](../../packages/domain/src/appraisals.ts).

## FL19

**Proposed — psychological-needs coverage and authored policy, reviewed October 15, 2026 · Restrictiveness: Medium.** The initial humanlike resident must have meaningful opportunities for bodily experience, contact/belonging and enjoyment, including chosen solitude and independent interests. This is product coverage, not a fixed emotion vocabulary, universal need count, numerical social meter or identical behavior in every episode. Existing sparse appraisals and accepted self/relationship understanding are the first supported representations; current automatic feeling enrollment is unchanged. [FL21–FL23](#fl21--compact-numerical-personal-reactions) now select a narrow direct numerical-reaction design, without settling all broader needs or installing another psychological meter.

**Reason / tradeoff:** Multidimensionality should affect the life the player encounters while avoiding compulsory meter maintenance. Every selected concern needs a cause, meaningful satisfaction/recovery or reprioritization, permitted context and a stopping condition. Missing mechanical effects remain unsupported until explicitly designed and installed; prose cannot silently supply them. Current record, cause, lifetime, privacy and capacity controls remain with FL01–FL18 and their owners. [CE01/CE02/CE05](../maintainers/character-experience.md) and [D69](../../archive/05-project/open-decisions.md#d69--multidimensional-character-experience) retain broader selection and full-flow qualification; no optimal tuning or psychological validity is claimed. The selected narrow reaction contract does not depend on reopening those broader choices.

## FL20 — Experience-shaped outlook consumer

**Proposed DG23 consumer · Restrictiveness: existing authority and budgets.** [The product design](../projects/experience-shaped-characters-feature-spec.md) uses specific revisable self-understanding and existing directional notes. It adds no emotion count, intensity/decay curve, growth points, automatic trait mapping or native process enrollment. FL06/FL15/FL17 still govern allowed reflection and conservative invalidation. [EC-L01–EC-L08](memory.md#ec-l01--existing-authored-capacity) record current writing/evidence bounds, no additional cadence, growing history and optional dream/human scope. [EC01–EC06](../maintainers/cognition-redesign.md#dg23--revisable-outlook-and-older-recollection) qualify the actual later choice; a stored appraisal or changed biography is insufficient. D65/ACT09 retains any future process-authoring lifecycle.

## FL21 — Compact numerical personal reactions

**Proposed — selected design, October 15, 2026 · Restrictiveness: Medium.** A character may propose a numerical feeling directly through one optional supported operation without generating an explanation, thought, speech or expression. The [first authored profile](../worlds/base/psychological-reactions.md#selected-first-profile) owns the joy scale, units, allowed amounts, linear lifetime and finite-selection options as adjustable design hypotheses. Numerical state remains in the existing cause-linked appraisal owner; no additional global happiness value or compulsory social-need bar is selected. The current runtime exposes immediate appraisal operations through the threat route; this joy profile is not yet installed.

**Reason / tradeoff:** Small structured proposals and fully specified Jev options can express a person's private interpretation economically. They remain bounded by an installed meaning and actual source; a word, successful action or model explanation never automatically awards points. The current creation path uses create/reframe/resolve within existing native restrictions, including FL15's prohibition on changing a decaying value by reframing or resetting its lifetime. The general emotion design adds a separately authorized reassessment under FL27 and normal-play lifetime units under FL25/FL28. Distinct causes remain separate without additive aggregation. The [technical contract](../projects/continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose) owns source binding, current authority after waits, receipts, private projection and later-choice integration. Native, persistence and voluntary-use qualification remains open under CE02/CE03/CE05 and the [delivery map](../maintainers/intelligent-simulation.md).

## FL22 — Installed reaction vocabulary and execution route

**Proposed — selected design, October 15, 2026 · Restrictiveness: Safe.** Compact aliases are optional and request-local: absent aliases use full installed labels with bound handles; unknown aliases/definitions refuse. Jev chooses only fully specified supported operations and amounts, including no change; the pilot's finite amount vocabulary is world policy, not a provider quantization requirement. Unsupported novel proposals defer under strict Jev-only execution, with no generative fallback. An existing authorized generation route can return a small typed amount within an installed scale. These joy-pilot routes require neither another call per stimulus nor a periodic emotion process; the later selected [FL24 threat route](#fl24--interpreted-threat-reactions) explicitly batches appraisal into its mandatory first decision stage.

**Reason / tradeoff:** Defined short codes can reduce repeated wording while preserving unambiguous numerical meaning and binding. They are not assumed to be single tokenizer tokens and cannot author a policy or bypass a native owner. Supported profiles can be installed as data within existing numerical/lifetime families; unsupported kinds need a reviewed capability. Omission of the profile removes its offers, not a hidden fallback rule. Other already-supported psychological-meter operations keep their own installed units, source/lifetime/stacking and mutation owner; this slice does not require building another meter. See [installation and vocabulary](../worlds/base/psychological-reactions.md#installation-vocabulary-and-removal). Wider D69 need selection and ACT09 process authoring remain separate.

## FL23 — Cause growth and unchanged execution budgets

**Proposed joy-pilot consumer of existing limits, October 15; scope clarified October 17, 2026 · Restrictiveness: Medium.** For the joy pilot, no new independent total-feeling count, queue allowance, call allowance or opportunity cadence is selected. Distinct personally eligible occurrences can grow retained cause/outcome records; active feelings and source/amount choices grow private preparation. Existing native-work admission, operation/request bytes, scoped source reads, paging and current reflection limits still apply. Capacity refusal preserves existing state and the underlying real event; it is not a successful no-change decision. Repeated occurrence/receipt lookup must remain exact and actor-scoped, including cold outcomes, rather than scanning all history or recreating a missing-looking cause. [FL24](#fl24--interpreted-threat-reactions) is the explicit subsequent threat-route selection: two required decision stages, complete required relevant feelings and CTR08's bounded urgent concurrency, funded through the existing shared accounting owner. Do not apply this joy-only no-new-route statement to erase that selected change.

**Reason / tradeoff:** Reusing current limits avoids an arbitrary emotion quota, while finite final output alone would not bound discovery or retained history. Select sources and options before hydration/formatting; reuse indexed repositories and existing due/intake owners without a second queue or per-person worker. Current broad memory-correction/erasure invalidation (FL17), private retrieval fencing and same-format saved anchors/outcomes remain controlling. Measure actual source preparation, choice, admission and later-choice cost before any efficiency or scale claim; no such measurement or live psychological evidence accompanies this design. [Complete-path requirements](../projects/continuing-lives-tech-design.md#55-numerical-personal-reactions-without-required-prose) and existing cognition/memory/AI limits own verification and admission.

## FL24 — Interpreted threat reactions

**Current interpreted-threat producer; broader integration and qualification remain open · Restrictiveness: Medium.** The [world threat-appraisal profile](../worlds/base/psychological-reactions.md#interpreted-threat-reactions) owns the selected meanings and tuning: fear and anger use dimensionless intensity **0–1**, finite new-interpretation choices **0.25/0.5/0.75/1**, plus no change and exact supported resolution. Both use existing target stacking. The installed per-game-hour schema decays fear at **0.25 intensity per game hour**, and anger at **0.125**, with the existing linear-decay notification boundaries **0.5/0.2/0**. These are authored game hypotheses, not engine constants, attack probabilities or physiological claims. Both ordinary-hit and known-shooter automatic fear producers are absent from the installed interpreted profile; native injury/pain and urgency remain immediate. No compulsory aggression, courage, control, global fear or psychological-need bars are selected.

**Route and binding:** [CTR06/CTR07](../maintainers/combat-and-threat-responses.md) batch finite appraisal questions into the mandatory first relevance call, then supply admitted numerical meanings to the second independent action choice. At most one question/write per actor, exact definition pin and target-stacking key can publish in a pipeline; a coalesced set uses its newest eligible relevant occurrence and retains earlier relevant context. Every operation keeps the exact source/subject, current definition/record revision and cold duplicate outcome checks. Same-cause reframe cannot change a decaying amount or restart its curve. Own appraisal receipts are consumed by that pipeline and cannot retrigger it; newer independent evidence and actual later physical results remain eligible. Stage-two failure does not undo an accepted feeling or manufacture a physical response. Updating to post-appraisal revisions must still fence external changes.

**Required context and capacity:** retrieve all mandatory relevant current feelings through the appraisal owner's exact subject/source lookup or continued QU09 pages. FL07's reflection prefix of 24 records cannot prove absence. Preserve current intensity/scale, source uncertainty, privacy and lifecycle; charge source reads and bytes to existing admission. Incomplete mandatory preparation defers with the cause and leaves the opportunity pending. The two mandatory calls and [CTR08's selected bounded urgent capacity](combat-and-threat-responses.md#ctr-l03--two-stage-work-and-urgent-capacity) retain existing per-request reservations, shared external ceilings, exact actor/job cancellation and serial native publication. No independent feeling queue, recurring appraisal daemon, third required generation or automatic paid retry is added. Already eligible general emotional reviews can share the first stage under [FL28–FL30](#fl28--finite-adaptive-review-policy), with exact review claims and no ordinary evidence-watermark loss.

**Reason / tradeoff:** the same perceived harm can support fear, anger, both or no change depending on this person's values, current body/work, available alternatives and uncertain intent. A feeling informs choice without granting an action or prescribing a response. Retain original occurrence identities, current-format anchors/outcomes and FL17's conservative correction boundary; no damage-sized overwrite, refreshed lifetime on read or fabricated aggressor fills a missing source. [The technical design](../projects/combat-and-threat-responses-tech-design.md#complete-threat-choices-appraisal-and-voluntary-action--ctr05ctr07) and CTR06–CTR08/CTR10 own native, private-context, independent-choice, latency and cost qualification. The producer and immediate operation path are delivered; complete integrated delivery and independent live behavior remain open. General physiology, normal-unit authoring and independent review remain designed targets under FL25–FL31.

## FL25 — Native bodily reaction and normal-play time

**Proposed — selected design, 2026-10-19 · Restrictiveness: Safe.** [EP-C02/EP-C05/EP-C07](../projects/emotional-physiology-tech-design.md) select native fixed linear startle under the existing status/contribution owner. [Base psychological policy](../worlds/base/psychological-reactions.md#selected-bodily-tuning) owns the initial three-normal-second duration, stimulus peaks, body susceptibility/recovery, 0–1 composure binding and explicit 0.25–12 normal-second short-reaction bounds. Authored/saved player-facing durations use normal-play seconds; admitted progression, expiry and spacing use one simulation-clock conversion. At the base 60:1 rate, three normal seconds means 180 simulation seconds, or 3/1/0.375 wall seconds at 1×/3×/8×.

**Reason / tradeoff:** A short deterministic bodily consequence works without memory or AI and allows trait/body variation without prescribing private interpretation. It is game tuning, not validated human physiology. New original causes can coexist; original cause + pin + target life replays one outcome without refresh. Exact complete identity/body is required, not a short hash alone.

**Overflow and lifecycle:** Required reaction work participates in the physical outcome's existing complete native-work admission. Incomplete preparation retains a coherent prefix; no synchronous impact performs SQL or drops a selected reaction. Active contributions use existing due/residency owners; terminal onset receipts remain canonical and exact-scoped. Source loss does not end a fixed effect, target-life end does. No additional arbitrary active-count truncation is selected. Qualification: EP02/EP07/EP09; no runtime evidence yet.

The [abrupt-sound policy](../worlds/base/physical-sound.md#abrupt-acquired-sound-for-bodily-startle) owns the selected received-level, detection-margin and supported-onset/rise thresholds. They are provisional stimulus tuning, with quiet speech/ordinary footsteps and repeated confirmation excluded; they do not change the physiological peak or buy warning by themselves.

## FL26 — Complete effective emotion mechanics

**Proposed — selected design, 2026-10-19 · Restrictiveness: Medium.** [EP-C06](../projects/emotional-physiology-tech-design.md#ep-c06--complete-effective-fear-and-parameter-resolution) owns one complete read-only maximum over applicable scaled fear and native shock. It is not an independently writable meter, sum, display prefix or target-distance filter. Independent directed fears retain their source/meaning; resolving one leaves others intact. Joy/anger/grief have no selected counteracting or direct stat factor.

**Reason / tradeoff:** Maximum is transparent and prevents many minor/aliased causes overwhelming a stronger cause. It intentionally does not model accumulation or distinguish simultaneous causes through added intensity. The single authored [mechanical policy](../worlds/base/psychological-reactions.md#selected-mechanical-fear-policy) maps full fear to a 0.75 accuracy/steadiness and newly admitted evasive-reach factor. Both melee paths, ranged practice/release and real evasion offers/admission must consume the same owner. No running/fleeing speed penalty, extra fear roll, flight bending or retroactive evasion change is allowed.

**Overflow:** Missing complete required mechanics is incomplete, never zero. Required native work cannot use FL07/QU09's first 24 records or FL29's selected review batch as complete state. Numeric parameter composition clamps once at its registered owner and rejects overlapping danger-or-return. Qualification: EP03/EP08/EP09; tuning is unmeasured.

## FL27 — Same-cause reassessment and original horizon

**Proposed — selected design, 2026-10-19 · Restrictiveness: Medium.** Preserve FL15's reframe restriction. [EP-C03–EP-C04](../projects/emotional-physiology-tech-design.md#ep-c04--reassessment-algebra-and-admission) add one exact owner-issued reassess operation on an existing active appraisal, retaining original ID/cause/target/stack/creation/pin/creation receipt. A decaying proposal is an absolute amount at captured simulation time; its allowed envelope ends at the immutable original-cause horizon and it ages through publication delay.

**Reason / tradeoff:** Legitimate changed interpretation can raise or lower intensity without a fabricated external event or perpetual renewal. The base authored horizon is 240 normal seconds for fear/joy and 480 for anger, paired with their pinned native rates. This bounds the chosen temporary family; persistent or condition-sustained feelings keep their different ending authority. A new support epoch does not move the horizon.

**Refusal/no-change:** Reject infeasible, stale, ended or incorrectly bound proposals, without clamp, slope change or new cause. Retain preserves semantic revision, anchor, timestamps and notifications. Unknown is distinct and has no emotional mutation. Qualitative provenance reframe requires genuinely new permitted support; it creates no intensity or timed follow-up. Current FL09 estimated-byte/work limits include review metadata; failed enrollment leaves the original feeling intact. Qualification: EP04/EP07/EP09.

## FL28 — Finite adaptive review policy

**Proposed — selected design, 2026-10-19 · Restrictiveness: Medium.** The optional definition review family has closed reason/support/outcome kinds, at most **8 submitted attempts per unchanged support epoch**, at most **8 bands**, and at most **8 interval entries per band**, with each interval list no longer than its allowed attempt count. Configured delays are finite, positive and representable when scheduled; overdue/restored deadlines may coalesce at the current cut. Dispatch spacing is at least **1 normal-play second** per record across epochs and per character for standalone review. These are selected bounded authoring envelopes, not current implemented process limits or population limits.

**Authored selection:** [The base policy](../worlds/base/psychological-reactions.md#authored-appraisal-time-and-review-profiles) selects fear intervals 3/6/12 or 12/24/48 normal seconds with three attempts; anger 12/30 or 30/60 with two; joy/grief have no timers and one attempt per new material support epoch. Actual fear/anger below 0.2 starts no timed follow-up. Band entry 0.2/0.5, exit below 0.15/0.45 and one-normal-second stabilization affect review eligibility only, not immediate mechanics. One ordinal spans band changes. Individual appraisal intensity selects cadence. Base fear alone additionally enables one complete-channel band witness per actively eligible appraisal, reusing the same bands, stabilization and existing typed deadline index. It stores no intensity; complete-max crossing waits for all applicable contributions and a persistent floor prevents false recovery. Body-only, below-floor or considered-dormant records gain no periodic work. No separate channel queue, heap or global scan is admitted.

**Reason / tradeoff:** Intense changing episodes can receive timely attention without constant paid inspection. Only a meaningful accepted change can earn a remaining unchanged-support timed step. Retain, uncertainty, submitted failure or exhaustion makes that support dormant immediately; native threshold/expected startle decay and self-publications do not wake it or reset attempts. Only the closed [EP-C08 selectors](../projects/emotional-physiology-tech-design.md#policy-schema-on-the-appraisal-definition) can admit new material support, anchored to original subjects/episodes or selected own-body conditions. Prose keywords, recursively added participants and notification-only revisions cannot refill allowance. Creation, source identity and the original horizon remain intact.

**Overflow/scheduling:** One existing actor ticket and the existing appraisal/deadline index carry eligible work; no AppraisalProcess enrollment, unbounded queue or added global actor scan. Out-of-envelope policy refuses installation. Due/blocked records do not buy requests. Qualification: EP05/EP09, including measured quiet populations and threshold churn.

## FL29 — Emotional-review preparation and finite output

**Proposed — selected design, 2026-10-19 · Restrictiveness: Medium.** One request can contain at most **16 independent appraisal components**, with at most **48 distinct required source bindings** in their request union and **8 exact support references per component** including original/contrary support. The last bound is a new review envelope borrowing PB10's authored-source scale, not an existing generic cause field. Existing context/request bytes, handles, FL09 allocation and actual provider input bounds remain independent checks; maximal counts are not a guarantee of byte fit.

**Finite output:** At most **8 choices per scaled question**: up to four installed absolute levels including the scale maximum, a supplied feasible ceiling when distinct, a supplied half-distance-to-minimum decrease when distinct, retain, permitted resolve and unknown. Filter infeasible and duplicate values before offering. A submaximum ceiling removes the authored maximum, preserving the eight-choice bound. The base levels are 0.25/0.5/0.75/1. Qualitative grief uses only lawful nonnumeric options. An independently authorized generative route can supply any finite feasible value; review cannot buy such a route.

**Reason / tradeoff and overflow:** Select complete independent units in fair actor-local order. Bounded preparation may continue through indexed candidate metadata at one fixed cut, retaining examined progress; a truncated resident prefix is not completeness proof. The final indivisible oversized/unavailable support set is incomplete, not truncated or answered without contrary evidence. A batch-full unselected record remains unclaimed and retains age; an impossible unit parks on its actual dependency so it does not starve others. There is no eager multi-batch drain or stronger-N state deletion. Unknown/missing output and invalid envelopes have explicit submitted outcomes, not implicit retain. Qualification: EP04–EP05/EP09.

## FL30 — Shared request accounting and admission

**Proposed — selected design, 2026-10-19 · Restrictiveness: Safe.** An independently selected emotional-review batch makes at most **one finite judgment request**. No compulsory embedding, paid gate, retrieval classifier, action enumeration, generation, tool loop or thought/reflection call accompanies it. It reuses existing actor snapshots/evidence, DecisionLedger, durable dispatch/result accounting and bounded cognition execution; [AI execution](ai-execution.md) and [cognition](cognition.md) remain the current capacity owners.

**Reason / tradeoff:** Independent private interpretation can be cheaper and operationally distinct from a deliberate decision without creating a second scheduler. Standalone review is optional ordinary work: high intensity alone cannot use a second urgent pipeline. Preserve interactive spending headroom and actual configured level/prices. A compatible already funded ordinary/threat-first-stage request can include eligible components once, without another charge or third threat stage.

**Failure/recovery:** Pre-submission capacity/funds/provider/source unavailability keeps one coalesced unclaimed opportunity on real availability/dependency signals, with no attempt charge or tight poll. A durable submitted/uncertain/invalid/failed attempt consumes its allowance and is not automatically resubmitted. Provider IDs and timeline changes do not create new logical opportunities. Standalone review acknowledges only its exact review groups, never the ordinary evidence watermark. Qualification: EP05/EP07/EP09.

## FL31 — Review provenance, retention and loop prevention

**Proposed — selected design, 2026-10-19 · Restrictiveness: Safe.** Current `mind_appraisals`, `mind_state`, status-contribution records and existing decision journals retain one canonical state for each meaning. Review state has a separate operational revision and bounded current support/last-attempt reference; full history uses existing cold outcomes/receipts rather than an unbounded per-feeling list.

**Reason / tradeoff:** Exact actor/life/source/policy/opportunity identity supports replay and uncertainty without replacing delivered appraisal semantics. A real changed feeling's trusted publication provenance cannot become its own new cause or request. No-change emits no semantic event. A later actual physical action or acquired source remains independently eligible; suppressing every self-authored event is incorrect.

**Lifecycle:** Persist finite attempts, spacing and horizons through pause/load/recovery, with no offline catch-up. Current conservative correction/forgetting includes review support and derived private receipts/caches, while native bodily history follows its physical owner. Control/privacy/definition changes revalidate after every await. Retained exact pins prevent unsupported replacement even for cold terminal records. Qualification: EP07/EP09; no new history-retention duration or silent deletion is selected.

## FL32 — Direct-player interpretation authority

**Open decision, 2026-10-19 · Restrictiveness: Medium.** [SA-D01](../../archive/05-project/open-decisions.md#sa-d01--psychological-fear-for-controlled-characters) covers interpreted-emotion creation/review, retained-appraisal mechanical applicability, disclosure, revocation and control-transfer behavior while a human directly controls the character. Native bodily reactions and physical conditions apply equally. Native-body-only is recommended initially; authored native interpretation is the conditional recommendation if persistent player fear is selected; bounded opt-in AI is an explicit alternative. None is adopted by this design.

**Reason / tradeoff:** Rich fictional consequences must not silently prescribe the human's subjective choices or expose private content. The eventual option determines producer authority, consent/funding, application of retained NPC feelings, control-transfer feedback and acceptance. Pending operations must be fenced regardless of option; control toggles never erase causes, renew lifetime or create free attempts. Native/NPC/general consumer work remains independently designable and implementable. Qualification: conditional EP06–EP09 only after selection.

## FL33 — Distinct emotion and personality scope

**Proposed — selected design, 2026-10-19 · Restrictiveness: Safe.** Fear, joy and qualitative persistent grief have different meanings, lifetimes and consequences; anger remains independent threat-choice context. Composure's explicit numerical body binding affects recovery, while courage, sensitivity, temperament, persistence, expression and coping inform supported interpretation/choice. No personality-label script, automatic satisfaction point, forced expression, universal mood reducer or broader needs dashboard is selected.

**Reason / tradeoff:** Practical rescue, actual success, welcome, chosen solitude and remembered loss can matter without turning every pleasant act into a buff or making vulnerability a movement penalty. A useful coping activity supplies actual experience but cannot guarantee another person's relief, gratitude or trust. Wider needs, long-term development and ACT09 process authoring retain their own design/delivery. Qualification: EP06/EP09 and CE whole-episode evidence, separately from native correctness.
