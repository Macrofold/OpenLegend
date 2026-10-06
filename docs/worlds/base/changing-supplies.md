# Changing supplies in the base world

**Proposed authored profile, October 6, 2026.** This is DG19's selected wilderness experiment, not current food behavior or an enabled continuing-world service. The [feature specification](../../projects/changing-supplies-feature-spec.md) owns the complete product journey. [CS-L01–CS-L09](../../limits/changing-supplies.md) own the restriction inventory; [CS01–CS06](../../maintainers/changing-supplies.md) retain delivery and unsatisfied qualification.

## 1. Scope and clock

Choose this profile when creating a separate personal, isolated world. Use the ordinary human player, Ada and the Peacock Mercenary; create no additional residents, automatic pantry goals, food gifts or animal population. Existing starts and existing inventories are not retroactively aged, reset, reseeded or silently enrolled. A supported new profile needs explicit food definitions and source histories from its start; incompatible development state follows the [root save policy](../../../AGENTS.md#development-save-policy).

All selected food, work, fire, needs and growth use the current mechanical clock. At normal **1×, one real second advances one game minute**: a game day is **24 real minutes**. Whole-world Pause, a required coherent world hold and restart downtime advance none of these laws. Sole-human departure first cancels that human's work through the ordinary absence rule, retaining completed rations and releasing the current portion; the whole-world hold then freezes all food and any still-valid NPC work. An actor-specific Pause uses preservation's stop/release behavior rather than retaining an unattended half-dried portion. An off-camera patch or a closed bag continues changing while the attended world advances. Speed changes apply to the coupled world; they do not multiply food decay alone.

This profile's whole-world absence hold avoids a special freezer for an inactive human's carried food. It does not define food decay in a shared continuing world or change MP04's retained/protected possessions. Combining it with [continuing communities](continuing-communities.md) requires a separate food/absence decision and fresh qualification of usable supplies, self-care and service capacity. Calendar dates, seasons, biological aging and animal reproduction are not added.

## 2. Food law and condition continuity

These numbers are deliberately simple game tuning. They are not instructions for preserving real food.

| Food           | Full freshness allowance | Start or inherited history                                                | Consumption                                             |
| -------------- | ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Berries        | 3 game days              | Starts when actual gathering completes                                    | An unspoiled portion supplies the existing 18 fullness. |
| Raw meat       | 3 game days              | Deterioration starts at the source animal's death and survives harvesting | Remains inedible until supported cooking.               |
| Cooked meat    | 3 game days              | Retains all raw-meat deterioration, including cooking time                | An unspoiled portion supplies the existing 38 fullness. |
| Preserved meat | 12 game days             | Retains all deterioration through the completion of its preservation step | One unspoiled portion supplies the same 38 fullness.    |

The full allowances equal **72** and **288 real minutes** respectively at uninterrupted normal speed. Actual remaining life can be much shorter. There is no rain, warmth, wetness, container, ground-contact or nesting multiplier in this first family. Preserved meat uses the same applicable packing contribution as cooked meat; it adds no carrying-strength advantage.

Express the rule as deterioration from zero to fully spoiled. While food has allowance (L), elapsed game time (t) adds (t/L) deterioration. Changing food form retains the accumulated deterioration and changes only the future rate. At fully spoiled, food remains spoiled. There is no quality averaging, nutrition bonus, hidden illness or reset from recooking, re-preserving, renaming, splitting, merging, moving, giving or loading.

For example, a cooked portion with **75% freshness remaining** starts one preservation step. Its **15 game minutes** of work still age it at the ordinary meat rate. It finishes with about **74.65%** remaining; applying the longer allowance gives **8 days 23 hours** of future life. This intentionally extends its deadline without undoing its age. These percentages explain the law; the player-facing default is usable/spoiled plus a useful remaining-time estimate, not another mandatory meter.

There is no separate minimum-quality threshold. A chosen portion must be able to finish its scheduled work strictly before expiry. Older usable food can be preserved for a shorter purpose if the player considers its benefit worthwhile. Starting a batch does not freeze its unstarted portions.

At the exact expiry instant, food is unusable: an Eat or preparation completion at that instant cannot gain nutrition or edible output. A harvest completing exactly when the source carcass rots gains no fresh yields. This explicitly tightens the new profile's food boundary; current native work/remains ordering is not evidence that this equality rule already exists. Current carcass **three-day rot and seven-day physical cleanup** remain owned by [survival](survival.md).

Spoiled food retains its quantity and identity until its supported disposition, visibly labeled unusable. It supplies no compost, fuel, bait or other bonus here. An actor may deliberately discard known spoiled portions in their own accessible possessions through the food disposition action; this retires actual material once. Dropping merely relocates it. There is no automatic deletion of another person's cache, general destructive action or silent count reduction beneath an active reservation.

Supported accessible food has reliable observable usability. Unknown identity, hidden contents and missing/unsupported condition are not "safe." Consumption cannot invent a result for them. This profile does not support probabilistic poisoning, secret safety checks or a taste-test minigame.

## 3. Work and opportunity cost

The known **Preserve meat** action uses one existing reachable lit fire and actual cooked meat. The player chooses **1–8 portions**. Process them sequentially for **15 game minutes each**: **15 real seconds per portion**, at most **2 real minutes** for a chosen eight-portion batch at 1×. Output is exactly **one preserved portion per completed cooked portion**. No salt, dedicated rack, rare container or new tool is required by this authored method.

Only the current portion is held. Completion converts it once; before completion it is still cooked food aging normally. Stop or interruption releases it at its actual condition, loses unfinished drying progress and retains completed rations. Unstarted food is unchanged by the action. Starting again requires the full work for that unfinished portion. No fuel already burned returns. If the food spoils, it stays spoiled and the continuation stops. Expired or missing unstarted ingredients are not replaced automatically.

Review the whole selected sequence against actual food condition and expected fire fuel, then recheck each step. No fuel is conjured for a batch. The fire burns according to its existing elapsed lit time, not a separate fuel charge per worker. Two concurrent workers therefore do not each debit the same elapsed burn; they still need their own food and physical work. Put out refuses while another actor actively preserves there; an approaching worker does not block it. Stop one's own preservation before extinguishing. Passive fuel exhaustion interrupts every affected portion. No general heat/spread model is implied.

Current cooking remains **90 game seconds per raw portion**, with input spent at work start. A deer yields **4 raw meat** and a hare or bird **2**; harvesting takes **84 game seconds** for its actual finite yields. Those are current [body](../../../packages/domain/src/worlds/base/bodies.ts) and [action](../../../packages/domain/src/worlds/base/actions.ts) rules, not a guaranteed hunt or a resource spawn. Cooking's new condition consumer must prevent expired input from producing an edible meal without adding a cancellation refund.

The body's existing demand is **259.2 fullness per game day**, or **10.8 per game hour**. An eight-portion preservation batch supplies **304 fullness** but the worker loses **21.6 fullness during its two hours**, before hunting, travel, harvesting, cooking or eating waste. Preparing food is not nutritionally free.

| Intended food use          | Minimum cooked/preserved portions by nutrition alone | Preservation time at 1×                     | Food demand during preservation alone |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------------- |
| Modest cache               | 8 portions = 304 fullness, about 1.17 person-days    | 2 real minutes                              | 21.6 fullness                         |
| 3 game days for one person | 21 portions = 798 fullness versus 777.6 demand       | 5.25 real minutes across deliberate batches | 56.7 fullness                         |
| 4 game days for one person | 28 portions = 1,064 fullness versus 1,036.8 demand   | 7 real minutes across deliberate batches    | 75.6 fullness                         |

These minimums exclude preparation from the named outing, initial fullness, food lost to the meter maximum, delays and failure. The small nutritional margins do not cover all preparation. Actual food for that period must be separate, and a failed hunt can change the plan. A large departure stock is deliberately not presented as one trivial two-minute action. If this complete cost outweighs the activity it enables, revise tuning or retain the simpler food law.

## 4. A cache that earns its preparation

The selected reference is a player who expects to revisit a useful place after **four advancing game days** of other play. This is **96 real minutes** at 1×, potentially spread over sessions with pauses. It is a qualification situation, not a forced wait, a minimum expedition length or an objective to walk in circles. If the available adventure, making or social content does not support a worthwhile intervening activity, the scenario is not ready to establish feature value.

The player acquires **eight actual cooked portions**, for example from two successfully harvested deer that really exist, and elects to cache that surplus. At the start of the preservation batch, assume each portion has at least 75% freshness remaining. This is an example input condition, not a new admission floor. The final portion completes with at least **8 days 16 hours** remaining. Four days after the batch, every retained portion still has at least **4 days 16 hours** of life, assuming the selected rate remained unchanged. An ordinary cooked comparison from those inputs would have spoiled by that return.

The cache does not feed the player while they are elsewhere. One explicit intervening food scenario uses **64 actually acquired berries**, in two separately gathered sets of **32**, one at departure and one after two game days. Each set provides **576 fullness** against two days' **518.4** demand and can be eaten within its three-day life. Both sets together provide **1,152** against **1,036.8** demand. This is a quantity/condition feasibility example, not automatic collection, guaranteed access, prescribed meals or a promise that other residents leave those patches untouched.

Preparation before departure needs additional real food. The preservation work alone costs the fullness stated above; harvesting and cooking two deer's eight portions adds further elapsed time, and hunting/travel are variable. The player may use appropriate older food at that stage, decide to preserve fewer portions, or take a shorter outing. Starting fullness and the returned cache are not counted twice to make this arithmetic pass.

The cache can be ordinary dropped food or food placed in an actually acquired woven container with capacity. Creating the scenario does not award a bag or stock. Physical access remains the current rule. A resident may take permitted food, accept an offered ration, leave it untouched or decline to help. The returner can learn the current amount by inspection and hear actual reports; missing portions do not establish a thief or motive.

Success is recovering usable food and using the resulting freedom for something worthwhile. An honest alternate outcome is finding less because someone used it, and deciding how to respond. A scripted gratitude scene, compulsory cooperation or food loss manufactured to start a crisis is not required evidence.

## 5. Four renewing patches and their real ceiling

Renew only these existing outer sources from [the current landscape](../../../packages/domain/src/worlds/base/landscape.ts). Positions identify the authored starting sources; they are not a universal source-selection rule.

| Source                                  | Current authored location (x, z) | Starting standing stock and capacity |
| --------------------------------------- | -------------------------------- | ------------------------------------ |
| Outer berry thicket, `woodland-patch-0` | 28, 29                           | 24 berries                           |
| Outer berry bush, `woodland-patch-1`    | 37, 17                           | 18 berries                           |
| Outer berry thicket, `woodland-patch-2` | 19, 35                           | 28 berries                           |
| Outer berry bush, `woodland-patch-3`    | 44, 44                           | 22 berries                           |

Each intact source adds **one berry per three game hours while below capacity**. Keep partial progress while below capacity. Reaching capacity discards unused growth opportunity and holds at capacity with no banked credit. Harvesting from a full patch starts a new interval for its newly available space; harvesting again while below capacity does not restart the interval. No extra stock appears because the patch was inspected or nobody visited.

Standing stock represents bounded harvest-ready potential, not individual portable food lots that are secretly being refreshed. It does not undergo separate on-bush spoilage in this first family. Gathering starts portable food's allowance at completion and withdraws actual available stock then. Putting harvested berries near or into a patch cannot reverse that step. The normal gather offer supports **up to two berries per batch**, with the source's existing **30-game-second work** and actual tool/yield rules; the new rate does not require collecting each berry separately.

At a shared instant, mature the legitimately due growth before applying that instant's completed withdrawals. Competing gathers consume actual remaining stock in the existing authoritative action order. One last berry cannot satisfy two workers, and the advertised maximum does not guarantee a full yield. If no stock remains, the action reports its actual failure or supported partial result. Future growth is not reserved by standing beside an empty bush.

Removing an authored source ends its future renewal. It does not scatter an invented crop or schedule a replacement. This first selection has no uprooting, planting, fertilizing, transplanting, source duplication or automatic repair. The depleted near-camp patches stay nonrenewing; wood, stone, fiber and animals retain their finite rules.

The most optimistic continuous production is **8 berries per patch per day**, or **32 across all four**. At **18 fullness each**, that is **576 fullness per day**. Full patches, inaccessible routes, delayed gathering, eating waste and spoiled portable food can all reduce usable production.

| Consumers                              | Daily demand                                | Comparison with maximum new berries                            |
| -------------------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| One person                             | 259.2 fullness / 14.4 berries               | Positive theoretical margin; no guarantee of actual self-care. |
| Two people                             | 518.4 fullness / 28.8 berries               | 57.6 fullness / 3.2 berries margin, about 11.1% of demand.     |
| Three people                           | 777.6 fullness / 43.2 berries               | 201.6 fullness / 11.2 berries deficit each day.                |
| Two people with one patch inaccessible | 518.4 fullness demand; remaining growth 432 | 86.4 fullness / 4.8 berries deficit each day.                  |

The absolute maximum supports about **2.22 people** before loss, not the ordinary three-person camp. Initial **92 berries** represent **1,656 fullness**, about **6.39 person-days** before losses; they are a one-time reserve, not another daily yield. Harvesting all of them immediately can create needless spoilage. No indefinite two-resident promise follows from this theoretical flow, and animals do not replenish the deficit automatically.

## 6. Qualification and expansion

The first evidence must follow ordinary human and resident choices through actual acquisition, condition-aware cooking, finite preservation, interruption, packing, other worthwhile play, return and consumption. Include an older lot, a mixed-age selection, exact expiry, the final unit, a changed offer, two competing gatherers, a full patch, partial growth across restart and the personal whole-world absence hold. No result is asserted by this authored design.

Evaluate complete effort and meaningful choices, not just the shortest batch. The human may stop; residents may refuse or choose another goal. Investigate unreachable food, misleading condition, lost work and unavailable required execution as defects, while preserving consequences of actual poor choices. Ordinary model unavailability supplies neither automatic feeding nor a fictional recipe failure.

Measure the selected camp's complete native work and scoped presentation with repeated harvests and many distinguishable ages. The profile creates no total food-lot, history or population cap. Stored spoiled lots, lineage, inventory selection and cold restoration therefore remain relevant growth costs under CS-L07/CS-L08; a small visible page does not qualify unlimited use.

Before an unattended or larger world, reconcile protected human possessions and actual food clocks, prove usable food at intended consumption times, include sleep and decision/service availability, and measure the aggregate load. Longer shelf life, additional sources or storage effects require a demonstrated benefit and revised scarcity arithmetic. If the selected loop mainly creates pantry supervision or patrols, simplify or decline its adoption before adding another system to compensate.

## Maintained records

- Product proposal and cited research: [Changing supplies feature specification](../../projects/changing-supplies-feature-spec.md).
- Implementation: [CS01–CS06](../../maintainers/changing-supplies.md), under [BW25](../../maintainers/base-world.md#bw25--supplies-that-change-over-time).
- Limits and constraints: [CS-L01–CS-L09](../../limits/changing-supplies.md), [objects](../../limits/objects.md) and [native work](../../limits/native-work.md).
- Current behavior: [Survival](survival.md), [items](items.md), [camp containers](camp-containers.md), [time](time.md), and [simulation time](../../simulation-time.md).
