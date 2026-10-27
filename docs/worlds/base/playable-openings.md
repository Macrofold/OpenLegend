# Playable starting worlds

| Status                                                  | Current progress                                                                                                                                                                                       | Last updated |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Implemented openings and required first-playable target | Main world and Solo testing ground exist. The complete survival-first camp, social and roaming-conflict experience is fully designed; runtime delivery and player qualification remain open under FPV. | 2026-10-17   |

This document owns the bundled openings and required first-playable scenario. [Gameplay priorities](../../repertoires/gameplay-priorities.md) owns selection; subsystem specifications own detailed mechanics. [FPV](../../maintainers/first-playable-validation.md) coordinates delivery and the [playtest plan](../../projects/first-playable-playtest-plan.md) selects observations of a named build.

The bundled `base:playable-opening` creation profile currently offers **Main world** and **Solo testing ground**. The application's explicit trusted composition selects its implementation; shared creation transport receives only the candidate's profile and world identity and invokes that profile's real validator. The profile owns supported identity slots, candidate fields, construction, editable fields, preview meaning and readiness. Account binding, exact human approval, target admission and atomic publication remain application responsibilities. It does not copy a running world, produce fictional historical work or create omitted people and then remove them.

## Complete selected design

**Design completed October 17, 2026.** The [integrated feature specification](../../projects/first-playable-world-feature-spec.md) and [technical design](../../projects/first-playable-world-tech-design.md) connect the exact [layout](first-playable-layout.md), [survival/recipes](first-playable-survival.md), [camp construction](editable-shelters.md), [people/cooperation](first-playable-people.md) and [roaming](first-playable-roaming.md). World content uses typed build-time YAML; reviewed native mechanics fill missing calculations, while choices and encounters remain unscripted. [FPW](../../maintainers/first-playable-world.md), SV, SH, CP and RW own implementation. The current supplied openings below remain the runtime baseline until those tasks land; design completion does not certify playability or fun.

## First-playable game target

**Begin empty-handed, survive through understandable resource use, build a defensible camp into a home, form chosen relationships, invent useful alternatives and encounter independent danger and opportunity.** Exploration, worthwhile opposition, useful rewards and attainable progression connect these activities into a survival-adventure worth continuing.

