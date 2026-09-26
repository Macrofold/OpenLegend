# Worlds Adrift — full research dossier

**G15 · Complete research pass, September 26, 2026.** This dossier covers Bossa Studios' original persistent sandbox MMO through its July 2019 shutdown. It does **not** silently substitute the later game *Lost Skies*: that title is a separate, non-MMO successor-in-spirit built from some of the same ideas. [Preserved earlier chapter](../games/worlds-adrift.md) · [Requirements](../research-requirements.md) · [Progress](../research-progress.md).

Worlds Adrift is one of the most important OpenLegend references in this library because its most memorable mechanics were not abstract stat systems. They were **physical verbs**—grapple, swing, climb, glide, lift, attach, repair, sail, board, shoot, salvage—and a player-built vehicle that turned those verbs into emergent stories. It is also a warning about coupling a mechanically expensive simulation to an always-online MMO operating model before the surrounding game has enough durable reasons to stay.

## 1. Identity and player promise

Worlds Adrift was an Early Access PC sandbox MMO from Bossa Studios built around a persistent shared sky-world of floating islands. The basic fantasy was unusually legible:

1. wake on an island;
2. learn to move with the grappling hook;
3. scan the world for Knowledge;
4. gather wood, metal, Atlas shards and other resources;
5. unlock shipbuilding;
6. construct an airship whose mass, lift, thrust and component placement matter;
7. leave the island;
8. cross hazardous weather walls into richer regions;
9. explore ruins and player-authored islands;
10. meet, cooperate with, evade, board or fight other players;
11. salvage, improve and rebuild after losses. [WA01](#wa01) [WA02](#wa02)

The game intentionally rejected many standard MMO structures. A 2018 critic noted the absence of normal classes, trinity roles, auction houses, NPC vendors, dungeons and conventional quest chains. Advancement centered on knowledge, schematics, materials, tools, ship capability and player skill. [WA03](#wa03)

The strongest player promise was therefore **“become more capable at moving through and engineering the world”**, not “raise your character level until numbers increase.”

## 2. Character creation and identity

Players created a humanoid avatar for a server. Contemporary impressions praised the visual character customization as flexible enough to evoke familiar RPG archetypes, but appearance was not a class choice. [WA03](#wa03)

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
- launch from one moving platform toward another. [WA01](#wa01) [WA04](#wa04)

Climbing allowed free ascent on suitable vertical surfaces. A glider expanded long-distance aerial movement. Later controls also supported first-person views for constrained spaces or aiming. [WA01](#wa01)

This produced a useful **skill gradient**:
- novice: grapple as an emergency tether;
- intermediate: deliberately swing to move efficiently;
- expert: use speed, rope length, ship motion and terrain to board or traverse enormous gaps.

SideQuesting's reviewer described going from repeated early deaths to deliberately slingshotting around ships and islands, calling the grappling hook one of their favorite mechanics in years. [WA05](#wa05)

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

## 4. Physics as world law

Worlds Adrift's physical simulation was not decorative. Mass, thrust, wind, impact and component destruction could alter actual outcomes.

PCWorld's hands-on preview captured the design well: a too-heavy cannon was given an anti-gravity device, grappled toward a ship, accidentally smashed into the hull, broke pieces off and then tumbled into the void. In another storm, ship components detached one after another; a developer attempted to use an explosive on debris as improvised propulsion. The attempt failed, but the simulation could in principle produce such an outcome. [WA06](#wa06)

The key design property is **shared causality**:
- a component is a physical object during construction and destruction;
- a cannon has mass before it has “weapon” meaning;
- a storm applies forces rather than merely debuffing “ship speed”;
- destroyed lift or propulsion changes what the vehicle physically does.

This makes accidents narratively interesting because they are consequences of reusable laws.

### OpenLegend implication

Where feasible, reusable world laws should sit below content-specific mechanics. “Explosion applies impulse and damage” is more generative than “explosion can only break objects explicitly tagged for this quest.” The cost, demonstrated later in the lifecycle section, is engineering and runtime complexity.

## 5. Knowledge progression and the tech tree

**Knowledge** was the closest equivalent to experience. Players gathered it by scanning:
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
- later Sky Core upgrades and related capability. [WA07](#wa07)

The progression loop therefore linked **curiosity to capability**: exploration of an island directly improved what a player could engineer.

### Schematics create a parallel discovery progression

Schematics could also be found in chests/ruins. This meant knowledge-tree unlocks and world-found schematics overlapped. A detailed Steam reviewer liked both ideas independently but criticized the redundancy: finding a schematic could make spending knowledge on the same branch feel wasteful even when that investment was required to reach later nodes. [WA08](#wa08)

This is a useful warning for OpenLegend progression:
- **discovery unlocks** feel special because the world gave you something;
- **tree unlocks** feel agentic because you chose a path;
- if both grant the same entitlement without meaningful distinction, one can invalidate the other.

A better composition is often:
- research grants understanding/general capability;
- discovery grants a unique implementation/recipe/variant.

## 6. Resources and crafting

Important resource families included:
- **wood** — often useful for lighter structural components;
- **metal** — ship parts, tools, weapons/ammunition;
- **Atlas shards** — anti-gravity / Sky Core-related technology;
- **fuel** — propulsion/power needs;
- recovered/salvaged components and schematics. [WA01](#wa01) [WA09](#wa09)

Materials were not always interchangeable commodities. Historical guides describe different weight/quality properties affecting the resulting ship component. That made gathering partly an engineering decision: a heavy high-quality material might be useful for durability but harmful to a weight-limited craft. [WA04](#wa04)

Crafting happened through the player's gauntlet and stations such as an Assembly Station. Large ship parts were produced into the physical world and moved/attached rather than becoming abstract inventory icons forever. [WA10](#wa10)

### Tool loop

The gauntlet supported multiple functions:
- salvage;
- repair;
- lift/manipulate;
- scan for Knowledge.

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
- utility parts. [WA10](#wa10) [WA11](#wa11)

### Lift and weight

An Atlas Sky Core supplied anti-gravity lift up to a capacity. Larger/heavier ships required stronger cores/upgrades. The core was strategically important because disabling it could cause the ship to fall. [WA11](#wa11)

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

Engines produced thrust, and historical documentation notes that asymmetrical engine placement could affect handling. Sails interacted with wind; a player review specifically praised visible wind feedback and the need to sail/tack rather than simply hold forward. [WA08](#wa08) [WA12](#wa12)

### Component vulnerability creates local damage stories

Instead of one “ship HP” bar being the only meaningful state, combat could destroy:
- propulsion;
- weapons;
- exposed structure;
- navigation tools;
- the Sky Core.

That turns damage into changing functionality. A crippled ship may still fly; a disarmed ship may flee; a coreless ship may fall.

**OpenLegend lesson:** componentized machines create richer consequences when local damage changes capabilities rather than only reducing a global number.

## 8. Items, inventory, weapons and armor

The personal inventory held resources, crafted items and tools. Historical guides distinguish a **belt** area whose contents could be protected from ordinary death drops, creating a small secure recovery layer. [WA10](#wa10)

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

On-foot combat was comparatively simple: aim, shoot, move, grapple, take damage. Critics generally did not identify the avatar shooting model as the game's strongest system. [WA02](#wa02) [WA03](#wa03)

But combat became more interesting because the **context was physical**:
- grapple around geometry while firing;
- board moving airships;
- destroy engines or lift components;
- cut mobility before boarding;
- salvage wreckage;
- collide/crash ships;
- use terrain and altitude;
- chase or escape through weather.

Massively OP's reviewer gave a good emergent example: destroying the device keeping an enemy ship aloft killed the target via the subsequent crash, while also killing the attacker in the wreckage. [WA03](#wa03)

### PvP and griefing

Open-world PvP was one of the most divisive parts of the game. Some players loved piracy, boarding and the fact that every encounter could become a story. Others found early zones hostile enough that onboarding and progression could be repeatedly erased. [WA03](#wa03) [WA13](#wa13)

SideQuesting described a feud escalating into ship destruction and spawn camping, while GameNChick described both hostile raiders and strangers who helped build communities. [WA05](#wa05) [WA14](#wa14)

**Design lesson:** meaningful loss can make encounters matter, but the cost of being someone else's interesting emergent story may be *your own inability to establish agency*. New-player protection, recovery cost and social density all shape whether danger feels thrilling or punitive.

## 10. Death, failure and recovery

Death could return a player through revival infrastructure, including a ship-linked respawn device where available. Ordinary carried resources could be lost, while belt-secured items reduced total reset severity. [WA01](#wa01) [WA10](#wa10)

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
- other region barriers used to distinguish progression tiers. [WA15](#wa15)

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

Resources could physically fall off an island when mined. Massively OP specifically highlighted harvesting on island undersides as a skill because careless extraction could lose the material to the abyss. [WA03](#wa03)

## 12. Island Creator and player-authored world content

Bossa released a separate **Island Creator** that allowed players to sculpt islands and submit them for possible inclusion in the main world. By late 2016, PC Gamer reported more than 2,000 community-created maps in the tool's ecosystem. [WA16](#wa16)

PCWorld's earlier hands-on described caves, mountains, ruins and other locations as hand-crafted rather than procedurally repeated. [WA06](#wa06)

This creates an interesting hybrid:
- world topology/content authored by community members;
- curated/integrated by the developer;
- persistent MMO simulation running across those locations.

**OpenLegend lesson:** player invention does not have to mean “each player runs a separate modded server.” Community artifacts can enter a shared canon through a review/publishing pipeline.

## 13. Story, lore and quests

Worlds Adrift had setting/lore around:
- a shattered world;
- Atlas technology/mineral;
- ruins of former civilizations;
- discoverable lore/codex material.

But it intentionally lacked a conventional authored quest spine during the studied period. Reviewers noted that the player was largely left to explore, engineer, travel and create social stories. [WA14](#wa14)

This was initially exciting because it removed chores and quest-marker routine. It also became one of the project's acknowledged product gaps: by closure, Bossa discussed missing creatures, objectives, richer lore access, territory control, puzzles and large PvE encounters that would have given the sandbox more durable goals. [WA17](#wa17)

The distinction is crucial:
- **emergent narrative** answered “what happened to us?”;
- the game was weaker at consistently answering “what should we care about doing next?”

OpenLegend wants both.

## 14. NPCs, creatures and AI

Worlds Adrift was player-centric rather than NPC-society-centric. It did not contain the kind of town simulation, schedule system or conversational agent ecology OpenLegend targets.

Creatures existed as part of the world; early demonstrations highlighted flying manta-like animals and ambitions for an ecosystem whose populations could be affected by player harvesting. [WA06](#wa06)

But Bossa's closure discussion makes clear that the envisioned PvE/ecology/content layer was not fully realized. Do not read prototype/press-demo ambitions as a complete shipped ecosystem simulation. [WA17](#wa17)

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
- form ad hoc alliances. [WA10](#wa10)

The Knowledge system could encourage specialization because fully researching every crafting family was expensive. A crew could therefore become socially differentiated by expertise rather than hard class. [WA03](#wa03)

This is a strong OpenLegend idea: **roles can emerge from learned capabilities and responsibility rather than class selection.**

There was no authored romance/friendship meter system comparable to a party RPG.

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

**Disliked / concern:** Brown was less convinced by the *MMO layer* than the “freewheeling aviation adventure”; the broader structure/objectives did not yet justify the scale of the persistent MMO. [WA18](#wa18)

This distinction became historically important because Bossa later described missing gameplay layers while the expensive infrastructure consumed development effort.

### 2. Massively Overpowered — Andrew Ross, May 21, 2018, first impressions

**Liked:** classless structure, active/player-skill gathering, grappling/climbing, material properties, physically meaningful ship construction and emergent ways to destroy another ship.

**Disliked / concern:** physics bugs could kill players; knowledge/schematic progression could be opaque; open PvP/new-player exposure felt likely to drive away parts of the MMO audience. [WA03](#wa03)

### 3. SideQuesting — Erron Kelly, May 2018, early impressions after ~50 hours

**Liked:** extreme skill ceiling of the grappling hook; absurd player encounters; ship construction and advancement through more dangerous regions; huge amount of explorable island space.

**Disliked / concern:** simple overall progression loop, crashes/bugs and the unmistakably unfinished nature of Early Access. The writer was enthusiastic despite explicitly describing those limits. [WA05](#wa05)

### 4. PCWorld — Hayden Dingman, August 2016, hands-on preview

**Liked:** physical comedy and emergent possibility from shared simulation; objects and ships behaving according to forces; community-authored islands; highly flexible ship designs; grappling/wingsuit exploration.

**Concern / limitation:** this was an invited pre-release demo, not a purchase recommendation or long-term population test. Its enthusiasm is useful evidence for *mechanical delight*, not proof that the MMO loop was sustainable. [WA06](#wa06)

### 5. GameNChick — June 1, 2018, multi-week impressions

**Liked:** exploration, the thrill of finding new handcrafted islands/players, community help, organic society/piracy and combining gunplay with grappling movement.

**Disliked / concern:** basic combat, lack of conventional story/quests, dependence on continued content/community growth and risk of griefing/ship loss. [WA14](#wa14)

## 18. Steam review evidence

Worlds Adrift's original store/review surface is partly archival after shutdown, so this pass does **not** claim a fresh exhaustive “top reviews” scrape. It records directly accessible historical review material and the surviving Steam ecosystem.

### Detailed surviving review — Bajeej {R}, posted 2017 / updated 2018

**Liked:** grappling/climbing, ship creation, component repair, material gathering, island aesthetics and wind-aware sailing.

**Disliked:** weak onboarding/tooltips; overlap between found schematics and knowledge-tree unlocks; progression frustration; travel bugs/slowdown in the reviewed state. [WA08](#wa08)

### Post-shutdown Steam community signal

The still-available **Worlds Adrift Island Creator** review page is dominated by highly helpful retrospective comments asking for the MMO to return. Longer examples specifically remember:
- shipbuilding;
- exploration with friends;
- the combination of peaceful vastness and lurking danger;
- desire for self-hosted/smaller multiplayer preservation. [WA19](#wa19)

Those reviews are about the surviving creator tool and memory of the MMO, not direct current reviews of a playable Worlds Adrift service.

### Shutdown-driven negatives

When Bossa announced the closure, PCGamesN reported a wave of new negative Steam reviews. At that point it described the overall store reception as about 67% positive. This is a historical storefront snapshot and is confounded by anger over product discontinuation, so it should not be treated as a clean gameplay-quality measurement. [WA20](#wa20)

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

## 20. Production and commercial history

Worlds Adrift was unusually ambitious for Bossa: a persistent, physics-heavy MMO using Improbable's SpatialOS. Development lasted several years through alpha/beta and paid pre-Early-Access phases; Steam Early Access proper began in May 2018. [WA16](#wa16) [WA21](#wa21)

### Why Bossa said it closed

In Bossa cofounder Henrique Olifiers' retrospective, reported by Forbes, the studio attributed the situation to a combination of:
- technically demanding persistent physics;
- maintenance/technical debt absorbing resources;
- early commercial/access decisions;
- progression wipes;
- insufficient player population relative to the operating model.

Olifiers said player numbers were roughly a third of what the team believed it needed for a healthy service. This is the founder's causal account, not an experimentally isolated explanation. [WA21](#wa21)

Bossa's own shutdown FAQ framed the decisive fact more simply: the game had not attracted enough players to remain commercially viable. [WA22](#wa22)

Developer Luke Williams separately described major gameplay ambitions that never fully arrived because technical work consumed effort—more creatures, lore access, objectives, giant PvE targets, territory control and richer island puzzles among them. [WA17](#wa17)

### Closure

Bossa announced shutdown in May 2019. Servers ultimately closed in **July 2019**, making the original MMO unplayable as a live service. [WA22](#wa22)

The important OpenLegend causal loop is plausible without overclaiming:

> expensive persistent simulation → more maintenance pressure → less capacity for goals/content/polish → weaker ability to grow/retain enough players → less economic room to pay for the expensive simulation.

The evidence supports Bossa describing all of those pressures. It does **not** identify one mechanic as “the reason” Worlds Adrift failed.

## 21. Persistence, wipes and the meaning of ownership

Worlds Adrift sold the fantasy of a persistent world where a player's ship and discoveries mattered. That magnifies the cost of:
- server wipes;
- lost ships;
- bugs;
- shutdown.

Bossa's retrospective specifically mentions wipes as harmful to momentum. [WA21](#wa21)

This should not be confused with OpenLegend's development-stage policy where incompatible saves may intentionally be discarded. The relevant lesson begins once players are invited to treat a world as durable:

**persistence is a product promise, not merely a database implementation detail.**

The stronger the emotional/creative investment, the more carefully migration, export and closure need to be designed.

## 22. Successor boundary: Lost Skies

Bossa later returned to the concept with **Lost Skies**. The developer explicitly says it is *not* a sequel, but a new game inspired by Worlds Adrift's skyships, grappling, gliders and exploration. The architecture/product model is materially different: solo and smaller-scale online co-op rather than one persistent PvP MMO. [WA23](#wa23)

Lost Skies entered Early Access April 18, 2025 and released 1.0 on **September 17, 2025**. Its Steam page in September 2026 describes single-player and online co-op and shows mixed English user reception. [WA24](#wa24)

Bossa's current FAQ retrospectively says that Worlds Adrift's technology stack, including SpatialOS, would have required extensive rebuilding and that a free-to-play conversion would have required fundamental redesign. Treat those as the developer's current explanation, not independent validation. [WA23](#wa23)

This dossier does not use Lost Skies reception to rewrite Worlds Adrift's historical mechanics.

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

## Sources

<a id="wa01"></a>**WA01 — [Getting Started — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Getting_Started).** Historical community-maintained official wiki. Used for controls, grapple, scanning, resources, early crafting and ship requirements. Page itself warns portions are outdated; exact tuning is not generalized beyond the live-era system.

<a id="wa02"></a>**WA02 — [Worlds Adrift overview](https://mmohuts.com/review/worlds-adrift).** MMOHuts archival overview. Used for concise released-system summary and broad pros/cons; current “playerbase” labels are irrelevant after shutdown.

<a id="wa03"></a>**WA03 — [First impressions of Worlds Adrift: Innovation, Zelda, open-world PvP, and that sinking feeling](https://massivelyop.com/2018/05/21/first-impressions-of-worlds-adrift-innovation-zelda-open-world-pvp-and-that-sinking-feeling/).** Andrew Ross, Massively Overpowered, 2018-05-21. Independent Early Access impressions; detailed material/knowledge/PvP/physics observations.

<a id="wa04"></a>**WA04 — [Getting started in Worlds Adrift](https://steamcommunity.com/sharedfiles/filedetails/?id=933004497).** Steam community guide, 2017. Historical player mechanics documentation for grapple, resources, knowledge, material properties and zones. Version-specific.

<a id="wa05"></a>**WA05 — [Early Impressions: Worlds Adrift](https://www.sidequesting.com/2018/05/early-impressions-worlds-adrift/).** Erron Kelly, SideQuesting, 2018-05. Fifty-hour Early Access impressions; grapple mastery, region progression, PvP anecdotes, crashes and sparse loop.

<a id="wa06"></a>**WA06 — [Worlds Adrift hands-on preview: Systems, sky pirates, and hilarious surprises](https://www.pcworld.com/article/416008/worlds-adrift-hands-on-preview-systems-sky-pirates-and-hilarious-surprises.html).** Hayden Dingman, PCWorld, 2016-08-11. Invited hands-on; strong direct examples of physical components, weather destruction, Island Creator and ship editor. Preview enthusiasm is not treated as launch review evidence.

<a id="wa07"></a>**WA07 — [Knowledge — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Knowledge).** Historical community mechanics reference for scanning, Knowledge Tree branches, schematic capacity and Sky Core upgrade thresholds. Exact costs are version-specific.

<a id="wa08"></a>**WA08 — [Bajeej {R} review for Worlds Adrift](https://steamcommunity.com/id/thinkpadius/recommended/322780/).** Steam user review, posted 2017 and updated 2018. Detailed praise of grapple/ships/sailing and criticism of onboarding, progression overlap and bugs. One self-selected player.

<a id="wa09"></a>**WA09 — [Resources — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Resources).** Historical community reference for wood, metal, fuel and Atlas shards.

<a id="wa10"></a>**WA10 — [Worlds Adrift — Comprehensive Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=932986882).** Steam community guide, updated through 2018. Controls, belt/death behavior, crafting stations, ship frames, crew/chat and equipment. Historical/version-specific.

<a id="wa11"></a>**WA11 — [Ships](https://worldsadrift.fandom.com/wiki/Ships) and [Atlas Sky Core](https://worldsadrift.fandom.com/wiki/Atlas_Sky_Core).** Historical community mechanics documentation for ship component graph, lift/weight and vulnerability.

<a id="wa12"></a>**WA12 — [Engines — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Engines).** Historical mechanics description of engine thrust, power/fuel and placement context.

<a id="wa13"></a>**WA13 — [Worlds Adrift PvP / PvE discussion](https://forums.mmorpg.com/discussion/475427/worlds-adrift-promises-future-pve-servers).** Player discussion preserving contemporary new-player/PvP concerns. Anecdotal and not treated as population research.

<a id="wa14"></a>**WA14 — [Worlds Adrift Impressions (PC)](https://www.gamenchickgaming.com/post/worlds-adrift-impressions-pc).** GameNChick, 2018-06-01. Multi-week written impressions; exploration, community, absent quest structure, PvP/griefing, island creation and basic combat.

<a id="wa15"></a>**WA15 — [Weather — Official Worlds Adrift Wiki](https://worldsadrift.fandom.com/wiki/Weather).** Historical documentation of wind/storm walls, wind forces, lightning and visibility.

<a id="wa16"></a>**WA16 — [Worlds Adrift announces 'biggest playtest' yet](https://www.pcgamer.com/worlds-adrift-announces-biggest-playtest-yet/) and [Early Access announcement](https://www.pcgamer.com/worlds-adrift-docks-on-early-access-next-month/).** PC Gamer, 2016/2018. Progression/Island Creator milestone and Early Access transition.

<a id="wa17"></a>**WA17 — [Worlds Adrift Review: Struggles of the Skyship MMO](https://cjleo.com/blog/worlds-adrift-ends-triumphs-and-challenges-of-the-skyship-mmo/).** C. J. Leo, 2019 retrospective citing Bossa's closure material. Used for preserved developer statement about missing gameplay layers; secondary analysis is not treated as independent causal proof.

<a id="wa18"></a>**WA18 — Rock Paper Shotgun, “Premature Evaluation: Worlds Adrift,” Fraser Brown, 2018-05-29.** The surviving indexed text is available through the [Steam/RPS news archive](https://store.steampowered.com/news/?appgroupname=Worlds+Adrift+-+Early+Access+MMO&appids=322780&feed=rps&headlines=1) and Metacritic's archived review entry. Used for the critic's explicit split between loving freewheeling aviation and being unconvinced by the MMO layer.

<a id="wa19"></a>**WA19 — [Worlds Adrift Island Creator — top-rated Steam reviews](https://steamcommunity.com/app/271920/reviews/?browsefilter=toprated).** Post-shutdown player testimony about remembered exploration, shipbuilding, friendship and desire for preservation/self-hosting. Reviews concern the surviving creator tool and memories of the MMO, not a playable current MMO.

<a id="wa20"></a>**WA20 — [Worlds Adrift is getting review-bombed because its servers are shutting down](https://www.pcgamesn.com/worlds-adrift/review-bombs).** PCGamesN, 2019-06-03. Historical store-sentiment snapshot and shutdown-driven negative-review context.

<a id="wa21"></a>**WA21 — [Bossa Studios' Cofounder Speaks Openly On Worlds Adrift's Closure](https://www.forbes.com/sites/mattpaprocki/2019/06/17/bossa-studios-founder-speaks-openly-on-worlds-adrifts-closure/).** Matt Paprocki, Forbes, 2019-06-17, reporting Henrique Olifiers' account. Used as attributed founder explanation for technical debt, persistence complexity, wipes, sales/population and service economics.

<a id="wa22"></a>**WA22 — [The End of Worlds Adrift FAQ](https://steamcommunity.com/app/322780/discussions/0/1644290458825484411/).** Bossa Studios pinned Steam FAQ, 2019-05-29. Primary shutdown/commercial-viability statement and July closure plan.

<a id="wa23"></a>**WA23 — [Lost Skies FAQs](https://lostskiesgame.com/announcement-faqs).** Bossa Studios current official FAQ, accessed 2026-09-26. Used only to distinguish Lost Skies from Worlds Adrift and report Bossa's retrospective technology/F2P explanation.

<a id="wa24"></a>**WA24 — [Lost Skies on Steam](https://store.steampowered.com/app/1931180).** Current product surface accessed 2026-09-26. Establishes April 18, 2025 Early Access, September 17, 2025 1.0, single-player/online co-op and current review snapshot; not used to score Worlds Adrift.
