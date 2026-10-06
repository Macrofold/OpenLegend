# Wilderness recovery and care

**Proposed world profile, October 6, 2026.** These values implement the product intent in [Recover from harm and return to play](../../projects/recovery-and-care-feature-spec.md) if adopted. They are not installed rules or measured balance. The relevant current source is newer main [0a3ab79b](https://github.com/Macrofold/OpenLegend/commit/0a3ab79b7a698a7f1941dc23722f89220d1ba425); this design branch retains its older runtime ancestry.

## Camp recovery

The selected method is **Recover at camp**. It applies to a living, awake human body with this world's ordinary health, injury, food and energy model, regardless of controller. A current health deficit or nonzero ordinary injury makes it useful. A scar by itself does not. The first independently complete delivery qualifies the human player's self-care; resident use later follows the same method and independent choice.

Choose one actual known campfire and remain within **2.2 world units** for **600 uninterrupted game seconds**. A cold campfire qualifies. Fire, fuel, a bed, a clinic, a helper and a consumable are unnecessary. Reach and supporting geometry remain the normal action owner's authority; a label alone cannot create a rest spot. This family does not add automatic campfire construction or teleportation.

At valid completion, restore this body's ordinary health to its actual maximum and reduce ordinary injury to zero together. There is no overheal, temporary protection or additional maximum health. Food and energy are not replenished; scars, wetness, burning and any other independently supported condition are not removed. Actual ongoing harm can interrupt and resume its consequences normally. Treatment does not reverse death.

Both applicable needs must stay strictly above zero. If the current known ordinary rates already show either reaching zero at or before the planned completion, refuse start and explain the unmet need to its owner. At the current ordinary awake rates this means more than **1.8 fullness and 0.9 energy** at start. These are derived prerequisites, not separately authored new meters or universal engine thresholds. A changed applicable rate changes the read and prerequisite. Unknown future harm or hidden threats are not forecast to refuse the action.

Recovery occupies physical work but keeps the person awake and conversational. Reading details, opening inventory, choosing a draft, typing and speaking are permitted. A successfully admitted choice to move, eat, sleep, manipulate an item, fight or perform other incompatible bodily work ends recovery. A rejected command or dismissed menu does not. Closing the care panel does not stop valid work.

No health/injury change is committed before completion. Cancellation loses only elapsed time and normal need expenditure, with no consumable to refund. Restart begins the short interval again. Incoming damage, zero applicable need, loss of place/reach, departure, unavailability or death interrupts. Damage due at the same completion boundary defeats completion; there is no final instant of care immunity. Ordinary time/body owners must preserve the actual ordering without replaying a past effect.

## Field dressing

This optional later method buys location flexibility. **Dress injuries here** uses **one prepared-fiber unit** and **600 uninterrupted game seconds**, with the same body eligibility, need prerequisites and ordinary recovery outcome. It works at the patient's current supported location without a campfire. The patient stays still; movement ends treatment. Self-dressing remains possible without a helper.

The exact unreserved fiber must be directly carried by the performing person under the first selected scope. Select its actual lot; a fiber in a nested bag has a normal move-out route first. Availability neither consumes nor locks it. If the bound unit becomes unavailable, completion cannot choose another without a fresh reviewed attempt. Consume the unit and apply the effect together only upon valid completion.

Assisted dressing is one patient and one helper within **2.2 world units**. Both must be living, awake, present, capable, ready and explicitly willing for the named treatment. Each person's applicable food and energy prerequisites apply to that person and remain private. Before work starts, an accepted offer does not freeze either person's movement. An unsolicited offer does not reserve a patient or interrupt current work.

The helper supplies the fiber. A patient who wants to supply it may first use an ordinary independently accepted handover. Assent to dressing grants no access to the patient's possessions. Either person can stop without a new generated dialogue; harm, incapacity, death, departure, loss of reach, zero need or incompatible work by either participant cancels the attempt. A stopped helper does not leave an invisible continuing treatment on the patient.

Only **one actual care activity per patient** is admitted. Concurrent offers remain invitations, not ownership. No healing multiplier, medical experience, favor token or automatic social reward is granted for assistance. A healthy patient, a dead body, an old physical life or a scar-only complaint cannot consume a dressing for fictitious benefit.

## What people know

The current world exposes visible bodily health for observed people. Food and energy remain private. The patient receives specific explanations for their own unmet needs; the helper sees only an actor-safe refusal or information the patient actually communicates. Treatment does not reveal a private cause, thought or diagnosis.

The ordinary injury amount supports injury-related slowing. Do not invent a broken limb, infection or prognosis from its value. Someone can hold and express an uncertain explanation, but their language creates no condition or cure. On completion, show the actual ordinary improvement and the separate remaining conditions permitted to that viewer.

This first profile has no random infection, bleeding, pain meter, treatment-quality roll, daily medical allowance or cooldown. A later condition may need different interruption behavior—for example, a treatment for ongoing bleeding cannot simply inherit a rule making every bleeding tick cancel it. Such a consumer needs its own complete product decision before adoption.

## Complete cost and balancing

At the current normal clock, 600 game seconds equals **ten real seconds**. Ordinary food depletion over the interval is **1.8 fullness**; ordinary awake energy expenditure is **0.9 energy**. Approach, discovery, human reading, conversation and provider waiting can add to the whole episode. These figures are calculated from current rates, not observed player timings.

An ordinary healthy human hit once by the current stag loses 18 health and gains 18 injury, making nominal movement 91% before scars. Valid camp recovery returns ordinary health to 100 and injury to zero. A stiff-leg scar still applies its existing separate movement consequence. Three ordinary hits similarly do not require three recovery clicks; this is one fixed-duration action to restore the supported ordinary condition.

Current Treat Scar remains **one prepared fiber, 600 game seconds and 2.2-unit campfire reach per scar count**, with its own exact current admission and completion rules. Its behavior is not changed here. The same material also serves real crafting/fire uses, so field dressing adds demand to that existing stock rather than introducing a free medical currency.

Current Continue restores food and energy as well as bodily health and relocates the player. Material-free camp recovery does not erase every strategic reason someone might deliberately die. Preserve that explicit comparison under CE05/BW14's existing whole-session and mortality review; do not silently weaken death or nutrition policy in a care implementation.

## Time, continuity and contrasting worlds

Game-time pause stops progress and need expenditure through the current clock. Ordinary human departure stops unfinished care; the protected absent body accrues no treatment credit. Current-format save/restore retains real body state, valid work and exact materials together; it neither refunds a completed dressing nor doubles a completion. A physical-life change invalidates old care.

A person with no cognition available does not automatically start treatment. A previously chosen valid native action needs no repeated model calls. Resident offers and refusals use ordinary actor-permitted evidence and independent choice when that stage is delivered.

A machine with charge/integrity, an animal without the human food model, or an authored person using another physiology needs its own supported method. This profile does not impose human needs, campfires, prepared fiber or death scars on every world. The shared action/body integrity remains reusable; the wilderness treatment is a replaceable world choice.

## Maintained records

- Implementation: [CARE01–CARE05](../../maintainers/recovery-and-care.md), [ACT04](../../maintainers/actor-model.md#tasks), [BW14](../../maintainers/base-world.md#accepted-lifecycle-and-protection-delivery).
- Limits and constraints: [Care inventory](../../limits/recovery-and-care.md), [current bodily/world limits](../../limits/base-world.md), [native work](../../limits/native-work.md), [persistence](../../limits/persistence.md).
- Related contract/design: [Product specification](../../projects/recovery-and-care-feature-spec.md), [current inspected survival](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/survival.md), [current inspected death/scars](https://github.com/Macrofold/OpenLegend/blob/0a3ab79b7a698a7f1941dc23722f89220d1ba425/docs/worlds/base/player-death.md), [sleep](sleep.md).