The supplied Main and Solo setups below are distinct from this required target. Deliver the main scenario through the shared main-world initializer and its authored sources, not a copied demonstration world. The [development save policy](../../../AGENTS.md#development-save-policy) governs existing progress and compatibility.

### Survival-first arrival

The ordinary player begins without a player-owned camp, carried food, tools, weapons, prepared building materials or a construction kit. Basic clothing, ordinary competence and discoverable familiar methods are allowed; creator powers are not a survival shortcut. Other people's stock and structures remain theirs.

The player can understand hunger, find accessible food and natural materials, and follow a complete **bare-hand bootstrap** from simple collection/preparation to tools and useful crafting. Separate collection from processing where their prerequisites differ. No tool may require its own later output; the first meal or usable fire cannot depend on guaranteed NPC rescue.

Starting condition and pacing must leave practical room for human reading, movement, experimentation and applicable model waits. Empty inventory is not a requirement to start near death. Check lost tools, depleted accessible inputs and a death before any player campfire exists. The player needs an understandable viable continuation under the selected loss/restart rules, not unexplained replacement stock, immunity or a new global pause policy.

Food and shelter motivate choices without burying adventure behind routine sharpening, bedding or reports. When thirst is enabled, collection/carrying/drinking must be available; this target does not independently introduce thirst or punitive weather.

Camp-site choices should have readable tradeoffs in food/material/water access, routes, visibility, approaches and proximity to people. Provide more than one viable choice, without a compulsory marked plot or fixed build order.

### Natural resources and known crafting

Select a complementary **usable material foundation**. Each resource needs a findable source, a workable collection/preparation route, meaningful properties, permitted uses and readable limits. The palette below guides selection; exact entries, quantities, work and costs belong in the material/action/world owners.

| Functional foundation   | Resources to consider                                                                          | Useful applications                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Workable wood           | Fallen branches, deadwood, poles/logs, split stakes and bark                                   | Fuel, handles, frames, walls, gates and containers; loose collection precedes tool-dependent cutting             |
| Differentiated stone    | Loose stones, sharp/knappable stone such as flint, building and abrasive stone                 | Cutting, hammering, hearths, tools and supported or weighted constructions                                       |
| Flexible plant material | Grass, reeds, vines and bast/other fibers                                                      | Binding, cordage, baskets, mats, screens and thatch                                                              |
| Earth and binders       | Diggable soil, clay, resin or another selected natural binder                                  | Ground preparation, packing, sealing and supported composites; firing is not required for the first meal or camp |
| Food and fresh water    | Recognizable edible plants/berries/roots, fish, small game, larger quarry and accessible water | A viable first meal and useful later forage, fishing, preparation and cooperative hunting                        |
| Animal-derived material | Hide, bone, sinew and fat from actual remains                                                  | Covering, binding, tools and selected cooking/fuel uses                                                          |
| Processing products     | Prepared fiber, cord, split timber, worked stone and charcoal where selected                   | Short comprehensible chains and functional substitutions                                                         |

The selected subset must support survival, the camp and useful invention. Every illustrative ingredient, industrial metallurgy, a complete regenerating ecology and general chemistry are not prerequisites. Actual location and finite stock should support worthwhile trips and encounter opportunities without making the ordinary opening accidentally impossible.

Provide a discoverable known-crafting catalogue for elementary cutting/striking tools, bindings, a simple weapon and defense, carrying/storage, fire/cooking, shelter/cover, wall/fence sections and a usable entrance. Include meaningful material/layout alternatives. Known recipes must be inspectable without secret prompts or model invention for every ordinary craft.

Keep **using a known recipe**, **learning a method**, **inventing a method**, and **making the result** distinct. A successful playthrough can use supplied methods. Qualification must also establish a genuinely new supported alternative through normal admission, material acquisition, manufacture/use and later reuse. It must solve a worthwhile problem, not merely receive a name or repeat a canned recipe. [Knowledge](../../knowledge.md) and invention/material/action owners define those contracts.

### A camp the player can defend and call home

The player gathers and prepares materials, selects a site, builds, changes the layout and returns. Required functions are food preparation, shelter/rest, storage, basic making, appropriate light and barriers with an ordinary usable entrance. Functions may share objects; each recipe does not require its own workstation.

**Walls are real construction.** Occupied space, openings, collision, sight/cover and enemy approaches must agree. Solid walls cannot permit walking or shooting through them merely because they are player-built. Entry/exit and placement must remain usable, without trapping the builder or duplicating materials. Defensive value comes from supported geometry, equipment, observation, terrain and willing help, not an unexplained safe-zone label.

The construction design must settle actual materials/work, permissions, placement/reach, partial work, alteration/reclaim, relevant blocked approaches, supported damage/breach and recovery. Open canopies/lean-tos are reusable foundations, not wall/door qualification. No general structural solver or universal right to destroy other people's structures is implied; human access protections retain their own owner.

Defense need not force a fight. Negotiation, trading, leaving or relocation can be reasonable choices. Organization, layout and attainable improvements should make the camp useful and recognizably the player's, without a home-affection score, decoration obligation or building-level ladder. Supported continuation preserves the actual site, stock, modifications and consequences.

### Four or five differentiated non-hostile characters

Provide **four or five individually authored, initially non-hostile characters** the player can meet and develop relationships with. This is scenario breadth, not a universal population cap or a guarantee that they all survive, agree or live at camp.

Ada, the Peacock Mercenary, Mara Reed and Tavin Vale are existing Main-world candidates. Reuse suitable identities and authored material; a fifth is optional rather than filler. For each, define recognizable immediate aims, longer interests, temperament, manner, values, risk tolerance, knowledge, skills, resources and boundaries.

Differences must affect visible choices: exploring, seeking security, making, hunting, helping, responding to danger or refusing. Different players should have credible reasons to prefer different people. Initially non-hostile does not mean permanently loyal, generous or invulnerable.

People act outside player conversations, know only what they perceived or learned, and respond to meaningful shared activity and remembered events. Authored motives and native perception/movement are legitimate foundations; they do not require a model call for each step. Character decisions and any claimed live-AI behavior must still occur through their actual supported runtime, not a forced demonstration. A full personality-transformation system or global affinity meter is unnecessary.

### Things to do together

| Activity                     | Required player-visible result                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Alliances and mutual help    | A mutually accepted small arrangement with specific participants/purpose that can be declined, ended or reconsidered                     |
| Collaborative hunting        | Voluntary company, real travel and pursuit of actual quarry, useful independent contributions and actual food/material custody afterward |
| Guidance and ideas           | Knowledge-grounded advice about resources, methods, danger or approaches that can lead to a supported action                             |
| Sharing                      | Actual resources or useful work with clear permission, quantities, custody and withdrawal                                                |
| Trade                        | Proposed/revised mutually beneficial exchange; acceptance transfers agreed goods once and rejection changes no ownership                 |
| Camp and exploration company | Meaningful chosen activity with independent participation, departure and later responses to what happened                                |

Agreement is not remote control. Knowledge is needed for teaching, resources for making and consent for help. Reuse barter, outings and combat-help owners. Scope missing alliance/hunt behavior without requiring pooled ownership, permanent access, formal institutions or a new economy. Agree actual sharing/proceeds terms before claiming that hunting automatically divides loot.

### Wildlife, darkness and predators

Include prey/resource animals and aggressive-animal danger. **Night-roaming wolves, including possible group encirclement of a lone traveler, are the working predator example.** The stag is useful existing content but does not qualify roaming predators or packs. The [selected roaming profile](first-playable-roaming.md) now pins species, numbers, sensing, pursuit/group behavior and tuning; this is not a claim about real wolf biology.

Animals have real locations, perception and behavior. Darkness follows selected sight/hearing/light rules rather than granting hidden player coordinates. Sounds, tracks or silhouettes reveal only actually supported information. A pack cannot teleport around someone because they crossed a timer.

Useful responses include retreat, another route, appropriate light, terrain/barriers, combat and willing help. Fire deterrence or guaranteed shelter safety must not be claimed without an installed rule. Qualify solo/accompanied travel, actual defensive value, unfavorable outcomes and escape/recovery. Night length, pack size, damage and pursuit limits belong in the owning tuning inventory.

### Distant hostile people and unscripted camp contact

Hostiles begin elsewhere, leaving room for initial survival and orientation. Their place can be discovered through exploration; the Watchpost/residents are existing candidates rather than mandatory distance or equipment choices.

Ordinary purposes—resources, hunting, exploration and supplies—must support real travel through shared destinations and corridors. Actors discover a player-created camp through perception or learned information. Author destinations and opportunities, not guaranteed outcomes: a hidden camp marker, elapsed-day raid order, wave spawn, teleport or omniscient tracking is not independent discovery.

**Camp contact is an intended reachable recurring opportunity, not a fixed-day raid.** Establish actual autonomous travel/discovery and separately evaluate whether ordinary play exposes interesting opportunities at worthwhile pacing. Mere theoretical reachability after indefinite waiting is insufficient. Death of rivals, relocation, agreements, changed stock, lost routes or deliberate avoidance can legitimately prevent or alter contact.

The player can attempt fight, including lethal combat under selected rules; de-escalation; trade or mutual benefit; and escape. Opponents respond to their actual knowledge and aims and may refuse. An agreement must affect subsequent conduct rather than produce friendly dialogue while attacks continue unchanged. Defenses, known tools, inventions and chosen relationships should offer practical alternatives; no guaranteed persuasion, mandatory kill or automatic revenge wave is selected.

### Full-experience acceptance and scope

Account for the connected ordinary-player experience: empty-handed food/material access, useful familiar crafting, player-built defensible camp, differentiated cast and cooperation, animal and distant-human danger, worthwhile exploration, rewards/progression and another activity where the result matters. Qualification includes real useful invention and an independent, observation-grounded character consequence without requiring every player to choose every route.

Observe understanding, effort/payoff, responsiveness, stopping reasons and optional return as well as correctness. A working save or completed routine alone does not establish an interesting second session. Failure must be understandable and allow continuation under the selected rules, including before a camp exists.

Use [FPV's owner map](../../maintainers/first-playable-validation.md#required-capability-and-owner-map) and the [playtest plan](../../projects/first-playable-playtest-plan.md) to distinguish setup, technical behavior, independent decisions, human enjoyment and operating cost. Partial tests are useful; supplied kits, prebuilt camps or isolated demonstrations cannot close the whole target. Large societies, universal physics, automatic ecology, extensive metallurgy, a marketplace, unsolicited PvP and unlimited unattended simulation are not prerequisites.

## Main world

Main and ordinary `wilderness` startup share the complete authored initializer.
Mike arrives at day 1 08:00 with full Food/Energy/Health and no usable carried
stock or player-owned camp. The 128 × 112 metre world preserves Ada, the Peacock
Mercenary, Mara Reed, Tavin Vale, fishing, sling practice, the lookout/workshop,
the territorial stag and the missing-belonging investigation. Natural food,
materials, elementary methods, public cold hearths, camp construction and finite
cooperation use their ordinary native owners. See the [exact selected layout](first-playable-layout.md).

Kest and Orin begin at the relocated Broken Watchpost near `(104,28)`, beyond
ordinary initial sight. Its walls, openings, cache and written directions move
together. The former player kit exists once as exposed repair stock declared as
Kest's possessions; his title supplies neither permission nor a forced reaction.
The original wolves/bears are relocated once and use the same native controller
for routine, feeding and danger. Camp contacts require real travel and perception.

The compact main candidate retains exact prospective world/player/resident identities, seed and authored title/premise. Its scenario contents come from the shared initializer rather than a second world snapshot or editable list of copied fixtures. Main-template editing changes its title/premise; **Describe a world** still begins with the supported editable small-opening model. Real native approach/material/action checks qualify initial activities, not every future encounter, autonomous decision or population cost.

## Solo testing ground

The supplied solo opening creates one controlled person with tools, a fire, finite nearby fiber/wood/stone/berries and known fiber-cleaning, cord-twisting and pouch methods. It creates no resident, hunting animal, rival, investigation or expedition. Gather and prepare fibers, then make the pouch; the limited starting prepared fiber keeps this useful testing sequence available.

The authored riverside work area is reserved before random rock/tree/shrub placement, so a selected landscape seed cannot put a rock under the starting person. Other generated terrain and ordinary support/body-clearance checks remain active. New bundled worlds share this small clearing; compatible saved terrain is not regenerated.

Direct development startup uses `OPEN_LEGEND_WORLD_PRESET=solo` with its own PostgreSQL database and save directory. Ordinary startup defaults to `wilderness`. A preset only constructs an empty world; reopening compatible progress does not reseed it. The charge and touch-only presets remain separate diagnostic world-law variations, not extra primary starting choices and not overlays that disable wilderness combat or replace everyone's body rules.

## Selected activities

The custom inhabited camp offers fibers, wood, stone, berries, a lit fire and a hare. The person arrives with basic tools and finite crafting materials and can request a supported new hunting tool through ordinary invention, obtain its inputs, make it and pursue food. The resident has authored character identity and ordinary independent cognition; their helpfulness, agreement or reward is never scripted. Knowing a woven gathering-container method supplies a dependable alternative making activity.

The solitary opening places the person and supplies farther along the same supported landscape, without a resident or hunting animal. The person knows the same container method but starts with too little prepared fiber to craft it immediately. Gathering and preparing actual fibers enables making a reusable pouch. Solitude changes the initial construction rather than requiring character-removal machinery.

The native prepared openings have no model cost. In custom/solo candidates, names, descriptions, personality, backstory, trait descriptions, explicitly authored scenario intentions, supported placements, finite resources, possessions and learned-method selections may be revised. A deliberately harsh proposal may retain scarcity or lower starting fullness. Merely labeling a proposal harsh never provides materials, grants permission or establishes readiness. Preview notices come from the profile's check of actual accessible starting food: an opening with ample food is not described as scarce; incomplete access remains unestablished.

## Fresh construction

[`createFreshBaseWorld`](../../../packages/domain/src/worlds/base/world.ts) installs existing bundled definitions, policies and the supported landscape in otherwise empty current-format state. Ordinary `createWorld` remains a caller and retains its existing cast, supplies, wilderness, threats and expeditions. The custom/solo builder adds only its selected people, scene elements and stock through the existing actor, placement, item and recipe owners. It supplies no canopy construction grant. The main builder reuses the ordinary initializer and returns its exact natural-source/site permission for the actual starting player; destination authority publishes that permission with the fresh world. Construction controls use an exact selected family and a suggested place on the current opening's actual supported terrain. The optional finite shower covers that opening's configured building place rather than the original camp's coordinates.

Custom/solo openings and the ordinary camp read fixed gathering durations from the same [world-owned resource setup](../../../packages/domain/src/worlds/base/resources.ts). Spawned patches and outer-wilderness resources use that setup too. Each selected resource patch retains its own quantity, placement and installed duration; this shared starter setup does not make its timings universal engine law. [Everyday work pacing](time.md#everyday-work-durations) owns the current values and the fresh-world requirement caused by changing the shared cordage family. Installed patch costs are never silently rewritten.

The application allocates the prospective world, actor, scene and stock identities before retaining a candidate. Revisions preserve unchanged identities; labels are not references. A stock lot uses its supplied exact identity instead of merging into an unrelated possession. The retained candidate contains the exact seed, RNG state, traits and selected values. Reconstruction does not reroll an opening or sample a new personality.

An authored identity may already match a later native entity number. Initial person/scene admission and explicit lot creation reserve canonical native-looking numbers in the world's existing saved sequence; IDs and RNG remain unchanged. This deliberately advances the counter past those numbers, protecting a consumed object even after its records leave active memory. Ordinary item, pile, assembly, corpse and spawned-person/animal creation additionally checks the actual entity dictionary when selecting its next key. It preserves the authored object rather than overwriting it or refusing ordinary later play. Unrelated event, memory and work identities retain their own meaning; no retained-history scan, tombstone registry or global ID restriction is introduced.

Account ownership is a trusted input supplied separately by the destination policy. The builder returns the prepared world, creator/player role bindings and explicit setup-grant seeds. It publishes nothing, contacts no database and supplies no control lease. Authenticated ordinary entry remains necessary.

Recipe installation, initial learning and physical endowment are separate operations. The supported custom initial methods are fiber cleaning, cord twisting, the woven gathering container, river line and wooden shield, installed through their ordinary trusted compilers. Default solo and inhabited openings explicitly grant cleaning, twisting and the container method to their selected people. Custom rows remain exact, including an empty selection, within the existing six-entry knowledge bound. The source of initial learning is authored setup, with no actor invention credit. Backstory remains authored personal history; current location and possessions remain actual world state, and an explicitly seeded intention retains the ordinary creator attribution.

## Validation and readiness

The candidate validator rejects unsupported profiles or scene kinds, unknown fields, duplicate or unsafe identities, absent stock/learning recipients, incompatible native definition pins, invalid quantities and unbounded authored text. Construction validates actual support and body clearance and then uses current domain validation. Initial cognition, perception and body conditions are prepared before publication; these are actual initial observations, not imported events or invented earlier experiences.

The profile's readiness checker establishes standing and approach through actual native geometry, ordinary gather eligibility at a proven reachable stance, learned-method admission, carried supplies and the inherited finite fiber/cord preparation rules. Inhabited checks additionally establish its installed human invention family/policy, compatible ammunition, a current approach toward supported quarry and reachable cooking heat. Starting food must be carried or reachable; deliberate harshness can preserve food scarcity, never waive manufacturing inputs or required activity routes.

A structurally valid world cannot prove that a route finishes, an invention will be admitted or a hunt will hit. A pending route remains incomplete until the existing isolated navigation worker supplies a complete physically checked result for that exact prepared opening. Worker failure, unavailable preparation or an exhausted search remains incomplete rather than evidence of no route. Preview and preparation change none of the eventual people's positions, knowledge, time, RNG or experience. The initial direct and deferred checks use the same geometry/native action owners; they do not introduce a different movement path.

The custom/solo candidate admits at most two people, 24 selected scene elements, 32 possession lots, six learning selections, eight traits and eight explicitly seeded intentions per person. Names contain at most 120 Unicode characters; each authored prose field at most 4,000. A resource patch holds at most 10,000 finite units, a possession lot at most 512 units, and a fire at most seven days of finite fuel. These preparation envelopes bound the current small-opening consumer and are not universal fictional laws or measured hosted capacity. [World-creation limits](../../limits/world-creation.md) owns their qualification and expansion decisions. The four-or-five-person first-playable target concerns the main scenario, not permission to bypass these separate custom/solo bounds.

Creation preparation occurs after explicit selection/edit/check/start. It performs no simulation-tick creation work and reads no source-world history. Definitions and the prepared world are shared across the opening's rows and checks; learning compiles each distinct selected method once. Complete source/destination/browser/first-play qualification belongs to [Batch 07](../../maintainers/parallel-batch-07-playable-world-creation.md), not a native builder pass.

## Maintained records

- [FPV coordination and owner map](../../maintainers/first-playable-validation.md) — required target delivery and actual acceptance.
- [First-playable playtest plan](../../projects/first-playable-playtest-plan.md) — test preparation and evidence requirements.
- [OC06 delivery and remaining parent acceptance](../../maintainers/parallel-batch-07-playable-world-creation.md#oc01--construct-the-selected-fresh-opening) — existing opening implementation.
- [Creation limits](../../limits/world-creation.md) — fixed Main template and editable small-opening bounds. New camp/material/conflict tuning belongs with its selected subsystem design and inventory.
- [Main/solo evidence](../../verification/playable-world-creation.md#october-14-main-world-and-solo-testing-ground) and [shared construction design](../../projects/parallel-batch-07-playable-world-creation-tech-design.md#main-world-and-solo-testing-ground--october-14-implementation).
