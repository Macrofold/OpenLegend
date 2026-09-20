# Primitive starting society and built-in survival

Status: the **starting direction and consequential NPC survival are user-stated** in [U02](../00-source/design-followups.md). The concrete population, inventory, species, rates and feature list below are proposals. No mechanics are implemented.

## Starting premise

Begin with a small group of people in a resource-rich wilderness, before a village exists. They already speak, possess useful things, know some ways to survive, and can cooperate or disagree. A settlement, shared routines, technologies and institutions can develop through their actions; none is a guaranteed outcome.

“Primitive” describes the starting material resources and technology level. It does not imply low intelligence, a lack of language, or blank personalities. A fictional setting avoids claiming that one simple starter roster represents the histories or practices of real societies.

Proposed seed: 6–12 adults near a water source, patches of edible plants, deadwood, suitable fiber plants, loose stone, and natural protection from weather. They have a few cutting tools, containers, clothing or wraps, some cordage and small amounts of food. Exact materials and quantities remain open. Some know one another; others may have only recently joined. Membership, leadership and property norms need not be formalized.

No houses, established shops, roads, currency economy or functioning town are required at spawn. A few possessions and known techniques make survival possible without requiring a model to invent every basic action on the first day. If fire is important to the chosen climate, seed an appropriate usable fire-making capability and tool or an existing ember source; do not create an unwinnable dependency on an unsupported invention.

## What “fiber” means

