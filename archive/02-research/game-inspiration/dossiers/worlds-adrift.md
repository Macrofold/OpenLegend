# Worlds Adrift — full research dossier

**G15 · Complete research pass, September 26, 2026.** This dossier covers Bossa Studios' original persistent sandbox MMO through its July 2019 shutdown. It does **not** silently substitute the later game *Lost Skies*: that title is a separate, non-MMO successor-in-spirit built from some of the same ideas. [Preserved earlier chapter](../games/worlds-adrift.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Worlds Adrift is one of the most important OpenLegend references in this library because its most memorable mechanics were not abstract stat systems. They were **physical verbs**—grapple, swing, climb, glide, lift, attach, repair, sail, board, shoot, salvage—and a player-built vehicle that turned those verbs into emergent stories. It is also a warning about coupling a mechanically expensive simulation to an always-online MMO operating model before the surrounding game has enough durable reasons to stay.

The original Steam page identifies Bossa Studios as developer/publisher and says the game is no longer available. Its unfinished roadmap remains historical, not a presently playable promise. [WA01](#wa01)

The numbered sections provide the full mechanics and reception survey. Detailed studies within them preserve additional worked interactions, production accounts and evidence limits; dated patch and platform qualifications apply to the historical overviews. Source annotations retain the access limits recorded by each research pass.

## 1. Identity and player promise

Worlds Adrift was an Early Access PC sandbox MMO from Bossa Studios built around a persistent shared sky-world of floating islands. The basic fantasy was unusually legible:

1. wake on an island;
2. learn to move with the grappling hook;
3. gather Knowledge (ordinary-object scanning belongs to earlier versions; see [the 2019 progression changes](#study-5));
4. gather wood, metal, Atlas shards and other resources;
5. unlock shipbuilding;
6. construct an airship whose mass, lift, thrust and component placement matter;
7. leave the island;
8. cross hazardous weather walls into richer regions;
9. explore ruins and player-authored islands;
10. meet, cooperate with, evade, board or fight other players;
11. salvage, improve and rebuild after losses. [WA31](#wa31) [WA32](#wa32)

The game intentionally rejected many standard MMO structures. A 2018 critic noted the absence of normal classes, trinity roles, auction houses, NPC vendors, dungeons and conventional quest chains. Advancement centered on knowledge, schematics, materials, tools, ship capability and player skill. [WA33](#wa33)

The strongest player promise was therefore **“become more capable at moving through and engineering the world”**, not “raise your character level until numbers increase.”

<a id="1-the-next-island-is-a-reason-to-improve-a-personally-constructed-ship"></a>
<a id="study-1"></a>

### Detailed study 1: The next island is a reason to improve a personally constructed ship

The player explores floating islands, gathers resources and knowledge, constructs a skyship, maintains it and chooses where to travel. Another crew can be an opportunity or a threat. The original Steam description places these activities in the shattered world of **Foundation**, while distinguishing delivered PvP/PvE options from promised territory-control or trading features. [WA01](#wa01)

In Ozzie Mejia's February 2015 interview, **Luke Williams** names **The Wind Waker** and **Skies of Arcadia** as influences. The proposed object of care is the shared ship: something made and maintained together, not merely a vehicle issued by a quest. **Henrique Olifiers** connects that ambition with physical interactions that allow unplanned outcomes. These are early design intentions; later evidence establishes delivered rules. [WA02](#wa02)

**Interpretation:** the ship can be home, project, means of travel and vulnerability at once. An improvement is meaningful when it changes the journey the crew can attempt. A larger catalogue of parts would not, by itself, supply another reason to leave a safe island.

The first useful activity is learning to move and constructing a viable vessel. Later activities include experimenting with designs, pursuing rarer materials and schematics, crossing environmental barriers, exploring authored ruins, collecting cultural fragments and negotiating human encounters. These paths share tools but need not supply the same motivation. A quiet explorer and an opportunistic boarder can inhabit the same geography while judging its constraints differently.

## 2. Character creation and identity

Players created a humanoid avatar for a server. Contemporary impressions praised the visual character customization as flexible enough to evoke familiar RPG archetypes, but appearance was not a class choice. [WA33](#wa33)

There was no conventional:
- warrior/mage/rogue class;
- STR/DEX/INT attribute allocation;
- armor-defense build;
- spell-school identity;
- avatar XP level.

Personal identity instead emerged from:
- visual customization/clothing;
- which crafting branches the player researched;
- what schematics they found;
- which tools and belt items they carried;
- the ship they designed;
- crew/social affiliations;
- practical skill at traversal, engineering, piloting and combat.

That matters for OpenLegend: **identity can be expressed through capability, possessions, history and role in a group without requiring a formal class label.**

## 3. Traversal: grappling, climbing and gliding as core skill

The grappling hook was the game's signature mechanic.

The player aimed and fired the hook at geometry, then could:
- hang from the rope;
- reel in;
- give rope;
- swing using movement inputs;
- grapple-boost;
- recover from a fall;
- reach the underside of floating islands;
- board another ship;
- move heavy objects indirectly;
- launch from one moving platform toward another. [WA31](#wa31) [WA34](#wa34)

Climbing allowed free ascent on suitable vertical surfaces. A glider expanded long-distance aerial movement. Later controls also supported first-person views for constrained spaces or aiming. [WA31](#wa31)

This produced a useful **skill gradient**:
- novice: grapple as an emergency tether;
- intermediate: deliberately swing to move efficiently;
- expert: use speed, rope length, ship motion and terrain to board or traverse enormous gaps.

SideQuesting's reviewer described going from repeated early deaths to deliberately slingshotting around ships and islands, calling the grappling hook one of their favorite mechanics in years. [WA35](#wa35)

### Why it feels systemic

The hook is not a contextual animation prompt. It participates in the same physical world as:
- moving ships;
- falling debris;
- gravity;
- terrain;
- other players;
- detached components.

That means one mechanic can become:
- transport;
- rescue;
- combat mobility;
- boarding;
- construction support;
- improvised cargo handling;
- a way to avoid losing resources to the void.

**OpenLegend lesson:** a high-quality universal verb can create more possibility than dozens of bespoke interaction prompts.

<a id="2-grappling-is-useful-before-the-first-ship-exists"></a>
<a id="study-2"></a>

### Detailed study 2: Grappling is useful before the first ship exists

Bossa's sponsored May 2018 beginner guide explains hooking a surface, reeling in or extending the line, swinging and transferring the attachment. Both falling and striking a cliff too hard can hurt the character. This is a traversal vocabulary, not an automatic teleport to any visible point. [WA03](#wa03)

**Constructed decision:** gain enough momentum to reach a ledge, then release and attach elsewhere. A shorter line may help reach one surface while giving less room to control another approach. The same tool supplies exploration, construction access and a boarding method; learning it changes what the player can attempt without acquiring an entirely different character.

**Interpretation:** a movement tool is expressive when the environment supplies its opportunities. The interesting question is where and when to attach, not merely whether the inventory contains a grapple. Learning in a relatively forgiving place and using that knowledge near a valuable ship are different commitments.

#### A glider solves a different absence

A grapple needs something to attach to; a **Glider** permits horizontal travel through open space by spending altitude. Diving gains speed, while sustained climbing can stall it. The historical entry distinguishes owning a found glider from acquiring its schematic and marks warm updrafts as planned rather than implemented. [WA06](#wa06)

**Constructed interaction:** grapple to gain height, release, glide toward another reachable surface, then seek a new attachment. The tools complement one another instead of becoming sequential upgrades that make the old one useless. Running out of altitude remains a constraint; the glider is not a free replacement for powered skyships.

## 4. Physics as world law

Worlds Adrift's physical simulation was not decorative. Mass, thrust, wind, impact and component destruction could alter actual outcomes.

PCWorld's hands-on preview captured the design well: a too-heavy cannon was given an anti-gravity device, grappled toward a ship, accidentally smashed into the hull, broke pieces off and then tumbled into the void. In another storm, ship components detached one after another; a developer attempted to use an explosive on debris as improvised propulsion. The attempt failed, but the simulation could in principle produce such an outcome. [WA36](#wa36)

The key design property is **shared causality**:
- a component is a physical object during construction and destruction;
- a cannon has mass before it has “weapon” meaning;
- a storm applies forces rather than merely debuffing “ship speed”;
- destroyed lift or propulsion changes what the vehicle physically does.

This makes accidents narratively interesting because they are consequences of reusable laws.

### OpenLegend implication

Where feasible, reusable world laws should sit below content-specific mechanics. “Explosion applies impulse and damage” is more generative than “explosion can only break objects explicitly tagged for this quest.” The cost, demonstrated later in the lifecycle section, is engineering and runtime complexity.

<a id="3-a-constructed-part-remains-a-physical-object"></a>
<a id="study-3"></a>

### Detailed study 3: A constructed part remains a physical object

The **Shipyard** makes a frame; the **Assembly Station** makes components. The beginner guide's basic vessel uses a helm, **Atlas Core** and sail, with a registered **Personal Reviver** providing a return location. Components must be moved into place rather than instantly becoming abstract equipment; a finished heavy part can fall onto the person beneath it. [WA03](#wa03)

**Constructed consequence:** the crew has ingredients and a design, but still needs a safe place to fabricate and fit the component. Hanging underneath the frame solves access while exposing the player to a dropped part. Acquisition, fabrication, installation and safe operation are separate steps.

The early developer interview distinguishes backpack-sized goods from engines, wings and panels that must be dragged in the world. It imagines abandoned camps and wreckage becoming evidence of earlier players. [WA02](#wa02) **Interpretation:** salvage can be useful because of its structure and location. A former disaster becomes someone else's opportunity. Cleanup and logout rules qualify a literal claim that every object remains active forever.

#### An Atlas Lifter changes handling before installation

An **Atlas Lifter** attaches to a detached part and makes it float so the player can pull it with a grapple into a Shipyard's manipulation area. It is not an additional lift upgrade for an already attached ship component. [WA07](#wa07)

**Constructed situation:** retrieve a useful component from a wreck instead of reducing it to materials. The player needs a handling method and a destination where it can be fitted. One tool serves construction and salvage, while attachment restrictions prevent an unlimited substitute for the ship's core.

**Interpretation:** discovering an object and adopting it can be separate problems. That is richer than instantly adding every large object to inventory, but it also creates labor that needs appropriate handling aids.

## 5. Knowledge progression and the tech tree

**Knowledge** was the closest equivalent to experience. Before the 2019 progression changes, players gathered it by scanning:
- Databanks;
- world objects;
- lore/codex objects;
- other discoverable sources.

Knowledge could be spent in a tree to unlock:
- shipbuilding;
- wings;
- engines;
- cannons;
- swivel guns;
- additional schematic capacity;
- later Sky Core upgrades and related capability. [WA37](#wa37)

The progression loop therefore linked **curiosity to capability**: exploration of an island directly improved what a player could engineer.

### Schematics create a parallel discovery progression

Schematics could also be found in chests/ruins. This meant knowledge-tree unlocks and world-found schematics overlapped. A detailed Steam reviewer liked both ideas independently but criticized the redundancy: finding a schematic could make spending knowledge on the same branch feel wasteful even when that investment was required to reach later nodes. [WA38](#wa38)

This is a useful warning for OpenLegend progression:
- **discovery unlocks** feel special because the world gave you something;
- **tree unlocks** feel agentic because you chose a path;
- if both grant the same entitlement without meaningful distinction, one can invalidate the other.

A better composition is often:
- research grants understanding/general capability;
- discovery grants a unique implementation/recipe/variant.

<a id="5-knowledge-changed-from-exhaustive-scanning-to-directed-progression"></a>
<a id="study-5"></a>

### Detailed study 5: Knowledge changed from exhaustive scanning to directed progression

March/May 2019 developer posts remove knowledge rewards from ordinary object scans, retaining databanks, lore and schematic salvage as progression sources. Branches grant more deliberate schematic choices. [WA05](#wa05) Earlier advice to scan every tree and rock is therefore historical, not the final loop.

**Constructed choice:** pursue a branch supporting the next expedition rather than search indefinitely for one lucky chest. Rare discovery can remain exciting without making every basic capability random. An object description can stay worth reading without being an experience-point dispenser.

**Interpretation:** spendable Knowledge differs from practical understanding of a route, material or risk. The two can reinforce each other, but rewarding every scan can turn curiosity into a checklist. An intelligible next capability supplies direction without prescribing the whole journey.

#### Weather tests the assembled ship

Wind walls, storms and sandwalls separate regions. Historical documentation describes lightning, gusts and poor visibility; sandwalls add continuing component damage. Its advice emphasizes lift, multiple functional components, steering and repair supplies rather than one key item. Conductivity speculation in that source is unconfirmed and excluded. [WA10](#wa10)

**Constructed expedition:** one person keeps a heading while another repairs a damaged engine. A single efficient engine was adequate for quiet travel but becomes a single point of failure here. Extra mass may improve stability while demanding stronger lift and propulsion. A locally beneficial property creates another dependency.

**Interpretation:** crossing matters when players connect design, preparation and execution. Losing to an invisible fault would not teach the same lesson. These are rules-based possibilities, not a claim that every crossing produced a dramatic rescue.

## 6. Resources and crafting

Important resource families included:
- **wood** — often useful for lighter structural components;
- **metal** — ship parts, tools, weapons/ammunition;
- **Atlas shards** — anti-gravity / Sky Core-related technology;
- **fuel** — propulsion/power needs;
- recovered/salvaged components and schematics. [WA31](#wa31) [WA39](#wa39)

Materials were not always interchangeable commodities. Historical guides describe different weight/quality properties affecting the resulting ship component. That made gathering partly an engineering decision: a heavy high-quality material might be useful for durability but harmful to a weight-limited craft. [WA34](#wa34)

Crafting happened through the player's gauntlet and stations such as an Assembly Station. Large ship parts were produced into the physical world and moved/attached rather than becoming abstract inventory icons forever. [WA40](#wa40)

### Tool loop

The gauntlet supported multiple functions:
- salvage;
- repair;
- lift/manipulate;
- scan, with Knowledge rewards narrowed in 2019 as described in [the progression study](#study-5).

That is another compact OpenLegend pattern: a single diegetic tool can expose several world-valid verbs instead of proliferating arbitrary UI actions.

## 7. Ship construction: the player's moving base and build

Airships were the central synthesis system.

A player could begin from preset frame slots/designs and edit the frame shape. Then they physically attached components such as:
- Atlas Sky Core;
- sails and/or engines;
- power generation;
- helm;
- wings;
- panels/armor-like protection;
- cannons/swivel guns;
- instruments;
- crew respawn equipment;
- utility parts. [WA40](#wa40) [WA41](#wa41)

### Lift and weight

An Atlas Sky Core supplied anti-gravity lift up to a capacity. Larger/heavier ships required stronger cores/upgrades. The core was strategically important because disabling it could cause the ship to fall. [WA41](#wa41)

A ship design therefore traded:
- mass;
- lift;
- durability;
- speed;
- maneuverability;
- redundancy;
- firepower;
- visibility/exposure of critical parts.

### Propulsion placement matters

Engines produced thrust, and historical documentation notes that asymmetrical engine placement could affect handling. Sails interacted with wind; a player review specifically praised visible wind feedback and the need to sail/tack rather than simply hold forward. [WA38](#wa38) [WA42](#wa42)

### Component vulnerability creates local damage stories

Instead of one “ship HP” bar being the only meaningful state, combat could destroy:
- propulsion;
- weapons;
- exposed structure;
- navigation tools;
- the Sky Core.

That turns damage into changing functionality. A crippled ship may still fly; a disarmed ship may flee; a coreless ship may fall.

**OpenLegend lesson:** componentized machines create richer consequences when local damage changes capabilities rather than only reducing a global number.

<a id="4-lift-propulsion-and-defense-are-different-dependencies"></a>
<a id="study-4"></a>

### Detailed study 4: Lift, propulsion and defense are different dependencies

The **Atlas Sky Core** supplies lift with a weight limit, upgrades and turning torque. Lift differs from fuel-consuming propulsion; corrective torque does not overcome arbitrary uneven engine placement. An **Atlas Pulse** spends an Atlas Shard to detach grapplers or climbers. [WA04](#wa04)

**Constructed choice:** add carrying capacity or remove unnecessary weight, then consider whether propulsion and layout still suit the ship. A craft that remains airborne is not necessarily easy to steer. A cannon creates supporting requirements rather than being a cost-free improvement.

**Constructed defense:** a boarder hangs from the ship. A pulse can change their attachment state, but consumes a resource and does not remove every nearby danger. Layout and timing remain relevant. A universal unlimited anti-boarding command would produce a different social game.

**Interpretation:** a useful component is a capability with conditions and costs. Separating buoyancy, movement and protection makes a small set of parts support several designs. This is not an independently reproduced flight simulation or a final-patch numerical specification.

#### Material choice changes more than colour or rarity

The metal reference describes **Aluminium** as a lightweight choice, **Titanium** as useful in combustion/mechanical roles, and material quality as improving supported statistics without increasing weight simply because quality is higher. Material function and grade are separate variables. [WA08](#wa08)

**Constructed comparison:** fit lighter paneling to reserve lift for cargo, or accept more mass for another property. A high-quality sample of an unsuitable metal need not serve the intended component better than an alternative. Contribution also depends on the component role, not a universal rarity ladder.

The reference includes historical player testing. It does not justify importing every table into an asserted final-patch simulator. The transferable pattern is evaluating one material by several properties and its role in the assembled object.

#### Fuel belongs to the journey and workshop

Fuel supports propulsion and recipes including lights, campfires and explosives. Canisters are physical objects; grappling a detached canister can hold it or let it pull the player. [WA09](#wa09)

**Constructed choice:** spend fuel on a cave light or retain it for the return flight. Enough metal for a better engine does not guarantee a longer expedition when consumable supply remains inadequate. A fuel unit, installed generator and loose container have different roles.

The Update-27-era community guide describes generators supplying engines without manual pipe wiring. It also explains **Ciphers** salvaged from procedural schematics and fitted to the corresponding schematic type, with advantages and drawbacks. [WA16](#wa16)

**Interpretation:** a customization can change what is produced repeatedly, not only one live engine. Its benefit still needs to match the ship's actual constraint. Improving theoretical power is less useful when fuel consumption or lift was already the limiting factor.

## 8. Items, inventory, weapons and armor

The personal inventory held resources, crafted items and tools. Historical guides distinguish a **belt** area whose contents could be protected from ordinary death drops, creating a small secure recovery layer. [WA40](#wa40)

Personal combat tools included firearms such as pistols and ammunition. Ship combat added cannons and other mounted weapons.

Conventional RPG armor was not a central progression system. Clothing was primarily visual in early versions, with later equipment/content evolving during Early Access. The meaningful “armor” problem often applied more strongly to **ship engineering**: protect a critical core or other components behind panels/structure.

There was no loot rarity treadmill comparable to Diablo. Loot value came from:
- schematics;
- better materials;
- recoverable components;
- fuel/Atlas resources;
- what could be salvaged from wrecks;
- what other players carried or built.

## 9. Combat: simple personal gunplay, deep physical context

On-foot combat was comparatively simple: aim, shoot, move, grapple, take damage. Critics generally did not identify the avatar shooting model as the game's strongest system. [WA32](#wa32) [WA33](#wa33)

But combat became more interesting because the **context was physical**:
- grapple around geometry while firing;
- board moving airships;
- destroy engines or lift components;
- cut mobility before boarding;
- salvage wreckage;
- collide/crash ships;
- use terrain and altitude;
- chase or escape through weather.

Massively OP's reviewer gave a good emergent example: destroying the device keeping an enemy ship aloft killed the target via the subsequent crash, while also killing the attacker in the wreckage. [WA33](#wa33)

### PvP and griefing

Open-world PvP was one of the most divisive parts of the game. Some players loved piracy, boarding and the fact that every encounter could become a story. Others found early zones hostile enough that onboarding and progression could be repeatedly erased. [WA33](#wa33) [WA43](#wa43)

SideQuesting described a feud escalating into ship destruction and spawn camping, while GameNChick described both hostile raiders and strangers who helped build communities. [WA35](#wa35) [WA44](#wa44)

**Design lesson:** meaningful loss can make encounters matter, but the cost of being someone else's interesting emergent story may be *your own inability to establish agency*. New-player protection, recovery cost and social density all shape whether danger feels thrilling or punitive.

## 10. Death, failure and recovery

Death could return a player through revival infrastructure, including a ship-linked respawn device where available. Ordinary carried resources could be lost, while belt-secured items reduced total reset severity. [WA31](#wa31) [WA40](#wa40)

Failure occurred at multiple scales:
- fall into the void;
- crash into terrain;
- die to another player;
- lose unsecured inventory;
- lose ship components;
- lose the entire ship;
- become stranded;
- need to salvage/rebuild.

The most consequential loss was often the **vehicle**, because it represented:
- gathered resources;
- engineering work;
- mobility into advanced zones;
- social identity;
- home/base function.

This made ships emotionally legible in a way stat-only gear often is not.

## 11. Weather, traversal gates and geography

The world was divided into regions/biomes separated by dangerous walls.

Historical documentation describes:
- **wind walls** with strong gusts and reduced control;
- **storm walls** adding lightning and severe visibility hazards;
- other region barriers used to distinguish progression tiers. [WA45](#wa45)

Crossing them tested the machine:
- enough thrust;
- redundancy;
- protected critical systems;
- instruments/navigation;
- pilot competence.

That is better than a purely numerical locked door because the same mechanics used in normal flight become the progression gate.

### Geography is vertical

Floating islands force players to think in:
- altitude;
- underside access;
- fall risk;
- ship parking/approach;
- launch arcs;
- storm routes.

Resources could physically fall off an island when mined. Massively OP specifically highlighted harvesting on island undersides as a skill because careless extraction could lose the material to the abyss. [WA33](#wa33)

## 12. Island Creator and player-authored world content

Bossa released a separate **Island Creator** that allowed players to sculpt islands and submit them for possible inclusion in the main world. By late 2016, PC Gamer reported more than 2,000 community-created maps in the tool's ecosystem. [WA46](#wa46)

PCWorld's earlier hands-on described caves, mountains, ruins and other locations as hand-crafted rather than procedurally repeated. [WA36](#wa36)

This creates an interesting hybrid:
- world topology/content authored by community members;
- curated/integrated by the developer;
- persistent MMO simulation running across those locations.

**OpenLegend lesson:** player invention does not have to mean “each player runs a separate modded server.” Community artifacts can enter a shared canon through a review/publishing pipeline.

<a id="8-island-creator-changes-who-authors-exploration"></a>
<a id="study-8"></a>

### Detailed study 8: Island Creator changes who authors exploration

Bossa's free **Island Creator** began as an internal tool, offering terrain, architecture and props, a playable test view and Workshop sharing. Selection into the live MMO was another step, not every upload's entitlement. [WA14](#wa14)

In the 2017 Williams interview, the team describes moving from procedural/handcrafted plans toward player-authored islands after receiving many submissions. Letting designers place loot made hidden caves or temples worth constructing; automatic placement could otherwise leave the reward outside the intended exploration. [WA15](#wa15)

**Constructed comparison:** hide a resource along a route with meaningful landmarks, test its grapple approach, then revise. The author chooses an experience, not just an attractive thumbnail. A huge inaccessible cave and a small purposeful puzzle may both look impressive; testing reveals whether the journey works.

**Interpretation:** a constrained contribution with a real consumer destination can reward creation. Not every contributor needs to implement networking or a whole game. Curation, credit and audience access still matter; an editor alone does not establish use or compensation.

The original service ultimately closed while the separate editor remained available. That preserves some expressive activity but removes its original destination inside a live MMO. A playable local artifact, a shared Workshop entry and inclusion in a persistent social world are different kinds of preservation.

## 13. Story, lore and quests

Worlds Adrift had setting/lore around:
- a shattered world;
- Atlas technology/mineral;
- ruins of former civilizations;
- discoverable lore/codex material.

But it intentionally lacked a conventional authored quest spine during the studied period. Reviewers noted that the player was largely left to explore, engineer, travel and create social stories. [WA44](#wa44)

This was initially exciting because it removed chores and quest-marker routine. It also became one of the project's acknowledged product gaps: by closure, Bossa discussed missing creatures, objectives, richer lore access, territory control, puzzles and large PvE encounters that would have given the sandbox more durable goals. [WA47](#wa47)

The distinction is crucial:
- **emergent narrative** answered “what happened to us?”;
- the game was weaker at consistently answering “what should we care about doing next?”

OpenLegend wants both.

<a id="7-discovery-connects-a-material-world-with-a-cultural-one"></a>
<a id="study-7"></a>

### Detailed study 7: Discovery connects a material world with a cultural one

**Codex** fragments record Foundation's history, particularly **Saborian** and **Kioki** cultures, and accumulate in a personal record. A fragment is another expedition reward, not merely scrap. [WA11](#wa11)

Clothing makes some history visible. **Albodan Ranger's Helm**, **Lark's Pilot Cap** and **Saborian Gunner's Helm** reference professions and places. Their descriptive fiction is not proof that every protective-sounding detail supplies a gameplay statistic. [WA12](#wa12)

**Interpretation:** player-built islands can belong to a particular world. Shared architecture and cultural vocabulary make discoveries more than arbitrary rocks. A ruin prompts a question; an object preserves a reference; a new crew builds its own story among the remains. This is not a conventional quest campaign with independently simulated representatives of every named culture.

#### Creature behavior makes harvesting a situated choice

The historical **Thuntomite** account describes normally docile creatures reacting aggressively to nearby tree cutting, with red coloration before a charge. Manta rays supply another flying presence. The general creature page is outdated and includes broader ecosystem aspirations; those do not establish an exhaustive functioning ecology. [WA13](#wa13)

**Constructed situation:** gather repair wood and risk disturbing nearby creatures, move elsewhere or prepare for the reaction. Resource need and method interact. This is bounded behavior, not a claim of elaborate private motives.

Update 27's food changes supplied temporary benefits such as movement/climbing improvements or reduced impact damage, with a new food replacing the old benefit. It also added cloth, dyes and more cooking support. [WA17](#wa17)

**Interpretation:** a meal can prepare the body for an intended journey rather than merely refill a lethal hunger meter. Replacement creates a choice instead of unlimited bonus accumulation. Cosmetic craft gives scavenged materials another purpose without requiring every object to increase combat power.

## 14. NPCs, creatures and AI

Worlds Adrift was player-centric rather than NPC-society-centric. It did not contain the kind of town simulation, schedule system or conversational agent ecology OpenLegend targets.

Creatures existed as part of the world; early demonstrations highlighted flying manta-like animals and ambitions for an ecosystem whose populations could be affected by player harvesting. [WA36](#wa36)

But Bossa's closure discussion makes clear that the envisioned PvE/ecology/content layer was not fully realized. Do not read prototype/press-demo ambitions as a complete shipped ecosystem simulation. [WA47](#wa47)

### OpenLegend lesson

Worlds Adrift is more useful for:
- physical agents;
- vehicles;
- resources;
- persistence;
- player encounters

than for NPC cognition. Its weakly filled social/PvE world also demonstrates that **a simulation substrate does not automatically generate compelling inhabitants.**

## 15. Crew, relationships and social play

Relationships were primarily **between real players**.

Players could:
- form crews;
- use crew chat;
- cooperate in ship construction;
- divide crafting specialization;
- crew stations/weapons;
- explore together;
- rescue each other;
- trade or share resources;
- encounter strangers through proximity chat;
- pirate/board others;
- form ad hoc alliances. [WA40](#wa40)

The Knowledge system could encourage specialization because fully researching every crafting family was expensive. A crew could therefore become socially differentiated by expertise rather than hard class. [WA33](#wa33)

This is a strong OpenLegend idea: **roles can emerge from learned capabilities and responsibility rather than class selection.**

There was no authored romance/friendship meter system comparable to a party RPG.

<a id="9-cooperation-piracy-and-the-boundaries-of-a-calmer-server"></a>
<a id="study-9"></a>

### Detailed study 9: Cooperation, piracy and the boundaries of a calmer server

Crew roles can emerge from the ship's needs: steering, spotting, repairs, gathering, gun operation or boarding. The community guide describes different useful statistics for engines, wings and weapons rather than a single ship score. [WA16](#wa16)

**Constructed coordination:** the pilot wants to flee, a repairer needs a stable position and a boarder wants to retrieve another component. All can be reasonable aims under incomplete information. A shared object makes their work interdependent; it also creates a need to agree about acceptable risk before an expedition.

#### A real episode exposes both skill and misunderstanding

In **Erron Kelly's May 2018 account**, an allied group disables an elevated PvP ship, then attempts salvage. His grapple-assisted transfer between ships is so fast that allies mistake him for the opponent and shoot. Kelly loves the movement and growing competence while acknowledging a thin loop, bugs and crashes. [WA18](#wa18)

**Interpretation:** the episode needs neither a generated plot nor a scripted betrayal. Movement, recognition, communication and a shared objective create it. The amusing retrospective does not prove that repeatedly being misidentified or losing hard work is acceptable to everyone.

#### PvE was changed, not simply impossible or universally safe

**Andrew Ross's June 2018 interview** challenges Bossa's belief that griefing was less prevalent than players feared: his own experience included substantial early harassment despite liking open-world PvP in principle. The developers then stressed the difficulty of removing harm from physical interactions and acknowledged incomplete non-PvP objectives. Their future skywhale ambitions are not treated as delivered encounters. [WA19](#wa19)

Update 27 subsequently introduced a hybrid PvE server. It disabled direct weapons, unauthorized salvage and several interactions in **Wilderness, Expanse and Remnants**, while **Badlands** retained PvP. [WA17](#wa17)

**Interpretation:** restricting specified harmful verbs can protect an audience without promising that every possible physical accident is impossible. It also changes social interpretation: a stranger on a calmer island is not governed by the same rules as a ship encountered beyond its protection. The earlier interview is evidence of a design stance that later changed, not a timeless impossibility theorem.

## 16. Economy and player trade

There was no central NPC-vendor/auction-house economy in the classic MMO sense. Value arose from:
- scarce better materials;
- schematics;
- crafted ship parts;
- time invested in ships;
- expertise;
- salvage;
- interpersonal exchange or theft.

This makes the economy **material and social** rather than primarily currency-mediated.

A creator of excellent engines or ship designs can matter because the object is useful, not because an NPC shop assigns it a gold value.

## 17. Five written critical/impressions sources

Worlds Adrift never reached a normal 1.0 review cycle. Metacritic indexes only one formal critic assessment. To meet the five-source written-reception goal without pretending previews are final reviews, this section uses one substantial Early Access evaluation plus four independently written hands-on/impressions pieces, clearly labeled.

### 1. Rock Paper Shotgun — Fraser Brown, May 29, 2018, Premature Evaluation

**Liked:** the freeform aviation/exploration loop, building a flying home, grappling, co-op potential and the pleasure of wandering among islands.

**Disliked / concern:** Brown was less convinced by the *MMO layer* than the “freewheeling aviation adventure”; the broader structure/objectives did not yet justify the scale of the persistent MMO. [WA48](#wa48)

This distinction became historically important because Bossa later described missing gameplay layers while the expensive infrastructure consumed development effort.

### 2. Massively Overpowered — Andrew Ross, May 21, 2018, first impressions

**Liked:** classless structure, active/player-skill gathering, grappling/climbing, material properties, physically meaningful ship construction and emergent ways to destroy another ship.

**Disliked / concern:** physics bugs could kill players; knowledge/schematic progression could be opaque; open PvP/new-player exposure felt likely to drive away parts of the MMO audience. [WA33](#wa33)

### 3. SideQuesting — Erron Kelly, May 2018, early impressions after ~50 hours

**Liked:** extreme skill ceiling of the grappling hook; absurd player encounters; ship construction and advancement through more dangerous regions; huge amount of explorable island space.

**Disliked / concern:** simple overall progression loop, crashes/bugs and the unmistakably unfinished nature of Early Access. The writer was enthusiastic despite explicitly describing those limits. [WA35](#wa35)

### 4. PCWorld — Hayden Dingman, August 2016, hands-on preview

**Liked:** physical comedy and emergent possibility from shared simulation; objects and ships behaving according to forces; community-authored islands; highly flexible ship designs; grappling/wingsuit exploration.

**Concern / limitation:** this was an invited pre-release demo, not a purchase recommendation or long-term population test. Its enthusiasm is useful evidence for *mechanical delight*, not proof that the MMO loop was sustainable. [WA36](#wa36)

### 5. GameNChick — June 1, 2018, multi-week impressions

**Liked:** exploration, the thrill of finding new handcrafted islands/players, community help, organic society/piracy and combining gunplay with grappling movement.

**Disliked / concern:** basic combat, lack of conventional story/quests, dependence on continued content/community growth and risk of griefing/ship loss. [WA44](#wa44)

## 18. Steam review evidence

Worlds Adrift's original store/review surface is partly archival after shutdown, so this pass does **not** claim a fresh exhaustive “top reviews” scrape. It records directly accessible historical review material and the surviving Steam ecosystem.

### Detailed surviving review — Bajeej {R}, posted 2017 / updated 2018

**Liked:** grappling/climbing, ship creation, component repair, material gathering, island aesthetics and wind-aware sailing.

**Disliked:** weak onboarding/tooltips; overlap between found schematics and knowledge-tree unlocks; progression frustration; travel bugs/slowdown in the reviewed state. [WA38](#wa38)

### Post-shutdown Steam community signal

The still-available **Worlds Adrift Island Creator** review page is dominated by highly helpful retrospective comments asking for the MMO to return. Longer examples specifically remember:
- shipbuilding;
- exploration with friends;
- the combination of peaceful vastness and lurking danger;
- desire for self-hosted/smaller multiplayer preservation. [WA49](#wa49)

Those reviews are about the surviving creator tool and memory of the MMO, not direct current reviews of a playable Worlds Adrift service.

### Shutdown-driven negatives

When Bossa announced the closure, PCGamesN reported a wave of new negative Steam reviews. At that point it described the overall store reception as about 67% positive. This is a historical storefront snapshot and is confounded by anger over product discontinuation, so it should not be treated as a clean gameplay-quality measurement. [WA50](#wa50)

## 19. Stable preference patterns

### Frequently praised

- grappling hook as a deep universal movement verb;
- physical airship construction;
- feeling that the player's ship was genuinely theirs;
- sailing/piloting skill;
- exploring surprising, handcrafted islands;
- co-op crew play;
- emergent piracy/boarding stories;
- material properties affecting engineering;
- risk and physical consequences;
- atmosphere of a vast sky and small human encounters.

### Frequently disliked or divisive

- sparse explicit objectives;
- opaque onboarding;
- physics/network bugs;
- heavy consequences from involuntary PvP;
- progression redundancy between knowledge and found schematics;
- performance/technical instability;
- simple personal combat;
- vulnerability of large time investments to wipes, bugs, piracy or eventual shutdown;
- dependence on a live service that could not be preserved as the original MMO.

These are qualitative patterns, not prevalence estimates.

<a id="10-art-sound-and-quiet-space-give-the-ship-somewhere-worth-going"></a>
<a id="study-10"></a>

### Detailed study 10: Art, sound and quiet space give the ship somewhere worth going

In his November 2018 music criticism, **Justin Olivetti** describes tapered characters, blended pastel colours and stylized floating islands. He values **Murugan Thiruchelvam's** atmosphere even though he is not personally drawn to the whole game. **Reflection** uses gentle repeating notes and reverberant bells; **Fight** feels more conventionally urgent; **Storm** sharply contrasts with the quieter music. [WA20](#wa20)

**Interpretation:** a demanding multiplayer system need not look oppressively realistic. Open sky and a softened visual vocabulary can support wonder, while exposed heights make a fall readable. Calm travel creates room for conversation and anticipation; making every moment an emergency would remove that contrast.

The music account is an attributed listening interpretation, not an independent soundtrack analysis conducted here. A composer credit establishes authorship, not the exact runtime rule selecting every cue.

The configuration interface likewise needs to translate material properties and component statistics into a useful decision. The new Knowledge tree and clearer logout/Reviver messages are concrete attempts to make hidden conditions more legible. Their presence does not establish that every failure was explained or every player understood the original simulation.

**Interpretation:** a ship's silhouette can communicate accumulated work, its motion can reveal imbalance and a ruined part can reveal damage. Good feedback allows a crew to distinguish a design problem from lag or a broken interaction. An otherwise rich simulation becomes much less useful when every symptom looks like the same malfunction.

<a id="14-reception-preserves-several-distinct-judgments"></a>
<a id="study-14"></a>

### Detailed study 14: Reception preserves several distinct judgments

| Source/account | What it values | Friction or scope |
| --- | --- | --- |
| Erron Kelly, May 2018 | Mastering the grapple and creating fast, emergent ship encounters. | Thin activity loop, bugs and crashes coexist with enthusiasm. [WA18](#wa18) |
| Andrew Ross, June 2018 | The idea of a physical, player-driven world; explicitly likes open-world PvP as a concept. | Finds early griefing and the gap between promises and current play substantial. Later hybrid rules differ. [WA19](#wa19) |
| Steam reviewer **123**, May 31, 2018 | Distinguishes enjoyable competition from purposeless destruction. | Repeated dismantling of rebuilt ships undermined their return; this predates the PvE server. [WA30](#wa30) |
| **Cavemanking**, July 11, 2019 | Bought into a family co-play project. | Waiting for fewer wipes/full release ended in losing the service altogether. [WA30](#wa30) |
| **Soup**, October 6, 2020 | Remembers flight and wreckage that recorded earlier battles. | The negative recommendation follows closure, not simple dislike of building. [WA30](#wa30) |
| **WitchKing**, April 28, 2023 | Misses schematics, crew crises and rebuilding. | A retrospective of a lost game, not evidence that official servers were running in 2023. [WA30](#wa30) |

**Interpretation:** admiration for a mechanic, willingness to accept risk, trust in continued access and a purchase recommendation are different judgments. Someone can love a game and reject recommending an unavailable service. A newcomer can accept defeat but not repeated destruction with no plausible route to recovery. More content does not automatically address either complaint.

These selected accounts are qualitative, not a representative sentiment analysis. Reported family relationships and experiences are attributed, not independently verified personal histories. Unsupported revenue estimates, insults, allegations about motives and hypothetical rescue strategies in the same discussions are not adopted as facts.

## 20. Production and commercial history

Worlds Adrift was unusually ambitious for Bossa: a persistent, physics-heavy MMO using Improbable's SpatialOS. Development lasted several years through alpha/beta and paid pre-Early-Access phases; Steam Early Access proper began in May 2018. [WA46](#wa46) [WA51](#wa51)

### Why Bossa said it closed

In Bossa cofounder Henrique Olifiers' retrospective, reported by Forbes, the studio attributed the situation to a combination of:
- technically demanding persistent physics;
- maintenance/technical debt absorbing resources;
- early commercial/access decisions;
- progression wipes;
- insufficient player population relative to the operating model.

Olifiers said player numbers were roughly a third of what the team believed it needed for a healthy service. This is the founder's causal account, not an experimentally isolated explanation. [WA51](#wa51)

Bossa's own shutdown FAQ framed the decisive fact more simply: the game had not attracted enough players to remain commercially viable. [WA52](#wa52)

Developer Luke Williams separately described major gameplay ambitions that never fully arrived because technical work consumed effort—more creatures, lore access, objectives, giant PvE targets, territory control and richer island puzzles among them. [WA47](#wa47)

### Closure

Bossa announced shutdown in May 2019. Servers ultimately closed in **July 2019**, making the original MMO unplayable as a live service. [WA52](#wa52)

The important OpenLegend causal loop is plausible without overclaiming:

> expensive persistent simulation → more maintenance pressure → less capacity for goals/content/polish → weaker ability to grow/retain enough players → less economic room to pay for the expensive simulation.

The evidence supports Bossa describing all of those pressures. It does **not** identify one mechanic as “the reason” Worlds Adrift failed.

<a id="11-production-player-authorship-did-not-eliminate-infrastructure-work"></a>
<a id="study-11"></a>

### Detailed study 11: Production: player authorship did not eliminate infrastructure work

A July 2018 developer interview describes the move from a small team toward a larger project, with more programmers and fewer artists because players supplied much of the island composition. Fixed ship classes gave way to component construction. The team curated submissions weekly and consulted experienced players. [WA21](#wa21)

The same account explains that **SpatialOS** developed alongside the game. Cannonballs and ships could cross responsibilities between physics servers, creating demanding synchronization work. This is the developer's technical explanation, not an independent claim that every transfer was flawless or that such an architecture is required for every cooperative game. [WA21](#wa21)

**Interpretation:** opening content production does not remove the need for cohesive standards, operating infrastructure or finished activities. It changes where the team's effort goes. A smaller art workload can coexist with a technically expensive service; counting authored islands would not reveal that cost.

The original game's ship and grapple mechanics were strong enough for people to form attachments. That does not contradict a failure to deliver a sustainable whole. Equally, an impressive networking achievement is not evidence that the resulting rate of production or audience size was sufficient.

#### The founder's retrospective is an explanation, not an isolated causal study

In **Matt Paprocki's June 17, 2019 Forbes account**, Olifiers connects restricted early sales, repeated wipes, technical debt and a maintenance-heavy development burden with insufficient growth. He says the player population was roughly one third of the level needed for a healthy service. [WA22](#wa22)

**Interpretation:** these factors can reinforce one another: operating difficulty constrains access, constrained access reduces attention, and limited resources slow improvements that might have helped. The account does not prove which alternative pricing, platform or architecture would have saved the game. Nor does it make an enthusiastic player's enjoyment fictitious.

<a id="12-distribution-promotion-and-the-ending-of-a-service"></a>
<a id="study-12"></a>

### Detailed study 12: Distribution, promotion and the ending of a service

The game used paid access, including an earlier restricted period followed by wider Steam Early Access, alongside a free Island Creator. It also introduced optional cosmetic purchases. The final FAQ distinguishes the base game's purchase window from refunds for the later in-game store. [WA01](#wa01) [WA14](#wa14) [WA23](#wa23)

A May 2018 Bossa announcement promoted a live broadcast from a mock skyship suspended above London. Its theatrical setting made the game's central fantasy visible outside the screen. The studio's claimed world-first wording is promotional, not independently established here. [WA24](#wa24)

**Interpretation:** grappling maneuvers, unusual ships, authored islands and a crew's rescue or defeat each provide a different sharing unit. A live spectacle can attract attention to that promise; it does not prove the ordinary session works or identify a percentage of purchases it caused. A free creator tool can attract contributors before they are buyers, but it still needs a worthwhile destination for their work.

#### July 26, 2019 was a shutdown, not merely the end of new updates

The official FAQ announced that characters, ships and items would cease to be accessible. It offered refunds for a specific recent purchase window and all in-game-store purchases, made cosmetics free for the final period and retained Island Creator without its live-game destination. [WA23](#wa23) Contemporary farewell reporting records the actual shutdown on **July 26, 2019**, with an organized final event. [WA25](#wa25)

**Interpretation:** a goodbye event can honor shared memories without preserving the thing people bought access to. A creator tool remaining available is valuable but not an equivalent replacement for a crew's ship in its inhabited world. This differs materially from Dreams ending live development while retaining play/create/share.

A developer reply on May 30 describes third-party redistribution constraints, the proprietary hosted network and the work needed to replace those dependencies. It also says the team explored potential partners. [WA26](#wa26) These are the developer's account of its circumstances, not legal advice or a proof that future independent reconstruction is impossible.

No audited unit-sales, current-active-user or title-profit dataset is supplied. Original Steam approval after closure cannot be treated as a clean measure of how much people enjoyed the active game's mechanics. Support costs and the loss of access belong to the commercial evaluation too.

## 21. Persistence, wipes and the meaning of ownership

Worlds Adrift sold the fantasy of a persistent world where a player's ship and discoveries mattered. That magnifies the cost of:
- server wipes;
- lost ships;
- bugs;
- shutdown.

Bossa's retrospective specifically mentions wipes as harmful to momentum. [WA51](#wa51)

This should not be confused with OpenLegend's development-stage policy where incompatible saves may intentionally be discarded. The relevant lesson begins once players are invited to treat a world as durable:

**persistence is a product promise, not merely a database implementation detail.**

The stronger the emotional/creative investment, the more carefully migration, export and closure need to be designed.

<a id="6-persistence-distinguishes-absence-from-continuous-simulation"></a>
<a id="study-6"></a>

### Detailed study 6: Persistence distinguishes absence from continuous simulation

Update 30 saves offline ships separately, distinguishes **Logout** from **Exit**, and permits interaction to interrupt a ship's logout. It improves messages about lost Reviver links without guaranteeing restoration. [WA05](#wa05)

**Constructed situation:** the last registered crew member wants to leave. Closing the application is not necessarily the same as waiting for the shared ship to leave the active world. A companion's association and another person's interaction can affect the outcome. The interface must explain the commitment where the player leaves.

The release ties **Blight** to server slowdown and prioritizes destruction using object cost and player importance, while improving direction/danger cues. [WA05](#wa05)

**Interpretation:** operational cleanup expressed as weather becomes part of the risk environment. It is understandable only when warnings and behavior are coherent. Resource pressure is not automatically an interesting fictional threat. Storing an absent ship can honor continuity without simulating every part; deleting it to recover performance is another promise.

The original chapter's wipe warning remains intact. It does not invalidate OpenLegend's different development-save policy. Durable public investment needs a contract distinct from prototype iteration.

#### Recovery has protected and exposed possessions

The community guide distinguishes protected Belt/Stash holdings from dropped ordinary inventory, with registered Revivers supplying respawn choices. Food restores health, and the guide differentiates local communication from long-distance crew chat. These are native human coordination channels, not evidence of language-model crew members. [WA16](#wa16)

**Constructed decision:** keep a recovery tool in protected storage before a dangerous attempt, while accepting that harvested cargo remains at risk. A return point helps only if it is associated with a ship or place that still serves the recovery plan. Retaining an item, retaining the ship and returning to the crew are separate outcomes.

Update 27 added a Reviver **containment-charge** cost that grows with respawn distance. Exhaustion can damage the ship; docking replenishes charge. [WA17](#wa17)

**Interpretation:** repeated resurrection can become a shared ship-management issue rather than a private free retry. It can also create resentment if one person's experimenting consumes the group's resilience. The rule needs to be understood before a crew treats a distant death as harmless.

## 22. Successor boundary: Lost Skies

Bossa later returned to the concept with **Lost Skies**. The developer explicitly says it is *not* a sequel, but a new game inspired by Worlds Adrift's skyships, grappling, gliders and exploration. The architecture/product model is materially different: solo and smaller-scale online co-op rather than one persistent PvP MMO. [WA53](#wa53)

Lost Skies entered Early Access April 18, 2025 and released 1.0 on **September 17, 2025**. Its Steam page in September 2026 describes single-player and online co-op and shows mixed English user reception. [WA54](#wa54)

Bossa's current FAQ retrospectively says that Worlds Adrift's technology stack, including SpatialOS, would have required extensive rebuilding and that a free-to-play conversion would have required fundamental redesign. Treat those as the developer's current explanation, not independent validation. [WA53](#wa53)

This dossier does not use Lost Skies reception to rewrite Worlds Adrift's historical mechanics.

<a id="13-successor-and-community-reconstruction-three-separate-objects"></a>
<a id="study-13"></a>

### Detailed study 13: Successor and community reconstruction: three separate objects

**Lost Skies** is a separate Bossa game. Its store page records Early Access on April 18, 2025 and release on September 17, 2025, with solo/cooperative play and its own Island Creator. It is not the restoration of original Worlds Adrift characters, ships or its public PvP economy. [WA27](#wa27)

In a developer interview published by **coherence**, Williams and Mark Dugdale explain evaluating multiplayer technology through prototypes in early 2022, then starting Lost Skies production later that year. They frame it as inspired by, rather than simply a sequel to, Worlds Adrift. Praise for the vendor's reliability is attributed promotional interview evidence, not an independent benchmark. [WA28](#wa28)

**Interpretation:** a creator can preserve an activity's valued core while deliberately changing its operating and social scope. That is a design response, not proof that the original service secretly remained available. A successor can also serve a different audience from people who wanted the original conflict-heavy MMO.

**Worlds Adrift Reborn** is a community reconstruction project, not an official reopening. Its README, read through the GitHub connector on September 26, 2026, describes replacement infrastructure and partial demonstrations: client loading, entity spawning, login/character work and basic clothing/glider state. [WA29](#wa29)

**Interpretation:** this is stronger evidence than a petition or a speculative forum title, but weaker than a complete playable restored MMO. This research did not execute its binaries, test compatibility or certify security, authorization or feature completeness. Its existence qualifies any absolute claim that reconstruction can never be attempted without converting a partial project into a finished service.

## 23. Transferable inspiration for OpenLegend

### A. Give players verbs whose usefulness is not predetermined

Grapple is a traversal mechanic, rescue mechanic, boarding mechanic, cargo mechanic and improvisation mechanic because it interacts with shared physics.

For OpenLegend, analogous primitives might include:
- attach/detach;
- contain/pour;
- heat/cool;
- bind/release;
- push/pull;
- own/permit;
- teach/learn;
- promise/break;
- observe/conceal.

The more systems recognize the same verbs, the more emergent reuse becomes possible.

### B. Vehicles should be compositions of capability-bearing components

A ship becomes interesting when:
- engine gives thrust;
- core gives lift;
- cannon gives force/damage;
- helm exposes control;
- structure protects;
- instruments expose information.

Then damage, invention and repair all operate on the same object graph.

### C. Progression gates can be physical tests

A storm wall asks “is your machine and pilot ready?” rather than “is level >= 20?”

OpenLegend can use:
- environmental constraints;
- social permissions;
- knowledge requirements;
- material requirements;
- actual skill

instead of arbitrary level doors when appropriate.

### D. User-generated spaces can enter a shared world through curation

Island Creator is a clean precedent for player-made geography being promoted into a common universe without requiring every live client to accept arbitrary code.

### E. Emergence still needs authored/structured reasons to care

Worlds Adrift could generate extraordinary anecdotes but Bossa itself later described a shortage of goals, richer creatures, lore access, PvE targets and territory systems.

For OpenLegend, “agents can do anything” is not enough. Players need:
- goals they choose;
- goals others create;
- world pressures;
- relationships;
- institutions;
- mysteries;
- consequences;
- visible opportunities.

### F. Infrastructure ambition should follow demonstrated gameplay value

OpenLegend should not assume “persistent shared world” automatically means MMO-scale global simulation. The smallest authority model that preserves the actual player value is strategically safer.

### G. Design the shutdown/degradation path before promising permanence

A server-dependent invention/world format should answer:
- can players export?
- can they self-host?
- can the world be archived?
- what remains functional offline?
- what happens to community creations if discovery disappears?

The Worlds Adrift Island Creator reviews show how much emotional value remained trapped in a dead service.

<a id="15-transferable-patterns-and-limits-for-openlegend"></a>
<a id="study-15"></a>

### Detailed study 15: Transferable patterns and limits for OpenLegend

**A home can be an executable construction.** The ship's material, placement, repair and travel consequences make it more than a cosmetic base. A good invention should change what people can attempt, not only what they can display.

**Different tools should solve different gaps.** A grapple needs an anchor; a glider spends height; a lifter handles detached salvage; an Atlas Core supports an assembled ship. Their restrictions create useful composition rather than one universally superior movement command.

**Autonomy and participation need a clear social contract.** An unfamiliar crew can supply help, a shared expedition or unwanted loss. A persistent-world promise needs deliberate permissions and recovery, not an assumption that every dramatic event is welcome because it can become a clip.

**Player-made content needs consumer purpose.** An island with a deliberate route and reward is a small complete contribution. An editor, a large submission count and a live-world inclusion process are separate achievements.

**Persistence is not continuous execution.** Storing an absent ship can honor continuity without spending resources simulating it. A truthful logout explanation and a dependable recovery record matter as much as the original physics demonstration.

**Do not generalize the closure into an impossibility claim.** The historical operating model failed to sustain this service. That does not prove that small-group skyship play, user-authored islands or ambitious physical worlds cannot work. The useful question is whether the chosen scope can deliver and preserve an activity people value within its actual costs.

## 24. Requirement and preservation check

| Requirement | Coverage |
| --- | --- |
| R01 identity / promise | §§1–2 |
| R02 player actions / mechanics | §§3–16 |
| R03 items / entities / composition | §§6–8 |
| R04 progression / economy / time | §§5–6, 16, 20–21 |
| R05 concrete interactions | §§3–10 |
| R06 people / AI / social / multiplayer | §§9, 14–16 |
| R07 art / audio / interface / feel | §§3, 11–12, 17–19 |
| R08 story / narrative | §13 |
| R09 production | §§20–22 |
| R10 distribution / promotion / virality | §§12, 20 |
| R11 commercial / participation | §§20–22 |
| R12 reviews / player feedback | §§17–19 |
| R13 transferable inspiration / limits | §23 |
| R14 sources / preservation / navigation | this section + sources |

**Preservation check:** the earlier chapter's finding is retained: Bossa's founder linked the shutdown to persistent-physics complexity, wipes/technical debt and insufficient player population; that is an attributed developer account, not a single-cause proof. The continuity lesson is specifically about products that have invited durable player investment.

<a id="16-coverage-viewing-routes-and-preservation"></a>
<a id="study-16"></a>

### Detailed study 16: Coverage, viewing routes and preservation

For a concrete starting route, pair the construction guide with the material/tool entries, then read the two original play/interview accounts and the final patch changes. Follow the official closure FAQ and its linked developer response together. For cultural and sensory context, the Codex/clothing entries and Olivetti's soundtrack essay provide named examples rather than generic praise.

The soundtrack essay links **Reflection**, **Fight**, **Sunrise**, **Stars** and **Storm** recordings. The original play article embeds grapple footage; the July 2019 farewell reporting points to the final broadcast. These are verified viewing/listening routes, not recordings watched in full or invented timestamp evidence. Island Creator's historical submission workflow does not presently publish into the original game.

**Per-game preservation:** the full original `games/worlds-adrift.md`, the supplied master's §5.3 and its WA1 source entry were read and compared. Their founder-attributed explanation, operating-cost feedback loop, small-scope recommendation and distinction between public continuity and development-save policy remain unchanged. This dossier adds the missing gameplay, creation, presentation and reception research rather than replacing the earlier account. Original source/review/economic/viewing registers remain in their owners. The seven-file packet-wide audit is still a separate pending gate.

**Evidence limits:** no personal gameplay, source-code audit, restored-service test, complete-video inspection, representative survey, private budget or controlled growth attribution. Historical wiki entries contain outdated notes and conflicting values; specific later patch records qualify them. Engine-overheat visuals were not treated as proof the feature was active, and old cannon exclusions were not repeated after notes changed player impacts. The community reconstruction README is evidence of its documented scope, not verified execution. A full research pass does not turn every old page into an exact final-version simulator.

## Sources

<a id="wa31"></a>**WA31 — [Getting Started — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Getting_Started).** Historical community-maintained official wiki. Used for controls, grapple, scanning, resources, early crafting and ship requirements. Page itself warns portions are outdated; exact tuning is not generalized beyond the live-era system.

<a id="wa32"></a>**WA32 — [Worlds Adrift overview](https://mmohuts.com/review/worlds-adrift).** MMOHuts archival overview. Used for concise released-system summary and broad pros/cons; current “playerbase” labels are irrelevant after shutdown.

<a id="wa33"></a>**WA33 — [First impressions of Worlds Adrift: Innovation, Zelda, open-world PvP, and that sinking feeling](https://massivelyop.com/2018/05/21/first-impressions-of-worlds-adrift-innovation-zelda-open-world-pvp-and-that-sinking-feeling/).** Andrew Ross, Massively Overpowered, 2018-05-21. Independent Early Access impressions; detailed material/knowledge/PvP/physics observations.

<a id="wa34"></a>**WA34 — [Getting started in Worlds Adrift](https://steamcommunity.com/sharedfiles/filedetails/?id=933004497).** Steam community guide, 2017. Historical player mechanics documentation for grapple, resources, knowledge, material properties and zones. Version-specific.

<a id="wa35"></a>**WA35 — [Early Impressions: Worlds Adrift](https://www.sidequesting.com/2018/05/early-impressions-worlds-adrift/).** Erron Kelly, SideQuesting, 2018-05. Fifty-hour Early Access impressions; grapple mastery, region progression, PvP anecdotes, crashes and sparse loop.

<a id="wa36"></a>**WA36 — [Worlds Adrift hands-on preview: Systems, sky pirates, and hilarious surprises](https://www.pcworld.com/article/416008/worlds-adrift-hands-on-preview-systems-sky-pirates-and-hilarious-surprises.html).** Hayden Dingman, PCWorld, 2016-08-11. Invited hands-on; strong direct examples of physical components, weather destruction, Island Creator and ship editor. Preview enthusiasm is not treated as launch review evidence.

<a id="wa37"></a>**WA37 — [Knowledge — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Knowledge).** Historical community mechanics reference for scanning, Knowledge Tree branches, schematic capacity and Sky Core upgrade thresholds. Exact costs are version-specific.

<a id="wa38"></a>**WA38 — [Bajeej {R} review for Worlds Adrift](https://steamcommunity.com/id/thinkpadius/recommended/322780/).** Steam user review, posted 2017 and updated 2018. Detailed praise of grapple/ships/sailing and criticism of onboarding, progression overlap and bugs. One self-selected player.

<a id="wa39"></a>**WA39 — [Resources — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Resources).** Historical community reference for wood, metal, fuel and Atlas shards.

<a id="wa40"></a>**WA40 — [Worlds Adrift — Comprehensive Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=932986882).** Steam community guide, updated through 2018. Controls, belt/death behavior, crafting stations, ship frames, crew/chat and equipment. Historical/version-specific.

<a id="wa41"></a>**WA41 — [Ships](https://worldsadrift.fandom.com/wiki/Ships) and [Atlas Sky Core](https://worldsadrift.fandom.com/wiki/Atlas_Sky_Core).** Historical community mechanics documentation for ship component graph, lift/weight and vulnerability.

<a id="wa42"></a>**WA42 — [Engines — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Engines).** Historical mechanics description of engine thrust, power/fuel and placement context.

<a id="wa43"></a>**WA43 — [Worlds Adrift PvP / PvE discussion](https://forums.mmorpg.com/discussion/475427/worlds-adrift-promises-future-pve-servers).** Player discussion preserving contemporary new-player/PvP concerns. Anecdotal and not treated as population research.

<a id="wa44"></a>**WA44 — [Worlds Adrift Impressions (PC)](https://www.gamenchickgaming.com/post/worlds-adrift-impressions-pc).** GameNChick, 2018-06-01. Multi-week written impressions; exploration, community, absent quest structure, PvP/griefing, island creation and basic combat.

<a id="wa45"></a>**WA45 — [Weather — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Weather).** Historical documentation of wind/storm walls, wind forces, lightning and visibility.

<a id="wa46"></a>**WA46 — [Worlds Adrift announces 'biggest playtest' yet](https://www.pcgamer.com/worlds-adrift-announces-biggest-playtest-yet/) and [Early Access announcement](https://www.pcgamer.com/worlds-adrift-docks-on-early-access-next-month/).** PC Gamer, 2016/2018. Progression/Island Creator milestone and Early Access transition.

<a id="wa47"></a>**WA47 — [Worlds Adrift Review: Struggles of the Skyship MMO](https://cjleo.com/blog/worlds-adrift-ends-triumphs-and-challenges-of-the-skyship-mmo/).** C. J. Leo, 2019 retrospective citing Bossa's closure material. Used for preserved developer statement about missing gameplay layers; secondary analysis is not treated as independent causal proof.

<a id="wa48"></a>**WA48 — Rock Paper Shotgun, “Premature Evaluation: Worlds Adrift,” Fraser Brown, 2018-05-29.** The surviving indexed text is available through the [Steam/RPS news archive](https://store.steampowered.com/news/?appgroupname=Worlds+Adrift+-+Early+Access+MMO&appids=322780&feed=rps&headlines=1) and Metacritic's archived review entry. Used for the critic's explicit split between loving freewheeling aviation and being unconvinced by the MMO layer.

<a id="wa49"></a>**WA49 — [Worlds Adrift Island Creator — top-rated Steam reviews](https://steamcommunity.com/app/271920/reviews/?browsefilter=toprated).** Post-shutdown player testimony about remembered exploration, shipbuilding, friendship and desire for preservation/self-hosting. Reviews concern the surviving creator tool and memories of the MMO, not a playable current MMO.

<a id="wa50"></a>**WA50 — [Worlds Adrift is getting review-bombed because its servers are shutting down](https://www.pcgamesn.com/worlds-adrift/review-bombs).** PCGamesN, 2019-06-03. Historical store-sentiment snapshot and shutdown-driven negative-review context.

<a id="wa51"></a>**WA51 — [Bossa Studios' Cofounder Speaks Openly On Worlds Adrift's Closure](https://www.forbes.com/sites/mattpaprocki/2019/06/17/bossa-studios-founder-speaks-openly-on-worlds-adrifts-closure/).** Matt Paprocki, Forbes, 2019-06-17, reporting Henrique Olifiers' account. Used as attributed founder explanation for technical debt, persistence complexity, wipes, sales/population and service economics.

<a id="wa52"></a>**WA52 — [The End of Worlds Adrift FAQ](https://steamcommunity.com/app/322780/discussions/0/1644290458825484411/).** Bossa Studios pinned Steam FAQ, 2019-05-29. Primary shutdown/commercial-viability statement and July closure plan.

<a id="wa53"></a>**WA53 — [Lost Skies FAQs](https://lostskiesgame.com/announcement-faqs).** Bossa Studios current official FAQ, accessed 2026-09-26. Used only to distinguish Lost Skies from Worlds Adrift and report Bossa's retrospective technology/F2P explanation.

<a id="wa54"></a>**WA54 — [Lost Skies on Steam](https://store.steampowered.com/app/1931180).** Current product surface accessed 2026-09-26. Establishes April 18, 2025 Early Access, September 17, 2025 1.0, single-player/online co-op and current review snapshot; not used to score Worlds Adrift.

<a id="annotated-sources"></a>

### Additional annotated evidence

<a id="wa01"></a>**WA01 — [Bossa's Steam description](https://store.steampowered.com/app/322780/Worlds_Adrift/), inspected September 26, 2026.** Primary original activity, Foundation and delisting. Old roadmap is not current delivery.

<a id="wa02"></a>**WA02 — [Bossa interview](https://www.shacknews.com/article/88230/bossa-studios-talks-about-going-bigger-with-worlds-adrift), Ozzie Mejia, February 20, 2015.** Original intentions, influences and physical-object explanation. Later cleanup rules qualify unlimited-persistence rhetoric.

<a id="wa03"></a>**WA03 — [Beginner's guide](https://www.pcgamesn.com/worlds-adrift/worlds-adrift-beginners-guide), updated May 22, 2018.** Bossa-sponsored practical explanation, not independent reception. Old scan-everything progression superseded by WA05.

<a id="wa04"></a>**WA04 — [Atlas Sky Core](https://worldsadrift.fandom.com/wiki/Atlas_Sky_Core).** Historical community lift/torque/pulse rules. No independent balance test.

<a id="wa05"></a>**WA05 — [Developer news archive](https://steamcommunity.com/app/322780/allnews/), March 19/May 1, 2019.** Primary knowledge/logout/Reviver/Blight changes. Final wording controls over stronger test-server restoration promises.

<a id="wa06"></a>**WA06 — [Glider](https://worldsadrift.fandom.com/wiki/Glider).** Indexed historical mechanics with outdated warning. Planned updrafts not assumed delivered.

<a id="wa07"></a>**WA07 — [Atlas Lifter](https://worldsadrift.fandom.com/wiki/Atlas_Lifter).** Indexed detached-part handling and shipyard boundary; no unrestricted lift stacking.

<a id="wa08"></a>**WA08 — [Metal](https://worldsadrift.fandom.com/wiki/Metal).** Indexed material/quality relationships; direct access blocked. No complete final-patch stat-table claim.

<a id="wa09"></a>**WA09 — [Fuel](https://worldsadrift.fandom.com/wiki/Fuel).** Indexed recipe/propulsion/container rules. Reported lingering grapple-point bug excluded as intended behavior.

<a id="wa10"></a>**WA10 — [Weather](https://worldsadrift.fandom.com/wiki/Weather).** Indexed barriers and strategic discussion. Unconfirmed conductivity and universal minimum builds excluded.

<a id="wa11"></a>**WA11 — [Codex](https://worldsadrift.fandom.com/wiki/Codex).** Indexed cultural fragments; counts and old point awards are not completeness claims.

<a id="wa12"></a>**WA12 — [Clothes](https://worldsadrift.fandom.com/wiki/Clothes).** Indexed named items and fiction. Description is not proof of a defensive modifier.

<a id="wa13"></a>**WA13 — [Creatures](https://worldsadrift.fandom.com/wiki/Creatures).** Indexed selected Thuntomite behavior; page explicitly outdated. Broader ecosystem language remains unverified.

<a id="wa14"></a>**WA14 — [Island Creator listing](https://store.steampowered.com/app/271920/Worlds_Adrift_Island_Creator/).** Primary editor/test/share scope. Historical invitation to the MMO is not current availability.

<a id="wa15"></a>**WA15 — [Luke Williams interview](https://www.pcgamesinsider.biz/interviews-and-opinion/66011/), Alex Calvin, August 2017.** Original authored-island and loot-placement account. Submissions are not accepted islands or paid creators.

<a id="wa16"></a>**WA16 — [Community beginner reference](https://steamcommunity.com/sharedfiles/filedetails/?id=932986882&l=french), james, updated December 15, 2018.** English body by a volunteer community moderator. Recovery, communication, ciphers and component roles. Some heat/cannon claims conflict with patch notes and are not adopted.

<a id="wa17"></a>**WA17 — [Update 27 archive](https://worldsadrift.fandom.com/wiki/Update_27), October 9, 2018.** Reproduced developer notes; specific hybrid PvE, food and containment-charge changes. Its old scan-based tutorial and logout timing are qualified by later WA05.

<a id="wa18"></a>**WA18 — [Early Impressions](https://www.sidequesting.com/2018/05/early-impressions-worlds-adrift/), Erron Kelly, May 2018.** Original purchased-copy play account. Mistaken-identity episode and enthusiasm are attributed; retaliatory harassment elsewhere in the article is not recommended.

<a id="wa19"></a>**WA19 — [Giving, griefing and design interview](https://massivelyop.com/2018/06/27/interview-worlds-adrifts-bossa-studios-on-giving-griefing-and-gittin-gud/), Andrew Ross, June 27, 2018.** Original criticism and developer replies. Later hybrid rules supersede the categorical earlier PvE stance; proposed skywhales not claimed delivered.

<a id="wa20"></a>**WA20 — [Soundtrack criticism](https://massivelyop.com/2018/11/13/jukebox-heroes-worlds-adrifts-soundtrack/), Justin Olivetti, November 13, 2018.** Original visual/listening impressions and composer credit. Recordings linked, not independently listened to in full.

<a id="wa21"></a>**WA21 — [Player-led production interview](https://www.gamedeveloper.com/design/how-bossa-relied-on-players-to-help-build-its-skyfaring-mmo-i-worlds-adrift-i-), July 2018.** Direct Bossa account of staffing, curation and concurrently developed SpatialOS. Not an independent reliability or cost benchmark.

<a id="wa22"></a>**WA22 — [Founder closure retrospective](https://www.forbes.com/sites/mattpaprocki/2019/06/17/bossa-studios-founder-speaks-openly-on-worlds-adrifts-closure/), Matt Paprocki, June 17, 2019.** Substantive indexed report; direct page unavailable. Preserves attributed explanations, not isolated causality or an audited title budget.

<a id="wa23"></a>**WA23 — [Official closure FAQ](https://steamcommunity.com/app/322780/discussions/0/1644290458825484411/), May 29–30, 2019.** Primary access, refund and surviving-editor boundaries. Historical compensation windows are not present refund advice.

<a id="wa24"></a>**WA24 — [Bossa's cross-game announcement archive](https://steamcommunity.com/app/327890/allnews/), May 2018.** Studio-posted suspended-skyship launch promotion. World-first marketing wording and causal impact unverified.

<a id="wa25"></a>**WA25 — [Final-day reporting](https://mmos.com/news/worlds-adrift-officially-shutting-down-later-today-end-of-the-world-event-starts-at-7am-pdt), July 26, 2019.** Contemporary exact shutdown date and farewell-event route. Broadcast not watched in full; historical schedule not a future event.

<a id="wa26"></a>**WA26 — [Developer preservation reply](https://steamcommunity.com/app/322780/discussions/0/1644290458825499424/?ctp=3), Nar'Gall, May 30, 2019.** Direct account of third-party dependencies, hosting and attempted partners. Not independent legal analysis, proof of future impossibility or adoption of hostile replies.

<a id="wa27"></a>**WA27 — [Lost Skies listing](https://store.steampowered.com/app/1931180/Lost_Skies/?l=english), inspected September 26, 2026.** Primary separate product, release dates, solo/co-op and creation scope. No transfer of original characters or current price/review comparison inferred.

<a id="wa28"></a>**WA28 — [Bossa retrospective at coherence](https://coherence.io/blog/developer-interviews/lost-skies-bossa), 2025.** Direct creator account hosted by the selected technology vendor. Technology evaluation and scope change, not independent performance validation.

<a id="wa29"></a>**WA29 — [Worlds Adrift Reborn README](https://github.com/WAReborn/WorldsAdriftReborn/blob/main/README.md), retrieved September 26, 2026; blob `61ff3ed40ae8d34b4847f752d06f78bad9676084`.** Community's own partial-capability description, read through GitHub. No executed install, complete restoration, security audit or official endorsement claimed.

<a id="wa30"></a>**WA30 — [Selected negative Steam review bodies](https://steamcommunity.com/app/322780/negativereviews/?browsefilter=toprated).** Direct dated accounts by 123, Cavemanking, Soup and WitchKing. Dynamic nonrandom listing; postclosure recommendations and historical gameplay criticism distinguished. No revenue estimate or inferred reviewer age.
