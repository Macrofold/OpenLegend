# G180 — ATLAS

**Research checkpoint — 20 October 2026 UTC. This dossier is incomplete.** The initial source-backed mechanics, technical tools, audio and critical/commercial findings below are preserved while research continues. Remaining work: complete R01–R06 and lore; finish presentation, production and the external-mod investigation; integrate and review the five independent reviews and contrasting player testimony; resolve the current service evidence boundary; finish economics, OpenLegend interpretation, coverage/source registers and integrated review. See the [scoped ledger](../research-progress-pirate-games-2026-10-20.md) and [full requirements](../research-requirements.md).

**Product capture:** Steam sells ATLAS for US$29.99 as Early Access, first released 22 December 2018. It credits Grapeshot Games and Instinct Games for development, and Grapeshot Games/Snail Games USA for publishing. Steam warns that the last developer update was over three years ago. Store availability does not establish that the advertised official servers are operating. [Steam page, captured 20 October 2026](https://store.steampowered.com/app/834910/ATLAS/)

<a id="r01"></a>

## R01 — The intended player life

ATLAS combines persistent survival, character development, settlement construction and ships assembled for exploration, transport and warfare. It supports PvP, PvE, singleplayer and private sessions. [Developer store description](https://store.steampowered.com/app/834910/ATLAS/)

**Interpretation:** the main unit of investment is a growing expedition organization: a survivor acquires tools, those tools produce a foothold, the foothold equips a ship, and the ship brings back resources or gains territory. The player can improve the means of undertaking the next voyage, but must also maintain and defend what has already been built. A naval defeat can therefore reach backward into days of preparation. How strongly that pressure operates depends on the chosen server rules and whether other players can damage the investment.

The following is an account of documented native systems, not a claim that the original official world is still the live destination today. The final documented official wipe announcement scheduled a fresh start for 30 June 2023, explicitly without a patch; it did not wipe unofficial, non-dedicated or singleplayer worlds. Its official PvE configuration became entirely unclaimable lawless. Server-specific rules therefore matter even within the final official season. [Grapeshot, Season 13 announcement, 22 June 2023](https://store.steampowered.com/news/app/834910/view/3665415235990518032)

<a id="r02"></a>

<a id="r03"></a>

## R02–R03 — The action and object vocabulary

### Keeping a body alive and capable

Food and nutrition are separate resources. Four vitamin categories associate A with vegetables, B with meat, C with fruit/berries and D with fish/dairy. A balanced diet can earn the Equilibrium buff. Preparing an expedition consequently means choosing a mixture, not merely accumulating one large stack of the easiest food. The community Food page remains useful for categories, but its claim that vitamin imbalance inflicts lethal damage is superseded by the later official patch below. [Community Food reference](https://atlas.fandom.com/wiki/Food)

**Version correction — March 2023:** patch 557.6 made vitamin levels survive death and removed their damage-over-time penalties. Extreme A, B, C and D respectively increase incoming damage, reduce stamina recovery, reduce fortitude and slow movement; less extreme deficiency/surplus gives smaller penalties. Overeating now adds torpor instead of directly removing health. Death therefore no longer supplies the old vitamin reset. The system still affects survival indirectly through combat, climate resistance and movement. [Grapeshot, patch 557.6, 14 March 2023](https://store.steampowered.com/news/app/834910/view/3648517227974037574)

Ocean water is salty; a coast is not automatically a drinking supply. Freshwater pools, collecting rain and digging for groundwater serve different situations. The groundwater action uses a timing interaction; a waterspout can supply a drink or fill a Waterskin. Carrying water lets the player leave a known source, while temperature and exertion make that stock part of the route plan. [Community Water reference](https://atlas.fandom.com/wiki/Water)

### Useful objects and the reason to travel

A bare-handed start becomes a tool economy: picks and hatchets gather resources, shovels excavate, climbing picks and grappling hooks change access, and a Repair Hammer maintains ships. Unlocking a recipe is not the same as possessing its materials or having the workstation needed to build it. This distinction links character specialization to bases, cargo and companions. [Tool catalogue](https://atlas.fandom.com/wiki/Tools)

Higher-quality blueprints can require several distinct named material varieties instead of one generic resource category. A blueprint belongs in the appropriate crafting station and has a limited number of uses; the resulting object can have improved durability, armour or other relevant statistics. The community reference also distinguishes the initial multi-material construction requirement from subsequent repairs with generic resources. A rare recipe therefore creates a reason to explore, trade or cooperate before it creates a stronger item. [Blueprint rules](https://atlas.fandom.com/wiki/Blueprints)

### Crew are labour with an upkeep cost

NPC sailors can be hired at Freeports or recovered after defeating Ships of the Damned. A captain can assign them to sails, artillery and other supported stations, then command that work from the ship's controls. Their gold pay and food are ongoing requirements: the Ship Resources Box and Food Larder provide them aboard ship. Equipped crew can also fight, but their supported personal weapons are bounded; the documented repertoire is not every weapon a player can use. They multiply the stations one human can operate rather than providing an independently motivated society. [Crewmember reference](https://atlas.fandom.com/wiki/Crewmember)

The land-based Crew Resources Silo centralizes provision for crew. Its accepted supplies changed: the original berry-focused arrangement later admitted vegetables and herbs, followed by potatoes and limes. The practical point is to inspect the actual storage and supply rules, not assume every edible object can be deposited in every feeding structure. [Crew Resources Silo, including cited patch changes](https://atlas.fandom.com/wiki/Crew_Resources_Silo)

### Character building, equipment and active abilities

The character earns experience, allocates attribute increases and spends skill points. Health, stamina, carrying capacity and fortitude address different constraints; a capacity increase helps a gatherer without teaching a ship recipe. Exploration supplies Discovery Points that raise the available level ceiling, rather than simply awarding the experience needed to fill it. Exact caps depend on the world and version: the community Level page labels itself outdated, while older Discovery documentation describes a different soft cap. These sources establish the two-part progression, not one verified universal October 2026 maximum. [Level reference and its version warning](https://atlas.fandom.com/wiki/Level); [Discoveries](https://atlas.fandom.com/wiki/Discoveries)

Skill families support survival, construction and mercantilism, seamanship, captaineering, beastmastery, hand-to-hand combat, melee, ranged weapons, armour, medicine, cooking/farming and piracy. Recipes, passive modifiers and activatable Feats coexist. This is a point-allocation system rather than an obligatory fighter/mage/healer class choice; taking an enabling branch opens capabilities that equipment alone may not supply. Skill respecs allow a character's allocation to change, so specialization is revisable. [Skills](https://atlas.fandom.com/wiki/Skills); [Respec](https://atlas.fandom.com/wiki/Respec)

Combat includes aiming projectiles, spending ammunition, striking and defending at close range, and managing health and stamina. The documented arsenal spans bows and crossbows, swords and maces, shields, flintlocks, blunderbusses, carbines and later industrial firearms, alongside ship artillery. Different guns require their corresponding ammunition; a Hydra Revolver offers six shots between reloads, with a different damage profile from a Flintlock. This makes weapon choice more than a cosmetic skin. [Weapons catalogue](https://atlas.fandom.com/wiki/Weapons); [Hydra Revolver](https://atlas.fandom.com/wiki/Hydra_Revolver)

Feats supply active interventions rather than a conventional spellbook: for example, Reload Overdrive accelerates an equipped firearm's reload and then enters a cooldown. Medicine has its own skills and treatment interactions. Armour affects movement as well as protection; the armour families also matter to climate preparation. Stealth is principally positioning, hiding, crouching and managing detection by creatures or people; the reviewed material does not establish a separate authored stealth-campaign or dialogue-disguise system. [Feats](https://atlas.fandom.com/wiki/Feats); [Medicine skills](https://atlas.fandom.com/wiki/Medicine_Unlock); [Movement Speed](https://atlas.fandom.com/wiki/Movement_Speed)

Basic objects can be made in inventory, but production expands through specialist stations such as the Smithy, Loom, Tannery, Forge, Mortar and Pestle, and cooking facilities. The player gathers ingredients, deposits them in the proper station, selects an available recipe and waits for production where required. Crafting, equipping, repairing and upgrading are separate actions. An upgrade consumes further materials and gold; a blueprint's quality is not a licence to produce unlimited equipment free of cost. [Crafting](https://atlas.fandom.com/wiki/Crafting); [Upgrade](https://atlas.fandom.com/wiki/Upgrade)

### Animals, crops and settlement production

Taming combines an appropriate Beastmastery unlock, the species' preferred food and its supported method. Some creatures accept passive feeding; aggressive tames commonly require injury and a Bola before close feeding. A bear's useful properties differ from a horse's or an elephant's: the animal is simultaneously a companion, potential combatant, transport or harvesting tool. Taming is not a rule that every creature must be knocked unconscious with an ARK-style tranquilizer weapon. [Taming, species and method table](https://atlas.fandom.com/wiki/Taming)

Breeding adds a longer production loop: a compatible adult pair produces an egg or offspring, climate conditions matter, and a claimed newborn needs food and attention while maturing. Imprinting makes raising a creature different from merely acquiring an adult. These requirements create a nursery and scheduling problem alongside expedition play; old manual nursery timings should not be applied indiscriminately to the later automated structures. [Breeding, including patch history](https://atlas.fandom.com/wiki/Breeding)

The late development period added alternative handling. Season 11's November 2022 Barn stores tames without feeding or reproduction. Its Bait Station uses preferred food plus a Toxic Compound: Toxic Flora pacifies an eligible wild animal for passive taming, while damage or exhausted supplies interrupts that process. Other compounds can slow creatures or impose a bleed effect, with PvP restrictions. A building intended to preserve livestock therefore has different behavior from one intended to attract and tame wildlife. [Grapeshot, Season 11 / v554.3, archived announcement](https://devtrackers.gg/atlas/p/efbca09c-season-11-patch-and-wipe)

The July 2022 Tame Hatchery stores eligible egg-laying species, collects eggs, incubates fertilized eggs and continues production with food. It also produces Nitro Fertilizer. The August 549.6 update let players pause imprint timers inside either the Tame House or Hatchery. Storing breeders in one of these productive structures is consequently different from suspending them in a Barn. [Official July/August 2022 announcements, archived bodies](https://store.steampowered.com/news/posts/?appids=834910&enddate=1664304843&feed=steam_community_announcements)

Agriculture uses seeds, suitable crops, water and fertilizer. Crop plots, reservoirs and pipes make food production a built system instead of a berry-gathering habit. Distinct resources with similar appearances can have distinct recipe uses; the farming guide's wheat example separates gathering a seed from producing the crop used in cooking. [Basic Farming](https://atlas.fandom.com/wiki/Basic_Farming); [Small Crop Plot](https://atlas.fandom.com/wiki/Small_Crop_Plot)

Industrial gathering structures extend the settlement's reach. Farmhouses collect permitted local resources in their radius when supplied with fuel; Warehouses collect from linked nearby production. Lumberyards, Mines and Quarries specialize in different material families. The productive site is therefore defined by its environment, placement, supply and collection network, not just by the building's appearance. These are native automation systems; their existence does not establish that every resource or finished product can be automatically manufactured. [Farmhouse](https://atlas.fandom.com/wiki/Farmhouse); [Warehouse](https://atlas.fandom.com/wiki/Warehouse); [Mine](https://atlas.fandom.com/wiki/Mine); [Quarry](https://atlas.fandom.com/wiki/Quarry)

A settlement is assembled from placed construction pieces and functional objects. Snap positions and uneven terrain constrain floors, foundations and supports; a harbor must also allow real ships room to enter, turn and leave. Walls, doors, workstations and storage turn the resulting space into a defensive base, workshop or trading destination. Building therefore composes practical access, production and presentation. [Building Guides, construction and harbor sections](https://atlas.fandom.com/wiki/Building_Guides)

### Ships are constructed equipment, workplaces and cargo containers

Two building systems coexist. The traditional reference explicitly covers classic hulls and should not be treated as a universal manual for the later modular fleet. [Ships, scope warning](https://atlas.fandom.com/wiki/Ships)

| Ship system | What the player builds or configures | Consequence |
| --- | --- | --- |
| Classic / legacy ships | A shipyard produces a hull framework; the player fits planks, decks or gunports, sails and placed equipment. The familiar progression includes Sloop, Schooner, Brigantine and Galleon. | The internal arrangement, gun positions and balance between fighting and cargo are construction decisions. [Ships](https://atlas.fandom.com/wiki/Ships) |
| Modular ships | Purpose-designed hulls use supported module positions and compatible components. Repair Hammer/Patch Kit and Mechanics Hammer/Armour Patch Kit functions must be distinguished. | A module belonging to one family is not automatically compatible with every other ship. The wiki's May 2023 working page itself warns that this documentation is incomplete. [Modular Ships](https://atlas.fandom.com/wiki/Modular_Ships) |
| Role-specific examples | The Pegasus provides tame-carrying rail modules; the Turtle Ship combines armour with its own protection and repair arrangements; the Mortar Ship restricts mortar firing to very low sailing speed. | A livestock transport, an armoured vessel and a bombardment platform place different demands on route, crew and combat tactics. [Pegasus](https://atlas.fandom.com/wiki/Pegasus); [Turtle Ship](https://atlas.fandom.com/wiki/Turtle_Ship); [Mortar Ship](https://atlas.fandom.com/wiki/Mortar_Ship) |

Sails trade speed, handling and carrying support within a ship's fitting limits. Ship experience supports improvements such as durability-related properties, resistance, weight capacity, crew allowance or damage. Weight and crew limits matter to safety, while leaking or missing planks can admit water and eventually sink the vessel. The player is managing a moving structure whose cargo and personnel affect its performance. Exact hull statistics and shipyard-level formulas remain version-sensitive. [Ships](https://atlas.fandom.com/wiki/Ships)

Naval work divides attention between navigation, sail angle and amount, artillery arcs and ammunition, enemy movement, structural damage and repair. A Repair Hammer draws on the appropriate repair supplies; carrying spare parts and the correct repair consumables changes whether damage can be addressed at sea. The March 2023 update also made ships visible on the map within their current grid by default, with server options to restrict that visibility. It is unsafe to infer total map secrecy from older descriptions of fog of war. [Repair Hammer](https://atlas.fandom.com/wiki/Repair_Hammer); [Grapeshot, 557.6](https://store.steampowered.com/news/app/834910/view/3648517227974037574)

A Sextant turns observation into temporary navigation information. Finding successive marked stars in its timed minigame earns a buff showing position, heading and a minimap; relevant skills improve its duration. Navigation is thus partly an acquired tool-and-skill capability. The community guide recommends manual care in shallows even when using a crew pilot and heading commands, because a chosen bearing does not establish that the route is clear. [Sextant](https://atlas.fandom.com/wiki/Sextant)

### Exploration, activities and rewards

The exploration loop includes finding new islands and resources, collecting maps from bottles, recovering floating loot, investigating wrecks, fighting wildlife and Ships of the Damned, and pursuing quest sites. A treasure map indicates a location and quality. With the map active, the player approaches the site, defeats the spawned Army of the Damned and digs with a shovel. Wreck salvage adds underwater access and the risk of finding and leaving a submerged structure. These are distinct actions and hazards rather than interchangeable reward containers. [Treasure](https://atlas.fandom.com/wiki/Treasure)

The Army of the Damned has distinct combatants, including archers and melee variants. Its treasure encounters tie danger to a player's deliberate decision to bring a map to its destination. Documentation that says all projectiles are ineffective is historical: its patch history records bows and crossbows becoming effective later. Patch 557.6 separately removed enemy spawns and building inside Power Stone caves, so the older cave-army description should not be reused as the final documented cave rule. [Army of the Damned](https://atlas.fandom.com/wiki/Army_of_the_Damned); [Grapeshot, 557.6](https://store.steampowered.com/news/app/834910/view/3648517227974037574)

Small activities provide additional verbs. A moving ship, a chair, a baited Fishing Net and a successful key-press minigame can turn travel time into fish and occasional treasure. Music also has an instrumental minigame: successfully performing a song on the Accordion consumes its music blueprint and buffs nearby friendly players, while free play lets the player choose notes. These systems make leisure useful without requiring every activity to be a combat quest. [Fishing Net](https://atlas.fandom.com/wiki/Fishing_Net); [Accordion](https://atlas.fandom.com/wiki/Accordion)

<a id="r04"></a>

## R04 — Progression, economy and what persists

**Beginning, middle, late — interpretation from the systems above:** an initial session establishes food, water, tools, a respawn point and access to a starter vessel. Established play equips a base and specialized ship, builds crew and animal support, pursues recipes and resources, and develops a reliable return route. Late play can optimize high-quality gear, naval strength, industrial production, territory and difficult quest chains. These are overlapping directions, not mandatory chapters: a private solo explorer and a competitive Company can use the same objects toward very different end states.

Gold is an item in the game world, earned through activities such as treasure, flotsam, hostile ships, creature rewards and trading systems. It pays crew and participates in equipment upgrades and purchases. Losing a carried stack consequently differs from a game with an untouchable account wallet. Recipes also consume resources and production time; larger property adds feeding, wage, fuel, ammunition, repair and maintenance demands. [Gold Coin](https://atlas.fandom.com/wiki/Gold_Coin)

The Market and Player Shop support different exchanges. Markets pair compatible offers with other Markets and move resources through configured routes; completing trade can earn gold. A request for a generic material category may match several named variants, which matters when a particular blueprint needs distinct types. Player Shops instead let an owner list goods and set a stack price for visitors; buyers can buy a portion and see its cost. This is not evidence of a single universal auction house or a frictionless shared global inventory. [Market](https://atlas.fandom.com/wiki/Market); [Player Shop](https://atlas.fandom.com/wiki/Player_Shop)

Ship preservation gained a literal crafted object. Patch 551.2 introduced the Ship in a Bottle through a Ship Bottle Station on a shipyard: a suitably anchored/scaffolded ship could be bottled, then recovered or duplicated through the system. The recipe requires Solidified Essence, and recovery occurs at shipyard scaffolding. The release initially delayed duplication on official PvP. That launch restriction should not be generalized to every later server; preservation requires the actual feature and server configuration. [Grapeshot, patch 551.2, 21 September 2022, archived copy](https://games-manuals.com/updates-patchnotes/atlas-834910/patch-5512---season-10-patch-and-wipe-4589754330729672191)

| Event | Character and rewards | Property, supplies and recovery |
| --- | --- | --- |
| Ordinary character death | The historical documented baseline keeps character XP and learned skills; carried equipment and inventory are dropped/lost subject to recovery rules. | A bed changes the respawn destination; goods in a separate chest are not automatically removed because their owner died. The cited 2019 guide's Freeport exception is historical, not freshly verified for every custom world. [Original death guide, 23 February 2019](https://www.gamepressure.com/atlas/what-happens-when-the-character-dies/z6bef9) |
| Vitamin state after death | Since 557.6, death preserves vitamins. | Respawning does not remove the nutrition management problem. [Official March 2023 change](https://store.steampowered.com/news/app/834910/view/3648517227974037574) |
| Ship destruction | The captain's learned recipes are not the ship. | The physical hull and its carried investment can be lost; repair and a previously prepared bottle are different recovery systems. No automatic reconstruction of every destroyed ship is established here. [Ships](https://atlas.fandom.com/wiki/Ships); [551.2 bottle system](https://games-manuals.com/updates-patchnotes/atlas-834910/patch-5512---season-10-patch-and-wipe-4589754330729672191) |
| Logout from a persistent server | Logging out is not a declaration that the shared world stops. | The documented survival design leaves the character in the world; supplies, vulnerability and decay make a safe berth and return schedule consequential. Treat particular private-server protection settings separately. [Gameplay Mechanics](https://atlas.fandom.com/wiki/Gameplay_Mechanics) |
| Decay / abandonment | Progression is distinct from ownership of neglected structures or animals. | Season 11 reduced ordinary placed-structure decay to ten days; the later 555.2 patch set a ten-day PvE tame-claim timer. These are dated defaults, not universal private-server promises. [554.3](https://devtrackers.gg/atlas/p/efbca09c-season-11-patch-and-wipe); [555.2](https://devtrackers.gg/atlas/p/22149084-patch-555-2-season-11-1-patch) |
| Official season wipe | A fresh official world resets the relevant server's progression and property. | The final announced June 2023 wipe explicitly excluded unofficial, non-dedicated and singleplayer games. [Season 13 announcement](https://store.steampowered.com/news/app/834910/view/3665415235990518032) |
| Private / singleplayer reset | Save ownership, configured rates and an administrator's reset policy govern the local experience. | An official season change does not itself constitute a private-world wipe. Consult the selected map and host rather than importing an obsolete official grid layout. [Server Configuration](https://atlas.fandom.com/wiki/Server_Configuration) |

**Return pressure — interpretation:** this is a game where retention can come from both aspiration and obligation. A wanted ship, blueprint, tame or boss reward supplies a positive project. Wages, food, decay and enemy access can make returning feel compulsory. Progress is not merely a bar that rises: durable character knowledge, exposed property and consumable operating stock have different failure modes. Singleplayer and customized servers can substantially change that relationship.

<a id="r05"></a>

## R05 — Constructed cross-system situations

These are analytical examples constructed from the cited rules, not claimed recordings of actual sessions. Each includes a plausible failure or counterexample because a useful strategy has conditions.

### 1. A stocked stomach is not a stocked expedition

A new sailor loads easily gathered fruit, fills a Waterskin and sets out for an unfamiliar shore. The water container creates time away from a freshwater source, but fruit alone does not provide all four vitamin groups. Before extending the trip, the player needs a varied food plan and a way to replenish water. **Counterexample:** repeatedly eating the largest available stack solves neither balanced nutrition nor finite carrying capacity. The interesting decision is whether to pause for preparation or accept a shorter trip, not which inventory stack looks fullest. [Food](https://atlas.fandom.com/wiki/Food); [Water](https://atlas.fandom.com/wiki/Water)

### 2. A rare blueprint makes the map economically meaningful

Suppose a looted blueprint requires several named gem varieties. The Company possesses plenty of Diamond but insufficient different kinds. One member scouts another island, another checks a trading partner, and the crafter reserves the blueprint's remaining uses. Common crafting can substitute within a generic family; the high-quality recipe's variety requirement changes the problem. **Counterexample:** piling up more Diamond does not create Emerald or another required variety. The recipe rewards a network capable of obtaining complementary inputs, and the resulting equipment is valuable partly because replacing it entails that network again. [Diamond resource rules](https://atlas.fandom.com/wiki/Diamond); [Blueprints](https://atlas.fandom.com/wiki/Blueprints)

### 3. Acquiring a bear is three permissions, not one button

A player wants a bear for subsequent expeditions. They prepare Honey, injure the bear sufficiently, Bola it and approach to feed without standing in the dangerous attack position. The process may require another restraint cycle. Taming Tier 2 permits acquisition; riding requires its own skill and saddle, and whistle command access is separately specified. **Counterexample:** completing the feeding bar does not establish that an unprepared character can immediately ride and command the new animal. The capture expedition must supply both the taming operation and the desired use afterward. [Bear](https://atlas.fandom.com/wiki/Bear)

### 4. Cargo handling turns escape into a choice about sunk cost

A classic trading ship fits Cargo Racks to move dense resources. The racks reduce the cargo's effective weight but impose a sailing-speed penalty even when their containers are empty. Pursued at sea, the captain can jettison a container through the rack's menu, leaving recoverable floating cargo while removing that container's speed penalty. **Counterexample:** the container is exposed to another ship with the appropriate rack; dropping it is not safely mailing it home. The captain trades a bounded cargo loss for a chance to preserve hull, crew and remaining investment. [Ship Cargo Rack](https://atlas.fandom.com/wiki/Ship_Cargo_Rack)

### 5. Familiar repair supplies fail on a different construction system

A Company equips a modular vessel after months using a classic ship. During damage control, the repairer discovers that the relevant part requires the modular tool-and-kit combination rather than the classic maintenance procedure. A disciplined departure check identifies the hull, its modules, the compatible repair equipment and enough consumables. **Counterexample:** a crate labelled “ship supplies” is not a guarantee that its contents can fix this ship. The meaningful preparation is matching materials to actual failure points, particularly where armour and underlying structure have different repair requirements. [Modular Ships](https://atlas.fandom.com/wiki/Modular_Ships); [Repair Hammer](https://atlas.fandom.com/wiki/Repair_Hammer)

### 6. A solo captain can operate a crewed workplace

A player recruits sailors, assigns some to sails and others to artillery, then fills the ship's food and wage storage before leaving. NPC labour lets that one player command several supported stations while retaining responsibility for navigation and target selection. **Counterexample:** hiring additional bodies without pay, food or suitable stations creates an upkeep problem rather than autonomous pirate partners. An expedition budget includes the time needed to return, not merely the minimum gold needed to recruit a sailor. [Crewmember](https://atlas.fandom.com/wiki/Crewmember)

### 7. A quoted exchange rate is not a working trade route

A producer links a Warehouse and Market, advertises a resource exchange and expects ongoing income. Another Market must offer a compatible trade, and the producer must actually have the goods to execute it. Examining trade logs distinguishes a functioning route from an attractive but idle offer. **Counterexample:** a generic resource request may acquire the wrong named variety for the crafter's next blueprint. Successful commerce therefore combines matching, stock, throughput and the actual identity of inputs; setting a nominal price is only one step. [Market](https://atlas.fandom.com/wiki/Market)

### 8. Finding treasure starts a fight that must be finished

A crew brings a map and shovel to its indicated site, locates the treasure signal and prepares to defeat the guardians. If the encounter overwhelms them, retreat preserves lives but can allow the Army of the Damned to burrow and the encounter to reset. **Counterexample:** killing a few enemies, leaving for supplies and returning is not a guaranteed way to reduce the same fight permanently. Preparation includes a workable combat plan and a route for returning with the reward, making discovery the beginning of the encounter rather than its completion. [Treasure](https://atlas.fandom.com/wiki/Treasure)

### 9. The boss kill creates a timed handoff

A prepared party defeats a Power Stone island's Keeper and nearby eligible players receive an Artifact Key. They must reach the chamber and use the altar before the key's two-hour spoil timer expires. The later official restriction ties that use to the island where the boss died. **Counterexample:** transporting the key to a more convenient island is not the same quest completion. Scouting the chamber route before combat converts victory into a practical collection plan; merely winning the fight leaves another vulnerable stage. [Power Stone](https://atlas.fandom.com/wiki/Power_Stone); [Official 549.6 island restriction](https://store.steampowered.com/news/posts/?appids=834910&enddate=1664304843&feed=steam_community_announcements)

### 10. A bottle is a prepared preservation mechanism

A shipbuilder creates the required station and bottle, brings a ship into the supported shipyard state, and spends the resource cost to store it. Recovering places the stored vessel back in scaffolding. **Counterexample:** a captain whose unbottled ship has already sunk has not thereby created a stored copy. The system makes preservation a material and infrastructure decision before loss. [Ship in a Bottle, 551.2](https://games-manuals.com/updates-patchnotes/atlas-834910/patch-5512---season-10-patch-and-wipe-4589754330729672191)

### 11. Necromancy is a production chain with a limited output

A Company builds a Ritual Pedestal, lets it accumulate charge, activates Sacrifice Collection and gathers hearts from ensuing kills. A later Raise the Dead ritual converts the required charge and hearts into commanded Army of the Damned warriors. Participation affects how many appear. **Counterexample:** the warriors are temporary pets that cannot be healed, so treating them as an indefinitely sustainable replacement for every sailor or combat tame defeats the system's actual limits. The magical effect is powerful because it is prepared, consumed and timed. [Ritual Pedestal](https://atlas.fandom.com/wiki/Ritual_Pedestal)

<a id="r06"></a>

## R06 — People, ownership and social organization

Companies turn collaboration into permissions and property. The documented governance options distinguish Company-owned tames from personally owned animals that others may ride, as well as personal riding rights. Structure ownership and who may snap new pieces, demolish, unlock or use a PIN are configurable. Leaving a Company can therefore have different consequences for an animal or building according to the ownership rule. This matters before donating a valuable tame or building a communal dock. [Governance](https://atlas.fandom.com/wiki/Governance)

Alliances provide another relationship between Companies, including cooperation and permitted access to claimed places or structures. An ally is not automatically the owner of another group's stores or ships. These systems let real people negotiate trade, defense, passage and division of labour; they do not supply evidence of authored companion loyalty arcs or an NPC romance system. Human political reputation is chiefly a social outcome, while formal permissions determine what a player can actually use. [Alliance](https://atlas.fandom.com/wiki/Alliance)

Territorial rules have changed repeatedly. Claim Flags support island ownership, Company island-point limits and contesting during applicable combat windows; claimable lawless regions later used Claim Towers for an area of control. Neither should be applied to unclaimable lawless areas. The server's actual claim regime determines whether arriving settlers negotiate taxes and access with an owner, compete for a claim or simply find permissible space. [Claim Flag](https://atlas.fandom.com/wiki/Claim_Flag); [Grapeshot's March 2021 explanation of claimable lawless and trade](https://news.xbox.com/en-us/2021/03/19/atlas-journey-from-the-maelstrom/amp/)

NPCs serve bounded roles: vendors offer transactions, hired sailors operate assigned stations, hostile crews and creatures fight, and specialized quest enemies gate rewards. Player organizations supply the continuing diplomacy and betrayal. The researched sources do not establish a settlement population with individually simulated careers, marriages, civic elections or a fully scheduled daily economy. Creature domestication and crew management are substantial systems without implying those additional social simulations. [NPC role catalogue](https://atlas.fandom.com/wiki/NPCs); [Commodities Vendor](https://atlas.fandom.com/wiki/Commodities_Vendor)

<a id="r07"></a>

## R07 — Presentation, documented asset work and accessibility

### Art pipeline: specific credits, limited ownership claims

Artist Chandler W.'s **High Desert** portfolio caption identifies SpeedTree 8, Megascans, Photoshop, ZBrush, Substance Painter and Unreal Engine 4 in his ATLAS asset work. His wording specifically limits the credit to the listed assets and excludes level design. This supports a mixed procedural vegetation, scanned-material, sculpting and texturing pipeline for that contribution; it is not evidence that one artist made the complete biome or that every ATLAS asset used the same tools. [AP08](#ap08)

The same artist separately documents vegetation for the **Low Desert** and **Western Tundra**, with SpeedTree 8, Megascans, Photoshop and UE4. These are useful production boundaries: biome-specific foliage packages are identifiable units of work, separate from arranging an island or authoring its gameplay. The captions establish credited contributions. This written research did not inspect the model sheets, compare texture quality or measure visual performance. [AP09](#ap09) [AP10](#ap10)

His **Underwater Trench** page adds a distinct submerged-environment asset contribution and names the extended sculpting/texturing toolchain; it credits another contributor's in-game photographs. A trench asset portfolio does not document water simulation, buoyancy, underwater visibility tuning or the renderer's implementation. No verified primary engineering account of those algorithms was recovered in this pass. [AP11](#ap11)

**Interpretation:** The supported presentation finding is a world assembled from environment-specific asset families, with strong content/tool inheritance and large construction surfaces. We should not infer an art director's intended palette, animation philosophy or silhouette rules from software names. The native ship and building systems in R03/R08 explain what players arrange; the public artist credits explain part of how the supplied visual vocabulary was produced. Detailed art-direction intent, rigging conventions, lighting budgets and character-animation production remain unknown.

### Accessibility evidence is narrower than a current settings audit

A 2019 Steam discussion records players trying to remove head movement and melee camera motion. Contributors distinguish camera shake, camera-animation settings and automatic melee targeting, and disagree over which setting removes which movement. This is useful firsthand evidence of a motion-comfort problem and discoverability friction, with named settings to investigate. It cannot establish the exact behavior of the 2026 client, nor support a claim that no mitigation exists. [AP12](#ap12)

**Interpretation:** Strong camera feedback can communicate impact and tracking while making a moving ship or close fight harder for some players to tolerate. Inventory density, construction placement, contextual interactions, status management and communication also warrant a current accessibility inspection. This run did not recover a complete current primary matrix for text scaling, remapping, color alternatives, subtitles, screen-reader support or hold/toggle options, and did not test them. These remain explicit evidence gaps; unrelated products named Atlas were excluded. A community server's additional voice rules can create a separate access barrier, documented below, even if the base game supports other communication choices.

### Audio and musical interaction: what the written evidence establishes

Before release, Grapeshot used named music to introduce the adventure. Its December 17 and 20, 2018 Captain's Logs linked *Your Journey Begins* and *The High Seas* on the Jeremy Wildcard SoundCloud account alongside descriptions of jungle travel and a Ghost Ship encounter. That establishes an official listening route and music's place in the promotion. It does not establish who composed the tracks, which instruments were recorded, or exactly how those cues trigger during play. The linked audio could not be opened in this research environment, and no listening claim is made. [Official December 2018 announcement archive](https://store.steampowered.com/news/posts/?appids=834910&enddate=1545716193&feed=steam_community_announcements)

Music also has a functional interface inside the game. The February 2019 patch roundup discusses Accordion and War Drum song buffs, gaps in the note-sheet preview, inaccurate looping-buff timers, notes failing near loop boundaries and frame stutters disrupting automatic notes. The same roundup adds a twelve-second gap between character status voice clips. These are historical change records, not measurements of the latest build. **Interpretation:** the examples show two separate design problems: correctly representing a timed action and avoiding repetitive spoken feedback. A soundtrack can support atmosphere while playable music creates actions, rewards and opportunities for interface failure. [Captain's Log 20, 6 February 2019, official patch roundup through v18.46](https://store.steampowered.com/news/posts/?appids=834910&enddate=1555648084&feed=steam_community_announcements)

The written sources obtained do not disclose a verified ATLAS composer credit, recording-session account, complete sound-effects pipeline, dynamic-music implementation, spatial-audio model or accessibility evaluation. An ARK music credit cannot fill those gaps merely because the games share production history. The dossier therefore keeps its audio findings at the level actually supported: official music publication, playable instruments and documented feedback problems. No media assets have been copied into OpenLegend.

<a id="r08"></a>

## R08 — Lore, mythology and how the world becomes playable

### The catastrophe behind the islands

The preserved setting account describes an earlier Golden Age of airborne empires sustained by the Heart of the Goddess, a power bestowed by beings among the stars. Humans and magical creatures shared that world. Xevos sought human domination; the resulting war fractured the Heart and caused the Sundering, breaking the floating landmasses and dropping them into the ocean. Many generations later, the player Pathfinders are descendants of the Heart's protectors. Xevos persists as an undying adversary with the Army of the Damned and seeks the fragments to impose his own restored world. [Pathfinder lore reference, preserved setting text](https://atlas.fandom.com/wiki/Pathfinder)

**Narrative boundary:** this is a background premise and statement of intended stakes. Its final promise of choosing how to restore or replace the lost civilization is not evidence that a complete branching narrative ending shipped. The researched quest documentation establishes collection, combat, exploration and unlocks. It does not establish voiced political conversations with Xevos, a party of authored companions or a completed novel-like campaign of moral choices.

**Interpretation:** the geography embodies the catastrophe. A ruined power source scattered among islands makes sailing a plausible means of reassembling knowledge and power. A civilization's wreckage also supplies a thematic explanation for a survivor moving from improvised tools to strange technologies. The player encounters the past as dangerous locations and useful objects, while the political future is largely produced by present-day Companies and their control of resources.

### Relics and monsters form a quest chain

The Power Stone route links nine island objectives to the Compass, character advancement and access to the Kraken encounter. Current community documentation lists a broader Keeper roster than early Hydra/Drake-only guides: Kekada, Ancient Fire Elemental, the Sentinel, Drake, Eber, Elder Rock Elemental, Hydra, Crystal Scorpion and Buwaya. The document's grid coordinates and portal directions describe an older world layout; they are not a current universal map. [Power Stone, roster and collection](https://atlas.fandom.com/wiki/Power_Stone)

These creatures have tangible identities. Kekada is a crystal-encrusted giant crab, introduced in Season 9, with aggressive responses once provoked; its particular island depends on the server's map. This gives the expedition a recognizable adversary without requiring an invented personal biography. The creature catalogue also includes Gorgons, Cyclopes, mermaids, elementals, dragons, giant marine life and the undead. ATLAS combines several maritime and mythic traditions rather than presenting a faithful reconstruction of one historical pantheon. [Kekada](https://atlas.fandom.com/wiki/Kekada); [NPC catalogue](https://atlas.fandom.com/wiki/NPCs)

The Kraken translates the quest's scale into coordinated naval combat: tentacles, dangerous projectiles, shields and summoned hostile ships divide attention; the player attacks the relevant parts or phase rather than simply unloading into a stationary health bar. Normal completion unlocks the Submarine through Explore the Depths. Earlier patches extended that unlock beyond only the individual carrying all stones, so a crew participant and the summoner need not have identical prior collection. [Kraken, combat, rewards and patch history](https://atlas.fandom.com/wiki/Kraken)

Journey of the Gods then requires the Power Stones and deep-trench Essences of Power, followed by the harder Kraken. Reaching those depths can involve a Submarine, an appropriate sea tame or diving equipment. The documented reward reduces Feat cooldowns, while completion opens the route into the Ice Dungeon. Into the Ice connects its polar dungeon challenge to Harvest Boost and Torpedo crafting unlocks. The map must actually include the required quest content; Blackwood has its own Anacthyon boss route instead of mechanically inheriting every ocean-world step. [Journey of the Gods](https://atlas.fandom.com/wiki/Journey_of_The_Gods); [Quests, Into the Ice and Blackwood distinction](https://atlas.fandom.com/wiki/Quests)

### Magic is embedded in bodies, sites and objects

Age begins at twenty and eventually creates the Fountain of Youth objective around age ninety. Rejuvenation resets age and grants lasting bonuses, with a limited repeat-reward progression. The important historical correction is patch 18.84, released in February 2019: it removed the old-age debuff and made the Fountain available across Golden Age Ruin servers. Old rotation guides and claims that every elderly character must suffer an unavoidable death should not be presented as the later documented rule. [Age](https://atlas.fandom.com/wiki/Age); [Fountain of Youth](https://atlas.fandom.com/wiki/Fountain_of_Youth); [18.84 patch reference](https://atlas.fandom.com/wiki/18.84)

An early guide preserves a proposed player-progeny system as an eventual feature. That proposal is not confirmation of implemented human breeding, romance or possession of an adult heir. Animal breeding and the shipped Fountain objective supply demonstrable systems; the proposed human family loop remains outside this dossier's verified feature inventory. [Early play guide, explicit future-tense progeny account](https://atlas.fandom.com/wiki/How_to_play_guide_for_ATLAS)

Ritual Pedestals accumulate charge and spend resources on island-scale effects: Unnatural Fog changes visibility; Sacrifice Collection makes kills yield hearts; Raise the Dead turns those hearts into commanded undead. Magic consequently connects combat, harvesting, place and preparation. It is not confined to a character casting an unlimited list of combat spells from anywhere. [Ritual Pedestal](https://atlas.fandom.com/wiki/Ritual_Pedestal)

The Army of the Damned Song Stone turns knowledge into vulnerable Company property. Its Verse Book contains special songs, and the documented system limits a Company to one book, with a long replacement delay after loss and timed recharging at the stone. That is a concrete social consequence for possessing forbidden knowledge: access can depend on custody of an object rather than every member permanently learning the same menu entry. The community reference is a version-sensitive manual, not evidence that the same timers operate on every modified server. [Army of the Damned Song Stone](https://atlas.fandom.com/wiki/Army_of_the_Damned_Song_Stone)

### Rebuilding the past becomes an organizational project

The Great Temple is a multi-stage Wonder built through specialized monument facilities and large resource contributions at an eligible site. Its progression includes a real-time wait of at least a week; the first Company to complete it receives a documented +20 Fortitude reward intended to carry into the next season. This is a specific exception to treating every official-season reward as necessarily disposable. The source describes that historical feature design; persistence beyond the original service, or through an administrator's custom reset, is not established. [Great Temple, citing patch 536.3](https://atlas.fandom.com/wiki/Great_Temple)

Industrial Lab structures extend a different reconstruction path through specialist production rooms. Brimstone and related industrial resources connect late technology to particular resource sites, while a generator can change the products of eligible nodes. These systems make “recovering lost power” an activity involving infrastructure and material access. Their exact node lifetimes, unlocks and placement restrictions are server/version-sensitive and should be checked before planning a live play route. [Industrial Lab](https://atlas.fandom.com/wiki/Industrial_Lab); [Brimstone](https://atlas.fandom.com/wiki/Brimstone); [Industrial Generator](https://atlas.fandom.com/wiki/Industrial_Generator)

**Interpretation:** the richest lore delivery is systemic and spatial. A rejuvenating site changes the history visible on a body; a cursed ritual turns violence into a resource; a guarded book makes knowledge stealable; a Wonder converts collective labor into a claim to historical significance. The evidence is thinner for intimate authored characterization, dialogue and romance. OpenLegend can study the former without assuming that a large mythical vocabulary supplies the latter.

<a id="r09"></a>

## R09 — Public production evidence and the scale boundary

### Origins, intent and the people doing the work

Steven Messner's December 2018 original preview records Jesse Rapczak and Jeremy Stieglitz describing a successor built on ARK's survival and management ideas, with player government and ownership doing much of the work that authored quest content does elsewhere. Its launch-era account describes regional server nodes joined by sailing transitions. Rapczak explicitly allows restricting entry to an overcrowded region. The article's 50,000-player figure and 1,200-times-ARK scale are historical announced ambitions; they neither establish a current topology nor demonstrate a battle involving the entire world population. Its six-ship press demonstration is evidence of a much smaller observed encounter. [AP04](#ap04)

Former ATLAS designer Matthew Lopez supplies a different kind of primary evidence: his professional portfolio describes work in Unreal Engine 4 and internal tools, taking mechanics from documentation and presentation through implementation and testing. He also lists live-operations work with QA, community/support feedback, repeated map-layout iterations, and backend tools for monitoring and modification. He describes ATLAS as originating as an ARK modification before becoming standalone; this is attributed practitioner testimony, not a recovered founding specification. His 2022 discussion of approaching an Early Access exit is historical expectation and cannot date an actual release. [AP05](#ap05)

Lead designer Erik Waananen's October 2019 Xbox launch article frames persistence, taking other players' possessions and controlling territory as the intended piracy experience. It promises attention to quality-of-life issues, balance, performance and subsequently sailing, while inviting feedback from the expanded Steam/Xbox audience. This establishes what the team then wanted to prioritize. It does not independently prove that every improvement shipped, or that crossplay extends to arbitrary PC Workshop packages. [AP06](#ap06)

**Interpretation:** The production challenge is not adequately described as adding pirate art to survival crafting. A vessel is simultaneously a construction project, a movable base, a fighting platform and a collection of persistent player investments. Crossing a region, altering a ship component or changing a map can therefore affect several systems and several players at once. The public evidence explains the need for tooling and iterative operations, but does not expose a complete engineering postmortem, internal staffing history or audited development budget.

### What the public server tools actually establish

The public tools establish a specific relationship between the studios. Grapeshot Games' official ServerGridEditor repository credits its initial creation to **Instinct Games**. It describes an early, unfinished C# example for generating ATLAS configuration JSON and publishes it under an MIT license. That source availability concerns the editor; it does not make the ATLAS game, its assets or Unreal Engine generally MIT-licensed. [AP01](#ap01)

The editor's January 2019 official documentation explains the actual grid setup: game-server processes and Redis are connected through exported grid configuration. Each process loads the ocean at a selected grid coordinate; the example includes its own player cap and network settings. Home-server flags and valid island spawn points determine entry. The document also cautions against oversized coordinates because of floating-point precision and distinguishes saving an editable project from exporting its server files. These are documented historical operational requirements, not a reconstruction of the exact 2026 service. [AP02](#ap02)

Grapeshot also released the experimental **AtlasMapViewer**: a Go service reading ship and bed information from Redis, with a React/Leaflet web interface and exported map tiles. Its README describes configurable update rates and warns that map dimensions must correspond to the grid data. This is unusually useful evidence of a public companion-tool surface. It shows how operators could expose parts of their world to a browser; it does not establish that every community map is official or should reveal the same information to all players. [AP07](#ap07)

**Interpretation:** A large world assembled from regions does not imply that its entire advertised population can meet in one battle. Regional admission, travel and persistence are separate problems. A private operator also inherits configuration and recovery work: an attractive map image is insufficient if spawning, neighboring coordinates and the corresponding server processes disagree. This research preserves announced scale separately from demonstrated capacity. Redis appearing in documented tooling does not reveal the complete persistence schema, transaction guarantees, replication scheme or recovery behavior of the proprietary game servers.

<a id="r10"></a>

## R10 — Distribution and the promise of a persistent pirate world

Xbox's September 2019 announcement positioned ATLAS as a large shared world in which players could establish themselves as pirates, with Xbox Game Preview scheduled for 8 October and cross-play with Steam. Its roadmap prioritized quality, performance and later ship/sailing work. Xbox Play Anywhere and additional input support were described as future updates. An announcement of those future capabilities is not proof they subsequently shipped. [Xbox Wire, 24 September 2019](https://news.xbox.com/en-us/2019/09/24/inside-xbox-news-recap-september-2019-2/).

The appeal of this promise is broader than steering an already supplied ship. A player can imagine making a vessel, choosing how it is equipped, securing a home and joining a group that changes the map. That interpretation helps explain both anticipation and the severity of disappointment when preparation, territorial access or technical failure prevent the voyage. The ambition creates several promises that must be assessed separately: a huge world, many connected players, meaningful local encounters, persistent possessions, useful social roles and a dependable service. A headline about scale does not establish the other five.

<a id="r11"></a>

## R11 — Commercial evidence: a significant impairment, not a disclosed project profit

Snail's November 2022 registration filing contains a more informative product-specific result than an aggregate player count: it recognized a **US$16.325 million impairment of the ATLAS license right during 2021**. The filing attributes that revaluation to delayed launches on several platforms and reduced expected future cash flow, using a 10% discount rate. This is a reduction in an asset's accounting value. It is not ATLAS's development budget, gross receipts, cash loss or lifetime profit. [Snail Form S-1/A, 4 November 2022, PDF page 148, Note 12](https://investor.snail.com/static-files/fee52939-e238-4bfa-b0d8-d8eab4b5343e).

The same filing reports ATLAS revenue **changes**, not absolute totals: a US$2.4 million decline in 2020 versus 2019, a US$1.3 million decline in 2021 versus 2020, and a US$0.2 million decline for the first half of 2022 versus the corresponding 2021 period. These observations support weaker results and expectations relative to earlier periods. They cannot establish total revenue or justify subtracting the impairment from consumer sales to calculate profit. [Same filing, PDF pages 65 and 68](https://investor.snail.com/static-files/fee52939-e238-4bfa-b0d8-d8eab4b5343e).

<a id="r12"></a>

## R12 — Substantive criticism already read

### The Drastik Measure — review, 12 February 2019

The reviewer describes an appealing variety of exploration, construction, taming and roleplay, alongside substantial technical failures. Particularly consequential reported bugs left the player floating in a terrainless region or removed the ship when crossing a grid boundary. The article values contextual sound but notes that music can interfere with spoken coordination. Its price criticism is partly a judgment about similarity to ARK and existing customers' expectations; it is not evidence that ATLAS was technically just a copied product. This review concerns the February 2019 Early Access build and cannot establish that those exact faults remain in the current client. [Original review](https://www.thedrastikmeasure.com/2019/02/12/atlas-review/).

### Thumb Culture — PC review, early 2019

This first-person account makes onboarding and reliability central. The writer could not finish reading timed instructional text, struggled to discover essential controls and repeatedly encountered freezes or crashes. A disappointing voyage ended with death after returning to a raft without the expected supplies. The reviewer saw the possibility of farming, building an empire and supplying other players, but distinguished that imagined future from a game that was currently dependable enough to recommend. The lack of a confident assessment of the full underlying design is itself disclosed in the article; its title does not turn limited progress into an exhaustive endgame test. [Original review](https://www.thumbculture.co.uk/atlas-review-yo-ho-ho-and-a-barrel-of-rum).

### Opium Pulses — review, 24 May 2019

This mixed but hopeful review identifies building a ship from individual pieces as its favorite activity: accumulated gathering becomes a visible structure, then a vessel the player can color and sail. The writer also enjoyed skill branches and naval fighting, while finding repeated acquisition of the same materials boring and some taming incongruous with the pirate premise. The recommendation is explicitly conditional on tolerance for bugs and faith in future improvement. It is evidence of actual present pleasures plus optimism, not evidence that the hoped-for future arrived. Its approximate world-size calculations and historical server descriptions are not used as current mechanical authority. [Original review](https://www.opiumpulses.com/article/301/atlas-review).

### PCWorld — substantive review impressions, 4 January 2019

Leif Johnson's long firsthand account follows a small crew through resource scarcity, shipbuilding, a long voyage, loss and another attempt. He finds constructing and preparing a ship genuinely exciting, but describes deprivation, occupied land and technical or balance failures making the trip punishing. The group stayed up because logging out felt dangerous; later a collection-rate boost made rebuilding tolerable enough to renew anticipation. His account distinguishes enjoyable construction from the circumstances that make losing it intolerable. It also recognizes that starting in a richer region could have changed his judgment. The article is labeled review impressions/feature, and is retained as substantive criticism rather than relabeled a scored final review. [Original PCWorld account](https://www.pcworld.com/article/403099/atlas-review-impressions.html).

### GamesRadar+ — Xbox hands-on preview, 20 November 2019

Mark Delaney approached ATLAS after extensive Sea of Thieves play. He found its customization and persistent-world possibility attractive, but menus and controls difficult enough that early sessions became time spent watching guides. Frame-rate drops, delayed menus and problems joining crews undermined the intended cooperative experience. He distinguished deeper construction and character specialization from Sea of Thieves' approach, rather than treating the games as interchangeable. His eventual judgment was to wait for better onboarding and performance. This is an explicitly labeled hands-on preview of the Xbox Game Preview product, not a fifth full-release verdict. [Original GamesRadar+ preview](https://www.gamesradar.com/atlas-preview-can-grapeshot-games-pirate-mmo-dethrone-sea-of-thieves-for-swashbuckler-supremacy/).

<a id="player-creation"></a>

## Creation tools: separate the world layout from game modifications

The currently accessible Epic listing describes the **ATLAS Dev Kit** as a streamlined Unreal Engine 4 editor for creating features, creatures and maps and reworking the game. It is listed free, names Grapeshot Games as developer and Snail Games USA as publisher, and advertises inclusion of the game's content. Its stated 300 GB disk requirement makes the practical authoring commitment substantial; that store requirement is not a measured current download size. Access to an editor and content is not access to every proprietary runtime source file. [AP03](#ap03)

The developer's January 2019 Dev Kit announcement describes a customized UE4 editor that publishes mods and maps directly to Steam Workshop, and explicitly introduces single-server maps without a seamless grid. That is an important distinction: making a content package and assembling a regional world are different workflows. The original technical documentation site did not load in this research session; no inaccessible tutorial is represented as a reproduced installation exercise. [AP13](#ap13)

The developer's **June 2023 Dev Kit 560** notice says the package was updated through game content v560.3 and points creators to Epic. The substantive announcement was read through a developer-post mirror and cross-checked against the official Steam announcement reference. This dates one update boundary; it is not a claim that v560.3 is the current game version, that all later changes entered the kit, or that a mod compiled years earlier will still load. [AP14](#ap14)

### Three authoring layers

| Layer | What is created | Where its limits lie |
|---|---|---|
| Native play | A building or vessel assembled and operated within the game's existing rules | Material costs, skills, ship/component rules, ownership and world persistence; the detailed native sequence is in R03/R08 |
| Dev Kit content | New or altered assets, item/skill definitions, creatures, maps or broader conversions | Editor-version compatibility, package references and each mod's installation requirements |
| Grid and community operation | An arrangement of regions and islands, deployment configuration, local rules and supporting services | Server resources, coordinate/spawn consistency, updates, restoration and moderation |

This table is a synthesis of the tools above and the dossier's native-system research. The layers can cooperate, but their outputs are not interchangeable. A player-designed ship is not automatically a distributable Workshop hull; a modded hull still needs players to build and operate it; a server configuration can transform pace and access without adding a new mesh. Native Ship in a Bottle persistence is covered in R04/R08 and should not be mistaken for exporting a Dev Kit project.

<a id="r13"></a>

## R13 — transferable inspiration and limits for OpenLegend

These are research interpretations, not accepted features, implementation instructions or changes to the [engine and bundled-world boundary](../../../../AGENTS.md#engine-and-bundled-world-separation). ATLAS is especially useful as a comparison with [Sea of Thieves](sea-of-thieves.md) and the existing [ARK: Survival Evolved study](ark-survival-evolved.md): all can make a dangerous expedition memorable, but they place different amounts of preparation, ownership and continuing obligation behind that expedition. The question is which consequences create interesting choices in an authored world, not which game's entire ruleset to adopt.

### A vessel can be both a tool and a record of its owners' decisions

The construction and ship systems in [R02–R03](#r02) connect an object's appearance, capabilities, cargo and vulnerability. A player has reasons to care about a vessel before a battle begins because choices and effort have accumulated inside it. A hypothetical OpenLegend expedition wagon could carry the same kind of significance: who built it, what it can carry, which route it can survive and what the group chose to leave behind. The useful pattern is an object whose history changes the player's next decision.

The danger is making experimentation too expensive. If discovering that a design is inconvenient means discarding hours of routine collection, players may seek a prescribed optimal design instead of trying their own. A possible study could compare replacing one component with rebuilding the whole object. Neither unlimited free reconstruction nor irreversible construction follows automatically from the desire for meaningful ownership. The cost should be legible before the player commits and should preserve an interesting recovery choice.

### Resource variety matters when it changes a journey

The blueprint and supply rules in [R03](#r03) make some production depend on obtaining different materials. This can connect a workshop to exploration, transport and exchange. A possible OpenLegend example is a craftsperson who can make a useful ordinary tool locally, while a more specialized commission gives an expedition a concrete reason to visit another place. What matters is the new choice of route, trading partner or risk; simply adding differently named ingredients does not supply that choice.

The alternative is to let knowledge, technique or a relationship unlock a different result using familiar materials. That may fit a world better than a globally distributed collection checklist. Resource specificity can also exclude newcomers from cooperation if all valuable work requires distant supplies. The comparison should ask whether a beginning participant can contribute something immediately and whether the advanced recipe produces a new use rather than only a larger number.

### Paid crew demonstrate useful assistance with clear limits

The NPC sailors described in [R06](#r06) make it possible for fewer humans to operate more stations, while their wages, food and assignments create continuing decisions. The transferable idea is bounded assistance: a character performs a recognizable task and the player can understand why that task stops. It does not demonstrate a general society of independently motivated people, nor prove that every routine job should require an AI-generated decision.

For a hypothetical OpenLegend companion helping with travel, useful questions include whether the player can see what the companion is doing, what supplies the work consumes and what happens when the companion cannot continue. A fixed arrangement can be dependable but impersonal; richer preferences can make the companion distinctive but harder to predict and support. The research leaves that choice open. A crew member who merely hides busywork and a companion who adds a meaningful relationship serve different purposes.

### Persistent property needs a comprehensible promise about absence

The ownership and persistence account in [R04](#r04), together with the lived criticism in [R12](#r12), shows why a game's logout rules belong in its core experience. A structure or ship can remain meaningful between visits while also becoming an obligation to monitor. For a possible OpenLegend settlement, the essential question is what another participant may change while its owner is absent, and whether the owner can reasonably anticipate that possibility.

There are several possible bargains: losses during an explicitly chosen expedition, scheduled periods of vulnerability, negotiated shared access, or a continuing world whose ordinary hazards do not erase a home. Each changes the social story. Protection can weaken conquest and create abandoned property; unrestricted exposure can reward availability more than good decisions. ATLAS does not select a policy for OpenLegend. It demonstrates why the policy must be evaluated through a person's ability to stop playing, return and understand what happened.

### Rebuilding is valuable when it reopens choices

Mike's [attributed Apocalypse Rising observation](../research-economics-engagement-and-creation.md#replay-loss-and-rebuilding) makes ATLAS a useful counterexample as well as an inspiration. Losing equipment can renew discovery and uncertainty; it can also demand that the player repeat already mastered collection before reaching another interesting decision. The reviews and [worked cases](#r05) distinguish the pleasure of assembling an expedition from the frustration of losing preparations to failures the player could not understand or influence.

A possible OpenLegend comparison would track what remains after a setback: knowledge, relationships, a changed place, tools, access or only the player's memory. Then ask how soon the next attempt offers a meaningful alternative. A quick restart is not automatically better if it erases all attachment, and a durable world is not automatically better if every defeat creates another maintenance burden. The useful outcome is a recovery that continues the story while allowing a different approach.

### Scale should be judged by encounters and continuity

The distinction between advertised capacity, actual launch experiences and the present service evidence appears in [R09–R12](#r09). It is relevant to an authored-world engine because a large world matters to a player through travel, people, conflicts and remembered consequences. A population figure alone does not establish that these experiences are frequent, understandable or affordable to maintain.

A hypothetical OpenLegend study could compare a small region with several consequential relationships against a larger region with longer gaps between meaningful decisions. The smaller world might feel more alive despite containing fewer simulated entities; the larger world might make distance and discovery valuable. Those are hypotheses to assess through play. ATLAS's technical history does not validate an OpenLegend server design, current AI cost, concurrent population or operating budget. Private and singleplayer routes also deserve separate evaluation because their continuity promises differ from a publisher-operated world.

### Creation has several audiences, and each inherits different work

[R15](#r15) separates arranging a ship within native rules, making external game content and configuring a multi-region server. This helps clarify what an OpenLegend author is actually trying to make. A player decorating a home should not need to understand a publishing toolchain; someone distributing reusable behavior needs more than a screenshot of a successful local experiment. The artifact another person receives, its dependencies and the conditions under which it works are part of the creative experience.

An illustrative study could follow a small authored encounter from editing its setting through trying it with another participant, saving it and sharing a reusable copy. What remains to be supplied by the author—goals, dialogue, pacing, rights and testing—should be visible. A permissive tool can support ambitious community work while leaving maintenance, compatibility and support with volunteers. A limited native editor can be easier to share while unable to express a new ruleset. Neither case implies permission to load arbitrary player-supplied code into a trusted runtime.

### Fiction earns its place when people can use it

The lore in [R08](#r08) should be assessed separately from the social stories produced by companies, journeys and losses. Named mysteries can give a destination significance, but a distant promise does not guarantee that the intervening actions are satisfying. Conversely, players can form memorable loyalties and rivalries without an elaborate authored chronology.

A possible OpenLegend adventure could let a local belief affect a journey's preparation or a character's willingness to help. The player would encounter the belief through a decision rather than only a lore entry. The tradeoff is that a practical consequence may narrow interpretation: making one belief mechanically correct is different from portraying several people who disagree. ATLAS reference names and imagery are research examples, not proposed OpenLegend content or evidence of permission to reuse assets.

### Evaluate what people enjoy and what the production can sustain separately

The [commercial evidence](#r11) and [reception](#r12) answer different questions. A reviewer can love a building system in a product whose commercial expectations later weaken. Strong initial attention can coexist with poor entry conditions or a continuing support burden. Equally, public criticism does not reveal every revenue source or the full development cost. The dossier therefore keeps financial observations, player testimony and causal interpretations distinct.

For OpenLegend, the useful lesson is to inspect whether the ordinary repeated actions are worthwhile and whether the promised experience can be delivered over time. Social surprise, a vast world or flexible authoring can enrich an enjoyable activity, but they can also obscure expensive repetition or unfinished fundamentals. No evidence here establishes a required monetization model, live-service schedule, AI architecture or feature backlog. The completed comparison supplies concrete questions and observed failure modes for future judgment without making another game's answers universal.

<a id="r15"></a>

## R15 — External-mod applicability and representative creations

**Applicability: yes.** ATLAS has an official external authoring and distribution path and demonstrable authored creations in several domains. Its Steam Workshop hub explicitly accommodates mods, maps, total conversions, islands, continents and game modes. The examples below go beyond a few speculative tools: their creator pages contain operational descriptions, update histories, dependency statements and substantial subscription records. Those records establish distribution reach, not active players, successful installations or current concurrency. [AP15](#ap15)

**Access qualification:** Several retrieved Workshop pages simultaneously displayed a removal/incompatibility banner and public descriptions, subscriber statistics and subscription controls. The inconsistent capture cannot resolve live availability. This dossier therefore treats them as inspected public creator records and dates the author's compatibility claims, without claiming an installed or verified working 2026 mod set.

### Ships: original hulls and an encounter extension

**Klinger Additional Ships (Ships Only) reforged**, Workshop **2734135825**, combines newly built hulls with altered vessel variants. The creator identifies the Caravela and Carraca as original ship work and describes the Chalupa as an early vessel in the project's development. The page was posted in January 2022, shows an October 27, 2025 update and displayed **47,531 current subscribers** in this capture. Klinger also describes testing through modified existing ships and offers optional donation support. This provides an unusually concrete individual creator, artifact and iteration story, without proving earnings or present-day playability. [AP16](#ap16)

**Klinger Additional Pirate Ship reforged**, **2734150705**, changes encounters by placing pirate fleets using modded ships, with loot and cursed pirate-skeleton opponents. Its author explicitly says it can be used without the first two related packages. That is a valuable dependency example: appearing in a creator's linked family does not itself make every sibling package mandatory. Its April 2025 update is evidence of later maintenance of this particular creation, not a guarantee for the entire Klinger catalog. [AP17](#ap17)

**Interpretation:** A hull addition changes the options available to native builders; an AI-fleet addition changes what those builders encounter at sea. Their design effects are different even when the same visual assets connect them. The former can encourage a new ship identity and layout; the latter creates targets, hazards and loot. Neither alone establishes a whole replacement campaign or economy.

### Economy: converting resource work into trade

**Atlantean Merchants**, **2558279244**, by **Sal_Mohn**, introduces craftable vendors through an Atlantean Trade Network entry at the smithy. The creator's stated purpose is to reduce grinding; examples include material, food, ammunition, weapon and treasure-related sellers. Its page records a July 2021 debut, May 2023 update and **4,974 subscribers** in this capture. Comments expose competing desired outcomes: one player appreciated having a purpose for accumulated gold in solo play, while another found prices too high. Those are individual experiences, not a consensus or an economic balance test. [AP18](#ap18)

**Interpretation:** Selling resources does more than save clicks. It changes the relationship between gathering, travel, stored currency and equipment replacement. A resource-short player may experience relief while a resource-rich player experiences a new sink. The configuration and prices therefore belong to the design of the local world; a vendor's existence does not prove that its economy will remain stable under every server's rates.

### Utility and abandonment: Ship Repair Crew

**Ship Repair Crew**, **2510799901**, by **H2O-Melons**, is a particularly useful maintenance case. The author explicitly marks it discontinued and last confirmed working at v560.3. Its repair podium automates eligible repairs using materials, exposes damage/resource information and supports configuration rather than replacing the vanilla repair system. The page reports **61,990 subscribers**, yet also states that updates and support have ended. It documents a specific resource-box prerequisite and an optional crossing-protection feature. Popularity, understandable functionality and an author-verified historical build can therefore coexist with future compatibility uncertainty. [AP19](#ap19)

This distinction matters for research classification: an abandoned mod is still a real creation with documented adoption. It should not be listed as a currently recommended dependency. Its support thread also illustrates the difference between a defect and a missing operational prerequisite; the two can look similar to a new player.

### Total overhaul: Darkside RP as an operated social world

**Darkside RP**, main package **2594500536**, is tagged as a total conversion and spans structures, equipment, creatures, appearance and rebalance. Its creator account explicitly warns that it is made for Darkside's own servers and will not function correctly on an arbitrary server. Required-item links include **Extras 3021765946** and **6.0 Addons 3399687338**. The main record shows a May 2025 update, 238 change notes and **7,346 subscribers** in this capture. This is a bundled community overhaul with a server context, not a portable list that can safely be copied by title alone. [AP20](#ap20)

Darkside's own communication rules make that context concrete. They require the community's **Provo** voice program for ATLAS and constrain out-of-character communication. Their accessibility rules allow limited text-to-speech use and require prior approval for non-verbal characters, with additional participation restrictions. These are that community's published policies, not universal ATLAS rules. They show how a community creation includes software, moderation and social access rules; an alternative voice implementation does not by itself make the overall service accessible to everyone. No program was downloaded or security claim validated. [AP21](#ap21)

### Installation, compatibility and operating burden

### A documented deployment example

LogicServers' own ATLAS hosting instructions distinguish two configuration paths: Ocean Grid uses comma-separated Workshop IDs in **ServerGrid.json / ModIDs**; Blackwood uses **GameUserSettings.ini / ActiveMods**. Its sequence is to back up, stop, change configuration and restart, allowing time for the first download. It calls out current-build support and Workshop availability when diagnosing a failed start. This is a concrete provider workflow; it does not guarantee that every host control panel, map or conversion uses identical behavior. [AP22](#ap22)

The community **Atlas Mod Downloader**, maintained by **phoenix125**, separately automates SteamCMD download, decompression, installation and generation of the mod metadata file. Its README still requires operators to configure the mod IDs, and explains a manual-download setup that disables the game's competing downloader. Its October 2020 update fixed handling of larger Workshop IDs. The tool's existence is evidence of community work around distribution and installation details, not evidence of a new gameplay feature or an official maintenance commitment. [AP23](#ap23)

**Interpretation:** A subscription record, a downloaded archive and a successfully loaded server package are distinct states. A shared session additionally needs a coherent combination of game build, content, configuration and required dependencies. For this research, the meaningful verification would be successful loading, connection, creation and persistence of representative content on the target setup. None was attempted; numeric IDs and old timestamps alone cannot replace that exercise.

### Version changes can alter semantics

The developer's archived Dev Kit changelog supplies unusually concrete failure mechanisms. It records a clean-install requirement for v100; fixes for inventory engrams disappearing after reboot; and a distinction between replacing the base engram array and adding entries through **AdditionalEngramBlueprintClasses**. It also describes stacking through **AdditionalEngramValues**, with higher-priority same-named buff/feat entries winning. These historical changes demonstrate why a package can load yet produce missing or overwritten functionality. They do not justify a universal modern load-order formula for all mods. The substantive developer text was read through a mirror because the original site was inaccessible. [AP24](#ap24)

**Interpretation:** Dependency order is a semantic issue when packages modify the same definitions. A declared required-item relationship, a same-name override and a server-only configuration need are different failure causes. Troubleshooting should identify which relationship is involved; indiscriminately rearranging a list can hide the cause. Conversely, a creator explicitly allowing standalone use is meaningful evidence against assuming all linked packages must be installed.

### Updates and restoration are part of creation labor

**AtlasServerUpdateUtility**, also maintained by phoenix125, documents server and mod updating, backup support, crash monitoring, scheduled restarts, per-grid configuration and operation across multiple machines. Its README lists a June 2023 stable release and describes checking save completion before shutdown. These are substantial supporting tasks around a playable world. The tool does not author the map for the operator or establish that any given backup is complete and restorable. [AP25](#ap25)

LogicServers' separate backup documentation describes snapshots of map/player data, scheduled backups and restoration through its panel, with a limit of three stored backups. That limit is specific to the documented service. It makes an otherwise abstract cost visible: keeping a recent restore point and retaining an older known-good state may compete for limited retention slots. [AP26](#ap26)

**Interpretation:** A restored world is useful only when its state and the content that defines its objects still correspond. Map alterations, content removal, failed updates and deliberate fresh starts should therefore be distinguished in the history of a community. The recovered sources do not provide a universal guarantee that removing a mod preserves its objects, that every game patch requires a wipe, or that a backup from one mod set can be replayed under another. Those outcomes need package-specific evidence and a matched restoration test.

### Presentation, production and creation sources

All inspected 20 October 2026 UTC. Further sources and findings will be appended before final delivery.

- <a id="ap01"></a> **AP01 — Grapeshot Games, ServerGridEditor repository.** [Official README and license designation](https://github.com/GrapeshotGames/ServerGridEditor). Substantive README read. Primary tool provenance; the game source and assets are outside this license claim.
- <a id="ap02"></a> **AP02 — Grapeshot Games, ServerGridEditor wiki, edited January 7, 2019.** [Official configuration instructions](https://github.com/GrapeshotGames/ServerGridEditor/wiki). Full substantive instructions read. Historical settings/examples, not a current hosting audit.
- <a id="ap03"></a> **AP03 — Epic Games Store, ATLAS Mod Kit listing.** [Current tool listing](https://store.epicgames.com/p/atlas-mod-kit?lang=en-US). Substantive description and requirements read. Marketing/tool documentation, not proof every old tutorial remains compatible.
- <a id="ap04"></a> **AP04 — Steven Messner, PC Gamer, December 7, 2018.** [Original visit and developer interview](https://www.pcgamer.com/atlas-mmo/). Relevant body read. Launch-era ambitions and witnessed demonstration are kept distinct; no current capacity inferred.
- <a id="ap05"></a> **AP05 — Matthew Lopez, professional ATLAS portfolio.** [Practitioner account](https://matthewlopez611.wixsite.com/website/about-3). Full body read. Self-reported responsibilities and dated 2022 expectations; not a complete staffing or release history.
- <a id="ap06"></a> **AP06 — Erik Waananen, Xbox Wire, October 9, 2019.** [The Future of Atlas](https://news.xbox.com/en-us/2019/10/09/the-future-of-atlas-xbox-game-preview-xbox-one/). Full developer-authored body read. Historical intent, not independent performance verification.
- <a id="ap07"></a> **AP07 — Grapeshot Games, AtlasMapViewer.** [Official repository](https://github.com/GrapeshotGames/AtlasMapViewer). Substantive README read. Experimental companion-tool architecture and documented configuration boundaries.
- <a id="ap08"></a> **AP08 — Chandler W., High Desert portfolio.** [Artist's project caption](https://cwhalen.artstation.com/projects/v1xPXv). Full caption read; images not inspected or copied. Limited asset authorship and software credit.
- <a id="ap09"></a> **AP09 — Chandler W., Low Desert portfolio.** [Artist's project caption](https://cwhalen.artstation.com/projects/N5Jrqq). Full caption read. Environment-specific contribution, with explicit level-design exclusion.
- <a id="ap10"></a> **AP10 — Chandler W., Western Tundra portfolio.** [Artist's project caption](https://cwhalen.artstation.com/projects/8loVvQ). Full caption read. Production evidence; no independent visual-quality assessment.
- <a id="ap11"></a> **AP11 — Chandler W., Underwater Trench portfolio.** [Artist's project caption](https://cwhalen.artstation.com/projects/EV4ya8). Full caption read. Asset/tool credits do not disclose water-rendering implementation.
- <a id="ap12"></a> **AP12 — Steam players, August–October 2019.** [Head-bob and camera-motion discussion](https://steamcommunity.com/app/834910/discussions/0/1640918469771202051/). Substantive indexed discussion read. Conflicting historical user reports, not a current settings audit.
- <a id="ap13"></a> **AP13 — ATLAS Team, January 18, 2019 Dev Kit release.** [Official Steam syndicated announcement archive](https://store.steampowered.com/news/posts/?appids=834910&enddate=1550734440&feed=steam_community_announcements). Dev Kit announcement body read within the archive; unrelated articles in the same feed are not this source.
- <a id="ap14"></a> **AP14 — ATLAS Team, June 21, 2023.** [Dev Kit 560 developer-post mirror](https://devtrackers.gg/atlas/p/fd1c0451-devkit-update-560); [official announcement reference](https://steamcommunity.com/games/834910/announcements/detail/3665415235986927403). Full mirrored body read; official direct capture exposed only its image shell.
- <a id="ap15"></a> **AP15 — Steam, ATLAS Workshop overview.** [Supported creation categories](https://steamcommunity.com/workshop/about/?appid=834910). Substantive indexed overview read. Distribution capability, not a count of compatible creations.
- <a id="ap16"></a> **AP16 — Klinger, Additional Ships.** [Workshop 2734135825](https://steamcommunity.com/sharedfiles/filedetails/?id=2734135825). Description, statistics and dates read. Creator claims; subscription snapshot and conflicting availability capture explicitly qualified.
- <a id="ap17"></a> **AP17 — Klinger, Additional Pirate Ship.** [Workshop 2734150705](https://steamcommunity.com/sharedfiles/filedetails/?id=2734150705). Full relevant description read. Standalone-use statement is package-specific.
- <a id="ap18"></a> **AP18 — Sal_Mohn, Atlantean Merchants.** [Workshop 2558279244](https://steamcommunity.com/sharedfiles/filedetails/?id=2558279244). Description, dates, statistics and cited comments read. Individual feedback is not representative polling.
- <a id="ap19"></a> **AP19 — H2O-Melons, Ship Repair Crew.** [Workshop 2510799901](https://steamcommunity.com/sharedfiles/filedetails/?id=2510799901). Description, configuration and relevant support exchanges read. Explicit discontinuation and historical compatibility boundary retained.
- <a id="ap20"></a> **AP20 — DarksideRP, main overhaul.** [Workshop 2594500536](https://steamcommunity.com/sharedfiles/filedetails/?id=2594500536). Creator description, required-item links, dates and statistics read. Server-specific bundle, not a tested portable conversion.
- <a id="ap21"></a> **AP21 — Darkside RP, Communication Rules.** [Community policy](https://darksiderp.net/rules/communication/). Substantive rules read. Community access and software requirements; no endorsement or execution of the linked program.
- <a id="ap22"></a> **AP22 — LogicServers, mod installation.** [Hosting provider instructions](https://my.logicservers.com/knowledgebase/215/Adding-Steam-Workshop-mods-to-your-ATLAS-server.html). Full substantive instructions read. Specific Ocean Grid/Blackwood deployment paths.
- <a id="ap23"></a> **AP23 — phoenix125, Atlas Mod Downloader.** [Maintainer README](https://github.com/phoenix125/Atlas-Mod-Downloader). Installation and version notes read. Community utility, not official game content.
- <a id="ap24"></a> **AP24 — ATLAS developer Dev Kit changelog, v12.x–v100, 2019.** [Developer-post mirror](https://devtrackers.gg/atlas/p/b15ab89b-devkit-changelog-v100-0). Full substantive body read. Original site unavailable; historical semantics not generalized to every present package.
- <a id="ap25"></a> **AP25 — phoenix125, AtlasServerUpdateUtility.** [Maintainer README](https://github.com/phoenix125/AtlasServerUpdateUtility). Features and relevant release/operational notes read. No utility or save recovery was tested.
- <a id="ap26"></a> **AP26 — LogicServers, backups.** [World/player backup and restoration](https://my.logicservers.com/knowledgebase/384/Backing-up-and-restoring-world-and-player-data-on-your-ATLAS-server.html). Full substantive instructions read. Retention and panel details apply to that service.

### Audio sources

All accessed **20 October 2026 UTC**.

- [Grapeshot's official December 2018 Captain's Logs](https://store.steampowered.com/news/posts/?appids=834910&enddate=1545716193&feed=steam_community_announcements): substantive Steam archive body read. The December 17 and 20 entries link the two named tracks. SoundCloud destinations failed; audio was not heard. Prelaunch scene descriptions are promotional accounts.
- [Captain's Log 20, 6 February 2019](https://store.steampowered.com/news/posts/?appids=834910&enddate=1555648084&feed=steam_community_announcements): official Steam syndication, relevant patch text read. Timed-music display/input fixes and voice-feedback spacing; not an independent playback test. Other announcements on the same archive page retain their own dates.
