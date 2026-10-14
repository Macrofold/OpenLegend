# Changing supplies: proposed limits and constraints

[Feature proposal](../projects/changing-supplies-feature-spec.md) · [Authored world profile](../worlds/base/changing-supplies.md) · [CS delivery](../maintainers/changing-supplies.md) · [Tracking rules](README.md)

**Proposed, October 6, 2026; not adopted, implemented or measured.** These choices define DG19's first useful food-preservation and renewing-patch family. The world profile owns the actual authored selection. Existing [object limits](objects.md), [base-world rules](base-world.md), time, native work and permission owners remain controlling outside an explicitly introduced consumer. Ratings describe the proposal's restrictiveness, not evidence that it is correct or fast.

**Stage applicability:** the [player-value decision](../projects/changing-supplies-feature-spec.md#12-delivery-sequence-and-game-first-review) precedes selecting either addition. Current nonperishable adventure remains valid. CS-L02–CS-L04 and CS-L07 apply to a selected preservation/expiry family; CS-L06 applies to independently selected renewal, which can keep nonperishable portable food. CS-L01, CS-L05, CS-L08 and CS-L09 apply to the actual selected scope. All conditions and ordinary interactions of an enabled capability remain required; this inventory does not make both additions, resident preparation or their unattended combination a single delivery gate.

## CS-L01 — Personal attended scope

**Proposed · Restrictiveness: Very safe.** Begin with a separately selected new personal/isolated attended world profile, ordinary current residents and the current game clock. No existing save is reseeded, retroactively aged or automatically enrolled. The first profile holds coherently when the personal world is paused or unattended; it does not provide DG17's funded continuation or define a shared-world exception for carried food.

**Reason / tradeoff:** Establish a preparation, expedition and return benefit before combining decay with funded absence, shared participation or a larger population. This excludes an unattended preservation promise from the first delivery. Adding it requires explicit food/absence rules and requalification of the real supplies and service; a human logout cannot silently become a free preserving warehouse or age protected possessions under an invented policy.

## CS-L02 — Few foods and one deterioration meaning

**Proposed · Restrictiveness: Safe.** The first family selects berries, raw meat, cooked meat and preserved meat. Berries have a **three-game-day** initial allowance from completed gathering; meat's ordinary **three-game-day** allowance originates at the animal's death and survives harvesting/cooking. Preserved meat has a **twelve-game-day** full allowance, while retaining the deterioration already accumulated. At the current uninterrupted normal rate, those full periods are **72 real minutes** and **288 real minutes**. They are game tuning, not physical food-safety estimates.

**Reason / tradeoff:** One dimension makes current food understandable and lets preservation slow future loss without undoing past deterioration. Old/spoiled input cannot become new food by cooking, drying, moving or renaming it. The selected durations must be judged against actual useful play; extend them or reject decay if they mainly produce policing of inventory. Exact threshold equality, work-time aging and source history belong to the feature/profile's one behavior contract, not separate UI approximations.

## CS-L03 — Legible edibility before hidden biological risk

**Proposed · Restrictiveness: Very safe.** The first family gives permitted observers understandable food-condition/edibility information and handles unknown or uninspected food explicitly. It introduces no probabilistic contamination, secret poison roll, illness, nutritional taxonomy, freshness reward or compulsory taste test. Spoiled food remains a real unusable material until its supported disposition; a missing record is not proof of freshness.

Only an actor's own accessible, known spoiled portions may be deliberately discarded through the selected food disposition action. Discarding retires the actual material and gives no compost, bait, fuel or other benefit. Claims and other people's possessions retain their existing authority; dropping food only changes its location.

**Reason / tradeoff:** The decision should concern what to prepare, carry and use. Surprise illness and repeated inspection would add another care system before the selected preservation benefit is established. Later unsafe-food or medical consumers need their own observable evidence, actual consequences and DG21 design. Keeping information permission-scoped is a correctness requirement, not a switch for making decay more difficult.

## CS-L04 — Deliberate finite preservation

**Proposed · Restrictiveness: Safe.** A selected batch contains **one to eight cooked portions**, processed in finite sequential steps of **15 game minutes per portion**: at most **two game hours**, or **two real minutes at normal 1×** before interruptions. Each completed portion yields **one preserved portion with the same 38 fullness value**. It uses an actual supported lit fire and its actual continuing fuel. No general heat simulation, drying rack, salt industry or new construction family is required by this selected method.

Only the currently worked portion is held. Completion converts that actual material; Stop releases the same cooked portion at its current condition, while completed rations remain and unstarted portions are untouched. Partial drying progress and fuel already burned do not return. This completion-time conversion is a proposed preservation-family rule, not a refund/change to current cooking's start-time consumption. Food can spoil during the hold; a reservation grants no preservation.

**Reason / tradeoff:** One reviewed batch reduces repetitive commands while leaving the player free to stop for something more interesting. More portions require another deliberate finite action rather than an endless job or paid decision per portion. The work limit is an initial interaction choice, not measured host capacity. Completion depends on actual heat, condition and access; unavailable service must not fabricate a failed recipe or finished ration.

## CS-L05 — Storage has its actual supported effects

**Proposed · Restrictiveness: Very safe.** Existing woven containers keep their actual capacity, access and organization rules. They receive **no freshness multiplier**, insulation, waterproofing, cooling, carrying-strength increase or preservation from their name. The first food family has no climate/temperature/rain-dependent deterioration modifier and does not consume DG13 shelter moisture or DG20 heat beyond its explicitly supported fire requirement.

**Reason / tradeoff:** Useful packing and a real transformation can qualify without making three new environmental systems prerequisites. Later storage effects need an authored mechanism, visible benefit and honest exposure/custody changes. Absence of a current consumer does not mean all materials are permanently immune to future admitted conditions.

## CS-L06 — Finite standing stock and renewal flow

**Proposed · Restrictiveness: Safe.** The four selected outer berry patches retain capacities of **24, 18, 28 and 22 berries**. Each admits **one additional berry per three game hours while below capacity**. Full stock stops growth without banking missed harvests. The theoretical maximum is **32 berries per game day** across all four patches. The two depleted near-camp patches and other native finite resources do not receive automatic renewal; animals do not gain reproduction or a food web.

**Reason / tradeoff:** A few familiar places remain worth revisiting without a repeated tending chore or unlimited instantaneous refill. At current berry nutrition and metabolism, 32 berries supply **576 fullness per day**, versus **259.2 per person**. That is about **2.22 person-days per day** before waste/work/access loss, only **57.6 fullness/day** above two people's demand. Three people need **777.6/day**. Losing one patch leaves **432/day**, below two-person demand. These are transparent arithmetic bounds, not survival predictions or a certified self-sustaining community. Initial stock and growth flow must never be added together as if both were recurring production.

## CS-L07 — Preserve differences without multiplying busywork

**Proposed · Restrictiveness: Safe for the selected family.** Mechanically different food lots remain distinct; merging cannot average away worse condition or use a similar appearance as equivalence. Presenting several lots together for reading does not merge their material state. The family must support ordinary splitting, exact transfer, last-portion consumption, disposal and work completion before decay is enabled.

**Reason / tradeoff:** Strict differences may grow the number of retained lots and make large inventories more expensive. Prefer homogeneous cohorts and readable grouping where semantics truly match; do not fix performance by rejuvenating stock or imposing an unannounced item cap. Current OB08/OB14 stateless-operation restrictions require a real shared-owner extension for this consumer. Identity, quantity, reference and condition preservation are correctness obligations, not optional tuning.

## CS-L08 — Complete work and notification cost

**Proposed · Restrictiveness: Medium.** Reuse current work, attention, inventory paging and perception limits. No new total inventory, history, population, provider-job or hosted-capacity claim follows from an eight-portion batch or four renewing patches. Growth and aging use actual elapsed game time and consequential boundaries; routine inspection, a percentage decrement or a missed growth opportunity does not request a new model response.

**Reason / tradeoff:** Quiet material change should remain economical while real decisions retain individual agency. Qualification must include source preparation, condition-bearing lot growth, active claims, complete current/remote observation work, cold reconstruction, retained history, native progression and actual cognition. Small output pages and coalesced notices do not bound all source work. If the workload cannot be advanced coherently, use its existing operational hold/recovery owner rather than silently slowing food alone or ignoring a subset of lots.

## CS-L09 — Expansion must improve play

**Proposed · Restrictiveness: Very safe.** No first-slice farming, seasons, animal reproduction, compost economy, illness, cold chain, universal durability or unattended food service is implied. Those extensions remain with their existing groups and owners. Compare the full preservation/return loop against the simpler current game before expanding.

**Reason / tradeoff:** These omissions keep the first decision understandable. The four-day cache and its separately acquired travel meals establish a proposed feasible quantity, not a demonstrated benefit over current nonperishable food. Select an actual wanted activity and compare that simpler game before introducing expiry; keep the detailed proposed rules conditional if there is no case for adoption. A preservation process that consumes its entire benefit in preparation, or a renewal schedule that requires repetitive attendance, has failed even when its accounting is exact. Change tuning, simplify the food family or retain current non-aging food behavior; do not add another management layer to justify the first one.
