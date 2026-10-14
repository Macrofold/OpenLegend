# G131 — Rust

**Status: expanded research dossier; operational and visual audit October 14, 2026.** [Roster](../research-roster.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md) · [48-asset visual atlas](rust-visual-atlas.md). Research only, not an approved OpenLegend design or a Rust playtest.

This is the current entry point. The **[September 27 full study](rust-2026-09-27.md)** is preserved byte-for-byte, including all twelve worked cases, five substantive independent reviews, source annotations and earlier audit history. Its statements of currentness describe September 27, not this refresh. The present file adds the operational detail missing from that study and qualifies changed rules rather than discarding the earlier evidence.

**Audit answer:** Rust had already received substantial research. It was not yet deep enough on the actual building/crafting/looting interaction sequences, modern crosshairs, loading, commercial evidence, or screenshot-based interface analysis. The old completion label also predates the expanded economics and conditional modding requirements. This pass addresses those gaps; remaining uncertainty is recorded in R14, not hidden behind a completion label.

## R01 — identity, scope, versions and player promise

This study concerns **PC Rust**, not Rust Console Edition or Rust Mobile. Facepunch's monthly development means that release date, platform, mode and server configuration belong beside a rule. The latest monthly PC release inspected here is **Livestock, October 1, 2026**. Cows and sheep are consequently no longer merely Q4 roadmap possibilities; dogs were not verified as released. The historical study retains the earlier September boundary. [Livestock](https://rust.facepunch.com/news/livestock/) · [October changelist](https://rust.facepunch.com/changelist/4046).

