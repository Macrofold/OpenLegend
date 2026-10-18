# First-playable survival, useful making and earned options — feature specification

| Status      | Current progress                                                                                                                                            | Last updated |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| In progress | Detailed design is selected; empty-handed survival, natural manufacturing, field hearths and complete player qualification remain to be delivered under SV. | 2026-10-17   |

## Purpose and status

The player should be able to arrive with no equipment, understand how to stay alive, make useful things, choose what kind of camp to build, venture out for something worthwhile and recover from loss. The first meal must be possible without a model, another person's kindness or an item that requires itself to manufacture. Known methods make ordinary competence dependable; invention adds personally useful alternatives.

This pair completes the survival/material/known-crafting/progression slice of [FPV02](../maintainers/first-playable-validation.md#fpv02--finish-the-necessary-detailed-design-in-existing-owners). It consumes the selected [first-playable target](../worlds/base/playable-openings.md#first-playable-game-target), [gameplay priorities](../repertoires/gameplay-priorities.md), existing bodily/custody/knowledge laws, and the [integrated technical design](first-playable-world-tech-design.md). It is a selected design, not runtime implementation, human enjoyment evidence or authorization to spend on a provider.

Research-derived scope intersects **ND06/DG19** for resource supply, **ND07/DG13** for camp materials and **ND11/DG07** for recovery. These slices receive concrete selected designs here and in [shelters](editable-shelters-feature-spec.md); the broad ecology, food-condition, richer settlement and recovery umbrellas remain distinct. No new ND identity is needed for an unregistered crafting synthesis heading.

The exact resource palette, quantities, recipes, tool effects, arrival values and recovery choices have one owner: [the base-world survival profile](../worlds/base/first-playable-survival.md). The [technical counterpart](first-playable-survival-tech-design.md) identifies the runtime changes. The rest of this document describes why the choices matter and what players must be able to do.

## Starting from the actual build

Source inspection at development base `0543f9ec61301240c5c4ec3cd007063f4f1c25d6` establishes the following relevant baseline, not a new execution test:

- Main currently starts the player with cutting tools, food-production materials and an authored canopy kit. Its two near berry patches contain zero berries. Current Main therefore cannot establish survival from empty hands.
- Native gathering transfers finite resources; fiber/cord preparation and recipe manufacture exist. Existing preparation is a fixed fiber/cord union, while ordinary admitted recipe families produce one crafted object. Neither already supplies the required post-plus-offcut transformation, kept hammer/cutting prerequisites or place-targeted hearth construction.
- Existing installed food preparation, fishing, harvest, fire tending, finite action composition, custody, equipment, recipe-record learning and useful expeditions are reusable owners.
- The established death continuation uses actual campfires. With no usable campfire it refuses instead of inventing a spawn point. Initial recovery therefore needs a real public rest location and an explicit permission-gated fresh-start path or host assistance when creation is unavailable.
- Open canopies are implemented, with real posts/cloth/ties, exposure and reclaim. The selected wall/entrance extension consumes the natural components defined here; that extension does not become delivered by linking it.

Keep qualified existing behavior and evidence scoped to their recorded revisions. The current rich supplied-world setup can continue to inform diagnostic presets; it is not a substitute for the ordinary first-playable route.

## Intended experience

### Understand the immediate options

The player sees ordinary body meters and nearby recognizable plants and loose materials. Inspecting a berry source offers Gather; inspecting food offers Eat one or an explicit meal quantity with its actual benefit and any wasted excess. A finite selected meal can fill the meter without repeated one-item menu visits; it never eats again automatically. The existing action browser shows the player's familiar methods and meaningful missing prerequisites even when nothing is carried. The player does not have to discover a secret phrase such as “make a primitive cutting implement” to gain a basic action.

Start with full Food and Energy. Choosing five berries as one finite meal restores up to 90 Food, a paper 8 minutes 20 seconds at normal drain, so reading or conversation need not be punctuated by a one-berry click every 100 seconds. Actual intervals and annoyance remain playtest questions. Real food and time laws continue; no scripted “first hunger” incident or hidden immunity changes the rules. Human reading, choosing a direction and applicable generation delay must be included in playtests. A player who pauses to read is using the normal control, not failing the design. Other people may need food and may choose to take public supplies, but a fixed tutorial does not make anyone fetch dinner.

### Make a workable kit

The player can collect berries, fibers, branches, smooth stones, flint and fallen poles by hand. A retained smooth stone allows flint to become a cutting stone. The first cutting stone opens trimming, harvesting and structural material preparation. Fiber preparation and cord need no cutting tool, preventing a circular dependency.

Choose a useful next investment: a comb to collect reeds more efficiently, a pole hook to supply building, a known club and shield, a bag/basket to organize actual possessions, or a river line for a peaceful food attempt. No mandatory workbench, skill level, sharpening cycle or all-recipes progression tree is added. The costs remain real; tool and material choice should remove some work or open a different activity.

Manufacture is deliberate, interruptible work. Before Start, show exact spent inputs, kept tools, output and time. When the player cancels, the result explains what was already consumed and what actually exists; it does not refund fictional material or pretend that a finished panel is lying somewhere. Structural installation retains its separate staged-material rules. Repeated operations can be explicitly grouped into a finite batch so that material preparation does not mean dozens of identical menu clicks.

### Build a useful place without finishing everything

A cold hearth can be laid from gathered stones, then fueled and lit through the same rules as existing fires. A canopy gives a covered spot; a basket organizes supplies; a wall/gate changes approaches. The player chooses the layout and order. A small open camp is a legitimate early home and stopping point even before the optional complete perimeter is built.

The natural recipe chain supplies actual posts, roof mats, wall panels, gate leaf and rails. A finished building component is not itself an installed obstacle; it must be deliberately placed through the [construction owner](editable-shelters-tech-design.md). No item name creates a wall, grants construction permission, changes territory or reserves a camp for the player.

Camp value is practical and personal: food can be prepared there, supplies can be found again, a deliberately placed entrance works, and the layout reflects a choice between access, cover and travel. Shelter does not secretly fill meters, grant invulnerability, make people loyal or erase consequences outside the walls.

### Gain something worth using on another outing

Existing Lookout and Riverside workshop remain optional physical destinations. Their spear and method record supply different options; they do not complete a hidden quest or automatically restock. The player can leave, return, bring a friend, share a real object, take the method record away, or find that another visitor took the supplies.

Known manufacture, record learning, live invention, crafting the result and using it are five different events. The interface and saved provenance preserve that distinction. A reliable authored field sling is valuable even if the player never invents. Separately, qualification must show a real supported invention that changes an available option and is useful again, rather than a renamed preselected recipe. The selected hypothesis is a ranged hunting tool before learning that record, using the already supported family and obtainable materials. Compare the best known route and actual remaining need, including generation, reading, travel, manufacture and use; a tiny yield improvement used twice does not establish that promise.

The game should permit a quiet successful session: make a meal, finish a small camp, improve a tool, share supplies or discover a route. These can matter without a fight or an explicit XP award. The complete first-playable game still requires the separately designed independent animal/human danger, cooperation and meaningful character consequences; this slice does not shrink that target to solitary crafting.

## Complete player situations

| Situation and knowledge                                         | Player action and real result                                                                                                          | Meaningful failure or alternative                                                                 | Satisfying continuation                                                                                                               |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Arrives empty-handed; sees a familiar berry patch               | Inspect, approach, collect one berry, decide whether to eat or save it                                                                 | Another person depleted that patch; see the truthful result and use the other near source         | Has a meal and understands one complete source-to-use action                                                                          |
| Knows how to knap; has one flint and one smooth stone           | Selects the stone as retained hammer; spends flint and work; receives a cutting stone                                                  | Hammer is reserved/removed, input unavailable or work stopped; no fabricated tool                 | Remake with other actual materials, or use a legitimately obtained knife                                                              |
| Wants a roof but has no prepared kit                            | Gathers, prepares, makes real posts/mat/ties and builds a chosen site                                                                  | Damaged/invalid component, blocked stance, spent material or permission refusal remains explicit  | Build a smaller supported part first, move site or gather another legitimate input                                                    |
| Wants fish without hunting                                      | Makes a known line using real loose bone, cord and wood; casts at a known reach, then cooks a real catch                               | Cast misses, finite supply is exhausted, path or fire fails                                       | Keep the real line, try another chosen cast/reach, forage or cooperate                                                                |
| Wants to hunt at a distance before learning the workshop method | Requests a supported ranged alternative, compares current known options and actual costs, then manufactures and uses its real proposal | Provider unavailable, unsupported effect, poor proposal, missing material or delayed/stale result | Continue the known route; retain only lawfully admitted useful work; no paid automatic invention retry                                |
| Dies before laying a hearth                                     | Ordinary death creates a corpse; explicit Continue selects a usable existing public campfire                                           | Occupied/blocked candidates can all fail; no unsafe teleport or free stock                        | Use another admissible rest spot, permitted creator correction, or authorized fresh-world creation; otherwise request host assistance |
| Returns after a loss                                            | Keeps retained knowledge, follows a known route and uses actual remaining sources                                                      | Old possessions may have been taken; dead animals/reward sites do not regenerate                  | Replace essentials cheaply, recover what remains, trade voluntarily or change the plan                                                |
| Returns for another session                                     | Sees the real camp, inventory, learned methods and earlier consequences                                                                | Nothing automatically refills or resets; exhaustion is an honest finite-world outcome             | Choose a second destination, useful invention, a different camp layout or an independently willing partner                            |

These rows are test situations and possible choices. They must never be implemented as a required player sequence, scripted NPC exchange, forced cast result or scheduled raid.

## Decisions and tradeoffs

1. **A concise material palette precedes a full industrial tree.** Reeds, branches, straight poles, stone, flint, loose/recovered bone and existing foods provide the required functions. This makes costs legible and the first camp attainable. It postpones clay firing, metallurgy, complex adhesives, biological detail and item decay without presenting them as implemented.
2. **Known elementary competence is generous.** Basic manufacture is available from arrival, with no repeated generation cost or obscured prerequisite hunt. Exploration still teaches the separate field sling and gives physical rewards; personal invention still uses the real supported family path. This favors experimentation over early recipe withholding.
3. **Manufactured construction parts use natural stock.** Branches cannot become 2.4-metre posts by renaming them. Exact pole inputs produce exact supported pieces, with limited real offcuts. A narrow trusted transformation handles the arithmetic; no universal crafting language or physics solver is required.
4. **First survival is reliable; later choices can fail.** Familiar berries require no chance roll. Fishing, hunting, invention and cooperation retain their own uncertainty. Reliability supplies room to choose risk instead of making the introductory meal a random failure condition.
5. **Finite work and finite resources stay visible.** Player-selected repeated batches reduce click repetition; they do not create an unattended survival bot. The selected stock budget must be qualified for the first-playable workload and some recovery; it is not yet measured and does not claim indefinite ecological renewal. The manifest must count retained woodland patches as well as the new table.
6. **Recovery changes a body, not the world's history.** Existing corpse loss and scars remain. Preexisting public hearths address death before camp construction; a fully unavailable return offers the [existing authorized creation path](first-playable-world-tech-design.md#explicit-fresh-world-recovery) only when an empty destination is prepared, and host assistance otherwise. The original run remains intact. Neither death nor reopening creates replacement resources or creation powers.
7. **Usefulness is required; fun is tested.** Material arithmetic can show that a tool saves work. It cannot prove that the full interaction is interesting after approaching, reading, issuing commands and waiting. Player evidence remains a delivery gate.

## Research basis and limits

- [Gameplay priorities](../repertoires/gameplay-priorities.md#whole-game-build-order) requires a connected survival, home, adventure, invention and independent-character loop. The design avoids promoting sharpening, bedding or administrative reports into prerequisites.
- [Work and crafting repertoire](../repertoires/work-crafting.md#make-do-beautifully) favors useful substitutions and later use; its kitchens and carpentry coverage inform the small connected material chain. The repertoire is possibility coverage, not proof that every trade must ship.
- [Preparation, risk and home research](../../archive/02-research/game-inspiration/mechanics/valheim-zomboid-preparation-risk-and-home.md) and the [Valheim dossier](../../archive/02-research/game-inspiration/dossiers/valheim.md) motivate a useful return home and preparation with a payoff, while retaining the risk that upkeep becomes a chore. OpenLegend does not inherit raid timers, enemy tiers, food buffs or a skill-loss ladder from those examples.
- The [survival](../../archive/02-research/game-inspiration/synthesis/survival-and-needs.md) and [crafting](../../archive/02-research/game-inspiration/synthesis/crafting-and-invention.md) synthesis files are explicitly **unassessed shells** at this revision. Their questions help identify needed comparisons; they are not cited as completed cross-game findings or a new ND registration.
- [Commercial research principles](../../archive/02-research/indie-launch-commercials/learnings.md#3-a-demo-should-test-the-paid-promise-not-merely-generate-a-flattering-metric) require the playable sample to demonstrate the defining promise and distinguish understanding, repeated enjoyment and actual demand. This design preserves actual useful invention and independent choice rather than qualifying only menu arithmetic.
- Existing [expedition evidence](../verification/rewarding-expeditions.md#practical-value-of-the-second-trip) distinguishes mechanical benefit from uncoached enjoyment. Existing [river-meal evidence](../verification/river-meal.md) is retained for its own supplied-world conditions, not silently relabeled as an empty-handed start.

No external factual research or game/provider execution was performed for this design. Recorded research is design input with its existing qualifications.

## Acceptance and delivery stages

**Stage A — safe independent basics:** native materials/known methods, stocked first meal, noncircular cutting/fiber/fire chain, no provider or NPC dependency, real cancellation and same-format continuation.

**Stage B — connected camp and adventure:** natural structural products, complete construction integration, ordinary menu discovery and finite repeats, equipment/cooking/storage/reward journeys, resource budgets under real travel/control costs.

**Stage C — distinct alternatives and return:** independently admitted live invention, meaningful second use, actual cooperation and threat integration through their owners, loss before camp, depleted source alternatives and explicit unavailable-recovery restart.

**Stage D — offered experience qualification:** the actual ordinary player path at named desktop/narrow conditions, persistence/reconnect, complete-caller latency/work measurements, and uncoached participants choosing activities. Observe confusion, waiting, effort/payoff, actual intervals between deliberate meals during reading/building/conversation, a worthwhile stopping point and voluntary next activity. Compare the complete known versus invented route and a second meaningful use, not just two completed tool invocations. The complete game is not accepted merely because all scripted stages can be executed.

Stable detailed work and every unchecked exit remain in [SV](../maintainers/first-playable-survival.md); [FPV](../maintainers/first-playable-validation.md) owns combined first-playable acceptance. This document has no unresolved material design choice within its selected scope. Tuning is exact but provisional until measured; a failed qualification reopens the specific design, not a hidden automatic adjustment.

## Maintained records

- Implementation: [SV01–SV10](../maintainers/first-playable-survival.md), coordinated through [FPV](../maintainers/first-playable-validation.md).
- Limits and constraints: [First-playable survival inventory](../limits/first-playable-survival.md).
- Mechanism: [technical design](first-playable-survival-tech-design.md); selected content: [world profile](../worlds/base/first-playable-survival.md).
- Existing owners: [items](../worlds/base/items.md), [survival](../worlds/base/survival.md), [death](../worlds/base/player-death.md), [knowledge](../knowledge.md), [action experience](../action-experience.md), [invention](../invention-foundation.md), [construction](editable-shelters-feature-spec.md).