Fiber is a material category: strands that can be used in bindings, cordage, mats and other constructions. A concrete resource might be a suitable grass leaf, bark strip, or fiber extracted from a particular plant. Ordinary grass is not automatically strong rope. The National Park Service describes some grasses being used for cordage and notes that many grasses in the described region lack strong fibers. [NPS: grasses and cordage](https://www.nps.gov/nepe/learn/nature/grasses.htm)

NPS also documents yucca fibers used for string and rope, and bark as a fiber source. These illustrate possible material families, not a recommendation to combine plants from unrelated biomes in one starter map. [NPS: yucca uses](https://www.nps.gov/pisp/planyourvisit/lifeways-environment.htm), [NPS: Osage-orange bark](https://home.nps.gov/articles/osage-apple-orange.htm)

Use specific names in the game—“long grass,” “bark strips,” “plant fibers,” “rough cord”—and an internal `fiber_source` or `binding_material` category for compatible recipes. Distinguish the raw plant from prepared fiber and finished cord. They differ in required work, strength, flexibility, moisture, length, and durability. Begin with a few readable game grades rather than real-world textile engineering.

A prototype might support weak temporary ties, stronger prepared cord, and flexible weaving material. Recipes state the properties they need; an unfamiliar material can be evaluated for compatibility without treating every leaf as equivalent. Existing cord remains useful while agents discover new sources or constructions.

## Survival can fail

NPCs can become hungry, exhausted, exposed, injured, sick, incapacitated, and dead. Do not silently refill their needs or resurrect them to protect the story. Accessible resources create opportunity; they do not guarantee that everyone finds, secures, shares or uses them well.

Distinguish causal failure from defective machinery. An agent dying because it ignored a worsening injury is a possible simulation story. An agent dying because pathfinding never reaches an adjacent visible food item, a model queue blocks the known eat action, or a time-step bug skips recovery is an engineering failure to identify and fix. The criterion is a legible causal chain and reliable mechanics, not a target of zero deaths.

Death should terminate future actions, release reservations, transfer or leave possessions under an explicit rule, create a body/remains state, and emit appropriately perceived events. Friends and witnesses may form memories, grief or practical plans. Other actors do not magically inherit everything the deceased knew. Revival for human players remains a separate requested feature.

Initially record birth time/age and use the world clock consistently. Long-term frailty, lifespan tuning and reproduction require further design; accelerated time should not be implemented merely as changing the sky color. [Time and simulation speed](time-and-simulation-speed.md)

## Native survival package

The original named basics are gathering, eating and resting. M10/M11 now require native support for generated tools, hunting, finite harvesting and preparing/eating animal food within the [first playable MVP](../05-project/first-playable-mvp.md). The following package supplies those foundations; extra environmental/medical detail remains proposed where not required by that story. RimWorld is a useful reference for coupled needs, wounds and environmental consequences, but Open Legend's exact rules are its own. [Official RimWorld overview](https://rimworldgame.com/)

| System | Built-in first behavior | Dependency / scope control |
|---|---|---|
| Find and reach resources | Perceive nearby resources, choose a known reachable destination, move and recheck | Actors use observations and remembered locations; no omniscient food access |
| Gather and carry | Harvest a permitted amount, spend work, hold or store it, respect capacity | Gathering consumes finite stock; harvesting schedules regrowth where appropriate |
| Eat and hunger | Choose known edible food, consume once, restore nutrition, apply worsening deprivation if unmet | Basic eating requires no fresh LLM decision; unsafe/unknown foods can be distinct |
| Rest and sleep | Rest in place or seek a better location; replenish energy over time; allow interruption | Sleep is a process, not an instant refill; exhaustion changes abilities |
| Water and hydration | Proposed for the first wilderness slice: drink from an accessible source; carry water if equipped | This is an Open Legend proposal, not a claim about base RimWorld; omit detailed contamination initially |
| Exposure and shelter | Weather/time bands affect comfort and physical risk; natural cover and simple shelters reduce exposure | Start with logical coverage, not physical cloth or structural engineering |
| Work and crafting | Timed gather/prepare/assemble tasks with tool/material requirements and interruptible progress; AI composes new usable recipes from trusted families | Same simulation clock as hunger; live generation in first playable, no repeated LLM call per work tick |
| Basic fire and cooking | Dependable preparation for the chosen food; known heat source/cooking if meat requires it; simple fuel/extinguishing rules where used | Required dependencies are supplied in P1; arbitrary burning/spread extend the basic family later |
| Simple shelter/bindings | A known small shelter plan assembling editable supports/roofing and any needed walls; basic binding/carrying using approved material families | Seed dependable parts and coverage rules; later additions/replacements extend the same assembly; ordinary survival does not depend on code generation |
| Injuries and care | Small body-part graph, wounds, impairment, bounded recovery, simple assistance | Detailed surgery, organs, epidemic modeling and medicine catalog wait |
| Food state | Simple freshness/spoilage process; visible or learned signs of poor food | No elaborate microbiology; advanced preservation can arrive later |
| Equipment and hunting | Equip compatible tools/ammunition, launch through a shared simple ranged family, resolve hits/misses and animal flee/damage/death | Supports generated sling and later bow/arrow candidate; no detailed ballistics or LLM per animal |
| Harvest animal remains | Convert finite available yields to meat/bone or other supported materials through timed work | No repeated extraction of the same yield; simple quantities, not detailed anatomy |
| Death and aftermath | Explicit irreversible NPC state transition, belongings/remains, local observations | Player recovery rules distinct; no secret NPC respawn |

Build gather → carry → eat → rest → work as an internal checkpoint, then complete the first playable with live AI conversation/planning, generated sling crafting, hunting, harvesting and preparing/eating food. A modest climate and edible plants let known survival actions remain useful while invention is evaluated. Traps, farming, seasons, complex diseases and detailed physics can follow; hunting itself is now P1 scope. Add exposure/fire/shelter only to the depth needed by the selected scenario.

The [modular construction direction](evolving-materials-and-construction.md) applies from the first construction feature, even when the initial shelter plan has few parts. The [heat/fire proposal](heat-and-fire.md) preserves a small no-spread campfire milestone while specifying later source-dependent ignition and growing local spread. Seeding the initial rules is separate from extending missing material properties through play.

## Seeded knowledge and autonomous work

Agents begin knowing a few local edible resources, basic resting/gathering procedures and one or two practical techniques. Distribute competence: one recognizes useful plants, another makes bindings, another understands shelter or basic injury care. Some can teach. They can still make mistakes, misjudge risk, compete, break promises or fail to plan ahead.

Separate engine capability, a character's procedural knowledge, current perception and physical ability. A globally registered cook action does not mean every character knows the recipe, owns a pot or can see a fire. Seed a limited realistic memory of the starting locality if desired; do not reveal the whole map.

Live LLM decisions and conversation are required in the first playable. Use a simple utility/work scheduler to execute and interrupt their plans, with urgency, prerequisites, reachability, effort, capabilities, reservations and commitment persistence. For example, hunger can interrupt a low-priority craft, but a trivial fluctuation should not cause endless switching between sleep and gathering. Known emergency responses remain available during model failure. Social ambiguity, invention and longer-term planning still admit semantic thought under budgets.

Baseline skills and instincts do not guarantee optimization. The system should support meaningful variation in prudence, knowledge and cooperation while preserving the ability to perform known actions reliably. Keep a creator-visible cause trace to distinguish poor choices from software defects.

## Where generation now begins

Survival fundamentals are prebuilt mechanisms in the same registry and interaction protocol as later inventions. They do not need a separate incompatible action system. Free text can semantically map to one of these known mechanisms; once selected and applicable, it executes mechanically.

Generation extends useful possibilities: a carrying harness from existing cord and flexible material; a new rack arrangement to keep food off damp ground; a trap variant; a better shelter layout; a recipe adapted to an unfamiliar suitable plant. Select effects that the current primitives actually support. For example, a drying rack cannot preserve food unless drying/spoilage relationships exist or are admitted as a new bounded definition.

Do not hold basic ignition hostage to the first player asking for fire if the survival scenario assumes warmth/cooking. Conversely, an arbitrary tree species or rainy context may require semantic assessment or a new guarded mechanism family. Existing baseline rules and novel compositions must agree on resource units, work, time, ownership and effect limits.

## First-session candidate

The first personal session starts with one live conversational resident, useful possessions/knowledge and reachable resources. The player explores, talks and helps gather, then requests a sling. AI generates a supported usable recipe; the player crafts it, hunts, harvests and prepares/eats the animal. Another invention, with bow-and-arrow as the candidate, exercises shared families. Memory, needs, work and world time change together. Later group sessions add cooperation, disagreement and more residents.

This is an observation scenario, not a compulsory quest or an authored guarantee of cooperation. The creator can speed up, slow down or pause to examine the society. The initial personal world pauses and stops autonomous AI scheduling when the player is away. The first generation experiment should improve a functioning survival loop rather than supply its missing essentials.

## Acceptance scenarios

These native failure checks complement the [required live-AI creative-loop acceptance](../05-project/first-playable-mvp.md#evidence-required-for-a-first-playable-claim); passing without a model does not fulfill the playable product.

- A competent agent with visible reachable food and sufficient time can gather, eat and rest without a language-model dependency at every step.
- Poor choices or depleted resources can result in death; the committed cause and relevant observations can be reconstructed.
- Acceleration changes work and needs together; changing speed does not duplicate harvests or skip a lethal threshold.
- Two actors cannot acquire the same last item, even when both plans began from the same observation.
- Fire, shelter and food processes continue correctly during model latency or outage.
- Knowledge differs between actors without giving a model an override for missing resources or abilities.
- Learned inventions persist; an NPC's death does not erase the engine's mechanism registry or grant all survivors its private knowledge.

The [roadmap](../05-project/roadmap.md) and [decisions](../05-project/open-decisions.md) now supersede the original assistant-proposed village and universally forgiving opening.