Rust's central promise is to build a temporary foothold in a shared, dangerous world. The meaningful progression unit is not simply the character. It is **the player plus knowledge, carried equipment, stored reserves, buildings, production, routes and relationships**, all within a server's current world. The initial rock-to-shelter journey and later organized conflict are different stages of that same material system. See the preserved [identity and mechanics study](rust-2026-09-27.md#r01--identity-scope-versions-and-player-promise).

### Four important corrections

| Impression | More accurate account | Why it matters |
| --- | --- | --- |
| Other players cannot destroy bases | Standard Rust includes destructive raiding. A Tool Cupboard grants building privilege and manages upkeep; it does not generally make walls immune. | Security is an architectural and economic problem, not a universal ownership shield. |
| Death deletes everything owned | Carried possessions become vulnerable loot. Separately stored possessions, structures and learned recipes do not all vanish merely because that character died. | A prepared recovery base can make a severe defeat recoverable. |
| Joining means everyone begins at zero together | Players share a server's wipe epoch, but can join at different times. Blueprint persistence, experience, teams and preparation differ. | A fresh map is not equal opportunity, and a late arrival is not matchmaking into an equal-level cohort. |
| Combat has no crosshair | PC Rust introduced a built-in crosshair in June 2022 and expanded customization in October 2025. Footage can reflect older versions, settings, weapons or modes. | Aiming skill and readable feedback are compatible; lack of an aiming aid is not a definition of skill. |

Sources: [Tool Cupboard](https://wiki.facepunch.com/rust/the_tool_cupboard), [The Combat Update](https://rust.facepunch.com/news/the-combat-update), [Meta Shift](https://rust.facepunch.com/news/meta-shift), and the preserved [loss/server account](rust-2026-09-27.md#r04--progression-economy-time-and-return-loops). Facepunch-hosted wiki pages are useful documentation but can contain historical/community-maintained material; dated release notes take precedence when they conflict.

<a id="rust-servers"></a>

### Server selection is selection of a social contract

A server runs a shared world independently of whether a particular player is connected. Its operator chooses a map/seed, population and other configuration, administers the community, and may install server-side modifications. The client joins that running world; it does not create a new campaign for every arrival. Server identity therefore matters to persistence. The server documentation distinguishes terrain/map files, saved entities and blueprint data rather than treating them as one save. [Server setup](https://wiki.facepunch.com/rust/creating-a-server) · [Getting started with a server](https://wiki.facepunch.com/rust/Getting-Started_w-Server).

**Official/community/modded are not three escalating difficulty settings.** They concern operator/category and modifications. Separately, a community may advertise solo/duo/trio limits, gathering multipliers, PvE, raid restrictions, shorter crafting, or kits. Some changes are ordinary configuration, others require plugins. Read the actual description/rules, not only the name. Population and ping are useful admission information, but neither proves fairness or competent moderation. [Browser tags](https://wiki.facepunch.com/rust/server-browser-tags) · [Atlas V26–V28 and V39–V40](rust-visual-atlas.md#d-contemporary-server-selection-and-mode-specific-protection).

| Boundary | Physical possessions/world | Learned or account state | Next decision |
| --- | --- | --- | --- |
| Character death | Carried items are at risk on corpse/remains; an individually dropped item can have its own fate. Stored goods and base remain unless separately attacked. | Learned recipes are not normally erased by this death. Account cosmetics are a separate entitlement system. | Recover the body, equip reserves, relocate, or abandon the recovery. |
| Logout | The persistent world continues; a sleeping body and base can remain exposed. | Logging out is not a blueprint wipe. | Choose where and with what to leave the character; understand offline exposure. |
| Map wipe | Built structures and physical accumulation in the reset world are removed. | Blueprint reset is a separate policy/event. | Choose whether to return for the new race. |
| Blueprint wipe | Knowledge is reset under the server's policy. It often accompanies a map wipe but is conceptually distinct. | Human knowledge, friends and account ownership are not erased. | Relearn production or obtain goods by other routes. |
| Join another independent server | Do not expect to carry the first server's base and stored inventory into it. | Do not assume server-local blueprint progress transfers. | Evaluate that world's age, rules and available allies. |

This is the standard conceptual model, not a guarantee for every plugin or connected-server experiment. Exact reclaim, persistence and transfer exceptions must be named. The original [wipe discussion](rust-2026-09-27.md#server-rules-are-part-of-the-product-boundary) explains why the first-Thursday monthly cycle, weekly resets and blueprint resets must not be conflated.

**Softcore and Hardcore are meaningful exceptions.** July 2026 Softcore introduced 2× gathering and a daily raid window, with protection tied to eligible TC-covered structures rather than universal protection for every deployable. August 2025's Hardcore redesign changed navigation, weapon acquisition and recovery: for example, firearms became found rather than ordinarily craftable/researchable in that mode. These are dated mode changes, not baseline vanilla rules or proof that every operator retained the release defaults. [Common Ground](https://rust.facepunch.com/news/common-ground) · [Harder Core](https://rust.facepunch.com/news/harder-core).

## R02 — complete player-action and major-mechanics inventory

The preserved [R02 inventory](rust-2026-09-27.md#r02--complete-player-action-and-major-mechanics-inventory) remains part of this dossier: embodied survival; gathering and monuments; land/air/sea vehicles; base construction; combat and practical stealth; electricity; water and industrial routing; farming/genetics; fishing; casino activities; trade and housing; clans; public infrastructure. The following sections explain how the highest-value systems actually fit into play.

<a id="rust-building"></a>

### Building: from an exposed inventory to a usable home

**1. Choose a location before optimizing a blueprint.** A base trades access to resources, roads, monuments and water against exposure, terrain, available building space and neighbors. A rich route is also a route other players have reason to use. Location can shorten every future journey or make every return an ambush. This is a rules-based analysis of the geography and security systems, not a measured ranking of base locations.

**2. Separate structural construction from deployable placement.** The Building Plan selects structural shapes; the hammer operates on placed pieces. Structural blocks begin as twig and can be upgraded through wood, stone, sheet metal and armored grades. Furnaces, storage, beds and other deployables are separate objects fitted into the resulting space. A stronger wall does not automatically upgrade a door, lock or machine inside it. [Building Plan](https://wiki.facepunch.com/rust/item/building.planner) · [Hammer](https://wiki.facepunch.com/rust/item/hammer).

**3. Build with a constrained geometric vocabulary.** Foundations, triangles, floors, walls, frames and roofs connect through a modular placement system. Shape selection, orientation, support and clearance constrain what can be placed. A preview helps distinguish an intended placement from a committed object, but a blocked preview alone is not necessarily an adequate explanation of *why* the placement failed. The historical [building terminology guide](https://wiki.facepunch.com/rust/Building-terminology) and [atlas construction examples](rust-visual-atlas.md#a-building-privilege-upkeep-and-spatial-reasoning) establish the spatial grammar; a complete current preview/confirmation sequence remains a visual gap.

**4. Finish the security boundary, not just the outline.** Close the shell, install an appropriate door and lock, establish building authorization, and fund upkeep. A visibly enclosed room can still have an open roof, vulnerable entrance, badly oriented component or unfunded upkeep. Key locks and code locks solve access sharing differently: a physical key is itself a transferable risk, while a code lock accepts a four-digit credential. Neither stops an attacker destroying the protected door. [Key Lock](https://wiki.facepunch.com/rust/item/lock.key) · [Code Lock](https://wiki.facepunch.com/rust/item/lock.code).

**5. Put recovery and daily use inside the plan.** A sleeping bag/bed, storage, a route through doors, working space and room to expand are functional requirements, not merely decoration. A base that is difficult for its occupants to enter, unload or defend can be strategically poor despite looking strong. Building, inventory, recovery and production are therefore one repeated workflow.

### The six systems people often mistake for one protection rule

| System | What it actually answers | What it does not promise |
| --- | --- | --- |
| Building privilege | Who may perform ordinary construction within the relevant privilege area? | Immunity to incoming damage, or an absolute ban on every attacker-placed object. |
| Locks/access | Who can use a secured entrance or container? | Indestructibility; safety from someone who obtained access. |
| Structural stability | Does this connected arrangement remain supported? | A physics simulation of every real engineering detail. |
| Material grade/orientation | How resistant is the piece to an applicable attack? | That all approaches or neighboring pieces have the same resistance. |
| Upkeep/decay | Is the relevant built property maintained over time? | A promise that nobody can raid during the funded period. |
| Server/mode protection | Is this damage or interaction allowed under this world's rules? | A universal Rust rule applicable to all servers. |

These distinctions follow the documented systems and are an analytical decomposition, not six separate menu tabs. The critical UX question is whether a beginner can tell *which* rule caused a refusal or loss. “Building privileged” and “protected for” can otherwise be misread as stronger safety promises than they are. See [TC documentation](https://wiki.facepunch.com/rust/the_tool_cupboard) and the atlas's visible labels.

### Orientation, correction and security geometry

For susceptible building pieces, exposed weaker faces can make a seemingly formidable shell much easier to attack with suitable tools. Door orientation also matters: an **airlock** uses a small transitional space and multiple doors to reduce the chance that opening an exterior door gives an intruder access to the whole home. **Honeycomb** adds compartments/layers around important rooms, sacrificing space and resources to complicate an attack path. These are documented construction concepts, not guarantees or one mandatory optimal layout. [Building terminology](https://wiki.facepunch.com/rust/Building-terminology).

**Constructed example:** a builder has enough material for either a more comfortable interior or another defensive layer. The first improves daily use; the second changes the route a raider must take. Splitting supplies between compartments can limit the impact of one breach but makes unloading and retrieval more complicated. An airlock can help contain an opportunistic attacker yet inconvenience the home's occupants repeatedly. The interesting choice is how to balance those uses—not whether the player can fight an imprecise mouse cursor.

The hammer supports upgrading, repairing and context-dependent corrective actions. Do not assume an unlimited undo or free demolition tool: availability changes with authorization, object and elapsed time. This pass does **not** certify a universal current correction timer, repair-after-damage delay, or every soft-side damage multiplier. Several recent guides reuse older rules or disagree; consult the actual prompt/current server build before treating a number as authoritative.

### Upkeep, raiding and the offline problem

A funded base converts stockpiled construction materials into continued maintenance. The TC screen usefully shows requirements and a remaining-time horizon, but that horizon describes upkeep, not expected time until an enemy succeeds. Separate structures and privilege membership can also differ. [Atlas V03 and V09–V11](rust-visual-atlas.md#a-building-privilege-upkeep-and-spatial-reasoning).

Two recent changes invalidate old advice. **Power Trip, August 2026, added upkeep to high external walls. Breach and Clear, September 2026, added group-based TC upkeep scaling.** The latter considers recent authorization rather than only the number of people visibly standing inside a base. Therefore neither an old “external walls cost nothing to maintain” statement nor an old fixed upkeep table is a dependable current budgeting rule. [Power Trip](https://rust.facepunch.com/news/power-trip) · [Breach and Clear](https://rust.facepunch.com/news/breach-and-clear).

Raiding is an economic and information contest. Attackers invest suitable damage tools and supplies to reach valuable rooms; defenders invest in layers, entry design, traps, information, repair and reserves. Explosive paths differ from weak-door or vulnerable-face opportunities. A loud raid can attract a third party that contests the attackers' investment. The exact cost depends on the target, damage method and ruleset—not simply the house's exterior size. See the preserved [raiding inventory](rust-2026-09-27.md#building-authorization-decay-and-raiding).

**Interpretation:** building turns stored labor into a spatial object other players can read and challenge. That creates attachment and rivalry, but also an availability advantage for groups who can remain online. Offline destruction can produce compelling anticipation for one audience and a punishing obligation for another. It is not evidence that OpenLegend should expose every home to attack while its player sleeps.

### Why placement can feel smooth while the system remains hard

July 2025 added deployable snapping modes, including assistance around walls/corners and other objects. The placement result in the atlas shows neatly fitted boxes; it does not demonstrate a complete placement interaction or eliminate all clipping problems. [Friends with Benefits](https://rust.facepunch.com/news/friends-with-benefits).

Our interpretation is to preserve **strategic difficulty**—location, circulation, storage, defense, maintenance—while reducing **execution friction** such as repeated alignment and accidental placement. A good construction interface would also make orientation, required support, obstruction, permission, ongoing cost and the remaining opportunity to correct a mistake understandable before commitment. The screenshots do not establish that Rust already does all of this well.

<a id="rust-crafting"></a>

### Crafting: knowledge, capability and materials are different gates

Rust crafting is primarily authored recipes, not unrestricted invention. A found object can be useful before the player can manufacture replacements. A recipe unlock does not supply the parts, and access to a station does not necessarily confer the recipe. This distinction makes finding, buying, stealing and making different routes to capability. See the preserved [item and progression study](rust-2026-09-27.md#r03--items-entities-and-composition).

| Layer | Player question | Typical consequence |
| --- | --- | --- |
| Knowledge | Is the blueprint known, learnable directly, or accessible through a tech-tree path? | A physical sample may be worth researching rather than immediately using. |
| Station | Is the required workbench or specialized station available? | Infrastructure and geographic access constrain production. |
| Inputs | Are the correct materials/components present? | Recycling a component now can prevent making something else later. |
| Queue/process | What is being made, in what quantity, and when does it finish? | Manufacturing competes with immediate readiness and available output space. |
| Use | Does the output actually solve this expedition's problem? | The nominally higher-tier item need not be the best investment. |

This table is an analytical model, not a claim that the game presents one combined five-step wizard.

**Direct research:** put a researchable physical item and the required scrap into a Research Table, initiate research, then obtain and learn its blueprint. Treat the sample as a material commitment rather than assume it remains available for use afterward. **Tech-tree research:** spend through a workbench's dependency route without first finding each finished item. April 2026 added multi-unlocking along a path. The two approaches trade discovery and sacrifice against predictable access and the cost of prerequisites. [Research Table](https://wiki.facepunch.com/rust/item/research.table) · [Blueprint](https://wiki.facepunch.com/rust/item/blueprintbase) · [Spring Clean](https://rust.facepunch.com/news/spring-clean).

The late-2025 workbench changes are important: Level 2 and Level 3 progression gained Basic/Advanced Blueprint Fragment requirements, and the subsequent patch adjusted scrap costs and blueprint persistence. The existing [R04 account](rust-2026-09-27.md#current-workbench-and-blueprint-fragment-progression) preserves the exact introduced quantities and the developer's rationale. Do not flatten the current system into the older “farm scrap and buy the entire tree” account. Developer intent to encourage monument competition is not proof that solo players experienced a better progression curve.

### An actual chain is more than a recipe button

**Constructed equipment-production situation:** a group brings home ore and components, allocates fuel and processing space, retains components needed for equipment rather than recycling everything for currency, obtains recipe/station access, and makes a usable kit with ammunition and recovery supplies. The output's value is not complete until somebody can take it on an expedition. A missing dependency can sit at any stage: raw inputs, refined inputs, recipe, workbench, consumable supply, or safe storage.

The relevant documented production families include smelting; research/crafting; cooking/mixing; electrical power; water delivery; and industrial item transfer. Their detailed inventories and original examples remain in [R02–R05 of the historical study](rust-2026-09-27.md#electricity-water-and-industrial-automation). This example is not a claim that every recipe requires all of those systems.

Repair is also distinct from recrafting or research. The Repair Bench restores items using materials and can apply owned skins; a hammer repairs appropriate world objects. A UI should not make “cannot repair,” “missing material,” “wrong station” and “unknown blueprint” look like the same failure. [Repair Bench](https://wiki.facepunch.com/rust/item/box.repair.bench).

March 2025's Crafting Update expanded domestic and workshop play with cooking, chickens, engineering-oriented production, armor inserts and item-creator provenance. These connect equipment and everyday activities; they are not a class/XP system or evidence of free-form player-authored recipes. The dated update also introduces spoilage and refrigeration, so food can have timing and storage requirements rather than being an indefinitely interchangeable healing stack. [Crafting Update](https://rust.facepunch.com/news/crafting-update/).

## R03 — items, entities and composition

<a id="rust-looting"></a>

### Carried inventory, loadouts and looting

Keep **three inventories** separate: the survivor's carried/equipped items, a physical container's contents, and the account's cosmetic entitlements. The August 2025 menu image called “inventory” in the atlas is the third, not the first. It cannot prove what death drops or how many resources a character carries. [Atlas V43](rust-visual-atlas.md#g-menu-redesign-distinguish-account-inventory-from-carried-loot).

In play, the main inventory holds reserves, the belt/hotbar provides ready access, clothing/equipment determine protection and other capabilities, and compatible backpacks add capacity. The 2024 backpack release distinguished a craftable small pack from a larger looted pack; it also made the backpack part of the death-loss problem rather than a protected account upgrade. Exact slot counts and compatibility should be checked against the current item/build, not a cosmetic menu. [Bags to Riches](https://rust.facepunch.com/news/bags-to-riches).

**Looting is a transaction under exposure.** Open the body/container, compare it with available carrying capacity, select useful items, transfer them, and decide whether to leave, change equipment or stay longer. The 2019 redesign deliberately retained queued transfers while adding **H hover-loot**, reducing repetitive clicking without making every inventory instantly transferable. August 2026 added an ALT-directed “onto player” looting path and corrected awkward armor swaps involving a full inventory. The behavior and risk are established by the update text; the full modern transfer sequence was not visually captured in this audit. [Tree Fix Update](https://rust.facepunch.com/news/november-update) · [Power Trip](https://rust.facepunch.com/news/power-trip).

**Constructed situation:** after winning a fight, a player wants the opponent's armor but also carries valuable materials. The choice is not merely “take all.” Changing equipment can displace old gear; ammo compatibility and condition matter; another player may arrive; a larger haul may deserve immediate extraction. A teammate can cover while the looter sorts. The interface should communicate destination and displacement, while the world—not a fiddly drag target—supplies the intended danger.

A **loadout** is the chosen package for a purpose: tools and carrying room for gathering, access items and supplies for a monument, or combat/medical equipment for a fight. Lockers and stored replacement kits can reduce re-equipping work. That is not a permanent RPG build; another death or decision can change the package. The preserved [equipment discussion](rust-2026-09-27.md#equipment-and-compatibility) covers the broader item families and compatibility boundary.

### Value, provenance and custody

An item can simultaneously be a usable tool, a future blueprint, a production input, a trade good and somebody's lost investment. Item-creator provenance, introduced for eligible crafted items in March 2025, gives an object a trace of social origin; it does not make the creator its current owner or prevent theft. See [Crafting Update](https://rust.facepunch.com/news/crafting-update/) and [atlas V31](rust-visual-atlas.md#e-crafting-provenance-and-production-readability).

**Interpretation:** scarcity alone does not explain meaningful loot. A find becomes exciting when the player understands what new action it enables and how to retain or use it. A rare ingredient without a legible recipe can instead feel like clutter. The acquisition, storage, knowledge and use stages deserve separate explanations.

## R04 — progression, economy, time and return loops

<a id="rust-progression"></a>

### Capability progression without conventional character levels

Rust is not ordinarily a class-selection/XP-ladder game. Progress accumulates in equipment, recipes, workbench infrastructure, map knowledge, practiced combat, economic access and coordination. These can diverge sharply. A knowledgeable late arrival can obtain a finished weapon without having built its production chain; a wealthy group can still lose a fight; a map wipe can erase buildings but preserve learned capability under that server's policy. The [historical R04](rust-2026-09-27.md#r04--progression-economy-time-and-return-loops) supplies the source trail and blueprint experiment.

**Constructed stage model:** early play seeks a reliable foothold and a meaningful next outing; established play seeks repeatable acquisition and improved infrastructure; advanced play increasingly concerns contested opportunities, coordination, raids, specialized projects and what is worth doing before the next reset. This is a useful interpretation of the documented systems, not a claim every player follows the same optimal schedule.

<a id="rust-survival"></a>

### Survival can become provisioned competence

Food, water, temperature, wetness, radiation, injury and environmental danger shape which expeditions are feasible. An established base can make some needs manageable, freeing attention for chosen projects. The interesting question is whether a need changes preparation or routing, not how often a meter forces a click. The preserved [survival inventory](rust-2026-09-27.md#embodied-survival-and-traversal) and contrasting reviews explain why some players find the basic bodily systems thin despite enjoying the broader game.

Farming can then become a specialty: manage growing conditions, select/clonal lines, provide water/light and protect the production site. Livestock adds a different tended-production layer: October 2026 cows and sheep produce useful outputs and introduce breeding/genetic decisions. Plant genetics and animal genetics should not be described as the same system. [Farming Basics](https://wiki.facepunch.com/rust/Farming_Basics) · [Livestock](https://rust.facepunch.com/news/livestock/).

Maintenance should be assessed against real schedules. April 2026 extended the ripe-plant window specifically to better accommodate less frequent harvesting. That is developer intent, not evidence of a measured wellbeing outcome. Our transferable question is whether care creates a valued routine or punishes an ordinary night away. A comfortable, well-provisioned home can be an achievement, not a defect requiring a new compulsory disaster. [Spring Clean](https://rust.facepunch.com/news/spring-clean).

<a id="rust-logistics"></a>

### Automation changes the location of decisions

Rust's industrial system connects container adapters, conveyors, filters, pipes, production and output storage. An industrial crafter additionally needs the relevant blueprint/inputs and appropriate workbench context. The electric furnace avoids fuel handling but does not produce charcoal like a wood-burning production route. Thus an efficiency upgrade can change the supply of a useful by-product. [Industrial Update](https://rust.facepunch.com/news/industrial-update).

**Constructed failure example:** ore transfer works, but output storage fills. The useful diagnostic is not simply “machine not running”; it is which destination is full and which earlier steps can continue. Redundant stock and separated routes can improve resilience, at the cost of more construction and explanation. This is a design analysis, not an observed in-client troubleshooting test. The atlas inspected machine exteriors, not the complete filter/error interface.

The earlier study's water/electric/farming/boat examples remain valuable because production exists inside a physically vulnerable place. **Power Trip's public infrastructure** adds a different ownership problem: a group can improve services that rivals also benefit from. Public and private automation are not interchangeable. See the preserved [public-infrastructure case](rust-2026-09-27.md#case-9--one-groups-infrastructure-work-changes-everyone-elses-island).

<a id="rust-loss"></a>

### Death, recovery and wipes

A defeat creates a new decision only if there is a worthwhile route onward. A bag/bed can make a recovery attempt geographically plausible; a stocked home can make another expedition possible; teammates can retrieve goods or provide a replacement kit. Conversely, repeated naked running into the same opponent may be activity without meaningful agency. The bag network also has placement/cooldown constraints, and the 2023 redesign imposed a configurable bag limit partly in response to excessive repeat-return behavior. [Bags to Battles](https://rust.facepunch.com/news/bags-to-battles).

A wipe renews neighborhoods, scarcity and the value of low-tier tools. It also erases projects and can become a natural stopping point. The right research question is **what interesting uncertainty returns, what competence persists, and how much already-mastered labor must be repeated?** It is not whether erasing more things necessarily improves retention. The preserved [death/return and endgame account](rust-2026-09-27.md#death-and-recovery) records the basic rules and contrasting reactions.

## R05 — worked interactions and concrete situations

All twelve earlier full intention → conditions → action → interaction → result → next-decision cases remain available, not replaced by this shorter navigation table:

| Preserved case | What it contributes to the expanded account |
| --- | --- |
| [1. Fragment run](rust-2026-09-27.md#case-1--a-fragment-run-turns-progression-into-pvp-geography) | Progression gates make locations contested. |
| [2. One gunshot](rust-2026-09-27.md#case-2--one-gunshot-rewrites-an-expedition) | Sound can change an otherwise peaceful decision. |
| [3. Defensive circuit](rust-2026-09-27.md#case-3--a-base-circuit-turns-information-into-defense) | Player-authored information can precede a response. |
| [4. Industrial dependency](rust-2026-09-27.md#case-4--industrial-automation-creates-a-new-raid-target) | Convenience creates concentration and failure points. |
| [5. Crop genetics](rust-2026-09-27.md#case-5--genetics-make-a-crop-line-worth-defending) | Accumulated expertise attaches value to infrastructure. |
| [6. Rental foothold](rust-2026-09-27.md#case-6--a-rental-room-buys-a-temporary-foothold) | Reduced setup labor exchanges one dependency for rent/security rules. |
| [7. Softcore window](rust-2026-09-27.md#case-7--a-softcore-raid-window-changes-social-scheduling) | The rule bundle changes who can participate. |
| [8. Modular boat](rust-2026-09-27.md#case-8--a-modular-boat-becomes-a-mobile-expedition-platform) | Transport can carry production and vulnerability together. |
| [9. Public infrastructure](rust-2026-09-27.md#case-9--one-groups-infrastructure-work-changes-everyone-elses-island) | Benefits need not be exclusive to the contributor. |
| [10. Workbench upgrade](rust-2026-09-27.md#case-10--a-rare-workbench-upgrade-changes-where-loot-value-lives) | Valuable loot can modify infrastructure rather than a weapon. |
| [11. Late-wipe investment](rust-2026-09-27.md#case-11--wipe-changes-the-meaning-of-optimization) | The remaining horizon changes an investment's purpose. |
| [12. Trust and betrayal](rust-2026-09-27.md#case-12--trust-creates-content-no-authored-quest-can-guarantee) | Social uncertainty needs material consequences and safety boundaries. |

The additional building, kit-production, armor-transfer and full-output examples above are explicitly constructed illustrations, not reported play sessions.

## R06 — people, AI, social systems and multiplayer

<a id="rust-combat"></a>

### PvP: much more than aiming, but not independent of aiming

Weapons, armor, ammunition, cover, sightlines, movement, healing, range, timing and group coordination matter together. Primitive and firearm encounters create different opportunities; a better weapon is not a substitute for finding the opponent or returning safely with the spoils. Wildlife, scientists and event threats create PvE resistance, but the distinctive uncertainty frequently comes from other people. See the preserved [combat](rust-2026-09-27.md#combat-stealth-and-information) and [NPC](rust-2026-09-27.md#npcs-and-wildlife) accounts.

The 2022 combat redesign changed recoil away from the older highly memorized pattern approach and added a built-in crosshair and feedback options. October 2025 expanded crosshair controls. This means current mechanical mastery cannot simply be inferred from pre-2022 recoil videos. A crosshair gives an aiming reference, not knowledge of enemy intent, guaranteed hit accuracy or an equalized equipment matchup. [The Combat Update](https://rust.facepunch.com/news/the-combat-update) · [Meta Shift](https://rust.facepunch.com/news/meta-shift).

**Constructed encounter:** a gatherer hears a fight near the return route. Continuing to harvest adds wealth but delays extraction. Approaching may offer a third-party opportunity; avoiding it protects the carried investment. Once engaged, cover and healing compete with shooting, noise advertises the fight, and looting creates another exposure interval. The encounter has planning, execution and extraction phases even without a formal mission structure.

Rust therefore supports several skills: aiming/weapon handling; perception and sound interpretation; positioning; resource and risk management; construction/security knowledge; and social coordination. It also contains **non-skill advantages**: equipment, numbers, available hours and sometimes unfair software/network conditions. Calling it “purely skill-based” would hide those asymmetries. The original reviews repeatedly distinguish rewarding judgment from time-heavy or unfair-feeling loss.

<a id="rust-social"></a>

### Cooperation, access and different schedules

A builder, farmer, electrician, scout, trader and fighter can contribute differently without a class-selection screen. Shared infrastructure gives those roles something to coordinate around. But shared team identity, a door code, TC authorization and broader clan permissions are not one undifferentiated ownership grant. The preserved [teams/clans study](rust-2026-09-27.md#teams-and-clans) retains those social-system boundaries.

July 2025 added party-based joining and help with the initial proximity problem. This improves arrival, not a promise that every later death puts friends together. The distinction between **joining the same world**, **finding one another**, **gaining useful equipment**, **obtaining appropriate access**, and **being ready for a shared activity** is broadly useful. [Friends with Benefits](https://rust.facepunch.com/news/friends-with-benefits).

<a id="rust-trust"></a>

Proximity speech makes a stranger's intentions uncertain; repeat dealings and shared risks can build trust. Harassment, cheating and unwanted real-world pressure are not desirable extensions of fictional betrayal. The 2025 retrospective documents substantial anti-cheat work, but counts of bans or reports do not establish the percentage of unique cheaters or prove a server is fair. Permission clarity, moderation, reporting and a credible exit remain part of the actual product burden. [Surviving 12 Years](https://rust.facepunch.com/news/surviving-12-years) · [preserved contrasting reception](rust-2026-09-27.md#r12--five-substantive-reviews-plus-current-player-feedback).

## R07 — art, audio, interface and feel

<a id="rust-ux"></a>

### Visual evidence and limits

The **[visual atlas](rust-visual-atlas.md)** records 48 individually inspected assets: **24 interface captures/crops/presentations, 14 world/construction frames, four annotated diagrams, three contextual illustrations, one item icon, one publisher statistics graphic and one external planner view**. This is not 48 normal gameplay screenshots. The register identifies source, visible evidence and what each image cannot establish; failed requests are excluded.

The strongest interface observations are contextual authorization/radial commands, funded versus empty upkeep, hotbar/HUD status grouping, spatial construction, crosshair customization, tech-tree paths, server filtering/map preview, item provenance, searchable settings and demo authoring. The most important correction was distinguishing account-cosmetic inventory from carried loot. A nearby blog image is not automatically a picture of the mechanism discussed in its heading.

### What the interface helps the player do

**Contextual verbs** reduce command recall: authorize, rotate, change an access setting. Central radial descriptions can explain the selected consequence. **Persistent local status** can remind a player of privilege or an applicable raid window without opening a separate management screen. **Resource-to-time translation** makes upkeep stock more actionable than a bare material count. **Search and dependency highlighting** can help find a setting or plan research through a large option set. These are observations/inferences from the atlas, not usability scores.

The contrasting risks are hidden hold gestures, color-dependent placement interpretation, ambiguous protection terminology, mode rules discovered only after commitment, and multiple overlapping inventory concepts. Screenshots cannot establish keyboard completeness, assistive-technology support, input latency, readability during actual combat or error recovery. A settings category called accessibility is not proof those needs are met.

**Audio is functional information**, not only atmosphere. Footsteps, gunfire, doors and machines can reveal another actor or a changed base state. The original Game Informer review specifically praised listening. The psychological effect depends on the material stakes: the same sound matters more when the listener has something difficult to replace. That causal account is an interpretation supported by the reviews, not a measured arousal experiment.

<a id="rust-loading"></a>

### Loading and connection: what is actually known

“Loading” can refer to launching the client, obtaining the server list, waiting for capacity, downloading/loading a map, warming assets, or entering the live world. A slow step in one is not evidence of failure in the others. Facepunch support describes the Steam list/A2S query path and several causes of missing servers; that should not be mistaken for the architecture of every gameplay update. [No servers showing](https://support.facepunchstudios.com/hc/en-us/articles/360019452718-No-servers-showing).

August 2025's loading redesign moved prefab preparation toward asynchronously loaded Unity scenes and build-time preprocessing. Facepunch reported up to 65% faster desktop-to-server loading and lower memory use; August 2026 deferred more nonessential startup work into background loading. These are dated **developer-reported improvements**, not measurements performed here or guarantees for a machine, connection, map or heavily modified server. [Harder Core](https://rust.facepunch.com/news/harder-core) · [Power Trip](https://rust.facepunch.com/news/power-trip).

The transferable lesson is to distinguish admission, preparation and playable readiness, and show actual progress/failure states. We did not inspect proprietary networking code, benchmark first/cached loads, or establish that an old performance claim describes every October 2026 installation.

## R08 — story, narrative and connection to play

Rust's dominant narrative is a player-produced history of settlement, encounters, alliances, losses and return. The [earlier narrative analysis](rust-2026-09-27.md#r08--story-narrative-and-connection-to-play) remains applicable: “emergent story” requires useful objects, identifiable places, information, incentives and consequences. It is not generated dialogue pasted onto arbitrary events.

**Interpretation:** a door remembers a previous intrusion through the builder's redesign; a rival base makes a route politically charged; a recovered weapon can become a story because of its source. OpenLegend may be able to connect actual events to resident memory and relationships, but Rust itself is not evidence that deep autonomous NPC biographies already work at scale. Preserve the distinction between human social improvisation, authored environmental fiction and simulated character agency.

## R09 — production and development

The [preserved development history](rust-2026-09-27.md#r09--production-and-development) covers browser origins, Steam Early Access, the Legacy replacement, abandoned XP direction, monthly stable updates/staging and live progression experiments. These examples argue for inspecting a rule's actual version rather than treating an old guide as a permanent design document. They do not establish that constant system replacement is inexpensive or universally desirable.

The current study adds evidence that seemingly small workflow changes—hover-loot, snapping, menu search, loading preparation and harvest horizons—sit alongside large content releases. Our interpretation is that maintaining the ordinary repeated actions can preserve the value of accumulated depth. No isolated update supplies controlled attribution for retention or revenue.

## R10 — marketing, distribution, promotion and virality

The [original discovery account](rust-2026-09-27.md#r10--marketing-distribution-promotion-and-virality) retains Twitch Drops/Rivals, Workshop, community showcases and creator-story examples. Those channels can expose new audiences to a game whose raids, betrayals and comebacks are easy to explain in a video premise. That is a plausible demand mechanism, not a measured percentage of sales caused by streaming.

A creator-friendly story must still correspond to a playable experience. Edited videos can compress hours of gathering or omit losses, and exceptional coordinated groups are not representative of a new solo player's first evening. Separating spectacle from typical participation is essential when applying these lessons.

## R11 — commercial and participation context

<a id="rust-commercial"></a>

### What the evidence can actually support

| Evidence and measurement period | Metric and scope | Confidence and limit |
| --- | --- | --- |
| December 2019 reporting of Facepunch's year-end figures | About **US$142 million revenue** and roughly **9 million copies** reported for Rust at that time | Historical publisher figure relayed by PC Gamer. The original Facepunch 2019 URL returned unavailable during this pass; exact gross/net/tax/platform-accounting definition is not independently established here. Not present lifetime revenue or profit. |
| Facepunch's 2023 anniversary | **16 million+ PC copies** | Dated publisher milestone; not 2026 sales or unique active players. |
| Facepunch, July 3, 2025 | **Over 20 million copies sold on PC alone** | Primary written publisher statement. Strong evidence of commercial scale, not a disclosed dollar total. |
| Facepunch's January 1, 2026 retrospective, reporting 2025 | **5.8 million+ unique players, 450 million+ sessions, 700 million+ hours; 259,646 peak players** | Different publisher-reported participation measures. Do not add them, call peak concurrency monthly users, or treat hours as satisfaction. |
| Current lifetime dollar revenue, receipts and project profit through October 2026 | **Not estimable from the available evidence with a defensible narrow range** | Missing realized price/mix, regional discounts, refunds/taxes, channel/platform coverage, paid-content receipts, revenue share and costs. |

Sources: [PC Gamer's historical revenue report](https://www.pcgamer.com/rust-has-made-142-million/), [10 Years of Rust](https://rust.facepunch.com/rust10), [Friends with Benefits](https://rust.facepunch.com/news/friends-with-benefits), [Surviving 12 Years](https://rust.facepunch.com/news/surviving-12-years).

**Do not manufacture a current total by multiplying today's list price by every historical sale.** The tempting calculation conceals price changes, discounts and regional/channel mix, and leaves out or double-counts other receipts. Reports of studio-wide daily Steam revenue are not automatically Rust-only revenue. Nor are third-party review-count estimates independent confirmations when they share the same uncertain conversion model.

Rust combines premium access with optional paid skins/content and an associated creator/store ecosystem. Whether a particular paid item changes functionality must be assessed item-by-item; “every purchase is purely cosmetic” is too broad. The retained [monetization discussion](rust-2026-09-27.md#r11--commercial-and-participation-context) covers that boundary. Current operating and development costs are not disclosed here, so impressive revenue/sales cannot be converted directly into a profit estimate.

### Why the commercial outcome may have been strong

**Our explanation, with moderate confidence as a synthesis rather than causal proof:** the base game creates repeatable social conflict and construction stories without needing an authored campaign for every session; creators can communicate those stories; groups give people reasons to return together; wipes renew the opening opportunity; frequent updates and accumulated system depth make old buyers and new audiences revisit the product; optional expression provides additional purchases. The evidence establishes the systems, creator activity and scale, not each mechanism's incremental sales contribution.

Counterexplanations include distribution timing, genre growth, network effects, discounts and unusually visible creators. Costs include continuous maintenance, moderation/anti-cheat, infrastructure, compatibility and performance work. Rust's outcome does not demonstrate that a new survival title with a similar mechanic list will achieve the same population or margins.

## R12 — five substantive reviews plus current player feedback

<a id="rust-enjoyment"></a>

The **[five complete review summaries and September player samples](rust-2026-09-27.md#r12--five-substantive-reviews-plus-current-player-feedback)** are retained, with original dates and disagreements. PC Gamer valued the consequential social stories; GameSpot judged repetition and loss much more harshly; Destructoid emphasized temporary ownership; Multiplayer.it highlighted the climb into fortification and raiding; Game Informer valued audio but criticized friction and abuse. These are separate qualitative accounts, not a score average or a fresh October 2026 cohort.

### Why players can love it, and why the same loop can drive them away

| Concrete attraction | Proposed mechanism | Counterpressure |
| --- | --- | --- |
| A small successful expedition | Useful goods improve the next plan; reaching home completes a self-contained arc. | Repeatedly transporting identical materials can become mastered labor without fresh decisions. |
| Building a recognizable home | Visible personal work supports attachment, expression and practical competence. | Destruction or maintenance obligations can make that attachment stressful. |
| A tense encounter | Opponents are uncertain and the result transfers meaningful resources. | Gear, numbers, camping, cheating or offline timing can outweigh perceived agency. |
| Cooperating with a group | Different skills contribute to a shared project and history. | Schedules, exclusion, unequal labor and social pressure can turn cooperation into obligation. |
| A comeback or fresh wipe | Early uncertainty returns while human knowledge persists. | Rebuilding can repeat chores or erase the project the player actually valued. |
| Mastering a subsystem | Construction, combat, logistics or farming reveals better decisions over time. | External guides and obscure rules can become required homework rather than satisfying discovery. |

The mechanisms are research interpretations anchored in the documented systems and contrasting testimony. They are not neuroscience claims or evidence that players who spend the most time enjoy it most. No representative current retention cohort or controlled test of these explanations was located.

A useful summary is **acquire → risk → extract → invest → expand possibilities → confront other people → recover or reset**. The memorable part may be the uncertain human encounter; the base, crafting, loot and geography give that encounter consequences. Rust's appeal is in those couplings, not in hunger, guns or building considered in isolation.

## R13 — transferable inspiration and limits for OpenLegend

<a id="rust-transfer"></a>

The [earlier nine transferable principles](rust-2026-09-27.md#r13--transferable-inspiration-and-limits-for-openlegend) remain preserved with their limits. The current refinement is:

- **Make preparation visibly change possibilities.** Shelter, a suitable tool or reliable supplies should enable a wanted activity, not just raise a meter.
- **Reduce manipulation burden before reducing meaningful choice.** Snapping, clearer destinations and reliable routines can remove friction while leaving location, allocation and exposure meaningful.
- **Separate persistence and access promises.** Custody, ownership, authorization, maintenance, damage protection and reset scope need independent explanations.
- **Evaluate the whole recovery path.** A consequential loss is not automatically an interesting continuation. Measure what can be done next, not just how much was removed.
- **Preserve more than one worthwhile life.** Farming, domestic work, trade, construction and leisure need not exist only to feed PvP. NPC participation requires independent motives, not treating characters as conveyor belts.
- **Borrow coupled decisions, not Rust's social obligations.** OpenLegend's selected survival world may benefit from meaningful storage, construction and preparation without inheriting forced wipes, universal full loot or around-the-clock raiding.

These are research candidates for the general topic owners, not a new specification, feature approval, balance sheet or instruction to implement a Rust clone.

## R14 — sources, routes, preservation and requirement map

<a id="rust-gaps"></a>

### Evidence quality, remaining questions and next observations

**Strongest evidence:** dated Facepunch release notes and publisher milestones; directly inspected images for visible layout; documented item/server concepts; the preserved independent reviews for contrasting experience. **Weaker or bounded evidence:** mutable community-hosted wiki explanations, staged promotional imagery, selected Steam helpful surfaces, historical revenue reporting through a secondary source, and our interpretation of why mechanics may produce enjoyment.

**Still missing:** a complete current ordinary-PC carried-inventory → crafting detail/queue → loot transfer → full-inventory/armor-swap capture; the full building-plan → valid/blocked preview → hammer/correction sequence; a current industrial-filter troubleshooting sequence; current TC group-charge and livestock-needs interfaces; death/respawn and iron-sight combat captures; hands-on accessibility/error-recovery results; representative solo/group onboarding and recovery times; current lifetime financial accounting and causal retention/channel attribution. The [atlas failure register](rust-visual-atlas.md#failed-access-and-remaining-capture-gaps) names unsuccessful requests rather than calling them inspected.

Exact per-piece raid arithmetic, placement/correction timers, current weapon dispersion/recoil data, every server-variable default and every monument loot probability were not exhaustively validated. Those numbers can be essential to a competitive guide but are not interchangeable with the system-level research here. A targeted current-build check should resolve a number before using it in a design comparison; an old article carrying a new publication date is insufficient.

**Recommended next evidence:** a version-recorded disposable vanilla-server capture of the ordinary and blocked workflows, then a clearly named Softcore/Hardcore or plugin comparison. Test the activity and failure state rather than collecting only attractive frames. No Rust session, video viewing, code inspection of proprietary internals, benchmark or assistive-technology test is represented as performed in this pass.

### Preservation and navigation

The prior dossier's complete blob `0db0f4a0f22839092a9caf906e56afec1534cb76`, read at repository commit `3e059609b1fedfd775b70af35f5ecaa59483725e`, is retained unchanged as [rust-2026-09-27.md](rust-2026-09-27.md). It is a dated evidence record, not a second current owner. This file remains the canonical entry point and retains the R01–R14 section routes. The visual atlas owns asset-by-asset observations; topic guides own general lessons; no production world or engine contract is changed.

| Requirement | Current owner and retained evidence |
| --- | --- |
| R01 edition, rules and identity | R01 and server/persistence table; retained release history |
| R02–R03 actions and composition | R02–R03 operational building/crafting/looting; retained complete activity inventory |
| R04 progress, economy and time | R04, server boundaries, survival/logistics/loss; retained fragment quantities and wider economic examples |
| R05 complete situations | New constructed situations and all twelve preserved original cases |
| R06 social systems and AI | R06; retained team/clan and NPC detail |
| R07 audiovisual/UI | R07 and individually classified visual atlas; explicit interaction limits |
| R08–R10 story, production, discovery | Current synthesis and retained detailed history/creator evidence |
| R11 economics amendment | Dated commercial table, model limitations, demand hypotheses and support burden |
| R12 enjoyment amendment | Contrasting preserved five-review record, current explanatory model, no invented cohort results |
| R13 transferable learning | R13 and scoped topic incorporation; no implementation authorization |
| R14 evidence/preservation | This section and atlas; original source annotations remain intact |
| R15 conditional creator investigation | Section below, applicable to PC server/modding and map ecosystem |

## R15 — modding tools and ecosystem

<a id="rust-modding"></a>

**Applicability: yes for PC, assessed October 14, 2026.** Evidence includes sustained server-plugin frameworks, a maintained custom-map tooling route, concrete widely distributed plugins and an official Workshop ecosystem. These are distinct activities: ordinary base building is not modding; a cosmetic submission is not an executable client mod; a server framework is not ownership of Rust's source code.

**Server behavior:** Oxide/uMod and Carbon provide server-plugin/configuration workflows, including event hooks and permissions. Carbon advertises compatibility with the Oxide ecosystem; that is a maintainer claim and not proof every plugin/version works unchanged. The documented hooks expose selected opportunities to observe or alter events, not arbitrary authority over every client implementation detail. [Oxide](https://wiki.facepunch.com/rust/Oxide) · [Carbon](https://wiki.facepunch.com/rust/Carbon) · [Hooks](https://wiki.facepunch.com/rust/Hooks).

**Maps:** RustEdit is a community editor route for terrain, topology and prefab composition; Facepunch documents the map/SDK boundary rather than supplying a universal native editor equivalent to the survival building plan. Custom puzzle or entity behavior can introduce extra extension dependencies. A new map and a gameplay plugin are separate artifacts with different compatibility and distribution requirements. [Map Editors](https://wiki.facepunch.com/rust/Map_Editors).

**Representative creations:** TruePVE defines damage/targeting rules and can integrate zones, demonstrating that a “PvE Rust server” can embody substantial custom logic rather than one obvious universal toggle. Its catalog showed roughly 319,500 downloads at inspection; that is cumulative downloads, not unique players or active servers. Building Grades offers permissioned bulk building operations, including capabilities an ordinary vanilla player should not be assumed to have. [TruePVE maintainer documentation](https://umod.org/plugins/true-pve) · [Building Grades](https://umod.org/plugins/building-grades).

**Constructed creation-to-play workflow, not executed here:** start with a disposable supported server and known map; select a framework and compatible, legitimately licensed plugin; configure a protected building area and a separately declared conflict area; assign minimal administrative permissions; test entry, damage, death, recovery and offline behavior with distinct roles; package the map/configuration and dependency versions; publish a server description that states the real rules; after a game/framework update, rerun those boundary checks before reopening. Backups and rollback protect the test/world data, not permission to overwrite another operator's live save.

The platform supplies the client, networking entry points, base entities and exposed hooks. The creator still has to supply coherent rules, configuration, compatibility, moderation, community communication and a viable playable loop. Plugins can conflict, privileged hooks can have broad effects, and catalog availability does not establish security or redistribution rights. In particular, do not assume that an accessible plugin is open-licensed; inspect its actual terms.

**Cosmetic and video creation:** Workshop submissions follow a separately controlled asset/approval path, while the 2026 demo editor exposes cinematic timelines/keyframes and scene projects. The atlas shows those editing primitives, not a general-purpose world-authoring or NPC intelligence interface. These tools can reduce authoring labor without supplying the creator's intent or granting unrestricted publication rights. [Power Trip](https://rust.facepunch.com/news/power-trip) · [atlas creator tools](rust-visual-atlas.md#f-creator-tools-and-the-boundary-between-images-and-interfaces).

The general lesson is to distinguish **configuration, content authoring, executable extension and publication**, and to show both what the platform guarantees and what the creator remains responsible for. No claim is made that these third-party tools were installed, security-audited or benchmarked during this research.
