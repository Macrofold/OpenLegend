# Physical sound and acoustic stealth — limits and constraints

**Proposed — selected design, not implemented or calibrated.** This inventory accompanies the [feature][feature], [technical design][tech], [base policy][policy] and [ACS00–ACS08 work][work]. Evidence uses the tracker's exact common/A source pins. No executable tests, runtime measurements or play/balance trials qualify these choices.

Values are fictional gameplay starting points. [Restrictiveness](README.md#restrictiveness) is not a capacity certification. Existing speech/cache/history/media bounds stay in [the hearing inventory](hearing-and-speech.md); A owns accumulation/recognition/retention [in its inventory][a-limits]. Exact provenance, no hidden-identity leakage and atomicity are correctness obligations, not tuning candidates.

## ACS-L01 — Direct-path scalar air

**Proposed reuse/extension · Restrictiveness: Very safe.** The selected provider uses broadband air SPL referenced to 20 µPa, direct three-dimensional paths, the existing **0.25 m** near-field clamp and multiplied material energy transmission. Reflections, diffraction/around-corner routes, frequency bands and travel-time delay are unsupported. Zero transmission gives blocked reception with absent level/margin, not infinity.

This bounds geometry but can miss plausible indirect sounds. Another medium/path law needs an installed provider and corresponding work/projection bounds; no fallback physics is invented. Revisit for a concrete failed listening journey. [World policy][policy], [HR01](hearing-and-speech.md#hr01--acoustic-model-and-tuning), ACS01/ACS07.

## ACS-L02 — Real impulses, intervals and supported producers

**Proposed · Restrictiveness: Very safe.** Two source envelopes are selected: one instantaneous occurrence, or an actual active half-open interval `[start,end)`. Independent impulses in one sealed physical phase use peak/coincidence comparison. A current utterance is one impulse; captions, tokens and playback supply no duration. A ringing tail requires an admitted interval.

Initial adapters cover supported movement/contact, handling, impact/landing, work/foliage and an active sustained-process example. Sprint, destruction, creature calls, machinery and recording/relay require their actual physical owner. Unsupported capabilities remain explicit; descriptive action prose emits nothing. This limits authoring while preserving cause. Expand through the same source/reception mechanism. [Feature][feature], [policy][policy], ACS01/ACS03.

## ACS-L03 — Admitted anatomy and deliberate movement

**Proposed · Restrictiveness: Medium.** Human quiet pace caps existing effective speed at **0.25×**, crouch at **0.15×**, combined by the minimum. Posture transition takes **0.4 normal-speed seconds** of stationary ordinary work. Crouch retains radius/slope, uses **0.60×** living height/interaction height and **0.55×** standing eye/ear heights. Old geometry remains authoritative until completion; obstruction/interruption preserves it. Attachment bounds still constrain clearance.

Animal crouch, prone movement, arbitrary limb articulation, new fatigue and sprint commands remain unsupported. Incompatible posture refuses through ordinary admission. The base conversion is **60 simulation seconds per normal-speed second**; 3×/8× does not multiply authored factors again. Slower travel/action time provides the tradeoff; compare its burden with ordinary travel or a farther shot before retuning. [Policy][policy], ACS02/ACS08.

## ACS-L04 — Contact-cycle envelope

**Proposed · Restrictiveness: Safe.** A locomotion cycle admits at most **eight ordered contact offsets in (0,1]**; simultaneous offsets form one physical group. Oversized definitions require explicitly grouped actual contacts or another supported profile, never silent contact loss. Initial species use one group per cycle with distinct distances/levels.

This bounds one definition, not contacts per interval, emitters or audience. All contacts crossed by actual admitted travel remain owed under required-work accounting. Zero displacement emits none; command or host-interval boundaries do not reset phase. Revisit the eight-offset choice when a concrete anatomy cannot be represented faithfully. [Policy][policy], ACS02/ACS07.

## ACS-L05 — Emission strengths and carried equipment

**Proposed · Restrictiveness: Medium.** The canonical world tables select body reference levels **24–54 dB SPL at 1 m**, material adjustments **−6…+10 dB**, equipment examples **32–64 dB** and actual impacts **52–72 dB**. The movement speed/reference ratio floors at **0.10**; deliberate foot contact adds **−4 dB**, without automatically quieting gear or adding another crouch bonus. Landing/fall sound is clamped to **24–96 dB**. Handling, foliage, work and fire values remain in the [policy][policy].

These choices are unmeasured. Components sum in linear energy through actual quantity/custody/transmission. No acoustic item-count cap is selected; a private bag is not automatically soundproof. Prepare carrier contributions on meaningful changes, not every footstep; ACS-L13 covers that growth. Quieter authored variants do not create missing fastening commands. Revisit after load/route play comparisons. ACS02/ACS03/ACS08.

## ACS-L06 — Finite admission and hearing opportunities

**Proposed · Restrictiveness: Medium.** Physical numbers must be finite; transmission/fidelity are **[0,1]**. Keep existing speech scalar bounds under HR01. Do not silently clip a combined emission or invent another numeric maximum; invalid definitions/computations follow their explicit refusal or required-work failure contract.

Selected floors are **0 dB SPL**. Strong-detection margins are **0** human, **−3** hare/wolf, **−2** deer and **−1** bird/bear. For `delta = receivedMargin − detectorThreshold`, **delta ≥ 0** gives strong opportunity; **−6 ≤ delta < 0** gives the selected linear weak weight; otherwise none. Conservative discovery includes the weak boundary. A owns integration/decay; Perception does not independently alter these thresholds. Ambient remains **28 dB**, human word thresholds **6/12 dB**. These discrimination choices need joint detection/alarm/voice qualification, not physiological claims. [Policy][policy], ACS01/ACS04/ACS08.

## ACS-L07 — Received features and pattern precision

**Proposed · Restrictiveness: Safe.** The physical family has four **0–1000** dimensions: impulsiveness, roughness, ringing and voicing. Voice uses A's separate four dimensions. Fixed-bin received intervals have widths **125/250/500** at quality thresholds **.85/.60/.35**; below .35 omit distinguishing features. Path/source loss removes dimensions; distinct sources may share features.

The selected classifier uses received interval bounds, including **600/400** decision boundaries. A rhythmic-contact hypothesis needs **three acquired compatible contacts**, gaps at most **.5 normal-seconds** and maximum/minimum gap ratio at most **1.2**. Ambiguity remains indistinct or multiple-candidate evidence; no exact source feature or true action resolves it. This deliberately loses detail and permits a mechanism to sound footstep-like. Revisit after useful-uncertainty/recognition trials with A retaining interpretation ownership. [Policy][policy], ACS04/ACS08.

## ACS-L08 — Coarse direction and absent range

**Proposed · Restrictiveness: Very safe.** Sound supplies uncertain bearing or no location, never exact point/range or a current attackable body. Horizontal direction has **eight world-axis sectors**. Half-spread is **90°/45°/22.5°** for margins below 6, 6–12 and at least 12 dB; attenuation requires at least 45°, path fidelity below .60 at least 90°. A broad mixture can have no bearing rather than a falsely precise average.

Horizontal direction is absent below separation `max(.25 m, abs(verticalSeparation))`. Above/below needs margin at least **12 dB** and elevation at least **15°**; otherwise unknown. No same-floor/room assertion follows. These limit resolution, not identity confidence. They trade precision for honest useful uncertainty; expanding location requires supported physics and unchanged disclosure guarantees. [Policy][policy], ACS04/ACS06/ACS08.

## ACS-L09 — Native response filtering

**Proposed · Restrictiveness: Medium.** Initial animals may continue or update their existing native alarm/escape controller. The world selects nonlinguistic response deltas **6–30 dB** by received class/species, plus actual onset/rise of **6 dB** for unclassified/rustling or **12 dB** for mixtures. Detection/weak accumulation alone need not alarm. No universal turn, fear, curiosity approach, waking or group broadcast is selected.

Repeat keys add permitted class; the existing **6 dB** bands and [sensory/repetition lifetime owner](hearing-and-speech.md#ssp-h04--acoustic-scene-coalescing) remain authoritative. One route review consumes the sealed boundary's eligible cue set; suppression does not erase distinct evidence. The filter limits herd alarm but can miss soft warnings. Qualify dense movement, renewed clatter and eventual settling before retuning. [Policy][policy], ACS05/ACS08.

## ACS-L10 — Complete audiences and aggregate masking

**No independent listener, nearest-N source or loudest-N masker cap selected. Restrictiveness: Too liberal for unqualified total work.** Every eligible local body remains included. Individually subthreshold sources can collectively mask or form a detected mixture; ordinary per-source detection reach alone does not prove a mixture/masker contributor irrelevant.

Use conservative selection, shared phase preparation, stable energy summaries and proof-based omission. Exclude the entire candidate group without subtracting nearly equal huge totals. Unresolved residuals may form one anonymous broad/no-direction mixture with unknown producer count; each contribution is allocated once, not also to individual accumulation. Ambient creates no synthetic occurrence.

Completeness is deliberate; capacity is unmeasured. Required work continues or holds/pauses progress through its owner, never silently truncates quiet recipients or declares unfinished work inaudible. Improve work representation before changing audience guarantees. [Policy][policy], [native-work limits](native-work.md), ACS03/ACS07.

## ACS-L11 — Continuous solving and work budgets

**Proposed — technical bound contract required · Restrictiveness: Too liberal for unqualified accumulated work.** Moving receivers, active intervals, geometry/masking changes and threshold crossings grow solver/boundary work independently of displayed cues. No fixed acoustic polling period, per-frame all-pairs pass or single-sample silence shortcut is selected.

The [technical design][tech] must specify solver/error treatment, continuation quanta, evaluation budgets and earliest-boundary handling before dependent delivery. No numeric tolerances/capacities are invented here. Existing work accounting covers total preparation and continuation; yielding does not replenish allowance. Unresolved required work holds dependent outcomes or reaches the declared coherent failure boundary, rather than becoming missed sound. Qualify complete cold/warm dense callers. ACS03/ACS07.

## ACS-L12 — Retention, receipts and continuation

**Proposed/no acoustic lifetime-history quota · Restrictiveness: Too liberal for unqualified retained growth.** Play grows occurrences, observer facts, producer/receiver continuations and exact source receipts. Display lifetimes, feature bounds and native expiry do not cap history/queues.

A owns accumulation, episodes, leases, familiarity receipts and retained facts; the native controller owns repetition. Physical state saves through existing owners. The [technical design][tech] must enumerate acoustic allocations, retained-profile/continuation bounds, reclamation and overflow before delivery. No receipt/cache cap is invented here. Reclaim only when support permits; required evidence cannot be evicted into a false negative, replayed on restore or replaced by an unbounded history scan. [A limits][a-limits], [memory limits](memory.md), ACS06/ACS07.

## ACS-L13 — Preparation and profile growth

**Proposed bounded preparation; no independent numeric profile cap selected here. Restrictiveness: Too liberal until qualified.** Components, producers, affected neighborhoods and invalidations grow with possessions/entities/edits. Eight contact offsets/four features do not bound this upstream corpus.

Prepare carrier contributions on relevant changes, share valid geometry and use indexed scope before materialization. Exact cache overflow may recompute: a small cache is not a work bound. The [technical design][tech] must expose preparation/retention limits and refusal/continuation without omitting physical components. Reconcile final bounds/rationale here; unspecified dimensions are not unlimited policies. ACS01/ACS02/ACS06/ACS07.

## Maintained records and qualification

[Feature][feature], [policy][policy] and [technical design][tech] own behavior, values and mechanism; [ACS work][work] owns delivery/evidence. Existing hearing, native-work, memory, [shared-stealth](stealth-awareness.md) and A inventories retain their scope.

Reconsideration follows [limits audit](../maintainers/limits-audit.md) and the owning policy. ACS07 establishes mechanical/operational evidence; ACS08 separately establishes uncoached usefulness/balance. Neither tuning nor complete audiences establish supported population, density, duration or frame rate.

[feature]: ../projects/acoustic-stealth-feature-spec.md
[tech]: ../projects/acoustic-stealth-tech-design.md
[policy]: ../worlds/base/physical-sound.md
[work]: ../maintainers/acoustic-stealth.md
[a-limits]: https://github.com/Macrofold/OpenLegend/blob/40805523c4a19ab7c6cc455d49d51e4a122ecae0/docs/limits/perspective-perception.md

