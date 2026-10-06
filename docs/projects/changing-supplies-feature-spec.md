# Supplies that change over time — feature specification

| Status      | Current progress                                                                                                                                                    | Last updated |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | The DG19 proposal now puts the player-value decision before food expiry and separates preservation from renewal; adoption and delivery remain open under CS01–CS06. | 2026-10-06   |

## 1. The experience this should earn

A player can prepare food for an outing they actually want to take, leave a useful reserve at a place they expect to revisit, and later find that their preparation mattered. A resident can value the same reserve, offer to help, disagree about its use, or choose something else. A previously depleted food source can become worth visiting again without turning the camp into a compulsory farming operation.

This is a **proposed optional wilderness profile**, not a new default food tax. The first complete experience uses personal attended play and the current mechanical clock. Its authored foods, work, source locations, quantities and tuning have one owner: [Changing supplies in the base world](../worlds/base/changing-supplies.md). [CS-L01–CS-L09](../limits/changing-supplies.md) record the restrictions, their reasons and the evidence still required. This document describes the product behavior that those rules must produce; it does not authorize implementation or a continuing-world service.

**Current delivery recommendation:** retain nonperishable food for the ordinary adventure while a particular worthwhile activity and reasoned benefit are selected for any bounded expiry experiment. Preservation and berry renewal are independently selectable additions. The detailed rules below make those proposals reviewable; their completeness is not a reason to enable them together or before that activity exists. [Section 12](#12-delivery-sequence-and-game-first-review) puts that selection before either addition and the actual comparison after its small complete prototype.

Preservation earns its place by extending a useful carrying or storage window. It grants no extra nutrition, universal carrying capacity, combat bonus or hidden social reward. Freshly cooked food remains a sensible immediate meal. A short trip remains possible without preservation. The player who already has enough food may leave, talk, fight, make something or rest instead of filling a prescribed pantry quota.

This matters because [the game's priority policy](../repertoires/gameplay-priorities.md) explicitly rejects preparing supplies as a separate project without a demonstrated gap. Today food already lasts indefinitely. Adding an expiry timer and then selling relief from that timer would not by itself improve the game. The selected hypothesis is narrower: limited food life, accessible preservation and a small amount of local renewal can make a chosen expedition, reserve or repeated destination more meaningful. Adoption requires evidence of that complete benefit against the simpler current game. A technically consistent scarcity model is insufficient.

Factorio's developers reported that a separate agricultural production chain felt unrewarding until its steps helped the player's wider factory. That supports requiring an immediately useful destination for this work, rather than a preservation technology ladder whose reward is more preservation. Their particular industrial solution is not an Open Legend requirement. [CS-R02](#cs-r02--a-production-loop-needs-an-outside-purpose)

## 2. Current foundation and the actual missing behavior

The initial baseline audit uses main `ce68e678ebe7589ae34db9fe7942782dbccbe7a5`. A later source refresh inspected main `34233ae24365eb8911fe1995c9c232bd57f34616`, including the [current action-availability contract](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/action-capabilities.md#action-availability-and-temporary-execution), ordinary exact target/item selection and the [coached live container journey](https://github.com/Macrofold/OpenLegend/blob/34233ae24365eb8911fe1995c9c232bd57f34616/docs/verification/camp-life.md#live-player-journey--october-4-2026). Those newer changes improve discovery, explanation and qualified player use; they do not add food aging or renewal. Current canonical contracts, rather than older survival examples, control what already works.

| Current behavior                                                                                                                                                                                  | Consequence for this proposal                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Survival](../worlds/base/survival.md) already supports finite gathering, hunting, harvesting, cooking, eating, need depletion and consequential NPC death. Ordinary food does not age.           | Freshness and renewal are additions. Current successful meals must remain available without a new invention or hidden illness rule.                     |
| Carcasses already rot and later disappear under the body owner. Death retains a time and finite yields; ordinary harvested meat does not inherit that age.                                        | Late harvesting must not become a fresh-food reset. The new food rule consumes actual source age without redesigning remains.                           |
| [Items and custody](../worlds/base/items.md) already preserve real objects, quantities, containment and access. [Woven containers](../worlds/base/camp-containers.md) are native and implemented. | A bag organizes real supplies. It currently gives no preservation benefit, and its name, appearance or enclosure cannot supply one.                     |
| Condition-bearing lots currently cannot use ordinary split/merge, and retiring their final unit also requires supported disposition.                                                              | Adding a freshness field alone cannot deliver eating, preparation, partial gifts or disposal. These ordinary operations are essential scope.            |
| Cooking spends raw ingredients when work starts and retains only their kind and quantity. Normal production may add output to an existing plain stack.                                            | Food history must survive the period when inputs are inside work and the moment output rejoins inventory. Cooking cannot quietly refresh a stack.       |
| Current offers identify real items but do not reserve their quantity or freeze their condition. Current food inspection calls a definition with nutrition edible.                                 | Acceptance and inspection must consider the particular food now, not just its definition or an old offer.                                               |
| Person controllers do not automatically gather and eat when AI choices are unavailable. Native animals have no replenishing food ecology or reproduction.                                         | Neither food on the ground nor renewable plants proves that residents will survive. No unpaid automatic personality or self-care routine is added here. |

The specific audit is grounded in [object operations](../../packages/domain/src/objects.ts), [actual work and output handling](../../packages/domain/src/kernel.ts), [item production](../../packages/domain/src/data.ts), [offers](../../packages/domain/src/handover.ts), [resource claims](../../packages/domain/src/resource-claims.ts) and [food inspection](../../packages/domain/src/inventory-inspection.ts). These references identify integration obligations, not a prescribed class or storage design.

Earlier [survival](../../archive/03-design-proposals/survival-baseline.md#native-survival-package) and [ecology](../../archive/03-design-proposals/world-and-player-experience.md#ecology-aging-families-and-absence) proposals suggested food state and plant growth among broader possibilities. This design selects their small food consumer. It does not adopt the archived population, automatic emergency behavior, hydration, seasons, generations or uniform-calendar assumptions. Current agency and [simulation time](../simulation-time.md) remain controlling.

## 3. The complete player journey

### Choose a reason before choosing a recipe

The player wants to return to an explored staging place after other play, or spend longer away from a cooking site. They inspect actual food. The inventory distinguishes a meal suitable now from one likely to last for their intended use. It does not invent a quest, impose a departure deadline, add an expedition dashboard or predict unknown encounters.

The first reference situation leaves a modest preserved cache and returns after enough **advancing game time** for an ordinary cooked cache to have spoiled. That time must be filled by an independently worthwhile activity: an actual encounter, exploration, making and using something, or freely chosen social play. The qualification cannot force the player to wait, walk an artificial long route or repeat chores merely to demonstrate an expiry. The [profile's worked journey](../worlds/base/changing-supplies.md#4-a-cache-that-earns-its-preparation) accounts separately for food eaten during the intervening play.

The four-day example is a condition-and-quantity feasibility case, not the first activity to build or proof that preservation earns adoption. At the current clock its payoff arrives after 96 real minutes of advancing play; its traveler also acquires 64 fresh berries elsewhere. An eight-portion cache requires two real minutes of occupied preservation work in addition to acquisition and cooking. The comparison must explain what interesting choice those costs buy over leaving today's nonperishable food in the same place. Merely causing the untreated comparison food to fail supplies no such answer.

### Acquire and divide real food

The player gathers observed berries or hunts and harvests actual animals through current actions. A successful kill is not guaranteed, a corpse is not harvested twice, and another resident's carried food is not part of the player's stock. A remembered patch quantity is dated evidence, not an entitlement to that quantity on arrival.

The player can eat older suitable food now, preserve fresher surplus, keep some cooked portions for immediate use, or abandon preservation. The reference batch is a convenience for a deliberate quantity, not a standing order. The interface shows which food will be used and what remains for immediate meals. Selecting a count does not consume it or give an NPC permission to take it.

### Prepare, leave and return

At an actual reachable lit fire, the player reviews the chosen quantity, total work, current ingredients, available burning time and predicted remaining life of the finished portions. Starting commits a finite course of work. Each portion completes separately; completed rations remain usable if the player stops to eat, answer someone, move or respond to danger. There is no requirement to click or invoke a model between portions.

The player packs or drops the resulting real food using ordinary item handling. An optional woven container keeps the collection convenient; carrying it does not improve the food's condition. A dropped cache follows actual world access and custody. Naming it "my supplies" does not lock it or reserve a portion for a future meal.

On returning, the player inspects what is there now. They may find usable preserved food, fewer portions because someone actually took them, an untouched but spoiled ordinary comparison portion, or an empty location. A resident's explanation is a report with that speaker's knowledge, not a server-certified account of every change. The ordinary Journal may describe a witnessed preparation through its existing narration rules. A note in DG16's proposed personal edition remains the human's separate annotation; it does not enter the character's knowledge. Neither supplies an omniscient stock ledger.

The payoff can be simple: the player can continue their preferred activity instead of starting another hunt at that moment. It does not need a reward popup or a guaranteed expression of gratitude.

## 4. Food condition and what preservation means

### Deterioration belongs to the material

Each supported food lot has one actual condition history. Elapsed mechanical time consumes its remaining freshness according to the installed food rule. Changing custody, moving inside another bag, equipping an item, dropping it, renaming it, inspecting it or restoring a save does not restart that history.

The selected food family has a simple usable/spoiled distinction and an understandable estimate of remaining life. It deliberately omits multiple quality grades, nutrition penalties, taste debuffs and hidden contamination rolls. Raw meat still requires cooking even while unspoiled. A spoiled nutritional definition is not edible merely because its base definition contains nutrition. Fullness gain from a usable portion follows current eating, including the existing maximum; preservation cannot recover nutrition wasted by eating while already full.

Meat begins losing freshness from the animal's actual death. Harvesting carries the deterioration already accumulated into the resulting raw portions. Cooking carries it onward. A freshly completed recipe is not necessarily fresh food. The [world rule](../worlds/base/changing-supplies.md#2-food-law-and-condition-continuity) specifies the equality case: food at its expiry cannot be eaten or converted into an edible result, and a harvest finishing at carcass rot cannot acquire fresh yields. This requires deliberate integration; current work/remains ordering does not already establish that equality rule.

### Preservation slows the future without undoing the past

Preservation carries forward the fraction of freshness remaining at the moment each portion finishes, then applies the preserved food's longer allowance to that remaining fraction. All time spent approaching, waiting, cooking and preserving matters under the rate applicable during that period. The finished food can last longer in absolute time because preservation is useful; it cannot become less deteriorated than its actual input.

This is a bounded game rule, not a model of real drying, microbes or food safety. It avoids two opposite failures. Forbidding any extension of the absolute expiry would make preservation useless. Resetting every output to a full fresh lifetime would let repeatedly processing old meat manufacture new life. The selected rule does neither. Re-preserving an already preserved portion is unavailable; recooking, mixing, changing packaging or giving it away supplies no alternative reset.

There is no arbitrary minimum-freshness grade beyond being able to finish before expiry. An older portion can still be worth preserving for a shorter intended use. The review shows its actual predicted benefit, allowing the player to decide whether the work is worthwhile. It must not imply that an old batch will receive the maximum printed on the recipe. Mixed-age inputs remain distinguishable in the output.

Factorio explicitly describes inherited spoilage in its perishable recipes. Vintage Story's release notes record both spoiled ingredients incorrectly producing usable results and packaging removal resetting freshness. These are concrete reasons to specify every transfer and transformation, rather than assume a cooking animation preserves the right history. The selected Open Legend rule remains its own proposal. [CS-R01](#cs-r01--inherited-condition-and-useful-selection) [CS-R04](#cs-r04--transformation-and-clock-defects)

### Spoiled and unknown are different

Spoiled food remains an actual, visibly unusable lot until an authorized disposition removes it. It does not vanish while an old quantity remains advertised. The selected profile gives spoiled food no nutrition, compost, bait, fuel or invention credit. A simple deliberate disposal action for one's own known spoiled portions may retire them through the object owner; this is a named food sink, not general permission to delete another person's property. Dropping food still only changes its location.

For supported food that the actor can inspect, usability is reliably observable in this first family. A hidden bag remains hidden. Unrecognized, inaccessible or unsupported food is **unknown**, not automatically fresh, poisonous or worthless. A proposal called "safe stew" does not create an edible definition. If the installed family cannot establish consumption behavior, Eat is unavailable with that reason. Missing required condition in a current-format world is a data/integrity failure to report, not an in-fiction diagnosis or a reason to reset its age.

Consuming supported spoiled food is refused before cost or bodily effect. There is no surprise illness, lost health or secret poison chance after a supposedly safe meal. A later illness or uncertain-foraging feature would need its own observable signs, informed choices and consequences under DG21; adding it is not necessary to make this preservation loop coherent.

## 5. Preservation work from review to interruption

### Review and start

The known action is available through the ordinary action catalogue, item context and selected-fire interaction. A typed request may resolve to the same supported method. The player does not have to invent drying before using the authored profile. Invention can later offer a different admitted method, but a decorative rack or a persuasive explanation cannot provide an unsupported storage multiplier.

The review names the exact eligible cooked portions, chosen finite count, current location, active work time, required lit fire and expected output. It shows the weakest predicted remaining life within a mixed selection, with a way to inspect its component lots. The player can choose fewer portions or a different lot without losing the draft. The default for preservation is the freshest suitable food in the permitted selected scope; eating defaults to the oldest suitable food. These are visible conveniences, not automatic world actions or a private camp-wide search.

Admission rechecks access, available ingredients, the work lane, actual heat and whether the selected portions can remain usable through their scheduled individual completions. A failed review or start changes nothing. A known shortfall is explained before starting. The action does not promise future berries, another person's food, a renewed fire or a replacement ingredient if these are absent.

### One portion at a time

The selected batch consists of a finite sequence of identical portion steps. Only the portion currently being worked is held against conflicting consumption or transfer. That same portion continues to age normally. At successful completion it is converted once into a real preserved portion with inherited condition; the next chosen portion can then begin under current checks. Unstarted portions are not globally locked for the whole batch.

This intentionally differs from current cooking's consumption at work start. Preserving already edible food need not destroy it merely because someone stops working. Holding and converting at completion makes the new activity forgiving without refunding past cooking, fuel or completed labor. It is a preservation-family choice, not a reversal of the existing cooking contract. Shared claims must support the changing condition and release the held portion correctly.

The action uses the existing primary physical work lane. It is not an unattended machine and does not continue while the worker walks away, sleeps, becomes inactive or dies. Ordinary permitted speech can continue under its current rules; no simultaneous physical work is inferred. A finite chosen batch does not automatically repeat when more meat appears.

An actor-specific Pause uses the same stop/release behavior for the current portion; it cannot park half-dried claimed food unattended. Explicit whole-world Pause is different: the valid action and every coupled clock stop together.

### Stop, loss and completion

| Situation                                                                                | Required outcome                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Player stops or worker voluntarily changes activity during a portion                     | Keep completed rations. Release the same unfinished cooked portion at its current condition. Lose that portion's unfinished drying progress; keep all burned fuel spent. Unstarted food remains where it actually is.                                                                                                                                                                |
| Food becomes spoiled while held or before its next step                                  | Stop the affected continuation. The food stays spoiled; release its claim and show the actual completed count. Do not substitute younger food or turn the loss into an edible ration.                                                                                                                                                                                                |
| Fire goes out, access is lost, reach becomes invalid or the worker can no longer work    | Stop at the actual occurrence. Retain completed results and the current food's true condition. Continuing later requires a new valid choice; there is no fictional heat while waiting.                                                                                                                                                                                               |
| Another actor spends an unstarted chosen portion                                         | Stop before spending a substitute. Explain that the remaining selected food is no longer available, without disclosing a hidden actor or private plan.                                                                                                                                                                                                                               |
| Whole world pauses or a supported current-format save/restart restores an active portion | Preserve work progress, held food and condition together for work still valid after participation reconciliation. Otherwise apply ordinary cancellation/release, retaining completed output and actual food condition. World suspension advances neither work nor food age; an ingredient hold does not stop aging. Resumption does not replay portions or charge ingredients twice. |
| Last selected portion completes                                                          | Finish with actual quantities and locations. Release remaining work claims. Do not start another batch, eat the output, pack it or gift it without an existing accepted instruction for that separate action.                                                                                                                                                                        |

A fire may continue burning after preservation stops; preserving does not add automatic extinction or a fuel refund. Existing fire-care choices remain available. Put out is refused while another actor is actively preserving at that fire, matching the current protection for another actor's active cooking. A worker still approaching does not block it. A person can Stop their own preservation and then use the ordinary fire action; passive fuel exhaustion still interrupts every affected portion. This first family adds no general ignition, heat damage, smoke, moisture or spread dependency on DG20.

Cooking's already consumed raw portion must also retain enough condition history to prevent a false fresh output. If it expires during that work, no edible result can be reported. Existing committed input costs remain spent, and the outcome explains the failed meal. This does not create a refund path for cancelled cooking. A provider timeout is entirely different: it cannot make mechanically successful food spoiled or roll a failed recipe.

## 6. Lots, containers, offers and exact consequences

Two visually similar portions can have different remaining lives. Inventory may group their presentation under one food name, but a displayed total cannot merge their physical condition. Expanding that row reveals useful age groups and quantities. It should not require selecting a separate object for every unit when several units actually share all relevant state.

Splitting a homogeneous lot copies its condition without creating new freshness. Combining is allowed only when the food condition and other existing equivalence requirements genuinely match; otherwise the lots remain separate. No weighted-average quality, youngest-wins rule or oldest-wins destruction is introduced. Display grouping is sufficient to avoid clutter. Historical lineage can explain an old reference without authorizing it to spend a different present lot.

This rule applies to the final unit as well as a convenient multi-unit example. Eating the last berry, converting the final meat portion, discarding spoiled food and accepting a partial gift all require the shared object owner to retire or preserve the correct identity and attached condition. Native output handling must not top up an older incompatible stack simply because the definition matches.

Moving an entire bag preserves every contained food's current history. Neither nesting depth nor being held by a human changes the rate in the selected profile. Capacity remains the existing packing rule; preservation adds no carrying-strength bonus and no assumption of a new actor weight limit. Hidden contents cannot leak through a "food about to spoil" badge, a recipient offer preview or a purported camp supply total.

An offer is an invitation to transfer the actual food, not a reservation or a freshness guarantee. The recipient sees the current permitted condition when reviewing it. Ordinary predictable aging does not make every offer instantly stale, but a change from usable to spoiled invalidates acceptance as the previously offered usable food. The player sees the change and can review a new offer; the recipient is not silently given an inedible substitute. Explicitly offering spoiled food remains honestly labeled under ordinary permitted transfer. The receipt reports what really moved.

Reservations and agreed quantities do not preserve edibility. A portion becoming spoiled can invalidate the intended use even though its quantity is unchanged. Release or fail the affected work coherently; do not delete reserved quantity underneath another owner or maintain a false "available meal" count. A lost response resolves the original transfer or preparation receipt before any retry. No missing acknowledgment grants another ration.

For future trade or promises, a statement about delivery quality must use the agreement owner's supported terms. This design does not implement a freshness warranty, escrow, price, ownership law or liability for a late meal. Ordinary speech can express such intentions without pretending the platform enforces them.

## 7. A finite source can renew without becoming a farm

Only the selected existing outer berry patches renew. Each has an actual standing capacity and a modest rate. Harvesting withdraws what is present when the work completes, not what a menu showed earlier. The nearby depleted starter patches remain depleted, and native wildlife, wood, stone and fiber do not acquire regeneration by association.

This source-return activity may be selected while portable food keeps today's nonperishable law. It does not depend on preservation, age-group inventory or spoiled-food disposal. Its reason to exist must be a wanted return to a known food location after actual depletion, with enough other worthwhile play between visits. If food aging is separately selected, gathered food additionally follows the condition rules above; the source's finite stock, growth and truthful observations remain the same in either case.

Standing fruit is deliberately a bounded source opportunity, separate from portable harvested-food lots. It may remain ready at the patch's finite capacity without simulating every berry's on-bush life. Completed gathering creates food under the selected portable-food law, including the authored starting condition when aging is enabled. This abstraction is disclosed; it cannot rejuvenate a berry by returning it to the bush. Ordinary item placement does not replenish a resource source.

Growth begins or continues only while stock is below capacity. A full patch banks no missed growth. Partial harvesting while already below capacity does not reset progress toward the next berry, and repeatedly inspecting or taking a tiny amount does not trigger a full refill. The world profile defines simultaneous growth/harvest ordering and source removal. The result must be independent of frame rate, how often somebody visits, or which browser opens the patch first.

A player can find an empty but renewing patch, understand that returning later is possible, and choose another activity. There is no compulsory watering, fertilizer, weeding, seed replacement or tending loop. A later care feature could offer a positive, legible benefit, but preserving a basic supply should not depend on returning at exact intervals. Klei's farming announcement offers a useful precedent for rewarding attention without making neglect kill the crop; it does not establish suitable Open Legend growth values. [CS-R09](#cs-r09--renewal-without-a-neglect-punishment)

Locations matter. A remembered patch can make a return journey useful, and someone else may have harvested it. That does not require plant ownership, scripted competition or guaranteed conflict. Eco's move toward localized plant clusters is evidence for using geography to create opportunities; its trade institutions and population assumptions remain separate. [CS-R08](#cs-r08--geographic-supply)

The [flow calculation](../worlds/base/changing-supplies.md#5-four-renewing-patches-and-their-real-ceiling) distinguishes initial stock, theoretical continuous yield and actual meals eaten. The selected rate cannot sustain the ordinary three-person camp by berries alone. Even its smaller theoretical coverage assumes every patch remains accessible, room exists for growth, people harvest, food remains usable and eating avoids waste. Renewal supplies opportunity, not an invisible survival subsidy.

With nonperishable portable food, actual harvested surplus can accumulate instead of expiring. A patch's standing capacity therefore does not cap the world's stored food. Judge that changed scarcity alongside the return-visit benefit; do not imply that the same growth rate produces the same economy with and without spoilage.

## 8. What people know and how the interface helps

The inventory's primary food row shows its name, quantity, usable/spoiled condition and a concise remaining-life estimate where that information is permitted. The estimate is in **game time while the world advances**, with the normal-speed real-time equivalent available in explanation. The recipe's maximum shelf life is identified as a maximum for fresh output, not the current lot's deadline.

Reuse the already delivered persistent action details, exact material/target choices, readable blockers, search and bounded result paging. These controls do not already implement freshness. Current choices describe the last completed permitted read; newly available nearby targets may require the existing Refresh action, and execution always rechecks. The new condition consumer must keep the selected food's displayed facts truthful without position-only polling, scanning everybody's possessions or moving a focused choice as time passes.

Detailed inspection can explain why two portions differ: this food is older, this was successfully preserved, or this offer was observed earlier. It must not disclose an unseen killer, a private cook's thoughts or an inaccessible container. In this first world, the condition estimate is an authored inspection affordance, not a claim that appearance reveals a precise real-world expiry date.

Food lists preserve selection and reading position as time passes. A quantity becoming unusable updates its facts without moving the focused row under the pointer or replacing a blank quantity draft. Search and selection remain scoped to the current permitted collection. A grouped total says when more lots or nested contents remain outside the loaded scope; it never calls an incomplete scan a complete pantry inventory.

Useful controls are deliberately few: Eat a selected usable portion, choose portions to Preserve, move/offer food through existing handling, and dispose of selected known spoiled food. The player can reach costs and blockers with keyboard and touch. Color supplements the words usable/spoiled; it is not the only distinction. A dimmed action's reason remains reachable. Opening a recipe or food detail neither pauses the world nor starts work implicitly.

For a patch, inspection shows observed available stock, whether this authored source can renew and the next useful timing estimate. Distant remembered patches retain their last observation and time. A map marker cannot reveal that another resident just harvested them. On return, normal perception supplies a current observation; a local growth event is not broadcast as universal knowledge.

Do not publish a toast or paid reconsideration for every tiny age change, berry or finished portion. Aggregate actual results where the existing event/attention owner permits it, preserving real completion and loss records. A useful interruption such as selected food becoming unusable is distinguishable from background aging. NPCs receive only the relevant current evidence and bounded summaries available to their own actor. There is no new global supply-monitoring agent.

The narrator may describe a witnessed result through current authorized narration. Routine counts and failure explanations are interface facts. They must not become an invented story fallback if narration fails; the existing **"Narration failed."** behavior remains. Reading a longer explanation does not secretly extend food life, and dismissing it does not concede an offer or consent to work.

## 9. Residents with lives beyond stocking food

Ada might want a reserve because she hopes to visit somewhere without another hunt. The Mercenary might prefer to eat and depart, offer a portion to someone, doubt the value of preserving a small surplus, or ask to use the fire later. These are possible decisions, not scripts, new mandatory goals or personality assignments. The [compelling-character contract](compelling-characters-feature-spec.md) still connects bodily needs, experience, identity and current choices.

A resident can weigh immediate hunger, a remembered destination, the cost of a hunt, companionship, a promise, dislike of waste or enjoyment of a shared meal. They do not have to optimize all food into the longest-lasting form. They may make an understandable poor choice, refuse a chore, trust a mistaken report or pursue another purpose. A successful feature makes those choices usable and consequential; it does not force every resident into the same efficient pantry schedule.

The new evidence makes supported choices available through existing agency. A chosen finite batch executes natively. Continuing portions are not new opportunities to purchase a model call, and a food timer does not produce a compulsory thought. A genuine new circumstance can invite reconsideration under the attention owner; it does not compel a particular response. Repeatedly asking an unavailable resident to preserve food does not bypass refusal or spending limits.

Work with others stays concrete. Asking for help communicates a request; an answer is not a transfer. Each person independently chooses their own action, uses permitted actual food and produces their own real output. A shared fire does not grant access to another person's inventory. No group call distributes hidden possessions, chooses everybody's motives or awards a finished communal stockpile.

Observed consequences can enrich later encounters. Someone may remember that the player gave away their last fresh meal, complain about an empty cache they actually inspected, or joke about an unnecessary preparation. A resident cannot know who took missing food without evidence. No friendship meter changes merely because a preservation batch completed. A report does not make private memories public or create an enforced obligation to replace the food.

Distinguish poor decisions from broken service. Ignoring known hunger, declining to gather, or using reserves for another chosen purpose can have current survival consequences. Failing to reach a visible adjacent patch, receiving stale edible labels, losing source age during cooking, or waiting behind an unavailable required service is a defect to expose. Food being theoretically available is not evidence that the agency path is reliable.

## 10. Time, absence, restart and technical failure

The first profile uses one mechanical clock for body needs, food deterioration, corpse deadlines, work, fire and patch growth. Camera distance, closed inventory, absent observers and a minimized panel do not alter those laws while the world runs. A faster game rate accelerates all of these coupled consequences together; this design introduces no calendar, seasonal or aging clock.

The selected personal world holds that whole clock when its sole human participant leaves. Departure first applies the human's ordinary work cancellation: keep completed rations and release the current cooked portion at its real condition, without retaining its unfinished drying progress. The subsequent whole-world hold freezes carried food, dropped food, patches, NPC needs and any still-valid NPC preservation work together. Explicit whole-world Pause preserves valid active work; restart retains only work permitted after ordinary participation reconciliation. This is a disclosed profile-level absence rule, not a special human-bag freshness freezer. It therefore does not quietly change [MP04 protection](../product-scalability/participation-and-protection.md) or let a player shelter food from a continuing world's clock by logging out.

That distinction becomes material in a later shared or unattended world. MP04 already retains and protects inactive-human possessions; this document cannot decide that those supplies now spoil, become common stock or lose protection. Freezing only that custody while the rest of a food economy continues could also create unlimited offline storage. A later adoption must explicitly reconcile food law, human absence and reserve viability. The personal proposal does not settle that policy by implication.

The current [continuing-community proposal](continuing-lives-feature-spec.md) was prepared against nonperishable food. Its quantity arithmetic alone is insufficient after spoilage. A future combined profile must show that each accessible portion is usable when someone will actually eat it, including sleep, preparation and delays, and must requalify actual self-care and service capacity. The new berry ceiling does not automatically qualify its operating horizon or a larger population.

Save/load retains the food's current condition, source history, consumed cooking inputs, active held portion, completed preservation outputs, stock and partial growth together. Restart adds no real-time decay or harvest. Restoring an earlier supported timeline follows its existing fictional history policy; it does not restore money, replay paid work or duplicate already acknowledged external spending. Incompatible development state follows the [root save policy](../../AGENTS.md#development-save-policy), without automatic deletion, reseeding or a legacy migration project.

Ordinary model unavailability does not halt an already admitted native portion, freeze only food, or manufacture an NPC's next decision. When native advancement cannot produce a coherent present, the existing time owner retains unadvanced time and reports the technical block; it cannot let hunger run while food remains stale in another subsystem. In this personal profile a required world suspension is coherent across all coupled laws. It is not a promise of selective protection in a public contested world.

No billing or retry policy changes. Human known actions do not require paid invention; optional interpretation and independent cognition use existing permission and budget. A provider failure is a service outcome, not burned meat. Returning after an outage sees the restored present and actual operational status, not fabricated elapsed harvesting or a backlog of mandatory thoughts.

## 11. Whole-path economics and performance

The economic test is the amount of worthwhile play that preparation supports. The [profile's arithmetic](../worlds/base/changing-supplies.md#3-work-and-opportunity-cost) includes the larger number of portions needed for a multi-day outing, all preservation work, actual fuel, food eaten during preparation, and acquisition that must already have succeeded. The small maximum batch duration is not the total cost of stocking a trip. There are no measured service prices or claims of affordable perpetual operation in this proposal.

Preservation reduces avoidable waste and can postpone another food search; it does not produce nutrition. Renewable plants produce a limited flow at actual locations, with travel, access, saturation and loss affecting its usable value. These are different benefits. The game should not secretly raise hunger or remove all alternatives to ensure that both new mechanics are used.

Food condition should be cheap when nothing meaningful happens. A stack of equivalent portions does not need one actor, timer, model call or visible event per physical portion. A known rate and actual deadlines can support native progress without simulating an unseen kitchen animation. These are performance intentions, not a technical architecture or a claim that current code already provides the complete path.

The complete cost includes finding eligible lots before choosing a batch, examining nested accessible possessions, comparing condition for merge, updating held-work eligibility, finding expiring food, applying patch growth, producing observations, presenting mixed-age collections and retaining history. A small final page or chosen batch does not bound those earlier searches. Cold loading, restoration and definition changes also matter.

Repeated small harvests and staggered preservation can grow the number of distinct-age lots even when total food quantity is modest. Spoiled lots and lineage can grow retained storage after they stop aging. Display grouping does not remove that cost. No new global food-lot cap or silent retirement is invented here. [CS-L07/CS-L08](../limits/changing-supplies.md) retain this open growth and the need to measure real collections, permitted disposal and cold behavior before a longer-world promise.

Opening and closing inventory, rearranging containers, asking for the same recipe or revisiting an empty patch must not trigger paid analysis every time. An unchanged unsupported preservation proposal does not justify automatic retries. Detailed food context belongs to the relevant actor, not every resident's next prompt. Shared observations can reuse permitted facts without revealing private contents.

Measure quiet time, a normal chosen batch, several people independently using the same real fire, simultaneous harvest contention, many different-age lots, repeated moves and restart with held work. Report native processing, actual elapsed advancement, projection cost, retained growth and AI use separately. Qualification of the selected small personal profile is not evidence for a town, an overnight service or a universal population capacity.

## 12. Delivery sequence and game-first review

**Before implementation selection: establish the activity and compare the simpler game.** Name the actual outing, return or supply shortfall, what makes it worth doing, and the choice that changing food would improve. Compare with the same activity using current nonperishable food, existing bags and ordinary gathering. Review the full acquisition-to-benefit cost, including the worked example's long return interval and meals acquired elsewhere. If there is no worthwhile activity or preparation remains useful only against a newly imposed expiry, keep today's food law and deliver the missing activity first. This is a selection decision before adding decay, not an assessment deferred until a new food economy is built. A later focused comparison still checks the hypothesis in play; none has run here.

The upfront decision needs a credible wanted activity and a reasoned benefit, not proof of enjoyment before a prototype exists. A bounded preservation experiment may test whether aging and an accessible response create a worthwhile planning choice together. Its actual comparison follows that small complete prototype before ordinary adoption or expansion; no new study, analytics system or forced long play session is prescribed.

**Selectable delivery: one complete preservation choice.** Once that case is established, deliver condition continuity through actual harvesting and cooking, all ordinary inventory/consumption/offer operations it affects, the known finite method, truthful information, interruption and current-format restoration together. Include a useful outcome and the choice to use fresh food or leave without preserving. Do not enable expiry before its usable remedies or defer correctness for an enabled food operation. Berry renewal, autonomous stocking and a social demonstration are not prerequisites for this human choice.

**Independent selectable delivery: one useful source return.** Where actual depletion makes a known location worth revisiting, deliver the selected renewal, finite capacity, gathering contention, visible/remembered distinction and honest flow arithmetic. Compare with finding existing food. This may precede preservation and keep nonperishable portable food; it does not require new age groups, a farm, breeding or a self-sustaining camp. If both additions are selected, their actual source-to-food consequences must agree.

**Later combination: people and changed supplies.** Qualify residents making their own preparation and return decisions, declined help and consequences they actually observed once that shared activity is wanted. Any resident action already offered by an earlier delivery still requires correct access, condition, real handover and independent choice. This wider social qualification does not hold the first human activity open, create a chore assignment, or let a scripted successful batch count as voluntary agency.

**After each selected delivery: compare before expanding.** Look for a wanted choice, less interruption of preferred play and a place worth returning to. Count repeated inventory checks, gathering performed only to satisfy new timers, avoidable recipe decisions and tending. Reconsider the selected addition before combining it with another; no stage requires adopting every rule in the full profile. CS01–CS06 retain all applicable correctness and acceptance, with later or combined work kept explicitly open.

The required continuation is practical. Someone with an expiring meal can eat it, select less work, choose another supply, shorten a planned trip or decline the optional challenge. Someone who stops preservation retains their usable cooked portion at its real age. Someone with enough food is allowed to finish preparing. A player need not understand fractions, timers or sustainable-yield arithmetic to choose a useful action.

If storage decisions remain uninteresting, keep the current simple food law or lengthen the proposed life before adding refrigeration, disease or more crop species. If preservation is always obligatory, reduce its cost or reduce the frequency of the problem; do not automate a bad chore into every NPC's personality. If renewal produces route-patrol busywork, adjust its timing or scope rather than requiring constant tending. If no actual activity benefits from the cache, defer adoption and build the missing adventure or social activity first. The design remains concrete without claiming every designed mechanic deserves to ship.

Broader food types, environmental rate changes, cool storage, salting, fermentation, farming, animal reproduction, illness, seasons, trade quality guarantees and unattended communities are expansion choices. Each needs a new player benefit, supported interactions and its own scarcity/clock qualification. DG20 heat and DG21 care are not hidden prerequisites for this first family.

## 13. Research record and what it does not prove

Primary developer or official sources were inspected on October 6, 2026. Historical announcements establish the described choices and defects at that time, not present tuning or measured enjoyment. The numerical wilderness proposal is game design, not food-safety advice. No source establishes an appropriate Open Legend shelf life, sustainable population or server price.

### CS-R01 — Inherited condition and useful selection

[Wube, Friday Facts #414, June 7, 2024](https://www.factorio.com/blog/post/fff-414) describes inherited ingredient spoilage, visible spoiled output, and fresh/old selection priorities; it also reports reducing an over-broad crop set. [Current priority documentation](https://lua-api.factorio.com/latest/concepts/SpoilPriority.html) corroborates the available selection modes. Implication: carry condition and reduce manual sorting. Limit: Factorio emphasizes throughput instead of reserves; Open Legend's longer-lasting cache has a different purpose. This proposal does not copy an unverified stack-averaging algorithm.

### CS-R02 — A production loop needs an outside purpose

[Wube, Friday Facts #431, October 4, 2024](https://www.factorio.com/blog/post/fff-431) reports playtest difficulty with agriculture isolated from useful factory construction and describes reconnecting it. Implication: the preserved food must enable something the player already values. Limit: a developer's reported revision is not a controlled proof that preservation or added scarcity improves another game.

### CS-R03 — Readable deterioration with an available response

[Vintage Story, food spoilage and preservation update, August 24, 2019](https://www.vintagestory.at/blog.html/news/the-food-spoilage-and-preservation-update-v110-rc1-r198/) introduces visible deterioration, inedible rot and several preservation/storage effects. Implication: pair food aging with understandable information and an accessible response. Limit: this was an early release announcement, and its specific storage, temperature and cooking bonuses are not adopted here.

### CS-R04 — Transformation and clock defects

[Vintage Story 1.16.0, January 10, 2022](https://www.vintagestory.at/blog.html/news/homesteading-part-2-combat-update-stable-1160-r310/) fixes spoiled crafting ingredients producing inappropriate output, wax removal resetting cheese freshness, and crop growth failing to respect configured day length. Implication: include processing, packaging and the shared clock in the actual player contract. Limit: these historical fixes do not indicate current defects or justify broader food simulation.

### CS-R05 — Preservation must be materially accessible

[The Indie Stone, Smash n' Grab, September 2016](https://projectzomboid.com/blog/news/2016/09/smash-n-grab/) describes increasing jar availability to encourage pickling and adding composting and labeled storage. Implication: avoid a rare-container hunt before the selected useful preservation. Limit: it provides no measured uptake, and a later use for waste does not require composting now.

### CS-R06 — Food can support a chosen expedition

[Iron Gate's official Valheim FAQ](https://www.valheimgame.com/faq/) describes food increasing health and stamina while not being essential to staying alive. Implication: evaluate food by activities and preparedness as well as penalties avoided. Limit: Open Legend retains its existing hunger and mortality; this page is not evidence about Valheim's spoilage or a reason to add its livestock.

### CS-R07 — Initial expiry values need player review

[Eco 9.6 and 9.6.2 developer releases, August 31 and September 15, 2022](https://store.steampowered.com/news/posts/?appids=382310&enddate=1663637398&feed=steam_community_announcements) pair configurable shelf life with preservation storage, then lengthen crop and seed lifetimes after feedback. Implication: scarcity and available storage should be evaluated together, and initial expiry numbers remain revisable. Limit: the posts establish intent and a tuning response, not the distribution of player feedback or a successful outcome. Their days cannot be copied into this game's faster clock.

### CS-R08 — Geographic supply

[Eco's Boats and Trade preview and Eco 10 release, August 1 and December 12, 2023](https://store.steampowered.com/news/posts/?appids=382310&enddate=1703181239&feed=steam_community_announcements) describe localized plant clusters, with the release confirming that distribution. Implication: a few useful sources can give travel a purpose. Limit: these sources do not establish a regrowth rate, a monopoly policy or the social outcome of scarcity.

### CS-R09 — Renewal without a neglect punishment

[Klei, Reap What You Sow, December 15, 2020](https://store.steampowered.com/news/posts/?appids=322330&enddate=1608334263&feed=steam_community_announcements) introduces care rewards, plant information and seed organization while stating that neglected crops do not die. Implication: useful return visits need not require constant maintenance. Limit: this does not support importing its farming detail or claim that its announcement measured reduced chores.

## 14. Decisions, uncertainty and completion claim

The proposal retains concrete rules for a small personal preservation profile and geographically limited renewal, while the second product review moves the player-value decision before enabling expiry and makes those two additions independent. When preservation is selected, material condition survives all supported handling, nutrition remains unchanged, partial work is forgiving, edibility is reliable, and existing containers gain no rate bonus. These rules make a conditional experiment reviewable; they do not establish its advantage over the current game. No enabled world or service changes.

Actual adoption, technical design, current-format implementation, independent NPC qualification, perceived fun and complete cost measurements remain open in CS01–CS06. Broader shared-world absence policy, longer community operating promises, prices, retention and population admission remain with their existing owners. They do not prevent this scoped product proposal, and this document does not choose them indirectly.

No runtime tests, live-provider qualification or new playtest results are claimed by this documentation task. The final design review favored fewer conditions, no hidden illness, no automatic chore schedule, a useful partial-batch exit and a real activity outside food management. Those are reasoned design decisions that still need the stated play evidence.

## Maintained records

- Implementation: [Changing supplies, CS01–CS06](../maintainers/changing-supplies.md), under [BW25](../maintainers/base-world.md#bw25--supplies-that-change-over-time) and [DG19](../maintainers/needs-design.md#dg19--supplies-that-change-over-time).
- Limits and constraints: [CS-L01–CS-L09](../limits/changing-supplies.md); existing [object limits](../limits/objects.md), [native-work limits](../limits/native-work.md) and [product scalability](../limits/product-scalability.md) retain their respective policies.
- Authored behavior: [Base-world changing supplies](../worlds/base/changing-supplies.md), [survival](../worlds/base/survival.md), [items](../worlds/base/items.md) and [camp containers](../worlds/base/camp-containers.md).
- Shared owners: [Persistent objects](persistent-objects-feature-spec.md), [state and resource claims](shared-state-contributions-feature-spec.md), [action capabilities](../action-capabilities.md), [simulation time](../simulation-time.md), [agency](../agent-agency.md), [save/load](../save-and-load.md) and [inventory interaction](../ui-ux/inventory.md).
- Related proposals: [Continuing lives](continuing-lives-feature-spec.md), [compelling characters](compelling-characters-feature-spec.md), [personal journal](personal-journal-feature-spec.md), and the existing food/materials umbrellas rather than a new technical design in this product-only assignment.
